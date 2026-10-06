import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
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
  Search,
  Check,
  Eye,
  AlertCircle,
  Loader2,
  Clock,
  Filter,
  Edit3,
  RotateCcw,
  Plus,
  Trash2,
  ArrowLeft,
  Award,
} from "lucide-react";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { useState, useMemo, useEffect } from "react";
import { showToast as toast } from "@/lib/custom-toast";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { getDefaultSubjectsForClass } from "@/data/cceSubjects";
import type { QuestionPaperItem } from "@/types/documentEditor";
import { DocumentEditorViewer } from "@/components/documentViewer/DocumentEditorViewer";
import { QuestionPaperTemplate } from "@/components/questionPaper/QuestionPaperTemplate";
import { QuestionPaperManualEditor } from "@/components/questionPaper/QuestionPaperManualEditor";
import { fetchUnifiedSchoolProfile } from "@/utils/schoolProfileHelper";

export const Route = createFileRoute("/teacher/question-paper")({
  head: () => ({
    meta: [{ title: "प्रश्नपत्रिका (Question Paper) — SMART LEARNING" }],
  }),
  component: QuestionPaperPage,
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

export const EXAM_TABS = [
  {
    id: "unit1",
    labelMr: "चाचणी १",
    labelEn: "Unit Test 1",
    fullNameMr: "घटक चाचणी १",
    icon: Award,
    color: "from-blue-600 to-indigo-600",
  },
  {
    id: "term1",
    labelMr: "प्रथम सत्र",
    labelEn: "Term 1 (Semester 1)",
    fullNameMr: "प्रथम सत्र परीक्षा",
    icon: Calendar,
    color: "from-purple-600 to-pink-600",
  },
  {
    id: "unit2",
    labelMr: "चाचणी २",
    labelEn: "Unit Test 2",
    fullNameMr: "घटक चाचणी २",
    icon: Award,
    color: "from-amber-500 to-orange-600",
  },
  {
    id: "term2",
    labelMr: "द्वितीय सत्र",
    labelEn: "Term 2 (Semester 2)",
    fullNameMr: "द्वितीय सत्र परीक्षा",
    icon: Calendar,
    color: "from-emerald-600 to-teal-600",
  },
];

const EXAM_TYPES = [
  { id: "unit1", label: "चाचणी १ (Unit Test 1)" },
  { id: "term1", label: "प्रथम सत्र (Term 1 Exam)" },
  { id: "unit2", label: "चाचणी २ (Unit Test 2)" },
  { id: "term2", label: "द्वितीय सत्र (Term 2 Exam)" },
  { id: "all", label: "सर्व परीक्षा (All Exams)" },
  { id: "practice", label: "सराव चाचणी परीक्षा (Practice Test)" },
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
  return FileText;
}

const GRADIENTS = [
  { bg: "from-blue-600 to-indigo-700", light: "bg-blue-50 text-blue-700 border-blue-200" },
  { bg: "from-purple-600 to-indigo-700", light: "bg-purple-50 text-purple-700 border-purple-200" },
  { bg: "from-emerald-500 to-teal-600", light: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { bg: "from-amber-500 to-orange-600", light: "bg-amber-50 text-amber-700 border-amber-200" },
  { bg: "from-pink-500 to-rose-600", light: "bg-pink-50 text-pink-700 border-pink-200" },
  { bg: "from-cyan-500 to-sky-600", light: "bg-cyan-50 text-cyan-700 border-cyan-200" },
];

function QuestionPaperPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  // Wizard Step: "medium" -> "class" -> "subject" -> "list"
  const [step, setStep] = useState<"medium" | "class" | "subject" | "list">("medium");

  const [selectedExamTab, setSelectedExamTab] = useState<string>("unit1");
  const [selectedMedium, setSelectedMedium] = useState<string>("marathi");
  const [selectedClass, setSelectedClass] = useState<string>("1st");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [filterExamType, setFilterExamType] = useState<string>("unit1");
  const [searchTerm, setSearchTerm] = useState("");

  // Firestore Papers
  const [paperList, setPaperList] = useState<QuestionPaperItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Active opened paper for View & Edit
  const [activePaper, setActivePaper] = useState<QuestionPaperItem | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (sessionStorage.getItem("is_super_admin")) {
        // Super Admin is allowed
      } else if (!user || profile?.role !== "teacher") {
        navigate({
          to: "/login",
          search: { redirect: "/teacher/question-paper", role: "teacher" } as any,
        });
      }
    }
  }, [user, profile, authLoading, navigate]);

  // Pre-fetch authentic user school profile so structure & document views have it instantly
  useEffect(() => {
    if (user?.uid && user.uid !== "guest_teacher") {
      fetchUnifiedSchoolProfile(user.uid);
    }
  }, [user?.uid]);

  // Real-time listener for canonical admin_question_papers
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "admin_question_papers"), orderBy("uploadedAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as QuestionPaperItem[];
        setPaperList(items);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to admin question papers:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Compute available subjects
  const availableSubjects = useMemo(() => {
    if (!selectedClass || !selectedMedium) return [];
    return getDefaultSubjectsForClass(selectedClass, selectedMedium);
  }, [selectedClass, selectedMedium]);

  const currentClassObj = CLASS_OPTIONS.find((c) => c.id === selectedClass);
  const currentMediumObj = MEDIUM_OPTIONS.find((m) => m.id === selectedMedium);

  // Filter ONLY what admin uploaded for selected medium, class, and subject
  const currentSubjectPapers = useMemo(() => {
    return paperList.filter((item) => {
      const matchMedium = item.medium === selectedMedium;
      const matchClass = item.class === selectedClass;
      const matchSubject =
        !selectedSubject ||
        item.subject?.trim().toLowerCase() === selectedSubject.trim().toLowerCase();

      const matchExam = (() => {
        if (filterExamType === "all") return true;
        const eType = (item.examType || "").toLowerCase().trim();
        const eLabel = (item.examTypeLabel || "").toLowerCase().trim();
        const title = (item.title || "").toLowerCase().trim();

        if (filterExamType === "unit1") {
          return eType === "unit1" || eLabel.includes("चाचणी १") || eLabel.includes("चाचणी 1") || title.includes("चाचणी १") || title.includes("चाचणी 1") || title.includes("unit 1");
        }
        if (filterExamType === "term1") {
          return eType === "term1" || eLabel.includes("प्रथम सत्र") || title.includes("प्रथम सत्र") || title.includes("term 1") || title.includes("sem 1");
        }
        if (filterExamType === "unit2") {
          return eType === "unit2" || eLabel.includes("चाचणी २") || eLabel.includes("चाचणी 2") || title.includes("चाचणी २") || title.includes("चाचणी 2") || title.includes("unit 2");
        }
        if (filterExamType === "term2") {
          return eType === "term2" || eLabel.includes("द्वितीय सत्र") || title.includes("द्वितीय सत्र") || title.includes("term 2") || title.includes("sem 2");
        }
        return eType === filterExamType;
      })();

      const matchSearch =
        !searchTerm ||
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchMedium && matchClass && matchSubject && matchExam && matchSearch;
    });
  }, [paperList, selectedMedium, selectedClass, selectedSubject, filterExamType, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="no-print">
        <TeacherHeader />
        <TeacherSidebar />
      </div>

      <main className="pt-20 pb-16 px-3 sm:px-6 max-w-7xl mx-auto space-y-6">
        {/* Banner */}
        <div className="no-print bg-gradient-to-r from-blue-700 via-indigo-800 to-purple-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 size-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-blue-200 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                <FileText className="size-3.5" /> प्रश्नपत्रिका पोर्टल व संपादन
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                प्रश्नपत्रिका व्यवस्थापक (Question Paper Viewer & Editor)
              </h1>
              <p className="text-xs sm:text-sm text-blue-100 max-w-2xl font-medium">
                इयत्ता १ ली ते ८ वी घटक चाचणी व सत्र परीक्षा प्रश्नपत्रिका मूळ स्वरूपात (Original Document Layout) पहा, मजकूर संपादित करा व प्रिंट काढा.
              </p>
            </div>

            {/* Stepper indicator if not viewing document */}
            {!activePaper && (
              <div className="flex items-center gap-1.5 sm:gap-2 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/15 text-xs font-bold">
                <button
                  onClick={() => setStep("medium")}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    step === "medium"
                      ? "bg-white text-blue-900 shadow-md font-black"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  १. माध्यम
                </button>
                <ChevronRight className="size-3.5 text-white/40" />
                <button
                  onClick={() => setStep("class")}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    step === "class"
                      ? "bg-white text-blue-900 shadow-md font-black"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  २. इयत्ता
                </button>
                <ChevronRight className="size-3.5 text-white/40" />
                <button
                  onClick={() => setStep("subject")}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    step === "subject"
                      ? "bg-white text-blue-900 shadow-md font-black"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  ३. विषय
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ACTIVE QUESTION PAPER DOCUMENT VIEWER & EDITOR */}
        {activePaper ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
              <button
                onClick={() => setActivePaper(null)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <ChevronLeft className="size-4" />
                <span>सर्व प्रश्नपत्रिका यादी (Back)</span>
              </button>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-200">
                  {activePaper.title}
                </span>
              </div>
            </div>

            {activePaper.fileUrl ? (
              <DocumentEditorViewer
                documentId={activePaper.id}
                fileUrl={activePaper.fileUrl}
                fileName={activePaper.fileName}
                wordFileUrl={activePaper.wordFileUrl}
                wordFileName={activePaper.wordFileName}
                documentType="question_paper"
                title={`${activePaper.title} — ${activePaper.class} (${activePaper.examTypeLabel || activePaper.examType})`}
                userId={user?.uid || "guest_teacher"}
                userRole={profile?.role || "teacher"}
                userName={profile?.fullName || "शिक्षक"}
                canEdit={true}
                onBack={() => setActivePaper(null)}
                metadataBadge={
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                    <span>{activePaper.examTypeLabel || activePaper.examType}</span>
                    <span>•</span>
                    <span>इयत्ता: {activePaper.class}</span>
                    <span>•</span>
                    <span>विषय: {activePaper.subject}</span>
                    <span>•</span>
                    <span>गुण: {activePaper.totalMarks}</span>
                  </div>
                }
              />
            ) : (
              <QuestionPaperTemplate
                paper={activePaper}
                userId={user?.uid || "guest_teacher"}
                userRole={profile?.role || "teacher"}
                userName={profile?.fullName || "शिक्षक"}
                canEdit={true}
                onBack={() => setActivePaper(null)}
              />
            )}
          </div>
        ) : (
          /* STEPPING SELECTION WORKFLOW */
          <div className="space-y-6">
            {/* 4 EXAM TABS: चाचणी १ | प्रथम सत्र | चाचणी २ | द्वितीय सत्र */}
            <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-black text-xs shadow-xs">
                    ★
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                    परीक्षा निवडा (Select Exam):
                  </h3>
                </div>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                  सध्याची निवड: <strong className="text-indigo-950 font-black">{EXAM_TABS.find(t => t.id === selectedExamTab)?.labelMr || "चाचणी १"}</strong>
                </span>
              </div>

              {/* The 4 Exam Tabs Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
                {EXAM_TABS.map((tab, idx) => {
                  const isActive = selectedExamTab === tab.id;
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setSelectedExamTab(tab.id);
                        setFilterExamType(tab.id);
                      }}
                      className={`relative p-3.5 sm:p-4 rounded-2xl text-left transition-all duration-200 border-2 cursor-pointer flex items-center gap-3 shadow-xs ${
                        isActive
                          ? `bg-gradient-to-r ${tab.color} text-white border-transparent shadow-md scale-[1.02]`
                          : "bg-slate-50/70 hover:bg-white text-slate-800 border-slate-200 hover:border-indigo-300 hover:shadow-xs"
                      }`}
                    >
                      <div
                        className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isActive ? "bg-white/20 text-white" : "bg-white text-slate-700 border border-slate-200 shadow-2xs"
                        }`}
                      >
                        <IconComponent className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                              isActive ? "bg-white/25 text-white" : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="font-black text-base sm:text-lg leading-tight truncate">
                            {tab.labelMr}
                          </span>
                        </div>
                        <div className={`text-[11px] font-semibold mt-0.5 ${isActive ? "text-white/80" : "text-slate-400"}`}>
                          {tab.labelEn}
                        </div>
                      </div>
                      {isActive && (
                        <span className="size-2 rounded-full bg-white shadow-xs shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

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
                          setStep("subject");
                        }}
                        className={`p-6 rounded-2xl text-center transition-all duration-300 border-2 cursor-pointer shadow-sm hover:shadow-lg ${
                          isSelected
                            ? "bg-gradient-to-br " + grad.bg + " text-white border-transparent scale-102"
                            : "bg-white text-slate-800 border-slate-200 hover:border-blue-400 hover:bg-blue-50/20"
                        }`}
                      >
                        <GraduationCap className={`size-8 mx-auto mb-2 ${isSelected ? "text-white" : "text-blue-600"}`} />
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

            {/* STEP 3: SUBJECT */}
            {step === "subject" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-800">
                      पायरी ३: विषय निवडा (Select Subject)
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">
                      {currentMediumObj?.labelMr} • {currentClassObj?.mr}
                    </p>
                  </div>
                  <button
                    onClick={() => setStep("class")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    <ChevronLeft className="size-4" /> इयत्ता बदला
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableSubjects.map((subj, idx) => {
                    const IconComponent = getSubjectIcon(subj);
                    const isSelected = selectedSubject === subj;
                    const grad = GRADIENTS[idx % GRADIENTS.length];
                    return (
                      <button
                        key={subj}
                        onClick={() => {
                          setSelectedSubject(subj);
                          setStep("list");
                        }}
                        className={`p-5 rounded-2xl text-left transition-all duration-300 border-2 cursor-pointer shadow-sm hover:shadow-lg flex items-center gap-4 ${
                          isSelected
                            ? "bg-gradient-to-r " + grad.bg + " text-white border-transparent scale-102"
                            : "bg-white text-slate-800 border-slate-200 hover:border-blue-400 hover:bg-blue-50/20"
                        }`}
                      >
                        <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? "bg-white/20" : "bg-blue-100 text-blue-700"}`}>
                          <IconComponent className="size-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-black text-base truncate">{subj}</div>
                          <div className={`text-xs font-semibold ${isSelected ? "text-white/80" : "text-slate-400"}`}>
                            प्रश्नपत्रिका पाहण्यासाठी क्लिक करा
                          </div>
                        </div>
                        <ChevronRight className="size-5 shrink-0 opacity-60" />
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 4: QUESTION PAPER LIST */}
            {step === "list" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {/* Context Header & Filter Bar */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm">
                    <span className="px-3 py-1 rounded-lg bg-blue-100 text-blue-800 font-bold">
                      {currentMediumObj?.labelMr}
                    </span>
                    <span className="text-slate-400">/</span>
                    <span className="px-3 py-1 rounded-lg bg-indigo-100 text-indigo-800 font-bold">
                      {currentClassObj?.mr}
                    </span>
                    <span className="text-slate-400">/</span>
                    <span className="px-3 py-1 rounded-lg bg-purple-100 text-purple-800 font-bold">
                      विषय: {selectedSubject}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                    {/* Exam Type Filter */}
                    <select
                      value={filterExamType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFilterExamType(val);
                        if (EXAM_TABS.some((t) => t.id === val)) {
                          setSelectedExamTab(val);
                        }
                      }}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {EXAM_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>

                    {/* Search Input */}
                    <div className="relative flex-1 sm:w-56">
                      <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="प्रश्नपत्रिका शोधा..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:bg-white focus:border-blue-500"
                      />
                    </div>

                    <button
                      onClick={() => setStep("subject")}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                    >
                      विषय बदला
                    </button>
                  </div>
                </div>

                {/* List Cards */}
                {loading ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
                    <Loader2 className="size-8 animate-spin text-blue-600 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-500">प्रश्नपत्रिका लोड होत आहेत...</p>
                  </div>
                ) : currentSubjectPapers.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
                    <div className="size-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                      <FileText className="size-8" />
                    </div>
                    <h4 className="text-base font-bold text-slate-800">
                      कोणतीही प्रश्नपत्रिका उपलब्ध नाही
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      {currentMediumObj?.labelMr} • {currentClassObj?.mr} • {selectedSubject} विषयासाठी ॲडमिनने अद्याप प्रश्नपत्रिका अपलोड केलेली नाही.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentSubjectPapers.map((paper) => (
                      <div
                        key={paper.id}
                        className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-blue-400 shadow-sm hover:shadow-lg transition-all space-y-4 flex flex-col justify-between"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                                <Award className="size-3" />
                                {paper.examTypeLabel || paper.examType}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                                एकूण गुण: {paper.totalMarks}
                              </span>
                            </div>
                          </div>

                          <h3 className="text-lg font-black text-slate-900 leading-snug">
                            {paper.title}
                          </h3>

                          {paper.description && (
                            <p className="text-xs text-slate-600 font-medium line-clamp-3 leading-relaxed">
                              {paper.description}
                            </p>
                          )}
                        </div>

                        {/* Interactive Buttons */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 truncate max-w-[200px]">
                            <FileText className="size-4 text-blue-600 shrink-0" />
                            <span className="truncate">{paper.fileName || "प्रश्नपत्रिका PDF"}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => {
                                setActivePaper(paper);
                              }}
                              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                            >
                              <Eye className="size-3.5" />
                              <span>पहा व संपादन करा</span>
                            </button>
                            {paper.fileUrl && (
                              <a
                                href={paper.fileUrl}
                                download={paper.fileName || "question-paper.pdf"}
                                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
                                title="मूळ PDF डाउनलोड करा"
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
              </motion.div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
