import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { Search, SlidersHorizontal, MapPin, Grid2x2, LayoutList, Loader2 } from "lucide-react";
import { ListingCard } from "./ListingCard";
import { useListings, useSavedListings, useAppliedListings } from "../../hooks/useSupabaseData";
import { useAuth } from "../../contexts/AuthContext";
import { motion } from "motion/react";

const filters = ["All", "Saved Listings", "Applied Listings", "Best Match", "Lowest Price", "Newest", "Pet Friendly"];

export function ListingsScreen() {
  const [searchParams] = useSearchParams();
  const filterFromUrl = searchParams.get("filter");
  const [activeFilter, setActiveFilter] = useState(
    filterFromUrl === "saved" ? "Saved Listings" : filterFromUrl === "applied" ? "Applied Listings" : "All"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { listings, loading } = useListings();
  const { savedIds, toggleSave } = useSavedListings();
  const { appliedIds } = useAppliedListings();
  const { profile } = useAuth();

  useEffect(() => {
    if (filterFromUrl === "saved") setActiveFilter("Saved Listings");
    if (filterFromUrl === "applied") setActiveFilter("Applied Listings");
  }, [filterFromUrl]);

  // Convert listing format for ListingCard (using actual DB schema)
  const formatListing = (listing: typeof listings[0]) => ({
    id: listing.id,
    title: listing.title,
    address: listing.address,
    city: listing.city || "",
    price: listing.price,
    beds: listing.beds,
    baths: listing.baths,
    sqft: listing.sqft,
    matchPercent: 85,
    demand: listing.demand || (listing.competition_score > 70 ? "High" : listing.competition_score > 40 ? "Medium" : "Low"),
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

  // In-memory filter by chip and search
  const filteredByChip = listings.filter((l) => {
    if (activeFilter === "Saved Listings") {
      if (!savedIds.has(l.id)) return false;
    }
    if (activeFilter === "Applied Listings") {
      if (!appliedIds.has(l.id)) return false;
    }
    if (activeFilter === "Pet Friendly") {
      const ok = l.pet_policy?.cats || l.pet_policy?.dogs;
      if (!ok) return false;
    }
    return true;
  });

  const sortedListings = [...filteredByChip].sort((a, b) => {
    if (activeFilter === "Best Match") return b.competition_score - a.competition_score;
    if (activeFilter === "Lowest Price") return a.price - b.price;
    if (activeFilter === "Newest") return (b.updated_at ?? "").localeCompare(a.updated_at ?? "");
    return 0;
  });

  const filteredListings = sortedListings.filter(
    (l) =>
      !searchQuery ||
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.city ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#3B82F6] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="border-b border-border px-6 lg:px-10 py-5 lg:py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-foreground text-[24px] lg:text-[28px] mb-4" style={{ fontWeight: 700 }}>
            Listings
          </h1>

          {/* Search Row */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative max-w-xl">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search city, neighborhood, address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-2.5 text-foreground text-[14px] placeholder:text-muted-foreground focus:outline-none focus:border-[#10B981]/40 transition-colors"
              />
            </div>
            <button className="w-11 h-11 bg-card border border-border rounded-xl flex items-center justify-center hover:bg-muted transition-colors">
              <SlidersHorizontal size={16} className="text-muted-foreground" />
            </button>
            <div className="hidden sm:flex bg-card border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`w-10 h-10 flex items-center justify-center transition-colors ${
                  viewMode === "grid" ? "bg-[#10B981]/15 text-[#10B981]" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Grid2x2 size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`w-10 h-10 flex items-center justify-center transition-colors ${
                  viewMode === "list" ? "bg-[#10B981]/15 text-[#10B981]" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutList size={16} />
              </button>
            </div>
          </div>

          {/* Location + Filters */}
          <div className="flex items-center gap-1.5 mb-4">
            <MapPin size={13} className="text-[#10B981]" />
            <span className="text-muted-foreground text-[13px]">
              Searching within 25mi of {profile?.preferred_cities?.[0] || "your area"}
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-[13px] whitespace-nowrap transition-all ${
                  activeFilter === f
                    ? "bg-[#10B981] text-white"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
                style={{ fontWeight: 500 }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="px-6 lg:px-10 py-6 max-w-7xl mx-auto">
        <p className="text-muted-foreground text-[13px] mb-4">
          {filteredListings.length} listings found
        </p>

        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              : "flex flex-col gap-4 max-w-3xl"
          }
        >
          {filteredListings.map((listing, i) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
            >
              <ListingCard
                listing={formatListing(listing)}
                isSaved={savedIds.has(listing.id)}
                onToggleSave={toggleSave}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}