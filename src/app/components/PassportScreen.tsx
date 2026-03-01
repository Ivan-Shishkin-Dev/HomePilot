import {
  FileText,
  DollarSign,
  Building2,
  Briefcase,
  CreditCard,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Download,
  Lock,
  Loader2,
  X,
  Eye,
} from "lucide-react";
import { ScoreRing } from "./ScoreRing";
import { useState } from "react";
import { useUserDocuments, useDocumentUpload, useDocumentFileUrl } from "../../hooks/useSupabaseData";
import { useAuth } from "../../contexts/AuthContext";
import { motion } from "motion/react";
import { exportPassportToPdf } from "../../lib/exportPassportPdf";

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

function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 800) return { label: "Excellent", color: "#10B981" };
  if (score >= 650) return { label: "Good", color: "#F59E0B" };
  return { label: "Poor", color: "#EF4444" };
}

type Doc = {
  id: string;
  name: string;
  status: string;
  icon: string;
  file_url: string | null;
};

function DocumentRow({
  doc,
  index,
  uploading,
  onUpload,
  onRemove,
}: {
  doc: Doc;
  index: number;
  uploading: boolean;
  onUpload: () => void;
  onRemove: () => void;
}) {
  const Icon = iconMap[doc.icon] || FileText;
  const status = statusConfig[doc.status as keyof typeof statusConfig];
  const StatusIcon = status.icon;
  const isMissing = doc.status === "missing";
  const { url: fileUrl, loading: urlLoading } = useDocumentFileUrl(doc.file_url);
  const isImage = fileUrl && /\.(jpe?g|png|gif|webp)$/i.test(doc.file_url ?? "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.05 }}
      onClick={onUpload}
      className={`bg-card rounded-xl p-4 border border-border flex items-center gap-4 transition-colors ${
        !uploading ? "hover:border-[#10B981]/30 cursor-pointer" : "cursor-default"
      }`}
    >
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
        {urlLoading ? (
          <Loader2 size={20} className="text-muted-foreground animate-spin" />
        ) : fileUrl && isImage ? (
          <img src={fileUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Icon size={20} className="text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-foreground text-[14px]" style={{ fontWeight: 500 }}>
          {doc.name}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <StatusIcon size={13} style={{ color: status.color }} />
          <span className="text-[12px]" style={{ color: status.color }}>
            {isMissing
              ? "Click to upload"
              : doc.status === "pending"
                ? "Processing"
                : doc.file_url
                  ? "Uploaded"
                  : status.label}
          </span>
        </div>
      </div>
      {isMissing ? (
        <ChevronRight size={16} className="text-muted-foreground shrink-0" />
      ) : (
        <div className="flex items-center gap-1 shrink-0">
          {doc.file_url && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (fileUrl) window.open(fileUrl);
              }}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-label="View document"
            >
              <Eye size={16} className="text-muted-foreground hover:text-foreground" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X size={16} className="text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

export function PassportScreen() {
  const { documents, loading, refetch: refetchDocs } = useUserDocuments();
  const { profile } = useAuth();
  const { triggerUpload, uploading, fileInputRef, handleFileChange, removeDocument } = useDocumentUpload();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportPdf = async () => {
    setExportError(null);
    setExporting(true);
    try {
      const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || null;
      await exportPassportToPdf(documents, fullName);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const uploaded = documents.filter((d) => d.status !== "missing").length;
  const total = documents.length || 1;
  const completionPct = profile?.profile_completion || Math.round((uploaded / total) * 100);
  const scoreLabel = getScoreLabel(profile?.renter_score ?? 0);

  const handleDocClick = (doc: typeof documents[number]) => {
    // Click to upload (if missing) or replace (if already has file)
    triggerUpload(doc.id, refetchDocs);
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
              Renter Passport
            </h1>
            <p className="text-muted-foreground text-[14px] mt-1">
              Your verified renter profile for instant applications
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#10B981]/10 rounded-xl px-3 py-2 border border-[#10B981]/15">
              <Lock size={16} className="text-[#10B981]" />
              <p className="text-[#10B981] text-[13px]" style={{ fontWeight: 600 }}>
                Bank-level encryption
              </p>
            </div>
            <button
              onClick={handleExportPdf}
              disabled={exporting || documents.filter((d) => d.file_url).length === 0}
              className="flex items-center gap-2 bg-[#10B981] text-white px-5 py-2.5 rounded-xl text-[14px] hover:bg-[#059669] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontWeight: 600 }}
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {exporting ? "Exporting…" : "Download Passport"}
            </button>
          </div>
          {exportError && (
            <p className="text-[#EF4444] text-[13px] mt-2">{exportError}</p>
          )}
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
              <p className="text-[15px] mt-4" style={{ fontWeight: 600, color: scoreLabel.color }}>
                {scoreLabel.label}
              </p>
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
                {uploaded} of {total} documents uploaded
              </p>
            </motion.div>
          </div>

          {/* Right Column: Documents */}
          <div className="lg:col-span-2">
            <h3 className="text-foreground text-[18px] mb-4" style={{ fontWeight: 600 }}>
              Documents
            </h3>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {documents.map((doc, i) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  index={i}
                  uploading={uploading}
                  onUpload={() => handleDocClick(doc)}
                  onRemove={() => removeDocument(doc.id, refetchDocs)}
                />
              ))}
            </div>

            <p className="text-muted-foreground text-[12px] mt-6">
              Download your passport to combine all uploaded documents into one easily shareable PDF you can send to landlords.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}