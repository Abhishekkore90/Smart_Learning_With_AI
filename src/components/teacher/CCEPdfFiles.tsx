import React, { useState, lazy, Suspense } from "react";
import { ArrowLeft, Download, Eye, FileText, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

// Safe lazy loader to auto-recover from Vite module fetch errors
const safeLazy = (factory: () => Promise<any>) =>
  lazy(() =>
    factory().catch((err) => {
      console.warn("Failed to fetch dynamically imported module. Reloading page...", err);
      window.location.reload();
      return new Promise(() => { });
    })
  );

// @ts-ignore
const BoardResult = safeLazy(() => import("@/result/BoardResult"));
// @ts-ignore
const SubjectWiseResult = safeLazy(() => import("@/result/SubjectWiseResult"));
// @ts-ignore
const ProgressSheet = safeLazy(() => import("@/result/ProgressSheet"));
// @ts-ignore
const GradeWise = safeLazy(() => import("@/result/GradeWise"));
// @ts-ignore
const Result5th8th = safeLazy(() => import("@/result/Result5th8th"));
// @ts-ignore
const AnnualResultRegister = safeLazy(() => import("@/result/AnnualResultRegister"));

// Custom Red/Green PDF File Icon SVG
function PdfIcon({ className = "w-9 h-11" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 0h18l10 10v26a4 4 0 01-4 4H4a4 4 0 01-4-4V4a4 4 0 014-4z" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
      <path d="M22 0l10 10H26a4 4 0 01-4-4V0z" fill="#cbd5e1" />
      <path d="M7 22h3.5c1.1 0 2 .9 2 2s-.9 2-2 2H9v2H7v-6zm2 3h1.5c.3 0 .5-.2.5-.5s-.2-.5-.5-.5H9v1z" fill="#ef4444" />
      <path d="M14 22h2.5c1.9 0 3.5 1.6 3.5 3.5S18.4 29 16.5 29H14v-7zm2 5h.5c.8 0 1.5-.7 1.5-1.5S17.3 24 16.5 24H16v3z" fill="#ef4444" />
      <path d="M21 22h4v2h-2v1h2v1h-2v2h-2v-6z" fill="#ef4444" />
      <text x="16" y="13" textAnchor="middle" fill="#dc2626" fontSize="6.5" fontWeight="900" fontFamily="sans-serif">PDF</text>
    </svg>
  );
}

const CLASS_OPTIONS = [
  { value: "1st", label: "इयत्ता १ ली (1st)" },
  { value: "2nd", label: "इयत्ता २ री (2nd)" },
  { value: "3rd", label: "इयत्ता ३ री (3rd)" },
  { value: "4th", label: "इयत्ता ४ थी (4th)" },
  { value: "5th", label: "इयत्ता ५ वी (5th)" },
  { value: "6th", label: "इयत्ता ६ वी (6th)" },
  { value: "7th", label: "इयत्ता ७ वी (7th)" },
  { value: "8th", label: "इयत्ता ८ वी (8th)" },
];

// Reports that need सत्र (term) selection before opening
const TERM_BASED_REPORTS = ["cce_register"];

export function CCEPdfFiles({
  selectedClass: defaultClass,
  academicYear: defaultYear,
  onBack,
}: {
  selectedClass: string;
  academicYear: string;
  onBack: () => void;
}) {
  const [activeClass, setActiveClass] = useState(defaultClass || "1st");
  const [academicYear, setAcademicYear] = useState(defaultYear || "2025-26");
  const [viewingReportId, setViewingReportId] = useState<string | null>(null);

  // Term selection dialog state
  const [termDialogPendingId, setTermDialogPendingId] = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<"sem1" | "sem2">("sem2");

  // Available Generated PDF Files List
  const pdfFiles = [
    {
      id: "progress_card",
      title: "प्रगती पत्रक (Progress Sheet)",
      name: `विद्यार्थी-प्रगती-पत्रक-${activeClass}-${academicYear}.pdf`,
      category: "प्रगती पत्रक",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      id: "cce_register",
      title: "CCE मूल्यांकन नोंदवही",
      name: `CCE-मूल्यांकन-नोंदवही-${activeClass}-${academicYear}.pdf`,
      category: "मूल्यांकन नोंदवही",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      id: "learning_outcomes",
      title: "अध्ययन निष्पतीनिहाय संपादणूक प्रगतीदर्शक नोंदतक्ता",
      name: `अध्ययन-निष्पती-प्रगतीदर्शक-${activeClass}-${academicYear}.pdf`,
      category: "अध्ययन निष्पती",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    },
    {
      id: "grade_result",
      title: "सातत्यपूर्ण सर्वंकष मूल्यमापन श्रेणीनिहाय निकाल संकलन प्रपत्र - 1",
      name: `श्रेणीनिहाय-निकाल-संकलन-प्रपत्र-1-${academicYear}.pdf`,
      category: "संकलन प्रपत्र",
      badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
    },
    {
      id: "annual_result",
      title: "वार्षिक निकाल पत्रक (Annual Result Sheet)",
      name: `वार्षिक-निकाल-पत्रक-${activeClass}-${academicYear}.pdf`,
      category: "वार्षिक निकाल",
      badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    },
  ];

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
      <Loader2 className="size-9 text-blue-600 animate-spin mb-3" />
      <p className="text-sm font-bold text-slate-700">PDF फाईल लोड होत आहे...</p>
    </div>
  );

  // Handle click — directly open using currently selected top term toggle
  const handleOpenReport = (fileId: string) => {
    setViewingReportId(fileId);
  };

  // When a report is selected to view / download
  if (viewingReportId === "progress_card") {
    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-6 min-h-[600px] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <button onClick={() => setViewingReportId(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 cursor-pointer">
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="text-base font-bold text-slate-800">
            प्रगती पत्रक - इयत्ता {activeClass}
          </h2>
        </div>
        <Suspense fallback={renderLoading()}>
          <ProgressSheet initialClass={activeClass} initialYear={academicYear} onBack={() => setViewingReportId(null)} />
        </Suspense>
      </div>
    );
  }

  if (viewingReportId === "cce_register") {
    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-6 min-h-[600px] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <button onClick={() => setViewingReportId(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 cursor-pointer">
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="text-base font-bold text-slate-800">
            CCE मूल्यांकन नोंदवही - इयत्ता {activeClass} ({selectedTerm === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"})
          </h2>
        </div>
        <Suspense fallback={renderLoading()}>
          <BoardResult initialClass={activeClass} initialYear={academicYear} initialTerm={selectedTerm} />
        </Suspense>
      </div>
    );
  }

  if (viewingReportId === "learning_outcomes") {
    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-6 min-h-[600px] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <button onClick={() => setViewingReportId(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 cursor-pointer">
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="text-base font-bold text-slate-800">अध्ययन निष्पती प्रगतीदर्शक - इयत्ता {activeClass}</h2>
        </div>
        <Suspense fallback={renderLoading()}>
          <SubjectWiseResult initialClass={activeClass} initialYear={academicYear} />
        </Suspense>
      </div>
    );
  }

  if (viewingReportId === "grade_result") {
    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-6 min-h-[600px] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <button onClick={() => setViewingReportId(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 cursor-pointer">
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="text-base font-bold text-slate-800">श्रेणीनिहाय निकाल संकलन प्रपत्र - 1</h2>
        </div>
        <Suspense fallback={renderLoading()}>
          <GradeWise initialClass={activeClass} initialYear={academicYear} onBack={() => setViewingReportId(null)} />
        </Suspense>
      </div>
    );
  }

  if (viewingReportId === "annual_result") {
    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-6 min-h-[600px] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <button onClick={() => setViewingReportId(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 cursor-pointer">
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="text-base font-bold text-slate-800">वार्षिक निकाल पत्रक - इयत्ता {activeClass}</h2>
        </div>
        <Suspense fallback={renderLoading()}>
          <AnnualResultRegister initialClass={activeClass} initialYear={academicYear} onBack={() => setViewingReportId(null)} />
        </Suspense>
      </div>
    );
  }

  return (
    <div
      className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200 shadow-2xl min-h-[600px] flex flex-col font-sans select-none overflow-hidden"
      style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-5 border-b border-slate-100 bg-slate-50/70">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white rounded-full transition-colors cursor-pointer text-slate-600 flex items-center justify-center shadow-sm"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-800">PDF Files & साठवलेले निकाल</h2>
            <p className="text-xs text-slate-500 font-medium">तयार झालेल्या सर्व PDF फाईल्स डाऊनलोड व उपलब्ध करा</p>
          </div>
        </div>

        {/* Class Selector Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">इयत्ता:</span>
          <select
            value={activeClass}
            onChange={(e) => setActiveClass(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold text-xs shadow-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {CLASS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Term Toggle Switch Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-6 py-3 bg-gradient-to-r from-amber-50/90 via-slate-50 to-blue-50/90 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black text-slate-800">सत्र (Semester) निवडा:</span>
          <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-300 shadow-sm">
            <button
              onClick={() => setSelectedTerm("sem1")}
              className={`px-4 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 ${selectedTerm === "sem1"
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <span>📘</span>
              <span>प्रथम सत्र</span>
            </button>
            <button
              onClick={() => setSelectedTerm("sem2")}
              className={`px-4 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 ${selectedTerm === "sem2"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <span>📗</span>
              <span>द्वितीय सत्र</span>
            </button>
          </div>
        </div>

        <div className="text-[11px] font-extrabold text-slate-600 flex items-center gap-1.5">
          <span>CCE नोंदवही:</span>
          <span className={selectedTerm === "sem1" ? "text-amber-700" : "text-emerald-700"}>
            {selectedTerm === "sem1" ? "📘 प्रथम सत्र PDF निवडली आहे" : "📗 द्वितीय सत्र PDF निवडली आहे"}
          </span>
        </div>
      </div>

      {/* PDF Files List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
        {pdfFiles.map((file) => (
          <div
            key={file.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-400 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-4 flex-1">
              <div className="flex-shrink-0 pt-0.5">
                <PdfIcon className="w-9 h-11 group-hover:scale-105 transition-transform" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors leading-snug">
                    {file.title}
                  </h3>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${file.badgeColor}`}>
                    {file.category}
                  </span>
                  {/* Show selected term badge for term-based reports */}
                  {TERM_BASED_REPORTS.includes(file.id) && (
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${selectedTerm === "sem1"
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : "bg-emerald-100 text-emerald-800 border-emerald-300"
                      }`}>
                      {selectedTerm === "sem1" ? "📘 प्रथम सत्र PDF" : "📗 द्वितीय सत्र PDF"}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-mono break-all leading-tight">
                  {file.name}
                </p>
              </div>
            </div>

            {/* Action Buttons: View and Download */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={() => handleOpenReport(file.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                title="पहा"
              >
                <Eye className="size-4 text-slate-600" />
                <span>पहा</span>
              </button>

              <button
                onClick={() => handleOpenReport(file.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                title="PDF डाऊनलोड करा"
              >
                <Download className="size-4" />
                <span>डाऊनलोड</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
