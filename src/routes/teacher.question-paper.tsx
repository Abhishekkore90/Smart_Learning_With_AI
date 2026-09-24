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
  Save,
  RotateCcw,
  Plus,
  Trash2,
  School,
  ArrowLeft,
  Share2,
} from "lucide-react";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { useState, useMemo, useEffect, useRef } from "react";
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
import { getUnifiedSchoolProfile } from "@/utils/schoolProfileHelper";
import { extractTextFromUrl } from "@/lib/contentExtractor";

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

const EXAM_TYPES = [
  { id: "unit1", label: "घटक चाचणी १ (Unit Test 1)" },
  { id: "term1", label: "प्रथम सत्र परीक्षा (Term 1 Exam)" },
  { id: "unit2", label: "घटक चाचणी २ (Unit Test 2)" },
  { id: "term2", label: "द्वितीय सत्र परीक्षा (Term 2 Exam)" },
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

interface QuestionPaperItem {
  id: string;
  medium: string;
  class: string;
  subject: string;
  examType: string;
  examTypeLabel: string;
  totalMarks: string;
  title: string;
  description: string;
  content?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  uploadedAt: string;
  uploadedBy: "admin";
}

interface EditableQuestion {
  id: string;
  qNumber: string;
  qTitle: string;
  marks: string;
  body: string;
}

function parseQuestionsFromRawText(rawText: string): EditableQuestion[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split("\n");
  const questions: EditableQuestion[] = [];
  let currentQ: EditableQuestion | null = null;
  let lineBuffer: string[] = [];

  const isQuestionHeader = (line: string) => {
    const trimmed = line.trim();
    return (
      /^प्र\.\s*\d+/i.test(trimmed) ||
      /^प्रश्न\s*\d+/i.test(trimmed) ||
      /^Q\.\s*\d+/i.test(trimmed) ||
      /^Question\s*\d+/i.test(trimmed) ||
      /^\d+[\.\)]\s+[^\s]/.test(trimmed)
    );
  };

  const extractMarks = (line: string) => {
    const m = line.match(/\(?(\d+)\s*(?:गुण|marks?)\)?/i);
    return m ? `${m[1]} गुण` : "";
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentQ) lineBuffer.push("");
      continue;
    }

    if (isQuestionHeader(trimmed)) {
      if (currentQ) {
        currentQ.body = lineBuffer.join("\n").trim();
        questions.push(currentQ);
      }
      const marksFound = extractMarks(trimmed);
      const cleanTitle = trimmed.replace(/\(?\d+\s*(?:गुण|marks?)\)?/i, "").trim();

      currentQ = {
        id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        qNumber: cleanTitle.split(/[\s\.\)]+/)[0] || "प्र.",
        qTitle: cleanTitle,
        marks: marksFound || "",
        body: "",
      };
      lineBuffer = [];
    } else {
      if (currentQ) {
        lineBuffer.push(trimmed);
      } else {
        // First block before any explicit question header
        lineBuffer.push(trimmed);
      }
    }
  }

  if (currentQ) {
    currentQ.body = lineBuffer.join("\n").trim();
    questions.push(currentQ);
  } else if (lineBuffer.length > 0) {
    // If no explicit question numbers matched, group text into sections
    questions.push({
      id: `q_initial`,
      qNumber: "प्र. १",
      qTitle: "खालील प्रश्न सोडवा:",
      marks: "",
      body: lineBuffer.join("\n").trim(),
    });
  }

  return questions;
}

function QuestionPaperPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Step state: "medium" -> "class" -> "subject" -> "workspace"
  const [step, setStep] = useState<"medium" | "class" | "subject" | "workspace">("medium");

  const [selectedMedium, setSelectedMedium] = useState<string>("marathi");
  const [selectedClass, setSelectedClass] = useState<string>("5th");
  const [selectedSubject, setSelectedSubject] = useState<string>("");

  // Filters
  const [filterExamType, setFilterExamType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Admin Uploaded Question Papers List
  const [paperList, setPaperList] = useState<QuestionPaperItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Selected Paper for Editing/Viewing
  const [activePaper, setActivePaper] = useState<QuestionPaperItem | null>(null);
  const [isFetchingContent, setIsFetchingContent] = useState(false);

  // Editable Paper Sheet State
  const [schoolName, setSchoolName] = useState("");
  const [kendra, setKendra] = useState("");
  const [taluka, setTaluka] = useState("");
  const [udise, setUdise] = useState("");
  const [examName, setExamName] = useState("");
  const [paperTitle, setPaperTitle] = useState("");
  const [examTime, setExamTime] = useState("वेळ: २ तास");
  const [totalMarks, setTotalMarks] = useState("५० गुण");
  const [instructions, setInstructions] = useState(
    "१. सर्व प्रश्न सोडविणे अनिवार्य आहे.\n२. उजव्या बाजूचे अंक पूर्ण गुण दर्शवितात.\n३. खाडाखोड करू नये."
  );
  const [teacherSign, setTeacherSign] = useState("विषय शिक्षक");
  const [hmSign, setHmSign] = useState("मुख्याध्यापक");

  // Questions Array
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  // Full text mode fallback
  const [rawContentText, setRawContentText] = useState("");
  const [isFullTextMode, setIsFullTextMode] = useState(false);

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

  // Load School Profile on mount
  useEffect(() => {
    const p = getUnifiedSchoolProfile();
    setSchoolName(p.schoolName || "जिल्हा परिषद प्राथमिक शाळा");
    setKendra(p.kendra || p.centerName ? `केंद्र: ${p.kendra || p.centerName}` : "");
    setTaluka(p.taluka ? `ता. ${p.taluka}` : "");
    setUdise(p.udise ? `UDISE: ${p.udise}` : "");
    if (p.teacherName) setTeacherSign(`विषय शिक्षक: ${p.teacherName}`);
    if (p.headmaster) setHmSign(`मुख्याध्यापक: ${p.headmaster}`);
  }, []);

  // Real-time listener for admin_question_papers
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

  // Compute available subjects for selected class & medium
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
      const matchExam =
        filterExamType === "all" || item.examType === filterExamType;
      const matchSearch =
        !searchTerm ||
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchMedium && matchClass && matchSubject && matchExam && matchSearch;
    });
  }, [paperList, selectedMedium, selectedClass, selectedSubject, filterExamType, searchTerm]);

  // Open & Load Question Paper into Editable Document View
  const handleOpenPaper = async (paper: QuestionPaperItem) => {
    setActivePaper(paper);
    setExamName(paper.examTypeLabel || paper.examType || "सत्र परीक्षा २०२६-२७");
    setPaperTitle(paper.title || `${selectedSubject} प्रश्नपत्रिका`);
    setTotalMarks(`${paper.totalMarks || "५०"} गुण`);

    // Check if teacher has saved custom edits in localStorage
    const savedCustomKey = `custom_qp_v2_${paper.id}`;
    const cachedCustom = localStorage.getItem(savedCustomKey);

    if (cachedCustom) {
      try {
        const parsed = JSON.parse(cachedCustom);
        if (parsed.schoolName) setSchoolName(parsed.schoolName);
        if (parsed.kendra) setKendra(parsed.kendra);
        if (parsed.taluka) setTaluka(parsed.taluka);
        if (parsed.udise) setUdise(parsed.udise);
        if (parsed.examName) setExamName(parsed.examName);
        if (parsed.paperTitle) setPaperTitle(parsed.paperTitle);
        if (parsed.examTime) setExamTime(parsed.examTime);
        if (parsed.totalMarks) setTotalMarks(parsed.totalMarks);
        if (parsed.instructions) setInstructions(parsed.instructions);
        if (parsed.questions && Array.isArray(parsed.questions)) {
          setQuestions(parsed.questions);
          setRawContentText(parsed.rawContentText || "");
          toast.success("आपण संपादित केलेली प्रश्नपत्रिका लोड केली!");
          return;
        }
      } catch (e) {
        console.warn("Failed to parse cached custom paper:", e);
      }
    }

    // If paper already has extracted content in Firestore
    let contentText = paper.content || "";

    // If content not yet extracted but fileUrl exists, extract now
    if (!contentText.trim() && paper.fileUrl) {
      try {
        setIsFetchingContent(true);
        toast.info("फाईलमधून प्रश्न व मजकूर मिळवत आहे...");
        contentText = await extractTextFromUrl(paper.fileUrl, paper.fileName);
      } catch (e) {
        console.warn("Could not extract text from fileUrl:", e);
      } finally {
        setIsFetchingContent(false);
      }
    }

    if (!contentText.trim()) {
      contentText = paper.description || "खालील प्रश्न सोडवा:";
    }

    setRawContentText(contentText);
    const parsedQ = parseQuestionsFromRawText(contentText);
    setQuestions(parsedQ);
  };

  // Save edits locally
  const handleSaveEdits = () => {
    if (!activePaper) return;
    const saveObj = {
      schoolName,
      kendra,
      taluka,
      udise,
      examName,
      paperTitle,
      examTime,
      totalMarks,
      instructions,
      questions,
      rawContentText,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(`custom_qp_v2_${activePaper.id}`, JSON.stringify(saveObj));
    toast.success("प्रश्नपत्रिकेतील सर्व बदल यशस्वीरीत्या सेव्ह झाले!");
  };

  // Reset to original admin content
  const handleResetToOriginal = async () => {
    if (!activePaper) return;
    if (!confirm("तुम्हाला खात्री आहे का मूळ प्रश्नपत्रिका पूर्ववत करायची आहे? तुमचे केलेले बदल काढले जातील.")) return;
    localStorage.removeItem(`custom_qp_v2_${activePaper.id}`);

    let contentText = activePaper.content || "";
    if (!contentText.trim() && activePaper.fileUrl) {
      try {
        setIsFetchingContent(true);
        contentText = await extractTextFromUrl(activePaper.fileUrl, activePaper.fileName);
      } catch (e) {} finally {
        setIsFetchingContent(false);
      }
    }
    if (!contentText.trim()) contentText = activePaper.description || "";
    setRawContentText(contentText);
    setQuestions(parseQuestionsFromRawText(contentText));
    setExamName(activePaper.examTypeLabel || activePaper.examType);
    setPaperTitle(activePaper.title);
    setTotalMarks(`${activePaper.totalMarks || "५०"} गुण`);
    toast.success("मूळ प्रश्नपत्रिका पूर्ववत केली गेली!");
  };

  // Add question
  const handleAddQuestion = () => {
    const newQ: EditableQuestion = {
      id: `q_${Date.now()}`,
      qNumber: `प्र. ${questions.length + 1}`,
      qTitle: `खालील प्रश्न सोडवा:`,
      marks: "५ गुण",
      body: "१) ........................................\n२) ........................................",
    };
    setQuestions([...questions, newQ]);
  };

  // Remove question
  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  // Update question field
  const handleUpdateQuestion = (id: string, field: keyof EditableQuestion, val: string) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, [field]: val } : q))
    );
  };

  // Print paper
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="no-print">
        <TeacherHeader />
        <TeacherSidebar />
      </div>

      <main className="pt-20 pb-16 px-3 sm:px-6 max-w-7xl mx-auto space-y-6">
        {/* Module Title Banner (Hidden during print) */}
        <div className="no-print bg-gradient-to-r from-blue-700 via-indigo-800 to-purple-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 size-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-blue-200 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                <FileText className="size-3.5" /> प्रश्नपत्रिका निर्मिती व संपादन
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Question Paper / प्रश्नपत्रिका
              </h1>
              <p className="text-xs sm:text-sm text-blue-100 max-w-2xl font-medium">
                इयत्ता पहिली ते आठवी मराठी व सेमी माध्यमासाठी प्रश्नपत्रिका प्रत्यक्ष मजकुरासह पहा, सर्व मजकूर संपादित करा, शाळेचे नाव बदला व प्रिंट काढा.
              </p>
            </div>

            {/* Stepper indicators */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/15 text-xs font-bold">
              <button
                onClick={() => {
                  setActivePaper(null);
                  setStep("medium");
                }}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  step === "medium"
                    ? "bg-white text-indigo-900 shadow-sm"
                    : "text-blue-100 hover:text-white"
                }`}
              >
                १. माध्यम
              </button>
              <ChevronRight className="size-3 text-white/50" />
              <button
                onClick={() => {
                  if (step !== "medium") {
                    setActivePaper(null);
                    setStep("class");
                  }
                }}
                disabled={step === "medium"}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  step === "class"
                    ? "bg-white text-indigo-900 shadow-sm"
                    : "text-blue-100 hover:text-white disabled:opacity-40"
                }`}
              >
                २. इयत्ता
              </button>
              <ChevronRight className="size-3 text-white/50" />
              <button
                onClick={() => {
                  if (step === "workspace") {
                    setActivePaper(null);
                    setStep("subject");
                  }
                }}
                disabled={step === "medium" || step === "class"}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  step === "subject"
                    ? "bg-white text-indigo-900 shadow-sm"
                    : "text-blue-100 hover:text-white disabled:opacity-40"
                }`}
              >
                ३. विषय
              </button>
              <ChevronRight className="size-3 text-white/50" />
              <span
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  step === "workspace"
                    ? "bg-white text-indigo-900 shadow-sm"
                    : "text-blue-100 opacity-40"
                }`}
              >
                ४. प्रश्नपत्रिका
              </span>
            </div>
          </div>
        </div>

        {/* STEP 1: SELECT MEDIUM */}
        <AnimatePresence mode="wait">
          {step === "medium" && (
            <motion.div
              key="step-medium"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6 no-print"
            >
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-black text-slate-900">
                  माध्यम निवडा (Select Medium)
                </h2>
                <p className="text-xs text-slate-500 font-semibold">
                  कृपया प्रश्नपत्रिका पाहण्यासाठी प्रथम माध्यम निवडा
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {MEDIUM_OPTIONS.map((med) => {
                  const isSelected = selectedMedium === med.id;
                  return (
                    <button
                      key={med.id}
                      onClick={() => {
                        setSelectedMedium(med.id);
                        setStep("class");
                      }}
                      className={`relative p-8 rounded-3xl text-left transition-all duration-300 border-2 cursor-pointer shadow-md hover:shadow-xl ${
                        isSelected
                          ? `bg-gradient-to-br ${med.color} text-white border-transparent scale-102 ring-4 ring-indigo-500/20`
                          : "bg-white text-slate-800 border-slate-200 hover:border-indigo-400 hover:scale-101"
                      }`}
                    >
                      <div className="space-y-4">
                        <div
                          className={`size-14 rounded-2xl flex items-center justify-center font-bold ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-indigo-50 text-indigo-700"
                          }`}
                        >
                          <Languages className="size-7" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black">{med.labelMr}</h3>
                          <p
                            className={`text-sm font-semibold mt-1 ${
                              isSelected ? "text-indigo-100" : "text-slate-500"
                            }`}
                          >
                            {med.labelEn}
                          </p>
                        </div>
                        <div className="pt-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider">
                          <span>निवडा & पुढे जा</span>
                          <ChevronRight className="size-4" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 2: SELECT CLASS */}
          {step === "class" && (
            <motion.div
              key="step-class"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6 no-print"
            >
              <div className="flex items-center justify-between flex-wrap gap-3 max-w-5xl mx-auto">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    इयत्ता निवडा (Select Class)
                  </h2>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    माध्यम: <span className="text-indigo-600 font-bold">{currentMediumObj?.labelMr}</span>
                  </p>
                </div>
                <button
                  onClick={() => setStep("medium")}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <ChevronLeft className="size-4" /> माध्यम बदला (Change Medium)
                </button>
              </div>

              {/* Grid of Classes 1st to 8th */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-5xl mx-auto">
                {CLASS_OPTIONS.map((cls, idx) => {
                  const isSelected = selectedClass === cls.id;
                  const color = GRADIENTS[idx % GRADIENTS.length];
                  return (
                    <button
                      key={cls.id}
                      onClick={() => {
                        setSelectedClass(cls.id);
                        setSelectedSubject("");
                        setStep("subject");
                      }}
                      className={`p-6 rounded-3xl border-2 text-center transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-lg ${
                        isSelected
                          ? `bg-gradient-to-br ${color.bg} text-white border-transparent scale-103 shadow-md`
                          : "bg-white text-slate-800 border-slate-200 hover:border-indigo-400 hover:scale-101"
                      }`}
                    >
                      <div
                        className={`size-14 rounded-2xl flex items-center justify-center ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        <GraduationCap className="size-7" />
                      </div>
                      <div>
                        <div className="font-black text-lg leading-tight">
                          {cls.mr}
                        </div>
                        <div
                          className={`text-xs font-semibold mt-0.5 ${
                            isSelected ? "text-white/80" : "text-slate-400"
                          }`}
                        >
                          {cls.en}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setStep("medium")}
                  className="px-6 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <ChevronLeft className="size-4" /> मागे जा (Back to Medium)
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: SELECT SUBJECT */}
          {step === "subject" && (
            <motion.div
              key="step-subject"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6 no-print"
            >
              <div className="flex items-center justify-between flex-wrap gap-3 max-w-5xl mx-auto">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    विषय निवडा (Select Subject)
                  </h2>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    {currentMediumObj?.labelMr} • {currentClassObj?.mr}
                  </p>
                </div>
                <button
                  onClick={() => setStep("class")}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <ChevronLeft className="size-4" /> इयत्ता बदला (Change Class)
                </button>
              </div>

              {/* Grid of Subjects */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
                {availableSubjects.map((subjName, idx) => {
                  const Icon = getSubjectIcon(subjName);
                  const isSelected = selectedSubject === subjName;
                  const color = GRADIENTS[idx % GRADIENTS.length];

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedSubject(subjName);
                        setActivePaper(null);
                        setStep("workspace");
                      }}
                      className={`p-6 rounded-3xl border text-left transition-all duration-300 cursor-pointer flex flex-col justify-between gap-4 group shadow-sm hover:shadow-lg ${
                        isSelected
                          ? "bg-gradient-to-br from-indigo-700 to-purple-800 text-white border-indigo-700 scale-102"
                          : "bg-white text-slate-800 border-slate-200 hover:border-indigo-400 hover:scale-101"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div
                          className={`size-12 rounded-2xl flex items-center justify-center font-bold ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors"
                          }`}
                        >
                          <Icon className="size-6" />
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : color.light
                          }`}
                        >
                          विषय {idx + 1}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-lg font-black">{subjName}</h3>
                        <p
                          className={`text-xs font-semibold mt-0.5 ${
                            isSelected ? "text-indigo-200" : "text-slate-500"
                          }`}
                        >
                          {currentClassObj?.mr} ({currentMediumObj?.labelMr})
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 font-bold text-xs text-indigo-600 group-hover:text-indigo-700">
                        <span>प्रश्नपत्रिका पहा व संपादित करा</span>
                        <span>→</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setStep("class")}
                  className="px-6 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <ChevronLeft className="size-4" /> मागे जा (Back to Class)
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: QUESTION PAPER WORKSPACE */}
          {step === "workspace" && (
            <motion.div
              key="step-workspace"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Active Selection Summary Bar (Hidden during print) */}
              <div className="no-print bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-extrabold">
                      {currentMediumObj?.labelMr}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-extrabold">
                      {currentClassObj?.mr}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold">
                      {selectedSubject}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900">
                    {activePaper ? activePaper.title : `${selectedSubject} - प्रश्नपत्रिका सूची`}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  {activePaper && (
                    <button
                      onClick={() => setActivePaper(null)}
                      className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-indigo-200"
                    >
                      <ArrowLeft className="size-4" /> प्रश्नपत्रिका यादीवर परत जा
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setActivePaper(null);
                      setStep("subject");
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200"
                  >
                    <ChevronLeft className="size-4" /> विषय बदला
                  </button>
                </div>
              </div>

              {/* IF AN ACTIVE PAPER IS SELECTED: RENDER EDITABLE DOCUMENT SHEET */}
              {activePaper ? (
                <div className="space-y-6">
                  {/* Action Bar (Save, Print, Reset, Toggle) */}
                  <div className="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 sticky top-16 z-20">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200">
                        <Edit3 className="size-3.5" /> सर्व मजकूर थेट संपादित करा (Click any text to edit)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={handleSaveEdits}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 cursor-pointer"
                      >
                        <Save className="size-4" /> बदल सेव्ह करा (Save)
                      </button>

                      <button
                        onClick={handlePrint}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 cursor-pointer"
                      >
                        <Printer className="size-4" /> प्रिंट / PDF जतन करा
                      </button>

                      <button
                        onClick={handleResetToOriginal}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200"
                        title="मूळ प्रश्नपत्रिका पूर्ववत करा"
                      >
                        <RotateCcw className="size-3.5" /> पूर्ववत (Reset)
                      </button>

                      <button
                        onClick={() => setIsFullTextMode(!isFullTextMode)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200"
                      >
                        {isFullTextMode ? "प्रश्ननिहाय व्ह्यू" : "एकत्रित मजकूर संपादन"}
                      </button>
                    </div>
                  </div>

                  {/* LOADING CONTENT STATE */}
                  {isFetchingContent && (
                    <div className="no-print bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-blue-800">
                      <Loader2 className="size-4 animate-spin text-blue-600" />
                      <span>फाईलमधून प्रश्नपत्रिका मजकूर वाचत आहे, कृपया प्रतीक्षा करा...</span>
                    </div>
                  )}

                  {/* PRINTABLE OFFICIAL QUESTION PAPER SHEET */}
                  <div
                    id="printable-paper"
                    className="bg-white rounded-2xl border-2 border-slate-800 p-6 sm:p-10 shadow-lg text-slate-900 font-sans max-w-4xl mx-auto space-y-6"
                    style={{ minHeight: "297mm" }}
                  >
                    {/* 1. Official School Header */}
                    <div className="border-b-2 border-slate-800 pb-4 text-center space-y-2">
                      <input
                        type="text"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        placeholder="शाळेचे नाव प्रविष्ट करा..."
                        className="w-full text-center text-xl sm:text-2xl font-black text-slate-900 border-b border-dashed border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent"
                      />

                      <div className="flex items-center justify-center gap-3 sm:gap-6 flex-wrap text-xs sm:text-sm font-bold text-slate-700">
                        <input
                          type="text"
                          value={kendra}
                          onChange={(e) => setKendra(e.target.value)}
                          placeholder="केंद्र: ..."
                          className="text-center border-b border-dashed border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent"
                        />
                        <input
                          type="text"
                          value={taluka}
                          onChange={(e) => setTaluka(e.target.value)}
                          placeholder="ता. ... जि. ..."
                          className="text-center border-b border-dashed border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent"
                        />
                        <input
                          type="text"
                          value={udise}
                          onChange={(e) => setUdise(e.target.value)}
                          placeholder="UDISE: ..."
                          className="text-center border-b border-dashed border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent"
                        />
                      </div>

                      {/* Exam Title Banner */}
                      <div className="pt-2">
                        <input
                          type="text"
                          value={examName}
                          onChange={(e) => setExamName(e.target.value)}
                          className="w-full text-center text-lg sm:text-xl font-extrabold uppercase tracking-wide text-slate-900 border-b border-dashed border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent"
                        />
                        <input
                          type="text"
                          value={paperTitle}
                          onChange={(e) => setPaperTitle(e.target.value)}
                          className="w-full text-center text-sm sm:text-base font-bold text-slate-800 border-b border-dashed border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent mt-0.5"
                        />
                      </div>
                    </div>

                    {/* 2. Paper Meta Information (Subject, Class, Marks, Time) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 border-b-2 border-slate-800 text-xs sm:text-sm font-bold">
                      <div>
                        इयत्ता: <span className="font-extrabold">{currentClassObj?.mr}</span> ({currentMediumObj?.labelMr})
                      </div>
                      <div>
                        विषय: <span className="font-extrabold">{selectedSubject}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        गुण:
                        <input
                          type="text"
                          value={totalMarks}
                          onChange={(e) => setTotalMarks(e.target.value)}
                          className="w-20 font-extrabold border-b border-dashed border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent"
                        />
                      </div>
                      <div className="flex items-center gap-1 justify-end">
                        <input
                          type="text"
                          value={examTime}
                          onChange={(e) => setExamTime(e.target.value)}
                          className="w-24 text-right font-extrabold border-b border-dashed border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent"
                        />
                      </div>
                    </div>

                    {/* Student Name & Roll No Line */}
                    <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-300 text-xs sm:text-sm font-bold">
                      <div className="flex-1">
                        विद्यार्थ्याचे नाव: <span className="border-b border-dotted border-slate-400 inline-block w-4/5">&nbsp;</span>
                      </div>
                      <div className="w-32 text-right">
                        हजेरी क्र.: <span className="border-b border-dotted border-slate-400 inline-block w-16">&nbsp;</span>
                      </div>
                    </div>

                    {/* 3. Instructions */}
                    <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="font-bold text-slate-800">सामान्य सूचना:</div>
                      <textarea
                        rows={2}
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        className="w-full text-xs font-medium text-slate-700 bg-transparent focus:outline-none border-b border-transparent focus:border-indigo-400 resize-none leading-relaxed"
                      />
                    </div>

                    {/* 4. Questions Section */}
                    {isFullTextMode ? (
                      /* FULL TEXT EDIT MODE */
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700">
                          संपूर्ण प्रश्नपत्रिका मजकूर संपादन (Full Text Editor):
                        </label>
                        <textarea
                          rows={22}
                          value={rawContentText}
                          onChange={(e) => {
                            setRawContentText(e.target.value);
                            setQuestions(parseQuestionsFromRawText(e.target.value));
                          }}
                          className="w-full p-4 border border-slate-300 rounded-xl text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    ) : (
                      /* STRUCTURED QUESTIONS LIST (EACH EDITABLE IN-PLACE) */
                      <div className="space-y-6 pt-2">
                        {questions.map((q, idx) => (
                          <div
                            key={q.id}
                            className="group relative p-3 rounded-xl border border-transparent hover:border-indigo-200 transition-all space-y-2"
                          >
                            {/* Question Header & Marks */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2 flex-1">
                                <input
                                  type="text"
                                  value={q.qTitle}
                                  onChange={(e) => handleUpdateQuestion(q.id, "qTitle", e.target.value)}
                                  className="w-full font-black text-sm sm:text-base text-slate-900 border-b border-dashed border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent"
                                />
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <input
                                  type="text"
                                  value={q.marks}
                                  placeholder="गुण"
                                  onChange={(e) => handleUpdateQuestion(q.id, "marks", e.target.value)}
                                  className="w-20 text-right font-black text-xs sm:text-sm text-slate-800 border-b border-dashed border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveQuestion(q.id)}
                                  className="no-print opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition-all cursor-pointer"
                                  title="प्रश्न हटवा"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Question Body / Sub-questions */}
                            <textarea
                              rows={Math.max(2, (q.body.match(/\n/g) || []).length + 1)}
                              value={q.body}
                              onChange={(e) => handleUpdateQuestion(q.id, "body", e.target.value)}
                              className="w-full text-xs sm:text-sm font-medium text-slate-800 leading-relaxed border border-transparent hover:border-slate-200 focus:border-indigo-400 rounded-lg p-2 focus:outline-none bg-transparent resize-y"
                            />
                          </div>
                        ))}

                        {/* Add New Question Button (Hidden in print) */}
                        <div className="no-print pt-2 flex justify-center">
                          <button
                            type="button"
                            onClick={handleAddQuestion}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-dashed border-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                          >
                            <Plus className="size-4" /> नवीन प्रश्न जोडा (Add Question)
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 5. Signatures Footer */}
                    <div className="pt-12 flex items-center justify-between text-xs sm:text-sm font-bold border-t border-slate-300">
                      <div className="space-y-1 text-left">
                        <div className="h-8 border-b border-dotted border-slate-400 w-36"></div>
                        <input
                          type="text"
                          value={teacherSign}
                          onChange={(e) => setTeacherSign(e.target.value)}
                          className="font-bold border-b border-dashed border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent"
                        />
                      </div>
                      <div className="space-y-1 text-right">
                        <div className="h-8 border-b border-dotted border-slate-400 w-36 ml-auto"></div>
                        <input
                          type="text"
                          value={hmSign}
                          onChange={(e) => setHmSign(e.target.value)}
                          className="font-bold text-right border-b border-dashed border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* QUESTION PAPERS LIST (WHEN NO PAPER IS ACTIVELY OPEN) */
                <div className="space-y-6">
                  {/* Filters & Search */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-500">परीक्षा:</span>
                      <select
                        value={filterExamType}
                        onChange={(e) => setFilterExamType(e.target.value)}
                        className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-indigo-500 cursor-pointer text-slate-700 shadow-sm"
                      >
                        <option value="all">सर्व परीक्षा (All Exams)</option>
                        {EXAM_TYPES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs font-bold text-slate-400">|</span>
                      <span className="text-xs font-bold text-slate-600">
                        उपलब्ध: <strong className="text-indigo-600 font-black">{currentSubjectPapers.length}</strong>
                      </span>
                    </div>

                    <div className="relative w-full sm:w-72">
                      <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="प्रश्नपत्रिका शोधा..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-indigo-500 shadow-sm"
                      />
                    </div>
                  </div>

                  {/* LIST OF QUESTION PAPERS UPLOADED BY ADMIN */}
                  {loading ? (
                    <div className="bg-white rounded-3xl p-16 text-center border border-slate-200">
                      <Loader2 className="size-10 animate-spin text-indigo-600 mx-auto mb-3" />
                      <p className="text-sm font-bold text-slate-600">प्रश्नपत्रिका लोड होत आहेत...</p>
                    </div>
                  ) : currentSubjectPapers.length === 0 ? (
                    <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 space-y-4">
                      <div className="size-20 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                        <FileText className="size-10" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-black text-slate-900">
                          सध्या या विषयासाठी कोणतीही प्रश्नपत्रिका उपलब्ध नाही
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto font-medium">
                          {currentMediumObj?.labelMr} • {currentClassObj?.mr} • {selectedSubject} विषयासाठी ॲडमिनने प्रश्नपत्रिका अपलोड केल्यावर ती येथे आपोआप दिसेल.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {currentSubjectPapers.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-indigo-400 shadow-sm hover:shadow-lg transition-all space-y-4 flex flex-col justify-between"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1.5 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider border border-blue-200">
                                    {item.examTypeLabel || item.examType}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-black border border-amber-200">
                                    एकूण गुण: {item.totalMarks}
                                  </span>
                                </div>
                                <h3 className="font-black text-lg text-slate-900 leading-snug">
                                  {item.title}
                                </h3>
                              </div>
                            </div>

                            {item.description && (
                              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-700 leading-relaxed font-medium line-clamp-3">
                                {item.description}
                              </div>
                            )}

                            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 font-semibold">
                              <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                                <Clock className="size-3.5" /> {new Date(item.uploadedAt).toLocaleDateString("mr-IN")}
                              </span>
                            </div>
                          </div>

                          {/* ACTION BUTTON: VIEW & EDIT AS REAL DOCUMENT */}
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                            <span className="text-xs font-bold text-slate-500">
                              {item.fileName ? "दस्तऐवज उपलब्ध" : "प्रश्न उपलब्ध"}
                            </span>
                            <button
                              onClick={() => handleOpenPaper(item)}
                              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
                            >
                              <Edit3 className="size-3.5" />
                              <span>प्रश्नपत्रिका पहा व संपादित करा (View & Edit)</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
