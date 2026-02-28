import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Heart,
  Share2,
  Shield,
  TrendingUp,
  AlertTriangle,
  MapPin,
  Bed,
  Bath,
  Square,
  Zap,
  Users,
  ChevronRight,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useListing } from "../../hooks/useSupabaseData";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { motion } from "motion/react";

export function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { listing, loading } = useListing(id);

  const getMatchColor = (pct: number) => {
    if (pct >= 80) return "#10B981";
    if (pct >= 65) return "#F59E0B";
    return "#EF4444";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#3B82F6] animate-spin" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center">
        <p className="text-white">Listing not found</p>
      </div>
    );
  }

  // Use crime_index as a proxy for match since DB doesn't have match_score
  const matchScore = 100 - listing.crime_index; // Lower crime = higher match
  const matchColor = getMatchColor(matchScore);

  const stats = [
    {
      icon: Shield,
      label: "Crime Index",
      value: `${listing.crime_index}/100`,
      color: listing.crime_index < 30 ? "#10B981" : listing.crime_index < 50 ? "#F59E0B" : "#EF4444",
      desc: listing.crime_index < 30 ? "Safe area" : "Exercise caution",
    },
    {
      icon: TrendingUp,
      label: "Rent Trend",
      value: listing.rent_trend || "Stable",
      color: listing.rent_trend?.startsWith("-") ? "#10B981" : "#F59E0B",
      desc: listing.rent_trend?.startsWith("-") ? "Prices decreasing" : "Prices rising",
    },
    {
      icon: AlertTriangle,
      label: "Competition",
      value: listing.competition_score > 70 ? "High" : listing.competition_score > 40 ? "Medium" : "Low",
      color: listing.competition_score < 40 ? "#10B981" : listing.competition_score < 70 ? "#F59E0B" : "#EF4444",
      desc: listing.competition_score > 70 ? "Many applicants" : "Fewer applicants",
    },
    {
      icon: Shield,
      label: "Scam Score",
      value: `${listing.scam_score}/100`,
      color: listing.scam_score < 10 ? "#10B981" : listing.scam_score < 30 ? "#F59E0B" : "#EF4444",
      desc: listing.scam_score < 10 ? "Verified listing" : "Some flags detected",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0F1E]">
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
          <div className="flex gap-2">
            <button className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors">
              <Heart size={18} className="text-[#8B95A5]" />
            </button>
            <button className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors">
              <Share2 size={18} className="text-[#8B95A5]" />
            </button>
            <button className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors">
              <ExternalLink size={18} className="text-[#8B95A5]" />
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
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1E]/60 via-transparent to-transparent" />
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
                    <span className="text-[14px]">{listing.beds} Bed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Bath size={16} className="text-[#6B7280]" />
                    <span className="text-[14px]">{listing.baths} Bath</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Square size={16} className="text-[#6B7280]" />
                    <span className="text-[14px]">{listing.sqft} sqft</span>
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
              className="bg-[#111827] rounded-2xl p-5 lg:p-6 border border-white/[0.06]"
            >
              <h3 className="text-white text-[16px] mb-4" style={{ fontWeight: 600 }}>
                Livability Analysis
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
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
                className="bg-[#111827] rounded-2xl p-5 border border-white/[0.06]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-[#F59E0B]" />
                    <span className="text-white text-[15px]" style={{ fontWeight: 600 }}>
                      Competition
                    </span>
                  </div>
                  <span
                    className="text-[13px]"
                    style={{
                      fontWeight: 600,
                      color:
                        listing.competition_level > 70
                          ? "#EF4444"
                          : listing.competition_level > 40
                          ? "#F59E0B"
                          : "#10B981",
                    }}
                  >
                    {listing.competition_level > 70
                      ? "High Demand"
                      : listing.competition_level > 40
                      ? "Moderate"
                      : "Low Demand"}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-white/[0.06] rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${listing.competition_level}%`,
                      background: `linear-gradient(90deg, #10B981, ${
                        listing.competition_level > 70 ? "#EF4444" : "#F59E0B"
                      })`,
                    }}
                  />
                </div>
                <p className="text-[#6B7280] text-[12px]">
                  {listing.competition_level > 70
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
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#10B981]/20 flex items-center justify-center shrink-0">
                    <Zap size={20} className="text-[#10B981]" />
                  </div>
                  <div>
                    <p className="text-[#10B981] text-[11px]" style={{ fontWeight: 700 }}>
                      AI SUGGESTION
                    </p>
                    <p className="text-white text-[15px]" style={{ fontWeight: 500 }}>
                      {listing.ai_reasons?.[0] || "Complete your profile for better matching"}
                    </p>
                  </div>
                </div>
                <button className="w-full bg-[#10B981]/15 text-[#10B981] py-2.5 rounded-xl text-[13px] hover:bg-[#10B981]/25 transition-colors" style={{ fontWeight: 600 }}>
                  Apply Suggestion
                </button>
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-[#111827] rounded-2xl p-5 border border-white/[0.06]"
              >
                <button
                  className="w-full bg-[#10B981] text-white py-3.5 rounded-xl text-[16px] flex items-center justify-center gap-2 hover:bg-[#059669] active:scale-[0.98] transition-all"
                  style={{ fontWeight: 700 }}
                >
                  <Zap size={20} />
                  1-Click Apply
                </button>
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