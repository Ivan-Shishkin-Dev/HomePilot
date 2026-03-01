import { useState } from "react";
import {
  ChevronRight,
  Settings,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useProfileSuggestions } from "../../hooks/useSupabaseData";
import { motion } from "motion/react";

export function ProfileScreen() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { suggestions, loading } = useProfileSuggestions();

  const sorted = [...suggestions].sort((a, b) => b.impact - a.impact);

  const getImpactLabel = (impact: number) => {
    if (impact >= 20) return "high";
    if (impact >= 10) return "medium";
    return "low";
  };

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
      <div className="border-b border-border px-6 lg:px-10 py-5 lg:py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-foreground text-[24px] lg:text-[28px]" style={{ fontWeight: 700 }}>
              Optimize Documents
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

      <div className="px-6 lg:px-10 py-6 lg:py-8 max-w-4xl mx-auto">
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
            const catColor = categoryColors[suggestion.category] || "#10B981";
            return (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
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
  );
}
