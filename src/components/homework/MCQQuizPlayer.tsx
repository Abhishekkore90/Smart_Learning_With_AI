import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Share2,
  Download,
  RotateCcw,
  Sparkles,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Printer,
  Copy,
  Check,
  AlertTriangle,
  GraduationCap,
  Calendar,
  Layers,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { MCQHomeworkSet, LocalMCQSubmission } from "@/types/mcqHomework";
import {
  saveLocalAnswers,
  getLocalAnswers,
  saveLocalSubmission,
  getLocalSubmission,
  clearLocalQuizData,
} from "@/services/mcqHomeworkService";
import { MCQPrintDocument } from "./MCQPrintDocument";

interface MCQQuizPlayerProps {
  quiz: MCQHomeworkSet;
  studentName?: string;
  onBack?: () => void;
  showBackBtn?: boolean;
}

const OPTION_LETTERS = ["A", "B", "C", "D"];

export const MCQQuizPlayer: React.FC<MCQQuizPlayerProps> = ({
  quiz,
  studentName = "विद्यार्थी",
  onBack,
  showBackBtn = true,
}) => {
  // Load answers and submission strictly from local sessionStorage (zero backend storage)
  const [answers, setAnswers] = useState<Record<string, number>>(() =>
    getLocalAnswers(quiz.id)
  );
  const [submission, setSubmission] = useState<LocalMCQSubmission | null>(() =>
    getLocalSubmission(quiz.id)
  );

  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [viewMode, setViewMode] = useState<"step" | "all">("all");
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(() => {
    return quiz.timeLimitMinutes && quiz.timeLimitMinutes > 0
      ? quiz.timeLimitMinutes * 60
      : null;
  });

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Timer countdown if specified
  useEffect(() => {
    if (submission || timeRemaining === null || timeRemaining <= 0) return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeRemaining, submission]);

  // Sync answers with sessionStorage on every pick
  const handleSelectOption = (questionId: string, optionIdx: number) => {
    if (submission) return; // Locked once submitted
    const updated = { ...answers, [questionId]: optionIdx };
    setAnswers(updated);
    saveLocalAnswers(quiz.id, updated);
  };

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = quiz.questions.length;
  const progressPercent = Math.round((answeredCount / (totalQuestions || 1)) * 100);

  // Submit test and compute result locally
  const handleSubmitQuiz = () => {
    setIsSubmitting(true);
    let score = 0;
    quiz.questions.forEach((q) => {
      const selected = answers[q.id];
      if (typeof selected === "number" && selected === q.correctIndex) {
        score += q.marks || 1;
      }
    });

    const totalMarks = quiz.totalMarks || totalQuestions;
    const percentage = Math.round((score / (totalMarks || 1)) * 100);

    const sub: LocalMCQSubmission = {
      quizId: quiz.id,
      answers,
      submittedAt: new Date().toISOString(),
      score,
      totalMarks,
      percentage,
    };

    saveLocalSubmission(sub);
    setSubmission(sub);
    setIsSubmitting(false);
    setShowConfirmModal(false);
    toast.success("स्वाध्याय यशस्वीपणे सबमिट झाला! तुमचा निकाल खाली पहा.");
  };

  // Reset local state to practice again
  const handleResetQuiz = () => {
    if (window.confirm("तुम्हाला ही चाचणी पुन्हा नव्याने सोडवायची आहे का? आधीचे पर्याय मिटवले जातील.")) {
      clearLocalQuizData(quiz.id);
      setAnswers({});
      setSubmission(null);
      setActiveQuestionIdx(0);
      toast.info("चाचणी रीसेट केली. तुम्ही आता पुन्हा नवीन सराव करू शकता.");
    }
  };

  // Generate shareable link
  const shareableUrl = useMemo(() => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/mcq?id=${quiz.id}`;
    }
    return "";
  }, [quiz.id]);

  const handleShareQuiz = async () => {
    const shareText = `🎯 *स्मार्ट लर्निंग दैनिक MCQ स्वाध्याय*\n📚 विषय: ${quiz.subject} (${quiz.classId})\n📝 शीर्षक: ${quiz.title}\n👉 खालील लिंकवर क्लिक करून विनामूल्य सोडवा (लॉगिनची गरज नाही):\n${shareableUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: quiz.title,
          text: shareText,
          url: shareableUrl,
        });
        return;
      } catch (e) {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedLink(true);
      toast.success("शेअरिंग लिंक क्लिपबोर्डवर कॉपी झाली!");
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error("कृपया ही लिंक मॅन्युअली कॉपी करा: " + shareableUrl);
    }
  };

  const handleShareResult = async () => {
    if (!submission) return;
    const badge =
      submission.percentage >= 80
        ? "🌟 उत्कृष्ट! (Grade A+)"
        : submission.percentage >= 50
        ? "👍 खूप छान!"
        : "💪 चांगला प्रयत्न!";

    const shareText = `🏆 *माझा स्मार्ट लर्निंग MCQ निकाल*\n📚 विषय: ${quiz.subject} (${quiz.classId})\n📝 चाचणी: ${quiz.title}\n🎯 मिळालेले गुण: ${submission.score} / ${submission.totalMarks} (${submission.percentage}%)\n🏅 शेरा: ${badge}\n\n👉 तुम्हीही ही चाचणी सोडवून बघा आणि तुमचे गुण तपासा:\n${shareableUrl}`;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `माझा MCQ निकाल - ${quiz.title}`,
          text: shareText,
          url: shareableUrl,
        });
        return;
      } catch (e) {
        // Fallback to whatsapp / clipboard
      }
    }

    window.open(whatsappUrl, "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto pb-16">
      {/* Hidden print area for clean PDF printing */}
      <div className="hidden print:block">
        <MCQPrintDocument quiz={quiz} submission={submission} studentName={studentName} />
      </div>

      {/* Main interactive screen (hidden when printing) */}
      <div className="print:hidden">
        {/* Top Navbar & Metadata Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 mb-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              {showBackBtn && onBack && (
                <button
                  onClick={onBack}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors"
                  title="मागे जा"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {quiz.subject}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    इयत्ता: {quiz.classId}
                  </span>
                  {quiz.isCustom && (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                      वापरकर्त्याने तयार केलेले
                    </span>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {quiz.title}
                </h1>
              </div>
            </div>

            {/* Actions: Share & Print */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleShareQuiz}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 transition-colors"
                title="चाचणी लिंक शेअर करा"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedLink ? "कॉपी झाले!" : "शेअर करा"}</span>
              </button>

              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded-xl transition-colors"
                title="PDF प्रिंट / डाउनलोड करा"
              >
                <Printer className="w-4 h-4" />
                <span>PDF डाउनलोड</span>
              </button>
            </div>
          </div>

          {/* Sub-bar: Instructions, Timer & Progress */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-slate-400" />
                तारीख: {quiz.date}
              </span>
              <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                <Award className="w-4 h-4 text-amber-500" />
                एकूण गुण: {quiz.totalMarks}
              </span>
            </div>

            {timeRemaining !== null && !submission && (
              <div className="flex items-center gap-1.5 font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-1 rounded-lg border border-amber-200 dark:border-amber-900/50">
                <Clock className="w-4 h-4 animate-pulse" />
                वेळ शिल्लक: {formatTimer(timeRemaining)}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {!submission && (
            <div className="mt-4">
              <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1">
                <span>प्रगती: {answeredCount} / {totalQuestions} प्रश्न सोडवले</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* RESULT HERO CARD (Shown if quiz is submitted) */}
        {submission && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white rounded-3xl p-6 sm:p-8 mb-8 shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-indigo-100 mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  स्वाध्याय निकाल (Quiz Result)
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {submission.percentage >= 80
                    ? "🎉 अभिनंदन! उत्कृष्ट कामगिरी!"
                    : submission.percentage >= 50
                    ? "👍 खूप छान! उत्तम प्रयत्न!"
                    : "💪 चांगला सराव! पुन्हा प्रयत्न करा!"}
                </h2>
                <p className="text-indigo-100 text-sm mt-1">
                  सर्व प्रश्न स्थानिक पातळीवर (Local Storage) तपासले गेले आहेत.
                </p>

                {/* Big Result Share Button */}
                <div className="flex flex-wrap items-center gap-3 mt-5">
                  <button
                    onClick={handleShareResult}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg transition-transform active:scale-95"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>WhatsApp वर निकाल शेअर करा</span>
                  </button>
                  <button
                    onClick={handleResetQuiz}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-xl font-semibold backdrop-blur-sm transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>पुन्हा सोडवा (Retake)</span>
                  </button>
                </div>
              </div>

              {/* Score Badge */}
              <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-5 text-center min-w-[160px] shrink-0">
                <span className="text-xs uppercase tracking-wider text-indigo-200 font-bold block">
                  मिळालेले गुण
                </span>
                <div className="text-4xl sm:text-5xl font-black mt-1">
                  {submission.score}
                  <span className="text-xl sm:text-2xl text-indigo-200 font-normal">
                    /{submission.totalMarks}
                  </span>
                </div>
                <div className="mt-2 inline-block bg-white text-indigo-900 font-bold px-3 py-1 rounded-full text-sm">
                  {submission.percentage}% गुण
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* QUESTIONS LIST */}
        <div className="space-y-6">
          {quiz.questions.map((q, idx) => {
            const selectedOpt = answers[q.id];
            const isAttempted = typeof selectedOpt === "number";
            const isCorrect = submission && isAttempted && selectedOpt === q.correctIndex;
            const isWrong = submission && isAttempted && selectedOpt !== q.correctIndex;

            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 sm:p-6 transition-all ${
                  submission
                    ? isCorrect
                      ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/20"
                      : isWrong
                      ? "border-rose-300 dark:border-rose-800 bg-rose-50/20 dark:bg-rose-950/20"
                      : "border-slate-200 dark:border-slate-800"
                    : isAttempted
                    ? "border-indigo-300 dark:border-indigo-800 shadow-sm"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                {/* Question Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-start gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-sm flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-snug pt-0.5">
                      {q.question}
                    </h3>
                  </div>

                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                    {q.marks || 1} गुण
                  </span>
                </div>

                {/* Options List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-0 sm:pl-10">
                  {q.options.map((optionText, optIdx) => {
                    const isSelected = selectedOpt === optIdx;
                    let optClass =
                      "border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800";

                    if (!submission && isSelected) {
                      optClass =
                        "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20";
                    }

                    if (submission) {
                      if (optIdx === q.correctIndex) {
                        optClass =
                          "border-emerald-500 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-semibold ring-2 ring-emerald-500/30";
                      } else if (isSelected && !isCorrect) {
                        optClass =
                          "border-rose-400 bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 font-semibold line-through ring-2 ring-rose-500/30";
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={Boolean(submission)}
                        onClick={() => handleSelectOption(q.id, optIdx)}
                        className={`w-full text-left p-3.5 rounded-xl border flex items-center gap-3 transition-all ${optClass}`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            submission && optIdx === q.correctIndex
                              ? "bg-emerald-600 text-white"
                              : submission && isSelected && !isCorrect
                              ? "bg-rose-600 text-white"
                              : isSelected
                              ? "bg-indigo-600 text-white"
                              : "bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {OPTION_LETTERS[optIdx]}
                        </span>
                        <span className="text-sm font-medium flex-1">{optionText}</span>

                        {submission && optIdx === q.correctIndex && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        )}
                        {submission && isSelected && !isCorrect && (
                          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation in Result Mode */}
                {submission && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-sm pl-0 sm:pl-10">
                    {isCorrect ? (
                      <div className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        बरोबर उत्तर! (+{q.marks || 1} गुण)
                      </div>
                    ) : (
                      <div className="text-rose-700 dark:text-rose-400 font-semibold flex items-center gap-1.5">
                        <XCircle className="w-4 h-4" />
                        योग्य उत्तर पर्याय ({OPTION_LETTERS[q.correctIndex]}) : {q.options[q.correctIndex]}
                      </div>
                    )}
                    {q.explanation && (
                      <p className="text-slate-600 dark:text-slate-400 mt-1 italic">
                        <strong>स्पष्टीकरण:</strong> {q.explanation}
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* BOTTOM SUBMISSION BAR */}
        {!submission ? (
          <div className="sticky bottom-4 mt-8 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <span className="font-bold text-slate-900 dark:text-white">{answeredCount}</span> पैकी{" "}
              <span className="font-bold text-slate-900 dark:text-white">{totalQuestions}</span> प्रश्न सोडवले.
              {answeredCount < totalQuestions && (
                <span className="text-amber-600 dark:text-amber-400 block sm:inline sm:ml-2">
                  (अजून {totalQuestions - answeredCount} प्रश्न बाकी आहेत)
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (answeredCount < totalQuestions) {
                    setShowConfirmModal(true);
                  } else {
                    handleSubmitQuiz();
                  }
                }}
                disabled={answeredCount === 0 || isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2 active:scale-95"
              >
                <span>स्वाध्याय सबमिट करा</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-8 text-center bg-slate-50 dark:bg-slate-850 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-slate-800 dark:text-white text-base">
              हा स्वाध्याय पूर्ण झाला आहे!
            </h4>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              आपले दिलेले सर्व पर्याय फक्त या ब्राउझरमध्ये तात्पुरते सेव्ह आहेत. पेज बंद केल्यावर ते आपोआप मिटवले जातील.
            </p>
            <div className="flex justify-center gap-3 mt-4">
              <button
                onClick={handleShareResult}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-2 shadow"
              >
                <Share2 className="w-4 h-4" />
                निकाल शेअर करा
              </button>
              <button
                onClick={handlePrint}
                className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white font-semibold text-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                गुणपत्रिका PDF डाउनलोड
              </button>
            </div>
          </div>
        )}

        {/* Unfinished warning modal */}
        <AnimatePresence>
          {showConfirmModal && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl"
              >
                <div className="flex items-center gap-3 text-amber-600 mb-3">
                  <AlertTriangle className="w-6 h-6" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    काही प्रश्न बाकी आहेत!
                  </h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  तुम्ही {totalQuestions} पैकी फक्त {answeredCount} प्रश्न सोडवले आहेत. बाकी{" "}
                  <strong>{totalQuestions - answeredCount}</strong> प्रश्नांची उत्तरे दिली नाहीत.
                  तरीही स्वाध्याय सबमिट करायचा आहे का?
                </p>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold"
                  >
                    परत जा व सोडवा
                  </button>
                  <button
                    onClick={handleSubmitQuiz}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow"
                  >
                    होय, सबमिट करा
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
