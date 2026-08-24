import * as XLSX from "xlsx";
import { ParsedSheet, ParsedCell, FileProcessingError, FileReadOptions } from "./types";

/**
 * Universal Excel Engine (SheetJS / xlsx)
 * Supports .xlsx, .xls, .csv with multi-sheet iteration, merged cell spans,
 * structured rows/headers, and 100% Marathi Devanagari Unicode preservation.
 */

function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function parseExcelData(
  arrayBuffer: ArrayBuffer,
  options?: FileReadOptions
): Promise<{ sheets: ParsedSheet[]; fullText: string; errors: FileProcessingError[] }> {
  const errors: FileProcessingError[] = [];
  const sheets: ParsedSheet[] = [];
  const textParts: string[] = [];

  try {
    const workbook = XLSX.read(arrayBuffer, {
      type: "array",
      cellStyles: true,
      cellDates: true,
      raw: false,
    });

    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      errors.push({
        code: "EXCEL_NO_SHEETS",
        message: "The Excel file contains no readable sheets.",
      });
      return { sheets: [], fullText: "", errors };
    }

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet || !worksheet["!ref"]) continue;

      const range = XLSX.utils.decode_range(worksheet["!ref"]);
      let endRow = range.e.r;
      let endCol = range.e.c;

      // Scan merges to establish accurate grid boundaries
      (worksheet["!merges"] || []).forEach((m) => {
        if (m.e.r > endRow) endRow = m.e.r;
        if (m.e.c > endCol) endCol = m.e.c;
      });

      const rowCount = endRow + 1;
      const colCount = endCol + 1;

      if (rowCount === 0 || colCount === 0) continue;

      // Initialize 2D ParsedCell Grid
      const grid: ParsedCell[][] = Array.from({ length: rowCount }, () =>
        Array.from({ length: colCount }, () => ({
          value: "",
          rowspan: 1,
          colspan: 1,
          isMergedHidden: false,
        }))
      );

      // Populate cell values
      for (let r = 0; r < rowCount; r++) {
        for (let c = 0; c < colCount; c++) {
          const cellAddress = XLSX.utils.encode_cell({ r, c });
          const cell = worksheet[cellAddress];
          let val = "";
          if (cell && cell.v !== undefined && cell.v !== null) {
            val = String(cell.w || cell.v).trim();
          }
          grid[r][c].value = val;
        }
      }

      // Handle merged cells (!merges)
      const merges = worksheet["!merges"] || [];
      for (const merge of merges) {
        const mStartRow = merge.s.r;
        const mEndRow = merge.e.r;
        const mStartCol = merge.s.c;
        const mEndCol = merge.e.c;

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

          for (let r = mStartRow; r <= mEndRow && r < rowCount; r++) {
            for (let c = mStartCol; c <= mEndCol && c < colCount; c++) {
              if (r === mStartRow && c === mStartCol) continue;
              grid[r][c].isMergedHidden = true;
              grid[r][c].value = "";
            }
          }
        }
      }

      // Identify header row
      let headerRowIdx = 0;
      let maxNonEmpty = 0;
      for (let r = 0; r < Math.min(rowCount, 15); r++) {
        const count = grid[r].filter((cell) => !cell.isMergedHidden && cell.value.length > 0).length;
        if (count > maxNonEmpty) {
          maxNonEmpty = count;
          headerRowIdx = r;
        }
      }

      const headers = grid[headerRowIdx]
        ? grid[headerRowIdx].map((c, i) => c.value || `स्तंभ ${i + 1}`)
        : [];

      // Build clean data rows
      const rows: string[][] = [];
      grid.forEach((row) => {
        const rowVals = row.map((cell) => cell.value || "");
        if (rowVals.some((v) => v.trim() !== "")) {
          rows.push(rowVals);
        }
      });

      // Build HTML content preview
      let htmlContent = `<div class="table-responsive"><table class="table table-bordered align-middle"><thead><tr>`;
      headers.forEach((h) => {
        htmlContent += `<th class="bg-dark text-warning border-secondary p-2.5 text-center font-bold" style="background-color: #0f172a !important; color: #fde047 !important; font-weight: 900; border: 1px solid #334155;">${escapeHtml(h)}</th>`;
      });
      htmlContent += `</tr></thead><tbody>`;

      grid.slice(headerRowIdx + 1).forEach((row) => {
        if (row.every((c) => c.isMergedHidden || !c.value.trim())) return;
        htmlContent += `<tr>`;
        row.forEach((cell) => {
          if (cell.isMergedHidden) return;
          const rSpan = cell.rowspan || 1;
          const cSpan = cell.colspan || 1;
          const attr = `${rSpan > 1 ? ` rowspan="${rSpan}"` : ""}${cSpan > 1 ? ` colspan="${cSpan}"` : ""}`;
          htmlContent += `<td${attr} class="border-secondary p-2 align-top">${escapeHtml(cell.value)}</td>`;
        });
        htmlContent += `</tr>`;
      });
      htmlContent += `</tbody></table></div>`;

      // Build text representations
      const sheetText = rows.map((r) => r.join("\t")).join("\n");
      textParts.push(`--- SHEET: ${sheetName} ---\n` + sheetText);

      sheets.push({
        sheetName,
        headers,
        rows,
        gridData: grid,
        htmlContent,
        totalRows: rows.length,
      });
    }
  } catch (err: any) {
    errors.push({
      code: "EXCEL_PARSING_FAILED",
      message: "Failed to parse Excel workbook.",
      details: err?.message || String(err),
    });
  }

  return {
    sheets,
    fullText: textParts.join("\n\n"),
    errors,
  };
}
