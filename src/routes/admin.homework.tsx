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
import { uploadFileWithProgress } from "@/lib/upload";
import { extractTextFromFile } from "@/lib/contentExtractor";

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

interface HomeworkItem {
  id: string;
  medium: string;
  class: string;
  subject: string;
  title: string;
  description: string;
  content?: string;
  dueDate?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  uploadedAt: string;
  uploadedBy: "admin";
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
  const [selectedClass, setSelectedClass] = useState<string>("5th");
  const [selectedSubject, setSelectedSubject] = useState<string>("");

  // Homework creation form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto extract text from file
  const handleFileChange = async (file: File | null) => {
    setSelectedFile(file);
    if (!file) return;
    try {
      setIsExtracting(true);
      toast.info("फाईलमधून मजकूर मिळवत आहे...");
      const extractedText = await extractTextFromFile(file);
      if (extractedText && extractedText.trim()) {
        setContent(extractedText.trim());
        toast.success("फाईलमधून मजकूर यशस्वीरित्या मिळवला गेला! खालील मजकूर तपासा.");
      }
    } catch (err: any) {
      console.warn("Extraction warning:", err);
    } finally {
      setIsExtracting(false);
    }
  };

  // Homework list
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Listen for admin_homework
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "admin_homework"), orderBy("uploadedAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as HomeworkItem[];
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

  // Filtered homework list for selected Medium, Class, and Subject
  const filteredItems = useMemo(() => {
    return homeworkList.filter((item) => {
      const matchMedium = item.medium === selectedMedium;
      const matchClass = item.class === selectedClass;
      const matchSubject =
        !selectedSubject ||
        item.subject?.trim().toLowerCase() === selectedSubject.trim().toLowerCase();
      const matchSearch =
        !searchTerm ||
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchMedium && matchClass && matchSubject && matchSearch;
    });
  }, [homeworkList, selectedMedium, selectedClass, selectedSubject, searchTerm]);

  // Handle upload & save
  const handleSaveHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("कृपया गृहपाठाचे शीर्षक प्रविष्ट करा.");
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

      if (selectedFile) {
        setUploadProgress(10);
        const uploadResult = await uploadFileWithProgress(selectedFile, {
          folderPath: `admin_homework/${selectedMedium}/${selectedClass}/${selectedSubject}`,
          onProgress: (p) => setUploadProgress(p),
        });
        fileUrl = uploadResult.url;
        fileName = uploadResult.fileName;
        fileSize = uploadResult.sizeBytes;
      }

      await addDoc(collection(db, "admin_homework"), {
        medium: selectedMedium,
        class: selectedClass,
        subject: selectedSubject,
        title: title.trim(),
        description: description.trim(),
        content: content.trim() || description.trim(),
        dueDate: dueDate || null,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSize: fileSize || null,
        uploadedAt: new Date().toISOString(),
        uploadedBy: "admin",
      });

      toast.success("गृहपाठ यशस्वीरित्या अपलोड झाला!");
      setTitle("");
      setDescription("");
      setContent("");
      setDueDate("");
      setSelectedFile(null);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err.message || "गृहपाठ अपलोड करताना त्रुटी आली.");
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
                गृहपाठ व्यवस्थापक (Homework Uploader)
              </h1>
              <p className="text-xs sm:text-sm text-amber-100 max-w-2xl font-medium">
                इयत्ता १ ली ते ८ वी मराठी व सेमी माध्यमासाठी विषयनिहाय गृहपाठ व PDF फाईल्स अपलोड करा. ॲडमिनने अपलोड केलेला गृहपाठ शिक्षकांना व विद्यार्थ्यांना दिसेल.
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
              onClick={() => {
                if (selectedSubject) setStep("workspace");
                else toast.info("कृपया आधी विषय निवडा.");
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                step === "workspace"
                  ? "bg-amber-600 text-white shadow-md"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span className="size-5 rounded-full bg-white/20 flex items-center justify-center text-xs">४</span>
              <span>अपलोड व व्यवस्थापन (Upload)</span>
            </button>
          </div>
        </div>

        {/* STEP 1: MEDIUM SELECTION */}
        {step === "medium" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-slate-800">
                पायरी १: माध्यम निवडा (Select Medium)
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                ज्या माध्यमासाठी गृहपाठ अपलोड करायचा आहे ते माध्यम निवडा.
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
                        ? "bg-gradient-to-br " + med.color + " text-white border-transparent scale-102"
                        : "bg-white text-slate-800 border-slate-200 hover:border-amber-400 hover:bg-amber-50/30"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className={`size-14 rounded-2xl flex items-center justify-center ${isSelected ? "bg-white/20" : "bg-amber-100 text-amber-700"}`}>
                        <Languages className="size-7" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black">{med.labelMr}</h3>
                        <p className={`text-sm font-semibold ${isSelected ? "text-white/80" : "text-slate-500"}`}>
                          {med.labelEn}
                        </p>
                      </div>
                      <div className="pt-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider">
                        <span>निवडा & पुढील पायरीवर जा</span>
                        <ChevronRight className="size-4" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* STEP 2: CLASS SELECTION */}
        {step === "class" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
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
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
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
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
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
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <FileUp className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-800">
                    नवीन गृहपाठ अपलोड करा (Upload Homework)
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedSubject} विषयासाठी शीर्षक, सूचना व PDF फाईल जोडा.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveHomework} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                      गृहपाठ शीर्षक (Homework Title) <span className="text-red-500">*</span>
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
                      पूर्ण करण्याची अंतिम तारीख (Due Date) (पर्यायी)
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
                    गृहपाठ तपशील / प्रश्न / सूचना (Instructions / Description)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="उदा. सर्व विद्यार्थ्यांनी वहीत सुंदर हस्ताक्षरात प्रश्नोत्तरे लिहून पूर्ण करावीत..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm font-semibold outline-none transition-all resize-y"
                  />
                </div>

                {/* File Attachment */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    गृहपाठ PDF / फाईल जोडा (Attach PDF or Document)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                      onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                      className="hidden"
                      id="homework-file-input"
                    />
                    <label
                      htmlFor="homework-file-input"
                      className="flex items-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 cursor-pointer transition-all active:scale-95"
                    >
                      <FileUp className="size-4 text-amber-600" />
                      <span>{selectedFile ? "फाईल बदला" : "फाईल निवडा (PDF/Word/Text)"}</span>
                    </label>
                    {isExtracting && (
                      <span className="text-xs font-bold text-amber-700 flex items-center gap-1.5 animate-pulse bg-amber-50 px-3 py-2 rounded-xl border border-amber-200">
                        <Loader2 className="size-3.5 animate-spin" /> मजकूर काढत आहे...
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

                {/* Content / Questions Textarea (Editable, auto-filled from file) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                      गृहपाठ सामग्री व प्रश्न (Homework Content & Questions - विद्यार्थ्यांसाठी दर्शविला जाणारा मजकूर)
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
                    rows={6}
                    placeholder="उदा.
प्र. १. खालील प्रश्नांची उत्तरे लिहा:
१) झाडांचे महत्त्व थोडक्यात स्पष्ट करा.
२) आपल्या परिसरातील ५ वनस्पतींची नावे लिहा.

प्र. २. खालील शब्दांचे विरुद्धार्थी शब्द लिहा:
१) मित्र × ............
२) दिवस × ............"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-xs sm:text-sm font-medium outline-none transition-all font-mono leading-relaxed bg-amber-50/20"
                  />
                  <p className="text-[11px] text-slate-500">
                    टीप: PDF/Word फाईल निवडल्यास त्यातील मजकूर येथे आपोआप येईल. आपण येथे नवीन प्रश्न जोडू शकता किंवा दुरुस्त करू शकता.
                  </p>
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
                      <span>अपलोड होत आहे...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="size-4" />
                      <span>गृहपाठ अपलोड करा (Publish Homework)</span>
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
                    अपलोड केलेले गृहपाठ ({filteredItems.length})
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    या वर्गाच्या व विषयाच्या शिक्षकांना व विद्यार्थ्यांना दिसणारे गृहपाठ.
                  </p>
                </div>
                {/* Search */}
                <div className="relative w-full sm:w-64">
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
                  <h4 className="text-base font-bold text-slate-800">कोणताही गृहपाठ अपलोड केलेला नाही</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {currentMediumObj?.labelMr} • {currentClassObj?.mr} • {selectedSubject} विषयासाठी वरील फॉर्ममधून पहिला गृहपाठ अपलोड करा.
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
                          <h4 className="font-black text-base text-slate-900 leading-snug">
                            {item.title}
                          </h4>
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
                            <Clock className="size-3" /> {new Date(item.uploadedAt).toLocaleDateString("mr-IN")}
                          </span>
                        </div>
                      </div>

                      {/* File attachment preview & action */}
                      {item.fileUrl && (
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 truncate">
                            <FileText className="size-4 text-amber-600 shrink-0" />
                            <span className="truncate">{item.fileName || "गृहपाठ फाईल"}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <a
                              href={item.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold transition-all"
                            >
                              <Eye className="size-3.5" /> पहा
                            </a>
                            <a
                              href={item.fileUrl}
                              download={item.fileName || "homework.pdf"}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
                            >
                              <Download className="size-3.5" />
                            </a>
                          </div>
                        </div>
                      )}
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
