import React, { useState, useEffect, useRef } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { doc, getDoc, setDoc, onSnapshot, collection } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { PDFDocument } from "pdf-lib";
import {
  BookOpen,
  BookCheck,
  Languages,
  Calendar,
  FileText,
  Upload,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  X,
  FileCheck,
  Sparkles,
  Layers,
  GraduationCap,
  FolderOpen,
  RefreshCw,
  Trash2,
  ExternalLink,
  Plus,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Pencil,
  Edit3,
  Type,
  Highlighter,
  Eraser,
  Save,
  RotateCcw,
  FileUp,
  School,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getDefaultSubjectsForClass } from "@/data/cceSubjects";
import { saveFileToIndexedDB, getFileFromIndexedDB } from "@/lib/indexedDbStorage";
import { uploadFileWithProgress } from "@/lib/upload";
import { extractTableRowsFromPdf } from "@/lib/pdfParser";
import { parseExcelFile, ParsedTableCell } from "@/lib/tableParser";
import { parsePlanningExcelFile, PlanningCategory, PlanningDocumentRecord } from "@/lib/smartPlanningParser";
import { extractSubjectSectionsFromExcel } from "@/lib/smartSubjectSplitter";
import { PlanningTableRenderer } from "@/components/teacher/PlanningTableRenderer";
import * as XLSX from "xlsx";

// Helper to identify subject change / section header rows in raw Excel data
const isSubjectHeaderOrChangeRow = (row: string[], prevRow?: string[]): boolean => {
  if (!row || !Array.isArray(row)) return false;
  const joined = row.join(" ").toLowerCase();

  const isHeader =
    joined.includes("विषय :") ||
    joined.includes("विषय:") ||
    joined.includes("विषय-") ||
    joined.includes("subject:") ||
    joined.includes("subject :") ||
    (joined.includes("महिना") && (joined.includes("आठवडा") || joined.includes("दिवस") || joined.includes("तासिका")));

  // If previous row was ALSO a header row, do NOT trigger duplicate banner for consecutive rows
  if (prevRow && Array.isArray(prevRow)) {
    const prevJoined = prevRow.join(" ").toLowerCase();
    const prevIsHeader =
      prevJoined.includes("विषय :") ||
      prevJoined.includes("विषय:") ||
      prevJoined.includes("विषय-") ||
      prevJoined.includes("subject:") ||
      prevJoined.includes("subject :") ||
      (prevJoined.includes("महिना") && (prevJoined.includes("आठवडा") || prevJoined.includes("दिवस") || prevJoined.includes("तासिका")));

    if (isHeader && prevIsHeader) {
      return false;
    }
  }

  if (isHeader) return true;

  if (prevRow && Array.isArray(prevRow)) {
    const prevJoined = prevRow.join(" ").toLowerCase();
    if (prevJoined.includes("एप्रिल") && (joined.includes("जून") || joined.includes("जुलै"))) {
      return true;
    }
  }

  return false;
};

type RowType = "title" | "meta" | "header_repeat" | "signature" | "data";

const SECTION_KEYWORDS = [
  "वर्ग पूर्वतयारी",
  "पूर्वतयारी",
  "सराव व उजळणी",
  "प्रथम घटक",
  "द्वितीय घटक",
  "दिवाळी",
  "सुट्ट्या",
  "अतिरिक्त पूरक",
  "चाचणी",
  "पूरक मार्गदर्शन",
  "मासिक व घटक नियोजन",
  "अभ्यासक्रमाचे मासिक",
  "वार्षिक नियोजन",
  "अध्ययन निष्पत्ती",
];

const detectRowType = (row: string[]): RowType => {
  if (!row || !Array.isArray(row)) return "data";
  const joined = row.join(" ").toLowerCase().trim();
  const nonEmpties = row.map((c) => (c || "").trim()).filter((c) => c !== "");

  if (nonEmpties.length === 0) return "data";

  // 1. Month-End Signature row
  if (joined.includes("वर्ग शिक्षक") || joined.includes("मुख्याध्यापक") || joined.includes("स्वाक्षरी") || joined.includes("signature")) {
    return "signature";
  }

  // 2. Section Header or Title banner row
  if (SECTION_KEYWORDS.some((kw) => joined.includes(kw))) {
    return "title";
  }

  // 3. Meta info row (इयत्ता / विषय / तासिका / कामाचे दिवस)
  if (joined.includes("इयत्ता") || joined.includes("नियोजित तासिका") || (joined.includes("विषय") && joined.includes("दिवस"))) {
    return "meta";
  }

  // 4. Repeated column headers row
  if (joined.includes("दिनांक") && (joined.includes("घटक") || joined.includes("निष्पत्ती") || joined.includes("उद्दिष्ट"))) {
    return "header_repeat";
  }

  // 5. Fallback for single merged banner row
  if (nonEmpties.length === 1 && !joined.includes("१") && !joined.includes("२")) {
    return "title";
  }

  return "data";
};

// Helper to calculate dynamic rows count for textareas to prevent inner scrollbars
const getDynamicRows = (text: string, isHeaderRow: boolean): number => {
  if (isHeaderRow) return 1;
  if (!text) return 1;
  const lines = text.split("\n");
  let totalRows = 0;
  for (const line of lines) {
    totalRows += Math.max(1, Math.ceil(line.length / 32));
  }
  return Math.max(1, totalRows);
};

// Helper to determine optimal column width style for planning table columns (both raw Excel/PDF headers & standard columns)
const getRawColumnWidthStyle = (headerName: string, index: number, totalCols: number): React.CSSProperties => {
  const h = (headerName || "").toLowerCase().trim();

  // Standard 6-column Annual / Monthly layout
  if (totalCols === 6) {
    if (h.includes("महिना") || h.includes("month") || index === 0) return { width: "8%", minWidth: "50px" };
    if (h.includes("आठवडा") || h.includes("week") || index === 1) return { width: "6%", minWidth: "40px" };
    if (h.includes("कामाचे") || h.includes("दिवस") || index === 2) return { width: "8%", minWidth: "55px" };
    if (h.includes("तासिका") || index === 3) return { width: "8%", minWidth: "55px" };
    if (h.includes("विषय") || h.includes("घटक") || index === 4) return { width: "45%", minWidth: "320px" };
    if (h.includes("निष्पत्ती") || h.includes("outcome") || index === 5) return { width: "25%", minWidth: "200px" };
  }

  // Small metadata columns
  if (h.includes("अ.क्र") || h.includes("sr") || h.includes("no") || h.includes("क्रमांक")) {
    return { width: "5%", minWidth: "45px" };
  }
  if (h.includes("महिना") || h.includes("month") || h.includes("मास")) {
    return { width: "8%", minWidth: "60px" };
  }
  if (h.includes("आठवडा") || h.includes("week") || h.includes("दिनांक") || h.includes("तारीख")) {
    return { width: "8%", minWidth: "65px" };
  }
  if (h.includes("दिवस") || h.includes("कामाचे")) {
    return { width: "7%", minWidth: "55px" };
  }
  if (h.includes("तासिका") || h.includes("तास")) {
    return { width: "7%", minWidth: "55px" };
  }
  if (h.includes("साहित्य") || h.includes("साधने")) {
    return { width: "12%", minWidth: "100px" };
  }
  if (h.includes("मूल्यमापन") || h.includes("नोंदी")) {
    return { width: "15%", minWidth: "120px" };
  }

  // Content columns (topics, sub-topics, activities, outcomes, objectives)
  if (h.includes("निष्पत्ती") || h.includes("साध्य") || h.includes("उद्दिष्टे")) {
    return { width: "25%", minWidth: "180px" };
  }
  if (h.includes("विषय") || h.includes("घटक") || h.includes("उपघटक") || h.includes("प्रक्रिया") || h.includes("कृती") || h.includes("विवरण")) {
    return { width: "35%", minWidth: "240px" };
  }

  // Dynamic fallback for any arbitrary totalCols in custom Monthly Excel structure
  if (totalCols > 0) {
    const widthPct = Math.max(8, Math.floor(100 / totalCols));
    return { width: `${widthPct}%`, minWidth: "80px" };
  }

  return {};
};

// Helper to clean column header names (e.g. replaces "विषय : मराठी" with generic "विषय / घटक विवरण")
const getCleanHeaderName = (h: string): string => {
  if (!h) return "";
  const trimmed = h.trim();
  if (
    trimmed.startsWith("विषय :") ||
    trimmed.startsWith("विषय:") ||
    trimmed.toLowerCase().includes("मराठी")
  ) {
    return "विषय / घटक विवरण";
  }
  return trimmed;
};

// Helper to identify header placeholder strings like "अध्ययन निष्पत्ती"
const isHeaderLabelText = (str: string): boolean => {
  if (!str) return false;
  const s = str.trim().toLowerCase();
  return (
    s === "अध्ययन निष्पत्ती" ||
    s === "अध्ययन निष्पती" ||
    s === "अध्ययन निष्पत्ति" ||
    s === "अध्ययन निष्पत्ती:" ||
    s === "अध्ययन निष्पती:"
  );
};

// Helper to detect raw PDF binary stream noise (e.g. /Contents, 4 0 obj, endobj, stream, cm)
const isPdfNoiseLine = (row: string[] | string | undefined): boolean => {
  if (!row) return false;
  const str = Array.isArray(row) ? row.join(" ") : String(row);
  if (!str || !str.trim()) return false;
  const lower = str.toLowerCase().trim();

  const pdfKeywords = [
    "/contents",
    "endobj",
    "stream",
    "endstream",
    "/length",
    "/type /page",
    "/type/page",
    "/mediabox",
    "/resources",
    "/catalog",
    "/parent",
    "/flatedecode",
    "/font",
  ];

  if (pdfKeywords.some((kw) => lower.includes(kw))) return true;
  if (/^\d+\s+\d+\s+obj/i.test(lower)) return true;
  if (/\b\d+\.\d+\s+cm\b/i.test(lower)) return true;
  if (/\b\d+\.\d+\s+w\b/i.test(lower)) return true;
  if (/^\/i\d+\s+do/i.test(lower)) return true;
  if (lower === "q" || lower === "<<" || lower === ">>") return true;

  return false;
};

// Helper to clean cell content: removes PDF stream noise while preserving exact text
const cleanCellContent = (val: string): string => {
  if (!val) return "";
  const trimmed = val.trim();
  if (isPdfNoiseLine(trimmed)) {
    return "";
  }
  return val;
};

// Extracts exact Excel structure handling merged cells via forward-fill + grouping
const extractExcelData = async (
  file: File
): Promise<{ mappedRows: PlanningTableRow[]; rawHeaders: string[]; rawDataRows: string[][] }> => {
  const empty = { mappedRows: [], rawHeaders: [], rawDataRows: [] };
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array", cellStyles: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return empty;

    const worksheet = workbook.Sheets[firstSheetName];
    if (!worksheet || !worksheet["!ref"]) return empty;

    // Read all cells directly by absolute coordinates starting strictly from Column 0 (A)
    // This prevents sheet_to_json from trimming empty leading cells and shifting columns
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    const maxRow = range.e.r;
    const maxCol = range.e.c;

    const rawData: string[][] = [];
    for (let r = 0; r <= maxRow; r++) {
      const row: string[] = [];
      for (let c = 0; c <= maxCol; c++) {
        const cellAddr = XLSX.utils.encode_cell({ r, c });
        const cell = worksheet[cellAddr];
        let val = "";
        if (cell && cell.v !== undefined && cell.v !== null) {
          val = String(cell.w || cell.v).trim();
          if (val.includes("$")) {
            val = val.replace(/\$\s*/g, "").trim();
          }
        }
        row.push(val);
      }
      rawData.push(row);
    }
    if (rawData.length === 0) return empty;

    // ── Step 1: Locate the header row ─────────────────────────────────────────
    const HEADER_KEYWORDS = [
      "महिना", "month", "मास", "कालावधी",
      "आठवडा", "आठवडे", "week", "दिनांक", "तारीख", "date",
      "कामाचे", "दिवस", "working", "days",
      "तासिका", "तास", "period",
      "विषय", "घटक", "उपघटक", "पाठ", "topic", "unit", "विवरण", "content", "तपशील",
      "निष्पत्ती", "outcome", "साध्य", "उद्दिष्टे", "उद्दिष्ट",
      "साहित्य", "साधने", "उपक्रम", "कृती", "प्रक्रिया",
      "मूल्यमापन", "नोंदी", "नोंद", "अ.क्र", "क्र", "sr"
    ];
    let headerRowIdx = -1;
    let maxHeaderMatches = 0;

    for (let r = 0; r < Math.min(rawData.length, 20); r++) {
      const row = rawData[r];
      if (!row || !Array.isArray(row)) continue;

      const nonEmptyCells = row.map((c: any) => String(c ?? "").trim()).filter((h) => h.length > 0 && !isPdfNoiseLine(h));
      if (nonEmptyCells.length < 2) continue; // Skip single-cell title banners like "अभ्यासक्रमाचे मासिक व घटक नियोजन"

      // Count how many header keywords match in this row
      let matches = 0;
      row.forEach((cell: any) => {
        const val = String(cell ?? "").trim().toLowerCase();
        if (val && HEADER_KEYWORDS.some((kw) => val.includes(kw))) {
          matches++;
        }
      });

      // Choose row with highest header keyword matches & non-empty column count
      const score = matches * 10 + nonEmptyCells.length;
      if (score > maxHeaderMatches) {
        maxHeaderMatches = score;
        headerRowIdx = r;
      }
    }

    // Fallback: if no keyword score >= 10, pick the row in first 15 rows with most non-empty columns (>= 3)
    if (headerRowIdx === -1) {
      let maxColsCount = 0;
      for (let r = 0; r < Math.min(rawData.length, 15); r++) {
        const row = rawData[r];
        if (!row || !Array.isArray(row)) continue;
        const nonEmpty = row.filter((c: any) => String(c ?? "").trim().length > 0).length;
        if (nonEmpty >= 3 && nonEmpty > maxColsCount) {
          maxColsCount = nonEmpty;
          headerRowIdx = r;
        }
      }
    }

    if (headerRowIdx === -1) return empty;

    // ── Step 2: Determine full column count & build raw headers ────────
    // 1. Find max columns across all rows from headerRowIdx onwards
    let maxCols = 0;
    for (let r = headerRowIdx; r < Math.min(rawData.length, headerRowIdx + 40); r++) {
      if (Array.isArray(rawData[r])) {
        maxCols = Math.max(maxCols, rawData[r].length);
      }
    }
    if (maxCols === 0) return empty;

    // 2. Build headers across all maxCols columns
    const rawHeaders: string[] = [];
    for (let ci = 0; ci < maxCols; ci++) {
      let hVal = String(rawData[headerRowIdx]?.[ci] ?? "").trim();
      // If blank in primary header row, look 1 row above or below
      if (!hVal && rawData[headerRowIdx + 1]?.[ci]) {
        const nextVal = String(rawData[headerRowIdx + 1][ci]).trim();
        if (nextVal && !isPdfNoiseLine(nextVal)) hVal = nextVal;
      }
      if (!hVal && headerRowIdx > 0 && rawData[headerRowIdx - 1]?.[ci]) {
        const prevVal = String(rawData[headerRowIdx - 1][ci]).trim();
        if (prevVal && !isPdfNoiseLine(prevVal)) hVal = prevVal;
      }
      rawHeaders.push(hVal);
    }

    // 3. Trim completely empty trailing columns at end of sheet
    while (rawHeaders.length > 0 && rawHeaders[rawHeaders.length - 1] === "") {
      // Check if any data row has content in this trailing column
      const hasContent = rawData.some((r, ri) => ri > headerRowIdx && Array.isArray(r) && String(r[rawHeaders.length - 1] ?? "").trim() !== "");
      if (!hasContent) {
        rawHeaders.pop();
      } else {
        break;
      }
    }

    // Replace any remaining empty column headers with descriptive default (e.g. "तपशील / घटक")
    for (let ci = 0; ci < rawHeaders.length; ci++) {
      if (!rawHeaders[ci]) {
        rawHeaders[ci] = ci === 0 ? "अ.क्र / महिना" : `तपशील / माहिती ${ci + 1}`;
      }
    }

    const numCols = rawHeaders.length;
    if (numCols === 0 || rawHeaders.some((h) => isPdfNoiseLine(h))) return empty;

    // ── Step 3: Gather data rows starting from row 0, normalize to numCols ─────
    const dataRows: string[][] = [];
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || !Array.isArray(row)) continue;
      const strRow: string[] = Array.from({ length: numCols }, (_, ci) =>
        String(row[ci] ?? "").trim()
      );
      // Skip only completely empty rows or raw PDF stream noise
      if (strRow.every((c) => c === "") || isPdfNoiseLine(strRow)) continue;
      dataRows.push(strRow);
    }
    if (dataRows.length === 0) return empty;

    // ── Step 4: Strict 1:1 Row Mapping (No cross-row value mixing) ─────────────
    // Keep each row's data strictly in its own row without copying values from previous rows
    const rawDataRows: string[][] = dataRows.map((row) => [...row]);

    // ── Step 7: Build column map for schema-mapped fallback ───────────────────
    const colMap = { srNo: -1, month: -1, subject: -1, weeks: -1, workingDays: -1, periods: -1, topics: -1, outcomes: -1 };
    rawData[headerRowIdx].forEach((cell: any, cIdx: number) => {
      if (cIdx >= numCols) return;
      const ct = String(cell ?? "").trim().toLowerCase();
      if (!ct) return;
      if ((ct.includes("अ.क्र") || ct.includes("क्र") || ct === "sr" || ct === "no") && colMap.srNo === -1) colMap.srNo = cIdx;
      else if ((ct.includes("महिना") || ct.includes("month") || ct.includes("कालावधी") || ct.includes("मास")) && colMap.month === -1) colMap.month = cIdx;
      else if ((ct.includes("विषय") || ct.includes("subject")) && !ct.includes("घटक") && colMap.subject === -1) colMap.subject = cIdx;
      else if ((ct.includes("आठवडा") || ct.includes("आठवडे") || ct.includes("week")) && colMap.weeks === -1) colMap.weeks = cIdx;
      else if ((ct.includes("कामाचे") || ct.includes("दिवस") || ct.includes("working") || ct.includes("days")) && colMap.workingDays === -1) colMap.workingDays = cIdx;
      else if ((ct.includes("तासिका") || ct.includes("तास") || ct.includes("period") || ct.includes("hour")) && colMap.periods === -1) colMap.periods = cIdx;
      else if ((ct.includes("घटक") || ct.includes("पाठ") || ct.includes("topic") || ct.includes("unit") || ct.includes("विवरण") || ct.includes("content")) && colMap.topics === -1) colMap.topics = cIdx;
      else if ((ct.includes("निष्पत्ती") || ct.includes("outcome") || ct.includes("साध्य") || ct.includes("skill")) && colMap.outcomes === -1) colMap.outcomes = cIdx;
    });

    // ── Step 8: Build schema-mapped PlanningTableRow[] with 1:1 positional fallbacks ──
    const get = (row: string[], idx: number, fallbackIdx: number) => {
      const targetIdx = idx !== -1 ? idx : fallbackIdx;
      return row[targetIdx] ? row[targetIdx] : "";
    };

    const mappedRows: PlanningTableRow[] = rawDataRows.map((row, i) => ({
      id: `excel_${Date.now()}_${i}`,
      month: get(row, colMap.month, 0) || `महिना ${i + 1}`,
      subject: get(row, colMap.subject, -1) || "मराठी",
      weeks: get(row, colMap.weeks, 1) || "",
      workingDays: get(row, colMap.workingDays, 2) || "",
      periods: get(row, colMap.periods, 3) || "",
      topics: get(row, colMap.topics, 4) || "",
      outcomes: get(row, colMap.outcomes, 5) || "",
    }));

    return { mappedRows, rawHeaders, rawDataRows };
  } catch (err) {
    console.error("Excel extraction error:", err);
    return empty;
  }
};


export interface PlanningFileRecord {
  id: string;
  academicYear?: string;
  classId: string;
  mediumId: string;
  subjectId: string;
  planningType: "annual" | "monthly" | "question_bank";
  fileName: string;
  fileUrl: string;
  fileSize: string;
  fileType: string;
  uploadedBy: "teacher" | "admin";
  uploadedAt: string;
  tableRows?: PlanningTableRow[];
  // Raw Excel structure (exact headers + rows as uploaded)
  rawHeaders?: string[];
  rawDataRows?: string[][];
  gridData?: ParsedTableCell[][];
  htmlContent?: string;
}

export interface PlanningTableRow {
  id: string;
  month: string;
  subject?: string;
  weeks: string;
  workingDays: string;
  periods: string;
  topics: string;
  outcomes: string;
}

const DEFAULT_ANNUAL_ROWS: PlanningTableRow[] = [
  { id: "1", month: "जून", subject: "मराठी", weeks: "2", workingDays: "13", periods: "33", topics: "वर्ग पूर्वतयारी अभ्यासक्रम\nसराव व उजळणी", outcomes: "चित्र वाचन, अक्षर ओळख व पूर्वतयारी" },
  { id: "2", month: "जुलै", subject: "मराठी", weeks: "5", workingDays: "26", periods: "70", topics: "१. माझ्या या दारातून २. चित्र गप्पा ३. मी आणि माझे कुटुंब\n४. माझी जोडी ५. मला घरापर्यंत पोहोचव", outcomes: "वाचन, लेखन व शब्दसंपदा वाढवणे" },
  { id: "3", month: "ऑगस्ट", subject: "मराठी", weeks: "4", workingDays: "22", periods: "58", topics: "९. अक्षर गट क्र. १ - क म ल आ १०. सोहमचा दिवस\nप्रथम घटक चाचणी", outcomes: "अक्षर व ध्वनी जोडणे, वाक्य वाचन" },
  { id: "4", month: "सप्टेंबर", subject: "मराठी", weeks: "4", workingDays: "24", periods: "64", topics: "(भाग - २) १४. चांगल्या सवयी १५. झुक झुक झुक (कविता)", outcomes: "चित्रकथा वर्णन व स्व-अभिव्यक्ती" },
  { id: "5", month: "ऑक्टोबर", subject: "मराठी", weeks: "4", workingDays: "25", periods: "68", topics: "२०. अक्षरगट क्र. ६ - ध य फ ज श ओ\nप्रथम सत्र संकलित मूल्यमापन क्र. १", outcomes: "प्रथम सत्र संकलित मूल्यमापन व उजळणी" },
];

const DEFAULT_ALL_SUBJECTS_ANNUAL_ROWS: PlanningTableRow[] = [
  // 1. मराठी
  { id: "m1", month: "जून - जुलै", subject: "मराठी", weeks: "7", workingDays: "39", periods: "103", topics: "१. माझ्या या दारातून २. चित्र गप्पा\n३. मी आणि माझे कुटुंब ४. माझी जोडी\n५. फिफ्टी रोड व गिरव ६. राधाचे कुटुंब", outcomes: "चित्र वाचन, शब्द ओळख व वाचन पूर्वतयारी" },
  { id: "m2", month: "ऑगस्ट - सप्टें", subject: "मराठी", weeks: "8", workingDays: "46", periods: "122", topics: "अक्षरगट १ ते ४ (क, म, ल, आ, घर, ब, इ, ई, न, स, प, त)\nप्रथम घटक चाचणी (तोंडी व लेखी)", outcomes: "अक्षर व ध्वनी जोडणे, वाक्य वाचन" },
  { id: "m3", month: "ऑक्टोबर - नोव्हें", subject: "मराठी", weeks: "7", workingDays: "43", periods: "116", topics: "अक्षरगट ५ ते ७ व प्रथम सत्र संकलित मूल्यमापन\nदिवाळी सुट्टी उपक्रम व प्रकल्प", outcomes: "प्रकल्प सादरीकरण व संकलित मूल्यमापन" },
  { id: "m4", month: "डिसें - एप्रिल", subject: "मराठी", weeks: "17", workingDays: "99", periods: "252", topics: "अक्षरगट ८ व संवाद, कविता, चित्रकथा\nद्वितीय सत्र संकलित मूल्यमापन क्र. २", outcomes: "वाचन-लेखन समृद्धी व द्वितीय सत्र मूल्यमापन" },

  // 2. गणित
  { id: "g1", month: "जून - जुलै", subject: "गणित", weeks: "7", workingDays: "39", periods: "95", topics: "१. लहान-मोठा २. मागे-पुढे ३. वर-खाली\n४. १ ते ५ संख्यांची ओळख व लेखन\n५. शून्य (०) ची संकल्पना", outcomes: "स्थानिक संकल्पना व १ ते ५ अंक ओळख" },
  { id: "g2", month: "ऑगस्ट - सप्टें", subject: "गणित", weeks: "8", workingDays: "46", periods: "110", topics: "६. ६ ते ९ संख्यांची ओळख\n७. बेरीज (१ ते ९ पर्यंत)\n८. वजाबाकी (१ ते ९ पर्यंत)\nप्रथम घटक चाचणी", outcomes: "अंक गती व १ ते ९ बेरीज-वजाबाकी" },
  { id: "g3", month: "ऑक्टोबर - नोव्हें", subject: "गणित", weeks: "7", workingDays: "43", periods: "100", topics: "९. १० ची ओळख व दशक संकल्पना\n१०. ११ ते २० संख्या ज्ञान\nप्रथम सत्र संकलित मूल्यमापन", outcomes: "दशक संकल्पना व संकलित मूल्यमापन" },
  { id: "g4", month: "डिसें - एप्रिल", subject: "गणित", weeks: "17", workingDays: "99", periods: "230", topics: "११. २१ ते १०० संख्या ज्ञान\n१२. नाणी व नोटा १३. भौमितिक आकृत्या\nद्वितीय सत्र संकलित मूल्यमापन", outcomes: "व्यवहारी गणित व आकार ओळख" },

  // 3. इंग्रजी
  { id: "e1", month: "जून - जुलै", subject: "इंग्रजी", weeks: "7", workingDays: "39", periods: "80", topics: "1. Greetings & Introduction (Hello, Good Morning)\n2. Rhymes & Action Songs (Johnny Johnny, Twinkle Twinkle)\n3. Look, Listen & Say", outcomes: "Basic English listening & vocabulary" },
  { id: "e2", month: "ऑगस्ट - सप्टें", subject: "इंग्रजी", weeks: "8", workingDays: "46", periods: "95", topics: "4. Alphabet Identification (A to M)\n5. Words starting with A-M\nFirst Unit Test", outcomes: "Recognizing capital & small letters A to M" },
  { id: "e3", month: "ऑक्टोबर - नोव्हें", subject: "इंग्रजी", weeks: "7", workingDays: "43", periods: "88", topics: "6. Alphabet N to Z & Vocabulary\n7. Colors and Numbers (1 to 10 in English)\nFirst Term Summative Assessment", outcomes: "Letter recognition N to Z & term assessment" },
  { id: "e4", month: "डिसें - एप्रिल", subject: "इंग्रजी", weeks: "17", workingDays: "99", periods: "210", topics: "8. Short Conversation & Dialogues\n9. Reading Simple 3-letter Words (cat, bat, mat)\nSecond Term Summative Assessment", outcomes: "3-letter word reading & oral communication" },

  // 4. परिसर अभ्यास / विज्ञान
  { id: "p1", month: "जून - जुलै", subject: "परिसर अभ्यास", weeks: "7", workingDays: "39", periods: "75", topics: "१. माझे कुटुंब व माझा परिसर\n२. परिसर स्वच्छता व वैयक्तिक आरोग्य\n३. आपल्या सभोवतालचे प्राणी व पक्षी", outcomes: "पर्यावरण जाणीव व आरोग्यदायी सवयी" },
  { id: "p2", month: "ऑगस्ट - सप्टें", subject: "परिसर अभ्यास", weeks: "8", workingDays: "46", periods: "85", topics: "४. झाडे व त्यांची काळजी ५. पाणी - आपले जीवन\n६. सण व उत्सव (स्वातंत्र्य दिन, गणेशोत्सव)\nप्रथम घटक चाचणी", outcomes: "झाडे व पाण्याचे महत्त्व समजणे" },
  { id: "p3", month: "ऑक्टोबर - नोव्हें", subject: "परिसर अभ्यास", weeks: "7", workingDays: "43", periods: "80", topics: "७. ऋतुचक्र व कपडे\n८. आपली वाहतूक साधने व नियम\nप्रथम सत्र संकलित मूल्यमापन", outcomes: "वाहतूक नियम व प्रथम सत्र मूल्यमापन" },
  { id: "p4", month: "डिसें - एप्रिल", subject: "परिसर अभ्यास", weeks: "17", workingDays: "99", periods: "190", topics: "९. दिशा व आमचा गाव/शहर\n१०. आपल्या गरजा (अन्न, वस्त्र, निवारा)\nद्वितीय सत्र संकलित मूल्यमापन", outcomes: "दिशा ज्ञान व द्वितीय सत्र मूल्यमापन" },

  // 5. कला, कार्यानुभव व शारीरिक शिक्षण
  { id: "k1", month: "वार्षिक उपक्रम", subject: "कला / क्रीडा", weeks: "36", workingDays: "220", periods: "120", topics: "चित्रकला, रंगभरण, कागदी काम, मातीचे काम, मैदानी खेळ, योगासने व कवायत प्रकार", outcomes: "शारीरिक सुदृढता, कल्पकता व कला कौशल्य विकास" },
];

interface AcademicPlanningSystemProps {
  mode?: "teacher" | "admin";
  initialClass?: string;
  onBack?: () => void;
}

const CLASS_OPTIONS = [
  { id: "1st", mr: "इयत्ता पहिली", en: "Class 1st" },
  { id: "2nd", mr: "इयत्ता दुसरी", en: "Class 2nd" },
  { id: "3rd", mr: "इयत्ता तिसरी", en: "Class 3rd" },
  { id: "4th", mr: "इयत्ता चौथी", en: "Class 4th" },
  { id: "5th", mr: "इयत्ता पाचवी", en: "Class 5th" },
  { id: "6th", mr: "इयत्ता सहावी", en: "Class 6th" },
  { id: "7th", mr: "इयत्ता सातवी", en: "Class 7th" },
  { id: "8th", mr: "इयत्ता आठवी", en: "Class 8th" },
];

const MEDIUM_OPTIONS = [
  { id: "marathi", labelMr: "मराठी माध्यम", labelEn: "Marathi Medium", color: "from-amber-500 to-orange-600" },
  { id: "semi", labelMr: "सेमी-इंग्रजी माध्यम", labelEn: "Semi-English Medium", color: "from-teal-500 to-emerald-600" },
];

export interface UserSchoolProfile {
  schoolName: string;
  kendraName: string;
  talukaName: string;
  udiseNumber: string;
  teacherName: string;
  headMasterName: string;
}

export function AcademicPlanningSystem({
  mode = "teacher",
  initialClass,
  onBack,
}: AcademicPlanningSystemProps) {
  // Wizard Steps: 1: Medium -> 2: Class -> 3: Planning Type -> 4: Subject & Files
  const [step, setStep] = useState<"medium" | "class" | "type" | "subject">("medium");
  const [selectedPlanningType, setSelectedPlanningType] = useState<"annual" | "monthly" | "question_bank">("annual");

  const { user } = useAuth();

  const [selectedClass, setSelectedClass] = useState<string>(initialClass || "5th");
  const [selectedMedium, setSelectedMedium] = useState<string>("marathi");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("2026-27");

  // One-time School & Teacher Profile State for Planning Section
  const [schoolProfile, setSchoolProfile] = useState<UserSchoolProfile>({
    schoolName: "",
    kendraName: "",
    talukaName: "",
    udiseNumber: "",
    teacherName: "",
    headMasterName: "",
  });
  const [showSchoolForm, setShowSchoolForm] = useState<boolean>(false);
  const [isSavingSchoolProfile, setIsSavingSchoolProfile] = useState<boolean>(false);
  const [schoolFormData, setSchoolFormData] = useState<UserSchoolProfile>({
    schoolName: "",
    kendraName: "",
    talukaName: "",
    udiseNumber: "",
    teacherName: "",
    headMasterName: "",
  });

  useEffect(() => {
    const effectiveUserId = user?.uid || auth?.currentUser?.uid || "guest_teacher";
    const storageKey = `user_planning_school_profile_${effectiveUserId}`;

    const cached = localStorage.getItem(storageKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setSchoolProfile(parsed);
        setSchoolFormData(parsed);
        if (!parsed.schoolName) setShowSchoolForm(true);
      } catch (e) {}
    } else {
      setShowSchoolForm(true);
    }

    const fetchSchoolProfile = async () => {
      if (db && effectiveUserId && effectiveUserId !== "guest_teacher") {
        try {
          const docRef = doc(db, "user_planning_school_profiles", effectiveUserId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data() as UserSchoolProfile;
            setSchoolProfile(data);
            setSchoolFormData(data);
            localStorage.setItem(storageKey, JSON.stringify(data));
            if (!data.schoolName) setShowSchoolForm(true);
          }
        } catch (err) {
          console.warn("Planning school profile fetch notice:", err);
        }
      }
    };

    fetchSchoolProfile();
  }, [user?.uid]);

  const handleSaveSchoolProfile = async () => {
    try {
      setIsSavingSchoolProfile(true);
      const effectiveUserId = user?.uid || auth?.currentUser?.uid || "guest_teacher";
      const storageKey = `user_planning_school_profile_${effectiveUserId}`;

      localStorage.setItem(storageKey, JSON.stringify(schoolFormData));

      if (db && effectiveUserId && effectiveUserId !== "guest_teacher") {
        try {
          const docRef = doc(db, "user_planning_school_profiles", effectiveUserId);
          await setDoc(docRef, { ...schoolFormData, updatedAt: new Date().toISOString() }, { merge: true });
        } catch (e) {
          console.warn("Firestore save planning school profile notice:", e);
        }
      }

      setSchoolProfile(schoolFormData);
      setShowSchoolForm(false);
      toast.success("🎉 शाळा व शिक्षक माहिती यशस्वीरित्या जतन झाली!");
    } catch (err) {
      console.error("Save school profile error:", err);
      toast.error("माहिती जतन करताना त्रुटी आली.");
    } finally {
      setIsSavingSchoolProfile(false);
    }
  };

  // Real-time planning files map: key -> PlanningFileRecord
  const [planningFiles, setPlanningFiles] = useState<Record<string, PlanningFileRecord>>({});
  const [loadingFiles, setLoadingFiles] = useState<boolean>(true);

  // Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [uploadingType, setUploadingType] = useState<"annual" | "monthly" | "question_bank">("annual");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  // View Preview Modal State
  const [viewModalFile, setViewModalFile] = useState<PlanningFileRecord | null>(null);
  const [isPdfFullscreen, setIsPdfFullscreen] = useState<boolean>(true);

  // Annotation / PDF Edit States
  const [isAnnotating, setIsAnnotating] = useState<boolean>(false);
  const [annotationTool, setAnnotationTool] = useState<"draw" | "highlight" | "text" | "erase" | "whiteout">("draw");
  const [annotationColor, setAnnotationColor] = useState<string>("#ef4444");
  const [lineWidth, setLineWidth] = useState<number>(3);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasAnnotations, setHasAnnotations] = useState<boolean>(false);

  // Sync canvas size with container when annotating starts
  useEffect(() => {
    if (isAnnotating && canvasRef.current) {
      const canvas = canvasRef.current;
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    }
  }, [isAnnotating, isPdfFullscreen]);

  const handleStartDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (annotationTool === "text") {
      const input = prompt("खालील टीप किंवा नवीन माहिती टाइप करा (Type new text):");
      if (input && input.trim()) {
        ctx.font = "bold 16px sans-serif";
        ctx.fillStyle = annotationColor;
        ctx.fillText(input.trim(), x, y);
        setHasAnnotations(true);
      }
      return;
    }

    if (annotationTool === "whiteout") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x - 14, y - 10, 28, 20);
      setIsDrawing(true);
      setHasAnnotations(true);
      return;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const handleDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (annotationTool === "erase") {
      ctx.clearRect(x - 12, y - 12, 24, 24);
      return;
    }

    if (annotationTool === "whiteout") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x - 14, y - 10, 28, 20);
      setHasAnnotations(true);
      return;
    }

    ctx.strokeStyle = annotationColor;
    ctx.lineWidth = annotationTool === "highlight" ? 18 : lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = annotationTool === "highlight" ? 0.35 : 1.0;
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasAnnotations(true);
  };

  const handleStopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.globalAlpha = 1.0;
      }
    }
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasAnnotations(false);
      toast.info("अॅनोटेशन्स साफ केले गेले.");
    }
  };

  const handleSaveAnnotatedPdf = async () => {
    if (!viewModalFile) return;
    try {
      toast.info("संपादित फाईल जतन होत आहे...");
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
      const imgData = canvas.toDataURL("image/png");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      const pdfBlob = pdf.output("blob");

      const recordKey = viewModalFile.id;
      await saveFileToIndexedDB(recordKey, pdfBlob);
      const newBlobUrl = URL.createObjectURL(pdfBlob);

      const updatedRecord: PlanningFileRecord = {
        ...viewModalFile,
        fileUrl: newBlobUrl,
        uploadedAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, "academic_plannings", recordKey), updatedRecord, { merge: true });
      } catch (e) { }

      setPlanningFiles((prev) => ({ ...prev, [recordKey]: updatedRecord }));
      setViewModalFile(updatedRecord);
      setIsAnnotating(false);
      toast.success("संपादित PDF यशस्वीरित्या जतन झाली!");
    } catch (err) {
      console.error("Save annotated PDF error:", err);
      toast.error("PDF जतन करताना अडथळा आला.");
    }
  };

  // Table Editor & Information Editing States
  const [isTableEditorOpen, setIsTableEditorOpen] = useState<boolean>(false);
  const [editingFileRecord, setEditingFileRecord] = useState<PlanningFileRecord | null>(null);
  const [tableRows, setTableRows] = useState<PlanningTableRow[]>(DEFAULT_ANNUAL_ROWS);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isSavingTableData, setIsSavingTableData] = useState<boolean>(false);
  const printableTableRef = useRef<HTMLDivElement | null>(null);
  // Raw Excel editing states (exact Excel structure)
  const [rawEditorHeaders, setRawEditorHeaders] = useState<string[]>([]);
  const [rawEditorRows, setRawEditorRows] = useState<string[][]>([]);

  const handleSaveTableDataOnly = async () => {
    try {
      setIsSavingTableData(true);
      toast.info("वार्षिक नियोजन माहिती जतन होत आहे...");

      const recordKey = editingFileRecord
        ? editingFileRecord.id
        : getFileRecordKey(selectedPlanningType, selectedSubject);

      const fileNameStr = editingFileRecord?.fileName || `इयत्ता_${selectedClass}_वार्षिक_नियोजन_2026-27.pdf`;

      const updatedRecord: PlanningFileRecord = {
        ...(editingFileRecord || {}),
        id: recordKey,
        classId: selectedClass,
        mediumId: selectedMedium,
        subjectId: editingFileRecord?.subjectId || selectedSubject || "मराठी",
        planningType: editingFileRecord?.planningType || selectedPlanningType,
        fileName: fileNameStr,
        fileUrl: editingFileRecord?.fileUrl || "",
        fileSize: editingFileRecord?.fileSize || "0.5 MB",
        fileType: "application/pdf",
        uploadedBy: mode,
        uploadedAt: new Date().toISOString(),
        tableRows: tableRows,
        ...(rawEditorHeaders.length > 0 && { rawHeaders: rawEditorHeaders }),
        ...(rawEditorRows.length > 0 && { rawDataRows: rawEditorRows }),
      };

      try {
        await setDoc(doc(db, "academic_plannings", recordKey), updatedRecord, { merge: true });
      } catch (e) {
        console.warn("Firestore save notice:", e);
      }

      setPlanningFiles((prev) => ({ ...prev, [recordKey]: updatedRecord }));
      if (viewModalFile && viewModalFile.id === recordKey) {
        setViewModalFile(updatedRecord);
      }

      setIsSavingTableData(false);
      setIsTableEditorOpen(false);
      toast.success("🎉 वार्षिक नियोजन माहिती यशस्वीरित्या जतन झाली!");
    } catch (err) {
      console.error("Save table data error:", err);
      setIsSavingTableData(false);
      toast.error("माहिती सेव्ह करताना अडथळा आला.");
    }
  };

  const handleOpenTableEditor = (e: React.MouseEvent, rec?: PlanningFileRecord | null) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingFileRecord(rec || null);
    if (rec && rec.rawHeaders && rec.rawHeaders.length > 0) {
      setRawEditorHeaders(rec.rawHeaders);
      setRawEditorRows(rec.rawDataRows ? rec.rawDataRows.map((r) => [...r]) : []);
      setTableRows([]);  // clear schema rows when using raw mode
    } else if (rec && rec.tableRows && rec.tableRows.length > 0) {
      setRawEditorHeaders([]);
      setRawEditorRows([]);
      setTableRows(rec.tableRows);
    } else {
      setRawEditorHeaders([]);
      setRawEditorRows([]);
      setTableRows(DEFAULT_ANNUAL_ROWS);
    }
    setIsTableEditorOpen(true);
  };

  const handleUpdateTableRow = (id: string, field: keyof PlanningTableRow, value: string) => {
    setTableRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleAddTableRow = () => {
    const newRow: PlanningTableRow = {
      id: Date.now().toString(),
      month: "नवीन महिना",
      subject: selectedSubject || "मराठी",
      weeks: "4",
      workingDays: "20",
      periods: "50",
      topics: "नवीन घटक / पाठ माहिती",
      outcomes: "अध्ययन निष्पत्ती माहिती",
    };
    setTableRows((prev) => [...prev, newRow]);
    toast.success("तक्त्यात नवीन ओळ जोडली गेली.");
  };

  const handleRemoveTableRow = (id: string) => {
    if (tableRows.length <= 1) {
      toast.error("किमान एक नोंद असणे आवश्यक आहे.");
      return;
    }
    setTableRows((prev) => prev.filter((r) => r.id !== id));
    toast.info("नोंद हटवली गेली.");
  };

  const handleGeneratePdfFromEditedTable = async () => {
    const container = document.getElementById("printable-pdf-container");
    try {
      setIsGeneratingPdf(true);
      toast.info("संपादित माहितीची नवीन PDF तयार होत आहे...");

      const printElement = printableTableRef.current;
      if (!printElement) {
        toast.error("प्रिंट घटक सापडला नाही.");
        setIsGeneratingPdf(false);
        return;
      }

      if (container) {
        container.style.position = "fixed";
        container.style.left = "-9999px";
        container.style.top = "0px";
        container.style.width = "190mm";
        container.style.margin = "0px";
        container.style.padding = "0px";
        container.style.display = "block";
        container.style.visibility = "visible";
        container.style.opacity = "1";
        container.style.zIndex = "99999";
      }

      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const subjectName = selectedSubject || "मराठी";
      const classNameStr =
        selectedClass === "1st"
          ? "1ली"
          : selectedClass === "2nd"
            ? "2री"
            : selectedClass === "3rd"
              ? "3री"
              : selectedClass === "4th"
                ? "4थी"
                : selectedClass === "5th"
                  ? "5वी"
                  : selectedClass === "6th"
                    ? "6वी"
                    : selectedClass === "7th"
                      ? "7वी"
                      : selectedClass === "8th"
                        ? "8वी"
                        : selectedClass;

      const fileNameStr = `इयत्ता_${classNameStr}_${selectedPlanningType === "annual" ? "संपूर्ण_वार्षिक_नियोजन" : subjectName}_2026-27.pdf`;

      const opt = {
        margin: [10, 10, 10, 10],
        filename: fileNameStr,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          letterRendering: true,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css"], avoid: ["tr", "td", "th", "div", "p", ".avoid-break"] },
      };

      const pdfBlob = await (html2pdf() as any).from(printElement).set(opt).output("blob");

      if (container) {
        container.style.display = "none";
        container.style.visibility = "hidden";
        container.style.opacity = "0";
      }

      if (!pdfBlob) throw new Error("PDF generation failed");

      const recordKey = editingFileRecord ? editingFileRecord.id : getFileRecordKey(selectedPlanningType, selectedSubject);
      await saveFileToIndexedDB(recordKey, pdfBlob);
      const newBlobUrl = URL.createObjectURL(pdfBlob);

      const fileSizeMb = (pdfBlob.size / (1024 * 1024)).toFixed(2);
      const updatedRecord: PlanningFileRecord = {
        ...(editingFileRecord || {}),
        id: recordKey,
        classId: selectedClass,
        mediumId: selectedMedium,
        subjectId: editingFileRecord?.subjectId || selectedSubject || "मराठी",
        planningType: editingFileRecord?.planningType || selectedPlanningType,
        fileName: editingFileRecord?.fileName || fileNameStr,
        fileUrl: newBlobUrl,
        fileSize: `${fileSizeMb} MB`,
        fileType: "application/pdf",
        uploadedBy: mode,
        uploadedAt: new Date().toISOString(),
        tableRows: rawEditorHeaders.length > 0 ? tableRows : tableRows,
        ...(rawEditorHeaders.length > 0 && { rawHeaders: rawEditorHeaders }),
        ...(rawEditorRows.length > 0 && { rawDataRows: rawEditorRows }),
      };


      try {
        await setDoc(doc(db, "academic_plannings", recordKey), updatedRecord, { merge: true });
      } catch (e) { }

      setPlanningFiles((prev) => ({ ...prev, [recordKey]: updatedRecord }));
      setIsTableEditorOpen(false);
      setIsGeneratingPdf(false);

      // Trigger automatic browser download
      const a = document.createElement("a");
      a.href = newBlobUrl;
      a.download = fileNameStr;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success("🎉 संपादित तक्त्याची PDF यशस्वीरित्या तयार होऊन डाऊनलोड झाली!");
    } catch (err) {
      console.error("Generate PDF error:", err);
      if (container) {
        container.style.display = "none";
        container.style.visibility = "hidden";
        container.style.opacity = "0";
      }
      setIsGeneratingPdf(false);
      toast.error("PDF तयार करताना अडथळा आला.");
    }
  };



  // Upload progress & compression states
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [compressing, setCompressing] = useState<boolean>(false);

  /**
   * Fast client-side PDF compressor using pdf-lib object stream compression
   */
  const compressPdfFile = async (file: File): Promise<Blob> => {
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      return file;
    }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const compressedPdfBytes = await pdfDoc.save({ useObjectStreams: true });
      if (compressedPdfBytes.byteLength < file.size) {
        const exactBytes = new Uint8Array(compressedPdfBytes);
        return new Blob([exactBytes], { type: "application/pdf" });
      }
    } catch (err) {
      console.warn("PDF compression notice (using original):", err);
    }
    return file;
  };

  // Custom Subjects State
  const [customSubjectsMap, setCustomSubjectsMap] = useState<Record<string, string[]>>(() => {
    try {
      const cached = localStorage.getItem("cce_academic_custom_subjects_cache");
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });

  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState<boolean>(false);
  const [newSubjectName, setNewSubjectName] = useState<string>("");
  const [isSavingSubject, setIsSavingSubject] = useState<boolean>(false);

  // Real-time Firestore sync listener for custom subjects
  useEffect(() => {
    const unsubCustom = onSnapshot(
      collection(db, "academic_custom_subjects"),
      (snapshot) => {
        const cMap: Record<string, string[]> = {};
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && Array.isArray(data.subjects)) {
            cMap[docSnap.id] = data.subjects;
          }
        });
        try {
          const cached = localStorage.getItem("cce_academic_custom_subjects_cache");
          if (cached) {
            const parsed = JSON.parse(cached);
            Object.assign(cMap, parsed);
          }
        } catch (e) { }
        setCustomSubjectsMap(cMap);
      },
      (err) => {
        console.warn("Custom subjects listener notice:", err);
      }
    );

    return () => unsubCustom();
  }, []);

  // Real-time Firestore sync listener for planning_files
  useEffect(() => {
    setLoadingFiles(true);
    const unsub = onSnapshot(
      collection(db, "academic_plannings"),
      (snapshot) => {
        const filesMap: Record<string, PlanningFileRecord> = {};
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data() as PlanningFileRecord;
          filesMap[docSnap.id] = data;

          // If current modal file was replaced in Firestore, update active modal view
          if (viewModalFile && viewModalFile.id === docSnap.id && data.uploadedAt !== viewModalFile.uploadedAt) {
            setViewModalFile(data);
          }
        });

        setPlanningFiles(filesMap);
        setLoadingFiles(false);

        try {
          localStorage.setItem("cce_academic_plannings_cache", JSON.stringify(filesMap));
        } catch (e) { }
      },
      (err) => {
        console.warn("Planning files realtime listener notice:", err);
        try {
          const cached = localStorage.getItem("cce_academic_plannings_cache");
          if (cached) {
            setPlanningFiles(JSON.parse(cached));
          }
        } catch (e) { }
        setLoadingFiles(false);
      }
    );

    return () => unsub();
  }, [viewModalFile]);

  const customKey = `${selectedClass}_${selectedMedium}`;

  // Compute available subjects for selected class & medium (combining defaults + custom subjects)
  const availableSubjects = React.useMemo(() => {
    if (!selectedClass || !selectedMedium) return [];
    const defaults = getDefaultSubjectsForClass(selectedClass, selectedMedium);
    const customs = customSubjectsMap[customKey] || [];
    const combined = [...defaults];
    customs.forEach((cs) => {
      if (!combined.includes(cs)) {
        combined.push(cs);
      }
    });
    return combined;
  }, [selectedClass, selectedMedium, customSubjectsMap, customKey]);

  // Handle Add Custom Subject
  const handleAddSubject = async () => {
    const trimmed = newSubjectName.trim();
    if (!trimmed) {
      toast.error("कृपया विषयाचे नाव टाका!");
      return;
    }

    if (availableSubjects.includes(trimmed)) {
      toast.error("हा विषय आधीपासूनच उपलब्ध आहे!");
      return;
    }

    setIsSavingSubject(true);
    try {
      const currentCustoms = customSubjectsMap[customKey] || [];
      const updatedCustoms = [...currentCustoms, trimmed];

      const docRef = doc(db, "academic_custom_subjects", customKey);
      await setDoc(docRef, { subjects: updatedCustoms, updatedAt: new Date().toISOString() }, { merge: true });

      const newMap = { ...customSubjectsMap, [customKey]: updatedCustoms };
      setCustomSubjectsMap(newMap);
      localStorage.setItem("cce_academic_custom_subjects_cache", JSON.stringify(newMap));

      toast.success(`'${trimmed}' हा विषय यशस्वीरित्या जोडला!`);
      setNewSubjectName("");
      setIsAddSubjectOpen(false);
    } catch (err: any) {
      console.error("Error adding custom subject:", err);
      const currentCustoms = customSubjectsMap[customKey] || [];
      const updatedCustoms = [...currentCustoms, trimmed];
      const newMap = { ...customSubjectsMap, [customKey]: updatedCustoms };
      setCustomSubjectsMap(newMap);
      localStorage.setItem("cce_academic_custom_subjects_cache", JSON.stringify(newMap));

      toast.success(`'${trimmed}' विषय जोडला गेला (Local Cache)!`);
      setNewSubjectName("");
      setIsAddSubjectOpen(false);
    } finally {
      setIsSavingSubject(false);
    }
  };

  // Handle Delete Custom Subject
  const handleDeleteCustomSubject = async (e: React.MouseEvent, subjToDelete: string) => {
    e.stopPropagation();
    if (!confirm(`'${subjToDelete}' हा विषय हटवायचा आहे का?`)) return;

    try {
      const currentCustoms = customSubjectsMap[customKey] || [];
      const updatedCustoms = currentCustoms.filter((s) => s !== subjToDelete);

      const docRef = doc(db, "academic_custom_subjects", customKey);
      await setDoc(docRef, { subjects: updatedCustoms, updatedAt: new Date().toISOString() }, { merge: true });

      const newMap = { ...customSubjectsMap, [customKey]: updatedCustoms };
      setCustomSubjectsMap(newMap);
      localStorage.setItem("cce_academic_custom_subjects_cache", JSON.stringify(newMap));

      toast.success(`'${subjToDelete}' विषय हटवला गेला.`);
    } catch (err) {
      console.error("Error deleting custom subject:", err);
      toast.error("विषय हटवताना त्रुटी आली.");
    }
  };

  // Helper to construct normalized deterministic record key:
  // academicYear_mediumId_classId_planningType_subjectId
  const getFileRecordKey = (
    pType: "annual" | "monthly" | "question_bank" = selectedPlanningType,
    subjName?: string,
    clsId?: string,
    medId?: string,
    yearStr?: string
  ) => {
    const year = (yearStr || selectedAcademicYear || "2026-27").trim();
    const med = (medId || selectedMedium || "marathi").trim().toLowerCase();
    const cls = (clsId || selectedClass || "1st").trim().toLowerCase();
    const type = (pType || selectedPlanningType || "annual").trim().toLowerCase();
    const rawSubj = subjName !== undefined ? subjName : (selectedSubject || "all");
    const subj = (rawSubj || "all").trim().toLowerCase();

    return `${year}_${med}_${cls}_${type}_${subj}`;
  };

  // Reusable helper to lookup planning file record from state with logging
  const getPlanningFile = (
    pType: "annual" | "monthly" | "question_bank" = selectedPlanningType,
    subjName?: string,
    clsId?: string,
    medId?: string,
    yearStr?: string
  ): PlanningFileRecord | undefined => {
    const fileKey = getFileRecordKey(pType, subjName, clsId, medId, yearStr);
    let fileRecord = planningFiles[fileKey];

    // Fallback check for legacy record keys (e.g. classId_mediumId_subjectId_planningType)
    if (!fileRecord) {
      const cls = (clsId || selectedClass || "1st").trim().toLowerCase();
      const med = (medId || selectedMedium || "marathi").trim().toLowerCase();
      const rawSubj = subjName !== undefined ? subjName : (selectedSubject || "all");
      const subj = (rawSubj || "all").trim().toLowerCase();
      const type = (pType || selectedPlanningType || "annual").trim().toLowerCase();

      const legacyKey1 = `${cls}_${med}_${subj}_${type}`;
      const legacyKey2 = `${cls}_${med}_${subj}`;
      fileRecord = planningFiles[legacyKey1] || planningFiles[legacyKey2];
    }

    console.log("Selected Class:", clsId || selectedClass);
    console.log("Selected Medium:", medId || selectedMedium);
    console.log("Selected Planning Type:", pType || selectedPlanningType);
    console.log("Selected Subject:", subjName !== undefined ? subjName : selectedSubject);
    console.log("Generated File Key:", fileKey);
    console.log("Fetched Planning File:", fileRecord);

    return fileRecord;
  };

  // Handle File Select with Validations (Max 20MB, Allowed Formats: PDF, DOC, DOCX)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 20MB)
    const maxBytes = 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error("फाइल खूप मोठी आहे! (कमाल मर्यादा: 20MB)");
      setSelectedFile(null);
      return;
    }

    // Validate type (PDF, DOC, DOCX, XLS, XLSX, CSV)
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
      "application/csv",
    ];
    const ext = file.name.split(".").pop()?.toLowerCase();
    const validExtensions = ["pdf", "doc", "docx", "xls", "xlsx", "csv"];
    if (!validTypes.includes(file.type) && !validExtensions.includes(ext || "")) {
      toast.error("केवळ PDF, Word (DOC/DOCX), किंवा Excel (XLS/XLSX) फाईल्स स्वीकारल्या जातात.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    toast.success(`फाईल निवडली: ${file.name}`);
  };

  // Submit / Save File Upload (PDF Compression + Reliable Multi-Provider Cloud Upload)
  const handleSaveFileUpload = async () => {
    if (!selectedFile) {
      toast.error("कृपया अपलोड करण्यासाठी फाईल निवडा.");
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    setCompressing(true);

    try {
      const normYear = (selectedAcademicYear || "2026-27").trim();
      const normMed = (selectedMedium || "marathi").trim().toLowerCase();
      const normCls = (selectedClass || "1st").trim().toLowerCase();
      const normType = (uploadingType || selectedPlanningType || "annual").trim().toLowerCase();
      const normSubj = (selectedSubject || "all").trim().toLowerCase();

      const recordKey = getFileRecordKey(uploadingType, selectedSubject || "all");
      const ext = selectedFile.name.split(".").pop()?.toLowerCase() || "pdf";

      const originalSizeMb = (selectedFile.size / (1024 * 1024)).toFixed(2);

      let finalFileBlob: Blob = selectedFile;
      if (ext === "pdf" || selectedFile.type === "application/pdf") {
        toast.info("⚡ PDF फाईल कॉम्प्रेस होत आहे...");
        finalFileBlob = await compressPdfFile(selectedFile);
      } else {
        toast.info("⚡ फाईल जोडली जात आहे...");
      }
      setCompressing(false);
      setUploadProgress(30);

      const compressedSizeMb = (finalFileBlob.size / (1024 * 1024)).toFixed(2);

      // 1. Store binary Blob in local IndexedDB for instant zero-latency view
      await saveFileToIndexedDB(recordKey, finalFileBlob);

      // 2. Upload file directly via uploadFileWithProgress (tries Bunny Storage CDN, then Firebase Storage)
      toast.info("⚡ सर्व्हरवर फाईल अपलोड होत आहे...");
      const fileToUpload =
        finalFileBlob instanceof File
          ? finalFileBlob
          : new File([finalFileBlob], selectedFile.name, {
              type: finalFileBlob.type || selectedFile.type || "application/octet-stream",
            });

      let uploadedFileUrl = "";
      try {
        const uploadResult = await uploadFileWithProgress(fileToUpload, {
          folderPath: `planning/${normYear}/${normMed}/${normCls}/${normType}`,
          onProgress: (pct) => {
            const currentPct = 30 + Math.round((pct / 100) * 55);
            setUploadProgress(Math.min(currentPct, 88));
          },
        });
        uploadedFileUrl = uploadResult.url;
      } catch (uploadErr) {
        console.warn("Cloud upload notice (using blob URL fallback):", uploadErr);
        uploadedFileUrl = URL.createObjectURL(finalFileBlob);
      }

      setUploadProgress(90);

      // 3. Extract structured table rows from uploaded file (PDF or Excel)
      toast.info("🔍 फाईलमधून तक्ता व माहिती एक्सट्रॅक्ट होत आहे...");
      let extractedRows: PlanningTableRow[] = [];
      let excelRawHeaders: string[] = [];
      let excelRawDataRows: string[][] = [];
      try {
        if (ext === "xls" || ext === "xlsx" || ext === "csv") {
          const excelResult = await parseExcelFile(fileToUpload);
          if (excelResult.gridData && excelResult.gridData.length > 0) {
            excelRawHeaders = excelResult.rawHeaders;
            excelRawDataRows = excelResult.gridData.map((row) =>
              row.map((cell) => cell.value || "")
            );
            extractedRows = excelResult.mappedRows;
          } else {
            const fallbackResult = await extractExcelData(fileToUpload);
            extractedRows = fallbackResult.mappedRows;
            excelRawHeaders = fallbackResult.rawHeaders;
            excelRawDataRows = fallbackResult.rawDataRows;
          }
        } else {
          extractedRows = await extractTableRowsFromPdf(fileToUpload);
        }
      } catch (exErr) {
        console.warn("File extraction notice:", exErr);
      }

      const rowsToSave =
        extractedRows.length > 0
          ? extractedRows
          : uploadingType === "annual"
            ? DEFAULT_ALL_SUBJECTS_ANNUAL_ROWS
            : DEFAULT_ANNUAL_ROWS;

      const fileSizeDisplay = `${compressedSizeMb} MB`;

      // 4. Ensure payload is compact so setDoc never exceeds Firestore 1MB document limit
      const safeRawDataRows =
        excelRawDataRows.length > 0 && excelRawDataRows.length <= 50 ? excelRawDataRows : [];
      const safeTableRows = rowsToSave.length <= 50 ? rowsToSave : [];

      const newRecord: PlanningFileRecord = {
        id: recordKey,
        academicYear: normYear,
        classId: selectedClass,
        mediumId: selectedMedium,
        subjectId: selectedSubject || "all",
        planningType: uploadingType,
        fileName: selectedFile.name,
        fileUrl: uploadedFileUrl,
        fileSize: fileSizeDisplay,
        fileType:
          selectedFile.type ||
          (ext === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        uploadedBy: mode,
        uploadedAt: new Date().toISOString(),
        ...(safeTableRows.length > 0 && { tableRows: safeTableRows }),
        ...(excelRawHeaders.length > 0 && { rawHeaders: excelRawHeaders }),
        ...(safeRawDataRows.length > 0 && { rawDataRows: safeRawDataRows }),
      };

      // 5. Save metadata to Firestore with fallback for payload size safety
      try {
        await setDoc(doc(db, "academic_plannings", recordKey), newRecord, { merge: true });
      } catch (fsErr) {
        console.warn("Firestore save fallback notice:", fsErr);
        const slimRecord = { ...newRecord };
        delete (slimRecord as any).rawDataRows;
        delete (slimRecord as any).tableRows;
        await setDoc(doc(db, "academic_plannings", recordKey), slimRecord, { merge: true }).catch(
          () => {}
        );
      }

      setUploadProgress(100);

      // 6. Update local state and cache
      setPlanningFiles((prev) => {
        const updated = { ...prev, [recordKey]: newRecord };
        try {
          localStorage.setItem("cce_academic_plannings_cache", JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      if (extractedRows.length > 0) {
        toast.success(
          `🎉 फाईलमधून ${extractedRows.length} तक्ता नोंदी एक्सट्रॅक्ट करून सेव्ह झाल्या!`
        );
      } else {
        toast.success(`🎉 फाईल यशस्वीरित्या जतन झाली! (${compressedSizeMb}MB)`);
      }

      setUploading(false);
      setUploadProgress(0);
      setSelectedFile(null);
      setUploadModalOpen(false);
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error("अपलोड अयशस्वी: " + (err?.message || "काहीतरी अडचण आली"));
      setUploading(false);
      setUploadProgress(0);
      setCompressing(false);
    }
  };

  // Helper to trigger VIEW preview (checks IndexedDB for persistent blob across page refreshes)
  const handleViewFile = async (rec: PlanningFileRecord) => {
    if (!rec) return;

    // Check latest Firestore realtime doc to ensure user sees file replaced by Admin
    const latestRec = planningFiles[rec.id] || rec;
    let targetUrl = latestRec.fileUrl;

    // Check if Admin uploaded a newer version (uploadedAt changed)
    const cachedMeta = localStorage.getItem(`cce_meta_${latestRec.id}`);
    const isNewerAdminVersion = cachedMeta && cachedMeta !== latestRec.uploadedAt;

    if (isNewerAdminVersion) {
      try {
        const dbReq = indexedDB.open("cce_file_store", 1);
        dbReq.onsuccess = () => {
          const idb = dbReq.result;
          if (idb.objectStoreNames.contains("files")) {
            const tx = idb.transaction("files", "readwrite");
            tx.objectStore("files").delete(latestRec.id);
          }
        };
      } catch (e) { }
    }
    localStorage.setItem(`cce_meta_${latestRec.id}`, latestRec.uploadedAt || "");

    const blobFromDb = await getFileFromIndexedDB(latestRec.id);
    if (blobFromDb && !isNewerAdminVersion) {
      targetUrl = URL.createObjectURL(blobFromDb);
    }

    if (!targetUrl) {
      toast.error("अद्याप फाईल उपलब्ध नाही, कृपया फाईल निवडून पुन्हा अपलोड करा.");
      return;
    }

    // ── Auto-parse Excel structure if rawHeaders are missing ─────────────────
    // This handles records uploaded before the raw Excel parsing logic was added.
    // We fetch the blob from IndexedDB, re-parse it, and enrich the record.
    const isExcel = Boolean(
      rec.fileName?.match(/\.(xlsx?|csv)$/i) ||
      rec.fileUrl?.match(/\.(xlsx?|csv)$/i) ||
      rec.fileType?.includes("spreadsheet") ||
      rec.fileType?.includes("excel") ||
      rec.fileType?.includes("sheet") ||
      rec.fileType?.includes("csv") ||
      (rec.gridData && rec.gridData.length > 0) ||
      (rec.rawHeaders && rec.rawHeaders.length > 0)
    );

    let enrichedRec = {
      ...rec,
      fileUrl: targetUrl,
      ...(isExcel && { fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    };

    if (isExcel && blobFromDb) {
      try {
        toast.info("📊 Excel ची संपूर्ण माहिती (All Rows) लोड होत आहे...", { duration: 2000 });
        const excelFile = new File([blobFromDb], rec.fileName || "file.xlsx", {
          type: blobFromDb.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const excelResult = await parseExcelFile(excelFile);
        if (excelResult.htmlContent) {
          enrichedRec = {
            ...enrichedRec,
            htmlContent: excelResult.htmlContent,
            gridData: excelResult.gridData,
            rawHeaders: excelResult.rawHeaders,
            rawDataRows: excelResult.gridData.map((row) => row.map((cell) => cell.value || "")),
          };
        }
      } catch (parseErr) {
        console.warn("Excel re-parse notice:", parseErr);
      }
    }

    setViewModalFile(enrichedRec);
  };


  // Helper to trigger Direct Full Screen PDF Editor
  const handleOpenDirectPdfEditor = async (
    e?: React.MouseEvent,
    rec?: PlanningFileRecord | null
  ) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!rec) {
      toast.error("एडमिनने अद्याप या विषयाची PDF फाईल अपलोड केलेली नाही.");
      return;
    }

    let targetUrl = rec.fileUrl;
    const blobFromDb = await getFileFromIndexedDB(rec.id);
    if (blobFromDb) {
      targetUrl = URL.createObjectURL(blobFromDb);
    }

    if (!targetUrl) {
      toast.error("अद्याप फाईल उपलब्ध नाही, कृपया फाईल निवडून पुन्हा अपलोड करा.");
      return;
    }

    setViewModalFile({ ...rec, fileUrl: targetUrl });
    setIsAnnotating(true);
    setIsPdfFullscreen(true);
  };

  // Helper to trigger download / open (converts Excel/table data into PDF before downloading)
  const handleDownloadFile = async (rec: PlanningFileRecord) => {
    if (!rec) return;

    // If rec has structured table data or Excel rows, convert to PDF and download
    if ((rec.rawHeaders && rec.rawHeaders.length > 0) || (rec.tableRows && rec.tableRows.length > 0) || (rec.rawDataRows && rec.rawDataRows.length > 0)) {
      if (rec.rawHeaders && rec.rawHeaders.length > 0) {
        setRawEditorHeaders(rec.rawHeaders);
        setRawEditorRows(rec.rawDataRows ? rec.rawDataRows.map((r) => [...r]) : []);
      } else if (rec.tableRows && rec.tableRows.length > 0) {
        setTableRows(rec.tableRows);
      }
      setEditingFileRecord(rec);
      setTimeout(() => {
        handleGeneratePdfFromEditedTable();
      }, 100);
      return;
    }

    let targetUrl = rec.fileUrl;
    const blobFromDb = await getFileFromIndexedDB(rec.id);
    if (blobFromDb) {
      targetUrl = URL.createObjectURL(blobFromDb);
    }

    if (!targetUrl) {
      toast.error("डाउनलोड करण्यासाठी फाईल उपलब्ध नाही.");
      return;
    }

    const pdfName = (rec.fileName || `${rec.planningType}_planning`).replace(/\.[^/.]+$/, "") + ".pdf";

    const a = document.createElement("a");
    a.href = targetUrl;
    a.download = pdfName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("PDF फाईल डाऊनलोड होत आहे...");
  };

  const stepsList = [
    { id: "medium", labelMr: "माध्यम", labelEn: "Medium" },
    { id: "class", labelMr: "इयत्ता", labelEn: "Class" },
    { id: "type", labelMr: "नियोजन प्रकार", labelEn: "Planning Type" },
    { id: "subject", labelMr: "विषय व फाईल", labelEn: "Subject & Files" },
  ];

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 p-2 sm:p-4 md:p-6 font-sans">
      {/* Top Header Bar */}
      <div className="w-full max-w-full mx-auto mb-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white rounded-3xl p-6 shadow-xl border border-indigo-900/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer border border-white/10 active:scale-95"
            >
              <ArrowLeft className="size-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 text-[10px] font-black uppercase tracking-wider">
                {mode === "admin" ? "ADMIN MANAGEMENT" : "TEACHER SECTION"}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2 mt-1">
              <BookCheck className="size-6 text-amber-400" />
              <span>वार्षिक व मासिक नियोजन प्रणाली (Academic Planning)</span>
            </h1>
            <p className="text-xs text-slate-300 font-medium">
              माध्यम, इयत्ता व विषयनिहाय वार्षिक नियोजन, मासिक नियोजन आणि प्रश्नपेढी
            </p>
          </div>
        </div>

        {/* Current Selections Summary Badge & School Info Edit Button */}
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <button
            type="button"
            onClick={() => {
              setSchoolFormData(schoolProfile);
              setShowSchoolForm(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white px-3.5 py-2 rounded-2xl text-xs font-black shadow-md cursor-pointer transition-all active:scale-95 border border-amber-300/30 shrink-0"
          >
            <School className="size-4 text-amber-100" />
            <span>🏫 शाळा माहिती {schoolProfile.schoolName ? "संपादन" : "भरा (Setup)"}</span>
          </button>

          {selectedMedium && (
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15 text-xs font-bold">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase">माध्यम:</span>
                <span className="text-teal-300">
                  {selectedMedium === "semi" ? "सेमी-इंग्रजी" : "मराठी"}
                </span>
              </div>
              {selectedClass && (
                <>
                  <div className="h-6 w-px bg-white/20" />
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">इयत्ता:</span>
                    <span className="text-amber-300">{selectedClass}</span>
                  </div>
                </>
              )}
              {step === "subject" && (
                <>
                  <div className="h-6 w-px bg-white/20" />
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">प्रकार:</span>
                    <span className="text-emerald-300">
                      {selectedPlanningType === "annual"
                        ? "वार्षिक नियोजन"
                        : selectedPlanningType === "monthly"
                          ? "मासिक नियोजन"
                          : "प्रश्नपेढी"}
                    </span>
                  </div>
                </>
              )}
              {selectedSubject && (
                <>
                  <div className="h-6 w-px bg-white/20" />
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">विषय:</span>
                    <span className="text-purple-300">{selectedSubject}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress Breadcrumbs Stepper */}
      <div className="w-full max-w-full mx-auto mb-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Layers className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              PLANNING PROGRESS / टप्पे
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {step === "medium" && "१. माध्यम निवडा (Select Medium: मराठी / सेमी)"}
              {step === "class" && "२. इयत्ता निवडा (Select Class: 1st - 8th)"}
              {step === "type" && "३. नियोजन प्रकार निवडा (Select Type: वार्षिक / मासिक / प्रश्नपेढी)"}
              {step === "subject" && "४. विषय निवडा व नियोजन पहा/एडिट करा (Select Subject & Files)"}
            </p>
          </div>
        </div>

        {/* Step Circles */}
        <div className="flex items-center gap-3">
          {stepsList.map((s, idx) => {
            const stepsOrder = ["medium", "class", "type", "subject"];
            const currIdx = stepsOrder.indexOf(step);
            const thisIdx = stepsOrder.indexOf(s.id);
            const isCompleted = thisIdx < currIdx;
            const isActive = s.id === step;

            return (
              <React.Fragment key={s.id}>
                {idx > 0 && (
                  <div
                    className={`h-1 w-6 sm:w-10 rounded-full transition-all ${isCompleted ? "bg-indigo-600" : "bg-slate-200"
                      }`}
                  />
                )}
                <button
                  disabled={thisIdx > currIdx}
                  onClick={() => setStep(s.id as any)}
                  className={`size-10 rounded-2xl flex items-center justify-center text-xs font-black transition-all cursor-pointer ${isActive
                    ? "bg-indigo-600 text-white shadow-lg ring-4 ring-indigo-100 scale-110"
                    : isCompleted
                      ? "bg-slate-900 text-white hover:bg-slate-800"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    }`}
                >
                  {isCompleted ? <CheckCircle2 className="size-4 text-emerald-400" /> : idx + 1}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>



      {/* Main Content Area */}
      <div className="w-full max-w-full mx-auto">
        <AnimatePresence mode="wait">
          {/* STEP 1: MEDIUM SELECTION */}
          {step === "medium" && (
            <motion.div
              key="step-medium"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6 w-full max-w-full mx-auto"
            >
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-black text-slate-900">Select Medium / माध्यम निवडा</h2>
                <p className="text-xs text-slate-500 font-semibold">
                  वार्षिक व मासिक नियोजनासाठी प्रथम माध्यम निवडा (मराठी किंवा सेमी-इंग्रजी)
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {MEDIUM_OPTIONS.map((med) => {
                  const isSelected = selectedMedium === med.id;
                  return (
                    <button
                      key={med.id}
                      onClick={() => {
                        setSelectedMedium(med.id);
                        setStep("class");
                      }}
                      className={`p-8 rounded-3xl border text-left transition-all duration-300 cursor-pointer flex flex-col justify-between gap-6 relative overflow-hidden group ${isSelected
                        ? "bg-gradient-to-br from-indigo-700 to-purple-800 text-white border-indigo-700 shadow-2xl scale-102"
                        : "bg-white text-slate-800 border-slate-200 hover:border-indigo-400 hover:shadow-xl hover:scale-101"
                        }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div
                          className={`size-14 rounded-2xl flex items-center justify-center font-black text-lg ${isSelected
                            ? "bg-white/20 text-white"
                            : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors"
                            }`}
                        >
                          <Languages className="size-7" />
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                          {med.id === "semi" ? "Semi English" : "Marathi"}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xl font-black">{med.labelMr}</h3>
                        <p className={`text-xs font-semibold mt-1 ${isSelected ? "text-indigo-200" : "text-slate-500"}`}>
                          {med.labelEn}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-500 group-hover:text-indigo-600">
                        <span>इयत्ता निवडीसाठी पुढे जा</span>
                        <span>→</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 2: CLASS SELECTION */}
          {step === "class" && (
            <motion.div
              key="step-class"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-black text-slate-900">Select Class / इयत्ता निवडा</h2>
                <p className="text-xs text-slate-500 font-semibold">
                  निवडलेले माध्यम: <span className="font-bold text-indigo-600">{selectedMedium === "semi" ? "सेमी-इंग्रजी माध्यम" : "मराठी माध्यम"}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {CLASS_OPTIONS.map((cls) => {
                  const isSelected = selectedClass === cls.id;
                  return (
                    <button
                      key={cls.id}
                      onClick={() => {
                        setSelectedClass(cls.id);
                        setStep("type");
                      }}
                      className={`p-6 rounded-3xl border text-center transition-all duration-300 cursor-pointer flex flex-col items-center gap-3 relative overflow-hidden group ${isSelected
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-200 scale-105"
                        : "bg-white text-slate-800 border-slate-200 hover:border-indigo-400 hover:shadow-lg hover:scale-102"
                        }`}
                    >
                      <div
                        className={`size-12 rounded-2xl flex items-center justify-center font-black text-base ${isSelected
                          ? "bg-white/20 text-white"
                          : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors"
                          }`}
                      >
                        <GraduationCap className="size-6" />
                      </div>
                      <div>
                        <h4 className="font-black text-base">{cls.mr}</h4>
                        <p className={`text-[10px] font-bold ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                          {cls.en}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setStep("medium")}
                  className="px-6 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <ChevronLeft className="size-4" /> मागे जा (Back to Medium)
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: PLANNING TYPE SELECTION (ANNUAL PLANNING ALL SUBJECTS + MONTHLY/QB BY SUBJECT) */}
          {step === "type" && (
            <motion.div
              key="step-type"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-black text-slate-900">
                  Select Planning Type / नियोजन प्रकार निवडा
                </h2>
                <p className="text-xs text-slate-500 font-semibold">
                  माध्यम: <span className="font-bold text-indigo-600">{selectedMedium === "semi" ? "सेमी-इंग्रजी" : "मराठी"}</span> | इयत्ता: <span className="font-bold text-indigo-600">{selectedClass}</span> साठी नियोजन पर्याय:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-full mx-auto">
                {/* 1. Annual Planning Card (इयत्तानिहाय संपूर्ण वार्षिक नियोजन - Direct Class Action) */}
                {(() => {
                  const annualFile = getPlanningFile("annual", "all");
                  return (
                    <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white rounded-[2.5rem] p-7 border border-indigo-500/30 shadow-xl flex flex-col justify-between gap-6 relative overflow-hidden group hover:shadow-2xl transition-all">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="size-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center">
                            <BookOpen className="size-7 text-amber-300" />
                          </div>
                          {annualFile ? (
                            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 className="size-3" /> Available
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                              इयत्ता {selectedClass}
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 className="text-2xl font-black">Annual Planning</h3>
                          <p className="text-xs font-semibold text-indigo-100/90 mt-1">
                            (वार्षिक नियोजन - इयत्ता {selectedClass})
                          </p>
                          <p className="text-xs text-slate-200 mt-3 leading-relaxed font-medium">
                            {annualFile
                              ? `फाईल: ${annualFile.fileName} (${annualFile.fileSize})`
                              : `या इयत्तेसाठी (इयत्ता ${selectedClass}) वार्षिक नियोजन PDF उपलब्ध नाही.`}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-3 border-t border-white/15">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (annualFile) handleViewFile(annualFile);
                              else toast.error(`या इयत्तेसाठी (${selectedClass}) अद्याप वार्षिक नियोजनाची फाईल उपलब्ध नाही.`);
                            }}
                            className="py-3 px-4 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer backdrop-blur-xs shadow-sm"
                          >
                            <Eye className="size-4 text-amber-300" /> VIEW PDF
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (annualFile) handleDownloadFile(annualFile);
                              else toast.error(`या इयत्तेसाठी (${selectedClass}) अद्याप वार्षिक नियोजनाची फाईल उपलब्ध नाही.`);
                            }}
                            className="py-3 px-4 rounded-xl bg-white text-indigo-950 hover:bg-indigo-50 text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                          >
                            <Download className="size-4" /> DOWNLOAD
                          </button>
                        </div>

                        <button
                          onClick={(e) => handleOpenTableEditor(e, annualFile)}
                          className="w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md mt-1"
                        >
                          <Edit3 className="size-4" /> <span>✏️ एडिट करा (Edit)</span>
                        </button>

                        {/* Admin Upload / Replace Class File */}
                        {mode === "admin" && (
                          <button
                            onClick={() => {
                              setSelectedSubject("all");
                              setUploadingType("annual");
                              setUploadModalOpen(true);
                            }}
                            className="w-full py-2.5 px-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md mt-1"
                          >
                            <Upload className="size-4" />
                            {annualFile ? `REPLACE ${selectedClass} ANNUAL PDF (बदला)` : `UPLOAD ${selectedClass} ANNUAL PDF (अपलोड)`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Monthly Planning Card (विषयनिहाय - Sub-selection) */}
                <div
                  onClick={() => {
                    setSelectedPlanningType("monthly");
                    setStep("subject");
                  }}
                  className="bg-gradient-to-br from-teal-700 via-emerald-800 to-slate-900 text-white rounded-[2.5rem] p-7 border border-teal-500/30 shadow-xl flex flex-col justify-between gap-6 relative overflow-hidden group hover:shadow-2xl hover:scale-102 transition-all cursor-pointer"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="size-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center">
                        <Calendar className="size-7 text-amber-300" />
                      </div>
                      <span className="px-3 py-1 rounded-full bg-teal-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                        विषयनिहाय
                      </span>
                    </div>

                    <div>
                      <h3 className="text-2xl font-black">Monthly Planning</h3>
                      <p className="text-xs font-semibold text-teal-100/90 mt-1">
                        (मासिक नियोजन - विषयानुसार)
                      </p>
                      <p className="text-xs text-slate-200 mt-3 leading-relaxed">
                        मराठी, गणित, इंग्रजी इत्यादी विषयानुसार मासिक घटक व पाठ नियोजनाची पत्रके पाहण्यासाठी
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/15 flex items-center justify-between font-black text-xs text-amber-300 group-hover:text-white transition-colors">
                    <span>विषय निवडा व नियोजन पहा</span>
                    <span>→</span>
                  </div>
                </div>

                {/* 3. Question Bank Card (विषयनिहाय - Sub-selection) */}
                <div
                  onClick={() => {
                    setSelectedPlanningType("question_bank");
                    setStep("subject");
                  }}
                  className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white rounded-[2.5rem] p-7 border border-slate-700/50 shadow-xl flex flex-col justify-between gap-6 relative overflow-hidden group hover:shadow-2xl hover:scale-102 transition-all cursor-pointer"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="size-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center">
                        <FolderOpen className="size-7 text-amber-300" />
                      </div>
                      <span className="px-3 py-1 rounded-full bg-purple-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                        विषयनिहाय
                      </span>
                    </div>

                    <div>
                      <h3 className="text-2xl font-black">Question Bank</h3>
                      <p className="text-xs font-semibold text-slate-300 mt-1">
                        (प्रश्नपेढी दालन)
                      </p>
                      <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                        सर्व विषयांचे घटकनिहाय प्रश्न संच व सराव प्रश्नपत्रिका पहा किंवा डाऊनलोड करा
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/15 flex items-center justify-between font-black text-xs text-amber-300 group-hover:text-white transition-colors">
                    <span>विषय निवडा व प्रश्नपेढी पहा</span>
                    <span>→</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setStep("class")}
                  className="px-6 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <ChevronLeft className="size-4" /> मागे जा (Back to Class)
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: SUBJECT SELECTION & FILE ACTIONS FOR CHOSEN PLANNING TYPE */}
          {step === "subject" && (
            <motion.div
              key="step-subject"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Dashboard Sub-Header */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    Select Subject & Access Files / विषय व नियोजन फाईल्स
                  </h2>
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mt-0.5">
                    MEDIUM: {selectedMedium === "semi" ? "Semi-English" : "Marathi"} | CLASS: {selectedClass} | TYPE: {selectedPlanningType === "annual" ? "वार्षिक नियोजन (Annual)" : selectedPlanningType === "monthly" ? "मासिक नियोजन (Monthly)" : "प्रश्नपेढी (Question Bank)"}
                  </p>
                </div>

                <button
                  onClick={() => setStep("type")}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-slate-200"
                >
                  <ChevronLeft className="size-4" /> &lt; BACK (प्रकार निवडीकडे)
                </button>
              </div>

              {/* Grid of Subjects with File Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-full mx-auto">
                {availableSubjects.map((subjName, idx) => {
                  const fileRec = getPlanningFile(selectedPlanningType, subjName);
                  const isCustom = (customSubjectsMap[customKey] || []).includes(subjName);

                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-md flex flex-col justify-between gap-6 hover:shadow-xl hover:border-indigo-300 transition-all relative group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="size-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                            <BookOpen className="size-5" />
                          </div>
                          {fileRec ? (
                            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 className="size-3 text-emerald-600" /> Available
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase tracking-wider">
                              Not Uploaded
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-black text-slate-900 truncate">{subjName}</h3>
                            {isCustom && (
                              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 shrink-0">
                                नवीन
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 font-semibold mt-1 truncate">
                            {fileRec
                              ? `फाईल: ${fileRec.fileName} (${fileRec.fileSize})`
                              : `${selectedPlanningType === "annual" ? "वार्षिक नियोजन" : selectedPlanningType === "monthly" ? "मासिक नियोजन" : "प्रश्नपेढी"} पत्रक`}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2 pt-3 border-t border-slate-100">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (fileRec) handleViewFile(fileRec);
                              else toast.error(`अद्याप ${subjName} ची फाईल उपलब्ध नाही.`);
                            }}
                            className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="size-4 text-indigo-600" /> VIEW PDF
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (fileRec) handleDownloadFile(fileRec);
                              else toast.error(`अद्याप ${subjName} ची फाईल उपलब्ध नाही.`);
                            }}
                            className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Download className="size-4" /> DOWNLOAD
                          </button>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (fileRec) handleViewFile(fileRec);
                            else toast.error(`अद्याप ${subjName} ची फाईल उपलब्ध नाही.`);
                          }}
                          className="w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm mt-1"
                        >
                          <Edit3 className="size-4" /> <span>✏️ एडिट करा (Edit)</span>
                        </button>



                        {/* Admin Upload / Replace Button */}
                        {mode === "admin" && (
                          <button
                            onClick={() => {
                              setSelectedSubject(subjName);
                              setUploadingType(selectedPlanningType);
                              setUploadModalOpen(true);
                            }}
                            className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm mt-1"
                          >
                            <Upload className="size-4" />
                            {fileRec ? "REPLACE FILE (बदला)" : "UPLOAD FILE (अपलोड करा)"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* ADD NEW SUBJECT CARD (ADMIN ONLY) */}
                {mode === "admin" && (
                  <button
                    onClick={() => setIsAddSubjectOpen(true)}
                    className="p-6 rounded-[2rem] border-2 border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-100/60 hover:border-indigo-500 text-indigo-700 transition-all duration-300 cursor-pointer flex flex-col justify-center items-center text-center gap-3 group hover:shadow-md"
                  >
                    <div className="size-12 rounded-2xl bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center font-bold transition-colors">
                      <Plus className="size-6" />
                    </div>
                    <div>
                      <h4 className="font-black text-base text-indigo-900">+ नवीन विषय जोडा</h4>
                      <p className="text-[11px] font-bold text-indigo-600/80">
                        Add Custom Subject (Admin Only)
                      </p>
                    </div>
                  </button>
                )}
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setStep("type")}
                  className="px-6 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <ChevronLeft className="size-4" /> मागे जा (Back to Planning Type)
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* UPLOAD FILE MODAL (Steps 10, 11, 12 in flowchart) */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 text-left space-y-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Upload className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Upload Planning File / फाईल अपलोड
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {uploadingType === "annual"
                      ? "वार्षिक नियोजन"
                      : uploadingType === "monthly"
                        ? "मासिक नियोजन"
                        : "प्रश्नपेढी"}{" "}
                    | {selectedClass} | {selectedMedium === "semi" ? "सेमी" : "मराठी"} | {selectedSubject}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setUploadModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>



            {/* Dropzone File Input */}
            <div className="space-y-4">
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider">
                Select File (फाईल निवडा):
              </label>

              <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-3xl p-6 text-center bg-indigo-50/40 hover:bg-indigo-50 transition-all cursor-pointer relative group">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />

                <div className="size-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <FileCheck className="size-6" />
                </div>

                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-black text-indigo-900">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">
                      आकार: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-700">
                      इथे फाईल drag करा किंवा कॉम्प्युटरवरून निवडा
                    </p>
                    <p className="text-[11px] text-indigo-600 font-bold">
                      PDF, Word (.docx) किंवा Excel (.xlsx) फाईल (कमाल २०MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar & Compression Indicator */}
            {uploading && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                  <span className="flex items-center gap-1.5">
                    {compressing ? (
                      <>
                        <Sparkles className="size-4 text-amber-500 animate-bounce" />
                        <span>⚡ PDF कॉम्प्रेस व कॉम्पॅक्ट होत आहे...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="size-4 text-indigo-600 animate-spin" />
                        <span>अपलोड प्रगती (Uploading): {uploadProgress}%</span>
                      </>
                    )}
                  </span>
                  <span className="font-extrabold">{compressing ? "25%" : `${uploadProgress}%`}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${compressing ? 25 : uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                रद्द करा (Cancel)
              </button>

              <button
                type="button"
                disabled={!selectedFile || uploading}
                onClick={handleSaveFileUpload}
                className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all cursor-pointer shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    अपलोड होत आहे...
                  </>
                ) : (
                  <>
                    <Upload className="size-4" />
                    SUBMIT & SAVE (जतन करा)
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* VIEW FILE PREVIEW MODAL */}
      {viewModalFile && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 pt-16 sm:pt-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-white rounded-2xl sm:rounded-3xl w-full flex flex-col shadow-2xl overflow-hidden border border-slate-700/50 transition-all duration-300 ${isPdfFullscreen
              ? "h-full max-w-none max-h-none rounded-xl sm:rounded-2xl"
              : "max-w-5xl h-[82vh] max-h-[85vh] mt-10"
              }`}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-9 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 font-bold shrink-0">
                  <Eye className="size-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black tracking-tight">
                    {selectedPlanningType === "annual" ? "वार्षिक नियोजन" : selectedPlanningType === "monthly" ? "मासिक नियोजन" : "प्रश्नपेढी"}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-end">
                {/* CLOSE */}
                <button
                  onClick={() => {
                    setViewModalFile(null);
                    setIsAnnotating(false);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Modal Preview Body */}
            <div className="flex-1 p-2 sm:p-4 overflow-hidden bg-slate-950/80 flex flex-col items-center justify-center relative">
              <div className="w-full h-full min-h-0 flex-1 relative rounded-2xl overflow-y-auto bg-white shadow-2xl flex flex-col p-4">
                <PlanningTableRenderer record={viewModalFile as any} fileUrl={viewModalFile.fileUrl} mode={mode} />
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ADD CUSTOM SUBJECT MODAL */}
      {isAddSubjectOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-indigo-100 text-indigo-600">
                  <Plus className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">नवीन विषय जोडा</h3>
                  <p className="text-xs font-semibold text-slate-500">
                    इयत्ता {selectedClass} ({selectedMedium === "semi" ? "सेमी-इंग्रजी" : "मराठी"})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddSubjectOpen(false);
                  setNewSubjectName("");
                }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                विषयाचे नाव (Subject Name): <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="उदा. संगणक / Computer / चित्रकला"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold text-slate-800"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddSubject();
                }}
                autoFocus
              />
              <p className="text-[11px] text-slate-400 font-medium">
                * जोडलेला विषय या इयत्ता आणि माध्यमासाठी सेव्ह होईल व सर्वांना दिसेल.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setIsAddSubjectOpen(false);
                  setNewSubjectName("");
                }}
                className="px-5 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all cursor-pointer"
              >
                रद्द करा (Cancel)
              </button>
              <button
                onClick={handleAddSubject}
                disabled={isSavingSubject}
                className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                {isSavingSubject ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                <span>विषय जोडा (Add Subject)</span>
              </button>
            </div>
          </div>
        </div>
      )}


      {/* LIVE SITE DOCUMENT EDITOR MODAL */}
      {isTableEditorOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 pt-16 sm:pt-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-[95vw] h-[84vh] max-h-[86vh] mt-10 flex flex-col shadow-2xl overflow-hidden border border-slate-200"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between gap-3 shrink-0 border-b border-indigo-800/50">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-amber-400/20 border border-amber-400/30 text-amber-300 flex items-center justify-center font-bold">
                  <Edit3 className="size-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight">
                    वार्षिक नियोजन एडिट करा
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveTableDataOnly}
                  disabled={isSavingTableData}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSavingTableData ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" /> जतन होत आहे...
                    </>
                  ) : (
                    <>
                      <Save className="size-4" /> जतन करा (Save)
                    </>
                  )}
                </button>

                <button
                  onClick={() => setIsTableEditorOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Table Body & Direct Cell Text Editors */}
            <div className="flex-1 p-3 sm:p-5 overflow-y-auto bg-slate-100 flex flex-col gap-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 font-medium flex items-center gap-2.5 shadow-xs">
                <Sparkles className="size-4 text-amber-600 shrink-0" />
                <span>
                  तक्त्यामधील कोणत्याही चौकटीत (महिना, तासिका, घटक विवरण, अध्ययन निष्पत्ती) थेट क्लिक करून माहिती वेबसाईटवर ऑनलाईन टाईप/संपादित करा. बदल पूर्ण झाल्यावर <b>"बदलांसह PDF डाऊनलोड करा"</b> वर क्लिक करा.
                </span>
              </div>

              {/* ═══ RAW EXCEL STRUCTURE EDITOR ═══ */}
              {rawEditorHeaders.length > 0 && !rawEditorHeaders.some((h) => isPdfNoiseLine(h)) && rawEditorRows.some((r) => !isPdfNoiseLine(r)) ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white flex-1">
                  <table className="w-full text-left border-collapse table-fixed min-w-[750px]">
                    <thead>
                      <tr className="bg-slate-200 text-slate-950 text-xs font-black border-b-2 border-slate-400">
                        {rawEditorHeaders.map((h, hi) => {
                          const style = getRawColumnWidthStyle(h, hi, rawEditorHeaders.length);
                          return (
                            <th key={hi} className="p-2 border-r border-slate-300 bg-slate-200 text-slate-950 font-black text-center text-xs" style={style}>
                              {getCleanHeaderName(h)}
                            </th>
                          );
                        })}
                        <th className="p-2 w-12 text-center bg-slate-200 text-slate-950 font-black text-xs">कृती</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {rawEditorRows.map((row, ri) => {
                        const numCols = rawEditorHeaders.length;
                        const rowType = detectRowType(row);

                        if (rowType === "signature") {
                          const leftTxt = row.find((c) => c && (c.includes("शिक्षक") || c.includes("वर्ग"))) || "विषय / वर्ग शिक्षक";
                          const rightTxt = row.find((c) => c && c.includes("मुख्याध्यापक")) || "मुख्याध्यापक";
                          const halfCols = Math.ceil(numCols / 2);
                          const remCols = numCols - halfCols;
                          return (
                            <tr key={ri} className="bg-amber-100/90 font-black border-t-2 border-b-2 border-amber-300">
                              <td colSpan={halfCols} className="p-2.5 text-left font-black text-xs text-amber-950 border-r border-amber-200">
                                <input
                                  type="text"
                                  value={leftTxt}
                                  onChange={(e) => {
                                    setRawEditorRows((prev) => {
                                      const updated = prev.map((r, idx) => idx === ri ? [...r] : r);
                                      updated[ri][0] = e.target.value;
                                      return updated;
                                    });
                                  }}
                                  className="w-full px-2 py-1 bg-amber-50 border border-amber-300 rounded font-black text-amber-950"
                                />
                              </td>
                              <td colSpan={remCols + 1} className="p-2.5 text-right font-black text-xs text-amber-950">
                                <input
                                  type="text"
                                  value={rightTxt}
                                  onChange={(e) => {
                                    setRawEditorRows((prev) => {
                                      const updated = prev.map((r, idx) => idx === ri ? [...r] : r);
                                      const lastIdx = numCols - 1;
                                      updated[ri][lastIdx] = e.target.value;
                                      return updated;
                                    });
                                  }}
                                  className="w-full px-2 py-1 bg-amber-50 border border-amber-300 rounded font-black text-amber-950 text-right"
                                />
                              </td>
                            </tr>
                          );
                        }

                        if (rowType === "title") {
                          const titleTxt = row.find((c) => c && c.trim() !== "") || "अभ्यासक्रमाचे मासिक व घटक नियोजन";
                          return (
                            <tr key={ri} className="bg-amber-100 font-bold border-b border-amber-200">
                              <td colSpan={numCols + 1} className="p-2 text-center align-middle">
                                <input
                                  type="text"
                                  value={titleTxt}
                                  onChange={(e) => {
                                    setRawEditorRows((prev) => {
                                      const updated = prev.map((r, idx) => idx === ri ? [...r] : r);
                                      const targetIdx = row.findIndex((c) => c && c.trim() !== "") >= 0 ? row.findIndex((c) => c && c.trim() !== "") : 0;
                                      updated[ri][targetIdx] = e.target.value;
                                      return updated;
                                    });
                                  }}
                                  className="w-full px-2 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-950 font-black text-xs text-center focus:ring-2 focus:ring-amber-500"
                                />
                              </td>
                            </tr>
                          );
                        }

                        if (rowType === "meta") {
                          const nonEmpties = row.filter((c) => c && c.trim() !== "");
                          const leftTxt = nonEmpties[0] || "";
                          const rightTxt = nonEmpties[1] || "";
                          const halfCols = Math.ceil(numCols / 2);
                          const remCols = numCols - halfCols;
                          return (
                            <tr key={ri} className="bg-amber-50/80 font-bold border-b border-amber-200">
                              <td colSpan={halfCols} className="p-2 text-left align-middle">
                                <input
                                  type="text"
                                  value={leftTxt}
                                  onChange={(e) => {
                                    setRawEditorRows((prev) => {
                                      const updated = prev.map((r, idx) => idx === ri ? [...r] : r);
                                      updated[ri][0] = e.target.value;
                                      return updated;
                                    });
                                  }}
                                  className="w-full px-2 py-1 rounded border border-amber-200 bg-white font-bold text-xs"
                                />
                              </td>
                              <td colSpan={remCols + 1} className="p-2 text-right align-middle">
                                <input
                                  type="text"
                                  value={rightTxt}
                                  onChange={(e) => {
                                    setRawEditorRows((prev) => {
                                      const updated = prev.map((r, idx) => idx === ri ? [...r] : r);
                                      const targetIdx = numCols - 1;
                                      updated[ri][targetIdx] = e.target.value;
                                      return updated;
                                    });
                                  }}
                                  className="w-full px-2 py-1 rounded border border-amber-200 bg-white font-bold text-xs text-right"
                                />
                              </td>
                            </tr>
                          );
                        }

                        if (rowType === "header_repeat") {
                          return (
                            <tr key={ri} className="bg-amber-200/90 font-black border-b-2 border-amber-400">
                              {rawEditorHeaders.map((h, ci) => {
                                const style = getRawColumnWidthStyle(h, ci, numCols);
                                return (
                                  <th key={ci} className="p-2 border-r border-amber-300 text-center text-xs font-black text-amber-950 bg-amber-200" style={style}>
                                    {getCleanHeaderName(h)}
                                  </th>
                                );
                              })}
                              <td className="p-1 text-center bg-amber-200"></td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={ri} className="border-b border-slate-100 hover:bg-slate-50/90 transition-colors">
                            {rawEditorHeaders.map((h, ci) => {
                              const style = getRawColumnWidthStyle(h, ci, numCols);
                              const val = cleanCellContent(row[ci] ?? "");
                              const dynRows = getDynamicRows(val, false);
                              return (
                                <td key={ci} className="p-1 border-r border-slate-100 align-top" style={style}>
                                  <textarea
                                    rows={dynRows}
                                    value={val}
                                    onChange={(e) => {
                                      setRawEditorRows((prev) => {
                                        const updated = prev.map((r, idx) => idx === ri ? [...r] : r);
                                        updated[ri][ci] = e.target.value;
                                        return updated;
                                      });
                                    }}
                                    className="w-full px-1.5 py-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs overflow-hidden resize-none leading-relaxed text-slate-900 font-medium bg-white"
                                  />
                                </td>
                              );
                            })}
                            <td className="p-1 text-center align-middle">
                              <button
                                type="button"
                                onClick={() => setRawEditorRows((prev) => prev.filter((_, idx) => idx !== ri))}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                                title="ओळ हटवा (Delete Row)"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white flex-1">
                  <table className="w-full text-left border-collapse min-w-[850px] table-fixed">
                    <thead>
                      <tr className="bg-slate-900 text-white text-xs font-black uppercase tracking-wider">
                        <th className="p-2.5 w-[7%] text-center border-r border-slate-800">महिना</th>
                        {(selectedPlanningType === "annual" || selectedSubject === "सर्व विषय" || selectedSubject === "all") && (
                          <th className="p-2.5 w-[10%] text-center border-r border-slate-800">विषय (Subject)</th>
                        )}
                        <th className="p-2.5 w-[5%] text-center border-r border-slate-800">आठवडा</th>
                        <th className="p-2.5 w-[7%] text-center border-r border-slate-800">कामाचे दिवस</th>
                        <th className="p-2.5 w-[7%] text-center border-r border-slate-800">प्राप्त तासिका</th>
                        <th className="p-2.5 w-[42%] border-r border-slate-800">विषय / घटक विवरण</th>
                        <th className="p-2.5 w-[22%] border-r border-slate-800">अध्ययन निष्पत्ती</th>
                        <th className="p-2.5 w-12 text-center">कृती</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {tableRows.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/90 transition-colors">
                          <td className="p-1.5 border-r border-slate-200">
                            <input
                              type="text"
                              value={row.month}
                              onChange={(e) => handleUpdateTableRow(row.id, "month", e.target.value)}
                              className="w-full px-1.5 py-1 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 text-center text-xs"
                            />
                          </td>
                          {(selectedPlanningType === "annual" || selectedSubject === "सर्व विषय" || selectedSubject === "all") && (
                            <td className="p-1.5 border-r border-slate-200">
                              <input
                                type="text"
                                value={row.subject || "मराठी"}
                                onChange={(e) => handleUpdateTableRow(row.id, "subject", e.target.value)}
                                className="w-full px-1.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50/50 focus:ring-2 focus:ring-indigo-500 font-black text-indigo-900 text-center text-xs"
                              />
                            </td>
                          )}
                          <td className="p-1.5 border-r border-slate-200">
                            <input
                              type="text"
                              value={row.weeks}
                              onChange={(e) => handleUpdateTableRow(row.id, "weeks", e.target.value)}
                              className="w-full px-1.5 py-1 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-slate-800 text-center text-xs font-semibold"
                            />
                          </td>
                          <td className="p-1.5 border-r border-slate-200">
                            <input
                              type="text"
                              value={row.workingDays}
                              onChange={(e) => handleUpdateTableRow(row.id, "workingDays", e.target.value)}
                              className="w-full px-1.5 py-1 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-slate-800 text-center text-xs font-semibold"
                            />
                          </td>
                          <td className="p-1.5 border-r border-slate-200">
                            <input
                              type="text"
                              value={row.periods}
                              onChange={(e) => handleUpdateTableRow(row.id, "periods", e.target.value)}
                              className="w-full px-1.5 py-1 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-slate-800 text-center text-xs font-semibold"
                            />
                          </td>
                          <td className="p-1.5 border-r border-slate-200">
                            <textarea
                              rows={getDynamicRows(row.topics, false)}
                              value={row.topics}
                              onChange={(e) => handleUpdateTableRow(row.id, "topics", e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium text-xs overflow-hidden resize-none leading-relaxed"
                            />
                          </td>
                          <td className="p-1.5 border-r border-slate-200">
                            <textarea
                              rows={getDynamicRows(row.outcomes, false)}
                              value={cleanCellContent(row.outcomes)}
                              onChange={(e) => handleUpdateTableRow(row.id, "outcomes", e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium text-xs overflow-hidden resize-none leading-relaxed"
                            />
                          </td>
                          <td className="p-1 text-center">
                            <button
                              onClick={() => handleRemoveTableRow(row.id)}
                              title="ओळ हटवा"
                              className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end items-center pt-2">

                <button
                  onClick={handleSaveTableDataOnly}
                  disabled={isSavingTableData}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black transition-all cursor-pointer shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingTableData ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" /> जतन होत आहे...
                    </>
                  ) : (
                    <>
                      <Save className="size-4" /> बदलांसह सेव्ह करा (Save & Close)
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* PRINTABLE HTML CONTAINER FOR PDF GENERATION */}
      <div
        id="printable-pdf-container"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "190mm",
          height: "auto",
          zIndex: -9999,
          display: "none",
          visibility: "hidden",
          opacity: 0,
          pointerEvents: "none",
          backgroundColor: "#ffffff",
          padding: 0,
          margin: 0,
        }}
      >
        <style>{`
          #printable-pdf-container table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }
          #printable-pdf-container tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            break-inside: avoid-page !important;
          }
          #printable-pdf-container td, #printable-pdf-container th {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            break-inside: avoid-page !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
          }
        `}</style>
        <div
          ref={printableTableRef}
          className="bg-white text-slate-950 font-sans shadow-none"
          style={{ width: "190mm", boxSizing: "border-box", padding: "0px", margin: "0px" }}
        >
          <div className="text-center border-b-2 border-slate-900 pb-3 mb-4 space-y-1.5" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
            <h2 className="text-xl font-black tracking-tight text-slate-950 uppercase">
              इयत्ता : {selectedClass === "1st" ? "1ली" : selectedClass === "2nd" ? "2री" : selectedClass === "3rd" ? "3री" : selectedClass === "4th" ? "4थी" : selectedClass === "5th" ? "5वी" : selectedClass === "6th" ? "6वी" : selectedClass === "7th" ? "7वी" : selectedClass === "8th" ? "8वी" : selectedClass} {selectedPlanningType === "annual" ? "संपूर्ण वार्षिक नियोजन (सर्व विषय एकत्र)" : "वार्षिक नियोजन"} सन :- 2026-27
            </h2>
            <div className="flex justify-between items-center text-xs font-bold text-slate-800 pt-1.5 border-t border-slate-300">
              <span>विषय : {selectedPlanningType === "annual" ? "सर्व विषय (All Subjects)" : (selectedSubject || "मराठी")}</span>
              <span>माध्यम : {selectedMedium === "semi" ? "सेमी-इंग्रजी" : "मराठी"}</span>
              <span>सन : 2026-27</span>
            </div>
          </div>

          {/* Printable table: use raw Excel structure / htmlContent when available */}
          {editingFileRecord?.htmlContent || viewModalFile?.htmlContent ? (
            <div
              dangerouslySetInnerHTML={{
                __html: editingFileRecord?.htmlContent || viewModalFile?.htmlContent || "",
              }}
            />
          ) : rawEditorHeaders.length > 0 && !rawEditorHeaders.some((h) => isPdfNoiseLine(h)) && rawEditorRows.some((r) => !isPdfNoiseLine(r)) ? (
            <table className="w-full border-collapse border border-slate-800 text-xs table-fixed">
              <thead>
                <tr className="bg-slate-200 text-slate-950 font-black border-b-2 border-slate-900" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                  {rawEditorHeaders.map((h, hi) => {
                    const style = getRawColumnWidthStyle(h, hi, rawEditorHeaders.length);
                    return (
                      <th key={hi} className="border border-slate-800 bg-slate-200 text-slate-950 font-black p-2 text-center text-xs" style={style}>
                        {getCleanHeaderName(h)}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rawEditorRows.filter((r) => !isPdfNoiseLine(r)).map((row, ri) => {
                  const numCols = rawEditorHeaders.length;
                  const rowType = detectRowType(row);

                  if (rowType === "signature") {
                    const leftTxt = row.find((c) => c && (c.includes("शिक्षक") || c.includes("वर्ग"))) || "विषय / वर्ग शिक्षक";
                    const rightTxt = row.find((c) => c && c.includes("मुख्याध्यापक")) || "मुख्याध्यापक";
                    const halfCols = Math.ceil(numCols / 2);
                    const remCols = numCols - halfCols;
                    return (
                      <tr key={ri} className="bg-slate-100 font-black border-t-2 border-b-2 border-slate-800" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                        <td colSpan={halfCols} className="border border-slate-800 p-3 text-left font-black text-xs text-slate-950">
                          {leftTxt}
                        </td>
                        <td colSpan={remCols} className="border border-slate-800 p-3 text-right font-black text-xs text-slate-950">
                          {rightTxt}
                        </td>
                      </tr>
                    );
                  }

                  if (rowType === "title") {
                    const titleTxt = row.find((c) => c && c.trim() !== "") || "अभ्यासक्रमाचे मासिक व घटक नियोजन";
                    return (
                      <tr key={ri} className="bg-slate-200 font-black border-t-2 border-b-2 border-slate-800" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                        <td colSpan={numCols} className="border border-slate-800 p-2.5 text-center font-black text-xs text-slate-950 uppercase tracking-wide">
                          {titleTxt}
                        </td>
                      </tr>
                    );
                  }

                  if (rowType === "meta") {
                    const nonEmpties = row.filter((c) => c && c.trim() !== "");
                    const leftTxt = nonEmpties[0] || "";
                    const rightTxt = nonEmpties[1] || "";
                    const halfCols = Math.ceil(numCols / 2);
                    const remCols = numCols - halfCols;
                    return (
                      <tr key={ri} className="bg-slate-50 font-bold border-b border-slate-800" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                        <td colSpan={halfCols} className="border border-slate-800 p-2 text-left font-bold text-xs text-slate-950">
                          {leftTxt}
                        </td>
                        <td colSpan={remCols} className="border border-slate-800 p-2 text-right font-bold text-xs text-slate-950">
                          {rightTxt}
                        </td>
                      </tr>
                    );
                  }

                  if (rowType === "header_repeat") {
                    return (
                      <tr key={ri} className="bg-slate-200 font-black border-b-2 border-slate-800" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                        {rawEditorHeaders.map((h, ci) => {
                          const style = getRawColumnWidthStyle(h, ci, numCols);
                          return (
                            <th key={ci} className="border border-slate-800 p-2 text-center text-xs font-black text-slate-950 bg-slate-200" style={style}>
                              {getCleanHeaderName(h)}
                            </th>
                          );
                        })}
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={ri}
                      className="border-b border-slate-800"
                      style={{ pageBreakInside: "avoid", breakInside: "avoid" }}
                    >
                      {rawEditorHeaders.map((h, ci) => {
                        const style = getRawColumnWidthStyle(h, ci, numCols);
                        return (
                          <td
                            key={ci}
                            className="border border-slate-800 p-1.5 whitespace-pre-line break-words align-top text-slate-950 text-xs font-normal"
                            style={style}
                          >
                            {cleanCellContent(row[ci] ?? "")}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full border-collapse border border-slate-800 text-xs table-fixed">
              <thead>
                <tr className="bg-slate-200 text-slate-950 font-black border-b-2 border-slate-900 text-center" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                  <th className="border border-slate-800 p-1.5 text-center" style={{ width: selectedPlanningType === "annual" ? "7%" : "8%" }}>महिना</th>
                  {(selectedPlanningType === "annual" || selectedSubject === "सर्व विषय" || selectedSubject === "all") && (
                    <th className="border border-slate-800 p-1.5 text-center" style={{ width: "10%" }}>विषय</th>
                  )}
                  <th className="border border-slate-800 p-1.5 text-center" style={{ width: selectedPlanningType === "annual" ? "5%" : "6%" }}>आठवडा</th>
                  <th className="border border-slate-800 p-1.5 text-center" style={{ width: selectedPlanningType === "annual" ? "6%" : "7%" }}>कामाचे दिवस</th>
                  <th className="border border-slate-800 p-1.5 text-center" style={{ width: selectedPlanningType === "annual" ? "6%" : "7%" }}>प्राप्त तासिका</th>
                  <th className="border border-slate-800 p-1.5 text-left" style={{ width: selectedPlanningType === "annual" ? "42%" : "46%" }}>विषय / घटक विवरण</th>
                  <th className="border border-slate-800 p-1.5 text-left" style={{ width: selectedPlanningType === "annual" ? "24%" : "26%" }}>अध्ययन निष्पत्ती</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-800" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                    <td className="border border-slate-800 p-1.5 text-center font-bold break-words">{r.month}</td>
                    {(selectedPlanningType === "annual" || selectedSubject === "सर्व विषय" || selectedSubject === "all") && (
                      <td className="border border-slate-800 p-1.5 text-center font-black text-slate-950 bg-slate-50 break-words">{r.subject || "सर्व विषय"}</td>
                    )}
                    <td className="border border-slate-800 p-1.5 text-center break-words">{r.weeks}</td>
                    <td className="border border-slate-800 p-1.5 text-center break-words">{r.workingDays}</td>
                    <td className="border border-slate-800 p-1.5 text-center break-words">{r.periods}</td>
                    <td className="border border-slate-800 p-1.5 whitespace-pre-line break-words font-medium text-left">{r.topics}</td>
                    <td className="border border-slate-800 p-1.5 whitespace-pre-line break-words text-left">{cleanCellContent(r.outcomes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex justify-between items-center pt-6 mt-4 text-xs font-bold text-slate-900 border-t border-slate-300" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
            <div>शिक्षक स्वाक्षरी: ___________________</div>
            <div>मुख्याध्यापक स्वाक्षरी: ___________________</div>
          </div>
        </div>
      </div>

      {/* 🏫 ONE-TIME SCHOOL & TEACHER INFORMATION FORM MODAL */}
      {showSchoolForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-100 animate-in fade-in zoom-in duration-200 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <School className="size-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-950">शाळा व शिक्षक माहिती (School Details)</h3>
                  <p className="text-xs font-semibold text-slate-500">
                    ही माहिती १ वेळा नोंदवा, प्लॅनिंग डाक्यूमेंटच्या पहिल्या पानावर व PDF वर आपोआप दिसेल.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSchoolForm(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-black text-slate-800">
                  शाळेचे नाव (School Name): <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={schoolFormData.schoolName}
                  onChange={(e) => setSchoolFormData({ ...schoolFormData, schoolName: e.target.value })}
                  placeholder="उदा. जि. प. प्राथ. शाळा, नवी मुंबई"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">केंद्र (Kendra / Center):</label>
                <input
                  type="text"
                  value={schoolFormData.kendraName}
                  onChange={(e) => setSchoolFormData({ ...schoolFormData, kendraName: e.target.value })}
                  placeholder="उदा. वाशी"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">तालुका (Taluka):</label>
                <input
                  type="text"
                  value={schoolFormData.talukaName}
                  onChange={(e) => setSchoolFormData({ ...schoolFormData, talukaName: e.target.value })}
                  placeholder="उदा. ठाणे"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">UDISE नंबर (UDISE Number):</label>
                <input
                  type="text"
                  value={schoolFormData.udiseNumber}
                  onChange={(e) => setSchoolFormData({ ...schoolFormData, udiseNumber: e.target.value })}
                  placeholder="उदा. 27240100101"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">वर्ग शिक्षकाचे नाव (Class Teacher):</label>
                <input
                  type="text"
                  value={schoolFormData.teacherName}
                  onChange={(e) => setSchoolFormData({ ...schoolFormData, teacherName: e.target.value })}
                  placeholder="उदा. श्री. अमितेश शिंदे"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-black text-slate-800">मुख्याध्यापकाचे नाव (Headmaster Name):</label>
                <input
                  type="text"
                  value={schoolFormData.headMasterName}
                  onChange={(e) => setSchoolFormData({ ...schoolFormData, headMasterName: e.target.value })}
                  placeholder="उदा. श्रीमती कविता पाटील"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSchoolForm(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                रद्द करा (Cancel)
              </button>
              <button
                type="button"
                disabled={isSavingSchoolProfile}
                onClick={handleSaveSchoolProfile}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                {isSavingSchoolProfile ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" /> जतन होत आहे...
                  </>
                ) : (
                  <>
                    <Save className="size-4" /> SUBMIT & SAVE (जतन करा)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
