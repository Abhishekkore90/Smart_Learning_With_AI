import React, { useState, useEffect, useRef } from "react";
import { format, addDays, subDays } from "date-fns";
import { doc, getDoc, collection, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
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
  Eye,
  Trash2
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { DocumentLivePreview } from "@/components/DocumentLivePreview";
import { useAuth } from "@/hooks/use-auth";

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

function findMatchingEntryForDate(entries: any[], targetIsoDate: string): any | null {
  if (!entries || !Array.isArray(entries) || entries.length === 0) return null;

  const targetParts = targetIsoDate.split("-");
  if (targetParts.length !== 3) return entries[0] || null;

  const targetMonth = parseInt(targetParts[1], 10);
  const targetDay = parseInt(targetParts[2], 10);

  // 1. Match by date string
  for (const entry of entries) {
    if (!entry.date) continue;
    const cleanDate = String(entry.date).trim();

    if (cleanDate === targetIsoDate) return entry;

    const m = cleanDate.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (m) {
      const d = parseInt(m[1], 10);
      const mon = parseInt(m[2], 10);
      if (d === targetDay && mon === targetMonth) return entry;
    }

    const mIso = cleanDate.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (mIso) {
      const mon = parseInt(mIso[2], 10);
      const d = parseInt(mIso[3], 10);
      if (d === targetDay && mon === targetMonth) return entry;
    }
  }

  // 2. Fallback: match by day index (e.g. 1st Aug = index 0, 3rd Aug = index 2)
  const dayIdx = targetDay - 1;
  if (dayIdx >= 0 && dayIdx < entries.length) {
    return entries[dayIdx];
  }

  return entries[0] || null;
}

function extractSingleDayPeriods(allPeriods: PeriodItem[], targetIsoDate: string, activeDate: Date | null): PeriodItem[] {
  if (!allPeriods || !Array.isArray(allPeriods) || allPeriods.length === 0) return [];

  // Group allPeriods into day chunks whenever period resets to "1" or "१"
  const dayChunks: PeriodItem[][] = [];
  let currentChunk: PeriodItem[] = [];

  allPeriods.forEach((item) => {
    const rawP = String(item.period || "").trim().replace(/\.$/, "");
    const isFirstPeriod = (rawP === "1" || rawP === "१") && currentChunk.length > 0;

    if (isFirstPeriod) {
      dayChunks.push(currentChunk);
      currentChunk = [item];
    } else {
      currentChunk.push(item);
    }
  });
  if (currentChunk.length > 0) {
    dayChunks.push(currentChunk);
  }

  if (dayChunks.length <= 1) {
    return allPeriods;
  }

  // Determine which day chunk to display based on selected date
  let dayIdx = 0;
  if (activeDate) {
    dayIdx = Math.max(0, activeDate.getDate() - 1);
  } else if (targetIsoDate) {
    const parts = targetIsoDate.split("-");
    if (parts.length === 3) {
      dayIdx = Math.max(0, parseInt(parts[2], 10) - 1);
    }
  }

  if (dayIdx >= dayChunks.length) {
    dayIdx = dayIdx % dayChunks.length;
  }

  return dayChunks[dayIdx] || dayChunks[0] || [];
}

interface Props {
  selectedClass?: string;
  selectedMedium?: string;
  selectedMonth?: string | null;
  onBack?: () => void;
  schoolProfile?: {
    udiseCode?: string;
    schoolName?: string;
    teacherName?: string;
    headmasterName?: string;
    className?: string;
    academicYear?: string;
  };
}

export const TeacherTodayDiary: React.FC<Props> = ({ 
  selectedClass = "Class 1", 
  selectedMedium = "Marathi",
  selectedMonth = null,
  onBack,
  schoolProfile: propSchoolProfile
}) => {
  const [activeDate, setActiveDate] = useState<Date | null>(null);
  const [todayDiary, setTodayDiary] = useState<DailyDiary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [availableDates, setAvailableDates] = useState<{ dateStr: string; day: string }[]>([]);
  const { user, profile } = useAuth();
  const [localProfile, setLocalProfile] = useState<{
    udiseCode?: string;
    schoolName?: string;
    teacherName?: string;
    headmasterName?: string;
    className?: string;
    academicYear?: string;
  }>({});
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const userEmail = (user?.email || profile?.email || "").toLowerCase().trim();
      const userKey = userEmail ? `teaching_diary_school_profile_${userEmail}` : null;
      const stored = userKey ? localStorage.getItem(userKey) || localStorage.getItem("teaching_diary_school_profile") : localStorage.getItem("teaching_diary_school_profile");
      if (stored) {
        setLocalProfile(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error loading profile:", e);
    }
  }, [user, profile]);

  const activeProfile = {
    udiseCode: propSchoolProfile?.udiseCode || localProfile.udiseCode || "",
    schoolName: propSchoolProfile?.schoolName || localProfile.schoolName || "",
    teacherName: propSchoolProfile?.teacherName || localProfile.teacherName || "",
    headmasterName: propSchoolProfile?.headmasterName || localProfile.headmasterName || "",
    className: propSchoolProfile?.className || localProfile.className || selectedClass,
    academicYear: propSchoolProfile?.academicYear || localProfile.academicYear || "2026-27",
  };
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
          const singleDayPeriods = extractSingleDayPeriods(data.periods || [], isoDate, activeDate);
          setTodayDiary({ ...data, periods: singleDayPeriods });
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

          const singleDayPeriods = extractSingleDayPeriods(periodList, isoDate, activeDate);

          setTodayDiary({
            date: isoDate,
            displayDate: displayFormattedDate,
            day: parsed.day || altData.day || "",
            thought: parsed.thought || "",
            dinvishesh: parsed.dinvishesh || "",
            className: selectedClass,
            medium: selectedMedium,
            periods: singleDayPeriods,
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
        let matchedEntryFromList: any = null;

        snap.docs.forEach((dSnap) => {
          const data = dSnap.data();
          if (data.structuredData && Array.isArray(data.structuredData)) {
            const entry = findMatchingEntryForDate(data.structuredData, isoDate);
            if (entry) {
              matchedEntryFromList = entry;
              masterDoc = { id: dSnap.id, ...data };
            }
          }
          if (!masterDoc && (data.pageUrl || data.masterPdfUrl)) {
            masterDoc = { id: dSnap.id, ...data };
          }
        });

        if (masterDoc && (masterDoc.pageUrl || masterDoc.masterPdfUrl || masterDoc.structuredData)) {
          const entryToUse = matchedEntryFromList || 
            (masterDoc.structuredData ? findMatchingEntryForDate(masterDoc.structuredData, isoDate) : null) || 
            masterDoc.parsedContent || 
            masterDoc;

          let periodList: PeriodItem[] = [];
          if (entryToUse?.periods && Array.isArray(entryToUse.periods) && entryToUse.periods.length > 0) {
            periodList = entryToUse.periods;
          }

          const singleDayPeriods = extractSingleDayPeriods(periodList, isoDate, activeDate);

          setTodayDiary({
            id: masterDoc.id,
            date: isoDate,
            displayDate: displayFormattedDate,
            day: entryToUse?.day || "",
            thought: entryToUse?.thought || "",
            dinvishesh: entryToUse?.dinvishesh || "",
            className: selectedClass,
            medium: selectedMedium,
            periods: singleDayPeriods,
            pageUrl: masterDoc.pageUrl || masterDoc.masterPdfUrl || "",
            fileName: masterDoc.fileName || "Teaching_Diary.docx",
            uploadedAt: masterDoc.uploadedAt || Date.now(),
            structuredData: masterDoc.structuredData,
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
            <td style="text-align:center;font-weight:700;color:#4f46e5;width:3%;font-size:13px">${item.period}</td>
            <td style="font-weight:700;color:#0f172a;width:5%;font-size:13px">${item.subject}</td>
            <td style="font-weight:600;color:#334155;width:8%;font-size:13px">${item.topic}</td>
            <td style="color:#1e293b;line-height:1.5;width:34%;font-size:13px">${item.experience || "-"}</td>
            <td style="color:#475569;width:5%;font-size:13px">${item.tools || "-"}</td>
            <td style="color:#047857;font-weight:600;line-height:1.5;width:45%;font-size:13px">${item.outcome || "-"}</td>
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
    table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; border: 2px solid #475569; }
    thead th { background: #1e293b; color: #fff; padding: 10px 12px; text-align: left; font-size: 13px; font-weight: 800; border: 1.5px solid #475569; }
    tbody td { padding: 10px 12px; border: 1.5px solid #94a3b8; vertical-align: top; line-height: 1.5; font-size: 13px; word-wrap: break-word; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <h1>दैनंदिन पाठ टाचण</h1>
  <p class="subtitle">Daily Teaching Diary</p>
  <div class="meta" style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; gap: 6px; margin: 12px 0; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; font-size: 11px;">
    <div style="border-right: 1px solid #cbd5e1; padding: 4px; text-align: center;">
      <div style="font-size: 9px; color: #ea580c; font-weight: 800; text-transform: uppercase;">यू-डायस कोड</div>
      <div style="font-weight: 800; color: #c2410c; margin-top: 2px;">${activeProfile.udiseCode || "—"}</div>
    </div>
    <div style="border-right: 1px solid #cbd5e1; padding: 4px; text-align: center;">
      <div style="font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase;">वार व दिनांक</div>
      <div style="font-weight: 800; color: #1e293b; margin-top: 2px;">${todayDiary.day || format(activeDate, "eeee")} (${todayDiary.displayDate})</div>
    </div>
    <div style="border-right: 1px solid #cbd5e1; padding: 4px; text-align: center;">
      <div style="font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase;">वर्गशिक्षक</div>
      <div style="font-weight: 800; color: #1e293b; margin-top: 2px;">${activeProfile.teacherName || "—"}</div>
    </div>
    <div style="border-right: 1px solid #cbd5e1; padding: 4px; text-align: center;">
      <div style="font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase;">शाळा</div>
      <div style="font-weight: 800; color: #1e293b; margin-top: 2px;">${activeProfile.schoolName || "—"}</div>
    </div>
    <div style="border-right: 1px solid #cbd5e1; padding: 4px; text-align: center;">
      <div style="font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase;">इयत्ता</div>
      <div style="font-weight: 800; color: #1e293b; margin-top: 2px;">${activeProfile.className || todayDiary.className || selectedClass}</div>
    </div>
    <div style="border-right: 1px solid #cbd5e1; padding: 4px; text-align: center;">
      <div style="font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase;">सन</div>
      <div style="font-weight: 800; color: #047857; margin-top: 2px;">${activeProfile.academicYear || "2026-27"}</div>
    </div>
    <div style="padding: 4px; text-align: center;">
      <div style="font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase;">मुख्याध्यापक</div>
      <div style="font-weight: 800; color: #1e293b; margin-top: 2px;">${activeProfile.headmasterName || "—"}</div>
    </div>
  </div>
  ${todayDiary.thought ? `<div class="thought">💬 आजचा सुविचार: "${todayDiary.thought}"</div>` : ""}
  <table>
    <thead>
      <tr>
        <th style="width:6%;text-align:center">तासिका</th>
        <th style="width:8%">विषय</th>
        <th style="width:11%">घटक / उपघटक</th>
        <th style="width:25%">अध्यापन अनुभव / कृती (अध्ययनाचे स्वरूप)</th>
        <th style="width:7%">साधन तंत्रे / साधने</th>
        <th style="width:43%">अध्ययन निष्पत्ती</th>
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

  // ── Download Handler (Word .doc) ──────────────────────────────────────────
  const handleDownload = () => {
    if (!todayDiary || !activeDate) return;
    const html = buildPrintableHTML();
    const wordHtml = `<!DOCTYPE html>
      <html xmlns:o='urn:schemas-microsoft-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta charset="utf-8" />
        <title>Teaching Diary</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Arial, 'Calibri', 'Segoe UI', 'Nirmala UI', 'Mangal', 'Arial Unicode MS', sans-serif; }
        </style>
      </head>
      <body>${html}</body>
      </html>
    `;
    const blob = new Blob(['\ufeff', wordHtml], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Teaching_Diary_${isoDate}.doc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("✅ Word फाईल (.doc) डाउनलोड झाली!");
  };

  const handleDeleteCurrentFile = async () => {
    if (!todayDiary || !selectedClass || !selectedMedium) return;
    const fileNameDisplay = (todayDiary as any).fileName || todayDiary.displayDate || "ही फाईल";
    if (!confirm(`तुम्हाला नक्की "${fileNameDisplay}" व तिच्या सर्व पाठ टाचण नोंदी डिलीट करायच्या आहेत का?`)) {
      return;
    }

    try {
      const batch = writeBatch(db);
      const targetUrl = todayDiary.pageUrl ? todayDiary.pageUrl.split("?")[0] : "";
      const targetFile = todayDiary.fileName || "";

      // 1. Delete matching docs in teacher_diaries/{selectedClass}/{selectedMedium}
      const colRef = collection(db, "teacher_diaries", selectedClass, selectedMedium);
      const snap = await getDocs(colRef);

      snap.docs.forEach((dSnap) => {
        const data = dSnap.data();
        const rawUrl = data.pageUrl || data.masterPdfUrl || "";
        const docUrl = rawUrl ? rawUrl.split("?")[0] : "";

        if (
          (targetUrl && docUrl === targetUrl) ||
          (targetFile && data.fileName === targetFile) ||
          dSnap.id === isoDate
        ) {
          batch.delete(dSnap.ref);
        }
      });

      // 2. Delete matching docs in teaching_diaries
      const tdColRef = collection(db, "teaching_diaries");
      const tdSnap = await getDocs(tdColRef);
      const prefix = `${selectedClass}_${selectedMedium}_`;

      tdSnap.docs.forEach((dSnap) => {
        if (dSnap.id.startsWith(prefix)) {
          const data = dSnap.data();
          const rawUrl = data.pageUrl || data.masterPdfUrl || "";
          const docUrl = rawUrl ? rawUrl.split("?")[0] : "";

          if (
            (targetUrl && docUrl === targetUrl) ||
            (targetFile && data.fileName === targetFile) ||
            dSnap.id === `${selectedClass}_${selectedMedium}_${isoDate}`
          ) {
            batch.delete(dSnap.ref);
          }
        }
      });

      await batch.commit();

      toast.success(`✅ "${fileNameDisplay}" फाईल व तिच्या सर्व नोंदी यशस्वीरित्या डिलीट झाल्या!`);
      setTodayDiary(null);
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error("फाईल डिलीट करताना अडचण आली: " + (err.message || err));
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6" ref={printRef} suppressHydrationWarning>
      {/* ═══ Single Clean Attractive Control Header Card ═══ */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 sm:p-7 rounded-3xl border border-slate-800 shadow-xl space-y-6 text-white relative overflow-hidden">
        <div className="absolute -right-12 -top-12 size-40 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 size-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Left: Title & Info */}
          <div className="flex items-center gap-3.5">
            <div className="size-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white font-black shadow-lg shadow-orange-500/25 shrink-0">
              <BookOpen className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-white">दैनंदिन पाठ टाचण</h2>
                <span className="px-2.5 py-0.5 bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                  {selectedClass} ({selectedMedium})
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Daily Teaching Plan & Record View</p>
            </div>
          </div>

          {/* Center: Single Date Selector */}
          <div className="flex items-center gap-2 bg-slate-950/90 p-1.5 rounded-2xl border border-slate-800 shadow-inner shrink-0">
            <button
              onClick={handlePrevDay}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 cursor-pointer"
              title="मागील दिवस (Previous Day)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-black cursor-pointer shadow-sm">
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
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 cursor-pointer"
              title="पुढील दिवस (Next Day)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {(todayDiary as any)?.pageUrl && (
              <>
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-orange-500/25 cursor-pointer active:scale-95"
                >
                  <Eye className="size-4" /> <span>दस्तऐवज पहा (View Live)</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCurrentFile}
                  className="p-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-rose-500/25 cursor-pointer active:scale-95"
                  title="फाईल डिलीट करा (Delete Uploaded File)"
                >
                  <Trash2 className="size-4" />
                </button>
              </>
            )}

            {todayDiary && (
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-600/25 cursor-pointer active:scale-95"
              >
                <Download className="size-4" /> <span>PDF डाऊनलोड</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="p-12 rounded-3xl bg-white border border-slate-200/80 text-slate-700 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
          <p className="text-slate-500 font-bold text-sm">निवडलेल्या दिनांकाची टाचण नोंद शोधत आहे... (Fetching Diary Data)</p>
        </div>
      ) : !todayDiary || todayDiary.isHoliday || (todayDiary.periods.length === 0 && !(todayDiary as any).pageUrl) ? (
        /* FALLBACK UI: Holiday or Missing Data */
        <div className="p-10 rounded-3xl bg-white border border-slate-200/80 text-slate-800 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <CalendarOff className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900">
            {activeDate?.getDay() === 0 
              ? "रविवार — शासकीय सुट्टी (Sunday School Holiday)"
              : "या तारखेस टाचण नोंद उपलब्ध नाही (No Teaching Diary Found)"}
          </h3>
          <p className="text-slate-500 max-w-md mx-auto text-sm leading-relaxed">
            {activeDate?.getDay() === 0
              ? "रविवार या दिवशी शासकीय शाळा व महाविद्यालयांना सुट्टी असल्यामुळे कोणतीही टाचण नोंद उपलब्ध नसते."
              : todayDiary?.holidayReason 
                ? todayDiary.holidayReason 
                : `${displayFormattedDate} या दिवसासाठी कोणतीही टाचण नोंद उपलब्ध नाही. दुसरं दिनांक निवडा किंवा टाचण अपलोड करा.`}
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-bold">
            <CalendarIcon className="w-4 h-4 text-orange-500" />
            <span>Selected Date: {displayFormattedDate}</span>
            <span className="mx-1">•</span>
            <span className="text-orange-600 font-extrabold">{selectedClass} ({selectedMedium})</span>
          </div>
        </div>
      ) : (
        /* SUCCESS STATE: Show Selected Date's Diary */
        <div className="space-y-6">
          {/* Info Banner - Clean Profile Info Strip */}
          <div className="p-4.5 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3.5">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 text-center">
              <div className="bg-orange-50/80 p-3 rounded-2xl border border-orange-200/80 flex flex-col justify-center items-center text-center">
                <span className="text-[10px] font-black text-orange-700 uppercase tracking-wider">यू-डायस कोड</span>
                <span className="text-xs md:text-sm font-black text-orange-900 mt-0.5">{activeProfile.udiseCode || "—"}</span>
              </div>
              <div className="bg-indigo-50/80 p-3 rounded-2xl border border-indigo-200/80 flex flex-col justify-center items-center text-center">
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">वार व दिनांक</span>
                <span className="text-xs md:text-sm font-black text-indigo-950 mt-0.5">{todayDiary.day || format(activeDate ?? new Date(), "eeee")}</span>
                <span className="text-[10px] font-bold text-indigo-600">{todayDiary.displayDate}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col justify-center items-center text-center">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">वर्गशिक्षक</span>
                <span className="text-xs md:text-sm font-black text-slate-800 mt-0.5 truncate max-w-full">{activeProfile.teacherName || "—"}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col justify-center items-center text-center">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">शाळा</span>
                <span className="text-xs md:text-sm font-black text-slate-800 mt-0.5 truncate max-w-full">{activeProfile.schoolName || "—"}</span>
              </div>
              <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200/80 flex flex-col justify-center items-center text-center">
                <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">इयत्ता</span>
                <span className="text-xs md:text-sm font-black text-amber-900 mt-0.5">{activeProfile.className || todayDiary.className || selectedClass}</span>
              </div>
              <div className="bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200/80 flex flex-col justify-center items-center text-center">
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">सन</span>
                <span className="text-xs md:text-sm font-black text-emerald-900 mt-0.5">{activeProfile.academicYear || "2026-27"}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col justify-center items-center text-center">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">मुख्याध्यापक</span>
                <span className="text-xs md:text-sm font-black text-slate-800 mt-0.5 truncate max-w-full">{activeProfile.headmasterName || "—"}</span>
              </div>
            </div>

            {(todayDiary.dinvishesh || todayDiary.thought) && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                {todayDiary.dinvishesh && (
                  <div className="flex items-center gap-2 text-amber-900 bg-amber-50 px-3.5 py-1.5 rounded-xl border border-amber-200/80 font-bold">
                    <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
                    <span><strong>दिनविशेष:</strong> {todayDiary.dinvishesh}</span>
                  </div>
                )}
                {todayDiary.thought && (
                  <div className="flex items-center gap-2 text-slate-700 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200/80 italic font-semibold">
                    <BookOpen className="w-4 h-4 shrink-0 text-indigo-500" />
                    <span>"{todayDiary.thought}"</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Periods Table */}
          {todayDiary.periods && todayDiary.periods.length > 0 && (
            <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm space-y-0">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  दैनिक तासिका नियोजन (Daily Period Plan)
                </h3>
                <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-3 py-1 rounded-full font-black">
                  {todayDiary.periods.length} तासिका (Periods)
                </span>
              </div>

              <div className="overflow-x-auto no-scrollbar p-2">
                <table className="w-full text-left text-sm text-slate-800 border-collapse table-fixed border-2 border-slate-300 rounded-2xl overflow-hidden shadow-sm">
                  <colgroup>
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "11%" }} />
                    <col style={{ width: "25%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "43%" }} />
                  </colgroup>
                  <thead className="bg-slate-100 text-slate-900 uppercase text-xs md:text-sm tracking-wider font-black border-b-2 border-slate-300">
                    <tr>
                      <th style={{ width: "6%" }} className="py-3 px-1.5 text-center border-r-2 border-slate-300 bg-slate-200 text-slate-900 break-words leading-tight">तासिका</th>
                      <th style={{ width: "8%" }} className="py-3 px-1.5 border-r-2 border-slate-300 bg-slate-100 break-words leading-tight">विषय</th>
                      <th style={{ width: "11%" }} className="py-3 px-2 border-r-2 border-slate-300 bg-slate-100 break-words leading-tight">घटक / उपघटक</th>
                      <th style={{ width: "25%" }} className="py-3 px-3 border-r-2 border-slate-300 bg-slate-100 break-words leading-tight">अध्ययनाचे स्वरूप (अनुभव / कृती)</th>
                      <th style={{ width: "7%" }} className="py-3 px-1.5 border-r-2 border-slate-300 bg-slate-100 break-words leading-tight">साधन तंत्रे / साधने</th>
                      <th style={{ width: "43%" }} className="py-3 px-3 bg-slate-100 break-words leading-tight">अध्ययन निष्पत्ती</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-slate-200 text-sm md:text-base font-medium">
                    {todayDiary.periods.map((item, idx) => (
                      <tr key={idx} className="hover:bg-orange-50/30 transition-colors border-b-2 border-slate-200">
                        <td className="py-4 px-3 text-center font-black text-indigo-700 align-top border-r-2 border-slate-200 bg-indigo-50/40">
                          <span className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 inline-flex items-center justify-center text-sm font-black text-indigo-800">
                            {item.period}
                          </span>
                        </td>
                        <td className="py-4 px-3.5 font-extrabold text-slate-900 text-sm md:text-base align-top border-r-2 border-slate-200">
                          {item.subject}
                        </td>
                        <td className="py-4 px-3.5 text-indigo-900 font-bold text-sm md:text-base leading-snug align-top border-r-2 border-slate-200">
                          {item.topic}
                        </td>
                        <td className="py-4 px-4 text-slate-800 leading-relaxed text-sm md:text-base font-normal align-top border-r-2 border-slate-200">
                          {item.experience || "-"}
                        </td>
                        <td className="py-4 px-3.5 text-slate-700 text-sm md:text-base align-top border-r-2 border-slate-200">
                          {item.tools ? (
                            <span className="inline-block px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200 text-xs md:text-sm font-bold text-slate-800 leading-relaxed">
                              {item.tools}
                            </span>
                          ) : "-"}
                        </td>
                        <td className="py-4 px-4 text-emerald-800 font-bold text-sm md:text-base leading-relaxed align-top">
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
                  structuredData: (todayDiary as any).structuredData,
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
