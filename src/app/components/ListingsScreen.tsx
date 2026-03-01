import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { Search, SlidersHorizontal, MapPin, ChevronDown } from "lucide-react";
import { useSavedListings, useAppliedListings } from "../../hooks/useSupabaseData";
import { motion, AnimatePresence } from "motion/react";
import type { PriorityValues } from "../lib/priorityMatch";
import { PRIORITY_LABELS } from "../lib/priorityMatch";

export const MAX_PRICE_SLIDER = 10000;

export interface SearchFilters {
  location: string;
  beds: number | null;
  baths: number | null;
  minSqft: number | null;
  maxSqft: number | null;
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
  maxSqft: null,
  maxPrice: null,
  petFriendly: false,
  studentFriendly: false,
  saved: false,
  applied: false,
};

export type PriorityParams = PriorityValues;

function buildSearchParams(f: SearchFilters, priorityParams?: PriorityParams): URLSearchParams {
  const p = new URLSearchParams();
  if (f.location) p.set("location", f.location);
  if (f.beds != null) p.set("beds", String(f.beds));
  if (f.baths != null) p.set("baths", String(f.baths));
  if (f.minSqft != null) p.set("minSqft", String(f.minSqft));
  if (f.maxSqft != null) p.set("maxSqft", String(f.maxSqft));
  if (f.maxPrice != null) p.set("maxPrice", String(f.maxPrice));
  if (f.petFriendly) p.set("petFriendly", "1");
  if (f.studentFriendly) p.set("studentFriendly", "1");
  if (f.saved) p.set("saved", "1");
  if (f.applied) p.set("applied", "1");
  if (priorityParams?.cost != null && priorityParams.cost > 0) p.set("priorityCost", String(priorityParams.cost));
  if (priorityParams?.sqft != null && priorityParams.sqft > 0) p.set("prioritySqft", String(priorityParams.sqft));
  if (priorityParams?.beds != null && priorityParams.beds > 0) p.set("priorityBeds", String(priorityParams.beds));
  if (priorityParams?.baths != null && priorityParams.baths > 0) p.set("priorityBaths", String(priorityParams.baths));
  return p;
}

const PRIORITY_FIELDS: { key: keyof PriorityValues; label: string; placeholder: string }[] = [
  { key: "cost", label: PRIORITY_LABELS.cost, placeholder: "e.g. 2000" },
  { key: "sqft", label: PRIORITY_LABELS.sqft, placeholder: "e.g. 800" },
  { key: "beds", label: PRIORITY_LABELS.beds, placeholder: "e.g. 2" },
  { key: "baths", label: PRIORITY_LABELS.baths, placeholder: "e.g. 1" },
];

type PriorityState = { checked: boolean; value: string };

const initialPriorityState = (): Record<keyof PriorityValues, PriorityState> => ({
  cost: { checked: false, value: "" },
  sqft: { checked: false, value: "" },
  beds: { checked: false, value: "" },
  baths: { checked: false, value: "" },
});

export function ListingsScreen() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<SearchFilters>(defaultSearchFilters);
  const [searchInput, setSearchInput] = useState("");
  const [priorities, setPriorities] = useState<Record<keyof PriorityValues, PriorityState>>(initialPriorityState);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [typeaheadOpen, setTypeaheadOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const typeaheadRef = useRef<HTMLDivElement>(null);

  const locationValid = searchInput.trim().length > 0;
  const priorityEntries = (PRIORITY_FIELDS.filter((f) => priorities[f.key].checked) as { key: keyof PriorityValues; label: string; placeholder: string }[]);
  const priorityValuesValid = priorityEntries.length > 0 && priorityEntries.every((f) => {
    const v = priorities[f.key].value.trim();
    const n = v ? parseInt(v, 10) : NaN;
    return !isNaN(n) && n > 0;
  });
  const canSearch = locationValid && priorityValuesValid;

  const { savedIds, savedCount } = useSavedListings();
  const { appliedIds, appliedCount } = useAppliedListings();

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

  const handleSearch = () => {
    setTouched(true);
    if (!canSearch) return;
    const next = { ...filters, location: searchInput.trim() };
    setFilters(next);
    setTypeaheadOpen(false);
    const priorityParams: PriorityParams = {};
    (["cost", "sqft", "beds", "baths"] as const).forEach((k) => {
      if (priorities[k].checked && priorities[k].value.trim()) {
        const n = parseInt(priorities[k].value, 10);
        if (!isNaN(n) && n > 0) priorityParams[k] = n;
      }
    });
    const query = buildSearchParams(next, priorityParams).toString();
    navigate(`/listings/results?${query}`);
  };

  const handleSelectSuggestion = (city: string) => {
    setSearchInput(city);
    setFilters((prev) => ({ ...prev, location: city }));
    setTypeaheadOpen(false);
  };

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
          <div className="relative flex items-center bg-white dark:bg-black/90 rounded-2xl shadow-lg border border-white/20 dark:border-[#10B981]/40 pr-2 py-1.5 sm:pr-3">
            <div className="flex items-center pl-4 text-muted-foreground dark:text-[#10B981]">
              <Search size={20} className="shrink-0" />
            </div>
            <input
              type="text"
              placeholder="Enter location e.g. Irvine (required)"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setTypeaheadOpen(true);
              }}
              onFocus={() => setTypeaheadOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              className="flex-1 min-w-0 py-3 px-3 pr-20 sm:pr-24 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none text-[15px] bg-transparent"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={!canSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[#10B981] text-white p-2.5 sm:px-4 sm:py-2.5 flex items-center justify-center gap-1.5 shadow-lg hover:bg-[#0d9668] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ring-2 ring-white/20 dark:ring-black/20"
            >
              <Search size={18} className="sm:mr-0.5" />
              <span className="hidden sm:inline font-medium text-sm">Search</span>
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

        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 p-4 rounded-xl bg-white/95 dark:bg-black/90 text-gray-900 dark:text-gray-100 backdrop-blur-sm border border-white/30 dark:border-[#10B981]/40 shadow-lg"
        >
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Set priority</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              Check at least one priority and enter a value. Match % will be based on these.
            </p>
            {touched && !priorityValuesValid && (
              <p className="text-xs text-red-500 dark:text-red-400 mb-2">
                Select at least one priority and enter a valid value for each checked one.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {PRIORITY_FIELDS.map(({ key, label, placeholder }) => (
                <div key={key} className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={priorities[key].checked}
                      onChange={(e) =>
                        setPriorities((p) => ({
                          ...p,
                          [key]: { ...p[key], checked: e.target.checked, value: e.target.checked ? p[key].value : "" },
                        }))
                      }
                      className="rounded border-gray-300 dark:border-[#10B981]/60 text-[#10B981] focus:ring-[#10B981] dark:bg-black/50"
                    />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</span>
                  </label>
                  {priorities[key].checked && (
                    <input
                      type="number"
                      min={1}
                      placeholder={placeholder}
                      value={priorities[key].value}
                      onChange={(e) =>
                        setPriorities((p) => ({ ...p, [key]: { ...p[key], value: e.target.value } }))
                      }
                      className="rounded-lg border border-gray-200 dark:border-[#10B981]/50 bg-gray-100 dark:bg-black/50 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-500 px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-[#10B981]/40"
                    />
                  )}
                </div>
              ))}
            </div>
            {touched && !locationValid && (
              <p className="text-xs text-red-500 dark:text-red-400 mt-2">Enter a location to search.</p>
            )}
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
