import { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { Search, SlidersHorizontal, MapPin, Grid2x2, LayoutList, Loader2, ChevronDown, Globe, Home, RefreshCw, AlertTriangle, Target } from "lucide-react";
import { ListingCard } from "./ListingCard";
import { useSavedListings, useAppliedListings } from "../../hooks/useSupabaseData";
import { useZillowListings } from "../../hooks/useZillowListings";
import type { Listing } from "../../lib/supabase";
import {
  defaultSearchFilters,
  buildSearchParams,
  type SearchFilters,
  type PriorityParams,
  MAX_PRICE_SLIDER,
} from "./ListingsScreen";
import { motion, AnimatePresence } from "motion/react";
import {
  computeMatchPercentMulti,
  setTopMatchesQueue,
  type PriorityValues,
  type LastTopMatchSnapshot,
} from "../lib/priorityMatch";
import { PRIORITY_LABELS } from "../lib/priorityMatch";

type ViewMode = "grid" | "list";

function parseSearchParams(sp: URLSearchParams): SearchFilters {
  return {
    location: sp.get("location") ?? defaultSearchFilters.location,
    beds: sp.get("beds") != null ? +sp.get("beds")! : null,
    baths: sp.get("baths") != null ? +sp.get("baths")! : null,
    minSqft: sp.get("minSqft") != null ? +sp.get("minSqft")! : null,
    maxSqft: sp.get("maxSqft") != null ? +sp.get("maxSqft")! : null,
    maxPrice: sp.get("maxPrice") != null ? +sp.get("maxPrice")! : null,
    petFriendly: sp.get("petFriendly") === "1",
    studentFriendly: sp.get("studentFriendly") === "1",
    saved: sp.get("saved") === "1",
    applied: sp.get("applied") === "1",
  };
}

function parsePriorityFromParams(sp: URLSearchParams): PriorityValues {
  const out: PriorityValues = {};
  const cost = sp.get("priorityCost");
  if (cost != null) { const n = parseInt(cost, 10); if (!isNaN(n) && n > 0) out.cost = n; }
  const sqft = sp.get("prioritySqft");
  if (sqft != null) { const n = parseInt(sqft, 10); if (!isNaN(n) && n > 0) out.sqft = n; }
  const beds = sp.get("priorityBeds");
  if (beds != null) { const n = parseInt(beds, 10); if (!isNaN(n) && n > 0) out.beds = n; }
  const baths = sp.get("priorityBaths");
  if (baths != null) { const n = parseInt(baths, 10); if (!isNaN(n) && n > 0) out.baths = n; }
  return out;
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

const PRIORITY_FIELDS: { key: keyof PriorityValues; label: string; placeholder: string }[] = [
  { key: "cost", label: PRIORITY_LABELS.cost, placeholder: "e.g. 2000" },
  { key: "sqft", label: PRIORITY_LABELS.sqft, placeholder: "e.g. 800" },
  { key: "beds", label: PRIORITY_LABELS.beds, placeholder: "e.g. 2" },
  { key: "baths", label: PRIORITY_LABELS.baths, placeholder: "e.g. 1" },
];

export function ListingsResultsScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialFilters = useMemo(() => parseSearchParams(searchParams), []);
  const initialPriority = useMemo(() => parsePriorityFromParams(searchParams), []);

  // ---- Pending (draft) filter state — updated instantly by controls, no API call ----
  const [searchInput, setSearchInput] = useState(initialFilters.location);
  const [pendingBeds, setPendingBeds] = useState<number | null>(initialFilters.beds);
  const [pendingBaths, setPendingBaths] = useState<number | null>(initialFilters.baths);
  const [pendingMinSqft, setPendingMinSqft] = useState<number | null>(initialFilters.minSqft);
  const [pendingMaxSqft, setPendingMaxSqft] = useState<number | null>(initialFilters.maxSqft);
  const [pendingMaxPrice, setPendingMaxPrice] = useState<number | null>(initialFilters.maxPrice);
  const [pendingSaved, setPendingSaved] = useState(initialFilters.saved);
  const [pendingApplied, setPendingApplied] = useState(initialFilters.applied);
  const priorityStateFromValues = (pv: PriorityValues) =>
    (["cost", "sqft", "beds", "baths"] as const).reduce(
      (acc, k) => ({
        ...acc,
        [k]: {
          checked: pv[k] != null && pv[k]! > 0,
          value: pv[k] != null ? String(pv[k]) : "",
        },
      }),
      {} as Record<keyof PriorityValues, { checked: boolean; value: string }>
    );
  const [pendingPriorities, setPendingPriorities] = useState(priorityStateFromValues(initialPriority));

  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [showPriorityPanel, setShowPriorityPanel] = useState(false);
  const [typeaheadOpen, setTypeaheadOpen] = useState(false);
  const typeaheadRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const { savedIds, toggleSave } = useSavedListings();
  const { appliedIds } = useAppliedListings();

  // ---- Committed state — only changes when Search is clicked ----
  const [committedFilters, setCommittedFilters] = useState<SearchFilters>(initialFilters);
  const [committedPriorities, setCommittedPriorities] = useState<PriorityValues>(initialPriority);
  const [zillowPage, setZillowPage] = useState(1);

  const zillowOpts = useMemo(() => {
    if (!committedFilters.location.trim()) return null;
    const { city, state } = parseStateFromLocation(committedFilters.location);
    return { city, state, page: zillowPage };
  }, [committedFilters.location, zillowPage]);

  const {
    listings: zillowListings,
    totalResults: zillowTotal,
    totalPages: zillowTotalPages,
    loading: zillowLoading,
    error,
  } = useZillowListings(zillowOpts);

  // Persist fetched listings to sessionStorage for detail page
  useEffect(() => {
    if (zillowListings.length > 0) {
      try {
        const existing = sessionStorage.getItem("zillow_listings");
        const prev: unknown[] = existing ? JSON.parse(existing) : [];
        const merged = [...prev, ...zillowListings];
        const unique = Array.from(new Map(merged.map((l: any) => [l.id, l])).values());
        sessionStorage.setItem("zillow_listings", JSON.stringify(unique.slice(-200)));
      } catch { /* quota exceeded */ }
    }
  }, [zillowListings]);

  // Saved/applied without a city: pull from sessionStorage cache
  const isFilterOnlyMode = !committedFilters.location.trim() && (committedFilters.saved || committedFilters.applied);

  const cachedListings = useMemo(() => {
    if (!isFilterOnlyMode) return [];
    try {
      const raw = sessionStorage.getItem("zillow_listings");
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Listing[];
      return parsed.filter((l) => {
        const matchesSaved = !committedFilters.saved || savedIds.has(l.id);
        const matchesApplied = !committedFilters.applied || appliedIds.has(l.id);
        return matchesSaved && matchesApplied;
      });
    } catch {
      return [];
    }
  }, [isFilterOnlyMode, committedFilters.saved, committedFilters.applied, savedIds, appliedIds]);

  const baseListings = isFilterOnlyMode ? cachedListings : zillowListings;
  const loading = isFilterOnlyMode ? false : zillowLoading;

  // Client-side filtering using COMMITTED filters (not pending)
  const filteredListings = useMemo(() => {
    let list = [...baseListings];
    if (committedFilters.beds != null) list = list.filter((l) => l.beds >= committedFilters.beds!);
    if (committedFilters.baths != null) list = list.filter((l) => l.baths >= committedFilters.baths!);
    if (committedFilters.minSqft != null) list = list.filter((l) => l.sqft > 0 && l.sqft >= committedFilters.minSqft!);
    if (committedFilters.maxSqft != null) list = list.filter((l) => l.sqft > 0 && l.sqft <= committedFilters.maxSqft!);
    if (committedFilters.maxPrice != null) list = list.filter((l) => l.price <= committedFilters.maxPrice!);
    if (!isFilterOnlyMode && committedFilters.saved) list = list.filter((l) => savedIds.has(l.id));
    if (!isFilterOnlyMode && committedFilters.applied) list = list.filter((l) => appliedIds.has(l.id));
    return list;
  }, [baseListings, committedFilters, savedIds, appliedIds, isFilterOnlyMode]);

  // Compute match % per listing from committed priorities (multi), then sort by match desc
  const hasAnyPriority = useMemo(
    () =>
      (committedPriorities.cost != null && committedPriorities.cost > 0) ||
      (committedPriorities.sqft != null && committedPriorities.sqft > 0) ||
      (committedPriorities.beds != null && committedPriorities.beds > 0) ||
      (committedPriorities.baths != null && committedPriorities.baths > 0),
    [committedPriorities]
  );
  const listingsWithMatch = useMemo(() => {
    const list = filteredListings.map((listing) => {
      const matchPercent = hasAnyPriority
        ? computeMatchPercentMulti(
            { id: listing.id, price: listing.price, sqft: listing.sqft, beds: listing.beds, baths: listing.baths },
            committedPriorities
          )
        : 85;
      return { listing, matchPercent };
    });
    return [...list].sort((a, b) => b.matchPercent - a.matchPercent);
  }, [filteredListings, committedPriorities, hasAnyPriority]);

  const pendingPriorityParams: PriorityParams = useMemo(() => {
    const p: PriorityParams = {};
    (["cost", "sqft", "beds", "baths"] as const).forEach((k) => {
      if (pendingPriorities[k].checked && pendingPriorities[k].value.trim()) {
        const n = parseInt(pendingPriorities[k].value, 10);
        if (!isNaN(n) && n > 0) p[k] = n;
      }
    });
    return p;
  }, [pendingPriorities]);

  const locationValid = searchInput.trim().length > 0;
  const priorityValid = Object.keys(pendingPriorityParams).length > 0;
  const canCommitSearch = locationValid && priorityValid;

  // ---- Commit: build current pending state into filters, fire search ----
  const commitSearch = (overrides?: Partial<SearchFilters>) => {
    const onlySavedApplied = overrides && Object.keys(overrides).every((k) => k === "saved" || k === "applied");
    if (!onlySavedApplied && !canCommitSearch) return;
    const next: SearchFilters = {
      location: overrides?.location ?? searchInput.trim(),
      beds: overrides?.beds !== undefined ? overrides.beds : pendingBeds,
      baths: overrides?.baths !== undefined ? overrides.baths : pendingBaths,
      minSqft: overrides?.minSqft !== undefined ? overrides.minSqft : pendingMinSqft,
      maxSqft: overrides?.maxSqft !== undefined ? overrides.maxSqft : pendingMaxSqft,
      maxPrice: overrides?.maxPrice !== undefined ? overrides.maxPrice : pendingMaxPrice,
      petFriendly: false,
      studentFriendly: false,
      saved: overrides?.saved !== undefined ? overrides.saved : pendingSaved,
      applied: overrides?.applied !== undefined ? overrides.applied : pendingApplied,
    };
    const nextPriorities: PriorityValues = { ...pendingPriorityParams };
    setCommittedFilters(next);
    setCommittedPriorities(nextPriorities);
    setZillowPage(1);
    setSearchParams(buildSearchParams(next, nextPriorities));
    setTypeaheadOpen(false);
  };

  const handleSearch = () => commitSearch();

  const handleSelectSuggestion = (city: string) => {
    setSearchInput(city);
    if (priorityValid) commitSearch({ location: city });
  };

  // Typeahead
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

  const displayLocation = committedFilters.location || "all areas";
  const hasSearched = committedFilters.location.trim().length > 0 || isFilterOnlyMode;

  const formatListing = (listing: (typeof zillowListings)[0], matchPercent: number) => ({
    id: listing.id,
    title: listing.title,
    address: listing.address,
    city: listing.city || "",
    price: listing.price,
    beds: listing.beds,
    baths: listing.baths,
    sqft: listing.sqft,
    matchPercent,
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

  // Persist queue of high matches (≥75%) + last search params for dashboard next-in-line
  const searchParamsString = searchParams.toString();
  useEffect(() => {
    if (listingsWithMatch.length > 0 && hasSearched && !loading) {
      const snapshots: LastTopMatchSnapshot[] = listingsWithMatch.map(({ listing, matchPercent }) => ({
        id: listing.id,
        matchPercent,
        title: listing.title,
        price: listing.price,
        address: listing.address,
        city: listing.city || "",
        image: listing.image,
        timeLeft: listing.time_left || "",
      }));
      setTopMatchesQueue(snapshots, searchParamsString);
    }
  }, [listingsWithMatch, hasSearched, loading, searchParamsString]);

  // Check if pending filters differ from committed (to hint the user to click Search)
  const hasPendingChanges =
    searchInput.trim() !== committedFilters.location ||
    pendingBeds !== committedFilters.beds ||
    pendingBaths !== committedFilters.baths ||
    pendingMinSqft !== committedFilters.minSqft ||
    pendingMaxSqft !== committedFilters.maxSqft ||
    pendingMaxPrice !== committedFilters.maxPrice ||
    JSON.stringify(pendingPriorityParams) !== JSON.stringify(committedPriorities);

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
                disabled={!canCommitSearch}
                className={`shrink-0 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  hasPendingChanges
                    ? "bg-[#10B981] hover:bg-[#0d9668] ring-2 ring-[#10B981]/30"
                    : "bg-[#10B981] hover:bg-[#0d9668]"
                }`}
              >
                <Search size={16} />
                Search
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setPendingSaved(!pendingSaved);
                commitSearch({ saved: !pendingSaved });
              }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                pendingSaved
                  ? "bg-[#10B981] text-white border-[#10B981]"
                  : "border-border bg-background text-foreground hover:bg-accent"
              }`}
            >
              Saved {savedIds.size > 0 && `(${savedIds.size})`}
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingApplied(!pendingApplied);
                commitSearch({ applied: !pendingApplied });
              }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                pendingApplied
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
            <button
              type="button"
              onClick={() => setShowPriorityPanel(!showPriorityPanel)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                Object.keys(committedPriorities).length > 0
                  ? "bg-[#10B981] text-white border-[#10B981]"
                  : "border-border bg-background text-foreground hover:bg-accent"
              }`}
            >
              <Target size={16} />
              Set priority (required)
              <ChevronDown
                size={14}
                className={`transition-transform ${showPriorityPanel ? "rotate-180" : ""}`}
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
                  value={pendingBeds ?? ""}
                  onChange={(e) => setPendingBeds(e.target.value === "" ? null : +e.target.value)}
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
                  value={pendingBaths ?? ""}
                  onChange={(e) => setPendingBaths(e.target.value === "" ? null : +e.target.value)}
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
                  value={pendingMinSqft ?? ""}
                  onChange={(e) => setPendingMinSqft(e.target.value === "" ? null : Math.max(0, +e.target.value))}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Max sq ft</span>
                <input
                  type="number"
                  placeholder="e.g. 1500"
                  value={pendingMaxSqft ?? ""}
                  onChange={(e) => setPendingMaxSqft(e.target.value === "" ? null : Math.max(0, +e.target.value))}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs text-muted-foreground">
                  Max price: {pendingMaxPrice != null ? `$${pendingMaxPrice.toLocaleString()}` : `$${MAX_PRICE_SLIDER.toLocaleString()}`}
                </span>
                <input
                  type="range"
                  min={0}
                  max={MAX_PRICE_SLIDER}
                  step={100}
                  value={pendingMaxPrice ?? MAX_PRICE_SLIDER}
                  onChange={(e) => {
                    const v = +e.target.value;
                    setPendingMaxPrice(v >= MAX_PRICE_SLIDER ? null : v);
                  }}
                  className="w-full h-2 rounded-full appearance-none bg-muted [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#10B981] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#10B981] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                />
              </label>

              <div className="col-span-2 sm:col-span-4 flex items-center gap-2 pt-1">
                {hasPendingChanges && (
                  <>
                    <span className="text-xs text-[#F59E0B] font-medium">Filters changed</span>
                    <span className="text-xs text-muted-foreground">— click Search to apply</span>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPendingBeds(null);
                    setPendingBaths(null);
                    setPendingMinSqft(null);
                    setPendingMaxSqft(null);
                    setPendingMaxPrice(null);
                    setPendingSaved(false);
                    setPendingApplied(false);
                  }}
                  className="ml-auto rounded-lg border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 px-3 py-1.5 text-xs font-medium text-[#EF4444] hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                >
                  Reset filters
                </button>
              </div>
            </motion.div>
          )}

          {showPriorityPanel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 pt-4 border-t border-border"
            >
              <p className="text-xs text-muted-foreground mb-3">
                Check at least one priority and enter a value. Match % is based on these. Location is required.
              </p>
              <div className="space-y-3">
                {PRIORITY_FIELDS.map(({ key, label, placeholder }) => (
                  <div key={key} className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pendingPriorities[key].checked}
                        onChange={(e) =>
                          setPendingPriorities((p) => ({
                            ...p,
                            [key]: { ...p[key], checked: e.target.checked, value: e.target.checked ? p[key].value : "" },
                          }))
                        }
                        className="rounded border-border text-[#10B981] focus:ring-[#10B981]"
                      />
                      <span className="text-sm font-medium">{label}</span>
                    </label>
                    {pendingPriorities[key].checked && (
                      <input
                        type="number"
                        min={1}
                        placeholder={placeholder}
                        value={pendingPriorities[key].value}
                        onChange={(e) =>
                          setPendingPriorities((p) => ({ ...p, [key]: { ...p[key], value: e.target.value } }))
                        }
                        className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm w-28"
                      />
                    )}
                  </div>
                ))}
              </div>
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
              We couldn't fetch listings for "{committedFilters.location}" right now. This is usually temporary — Zillow may be rate-limiting or the connection timed out.
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
                    ? `${filteredListings.length} ${committedFilters.saved && committedFilters.applied ? "saved & applied" : committedFilters.saved ? "saved" : "applied"} ${filteredListings.length === 1 ? "listing" : "listings"}`
                    : `${filteredListings.length.toLocaleString()} rentals in ${displayLocation}`}
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
              {listingsWithMatch.map(({ listing, matchPercent }, i) => (
                <motion.div
                  key={listing.id}
                  className={viewMode === "grid" ? "h-full min-h-0" : undefined}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                >
                  <ListingCard
                    listing={formatListing(listing, matchPercent)}
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
                  No {committedFilters.saved && committedFilters.applied ? "saved & applied" : committedFilters.saved ? "saved" : "applied"} listings yet
                </h3>
                <p className="text-muted-foreground text-sm text-center max-w-md mb-6">
                  {committedFilters.saved && committedFilters.applied
                    ? "Listings that are both saved and applied will appear here."
                    : committedFilters.saved
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
                  setSearchInput("");
                  setPendingBeds(null);
                  setPendingBaths(null);
                  setPendingMinSqft(null);
                  setPendingMaxSqft(null);
                  setPendingMaxPrice(null);
                  setPendingSaved(false);
                  setPendingApplied(false);
                  setPendingPriorities(priorityStateFromValues({}));
                  setCommittedFilters(defaultSearchFilters);
                  setCommittedPriorities({});
                  setSearchParams(new URLSearchParams());
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#10B981] text-white text-sm font-medium hover:bg-[#0d9668] transition-colors"
              >
                <Search size={15} />
                New Search
              </button>
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
