import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Printer,
  Download,
  Sparkles,
  Save,
  RotateCcw,
  Calendar,
  BookOpen,
  FileSpreadsheet,
  Check,
  Building2,
  Clock,
  CheckCircle2,
  RefreshCw,
  Loader2,
  CalendarDays,
  Trash2,
  Plus,
  X,
  SunMedium,
} from "lucide-react";
import { showToast as toast } from "@/lib/custom-toast";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// ---------- Types ----------
interface DayRowData {
  date: number;
  day: string;
  isSunday: boolean;
  isHoliday?: boolean;
  holidayReason?: string;
  rashtrageet: string;
  rajyageet: string;
  pratigya: string;
  sanvidhan: string;
  prarthana: string;
  shlok: string;
  panchang: string;
  suvichar: string;
  batmya: string;
  dinvishesh: string;
  mhan: string;
  bodhkatha: string;
  samuhgeet: string;
  deshbhaktigeet: string;
  samanyaGyan: string;
  maun: string;
  swakshari: string;
}

// ---------- Constants ----------
const MARATHI_DAYS = [
  "रविवार",
  "सोमवार",
  "मंगळवार",
  "बुधवार",
  "गुरुवार",
  "शुक्रवार",
  "शनिवार",
];

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

// Helper: clean text and fetch only as much content as fits cleanly in max 2 lines
function shortText(text: string | undefined, maxLen = 40): string {
  if (!text) return "";
  const cleaned = text.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLen) return cleaned;

  // Trim to maxLen at word boundary
  let sub = cleaned.substring(0, maxLen);
  const lastSpace = sub.lastIndexOf(" ");
  if (lastSpace > 12) {
    sub = sub.substring(0, lastSpace);
  }
  // Trim trailing punctuation/colons/dashes
  return sub.replace(/[:\-–,\s]+$/, "").trim();
}

// Helper: Extract ONLY the first single news item or single dinvishesh event
function getSingleItem(dataRaw: any, maxLen = 65): string {
  if (!dataRaw) return "";

  let firstItem = "";
  if (Array.isArray(dataRaw)) {
    firstItem = dataRaw.find((item) => item && String(item).trim().length > 0) || "";
  } else if (typeof dataRaw === "object") {
    firstItem = Object.values(dataRaw).find((val) => val && String(val).trim().length > 0) as string || "";
  } else {
    firstItem = String(dataRaw);
  }

  if (!firstItem) return "";

  // 1. Split by newlines first if there are multiple lines
  const lines = firstItem.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  let single = lines[0] || firstItem;

  // 2. If it contains multiple events (e.g., "1873 : ... 1875 : ..." or "१९०१ : ... १९०५ : ...")
  const eventMatch = single.split(/(?=\s(?:18|19|20|१८|१९|२०)\d{2}\s*[:\-–])/);
  if (eventMatch.length > 1) {
    single = eventMatch[0].trim();
  }

  // 3. If it contains multiple news items separated by period + capital/Devanagari or bullet point
  const newsMatch = single.split(/(?<=[.!?।])\s+(?=[A-Z0-9\u0900-\u097F])/);
  if (newsMatch.length > 1 && newsMatch[0].length >= 15) {
    single = newsMatch[0].trim();
  }

  // 4. Remove leading bullet points or numbers (e.g. "1.", "•", "- ")
  single = single.replace(/^[\d\s•\-\.\*]+/, "").trim();

  // 5. If still longer than maxLen, trim at word boundary
  if (single.length <= maxLen) return single;

  let sub = single.substring(0, maxLen);
  const lastSpace = sub.lastIndexOf(" ");
  if (lastSpace > 15) {
    sub = sub.substring(0, lastSpace);
  }
  return sub.replace(/[:\-–,\s]+$/, "").trim();
}

const DEFAULT_PRAYER_NAMES = [
  "असतो मा सद्गमय",
  "हीच अमुची प्रार्थना",
  "इतनी शक्ति हमें देना",
  "तू बुद्धि दे तू तेज दे",
  "दया कर दान विद्या का",
  "ऐ मालिक तेरे बंदे हम",
  "खरा तो एकची धर्म",
];

// Helper: get prayer heading title from content
function getPrayerShortName(prayerContent: string | undefined, dayNum?: number): string {
  const defaultTitle = dayNum ? DEFAULT_PRAYER_NAMES[(dayNum - 1) % DEFAULT_PRAYER_NAMES.length] : "असतो मा सद्गमय";
  if (!prayerContent) return defaultTitle;
  const content = prayerContent.trim();
  if (!content || content === "प्रार्थना" || content === "Prayer") return defaultTitle;

  // Detect common prayers by first phrase
  if (content.includes("हीच अमुची प्रार्थना")) return "हीच अमुची प्रार्थना";
  if (content.includes("इतनी शक्ति हमें")) return "इतनी शक्ति हमें देना";
  if (content.includes("दया कर दान विद्या")) return "दया कर दान विद्या का";
  if (content.includes("ऐ मालिक तेरे बंदे")) return "ऐ मालिक तेरे बंदे हम";
  if (content.includes("हम को मन की शक्ति")) return "हम को मन की शक्ति देना";
  if (content.includes("तू प्यार का सागर")) return "तू प्यार का सागर है";
  if (content.includes("ॐ सह नाववतु")) return "ॐ सह नाववतु";
  if (content.includes("असतो मा सद्गमय") || content.includes("असतो मा सदगमय")) return "असतो मा सद्गमय";
  if (content.includes("वक्रतुंड महाकाय") || content.includes("वक्रतुण्ड महाकाय")) return "वक्रतुंड महाकाय";
  if (content.includes("गणपती बाप्पा")) return "गणपती बाप्पा मोरया";
  if (content.includes("शुभं करोति")) return "शुभं करोति कल्याणम्";
  if (content.includes("देवा तुझे किती सुंदर")) return "देवा तुझे किती सुंदर";
  if (content.includes("नमस्कार माझा हा")) return "नमस्कार माझा हा ज्ञानमंदिरा";
  if (content.includes("तू बुद्धि दे तू तेज दे")) return "तू बुद्धि दे तू तेज दे";
  if (content.includes("हे राष्ट्र देवतांचे")) return "हे राष्ट्र देवतांचे";
  if (content.includes("खरा तो एकची धर्म")) return "खरा तो एकची धर्म";
  if (content.includes("या भारतात बंधुभाव")) return "या भारतात बंधुभाव";
  if (content.includes("अजाण आम्ही तुझी लेकरे")) return "अजाण आम्ही तुझी लेकरे";

  // Fallback: short first phrase up to newline, comma, dash, or 22 characters
  const firstLine = content.split(/\r?\n/)[0].trim();
  const firstPhrase = firstLine.split(",")[0].split("-")[0].split("।")[0].trim();
  if (!firstPhrase || firstPhrase === "प्रार्थना" || firstPhrase === "Prayer") return defaultTitle;
  return firstPhrase.length > 22 ? firstPhrase.substring(0, 22) + "..." : firstPhrase;
}

// Helper: get pasayadan heading title from content
function getPasayadanShortName(pasayadanContent: string | undefined): string {
  if (!pasayadanContent) return "आता विश्वात्मकें देवें";
  const content = pasayadanContent.trim();
  if (!content) return "आता विश्वात्मकें देवें";

  if (content.length <= 25 && !content.includes("\n")) {
    return content;
  }

  if (content.includes("आता विश्वात्मकें") || content.includes("आता विश्वात्मके") || content.includes("पसायदान")) {
    return "आता विश्वात्मकें देवें";
  }

  const firstPhrase = content.split("\n")[0].split(",")[0].split("-")[0].trim();
  return firstPhrase.length > 25 ? firstPhrase.substring(0, 25) + "..." : (firstPhrase || "आता विश्वात्मकें देवें");
}

// Helper: extract & normalize patriotic/group song short title cleanly
function cleanSongTitle(data: any): string {
  if (!data) return "";
  let title = (data.songTitle || data.deshbhaktigeetTitle || data.samuhgeetTitle || "").trim();
  if (!title) {
    const rawSong = (data.patrioticSong || data.samuhgeet || data.deshbhaktigeet || "").trim();
    if (!rawSong) return "";
    title = rawSong.split(/\r?\n/)[0].trim();
  }
  if (!title) return "";

  // Normalize known common patriotic / group songs
  if (title.includes("अजिंक्य भारत")) return "अजिंक्य भारत";
  if (title.includes("बलसागर भारत")) return "बलसागर भारत होवो";
  if (title.includes("माझ्या देशावर")) return "माझ्या देशावर माझे प्रेम आहे";
  if (title.includes("खरा तो एकची धर्म")) return "खरा तो एकची धर्म";
  if (title.includes("हे राष्ट्र देवतांचे")) return "हे राष्ट्र देवतांचे";
  if (title.includes("जयोस्तुते")) return "जयोस्तुते";
  if (title.includes("शूर आम्ही सरदार")) return "शूर आम्ही सरदार";
  if (title.includes("उत्तुंग आमुची")) return "उत्तुंग आमुची ध्येयधुरा";
  if (title.includes("प्रिय आमुचा")) return "प्रिय आमुचा महाराष्ट्र देश";

  // Clean trailing dots (...), colons, dashes, commas
  title = title.replace(/[\.\s]+$/, "").replace(/[:\-–,\s]+$/, "").trim();

  if (title.length > 35) {
    let sub = title.substring(0, 35);
    const lastSpace = sub.lastIndexOf(" ");
    if (lastSpace > 10) {
      sub = sub.substring(0, lastSpace);
    }
    title = sub.replace(/[:\-–,\s]+$/, "").trim();
  }
  return title;
}

// Helper: detect language of content
function detectLanguage(content: string | undefined): string {
  if (!content) return "मराठी";
  // Check for Hindi specific patterns
  if (content.includes("हम,") || content.includes("हम भारत के लोग") || content.includes("भारत मेरा देश है")) return "हिंदी";
  // Check for English
  if (/^[A-Za-z\s,.'"\-!?]+$/.test(content.substring(0, 50))) return "इंग्रजी";
  // Check for Marathi specific patterns
  if (content.includes("भारत माझा देश") || content.includes("माझ्या")) return "मराठी";
  // Default
  return "मराठी";
}

const DEFAULT_SINGLE_LINE_SHLOKS = [
  "वक्रतुण्ड महाकाय सूर्यकोटिसमप्रभ ।",
  "गुरुर ब्रह्मा गुरुर विष्णुः ।",
  "न चोरहार्यं न च राजहार्यं ।",
  "कराग्रे वसते लक्ष्मीः ।",
  "शुभं करोति कल्याणम् ।",
  "सर्वमंगल मांगल्ये शिवे ।",
  "ॐ असतो मा सद्गमय ।",
];

function formatShlokOneLine(shlokRaw: string | undefined): string {
  if (!shlokRaw || !shlokRaw.trim()) {
    return "";
  }
  let text = shlokRaw.trim();
  const lines = text.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    text = lines[0];
  }
  if (text.includes("।")) {
    const part = text.split("।")[0].trim();
    if (part.length >= 8) {
      return `${part} ।`;
    }
  }
  if (text.length > 38) {
    let sub = text.substring(0, 38);
    const lastSpace = sub.lastIndexOf(" ");
    if (lastSpace > 10) {
      sub = sub.substring(0, lastSpace);
    }
    return sub.replace(/[:\-–,\s]+$/, "").trim();
  }
  return text;
}

const MARATHI_TITHIS = [
  "प्रथमा", "द्वितीया", "तृतीया", "चतुर्थी", "पंचमी",
  "षष्ठी", "सप्तमी", "अष्टमी", "नवमी", "दशमी",
  "एकादशी", "द्वादशी", "त्रयोदशी", "चतुर्दशी", "पौर्णिमा",
  "प्रथमा", "द्वितीया", "तृतीया", "चतुर्थी", "पंचमी",
  "षष्ठी", "सप्तमी", "अष्टमी", "नवमी", "दशमी",
  "एकादशी", "द्वादशी", "त्रयोदशी", "चतुर्दशी", "अमावास्या"
];

const MARATHI_HINDU_MONTHS = [
  "पौष", "माघ", "फाल्गुन", "चैत्र", "वैशाख", "ज्येष्ठ",
  "आषाढ", "श्रावण", "भाद्रपद", "कार्तिक", "मार्गशीर्ष", "पौष"
];

function formatPanchangTwoLines(data: any, dateObj: Date): string {
  if (!data) return "";

  if (data.panchang && typeof data.panchang === "string" && data.panchang.trim()) {
    const str = data.panchang.trim();
    if (str.includes("\n")) {
      const lines = str.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
      if (lines.length >= 2) return lines.slice(0, 2).join("\n");
    }
    if (str.includes(",")) {
      const parts = str.split(",").map((p: string) => p.trim()).filter(Boolean);
      if (parts.length >= 4) {
        return `${parts[0]}, ${parts[1]},\n${parts[2]}, ${parts[3]}`;
      } else if (parts.length >= 2) {
        return `${parts[0]},\n${parts.slice(1).join(", ")}`;
      }
    }
    return str;
  }

  // Only return panchang string if admin filled explicit panchang fields
  if (data.month || data.tithi || data.paksha || data.nakshatra || data.yog) {
    const dayName = data.day || MARATHI_DAYS[dateObj.getDay()];
    const monthName = data.month || "";
    const pakshaName = data.paksha || "";
    const tithiName = data.tithi || "";

    const line1Parts = [];
    if (dayName) line1Parts.push(`वार : ${dayName}`);
    if (monthName) line1Parts.push(`मास : ${monthName}`);

    const line2Parts = [];
    if (pakshaName) line2Parts.push(`पक्ष : ${pakshaName}`);
    if (tithiName) line2Parts.push(`तिथी : ${tithiName}`);

    const line1 = line1Parts.join(", ");
    const line2 = line2Parts.join(", ");

    if (line1 && line2) return `${line1},\n${line2}`;
    if (line1) return line1;
    if (line2) return line2;
  }

  return "";
}

function getCurrentAcademicYearStr(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;
  return `सन ${startYear}-${endYear.toString().slice(-2)}`;
}

// ---------- Main Component ----------
export function MonthlyParipathRegister() {
  const printRef = useRef<HTMLDivElement>(null);
  const now = new Date();

  const [schoolName, setSchoolName] = useState("जि. प. प्राथमिक शाळा");
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYearStr());
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [schoolInfo, setSchoolInfo] = useState({
    schoolName: "",
    udise: "",
    kendra: "",
    taluka: "",
    jilha: "",
  });
  const [headmasterName, setHeadmasterName] = useState("");
  const [teacherName, setTeacherName] = useState("");

  useEffect(() => {
    try {
      const savedInfoStr = localStorage.getItem("paripathSchoolInfo");
      let infoObj: any = savedInfoStr ? JSON.parse(savedInfoStr) : {};

      const teacherProfileStr = localStorage.getItem("teacher_profile");
      if (teacherProfileStr) {
        try {
          const tp = JSON.parse(teacherProfileStr);
          infoObj.schoolName = infoObj.schoolName || tp.schoolName || tp.school || "";
          infoObj.udise = infoObj.udise || tp.udise || tp.udiseNo || tp.udiseNumber || "";
          infoObj.kendra = infoObj.kendra || tp.kendra || tp.center || "";
          infoObj.taluka = infoObj.taluka || tp.taluka || "";
          infoObj.jilha = infoObj.jilha || tp.jilha || tp.district || "";
          infoObj.headmasterName = infoObj.headmasterName || tp.headmasterName || tp.principalName || tp.hmName || "";
          infoObj.teacherName = infoObj.teacherName || tp.teacherName || tp.name || "";
        } catch (e) {}
      }

      const sqafStr = localStorage.getItem("sqaaf_school_info") || localStorage.getItem("sqaf_school_info");
      if (sqafStr) {
        try {
          const sq = JSON.parse(sqafStr);
          infoObj.schoolName = infoObj.schoolName || sq.schoolName || "";
          infoObj.udise = infoObj.udise || sq.udise || "";
          infoObj.kendra = infoObj.kendra || sq.kendra || "";
          infoObj.taluka = infoObj.taluka || sq.taluka || "";
          infoObj.jilha = infoObj.jilha || sq.jilha || sq.district || "";
          infoObj.headmasterName = infoObj.headmasterName || sq.headmasterName || "";
          infoObj.teacherName = infoObj.teacherName || sq.teacherName || "";
        } catch (e) {}
      }

      const finalSchoolName = infoObj.schoolName || localStorage.getItem("teacher_school_name") || "जि. प. प्राथमिक शाळा";
      const finalUdise = infoObj.udise || localStorage.getItem("teacher_udise") || localStorage.getItem("udiseNumber") || "";

      setSchoolInfo({
        schoolName: finalSchoolName,
        udise: finalUdise,
        kendra: infoObj.kendra || "",
        taluka: infoObj.taluka || "",
        jilha: infoObj.jilha || "",
      });

      if (finalSchoolName) setSchoolName(finalSchoolName);
      if (infoObj.headmasterName) setHeadmasterName(infoObj.headmasterName);
      if (infoObj.teacherName) setTeacherName(infoObj.teacherName);
      if (infoObj.academicYear) setAcademicYear(infoObj.academicYear);
    } catch (e) {
      console.error("Failed to load school info", e);
    }
  }, []);

  const [tableData, setTableData] = useState<Record<number, DayRowData>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Holidays state
  const [holidaysMap, setHolidaysMap] = useState<Record<string, { isHoliday: boolean; reason: string }>>({});
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayDate, setHolidayDate] = useState<string>(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  );
  const [holidayReason, setHolidayReason] = useState("शाळेस सुट्टी");
  const [isSavingHoliday, setIsSavingHoliday] = useState(false);

  // Firebase collection for daily paripath archive
  const getDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  // Declare a holiday
  const handleDeclareHoliday = async (targetDateStr: string, reasonText: string) => {
    if (!targetDateStr) {
      toast.error("कृपया तारीख निवडा");
      return;
    }
    setIsSavingHoliday(true);
    try {
      const declaredRef = doc(db, "school_holidays", "declared");
      const updatedHolidays = {
        ...holidaysMap,
        [targetDateStr]: {
          isHoliday: true,
          reason: reasonText || "शाळेस सुट्टी",
          declaredAt: new Date().toISOString(),
        },
      };
      await setDoc(declaredRef, updatedHolidays, { merge: true });
      setHolidaysMap(updatedHolidays);
      toast.success(`${targetDateStr} ला सुट्टी घोषित करण्यात आली! 🎉`);
      fetchMonthlyData();
    } catch (err) {
      console.error("Error declaring holiday:", err);
      toast.error("सुट्टी सेव्ह करताना त्रुटी आली.");
    } finally {
      setIsSavingHoliday(false);
    }
  };

  // Remove a holiday
  const handleRemoveHoliday = async (targetDateStr: string) => {
    setIsSavingHoliday(true);
    try {
      const declaredRef = doc(db, "school_holidays", "declared");
      const updatedHolidays = { ...holidaysMap };
      delete updatedHolidays[targetDateStr];
      await setDoc(declaredRef, updatedHolidays);
      setHolidaysMap(updatedHolidays);
      toast.success(`${targetDateStr} ची सुट्टी रद्द करण्यात आली!`);
      fetchMonthlyData();
    } catch (err) {
      console.error("Error removing holiday:", err);
      toast.error("सुट्टी रद्द करताना त्रुटी आली.");
    } finally {
      setIsSavingHoliday(false);
    }
  };

  // Fetch daily paripath data from Firebase for the selected month
  const fetchMonthlyData = async () => {
    setIsFetching(true);
    const daysInMonth = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();
    const newRows: Record<number, DayRowData> = {};

    // 1. Fetch declared holidays first
    let holidays: Record<string, { isHoliday: boolean; reason: string }> = {};
    try {
      const hSnap = await getDoc(doc(db, "school_holidays", "declared"));
      if (hSnap.exists()) {
        holidays = hSnap.data() as any;
      }
    } catch (e) {
      console.error("Failed to fetch declared holidays", e);
    }
    setHolidaysMap(holidays);

    // Fetch admin current paripath data as fallback/update
    let currentAdminData: any = null;
    try {
      const currentSnap = await getDoc(doc(db, "admin_daily_paripath", "current"));
      if (currentSnap.exists()) {
        currentAdminData = currentSnap.data();
      }
    } catch (e) {
      console.error("Failed to fetch admin current paripath", e);
    }

    try {
      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(selectedYear, selectedMonthIndex, d);
        const dayName = MARATHI_DAYS[dateObj.getDay()];
        const isSunday = dateObj.getDay() === 0;
        const dateKey = getDateKey(selectedYear, selectedMonthIndex, d);
        const holidayInfo = holidays[dateKey];

        if (isSunday) {
          newRows[d] = {
            date: d,
            day: dayName,
            isSunday: true,
            rashtrageet: "रविवार",
            rajyageet: "रविवार",
            pratigya: "रविवार",
            sanvidhan: "रविवार",
            prarthana: "रविवार",
            shlok: "रविवार",
            panchang: "रविवार",
            suvichar: "रविवार",
            batmya: "रविवार",
            dinvishesh: "रविवार",
            mhan: "रविवार",
            bodhkatha: "रविवार",
            samuhgeet: "रविवार",
            deshbhaktigeet: "रविवार",
            samanyaGyan: "रविवार",
            maun: "रविवार",
            swakshari: "",
          };
          continue;
        }

        // Check if declared holiday
        if (holidayInfo && holidayInfo.isHoliday) {
          newRows[d] = {
            date: d,
            day: dayName,
            isSunday: false,
            isHoliday: true,
            holidayReason: holidayInfo.reason || "शाळेस सुट्टी",
            rashtrageet: `सुट्टी (${holidayInfo.reason || "शाळेस सुट्टी"})`,
            rajyageet: "सुट्टी",
            pratigya: "सुट्टी",
            sanvidhan: "सुट्टी",
            prarthana: "सुट्टी",
            shlok: "सुट्टी",
            panchang: "सुट्टी",
            suvichar: "सुट्टी",
            batmya: "सुट्टी",
            dinvishesh: "सुट्टी",
            mhan: "सुट्टी",
            bodhkatha: "सुट्टी",
            samuhgeet: "सुट्टी",
            deshbhaktigeet: "सुट्टी",
            samanyaGyan: "सुट्टी",
            maun: "सुट्टी",
            swakshari: "",
          };
          continue;
        }

        // Try to fetch from Firebase archive or admin current
        try {
          const docRef = doc(db, "daily_paripath_archive", dateKey);
          const docSnap = await getDoc(docRef);

          let data: any = null;
          if (docSnap.exists()) {
            data = docSnap.data();
          }

          const today = new Date();
          const todayKey = getDateKey(today.getFullYear(), today.getMonth(), today.getDate());

          if (!data && currentAdminData) {
            if (currentAdminData.archivedDate === dateKey || currentAdminData.date === dateKey) {
              data = currentAdminData;
            }
          }

          if (dateKey === todayKey && currentAdminData && currentAdminData.lastUpdated) {
            if ((currentAdminData.archivedDate === dateKey || currentAdminData.date === dateKey) && (!data || !data.lastUpdated || new Date(currentAdminData.lastUpdated) > new Date(data.lastUpdated))) {
              data = currentAdminData;
            }
          }

          if (data) {
            
            // Extract actual content from the saved daily paripath data
            const nationalAnthemContent = data.nationalAnthem || "";
            const stateAnthemContent = data.stateAnthem || data.rajyageet || "";
            const pledgeContent = data.pledge || data.pratigya || "";
            const preambleContent = data.preamble || data.sanvidhan || "";
            const prayerContent = data.prayer || data.prarthana || "";
            
            newRows[d] = {
              date: d,
              day: dayName,
              isSunday: false,
              // राष्ट्रगीत - जन गण मन
              rashtrageet: "जन गण मन",
              // राज्यगीत - जय जय महाराष्ट्र माझा
              rajyageet: shortText(stateAnthemContent, 45) || "जय जय महाराष्ट्र माझा",
              // प्रतिज्ञा - भारत माझा देश आहे
              pratigya: "भारत माझा देश आहे",
              // संविधान - आम्ही भारताचे लोक
              sanvidhan: "आम्ही भारताचे लोक",
              // प्रार्थना - short heading title of prayer
              prarthana: data.prayerTitle || data.prayerName || getPrayerShortName(prayerContent, d),
              // श्लोक - formatted in 1 single line
              shlok: formatShlokOneLine(data.shlok),
              // पंचांग - formatted in 2 lines
              panchang: formatPanchangTwoLines(data, dateObj),
              // सुविचार - 2 full lines (~88 chars)
              suvichar: shortText(data.thought || data.suvichar, 88),
              // बातम्या - 1 single news item (~65 chars max)
              batmya: getSingleItem(data.valueNews || data.batmya || data.news, 65),
              // दिनविशेष - 1 single dinvishesh event (~65 chars max)
              dinvishesh: getSingleItem(data.events || data.dinvishesh || data.event, 65),
              // म्हण - 1 single proverb (~65 chars max)
              mhan: getSingleItem(data.proverb || data.mhan, 65),
              // बोधकथा - title / 2 lines (~45 chars)
              bodhkatha: data.storyTitle || shortText(data.story || data.bodhkatha, 45),
              // समूहगीत - clean title
              samuhgeet: cleanSongTitle(data),
              // देशभक्ती गीत - clean title
              deshbhaktigeet: cleanSongTitle(data),
              // सामान्य ज्ञान - 1 single question (~65 chars max)
              samanyaGyan: getSingleItem(data.gkQ1 ? `प्र.१: ${data.gkQ1}` : (data.samanyaGyan || data.gk || ""), 65),
              // मौन पसायदान - fetch heading title dynamically
              maun: data.pasaydanTitle || data.silentPasayadanTitle || data.maunTitle || data.pasayadanHeading || getPasayadanShortName(data.silentPasayadan || data.pasaydan || data.maun),
              // वर्गशिक्षकांची स्वाक्षरी - blank
              swakshari: "",
            };
          } else {
            // No data for this day - check if it's a future date
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const thisDate = new Date(selectedYear, selectedMonthIndex, d);
            
            if (thisDate > today) {
              // Future date - leave empty
              newRows[d] = {
                date: d,
                day: dayName,
                isSunday: false,
                rashtrageet: "",
                rajyageet: "",
                pratigya: "",
                sanvidhan: "",
                prarthana: "",
                shlok: "",
                panchang: "",
                suvichar: "",
                batmya: "",
                dinvishesh: "",
                mhan: "",
                bodhkatha: "",
                samuhgeet: "",
                deshbhaktigeet: "",
                samanyaGyan: "",
                maun: "",
                swakshari: "",
              };
            } else {
              // Past date but no data - format proper 1-line shlok & 2-line panchang
              newRows[d] = {
                date: d,
                day: dayName,
                isSunday: false,
                rashtrageet: "जन गण मन",
                rajyageet: "जय जय महाराष्ट्र माझा",
                pratigya: "भारत माझा देश आहे",
                sanvidhan: "आम्ही भारताचे लोक",
                prarthana: getPrayerShortName("", d),
                shlok: formatShlokOneLine(""),
                panchang: formatPanchangTwoLines(null, thisDate),
                suvichar: "",
                batmya: "",
                dinvishesh: "",
                mhan: "",
                bodhkatha: "",
                samuhgeet: "",
                deshbhaktigeet: "",
                samanyaGyan: "",
                maun: "आता विश्वात्मकें देवें",
                swakshari: "",
              };
            }
          }
        } catch (dayErr) {
          console.error(`Error fetching data for ${dateKey}:`, dayErr);
          newRows[d] = {
            date: d,
            day: dayName,
            isSunday: false,
            rashtrageet: "",
            rajyageet: "",
            pratigya: "",
            sanvidhan: "",
            prarthana: "",
            shlok: "",
            panchang: "",
            suvichar: "",
            batmya: "",
            dinvishesh: "",
            mhan: "",
            bodhkatha: "",
            samuhgeet: "",
            deshbhaktigeet: "",
            samanyaGyan: "",
            maun: "",
            swakshari: "",
          };
        }
      }

      setTableData(newRows);
      toast.success(`${MARATHI_MONTHS[selectedMonthIndex]} ${selectedYear} चा डेटा यशस्वीरीत्या लोड झाला!`);
    } catch (err) {
      console.error("Error fetching monthly data:", err);
      toast.error("डेटा लोड करताना त्रुटी आली.");
      // Generate empty rows
      generateEmptyRows();
    } finally {
      setIsFetching(false);
    }
  };

  // Also try loading from "current" document and save it as today's archive
  const fetchAndArchiveToday = async () => {
    try {
      const today = new Date();
      const dateKey = getDateKey(today.getFullYear(), today.getMonth(), today.getDate());
      
      // Check if today's archive already exists
      const archiveRef = doc(db, "daily_paripath_archive", dateKey);
      const archiveSnap = await getDoc(archiveRef);
      
      if (!archiveSnap.exists()) {
        // Fetch "current" and save as today's archive
        const currentRef = doc(db, "admin_daily_paripath", "current");
        const currentSnap = await getDoc(currentRef);
        
        if (currentSnap.exists()) {
          const currentData = currentSnap.data();
          await setDoc(archiveRef, {
            ...currentData,
            archivedDate: dateKey,
            archivedAt: new Date().toISOString(),
          });
          console.log(`Archived today's paripath data: ${dateKey}`);
        }
      }
    } catch (err) {
      console.error("Error archiving today's data:", err);
    }
  };

  // Generate empty rows for a month
  const generateEmptyRows = () => {
    const daysInMonth = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();
    const rows: Record<number, DayRowData> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(selectedYear, selectedMonthIndex, d);
      const dayName = MARATHI_DAYS[dateObj.getDay()];
      const isSunday = dateObj.getDay() === 0;
      rows[d] = {
        date: d,
        day: dayName,
        isSunday,
        rashtrageet: isSunday ? "रविवार" : "",
        rajyageet: isSunday ? "रविवार" : "",
        pratigya: isSunday ? "रविवार" : "",
        sanvidhan: isSunday ? "रविवार" : "",
        prarthana: isSunday ? "रविवार" : "",
        shlok: isSunday ? "रविवार" : "",
        panchang: isSunday ? "रविवार" : "",
        suvichar: isSunday ? "रविवार" : "",
        batmya: isSunday ? "रविवार" : "",
        dinvishesh: isSunday ? "रविवार" : "",
        mhan: isSunday ? "रविवार" : "",
        bodhkatha: isSunday ? "रविवार" : "",
        samuhgeet: isSunday ? "रविवार" : "",
        deshbhaktigeet: isSunday ? "रविवार" : "",
        samanyaGyan: isSunday ? "रविवार" : "",
        maun: isSunday ? "रविवार" : "",
        swakshari: "",
      };
    }
    setTableData(rows);
  };

  const handleDownloadPdf = async () => {
    const element = printRef.current;
    if (!element) return;
    toast.success("PDF निर्मिती सुरू आहे...");
    try {
      const html2canvasModule = await import("html2canvas");
      const jsPDFModule = await import("jspdf");
      const html2canvas = html2canvasModule.default || html2canvasModule;
      const jsPDF = jsPDFModule.jsPDF || (jsPDFModule as any).default;

      // Select each of the 3 page chunk containers
      const chunkEls = element.querySelectorAll(".page-chunk-box");
      if (!chunkEls || chunkEls.length === 0) return;

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      for (let i = 0; i < chunkEls.length; i++) {
        const chunkEl = chunkEls[i] as HTMLElement;

        // Clone the single page chunk element
        const clonedChunk = chunkEl.cloneNode(true) as HTMLElement;

        // 1. Hide non-printables
        clonedChunk.querySelectorAll(".non-printable").forEach((el: any) => el.remove());

        // 2. Replace textareas with plain text divs with exact desktop text formatting
        clonedChunk.querySelectorAll("textarea").forEach((ta: HTMLTextAreaElement) => {
          const div = document.createElement("div");
          div.textContent = ta.value || "";
          const isCenter = ta.classList.contains("text-center") || ta.style.textAlign === "center";
          div.style.cssText = `
            font-family: 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 10.5px;
            font-weight: 600;
            line-height: 1.3;
            max-height: 32px;
            overflow: hidden;
            text-align: ${isCenter ? "center" : "left"};
            padding: 2px 3px;
            word-break: break-word;
            white-space: pre-wrap;
            color: #0f172a;
            box-sizing: border-box;
            width: 100%;
          `;
          ta.parentNode?.replaceChild(div, ta);
        });

        // 3. Wrap in a clean printable container matching Desktop preview width
        const container = document.createElement("div");
        container.style.cssText = `
          position: absolute;
          left: -9999px;
          top: -9999px;
          width: 1120px;
          background: #ffffff;
          padding: 16px;
          box-sizing: border-box;
          font-family: 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, sans-serif;
        `;

        // Inject PDF specific styling to match Desktop preview exactly
        const style = document.createElement("style");
        style.textContent = `
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-size: 11px !important;
            margin: 0 !important;
          }
          th {
            padding: 5px 4px !important;
            border: 1.5px solid #0f172a !important;
            background-color: #f1f5f9 !important;
            font-weight: 800 !important;
            font-size: 11px !important;
            text-align: center !important;
            font-family: 'Noto Sans Devanagari', sans-serif !important;
            color: #0f172a !important;
            vertical-align: middle !important;
          }
          td {
            padding: 3px 4px !important;
            border: 1px solid #334155 !important;
            font-size: 11px !important;
            font-family: 'Noto Sans Devanagari', sans-serif !important;
            vertical-align: middle !important;
            word-break: break-word !important;
            white-space: pre-wrap !important;
            color: #1e293b !important;
            line-height: 1.3 !important;
          }
          tr[class*="bg-rose"] td {
            background-color: #fff1f2 !important;
            color: #be123c !important;
            font-weight: 800 !important;
            text-align: center !important;
          }
          .overflow-x-auto {
            overflow: visible !important;
            border: 1.5px solid #0f172a !important;
            border-radius: 0 !important;
            margin-top: 6px !important;
            margin-bottom: 12px !important;
          }
        `;
        container.appendChild(style);
        container.appendChild(clonedChunk);
        document.body.appendChild(container);

        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          logging: false,
          windowWidth: 1120,
        });

        document.body.removeChild(container);

        const imgData = canvas.toDataURL("image/jpeg", 0.98);

        if (i > 0) {
          pdf.addPage("a4", "landscape");
        }

        // A4 Landscape is 297mm x 210mm. Margins: 6mm left/right, 5mm top/bottom
        const pdfWidth = 285;
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, "JPEG", 6, 5, pdfWidth, Math.min(pdfHeight, 200));
      }

      pdf.save(`Masik_Paripath_${MARATHI_MONTHS[selectedMonthIndex]}_${selectedYear}.pdf`);
      toast.success("PDF यशस्वीरित्या डाउनलोड झाली!");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("PDF निर्मितीमध्ये त्रुटी आली.");
    }
  };

  // Auto-fetch when month/year changes
  useEffect(() => {
    fetchAndArchiveToday();
    fetchMonthlyData();
  }, [selectedMonthIndex, selectedYear]);

  const handleCellChange = (
    dateNum: number,
    field: keyof DayRowData,
    val: string
  ) => {
    setTableData((prev) => ({
      ...prev,
      [dateNum]: {
        ...prev[dateNum],
        [field]: val,
      },
    }));
  };

  // Save to Firebase as monthly register
  const handleSaveData = async () => {
    setIsSaving(true);
    try {
      const registerKey = `monthly_register_${selectedYear}_${selectedMonthIndex}`;
      await setDoc(doc(db, "monthly_paripath_registers", registerKey), {
        schoolName,
        academicYear,
        month: selectedMonthIndex,
        year: selectedYear,
        tableData,
        savedAt: new Date().toISOString(),
      });
      toast.success("परिपाठ नोंदवही यशस्वीरीत्या सेव्ह झाली! 🎉");
    } catch (e) {
      console.error("Save error:", e);
      toast.error("सेव्ह करताना त्रुटी आली.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const daysList = Object.values(tableData);

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto p-2 md:p-6">
      {/* Printable CSS */}
      <style>{`
        textarea {
          overflow: hidden !important;
          resize: none !important;
          white-space: pre-wrap !important;
          word-break: break-word !important;
        }

        @media print {
          body {
            visibility: hidden !important;
          }
          .non-printable, header, aside, footer, nav, button {
            display: none !important;
          }
          #printable-paripath-register, #printable-paripath-register * {
            visibility: visible !important;
          }
          #printable-paripath-register {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
          }
          .page-break {
            page-break-before: always !important;
            break-before: page !important;
          }
          table {
            font-size: 10.5px !important;
            border-collapse: collapse !important;
            width: 100% !important;
          }
          td, th {
            padding: 4px 5px !important;
            border: 1px solid #000000 !important;
            word-break: break-word !important;
            vertical-align: middle !important;
          }
          textarea {
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
            height: auto !important;
          }
        }
      `}</style>

      {/* Control Panel (Hidden in Print) */}
      <div className="non-printable bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#311042] text-white p-6 md:p-8 rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(30,27,75,0.6)] space-y-6 border border-indigo-500/30 backdrop-blur-2xl relative overflow-hidden">
        {/* Top Decorative Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-amber-400 to-purple-500" />

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 border border-indigo-400/50 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <FileSpreadsheet className="size-8" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-amber-200">
                मासिक परिपाठ नोंदवही
              </h2>
              <p className="text-xs font-extrabold text-amber-300/90 uppercase tracking-widest mt-1">
                दैनिक परिपाठातून स्वयंचलित डेटा • Day-to-Day Auto Fetch
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchMonthlyData}
              disabled={isFetching}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-950/80 hover:bg-indigo-900 text-indigo-100 border border-indigo-400/40 font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {isFetching ? (
                <Loader2 className="size-4 animate-spin text-amber-400" />
              ) : (
                <RefreshCw className="size-4 text-amber-400" />
              )}
              {isFetching ? "डेटा लोड होत आहे..." : "🔄 रिफ्रेश डेटा"}
            </button>

            <button
              onClick={handleSaveData}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/30 active:scale-95"
            >
              <Save className="size-4" />
              {isSaving ? "सेव्ह होत आहे..." : "सेव्ह करा"}
            </button>

            <button
              onClick={() => setShowHolidayModal(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/30 active:scale-95"
            >
              <CalendarDays className="size-4" />
              📅 सुट्टी घोषित करा
            </button>

            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-purple-500/30 active:scale-95"
            >
              <Download className="size-4" />
              PDF डाउनलोड
            </button>
          </div>
        </div>

        {/* Inputs row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-indigo-500/30 text-xs font-medium">
          <div className="space-y-1.5">
            <label className="text-amber-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="size-3.5 text-amber-400" /> शाळेचे नाव
            </label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#0B0F19]/90 hover:bg-[#131927] border border-indigo-500/40 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 text-white outline-none font-bold transition-all shadow-inner"
              placeholder="शाळेचे नाव टाका"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-amber-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="size-3.5 text-amber-400" /> सन (शैक्षणिक वर्ष)
            </label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#0B0F19]/90 hover:bg-[#131927] border border-indigo-500/40 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 text-white outline-none font-bold transition-all shadow-inner"
              placeholder="२०२५-२०२६"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-amber-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="size-3.5 text-amber-400" /> महिना निवडा
            </label>
            <select
              value={selectedMonthIndex}
              onChange={(e) => setSelectedMonthIndex(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl bg-[#0B0F19] border border-indigo-500/40 text-amber-200 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 font-bold cursor-pointer transition-all shadow-inner"
            >
              {MARATHI_MONTHS.map((m, idx) => (
                <option key={idx} value={idx} className="bg-slate-900 text-white">
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-amber-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              वर्ष निवडा
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl bg-[#0B0F19] border border-indigo-500/40 text-amber-200 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 font-bold cursor-pointer transition-all shadow-inner"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y} className="bg-slate-900 text-white">
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Additional School Info & Signatures Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 pt-3 border-t border-indigo-500/30 text-xs font-medium">
          <div className="space-y-1">
            <label className="text-amber-300/90 font-bold">तालुका</label>
            <input
              type="text"
              value={schoolInfo.taluka || ""}
              onChange={(e) => setSchoolInfo(prev => ({ ...prev, taluka: e.target.value }))}
              className="w-full px-3 py-1.5 rounded-lg bg-[#0B0F19]/90 hover:bg-[#131927] border border-indigo-500/40 focus:border-amber-400 text-white font-bold outline-none transition-all shadow-inner"
              placeholder="तालुका"
            />
          </div>
          <div className="space-y-1">
            <label className="text-amber-300/90 font-bold">जिल्हा</label>
            <input
              type="text"
              value={schoolInfo.jilha || ""}
              onChange={(e) => setSchoolInfo(prev => ({ ...prev, jilha: e.target.value }))}
              className="w-full px-3 py-1.5 rounded-lg bg-[#0B0F19]/90 hover:bg-[#131927] border border-indigo-500/40 focus:border-amber-400 text-white font-bold outline-none transition-all shadow-inner"
              placeholder="जिल्हा"
            />
          </div>
          <div className="space-y-1">
            <label className="text-amber-300/90 font-bold">केंद्र</label>
            <input
              type="text"
              value={schoolInfo.kendra || ""}
              onChange={(e) => setSchoolInfo(prev => ({ ...prev, kendra: e.target.value }))}
              className="w-full px-3 py-1.5 rounded-lg bg-[#0B0F19]/90 hover:bg-[#131927] border border-indigo-500/40 focus:border-amber-400 text-white font-bold outline-none transition-all shadow-inner"
              placeholder="केंद्र"
            />
          </div>
          <div className="space-y-1">
            <label className="text-amber-300/90 font-bold">UDISE नंबर</label>
            <input
              type="text"
              value={schoolInfo.udise || ""}
              onChange={(e) => setSchoolInfo(prev => ({ ...prev, udise: e.target.value }))}
              className="w-full px-3 py-1.5 rounded-lg bg-[#0B0F19]/90 hover:bg-[#131927] border border-indigo-500/40 focus:border-amber-400 text-white font-bold outline-none transition-all shadow-inner"
              placeholder="युडायस नंबर"
            />
          </div>
          <div className="space-y-1">
            <label className="text-amber-300/90 font-bold">शिक्षकाचे नाव</label>
            <input
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[#0B0F19]/90 hover:bg-[#131927] border border-indigo-500/40 focus:border-amber-400 text-white font-bold outline-none transition-all shadow-inner"
              placeholder="शिक्षकाचे नाव"
            />
          </div>
          <div className="space-y-1">
            <label className="text-amber-300/90 font-bold">मुख्याध्यापकाचे नाव</label>
            <input
              type="text"
              value={headmasterName}
              onChange={(e) => setHeadmasterName(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[#0B0F19]/90 hover:bg-[#131927] border border-indigo-500/40 focus:border-amber-400 text-white font-bold outline-none transition-all shadow-inner"
              placeholder="मुख्याध्यापकाचे नाव"
            />
          </div>
        </div>

        {/* Status info */}
        {isFetching && (
          <div className="flex items-center gap-3 p-4 bg-amber-500/15 border border-amber-400/30 rounded-2xl backdrop-blur-md">
            <Loader2 className="size-5 animate-spin text-amber-400" />
            <span className="text-amber-200 text-sm font-bold">
              दैनिक परिपाठ डेटा Firebase मधून लोड होत आहे... कृपया प्रतीक्षा करा.
            </span>
          </div>
        )}
      </div>

      {/* REGISTER DISPLAY AREA */}
      <div
        id="printable-paripath-register"
        ref={printRef}
        className="bg-white p-4 md:p-6 rounded-[2rem] shadow-xl border border-slate-300 font-sans space-y-8"
      >
        {/* ==================== COMBINED PAGE CHUNKS: 1-10, 11-20, 21-31 ==================== */}
        {[
          { min: 1, max: 10, label: "दिनांक १ ते १०" },
          { min: 11, max: 20, label: "दिनांक ११ ते २०" },
          { min: 21, max: 31, label: "दिनांक २१ ते ३१" },
        ].map((chunk, chunkIdx) => {
          const chunkRows = daysList.filter(row => row.date >= chunk.min && row.date <= chunk.max);
          if (chunkRows.length === 0) return null;

          return (
            <React.Fragment key={`page-chunk-${chunkIdx}`}>
              {chunkIdx > 0 && (
                <div className="relative my-8 border-t-4 border-dashed border-slate-300 non-printable flex items-center justify-center">
                  <span className="bg-slate-200 text-slate-700 px-6 py-1.5 rounded-full text-xs font-black uppercase tracking-widest -mt-4 shadow-sm border border-slate-300">
                    पानाचे विभाजन / Page {chunkIdx + 1} ({chunk.label})
                  </span>
                </div>
              )}

              <div className={`page-chunk-box space-y-4 ${chunkIdx > 0 ? "page-break" : ""}`}>
                {/* ---------- SINGLE UNIFIED HEADER ---------- */}
                <div className="flex flex-col gap-1.5 border-b-2 border-slate-900 pb-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 font-black text-slate-900 text-xs md:text-sm">
                      <div>
                        शाळेचे नाव :{" "}
                        <span className="border-b border-dotted border-slate-700 px-2 py-0.5 text-indigo-950 font-extrabold">
                          {schoolName || schoolInfo.schoolName || "..................................................."}
                        </span>
                      </div>
                      <div>
                        शैक्षणिक वर्ष :{" "}
                        <span className="border-b border-dotted border-slate-700 px-2 py-0.5 text-indigo-950 font-extrabold">
                          {academicYear || getCurrentAcademicYearStr()}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-wider">
                        दैनिक व परिपाठातील उपक्रम ({chunk.label})
                      </h2>
                      <p className="text-xs font-bold text-slate-700 uppercase mt-0.5">
                        मासिक परिपाठ नोंदवही • माहे: {MARATHI_MONTHS[selectedMonthIndex]} {selectedYear}
                      </p>
                    </div>
                  </div>

                  {/* School Metadata Info Row */}
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs font-bold text-slate-900 pt-1.5 border-t border-slate-300">
                    <div>शाळेचे नाव : <span className="font-extrabold text-indigo-950">{schoolName || schoolInfo.schoolName || "---"}</span></div>
                    <div>तालुका : <span className="font-extrabold text-indigo-950">{schoolInfo.taluka || "---"}</span></div>
                    <div>जिल्हा : <span className="font-extrabold text-indigo-950">{schoolInfo.jilha || "---"}</span></div>
                    <div>केंद्र : <span className="font-extrabold text-indigo-950">{schoolInfo.kendra || "---"}</span></div>
                    <div>UDISE नंबर : <span className="font-extrabold text-indigo-950">{schoolInfo.udise || "---"}</span></div>
                  </div>
                </div>

                {/* ---------- TABLE 1: दैनिक ---------- */}
                <div className="overflow-x-auto border-2 border-slate-900 bg-white shadow-sm mb-6 w-full">
                  <table className="w-full text-left text-[11px] text-slate-900 border-collapse align-middle table-fixed min-w-[950px]">
                    <colgroup>
                      <col style={{ width: "32px" }} />
                      <col style={{ width: "55px" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "15%" }} />
                      <col style={{ width: "15%" }} />
                      <col style={{ width: "17%" }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-900 text-center font-black text-slate-900 uppercase text-[11px]">
                        <th className="w-[32px] max-w-[32px] px-0.5 py-1.5 border-r border-slate-900 text-center align-middle text-[10px] whitespace-nowrap overflow-hidden">दिनांक</th>
                        <th className="w-[55px] max-w-[55px] px-0.5 py-1.5 border-r border-slate-900 text-center align-middle text-[10px] whitespace-nowrap overflow-hidden">वार</th>
                        <th className="p-2 border-r border-slate-900 text-center align-middle">राष्ट्रगीत</th>
                        <th className="p-2 border-r border-slate-900 text-center align-middle">राज्यगीत</th>
                        <th className="p-2 border-r border-slate-900 text-center align-middle">प्रतिज्ञा</th>
                        <th className="p-2 border-r border-slate-900 text-center align-middle">भारताचे संविधान</th>
                        <th className="p-2 border-r border-slate-900 text-center align-middle">प्रार्थना</th>
                        <th className="p-2 border-r border-slate-900 text-center align-middle">श्लोक</th>
                        <th className="p-2 border-r border-slate-900 text-center align-middle">पंचांग</th>
                        <th className="p-2 text-center align-middle">सुविचार</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 font-medium">
                      {chunkRows.map((row) => (
                        <tr
                          key={row.date}
                          className={`${
                            row.isSunday || row.isHoliday
                              ? "bg-rose-50 text-rose-900 font-bold"
                              : "hover:bg-slate-50/80"
                          }`}
                        >
                          {row.isSunday ? (
                            <td colSpan={10} className="p-2.5 text-center font-black text-rose-700 text-[13px] tracking-widest align-middle border-b border-slate-900">
                              रविवार
                            </td>
                          ) : row.isHoliday ? (
                            <td colSpan={10} className="p-2.5 text-center font-black text-rose-700 text-[13px] tracking-wider align-middle border-b border-slate-900">
                              सुट्टी ({row.holidayReason || "शाळेस सुट्टी"})
                            </td>
                          ) : (
                            <>
                              <td className="w-[32px] max-w-[32px] px-0.5 py-1.5 border-r border-slate-900 text-center font-black align-middle text-[10px] text-slate-900 whitespace-nowrap overflow-hidden">
                                {row.date}
                              </td>
                              <td className="w-[55px] max-w-[55px] px-0.5 py-1.5 border-r border-slate-900 text-center font-bold text-[10px] align-middle text-slate-900 whitespace-nowrap overflow-hidden">
                                {row.day}
                              </td>
                              <td className="p-1 border-r border-slate-900 align-middle">
                                <textarea
                                  value={row.rashtrageet}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "rashtrageet", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-center outline-none font-bold text-[11px] leading-snug overflow-hidden resize-none py-1 px-1 border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  rows={1}
                                />
                              </td>
                              <td className="p-1 border-r border-slate-900 align-middle">
                                <textarea
                                  value={row.rajyageet}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "rajyageet", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-center outline-none font-bold text-[11px] leading-snug overflow-hidden resize-none py-1 px-1 border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  rows={1}
                                />
                              </td>
                              <td className="p-1 border-r border-slate-900 align-middle">
                                <textarea
                                  value={row.pratigya}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "pratigya", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-center outline-none font-bold text-[11px] leading-snug overflow-hidden resize-none py-1 px-1 border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  rows={1}
                                />
                              </td>
                              <td className="p-1 border-r border-slate-900 align-middle">
                                <textarea
                                  value={row.sanvidhan}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "sanvidhan", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-center outline-none font-bold text-[11px] leading-snug overflow-hidden resize-none py-1 px-1 border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  rows={1}
                                />
                              </td>
                              <td className="p-1 border-r border-slate-900 align-middle">
                                <textarea
                                  value={row.prarthana}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "prarthana", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-center outline-none font-bold text-[11px] leading-snug overflow-hidden resize-none py-1 px-1 border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  rows={1}
                                />
                              </td>
                              <td className="p-1 border-r border-slate-900 align-middle">
                                <textarea
                                  value={row.shlok}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "shlok", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-left px-1.5 py-1 outline-none font-medium text-[11px] leading-snug overflow-hidden resize-none whitespace-pre-wrap break-words border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  rows={2}
                                  placeholder="श्लोक..."
                                />
                              </td>
                              <td className="p-1 border-r border-slate-900 align-middle">
                                <textarea
                                  value={row.panchang}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "panchang", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-left px-1.5 py-1 outline-none font-medium text-[11px] leading-snug overflow-hidden resize-none whitespace-pre-wrap break-words border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  rows={2}
                                  placeholder="पंचांग..."
                                />
                              </td>
                              <td className="p-1 align-middle">
                                <textarea
                                  value={row.suvichar}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "suvichar", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-left px-1.5 py-1 outline-none font-medium text-[11px] leading-snug overflow-hidden resize-none whitespace-pre-wrap break-words border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  rows={2}
                                  placeholder="सुविचार..."
                                />
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ---------- TABLE 2: परिपाठातील उपक्रम ---------- */}
                <div className="overflow-x-auto border-2 border-slate-900 bg-white shadow-sm w-full">
                  <table className="w-full text-left text-[11px] text-slate-900 border-collapse align-middle table-fixed min-w-[950px]">
                    <colgroup>
                      <col style={{ width: "17%" }} />
                      <col style={{ width: "17%" }} />
                      <col style={{ width: "16%" }} />
                      <col style={{ width: "11%" }} />
                      <col style={{ width: "11%" }} />
                      <col style={{ width: "16%" }} />
                      <col style={{ width: "6%" }} />
                      <col style={{ width: "6%" }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-900 text-center font-black text-slate-900 uppercase text-[11px]">
                        <th className="p-2 border-r border-slate-900 text-center align-middle">
                          सुसंस्कारक्षम बातम्या
                        </th>
                        <th className="p-2 border-r border-slate-900 text-center align-middle">दिनविशेष</th>
                        <th className="p-2 border-r border-slate-900 text-center align-middle">म्हण</th>
                        <th className="p-2 border-r border-slate-900 text-center align-middle">बोधकथा</th>
                        <th className="p-2 border-r border-slate-900 text-center align-middle">
                          समूहगीत/देशभक्ती गीत
                        </th>
                        <th className="p-2 border-r border-slate-900 text-center align-middle">
                          सामान्य ज्ञान
                        </th>
                        <th className="p-2 border-r border-slate-900 text-center align-middle">
                          मौन / पसायदान
                        </th>
                        <th className="p-2 text-center align-middle">
                          स्वाक्षरी
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 font-medium">
                      {chunkRows.map((row) => (
                        <tr
                          key={row.date}
                          className={`${
                            row.isSunday || row.isHoliday
                              ? "bg-rose-50 text-rose-900 font-bold"
                              : "hover:bg-slate-50/80"
                          }`}
                        >
                          {row.isSunday ? (
                            <td colSpan={8} className="p-2.5 text-center font-black text-rose-700 text-[13px] tracking-widest align-middle border-b border-slate-900">
                              रविवार
                            </td>
                          ) : row.isHoliday ? (
                            <td colSpan={8} className="p-2.5 text-center font-black text-rose-700 text-[13px] tracking-wider align-middle border-b border-slate-900">
                              सुट्टी ({row.holidayReason || "शाळेस सुट्टी"})
                            </td>
                          ) : (
                            <>
                              <td className="p-1 border-r border-slate-900 align-middle">
                                <textarea
                                  value={row.batmya}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "batmya", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-left px-1.5 py-1 outline-none font-medium text-[11px] leading-snug overflow-hidden resize-none whitespace-pre-wrap break-words border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  rows={2}
                                  placeholder="बातम्या..."
                                />
                              </td>
                              <td className="p-1 border-r border-slate-900 align-middle">
                                <textarea
                                  value={row.dinvishesh}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "dinvishesh", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-left px-1.5 py-1 outline-none font-medium text-[11px] leading-snug overflow-hidden resize-none whitespace-pre-wrap break-words border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  rows={2}
                                  placeholder="दिनविशेष..."
                                />
                              </td>
                              <td className="p-1 border-r border-slate-900 align-middle">
                                <textarea
                                  value={row.mhan}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "mhan", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-left px-1.5 py-1 outline-none font-medium text-[11px] leading-snug overflow-hidden resize-none whitespace-pre-wrap break-words border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  rows={2}
                                  placeholder="म्हण..."
                                />
                              </td>
                              <td className="p-1 border-r border-slate-900 align-middle">
                                <textarea
                                  value={row.bodhkatha}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "bodhkatha", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-center outline-none font-bold text-[11px] leading-snug overflow-hidden resize-none py-1 px-1 border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  rows={1}
                                  placeholder="शीर्षक..."
                                />
                              </td>
                              <td className="p-1 border-r border-slate-900 align-middle">
                                <textarea
                                  value={row.samuhgeet || row.deshbhaktigeet}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "samuhgeet", e.target.value);
                                    handleCellChange(row.date, "deshbhaktigeet", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-center outline-none font-bold text-[11px] leading-snug overflow-hidden resize-none py-1 px-1 border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  rows={1}
                                  placeholder="गीत शीर्षक..."
                                />
                              </td>
                              <td className="p-1 border-r border-slate-900 align-middle">
                                <textarea
                                  value={row.samanyaGyan}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "samanyaGyan", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-left px-1.5 py-1 outline-none font-medium text-[11px] leading-snug overflow-hidden resize-none whitespace-pre-wrap break-words border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  rows={2}
                                  placeholder="सामान्य ज्ञान..."
                                />
                              </td>
                              <td className="p-1 border-r border-slate-900 align-middle">
                                <textarea
                                  value={row.maun || "आता विश्वात्मकें देवें"}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "maun", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-center outline-none font-bold text-[11px] leading-snug overflow-hidden resize-none py-1 px-1 border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  rows={1}
                                />
                              </td>
                              <td className="p-1 align-middle">
                                <textarea
                                  value={row.swakshari}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "swakshari", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-center outline-none font-bold text-[11px] leading-snug overflow-hidden resize-none py-1 px-1 border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  rows={1}
                                  placeholder="स्वाक्षरी..."
                                />
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ---------- FOOTER SIGNATURE SECTION ---------- */}
                <div className="pt-3 border-t-2 border-slate-900 mt-3 flex items-center justify-between text-xs font-bold text-slate-900">
                  <div className="space-y-1">
                    <div>शिक्षकाचे नाव : <span className="font-extrabold border-b border-dotted border-slate-800 px-3">{teacherName || "________________________"}</span></div>
                    <div>शिक्षकाची स्वाक्षरी : <span className="font-extrabold border-b border-dotted border-slate-800 px-3">________________________</span></div>
                  </div>
                  <div className="space-y-1 text-right">
                    <div>मुख्याध्यापकाचे नाव : <span className="font-extrabold border-b border-dotted border-slate-800 px-3">{headmasterName || "________________________"}</span></div>
                    <div>मुख्याध्यापकाची स्वाक्षरी : <span className="font-extrabold border-b border-dotted border-slate-800 px-3">________________________</span></div>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Holiday Management Modal */}
      {showHolidayModal &&
        typeof window !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/75 animate-in fade-in duration-200 non-printable">
            <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative z-[1000000]">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                    <CalendarDays className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-white">
                      शाळा सुट्टी व्यवस्थापन (Holiday Calendar)
                    </h3>
                    <p className="text-xs text-slate-400">
                      तारीख निवडून सुट्टी घोषित करा किंवा रद्द करा
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHolidayModal(false)}
                  className="size-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 transition-all"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Declare New Holiday Section */}
              <div className="space-y-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                  <Plus className="size-3.5" /> नवीन सुट्टी घोषित करा
                </h4>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      १. तारीख निवडा:
                    </label>
                    <input
                      type="date"
                      value={holidayDate}
                      onChange={(e) => setHolidayDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/20 text-white font-bold outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      २. सुट्टीचे कारण:
                    </label>
                    <input
                      type="text"
                      value={holidayReason}
                      onChange={(e) => setHolidayReason(e.target.value)}
                      placeholder="उदा. सार्वजनिक सुट्टी, दिवाळी सुट्टी, इ."
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/20 text-white font-bold outline-none focus:border-amber-400 mb-2"
                    />

                    {/* Presets */}
                    <div className="flex flex-wrap gap-1.5">
                      {["शाळेस सुट्टी", "सार्वजनिक सुट्टी", "स्थानिक सुट्टी", "जयंती सुट्टी", "सण सुट्टी"].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setHolidayReason(preset)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeclareHoliday(holidayDate, holidayReason)}
                    disabled={isSavingHoliday}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 disabled:opacity-50 mt-2"
                  >
                    {isSavingHoliday ? "सेव्ह होत आहे..." : "🎉 सुट्टी घोषित करा"}
                  </button>
                </div>
              </div>

              {/* Existing Declared Holidays List */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  घोषित केलेल्या सुट्ट्यांची यादी ({MARATHI_MONTHS[selectedMonthIndex]} {selectedYear}):
                </h4>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {Object.entries(holidaysMap)
                    .filter(([dKey, val]) => val.isHoliday && dKey.startsWith(`${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, "0")}`))
                    .length === 0 ? (
                    <p className="text-xs text-slate-500 italic text-center py-4">
                      या महिन्यात कोणतीही सुट्टी घोषित केलेली नाही.
                    </p>
                  ) : (
                    Object.entries(holidaysMap)
                      .filter(([dKey, val]) => val.isHoliday && dKey.startsWith(`${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, "0")}`))
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([dKey, val]) => (
                        <div
                          key={dKey}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs"
                        >
                          <div>
                            <span className="font-bold text-amber-300 block">
                              📅 {dKey}
                            </span>
                            <span className="text-slate-300 text-[11px]">
                              कारण: {val.reason || "शाळेस सुट्टी"}
                            </span>
                          </div>

                          <button
                            onClick={() => handleRemoveHoliday(dKey)}
                            disabled={isSavingHoliday}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/30 font-bold transition-all text-[11px]"
                          >
                            <Trash2 className="size-3.5" />
                            रद्द करा
                          </button>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
