import { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { Search, SlidersHorizontal, MapPin, Grid2x2, LayoutList, Loader2, ChevronDown } from "lucide-react";
import { ListingCard } from "./ListingCard";
import { useListings } from "../../hooks/useSupabaseData";
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
  };
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

  const { listings, loading } = useListings();

  // Unique city names from listings data (same as main search page)
  const cityNames = useMemo(() => {
    const cities = [...new Set(listings.map((l) => l.city).filter(Boolean))] as string[];
    return cities.sort((a, b) => a.localeCompare(b));
  }, [listings]);

  const suggestions = useMemo(() => {
    if (!searchInput.trim()) return [];
    const q = searchInput.trim().toLowerCase();
    return cityNames.filter((city) => city.toLowerCase().includes(q));
  }, [cityNames, searchInput]);

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

  const formatListing = (listing: (typeof listings)[0]) => ({
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

  const filteredListings = useMemo(() => {
    let list = [...listings];
    // Location filter: match by city only (so "Irvine" = Irvine city, not Irvine Ave in Newport Beach)
    if (filters.location.trim()) {
      const loc = filters.location.trim().toLowerCase();
      list = list.filter((l) => (l.city ?? "").toLowerCase().includes(loc));
    }
    if (filters.beds != null) list = list.filter((l) => l.beds >= filters.beds!);
    if (filters.baths != null) list = list.filter((l) => l.baths >= filters.baths!);
    if (filters.minSqft != null) list = list.filter((l) => l.sqft >= filters.minSqft!);
    if (filters.maxPrice != null) list = list.filter((l) => l.price <= filters.maxPrice!);
    if (filters.petFriendly) {
      list = list.filter((l) => l.pet_policy?.cats || l.pet_policy?.dogs);
    }
    if (filters.studentFriendly) {
      list = list.filter((l) => l.student_friendly === true);
    }
    return list;
  }, [listings, filters]);

  const updateFilters = (next: SearchFilters) => {
    setSearchInput(next.location);
    const query = buildSearchParams(next).toString();
    setSearchParams(query ? `?${query}` : "");
  };

  const handleSearch = () => {
    setTypeaheadOpen(false);
    updateFilters({ ...filters, location: searchInput.trim() });
  };

  const handleSelectSuggestion = (city: string) => {
    setSearchInput(city);
    setTypeaheadOpen(false);
    updateFilters({ ...filters, location: city });
  };

  const displayLocation = filters.location || "all areas";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#10B981] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Search + filters float (no bar, no line) */}
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
                  placeholder="e.g. Irvine"
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
              <label className="col-span-2 sm:col-span-4 flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.petFriendly}
                    onChange={(e) =>
                      updateFilters({ ...filters, petFriendly: e.target.checked })
                    }
                    className="rounded border-border text-[#10B981] focus:ring-[#10B981]"
                  />
                  <span className="text-sm">Pet friendly</span>
                </span>
                <span className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.studentFriendly}
                    onChange={(e) =>
                      updateFilters({ ...filters, studentFriendly: e.target.checked })
                    }
                    className="rounded border-border text-[#10B981] focus:ring-[#10B981]"
                  />
                  <span className="text-sm">University students</span>
                </span>
              </label>
            </motion.div>
          )}
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-[#10B981]" />
            <h2 className="text-foreground text-xl font-bold">
              {filteredListings.length} {filteredListings.length === 1 ? "listing" : "listings"} in {displayLocation}
            </h2>
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
              <ListingCard listing={formatListing(listing)} className={viewMode === "grid" ? "h-full" : undefined} />
            </motion.div>
          ))}
        </div>

        {filteredListings.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="font-medium">No listings match your search.</p>
            <p className="text-sm mt-1">Try adjusting location or filters, or search from the main listings page.</p>
            <button
              type="button"
              onClick={() => navigate("/listings")}
              className="mt-4 text-[#10B981] hover:underline font-medium"
            >
              Back to search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
