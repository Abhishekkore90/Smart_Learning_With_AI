import React, { useState, useEffect, useRef } from "react";
import { format, addDays, subDays } from "date-fns";
import { doc, getDoc, collection, getDocs, writeBatch, setDoc } from "firebase/firestore";
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
  Trash2,
  Save
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
  materials?: string;
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

    if (cleanDate === targetIsoDate) return entry;

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

  // 2. Check if entries belong to the SAME month as targetIsoDate
  const firstEntry = entries[0];
  if (firstEntry && (firstEntry.date || firstEntry.displayDate)) {
    const cleanFirst = String(firstEntry.date || firstEntry.displayDate).trim();
    const parts = cleanFirst.split(/[\/\-\.]/);
    let entryMonth = 0;
    if (parts.length === 3) {
      entryMonth = parts[0].length === 4 ? parseInt(parts[1], 10) : parseInt(parts[1], 10);
    }
    if (entryMonth && entryMonth !== targetMonth) {
      // Month mismatch (e.g., August file viewed in June)! Return null.
      return null;
    }
  }

  // 3. Fallback match by working day index ONLY within the same month
  const dayIdx = calculateWorkingDayIndex(targetYear, targetMonth, targetDay);
  if (dayIdx >= 0 && dayIdx < entries.length) {
    return entries[dayIdx];
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
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [availableDates, setAvailableDates] = useState<{ dateStr: string; day: string }[]>([]);
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
      const stored = (userKey ? localStorage.getItem(userKey) : null) || localStorage.getItem("teaching_diary_school_profile") || localStorage.getItem("user_profile");
      if (stored) {
        setLocalProfile(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error loading profile:", e);
    }
  }, [user, profile]);

  const activeProfile = {
    udiseCode: propSchoolProfile?.udiseCode || localProfile.udiseCode || (profile as any)?.udiseCode || (profile as any)?.udise || localStorage.getItem("udiseCode") || "",
    schoolName: propSchoolProfile?.schoolName || localProfile.schoolName || (profile as any)?.schoolName || (profile as any)?.school || localStorage.getItem("sqaf_cert_school_name") || localStorage.getItem("sqaaf_cert_school_name") || "",
    teacherName: propSchoolProfile?.teacherName || localProfile.teacherName || (profile as any)?.teacherName || (profile as any)?.displayName || (profile as any)?.name || user?.displayName || "",
    headmasterName: propSchoolProfile?.headmasterName || localProfile.headmasterName || (profile as any)?.headmasterName || "",
    className: propSchoolProfile?.className || localProfile.className || (profile as any)?.className || (profile as any)?.class || selectedClass,
    academicYear: propSchoolProfile?.academicYear || localProfile.academicYear || (profile as any)?.academicYear || "2026-27",
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
          const localThought = localStorage.getItem(`suvichar_${selectedClass}_${selectedMedium}_${isoDate}`) || localStorage.getItem(`suvichar_${isoDate}`);
          if (localThought && (!data.thought || data.thought.trim() === "")) {
            data.thought = localThought;
          }
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

          if (docDate === isoDate || dSnap.id === isoDate) {
            masterDoc = { id: dSnap.id, ...data };
            if (data.structuredData && Array.isArray(data.structuredData)) {
              matchedEntryFromList = findMatchingEntryForDate(data.structuredData, isoDate);
            }
          } else if (docMonth === targetMonthStr) {
            const startDateStr = data.diaryDate || data.date || `${data.year || 2026}-${docMonth}-01`;
            const maxDays = data.structuredData && Array.isArray(data.structuredData) && data.structuredData.length > 0
              ? Math.max(data.structuredData.length, 31)
              : 31;

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

  const handlePeriodChange = (periodIdx: number, field: keyof PeriodItem, value: string) => {
    if (!todayDiary) return;
    const updatedPeriods = [...todayDiary.periods];
    updatedPeriods[periodIdx] = {
      ...updatedPeriods[periodIdx],
      [field]: value,
    };
    setTodayDiary({
      ...todayDiary,
      periods: updatedPeriods,
    });
  };

  const handleThoughtChange = (newThought: string) => {
    if (!todayDiary) return;
    setTodayDiary({
      ...todayDiary,
      thought: newThought,
    });
    if (isoDate) {
      try {
        localStorage.setItem(`suvichar_${selectedClass}_${selectedMedium}_${isoDate}`, newThought);
        localStorage.setItem(`suvichar_${isoDate}`, newThought);
      } catch (e) {}

      try {
        const tdDocId = `${selectedClass}_${selectedMedium}_${isoDate}`;
        const tdDocRef = doc(db, "teaching_diaries", tdDocId);
        setDoc(tdDocRef, {
          className: selectedClass,
          medium: selectedMedium,
          date: isoDate,
          thought: newThought,
          updatedAt: Date.now(),
        }, { merge: true });
      } catch (e) {}
    }
  };

  const handleProfileChange = (field: string, value: string) => {
    const updated = { ...localProfile, [field]: value };
    setLocalProfile(updated);
    try {
      const userEmail = (user?.email || profile?.email || "").toLowerCase().trim();
      const userKey = userEmail ? `teaching_diary_school_profile_${userEmail}` : null;
      if (userKey) localStorage.setItem(userKey, JSON.stringify(updated));
      localStorage.setItem("teaching_diary_school_profile", JSON.stringify(updated));
    } catch (e) {
      console.error("Error saving local profile:", e);
    }
  };

  const cleanFirestoreData = (data: any): any => {
    if (data === undefined || data === null) return "";
    return JSON.parse(
      JSON.stringify(data, (_key, value) => (value === undefined ? "" : value))
    );
  };

  const handleSaveChanges = async () => {
    if (!todayDiary || !isoDate) return;
    setIsSaving(true);
    try {
      // 1. Save to primary teaching_diaries collection
      const tdDocId = `${selectedClass}_${selectedMedium}_${isoDate}`;
      const tdDocRef = doc(db, "teaching_diaries", tdDocId);
      const tdPayload = cleanFirestoreData({
        className: selectedClass,
        medium: selectedMedium,
        date: isoDate,
        displayDate: todayDiary.displayDate || displayFormattedDate,
        day: todayDiary.day || "",
        thought: todayDiary.thought || "",
        periods: todayDiary.periods || [],
        updatedAt: Date.now(),
      });
      await setDoc(tdDocRef, tdPayload, { merge: true });

      // 2. Save to teacher_diaries collection under class & medium subcollection
      const targetDocId = (todayDiary as any)?.id || isoDate;
      const mainDocRef = doc(db, "teacher_diaries", selectedClass, selectedMedium, targetDocId);
      const mainPayload = cleanFirestoreData({
        className: selectedClass,
        medium: selectedMedium,
        diaryDate: isoDate,
        date: isoDate,
        displayDate: todayDiary.displayDate || displayFormattedDate,
        day: todayDiary.day || "",
        thought: todayDiary.thought || "",
        periods: todayDiary.periods || [],
        parsedContent: {
          day: todayDiary.day || "",
          thought: todayDiary.thought || "",
          periods: todayDiary.periods || [],
        },
        updatedAt: Date.now(),
      });
      await setDoc(mainDocRef, mainPayload, { merge: true });

      // Save to localStorage instantly
      try {
        localStorage.setItem(`suvichar_${selectedClass}_${selectedMedium}_${isoDate}`, todayDiary.thought || "");
        localStorage.setItem(`suvichar_${isoDate}`, todayDiary.thought || "");
      } catch (e) {}

      try {
        const userEmail = (user?.email || profile?.email || "").toLowerCase().trim();
        const userKey = userEmail ? `teaching_diary_school_profile_${userEmail}` : null;
        if (userKey) localStorage.setItem(userKey, JSON.stringify(activeProfile));
        localStorage.setItem("teaching_diary_school_profile", JSON.stringify(activeProfile));
      } catch (e) {
        console.error("Profile save error:", e);
      }

      toast.success("✅ टाचण मधील बदल व सुविचार यशस्वीरित्या सेव्ह झाले!");
    } catch (err: any) {
      console.error("Failed to save changes:", err);
      toast.error("बदल सेव्ह करताना अडचण आली: " + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  // ── Build the printable HTML content for A4 PDF (Matching Screenshot 1) ─────
  const buildPrintableHTMLInner = () => {
    if (!todayDiary || !activeDate) return "";
    const rows = todayDiary.periods
      .map(
        (item) =>
          `<tr style="background:#ffffff;">
            <td style="text-align:center;font-weight:900;color:#4338ca;font-size:12px;padding:9px 4px;border:1.5px solid #334155;vertical-align:middle;">${item.period}</td>
            <td style="text-align:center;font-weight:900;color:#0f172a;font-size:12px;padding:9px 4px;border:1.5px solid #334155;vertical-align:middle;">${item.subject}</td>
            <td style="text-align:left;font-weight:800;color:#1e293b;font-size:11.5px;padding:9px 6px;border:1.5px solid #334155;vertical-align:middle;line-height:1.4;">${item.topic}</td>
            <td style="text-align:left;color:#047857;font-weight:800;font-size:11.5px;padding:9px 8px;border:1.5px solid #334155;vertical-align:middle;line-height:1.4;">${item.outcome || "-"}</td>
            <td style="text-align:left;color:#334155;font-weight:700;font-size:11.5px;padding:9px 8px;border:1.5px solid #334155;vertical-align:middle;line-height:1.4;">${item.experience || "-"}</td>
            <td style="text-align:center;color:#334155;font-weight:700;font-size:11.5px;padding:9px 4px;border:1.5px solid #334155;vertical-align:middle;">${item.tools || "-"}</td>
            <td style="text-align:center;color:#334155;font-weight:700;font-size:11.5px;padding:9px 4px;border:1.5px solid #334155;vertical-align:middle;">${item.materials || "-"}</td>
          </tr>`
      )
      .join("");

    const displayDateVal = todayDiary.displayDate || (activeDate ? format(activeDate, "d/M/yyyy") : "-");
    const dayVal = todayDiary.day || (activeDate ? format(activeDate, "eeee") : "-");

    return `
    <div style="width: 100%; margin: 0 auto; background: #ffffff; box-sizing: border-box;">
      <div style="text-align: center; margin-bottom: 14px;">
        <h1 style="font-size: 26px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px; margin: 0;">दैनंदिन पाठ टाचण</h1>
      </div>

      <!-- 3x2 Header Box -->
      <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #334155; border-radius: 8px; margin-bottom: 14px; background: #ffffff;">
        <tr>
          <td style="width: 33.33%; padding: 10px 14px; border-bottom: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; vertical-align: top; text-align: left;">
            <div style="font-size: 11px; font-weight: 800; color: #475569;">दिनांक</div>
            <div style="font-size: 14px; font-weight: 900; color: #3730a3; margin-top: 2px;">${displayDateVal}</div>
          </td>
          <td style="width: 33.33%; padding: 10px 14px; border-bottom: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; vertical-align: top; text-align: left;">
            <div style="font-size: 11px; font-weight: 800; color: #475569;">वार</div>
            <div style="font-size: 14px; font-weight: 900; color: #0f172a; margin-top: 2px;">${dayVal}</div>
          </td>
          <td style="width: 33.33%; padding: 10px 14px; border-bottom: 1px solid #cbd5e1; vertical-align: top; text-align: left;">
            <div style="font-size: 11px; font-weight: 800; color: #475569;">वर्गशिक्षक</div>
            <div style="font-size: 14px; font-weight: 900; color: #0f172a; margin-top: 2px;">${activeProfile.teacherName || "—"}</div>
          </td>
        </tr>
        <tr>
          <td style="width: 33.33%; padding: 10px 14px; border-right: 1px solid #cbd5e1; vertical-align: top; text-align: left;">
            <div style="font-size: 11px; font-weight: 800; color: #475569;">शाळा</div>
            <div style="font-size: 14px; font-weight: 900; color: #0f172a; margin-top: 2px;">${activeProfile.schoolName || "—"}</div>
          </td>
          <td style="width: 33.33%; padding: 10px 14px; border-right: 1px solid #cbd5e1; vertical-align: top; text-align: left;">
            <div style="font-size: 11px; font-weight: 800; color: #475569;">इयत्ता</div>
            <div style="font-size: 14px; font-weight: 900; color: #0f172a; margin-top: 2px;">${activeProfile.className || todayDiary.className || selectedClass}</div>
          </td>
          <td style="width: 33.33%; padding: 10px 14px; vertical-align: top; text-align: left;">
            <div style="font-size: 11px; font-weight: 800; color: #475569;">सन</div>
            <div style="font-size: 14px; font-weight: 900; color: #0f172a; margin-top: 2px;">${activeProfile.academicYear || "2026-27"}</div>
          </td>
        </tr>
      </table>

      <!-- Suvichar Box -->
      ${todayDiary.thought ? `<div style="background: #fffbeb; border: 1.5px solid #fcd34d; border-radius: 8px; padding: 10px 16px; margin-bottom: 14px; font-size: 13.5px; color: #78350f; text-align: center;">
        <strong style="font-weight: 900; color: #92400e;">आजचा सुविचार :</strong> "${todayDiary.thought}"
      </div>` : ''}

      <!-- Main Table -->
      <table style="width: 100%; border-collapse: collapse; table-layout: fixed; border: 2px solid #0f172a; margin-bottom: 16px; background: #ffffff;">
        <thead>
          <tr>
            <th style="width:6%; background-color:#0f172a !important; color:#ffffff !important; padding:11px 2px; text-align:center; font-size:12px; font-weight:900; border:1.5px solid #1e293b;">तासिका</th>
            <th style="width:9%; background-color:#0f172a !important; color:#ffffff !important; padding:11px 2px; text-align:center; font-size:12px; font-weight:900; border:1.5px solid #1e293b;">विषय</th>
            <th style="width:17%; background-color:#0f172a !important; color:#ffffff !important; padding:11px 4px; text-align:center; font-size:12px; font-weight:900; border:1.5px solid #1e293b;">अध्यापन मुद्दा / पाठ्यघटक</th>
            <th style="width:25.5%; background-color:#0f172a !important; color:#ffffff !important; padding:11px 4px; text-align:center; font-size:12px; font-weight:900; border:1.5px solid #1e293b;">अध्ययन निष्पत्ती</th>
            <th style="width:25.5%; background-color:#0f172a !important; color:#ffffff !important; padding:11px 4px; text-align:center; font-size:12px; font-weight:900; border:1.5px solid #1e293b;">अध्ययन अनुभव</th>
            <th style="width:8.5%; background-color:#0f172a !important; color:#ffffff !important; padding:11px 2px; text-align:center; font-size:11px; font-weight:900; border:1.5px solid #1e293b;">साधन तंत्रे</th>
            <th style="width:8.5%; background-color:#0f172a !important; color:#ffffff !important; padding:11px 2px; text-align:center; font-size:11px; font-weight:900; border:1.5px solid #1e293b;">शैक्षणिक साहित्य</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <!-- Bottom Special Features & Signatures -->
      <div style="margin-top: 16px;">
        <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-bottom: 8px;">दिवसभरातील वैशिष्टपूर्ण बाबी:</div>
        <div style="border-bottom: 1.5px dashed #cbd5e1; height: 24px; margin-bottom: 8px;"></div>
        <div style="border-bottom: 1.5px dashed #cbd5e1; height: 24px; margin-bottom: 8px;"></div>
        
        <table style="width: 100%; border: none; margin-top: 36px; background: transparent;">
          <tr>
            <td style="text-align: left; font-size: 14px; font-weight: 900; color: #0f172a; border: none; padding: 0 10px;">वर्गशिक्षक</td>
            <td style="text-align: right; font-size: 14px; font-weight: 900; color: #0f172a; border: none; padding: 0 10px;">मुख्याध्यापक</td>
          </tr>
        </table>
      </div>
    </div>`;
  };

  const buildPrintableHTML = () => {
    if (!todayDiary || !activeDate) return "";
    const displayDateVal = todayDiary.displayDate || (activeDate ? format(activeDate, "d/M/yyyy") : "-");
    return `<!DOCTYPE html>
<html lang="mr">
<head>
  <meta charset="UTF-8" />
  <title>दैनंदिन पाठ टाचण — ${displayDateVal}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700;800;900&display=swap');
    
    @page {
      size: A4 portrait;
      margin: 6mm 8mm;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: 'Noto Sans Devanagari', Arial, sans-serif;
      background: #ffffff;
      color: #0f172a;
      padding: 6px 10px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  </style>
</head>
<body>
  ${buildPrintableHTMLInner()}
</body>
</html>`;
  };

  // ── Print & PDF Preview Handler ───────────────────────────────────────────
  const handlePrint = () => {
    if (!todayDiary || !activeDate) return;
    const html = buildPrintableHTML();
    const printWindow = window.open("", "_blank", "width=950,height=750");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // ── Download Handler (Direct PDF File Download matching Screenshot 1) ──────
  const handleDownload = async () => {
    if (!todayDiary || !activeDate) return;
    const toastId = toast.loading("पीडीएफ फाईल जनरेट व डाऊनलोड होत आहे...");
    try {
      const html2pdfModule = await import("html2pdf.js");
      let html2pdfFn: any = html2pdfModule.default || html2pdfModule;
      if (html2pdfFn && html2pdfFn.default) html2pdfFn = html2pdfFn.default;
      if (typeof html2pdfFn !== "function" && typeof window !== "undefined" && typeof (window as any).html2pdf === "function") {
        html2pdfFn = (window as any).html2pdf;
      }

      const wrapper = document.createElement("div");
      wrapper.style.position = "fixed";
      wrapper.style.top = "0";
      wrapper.style.left = "-9999px";
      wrapper.style.width = "794px";
      wrapper.style.backgroundColor = "#ffffff";
      wrapper.style.overflow = "hidden";

      const container = document.createElement("div");
      container.style.width = "794px";
      container.style.padding = "16px 20px";
      container.style.boxSizing = "border-box";
      container.style.backgroundColor = "#ffffff";
      container.style.color = "#0f172a";
      container.style.fontFamily = "'Noto Sans Devanagari', sans-serif";
      container.innerHTML = buildPrintableHTMLInner();

      wrapper.appendChild(container);
      document.body.appendChild(wrapper);

      const fileName = `दैनंदिन_पाठ_टाचण_${todayDiary.displayDate || format(activeDate, "dd-MM-yyyy")}.pdf`;

      const pdfOptions = {
        margin: [0, 0, 0, 0],
        filename: fileName,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 794 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait", compress: false }
      };

      await html2pdfFn().set(pdfOptions).from(container).save();

      if (document.body.contains(wrapper)) document.body.removeChild(wrapper);
      toast.dismiss(toastId);
      toast.success("✅ फाईल यशस्वीरित्या डाऊनलोड झाली!");
    } catch (err: any) {
      console.error("Direct PDF download error:", err);
      toast.dismiss(toastId);
      handlePrint();
    }
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
            {(todayDiary as any)?.pageUrl && !isStudent && profile?.role !== "student" && (
              <button
                type="button"
                onClick={handleDeleteCurrentFile}
                className="p-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-rose-500/25 cursor-pointer active:scale-95"
                title="फाईल डिलीट करा (Delete Uploaded File)"
              >
                <Trash2 className="size-4" />
              </button>
            )}

            {todayDiary && (
              <>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/25 cursor-pointer active:scale-95 disabled:opacity-50"
                  title="केलेले सर्व बदल फिक्स सेव्ह करा"
                >
                  {isSaving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  <span>{isSaving ? "सेव्ह होत आहे..." : "बदल सेव्ह करा"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-600/25 cursor-pointer active:scale-95"
                >
                  <Download className="size-4" /> <span>PDF डाऊनलोड</span>
                </button>
              </>
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
      ) : (todayDiary.periods && todayDiary.periods.length > 0) ? (
        /* SUCCESS STATE: Show Selected Date's Diary in Paper Document Format */
        <div className="bg-white border-2 border-slate-300 rounded-3xl p-6 sm:p-8 shadow-md space-y-5">
          {/* Top Pill Badges Bar & Edit Tip */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold">
            <span className="px-3.5 py-1.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-full font-extrabold">
              दिनांक: {todayDiary.displayDate || (activeDate ? format(activeDate, "d/M/yyyy") : "-")}
            </span>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[11px] font-black flex items-center gap-1.5 shadow-sm">
                <span>कोणत्याही मजकुरावर क्लिक करून थेट एडिट करा (Live Edit Enabled)</span>
              </span>
              <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl font-extrabold">
                {todayDiary.periods.length} तासिका (Periods)
              </span>
            </div>
          </div>

          {/* Title */}
          <div className="text-center">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              दैनंदिन पाठ टाचण
            </h2>
          </div>

          {/* Header Card (Centered 6-column Box) */}
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-center font-bold text-slate-900">
              <div>
                <span className="text-slate-500 font-bold block text-xs uppercase mb-0.5">दिनांक</span>
                <span className="text-indigo-700 font-black text-base block">{todayDiary.displayDate || (activeDate ? format(activeDate, "d/M/yyyy") : "-")}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block text-xs uppercase mb-0.5">वार</span>
                <span className="text-slate-900 font-black text-base block">{todayDiary.day || (activeDate ? format(activeDate, "eeee") : "-")}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block text-xs uppercase mb-0.5">वर्गशिक्षक</span>
                <span 
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleProfileChange("teacherName", e.currentTarget.innerText.trim())}
                  className="text-slate-900 font-black text-base block hover:bg-amber-100/70 focus:bg-amber-100 focus:outline-none rounded px-1 transition-all cursor-text"
                  title="वर्गशिक्षक नाव बदलण्यासाठी येथे क्लिक करा"
                >
                  {activeProfile.teacherName || "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block text-xs uppercase mb-0.5">शाळा</span>
                <span 
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleProfileChange("schoolName", e.currentTarget.innerText.trim())}
                  className="text-slate-900 font-black text-base block hover:bg-amber-100/70 focus:bg-amber-100 focus:outline-none rounded px-1 transition-all cursor-text"
                  title="शाळेचे नाव बदलण्यासाठी येथे क्लिक करा"
                >
                  {activeProfile.schoolName || "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block text-xs uppercase mb-0.5">इयत्ता</span>
                <span 
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleProfileChange("className", e.currentTarget.innerText.trim())}
                  className="text-slate-900 font-black text-base block hover:bg-amber-100/70 focus:bg-amber-100 focus:outline-none rounded px-1 transition-all cursor-text"
                  title="इयत्ता बदलण्यासाठी येथे क्लिक करा"
                >
                  {activeProfile.className || todayDiary.className || selectedClass}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block text-xs uppercase mb-0.5">सन</span>
                <span 
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleProfileChange("academicYear", e.currentTarget.innerText.trim())}
                  className="text-slate-900 font-black text-base block hover:bg-amber-100/70 focus:bg-amber-100 focus:outline-none rounded px-1 transition-all cursor-text"
                  title="सन बदलण्यासाठी येथे क्लिक करा"
                >
                  {activeProfile.academicYear || "2026-27"}
                </span>
              </div>
            </div>
          </div>

          {/* Yellow Suvichar Card */}
          <div className="text-xs text-amber-950 bg-amber-50/95 p-3 rounded-xl border border-amber-300 text-center shadow-sm">
            <strong className="text-amber-900 font-black text-xs uppercase tracking-wider">आजचा सुविचार : </strong>
            <span 
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleThoughtChange(e.currentTarget.innerText.trim())}
              className="font-extrabold text-sm text-amber-900 not-italic hover:bg-amber-100/80 focus:bg-amber-100 focus:outline-none rounded px-1 transition-all cursor-text inline-block min-w-[200px]"
              title="सुविचार बदलण्यासाठी येथे क्लिक करा"
            >
              "{todayDiary.thought || "आजचा सुविचार प्रविष्ट करण्यासाठी येथे क्लिक करा..."}"
            </span>
          </div>

          {/* 7 Columns Table matching Image 2 */}
          <div className="overflow-x-auto no-scrollbar rounded-xl border-2 border-slate-900 shadow-sm mt-4">
            <table className="w-full text-sm border-collapse table-fixed border-2 border-slate-900">
              <colgroup>
                <col style={{ width: "7%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "17%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "26%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "8%" }} />
              </colgroup>
              <thead className="bg-slate-200 text-slate-950 font-black text-xs md:text-sm border-b-2 border-slate-900">
                <tr>
                  <th className="py-3 px-1 text-center bg-slate-200 text-slate-950 font-black border-r border-slate-400">तासिका</th>
                  <th className="py-3 px-1 text-center bg-slate-200 text-slate-950 font-black border-r border-slate-400">विषय</th>
                  <th className="py-3 px-1.5 text-center bg-slate-200 text-slate-950 font-black border-r border-slate-400">अध्यापन मुद्दा / पाठ्यघटक</th>
                  <th className="py-3 px-2 text-center bg-slate-200 text-slate-950 font-black border-r border-slate-400">अध्ययन निष्पत्ती</th>
                  <th className="py-3 px-2 text-center bg-slate-200 text-slate-950 font-black border-r border-slate-400">अध्ययन अनुभव</th>
                  <th className="py-3 px-1 text-center bg-slate-200 text-slate-950 font-black border-r border-slate-400">साधन तंत्रे</th>
                  <th className="py-3 px-1 text-center bg-slate-200 text-slate-950 font-black">शैक्षणिक साहित्य</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-400 font-medium text-slate-900 bg-white text-xs md:text-sm">
                {todayDiary.periods.map((item, idx) => (
                  <tr key={idx} className="hover:bg-indigo-50/40 transition-colors border-b-2 border-slate-400">
                    <td 
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handlePeriodChange(idx, "period", e.currentTarget.innerText.trim())}
                      className="p-2.5 border-r-2 border-slate-400 text-center font-black text-indigo-700 align-middle hover:bg-amber-100/60 focus:bg-amber-100 focus:outline-none transition-all cursor-text"
                      title="तासिका क्रमांक बदलण्यासाठी क्लिक करा"
                    >
                      {item.period}
                    </td>
                    <td 
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handlePeriodChange(idx, "subject", e.currentTarget.innerText.trim())}
                      className="p-2.5 border-r-2 border-slate-400 font-black text-slate-900 text-center align-middle hover:bg-amber-100/60 focus:bg-amber-100 focus:outline-none transition-all cursor-text"
                      title="विषय बदलण्यासाठी क्लिक करा"
                    >
                      {item.subject}
                    </td>
                    <td 
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handlePeriodChange(idx, "topic", e.currentTarget.innerText.trim())}
                      className="p-2.5 border-r-2 border-slate-400 text-slate-900 font-extrabold text-center align-middle hover:bg-amber-100/60 focus:bg-amber-100 focus:outline-none transition-all cursor-text"
                      title="पाठ्यघटक बदलण्यासाठी क्लिक करा"
                    >
                      {item.topic}
                    </td>
                    <td 
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handlePeriodChange(idx, "outcome", e.currentTarget.innerText.trim())}
                      className="p-2.5 border-r-2 border-slate-400 text-emerald-600 font-extrabold leading-relaxed text-center align-middle hover:bg-amber-100/60 focus:bg-amber-100 focus:outline-none transition-all cursor-text"
                      title="अध्ययन निष्पत्ती बदलण्यासाठी क्लिक करा"
                    >
                      {item.outcome || "-"}
                    </td>
                    <td 
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handlePeriodChange(idx, "experience", e.currentTarget.innerText.trim())}
                      className="p-2.5 border-r-2 border-slate-400 text-slate-800 font-bold leading-relaxed text-center align-middle hover:bg-amber-100/60 focus:bg-amber-100 focus:outline-none transition-all cursor-text"
                      title="अध्ययन अनुभव बदलण्यासाठी क्लिक करा"
                    >
                      {item.experience || "-"}
                    </td>
                    <td 
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handlePeriodChange(idx, "tools", e.currentTarget.innerText.trim())}
                      className="p-2.5 border-r-2 border-slate-400 text-slate-800 text-xs font-bold text-center align-middle hover:bg-amber-100/60 focus:bg-amber-100 focus:outline-none transition-all cursor-text"
                      title="साधन तंत्रे बदलण्यासाठी क्लिक करा"
                    >
                      {item.tools || "-"}
                    </td>
                    <td 
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handlePeriodChange(idx, "materials", e.currentTarget.innerText.trim())}
                      className="p-2.5 text-slate-800 text-xs font-bold text-center align-middle hover:bg-amber-100/60 focus:bg-amber-100 focus:outline-none transition-all cursor-text"
                      title="शैक्षणिक साहित्य बदलण्यासाठी क्लिक करा"
                    >
                      {item.materials || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Remarks & Signatures */}
          <div className="mt-6 pt-4 border-t border-slate-200 space-y-3">
            <p className="font-bold text-xs text-slate-900">दिवसभरातील वैशिष्टपूर्ण बाबी:</p>
            <div 
              contentEditable
              suppressContentEditableWarning
              className="border-b border-slate-300 p-2 min-h-[36px] text-xs text-slate-800 font-medium hover:bg-amber-50/50 focus:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-lg transition-all cursor-text"
              title="येथे टिप्पणी किंवा विशेष बाबी प्रविष्ट करण्यासाठी क्लिक करा"
            />
            <div className="flex justify-between items-center font-black text-sm text-slate-900 pt-8 px-4">
              <span>वर्गशिक्षक</span>
              <span>मुख्याध्यापक</span>
            </div>
          </div>
        </div>
      ) : (todayDiary as any)?.pageUrl ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                <FileText className="size-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  अपलोड केलेले पाठ टाचण दस्तऐवज (Uploaded Document View)
                </h3>
                <p className="text-xs text-slate-500 font-semibold">{todayDiary.fileName || "Teaching_Diary.pdf"}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 cursor-pointer hover:from-orange-600 hover:to-amber-600 active:scale-95 transition-all"
            >
              <Eye className="size-4" /> <span>फुल स्क्रीन पहा (Full Preview)</span>
            </button>
          </div>
          <div className="h-[650px] w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
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
              onBack={() => {}}
            />
          </div>
        </div>
      ) : null}

      {/* Document Live Preview Modal */}
      {isPreviewModalOpen && todayDiary && (todayDiary as any).pageUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
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
