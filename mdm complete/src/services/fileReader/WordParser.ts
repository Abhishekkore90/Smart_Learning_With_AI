import mammoth from "mammoth";
import { FileProcessingError, FileReadOptions } from "./types";

/**
 * Universal Word Parser Engine (Mammoth based)
 * Extracts structured text, headings, paragraphs, and tables from .docx files,
 * with full Marathi Devanagari Unicode support and legacy .doc detection.
 */

export async function parseWordData(
  arrayBuffer: ArrayBuffer,
  isLegacyDoc: boolean = false,
  options?: FileReadOptions
): Promise<{ text: string; htmlContent: string; errors: FileProcessingError[] }> {
  const errors: FileProcessingError[] = [];

  if (isLegacyDoc) {
    errors.push({
      code: "WORD_LEGACY_DOC_NOT_SUPPORTED",
      message: "Legacy binary .doc files cannot be parsed directly in the browser. Please save/convert the file as .docx format.",
    });
    return {
      text: "",
      htmlContent: "",
      errors,
    };
  }

  try {
    const textResult = await mammoth.extractRawText({ arrayBuffer });
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });

    const rawText = (textResult.value || "").trim();
    const htmlContent = (htmlResult.value || "").trim();

    if (textResult.messages && textResult.messages.length > 0) {
      textResult.messages.forEach((msg) => {
        if (msg.type === "warning") {
          console.warn("Mammoth Word extraction notice:", msg.message);
        }
      });
    }

    return {
      text: rawText,
      htmlContent,
      errors,
    };
  } catch (err: any) {
    errors.push({
      code: "WORD_PARSING_FAILED",
      message: "Failed to parse Word document.",
      details: err?.message || String(err),
    });
    return {
      text: "",
      htmlContent: "",
      errors,
    };
  }
}
