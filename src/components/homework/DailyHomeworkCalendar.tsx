import React, { useState, useMemo, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  BookOpen,
  PlusCircle,
  Eye,
  Download,
  Trash2,
  FileText,
  Sparkles,
  MessageCircle,
  Loader2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { HomeworkItem } from "@/types/documentEditor";
import { directShareHomeworkPdfToWhatsApp } from "@/utils/homeworkPdfShare";
import type { HomeworkHeaderProfile } from "@/utils/homeworkDocHelper";

const MARATHI_MONTHS = [
  "जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून",
  "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"
];

const WEEKDAYS = [
  { short: "रवि", full: "रविवार", isSunday: true },
  { short: "सोम", full: "सोमवार" },
  { short: "मंगळ", full: "मंगळवार" },
  { short: "बुध", full: "बुधवार" },
  { short: "गुरु", full: "गुरुवार" },
  { short: "शुक्र", full: "शुक्रवार" },
  { short: "शनि", full: "शनिवार" },
];

export function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(isoStr: string): Date {
  const parts = isoStr.split(/[-/]/).map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    if (parts[0] > 1000) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
  }
  return new Date();
}

export interface DailyHomeworkCalendarProps {
  homeworkList: HomeworkItem[];
  selectedDate?: string; // YYYY-MM-DD
  onSelectDate?: (dateStr: string) => void;
  onPreviewHomework: (item: HomeworkItem) => void;
  onUploadForDate?: (dateStr: string) => void;
  onDeleteHomework?: (id: string, title: string) => void;
  userRole?: "admin" | "teacher" | "student";
  accentColor?: "amber" | "emerald" | "indigo";
  selectedClass?: string;
  selectedMedium?: string;
  schoolProfile?: HomeworkHeaderProfile;
  userId?: string;
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
  selectedClass,
  selectedMedium,
  schoolProfile,
}: DailyHomeworkCalendarProps) {
  // Direct WhatsApp PDF sharing state
  const [isSharingPdf, setIsSharingPdf] = useState(false);

  // Today's ISO string (YYYY-MM-DD)
  const todayStr = useMemo(() => formatISODate(new Date()), []);
  const tomorrowStr = useMemo(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return formatISODate(t);
  }, []);

  // Normalize date string for reliable matching (YYYY-MM-DD or DD-MM-YYYY)
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

  // Currently active date (defaults to selectedDate if provided, otherwise todayStr)
  const activeDate = useMemo(() => {
    if (selectedDate && selectedDate.trim()) {
      return normalizeDate(selectedDate);
    }
    return todayStr;
  }, [selectedDate, todayStr]);

  const isToday = activeDate === todayStr;

  // Calendar month/year navigation state
  const [calDate, setCalDate] = useState<Date>(() => parseISODate(activeDate || todayStr));
  const calYear = calDate.getFullYear();
  const calMonth = calDate.getMonth();

  const handlePrevMonth = () => {
    setCalDate(new Date(calYear, calMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCalDate(new Date(calYear, calMonth + 1, 1));
  };

  const handleJumpToToday = () => {
    setCalDate(new Date());
    onSelectDate?.(todayStr);
  };

  const handleSelectCalendarDay = (dateStr: string) => {
    onSelectDate?.(dateStr);
    const d = parseISODate(dateStr);
    if (d.getMonth() !== calMonth || d.getFullYear() !== calYear) {
      setCalDate(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  };

  // Sync calDate if external activeDate changes month
  useEffect(() => {
    if (activeDate) {
      const d = parseISODate(activeDate);
      if (d.getMonth() !== calMonth || d.getFullYear() !== calYear) {
        setCalDate(new Date(d.getFullYear(), d.getMonth(), 1));
      }
    }
  }, [activeDate]);

  // Group homework items by date for quick calendar badges/dots
  const homeworkByDate = useMemo(() => {
    const map = new Map<string, HomeworkItem[]>();
    homeworkList.forEach((hw) => {
      const d = hw.homeworkDate || (hw as any).date;
      if (!d) return;
      const norm = normalizeDate(d);
      if (!map.has(norm)) map.set(norm, []);
      map.get(norm)!.push(hw);
    });
    return map;
  }, [homeworkList]);

  // Compute 7-day grid cells for the active month
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sun
    const daysInMonth = lastDay.getDate();

    // Days from previous month for leading padding
    const prevMonthLastDay = new Date(calYear, calMonth, 0).getDate();
    const cells = [];

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(calYear, calMonth - 1, dayNum);
      const dateStr = formatISODate(d);
      cells.push({
        dayNum,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === activeDate,
        homeworkForDay: homeworkByDate.get(dateStr) || [],
      });
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(calYear, calMonth, day);
      const dateStr = formatISODate(d);
      cells.push({
        dayNum: day,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === activeDate,
        homeworkForDay: homeworkByDate.get(dateStr) || [],
      });
    }

    // Days from next month for trailing padding to make full 7-day weeks
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
      const d = new Date(calYear, calMonth + 1, day);
      const dateStr = formatISODate(d);
      cells.push({
        dayNum: day,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === activeDate,
        homeworkForDay: homeworkByDate.get(dateStr) || [],
      });
    }

    return cells;
  }, [calYear, calMonth, todayStr, activeDate, homeworkByDate]);

  // Filter homework items for the active date (today or chosen date)
  const displayItems = useMemo(() => {
    if (activeDate > tomorrowStr) return [];

    return homeworkList.filter((item) => {
      const d = item.homeworkDate || (item as any).date || (item as any).createdAt;
      if (!d) return false;
      return normalizeDate(d) === activeDate;
    });
  }, [homeworkList, activeDate, tomorrowStr]);

  // Marathi formatted date for active date
  const activeDateFormatted = useMemo(() => {
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

  const handleDirectSharePdf = async (itemToShare?: HomeworkItem | null) => {
    setIsSharingPdf(true);
    try {
      await directShareHomeworkPdfToWhatsApp({
        dateStr: activeDate,
        classId: selectedClass || itemToShare?.class || displayItems[0]?.class || "1st",
        medium: (selectedMedium as any) || itemToShare?.medium || (displayItems[0]?.medium as any) || "marathi",
        homeworkItems: displayItems,
        singleItem: itemToShare || null,
        schoolProfile: schoolProfile,
      });
    } finally {
      setIsSharingPdf(false);
    }
  };

  const isAmber = accentColor === "amber";

  return (
    <div className="w-full">
      {/* SPLIT SCREEN: LEFT CALENDAR (4 COLS) + RIGHT CONTENT (8 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: COMPACT MONTHLY CALENDAR */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          {/* Header with Jump to Today */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl text-white shadow-xs ${isAmber ? "bg-amber-600" : "bg-emerald-600"}`}>
                <CalendarIcon className="size-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                  कॅलेंडर (Calendar)
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={handleJumpToToday}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs active:scale-95 ${
                activeDate === todayStr
                  ? isAmber
                    ? "bg-amber-600 text-white"
                    : "bg-emerald-600 text-white"
                  : isAmber
                  ? "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200"
                  : "bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200"
              }`}
              title="आजच्या तारखेवर जा"
            >
              आज (Today)
            </button>
          </div>

          {/* Month Navigator */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-850 rounded-2xl p-1.5 border border-slate-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-750 hover:shadow-2xs transition-all cursor-pointer"
              title="मागील महिना"
            >
              <ChevronLeft className="size-4" />
            </button>

            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight">
              {MARATHI_MONTHS[calMonth]} {calYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-750 hover:shadow-2xs transition-all cursor-pointer"
              title="पुढील महिना"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* Compact 7-column Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((w) => (
              <div
                key={w.short}
                className={`py-1 rounded-lg text-[11px] font-black uppercase ${
                  w.isSunday
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-slate-500 dark:text-slate-400"
                }`}
                title={w.full}
              >
                {w.short}
              </div>
            ))}
          </div>

          {/* Compact Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarGrid.map((cell, idx) => {
              const hwCount = cell.homeworkForDay.length;
              return (
                <button
                  key={`${cell.dateStr}-${idx}`}
                  type="button"
                  onClick={() => handleSelectCalendarDay(cell.dateStr)}
                  className={`h-9 sm:h-10 w-full rounded-xl flex flex-col items-center justify-center p-0.5 relative transition-all cursor-pointer ${
                    cell.isSelected
                      ? isAmber
                        ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black shadow-md ring-2 ring-amber-300 scale-105 z-10"
                        : "bg-gradient-to-br from-emerald-600 to-teal-600 text-white font-black shadow-md ring-2 ring-emerald-300 scale-105 z-10"
                      : cell.isToday
                      ? isAmber
                        ? "border-2 border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-extrabold hover:border-amber-600"
                        : "border-2 border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-extrabold hover:border-emerald-600"
                      : cell.isCurrentMonth
                      ? "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                      : "text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-850 font-normal"
                  }`}
                  title={`${cell.dateStr}: ${hwCount > 0 ? `${hwCount} गृहपाठ उपलब्ध` : "गृहपाठ नाही"}`}
                >
                  <span className="text-xs leading-none">
                    {cell.dayNum}
                  </span>

                  {/* Indicator Dot for Homework */}
                  {hwCount > 0 ? (
                    <span
                      className={`size-1.5 rounded-full mt-0.5 ${
                        cell.isSelected ? "bg-white" : isAmber ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      title={`${hwCount} गृहपाठ उपलब्ध`}
                    />
                  ) : cell.isToday ? (
                    <span
                      className={`size-1 rounded-full mt-0.5 ${
                        cell.isSelected ? "bg-white" : isAmber ? "bg-amber-600" : "bg-emerald-600"
                      }`}
                    />
                  ) : (
                    <span className="size-1.5 mt-0.5 opacity-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: SELECTED DAY'S CONTENT & HOMEWORK ITEMS */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          {/* Header Bar */}
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-2xs border ${
                    isToday
                      ? isAmber
                        ? "bg-amber-100 text-amber-900 border-amber-300"
                        : "bg-emerald-100 text-emerald-800 border-emerald-200"
                      : activeDate === tomorrowStr
                      ? "bg-indigo-100 text-indigo-900 border-indigo-300"
                      : "bg-slate-100 text-slate-800 border-slate-200"
                  }`}
                >
                  <CalendarIcon className="size-3.5 text-amber-700" />
                  <span>
                    {isToday
                      ? "आजचा दिनांक (TODAY'S DATE)"
                      : activeDate === tomorrowStr
                      ? "उद्याचा दिनांक (NEXT DAY)"
                      : "निवडलेली तारीख (SELECTED DATE)"}
                  </span>
                </span>

                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full text-white ${isAmber ? "bg-amber-600" : "bg-emerald-600"}`}>
                  {displayItems.length} गृहपाठ उपलब्ध
                </span>
              </div>

              {/* Direct WhatsApp Share All Displayed Homework */}
              {displayItems.length > 0 && (
                <button
                  type="button"
                  disabled={isSharingPdf}
                  onClick={() => handleDirectSharePdf(null)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-xs font-black flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                  title="या दिवसाचा गृहपाठ थेट PDF स्वरूपात WhatsApp वर पाठवा"
                >
                  {isSharingPdf ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <MessageCircle className="size-4" />
                  )}
                  <span>WhatsApp वर PDF पाठवा</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 flex-wrap">
                  <span>{activeDateFormatted}</span>
                  {isToday ? (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-2xs">
                      आजचा दिवस
                    </span>
                  ) : activeDate === tomorrowStr ? (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-2xs">
                      उद्याचा दिवस (Next Day)
                    </span>
                  ) : (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs">
                      निवडलेला दिवस
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {isToday ? "आजचा अधिकृत दैनिक गृहपाठ संच" : activeDate === tomorrowStr ? "उद्याचा अधिकृत दैनिक गृहपाठ संच" : "या तारखेचा दैनिक गृहपाठ संच"} • {selectedClass ? `इयत्ता ${selectedClass}` : ""} {selectedMedium === "semi" ? "(सेमी-इंग्रजी माध्यम)" : "(मराठी माध्यम)"}
                </p>
              </div>

              {/* Upload Button for this specific Date */}
              {userRole === "admin" && onUploadForDate && (
                <button
                  type="button"
                  onClick={() => onUploadForDate(activeDate)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-black shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <PlusCircle className="size-4" />
                  <span>+ या तारखेसाठी गृहपाठ जोडा (Upload)</span>
                </button>
              )}
            </div>
          </div>

          {/* Content Section: Cards or Clean Empty State */}
          {displayItems.length === 0 ? (
            <div className="py-12 px-4 text-center bg-slate-50/70 dark:bg-slate-850/40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-4">
              <div className={`size-14 rounded-2xl flex items-center justify-center mx-auto shadow-inner ${isAmber ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                <BookOpen className="size-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-black text-slate-800 dark:text-slate-200">
                  {isToday
                    ? "आजचा कोणताही दैनिक गृहपाठ प्रकाशित झालेला नाही"
                    : `दिनांक ${activeDate} साठी कोणताही गृहपाठ प्रकाशित झालेला नाही`}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {`दिनांक ${activeDateFormatted} साठी अद्याप दैनिक गृहपाठ प्रकाशित झालेला नाही. नवीन गृहपाठ तयार करण्यासाठी खालील बटणावर क्लिक करा.`}
                </p>
              </div>
              {userRole === "admin" && onUploadForDate && (
                <button
                  type="button"
                  onClick={() => onUploadForDate(activeDate)}
                  className="mt-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer inline-flex items-center gap-2"
                >
                  <PlusCircle className="size-4" />
                  <span>दैनिक गृहपाठ तयार करा / अपलोड करा</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-850 border-2 border-slate-200/90 dark:border-slate-800 hover:border-amber-500 shadow-sm hover:shadow-md transition-all space-y-3.5 group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-black border border-amber-200 dark:border-amber-800">
                        {item.subject || "सर्व विषय"}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                        इयत्ता {item.class}
                      </span>
                      {item.medium && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-medium">
                          {item.medium === "marathi" ? "मराठी माध्यम" : "सेमी-इंग्रजी"}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200 dark:border-blue-800">
                        {item.variables ? "कार्यपुस्तिका" : "WORD गृहपाठ"}
                      </span>
                    </div>

                    <h4 className="font-black text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-amber-700 transition-colors leading-snug">
                      {item.title}
                    </h4>

                    {item.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold truncate max-w-[180px]">
                      <FileText className="size-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">
                        {item.fileName || (item.variables ? "दैनिक कार्यपुस्तिका" : "गृहपाठ संच")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Share PDF to WhatsApp */}
                      <button
                        type="button"
                        disabled={isSharingPdf}
                        onClick={() => handleDirectSharePdf(item)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-xs active:scale-95 cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                        title="हा गृहपाठ थेट WhatsApp वर पाठवा"
                      >
                        {isSharingPdf ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <MessageCircle className="size-3.5" />
                        )}
                        <span>WhatsApp</span>
                      </button>

                      {/* View / Edit */}
                      <button
                        type="button"
                        onClick={() => onPreviewHomework(item)}
                        className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-black transition-all shadow-xs active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Eye className="size-3.5" />
                        <span>पहा व संपादन</span>
                      </button>

                      {item.fileUrl && (
                        <a
                          href={item.fileUrl}
                          download={item.fileName || "homework.pdf"}
                          className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl transition-all"
                          title="PDF डाउनलोड"
                        >
                          <Download className="size-4" />
                        </a>
                      )}

                      {userRole === "admin" && onDeleteHomework && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteHomework(item.id, item.title);
                          }}
                          className="p-1.5 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95"
                          title="हा गृहपाठ हटवा"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer note */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
              <Sparkles className="size-3.5 text-amber-600 shrink-0" />
              <span>
                गृहपाठावर क्लिक करून तो थेट उघडा, संपादन करा किंवा WhatsApp वर पालकांना पाठवा.
              </span>
            </div>
            {displayItems.length > 0 && (
              <button
                type="button"
                disabled={isSharingPdf}
                onClick={() => handleDirectSharePdf(null)}
                className="text-emerald-700 font-bold hover:underline cursor-pointer flex items-center gap-1 disabled:opacity-50"
              >
                <MessageCircle className="size-3.5 text-emerald-600" />
                <span>या दिवसाचा सर्व गृहपाठ WhatsApp वर पाठवा</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
