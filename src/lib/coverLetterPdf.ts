import { PDFDocument, StandardFonts } from "pdf-lib";

/**
 * Export cover letter text to a formatted A4 PDF and trigger download.
 */
export async function exportCoverLetterToPdf(
  letterText: string,
  userName?: string
): Promise<void> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontSize = 12;
  const lineHeight = fontSize * 1.5;
  const pageWidth = 595; // A4
  const pageHeight = 842;
  const margin = 72;
  const maxWidth = pageWidth - margin * 2;

  // Word-wrap text into lines that fit within maxWidth
  const wrapText = (text: string): string[] => {
    const result: string[] = [];
    for (const paragraph of text.split("\n")) {
      if (paragraph.trim() === "") {
        result.push("");
        continue;
      }
      const words = paragraph.split(/\s+/);
      let line = "";
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) {
          line = test;
        } else {
          if (line) result.push(line);
          line = word;
        }
      }
      if (line) result.push(line);
    }
    return result;
  };

  const lines = wrapText(letterText);
  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  for (const line of lines) {
    if (y < margin + lineHeight) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    if (line !== "") {
      page.drawText(line, { x: margin, y, size: fontSize, font });
    }
    y -= lineHeight;
  }

  const pdfBytes = await pdf.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const name = userName ? userName.replace(/\s+/g, "-").toLowerCase() : "cover-letter";
  a.download = `${name}-cover-letter-${new Date().toISOString().slice(0, 10)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Download cover letter as a plain text file.
 */
export function downloadAsText(letterText: string, fileName?: string): void {
  const blob = new Blob([letterText], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || `cover-letter-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
