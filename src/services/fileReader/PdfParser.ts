import * as pdfjsLib from "pdfjs-dist";
import { ParsedTable, FileProcessingError, FileReadOptions } from "./types";

/**
 * Universal PDF Engine (pdfjs-dist based)
 * Extracts structured text, preserves page boundaries (Page 1, Page 2...),
 * sorts items by coordinate layout, detects scanned/image PDFs, and handles Devanagari Marathi Unicode text.
 */

// Initialize Local PDF.js Worker
if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  try {
    // Standard pdf.js worker URL or fallback
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
  } catch {
    // Safe fallback if URL constructor is restricted
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || "4.10.38"}/build/pdf.worker.min.mjs`;
  }
}

export async function parsePdfData(
  arrayBuffer: ArrayBuffer,
  options?: FileReadOptions
): Promise<{
  text: string;
  tables: ParsedTable[];
  pageCount: number;
  isScannedPdf: boolean;
  errors: FileProcessingError[];
}> {
  const errors: FileProcessingError[] = [];
  const pageTexts: string[] = [];
  const tables: ParsedTable[] = [];
  let pageCount = 0;
  let totalRawCharCount = 0;

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
    });

    const pdfDoc = await loadingTask.promise;
    pageCount = pdfDoc.numPages;

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      if (options?.maxPages && i > options.maxPages) break;

      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();

      // Sort items top-to-bottom then left-to-right
      const sortedItems = (textContent.items as any[])
        .filter((item) => item.str && item.str.trim())
        .sort((a, b) => {
          const yA = Math.round(a.transform ? a.transform[5] : 0);
          const yB = Math.round(b.transform ? b.transform[5] : 0);
          if (Math.abs(yA - yB) > 4) {
            return yB - yA; // Top to bottom
          }
          const xA = Math.round(a.transform ? a.transform[4] : 0);
          const xB = Math.round(b.transform ? b.transform[4] : 0);
          return xA - xB; // Left to right
        });

      let pageLines: string[] = [];
      let currentLine = "";
      let lastY: number | null = null;

      for (const item of sortedItems) {
        totalRawCharCount += item.str.trim().length;
        const y = Math.round(item.transform ? item.transform[5] : 0);

        if (lastY !== null && Math.abs(y - lastY) > 5) {
          if (currentLine.trim()) pageLines.push(currentLine.trim());
          currentLine = item.str;
        } else {
          currentLine += (currentLine ? " " : "") + item.str;
        }
        lastY = y;
      }
      if (currentLine.trim()) pageLines.push(currentLine.trim());

      const pageFormattedText = pageLines.join("\n");
      pageTexts.push(`--- Page ${i} ---\n` + pageFormattedText);
    }

    // Release PDF resources
    if (typeof (pdfDoc as any).destroy === "function") {
      (pdfDoc as any).destroy();
    }
  } catch (err: any) {
    errors.push({
      code: "PDF_PARSING_FAILED",
      message: "Failed to parse PDF document.",
      details: err?.message || String(err),
    });
  }

  // Detect scanned / image-based PDF
  const isScannedPdf = totalRawCharCount < 15 && pageCount > 0;

  if (isScannedPdf) {
    errors.push({
      code: "PDF_SCANNED_IMAGE_ONLY",
      message: "This PDF appears to be image-based/scanned. OCR is required to extract its text.",
    });
  }

  return {
    text: pageTexts.join("\n\n"),
    tables,
    pageCount,
    isScannedPdf,
    errors,
  };
}
