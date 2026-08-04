import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ParsedTableCell, isColumnHeaderRow } from "@/lib/tableParser";
import {
  Table as TableIcon,
  Eye,
  Download,
  Sparkles,
  Edit3,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  CheckCircle2,
  Loader2,
  FileText,
  X,
  Calendar,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";

export interface MonthlyPlanningViewerProps {
  htmlContent?: string;
  gridData?: ParsedTableCell[][];
  fileUrl?: string;
  fileName?: string;
  title?: string;
  subjectName?: string;
  role?: "admin" | "user";
  recordId?: string;
  onClose?: () => void;
  onSaveTable?: (
    updatedGrid: ParsedTableCell[][],
    updatedHtml: string,
    meta: any
  ) => Promise<void>;
}

export const DEFAULT_MONTHLY_PLANNING_HEADERS = [
  "दिनांक",
  "पाठ / घटक / उपघटक",
  "अध्ययन निष्पत्ती",
  "अध्ययन मुद्दे / पाठ्यांश उद्देश",
  "अध्ययन अनुभवाचे स्वरूप",
  "साधन तंत्रे",
  "आवश्यक साहित्य",
];

const DEFAULT_MONTHLY_ROWS: ParsedTableCell[][] = [
  [
    { value: "✨ अभ्यासक्रमाचे मासिक व घटक नियोजन माहे - जुलै | इयत्ता : पहिली", rowspan: 1, colspan: 7, isMergedHidden: false },
    { value: "", rowspan: 1, colspan: 1, isMergedHidden: true },
    { value: "", rowspan: 1, colspan: 1, isMergedHidden: true },
    { value: "", rowspan: 1, colspan: 1, isMergedHidden: true },
    { value: "", rowspan: 1, colspan: 1, isMergedHidden: true },
    { value: "", rowspan: 1, colspan: 1, isMergedHidden: true },
    { value: "", rowspan: 1, colspan: 1, isMergedHidden: true },
  ],
  [
    { value: "दिनांक", rowspan: 1, colspan: 1, isMergedHidden: false },
    { value: "पाठ / घटक / उपघटक", rowspan: 1, colspan: 1, isMergedHidden: false },
    { value: "अध्ययन निष्पत्ती", rowspan: 1, colspan: 1, isMergedHidden: false },
    { value: "अध्ययन मुद्दे / पाठ्यांश उद्देश", rowspan: 1, colspan: 1, isMergedHidden: false },
    { value: "अध्ययन अनुभवाचे स्वरूप", rowspan: 1, colspan: 1, isMergedHidden: false },
    { value: "साधन तंत्रे", rowspan: 1, colspan: 1, isMergedHidden: false },
    { value: "आवश्यक साहित्य", rowspan: 1, colspan: 1, isMergedHidden: false },
  ],
  [
    { value: "०१ ते ०८ जुलै", rowspan: 1, colspan: 1, isMergedHidden: false },
    { value: "१. माझ्या या दारातून (चित्र वाचन)", rowspan: 1, colspan: 1, isMergedHidden: false },
    { value: "चित्रातील प्रसंग व पात्रांचे निरीक्षण करून संवाद साधतात.", rowspan: 1, colspan: 1, isMergedHidden: false },
    { value: "चित्र वर्णन, पात्र ओळख व जोड्या जुळवणे.", rowspan: 1, colspan: 1, isMergedHidden: false },
    { value: "विद्यार्थ्यांकडून चित्र वाचन करून घेणे, लहान-मोठे गट चर्चा.", rowspan: 1, colspan: 1, isMergedHidden: false },
    { value: "प्रश्नत्तोर, निरीक्षण व प्रात्यक्षिक", rowspan: 1, colspan: 1, isMergedHidden: false },
    { value: "चित्र कार्ड, फ्लॅश कार्ड, डिजिटल तक्ता", rowspan: 1, colspan: 1, isMergedHidden: false },
  ],
  [
    { value: "०९ ते १५ जुलै", rowspan: 1, colspan: 1, isMergedHidden: false },
    { value: "२. चित्र गप्पा (माझे कुटुंब)", rowspan: 1, colspan: 1, isMergedHidden: false },
    { value: "कुटुंबातील सदस्यांची नावे सांगून नात्यांची माहिती देतात.", rowspan: 1, colspan: 1, isMergedHidden: false },
    { value: "माझे कुटुंब संकल्पना व सामाजिक मूल्ये.", rowspan: 1, colspan: 1, isMergedHidden: false },
    { value: "कुटुंब चित्र दाखवून अनुभव कथन, संवाद कृती.", rowspan: 1, colspan: 1, isMergedHidden: false },
    { value: "मौखिक अभिव्यक्ती व नाटयीकरण", rowspan: 1, colspan: 1, isMergedHidden: false },
    { value: "कुटुंब चित्रफीत, तक्ते, रंगीत चित्रे", rowspan: 1, colspan: 1, isMergedHidden: false },
  ],
  [
    { value: "१६ ते २२ जुलै", rowspan: 1, colspan: 1, isMergedHidden: false },
    { value: "३. अक्षरगट १ - (क, म, ल, आ)", rowspan: 1, colspan: 1, isMergedHidden: false },
    { value: "क, म, ल, आ अक्षरांचे ध्वनी ओळखून वाचन-लेखन करतात.", rowspan: 1, colspan: 1, isMergedHidden: false },
    { value: "अक्षर ध्वनी ओळख, अवयव सराव व शब्द निर्मिती.", rowspan: 1, colspan: 1, isMergedHidden: false },
    { value: "हवेत/पाठीवर गिरवणे, मातीत काढणे, वाचन कार्ड सराव.", rowspan: 1, colspan: 1, isMergedHidden: false },
    { value: "अक्षर ओळख चाचणी व वाचन सराव", rowspan: 1, colspan: 1, isMergedHidden: false },
    { value: "अक्षर पट, चित्र-अक्षर कार्ड, वाळू तक्ता", rowspan: 1, colspan: 1, isMergedHidden: false },
  ],
];

export const cleanCellValue = (text: any): string => {
  if (text === null || text === undefined) return "";
  let str = String(text).trim();
  if (str.includes("$")) {
    str = str.replace(/\$\s*/g, "").trim();
  }
  return str;
};

const escapeHtml = (text: any): string => {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const sanitizeGrid = (grid: ParsedTableCell[][]): ParsedTableCell[][] => {
  if (!grid || !Array.isArray(grid)) return [];
  return grid.map((row) => {
    const r = row.map((cell) => ({
      ...cell,
      value: cleanCellValue(cell.value),
    }));
    while (r.length < 7) {
      r.push({ value: "", rowspan: 1, colspan: 1, isMergedHidden: false });
    }
    return r;
  });
};

/**
 * Auto-expanding textarea for Monthly Planning 7-column table cells
 */
const AutoResizeTextarea: React.FC<{
  value: string;
  onChange: (val: string) => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  autoFocus?: boolean;
  className?: string;
}> = ({ value, onChange, onBlur, onKeyDown, autoFocus = false, className = "" }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.max(36, el.scrollHeight)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        adjustHeight();
      }}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      rows={1}
      className={`w-full min-h-[36px] resize-none overflow-hidden box-border border-2 border-amber-400 bg-amber-50/50 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/50 p-1.5 rounded shadow-xs transition-all text-xs text-slate-900 font-sans leading-relaxed ${className}`}
    />
  );
};

export const MonthlyPlanningViewer: React.FC<MonthlyPlanningViewerProps> = ({
  htmlContent: propHtmlContent = "",
  gridData: propGridData = [],
  fileUrl,
  fileName,
  title = "मासिक घटक नियोजन (Monthly Unit Planning)",
  subjectName = "विषय",
  role = "user",
  recordId,
  onClose,
  onSaveTable,
}) => {
  const [tableData, setTableData] = useState<ParsedTableCell[][]>(() =>
    propGridData.length > 0
      ? sanitizeGrid(propGridData)
      : sanitizeGrid(DEFAULT_MONTHLY_ROWS)
  );

  const [workingData, setWorkingData] = useState<ParsedTableCell[][]>(() =>
    propGridData.length > 0
      ? sanitizeGrid(propGridData)
      : sanitizeGrid(DEFAULT_MONTHLY_ROWS)
  );

  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [activeCell, setActiveCell] = useState<{ rIdx: number; cIdx: number } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"grid" | "html" | "preview">("grid");

  useEffect(() => {
    if (propGridData && propGridData.length > 0) {
      const normalized = sanitizeGrid(propGridData);
      setTableData(normalized);
      if (!isEditMode) {
        setWorkingData(normalized);
        setHasUnsavedChanges(false);
      }
    }
  }, [propGridData]);

  const handleEnterEditMode = () => {
    const clone = tableData.map((row) => row.map((cell) => ({ ...cell })));
    setWorkingData(clone);
    setActiveTab("grid");
    setActiveCell(null);
    setIsEditMode(true);
    toast.info("✏️ मासिक नियोजन संपादन मोड सुरू झाला (Click to Edit)");
  };

  const handleCellChange = useCallback((rowIndex: number, colIndex: number, newValue: string) => {
    setWorkingData((prevWorkingData) =>
      prevWorkingData.map((row, rIdx) => {
        if (rIdx === rowIndex) {
          return row.map((cell, cIdx) => (cIdx === colIndex ? { ...cell, value: newValue } : cell));
        }
        return row;
      })
    );
    setHasUnsavedChanges(true);
  }, []);

  const handleAddRow = () => {
    const newRow: ParsedTableCell[] = Array.from({ length: 7 }, () => ({
      value: "",
      rowspan: 1,
      colspan: 1,
      isMergedHidden: false,
    }));
    setWorkingData((prev) => [...prev, newRow]);
    setHasUnsavedChanges(true);
    toast.info("➕ नवीन ओळ जोडली गेली.");
  };

  const handleDeleteRow = (rIdx: number) => {
    if (workingData.length <= 1) {
      toast.error("कमीत कमी एक ओळ असणे आवश्यक आहे.");
      return;
    }
    setWorkingData((prev) => prev.filter((_, r) => r !== rIdx));
    setHasUnsavedChanges(true);
    toast.success("🗑️ ओळ हटवली गेली.");
  };

  const handleReset = () => {
    const clone = tableData.map((row) => row.map((cell) => ({ ...cell })));
    setWorkingData(clone);
    setActiveCell(null);
    setHasUnsavedChanges(false);
    toast.info("🔄 सर्व बदल पूर्ववत केले.");
  };

  const handleCancelEdit = () => {
    const clone = tableData.map((row) => row.map((cell) => ({ ...cell })));
    setWorkingData(clone);
    setActiveCell(null);
    setHasUnsavedChanges(false);
    setIsEditMode(false);
    toast.info("मासिक नियोजन संपादन रद्द केले.");
  };

const isMonthlyBannerRow = (row: ParsedTableCell[]): boolean => {
  if (!row || !Array.isArray(row)) return false;
  return row.some((c) => {
    if (!c || !c.value) return false;
    const s = c.value.toLowerCase().trim();
    return (
      s.includes("अभ्यासक्रमाचे") ||
      s.includes("मासिक व घटक") ||
      s.includes("monthly & unit planning") ||
      s.includes("monthly unit planning") ||
      s.includes("monthly planning") ||
      (s.startsWith("month ") && s.includes("202"))
    );
  });
};

const isMonthlyMetadataRow = (row: ParsedTableCell[]): boolean => {
  if (!row || !Array.isArray(row)) return false;
  return row.some((c) => {
    if (!c || !c.value) return false;
    const s = c.value.toLowerCase().trim();
    return (
      s.includes("class :") ||
      s.includes("class:") ||
      s.includes("sub :") ||
      s.includes("sub:") ||
      s.includes("subject:") ||
      s.includes("working days") ||
      s.includes("available period") ||
      s.includes("नियोजित तासिका") ||
      s.includes("कामाचे दिवस")
    );
  });
};

const isMonthlyColumnHeaderRow = (row: ParsedTableCell[]): boolean => {
  if (!row || !Array.isArray(row)) return false;
  const joined = row.map((c) => (c?.value || "").toLowerCase().trim()).join(" ");
  const hasDateOrDay = joined.includes("दिनांक") || joined.includes("day");
  const hasTopicOrLesson = joined.includes("पाठ") || joined.includes("घटक") || joined.includes("lesson") || joined.includes("point");
  return hasDateOrDay && hasTopicOrLesson;
};

const isMonthlySignatureRow = (row: ParsedTableCell[]): boolean => {
  if (!row || !Array.isArray(row)) return false;
  const joined = row.map((c) => (c?.value || "").toLowerCase().trim()).join(" ");
  return (
    joined.includes("class teacher sign") ||
    joined.includes("headmaster sign") ||
    joined.includes("शिक्षक स्वाक्षरी") ||
    joined.includes("मुख्याध्यापक स्वाक्षरी") ||
    joined.includes("स्वाक्षरी") ||
    joined.includes("sign")
  );
};

const isRowInvalid = (row: ParsedTableCell[]): boolean => {
  if (!row || !Array.isArray(row) || row.length === 0) return true;

  // 1. Skip 100% empty rows (where all cells are empty)
  const isAllEmpty = row.every((c) => !c || !c.value || cleanCellValue(c.value) === "");
  if (isAllEmpty) return true;

  // 2. Keep Month Banner rows intact (used to split month cards)
  if (isMonthlyBannerRow(row)) return false;

  // 3. Skip repeated structural headers / metadata / signature rows from inside table data
  if (isMonthlyMetadataRow(row) || isMonthlyColumnHeaderRow(row) || isMonthlySignatureRow(row)) {
    return true;
  }

  // 4. Any row reaching here with content is a valid data row
  return false;
};

interface MonthBlock {
  title: string;
  rows: ParsedTableCell[][];
}

const splitGridByMonthBlocks = (grid: ParsedTableCell[][]): MonthBlock[] => {
  const blocks: MonthBlock[] = [];
  let currentTitle = "मासिक नियोजन";
  let currentRows: ParsedTableCell[][] = [];

  grid.forEach((row) => {
    if (isRowInvalid(row)) return;

    if (isMonthlyBannerRow(row)) {
      const bannerVal = row.find((c) => c && c.value && c.value.trim() !== "")?.value || "";
      let monthName = bannerVal
        .replace(/✨/g, "")
        .replace(/Monthly & Unit Planning - Month /gi, "")
        .replace(/Monthly & Unit Planning/gi, "")
        .replace(/अभ्यासक्रमाचे मासिक व घटक नियोजन माहे -/gi, "")
        .replace(/अभ्यासक्रमाचे मासिक व घटक नियोजन/gi, "")
        .replace(/मासिक व घटक नियोजन/gi, "")
        .trim();

      if (currentRows.length > 0) {
        blocks.push({ title: currentTitle, rows: currentRows });
        currentRows = [];
      }
      currentTitle = monthName || "मासिक नियोजन";
      return;
    }

    currentRows.push(row);
  });

  if (currentRows.length > 0 || blocks.length === 0) {
    blocks.push({
      title: currentTitle,
      rows: currentRows,
    });
  }

  return blocks;
};

  const generateUpdatedHtml = (grid: ParsedTableCell[][]): string => {
    if (grid.length === 0) return "";

    const monthBlocks = splitGridByMonthBlocks(grid);
    let html = `<div id="monthly-planning-pdf-root" class="bg-white text-slate-900 font-sans p-1">`;

    monthBlocks.forEach((block, mIdx) => {
      const pageBreakClass = mIdx > 0 ? "month-card-container monthly-pdf-page-break" : "month-card-container";
      const pageBreakStyle = mIdx > 0
        ? "page-break-before: always; break-before: page; page-break-inside: avoid; page-break-after: avoid; margin-bottom: 0px; padding-bottom: 0px;"
        : "page-break-inside: avoid; page-break-after: avoid; margin-bottom: 0px; padding-bottom: 0px;";

      html += `<div class="${pageBreakClass}" style="${pageBreakStyle}">`;

      // 1. Main Header Title Banner
      html += `<div class="bg-indigo-900 text-white font-bold text-center py-2 px-3 text-xs md:text-sm rounded-t-md" style="background-color: #1e1b4b !important; color: #ffffff !important; text-align: center; font-weight: bold; padding: 6px;">`;
      html += `✨ अभ्यासक्रमाचे मासिक व घटक नियोजन माहे - ${escapeHtml(block.title || subjectName)}`;
      html += `</div>`;

      // 2. Sub-Header Metadata Box (2-Row Grid)
      html += `<div class="bg-slate-100 border-x border-b border-slate-300 px-3 py-1.5 text-[11px] font-semibold flex flex-col gap-1 rounded-b-md mb-2" style="background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px; font-size: 10.5px; margin-bottom: 6px;">`;
      html += `<div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">`;
      html += `<span>इयत्ता : ${escapeHtml(title || "दुसरी")} | विषय : ${escapeHtml(subjectName)}</span>`;
      html += `<span>नियोजित तासिका : _________________</span>`;
      html += `</div>`;
      html += `<div style="display: flex; justify-content: space-between; padding-top: 3px;">`;
      html += `<span>विषय : ${escapeHtml(subjectName)}</span>`;
      html += `<span>कामाचे दिवस : _________________</span>`;
      html += `</div>`;
      html += `</div>`;

      // 3. Strict 7-Column Table
      html += `<table class="pdf-table w-full table-fixed border-collapse border border-slate-400 text-[10px] font-sans my-0" style="width: 100%; table-layout: fixed; border-collapse: collapse;">`;
      html += `<colgroup>`;
      html += `<col style="width: 6%;" />`;
      html += `<col style="width: 18%;" />`;
      html += `<col style="width: 18%;" />`;
      html += `<col style="width: 18%;" />`;
      html += `<col style="width: 16%;" />`;
      html += `<col style="width: 12%;" />`;
      html += `<col style="width: 12%;" />`;
      html += `</colgroup>`;

      html += `<thead>`;
      html += `<tr class="bg-amber-100 text-amber-950 font-bold border-b border-slate-400" style="background-color: #fef3c7 !important; color: #78350f !important;">`;
      DEFAULT_MONTHLY_PLANNING_HEADERS.forEach((h, i) => {
        const alignClass = i === 0 ? "text-center" : "text-left";
        html += `<th class="p-1 border border-slate-400 ${alignClass} font-bold">${escapeHtml(h)}</th>`;
      });
      html += `</tr>`;
      html += `</thead>`;

      html += `<tbody>`;

      block.rows.forEach((row) => {
        html += `<tr class="border-b border-slate-300" style="page-break-inside: avoid; break-inside: avoid;">`;
        row.slice(0, 7).forEach((cell, cIdx) => {
          const cellStyle = cIdx === 0
            ? "border border-slate-300 p-1 text-center font-bold bg-slate-50/50 align-top text-[10px]"
            : "border border-slate-300 p-1 align-top whitespace-normal break-words leading-tight text-[10px]";
          html += `<td class="${cellStyle}">${escapeHtml(cleanCellValue(cell.value))}</td>`;
        });
        html += `</tr>`;
      });

      html += `</tbody>`;
      html += `</table>`;

      // 4. Signature Block
      html += `<div class="flex justify-between items-center my-3 px-6 text-[11px] font-bold text-slate-800" style="display: flex; justify-content: space-between; margin-top: 12px; margin-bottom: 0px; font-weight: bold; font-size: 11px; page-break-inside: avoid; page-break-before: avoid;">`;
      html += `<div>✍️ विषय / वर्ग शिक्षक</div>`;
      html += `<div>✍️ मुख्याध्यापक</div>`;
      html += `</div>`;

      html += `</div>`; // end month-card-container
    });

    html += `</div>`; // end monthly-planning-pdf-root
    return html;
  };

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      setActiveCell(null);
      const updatedCommit = workingData.map((row) => row.map((cell) => ({ ...cell })));
      setTableData(updatedCommit);

      const updatedHtml = generateUpdatedHtml(updatedCommit);
      const meta = {
        updatedBy: role === "admin" ? "प्रशासक (Admin)" : "शिक्षक (Teacher)",
        updatedAt: new Date().toISOString(),
        role: role,
        planningType: "monthly",
      };

      if (onSaveTable) {
        await onSaveTable(updatedCommit, updatedHtml, meta);
      }

      setIsEditMode(false);
      setIsSaving(false);
      toast.success("🎉 मासिक नियोजनाचे बदल यशस्वीरित्या जतन झाले!");
    } catch (err: any) {
      setIsSaving(false);
      toast.error("सेव्ह करताना त्रुटी आली: " + (err?.message || "त्रुटी"));
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      toast.info("📄 महिनानिहाय A4 Landscape PDF तयार होत आहे...", { duration: 3000 });

      const gridToUse = isEditMode ? workingData : tableData;
      const cleanTableMarkup = generateUpdatedHtml(gridToUse) || propHtmlContent;

      const container = document.createElement("div");
      container.className = "pdf-export-container bg-white text-slate-900 font-sans";
      container.innerHTML = `
        <style>
          @media print {
            @page { size: A4 landscape; margin: 6mm; }
            body { -webkit-print-color-adjust: exact; }
          }
          .pdf-export-container { font-family: 'Noto Sans Devanagari', 'Inter', sans-serif; background: #ffffff; padding: 2px; margin: 0; }
          .month-card-container { page-break-inside: avoid !important; break-inside: avoid !important; margin: 0 !important; padding: 2px 0 !important; background: #ffffff; }
          .monthly-pdf-page-break { page-break-before: always !important; break-before: page !important; }
          .month-card-container:last-child { page-break-after: avoid !important; break-after: avoid !important; margin-bottom: 0 !important; }
          table.pdf-table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; margin-top: 4px; margin-bottom: 4px; }
          table.pdf-table th, table.pdf-table td { border: 1px solid #334155 !important; padding: 3.5px 5px !important; font-size: 10px !important; word-wrap: break-word !important; overflow-wrap: break-word !important; white-space: normal !important; vertical-align: top !important; }
          table.pdf-table th { background-color: #fef3c7 !important; color: #78350f !important; font-weight: bold !important; text-align: center !important; }
        </style>
        ${cleanTableMarkup}
      `;

      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const exportFileName = `${(fileName || `मासिक_नियोजन_${subjectName}`).replace(/\.[^/.]+$/, "")}_PDF.pdf`;

      const opt = {
        margin: [6, 6, 6, 6],
        filename: exportFileName,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
        pagebreak: {
          mode: ["css"],
          before: ".monthly-pdf-page-break"
        },
      };

      await html2pdf().set(opt).from(container).save();
      setIsExportingPdf(false);
      toast.success("🎉 महिनानिहाय PDF यशस्वीरित्या डाउनलोड झाली!");
    } catch (err: any) {
      setIsExportingPdf(false);
      console.error("Monthly PDF Export error:", err);
      window.print();
    }
  };

  const currentDisplayGrid = isEditMode ? workingData : tableData;

  return (
    <div className="w-full h-full flex flex-col gap-3 bg-slate-950 text-slate-100 p-2 sm:p-4 rounded-2xl overflow-hidden font-sans">
      {/* Top Header Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>📅 मासिक घटक नियोजन :</span>
              <span className="text-amber-400 font-extrabold">{subjectName}</span>
            </h2>
            <p className="text-xs text-slate-400 font-semibold">
              7-कॉलम अधिकृत मासिक घटक तक्ता {role === "admin" ? "(प्रशासक संपादन)" : "(शिक्षक संपादन)"}
            </p>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {isEditMode ? (
            <>
              <button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>💾 बदल सेव्ह करा (Save)</span>
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>✕ रद्द करा (Cancel)</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleEnterEditMode}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>✏️ एडिट मोड (Edit Mode)</span>
              </button>
              <button
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>📥 PDF डाऊनलोड</span>
              </button>
            </>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="बंद करा"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Admin Row Operation Toolbar in Edit Mode */}
      {isEditMode && role === "admin" && (
        <div className="flex items-center justify-between gap-3 bg-amber-950/60 border border-amber-500/40 p-2.5 rounded-xl px-4">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>प्रशासक संपादन मोड: ओळ जोडा किंवा हटवा</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddRow}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>नवीन ओळ जोडा</span>
            </button>
            {hasUnsavedChanges && (
              <button
                onClick={handleReset}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>बदल पूर्ववत करा</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Excel Structure Container */}
      <div className="w-full flex-1 bg-white rounded-xl shadow-2xl border border-slate-300 overflow-auto p-4 text-slate-900 max-h-[calc(100vh-160px)] min-h-0">
        {/* 1. Main Header Title Banner */}
        <div className="bg-indigo-900 text-white text-center font-bold text-base md:text-lg py-2.5 px-4 rounded-t-lg shadow-sm">
          अभ्यासक्रमाचे मासिक व घटक नियोजन माहे - {subjectName}
        </div>

        {/* 2. Sub-Header Metadata Box (2-Row Grid) */}
        <div className="bg-slate-100 border-x border-b border-slate-300 px-4 py-2.5 text-xs md:text-sm font-semibold flex flex-col gap-1 rounded-b-lg mb-3">
          <div className="flex justify-between items-center border-b border-slate-200 pb-1">
            <span>इयत्ता : {title || "पहिली/दुसरी"}</span>
            <span>नियोजित तासिका : _________________</span>
          </div>
          <div className="flex justify-between items-center pt-0.5">
            <span>विषय : {subjectName}</span>
            <span>कामाचे दिवस : _________________</span>
          </div>
        </div>

        {/* 3. Strict 7-Column Table Viewport */}
        <div className="overflow-x-auto border border-slate-300 rounded-lg">
          <table className="w-full table-fixed text-left border-collapse text-slate-900 text-xs font-sans">
            <colgroup>
              {role === "admin" && isEditMode && <col className="w-[4%]" />}
              <col className="w-[6%]" />   {/* दिनांक */}
              <col className="w-[18%]" />  {/* पाठ / घटक / उपघटक */}
              <col className="w-[18%]" />  {/* अध्ययन निष्पत्ती */}
              <col className="w-[18%]" />  {/* अध्ययन मुद्दे / पाठ्यांश उद्देश */}
              <col className="w-[16%]" />  {/* अध्ययन अनुभवाचे स्वरूप */}
              <col className="w-[12%]" />  {/* साधन तंत्रे */}
              <col className="w-[12%]" />  {/* आवश्यक साहित्य */}
            </colgroup>

            <thead>
              <tr className="bg-amber-100 text-amber-950 font-bold border-b-2 border-amber-300">
                {role === "admin" && isEditMode && (
                  <th className="p-2 border border-slate-300 text-center w-10 bg-amber-200">क्रिया</th>
                )}
                {DEFAULT_MONTHLY_PLANNING_HEADERS.map((h, i) => (
                  <th
                    key={i}
                    className={`p-2 border border-slate-300 ${i === 0 ? "text-center" : "text-left"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {currentDisplayGrid.map((row, rowIndex) => {
                if (!isEditMode && isRowInvalid(row)) return null;

                const isBanner = isMonthlyBannerRow(row);
                const spanWidth = role === "admin" && isEditMode ? 8 : 7;

                if (isBanner) {
                  const rawVal = row.find((c) => c.value && c.value.trim() !== "")?.value;
                  const bannerText = title && title.length > 5 ? title : (rawVal || `अभ्यासक्रमाचे मासिक व घटक नियोजन | विषय: ${subjectName}`);
                  return (
                    <tr key={rowIndex} className="bg-amber-100 text-amber-950 font-bold text-center border-y-2 border-amber-300">
                      <td colSpan={spanWidth} className="py-2.5 px-4 text-sm tracking-wide font-extrabold text-amber-950">
                        ✨ {bannerText}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={rowIndex} className="hover:bg-slate-50 border-b border-slate-200 transition-colors">
                    {role === "admin" && isEditMode && (
                      <td className="border border-slate-300 p-1 text-center align-middle bg-white">
                        <button
                          onClick={() => handleDeleteRow(rowIndex)}
                          className="p-1 rounded text-rose-600 hover:bg-rose-100"
                          title="ओळ हटवा"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}

                    {row.slice(0, 7).map((cell, colIndex) => {
                      const isEditing = isEditMode && activeCell?.rIdx === rowIndex && activeCell?.cIdx === colIndex;

                      return (
                        <td
                          key={colIndex}
                          onClick={() => {
                            if (isEditMode && !isEditing) {
                              setActiveCell({ rIdx: rowIndex, cIdx: colIndex });
                            }
                          }}
                          className={`border border-slate-300 p-2 align-top text-slate-800 ${
                            colIndex === 0 ? "text-center font-semibold bg-slate-50/50" : "whitespace-normal break-words leading-snug"
                          } ${
                            isEditMode
                              ? isEditing
                                ? "bg-amber-50/90 ring-2 ring-amber-400 z-10 relative"
                                : "hover:bg-amber-100/50 cursor-pointer transition-colors"
                              : ""
                          }`}
                        >
                          {isEditing ? (
                            <AutoResizeTextarea
                              autoFocus
                              value={cleanCellValue(cell.value) ?? ""}
                              onChange={(val) => handleCellChange(rowIndex, colIndex, val)}
                              onBlur={() => setActiveCell(null)}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  setActiveCell(null);
                                }
                              }}
                            />
                          ) : (
                            <div className={`min-h-[26px] ${isEditMode ? "select-none" : ""}`}>
                              {cleanCellValue(cell.value) || (isEditMode ? <span className="text-amber-500/70 italic text-xs">(रिक्त)</span> : "")}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 4. Signature Block */}
        <div className="flex justify-between items-center mt-6 px-6 text-xs md:text-sm font-bold text-slate-800">
          <div>विषय / वर्ग शिक्षक</div>
          <div>मुख्याध्यापक</div>
        </div>
      </div>
    </div>
  );
};
