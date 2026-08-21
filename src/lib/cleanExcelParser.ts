import { UniversalFileReader } from "@/services/fileReader";
import { ParsedTableCell } from "@/lib/tableParser";

export interface CleanParsedSheet {
  sheetName: string;
  headers: string[];
  rows: string[][];
  gridData: ParsedTableCell[][];
  htmlContent: string;
  totalRows: number;
}

export interface CleanParsedWorkbook {
  fileType: "excel" | "csv" | "unknown";
  sheets: CleanParsedSheet[];
  activeSheetIndex: number;
  error?: string;
}

/**
 * Clean Native Excel Parser Engine (SheetJS/xlsx based):
 * Delegates to central UniversalFileReader service for unified, reliable Excel/CSV parsing.
 */
export async function parseCleanExcelWorkbook(
  input: File | ArrayBuffer | Blob
): Promise<CleanParsedWorkbook> {
  const result = await UniversalFileReader.readFile(input);

  if (!result.success && result.sheets.length === 0) {
    return {
      fileType: "unknown",
      sheets: [],
      activeSheetIndex: 0,
      error: result.errors[0]?.message || "Excel file has no readable sheets.",
    };
  }

  const parsedSheets: CleanParsedSheet[] = result.sheets.map((s) => ({
    sheetName: s.sheetName,
    headers: s.headers,
    rows: s.rows,
    gridData: s.gridData as ParsedTableCell[][],
    htmlContent: s.htmlContent,
    totalRows: s.totalRows,
  }));

  return {
    fileType: result.fileType === "csv" ? "csv" : "excel",
    sheets: parsedSheets,
    activeSheetIndex: 0,
  };
}
