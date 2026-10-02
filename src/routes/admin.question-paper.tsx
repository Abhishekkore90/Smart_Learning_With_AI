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

const EXAM_TYPES = [
  { id: "unit1", label: "घटक चाचणी १ (Unit Test 1)" },
  { id: "term1", label: "प्रथम सत्र परीक्षा (Term 1 Exam)" },
  { id: "unit2", label: "घटक चाचणी २ (Unit Test 2)" },
  { id: "term2", label: "द्वितीय सत्र परीक्षा (Term 2 Exam)" },
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
  const [filterExamType, setFilterExamType] = useState<string>("all");

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
      const matchExam =
        filterExamType === "all" || item.examType === filterExamType;
      const matchSearch =
        !searchTerm ||
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.subject?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchMedium && matchClass && matchSubject && matchExam && matchSearch;
    });
  }, [paperList, selectedMedium, selectedClass, selectedSubject, filterExamType, searchTerm]);

  // Upload & publish question paper
  const handleSavePaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return; // Prevent double submit

    if (!title.trim()) {
      toast.error("कृपया प्रश्नपत्रिकेचे शीर्षक प्रविष्ट करा.");
      return;
    }
    if (!selectedSubject) {
      toast.error("कृपया विषय निवडा.");
      return;
    }

    try {
      setIsUploading(true);
      let fileUrl = "";
      let fileName = "";
      let fileSize = 0;
      let fileType = "";
      let wordFileUrl = "";
      let wordFileName = "";
      let wordFileSize = 0;
      let contentToSave = content.trim();

      if (selectedFile) {
        setUploadProgress(10);
        // 1. Upload original file
        const uploadResult = await uploadFileWithProgress(selectedFile, {
          folderPath: `admin_question_papers/${selectedMedium}/${selectedClass}/${selectedSubject}`,
          onProgress: (p) => setUploadProgress(Math.round(p * 0.45)),
        });
        fileUrl = uploadResult.url;
        fileName = uploadResult.fileName;
        fileSize = uploadResult.sizeBytes;
        fileType = selectedFile.type || (fileName.endsWith(".pdf") ? "application/pdf" : "image/jpeg");

        // 2. If PDF, convert as-is without changing structure into Word (.docx) and upload to backend
        const isPdf =
          fileType === "application/pdf" ||
          fileName.toLowerCase().endsWith(".pdf") ||
          selectedFile.name.toLowerCase().endsWith(".pdf");

        if (isPdf) {
          try {
            toast.info("PDF चे Word (.docx) फाईलमध्ये रूपांतर करत आहे (Preserving structure)...");
            const arrayBuf = await selectedFile.arrayBuffer();
            const convResult = await convertPdfToDocxBlob(arrayBuf, title.trim());

            if (!contentToSave && convResult.textContent) {
              contentToSave = convResult.textContent;
            }

            const baseName = selectedFile.name.replace(/\.[^/.]+$/, "");
            wordFileName = `${baseName}.docx`;
            wordFileSize = convResult.blob.size;

            const wordFile = new File([convResult.blob], wordFileName, {
              type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            });

            toast.info("रूपांतरित Word (.docx) फाईल बॅकएंडमध्ये साठवत आहे...");
            const wordUploadResult = await uploadFileWithProgress(wordFile, {
              folderPath: `admin_question_papers/${selectedMedium}/${selectedClass}/${selectedSubject}/word`,
              onProgress: (p) => setUploadProgress(45 + Math.round(p * 0.5)),
            });
            wordFileUrl = wordUploadResult.url;
            toast.success("Word (.docx) फाईल बॅकएंडमध्ये यशस्वीरित्या साठवली गेली!");
          } catch (convErr: any) {
            console.error("PDF to Word conversion warning:", convErr);
            toast.warning("Word रूपांतरणात अडचण: " + (convErr.message || ""));
          }
        }
      }

      const examTypeObj = EXAM_TYPES.find((t) => t.id === examType);

      const isPdfFile =
        fileType === "application/pdf" ||
        fileName.toLowerCase().endsWith(".pdf") ||
        fileUrl.toLowerCase().includes(".pdf") ||
        fileUrl.startsWith("data:application/pdf");

      await addDoc(collection(db, "admin_question_papers"), {
        medium: selectedMedium,
        class: selectedClass,
        subject: selectedSubject,
        examType,
        examTypeLabel: examTypeObj?.label || examType,
        totalMarks,
        academicYear,
        title: title.trim(),
        description: description.trim(),
        content: contentToSave || description.trim(),
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileType: fileType || null,
        fileSize: fileSize || null,
        wordFileUrl: wordFileUrl || null,
        wordFileName: wordFileName || null,
        wordFileSize: wordFileSize || null,
        documentType: isPdfFile ? "pdf" : "image",
        createdAt: new Date().toISOString(),
        uploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        uploadedBy: "admin",
      });

      toast.success("प्रश्नपत्रिका यशस्वीरित्या प्रकाशित झाली!");
      setTitle("");
      setDescription("");
      setContent("");
      setSelectedFile(null);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      console.error("Save error:", err);
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
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <FileUp className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-800">
                    नवीन प्रश्नपत्रिका प्रकाशित करा (Publish Question Paper)
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedSubject} विषयासाठी परीक्षा प्रकार निवडा व मूळ PDF फाईल जोडा.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSavePaper} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                      परीक्षा प्रकार (Exam Type) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={examType}
                      onChange={(e) => setExamType(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm font-semibold outline-none transition-all cursor-pointer bg-white"
                    >
                      {EXAM_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                      एकूण गुण (Total Marks) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={totalMarks}
                      onChange={(e) => setTotalMarks(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm font-semibold outline-none transition-all cursor-pointer bg-white"
                    >
                      {MARKS_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          {m} गुण
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                      शैक्षणिक वर्ष (Academic Year)
                    </label>
                    <input
                      type="text"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm font-semibold outline-none transition-all"
                      placeholder="उदा. 2026-27"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    प्रश्नपत्रिकेचे शीर्षक (Paper Title) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. घटक चाचणी १ — भाषा (Formative Evaluation Test 1)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm font-semibold outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    प्रश्नपत्रिका PDF / फाईल जोडा (Attach Original Document - चित्रे व डिझाइन सुरक्षित राहील) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                      className="hidden"
                      id="qp-file-input"
                    />
                    <label
                      htmlFor="qp-file-input"
                      className="flex items-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 cursor-pointer transition-all active:scale-95"
                    >
                      <FileUp className="size-4 text-blue-600" />
                      <span>{selectedFile ? "फाईल बदला" : "फाईल निवडा (PDF/PNG/JPG)"}</span>
                    </label>
                    {isExtracting && (
                      <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5 animate-pulse bg-blue-50 px-3 py-2 rounded-xl border border-blue-200">
                        <Loader2 className="size-3.5 animate-spin" /> मजकूर मिळवत आहे...
                      </span>
                    )}
                    {selectedFile && !isExtracting && (
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-blue-50 px-3 py-2 rounded-xl border border-blue-200">
                        <FileText className="size-4 text-blue-600" />
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

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    तपशील / सूचना (Instructions / Description)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="उदा. वेळ: १ तास. सर्व प्रश्न सोडविणे आवश्यक आहे..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm font-semibold outline-none transition-all resize-y"
                  />
                </div>

                {/* Progress bar */}
                {isUploading && uploadProgress > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-blue-700">
                      <span>अपलोड होत आहे...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>अपलोड होत आहे...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="size-4" />
                      <span>प्रश्नपत्रिका प्रकाशित करा (Publish Question Paper)</span>
                    </>
                  )}
                </button>
              </form>
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
