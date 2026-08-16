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
import { doc, updateDoc, setDoc } from "firebase/firestore";

export const formatCleanDate = (raw: string | undefined | null) => {
  if (!raw) return "-";
  const cleaned = raw.trim();
  let m = cleaned.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (m) {
    const year = m[1];
    const month = parseInt(m[2], 10);
    const day = parseInt(m[3], 10);
    return `${day}/${month}/${year}`;
  }
  m = cleaned.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    let year = m[3];
    if (year.length === 2) year = `20${year}`;
    return `${day}/${month}/${year}`;
  }
  return cleaned;
};

const normalizeDateStr = (raw: string | undefined | null) => {
  return formatCleanDate(raw);
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

export function extractDateFromText(text: string): string {
  if (!text) return "";
  // Match dates like "दिनांक: 01/08/2026" or "दिनांक 01-08-2026" or "Date: 2026-08-01"
  const matchWithKeyword = text.match(/(?:दिनांक|तारीख|Date)\s*[:：\-]?\s*(\d{1,4}\s*[\/\-\.]\s*\d{1,2}\s*[\/\-\.]\s*\d{1,4})/i);
  if (matchWithKeyword) {
    return matchWithKeyword[1].replace(/\s+/g, "");
  }
  // Standalone date pattern: DD/MM/YYYY or YYYY-MM-DD
  const standaloneMatch = text.match(/\b(\d{1,2}\s*[\/\-\.]\s*\d{1,2}\s*[\/\-\.]\s*\d{2,4})\b/);
  if (standaloneMatch) {
    return standaloneMatch[1].replace(/\s+/g, "");
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
    const cleaned = dateStr.trim();
    const parts = cleaned.split(/[\/\-\.]/);
    if (parts.length === 3) {
      let d = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10) - 1;
      let y = parseInt(parts[2], 10);

      // Handle YYYY-MM-DD format vs DD-MM-YYYY
      if (parts[0].length === 4) {
        y = parseInt(parts[0], 10);
        d = parseInt(parts[2], 10);
      }

      const dateObj = new Date(y < 100 ? y + 2000 : y, m, d);
      if (!isNaN(dateObj.getTime()) && dateObj.getDay() === 0) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Enhanced multi-page Marathi Teacher Diary Text Parser
 */
export function parseMultiPageTextToStructuredDiaries(fullText: string): StructuredDayPage[] {
  if (!fullText || fullText.trim().length === 0) return [];

  const pageChunks = fullText
    .split(/(?=(?:दैनंदिन पाठ टाचण|दैनिक पाठ टाचण|दिनांक\s*[:：]?\s*\d{1,2}\s*[\/\-\.]\s*\d{1,2}))/gi)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 20);

  const finalChunks = pageChunks.length > 0 ? pageChunks : [fullText];

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
    const thoughtMatch = chunkText.match(/(?:आजचा\s*विचार|आजचा\s*सुविचार|सुविचार|िचार|विचार|Thought)\s*[:：]?\s*([^\n]+)/i);
    if (thoughtMatch) {
      thought = thoughtMatch[1]
        .replace(/^[:\s\u0903-]+/, "")
        .replace(/\s*(?:इयत्ता|Class|Std|सन|Year).*$/i, "")
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

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");

  // Walk through body children and group into day sections
  // Each section: text elements (paragraphs) before a table + the table
  const bodyChildren = Array.from(doc.body.children);
  const daySections: { textElements: Element[]; table: HTMLTableElement }[] = [];
  let currentTextElements: Element[] = [];

  for (const child of bodyChildren) {
    if (child.tagName === "TABLE") {
      daySections.push({
        textElements: [...currentTextElements],
        table: child as HTMLTableElement,
      });
      currentTextElements = [];
    } else {
      currentTextElements.push(child);
    }
  }

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
      /(?:आजचा\s*सुव\u200Dिचार|आजचा\s*(?:सु)?विचार|सुविचार|Thought)\s*[:：]?\s*([^\n]+)/i
    );
    if (thoughtMatch) {
      thought = thoughtMatch[1]
        .replace(/^[:\s]+/, "")
        .replace(/\s*(?:इयत्त्?ता|Class|Std|सन|Year).*$/i, "")
        .trim();
    }

    return { date, day, std, year, teacher, school, thought };
  }

  // Helper: extract periods and column headers from a table
  function extractPeriodsFromTable(table: HTMLTableElement): { periods: PeriodRowItem[]; columnHeaders: string[] } {
    const rows = table.querySelectorAll("tr");
    if (rows.length < 2) return { periods: [], columnHeaders: [] };

    // Find the header row (contains column titles like तासिका, विषय, etc.)
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 4); i++) {
      const rowText = rows[i].textContent?.trim() || "";
      if (
        rowText.includes("तासिका") ||
        rowText.includes("विषय") ||
        rowText.includes("अध्ययन")
      ) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx === -1) {
      const firstRowCells = rows[0].querySelectorAll("td, th");
      if (firstRowCells.length >= 5) {
        headerRowIdx = 0;
      } else {
        return { periods: [], columnHeaders: [] };
      }
    }

    // Extract actual column header labels from the header row
    const headerCells = rows[headerRowIdx].querySelectorAll("td, th");
    const columnHeaders = Array.from(headerCells).map(
      (cell) => (cell.textContent || "").trim()
    );

    let colMap = { period: 0, subject: 1, topic: 2, outcome: 3, experience: 4, tools: 5, materials: 6 };

    if (columnHeaders.length > 0) {
      const normHeaders = columnHeaders.map(h => h.trim().toLowerCase());
      const findCol = (pattern: RegExp) => normHeaders.findIndex(h => pattern.test(h));

      const pIdx = findCol(/तास|तासिका|period|time/i);
      const sIdx = findCol(/विषय|subject/i);
      const tIdx = findCol(/मुद्दा|पाठ्यांश|पाठ्यघटक|घटक|पाठ|topic|chapter/i);
      const oIdx = findCol(/निष्पत्ती|निष्पती|दर्शक|दर्शके|outcome|result/i);
      const eIdx = findCol(/अनुभव|अनुभवाचे|स्वरूप|कृती|experience/i);
      const tlIdx = findCol(/साधन|तंत्र|tools|method/i);
      const mIdx = findCol(/साहित्य|materials/i);

      if (pIdx !== -1) colMap.period = pIdx;
      if (sIdx !== -1) colMap.subject = sIdx;
      if (tIdx !== -1) colMap.topic = tIdx;
      if (oIdx !== -1) colMap.outcome = oIdx;
      if (eIdx !== -1) colMap.experience = eIdx;
      if (tlIdx !== -1) colMap.tools = tlIdx;
      if (mIdx !== -1) colMap.materials = mIdx;
    }

    const periods: PeriodRowItem[] = [];
    let periodCounter = 1;

    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll("td, th");
      if (cells.length < 2) continue;

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

      const period = (colMap.period < cellTexts.length && cellTexts[colMap.period]) ? cellTexts[colMap.period] : cellTexts[0] || String(periodCounter);
      const subject = (colMap.subject < cellTexts.length && cellTexts[colMap.subject]) ? cellTexts[colMap.subject] : cellTexts[1] || "";
      const topic = (colMap.topic < cellTexts.length && cellTexts[colMap.topic]) ? cellTexts[colMap.topic] : cellTexts[2] || "";
      const outcome = (colMap.outcome < cellTexts.length && cellTexts[colMap.outcome]) ? cellTexts[colMap.outcome] : (cellTexts.length >= 4 ? cellTexts[3] : "");
      const experience = (colMap.experience < cellTexts.length && cellTexts[colMap.experience]) ? cellTexts[colMap.experience] : (cellTexts.length >= 5 ? cellTexts[4] : "");
      const tools = (colMap.tools < cellTexts.length && cellTexts[colMap.tools]) ? cellTexts[colMap.tools] : (cellTexts.length >= 6 ? cellTexts[5] : "");
      const materials = (colMap.materials < cellTexts.length && cellTexts[colMap.materials]) ? cellTexts[colMap.materials] : (cellTexts.length >= 7 ? cellTexts[6] : "");

      if (subject || topic || outcome || experience) {
        periods.push({
          period: String(periodCounter++),
          subject,
          topic,
          outcome,
          experience,
          tools,
          materials,
        });
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

      result.push({
        ...p,
        pageNumber: c + 1,
        date: dStr,
        day: dayName,
        periods: chunkPeriods,
      });

      currentDateCursor.setDate(currentDateCursor.getDate() + 1);
    }
  });

  return result;
}

export function groupStructuredPagesByDay(pages: StructuredDayPage[]): GroupedDayRecord[] {
  const partitionedPages = splitLargePagesIntoDayChunks(pages);
  const grouped: Record<string, GroupedDayRecord> = {};
  const list: GroupedDayRecord[] = [];

  partitionedPages.forEach((p) => {
    // Group key based on parsed date or page number
    const dateKey = p.date ? p.date.trim() : `day_chunk_${p.pageNumber}`;
    
    if (!grouped[dateKey]) {
      grouped[dateKey] = {
        date: p.date,
        day: p.day,
        std: p.std,
        year: p.year,
        teacher: p.teacher,
        school: p.school,
        thought: p.thought,
        dinvishesh: p.dinvishesh,
        periods: [...p.periods],
        columnHeaders: p.columnHeaders ? [...p.columnHeaders] : undefined,
        rawText: p.rawText,
      };
      list.push(grouped[dateKey]);
    } else {
      p.periods.forEach((newPeriod) => {
        const exists = grouped[dateKey].periods.some(
          (existing) => 
            existing.period === newPeriod.period && 
            existing.subject === newPeriod.subject && 
            existing.topic === newPeriod.topic
        );
        if (!exists) {
          grouped[dateKey].periods.push(newPeriod);
        }
      });

      if (!grouped[dateKey].day && p.day) grouped[dateKey].day = p.day;
      if (!grouped[dateKey].std && p.std) grouped[dateKey].std = p.std;
      if (!grouped[dateKey].year && p.year) grouped[dateKey].year = p.year;
      if (!grouped[dateKey].teacher && p.teacher) grouped[dateKey].teacher = p.teacher;
      if (!grouped[dateKey].school && p.school) grouped[dateKey].school = p.school;
      if (!grouped[dateKey].thought && p.thought) grouped[dateKey].thought = p.thought;
      if (!grouped[dateKey].dinvishesh && p.dinvishesh) grouped[dateKey].dinvishesh = p.dinvishesh;
      
      grouped[dateKey].rawText += "\n\n" + p.rawText;
    }
  });

  // Re-index periods to keep them sequential per day table (1..9)
  list.forEach((dayRec) => {
    dayRec.periods.forEach((period, index) => {
      period.period = String(index + 1);
    });
  });

  return list;
}

export interface StructuredDayPageListRef {
  getEditedData: () => any[];
}

export const StructuredDayPageList = forwardRef<StructuredDayPageListRef, { pages: StructuredDayPage[] }>(({ pages }, ref) => {
  const [dayRecords, setDayRecords] = useState<any[]>([]);
  const profile = useMemo(() => getStoredSchoolProfile(), []);

  useEffect(() => {
    setDayRecords(groupStructuredPagesByDay(pages));
  }, [pages]);

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
    <div className="space-y-8 font-sans max-w-4xl mx-auto pb-6">
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

      <div className="flex items-center justify-between p-3.5 bg-slate-900 text-white rounded-2xl text-xs font-bold shadow-sm">
        <span className="flex items-center gap-2">
          <Sparkles className="size-4 text-amber-400" />
          एकूण दिवस (Total Structured Days): <span className="text-indigo-300 font-extrabold text-sm">{dayRecords.length}</span>
        </span>
        <span className="px-3 py-1 bg-indigo-600 rounded-lg text-[11px] font-extrabold tracking-wide uppercase">
          अध्यापन नोंदवही (Day-wise View)
        </span>
      </div>

      {dayRecords.map((p, idx) => (
        <div key={idx} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-md space-y-6 day-card">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs">
            <span className="font-extrabold text-indigo-700 bg-indigo-50 px-3.5 py-1 rounded-full border border-indigo-100 uppercase tracking-wider">
              {p.date ? `दिनांक: ${formatCleanDate(p.date)}` : `Day ${idx + 1}`}
            </span>
            <span className="text-slate-600 font-bold bg-slate-100 px-2.5 py-1 rounded-lg">
              {p.periods.length > 0 ? `${p.periods.length} तासिका (Periods Found)` : "विवरण मजकूर"}
            </span>
          </div>

          <div className="text-center space-y-3">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              दैनंदिन पाठ टाचण
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs font-bold text-slate-900 bg-slate-100/80 p-4 rounded-2xl border-2 border-slate-400 shadow-sm text-left">
              <div><span className="text-slate-900 font-black block text-xs uppercase mb-0.5">दिनांक</span> <span suppressContentEditableWarning contentEditable onBlur={(e) => updateHeader(idx, "date", e.currentTarget.textContent || "")} className="text-orange-600 font-black text-sm outline-indigo-500 focus:bg-white px-1 rounded block">{formatCleanDate(p.date)}</span></div>
              <div><span className="text-slate-900 font-black block text-xs uppercase mb-0.5">वार</span> <span suppressContentEditableWarning contentEditable onBlur={(e) => updateHeader(idx, "day", e.currentTarget.textContent || "")} className="text-slate-900 font-black text-sm outline-indigo-500 focus:bg-white px-1 rounded block">{p.day || "-"}</span></div>
              <div><span className="text-slate-900 font-black block text-xs uppercase mb-0.5">वर्गशिक्षक</span> <span suppressContentEditableWarning contentEditable onBlur={(e) => updateHeader(idx, "teacher", e.currentTarget.textContent || "")} className="text-slate-900 font-black text-sm outline-indigo-500 focus:bg-white px-1 rounded block">{p.teacher && p.teacher !== "-" ? p.teacher : (profile?.teacherName || "-")}</span></div>
              <div><span className="text-slate-900 font-black block text-xs uppercase mb-0.5">शाळा</span> <span suppressContentEditableWarning contentEditable onBlur={(e) => updateHeader(idx, "school", e.currentTarget.textContent || "")} className="text-slate-900 font-black text-sm outline-indigo-500 focus:bg-white px-1 rounded block">{p.school && p.school !== "-" ? p.school : (profile?.schoolName || "-")}</span></div>
              <div><span className="text-slate-900 font-black block text-xs uppercase mb-0.5">इयत्ता</span> <span suppressContentEditableWarning contentEditable onBlur={(e) => updateHeader(idx, "std", e.currentTarget.textContent || "")} className="text-slate-900 font-black text-sm outline-indigo-500 focus:bg-white px-1 rounded block">{p.std && p.std !== "-" && p.std !== "पहिली" ? p.std : (profile?.className || p.std || "-")}</span></div>
              <div><span className="text-slate-900 font-black block text-xs uppercase mb-0.5">सन</span> <span suppressContentEditableWarning contentEditable onBlur={(e) => updateHeader(idx, "year", e.currentTarget.textContent || "")} className="text-slate-900 font-black text-sm outline-indigo-500 focus:bg-white px-1 rounded block">{p.year && p.year !== "-" ? p.year : (profile?.academicYear || "2026-27")}</span></div>
            </div>

            {p.thought && (
              <div className="text-xs italic text-amber-900 bg-amber-50/90 p-3.5 rounded-2xl border border-amber-200/80 text-left flex items-start gap-2">
                <Sparkles className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong className="not-italic text-amber-950 font-black">आजचा सुविचार :</strong> 
                  "<span suppressContentEditableWarning contentEditable onBlur={(e) => updateHeader(idx, "thought", e.currentTarget.textContent || "")} className="outline-amber-500 focus:bg-white px-1 rounded">{p.thought}</span>"
                </div>
              </div>
            )}
          </div>

          {p.periods.length > 0 ? (
            <div className="overflow-x-auto no-scrollbar rounded-2xl border-2 border-slate-400 shadow-md">
              <table className="w-full text-left text-sm border-collapse table-fixed border-2 border-slate-400">
                <colgroup>
                  <col style={{ width: "6%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "36%" }} />
                  <col style={{ width: "25%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "7%" }} />
                </colgroup>
                <thead className="bg-slate-100 text-slate-900 font-extrabold text-xs md:text-sm border-b-2 border-slate-400">
                  <tr>
                    {(p.columnHeaders && p.columnHeaders.length > 0
                      ? p.columnHeaders
                      : ["तासिका", "विषय", "अध्ययन मुद्दा / पाठ्यघटक", "अध्ययन निष्पत्ती / अध्ययन दर्शक", "अध्ययनाचे स्वरूप (अनुभव / कृती)", "साधन तंत्रे", "शैक्षणिक साहित्य"]
                    ).map((header: string, hIdx: number, arr: string[]) => {
                      const colWidths = ["6%", "8%", "11%", "36%", "25%", "7%", "7%"];
                      return (
                        <th
                          key={hIdx}
                          style={{ width: colWidths[hIdx] }}
                          className={`py-3 px-1.5 bg-slate-200 text-slate-900 font-black break-words leading-tight ${hIdx === 0 ? "text-center bg-slate-300" : ""} border-r-2 border-slate-400`}
                        >
                          {header}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-300 font-medium text-slate-800 bg-white text-xs md:text-sm">
                  {p.periods.map((row: any, rIdx: number) => (
                    <tr 
                      key={rIdx} 
                      className="hover:bg-indigo-50/40 transition-colors group border-b-2 border-slate-300"
                    >
                      <td className="p-3 border-r-2 border-slate-300 text-center font-black text-indigo-700 bg-indigo-50/50 align-top">{row.period}</td>
                      <td suppressContentEditableWarning contentEditable onBlur={(e) => updateRow(idx, rIdx, "subject", e.currentTarget.textContent || "")} className="p-3 border-r-2 border-slate-300 font-bold text-slate-900 outline-indigo-500 focus:bg-white text-xs md:text-sm align-top">{row.subject}</td>
                      <td suppressContentEditableWarning contentEditable onBlur={(e) => updateRow(idx, rIdx, "topic", e.currentTarget.textContent || "")} className="p-3 border-r-2 border-slate-300 font-semibold text-slate-800 leading-snug outline-indigo-500 focus:bg-white text-xs md:text-sm align-top">{row.topic}</td>
                      <td suppressContentEditableWarning contentEditable onBlur={(e) => updateRow(idx, rIdx, "outcome", e.currentTarget.textContent || "")} className="p-3 border-r-2 border-slate-300 font-medium text-emerald-800 leading-relaxed outline-indigo-500 focus:bg-white text-xs md:text-sm align-top">{row.outcome}</td>
                      <td suppressContentEditableWarning contentEditable onBlur={(e) => updateRow(idx, rIdx, "experience", e.currentTarget.textContent || "")} className="p-3 border-r-2 border-slate-300 text-slate-800 leading-relaxed outline-indigo-500 focus:bg-white text-xs md:text-sm align-top">{row.experience}</td>
                      <td suppressContentEditableWarning contentEditable onBlur={(e) => updateRow(idx, rIdx, "tools", e.currentTarget.textContent || "")} className="p-3 border-r-2 border-slate-300 text-slate-700 outline-indigo-500 focus:bg-white text-xs md:text-sm align-top">{row.tools}</td>
                      <td suppressContentEditableWarning contentEditable onBlur={(e) => updateRow(idx, rIdx, "materials", e.currentTarget.textContent || "")} className="p-3 text-slate-700 outline-indigo-500 focus:bg-white text-xs md:text-sm align-top">{row.materials}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-xs text-slate-700 p-4 bg-slate-50 rounded-2xl border border-slate-200 leading-relaxed">
              {p.rawText}
            </pre>
          )}

          <div 
            className="pt-6 border-t border-slate-200 text-xs font-bold text-slate-850 space-y-3 signature-section"
            style={{ pageBreakInside: "avoid", breakInside: "avoid", pageBreakBefore: "auto", breakBefore: "auto" }}
          >
            <div className="space-y-4">
              <p className="text-slate-800 font-bold text-xs">
                दिवसभरातील वैशिष्टपूर्ण बाबी:
              </p>
              <p className="text-slate-400 font-normal leading-none">
                ________________________________________________________________________________________
              </p>
              <p className="text-slate-400 font-normal leading-none">
                ________________________________________________________________________________________
              </p>
            </div>
            <div className="flex justify-between items-center pt-8 text-slate-800 font-extrabold text-sm px-6">
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
  authenticatedPdfUrl?: string | null;
  loadingPdf?: boolean;
  onBack?: () => void;
}

export interface DocumentLivePreviewRef {
  getStructuredData: () => any[] | null;
}

export const DocumentLivePreview = forwardRef<DocumentLivePreviewRef, DocumentLivePreviewProps>(({
  selectedFile,
  savedRecord,
  authenticatedPdfUrl,
  loadingPdf = false,
  onBack
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

      // 1. Update teacher_diaries document
      const diaryDocRef = doc(db, "teacher_diaries", cls, med, savedRecord.id);
      await updateDoc(diaryDocRef, {
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

      // 2. Update teaching_diaries document for current date
      const dateKey = savedRecord.diaryDate || savedRecord.id;
      if (dateKey && dateKey.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const tdDocId = `${cls}_${med}_${dateKey}`;
        const tdDocRef = doc(db, "teaching_diaries", tdDocId);
        await setDoc(
          tdDocRef,
          {
            className: cls,
            medium: med,
            date: dateKey,
            displayDate: firstDay?.date || dateKey,
            day: firstDay?.day || "",
            thought: firstDay?.thought || "",
            periods: mainPeriods,
            structuredData: editedData,
            updatedAt: Date.now(),
          },
          { merge: true }
        );
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
                pageUrlLower.includes("/pages/") || 
                pageUrlLower.includes("pdf");

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

    if (savedRecord && (savedRecord as any).structuredData && (savedRecord as any).structuredData.length > 0) {
      setStructuredPages((savedRecord as any).structuredData);
      setViewMode("structured");
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
    } else if (savedRecord && savedRecord.pageUrl) {
      const fileNameLower = (savedRecord.fileName || savedRecord.pageUrl).toLowerCase();
      if (fileNameLower.endsWith(".docx") || fileNameLower.endsWith(".doc")) {
        setLoadingContent(true);

        const targetUrl = getBunnyStorageUrl(savedRecord.pageUrl);
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

  const [filterSingleDate, setFilterSingleDate] = useState<boolean>(true);

  const pdfUrlToDisplay = selectedFile && isPdf
    ? localPdfBlobUrl
    : (authenticatedPdfUrl || savedRecord?.pageUrl || null);

  const targetNormalizedDate = useMemo(() => {
    return normalizeDateStr(savedRecord?.diaryDate);
  }, [savedRecord?.diaryDate]);

  const pagesToDisplay = useMemo(() => {
    if (!structuredPages || structuredPages.length === 0) return [];
    if (filterSingleDate && savedRecord?.diaryDate) {
      const targetIso = savedRecord.diaryDate.trim();
      const parts = targetIso.split("-");

      const matched = structuredPages.filter((p) => {
        if (!p.date) return false;
        const pClean = p.date.trim();
        if (pClean === targetIso) return true;

        if (parts.length === 3) {
          const dTarget = parseInt(parts[2], 10);
          const mTarget = parseInt(parts[1], 10);

          const m = pClean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
          if (m && parseInt(m[1], 10) === dTarget && parseInt(m[2], 10) === mTarget) return true;

          const mIso = pClean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
          if (mIso && parseInt(mIso[3], 10) === dTarget && parseInt(mIso[2], 10) === mTarget) return true;
        }
        return false;
      });

      if (matched.length > 0) return matched;

      // Fallback by day index (e.g. Day 1 -> 1 Aug, Day 3 -> 3 Aug)
      if (parts.length === 3) {
        const dTarget = parseInt(parts[2], 10);
        const dayIdx = dTarget - 1;
        if (dayIdx >= 0 && dayIdx < structuredPages.length) {
          return [structuredPages[dayIdx]];
        }
      }
    }
    return structuredPages;
  }, [structuredPages, filterSingleDate, savedRecord?.diaryDate]);

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
    const profile = getStoredSchoolProfile();
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
        const defaultHeaders = ["तासिका", "विषय", "अध्ययन मुद्दा / पाठ्यघटक", "अध्ययन निष्पत्ती", "अध्ययन अनुभव", "साधन तंत्रे", "शैक्षणिक साहित्य"];
        const dayBlocks = pagesToUse.map((p: any, idx: number) => {
          const rows = (p.periods || []).map((row: any, rIdx: number) => `
            <tr style="background:${rIdx % 2 === 0 ? "#ffffff" : "#f8fafc"};">
              <td style="text-align:center;font-weight:bold;color:#4338ca;width:6%;border:1.5pt solid #475569;padding:6px 2px;">${cleanText(row.period)}</td>
              <td style="font-weight:bold;border:1.5pt solid #94a3b8;width:8%;padding:6px 3px;">${cleanText(row.subject)}</td>
              <td style="border:1.5pt solid #94a3b8;width:11%;padding:6px 4px;">${cleanText(row.topic)}</td>
              <td style="border:1.5pt solid #94a3b8;width:36%;padding:6px 6px;">${cleanText(row.outcome)}</td>
              <td style="border:1.5pt solid #94a3b8;width:25%;padding:6px 6px;">${cleanText(row.experience)}</td>
              <td style="border:1.5pt solid #94a3b8;width:7%;padding:6px 3px;">${cleanText(row.tools)}</td>
              <td style="border:1.5pt solid #94a3b8;width:7%;padding:6px 3px;">${cleanText(row.materials)}</td>
            </tr>`).join("");

          const headers = (p.columnHeaders && p.columnHeaders.length > 0 ? p.columnHeaders : defaultHeaders)
            .map((h: string) => `<th style="background-color:#1e293b;color:#ffffff;padding:10px;text-align:left;font-weight:bold;border:1.5pt solid #475569;">${cleanText(h)}</th>`).join("");

          const teacherVal = cleanText(p.teacher && p.teacher !== "-" ? p.teacher : (profile?.teacherName || "-"));
          const schoolVal = cleanText(p.school && p.school !== "-" ? p.school : (profile?.schoolName || "-"));
          const stdVal = cleanText(p.std && p.std !== "-" && p.std !== "पहिली" ? p.std : (profile?.className || p.std || "-"));
          const yearVal = cleanText(p.year && p.year !== "-" ? p.year : (profile?.academicYear || "2026-27"));

          return `
            <div style="margin-bottom: 25px; page-break-after: always;">
              <h2 style="font-size: 20px; font-weight: 900; text-align: center; color: #0f172a; margin-bottom: 10px;">दैनंदिन पाठ टाचण</h2>
              <table style="width:100%; border-collapse:collapse; margin-bottom:15px; background:#f1f5f9; border:2pt solid #475569; font-size:11px;">
                <tr>
                  <td style="padding:6px 10px; border:1.5pt solid #64748b;"><b>दिनांक:</b> <span style="color:#4338ca;">${cleanText(formatCleanDate(p.date))}</span></td>
                  <td style="padding:6px 10px; border:1.5pt solid #64748b;"><b>वार:</b> ${cleanText(p.day)}</td>
                  <td style="padding:6px 10px; border:1.5pt solid #64748b;"><b>वर्गशिक्षक:</b> ${teacherVal}</td>
                </tr>
                <tr>
                  <td style="padding:6px 10px; border:1.5pt solid #64748b;"><b>शाळा:</b> ${schoolVal}</td>
                  <td style="padding:6px 10px; border:1.5pt solid #64748b;"><b>इयत्ता:</b> ${stdVal}</td>
                  <td style="padding:6px 10px; border:1.5pt solid #64748b;"><b>सन:</b> ${yearVal}</td>
                </tr>
              </table>
              ${p.thought ? `<div style="font-size:11px; font-style:italic; color:#78350f; background:#fffbeb; border-left:4px solid #f59e0b; padding:8px 12px; margin-bottom:12px;">💬 <b>आजचा सुविचार :</b> '${cleanText(p.thought)}'</div>` : ""}
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

    setIsGeneratingPdf(true);
    toast.success("PDF डाउनलोड तयार होत आहे... (Generating PDF...)");

    try {
      const defaultHeaders = ["तासिका", "विषय", "अध्ययन मुद्दा / पाठ्यघटक", "अध्ययन निष्पत्ती", "अध्ययन अनुभव", "साधन तंत्रे", "शैक्षणिक साहित्य"];
      const dayBlocks = pagesToUse
        .filter((p: any) => !isSunday(p.day, p.date))
        .map((p: any, idx: number) => {
        const rows = (p.periods || []).map((row: any, rIdx: number) => `
          <tr style="background:${rIdx % 2 === 0 ? "#fff" : "#f8fafc"}; page-break-inside: avoid; break-inside: avoid;">
            <td style="text-align:center;font-weight:700;color:#4338ca;width:6%">${row.period}</td>
            <td style="font-weight:600;width:8%">${row.subject || "-"}</td>
            <td style="width:11%">${row.topic || "-"}</td>
            <td style="width:36%">${row.outcome || "-"}</td>
            <td style="width:25%">${row.experience || "-"}</td>
            <td style="width:7%">${row.tools || "-"}</td>
            <td style="width:7%">${row.materials || "-"}</td>
          </tr>`).join("");

        const headers = (p.columnHeaders && p.columnHeaders.length > 0 ? p.columnHeaders : defaultHeaders)
          .map((h: string) => `<th>${h}</th>`).join("");

        return `
          <div class="day-block" style="margin-bottom: 15px; ${idx > 0 ? "page-break-before: always; break-before: always;" : ""} page-break-inside: avoid; break-inside: avoid;">
            <div class="day-header" style="display: flex; justify-content: flex-end; margin-bottom: 6px;">
              <span class="period-count" style="color: #475569; background: #f1f5f9; padding: 4px 10px; border-radius: 20px; font-weight: 600; font-size: 11px;">
                ${(p.periods || []).length} तासिका (Periods)
              </span>
            </div>
            <h2 style="font-size: 18px; font-weight: 900; text-align: center; color: #0f172a; margin: 8px 0 12px 0;">दैनंदिन पाठ टाचण</h2>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; background: #f1f5f9; border: 2px solid #475569; border-radius: 8px; padding: 10px 14px; margin-bottom: 10px; font-size: 11px;">
              <div><span style="color:#0f172a; font-size:10px; text-transform:uppercase; font-weight:900; display:block;">दिनांक</span><span style="font-weight:900; color:#4338ca; font-size:12px;">${formatCleanDate(p.date)}</span></div>
              <div><span style="color:#0f172a; font-size:10px; text-transform:uppercase; font-weight:900; display:block;">वार</span><span style="font-weight:900; color:#0f172a;">${p.day || "-"}</span></div>
              <div><span style="color:#0f172a; font-size:10px; text-transform:uppercase; font-weight:900; display:block;">वर्गशिक्षक</span><span style="font-weight:900; color:#0f172a;">${p.teacher || "-"}</span></div>
              <div><span style="color:#0f172a; font-size:10px; text-transform:uppercase; font-weight:900; display:block;">शाळा</span><span style="font-weight:900; color:#0f172a;">${p.school || "-"}</span></div>
              <div><span style="color:#0f172a; font-size:10px; text-transform:uppercase; font-weight:900; display:block;">इयत्ता</span><span style="font-weight:900; color:#0f172a;">${p.std || "-"}</span></div>
              <div><span style="color:#0f172a; font-size:10px; text-transform:uppercase; font-weight:900; display:block;">सन</span><span style="font-weight:900; color:#0f172a;">${p.year || "-"}</span></div>
            </div>
            ${p.thought ? `<div style="font-size:10.5px; font-style:italic; color:#78350f; background:#fffbeb; border-left:3px solid #f59e0b; padding:7px 12px; margin-bottom:10px; border-radius:4px;">✨ आजचा सुविचार : '${p.thought}'</div>` : ""}
            <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 12px;">
              <thead>
                <tr style="background: #f1f5f9; color: #0f172a;">
                  ${headers}
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 8px; page-break-inside: avoid; break-inside: avoid;">
              <p style="font-weight: 700; font-size: 11px; margin-bottom: 4px;">दिवसभरातील वैशिष्टपूर्ण बाबी:</p>
              <p style="color: #cbd5e1; font-size: 11px; margin-bottom: 4px;">________________________________________________________________________________________</p>
              <p style="color: #cbd5e1; font-size: 11px; margin-bottom: 4px;">________________________________________________________________________________________</p>
              <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 12px; padding: 20px 30px 0;">
                <span>वर्गशिक्षक</span><span>मुख्याध्यापक</span>
              </div>
            </div>
          </div>`;
      }).join("");

      const element = document.createElement("div");
      element.innerHTML = `
        <div style="font-family: 'Noto Sans Devanagari', Arial, sans-serif; color: #1e293b; line-height: 1.4; padding: 10px;">
          <style>
            table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 10.5px; border: 2px solid #475569; }
            table th { background-color: #f1f5f9 !important; color: #0f172a !important; font-weight: 800 !important; font-size: 10.5px !important; padding: 8px !important; border: 1.5px solid #475569 !important; text-align: left; }
            table th:first-child { text-align: center; width: 45px; background-color: #e2e8f0 !important; }
            table td { padding: 7px 8px !important; border: 1.5px solid #94a3b8 !important; vertical-align: top; font-size: 10px !important; line-height: 1.4 !important; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; break-inside: avoid; }
          </style>
          ${dayBlocks}
        </div>
      `;

      const html2pdf = (await import("html2pdf.js")).default;
      const baseName = activeFileName.replace(/\.[^/.]+$/, "") || "Teaching_Diary";
      
      const opt = {
        margin:       6,
        filename:     `${baseName}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['css'], avoid: '.day-block' }
      };

      await html2pdf().set(opt).from(element).save();
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
          {savedRecord?.diaryDate && structuredPages && structuredPages.length > 1 && (
            <button
              type="button"
              onClick={() => setFilterSingleDate(!filterSingleDate)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border cursor-pointer ${
                filterSingleDate
                  ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
              }`}
            >
              {filterSingleDate
                ? `📌 फक्त ${formatCleanDate(savedRecord.diaryDate)} ची टाचण`
                : "📚 सर्व तारखा (1-12 Dates)"}
            </button>
          )}

          {isPdf && hasStructuredView && (
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-bold">
              {isPdf && (
                <button
                  onClick={() => setViewMode("original")}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                    viewMode === "original"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Eye className="size-3.5" /> PDF प्रिव्ह्यू
                </button>
              )}
              <button
                onClick={() => setViewMode("structured")}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === "structured"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <LayoutGrid className="size-3.5" /> स्ट्रक्चर्ड टाचण
              </button>
            </div>
          )}

          {(downloadUrl || hasStructuredView) && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadWord}
                disabled={isInnerDownloading}
                className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
              >
                {isInnerDownloading ? (
                  <><Loader2 className="size-3.5 animate-spin" /> Word तयार होत आहे...</>
                ) : (
                  <><Download className="size-3.5" /> Download to Word</>
                )}
              </button>

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

      <div className="flex-1 w-full bg-slate-50 overflow-auto relative p-2 sm:p-4">
        {loadingContent || loadingPdf ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
            <Loader2 className="size-8 animate-spin text-indigo-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Loading document preview...
            </span>
          </div>
        ) : isPdf && pdfUrlToDisplay && viewMode === "original" ? (
          <div className="w-full h-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner flex flex-col relative">
            <iframe
              src={pdfUrlToDisplay.includes("#") ? pdfUrlToDisplay : `${pdfUrlToDisplay}#view=FitH`}
              title="PDF Document Live Preview"
              className="w-full h-full border-none rounded-2xl bg-white"
            />
          </div>
        ) : viewMode === "structured" && pagesToDisplay.length > 0 ? (
          <div className="w-full">
            <StructuredDayPageList ref={structuredListRef} pages={pagesToDisplay} />
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
        ) : isPdf && pdfUrlToDisplay ? (
          /* PDF IFRAME FALLBACK */
          <iframe
            src={pdfUrlToDisplay.includes("#") ? pdfUrlToDisplay : `${pdfUrlToDisplay}#view=FitH`}
            title="Document Live Preview"
            className="w-full h-full border-none rounded-2xl bg-white"
          />
        ) : (activeExt === "doc" || activeExt === "docx") ? (
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
          <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-3">
            <div className="size-14 rounded-2xl bg-white flex items-center justify-center text-indigo-500 shadow-sm border border-slate-200">
              <BookOpen className="size-7" />
            </div>
            <div className="space-y-1 max-w-xs">
              <p className="text-sm font-black text-slate-800">No Document Selected</p>
              <p className="text-xs text-slate-500">
                Select an Excel, Word (.docx), or PDF file to view its live content preview here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
