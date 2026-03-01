import { useState, useEffect, useCallback, useRef } from "react";
import {
  searchAllRentals,
  type SearchOptions,
  type SearchResult,
} from "../services/listingSearch";
import type { Listing } from "../lib/supabase";

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  result: SearchResult;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(opts: SearchOptions): string {
  return `${opts.city}|${opts.state ?? "ca"}|${opts.page ?? 1}|${opts.minPrice ?? ""}|${opts.maxPrice ?? ""}|${opts.beds ?? ""}`;
}

function getCached(key: string): SearchResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.result;
}

/**
 * Primary listing search hook — searches Zillow + Apartments.com with a staggered
 * parallel strategy. Waits for both providers before showing results.
 * Pass `null` for opts to skip the search.
 */
export function useZillowListings(opts: SearchOptions | null) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (searchOpts: SearchOptions) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const key = cacheKey(searchOpts);
    const cached = getCached(key);
    if (cached) {
      setListings(cached.listings);
      setTotalResults(cached.totalResults);
      setTotalPages(cached.totalPages);
      setCurrentPage(cached.currentPage);
      setLoading(false);
      return;
    }

    try {
      const result = await searchAllRentals(searchOpts);
      if (controller.signal.aborted) return;

      cache.set(key, { result, timestamp: Date.now() });
      setListings(result.listings);
      setTotalResults(result.totalResults);
      setTotalPages(result.totalPages);
      setCurrentPage(result.currentPage);
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error("Listing search failed:", err);
      setError(err as Error);
      setListings([]);
      setTotalResults(0);
      setTotalPages(0);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (opts) {
      search(opts);
    } else {
      setListings([]);
      setTotalResults(0);
      setTotalPages(0);
      setCurrentPage(1);
      setLoading(false);
    }
    return () => {
      abortRef.current?.abort();
    };
  }, [
    opts?.city,
    opts?.state,
    opts?.page,
    opts?.minPrice,
    opts?.maxPrice,
    opts?.beds,
    search,
  ]);

  return {
    listings,
    totalResults,
    totalPages,
    currentPage,
    loading,
    error,
    search,
  };
}
