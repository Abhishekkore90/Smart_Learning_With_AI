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
  ExternalLink,
  Edit3,
  X,
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
import { uploadFileWithProgress } from "@/lib/upload";
import { extractTextFromFile } from "@/lib/contentExtractor";
import { subscribeToHomework } from "@/services/homeworkService";
import type { HomeworkItem, DailyHomeworkVariables } from "@/types/documentEditor";
import { DocumentEditorViewer } from "@/components/documentViewer/DocumentEditorViewer";
import { DailyHomeworkTemplate } from "@/components/homework/DailyHomeworkTemplate";

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

  // Stepper: "medium" -> "class" -> "subject" -> "workspace"
  const [step, setStep] = useState<"medium" | "class" | "subject" | "workspace">("medium");

  const [selectedMedium, setSelectedMedium] = useState<string>("marathi");
  const [selectedClass, setSelectedClass] = useState<string>("1st");
  const [selectedSubject, setSelectedSubject] = useState<string>("");

  // Homework creation form
  const [homeworkDate, setHomeworkDate] = useState<string>(getTodayDateString());
  const [dueDate, setDueDate] = useState("");
  const [uploadMode, setUploadMode] = useState<"file" | "template">("file");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active viewing/editing homework
  const [activePreviewHomework, setActivePreviewHomework] = useState<HomeworkItem | null>(null);
  const [previewTab, setPreviewTab] = useState<"doc" | "template">("doc");

  // Auto extract text from file for indexing
  const handleFileChange = async (file: File | null) => {
    setSelectedFile(file);
    if (!file) return;
    try {
      setIsExtracting(true);
      toast.info("फाईलमधून मजकूर मिळवत आहे...");
      const extractedText = await extractTextFromFile(file);
      if (extractedText && extractedText.trim()) {
        setContent(extractedText.trim());
        toast.success("फाईलमधून मजकूर यशस्वीरित्या गोळा केला गेला!");
      }
    } catch (err: any) {
      console.warn("Extraction warning:", err);
    } finally {
      setIsExtracting(false);
    }
  };

  // Real-time Homework list from canonical admin_homework
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState<string>("");

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToHomework(
      (items) => {
        setHomeworkList(items);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching admin homework:", error);
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

  // Filtered homework list
  const filteredItems = useMemo(() => {
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

  // Handle upload & save to canonical admin_homework
  const handleSaveHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return; // Prevent double submit

    if (!title.trim()) {
      toast.error("कृपया गृहपाठाचे शीर्षक प्रविष्ट करा.");
      return;
    }
    if (!selectedSubject) {
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

      if (uploadMode === "file" && selectedFile) {
        setUploadProgress(10);
        const uploadResult = await uploadFileWithProgress(selectedFile, {
          folderPath: `admin_homework/${selectedMedium}/${selectedClass}/${selectedSubject}`,
          onProgress: (p) => setUploadProgress(p),
        });
        fileUrl = uploadResult.url;
        fileName = uploadResult.fileName;
        fileSize = uploadResult.sizeBytes;
        fileType = selectedFile.type || (fileName.endsWith(".pdf") ? "application/pdf" : "image/jpeg");
      }

      // If template mode, create structured daily variables
      let dailyVariables: DailyHomeworkVariables | null = null;
      if (uploadMode === "template") {
        dailyVariables = {
          weekday: new Date(homeworkDate).toLocaleDateString("mr-IN", { weekday: "long" }),
          date: homeworkDate,
          schoolName: "जिल्हा परिषद प्राथमिक शाळा",
          kendra: "केंद्र शाळा",
          marathi: {
            subjectName: "मराठी",
            topic: title.trim(),
            instructions: description.trim() || "खालील स्वाध्याय वहीत पूर्ण करा:",
            questions: content.trim() ? content.split("\n").filter((l) => l.trim()) : ["१. पाठाचे वाचन करून शब्दार्थ लिहा."],
          },
          english: {
            subjectName: "English",
            topic: "Daily Reading & Words",
            instructions: "Write action words and 2 sentences:",
            questions: ["1. Read unit 1 words and write in notebook."],
          },
          maths: {
            subjectName: "गणित",
            topic: "संख्या ज्ञान व उदाहरणे",
            instructions: "उदाहरणे सोडवा:",
            questions: ["१. बेरीज व वजाबाकीची उदाहरणे सोडवा."],
          },
          activity: {
            title: "दैनिक उपक्रम (Daily Activity)",
            description: "आजचा गृहपाठ तपासून पालकांची स्वाक्षरी घ्या.",
          },
        };
      }

      const isPdf =
        fileType === "application/pdf" ||
        fileName.toLowerCase().endsWith(".pdf") ||
        fileUrl.toLowerCase().includes(".pdf") ||
        fileUrl.startsWith("data:application/pdf");

      const documentType =
        uploadMode === "template"
          ? "template"
          : isPdf
          ? "pdf"
          : "image";

      await addDoc(collection(db, "admin_homework"), {
        medium: selectedMedium,
        class: selectedClass,
        subject: selectedSubject,
        homeworkDate,
        dueDate: dueDate || null,
        title: title.trim(),
        description: description.trim(),
        content: content.trim() || description.trim(),
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileType: fileType || null,
        fileSize: fileSize || null,
        templateId: uploadMode === "template" ? "balbharati-class1-daily" : null,
        documentType,
        variables: dailyVariables,
        originalFileUrl: fileUrl || null,
        createdAt: new Date().toISOString(),
        uploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        uploadedBy: "admin",
      });

      toast.success("गृहपाठ यशस्वीरित्या प्रकाशित झाला!");
      setTitle("");
      setDescription("");
      setContent("");
      setSelectedFile(null);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err.message || "गृहपाठ प्रकाशित करताना त्रुटी आली.");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string, itemTitle: string) => {
    if (!confirm(`तुम्हाला खात्री आहे का "${itemTitle}" हा गृहपाठ हटवायचा आहे?`)) return;
    try {
      await deleteDoc(doc(db, "admin_homework", id));
      toast.success("गृहपाठ हटवला गेला.");
    } catch (err: any) {
      toast.error("हटवताना त्रुटी आली: " + err.message);
    }
  };

  const currentClassObj = CLASS_OPTIONS.find((c) => c.id === selectedClass);
  const currentMediumObj = MEDIUM_OPTIONS.find((m) => m.id === selectedMedium);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />

      <main className="flex-1 py-8 px-4 sm:px-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 size-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-amber-100 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                <BookOpen className="size-3.5" /> सुपर ॲडमिन पॅनेल
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                दैनिक गृहपाठ व्यवस्थापक (Daily Homework Manager)
              </h1>
              <p className="text-xs sm:text-sm text-amber-100 max-w-2xl font-medium">
                इयत्ता १ ली ते ८ वी मराठी व सेमी माध्यमासाठी तारीखनिहाय गृहपाठ व PDF फाईल्स अपलोड करा. मूळ डिझाइन सुरक्षित ठेवून शिक्षक व विद्यार्थी मजकूर पाहू व संपादित करू शकतील.
              </p>
            </div>
            <Link
              to="/admin"
              className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/30 rounded-xl text-xs sm:text-sm font-black transition-all shadow-sm active:scale-95 shrink-0"
            >
              <ArrowLeft className="size-4" /> ॲडमिन डॅशबोर्ड
            </Link>
          </div>
        </div>

        {/* Modal: Document Viewer Preview if active */}
        <AnimatePresence>
          {activePreviewHomework && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md p-4 sm:p-8 overflow-y-auto flex items-center justify-center"
            >
              <div className="w-full max-w-5xl bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[92vh]">
                <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800 text-white flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="size-5 text-amber-400" />
                    <span className="font-bold text-sm sm:text-base truncate">
                      {activePreviewHomework.title} • {activePreviewHomework.class} ({activePreviewHomework.homeworkDate})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Switcher: Document vs Worksheet Template */}
                    <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
                      {activePreviewHomework.fileUrl && (
                        <button
                          onClick={() => setPreviewTab("doc")}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                            previewTab === "doc"
                              ? "bg-amber-600 text-white shadow-xs"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          मूळ दस्तऐवज (Document)
                        </button>
                      )}
                      <button
                        onClick={() => setPreviewTab("template")}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                          previewTab === "template"
                            ? "bg-amber-600 text-white shadow-xs"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        दैनिक कार्यपुस्तिका (Worksheet)
                      </button>
                    </div>

                    <button
                      onClick={() => setActivePreviewHomework(null)}
                      className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
                    >
                      <X className="size-5" />
                    </button>
                  </div>
                </div>

                <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                  {previewTab === "doc" && activePreviewHomework.fileUrl ? (
                    <DocumentEditorViewer
                      documentId={activePreviewHomework.id}
                      fileUrl={activePreviewHomework.fileUrl}
                      fileName={activePreviewHomework.fileName}
                      documentType="homework"
                      title={activePreviewHomework.title}
                      userId="admin"
                      userRole="admin"
                      userName="Super Admin"
                      canEdit={true}
                      onBack={() => setActivePreviewHomework(null)}
                    />
                  ) : (
                    <DailyHomeworkTemplate
                      homework={activePreviewHomework}
                      userId="admin"
                      userRole="admin"
                      userName="Super Admin"
                      canEdit={true}
                      onBack={() => setActivePreviewHomework(null)}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stepper Wizard Bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => setStep("medium")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                step === "medium"
                  ? "bg-amber-600 text-white shadow-md"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span className="size-5 rounded-full bg-white/20 flex items-center justify-center text-xs">१</span>
              <span>माध्यम {selectedMedium && `(${currentMediumObj?.labelMr})`}</span>
            </button>

            <ChevronRight className="size-4 text-slate-400 shrink-0" />

            <button
              onClick={() => setStep("class")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                step === "class"
                  ? "bg-amber-600 text-white shadow-md"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span className="size-5 rounded-full bg-white/20 flex items-center justify-center text-xs">२</span>
              <span>इयत्ता {selectedClass && `(${currentClassObj?.mr})`}</span>
            </button>

            <ChevronRight className="size-4 text-slate-400 shrink-0" />

            <button
              onClick={() => setStep("subject")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                step === "subject"
                  ? "bg-amber-600 text-white shadow-md"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span className="size-5 rounded-full bg-white/20 flex items-center justify-center text-xs">३</span>
              <span>विषय {selectedSubject && `(${selectedSubject})`}</span>
            </button>

            <ChevronRight className="size-4 text-slate-400 shrink-0" />

            <button
              disabled={!selectedSubject}
              onClick={() => setStep("workspace")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer disabled:opacity-40 ${
                step === "workspace"
                  ? "bg-amber-600 text-white shadow-md"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span className="size-5 rounded-full bg-white/20 flex items-center justify-center text-xs">४</span>
              <span>गृहपाठ अपलोड व यादी</span>
            </button>
          </div>
        </div>

        {/* STEP 1: MEDIUM SELECTION */}
        {step === "medium" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-black text-slate-800">
              पायरी १: माध्यम निवडा (Select Medium)
            </h2>
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

        {/* STEP 2: CLASS SELECTION */}
        {step === "class" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
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

        {/* STEP 3: SUBJECT SELECTION */}
        {step === "subject" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
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
                      setStep("workspace");
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
                        गृहपाठ अपलोड करण्यासाठी क्लिक करा
                      </div>
                    </div>
                    <ChevronRight className="size-5 shrink-0 opacity-60" />
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* STEP 4: WORKSPACE (UPLOAD FORM + UPLOADED LIST) */}
        {step === "workspace" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {/* Context breadcrumb & Switcher */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
              <button
                onClick={() => setStep("subject")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                <ChevronLeft className="size-4" /> विषय बदला
              </button>
            </div>

            {/* Upload New Homework Form */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <FileUp className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-800">
                      नवीन गृहपाठ प्रकाशित करा (Publish Daily Homework)
                    </h3>
                    <p className="text-xs text-slate-500">
                      {selectedSubject} विषयासाठी दिनांक, शीर्षक व सामग्री जोडा.
                    </p>
                  </div>
                </div>

                {/* Upload Mode Selector */}
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setUploadMode("file")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      uploadMode === "file"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    PDF / फाईल अपलोड
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode("template")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      uploadMode === "template"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    दैनिक कार्यपुस्तिका टेम्पलेट
                  </button>
                </div>
              </div>

              <form onSubmit={handleSaveHomework} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-amber-600" />
                      गृहपाठ दिनांक (Homework Date) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={homeworkDate}
                      onChange={(e) => setHomeworkDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm font-semibold outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                      गृहपाठ शीर्षक (Title) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="उदा. धडा १: स्वाध्याय प्रश्न १ ते ५"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm font-semibold outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                      पूर्ण करण्याची अंतिम तारीख (Due Date)
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm font-semibold outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    गृहपाठ तपशील / सूचना (Instructions / Description)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="उदा. सर्व विद्यार्थ्यांनी वहीत सुंदर हस्ताक्षरात स्वाध्याय पूर्ण करावा..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm font-semibold outline-none transition-all resize-y"
                  />
                </div>

                {/* File Attachment for File Mode */}
                {uploadMode === "file" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                      गृहपाठ PDF / फाईल जोडा (PDF/Image - मूळ डिझाइन सुरक्षित राहील)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                        className="hidden"
                        id="homework-file-input"
                      />
                      <label
                        htmlFor="homework-file-input"
                        className="flex items-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 cursor-pointer transition-all active:scale-95"
                      >
                        <FileUp className="size-4 text-amber-600" />
                        <span>{selectedFile ? "फाईल बदला" : "फाईल निवडा (PDF/PNG/JPG)"}</span>
                      </label>
                      {isExtracting && (
                        <span className="text-xs font-bold text-amber-700 flex items-center gap-1.5 animate-pulse bg-amber-50 px-3 py-2 rounded-xl border border-amber-200">
                          <Loader2 className="size-3.5 animate-spin" /> मजकूर वाचत आहे...
                        </span>
                      )}
                      {selectedFile && !isExtracting && (
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200">
                          <FileText className="size-4 text-amber-600" />
                          <span className="truncate max-w-xs">{selectedFile.name}</span>
                          <span className="text-slate-400">({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                            className="text-red-500 hover:text-red-700 ml-1"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Content / Questions Textarea */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                      गृहपाठ प्रश्न व स्वाध्याय मजकूर (Questions & Tasks)
                    </label>
                    {content && (
                      <button
                        type="button"
                        onClick={() => setContent("")}
                        className="text-[11px] text-red-500 hover:underline font-bold"
                      >
                        मजकूर पुसा
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    placeholder="उदा.
प्र. १. खालील शब्दांचे जोडाक्षर ओळखा व लिहा.
प्र. २. पाठाखालील ५ प्रश्न वहीत सोडवा."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-xs sm:text-sm font-medium outline-none transition-all font-mono leading-relaxed bg-amber-50/20"
                  />
                </div>

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

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-8 py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
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
              </form>
            </div>

            {/* List of Uploaded Homework for this Subject */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-800">
                    प्रकाशित गृहपाठ ({filteredItems.length})
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    या वर्गाच्या व विषयाच्या शिक्षकांना व विद्यार्थ्यांना दिसणारे गृहपाठ.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                  {/* Date Filter */}
                  <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                    <Calendar className="size-3.5 text-slate-400" />
                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="bg-transparent border-none outline-none font-bold text-slate-700 cursor-pointer"
                    />
                    {filterDate && (
                      <button onClick={() => setFilterDate("")} className="text-slate-400 hover:text-red-500 ml-1">
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Search */}
                  <div className="relative w-full sm:w-56">
                    <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="शोध करा..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
                  <Loader2 className="size-8 animate-spin text-amber-600 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500">गृहपाठ लोड होत आहेत...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
                  <div className="size-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                    <BookOpen className="size-8" />
                  </div>
                  <h4 className="text-base font-bold text-slate-800">कोणताही गृहपाठ सापडला नाही</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {currentMediumObj?.labelMr} • {currentClassObj?.mr} • {selectedSubject} विषयासाठी वरील फॉर्ममधून गृहपाठ प्रकाशित करा.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-amber-300 shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase mb-1">
                              दिनांक: {item.homeworkDate || "दैनिक"}
                            </span>
                            <h4 className="font-black text-base text-slate-900 leading-snug">
                              {item.title}
                            </h4>
                          </div>
                          <button
                            onClick={() => handleDelete(item.id, item.title)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer shrink-0"
                            title="हटवा (Delete)"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>

                        {item.description && (
                          <p className="text-xs text-slate-600 leading-relaxed font-medium line-clamp-3">
                            {item.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 flex-wrap text-[11px] font-semibold text-slate-500 pt-1">
                          {item.dueDate && (
                            <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md">
                              <Calendar className="size-3" /> अंतिम तारीख: {item.dueDate}
                            </span>
                          )}
                          <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                            <Clock className="size-3" /> प्रकाशित: {new Date(item.uploadedAt).toLocaleDateString("mr-IN")}
                          </span>
                        </div>
                      </div>

                      {/* Interactive Actions */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 truncate">
                          <FileText className="size-4 text-amber-600 shrink-0" />
                          <span className="truncate">
                            {item.fileName || (item.variables ? "दैनिक कार्यपुस्तिका" : "गृहपाठ स्वाध्याय")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setActivePreviewHomework(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                          >
                            <Eye className="size-3.5" /> पहा व संपादन
                          </button>
                          {item.fileUrl && (
                            <a
                              href={item.fileUrl}
                              download={item.fileName || "homework.pdf"}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
                              title="डाउनलोड"
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
            </div>
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  );
}
