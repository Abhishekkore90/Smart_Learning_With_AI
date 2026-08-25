import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  PlanningDocumentRecord,
  DEFAULT_HEADERS,
} from "@/lib/smartPlanningParser";
import {
  extractSubjectSectionsFromExcel,
  splitRowsIntoSubjectSections,
  AnnualPlanningWorkbook,
  SubjectSection,
} from "@/lib/smartSubjectSplitter";
import { getBunnyStorageUrl } from "@/lib/bunny-auth-pdf";
import {
  BookOpen,
  Calendar,
  Search,
  Printer,
  Download,
  FileSpreadsheet,
  Table as TableIcon,
  Sparkles,
  Edit3,
  Trash2,
  FileText,
  Loader2,
  Globe,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface PlanningTableRendererProps {
  record: PlanningDocumentRecord | null;
  fileUrl?: string | null;
  mode?: "teacher" | "admin";
  onEdit?: () => void;
  onDelete?: () => void;
}

export const PlanningTableRenderer: React.FC<PlanningTableRendererProps> = ({
  record,
  fileUrl,
  mode = "teacher",
  onEdit,
  onDelete,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [parsedWorkbook, setParsedWorkbook] = useState<AnnualPlanningWorkbook | null>(null);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all"); // "all" or specific subject
  const [loadingWorkbook, setLoadingWorkbook] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  const printContainerRef = useRef<HTMLDivElement>(null);
  const activeUrl = fileUrl || record?.fileUrl || null;

  // Extract Subject Sections from Excel when fileUrl is present
  useEffect(() => {
    let isMounted = true;
    if (!activeUrl) {
      setParsedWorkbook(null);
      return;
    }

    setLoadingWorkbook(true);
    const fetchUrl = getBunnyStorageUrl(activeUrl);

    fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((buffer) => extractSubjectSectionsFromExcel(buffer))
      .then((wb) => {
        if (isMounted) {
          setParsedWorkbook(wb);
          setLoadingWorkbook(false);
        }
      })
      .catch((err) => {
        console.warn("Subject section fetch notice, trying raw URL:", err);
        fetch(activeUrl)
          .then((res) => res.arrayBuffer())
          .then((buffer) => extractSubjectSectionsFromExcel(buffer))
          .then((wb) => {
            if (isMounted) {
              setParsedWorkbook(wb);
              setLoadingWorkbook(false);
            }
          })
          .catch(() => {
            if (isMounted) setLoadingWorkbook(false);
          });
      });

    return () => {
      isMounted = false;
    };
  }, [activeUrl]);

  // List of Available Subjects
  const availableSubjectNames = useMemo(() => {
    if (parsedWorkbook && parsedWorkbook.allSubjectNames.length > 0) {
      return parsedWorkbook.allSubjectNames;
    }
    if (record) {
      const recAny = record as any;
      let rowsToUse: string[][] = recAny.rawDataRows || record.rows || [];
      if (!rowsToUse || rowsToUse.length === 0) {
        if (recAny.tableRows && Array.isArray(recAny.tableRows)) {
          rowsToUse = recAny.tableRows.map((tr: any) => [
            tr.month || "",
            tr.weeks || "",
            tr.workingDays || "",
            tr.periods || "",
            tr.topics || "",
            tr.outcomes || "",
          ]);
        }
      }
      if (rowsToUse && rowsToUse.length > 0) {
        const splitMap = splitRowsIntoSubjectSections(rowsToUse, record.subjectId || "मराठी");
        const keys = Object.keys(splitMap);
        if (keys.length > 0) return keys;
      }
    }
    return ["मराठी", "गणित", "इंग्रजी", "कलाशिक्षण", "कार्यशिक्षण", "शारीरिक शिक्षण"];
  }, [parsedWorkbook, record]);

  // Selected Subject Section(s) to Display
  const activeSectionsToDisplay = useMemo<SubjectSection[]>(() => {
    // 1. Check if parsedWorkbook has extracted subject sections from Excel
    if (parsedWorkbook && Object.keys(parsedWorkbook.subjects).length > 0) {
      if (selectedSubjectFilter === "all") {
        return Object.values(parsedWorkbook.subjects);
      }
      const matched = parsedWorkbook.subjects[selectedSubjectFilter];
      if (matched) return [matched];

      const foundKey = Object.keys(parsedWorkbook.subjects).find((k) =>
        k.toLowerCase().includes(selectedSubjectFilter.toLowerCase())
      );
      return foundKey ? [parsedWorkbook.subjects[foundKey]] : Object.values(parsedWorkbook.subjects);
    }

    // 2. Fallback to data stored directly in record (rawDataRows / rows / tableRows / gridData)
    if (record) {
      let rowsToUse: string[][] = [];
      const recAny = record as any;

      if (recAny.rawDataRows && Array.isArray(recAny.rawDataRows) && recAny.rawDataRows.length > 0) {
        rowsToUse = recAny.rawDataRows;
      } else if (record.rows && Array.isArray(record.rows) && record.rows.length > 0) {
        rowsToUse = record.rows;
      } else if (recAny.tableRows && Array.isArray(recAny.tableRows) && recAny.tableRows.length > 0) {
        rowsToUse = recAny.tableRows.map((tr: any) => [
          tr.month || "",
          tr.weeks || "",
          tr.workingDays || "",
          tr.periods || "",
          tr.topics || "",
          tr.outcomes || "",
        ]);
      } else if (record.gridData && Array.isArray(record.gridData) && record.gridData.length > 0) {
        rowsToUse = record.gridData.map((rowCells) =>
          rowCells.map((cell) => (typeof cell === "string" ? cell : cell?.value || ""))
        );
      }

      if (rowsToUse.length > 0) {
        const splitMap = splitRowsIntoSubjectSections(rowsToUse, record.subjectId || "मराठी");
        if (Object.keys(splitMap).length > 0) {
          if (selectedSubjectFilter === "all") {
            return Object.values(splitMap);
          }
          const matched = splitMap[selectedSubjectFilter];
          if (matched) return [matched];
          const foundKey = Object.keys(splitMap).find((k) =>
            k.toLowerCase().includes(selectedSubjectFilter.toLowerCase())
          );
          return foundKey ? [splitMap[foundKey]] : Object.values(splitMap);
        }
      }
    }

    return [];
  }, [parsedWorkbook, record, selectedSubjectFilter]);

  const handlePrintOrPdf = () => {
    window.print();
  };

  // Generate Multi-Subject Combined PDF
  const handleDownloadCombinedPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      toast.info("⚡ सर्व विषयांचे एकत्र (Combined) PDF तयार होत आहे...");

      const printElement = printContainerRef.current;
      if (!printElement) {
        toast.error("प्रिन्ट घटक उपलब्ध नाही.");
        setIsGeneratingPdf(false);
        return;
      }

      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const opt = {
        margin: [8, 8, 8, 8],
        filename: `इयत्ता_${record?.classId || "1"}_संपूर्ण_वार्षिक_नियोजन_२०२६-२७.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"], avoid: ["tr", "td", "th"] },
      };

      await (html2pdf() as any).from(printElement).set(opt).save();
      setIsGeneratingPdf(false);
      toast.success("🎉 सर्व विषयांचे एकत्र (Combined) PDF यशस्वीरित्या डाऊनलोड झाले!");
    } catch (err) {
      console.error("Combined PDF error:", err);
      setIsGeneratingPdf(false);
      toast.error("PDF डाऊनलोड करताना अडचण आली.");
    }
  };

  if (!record && !parsedWorkbook) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200 shadow-xs text-center space-y-3">
        <div className="size-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <BookOpen className="size-8" />
        </div>
        <h3 className="text-base font-black text-slate-800">माहिती उपलब्ध नाही (No Record Found)</h3>
        <p className="text-xs text-slate-500 font-semibold max-w-sm">
          निवडलेल्या इयत्ता व विषयासाठी अद्याप नियोजन फाईल सेव्ह केलेली नाही.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 print:p-0">
      {/* Top Controls & Subject Filter Selector */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4 print:hidden">
        {/* Subject Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5 pr-2 border-r border-slate-200">
            <BookOpen className="size-4 text-indigo-600" /> विषय निवडा (Select Subject):
          </span>

          <button
            onClick={() => setSelectedSubjectFilter("all")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              selectedSubjectFilter === "all"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-105"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
            }`}
          >
            <Globe className="size-3.5" />
            <span>🌐 सर्व विषय एकत्र (All Combined)</span>
          </button>

          {availableSubjectNames.map((sName) => (
            <button
              key={sName}
              onClick={() => setSelectedSubjectFilter(sName)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                selectedSubjectFilter === sName
                  ? "bg-slate-900 text-amber-300 shadow-md scale-105"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-300"
              }`}
            >
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              <span>{sName}</span>
            </button>
          ))}
        </div>

        {/* Action Controls & Search Input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="घटक किंवा शब्द शोधा (Search topics)..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={handleDownloadCombinedPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
            >
              {isGeneratingPdf ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              <span>📥 COMBINED PDF DOWNLOAD</span>
            </button>

            <button
              onClick={handlePrintOrPdf}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Printer className="size-4 text-amber-300" />
              <span>PRINT / PDF</span>
            </button>

            {mode === "admin" && (
              <>
                {onEdit && (
                  <button
                    onClick={onEdit}
                    className="px-3.5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <Edit3 className="size-4" /> <span>एडिट</span>
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={onDelete}
                    className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-rose-200"
                  >
                    <Trash2 className="size-4" /> <span>डिलीट</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Document Content Area */}
      <div
        ref={printContainerRef}
        className="bg-white rounded-3xl border border-slate-300 shadow-sm overflow-hidden p-6 sm:p-8 space-y-8 print:border-none print:shadow-none print:p-0"
      >
        {loadingWorkbook ? (
          <div className="flex flex-col items-center justify-center p-12 gap-3 text-slate-500">
            <Loader2 className="size-8 animate-spin text-indigo-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              विषयनिहाय नियोजन डेटा लोड होत आहे... (Loading Subject Sections)
            </span>
          </div>
        ) : (
          <>
            {/* Header Title Card */}
            <div className="border-b-2 border-slate-900 pb-5 space-y-2 text-center">
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight">
                {parsedWorkbook?.classTitle || `इयत्ता : ${record?.classId || "१ ली"} संपूर्ण वार्षिक नियोजन सन २०२६-२७`}
              </h2>
              <div className="flex items-center justify-center gap-3 text-xs font-bold text-slate-700 flex-wrap">
                <span className="bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                  माध्यम: <strong>मराठी</strong>
                </span>
                <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl border border-indigo-200">
                  विषय पर्याय: <strong>{selectedSubjectFilter === "all" ? "सर्व विषय एकत्र" : selectedSubjectFilter}</strong>
                </span>
              </div>
            </div>

            {/* Render Selected Subject Sections */}
            {activeSectionsToDisplay.length > 0 ? (
              activeSectionsToDisplay.map((sec, secIdx) => {
                const filteredRows = sec.rows.filter((row) => {
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase().trim();
                  return row.some((c) => (c || "").toLowerCase().includes(q));
                });

                const categoryHeaders =
                  DEFAULT_HEADERS[record?.category || "varshik_niyojan"] ||
                  DEFAULT_HEADERS.varshik_niyojan;

                return (
                  <div key={secIdx} className="space-y-4 page-break-after">
                    {/* Subject Banner Header */}
                    <div className="bg-slate-900 text-amber-300 px-5 py-3 rounded-2xl flex items-center justify-between shadow-xs print:bg-slate-900 print:text-amber-300">
                      <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                        <BookOpen className="size-4 text-emerald-400" />
                        <span>{sec.displaySubjectName || `विषय : ${sec.subjectName}`}</span>
                      </h3>
                      <span className="text-[11px] font-bold text-slate-300">
                        {filteredRows.length} ओळी (Rows)
                      </span>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-slate-900 text-xs font-sans bg-white">
                        <thead>
                          <tr className="bg-slate-800 text-white font-black text-center text-xs border-b-2 border-slate-900">
                            {categoryHeaders.map((hText: string, i: number) => (
                              <th
                                key={i}
                                className="border border-slate-700 p-2.5 text-center font-black tracking-wide bg-slate-900 text-amber-300 text-xs"
                              >
                                {i === 4 ? `विषय : ${sec.subjectName}` : hText}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300">
                          {filteredRows.length > 0 ? (
                            filteredRows.map((r, rIdx) => (
                              <tr
                                key={rIdx}
                                className={`hover:bg-indigo-50/40 transition-colors ${
                                  rIdx % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                                }`}
                              >
                                {categoryHeaders.map((_: string, cIdx: number) => (
                                  <td
                                    key={cIdx}
                                    className={`border border-slate-300 p-2.5 align-top text-slate-900 leading-relaxed ${
                                      cIdx <= 3 ? "text-center font-bold" : "text-left whitespace-pre-line"
                                    }`}
                                  >
                                    {r[cIdx] || "-"}
                                  </td>
                                ))}
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-slate-400 font-bold text-xs">
                                या विषयासाठी कोणतीही नोंद सापडली नाही.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-400 font-bold text-xs">
                कोणताही विषय डेटा उपलब्ध नाही.
              </div>
            )}

            {/* Footer Signature Bar */}
            <div className="pt-8 border-t border-slate-200 grid grid-cols-2 text-center text-xs font-black text-slate-900">
              <div>वर्ग शिक्षक / विषय शिक्षक स्वाक्षरी</div>
              <div>मुख्याध्यापक स्वाक्षरी व शिक्का</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
