import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Users,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  Compass,
  GraduationCap,
  Search,
  Filter,
  Eye,
  Edit,
  Download,
  FileText,
  Layers,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  RefreshCw,
  X,
  TrendingUp,
  UserCheck,
  ChevronRight,
  ShieldCheck,
  Zap,
  UserPlus,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { HpcStageId } from "../types/hpc";
import { HPC_STAGES_INFO } from "../data/hpcCurricularGoals";
import { HpcAddStudentModal } from "./HpcAddStudentModal";
import {
  getHpcProgressForClass,
  HpcStudentProgressItem,
  getHpcStudentById,
  getHpcStudentProfile,
  getHpcSessionAssessment,
  getHpcAnnualSummary,
  getHpcStudentAttendance,
  getHpcSchoolSettings,
  StudentInfoSummary,
} from "../services/hpcService";
import { generateHpcPdf, downloadBlob } from "../reports/HpcPdfGenerator";
import { FoundationalHpcPdf } from "../reports/FoundationalHpcPdf";
import { PreparatoryHpcPdf } from "../reports/PreparatoryHpcPdf";
import { MiddleHpcPdf } from "../reports/MiddleHpcPdf";
import {
  getCurrentAcademicYear,
  getAcademicYearOptions,
  getInitialAcademicYear,
} from "../utils/academicYear";

const CLASSES_BY_STAGE: Record<HpcStageId, { id: string; labelMarathi: string }[]> = {
  foundational: [
    { id: "1st", labelMarathi: "इयत्ता १ ली" },
    { id: "2nd", labelMarathi: "इयत्ता २ री" },
  ],
  preparatory: [
    { id: "3rd", labelMarathi: "इयत्ता ३ री" },
    { id: "4th", labelMarathi: "इयत्ता ४ थी" },
    { id: "5th", labelMarathi: "इयत्ता ५ वी" },
  ],
  middle: [
    { id: "6th", labelMarathi: "इयत्ता ६ वी" },
    { id: "7th", labelMarathi: "इयत्ता ७ वी" },
    { id: "8th", labelMarathi: "इयत्ता ८ वी" },
  ],
};

export function HpcDashboard() {
  const navigate = useNavigate();

  // Filters State
  const academicYearOptions = useMemo(() => getAcademicYearOptions(), []);
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    return (
      (typeof window !== "undefined" && localStorage.getItem("hpc_selected_class")) ||
      "1st"
    );
  });
  const [activeStage, setActiveStage] = useState<HpcStageId>(() => {
    const savedClass =
      typeof window !== "undefined" ? localStorage.getItem("hpc_selected_class") : null;
    if (savedClass) {
      if (["1st", "2nd"].includes(savedClass)) return "foundational";
      if (["3rd", "4th", "5th"].includes(savedClass)) return "preparatory";
      if (["6th", "7th", "8th"].includes(savedClass)) return "middle";
    }
    return (
      (typeof window !== "undefined" &&
        (localStorage.getItem("hpc_selected_stage") as HpcStageId)) ||
      "foundational"
    );
  });
  const [academicYear, setAcademicYear] = useState<string>(() => getInitialAcademicYear());
  const [selectedMedium, setSelectedMedium] = useState<string>(() => {
    return localStorage.getItem("cce_selected_medium") || "marathi";
  });

  const handleAcademicYearChange = (yr: string) => {
    setAcademicYear(yr);
    localStorage.setItem("cce_academic_year", yr);
    localStorage.setItem("hpc_academic_year", yr);
    window.dispatchEvent(
      new CustomEvent("hpc_academic_year_changed", { detail: yr })
    );
  };

  useEffect(() => {
    const handleYearEvent = (e: any) => {
      const yr = e.detail;
      if (yr && yr !== academicYear) {
        setAcademicYear(yr);
      }
    };
    const handleClassEvent = (e: any) => {
      if (e.detail?.cls && e.detail.cls !== selectedClass) {
        setSelectedClass(e.detail.cls);
      }
      if (e.detail?.stageId && e.detail.stageId !== activeStage) {
        setActiveStage(e.detail.stageId);
      }
    };
    window.addEventListener("hpc_academic_year_changed", handleYearEvent);
    window.addEventListener("hpc_class_changed", handleClassEvent);
    return () => {
      window.removeEventListener("hpc_academic_year_changed", handleYearEvent);
      window.removeEventListener("hpc_class_changed", handleClassEvent);
    };
  }, [academicYear, selectedClass, activeStage]);

  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Data State
  const [loading, setLoading] = useState(true);
  const [progressItems, setProgressItems] = useState<HpcStudentProgressItem[]>([]);

  // Add Student Modal State
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);

  // Preview & Download Modal State
  const [previewStudent, setPreviewStudent] = useState<any | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0, message: "" });
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Sync Class with Stage
  const handleStageSelect = (stageId: HpcStageId) => {
    setActiveStage(stageId);
    localStorage.setItem("hpc_selected_stage", stageId);
    const classes = CLASSES_BY_STAGE[stageId];
    if (classes && !classes.some((c) => c.id === selectedClass)) {
      const newCls = classes[0].id;
      setSelectedClass(newCls);
      localStorage.setItem("hpc_selected_class", newCls);
      window.dispatchEvent(
        new CustomEvent("hpc_class_changed", {
          detail: { cls: newCls, stageId },
        })
      );
    } else {
      window.dispatchEvent(
        new CustomEvent("hpc_class_changed", {
          detail: { cls: selectedClass, stageId },
        })
      );
    }
  };

  // Fetch Class Progress
  const loadProgress = async () => {
    setLoading(true);
    try {
      const items = await getHpcProgressForClass(selectedClass, academicYear, selectedMedium);
      setProgressItems(items);
      if (items.length > 0) {
        localStorage.setItem(`hpc_last_student_${selectedClass}`, items[0].student.id);
        localStorage.setItem("hpc_last_student_id", items[0].student.id);
      }
    } catch (err) {
      console.error("Error loading HPC progress:", err);
      toast.error("HPC प्रगती लोड करताना त्रुटी आली.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProgress();
  }, [selectedClass, academicYear, selectedMedium]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return progressItems.filter((item) => {
      // Division filter
      if (selectedDivision !== "all" && item.student.division !== selectedDivision) {
        return false;
      }
      // Status filter
      if (statusFilter === "completed" && item.overallStatus !== "completed") return false;
      if (statusFilter === "pending" && item.overallStatus === "completed") return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = item.student.name.toLowerCase().includes(q);
        const rollMatch = item.student.rollNo?.toString().includes(q);
        return nameMatch || rollMatch;
      }
      return true;
    });
  }, [progressItems, selectedDivision, statusFilter, searchQuery]);

  // Aggregate Stats
  const totalStudents = progressItems.length;
  const completedHpc = progressItems.filter((p) => p.overallStatus === "completed").length;
  const pendingHpc = totalStudents - completedHpc;
  const session1Count = progressItems.filter((p) => p.session1Completed).length;
  const session2Count = progressItems.filter((p) => p.session2Completed).length;
  const annualCount = progressItems.filter((p) => p.annualCompleted).length;

  // Open Preview Modal with Promise.allSettled for ultra-reliable loading
  const handleOpenPreview = async (studentId: string) => {
    setPreviewLoadingId(studentId);
    try {
      const existingStudent = progressItems.find((p) => p.student.id === studentId)?.student;

      const [stRes, profRes, s1Res, s2Res, annRes, attRes, schoolRes] = await Promise.allSettled([
        getHpcStudentById(studentId),
        getHpcStudentProfile(studentId, academicYear),
        getHpcSessionAssessment(studentId, academicYear, "session1"),
        getHpcSessionAssessment(studentId, academicYear, "session2"),
        getHpcAnnualSummary(studentId, academicYear),
        getHpcStudentAttendance(selectedClass, academicYear, studentId),
        getHpcSchoolSettings(),
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

      setPreviewStudent({
        student: st,
        profile: prof,
        session1: s1,
        session2: s2,
        annualSummary: ann,
        attendance: att,
        schoolSettings: school,
      });
    } catch (err: any) {
      console.error("Preview load error:", err);
      toast.error("माहिती लोड करताना त्रुटी आली.");
    } finally {
      setPreviewLoadingId(null);
    }
  };

  // Direct Browser Print / Save as PDF
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
          <title>HPC_${previewStudent?.student?.name || "Report"}</title>
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

  // Download PDF
  const handleDownloadPdf = async () => {
    if (!previewContainerRef.current) return;
    setPdfGenerating(true);
    try {
      const filename = `HPC_${previewStudent.student.name}_${selectedClass}.pdf`;
      const blob = await generateHpcPdf(
        previewContainerRef.current,
        filename,
        (cur, tot, msg) => {
          setPdfProgress({ current: cur, total: tot, message: msg || "" });
        }
      );
      downloadBlob(blob, filename);
      toast.success("HPC PDF यशस्वीरीत्या डाऊनलोड झाली!");
    } catch (err: any) {
      toast.error("PDF तयार करताना त्रुटी: " + err.message);
    } finally {
      setPdfGenerating(false);
    }
  };

  const currentStageInfo = HPC_STAGES_INFO.find((s) => s.id === activeStage) || HPC_STAGES_INFO[0];
  const completionPercentage = totalStudents > 0 ? Math.round((completedHpc / totalStudents) * 100) : 0;

  return (
    <div className="space-y-8 max-w-[1360px] mx-auto pb-16">
      {/* ---------------- 1. THE THREE STAGES SELECTOR (३ शैक्षणिक स्तर) ---------------- */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 px-1 gap-3">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/25">
              <Layers className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  शैक्षणिक स्तर निवडा (Select Educational Stage)
                </h2>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 hidden sm:inline-block">
                  NEP 2020
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                पायाभूत (१ ली-२ री), पूर्वतयारी (३ री-५ वी) किंवा मध्य स्तर (६ वी-८ वी) निवडून वर्ग निवडा
              </p>
            </div>
          </div>

          {/* Quick Medium Info */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-2xl px-4 py-2 flex items-center gap-2.5 shadow-xs">
              <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">माध्यम:</span>
              <span className="text-xs font-black text-emerald-700">
                {selectedMedium === "semi" ? "सेमी इंग्रजी" : "मराठी"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {HPC_STAGES_INFO.map((stg) => {
            const isSelected = activeStage === stg.id;
            let IconComp = BookOpen;
            let themeGradient = "from-amber-500 via-orange-500 to-amber-600";
            let activeBorder = "border-amber-400 ring-4 ring-amber-400/20 shadow-xl shadow-amber-500/15";
            let cardBg = isSelected
              ? "bg-gradient-to-b from-amber-500/[0.07] via-orange-50/25 to-white"
              : "bg-white hover:bg-amber-50/[0.15]";
            let badgeBg = "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs";
            let classActivePill = "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/30 scale-105 font-black ring-2 ring-white";
            let classInactivePill = "bg-slate-100 hover:bg-amber-100/70 text-slate-700 hover:text-amber-950 font-bold border border-slate-200/60";

            if (stg.id === "preparatory") {
              IconComp = Compass;
              themeGradient = "from-emerald-500 via-teal-600 to-emerald-700";
              activeBorder = "border-emerald-500 ring-4 ring-emerald-500/20 shadow-xl shadow-emerald-500/15";
              cardBg = isSelected
                ? "bg-gradient-to-b from-emerald-500/[0.07] via-teal-50/25 to-white"
                : "bg-white hover:bg-emerald-50/[0.15]";
              badgeBg = "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs";
              classActivePill = "bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-700 text-white shadow-md shadow-emerald-500/30 scale-105 font-black ring-2 ring-white";
              classInactivePill = "bg-slate-100 hover:bg-teal-100/70 text-slate-700 hover:text-teal-950 font-bold border border-slate-200/60";
            } else if (stg.id === "middle") {
              IconComp = GraduationCap;
              themeGradient = "from-indigo-600 via-purple-600 to-indigo-700";
              activeBorder = "border-indigo-500 ring-4 ring-indigo-500/20 shadow-xl shadow-indigo-500/15";
              cardBg = isSelected
                ? "bg-gradient-to-b from-indigo-500/[0.07] via-purple-50/25 to-white"
                : "bg-white hover:bg-indigo-50/[0.15]";
              badgeBg = "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs";
              classActivePill = "bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-md shadow-indigo-500/30 scale-105 font-black ring-2 ring-white";
              classInactivePill = "bg-slate-100 hover:bg-indigo-100/70 text-slate-700 hover:text-indigo-950 font-bold border border-slate-200/60";
            }

            return (
              <div
                key={stg.id}
                onClick={() => handleStageSelect(stg.id)}
                className={`p-6 rounded-[28px] border-2 transition-all duration-300 cursor-pointer text-left relative overflow-hidden group flex flex-col justify-between ${cardBg} ${
                  isSelected
                    ? `${activeBorder} -translate-y-1.5`
                    : "border-slate-200/90 hover:border-slate-300 shadow-sm hover:shadow-lg hover:-translate-y-1"
                }`}
              >
                {/* Active Top Accent Bar */}
                {isSelected && (
                  <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${themeGradient}`} />
                )}

                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`size-14 rounded-2xl flex items-center justify-center font-black transition-all ${
                          isSelected
                            ? `bg-gradient-to-tr ${themeGradient} text-white shadow-lg shadow-indigo-500/25 scale-105 ring-4 ring-white`
                            : "bg-slate-100 text-slate-700 group-hover:bg-slate-200"
                        }`}
                      >
                        <IconComp className="size-7" />
                      </div>
                      <div>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${badgeBg}`}>
                          {stg.partLabelMarathi}
                        </span>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                          {stg.titleMarathi}
                        </h3>
                        <p className="text-xs text-slate-500 font-bold">
                          {stg.classesLabelMarathi}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="size-7 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-md shadow-slate-900/30 flex-shrink-0 animate-in fade-in zoom-in">
                        <Check className="size-4 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 font-medium leading-relaxed mb-4">
                    {stg.descriptionMarathi}
                  </p>
                </div>

                {/* Class Quick Selection - "वर्ग निवडा:" clearly ABOVE, and classes DOWNSIDE */}
                <div className="pt-3.5 border-t border-slate-200/90 space-y-2 mt-auto">
                  <div className="flex items-center justify-center text-center">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-800 tracking-tight flex items-center justify-center gap-1.5">
                      <span className="size-2 rounded-full bg-orange-500 ring-2 ring-orange-200"></span>
                      <span>वर्ग निवडा:</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-nowrap w-full">
                    {CLASSES_BY_STAGE[stg.id].map((c) => {
                      const isClassActive = activeStage === stg.id && selectedClass === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveStage(stg.id);
                            setSelectedClass(c.id);
                            localStorage.setItem("hpc_selected_class", c.id);
                            localStorage.setItem("hpc_selected_stage", stg.id);
                            window.dispatchEvent(
                              new CustomEvent("hpc_class_changed", {
                                detail: { cls: c.id, stageId: stg.id },
                              })
                            );
                          }}
                          className={`flex-1 min-w-0 text-center text-xs sm:text-sm py-2.5 px-2 rounded-xl transition-all cursor-pointer whitespace-nowrap font-black shadow-xs ${
                            isClassActive ? classActivePill : classInactivePill
                          }`}
                        >
                          {c.labelMarathi}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>


      {/* ---------------- 3. DASHBOARD METRICS STRIP WITH PROGRESS BAR ---------------- */}
      <div className="space-y-4">
        {/* Class Progress Header Bar */}
        <div className="bg-white/90 backdrop-blur-md p-5 sm:p-6 rounded-[28px] border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-2 bg-gradient-to-b from-indigo-500 to-emerald-500" />

          <div className="flex items-center gap-4 pl-1">
            <div className="size-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white flex items-center justify-center font-black shadow-md shadow-indigo-500/20">
              <TrendingUp className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-base sm:text-lg font-black text-slate-900">
                  {CLASSES_BY_STAGE[activeStage]?.find((c) => c.id === selectedClass)?.labelMarathi} — वर्ग मूल्यमापन प्रगती
                </span>
                <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-600 animate-ping" />
                  <span>{completionPercentage}% पूर्ण</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                एकूण <b className="text-slate-800">{totalStudents}</b> पैकी <b className="text-emerald-700">{completedHpc}</b> विद्यार्थ्यांचे HPC कार्ड पूर्ण झाले आहे.
              </p>
            </div>
          </div>

          <div className="w-full sm:w-72 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-black">
              <span className="text-slate-500 uppercase tracking-wider text-[10px]">प्रगती दर (Rate)</span>
              <span className="text-indigo-700 font-black">{completionPercentage}%</span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/80 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 rounded-full transition-all duration-700 shadow-sm"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* 6 Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
          {/* Total Students */}
          <div className="bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600" />
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">एकूण विद्यार्थी</p>
              <div className="size-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="size-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{totalStudents}</p>
            <span className="text-[10px] font-bold text-slate-500 mt-1 block">इयत्ता {selectedClass}</span>
          </div>

          {/* Completed HPC */}
          <div className="bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-emerald-200 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all relative overflow-hidden group bg-gradient-to-b from-emerald-50/20 to-white">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">पूर्ण HPC कार्ड</p>
              <div className="size-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle2 className="size-4 stroke-[2.5]" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">{completedHpc}</p>
            <span className="text-[10px] font-black text-emerald-600 mt-1 block">
              {completionPercentage}% पूर्ण
            </span>
          </div>

          {/* Pending HPC */}
          <div className="bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-amber-200 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all relative overflow-hidden group bg-gradient-to-b from-amber-50/20 to-white">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider">अपूर्ण (Pending)</p>
              <div className="size-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="size-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-700 tracking-tight">{pendingHpc}</p>
            <span className="text-[10px] font-bold text-amber-600 mt-1 block">मूल्यांकन बाकी</span>
          </div>

          {/* Session 1 Completed */}
          <div className="bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-indigo-200 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all relative overflow-hidden group bg-gradient-to-b from-indigo-50/20 to-white">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 to-blue-600" />
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">सत्र १ मूल्यांकन</p>
              <div className="size-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BookOpen className="size-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-indigo-700 tracking-tight">{session1Count}</p>
            <span className="text-[10px] font-bold text-indigo-600 mt-1 block">{session1Count} / {totalStudents} पूर्ण</span>
          </div>

          {/* Session 2 Completed */}
          <div className="bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-purple-200 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all relative overflow-hidden group bg-gradient-to-b from-purple-50/20 to-white">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 to-pink-500" />
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10px] font-black text-purple-700 uppercase tracking-wider">सत्र २ मूल्यांकन</p>
              <div className="size-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Layers className="size-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-purple-700 tracking-tight">{session2Count}</p>
            <span className="text-[10px] font-bold text-purple-600 mt-1 block">{session2Count} / {totalStudents} पूर्ण</span>
          </div>

          {/* Annual Summary Completed */}
          <div className="bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-rose-200 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all relative overflow-hidden group bg-gradient-to-b from-rose-50/20 to-white">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 to-pink-600" />
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10px] font-black text-rose-700 uppercase tracking-wider">वार्षिक गोषवारा</p>
              <div className="size-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Award className="size-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-rose-700 tracking-tight">{annualCount}</p>
            <span className="text-[10px] font-bold text-rose-600 mt-1 block">{annualCount} / {totalStudents} पूर्ण</span>
          </div>
        </div>
      </div>

      {/* ---------------- 4. STUDENT PROGRESS TABLE WITH FILTERS & ACTIONS ---------------- */}
      <div className="bg-white/95 backdrop-blur-md rounded-[32px] border border-slate-200/90 shadow-md overflow-hidden">
        {/* Table Filter Bar */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/90 via-white to-indigo-50/30">
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                विद्यार्थी HPC प्रगती यादी — {CLASSES_BY_STAGE[activeStage]?.find((c) => c.id === selectedClass)?.labelMarathi}
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                प्रत्येक विद्यार्थ्याचे सत्रनिहाय व वार्षिक मूल्यमापन तपशील
              </p>
            </div>

            <div className="h-6 w-px bg-slate-200 hidden lg:block mx-1" />

            {/* Division Selector */}
            <div className="flex items-center gap-1.5 bg-slate-100/90 hover:bg-slate-200/80 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 border border-slate-200/60 shadow-2xs transition-colors">
              <span className="text-slate-500 font-black">तुकडी:</span>
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="bg-transparent outline-none cursor-pointer font-black text-indigo-700"
              >
                <option value="all">सर्व (All)</option>
                <option value="अ">तुकडी अ</option>
                <option value="ब">तुकडी ब</option>
                <option value="क">तुकडी क</option>
                <option value="ड">तुकडी ड</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-slate-100/90 hover:bg-slate-200/80 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 border border-slate-200/60 shadow-2xs transition-colors">
              <span className="text-slate-500 font-black">स्थिती:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent outline-none cursor-pointer font-black text-indigo-700"
              >
                <option value="all">सर्व (All)</option>
                <option value="completed">केवळ पूर्ण (Completed)</option>
                <option value="pending">अपूर्ण (Pending)</option>
              </select>
            </div>

            <button
              onClick={loadProgress}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shadow-2xs"
              title="माहिती रिफ्रेश करा"
            >
              <RefreshCw className="size-3.5" />
            </button>
          </div>

          {/* Actions: Add Student & Search Box */}
          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setIsAddStudentOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-xs shadow-md shadow-orange-600/20 hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95 shrink-0"
              title="या वर्गात नवीन विद्यार्थी जोडा"
            >
              <UserPlus className="size-4" />
              <span>+ विद्यार्थी जोडा</span>
            </button>

            {/* Search Box */}
            <div className="relative w-full sm:w-64 md:w-72">
              <Search className="size-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="नाव किंवा हजेरी क्र. ने शोधा..."
                className="w-full pl-10 pr-4 py-2.5 text-xs font-bold rounded-2xl border border-slate-200/90 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white shadow-2xs transition-all"
              />
            </div>
          </div>
        </div>

        {/* Table Body */}
        {loading ? (
          <div className="p-16 text-center">
            <Loader2 className="size-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600">विद्यार्थी नोंदी लोड होत आहेत...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="size-16 rounded-3xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto shadow-sm">
              <Users className="size-8" />
            </div>
            <div>
              <p className="text-base font-black text-slate-800">
                {CLASSES_BY_STAGE[activeStage]?.find((c) => c.id === selectedClass)?.labelMarathi} मध्ये कोणतेही विद्यार्थी सापडले नाहीत.
              </p>
              <p className="text-xs text-slate-500 font-semibold max-w-md mx-auto mt-1">
                या वर्गाचे HPC मूल्यांकन सुरू करण्यासाठी खालील बटणावर क्लिक करून विद्यार्थी जोडा व माहिती जतन करा.
              </p>
            </div>
            <button
              onClick={() => setIsAddStudentOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-xs shadow-md shadow-orange-600/25 transition-all cursor-pointer active:scale-95"
            >
              <UserPlus className="size-4" />
              <span>+ या वर्गात नवीन विद्यार्थी जोडा</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 border-b-2 border-slate-300 text-slate-950 font-black text-sm sm:text-base tracking-wider uppercase">
                  <th className="py-4.5 px-3 w-20 text-center font-black text-slate-950 text-sm sm:text-base whitespace-nowrap">हजेरी क्र.</th>
                  <th className="py-4.5 px-4 font-black text-slate-950 text-sm sm:text-base whitespace-nowrap">विद्यार्थ्याचे नाव</th>
                  <th className="py-4.5 px-4 text-center font-black text-slate-950 text-sm sm:text-base whitespace-nowrap">भाग अ (PROFILE)</th>
                  <th className="py-4.5 px-4 text-center font-black text-slate-950 text-sm sm:text-base whitespace-nowrap">सत्र १ (SESSION 1)</th>
                  <th className="py-4.5 px-4 text-center font-black text-slate-950 text-sm sm:text-base whitespace-nowrap">सत्र २ (SESSION 2)</th>
                  <th className="py-4.5 px-4 text-center font-black text-slate-950 text-sm sm:text-base whitespace-nowrap">भाग क (वार्षिक)</th>
                  <th className="py-4.5 px-4 text-center font-black text-slate-950 text-sm sm:text-base whitespace-nowrap">एकूण स्थिती</th>
                  <th className="py-4.5 px-4 text-center min-w-[280px] font-black text-slate-950 text-sm sm:text-base whitespace-nowrap">कृती (ACTIONS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((item) => {
                  const s = item.student;

                  return (
                    <tr key={s.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="py-4 px-2 text-center font-black text-slate-800">
                        <span className="inline-block size-7 rounded-lg bg-slate-100 font-black text-slate-800 leading-7 text-center text-xs">
                          {s.rollNo}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 font-black text-white flex items-center justify-center overflow-hidden flex-shrink-0 shadow-xs">
                            {s.photoUrl ? (
                              <img src={s.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              s.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <span className="block font-black text-slate-900 text-sm">{s.fullName || s.name}</span>
                            <span className="text-[10px] text-slate-500 font-semibold">
                              तुकडी: {s.division || "अ"} | सरल: {s.saralId || "-"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Part A Status */}
                      <td className="p-4 text-center">
                        <Link
                          to="/teacher/hpc/student/$studentId"
                          params={{ studentId: s.id }}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black transition-all cursor-pointer shadow-2xs ${
                            item.profileCompleted
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {item.profileCompleted ? "✓ पूर्ण" : "+ नोंदवा"}
                        </Link>
                      </td>

                      {/* Session 1 Status */}
                      <td className="p-4 text-center">
                        <Link
                          to="/teacher/hpc/assessment/$studentId"
                          params={{ studentId: s.id }}
                          search={{ session: "session1" } as any}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black transition-all cursor-pointer shadow-2xs ${
                            item.session1Completed
                              ? "bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {item.session1Completed ? "✓ सत्र १ पूर्ण" : "+ सत्र १ भरा"}
                        </Link>
                      </td>

                      {/* Session 2 Status */}
                      <td className="p-4 text-center">
                        <Link
                          to="/teacher/hpc/assessment/$studentId"
                          params={{ studentId: s.id }}
                          search={{ session: "session2" } as any}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black transition-all cursor-pointer shadow-2xs ${
                            item.session2Completed
                              ? "bg-purple-100 text-purple-800 hover:bg-purple-200"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {item.session2Completed ? "✓ सत्र २ पूर्ण" : "+ सत्र २ भरा"}
                        </Link>
                      </td>

                      {/* Annual Status */}
                      <td className="p-4 text-center">
                        <Link
                          to="/teacher/hpc/assessment/$studentId"
                          params={{ studentId: s.id }}
                          search={{ tab: "annual" } as any}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black transition-all cursor-pointer shadow-2xs ${
                            item.annualCompleted
                              ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {item.annualCompleted ? "✓ गोषवारा पूर्ण" : "+ गोषवारा"}
                        </Link>
                      </td>

                      {/* Overall Status */}
                      <td className="p-4 text-center">
                        <span
                          className={`inline-block px-3 py-1.5 rounded-full text-[11px] font-black shadow-2xs ${
                            item.overallStatus === "completed"
                              ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-500/20"
                              : item.overallStatus === "in_progress"
                              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-orange-500/20"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {item.overallStatus === "completed"
                            ? "पूर्ण (Complete) ✓"
                            : item.overallStatus === "in_progress"
                            ? "प्रगतीपथावर ⏳"
                            : "अपूर्ण"}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-3 text-center whitespace-nowrap min-w-[270px]">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenPreview(s.id)}
                            disabled={previewLoadingId === s.id}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-50/80 hover:bg-orange-500 text-orange-700 hover:text-white font-bold text-xs transition-all cursor-pointer shadow-2xs border border-orange-300 hover:border-orange-500 group disabled:opacity-50"
                            title="HPC कार्ड पहा व डाऊनलोड करा"
                          >
                            {previewLoadingId === s.id ? (
                              <Loader2 className="size-3.5 animate-spin text-orange-600 group-hover:text-white" />
                            ) : (
                              <Eye className="size-3.5 text-orange-600 group-hover:text-white transition-colors" />
                            )}
                            <span>HPC कार्ड पहा</span>
                          </button>
                          <Link
                            to="/teacher/hpc/assessment/$studentId"
                            params={{ studentId: s.id }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50/80 hover:bg-emerald-600 text-emerald-700 hover:text-white font-bold text-xs transition-all cursor-pointer shadow-2xs border border-emerald-300 hover:border-emerald-600 group"
                            title="HPC कार्ड भरा"
                          >
                            <Edit className="size-3.5 text-emerald-600 group-hover:text-white transition-colors" />
                            <span>HPC कार्ड भरा</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------------- 5. LIVE PDF PREVIEW MODAL ---------------- */}
      {previewStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div>
                <h3 className="text-base font-black">
                  HPC समग्र प्रगतिपत्रक प्रिव्ह्यू: {previewStudent.student?.name}
                </h3>
                <p className="text-xs text-slate-400">
                  {currentStageInfo.titleMarathi} | इयत्ता {selectedClass} | सन {academicYear}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700 shadow-xs"
                  title="थेट प्रिंट करा किंवा PDF सेव्ह करा"
                >
                  <Printer className="size-3.5" />
                  <span>प्रिंट / PDF सेव्ह</span>
                </button>
                <button
                  onClick={handleDownloadPdf}
                  disabled={pdfGenerating}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {pdfGenerating ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                  <span>
                    {pdfGenerating
                      ? pdfProgress.message || "PDF तयार होत आहे..."
                      : "PDF डाऊनलोड करा"}
                  </span>
                </button>
                <button
                  onClick={() => setPreviewStudent(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Report Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/90 flex flex-col items-center">
              <div className="mb-5 px-5 py-2.5 bg-white/95 backdrop-blur rounded-full text-xs font-black text-slate-800 border border-slate-300 shadow-xs flex items-center gap-2">
                <FileText className="size-4 text-indigo-600" />
                <span>HPC समग्र प्रगतिपत्रक (एकूण १९ पृष्ठे) — खाली स्क्रोल करून सर्व पृष्ठे तपासा</span>
              </div>
              <div
                ref={previewContainerRef}
                className="scale-[0.9] sm:scale-100 origin-top flex flex-col items-center"
              >
                {activeStage === "foundational" ? (
                  <FoundationalHpcPdf
                    student={previewStudent.student}
                    profile={previewStudent.profile}
                    session1={previewStudent.session1}
                    session2={previewStudent.session2}
                    annualSummary={previewStudent.annualSummary}
                    attendance={previewStudent.attendance}
                    schoolSettings={previewStudent.schoolSettings}
                    academicYear={academicYear}
                  />
                ) : activeStage === "preparatory" ? (
                  <PreparatoryHpcPdf
                    student={previewStudent.student}
                    profile={previewStudent.profile}
                    session1={previewStudent.session1}
                    session2={previewStudent.session2}
                    annualSummary={previewStudent.annualSummary}
                    attendance={previewStudent.attendance}
                    schoolSettings={previewStudent.schoolSettings}
                    academicYear={academicYear}
                  />
                ) : (
                  <MiddleHpcPdf
                    student={previewStudent.student}
                    profile={previewStudent.profile}
                    session1={previewStudent.session1}
                    session2={previewStudent.session2}
                    annualSummary={previewStudent.annualSummary}
                    attendance={previewStudent.attendance}
                    schoolSettings={previewStudent.schoolSettings}
                    academicYear={academicYear}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 6. ADD STUDENT MODAL ---------------- */}
      {isAddStudentOpen && (
        <HpcAddStudentModal
          isOpen={isAddStudentOpen}
          onClose={() => setIsAddStudentOpen(false)}
          defaultClass={selectedClass}
          defaultDivision={selectedDivision === "all" ? "अ" : selectedDivision}
          academicYear={academicYear}
          medium={selectedMedium}
          nextRollNo={String(progressItems.length + 1)}
          onStudentAdded={() => {
            setIsAddStudentOpen(false);
            loadProgress();
          }}
        />
      )}
    </div>
  );
}
