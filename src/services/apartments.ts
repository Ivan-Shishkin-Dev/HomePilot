import type { Listing } from "../lib/supabase";

const HASDATA_API_URL = "https://api.hasdata.com/scrape/web";
const HASDATA_API_KEY = import.meta.env.VITE_HASDATA_API_KEY ?? "";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ApartmentsSearchOptions {
  city: string;
  state?: string;
  page?: number;
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
}

export interface ApartmentsSearchResult {
  listings: Listing[];
  totalResults: number;
  totalPages: number;
  currentPage: number;
}

function buildApartmentsUrl(opts: ApartmentsSearchOptions): string {
  const citySlug = opts.city.trim().toLowerCase().replace(/\s+/g, "-");
  const stateSlug = (opts.state ?? "ca").toLowerCase();
  let url = `https://www.apartments.com/${citySlug}-${stateSlug}/`;
  if (opts.page && opts.page > 1) {
    url += `${opts.page}/`;
  }
  return url;
}

// Threshold below which the response is likely an anti-bot challenge page
const MIN_REAL_HTML_LENGTH = 50_000;
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 2000;

async function fetchApartmentsHtml(targetUrl: string): Promise<string> {
  const response = await fetch(HASDATA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": HASDATA_API_KEY,
    },
    body: JSON.stringify({
      url: targetUrl,
      proxyType: "residential",
      proxyCountry: "US",
      javascript: true,
      delay: 5000,
      blockAds: true,
      blockImages: false,
      screenshot: false,
      outputFormat: ["html"],
    }),
  });

  const rawBody = await response.text();

  if (!response.ok) {
    throw new Error(
      `HasData API error: ${response.status} ${response.statusText} — ${rawBody.slice(0, 300)}`
    );
  }

  try {
    const json = JSON.parse(rawBody);
    if (json?.requestMetadata?.status === "error") {
      throw new Error(
        `HasData scrape failed: ${json?.requestMetadata?.errorMessage ?? "unknown error"}`
      );
    }
    return json?.content ?? "";
  } catch (parseErr) {
    if (rawBody.trimStart().startsWith("<")) return rawBody;
    throw parseErr;
  }
}

/**
 * Call HasData Web Scraping API to scrape an Apartments.com search page,
 * then transform results into HomePilot Listing[].
 * Retries once if the response looks like an anti-bot challenge page.
 */
export async function searchApartmentsRentals(
  opts: ApartmentsSearchOptions
): Promise<ApartmentsSearchResult> {
  if (!HASDATA_API_KEY) {
    throw new Error("VITE_HASDATA_API_KEY is not set. Add it to your .env file.");
  }

  const targetUrl = buildApartmentsUrl(opts);
  const page = opts.page ?? 1;

  let html = "";
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      console.info(`[Apartments] Retrying (attempt ${attempt + 1})...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }

    console.info(`[Apartments] Scraping: ${targetUrl}`);
    html = await fetchApartmentsHtml(targetUrl);
    console.info(`[Apartments] HTML received: ${html.length} chars`);

    if (html.length >= MIN_REAL_HTML_LENGTH) break;
    console.warn(`[Apartments] Response too small (${html.length} chars) — likely a challenge page`);
  }

  const extracted =
    extractFromWindowData(html) ??
    extractFromPlacards(html) ??
    extractFromJsonLd(html);

  if (!extracted || extracted.listings.length === 0) {
    console.info("[Apartments] No listings extracted from any strategy");
    return { listings: [], totalResults: 0, totalPages: 0, currentPage: page };
  }

  let filtered = extracted.listings;
  if (opts.minPrice != null) {
    filtered = filtered.filter((l) => l.price >= opts.minPrice!);
  }
  if (opts.maxPrice != null) {
    filtered = filtered.filter((l) => l.price <= opts.maxPrice!);
  }
  if (opts.beds != null) {
    filtered = filtered.filter((l) => l.beds >= opts.beds!);
  }

  console.info(`[Apartments] Returning ${filtered.length} listings`);

  return {
    listings: filtered,
    totalResults: extracted.totalResults || filtered.length,
    totalPages: extracted.totalPages || 1,
    currentPage: page,
  };
}

// ---------------------------------------------------------------------------
// Strategy 1: Embedded JSON in window/script variables
// Apartments.com sometimes embeds listing data as JS objects
// ---------------------------------------------------------------------------

function extractFromWindowData(
  html: string
): { listings: Listing[]; totalResults: number; totalPages: number } | null {
  // Look for common patterns: window.__INITIAL_STATE__, window.__data, etc.
  const patterns = [
    /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/,
    /window\.defined\s*=\s*(\{[\s\S]*?\});\s*<\/script>/,
    /window\.__DATA__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/,
    /"listingData"\s*:\s*(\[[\s\S]*?\])\s*[,}]/,
    /"placards"\s*:\s*(\[[\s\S]*?\])\s*[,}]/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      try {
        const data = JSON.parse(match[1]);
        const items = Array.isArray(data) ? data : findListingArray(data);
        if (items.length > 0) {
          console.info(`[Apartments] Window data strategy: ${items.length} items`);
          const listings = items
            .map((item: any) => genericObjectToListing(item))
            .filter((l: Listing | null): l is Listing => l !== null);
          return { listings, totalResults: listings.length, totalPages: 1 };
        }
      } catch { /* invalid JSON, try next */ }
    }
  }

  console.info("[Apartments] No embedded window data found");
  return null;
}

// ---------------------------------------------------------------------------
// Strategy 2: Parse HTML using data-listingid anchors
// Apartments.com puts data-listingid on listing card elements — we find each
// one and parse a window of surrounding HTML for the listing fields.
// ---------------------------------------------------------------------------

function extractFromPlacards(
  html: string
): { listings: Listing[]; totalResults: number; totalPages: number } | null {
  const listings: Listing[] = [];
  const seen = new Set<string>();

  // Find every data-listingid occurrence
  const idPattern = /data-listingid="([^"]+)"/gi;
  let idMatch: RegExpExecArray | null;

  while ((idMatch = idPattern.exec(html)) !== null) {
    const listingId = idMatch[1];
    if (seen.has(listingId)) continue;
    seen.add(listingId);

    // Grab a chunk of HTML after this anchor (listing cards are typically 2-4K)
    const start = Math.max(0, idMatch.index - 500);
    const end = Math.min(html.length, idMatch.index + 4000);
    const chunk = html.slice(start, end);

    const listing = parseListingChunk(listingId, chunk);
    if (listing) listings.push(listing);
  }

  if (listings.length > 0) {
    console.info(`[Apartments] data-listingid strategy: ${listings.length} listings`);

    const totalMatch = html.match(/(\d[\d,]*)\s+(?:Apartments?|Rentals?|Results?)\s/i);
    const totalResults = totalMatch
      ? parseInt(totalMatch[1].replace(/,/g, ""), 10)
      : listings.length;
    const totalPages = Math.max(
      Math.ceil(totalResults / Math.max(listings.length, 1)),
      1
    );
    return { listings, totalResults, totalPages };
  }

  console.info("[Apartments] No data-listingid elements found in HTML");
  return null;
}

function parseListingChunk(listingId: string, chunk: string): Listing | null {
  // --- Price ---
  const priceMatch = chunk.match(/\$([\d,]{3,})/);
  const price = priceMatch
    ? parseInt(priceMatch[1].replace(/,/g, ""), 10)
    : 0;
  if (price === 0 || price > 50000) return null; // skip non-rent prices

  // --- URL ---
  const urlMatch =
    chunk.match(/data-url="([^"]+)"/) ??
    chunk.match(/href="(https?:\/\/www\.apartments\.com\/[^"]+)"/);
  const listingUrl = urlMatch?.[1]
    ? urlMatch[1].startsWith("http")
      ? urlMatch[1]
      : `https://www.apartments.com${urlMatch[1]}`
    : "";

  // --- Title / Property name ---
  const titlePatterns = [
    /class="[^"]*(?:property-title|propertyName|js-placardTitle|title)[^"]*"[^>]*>\s*([^<]{2,})/i,
    /aria-label="([^"]{3,})"/i,
    /title="([^"]{3,})"/i,
  ];
  let title = "Rental Listing";
  for (const pat of titlePatterns) {
    const m = chunk.match(pat);
    if (m?.[1]?.trim()) {
      title = m[1].trim();
      break;
    }
  }

  // --- Address ---
  const addrPatterns = [
    /class="[^"]*(?:property-address|propertyAddress)[^"]*"[^>]*>\s*([^<]{3,})/i,
    /class="[^"]*(?:address)[^"]*"[^>]*>\s*([^<]{3,})/i,
  ];
  let address = "";
  for (const pat of addrPatterns) {
    const m = chunk.match(pat);
    if (m?.[1]?.trim()) {
      address = m[1].trim();
      break;
    }
  }

  // --- Beds ---
  const bedsMatch =
    chunk.match(/(\d+)\s*[-–]\s*\d+\s*(?:Bed|BD|BR)/i) ??
    chunk.match(/(\d+)\s*(?:Bed|BD|BR)/i) ??
    chunk.match(/Studio/i);
  const beds = bedsMatch
    ? bedsMatch[0].toLowerCase().includes("studio")
      ? 0
      : parseInt(bedsMatch[1], 10)
    : 0;

  // --- Baths ---
  const bathsMatch = chunk.match(/(\d+)\s*(?:Bath|BA)/i);
  const baths = bathsMatch ? parseInt(bathsMatch[1], 10) : 1;

  // --- Sqft ---
  const sqftMatch = chunk.match(/([\d,]+)\s*(?:sq\s*\.?\s*ft|sqft|SF)/i);
  const sqft = sqftMatch
    ? parseInt(sqftMatch[1].replace(/,/g, ""), 10)
    : 0;

  // --- Image ---
  const imgPatterns = [
    /(?:data-image-url|data-src|data-lazy-src)="(https?:\/\/[^"]+)"/i,
    /src="(https?:\/\/images[^"]+)"/i,
    /src="(https?:\/\/[^"]*(?:\.jpg|\.jpeg|\.png|\.webp)[^"]*)"/i,
    /background-image:\s*url\(["']?(https?:\/\/[^"')]+)/i,
  ];
  let image =
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800";
  for (const pat of imgPatterns) {
    const m = chunk.match(pat);
    if (m?.[1]) {
      image = m[1];
      break;
    }
  }

  const now = new Date().toISOString();
  const city = extractCityFromAddress(address);

  return {
    id: `apt-${listingId}`,
    title,
    address,
    city,
    price,
    beds,
    baths,
    sqft,
    image,
    crime_index: 25,
    rent_trend: null,
    neighborhood_risk: "Low",
    scam_score: 5,
    demand: "Medium",
    competition_score: 50,
    competition_level: 50,
    features: [],
    ai_suggestion: "Complete your profile for better matching",
    ai_reasons: null,
    time_left: "Recently listed",
    created_at: now,
    updated_at: now,
    listing_url: listingUrl,
    source: "apartments",
  };
}

// ---------------------------------------------------------------------------
// Strategy 3: JSON-LD structured data
// ---------------------------------------------------------------------------

function extractFromJsonLd(
  html: string
): { listings: Listing[]; totalResults: number; totalPages: number } | null {
  const ldPattern =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const listings: Listing[] = [];
  let match: RegExpExecArray | null;

  while ((match = ldPattern.exec(html)) !== null) {
    try {
      const ld = JSON.parse(match[1]);
      const items = Array.isArray(ld) ? ld : [ld];
      for (const item of items) {
        if (item["@type"] === "ApartmentComplex" || item["@type"] === "Apartment" || item["@type"] === "Residence") {
          const listing = jsonLdToListing(item);
          if (listing) listings.push(listing);
        }
        if (item.mainEntity?.itemListElement) {
          for (const el of item.mainEntity.itemListElement) {
            const listing = jsonLdToListing(el.item ?? el);
            if (listing) listings.push(listing);
          }
        }
      }
    } catch { /* skip invalid JSON-LD */ }
  }

  if (listings.length > 0) {
    console.info(`[Apartments] JSON-LD strategy: ${listings.length} listings`);
    return { listings, totalResults: listings.length, totalPages: 1 };
  }

  console.info("[Apartments] No usable JSON-LD data found");
  return null;
}

function jsonLdToListing(item: any): Listing | null {
  if (!item || typeof item !== "object") return null;

  const rawPrice = item.offers?.price ?? item.price ?? 0;
  const price =
    typeof rawPrice === "number"
      ? rawPrice
      : parseInt(String(rawPrice).replace(/[^0-9]/g, ""), 10) || 0;
  if (price === 0) return null;

  const addr = item.address;
  const title = item.name ?? addr?.streetAddress ?? "Rental Listing";
  const fullAddress = addr
    ? `${addr.streetAddress ?? ""}, ${addr.addressLocality ?? ""}, ${addr.addressRegion ?? ""} ${addr.postalCode ?? ""}`.trim()
    : "";

  const image =
    typeof item.image === "string"
      ? item.image
      : item.image?.url ??
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800";

  const now = new Date().toISOString();

  return {
    id: `apt-${item.identifier ?? item.url ?? String(Math.random()).slice(2, 10)}`,
    title,
    address: fullAddress,
    city: addr?.addressLocality ?? "",
    price,
    beds: item.numberOfBedrooms ?? 0,
    baths: item.numberOfBathroomsTotal ?? 1,
    sqft: item.floorSize?.value ?? 0,
    image,
    crime_index: 25,
    rent_trend: null,
    neighborhood_risk: "Low",
    scam_score: 5,
    demand: "Medium",
    competition_score: 50,
    competition_level: 50,
    features: [],
    ai_suggestion: "Complete your profile for better matching",
    ai_reasons: null,
    time_left: "Recently listed",
    created_at: now,
    updated_at: now,
    listing_url: item.url ?? "",
    source: "apartments",
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findListingArray(obj: any, depth = 0): any[] {
  if (depth > 10 || !obj || typeof obj !== "object") return [];
  if (Array.isArray(obj)) {
    if (obj.length > 0 && typeof obj[0] === "object" && obj[0] !== null) {
      const first = obj[0];
      if (first.listingId || first.propertyId || first.property_id || first.price || first.rentRange) {
        return obj;
      }
    }
    for (const item of obj) {
      const found = findListingArray(item, depth + 1);
      if (found.length > 0) return found;
    }
    return [];
  }
  for (const val of Object.values(obj)) {
    const found = findListingArray(val, depth + 1);
    if (found.length > 0) return found;
  }
  return [];
}

function genericObjectToListing(item: any): Listing | null {
  const price =
    item.price ?? item.rentRange?.min ?? item.list_price ?? item.rent ?? 0;
  if (!price || price === 0) return null;

  const id = item.listingId ?? item.propertyId ?? item.property_id ?? item.id ?? String(Math.random()).slice(2, 10);
  const title = item.propertyName ?? item.name ?? item.title ?? "Rental Listing";
  const address =
    item.address ?? item.formattedAddress ?? item.streetAddress ?? "";
  const city = item.city ?? item.addressCity ?? "";

  const now = new Date().toISOString();

  return {
    id: `apt-${id}`,
    title,
    address: typeof address === "string" ? address : JSON.stringify(address),
    city,
    price: typeof price === "number" ? price : parseInt(String(price).replace(/[^0-9]/g, ""), 10),
    beds: item.beds ?? item.bedrooms ?? item.numberOfBedrooms ?? 0,
    baths: item.baths ?? item.bathrooms ?? 1,
    sqft: item.sqft ?? item.squareFeet ?? item.area ?? 0,
    image:
      item.image ?? item.imageUrl ?? item.photo ??
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
    crime_index: 25,
    rent_trend: null,
    neighborhood_risk: "Low",
    scam_score: 5,
    demand: "Medium",
    competition_score: 50,
    competition_level: 50,
    features: item.amenities ?? item.features ?? [],
    ai_suggestion: "Complete your profile for better matching",
    ai_reasons: null,
    time_left: "Recently listed",
    created_at: now,
    updated_at: now,
    listing_url: item.url ?? item.detailUrl ?? item.propertyUrl ?? "",
    source: "apartments",
  };
}

function buildMinimalListing(
  id: string,
  title: string,
  price: number,
  url: string
): Listing {
  const now = new Date().toISOString();
  return {
    id: `apt-${id}`,
    title,
    address: "",
    city: "",
    price,
    beds: 0,
    baths: 1,
    sqft: 0,
    image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
    crime_index: 25,
    rent_trend: null,
    neighborhood_risk: "Low",
    scam_score: 5,
    demand: "Medium",
    competition_score: 50,
    competition_level: 50,
    features: [],
    ai_suggestion: "Complete your profile for better matching",
    ai_reasons: null,
    time_left: "Recently listed",
    created_at: now,
    updated_at: now,
    listing_url: url,
    source: "apartments",
  };
}

function extractCityFromAddress(address: string): string {
  const parts = address.split(",").map((s) => s.trim());
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0] ?? "";
}

