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
} from "lucide-react";
import { toast } from "sonner";
import { HpcStageId } from "../types/hpc";
import { HPC_STAGES_INFO } from "../data/hpcCurricularGoals";
import {
  getHpcProgressForClass,
  HpcStudentProgressItem,
  getHpcStudentById,
  getHpcStudentProfile,
  getHpcSessionAssessment,
  getHpcAnnualSummary,
  getHpcStudentAttendance,
  getHpcSchoolSettings,
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
    { id: "1st", labelMarathi: "इयत्ता १ ली (1st)" },
    { id: "2nd", labelMarathi: "इयत्ता २ री (2nd)" },
  ],
  preparatory: [
    { id: "3rd", labelMarathi: "इयत्ता ३ री (3rd)" },
    { id: "4th", labelMarathi: "इयत्ता ४ थी (4th)" },
    { id: "5th", labelMarathi: "इयत्ता ५ वी (5th)" },
  ],
  middle: [
    { id: "6th", labelMarathi: "इयत्ता ६ वी (6th)" },
    { id: "7th", labelMarathi: "इयत्ता ७ वी (7th)" },
    { id: "8th", labelMarathi: "इयत्ता ८ वी (8th)" },
  ],
};

export function HpcDashboard() {
  const navigate = useNavigate();

  // Filters State
  const academicYearOptions = useMemo(() => getAcademicYearOptions(), []);
  const [activeStage, setActiveStage] = useState<HpcStageId>("foundational");
  const [selectedClass, setSelectedClass] = useState<string>("1st");
  const [academicYear, setAcademicYear] = useState<string>(() => getInitialAcademicYear());
  const [selectedMedium, setSelectedMedium] = useState<string>(() => {
    return localStorage.getItem("cce_selected_medium") || "marathi";
  });

  const handleAcademicYearChange = (yr: string) => {
    setAcademicYear(yr);
    localStorage.setItem("cce_academic_year", yr);
  };
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Data State
  const [loading, setLoading] = useState(true);
  const [progressItems, setProgressItems] = useState<HpcStudentProgressItem[]>([]);

  // Preview & Download Modal State
  const [previewStudent, setPreviewStudent] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0, message: "" });
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Sync Class with Stage
  const handleStageSelect = (stageId: HpcStageId) => {
    setActiveStage(stageId);
    const classes = CLASSES_BY_STAGE[stageId];
    if (classes && !classes.some((c) => c.id === selectedClass)) {
      setSelectedClass(classes[0].id);
    }
  };

  // Fetch Class Progress
  const loadProgress = async () => {
    setLoading(true);
    try {
      const items = await getHpcProgressForClass(selectedClass, academicYear, selectedMedium);
      setProgressItems(items);
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

  // Open Preview Modal
  const handleOpenPreview = async (studentId: string) => {
    setPreviewLoading(true);
    try {
      const st = await getHpcStudentById(studentId);
      const prof = await getHpcStudentProfile(studentId, academicYear);
      const s1 = await getHpcSessionAssessment(studentId, academicYear, "session1");
      const s2 = await getHpcSessionAssessment(studentId, academicYear, "session2");
      const ann = await getHpcAnnualSummary(studentId, academicYear);
      const att = await getHpcStudentAttendance(selectedClass, academicYear, studentId);
      const school = await getHpcSchoolSettings();

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
      toast.error("माहिती लोड करताना त्रुटी: " + err.message);
    } finally {
      setPreviewLoading(false);
    }
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
    <div className="space-y-7 max-w-[1360px] mx-auto pb-16">
      {/* ---------------- 1. HERO BANNER ---------------- */}
      <div className="w-full bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white rounded-[2.5rem] p-6 sm:p-8 md:p-10 shadow-2xl relative overflow-hidden border border-indigo-900/40">
        {/* Decorative background glow & mesh */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-indigo-500/20 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            <div className="size-14 sm:size-16 rounded-3xl bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-600 p-0.5 shadow-xl shadow-orange-500/20 flex-shrink-0">
              <div className="w-full h-full bg-slate-950/80 rounded-[22px] backdrop-blur-xs flex items-center justify-center text-amber-400">
                <Sparkles className="size-7 sm:size-8 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
                  समग्र प्रगतिपत्रक (HPC) व्यवस्थापन
                </h1>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] sm:text-xs font-black px-3 py-1 rounded-full uppercase flex items-center gap-1 shadow-xs">
                  <ShieldCheck className="size-3.5" />
                  ३६०° NEP 2020 & PARAKH
                </span>
                <span className="bg-emerald-400/15 text-emerald-300 border border-emerald-400/30 text-[10px] sm:text-xs font-extrabold px-3 py-1 rounded-full">
                  SCERT अधिकृत
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-2xl leading-relaxed">
                विद्यार्थ्यांच्या बोधात्मक, भावात्मक आणि क्रियात्मक (Cognitive, Affective, Psychomotor) विकासाचे ३६० अंश बहुआयामी मूल्यमापन व प्रगती नोंद.
              </p>
            </div>
          </div>

          {/* Quick Year & Medium Selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-xs">
              <Calendar className="size-3.5 text-indigo-300" />
              <span className="text-[11px] font-bold text-slate-300 uppercase">वर्ष:</span>
              <select
                value={academicYear}
                onChange={(e) => handleAcademicYearChange(e.target.value)}
                className="bg-transparent text-white text-xs font-black outline-none cursor-pointer"
              >
                {academicYearOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="text-slate-900 font-bold">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-xs">
              <span className="text-[11px] font-bold text-slate-300 uppercase">माध्यम:</span>
              <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {selectedMedium === "semi" ? "सेमी इंग्रजी" : "मराठी"}
              </span>
            </div>
          </div>
        </div>

        {/* Feature Highlights Banner Bar */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <span className="size-2 rounded-full bg-amber-400" />
            <span>६ विकास क्षेत्रे (६०+ क्षमता)</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <span className="size-2 rounded-full bg-emerald-400" />
            <span>उपक्रम बँक व ५ स्वयंचलित प्रश्न</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <span className="size-2 rounded-full bg-indigo-400" />
            <span>३-स्तरीय रूब्रिक्स व ३६०° अभिप्राय</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <span className="size-2 rounded-full bg-pink-400" />
            <span>SCERT मानक रंगीत PDF रिपोर्ट</span>
          </div>
        </div>
      </div>

      {/* ---------------- 2. THE THREE STAGES SELECTOR (३ शैक्षणिक स्तर) ---------------- */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Layers className="size-5 text-indigo-600" />
              <span>शैक्षणिक स्तर निवडा (Select Educational Stage)</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              पायाभूत (१ ली-२ री), पूर्वतयारी (३ री-५ वी) किंवा मध्य स्तर (६ वी-८ वी) निवडून वर्ग निवडा
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {HPC_STAGES_INFO.map((stg) => {
            const isSelected = activeStage === stg.id;
            let IconComp = BookOpen;
            let themeGradient = "from-amber-500 to-orange-500";
            let activeBorder = "border-amber-500 ring-4 ring-amber-100";
            let badgeBg = "bg-amber-50 text-amber-800 border-amber-200";

            if (stg.id === "preparatory") {
              IconComp = Compass;
              themeGradient = "from-emerald-500 to-teal-600";
              activeBorder = "border-emerald-600 ring-4 ring-emerald-100";
              badgeBg = "bg-emerald-50 text-emerald-800 border-emerald-200";
            } else if (stg.id === "middle") {
              IconComp = GraduationCap;
              themeGradient = "from-purple-600 to-indigo-600";
              activeBorder = "border-purple-600 ring-4 ring-purple-100";
              badgeBg = "bg-purple-50 text-purple-800 border-purple-200";
            }

            return (
              <div
                key={stg.id}
                onClick={() => handleStageSelect(stg.id)}
                className={`p-6 rounded-[28px] border-2 transition-all duration-200 cursor-pointer text-left relative overflow-hidden group ${
                  isSelected
                    ? `bg-white ${activeBorder} shadow-xl -translate-y-1`
                    : "bg-white hover:bg-slate-50/80 border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-md"
                }`}
              >
                {/* Active corner accent bar */}
                {isSelected && (
                  <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${themeGradient}`} />
                )}

                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`size-13 rounded-2xl flex items-center justify-center font-black transition-all ${
                        isSelected
                          ? `bg-gradient-to-tr ${themeGradient} text-white shadow-md shadow-indigo-500/20 scale-105`
                          : "bg-slate-100 text-slate-700 group-hover:bg-slate-200"
                      }`}
                    >
                      <IconComp className="size-6" />
                    </div>
                    <div>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${badgeBg}`}>
                        {stg.partLabelMarathi}
                      </span>
                      <h3 className="text-base font-black text-slate-900 mt-1">{stg.titleMarathi}</h3>
                      <p className="text-[11px] text-slate-500 font-bold">{stg.classesLabelMarathi}</p>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="size-6 rounded-full bg-slate-950 text-white flex items-center justify-center shadow-xs">
                      <Check className="size-3.5 stroke-[3]" />
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">
                  {stg.descriptionMarathi}
                </p>

                {/* Class Quick Selection Pills */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center gap-2 flex-wrap">
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
                        }}
                        className={`text-xs font-black px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                          isClassActive
                            ? "bg-slate-950 text-white shadow-md scale-105"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
                        }`}
                      >
                        {c.labelMarathi}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------------- 3. HPC 4-STEP WORKFLOW GUIDE (४ सोप्या पायऱ्या) ---------------- */}
      <div className="bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-amber-50/40 rounded-3xl p-5 sm:p-6 border border-indigo-100/80 shadow-xs">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <Zap className="size-4 text-amber-500" />
              <span>HPC मूल्यांकन कार्यप्रवाह — ४ सोप्या पायऱ्या (Step-by-Step Flow)</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              प्रत्येक विद्यार्थ्याचे HPC प्रगतिपत्रक तयार करण्यासाठी खालील क्रमाने काम पूर्ण करा
            </p>
          </div>
          <span className="text-[11px] font-black text-indigo-700 bg-white px-3 py-1 rounded-full border border-indigo-200 shadow-2xs">
            मार्गदर्शिका
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Step 1 */}
          <Link
            to="/teacher/hpc/students"
            className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-indigo-400 hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                  पायरी १
                </span>
                <Users className="size-4 text-indigo-600 group-hover:scale-110 transition-transform" />
              </div>
              <h4 className="text-xs font-black text-slate-900 mb-1">विद्यार्थी नोंदी (भाग अ)</h4>
              <p className="text-[11px] text-slate-500 line-clamp-2">
                वैयक्तिक माहिती, आवडीनिवडी, पालक नोंद, आधार व उपस्थिती तपशील.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-black text-indigo-600">
              <span>नोंदी भरा</span>
              <ChevronRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Step 2 */}
          <div
            onClick={() => {
              const firstStudent = progressItems[0]?.student?.id;
              if (firstStudent) {
                navigate({
                  to: `/teacher/hpc/assessment/${firstStudent}` as any,
                  search: { tab: "assessment", session: "session1" } as any,
                });
              } else {
                toast.info("कृपया आधी विद्यार्थी निवडा.");
              }
            }}
            className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-emerald-400 hover:shadow-md transition-all group flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                  पायरी २
                </span>
                <BookOpen className="size-4 text-emerald-600 group-hover:scale-110 transition-transform" />
              </div>
              <h4 className="text-xs font-black text-slate-900 mb-1">सत्रनिहाय मूल्यांकन (भाग ब)</h4>
              <p className="text-[11px] text-slate-500 line-clamp-2">
                ६ विकास क्षेत्रे, उपक्रम बँक, ५ प्रश्न व ३-स्तरीय कामगिरी रूब्रिक्स.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-black text-emerald-600">
              <span>मूल्यांकन करा</span>
              <ChevronRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Step 3 */}
          <div
            onClick={() => {
              const firstStudent = progressItems[0]?.student?.id;
              if (firstStudent) {
                navigate({
                  to: `/teacher/hpc/assessment/${firstStudent}` as any,
                  search: { tab: "annual" } as any,
                });
              } else {
                toast.info("कृपया आधी विद्यार्थी निवडा.");
              }
            }}
            className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-purple-400 hover:shadow-md transition-all group flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full">
                  पायरी ३
                </span>
                <Award className="size-4 text-purple-600 group-hover:scale-110 transition-transform" />
              </div>
              <h4 className="text-xs font-black text-slate-900 mb-1">वार्षिक गोषवारा (भाग क)</h4>
              <p className="text-[11px] text-slate-500 line-clamp-2">
                वार्षिक सर्वंकष प्रगती गोषवारा, शिक्षक व पालक अंतिम अभिप्राय.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-black text-purple-600">
              <span>गोषवारा भरा</span>
              <ChevronRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Step 4 */}
          <Link
            to="/teacher/hpc/reports"
            className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-amber-400 hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                  पायरी ४
                </span>
                <FileText className="size-4 text-amber-600 group-hover:scale-110 transition-transform" />
              </div>
              <h4 className="text-xs font-black text-slate-900 mb-1">HPC अहवाल व ३६०° PDF</h4>
              <p className="text-[11px] text-slate-500 line-clamp-2">
                अधिकृत SCERT मानकानुसार रंगीत व सुबक ३६०° प्रगती अहवाल डाऊनलोड.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-black text-amber-600">
              <span>PDF डाऊनलोड</span>
              <ChevronRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* ---------------- 4. DASHBOARD METRICS STRIP WITH PROGRESS BAR ---------------- */}
      <div className="space-y-3">
        {/* Class Progress Header Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900">
                  इयत्ता {CLASSES_BY_STAGE[activeStage]?.find((c) => c.id === selectedClass)?.labelMarathi} — वर्ग प्रगती
                </span>
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {completionPercentage}% पूर्ण
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {totalStudents} पैकी {completedHpc} विद्यार्थ्यांचे HPC कार्ड पूर्ण झाले आहे.
              </p>
            </div>
          </div>

          <div className="w-full sm:w-64">
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
              <div
                className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* 6 Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Total Students */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">एकूण विद्यार्थी</p>
              <Users className="size-4 text-blue-500" />
            </div>
            <p className="text-2xl font-black text-slate-900">{totalStudents}</p>
            <span className="text-[10px] font-bold text-slate-500">इयत्ता {selectedClass}</span>
          </div>

          {/* Completed HPC */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">पूर्ण HPC कार्ड</p>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-700">{completedHpc}</p>
            <span className="text-[10px] font-bold text-emerald-600">
              {completionPercentage}% पूर्ण
            </span>
          </div>

          {/* Pending HPC */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider">अपूर्ण (Pending)</p>
              <Clock className="size-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-700">{pendingHpc}</p>
            <span className="text-[10px] font-bold text-amber-600">मूल्यांकन बाकी</span>
          </div>

          {/* Session 1 Completed */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-indigo-300 transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">सत्र १ मूल्यांकन</p>
              <BookOpen className="size-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-black text-indigo-700">{session1Count}</p>
            <span className="text-[10px] font-bold text-slate-500">{session1Count} / {totalStudents}</span>
          </div>

          {/* Session 2 Completed */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-purple-300 transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black text-purple-600 uppercase tracking-wider">सत्र २ मूल्यांकन</p>
              <Layers className="size-4 text-purple-500" />
            </div>
            <p className="text-2xl font-black text-purple-700">{session2Count}</p>
            <span className="text-[10px] font-bold text-slate-500">{session2Count} / {totalStudents}</span>
          </div>

          {/* Annual Summary Completed */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden group hover:border-rose-300 transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black text-rose-600 uppercase tracking-wider">वार्षिक गोषवारा</p>
              <Award className="size-4 text-rose-500" />
            </div>
            <p className="text-2xl font-black text-rose-700">{annualCount}</p>
            <span className="text-[10px] font-bold text-slate-500">{annualCount} / {totalStudents}</span>
          </div>
        </div>
      </div>

      {/* ---------------- 5. STUDENT PROGRESS TABLE WITH FILTERS & ACTIONS ---------------- */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Filter Bar */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-base font-black text-slate-900">
              विद्यार्थी HPC प्रगती यादी — {CLASSES_BY_STAGE[activeStage]?.find((c) => c.id === selectedClass)?.labelMarathi}
            </h3>

            {/* Division Selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700">
              <span>तुकडी:</span>
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
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700">
              <span>स्थिती:</span>
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
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="माहिती रिफ्रेश करा"
            >
              <RefreshCw className="size-3.5" />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="size-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="नाव किंवा हजेरी क्र. ने शोधा..."
              className="w-full pl-10 pr-4 py-2 text-xs font-bold rounded-2xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-slate-50/50"
            />
          </div>
        </div>

        {/* Table Body */}
        {loading ? (
          <div className="p-16 text-center">
            <Loader2 className="size-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600">विद्यार्थी नोंदी लोड होत आहेत...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Users className="size-12 text-slate-300 mx-auto" />
            <p className="text-base font-bold text-slate-700">कोणतेही विद्यार्थी सापडले नाहीत.</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              या वर्गात अद्याप विद्यार्थी नोंदवलेले नाहीत किंवा फिल्टरनुसार माहिती जुळत नाही. CCE विभागात विद्यार्थी उपलब्ध असल्यास ते येथे आपोआप दिसतील.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[11px]">
                  <th className="p-4 w-16 text-center">हजेरी क्र.</th>
                  <th className="p-4">विद्यार्थ्याचे नाव</th>
                  <th className="p-4 text-center">भाग अ (Profile)</th>
                  <th className="p-4 text-center">सत्र १ (Session 1)</th>
                  <th className="p-4 text-center">सत्र २ (Session 2)</th>
                  <th className="p-4 text-center">भाग क (वार्षिक)</th>
                  <th className="p-4 text-center">एकूण स्थिती</th>
                  <th className="p-4 text-right">कृती (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((item) => {
                  const s = item.student;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 text-center font-black text-slate-800">{s.rollNo}</td>
                      <td className="p-4 font-bold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl bg-slate-100 font-black text-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {s.photoUrl ? (
                              <img src={s.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              s.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <span className="block font-black text-slate-900 text-sm">{s.fullName || s.name}</span>
                            <span className="text-[10px] text-slate-500">
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
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black cursor-pointer ${
                            item.profileCompleted
                              ? "bg-emerald-100 text-emerald-800"
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
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black cursor-pointer ${
                            item.session1Completed
                              ? "bg-indigo-100 text-indigo-800"
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
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black cursor-pointer ${
                            item.session2Completed
                              ? "bg-purple-100 text-purple-800"
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
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black cursor-pointer ${
                            item.annualCompleted
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {item.annualCompleted ? "✓ गोषवारा पूर्ण" : "+ गोषवारा"}
                        </Link>
                      </td>

                      {/* Overall Status */}
                      <td className="p-4 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-[11px] font-black ${
                            item.overallStatus === "completed"
                              ? "bg-emerald-600 text-white shadow-xs"
                              : item.overallStatus === "in_progress"
                              ? "bg-amber-500 text-white"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {item.overallStatus === "completed"
                            ? "पूर्ण (Complete)"
                            : item.overallStatus === "in_progress"
                            ? "प्रगतीपथावर"
                            : "अपूर्ण"}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenPreview(s.id)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white transition-all cursor-pointer"
                            title="HPC कार्ड पहा व डाऊनलोड करा"
                          >
                            <Eye className="size-4" />
                          </button>
                          <Link
                            to="/teacher/hpc/assessment/$studentId"
                            params={{ studentId: s.id }}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-600 text-slate-700 hover:text-white transition-all cursor-pointer"
                            title="मूल्यांकन संपादित करा"
                          >
                            <Edit className="size-4" />
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
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
              <div
                ref={previewContainerRef}
                className="bg-white shadow-xl rounded-2xl overflow-hidden scale-[0.9] sm:scale-100 origin-top"
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
    </div>
  );
}
