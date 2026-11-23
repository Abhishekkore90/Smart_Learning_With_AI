import React, { useState, useMemo, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Sparkles,
  Share2,
  Trash2,
  FileQuestion,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Award,
  Clock,
  ArrowRight,
  User,
  School,
  Edit3,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import type { MCQHomeworkSet } from "@/types/mcqHomework";
import { updateMCQHomework } from "@/services/mcqHomeworkService";
import { MCQShareModal } from "./MCQShareModal";
import { MCQCertificate } from "./MCQCertificate";

export interface MCQHomeworkCalendarProps {
  quizzes: MCQHomeworkSet[];
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  onTakeQuiz: (quizId: string) => void;
  defaultRole?: "admin" | "teacher" | "student" | "user";
  onDeleteQuiz?: (id: string, title: string) => void;
  userName?: string;
  selectedClass?: string;
  selectedMedium?: string;
}

const MARATHI_MONTHS = [
  "जानेवारी",
  "फेब्रुवारी",
  "मार्च",
  "एप्रिल",
  "मे",
  "जून",
  "जुलै",
  "ऑगस्ट",
  "सप्टेंबर",
  "ऑक्टोबर",
  "नोव्हेंबर",
  "डिसेंबर",
];

export function formatISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(str: string): Date {
  const parts = str.split(/[-/]/).map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    if (parts[0] > 1000) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
  }
  return new Date();
}

const normalizeDate = (dStr?: string): string => {
  if (!dStr) return "";
  const clean = dStr.trim().slice(0, 10);
  const parts = clean.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    } else {
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }
  return clean;
};

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

interface QuizSubmission {
  score: number;
  totalMarks: number;
  percentage: number;
  submittedAt: string;
}

export const MCQHomeworkCalendar: React.FC<MCQHomeworkCalendarProps> = ({
  quizzes,
  selectedDate,
  onSelectDate,
  onTakeQuiz,
  defaultRole = "student",
  onDeleteQuiz,
  userName = "शिक्षक",
  selectedClass,
  selectedMedium,
}) => {
  const [sharingQuiz, setSharingQuiz] = useState<MCQHomeworkSet | null>(null);
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [submissions, setSubmissions] = useState<Record<string, QuizSubmission>>({});

  // Student name state
  const [studentName, setStudentName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const s = localStorage.getItem("mcq_student_name");
      if (s && s.trim()) return s.trim();
    }
    return userName && userName !== "शिक्षक" && userName !== "शिक्षक / प्रशासन" ? userName : "विद्यार्थी";
  });

  const [schoolName, setSchoolName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const s = localStorage.getItem("mcq_share_school_name");
      if (s && s.trim()) return s.trim();
    }
    return "";
  });

  const todayStr = useMemo(() => formatISODate(new Date()), []);

  const activeDate = useMemo(() => {
    if (!selectedDate || selectedDate === "all") return todayStr;
    return normalizeDate(selectedDate);
  }, [selectedDate, todayStr]);

  // Filter quizzes strictly for that specific selected day
  const dayQuizzes = useMemo(() => {
    if (!selectedDate || selectedDate === "all") {
      const todayMatches = quizzes.filter((q) => q.date && normalizeDate(q.date) === todayStr);
      return todayMatches.length > 0 ? todayMatches : quizzes;
    }
    return quizzes.filter((q) => q.date && normalizeDate(q.date) === activeDate);
  }, [quizzes, selectedDate, activeDate, todayStr]);

  // Sync selectedQuizId with dayQuizzes list
  useEffect(() => {
    if (dayQuizzes.length > 0) {
      if (!selectedQuizId || !dayQuizzes.some((q) => q.id === selectedQuizId)) {
        setSelectedQuizId(dayQuizzes[0].id);
      }
    } else {
      setSelectedQuizId("");
    }
  }, [dayQuizzes, selectedQuizId]);

  const currentQuiz = useMemo(() => {
    if (!dayQuizzes.length) return null;
    return dayQuizzes.find((q) => q.id === selectedQuizId) || dayQuizzes[0];
  }, [dayQuizzes, selectedQuizId]);

  const currentIdx = dayQuizzes.findIndex((q) => q.id === currentQuiz?.id);
  const nextQuiz = currentIdx >= 0 && currentIdx < dayQuizzes.length - 1 ? dayQuizzes[currentIdx + 1] : null;

  const currentSubmission = currentQuiz ? submissions[currentQuiz.id] : null;
  const isSubmitted = Boolean(currentSubmission);

  // Option select handler
  const handleSelectOption = (questionId: string, optIdx: number) => {
    if (isSubmitted || !currentQuiz) return;
    const key = `${currentQuiz.id}_${questionId}`;
    setUserAnswers((prev) => ({
      ...prev,
      [key]: optIdx,
    }));
  };

  // Submit current test in-place
  const handleSubmitQuiz = () => {
    if (!currentQuiz) return;
    const qList = currentQuiz.questions || [];
    if (qList.length === 0) {
      toast.error("या चाचणीत प्रश्न उपलब्ध नाहीत.");
      return;
    }

    const answeredCount = qList.filter(
      (q) => typeof userAnswers[`${currentQuiz.id}_${q.id}`] === "number"
    ).length;

    if (answeredCount < qList.length) {
      const remaining = qList.length - answeredCount;
      if (
        !window.confirm(
          `आपण ${answeredCount} / ${qList.length} प्रश्न सोडवले आहेत. अजून ${remaining} प्रश्न बाकी आहेत. तरीही स्वाध्याय सबमिट करायचा आहे का?`
        )
      ) {
        return;
      }
    }

    let score = 0;
    qList.forEach((q) => {
      const picked = userAnswers[`${currentQuiz.id}_${q.id}`];
      if (typeof picked === "number" && picked === q.correctIndex) {
        score += q.marks || 1;
      }
    });

    const total = currentQuiz.totalMarks || qList.length || 1;
    const percentage = Math.round((score / total) * 100);

    setSubmissions((prev) => ({
      ...prev,
      [currentQuiz.id]: {
        score,
        totalMarks: total,
        percentage,
        submittedAt: new Date().toISOString(),
      },
    }));

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // Confetti fallback
    }

    toast.success(`🎉 चाचणी सबमिट झाली! निकाल व प्रमाणपत्र खाली उपलब्ध आहे.`);
  };

  // Reset / Retake current quiz
  const handleResetQuiz = () => {
    if (!currentQuiz) return;
    setUserAnswers((prev) => {
      const next = { ...prev };
      currentQuiz.questions?.forEach((q) => {
        delete next[`${currentQuiz.id}_${q.id}`];
      });
      return next;
    });
    setSubmissions((prev) => {
      const next = { ...prev };
      delete next[currentQuiz.id];
      return next;
    });
    toast.info("चाचणी पुन्हा सोडवण्यासाठी रीसेट करण्यात आली.");
  };

  const handleToggleAdminStatus = async (quiz: MCQHomeworkSet) => {
    const isCurrentlyAdmin = !quiz.isCustom || quiz.createdBy?.role === "admin";
    const targetStatus = !isCurrentlyAdmin;
    const confirmMsg = targetStatus
      ? `"${quiz.title}" हा प्रश्न संच 'ॲडमिन अधिकृत' विभागात हलवायचा आहे का?`
      : `"${quiz.title}" हा प्रश्न संच 'कस्टम' विभागात हलवायचा आहे का?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await updateMCQHomework(quiz.id, {
        isCustom: !targetStatus,
        createdBy: {
          ...quiz.createdBy,
          role: targetStatus ? "admin" : "user",
          name: quiz.createdBy?.name || (targetStatus ? "सुपर ॲडमिन" : "शिक्षक"),
        },
      });
      toast.success(
        targetStatus
          ? "स्वाध्याय यशस्वीपणे ॲडमिन विभागात हलवला गेला!"
          : "स्वाध्याय कस्टम विभागात हलवला गेला!"
      );
    } catch (err: any) {
      toast.error("बदल करताना त्रुटी आली: " + (err.message || ""));
    }
  };

  const currentAnsweredCount = useMemo(() => {
    if (!currentQuiz?.questions) return 0;
    return currentQuiz.questions.filter(
      (q) => typeof userAnswers[`${currentQuiz.id}_${q.id}`] === "number"
    ).length;
  }, [currentQuiz, userAnswers]);

  return (
    <div className="w-full space-y-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col space-y-5">
        {/* Top Header Bar for that specific selected day */}
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-2xs border bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-800">
                <FileQuestion className="size-3.5 text-purple-600 dark:text-purple-400" />
                <span>दैनिक MCQ स्वाध्याय</span>
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                दिनांक: {activeDate} • {dayQuizzes.length} स्वाध्याय उपलब्ध
              </span>
            </div>

            {/* Student Name Input */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-2xs">
              <User className="size-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                विद्यार्थी:
              </span>
              <input
                type="text"
                value={studentName}
                onChange={(e) => {
                  setStudentName(e.target.value);
                  if (typeof window !== "undefined") {
                    localStorage.setItem("mcq_student_name", e.target.value);
                  }
                }}
                placeholder="विद्यार्थ्याचे नाव"
                className="bg-transparent border-none outline-none font-black text-xs text-purple-700 dark:text-purple-300 w-32 sm:w-44"
                title="प्रमाणपत्रावर येणारे विद्यार्थ्याचे नाव"
              />
            </div>
          </div>

          {/* Test Select Tabs (Shown ONLY if multiple tests are uploaded on that same day) */}
          {dayQuizzes.length > 1 && (
            <div className="pt-2">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {dayQuizzes.map((qz, idx) => {
                  const isSelected = qz.id === currentQuiz?.id;
                  const sub = submissions[qz.id];
                  const isDone = Boolean(sub);

                  return (
                    <button
                      key={qz.id}
                      type="button"
                      onClick={() => setSelectedQuizId(qz.id)}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 shrink-0 border ${
                        isSelected
                          ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white border-transparent shadow-md scale-102 font-extrabold"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-300 hover:bg-purple-50/30"
                      }`}
                    >
                      <span>चाचणी {idx + 1}: {qz.title || qz.subject}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {qz.questions?.length || 0} प्रश्न
                      </span>
                      {isDone && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-black flex items-center gap-0.5">
                          <Check className="size-2.5" />
                          {sub.score}/{sub.totalMarks}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Content Section: Current Test with in-place Submit & Result */}
        {!currentQuiz ? (
          <div className="py-12 px-4 text-center bg-slate-50/70 dark:bg-slate-850/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
            <div className="size-14 rounded-2xl bg-purple-100/70 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto shadow-inner">
              <FileQuestion className="size-7" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-black text-slate-800 dark:text-slate-200">
                दिनांक {activeDate} साठी कोणताही स्वाध्याय उपलब्ध नाही
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                कृपया इतर तारीख निवडून त्या दिवसाचा स्वाध्याय पहा, किंवा ॲडमिन पॅनेलमधून या तारखेसाठी स्वाध्याय अपलोड करा.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active Test Header Card */}
            <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 dark:from-purple-950/40 dark:via-indigo-950/40 dark:to-pink-950/40 rounded-2xl p-4 sm:p-5 border border-purple-200/80 dark:border-purple-800/60 shadow-2xs space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-purple-600 text-white shadow-2xs">
                      {currentQuiz.subject}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      इयत्ता {currentQuiz.classId}
                    </span>
                    {currentQuiz.isCustom ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        कस्टम
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                        ॲडमिन
                      </span>
                    )}
                    {currentQuiz.date && (
                      <span className="text-[11px] font-semibold text-slate-500 bg-white/70 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        तारीख: {currentQuiz.date}
                      </span>
                    )}
                    <span className="text-xs text-slate-500 font-semibold">
                      {currentQuiz.createdBy?.name || "सुपर ॲडमिन"}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    {currentQuiz.title}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 font-bold flex-wrap pt-0.5">
                    <span className="flex items-center gap-1">
                      <FileQuestion className="size-3.5 text-purple-600" />
                      एकूण {currentQuiz.questions?.length || 0} प्रश्न
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Award className="size-3.5 text-amber-500" />
                      {currentQuiz.totalMarks || currentQuiz.questions?.length || 0} गुण
                    </span>
                    {currentQuiz.timeLimitMinutes ? (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5 text-indigo-500" />
                          {currentQuiz.timeLimitMinutes} मिनिटे
                        </span>
                      </>
                    ) : null}
                  </div>

                  {currentQuiz.instructions && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 italic pt-0.5">
                      सूचना: {currentQuiz.instructions}
                    </p>
                  )}
                </div>

                {/* Toolbar Buttons */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={() => setSharingQuiz(currentQuiz)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
                    title="स्वाध्याय लिंक WhatsApp वर शेअर करा"
                  >
                    <Share2 className="size-3.5" />
                    <span>शेअर करा</span>
                  </button>

                  {isSubmitted && (
                    <button
                      type="button"
                      onClick={handleResetQuiz}
                      className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
                      title="चाचणी पुन्हा सोडवण्यासाठी रीसेट करा"
                    >
                      <RotateCcw className="size-3.5" />
                      <span>पुन्हा सोडवा</span>
                    </button>
                  )}

                  {defaultRole === "admin" && (
                    <button
                      type="button"
                      onClick={() => handleToggleAdminStatus(currentQuiz)}
                      className="px-2.5 py-2 rounded-xl text-xs font-bold border border-purple-300 bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 transition-all cursor-pointer shadow-xs"
                      title="ॲडमिन / कस्टम विभाग बदला"
                    >
                      <ShieldCheck className="size-3.5 text-amber-600" />
                    </button>
                  )}

                  {(defaultRole === "admin" || (defaultRole === "teacher" && currentQuiz.isCustom)) && onDeleteQuiz && (
                    <button
                      type="button"
                      onClick={() => onDeleteQuiz(currentQuiz.id, currentQuiz.title)}
                      className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 transition-colors cursor-pointer"
                      title="स्वाध्याय हटवा"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* IN-PLACE RESULT HERO CARD (Shown if quiz is submitted) */}
            {isSubmitted && currentSubmission && (
              <div className="bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-700 text-white rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
                  <div className="space-y-1 text-center sm:text-left">
                    <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider text-amber-200 mb-1">
                      <Sparkles className="size-3.5 text-amber-300" />
                      <span>स्वाध्याय निकाल (TEST RESULT)</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                      {currentSubmission.percentage >= 80
                        ? "🎉 अभिनंदन! उत्कृष्ट कामगिरी!"
                        : currentSubmission.percentage >= 50
                        ? "👍 छान प्रयत्न! उत्तम सराव!"
                        : "💪 चांगला सराव! पुन्हा प्रयत्न करा!"}
                    </h3>
                    <p className="text-xs sm:text-sm text-indigo-100 font-medium">
                      विद्यार्थी: <strong className="text-white font-bold">{studentName}</strong> • खाली तपशीलवार निकाल व गुणवत्ता प्रमाणपत्र उपलब्ध आहे.
                    </p>
                  </div>

                  {/* Score Card Badge */}
                  <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-4 text-center min-w-[150px] shrink-0 shadow-lg">
                    <span className="text-[11px] uppercase tracking-wider text-indigo-100 font-black block">
                      मिळालेले गुण
                    </span>
                    <div className="text-3xl sm:text-4xl font-black mt-0.5">
                      {currentSubmission.score}
                      <span className="text-lg text-indigo-200 font-normal">
                        /{currentSubmission.totalMarks}
                      </span>
                    </div>
                    <div className="mt-1.5 inline-block bg-white text-indigo-900 font-black px-3 py-0.5 rounded-full text-xs shadow-xs">
                      {currentSubmission.percentage}% गुण
                    </div>
                  </div>
                </div>

                {/* Next Test Button if available */}
                {nextQuiz && (
                  <div className="pt-2 border-t border-white/15 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs text-indigo-100">
                      पुढील स्वाध्याय उपलब्ध आहे: <strong>{nextQuiz.title}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedQuizId(nextQuiz.id)}
                      className="px-4 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-indigo-900 font-black text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md"
                    >
                      <span>पुढील चाचणी सोडवा</span>
                      <ArrowRight className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* DIRECT QUESTIONS DISPLAY */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>
                  {isSubmitted
                    ? "तपशीलवार उत्तरपत्रिका (Answer Key with Explanations):"
                    : `प्रगती: ${currentAnsweredCount} / ${currentQuiz.questions?.length || 0} प्रश्न निवडले`}
                </span>
                {!isSubmitted && (
                  <span className="text-purple-600 font-extrabold">
                    {Math.round(
                      (currentAnsweredCount / (currentQuiz.questions?.length || 1)) * 100
                    )}
                    % पूर्ण
                  </span>
                )}
              </div>

              {currentQuiz.questions?.map((q, qIdx) => {
                const userPicked = userAnswers[`${currentQuiz.id}_${q.id}`];
                const isAnswered = typeof userPicked === "number";
                const isCorrect = isSubmitted && isAnswered && userPicked === q.correctIndex;
                const isWrong = isSubmitted && isAnswered && userPicked !== q.correctIndex;

                return (
                  <div
                    key={q.id || qIdx}
                    className={`bg-white dark:bg-slate-850 border rounded-2xl p-4 sm:p-5 shadow-xs transition-all space-y-3.5 ${
                      isSubmitted
                        ? isCorrect
                          ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/20"
                          : isWrong
                          ? "border-rose-300 dark:border-rose-800 bg-rose-50/20 dark:bg-rose-950/20"
                          : "border-slate-200 dark:border-slate-800"
                        : isAnswered
                        ? "border-purple-300 dark:border-purple-800 shadow-sm"
                        : "border-slate-200/90 dark:border-slate-800 hover:border-purple-300"
                    }`}
                  >
                    {/* Question Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span className="size-7 sm:size-8 rounded-xl bg-purple-100 dark:bg-purple-950/70 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-black text-xs sm:text-sm flex items-center justify-center shrink-0">
                          {qIdx + 1}
                        </span>
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug pt-0.5">
                          {q.question}
                        </h4>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0 border border-slate-200/60 dark:border-slate-700">
                        {q.marks || 1} गुण
                      </span>
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:pl-10">
                      {q.options.map((optText, optIdx) => {
                        const letter = OPTION_LETTERS[optIdx] || String(optIdx + 1);
                        const isSelected = userPicked === optIdx;
                        const isThisCorrect = optIdx === q.correctIndex;

                        let optClass =
                          "border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-purple-50/40 text-slate-800 dark:text-slate-200";
                        let badgeClass =
                          "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600";

                        if (isSubmitted) {
                          if (isThisCorrect) {
                            optClass =
                              "border-emerald-500 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/30";
                            badgeClass = "bg-emerald-600 text-white border-emerald-600";
                          } else if (isSelected && !isThisCorrect) {
                            optClass =
                              "border-rose-400 bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 font-bold line-through ring-2 ring-rose-500/30";
                            badgeClass = "bg-rose-600 text-white border-rose-600";
                          }
                        } else if (isSelected) {
                          optClass =
                            "border-purple-600 bg-purple-50 dark:bg-purple-950/50 text-purple-950 dark:text-purple-200 font-bold ring-2 ring-purple-500/20";
                          badgeClass = "bg-purple-600 text-white border-purple-600";
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            disabled={isSubmitted}
                            onClick={() => handleSelectOption(q.id, optIdx)}
                            className={`w-full text-left p-3 rounded-xl border flex items-center gap-2.5 transition-all ${
                              isSubmitted ? "cursor-default" : "cursor-pointer"
                            } ${optClass}`}
                          >
                            <span
                              className={`size-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${badgeClass}`}
                            >
                              {letter}
                            </span>
                            <span className="text-xs sm:text-sm font-medium flex-1">
                              {optText}
                            </span>
                            {isSubmitted && isThisCorrect && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 shrink-0 flex items-center gap-1">
                                <CheckCircle2 className="size-3 text-emerald-700" />
                                बरोबर उत्तर
                              </span>
                            )}
                            {isSubmitted && isSelected && !isThisCorrect && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 shrink-0 flex items-center gap-1">
                                <XCircle className="size-3 text-rose-700" />
                                तुमचे उत्तर
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanation in Result Mode */}
                    {isSubmitted && q.explanation && (
                      <div className="sm:ml-10 p-2.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
                        <Sparkles className="size-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="leading-relaxed font-medium">
                          <strong className="font-bold">स्पष्टीकरण:</strong> {q.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom In-Place Submit Bar */}
            {!isSubmitted && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800/80 border border-purple-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="space-y-1 text-center sm:text-left">
                  <h4 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5 justify-center sm:justify-start">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>सर्व प्रश्न सोडवून पूर्ण झाले आहेत?</span>
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    खालील बटणावर क्लिक करून थेट निकाल व गुणवत्ता प्रमाणपत्र मिळवा.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-center sm:justify-end">
                  <button
                    type="button"
                    onClick={handleSubmitQuiz}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="size-4.5" />
                    <span>स्वाध्याय सबमिट करा (Submit Test) 🚀</span>
                  </button>
                </div>
              </div>
            )}

            {/* IN-PLACE CERTIFICATE (Rendered directly here when submitted!) */}
            {isSubmitted && currentSubmission && (
              <div className="space-y-4 pt-4 border-t-2 border-dashed border-purple-200 dark:border-slate-800">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Award className="size-5 text-amber-500" />
                      <span>आपले गुणवत्ता प्रमाणपत्र (Certificate of Excellence)</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      खालील प्रमाणपत्र आपण सेव्ह करू शकता, PDF डाउनलोड करू शकता किंवा WhatsApp वर शेअर करू शकता.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetQuiz}
                      className="px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center gap-1.5 border border-purple-200 transition-all cursor-pointer"
                    >
                      <RotateCcw className="size-3.5" />
                      <span>पुन्हा सोडवा (Retake)</span>
                    </button>
                  </div>
                </div>

                {/* The Certificate Component */}
                <div className="bg-slate-100 dark:bg-slate-950/60 p-2 sm:p-4 rounded-3xl border border-slate-200 dark:border-slate-800">
                  <MCQCertificate
                    studentName={studentName || "विद्यार्थी"}
                    quizTitle={currentQuiz.title}
                    subject={currentQuiz.subject}
                    classId={currentQuiz.classId}
                    score={currentSubmission.score}
                    totalMarks={currentSubmission.totalMarks}
                    percentage={currentSubmission.percentage}
                    dateStr={currentQuiz.date || todayStr}
                    teacherName={currentQuiz.teacherName || currentQuiz.createdBy?.name || "शिक्षक"}
                    schoolName={schoolName || currentQuiz.schoolName || ""}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Helper Tip */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-amber-500 shrink-0" />
            <span>स्वाध्याय थेट येथे सोडवा, सबमिट करा व गुणवत्ता प्रमाणपत्र मिळवा.</span>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {sharingQuiz && (
        <MCQShareModal
          isOpen={Boolean(sharingQuiz)}
          onClose={() => setSharingQuiz(null)}
          quiz={sharingQuiz}
          initialTeacherName={defaultRole === "teacher" ? userName : ""}
        />
      )}
    </div>
  );
};
