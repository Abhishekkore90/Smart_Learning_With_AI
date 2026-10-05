import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
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
  PlusCircle,
  Clock,
  Trash2,
  FileUp,
  Search,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  ArrowLeft,
  ExternalLink,
  Award,
  Edit3,
  X,
  FileCheck,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { toast } from "sonner";
import { getDefaultSubjectsForClass } from "@/data/cceSubjects";
import { uploadFileWithProgress, deleteUploadedFile } from "@/lib/upload";
import { extractTextFromFile } from "@/lib/contentExtractor";
import type { QuestionPaperItem } from "@/types/documentEditor";
import { DocumentEditorViewer } from "@/components/documentViewer/DocumentEditorViewer";
import { QuestionPaperTemplate } from "@/components/questionPaper/QuestionPaperTemplate";
import { purgeDocumentAndAllEdits } from "@/services/documentEngine";
import { convertPdfToDocxBlob } from "@/services/pdfToWordConverter";
import { QuestionPaperManualEditor } from "@/components/questionPaper/QuestionPaperManualEditor";



export const Route = createFileRoute("/admin/question-paper")({
  head: () => ({
    meta: [{ title: "प्रश्नपत्रिका व्यवस्थापन (Admin Question Paper Manager) — SMART LEARNING" }],
  }),
  component: AdminQuestionPaperPage,
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
  { id: "practice", label: "सराव चाचणी परीक्षा (Practice Test)" },
];

const MARKS_OPTIONS = ["२०", "२५", "३०", "४०", "५०", "८०", "१००"];

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

function AdminQuestionPaperPage() {
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

  const [selectedExamTab, setSelectedExamTab] = useState<string>("unit1");
  const [selectedMedium, setSelectedMedium] = useState<string>("marathi");
  const [selectedClass, setSelectedClass] = useState<string>("1st");
  const [selectedSubject, setSelectedSubject] = useState<string>("");

  // Question Paper form state
  const [examType, setExamType] = useState<string>(EXAM_TYPES[0].id);
  const [totalMarks, setTotalMarks] = useState<string>("२०");
  const [academicYear, setAcademicYear] = useState<string>("2026-27");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active viewing/previewing question paper
  const [activePreviewPaper, setActivePreviewPaper] = useState<QuestionPaperItem | null>(null);
  const [previewTab, setPreviewTab] = useState<"doc" | "template">("doc");

  // Auto extract text from file
  const handleFileChange = async (file: File | null) => {
    setSelectedFile(file);
    if (!file) return;
    try {
      setIsExtracting(true);
      toast.info("फाईलमधून प्रश्नपत्रिका मजकूर मिळवत आहे...");
      const extractedText = await extractTextFromFile(file);
      if (extractedText && extractedText.trim()) {
        setContent(extractedText.trim());
        toast.success("प्रश्नपत्रिकेचा मजकूर यशस्वीरित्या गोळा केला गेला!");
      }
    } catch (err: any) {
      console.warn("Extraction warning:", err);
    } finally {
      setIsExtracting(false);
    }
  };

  // Papers list
  const [paperList, setPaperList] = useState<QuestionPaperItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterExamType, setFilterExamType] = useState<string>("unit1");

  // Real-time listener for admin_question_papers
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "admin_question_papers"), orderBy("uploadedAt", "desc"));
    const unsub = onSnapshot(
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
        console.error("Error fetching admin question papers:", error);
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

  // Filtered papers list
  const filteredPapers = useMemo(() => {
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
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.subject?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchMedium && matchClass && matchSubject && matchExam && matchSearch;
    });
  }, [paperList, selectedMedium, selectedClass, selectedSubject, filterExamType, searchTerm]);

  // Direct File Upload & Instant Publish
  const handleDirectFileUpload = async (file: File) => {
    if (!file || isUploading) return;
    if (!selectedSubject) {
      toast.error("कृपया आधी विषय निवडा.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(5);

      const examTypeObj = EXAM_TABS.find((t) => t.id === selectedExamTab) || {
        id: selectedExamTab,
        labelMr: "चाचणी १",
      };

      const baseName = file.name.replace(/\.[^/.]+$/, "").trim();
      const generatedTitle = baseName || `${currentClassObj?.mr || selectedClass} ${selectedSubject} (${examTypeObj.labelMr})`;

      let fileUrl = "";
      let fileName = "";
      let fileSize = 0;
      let fileType = "";
      let wordFileUrl = "";
      let wordFileName = "";
      let wordFileSize = 0;
      let contentToSave = "";

      toast.info(`"${file.name}" अपलोड होत आहे...`);

      // 1. Upload original file
      const uploadResult = await uploadFileWithProgress(file, {
        folderPath: `admin_question_papers/${selectedMedium}/${selectedClass}/${selectedSubject}`,
        onProgress: (p) => setUploadProgress(Math.round(p * 0.45)),
      });
      fileUrl = uploadResult.url;
      fileName = uploadResult.fileName;
      fileSize = uploadResult.sizeBytes;
      fileType = file.type || (fileName.endsWith(".pdf") ? "application/pdf" : "image/jpeg");

      // 2. If PDF, convert as-is to Word (.docx)
      const isPdf =
        fileType === "application/pdf" ||
        fileName.toLowerCase().endsWith(".pdf") ||
        file.name.toLowerCase().endsWith(".pdf");

      if (isPdf) {
        try {
          toast.info("PDF चे Word (.docx) फाईलमध्ये रूपांतर करत आहे...");
          const arrayBuf = await file.arrayBuffer();
          const convResult = await convertPdfToDocxBlob(arrayBuf, generatedTitle);

          if (convResult.textContent) {
            contentToSave = convResult.textContent;
          }

          wordFileName = `${baseName}.docx`;
          wordFileSize = convResult.blob.size;

          const wordFile = new File([convResult.blob], wordFileName, {
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          });

          const wordUploadResult = await uploadFileWithProgress(wordFile, {
            folderPath: `admin_question_papers/${selectedMedium}/${selectedClass}/${selectedSubject}/word`,
            onProgress: (p) => setUploadProgress(45 + Math.round(p * 0.5)),
          });
          wordFileUrl = wordUploadResult.url;
        } catch (convErr: any) {
          console.error("PDF to Word conversion warning:", convErr);
        }
      }

      const isPdfFile =
        fileType === "application/pdf" ||
        fileName.toLowerCase().endsWith(".pdf") ||
        fileUrl.toLowerCase().includes(".pdf");

      const docData = {
        medium: selectedMedium,
        class: selectedClass,
        subject: selectedSubject,
        examType: selectedExamTab,
        examTypeLabel: examTypeObj.labelMr,
        totalMarks: "२०",
        academicYear: "2026-27",
        title: generatedTitle,
        description: `${currentClassObj?.mr} ${selectedSubject} - ${examTypeObj.labelMr}`,
        content: contentToSave || `${selectedSubject} ${examTypeObj.labelMr} प्रश्नपत्रिका`,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileType: fileType || null,
        fileSize: fileSize || null,
        wordFileUrl: wordFileUrl || null,
        wordFileName: wordFileName || null,
        wordFileSize: wordFileSize || null,
        documentType: (isPdfFile ? "pdf" : "image") as "pdf" | "image",
        createdAt: new Date().toISOString(),
        uploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        uploadedBy: "admin",
      };

      const docRef = await addDoc(collection(db, "admin_question_papers"), docData);

      toast.success("प्रश्नपत्रिका थेट यशस्वीरित्या प्रकाशित झाली!");
      setSelectedFile(null);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // DIRECTLY SHOW TO USER: Immediately open in preview!
      setActivePreviewPaper({
        id: docRef.id,
        ...docData,
      } as QuestionPaperItem);
    } catch (err: any) {
      console.error("Direct upload error:", err);
      toast.error(err.message || "प्रश्नपत्रिका अपलोड करताना त्रुटी आली.");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string, paperTitle: string) => {
    if (!confirm(`तुम्हाला खात्री आहे का "${paperTitle}" ही प्रश्नपत्रिका हटवायची आहे?`)) return;
    try {
      const targetPaper = paperList.find((p) => p.id === id);

      // 1. Immediately update UI state
      setPaperList((prev) => prev.filter((p) => p.id !== id));
      if (activePreviewPaper?.id === id) {
        setActivePreviewPaper(null);
      }

      // 2. Delete main document from Firestore
      await deleteDoc(doc(db, "admin_question_papers", id));

      // 3. Delete physical uploaded file from backend storage (Firebase / Bunny)
      if (targetPaper?.fileUrl) {
        deleteUploadedFile(targetPaper.fileUrl).catch(() => {});
      }

      // 4. Purge all cached and stored user edits so data never mixes!
      await purgeDocumentAndAllEdits("question_paper", id);

      toast.success("प्रश्नपत्रिका हटवली गेली.");
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
        <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-purple-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 size-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-blue-100 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                <FileText className="size-3.5" /> सुपर ॲडमिन पॅनेल
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                प्रश्नपत्रिका व्यवस्थापक (Question Paper Manager)
              </h1>
              <p className="text-xs sm:text-sm text-blue-100 max-w-2xl font-medium">
                इयत्ता १ ली ते ८ वी मराठी व सेमी माध्यमासाठी घटक चाचणी व सत्र परीक्षा प्रश्नपत्रिका PDF फाईल्स अपलोड करा. मूळ डिझाइन, चित्रे व फॉन्ट अचूकतेने प्रदर्शित होतात.
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
          {activePreviewPaper && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md p-4 sm:p-8 overflow-y-auto flex items-center justify-center"
            >
              <div className="w-full max-w-5xl bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[92vh]">
                <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800 text-white flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="size-5 text-indigo-400" />
                    <span className="font-bold text-sm sm:text-base truncate">
                      {activePreviewPaper.title} • {activePreviewPaper.class} ({activePreviewPaper.examTypeLabel})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Switcher: Document vs Template */}
                    <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
                      {activePreviewPaper.fileUrl && (
                        <button
                          onClick={() => setPreviewTab("doc")}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                            previewTab === "doc"
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          मूळ दस्तऐवज व संपादन (Document & Word)
                        </button>
                      )}
                      <button
                        onClick={() => setPreviewTab("template")}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                          previewTab === "template"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        चाचणी पत्रिका साचा (Template)
                      </button>
                    </div>

                    <button
                      onClick={() => setActivePreviewPaper(null)}
                      className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
                    >
                      <X className="size-5" />
                    </button>
                  </div>
                </div>

                <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                  {previewTab === "doc" && activePreviewPaper.fileUrl ? (
                    <DocumentEditorViewer
                      documentId={activePreviewPaper.id}
                      fileUrl={activePreviewPaper.fileUrl}
                      fileName={activePreviewPaper.fileName}
                      wordFileUrl={activePreviewPaper.wordFileUrl}
                      wordFileName={activePreviewPaper.wordFileName}
                      documentType="question_paper"
                      title={activePreviewPaper.title}
                      userId="admin"
                      userRole="admin"
                      userName="Super Admin"
                      canEdit={true}
                      onBack={() => setActivePreviewPaper(null)}
                    />
                  ) : (
                    <QuestionPaperTemplate
                      paper={activePreviewPaper}
                      userId="admin"
                      userRole="admin"
                      userName="Super Admin"
                      canEdit={true}
                      onBack={() => setActivePreviewPaper(null)}
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
                  ? "bg-blue-600 text-white shadow-md"
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
                  ? "bg-blue-600 text-white shadow-md"
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
                  ? "bg-blue-600 text-white shadow-md"
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
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span className="size-5 rounded-full bg-white/20 flex items-center justify-center text-xs">४</span>
              <span>प्रश्नपत्रिका अपलोड व यादी</span>
            </button>
          </div>
        </div>

        {/* 4 EXAM TABS: चाचणी १ | प्रथम सत्र | चाचणी २ | द्वितीय सत्र */}
        <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-xs shadow-xs">
                ★
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                परीक्षा निवडा (Select Exam):
              </h3>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              सध्याची निवड: <strong className="text-blue-950 font-black">{EXAM_TABS.find(t => t.id === selectedExamTab)?.labelMr || "चाचणी १"}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
            {EXAM_TABS.map((tab, idx) => {
              const isActive = selectedExamTab === tab.id;
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSelectedExamTab(tab.id);
                    setExamType(tab.id);
                  }}
                  className={`relative p-3.5 sm:p-4 rounded-2xl text-left transition-all duration-200 border-2 cursor-pointer flex items-center gap-3 shadow-xs ${
                    isActive
                      ? `bg-gradient-to-r ${tab.color} text-white border-transparent shadow-md scale-[1.02]`
                      : "bg-slate-50/70 hover:bg-white text-slate-800 border-slate-200 hover:border-blue-300 hover:shadow-xs"
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
                      : "bg-white text-slate-800 border-slate-200 hover:border-blue-400"
                  }`}
                >
                  <Languages className={`size-10 mb-4 ${selectedMedium === med.id ? "text-white" : "text-blue-600"}`} />
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
                  माध्यम: <span className="font-bold text-blue-700">{currentMediumObj?.labelMr}</span>
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
                        : "bg-white text-slate-800 border-slate-200 hover:border-blue-400 hover:bg-blue-50/20"
                    }`}
                  >
                    <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? "bg-white/20" : "bg-blue-100 text-blue-700"}`}>
                      <IconComponent className="size-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-base truncate">{subj}</div>
                      <div className={`text-xs font-semibold ${isSelected ? "text-white/80" : "text-slate-400"}`}>
                        प्रश्नपत्रिका जोडण्यासाठी क्लिक करा
                      </div>
                    </div>
                    <ChevronRight className="size-5 shrink-0 opacity-60" />
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* STEP 4: WORKSPACE */}
        {step === "workspace" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {/* Context breadcrumb & Switcher */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
              <button
                onClick={() => setStep("subject")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                <ChevronLeft className="size-4" /> विषय बदला
              </button>
            </div>

            {/* Upload New Question Paper Form */}
            {/* Direct File Upload As Per Selected Attributes */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6">
              {/* Summary of Active Selection */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-4 rounded-2xl border border-blue-100">
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    निवडलेले तपशील (Selected Attributes)
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-xl bg-blue-600 text-white font-black text-xs shadow-xs">
                      {EXAM_TABS.find((t) => t.id === selectedExamTab)?.labelMr || "चाचणी १"}
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-xs">
                      {currentMediumObj?.labelMr}
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-purple-600 text-white font-bold text-xs shadow-xs">
                      {currentClassObj?.mr}
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-xs">
                      विषय: {selectedSubject}
                    </span>
                  </div>
                </div>
                <div className="text-xs font-semibold text-slate-600">
                  ⚡ फाईल निवडताच थेट प्रकाशित होईल व स्क्रीनवर दिसेल.
                </div>
              </div>

              {/* Direct Drag & Drop or Click to Upload */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const droppedFile = e.dataTransfer.files?.[0];
                  if (droppedFile) handleDirectFileUpload(droppedFile);
                }}
                className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/20 hover:bg-blue-50/50 rounded-3xl p-8 sm:p-12 text-center transition-all duration-300 space-y-4"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleDirectFileUpload(file);
                  }}
                  className="hidden"
                  id="direct-qp-upload-input"
                />

                <div className="size-20 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                  <FileUp className="size-10" />
                </div>

                <div className="space-y-1.5 max-w-md mx-auto">
                  <h4 className="text-lg sm:text-xl font-black text-slate-900">
                    प्रश्नपत्रिका फाईल येथे ड्रॅग करा किंवा निवडा
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">
                    (PDF, Word .docx किंवा Images) — निवडलेल्या {currentClassObj?.mr} {selectedSubject} ({EXAM_TABS.find((t) => t.id === selectedExamTab)?.labelMr}) साठी थेट प्रकाशित होईल.
                  </p>
                </div>

                {/* Progress Bar during upload */}
                {isUploading && (
                  <div className="max-w-md mx-auto space-y-2 pt-2">
                    <div className="flex justify-between text-xs font-black text-blue-700">
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="size-3.5 animate-spin" /> अपलोड व रूपांतरण चालू आहे...
                      </span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="direct-qp-upload-input"
                    className={`inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg shadow-blue-500/25 transition-all cursor-pointer active:scale-95 ${
                      isUploading ? "opacity-50 pointer-events-none" : ""
                    }`}
                  >
                    <FileUp className="size-5" />
                    <span>फाईल निवडा व थेट प्रकाशित करा (Upload & Publish)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* List of Uploaded Question Papers */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-800">
                    प्रकाशित प्रश्नपत्रिका ({filteredPapers.length})
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    या वर्गाच्या व विषयाच्या शिक्षकांना दिसणाऱ्या प्रश्नपत्रिका.
                  </p>
                </div>
                {/* Search & Exam Type Filter */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={filterExamType}
                    onChange={(e) => setFilterExamType(e.target.value)}
                    className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="all">सर्व परीक्षा (All Exams)</option>
                    {EXAM_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <div className="relative flex-1 sm:w-56">
                    <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="शोध करा..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
                  <Loader2 className="size-8 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500">प्रश्नपत्रिका लोड होत आहेत...</p>
                </div>
              ) : filteredPapers.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
                  <div className="size-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <FileText className="size-8" />
                  </div>
                  <h4 className="text-base font-bold text-slate-800">कोणतीही प्रश्नपत्रिका प्रकाशित केलेली नाही</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {currentMediumObj?.labelMr} • {currentClassObj?.mr} • {selectedSubject} विषयासाठी वरील फॉर्ममधून पहिली प्रश्नपत्रिका अपलोड करा.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPapers.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider border border-blue-200">
                                {item.examTypeLabel || item.examType}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-black border border-amber-200">
                                एकूण गुण: {item.totalMarks}
                              </span>
                              {item.wordFileUrl && (
                                <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-200 flex items-center gap-1">
                                  <FileCheck className="size-3 text-emerald-600" /> Word (.docx) उपलब्ध
                                </span>
                              )}
                            </div>
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
                          <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                            <Clock className="size-3" /> प्रकाशित: {new Date(item.uploadedAt).toLocaleDateString("mr-IN")}
                          </span>
                        </div>
                      </div>

                      {/* File attachment preview & action */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 truncate max-w-[200px]">
                          <FileText className="size-4 text-blue-600 shrink-0" />
                          <span className="truncate">{item.fileName || "प्रश्नपत्रिका PDF"}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {item.wordFileUrl && (
                            <a
                              href={item.wordFileUrl}
                              download={item.wordFileName || `${item.title}.docx`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                              title="Word (.docx) फाईल डाऊनलोड करा"
                            >
                              <FileText className="size-3.5" /> Word (.docx)
                            </a>
                          )}
                          <button
                            onClick={() => {
                              setActivePreviewPaper(item);
                              setPreviewTab("doc");
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                          >
                            <Eye className="size-3.5" /> पहा व संपादन
                          </button>
                          {item.fileUrl && (
                            <a
                              href={item.fileUrl}
                              download={item.fileName || "question-paper.pdf"}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
                              title="मूळ PDF डाउनलोड"
                            >
                              <Download className="size-3.5" />
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
