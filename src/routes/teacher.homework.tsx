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

  // Wizard state: "medium" -> "class" -> "subject" -> "list"
  const [step, setStep] = useState<"medium" | "class" | "subject" | "list">("medium");

  const [selectedMedium, setSelectedMedium] = useState<string>("marathi");
  const [selectedClass, setSelectedClass] = useState<string>("1st");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("");

  // Homework List state
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Active opened homework
  const [activeHomework, setActiveHomework] = useState<HomeworkItem | null>(null);
  const [previewTab, setPreviewTab] = useState<"doc" | "template">("doc");

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
        {/* Banner */}
        <div className="no-print bg-gradient-to-r from-teal-700 via-emerald-800 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 size-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-emerald-200 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                <BookOpen className="size-3.5" /> दैनिक गृहपाठ पोर्टल (Daily Homework)
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                गृहपाठ व्यवस्थापन (Homework Viewer & Editor)
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100 max-w-2xl font-medium">
                इयत्ता १ ली ते ८ वी मराठी व सेमी माध्यमासाठी तारीखनिहाय गृहपाठ पहा, मूळ डिझाइन सुरक्षित ठेवून मजकूर संपादित करा, प्रिंट काढा किंवा PDF डाउनलोड करा.
              </p>
            </div>

            {/* Stepper Wizard Bar */}
            {!activeHomework && (
              <div className="flex items-center gap-1.5 sm:gap-2 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/15 text-xs font-bold">
                <button
                  onClick={() => setStep("medium")}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    step === "medium"
                      ? "bg-white text-emerald-900 shadow-md font-black"
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
                      ? "bg-white text-emerald-900 shadow-md font-black"
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
                      ? "bg-white text-emerald-900 shadow-md font-black"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  ३. विषय
                </button>
              </div>
            )}
          </div>
        </div>

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
                {activeHomework.fileUrl && (
                  <button
                    onClick={() => setPreviewTab("doc")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      previewTab === "doc"
                        ? "bg-teal-700 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    मूळ दस्तऐवज (Document)
                  </button>
                )}
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
              </div>
            </div>

            {previewTab === "doc" && activeHomework.fileUrl ? (
              <DocumentEditorViewer
                documentId={activeHomework.id}
                fileUrl={activeHomework.fileUrl}
                fileName={activeHomework.fileName}
                documentType="homework"
                title={`${activeHomework.title} — ${activeHomework.class} (${activeHomework.homeworkDate || "दैनिक"})`}
                userId={user?.uid || "guest_teacher"}
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
                          setStep("subject");
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
                            : "bg-white text-slate-800 border-slate-200 hover:border-amber-400 hover:bg-amber-50/20"
                        }`}
                      >
                        <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? "bg-white/20" : "bg-amber-100 text-amber-700"}`}>
                          <IconComponent className="size-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-black text-base truncate">{subj}</div>
                          <div className={`text-xs font-semibold ${isSelected ? "text-white/80" : "text-slate-400"}`}>
                            गृहपाठ पाहण्यासाठी क्लिक करा
                          </div>
                        </div>
                        <ChevronRight className="size-5 shrink-0 opacity-60" />
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
                    <span className="text-slate-400">/</span>
                    <span className="px-3 py-1 rounded-lg bg-indigo-100 text-indigo-800 font-bold">
                      विषय: {selectedSubject}
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
                        : `${currentMediumObj?.labelMr} • ${currentClassObj?.mr} • ${selectedSubject} विषयासाठी ॲडमिनने अद्याप गृहपाठ अपलोड केलेला नाही.`}
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
              </motion.div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
