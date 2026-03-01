import type { Listing } from "../lib/supabase";

const HASDATA_API_URL = "https://api.hasdata.com/scrape/web";
const HASDATA_API_KEY = import.meta.env.VITE_HASDATA_API_KEY ?? "";

// ---------------------------------------------------------------------------
// Zillow __NEXT_DATA__ types (subset we actually use)
// ---------------------------------------------------------------------------

interface ZillowUnit {
  price: string;
  beds: string;
  roomForRent: boolean;
}

interface ZillowPhotoData {
  photoKey: string;
}

interface ZillowHomeInfo {
  zpid: number;
  streetAddress: string;
  zipcode: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  price: number;
  bathrooms: number;
  bedrooms: number;
  livingArea: number;
  homeType: string;
  homeStatus: string;
  daysOnZillow: number;
  rentZestimate?: number;
  isShowcaseListing: boolean;
}

interface ZillowListResult {
  zpid: string;
  imgSrc?: string;
  detailUrl: string;
  statusText: string;
  address: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZipcode: string;
  units?: ZillowUnit[];
  price?: string;
  unformattedPrice?: number;
  beds?: number;
  baths?: number;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  latLong?: { latitude: number; longitude: number };
  buildingName?: string;
  isBuilding?: boolean;
  has3DModel?: boolean;
  availabilityCount?: number;
  availabilityDate?: string;
  carouselPhotosComposable?: {
    baseUrl: string;
    photoData: ZillowPhotoData[] | null;
  };
  hdpData?: { homeInfo: ZillowHomeInfo };
  listCardRecommendation?: {
    flexFieldRecommendations?: { displayString: string; contentType: string }[];
    zovInsight?: { amenityType: string; displayString: string };
  };
}

interface ZillowSearchResults {
  listResults: ZillowListResult[];
}

interface ZillowNextData {
  props: {
    pageProps: {
      searchPageState: {
        cat1: {
          searchResults: ZillowSearchResults;
        };
        searchList?: {
          totalResultCount: number;
          totalPages: number;
          pagination?: { nextUrl: string };
        };
      };
    };
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ZillowSearchOptions {
  city: string;
  state?: string;
  page?: number;
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
}

export interface ZillowSearchResult {
  listings: Listing[];
  totalResults: number;
  totalPages: number;
  currentPage: number;
}

/**
 * Build the Zillow rental search URL for a given city.
 */
function buildZillowUrl(opts: ZillowSearchOptions): string {
  const citySlug = opts.city.trim().toLowerCase().replace(/\s+/g, "-");
  const stateSlug = (opts.state ?? "ca").toLowerCase();
  let url = `https://www.zillow.com/${citySlug}-${stateSlug}/rentals/`;
  if (opts.page && opts.page > 1) {
    url += `${opts.page}_p/`;
  }
  return url;
}

/**
 * Call HasData Web Scraping API to scrape a Zillow rental search page,
 * then transform results into HomePilot Listing[].
 */
export async function searchZillowRentals(
  opts: ZillowSearchOptions
): Promise<ZillowSearchResult> {
  if (!HASDATA_API_KEY) {
    throw new Error(
      "VITE_HASDATA_API_KEY is not set. Add it to your .env file."
    );
  }

  const zillowUrl = buildZillowUrl(opts);
  const page = opts.page ?? 1;

  const response = await fetch(HASDATA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": HASDATA_API_KEY,
    },
    body: JSON.stringify({
      url: zillowUrl,
      proxyType: "residential",
      proxyCountry: "US",
      javascript: true,
      delay: 5000,
      blockAds: true,
      blockImages: true,
      screenshot: false,
      outputFormat: ["html"],
    }),
  });

  // Always read body as text first so we can inspect it on failure
  const rawBody = await response.text();

  if (!response.ok) {
    throw new Error(
      `HasData API error: ${response.status} ${response.statusText} — ${rawBody.slice(0, 300)}`
    );
  }

  // The HasData response should be JSON with a `content` field holding the HTML.
  // But some edge cases return raw HTML directly — handle both.
  let html: string;
  try {
    const json = JSON.parse(rawBody);
    html = json?.content ?? "";

    // If the API reported an error status inside the JSON envelope
    if (json?.requestMetadata?.status === "error") {
      throw new Error(`HasData scrape failed: ${json?.requestMetadata?.errorMessage ?? "unknown error"}`);
    }
  } catch (parseErr) {
    // If rawBody itself looks like HTML (starts with < or <!DOCTYPE), use it directly
    if (rawBody.trimStart().startsWith("<")) {
      html = rawBody;
    } else {
      throw parseErr;
    }
  }

  // Extract __NEXT_DATA__ JSON from the HTML
  const scriptMatch = html.match(
    /<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  );

  if (!scriptMatch?.[1]) {
    return { listings: [], totalResults: 0, totalPages: 0, currentPage: page };
  }

  let nextData: ZillowNextData;
  try {
    nextData = JSON.parse(scriptMatch[1]);
  } catch {
    throw new Error("Failed to parse Zillow __NEXT_DATA__ JSON");
  }

  const searchState = nextData.props?.pageProps?.searchPageState as Record<string, unknown> | undefined;
  const searchList = searchState?.searchList as { totalResultCount?: number; totalPages?: number } | undefined;
  // Try multiple possible paths for list results (Zillow structure varies)
  const listResults =
    (searchState?.cat1 as { searchResults?: { listResults?: unknown[] } })?.searchResults?.listResults ??
    (searchState?.cat2 as { searchResults?: { listResults?: unknown[] } })?.searchResults?.listResults ??
    (searchState?.rentals as { searchResults?: { listResults?: unknown[] } })?.searchResults?.listResults ??
    [];

  // Dev: log first result structure to diagnose beds/baths (open DevTools Console)
  if (listResults.length > 0 && typeof window !== "undefined") {
    try {
      const s = listResults[0] as unknown as Record<string, unknown>;
      const keys = Object.keys(s).filter((k) => /bed|bath|room|unit|reso|hdp/i.test(k));
      if (keys.length > 0) {
        console.log("[Zillow] Beds/baths keys:", keys.join(", "));
        keys.forEach((k) => console.log(`  ${k}:`, s[k]));
      }
    } catch (_) {}
  }

  const listings = listResults
    .map((r) => zillowResultToListing(r as ZillowListResult, opts))
    .filter((l): l is Listing => l !== null);

  // Apply client-side price/beds filters if specified
  let filtered = listings;
  if (opts.minPrice != null) {
    filtered = filtered.filter((l) => l.price >= opts.minPrice!);
  }
  if (opts.maxPrice != null) {
    filtered = filtered.filter((l) => l.price <= opts.maxPrice!);
  }
  if (opts.beds != null) {
    filtered = filtered.filter((l) => l.beds >= opts.beds!);
  }

  return {
    listings: filtered,
    totalResults: searchList?.totalResultCount ?? filtered.length,
    totalPages: searchList?.totalPages ?? 1,
    currentPage: page,
  };
}

// ---------------------------------------------------------------------------
// Transform a single Zillow list result into a HomePilot Listing
// ---------------------------------------------------------------------------

function zillowResultToListing(
  r: ZillowListResult,
  opts: ZillowSearchOptions
): Listing | null {
  const homeInfo = r.hdpData?.homeInfo;

  // Determine price: individual listing has unformattedPrice; buildings have units array
  let price = r.unformattedPrice ?? homeInfo?.price ?? 0;
  if (!price && r.units?.length) {
    const firstPrice = r.units[0]?.price;
    if (firstPrice) {
      const parsed = parseInt(firstPrice.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(parsed)) price = parsed;
    }
  }
  if (price === 0) return null;

  const raw = r as unknown as Record<string, unknown>;
  const reso = raw.resoFacts as Record<string, unknown> | undefined;

  const parseBeds = (v: unknown): number | null => {
    if (typeof v === "number" && !isNaN(v) && v >= 0) return Math.floor(v);
    if (typeof v === "string") {
      const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
      return !isNaN(n) && n >= 0 ? n : null;
    }
    return null;
  };
  const parseBaths = (v: unknown): number | null => {
    if (typeof v === "number" && !isNaN(v) && v > 0) return v;
    if (typeof v === "string") {
      const n = parseFloat(v.replace(/[^0-9.]/g, ""));
      return !isNaN(n) && n > 0 ? n : null;
    }
    return null;
  };

  // Beds: try r.beds, r.bedrooms, homeInfo.bedrooms, resoFacts, raw, units (max across all)
  const bedsFromUnits =
    r.units?.length
      ? Math.max(
          ...r.units.map((u) => parseInt(String(u.beds ?? 0), 10)).filter((n) => !isNaN(n) && n > 0),
          0
        ) || null
      : null;
  const bedsParsed =
    parseBeds(r.beds) ??
    parseBeds(r.bedrooms) ??
    parseBeds(homeInfo?.bedrooms) ??
    parseBeds(reso?.bedrooms) ??
    parseBeds(raw.bedrooms) ??
    (r.units?.[0]?.beds != null ? parseInt(String(r.units[0].beds), 10) : null) ??
    bedsFromUnits;
  let beds = bedsParsed != null && bedsParsed >= 0 ? bedsParsed : 0;

  // Baths: try r.baths, r.bathrooms, homeInfo.bathrooms, resoFacts, raw
  const bathsParsed =
    parseBaths(r.baths) ??
    parseBaths(r.bathrooms) ??
    parseBaths(homeInfo?.bathrooms) ??
    parseBaths(reso?.bathrooms) ??
    parseBaths(reso?.bathroomCount) ??
    parseBaths(raw.bathrooms);
  let baths = bathsParsed != null && bathsParsed > 0 ? bathsParsed : 1;

  // Last resort: parse from display text (e.g. "2 bd, 2 ba" or "3 bd · 2 ba")
  if (bedsParsed == null || bathsParsed == null) {
    const displayParts = [
      r.statusText,
      r.buildingName,
      ...(r.listCardRecommendation?.flexFieldRecommendations ?? []).map((x) => x.displayString),
    ].filter(Boolean) as string[];
    const combined = displayParts.join(" ");
    const bdMatch = combined.match(/(\d+)\s*bd/i) ?? combined.match(/(\d+)\s*bed/i);
    const baMatch = combined.match(/(\d+)\s*ba\b/i) ?? combined.match(/(\d+)\s*bath/i);
    if (bedsParsed == null && bdMatch) {
      const n = parseInt(bdMatch[1], 10);
      beds = !isNaN(n) && n >= 0 ? n : 0;
    }
    if (bathsParsed == null && baMatch) {
      const n = parseFloat(baMatch[1]);
      baths = !isNaN(n) && n > 0 ? n : 1;
    }
  }

  // Sqft: list result can have area, or hdpData.homeInfo.livingArea, or top-level livingArea / resoFacts
  const sqftCandidates = [
    r.area,
    homeInfo?.livingArea,
    typeof raw.livingArea === "number" ? raw.livingArea : null,
    raw.resoFacts && typeof (raw.resoFacts as Record<string, unknown>).livingArea === "number"
      ? (raw.resoFacts as Record<string, unknown>).livingArea as number
      : null,
  ];
  const sqft = (sqftCandidates.find((n) => typeof n === "number" && n > 0) as number | undefined) ?? 0;

  // Build image URL
  let image = r.imgSrc ?? "";
  if (!image && r.carouselPhotosComposable?.photoData?.length) {
    const baseUrl = r.carouselPhotosComposable.baseUrl;
    const firstKey = r.carouselPhotosComposable.photoData[0].photoKey;
    image = baseUrl.replace("{photoKey}", firstKey);
  }
  if (!image || image.includes("maps.googleapis.com")) {
    image = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800";
  }

  // Build all image URLs for potential detail view use
  const allImages: string[] = [];
  if (r.carouselPhotosComposable?.photoData?.length && r.carouselPhotosComposable.baseUrl) {
    const base = r.carouselPhotosComposable.baseUrl;
    for (const p of r.carouselPhotosComposable.photoData.slice(0, 10)) {
      allImages.push(base.replace("{photoKey}", p.photoKey));
    }
  }

  const title = r.buildingName || r.statusText || homeInfo?.streetAddress || r.addressStreet;
  const city = r.addressCity || homeInfo?.city || opts.city;
  const fullAddress = r.address || `${r.addressStreet}, ${r.addressCity}, ${r.addressState} ${r.addressZipcode}`;
  const listingUrl = r.detailUrl?.startsWith("http")
    ? r.detailUrl
    : `https://www.zillow.com${r.detailUrl}`;

  // Extract amenity features from recommendations
  const features: string[] = [];
  if (r.listCardRecommendation?.zovInsight?.displayString) {
    features.push(r.listCardRecommendation.zovInsight.displayString);
  }
  r.listCardRecommendation?.flexFieldRecommendations?.forEach((rec) => {
    if (rec.contentType === "homeInsight") {
      features.push(rec.displayString);
    }
  });

  // Competition/demand heuristics from days on zillow and availability
  const daysOnZillow = homeInfo?.daysOnZillow ?? 30;
  const competitionScore = daysOnZillow < 3 ? 80 : daysOnZillow < 14 ? 60 : daysOnZillow < 30 ? 45 : 30;
  const demand =
    competitionScore >= 70 ? "High" : competitionScore >= 45 ? "Medium" : "Low";

  const rentZestimate = homeInfo?.rentZestimate;
  const rentDiff = rentZestimate && price ? price - rentZestimate : 0;
  const rentTrend = rentDiff > 0 ? `+${Math.round((rentDiff / price) * 100)}% above estimate` : rentDiff < 0 ? `${Math.round((rentDiff / price) * 100)}% below estimate` : "";

  const now = new Date().toISOString();

  return {
    id: String(r.zpid),
    title,
    address: fullAddress,
    city,
    price,
    beds,
    baths,
    sqft,
    image,
    crime_index: 25,
    rent_trend: rentTrend || null,
    neighborhood_risk: "Low",
    scam_score: 5,
    demand,
    competition_score: competitionScore,
    competition_level: competitionScore,
    features,
    ai_suggestion: rentZestimate
      ? `Zillow Rent Zestimate: $${rentZestimate.toLocaleString()}/mo`
      : "Complete your profile for better matching",
    ai_reasons: rentZestimate
      ? [`Zillow estimates rent at $${rentZestimate.toLocaleString()}/mo`]
      : null,
    time_left: homeInfo?.daysOnZillow != null
      ? `Listed ${homeInfo.daysOnZillow}d ago`
      : "Recently listed",
    created_at: now,
    updated_at: now,
    listing_url: listingUrl,
    source: "zillow",
  };
}
