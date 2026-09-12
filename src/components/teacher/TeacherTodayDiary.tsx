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
  Save,
  AlertTriangle
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { DocumentLivePreview, formatDateToIso, getMarathiDayName } from "@/components/DocumentLivePreview";
import { getBunnyStorageUrl } from "@/lib/bunny-auth-pdf";
import { useAuth } from "@/hooks/use-auth";
import { cleanThoughtText, getDefaultSuvicharForDate, isDefaultFallbackThought } from "@/lib/parse-diary-file";

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

function toAsciiDigits(str: string | undefined | null): string {
  if (!str) return "";
  const marathiDigits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
  let res = String(str);
  for (let i = 0; i < 10; i++) {
    res = res.replaceAll(marathiDigits[i], String(i));
  }
  return res;
}

function calculateRangeWorkingDayIndex(year: number, month: number, targetDay: number, startDay: number = 1): number {
  let workingCount = 0;
  for (let d = startDay; d <= targetDay; d++) {
    const testD = new Date(year, month - 1, d);
    if (testD.getDay() !== 0) { // Skip Sundays
      workingCount++;
    }
  }
  return Math.max(0, workingCount - 1);
}

function calculateWorkingDayIndex(year: number, month: number, day: number): number {
  return calculateRangeWorkingDayIndex(year, month, day, 1);
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


export function isDocMatchingMonth(docItem: any, monthStr: string | null): boolean {
  if (!monthStr) return true;
  const targetMonth = String(monthStr).padStart(2, "0");

  const docMonth = docItem.month || docItem.selectedMonth;
  if (docMonth !== undefined && docMonth !== null && String(docMonth).padStart(2, "0") === targetMonth) {
    return true;
  }

  const dStr = docItem.diaryDate || docItem.date || docItem.displayDate;
  if (dStr && typeof dStr === "string" && dStr !== "master_diary") {
    const clean = dStr.trim();
    let m = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (m) {
      if (String(m[2]).padStart(2, "0") === targetMonth) return true;
    }
    m = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (m) {
      if (String(m[2]).padStart(2, "0") === targetMonth) return true;
    }
  }

  if (docItem.structuredData && Array.isArray(docItem.structuredData) && docItem.structuredData.length > 0) {
    return docItem.structuredData.some((entry: any) => {
      const ed = entry.date || entry.displayDate || entry.diaryDate || "";
      if (!ed) return false;
      const clean = String(ed).trim();
      let m = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
      if (m) return String(m[2]).padStart(2, "0") === targetMonth;
      m = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
      if (m) return String(m[2]).padStart(2, "0") === targetMonth;
      return false;
    });
  }

  return false;
}

export function getTabCategory(weekStr?: string | null, rec?: any): string {
  const w = (rec?.week || weekStr || "").trim();
  if (w === "1 to 10" || w === "Week 1" || w.includes("1to10") || w.includes("1_to_10") || w.includes("1-10")) return "1 to 10";
  if (w === "11 to 20" || w === "Week 2" || w === "Week 3" || w.includes("11to20") || w.includes("11_to_20") || w.includes("11-20")) return "11 to 20";
  if (w === "21 to 31" || w === "21 to 30" || w === "21 to 30/31" || w === "Week 4" || w === "Week 5" || w.includes("21to30") || w.includes("21to31") || w.includes("21_to_30") || w.includes("21-30")) return "21 to 31";

  const dStr = rec?.diaryDate || rec?.date || "";
  if (dStr && typeof dStr === "string" && dStr.includes("-")) {
    const parts = dStr.split("-");
    if (parts.length >= 3) {
      const day = parseInt(parts[2], 10);
      if (!isNaN(day)) {
        if (day <= 10) return "1 to 10";
        if (day <= 20) return "11 to 20";
        return "21 to 31";
      }
    }
  }

  if (rec?.structuredData && Array.isArray(rec.structuredData) && rec.structuredData.length > 0) {
    const firstD = rec.structuredData[0]?.date || rec.structuredData[0]?.displayDate || "";
    if (firstD && typeof firstD === "string") {
      const clean = String(firstD).trim();
      let m = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
      let day = 0;
      if (m) day = parseInt(m[3], 10);
      else {
        m = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
        if (m) day = parseInt(m[1], 10);
      }
      if (day > 0) {
        if (day <= 10) return "1 to 10";
        if (day <= 20) return "11 to 20";
        return "21 to 31";
      }
    }
  }

  return "1 to 10";
}

function findMatchingEntryForDate(entries: any[], targetIsoDate: string, currentTabId?: string): any | null {
  if (!entries || !Array.isArray(entries) || entries.length === 0) return null;

  const targetParts = targetIsoDate.split("-");
  if (targetParts.length !== 3) return null;

  const targetYear = parseInt(targetParts[0], 10);
  const targetMonth = parseInt(targetParts[1], 10);
  const targetDay = parseInt(targetParts[2], 10);

  // 1. Strict ISO date match using formatDateToIso and Marathi numeral conversion
  for (const entry of entries) {
    if (!entry) continue;
    const rawDate = String(entry.date || entry.displayDate || "").trim();
    if (!rawDate) continue;

    const cleanDate = toAsciiDigits(rawDate);
    const entryIso = formatDateToIso(cleanDate);

    if (entryIso && entryIso === targetIsoDate) {
      return entry;
    }

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

    const dayOnlyMatch = cleanDate.match(/^(\d{1,2})$/);
    if (dayOnlyMatch && parseInt(dayOnlyMatch[1], 10) === targetDay) {
      return entry;
    }
  }

  // 2. Check if entries belong to the SAME month as targetIsoDate
  const firstEntry = entries[0];
  if (firstEntry) {
    const rawFirst = String(firstEntry.date || firstEntry.displayDate || "").trim();
    if (rawFirst) {
      const cleanFirst = toAsciiDigits(rawFirst);
      const firstIso = formatDateToIso(cleanFirst);
      let entryMonth = 0;
      if (firstIso && firstIso.includes("-")) {
        entryMonth = parseInt(firstIso.split("-")[1], 10);
      } else {
        const parts = cleanFirst.split(/[\/\-\.]/);
        if (parts.length === 3) {
          entryMonth = parts[0].length === 4 ? parseInt(parts[1], 10) : parseInt(parts[1], 10);
        }
      }
      if (entryMonth && entryMonth !== targetMonth) {
        return null;
      }
    }
  }

  // 3. Fallback match by working day index relative to the range start day
  let startDay = 1;

  const tabCat = currentTabId ? getTabCategory(currentTabId) : null;
  if (tabCat === "11 to 20") {
    startDay = 11;
  } else if (tabCat === "21 to 31") {
    startDay = 21;
  } else if (tabCat === "1 to 10") {
    startDay = 1;
  } else if (firstEntry) {
    const rawFirst = String(firstEntry.date || firstEntry.displayDate || "").trim();
    if (rawFirst) {
      const cleanFirst = toAsciiDigits(rawFirst);
      const firstIso = formatDateToIso(cleanFirst);
      if (firstIso && firstIso.includes("-")) {
        const parsedDay = parseInt(firstIso.split("-")[2], 10);
        if (parsedDay >= 21) startDay = 21;
        else if (parsedDay >= 11) startDay = 11;
        else startDay = 1;
      } else {
        const m = cleanFirst.match(/^(\d{1,4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,4})$/);
        if (m) {
          const parsedDay = m[1].length === 4 ? parseInt(m[3], 10) : parseInt(m[1], 10);
          if (parsedDay >= 21) startDay = 21;
          else if (parsedDay >= 11) startDay = 11;
          else startDay = 1;
        }
      }
    }
  }

  // Section boundary & tab category validation
  if (startDay === 1 && targetDay > 10) return null;
  if (startDay === 11 && (targetDay < 11 || targetDay > 20)) return null;
  if (startDay === 21 && targetDay < 21) return null;

  if (currentTabId) {
    let startCat = "1 to 10";
    if (startDay === 11) startCat = "11 to 20";
    else if (startDay === 21) startCat = "21 to 31";

    if (startCat !== tabCat) return null;
  }

  // 1-to-1 direct day offset matching (Day 1 -> idx 0, Day 2 -> idx 1, Day 3 -> idx 2, etc.)
  const directIdx = targetDay - startDay;
  if (directIdx >= 0 && directIdx < entries.length) {
    return entries[directIdx];
  }

  const dayIdx = calculateRangeWorkingDayIndex(targetYear, targetMonth, targetDay, startDay);
  if (dayIdx >= 0 && dayIdx < entries.length) {
    return entries[dayIdx];
  }

  return null;
}

function extractSingleDayPeriods(allPeriods: PeriodItem[], targetIsoDate: string, activeDate: Date | null, currentTabId?: string): PeriodItem[] {
  if (!allPeriods || !Array.isArray(allPeriods) || allPeriods.length === 0) return [];

  // Count how many times period number resets to "1" or "१"
  let resetCount = 0;
  allPeriods.forEach((item) => {
    const rawP = String(item.period || "").trim().replace(/\.$/, "");
    if (rawP === "1" || rawP === "१") {
      resetCount++;
    }
  });

  // If period "1" occurs at most ONCE, allPeriods belongs to a single day! Return ALL periods.
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
  let year = 2026, month = 8, targetDay = 1;
  if (activeDate) {
    year = activeDate.getFullYear();
    month = activeDate.getMonth() + 1;
    targetDay = activeDate.getDate();
  } else if (targetIsoDate) {
    const parts = targetIsoDate.split("-");
    if (parts.length === 3) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      targetDay = parseInt(parts[2], 10);
    }
  }

  let startDay = 1;
  if (currentTabId === "21 to 31" || currentTabId === "21 to 30" || targetDay >= 21) {
    startDay = 21;
  } else if (currentTabId === "11 to 20" || (targetDay >= 11 && targetDay <= 20)) {
    startDay = 11;
  }

  dayIdx = calculateRangeWorkingDayIndex(year, month, targetDay, startDay);

  if (dayIdx >= dayChunks.length) {
    dayIdx = dayChunks.length - 1;
  }

  return dayChunks[dayIdx] || dayChunks[0] || [];
}

interface Props {
  selectedClass?: string;
  selectedMedium?: string;
  selectedMonth?: string | null;
  selectedWeek?: string | null;
  onSelectWeek?: (week: string) => void;
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
  selectedWeek = null,
  onSelectWeek,
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
  const [isAllDaysMode, setIsAllDaysMode] = useState<boolean>(false);
  const [rangeMasterRecord, setRangeMasterRecord] = useState<any>(null);
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

  const activeMonthNum = selectedMonth ? parseInt(selectedMonth, 10) : (activeDate ? activeDate.getMonth() + 1 : 8);
  const activeYearNum = activeDate ? activeDate.getFullYear() : 2026;

  const currentTabId = React.useMemo(() => {
    if (activeDate) {
      const day = activeDate.getDate();
      if (day <= 10) return "1 to 10";
      if (day <= 20) return "11 to 20";
      return "21 to 31";
    }
    return selectedWeek || "1 to 10";
  }, [activeDate, selectedWeek]);

  const rangeDays = React.useMemo(() => {
    let startDay = 1;
    let endDay = 10;

    if (currentTabId === "11 to 20") {
      startDay = 11;
      endDay = 20;
    } else if (currentTabId === "21 to 31") {
      startDay = 21;
      const maxDaysInMonth = new Date(activeYearNum, activeMonthNum, 0).getDate();
      endDay = maxDaysInMonth;
    }

    const daysArr = [];
    const dayShortNames = ["रवि", "सोम", "मंगळ", "बुध", "गुरु", "शुक्र", "शनि"];
    const dayFullNames = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];

    for (let d = startDay; d <= endDay; d++) {
      const dObj = new Date(activeYearNum, activeMonthNum - 1, d);
      const dateIso = format(dObj, "yyyy-MM-dd");
      const dayOfWeek = dObj.getDay();

      daysArr.push({
        dayNum: d,
        dateObj: dObj,
        dateIso: dateIso,
        displayDate: `${d}/${activeMonthNum}/${activeYearNum}`,
        dayOfWeek: dayOfWeek,
        dayShort: dayShortNames[dayOfWeek],
        dayName: dayFullNames[dayOfWeek],
      });
    }

    return daysArr;
  }, [currentTabId, activeMonthNum, activeYearNum]);

  const handleTabClick = (tabId: string) => {
    let targetDay = 1;
    if (tabId === "11 to 20") targetDay = 11;
    if (tabId === "21 to 31") targetDay = 21;

    const newDate = new Date(activeYearNum, activeMonthNum - 1, targetDay);
    setActiveDate(newDate);
    if (onSelectWeek) onSelectWeek(tabId);
  };

  useEffect(() => {
    if (selectedMonth) {
      const year = activeDate ? activeDate.getFullYear() : 2026;
      const monthIdx = parseInt(selectedMonth, 10) - 1;
      let startDay = 1;
      if (selectedWeek === "11 to 20") startDay = 11;
      else if (selectedWeek === "21 to 31" || selectedWeek === "21 to 30") startDay = 21;
      const newDateObj = new Date(year, monthIdx, startDay);
      setActiveDate(newDateObj);
    } else if (!activeDate) {
      setActiveDate(new Date());
    }
  }, [selectedClass, selectedMedium, selectedMonth, selectedWeek]);

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

  useEffect(() => {
    async function fetchRangeMasterRecord() {
      try {
        const targetMonthStr = selectedMonth || (activeDate ? format(activeDate, "MM") : "08");
        const colRef = collection(db, "teacher_diaries", selectedClass, selectedMedium);
        const snap = await getDocs(colRef);

        const masterDocs: any[] = [];
        const dayEntriesMap = new Map<string, any>();

        snap.docs.forEach((dSnap) => {
          const data = dSnap.data();
          const docId = dSnap.id;
          const isMaster = docId.startsWith("file_") ||
            docId === "master_diary" ||
            (Array.isArray(data.structuredData) && data.structuredData.length > 0) ||
            Boolean(data.masterPdfUrl);

          if (isMaster && isDocMatchingMonth(data, targetMonthStr)) {
            masterDocs.push({ id: docId, ...data });
          }

          if (Array.isArray(data.structuredData) && data.structuredData.length > 0) {
            data.structuredData.forEach((entry: any) => {
              const dStr = entry.date || entry.displayDate || entry.diaryDate || "";
              if (dStr) dayEntriesMap.set(dStr, entry);
            });
          }

          if (!docId.startsWith("file_") && docId !== "master_diary" && docId.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const dayObj = {
              date: docId,
              day: data.day || "",
              thought: data.thought || (data.parsedContent ? data.parsedContent.thought : ""),
              dinvishesh: data.dinvishesh || (data.parsedContent ? data.parsedContent.dinvishesh : ""),
              highlights: data.highlights || (data.parsedContent ? data.parsedContent.highlights : ""),
              periods: data.periods || (data.parsedContent ? data.parsedContent.periods : []),
              scannedPageUrl: data.scannedPageUrl || data.pageUrl || "",
            };
            if (!dayEntriesMap.has(docId)) {
              dayEntriesMap.set(docId, dayObj);
            }
          }
        });

        let matchedDoc: any = null;
        const targetCategory = getTabCategory(currentTabId);

        // 1. Match master doc by section category
        for (const docItem of masterDocs) {
          const docCategory = getTabCategory(docItem.week || docItem.selectedWeek || docItem.range || "", docItem);
          if (docCategory === targetCategory) {
            matchedDoc = docItem;
            break;
          }
        }

        // 2. Match master doc by sample dates in structuredData
        if (!matchedDoc) {
          for (const docItem of masterDocs) {
            if (docItem.structuredData && Array.isArray(docItem.structuredData) && docItem.structuredData.length > 0) {
              const hasMatchingDate = docItem.structuredData.some((entry: any) => {
                const dStr = entry.date || entry.displayDate || "";
                const cleanDStr = toAsciiDigits(dStr);
                const iso = formatDateToIso(cleanDStr);
                let dayNum = 0;
                if (iso && iso.includes("-")) {
                  dayNum = parseInt(iso.split("-")[2], 10);
                } else {
                  const parts = cleanDStr.split(/[\/\-\.]/);
                  if (parts.length === 3) {
                    dayNum = parts[0].length === 4 ? parseInt(parts[2], 10) : parseInt(parts[0], 10);
                  }
                }
                if (dayNum > 0) {
                  if (targetCategory === "1 to 10" && dayNum >= 1 && dayNum <= 10) return true;
                  if (targetCategory === "11 to 20" && dayNum >= 11 && dayNum <= 20) return true;
                  if (targetCategory === "21 to 31" && dayNum >= 21 && dayNum <= 31) return true;
                }
                return false;
              });

              if (hasMatchingDate) {
                matchedDoc = docItem;
                break;
              }
            }
          }
        }

        // Populate structuredData from dayEntriesMap if empty
        if (matchedDoc) {
          if (!matchedDoc.structuredData || !Array.isArray(matchedDoc.structuredData) || matchedDoc.structuredData.length === 0) {
            const allDays = Array.from(dayEntriesMap.values());
            if (allDays.length > 0) {
              matchedDoc.structuredData = allDays;
            }
          }

          // Asynchronously parse DOCX file from Bunny Storage if structuredData is still empty
          const fetchTarget = matchedDoc.pageUrl || matchedDoc.masterPdfUrl;
          const isDocx = fetchTarget && (fetchTarget.toLowerCase().endsWith(".docx") || fetchTarget.toLowerCase().includes(".docx?"));
          if (fetchTarget && isDocx && (!matchedDoc.structuredData || matchedDoc.structuredData.length === 0)) {
            try {
              const targetUrl = getBunnyStorageUrl(fetchTarget);
              const headers: Record<string, string> = {
                AccessKey: import.meta.env.VITE_BUNNY_STORAGE_API_KEY || "",
              };
              const res = await fetch(targetUrl, { headers });
              if (res.ok) {
                const buffer = await res.arrayBuffer();
                const mammoth = await import("mammoth");
                const htmlResult = await mammoth.convertToHtml({ arrayBuffer: buffer });
                if (htmlResult.value) {
                  const { parseDocxHtmlToDiaries } = await import("@/lib/parse-diary-file");
                  const parsedPages = await parseDocxHtmlToDiaries(htmlResult.value, selectedClass);
                  if (parsedPages && parsedPages.length > 0) {
                    matchedDoc.structuredData = parsedPages;
                    // Persist to Firestore asynchronously
                    const dRef = doc(db, "teacher_diaries", selectedClass, selectedMedium, matchedDoc.id);
                    setDoc(dRef, { structuredData: parsedPages }, { merge: true }).catch(() => {});
                  }
                }
              }
            } catch (err) {
              console.error("Error auto-parsing master DOCX for range:", err);
            }
          }
        }

        setRangeMasterRecord(matchedDoc);
      } catch (e) {
        console.error("Error fetching range master record:", e);
      }
    }

    fetchRangeMasterRecord();
  }, [selectedClass, selectedMedium, selectedMonth, currentTabId]);

  const isoDate = activeDate ? format(activeDate, "yyyy-MM-dd") : "";
  const displayFormattedDate = activeDate ? format(activeDate, "eeee, dd MMMM yyyy") : "...";
  const isToday = activeDate ? format(new Date(), "yyyy-MM-dd") === isoDate : false;

  const activeTabMasterRecord = React.useMemo(() => {
    const targetCategory = getTabCategory(currentTabId);
    if (rangeMasterRecord && getTabCategory(rangeMasterRecord.week || rangeMasterRecord.selectedWeek || rangeMasterRecord.range || "", rangeMasterRecord) === targetCategory) {
      return rangeMasterRecord;
    }
    if (todayDiary && (todayDiary as any).pageUrl) {
      const todayCat = getTabCategory((todayDiary as any).week || (todayDiary as any).selectedWeek || (todayDiary as any).range || "", todayDiary);
      if (todayCat === targetCategory) {
        return {
          id: (todayDiary as any)?.id || isoDate,
          diaryDate: isoDate,
          fileName: (todayDiary as any)?.fileName || "Teaching_Diary.docx",
          pageUrl: (todayDiary as any)?.pageUrl,
          className: selectedClass,
          medium: selectedMedium,
          structuredData: (todayDiary as any)?.structuredData,
          week: (todayDiary as any)?.week,
          month: (todayDiary as any)?.month,
        };
      }
    }
    return null;
  }, [rangeMasterRecord, todayDiary, currentTabId, isoDate, selectedClass, selectedMedium]);

  const resolveThoughtForDate = async (
    dateIso: string,
    cls: string,
    med: string,
    existingThought?: string
  ): Promise<string> => {
    // 1. Prioritize existingThought from the matched day page of the uploaded file
    const cleanedExisting = cleanThoughtText(existingThought);
    if (cleanedExisting && !cleanedExisting.includes("सुविचार उपलब्ध नाही") && !isDefaultFallbackThought(cleanedExisting)) {
      return cleanedExisting;
    }

    // 2. Check local storage for date-specific user-edited thought
    const localThought = cleanThoughtText(
      localStorage.getItem(`suvichar_${cls}_${med}_${dateIso}`) ||
      localStorage.getItem(`suvichar_${dateIso}`)
    );
    if (localThought && !localThought.includes("सुविचार उपलब्ध नाही") && !isDefaultFallbackThought(localThought)) {
      return localThought;
    }

    // 3. Check teaching_diaries doc for specific dateIso
    try {
      const tdDocId = `${cls}_${med}_${dateIso}`;
      const tdSnap = await getDoc(doc(db, "teaching_diaries", tdDocId));
      if (tdSnap.exists()) {
        const tData = tdSnap.data();
        const tThought = cleanThoughtText(tData.thought || tData.suvichar);
        if (tThought && !tThought.includes("सुविचार उपलब्ध नाही") && !isDefaultFallbackThought(tThought)) {
          return tThought;
        }
      }
    } catch (e) {}

    // 4. Check teacher_diaries master docs with structuredData for matching date
    try {
      const colRef = collection(db, "teacher_diaries", cls, med);
      const snap = await getDocs(colRef);
      const targetMonthStr = dateIso.split("-")[1];
      const targetCat = getTabCategory(currentTabId);
      for (const dSnap of snap.docs) {
        const dData = dSnap.data();
        if (!isDocMatchingMonth(dData, targetMonthStr)) continue;
        const dCat = getTabCategory(dData.week || dData.selectedWeek || dData.range || "", dData);
        if (dCat !== targetCat) continue;

        if (dData.structuredData && Array.isArray(dData.structuredData)) {
          const match = findMatchingEntryForDate(dData.structuredData, dateIso, currentTabId);
          if (match) {
            const sThought = cleanThoughtText(match.thought || match.suvichar);
            if (sThought && !sThought.includes("सुविचार उपलब्ध नाही") && !isDefaultFallbackThought(sThought)) {
              return sThought;
            }
          }
        }
      }
    } catch (e) {}

    // 5. Check daily_paripath_archive for dateIso
    try {
      const paripathSnap = await getDoc(doc(db, "daily_paripath_archive", dateIso));
      if (paripathSnap.exists()) {
        const pData = paripathSnap.data();
        const pThought = cleanThoughtText(pData.suvichar || pData.thought || pData.thoughtOfTheDay);
        if (pThought && !pThought.includes("सुविचार उपलब्ध नाही") && !isDefaultFallbackThought(pThought)) {
          return pThought;
        }
      }
    } catch (e) {}

    return cleanedExisting || "";
  };

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

        const targetCategory = getTabCategory(currentTabId);

        // 1. Check rangeMasterRecord FIRST (the master doc loaded for the current tab e.g. 1to10, 11to20, 21to30)
        if (rangeMasterRecord && getTabCategory(rangeMasterRecord.week, rangeMasterRecord) === targetCategory) {
          const match = (rangeMasterRecord.structuredData && Array.isArray(rangeMasterRecord.structuredData))
            ? findMatchingEntryForDate(rangeMasterRecord.structuredData, isoDate, currentTabId)
            : null;

          let periodList: PeriodItem[] = match && match.periods && Array.isArray(match.periods) ? match.periods : [];
          if (periodList.length === 0 && rangeMasterRecord.periods) {
            periodList = extractSingleDayPeriods(rangeMasterRecord.periods, isoDate, activeDate, currentTabId);
          }

          // Check if user has explicitly saved custom edits for this single day in teaching_diaries
          const userSingleDocId = `${selectedClass}_${selectedMedium}_${isoDate}`;
          try {
            const userSingleSnap = await getDoc(doc(db, "teaching_diaries", userSingleDocId));
            if (userSingleSnap.exists()) {
              const uData = userSingleSnap.data();
              if (uData.isUserEdited && uData.periods && Array.isArray(uData.periods) && uData.periods.length > 0) {
                periodList = uData.periods;
              }
            }
          } catch (e) {}

          const rawPageUrl = rangeMasterRecord.pageUrl || rangeMasterRecord.pageURL || rangeMasterRecord.masterPdfUrl || rangeMasterRecord.pdfUrl || "";
          const resolvedThought = await resolveThoughtForDate(
            isoDate,
            selectedClass,
            selectedMedium,
            (match ? match.thought : "") || rangeMasterRecord.thought
          );

          if (rawPageUrl || periodList.length > 0 || match) {
            setTodayDiary({
              id: rangeMasterRecord.id,
              date: isoDate,
              displayDate: displayFormattedDate,
              day: (match ? match.day : "") || getMarathiDayName(isoDate),
              thought: resolvedThought,
              dinvishesh: (match ? match.dinvishesh : "") || rangeMasterRecord.dinvishesh || "",
              className: selectedClass,
              medium: selectedMedium,
              periods: periodList,
              pageUrl: rawPageUrl,
              fileName: rangeMasterRecord.fileName || "Teaching_Diary.pdf",
              uploadedAt: rangeMasterRecord.uploadedAt || Date.now(),
              structuredData: rangeMasterRecord.structuredData,
            } as any);
            setLoading(false);
            return;
          }
        }

        // 2. Check primary teaching_diaries collection (user edited single day doc)
        const docId = `${selectedClass}_${selectedMedium}_${isoDate}`;
        const docRef = doc(db, "teaching_diaries", docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as DailyDiary;
          const dataCategory = getTabCategory((data as any).week, data);
          const dataMonth = data.date ? data.date.split("-")[1] : (data.displayDate ? data.displayDate.split("-")[1] : targetMonthStr);
          
          if ((!dataMonth || dataMonth === targetMonthStr) && dataCategory === targetCategory) {
            const resolvedThought = await resolveThoughtForDate(
              isoDate,
              selectedClass,
              selectedMedium,
              data.thought || (data as any).suvichar
            );
            data.thought = resolvedThought;
            const rawPageUrl = data.pageUrl || (data as any).pageURL || (data as any).masterPdfUrl || (data as any).pdfUrl || "";
            let activePeriods = data.periods || [];
            const singleDayPeriods = extractSingleDayPeriods(activePeriods, isoDate, activeDate, currentTabId);
            setTodayDiary({ ...data, pageUrl: rawPageUrl || data.pageUrl, periods: singleDayPeriods });
            setLoading(false);
            return;
          }
        }

        // 3. Fallback check teacher_diaries collection (teacher_diaries/{selectedClass}/{selectedMedium}/{isoDate})
        const altRef = doc(db, "teacher_diaries", selectedClass, selectedMedium, isoDate);
        const altSnap = await getDoc(altRef);

        if (altSnap.exists()) {
          const altData = altSnap.data();
          const altDate = altData.diaryDate || altData.date || isoDate;
          const altMonth = altData.month || (altDate ? altDate.split("-")[1] : targetMonthStr);
          const altCategory = getTabCategory(altData.week, altData);

          if ((!altMonth || altMonth === targetMonthStr) && altCategory === targetCategory) {
            const rawPageUrl = altData.pageUrl || altData.pageURL || altData.masterPdfUrl || altData.pdfUrl || (altData.parsedContent ? altData.parsedContent.pageUrl || altData.parsedContent.masterPdfUrl : "");
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

            const singleDayPeriods = extractSingleDayPeriods(periodList, isoDate, activeDate, currentTabId);
            const resolvedThought = await resolveThoughtForDate(
              isoDate,
              selectedClass,
              selectedMedium,
              parsed.thought || altData.thought
            );

            setTodayDiary({
              date: isoDate,
              displayDate: displayFormattedDate,
              day: parsed.day || altData.day || getMarathiDayName(isoDate),
              thought: resolvedThought,
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

        // 4. Fallback: Search all uploaded records in teacher_diaries for selectedClass & selectedMedium matching currentTabId
        const colRef = collection(db, "teacher_diaries", selectedClass, selectedMedium);
        const snap = await getDocs(colRef);
        
        let masterDoc: any = null;
        let matchedEntryFromList: any = null;

        snap.docs.forEach((dSnap) => {
          const data = dSnap.data();
          if (!isDocMatchingMonth(data, targetMonthStr)) return;
          const docCategory = getTabCategory(data.week || data.selectedWeek || data.range || "", data);
          const targetCategory = getTabCategory(currentTabId);
          const matchesTab = docCategory === targetCategory;

          if (matchesTab && data.structuredData && Array.isArray(data.structuredData)) {
            const entry = findMatchingEntryForDate(data.structuredData, isoDate, currentTabId);
            if (entry) {
              masterDoc = { id: dSnap.id, ...data };
              matchedEntryFromList = entry;
            }
          }
        });

        if (masterDoc && matchedEntryFromList) {
          const periodList: PeriodItem[] = matchedEntryFromList.periods || [];
          const rawPageUrl = masterDoc.pageUrl || masterDoc.pageURL || masterDoc.masterPdfUrl || masterDoc.pdfUrl || "";

          const resolvedThought = await resolveThoughtForDate(
            isoDate,
            selectedClass,
            selectedMedium,
            matchedEntryFromList.thought || masterDoc.thought
          );

          setTodayDiary({
            id: masterDoc.id,
            date: isoDate,
            displayDate: displayFormattedDate,
            day: matchedEntryFromList.day || getMarathiDayName(isoDate),
            thought: resolvedThought,
            dinvishesh: matchedEntryFromList.dinvishesh || masterDoc.dinvishesh || "",
            className: selectedClass,
            medium: selectedMedium,
            periods: periodList,
            pageUrl: rawPageUrl,
            fileName: masterDoc.fileName || "Teaching_Diary.pdf",
            uploadedAt: masterDoc.uploadedAt || Date.now(),
            structuredData: masterDoc.structuredData,
          } as any);
          setLoading(false);
          return;
        }

        // 5. Fallback thought if available
        const fallbackThought = await resolveThoughtForDate(isoDate, selectedClass, selectedMedium, "");
        if (fallbackThought) {
          setTodayDiary({
            date: isoDate,
            displayDate: displayFormattedDate,
            day: getMarathiDayName(isoDate),
            thought: fallbackThought,
            dinvishesh: "",
            className: selectedClass,
            medium: selectedMedium,
            periods: [],
            pageUrl: "",
            fileName: "Teaching_Diary.pdf",
            uploadedAt: Date.now(),
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
  }, [selectedClass, selectedMedium, isoDate, rangeMasterRecord, currentTabId]);

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
    const cleaned = cleanThoughtText(newThought);
    setTodayDiary({
      ...todayDiary,
      thought: cleaned,
    });
    if (isoDate) {
      try {
        localStorage.setItem(`suvichar_${selectedClass}_${selectedMedium}_${isoDate}`, cleaned);
        localStorage.setItem(`suvichar_${isoDate}`, cleaned);
      } catch (e) {}

      try {
        const tdDocId = `${selectedClass}_${selectedMedium}_${isoDate}`;
        const tdDocRef = doc(db, "teaching_diaries", tdDocId);
        setDoc(tdDocRef, {
          className: selectedClass,
          medium: selectedMedium,
          date: isoDate,
          thought: cleaned,
          updatedAt: Date.now(),
        }, { merge: true });
      } catch (e) {}

      try {
        const teacherDocRef = doc(db, "teacher_diaries", selectedClass, selectedMedium, isoDate);
        setDoc(teacherDocRef, {
          thought: cleaned,
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
      ${cleanThoughtText(todayDiary.thought) ? `<div style="background: #fffbeb; border: 1.5px solid #fcd34d; border-radius: 8px; padding: 10px 16px; margin-bottom: 14px; font-size: 13.5px; color: #78350f; text-align: center;">
        <strong style="font-weight: 900; color: #92400e;">आजचा सुविचार :</strong> "${cleanThoughtText(todayDiary.thought)}"
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
    <div className="w-full max-w-full space-y-6" ref={printRef} suppressHydrationWarning>
      {/* ═══ 3 Date Range Tabs (1 to 10, 11 to 20, 21 to 30/31) & Quick Date Selector ═══ */}
      <div className="bg-white/95 backdrop-blur-md border-2 border-slate-200/90 p-5 sm:p-6 rounded-[2rem] shadow-md space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black">
              <CalendarIcon className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">तारीख कालावधी निवडा (SELECT DATE RANGE TAB)</h3>
              <p className="text-[11px] text-slate-500 font-semibold">अ‍ॅडमिन प्रमाणे ३ तारीख टॅब व दिवस-निहाय पाठ टाचण व्ह्यू</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            {selectedMonth && (
              <span className="text-xs font-black text-orange-700 bg-gradient-to-r from-orange-100 to-amber-100 px-4 py-1.5 rounded-full border border-orange-300/80 shadow-sm flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-orange-500" />
                <span>{["जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून", "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"][activeMonthNum - 1]} {activeYearNum}</span>
              </span>
            )}
            {(todayDiary as any)?.pageUrl && !isStudent && profile?.role !== "student" && (
              <button
                type="button"
                onClick={handleDeleteCurrentFile}
                className="p-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-rose-500/25 cursor-pointer active:scale-95"
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
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/25 cursor-pointer active:scale-95 disabled:opacity-50"
                  title="केलेले सर्व बदल फिक्स सेव्ह करा"
                >
                  {isSaving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  <span>{isSaving ? "सेव्ह होत आहे..." : "बदल सेव्ह करा"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/25 cursor-pointer active:scale-95"
                >
                  <Download className="size-3.5" /> <span>PDF डाऊनलोड</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 3 Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: "1 to 10", mr: "1 ते 10 तारीख", sub: "1 to 10 Date Range" },
            { id: "11 to 20", mr: "11 ते 20 तारीख", sub: "11 to 20 Date Range" },
            { id: "21 to 31", mr: "21 ते 30/31 तारीख", sub: "21 to 30/31 Date Range" },
          ].map((tab) => {
            const isActive = currentTabId === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id)}
                className={`py-4 px-4 sm:px-6 rounded-2xl text-xs sm:text-sm font-black transition-all duration-300 flex flex-col items-center justify-center gap-1 cursor-pointer relative overflow-hidden ${
                  isActive
                    ? "bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-xl shadow-orange-500/30 scale-[1.02] border-2 border-amber-300"
                    : "bg-slate-50/80 hover:bg-slate-100 text-slate-700 border-2 border-slate-200/80 hover:border-orange-300"
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 right-0 size-16 bg-white/20 rounded-full blur-md pointer-events-none" />
                )}
                <div className="flex items-center gap-2">
                  <Sparkles className={`size-4 ${isActive ? "text-amber-200 animate-pulse" : "text-slate-400"}`} />
                  <span className="text-sm sm:text-base font-extrabold">{tab.mr}</span>
                </div>
                <span className={`text-[11px] font-bold ${isActive ? "text-orange-100" : "text-slate-400"}`}>
                  {tab.sub}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Date Selector Pills */}
        <div className="pt-2 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-slate-600">
            <p className="flex items-center gap-1.5 text-slate-700 font-extrabold">
              <span>खालील तारखेवर क्लिक करून थेट त्या तारखेचे पाठ टाचण पहा:</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAllDaysMode(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                  isAllDaysMode
                    ? "bg-slate-950 text-amber-300 border border-amber-400 ring-2 ring-orange-500/40"
                    : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                }`}
              >
                <FileText className="size-3.5" />
                <span>१० दिवसांची फाईल पहा (All Days File)</span>
              </button>
              <span className="text-[11px] font-black text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                (रविवार शासकीय सुट्टी)
              </span>
            </div>
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-11 gap-2 w-full pt-1">
            {/* All Days Pill */}
            <button
              type="button"
              onClick={() => setIsAllDaysMode(true)}
              className={`py-2.5 px-1.5 rounded-2xl text-xs font-black transition-all flex flex-col items-center justify-center cursor-pointer shadow-sm ${
                isAllDaysMode
                  ? "bg-slate-950 text-amber-300 shadow-xl ring-4 ring-orange-500/40 scale-105 border-2 border-amber-400"
                  : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-2 border-orange-400"
              }`}
              title="निवडलेल्या १० दिवसांची संपूर्ण फाईल व सर्व पाठ टाचण तक्ता पहा"
            >
              <span className="text-xs font-black leading-none flex items-center gap-0.5">
                <Sparkles className="size-3 text-amber-200" /> All Days
              </span>
              <span className="text-[9px] font-extrabold mt-1 uppercase opacity-90">
                (१० दिवस)
              </span>
            </button>

            {rangeDays.map((dObj) => {
              const isSelected = !isAllDaysMode && activeDate && format(activeDate, "yyyy-MM-dd") === dObj.dateIso;
              const isSunday = dObj.dayOfWeek === 0;

              return (
                <button
                  key={dObj.dateIso}
                  type="button"
                  onClick={() => {
                    setIsAllDaysMode(false);
                    setActiveDate(dObj.dateObj);
                  }}
                  className={`py-2.5 px-2 rounded-2xl text-xs font-black transition-all flex flex-col items-center justify-center cursor-pointer shadow-sm ${
                    isSelected
                      ? "bg-slate-950 text-amber-300 shadow-xl ring-4 ring-orange-500/40 scale-105 border-2 border-amber-400"
                      : isSunday
                      ? "bg-rose-50 text-rose-600 border-2 border-rose-200 hover:bg-rose-100"
                      : "bg-slate-100/90 text-slate-800 hover:bg-orange-500 hover:text-white border-2 border-slate-200/80 hover:border-orange-500"
                  }`}
                  title={`${dObj.displayDate} (${dObj.dayName})`}
                >
                  <span className="text-base font-black leading-none">{dObj.dayNum}</span>
                  <span className={`text-[10px] font-extrabold mt-1 uppercase ${isSelected ? "text-amber-300" : isSunday ? "text-rose-600" : "opacity-80"}`}>
                    {dObj.dayShort}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* All Days Mode vs Daily View */}
      {isAllDaysMode ? (
        <div className="bg-white border-2 border-slate-300 rounded-3xl p-5 sm:p-7 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-black shadow-md">
                <FileText className="size-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-lg">
                  संपूर्ण १० दिवसांची पाठ टाचण फाईल (All 10 Days Document View)
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  कालावधी: {currentTabId === "1 to 10" ? "१ ते १० तारीख" : currentTabId === "11 to 20" ? "११ ते २० तारीख" : "२१ ते ३०/३१ तारीख"} • {selectedClass} ({selectedMedium})
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAllDaysMode(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <RotateCcw className="size-4" />
              <span>दिवस-निहाय व्ह्यू वर जा (Single Day View)</span>
            </button>
          </div>

          {activeTabMasterRecord ? (
            <div className="h-[750px] w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-inner">
              <DocumentLivePreview
                selectedFile={null}
                savedRecord={activeTabMasterRecord}
                onBack={() => setIsAllDaysMode(false)}
              />
            </div>
          ) : (
            <div className="p-12 text-center space-y-4 bg-amber-50/60 rounded-3xl border-2 border-amber-200">
              <div className="size-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="size-7" />
              </div>
              <h4 className="font-black text-slate-900 text-lg">
                या {currentTabId === "1 to 10" ? "१ ते १०" : currentTabId === "11 to 20" ? "११ ते २०" : "२१ ते ३०/३१"} तारीख कालावधीची फाईल उपलब्ध नाही
              </h4>
              <p className="text-xs text-slate-600 font-bold max-w-md mx-auto leading-relaxed">
                अ‍ॅडमिनद्वारे १ ते १०, ११ ते २० किंवा २१ ते ३० तारीख कालावधीची फाईल अपलोड केली असल्यास ती संपूर्ण १० दिवसांच्या टाचण तक्त्यासह येथे दिसेल.
              </p>
            </div>
          )}
        </div>
      ) : loading ? (
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
                <span className="text-indigo-700 font-black text-base block">
                  {todayDiary.displayDate && todayDiary.displayDate !== "-"
                    ? todayDiary.displayDate
                    : (activeDate ? format(activeDate, "d/M/yyyy") : "-")}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block text-xs uppercase mb-0.5">वार</span>
                <span className="text-slate-900 font-black text-base block">
                  {todayDiary.day && todayDiary.day !== "-"
                    ? todayDiary.day
                    : (activeDate ? ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"][activeDate.getDay()] : "-")}
                </span>
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
              {cleanThoughtText(todayDiary.thought)
                ? `"${cleanThoughtText(todayDiary.thought)}"`
                : "आजचा सुविचार प्रविष्ट करण्यासाठी येथे क्लिक करा..."}
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
      ) : activeTabMasterRecord ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                <FileText className="size-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  पाठ टाचण दस्तऐवज (Document View — {displayFormattedDate})
                </h3>
                <p className="text-xs text-slate-500 font-semibold">{activeTabMasterRecord.fileName || "Teaching_Diary.docx"}</p>
              </div>
            </div>
            {activeTabMasterRecord.pageUrl && (
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 cursor-pointer hover:from-orange-600 hover:to-amber-600 active:scale-95 transition-all"
              >
                <Eye className="size-4" /> <span>फुल स्क्रीन पहा (Full Preview)</span>
              </button>
            )}
          </div>
          <div className="h-[650px] w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
            <DocumentLivePreview
              selectedFile={null}
              savedRecord={activeTabMasterRecord}
              selectedDateIso={isoDate}
              onBack={() => {}}
            />
          </div>
        </div>
      ) : null}

      {/* Document Live Preview Modal */}
      {isPreviewModalOpen && activeTabMasterRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-[96vw] border border-slate-100 flex flex-col h-[93vh]">
            <div className="flex-1 overflow-hidden bg-slate-100 p-2 sm:p-4">
              <DocumentLivePreview
                selectedFile={null}
                savedRecord={activeTabMasterRecord}
                selectedDateIso={isAllDaysMode ? undefined : isoDate}
                onBack={() => setIsPreviewModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
