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

  return (
    <div className="space-y-6 max-w-[1360px] mx-auto pb-16">
      {/* Top Back Action Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/teacher"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-900 hover:text-white text-slate-800 border border-slate-200 hover:border-slate-900 rounded-2xl text-xs sm:text-sm font-black transition-all shadow-xs cursor-pointer group"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
          <span>मुख्य शिक्षक डॅशबोर्डवर परत जा (Back to Teacher Dashboard)</span>
        </Link>
      </div>

      {/* ---------------- 1. HERO BANNER ---------------- */}
      <div className="w-full bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-[2.5rem] p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4 rounded-3xl text-white font-black flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Sparkles className="size-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  समग्र प्रगतिपत्रक व्यवस्थापन (HPC Management)
                </h1>
                <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 text-[11px] font-extrabold px-3 py-1 rounded-full uppercase">
                  360° NEP 2020 & PARAKH
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1 max-w-2xl">
                विद्यार्थ्यांच्या बोधात्मक, भावात्मक आणि क्रियात्मक विकासाचे ३६० अंश बहुआयामी मूल्यांकन व अधिकृत SCERT प्रगतिपत्रक
              </p>
            </div>
          </div>

          {/* Quick Year & Medium Selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2 flex items-center gap-2">
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

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2 flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-300 uppercase">माध्यम:</span>
              <span className="text-xs font-black text-emerald-300">
                {selectedMedium === "semi" ? "सेमी इंग्रजी" : "मराठी"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- 2. THE THREE STAGES SELECTOR (३ स्तर विभागणी) ---------------- */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Layers className="size-5 text-indigo-600" />
              <span>शैक्षणिक स्तर निवडा (Select Educational Stage)</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              पायाभूत (१ ली-२ री), पूर्वतयारी (३ री-५ वी) किंवा मध्य स्तर (६ वी-८ वी)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {HPC_STAGES_INFO.map((stg) => {
            const isSelected = activeStage === stg.id;
            let IconComp = BookOpen;
            if (stg.id === "preparatory") IconComp = Compass;
            if (stg.id === "middle") IconComp = GraduationCap;

            return (
              <div
                key={stg.id}
                onClick={() => handleStageSelect(stg.id)}
                className={`p-6 rounded-3xl border-2 transition-all cursor-pointer text-left relative overflow-hidden ${
                  isSelected
                    ? "bg-white border-indigo-600 ring-4 ring-indigo-100 shadow-xl -translate-y-1"
                    : "bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`size-12 rounded-2xl flex items-center justify-center font-black ${
                        isSelected
                          ? "bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <IconComp className="size-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {stg.partLabelMarathi}
                      </span>
                      <h3 className="text-base font-black text-slate-900">{stg.titleMarathi}</h3>
                      <p className="text-[11px] text-slate-500 font-semibold">{stg.classesLabelMarathi}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="size-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="size-3.5 stroke-[3]" />
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">
                  {stg.descriptionMarathi}
                </p>

                {/* Class Quick Pills */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                  {CLASSES_BY_STAGE[stg.id].map((c) => (
                    <span
                      key={c.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveStage(stg.id);
                        setSelectedClass(c.id);
                      }}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                        selectedClass === c.id
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {c.labelMarathi}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------------- 3. DASHBOARD METRICS STRIP ---------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Students */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">एकूण विद्यार्थी</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalStudents}</p>
          <span className="text-[10px] font-bold text-slate-500">इयत्ता {selectedClass}</span>
        </div>

        {/* Completed HPC */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">पूर्ण HPC कार्ड</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{completedHpc}</p>
          <span className="text-[10px] font-bold text-emerald-600">
            {totalStudents > 0 ? Math.round((completedHpc / totalStudents) * 100) : 0}% पूर्ण
          </span>
        </div>

        {/* Pending HPC */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider">अपूर्ण (Pending)</p>
          <p className="text-2xl font-black text-amber-700 mt-1">{pendingHpc}</p>
          <span className="text-[10px] font-bold text-amber-600">मूल्यांकन बाकी</span>
        </div>

        {/* Session 1 Completed */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">सत्र १ मूल्यांकन</p>
          <p className="text-2xl font-black text-indigo-700 mt-1">{session1Count}</p>
          <span className="text-[10px] font-bold text-slate-500">{session1Count} / {totalStudents}</span>
        </div>

        {/* Session 2 Completed */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-purple-600 uppercase tracking-wider">सत्र २ मूल्यांकन</p>
          <p className="text-2xl font-black text-purple-700 mt-1">{session2Count}</p>
          <span className="text-[10px] font-bold text-slate-500">{session2Count} / {totalStudents}</span>
        </div>

        {/* Annual Summary Completed */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-rose-600 uppercase tracking-wider">वार्षिक गोषवारा</p>
          <p className="text-2xl font-black text-rose-700 mt-1">{annualCount}</p>
          <span className="text-[10px] font-bold text-slate-500">{annualCount} / {totalStudents}</span>
        </div>
      </div>

      {/* ---------------- 4. STUDENT PROGRESS TABLE WITH FILTERS & ACTIONS ---------------- */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Filter Bar */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-base font-black text-slate-900">
              विद्यार्थी HPC प्रगती यादी — {CLASSES_BY_STAGE[activeStage]?.find((c) => c.id === selectedClass)?.labelMarathi}
            </h3>

            {/* Division Selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-xl text-xs font-bold text-slate-700">
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
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-xl text-xs font-bold text-slate-700">
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
