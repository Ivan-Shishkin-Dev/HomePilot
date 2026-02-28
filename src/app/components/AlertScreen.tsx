import { useNavigate } from "react-router";
import { ArrowLeft, Zap, Clock, MapPin, TrendingUp, Shield, Users, Bell, Loader2 } from "lucide-react";
import { useListings } from "../../hooks/useSupabaseData";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { motion } from "motion/react";

export function AlertScreen() {
  const navigate = useNavigate();
  const { listings, loading } = useListings();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#3B82F6] animate-spin" />
      </div>
    );
  }

  const listing = listings[0];
  const listing2 = listings[1];

  if (!listing) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center">
        <p className="text-white">No alerts available</p>
      </div>
    );
  }

  const reasons = [
    {
      icon: TrendingUp,
      text: `${listing.match_score}% match with your preferences and budget`,
      color: "#10B981",
    },
    {
      icon: Shield,
      text: "Verified landlord and listing",
      color: "#10B981",
    },
    {
      icon: Users,
      text: listing.competition_level > 70 ? "High competition — act fast" : "Moderate competition",
      color: listing.competition_level > 70 ? "#F59E0B" : "#10B981",
    },
    {
      icon: Clock,
      text: "New listing — apply early",
      color: "#3B82F6",
    },
  ];

  const alerts = listing2 ? [
    {
      listing: { ...listing, image: listing.image_url, matchPercent: listing.match_score },
      urgency: "URGENT",
      urgencyColor: "#EF4444",
      timeAgo: "2 min ago",
    },
    {
      listing: { ...listing2, image: listing2.image_url, matchPercent: listing2.match_score },
      urgency: "NEW MATCH",
      urgencyColor: "#3B82F6",
      timeAgo: "15 min ago",
    },
  ] : [{
    listing: { ...listing, image: listing.image_url, matchPercent: listing.match_score },
    urgency: "URGENT",
    urgencyColor: "#EF4444",
    timeAgo: "2 min ago",
  }];

  return (
    <div className="min-h-screen bg-[#0A0F1E]">
      {/* Page Header */}
      <div className="border-b border-white/[0.06] px-6 lg:px-10 py-5 lg:py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-white text-[24px] lg:text-[28px]" style={{ fontWeight: 700 }}>
            AI Copilot Alerts
          </h1>
          <p className="text-[#8B95A5] text-[14px] mt-1">
            Proactive matches found by your AI rental copilot
          </p>
        </div>
      </div>

      <div className="px-6 lg:px-10 py-6 lg:py-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Main alert */}
          <div className="lg:col-span-3">
            {/* Primary Alert */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#111827] rounded-2xl border border-white/[0.06] overflow-hidden mb-6"
            >
              {/* Urgency Banner */}
              <div className="bg-[#EF4444]/10 border-b border-[#EF4444]/15 px-5 py-3 flex items-center gap-3">
                <span className="w-2.5 h-2.5 bg-[#EF4444] rounded-full animate-pulse" />
                <span className="text-[#EF4444] text-[13px]" style={{ fontWeight: 700 }}>
                  URGENT — HIGH PRIORITY ALERT
                </span>
                <span className="text-[#6B7280] text-[12px] ml-auto">2 min ago</span>
              </div>

              {/* AI Header */}
              <div className="p-6 border-b border-white/[0.04]">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] flex items-center justify-center shadow-lg shadow-[#3B82F6]/20">
                    <Zap size={28} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-white text-[20px]" style={{ fontWeight: 700 }}>
                      AI Copilot Found a Match
                    </h2>
                    <p className="text-[#8B95A5] text-[14px]">
                      This listing matches your profile exceptionally well
                    </p>
                  </div>
                </div>
              </div>

              {/* Property Snapshot */}
              <div className="p-6">
                <div className="flex gap-5 flex-col sm:flex-row">
                  <div className="relative rounded-xl overflow-hidden w-full sm:w-64 h-44 shrink-0">
                    <ImageWithFallback
                      src={listing.image_url}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3 bg-[#10B981] px-2.5 py-1 rounded-lg">
                      <span className="text-white text-[14px]" style={{ fontWeight: 700 }}>
                        {listing.match_score}% match
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white text-[18px] mb-1" style={{ fontWeight: 600 }}>
                      {listing.title}
                    </h3>
                    <div className="flex items-center gap-1 mb-3">
                      <MapPin size={13} className="text-[#8B95A5]" />
                      <span className="text-[#8B95A5] text-[13px]">
                        {listing.address}
                      </span>
                    </div>
                    <span className="text-[#3B82F6] text-[22px]" style={{ fontWeight: 700 }}>
                      ${listing.price.toLocaleString()}
                      <span className="text-[#8B95A5] text-[13px]" style={{ fontWeight: 400 }}>/mo</span>
                    </span>
                    <div className="flex items-center gap-1.5 mt-3">
                      <Clock size={14} className="text-[#3B82F6]" />
                      <span className="text-[#3B82F6] text-[14px]" style={{ fontWeight: 600 }}>
                        Available now
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Why AI Flagged */}
              <div className="px-6 pb-6">
                <h3 className="text-white text-[15px] mb-3" style={{ fontWeight: 600 }}>
                  Why AI flagged this
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {reasons.map((reason, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 bg-white/[0.03] rounded-xl p-3"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${reason.color}15` }}
                      >
                        <reason.icon size={15} style={{ color: reason.color }} />
                      </div>
                      <span className="text-[#C9D1D9] text-[13px] pt-1">{reason.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 pb-6">
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate("/home")}
                    className="flex-1 bg-white/[0.06] text-[#8B95A5] py-3 rounded-xl text-[15px] hover:bg-white/[0.1] transition-colors"
                    style={{ fontWeight: 600 }}
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => navigate(`/listing/${listing.id}`)}
                    className="flex-[2] bg-[#3B82F6] text-white py-3 rounded-xl text-[15px] flex items-center justify-center gap-2 hover:bg-[#2563EB] transition-colors"
                    style={{ fontWeight: 700 }}
                  >
                    <Zap size={18} />
                    Accept & Apply
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right: Alert History */}
          <div className="lg:col-span-2">
            <h3 className="text-white text-[16px] mb-4" style={{ fontWeight: 600 }}>
              Recent Alerts
            </h3>
            <div className="flex flex-col gap-3">
              {alerts.map((alert, i) => (
                <motion.div
                  key={alert.listing.id}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="bg-[#111827] rounded-xl p-4 border border-white/[0.06] hover:border-white/[0.12] transition-colors cursor-pointer"
                  onClick={() => navigate(`/listing/${alert.listing.id}`)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-md"
                      style={{
                        color: alert.urgencyColor,
                        backgroundColor: `${alert.urgencyColor}15`,
                        fontWeight: 700,
                      }}
                    >
                      {alert.urgency}
                    </span>
                    <span className="text-[#6B7280] text-[11px] ml-auto">{alert.timeAgo}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                      <ImageWithFallback
                        src={alert.listing.image}
                        alt={alert.listing.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-[14px] truncate" style={{ fontWeight: 500 }}>
                        {alert.listing.title}
                      </p>
                      <p className="text-[#8B95A5] text-[12px]">
                        {alert.listing.matchPercent}% match · ${alert.listing.price.toLocaleString()}/mo
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Past alerts */}
              <div className="mt-2">
                <p className="text-[#4B5563] text-[12px] mb-2" style={{ fontWeight: 600 }}>
                  EARLIER TODAY
                </p>
                {[
                  { title: "Price drop: Urban Loft", desc: "$2,800 → $2,650/mo", time: "3h ago", type: "PRICE DROP", color: "#10B981" },
                  { title: "Listing expiring soon", desc: "Renovated Townhouse", time: "5h ago", type: "EXPIRING", color: "#F59E0B" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-3 border-b border-white/[0.04] last:border-0"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                      <Bell size={14} className="text-[#6B7280]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white text-[13px] truncate" style={{ fontWeight: 500 }}>
                          {item.title}
                        </p>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                          style={{ color: item.color, backgroundColor: `${item.color}15`, fontWeight: 600 }}
                        >
                          {item.type}
                        </span>
                      </div>
                      <p className="text-[#6B7280] text-[11px]">{item.desc}</p>
                    </div>
                    <span className="text-[#4B5563] text-[11px] shrink-0">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
