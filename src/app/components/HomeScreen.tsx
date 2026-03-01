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
  getAtlasDisplayList,
  getAverageMatchPercent,
  getLastSearchParams,
  removeFirstFromQueue,
  ATLAS_INTRO_SEEN_KEY,
  MATCH_GREEN_MIN,
  MATCH_YELLOW_MIN,
  type LastTopMatchSnapshot,
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
  const atlasDisplayList = typeof window !== "undefined" ? getAtlasDisplayList() : [];
  const averageMatchPercent = typeof window !== "undefined" ? getAverageMatchPercent() : null;
  const hasSearched = !!lastSearchParams;

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

  /** Build listing shape for ListingCard from Atlas snapshot (and optional full listing from sessionStorage). */
  const snapshotToListing = (snap: LastTopMatchSnapshot): Parameters<typeof ListingCard>[0]["listing"] => {
    try {
      const raw = sessionStorage.getItem("zillow_listings");
      if (raw) {
        const arr: Array<{ id: string; title?: string; address?: string; city?: string; price?: number; beds?: number; baths?: number; image?: string; time_left?: string; demand?: string; competition_score?: number; crime_index?: number; rent_trend?: string; neighborhood_risk?: string; scam_score?: number; ai_suggestion?: string; features?: string[]; listing_url?: string; source?: string }> = JSON.parse(raw);
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
            demand: full.demand ?? (full.competition_score != null && full.competition_score > 70 ? "High" : "Low"),
            image: full.image ?? snap.image,
            timeLeft: full.time_left ?? snap.timeLeft,
            crimeIndex: full.crime_index,
            rentTrend: full.rent_trend ?? "",
            neighborhoodRisk: full.neighborhood_risk ?? "Low",
            scamScore: full.scam_score,
            aiSuggestion: full.ai_suggestion ?? "",
            competitionScore: full.competition_score,
            features: full.features ?? [],
            listingUrl: full.listing_url,
            source: full.source,
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
      crimeIndex: undefined,
      rentTrend: "",
      neighborhoodRisk: "Low",
      scamScore: undefined,
      aiSuggestion: "",
      competitionScore: undefined,
      features: [],
      listingUrl: undefined,
      source: undefined,
    };
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
            Welcome, {getUserFirstName()}
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

          {/* Atlas' Alerts — unified card with glass-style CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="rounded-2xl p-5 lg:p-6 border border-[#10B981]/20 relative overflow-hidden h-full bg-white/5 dark:bg-white/[0.03] backdrop-blur-sm">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#10B981]/10 rounded-full blur-3xl" />
              <div className="relative flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-[#10B981]/20 flex items-center justify-center shrink-0">
                    <Zap size={20} className="text-[#10B981]" />
                  </div>
                  <h3 className="text-foreground text-[18px]" style={{ fontWeight: 700 }}>Atlas&apos; Alerts</h3>
                </div>

                {!hasSearched ? (
                  <>
                    <p className="text-muted-foreground text-[15px]">
                      Our AI, Atlas, is ready to hunt the best match for you. Run a search to see your top matches.
                    </p>
                    <button
                      onClick={handleSearchListings}
                      className="inline-flex items-center gap-2 self-start px-5 py-2.5 rounded-full text-[14px] font-medium bg-white/15 dark:bg-white/10 backdrop-blur-sm border border-white/20 dark:border-white/10 text-foreground hover:bg-white/25 dark:hover:bg-white/15 transition-colors"
                      style={{ fontWeight: 600 }}
                    >
                      Search listings
                    </button>
                  </>
                ) : showAlert && currentMatch ? (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[12px] ${getMatchBadgeColor(currentMatch.matchPercent)}`} style={{ fontWeight: 700 }}>
                        {currentMatch.matchPercent}% MATCH
                      </span>
                      <span className="w-1.5 h-1.5 bg-[#EF4444] rounded-full animate-pulse" />
                    </div>
                    <p className="text-foreground text-[16px] lg:text-[18px]" style={{ fontWeight: 600 }}>
                      {currentMatch.title} — ${currentMatch.price.toLocaleString()}/mo
                    </p>
                    {currentMatch.timeLeft && (
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-[#F59E0B]" />
                        <span className="text-[#F59E0B] text-[13px]" style={{ fontWeight: 500 }}>{currentMatch.timeLeft}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => navigate(`/listing/${currentMatch.id}`)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-medium bg-white/15 dark:bg-white/10 backdrop-blur-sm border border-white/20 dark:border-white/10 text-foreground hover:bg-white/25 dark:hover:bg-white/15 transition-colors"
                        style={{ fontWeight: 600 }}
                      >
                        View Listing
                      </button>
                      <button
                        onClick={handleDismiss}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-medium bg-white/10 dark:bg-white/5 border border-border text-muted-foreground hover:bg-white/15 transition-colors"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={handleDismiss}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                        aria-label="Dismiss"
                      >
                        &times;
                      </button>
                    </div>
                  </>
                ) : showAlert && atlasDisplayList.length > 0 ? (
                  <>
                    <p className="text-muted-foreground text-[14px]">
                      {queue.length > 0 ? "Your next-in-line matches from your last search." : "Top matches from your last search."}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {atlasDisplayList.slice(0, 5).map((snap) => (
                        <button
                          key={snap.id}
                          onClick={() => navigate(`/listing/${snap.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] bg-white/10 dark:bg-white/5 border border-white/10 text-foreground hover:bg-white/15 transition-colors"
                        >
                          <span className={getMatchBadgeColor(snap.matchPercent)} style={{ fontWeight: 700 }}>{snap.matchPercent}%</span>
                          <span className="truncate max-w-[120px]">{snap.title}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleViewLatestSearch}
                      className="inline-flex items-center gap-2 self-start px-5 py-2.5 rounded-full text-[14px] font-medium bg-white/15 dark:bg-white/10 backdrop-blur-sm border border-white/20 dark:border-white/10 text-foreground hover:bg-white/25 dark:hover:bg-white/15 transition-colors"
                      style={{ fontWeight: 600 }}
                    >
                      View latest search results
                    </button>
                  </>
                ) : showAlert && lastSearchParams ? (
                  <>
                    <p className="text-muted-foreground text-[14px]">No more high matches from your last search.</p>
                    <button
                      onClick={handleViewLatestSearch}
                      className="inline-flex items-center gap-2 self-start px-5 py-2.5 rounded-full text-[14px] font-medium bg-white/15 dark:bg-white/10 backdrop-blur-sm border border-white/20 dark:border-white/10 text-foreground hover:bg-white/25 dark:hover:bg-white/15 transition-colors"
                      style={{ fontWeight: 600 }}
                    >
                      View latest search results
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground text-[14px]">Run a search to see your top matches.</p>
                    <button
                      onClick={lastSearchParams ? handleViewLatestSearch : handleSearchListings}
                      className="inline-flex items-center gap-2 self-start px-5 py-2.5 rounded-full text-[14px] font-medium bg-white/15 dark:bg-white/10 backdrop-blur-sm border border-white/20 dark:border-white/10 text-foreground hover:bg-white/25 dark:hover:bg-white/15 transition-colors"
                      style={{ fontWeight: 600 }}
                    >
                      {lastSearchParams ? "View latest search results" : "Search listings"}
                    </button>
                  </>
                )}
              </div>
            </div>
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
            {
              label: "Avg Match",
              value: hasSearched && averageMatchPercent != null ? `${averageMatchPercent}%` : "—",
              icon: Zap,
              color: "#10B981",
              change: hasSearched ? "Avg of recent search" : "Search to view the average match percent",
              onClick: hasSearched ? undefined : () => navigate("/listings"),
            },
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

        {/* Top Matches */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-foreground text-[20px]" style={{ fontWeight: 700 }}>
            Top Matches
          </h2>
          {hasSearched && atlasDisplayList.length > 0 && (
            <button
              onClick={handleViewLatestSearch}
              className="text-[#10B981] text-[14px] hover:underline"
              style={{ fontWeight: 500 }}
            >
              View All
            </button>
          )}
          {!hasSearched && (
            <button
              onClick={() => navigate("/listings")}
              className="text-[#10B981] text-[14px] hover:underline"
              style={{ fontWeight: 500 }}
            >
              Search
            </button>
          )}
        </div>

        {!hasSearched && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border p-8 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Sparkles size={24} className="text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-[15px] mb-4">
              Make a search to view your top matches.
            </p>
            <button
              onClick={() => navigate("/listings")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-medium bg-white/15 dark:bg-white/10 backdrop-blur-sm border border-white/20 dark:border-white/10 text-foreground hover:bg-white/25 dark:hover:bg-white/15 transition-colors"
            >
              Search listings
            </button>
          </motion.div>
        )}

        {hasSearched && atlasDisplayList.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {atlasDisplayList.slice(0, 3).map((snap, i) => (
              <motion.div
                key={snap.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
              >
                <ListingCard
                  listing={snapshotToListing(snap)}
                  isSaved={savedIds.has(snap.id)}
                  onToggleSave={toggleSave}
                />
              </motion.div>
            ))}
          </div>
        )}

        {hasSearched && atlasDisplayList.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border p-8 text-center"
          >
            <p className="text-muted-foreground text-[15px] mb-4">No matches from your last search.</p>
            <button
              onClick={handleViewLatestSearch}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-medium bg-white/15 dark:bg-white/10 backdrop-blur-sm border border-white/20 dark:border-white/10 text-foreground hover:bg-white/25 dark:hover:bg-white/15 transition-colors"
            >
              View latest search results
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}