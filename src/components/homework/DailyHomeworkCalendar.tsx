import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import type { HomeworkItem } from "@/types/documentEditor";
import { directShareHomeworkPdfToWhatsApp } from "@/utils/homeworkPdfShare";
import type { HomeworkHeaderProfile } from "@/utils/homeworkDocHelper";

const MARATHI_MONTHS = [
  "जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून",
  "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"
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
  accentColor = "emerald",
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
        // YYYY-MM-DD
        return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
      } else {
        // DD-MM-YYYY
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

  // Filter homework items for the active date (today or chosen date)
  // Shows all previous dates, up to tomorrow (next day), but restricts days ahead
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

  return (
    <div className="w-full space-y-4">
      {/* Today / Selected Day Homework Container - Full Width & Clean without Calendar Matrix */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-sm flex flex-col space-y-4">
        {/* Header Bar */}
        <div className="border-b border-slate-100 pb-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-2xs border ${
                  isToday
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                    : activeDate === tomorrowStr
                    ? "bg-indigo-100 text-indigo-900 border-indigo-300"
                    : "bg-amber-100 text-amber-900 border-amber-300"
                }`}
              >
                <CalendarIcon className="size-3.5 text-emerald-700" />
                <span>
                  {isToday
                    ? "आजचा दिनांक (TODAY'S DATE)"
                    : activeDate === tomorrowStr
                    ? "उद्याचा दिनांक (NEXT DAY)"
                    : "निवडलेली तारीख (SELECTED DATE)"}
                </span>
              </span>

              <span className="text-xs font-bold text-slate-500">
                {displayItems.length} गृहपाठ उपलब्ध
              </span>

              {/* If viewing a past/future date, quick button to switch back to Today */}
              {!isToday && onSelectDate && (
                <button
                  type="button"
                  onClick={() => onSelectDate(todayStr)}
                  className="px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer"
                  title="आजच्या गृहपाठावर परत जा"
                >
                  <RotateCcw className="size-3" />
                  <span>आजचा गृहपाठ दाखवा (Show Today)</span>
                </button>
              )}
            </div>

            {/* Direct WhatsApp Share All Displayed Homework */}
            {displayItems.length > 0 && (
              <button
                type="button"
                disabled={isSharingPdf}
                onClick={() => handleDirectSharePdf(null)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-xs font-black flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-60"
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

          <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
                <span>{activeDateFormatted}</span>
                {isToday ? (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs">
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
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isToday ? "आजचा अधिकृत दैनिक गृहपाठ संच" : activeDate === tomorrowStr ? "उद्याचा अधिकृत दैनिक गृहपाठ संच" : "या तारखेचा दैनिक गृहपाठ संच"} • {selectedClass ? `इयत्ता ${selectedClass}` : ""} {selectedMedium === "semi" ? "(सेमी-इंग्रजी माध्यम)" : "(मराठी माध्यम)"}
              </p>
            </div>

            {/* Admin Upload Button */}
            {userRole === "admin" && onUploadForDate && (
              <button
                type="button"
                onClick={() => onUploadForDate(activeDate)}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-black shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <PlusCircle className="size-4" />
                <span>+ या तारखेसाठी गृहपाठ जोडा (Upload)</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Section: Cards or Empty State */}
        {displayItems.length === 0 ? (
          <div className="py-12 px-4 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-300 space-y-3">
            <div className="size-14 rounded-2xl bg-amber-100/70 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
              <BookOpen className="size-7" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-black text-slate-800">
                {activeDate > tomorrowStr
                  ? "पुढील दिवसांचा गृहपाठ उपलब्ध नाही"
                  : isToday
                  ? "आजचा कोणताही दैनिक गृहपाठ प्रकाशित झालेला नाही"
                  : activeDate === tomorrowStr
                  ? "उद्याचा कोणताही दैनिक गृहपाठ प्रकाशित झालेला नाही"
                  : "या तारखेसाठी कोणताही दैनिक गृहपाठ प्रकाशित झालेला नाही"}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {activeDate > tomorrowStr
                  ? "आपण मागील सर्व तारखांचा किंवा केवळ उद्यापर्यंतचा (Next Day) गृहपाठ पाहू शकता."
                  : `दिनांक ${activeDateFormatted} साठी अद्याप दैनिक गृहपाठ प्रकाशित झालेला नाही.`}
              </p>
            </div>
            {userRole === "admin" && onUploadForDate && (
              <button
                type="button"
                onClick={() => onUploadForDate(activeDate)}
                className="mt-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
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
                className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-slate-200/90 hover:border-emerald-500 shadow-sm hover:shadow-md transition-all space-y-3.5 group flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-200">
                      {item.subject || "सर्व विषय"}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                      {item.class}
                    </span>
                    {item.medium && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium">
                        {item.medium === "marathi" ? "मराठी माध्यम" : "सेमी-इंग्रजी"}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                      {item.variables ? "कार्यपुस्तिका" : "WORD गृहपाठ"}
                    </span>
                  </div>

                  <h4 className="font-black text-base sm:text-lg text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug">
                    {item.title}
                  </h4>

                  {item.description && (
                    <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold truncate max-w-[200px]">
                    <FileText className="size-3.5 text-emerald-600 shrink-0" />
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
                      <span>WhatsApp वर पाठवा</span>
                    </button>

                    {/* View / Edit */}
                    <button
                      type="button"
                      onClick={() => onPreviewHomework(item)}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-xs active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Eye className="size-3.5" />
                      <span>पहा व संपादन करा</span>
                    </button>

                    {item.fileUrl && (
                      <a
                        href={item.fileUrl}
                        download={item.fileName || "homework.pdf"}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
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
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <Sparkles className="size-3.5 text-emerald-600 shrink-0" />
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
  );
}
