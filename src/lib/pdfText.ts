import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
// Resolve worker URL so Vite serves it; required for PDF.js to parse in a worker.
// @ts-expect-error - Vite handles ?url and returns string
import workerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";
GlobalWorkerOptions.workerSrc = workerSrc;

export type TextItem = { str: string };

/**
 * Extract text from a PDF file (ArrayBuffer).
 * Works for PDFs with selectable text; image-only/scanned PDFs return empty or minimal text.
 */
export async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  const loadingTask = getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const pageTexts: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const strings = (textContent.items as TextItem[])
      .filter((item): item is TextItem => "str" in item && typeof item.str === "string")
      .map((item) => item.str);
    pageTexts.push(strings.join(" "));
  }

  return pageTexts.join("\n\n").replace(/\s+/g, " ").trim();
}
