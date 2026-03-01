import { useState, useRef } from "react";
import { Loader2, Download, FileDown, Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { useAuth } from "../../../contexts/AuthContext";
import { useUserDocuments } from "../../../hooks/useSupabaseData";
import {
  improveCoverLetter,
  extractPlaceholders,
  suggestPlaceholderOptions,
} from "../../../lib/groq";
import { exportCoverLetterToPdf, downloadAsText } from "../../../lib/coverLetterPdf";
import { extractTextFromPdf } from "../../../lib/pdfText";
import type { Profile } from "../../../lib/supabase";
import type { UserDocument } from "../../../lib/supabase";

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB

/** If this placeholder is already in passport/profile, return the value to auto-fill; else null (show card). */
function getAutoFillForPlaceholder(
  inner: string,
  profile: Profile | null,
  documents: UserDocument[]
): string | null {
  const lower = inner.toLowerCase();
  const hasDoc = (icon: string) =>
    documents.some((d) => d.icon === icon && d.status !== "missing");

  if (lower.includes("email") && profile?.email) return profile.email;
  if ((lower.includes("full name") || lower.includes("applicant name") || lower.includes("your name")) && (profile?.first_name || profile?.last_name)) {
    return `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
  }
  if (lower.includes("phone") && profile?.phone) return profile.phone;
  if ((lower.includes("preferred cit") || lower.includes("location") || lower.includes("searching in")) && profile?.preferred_cities?.[0]) {
    return profile.preferred_cities[0];
  }
  if ((lower.includes("move-in") || lower.includes("move in") || lower.includes("availability")) && profile?.move_in_date) {
    try {
      return new Date(profile.move_in_date).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    } catch {
      return profile.move_in_date;
    }
  }
  if ((lower.includes("budget") || lower.includes("monthly rent")) && (profile?.max_budget != null || profile?.min_budget != null)) {
    if (profile.min_budget != null && profile.max_budget != null) {
      return `$${profile.min_budget.toLocaleString()}–$${profile.max_budget.toLocaleString()}/month`;
    }
    if (profile.max_budget != null) return `Up to $${profile.max_budget.toLocaleString()}/month`;
    if (profile.min_budget != null) return `From $${profile.min_budget.toLocaleString()}/month`;
  }

  if (lower.includes("credit") && hasDoc("credit")) return "Available upon request";
  if (lower.includes("employment") && hasDoc("employment")) return "Available upon request";
  if (lower.includes("employment letter") && hasDoc("employment")) return "Available upon request";
  if ((lower.includes("proof of income") || lower.includes("income")) && hasDoc("income")) return "Available upon request";
  if ((lower.includes("bank statement") || lower.includes("bank")) && hasDoc("bank")) return "Available upon request";
  if ((lower.includes("government id") || lower.includes(" id ") || lower.includes("identification")) && hasDoc("id")) return "Available upon request";
  if (lower.includes("reference") && hasDoc("references")) return "Available upon request";

  return null;
}

const PERSONAL_KEYWORDS = [
  "phone", "address", "employer", "salary", "income", "ssn", "social security",
  "bank", "account", "signature", "current address", "zip", "postal",
];

function isPersonalPlaceholder(label: string): boolean {
  const lower = label.toLowerCase();
  return PERSONAL_KEYWORDS.some((kw) => lower.includes(kw));
}

/** Filter out brackets that are AI change descriptions, not real placeholders (e.g. "Added a formal greeting..."). */
function isLikelyChangeDescription(inner: string): boolean {
  const t = inner.trim();
  const changeStarts = ["added ", "incorporated ", "mentioned ", "updated ", "improved ", "strengthened ", "included ", "highlighted ", "expanded "];
  if (changeStarts.some((s) => t.toLowerCase().startsWith(s))) return true;
  if (t.length > 70 && !t.includes(" — ")) return true;
  return false;
}

/** Only these listing-specific blanks are worth prompting for; everything else user can edit in the letter. */
const NECESSITY_KEYWORDS = [
  "property manager", "property owner", "owner name", "landlord", "manager name",
  "building name", "property address", "listing address", "rental address", "unit",
];
function isNecessityPlaceholder(inner: string): boolean {
  const lower = inner.toLowerCase();
  return NECESSITY_KEYWORDS.some((kw) => lower.includes(kw));
}

type Step = "upload" | "analyzing" | "filling" | "results";

interface PlaceholderState {
  raw: string;
  label: string;
  hint: string;
  isPersonal: boolean;
  options: string[];
  loadingOptions: boolean;
  selected: string;
  customValue: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadLetterDialog({ open, onOpenChange }: Props) {
  const { profile } = useAuth();
  const { documents } = useUserDocuments();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [extractingText, setExtractingText] = useState(false);
  const [originalText, setOriginalText] = useState("");
  const [improvedText, setImprovedText] = useState("");
  const [changes, setChanges] = useState<string[]>([]);
  const [placeholders, setPlaceholders] = useState<PlaceholderState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const reset = () => {
    setStep("upload");
    setExtractingText(false);
    setOriginalText("");
    setImprovedText("");
    setChanges([]);
    setPlaceholders([]);
    setError(null);
    setFileName("");
  };

  const updatePlaceholder = (raw: string, update: Partial<PlaceholderState>) => {
    setPlaceholders((prev) =>
      prev.map((p) => (p.raw === raw ? { ...p, ...update } : p))
    );
  };

  const isPdf = (file: File) =>
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);

    if (isPdf(file)) {
      if (file.size > MAX_PDF_BYTES) {
        setError("PDF is too large. Maximum size is 10 MB.");
        return;
      }
      setExtractingText(true);
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const buffer = ev.target?.result;
        if (!(buffer instanceof ArrayBuffer)) {
          setError("Could not read PDF.");
          setExtractingText(false);
          return;
        }
        try {
          const text = await extractTextFromPdf(buffer);
          if (!text || !text.trim()) {
            setError("No selectable text found in this PDF. Try a PDF with selectable text, or upload a .txt file.");
          } else {
            setOriginalText(text);
          }
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Failed to extract text from PDF. The file may be encrypted or corrupted."
          );
        } finally {
          setExtractingText(false);
        }
      };
      reader.onerror = () => {
        setError("Failed to read file.");
        setExtractingText(false);
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    // .txt
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === "string") {
        setOriginalText(text);
      } else {
        setError("Could not read file contents.");
      }
    };
    reader.onerror = () => setError("Failed to read file.");
    reader.readAsText(file);
  };

  const handleImprove = async () => {
    setStep("analyzing");
    setError(null);
    try {
      const result = await improveCoverLetter(originalText, profile, documents);
      let letter = result.improvedLetter.trim();
      setChanges(result.changes);

      const found = extractPlaceholders(letter);
      const realPlaceholders = found.filter((raw) => !isLikelyChangeDescription(raw.slice(1, -1)));
      const changeLikeBrackets = found.filter((raw) => isLikelyChangeDescription(raw.slice(1, -1)));

      for (const raw of changeLikeBrackets) {
        letter = letter.replaceAll(raw, "");
      }

      const placeholdersToShow: PlaceholderState[] = [];
      for (const raw of realPlaceholders) {
        const inner = raw.slice(1, -1);
        const autoFill = getAutoFillForPlaceholder(inner, profile, documents);
        if (autoFill != null) {
          letter = letter.replaceAll(raw, autoFill);
          continue;
        }
        if (!isNecessityPlaceholder(inner)) {
          letter = letter.replaceAll(raw, "");
          continue;
        }
        const dashIdx = inner.indexOf(" — ");
        const label = dashIdx !== -1 ? inner.slice(0, dashIdx).trim() : inner;
        const hint = dashIdx !== -1 ? inner.slice(dashIdx + 3).trim() : "";
        placeholdersToShow.push({
          raw,
          label,
          hint,
          isPersonal: isPersonalPlaceholder(inner),
          options: [],
          loadingOptions: false,
          selected: "",
          customValue: "",
        });
      }
      setImprovedText(letter);
      setPlaceholders(placeholdersToShow);

      if (placeholdersToShow.length > 0) {
        const nonPersonal = placeholdersToShow.filter((p) => !p.isPersonal);
        if (nonPersonal.length > 0) {
          setPlaceholders((prev) =>
            prev.map((p) => (p.isPersonal ? p : { ...p, loadingOptions: true }))
          );
          await Promise.all(
            nonPersonal.map(async (p) => {
              try {
                const options = await suggestPlaceholderOptions(p.label, letter);
                setPlaceholders((prev) =>
                  prev.map((s) =>
                    s.raw === p.raw ? { ...s, options, loadingOptions: false } : s
                  )
                );
              } catch {
                setPlaceholders((prev) =>
                  prev.map((s) =>
                    s.raw === p.raw ? { ...s, loadingOptions: false } : s
                  )
                );
              }
            })
          );
        }
        setStep("filling");
      } else {
        setStep("results");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze letter.");
      setStep("upload");
    }
  };

  const handleApplyFills = () => {
    let filled = improvedText;
    for (const p of placeholders) {
      const value = p.selected === "__custom__" ? p.customValue : p.selected;
      filled = filled.replaceAll(p.raw, value || "");
    }
    setImprovedText(filled);
    setStep("results");
  };

  const handleSkipFills = () => {
    let cleaned = improvedText;
    for (const p of placeholders) {
      cleaned = cleaned.replaceAll(p.raw, "");
    }
    setImprovedText(cleaned);
    setStep("results");
  };

  const allFilled =
    placeholders.length === 0 ||
    placeholders.every((p) => {
      if (p.isPersonal) return true;
      if (p.selected === "__custom__") return p.customValue.trim() !== "";
      return p.selected !== "";
    });

  const userName = profile
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
    : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <DialogTitle>Improve Cover Letter</DialogTitle>
          <DialogDescription>
            Upload your existing letter and let AI enhance it
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col gap-4 py-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.text,.pdf,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            {extractingText ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 border-2 border-dashed border-border rounded-2xl">
                <Loader2 className="w-8 h-8 text-[#10B981] animate-spin" />
                <p className="text-muted-foreground text-[14px]">Extracting text from PDF...</p>
              </div>
            ) : !originalText ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-2xl p-10 flex flex-col items-center gap-3 hover:border-muted-foreground/40 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Upload size={22} className="text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-foreground text-[14px]" style={{ fontWeight: 500 }}>
                    Click to upload your cover letter
                  </p>
                  <p className="text-muted-foreground text-[12px] mt-1">
                    Supports .txt and .pdf files (PDF must have selectable text)
                  </p>
                </div>
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-foreground text-[13px]" style={{ fontWeight: 500 }}>
                    {fileName}
                  </p>
                  <button
                    onClick={() => {
                      setOriginalText("");
                      setFileName("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-muted-foreground text-[12px] hover:text-foreground transition-colors"
                  >
                    Remove
                  </button>
                </div>
                <Textarea
                  value={originalText}
                  readOnly
                  className="min-h-[200px] text-[13px] leading-relaxed font-mono opacity-80 bg-background text-foreground placeholder:text-muted-foreground scrollbar-hide"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 text-red-500 rounded-lg px-3 py-2 text-[13px]">
                {error}
              </div>
            )}

            {originalText && (
              <button
                onClick={handleImprove}
                className="bg-[#10B981] text-white px-5 py-2.5 rounded-xl text-[14px] hover:bg-[#10B981]/90 transition-colors self-end"
                style={{ fontWeight: 600 }}
              >
                Improve letter
              </button>
            )}
          </div>
        )}

        {step === "analyzing" && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 text-[#10B981] animate-spin" />
            <p className="text-muted-foreground text-[14px]">Analyzing your letter...</p>
          </div>
        )}

        {step === "filling" && (
          <div className="flex flex-col gap-4 py-2">
            <div className="bg-amber-500/10 rounded-lg px-3 py-2 flex items-start gap-2 border border-amber-500/15">
              <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <span className="text-amber-600 dark:text-amber-400 text-[13px]" style={{ fontWeight: 500 }}>
                Add property manager or owner name if you know it — or skip to edit in the letter below.
              </span>
            </div>

            <div className="flex flex-col gap-5">
              {placeholders.map((p) => (
                <div key={p.raw} className="bg-card rounded-xl border border-border p-4">
                  <p className="text-foreground text-[14px] mb-0.5" style={{ fontWeight: 600 }}>
                    {p.label}
                  </p>
                  {p.hint && (
                    <p className="text-muted-foreground text-[12px] mb-1 italic">
                      {p.hint}
                    </p>
                  )}
                  {p.isPersonal && (
                    <p className="text-amber-500 text-[12px] mb-2">
                      Personal info — fill this in yourself
                    </p>
                  )}
                  {p.loadingOptions ? (
                    <div className="flex items-center gap-2 py-2">
                      <Loader2 size={14} className="text-muted-foreground animate-spin" />
                      <span className="text-muted-foreground text-[12px]">Loading suggestions...</span>
                    </div>
                  ) : (
                    <>
                      {p.options.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {p.options.map((opt, i) => (
                            <button
                              key={i}
                              onClick={() =>
                                updatePlaceholder(p.raw, {
                                  selected: p.selected === opt ? "" : opt,
                                })
                              }
                              className={`px-3 py-1.5 rounded-lg text-[13px] border transition-colors ${
                                p.selected === opt
                                  ? "border-[#10B981] bg-[#10B981]/15 text-[#10B981]"
                                  : "border-border bg-muted text-foreground hover:border-muted-foreground/40"
                              }`}
                              style={{ fontWeight: p.selected === opt ? 600 : 400 }}
                            >
                              {opt}
                            </button>
                          ))}
                          <button
                            onClick={() =>
                              updatePlaceholder(p.raw, {
                                selected: p.selected === "__custom__" ? "" : "__custom__",
                              })
                            }
                            className={`px-3 py-1.5 rounded-lg text-[13px] border transition-colors ${
                              p.selected === "__custom__"
                                ? "border-[#10B981] bg-[#10B981]/15 text-[#10B981]"
                                : "border-border bg-muted text-foreground hover:border-muted-foreground/40"
                            }`}
                            style={{ fontWeight: p.selected === "__custom__" ? 600 : 400 }}
                          >
                            Custom...
                          </button>
                        </div>
                      )}
                      {(p.selected === "__custom__" || (p.isPersonal && p.options.length === 0)) && (
                        <input
                          type="text"
                          value={p.customValue}
                          onChange={(e) =>
                            updatePlaceholder(p.raw, {
                              customValue: e.target.value,
                              selected: "__custom__",
                            })
                          }
                          placeholder={`Type your ${p.label.toLowerCase()}...`}
                          className="w-full mt-2 rounded-lg border border-input bg-background text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-ring/50 focus:ring-[3px] transition-[color,box-shadow]"
                        />
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-1">
              <button
                onClick={handleSkipFills}
                className="text-muted-foreground text-[13px] hover:text-foreground transition-colors"
              >
                Skip — I'll edit manually
              </button>
              <button
                onClick={handleApplyFills}
                disabled={!allFilled}
                className="bg-[#10B981] text-white px-5 py-2.5 rounded-xl text-[14px] hover:bg-[#10B981]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontWeight: 600 }}
              >
                Apply & Continue
              </button>
            </div>
          </div>
        )}

        {step === "results" && (
          <div className="flex flex-col gap-4 py-2">
            <Textarea
              value={improvedText}
              onChange={(e) => setImprovedText(e.target.value)}
              className="min-h-[300px] text-[13px] leading-relaxed font-mono bg-background text-foreground placeholder:text-muted-foreground scrollbar-hide"
              placeholder="Your improved letter — edit as needed"
            />

            <DialogFooter>
              <button
                onClick={() => downloadAsText(improvedText)}
                className="flex items-center gap-2 bg-muted text-foreground px-4 py-2 rounded-xl text-[13px] hover:bg-accent transition-colors"
                style={{ fontWeight: 500 }}
              >
                <Download size={15} />
                Download as Text
              </button>
              <button
                onClick={() => exportCoverLetterToPdf(improvedText, userName)}
                className="flex items-center gap-2 bg-[#10B981] text-white px-4 py-2 rounded-xl text-[13px] hover:bg-[#10B981]/90 transition-colors"
                style={{ fontWeight: 500 }}
              >
                <FileDown size={15} />
                Download as PDF
              </button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
