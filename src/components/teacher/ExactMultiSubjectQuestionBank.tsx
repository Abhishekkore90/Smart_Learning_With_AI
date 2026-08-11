import React, { useState, useMemo, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  Download,
  FileSpreadsheet,
  Search,
  Sparkles,
  Loader2,
  X,
  BookOpen,
  FileText,
  RotateCcw,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

// ─── Constants ───────────────────────────────────────────────────────────────

const QB_HEADERS = [
  "प्रश्न क्रमांक",
  "क्षेत्र घटक",
  "प्रश्न",
  "गुण",
  "मूल्यमापन (लेखी/तोंडी/प्रात्यक्षिक)",
  "प्रश्नाचा प्रकार (वस्तुनिष्ठ/लघुत्तरी/दीर्घोत्तरी)",
  "उद्दिष्ट",
  "वैशिष्टय",
  "अध्ययन निष्पत्ती क्रमांक",
];

const QB_COL_WIDTHS = ["5%", "12%", "28%", "5%", "8%", "9%", "11%", "12%", "10%"];

interface QBMetadata {
  academicYear: string;
  formNo: string;
  std: string;
  subject: string;
}

interface QuestionGroup {
  srNo: string;
  topic: string;
  rows: string[][];
}

// ─── Clean cell value helper (strips $) ─────────────────────────────────────

const cleanVal = (t: any): string => {
  if (t === null || t === undefined) return "";
  let str = String(t).trim();
  if (str.includes("$")) {
    str = str.replace(/\$\s*/g, "").trim();
  }
  return str;
};

// ─── Escape HTML for PDF ─────────────────────────────────────────────────────

const escHtml = (t: any): string => {
  if (t === null || t === undefined) return "";
  return String(t)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
};

export default function ExactMultiSubjectQuestionBank() {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [rawRows, setRawRows] = useState<any[][]>([]);
  const [fileName, setFileName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Dynamic Multi-Sheet Excel Upload Handler
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) return;
        const wb = XLSX.read(data, { type: "array" });

        setWorkbook(wb);
        setSheetNames(wb.SheetNames);

        // Auto-select first sheet initially
        const firstSheet = wb.SheetNames[0] || "";
        setActiveSheet(firstSheet);

        if (firstSheet && wb.Sheets[firstSheet]) {
          const ws = wb.Sheets[firstSheet];
          const rows: any[][] = XLSX.utils.sheet_to_json(ws, {
            header: 1,
            defval: "",
            blankrows: true,
          });
          setRawRows(rows);
        }
        toast.success(`✅ "${file.name}" पार्स झाली! (${wb.SheetNames.length} विषयी/सीट्स)`);
      } catch (err: any) {
        console.error("QB Excel parse error:", err);
        toast.error("एक्सेल पार्स अयशस्वी: " + (err?.message || ""));
      }
    };

    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }, []);

  // 2. Switch Sheet (e.g. Marathi -> Maths)
  const handleSheetChange = (sheetName: string) => {
    if (!workbook || !workbook.Sheets[sheetName]) return;
    setActiveSheet(sheetName);
    const ws = workbook.Sheets[sheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: "",
      blankrows: true,
    });
    setRawRows(data);
    toast.info(`📖 विषय/सीट बदलली: ${sheetName}`);
  };

  const handleReset = () => {
    setWorkbook(null);
    setSheetNames([]);
    setActiveSheet("");
    setRawRows([]);
    setFileName("");
    setSearchTerm("");
  };

  // 3. Exact Subject & Metadata Parser
  const parsedData = useMemo(() => {
    const defaultMeta: QBMetadata = {
      academicYear: "२०२३-२४",
      formNo: "०८",
      std: "पाचवी",
      subject: activeSheet || "निवडा",
    };

    if (!rawRows || rawRows.length === 0) {
      return { metadata: defaultMeta, questionGroups: [] as QuestionGroup[] };
    }

    let academicYear = "२०२३-२४";
    let formNo = "०८";
    let std = "पाचवी";
    let subject = activeSheet || "मराठी";

    const questionGroups: QuestionGroup[] = [];
    let currentGroup: QuestionGroup | null = null;

    rawRows.forEach((row) => {
      if (!row || !Array.isArray(row)) return;

      const rowStrings = row.map((cell: any) => cleanVal(cell));
      const fullText = rowStrings.join("");

      if (!fullText) return;

      const col0 = rowStrings[0] || "";

      // Auto-Extract Metadata Headers per Sheet
      if (col0.includes("शैक्षणिक वर्ष")) {
        const parts = col0.split(/[-–]/);
        if (parts.length > 1) {
          academicYear = col0.replace(/.*शैक्षणिक वर्ष\s*[-–:]*\s*/, "").trim() || parts.slice(1).join("-").trim();
        } else {
          academicYear = col0.replace("शैक्षणिक वर्ष", "").replace(/[-–:]/g, "").trim();
        }
        return;
      }

      if (col0.includes("इयत्त्ता") || col0.includes("इयत्ता")) {
        const stdMatch = col0.match(/इयत्त?ा\s*[-–:]\s*(.*?)(?:\s*विषय|$)/i);
        if (stdMatch && stdMatch[1]) std = stdMatch[1].trim();

        if (col0.includes("विषय")) {
          const parts = col0.split(/विषय\s*[-–:]/);
          if (parts[1] && parts[1].trim()) subject = parts[1].trim();
        }
        return;
      }

      if (col0.includes("प्रपत्र क्रमांक") || col0.includes("प्रश्न क्रमांक")) return;

      const srNo = rowStrings[0];
      const topic = rowStrings[1];
      const hasContent = rowStrings[2] || rowStrings[8] || rowStrings[4] || rowStrings[3];

      if (!hasContent) return;

      // Pad to 9 columns
      while (rowStrings.length < 9) rowStrings.push("");
      const cleanRow = rowStrings.slice(0, 9);

      // Group Question Rows
      if (srNo || topic) {
        if (currentGroup) questionGroups.push(currentGroup);
        currentGroup = {
          srNo: srNo || "",
          topic: topic || "",
          rows: [cleanRow],
        };
      } else if (currentGroup) {
        currentGroup.rows.push(cleanRow);
      } else {
        questionGroups.push({ srNo: "", topic: "", rows: [cleanRow] });
      }
    });

    if (currentGroup) questionGroups.push(currentGroup);

    return {
      metadata: { academicYear, formNo, std, subject },
      questionGroups,
    };
  }, [rawRows, activeSheet]);

  // Search Filter
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return parsedData.questionGroups;
    const term = searchTerm.toLowerCase();
    return parsedData.questionGroups.filter(
      (group) =>
        group.srNo.toLowerCase().includes(term) ||
        group.topic.toLowerCase().includes(term) ||
        group.rows.some((r) => r.some((cell) => cell.toLowerCase().includes(term)))
    );
  }, [parsedData.questionGroups, searchTerm]);

  // PDF Export Execution
  const handleExportPDF = async () => {
    try {
      setIsExportingPdf(true);
      toast.info("📄 PDF तयार होत आहे...", { duration: 3000 });

      const { metadata } = parsedData;

      let html = `<div style="background:#fff;font-family:'Noto Sans Devanagari','Inter',sans-serif;padding:4px;">`;
      html += `<table style="width:100%;table-layout:fixed;border-collapse:collapse;font-size:9.5px;border:2px solid #64748b;">`;
      html += `<colgroup>`;
      QB_COL_WIDTHS.forEach((w) => { html += `<col style="width:${w};" />`; });
      html += `</colgroup>`;

      html += `<thead>`;
      html += `<tr style="background:#1e1b4b;color:#fff;text-align:center;font-weight:bold;"><th colspan="9" style="padding:8px;font-size:12px;border:1px solid #64748b;">शैक्षणिक वर्ष - ${escHtml(metadata.academicYear)} | प्रपत्र क्रमांक - 08  प्रश्नपेढी</th></tr>`;
      html += `<tr style="background:#fef3c7;color:#78350f;text-align:center;font-weight:bold;"><th colspan="9" style="padding:6px;font-size:11px;border:1px solid #64748b;">इयत्ता - ${escHtml(metadata.std)} | विषय - ${escHtml(metadata.subject)}</th></tr>`;
      html += `<tr style="background:#f1f5f9;color:#0f172a;font-weight:bold;">`;
      QB_HEADERS.forEach((h, i) => {
        const align = [0, 3, 4, 5, 8].includes(i) ? "text-align:center;" : "text-align:left;";
        html += `<th style="border:1px solid #64748b;padding:4px;${align}font-size:9px;">${escHtml(h)}</th>`;
      });
      html += `</tr></thead><tbody>`;

      filteredGroups.forEach((group) => {
        const totalRows = group.rows.length;
        group.rows.forEach((row, rIdx) => {
          const isFirst = rIdx === 0;
          html += `<tr style="page-break-inside:avoid;">`;
          if (isFirst) {
            html += `<td rowspan="${totalRows}" style="border:1px solid #94a3b8;padding:4px;text-align:center;vertical-align:middle;font-weight:bold;">${escHtml(group.srNo)}</td>`;
            html += `<td rowspan="${totalRows}" style="border:1px solid #94a3b8;padding:4px;vertical-align:middle;font-weight:bold;word-wrap:break-word;">${escHtml(group.topic)}</td>`;
          }
          html += `<td style="border:1px solid #94a3b8;padding:4px;vertical-align:top;word-wrap:break-word;">${escHtml(row[2])}</td>`;
          html += `<td style="border:1px solid #94a3b8;padding:4px;text-align:center;vertical-align:top;">${escHtml(row[3])}</td>`;
          html += `<td style="border:1px solid #94a3b8;padding:4px;text-align:center;vertical-align:top;">${escHtml(row[4])}</td>`;
          html += `<td style="border:1px solid #94a3b8;padding:4px;text-align:center;vertical-align:top;">${escHtml(row[5])}</td>`;
          html += `<td style="border:1px solid #94a3b8;padding:4px;vertical-align:top;word-wrap:break-word;">${escHtml(row[6])}</td>`;
          html += `<td style="border:1px solid #94a3b8;padding:4px;vertical-align:top;word-wrap:break-word;">${escHtml(row[7])}</td>`;
          html += `<td style="border:1px solid #94a3b8;padding:4px;text-align:center;vertical-align:top;font-family:monospace;font-weight:bold;">${escHtml(row[8])}</td>`;
          html += `</tr>`;
        });
      });

      html += `</tbody></table>`;
      html += `<div style="display:flex;justify-content:space-between;margin-top:14px;padding:0 20px;font-weight:bold;font-size:11px;">`;
      html += `<div>✍️ विषयाध्यापक / वर्ग शिक्षक</div><div>✍️ मुख्याध्यापक स्वाक्षरी</div></div></div>`;

      const container = document.createElement("div");
      container.innerHTML = html;
      container.style.position = "absolute";
      container.style.left = "-9999px";
      document.body.appendChild(container);

      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const opt = {
        margin: [5, 5, 5, 5],
        filename: `प्रश्नपेढी_${metadata.subject}_इयत्ता_${metadata.std}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" as const },
      };

      await html2pdf().set(opt).from(container).save();
      document.body.removeChild(container);

      setIsExportingPdf(false);
      toast.success("🎉 प्रश्नपेढी PDF यशस्वीरित्या डाउनलोड झाली!");
    } catch (err: any) {
      setIsExportingPdf(false);
      console.error("QB PDF Error:", err);
      toast.error("PDF डाउनलोड अयशस्वी: " + (err?.message || ""));
    }
  };

  const { metadata } = parsedData;

  return (
    <div className="w-full h-full flex flex-col gap-4 p-4 bg-slate-100 min-h-screen text-slate-900 font-sans rounded-2xl">
      {/* Upper Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-300 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📚</span>
          <div>
            <h2 className="text-base font-bold text-indigo-950">
              विषयनिहाय प्रश्नपेढी फेचर (Multi-Subject Engine)
            </h2>
            <p className="text-xs text-slate-500">
              {fileName
                ? `फाईल: ${fileName} | वर्तमान विषय: ${metadata.subject}`
                : "कृपया प्रश्नपेढी Excel फाईल (.xlsx) अपलोड करा"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Dynamic Sheet Switcher */}
          {sheetNames.length > 1 && (
            <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-300 shadow-xs">
              <Layers className="w-4 h-4 text-amber-700" />
              <span className="text-xs font-bold text-amber-900">विषय / सीट निवडा:</span>
              <select
                value={activeSheet}
                onChange={(e) => handleSheetChange(e.target.value)}
                className="text-xs font-bold bg-white border border-amber-400 rounded px-2.5 py-1 text-indigo-900 focus:outline-none cursor-pointer shadow-xs"
              >
                {sheetNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer bg-indigo-700 hover:bg-indigo-800 text-white font-bold px-4 py-2 rounded-lg text-xs transition shadow flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" />
            📤 Excel फाईल निवडा
          </button>

          {parsedData.questionGroups.length > 0 && (
            <button
              onClick={handleExportPDF}
              disabled={isExportingPdf}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-xs shadow transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              📄 PDF डाउनलोड करा
            </button>
          )}

          {rawRows.length > 0 && (
            <button
              onClick={handleReset}
              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              रीसेट
            </button>
          )}
        </div>
      </div>

      {/* RENDER CONTAINER - EXACT MERGED BOX GRID */}
      <div
        id="exact-subject-pdf-render"
        className="bg-white border-2 border-slate-400 rounded-xl shadow-md p-4 overflow-auto max-h-[calc(100vh-200px)] min-h-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-xs text-slate-900 border-2 border-slate-400">
            <colgroup>
              {QB_COL_WIDTHS.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>

            <thead>
              {/* MERGED ROW 1: Academic Year & Form Title */}
              <tr className="bg-indigo-950 text-white font-bold text-center border-b border-slate-400">
                <th colSpan={9} className="p-2.5 text-sm">
                  शैक्षणिक वर्ष - {metadata.academicYear} | प्रपत्र क्रमांक - {metadata.formNo}  प्रश्नपेढी
                </th>
              </tr>

              {/* MERGED ROW 2: Std & Subject Meta */}
              <tr className="bg-amber-100 text-amber-950 font-bold text-center border-b border-slate-400">
                <th colSpan={9} className="p-2 text-xs">
                  इयत्ता - {metadata.std} | विषय - {metadata.subject}
                </th>
              </tr>

              {/* ROW 3: Main 9-Column Headers */}
              <tr className="bg-slate-100 font-bold text-slate-900 border-b-2 border-slate-400">
                {QB_HEADERS.map((h, i) => (
                  <th
                    key={i}
                    className={`p-2 border border-slate-400 ${
                      [0, 3, 4, 5, 8].includes(i) ? "text-center" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredGroups.length > 0 ? (
                filteredGroups.map((group, gIdx) => {
                  const totalRows = group.rows.length;

                  return group.rows.map((row, rIdx) => {
                    const isFirstRow = rIdx === 0;

                    return (
                      <tr key={`${gIdx}-${rIdx}`} className="border-b border-slate-300 hover:bg-slate-50">
                        {isFirstRow && (
                          <td
                            rowSpan={totalRows}
                            className="p-2 border border-slate-400 text-center align-middle font-bold text-slate-800 bg-white"
                          >
                            {group.srNo || ""}
                          </td>
                        )}

                        {isFirstRow && (
                          <td
                            rowSpan={totalRows}
                            className="p-2 border border-slate-400 align-middle font-bold text-slate-800 leading-snug break-words bg-white"
                          >
                            {group.topic || ""}
                          </td>
                        )}

                        <td className="p-2 border border-slate-400 align-top leading-snug break-words font-medium">
                          {row[2] || ""}
                        </td>

                        <td className="p-2 border border-slate-400 text-center align-top font-medium">
                          {row[3] || ""}
                        </td>

                        <td className="p-2 border border-slate-400 text-center align-top">
                          {row[4] || ""}
                        </td>

                        <td className="p-2 border border-slate-400 text-center align-top">
                          {row[5] || ""}
                        </td>

                        <td className="p-2 border border-slate-400 align-top leading-snug break-words">
                          {row[6] || ""}
                        </td>

                        <td className="p-2 border border-slate-400 align-top leading-snug break-words">
                          {row[7] || ""}
                        </td>

                        <td className="p-2 border border-slate-400 text-center align-top font-mono text-[11px] text-indigo-950 font-bold">
                          {row[8] || ""}
                        </td>
                      </tr>
                    );
                  });
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500 italic bg-slate-50">
                    📂 कोणतीही फाईल किंवा सीट निवडलेली नाही.
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
}
