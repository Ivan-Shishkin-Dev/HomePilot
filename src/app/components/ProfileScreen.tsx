import { useState, useEffect } from "react";
import {
  Zap,
  TrendingUp,
  ChevronRight,
  Settings,
  Sparkles,
  User,
  Mail,
  MapPin,
  Calendar,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useProfileSuggestions, useUpdateProfile } from "../../hooks/useSupabaseData";
import { useAuth } from "../../contexts/AuthContext";
import { ScoreRing } from "./ScoreRing";
import { motion } from "motion/react";

export function ProfileScreen() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);
  const { suggestions, loading } = useProfileSuggestions();
  const { profile } = useAuth();
  const { updateProfile } = useUpdateProfile();
  const [autoApply, setAutoApply] = useState(profile?.auto_apply_enabled || false);

  useEffect(() => {
    if (profile) {
      setAutoApply(profile.auto_apply_enabled);
    }
  }, [profile]);

  const handleAutoApplyToggle = async () => {
    const newValue = !autoApply;
    setAutoApply(newValue);
    await updateProfile({ auto_apply_enabled: newValue });
  };

  // Impact is stored as integer in DB (higher = more impact)
  const sorted = [...suggestions].sort((a, b) => b.impact - a.impact);

  const getUserInitials = () => {
    if (!profile) return "??";
    const first = profile.first_name?.[0] || "";
    const last = profile.last_name?.[0] || "";
    return (first + last).toUpperCase() || "??";
  };

  const getUserDisplayName = () => {
    if (!profile) return "Loading...";
    if (profile.first_name || profile.last_name) {
      return `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    }
    return profile.email || "User";
  };

  // Impact is already a number in the database
  const getImpactLabel = (impact: number) => {
    if (impact >= 20) return "high";
    if (impact >= 10) return "medium";
    return "low";
  };

  const totalPotentialImpact = sorted.filter(s => !s.completed).reduce((acc, s) => acc + s.impact, 0);

  const categoryColors: Record<string, string> = {
    Financial: "#10B981",
    Employment: "#10B981",
    Credit: "#10B981",
    Identity: "#10B981",
  };

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
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-foreground text-[24px] lg:text-[28px]" style={{ fontWeight: 700 }}>
              Profile Optimization
            </h1>
            <p className="text-muted-foreground text-[14px] mt-1">
              AI-powered suggestions to maximize your acceptance rate
            </p>
          </div>
          <button className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center hover:bg-accent transition-colors">
            <Settings size={18} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="px-6 lg:px-10 py-6 lg:py-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left: Profile Card */}
          <div>
            {/* User Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl p-6 border border-border mb-5"
            >
              <div className="flex flex-col items-center mb-5">
             
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#10B981] to-[#34D399] flex items-center justify-center text-white text-[22px] mb-3" style={{ fontWeight: 700 }}>
                  {getUserInitials()}
                </div>
                <h3 className="text-foreground text-[18px]" style={{ fontWeight: 600 }}>{getUserDisplayName()}</h3>
                <p className="text-muted-foreground text-[13px]">Renter since {new Date(profile?.created_at || Date.now()).getFullYear()}</p>
              </div>

              <div className="flex flex-col gap-2.5 text-[13px]">
                {[
                  { icon: Mail, label: profile?.email || "No email" },
                  { icon: MapPin, label: profile?.preferred_cities?.[0] || "Location not set" },
                  { icon: Calendar, label: `Looking for: ${profile?.move_in_date ? new Date(profile.move_in_date).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "Not set"}` },
                  { icon: User, label: profile?.max_budget ? `Budget: Up to $${profile.max_budget.toLocaleString()}/mo` : "Budget not set" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5 text-muted-foreground">
                    <item.icon size={14} className="text-muted-foreground shrink-0" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Score */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-2xl p-5 border border-border mb-5 flex items-center gap-5"
            >
              <ScoreRing score={profile?.renter_score || 0} size={80} strokeWidth={6} label="" />
              <div>
                <p className="text-foreground text-[15px]" style={{ fontWeight: 600 }}>Renter Score</p>
                <p className="text-[#10B981] text-[13px]" style={{ fontWeight: 500 }}>Excellent</p>
                <button
                  onClick={() => navigate("/passport")}
                  className="flex items-center gap-1 text-[#10B981] text-[12px] mt-1"
                  style={{ fontWeight: 600 }}
                >
                  View Passport <ChevronRight size={13} />
                </button>
              </div>
            </motion.div>

            {/* Impact Summary */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-[#10B981]/10 rounded-2xl px-4 py-3.5 border border-[#10B981]/15 flex items-center gap-3"
            >
              <TrendingUp size={18} className="text-[#10B981]" />
              <span className="text-[#10B981] text-[13px]" style={{ fontWeight: 600 }}>
                Potential: +{totalPotentialImpact}% acceptance
              </span>
            </motion.div>
          </div>

          {/* Right: Suggestions */}
          <div className="lg:col-span-2">
            {/* Auto-apply Toggle */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-2xl p-5 border border-border mb-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/15 flex items-center justify-center">
                  <Zap size={20} className="text-[#F59E0B]" />
                </div>
                <div>
                  <p className="text-foreground text-[15px]" style={{ fontWeight: 600 }}>
                    Auto-apply suggestions
                  </p>
                  <p className="text-muted-foreground text-[12px]">
                    Automatically optimize your profile as new data is available
                  </p>
                </div>
              </div>
              <button
                onClick={handleAutoApplyToggle}
                className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ml-4 ${
                  autoApply ? "bg-[#10B981]" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                    autoApply ? "translate-x-5.5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </motion.div>

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-foreground text-[18px]" style={{ fontWeight: 600 }}>
                Suggestions by Impact
              </h3>
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#10B981]" />
                <span className="text-muted-foreground text-[13px]">{sorted.length} suggestions</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {sorted.map((suggestion, i) => {
                const impactLabel = getImpactLabel(suggestion.impact);
                const impactColor = impactLabel === "high" ? "#10B981" : impactLabel === "medium" ? "#F59E0B" : "#8B5CF6";
                const catColor = categoryColors[suggestion.category] || "#10B981";
                return (
                  <motion.div
                    key={suggestion.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                    className="bg-card rounded-xl border border-border overflow-hidden hover:border-muted transition-colors"
                  >
                    <button
                      onClick={() =>
                        setExpanded(expanded === suggestion.id ? null : suggestion.id)
                      }
                      className="w-full p-4 flex items-center gap-4 text-left"
                    >
                      <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-muted shrink-0">
                        <span className="text-[17px]" style={{ fontWeight: 700, color: catColor }}>
                          #{i + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-[15px] mb-1" style={{ fontWeight: 500 }}>
                          {suggestion.action}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[11px] px-2.5 py-0.5 rounded-md"
                            style={{
                              color: catColor,
                              backgroundColor: `${catColor}15`,
                              fontWeight: 600,
                            }}
                          >
                            {suggestion.category}
                          </span>
                          {suggestion.auto_applied && (
                            <span className="text-[10px] text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded-md">
                              Auto-applied
                            </span>
                          )}
                          {suggestion.completed && (
                            <span className="text-[10px] text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-md">
                              Completed
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className="bg-[#10B981]/15 text-[#10B981] px-3 py-1.5 rounded-lg text-[14px]"
                          style={{ fontWeight: 700 }}
                        >
                          +{suggestion.impact}%
                        </span>
                        <ChevronRight
                          size={16}
                          className={`text-muted-foreground transition-transform ${
                            expanded === suggestion.id ? "rotate-90" : ""
                          }`}
                        />
                      </div>
                    </button>
                    {expanded === suggestion.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="px-4 pb-4 border-t border-border"
                      >
                        <p className="text-muted-foreground text-[13px] pt-4 mb-4">
                          Completing this action will increase your acceptance rate by{" "}
                          {suggestion.impact}%. Landlords prioritize renters with complete{" "}
                          {suggestion.category.toLowerCase()} documentation.
                        </p>
                        <button
                          className="bg-[#10B981]/15 text-[#10B981] px-6 py-2.5 rounded-xl text-[14px] hover:bg-[#10B981]/25 transition-colors"
                          style={{ fontWeight: 600 }}
                        >
                          Complete Action
                        </button>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}