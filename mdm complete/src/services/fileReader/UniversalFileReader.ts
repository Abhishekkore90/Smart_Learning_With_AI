import { detectFileType } from "./FileTypeDetector";
import { parseExcelData } from "./ExcelParser";
import { parsePdfData } from "./PdfParser";
import { parseWordData } from "./WordParser";
import { processScannedPdfWithOcr } from "./OcrAdapter";
import {
  FileProcessingResult,
  FileReadOptions,
  FileProcessingError,
  DetectedFileType,
} from "./types";

/**
 * Universal File Reader Central Service
 * Reusable, central, Marathi-Unicode compatible file processing engine.
 * Routes uploaded files/buffers to specialized parsers and returns normalized result.
 */
export class UniversalFileReader {
  /**
   * Main entry point: Reads and parses any supported file format.
   */
  public static async readFile(
    input: File | ArrayBuffer | Blob,
    options?: FileReadOptions
  ): Promise<FileProcessingResult> {
    let fileName = "uploaded_file";
    let fileSize = 0;
    let arrayBuffer: ArrayBuffer;

    if (input instanceof File) {
      fileName = input.name || fileName;
      fileSize = input.size || 0;
      arrayBuffer = await input.arrayBuffer();
    } else if (input instanceof Blob) {
      fileSize = input.size || 0;
      arrayBuffer = await input.arrayBuffer();
    } else {
      fileSize = input.byteLength || 0;
      arrayBuffer = input;
    }

    // Step 1: Detect File Type via Extensions, MIME type, and Magic Bytes
    const typeDetails = await detectFileType(input);
    const { fileType, mimeType, isLegacyOle } = typeDetails;

    const errors: FileProcessingError[] = [];

    // Step 2: Route to Format-Specific Parser
    try {
      switch (fileType) {
        case "xlsx":
        case "xls":
        case "csv": {
          const excelRes = await parseExcelData(arrayBuffer, options);
          return {
            success: excelRes.errors.length === 0,
            fileName,
            fileType,
            mimeType,
            fileSize,
            text: excelRes.fullText,
            sheets: excelRes.sheets,
            tables: excelRes.sheets.map((s, idx) => ({
              id: `sheet_table_${idx}`,
              name: s.sheetName,
              headers: s.headers,
              rows: s.rows,
            })),
            metadata: {
              sheetCount: excelRes.sheets.length,
            },
            errors: excelRes.errors,
          };
        }

        case "pdf": {
          const pdfRes = await parsePdfData(arrayBuffer, options);

          if (pdfRes.isScannedPdf) {
            return await processScannedPdfWithOcr(arrayBuffer, fileName);
          }

          return {
            success: pdfRes.errors.length === 0,
            fileName,
            fileType: "pdf",
            mimeType,
            fileSize,
            text: pdfRes.text,
            sheets: [],
            tables: pdfRes.tables,
            metadata: {
              pageCount: pdfRes.pageCount,
            },
            errors: pdfRes.errors,
            isScannedPdf: pdfRes.isScannedPdf,
          };
        }

        case "docx":
        case "doc": {
          const wordRes = await parseWordData(arrayBuffer, isLegacyOle && fileType === "doc", options);
          return {
            success: wordRes.errors.length === 0,
            fileName,
            fileType,
            mimeType,
            fileSize,
            text: wordRes.text,
            sheets: wordRes.htmlContent
              ? [
                  {
                    sheetName: "Document",
                    headers: [],
                    rows: [],
                    gridData: [],
                    htmlContent: wordRes.htmlContent,
                    totalRows: 0,
                  },
                ]
              : [],
            tables: [],
            metadata: {},
            errors: wordRes.errors,
          };
        }

        case "image": {
          return {
            success: true,
            fileName,
            fileType: "image",
            mimeType,
            fileSize,
            text: "[Image file - OCR required to extract text]",
            sheets: [],
            tables: [],
            metadata: {},
            errors: [
              {
                code: "IMAGE_OCR_REQUIRED",
                message: "This is an image file. OCR is required to extract its text.",
              },
            ],
            ocrRequired: true,
          };
        }

        default: {
          errors.push({
            code: "UNSUPPORTED_FILE_FORMAT",
            message: `Unsupported file format. Supported formats: XLSX, XLS, CSV, PDF, DOCX`,
          });

          return {
            success: false,
            fileName,
            fileType: "unknown",
            mimeType,
            fileSize,
            text: "",
            sheets: [],
            tables: [],
            metadata: {},
            errors,
          };
        }
      }
    } catch (err: any) {
      errors.push({
        code: "UNIVERSAL_PARSER_EXCEPTION",
        message: "An unexpected error occurred while parsing the file.",
        details: err?.message || String(err),
      });

      return {
        success: false,
        fileName,
        fileType,
        mimeType,
        fileSize,
        text: "",
        sheets: [],
        tables: [],
        metadata: {},
        errors,
      };
    }
  }
}
