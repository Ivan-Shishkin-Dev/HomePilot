import {
  Shield,
  FileText,
  DollarSign,
  Building2,
  Briefcase,
  CreditCard,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Share2,
  ChevronRight,
  Download,
  Lock,
  Loader2,
} from "lucide-react";
import { ScoreRing } from "./ScoreRing";
import { useUserDocuments } from "../../hooks/useSupabaseData";
import { useAuth } from "../../contexts/AuthContext";
import { motion } from "motion/react";

const iconMap: Record<string, typeof FileText> = {
  id: FileText,
  income: DollarSign,
  bank: Building2,
  employment: Briefcase,
  credit: CreditCard,
  references: Users,
};

const statusConfig = {
  verified: { icon: CheckCircle2, color: "#10B981", label: "Verified" },
  pending: { icon: Clock, color: "#F59E0B", label: "Pending" },
  missing: { icon: AlertCircle, color: "#EF4444", label: "Missing" },
};

export function PassportScreen() {
  const { documents, loading } = useUserDocuments();
  const { profile } = useAuth();

  const verified = documents.filter((d) => d.status === "verified").length;
  const total = documents.length || 1;
  const completionPct = profile?.profile_completion || Math.round((verified / total) * 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center">
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
              Renter Passport
            </h1>
            <p className="text-muted-foreground text-[14px] mt-1">
              Your verified renter profile for instant applications
            </p>
          </div>
          <div className="flex gap-2">
            <button className="hidden sm:flex items-center gap-2 bg-muted text-muted-foreground px-4 py-2.5 rounded-xl text-[14px] hover:bg-accent transition-colors" style={{ fontWeight: 500 }}>
              <Download size={16} />
              Export PDF
            </button>
            <button className="flex items-center gap-2 bg-[#10B981] text-white px-5 py-2.5 rounded-xl text-[14px] hover:bg-[#059669] transition-colors" style={{ fontWeight: 600 }}>
              <Share2 size={16} />
              Share Passport
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-10 py-6 lg:py-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column: Score + Completion */}
          <div>
            {/* Score Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl p-6 lg:p-8 border border-border mb-5 flex flex-col items-center"
            >
              <ScoreRing score={profile?.renter_score || 0} size={150} strokeWidth={9} />
              <div className="mt-4 text-center">
                <p className="text-[#10B981] text-[15px] mb-1" style={{ fontWeight: 600 }}>
                  Excellent
                </p>
                <p className="text-muted-foreground text-[13px]">
                  Your passport is accepted by 92% of landlords
                </p>
              </div>
            </motion.div>

            {/* Completion Bar */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-2xl p-5 border border-border mb-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-foreground text-[15px]" style={{ fontWeight: 600 }}>
                  Profile Completion
                </span>
                <span className="text-[#10B981] text-[15px]" style={{ fontWeight: 700 }}>
                  {completionPct}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPct}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="h-full bg-[#10B981] rounded-full"
                />
              </div>
              <p className="text-muted-foreground text-[12px]">
                {verified} of {total} documents verified
              </p>
            </motion.div>

            {/* Security badge */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-[#10B981]/10 rounded-2xl p-4 border border-[#10B981]/15 flex items-center gap-3"
            >
              <Lock size={18} className="text-[#10B981]" />
              <div>
                <p className="text-[#10B981] text-[13px]" style={{ fontWeight: 600 }}>
                  Bank-level encryption
                </p>
                <p className="text-muted-foreground text-[11px]">Your data is secured with AES-256</p>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Documents */}
          <div className="lg:col-span-2">
            <h3 className="text-foreground text-[18px] mb-4" style={{ fontWeight: 600 }}>
              Documents
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {documents.map((doc, i) => {
                const Icon = iconMap[doc.icon] || FileText;
                const status = statusConfig[doc.status as keyof typeof statusConfig];
                const StatusIcon = status.icon;
                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    className="bg-card rounded-xl p-4 border border-border flex items-center gap-4 hover:border-muted transition-colors cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                      <Icon size={20} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-foreground text-[14px]" style={{ fontWeight: 500 }}>
                        {doc.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <StatusIcon size={13} style={{ color: status.color }} />
                        <span className="text-[12px]" style={{ color: status.color }}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </motion.div>
                );
              })}
            </div>

            <p className="text-muted-foreground text-[12px] mt-6">
              Securely share your verified renter profile with landlords. Documents are encrypted and only shared with your explicit consent.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}