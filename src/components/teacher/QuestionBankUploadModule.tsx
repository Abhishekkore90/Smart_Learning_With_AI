import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Upload,
  Download,
  FileText,
  Search,
  BookOpen,
  Sparkles,
  ChevronDown,
  Eye,
  Edit3,
  Save,
  X,
  Loader2,
  RotateCcw,
  Trash2,
  Plus,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QuestionBankUploadModuleProps {
  rawExcelRows?: any[][];
  subjectName?: string;
  className?: string;
  academicYear?: string;
  role?: "admin" | "user";
  onFileUpload?: (file: File) => void;
  onSave?: (data: { metadata: QuestionBankMeta; rows: string[][] }) => Promise<void>;
}

interface QuestionBankMeta {
  year: string;
  formNo: string;
  std: string;
  subject: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const QB_HEADERS = [
  "प्रश्न क्रमांक",
  "क्षेत्र घटक",
  "प्रश्न",
  "गुण",
  "मूल्यमापन",
  "प्रश्नाचा प्रकार",
  "उद्दिष्ट",
  "वैशिष्ट्य",
  "अध्ययन निष्पत्ती क्रमांक",
];

const QB_COL_WIDTHS = ["5%", "12%", "28%", "5%", "8%", "9%", "11%", "12%", "10%"];

// ─── Helper: Escape HTML for PDF export ──────────────────────────────────────

const escapeHtml = (text: any): string => {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// ─── Row validity check ──────────────────────────────────────────────────────

const isQBRowInvalid = (rowStrings: string[]): boolean => {
  if (!rowStrings || rowStrings.length === 0) return true;

  const fullText = rowStrings.join("").trim();
  if (!fullText) return true;

  const col0 = rowStrings[0] || "";

  // Skip metadata / structural header rows
  if (
    col0.includes("शैक्षणिक वर्ष") ||
    col0.includes("इयत्त्ता") ||
    col0.includes("इयत्ता") ||
    col0.includes("प्रपत्र क्रमांक") ||
    col0.includes("विषय / वर्ग शिक्षक") ||
    col0.includes("मुख्याध्यापक") ||
    col0.includes("स्वाक्षरी")
  ) {
    return true;
  }

  // Skip rows that are exact header duplicates
  if (col0 === "प्रश्न क्रमांक" || col0 === "अ.क्र." || col0 === "Sr No") {
    return true;
  }

  // Must have actual content in at least one of: Col 0 (Qno), Col 1 (Area), Col 2 (Question), or Col 8 (LO)
  const hasContent = (rowStrings[0] || "").trim() || (rowStrings[1] || "").trim() || (rowStrings[2] || "").trim() || (rowStrings[8] || "").trim();
  if (!hasContent) return true;

  return false;
};

// ─── Auto-resize Textarea ────────────────────────────────────────────────────

const AutoResizeTextarea: React.FC<{
  value: string;
  onChange: (val: string) => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  className?: string;
}> = ({ value, onChange, onBlur, autoFocus = false, className = "" }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.max(32, el.scrollHeight)}px`;
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
      rows={1}
      className={`w-full min-h-[32px] resize-none overflow-hidden box-border border-2 border-indigo-400 bg-indigo-50/50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/50 p-1.5 rounded shadow-xs transition-all text-xs text-slate-900 font-sans leading-relaxed ${className}`}
    />
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const QuestionBankUploadModule: React.FC<QuestionBankUploadModuleProps> = ({
  rawExcelRows,
  subjectName = "मराठी",
  className = "पाचवी",
  academicYear = "२०२६-२७",
  role = "user",
  onFileUpload,
  onSave,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedRows, setEditedRows] = useState<string[][]>([]);
  const [activeCell, setActiveCell] = useState<{ rIdx: number; cIdx: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // ─── Parse raw Excel data ────────────────────────────────────────────────

  const parsedData = useMemo(() => {
    const defaultMeta: QuestionBankMeta = {
      year: academicYear,
      formNo: "०८",
      std: className,
      subject: subjectName,
    };

    if (!rawExcelRows || !Array.isArray(rawExcelRows) || rawExcelRows.length === 0) {
      return { metadata: defaultMeta, rows: [] as string[][] };
    }

    let detectedYear = academicYear;
    let detectedStd = className;
    let detectedSubject = subjectName;
    const cleanRows: string[][] = [];

    rawExcelRows.forEach((row) => {
      if (!row || !Array.isArray(row)) return;

      const rowStrings = row.map((cell) =>
        cell !== null && cell !== undefined ? String(cell).replace(/\$\s*/g, "").trim() : ""
      );

      const col0 = rowStrings[0] || "";

      // Auto-extract metadata
      if (col0.includes("शैक्षणिक वर्ष")) {
        const parts = col0.split(/[-–]/);
        if (parts.length > 1) detectedYear = parts.slice(1).join("-").trim();
        else detectedYear = col0.replace("शैक्षणिक वर्ष", "").trim();
        return;
      }

      if (col0.includes("इयत्त्ता") || col0.includes("इयत्ता")) {
        // Extract standard
        const stdMatch = col0.match(/इयत्त?ता\s*[-–:]\s*(.*?)(?:\s*विषय|$)/);
        if (stdMatch && stdMatch[1]) detectedStd = stdMatch[1].trim();

        // Extract subject
        if (col0.includes("विषय")) {
          const subMatch = col0.split(/विषय\s*[-–:]/);
          if (subMatch[1]) detectedSubject = subMatch[1].trim();
        }
        return;
      }

      // Filter out invalid/structural rows
      if (isQBRowInvalid(rowStrings)) return;

      // Pad to 9 columns
      while (rowStrings.length < 9) rowStrings.push("");
      cleanRows.push(rowStrings.slice(0, 9));
    });

    return {
      metadata: {
        year: detectedYear || academicYear,
        formNo: "०८",
        std: detectedStd || className,
        subject: detectedSubject || subjectName,
      },
      rows: cleanRows,
    };
  }, [rawExcelRows, subjectName, className, academicYear]);

  // ─── Search filter ───────────────────────────────────────────────────────

  const displayRows = useMemo(() => {
    const source = isEditMode ? editedRows : parsedData.rows;
    if (!searchTerm.trim()) return source;
    const term = searchTerm.toLowerCase();
    return source.filter((row) =>
      row.some((cell) => cell.toLowerCase().includes(term))
    );
  }, [parsedData.rows, editedRows, searchTerm, isEditMode]);

  // ─── Edit Mode Handlers ──────────────────────────────────────────────────

  const handleEnterEditMode = () => {
    setEditedRows(parsedData.rows.map((r) => [...r]));
    setActiveCell(null);
    setIsEditMode(true);
    toast.info("✏️ प्रश्नपेढी संपादन मोड सुरू झाला (Click to Edit)");
  };

  const handleCellChange = useCallback((rowIndex: number, colIndex: number, newValue: string) => {
    setEditedRows((prev) =>
      prev.map((row, rIdx) => {
        if (rIdx === rowIndex) {
          const newRow = [...row];
          newRow[colIndex] = newValue;
          return newRow;
        }
        return row;
      })
    );
  }, []);

  const handleAddRow = () => {
    setEditedRows((prev) => [...prev, Array(9).fill("")]);
    toast.info("➕ नवीन ओळ जोडली.");
  };

  const handleDeleteRow = (rIdx: number) => {
    if (editedRows.length <= 1) {
      toast.error("कमीत कमी एक ओळ आवश्यक.");
      return;
    }
    setEditedRows((prev) => prev.filter((_, i) => i !== rIdx));
    toast.success("🗑️ ओळ हटवली.");
  };

  const handleCancelEdit = () => {
    setEditedRows([]);
    setActiveCell(null);
    setIsEditMode(false);
    toast.info("संपादन रद्द केले.");
  };

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      setActiveCell(null);
      if (onSave) {
        await onSave({ metadata: parsedData.metadata, rows: editedRows });
      }
      setIsEditMode(false);
      setIsSaving(false);
      toast.success("🎉 प्रश्नपेढी बदल यशस्वीरित्या जतन झाले!");
    } catch (err: any) {
      setIsSaving(false);
      toast.error("सेव्ह करताना त्रुटी: " + (err?.message || "त्रुटी"));
    }
  };

  // ─── PDF Export ──────────────────────────────────────────────────────────

  const generatePdfHtml = (): string => {
    const { metadata } = parsedData;
    const rows = isEditMode ? editedRows : parsedData.rows;

    let html = `<div class="qb-pdf-root" style="background: #fff; font-family: 'Noto Sans Devanagari','Inter',sans-serif; padding: 4px;">`;

    // Title
    html += `<div style="background-color: #1e1b4b; color: #fff; text-align: center; font-weight: bold; padding: 8px; font-size: 13px; border-radius: 6px 6px 0 0;">`;
    html += `शैक्षणिक वर्ष - ${escapeHtml(metadata.year)} | प्रपत्र क्रमांक - ०८ : प्रश्नपेढी`;
    html += `</div>`;

    // Sub header
    html += `<div style="background-color: #fef3c7; border: 1px solid #fbbf24; padding: 6px 12px; font-size: 11px; font-weight: bold; color: #78350f; display: flex; justify-content: space-between; border-radius: 0 0 6px 6px; margin-bottom: 8px;">`;
    html += `<span>इयत्ता - ${escapeHtml(metadata.std)}</span>`;
    html += `<span>विषय - ${escapeHtml(metadata.subject)}</span>`;
    html += `</div>`;

    // Table
    html += `<table style="width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 10px;">`;
    html += `<colgroup>`;
    QB_COL_WIDTHS.forEach((w) => {
      html += `<col style="width: ${w};" />`;
    });
    html += `</colgroup>`;

    // Thead
    html += `<thead><tr style="background-color: #e0e7ff; color: #312e81; font-weight: bold;">`;
    QB_HEADERS.forEach((h, i) => {
      const align = [0, 3, 4, 5, 8].includes(i) ? "text-align: center;" : "text-align: left;";
      html += `<th style="border: 1px solid #64748b; padding: 4px 5px; ${align} font-size: 10px;">${escapeHtml(h)}</th>`;
    });
    html += `</tr></thead>`;

    // Tbody
    html += `<tbody>`;
    rows.forEach((row) => {
      const isSection = row[2] && row[2].trim().startsWith("*");
      const bgStyle = isSection ? "background-color: #fffbeb;" : "";
      const fontStyle = isSection ? "font-weight: bold;" : "";

      html += `<tr style="border-bottom: 1px solid #e2e8f0; page-break-inside: avoid; ${bgStyle} ${fontStyle}">`;
      row.slice(0, 9).forEach((cell, cIdx) => {
        const align = [0, 3, 4, 5, 8].includes(cIdx) ? "text-align: center;" : "text-align: left;";
        html += `<td style="border: 1px solid #cbd5e1; padding: 3px 5px; vertical-align: top; word-wrap: break-word; white-space: normal; font-size: 10px; ${align}">${escapeHtml(cell)}</td>`;
      });
      html += `</tr>`;
    });
    html += `</tbody></table>`;

    // Signature
    html += `<div style="display: flex; justify-content: space-between; margin-top: 16px; font-weight: bold; font-size: 11px; page-break-inside: avoid;">`;
    html += `<div>✍️ विषयाध्यापक / वर्ग शिक्षक</div>`;
    html += `<div>✍️ मुख्याध्यापक स्वाक्षरी</div>`;
    html += `</div>`;

    html += `</div>`;
    return html;
  };

  const handleExportPDF = async () => {
    try {
      setIsExportingPdf(true);
      toast.info("📄 प्रश्नपेढी A4 Landscape PDF तयार होत आहे...", { duration: 3000 });

      const pdfHtml = generatePdfHtml();
      const container = document.createElement("div");
      container.className = "qb-pdf-container";
      container.innerHTML = `
        <style>
          @media print {
            @page { size: A4 landscape; margin: 6mm; }
            body { -webkit-print-color-adjust: exact; }
          }
          .qb-pdf-container { font-family: 'Noto Sans Devanagari','Inter',sans-serif; background: #fff; padding: 2px; margin: 0; }
        </style>
        ${pdfHtml}
      `;

      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const exportFileName = `प्रश्नपेढी_${parsedData.metadata.subject}_इयत्ता_${parsedData.metadata.std}.pdf`;

      const opt = {
        margin: [6, 6, 6, 6],
        filename: exportFileName,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
        pagebreak: { mode: ["css"], avoid: ["tr"] },
      };

      await html2pdf().set(opt).from(container).save();
      setIsExportingPdf(false);
      toast.success("🎉 प्रश्नपेढी PDF यशस्वीरित्या डाउनलोड झाली!");
    } catch (err: any) {
      setIsExportingPdf(false);
      console.error("QB PDF Export error:", err);
      toast.error("PDF डाउनलोड अयशस्वी: " + (err?.message || ""));
    }
  };

  // ─── File Upload Handler ─────────────────────────────────────────────────

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (onFileUpload) {
      onFileUpload(file);
    }
    toast.success(`📁 फाईल "${file.name}" यशस्वीरित्या निवडली!`);
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  const { metadata } = parsedData;

  return (
    <div className="w-full h-full flex flex-col gap-3 bg-slate-950 text-slate-100 p-2 sm:p-4 rounded-2xl overflow-hidden font-sans">
      {/* Top Header Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>📋 विषयनिहाय प्रश्नपेढी :</span>
              <span className="text-indigo-400 font-extrabold">{metadata.subject}</span>
            </h2>
            <p className="text-xs text-slate-400 font-semibold">
              इयत्ता : <span className="text-white">{metadata.std}</span> | शैक्षणिक वर्ष : <span className="text-white">{metadata.year}</span> | प्रपत्र क्र. ०८
            </p>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* File Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>📤 फाईल अपलोड</span>
          </button>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="शोधा..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-36"
            />
          </div>

          {isEditMode ? (
            <>
              <button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>💾 सेव्ह करा</span>
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>रद्द करा</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleEnterEditMode}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>✏️ एडिट मोड</span>
              </button>
              <button
                onClick={handleExportPDF}
                disabled={isExportingPdf}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>📄 PDF डाऊनलोड</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Admin Add/Delete Row Toolbar */}
      {isEditMode && role === "admin" && (
        <div className="flex items-center justify-between gap-3 bg-indigo-950/60 border border-indigo-500/40 p-2.5 rounded-xl px-4">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>प्रशासक संपादन: ओळ जोडा / हटवा</span>
          </div>
          <button
            onClick={handleAddRow}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>नवीन ओळ</span>
          </button>
        </div>
      )}

      {/* Main Table Container */}
      <div className="w-full flex-1 bg-white rounded-xl shadow-2xl border border-slate-300 overflow-auto p-4 text-slate-900 max-h-[calc(100vh-180px)] min-h-0">
        {/* Title Banner */}
        <div className="bg-indigo-900 text-white font-bold text-center py-2.5 px-4 text-sm rounded-t-lg">
          शैक्षणिक वर्ष - {metadata.year} | प्रपत्र क्रमांक - ०८ : प्रश्नपेढी
        </div>

        {/* Sub Metadata Bar */}
        <div className="bg-amber-100 border-x border-b border-amber-300 px-4 py-2 text-xs font-bold text-amber-950 flex justify-between rounded-b-lg mb-3">
          <span>इयत्ता - {metadata.std}</span>
          <span>विषय - {metadata.subject}</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-3 text-xs text-slate-500 font-semibold px-1">
          <span>एकूण प्रश्न: <span className="text-indigo-700 font-bold">{displayRows.length}</span></span>
          {searchTerm && (
            <span className="text-amber-600">
              शोध: "{searchTerm}" ({displayRows.length} निकाल)
            </span>
          )}
        </div>

        {/* 9-Column Table */}
        <div className="overflow-x-auto border border-slate-300 rounded-lg">
          <table className="w-full table-fixed border-collapse text-xs text-slate-900">
            <colgroup>
              {role === "admin" && isEditMode && <col style={{ width: "4%" }} />}
              {QB_COL_WIDTHS.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>

            <thead>
              <tr className="bg-indigo-100 font-bold text-indigo-950 border-b border-indigo-300">
                {role === "admin" && isEditMode && (
                  <th className="p-2 border border-slate-300 text-center bg-indigo-200 w-10">क्रिया</th>
                )}
                {QB_HEADERS.map((h, i) => (
                  <th
                    key={i}
                    className={`p-2 border border-slate-300 ${[0, 3, 4, 5, 8].includes(i) ? "text-center" : "text-left"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {displayRows.length > 0 ? (
                displayRows.map((row, rIdx) => {
                  const isMainSection = row[2] && row[2].trim().startsWith("*");

                  return (
                    <tr
                      key={rIdx}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isMainSection ? "bg-amber-50/80 font-bold text-slate-950" : ""
                      }`}
                    >
                      {role === "admin" && isEditMode && (
                        <td className="border border-slate-300 p-1 text-center align-middle bg-white">
                          <button
                            onClick={() => handleDeleteRow(rIdx)}
                            className="p-1 rounded text-rose-600 hover:bg-rose-100"
                            title="ओळ हटवा"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}

                      {row.slice(0, 9).map((cell, cIdx) => {
                        const isEditing = isEditMode && activeCell?.rIdx === rIdx && activeCell?.cIdx === cIdx;
                        const alignClass = [0, 3, 4, 5, 8].includes(cIdx) ? "text-center" : "text-left";

                        return (
                          <td
                            key={cIdx}
                            onClick={() => {
                              if (isEditMode && !isEditing) {
                                setActiveCell({ rIdx, cIdx });
                              }
                            }}
                            className={`border border-slate-300 p-2 align-top ${alignClass} ${
                              cIdx === 0 ? "font-bold text-slate-700" : ""
                            } ${cIdx === 2 ? "leading-snug break-words" : ""} ${
                              cIdx === 8 ? "font-mono text-[11px] text-indigo-900 font-semibold" : ""
                            } ${
                              isEditMode
                                ? isEditing
                                  ? "bg-indigo-50/90 ring-2 ring-indigo-400 z-10 relative"
                                  : "hover:bg-indigo-100/50 cursor-pointer transition-colors"
                                : ""
                            }`}
                          >
                            {isEditing ? (
                              <AutoResizeTextarea
                                autoFocus
                                value={cell ?? ""}
                                onChange={(val) => handleCellChange(rIdx, cIdx, val)}
                                onBlur={() => setActiveCell(null)}
                              />
                            ) : (
                              <div className={`min-h-[24px] ${isEditMode ? "select-none" : ""}`}>
                                {cell || (isEditMode ? <span className="text-indigo-400/70 italic text-xs">(रिक्त)</span> : "")}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={role === "admin" && isEditMode ? 10 : 9} className="p-8 text-center text-slate-400 italic">
                    <div className="flex flex-col items-center gap-3">
                      <FileText className="w-10 h-10 text-slate-300" />
                      <span className="text-sm font-semibold">कृपया विषयनिहाय प्रश्नपेढी एक्सेल फाईल अपलोड करा.</span>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>📤 फाईल अपलोड करा</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Signatures */}
        <div className="flex justify-between items-center mt-6 px-8 text-xs font-bold text-slate-800">
          <div>✍️ विषयाध्यापक / वर्ग शिक्षक</div>
          <div>✍️ मुख्याध्यापक स्वाक्षरी</div>
        </div>
      </div>
    </div>
  );
};

export default QuestionBankUploadModule;
