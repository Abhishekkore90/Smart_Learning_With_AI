import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import { 
  FileText, 
  Download, 
  Loader2, 
  AlertCircle, 
  BookOpen, 
  Calendar, 
  Sparkles,
  Table as TableIcon,
  Eye,
  LayoutGrid,
  FileCheck,
  ArrowLeft,
  X
} from "lucide-react";
import { getBunnyStorageUrl } from "@/lib/bunny-auth-pdf";
import { showToast as toast } from "@/lib/custom-toast";
import { db } from "@/lib/firebase";
import { doc, updateDoc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";
import { cleanThoughtText, getDefaultSuvicharForDate, isDefaultFallbackThought } from "@/lib/parse-diary-file";
import {
  subscribeTeachingDiaryHolidays,
  findHolidayForDate,
  type TeachingDiaryHoliday,
} from "@/lib/teaching-diary-holidays";

const MARATHI_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];

export const toAsciiDigits = (raw: string | undefined | null): string => {
  if (!raw) return "";
  let s = String(raw);
  for (let i = 0; i < 10; i++) {
    s = s.replaceAll(MARATHI_DIGITS[i], String(i));
  }
  return s;
};

export const toMarathiDigits = (raw: string | undefined | null): string => {
  if (!raw) return "";
  return String(raw).replace(/[0-9]/g, (d) => MARATHI_DIGITS[Number(d)]);
};

const MARATHI_CLASS_MAP: Record<string, string> = {
  "1": "पहिली",
  "1st": "पहिली",
  "i": "पहिली",
  "2": "दुसरी",
  "2nd": "दुसरी",
  "ii": "दुसरी",
  "3": "तिसरी",
  "3rd": "तिसरी",
  "iii": "तिसरी",
  "4": "चौथी",
  "4th": "चौथी",
  "iv": "चौथी",
  "5": "पाचवी",
  "5th": "पाचवी",
  "v": "पाचवी",
  "6": "सहावी",
  "6th": "सहावी",
  "vi": "सहावी",
  "7": "सातवी",
  "7th": "सातवी",
  "vii": "सातवी",
  "8": "आठवी",
  "8th": "आठवी",
  "viii": "आठवी",
  "9": "नववी",
  "9th": "नववी",
  "ix": "नववी",
  "10": "दहावी",
  "10th": "दहावी",
  "x": "दहावी",
};

export const toMarathiClassName = (raw: string | undefined | null): string => {
  if (!raw || raw.trim() === "" || raw.trim() === "-") return "-";
  const stripped = toAsciiDigits(raw)
    .trim()
    .replace(/^(?:class|std|standard|grade|इयत्ता)\s*[-:.]?\s*/i, "")
    .trim();
  const mapped = MARATHI_CLASS_MAP[stripped.toLowerCase()];
  if (mapped) return mapped;
  return toMarathiDigits(raw.replace(/^(?:class|std|standard|grade)\s*/i, "").trim());
};

const ENGLISH_TO_MARATHI_DAYS: Record<string, string> = {
  sunday: "रविवार",
  sun: "रविवार",
  monday: "सोमवार",
  mon: "सोमवार",
  tuesday: "मंगळवार",
  tue: "मंगळवार",
  wednesday: "बुधवार",
  wed: "बुधवार",
  thursday: "गुरुवार",
  thu: "गुरुवार",
  friday: "शुक्रवार",
  fri: "शुक्रवार",
  saturday: "शनिवार",
  sat: "शनिवार",
};

export const toMarathiDayName = (rawDay: string | undefined | null, dateStr?: string): string => {
  const trimmed = (rawDay || "").trim();
  if (trimmed && trimmed !== "-") {
    const mapped = ENGLISH_TO_MARATHI_DAYS[trimmed.toLowerCase()];
    if (mapped) return mapped;
    return toMarathiDigits(trimmed);
  }
  return getMarathiDayName(dateStr || "") || "-";
};

export const formatCleanDate = (raw: string | undefined | null) => {
  if (!raw) return "-";
  const cleaned = toAsciiDigits(raw).trim();
  let m = cleaned.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (m) {
    let year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const day = parseInt(m[3], 10);
    if (year < 2020 || year > 2035) year = 2026;
    return `${day}/${month}/${year}`;
  }
  m = cleaned.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    let year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
    if (year < 2020 || year > 2035) year = 2026;
    return `${day}/${month}/${year}`;
  }
  return cleaned;
};

export const fitPdfDayPageToA4 = (
  pageEl: HTMLElement,
  contentWidth: number = 754,
  maxAllowedHeight: number = 1040
) => {
  const innerEl = pageEl.querySelector<HTMLElement>(".pdf-day-inner");
  if (!innerEl) return;

  innerEl.style.minHeight = "0px";

  const applyTableTypography = (
    tdMainSize: number,
    tdSideSize: number,
    thSize: number,
    lineHeight: number,
    cellPadding: string
  ) => {
    innerEl.querySelectorAll<HTMLElement>("table.main-diary-table th").forEach((th) => {
      th.style.fontSize = `${thSize}px`;
      th.style.padding = cellPadding;
      th.style.lineHeight = String(lineHeight);
    });
    innerEl.querySelectorAll<HTMLTableRowElement>("table.main-diary-table tbody tr").forEach((tr) => {
      const tds = tr.querySelectorAll<HTMLElement>("td");
      tds.forEach((td, tdIdx) => {
        td.style.fontSize = `${tdIdx >= 5 ? tdSideSize : tdMainSize}px`;
        td.style.padding = cellPadding;
        td.style.lineHeight = String(lineHeight);
      });
    });
  };

  if (innerEl.scrollHeight <= maxAllowedHeight) {
    // Step up to the largest font size that still fits comfortably inside 1 A4 page
    const upscalePresets: Array<[number, number, number, number, string]> = [
      [13.5, 12.5, 12.5, 1.35, "6px 4px"],
      [13, 12, 12, 1.32, "5px 4px"],
      [12.5, 11.5, 12, 1.3, "5px 4px"],
      [12, 11.5, 11.5, 1.28, "4.5px 4px"],
    ];
    for (const [tdMain, tdSide, thSz, lh, pad] of upscalePresets) {
      applyTableTypography(tdMain, tdSide, thSz, lh, pad);
      if (innerEl.scrollHeight <= maxAllowedHeight) {
        break;
      }
    }
    // Revert to default base if even 12px pushed over maxAllowedHeight
    if (innerEl.scrollHeight > maxAllowedHeight) {
      applyTableTypography(11.5, 11, 11.5, 1.26, "4px 4px");
    }
  } else {
    // Compact down step-by-step if dense day overflows 1 page
    const downscalePresets: Array<[number, number, number, number, string]> = [
      [10.5, 10, 10.5, 1.22, "3.5px 3px"],
      [10, 9.5, 10, 1.2, "3px 3px"],
      [9.5, 9, 9.5, 1.18, "2.5px 3px"],
      [8.8, 8.5, 9, 1.15, "2.5px 2.5px"],
    ];
    for (const [tdMain, tdSide, thSz, lh, pad] of downscalePresets) {
      applyTableTypography(tdMain, tdSide, thSz, lh, pad);
      if (innerEl.scrollHeight <= maxAllowedHeight) {
        break;
      }
    }
  }

  // Final proportional scale safeguard if ultra-dense content still exceeds 1 page
  const actualHeight = innerEl.scrollHeight;
  if (actualHeight > maxAllowedHeight) {
    const scale = maxAllowedHeight / actualHeight;
    innerEl.style.transform = `scale(${scale})`;
    innerEl.style.transformOrigin = "top left";
    innerEl.style.width = `${contentWidth / scale}px`;
  } else {
    // Vertically expand table rows so the table stretches cleanly down to fill the available print-safe area
    const remainingSpace = maxAllowedHeight - actualHeight - 8;
    const tbodyRows = innerEl.querySelectorAll<HTMLTableRowElement>("table.main-diary-table tbody tr");
    if (remainingSpace > 12 && tbodyRows.length > 0) {
      const extraPerRow = Math.floor(remainingSpace / tbodyRows.length);
      tbodyRows.forEach((tr) => {
        const currentH = tr.getBoundingClientRect().height;
        const targetH = Math.floor(currentH + extraPerRow);
        tr.style.height = `${targetH}px`;
        tr.querySelectorAll<HTMLElement>("td").forEach((td) => {
          td.style.height = `${targetH}px`;
        });
      });
    }
    innerEl.style.minHeight = `${maxAllowedHeight}px`;
  }
};

export const formatMarathiDate = (raw: string | undefined | null): string => {
  let out = formatCleanDate(raw);
  const enToMrWords: Record<string, string> = {
    sunday: "रविवार",
    monday: "सोमवार",
    tuesday: "मंगळवार",
    wednesday: "बुधवार",
    thursday: "गुरुवार",
    friday: "शुक्रवार",
    saturday: "शनिवार",
    sun: "रविवार",
    mon: "सोमवार",
    tue: "मंगळवार",
    wed: "बुधवार",
    thu: "गुरुवार",
    fri: "शुक्रवार",
    sat: "शनिवार",
    january: "जानेवारी",
    february: "फेब्रुवारी",
    march: "मार्च",
    april: "एप्रिल",
    may: "मे",
    june: "जून",
    july: "जुलै",
    august: "ऑगस्ट",
    september: "सप्टेंबर",
    october: "ऑक्टोबर",
    november: "नोव्हेंबर",
    december: "डिसेंबर",
    jan: "जानेवारी",
    feb: "फेब्रुवारी",
    mar: "मार्च",
    apr: "एप्रिल",
    jun: "जून",
    jul: "जुलै",
    aug: "ऑगस्ट",
    sep: "सप्टेंबर",
    sept: "सप्टेंबर",
    oct: "ऑक्टोबर",
    nov: "नोव्हेंबर",
    dec: "डिसेंबर",
  };
  out = out.replace(/\b[a-zA-Z]+\b/g, (word) => enToMrWords[word.toLowerCase()] || word);
  return toMarathiDigits(out);
};

export const formatDateToIso = (raw: string | undefined | null): string => {
  if (!raw) return "";
  let cleaned = raw.trim();

  // Convert Marathi digits to ASCII digits
  const marathiDigits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
  for (let i = 0; i < 10; i++) {
    cleaned = cleaned.replaceAll(marathiDigits[i], String(i));
  }

  // Convert Marathi month names to numbers
  const marathiMonths: Record<string, string> = {
    "जानेवारी": "01",
    "फेब्रुवारी": "02",
    "मार्च": "03",
    "एप्रिल": "04",
    "मे": "05",
    "जून": "06",
    "जुलै": "07",
    "ऑगस्ट": "08",
    "सप्टेंबर": "09",
    "ऑक्टोबर": "10",
    "नोव्हेंबर": "11",
    "डिसेंबर": "12",
  };
  for (const [mName, mNum] of Object.entries(marathiMonths)) {
    if (cleaned.includes(mName)) {
      cleaned = cleaned.replace(mName, mNum);
      break;
    }
  }

  // 1. Direct YYYY-MM-DD pattern
  let m = cleaned.match(/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (m) {
    let year = parseInt(m[1], 10);
    if (year < 2020 || year > 2035) year = 2026;
    const month = m[2].padStart(2, "0");
    const day = m[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // 2. Direct DD/MM/YYYY or DD MM YYYY pattern
  m = cleaned.match(/(\d{1,2})[\/\-\.\s]+(\d{1,2})[\/\-\.\s]+(\d{2,4})/);
  if (m) {
    const day = m[1].padStart(2, "0");
    const month = m[2].padStart(2, "0");
    let year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
    if (year < 2020 || year > 2035) year = 2026;
    return `${year}-${month}-${day}`;
  }

  // 3. Textual dates like "Saturday, 01 August 2026" or "1 August 2026"
  try {
    const dateObj = new Date(cleaned);
    if (!isNaN(dateObj.getTime())) {
      let year = dateObj.getFullYear();
      if (year < 2020 || year > 2035) year = 2026;
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  } catch (e) {}

  return "";
};

const normalizeDateStr = (raw: string | undefined | null) => {
  return formatCleanDate(raw);
};

export const getMarathiDayName = (dateStr: string) => {
  if (!dateStr || dateStr === "-") return "";
  try {
    const asciiDate = toAsciiDigits(dateStr).trim();
    let m = asciiDate.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    let d: Date | null = null;
    if (m) {
      d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
    } else {
      m = asciiDate.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
      if (m) {
        let y = parseInt(m[3]);
        if (y < 100) y += 2000;
        d = new Date(y, parseInt(m[2]) - 1, parseInt(m[1]));
      }
    }
    if (d && !isNaN(d.getTime())) {
      const days = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
      return days[d.getDay()];
    }
  } catch (e) {}
  return "";
};

export function getStoredSchoolProfile() {
  try {
    if (typeof window !== "undefined") {
      const teacherProfileStr = localStorage.getItem("sqaaf_teacher_profile");
      let activeEmail = "";
      if (teacherProfileStr) {
        try {
          const parsed = JSON.parse(teacherProfileStr);
          if (parsed?.email) activeEmail = parsed.email.toLowerCase().trim();
        } catch (e) {}
      }
      if (activeEmail) {
        const userStored = localStorage.getItem(`teaching_diary_school_profile_${activeEmail}`);
        if (userStored) return JSON.parse(userStored);
      }
      const stored = localStorage.getItem("teaching_diary_school_profile");
      if (stored) return JSON.parse(stored);
    }
  } catch (e) {}
  return null;
}

interface Props {
  selectedFile?: File | null;
  savedRecord?: {
    id: string;
    diaryDate?: string;
    fileName?: string;
    pageUrl?: string;
    className?: string;
    medium?: string;
  } | null;
  authenticatedPdfUrl?: string | null;
  loadingPdf?: boolean;
}

export interface PeriodRowItem {
  period: string;
  subject: string;
  topic: string;
  subtopic?: string;
  outcome: string;
  experience: string;
  tools: string;
  materials: string;
}

export interface StructuredDayPage {
  pageNumber: number;
  date: string;
  day: string;
  std: string;
  year: string;
  teacher: string;
  school: string;
  thought: string;
  dinvishesh: string;
  periods: PeriodRowItem[];
  columnHeaders?: string[];
  rawText: string;
}

/**
 * Utility to extract date string from text, normalize format, and automatically compute Marathi Day Name.
 */
export function getMarathiDayFromDate(dateStr: string): string {
  if (!dateStr) return "";
  const cleaned = dateStr.replace(/\s+/g, "");
  const parts = cleaned.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let d = 0, m = 0, y = 0;
    if (parts[0].length === 4) {
      // YYYY-MM-DD format
      y = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10) - 1;
      d = parseInt(parts[2], 10);
    } else {
      // DD-MM-YYYY format
      d = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10) - 1;
      y = parseInt(parts[2], 10);
      if (y < 100) y += 2000;
    }
    const dateObj = new Date(y, m, d);
    if (!isNaN(dateObj.getTime())) {
      const daysInMarathi = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
      return daysInMarathi[dateObj.getDay()];
    }
  }
  return "";
}

function normalizeExtractedDateStr(rawStr: string): string {
  const clean = rawStr.trim().replace(/[०-९]/g, d => "०१२३४५६७८९".indexOf(d).toString()).replace(/\s+/g, "");
  const parts = clean.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let d = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    let y = parseInt(parts[2], 10);
    if (parts[0].length === 4) {
      y = parseInt(parts[0], 10);
      d = parseInt(parts[2], 10);
    }
    if (y < 100) y += 2000;
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
      return `${d}/${m}/${y}`;
    }
  }
  return clean;
}

export function extractDateFromText(text: string): string {
  if (!text) return "";
  const matchWithKeyword = text.match(/(?:दिनांक|तारीख|Date)\s*[:：\-]?\s*([\d०-९]{1,4}\s*[\/\-\.]\s*[\d०-९]{1,2}\s*[\/\-\.]\s*[\d०-९]{1,4})/i);
  if (matchWithKeyword) {
    return normalizeExtractedDateStr(matchWithKeyword[1]);
  }
  const standaloneMatch = text.match(/\b([\d०-९]{1,4}\s*[\/\-\.]\s*[\d०-९]{1,2}\s*[\/\-\.]\s*[\d०-९]{1,4})\b/);
  if (standaloneMatch) {
    return normalizeExtractedDateStr(standaloneMatch[1]);
  }
  return "";
}

/**
 * Helper to check if a day or date string corresponds to Sunday (रविवार).
 * Government schools and colleges are closed on Sunday, so Sunday data must NOT be fetched or displayed.
 */
export function isSunday(dayStr?: string, dateStr?: string): boolean {
  if (dayStr) {
    const trimmed = dayStr.trim().toLowerCase();
    if (
      trimmed === "रविवार" ||
      trimmed === "sunday" ||
      trimmed.includes("रविवार") ||
      trimmed.includes("sunday")
    ) {
      return true;
    }
  }
  if (dateStr) {
    const iso = formatDateToIso(dateStr);
    if (iso && iso.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parts = iso.split("-");
      const dt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      if (!isNaN(dt.getTime()) && dt.getDay() === 0) return true;
    }
  }
  return false;
}

/**
 * Enhanced multi-page Marathi Teacher Diary Text Parser
 */
export function parseMultiPageTextToStructuredDiaries(fullText: string): StructuredDayPage[] {
  if (!fullText || fullText.trim().length === 0) return [];

  const cleanFullText = fullText.replace(/[\u200B\u200C\u200D\uFEFF]/g, "");

  const pageChunks = cleanFullText
    .split(/(?=(?:दैनंदिन पाठ टाचण|दैनिक पाठ टाचण|दिनांक\s*[:：]?\s*\d{1,2}\s*[\/\-\.]\s*\d{1,2}))/gi)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 20);

  const finalChunks = pageChunks.length > 0 ? pageChunks : [cleanFullText];

  const knownSubjects = [
    "मराठी", "गणित", "इंग्रजी", "हिंदी", "विज्ञान", "सामाजिक शास्त्र",
    "परिसर अभ्यास", "परिसर अभ्यास १", "परिसर अभ्यास २", "कला", "कार्यानुभव",
    "शारीरिक शिक्षण", "शा. शि.", "AEP", "ग्रंथालय", "संगीत", "चित्रकला",
    "शारीरिक लवचिकता", "आरोग्यदायी सवयी"
  ];

  return finalChunks.map((chunkText, pageIdx) => {
    const lines = chunkText.split(/\n+/).map((l) => l.trim()).filter(Boolean);

    let date = extractDateFromText(chunkText);
    let day = "";
    const dayMatch = chunkText.match(/(?:वार|Day)\s*[:：\-]?\s*(सोमवार|मंगळवार|बुधवार|गुरुवार|शुक्रवार|शनिवार|रविवार|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i);
    if (dayMatch) {
      const matched = dayMatch[1].trim().toLowerCase();
      const dayMap: Record<string, string> = {
        "monday": "सोमवार", "tuesday": "मंगळवार", "wednesday": "बुधवार",
        "thursday": "गुरुवार", "friday": "शुक्रवार", "saturday": "शनिवार", "sunday": "रविवार",
        "mon": "सोमवार", "tue": "मंगळवार", "wed": "बुधवार", "thu": "गुरुवार", "fri": "शुक्रवार", "sat": "शनिवार", "sun": "रविवार",
        "सोमवार": "सोमवार", "मंगळवार": "मंगळवार", "बुधवार": "बुधवार",
        "गुरुवार": "गुरुवार", "शुक्रवार": "शुक्रवार", "शनिवार": "शनिवार", "रविवार": "रविवार"
      };
      day = dayMap[matched] || dayMatch[1].trim();
    }

    if (date) {
      const computed = getMarathiDayFromDate(date);
      if (computed) day = computed;
    }

    let std = "";
    const stdMatch = chunkText.match(/(?:इयत्ता|Class|Std)\s*[:：]?\s*([^\s\n:፡]+)/i);
    if (stdMatch && stdMatch[1].length < 20) {
      std = stdMatch[1];
    }

    let year = "";
    const yearMatch = chunkText.match(/(?:सन|Year)\s*[:：]?\s*(\d{4}(?:-\d{2,4})?)/i);
    if (yearMatch) {
      year = yearMatch[1];
    }

    let teacher = "";
    const teacherMatch = chunkText.match(/(?:वर्गशिक्षक|शिक्षक|िषक|Teacher)\s*[:：]?\s*([^\n:፡]+)/i);
    if (teacherMatch && teacherMatch[1].length < 30) {
      const cleanedTeacher = teacherMatch[1].replace(/^(?:शाळा|आजचा|सुविचार|विचार).*$/i, "").trim();
      if (cleanedTeacher && cleanedTeacher !== "-") teacher = cleanedTeacher;
    }

    let school = "";
    const schoolMatch = chunkText.match(/(?:शाळा|School)\s*[:：]?\s*([^\n:፡]+)/i);
    if (schoolMatch && schoolMatch[1].length < 40) {
      const cleanedSchool = schoolMatch[1].replace(/^(?:आजचा|सुविचार|विचार|इयत्ता).*$/i, "").trim();
      if (cleanedSchool && cleanedSchool !== "-") school = cleanedSchool;
    }

    let thought = "";
    const thoughtMatch = chunkText.match(/(?:आजचा\s*सुव\u200Dिचार|आजचा\s*सुविचार|आजचा\s*(?:सु)?विचार|सुविचार|Today.?s Thought|Suvichar|Thought)\s*[:：\-]?\s*([^\n\r]+)/i);
    if (thoughtMatch) {
      thought = thoughtMatch[1]
        .replace(/^[:\s\u0903\-"'”’„«»]+/, "")
        .replace(/\s*(?:इयत्त्?ता|Class|Std|सन|Year|वार|Day|वर्गशिक्षक|शिक्षक|शाळा|दिनांक|तारीख).*$/i, "")
        .replace(/^["'”’„«»]+|["'”’„«»]+$/g, "")
        .trim();
    }

    let dinvishesh = "";
    const dinMatch = chunkText.match(/(?:दिनविशेष|Dinvishesh)\s*[:：]?\s*([^\n]+)/i);
    if (dinMatch) dinvishesh = dinMatch[1].trim();

    const periods: PeriodRowItem[] = [];
    const dataLines = lines.filter((l) => {
      if (
        /(?:दिनांक|तारीख|वार|इयत्ता|सन|िचार|सुविचार|शिक्षक|िषक|शाळा|टाचण|तासिका|कौशल्य|विषय\s*\(Theme\)|उपक्रम|अध्यापन|साधन\s*तंत्रे|शैक्षणिक\s*साहित्य|वैशिष्ट्यपूर्ण|वैशिष्टपूर्ण|बाबी|वर्गशिक्षक|मुख्याध्यापक)/i.test(l)
      ) {
        return false;
      }
      if (/^[\s\-_._~\u005F\u2014\u2013]*$/.test(l) || l.includes("___") || l.includes("---")) {
        return false;
      }
      return true;
    });

    let currentPeriod = 1;
    let idx = 0;

    while (idx < dataLines.length) {
      const subject = dataLines[idx] || "";
      const topic = dataLines[idx + 1] || "";
      const outcome = dataLines[idx + 2] || "";
      const experience = dataLines[idx + 3] || "";
      const tools = dataLines[idx + 4] || "";
      
      let materials = "";
      let jump = 5;

      if (
        dataLines[idx + 5] &&
        dataLines[idx + 5].length < 50 &&
        !knownSubjects.some((s) => dataLines[idx + 5].includes(s))
      ) {
        materials = dataLines[idx + 5];
        jump = 6;
      }

      if (subject || topic || outcome || experience) {
        periods.push({
          period: String(currentPeriod++),
          subject,
          topic,
          outcome,
          experience,
          tools,
          materials,
        });
      }

      idx += jump;
    }

    return {
      pageNumber: pageIdx + 1,
      date,
      day,
      std: std || "पहिली",
      year: year || "2025-26",
      teacher: teacher || "-",
      school: school || "-",
      thought,
      dinvishesh,
      periods,
      rawText: chunkText,
    };
  }).filter((page) => !isSunday(page.day, page.date));
}

/**
 * HTML Table Parser for Marathi Teacher Diary (.docx files)
 * Uses actual <table>/<tr>/<td> structure from mammoth HTML output
 * to correctly map column data to fields.
 * 
 * Handles multi-day documents by walking through elements sequentially
 * and extracting metadata (date, day, thought, etc.) per-day section.
 */
export function parseHtmlToStructuredDiaries(htmlString: string): StructuredDayPage[] {
  if (!htmlString || htmlString.trim().length === 0) return [];

  const cleanHtml = htmlString.replace(/[\u200B\u200C\u200D\uFEFF]/g, "");
  const parser = new DOMParser();
  const doc = parser.parseFromString(cleanHtml, "text/html");

  // Find ALL table elements in the HTML document (even if wrapped inside div/section containers)
  const tables = Array.from(doc.querySelectorAll("table"));
  const daySections: { textElements: Element[]; table: HTMLTableElement }[] = [];

  tables.forEach((tableEl) => {
    let curr: Element | null = tableEl.previousElementSibling;
    const textEls: Element[] = [];
    while (curr && curr.tagName !== "TABLE") {
      textEls.unshift(curr);
      curr = curr.previousElementSibling;
    }
    daySections.push({
      textElements: textEls,
      table: tableEl as HTMLTableElement,
    });
  });

  // Helper: extract metadata from a section's text elements and table
  function extractSectionMetadata(textEls: Element[], table?: HTMLTableElement) {
    const textElsText = textEls.map((el) => el.textContent || "").join("\n");
    const tableText = table ? Array.from(table.rows).map(r => Array.from(r.cells).map(c => c.textContent || "").join(" ")).join("\n") : "";
    const sectionText = textElsText + "\n" + tableText;

    let date = extractDateFromText(sectionText);

    let day = "";
    const dayMatch = sectionText.match(
      /(?:वार|Day)\s*[:：\-]?\s*(सोमवार|मंगळवार|बुधवार|गुरुवार|शुक्रवार|शनिवार|रविवार|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i
    );
    if (dayMatch) {
      const matched = dayMatch[1].trim().toLowerCase();
      const dayMap: Record<string, string> = {
        "monday": "सोमवार", "tuesday": "मंगळवार", "wednesday": "बुधवार",
        "thursday": "गुरुवार", "friday": "शुक्रवार", "saturday": "शनिवार", "sunday": "रविवार",
        "mon": "सोमवार", "tue": "मंगळवार", "wed": "बुधवार", "thu": "गुरुवार", "fri": "शुक्रवार", "sat": "शनिवार", "sun": "रविवार",
        "सोमवार": "सोमवार", "मंगळवार": "मंगळवार", "बुधवार": "बुधवार",
        "गुरुवार": "गुरुवार", "शुक्रवार": "शुक्रवार", "शनिवार": "शनिवार", "रविवार": "रविवार"
      };
      day = dayMap[matched] || dayMatch[1].trim();
    }

    // AUTOMATIC CALCULATION: Compute exact day from date
    if (date) {
      const computedDay = getMarathiDayFromDate(date);
      if (computedDay) day = computedDay;
    }

    let std = "";
    const stdMatch = sectionText.match(/(?:इयत्त्?ता|Class|Std)\s*[:：]?\s*([^\s\n:]+)/i);
    if (stdMatch && stdMatch[1].length < 20) std = stdMatch[1];

    let year = "";
    const yearMatch = sectionText.match(/(?:सन|Year)\s*[:：]?\s*(\d{4}(?:\s*-\s*\d{2,4})?)/i);
    if (yearMatch) year = yearMatch[1].replace(/\s+/g, "");

    let teacher = "";
    const teacherMatch = sectionText.match(/(?:वर्गश\u200Dिक्षक|वर्गशिक्षक|शिक्षक|Teacher)\s*[:：]?\s*([^\n:]+)/i);
    if (teacherMatch && teacherMatch[1].length < 50) {
      const ct = teacherMatch[1]
        .replace(/\t+/g, " ")
        .replace(/शाळा\s*[:：]?\s*.*$/i, "")
        .trim();
      if (ct && ct !== "-" && ct.length > 0 && ct.length < 30) teacher = ct;
    }

    let school = "";
    const schoolMatch = sectionText.match(/(?:शाळा|School)\s*[:：]?\s*([^\n]+)/i);
    if (schoolMatch && schoolMatch[1].length < 50) {
      const cs = schoolMatch[1]
        .replace(/\t+/g, " ")
        .replace(/आजचा\s*(?:सु)?विचार.*$/i, "")
        .trim();
      if (cs && cs !== "-" && cs.length > 0 && cs.length < 40) school = cs;
    }

    let thought = "";
    const thoughtMatch = sectionText.match(
      /(?:आजचा\s*सुव[\u200C\u200D]?िचार|आजचा\s*सुविचार|आजचा\s*(?:सु)?विचार|सुविचार|Today.?s Thought|Suvichar|Thought)\s*[:：\-]?\s*([^\n\r]+)/i
    );
    if (thoughtMatch) {
      thought = cleanThoughtText(thoughtMatch[1]);
    }

    return { date, day, std, year, teacher, school, thought };
  }

  // Helper: extract periods and column headers from a table
  function extractPeriodsFromTable(table: HTMLTableElement): { periods: PeriodRowItem[]; columnHeaders: string[] } {
    const rows = table.querySelectorAll("tr");
    if (rows.length < 2) return { periods: [], columnHeaders: [] };

    // Find the header row (contains column titles like तासिका, विषय, घटक, etc.)
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 6); i++) {
      const rowText = rows[i].textContent?.trim() || "";
      if (
        /तास|तासिका|विषय|घटक|मुद्दा|पाठाचे|पाठ|निष्पत्ती|अनुभव|साधन|साहित्य|Period|Subject|Topic|Outcome|Experience|Sr|No|अ\.?\s*क्र|अनुक्रमाणिका/i.test(rowText)
      ) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx === -1) {
      headerRowIdx = 0;
    }

    // Extract actual column header labels from the header row
    const headerCells = rows[headerRowIdx].querySelectorAll("td, th");
    const columnHeaders = Array.from(headerCells).map(
      (cell) => (cell.textContent || "").trim()
    );

    let colMap: any = { period: 0, subject: 1, topic: 2, subtopic: -1, outcome: 3, experience: 4, tools: 5, materials: 6 };

    if (columnHeaders.length > 0) {
      const normHeaders = columnHeaders.map(h => h.trim().toLowerCase());
      const findCol = (pattern: RegExp) => normHeaders.findIndex(h => pattern.test(h));

      const pIdx = findCol(/तासिका\s*[\/\-]?\s*विषय|तास|तासिका|period|time|अ\.?\s*क्र|अनुक्रमाणिका|sr|no/i);
      const sIdx = findCol(/विषय|subject/i);
      const tIdx = findCol(/पाठ\s*[\/\-]?\s*घटक|घटक|पाठ|पाठाचे|घटकाचे|नाव|topic|chapter|unit/i);
      const stIdx = findCol(/अध्ययन\s*मुद्दा|मुद्दा|उपघटक|subtopic|point/i);
      const oIdx = findCol(/निष्पत्ती|निष्पती|दर्शक|दर्शके|outcome|result|learning outcome/i);
      const eIdx = findCol(/अनुभव|अनुभवाचे|स्वरूप|कृती|experience|learning experience|activity/i);
      const tlIdx = findCol(/साधन|तंत्र|साधने|tools|method|technique/i);
      const mIdx = findCol(/साहित्य|materials|tlm/i);

      if (pIdx !== -1) colMap.period = pIdx;
      if (sIdx !== -1) colMap.subject = sIdx;
      if (tIdx !== -1) colMap.topic = tIdx;
      if (stIdx !== -1) colMap.subtopic = stIdx;
      if (oIdx !== -1) colMap.outcome = oIdx;
      if (eIdx !== -1) colMap.experience = eIdx;
      if (tlIdx !== -1) colMap.tools = tlIdx;
      if (mIdx !== -1) colMap.materials = mIdx;
    }

    const periods: PeriodRowItem[] = [];
    let periodCounter = 1;

    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll("td, th");
      if (cells.length === 0) continue;

      const cellTexts = Array.from(cells).map(
        (cell) => (cell.textContent || "").trim()
      );

      // Skip footer/signature rows
      const rowText = cellTexts.join(" ");
      if (
        rowText.includes("वैशिष्ट") ||
        rowText.includes("वर्गशिक्षक") ||
        rowText.includes("मुख्याध्यापक") ||
        rowText.includes("___") ||
        /^[\s_\-]*$/.test(rowText)
      ) {
        continue;
      }

      // Skip empty rows
      if (cellTexts.every((t) => !t || t.length === 0)) continue;

      let period = (colMap.period < cellTexts.length && cellTexts[colMap.period]) ? cellTexts[colMap.period] : cellTexts[0] || String(periodCounter);
      let subject = (colMap.subject < cellTexts.length && cellTexts[colMap.subject]) ? cellTexts[colMap.subject] : cellTexts[1] || "";
      let topic = (colMap.topic < cellTexts.length && cellTexts[colMap.topic]) ? cellTexts[colMap.topic] : cellTexts[2] || "";
      let subtopic = (colMap.subtopic !== -1 && colMap.subtopic < cellTexts.length && cellTexts[colMap.subtopic]) ? cellTexts[colMap.subtopic] : "";
      let outcome = (colMap.outcome < cellTexts.length && cellTexts[colMap.outcome]) ? cellTexts[colMap.outcome] : (cellTexts.length >= 4 ? cellTexts[3] : "");
      let experience = (colMap.experience < cellTexts.length && cellTexts[colMap.experience]) ? cellTexts[colMap.experience] : (cellTexts.length >= 5 ? cellTexts[4] : "");
      let tools = (colMap.tools < cellTexts.length && cellTexts[colMap.tools]) ? cellTexts[colMap.tools] : (cellTexts.length >= 6 ? cellTexts[5] : "");
      let materials = (colMap.materials < cellTexts.length && cellTexts[colMap.materials]) ? cellTexts[colMap.materials] : (cellTexts.length >= 7 ? cellTexts[6] : "");

      // If combined 'तासिका/ विषय' column was present (e.g. "१  मराठी")
      if (cellTexts[0] && /^[\d०-९]{1,2}\s+[^\d]+/i.test(cellTexts[0])) {
        const m = cellTexts[0].match(/^([\d०-९]{1,2})\s*(.+)$/);
        if (m) {
          period = m[1];
          if (!subject || subject === cellTexts[0]) subject = m[2];
        }
      }

      // Smart positional fallback if column headers were not mapped
      const nonHeaderCells = cellTexts.filter(Boolean);
      if (!subject && !topic && !outcome && !experience && nonHeaderCells.length > 0) {
        let cellIdx = 0;
        if (/^\d{1,2}$/.test(nonHeaderCells[0])) {
          cellIdx = 1;
        }
        if (nonHeaderCells[cellIdx]) subject = nonHeaderCells[cellIdx];
        if (nonHeaderCells[cellIdx + 1]) topic = nonHeaderCells[cellIdx + 1];
        if (nonHeaderCells[cellIdx + 2]) outcome = nonHeaderCells[cellIdx + 2];
        if (nonHeaderCells[cellIdx + 3]) experience = nonHeaderCells[cellIdx + 3];
        if (nonHeaderCells[cellIdx + 4]) tools = nonHeaderCells[cellIdx + 4];
        if (nonHeaderCells[cellIdx + 5]) materials = nonHeaderCells[cellIdx + 5];
      }

      if (subject || topic || outcome || experience || tools || materials) {
        periods.push({
          period,
          subject,
          topic,
          subtopic,
          outcome,
          experience,
          tools,
          materials,
        });
        periodCounter++;
      }
    }

    return { periods, columnHeaders };
  }

  // Process each day section
  const pages: StructuredDayPage[] = [];
  let currentDateCursor: Date | null = null;

  daySections.forEach((section, idx) => {
    const meta = extractSectionMetadata(section.textElements, section.table);
    const { periods, columnHeaders } = extractPeriodsFromTable(section.table);

    let finalDate = meta.date;
    let finalDay = meta.day;

    if (finalDate) {
      const parts = finalDate.split(/[\/\-\.]/);
      if (parts.length === 3) {
        let d = parseInt(parts[0], 10);
        let m = parseInt(parts[1], 10) - 1;
        let y = parseInt(parts[2], 10);
        if (parts[0].length === 4) {
          y = parseInt(parts[0], 10);
          d = parseInt(parts[2], 10);
        }
        if (y < 100) y += 2000;
        const dObj = new Date(y, m, d);
        if (!isNaN(dObj.getTime())) {
          currentDateCursor = dObj;
        }
      }
    } else if (currentDateCursor) {
      currentDateCursor = new Date(currentDateCursor);
      currentDateCursor.setDate(currentDateCursor.getDate() + 1);
      if (currentDateCursor.getDay() === 0) {
        currentDateCursor.setDate(currentDateCursor.getDate() + 1);
      }
      const d = String(currentDateCursor.getDate()).padStart(2, "0");
      const m = String(currentDateCursor.getMonth() + 1).padStart(2, "0");
      const y = currentDateCursor.getFullYear();
      finalDate = `${d}/${m}/${y}`;
      finalDay = getMarathiDayFromDate(finalDate);
    }

    if (!finalDay && finalDate) {
      finalDay = getMarathiDayFromDate(finalDate);
    }

    if (periods.length > 0 && !isSunday(finalDay, finalDate)) {
      pages.push({
        pageNumber: idx + 1,
        date: finalDate,
        day: finalDay,
        std: meta.std || "पहिली",
        year: meta.year || "2025-26",
        teacher: meta.teacher || "-",
        school: meta.school || "-",
        thought: meta.thought,
        dinvishesh: "",
        periods,
        columnHeaders: columnHeaders.length > 0 ? columnHeaders : undefined,
        rawText: section.textElements.map((el) => el.textContent || "").join("\n"),
      });
    }
  });

  return pages;
}

export interface GroupedDayRecord {
  date: string;
  day: string;
  std: string;
  year: string;
  teacher: string;
  school: string;
  thought: string;
  dinvishesh: string;
  periods: PeriodRowItem[];
  columnHeaders?: string[];
  rawText: string;
  pageUrl?: string;
  scannedPageUrl?: string;
  isHoliday?: boolean;
  holidayReason?: string;
}

export function splitLargePagesIntoDayChunks(pages: StructuredDayPage[]): StructuredDayPage[] {
  const result: StructuredDayPage[] = [];
  const daysOfWeek = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];

  let currentDateCursor = new Date(2026, 7, 1); // Default Aug 1, 2026

  pages.forEach((p, pIdx) => {
    if (p.date) {
      const parts = p.date.split(/[\/\-\.]/);
      if (parts.length === 3) {
        let d = parseInt(parts[0], 10);
        let m = parseInt(parts[1], 10) - 1;
        let y = parseInt(parts[2], 10);
        if (parts[0].length === 4) {
          y = parseInt(parts[0], 10);
          d = parseInt(parts[2], 10);
        }
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          currentDateCursor = new Date(y, m, d);
        }
      }
    }

    if (p.periods.length <= 9) {
      result.push(p);
      return;
    }

    // Chunk large tables (e.g. 87 periods) into 9-period day tables
    const chunkSize = 9;
    const totalChunks = Math.ceil(p.periods.length / chunkSize);

    const docThoughts: string[] = [];
    if (p.rawText) {
      const matches = p.rawText.matchAll(/(?:आजचा\s*सुव\u200Dिचार|आजचा\s*सुविचार|आजचा\s*(?:सु)?विचार|सुविचार|Today.?s Thought|Suvichar|Thought)\s*[:：\-]?\s*([^\n\r<]+)/gi);
      for (const tm of matches) {
        if (tm[1]) {
          const ct = cleanThoughtText(tm[1]);
          if (ct && ct.length > 1 && !ct.includes("प्रविष्ट करा")) {
            docThoughts.push(ct);
          }
        }
      }
    }

    for (let c = 0; c < totalChunks; c++) {
      while (currentDateCursor.getDay() === 0) { // Skip Sundays
        currentDateCursor.setDate(currentDateCursor.getDate() + 1);
      }

      const chunkPeriods = p.periods.slice(c * chunkSize, (c + 1) * chunkSize).map((item, idx) => ({
        ...item,
        period: String(idx + 1),
      }));

      const dStr = `${currentDateCursor.getFullYear()}-${String(currentDateCursor.getMonth() + 1).padStart(2, "0")}-${String(currentDateCursor.getDate()).padStart(2, "0")}`;
      const dayName = daysOfWeek[currentDateCursor.getDay()];

      let chunkThought = "";
      if (docThoughts[c]) {
        chunkThought = docThoughts[c];
      } else if (c === 0) {
        chunkThought = p.thought || "";
      }

      result.push({
        ...p,
        pageNumber: c + 1,
        date: dStr,
        day: dayName,
        thought: chunkThought,
        periods: chunkPeriods,
      });

      currentDateCursor.setDate(currentDateCursor.getDate() + 1);
    }
  });

  return result;
}

export function groupStructuredPagesByDay(pages: StructuredDayPage[], defaultBaseDate?: string): GroupedDayRecord[] {
  const partitionedPages = splitLargePagesIntoDayChunks(pages);
  const list: GroupedDayRecord[] = [];

  let startYear = 2026;
  let startMonth = 7; // 0-indexed (August = 7)
  let startDay = 1;

  if (defaultBaseDate) {
    const cleanDefault = defaultBaseDate.trim();
    let m = cleanDefault.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (m) {
      startYear = parseInt(m[1], 10);
      startMonth = parseInt(m[2], 10) - 1;
      startDay = parseInt(m[3], 10);
    } else {
      m = cleanDefault.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
      if (m) {
        startDay = parseInt(m[1], 10);
        startMonth = parseInt(m[2], 10) - 1;
        let yr = parseInt(m[3], 10);
        if (yr < 100) yr += 2000;
        startYear = yr;
      }
    }
  }

  if (startYear < 2020 || startYear > 2035) {
    startYear = 2026;
  }

  const currentDateCursor = new Date(startYear, startMonth, startDay);

  partitionedPages.forEach((p, idx) => {
    let assignedDate = "";

    if (p.date) {
      const cleaned = p.date.trim().replace(/\s+/g, "");
      const parts = cleaned.split(/[\/\-\.]/);
      if (parts.length === 3) {
        let d = parseInt(parts[0], 10);
        let m = parseInt(parts[1], 10) - 1;
        let y = parseInt(parts[2], 10);
        if (parts[0].length === 4) {
          y = parseInt(parts[0], 10);
          d = parseInt(parts[2], 10);
        }
        if (y < 100) y += 2000;
        if (y < startYear && startYear - y === 1) {
          y = startYear;
        }
        if (startDay === 21 && idx === 0 && d < 21) {
          d = 21;
        }
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          const pageDateObj = new Date(y, m, d);
          currentDateCursor.setTime(pageDateObj.getTime());
          assignedDate = `${d}/${m + 1}/${y}`;
        }
      }
    }

    if (!assignedDate) {
      if (idx > 0 || !p.date) {
        currentDateCursor.setDate(currentDateCursor.getDate() + 1);
      }
      while (currentDateCursor.getDay() === 0) { // Skip Sundays
        currentDateCursor.setDate(currentDateCursor.getDate() + 1);
      }
      assignedDate = `${currentDateCursor.getDate()}/${currentDateCursor.getMonth() + 1}/${currentDateCursor.getFullYear()}`;
    }

    const isoDateStr = formatDateToIso(assignedDate);
    const localThought = (isoDateStr && (localStorage.getItem(`suvichar_${p.std || ""}_${p.school || ""}_${isoDateStr}`) || localStorage.getItem(`suvichar_${isoDateStr}`))) || "";

    let dayThought = p.thought || "";
    if (!dayThought) {
      dayThought = localThought || "";
    }

    list.push({
      date: assignedDate,
      day: getMarathiDayName(assignedDate) || (p.day && p.day !== "-" ? p.day : ""),
      std: p.std,
      year: p.year,
      teacher: p.teacher,
      school: p.school,
      thought: dayThought,
      dinvishesh: p.dinvishesh,
      periods: p.periods.map((item) => ({ ...item })),
      columnHeaders: p.columnHeaders ? [...p.columnHeaders] : undefined,
      rawText: p.rawText,
      pageUrl: (p as any).pageUrl || (p as any).scannedPageUrl || (p as any).pageURL || "",
      scannedPageUrl: (p as any).scannedPageUrl || (p as any).pageUrl || "",
      isHoliday: Boolean((p as any).isHoliday),
      holidayReason: (p as any).holidayReason || "",
    });
  });

  // Re-index periods to keep them sequential per day table (1..9) & sanitize dummy fallback text
  list.forEach((dayRec) => {
    dayRec.periods.forEach((period, index) => {
      period.period = String(index + 1);
      if (period.subject && /^[\d०-९]+[\s.\-):]+/.test(period.subject.trim())) {
        period.subject = period.subject.trim().replace(/^[\d०-९]+[\s.\-):]+/, "").trim();
      }
      if (period.subject === "माहिती संकलन" || (period.experience && period.experience.includes("स्कॅन केलेले टाचण पान"))) {
        period.subject = "";
        period.topic = "";
        period.subtopic = "";
        period.outcome = "";
        period.experience = "";
        period.tools = "";
        period.materials = "";
      }
    });
  });

  return list;
}

export interface StructuredDayPageListRef {
  getEditedData: () => any[];
}

const isImageUrl = (url?: string) => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.startsWith("data:image/") ||
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".gif") ||
    lower.includes("blob:")
  );
};

const normalizeTableHeader = (header: string, hIdx: number) => {
  const defaultHeaders = [
    "तासिका/ विषय",
    "पाठ / घटक",
    "अध्ययन मुद्दा",
    "अध्ययन निष्पत्ती",
    "अध्ययन अनुभवाचे स्वरूप",
    "साधन तंत्रे",
    "शैक्षणिक साहित्य",
  ];
  if (!header) return defaultHeaders[hIdx] || "";
  const h = header.trim();
  if (/तासिका\s*[\/\-]?\s*विषय/i.test(h) || (hIdx === 0 && /तास|विषय/i.test(h))) return "तासिका/ विषय";
  if (/पाठ\s*[\/\-]?\s*घटक|पाठ|घटक|chapter|unit/i.test(h)) return "पाठ / घटक";
  if (/अध्ययन\s*मुद्दा|मुद्दा|point|subtopic/i.test(h)) return "अध्ययन मुद्दा";
  if (/निष्पत्ती|निष्पती|दर्शक|outcome/i.test(h)) return "अध्ययन निष्पत्ती";
  if (/अनुभव|स्वरूप|कृती|experience/i.test(h)) return "अध्ययन अनुभवाचे स्वरूप";
  if (/साधन|तंत्र|tools/i.test(h)) return "साधन तंत्रे";
  if (/साहित्य|materials/i.test(h)) return "शैक्षणिक साहित्य";
  return defaultHeaders[hIdx] || h;
};

export const StructuredDayPageList = forwardRef<StructuredDayPageListRef, { pages: StructuredDayPage[], schoolProfile?: any, defaultBaseDate?: string }>(({ pages, schoolProfile, defaultBaseDate }, ref) => {
  const [dayRecords, setDayRecords] = useState<any[]>([]);
  const profile = useMemo(() => schoolProfile || getStoredSchoolProfile(), [schoolProfile]);

  useEffect(() => {
    setDayRecords(groupStructuredPagesByDay(pages, defaultBaseDate));
  }, [pages, defaultBaseDate]);

  useImperativeHandle(ref, () => ({
    getEditedData: () => dayRecords
  }));

  const updateHeader = (dayIdx: number, field: string, value: string) => {
    setDayRecords(prev => {
      const next = [...prev];
      next[dayIdx] = { ...next[dayIdx], [field]: value };
      return next;
    });
  };

  const updateRow = (dayIdx: number, rowIdx: number, field: string, value: string) => {
    setDayRecords(prev => {
      const next = [...prev];
      const nextPeriods = [...(next[dayIdx].periods || [])];
      nextPeriods[rowIdx] = { ...nextPeriods[rowIdx], [field]: value };
      next[dayIdx] = { ...next[dayIdx], periods: nextPeriods };
      return next;
    });
  };

  return (
    <div className="space-y-6 font-sans w-full max-w-full pb-6">
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .day-card {
            border: none !important;
            box-shadow: none !important;
            padding: 10px !important;
            margin: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-before: always !important;
            break-before: always !important;
          }
          .day-card:first-of-type {
            page-break-before: avoid !important;
            break-before: avoid !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          table th {
            padding: 7px 8px !important;
            font-size: 10px !important;
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
          }
          table td {
            padding: 7px 8px !important;
            font-size: 10px !important;
            line-height: 1.35 !important;
          }
          h2 {
            font-size: 18px !important;
            margin-top: 8px !important;
            margin-bottom: 12px !important;
          }
          .signature-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-top: 8px !important;
            padding-top: 12px !important;
          }
        }
        .day-card {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        tr {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .signature-section {
          page-break-inside: avoid;
          break-inside: avoid;
        }
      `}</style>

      <div className="flex items-center justify-between p-2.5 sm:p-3.5 bg-slate-900 text-white rounded-xl sm:rounded-2xl text-xs font-bold shadow-sm">
        <span className="flex items-center gap-2">
          <Sparkles className="size-4 text-amber-400" />
          एकूण दिवस (Total Structured Days): <span className="text-indigo-300 font-extrabold text-sm">{dayRecords.length}</span>
        </span>
        <span className="px-3 py-1 bg-indigo-600 rounded-lg text-[11px] font-extrabold tracking-wide uppercase">
          अध्यापन नोंदवही (Day-wise View)
        </span>
      </div>

      {dayRecords.map((p, idx) => (
        <div key={idx} className="bg-white border-2 border-slate-300 rounded-2xl sm:rounded-3xl p-2 sm:p-6 md:p-8 shadow-md space-y-4 sm:space-y-5 day-card w-full">
          {/* Top Pill Badges Bar & Edit Tip */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold">
            <span className="px-3.5 py-1.5 bg-slate-100 text-slate-900 border border-slate-200 rounded-full font-extrabold">
              {p.date ? `दिनांक: ${formatMarathiDate(p.date)}` : `दिवस ${toMarathiDigits(String(idx + 1))}`}
            </span>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[11px] font-black flex items-center gap-1.5 shadow-sm">
                <span>कोणत्याही मजकुरावर क्लिक करून थेट एडिट करा (Live Edit Enabled)</span>
              </span>
              <span className={`px-3 py-1.5 rounded-xl font-extrabold ${
                p.isHoliday ? "bg-rose-100 text-rose-700 border border-rose-200" : "bg-slate-100 text-slate-700"
              }`}>
                {p.isHoliday
                  ? "सुट्टी (Holiday)"
                  : p.periods.length > 0
                  ? `${p.periods.length} तासिका (Periods)`
                  : "विवरण मजकूर"}
              </span>
            </div>
          </div>

          <div className="text-center space-y-4 sm:space-y-5">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              दैनंदिन पाठ टाचण
            </h2>
            
            {/* Header Card (Centered 6-column Box matching 1-day view) */}
            <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 sm:p-5 shadow-sm">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-center font-bold text-slate-900">
                <div>
                  <span className="text-slate-700 font-black block text-sm uppercase mb-0.5">दिनांक</span>
                  <span suppressContentEditableWarning contentEditable onBlur={(e) => updateHeader(idx, "date", e.currentTarget.textContent || "")} className="text-slate-900 font-black text-base block hover:bg-amber-100/70 focus:bg-amber-100 focus:outline-none rounded px-1 transition-all cursor-text">{formatMarathiDate(p.date)}</span>
                </div>
                <div>
                  <span className="text-slate-700 font-black block text-sm uppercase mb-0.5">वार</span>
                  <span suppressContentEditableWarning contentEditable onBlur={(e) => updateHeader(idx, "day", e.currentTarget.textContent || "")} className="text-slate-900 font-black text-base block hover:bg-amber-100/70 focus:bg-amber-100 focus:outline-none rounded px-1 transition-all cursor-text">{toMarathiDayName(p.day, p.date)}</span>
                </div>
                <div>
                  <span className="text-slate-700 font-black block text-sm uppercase mb-0.5">वर्गशिक्षक</span>
                  <span suppressContentEditableWarning contentEditable onBlur={(e) => updateHeader(idx, "teacher", e.currentTarget.textContent || "")} className="text-slate-900 font-black text-base block hover:bg-amber-100/70 focus:bg-amber-100 focus:outline-none rounded px-1 transition-all cursor-text">{toMarathiDigits(p.teacher && p.teacher !== "-" ? p.teacher : (profile?.teacherName || "-"))}</span>
                </div>
                <div>
                  <span className="text-slate-700 font-black block text-sm uppercase mb-0.5">शाळा</span>
                  <span suppressContentEditableWarning contentEditable onBlur={(e) => updateHeader(idx, "school", e.currentTarget.textContent || "")} className="text-slate-900 font-black text-base block hover:bg-amber-100/70 focus:bg-amber-100 focus:outline-none rounded px-1 transition-all cursor-text">{toMarathiDigits(p.school && p.school !== "-" ? p.school : (profile?.schoolName || "-"))}</span>
                </div>
                <div>
                  <span className="text-slate-700 font-black block text-sm uppercase mb-0.5">इयत्ता</span>
                  <span suppressContentEditableWarning contentEditable onBlur={(e) => updateHeader(idx, "std", e.currentTarget.textContent || "")} className="text-slate-900 font-black text-base block hover:bg-amber-100/70 focus:bg-amber-100 focus:outline-none rounded px-1 transition-all cursor-text">{toMarathiClassName(p.std && p.std !== "-" && p.std !== "पहिली" ? p.std : (profile?.className || p.std || "-"))}</span>
                </div>
                <div>
                  <span className="text-slate-700 font-black block text-sm uppercase mb-0.5">सन</span>
                  <span suppressContentEditableWarning contentEditable onBlur={(e) => updateHeader(idx, "year", e.currentTarget.textContent || "")} className="text-slate-900 font-black text-base block hover:bg-amber-100/70 focus:bg-amber-100 focus:outline-none rounded px-1 transition-all cursor-text">{toMarathiDigits(p.year && p.year !== "-" ? p.year : (profile?.academicYear || "2026-27"))}</span>
                </div>
              </div>
            </div>

            {/* Yellow Suvichar Card matching 1-day view */}
            <div className="text-xs text-black bg-amber-50/95 p-2.5 sm:p-3 rounded-2xl border border-amber-300 text-center shadow-xs flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
              <strong className="text-black font-black text-xs uppercase tracking-wider shrink-0">आजचा सुविचार : </strong>
              <span 
                suppressContentEditableWarning 
                contentEditable 
                onBlur={(e) => updateHeader(idx, "thought", e.currentTarget.textContent || "")}
                className="font-black text-xs sm:text-sm text-black not-italic hover:bg-amber-100/80 focus:bg-amber-100 focus:outline-none rounded px-1 transition-all cursor-text max-w-full break-words"
                title="सुविचार बदलण्यासाठी येथे क्लिक करा"
              >
                {cleanThoughtText(p.thought) && !cleanThoughtText(p.thought).includes("प्रविष्ट करण्यासाठी")
                  ? `"${cleanThoughtText(p.thought)}"`
                  : "आजचा सुविचार प्रविष्ट करा..."}
              </span>
            </div>
          </div>

          {/* Custom Holiday Card (when admin added a custom holiday for this date) */}
          {p.isHoliday ? (
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-rose-50 to-white border-2 border-rose-200 text-center space-y-2.5 my-3">
              <span className="inline-block px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-black uppercase tracking-wider">
                शाळा सुट्टी (School Holiday)
              </span>
              <p className="text-base sm:text-lg font-black text-rose-900 break-words">
                सुट्टीचे कारण: {p.holidayReason || "शासकीय / कस्टम सुट्टी"}
              </p>
            </div>
          ) : null}

          {/* Display Scanned Page Image ONLY if valid image format AND periods table missing */}
          {!p.isHoliday && isImageUrl(p.scannedPageUrl || p.pageUrl) && p.periods.length === 0 && (
            <div className="w-full rounded-2xl overflow-hidden border-2 border-slate-300 shadow-sm bg-slate-50 p-3 my-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-extrabold text-indigo-900 flex items-center gap-1.5">
                  <FileText className="size-4 text-indigo-600" />
                  स्कॅन केलेले टाचण पान (Scanned Diary Page {idx + 1}):
                </p>
              </div>
              <img 
                src={p.scannedPageUrl || p.pageUrl} 
                alt={`Scanned Page ${idx + 1}`} 
                className="w-full max-h-[650px] object-contain rounded-xl border border-slate-200 shadow-inner bg-white" 
              />
            </div>
          )}

          {!p.isHoliday && (p.periods.length > 0 ? (
            <div className="w-full overflow-hidden rounded-xl border-2 border-slate-900 shadow-sm mt-2 sm:mt-4 max-w-full">
              <table className="w-full text-xs sm:text-sm border-collapse border-2 border-slate-900 table-fixed">
                <colgroup>
                  <col className="w-[10%]" />
                  <col className="w-[9%]" />
                  <col className="w-[13%]" />
                  <col className="w-[27%]" />
                  <col className="w-[19%]" />
                  <col className="w-[11%]" />
                  <col className="w-[11%]" />
                </colgroup>
                <thead className="bg-slate-200 text-slate-950 font-bold text-[9px] sm:text-xs md:text-sm border-b-2 border-slate-900">
                  <tr>
                    {(p.columnHeaders && p.columnHeaders.length > 0
                      ? p.columnHeaders.map(normalizeTableHeader)
                      : ["तासिका/ विषय", "पाठ / घटक", "अध्ययन मुद्दा", "अध्ययन निष्पत्ती", "अध्ययन अनुभवाचे स्वरूप", "साधन तंत्रे", "शैक्षणिक साहित्य"]
                    ).map((header: string, hIdx: number) => {
                      return (
                        <th
                          key={hIdx}
                          className={`py-1.5 sm:py-2.5 px-0.5 ${hIdx === 3 || hIdx === 4 ? "sm:px-2" : "sm:px-1.5"} text-center bg-slate-200 text-slate-950 font-bold ${hIdx < 6 ? "border-r border-slate-400" : ""} break-words leading-tight ${hIdx >= 1 ? "sm:leading-snug" : ""}`}
                        >
                          {header}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-400 font-medium text-slate-900 bg-white text-[9px] sm:text-xs md:text-sm">
                  {p.periods.map((row: any, rIdx: number) => (
                    <tr 
                      key={rIdx} 
                      className="hover:bg-indigo-50/40 transition-colors border-b-2 border-slate-400"
                    >
                      <td className="p-1 sm:p-2 border-r-2 border-slate-400 text-center font-black text-black align-middle hover:bg-amber-100/60 transition-all text-[9.5px] sm:text-xs md:text-sm break-words leading-tight">
                        <span
                          suppressContentEditableWarning
                          contentEditable
                          onBlur={(e) => updateRow(idx, rIdx, "period", e.currentTarget.textContent || "")}
                          className="text-black font-black mr-1 outline-none hover:bg-amber-200/60 rounded px-0.5"
                          title="तासिका क्रमांक"
                        >
                          {row.period}
                        </span>
                        <span
                          suppressContentEditableWarning
                          contentEditable
                          onBlur={(e) => updateRow(idx, rIdx, "subject", e.currentTarget.textContent || "")}
                          className="text-black font-black outline-none hover:bg-amber-200/60 rounded px-0.5 block sm:inline mt-0.5 sm:mt-0"
                          title="विषय"
                        >
                          {row.subject}
                        </span>
                      </td>
                      <td 
                        suppressContentEditableWarning 
                        contentEditable 
                        onBlur={(e) => updateRow(idx, rIdx, "topic", e.currentTarget.textContent || "")} 
                        className="p-1 sm:p-2 border-r-2 border-slate-400 text-black font-extrabold text-center align-middle hover:bg-amber-100/60 focus:bg-amber-100 focus:outline-none transition-all cursor-text text-[9px] sm:text-xs md:text-sm break-words leading-tight sm:leading-normal"
                        title="पाठ / घटक"
                      >
                        {row.topic}
                      </td>
                      <td 
                        suppressContentEditableWarning 
                        contentEditable 
                        onBlur={(e) => updateRow(idx, rIdx, "subtopic", e.currentTarget.textContent || "")} 
                        className="p-1 sm:p-2 border-r-2 border-slate-400 text-black font-bold text-center align-middle hover:bg-amber-100/60 focus:bg-amber-100 focus:outline-none transition-all cursor-text text-[9px] sm:text-xs md:text-sm break-words leading-tight sm:leading-normal"
                        title="अध्ययन मुद्दा"
                      >
                        {row.subtopic || "-"}
                      </td>
                      <td 
                        suppressContentEditableWarning 
                        contentEditable 
                        onBlur={(e) => updateRow(idx, rIdx, "outcome", e.currentTarget.textContent || "")} 
                        className="p-1 sm:p-2 border-r-2 border-slate-400 text-black font-extrabold leading-tight sm:leading-relaxed text-center align-middle hover:bg-amber-100/60 focus:bg-amber-100 focus:outline-none transition-all cursor-text text-[9px] sm:text-xs md:text-sm break-words"
                        title="अध्ययन निष्पत्ती"
                      >
                        {row.outcome || "-"}
                      </td>
                      <td 
                        suppressContentEditableWarning 
                        contentEditable 
                        onBlur={(e) => updateRow(idx, rIdx, "experience", e.currentTarget.textContent || "")} 
                        className="p-1 sm:p-2 border-r-2 border-slate-400 text-black font-bold leading-tight sm:leading-relaxed text-center align-middle hover:bg-amber-100/60 focus:bg-amber-100 focus:outline-none transition-all cursor-text text-[9px] sm:text-xs md:text-sm break-words"
                        title="अध्ययन अनुभवाचे स्वरूप"
                      >
                        {row.experience || "-"}
                      </td>
                      <td 
                        suppressContentEditableWarning 
                        contentEditable 
                        onBlur={(e) => updateRow(idx, rIdx, "tools", e.currentTarget.textContent || "")} 
                        className="p-1 sm:p-2 border-r-2 border-slate-400 text-black text-[8.5px] sm:text-xs font-bold text-center align-middle hover:bg-amber-100/60 focus:bg-amber-100 focus:outline-none transition-all cursor-text break-words leading-tight"
                        title="साधन तंत्रे"
                      >
                        {row.tools || "-"}
                      </td>
                      <td 
                        suppressContentEditableWarning 
                        contentEditable 
                        onBlur={(e) => updateRow(idx, rIdx, "materials", e.currentTarget.textContent || "")} 
                        className="p-1 sm:p-2 text-black text-[8.5px] sm:text-xs font-bold text-center align-middle hover:bg-amber-100/60 focus:bg-amber-100 focus:outline-none transition-all cursor-text break-words leading-tight"
                        title="शैक्षणिक साहित्य"
                      >
                        {row.materials || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-xs text-slate-700 p-4 bg-slate-50 rounded-2xl border border-slate-200 leading-relaxed text-center">
              {p.rawText}
            </pre>
          ))}

          <div 
            className="pt-4 border-t-2 border-slate-400 space-y-2 signature-section"
            style={{ pageBreakInside: "avoid", breakInside: "avoid", pageBreakBefore: "auto", breakBefore: "auto" }}
          >
            <p className="font-bold text-xs text-slate-900">दिवसभरातील वैशिष्टपूर्ण बाबी:</p>
            <div 
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => {
                const val = e.currentTarget.innerText.trim();
                updateHeader(idx, "specialRemarks", val);
                try {
                  if (p.date) localStorage.setItem(`special_remarks_${p.date}`, val);
                } catch {}
              }}
              className="border-b border-slate-300 p-2 min-h-[36px] text-xs text-slate-800 font-medium hover:bg-amber-50/50 focus:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-lg transition-all cursor-text"
              title="येथे टिप्पणी किंवा विशेष बाबी प्रविष्ट करण्यासाठी क्लिक करा"
            >{p.specialRemarks || ""}</div>
            <div className="flex justify-between items-center font-black text-sm text-slate-900 pt-8 px-4">
              <span>वर्गशिक्षक</span>
              <span>मुख्याध्यापक</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

function extractTextFromBinaryDoc(arrayBuffer: ArrayBuffer): string {
  try {
    const uint8 = new Uint8Array(arrayBuffer);

    const decoder16 = new TextDecoder("utf-16le", { fatal: false });
    const raw16 = decoder16.decode(uint8);
    const matches16 = raw16.match(/[\u0900-\u097F\w\s.,:;()\/\-–"'%!=+<>?]{3,}/g);

    if (matches16 && matches16.length > 0) {
      const clean16 = matches16
        .map((s) => s.trim())
        .filter((s) => s.length > 2 && !/^[0-9]+$/.test(s))
        .join("\n")
        .replace(/\n{3,}/g, "\n\n");
      if (clean16.length > 20) return clean16;
    }

    const decoder8 = new TextDecoder("utf-8", { fatal: false });
    const raw8 = decoder8.decode(uint8);
    const matches8 = raw8.match(/[\u0900-\u097F\w\s.,:;()\/\-–"'%!=+<>?]{3,}/g);
    if (matches8 && matches8.length > 0) {
      const clean8 = matches8
        .map((s) => s.trim())
        .filter((s) => s.length > 2 && !/^[0-9]+$/.test(s))
        .join("\n")
        .replace(/\n{3,}/g, "\n\n");
      if (clean8.length > 20) return clean8;
    }

    return "";
  } catch (err) {
    return "";
  }
}

export interface DocumentLivePreviewProps {
  selectedFile?: File | null;
  savedRecord?: any;
  selectedMonth?: string | null;
  selectedDateIso?: string | null;
  authenticatedPdfUrl?: string | null;
  loadingPdf?: boolean;
  onBack?: () => void;
  schoolProfile?: any;
}

export interface DocumentLivePreviewRef {
  getStructuredData: () => any[] | null;
}

export const DocumentLivePreview = forwardRef<DocumentLivePreviewRef, DocumentLivePreviewProps>(({
  selectedFile,
  savedRecord,
  selectedMonth = null,
  selectedDateIso = null,
  authenticatedPdfUrl,
  loadingPdf = false,
  onBack,
  schoolProfile
}, ref) => {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [structuredPages, setStructuredPages] = useState<StructuredDayPage[]>([]);
  const structuredListRef = useRef<StructuredDayPageListRef>(null);

  useImperativeHandle(ref, () => ({
    getStructuredData: () => {
      if (structuredListRef.current) {
        return structuredListRef.current.getEditedData();
      }
      return null;
    }
  }));

  const [excelPreviewData, setExcelPreviewData] = useState<any[] | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [loadingContent, setLoadingContent] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [localPdfBlobUrl, setLocalPdfBlobUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"original" | "structured">("original");
  const [isInnerDownloading, setIsInnerDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [customHolidays, setCustomHolidays] = useState<TeachingDiaryHoliday[]>([]);

  useEffect(() => {
    const unsub = subscribeTeachingDiaryHolidays((list) => {
      setCustomHolidays(list);
    });
    return () => unsub();
  }, []);

  const cleanFirestoreData = (data: any): any => {
    if (data === undefined || data === null) return "";
    return JSON.parse(
      JSON.stringify(data, (_key, value) => (value === undefined ? "" : value))
    );
  };

  const handleSaveChanges = async () => {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    if (!savedRecord || !savedRecord.id) {
      toast.error("डेटा सेव्ह करण्यासाठी आधी रेकॉर्ड उपलब्ध असणे आवश्यक आहे.");
      return;
    }

    const cls = savedRecord.className;
    const med = savedRecord.medium;
    if (!cls || !med) {
      toast.error("वर्ग किंवा माध्यम उपलब्ध नसल्यामुळे बदल सेव्ह करता आले नाहीत.");
      return;
    }

    const editedData = structuredListRef.current?.getEditedData() || structuredPages;
    if (!editedData || editedData.length === 0) {
      toast.error("सेव्ह करण्यासाठी कोणताही डेटा नाही.");
      return;
    }

    setIsSaving(true);
    try {
      const firstDay = editedData[0];
      const mainPeriods = firstDay?.periods || [];

      // 1. Update teacher_diaries document safely
      const diaryDocRef = doc(db, "teacher_diaries", cls, med, savedRecord.id);
      const cleanMainPayload = cleanFirestoreData({
        structuredData: editedData,
        parsedContent: {
          ...(savedRecord.parsedContent || {}),
          periods: mainPeriods,
          thought: firstDay?.thought || "",
          day: firstDay?.day || "",
        },
        periods: mainPeriods,
        updatedAt: Date.now(),
      });
      await setDoc(diaryDocRef, cleanMainPayload, { merge: true });

      // 2. Update teaching_diaries documents for ALL dates in editedData
      if (Array.isArray(editedData) && editedData.length > 0) {
        for (const dayEntry of editedData) {
          const rawDKey = (dayEntry as any).dateISO || (dayEntry as any).dateKey || dayEntry.date || savedRecord.diaryDate || savedRecord.id;
          const dKey = formatDateToIso(rawDKey) || (rawDKey && String(rawDKey).match(/^\d{4}-\d{2}-\d{2}$/) ? rawDKey : "");
          if (dKey && String(dKey).match(/^\d{4}-\d{2}-\d{2}$/)) {
            const tdDocId = `${cls}_${med}_${dKey}`;
            const tdDocRef = doc(db, "teaching_diaries", tdDocId);
            const cleanTdPayload = cleanFirestoreData({
              className: cls,
              medium: med,
              date: dKey,
              displayDate: dayEntry.date || dKey,
              day: dayEntry.day || "",
              thought: dayEntry.thought || "",
              periods: dayEntry.periods || [],
              structuredData: editedData,
              updatedAt: Date.now(),
            });
            await setDoc(tdDocRef, cleanTdPayload, { merge: true });

            if (dayEntry.thought) {
              try {
                localStorage.setItem(`suvichar_${cls}_${med}_${dKey}`, dayEntry.thought);
                localStorage.setItem(`suvichar_${dKey}`, dayEntry.thought);
              } catch (e) {}
            }
          }
        }
      }

      // 3. Update local props & component state so downloads use editedData
      savedRecord.structuredData = editedData;
      savedRecord.periods = mainPeriods;
      setStructuredPages(editedData);

      toast.success("✅ बदल यशस्वीरित्या जतन झाले असून डाऊनलोड व प्रिव्ह्यू अपडेट झाले आहे!");
    } catch (err: any) {
      console.error("Firestore save error:", err);
      toast.error("डेटाबेसमध्ये बदल सेव्ह करताना अडचण आली: " + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const activeFileName = selectedFile?.name || savedRecord?.fileName || "Document";
  const activeExt = activeFileName.split(".").pop()?.toLowerCase() || "";
  const pageUrlLower = (savedRecord?.pageUrl || "").toLowerCase();
  
  const isPdf = activeExt === "pdf" || 
                selectedFile?.type === "application/pdf" || 
                pageUrlLower.endsWith(".pdf") || 
                pageUrlLower.includes(".pdf?") ||
                pageUrlLower.includes(".pdf#");

  useEffect(() => {
    if (selectedFile && (selectedFile.type === "application/pdf" || activeExt === "pdf")) {
      const blobUrl = URL.createObjectURL(selectedFile);
      setLocalPdfBlobUrl(blobUrl);
      return () => {
        URL.revokeObjectURL(blobUrl);
      };
    } else {
      setLocalPdfBlobUrl(null);
    }
  }, [selectedFile, activeExt]);

  useEffect(() => {
    setHtmlContent(null);
    setStructuredPages([]);
    setExcelPreviewData(null);
    setErrorMsg(null);
    setViewMode(isPdf ? "original" : "structured");
    setFilterSingleDate(false);

    if (savedRecord) {
      const cls = savedRecord.className || "";
      const med = savedRecord.medium || "";
      const pagesList = ((savedRecord as any).structuredData && (savedRecord as any).structuredData.length > 0)
        ? (savedRecord as any).structuredData
        : [{
            date: savedRecord.diaryDate || savedRecord.date || "",
            day: savedRecord.day || "",
            thought: savedRecord.thought || (savedRecord.parsedContent ? savedRecord.parsedContent.thought : ""),
            dinvishesh: savedRecord.dinvishesh || (savedRecord.parsedContent ? savedRecord.parsedContent.dinvishesh : ""),
            highlights: savedRecord.highlights || (savedRecord.parsedContent ? savedRecord.parsedContent.highlights : ""),
            periods: savedRecord.periods || (savedRecord.parsedContent ? savedRecord.parsedContent.periods : []),
          }];

      const enrichedPages = (pagesList as StructuredDayPage[]).map((p) => {
        const isoDate = formatDateToIso(p.date);
        const localThought = (isoDate && (localStorage.getItem(`suvichar_${cls}_${med}_${isoDate}`) || localStorage.getItem(`suvichar_${isoDate}`))) || "";
        if (localThought && isDefaultFallbackThought(p.thought)) {
          return { ...p, thought: localThought };
        }
        return p;
      });
      setStructuredPages(enrichedPages);

      // Asynchronously re-parse DOCX file from Bunny Storage to extract true file thoughts
      const fetchTarget = savedRecord.pageUrl || (savedRecord as any).masterPdfUrl;
      const isRemoteBunnyDocx =
        fetchTarget &&
        !isPdf &&
        !fetchTarget.startsWith("blob:") &&
        !fetchTarget.startsWith("data:") &&
        (fetchTarget.startsWith("http://") || fetchTarget.startsWith("https://") || fetchTarget.startsWith("/"));

      if (isRemoteBunnyDocx) {
        const targetUrl = getBunnyStorageUrl(fetchTarget);
        const headers: Record<string, string> = {
          AccessKey: import.meta.env.VITE_BUNNY_STORAGE_API_KEY || "",
        };

        fetch(targetUrl, { headers })
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.arrayBuffer();
          })
          .then(async (buffer) => {
            try {
              const mammoth = await import("mammoth");
              const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
              if (result.value && result.value.trim().length > 0) {
                setHtmlContent(result.value);
                const { parseDocxHtmlToDiaries } = await import("@/lib/parse-diary-file");
                const parsedFromHtml = await parseDocxHtmlToDiaries(result.value, savedRecord?.className || "पहिली");
                if (parsedFromHtml.length > 0) {
                  setStructuredPages(parsedFromHtml as any);
                  return;
                }
              }
            } catch (err) {}
          })
          .catch(() => {});
      }

      // Async fetch sibling days ONLY if structuredData is missing on master record
      if (cls && med && (!savedRecord.structuredData || (Array.isArray(savedRecord.structuredData) && savedRecord.structuredData.length === 0))) {
        const targetFileId = savedRecord.fileId;
        const targetFileName = savedRecord.fileName;
        const targetUploadedAt = savedRecord.uploadedAt;
        const targetWeek = savedRecord.week || savedRecord.selectedWeek || "";
        const groupTime = targetUploadedAt ? Math.floor(targetUploadedAt / 120000) : 0;

        getDocs(collection(db, "teacher_diaries", cls, med)).then((qSnap) => {
          const siblingEntriesMap = new Map<string, any>();
          qSnap.docs.forEach((docSnap) => {
            const d = docSnap.data();
            const dGroupTime = d.uploadedAt ? Math.floor(d.uploadedAt / 120000) : 0;
            const matchesFile = Boolean(targetFileId && d.fileId === targetFileId);
            const matchesNameTime = Boolean(targetFileName && d.fileName === targetFileName && (!groupTime || !dGroupTime || Math.abs(groupTime - dGroupTime) <= 1));
            const matchesWeek = Boolean(!targetWeek || !d.week || d.week === targetWeek);

            if ((matchesFile || matchesNameTime) && matchesWeek) {
              if (Array.isArray(d.structuredData) && d.structuredData.length > 0) {
                d.structuredData.forEach((p: any) => {
                  const pDate = p.date || p.displayDate || "";
                  if (pDate) siblingEntriesMap.set(pDate, p);
                });
              } else if (d.diaryDate && d.diaryDate !== "master_diary" && !docSnap.id.startsWith("file_")) {
                siblingEntriesMap.set(d.diaryDate, {
                  date: d.diaryDate,
                  day: d.day || "",
                  thought: d.thought || (d.parsedContent ? d.parsedContent.thought : ""),
                  dinvishesh: d.dinvishesh || (d.parsedContent ? d.parsedContent.dinvishesh : ""),
                  highlights: d.highlights || (d.parsedContent ? d.parsedContent.highlights : ""),
                  periods: d.periods || (d.parsedContent ? d.parsedContent.periods : []),
                });
              }
            }
          });

          if (siblingEntriesMap.size > 0) {
            const allSorted = Array.from(siblingEntriesMap.values()).sort((a, b) =>
              String(a.date || "").localeCompare(String(b.date || ""))
            );
            if (allSorted.length > 0) {
              setStructuredPages(allSorted);
            }
          }
        }).catch(() => {});
      }

      if (isPdf) {
        setViewMode("original");
      } else {
        setViewMode("structured");
      }
      return;
    }

    if (selectedFile) {
      const ext = selectedFile.name.split(".").pop()?.toLowerCase();

      if (ext === "pdf") {
        setLoadingContent(true);
        selectedFile
          .arrayBuffer()
          .then(async (buffer) => {
            try {
              const pdfjsLib = await import("pdfjs-dist");
              pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

              const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
              const extractedPages: StructuredDayPage[] = [];

              for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(" ");

                const dayChunks = parseMultiPageTextToStructuredDiaries(pageText);
                if (dayChunks.length > 0) {
                  dayChunks.forEach((dp) => {
                    dp.pageNumber = pageNum;
                    extractedPages.push(dp);
                  });
                }
              }

              if (extractedPages.length > 0) {
                setStructuredPages(extractedPages);
              }
            } catch (err) {
              console.warn("PDF text extraction note:", err);
            }
          })
          .finally(() => setLoadingContent(false));
      } else if (ext === "docx" || ext === "doc") {
        setLoadingContent(true);
        selectedFile
          .arrayBuffer()
          .then(async (buffer) => {
            try {
              const mammoth = await import("mammoth");
              const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
              if (result.value && result.value.trim().length > 0) {
                setHtmlContent(result.value);
                const parsedFromHtml = parseHtmlToStructuredDiaries(result.value);
                if (parsedFromHtml.length > 0) {
                  setStructuredPages(parsedFromHtml);
                } else {
                  const rawTxt = await mammoth.extractRawText({ arrayBuffer: buffer });
                  const parsed = parseMultiPageTextToStructuredDiaries(rawTxt.value);
                  if (parsed.length > 0) setStructuredPages(parsed);
                }
                return;
              }
            } catch (err: any) {}

            const extractedText = extractTextFromBinaryDoc(buffer);
            if (extractedText && extractedText.length > 0) {
              const parsed = parseMultiPageTextToStructuredDiaries(extractedText);
              if (parsed.length > 0) {
                setStructuredPages(parsed);
              }
            } else {
              setErrorMsg(`Word document selected (${selectedFile.name}). Ready for upload.`);
            }
          })
          .catch((err) => {
            setErrorMsg("Could not read local Word file.");
          })
          .finally(() => setLoadingContent(false));
      } else if (ext === "xlsx" || ext === "xls" || ext === "csv") {
        setLoadingContent(true);
        selectedFile
          .arrayBuffer()
          .then((buffer) => {
            try {
              const wb = XLSX.read(buffer, { type: "array" });
              const sheetName = wb.SheetNames[0];
              const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });
              setExcelPreviewData(rows.slice(0, 50));
            } catch (err) {
              setErrorMsg("Could not parse Excel preview.");
            }
          })
          .finally(() => setLoadingContent(false));
      }
    } else if (savedRecord && (savedRecord.pageUrl || (savedRecord as any).masterPdfUrl) && !isPdf) {
      const fetchTarget = savedRecord.pageUrl || (savedRecord as any).masterPdfUrl;
      const isRemoteBunnyDocx =
        fetchTarget &&
        !fetchTarget.startsWith("blob:") &&
        !fetchTarget.startsWith("data:") &&
        (fetchTarget.startsWith("http://") || fetchTarget.startsWith("https://") || fetchTarget.startsWith("/"));

      if (isRemoteBunnyDocx) {
        setLoadingContent(true);
        const targetUrl = getBunnyStorageUrl(fetchTarget);
        const headers: Record<string, string> = {
          AccessKey: import.meta.env.VITE_BUNNY_STORAGE_API_KEY || "",
        };

        fetch(targetUrl, { headers })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.arrayBuffer();
        })
        .then(async (buffer) => {
          try {
            const mammoth = await import("mammoth");
            const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
            if (result.value && result.value.trim().length > 0) {
              setHtmlContent(result.value);
              const { parseDocxHtmlToDiaries } = await import("@/lib/parse-diary-file");
              const parsedFromHtml = await parseDocxHtmlToDiaries(result.value, savedRecord?.className || "पहिली");
              if (parsedFromHtml.length > 0) {
                setStructuredPages(parsedFromHtml as any);
                return;
              } else {
                const rawTxt = await mammoth.extractRawText({ arrayBuffer: buffer });
                const parsed = parseMultiPageTextToStructuredDiaries(rawTxt.value);
                if (parsed.length > 0) {
                  setStructuredPages(parsed);
                  return;
                }
              }
            }
          } catch (err) {}

          const extractedText = extractTextFromBinaryDoc(buffer);
          if (extractedText && extractedText.length > 0) {
            const parsed = parseMultiPageTextToStructuredDiaries(extractedText);
            if (parsed.length > 0) {
              setStructuredPages(parsed);
            }
          }
        })
        .catch((err) => {
          setErrorMsg("Document preview is ready for download.");
        })
        .finally(() => setLoadingContent(false));
      }
    }
  }, [selectedFile, savedRecord, isPdf]);

  const [filterSingleDate, setFilterSingleDate] = useState<boolean>(false);

  const effectiveBaseDate = useMemo(() => {
    const weekStr = savedRecord?.week || savedRecord?.selectedWeek || "";
    const fileNameStr = savedRecord?.fileName || selectedFile?.name || "";
    
    if (weekStr.includes("1 to 10") || weekStr === "Week 1" || fileNameStr.includes("1_to_10") || fileNameStr.includes("1-10") || fileNameStr.includes("1_10")) {
      const yearStr = savedRecord?.year || "2026";
      const monthStr = savedRecord?.month || selectedMonth || "08";
      return `${yearStr}-${String(monthStr).padStart(2, "0")}-01`;
    }
    if (weekStr.includes("11 to 20") || weekStr === "Week 2" || fileNameStr.includes("11_to_20") || fileNameStr.includes("11-20") || fileNameStr.includes("11_20")) {
      const yearStr = savedRecord?.year || "2026";
      const monthStr = savedRecord?.month || selectedMonth || "08";
      return `${yearStr}-${String(monthStr).padStart(2, "0")}-11`;
    }
    if (weekStr.includes("21 to 31") || weekStr.includes("21 to 30") || weekStr === "Week 3" || weekStr === "Week 4" || weekStr === "Week 5" || fileNameStr.includes("21_to_31") || fileNameStr.includes("21-31")) {
      const yearStr = savedRecord?.year || "2026";
      const monthStr = savedRecord?.month || selectedMonth || "08";
      return `${yearStr}-${String(monthStr).padStart(2, "0")}-21`;
    }
    return savedRecord?.diaryDate || savedRecord?.date || "2026-08-01";
  }, [savedRecord, selectedFile, selectedMonth]);

  const pdfUrlToDisplay = isPdf
    ? (selectedFile ? localPdfBlobUrl : (authenticatedPdfUrl || savedRecord?.masterPdfUrl || savedRecord?.pageUrl || null))
    : null;

  const targetNormalizedDate = useMemo(() => {
    return normalizeDateStr(savedRecord?.diaryDate);
  }, [savedRecord?.diaryDate]);

  const isRecordMatchingMonth = useMemo(() => {
    if (!selectedMonth || !savedRecord) return true;
    if (savedRecord.month && String(savedRecord.month).padStart(2, "0") === selectedMonth) return true;
    if (savedRecord.selectedMonth && String(savedRecord.selectedMonth).padStart(2, "0") === selectedMonth) return true;
    if (savedRecord.diaryDate && typeof savedRecord.diaryDate === "string") {
      const parts = savedRecord.diaryDate.split("-");
      if (parts.length === 3 && parts[1] === selectedMonth) return true;
    }
    if (savedRecord.structuredData && Array.isArray(savedRecord.structuredData)) {
      return savedRecord.structuredData.some((p: any) => {
        const d = p.date || p.displayDate || "";
        if (!d) return false;
        const clean = String(d).trim();
        let m = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
        if (m) return String(m[2]).padStart(2, "0") === selectedMonth;
        m = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
        if (m) return String(m[2]).padStart(2, "0") === selectedMonth;
        return false;
      });
    }
    return false;
  }, [savedRecord, selectedMonth]);

  // Auto-sync date-wise thoughts from teaching_diaries collection in Firestore
  useEffect(() => {
    if (!savedRecord || !savedRecord.id) return;
    let isCancelled = false;

    async function syncThoughtsFromFirestore() {
      try {
        const cls = savedRecord.className;
        const med = savedRecord.medium;
        if (!cls || !med) return;

        // 1. Synchronously update local storage thoughts if available
        setStructuredPages((prevPages) => {
          if (!prevPages || prevPages.length === 0) return prevPages;
          let changed = false;
          const next = prevPages.map((p) => {
            const isoDate = formatDateToIso(p.date);
            if (!isoDate) return p;
            const localThought =
              localStorage.getItem(`suvichar_${cls}_${med}_${isoDate}`) ||
              localStorage.getItem(`suvichar_${isoDate}`) ||
              "";
            if (localThought && (!p.thought || p.thought.trim() === "" || p.thought.includes("प्रविष्ट करण्यासाठी"))) {
              changed = true;
              return { ...p, thought: localThought };
            }
            return p;
          });
          return changed ? next : prevPages;
        });

        // 2. Asynchronously fetch thoughts from Firestore once per savedRecord or structuredPages
        const pagesList = (savedRecord.structuredData && Array.isArray(savedRecord.structuredData) && savedRecord.structuredData.length > 0)
          ? savedRecord.structuredData
          : structuredPages;
        if (!Array.isArray(pagesList) || pagesList.length === 0) return;

        const docPromises = pagesList.map(async (p: any) => {
          const isoDate = formatDateToIso(p.date);
          if (!isoDate) return { date: p.date, isoDate: "", thought: "" };

          let foundThought = "";
          try {
            const tdDocId = `${cls}_${med}_${isoDate}`;
            const tdSnap = await getDoc(doc(db, "teaching_diaries", tdDocId));
            if (tdSnap.exists() && tdSnap.data().thought) {
              const t = cleanThoughtText(tdSnap.data().thought);
              if (!isDefaultFallbackThought(t)) foundThought = t;
            }
          } catch (e) {}

          if (!foundThought) {
            try {
              const altSnap = await getDoc(doc(db, "teacher_diaries", cls, med, isoDate));
              if (altSnap.exists()) {
                const aData = altSnap.data();
                const t = cleanThoughtText(aData.thought || (aData.parsedContent ? aData.parsedContent.thought : ""));
                if (!isDefaultFallbackThought(t)) foundThought = t;
              }
            } catch (e) {}
          }

          if (!foundThought) {
            try {
              const pSnap = await getDoc(doc(db, "daily_paripath_archive", isoDate));
              if (pSnap.exists()) {
                const pData = pSnap.data();
                const t = cleanThoughtText(pData.suvichar || pData.thought || pData.thoughtOfTheDay);
                if (!isDefaultFallbackThought(t)) foundThought = t;
              }
            } catch (e) {}
          }

          if (foundThought && isoDate) {
            try {
              localStorage.setItem(`suvichar_${cls}_${med}_${isoDate}`, foundThought);
              localStorage.setItem(`suvichar_${isoDate}`, foundThought);
            } catch (e) {}
          }

          return { date: p.date, isoDate, thought: foundThought };
        });

        const results = await Promise.all(docPromises);
        if (isCancelled) return;

        setStructuredPages((prevPages) => {
          if (!prevPages || prevPages.length === 0) return prevPages;
          let hasUpdate = false;
          const next = prevPages.map((p) => {
            const iso = formatDateToIso(p.date);
            const match = results.find((r) => (r.isoDate && r.isoDate === iso) || (r.date && r.date === p.date));
            if (match && match.thought && match.thought !== p.thought && (!p.thought || p.thought.trim() === "")) {
              hasUpdate = true;
              return { ...p, thought: match.thought };
            }
            return p;
          });
          return hasUpdate ? next : prevPages;
        });
      } catch (e) {
        console.error("Failed to sync date-wise thoughts in DocumentLivePreview:", e);
      }
    }

    syncThoughtsFromFirestore();
    return () => {
      isCancelled = true;
    };
  }, [savedRecord?.id]);

  const calculateRangeWorkingDayIndex = (year: number, month: number, targetDay: number, startDay: number = 1): number => {
    let workingCount = 0;
    for (let d = startDay; d <= targetDay; d++) {
      const testD = new Date(year, month - 1, d);
      if (testD.getDay() !== 0) { // Skip Sundays
        workingCount++;
      }
    }
    return Math.max(0, workingCount - 1);
  };

  const getDayOfMonthNumber = (dateStr?: string): number => {
    if (!dateStr) return 0;
    let cleaned = dateStr.trim();
    const marathiDigits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
    for (let i = 0; i < 10; i++) {
      cleaned = cleaned.replaceAll(marathiDigits[i], String(i));
    }
    let m = cleaned.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (m) return parseInt(m[3], 10);
    m = cleaned.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (m) return parseInt(m[1], 10);
    m = cleaned.match(/^(\d{1,2})[\/\-\.\s]+/);
    if (m) return parseInt(m[1], 10);
    return 0;
  };

  const pagesToDisplay = useMemo(() => {
    const sourcePages = (structuredPages && structuredPages.length > 0)
      ? structuredPages
      : (savedRecord?.structuredData && Array.isArray(savedRecord.structuredData) && savedRecord.structuredData.length > 0)
        ? savedRecord.structuredData
        : [];

    if (!sourcePages || sourcePages.length === 0) return [];

    let filtered = sourcePages;

    // Filter by week range if savedRecord specifies a week/range (e.g. 1 to 10, 11 to 20)
    const weekStr = savedRecord?.week || savedRecord?.selectedWeek || "";
    if (weekStr) {
      if (weekStr.includes("1 to 10") || weekStr === "Week 1") {
        filtered = filtered.filter((p: any) => {
          const dayNum = getDayOfMonthNumber(p.date || p.displayDate);
          return dayNum === 0 || (dayNum >= 1 && dayNum <= 10);
        });
      } else if (weekStr.includes("11 to 20") || weekStr === "Week 2") {
        filtered = filtered.filter((p: any) => {
          const dayNum = getDayOfMonthNumber(p.date || p.displayDate);
          return dayNum === 0 || (dayNum >= 11 && dayNum <= 20);
        });
      } else if (weekStr.includes("21 to 31") || weekStr.includes("21 to 30") || weekStr === "Week 3" || weekStr === "Week 4" || weekStr === "Week 5") {
        filtered = filtered.filter((p: any) => {
          const dayNum = getDayOfMonthNumber(p.date || p.displayDate);
          return dayNum === 0 || dayNum >= 21;
        });
      }
    }

    if (selectedMonth) {
      filtered = filtered.filter((p: any) => {
        const d = p.date || (p as any).displayDate || "";
        if (!d) return true;
        const clean = String(d).trim();
        let m = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
        if (m) return String(m[2]).padStart(2, "0") === selectedMonth;
        m = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
        if (m) return String(m[2]).padStart(2, "0") === selectedMonth;
        return true;
      });
    }

    // Filter down to single date if selectedDateIso is provided
    if (selectedDateIso) {
      const targetDayNum = getDayOfMonthNumber(selectedDateIso);

      // 1. Exact ISO match
      const exactMatch = filtered.filter((p: any) => {
        const pIso = formatDateToIso(p.date || p.displayDate);
        return pIso && pIso === selectedDateIso;
      });
      if (exactMatch.length > 0) return exactMatch;

      // 2. Day number match
      if (targetDayNum > 0) {
        const dayMatch = filtered.filter((p: any) => {
          const pDayNum = getDayOfMonthNumber(p.date || p.displayDate);
          return pDayNum === targetDayNum;
        });
        if (dayMatch.length > 0) return dayMatch;
      }

      // 3. Fallback match by index in filtered range
      const parts = selectedDateIso.split("-");
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        let startDay = 1;
        if (d >= 21) startDay = 21;
        else if (d >= 11) startDay = 11;

        // Direct 1-to-1 day offset index matching (Day 1 -> idx 0, Day 2 -> idx 1, Day 3 -> idx 2, etc.)
        const directIdx = d - startDay;
        if (directIdx >= 0 && directIdx < filtered.length) {
          return [filtered[directIdx]];
        }

        const idx = calculateRangeWorkingDayIndex(y, m, d, startDay);
        if (idx >= 0 && idx < filtered.length) {
          return [filtered[idx]];
        }
      }
    }

    return filtered.map((p: any) => {
      const h = findHolidayForDate(
        customHolidays,
        p?.date || p?.displayDate,
        savedRecord?.className || p?.std,
        savedRecord?.medium
      );
      if (h) {
        return {
          ...p,
          isHoliday: true,
          holidayReason: h.reason,
        };
      }
      return p;
    });
  }, [structuredPages, savedRecord?.structuredData, savedRecord?.className, savedRecord?.medium, selectedMonth, savedRecord?.week, savedRecord?.selectedWeek, selectedDateIso, customHolidays]);

  const hasStructuredView = pagesToDisplay && pagesToDisplay.length > 0;
  const downloadUrl = savedRecord?.pageUrl || (selectedFile ? localPdfBlobUrl : null);

  const handleDownloadWord = async () => {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const currentEdited = structuredListRef.current?.getEditedData();
    const pagesToUse = (currentEdited && currentEdited.length > 0)
      ? currentEdited
      : (structuredPages && structuredPages.length > 0)
        ? structuredPages
        : (savedRecord as any)?.structuredData || pagesToDisplay;
    const profile = schoolProfile || getStoredSchoolProfile();
    const cleanText = (txt: any) => {
      if (!txt || txt === "-") return "-";
      return String(txt)
        .replace(/[\uFFFD]/g, "")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
    };

    if (pagesToUse && pagesToUse.length > 0) {
      setIsInnerDownloading(true);
      toast.success("Word दस्तऐवज डाउनलोड तयार होत आहे... (Generating Word file...)");
      try {
        const defaultHeaders = [
          "तासिका/ विषय",
          "पाठ / घटक",
          "अध्ययन मुद्दा",
          "अध्ययन निष्पत्ती",
          "अध्ययन अनुभवाचे स्वरूप",
          "साधन तंत्रे",
          "शैक्षणिक साहित्य"
        ];
        const dayBlocks = pagesToUse.map((p: any, idx: number) => {
          const rows = (p.periods || []).map((row: any, rIdx: number) => `
            <tr style="background:${rIdx % 2 === 0 ? "#ffffff" : "#f8fafc"};">
              <td style="text-align:center;font-weight:bold;color:#0f172a;width:11%;border:1.5pt solid #475569;padding:6px 3px;"><div style="color:#ea580c;font-weight:bold;margin-bottom:2px;">${cleanText(row.period)}</div><div>${cleanText(row.subject) || "-"}</div></td>
              <td style="font-weight:bold;border:1.5pt solid #94a3b8;width:15%;padding:6px 4px;">${cleanText(row.topic)}</td>
              <td style="border:1.5pt solid #94a3b8;width:15%;padding:6px 4px;">${cleanText(row.subtopic || "-")}</td>
              <td style="border:1.5pt solid #94a3b8;width:23%;padding:6px 6px;">${cleanText(row.outcome)}</td>
              <td style="border:1.5pt solid #94a3b8;width:22%;padding:6px 6px;">${cleanText(row.experience)}</td>
              <td style="border:1.5pt solid #94a3b8;width:7%;padding:6px 3px;">${cleanText(row.tools)}</td>
              <td style="border:1.5pt solid #94a3b8;width:7%;padding:6px 3px;">${cleanText(row.materials)}</td>
            </tr>`).join("");

          const headers = defaultHeaders
            .map((h: string) => `<th style="background-color:#e2e8f0;color:#0f172a;padding:10px;text-align:center;font-weight:bold;border:1.5pt solid #475569;">${cleanText(h)}</th>`).join("");

          const dayVal = cleanText(toMarathiDayName(p.day, p.date));
          const teacherVal = cleanText(toMarathiDigits(p.teacher && p.teacher !== "-" ? p.teacher : (profile?.teacherName || "-")));
          const schoolVal = cleanText(toMarathiDigits(p.school && p.school !== "-" ? p.school : (profile?.schoolName || "-")));
          const stdVal = cleanText(toMarathiClassName(p.std && p.std !== "-" && p.std !== "पहिली" ? p.std : (profile?.className || p.std || "-")));
          const yearVal = cleanText(toMarathiDigits(p.year && p.year !== "-" ? p.year : (profile?.academicYear || "2026-27")));

          return `
            <div style="margin-bottom: 25px; page-break-after: always;">
              <h2 style="font-size: 20px; font-weight: 900; text-align: center; color: #0f172a; margin-bottom: 10px;">दैनंदिन पाठ टाचण</h2>
              <table style="width:100%; border-collapse:collapse; margin-bottom:15px; background:#f1f5f9; border:2pt solid #475569; font-size:11px;">
                <tr>
                  <td style="padding:6px 10px; border:1.5pt solid #64748b;"><b>दिनांक:</b> <span style="color:#0f172a;">${cleanText(formatMarathiDate(p.date))}</span></td>
                  <td style="padding:6px 10px; border:1.5pt solid #64748b;"><b>वार:</b> ${dayVal}</td>
                  <td style="padding:6px 10px; border:1.5pt solid #64748b;"><b>वर्गशिक्षक:</b> ${teacherVal}</td>
                </tr>
                <tr>
                  <td style="padding:6px 10px; border:1.5pt solid #64748b;"><b>शाळा:</b> ${schoolVal}</td>
                  <td style="padding:6px 10px; border:1.5pt solid #64748b;"><b>इयत्ता:</b> ${stdVal}</td>
                  <td style="padding:6px 10px; border:1.5pt solid #64748b;"><b>सन:</b> ${yearVal}</td>
                </tr>
              </table>
              ${p.thought ? `<div style="font-size:11px; font-style:italic; color:#78350f; background:#fffbeb; border-left:4px solid #f59e0b; padding:8px 12px; margin-bottom:12px;">💬 <b style="font-weight:900;">आजचा सुविचार :</b> <b style="font-weight:900;">'${cleanText(p.thought)}'</b></div>` : ""}
              <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 15px;">
                <thead>
                  <tr>${headers}</tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
              <div style="border-top:1.5pt solid #cbd5e1; padding-top:15px; margin-top:10px;">
                <p style="font-weight:bold; font-size:11px; margin-bottom:6px;">दिवसभरातील वैशिष्टपूर्ण बाबी:</p>
                <p style="color:#cbd5e1;">________________________________________________________________________________________</p>
                <br/>
                <table style="width:100%; border:none; font-weight:bold; font-size:12px; margin-top:20px;">
                  <tr>
                    <td style="border:none; text-align:left;">वर्गशिक्षक स्वाक्षरी</td>
                    <td style="border:none; text-align:right;">मुख्याध्यापक स्वाक्षरी</td>
                  </tr>
                </table>
              </div>
            </div>`;
        }).join("");

        const wordHTML = `<!DOCTYPE html>
          <html xmlns:o='urn:schemas-microsoft-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <meta charset="utf-8" />
            <title>Teaching Diary</title>
            <!--[if gte mso 9]>
            <xml>
              <w:WordDocument>
                <w:View>Print</w:View>
                <w:Zoom>100</w:Zoom>
                <w:DoNotOptimizeForBrowser/>
              </w:WordDocument>
            </xml>
            <![endif]-->
            <style>
              body { font-family: Arial, 'Calibri', 'Segoe UI', 'Nirmala UI', 'Mangal', 'Arial Unicode MS', sans-serif; padding: 20px; color: #1e293b; }
              table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11pt; }
              th { background-color: #1e293b; color: #ffffff; padding: 8px 10px; text-align: left; font-weight: bold; border: 1.5pt solid #475569; }
              td { padding: 8px 10px; border: 1.5pt solid #94a3b8; vertical-align: top; font-size: 10pt; line-height: 1.4; }
            </style>
          </head>
          <body>
            ${dayBlocks}
          </body>
          </html>
        `;

        const blob = new Blob(['\ufeff', wordHTML], { type: 'application/msword;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        const rawBase = activeFileName.replace(/\.[^/.]+$/, "") || "Teaching_Diary";
        const baseName = rawBase.endsWith(".doc") || rawBase.endsWith(".docx") ? rawBase : `${rawBase}.doc`;

        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = baseName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        toast.success(`✅ "${baseName}" वर्ड फाईल डाउनलोड झाली!`);
      } catch (err) {
        console.error("Word generation error:", err);
        toast.error("Word फाइल डाउनलोड करताना अडचण आली.");
      } finally {
        setIsInnerDownloading(false);
      }
      return;
    }

    // 2. Fallback: If downloading original file from server URL
    if (!downloadUrl) return;
    setIsInnerDownloading(true);
    try {
      let blob: Blob | null = null;
      try {
        const directRes = await fetch(downloadUrl);
        if (directRes.ok) {
          const b = await directRes.blob();
          if (!b.type.includes("text/html")) blob = b;
        }
      } catch { }

      if (!blob) {
        const proxyUrl = getBunnyStorageUrl(downloadUrl);
        const headers: Record<string, string> = {};
        if (import.meta.env.DEV) {
          headers["AccessKey"] = import.meta.env.VITE_BUNNY_STORAGE_API_KEY || "";
        }
        const res = await fetch(proxyUrl, { headers });
        if (res.ok) blob = await res.blob();
      }

      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = activeFileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        toast.success(`✅ "${activeFileName}" फाईल डाउनलोड झाली!`);
      } else {
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = activeFileName;
        a.target = "_self";
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success(`✅ "${activeFileName}" फाईल डाउनलोड झाली!`);
      }
    } catch (err: any) {
      toast.error("फाइल डाउनलोड करताना अडचण आली.");
    } finally {
      setIsInnerDownloading(false);
    }
  };

  const handleLocalDownloadPdf = async () => {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const currentEdited = structuredListRef.current?.getEditedData();
    const pagesToUse = (currentEdited && currentEdited.length > 0)
      ? currentEdited
      : (structuredPages && structuredPages.length > 0)
        ? structuredPages
        : (savedRecord as any)?.structuredData || pagesToDisplay;
    if (!pagesToUse || pagesToUse.length === 0) {
      return handleDownloadWord();
    }

    const profile = schoolProfile || getStoredSchoolProfile();

    setIsGeneratingPdf(true);
    toast.success("PDF डाउनलोड तयार होत आहे... (Generating PDF...)");

    try {
      const html2pdfModule = await import("html2pdf.js");
      let html2pdfFn: any = html2pdfModule.default || html2pdfModule;
      if (html2pdfFn && html2pdfFn.default) html2pdfFn = html2pdfFn.default;
      if (typeof html2pdfFn !== "function" && typeof window !== "undefined" && typeof (window as any).html2pdf === "function") {
        html2pdfFn = (window as any).html2pdf;
      }

      const isSundayDate = (dayName: string, dateStr: string) => {
        return isSunday(dayName, dateStr);
      };

      const defaultHeaders = [
        "तासिका/ विषय",
        "पाठ / घटक",
        "अध्ययन मुद्दा",
        "अध्ययन निष्पत्ती",
        "अध्ययन अनुभवाचे स्वरूप",
        "साधन तंत्रे",
        "शैक्षणिक साहित्य"
      ];

      const validPages = pagesToUse.filter((p: any) => {
        if (!p) return false;
        if (p.isSunday || p.isHoliday) return false;
        if (
          findHolidayForDate(
            customHolidays,
            p.date || p.displayDate,
            savedRecord?.className || p.std,
            savedRecord?.medium
          )
        ) {
          return false;
        }
        if (isSundayDate(p.day, p.date)) return false;
        const validPeriods = (p.periods || []).filter((r: any) => 
          r && (r.subject || r.topic || r.outcome || r.experience || r.period)
        );
        return validPeriods.length > 0;
      });

      const colWidths = ["8%", "9%", "13%", "33%", "19%", "9%", "9%"];

      const isDash = (v: any) => {
        const s = String(v ?? "").trim();
        return !s || s === "-" || s === "--" || s === "—";
      };

      const dayBlocks = validPages.map((p: any, idx: number) => {
        const rows = (p.periods || []).map((row: any, rIdx: number) => `
          <tr style="background:${rIdx % 2 === 0 ? "#ffffff" : "#f8fafc"};">
            <td style="box-sizing:border-box;text-align:center;font-weight:900;color:#000000;width:${colWidths[0]};font-size:11.5px;padding:4px 3px;border:1.5px solid #334155;vertical-align:middle;line-height:1.26;word-wrap:break-word;overflow-wrap:break-word;word-break:break-word;white-space:normal;">
              <div style="color:#000000;font-weight:900;line-height:1.2;margin-bottom:2px;">${row.period}</div>
              <div style="color:#000000;font-weight:900;line-height:1.2;">${row.subject || "-"}</div>
            </td>
            <td style="box-sizing:border-box;text-align:${isDash(row.topic) ? "center" : "left"};font-weight:800;color:#000000;width:${colWidths[1]};font-size:11.5px;padding:4px 4px;border:1.5px solid #334155;vertical-align:middle;line-height:1.26;word-wrap:break-word;overflow-wrap:break-word;word-break:break-word;white-space:normal;">${row.topic || "-"}</td>
            <td style="box-sizing:border-box;text-align:${isDash(row.subtopic) ? "center" : "left"};font-weight:800;color:#000000;width:${colWidths[2]};font-size:11.5px;padding:4px 4px;border:1.5px solid #334155;vertical-align:middle;line-height:1.26;word-wrap:break-word;overflow-wrap:break-word;word-break:break-word;white-space:normal;">${row.subtopic || "-"}</td>
            <td style="box-sizing:border-box;text-align:${isDash(row.outcome) ? "center" : "left"};color:#000000;font-weight:800;width:${colWidths[3]};font-size:11.5px;padding:4px 5px;border:1.5px solid #334155;vertical-align:middle;line-height:1.26;word-wrap:break-word;overflow-wrap:break-word;word-break:break-word;white-space:normal;">${row.outcome || "-"}</td>
            <td style="box-sizing:border-box;text-align:${isDash(row.experience) ? "center" : "left"};color:#000000;font-weight:700;width:${colWidths[4]};font-size:11.5px;padding:4px 5px;border:1.5px solid #334155;vertical-align:middle;line-height:1.26;word-wrap:break-word;overflow-wrap:break-word;word-break:break-word;white-space:normal;">${row.experience || "-"}</td>
            <td style="box-sizing:border-box;text-align:center;color:#000000;font-weight:700;width:${colWidths[5]};font-size:11px;padding:4px 3px;border:1.5px solid #334155;vertical-align:middle;line-height:1.26;word-wrap:break-word;overflow-wrap:break-word;word-break:break-word;white-space:normal;">${row.tools || "-"}</td>
            <td style="box-sizing:border-box;text-align:center;color:#000000;font-weight:700;width:${colWidths[6]};font-size:11px;padding:4px 3px;border:1.5px solid #334155;vertical-align:middle;line-height:1.26;word-wrap:break-word;overflow-wrap:break-word;word-break:break-word;white-space:normal;">${row.materials || "-"}</td>
          </tr>`).join("");

        const headers = defaultHeaders
          .map((h: string, hIdx: number) => {
            return `<th style="box-sizing:border-box;width:${colWidths[hIdx] || "auto"};background-color:#e2e8f0 !important;color:#0f172a !important;padding:6px 3px;text-align:center;font-size:12px;font-weight:700;border:1.5px solid #475569;line-height:1.22;word-wrap:break-word;overflow-wrap:break-word;white-space:normal;">${h}</th>`;
          }).join("");

        const dayVal = toMarathiDayName(p.day, p.date);
        const teacherVal = toMarathiDigits(p.teacher && p.teacher !== "-" ? p.teacher : (profile?.teacherName || "-"));
        const schoolVal = toMarathiDigits(p.school && p.school !== "-" ? p.school : (profile?.schoolName || "-"));
        const stdVal = toMarathiClassName(p.std && p.std !== "-" && p.std !== "पहिली" ? p.std : (profile?.className || p.std || "-"));
        const yearVal = toMarathiDigits(p.year && p.year !== "-" ? p.year : (profile?.academicYear || "2026-27"));

        return `
          <div class="pdf-day-page ${idx > 0 ? "html2pdf-page-break" : ""}" style="width: 794px; height: 1116px; box-sizing: border-box; padding: 36px 20px; background: #ffffff; overflow: hidden; position: relative;">
            <div class="pdf-day-inner" style="width: 754px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; min-height: 1040px;">
              <div>
                <div style="text-align: center; margin-bottom: 6px;">
                  <h2 style="font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px; margin: 0;">दैनंदिन पाठ टाचण</h2>
                </div>
                <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #334155; border-radius: 6px; margin-bottom: 6px; background: #ffffff;">
                  <tr>
                    <td style="width: 33.33%; padding: 4px 8px; border-bottom: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; vertical-align: middle; text-align: center;">
                      <div style="font-size: 11.5px; font-weight: 900; color: #1e293b;">दिनांक</div>
                      <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 1px;">${formatMarathiDate(p.date)}</div>
                    </td>
                    <td style="width: 33.33%; padding: 4px 8px; border-bottom: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; vertical-align: middle; text-align: center;">
                      <div style="font-size: 11.5px; font-weight: 900; color: #1e293b;">वार</div>
                      <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 1px;">${dayVal}</div>
                    </td>
                    <td style="width: 33.33%; padding: 4px 8px; border-bottom: 1px solid #cbd5e1; vertical-align: middle; text-align: center;">
                      <div style="font-size: 11.5px; font-weight: 900; color: #1e293b;">वर्गशिक्षक</div>
                      <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 1px;">${teacherVal}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="width: 33.33%; padding: 4px 8px; border-right: 1px solid #cbd5e1; vertical-align: middle; text-align: center;">
                      <div style="font-size: 11.5px; font-weight: 900; color: #1e293b;">शाळा</div>
                      <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 1px;">${schoolVal}</div>
                    </td>
                    <td style="width: 33.33%; padding: 4px 8px; border-right: 1px solid #cbd5e1; vertical-align: middle; text-align: center;">
                      <div style="font-size: 11.5px; font-weight: 900; color: #1e293b;">इयत्ता</div>
                      <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 1px;">${stdVal}</div>
                    </td>
                    <td style="width: 33.33%; padding: 4px 8px; vertical-align: middle; text-align: center;">
                      <div style="font-size: 11.5px; font-weight: 900; color: #1e293b;">सन</div>
                      <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 1px;">${yearVal}</div>
                    </td>
                  </tr>
                </table>
                ${p.thought ? `<div style="background: #fffbeb; border: 1.5px solid #fcd34d; border-radius: 6px; padding: 4px 8px; margin-bottom: 6px; font-size: 12px; color: #000000; text-align: center;"><strong style="font-weight: 900; color: #000000;">आजचा सुविचार :</strong> <strong style="font-weight: 900; color: #000000;">"${p.thought}"</strong></div>` : ""}
                <table class="main-diary-table" style="width: 100%; border-collapse: collapse; table-layout: fixed; border: 1.5px solid #475569; margin-bottom: 6px; background: #ffffff;">
                  <thead>
                    <tr>
                      ${headers}
                    </tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>
              <div style="margin-top: 6px; shrink-0;">
                ${(() => {
                  let rawRemarks = (p.specialRemarks || "").trim();
                  if (!rawRemarks && p.date) {
                    try {
                      rawRemarks = (localStorage.getItem(`special_remarks_${p.date}`) || "").trim();
                    } catch {}
                  }
                  if (!rawRemarks) {
                    return `<div style="display: flex; align-items: flex-end; gap: 6px; margin-bottom: 4px;">
                      <span style="font-size: 11px; font-weight: 900; color: #0f172a; white-space: nowrap; line-height: 1.2;">दिवसभरातील वैशिष्टपूर्ण बाबी:</span>
                      <div style="flex: 1; border-bottom: 1px dashed #cbd5e1; height: 12px;"></div>
                    </div>
                    <div style="border-bottom: 1px dashed #cbd5e1; height: 14px; margin-bottom: 2px;"></div>`;
                  }
                  const safeRemarks = rawRemarks
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");
                  return `<div style="font-size: 11.5px; line-height: 1.45; color: #0f172a; margin-bottom: 4px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px; word-break: break-word; white-space: pre-wrap;">
                    <span style="font-weight: 900; margin-right: 6px;">दिवसभरातील वैशिष्टपूर्ण बाबी:</span><span style="font-weight: 700;">${safeRemarks}</span>
                  </div>`;
                })()}
                <table style="width: 100%; border: none; margin-top: 12px; background: transparent;">
                  <tr>
                    <td style="text-align: left; font-size: 12px; font-weight: 900; color: #0f172a; border: none; padding: 0 6px;">वर्गशिक्षक स्वाक्षरी</td>
                    <td style="text-align: right; font-size: 12px; font-weight: 900; color: #0f172a; border: none; padding: 0 6px;">मुख्याध्यापक स्वाक्षरी</td>
                  </tr>
                </table>
              </div>
            </div>
          </div>`;
      }).join("");

      const wrapper = document.createElement("div");
      wrapper.style.position = "fixed";
      wrapper.style.top = "0";
      wrapper.style.left = "-9999px";
      wrapper.style.width = "794px";
      wrapper.style.backgroundColor = "#ffffff";
      wrapper.style.overflow = "hidden";

      const container = document.createElement("div");
      container.style.width = "794px";
      container.style.boxSizing = "border-box";
      container.style.backgroundColor = "#ffffff";
      container.style.color = "#0f172a";
      container.style.fontFamily = "'Noto Sans Devanagari', sans-serif";
      container.innerHTML = dayBlocks;

      wrapper.appendChild(container);
      document.body.appendChild(wrapper);

      // Auto-fit & vertically fill every single day page onto 1 A4 page with safe print gaps
      const dayPages = container.querySelectorAll<HTMLElement>(".pdf-day-page");
      dayPages.forEach((pageEl) => {
        fitPdfDayPageToA4(pageEl, 754, 1040);
      });

      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
        } catch {}
      }

      const baseName = activeFileName.replace(/\.[^/.]+$/, "") || "Teaching_Diary";
      
      const opt = {
        margin:       [0, 0, 0, 0],
        filename:     `${baseName}.pdf`,
        image:        { type: 'png', quality: 1.0 },
        html2canvas:  { scale: 3, useCORS: true, logging: false, backgroundColor: '#ffffff', windowWidth: 794 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
        pagebreak:    { mode: 'css', before: '.html2pdf-page-break' }
      };

      await html2pdfFn().set(opt).from(container).save();
      if (document.body.contains(wrapper)) document.body.removeChild(wrapper);
      toast.success(`✅ "${baseName}.pdf" डाउनलोड झाली!`);
    } catch (err) {
      console.error("Local PDF generation error:", err);
      toast.error("PDF डाउनलोड करताना अडचण आली.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleBackNavigation = () => {
    if (onBack) {
      onBack();
    } else if (window.history.length > 1) {
      window.history.back();
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col h-full min-h-[500px]">
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleBackNavigation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all shadow-sm cursor-pointer border border-slate-700 shrink-0"
            title="मागे जा (Back)"
          >
            <ArrowLeft className="size-4 text-indigo-400" />
            <span>मागे जा (Back)</span>
          </button>
          <div className="size-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-md">
            <FileText className="size-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate text-slate-100">{activeFileName}</p>
            <p className="text-[10px] text-slate-400">
              {selectedFile ? "Local File Selected" : savedRecord?.diaryDate ? `Saved Record (${savedRecord.diaryDate})` : "Live Preview"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">


          {/* Single PDF View Mode Badge (Dual options removed as requested) */}
          <div className="flex items-center bg-indigo-600 px-3 py-1.5 rounded-xl text-white text-xs font-bold gap-1.5 shadow-sm">
            <Eye className="size-3.5" /> PDF प्रिव्ह्यू
          </div>

          {(downloadUrl || hasStructuredView) && (
            <div className="flex items-center gap-2">


              {hasStructuredView && (
                <button
                  onClick={handleLocalDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                >
                  {isGeneratingPdf ? (
                    <><Loader2 className="size-3.5 animate-spin" /> Generating PDF...</>
                  ) : (
                    <><Download className="size-3.5" /> Download to PDF</>
                  )}
                </button>
              )}

              {viewMode === "structured" && savedRecord && (
                <button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                >
                  {isSaving ? (
                    <><Loader2 className="size-3.5 animate-spin" /> Saving...</>
                  ) : (
                    <><FileCheck className="size-3.5" /> Save Changes</>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 w-full bg-slate-50 overflow-y-auto overflow-x-hidden relative p-1 sm:p-3">
        {loadingContent || loadingPdf ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
            <Loader2 className="size-8 animate-spin text-indigo-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Loading document preview...
            </span>
          </div>
        ) : (isPdf || pdfUrlToDisplay) && pdfUrlToDisplay && isRecordMatchingMonth ? (
          <div className="w-full h-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner flex flex-col relative">
            <iframe
              src={pdfUrlToDisplay.includes("#") ? pdfUrlToDisplay : `${pdfUrlToDisplay}#view=FitH`}
              title="PDF Document Live Preview"
              className="w-full h-full border-none rounded-2xl bg-white"
            />
          </div>
        ) : viewMode === "structured" && pagesToDisplay.length > 0 ? (
          <div className="w-full">
            <StructuredDayPageList ref={structuredListRef} pages={pagesToDisplay} schoolProfile={schoolProfile} defaultBaseDate={effectiveBaseDate} />
          </div>
        ) : htmlContent ? (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm max-w-3xl mx-auto prose prose-slate text-sm font-sans leading-relaxed text-slate-800">
            <div className="mb-4 pb-3 border-b border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold text-indigo-600 uppercase tracking-wider">Word Document Content Preview</span>
              <span>{activeFileName}</span>
            </div>
            <div 
              dangerouslySetInnerHTML={{ __html: htmlContent }} 
              className="word-content-wrapper space-y-3"
            />
          </div>
        ) : excelPreviewData && excelPreviewData.length > 0 ? (
          /* EXCEL / CSV PREVIEW TABLE */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700 font-bold">
              <span className="flex items-center gap-1.5 text-indigo-600">
                <TableIcon className="size-4" />
                Yearly Excel / CSV Data Rows ({excelPreviewData.length} previewed)
              </span>
              <span className="text-[10px] text-slate-400">Auto-parsed Date Columns</span>
            </div>
            <div className="overflow-x-auto max-h-[520px]">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-900 font-black border-b border-slate-200 sticky top-0">
                  <tr>
                    {Object.keys(excelPreviewData[0]).slice(0, 8).map((colKey, i) => (
                      <th key={i} className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap bg-slate-100">
                        {colKey}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {excelPreviewData.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-indigo-50/40">
                      {Object.keys(excelPreviewData[0]).slice(0, 8).map((colKey, cIdx) => (
                        <td key={cIdx} className="py-2 px-3 border-r border-slate-100 whitespace-nowrap text-slate-800">
                          {String(row[colKey] || "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : isPdf && pdfUrlToDisplay && isRecordMatchingMonth ? (
          /* PDF IFRAME FALLBACK */
          <iframe
            src={pdfUrlToDisplay.includes("#") ? pdfUrlToDisplay : `${pdfUrlToDisplay}#view=FitH`}
            title="Document Live Preview"
            className="w-full h-full border-none rounded-2xl bg-white"
          />
        ) : (activeExt === "doc" || activeExt === "docx") && isRecordMatchingMonth ? (
          /* WORD DOCUMENT LIVE PREVIEW CARD */
          <div className="w-full h-full rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-purple-50/30 to-slate-50 flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="size-20 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <FileText className="size-10" />
            </div>
            <div className="space-y-2 max-w-sm">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-black uppercase tracking-wider">
                Word Document ({(activeExt || "DOC").toUpperCase()})
              </span>
              <h3 className="text-base font-black text-slate-900 break-all">{activeFileName}</h3>
              {savedRecord && (
                <p className="text-xs font-bold text-slate-500">
                  Target Date: <span className="text-indigo-600">{savedRecord.diaryDate}</span> • Class: {savedRecord.className} ({savedRecord.medium})
                </p>
              )}
              {downloadUrl && (
                <div className="pt-3">
                  <button
                    onClick={handleDownloadWord}
                    disabled={isInnerDownloading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
                  >
                    {isInnerDownloading ? (
                      <><Loader2 className="size-4 animate-spin" /> Downloading...</>
                    ) : (
                      <><Download className="size-4" /> Download / Open Word File</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* EMPTY STATE */
          <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4 my-auto">
            <div className="size-16 rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shadow-sm">
              <AlertCircle className="size-8" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h3 className="text-lg font-black text-slate-900">
                या महिन्यात कोणतीही टाचण नोंद उपलब्ध नाही
              </h3>
              <p className="text-xs font-bold text-slate-500">
                (No Teaching Diary Found for Selected Month)
              </p>
              <p className="text-xs text-slate-400">
                तुम्ही या महिन्यासाठी कोणतीही टाचण नोंद अथवा फाईल अपलोड केलेली नाही. दुसरं महिना निवडा किंवा टाचण अपलोड करा.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
