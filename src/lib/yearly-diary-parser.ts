import * as XLSX from "xlsx";
import { format, parse, isValid } from "date-fns";
import { db } from "@/lib/firebase";
import { doc, writeBatch, serverTimestamp } from "firebase/firestore";

export interface PeriodItem {
  period: string;
  subject: string;
  topic: string;
  experience: string;
  tools: string;
  outcome: string;
}

export interface DayDiaryRecord {
  date: string; // YYYY-MM-DD
  displayDate: string; // DD-MM-YYYY
  day: string;
  thought: string;
  dinvishesh: string;
  className: string;
  medium: string;
  periods: PeriodItem[];
  isHoliday?: boolean;
  holidayReason?: string;
}

/**
 * Normalizes Excel date value (Serial number or String) into ISO 'YYYY-MM-DD' and 'DD-MM-YYYY'
 */
export function normalizeDate(rawVal: any): { isoDate: string; displayDate: string } | null {
  if (rawVal === undefined || rawVal === null || rawVal === "") return null;

  let parsedDate: Date | null = null;

  // Handle Excel Serial Number (e.g. 45510)
  if (typeof rawVal === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    parsedDate = new Date(excelEpoch.getTime() + rawVal * 86400000);
  } else if (rawVal instanceof Date) {
    parsedDate = rawVal;
  } else if (typeof rawVal === "string") {
    const cleaned = rawVal.trim();
    // Try standard formats
    const formats = ["dd-MM-yyyy", "dd/MM/yyyy", "yyyy-MM-dd", "yyyy/MM/dd", "d-M-yyyy", "d/M/yyyy"];
    for (const fmt of formats) {
      const d = parse(cleaned, fmt, new Date());
      if (isValid(d)) {
        parsedDate = d;
        break;
      }
    }
  }

  if (!parsedDate || !isValid(parsedDate)) return null;

  return {
    isoDate: format(parsedDate, "yyyy-MM-dd"),
    displayDate: format(parsedDate, "dd-MM-yyyy"),
  };
}

/**
 * Parses Yearly Excel/CSV File and uploads Date-wise records to Firestore
 */
export async function parseAndSaveYearlyDiary(
  fileBuffer: ArrayBuffer,
  className: string,
  medium: string,
  onProgress?: (processed: number, total: number) => void
): Promise<{ success: boolean; totalDaysParsed: number }> {
  // Read Excel workbook
  const workbook = XLSX.read(fileBuffer, { type: "array", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert worksheet to JSON array of objects
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  if (!rawRows || rawRows.length === 0) {
    throw new Error("Uploaded file is empty or missing data rows.");
  }

  // Map to group period rows by ISO Date (YYYY-MM-DD)
  const diaryMap = new Map<string, DayDiaryRecord>();

  for (const row of rawRows) {
    const rawDate = row["Date"] || row["तारीख"] || row["दिनांक"] || row["date"];
    if (!rawDate) continue;

    const normalized = normalizeDate(rawDate);
    if (!normalized) continue;

    const { isoDate, displayDate } = normalized;

    const dayStr = String(row["Day"] || row["वार"] || row["day"] || "").trim();

    // Skip Sunday completely! Sunday is a school/college holiday (No data / no display for Sunday)
    const dateObj = new Date(isoDate);
    const isSun = (!isNaN(dateObj.getTime()) && dateObj.getDay() === 0) ||
                  dayStr.toLowerCase() === "sunday" ||
                  dayStr === "रविवार" ||
                  dayStr.includes("रविवार") ||
                  dayStr.toLowerCase().includes("sunday");

    if (isSun) {
      continue;
    }

    const thought = String(row["Thought"] || row["विचार"] || row["thought"] || "").trim();
    const dinvishesh = String(row["Dinvishesh"] || row["दिनविशेष"] || row["dinvishesh"] || "").trim();
    const isHoliday = String(row["IsHoliday"] || row["सुट्टी"] || "").toLowerCase() === "true" || String(row["IsHoliday"]) === "1";
    const holidayReason = String(row["HolidayReason"] || row["सुट्टीचे कारण"] || "").trim();

    // Extract Period details
    const periodObj: PeriodItem = {
      period: String(row["Period"] || row["तासिका"] || row["period"] || "1").trim(),
      subject: String(row["Subject"] || row["विषय"] || row["subject"] || "").trim(),
      topic: String(row["Topic"] || row["घटक"] || row["topic"] || "").trim(),
      experience: String(row["Learning Experience"] || row["अध्यापन अनुभव"] || row["experience"] || "").trim(),
      tools: String(row["Tools"] || row["साधने"] || row["tools"] || "").trim(),
      outcome: String(row["Outcome"] || row["अध्ययन निष्पत्ती"] || row["outcome"] || "").trim(),
    };

    if (!diaryMap.has(isoDate)) {
      diaryMap.set(isoDate, {
        date: isoDate,
        displayDate,
        day: dayStr,
        thought,
        dinvishesh,
        className,
        medium,
        isHoliday,
        holidayReason,
        periods: [],
      });
    }

    if (!isHoliday && periodObj.subject) {
      diaryMap.get(isoDate)!.periods.push(periodObj);
    }
  }

  const dayRecords = Array.from(diaryMap.values());
  if (dayRecords.length === 0) {
    throw new Error("No valid date-wise rows found in the uploaded file.");
  }

  // Write batch operations to Firestore
  let batch = writeBatch(db);
  let counter = 0;
  let totalSaved = 0;

  for (const record of dayRecords) {
    // Unique doc ID: Class 1_Marathi_2026-08-06
    const docId = `${record.className}_${record.medium}_${record.date}`;
    const docRef = doc(db, "teaching_diaries", docId);

    batch.set(docRef, {
      ...record,
      updatedAt: serverTimestamp(),
    });

    counter++;
    totalSaved++;

    if (onProgress) {
      onProgress(totalSaved, dayRecords.length);
    }

    // Flush batch every 400 records (Firestore 500 limit)
    if (counter === 400) {
      await batch.commit();
      batch = writeBatch(db);
      counter = 0;
    }
  }

  if (counter > 0) {
    await batch.commit();
  }

  return { success: true, totalDaysParsed: dayRecords.length };
}

/**
 * Generate a sample CSV string for Admin template download
 */
export function generateSampleYearlyCsv(): string {
  const headers = [
    "Date",
    "Day",
    "Thought",
    "Dinvishesh",
    "Period",
    "Subject",
    "Topic",
    "Learning Experience",
    "Tools",
    "Outcome",
    "IsHoliday",
    "HolidayReason"
  ];

  const sampleRows = [
    ["06-08-2026", "Thursday", "ज्ञान हीच शक्ती आहे.", "जागतिक शांतता दिन", "1", "मराठी", "वाचनपाठ", "प्रकट वाचन सराव व उच्चार सुधारणा", "चित्रकार्ड", "योग्य उच्चारासह वाचन करणे", "false", ""],
    ["06-08-2026", "Thursday", "ज्ञान हीच शक्ती आहे.", "जागतिक शांतता दिन", "2", "गणित", "संख्याज्ञान", "मण्यांच्या साहाय्याने वस्तू मोजणे", "मण्यांची माळ", "१ ते १० संख्या ओळखणे", "false", ""],
    ["07-08-2026", "Friday", "नित्य सराव हाच यशाचा मार्ग.", "", "1", "इंग्रजी", "Rhymes", "Sing along with rhythm and actions", "Audio player", "Recite simple rhymes", "false", ""],
    ["15-08-2026", "Saturday", "", "स्वातंत्र्य दिन", "", "", "", "", "", "", "true", "स्वातंत्र्य दिन ध्वजारोहण व सुट्टी"]
  ];

  const csvContent = [
    headers.join(","),
    ...sampleRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
  ].join("\n");

  return csvContent;
}
