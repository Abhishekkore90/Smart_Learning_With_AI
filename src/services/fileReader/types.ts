/**
 * Normalized Universal File Reader Types
 * Supports Excel, CSV, PDF, DOCX, DOC, and Image/Scanned documents
 * with 100% Marathi Devanagari Unicode preservation.
 */

export type DetectedFileType = "xlsx" | "xls" | "csv" | "pdf" | "docx" | "doc" | "image" | "unknown";

export interface ParsedCell {
  value: string;
  rowspan?: number;
  colspan?: number;
  isMergedHidden?: boolean;
}

export interface ParsedSheet {
  sheetName: string;
  headers: string[];
  rows: string[][];
  gridData: ParsedCell[][];
  htmlContent: string;
  totalRows: number;
}

export interface ParsedTable {
  id: string;
  name?: string;
  headers: string[];
  rows: string[][];
}

export interface FileProcessingError {
  code: string;
  message: string;
  details?: string;
}

export interface FileProcessingResult {
  success: boolean;
  fileName: string;
  fileType: DetectedFileType;
  mimeType: string;
  fileSize: number;
  text: string;
  sheets: ParsedSheet[];
  tables: ParsedTable[];
  metadata: {
    pageCount?: number;
    sheetCount?: number;
    classTitle?: string;
    academicYear?: string;
    author?: string;
    createdDate?: string;
    [key: string]: any;
  };
  errors: FileProcessingError[];
  isScannedPdf?: boolean;
  ocrRequired?: boolean;
}

export interface FileReadOptions {
  detectTypeOnly?: boolean;
  maxPages?: number;
  extractTables?: boolean;
  preserveFormatting?: boolean;
  fallbackSubject?: string;
}
