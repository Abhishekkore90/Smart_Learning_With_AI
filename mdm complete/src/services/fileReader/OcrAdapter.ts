import { FileProcessingResult, FileProcessingError } from "./types";

/**
 * OCR Adapter Interface & Extension Manager
 * Allows clean plug-and-play integration with OCR engines (e.g. Tesseract.js / cloud OCR)
 * for scanned/image PDFs without breaking application builds or adding forced dependencies.
 */

export interface OcrEngine {
  name: string;
  supportsMarathi: boolean;
  recognizeText(imageInput: Blob | ArrayBuffer | string): Promise<{ text: string; confidence: number }>;
}

let registeredOcrEngine: OcrEngine | null = null;

export function registerOcrEngine(engine: OcrEngine): void {
  registeredOcrEngine = engine;
  console.log(`Registered OCR Engine: ${engine.name} (Marathi Support: ${engine.supportsMarathi})`);
}

export function getRegisteredOcrEngine(): OcrEngine | null {
  return registeredOcrEngine;
}

export async function processScannedPdfWithOcr(
  arrayBuffer: ArrayBuffer,
  fileName: string
): Promise<FileProcessingResult> {
  const errors: FileProcessingError[] = [];

  if (!registeredOcrEngine) {
    errors.push({
      code: "OCR_ENGINE_NOT_REGISTERED",
      message: "This PDF appears to be image-based/scanned. OCR is required to extract its text.",
      details: "No OCR engine is currently registered. You can upload text-based PDFs or register an OCR plugin.",
    });

    return {
      success: false,
      fileName,
      fileType: "pdf",
      mimeType: "application/pdf",
      fileSize: arrayBuffer.byteLength,
      text: "",
      sheets: [],
      tables: [],
      metadata: { isScanned: true },
      errors,
      isScannedPdf: true,
      ocrRequired: true,
    };
  }

  try {
    const ocrRes = await registeredOcrEngine.recognizeText(arrayBuffer);
    return {
      success: true,
      fileName,
      fileType: "pdf",
      mimeType: "application/pdf",
      fileSize: arrayBuffer.byteLength,
      text: ocrRes.text,
      sheets: [],
      tables: [],
      metadata: { isScanned: true, ocrConfidence: ocrRes.confidence },
      errors: [],
      isScannedPdf: true,
      ocrRequired: false,
    };
  } catch (err: any) {
    errors.push({
      code: "OCR_PROCESSING_FAILED",
      message: "OCR text extraction failed.",
      details: err?.message || String(err),
    });

    return {
      success: false,
      fileName,
      fileType: "pdf",
      mimeType: "application/pdf",
      fileSize: arrayBuffer.byteLength,
      text: "",
      sheets: [],
      tables: [],
      metadata: { isScanned: true },
      errors,
      isScannedPdf: true,
      ocrRequired: true,
    };
  }
}
