import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Shield,
  Upload,
  CheckCircle2,
  Sparkles,
  Loader2,
  X,
  Sun,
  Moon,
  Eye,
} from "lucide-react";
import {
  useUserDocuments,
  useDocumentUpload,
  getDocumentSignedUrl,
} from "../../hooks/useSupabaseData";
import { Logo } from "./Logo";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "../../contexts/AuthContext";

export function OnboardingScreen() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [localUploadedDocs, setLocalUploadedDocs] = useState<string[]>([]);

  // Document upload from Supabase
  const { documents: dbDocuments, refetch: refetchDocs } = useUserDocuments();
  const {
    triggerUpload,
    uploading,
    fileInputRef,
    handleFileChange,
    removeDocument,
  } = useDocumentUpload();

  // Map onboarding doc IDs to DB icon keys
  const onboardingToDbIcon: Record<string, string> = {
    gov_id: "id",
    income: "income",
    bank: "bank",
    employment: "employment",
    credit: "credit",
    references: "references",
  };

  const hasDbDocs = dbDocuments.length > 0;

  const documents = [
    { id: "gov_id", label: "Government ID" },
    { id: "income", label: "Proof of Income" },
    { id: "bank", label: "Bank Statements" },
    { id: "employment", label: "Employment Letter" },
    { id: "credit", label: "Credit Authorization" },
    { id: "references", label: "References" },
  ];

  const handleDocClick = async (onboardingId: string) => {
    if (hasDbDocs) {
      // Supabase flow: open file picker and update DB
      const dbIcon = onboardingToDbIcon[onboardingId];
      const dbDoc = dbDocuments.find((d) => d.icon === dbIcon);
      if (dbDoc && dbDoc.status === "missing") {
        triggerUpload(dbDoc.id, refetchDocs);
      }
    } else if (user) {
      // User is authenticated but DB docs haven't loaded yet — retry fetch then upload
      await refetchDocs();
    } else {
      // Fallback: local toggle (user not authenticated)
      setLocalUploadedDocs((prev) =>
        prev.includes(onboardingId)
          ? prev.filter((d) => d !== onboardingId)
          : [...prev, onboardingId],
      );
    }
  };

  const isDocUploaded = (onboardingId: string) => {
    if (hasDbDocs) {
      const dbIcon = onboardingToDbIcon[onboardingId];
      const dbDoc = dbDocuments.find((d) => d.icon === dbIcon);
      return dbDoc ? dbDoc.status !== "missing" : false;
    }
    return localUploadedDocs.includes(onboardingId);
  };

  const uploadedCount = hasDbDocs
    ? dbDocuments.filter((d) => d.status !== "missing").length
    : localUploadedDocs.length;

  const handleNext = () => navigate("/home");

  return (
    <div className="min-h-screen bg-background dark:bg-gradient-to-br dark:from-[#0a0a0f] dark:via-[#111117] dark:to-[#0a0a0f] text-foreground flex flex-col">
      {/* Ambient (dark mode only) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none dark:block hidden">
        <div className="absolute -top-40 right-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 -left-20 w-[300px] h-[300px] bg-green-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Header with logo */}
      <div className="relative z-10 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo className="w-8 h-8" />
          <span
            className="text-[18px] text-foreground"
            style={{ fontWeight: 700 }}
          >
            HomePilot
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl bg-muted hover:bg-accent transition-colors flex items-center justify-center"
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {theme === "dark" ? (
              <Sun size={18} className="text-muted-foreground" />
            ) : (
              <Moon size={18} className="text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative z-10 px-6 flex items-start justify-center">
        <div className="w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
                <div className="flex justify-start mb-1">
                  <button
                    onClick={() => navigate("/")}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-[14px]"
                  >
                    <ArrowLeft size={16} />
                    Home
                  </button>
                </div>
                <h2
                  className="text-[28px] md:text-[36px] mb-2"
                  style={{ fontWeight: 700 }}
                >
                  Build your Passport
                </h2>
                <p className="text-muted-foreground text-[16px] mb-4">
                  Upload documents to increase your approval rate. You can
                  always add more later.
                </p>
                <div className="bg-[#10B981]/10 dark:bg-gradient-to-r dark:from-[#10B981]/10 dark:to-[#10B981]/5 rounded-xl px-4 py-3 border border-[#10B981]/20 dark:border-[#10B981]/15 flex items-center gap-3 mb-8">
                  <Shield size={18} className="text-[#10B981]" />
                  <span
                    className="text-[#10B981] text-[13px]"
                    style={{ fontWeight: 500 }}
                  >
                    All documents are encrypted with AES-256 and never shared
                    without consent
                  </span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                />
                <div className="space-y-3">
                  {documents.map((doc) => {
                    const uploaded = isDocUploaded(doc.id);
                    const dbIcon = onboardingToDbIcon[doc.id];
                    const dbDoc = dbDocuments.find((d) => d.icon === dbIcon);
                    return (
                      <div
                        key={doc.id}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                          uploaded
                            ? "bg-[#10B981]/10 border-[#10B981]/20"
                            : "bg-muted/50 dark:bg-white/[0.03] border-border dark:border-white/[0.08]"
                        }`}
                      >
                        {uploaded ? (
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#10B981]/15"
                          >
                            <CheckCircle2
                              size={20}
                              className="text-[#10B981]"
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDocClick(doc.id)}
                            disabled={uploading}
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white/15 dark:bg-white/10 backdrop-blur-sm border border-white/20 dark:border-white/10 hover:bg-white/25 dark:hover:bg-white/15 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {uploading ? (
                              <Loader2
                                size={18}
                                className="text-muted-foreground animate-spin"
                              />
                            ) : (
                              <Upload size={18} className="text-muted-foreground" />
                            )}
                          </button>
                        )}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-[14px] ${uploaded ? "text-foreground" : "text-muted-foreground"}`}
                            style={{ fontWeight: 500 }}
                          >
                            {doc.label}
                          </p>
                          <p className="text-[12px] text-muted-foreground">
                            {uploaded
                              ? "Uploaded — Pending verification"
                              : "Click to upload"}
                          </p>
                        </div>
                        {uploaded ? (
                          <div className="flex items-center gap-1">
                            {dbDoc?.file_url && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const url = await getDocumentSignedUrl(dbDoc.file_url);
                                  if (url) window.open(url);
                                }}
                                className="p-1.5 rounded-lg hover:bg-muted dark:hover:bg-white/[0.1] transition-colors"
                                aria-label="View document"
                              >
                                <Eye
                                  size={16}
                                  className="text-muted-foreground hover:text-foreground"
                                />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (hasDbDocs && dbDoc) {
                                  removeDocument(dbDoc.id, refetchDocs);
                                } else {
                                  setLocalUploadedDocs((prev) =>
                                    prev.filter((d) => d !== doc.id),
                                  );
                                }
                              }}
                              className="p-1.5 rounded-lg hover:bg-muted dark:hover:bg-white/[0.1] transition-colors"
                            >
                              <X
                                size={16}
                                className="text-muted-foreground hover:text-foreground"
                              />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDocClick(doc.id)}
                            disabled={uploading}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium bg-white/15 dark:bg-white/10 backdrop-blur-sm border border-white/20 dark:border-white/10 text-foreground hover:bg-white/25 dark:hover:bg-white/15 transition-colors disabled:opacity-50 cursor-pointer"
                            style={{ fontWeight: 500 }}
                          >
                            <Upload size={14} />
                            Upload
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-muted-foreground text-[13px] mt-4">
                  {uploadedCount} of {documents.length} uploaded
                </p>
          </motion.div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="relative z-10 px-6 py-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/home")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-[14px]"
          >
            Skip for now
          </button>
          <button
            onClick={handleNext}
            disabled={uploadedCount < 1}
            className="flex items-center gap-2 px-8 py-3 rounded-xl text-[15px] transition-all bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-500 hover:to-green-500 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-emerald-600 disabled:hover:to-green-600"
            style={{ fontWeight: 600 }}
          >
            <Sparkles size={18} />
            Launch Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
