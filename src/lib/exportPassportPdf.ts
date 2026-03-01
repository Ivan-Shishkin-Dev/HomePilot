import { PDFDocument, StandardFonts } from "pdf-lib";
import { supabase } from "./supabase";
import type { UserDocument } from "./supabase";

const DOCUMENTS_BUCKET = "documents";

async function getSignedUrl(filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(filePath, 3600);
  return error ? null : data?.signedUrl ?? null;
}

/** Detect file type from storage path (e.g. "user/doc/123-file.jpg") */
function getExtension(path: string): string {
  const match = path.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : "";
}

/** Fetch file as ArrayBuffer from signed URL */
async function fetchAsArrayBuffer(signedUrl: string): Promise<ArrayBuffer> {
  const res = await fetch(signedUrl);
  if (!res.ok) throw new Error(`Failed to fetch document: ${res.status}`);
  return res.arrayBuffer();
}

/**
 * Combine all uploaded documents (PDFs and images) into a single PDF and trigger download.
 * Page 1: cover with name, email, and list of included documents (in order).
 * Following pages: each document in that same order.
 */
export async function exportPassportToPdf(
  documents: UserDocument[],
  fullName?: string | null,
  email?: string | null
): Promise<void> {
  const withFiles = documents.filter((d) => d.file_url);
  if (withFiles.length === 0) {
    throw new Error("No documents uploaded yet. Upload at least one document to export.");
  }

  const mergedPdf = await PDFDocument.create();
  const font = await mergedPdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await mergedPdf.embedFont(StandardFonts.HelveticaBold);

  // Cover page (A4): name, email, then list of documents (same order as following pages)
  const coverPage = mergedPdf.addPage([595, 842]);
  const margin = 72;
  let y = 842 - margin;

  coverPage.drawText("Renter Passport", { x: margin, y, size: 22, font: fontBold });
  y -= 36;

  if (fullName) {
    coverPage.drawText("Name:", { x: margin, y, size: 11, font: fontBold });
    coverPage.drawText(fullName, { x: margin + 80, y, size: 11, font });
    y -= 22;
  }

  if (email) {
    coverPage.drawText("Email:", { x: margin, y, size: 11, font: fontBold });
    coverPage.drawText(email, { x: margin + 80, y, size: 11, font });
    y -= 22;
  }

  y -= 12;

  coverPage.drawText("This document contains the following:", {
    x: margin,
    y,
    size: 12,
    font: fontBold,
  });
  y -= 22;

  withFiles.forEach((doc, i) => {
    coverPage.drawText(`${i + 1}. ${doc.name}`, { x: margin, y, size: 11, font });
    y -= 18;
  });

  for (const doc of withFiles) {
    const signedUrl = await getSignedUrl(doc.file_url!);
    if (!signedUrl) continue;

    const bytes = await fetchAsArrayBuffer(signedUrl);
    const ext = getExtension(doc.file_url!);

    try {
      if (ext === "pdf") {
        const srcPdf = await PDFDocument.load(bytes);
        const indices = srcPdf.getPageIndices();
        const copied = await mergedPdf.copyPages(srcPdf, indices);
        copied.forEach((p) => mergedPdf.addPage(p));
      } else if (["jpg", "jpeg"].includes(ext)) {
        const img = await mergedPdf.embedJpg(bytes);
        const page = mergedPdf.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      } else if (ext === "png") {
        const img = await mergedPdf.embedPng(bytes);
        const page = mergedPdf.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
      // Skip unsupported types (e.g. webp, gif, doc) without failing
    } catch (e) {
      console.warn(`Could not add document "${doc.name}" (${ext}) to PDF:`, e);
    }
  }

  const pdfBytes = await mergedPdf.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `renter-passport-${new Date().toISOString().slice(0, 10)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
