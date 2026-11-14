import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { ModulePaywall } from "@/components/teacher/ModulePaywall";
import {
  Users,
  ClipboardCheck,
  User,
  ArrowLeft,
  Sparkles,
  BookOpen,
  Compass,
  GraduationCap,
  Layers,
  CheckCircle2,
  ChevronRight,
  Info,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
// @ts-ignore
import { matchStudentClassAndMedium } from "@/result/firestoreMarksHelper";
import { CCEStudentList } from "@/components/teacher/CCEStudentList";
import { CCEAttendance } from "@/components/teacher/CCEAttendance";
import { CCEStudentInfo } from "@/components/teacher/CCEStudentInfo";
import {
  getCurrentAcademicYear,
  getAcademicYearOptions,
  getInitialAcademicYear,
} from "@/hpc/utils/academicYear";

export const Route = createFileRoute("/teacher/hpc-card")({
  component: TeacherHpcCardPage,
});

export type HpcStageId = "foundational" | "preparatory" | "middle";

export interface HpcClassConfig {
  id: string; // "1st", "2nd", etc.
  numeric: number;
  labelMarathi: string;
  labelEnglish: string;
  stageId: HpcStageId;
}

export interface HpcStageConfig {
  id: HpcStageId;
  partNumber: number;
  partLabelMarathi: string;
  partLabelEnglish: string;
  titleMarathi: string;
  titleEnglish: string;
  classesLabelMarathi: string;
  classesLabelEnglish: string;
  classIds: string[];
  ageGroupMarathi: string;
  descriptionMarathi: string;
  theme: {
    gradient: string;
    lightBg: string;
    border: string;
    activeBorder: string;
    activeRing: string;
    textDark: string;
    badgeBg: string;
    badgeText: string;
    iconBg: string;
    shadow: string;
  };
}

export const HPC_STAGES: HpcStageConfig[] = [
  {
    id: "foundational",
    partNumber: 1,
    partLabelMarathi: "भाग १",
    partLabelEnglish: "Part 1",
    titleMarathi: "पायाभूत स्तर",
    titleEnglish: "Foundational Stage",
    classesLabelMarathi: "इयत्ता १ ली व २ री",
    classesLabelEnglish: "Class 1 & 2",
    classIds: ["1st", "2nd"],
    ageGroupMarathi: "वय वर्षे ६ ते ८",
    descriptionMarathi:
      "राष्ट्रीय अभ्यासक्रम आराखडा (NCF-FS) नुसार मूलभूत साक्षरता व संख्याज्ञान (FLN), खेळ व कृती आधारित सर्वांगीण विकास मूल्यांकन.",
    theme: {
      gradient: "from-blue-600 via-indigo-600 to-sky-500",
      lightBg: "bg-blue-50/70",
      border: "border-blue-200",
      activeBorder: "border-blue-500",
      activeRing: "ring-blue-100",
      textDark: "text-blue-900",
      badgeBg: "bg-blue-100",
      badgeText: "text-blue-800 border-blue-200",
      iconBg: "bg-blue-600 text-white shadow-blue-500/25",
      shadow: "shadow-blue-500/10",
    },
  },
  {
    id: "preparatory",
    partNumber: 2,
    partLabelMarathi: "भाग २",
    partLabelEnglish: "Part 2",
    titleMarathi: "पूर्वतयारी स्तर",
    titleEnglish: "Preparatory Stage",
    classesLabelMarathi: "इयत्ता ३ री ते ५ वी",
    classesLabelEnglish: "Class 3 to 5",
    classIds: ["3rd", "4th", "5th"],
    ageGroupMarathi: "वय वर्षे ८ ते ११",
    descriptionMarathi:
      "NCF-SE नुसार संकल्पनात्मक समज, भाषा कौशल्ये, गणितीय विचार, परिसर अभ्यास, उपक्रमशीलता व स्वयं-अध्ययन कौशल्ये मूल्यांकन.",
    theme: {
      gradient: "from-emerald-600 via-teal-600 to-cyan-600",
      lightBg: "bg-emerald-50/70",
      border: "border-emerald-200",
      activeBorder: "border-emerald-500",
      activeRing: "ring-emerald-100",
      textDark: "text-emerald-900",
      badgeBg: "bg-emerald-100",
      badgeText: "text-emerald-800 border-emerald-200",
      iconBg: "bg-emerald-600 text-white shadow-emerald-500/25",
      shadow: "shadow-emerald-500/10",
    },
  },
  {
    id: "middle",
    partNumber: 3,
    partLabelMarathi: "भाग ३",
    partLabelEnglish: "Part 3",
    titleMarathi: "पूर्व माध्यमिक स्तर",
    titleEnglish: "Middle Stage",
    classesLabelMarathi: "इयत्ता ६ वी ते ८ वी",
    classesLabelEnglish: "Class 6 to 8",
    classIds: ["6th", "7th", "8th"],
    ageGroupMarathi: "वय वर्षे ११ ते १४",
    descriptionMarathi:
      "NCF-SE नुसार विषयनिहाय सखोल अध्ययन, वैज्ञानिक दृष्टिकोन, सामाजिक जाणिवा, व्यावसायिक परिचय व बहुआयामी कौशल्ये मूल्यांकन.",
    theme: {
      gradient: "from-purple-600 via-indigo-600 to-pink-600",
      lightBg: "bg-purple-50/70",
      border: "border-purple-200",
      activeBorder: "border-purple-500",
      activeRing: "ring-purple-100",
      textDark: "text-purple-900",
      badgeBg: "bg-purple-100",
      badgeText: "text-purple-800 border-purple-200",
      iconBg: "bg-purple-600 text-white shadow-purple-500/25",
      shadow: "shadow-purple-500/10",
    },
  },
];

export const HPC_CLASSES: HpcClassConfig[] = [
  { id: "1st", numeric: 1, labelMarathi: "इयत्ता १ ली", labelEnglish: "Class 1st", stageId: "foundational" },
  { id: "2nd", numeric: 2, labelMarathi: "इयत्ता २ री", labelEnglish: "Class 2nd", stageId: "foundational" },
  { id: "3rd", numeric: 3, labelMarathi: "इयत्ता ३ री", labelEnglish: "Class 3rd", stageId: "preparatory" },
  { id: "4th", numeric: 4, labelMarathi: "इयत्ता ४ थी", labelEnglish: "Class 4th", stageId: "preparatory" },
  { id: "5th", numeric: 5, labelMarathi: "इयत्ता ५ वी", labelEnglish: "Class 5th", stageId: "preparatory" },
  { id: "6th", numeric: 6, labelMarathi: "इयत्ता ६ वी", labelEnglish: "Class 6th", stageId: "middle" },
  { id: "7th", numeric: 7, labelMarathi: "इयत्ता ७ वी", labelEnglish: "Class 7th", stageId: "middle" },
  { id: "8th", numeric: 8, labelMarathi: "इयत्ता ८ वी", labelEnglish: "Class 8th", stageId: "middle" },
];

const getStageFromClass = (classId: string): HpcStageId => {
  const match = HPC_CLASSES.find((c) => c.id === classId);
  return match?.stageId || "foundational";
};

function TeacherHpcCardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"dashboard" | "student-list" | "attendance" | "student-info">("dashboard");

  const [selectedClass, setSelectedClass] = useState<string>(() => {
    return localStorage.getItem("cce_selected_class") || "1st";
  });

  const [activeStage, setActiveStage] = useState<HpcStageId>(() => {
    const stored = localStorage.getItem("cce_selected_class") || "1st";
    return getStageFromClass(stored);
  });

  const [academicYear, setAcademicYear] = useState(() => {
    return localStorage.getItem("cce_academic_year") || getCurrentAcademicYear();
  });

  const [selectedMedium, setSelectedMedium] = useState(() => {
    return localStorage.getItem("cce_selected_medium") || "marathi";
  });

  // Real-time student counts dictionary per class
  const [classCounts, setClassCounts] = useState<Record<string, number>>({});
  const [totalAllStudents, setTotalAllStudents] = useState<number>(0);

  useEffect(() => {
    localStorage.setItem("cce_selected_class", selectedClass);
    setActiveStage(getStageFromClass(selectedClass));
  }, [selectedClass]);

  useEffect(() => {
    localStorage.setItem("cce_academic_year", academicYear);
  }, [academicYear]);

  useEffect(() => {
    localStorage.setItem("cce_selected_medium", selectedMedium);
  }, [selectedMedium]);

  // Real-time student count sync for all classes with current medium
  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "student"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const raw = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      const counts: Record<string, number> = {};
      let total = 0;

      HPC_CLASSES.forEach((c) => {
        const filtered = raw.filter((s: any) => matchStudentClassAndMedium(s, c.id, selectedMedium));
        counts[c.id] = filtered.length;
        total += filtered.length;
      });

      setClassCounts(counts);
      setTotalAllStudents(total);
    });
    return () => unsubscribe();
  }, [selectedMedium]);

  // Real-time listener for school_settings/general & local storage updates
  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, "school_settings", "general"), (snap) => {
      if (snap.exists() && snap.data().medium) {
        const isSemi = String(snap.data().medium).toLowerCase().includes("semi");
        const m = isSemi ? "semi" : "marathi";
        setSelectedMedium(m);
        localStorage.setItem("cce_selected_medium", m);
      }
    });

    const handleCustomEvent = () => {
      const stored = localStorage.getItem("cce_selected_medium");
      if (stored) setSelectedMedium(stored);
    };

    window.addEventListener("cce_settings_updated", handleCustomEvent);
    window.addEventListener("storage", handleCustomEvent);

    return () => {
      unsubSettings();
      window.removeEventListener("cce_settings_updated", handleCustomEvent);
      window.removeEventListener("storage", handleCustomEvent);
    };
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (sessionStorage.getItem("is_super_admin")) return;
      if (!user || profile?.role !== "teacher") {
        navigate({
          to: "/login",
          search: { redirect: "/teacher/hpc-card", role: "teacher" } as any,
        });
      }
    }
  }, [user, profile, authLoading, navigate]);

  const currentStageConfig = useMemo(() => {
    return HPC_STAGES.find((s) => s.id === activeStage) || HPC_STAGES[0];
  }, [activeStage]);

  const currentClassConfig = useMemo(() => {
    return HPC_CLASSES.find((c) => c.id === selectedClass) || HPC_CLASSES[0];
  }, [selectedClass]);

  const currentClassStudentsCount = classCounts[selectedClass] || 0;

  const handleStageSelect = (stageId: HpcStageId) => {
    setActiveStage(stageId);
    const targetStage = HPC_STAGES.find((s) => s.id === stageId);
    if (targetStage && !targetStage.classIds.includes(selectedClass)) {
      setSelectedClass(targetStage.classIds[0]);
    }
  };

  const handleClassSelect = (classId: string) => {
    setSelectedClass(classId);
    setActiveStage(getStageFromClass(classId));
  };

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-0 pt-16 min-h-screen">
        <ModulePaywall
          moduleId="hpc-card"
          defaultTitle="Holistic Progress Card (HPC)"
          totalStudentsCount={currentClassStudentsCount}
        >
          <div className="p-4 sm:p-6 md:p-10 space-y-6 md:space-y-8 max-w-[1360px] mx-auto">
            {/* Universal Top Back Button for all views */}
            {activeTab === "dashboard" ? (
              <div className="mb-2">
                <button
                  onClick={() => navigate({ to: "/teacher" })}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-900 hover:text-white text-slate-800 border border-slate-200 hover:border-slate-900 rounded-2xl text-xs sm:text-sm font-black tracking-wide transition-all shadow-sm cursor-pointer group"
                >
                  <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
                  <span>मुख्य शिक्षक डॅशबोर्डवर परत जा (Back to Teacher Dashboard)</span>
                </button>
              </div>
            ) : (
              <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-900 hover:text-white text-slate-800 border border-slate-300 rounded-2xl text-xs sm:text-sm font-black tracking-wide transition-all shadow-sm cursor-pointer group"
                >
                  <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
                  <span>मुख्य HPC डॅशबोर्डवर परत जा (Back to HPC Dashboard)</span>
                </button>

                <button
                  onClick={() => navigate({ to: "/teacher" })}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>मुख्य शिक्षक पॅनल</span>
                </button>
              </div>
            )}

            {activeTab === "dashboard" && (
              <div className="space-y-8">
                {/* -------------------- 1. HERO HEADER -------------------- */}
                <div className="w-full bg-gradient-to-b from-white via-slate-50/50 to-white text-slate-800 rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-slate-200/90 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent rounded-bl-full pointer-events-none blur-2xl" />
                  <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-gradient-to-tr from-blue-500/10 via-cyan-500/5 to-transparent rounded-full pointer-events-none blur-2xl" />

                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-4 rounded-3xl text-white font-black flex items-center justify-center shadow-lg shadow-purple-500/25 ring-4 ring-purple-100/60">
                        <Sparkles className="size-7 text-white" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            Holistic Progress Card (HPC)
                          </h1>
                          <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                            समग्र प्रगती पत्रक
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 font-bold mt-1">
                          राष्ट्रीय शैक्षणिक धोरण (NEP 2020) व NCF आधारित ३ स्तरांमधील सर्वसमावेशक विकास नोंद
                        </p>
                      </div>
                    </div>

                    {/* Filter Badges & Selectors */}
                    <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                      {/* Academic Year Selector */}
                      <div className="flex items-center gap-2 bg-white border border-slate-200 shadow-sm rounded-2xl px-3.5 py-2 hover:border-blue-300 transition-colors">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">वर्ष:</span>
                        <select
                          className="bg-transparent text-blue-700 text-xs font-extrabold outline-none cursor-pointer"
                          value={academicYear}
                          onChange={(e) => setAcademicYear(e.target.value)}
                        >
                          {getAcademicYearOptions().map((y) => (
                            <option key={y.value} value={y.value}>
                              {y.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Global Class Dropdown grouped by 3 parts */}
                      <div className="flex items-center gap-2 bg-slate-900 text-white shadow-md rounded-2xl px-3.5 py-2">
                        <span className="text-[11px] font-medium text-slate-300 uppercase tracking-wider">इयत्ता:</span>
                        <select
                          className="bg-transparent text-white text-xs font-extrabold outline-none cursor-pointer border-none"
                          value={selectedClass}
                          onChange={(e) => handleClassSelect(e.target.value)}
                        >
                          <optgroup label="भाग १: पायाभूत स्तर (Class 1-2)" className="text-slate-900 font-bold">
                            <option value="1st">इयत्ता १ ली (1st)</option>
                            <option value="2nd">इयत्ता २ री (2nd)</option>
                          </optgroup>
                          <optgroup label="भाग २: पूर्वतयारी स्तर (Class 3-5)" className="text-slate-900 font-bold">
                            <option value="3rd">इयत्ता ३ री (3rd)</option>
                            <option value="4th">इयत्ता ४ थी (4th)</option>
                            <option value="5th">इयत्ता ५ वी (5th)</option>
                          </optgroup>
                          <optgroup label="भाग ३: पूर्व माध्यमिक स्तर (Class 6-8)" className="text-slate-900 font-bold">
                            <option value="6th">इयत्ता ६ वी (6th)</option>
                            <option value="7th">इयत्ता ७ वी (7th)</option>
                            <option value="8th">इयत्ता ८ वी (8th)</option>
                          </optgroup>
                        </select>
                      </div>

                      {/* Medium Indicator */}
                      <div className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20 rounded-2xl px-3.5 py-2">
                        <span className="text-[11px] font-bold text-purple-200 uppercase tracking-wider">माध्यम:</span>
                        <span className="text-xs font-black text-white">
                          {selectedMedium === "semi" ? "सेमी इंग्रजी" : "मराठी"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* -------------------- 2. THE THREE PARTS / STAGES (३ प्रमुख भाग) -------------------- */}
                <div>
                  <div className="flex items-center justify-between mb-4 px-1">
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2.5">
                        <Layers className="size-5 text-indigo-600" />
                        <span>HPC ३ प्रमुख स्तर विभागणी (Three Stages)</span>
                      </h2>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        खालीलपैकी कोणत्याही भागावर क्लिक करून त्यातील इयत्तांचे HPC कार्ड पहा
                      </p>
                    </div>
                    <span className="hidden sm:inline-block text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
                      एकूण विद्यार्थी: <b className="text-slate-900">{totalAllStudents}</b>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {HPC_STAGES.map((stage) => {
                      const isSelected = activeStage === stage.id;
                      const stageStudents = stage.classIds.reduce((sum, cid) => sum + (classCounts[cid] || 0), 0);

                      let IconComponent = BookOpen;
                      if (stage.id === "preparatory") IconComponent = Compass;
                      if (stage.id === "middle") IconComponent = GraduationCap;

                      return (
                        <div
                          key={stage.id}
                          onClick={() => handleStageSelect(stage.id)}
                          className={`group relative rounded-[2.2rem] p-6 transition-all duration-300 cursor-pointer border-2 text-left overflow-hidden ${
                            isSelected
                              ? `bg-white ${stage.theme.activeBorder} ring-4 ${stage.theme.activeRing} shadow-xl ${stage.theme.shadow} -translate-y-1`
                              : "bg-white/95 hover:bg-white border-slate-200/90 hover:border-slate-300 shadow-sm hover:shadow-lg hover:-translate-y-0.5"
                          }`}
                        >
                          {/* Accent Top Border Bar */}
                          <div
                            className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${stage.theme.gradient} ${
                              isSelected ? "opacity-100" : "opacity-30 group-hover:opacity-75"
                            } transition-opacity`}
                          />

                          <div className="flex items-start justify-between gap-3 mb-4 pt-1">
                            <div className="flex items-center gap-3.5">
                              <div
                                className={`size-13 rounded-2xl flex items-center justify-center font-black transition-transform duration-300 group-hover:scale-105 ${stage.theme.iconBg}`}
                              >
                                <IconComponent className="size-6 text-white" />
                              </div>
                              <div>
                                <span className="inline-block text-[11px] font-black uppercase tracking-wider text-slate-500">
                                  {stage.partLabelMarathi} ({stage.partLabelEnglish})
                                </span>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
                                  {stage.titleMarathi}
                                </h3>
                                <p className="text-xs text-slate-500 font-semibold">{stage.titleEnglish}</p>
                              </div>
                            </div>

                            {isSelected && (
                              <span className="flex items-center justify-center size-6 rounded-full bg-blue-600 text-white shadow-sm flex-shrink-0 animate-in zoom-in-75 duration-200">
                                <CheckCircle2 className="size-4" />
                              </span>
                            )}
                          </div>

                          {/* Target Classes Badge */}
                          <div className="mb-3.5 flex items-center justify-between gap-2 bg-slate-50/90 rounded-2xl p-2.5 px-3.5 border border-slate-100">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">लागू इयत्ता:</p>
                              <p className="text-xs font-black text-slate-800">{stage.classesLabelMarathi}</p>
                            </div>
                            <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs">
                              {stageStudents} विद्यार्थी
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-2">
                            {stage.descriptionMarathi}
                          </p>

                          {/* Class Pill Tags inside Card */}
                          <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {stage.classIds.map((cid) => {
                                const cls = HPC_CLASSES.find((c) => c.id === cid);
                                const isClassActive = selectedClass === cid;
                                return (
                                  <span
                                    key={cid}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleClassSelect(cid);
                                    }}
                                    className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg transition-all ${
                                      isClassActive
                                        ? "bg-slate-900 text-white shadow-xs"
                                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                    }`}
                                  >
                                    {cls?.labelMarathi} ({classCounts[cid] || 0})
                                  </span>
                                );
                              })}
                            </div>
                            <span className="text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                              निवडा <ChevronRight className="size-3.5" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* -------------------- 3. ACTIVE STAGE & CLASS SECTION -------------------- */}
                <div className="w-full bg-white rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-slate-200/90 relative overflow-hidden">
                  {/* Stage Context Banner */}
                  <div
                    className={`rounded-3xl p-5 md:p-6 border ${currentStageConfig.theme.border} ${currentStageConfig.theme.lightBg} mb-6`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`size-12 rounded-2xl flex items-center justify-center font-black ${currentStageConfig.theme.iconBg}`}
                        >
                          <BookOpen className="size-6 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white text-slate-800 border border-slate-200">
                              {currentStageConfig.partLabelMarathi}
                            </span>
                            <span className="text-xs font-bold text-slate-500">
                              {currentStageConfig.ageGroupMarathi}
                            </span>
                          </div>
                          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                            {currentStageConfig.titleMarathi} ({currentStageConfig.titleEnglish})
                          </h2>
                          <p className="text-xs text-slate-600 font-medium mt-0.5">
                            {currentStageConfig.descriptionMarathi}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-white/90 border border-slate-200/80 rounded-2xl p-2 px-3.5 self-start md:self-auto shadow-2xs">
                        <span className="text-[11px] font-bold text-slate-400">या स्तरातील वर्ग:</span>
                        <span className="text-xs font-black text-slate-900">
                          {currentStageConfig.classesLabelMarathi}
                        </span>
                      </div>
                    </div>

                    {/* Class Selector Pills for this Stage */}
                    <div className="mt-5 pt-4 border-t border-slate-200/60">
                      <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2.5">
                        इयत्ता निवडा (Select Class for {currentStageConfig.titleMarathi}):
                      </p>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {currentStageConfig.classIds.map((cid) => {
                          const cls = HPC_CLASSES.find((c) => c.id === cid);
                          const isCurrent = selectedClass === cid;
                          const cCount = classCounts[cid] || 0;
                          return (
                            <button
                              key={cid}
                              onClick={() => handleClassSelect(cid)}
                              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                                isCurrent
                                  ? "bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md shadow-slate-900/20 scale-[1.02]"
                                  : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300 shadow-2xs"
                              }`}
                            >
                              <span>{cls?.labelMarathi}</span>
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  isCurrent ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600 border border-slate-200"
                                }`}
                              >
                                {cCount} विद्यार्थी
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Class Summary Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="size-3 rounded-full bg-emerald-500 animate-pulse" />
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900">
                          सध्या निवडलेला वर्ग: <span className="text-blue-600">{currentClassConfig.labelMarathi}</span>{" "}
                          ({currentClassConfig.labelEnglish})
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          {currentStageConfig.partLabelMarathi} - {currentStageConfig.titleMarathi} अंतर्गत समग्र मूल्यांकन
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
                        पटसंख्या: <b className="text-slate-900">{currentClassStudentsCount} विद्यार्थी</b>
                      </span>
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
                        सत्र: <b className="text-slate-900">२०२५-२६</b>
                      </span>
                    </div>
                  </div>

                  {/* -------------------- Class 3 Core Quick Cards -------------------- */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                    {/* 1. विद्यार्थी */}
                    <button
                      onClick={() => setActiveTab("student-list")}
                      className="bg-white hover:bg-blue-50/40 border-2 border-slate-200/90 hover:border-blue-400 rounded-3xl p-5 flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] group text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="size-13 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30 group-hover:scale-105 transition-transform flex-shrink-0">
                          <Users className="size-6 text-white" />
                        </div>
                        <div>
                          <h4 className="text-base font-black text-slate-800 group-hover:text-blue-600 transition-colors">
                            विद्यार्थी ({currentClassStudentsCount})
                          </h4>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {currentClassConfig.labelMarathi} यादी व नोंदी
                          </p>
                        </div>
                      </div>
                      <div className="size-8 rounded-xl bg-slate-100 group-hover:bg-blue-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-all flex-shrink-0">
                        <span className="font-extrabold text-xs">➔</span>
                      </div>
                    </button>

                    {/* 2. उपस्थिती */}
                    <button
                      onClick={() => setActiveTab("attendance")}
                      className="bg-white hover:bg-emerald-50/40 border-2 border-slate-200/90 hover:border-emerald-400 rounded-3xl p-5 flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] group text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="size-13 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/30 group-hover:scale-105 transition-transform flex-shrink-0">
                          <ClipboardCheck className="size-6 text-white" />
                        </div>
                        <div>
                          <h4 className="text-base font-black text-slate-800 group-hover:text-emerald-600 transition-colors">
                            उपस्थिती
                          </h4>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {currentClassConfig.labelMarathi} हजेरी व टक्केवारी
                          </p>
                        </div>
                      </div>
                      <div className="size-8 rounded-xl bg-slate-100 group-hover:bg-emerald-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-all flex-shrink-0">
                        <span className="font-extrabold text-xs">➔</span>
                      </div>
                    </button>

                    {/* 3. विद्यार्थ्याची माहिती */}
                    <button
                      onClick={() => setActiveTab("student-info")}
                      className="bg-white hover:bg-purple-50/40 border-2 border-slate-200/90 hover:border-purple-400 rounded-3xl p-5 flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] group text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="size-13 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/30 group-hover:scale-105 transition-transform flex-shrink-0">
                          <User className="size-6 text-white" />
                        </div>
                        <div>
                          <h4 className="text-base font-black text-slate-800 group-hover:text-purple-600 transition-colors">
                            विद्यार्थ्याची माहिती
                          </h4>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {currentClassConfig.labelMarathi} वैयक्तिक माहिती
                          </p>
                        </div>
                      </div>
                      <div className="size-8 rounded-xl bg-slate-100 group-hover:bg-purple-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-all flex-shrink-0">
                        <span className="font-extrabold text-xs">➔</span>
                      </div>
                    </button>
                  </div>

                  {/* -------------------- 4. HPC CARD WORKSPACE CONTAINER (Ready for user next info) -------------------- */}
                  <div className="rounded-3xl border-2 border-dashed border-indigo-200 bg-gradient-to-b from-indigo-50/50 via-white to-indigo-50/30 p-6 md:p-8 text-center relative overflow-hidden">
                    <div className="max-w-2xl mx-auto space-y-4">
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black border border-indigo-200">
                        <Sparkles className="size-4" />
                        <span>{currentStageConfig.partLabelMarathi}: {currentStageConfig.titleMarathi} HPC कार्ड कार्यक्षेत्र</span>
                      </div>

                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        {currentClassConfig.labelMarathi} - होलिस्टिक प्रोग्रेस कार्ड (HPC) रचना सज्ज आहे
                      </h3>

                      <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                        तुम्ही सांगितल्याप्रमाणे <b>{currentStageConfig.partLabelMarathi} ({currentStageConfig.titleMarathi} - {currentStageConfig.classesLabelMarathi})</b> ची रचना इयत्तेनुसार स्वतंत्रपणे तयार करण्यात आलेली आहे. आता या स्तरासाठी जे मूल्यांकन निकष, घटक, क्षमता आणि माहिती तुम्हाला जोडायची आहे ती माहिती तुम्ही देऊ शकता.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                        <div className="bg-white p-3.5 rounded-2xl border border-indigo-100 shadow-2xs">
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">सक्रिय स्तर</p>
                          <p className="text-xs font-black text-slate-800 mt-0.5">{currentStageConfig.titleMarathi}</p>
                          <p className="text-[10px] text-slate-500 font-bold">{currentStageConfig.titleEnglish}</p>
                        </div>
                        <div className="bg-white p-3.5 rounded-2xl border border-indigo-100 shadow-2xs">
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">निवडलेला वर्ग</p>
                          <p className="text-xs font-black text-blue-700 mt-0.5">{currentClassConfig.labelMarathi}</p>
                          <p className="text-[10px] text-slate-500 font-bold">{currentClassConfig.labelEnglish}</p>
                        </div>
                        <div className="bg-white p-3.5 rounded-2xl border border-indigo-100 shadow-2xs">
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">पटसंख्या</p>
                          <p className="text-xs font-black text-emerald-700 mt-0.5">{currentClassStudentsCount} विद्यार्थी</p>
                          <p className="text-[10px] text-slate-500 font-bold">CCE डाटा सह जोडलेले</p>
                        </div>
                      </div>

                      <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button
                          onClick={() => navigate({ to: "/teacher/hpc" })}
                          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs sm:text-sm shadow-md shadow-indigo-500/25 transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Sparkles className="size-4" />
                          <span>नवीन समग्र प्रगतिपत्रक (HPC) मॉड्यूल उघडा (Open HPC Module)</span>
                          <ChevronRight className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Return Button */}
                  <div className="mt-8 pt-5 border-t border-slate-200/80 flex items-center justify-center">
                    <button
                      onClick={() => navigate({ to: "/teacher" })}
                      className="flex items-center gap-2 bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white font-extrabold text-xs px-6 py-2.5 rounded-full transition-all shadow-sm cursor-pointer group"
                    >
                      <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
                      <span>मुख्य शिक्षक डॅशबोर्ड (Back to Teacher Home)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* -------------------- SUB TABS -------------------- */}
            {activeTab === "student-list" && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
                <CCEStudentList
                  selectedClass={selectedClass}
                  academicYear={academicYear}
                  onBack={() => setActiveTab("dashboard")}
                />
              </motion.div>
            )}

            {activeTab === "attendance" && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
                <CCEAttendance
                  selectedClass={selectedClass}
                  academicYear={academicYear}
                  onBack={() => setActiveTab("dashboard")}
                />
              </motion.div>
            )}

            {activeTab === "student-info" && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
                <CCEStudentInfo
                  selectedClass={selectedClass}
                  onBack={() => setActiveTab("dashboard")}
                />
              </motion.div>
            )}
          </div>
        </ModulePaywall>
      </main>
    </div>
  );
}
