import { useNavigate } from "react-router";
import {
  Mail,
  MapPin,
  Calendar,
  User,
  ChevronRight,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { ScoreRing } from "./ScoreRing";
import { motion } from "motion/react";

function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 800) return { label: "Excellent", color: "#10B981" };
  if (score >= 650) return { label: "Good", color: "#F59E0B" };
  return { label: "Needs Work", color: "#EF4444" };
}

export function MyProfileScreen() {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const getUserInitials = () => {
    if (!profile) return "??";
    const first = profile.first_name?.[0] || "";
    const last = profile.last_name?.[0] || "";
    return (first + last).toUpperCase() || "??";
  };

  const getUserDisplayName = () => {
    if (!profile) return "Loading...";
    if (profile.first_name || profile.last_name)
      return `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    return profile.email || "User";
  };

  const totalPotentialImpact = 88;

  const score = profile?.renter_score || 0;
  const { label: scoreLabel, color: scoreColor } = getScoreLabel(score);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#10B981] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border px-6 lg:px-10 py-5 lg:py-6">
        <div className="max-w-7xl mx-auto">
          <h1
            className="text-foreground text-[24px] lg:text-[28px]"
            style={{ fontWeight: 700 }}
          >
            My Profile
          </h1>
          <p className="text-muted-foreground text-[14px] mt-1">
            Your renter identity at a glance
          </p>
        </div>
      </div>

      <div className="px-6 lg:px-10 py-6 lg:py-8 max-w-xl mx-auto flex flex-col gap-5">
        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-6 border border-border"
        >
          <div className="flex flex-col items-center mb-5">
            <div
              className="w-20 h-20 rounded-full bg-gradient-to-br from-[#10B981] to-[#34D399] flex items-center justify-center text-white text-[26px] mb-3"
              style={{ fontWeight: 700 }}
            >
              {getUserInitials()}
            </div>
            <h3
              className="text-foreground text-[20px]"
              style={{ fontWeight: 600 }}
            >
              {getUserDisplayName()}
            </h3>
            <p className="text-muted-foreground text-[13px]">
              Renter since{" "}
              {new Date(profile?.created_at || Date.now()).getFullYear()}
            </p>
          </div>

          <div className="flex flex-col gap-3 text-[14px]">
            {[
              { icon: Mail, label: profile?.email || "No email" },
              {
                icon: MapPin,
                label: profile?.preferred_cities?.[0] || "Location not set",
              },
              {
                icon: Calendar,
                label: `Looking for: ${
                  profile?.move_in_date
                    ? new Date(profile.move_in_date).toLocaleDateString(
                        "en-US",
                        { month: "long", year: "numeric" }
                      )
                    : "Not set"
                }`,
              },
              {
                icon: User,
                label: profile?.max_budget
                  ? `Budget $${profile.max_budget.toLocaleString()}/mo`
                  : "Budget not set",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 text-muted-foreground"
              >
                <item.icon size={16} className="shrink-0" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Renter Score */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-5 border border-border flex items-center gap-5"
        >
          <ScoreRing score={score} size={80} strokeWidth={6} label="" />
          <div>
            <p
              className="text-foreground text-[15px]"
              style={{ fontWeight: 600 }}
            >
              Renter Score
            </p>
            <p className="text-[13px]" style={{ fontWeight: 500, color: scoreColor }}>
              {scoreLabel}
            </p>
            <button
              onClick={() => navigate("/passport")}
              className="flex items-center gap-1 text-[#10B981] text-[12px] mt-1"
              style={{ fontWeight: 600 }}
            >
              View Passport <ChevronRight size={13} />
            </button>
          </div>
        </motion.div>

        {/* Potential impact */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-[#10B981]/10 rounded-2xl px-4 py-3.5 border border-[#10B981]/15 flex items-center gap-3"
        >
          <TrendingUp size={18} className="text-[#10B981]" />
          <span
            className="text-[#10B981] text-[13px]"
            style={{ fontWeight: 600 }}
          >
            Potential: +{totalPotentialImpact}% acceptance
          </span>
        </motion.div>
      </div>
    </div>
  );
}
