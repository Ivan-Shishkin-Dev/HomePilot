import { useState, useRef } from "react";
import { Loader2, Download, FileDown, Upload, CheckCircle2 } from "lucide-react";
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
import { improveCoverLetter } from "../../../lib/groq";
import { exportCoverLetterToPdf, downloadAsText } from "../../../lib/coverLetterPdf";

type Step = "upload" | "analyzing" | "results";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadLetterDialog({ open, onOpenChange }: Props) {
  const { profile } = useAuth();
  const { documents } = useUserDocuments();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [originalText, setOriginalText] = useState("");
  const [improvedText, setImprovedText] = useState("");
  const [changes, setChanges] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  const reset = () => {
    setStep("upload");
    setOriginalText("");
    setImprovedText("");
    setChanges([]);
    setError(null);
    setFileName("");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);

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
      setImprovedText(result.improvedLetter);
      setChanges(result.changes);
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze letter.");
      setStep("upload");
    }
  };

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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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
              accept=".txt,.text"
              onChange={handleFileSelect}
              className="hidden"
            />

            {!originalText ? (
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
                    Supports .txt files
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
                  className="min-h-[200px] text-[13px] leading-relaxed font-mono opacity-80 bg-black text-white placeholder:text-neutral-400"
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
                Apply Changes
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

        {step === "results" && (
          <div className="flex flex-col gap-4 py-2">
            <div className="bg-[#10B981]/10 rounded-lg px-4 py-3 border border-[#10B981]/15">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={16} className="text-[#10B981] shrink-0" />
                <span className="text-[#10B981] text-[13px]" style={{ fontWeight: 600 }}>
                  Improvements applied
                </span>
              </div>
              {changes.length > 0 && (
                <ul className="list-disc list-inside text-[#10B981]/80 text-[12px] space-y-0.5 ml-1">
                  {changes.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              )}
            </div>

            <Textarea
              value={improvedText}
              onChange={(e) => setImprovedText(e.target.value)}
              className="min-h-[300px] text-[13px] leading-relaxed font-mono bg-black text-white placeholder:text-neutral-400"
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
