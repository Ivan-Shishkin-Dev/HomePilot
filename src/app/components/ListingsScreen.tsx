import { useState } from "react";
import { Search, SlidersHorizontal, MapPin, Grid2x2, LayoutList } from "lucide-react";
import { ListingCard } from "./ListingCard";
import { listings } from "./data";
import { motion } from "motion/react";

const filters = ["All", "Best Match", "Lowest Price", "Newest", "Pet Friendly", "Near Transit"];

export function ListingsScreen() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const sortedListings = [...listings].sort((a, b) => {
    if (activeFilter === "Best Match") return b.matchPercent - a.matchPercent;
    if (activeFilter === "Lowest Price") return a.price - b.price;
    return 0;
  });

  const filteredListings = sortedListings.filter(
    (l) =>
      !searchQuery ||
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-2.5 text-foreground text-[14px] placeholder:text-muted-foreground focus:outline-none focus:border-[#3B82F6]/40 transition-colors"
              />
            </div>
            <button className="w-11 h-11 bg-card border border-border rounded-xl flex items-center justify-center hover:bg-muted transition-colors">
              <SlidersHorizontal size={16} className="text-muted-foreground" />
            </button>
            <div className="hidden sm:flex bg-card border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`w-10 h-10 flex items-center justify-center transition-colors ${
                  viewMode === "grid" ? "bg-[#3B82F6]/15 text-[#3B82F6]" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Grid2x2 size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`w-10 h-10 flex items-center justify-center transition-colors ${
                  viewMode === "list" ? "bg-[#3B82F6]/15 text-[#3B82F6]" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutList size={16} />
              </button>
            </div>
          </div>

          {/* Location + Filters */}
          <div className="flex items-center gap-1.5 mb-4">
            <MapPin size={13} className="text-[#3B82F6]" />
            <span className="text-muted-foreground text-[13px]">
              Searching within 25mi of New York, NY
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
              <ListingCard listing={listing} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
