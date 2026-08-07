import React, { useState, useEffect } from "react";
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
  FileCheck
} from "lucide-react";
import { getBunnyStorageUrl } from "@/lib/bunny-auth-pdf";

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

    let date = "";
    const dateMatch = chunkText.match(/(?:दिनांक|तारीख|Date)\s*[:：]?\s*(\d{1,2}\s*[\/\-\.]\s*\d{1,2}\s*[\/\-\.]\s*\d{2,4})/i);
    if (dateMatch) {
      date = dateMatch[1].replace(/\s+/g, "");
    }

    let day = "";
    const dayMatch = chunkText.match(/(?:वार|Day)\s*[:：]?\s*(सोमवार|मंगळवार|बुधवार|गुरुवार|शुक्रवार|शनिवार|रविवार|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i);
    if (dayMatch) {
      day = dayMatch[1];
    } else if (date) {
      const parts = date.split(/[\/\-\.]/);
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        const dateObj = new Date(y, m, d);
        if (!isNaN(dateObj.getTime())) {
          const daysInMarathi = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
          day = daysInMarathi[dateObj.getDay()];
        }
      }
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
  });
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

  // Helper: extract metadata from a section's text elements
  function extractSectionMetadata(textEls: Element[]) {
    const sectionText = textEls.map((el) => el.textContent || "").join("\n");

    let date = "";
    // Match dates like "1/ 8 /2026" or "2 / 8 /2026" or "6/ 8 /2026"
    const dateMatch = sectionText.match(
      /(?:दिनांक|तारीख|Date)\s*[:：]?\s*(\d{1,2}\s*[\/\-\.]\s*\d{1,2}\s*[\/\-\.]\s*\d{2,4})/i
    );
    if (dateMatch) date = dateMatch[1].replace(/\s+/g, "");

    let day = "";
    const dayMatch = sectionText.match(
      /(?:वार|Day)\s*[:：]?\s*(सोमवार|मंगळवार|बुधवार|गुरुवार|शुक्रवार|शनिवार|रविवार|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i
    );
    if (dayMatch) {
      day = dayMatch[1];
    } else if (date) {
      const parts = date.split(/[\/\-\.]/);
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        const dateObj = new Date(y < 100 ? y + 2000 : y, m, d);
        if (!isNaN(dateObj.getTime())) {
          const daysInMarathi = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
          day = daysInMarathi[dateObj.getDay()];
        }
      }
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

      // Map cells to period fields based on column count
      const colCount = cellTexts.length;
      let period = "",
        subject = "",
        topic = "",
        outcome = "",
        experience = "",
        tools = "",
        materials = "";

      if (colCount >= 7) {
        period = cellTexts[0];
        subject = cellTexts[1];
        topic = cellTexts[2];
        outcome = cellTexts[3];
        experience = cellTexts[4];
        tools = cellTexts[5];
        materials = cellTexts[6];
      } else if (colCount === 6) {
        period = cellTexts[0];
        subject = cellTexts[1];
        topic = cellTexts[2];
        outcome = cellTexts[3];
        experience = cellTexts[4];
        tools = cellTexts[5];
      } else if (colCount === 5) {
        period = cellTexts[0];
        subject = cellTexts[1];
        topic = cellTexts[2];
        outcome = cellTexts[3];
        experience = cellTexts[4];
      } else if (colCount >= 3) {
        period = cellTexts[0];
        subject = cellTexts[1];
        topic = cellTexts[2];
        outcome = cellTexts[3] || "";
      }

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

  daySections.forEach((section, idx) => {
    const meta = extractSectionMetadata(section.textElements);
    const { periods, columnHeaders } = extractPeriodsFromTable(section.table);

    if (periods.length > 0) {
      pages.push({
        pageNumber: idx + 1,
        date: meta.date,
        day: meta.day,
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

export function groupStructuredPagesByDay(pages: StructuredDayPage[]): GroupedDayRecord[] {
  const grouped: Record<string, GroupedDayRecord> = {};
  const list: GroupedDayRecord[] = [];

  pages.forEach((p) => {
    // Group key based on parsed date, fallback to unique page key if date is not available
    const dateKey = p.date ? p.date.trim() : `unknown_page_${p.pageNumber}`;
    
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
      // Grouping: Connect day-wise period records
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

  // Re-index periods to keep them sequential
  list.forEach((dayRec) => {
    dayRec.periods.forEach((period, index) => {
      period.period = String(index + 1);
    });
  });

  return list;
}

export const StructuredDayPageList: React.FC<{ pages: StructuredDayPage[] }> = ({ pages }) => {
  const dayRecords = groupStructuredPagesByDay(pages);

  return (
    <div className="space-y-8 font-sans max-w-4xl mx-auto pb-6">
      <style>{`
        @media print {
          .day-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .signature-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-before: auto !important;
            break-before: auto !important;
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
              {p.date ? `दिनांक: ${p.date}` : `Day ${idx + 1}`}
            </span>
            <span className="text-slate-600 font-bold bg-slate-100 px-2.5 py-1 rounded-lg">
              {p.periods.length > 0 ? `${p.periods.length} तासिका (Periods Found)` : "विवरण मजकूर"}
            </span>
          </div>

          <div className="text-center space-y-3">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              दैनंदिन पाठ टाचण
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs font-bold text-slate-700 bg-slate-50/80 p-4 rounded-2xl border border-slate-200 text-left">
              <div><span className="text-slate-400 font-medium block text-[10px] uppercase">दिनांक</span> <span className="text-indigo-600 font-black text-sm">{p.date || "-"}</span></div>
              <div><span className="text-slate-400 font-medium block text-[10px] uppercase">वार</span> <span className="text-slate-900 font-bold">{p.day || "-"}</span></div>
              <div><span className="text-slate-400 font-medium block text-[10px] uppercase">वर्गशिक्षक</span> <span className="text-slate-900 font-bold">{p.teacher}</span></div>
              <div><span className="text-slate-400 font-medium block text-[10px] uppercase">शाळा</span> <span className="text-slate-900 font-bold">{p.school}</span></div>
              <div><span className="text-slate-400 font-medium block text-[10px] uppercase">इयत्ता</span> <span className="text-slate-900 font-bold">{p.std}</span></div>
              <div><span className="text-slate-400 font-medium block text-[10px] uppercase">सन</span> <span className="text-slate-900 font-bold">{p.year}</span></div>
            </div>

            {p.thought && (
              <div className="text-xs italic text-amber-900 bg-amber-50/90 p-3.5 rounded-2xl border border-amber-200/80 text-left flex items-start gap-2">
                <Sparkles className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="not-italic text-amber-950 font-black">आजचा सुविचार :</strong> "{p.thought}"
                </div>
              </div>
            )}
          </div>

          {p.periods.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-300 shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-white font-bold text-[11px]">
                  <tr>
                    {(p.columnHeaders && p.columnHeaders.length > 0
                      ? p.columnHeaders
                      : ["तासिका", "विषय", "अध्ययन मुद्दा पाठ्यांश / पाठ्यघटक", "अध्ययन निष्पत्ती / अध्ययन दर्शक", "अध्ययन अनुभवाचे स्वरूप", "साधन तंत्रे", "शैक्षणिक साहित्य"]
                    ).map((header: string, hIdx: number, arr: string[]) => (
                      <th
                        key={hIdx}
                        className={`p-2.5 ${hIdx === 0 ? "text-center w-14 bg-slate-950" : ""} ${hIdx < arr.length - 1 ? "border-r border-slate-700" : ""}`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-800 bg-white">
                  {p.periods.map((row, idx) => (
                    <tr 
                      key={idx} 
                      className="hover:bg-indigo-50/40 transition-colors"
                      style={{ pageBreakInside: "avoid", breakInside: "avoid" }}
                    >
                      <td className="p-3 border-r border-slate-200 text-center font-black text-indigo-700 bg-indigo-50/50">{row.period}</td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-900">{row.subject}</td>
                      <td className="p-3 border-r border-slate-200 font-medium text-slate-800 leading-relaxed">{row.topic}</td>
                      <td className="p-3 border-r border-slate-200 text-slate-700 leading-relaxed">{row.outcome}</td>
                      <td className="p-3 border-r border-slate-200 text-slate-700 leading-relaxed">{row.experience}</td>
                      <td className="p-3 border-r border-slate-200 text-slate-600">{row.tools}</td>
                      <td className="p-3 text-slate-600">{row.materials}</td>
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
};

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

export const DocumentLivePreview: React.FC<Props> = ({
  selectedFile,
  savedRecord,
  authenticatedPdfUrl,
  loadingPdf = false,
}) => {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [multiDayPages, setMultiDayPages] = useState<StructuredDayPage[] | null>(null);
  const [excelPreviewData, setExcelPreviewData] = useState<any[] | null>(null);
  const [loadingContent, setLoadingContent] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [localPdfBlobUrl, setLocalPdfBlobUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"original" | "structured">("original");

  // Determine active document metadata
  const activeFileName = selectedFile?.name || savedRecord?.fileName || "Document";
  const activeExt = activeFileName.split(".").pop()?.toLowerCase() || "";
  const pageUrlLower = (savedRecord?.pageUrl || "").toLowerCase();
  
  const isPdf = activeExt === "pdf" || 
                selectedFile?.type === "application/pdf" || 
                pageUrlLower.endsWith(".pdf") || 
                pageUrlLower.includes("/pages/") || 
                pageUrlLower.includes("pdf");

  // Manage local PDF Object URL
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
    setMultiDayPages(null);
    setExcelPreviewData(null);
    setErrorMsg(null);
    setViewMode(isPdf ? "original" : "structured");

    // CASE 1: Preview locally selected file
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

              if (extractedPages.length > 0 && extractedPages.some((p) => p.periods.length > 0)) {
                setMultiDayPages(extractedPages);
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
                // Use HTML table parser first (preserves actual table cell structure)
                const parsedFromHtml = parseHtmlToStructuredDiaries(result.value);
                if (parsedFromHtml.length > 0) {
                  setMultiDayPages(parsedFromHtml);
                } else {
                  // Fallback to raw text parser if no tables found in HTML
                  const rawTxt = await mammoth.extractRawText({ arrayBuffer: buffer });
                  const parsed = parseMultiPageTextToStructuredDiaries(rawTxt.value);
                  if (parsed.length > 0) setMultiDayPages(parsed);
                }
                return;
              }
            } catch (err: any) {
              // Mammoth XML parse failed
            }

            const extractedText = extractTextFromBinaryDoc(buffer);
            if (extractedText && extractedText.length > 0) {
              const parsed = parseMultiPageTextToStructuredDiaries(extractedText);
              if (parsed.length > 0) {
                setMultiDayPages(parsed);
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
              console.error("Excel parse error:", err);
              setErrorMsg("Could not parse Excel preview.");
            }
          })
          .finally(() => setLoadingContent(false));
      }
    } 
    // CASE 2: Preview saved record (Word doc or PDF URL)
    else if (savedRecord && savedRecord.pageUrl) {
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
                // Use HTML table parser first (preserves actual table cell structure)
                const parsedFromHtml = parseHtmlToStructuredDiaries(result.value);
                if (parsedFromHtml.length > 0) {
                  setMultiDayPages(parsedFromHtml);
                } else {
                  // Fallback to raw text parser if no tables found in HTML
                  const rawTxt = await mammoth.extractRawText({ arrayBuffer: buffer });
                  const parsed = parseMultiPageTextToStructuredDiaries(rawTxt.value);
                  if (parsed.length > 0) setMultiDayPages(parsed);
                }
                return;
              }
            } catch (err) {
              // Mammoth XML parse failed
            }

            const extractedText = extractTextFromBinaryDoc(buffer);
            if (extractedText && extractedText.length > 0) {
              const parsed = parseMultiPageTextToStructuredDiaries(extractedText);
              if (parsed.length > 0) {
                setMultiDayPages(parsed);
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

  // Compute final PDF URL for display
  const pdfUrlToDisplay = selectedFile && isPdf
    ? localPdfBlobUrl
    : (authenticatedPdfUrl || savedRecord?.pageUrl || null);

  const hasStructuredView = multiDayPages && multiDayPages.length > 0 && multiDayPages.some((p) => p.periods.length > 0);
  const downloadUrl = savedRecord?.pageUrl || (selectedFile ? localPdfBlobUrl : null);

  return (
    <div className="w-full bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[680px]">
      {/* Top Header */}
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
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
          {hasStructuredView && (
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

          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={activeFileName}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              <Download className="size-3.5" /> Download
            </a>
          )}
        </div>
      </div>

      {/* Main Content Viewer Area */}
      <div className="flex-1 w-full bg-slate-50 overflow-auto relative p-2 sm:p-4">
        {loadingContent || loadingPdf ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
            <Loader2 className="size-8 animate-spin text-indigo-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Loading document preview...
            </span>
          </div>
        ) : isPdf && pdfUrlToDisplay && viewMode === "original" ? (
          /* PDF IFRAME / VISUAL PREVIEW */
          <div className="w-full h-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner flex flex-col relative">
            <iframe
              src={pdfUrlToDisplay.includes("#") ? pdfUrlToDisplay : `${pdfUrlToDisplay}#view=FitH`}
              title="PDF Document Live Preview"
              className="w-full h-full border-none rounded-2xl bg-white"
            />
          </div>
        ) : hasStructuredView && viewMode === "structured" ? (
          /* STRUCTURED DIARY TABLE VIEW */
          <StructuredDayPageList pages={multiDayPages!} />
        ) : htmlContent ? (
          /* WORD (.DOCX) HTML PREVIEW */
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
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={activeFileName}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md transition-all"
                  >
                    <Download className="size-4" /> Download / Open Word File
                  </a>
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
};
