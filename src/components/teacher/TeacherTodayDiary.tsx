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
import { parseAndStandardizeDate } from "@/lib/parse-diary-file";
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

function calculateWorkingDayIndex(year: number, month: number, day: number): number {
  let workingCount = 0;
  for (let d = 1; d <= day; d++) {
    const testD = new Date(year, month - 1, d);
    if (testD.getDay() !== 0) { // Skip Sundays
      workingCount++;
    }
  }
  return Math.max(0, workingCount - 1);
}

function getWorkingDatesRange(startDateStr: string, count: number): string[] {
  const result: string[] = [];
  if (!startDateStr || !startDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return result;

  const parts = startDateStr.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const cursor = new Date(year, month, day);

  while (result.length < count) {
    if (cursor.getDay() !== 0) { // Skip Sundays
      result.push(format(cursor, "yyyy-MM-dd"));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

function findMatchingEntryForDate(entries: any[], targetIsoDate: string): any | null {
  if (!entries || !Array.isArray(entries) || entries.length === 0) return null;

  const targetParts = targetIsoDate.split("-");
  if (targetParts.length !== 3) return null;

  const targetYear = parseInt(targetParts[0], 10);
  const targetMonth = parseInt(targetParts[1], 10);
  const targetDay = parseInt(targetParts[2], 10);

  // 1. Strict match by date string
  for (const entry of entries) {
    if (!entry.date && !entry.displayDate) continue;
    const cleanDate = String(entry.date || entry.displayDate).trim();
    const stdDate = parseAndStandardizeDate(cleanDate);

    if (stdDate === targetIsoDate || cleanDate === targetIsoDate) return entry;

    const m = cleanDate.match(/^(\d{1,4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,4})$/);
    if (m) {
      let d = 0, mon = 0;
      if (m[1].length === 4) {
        mon = parseInt(m[2], 10);
        d = parseInt(m[3], 10);
      } else {
        d = parseInt(m[1], 10);
        mon = parseInt(m[2], 10);
      }
      if (d === targetDay && mon === targetMonth) return entry;
    }
  }

  return null;
}

function extractSingleDayPeriods(allPeriods: PeriodItem[], targetIsoDate: string, activeDate: Date | null): PeriodItem[] {
  if (!allPeriods || !Array.isArray(allPeriods) || allPeriods.length === 0) return [];

  // Count how many times period number resets to "1" or "१"
  let resetCount = 0;
  allPeriods.forEach((item) => {
    const rawP = String(item.period || "").trim().replace(/\.$/, "");
    if (rawP === "1" || rawP === "१") {
      resetCount++;
    }
  });

  // If period "1" occurs at most ONCE, allPeriods belongs to a single day (e.g. 9 periods on 12/8/2026)! Return ALL periods.
  if (resetCount <= 1) {
    return allPeriods;
  }

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

  // Determine which day chunk to display based on selected date (skipping Sundays)
  let dayIdx = 0;
  if (activeDate) {
    dayIdx = calculateWorkingDayIndex(activeDate.getFullYear(), activeDate.getMonth() + 1, activeDate.getDate());
  } else if (targetIsoDate) {
    const parts = targetIsoDate.split("-");
    if (parts.length === 3) {
      dayIdx = calculateWorkingDayIndex(parseInt(parts[0], 10), parseInt(parts[1], 10), parseInt(parts[2], 10));
    }
  }

  if (dayIdx >= dayChunks.length) {
    dayIdx = dayChunks.length - 1;
  }

  return dayChunks[dayIdx] || dayChunks[0] || [];
}

interface Props {
  selectedClass?: string;
  selectedMedium?: string;
  selectedMonth?: string | null;
  onBack?: () => void;
  isStudent?: boolean;
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
  isStudent = false,
  schoolProfile: propSchoolProfile
}) => {
  const [activeDate, setActiveDate] = useState<Date | null>(null);
  const [todayDiary, setTodayDiary] = useState<DailyDiary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [availableDates, setAvailableDates] = useState<{ dateStr: string; day: string }[]>([]);
  const [isDownloadingMonthly, setIsDownloadingMonthly] = useState(false);
  const { user, profile } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);
  const [localProfile, setLocalProfile] = useState<{
    udiseCode?: string;
    schoolName?: string;
    teacherName?: string;
    headmasterName?: string;
    className?: string;
    academicYear?: string;
  }>({});

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
    if (selectedMonth) {
      const year = activeDate ? activeDate.getFullYear() : 2026;
      const monthIdx = parseInt(selectedMonth, 10) - 1;
      const newDateObj = new Date(year, monthIdx, 1);
      setActiveDate(newDateObj);
    } else if (!activeDate) {
      setActiveDate(new Date());
    }
  }, [selectedClass, selectedMedium, selectedMonth]);

  useEffect(() => {
    async function discoverAvailableDates() {
      try {
        const foundDates = new Set<string>();

        // Query teacher_diaries collection
        const colRef = collection(db, "teacher_diaries", selectedClass, selectedMedium);
        const snap = await getDocs(colRef);
        snap.docs.forEach((dSnap) => {
          const data = dSnap.data();
          const dStr = data.diaryDate || data.date || dSnap.id;
          if (dStr && dStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            if (!selectedMonth || dStr.split("-")[1] === selectedMonth) {
              foundDates.add(dStr);
            }
          }
          if (data.structuredData && Array.isArray(data.structuredData)) {
            data.structuredData.forEach((entry: any) => {
              if (entry.date) {
                const stdDate = parseAndStandardizeDate(entry.date);
                if (stdDate && stdDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                  if (!selectedMonth || stdDate.split("-")[1] === selectedMonth) {
                    foundDates.add(stdDate);
                  }
                }
              }
            });
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
        const daysOfWeek = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
        const formatted = dateArray.map((dStr) => {
          const parts = dStr.split("-");
          const dObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          const dayName = !isNaN(dObj.getTime()) ? daysOfWeek[dObj.getDay()] : "";
          return { dateStr: dStr, day: dayName };
        });
        setAvailableDates(formatted);
      } catch (e) {
        console.error("Error discovering available dates:", e);
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
        const targetMonthStr = isoDate.split("-")[1]; // e.g. "08" for August, "06" for June

        // 1. Check primary teaching_diaries collection
        const docId = `${selectedClass}_${selectedMedium}_${isoDate}`;
        const docRef = doc(db, "teaching_diaries", docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as DailyDiary;
          const rawPageUrl = data.pageUrl || (data as any).pageURL || (data as any).masterPdfUrl || (data as any).pdfUrl || "";
          const dataMonth = data.date ? data.date.split("-")[1] : (data.displayDate ? data.displayDate.split("-")[1] : targetMonthStr);
          
          if (!dataMonth || dataMonth === targetMonthStr) {
            let activePeriods = data.periods || [];

            // Check if master doc or structuredData has more periods for this date
            try {
              const colRef = collection(db, "teacher_diaries", selectedClass, selectedMedium);
              const snap = await getDocs(colRef);
              snap.docs.forEach((dSnap) => {
                const sData = dSnap.data();
                if (sData.structuredData && Array.isArray(sData.structuredData)) {
                  const match = findMatchingEntryForDate(sData.structuredData, isoDate);
                  if (match && match.periods && match.periods.length > activePeriods.length) {
                    activePeriods = match.periods;
                  }
                }
              });
            } catch (e) {}

            const singleDayPeriods = extractSingleDayPeriods(activePeriods, isoDate, activeDate);
            setTodayDiary({ ...data, pageUrl: rawPageUrl || data.pageUrl, periods: singleDayPeriods });
            setLoading(false);
            return;
          }
        }

        // 2. Fallback check teacher_diaries collection (teacher_diaries/{selectedClass}/{selectedMedium}/{isoDate})
        const altRef = doc(db, "teacher_diaries", selectedClass, selectedMedium, isoDate);
        const altSnap = await getDoc(altRef);

        if (altSnap.exists()) {
          const altData = altSnap.data();
          const rawPageUrl = altData.pageUrl || altData.pageURL || altData.masterPdfUrl || altData.pdfUrl || (altData.parsedContent ? altData.parsedContent.pageUrl || altData.parsedContent.masterPdfUrl : "");
          const altDate = altData.diaryDate || altData.date || isoDate;
          const altMonth = altData.month || (altDate ? altDate.split("-")[1] : targetMonthStr);

          if (!altMonth || altMonth === targetMonthStr) {
            const parsed = altData.parsedContent || altData;
            
            let periodList: PeriodItem[] = [];
            if (parsed.periods && Array.isArray(parsed.periods) && parsed.periods.length > 0) {
              periodList = parsed.periods;
            } else if (altData.periods && Array.isArray(altData.periods) && altData.periods.length > 0) {
              periodList = altData.periods;
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
              thought: parsed.thought || altData.thought || "",
              dinvishesh: parsed.dinvishesh || altData.dinvishesh || "",
              className: selectedClass,
              medium: selectedMedium,
              periods: singleDayPeriods,
              pageUrl: rawPageUrl,
              fileName: altData.fileName || parsed.fileName || "Teaching_Diary.pdf",
              uploadedAt: altData.uploadedAt || Date.now(),
              structuredData: altData.structuredData,
            } as any);
            setLoading(false);
            return;
          }
        }

        // 3. Fallback: Search uploaded records for selectedClass & selectedMedium matching isoDate or target month
        const colRef = collection(db, "teacher_diaries", selectedClass, selectedMedium);
        const snap = await getDocs(colRef);
        
        let masterDoc: any = null;
        let matchedEntryFromList: any = null;

        snap.docs.forEach((dSnap) => {
          const data = dSnap.data();
          const docDate = data.diaryDate || data.date || "";
          const docMonth = data.month || (docDate ? docDate.split("-")[1] : "");

          if (data.structuredData && Array.isArray(data.structuredData)) {
            const match = findMatchingEntryForDate(data.structuredData, isoDate);
            if (match) {
              masterDoc = { id: dSnap.id, ...data };
              matchedEntryFromList = match;
              return;
            }
          }

          if (docDate === isoDate || dSnap.id === isoDate) {
            masterDoc = { id: dSnap.id, ...data };
          } else if (docMonth === targetMonthStr) {
            const startDateStr = data.diaryDate || data.date || `${data.year || 2026}-${docMonth}-01`;
            const maxDays = data.structuredData && Array.isArray(data.structuredData) && data.structuredData.length > 0
              ? data.structuredData.length
              : 10;

            const validDatesForFile = getWorkingDatesRange(startDateStr, maxDays);

            if (validDatesForFile.includes(isoDate)) {
              masterDoc = { id: dSnap.id, ...data };
              if (data.structuredData && Array.isArray(data.structuredData)) {
                matchedEntryFromList = findMatchingEntryForDate(data.structuredData, isoDate);
              }
            }
          }
        });

        if (masterDoc) {
          const entryToUse = matchedEntryFromList || masterDoc.parsedContent || masterDoc;

          let periodList: PeriodItem[] = [];
          if (matchedEntryFromList?.periods && Array.isArray(matchedEntryFromList.periods) && matchedEntryFromList.periods.length > 0) {
            periodList = matchedEntryFromList.periods;
          } else if (entryToUse?.periods && Array.isArray(entryToUse.periods) && entryToUse.periods.length > 0) {
            periodList = entryToUse.periods;
          } else if (masterDoc.periods && Array.isArray(masterDoc.periods) && masterDoc.periods.length > 0) {
            periodList = masterDoc.periods;
          }

          const singleDayPeriods = (matchedEntryFromList?.periods && matchedEntryFromList.periods.length > 0)
            ? matchedEntryFromList.periods
            : extractSingleDayPeriods(periodList, isoDate, activeDate);

          const rawPageUrl = masterDoc.pageUrl || masterDoc.pageURL || masterDoc.masterPdfUrl || masterDoc.pdfUrl || (entryToUse ? entryToUse.pageUrl || entryToUse.masterPdfUrl : "");

          setTodayDiary({
            id: masterDoc.id,
            date: isoDate,
            displayDate: displayFormattedDate,
            day: entryToUse?.day || masterDoc.day || "",
            thought: entryToUse?.thought || masterDoc.thought || "",
            dinvishesh: entryToUse?.dinvishesh || masterDoc.dinvishesh || "",
            className: selectedClass,
            medium: selectedMedium,
            periods: singleDayPeriods,
            pageUrl: rawPageUrl,
            fileName: masterDoc.fileName || "Teaching_Diary.pdf",
            uploadedAt: masterDoc.uploadedAt || Date.now(),
            structuredData: masterDoc.structuredData,
          } as any);
          setLoading(false);
          return;
        }

        // If no document exists for this date/month, return null (shows "No Teaching Diary Found")
        setTodayDiary(null);
      } catch (err) {
        console.error("Error fetching diary:", err);
        toast.error("Failed to load Teaching Diary data");
        setTodayDiary(null);
      } finally {
        setLoading(false);
      }
    }

    fetchDiaryForDate();
  }, [isoDate, selectedClass, selectedMedium, displayFormattedDate]);

  const handlePrevDay = () => setActiveDate((prev) => subDays(prev ?? new Date(), 1));
  const handleNextDay = () => setActiveDate((prev) => addDays(prev ?? new Date(), 1));
  const handleResetToday = () => setActiveDate(new Date());

  const handleDownloadMonthlyPdf = async () => {
    setIsDownloadingMonthly(true);
    const targetMonth = selectedMonth || "08";
    const monthNames: Record<string, string> = {
      "01": "जानेवारी", "02": "फेब्रुवारी", "03": "मार्च", "04": "एप्रिल",
      "05": "मे", "06": "जून", "07": "जुलै", "08": "ऑगस्ट",
      "09": "सप्टेंबर", "10": "ऑक्टोबर", "11": "नोव्हेंबर", "12": "डिसेंबर"
    };
    const monthLabel = monthNames[targetMonth] || "ऑगस्ट";
    const toastId = toast.loading(`${monthLabel} महिन्यातील सर्व टाचण नोंदी गोळा करत आहे...`);

    try {
      const colRef = collection(db, "teacher_diaries", selectedClass, selectedMedium);
      const snap = await getDocs(colRef);

      const entriesMap = new Map<string, any>();

      snap.docs.forEach((dSnap) => {
        const data = dSnap.data();
        
        // Extract from structuredData
        if (data.structuredData && Array.isArray(data.structuredData)) {
          data.structuredData.forEach((entry: any) => {
            const dateStr = parseAndStandardizeDate(entry.date || entry.displayDate);
            if (dateStr && (!targetMonth || dateStr.split("-")[1] === targetMonth)) {
              if (!entriesMap.has(dateStr)) {
                entriesMap.set(dateStr, { ...entry, date: dateStr });
              }
            }
          });
        }

        // Extract from master/single doc
        const singleDate = parseAndStandardizeDate(data.diaryDate || data.date);
        if (singleDate && (!targetMonth || singleDate.split("-")[1] === targetMonth)) {
          if (!entriesMap.has(singleDate) && (data.periods || data.parsedContent)) {
            const periods = data.periods || data.parsedContent?.periods || [];
            if (periods.length > 0) {
              entriesMap.set(singleDate, {
                date: singleDate,
                day: data.day || data.parsedContent?.day || "",
                thought: data.thought || data.parsedContent?.thought || "",
                dinvishesh: data.dinvishesh || data.parsedContent?.dinvishesh || "",
                periods: periods,
                teacher: activeProfile.teacherName,
                school: activeProfile.schoolName,
                std: selectedClass,
                year: activeProfile.academicYear,
              });
            }
          }
        }
      });

      // Also check teaching_diaries
      const tdColRef = collection(db, "teaching_diaries");
      const tdSnap = await getDocs(tdColRef);
      const prefix = `${selectedClass}_${selectedMedium}_`;

      tdSnap.docs.forEach((dSnap) => {
        const id = dSnap.id;
        if (id.startsWith(prefix)) {
          const dateStr = id.replace(prefix, "");
          if (dateStr && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            if (!targetMonth || dateStr.split("-")[1] === targetMonth) {
              if (!entriesMap.has(dateStr)) {
                const data = dSnap.data();
                if (data.periods && data.periods.length > 0) {
                  entriesMap.set(dateStr, {
                    date: dateStr,
                    day: data.day || "",
                    thought: data.thought || "",
                    dinvishesh: data.dinvishesh || "",
                    periods: data.periods,
                    teacher: activeProfile.teacherName,
                    school: activeProfile.schoolName,
                    std: selectedClass,
                    year: activeProfile.academicYear,
                  });
                }
              }
            }
          }
        }
      });

      const allEntries = Array.from(entriesMap.values());
      
      // Filter out Sundays
      const validEntries = allEntries.filter((e) => {
        if (!e.date) return false;
        const parts = e.date.split("-");
        if (parts.length === 3) {
          const dObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          if (!isNaN(dObj.getTime()) && dObj.getDay() === 0) return false;
        }
        return e.day !== "रविवार" && e.day?.toLowerCase() !== "sunday";
      });

      // Sort by date ascending
      validEntries.sort((a, b) => a.date.localeCompare(b.date));

      if (validEntries.length === 0) {
        toast.dismiss(toastId);
        toast.error(`${monthLabel} महिन्यासाठी कोणतीही टाचण नोंद सापडली नाही.`);
        setIsDownloadingMonthly(false);
        return;
      }

      toast.loading(`पीडीएफ तयार होत आहे... (${validEntries.length} दिवसांचे टाचण)`, { id: toastId });

      const formatCleanDate = (dStr: string) => {
        if (!dStr) return "-";
        const parts = dStr.split("-");
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dStr;
      };

      const defaultHeaders = ["तासिका", "विषय", "अध्ययन मुद्दा / पाठ्यघटक", "अध्ययन निष्पत्ती", "अध्ययन अनुभव", "साधन तंत्रे", "शैक्षणिक साहित्य"];
      
      const dayBlocks = validEntries.map((p: any, idx: number) => {
        const rows = (p.periods || []).map((row: any, rIdx: number) => `
          <tr style="background:${rIdx % 2 === 0 ? "#fff" : "#f8fafc"}; page-break-inside: avoid; break-inside: avoid;">
            <td style="text-align:center;font-weight:700;color:#4338ca;width:6%">${row.period}</td>
            <td style="font-weight:600;width:8%">${row.subject || "-"}</td>
            <td style="width:11%">${row.topic || "-"}</td>
            <td style="width:36%">${row.outcome || "-"}</td>
            <td style="width:25%">${row.experience || "-"}</td>
            <td style="width:7%">${row.tools || "-"}</td>
            <td style="width:7%">${row.materials || "-"}</td>
          </tr>`).join("");

        const headers = (p.columnHeaders && p.columnHeaders.length > 0 ? p.columnHeaders : defaultHeaders)
          .map((h: string) => `<th>${h}</th>`).join("");

        return `
          <div class="day-block" style="margin-bottom: 15px; ${idx > 0 ? "page-break-before: always; break-before: always;" : ""} page-break-inside: avoid; break-inside: avoid;">
            <div class="day-header" style="display: flex; justify-content: flex-end; margin-bottom: 6px;">
              <span class="period-count" style="color: #475569; background: #f1f5f9; padding: 4px 10px; border-radius: 20px; font-weight: 600; font-size: 11px;">
                ${(p.periods || []).length} तासिका (Periods)
              </span>
            </div>
            <h2 style="font-size: 18px; font-weight: 900; text-align: center; color: #0f172a; margin: 8px 0 12px 0;">दैनंदिन पाठ टाचण — ${selectedClass} (${selectedMedium})</h2>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; background: #f1f5f9; border: 2px solid #475569; border-radius: 8px; padding: 10px 14px; margin-bottom: 10px; font-size: 11px;">
              <div><span style="color:#0f172a; font-size:10px; text-transform:uppercase; font-weight:900; display:block;">दिनांक</span><span style="font-weight:900; color:#4338ca; font-size:12px;">${formatCleanDate(p.date)}</span></div>
              <div><span style="color:#0f172a; font-size:10px; text-transform:uppercase; font-weight:900; display:block;">वार</span><span style="font-weight:900; color:#0f172a;">${p.day || "-"}</span></div>
              <div><span style="color:#0f172a; font-size:10px; text-transform:uppercase; font-weight:900; display:block;">वर्गशिक्षक</span><span style="font-weight:900; color:#0f172a;">${p.teacher || activeProfile.teacherName || "-"}</span></div>
              <div><span style="color:#0f172a; font-size:10px; text-transform:uppercase; font-weight:900; display:block;">शाळा</span><span style="font-weight:900; color:#0f172a;">${p.school || activeProfile.schoolName || "-"}</span></div>
              <div><span style="color:#0f172a; font-size:10px; text-transform:uppercase; font-weight:900; display:block;">इयत्ता</span><span style="font-weight:900; color:#0f172a;">${p.std || selectedClass}</span></div>
              <div><span style="color:#0f172a; font-size:10px; text-transform:uppercase; font-weight:900; display:block;">सन</span><span style="font-weight:900; color:#0f172a;">${p.year || activeProfile.academicYear || "2026-27"}</span></div>
            </div>
            ${p.thought ? `<div style="font-size:10.5px; font-style:italic; color:#78350f; background:#fffbeb; border-left:3px solid #f59e0b; padding:7px 12px; margin-bottom:10px; border-radius:4px;">✨ आजचा सुविचार : '${p.thought}'</div>` : ""}
            <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 12px;">
              <thead><tr>${headers}</tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`;
      }).join("");

      const element = document.createElement("div");
      element.innerHTML = `
        <div style="font-family: 'Noto Sans Devanagari', Arial, sans-serif; color: #1e293b; line-height: 1.4; padding: 10px;">
          <style>
            table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 10.5px; border: 2px solid #475569; }
            table th { background-color: #f1f5f9 !important; color: #0f172a !important; font-weight: 800 !important; font-size: 10.5px !important; padding: 8px !important; border: 1.5px solid #475569 !important; text-align: left; }
            table th:first-child { text-align: center; width: 45px; background-color: #e2e8f0 !important; }
            table td { padding: 7px 8px !important; border: 1.5px solid #94a3b8 !important; vertical-align: top; font-size: 10px !important; line-height: 1.4 !important; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; break-inside: avoid; }
          </style>
          ${dayBlocks}
        </div>
      `;

      const html2pdf = (await import("html2pdf.js")).default;
      const pdfFileName = `${selectedClass}_${selectedMedium}_${monthLabel}_महिन्याचे_संपूर्ण_टाचण`;

      const opt = {
        margin:       6,
        filename:     `${pdfFileName}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['css'], avoid: '.day-block' }
      };

      await html2pdf().set(opt).from(element).save();
      toast.dismiss(toastId);
      toast.success(`✅ "${pdfFileName}.pdf" यशस्विरित्या डाउनलोड झाली! (${validEntries.length} दिवस)`);
    } catch (err) {
      console.error("Monthly PDF generation error:", err);
      toast.dismiss(toastId);
      toast.error("महिन्याचे टाचण डाउनलोड करताना अडचण आली.");
    } finally {
      setIsDownloadingMonthly(false);
    }
  };
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

  const currentDocUrl = (todayDiary as any)?.pageUrl ||
    (todayDiary as any)?.pageURL ||
    (todayDiary as any)?.masterPdfUrl ||
    (todayDiary as any)?.fileUrl ||
    (todayDiary as any)?.pdfUrl ||
    (todayDiary as any)?.documentUrl ||
    (todayDiary as any)?.structuredData?.[0]?.pageUrl ||
    null;

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

          {/* Right: Download Monthly PDF Button */}
          <button
            onClick={handleDownloadMonthlyPdf}
            disabled={isDownloadingMonthly}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md transition-all border border-emerald-400/40 cursor-pointer active:scale-95 shrink-0"
            title="संपूर्ण ऑगस्ट महिन्याचे सर्व टाचण पीडीएफ फॉरमॅटमध्ये डाउनलोड करा"
          >
            {isDownloadingMonthly ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-200" />
                <span>टाचण डाउनलोड होत आहे...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-emerald-200" />
                <span>📥 सर्व ऑगस्ट महिन्याचे टाचण (Monthly PDF)</span>
              </>
            )}
          </button>


        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="p-12 rounded-3xl bg-white border border-slate-200/80 text-slate-700 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
          <p className="text-slate-500 font-bold text-sm">निवडलेल्या दिनांकाची टाचण नोंद शोधत आहे... (Fetching Diary Data)</p>
        </div>
      ) : !todayDiary || todayDiary.isHoliday || (!((todayDiary as any)?.pageUrl || (todayDiary as any)?.pageURL || (todayDiary as any)?.masterPdfUrl) && !(todayDiary.periods && todayDiary.periods.length > 0)) ? (
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

          {/* Main Structured Day-wise View directly on the front page */}
          <div className="w-full">
            <DocumentLivePreview
              selectedFile={null}
              savedRecord={{
                id: (todayDiary as any).id || isoDate,
                diaryDate: isoDate,
                fileName: (todayDiary as any).fileName || "Teaching_Diary.docx",
                pageUrl: currentDocUrl,
                className: selectedClass,
                medium: selectedMedium,
                structuredData: (todayDiary as any).structuredData || (todayDiary.periods && todayDiary.periods.length > 0 ? [{
                  date: isoDate,
                  day: todayDiary.day || "",
                  teacher: activeProfile?.teacherName || (todayDiary as any).teacher || "-",
                  school: activeProfile?.schoolName || (todayDiary as any).school || "-",
                  std: activeProfile?.className || todayDiary.className || selectedClass || "-",
                  year: activeProfile?.academicYear || (todayDiary as any).year || "2026-27",
                  thought: todayDiary.thought || "",
                  highlights: todayDiary.dinvishesh || "",
                  periods: todayDiary.periods
                }] : []),
              }}
              onBack={() => {}}
            />
          </div>
        </div>
      )}
    </div>
  );
};
