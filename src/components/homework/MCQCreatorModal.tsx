import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Calendar,
  Layers,
  Clock,
  Share2,
  Copy,
  Check,
  HelpCircle,
  Loader2,
  FileQuestion,
  ShieldCheck,
  FileText,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { auth } from "@/lib/firebase";
import type { MCQHomeworkSet, MCQQuestion } from "@/types/mcqHomework";
import { createMCQHomework } from "@/services/mcqHomeworkService";
import { MCQShareModal } from "./MCQShareModal";
import { parseMCQWordFile, parseMCQPastedText, type ParsedMCQResult } from "@/utils/mcqWordParser";

interface MCQCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newQuizId: string, isAdminMode?: boolean) => void;
  defaultRole?: "admin" | "teacher" | "user";
  defaultClass?: string;
  defaultSubject?: string;
  userName?: string;
  mode?: "admin" | "custom";
  defaultDate?: string;
  defaultMedium?: "marathi" | "semi";
}

const SUBJECT_OPTIONS = [
  { id: "मराठी", label: "मराठी (Marathi)", icon: "📖" },
  { id: "इंग्रजी", label: "इंग्रजी (English)", icon: "🔤" },
  { id: "गणित", label: "गणित (Mathematics)", icon: "🔢" },
  { id: "विज्ञान", label: "विज्ञान (Science)", icon: "🔬" },
  { id: "सामाजिक शास्त्रे", label: "सामाजिक शास्त्रे (इतिहास / भूगोल)", icon: "🌍" },
  { id: "सामान्य ज्ञान", label: "सामान्य ज्ञान (GK)", icon: "💡" },
  { id: "संगणक", label: "संगणक (Computer)", icon: "💻" },
];

const CLASS_OPTIONS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];


export const MCQCreatorModal: React.FC<MCQCreatorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultRole = "admin",
  defaultClass = "1st",
  defaultSubject = "मराठी",
  userName = "शिक्षक",
  mode,
  defaultDate,
  defaultMedium = "marathi",
}) => {
  const { user, profile } = useAuth();
  const [quizCategory, setQuizCategory] = useState<"admin" | "custom">(() => {
    if (mode) return mode;
    return defaultRole === "admin" ? "admin" : "custom";
  });
  const isAdminMode = quizCategory === "admin";
  const isCustom = !isAdminMode;

  const [title, setTitle] = useState(
    isAdminMode ? `दैनिक MCQ स्वाध्याय - ${defaultSubject}` : `माझी सराव प्रश्नमंजुषा - ${defaultSubject}`
  );
  const [classId, setClassId] = useState(defaultClass);
  const [subject, setSubject] = useState(defaultSubject);
  const [medium, setMedium] = useState<"marathi" | "semi">(defaultMedium);
  const [date, setDate] = useState(() => defaultDate || new Date().toISOString().split("T")[0]);
  const [instructions, setInstructions] = useState(
    "सर्व प्रश्न सोडवणे अनिवार्य आहे. अचूक पर्यायावर क्लिक करा."
  );
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(0);

  // Helper to generate blank question structures
  const createBlankQuestions = (count: number = 10, startIndex: number = 1): MCQQuestion[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `q_${Date.now()}_${startIndex + i}`,
      question: "",
      options: ["", "", "", ""],
      correctIndex: 0,
      explanation: "",
      marks: 1,
    }));
  };

  // Directly initialize with 10 blank question structures
  const [questions, setQuestions] = useState<MCQQuestion[]>(() =>
    createBlankQuestions(10)
  );

  const [saving, setSaving] = useState(false);
  const [createdQuizId, setCreatedQuizId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pastedContent, setPastedContent] = useState("");

  const handleImportPastedContent = () => {
    if (!pastedContent.trim()) {
      toast.error("कृपया मजकूर पेस्ट करा.");
      return;
    }
    try {
      const result = parseMCQPastedText(pastedContent);
      if (result.questions.length === 0) {
        toast.error("पेस्ट केलेल्या मजकुरात कोणतेही प्रश्न आढळले नाहीत. कृपया प्रश्नांचे फॉरमॅट 1) प्रश्न आणि (1) पर्याय तपासा.");
        return;
      }
      setParsedDocxData(result);
      setActiveImportSection("all");
      if (result.title) setTitle(result.title);
      if (result.detectedClass && CLASS_OPTIONS.includes(result.detectedClass)) setClassId(result.detectedClass);
      if (result.detectedMedium) setMedium(result.detectedMedium);
      setQuestions(result.questions);
      setIsPasteModalOpen(false);
      setPastedContent("");
      toast.success(`🎉 ${result.totalQuestions} प्रश्न, पर्याय आणि अचूक उत्तरांसह आयात झाले!`);
    } catch (err: any) {
      toast.error("मजकूर वाचताना त्रुटी: " + err.message);
    }
  };

  // Word (.docx) Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportingDocx, setIsImportingDocx] = useState(false);
  const [parsedDocxData, setParsedDocxData] = useState<ParsedMCQResult | null>(null);
  const [activeImportSection, setActiveImportSection] = useState<string>("all");

  const handleWordFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".docx")) {
      toast.error("कृपया वैध Word (.docx) फाईल निवडा.");
      return;
    }

    setIsImportingDocx(true);
    const toastId = toast.loading("Word फाईलमधून प्रश्न व उत्तरे वाचत आहे...");

    try {
      const result = await parseMCQWordFile(file);

      if (result.questions.length === 0) {
        toast.dismiss(toastId);
        toast.error(
          "या Word फाईलमध्ये कोणताही प्रश्न किंवा पर्याय आढळला नाही. कृपया प्रश्नांचे फॉरमॅट (1), (2), (3), (4) तपासा."
        );
        return;
      }

      setParsedDocxData(result);
      setActiveImportSection("all");

      // Auto-set title if detected
      if (result.title) {
        setTitle(result.title);
      }

      // Auto-set class if detected
      if (result.detectedClass && CLASS_OPTIONS.includes(result.detectedClass)) {
        setClassId(result.detectedClass);
      }

      // Auto-set medium if detected
      if (result.detectedMedium) {
        setMedium(result.detectedMedium);
      }

      // Populate questions
      setQuestions(result.questions);

      toast.dismiss(toastId);
      toast.success(
        `🎉 यशस्वी! Word फाईलमधून ${result.totalQuestions} प्रश्न, पर्याय आणि योग्य उत्तरांसह थेट आयात केले गेले!`
      );
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error("Word फाईल वाचताना त्रुटी आली: " + (err.message || "अनोळखी त्रुटी"));
    } finally {
      setIsImportingDocx(false);
      if (e.target) {
        e.target.value = "";
      }
    }
  };

  const handleSelectSection = (sectionKey: string) => {
    if (!parsedDocxData) return;
    setActiveImportSection(sectionKey);

    if (sectionKey === "all") {
      setQuestions(parsedDocxData.questions);
      toast.info(`सर्व विषयांचे एकूण ${parsedDocxData.totalQuestions} प्रश्न निवडले.`);
    } else {
      const secQs = parsedDocxData.sectionQuestions[sectionKey] || [];
      setQuestions(secQs);

      // Auto adjust subject if section matches standard subject names
      if (sectionKey.includes("मराठी")) setSubject("मराठी");
      else if (sectionKey.includes("गणित")) setSubject("गणित");
      else if (sectionKey.includes("इंग्रजी") || sectionKey.toLowerCase().includes("english")) setSubject("इंग्रजी");
      else if (sectionKey.includes("विज्ञान")) setSubject("विज्ञान");
      else if (sectionKey.includes("सामाजिक")) setSubject("सामाजिक शास्त्रे");
      else if (sectionKey.includes("बुद्धिमत्ता")) setSubject("सामान्य ज्ञान");

      toast.success(`'${sectionKey}' विभागाचे ${secQs.length} प्रश्न निवडले.`);
    }
  };

  if (!isOpen) return null;

  // Add 1 question directly
  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q_${Date.now()}_${prev.length + 1}`,
        question: "",
        options: ["", "", "", ""],
        correctIndex: 0,
        explanation: "",
        marks: 1,
      },
    ]);
  };

  // Add multiple questions directly (e.g. +5)
  const handleAddMultipleQuestions = (count: number = 5) => {
    setQuestions((prev) => [
      ...prev,
      ...createBlankQuestions(count, prev.length + 1),
    ]);
    toast.success(`नवीन ${count} रिकामे प्रश्न जोडले गेले!`);
  };

  // Remove question
  const handleRemoveQuestion = (idx: number) => {
    if (questions.length <= 1) {
      toast.error("किमान एक प्रश्न असणे आवश्यक आहे.");
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  // Update question text
  const handleQuestionTextChange = (idx: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], question: text };
      return copy;
    });
  };

  // Update option text
  const handleOptionTextChange = (qIdx: number, optIdx: number, val: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const newOpts = [...copy[qIdx].options];
      newOpts[optIdx] = val;
      copy[qIdx] = { ...copy[qIdx], options: newOpts };
      return copy;
    });
  };

  // Set correct option
  const handleSetCorrectOption = (qIdx: number, optIdx: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIdx] = { ...copy[qIdx], correctIndex: optIdx };
      return copy;
    });
  };

  // Update explanation
  const handleExplanationChange = (qIdx: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIdx] = { ...copy[qIdx], explanation: text };
      return copy;
    });
  };



  // Save to Firebase backend
  const handleSaveQuiz = async () => {
    const finalTitle =
      title?.trim() ||
      (isAdminMode
        ? `दैनिक MCQ स्वाध्याय - ${subject} (इयत्ता ${classId})`
        : `सराव प्रश्नमंजुषा - ${subject} (इयत्ता ${classId})`);

    // Filter out questions that were left completely untouched from the 10 blank slots
    const isBlank = (q: MCQQuestion) =>
      !q.question.trim() && q.options.every((opt) => !opt.trim());
    const questionsToSave = questions.filter((q) => !isBlank(q));

    if (questionsToSave.length === 0) {
      toast.error("कृपया किमान एका प्रश्नाचा मजकूर व पर्याय भरा.");
      return;
    }

    // Validation for questions that have content
    for (let i = 0; i < questionsToSave.length; i++) {
      const q = questionsToSave[i];
      if (!q.question.trim()) {
        toast.error(`प्रश्न क्र. ${i + 1} चा मजकूर रिकामा आहे.`);
        return;
      }
      for (let o = 0; o < q.options.length; o++) {
        if (!q.options[o].trim()) {
          toast.error(`प्रश्न क्र. ${i + 1} चा पर्याय ${o + 1} रिकामा आहे.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const newId = await createMCQHomework({
        title: finalTitle,
        classId,
        subject,
        medium,
        date,
        instructions: instructions.trim(),
        timeLimitMinutes: Number(timeLimitMinutes) || 0,
        questions: questionsToSave,
        totalMarks: questionsToSave.reduce((sum, q) => sum + (q.marks || 1), 0),
        teacherName:
          (typeof window !== "undefined" && (localStorage.getItem("mcq_share_teacher_name") || localStorage.getItem("hw_v2_teacher"))) ||
          userName ||
          "",
        schoolName:
          (typeof window !== "undefined" && (localStorage.getItem("mcq_share_school_name") || localStorage.getItem("hw_v2_school"))) ||
          "",
        createdBy: {
          uid: user?.uid || auth?.currentUser?.uid || "",
          name:
            userName ||
            profile?.fullName ||
            user?.displayName ||
            (isAdminMode
              ? "सुपर ॲडमिन"
              : defaultRole === "teacher"
              ? "शिक्षक"
              : "विद्यार्थी"),
          role: isAdminMode
            ? "admin"
            : defaultRole === "teacher"
            ? "teacher"
            : "user",
        },
        isCustom: !isAdminMode,
      });

      setCreatedQuizId(newId);
      toast.success(
        isAdminMode
          ? "ॲडमिन अधिकृत MCQ स्वाध्याय यशस्वीपणे तयार झाला आणि प्रकाशित झाला!"
          : "MCQ स्वाध्याय यशस्वीपणे तयार झाला आणि सेव्ह झाला!"
      );
      if (onSuccess) onSuccess(newId, isAdminMode);
    } catch (err: any) {
      console.error("Error creating MCQ:", err);
      toast.error("स्वाध्याय सेव्ह करताना त्रुटी आली: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const shareableUrl = createdQuizId
    ? `${window.location.origin}/mcq?id=${createdQuizId}`
    : "";

  const handleCopyLink = async () => {
    setIsShareModalOpen(true);
  };

  const handleShareWhatsApp = () => {
    setIsShareModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                isAdminMode
                  ? "bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400"
                  : "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
              }`}
            >
              <FileQuestion className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  {isAdminMode
                    ? "ॲडमिन MCQ स्वाध्याय जोडा / अपलोड करा"
                    : "स्वतःचा MCQ स्वाध्याय तयार करा"}
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isAdminMode
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  }`}
                >
                  {isAdminMode ? "ॲडमिन अधिकृत" : "कस्टम स्वाध्याय"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAdminMode
                  ? "अधिकृत दैनिक बहुपर्यायी प्रश्न (MCQ) संच तयार करा व सर्व विद्यार्थ्यांसाठी प्रकाशित करा."
                  : "प्रत्येक प्रश्नाचे ४ पर्याय व १ अचूक उत्तर निवडून स्वतःचा पेपर तयार करा."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* SUCCESS MODAL OVERLAY IF CREATED */}
          {createdQuizId ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-3xl p-6 sm:p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                🎉 स्वाध्याय यशस्वीपणे तयार झाला!
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                हा स्वाध्याय आता सर्व युजर्ससाठी उपलब्ध आहे. कोणालाही ही लिंक पाठवा, ते
                <strong> कोणत्याही लॉगिनशिवाय</strong> थेट चाचणी सोडवू शकतील!
              </p>

              {/* Shareable Link Box */}
              <div className="flex items-center gap-2 max-w-lg mx-auto bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800">
                <input
                  type="text"
                  readOnly
                  value={shareableUrl}
                  className="flex-1 bg-transparent px-3 text-xs sm:text-sm text-slate-700 dark:text-slate-200 outline-none select-all"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? "कॉपी झाले" : "कॉपी करा"}</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                <button
                  onClick={handleShareWhatsApp}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>WhatsApp वर शेअर करा</span>
                </button>
                <a
                  href={`/mcq?id=${createdQuizId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm flex items-center gap-2"
                >
                  <span>आताच चाचणी उघडा 🚀</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setCreatedQuizId(null);
                    setTitle(
                      isAdminMode
                        ? `दैनिक MCQ स्वाध्याय - ${subject}`
                        : `माझी सराव प्रश्नमंजुषा - ${subject}`
                    );
                    setQuestions(createBlankQuestions(10));
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-all cursor-pointer"
                >
                  + आणखी एक नवीन स्वाध्याय जोडा
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Category Selector (Admin only) */}
              {defaultRole === "admin" && (
                <div className="bg-gradient-to-r from-amber-50 to-indigo-50 dark:from-slate-800/80 dark:to-slate-800/80 p-3.5 sm:p-4 rounded-2xl border border-amber-200/80 dark:border-slate-700 space-y-2.5">
                  <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="size-4 text-amber-600 dark:text-amber-400" />
                      <span>स्वाध्याय प्रकार (Publishing Section):</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">हा प्रश्न कोठे दिसावा ते निवडा</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setQuizCategory("admin");
                        if (title.startsWith("माझी सराव")) {
                          setTitle(`दैनिक MCQ स्वाध्याय - ${subject}`);
                        }
                      }}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        quizCategory === "admin"
                          ? "bg-amber-400 text-amber-950 border-amber-500 font-black shadow-md ring-2 ring-amber-300"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <ShieldCheck className={`size-5 shrink-0 mt-0.5 ${quizCategory === "admin" ? "text-amber-950" : "text-amber-600"}`} />
                      <div>
                        <div className="text-xs font-bold leading-tight">१. ॲडमिन अधिकृत स्वाध्याय (Admin Section)</div>
                        <div className={`text-[10px] mt-0.5 ${quizCategory === "admin" ? "text-amber-900 font-semibold" : "text-slate-400"}`}>
                          सर्व विद्यार्थ्यांसाठी मुख्य ॲडमिन टॅबमध्ये दिसेल
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setQuizCategory("custom");
                        if (title.startsWith("दैनिक MCQ स्वाध्याय")) {
                          setTitle(`माझी सराव प्रश्नमंजुषा - ${subject}`);
                        }
                      }}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        quizCategory === "custom"
                          ? "bg-purple-600 text-white border-purple-700 font-black shadow-md ring-2 ring-purple-300"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Sparkles className={`size-5 shrink-0 mt-0.5 ${quizCategory === "custom" ? "text-amber-300" : "text-purple-600"}`} />
                      <div>
                        <div className="text-xs font-bold leading-tight">२. कस्टम स्वाध्याय (Custom Section)</div>
                        <div className={`text-[10px] mt-0.5 ${quizCategory === "custom" ? "text-purple-100 font-semibold" : "text-slate-400"}`}>
                          कस्टम स्वाध्याय टॅबमध्ये दिसेल
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Basic Meta Settings */}
              <div className="bg-slate-50 dark:bg-slate-850 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Subject Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      विषय निवडा (Subject) *
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => {
                        const newSub = e.target.value;
                        setSubject(newSub);
                        if (isAdminMode) {
                          setTitle(`दैनिक MCQ स्वाध्याय - ${newSub}`);
                        } else {
                          setTitle(`माझी सराव प्रश्नमंजुषा - ${newSub}`);
                        }
                      }}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      {SUBJECT_OPTIONS.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.icon} {sub.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Class / Standard */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      इयत्ता (Class) *
                    </label>
                    <select
                      value={classId}
                      onChange={(e) => setClassId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      {CLASS_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          इयत्ता {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date (for daily schedule) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      तारीख (Date) *
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

              </div>

              {/* Word (.docx) Auto-Import Banner */}
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-800 dark:to-indigo-950/40 p-4 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="size-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <FileText className="size-6" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                      <span>Word (.docx) फाईलवरून प्रश्न आपोआप भरा</span>
                      <span className="bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shadow-2xs">
                        Auto-Fetch
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      तुमच्या Word फाईलमधील प्रश्न, ४ पर्याय आणि उत्तरसूचीतील उत्तरे एका क्लिकवर थेट भरली जातात.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsPasteModalOpen(true)}
                    className="px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
                    title="Word किंवा WhatsApp वरील प्रश्न व उत्तरपत्रिका थेट कॉपी-पेस्ट करा"
                  >
                    <Copy className="size-4" />
                    <span>मजकूर पेस्ट करा</span>
                  </button>

                  <button
                    type="button"
                    disabled={isImportingDocx}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs sm:text-sm font-black rounded-xl flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-60 shrink-0"
                  >
                    {isImportingDocx ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    <span>{isImportingDocx ? "वाचत आहे..." : "Word फाईल निवडा (.docx)"}</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={handleWordFileUpload}
                  />
                </div>
              </div>

              {/* If Parsed Document has multiple subjects/sections */}
              {parsedDocxData && parsedDocxData.sections.length > 1 && (
                <div className="bg-amber-50/90 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-black text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-amber-600" />
                      <span>या फाईलमध्ये {parsedDocxData.sections.length} विषय आढळले आहेत. कोणता भाग भरायचा आहे?</span>
                    </span>
                    <span className="text-[11px] text-amber-800/80 dark:text-amber-300 font-bold">
                      एकूण {parsedDocxData.totalQuestions} प्रश्न
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <button
                      type="button"
                      onClick={() => handleSelectSection("all")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        activeImportSection === "all"
                          ? "bg-amber-600 text-white shadow-xs scale-102"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      सर्व विषय एकत्रित ({parsedDocxData.totalQuestions} प्रश्न)
                    </button>
                    {parsedDocxData.sections.map((sec) => {
                      const count = parsedDocxData.sectionQuestions[sec]?.length || 0;
                      return (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => handleSelectSection(sec)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            activeImportSection === sec
                              ? "bg-purple-600 text-white shadow-xs scale-102"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {sec} ({count} प्रश्न)
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Questions Builder */}
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      प्रश्न यादी ({questions.length} प्रश्न)
                    </h3>
                    <p className="text-xs text-slate-500">
                      १० रिकामे प्रश्न थेट उपलब्ध आहेत. खाली प्रश्न व पर्याय टाईप करा.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddMultipleQuestions(5)}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                      title="एकाच वेळी आणखी ५ रिकामे प्रश्न जोडा"
                    >
                      + ५ प्रश्न
                    </button>
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold shadow transition-all cursor-pointer active:scale-95 ${
                        isAdminMode
                          ? "bg-orange-600 hover:bg-orange-700"
                          : "bg-indigo-600 hover:bg-indigo-700"
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ नवीन प्रश्न जोडा</span>
                    </button>
                  </div>
                </div>

                {questions.map((q, qIdx) => (
                  <div
                    key={q.id || qIdx}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs"
                  >
                    {/* Question Header & Remove */}
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                          isAdminMode
                            ? "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800"
                            : "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800"
                        }`}
                      >
                        प्रश्न क्र. {qIdx + 1}
                      </span>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(qIdx)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="हा प्रश्न हटवा"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Question Text */}
                    <div>
                      <input
                        type="text"
                        value={q.question}
                        onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                        placeholder={`प्रश्न क्र. ${qIdx + 1} येथे टाईप करा...`}
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-slate-900 dark:text-white"
                      />
                    </div>

                    {/* 4 Options Grid with Correct Answer Picker */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                        ४ पर्याय भरा आणि अचूक उत्तराच्या रेडिओ बटणावर (⚪/🟢) टिक करा:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = q.correctIndex === optIdx;
                          const letters = ["A", "B", "C", "D"];

                          return (
                            <div
                              key={optIdx}
                              className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                                isCorrect
                                  ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 ring-1 ring-emerald-500"
                                  : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleSetCorrectOption(qIdx, optIdx)}
                                className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 transition-colors ${
                                  isCorrect
                                    ? "bg-emerald-600 text-white"
                                    : "bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-emerald-400"
                                }`}
                                title="या पर्यायाला अचूक उत्तर म्हणून निवडा"
                              >
                                {isCorrect ? "✓" : letters[optIdx]}
                              </button>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) =>
                                  handleOptionTextChange(qIdx, optIdx, e.target.value)
                                }
                                placeholder={`पर्याय ${letters[optIdx]}...`}
                                className="flex-1 bg-transparent px-2 py-1 text-sm text-slate-800 dark:text-slate-200 outline-none"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Explanation */}
                    <div>
                      <input
                        type="text"
                        value={q.explanation || ""}
                        onChange={(e) => handleExplanationChange(qIdx, e.target.value)}
                        placeholder="स्पष्टीकरण किंवा हिंट (पर्यायी - निकालावेळी दिसेल)"
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300"
                      />
                    </div>
                  </div>
                ))}

                {/* Add Another Question Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className={`flex-1 w-full py-3.5 rounded-2xl border-2 border-dashed font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isAdminMode
                        ? "border-orange-300 dark:border-orange-800 hover:border-orange-500 text-orange-600 dark:text-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-950/20"
                        : "border-indigo-300 dark:border-indigo-800 hover:border-indigo-500 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20"
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ आणखी एक प्रश्न जोडा (Add Question)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddMultipleQuestions(5)}
                    className="w-full sm:w-auto py-3.5 px-5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 text-slate-600 dark:text-slate-300 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ ५ प्रश्न जोडा (+5)</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!createdQuizId && (
          <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850">
            <div className="text-xs text-slate-500">
              एकूण <strong>{questions.length}</strong> प्रश्न • एकूण{" "}
              <strong>{questions.length}</strong> गुण
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                रद्द करा
              </button>
              <button
                type="button"
                onClick={handleSaveQuiz}
                disabled={saving}
                className={`px-6 py-2.5 text-sm rounded-xl text-white font-bold shadow-lg flex items-center gap-2 disabled:opacity-50 cursor-pointer transition-all ${
                  isAdminMode
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>सेव्ह करत आहे...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {isAdminMode
                        ? "ॲडमिन स्वाध्याय प्रकाशित करा"
                        : "स्वाध्याय सेव्ह करा व लिंक तयार करा"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Share Modal */}
      {createdQuizId && (
        <MCQShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          quiz={{
            id: createdQuizId,
            title: title || "MCQ स्वाध्याय",
            subject,
            classId,
          }}
        />
      )}

      {/* Direct Paste Modal */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="size-5 text-indigo-600" />
                <h4 className="font-black text-slate-900 dark:text-white text-base">
                  प्रश्न व उत्तरपत्रिका थेट पेस्ट करा (Paste MCQ Text)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
              Word किंवा WhatsApp वरून कॉपी केलेला प्रश्न व उत्तरसूचीचा मजकूर खाली पेस्ट करा. सिस्टीम सर्व प्रश्न, ४ पर्याय आणि योग्य उत्तरे आपोआप ओळखून भरेल:
            </p>

            <textarea
              rows={12}
              value={pastedContent}
              onChange={(e) => setPastedContent(e.target.value)}
              placeholder={`उदा.
1) 'सूर्य' या शब्दाचा समानार्थी शब्द कोणता?
(1) चंद्र  (2) रवी
(3) तारा  (4) शशी
उत्तर : (2) रवी

किंवा शेवटी उत्तरसूची तक्ता...`}
              className="w-full flex-1 p-3 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[220px]"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                रद्द करा
              </button>
              <button
                type="button"
                onClick={handleImportPastedContent}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md cursor-pointer transition-all active:scale-95"
              >
                प्रश्न तयार करा (Import Now) 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
