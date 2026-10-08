import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Sparkles,
  BookOpen,
  Share2,
  Trash2,
  CheckCircle2,
  FileQuestion,
} from "lucide-react";
import type { MCQHomeworkSet } from "@/types/mcqHomework";

export interface MCQHomeworkCalendarProps {
  quizzes: MCQHomeworkSet[];
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  onTakeQuiz: (quizId: string) => void;
  defaultRole?: "admin" | "teacher" | "student" | "user";
  onDeleteQuiz?: (id: string, title: string) => void;
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

const WEEKDAYS = ["रवि", "सोम", "मंगळ", "बुध", "गुरु", "शुक्र", "शनि"];

function formatISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISODate(str: string): Date {
  const parts = str.split("-").map(Number);
  if (parts.length === 3 && !isNaN(parts[0])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date();
}

export const MCQHomeworkCalendar: React.FC<MCQHomeworkCalendarProps> = ({
  quizzes,
  selectedDate,
  onSelectDate,
  onTakeQuiz,
  defaultRole = "student",
  onDeleteQuiz,
}) => {
  const todayStr = useMemo(() => formatISODate(new Date()), []);
  const initialDate = selectedDate && selectedDate !== "all" ? parseISODate(selectedDate) : new Date();

  const [currentYear, setCurrentYear] = useState<number>(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialDate.getMonth());

  // Map quizzes by date YYYY-MM-DD
  const quizzesByDate = useMemo(() => {
    const map: Record<string, MCQHomeworkSet[]> = {};
    for (const q of quizzes) {
      if (!q.date) continue;
      const d = q.date.trim().slice(0, 10);
      if (!map[d]) {
        map[d] = [];
      }
      map[d].push(q);
    }
    return map;
  }, [quizzes]);

  // Navigate months
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    onSelectDate(todayStr);
  };

  // Build 35 or 42 grid cells for calendar
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      items: MCQHomeworkSet[];
    }> = [];

    // Prev month overflow
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dayNum);
      const dateStr = formatISODate(prevDate);
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        items: quizzesByDate[dateStr] || [],
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const curDate = new Date(currentYear, currentMonth, dayNum);
      const dateStr = formatISODate(curDate);
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        items: quizzesByDate[dateStr] || [],
      });
    }

    // Next month overflow
    const remaining = (7 - (days.length % 7)) % 7;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const nextDate = new Date(currentYear, currentMonth + 1, dayNum);
      const dateStr = formatISODate(nextDate);
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        items: quizzesByDate[dateStr] || [],
      });
    }

    return days;
  }, [currentYear, currentMonth, selectedDate, todayStr, quizzesByDate]);

  // Selected date quizzes
  const activeDate = selectedDate && selectedDate !== "all" ? selectedDate : todayStr;
  const activeDateQuizzes = quizzesByDate[activeDate] || [];

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

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold mb-1">
            <CalendarIcon className="w-3.5 h-3.5" /> दैनिक MCQ कॅलेंडर
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
            तारीख निवडा आणि प्रश्नमंजुषा सोडवा
          </h3>
          <p className="text-xs text-slate-500">
            कॅलेंडरमधील कोणत्याही तारखेवर क्लिक करून त्या दिवशीचे बहुपर्यायी प्रश्न सोडवा.
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleJumpToToday}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
          >
            आज ({todayStr})
          </button>
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
              title="मागील महिना"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800 dark:text-slate-100 min-w-[120px] text-center">
              {MARATHI_MONTHS[currentMonth]} {currentYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
              title="पुढील महिना"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Calendar + Right Quizzes of Selected Date */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Calendar Matrix (5 or 7 cols) */}
        <div className="lg:col-span-6 xl:col-span-5 bg-slate-50/70 dark:bg-slate-850/60 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-500 pb-2 border-b border-slate-200/60 dark:border-slate-750">
            {WEEKDAYS.map((w, idx) => (
              <div key={w} className={idx === 0 ? "text-rose-500" : ""}>
                {w}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((day) => {
              const hasQuizzes = day.items.length > 0;
              const isSelected = day.dateStr === activeDate;

              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => onSelectDate(day.dateStr)}
                  className={`relative p-2 h-12 rounded-xl flex flex-col items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400 scale-105 z-10 font-black"
                      : day.isToday
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700"
                      : day.isCurrentMonth
                      ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-750 shadow-2xs"
                      : "text-slate-300 dark:text-slate-600 hover:bg-slate-100/50"
                  }`}
                >
                  <span className="text-xs leading-none">{day.dayNumber}</span>

                  {/* Indicator Dot/Badge if quizzes exist */}
                  {hasQuizzes ? (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full leading-tight font-extrabold flex items-center justify-center ${
                        isSelected
                          ? "bg-amber-300 text-amber-950"
                          : "bg-emerald-500 text-white shadow-xs"
                      }`}
                      title={`${day.items.length} स्वाध्याय उपलब्ध`}
                    >
                      {day.items.length}
                    </span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full opacity-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 dark:border-slate-750 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>स्वाध्याय उपलब्ध</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <span>निवडलेली तारीख</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-md border border-indigo-400 bg-indigo-50" />
              <span>आज</span>
            </div>
          </div>
        </div>

        {/* Right: Quizzes for the Selected Date */}
        <div className="lg:col-span-6 xl:col-span-7 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                📅 {formattedActiveDate}
              </span>
              {activeDate === todayStr && (
                <span className="bg-rose-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  आज
                </span>
              )}
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              एकूण {activeDateQuizzes.length} प्रश्न संच
            </span>
          </div>

          {/* Quizzes List */}
          {activeDateQuizzes.length === 0 ? (
            <div className="text-center py-12 px-6 bg-slate-50/50 dark:bg-slate-850/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
              <FileQuestion className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                या तारखेला कोणताही MCQ स्वाध्याय उपलब्ध नाही
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                कॅलेंडरमधील हिरवा ठिपका (🟢) असलेल्या इतर तारखा निवडून त्या दिवशीचे प्रश्न सोडवा, किंवा आजचा स्वाध्याय पहा.
              </p>
              <button
                type="button"
                onClick={handleJumpToToday}
                className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                आजचा स्वाध्याय पहा 🚀
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeDateQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {quiz.subject}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
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

                    <h4 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {quiz.title}
                    </h4>

                    <div className="flex items-center gap-3 text-xs text-slate-500 pt-0.5">
                      <span>{quiz.questions.length} प्रश्न</span>
                      <span>•</span>
                      <span>{quiz.totalMarks} गुण</span>
                      <span>•</span>
                      <span>{quiz.createdBy?.name || "प्रशासन"}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {defaultRole === "admin" && onDeleteQuiz && (
                      <button
                        type="button"
                        onClick={() => onDeleteQuiz(quiz.id, quiz.title)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="स्वाध्याय हटवा"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.origin}/mcq?id=${quiz.id}`;
                        navigator.clipboard.writeText(url);
                        alert("स्वाध्याय लिंक कॉपी झाली!");
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="लिंक कॉपी करा"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onTakeQuiz(quiz.id)}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <span>सोडवा</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
