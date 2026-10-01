import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  BookOpen,
  PlusCircle,
  Eye,
  Download,
  Trash2,
  Clock,
  FileText,
  Sparkles,
  CheckCircle2,
  Layers,
} from "lucide-react";
import type { HomeworkItem } from "@/types/documentEditor";

const MARATHI_MONTHS = [
  "जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून",
  "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"
];

const ENGLISH_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MARATHI_WEEKDAYS_SHORT = ["रवि", "सोम", "मंगळ", "बुध", "गुरु", "शुक्र", "शनि"];
const ENGLISH_WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(isoStr: string): Date {
  const parts = isoStr.split("-").map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date();
}

export interface DailyHomeworkCalendarProps {
  homeworkList: HomeworkItem[];
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  onPreviewHomework: (item: HomeworkItem) => void;
  onUploadForDate?: (dateStr: string) => void;
  onDeleteHomework?: (id: string, title: string) => void;
  userRole?: "admin" | "teacher" | "student";
  accentColor?: "amber" | "emerald" | "indigo";
}

export function DailyHomeworkCalendar({
  homeworkList,
  selectedDate,
  onSelectDate,
  onPreviewHomework,
  onUploadForDate,
  onDeleteHomework,
  userRole = "teacher",
  accentColor = "amber",
}: DailyHomeworkCalendarProps) {
  // Calendar month state
  const initialDate = selectedDate ? parseISODate(selectedDate) : new Date();
  const [currentYear, setCurrentYear] = useState<number>(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialDate.getMonth());

  const todayStr = useMemo(() => formatISODate(new Date()), []);

  // Map homework by date string (YYYY-MM-DD)
  const homeworkByDate = useMemo(() => {
    const map: Record<string, HomeworkItem[]> = {};
    for (const item of homeworkList) {
      if (!item.homeworkDate) continue;
      // Normalize date string (in case there's whitespace)
      const d = item.homeworkDate.trim().slice(0, 10);
      if (!map[d]) {
        map[d] = [];
      }
      map[d].push(item);
    }
    return map;
  }, [homeworkList]);

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

  const handleTodayClick = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    onSelectDate(todayStr);
  };

  // Build grid days
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      items: HomeworkItem[];
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
        items: homeworkByDate[dateStr] || [],
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
        items: homeworkByDate[dateStr] || [],
      });
    }

    // Next month overflow to complete 35 or 42 grid cells
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
        items: homeworkByDate[dateStr] || [],
      });
    }

    return days;
  }, [currentYear, currentMonth, selectedDate, todayStr, homeworkByDate]);

  // Selected date homework items
  const selectedDateItems = useMemo(() => {
    return homeworkByDate[selectedDate] || [];
  }, [homeworkByDate, selectedDate]);

  // Selected date human readable display
  const selectedDateFormatted = useMemo(() => {
    if (!selectedDate) return "";
    try {
      const d = parseISODate(selectedDate);
      const day = d.getDate();
      const monthMr = MARATHI_MONTHS[d.getMonth()];
      const weekdayMr = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"][d.getDay()];
      return `${weekdayMr}, ${day} ${monthMr} ${d.getFullYear()}`;
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Theme-specific styling classes
  const themeStyles = useMemo(() => {
    switch (accentColor) {
      case "emerald":
        return {
          primaryBg: "bg-emerald-600 hover:bg-emerald-700",
          primaryText: "text-emerald-700",
          badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
          selectedRing: "ring-2 ring-emerald-500 bg-emerald-50/70 border-emerald-500",
          todayIndicator: "bg-emerald-600 text-white",
          dotColor: "bg-emerald-500",
        };
      case "indigo":
        return {
          primaryBg: "bg-indigo-600 hover:bg-indigo-700",
          primaryText: "text-indigo-700",
          badgeBg: "bg-indigo-100 text-indigo-800 border-indigo-200",
          selectedRing: "ring-2 ring-indigo-500 bg-indigo-50/70 border-indigo-500",
          todayIndicator: "bg-indigo-600 text-white",
          dotColor: "bg-indigo-500",
        };
      case "amber":
      default:
        return {
          primaryBg: "bg-amber-600 hover:bg-amber-700",
          primaryText: "text-amber-700",
          badgeBg: "bg-amber-100 text-amber-800 border-amber-200",
          selectedRing: "ring-2 ring-amber-500 bg-amber-50/70 border-amber-500",
          todayIndicator: "bg-amber-600 text-white",
          dotColor: "bg-amber-500",
        };
    }
  }, [accentColor]);

  // Total homework in this month
  const totalHomeworkThisMonth = useMemo(() => {
    let count = 0;
    for (const day of calendarDays) {
      if (day.isCurrentMonth) {
        count += day.items.length;
      }
    }
    return count;
  }, [calendarDays]);

  return (
    <div className="space-y-6">
      {/* Calendar Header with Month/Year Switcher & Quick Navigation */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`size-12 rounded-2xl ${themeStyles.badgeBg} flex items-center justify-center shadow-xs shrink-0`}>
              <CalendarIcon className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                  {MARATHI_MONTHS[currentMonth]} {currentYear}
                </h3>
                <span className="text-xs font-semibold text-slate-400">
                  ({ENGLISH_MONTHS[currentMonth]})
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                या महिन्यात एकूण <span className="font-bold text-slate-800">{totalHomeworkThisMonth}</span> दैनिक गृहपाठ उपलब्ध आहेत. तारीख निवडून गृहपाठ पहा किंवा जोडा.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button
              type="button"
              onClick={handleTodayClick}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs"
            >
              आज (Today)
            </button>
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition-all cursor-pointer shadow-xs"
                title="मागील महिना (Previous Month)"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition-all cursor-pointer shadow-xs"
                title="पुढील महिना (Next Month)"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid & Selected Date Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Monthly Calendar Grid (8 cols on large screens) */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            {/* Days of week headers */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
              {MARATHI_WEEKDAYS_SHORT.map((dayMr, idx) => (
                <div key={dayMr} className="py-2">
                  <span className={`block text-xs font-black ${idx === 0 ? "text-rose-600" : "text-slate-600"}`}>
                    {dayMr}
                  </span>
                  <span className="block text-[10px] text-slate-400 font-semibold">
                    {ENGLISH_WEEKDAYS_SHORT[idx]}
                  </span>
                </div>
              ))}
            </div>

            {/* Calendar Days Matrix */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarDays.map((day) => {
                const hasHomework = day.items.length > 0;
                return (
                  <button
                    key={day.dateStr}
                    type="button"
                    onClick={() => onSelectDate(day.dateStr)}
                    className={`min-h-[72px] sm:min-h-[88px] p-1.5 sm:p-2 rounded-2xl border text-left flex flex-col justify-between transition-all duration-200 cursor-pointer relative group ${
                      day.isSelected
                        ? themeStyles.selectedRing + " shadow-md z-10 scale-[1.02]"
                        : day.isCurrentMonth
                        ? hasHomework
                          ? "bg-amber-50/40 hover:bg-amber-100/50 border-amber-200 hover:border-amber-400 shadow-xs"
                          : "bg-white hover:bg-slate-50 border-slate-200/80 hover:border-slate-300"
                        : "bg-slate-50/50 text-slate-400 border-slate-100 hover:bg-slate-100/60 opacity-60"
                    }`}
                  >
                    {/* Day number & Today badge */}
                    <div className="flex items-center justify-between gap-1 w-full">
                      <span
                        className={`text-xs sm:text-sm font-black size-6 sm:size-7 flex items-center justify-center rounded-lg transition-colors ${
                          day.isToday
                            ? themeStyles.todayIndicator + " shadow-xs font-black"
                            : day.isSelected
                            ? "text-slate-900 font-black"
                            : day.isCurrentMonth
                            ? "text-slate-800"
                            : "text-slate-400"
                        }`}
                      >
                        {day.dayNumber}
                      </span>

                      {day.isToday && (
                        <span className="hidden sm:inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500 text-white">
                          आज
                        </span>
                      )}
                    </div>

                    {/* Homework Badges / Indicator */}
                    <div className="mt-1 space-y-1 w-full overflow-hidden">
                      {hasHomework ? (
                        <>
                          {/* Subject Pill (first item) */}
                          <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-200/70 text-amber-900 text-[10px] font-bold truncate">
                            <span className="truncate">{day.items[0].subject || day.items[0].title}</span>
                          </div>
                          {/* Multiple indicator badge */}
                          <div className="flex items-center justify-between text-[10px] font-black text-amber-800">
                            <span className="sm:hidden text-[9px] font-bold bg-amber-200 text-amber-900 px-1 py-0.5 rounded">
                              {day.items.length} गृहपाठ
                            </span>
                            {day.items.length > 1 && (
                              <span className="hidden sm:inline-block text-[9px] font-bold text-amber-700">
                                +{day.items.length - 1} इतर
                              </span>
                            )}
                            <span className="size-2 rounded-full bg-amber-500 animate-pulse sm:hidden" />
                          </div>
                        </>
                      ) : (
                        <div className="h-4" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calendar Footer Legend */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-full bg-amber-500" />
                <span className="font-semibold">गृहपाठ उपलब्ध (Has Homework)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-md bg-slate-100 border border-slate-300" />
                <span className="font-semibold">गृहपाठ नाही</span>
              </div>
            </div>
            <div className="text-[11px] font-bold text-slate-400">
              * तारखेवर क्लिक करून तपशील पहा
            </div>
          </div>
        </div>

        {/* Right: Selected Date Homework Cards & Direct Upload (5 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            {/* Header for Selected Date */}
            <div className="border-b border-slate-100 pb-4 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  निवडलेली तारीख (Selected Date)
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {selectedDateItems.length} गृहपाठ
                </span>
              </div>
              <h4 className="text-lg font-black text-slate-900 leading-snug">
                {selectedDateFormatted}
              </h4>
              <p className="text-xs text-slate-500">
                {selectedDate === todayStr ? "आजचा दैनिक गृहपाठ" : "या तारखेचा प्रकाशित गृहपाठ"}
              </p>
            </div>

            {/* Quick Upload Button for Admin */}
            {userRole === "admin" && onUploadForDate && (
              <button
                type="button"
                onClick={() => onUploadForDate(selectedDate)}
                className={`w-full py-3 px-4 ${themeStyles.primaryBg} text-white rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2`}
              >
                <PlusCircle className="size-4" />
                <span>या तारखेसाठी गृहपाठ जोडा (Upload For This Date)</span>
              </button>
            )}

            {/* List of Homework Cards on this Date */}
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {selectedDateItems.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                  <div className="size-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <CalendarIcon className="size-6" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-700">कोणताही गृहपाठ नाही</h5>
                    <p className="text-xs text-slate-400 mt-0.5">
                      या तारखेसाठी अद्याप दैनिक गृहपाठ प्रकाशित झालेला नाही.
                    </p>
                  </div>
                  {userRole === "admin" && onUploadForDate && (
                    <button
                      type="button"
                      onClick={() => onUploadForDate(selectedDate)}
                      className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-xs font-bold transition-all border border-amber-200 cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <PlusCircle className="size-3.5" />
                      <span>गृहपाठ अपलोड करा</span>
                    </button>
                  )}
                </div>
              ) : (
                selectedDateItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-amber-300 shadow-xs hover:shadow-md transition-all space-y-3 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                            {item.subject}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                            {item.class}
                          </span>
                          {item.medium && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium">
                              {item.medium === "marathi" ? "मराठी" : "सेमी"}
                            </span>
                          )}
                        </div>
                        <h5 className="font-black text-sm text-slate-900 group-hover:text-amber-700 transition-colors">
                          {item.title}
                        </h5>
                      </div>

                      {userRole === "admin" && onDeleteHomework && (
                        <button
                          type="button"
                          onClick={() => onDeleteHomework(item.id, item.title)}
                          className="p-1 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer shrink-0"
                          title="हटवा"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold truncate">
                        <FileText className="size-3 text-amber-600 shrink-0" />
                        <span className="truncate max-w-[130px]">
                          {item.fileName || (item.variables ? "कार्यपुस्तिका" : "स्वाध्याय")}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onPreviewHomework(item)}
                          className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye className="size-3" />
                          <span>पहा</span>
                        </button>
                        {item.fileUrl && (
                          <a
                            href={item.fileUrl}
                            download={item.fileName || "homework.pdf"}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
                            title="डाउनलोड"
                          >
                            <Download className="size-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Helper text */}
          <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-100/80 text-[11px] text-amber-800 font-medium flex items-center gap-2">
            <Sparkles className="size-4 text-amber-600 shrink-0" />
            <span>
              कॅलेंडरवरील तारखेवर क्लिक करून त्या दिवसाचा गृहपाठ त्वरित उघडा किंवा संपादित करा.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
