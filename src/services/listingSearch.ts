import { searchZillowRentals } from "./zillow";
import { searchApartmentsRentals } from "./apartments";
import type { Listing } from "../lib/supabase";

// ---------------------------------------------------------------------------
// Unified search options & result types
// ---------------------------------------------------------------------------

export interface SearchOptions {
  city: string;
  state?: string;
  page?: number;
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
}

export interface SearchResult {
  listings: Listing[];
  totalResults: number;
  totalPages: number;
  currentPage: number;
}

// ---------------------------------------------------------------------------
// Paginated search with Zillow cache + Apartments.com backfill
// ---------------------------------------------------------------------------

const PER_PAGE = 21;
const MAX_PAGES = 5;
const MAX_ZILLOW_LISTINGS = PER_PAGE * 3; // 63 — Zillow covers pages 1-3, Apartments.com fills 4-5
const OVERALL_TIMEOUT_MS = 20_000;

interface ZillowCache {
  searchKey: string;
  listings: Listing[];
  lastScrapePage: number;
  exhausted: boolean;
  totalResults: number;
  totalPages: number;
}

let zCache: ZillowCache | null = null;

function buildSearchKey(opts: SearchOptions): string {
  return `${opts.city}|${opts.state ?? "ca"}|${opts.minPrice ?? ""}|${opts.maxPrice ?? ""}|${opts.beds ?? ""}`;
}

/**
 * Caches Zillow results across UI pages (up to MAX_ZILLOW_LISTINGS).
 * Once Zillow's cache is exhausted, Apartments.com backfills remaining slots.
 */
export async function searchAllRentals(
  opts: SearchOptions
): Promise<SearchResult> {
  const page = Math.min(opts.page ?? 1, MAX_PAGES);
  const key = buildSearchKey(opts);

  if (!zCache || zCache.searchKey !== key) {
    zCache = { searchKey: key, listings: [], lastScrapePage: 0, exhausted: false, totalResults: 0, totalPages: 1 };
    console.info(`[Search] New search — cache reset for "${opts.city}"`);
  }

  const needed = page * PER_PAGE;
  console.info(`[Search] Page ${page} requested — need ${needed} total, cache has ${zCache.listings.length}, exhausted=${zCache.exhausted}`);

  // Fetch more Zillow scrape pages until cache covers the requested UI page
  const fetchMore = async () => {
    while (
      zCache!.listings.length < needed &&
      !zCache!.exhausted &&
      zCache!.listings.length < MAX_ZILLOW_LISTINGS
    ) {
      const nextScrapePage = zCache!.lastScrapePage + 1;
      console.info(`[Search] Fetching Zillow scrape page ${nextScrapePage}...`);

      try {
        const result = await searchZillowRentals({ ...opts, page: nextScrapePage });
        zCache!.lastScrapePage = nextScrapePage;
        zCache!.totalResults = result.totalResults;
        zCache!.totalPages = result.totalPages;

        if (result.listings.length === 0) {
          console.info(`[Search] Zillow scrape page ${nextScrapePage} returned 0 — marking exhausted`);
          zCache!.exhausted = true;
        } else {
          const existingIds = new Set(zCache!.listings.map((l) => l.id));
          const fresh = result.listings.filter((l) => !existingIds.has(l.id));
          zCache!.listings.push(...fresh);

          // Hard-truncate to the cap so later pages use Apartments.com
          if (zCache!.listings.length > MAX_ZILLOW_LISTINGS) {
            zCache!.listings.length = MAX_ZILLOW_LISTINGS;
          }

          console.info(`[Search] Zillow scrape page ${nextScrapePage}: ${result.listings.length} raw, ${fresh.length} new → cache total: ${zCache!.listings.length}`);

          if (result.listings.length < 20) {
            console.info(`[Search] Zillow returned < 20 — marking exhausted`);
            zCache!.exhausted = true;
          }

          if (zCache!.listings.length >= MAX_ZILLOW_LISTINGS) {
            console.info(`[Search] Zillow cache hit cap (${MAX_ZILLOW_LISTINGS}) — will use Apartments.com for remaining pages`);
          }
        }
      } catch (err) {
        console.warn("[Search] Zillow scrape failed:", err);
        zCache!.exhausted = true;
      }
    }
  };

  await Promise.race([
    fetchMore(),
    new Promise<void>((resolve) => setTimeout(resolve, OVERALL_TIMEOUT_MS)),
  ]);

  // Slice the cached Zillow listings for this UI page
  const startIdx = (page - 1) * PER_PAGE;
  const zillowForPage = zCache.listings.slice(startIdx, startIdx + PER_PAGE);
  const remaining = PER_PAGE - zillowForPage.length;

  console.info(`[Search] Page ${page}: ${zillowForPage.length} from Zillow cache [${startIdx}..${startIdx + zillowForPage.length}], ${remaining} slots remaining`);

  let apartmentsListings: Listing[] = [];
  let aTotalResults = 0;
  let aTotalPages = 0;

  if (remaining > 0) {
    console.info(`[Search] Fetching Apartments.com to backfill ${remaining} slots...`);
    try {
      const aptResult = await searchApartmentsRentals(opts);
      apartmentsListings = aptResult.listings.slice(0, remaining);
      aTotalResults = aptResult.totalResults;
      aTotalPages = aptResult.totalPages;
      console.info(`[Search] Apartments.com returned ${aptResult.listings.length} total, using ${apartmentsListings.length} for backfill`);
    } catch (err) {
      console.warn("[Search] Apartments.com failed:", err);
    }
  }

  const merged = [...zillowForPage, ...apartmentsListings];
  const unique = Array.from(
    new Map(merged.map((l) => [l.id, l])).values()
  );

  console.info(`[Search] Page ${page} final: ${unique.length} listings (${zillowForPage.length} Zillow + ${apartmentsListings.length} Apartments.com)`);

  // If Zillow cache is at cap, there are more results available via Apartments.com
  const zillowAtCap = zCache.listings.length >= MAX_ZILLOW_LISTINGS;
  const totalZillowListings = Math.min(
    Math.max(zCache.totalResults, zCache.listings.length),
    MAX_ZILLOW_LISTINGS,
  );
  const zillowPages = Math.ceil(totalZillowListings / PER_PAGE);
  const rawTotalPages = zillowAtCap
    ? MAX_PAGES
    : Math.max(zillowPages, aTotalPages, 1);

  return {
    listings: unique,
    totalResults: Math.min(totalZillowListings + aTotalResults, PER_PAGE * MAX_PAGES),
    totalPages: Math.min(rawTotalPages, MAX_PAGES),
    currentPage: page,
  };
}
