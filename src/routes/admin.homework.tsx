import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
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
  PlusCircle,
  Clock,
  Trash2,
  FileUp,
  Search,
  Check,
  AlertCircle,
  FileText,
  Loader2,
  Eye,
  ArrowLeft,
  Edit3,
  X,
  Filter,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { toast } from "sonner";
import { getDefaultSubjectsForClass } from "@/data/cceSubjects";
import { uploadFileWithProgress, deleteUploadedFile } from "@/lib/upload";
import { extractTextFromFile } from "@/lib/contentExtractor";
import { subscribeToHomework } from "@/services/homeworkService";
import type { HomeworkItem, DailyHomeworkVariables } from "@/types/documentEditor";
import type { QuestionPaperData } from "@/types/questionPaper";
import { QUESTION_PAPER_PRESETS } from "@/data/questionPaperPresets";
import { DocumentEditorViewer } from "@/components/documentViewer/DocumentEditorViewer";
import { DailyHomeworkTemplate } from "@/components/homework/DailyHomeworkTemplate";
import { DailyHomeworkCalendar, formatISODate } from "@/components/homework/DailyHomeworkCalendar";
import { QuestionPaperRenderer } from "@/components/homework/QuestionPaperRenderer";
import { MCQHomeworkSection } from "@/components/homework/MCQHomeworkSection";
import { purgeDocumentAndAllEdits } from "@/services/documentEngine";

export const Route = createFileRoute("/admin/homework")({
  head: () => ({
    meta: [{ title: "गृहपाठ व्यवस्थापन (Admin Homework Manager) — SMART LEARNING" }],
  }),
  component: AdminHomeworkPage,
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

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function AdminHomeworkPage() {
  const navigate = useNavigate();

  // Guard for Super Admin
  useEffect(() => {
    const isAdmin = sessionStorage.getItem("is_super_admin");
    if (!isAdmin) {
      navigate({ to: "/admin/login" });
    }
  }, [navigate]);

  // Main Co-Tabs: Regular Homework vs MCQ Homework (same as Teacher panel)
  const [mainTab, setMainTab] = useState<"homework" | "mcq">("homework");

  // Stepper state: "medium" -> "class" -> "list" (same clean flow as Teacher panel)
  const [step, setStep] = useState<"medium" | "class" | "list">("medium");

  const [selectedMedium, setSelectedMedium] = useState<string>("marathi");
  const [selectedClass, setSelectedClass] = useState<string>("1st");
  const [selectedSubject, setSelectedSubject] = useState<string>(""); // "" = all subjects
  const [filterDate, setFilterDate] = useState<string>("");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [calendarDate, setCalendarDate] = useState<string>(() => formatISODate(new Date()));
  const [searchTerm, setSearchTerm] = useState("");

  // Homework list state (real-time from canonical admin_homework)
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Active opened homework viewer (in-place viewing/editing)
  const [activeHomework, setActiveHomework] = useState<HomeworkItem | null>(null);
  const [previewTab, setPreviewTab] = useState<"doc" | "template" | "qp">("doc");

  // Add / Upload Homework Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formSubject, setFormSubject] = useState<string>("");
  const [homeworkDate, setHomeworkDate] = useState<string>(getTodayDateString());
  const [dueDate, setDueDate] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [extractedPreviewText, setExtractedPreviewText] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Compute available subjects for selected class and medium
  const availableSubjects = useMemo(() => {
    if (!selectedClass || !selectedMedium) return [];
    return getDefaultSubjectsForClass(selectedClass, selectedMedium);
  }, [selectedClass, selectedMedium]);

  // Keep formSubject valid whenever availableSubjects changes
  useEffect(() => {
    if (availableSubjects.length > 0 && !formSubject) {
      setFormSubject(selectedSubject || availableSubjects[0]);
    }
  }, [availableSubjects, selectedSubject, formSubject]);

  const currentClassObj = CLASS_OPTIONS.find((c) => c.id === selectedClass);
  const currentMediumObj = MEDIUM_OPTIONS.find((m) => m.id === selectedMedium);

  // Filter ONLY what matches selected medium, class, subject filter, date filter, and search
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
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.subject?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchMedium && matchClass && matchSubject && matchDate && matchSearch;
    });
  }, [homeworkList, selectedMedium, selectedClass, selectedSubject, filterDate, searchTerm]);

  // Open Add Homework Modal with prefilled date
  const handleOpenAddModal = (prefillDate?: string) => {
    const targetDate = prefillDate || filterDate || calendarDate || getTodayDateString();
    setHomeworkDate(targetDate);
    setFormSubject(selectedSubject || (availableSubjects[0] || "मराठी"));
    setTitle("");
    setDescription("");
    setContent("");
    setSelectedFile(null);
    if (previewImageUrl) {
      URL.revokeObjectURL(previewImageUrl);
      setPreviewImageUrl(null);
    }
    setExtractedPreviewText("");
    setUploadProgress(0);
    setDueDate("");
    setShowAddModal(true);
  };

  // Auto extract text from file for indexing & user preview
  const handleFileChange = async (file: File | null) => {
    setSelectedFile(file);
    if (previewImageUrl) {
      URL.revokeObjectURL(previewImageUrl);
      setPreviewImageUrl(null);
    }
    setExtractedPreviewText("");
    if (!file) return;

    // Auto set title from clean file name if title is empty
    if (!title.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      setTitle(cleanName);
    }

    const lower = file.name.toLowerCase();
    const isImage = lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp");

    if (isImage) {
      const url = URL.createObjectURL(file);
      setPreviewImageUrl(url);
    }

    try {
      setIsExtracting(true);
      toast.info("फाईलमधून मजकूर वाचत आहे...");
      const extractedText = await extractTextFromFile(file);
      if (extractedText && extractedText.trim()) {
        setContent(extractedText.trim());
        setExtractedPreviewText(extractedText.trim());
        toast.success("फाईलमधील मजकूर यशस्वीरित्या वाचला गेला!");
      } else if (isImage) {
        toast.success("इमेज फाईल निवडली गेली!");
      } else {
        toast.info("फाईल जोडली गेली.");
      }
    } catch (err: any) {
      console.warn("Extraction error:", err);
      toast.warning("मजकूर आपोआप वाचता आला नाही, परंतु फाईल यशस्वीरित्या जोडली गेली आहे.");
    } finally {
      setIsExtracting(false);
    }
  };

  // Handle Save / Publish Homework
  const handleSaveHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return;

    const subj = formSubject.trim() || availableSubjects[0] || "मराठी";

    if (!selectedFile) {
      toast.error("कृपया गृहपाठ फाईल निवडा.");
      return;
    }
    if (!subj) {
      toast.error("कृपया विषय निवडा.");
      return;
    }
    if (!homeworkDate) {
      toast.error("कृपया गृहपाठाची दिनांक निवडा.");
      return;
    }

    try {
      setIsUploading(true);
      let fileUrl = "";
      let fileName = "";
      let fileSize = 0;
      let fileType = "";

      if (selectedFile) {
        setUploadProgress(15);
        const uploadResult = await uploadFileWithProgress(selectedFile, {
          folderPath: `admin_homework/${selectedMedium}/${selectedClass}/${subj}`,
          maxSizeBytes: 100 * 1024 * 1024,
          onProgress: (p) => setUploadProgress(p),
        });
        fileUrl = uploadResult.url;
        fileName = uploadResult.fileName;
        fileSize = uploadResult.sizeBytes;
        fileType = selectedFile.type || "";
      }

      const lowerName = (fileName || selectedFile?.name || "").toLowerCase();
      const isPdf =
        fileType === "application/pdf" ||
        lowerName.endsWith(".pdf") ||
        fileUrl.toLowerCase().includes(".pdf");
      const isWord = lowerName.endsWith(".doc") || lowerName.endsWith(".docx");
      const isExcel = lowerName.endsWith(".xls") || lowerName.endsWith(".xlsx") || lowerName.endsWith(".csv");
      const isImage =
        fileType.startsWith("image/") ||
        lowerName.endsWith(".png") ||
        lowerName.endsWith(".jpg") ||
        lowerName.endsWith(".jpeg") ||
        lowerName.endsWith(".webp");

      const documentType = isPdf ? "pdf" : isWord ? "docx" : isExcel ? "excel" : isImage ? "image" : "file";

      // Auto generate title & description if not manually provided
      const effectiveTitle =
        title.trim() ||
        (selectedFile
          ? selectedFile.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ")
          : `${subj} गृहपाठ (${homeworkDate})`);

      const effectiveDescription =
        description.trim() ||
        `${subj} (${currentClassObj?.mr || selectedClass}) - दिनांक: ${homeworkDate}`;

      const effectiveContent =
        content.trim() || extractedPreviewText.trim() || effectiveTitle;

      await addDoc(collection(db, "admin_homework"), {
        medium: selectedMedium,
        class: selectedClass,
        subject: subj,
        homeworkDate,
        dueDate: dueDate || null,
        title: effectiveTitle,
        description: effectiveDescription,
        content: effectiveContent,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileType: fileType || null,
        fileSize: fileSize || null,
        documentType,
        originalFileUrl: fileUrl || null,
        createdAt: new Date().toISOString(),
        uploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        uploadedBy: "admin",
      });

      toast.success("गृहपाठ यशस्वीरित्या प्रकाशित झाला!");
      setShowAddModal(false);
      setCalendarDate(homeworkDate);
      setFilterDate(homeworkDate);
      setTitle("");
      setDescription("");
      setContent("");
      setSelectedFile(null);
      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl);
        setPreviewImageUrl(null);
      }
      setExtractedPreviewText("");
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err.message || "गृहपाठ प्रकाशित करताना त्रुटी आली.");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Delete
  const handleDelete = async (id: string, itemTitle: string) => {
    if (!confirm(`तुम्हाला खात्री आहे का "${itemTitle}" हा गृहपाठ हटवायचा आहे?`)) return;
    try {
      const targetItem = homeworkList.find((item) => item.id === id);

      setHomeworkList((prev) => prev.filter((item) => item.id !== id));
      if (activeHomework?.id === id) {
        setActiveHomework(null);
      }

      await deleteDoc(doc(db, "admin_homework", id));

      if (targetItem?.fileUrl) {
        deleteUploadedFile(targetItem.fileUrl).catch(() => {});
      }

      await purgeDocumentAndAllEdits("homework", id);
      toast.success("गृहपाठ हटवला गेला.");
    } catch (err: any) {
      toast.error("हटवताना त्रुटी आली: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <div className="no-print">
        <Header />
      </div>

      <main className="flex-1 pt-20 pb-16 px-3 sm:px-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Top Co-Tabs: Regular Homework vs MCQ Homework (Matched with Teacher Panel) */}
        <div className="no-print flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 p-1.5 bg-slate-200/90 rounded-2xl w-fit shadow-xs">
            <button
              type="button"
              onClick={() => setMainTab("homework")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                mainTab === "homework"
                  ? "bg-white text-amber-900 shadow-md font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BookOpen className="size-4 text-amber-600" />
              <span>दैनिक गृहपाठ (Daily Homework)</span>
            </button>

            <button
              type="button"
              onClick={() => setMainTab("mcq")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                mainTab === "mcq"
                  ? "bg-indigo-600 text-white shadow-md font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sparkles className="size-4 text-amber-300" />
              <span>MCQ स्वाध्याय (MCQ Quiz & Questions)</span>
              <span className="bg-amber-400 text-amber-950 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                नवीन
              </span>
            </button>
          </div>

          <Link
            to="/admin"
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95"
          >
            <ArrowLeft className="size-3.5" /> ॲडमिन डॅशबोर्ड
          </Link>
        </div>

        {mainTab === "mcq" ? (
          <MCQHomeworkSection
            defaultRole="admin"
            userName="सुपर ॲडमिन"
            initialClass={selectedClass || "all"}
            initialSubject={selectedSubject || "all"}
          />
        ) : (
          <>
            {/* Banner (Matching Teacher Panel Style) */}
            <div className="no-print bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 size-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-amber-100 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                    <BookOpen className="size-3.5" /> सुपर ॲडमिन दैनिक गृहपाठ पोर्टल
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                    गृहपाठ व्यवस्थापन (Admin Homework Manager)
                  </h1>
                  <p className="text-xs sm:text-sm text-amber-100 max-w-2xl font-medium">
                    इयत्ता १ ली ते ८ वी मराठी व सेमी माध्यमासाठी तारीखनिहाय गृहपाठ अपलोड करा, मूळ दस्तऐवज संपादित करा, आणि कार्यपुस्तिका व्यवस्थापित करा.
                  </p>
                </div>

                {/* Stepper Wizard Bar */}
                {!activeHomework && (
                  <div className="flex items-center gap-1.5 sm:gap-2 bg-white/15 backdrop-blur-md p-2 rounded-2xl border border-white/20 text-xs font-bold">
                    <button
                      onClick={() => setStep("medium")}
                      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                        step === "medium"
                          ? "bg-white text-amber-950 shadow-md font-black"
                          : "text-white/80 hover:text-white"
                      }`}
                    >
                      १. माध्यम
                    </button>
                    <ChevronRight className="size-3.5 text-white/50" />
                    <button
                      onClick={() => setStep("class")}
                      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                        step === "class"
                          ? "bg-white text-amber-950 shadow-md font-black"
                          : "text-white/80 hover:text-white"
                      }`}
                    >
                      २. इयत्ता
                    </button>
                    <ChevronRight className="size-3.5 text-white/50" />
                    <button
                      onClick={() => setStep("list")}
                      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                        step === "list"
                          ? "bg-white text-amber-950 shadow-md font-black"
                          : "text-white/80 hover:text-white"
                      }`}
                    >
                      ३. गृहपाठ यादी
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
                            ? "bg-amber-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        मूळ दस्तऐवज (Document)
                      </button>
                    )}
                    {activeHomework.questionPaperData && (
                      <button
                        onClick={() => setPreviewTab("qp")}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          previewTab === "qp"
                            ? "bg-amber-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        चाचणी प्रश्नपत्रिका (Question Paper)
                      </button>
                    )}
                    <button
                      onClick={() => setPreviewTab("template")}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        previewTab === "template"
                          ? "bg-amber-600 text-white shadow-xs"
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
                    userId="super_admin"
                    userRole="admin"
                    userName="सुपर ॲडमिन"
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
                ) : previewTab === "qp" && activeHomework.questionPaperData ? (
                  <QuestionPaperRenderer
                    initialData={activeHomework.questionPaperData}
                    canEdit={true}
                    onBack={() => setActiveHomework(null)}
                  />
                ) : (
                  <DailyHomeworkTemplate
                    homework={activeHomework}
                    userId="super_admin"
                    userRole="admin"
                    userName="सुपर ॲडमिन"
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

                {/* STEP 3: HOMEWORK DASHBOARD & CALENDAR (Directly matching Teacher Panel structure + Add Homework Option) */}
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

                      <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
                        {/* Subject Filter Dropdown */}
                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                          <BookOpen className="size-3.5 text-amber-600" />
                          <span className="text-slate-500 font-medium">विषय:</span>
                          <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="bg-transparent border-none outline-none font-bold text-slate-800 cursor-pointer text-xs"
                          >
                            <option value="">सर्व विषय (All Subjects)</option>
                            {availableSubjects.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          {selectedSubject && (
                            <button
                              onClick={() => setSelectedSubject("")}
                              className="text-slate-400 hover:text-red-500 ml-1 font-bold"
                              title="विषय फिल्टर काढा"
                            >
                              ✕
                            </button>
                          )}
                        </div>

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
                        <div className="relative flex-1 sm:w-48">
                          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="शोध करा..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:bg-white focus:border-amber-500"
                          />
                        </div>

                        {/* PROMINENT ADD HOMEWORK OPTION BUTTON */}
                        <button
                          type="button"
                          onClick={() => handleOpenAddModal()}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer shrink-0"
                        >
                          <PlusCircle className="size-4" />
                          <span>गृहपाठ जोडा (Add Homework)</span>
                        </button>

                        <button
                          onClick={() => setStep("class")}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer flex items-center gap-1 shrink-0"
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
                              ? "bg-amber-600 text-white shadow-xs font-black"
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
                              ? "bg-amber-600 text-white shadow-xs font-black"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <Layers className="size-3.5" />
                          <span>यादी दृश्य (List View) ({filteredHomework.length})</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 font-semibold hidden md:block">
                          * कॅलेंडरवर तारखेवर क्लिक करून गृहपाठ जोडा किंवा पहा
                        </span>
                        <button
                          onClick={() => handleOpenAddModal()}
                          className="text-xs font-black text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200"
                        >
                          <PlusCircle className="size-3.5" />
                          <span>नवीन गृहपाठ तयार करा</span>
                        </button>
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
                        onUploadForDate={(d) => handleOpenAddModal(d)}
                        onDeleteHomework={handleDelete}
                        userRole="admin"
                        accentColor="amber"
                      />
                    )}

                    {/* LIST VIEW */}
                    {viewMode === "list" && (
                      <>
                        {loading ? (
                          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
                            <Loader2 className="size-8 animate-spin text-amber-600 mx-auto mb-2" />
                            <p className="text-xs font-bold text-slate-500">गृहपाठ लोड होत आहे...</p>
                          </div>
                        ) : filteredHomework.length === 0 ? (
                          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
                            <div className="size-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                              <BookOpen className="size-8" />
                            </div>
                            <h4 className="text-base font-bold text-slate-800">
                              {filterDate ? `दिनांक ${filterDate} साठी कोणताही गृहपाठ सापडला नाही` : "कोणताही गृहपाठ उपलब्ध नाही"}
                            </h4>
                            <p className="text-xs text-slate-500 max-w-md mx-auto">
                              {filterDate
                                ? "इतर तारीख निवडा किंवा फिल्टर काढून सर्व गृहपाठ तपासा."
                                : `${currentMediumObj?.labelMr} • ${currentClassObj?.mr} साठी खालील बटणावर क्लिक करून नवीन गृहपाठ प्रकाशित करा.`}
                            </p>
                            <button
                              type="button"
                              onClick={() => handleOpenAddModal(filterDate || undefined)}
                              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl text-xs font-black shadow-md cursor-pointer active:scale-95"
                            >
                              <PlusCircle className="size-4" />
                              <span>या वर्गासाठी गृहपाठ जोडा (Add Homework)</span>
                            </button>
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
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                                        <Calendar className="size-3" />
                                        दिनांक: {hw.homeworkDate}
                                      </span>
                                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                                        {hw.subject}
                                      </span>
                                    </div>

                                    {/* Admin Delete Action */}
                                    <button
                                      onClick={() => handleDelete(hw.id, hw.title)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                      title="हटवा (Delete)"
                                    >
                                      <Trash2 className="size-4" />
                                    </button>
                                  </div>

                                  <h3 className="text-lg font-black text-slate-900 leading-snug">
                                    {hw.title}
                                  </h3>

                                  {hw.description && (
                                    <p className="text-xs text-slate-600 font-medium line-clamp-3 leading-relaxed">
                                      {hw.description}
                                    </p>
                                  )}

                                  {hw.dueDate && (
                                    <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 pt-1">
                                      <Clock className="size-3" />
                                      <span>पूर्ण करण्याची तारीख: {hw.dueDate}</span>
                                    </div>
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
                                      className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
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
      </main>

      {/* ADD / UPLOAD HOMEWORK MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md p-4 sm:p-6 overflow-y-auto flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="w-full max-w-3xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-slate-50/80">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <FileUp className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-800">
                      दैनिक गृहपाठ प्रकाशित करा (Publish Daily Homework)
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {currentMediumObj?.labelMr} • {currentClassObj?.mr}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
                <form id="homework-upload-form" onSubmit={handleSaveHomework} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Subject Selector */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="size-3.5 text-amber-600" />
                        विषय (Subject) <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formSubject}
                        onChange={(e) => setFormSubject(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm font-semibold outline-none transition-all cursor-pointer bg-white"
                      >
                        {availableSubjects.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date Picker */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-amber-600" />
                        दिनांक (Date) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={homeworkDate}
                        onChange={(e) => setHomeworkDate(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm font-semibold outline-none transition-all"
                      />
                    </div>

                    {/* Due Date */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                        अंतिम तारीख (Due Date)
                      </label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm font-semibold outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* DIRECT UNIFIED FILE UPLOAD ZONE (Word, PDF, Excel, PNG, JPG) */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileUp className="size-3.5 text-amber-600" />
                        गृहपाठ फाईल निवडा (Word / PDF / Excel / PNG / JPG) <span className="text-red-500">*</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">
                        सर्व फॉरमॅट्स थेट समर्थित
                      </span>
                    </label>

                    {/* Drag & Drop File Zone */}
                    <div className="border-2 border-dashed border-slate-300 hover:border-amber-500 bg-amber-50/20 hover:bg-amber-50/40 rounded-2xl p-5 transition-all text-center">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp,.txt"
                        onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                        className="hidden"
                        id="modal-unified-file-input"
                      />

                      {!selectedFile ? (
                        <label
                          htmlFor="modal-unified-file-input"
                          className="flex flex-col items-center justify-center cursor-pointer space-y-2"
                        >
                          <div className="size-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
                            <FileUp className="size-6" />
                          </div>
                          <div>
                            <span className="text-sm font-black text-slate-800 hover:text-amber-700 underline">
                              फाईल निवडण्यासाठी येथे क्लिक करा
                            </span>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                              Word (.docx, .doc), PDF (.pdf), Excel (.xlsx, .xls, .csv), इमेज (.png, .jpg)
                            </p>
                          </div>
                          <div className="flex items-center gap-2 pt-1 flex-wrap justify-center">
                            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold">Word (.docx)</span>
                            <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-bold">PDF (.pdf)</span>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold">Excel (.xlsx)</span>
                            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-bold">Image (.png/.jpg)</span>
                          </div>
                        </label>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="size-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                              <FileText className="size-5" />
                            </div>
                            <div className="text-left min-w-0">
                              <div className="text-xs sm:text-sm font-black text-slate-900 truncate">
                                {selectedFile.name}
                              </div>
                              <div className="text-[11px] text-slate-500 font-semibold">
                                {(selectedFile.size / 1024).toFixed(0)} KB • {selectedFile.type || "दस्तऐवज"}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <label
                              htmlFor="modal-unified-file-input"
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                            >
                              फाईल बदला
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFile(null);
                                if (previewImageUrl) {
                                  URL.revokeObjectURL(previewImageUrl);
                                  setPreviewImageUrl(null);
                                }
                                setExtractedPreviewText("");
                                if (fileInputRef.current) fileInputRef.current.value = "";
                              }}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                              title="काढा"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {isExtracting && (
                        <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-amber-700 animate-pulse bg-amber-100/60 py-2 px-3 rounded-xl">
                          <Loader2 className="size-4 animate-spin" />
                          <span>फाईलमधील मजकूर वाचत आहे (Reading & Extracting File Content)...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PREVIEW OF EXTRACTED FILE CONTENT / IMAGE */}
                  {(previewImageUrl || extractedPreviewText) && (
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="size-4 text-emerald-600" />
                          <span className="text-xs font-black text-slate-800">
                            फाईल वाचली गेली — पूर्वावलोकन (Extracted Content Preview)
                          </span>
                        </div>
                        {extractedPreviewText && (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                            {extractedPreviewText.length} अक्षरे • {extractedPreviewText.split("\n").length} ओळी
                          </span>
                        )}
                      </div>

                      {/* Image Preview if image uploaded */}
                      {previewImageUrl && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 bg-white p-2 max-h-56 flex items-center justify-center">
                          <img
                            src={previewImageUrl}
                            alt="Uploaded Homework Preview"
                            className="max-h-52 object-contain rounded-lg"
                          />
                        </div>
                      )}

                      {/* Text Preview if Word, PDF, or Excel extracted */}
                      {extractedPreviewText && (
                        <div className="bg-white rounded-xl p-3 border border-slate-200 max-h-48 overflow-y-auto text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed custom-scrollbar shadow-inner">
                          {extractedPreviewText}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Progress bar */}
                  {isUploading && uploadProgress > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-amber-700">
                        <span>अपलोड होत आहे...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-amber-500 h-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* Modal Footer */}
              <div className="p-5 sm:p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={isUploading}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  रद्द करा (Cancel)
                </button>

                <button
                  type="submit"
                  form="homework-upload-form"
                  disabled={isUploading}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>प्रकाशित होत आहे...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="size-4" />
                      <span>गृहपाठ प्रकाशित करा (Publish Homework)</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
