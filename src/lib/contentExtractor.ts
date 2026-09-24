import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

// Setup worker for pdfjs-dist
if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "4.10.38"}/pdf.worker.min.mjs`;
}

/**
 * Extracts plain text lines from an ArrayBuffer of a PDF document
 */
export async function extractTextFromPdfBuffer(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
    });
    const pdfDoc = await loadingTask.promise;
    const pagesText: string[] = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      let lastY: number | null = null;
      let pageLines: string[] = [];
      let currentLine = "";

      for (const item of textContent.items as any[]) {
        if (!item.str) continue;
        const y = Math.round(item.transform ? item.transform[5] : 0);

        if (lastY !== null && Math.abs(y - lastY) > 6) {
          if (currentLine.trim()) pageLines.push(currentLine.trim());
          currentLine = item.str;
        } else {
          currentLine += (currentLine ? " " : "") + item.str;
        }
        lastY = y;
      }
      if (currentLine.trim()) pageLines.push(currentLine.trim());

      if (pageLines.length > 0) {
        pagesText.push(pageLines.join("\n"));
      }
    }

    return pagesText.join("\n\n");
  } catch (error) {
    console.error("PDF text extraction error:", error);
    return "";
  }
}

/**
 * Extracts plain text from an ArrayBuffer of a DOCX document using mammoth
 */
export async function extractTextFromDocxBuffer(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || "";
  } catch (error) {
    console.error("DOCX text extraction error:", error);
    return "";
  }
}

/**
 * Extracts text from an uploaded File (PDF, DOCX, TXT, Excel)
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();

  if (name.endsWith(".pdf")) {
    return await extractTextFromPdfBuffer(buffer);
  }

  if (name.endsWith(".docx") || name.endsWith(".doc")) {
    return await extractTextFromDocxBuffer(buffer);
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    try {
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetNames = workbook.SheetNames;
      const textParts: string[] = [];
      for (const sheetName of sheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (sheet) {
          const csv = XLSX.utils.sheet_to_csv(sheet);
          if (csv.trim()) textParts.push(csv);
        }
      }
      return textParts.join("\n\n");
    } catch (e) {
      console.error("Excel text extraction error:", e);
      return "";
    }
  }

  if (name.endsWith(".txt") || name.endsWith(".csv")) {
    try {
      return new TextDecoder("utf-8").decode(buffer);
    } catch {
      return "";
    }
  }

  return "";
}

/**
 * Fetches remote file via URL and extracts text
 */
export async function extractTextFromUrl(url: string, fileName?: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const buffer = await res.arrayBuffer();
    const lowerName = (fileName || url).toLowerCase();

    if (lowerName.includes(".pdf")) {
      return await extractTextFromPdfBuffer(buffer);
    }
    if (lowerName.includes(".docx") || lowerName.includes(".doc")) {
      return await extractTextFromDocxBuffer(buffer);
    }
    return new TextDecoder("utf-8").decode(buffer);
  } catch (err) {
    console.warn("Failed to extract text from URL:", err);
    return "";
  }
}
