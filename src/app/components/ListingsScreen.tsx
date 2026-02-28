import { useState } from "react";
import { Search, SlidersHorizontal, MapPin, Grid2x2, LayoutList, Loader2 } from "lucide-react";
import { ListingCard } from "./ListingCard";
import { useListings } from "../../hooks/useSupabaseData";
import { useAuth } from "../../contexts/AuthContext";
import { motion } from "motion/react";

const filters = ["All", "Best Match", "Lowest Price", "Newest", "Pet Friendly", "Near Transit"];

export function ListingsScreen() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { listings, loading } = useListings();
  const { profile } = useAuth();

  // Convert listing format for ListingCard
  const formatListing = (listing: typeof listings[0]) => ({
    id: listing.id,
    title: listing.title,
    address: listing.address,
    city: "",
    price: listing.price,
    beds: listing.bedrooms,
    baths: listing.bathrooms,
    sqft: listing.sqft,
    matchPercent: listing.match_score,
    demand: listing.competition_level > 70 ? "High" : listing.competition_level > 40 ? "Medium" : "Low",
    image: listing.image_url,
    crimeIndex: 0,
    rentTrend: "",
    neighborhoodRisk: "Low",
    scamScore: 0,
    timeLeft: "",
    aiSuggestion: listing.ai_reasons?.[0] || "",
    competitionScore: listing.competition_level,
    features: listing.amenities || [],
  });

  const sortedListings = [...listings].sort((a, b) => {
    if (activeFilter === "Best Match") return b.match_score - a.match_score;
    if (activeFilter === "Lowest Price") return a.price - b.price;
    return 0;
  });

  const filteredListings = sortedListings.filter(
    (l) =>
      !searchQuery ||
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#3B82F6] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E]">
      {/* Page Header */}
      <div className="border-b border-white/[0.06] px-6 lg:px-10 py-5 lg:py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-white text-[24px] lg:text-[28px] mb-4" style={{ fontWeight: 700 }}>
            Listings
          </h1>

          {/* Search Row */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative max-w-xl">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]"
              />
              <input
                type="text"
                placeholder="Search city, neighborhood, address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#111827] border border-white/[0.06] rounded-xl pl-11 pr-4 py-2.5 text-white text-[14px] placeholder:text-[#4B5563] focus:outline-none focus:border-[#3B82F6]/40 transition-colors"
              />
            </div>
            <button className="w-11 h-11 bg-[#111827] border border-white/[0.06] rounded-xl flex items-center justify-center hover:bg-white/[0.06] transition-colors">
              <SlidersHorizontal size={16} className="text-[#8B95A5]" />
            </button>
            <div className="hidden sm:flex bg-[#111827] border border-white/[0.06] rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`w-10 h-10 flex items-center justify-center transition-colors ${
                  viewMode === "grid" ? "bg-[#3B82F6]/15 text-[#3B82F6]" : "text-[#6B7280] hover:text-white"
                }`}
              >
                <Grid2x2 size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`w-10 h-10 flex items-center justify-center transition-colors ${
                  viewMode === "list" ? "bg-[#3B82F6]/15 text-[#3B82F6]" : "text-[#6B7280] hover:text-white"
                }`}
              >
                <LayoutList size={16} />
              </button>
            </div>
          </div>

          {/* Location + Filters */}
          <div className="flex items-center gap-1.5 mb-4">
            <MapPin size={13} className="text-[#3B82F6]" />
            <span className="text-[#8B95A5] text-[13px]">
              Searching within 25mi of {profile?.search_city || "your area"}
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-[13px] whitespace-nowrap transition-all ${
                  activeFilter === f
                    ? "bg-[#3B82F6] text-white"
                    : "bg-white/[0.05] text-[#8B95A5] hover:bg-white/[0.08]"
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
        <p className="text-[#6B7280] text-[13px] mb-4">
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
              <ListingCard listing={formatListing(listing)} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
