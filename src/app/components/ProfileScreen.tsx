import { useState } from "react";
import {
  TrendingUp,
  ChevronRight,
  Settings,
  Sparkles,
  User,
  Mail,
  MapPin,
  Calendar,
  Loader2,
  FileText,
  DollarSign,
  CreditCard,
  Landmark,
  Briefcase,
  Users,
  PartyPopper,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useUserDocuments, DOCUMENT_SCORE_VALUES } from "../../hooks/useSupabaseData";
import { useAuth } from "../../contexts/AuthContext";
import { ScoreRing } from "./ScoreRing";
import { motion } from "motion/react";

// Document metadata for display
const DOCUMENT_META: Record<string, { label: string; category: string; icon: typeof FileText }> = {
  income: { label: "Upload Proof of Income", category: "Financial", icon: DollarSign },
  credit: { label: "Submit Credit Report", category: "Credit", icon: CreditCard },
  id: { label: "Verify Government ID", category: "Identity", icon: FileText },
  bank: { label: "Upload Bank Statements", category: "Financial", icon: Landmark },
  employment: { label: "Add Employment Letter", category: "Employment", icon: Briefcase },
  references: { label: "Provide References", category: "References", icon: Users },
};

export function ProfileScreen() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);
  const { documents, loading } = useUserDocuments();
  const { profile } = useAuth();
  // Build suggestions from documents, ranked by score impact (descending)
  const missingDocs = documents
    .filter(d => d.status === "missing")
    .sort((a, b) => (DOCUMENT_SCORE_VALUES[b.icon] || 0) - (DOCUMENT_SCORE_VALUES[a.icon] || 0));

  const allUploaded = documents.length > 0 && missingDocs.length === 0;

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

  const totalPotentialPoints = missingDocs.reduce((acc, d) => acc + (DOCUMENT_SCORE_VALUES[d.icon] || 0), 0);

  const categoryColors: Record<string, string> = {
    Financial: "#10B981",
    Employment: "#10B981",
    Credit: "#10B981",
    Identity: "#10B981",
    References: "#10B981",
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
                {allUploaded
                  ? "All documents uploaded!"
                  : `Potential: +${totalPotentialPoints} score points`}
              </span>
            </motion.div>
          </div>

          {/* Right: Suggestions */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-foreground text-[18px]" style={{ fontWeight: 600 }}>
                Suggestions by Impact
              </h3>
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#10B981]" />
                <span className="text-muted-foreground text-[13px]">
                  {allUploaded ? "All complete" : `${missingDocs.length} remaining`}
                </span>
              </div>
            </div>

            {allUploaded ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card rounded-2xl border border-[#10B981]/20 p-10 flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 rounded-full bg-[#10B981]/15 flex items-center justify-center mb-4">
                  <PartyPopper size={32} className="text-[#10B981]" />
                </div>
                <h3 className="text-foreground text-[20px] mb-2" style={{ fontWeight: 700 }}>
                  You're All Set!
                </h3>
                <p className="text-muted-foreground text-[14px] mb-6 max-w-md">
                  All your documents are uploaded and your profile is fully optimized.
                  You're in the best position to get approved by landlords.
                </p>
                <button
                  onClick={() => navigate("/passport")}
                  className="bg-[#10B981] text-white px-6 py-2.5 rounded-xl text-[14px] hover:bg-[#10B981]/90 transition-colors"
                  style={{ fontWeight: 600 }}
                >
                  View Your Passport
                </button>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-3">
                {missingDocs.map((doc, i) => {
                  const scoreValue = DOCUMENT_SCORE_VALUES[doc.icon] || 0;
                  const meta = DOCUMENT_META[doc.icon];
                  const catColor = categoryColors[meta?.category || ""] || "#10B981";
                  const DocIcon = meta?.icon || FileText;
                  return (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.05 }}
                      className="bg-card rounded-xl border border-border overflow-hidden hover:border-muted transition-colors"
                    >
                      <button
                        onClick={() =>
                          setExpanded(expanded === doc.id ? null : doc.id)
                        }
                        className="w-full p-4 flex items-center gap-4 text-left"
                      >
                        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-muted shrink-0">
                          <DocIcon size={20} style={{ color: catColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground text-[15px] mb-1" style={{ fontWeight: 500 }}>
                            {meta?.label || doc.name}
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
                              {meta?.category || "Document"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className="bg-[#10B981]/15 text-[#10B981] px-3 py-1.5 rounded-lg text-[14px]"
                            style={{ fontWeight: 700 }}
                          >
                            +{scoreValue} pts
                          </span>
                          <ChevronRight
                            size={16}
                            className={`text-muted-foreground transition-transform ${
                              expanded === doc.id ? "rotate-90" : ""
                            }`}
                          />
                        </div>
                      </button>
                      {expanded === doc.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          className="px-4 pb-4 border-t border-border"
                        >
                          <p className="text-muted-foreground text-[13px] pt-4 mb-4">
                            Uploading this document will add{" "}
                            <span className="text-[#10B981]" style={{ fontWeight: 600 }}>+{scoreValue} points</span>{" "}
                            to your Renter Score. Landlords prioritize renters with complete{" "}
                            {(meta?.category || "").toLowerCase()} documentation.
                          </p>
                          <button
                            onClick={() => navigate("/passport")}
                            className="bg-[#10B981]/15 text-[#10B981] px-6 py-2.5 rounded-xl text-[14px] hover:bg-[#10B981]/25 transition-colors"
                            style={{ fontWeight: 600 }}
                          >
                            Upload in Passport
                          </button>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}