import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Languages,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Calculator,
  Beaker,
  Globe,
  ScrollText,
  Users,
  CheckCircle2,
  Calendar,
  Layers,
  Download,
  Printer,
  Clock,
  Search,
  Check,
  FileText,
  Eye,
  AlertCircle,
  Loader2,
  Edit3,
  RotateCcw,
  ArrowLeft,
  Filter,
  Building2,
  X,
  School,
  User,
  MessageCircle,
  Share2,
} from "lucide-react";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { useState, useMemo, useEffect } from "react";
import { showToast as toast } from "@/lib/custom-toast";
import { useAuth } from "@/hooks/use-auth";
import { getDefaultSubjectsForClass } from "@/data/cceSubjects";
import { subscribeToHomework } from "@/services/homeworkService";
import type { HomeworkItem } from "@/types/documentEditor";
import { DocumentEditorViewer } from "@/components/documentViewer/DocumentEditorViewer";
import { DailyHomeworkTemplate } from "@/components/homework/DailyHomeworkTemplate";
import { ModulePaywall } from "@/components/teacher/ModulePaywall";
import { DailyHomeworkCalendar, formatISODate } from "@/components/homework/DailyHomeworkCalendar";
import { directShareHomeworkPdfToWhatsApp } from "@/utils/homeworkPdfShare";
import { MCQHomeworkSection } from "@/components/homework/MCQHomeworkSection";
import { WordQuestionPaperEditor } from "@/components/questionPaper/WordQuestionPaperEditor";
import {
  isWordHomework,
  getHomeworkHeaderProfile,
  saveHomeworkHeaderProfile,
  type HomeworkHeaderProfile,
} from "@/utils/homeworkDocHelper";

export const Route = createFileRoute("/teacher/homework")({
  head: () => ({
    meta: [{ title: "गृहपाठ (Homework) — SMART LEARNING" }],
  }),
  component: HomeworkPage,
});

const CLASS_OPTIONS = [
  { id: "1st", mr: "इयत्ता पहिली", en: "Class 1st" },
  { id: "2nd", mr: "इयत्ता दुसरी", en: "Class 2nd" },
  { id: "3rd", mr: "इयत्ता तिसरी", en: "Class 3rd" },
  { id: "4th", mr: "इयत्ता चौथी", en: "Class 4th" },
  { id: "5th", mr: "इयत्ता पाचवी", en: "Class 5th" },
  { id: "6th", mr: "इयत्ता सहावी", en: "Class 6th" },
  { id: "7th", mr: "इयत्ता सातवी", en: "Class 7th" },
  { id: "8th", mr: "इयत्ता आठवी", en: "Class 8th" },
];

const MEDIUM_OPTIONS = [
  {
    id: "marathi",
    labelMr: "मराठी माध्यम",
    labelEn: "Marathi Medium",
    color: "from-amber-500 to-orange-600",
  },
  {
    id: "semi",
    labelMr: "सेमी-इंग्रजी माध्यम",
    labelEn: "Semi-English Medium",
    color: "from-teal-500 to-emerald-600",
  },
];

function getSubjectIcon(subjName: string) {
  const s = subjName.toLowerCase();
  if (s.includes("मराठी") || s.includes("हिंदी") || s.includes("भाषा")) return Languages;
  if (s.includes("english")) return BookOpen;
  if (s.includes("गणित") || s.includes("math")) return Calculator;
  if (s.includes("विज्ञान") || s.includes("science")) return Beaker;
  if (s.includes("भूगोल") || s.includes("geography")) return Globe;
  if (s.includes("इतिहास") || s.includes("history")) return ScrollText;
  if (s.includes("नागरिक") || s.includes("समाज") || s.includes("social")) return Users;
  return BookOpen;
}

const GRADIENTS = [
  { bg: "from-indigo-500 to-purple-600", light: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { bg: "from-emerald-500 to-teal-600", light: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { bg: "from-amber-500 to-orange-600", light: "bg-amber-50 text-amber-700 border-amber-200" },
  { bg: "from-blue-500 to-indigo-600", light: "bg-blue-50 text-blue-700 border-blue-200" },
  { bg: "from-pink-500 to-rose-600", light: "bg-pink-50 text-pink-700 border-pink-200" },
  { bg: "from-cyan-500 to-sky-600", light: "bg-cyan-50 text-cyan-700 border-cyan-200" },
];

function HomeworkPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  // Main Homework Co-Tabs: "homework" vs "mcq"
  const [mainTab, setMainTab] = useState<"homework" | "mcq">("homework");

  // Wizard state: "medium" -> "class" -> "subject" -> "list"
  const [step, setStep] = useState<"medium" | "class" | "subject" | "list">("medium");

  const [selectedMedium, setSelectedMedium] = useState<string>("marathi");
  const [selectedClass, setSelectedClass] = useState<string>("1st");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [calendarDate, setCalendarDate] = useState<string>(() => formatISODate(new Date()));
  const todayStr = useMemo(() => formatISODate(new Date()), []);
  const tomorrowStr = useMemo(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return formatISODate(t);
  }, []);
  const [selectedHomeworkId, setSelectedHomeworkId] = useState<string>("");

  // Normalize date string for reliable matching (YYYY-MM-DD or DD-MM-YYYY)
  const normalizeDate = (dStr?: string): string => {
    if (!dStr) return "";
    const clean = dStr.trim().slice(0, 10);
    const parts = clean.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
      } else {
        return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
    }
    return clean;
  };

  // Homework List state
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Active opened homework
  const [activeHomework, setActiveHomework] = useState<HomeworkItem | null>(null);
  const [previewTab, setPreviewTab] = useState<"doc" | "template">("doc");

  // Homework Header Profile (School & Teacher info once filled for dashboard)
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [hwProfile, setHwProfile] = useState<HomeworkHeaderProfile>(() =>
    getHomeworkHeaderProfile(user?.uid || "guest")
  );

  // WhatsApp Direct PDF Share state for list view
  const [isSharingPdf, setIsSharingPdf] = useState(false);

  const handleDirectSharePdf = async (item: HomeworkItem) => {
    setIsSharingPdf(true);
    try {
      await directShareHomeworkPdfToWhatsApp({
        dateStr: item.homeworkDate || filterDate || calendarDate,
        classId: item.class || selectedClass || "1st",
        medium: (item.medium as any) || (selectedMedium as any) || "marathi",
        homeworkItems: [item],
        singleItem: item,
        schoolProfile: hwProfile,
      });
    } finally {
      setIsSharingPdf(false);
    }
  };

  // Form fields inside modal (School, Kendra, Taluka, District, Teacher Name, Headmaster Name)
  // Day, Date, and Class are NOT in this form as they come dynamically from admin-uploaded homework
  const [formSchoolName, setFormSchoolName] = useState("");
  const [formKendra, setFormKendra] = useState("");
  const [formTaluka, setFormTaluka] = useState("");
  const [formDistrict, setFormDistrict] = useState("");
  const [formTeacherName, setFormTeacherName] = useState("");
  const [formHeadmasterName, setFormHeadmasterName] = useState("");

  // Sync profile when user changes
  useEffect(() => {
    const prof = getHomeworkHeaderProfile(user?.uid || "guest");
    setHwProfile(prof);
  }, [user?.uid]);

  const openProfileModal = () => {
    const prof = getHomeworkHeaderProfile(user?.uid || "guest");
    setFormSchoolName(prof.schoolName);
    setFormKendra(prof.kendra);
    setFormTaluka(prof.taluka);
    setFormDistrict(prof.district);
    setFormTeacherName(prof.teacherName || profile?.fullName || "");
    setFormHeadmasterName(prof.headmasterName);
    setShowProfileModal(true);
  };

  const handleSaveProfile = () => {
    const updated: HomeworkHeaderProfile = {
      schoolName: formSchoolName.trim(),
      kendra: formKendra.trim(),
      taluka: formTaluka.trim(),
      district: formDistrict.trim(),
      teacherName: formTeacherName.trim(),
      headmasterName: formHeadmasterName.trim(),
    };
    saveHomeworkHeaderProfile(user?.uid || "guest", updated);
    setHwProfile(updated);
    setShowProfileModal(false);
    toast.success("शाळा व शिक्षक माहिती सेव्ह झाली! आता सर्व दैनिक गृहपाठांवर ही माहिती आपोआप दिसेल.");
  };

  // Auth guard
  useEffect(() => {
    if (!authLoading) {
      if (sessionStorage.getItem("is_super_admin")) {
        // Super Admin allowed
      } else if (!user || profile?.role !== "teacher") {
        navigate({
          to: "/login",
          search: { redirect: "/teacher/homework", role: "teacher" } as any,
        });
      }
    }
  }, [user, profile, authLoading, navigate]);

  // Real-time listener from canonical admin_homework
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToHomework(
      (items) => {
        setHomeworkList(items);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to admin homework:", error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Compute available subjects
  const availableSubjects = useMemo(() => {
    if (!selectedClass || !selectedMedium) return [];
    return getDefaultSubjectsForClass(selectedClass, selectedMedium);
  }, [selectedClass, selectedMedium]);

  const currentClassObj = CLASS_OPTIONS.find((c) => c.id === selectedClass);
  const currentMediumObj = MEDIUM_OPTIONS.find((m) => m.id === selectedMedium);

  // Filter ONLY what matches selected medium, class, subject, date, search
  // Shows all previous homework, and for the future allows only up to next day (tomorrow)
  const filteredHomework = useMemo(() => {
    return homeworkList.filter((item) => {
      const matchMedium = item.medium === selectedMedium;
      const matchClass = item.class === selectedClass;
      const matchSubject =
        !selectedSubject ||
        item.subject?.trim().toLowerCase() === selectedSubject.trim().toLowerCase();
      const matchDate = !filterDate || item.homeworkDate === filterDate;
      const matchSearch =
        !searchTerm ||
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const itemDate = normalizeDate(item.homeworkDate || (item as any).date || (item as any).createdAt);
      const isNotAheadOfTomorrow = !itemDate || itemDate <= tomorrowStr;

      return matchMedium && matchClass && matchSubject && matchDate && matchSearch && isNotAheadOfTomorrow;
    });
  }, [homeworkList, selectedMedium, selectedClass, selectedSubject, filterDate, searchTerm, tomorrowStr]);

  // Current day's homework items based on selectedClass, selectedMedium, and calendarDate
  // Shows all previous homework, next day homework, but restricts other days ahead
  const currentDayHomeworks = useMemo(() => {
    const targetDate = normalizeDate(calendarDate);
    // If date is beyond tomorrow, do not show any homework
    if (targetDate > tomorrowStr) return [];

    return homeworkList.filter((item) => {
      const matchMedium = item.medium === selectedMedium;
      const matchClass = item.class === selectedClass;
      const d = item.homeworkDate || (item as any).date || (item as any).createdAt;
      const matchDate = normalizeDate(d) === targetDate;
      return matchMedium && matchClass && matchDate;
    });
  }, [homeworkList, selectedMedium, selectedClass, calendarDate, tomorrowStr]);

  const currentHomework = useMemo(() => {
    if (currentDayHomeworks.length === 0) return null;
    if (selectedHomeworkId) {
      const found = currentDayHomeworks.find((h) => h.id === selectedHomeworkId);
      if (found) return found;
    }
    return currentDayHomeworks[0];
  }, [currentDayHomeworks, selectedHomeworkId]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="no-print">
        <TeacherHeader />
        <TeacherSidebar />
      </div>

      <main className="pt-20 pb-16 px-3 sm:px-6 max-w-7xl mx-auto space-y-6">
        <ModulePaywall moduleId="homework" defaultTitle="दैनिक गृहपाठ (Daily Homework)">
          {/* Back Navigation Bar: Go One Step Back + Back to Main Dashboard */}
          <div className="no-print flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 flex-wrap">
              {step !== "medium" && (
                <button
                  type="button"
                  onClick={() => {
                    if (step === "list") setStep("class");
                    else if (step === "class") setStep("medium");
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-black transition-all shadow-md cursor-pointer active:scale-95 shrink-0 border border-purple-500"
                  title="एक पायरी मागे जा (Go One Step Back)"
                >
                  <ArrowLeft className="size-4" />
                  <span>
                    ← एक पायरी मागे जा ({step === "list" ? "इयत्ता निवडीवर जा" : "माध्यम निवडीवर जा"})
                  </span>
                </button>
              )}

              <Link
                to="/teacher"
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
              >
                <ArrowLeft className="size-4 text-indigo-600" />
                <span>मुख्य डॅशबोर्ड (Main Dashboard)</span>
              </Link>
            </div>
          </div>

          {/* SECTION 1: Clean Header with only Information Fill Option */}
          <div className="no-print bg-gradient-to-r from-teal-800 via-emerald-800 to-indigo-950 rounded-2xl p-3.5 sm:p-5 text-white shadow-lg relative overflow-hidden border border-emerald-600/30">
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h1 className="text-base sm:text-xl font-black tracking-tight flex items-center gap-2">
                  <BookOpen className="size-5 text-emerald-300 shrink-0" />
                  <span>गृहपाठ व्यवस्थापन (Homework Viewer & Editor)</span>
                </h1>
                {hwProfile.schoolName && (
                  <p className="text-xs text-emerald-200 font-medium">
                    शाळा: {hwProfile.schoolName} {hwProfile.teacherName ? `• शिक्षक: ${hwProfile.teacherName}` : ""}
                  </p>
                )}
              </div>

              {/* Only Information Fill Option */}
              <button
                type="button"
                onClick={openProfileModal}
                className="px-3.5 sm:px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs sm:text-sm shadow-md flex items-center gap-2 active:scale-95 transition-all cursor-pointer shrink-0"
                title="शाळा व शिक्षक माहिती भरा किंवा बदला"
              >
                <Building2 className="size-4 text-amber-950" />
                <span>माहिती भरा</span>
                <Edit3 className="size-3.5 text-amber-950/70" />
              </button>
            </div>
          </div>

          {/* STEPPING SELECTION WORKFLOW */}
          <div>
            {/* STEP 1: MEDIUM */}
            {step === "medium" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl sm:text-2xl font-black text-slate-800">
                          पायरी १: माध्यम निवडा (Select Medium)
                        </h2>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {MEDIUM_OPTIONS.map((med) => (
                          <button
                            key={med.id}
                            onClick={() => {
                              setSelectedMedium(med.id);
                              setStep("class");
                            }}
                            className={`p-8 rounded-3xl text-left transition-all duration-300 border-2 cursor-pointer shadow-sm hover:shadow-xl relative overflow-hidden ${selectedMedium === med.id
                              ? "bg-gradient-to-br " + med.color + " text-white border-transparent scale-102"
                              : "bg-white text-slate-800 border-slate-200 hover:border-amber-400"
                              }`}
                          >
                            <Languages className={`size-10 mb-4 ${selectedMedium === med.id ? "text-white" : "text-amber-600"}`} />
                            <div className="text-2xl font-black">{med.labelMr}</div>
                            <div className={`text-sm font-semibold mt-1 ${selectedMedium === med.id ? "text-white/80" : "text-slate-400"}`}>
                              {med.labelEn}
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 2: CLASS */}
                  {step === "class" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <h2 className="text-xl sm:text-2xl font-black text-slate-800">
                            पायरी २: इयत्ता निवडा (Select Class)
                          </h2>
                          <p className="text-xs sm:text-sm text-slate-500 font-medium">
                            माध्यम: <span className="font-bold text-amber-700">{currentMediumObj?.labelMr}</span>
                          </p>
                        </div>
                        <button
                          onClick={() => setStep("medium")}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer"
                        >
                          <ChevronLeft className="size-4" /> माध्यम बदला
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {CLASS_OPTIONS.map((cls, idx) => {
                          const isSelected = selectedClass === cls.id;
                          const grad = GRADIENTS[idx % GRADIENTS.length];
                          return (
                            <button
                              key={cls.id}
                              onClick={() => {
                                setSelectedClass(cls.id);
                                setSelectedSubject("");
                                setStep("list");
                              }}
                              className={`p-6 rounded-2xl text-center transition-all duration-300 border-2 cursor-pointer shadow-sm hover:shadow-lg ${isSelected
                                ? "bg-gradient-to-br " + grad.bg + " text-white border-transparent scale-102"
                                : "bg-white text-slate-800 border-slate-200 hover:border-amber-400 hover:bg-amber-50/20"
                                }`}
                            >
                              <GraduationCap className={`size-8 mx-auto mb-2 ${isSelected ? "text-white" : "text-amber-600"}`} />
                              <div className="font-black text-base sm:text-lg">{cls.mr}</div>
                              <div className={`text-xs font-semibold ${isSelected ? "text-white/80" : "text-slate-400"}`}>
                                {cls.en}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 4: HOMEWORK LIST */}
                  {step === "list" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                      {/* Context Breadcrumb & Class Switcher */}
                      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 text-xs sm:text-sm flex-wrap">
                          <span className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 font-bold">
                            {currentMediumObj?.labelMr}
                          </span>
                          <span className="text-slate-400">/</span>
                          <span className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-sm shadow-xs">
                            {currentClassObj?.mr}
                          </span>
                          <span className="text-slate-400 hidden sm:inline">•</span>
                          <span className="text-slate-500 text-xs font-semibold hidden sm:inline">
                            {mainTab === "homework" ? "दैनिक गृहपाठ संच" : "MCQ स्वाध्याय संच"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Small Calendar Button */}
                          <div
                            className={`flex items-center gap-1.5 border rounded-xl px-2.5 sm:px-3 py-1.5 transition-all shadow-2xs ${
                              mainTab === "homework"
                                ? "bg-emerald-50 hover:bg-emerald-100/90 border-emerald-300 text-emerald-950"
                                : "bg-purple-50 hover:bg-purple-100/90 border-purple-300 text-purple-950"
                            }`}
                          >
                            <Calendar
                              className={`size-3.5 shrink-0 ${
                                mainTab === "homework" ? "text-emerald-700" : "text-purple-700"
                              }`}
                            />
                            <span className="text-xs font-bold">
                              {calendarDate === todayStr
                                ? "आजचा दिनांक:"
                                : calendarDate === tomorrowStr
                                ? "उद्याचा दिनांक:"
                                : "निवडलेला दिनांक:"}
                            </span>
                            <input
                              type="date"
                              max={tomorrowStr}
                              value={calendarDate}
                              onChange={(e) => {
                                if (e.target.value) {
                                  if (e.target.value > tomorrowStr) {
                                    toast.info(
                                      mainTab === "homework"
                                        ? "केवळ उद्याचा (Next Day) गृहपाठ उपलब्ध आहे. पुढील दिवसांचे गृहपाठ अजून उपलब्ध नाहीत."
                                        : "केवळ उद्याचा (Next Day) स्वाध्याय उपलब्ध आहे. पुढील दिवसांचे स्वाध्याय अजून उपलब्ध नाहीत."
                                    );
                                    setCalendarDate(tomorrowStr);
                                  } else {
                                    setCalendarDate(e.target.value);
                                  }
                                }
                              }}
                              className={`bg-transparent border-none outline-none font-black text-xs cursor-pointer ${
                                mainTab === "homework" ? "text-emerald-800" : "text-purple-800"
                              }`}
                              title="कॅलेंडरमधून तारीख निवडा (मागील सर्व किंवा उद्यापर्यंतचा दिनांक)"
                            />
                            {calendarDate !== todayStr && (
                              <button
                                type="button"
                                onClick={() => setCalendarDate(todayStr)}
                                className={`ml-1 px-2 py-0.5 rounded-md text-white text-[10px] font-black cursor-pointer shadow-2xs active:scale-95 transition-all ${
                                  mainTab === "homework"
                                    ? "bg-emerald-600 hover:bg-emerald-700"
                                    : "bg-purple-600 hover:bg-purple-700"
                                }`}
                                title="आजच्या दिनांकावर परत जा (Today)"
                              >
                                आज (Today)
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setStep("class")}
                            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-black text-amber-950 bg-gradient-to-r from-amber-300 to-amber-400 hover:from-amber-400 hover:to-amber-500 cursor-pointer flex items-center gap-1.5 transition-all shadow-sm active:scale-95 border border-amber-400"
                            title="मागील पायरीवर जा (इयत्ता बदला)"
                          >
                            <ArrowLeft className="size-4" />
                            <span>← मागे जा (इयत्ता बदला)</span>
                          </button>
                        </div>
                      </div>

                      {/* Prominent, Highly Attractive Mode Selector */}
                      <div className="bg-white/95 backdrop-blur-md p-2 sm:p-2.5 rounded-2xl sm:rounded-3xl border-2 border-slate-200/90 shadow-md">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                          {/* Button 1: दैनिक गृहपाठ */}
                          <button
                            type="button"
                            onClick={() => setMainTab("homework")}
                            className={`flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl font-black transition-all duration-300 cursor-pointer active:scale-98 text-left ${
                              mainTab === "homework"
                                ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400 scale-[1.01]"
                                : "bg-emerald-50/70 hover:bg-emerald-100/90 text-emerald-950 border-2 border-emerald-300/80 hover:border-emerald-500 shadow-xs hover:scale-[1.005]"
                            }`}
                          >
                            <div
                              className={`size-11 sm:size-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                                mainTab === "homework" ? "bg-white/20 text-white" : "bg-emerald-600 text-white"
                              }`}
                            >
                              <BookOpen className="size-5 sm:size-6" />
                            </div>
                            <div className="flex-1">
                              <div className="font-black text-sm sm:text-base leading-tight flex items-center gap-1.5">
                                <span>दैनिक गृहपाठ</span>
                                <span className="text-[11px] font-bold opacity-80">(Daily Homework)</span>
                              </div>
                              <div
                                className={`text-[11px] sm:text-xs font-semibold mt-1 ${
                                  mainTab === "homework" ? "text-emerald-100" : "text-emerald-700"
                                }`}
                              >
                                कार्यपुस्तिका, Word व PDF गृहपाठ
                              </div>
                            </div>
                          </button>

                          {/* Button 2: MCQ स्वाध्याय */}
                          <button
                            type="button"
                            onClick={() => setMainTab("mcq")}
                            className={`flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl font-black transition-all duration-300 cursor-pointer active:scale-98 text-left ${
                              mainTab === "mcq"
                                ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30 ring-2 ring-purple-400 scale-[1.01]"
                                : "bg-purple-50/70 hover:bg-purple-100/90 text-purple-950 border-2 border-purple-300/80 hover:border-purple-500 shadow-xs hover:scale-[1.005]"
                            }`}
                          >
                            <div
                              className={`size-11 sm:size-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                                mainTab === "mcq" ? "bg-white/20 text-amber-300" : "bg-purple-600 text-amber-300"
                              }`}
                            >
                              <Sparkles className="size-5 sm:size-6" />
                            </div>
                            <div className="flex-1">
                              <div className="font-black text-sm sm:text-base leading-tight flex items-center gap-2">
                                <span>MCQ स्वाध्याय</span>
                                <span className="text-[11px] font-bold opacity-80">(MCQ Quiz)</span>
                                <span className="bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shadow-xs animate-pulse">
                                  नवीन
                                </span>
                              </div>
                              <div
                                className={`text-[11px] sm:text-xs font-semibold mt-1 ${
                                  mainTab === "mcq" ? "text-purple-100" : "text-purple-700"
                                }`}
                              >
                                इयत्ता {currentClassObj?.mr} साठी ऑनलाईन क्विझ व निकाल
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Content based on Class-wise mainTab */}
                      {mainTab === "mcq" ? (
                        <MCQHomeworkSection
                          embedded={true}
                          defaultRole="teacher"
                          userName={profile?.fullName || (profile as any)?.name || user?.displayName || "शिक्षक"}
                          initialClass={selectedClass || "1st"}
                          onClassChange={(cls) => setSelectedClass(cls)}
                          onBackStep={() => setStep("class")}
                          initialMedium={(selectedMedium as any) || "marathi"}
                          initialSubject="all"
                          initialDate={calendarDate}
                          onDateChange={(d) => setCalendarDate(d)}
                        />
                      ) : (
                        <div className="space-y-4">
                          {/* If multiple subjects exist on that day (e.g. Marathi, English, Maths), show subject selector pills */}
                          {currentDayHomeworks.length > 1 && (
                            <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-500 mr-1">
                                उपलब्ध विषय:
                              </span>
                              {currentDayHomeworks.map((hw) => (
                                <button
                                  key={hw.id}
                                  type="button"
                                  onClick={() => setSelectedHomeworkId(hw.id)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                    currentHomework?.id === hw.id
                                      ? "bg-emerald-600 text-white shadow-xs"
                                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  }`}
                                >
                                  {hw.subject || hw.title}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Direct Homework Editor / Preview Embed */}
                          {currentHomework ? (
                            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">
                              {isWordHomework(currentHomework) ? (
                                <WordQuestionPaperEditor
                                  key={`${currentHomework.id}_${currentHomework.homeworkDate || calendarDate}`}
                                  fileUrl={currentHomework.wordFileUrl || currentHomework.fileUrl}
                                  paperTitle={`${currentHomework.title} — ${currentHomework.class} (${currentHomework.homeworkDate || "दैनिक"})`}
                                  paperId={currentHomework.id}
                                  subject={currentHomework.subject}
                                  userId={user?.uid || "guest"}
                                  userRole={profile?.role || "teacher"}
                                  documentType="homework"
                                  homeworkDate={currentHomework.homeworkDate || calendarDate}
                                  homeworkClass={currentHomework.class || selectedClass}
                                  schoolName={hwProfile.schoolName}
                                  teacherName={hwProfile.teacherName}
                                  headmasterName={hwProfile.headmasterName}
                                  kendra={hwProfile.kendra}
                                  taluka={hwProfile.taluka}
                                  jilha={hwProfile.district}
                                />
                              ) : (currentHomework.fileUrl || currentHomework.wordFileUrl) ? (
                                <DocumentEditorViewer
                                  documentId={currentHomework.id}
                                  fileUrl={currentHomework.fileUrl || ""}
                                  fileName={currentHomework.fileName}
                                  documentType="homework"
                                  title={`${currentHomework.title} — ${currentHomework.class} (${currentHomework.homeworkDate || "दैनिक"})`}
                                  userId={user?.uid || "guest"}
                                  userRole={profile?.role || "teacher"}
                                  userName={profile?.fullName || "शिक्षक"}
                                  canEdit={true}
                                  metadataBadge={
                                    <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                                      <span>दिनांक: {currentHomework.homeworkDate}</span>
                                      <span>•</span>
                                      <span>इयत्ता: {currentHomework.class}</span>
                                      <span>•</span>
                                      <span>विषय: {currentHomework.subject}</span>
                                    </div>
                                  }
                                />
                              ) : (
                                <DailyHomeworkTemplate
                                  homework={currentHomework}
                                  userId={user?.uid || "guest_teacher"}
                                  userRole={profile?.role || "teacher"}
                                  userName={profile?.fullName || "शिक्षक"}
                                  canEdit={true}
                                />
                              )}
                            </div>
                          ) : (
                            <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border-2 border-dashed border-slate-200 space-y-4">
                              <div className="size-16 rounded-2xl bg-amber-100/70 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                                <BookOpen className="size-8" />
                              </div>
                              <div className="space-y-1">
                                <h3 className="text-lg font-black text-slate-800">
                                  {calendarDate > tomorrowStr
                                    ? "पुढील दिवसांचे गृहपाठ उपलब्ध नाहीत"
                                    : calendarDate === tomorrowStr
                                    ? "उद्याचा गृहपाठ अद्याप प्रकाशित झालेला नाही"
                                    : calendarDate === todayStr
                                    ? "आजचा कोणताही दैनिक गृहपाठ प्रकाशित झालेला नाही"
                                    : `दिनांक ${calendarDate} साठी कोणताही दैनिक गृहपाठ उपलब्ध नाही`}
                                </h3>
                                <p className="text-xs text-slate-500 max-w-md mx-auto">
                                  {calendarDate > tomorrowStr
                                    ? "आपण मागील सर्व तारखांचे किंवा केवळ उद्याचा (Next Day) गृहपाठ पाहू शकता."
                                    : calendarDate === tomorrowStr
                                    ? "उद्याच्या तारखेसाठी अद्याप दैनिक गृहपाठ प्रकाशित झालेला नाही."
                                    : calendarDate === todayStr
                                    ? "आजच्या तारखेसाठी अद्याप दैनिक गृहपाठ प्रकाशित झालेला नाही."
                                    : "कृपया वरील कॅलेंडरमधून आजची किंवा मागील तारीख निवडा."}
                                </p>
                              </div>
                              {calendarDate !== todayStr && (
                                <button
                                  type="button"
                                  onClick={() => setCalendarDate(todayStr)}
                                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-xs active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
                                >
                                  <span>आजचा गृहपाठ पहा (Show Today)</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
          {/* Homework Dashboard Header Setup Modal */}
          {showProfileModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-4 sm:p-6 space-y-4 max-h-[92vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 sm:size-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-sm shrink-0">
                      <Building2 className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-slate-800">
                        गृहपाठ शीर्षक माहिती सेट करा (Homework Header Setup)
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                        येथे एकदा भरलेली माहिती सर्व दैनिक गृहपाठांवर आपोआप लागू होईल (वार, दिनांक व इयत्ता ॲडमिन कडून आपोआप येईल)
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <div className="space-y-4 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                  {/* Section 1: शाळा व ठिकाण तपशील */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-emerald-600" />
                      <span>शाळा व ठिकाण तपशील (School & Location Details)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {/* शाळेचे नाव */}
                      <div className="sm:col-span-2 md:col-span-4 space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Building2 className="size-3 text-amber-500" />
                            <span>शाळेचे नाव (School Name)</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">उदा. जि. प. प्राथमिक शाळा...</span>
                        </label>
                        <input
                          type="text"
                          value={formSchoolName}
                          onChange={(e) => setFormSchoolName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleSaveProfile(); }}
                          placeholder="येथे शाळेचे संपूर्ण नाव टाईप करा..."
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 text-xs font-semibold outline-none transition-all bg-white"
                        />
                      </div>

                      {/* केंद्र */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">केंद्र (Kendra)</label>
                        <input
                          type="text"
                          value={formKendra}
                          onChange={(e) => setFormKendra(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleSaveProfile(); }}
                          placeholder="उदा. बोरगाव"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 text-xs font-semibold outline-none transition-all bg-white"
                        />
                      </div>

                      {/* तालुका */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">तालुका (Taluka)</label>
                        <input
                          type="text"
                          value={formTaluka}
                          onChange={(e) => setFormTaluka(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleSaveProfile(); }}
                          placeholder="उदा. मिरज"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 text-xs font-semibold outline-none transition-all bg-white"
                        />
                      </div>

                      {/* जिल्हा */}
                      <div className="sm:col-span-2 md:col-span-2 space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">जिल्हा (District)</label>
                        <input
                          type="text"
                          value={formDistrict}
                          onChange={(e) => setFormDistrict(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleSaveProfile(); }}
                          placeholder="उदा. सांगली"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 text-xs font-semibold outline-none transition-all bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: शिक्षक व मुख्याध्यापक तपशील */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <User className="size-3.5 text-indigo-600" />
                      <span>शिक्षक, मुख्याध्यापक व स्वाक्षरी तपशील (Teacher & Headmaster Details)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* शिक्षकाचे नाव */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <User className="size-3 text-indigo-500" />
                            <span>शिक्षकाचे नाव (Teacher Name)</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">उदा. बाळासाहेब केंद्रे</span>
                        </label>
                        <input
                          type="text"
                          value={formTeacherName}
                          onChange={(e) => setFormTeacherName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleSaveProfile(); }}
                          placeholder="येथे वर्गशिक्षकाचे नाव टाका..."
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 text-xs font-semibold outline-none transition-all bg-white"
                        />
                      </div>

                      {/* मुख्याध्यापकाचे नाव */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <School className="size-3 text-emerald-500" />
                            <span>मुख्याध्यापकाचे नाव (Headmaster Name)</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">उदा. मुख्याध्यापक नाव</span>
                        </label>
                        <input
                          type="text"
                          value={formHeadmasterName}
                          onChange={(e) => setFormHeadmasterName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleSaveProfile(); }}
                          placeholder="येथे मुख्याध्यापकाचे नाव टाका..."
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 text-xs font-semibold outline-none transition-all bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Note banner */}
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2">
                    <Sparkles className="size-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11.5px] leading-relaxed">
                      <strong>टीप:</strong> वार, दिनांक व इयत्ता ॲडमिन कडून अपलोड केलेल्या गृहपाठ फाईलनुसार आपोआप घेतली जाईल. त्यामुळे ती रोज भरण्याची आवश्यकता नाही.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    रद्द करा
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    className="px-5 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
                  >
                    माहिती जतन करा
                  </button>
                </div>
              </div>
            </div>
          )}

        </ModulePaywall>
      </main>
    </div>
  );
}
