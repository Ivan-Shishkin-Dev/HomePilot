import { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { Search, SlidersHorizontal, MapPin, Grid2x2, LayoutList, Loader2, ChevronDown, Globe, Home, SlidersHorizontal as Sliders, RefreshCw, AlertTriangle } from "lucide-react";
import { ListingCard } from "./ListingCard";
import { useSavedListings, useAppliedListings } from "../../hooks/useSupabaseData";
import { useZillowListings } from "../../hooks/useZillowListings";
import type { Listing } from "../../lib/supabase";
import {
  defaultSearchFilters,
  buildSearchParams,
  type SearchFilters,
  MAX_PRICE_SLIDER,
} from "./ListingsScreen";
import { motion, AnimatePresence } from "motion/react";

type ViewMode = "grid" | "list";

function parseSearchParams(sp: URLSearchParams): SearchFilters {
  return {
    location: sp.get("location") ?? defaultSearchFilters.location,
    beds: sp.get("beds") != null ? +sp.get("beds")! : null,
    baths: sp.get("baths") != null ? +sp.get("baths")! : null,
    minSqft: sp.get("minSqft") != null ? +sp.get("minSqft")! : null,
    maxPrice: sp.get("maxPrice") != null ? +sp.get("maxPrice")! : null,
    petFriendly: sp.get("petFriendly") === "1",
    studentFriendly: sp.get("studentFriendly") === "1",
    saved: sp.get("saved") === "1",
    applied: sp.get("applied") === "1",
  };
}

function parseStateFromLocation(location: string): { city: string; state: string } {
  const parts = location.split(",").map((s) => s.trim());
  if (parts.length >= 2) {
    const stateRaw = parts[parts.length - 1].replace(/\d+/g, "").trim();
    const city = parts.slice(0, -1).join(", ");
    return { city, state: stateRaw.length === 2 ? stateRaw : "ca" };
  }
  return { city: location.trim(), state: "ca" };
}

export function ListingsResultsScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const filters = useMemo(() => parseSearchParams(searchParams), [searchParams]);

  const [searchInput, setSearchInput] = useState(filters.location);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [typeaheadOpen, setTypeaheadOpen] = useState(false);
  const typeaheadRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [zillowPage, setZillowPage] = useState(1);

  const { savedIds, toggleSave } = useSavedListings();
  const { appliedIds } = useAppliedListings();

  // Zillow search — fires when location is set
  const zillowOpts = useMemo(() => {
    if (!filters.location.trim()) return null;
    const { city, state } = parseStateFromLocation(filters.location);
    return {
      city,
      state,
      page: zillowPage,
      maxPrice: filters.maxPrice ?? undefined,
      beds: filters.beds ?? undefined,
    };
  }, [filters.location, filters.maxPrice, filters.beds, zillowPage]);

  const {
    listings: zillowListings,
    totalResults: zillowTotal,
    totalPages: zillowTotalPages,
    loading: zillowLoading,
    error,
  } = useZillowListings(zillowOpts);

  // Persist fetched listings to sessionStorage so useListing (detail page) can find them
  useEffect(() => {
    if (zillowListings.length > 0) {
      try {
        const existing = sessionStorage.getItem("zillow_listings");
        const prev: unknown[] = existing ? JSON.parse(existing) : [];
        const merged = [...prev, ...zillowListings];
        const unique = Array.from(new Map(merged.map((l: any) => [l.id, l])).values());
        sessionStorage.setItem("zillow_listings", JSON.stringify(unique.slice(-200)));
      } catch { /* quota exceeded — harmless */ }
    }
  }, [zillowListings]);

  // When viewing saved/applied without a city search, pull from sessionStorage cache
  const isFilterOnlyMode = !filters.location.trim() && (filters.saved || filters.applied);

  const cachedListings = useMemo(() => {
    if (!isFilterOnlyMode) return [];
    try {
      const raw = sessionStorage.getItem("zillow_listings");
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Listing[];
      return parsed.filter((l) => {
        const matchesSaved = !filters.saved || savedIds.has(l.id);
        const matchesApplied = !filters.applied || appliedIds.has(l.id);
        return matchesSaved && matchesApplied;
      });
    } catch {
      return [];
    }
  }, [isFilterOnlyMode, filters.saved, filters.applied, savedIds, appliedIds]);

  // Choose the right source of listings and loading state
  const baseListings = isFilterOnlyMode ? cachedListings : zillowListings;
  const loading = isFilterOnlyMode ? false : zillowLoading;

  // Client-side filters that the API doesn't handle (baths, sqft, saved/applied)
  const filteredListings = useMemo(() => {
    let list = [...baseListings];
    if (filters.baths != null) list = list.filter((l) => l.baths >= filters.baths!);
    if (filters.minSqft != null) list = list.filter((l) => l.sqft >= filters.minSqft!);
    if (!isFilterOnlyMode && filters.saved) list = list.filter((l) => savedIds.has(l.id));
    if (!isFilterOnlyMode && filters.applied) list = list.filter((l) => appliedIds.has(l.id));
    return list;
  }, [baseListings, filters, savedIds, appliedIds, isFilterOnlyMode]);

  // Typeahead: suggest popular California cities
  const popularCities = [
    "Irvine", "Los Angeles", "San Diego", "San Francisco", "Newport Beach",
    "Anaheim", "Santa Ana", "Long Beach", "Pasadena", "Burbank",
    "Sacramento", "San Jose", "Oakland", "Santa Monica", "Glendale",
  ];

  const suggestions = useMemo(() => {
    if (!searchInput.trim()) return [];
    const q = searchInput.trim().toLowerCase();
    return popularCities.filter((city) => city.toLowerCase().includes(q));
  }, [searchInput]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (typeaheadRef.current && !typeaheadRef.current.contains(e.target as Node)) {
        setTypeaheadOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    setSearchInput(filters.location);
  }, [filters.location]);

  const formatListing = (listing: (typeof zillowListings)[0]) => ({
    id: listing.id,
    title: listing.title,
    address: listing.address,
    city: listing.city || "",
    price: listing.price,
    beds: listing.beds,
    baths: listing.baths,
    sqft: listing.sqft,
    matchPercent: 85,
    demand:
      listing.demand ||
      (listing.competition_score > 70 ? "High" : listing.competition_score > 40 ? "Medium" : "Low"),
    image: listing.image,
    crimeIndex: listing.crime_index,
    rentTrend: listing.rent_trend || "",
    neighborhoodRisk: listing.neighborhood_risk || "Low",
    scamScore: listing.scam_score,
    timeLeft: listing.time_left || "",
    aiSuggestion: listing.ai_suggestion || "",
    competitionScore: listing.competition_score,
    features: listing.features || [],
    listingUrl: listing.listing_url,
    source: listing.source,
  });

  const updateFilters = (next: SearchFilters) => {
    setSearchInput(next.location);
    setSearchParams(buildSearchParams(next));
  };

  const handleSearch = () => {
    setTypeaheadOpen(false);
    setZillowPage(1);
    updateFilters({ ...filters, location: searchInput.trim() });
  };

  const handleSelectSuggestion = (city: string) => {
    setSearchInput(city);
    setTypeaheadOpen(false);
    setZillowPage(1);
    updateFilters({ ...filters, location: city });
  };

  const displayLocation = filters.location || "all areas";
  const hasSearched = filters.location.trim().length > 0 || isFilterOnlyMode;

  return (
    <div className="min-h-screen bg-background">
      {/* Search + filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-6 pb-2 sm:pt-8 sm:pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex gap-2 min-w-0" ref={typeaheadRef}>
              <div className="flex-1 relative max-w-md">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10"
                />
                <input
                  type="text"
                  placeholder="Search any city, e.g. Irvine, CA"
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setTypeaheadOpen(true);
                  }}
                  onFocus={() => suggestions.length > 0 && setTypeaheadOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2.5 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-[#10B981]/40"
                />
                <AnimatePresence>
                  {typeaheadOpen && suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-xl overflow-hidden z-50"
                    >
                      <div className="py-1 max-h-64 overflow-auto">
                        {suggestions.map((city) => (
                          <button
                            key={city}
                            type="button"
                            onClick={() => handleSelectSuggestion(city)}
                            className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-accent text-foreground"
                          >
                            <MapPin size={14} className="text-[#10B981] shrink-0" />
                            <span className="text-sm">{city}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button
                type="button"
                onClick={handleSearch}
                className="shrink-0 px-4 py-2.5 rounded-xl bg-[#10B981] text-white text-sm font-medium hover:bg-[#0d9668] transition-colors flex items-center gap-2"
              >
                <Search size={16} />
                Search
              </button>
            </div>
            <button
              type="button"
              onClick={() => updateFilters({ ...filters, saved: !filters.saved })}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                filters.saved
                  ? "bg-[#10B981] text-white border-[#10B981]"
                  : "border-border bg-background text-foreground hover:bg-accent"
              }`}
            >
              Saved {savedIds.size > 0 && `(${savedIds.size})`}
            </button>
            <button
              type="button"
              onClick={() => updateFilters({ ...filters, applied: !filters.applied })}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                filters.applied
                  ? "bg-[#10B981] text-white border-[#10B981]"
                  : "border-border bg-background text-foreground hover:bg-accent"
              }`}
            >
              Applied {appliedIds.size > 0 && `(${appliedIds.size})`}
            </button>
            <button
              type="button"
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm hover:bg-accent transition-colors"
            >
              <SlidersHorizontal size={16} />
              Filters
              <ChevronDown
                size={14}
                className={`transition-transform ${showFiltersPanel ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {showFiltersPanel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 pt-4 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-3"
            >
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Beds (min)</span>
                <select
                  value={filters.beds ?? ""}
                  onChange={(e) =>
                    updateFilters({
                      ...filters,
                      beds: e.target.value === "" ? null : +e.target.value,
                    })
                  }
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Any</option>
                  {[0, 1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>{n === 0 ? "Studio" : n === 4 ? "4+" : String(n)}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Baths (min)</span>
                <select
                  value={filters.baths ?? ""}
                  onChange={(e) =>
                    updateFilters({
                      ...filters,
                      baths: e.target.value === "" ? null : +e.target.value,
                    })
                  }
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Any</option>
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>{n === 4 ? "4+" : String(n)}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Min sq ft</span>
                <input
                  type="number"
                  placeholder="e.g. 600"
                  value={filters.minSqft ?? ""}
                  onChange={(e) =>
                    updateFilters({
                      ...filters,
                      minSqft: e.target.value === "" ? null : Math.max(0, +e.target.value),
                    })
                  }
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs text-muted-foreground">
                  Max price: {filters.maxPrice != null ? `$${filters.maxPrice.toLocaleString()}` : `$${MAX_PRICE_SLIDER.toLocaleString()}`}
                </span>
                <input
                  type="range"
                  min={0}
                  max={MAX_PRICE_SLIDER}
                  step={100}
                  value={filters.maxPrice ?? MAX_PRICE_SLIDER}
                  onChange={(e) => {
                    const v = +e.target.value;
                    updateFilters({
                      ...filters,
                      maxPrice: v >= MAX_PRICE_SLIDER ? null : v,
                    });
                  }}
                  className="w-full h-2 rounded-full appearance-none bg-muted [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#10B981] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#10B981] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                />
              </label>
            </motion.div>
          )}
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6">

        {/* --- Loading state --- */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 gap-4"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-[#10B981]/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#10B981] animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-foreground font-medium">Searching rentals in {displayLocation}...</p>
              <p className="text-muted-foreground text-sm mt-1">Fetching live listings from Zillow. This may take a few seconds.</p>
            </div>
          </motion.div>
        )}

        {/* --- Error state --- */}
        {!loading && hasSearched && error && filteredListings.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#F59E0B]/10 flex items-center justify-center mb-5">
              <AlertTriangle className="w-8 h-8 text-[#F59E0B]" />
            </div>
            <h3 className="text-foreground text-lg font-semibold mb-2">
              Something went wrong
            </h3>
            <p className="text-muted-foreground text-sm text-center max-w-md mb-6">
              We couldn't fetch listings for "{filters.location}" right now. This is usually temporary — Zillow may be rate-limiting or the connection timed out.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleSearch()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#10B981] text-white text-sm font-medium hover:bg-[#0d9668] transition-colors"
              >
                <RefreshCw size={15} />
                Try Again
              </button>
              <button
                type="button"
                onClick={() => navigate("/listings")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-accent transition-colors"
              >
                New Search
              </button>
            </div>
          </motion.div>
        )}

        {/* --- Results found --- */}
        {!loading && hasSearched && filteredListings.length > 0 && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-2 flex-wrap">
                <MapPin size={18} className="text-[#10B981]" />
                <h2 className="text-foreground text-xl font-bold">
                  {isFilterOnlyMode
                    ? `${filteredListings.length} ${filters.saved && filters.applied ? "saved & applied" : filters.saved ? "saved" : "applied"} ${filteredListings.length === 1 ? "listing" : "listings"}`
                    : `${zillowTotal.toLocaleString()} rentals in ${displayLocation}`}
                </h2>
                {!isFilterOnlyMode && (
                  <span className="inline-flex items-center gap-1 text-xs bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 rounded-full font-medium">
                    <Globe size={12} />
                    Live from Zillow
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-card border border-border rounded-xl overflow-hidden flex">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2.5 ${viewMode === "grid" ? "bg-[#10B981]/15 text-[#10B981]" : "text-muted-foreground hover:text-foreground"}`}
                    aria-label="Grid layout"
                    title="Grid layout"
                  >
                    <Grid2x2 size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2.5 ${viewMode === "list" ? "bg-[#10B981]/15 text-[#10B981]" : "text-muted-foreground hover:text-foreground"}`}
                    aria-label="List layout"
                    title="List layout"
                  >
                    <LayoutList size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6"
                  : "flex flex-col gap-4 max-w-3xl mx-auto"
              }
            >
              {filteredListings.map((listing, i) => (
                <motion.div
                  key={listing.id}
                  className={viewMode === "grid" ? "h-full min-h-0" : undefined}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                >
                  <ListingCard
                    listing={formatListing(listing)}
                    isSaved={savedIds.has(listing.id)}
                    onToggleSave={toggleSave}
                    className={viewMode === "grid" ? "h-full" : undefined}
                  />
                </motion.div>
              ))}
            </div>

            {!isFilterOnlyMode && zillowTotalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-8 pb-4">
                <button
                  type="button"
                  disabled={zillowPage <= 1}
                  onClick={() => setZillowPage((p) => Math.max(1, p - 1))}
                  className="px-4 py-2 rounded-xl border border-border text-sm font-medium disabled:opacity-40 hover:bg-accent transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {zillowPage} of {zillowTotalPages}
                </span>
                <button
                  type="button"
                  disabled={zillowPage >= zillowTotalPages}
                  onClick={() => setZillowPage((p) => Math.min(zillowTotalPages, p + 1))}
                  className="px-4 py-2 rounded-xl border border-border text-sm font-medium disabled:opacity-40 hover:bg-accent transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* --- No results (searched but nothing came back, no error) --- */}
        {!loading && hasSearched && !error && filteredListings.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
              <Home className="w-8 h-8 text-muted-foreground" />
            </div>

            {isFilterOnlyMode ? (
              <>
                <h3 className="text-foreground text-lg font-semibold mb-2">
                  No {filters.saved && filters.applied ? "saved & applied" : filters.saved ? "saved" : "applied"} listings yet
                </h3>
                <p className="text-muted-foreground text-sm text-center max-w-md mb-6">
                  {filters.saved && filters.applied
                    ? "Listings that are both saved and applied will appear here."
                    : filters.saved
                      ? "Listings you save will appear here. Search for rentals and tap the heart icon to save them."
                      : "Listings you apply to will appear here. Search for rentals and apply to get started."}
                </p>
              </>
            ) : (
              <>
                <h3 className="text-foreground text-lg font-semibold mb-2">
                  No rentals found in {displayLocation}
                </h3>
                <p className="text-muted-foreground text-sm text-center max-w-md mb-2">
                  We searched Zillow but didn't find listings matching your criteria. Here are a few things to try:
                </p>
                <ul className="text-muted-foreground text-sm text-left space-y-1.5 mb-6">
                  <li className="flex items-start gap-2">
                    <MapPin size={14} className="text-[#10B981] mt-0.5 shrink-0" />
                    <span>Check the city spelling or try a nearby city</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <SlidersHorizontal size={14} className="text-[#10B981] mt-0.5 shrink-0" />
                    <span>Broaden your filters (higher max price, fewer bedrooms)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Globe size={14} className="text-[#10B981] mt-0.5 shrink-0" />
                    <span>Include the state, e.g. "Austin, TX" or "Portland, OR"</span>
                  </li>
                </ul>
              </>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  updateFilters({ ...defaultSearchFilters, location: "" });
                  setSearchInput("");
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#10B981] text-white text-sm font-medium hover:bg-[#0d9668] transition-colors"
              >
                <Search size={15} />
                New Search
              </button>
              {(filters.beds != null || filters.baths != null || filters.maxPrice != null || filters.minSqft != null) && (
                <button
                  type="button"
                  onClick={() => updateFilters({ ...defaultSearchFilters, location: filters.location })}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-accent transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* --- Initial state (no search yet) --- */}
        {!loading && !hasSearched && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#10B981]/10 flex items-center justify-center mb-5">
              <Search size={28} className="text-[#10B981]" />
            </div>
            <h3 className="text-foreground text-lg font-semibold mb-2">
              Search for rentals
            </h3>
            <p className="text-muted-foreground text-sm text-center max-w-sm mb-6">
              Enter a city name above to find available rentals. Try "Irvine", "Los Angeles", or "San Diego, CA".
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {["Irvine", "Los Angeles", "San Diego", "San Francisco", "Newport Beach"].map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => handleSelectSuggestion(city)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card border border-border text-sm text-foreground hover:border-[#10B981]/40 hover:bg-[#10B981]/5 transition-colors"
                >
                  <MapPin size={13} className="text-[#10B981]" />
                  {city}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
