import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ArrowRight,
  Sparkles,
  Share2,
  Trash2,
  FileQuestion,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import type { MCQHomeworkSet } from "@/types/mcqHomework";
import { updateMCQHomework } from "@/services/mcqHomeworkService";
import { MCQShareModal } from "./MCQShareModal";

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

  const todayStr = useMemo(() => formatISODate(new Date()), []);
  const tomorrowStr = useMemo(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return formatISODate(t);
  }, []);

  const activeDate = useMemo(() => {
    if (selectedDate && selectedDate.trim() && selectedDate !== "all") {
      return normalizeDate(selectedDate);
    }
    return todayStr;
  }, [selectedDate, todayStr]);

  const isToday = activeDate === todayStr;

  // Filter quizzes for the active date (today or chosen date)
  // Shows all previous dates, up to tomorrow (next day), but restricts days ahead
  const activeDateQuizzes = useMemo(() => {
    if (activeDate > tomorrowStr) return [];

    return quizzes.filter((q) => {
      if (!q.date) return false;
      return normalizeDate(q.date) === activeDate;
    });
  }, [quizzes, activeDate, tomorrowStr]);

  // Formatted date label in Marathi
  const formattedActiveDate = useMemo(() => {
    try {
      const d = parseISODate(activeDate);
      const day = d.getDate();
      const monthMr = MARATHI_MONTHS[d.getMonth()];
      const weekdayMr = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"][d.getDay()];
      return `${weekdayMr}, ${day} ${monthMr} ${d.getFullYear()}`;
    } catch {
      return activeDate;
    }
  }, [activeDate]);

  const handleJumpToToday = () => {
    onSelectDate(todayStr);
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

  return (
    <div className="w-full space-y-4">
      {/* Today / Selected Day MCQ Quiz Container - Full Width & Clean without Calendar Matrix */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col space-y-4">
        {/* Header Bar */}
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-2xs border ${
                  isToday
                    ? "bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-800"
                    : activeDate === tomorrowStr
                    ? "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 border-indigo-300 dark:border-indigo-800"
                    : "bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800"
                }`}
              >
                <CalendarIcon className="size-3.5 text-purple-600 dark:text-purple-400" />
                <span>
                  {isToday
                    ? "आजचा दिनांक (TODAY'S DATE)"
                    : activeDate === tomorrowStr
                    ? "उद्याचा दिनांक (NEXT DAY)"
                    : "निवडलेली तारीख (SELECTED DATE)"}
                </span>
              </span>

              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {activeDateQuizzes.length} स्वाध्याय उपलब्ध
              </span>

              {/* If viewing a past/future date, quick button to switch back to Today */}
              {!isToday && (
                <button
                  type="button"
                  onClick={handleJumpToToday}
                  className="px-2.5 py-1 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-black flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer"
                  title="आजच्या स्वाध्यायावर परत जा"
                >
                  <RotateCcw className="size-3" />
                  <span>आजचा स्वाध्याय दाखवा (Show Today)</span>
                </button>
              )}
            </div>

            {/* Compact Date Picker Input */}
            <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 sm:px-3 py-1.5 transition-all shadow-2xs">
              <CalendarIcon className="size-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isToday
                  ? "आजचा दिनांक:"
                  : activeDate === tomorrowStr
                  ? "उद्याचा दिनांक:"
                  : "तारीख:"}
              </span>
              <input
                type="date"
                max={tomorrowStr}
                value={activeDate}
                onChange={(e) => {
                  if (e.target.value) {
                    if (e.target.value > tomorrowStr) {
                      toast.info("केवळ उद्याचा (Next Day) स्वाध्याय उपलब्ध आहे. पुढील दिवसांचे स्वाध्याय अजून उपलब्ध नाहीत.");
                      onSelectDate(tomorrowStr);
                    } else {
                      onSelectDate(e.target.value);
                    }
                  }
                }}
                className="bg-transparent border-none outline-none font-black text-xs text-purple-700 dark:text-purple-300 cursor-pointer"
                title="कॅलेंडरमधून तारीख निवडा (मागील सर्व किंवा उद्यापर्यंतचा स्वाध्याय)"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 flex-wrap">
                <span>{formattedActiveDate}</span>
                {isToday ? (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-600 text-white shadow-2xs">
                    आजचा दिवस
                  </span>
                ) : activeDate === tomorrowStr ? (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-600 text-white shadow-2xs">
                    उद्याचा दिवस (Next Day)
                  </span>
                ) : (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs">
                    निवडलेला दिवस
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                {isToday
                  ? "आजचा अधिकृत दैनिक MCQ स्वाध्याय संच"
                  : activeDate === tomorrowStr
                  ? "उद्याचा अधिकृत दैनिक MCQ स्वाध्याय संच"
                  : "या तारखेचा दैनिक MCQ स्वाध्याय संच"} • {selectedClass ? `इयत्ता ${selectedClass}` : "सर्व इयत्ता"} {selectedMedium === "semi" ? "(सेमी-इंग्रजी माध्यम)" : "(मराठी माध्यम)"}
              </p>
            </div>
          </div>
        </div>

        {/* Content Section: MCQ Quizzes Cards or Empty State */}
        {activeDateQuizzes.length === 0 ? (
          <div className="py-12 px-4 text-center bg-slate-50/70 dark:bg-slate-850/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
            <div className="size-14 rounded-2xl bg-purple-100/70 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto shadow-inner">
              <FileQuestion className="size-7" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-black text-slate-800 dark:text-slate-200">
                {activeDate > tomorrowStr
                  ? "पुढील दिवसांचा MCQ स्वाध्याय उपलब्ध नाही"
                  : activeDate === tomorrowStr
                  ? "उद्यासाठी अद्याप MCQ स्वाध्याय प्रकाशित झालेला नाही"
                  : activeDate === todayStr
                  ? "आजचा MCQ स्वाध्याय अद्याप उपलब्ध नाही"
                  : `दिनांक ${activeDate} साठी कोणताही MCQ स्वाध्याय उपलब्ध नाही`}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {activeDate > tomorrowStr
                  ? "विद्यार्थ्यांच्या नियमित सरावासाठी केवळ आजचा किंवा उद्याचा स्वाध्याय पाहता येईल."
                  : "कृपया इतर तारीख निवडून त्या दिवशीचा स्वाध्याय पहा किंवा आजचा स्वाध्याय सोडवा."}
              </p>
            </div>

            {!isToday && (
              <button
                type="button"
                onClick={handleJumpToToday}
                className="mt-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 inline-flex items-center gap-1.5"
              >
                <RotateCcw className="size-3.5" />
                <span>आजचा स्वाध्याय पहा 🚀</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {activeDateQuizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-600 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      {quiz.subject}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      इयत्ता {quiz.classId}
                    </span>
                    {quiz.isCustom ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        कस्टम
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                        ॲडमिन
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {quiz.title}
                  </h4>

                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                    <span className="font-bold">{quiz.questions.length} प्रश्न</span>
                    <span>•</span>
                    <span className="font-bold">{quiz.totalMarks} गुण</span>
                    <span>•</span>
                    <span>{quiz.createdBy?.name || "सुपर ॲडमिन"}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                  {defaultRole === "admin" && (
                    <button
                      type="button"
                      onClick={() => handleToggleAdminStatus(quiz)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shadow-xs ${
                        quiz.isCustom && quiz.createdBy?.role !== "admin"
                          ? "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200"
                          : "bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200"
                      }`}
                      title={
                        quiz.isCustom && quiz.createdBy?.role !== "admin"
                          ? "हा प्रश्न संच '१. ॲडमिन' अधिकृत विभागात हलवा"
                          : "हा प्रश्न संच '२. कस्टम' विभागात हलवा"
                      }
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>
                        {quiz.isCustom && quiz.createdBy?.role !== "admin"
                          ? "ॲडमिनमध्ये हलवा"
                          : "कस्टममध्ये हलवा"}
                      </span>
                    </button>
                  )}

                  {(defaultRole === "admin" || (defaultRole === "teacher" && quiz.isCustom)) && onDeleteQuiz && (
                    <button
                      type="button"
                      onClick={() => onDeleteQuiz(quiz.id, quiz.title)}
                      className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="स्वाध्याय हटवा"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSharingQuiz(quiz)}
                    className="px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
                    title="स्वाध्याय लिंक WhatsApp वर शेअर करा"
                  >
                    <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>शेअर करा</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onTakeQuiz(quiz.id)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                  >
                    <span>सोडवा</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Helper Tip */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-amber-500 shrink-0" />
            <span>स्वाध्यायावर क्लिक करून थेट सोडवा किंवा WhatsApp वर विद्यार्थ्यांना पाठवा.</span>
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
