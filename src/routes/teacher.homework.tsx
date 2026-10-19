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
      return matchMedium && matchClass && matchSubject && matchDate && matchSearch;
    });
  }, [homeworkList, selectedMedium, selectedClass, selectedSubject, filterDate, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="no-print">
        <TeacherHeader />
        <TeacherSidebar />
      </div>

      <main className="pt-20 pb-16 px-3 sm:px-6 max-w-7xl mx-auto space-y-6">
        <ModulePaywall moduleId="homework" defaultTitle="दैनिक गृहपाठ (Daily Homework)">
        {/* Back to Dashboard Button */}
        {!activeHomework && (
          <div className="no-print">
            <Link
              to="/teacher"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
            >
              <ArrowLeft className="size-4 text-indigo-600" />
              <span>मुख्य डॅशबोर्डवर मागे जा (Back to Dashboard)</span>
            </Link>
          </div>
        )}

        {/* SECTION 1: Top Dashboard Banner (Screenshot 2 moved to TOP of page) */}
        {!activeHomework && (
          <div className="no-print bg-gradient-to-r from-teal-800 via-emerald-800 to-indigo-950 rounded-2xl sm:rounded-3xl p-4 sm:p-7 text-white shadow-xl relative overflow-hidden border border-emerald-600/30">
            <div className="absolute top-0 right-0 size-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-emerald-200 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                  <BookOpen className="size-3.5" /> दैनिक गृहपाठ पोर्टल (Daily Homework)
                </div>
                <h1 className="text-xl sm:text-3xl font-black tracking-tight">
                  गृहपाठ व्यवस्थापन (Homework Viewer & Editor)
                </h1>
                <p className="text-xs sm:text-sm text-emerald-100 max-w-2xl font-medium">
                  इयत्ता १ ली ते ८ वी मराठी व सेमी माध्यमासाठी तारीखनिहाय गृहपाठ पहा, मूळ डिझाइन सुरक्षित ठेवून मजकूर संपादित करा, प्रिंट काढा किंवा PDF डाउनलोड करा.
                </p>

                {/* Saved Profile Summary Pill & Button on Dashboard */}
                <div className="pt-1 flex items-center gap-2 flex-wrap text-xs">
                  <button
                    type="button"
                    onClick={openProfileModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold transition-all shadow-xs cursor-pointer active:scale-95 text-xs backdrop-blur-md"
                    title="शाळा, शिक्षक व मुख्याध्यापक माहिती सेट करा किंवा बदला"
                  >
                    <Building2 className="size-3.5 text-amber-300" />
                    <span>
                      {hwProfile.schoolName
                        ? `शाळा: ${hwProfile.schoolName} ${hwProfile.teacherName ? `• शिक्षक: ${hwProfile.teacherName}` : ""}`
                        : "शाळा व शिक्षक माहिती सेट करा (Set Header Info)"}
                    </span>
                    <Edit3 className="size-3 text-amber-300 ml-1" />
                  </button>
                  {hwProfile.schoolName && (
                    <span className="text-[11px] text-emerald-200 font-medium">
                      ✓ सर्व दैनिक गृहपाठांवर आपोआप लागू होईल
                    </span>
                  )}
                </div>
              </div>

              {/* Stepper Wizard Bar */}
              <div className="flex items-center gap-1 sm:gap-2 bg-white/10 backdrop-blur-md p-1.5 sm:p-2 rounded-2xl border border-white/15 text-[11px] sm:text-xs font-bold overflow-x-auto touch-pan-x max-w-full shrink-0">
                <button
                  type="button"
                  onClick={openProfileModal}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 bg-amber-400 hover:bg-amber-300 text-amber-950 font-black shadow-md flex items-center gap-1.5 active:scale-95"
                  title="शाळा व शिक्षक माहिती भरा"
                >
                  <Building2 className="size-3.5" />
                  <span>माहिती भरा</span>
                </button>
                <button
                  onClick={() => {
                    setMainTab("homework");
                    setStep("medium");
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 ${
                    mainTab === "homework" && step === "medium"
                      ? "bg-white text-emerald-900 shadow-md font-black"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  १. माध्यम
                </button>
                <ChevronRight className="size-3.5 text-white/40 shrink-0" />
                <button
                  onClick={() => {
                    setMainTab("homework");
                    setStep("class");
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 ${
                    mainTab === "homework" && step === "class"
                      ? "bg-white text-emerald-900 shadow-md font-black"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  २. इयत्ता
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: Colorful & Recognizable Co-Tabs (Screenshot 3 taken DOWN below the Banner) */}
        {!activeHomework && (
          <div className="no-print bg-white/95 backdrop-blur-md p-2 sm:p-2.5 rounded-2xl sm:rounded-3xl border-2 border-slate-200/90 shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 flex-wrap sm:flex-nowrap">
              {/* Tab 1: दैनिक गृहपाठ (Daily Homework) */}
              <button
                type="button"
                onClick={() => setMainTab("homework")}
                className={`flex-1 sm:flex-initial flex items-center justify-center sm:justify-start gap-2.5 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl font-black text-xs sm:text-sm transition-all duration-300 cursor-pointer shadow-sm active:scale-98 ${
                  mainTab === "homework"
                    ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400/60 scale-[1.02]"
                    : "bg-emerald-50/70 hover:bg-emerald-100/90 text-emerald-950 border border-emerald-200/80 hover:border-emerald-400 hover:scale-[1.01]"
                }`}
              >
                <div
                  className={`size-8 rounded-xl flex items-center justify-center shrink-0 ${
                    mainTab === "homework"
                      ? "bg-white/20 text-white shadow-xs"
                      : "bg-emerald-600 text-white shadow-xs"
                  }`}
                >
                  <BookOpen className="size-4.5" />
                </div>
                <div className="text-left">
                  <div className="font-black leading-tight flex items-center gap-1.5">
                    <span>दैनिक गृहपाठ</span>
                    <span className="text-[10px] font-bold opacity-80">(Daily Homework)</span>
                  </div>
                  <div
                    className={`text-[10px] font-semibold mt-0.5 ${
                      mainTab === "homework" ? "text-emerald-100" : "text-emerald-700"
                    }`}
                  >
                    कार्यपुस्तिका, Word व PDF गृहपाठ
                  </div>
                </div>
              </button>

              {/* Tab 2: MCQ स्वाध्याय (MCQ Quiz) */}
              <button
                type="button"
                onClick={() => setMainTab("mcq")}
                className={`flex-1 sm:flex-initial flex items-center justify-center sm:justify-start gap-2.5 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl font-black text-xs sm:text-sm transition-all duration-300 cursor-pointer shadow-sm active:scale-98 ${
                  mainTab === "mcq"
                    ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30 ring-2 ring-purple-400/60 scale-[1.02]"
                    : "bg-indigo-50/70 hover:bg-indigo-100/90 text-indigo-950 border border-indigo-200/80 hover:border-indigo-400 hover:scale-[1.01]"
                }`}
              >
                <div
                  className={`size-8 rounded-xl flex items-center justify-center shrink-0 ${
                    mainTab === "mcq"
                      ? "bg-white/20 text-amber-300 shadow-xs"
                      : "bg-indigo-600 text-amber-300 shadow-xs"
                  }`}
                >
                  <Sparkles className="size-4.5" />
                </div>
                <div className="text-left">
                  <div className="font-black leading-tight flex items-center gap-2">
                    <span>MCQ स्वाध्याय</span>
                    <span className="text-[10px] font-bold opacity-80">(MCQ Quiz)</span>
                    <span className="bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shadow-xs animate-pulse">
                      नवीन
                    </span>
                  </div>
                  <div
                    className={`text-[10px] font-semibold mt-0.5 ${
                      mainTab === "mcq" ? "text-indigo-100" : "text-indigo-700"
                    }`}
                  >
                    ऑनलाइन टेस्ट, क्विझ व निकाल
                  </div>
                </div>
              </button>
            </div>

            {/* Status indicator on right */}
            <div className="hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100/90 border border-slate-200 text-xs font-bold text-slate-700 shrink-0">
              <span
                className={`size-2.5 rounded-full ${
                  mainTab === "homework" ? "bg-emerald-500 animate-ping" : "bg-purple-500 animate-ping"
                }`}
              />
              <span>
                {mainTab === "homework"
                  ? "दैनिक गृहपाठ विभाग सक्रिय"
                  : "MCQ स्वाध्याय विभाग सक्रिय"}
              </span>
            </div>
          </div>
        )}

        {/* SECTION 3: Content based on mainTab */}
        {mainTab === "mcq" ? (
          <MCQHomeworkSection
            defaultRole="teacher"
            userName={profile?.fullName || (profile as any)?.name || user?.displayName || "शिक्षक"}
            initialClass={selectedClass || "all"}
            initialSubject={selectedSubject || "all"}
          />
        ) : (
          <>

        {/* ACTIVE DOCUMENT VIEWER / TEMPLATE MODE */}
        {activeHomework ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex-wrap">
              <button
                onClick={() => setActiveHomework(null)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <ArrowLeft className="size-4" />
                <span>गृहपाठ यादी (Back to List)</span>
              </button>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
                {(activeHomework.fileUrl || activeHomework.wordFileUrl) && (
                  <button
                    onClick={() => setPreviewTab("doc")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      previewTab === "doc"
                        ? "bg-teal-700 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {isWordHomework(activeHomework)
                      ? "Word गृहपाठ (Word Homework)"
                      : "मूळ दस्तऐवज (Document)"}
                  </button>
                )}
                {!activeHomework.fileUrl && !activeHomework.wordFileUrl && (
                  <button
                    onClick={() => setPreviewTab("template")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      previewTab === "template"
                        ? "bg-teal-700 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    दैनिक कार्यपुस्तिका (Worksheet)
                  </button>
                )}
              </div>
            </div>

            {previewTab === "doc" && (activeHomework.fileUrl || activeHomework.wordFileUrl) ? (
              isWordHomework(activeHomework) ? (
                <WordQuestionPaperEditor
                  fileUrl={activeHomework.wordFileUrl || activeHomework.fileUrl}
                  paperTitle={`${activeHomework.title} — ${activeHomework.class} (${activeHomework.homeworkDate || "दैनिक"})`}
                  paperId={activeHomework.id}
                  subject={activeHomework.subject}
                  userId={user?.uid || "guest"}
                  userRole={profile?.role || "teacher"}
                  documentType="homework"
                  homeworkDate={activeHomework.homeworkDate}
                  homeworkClass={activeHomework.class}
                  onClose={() => setActiveHomework(null)}
                />
              ) : (
                <DocumentEditorViewer
                  documentId={activeHomework.id}
                  fileUrl={activeHomework.fileUrl || ""}
                  fileName={activeHomework.fileName}
                  documentType="homework"
                  title={`${activeHomework.title} — ${activeHomework.class} (${activeHomework.homeworkDate || "दैनिक"})`}
                  userId={user?.uid || "guest"}
                  userRole={profile?.role || "teacher"}
                  userName={profile?.fullName || "शिक्षक"}
                  canEdit={true}
                  onBack={() => setActiveHomework(null)}
                  metadataBadge={
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                      <span>दिनांक: {activeHomework.homeworkDate}</span>
                      <span>•</span>
                      <span>इयत्ता: {activeHomework.class}</span>
                      <span>•</span>
                      <span>विषय: {activeHomework.subject}</span>
                    </div>
                  }
                />
              )
            ) : (
              <DailyHomeworkTemplate
                homework={activeHomework}
                userId={user?.uid || "guest_teacher"}
                userRole={profile?.role || "teacher"}
                userName={profile?.fullName || "शिक्षक"}
                canEdit={true}
                onBack={() => setActiveHomework(null)}
              />
            )}
          </div>
        ) : (
          /* STEPPING SELECTION WORKFLOW */
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
                      className={`p-8 rounded-3xl text-left transition-all duration-300 border-2 cursor-pointer shadow-sm hover:shadow-xl relative overflow-hidden ${
                        selectedMedium === med.id
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
                        className={`p-6 rounded-2xl text-center transition-all duration-300 border-2 cursor-pointer shadow-sm hover:shadow-lg ${
                          isSelected
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
                {/* Context Header & Filter Bar */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm">
                    <span className="px-3 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold">
                      {currentMediumObj?.labelMr}
                    </span>
                    <span className="text-slate-400">/</span>
                    <span className="px-3 py-1 rounded-lg bg-orange-100 text-orange-800 font-bold">
                      {currentClassObj?.mr}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                    {/* Date Picker Filter */}
                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                      <Calendar className="size-3.5 text-amber-600" />
                      <span className="text-slate-500 font-medium">दिनांक:</span>
                      <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="bg-transparent border-none outline-none font-bold text-slate-800 cursor-pointer"
                      />
                      {filterDate && (
                        <button
                          onClick={() => setFilterDate("")}
                          className="text-slate-400 hover:text-red-500 ml-1 font-bold"
                          title="तारीख फिल्टर काढा"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Search Input */}
                    <div className="relative flex-1 sm:w-56">
                      <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="शोध करा..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:bg-white focus:border-amber-500"
                      />
                    </div>

                    <button
                      onClick={() => setStep("class")}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer flex items-center gap-1"
                    >
                      <ChevronLeft className="size-3.5" />
                      <span>इयत्ता बदला</span>
                    </button>
                  </div>
                </div>

                {/* View Switcher: Calendar vs List */}
                <div className="flex items-center justify-between gap-3 flex-wrap bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setViewMode("calendar")}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                        viewMode === "calendar"
                          ? "bg-emerald-600 text-white shadow-xs font-black"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Calendar className="size-3.5" />
                      <span>कॅलेंडर दृश्य (Calendar View)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                        viewMode === "list"
                          ? "bg-emerald-600 text-white shadow-xs font-black"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Layers className="size-3.5" />
                      <span>यादी दृश्य (List View)</span>
                    </button>
                  </div>

                  <div className="text-xs text-slate-500 font-semibold hidden md:block">
                    * कॅलेंडरवरून कोणत्याही तारखेचा गृहपाठ निवडून एका क्लिकवर पहा व संपादित करा
                  </div>
                </div>

                {/* CALENDAR VIEW */}
                {viewMode === "calendar" && (
                  <DailyHomeworkCalendar
                    homeworkList={filteredHomework}
                    selectedDate={calendarDate}
                    onSelectDate={(d) => {
                      setCalendarDate(d);
                      setFilterDate(d);
                    }}
                    onPreviewHomework={(item) => setActiveHomework(item)}
                    userRole="teacher"
                    accentColor="emerald"
                    selectedClass={selectedClass}
                    selectedMedium={selectedMedium}
                    schoolProfile={hwProfile}
                    userId={user?.uid || "guest"}
                  />
                )}

                {/* List Cards (visible in List View) */}
                {viewMode === "list" && (
                  <>
                {loading ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
                    <Loader2 className="size-8 animate-spin text-amber-600 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-500">गृहपाठ लोड होत आहे...</p>
                  </div>
                ) : filteredHomework.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
                    <div className="size-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                      <BookOpen className="size-8" />
                    </div>
                    <h4 className="text-base font-bold text-slate-800">
                      {filterDate ? `दिनांक ${filterDate} साठी कोणताही गृहपाठ सापडला नाही` : "कोणताही गृहपाठ उपलब्ध नाही"}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      {filterDate
                        ? "इतर तारीख निवडा किंवा फिल्टर काढून सर्व गृहपाठ तपासा."
                        : `${currentMediumObj?.labelMr} • ${currentClassObj?.mr} साठी ॲडमिनने अद्याप गृहपाठ अपलोड केलेला नाही.`}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredHomework.map((hw) => (
                      <div
                        key={hw.id}
                        className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-amber-400 shadow-sm hover:shadow-lg transition-all space-y-4 flex flex-col justify-between"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                              <Calendar className="size-3" />
                              दिनांक: {hw.homeworkDate}
                            </span>
                            {hw.dueDate && (
                              <span className="text-[11px] font-semibold text-slate-500">
                                पूर्ण करण्याची तारीख: {hw.dueDate}
                              </span>
                            )}
                          </div>

                          <h3 className="text-lg font-black text-slate-900 leading-snug">
                            {hw.title}
                          </h3>

                          {hw.description && (
                            <p className="text-xs text-slate-600 font-medium line-clamp-3 leading-relaxed">
                              {hw.description}
                            </p>
                          )}
                        </div>

                        {/* Interactive Buttons */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 truncate">
                            <FileText className="size-4 text-amber-600 shrink-0" />
                            <span className="truncate">
                              {hw.fileName || (hw.variables ? "दैनिक कार्यपुस्तिका" : "स्वाध्याय दस्तऐवज")}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleDirectSharePdf(hw)}
                              disabled={isSharingPdf}
                              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                              title="हा गृहपाठ PDF स्वरूपात थेट WhatsApp वर पाठवा"
                            >
                              {isSharingPdf ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <MessageCircle className="size-3.5" />
                              )}
                              <span>WhatsApp PDF</span>
                            </button>

                            <button
                              onClick={() => setActiveHomework(hw)}
                              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                            >
                              <Eye className="size-3.5" />
                              <span>पहा व संपादन करा</span>
                            </button>
                            {hw.fileUrl && (
                              <a
                                href={hw.fileUrl}
                                download={hw.fileName || "homework.pdf"}
                                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
                                title="मूळ फाईल डाउनलोड"
                              >
                                <Download className="size-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </>
                )}
              </motion.div>
            )}
          </div>
        )}
        </>
        )}
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
