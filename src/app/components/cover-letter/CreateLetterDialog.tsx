import { useState } from "react";
import { Loader2, Download, FileDown, CheckCircle2, AlertTriangle } from "lucide-react";
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
  generateCoverLetter,
  extractPlaceholders,
  suggestPlaceholderOptions,
} from "../../../lib/groq";
import { exportCoverLetterToPdf, downloadAsText } from "../../../lib/coverLetterPdf";

const PERSONAL_KEYWORDS = [
  "phone", "address", "employer", "salary", "income", "ssn", "social security",
  "bank", "account", "signature", "current address", "zip", "postal",
];

function isPersonalPlaceholder(label: string): boolean {
  const lower = label.toLowerCase();
  return PERSONAL_KEYWORDS.some((kw) => lower.includes(kw));
}

type Step = "form" | "generating" | "filling" | "editing";

interface PlaceholderState {
  raw: string; // e.g. "[Your Phone Number — so the landlord can contact you]"
  label: string; // e.g. "Your Phone Number"
  hint: string; // e.g. "so the landlord can contact you"
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

export function CreateLetterDialog({ open, onOpenChange }: Props) {
  const { profile } = useAuth();
  const { documents } = useUserDocuments();

  const [step, setStep] = useState<Step>("form");
  const [landlordName, setLandlordName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [letter, setLetter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [placeholders, setPlaceholders] = useState<PlaceholderState[]>([]);

  const reset = () => {
    setStep("form");
    setLandlordName("");
    setPropertyAddress("");
    setLetter("");
    setError(null);
    setPlaceholders([]);
  };

  const handleGenerate = async () => {
    setStep("generating");
    setError(null);
    try {
      const result = await generateCoverLetter(
        profile,
        documents,
        landlordName || undefined,
        propertyAddress || undefined
      );
      setLetter(result);

      const found = extractPlaceholders(result);
      if (found.length > 0) {
        const states: PlaceholderState[] = found.map((raw) => {
          const inner = raw.slice(1, -1); // strip [ ]
          const dashIdx = inner.indexOf(" — ");
          const label = dashIdx !== -1 ? inner.slice(0, dashIdx).trim() : inner;
          const hint = dashIdx !== -1 ? inner.slice(dashIdx + 3).trim() : "";
          return {
            raw,
            label,
            hint,
            isPersonal: isPersonalPlaceholder(inner),
            options: [],
            loadingOptions: false,
            selected: "",
            customValue: "",
          };
        });
        setPlaceholders(states);

        // Fetch suggestions for non-personal placeholders
        const nonPersonal = states.filter((p) => !p.isPersonal);
        if (nonPersonal.length > 0) {
          setPlaceholders((prev) =>
            prev.map((p) =>
              p.isPersonal ? p : { ...p, loadingOptions: true }
            )
          );

          await Promise.all(
            nonPersonal.map(async (p) => {
              try {
                const options = await suggestPlaceholderOptions(p.label, result);
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
        setStep("editing");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate letter.");
      setStep("form");
    }
  };

  const handleApplyFills = () => {
    let filled = letter;
    for (const p of placeholders) {
      const value = p.selected === "__custom__" ? p.customValue : p.selected;
      if (value) {
        filled = filled.replaceAll(p.raw, value);
      }
    }
    setLetter(filled);
    setStep("editing");
  };

  const updatePlaceholder = (
    raw: string,
    update: Partial<PlaceholderState>
  ) => {
    setPlaceholders((prev) =>
      prev.map((p) => (p.raw === raw ? { ...p, ...update } : p))
    );
  };

  const userName = profile
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
    : undefined;

  const allFilled = placeholders.every((p) => {
    if (p.isPersonal) return true; // personal ones are optional to fill now
    if (p.selected === "__custom__") return p.customValue.trim() !== "";
    return p.selected !== "";
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Cover Letter</DialogTitle>
          <DialogDescription>
            AI will craft a professional rental cover letter using your profile
          </DialogDescription>
        </DialogHeader>

        {step === "form" && (
          <div className="flex flex-col gap-4 py-2">
            <div>
              <label className="text-foreground text-[13px] mb-1.5 block" style={{ fontWeight: 500 }}>
                Landlord / Property Manager Name
                <span className="text-muted-foreground"> (optional)</span>
              </label>
              <input
                type="text"
                value={landlordName}
                onChange={(e) => setLandlordName(e.target.value)}
                placeholder="e.g. John Smith"
                className="w-full rounded-lg border border-input bg-black text-white px-3 py-2 text-sm placeholder:text-neutral-400 outline-none focus:border-ring focus:ring-ring/50 focus:ring-[3px] transition-[color,box-shadow]"
              />
            </div>
            <div>
              <label className="text-foreground text-[13px] mb-1.5 block" style={{ fontWeight: 500 }}>
                Property Address
                <span className="text-muted-foreground"> (optional)</span>
              </label>
              <input
                type="text"
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
                placeholder="e.g. 123 Main St, Apt 4B"
                className="w-full rounded-lg border border-input bg-black text-white px-3 py-2 text-sm placeholder:text-neutral-400 outline-none focus:border-ring focus:ring-ring/50 focus:ring-[3px] transition-[color,box-shadow]"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 text-red-500 rounded-lg px-3 py-2 text-[13px]">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              className="bg-[#10B981] text-white px-5 py-2.5 rounded-xl text-[14px] hover:bg-[#10B981]/90 transition-colors self-end"
              style={{ fontWeight: 600 }}
            >
              Generate Letter
            </button>
          </div>
        )}

        {step === "generating" && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 text-[#10B981] animate-spin" />
            <p className="text-muted-foreground text-[14px]">Crafting your letter...</p>
          </div>
        )}

        {step === "filling" && (
          <div className="flex flex-col gap-4 py-2">
            <div className="bg-amber-500/10 rounded-lg px-3 py-2 flex items-start gap-2 border border-amber-500/15">
              <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <span className="text-amber-600 dark:text-amber-400 text-[13px]" style={{ fontWeight: 500 }}>
                Your letter has some blanks to fill in. Choose an option or type your own for each.
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
                      Personal info — you'll need to fill this in yourself
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
                          className="w-full mt-2 rounded-lg border border-input bg-black text-white px-3 py-2 text-sm placeholder:text-neutral-400 outline-none focus:border-ring focus:ring-ring/50 focus:ring-[3px] transition-[color,box-shadow]"
                        />
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-1">
              <button
                onClick={() => setStep("editing")}
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

        {step === "editing" && (
          <div className="flex flex-col gap-4 py-2">
            <div className="bg-[#10B981]/10 rounded-lg px-3 py-2 flex items-center gap-2 border border-[#10B981]/15">
              <CheckCircle2 size={16} className="text-[#10B981] shrink-0" />
              <span className="text-[#10B981] text-[13px]" style={{ fontWeight: 500 }}>
                Letter generated — edit below before downloading
              </span>
            </div>

            <Textarea
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              className="min-h-[300px] text-[13px] leading-relaxed font-mono bg-black text-white placeholder:text-neutral-400"
            />

            <DialogFooter>
              <button
                onClick={() => downloadAsText(letter)}
                className="flex items-center gap-2 bg-muted text-foreground px-4 py-2 rounded-xl text-[13px] hover:bg-accent transition-colors"
                style={{ fontWeight: 500 }}
              >
                <Download size={15} />
                Download as Text
              </button>
              <button
                onClick={() => exportCoverLetterToPdf(letter, userName)}
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
