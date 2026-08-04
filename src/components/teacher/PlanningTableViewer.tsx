import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ParsedTableResult, ParsedTableCell, isSubjectHeaderRow, isColumnHeaderRow } from "@/lib/tableParser";
import {
  Table as TableIcon,
  Eye,
  Download,
  Sparkles,
  AlertCircle,
  Layers,
  Edit3,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  FileText,
  X,
  Check,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";

interface PlanningTableViewerProps {
  parsedData?: ParsedTableResult | null;
  htmlContent?: string;
  gridData?: ParsedTableCell[][];
  fileUrl?: string;
  fileName?: string;
  title?: string;
  totalRowCount?: number;
  role?: "admin" | "user" | "teacher";
  recordId?: string;
  onClose?: () => void;
  onSaveTable?: (
    updatedGrid: ParsedTableCell[][],
    updatedHtml: string,
    metaInfo: { updatedBy: string; updatedAt: string; role: string }
  ) => Promise<void>;
}

const DEFAULT_ANNUAL_PLANNING_HEADERS = [
  "महिना",
  "आठवडा",
  "कामाचे दिवस",
  "प्राप्त तासिका",
  "विषय",
  "अध्ययन निष्पत्ती",
];

/**
 * Auto-expanding textarea without internal scrollbars or resize handles
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
      el.style.height = `${Math.max(38, el.scrollHeight)}px`;
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
      className={`w-full min-h-[38px] resize-none overflow-hidden box-border border-2 border-amber-400 bg-amber-50/40 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/50 p-1.5 rounded shadow-xs transition-all text-xs sm:text-sm text-slate-900 font-sans leading-relaxed ${className}`}
    />
  );
};

export const PlanningTableViewer: React.FC<PlanningTableViewerProps> = ({
  htmlContent: propHtmlContent = "",
  gridData: propGridData = [],
  fileUrl,
  fileName,
  title = "वार्षिक नियोजन तक्ता (Annual Planning Table)",
  totalRowCount: propTotalRowCount,
  role = "user",
  recordId,
  onClose,
  onSaveTable,
}) => {
  // ── State Engine: Master View State vs Working Edit Copy ─────────────────
  const [tableData, setTableData] = useState<ParsedTableCell[][]>(() =>
    propGridData.length > 0 ? propGridData.map((row) => row.map((cell) => ({ ...cell }))) : []
  );
  const [workingData, setWorkingData] = useState<ParsedTableCell[][]>(() =>
    propGridData.length > 0 ? propGridData.map((row) => row.map((cell) => ({ ...cell }))) : []
  );
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [activeCell, setActiveCell] = useState<{ rIdx: number; cIdx: number } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Synchronize master state when propGridData updates externally & normalize to 6 columns
  useEffect(() => {
    if (propGridData && propGridData.length > 0) {
      const normalized = propGridData.map((row) => {
        const r = row.map((cell) => ({ ...cell }));
        while (r.length < 6) {
          r.push({ value: "", rowspan: 1, colspan: 1, isMergedHidden: false });
        }
        return r;
      });
      setTableData(normalized);
      if (!isEditMode) {
        setWorkingData(normalized);
        setHasUnsavedChanges(false);
      }
    }
  }, [propGridData]);

  // Extract static table headers once ensuring all 6 mandatory columns (including 'विषय') are present
  const tableHeaders = useMemo(() => {
    const gridToInspect = tableData.length > 0 ? tableData : workingData;
    if (!gridToInspect || gridToInspect.length === 0) return DEFAULT_ANNUAL_PLANNING_HEADERS;

    const foundHeaderRow = gridToInspect.find((row) => isColumnHeaderRow(row));
    if (foundHeaderRow) {
      const vals = foundHeaderRow.filter((c) => !c.isMergedHidden && c.value).map((c) => c.value);
      if (vals.length === 6 && vals.some((v) => v.includes("विषय"))) return vals;
    }

    return DEFAULT_ANNUAL_PLANNING_HEADERS;
  }, [tableData, workingData]);

  const totalCount = (isEditMode ? workingData : tableData).length || propTotalRowCount || 0;
  const [activeTab, setActiveTab] = useState<"html" | "grid" | "preview">(
    (tableData.length > 0 || workingData.length > 0 || propGridData.length > 0) ? "grid" : propHtmlContent ? "html" : "preview"
  );

  // Enter Edit Mode: Deep clone tableData into workingData (On-demand cell rendering)
  const handleEnterEditMode = () => {
    const clone = tableData.map((row) => row.map((cell) => ({ ...cell })));
    setWorkingData(clone);
    setActiveTab("grid");
    setActiveCell(null);
    setIsEditMode(true);
    toast.info("✏️ संपादन मोड सुरू झाला (क्लिक करून संपादन करा)");
  };

  // Cell Change Handler (Immutably updates working copy using functional setter)
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

  // Add Row
  const handleAddRow = () => {
    const colCount = workingData[0]?.length || tableHeaders.length || 6;
    const newRow: ParsedTableCell[] = Array.from({ length: colCount }, () => ({
      value: "",
      rowspan: 1,
      colspan: 1,
      isMergedHidden: false,
    }));
    setWorkingData((prev) => [...prev, newRow]);
    setHasUnsavedChanges(true);
    toast.info("➕ नवीन ओळ जोडली गेली.");
  };

  // Delete Row (Admin only)
  const handleDeleteRow = (rIdx: number) => {
    if (workingData.length <= 1) {
      toast.error("कमीत कमी एक ओळ असणे आवश्यक आहे.");
      return;
    }
    setWorkingData((prev) => prev.filter((_, r) => r !== rIdx));
    setHasUnsavedChanges(true);
    toast.success("🗑️ ओळ हटवली गेली.");
  };

  // Reset Unsaved Changes to Master Table Data
  const handleReset = () => {
    const clone = tableData.map((row) => row.map((cell) => ({ ...cell })));
    setWorkingData(clone);
    setHasUnsavedChanges(false);
    toast.info("🔄 सर्व बदल पूर्ववत केले.");
  };

  // CANCEL HANDLER: Discard edits & revert working copy
  const handleCancelEdit = () => {
    const clone = tableData.map((row) => row.map((cell) => ({ ...cell })));
    setWorkingData(clone);
    setActiveCell(null);
    setHasUnsavedChanges(false);
    setIsEditMode(false);
    toast.info("संपादन मोड रद्द केला (Canceled Edits)");
  };

  // SAVE HANDLER: Commit workingData into tableData AND trigger re-render
  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      setActiveCell(null);
      // 1. Create a fresh deep copy of the edited workingData
      const updatedCommit = workingData.map((row) => row.map((cell) => ({ ...cell })));

      // 2. Update main table state directly via functional update to guarantee re-render
      setTableData(() => updatedCommit);

      const updatedHtml = generateUpdatedHtml(updatedCommit);
      const meta = {
        updatedBy: role === "admin" ? "प्रशासक (Admin)" : "शिक्षक (Teacher)",
        updatedAt: new Date().toISOString(),
        role: role,
      };

      // 3. Persist via parent callback / API / LocalStorage
      if (onSaveTable) {
        await onSaveTable(updatedCommit, updatedHtml, meta);
      }

      setHasUnsavedChanges(false);
      setIsSaving(false);

      // 4. Close Edit Mode ONLY AFTER state has been updated
      setIsEditMode(false);
      toast.success("🎉 बदल यशस्वीरित्या सेव्ह झाले!");
    } catch (err: any) {
      setIsSaving(false);
      toast.error("सेव्ह करताना त्रुटी आली: " + (err?.message || "त्रुटी"));
    }
  };

  // Helper to group sub-rows by month and compute rowSpans for single merged boxes
  const processMonthGroups = (grid: ParsedTableCell[][]) => {
    // Step 1: Pre-filter valid non-empty rows (remove ghost rows with blank subject & month)
    const cleanedGrid = grid.filter((row) => {
      if (!row || !Array.isArray(row)) return false;

      const isBanner = row.some((c) => c.value && (c.value.includes("इयत्ता :") || c.value.includes("इयत्ता:")));
      const isHeader = isColumnHeaderRow(row);
      const isSig = row.some((c) => c.value && c.value.includes("स्वाक्षरी"));

      // Structural rows (Headers, Banners, Signatures) are ALWAYS kept
      if (isBanner || isHeader || isSig) return true;

      // Data rows: Keep ONLY if Month (row[0]) OR Subject (row[4]) OR Outcomes (row[5]) has actual text
      const monthText = (row[0]?.value || "").trim();
      const subjectText = (row[4]?.value || "").trim();
      const outcomeText = (row[5]?.value || "").trim();

      return monthText !== "" || subjectText !== "" || outcomeText !== "";
    });

    const processed: {
      row: ParsedTableCell[];
      rIdx: number;
      isBannerRow: boolean;
      isHeaderRow: boolean;
      isSignatureRow: boolean;
      isFirstOfGroup: boolean;
      rowSpan: number;
    }[] = [];

    let i = 0;
    while (i < cleanedGrid.length) {
      const row = cleanedGrid[i];

      const isBanner = row.some((c) => c.value && (c.value.includes("इयत्ता :") || c.value.includes("इयत्ता:")));
      const isHeader = isColumnHeaderRow(row);
      const isSig = row.some((c) => c.value && c.value.includes("स्वाक्षरी"));

      if (isBanner || isHeader || isSig) {
        processed.push({
          row,
          rIdx: i,
          isBannerRow: isBanner,
          isHeaderRow: isHeader,
          isSignatureRow: isSig,
          isFirstOfGroup: true,
          rowSpan: 1,
        });
        i++;
        continue;
      }

      const currentMonthVal = (row[0]?.value || "").trim();

      let span = 1;
      while (i + span < cleanedGrid.length) {
        const nextRow = cleanedGrid[i + span];

        const nextIsBanner = nextRow.some((c) => c.value && (c.value.includes("इयत्ता :") || c.value.includes("इयत्ता:")));
        const nextIsHeader = isColumnHeaderRow(nextRow);
        const nextIsSig = nextRow.some((c) => c.value && c.value.includes("स्वाक्षरी"));

        if (nextIsBanner || nextIsHeader || nextIsSig) break;

        const nextMonthVal = (nextRow[0]?.value || "").trim();

        if (nextMonthVal === "" || (currentMonthVal !== "" && nextMonthVal === currentMonthVal)) {
          span++;
        } else {
          break;
        }
      }

      for (let j = 0; j < span; j++) {
        processed.push({
          row: cleanedGrid[i + j],
          rIdx: i + j,
          isBannerRow: false,
          isHeaderRow: false,
          isSignatureRow: false,
          isFirstOfGroup: j === 0,
          rowSpan: span,
        });
      }

      i += span;
    }

    return processed;
  };

  // Helper to split table grid into distinct subject sections for clean page breaking
  const splitGridBySubjects = (grid: ParsedTableCell[][]) => {
    const groups: {
      subjectName: string;
      bannerText: string;
      headerRow?: ParsedTableCell[];
      signatureRow?: ParsedTableCell[];
      rows: ParsedTableCell[][];
    }[] = [];

    let currentSubjectName = "वार्षिक नियोजन";
    let currentBannerText = "";
    let currentHeaderRow: ParsedTableCell[] | undefined = undefined;
    let currentSignatureRow: ParsedTableCell[] | undefined = undefined;
    let currentRows: ParsedTableCell[][] = [];

    grid.forEach((row) => {
      if (!row || row.length === 0) return;

      const isBannerRow = row.some((c) => c.value && (c.value.includes("इयत्ता :") || c.value.includes("इयत्ता:")));
      const isHeaderRow = isColumnHeaderRow(row);
      const isSignatureRow = row.some((c) => c.value && c.value.includes("स्वाक्षरी"));

      if (isBannerRow) {
        const bannerVal = row.find((c) => c.value && c.value.includes("इयत्ता :"))?.value;
        if (bannerVal) currentBannerText = bannerVal;
        return;
      }

      if (isHeaderRow) {
        const subjCellVal = row[4]?.value || "";
        if (subjCellVal.includes("विषय")) {
          if (currentRows.length > 0) {
            groups.push({
              subjectName: currentSubjectName,
              bannerText: currentBannerText,
              headerRow: currentHeaderRow,
              signatureRow: currentSignatureRow,
              rows: currentRows,
            });
            currentRows = [];
          }
          currentSubjectName = subjCellVal.replace("📌", "").trim();
          currentHeaderRow = row;
        }
        return;
      }

      if (isSignatureRow) {
        currentSignatureRow = row;
        return;
      }

      const monthText = (row[0]?.value || "").trim();
      const subjectText = (row[4]?.value || "").trim();
      const outcomeText = (row[5]?.value || "").trim();

      if (monthText !== "" || subjectText !== "" || outcomeText !== "") {
        currentRows.push(row);
      }
    });

    if (currentRows.length > 0 || groups.length === 0) {
      groups.push({
        subjectName: currentSubjectName,
        bannerText: currentBannerText,
        headerRow: currentHeaderRow,
        signatureRow: currentSignatureRow,
        rows: currentRows.length > 0 ? currentRows : grid.filter((r) => !isColumnHeaderRow(r)),
      });
    }

    return groups;
  };

  // Generate Clean Subject-wise Structured HTML with Page Breaks & Explicit Column Widths
  const generateUpdatedHtml = (grid: ParsedTableCell[][]): string => {
    if (grid.length === 0) return "";

    const groups = splitGridBySubjects(grid);

    let html = `<div class="pdf-export-wrapper">`;

    groups.forEach((group, sIdx) => {
      const pageBreakClass = sIdx > 0 ? "subject-pdf-page pdf-page-break" : "subject-pdf-page";
      const pageBreakStyle = sIdx > 0
        ? "page-break-before: always; break-before: page; page-break-inside: avoid; margin-bottom: 0px; padding-bottom: 0px;"
        : "page-break-inside: avoid; margin-bottom: 0px; padding-bottom: 0px;";

      html += `<div class="${pageBreakClass}" style="${pageBreakStyle}">`;

      // 1. Subject Header Banner
      const bannerText = group.bannerText || "इयत्ता : पहिली वार्षिक नियोजन सन :- 2026-27";
      html += `<div class="bg-indigo-900 text-white font-bold text-center border-b-2 border-indigo-950 p-2.5 rounded-t-lg mb-2 text-sm tracking-wide bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900" style="background-color: #1e1b4b !important; color: #ffffff !important; padding: 8px; text-align: center; font-weight: bold; border-radius: 6px; margin-bottom: 8px;">`;
      html += `✨ ${escapeHtml(bannerText)} | 📌 ${escapeHtml(group.subjectName)}`;
      html += `</div>`;

      // 2. Subject Table with Fixed Column Proportions (10%, 8%, 10%, 10%, 35%, 27%)
      html += `<table class="pdf-table w-full table-fixed border-collapse border border-slate-400 text-xs font-sans my-0" style="width: 100%; table-layout: fixed; border-collapse: collapse;">`;
      html += `<colgroup>`;
      html += `<col style="width: 10%;" />`;
      html += `<col style="width: 8%;" />`;
      html += `<col style="width: 10%;" />`;
      html += `<col style="width: 10%;" />`;
      html += `<col style="width: 35%;" />`;
      html += `<col style="width: 27%;" />`;
      html += `</colgroup>`;

      // Header Row
      html += `<thead>`;
      html += `<tr class="bg-amber-100 text-slate-900 font-bold border-b-2 border-amber-300 shadow-sm" style="background-color: #fef3c7 !important;">`;
      html += `<th class="p-2 border border-amber-300 text-center font-bold" style="width: 10%;">महिना</th>`;
      html += `<th class="p-2 border border-amber-300 text-center font-bold" style="width: 8%;">आठवडा</th>`;
      html += `<th class="p-2 border border-amber-300 text-center font-bold" style="width: 10%;">कामाचे दिवस</th>`;
      html += `<th class="p-2 border border-amber-300 text-center font-bold" style="width: 10%;">प्राप्त तासिका</th>`;
      html += `<th class="p-2 border border-amber-300 text-left bg-amber-200/80 font-extrabold text-amber-950" style="width: 35%;">📌 ${escapeHtml(group.subjectName)}</th>`;
      html += `<th class="p-2 border border-amber-300 text-left font-bold" style="width: 27%;">अध्ययन निष्पती</th>`;
      html += `</tr>`;
      html += `</thead>`;

      // Table Body
      html += `<tbody>`;

      const processedRows = processMonthGroups(group.rows);

      processedRows.forEach((item) => {
        const { row, isFirstOfGroup, rowSpan } = item;
        const rowspanAttr = rowSpan > 1 ? ` rowspan="${rowSpan}"` : "";

        html += `<tr class="border-b border-slate-300" style="page-break-inside: avoid; break-inside: avoid;">`;
        if (isFirstOfGroup) {
          html += `<td${rowspanAttr} class="border border-slate-300 p-2 text-center font-bold text-slate-900 bg-slate-50/50 align-top">${escapeHtml(row[0]?.value)}</td>`;
          html += `<td${rowspanAttr} class="border border-slate-300 p-2 text-center text-slate-800 align-top">${escapeHtml(row[1]?.value)}</td>`;
          html += `<td${rowspanAttr} class="border border-slate-300 p-2 text-center text-slate-800 align-top">${escapeHtml(row[2]?.value)}</td>`;
          html += `<td${rowspanAttr} class="border border-slate-300 p-2 text-center text-slate-800 align-top">${escapeHtml(row[3]?.value)}</td>`;
        }
        html += `<td class="border border-slate-300 p-2.5 text-slate-800 align-top whitespace-normal break-words leading-snug">${escapeHtml(row[4]?.value)}</td>`;
        if (isFirstOfGroup) {
          html += `<td${rowspanAttr} class="border border-slate-300 p-2.5 text-slate-800 align-top whitespace-normal break-words leading-snug bg-amber-50/20">${escapeHtml(row[5]?.value)}</td>`;
        }
        html += `</tr>`;
      });

      html += `</tbody>`;
      html += `</table>`;

      // 3. Subject Signatures
      const teacherSig = group.signatureRow?.find((c) => c.value && c.value.includes("शिक्षक"))?.value || "✍️ शिक्षक स्वाक्षरी";
      const hmSig = group.signatureRow?.find((c) => c.value && c.value.includes("मुख्याध्यापक"))?.value || "✍️ मुख्याध्यापक स्वाक्षरी";

      html += `<div class="flex justify-between items-center mt-3 px-6 pt-2 text-xs font-bold text-slate-800 border-t border-slate-300" style="display: flex; justify-space-between; margin-top: 10px; margin-bottom: 0px; padding-top: 8px; padding-bottom: 0px; font-weight: bold; font-size: 11px;">`;
      html += `<div>${escapeHtml(teacherSig)}</div>`;
      html += `<div>${escapeHtml(hmSig)}</div>`;
      html += `</div>`;

      html += `</div>`; // end subject-pdf-page
    });

    html += `</div>`; // end pdf-export-wrapper
    return html;
  };

  // Export PDF Handler (Subject-wise A4 Landscape PDF with Clean Zero-Spill Pagebreaks)
  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      toast.info("📄 विषयानुरूप A4 Landscape PDF तयार होत आहे...", { duration: 3000 });

      const gridToUse = isEditMode ? workingData : tableData;
      const cleanTableMarkup = generateUpdatedHtml(gridToUse) || propHtmlContent;

      const container = document.createElement("div");
      container.className = "pdf-export-container bg-white text-slate-900 font-sans";
      container.innerHTML = `
        <style>
          @media print {
            @page { size: A4 landscape; margin: 8mm; }
            body { -webkit-print-color-adjust: exact; }
          }
          .pdf-export-container { font-family: 'Noto Sans Devanagari', 'Inter', sans-serif; background: #ffffff; padding: 4px; margin: 0; }
          .subject-pdf-page { page-break-inside: avoid !important; break-inside: avoid !important; margin: 0 !important; padding: 4px 0 !important; background: #ffffff; }
          .pdf-page-break { page-break-before: always !important; break-before: page !important; }
          .subject-pdf-page:last-child { page-break-after: avoid !important; break-after: avoid !important; margin-bottom: 0 !important; }
          table.pdf-table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; margin-top: 6px; margin-bottom: 6px; }
          table.pdf-table th, table.pdf-table td { border: 1px solid #334155 !important; padding: 4.5px 6.5px !important; font-size: 10.5px !important; word-wrap: break-word !important; overflow-wrap: break-word !important; white-space: normal !important; vertical-align: top !important; }
          table.pdf-table th { background-color: #fef3c7 !important; color: #78350f !important; font-weight: bold !important; text-align: center !important; }
        </style>
        <div style="text-align: center; margin-bottom: 8px; border-bottom: 2px solid #0f172a; padding-bottom: 6px;">
          <h2 style="font-size: 16px; font-weight: 900; margin: 0; text-transform: uppercase; color: #0f172a;">${escapeHtml(title)}</h2>
          <p style="font-size: 11px; font-weight: bold; margin-top: 3px; color: #475569; margin-bottom: 0;">
            शैक्षणिक वर्ष 2026-27 | अधिकृत विषयनिहाय नियोजन अहवाल (Official Subject-wise Planning PDF)
          </p>
        </div>
        ${cleanTableMarkup}
      `;

      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const exportFileName = `${(fileName || "वार्षिक_नियोजन_2026-27").replace(/\.[^/.]+$/, "")}_PDF.pdf`;

      const opt = {
        margin: [8, 8, 8, 8],
        filename: exportFileName,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
        pagebreak: {
          mode: ["css"],
          before: ".pdf-page-break",
          avoid: ["tr", ".subject-pdf-page"],
        },
      };

      await html2pdf().set(opt).from(container).save();
      setIsExportingPdf(false);
      toast.success("🎉 विषयनिहाय PDF यशस्वीरित्या डाउनलोड झाली!");
    } catch (err: any) {
      setIsExportingPdf(false);
      console.error("PDF Export error:", err);
      window.print();
    }
  };

  const currentDisplayGrid = isEditMode ? workingData : tableData;

  if (!propHtmlContent && currentDisplayGrid.length === 0 && !fileUrl) {
    return (
      <div className="p-8 text-center bg-slate-900 border-2 border-dashed border-slate-800 rounded-xl text-slate-400">
        <AlertCircle className="w-10 h-10 mx-auto text-amber-500 mb-2" />
        <p className="font-medium text-base">कोणतीही नियोजन फाईल उपलब्ध नाही (No planning file loaded)</p>
      </div>
    );
  }

  const colCount = currentDisplayGrid[0]?.length || tableHeaders.length || 6;

  return (
    <div className="w-full flex-1 flex flex-col gap-4 text-slate-100 min-h-0 bg-slate-950">
      {/* Top Full-Width Header Bar */}
      <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-base sm:text-xl font-bold text-amber-400 flex items-center gap-2">
            ✨ {title}
          </h1>
          {totalCount > 0 && (
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-full border border-amber-500/30 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              {totalCount} ओळी
            </span>
          )}
          <span
            className={`px-3 py-1 text-xs font-semibold rounded-full border ${
              role === "admin"
                ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
            }`}
          >
            {role.toUpperCase()}
          </span>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 shadow transition text-xs sm:text-sm cursor-pointer disabled:opacity-50"
          >
            {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            <span>{isExportingPdf ? "PDF तयार होत आहे..." : "📄 PDF डाऊनलोड"}</span>
          </button>

          {!isEditMode ? (
            <button
              onClick={handleEnterEditMode}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 shadow transition text-xs sm:text-sm cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>✏️ एडिट मोड (Edit Mode)</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow transition text-xs sm:text-sm cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>💾 बदल सेव्ह करा (Save)</span>
              </button>

              <button
                onClick={handleCancelEdit}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 shadow transition text-xs sm:text-sm cursor-pointer border border-slate-600"
              >
                <X className="w-4 h-4 text-slate-400" />
                <span>✖️ रद्द करा (Cancel)</span>
              </button>
            </div>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold transition-all cursor-pointer border border-slate-700 flex items-center gap-1.5"
            >
              <X className="w-4 h-4 text-slate-400" />
              <span>मागे जा (Close)</span>
            </button>
          )}
        </div>
      </div>

      {/* Editing Toolbar Banner */}
      {isEditMode && (
        <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <span className="font-bold text-amber-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
            सेलमधील मजकूर थेट एडिट करा. संपादन झाल्यावर "💾 बदल सेव्ह करा" दाबा.
          </span>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleAddRow}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-500 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>नवीन ओळ जोडा</span>
            </button>

            {hasUnsavedChanges && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg font-bold hover:bg-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>रिसेट</span>
              </button>
            )}

            <button
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-sm disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>💾 बदल सेव्ह करा (Save)</span>
            </button>

            <button
              onClick={handleCancelEdit}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg font-bold shadow-sm"
            >
              <X className="w-3.5 h-3.5" />
              <span>✖️ रद्द करा (Cancel)</span>
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Table Viewport */}
      <div className="w-full flex-1 bg-white rounded-xl shadow-2xl border border-slate-700 overflow-auto max-h-[calc(100vh-140px)] min-h-0">
        {(activeTab === "grid" || isEditMode) && currentDisplayGrid.length > 0 && (
          <table className="w-full table-fixed text-left border-collapse text-slate-900 text-sm font-sans">
            <colgroup>
              {role === "admin" && isEditMode && <col className="w-[4%]" />}
              <col className="w-[9%]" />   {/* महिना */}
              <col className="w-[7%]" />   {/* आठवडा */}
              <col className="w-[10%]" />  {/* कामाचे दिवस */}
              <col className="w-[10%]" />  {/* प्राप्त तासिका */}
              <col className="w-[36%]" />  {/* विषय */}
              <col className="w-[28%]" />  {/* अध्ययन निष्पत्ती */}
            </colgroup>
            <tbody className="divide-y divide-slate-300">
              {(() => {
                const processed = processMonthGroups(currentDisplayGrid);

                return processed.map((item) => {
                  const { row, rIdx: rowIndex, isBannerRow, isHeaderRow, isSignatureRow, isFirstOfGroup, rowSpan } = item;
                  const spanWidth = role === "admin" && isEditMode ? colCount + 1 : colCount;

                  if (isBannerRow) {
                    const bannerText = row.find((c) => c.value && c.value.includes("इयत्ता :"))?.value || "इयत्ता : पहिली वार्षिक नियोजन सन :- 2026-27";
                    return (
                      <tr key={rowIndex} className="bg-indigo-900 text-white font-bold text-center border-t-4 border-indigo-950">
                        <td
                          colSpan={spanWidth}
                          className="py-2.5 px-4 text-base tracking-wide bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 text-white font-black"
                        >
                          ✨ {bannerText}
                        </td>
                      </tr>
                    );
                  }

                  if (isHeaderRow) {
                    const monthHeader = row[0]?.value || "महिना";
                    const weekHeader = row[1]?.value || "आठवडा";
                    const daysHeader = row[2]?.value || "कामाचे दिवस";
                    const periodsHeader = row[3]?.value || "प्राप्त तासिका";
                    const subjectHeader = row[4]?.value || "विषय";
                    const outcomesHeader = row[5]?.value || "अध्ययन निष्पती";

                    return (
                      <tr key={rowIndex} className="bg-amber-100 text-slate-900 font-bold sticky top-0 z-10 border-b-2 border-amber-300 shadow-sm">
                        {role === "admin" && isEditMode && (
                          <th className="p-3 border border-amber-200 text-center w-12 bg-amber-100 text-amber-950">
                            क्रिया
                          </th>
                        )}
                        <th className="p-3 border border-amber-200 text-center w-24">{monthHeader}</th>
                        <th className="p-3 border border-amber-200 text-center w-20">{weekHeader}</th>
                        <th className="p-3 border border-amber-200 text-center w-28">{daysHeader}</th>
                        <th className="p-3 border border-amber-200 text-center w-28">{periodsHeader}</th>
                        <th className="p-3 border border-amber-200 text-left bg-amber-200/80 font-extrabold text-amber-950 min-w-[200px]">
                          📌 {subjectHeader}
                        </th>
                        <th className="p-3 border border-amber-200 text-left">{outcomesHeader}</th>
                      </tr>
                    );
                  }

                  if (isSignatureRow) {
                    const teacherSig = row.find((c) => c.value && c.value.includes("शिक्षक"))?.value || "✍️ शिक्षक स्वाक्षरी";
                    const hmSig = row.find((c) => c.value && c.value.includes("मुख्याध्यापक"))?.value || "✍️ मुख्याध्यापक स्वाक्षरी";

                    return (
                      <tr key={rowIndex} className="bg-slate-100 font-bold text-slate-700 border-y-2 border-slate-300">
                        {role === "admin" && isEditMode && <td className="p-3 border border-slate-300"></td>}
                        <td className="p-3 border border-slate-300 text-center font-bold text-slate-800" colSpan={2}>
                          {teacherSig}
                        </td>
                        <td className="p-3 border border-slate-300" colSpan={2}></td>
                        <td className="p-3 border border-slate-300 text-center font-bold text-slate-800" colSpan={2}>
                          {hmSig}
                        </td>
                      </tr>
                    );
                  }

                  // Standard Data Rows
                  return (
                    <tr key={rowIndex} className="hover:bg-slate-50 border-b border-slate-200 transition-colors">
                      {role === "admin" && isEditMode && (
                        isFirstOfGroup ? (
                          <td rowSpan={rowSpan > 1 ? rowSpan : undefined} className="border border-slate-300 p-1 text-center align-middle bg-white">
                            <button
                              onClick={() => handleDeleteRow(rowIndex)}
                              className="p-1 rounded text-rose-600 hover:bg-rose-100"
                              title="ओळ हटवा"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        ) : null
                      )}

                      {/* Month, Week, Days, Period Columns (1st to 4th columns) - Rendered ONLY on 1st row of month group with rowSpan */}
                      {isFirstOfGroup && (
                        <>
                          {[0, 1, 2, 3].map((colIndex) => {
                            const cell = row[colIndex] || { value: "" };
                            const isEditing = isEditMode && activeCell?.rIdx === rowIndex && activeCell?.cIdx === colIndex;

                            return (
                              <td
                                key={colIndex}
                                rowSpan={rowSpan > 1 ? rowSpan : undefined}
                                onClick={() => {
                                  if (isEditMode && !isEditing) {
                                    setActiveCell({ rIdx: rowIndex, cIdx: colIndex });
                                  }
                                }}
                                className={`border border-slate-300 p-2 align-top text-slate-800 ${
                                  colIndex === 0 ? "font-bold text-center bg-slate-50/50" : "text-center"
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
                                    value={cell.value ?? ""}
                                    onChange={(val) => handleCellChange(rowIndex, colIndex, val)}
                                    onBlur={() => setActiveCell(null)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Escape") {
                                        setActiveCell(null);
                                      }
                                    }}
                                  />
                                ) : (
                                  <div className={`min-h-[28px] ${isEditMode ? "select-none" : ""}`}>
                                    {cell.value || (isEditMode ? <span className="text-amber-500/70 italic text-xs">(रिक्त)</span> : "")}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </>
                      )}

                      {/* Column 4: विषय / घटक (Rendered on EVERY row since each row has a topic) */}
                      {(() => {
                        const colIndex = 4;
                        const cell = row[colIndex] || { value: "" };
                        const isEditing = isEditMode && activeCell?.rIdx === rowIndex && activeCell?.cIdx === colIndex;

                        return (
                          <td
                            key={colIndex}
                            onClick={() => {
                              if (isEditMode && !isEditing) {
                                setActiveCell({ rIdx: rowIndex, cIdx: colIndex });
                              }
                            }}
                            className={`border border-slate-300 p-2.5 align-top text-slate-800 whitespace-normal break-words leading-snug ${
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
                                value={cell.value ?? ""}
                                onChange={(val) => handleCellChange(rowIndex, colIndex, val)}
                                onBlur={() => setActiveCell(null)}
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") {
                                    setActiveCell(null);
                                  }
                                }}
                              />
                            ) : (
                              <div className={`min-h-[28px] ${isEditMode ? "select-none" : ""}`}>
                                {cell.value || (isEditMode ? <span className="text-amber-500/70 italic text-xs">(रिक्त - घटक)</span> : "")}
                              </div>
                            )}
                          </td>
                        );
                      })()}

                      {/* Column 5: अध्ययन निष्पत्ती (SINGLE MERGED BOX PER MONTH BLOCK) */}
                      {isFirstOfGroup && (() => {
                        const colIndex = 5;
                        const cell = row[colIndex] || { value: "" };
                        const isEditing = isEditMode && activeCell?.rIdx === rowIndex && activeCell?.cIdx === colIndex;

                        return (
                          <td
                            key={colIndex}
                            rowSpan={rowSpan > 1 ? rowSpan : undefined}
                            onClick={() => {
                              if (isEditMode && !isEditing) {
                                setActiveCell({ rIdx: rowIndex, cIdx: colIndex });
                              }
                            }}
                            className={`border border-slate-300 p-2.5 align-top text-slate-800 whitespace-normal break-words leading-snug bg-amber-50/20 ${
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
                                value={cell.value ?? ""}
                                onChange={(val) => handleCellChange(rowIndex, colIndex, val)}
                                onBlur={() => setActiveCell(null)}
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") {
                                    setActiveCell(null);
                                  }
                                }}
                              />
                            ) : (
                              <div className={`min-h-[28px] ${isEditMode ? "select-none" : ""}`}>
                                {cell.value || (isEditMode ? <span className="text-amber-500/70 italic text-xs">(अध्ययन निष्पत्ती)</span> : "")}
                              </div>
                            )}
                          </td>
                        );
                      })()}
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        )}

        {/* Readonly Clean HTML View */}
        {activeTab === "html" && !isEditMode && propHtmlContent && (
          <div className="w-full h-full p-4 overflow-auto">
            <div
              className="prose max-w-none text-slate-900 leading-normal font-sans tracking-wide select-text text-sm [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:p-2.5 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2.5 [&_th]:bg-amber-100 [&_th]:text-amber-950 [&_th]:font-bold [&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_tr:nth-child(even)]:bg-slate-50/60"
              dangerouslySetInnerHTML={{ __html: propHtmlContent }}
            />
          </div>
        )}

        {/* PDF/Document View */}
        {activeTab === "preview" && !isEditMode && fileUrl && (
          <div className="w-full h-full bg-slate-900">
            <iframe
              src={
                fileUrl.startsWith("blob:") || fileUrl.startsWith("data:") || fileUrl.toLowerCase().includes(".pdf")
                  ? fileUrl
                  : `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`
              }
              className="w-full h-full border-0"
              title="File Preview"
            />
          </div>
        )}
      </div>
    </div>
  );
};

function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
