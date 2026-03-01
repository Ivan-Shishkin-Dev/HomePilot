import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useSavedListings } from "../../hooks/useSupabaseData";
import { useAppliedListings } from "../../contexts/AppliedListingsContext";
import {
  ArrowLeft,
  Heart,
  Share2,
  Shield,
  ClipboardCheck,
  TrendingUp,
  AlertTriangle,
  MapPin,
  Bed,
  Bath,
  Zap,
  Users,
  ChevronRight,
  ExternalLink,
  Loader2,
  ShipWheel,
} from "lucide-react";
import { useListing } from "../../hooks/useSupabaseData";
import { useAuth } from "../../contexts/AuthContext";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { motion, AnimatePresence } from "motion/react";
import { MATCH_GREEN_MIN, MATCH_YELLOW_MIN } from "../lib/priorityMatch";
import { fetchLivability, type LivabilityResult } from "../../services/livability";
import { generateListingSuggestion } from "../../lib/groq";

const suggestionCache = new Map<string, string>();

export function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { listing, loading } = useListing(id);
  const { profile } = useAuth();
  const { savedIds, toggleSave } = useSavedListings();
  const { trackExternalLinkClick, appliedIds, removeApplied } = useAppliedListings();
  const isSaved = id ? savedIds.has(id) : false;
  const isApplied = id ? appliedIds.has(id) : false;
  const [showCopied, setShowCopied] = useState(false);
  const [livability, setLivability] = useState<LivabilityResult | null>(null);
  const [livabilityLoading, setLivabilityLoading] = useState(true);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiSuggestionLoading, setAiSuggestionLoading] = useState(false);

  useEffect(() => {
    if (!listing) {
      setLivability(null);
      setLivabilityLoading(false);
      return;
    }
    setLivabilityLoading(true);
    fetchLivability(listing)
      .then(setLivability)
      .catch(() => setLivability(null))
      .finally(() => setLivabilityLoading(false));
  }, [listing?.id, listing?.address, listing?.city]);

  // AI suggestion: use listing + livability (when loaded) and profile; cache by listing+data so we don't serve stale numbers; minimum 2s loading
  const MIN_LOADING_MS = 2000;
  useEffect(() => {
    if (!listing || livabilityLoading) return;
    const crimeIndex = livability?.crime_index ?? listing.crime_index ?? 40;
    const rentTrend = livability?.rent_trend ?? listing.rent_trend ?? "Stable";
    const competition = listing.competition_score ?? listing.competition_level ?? 50;
    const cacheKey = `${listing.id}:${crimeIndex}:${rentTrend}:${competition}`;
    const cached = suggestionCache.get(cacheKey);
    if (cached) {
      setAiSuggestion(cached);
      return;
    }
    setAiSuggestionLoading(true);
    const input = {
      competition_score: competition,
      crime_index: crimeIndex,
      rent_trend: livability?.rent_trend ?? listing.rent_trend ?? null,
      match_percent: Math.round(100 - crimeIndex),
      crime_description: livability?.crime_description ?? null,
      rent_trend_description: livability?.rent_trend_description ?? null,
      address: listing.address ?? listing.city ?? null,
    };
    const start = Date.now();
    Promise.all([
      generateListingSuggestion(input, profile),
      new Promise<void>((r) => setTimeout(r, MIN_LOADING_MS)),
    ]).then(([s]) => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
      if (remaining > 0) {
        setTimeout(() => {
          if (s) {
            suggestionCache.set(cacheKey, s);
            setAiSuggestion(s);
          }
          setAiSuggestionLoading(false);
        }, remaining);
      } else {
        if (s) {
          suggestionCache.set(cacheKey, s);
          setAiSuggestion(s);
        }
        setAiSuggestionLoading(false);
      }
    });
  }, [listing?.id, listing, livability, livabilityLoading, profile]);

  const handleShare = async () => {
    const url = listing.listing_url || window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2500);
    } catch {
      try {
        document.execCommand("copy");
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2500);
      } catch {}
    }
  };

  const getMatchColor = (pct: number) => {
    if (pct >= MATCH_GREEN_MIN) return "#10B981";
    if (pct >= MATCH_YELLOW_MIN) return "#F59E0B";
    return "#EF4444";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#3B82F6] animate-spin" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-white">Listing not found</p>
      </div>
    );
  }

  const crimeIndex = livability?.crime_index ?? listing.crime_index;
  const rentTrendValue = livability?.rent_trend ?? listing.rent_trend ?? "Stable";
  const rentTrendDesc = livability?.rent_trend_description ?? (listing.rent_trend?.startsWith("-") ? "Prices decreasing" : "Prices rising");

  // Use crime_index as a proxy for match since DB doesn't have match_score
  const matchScore = 100 - crimeIndex;
  const matchColor = getMatchColor(matchScore);

  const livabilityStats = [
    {
      icon: Shield,
      label: "Crime Index",
      value: livabilityLoading ? "—" : `${crimeIndex}/100`,
      color: crimeIndex < 30 ? "#10B981" : crimeIndex < 50 ? "#F59E0B" : "#EF4444",
      desc: livability?.crime_description ?? (crimeIndex < 30 ? "Safe area" : "Exercise caution"),
    },
    {
      icon: TrendingUp,
      label: "Rent Trend",
      value: livabilityLoading ? "—" : rentTrendValue,
      color: rentTrendValue.startsWith("-") ? "#10B981" : "#F59E0B",
      desc: rentTrendDesc,
    },
  ];

  return (
    <div className="min-h-screen bg-background relative">
      <AnimatePresence>
        {showCopied && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onClick={() => setShowCopied(false)}
            className="fixed inset-x-4 top-24 z-50 mx-auto max-w-sm cursor-pointer"
          >
            <div className="rounded-xl bg-[#10B981] px-4 py-3 text-center text-sm font-medium text-white shadow-lg">
              Link copied
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Back bar */}
      <div className="border-b border-white/[0.06] px-6 lg:px-10 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[#8B95A5] hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-[14px]">Back to listings</span>
          </button>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => id && toggleSave(id)}
              className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors"
            >
              <Heart
                size={18}
                className={isSaved ? "text-[#EF4444] fill-[#EF4444]" : "text-[#8B95A5]"}
              />
            </button>
            {isApplied && (
              <button
                onClick={() => id && removeApplied(id)}
                className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors"
                title="Mark as not applied"
              >
                <ClipboardCheck size={18} className="text-[#10B981] fill-[#10B981]" />
              </button>
            )}
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors"
            >
              <Share2 size={18} className="text-[#8B95A5]" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-10 py-6 lg:py-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Left: Image + Details */}
          <div className="lg:col-span-3">
            {/* Hero Image */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative rounded-2xl overflow-hidden mb-6 h-64 sm:h-80 lg:h-96"
            >
              <ImageWithFallback
                src={listing.image}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
            </motion.div>

            {/* Title + Price */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h1 className="text-white text-[24px] lg:text-[28px] mb-1" style={{ fontWeight: 700 }}>
                    {listing.title}
                  </h1>
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-[#8B95A5]" />
                    <span className="text-[#8B95A5] text-[14px]">
                      {listing.address}
                    </span>
                  </div>
                </div>
                <div
                  className="flex flex-col items-center px-4 py-3 rounded-xl shrink-0 ml-4"
                  style={{ backgroundColor: `${matchColor}15` }}
                >
                  <span style={{ color: matchColor, fontWeight: 800, fontSize: 32, lineHeight: 1 }}>
                    {matchScore}%
                  </span>
                  <span className="text-[11px] mt-1" style={{ color: matchColor, fontWeight: 600 }}>
                    MATCH
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-6 mt-4">
                <span className="text-[#10B981] text-[26px]" style={{ fontWeight: 700 }}>
                  ${listing.price.toLocaleString()}
                  <span className="text-[#8B95A5] text-[14px]" style={{ fontWeight: 400 }}>/mo</span>
                </span>
                <div className="flex items-center gap-5 text-[#8B95A5]">
                  <div className="flex items-center gap-1.5">
                    <Bed size={16} className="text-[#6B7280]" />
                    <span className="text-[14px]">{listing.beds === 0 ? "Studio" : `${listing.beds} Bed`}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Bath size={16} className="text-[#6B7280]" />
                    <span className="text-[14px]">{listing.baths} Bath</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-6"
            >
              <h3 className="text-white text-[16px] mb-3" style={{ fontWeight: 600 }}>Features</h3>
              <div className="flex gap-2 flex-wrap">
                {(listing.features || []).map((f) => (
                  <span
                    key={f}
                    className="text-[13px] text-[#8B95A5] bg-white/[0.06] px-4 py-2 rounded-lg border border-white/[0.04]"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Livability Stats */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-2xl p-5 lg:p-6 border border-border"
            >
              <h3 className="text-white text-[16px] mb-4" style={{ fontWeight: 600 }}>
                Livability Analysis
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {livabilityStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="bg-white/[0.03] rounded-xl p-4"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                      style={{ backgroundColor: `${stat.color}15` }}
                    >
                      <stat.icon size={20} style={{ color: stat.color }} />
                    </div>
                    <p className="text-[#6B7280] text-[12px] mb-0.5">{stat.label}</p>
                    <p className="text-white text-[18px]" style={{ fontWeight: 700 }}>
                      {stat.value}
                    </p>
                    <p className="text-[#6B7280] text-[11px] mt-0.5">{stat.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right: Sidebar */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-6 flex flex-col gap-5">
              {/* Competition Bar */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card rounded-2xl p-5 border border-border"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-[#F59E0B]" />
                    <span className="text-white text-[15px]" style={{ fontWeight: 600 }}>
                      Competition
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[13px]"
                      style={{
                        fontWeight: 600,
                        color:
                          (listing.competition_level ?? listing.competition_score) > 70
                            ? "#EF4444"
                            : (listing.competition_level ?? listing.competition_score) > 40
                            ? "#F59E0B"
                            : "#10B981",
                      }}
                    >
                      {(listing.competition_level ?? listing.competition_score) > 70
                        ? "High Demand"
                        : (listing.competition_level ?? listing.competition_score) > 40
                        ? "Moderate"
                        : "Low Demand"}
                    </span>
                    <span className="text-[#6B7280] text-[12px]">
                      ({listing.competition_level ?? listing.competition_score}/100)
                    </span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-white/[0.06] rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${listing.competition_level ?? listing.competition_score}%`,
                      background: `linear-gradient(90deg, #10B981, ${
                        (listing.competition_level ?? listing.competition_score) > 70 ? "#EF4444" : "#F59E0B"
                      })`,
                    }}
                  />
                </div>
                <p className="text-[#6B7280] text-[12px]">
                  {(listing.competition_level ?? listing.competition_score) > 70
                    ? "Many applicants are viewing this listing"
                    : "Fewer applicants interested right now"}
                </p>
              </motion.div>

              {/* AI Suggestion */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-r from-[#10B981]/10 to-[#10B981]/5 rounded-2xl p-5 border border-[#10B981]/15"
              >
                <AnimatePresence mode="wait">
                  {aiSuggestionLoading ? (
                    <motion.div
                      key="atlas-loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-[#10B981]/20 flex items-center justify-center shrink-0">
                          <motion.div
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            className="flex items-center justify-center"
                          >
                            <ShipWheel size={22} className="text-[#10B981]" />
                          </motion.div>
                        </div>
                        <p className="text-[#10B981] text-[14px]" style={{ fontWeight: 600 }}>
                          Atlas is thinking…
                        </p>
                      </div>
                      <div className="flex justify-center gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-[#10B981]/60"
                            animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
                            transition={{
                              duration: 0.6,
                              repeat: Infinity,
                              delay: i * 0.15,
                              ease: "easeInOut",
                            }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="atlas-result"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-[#10B981]/20 flex items-center justify-center shrink-0">
                          <ShipWheel size={22} className="text-[#10B981]" />
                        </div>
                        <p className="text-[#10B981] text-[16px]" style={{ fontWeight: 700 }}>
                          Atlas' suggestion
                        </p>
                      </div>
                      <p className="text-white text-[15px] leading-snug pl-0" style={{ fontWeight: 500 }}>
                        {aiSuggestion || listing.ai_reasons?.[0] || "Complete your profile for better matching"}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-card rounded-2xl p-5 border border-border"
              >
                {listing.listing_url ? (
                  <button
                    type="button"
                    onClick={() =>
                      trackExternalLinkClick({
                        id: listing.id,
                        title: listing.title,
                        url: listing.listing_url!,
                      })
                    }
                    className="block w-full bg-[#10B981] text-white py-3.5 rounded-xl text-[16px] flex items-center justify-center gap-2 hover:bg-[#059669] active:scale-[0.98] transition-all"
                    style={{ fontWeight: 700 }}
                  >
                    <ExternalLink size={20} />
                    {listing.source === "apartments" ? "View on Apartments.com" : "View on Zillow"}
                  </button>
                ) : (
                  <button
                    className="w-full bg-[#10B981] text-white py-3.5 rounded-xl text-[16px] flex items-center justify-center gap-2 hover:bg-[#059669] active:scale-[0.98] transition-all"
                    style={{ fontWeight: 700 }}
                  >
                    <Zap size={20} />
                    1-Click Apply
                  </button>
                )}
                <p className="text-center text-[#6B7280] text-[12px] mt-3">
                  Your Renter Passport will be shared automatically
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}