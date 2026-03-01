import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { Sparkles, TrendingUp, Clock, ChevronRight, Zap, ArrowUpRight, Loader2 } from "lucide-react";
import { ScoreRing } from "./ScoreRing";
import { ListingCard } from "./ListingCard";
import { useSavedListings } from "../../hooks/useSupabaseData";
import { useZillowListings } from "../../hooks/useZillowListings";
import { useAppliedListings } from "../../contexts/AppliedListingsContext";
import { useAuth } from "../../contexts/AuthContext";
import { motion } from "motion/react";
import {
  getTopMatchesQueue,
  getLastSearchParams,
  removeFirstFromQueue,
  ATLAS_INTRO_SEEN_KEY,
  MATCH_GREEN_MIN,
  MATCH_YELLOW_MIN,
} from "../lib/priorityMatch";

function getMatchBadgeColor(pct: number): string {
  if (pct >= MATCH_GREEN_MIN) return "text-[#10B981]";
  if (pct >= MATCH_YELLOW_MIN) return "text-[#F59E0B]";
  return "text-[#EF4444]";
}

export function HomeScreen() {
  const navigate = useNavigate();
  const [showAlert, setShowAlert] = useState(true);
  const [queue, setQueue] = useState<ReturnType<typeof getTopMatchesQueue>>([]);
  const isFirstTime = typeof window !== "undefined" && !localStorage.getItem(ATLAS_INTRO_SEEN_KEY);
  const { savedIds, savedCount, toggleSave } = useSavedListings();

  // Sync queue from localStorage on mount and when returning to this page
  useEffect(() => {
    if (typeof window !== "undefined") {
      setQueue(getTopMatchesQueue());
    }
  }, []);

  const currentMatch = queue.length > 0 ? queue[0] : null;
  const lastSearchParams = typeof window !== "undefined" ? getLastSearchParams() : null;

  const handleDismiss = () => {
    removeFirstFromQueue();
    setQueue(getTopMatchesQueue());
  };

  const handleViewLatestSearch = () => {
    const params = getLastSearchParams();
    navigate(params ? `/listings/results?${params}` : "/listings/results");
  };
  const { appliedCount } = useAppliedListings();
  const { profile } = useAuth();

  const handleSearchListings = () => {
    try {
      localStorage.setItem(ATLAS_INTRO_SEEN_KEY, "1");
    } catch {}
    navigate("/listings");
  };

  // Load "Top Matches" from the user's preferred cities, or a sensible default
  const defaultCity = useMemo(() => {
    const cities = profile?.preferred_cities;
    return cities?.length ? cities[0] : "Irvine";
  }, [profile?.preferred_cities]);

  const { listings, loading } = useZillowListings({ city: defaultCity, state: "ca" });

  // Persist listings to sessionStorage so detail pages can find them
  useEffect(() => {
    if (listings.length > 0) {
      try {
        const existing = sessionStorage.getItem("zillow_listings");
        const prev: unknown[] = existing ? JSON.parse(existing) : [];
        const merged = [...prev, ...listings];
        const unique = Array.from(new Map(merged.map((l: any) => [l.id, l])).values());
        sessionStorage.setItem("zillow_listings", JSON.stringify(unique.slice(-200)));
      } catch { /* quota exceeded */ }
    }
  }, [listings]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getUserFirstName = () => {
    if (!profile) return "there";
    return profile.first_name || "there";
  };

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
    matchPercent: 85, // Default match percent
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

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="border-b border-white/[0.06] px-6 lg:px-10 py-5 lg:py-6">
        <div className="max-w-7xl mx-auto">
          <span className="text-[#8B95A5] text-[13px]">{getGreeting()}</span>
          <h1 className="text-white text-[24px] lg:text-[28px]" style={{ fontWeight: 700, lineHeight: 1.2 }}>
            Welcome back, {getUserFirstName()}
          </h1>
        </div>
      </div>

      <div className="px-6 lg:px-10 py-6 lg:py-8 max-w-7xl mx-auto">
        {/* Top Grid: Score + Alert + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
          {/* Score Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-card rounded-2xl p-6 border border-border"
          >
            <div className="flex items-center gap-6">
              <ScoreRing score={profile?.renter_score || 0} size={110} strokeWidth={7} />
              <div className="flex-1">
                <p className="text-foreground text-[14px] mb-1" style={{ fontWeight: 600 }}>
                  Renter Score
                </p>
                <p className="text-muted-foreground text-[13px] mb-3">
                  Rates how strong your application looks to landlords based on your profile, documents, and rental history.
                </p>
                <button
                  onClick={() => navigate("/optimize")}
                  className="flex items-center gap-1 text-[#10B981] text-[13px] hover:underline"
                  style={{ fontWeight: 600 }}
                >
                  Boost Score
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </motion.div>

          {/* AI Alert Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2"
          >
            {isFirstTime ? (
              <div className="bg-gradient-to-r from-[#10B981]/15 to-[#10B981]/10 rounded-2xl p-5 lg:p-6 border border-[#10B981]/20 relative overflow-hidden h-full">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#10B981]/10 rounded-full blur-3xl" />
                <div className="flex items-start gap-4 relative">
                  <div className="w-11 h-11 rounded-xl bg-[#10B981]/20 flex items-center justify-center shrink-0">
                    <Zap size={22} className="text-[#10B981]" />
                  </div>
                  <div className="flex-1">
                    <span className="text-muted-foreground text-[12px] block mb-1">Atlas</span>
                    <p className="text-foreground text-[16px] lg:text-[18px] mb-3" style={{ fontWeight: 600 }}>
                      Our AI, Atlas, is ready to hunt the best match for you based on your searches.
                    </p>
                    <button
                      onClick={handleSearchListings}
                      className="bg-[#10B981] text-white px-6 py-2.5 rounded-xl text-[14px] hover:bg-[#059669] transition-colors"
                      style={{ fontWeight: 600 }}
                    >
                      Search listings
                    </button>
                  </div>
                </div>
              </div>
            ) : showAlert && currentMatch ? (
              <div className="bg-gradient-to-r from-[#10B981]/15 to-[#10B981]/10 rounded-2xl p-5 lg:p-6 border border-[#10B981]/20 relative overflow-hidden h-full">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#10B981]/10 rounded-full blur-3xl" />
                <div className="flex items-start gap-4 relative">
                  <div className="w-11 h-11 rounded-xl bg-[#10B981]/20 flex items-center justify-center shrink-0">
                    <Zap size={22} className="text-[#10B981]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[12px] ${getMatchBadgeColor(currentMatch.matchPercent)}`} style={{ fontWeight: 700 }}>
                        HIGH MATCH ({currentMatch.matchPercent}%)
                      </span>
                      <span className="w-1.5 h-1.5 bg-[#EF4444] rounded-full animate-pulse" />
                      <span className="text-muted-foreground text-[12px] ml-auto hidden sm:block">
                        AI Copilot Alert
                      </span>
                    </div>
                    <p className="text-foreground text-[16px] lg:text-[18px] mb-1" style={{ fontWeight: 600 }}>
                      {currentMatch.title} — ${currentMatch.price.toLocaleString()}/mo
                    </p>
                    {currentMatch.timeLeft && (
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-[#F59E0B]" />
                          <span className="text-[#F59E0B] text-[13px]" style={{ fontWeight: 500 }}>
                            {currentMatch.timeLeft}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button
                        onClick={() => navigate(`/listing/${currentMatch.id}`)}
                        className="bg-[#10B981] text-white px-6 py-2.5 rounded-xl text-[14px] hover:bg-[#059669] transition-colors"
                        style={{ fontWeight: 600 }}
                      >
                        View Listing
                      </button>
                      <button
                        onClick={handleDismiss}
                        className="px-5 bg-muted text-muted-foreground py-2.5 rounded-xl text-[14px] hover:bg-accent transition-colors"
                        style={{ fontWeight: 500 }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={handleDismiss}
                    className="text-muted-foreground text-[20px] leading-none hover:text-foreground transition-colors"
                  >
                    &times;
                  </button>
                </div>
              </div>
            ) : showAlert && queue.length === 0 && lastSearchParams ? (
              <div className="bg-card rounded-2xl p-6 border border-border h-full flex items-center justify-center">
                <div className="text-center">
                  <Sparkles size={24} className="text-[#10B981] mx-auto mb-2" />
                  <p className="text-muted-foreground text-[14px] mb-3">
                    No more high matches from your last search.
                  </p>
                  <button
                    onClick={handleViewLatestSearch}
                    className="bg-[#10B981] text-white px-6 py-2.5 rounded-xl text-[14px] hover:bg-[#059669] transition-colors font-medium"
                  >
                    View latest search results
                  </button>
                </div>
              </div>
            ) : showAlert && queue.length === 0 ? (
              <div className="bg-gradient-to-r from-[#10B981]/15 to-[#10B981]/10 rounded-2xl p-5 lg:p-6 border border-[#10B981]/20 relative overflow-hidden h-full">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#10B981]/10 rounded-full blur-3xl" />
                <div className="flex items-start gap-4 relative">
                  <div className="w-11 h-11 rounded-xl bg-[#10B981]/20 flex items-center justify-center shrink-0">
                    <Zap size={22} className="text-[#10B981]" />
                  </div>
                  <div className="flex-1">
                    <span className="text-muted-foreground text-[12px] block mb-1">Atlas</span>
                    <p className="text-foreground text-[16px] lg:text-[18px] mb-3" style={{ fontWeight: 600 }}>
                      Our AI, Atlas, is ready to hunt the best match for you based on your searches.
                    </p>
                    <button
                      onClick={handleSearchListings}
                      className="bg-[#10B981] text-white px-6 py-2.5 rounded-xl text-[14px] hover:bg-[#059669] transition-colors"
                      style={{ fontWeight: 600 }}
                    >
                      Search listings
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-2xl p-6 border border-border h-full flex items-center justify-center">
                <div className="text-center">
                  <Sparkles size={24} className="text-[#10B981] mx-auto mb-2" />
                  <p className="text-muted-foreground text-[14px]">AI is hunting for your next match...</p>
                  <button
                    onClick={lastSearchParams ? handleViewLatestSearch : handleSearchListings}
                    className="mt-3 text-[#10B981] text-[13px] hover:underline font-medium"
                  >
                    {lastSearchParams ? "View latest search results" : "Search listings"}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8"
        >
          {[
            {
              label: "Applications",
              value: String(appliedCount),
              icon: TrendingUp,
              color: "#10B981",
              change: appliedCount > 0 ? "View applied" : "Track applications",
              onClick: () => navigate("/listings?filter=applied"),
            },
            { label: "Avg Match", value: "79%", icon: Zap, color: "#10B981", change: "", onClick: undefined },
            {
              label: "Saved Listings",
              value: String(savedCount),
              icon: ArrowUpRight,
              color: "#10B981",
              change: savedCount > 0 ? "View saved" : "Save listings",
              onClick: () => navigate("/listings?filter=saved"),
            },
          ].map((stat) => (
            <div
              key={stat.label}
              onClick={stat.onClick}
              className={`bg-card rounded-xl p-4 lg:p-5 border border-border hover:border-muted transition-colors ${
                stat.onClick ? "cursor-pointer" : "cursor-default"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <stat.icon size={18} style={{ color: stat.color }} />
                <span className="text-muted-foreground text-[11px]">{stat.change}</span>
              </div>
              <p className="text-foreground text-[24px] lg:text-[28px]" style={{ fontWeight: 700, lineHeight: 1 }}>
                {stat.value}
              </p>
              <p className="text-muted-foreground text-[12px] mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Listings Feed */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-foreground text-[20px]" style={{ fontWeight: 700 }}>
            Top Matches
          </h2>
          <button
            onClick={() => navigate("/listings")}
            className="text-[#10B981] text-[14px] hover:underline"
            style={{ fontWeight: 500 }}
          >
            View All
          </button>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden animate-pulse">
                <div className="h-44 bg-muted" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-6 bg-muted rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && listings.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {listings.slice(0, 3).map((listing, i) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
              >
                <ListingCard
                  listing={formatListing(listing)}
                  isSaved={savedIds.has(listing.id)}
                  onToggleSave={toggleSave}
                />
              </motion.div>
            ))}
          </div>
        )}

        {!loading && listings.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border p-8 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Sparkles size={24} className="text-muted-foreground" />
            </div>
            <h3 className="text-foreground font-semibold mb-1">No listings available yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
              We're having trouble loading rental listings right now. Search directly to find rentals in any city.
            </p>
            <button
              onClick={() => navigate("/listings")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#10B981] text-white text-sm font-medium hover:bg-[#0d9668] transition-colors"
            >
              <ArrowUpRight size={15} />
              Search Rentals
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}