import React, { useState, useEffect, useRef } from "react";
import { format, addDays, subDays } from "date-fns";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
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
  Download,
  ArrowLeft,
  FileText,
  Eye
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { DocumentLivePreview } from "@/components/DocumentLivePreview";

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
  pageUrl?: string;
  fileName?: string;
  uploadedAt?: number;
}

interface Props {
  selectedClass?: string;
  selectedMedium?: string;
  selectedMonth?: string | null;
  onBack?: () => void;
}

export const TeacherTodayDiary: React.FC<Props> = ({ 
  selectedClass = "Class 1", 
  selectedMedium = "Marathi",
  selectedMonth = null,
  onBack
}) => {
  const [activeDate, setActiveDate] = useState<Date | null>(null);
  const [todayDiary, setTodayDiary] = useState<DailyDiary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const [availableDates, setAvailableDates] = useState<{ dateStr: string; day: string }[]>([]);

  // Discover all available uploaded dates for the selected Class & Medium
  useEffect(() => {
    async function discoverAvailableDates() {
      try {
        const foundDates = new Set<string>();

        // Query teacher_diaries collection
        const colRef = collection(db, "teacher_diaries", selectedClass, selectedMedium);
        const snap = await getDocs(colRef);
        snap.docs.forEach((dSnap) => {
          const data = dSnap.data();
          const dStr = data.diaryDate || dSnap.id;
          if (dStr && dStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            if (!selectedMonth || dStr.split("-")[1] === selectedMonth) {
              foundDates.add(dStr);
            }
          }
        });

        // Also query teaching_diaries collection
        const tdColRef = collection(db, "teaching_diaries");
        const tdSnap = await getDocs(tdColRef);
        tdSnap.docs.forEach((dSnap) => {
          const id = dSnap.id;
          const prefix = `${selectedClass}_${selectedMedium}_`;
          if (id.startsWith(prefix)) {
            const dStr = id.replace(prefix, "");
            if (dStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
              if (!selectedMonth || dStr.split("-")[1] === selectedMonth) {
                foundDates.add(dStr);
              }
            }
          }
        });

        const dateArray = Array.from(foundDates).sort();
        if (dateArray.length > 0) {
          const daysOfWeek = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
          const formatted = dateArray.map((dStr) => {
            const parts = dStr.split("-");
            const dObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            const dayName = !isNaN(dObj.getTime()) ? daysOfWeek[dObj.getDay()] : "";
            return { dateStr: dStr, day: dayName };
          });
          setAvailableDates(formatted);

          // If activeDate has no record or belongs to another month, auto-select the first available date!
          const currentIso = activeDate ? format(activeDate, "yyyy-MM-dd") : "";
          if (!activeDate || !foundDates.has(currentIso)) {
            const firstDateStr = dateArray[0];
            const parts = firstDateStr.split("-");
            const firstDateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            if (!isNaN(firstDateObj.getTime())) {
              setActiveDate(firstDateObj);
            }
          }
        } else if (!activeDate) {
          setActiveDate(new Date());
        }
      } catch (e) {
        console.error("Error discovering available dates:", e);
        if (!activeDate) setActiveDate(new Date());
      }
    }

    discoverAvailableDates();
  }, [selectedClass, selectedMedium, selectedMonth]);

  const isoDate = activeDate ? format(activeDate, "yyyy-MM-dd") : "";
  const displayFormattedDate = activeDate ? format(activeDate, "eeee, dd MMMM yyyy") : "...";
  const isToday = activeDate ? format(new Date(), "yyyy-MM-dd") === isoDate : false;

  useEffect(() => {
    async function fetchDiaryForDate() {
      if (!isoDate) return; // not yet initialized client-side
      setLoading(true);

      // Sunday Check: Government schools are closed on Sunday, do NOT fetch or display Sunday data.
      if (activeDate && activeDate.getDay() === 0) {
        setTodayDiary(null);
        setLoading(false);
        return;
      }

      try {
        // 1. Check primary teaching_diaries collection
        const docId = `${selectedClass}_${selectedMedium}_${isoDate}`;
        const docRef = doc(db, "teaching_diaries", docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as DailyDiary;
          setTodayDiary(data);
          setLoading(false);
          return;
        }

        // 2. Fallback check teacher_diaries collection (teacher_diaries/{selectedClass}/{selectedMedium}/{isoDate})
        const altRef = doc(db, "teacher_diaries", selectedClass, selectedMedium, isoDate);
        const altSnap = await getDoc(altRef);

        if (altSnap.exists()) {
          const altData = altSnap.data();
          const parsed = altData.parsedContent || altData;
          
          let periodList: PeriodItem[] = [];
          if (parsed.periods && Array.isArray(parsed.periods) && parsed.periods.length > 0) {
            periodList = parsed.periods;
          } else if (parsed.subject || parsed.topic) {
            periodList = [{
              period: parsed.period || "1",
              subject: parsed.subject || "-",
              topic: parsed.topic || "-",
              experience: parsed.experience || "-",
              tools: parsed.tools || "-",
              outcome: parsed.outcome || "-",
            }];
          }

          setTodayDiary({
            date: isoDate,
            displayDate: displayFormattedDate,
            day: parsed.day || altData.day || "",
            thought: parsed.thought || "",
            dinvishesh: parsed.dinvishesh || "",
            className: selectedClass,
            medium: selectedMedium,
            periods: periodList,
            pageUrl: altData.pageUrl || altData.masterPdfUrl || parsed.pageUrl || "",
            fileName: altData.fileName || parsed.fileName || "Teaching_Diary.docx",
            uploadedAt: altData.uploadedAt || Date.now(),
          } as any);
          setLoading(false);
          return;
        }

        // 3. Fallback: Search all uploaded records for selectedClass & selectedMedium for an uploaded file
        const colRef = collection(db, "teacher_diaries", selectedClass, selectedMedium);
        const snap = await getDocs(colRef);
        
        let masterDoc: any = null;
        snap.docs.forEach((dSnap) => {
          const data = dSnap.data();
          const dStr = data.diaryDate || dSnap.id;
          if (dStr === "master_diary" || (selectedMonth && dStr.split("-")[1] === selectedMonth) || data.pageUrl || data.masterPdfUrl) {
            if (!masterDoc || (data.uploadedAt && data.uploadedAt > (masterDoc.uploadedAt || 0))) {
              masterDoc = { id: dSnap.id, ...data };
            }
          }
        });

        if (masterDoc && (masterDoc.pageUrl || masterDoc.masterPdfUrl)) {
          const parsed = masterDoc.parsedContent || masterDoc;
          let periodList: PeriodItem[] = [];
          if (parsed.periods && Array.isArray(parsed.periods) && parsed.periods.length > 0) {
            periodList = parsed.periods;
          }

          setTodayDiary({
            date: isoDate,
            displayDate: displayFormattedDate,
            day: parsed.day || "",
            thought: parsed.thought || "",
            dinvishesh: parsed.dinvishesh || "",
            className: selectedClass,
            medium: selectedMedium,
            periods: periodList,
            pageUrl: masterDoc.pageUrl || masterDoc.masterPdfUrl || "",
            fileName: masterDoc.fileName || "Teaching_Diary.docx",
            uploadedAt: masterDoc.uploadedAt || Date.now(),
          } as any);
          setLoading(false);
          return;
        }

        setTodayDiary(null);
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
      {/* ═══ Single Clean Attractive Control Header Card ═══ */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Info */}
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer border border-white/10 shrink-0"
              title="मागे जा (Back)"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
            <Sun className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              टाचणवही पाहणी (Teaching Diary)
            </h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              {selectedClass} • {selectedMedium} Medium
            </p>
          </div>
        </div>

        {/* Center: Single Date Selector */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
          <button
            onClick={handlePrevDay}
            className="p-2 rounded-xl bg-slate-850 hover:bg-slate-750 text-slate-300 transition-colors border border-slate-750 cursor-pointer"
            title="मागील दिवस (Previous Day)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-extrabold cursor-pointer shadow-sm">
                <CalendarIcon className="w-4 h-4 text-amber-400" />
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
            className="p-2 rounded-xl bg-slate-850 hover:bg-slate-750 text-slate-300 transition-colors border border-slate-750 cursor-pointer"
            title="पुढील दिवस (Next Day)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {(todayDiary as any)?.pageUrl && (
            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-orange-500/20 cursor-pointer"
            >
              <Eye className="size-4" /> <span>दस्तऐवज पहा (View Live)</span>
            </button>
          )}

          {todayDiary && (
            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Download className="size-4" /> <span>PDF डाऊनलोड</span>
            </button>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-400 mb-4" />
          <p className="text-slate-400 font-medium text-sm">निवडलेल्या दिनांकाची टाचण नोंद शोधत आहे... (Fetching Diary Data)</p>
        </div>
      ) : !todayDiary || todayDiary.isHoliday || (todayDiary.periods.length === 0 && !(todayDiary as any).pageUrl) ? (
        /* FALLBACK UI: Holiday or Missing Data */
        <div className="p-10 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 text-white shadow-xl text-center space-y-4">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-2">
            <CalendarOff className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-100">
            {activeDate?.getDay() === 0 
              ? "रविवार — शासकीय सुट्टी (Sunday School Holiday)"
              : "या तारखेस टाचण नोंद उपलब्ध नाही (No Teaching Diary Found)"}
          </h3>
          <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
            {activeDate?.getDay() === 0
              ? "रविवार या दिवशी शासकीय शाळा व महाविद्यालयांना सुट्टी असल्यामुळे कोणतीही टाचण नोंद उपलब्ध नसते."
              : todayDiary?.holidayReason 
                ? todayDiary.holidayReason 
                : `${displayFormattedDate} या दिवसासाठी कोणतीही टाचण नोंद उपलब्ध नाही. दुसरं दिनांक निवडा किंवा टाचण अपलोड करा.`}
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/80 border border-slate-700/50 rounded-xl text-xs text-slate-300">
            <CalendarIcon className="w-4 h-4 text-indigo-400" />
            <span>Selected Date: {displayFormattedDate}</span>
            <span className="mx-1">•</span>
            <span className="text-indigo-400 font-semibold">{selectedClass} ({selectedMedium})</span>
          </div>
        </div>
      ) : (
        /* SUCCESS STATE: Show Selected Date's Diary */
        <div className="space-y-6">
          {/* Suvichar & Dinvishesh Header if available */}
          {(todayDiary.dinvishesh || todayDiary.thought) && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {todayDiary.dinvishesh && (
                <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span><strong>दिनविशेष:</strong> {todayDiary.dinvishesh}</span>
                </div>
              )}
              {todayDiary.thought && (
                <div className="flex items-center gap-2 text-slate-300 italic text-xs">
                  <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>"{todayDiary.thought}"</span>
                </div>
              )}
            </div>
          )}



          {/* Periods Table (if periods present) */}
          {todayDiary.periods && todayDiary.periods.length > 0 && (
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
          )}
        </div>
      )}

      {/* Document Live Preview Modal */}
      {isPreviewModalOpen && todayDiary && (todayDiary as any).pageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-[96vw] border border-slate-100 flex flex-col h-[93vh]">
            <div className="flex-1 overflow-hidden bg-slate-100 p-2 sm:p-4">
              <DocumentLivePreview
                selectedFile={null}
                savedRecord={{
                  id: (todayDiary as any).id || isoDate,
                  diaryDate: isoDate,
                  fileName: (todayDiary as any).fileName || "Teaching_Diary.docx",
                  pageUrl: (todayDiary as any).pageUrl,
                  className: selectedClass,
                  medium: selectedMedium,
                }}
                onBack={() => setIsPreviewModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
