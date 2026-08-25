import { UniversalFileReader } from "@/services/fileReader";
import { PlanningTableRow } from "@/components/teacher/AcademicPlanningSystem";
import { extractTableRowsFromPdf } from "@/lib/pdfParser";
import { splitRowsIntoSubjectSections } from "@/lib/smartSubjectSplitter";

export interface ParsedTableCell {
  value: string;
  rowspan: number;
  colspan: number;
  isMergedHidden: boolean;
}

export interface ParsedTableResult {
  fileType: "excel" | "docx" | "pdf" | "unknown";
  htmlContent: string;
  gridData: ParsedTableCell[][];
  rawHeaders: string[];
  mappedRows: PlanningTableRow[];
  totalRowCount: number;
  error?: string;
}

/**
 * Checks if a row is a repeated column header row (e.g. "महिना", "आठवडा", "कामाचे दिवस", "तासिका", "अध्ययन निष्पत्ती")
 */
export const isColumnHeaderRow = (row: ParsedTableCell[]): boolean => {
  if (!row || row.length === 0) return false;
  const joined = row.map((c) => (c.value || "").toLowerCase().trim()).join(" ");

  const hasMonth = joined.includes("महिना") || joined.includes("month");
  const hasHeaderKeywords =
    joined.includes("आठवडा") ||
    joined.includes("week") ||
    joined.includes("कामाचे दिवस") ||
    joined.includes("दिवस") ||
    joined.includes("तासिका") ||
    joined.includes("निष्पत्ती") ||
    joined.includes("outcome");

  return hasMonth && hasHeaderKeywords;
};

/**
 * Checks if a table row marks a new subject section or title header
 */
export const isSubjectHeaderRow = (row: ParsedTableCell[]): boolean => {
  if (!row || row.length === 0) return false;
  if (isColumnHeaderRow(row)) return false;

  const joined = row.map((c) => (c.value || "").toLowerCase()).join(" ");
  return (
    joined.includes("विषय :") ||
    joined.includes("विषय:") ||
    joined.includes("विषय-") ||
    joined.includes("subject:") ||
    joined.includes("subject :") ||
    joined.includes("इयत्ता :") ||
    joined.includes("इयत्ता:") ||
    joined.includes("इयत्ता-") ||
    joined.includes("मासिक व घटक नियोजन") ||
    joined.includes("अभ्यासक्रमाचे मासिक")
  );
};

/**
 * Parses an Excel (.xlsx / .xls / .csv) file maintaining 100% of rows (250+ rows),
 * using the central UniversalFileReader service.
 */
export async function parseExcelFile(file: File): Promise<ParsedTableResult> {
  try {
    const res = await UniversalFileReader.readFile(file);
    if (!res.success && res.sheets.length === 0) {
      return createEmptyResult("excel", res.errors[0]?.message || "Excel document has no readable sheet.");
    }

    const firstSheet = res.sheets[0];
    if (!firstSheet) {
      return createEmptyResult("excel", "Excel sheet is empty.");
    }

    const grid: ParsedTableCell[][] = firstSheet.gridData as ParsedTableCell[][];
    const rawHeaders = firstSheet.headers;

    // Build mapped PlanningTableRow items using multi-pass subject section splitter
    const rawDataRows: string[][] = grid.map((row) => row.map((cell) => cell.value || ""));
    const subjectMap = splitRowsIntoSubjectSections(rawDataRows, "मराठी");
    const mappedRows: PlanningTableRow[] = [];

    Object.values(subjectMap).forEach((sec) => {
      sec.rows.forEach((r, idx) => {
        mappedRows.push({
          id: `excel_${sec.subjectName}_${Date.now()}_${idx}`,
          month: r[0] || "",
          subject: sec.subjectName,
          weeks: r[1] || "",
          workingDays: r[2] || "",
          periods: r[3] || "",
          topics: r[4] || "",
          outcomes: r[5] || "",
        });
      });
    });

    return {
      fileType: "excel",
      htmlContent: firstSheet.htmlContent,
      gridData: grid,
      rawHeaders,
      mappedRows,
      totalRowCount: grid.length,
    };
  } catch (err: any) {
    console.error("Excel parse error:", err);
    return createEmptyResult("excel", err?.message || "Failed to parse Excel file.");
  }
}

/**
 * Parses Word (.docx / .doc) documents using UniversalFileReader service.
 */
export async function parseDocxFile(file: File): Promise<ParsedTableResult> {
  try {
    const res = await UniversalFileReader.readFile(file);
    if (!res.success) {
      return createEmptyResult("docx", res.errors[0]?.message || "Failed to parse Word document.");
    }

    const htmlContent = res.sheets[0]?.htmlContent || `<div class="p-4">${escapeHtml(res.text)}</div>`;

    let styledHtml = htmlContent.replace(
      /<table/g,
      '<table class="w-full border-collapse border border-slate-300 text-sm font-sans my-2"'
    );
    styledHtml = styledHtml.replace(
      /<td/g,
      '<td class="border border-slate-300 p-2 text-slate-800 align-top whitespace-pre-wrap"'
    );
    styledHtml = styledHtml.replace(
      /<th/g,
      '<th class="border border-slate-300 p-2.5 bg-amber-100 text-amber-950 font-bold text-center sticky top-0 z-10"'
    );

    return {
      fileType: "docx",
      htmlContent: styledHtml,
      gridData: [],
      rawHeaders: [],
      mappedRows: [],
      totalRowCount: 1,
    };
  } catch (err: any) {
    console.error("DOCX parse error:", err);
    return createEmptyResult("docx", err?.message || "Failed to parse Word document.");
  }
}

/**
 * Parses PDF files using UniversalFileReader service.
 */
export async function parsePdfFile(file: File): Promise<ParsedTableResult> {
  try {
    const extractedRows = await extractTableRowsFromPdf(file);
    return {
      fileType: "pdf",
      htmlContent: "",
      gridData: [],
      rawHeaders: ["महिना", "विषय", "आठवडे", "कामाचे दिवस", "तासिका", "घटक", "अध्ययन निष्पत्ती"],
      mappedRows: extractedRows,
      totalRowCount: extractedRows.length,
    };
  } catch (err: any) {
    console.error("PDF parse error:", err);
    return createEmptyResult("pdf", err?.message || "Failed to parse PDF document.");
  }
}

function createEmptyResult(
  fileType: "excel" | "docx" | "pdf" | "unknown",
  errorMsg: string
): ParsedTableResult {
  return {
    fileType,
    htmlContent: "",
    gridData: [],
    rawHeaders: [],
    mappedRows: [],
    totalRowCount: 0,
    error: errorMsg,
  };
}

function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
