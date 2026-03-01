import { useState } from "react";
import { useNavigate } from "react-router";
import { Sparkles, Search } from "lucide-react";
import { ListingCard } from "./ListingCard";
import { useSavedListings } from "../../hooks/useSupabaseData";
import {
  getAtlasDisplayList,
  getLastSearchParams,
  type LastTopMatchSnapshot,
} from "../lib/priorityMatch";
import { motion } from "motion/react";

/** Build listing shape for ListingCard from Atlas snapshot (and optional full listing from sessionStorage). */
function snapshotToListing(
  snap: LastTopMatchSnapshot
): Parameters<typeof ListingCard>[0]["listing"] {
  try {
    const raw = sessionStorage.getItem("zillow_listings");
    if (raw) {
      const arr: Array<{
        id: string;
        title?: string;
        address?: string;
        city?: string;
        price?: number;
        beds?: number;
        baths?: number;
        image?: string;
        time_left?: string;
        demand?: string;
        competition_score?: number;
      }> = JSON.parse(raw);
      const full = arr.find((l) => l.id === snap.id);
      if (full) {
        return {
          id: full.id,
          title: full.title ?? snap.title,
          address: full.address ?? snap.address,
          city: full.city ?? snap.city,
          price: full.price ?? snap.price,
          beds: full.beds ?? 0,
          baths: full.baths ?? 0,
          matchPercent: snap.matchPercent,
          demand:
            full.demand ??
            (full.competition_score != null && full.competition_score > 70 ? "High" : "Low"),
          image: full.image ?? snap.image,
          timeLeft: full.time_left ?? snap.timeLeft,
          features: [],
        };
      }
    }
  } catch {}
  return {
    id: snap.id,
    title: snap.title,
    address: snap.address,
    city: snap.city,
    price: snap.price,
    beds: 0,
    baths: 0,
    matchPercent: snap.matchPercent,
    demand: "—",
    image: snap.image,
    timeLeft: snap.timeLeft,
    features: [],
  };
}

export function AlertScreen() {
  const navigate = useNavigate();
  const { savedIds, toggleSave } = useSavedListings();

  const [displayList] = useState<LastTopMatchSnapshot[]>(() => getAtlasDisplayList());
  const [lastSearchParams] = useState<string | null>(() => getLastSearchParams());

  const handleViewLatestSearch = () => {
    const params = getLastSearchParams();
    navigate(params ? `/listings/results?${params}` : "/listings/results");
  };

  const handleStartSearching = () => {
    navigate("/listings");
  };

  const hasSearched = !!lastSearchParams;
  const isEmpty = displayList.length === 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="border-b border-border px-6 lg:px-10 py-5 lg:py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-foreground text-[24px] lg:text-[28px]" style={{ fontWeight: 700 }}>
            Top Matches
          </h1>
          <p className="text-muted-foreground text-[14px] mt-1">
            {hasSearched
              ? "Your best matches based on your last search"
              : "Search to see your top matches for listings that fit your preferences"}
          </p>
        </div>
      </div>

      <div className="px-6 lg:px-10 py-6 lg:py-8 max-w-7xl mx-auto">
        {isEmpty ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border p-8 lg:p-12 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
              <Sparkles size={24} className="text-muted-foreground" />
            </div>
            <h2 className="text-foreground text-[18px] mb-2" style={{ fontWeight: 600 }}>
              Search to see your matches
            </h2>
            <p className="text-muted-foreground text-[15px] mb-6 max-w-md mx-auto">
              Run a search with your preferences to see your top matches here. We&apos;ll show
              listings that match 75% or above, or your top 5 picks if none hit that threshold.
            </p>
            <button
              onClick={handleStartSearching}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-medium bg-[#10B981] text-white hover:bg-[#059669] transition-colors"
              style={{ fontWeight: 600 }}
            >
              <Search size={18} />
              Start searching
            </button>
          </motion.div>
        ) : (
          <>
            {/* Section header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-foreground text-[18px] lg:text-[20px]" style={{ fontWeight: 700 }}>
                From your last search
              </h2>
              {hasSearched && (
                <button
                  onClick={handleViewLatestSearch}
                  className="text-[#10B981] text-[14px] hover:underline"
                  style={{ fontWeight: 500 }}
                >
                  View all results
                </button>
              )}
            </div>

            {/* Listing cards grid - same layout as ListingsResultsScreen */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
              {displayList.map((snap, i) => (
                <motion.div
                  key={snap.id}
                  className="h-full min-h-0"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                >
                  <ListingCard
                    listing={snapshotToListing(snap)}
                    isSaved={savedIds.has(snap.id)}
                    onToggleSave={toggleSave}
                    className="h-full"
                  />
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
