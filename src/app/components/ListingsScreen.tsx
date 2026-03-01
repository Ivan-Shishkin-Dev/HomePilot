import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { Search, SlidersHorizontal, MapPin, Loader2, ChevronDown } from "lucide-react";
import { useListings, useSavedListings, useAppliedListings } from "../../hooks/useSupabaseData";
import { motion, AnimatePresence } from "motion/react";

export const MAX_PRICE_SLIDER = 10000;

export interface SearchFilters {
  location: string;
  beds: number | null;
  baths: number | null;
  minSqft: number | null;
  maxPrice: number | null;
  petFriendly: boolean;
  studentFriendly: boolean;
  saved: boolean;
  applied: boolean;
}

export const defaultSearchFilters: SearchFilters = {
  location: "",
  beds: null,
  baths: null,
  minSqft: null,
  maxPrice: null,
  petFriendly: false,
  studentFriendly: false,
  saved: false,
  applied: false,
};

function buildSearchParams(f: SearchFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.location) p.set("location", f.location);
  if (f.beds != null) p.set("beds", String(f.beds));
  if (f.baths != null) p.set("baths", String(f.baths));
  if (f.minSqft != null) p.set("minSqft", String(f.minSqft));
  if (f.maxPrice != null) p.set("maxPrice", String(f.maxPrice));
  if (f.petFriendly) p.set("petFriendly", "1");
  if (f.studentFriendly) p.set("studentFriendly", "1");
  if (f.saved) p.set("saved", "1");
  if (f.applied) p.set("applied", "1");
  return p;
}

export function ListingsScreen() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<SearchFilters>(defaultSearchFilters);
  const [searchInput, setSearchInput] = useState("");
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [typeaheadOpen, setTypeaheadOpen] = useState(false);
  const typeaheadRef = useRef<HTMLDivElement>(null);

  const { listings, loading } = useListings();
  const { savedIds, savedCount } = useSavedListings();
  const { appliedIds, appliedCount } = useAppliedListings();

  // Unique city names from listings data (from src/data/*.json)
  const cityNames = useMemo(() => {
    const cities = [...new Set(listings.map((l) => l.city).filter(Boolean))] as string[];
    return cities.sort((a, b) => a.localeCompare(b));
  }, [listings]);

  // Typeahead: city names only (from data) that match as you type
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

  const handleSearch = () => {
    const next = { ...filters, location: searchInput.trim() };
    setFilters(next);
    setTypeaheadOpen(false);
    const query = buildSearchParams(next).toString();
    navigate(`/listings/results${query ? `?${query}` : ""}`);
  };

  const handleSelectSuggestion = (city: string) => {
    setSearchInput(city);
    setFilters((prev) => ({ ...prev, location: city }));
    setTypeaheadOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#10B981] animate-spin" />
      </div>
    );
  }

  // Hero pulls up to cover the full top strip (main is already -mt so content starts at 68px)
  return (
    <div className="relative -mt-[84px] min-h-[calc(100vh+84px)] flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200)`,
        }}
      />
      <div className="absolute inset-0 bg-black/50" />
      {/* Content below nav */}
      <div className="relative z-10 w-full max-w-3xl mx-auto text-center pt-[68px]">
        <motion.h1
          className="text-white text-3xl sm:text-4xl lg:text-5xl font-bold mb-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          Discover Your New Home
        </motion.h1>
        <motion.p
          className="text-white/90 text-sm sm:text-base mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
        >
          Helping renters find their perfect rental with Smart Search
        </motion.p>

        <motion.div
          ref={typeaheadRef}
          className="relative w-full"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
        >
          <div className="flex bg-white rounded-2xl shadow-lg overflow-hidden border border-white/20">
            <div className="flex items-center pl-4 text-muted-foreground">
              <Search size={20} className="shrink-0" />
            </div>
            <input
              type="text"
              placeholder="e.g. Irvine"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setTypeaheadOpen(true);
              }}
              onFocus={() => setTypeaheadOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              className="flex-1 min-w-0 py-3.5 px-3 text-gray-900 placeholder:text-gray-500 focus:outline-none text-[15px] bg-transparent"
            />
            <button
              type="button"
              onClick={handleSearch}
              className="bg-[#10B981] text-white px-5 sm:px-6 flex items-center justify-center gap-2 hover:bg-[#0d9668] transition-colors"
            >
              <Search size={18} />
              <span className="hidden sm:inline font-medium">Search</span>
            </button>
          </div>

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
        </motion.div>

        <motion.div
          className="mt-4 flex flex-wrap items-center justify-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <button
            type="button"
            onClick={() => setFilters((p) => ({ ...p, saved: !p.saved, applied: p.saved ? false : p.applied }))}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium shadow-lg border backdrop-blur-sm ${
              filters.saved
                ? "bg-[#10B981] text-white border-[#10B981]/50"
                : "bg-white/95 dark:bg-white/90 text-gray-900 dark:text-gray-900 border-white/30"
            }`}
          >
            Saved {savedCount > 0 && `(${savedCount})`}
          </button>
          <button
            type="button"
            onClick={() => setFilters((p) => ({ ...p, applied: !p.applied, saved: p.applied ? false : p.saved }))}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium shadow-lg border backdrop-blur-sm ${
              filters.applied
                ? "bg-[#10B981] text-white border-[#10B981]/50"
                : "bg-white/95 dark:bg-white/90 text-gray-900 dark:text-gray-900 border-white/30"
            }`}
          >
            Applied {appliedCount > 0 && `(${appliedCount})`}
          </button>
          <button
            type="button"
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/95 dark:bg-white/90 text-gray-900 dark:text-gray-900 text-sm font-medium hover:bg-white shadow-lg border border-white/30 backdrop-blur-sm"
          >
            <SlidersHorizontal size={16} />
            Filters
            <ChevronDown
              size={14}
              className={`transition-transform ${showFiltersPanel ? "rotate-180" : ""}`}
            />
          </button>
        </motion.div>

        {showFiltersPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 p-4 rounded-xl bg-white/95 dark:bg-white/95 text-gray-900 backdrop-blur-sm border border-white/30 shadow-lg"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Beds (min)</span>
                <select
                  value={filters.beds ?? ""}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, beds: e.target.value === "" ? null : +e.target.value }))
                  }
                  className="rounded-lg border border-gray-200 bg-gray-100 text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]/40"
                >
                  <option value="">Any</option>
                  {[0, 1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n === 0 ? "Studio" : n === 4 ? "4+" : String(n)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Baths (min)</span>
                <select
                  value={filters.baths ?? ""}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, baths: e.target.value === "" ? null : +e.target.value }))
                  }
                  className="rounded-lg border border-gray-200 bg-gray-100 text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]/40"
                >
                  <option value="">Any</option>
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>{n === 4 ? "4+" : String(n)}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Min sq ft</span>
                <input
                  type="number"
                  placeholder="e.g. 600"
                  value={filters.minSqft ?? ""}
                  onChange={(e) =>
                    setFilters((p) => ({
                      ...p,
                      minSqft: e.target.value === "" ? null : Math.max(0, +e.target.value),
                    }))
                  }
                  className="rounded-lg border border-gray-200 bg-gray-100 text-gray-900 px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#10B981]/40"
                />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs text-gray-600">
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
                    setFilters((p) => ({
                      ...p,
                      maxPrice: v >= MAX_PRICE_SLIDER ? null : v,
                    }));
                  }}
                  className="w-full h-2 rounded-full appearance-none bg-gray-200 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#10B981] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#10B981] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-gray-800">
                <input
                  type="checkbox"
                  checked={filters.petFriendly}
                  onChange={(e) => setFilters((p) => ({ ...p, petFriendly: e.target.checked }))}
                  className="rounded border-border text-[#10B981] focus:ring-[#10B981] focus:ring-offset-0"
                />
                <span className="text-sm">Pet friendly</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-gray-800">
                <input
                  type="checkbox"
                  checked={filters.studentFriendly}
                  onChange={(e) => setFilters((p) => ({ ...p, studentFriendly: e.target.checked }))}
                  className="rounded border-border text-[#10B981] focus:ring-[#10B981] focus:ring-offset-0"
                />
                <span className="text-sm">University students</span>
              </label>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export { buildSearchParams };
