import React, { useState, useEffect, useRef } from "react";
import { format, addDays, subDays } from "date-fns";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  Calendar as CalendarIcon, 
  BookOpen, 
  Sparkles, 
  Sun, 
  CalendarOff,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Printer,
  Download
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

interface PeriodItem {
  period: string;
  subject: string;
  topic: string;
  experience: string;
  tools: string;
  outcome: string;
}

interface DailyDiary {
  date: string;
  displayDate: string;
  day: string;
  thought: string;
  dinvishesh: string;
  className: string;
  medium: string;
  isHoliday?: boolean;
  holidayReason?: string;
  periods: PeriodItem[];
}

interface Props {
  selectedClass?: string;
  selectedMedium?: string;
}

export const TeacherTodayDiary: React.FC<Props> = ({ 
  selectedClass = "Class 1", 
  selectedMedium = "Marathi" 
}) => {
  const [activeDate, setActiveDate] = useState<Date | null>(null);
  const [todayDiary, setTodayDiary] = useState<DailyDiary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Initialize date client-side only to avoid SSR hydration mismatch
  useEffect(() => {
    if (!activeDate) {
      setActiveDate(new Date());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isoDate = activeDate ? format(activeDate, "yyyy-MM-dd") : "";
  const displayFormattedDate = activeDate ? format(activeDate, "eeee, dd MMMM yyyy") : "...";
  const isToday = activeDate ? format(new Date(), "yyyy-MM-dd") === isoDate : false;

  useEffect(() => {
    async function fetchDiaryForDate() {
      if (!isoDate) return; // not yet initialized client-side
      setLoading(true);
      try {
        const docId = `${selectedClass}_${selectedMedium}_${isoDate}`;
        const docRef = doc(db, "teaching_diaries", docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setTodayDiary(docSnap.data() as DailyDiary);
        } else {
          setTodayDiary(null);
        }
      } catch (err) {
        console.error("Failed to load teaching diary:", err);
        setTodayDiary(null);
      } finally {
        setLoading(false);
      }
    }

    fetchDiaryForDate();
  }, [selectedClass, selectedMedium, isoDate]);

  const handlePrevDay = () => setActiveDate((prev) => subDays(prev ?? new Date(), 1));
  const handleNextDay = () => setActiveDate((prev) => addDays(prev ?? new Date(), 1));
  const handleResetToday = () => setActiveDate(new Date());

  // ── Build the printable HTML content ─────────────────────────────────────
  const buildPrintableHTML = () => {
    if (!todayDiary || !activeDate) return "";
    const rows = todayDiary.periods
      .map(
        (item, idx) =>
          `<tr style="background:${idx % 2 === 0 ? "#fff" : "#f9fafb"}">
            <td style="text-align:center;font-weight:700;color:#4f46e5">${item.period}</td>
            <td style="font-weight:600">${item.subject}</td>
            <td>${item.topic}</td>
            <td>${item.experience || "-"}</td>
            <td>${item.tools || "-"}</td>
            <td style="color:#059669">${item.outcome || "-"}</td>
          </tr>`
      )
      .join("");

    return `<!DOCTYPE html>
<html lang="mr">
<head>
  <meta charset="UTF-8" />
  <title>दैनंदिन पाठ टाचण — ${todayDiary.displayDate}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Noto Sans Devanagari', sans-serif; background: #fff; color: #1e293b; padding: 24px; }
    h1 { font-size: 22px; font-weight: 900; text-align: center; margin-bottom: 4px; }
    .subtitle { text-align: center; font-size: 12px; color: #64748b; margin-bottom: 6px; }
    .meta { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin: 12px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; font-size: 12px; }
    .meta span { font-weight: 700; color: #0f172a; }
    .thought { margin: 10px 0 16px; padding: 10px 14px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 6px; font-size: 12px; font-style: italic; color: #92400e; }
    table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
    thead th { background: #1e293b; color: #fff; padding: 9px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
    tbody td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; line-height: 1.4; }
    tbody tr:last-child td { border-bottom: none; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <h1>दैनंदिन पाठ टाचण</h1>
  <p class="subtitle">Daily Teaching Diary</p>
  <div class="meta">
    <div>दिनांक: <span>${todayDiary.displayDate}</span></div>
    <div>वार: <span>${todayDiary.day || format(activeDate, "eeee")}</span></div>
    <div>इयत्ता: <span>${todayDiary.className || selectedClass}</span></div>
    <div>माध्यम: <span>${todayDiary.medium || selectedMedium}</span></div>
  </div>
  ${todayDiary.thought ? `<div class="thought">💬 आजचा सुविचार: "${todayDiary.thought}"</div>` : ""}
  <table>
    <thead>
      <tr>
        <th style="width:60px">तासिका</th>
        <th>विषय</th>
        <th>घटक / उपघटक</th>
        <th>अध्यापन अनुभव / कृती</th>
        <th>साधने</th>
        <th>अध्ययन निष्पत्ती</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
  };

  // ── Print Handler ─────────────────────────────────────────────────────────
  const handlePrint = () => {
    if (!todayDiary || !activeDate) return;
    const html = buildPrintableHTML();
    const printWindow = window.open("", "_blank", "width=900,height=650");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 600);
  };

  // ── Download Handler ──────────────────────────────────────────────────────
  const handleDownload = () => {
    if (!todayDiary || !activeDate) return;
    const html = buildPrintableHTML();
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Teaching_Diary_${todayDiary.displayDate?.replace(/[/\\:]/g, "-") || isoDate}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6" ref={printRef} suppressHydrationWarning>
      {/* Top Controls & Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sun className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              {isToday ? "आजची टाचणवही (Today's Teaching Diary)" : "टाचणवही पाहणी (Teaching Diary)"}
              {isToday && (
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Today
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              {selectedClass} • {selectedMedium} Medium
            </p>
          </div>
        </div>

        {/* Date Selector, Nav Buttons & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={handlePrevDay}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
            title="मागील दिवस (Previous Day)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium">
                <CalendarIcon className="w-4 h-4 text-indigo-400" />
                <span>{displayFormattedDate}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-800" align="center">
              <CalendarComponent
                mode="single"
                selected={activeDate ?? undefined}
                onSelect={(d) => {
                  if (d) {
                    setActiveDate(d);
                    setIsCalendarOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <button
            onClick={handleNextDay}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
            title="पुढील दिवस (Next Day)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {!isToday && (
            <button
              onClick={handleResetToday}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Today</span>
            </button>
          )}

          {/* ── Print & Download ── */}
          {todayDiary && !loading && (
            <>
              <button
                onClick={handleDownload}
                title="Download as HTML file"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
              <button
                onClick={handlePrint}
                title="Print Teaching Diary"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
            </>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-2xl flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-400 mb-4" />
          <p className="text-slate-400 font-medium text-sm">टाचणवही लोड होत आहे... (Fetching Diary Data)</p>
        </div>
      ) : !todayDiary || todayDiary.isHoliday || todayDiary.periods.length === 0 ? (
        /* FALLBACK UI: Holiday or Missing Data */
        <div className="p-10 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 text-white shadow-xl text-center">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarOff className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-100 mb-2">
            या तारखेस टाचण नोंद उपलब्ध नाही (No Teaching Diary Found)
          </h3>
          <p className="text-slate-400 max-w-md mx-auto mb-6 text-sm leading-relaxed">
            {todayDiary?.holidayReason 
              ? todayDiary.holidayReason 
              : `${displayFormattedDate} या दिवसासाठी कोणतेही टाचण उपलब्ध नाही किंवा शासकीय सुट्टी असू शकते.`}
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/80 border border-slate-700/50 rounded-lg text-xs text-slate-300">
            <CalendarIcon className="w-4 h-4 text-indigo-400" />
            <span>Selected Date: {displayFormattedDate}</span>
            <span className="mx-1">•</span>
            <span className="text-indigo-400 font-semibold">{selectedClass} ({selectedMedium})</span>
          </div>
        </div>
      ) : (
        /* SUCCESS STATE: Render Today's Diary Table & Metadata */
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/40 border border-indigo-500/30 text-white shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                  {todayDiary.day || format(activeDate ?? new Date(), "eeee")}
                </span>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-0.5">
                  {todayDiary.displayDate}
                </h1>
                <p className="text-slate-400 text-xs mt-1">
                  इयत्ता: <span className="text-slate-200 font-medium">{todayDiary.className}</span> | माध्यम: <span className="text-slate-200 font-medium">{todayDiary.medium}</span>
                </p>
              </div>

              {/* Dinvishesh & Thought */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 max-w-md space-y-2 text-xs">
                {todayDiary.dinvishesh && (
                  <div className="flex items-start gap-2 text-amber-300">
                    <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                    <span><strong>दिनविशेष:</strong> {todayDiary.dinvishesh}</span>
                  </div>
                )}
                {todayDiary.thought && (
                  <div className="flex items-start gap-2 text-slate-300 italic">
                    <BookOpen className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
                    <span>"{todayDiary.thought}"</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Periods Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <h3 className="font-semibold text-slate-200 text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                दैनिक तासिका नियोजन (Daily Period Plan)
              </h3>
              <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full font-medium">
                {todayDiary.periods.length} Periods
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 w-16 text-center">तासिका</th>
                    <th className="py-3 px-4">विषय</th>
                    <th className="py-3 px-4">घटक / उपघटक</th>
                    <th className="py-3 px-4">अध्यापन अनुभव / कृती</th>
                    <th className="py-3 px-4">शैक्षणिक साधने</th>
                    <th className="py-3 px-4">अध्ययन निष्पत्ती</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {todayDiary.periods.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-4 text-center font-bold text-indigo-400">
                        <span className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/20 inline-flex items-center justify-center">
                          {item.period}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-semibold text-white">
                        {item.subject}
                      </td>
                      <td className="py-4 px-4 text-indigo-200 font-medium">
                        {item.topic}
                      </td>
                      <td className="py-4 px-4 text-slate-300 leading-relaxed">
                        {item.experience || "-"}
                      </td>
                      <td className="py-4 px-4 text-slate-400">
                        {item.tools ? (
                          <span className="inline-block px-2.5 py-1 bg-slate-800 rounded border border-slate-700 text-xs">
                            {item.tools}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="py-4 px-4 text-emerald-400/90 text-xs font-medium">
                        {item.outcome || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
