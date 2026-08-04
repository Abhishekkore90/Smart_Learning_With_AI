import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc, onSnapshot, collection } from "firebase/firestore";
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from "firebase/storage";
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
  FileUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getDefaultSubjectsForClass } from "@/data/cceSubjects";
import { saveFileToIndexedDB, getFileFromIndexedDB } from "@/lib/indexedDbStorage";
import { uploadBlobToBunny, saveJsonToBunny, fetchJsonFromBunny } from "@/lib/bunnyStorage";
import { extractTableRowsFromPdf } from "@/lib/pdfParser";
import * as XLSX from "xlsx";
import { parseExcelFile, parseDocxFile, parsePdfFile, ParsedTableCell } from "@/lib/tableParser";
import { PlanningTableViewer } from "@/components/teacher/PlanningTableViewer";
import { MonthlyPlanningViewer } from "@/components/teacher/MonthlyPlanningViewer";
import { getTeacherId } from "@/lib/teacherIsolationHelper";
import { QuestionBankSchema, parseQuestionBankFile } from "@/lib/questionBankParser";
import { QuestionBankViewer } from "@/components/teacher/QuestionBankViewer";

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

const detectRowType = (row: string[]): RowType => {
  if (!row || !Array.isArray(row)) return "data";
  const joined = row.join(" ").toLowerCase().trim();
  const nonEmpties = row.map((c) => (c || "").trim()).filter((c) => c !== "");

  if (nonEmpties.length === 0) return "data";

  // 1. Month-End Signature row (Image 1)
  if (joined.includes("वर्ग शिक्षक") || joined.includes("मुख्याध्यापक") || joined.includes("स्वाक्षरी") || joined.includes("signature")) {
    return "signature";
  }

  // 2. Month-Start Title banner (Image 2 Top)
  if (joined.includes("मासिक व घटक नियोजन") || joined.includes("अभ्यासक्रमाचे मासिक") || (nonEmpties.length === 1 && joined.includes("माहे"))) {
    return "title";
  }

  // 3. Meta info row (Image 2 Middle: इयत्ता / विषय / तासिका / कामाचे दिवस)
  if (joined.includes("इयत्ता") || joined.includes("नियोजित तासिका") || (joined.includes("विषय") && joined.includes("दिवस"))) {
    return "meta";
  }

  // 4. Repeated column headers row (Image 2 Bottom)
  if (joined.includes("दिनांक") && (joined.includes("घटक") || joined.includes("निष्पत्ती") || joined.includes("उद्दिष्ट"))) {
    return "header_repeat";
  }

  // 5. Fallback for single merged banner
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
    if (h.includes("महिना") || h.includes("month") || index === 0) return { width: "6%", minWidth: "50px" };
    if (h.includes("आठवडा") || h.includes("week") || index === 1) return { width: "5%", minWidth: "40px" };
    if (h.includes("कामाचे") || h.includes("दिवस") || index === 2) return { width: "6%", minWidth: "55px" };
    if (h.includes("तासिका") || index === 3) return { width: "6%", minWidth: "55px" };
    if (h.includes("निष्पत्ती") || h.includes("outcome") || index === 5) return { width: "27%", minWidth: "200px" };
    if (h.includes("विषय") || h.includes("घटक") || index === 4) return { width: "50%", minWidth: "320px" };
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
    // Read all rows as raw 2D array (empty string for blank cells)
    const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: "" });
    if (!rawData || rawData.length === 0) return empty;

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

    // ── Step 3: Gather data rows, normalize to numCols length ─────────────────
    const startIdx = headerRowIdx + 1;
    const dataRows: string[][] = [];
    for (let i = startIdx; i < rawData.length; i++) {
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

    // ── Step 4: Forward-fill merged cells row by row (Preserve all rows 1:1) ─
    // Carry forward merged cell values (e.g. topic name merged across multiple sub-points),
    // but reset whenever a new month section title row appears so months stay 100% distinct.
    const lastVal: string[] = new Array(numCols).fill("");
    const rawDataRows: string[][] = dataRows.map((row) => {
      const nonEmpties = row.filter((c) => c !== "");
      const isTitleRow = nonEmpties.length === 1 && (nonEmpties[0].toLowerCase().includes("नियोजन") || nonEmpties[0].toLowerCase().includes("माहे"));
      
      if (isTitleRow) {
        lastVal.fill("");
        return row;
      }

      return row.map((cell, ci) => {
        if (cell !== "") {
          lastVal[ci] = cell;
          return cell;
        }
        return nonEmpties.length > 1 ? lastVal[ci] : "";
      });
    });

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

    // ── Step 8: Build schema-mapped PlanningTableRow[] as fallback ────────────
    const get = (row: string[], idx: number) => (idx !== -1 && row[idx] ? row[idx] : "");
    const mappedRows: PlanningTableRow[] = rawDataRows.map((row, i) => ({
      id: `excel_${Date.now()}_${i}`,
      month: get(row, colMap.month) || row[0] || `महिना ${i + 1}`,
      subject: get(row, colMap.subject) || "मराठी",
      weeks: get(row, colMap.weeks) || "4",
      workingDays: get(row, colMap.workingDays) || "20",
      periods: get(row, colMap.periods) || "50",
      topics: get(row, colMap.topics) || "घटक माहिती",
      outcomes: get(row, colMap.outcomes) || "अध्ययन निष्पत्ती",
    }));

    return { mappedRows, rawHeaders, rawDataRows };
  } catch (err) {
    console.error("Excel extraction error:", err);
    return empty;
  }
};


export interface PlanningFileRecord {
  id: string;
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
  updatedAt?: string;
  tableRows?: PlanningTableRow[];
  // Raw Excel structure (exact headers + rows as uploaded)
  rawHeaders?: string[];
  rawDataRows?: string[][];
  // Multi-format parsed tables (HTML / Grid for merged cells & DOCX)
  parsedHtml?: string;
  parsedGrid?: ParsedTableCell[][];
  // Bunny Storage persistence URLs
  bunnyFileUrl?: string;
  bunnyParsedJsonUrl?: string;
  questionBankSchema?: QuestionBankSchema;
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

export function AcademicPlanningSystem({
  mode = "teacher",
  initialClass,
  onBack,
}: AcademicPlanningSystemProps) {
  // Wizard Steps: 1: Medium -> 2: Class -> 3: Planning Type -> 4: Subject & Files
  const [step, setStep] = useState<"medium" | "class" | "type" | "subject">("medium");
  const [selectedPlanningType, setSelectedPlanningType] = useState<"annual" | "monthly" | "question_bank">("annual");

  const [selectedClass, setSelectedClass] = useState<string>(initialClass || "5th");
  const [selectedMedium, setSelectedMedium] = useState<string>("marathi");
  const [selectedSubject, setSelectedSubject] = useState<string>("");

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

  // Question Bank Viewer Modal State
  const [isQbViewerOpen, setIsQbViewerOpen] = useState<boolean>(false);
  const [questionBankViewerData, setQuestionBankViewerData] = useState<QuestionBankSchema | null>(null);

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
    if (!rec) {
      toast.error("⚠️ अद्याप या विषयाचे नियोजन किंवा फाईल प्रशासकाद्वारे (Admin) अपलोड केलेली नाही.");
      return;
    }
    setEditingFileRecord(rec);
    if (rec.rawHeaders && rec.rawHeaders.length > 0) {
      setRawEditorHeaders(rec.rawHeaders);
      setRawEditorRows(rec.rawDataRows ? rec.rawDataRows.map((r) => [...r]) : []);
      setTableRows([]);  // clear schema rows when using raw mode
    } else if (rec.tableRows && rec.tableRows.length > 0) {
      setRawEditorHeaders([]);
      setRawEditorRows([]);
      setTableRows(rec.tableRows);
    } else {
      toast.error("⚠️ या फाईलमधील तक्ता/माहिती उपलब्ध नाही.");
      return;
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
      async (snapshot) => {
        const filesMap: Record<string, PlanningFileRecord> = {};
        snapshot.docs.forEach((docSnap) => {
          filesMap[docSnap.id] = docSnap.data() as PlanningFileRecord;
        });

        // Also check localStorage fallback cache (Only fill missing keys, do NOT overwrite Firestore)
        try {
          const cached = localStorage.getItem("cce_academic_plannings_cache");
          if (cached) {
            const parsed = JSON.parse(cached);
            Object.keys(parsed).forEach((k) => {
              if (!filesMap[k]) {
                filesMap[k] = parsed[k];
              }
            });
          }
        } catch (e) { }

        // Restore IndexedDB blobs if fileUrl is dead/missing or local blob exists
        for (const recordKey of Object.keys(filesMap)) {
          const rec = filesMap[recordKey];
          if (!rec.fileUrl || rec.fileUrl.startsWith("blob:")) {
            try {
              const localBlob = await getFileFromIndexedDB(recordKey);
              if (localBlob) {
                rec.fileUrl = URL.createObjectURL(localBlob);
              }
            } catch (e) { }
          }
        }

        setPlanningFiles(filesMap);
        setLoadingFiles(false);
      },
      (err) => {
        console.warn("Planning files realtime listener notice:", err);
        // Fallback to localStorage
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
  }, []);

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

  // Helper to construct record ID
  const getFileRecordKey = (
    pType: "annual" | "monthly" | "question_bank" = selectedPlanningType,
    subjName?: string
  ) => {
    const s = subjName || selectedSubject;
    return `${selectedClass}_${selectedMedium}_${s}_${pType}`;
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

  // Submit / Save File Upload (PDF Compression + High-Speed Direct Upload)
  const handleSaveFileUpload = async () => {
    if (!selectedFile) {
      toast.error("कृपया अपलोड करण्यासाठी फाईल निवडा.");
      return;
    }

    setUploading(true);
    setUploadProgress(15);
    setCompressing(true);

    try {
      const recordKey = getFileRecordKey(uploadingType);
      const ext = selectedFile.name.split(".").pop()?.toLowerCase() || "pdf";
      const cleanStoragePath = `academic_plannings/${recordKey}_${Date.now()}.${ext}`;

      const originalSizeMb = (selectedFile.size / (1024 * 1024)).toFixed(2);

      let finalFileBlob: Blob = selectedFile;
      if (ext === "pdf" || selectedFile.type === "application/pdf") {
        toast.info("⚡ PDF फाईल कॉम्प्रेस होत आहे...");
        finalFileBlob = await compressPdfFile(selectedFile);
      } else {
        toast.info("⚡ फाईल जोडली जात आहे...");
      }
      setCompressing(false);
      setUploadProgress(45);

      const compressedSizeMb = (finalFileBlob.size / (1024 * 1024)).toFixed(2);

      // 1. Save binary Blob persistently to IndexedDB for 100% cross-refresh availability
      await saveFileToIndexedDB(recordKey, finalFileBlob);

      // Create instant local Blob URL (0ms)
      const blobUrl = URL.createObjectURL(finalFileBlob);
      let fileUrl = blobUrl;
      let bunnyFileUrl = "";

      // ── Automated Question Bank Storage & Document Parser Pipeline ─────────
      if (uploadingType === "question_bank") {
        toast.info("🧠 प्रश्नपेढी डेटा पार्स व स्ट्रक्चर होत आहे...");
        setUploadProgress(60);

        let bunnyCdnUrl = blobUrl;
        let bunnyParsedJsonUrl = "";

        try {
          const bunnyPath = `question-banks/${recordKey}_${Date.now()}.${ext}`;
          const uploadedUrl = await uploadBlobToBunny(bunnyPath, finalFileBlob);
          if (uploadedUrl) bunnyCdnUrl = uploadedUrl;
        } catch (bErr) {
          console.warn("Bunny CDN upload notice for question bank:", bErr);
        }

        setUploadProgress(75);

        let parsedSchema: QuestionBankSchema;
        try {
          parsedSchema = await parseQuestionBankFile(
            selectedFile,
            bunnyCdnUrl,
            selectedClass,
            selectedSubject
          );
        } catch (pErr) {
          console.warn("Question bank file parse notice, generating fallback schema:", pErr);
          parsedSchema = {
            file_details: {
              bunny_cdn_url: bunnyCdnUrl,
              uploaded_at: new Date().toISOString(),
            },
            header_metadata: {
              academic_year: "२०२३-२४",
              form_number: "प्रपत्र क्रमांक - 08  प्रश्नपेढी",
              standard_class: `इयत्ता - ${selectedClass}`,
              subject: `विषय - ${selectedSubject}`,
            },
            table_headers: [
              "प्रश्न क्रमांक",
              "क्षेत्र घटक",
              "प्रश्न",
              "गुण",
              "मूल्यमापन(लेखी/तोंडी/प्रात्यक्षिक)",
              "प्रश्नाचा प्रकार (वस्तुनिष्ठ/लघुत्तरी/दीर्घोत्तरी)",
              "उद्दिष्ट (ज्ञान/आकलन/कौशल्य/उपयोजन/विश्लेषण/संश्लेषण/मूल्यमापन)",
              "वैशिष्टय (पायाभूत घटक/जीवन कौशल्य/मूल्य)",
              "अध्ययन निष्पत्ती क्रमांक",
            ],
            question_bank_groups: [
              {
                group_id: 1,
                question_number: "1",
                unit_chapter: "Roman Numberals / माय मराठी",
                main_instruction: "*Circle the correct option",
                numbering_type: "NUMERIC",
                skill_feature: "वैज्ञानिक दृष्टीकोन, सर्जनशील विचार, चिकित्सक विचार",
                sub_questions: [
                  {
                    sub_question_index: "1)",
                    question_text: `19 =    a) XX       b) XI       c) XIX     d) IXX  (${selectedFile.name})`,
                    marks: 1,
                    evaluation_type: "लेखी",
                    question_type: "वस्तुनिष्ठ",
                    objective: "उपयोजन",
                    skill_feature: "",
                    learning_outcome_code: "05.71.01",
                  },
                ],
                layout_spacing: {
                  is_blank_spacer: true,
                  padding_bottom: "24px",
                },
              },
            ],
            flat_rows: [
              {
                row_index: 1,
                question_number: "1",
                unit_chapter: "Roman Numberals",
                question_text: "*Circle the correct oppection( योग्य पर्यायास गोल करा.)",
                marks: "",
                evaluation_type: "",
                question_type: "",
                objective: "",
                skill_feature: "वैज्ञानिक दृष्टीकोन, सर्जनशील विचार, चिकित्सक विचार",
                learning_outcome_code: "",
                is_parent_instruction: true,
              },
              {
                row_index: 2,
                question_number: "1",
                unit_chapter: "Roman Numberals",
                question_text: `19 =    a) XX       b) XI       c) XIX     d) IXX  (${selectedFile.name})`,
                marks: "1",
                evaluation_type: "लेखी",
                question_type: "वस्तुनिष्ठ",
                objective: "उपयोजन",
                skill_feature: "वैज्ञानिक दृष्टीकोन, सर्जनशील विचार, चिकित्सक विचार",
                learning_outcome_code: "05.71.01",
              },
            ],
          };
        }

        setUploadProgress(90);

        try {
          bunnyParsedJsonUrl = await saveJsonToBunny(
            `question-banks/parsed_${recordKey}.json`,
            parsedSchema
          );
        } catch (jErr) {
          console.warn("Bunny JSON save notice:", jErr);
        }

        const newRecord: PlanningFileRecord = {
          id: recordKey,
          planningType: "question_bank",
          classId: selectedClass,
          mediumId: selectedMedium,
          subjectId: selectedSubject,
          fileName: selectedFile.name,
          fileSize: `${compressedSizeMb} MB`,
          fileType: selectedFile.type || "application/octet-stream",
          uploadedBy: mode === "admin" ? "admin" : "teacher",
          uploadedAt: new Date().toISOString(),
          fileUrl: bunnyCdnUrl,
          bunnyFileUrl: bunnyCdnUrl,
          bunnyParsedJsonUrl: bunnyParsedJsonUrl,
          questionBankSchema: parsedSchema,
        };

        await setDoc(doc(db, "academic_plannings", recordKey), newRecord, { merge: true });
        setPlanningFiles((prev) => ({ ...prev, [recordKey]: newRecord }));
        setUploadProgress(100);
        setUploading(false);
        setUploadModalOpen(false);
        setSelectedFile(null);
        toast.success("🎉 प्रश्नपेढी फाईल यशस्वीरित्या पार्स आणि जतन झाली!");
        return;
      }

      // 2. Direct upload to Bunny Storage Zone (CDN) with Firebase Storage fallback
      try {
        setUploadProgress(60);
        const bunnyPath = `academic_plannings/${recordKey}_${Date.now()}.${ext}`;
        bunnyFileUrl = await uploadBlobToBunny(bunnyPath, finalFileBlob);
        if (bunnyFileUrl) {
          fileUrl = bunnyFileUrl;
        }
      } catch (bunnyErr) {
        console.warn("Bunny Storage upload notice, falling back to Firebase / Local Blob:", bunnyErr);
        if (storage) {
          try {
            const storageRef = ref(storage, cleanStoragePath);
            setUploadProgress(75);
            const storageUploadPromise = (async () => {
              const uploadSnapshot = await uploadBytes(storageRef, finalFileBlob);
              return await getDownloadURL(uploadSnapshot.ref);
            })();

            const timeoutPromise = new Promise<string>((_, reject) =>
              setTimeout(() => reject(new Error("Firebase storage response timeout")), 2500)
            );

            fileUrl = await Promise.race([storageUploadPromise, timeoutPromise]);
          } catch (fbErr) {
            console.warn("Firebase Storage upload notice, using local blob:", fbErr);
          }
        }
      }

      setUploadProgress(85);

      // 3. Extract structured table rows & clean HTML from uploaded file (Excel, Word, PDF)
      toast.info("🔍 फाईलमधून तक्ता व माहिती ऑटो-एक्सट्रॅक्ट होत आहे...");
      let extractedRows: PlanningTableRow[] = [];
      let excelRawHeaders: string[] = [];
      let excelRawDataRows: string[][] = [];
      let parsedHtml = "";
      let parsedGrid: ParsedTableCell[][] = [];

      try {
        if (ext === "xls" || ext === "xlsx" || ext === "csv") {
          const res = await parseExcelFile(selectedFile);
          extractedRows = res.mappedRows;
          excelRawHeaders = res.rawHeaders;
          parsedHtml = res.htmlContent;
          parsedGrid = res.gridData;

          // Legacy raw structure fallback
          const legacyResult = await extractExcelData(selectedFile);
          excelRawDataRows = legacyResult.rawDataRows;
        } else if (ext === "docx" || ext === "doc") {
          const res = await parseDocxFile(selectedFile);
          parsedHtml = res.htmlContent;
        } else {
          const res = await parsePdfFile(selectedFile);
          extractedRows = res.mappedRows;
        }
      } catch (exErr) {
        console.warn("File extraction notice:", exErr);
      }

      // 4. Save heavy parsed JSON to Bunny Storage to keep Firestore < 50KB
      let bunnyParsedJsonUrl = "";
      if (parsedHtml || (parsedGrid && parsedGrid.length > 0) || (excelRawDataRows && excelRawDataRows.length > 0)) {
        try {
          bunnyParsedJsonUrl = await saveJsonToBunny(`academic_plannings_parsed/${recordKey}.json`, {
            parsedHtml,
            parsedGrid,
            rawHeaders: excelRawHeaders,
            rawDataRows: excelRawDataRows,
          });
        } catch (bunnyJsonErr) {
          console.warn("Bunny JSON save notice:", bunnyJsonErr);
        }
      }

      const rowsToSave =
        extractedRows.length > 0
          ? extractedRows
          : uploadingType === "annual"
            ? DEFAULT_ALL_SUBJECTS_ANNUAL_ROWS
            : DEFAULT_ANNUAL_ROWS;

      setUploadProgress(100);

      const fileSizeDisplay = `${compressedSizeMb} MB`;

      // Memory record (full data in React state)
      const newRecord: PlanningFileRecord = {
        id: recordKey,
        classId: selectedClass,
        mediumId: selectedMedium,
        subjectId: selectedSubject,
        planningType: uploadingType,
        fileName: selectedFile.name,
        fileUrl: fileUrl,
        fileSize: fileSizeDisplay,
        fileType: selectedFile.type || "application/pdf",
        uploadedBy: mode,
        uploadedAt: new Date().toISOString(),
        tableRows: rowsToSave,
        ...(excelRawHeaders.length > 0 && { rawHeaders: excelRawHeaders }),
        ...(excelRawDataRows.length > 0 && { rawDataRows: excelRawDataRows }),
        ...(parsedHtml && { parsedHtml }),
        ...(parsedGrid.length > 0 && { parsedGrid }),
        ...(bunnyFileUrl && { bunnyFileUrl }),
        ...(bunnyParsedJsonUrl && { bunnyParsedJsonUrl }),
      };

      // Lightweight Firestore Record (strictly under ~30 KB document limit)
      const firestoreRecord: PlanningFileRecord = {
        id: recordKey,
        classId: selectedClass,
        mediumId: selectedMedium,
        subjectId: selectedSubject,
        planningType: uploadingType,
        fileName: selectedFile.name,
        fileUrl: fileUrl,
        fileSize: fileSizeDisplay,
        fileType: selectedFile.type || "application/pdf",
        uploadedBy: mode,
        uploadedAt: new Date().toISOString(),
        tableRows: rowsToSave,
        ...(excelRawHeaders.length > 0 && { rawHeaders: excelRawHeaders }),
        ...(bunnyFileUrl && { bunnyFileUrl }),
        ...(bunnyParsedJsonUrl && { bunnyParsedJsonUrl }),
        // Include inline html/grid ONLY if very small (<5KB)
        ...((parsedHtml && parsedHtml.length < 5000) && { parsedHtml }),
        ...((parsedGrid && parsedGrid.length < 30) && { parsedGrid }),
      };

      // 5. Save lightweight metadata to Firestore
      try {
        await setDoc(doc(db, "academic_plannings", recordKey), firestoreRecord, { merge: true });
      } catch (fsErr) {
        console.warn("Firestore setDoc notice:", fsErr);
      }

      // 6. Update Local State and Cache
      setPlanningFiles((prev) => {
        const updated = { ...prev, [recordKey]: newRecord };
        try {
          // Store lightweight version in localStorage to prevent QuotaExceededError
          const cacheCopy = { ...updated };
          cacheCopy[recordKey] = firestoreRecord;
          localStorage.setItem("cce_academic_plannings_cache", JSON.stringify(cacheCopy));
        } catch (e) { }
        return updated;
      });

      if (extractedRows.length > 0) {
        toast.success(
          `🎉 Excel/फाईलमधून ${extractedRows.length} तक्ता नोंदी (Rows) यशस्वीरित्या एक्सट्रॅक्ट करून सेव्ह झाल्या!`
        );
      } else {
        toast.success(
          `🎉 फाईल यशस्वीरित्या जतन झाली! (${originalSizeMb}MB -> ${compressedSizeMb}MB कॉम्प्रेस झाली)`
        );
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
    let targetUrl = rec.fileUrl;

    const blobFromDb = await getFileFromIndexedDB(rec.id);
    if (blobFromDb) {
      targetUrl = URL.createObjectURL(blobFromDb);
    }

    if (!targetUrl) {
      toast.error("अद्याप फाईल उपलब्ध नाही, कृपया फाईल निवडून पुन्हा अपलोड करा.");
      return;
    }

    // ── Question Bank Special Viewer Pipeline ─────────────────────────────────
    if (rec.planningType === "question_bank") {
      toast.info("🧠 प्रश्नपेढी डेटा लोड होत आहे...", { duration: 1500 });
      let schema = rec.questionBankSchema;
      if (!schema && rec.bunnyParsedJsonUrl) {
        const remoteData = await fetchJsonFromBunny<QuestionBankSchema>(`question-banks/parsed_${rec.id}.json`);
        if (remoteData) {
          schema = remoteData;
        }
      }

      if (!schema && blobFromDb) {
        const fileObj = new File([blobFromDb], rec.fileName || "file.xlsx");
        schema = await parseQuestionBankFile(fileObj, targetUrl || "#", rec.classId, rec.subjectId);
      }

      if (schema) {
        setQuestionBankViewerData(schema);
        setIsQbViewerOpen(true);
        return;
      }
    }

    // ── Prepare initial enriched record with active targetUrl ───────────────────
    let enrichedRec = { ...rec, fileUrl: targetUrl };

    // ── Auto-fetch parsed JSON from Bunny Storage if parsedHtml is missing ─────
    if (!enrichedRec.parsedHtml && rec.bunnyParsedJsonUrl) {
      try {
        const remoteParsed = await fetchJsonFromBunny(`academic_plannings_parsed/${rec.id}.json`);
        if (remoteParsed) {
          enrichedRec = {
            ...enrichedRec,
            ...(remoteParsed.parsedHtml && { parsedHtml: remoteParsed.parsedHtml }),
            ...(remoteParsed.parsedGrid && { parsedGrid: remoteParsed.parsedGrid }),
            ...(remoteParsed.rawHeaders && { rawHeaders: remoteParsed.rawHeaders }),
            ...(remoteParsed.rawDataRows && { rawDataRows: remoteParsed.rawDataRows }),
          };
          setPlanningFiles((prev) => ({ ...prev, [rec.id]: enrichedRec }));
        }
      } catch (bunnyFetchErr) {
        console.warn("Fetch parsed JSON from Bunny notice:", bunnyFetchErr);
      }
    }

    // ── Auto-parse Excel/Word structure if parsedHtml is missing ─────────────────
    const isExcel =
      rec.fileName?.match(/\.(xlsx?|csv)$/i) ||
      rec.fileType?.includes("spreadsheet") ||
      rec.fileType?.includes("excel") ||
      rec.fileType?.includes("csv");
    const isDocx =
      rec.fileName?.match(/\.docx?$/i) ||
      rec.fileType?.includes("wordprocessingml") ||
      rec.fileType?.includes("msword");

    if (blobFromDb && !rec.parsedHtml) {
      try {
        if (isExcel) {
          toast.info("📊 Excel रचना वाचत आहे...", { duration: 2000 });
          const excelFile = new File([blobFromDb], rec.fileName || "file.xlsx", {
            type: blobFromDb.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });
          const res = await parseExcelFile(excelFile);
          if (res.htmlContent || res.gridData.length > 0) {
            enrichedRec = {
              ...enrichedRec,
              rawHeaders: res.rawHeaders,
              parsedHtml: res.htmlContent,
              parsedGrid: res.gridData,
            };
            const updatedRecord: PlanningFileRecord = {
              ...rec,
              rawHeaders: res.rawHeaders,
              parsedHtml: res.htmlContent,
              parsedGrid: res.gridData,
              ...(res.mappedRows.length > 0 && (!rec.tableRows || rec.tableRows.length === 0) && { tableRows: res.mappedRows }),
            };
            setDoc(doc(db, "academic_plannings", rec.id), updatedRecord, { merge: true }).catch(() => { });
            setPlanningFiles((prev) => ({ ...prev, [rec.id]: updatedRecord }));
          }
        } else if (isDocx) {
          toast.info("📄 Word दस्तावेज वाचत आहे...", { duration: 2000 });
          const docxFile = new File([blobFromDb], rec.fileName || "file.docx", {
            type: blobFromDb.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          });
          const res = await parseDocxFile(docxFile);
          if (res.htmlContent) {
            enrichedRec = { ...enrichedRec, parsedHtml: res.htmlContent };
            const updatedRecord: PlanningFileRecord = { ...rec, parsedHtml: res.htmlContent };
            setDoc(doc(db, "academic_plannings", rec.id), updatedRecord, { merge: true }).catch(() => { });
            setPlanningFiles((prev) => ({ ...prev, [rec.id]: updatedRecord }));
          }
        }
      } catch (parseErr) {
        console.warn("File re-parse notice:", parseErr);
      }
    }
    // ── Check for user-specific custom edits (Isolated for non-admin users) ─────
    const currentTeacherId = getTeacherId();
    const userDocId = `${currentTeacherId}_${rec.id}`;

    let userCustomEdits: Partial<PlanningFileRecord> | null = null;

    try {
      const cached = localStorage.getItem(`cce_user_planning_${userDocId}`);
      if (cached) {
        userCustomEdits = JSON.parse(cached);
      }
    } catch (e) {}

    if (!userCustomEdits && mode !== "admin") {
      try {
        const userDocSnap = await getDoc(doc(db, "user_academic_plannings", userDocId));
        if (userDocSnap.exists()) {
          userCustomEdits = userDocSnap.data() as Partial<PlanningFileRecord>;
          try {
            localStorage.setItem(`cce_user_planning_${userDocId}`, JSON.stringify(userCustomEdits));
          } catch (e) {}
        }
      } catch (e) {}
    }

    if (userCustomEdits && mode !== "admin") {
      const masterUpdatedAt = new Date(rec.updatedAt || rec.uploadedAt || 0).getTime();
      const userUpdatedAt = new Date(userCustomEdits.updatedAt || 0).getTime();

      // If Admin updated the master record AFTER user's custom edit, prioritize Admin's new master update!
      if (masterUpdatedAt > userUpdatedAt) {
        try {
          localStorage.removeItem(`cce_user_planning_${userDocId}`);
        } catch (e) {}
      } else {
        enrichedRec = {
          ...enrichedRec,
          ...(userCustomEdits.parsedGrid && userCustomEdits.parsedGrid.length > 0 && { parsedGrid: userCustomEdits.parsedGrid }),
          ...(userCustomEdits.parsedHtml && { parsedHtml: userCustomEdits.parsedHtml }),
          ...(userCustomEdits.tableRows && userCustomEdits.tableRows.length > 0 && { tableRows: userCustomEdits.tableRows }),
        };
      }
    }

    setViewModalFile(enrichedRec);
  };

  // Helper to delete an uploaded planning file record
  const handleDeletePlanningFile = async (fileRec: PlanningFileRecord) => {
    if (!fileRec) return;
    const confirmDelete = window.confirm(
      `तुम्हाला "${fileRec.fileName || "नियोजन फाईल"}" नक्की काढून टाकायची आहे का?`
    );
    if (!confirmDelete) return;

    try {
      toast.info("फाईल काढली जात आहे...", { duration: 1500 });

      // 1. Delete document from Firestore
      await deleteDoc(doc(db, "academic_plannings", fileRec.id));

      // 2. Remove from local state & cache
      setPlanningFiles((prev) => {
        const updated = { ...prev };
        delete updated[fileRec.id];
        try {
          localStorage.setItem("cce_academic_plannings_cache", JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      // If view modal is open for this file, close it
      if (viewModalFile && viewModalFile.id === fileRec.id) {
        setViewModalFile(null);
      }

      toast.success("🎉 फाईल यशस्वीरित्या काढून टाकली गेली!");
    } catch (err: any) {
      console.error("Delete planning file error:", err);
      toast.error("फाईल काढून टाकणे अयशस्वी: " + (err?.message || "त्रुटी आली"));
    }
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

        {/* Current Selections Summary Badge */}
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
                      className={`p-8 rounded-3xl border text-left transition-all duration-300 cursor-pointer flex flex-col justify-between gap-6 relative overflow-hidden group ${
                        isSelected
                          ? "bg-gradient-to-br from-purple-600 via-indigo-700 to-purple-800 text-white border-purple-400 shadow-2xl shadow-purple-600/40 ring-4 ring-purple-300 scale-102"
                          : "bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-900 text-white border-purple-800/80 hover:border-purple-400 hover:shadow-xl hover:shadow-purple-950/50 hover:scale-101"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div
                          className={`size-14 rounded-2xl flex items-center justify-center font-black text-lg ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-purple-800/50 text-purple-200 group-hover:bg-purple-600 group-hover:text-white transition-colors"
                          }`}
                        >
                          <Languages className="size-7" />
                        </div>
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-purple-900/60 text-purple-200 border border-purple-700/50"
                          }`}
                        >
                          {med.id === "semi" ? "Semi English" : "Marathi"}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xl font-black text-white">{med.labelMr}</h3>
                        <p
                          className={`text-xs font-semibold mt-1 ${
                            isSelected ? "text-purple-100" : "text-purple-200/80"
                          }`}
                        >
                          {med.labelEn}
                        </p>
                      </div>

                      <div
                        className={`flex items-center gap-2 text-xs font-bold ${
                          isSelected ? "text-amber-300" : "text-purple-300 group-hover:text-amber-300"
                        } transition-colors`}
                      >
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
                  निवडलेले माध्यम: <span className="font-bold text-purple-700">{selectedMedium === "semi" ? "सेमी-इंग्रजी माध्यम" : "मराठी माध्यम"}</span>
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
                      className={`p-6 rounded-3xl border text-center transition-all duration-300 cursor-pointer flex flex-col items-center gap-3 relative overflow-hidden group ${
                        isSelected
                          ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white border-purple-400 shadow-xl shadow-purple-500/40 ring-4 ring-purple-300 scale-105"
                          : "bg-purple-900/90 text-white border-purple-800/80 hover:bg-gradient-to-r hover:from-purple-600 hover:to-indigo-600 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/30 hover:scale-102"
                      }`}
                    >
                      <div
                        className={`size-12 rounded-2xl flex items-center justify-center font-black text-base ${
                          isSelected
                            ? "bg-white/25 text-white"
                            : "bg-purple-800/60 text-purple-200 group-hover:bg-white/20 group-hover:text-white transition-colors"
                        }`}
                      >
                        <GraduationCap className="size-6" />
                      </div>
                      <div>
                        <h4 className="font-black text-base text-white">{cls.mr}</h4>
                        <p
                          className={`text-[10px] font-bold ${
                            isSelected ? "text-purple-100" : "text-purple-200/80 group-hover:text-purple-100"
                          }`}
                        >
                          {cls.en}
                        </p>
                      </div>
                    </button>
                  );
                })}
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
                {/* 1. Annual Planning Card (इयत्तानिहाय मास्टर वार्षिक नियोजन फाईल) */}
                {(() => {
                  const annualRecKey = getFileRecordKey("annual", "all");
                  let annualFile: PlanningFileRecord | undefined = planningFiles[annualRecKey];
                  if (annualFile && (annualFile.classId !== selectedClass || annualFile.mediumId !== selectedMedium)) {
                    annualFile = undefined;
                  }
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
                              इयत्ता {selectedClass} मास्टर
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 className="text-2xl font-black">Annual Planning</h3>
                          <p className="text-xs font-semibold text-indigo-100/90 mt-1">
                            (इयत्ता {selectedClass} चे वार्षिक नियोजन पत्रक)
                          </p>
                          <p className="text-xs text-slate-200 mt-3 leading-relaxed">
                            {annualFile
                              ? `फाईल: ${annualFile.fileName} (${annualFile.fileSize})`
                              : `इयत्ता ${selectedClass} मधील सर्व विषयांचे एकत्र संपूर्ण वार्षिक नियोजन पत्रक`}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-3 border-t border-white/15">
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (annualFile) handleViewFile(annualFile);
                              else toast.error(`⚠️ अद्याप इयत्ता ${selectedClass} च्या वार्षिक नियोजनाची फाईल प्रशासकाद्वारे (Admin) अपलोड केलेली नाही.`);
                            }}
                            className="py-2.5 px-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer backdrop-blur-xs shadow-sm"
                          >
                            <Eye className="size-3.5 text-amber-300" /> VIEW
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (annualFile) handleOpenTableEditor(e, annualFile);
                              else toast.error(`⚠️ अद्याप इयत्ता ${selectedClass} च्या वार्षिक नियोजनाची फाईल प्रशासकाद्वारे (Admin) अपलोड केलेली नाही.`);
                            }}
                            className="py-2.5 px-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                          >
                            <Pencil className="size-3.5 text-slate-900" /> EDIT
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (annualFile) handleDownloadFile(annualFile);
                              else toast.error(`⚠️ अद्याप इयत्ता ${selectedClass} च्या वार्षिक नियोजनाची फाईल उपलब्ध नाही.`);
                            }}
                            className="py-2.5 px-2 rounded-xl bg-white text-indigo-950 hover:bg-indigo-50 text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                          >
                            <Download className="size-3.5" /> DOWNLOAD
                          </button>
                        </div>

                        {/* Replace / Upload Master File Option (ADMIN ONLY) */}
                        {mode === "admin" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSubject("all");
                              setUploadingType("annual");
                              setUploadModalOpen(true);
                            }}
                            className="w-full py-2.5 px-3 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md mt-1 border border-indigo-400/30"
                          >
                            <RefreshCw className="size-4 text-amber-300" />
                            <span>{annualFile ? `🔄 REPLACE CLASS ${selectedClass} FILE` : `UPLOAD CLASS ${selectedClass} FILE (इयत्ता ${selectedClass} फाईल)`}</span>
                          </button>
                        )}

                        {/* Remove Master Annual File Option (ADMIN ONLY) */}
                        {mode === "admin" && annualFile && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePlanningFile(annualFile);
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                          >
                            <Trash2 className="size-4 text-rose-300" />
                            <span>REMOVE CLASS {selectedClass} FILE (फाईल काढून टाका)</span>
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
                  const recKey = getFileRecordKey(selectedPlanningType, subjName);
                  let fileRec: PlanningFileRecord | undefined = planningFiles[recKey];
                  if (fileRec && (fileRec.classId !== selectedClass || fileRec.mediumId !== selectedMedium)) {
                    fileRec = undefined;
                  }
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
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (fileRec) handleViewFile(fileRec);
                              else toast.error(`⚠️ अद्याप ${subjName} ची फाईल प्रशासकाद्वारे (Admin) अपलोड केलेली नाही.`);
                            }}
                            className="py-2.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Eye className="size-3.5 text-indigo-600" /> VIEW
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (fileRec) handleOpenTableEditor(e, fileRec);
                              else toast.error(`⚠️ अद्याप ${subjName} ची फाईल प्रशासकाद्वारे (Admin) अपलोड केलेली नाही.`);
                            }}
                            className="py-2.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Pencil className="size-3.5 text-amber-700" /> EDIT
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (fileRec) handleDownloadFile(fileRec);
                              else toast.error(`⚠️ अद्याप ${subjName} ची फाईल उपलब्ध नाही.`);
                            }}
                            className="py-2.5 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                          >
                            <Download className="size-3.5" /> DOWNLOAD
                          </button>
                        </div>

                        {/* Replace / Upload File Option (ADMIN ONLY) */}
                        {mode === "admin" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSubject(subjName);
                              setUploadingType(selectedPlanningType);
                              setUploadModalOpen(true);
                            }}
                            className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm mt-1"
                          >
                            <RefreshCw className="size-4 text-indigo-400" />
                            <span>{fileRec ? "🔄 REPLACE FILE / PDF (फाईल बदला)" : "UPLOAD FILE (अपलोड करा)"}</span>
                          </button>
                        )}

                        {/* Remove File Option (ADMIN ONLY) */}
                        {mode === "admin" && fileRec && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePlanningFile(fileRec);
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                          >
                            <Trash2 className="size-4 text-rose-600" />
                            <span>REMOVE FILE (फाईल काढून टाका)</span>
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

      {/* FULLSCREEN VIEW FILE PREVIEW */}
      {viewModalFile && (
        <div className="fixed inset-0 z-[100] bg-slate-950 p-4 sm:p-6 flex flex-col gap-4 overflow-hidden">
          {viewModalFile.planningType === "monthly" || selectedPlanningType === "monthly" ? (
            <MonthlyPlanningViewer
              htmlContent={viewModalFile.parsedHtml}
              gridData={viewModalFile.parsedGrid}
              fileUrl={viewModalFile.fileUrl}
              fileName={viewModalFile.fileName}
              subjectName={selectedSubject !== "सर्व विषय" && selectedSubject !== "all" ? selectedSubject : (viewModalFile.subjectId || "मराठी")}
              role={mode === "admin" ? "admin" : "user"}
              recordId={viewModalFile.id}
              onClose={() => setViewModalFile(null)}
              onSaveTable={async (updatedGrid, updatedHtml, meta) => {
                const recordKey = viewModalFile.id;
                const currentTeacherId = getTeacherId();

                const updatedRecord: PlanningFileRecord = {
                  ...viewModalFile,
                  parsedGrid: updatedGrid,
                  parsedHtml: updatedHtml,
                };

                if (mode === "admin") {
                  const adminRecord: PlanningFileRecord = {
                    ...updatedRecord,
                    updatedAt: new Date().toISOString(),
                  };

                  await setDoc(doc(db, "academic_plannings", recordKey), adminRecord, { merge: true });
                  setPlanningFiles((prev) => ({ ...prev, [recordKey]: adminRecord }));
                  try {
                    const currentCache = JSON.parse(localStorage.getItem("cce_academic_plannings_cache") || "{}");
                    currentCache[recordKey] = adminRecord;
                    localStorage.setItem("cce_academic_plannings_cache", JSON.stringify(currentCache));
                  } catch (e) {}

                  setViewModalFile(adminRecord);
                  toast.success("🎉 मासिक नियोजन सर्व युजर्ससाठी डेटाबेसमध्ये जतन झाले!");
                } else {
                  const userDocId = `${currentTeacherId}_${recordKey}`;
                  const userRecord = {
                    ...updatedRecord,
                    teacherId: currentTeacherId,
                    userDocId,
                    updatedAt: new Date().toISOString(),
                  };

                  try {
                    await setDoc(doc(db, "user_academic_plannings", userDocId), userRecord, { merge: true });
                  } catch (fsErr) {
                    console.warn("User specific monthly planning save notice:", fsErr);
                  }

                  try {
                    localStorage.setItem(`cce_user_planning_${userDocId}`, JSON.stringify(userRecord));
                  } catch (e) {}

                  setViewModalFile(userRecord);
                  toast.success("🎉 तुमचे सुधारित बदल (User Specific Monthly Planning) जतन झाले आहेत!");
                }
              }}
              title={`इयत्ता : ${selectedClass} मासिक घटक नियोजन सन 2026-27`}
            />
          ) : (
            <PlanningTableViewer
              htmlContent={viewModalFile.parsedHtml}
              gridData={viewModalFile.parsedGrid}
              fileUrl={viewModalFile.fileUrl}
              fileName={viewModalFile.fileName}
              role={mode === "admin" ? "admin" : "user"}
              recordId={viewModalFile.id}
              onClose={() => setViewModalFile(null)}
              onSaveTable={async (updatedGrid, updatedHtml, meta) => {
                const recordKey = viewModalFile.id;
                const currentTeacherId = getTeacherId();

                const updatedRecord: PlanningFileRecord = {
                  ...viewModalFile,
                  parsedGrid: updatedGrid,
                  parsedHtml: updatedHtml,
                };

                if (mode === "admin") {
                  const adminRecord: PlanningFileRecord = {
                    ...updatedRecord,
                    updatedAt: new Date().toISOString(),
                  };

                  await setDoc(doc(db, "academic_plannings", recordKey), adminRecord, { merge: true });
                  setPlanningFiles((prev) => ({ ...prev, [recordKey]: adminRecord }));
                  try {
                    const currentCache = JSON.parse(localStorage.getItem("cce_academic_plannings_cache") || "{}");
                    currentCache[recordKey] = adminRecord;
                    localStorage.setItem("cce_academic_plannings_cache", JSON.stringify(currentCache));
                  } catch (e) {}

                  setViewModalFile(adminRecord);
                  toast.success("🎉 मास्तर नियोजन तक्ता सर्व युजर्ससाठी डेटाबेसमध्ये जतन झाला!");
                } else {
                  const userDocId = `${currentTeacherId}_${recordKey}`;
                  const userRecord = {
                    ...updatedRecord,
                    teacherId: currentTeacherId,
                    userDocId,
                    updatedAt: new Date().toISOString(),
                  };

                  try {
                    await setDoc(doc(db, "user_academic_plannings", userDocId), userRecord, { merge: true });
                  } catch (fsErr) {
                    console.warn("User specific planning save notice:", fsErr);
                  }

                  try {
                    localStorage.setItem(`cce_user_planning_${userDocId}`, JSON.stringify(userRecord));
                  } catch (e) {}

                  setViewModalFile(userRecord);
                  toast.success("🎉 तुमचे सुधारित बदल तुमच्या अकाऊंटसाठी (User Specific) जतन झाले आहेत!");
                }
              }}
              title={`इयत्ता : ${selectedClass} ${
                selectedPlanningType === "annual"
                  ? "संपूर्ण वार्षिक नियोजन"
                  : "प्रश्नपेढी"
              } सन 2026-27`}
            />
          )}
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

          {/* Printable table: use raw Excel structure when available */}
          {rawEditorHeaders.length > 0 && !rawEditorHeaders.some((h) => isPdfNoiseLine(h)) && rawEditorRows.some((r) => !isPdfNoiseLine(r)) ? (
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

      {/* Question Bank Viewer Modal */}
      {isQbViewerOpen && questionBankViewerData && (
        <div className="fixed inset-0 z-50 bg-slate-900/85 backdrop-blur-md flex flex-col justify-end sm:justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-slate-50 w-full max-w-7xl mx-auto rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[95vh] flex flex-col overflow-hidden relative">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
                <BookOpen className="size-4" />
                Question Bank Viewer (प्रश्नपेढी दालन)
              </span>
              <button
                onClick={() => setIsQbViewerOpen(false)}
                className="size-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <QuestionBankViewer data={questionBankViewerData} onClose={() => setIsQbViewerOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
