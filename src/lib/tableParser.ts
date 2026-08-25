import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { extractTableRowsFromPdf } from "@/lib/pdfParser";
import { PlanningTableRow } from "@/components/teacher/AcademicPlanningSystem";

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
  // Column header rows containing "महिना" are headers, NOT subject section banners
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
 * Parses an Excel (.xlsx / .xls) file maintaining 100% of rows (250+ rows),
 * preserving MERGED CELLS (rowspan/colspan), forward-filling merged context,
 * preserving UTF-8 Marathi text formatting, filtering out duplicate column headers,
 * and generating clean sticky-header HTML with single non-duplicate subject dividers.
 */
export async function parseExcelFile(file: File): Promise<ParsedTableResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array", cellStyles: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return createEmptyResult("excel", "Excel document has no readable sheet.");
    }

    const worksheet = workbook.Sheets[firstSheetName];
    if (!worksheet || !worksheet["!ref"]) {
      return createEmptyResult("excel", "Excel sheet is empty.");
    }

    // Decode full sheet range
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    const startRow = range.s.r;
    const endRow = range.e.r;
    const startCol = range.s.c;
    const endCol = range.e.c;

    const rowCount = endRow - startRow + 1;
    const colCount = endCol - startCol + 1;

    if (rowCount === 0 || colCount === 0) {
      return createEmptyResult("excel", "No rows found in sheet.");
    }

    // ── Step 1: Initialize full matrix for ALL sheet rows ──────────────────────
    const grid: ParsedTableCell[][] = Array.from({ length: rowCount }, () =>
      Array.from({ length: colCount }, () => ({
        value: "",
        rowspan: 1,
        colspan: 1,
        isMergedHidden: false,
      }))
    );

    // Read raw text values into grid
    for (let r = 0; r < rowCount; r++) {
      for (let c = 0; c < colCount; c++) {
        const cellAddress = XLSX.utils.encode_cell({ r: startRow + r, c: startCol + c });
        const cell = worksheet[cellAddress];
        let val = "";
        if (cell && cell.v !== undefined && cell.v !== null) {
          val = String(cell.w || cell.v).trim();
          if (val.includes("$")) {
            val = val.replace(/\$\s*/g, "").trim();
          }
        }
        grid[r][c].value = val;
      }
    }

    // ── Step 2: Handle Merged Cell Ranges (!merges) ─────────────────────────────
    const merges = worksheet["!merges"] || [];
    for (const merge of merges) {
      const mStartRow = merge.s.r - startRow;
      const mEndRow = merge.e.r - startRow;
      const mStartCol = merge.s.c - startCol;
      const mEndCol = merge.e.c - startCol;

      if (
        mStartRow >= 0 &&
        mStartRow < rowCount &&
        mStartCol >= 0 &&
        mStartCol < colCount
      ) {
        const rowspan = Math.max(1, mEndRow - mStartRow + 1);
        const colspan = Math.max(1, mEndCol - mStartCol + 1);

        grid[mStartRow][mStartCol].rowspan = rowspan;
        grid[mStartRow][mStartCol].colspan = colspan;

        const mainVal = grid[mStartRow][mStartCol].value;

        // Mark hidden covered cells & forward fill context into matrix
        for (let r = mStartRow; r <= mEndRow && r < rowCount; r++) {
          for (let c = mStartCol; c <= mEndCol && c < colCount; c++) {
            if (r === mStartRow && c === mStartCol) continue;
            grid[r][c].isMergedHidden = true;
            if (!grid[r][c].value) {
              grid[r][c].value = mainVal; // Forward fill merged value
            }
          }
        }
      }
    }

    // ── Step 3: Filter out all completely blank rows (all cells empty or whitespace) ──
    const isRowEmpty = (row: ParsedTableCell[]): boolean => {
      return row.every((cell) => !cell.value || cell.value.trim() === "");
    };

    let activeGrid = grid.filter((row) => !isRowEmpty(row));

    // Trim trailing empty columns on far right
    let maxUsedCol = 0;
    activeGrid.forEach((row) => {
      row.forEach((cell, cIdx) => {
        if (cell.value || cell.isMergedHidden || cell.colspan > 1) {
          maxUsedCol = Math.max(maxUsedCol, cIdx);
        }
      });
    });

    const cleanedGrid = activeGrid.map((row) => row.slice(0, maxUsedCol + 1));

    if (cleanedGrid.length === 0) {
      return createEmptyResult("excel", "No valid rows found after parsing.");
    }

    // ── Step 4: Identify Primary Header Row ────────────────────────────────────
    let headerRowIdx = 0;
    let maxNonEmpty = 0;
    for (let r = 0; r < Math.min(cleanedGrid.length, 10); r++) {
      const count = cleanedGrid[r].filter((cell) => !cell.isMergedHidden && cell.value.length > 0).length;
      if (count > maxNonEmpty) {
        maxNonEmpty = count;
        headerRowIdx = r;
      }
    }

    const rawHeaders = cleanedGrid[headerRowIdx]
      ? cleanedGrid[headerRowIdx].map((c, i) => c.value || `स्तंभ ${i + 1}`)
      : [];

    const numCols = cleanedGrid[0]?.length || 6;

    // ── Step 5: Build Clean HTML Table (Header ONLY once in <thead>) ───────────
    let html = `<table class="w-full border-collapse border border-slate-300 text-sm font-sans my-0">`;
    
    // Build explicit sticky header <thead> - ONCE AT THE VERY TOP
    html += `<thead class="sticky top-0 z-20 bg-amber-100 shadow-sm border-b-2 border-amber-300">`;
    html += `<tr class="bg-amber-100 text-amber-950 font-bold">`;
    cleanedGrid[headerRowIdx]?.forEach((cell) => {
      if (cell.isMergedHidden) return;
      const colspanAttr = cell.colspan > 1 ? ` colspan="${cell.colspan}"` : "";
      html += `<th${colspanAttr} class="border border-slate-300 p-2.5 text-center font-bold sticky top-0 z-20 bg-amber-100 text-amber-950">${escapeHtml(cell.value || "स्तंभ")}</th>`;
    });
    html += `</tr>`;
    html += `</thead>`;

    html += `<tbody>`;

    let prevRowWasSubjectHeader = false;

    cleanedGrid.forEach((row, rIdx) => {
      if (rIdx === headerRowIdx) return; // Skip primary header row inside tbody
      if (isColumnHeaderRow(row)) return; // Filter out duplicate column headers inside tbody

      const isSubjectHeader = isSubjectHeaderRow(row);

      // Render Dynamic Subject Title Banner Row (Full-width across all columns)
      if (isSubjectHeader) {
        const subjectText = row.find((c) => c.value && c.value.trim() !== "")?.value || "नियोजन विभाग";
        html += `<tr class="bg-indigo-100/95 border-t-2 border-b-2 border-indigo-400">`;
        html += `<td colspan="${numCols}" class="py-3 px-4 text-center font-black text-indigo-950 text-base tracking-wide bg-indigo-100/95">✨ ${escapeHtml(subjectText)}</td>`;
        html += `</tr>`;
        return;
      }
      row.forEach((cell) => {
        if (cell.isMergedHidden) return;

        const rowspanAttr = cell.rowspan > 1 ? ` rowspan="${cell.rowspan}"` : "";
        const colspanAttr = cell.colspan > 1 ? ` colspan="${cell.colspan}"` : "";
        const cellStyle = isSubjectHeader
          ? "border border-indigo-300 p-3 font-black text-indigo-950 align-middle whitespace-pre-wrap bg-indigo-100/90"
          : "border border-slate-300 p-2 text-slate-800 align-top whitespace-pre-wrap";

        html += `<td${rowspanAttr}${colspanAttr} class="${cellStyle}">${escapeHtml(cell.value)}</td>`;
      });
      html += `</tr>`;
    });

    html += `</tbody>`;
    html += `</table>`;

    // ── Step 6: Build Schema-Mapped PlanningTableRow[] Fallback (Full 250+ Rows)
    const mappedRows: PlanningTableRow[] = [];
    const dataRows = cleanedGrid.slice(headerRowIdx + 1).filter((r) => !isColumnHeaderRow(r));

    dataRows.forEach((row, i) => {
      const visibleCells = row.filter((c) => !c.isMergedHidden || c.value);
      if (visibleCells.length === 0) return;

      mappedRows.push({
        id: `excel_${Date.now()}_${i}`,
        month: visibleCells[0]?.value || `महिना ${i + 1}`,
        subject: visibleCells[1]?.value || "मराठी",
        weeks: visibleCells[2]?.value || "4",
        workingDays: visibleCells[3]?.value || "20",
        periods: visibleCells[4]?.value || "50",
        topics: visibleCells[5]?.value || visibleCells[1]?.value || "घटक माहिती",
        outcomes: visibleCells[6]?.value || visibleCells[2]?.value || "अध्ययन निष्पत्ती",
      });
    });

    return {
      fileType: "excel",
      htmlContent: html,
      gridData: cleanedGrid,
      rawHeaders,
      mappedRows,
      totalRowCount: cleanedGrid.length,
    };
  } catch (err: any) {
    console.error("Excel parse error:", err);
    return createEmptyResult("excel", err?.message || "Failed to parse Excel file.");
  }
}

/**
 * Parses Word (.docx) documents into clean HTML tables using mammoth.js
 */
export async function parseDocxFile(file: File): Promise<ParsedTableResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const rawHtml = result.value || "";

    if (!rawHtml.trim()) {
      return createEmptyResult("docx", "Word document contains no readable text or table.");
    }

    let styledHtml = rawHtml.replace(
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
 * Parses PDF files using pdfjs-dist extraction or returns structured fallback.
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
