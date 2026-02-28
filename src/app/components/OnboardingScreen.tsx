import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  ArrowLeft,
  MapPin,
  DollarSign,
  Bed,
  Shield,
  Upload,
  CheckCircle2,
  Sparkles,
  Building2,
  PawPrint,
  Car,
  Train,
  Dumbbell,
  Coffee,
  Loader2,
  X,
} from "lucide-react";
import { useUserDocuments, useDocumentUpload } from "../../hooks/useSupabaseData";
  Sun,
  Moon,
} from "lucide-react";
import { Logo } from "./Logo";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "../../contexts/AuthContext";

const TOTAL_STEPS = 4;

export function OnboardingScreen() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, profile } = useAuth();
  const [step, setStep] = useState(0);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Prefill name and email from sign-up (profile or user metadata)
  useEffect(() => {
    if (!name.trim() || !email.trim()) {
      const fullName =
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
        [user?.user_metadata?.first_name, user?.user_metadata?.last_name].filter(Boolean).join(" ").trim();
      const emailValue = profile?.email ?? user?.email ?? "";
      if (fullName && !name.trim()) setName(fullName);
      if (emailValue && !email.trim()) setEmail(emailValue);
    }
  }, [user, profile]);
  const [city, setCity] = useState("");
  const [budgetMin, setBudgetMin] = useState("1000");
  const [budgetMax, setBudgetMax] = useState("2500");
  const [beds, setBeds] = useState("1");
  const [moveDate, setMoveDate] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [localUploadedDocs, setLocalUploadedDocs] = useState<string[]>([]);

  // Auth context
  const { user } = useAuth();

  // Document upload from Supabase
  const { documents: dbDocuments, refetch: refetchDocs } = useUserDocuments();
  const { triggerUpload, uploading, fileInputRef, handleFileChange, removeDocument } = useDocumentUpload();

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

  const amenities = [
    { id: "pet", label: "Pet Friendly", icon: PawPrint },
    { id: "parking", label: "Parking", icon: Car },
    { id: "transit", label: "Near Transit", icon: Train },
    { id: "gym", label: "Gym", icon: Dumbbell },
    { id: "laundry", label: "In-unit W/D", icon: Building2 },
    { id: "coffee", label: "Near Coffee", icon: Coffee },
  ];

  const documents = [
    { id: "gov_id", label: "Government ID" },
    { id: "income", label: "Proof of Income" },
    { id: "bank", label: "Bank Statements" },
    { id: "employment", label: "Employment Letter" },
    { id: "credit", label: "Credit Authorization" },
    { id: "references", label: "References" },
  ];

  const toggleAmenity = (id: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleDocClick = async (onboardingId: string) => {
    if (hasDbDocs) {
      // Supabase flow: open file picker and update DB
      const dbIcon = onboardingToDbIcon[onboardingId];
      const dbDoc = dbDocuments.find(d => d.icon === dbIcon);
      if (dbDoc && dbDoc.status === "missing") {
        triggerUpload(dbDoc.id, refetchDocs);
      }
    } else if (user) {
      // User is authenticated but DB docs haven't loaded yet — retry fetch then upload
      await refetchDocs();
    } else {
      // Fallback: local toggle (user not authenticated)
      setLocalUploadedDocs(prev =>
        prev.includes(onboardingId) ? prev.filter(d => d !== onboardingId) : [...prev, onboardingId]
      );
    }
  };

  const isDocUploaded = (onboardingId: string) => {
    if (hasDbDocs) {
      const dbIcon = onboardingToDbIcon[onboardingId];
      const dbDoc = dbDocuments.find(d => d.icon === dbIcon);
      return dbDoc ? dbDoc.status !== "missing" : false;
    }
    return localUploadedDocs.includes(onboardingId);
  };

  const uploadedCount = hasDbDocs
    ? dbDocuments.filter(d => d.status !== "missing").length
    : localUploadedDocs.length;

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const canProceed = () => {
    if (step === 0) return name.trim().length > 0 && email.trim().length > 0;
    if (step === 1) return city.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      navigate("/home");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#111117] to-[#0a0a0f] text-white flex flex-col">
      {/* Ambient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 right-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 -left-20 w-[300px] h-[300px] bg-green-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Header with logo */}
      <div className="relative z-10 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo className="w-8 h-8" />
          <span className="text-[18px] text-foreground" style={{ fontWeight: 700 }}>
            HomePilot
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl bg-muted hover:bg-accent transition-colors flex items-center justify-center"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <Sun size={18} className="text-muted-foreground" />
            ) : (
              <Moon size={18} className="text-muted-foreground" />
            )}
          </button>
          <button
            onClick={() => navigate("/")}
            className="text-muted-foreground text-[14px] hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="relative z-10 px-6 mb-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-[13px]">
              Step {step + 1} of {TOTAL_STEPS}
            </span>
            <span className="text-gray-500 text-[13px]">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 relative z-10 px-6 flex items-start justify-center">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {/* Step 1: Basic Info */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-[28px] md:text-[36px] mb-2" style={{ fontWeight: 700 }}>
                  Let's get started
                </h2>
                <p className="text-gray-400 text-[16px] mb-10">
                  Tell us a bit about yourself to set up your Renter Passport.
                </p>
                <div className="space-y-5">
                  <div>
                    <label className="text-[14px] text-gray-300 mb-2 block" style={{ fontWeight: 500 }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Chen"
                      className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3.5 text-white text-[15px] placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[14px] text-gray-300 mb-2 block" style={{ fontWeight: 500 }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@email.com"
                      className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3.5 text-white text-[15px] placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Search Preferences */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-[28px] md:text-[36px] mb-2" style={{ fontWeight: 700 }}>
                  Where are you looking?
                </h2>
                <p className="text-gray-400 text-[16px] mb-10">
                  Set your location, budget, and move-in preferences.
                </p>
                <div className="space-y-5">
                  <div>
                    <label className="text-[14px] text-gray-300 mb-2 block" style={{ fontWeight: 500 }}>
                      <MapPin size={14} className="inline mr-1.5 text-blue-400" />
                      City or Neighborhood
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="New York, NY"
                      className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3.5 text-white text-[15px] placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[14px] text-gray-300 mb-2 block" style={{ fontWeight: 500 }}>
                        <DollarSign size={14} className="inline mr-1 text-green-400" />
                        Min Budget
                      </label>
                      <input
                        type="number"
                        value={budgetMin}
                        onChange={(e) => setBudgetMin(e.target.value)}
                        placeholder="1000"
                        className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3.5 text-white text-[15px] placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[14px] text-gray-300 mb-2 block" style={{ fontWeight: 500 }}>
                        Max Budget
                      </label>
                      <input
                        type="number"
                        value={budgetMax}
                        onChange={(e) => setBudgetMax(e.target.value)}
                        placeholder="2500"
                        className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3.5 text-white text-[15px] placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[14px] text-gray-300 mb-2 block" style={{ fontWeight: 500 }}>
                        <Bed size={14} className="inline mr-1.5 text-emerald-400" />
                        Bedrooms
                      </label>
                      <div className="flex gap-2">
                        {["Studio", "1", "2", "3+"].map((b) => (
                          <button
                            key={b}
                            onClick={() => setBeds(b)}
                            className={`flex-1 py-2.5 rounded-lg text-[13px] transition-all ${
                              beds === b
                                ? "bg-blue-500/20 border border-blue-500/40 text-blue-400"
                                : "bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:bg-white/[0.08]"
                            }`}
                            style={{ fontWeight: 500 }}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[14px] text-gray-300 mb-2 block" style={{ fontWeight: 500 }}>
                        Move-in Date
                      </label>
                      <input
                        type="date"
                        value={moveDate}
                        onChange={(e) => setMoveDate(e.target.value)}
                        className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3 text-white text-[14px] focus:outline-none focus:border-blue-500/50 transition-colors [color-scheme:dark]"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Amenities */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-[28px] md:text-[36px] mb-2" style={{ fontWeight: 700 }}>
                  What matters most?
                </h2>
                <p className="text-gray-400 text-[16px] mb-10">
                  Select the amenities that are most important to you. AI will prioritize matches accordingly.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {amenities.map((amenity) => {
                    const selected = selectedAmenities.includes(amenity.id);
                    return (
                      <button
                        key={amenity.id}
                        onClick={() => toggleAmenity(amenity.id)}
                        className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                          selected
                            ? "bg-blue-500/15 border-blue-500/30 text-white"
                            : "bg-white/[0.03] border-white/[0.08] text-gray-400 hover:bg-white/[0.06]"
                        }`}
                      >
                        <amenity.icon
                          size={20}
                          className={selected ? "text-blue-400" : "text-gray-500"}
                        />
                        <span className="text-[14px]" style={{ fontWeight: 500 }}>
                          {amenity.label}
                        </span>
                        {selected && (
                          <CheckCircle2 size={16} className="ml-auto text-blue-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-gray-600 text-[13px] mt-4">
                  {selectedAmenities.length} selected — you can change these later
                </p>
              </motion.div>
            )}

            {/* Step 4: Documents */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-[28px] md:text-[36px] mb-2" style={{ fontWeight: 700 }}>
                  Build your Passport
                </h2>
                <p className="text-gray-400 text-[16px] mb-4">
                  Upload documents to increase your approval rate. You can always add more later.
                </p>
                <div className="bg-gradient-to-r from-[#10B981]/10 to-[#10B981]/5 rounded-xl px-4 py-3 border border-[#10B981]/15 flex items-center gap-3 mb-8">
                  <Shield size={18} className="text-[#10B981]" />
                  <span className="text-[#10B981] text-[13px]" style={{ fontWeight: 500 }}>
                    All documents are encrypted with AES-256 and never shared without consent
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
                    return (
                      <button
                        key={doc.id}
                        onClick={() => handleDocClick(doc.id)}
                        disabled={uploading}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                          uploaded
                            ? "bg-[#10B981]/10 border-[#10B981]/20"
                            : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06]"
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            uploaded ? "bg-[#10B981]/15" : "bg-white/[0.05]"
                          }`}
                        >
                          {uploaded ? (
                            <CheckCircle2 size={20} className="text-[#10B981]" />
                          ) : uploading ? (
                            <Loader2 size={18} className="text-gray-500 animate-spin" />
                          ) : (
                            <Upload size={18} className="text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p
                            className={`text-[14px] ${uploaded ? "text-white" : "text-gray-300"}`}
                            style={{ fontWeight: 500 }}
                          >
                            {doc.label}
                          </p>
                          <p className="text-[12px] text-gray-500">
                            {uploaded ? "Uploaded — Pending verification" : "Click to upload"}
                          </p>
                        </div>
                        {uploaded ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (hasDbDocs) {
                                const dbIcon = onboardingToDbIcon[doc.id];
                                const dbDoc = dbDocuments.find(d => d.icon === dbIcon);
                                if (dbDoc) removeDocument(dbDoc.id, refetchDocs);
                              } else {
                                setLocalUploadedDocs(prev => prev.filter(d => d !== doc.id));
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-white/[0.1] transition-colors"
                          >
                            <X size={16} className="text-gray-400 hover:text-white" />
                          </button>
                        ) : (
                          <span className="text-blue-400 text-[13px]" style={{ fontWeight: 500 }}>
                            Upload
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-gray-600 text-[13px] mt-4">
                  {uploadedCount} of {documents.length} uploaded
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="relative z-10 px-6 py-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => (step > 0 ? setStep(step - 1) : navigate("/"))}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-[14px]"
          >
            <ArrowLeft size={16} />
            {step > 0 ? "Back" : "Home"}
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl text-[15px] transition-all ${
              canProceed()
                ? "bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-500 hover:to-green-500 shadow-lg shadow-emerald-500/20"
                : "bg-white/[0.06] text-gray-600 cursor-not-allowed"
            }`}
            style={{ fontWeight: 600 }}
          >
            {step === TOTAL_STEPS - 1 ? (
              <>
                <Sparkles size={18} />
                Launch Dashboard
              </>
            ) : (
              <>
                Continue
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}