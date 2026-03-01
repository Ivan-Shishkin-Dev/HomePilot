import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Bell,
  Sparkles,
  TrendingUp,
  Clock,
  ChevronRight,
  Zap,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { ScoreRing } from "./ScoreRing";
import { ListingCard } from "./ListingCard";
import { useListings } from "../../hooks/useSupabaseData";
import { useAuth } from "../../contexts/AuthContext";
import { motion } from "motion/react";

export function HomeScreen() {
  const navigate = useNavigate();
  const [showAlert, setShowAlert] = useState(true);
  const { listings, loading } = useListings();
  const { profile } = useAuth();

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
  const formatListing = (listing: (typeof listings)[0]) => ({
    id: listing.id,
    title: listing.title,
    address: listing.address,
    city: listing.city || "",
    price: listing.price,
    beds: listing.beds,
    baths: listing.baths,
    sqft: listing.sqft,
    matchPercent: 85, // Default match percent
    demand:
      listing.demand ||
      (listing.competition_score > 70
        ? "High"
        : listing.competition_score > 40
          ? "Medium"
          : "Low"),
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
      <div className="border-b border-white/[0.06] px-6 lg:px-10 py-5 lg:py-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <span className="text-[#8B95A5] text-[13px]">{getGreeting()}</span>
            <h1
              className="text-foreground text-[24px] lg:text-[28px]"
              style={{ fontWeight: 700, lineHeight: 1.2 }}
            >
              Welcome back, {getUserFirstName()}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/alert")}
              className="relative w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors"
            >
              <Bell size={18} className="text-[#8B95A5]" />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#EF4444] rounded-full border-2 border-background" />
            </button>
          </div>
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
              <ScoreRing
                score={profile?.renter_score || 0}
                size={110}
                strokeWidth={7}
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp size={14} className="text-[#10B981]" />
                  <span
                    className="text-[#10B981] text-[13px]"
                    style={{ fontWeight: 600 }}
                  >
                    +12 pts this week
                  </span>
                </div>
                <p className="text-muted-foreground text-[13px] mb-3">
                  Top 15% of renters in your area. Your score unlocks priority
                  applications.
                </p>
                <button
                  onClick={() => navigate("/profile")}
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
            {showAlert ? (
              <div className="bg-gradient-to-r from-[#10B981]/15 to-[#10B981]/10 rounded-2xl p-5 lg:p-6 border border-[#10B981]/20 relative overflow-hidden h-full">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#10B981]/10 rounded-full blur-3xl" />
                <div className="flex items-start gap-4 relative">
                  <div className="w-11 h-11 rounded-xl bg-[#10B981]/20 flex items-center justify-center shrink-0">
                    <Zap size={22} className="text-[#10B981]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="text-[#F59E0B] text-[12px]"
                        style={{ fontWeight: 700 }}
                      >
                        HIGH MATCH (82%)
                      </span>
                      <span className="w-1.5 h-1.5 bg-[#EF4444] rounded-full animate-pulse" />
                      <span className="text-muted-foreground text-[12px] ml-auto hidden sm:block">
                        AI Copilot Alert
                      </span>
                    </div>
                    <p
                      className="text-foreground text-[16px] lg:text-[18px] mb-1"
                      style={{ fontWeight: 600 }}
                    >
                      Sunny 2BR Near Campus — $1,450/mo
                    </p>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-[#F59E0B]" />
                        <span
                          className="text-[#F59E0B] text-[13px]"
                          style={{ fontWeight: 500 }}
                        >
                          Apply within 2 hours
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => navigate("/listing/2")}
                        className="bg-[#10B981] text-white px-6 py-2.5 rounded-xl text-[14px] hover:bg-[#059669] transition-colors"
                        style={{ fontWeight: 600 }}
                      >
                        View Listing
                      </button>
                      <button
                        onClick={() => setShowAlert(false)}
                        className="px-5 bg-muted text-muted-foreground py-2.5 rounded-xl text-[14px] hover:bg-accent transition-colors"
                        style={{ fontWeight: 500 }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAlert(false)}
                    className="text-muted-foreground text-[20px] leading-none hover:text-foreground transition-colors"
                  >
                    &times;
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-2xl p-6 border border-border h-full flex items-center justify-center">
                <div className="text-center">
                  <Sparkles size={24} className="text-[#10B981] mx-auto mb-2" />
                  <p className="text-muted-foreground text-[14px]">
                    AI is hunting for your next match...
                  </p>
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
              value: "3",
              icon: TrendingUp,
              color: "#10B981",
              change: "1 pending",
            },
            {
              label: "Avg Match",
              value: "79%",
              icon: Zap,
              color: "#10B981",
              change: "+5% this week",
            },
            {
              label: "Saved Listings",
              value: "8",
              icon: ArrowUpRight,
              color: "#10B981",
              change: "2 expiring",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-card rounded-xl p-4 lg:p-5 border border-border hover:border-muted transition-colors cursor-default"
            >
              <div className="flex items-center justify-between mb-3">
                <stat.icon size={18} style={{ color: stat.color }} />
                <span className="text-muted-foreground text-[11px]">
                  {stat.change}
                </span>
              </div>
              <p
                className="text-foreground text-[24px] lg:text-[28px]"
                style={{ fontWeight: 700, lineHeight: 1 }}
              >
                {stat.value}
              </p>
              <p className="text-muted-foreground text-[12px] mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Listings Feed */}
        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-foreground text-[20px]"
            style={{ fontWeight: 700 }}
          >
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {listings.slice(0, 3).map((listing, i) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
            >
              <ListingCard listing={formatListing(listing)} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
