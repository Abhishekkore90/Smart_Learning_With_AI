import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FileText,
  Download,
  Eye,
  Users,
  Search,
  Filter,
  Layers,
  Sparkles,
  BookOpen,
  Compass,
  GraduationCap,
  Loader2,
  Check,
  X,
  Printer,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { HpcStageId } from "@/hpc/types/hpc";
import { HPC_STAGES_INFO } from "@/hpc/data/hpcCurricularGoals";
import {
  getHpcStudents,
  StudentInfoSummary,
  getHpcStudentById,
  getHpcStudentProfile,
  getHpcSessionAssessment,
  getHpcAnnualSummary,
  getHpcStudentAttendance,
  getHpcSchoolSettings,
  getHpcClassWorkingDays,
} from "@/hpc/services/hpcService";
import { generateHpcPdf, downloadBlob } from "@/hpc/reports/HpcPdfGenerator";
import { FoundationalHpcPdf } from "@/hpc/reports/FoundationalHpcPdf";
import { PreparatoryHpcPdf } from "@/hpc/reports/PreparatoryHpcPdf";
import { MiddleHpcPdf } from "@/hpc/reports/MiddleHpcPdf";
import {
  getCurrentAcademicYear,
  getAcademicYearOptions,
  getInitialAcademicYear,
} from "@/hpc/utils/academicYear";

export const Route = createFileRoute("/teacher/hpc/reports")({
  head: () => ({
    meta: [{ title: "HPC अहवाल व PDF डाऊनलोड — SMART LEARNING" }],
  }),
  component: TeacherHpcReportsPage,
});

const CLASSES_LIST = [
  { id: "1st", label: "इयत्ता १ ली", stageId: "foundational" },
  { id: "2nd", label: "इयत्ता २ री", stageId: "foundational" },
  { id: "3rd", label: "इयत्ता ३ री", stageId: "preparatory" },
  { id: "4th", label: "इयत्ता ४ थी", stageId: "preparatory" },
  { id: "5th", label: "इयत्ता ५ वी", stageId: "preparatory" },
  { id: "6th", label: "इयत्ता ६ वी", stageId: "middle" },
  { id: "7th", label: "इयत्ता ७ वी", stageId: "middle" },
  { id: "8th", label: "इयत्ता ८ वी", stageId: "middle" },
];

function TeacherHpcReportsPage() {
  const academicYearOptions = useMemo(() => getAcademicYearOptions(), []);
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    return (
      (typeof window !== "undefined" && localStorage.getItem("hpc_selected_class")) ||
      "1st"
    );
  });
  const [academicYear, setAcademicYear] = useState<string>(() => getInitialAcademicYear());
  const [selectedMedium, setSelectedMedium] = useState<string>(() => {
    return localStorage.getItem("cce_selected_medium") || "marathi";
  });

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentInfoSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Preview & Single Download
  const [activePreviewStudent, setActivePreviewStudent] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0, message: "" });
  const [previewZoom, setPreviewZoom] = useState<number>(100);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const stageId: HpcStageId = useMemo(() => {
    const match = CLASSES_LIST.find((c) => c.id === selectedClass);
    return (match?.stageId as HpcStageId) || "foundational";
  }, [selectedClass]);

  const stageInfo = HPC_STAGES_INFO.find((s) => s.id === stageId) || HPC_STAGES_INFO[0];

  useEffect(() => {
    const handleClassChange = (e: any) => {
      if (e.detail?.cls && e.detail.cls !== selectedClass) {
        setSelectedClass(e.detail.cls);
      }
    };
    window.addEventListener("hpc_class_changed", handleClassChange);
    return () => {
      window.removeEventListener("hpc_class_changed", handleClassChange);
    };
  }, [selectedClass]);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        const list = await getHpcStudents(selectedClass, selectedMedium);
        if (isMounted) {
          setStudents(list);
          if (list.length > 0) {
            localStorage.setItem(`hpc_last_student_${selectedClass}`, list[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [selectedClass, selectedMedium]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.rollNo && s.rollNo.includes(q))
    );
  }, [students, searchQuery]);

  // Load preview data with Promise.allSettled for ultra-reliable loading
  const handleOpenPreview = async (studentId: string, autoDownload: boolean = false) => {
    setPreviewLoading(true);
    try {
      const existingStudent = students.find((s) => s.id === studentId);

      const [stRes, profRes, s1Res, s2Res, annRes, attRes, schoolRes, classWdRes] = await Promise.allSettled([
        getHpcStudentById(studentId),
        getHpcStudentProfile(studentId, academicYear),
        getHpcSessionAssessment(studentId, academicYear, "session1"),
        getHpcSessionAssessment(studentId, academicYear, "session2"),
        getHpcAnnualSummary(studentId, academicYear),
        getHpcStudentAttendance(selectedClass, academicYear, studentId),
        getHpcSchoolSettings(),
        getHpcClassWorkingDays(selectedClass, academicYear),
      ]);

      const st =
        (stRes.status === "fulfilled" && stRes.value) ||
        existingStudent ||
        ({
          id: studentId,
          name: "विद्यार्थी",
          fullName: "विद्यार्थी",
          rollNo: "1",
          gender: "male",
          class: selectedClass,
          division: "अ",
        } as StudentInfoSummary);

      const prof = profRes.status === "fulfilled" ? profRes.value : null;
      const s1 = s1Res.status === "fulfilled" ? s1Res.value : null;
      const s2 = s2Res.status === "fulfilled" ? s2Res.value : null;
      const ann = annRes.status === "fulfilled" ? annRes.value : null;
      const att = attRes.status === "fulfilled" ? attRes.value : null;
      const school = schoolRes.status === "fulfilled" ? schoolRes.value : {};
      const classWd = classWdRes.status === "fulfilled" && classWdRes.value ? classWdRes.value : {};

      const mergedAtt = att ? { ...att } : { workingDays: {}, attendedDays: {} };
      if (classWd && Object.keys(classWd).length > 0) {
        mergedAtt.workingDays = { ...classWd, ...(mergedAtt.workingDays || {}) };
      }

      const previewData = {
        student: st,
        profile: prof,
        session1: s1,
        session2: s2,
        annualSummary: ann,
        attendance: mergedAtt,
        schoolSettings: school,
      };

      setActivePreviewStudent(previewData);

      if (autoDownload) {
        setTimeout(() => {
          handleDownloadSinglePdf(previewData);
        }, 600);
      }
    } catch (err: any) {
      console.error("Preview load error:", err);
      toast.error("डेटा लोड करताना त्रुटी आली.");
    } finally {
      setPreviewLoading(false);
    }
  };

  // Download Single PDF
  const handleDownloadSinglePdf = async (customData?: any) => {
    if (!previewContainerRef.current) return;
    setPdfGenerating(true);
    try {
      const currentStudent = customData || activePreviewStudent;
      const studentName = currentStudent?.student?.name || "विद्यार्थी";
      const filename = `HPC_${studentName}_Class_${selectedClass}.pdf`;
      const blob = await generateHpcPdf(
        previewContainerRef.current,
        filename,
        (cur, tot, msg) => {
          setPdfProgress({ current: cur, total: tot, message: msg || "" });
        }
      );
      downloadBlob(blob, filename);
      toast.success(`${studentName} चे HPC PDF यशस्वीरीत्या डाऊनलोड झाले!`);
    } catch (err: any) {
      console.error("PDF generation error:", err);
      toast.error("PDF तयार करताना त्रुटी: " + err.message);
    } finally {
      setPdfGenerating(false);
    }
  };

  // Direct Print / Save as PDF using system print dialogue
  const handlePrint = () => {
    if (!previewContainerRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }
    const htmlContent = previewContainerRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>HPC_${activePreviewStudent?.student?.name || "Report"}</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            body { margin: 0; padding: 0; font-family: 'Noto Sans Devanagari', 'Nirmala UI', sans-serif; background: #fff; }
            .pdf-page { width: 794px; height: 1123px; page-break-after: always; box-sizing: border-box; overflow: hidden; margin: 0 auto; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .pdf-page { page-break-after: always; }
            }
          </style>
          <link rel="stylesheet" href="/src/styles.css">
        </head>
        <body>
          ${htmlContent}
          <script>
            setTimeout(() => { window.print(); window.close(); }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Back Action Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link
          to="/teacher/hpc"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-900 hover:text-white text-slate-800 border border-slate-200 hover:border-slate-900 rounded-2xl text-xs sm:text-sm font-black transition-all shadow-xs cursor-pointer group"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
          <span>मुख्य HPC डॅशबोर्डवर परत जा (Back to HPC Dashboard)</span>
        </Link>
        <Link
          to="/teacher"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
        >
          <ArrowLeft className="size-3.5" />
          <span>मुख्य शिक्षक पॅनल</span>
        </Link>
      </div>

      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {stageInfo.titleMarathi}
            </span>
            <span className="text-xs font-bold text-slate-500">
              अधिकृत SCERT आराखड्यानुसार प्रगती अहवाल
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            HPC समग्र प्रगतिपत्रक अहवाल व PDF
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            प्रत्येक विद्यार्थ्याचे वैयक्तिक समग्र प्रगतिपत्रक (HPC) A4 PDF डाऊनलोड करा
          </p>
        </div>

        {/* Year & Class Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Academic Year Selector */}
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-500">वर्ष:</span>
            <select
              value={academicYear}
              onChange={(e) => {
                setAcademicYear(e.target.value);
                localStorage.setItem("cce_academic_year", e.target.value);
              }}
              className="bg-transparent text-xs font-black text-slate-900 outline-none cursor-pointer"
            >
              {academicYearOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-500">इयत्ता:</span>
            <select
              value={selectedClass}
              onChange={(e) => {
                const cls = e.target.value;
                setSelectedClass(cls);
                localStorage.setItem("hpc_selected_class", cls);
                const match = CLASSES_LIST.find((c) => c.id === cls);
                const stg = (match?.stageId as HpcStageId) || "foundational";
                localStorage.setItem("hpc_selected_stage", stg);
                window.dispatchEvent(
                  new CustomEvent("hpc_class_changed", {
                    detail: { cls, stageId: stg },
                  })
                );
              }}
              className="bg-transparent text-xs font-black text-slate-900 outline-none cursor-pointer"
            >
              {CLASSES_LIST.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="size-4 text-slate-400 absolute left-4 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="विद्यार्थ्याचे नाव किंवा हजेरी क्रमांकाने शोधा..."
          className="w-full pl-11 pr-4 py-3 text-xs font-bold rounded-2xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white shadow-xs"
        />
      </div>

      {/* Students List for Reports */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200">
          <Loader2 className="size-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-600">विद्यार्थी यादी लोड होत आहे...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
          <FileText className="size-12 text-slate-300 mx-auto" />
          <p className="text-base font-bold text-slate-700">कोणतेही विद्यार्थी सापडले नाहीत.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 border-b-2 border-slate-300 text-slate-950 font-black text-sm sm:text-base tracking-wider uppercase">
                <th className="py-4 px-3 w-20 text-center font-black text-slate-950 text-sm sm:text-base whitespace-nowrap">हजेरी क्र.</th>
                <th className="py-4 px-4 font-black text-slate-950 text-sm sm:text-base whitespace-nowrap">विद्यार्थ्याचे नाव</th>
                <th className="py-4 px-4 text-center font-black text-slate-950 text-sm sm:text-base whitespace-nowrap">इयत्ता व तुकडी</th>
                <th className="py-4 px-4 text-center font-black text-slate-950 text-sm sm:text-base whitespace-nowrap">सरल आयडी</th>
                <th className="py-4 px-4 text-right font-black text-slate-950 text-sm sm:text-base whitespace-nowrap">HPC अहवाल कृती</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 text-center font-black text-slate-800">{s.rollNo}</td>
                  <td className="p-4 font-bold text-slate-900">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-indigo-50 font-black text-indigo-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {s.photoUrl ? (
                          <img src={s.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          s.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <span className="font-black text-slate-900 text-sm">{s.fullName || s.name}</span>
                        <span className="block text-[10px] text-slate-400">
                          पालक: {s.parentName || "-"}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center font-bold text-slate-700">
                    {s.class || selectedClass} / {s.division || "अ"}
                  </td>
                  <td className="p-4 text-center font-mono text-slate-600">
                    {s.saralId || "-"}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenPreview(s.id, false)}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="size-3.5" />
                        <span>प्रिव्ह्यू पहा</span>
                      </button>

                      <button
                        onClick={() => handleOpenPreview(s.id, true)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Download className="size-3.5" />
                        <span>PDF डाऊनलोड</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------------- Single Student Preview Modal ---------------- */}
      {activePreviewStudent && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
          <div className="bg-slate-900 rounded-2xl sm:rounded-3xl w-full max-w-6xl h-[94vh] max-h-[94vh] flex flex-col shadow-2xl overflow-hidden border border-slate-700/80 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-700/80 flex items-center justify-between bg-slate-900 text-white shrink-0">
              <div className="min-w-0 pr-2">
                <h3 className="text-sm sm:text-base font-black truncate">
                  समग्र प्रगतिपत्रक प्रिव्ह्यू: {activePreviewStudent.student?.name}
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  {stageInfo.titleMarathi} | इयत्ता {selectedClass} | {academicYear}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Zoom Controls */}
                <div className="hidden sm:flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-xl border border-slate-700 text-xs">
                  <button
                    onClick={() => setPreviewZoom((z) => Math.max(50, z - 10))}
                    className="px-2 py-0.5 rounded hover:bg-slate-700 text-slate-300 font-bold transition-colors cursor-pointer"
                    title="झूम कमी करा"
                  >
                    -
                  </button>
                  <span className="px-1.5 font-mono text-[11px] text-slate-200 min-w-[36px] text-center">
                    {previewZoom}%
                  </span>
                  <button
                    onClick={() => setPreviewZoom((z) => Math.min(150, z + 10))}
                    className="px-2 py-0.5 rounded hover:bg-slate-700 text-slate-300 font-bold transition-colors cursor-pointer"
                    title="झूम वाढवा"
                  >
                    +
                  </button>
                  <button
                    onClick={() => setPreviewZoom(100)}
                    className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="मूळ आकार (100%)"
                  >
                    100%
                  </button>
                </div>

                {/* Direct Print / Save as PDF */}
                <button
                  onClick={handlePrint}
                  className="px-3 sm:px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700 shadow-xs"
                  title="थेट प्रिंट करा किंवा PDF सेव्ह करा"
                >
                  <Printer className="size-3.5" />
                  <span className="hidden md:inline">प्रिंट / PDF सेव्ह</span>
                </button>

                {/* Download PDF Button */}
                <button
                  onClick={() => handleDownloadSinglePdf()}
                  disabled={pdfGenerating}
                  className="px-4 sm:px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-emerald-950/20"
                >
                  {pdfGenerating ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                  <span>
                    {pdfGenerating ? pdfProgress.message || "PDF तयार होत आहे..." : "PDF डाऊनलोड"}
                  </span>
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setActivePreviewStudent(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="बंद करा"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Report Container */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-4 sm:p-8 bg-slate-200/90 flex flex-col items-center">
              <div className="mb-5 px-5 py-2.5 bg-white/95 backdrop-blur-md rounded-full text-xs font-black text-slate-800 border border-slate-300 shadow-xs flex items-center gap-2 shrink-0 sticky top-0 z-20">
                <FileText className="size-4 text-indigo-600" />
                <span>HPC समग्र प्रगतिपत्रक (एकूण १९ पृष्ठे) — खाली स्क्रोल करून सर्व पृष्ठे तपासा</span>
              </div>

              <div
                ref={previewContainerRef}
                style={{
                  transform: `scale(${previewZoom / 100})`,
                  transformOrigin: "top center",
                  marginBottom: previewZoom < 100 ? `-${(100 - previewZoom) * 180}px` : "24px",
                }}
                className="flex flex-col items-center transition-transform"
              >
                {stageId === "foundational" ? (
                  <FoundationalHpcPdf
                    student={activePreviewStudent.student}
                    profile={activePreviewStudent.profile}
                    session1={activePreviewStudent.session1}
                    session2={activePreviewStudent.session2}
                    annualSummary={activePreviewStudent.annualSummary}
                    attendance={activePreviewStudent.attendance}
                    schoolSettings={activePreviewStudent.schoolSettings}
                    academicYear={academicYear}
                  />
                ) : stageId === "preparatory" ? (
                  <PreparatoryHpcPdf
                    student={activePreviewStudent.student}
                    profile={activePreviewStudent.profile}
                    session1={activePreviewStudent.session1}
                    session2={activePreviewStudent.session2}
                    annualSummary={activePreviewStudent.annualSummary}
                    attendance={activePreviewStudent.attendance}
                    schoolSettings={activePreviewStudent.schoolSettings}
                    academicYear={academicYear}
                  />
                ) : (
                  <MiddleHpcPdf
                    student={activePreviewStudent.student}
                    profile={activePreviewStudent.profile}
                    session1={activePreviewStudent.session1}
                    session2={activePreviewStudent.session2}
                    annualSummary={activePreviewStudent.annualSummary}
                    attendance={activePreviewStudent.attendance}
                    schoolSettings={activePreviewStudent.schoolSettings}
                    academicYear={academicYear}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
