import { useState } from "react";
import { FileText, Sparkles, Upload } from "lucide-react";
import { motion } from "motion/react";
import { CreateLetterDialog } from "./CreateLetterDialog";
import { UploadLetterDialog } from "./UploadLetterDialog";

export function CoverLetterSection() {
  const [createOpen, setCreateOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-10"
      >
        <div className="flex items-center gap-2.5 mb-1.5">
          <FileText size={20} className="text-[#10B981]" />
          <h3 className="text-foreground text-[18px]" style={{ fontWeight: 600 }}>
            Cover Letter
          </h3>
        </div>
        <p className="text-muted-foreground text-[13px] mb-4">
          Create a professional cover letter to stand out to landlords
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setCreateOpen(true)}
            className="bg-card rounded-2xl border border-border p-5 text-left hover:border-[#10B981]/40 transition-colors group"
          >
            <div className="w-11 h-11 rounded-xl bg-[#10B981]/15 flex items-center justify-center mb-3">
              <Sparkles size={20} className="text-[#10B981]" />
            </div>
            <p className="text-foreground text-[15px] mb-1" style={{ fontWeight: 600 }}>
              Create New Letter
            </p>
            <p className="text-muted-foreground text-[13px]">
              AI generates a tailored letter from your profile data
            </p>
          </button>

          <button
            onClick={() => setUploadOpen(true)}
            className="bg-card rounded-2xl border border-border p-5 text-left hover:border-muted-foreground/30 transition-colors group"
          >
            <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center mb-3">
              <Upload size={20} className="text-muted-foreground" />
            </div>
            <p className="text-foreground text-[15px] mb-1" style={{ fontWeight: 600 }}>
              Upload Existing Letter
            </p>
            <p className="text-muted-foreground text-[13px]">
              Upload a .txt file and let AI improve it for you
            </p>
          </button>
        </div>
      </motion.div>

      <CreateLetterDialog open={createOpen} onOpenChange={setCreateOpen} />
      <UploadLetterDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </>
  );
}
