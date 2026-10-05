import React, { useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import type { MCQHomeworkSet, MCQQuestion } from "@/types/mcqHomework";
import { createMCQHomework } from "@/services/mcqHomeworkService";

interface MCQCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newQuizId: string) => void;
  defaultRole?: "admin" | "teacher" | "user";
  defaultClass?: string;
  defaultSubject?: string;
  userName?: string;
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

const SAMPLE_PRESETS: Record<string, Omit<MCQQuestion, "id">[]> = {
  मराठी: [
    {
      question: "खालीलपैकी 'सूर्य' या शब्दाचा समानार्थी शब्द कोणता आहे?",
      options: ["दिनकर", "चंद्र", "वारू", "पय"],
      correctIndex: 0,
      explanation: "दिनकर, भास्कर, रवी हे सूर्याचे समानार्थी शब्द आहेत.",
      marks: 1,
    },
    {
      question: "मराठी वर्णमालेत एकूण किती मुख्य स्वर आहेत?",
      options: ["१०", "१२", "१४", "१६"],
      correctIndex: 2,
      explanation: "मराठीत आता इंग्रजीतील ॲ आणि ऑ मिळून १४ स्वर मानले जातात.",
      marks: 1,
    },
  ],
  गणित: [
    {
      question: "२५ × ४ चे उत्तर किती येईल?",
      options: ["८०", "९०", "१००", "१२०"],
      correctIndex: 2,
      explanation: "२५ ला ४ ने गुणल्यास १०० येते.",
      marks: 1,
    },
    {
      question: "सर्वात लहान मूळ संख्या (Prime Number) कोणती आहे?",
      options: ["०", "१", "२", "३"],
      correctIndex: 2,
      explanation: "२ ही एकमेव सम आणि सर्वात लहान मूळ संख्या आहे.",
      marks: 1,
    },
  ],
  इंग्रजी: [
    {
      question: "What is the plural of 'Child'?",
      options: ["Childs", "Children", "Childrens", "Childes"],
      correctIndex: 1,
      explanation: "'Children' is the correct irregular plural form of 'child'.",
      marks: 1,
    },
  ],
  विज्ञान: [
    {
      question: "प्रकाश संश्लेषणासाठी वनस्पतींना खालीलपैकी कशाची आवश्यकता असते?",
      options: ["सूर्यप्रकाश", "पाणी", "कार्बन डायऑक्साइड", "वरील सर्व"],
      correctIndex: 3,
      explanation: "प्रकाश संश्लेषणासाठी सूर्यप्रकाश, पाणी आणि CO2 या तिन्हींची गरज असते.",
      marks: 1,
    },
  ],
};

export const MCQCreatorModal: React.FC<MCQCreatorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultRole = "admin",
  defaultClass = "1st",
  defaultSubject = "मराठी",
  userName = "शिक्षक",
}) => {
  const isCustom = defaultRole === "user";

  const [title, setTitle] = useState(
    isCustom ? "माझी सराव प्रश्नमंजुषा" : `दैनिक MCQ स्वाध्याय - ${defaultSubject}`
  );
  const [classId, setClassId] = useState(defaultClass);
  const [subject, setSubject] = useState(defaultSubject);
  const [medium, setMedium] = useState<"marathi" | "semi">("marathi");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [instructions, setInstructions] = useState(
    "सर्व प्रश्न सोडवणे अनिवार्य आहे. अचूक पर्यायावर क्लिक करा."
  );
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(0);

  const [questions, setQuestions] = useState<MCQQuestion[]>([
    {
      id: "q_1",
      question: "",
      options: ["", "", "", ""],
      correctIndex: 0,
      explanation: "",
      marks: 1,
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [createdQuizId, setCreatedQuizId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  // Add question
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

  // Load sample questions
  const handleLoadSample = (subjKey: string) => {
    const samples = SAMPLE_PRESETS[subjKey] || SAMPLE_PRESETS["मराठी"];
    const mapped: MCQQuestion[] = samples.map((s, i) => ({
      ...s,
      id: `q_sample_${Date.now()}_${i + 1}`,
    }));
    setQuestions(mapped);
    setTitle(`दैनिक MCQ स्वाध्याय - ${subjKey}`);
    toast.success(`${subjKey} चे नमुना प्रश्न लोड झाले!`);
  };

  // Save to Firebase backend
  const handleSaveQuiz = async () => {
    if (!title.trim()) {
      toast.error("कृपया स्वाध्यायाचे शीर्षक लिहा.");
      return;
    }

    // Validation
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
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
        title: title.trim(),
        classId,
        subject,
        medium,
        date,
        instructions: instructions.trim(),
        timeLimitMinutes: Number(timeLimitMinutes) || 0,
        questions,
        totalMarks: questions.reduce((sum, q) => sum + (q.marks || 1), 0),
        createdBy: {
          name: userName || (isCustom ? "विद्यार्थी" : "शिक्षक"),
          role: defaultRole,
        },
        isCustom,
      });

      setCreatedQuizId(newId);
      toast.success("MCQ स्वाध्याय यशस्वीपणे तयार झाला आणि सेव्ह झाला!");
      if (onSuccess) onSuccess(newId);
    } catch (err: any) {
      console.error("Error creating MCQ:", err);
      toast.error("स्वाध्याय सेव्ह करताना त्रुटी आली: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const shareableUrl = createdQuizId
    ? `${window.location.origin}/mcq?id=${createdQuizId}`
    : "";

  const handleCopyLink = async () => {
    if (!shareableUrl) return;
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setCopiedLink(true);
      toast.success("लिंक क्लिपबोर्डवर कॉपी झाली!");
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error("कृपया लिंक मॅन्युअली कॉपी करा.");
    }
  };

  const handleShareWhatsApp = () => {
    const text = `🎯 *नवीन MCQ स्वाध्याय सोडवा!* 📚\nविषय: ${subject} (${classId})\nशीर्षक: ${title}\n👉 विनामूल्य सोडवण्यासाठी येथे क्लिक करा (लॉगिनची गरज नाही):\n${shareableUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
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
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <FileQuestion className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {isCustom ? "स्वतःचा MCQ स्वाध्याय तयार करा" : "नवीन दैनिक MCQ स्वाध्याय तयार करा"}
              </h2>
              <p className="text-xs text-slate-500">
                प्रत्येक प्रश्नाचे ४ पर्याय व १ अचूक उत्तर निवडून पेपर तयार करा.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 shrink-0"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? "कॉपी झाले" : "कॉपी करा"}</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                <button
                  onClick={handleShareWhatsApp}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-2 shadow-md"
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
              </div>
            </div>
          ) : (
            <>
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
                        if (!isCustom) {
                          setTitle(`दैनिक MCQ स्वाध्याय - ${newSub}`);
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

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    स्वाध्याय शीर्षक (Title) *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="उदा. दैनिक MCQ स्वाध्याय - मराठी (धडा १)"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Quick Sample Presets */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs font-semibold text-slate-500">
                    त्वरित नमुना भरा:
                  </span>
                  {["मराठी", "गणित", "इंग्रजी", "विज्ञान"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleLoadSample(s)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors"
                    >
                      + {s} चे नमुना प्रश्न
                    </button>
                  ))}
                </div>
              </div>

              {/* Questions Builder */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    प्रश्न यादी ({questions.length} प्रश्न)
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ नवीन प्रश्न जोडा</span>
                  </button>
                </div>

                {questions.map((q, qIdx) => (
                  <div
                    key={q.id || qIdx}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs"
                  >
                    {/* Question Header & Remove */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                        प्रश्न क्र. {qIdx + 1}
                      </span>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(qIdx)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
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

                {/* Add Another Question Button */}
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 text-indigo-600 dark:text-indigo-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ आणखी एक प्रश्न जोडा (Add Question)</span>
                </button>
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
                className="px-4 py-2 text-sm rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                रद्द करा
              </button>
              <button
                type="button"
                onClick={handleSaveQuiz}
                disabled={saving}
                className="px-6 py-2.5 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>सेव्ह करत आहे...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>स्वाध्याय सेव्ह करा व लिंक तयार करा</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
