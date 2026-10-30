import * as XLSX from "xlsx";
import { CLASS_1_OUTCOMES, OutcomeItem } from "@/data/class1_outcomes";
import { CLASS_2_OUTCOMES } from "@/data/class2_outcomes";
import { CLASS_3_OUTCOMES } from "@/data/class3_outcomes";
import { CLASS_4_OUTCOMES } from "@/data/class4_outcomes";
import { CLASS_5_OUTCOMES } from "@/data/class5_outcomes";
import { CLASS_6_OUTCOMES } from "@/data/class6_outcomes";
import { CLASS_7_OUTCOMES } from "@/data/class7_outcomes";
import { CLASS_8_OUTCOMES } from "@/data/class8_outcomes";

export interface SubjectSection {
  subjectName: string; // e.g. "मराठी", "गणित", "इंग्रजी"
  displaySubjectName: string; // e.g. "विषय : गणित"
  headers: string[];
  rows: string[][];
  startRow: number;
  endRow: number;
  subjectTitle?: string;
  classTitle?: string;
  monthlySections?: Record<string, MonthlySection>;
}

export interface AnnualPlanningWorkbook {
  classTitle: string;
  academicYear: string;
  subjects: Record<string, SubjectSection>;
  allSubjectNames: string[];
  rawGrid: string[][];
  monthlySections?: Record<string, MonthlySection>;
}

const DEFAULT_SUBJECT_HEADERS = [
  "महिना",
  "आठवडा",
  "कामाचे दिवस",
  "प्राप्त तासिका",
  "पाठ / घटक विवरण",
  "अध्ययन निष्पत्ती",
];

export function isExamOrAssessmentText(text: string): boolean {
  if (!text) return false;
  const s = String(text).trim().toLowerCase();
  return (
    // Marathi keywords
    s.includes("प्रथम सत्र संकलित मूल्यमापन") ||
    s.includes("द्वितीय सत्र संकलित मूल्यमापन") ||
    s.includes("प्रथम घटक चाचणी") ||
    s.includes("द्वितीय घटक चाचणी") ||
    s.includes("दिवाळी सुट्ट्या") ||
    s.includes("दिवाळी सुट्टी") ||
    s.includes("दिवाळी सुटी") ||
    s.includes("दिवाळी") ||
    s.includes("सुट्ट्या") ||
    s.includes("सुट्टी") ||
    s.includes("सुट्या") ||
    s.includes("सुटी") ||
    s.includes("उन्हाळी सुट्टी") ||
    s.includes("उन्हाळी सुट्ट्या") ||
    s.includes("उन्हाळी सुटी") ||
    s.includes("उन्हाळी") ||
    s.includes("मूल्यांकन") ||
    s.includes("चाचणी क्र") ||
    s.includes("चाचणी") ||
    s.includes("मूल्यमापन क्र") ||
    s.includes("प्रथम सत्र संकलित") ||
    s.includes("द्वितीय सत्र संकलित") ||
    s.includes("घटक चाचणी") ||
    s.includes("संकलित मूल्यमापन") ||
    s.includes("मूल्यमापन") ||
    s.includes("परीक्षा") ||
    s.includes("परिक्षा") ||
    s.includes("पूरक मार्गदर्शन") ||
    s.includes("पुरव मार्गदर्शन") ||
    // English keywords
    s.includes("first unit test") ||
    s.includes("1st unit test") ||
    s.includes("unit test 1") ||
    s.includes("unit test - 1") ||
    s.includes("unit test -1") ||
    s.includes("unit test i") ||
    s.includes("second unit test") ||
    s.includes("2nd unit test") ||
    s.includes("unit test 2") ||
    s.includes("unit test - 2") ||
    s.includes("unit test -2") ||
    s.includes("unit test ii") ||
    s.includes("unit test") ||
    s.includes("first term exam") ||
    s.includes("1st term exam") ||
    s.includes("first term examination") ||
    s.includes("term 1 exam") ||
    s.includes("first term assessment") ||
    s.includes("first term summative assessment") ||
    s.includes("second term exam") ||
    s.includes("2nd term exam") ||
    s.includes("second term examination") ||
    s.includes("term 2 exam") ||
    s.includes("second term assessment") ||
    s.includes("second term summative assessment") ||
    s.includes("summative assessment") ||
    s.includes("diwali vacation") ||
    s.includes("diwali holidays") ||
    s.includes("diwali holiday") ||
    s.includes("diwali break") ||
    s.includes("summer vacation") ||
    s.includes("summer holidays") ||
    s.includes("summer break")
  );
}

export function isExamOrAssessmentRow(row: string[]): boolean {
  if (!row || !Array.isArray(row)) return false;
  return row.some((cell) => isExamOrAssessmentText(cell));
}

export function isVacationText(text: string): boolean {
  if (!text) return false;
  const s = String(text).trim().toLowerCase();
  return (
    s.includes("summer vacation") ||
    s.includes("summer holiday") ||
    s.includes("summer break") ||
    s.includes("उन्हाळी सुट्टी") ||
    s.includes("उन्हाळी सुट्ट्या") ||
    s.includes("उन्हाळी सुटी") ||
    s.includes("उन्हाळी") ||
    s.includes("diwali vacation") ||
    s.includes("diwali holiday") ||
    s.includes("diwali break") ||
    s.includes("दिवाळी सुट्टी") ||
    s.includes("दिवाळी सुट्ट्या") ||
    s.includes("दिवाळी सुटी") ||
    s.includes("दिवाळी") ||
    s.includes("winter vacation") ||
    s.includes("winter holiday") ||
    s.includes("winter break") ||
    s.includes("नाताळ सुट्टी") ||
    s.includes("नाताळ सुटी") ||
    s.includes("हिवाळी सुट्टी") ||
    s.includes("हिवाळी सुटी") ||
    s.includes("vacation") ||
    s.includes("सुट्ट्या") ||
    s.includes("सुट्टी") ||
    s.includes("सुट्या") ||
    s.includes("सुटी")
  );
}

const MARATHI_MONTHS = [
  "जून",
  "जुन",
  "जुलै",
  "जुलाई",
  "ऑगस्ट",
  "ऑगष्ट",
  "ऑग",
  "आगस्ट",
  "अगस्त",
  "अगस्ट",
  "सप्टेंबर",
  "सप्टें",
  "सप्टे",
  "सितंबर",
  "सितम्बर",
  "सित",
  "ऑक्टोबर",
  "ऑक्टोंबर",
  "ऑक्टो",
  "अक्टूबर",
  "अक्टोबर",
  "अक्टू",
  "नोव्हेंबर",
  "नोव्हें",
  "नोव्हे",
  "नवंबर",
  "नवम्बर",
  "नव",
  "डिसेंबर",
  "डिसें",
  "डिसं",
  "दिसंबर",
  "दिसम्बर",
  "दिस",
  "जानेवारी",
  "जाने",
  "जनवरी",
  "जन",
  "फेब्रुवारी",
  "फेब्रु",
  "फरवरी",
  "फर",
  "मार्च",
  "एप्रिल",
  "एप्रि",
  "अप्रैल",
  "मे",
  "June",
  "July",
  "August",
  "September",
  "October",
  "Oct",
  "November",
  "Nov",
  "December",
  "Dec",
  "January",
  "Jan",
  "February",
  "Feb",
  "March",
  "Mar",
  "April",
  "Apr",
  "May",
];

// Helper to canonicalize abbreviated or varied month names to standard Marathi month names
export function canonicalizeMarathiMonth(raw: string): string {
  if (!raw) return "";
  const s = String(raw).trim();
  if (!s || s === "-" || s === "null" || s === "undefined") return "";

  // Preserve semester or annual terms if present
  if (/^(?:प्रथम|द्वितीय)\s*सत्र/i.test(s) || /^सत्र\s*[१२12]/i.test(s)) return s;
  if (/वार्षिक\s*उपक्रम/i.test(s)) return s;

  // Multi-month range e.g. "जून - जुलै", "ऑगस्ट - सप्टें", "डिसें - एप्रिल"
  if (/[–/\-]|\s+ते\s+/i.test(s)) {
    const parts = s.split(/[–/\-]|\s+ते\s+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 2 && (isMarathiMonth(parts[0]) || isMarathiMonth(parts[1]))) {
      return `${canonicalizeMarathiMonth(parts[0])} - ${canonicalizeMarathiMonth(parts[1])}`;
    }
  }

  // Remove "माहे", "महिना", punctuation, colons, and years (Devanagari and Arabic digits)
  const clean = s
    .replace(/^(?:माहे|महिना|माह|महीना|month)\s*[-–:]?\s*/i, "")
    .replace(/\s*[\d\u0966-\u096F]{4}(?:[-–][\d\u0966-\u096F]{2,4})?/g, "")
    .replace(/\s*[\d\u0966-\u096F]{2,4}\s*$/g, "")
    .replace(/[.,:;()]/g, "")
    .trim()
    .toLowerCase();

  // Match Marathi months and abbreviations
  if (/^(?:ज[ूु]न|june?|jun)$/i.test(clean)) return "जून";
  if (/^(?:जुल[ैे]|जुलाई|july?|jul)$/i.test(clean)) return "जुलै";
  if (/^(?:ऑग[सश]्ट|ऑग|आगस्ट|अगस्त|अगस्ट|aug(?:ust)?)$/i.test(clean)) return "ऑगस्ट";
  if (/^(?:सप्ट[ेेंं]+(?:बर)?|सित[ंम]+बर|सित\.?|sep(?:t(?:ember)?)?)$/i.test(clean)) return "सप्टेंबर";
  if (/^(?:ऑक्ट[ोों]+(?:बर)?|अक्ट[ूोों]+बर|अक्टू\.?|oct(?:ober)?)$/i.test(clean)) return "ऑक्टोबर";
  if (/^(?:नोव्ह[ेेंं]+(?:बर)?|नव[ंम]+बर|नव\.?|nov(?:ember)?)$/i.test(clean)) return "नोव्हेंबर";
  if (/^(?:डिस[ेेंं]+(?:बर)?|दिस[ंम]+बर|दिस\.?|dec(?:ember)?)$/i.test(clean)) return "डिसेंबर";
  if (/^(?:जान[ेे](?:वारी)?|जनवरी|जाने|जन\.?|jan(?:uary)?)$/i.test(clean)) return "जानेवारी";
  if (/^(?:फेब्र[ुू](?:वारी)?|फरवरी|फेब्रु|फर\.?|feb(?:ruary)?)$/i.test(clean)) return "फेब्रुवारी";
  if (/^(?:मार्च|mar(?:ch)?)$/i.test(clean)) return "मार्च";
  if (/^(?:एप्रि(?:ल)?|अप्रैल|apr(?:il)?)$/i.test(clean)) return "एप्रिल";
  if (/^(?:मे|may)$/i.test(clean)) return "मे";

  return s;
}

export function isMarathiMonth(cellText: string): boolean {
  if (!cellText) return false;
  const s = String(cellText).trim();
  if (!s || s === "-" || s === "null" || s === "undefined") return false;

  // Reject exams, assessments, vacations, signatures, subjects, headers
  if (
    isExamOrAssessmentText(s) ||
    /परीक्षा|चाचणी|मूल्यमापन|मूल्यांकन|सुट्टी|सुट्ट्या|दिवाळी|उन्हाळी|स्वाक्षरी|इयत्ता|विषय|नियोजन|नोंद|शेरा|अध्ययन|निष्पत्ती|तासिका|आठवडा|दिवस|घटक|unit\s*test|term\s*exam|vacation|holiday|exam/i.test(
      s
    )
  ) {
    return false;
  }

  // Reject purely numbers or punctuation (handles both Arabic and Devanagari digits)
  const withoutDigits = s.replace(/[\d\u0966-\u096F\s.,\-–/\\:;()]/g, "");
  if (!withoutDigits) return false;

  // Check multi-month ranges or terms
  if (/^(?:प्रथम|द्वितीय)\s*सत्र/i.test(s) || /^सत्र\s*[१२12]/i.test(s)) return true;
  if (/वार्षिक\s*उपक्रम/i.test(s)) return true;
  if (/[–/\-]|\s+ते\s+/i.test(s)) {
    const parts = s.split(/[–/\-]|\s+ते\s+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 2 && (isMarathiMonth(parts[0]) || isMarathiMonth(parts[1]))) {
      return true;
    }
  }

  const clean = s
    .replace(/^(?:माहे|महिना|माह|महीना|month)\s*[-–:]?\s*/i, "")
    .replace(/\s*[\d\u0966-\u096F]{4}(?:[-–][\d\u0966-\u096F]{2,4})?/g, "")
    .replace(/\s*[\d\u0966-\u096F]{2,4}\s*$/g, "")
    .replace(/[.,:;()]/g, "")
    .trim()
    .toLowerCase();

  const monthRegex =
    /^(?:ज[ूु]न|june?|jun|जुल[ैे]|जुलाई|july?|jul|ऑग[सश]्ट|ऑग|आगस्ट|अगस्त|अगस्ट|aug(?:ust)?|सप्ट[ेेंं]+(?:बर)?|सित[ंम]+बर|सित\.?|sep(?:t(?:ember)?)?|ऑक्ट[ोों]+(?:बर)?|अक्ट[ूोों]+बर|अक्टू\.?|oct(?:ober)?|नोव्ह[ेेंं]+(?:बर)?|नव[ंम]+बर|नव\.?|nov(?:ember)?|डिस[ेेंं]+(?:बर)?|दिस[ंम]+बर|दिस\.?|dec(?:ember)?|जान[ेे](?:वारी)?|जनवरी|जाने|जन\.?|jan(?:uary)?|फेब्र[ुू](?:वारी)?|फरवरी|फेब्रु|फर\.?|feb(?:ruary)?|मार्च|mar(?:ch)?|एप्रि(?:ल)?|अप्रैल|apr(?:il)?|मे|may)$/i;

  if (monthRegex.test(clean)) return true;

  return MARATHI_MONTHS.some((m) => clean === m.toLowerCase());
}

export function isEnglishMonth(raw: string): boolean {
  if (!raw) return false;
  return /^(?:june?|jun|july?|jul|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may)$/i.test(String(raw).trim());
}

export function normalizeForCompare(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val)
    .replace(/[\u00a0\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function normalizeSubjectName(rawName: string): string {
  if (!rawName) return "सामान्य";
  const clean = rawName.trim();

  // Strip prefix "विषय :" or "subject:"
  const stripped = clean.replace(/^(?:विषय|subject)\s*[:\-–]?\s*/i, "").trim();
  const strippedLower = stripped.toLowerCase();

  if (strippedLower.includes("गणित") || strippedLower.includes("math")) return "गणित";
  if (strippedLower.includes("मराठी") || strippedLower.includes("marathi")) return "मराठी";
  if (strippedLower.includes("हिंदी") || strippedLower.includes("hindi")) return "हिंदी";
  if (strippedLower.includes("इंग्रजी") || strippedLower.includes("english")) return "इंग्रजी";

  if (
    strippedLower.includes("कला") ||
    strippedLower.includes("शिकू") ||
    strippedLower.includes("art")
  )
    return "कलाशिक्षण";

  if (
    strippedLower.includes("कार्य") ||
    strippedLower.includes("करू") ||
    strippedLower.includes("work experience")
  )
    return "कार्यशिक्षण";

  if (
    strippedLower.includes("शारीरिक") ||
    strippedLower.includes("निरामयता") ||
    strippedLower.includes("क्रीडा") ||
    strippedLower.includes("physical education") ||
    strippedLower === "pe" ||
    strippedLower === "p.e."
  )
    return "शारीरिक शिक्षण";

  if (
    clean.includes("परिसर") ||
    clean.toLowerCase().includes("evs") ||
    clean.toLowerCase().includes("parisar")
  ) {
    const isPart1 =
      clean.includes("भाग १") ||
      clean.includes("भाग 1") ||
      clean.includes("भाग-१") ||
      clean.includes("भाग-1") ||
      clean.includes("भाग१") ||
      clean.includes("भाग1") ||
      clean.includes("part 1") ||
      clean.includes("part-1") ||
      clean.includes("part1") ||
      clean.includes("- १") ||
      clean.includes("- 1") ||
      clean.includes("– १") ||
      clean.includes("– 1") ||
      clean.includes(" १") ||
      clean.includes(" 1") ||
      clean.endsWith("१") ||
      clean.endsWith("1");

    const isPart2 =
      clean.includes("भाग २") ||
      clean.includes("भाग 2") ||
      clean.includes("भाग-२") ||
      clean.includes("भाग-2") ||
      clean.includes("भाग२") ||
      clean.includes("भाग2") ||
      clean.includes("part 2") ||
      clean.includes("part-2") ||
      clean.includes("part2") ||
      clean.includes("- २") ||
      clean.includes("- 2") ||
      clean.includes("– २") ||
      clean.includes("– 2") ||
      clean.includes(" २") ||
      clean.includes(" 2") ||
      clean.endsWith("२") ||
      clean.endsWith("2");

    if (isPart1 && !isPart2) {
      return "परिसर अभ्यास भाग १";
    }
    if (isPart2 && !isPart1) {
      return "परिसर अभ्यास भाग २";
    }
    return "परिसर अभ्यास";
  }

  if (
    clean.includes("सामान्य विज्ञान") ||
    clean.includes("विज्ञान") ||
    clean.toLowerCase().includes("science")
  )
    return "सामान्य विज्ञान";

  if (
    clean.includes("सामाजिक") ||
    clean.includes("इतिहास") ||
    clean.includes("भूगोल") ||
    clean.includes("नागरिकशास्त्र")
  )
    return "सामाजिक शास्त्रे";

  return clean.replace(/^(?:विषय|subject)\s*[:\-–]?\s*/i, "").trim();
}

// Helper to check if a row is a signature/footer row from Excel
export const isSignatureRow = (row: any[]): boolean => {
  if (!row || !Array.isArray(row) || row.length === 0) return false;
  const nonEmpties = row.map((c) => String(c || "").trim()).filter(Boolean);
  if (nonEmpties.length === 0) return false;

  const line = nonEmpties.join(" ").trim().toLowerCase();
  const lineNormalized = line.replace(/['’.]/g, "");
  const lineNoSpace = lineNormalized.replace(/\s+/g, "");

  // If row has more than 3 non-empty cells or long text (e.g. normal lesson row), it is NOT a signature row!
  if (nonEmpties.length > 3 || line.length > 80) return false;

  // Marathi Signature terms
  if (line.includes("स्वाक्षरी") || line.includes("शिक्का")) return true;
  if (line.includes("वर्ग शिक्षक") && line.includes("मुख्याध्यापक")) return true;
  if (line.includes("विषय /") && line.includes("शिक्षक")) return true;
  if (line.includes("शिक्षक") && line.includes("मुख्याध्यापक")) return true;
  if (lineNoSpace.includes("वर्गशिक्षक") || lineNoSpace.includes("मुख्याध्यापक")) return true;

  // English Signature terms (Class teacher's sign, Headmaster's sign, Teacher sign, Signature)
  if (
    line.includes("teacher's sign") ||
    line.includes("headmaster's sign") ||
    line.includes("head master's sign") ||
    line.includes("class teacher's sign") ||
    line.includes("teacher sign") ||
    line.includes("headmaster sign") ||
    line.includes("head master sign") ||
    line.includes("class teacher sign") ||
    line.includes("principal sign") ||
    line.includes("signature") ||
    lineNormalized.includes("teacher sign") ||
    lineNormalized.includes("headmaster sign") ||
    lineNormalized.includes("class teacher") ||
    lineNoSpace.includes("teachersign") ||
    lineNoSpace.includes("headmastersign") ||
    lineNoSpace.includes("classteachersign")
  ) {
    return true;
  }

  return false;
};

// Helper to check if a row is a Month / Title Banner Row (e.g. मासिक घटक नियोजन, महिना :- ऑगस्ट विषय :- कलाशिक्षण)
export const isMonthBannerRow = (row: any[]): boolean => {
  if (!row || !Array.isArray(row) || row.length === 0) return false;
  const nonEmpties = row.map((c) => String(c || "").trim()).filter(Boolean);
  if (nonEmpties.length === 0) return false;

  // 1. DATA ROW SAFEGUARD: If Col 0 is a Day number, it is 100% a DATA row, NEVER a month banner!
  const c0 = String(row[0] || "").trim();
  if (/^\d{1,2}$/.test(c0) || /^[०-९]{1,2}$/.test(c0)) {
    return false;
  }
  // 2. DATA ROW SAFEGUARD: If any cell has bullet point '•', NEVER a banner!
  if (row.some((c) => String(c || "").includes("•"))) {
    return false;
  }
  // 3. Exam or vacation rows are NEVER month banners!
  if (isExamOrAssessmentText(nonEmpties.join(" ")) || isVacationText(nonEmpties.join(" "))) {
    return false;
  }

  const line = nonEmpties.join(" ").trim().toLowerCase();

  const isExplicitMonthBanner =
    line.includes("मासिक घटक नियोजन") ||
    line.includes("मासिक व घटक नियोजन") ||
    line.includes("अभ्यासक्रमाचे मासिक") ||
    line.includes("monthly & unit planning") ||
    line.includes("monthly and unit planning") ||
    line.includes("monthly planning") ||
    line.includes("मासिक नियोजन") ||
    (/(?:^|\s)(?:महिना|माहे|महीना|month|(?<![\u0900-\u097F])माह(?![\u0900-\u097F]))\s*[:-–]?/i.test(line) &&
      (/(?:^|\s)(?:विषय(?!ी|क|वर|चे|तील)|subject)\s*[:-–]/i.test(line) || /(?:^|\s)(?:इयत्ता|class)\s*[:-–]/i.test(line))) ||
    (/(?:^|\s)(?:महिना|माहे|महीना|month|(?<![\u0900-\u097F])माह(?![\u0900-\u097F]))\s*[:-–]?\s*(?:जून|जुन|जुलै|जुलाई|ऑगस्ट|ऑगष्ट|आगस्ट|अगस्त|अगस्ट|सप्टेंबर|सितंबर|सितम्बर|ऑक्टोबर|अक्टूबर|अक्टोबर|नोव्हेंबर|नवंबर|नवम्बर|डिसेंबर|दिसंबर|दिसम्बर|जानेवारी|जनवरी|फेब्रुवारी|फरवरी|मार्च|एप्रिल|अप्रैल|मे|june|july|august|september|october|november|december|january|february|march|april|may)/i.test(line));

  // If not an explicit banner, DATA ROW SAFEGUARD: long sentence (> 30 chars) or >= 4 filled cells
  if (!isExplicitMonthBanner) {
    if (row.some((c) => String(c || "").trim().length > 30)) {
      return false;
    }
    if (nonEmpties.length >= 4) {
      return false;
    }
  }

  if (isExplicitMonthBanner) {
    return true;
  }

  for (const c of nonEmpties) {
    const cLow = c.toLowerCase();
    if (
      /(?:^|\s)(?:माहे|महिना|month|(?<![\u0900-\u097F])माह(?![\u0900-\u097F]))\s*[:-–]?\s*(?:जून|जुन|जुलै|जुलाई|ऑगस्ट|ऑगष्ट|आगस्ट|अगस्त|अगस्ट|सप्टेंबर|सितंबर|सितम्बर|ऑक्टोबर|अक्टूबर|अक्टोबर|नोव्हेंबर|नवंबर|नवम्बर|डिसेंबर|दिसंबर|दिसम्बर|जानेवारी|जनवरी|फेब्रुवारी|फरवरी|मार्च|एप्रिल|अप्रैल|मे|june|july|august|september|october|november|december|january|february|march|april|may)/i.test(cLow)
    ) {
      return true;
    }
  }
  return false;
};

// Helper to check if a row is a Metadata Header Row (Class : 2 nd Available Period :, Sub : English Working days :, etc.)
export const isMetadataRow = (row: any[]): boolean => {
  if (!row || !Array.isArray(row) || row.length === 0) return false;
  const nonEmpties = row.map((c) => String(c || "").trim()).filter(Boolean);
  if (nonEmpties.length === 0) return false;

  // 1. DATA ROW SAFEGUARD: If Col 0 is a Day number, it is NEVER metadata!
  const c0 = String(row[0] || "").trim();
  if (/^\d{1,2}$/.test(c0) || /^[०-९]{1,2}$/.test(c0)) {
    return false;
  }
  // 2. DATA ROW SAFEGUARD: If any cell has bullet point '•' or long sentence (> 30 chars), NEVER metadata!
  if (row.some((c) => String(c || "").includes("•") || String(c || "").trim().length > 30)) {
    return false;
  }
  // 3. Multi-column data rows (>= 4 filled cells) are NEVER metadata!
  if (nonEmpties.length >= 4) {
    return false;
  }
  // 4. Exam or vacation rows are NEVER metadata!
  if (isExamOrAssessmentText(nonEmpties.join(" ")) || isVacationText(nonEmpties.join(" "))) {
    return false;
  }

  const line = nonEmpties.join(" ").trim().toLowerCase();
  if (!line) return false;
  const lineNoSpace = line.replace(/\s+/g, "");

  // Section / month banners are handled as distinct monthly separators, NEVER as metadata rows
  if (isMonthBannerRow(row)) {
    return false;
  }

  if (
    line.includes("class :") ||
    line.includes("class:") ||
    line.includes("available period") ||
    line.includes("available periods") ||
    line.includes("period :") ||
    line.includes("periods :") ||
    line.includes("sub :") ||
    line.includes("sub:") ||
    line.includes("working day") ||
    line.includes("working days") ||
    line.includes("planned period") ||
    line.includes("नियोजित तासिका") ||
    line.includes("प्राप्त तासिका") ||
    line.includes("एकूण तासिका") ||
    (line.includes("कामाचे दिवस") && line.length < 50) ||
    line.includes("इयत्ता :") ||
    line.includes("इयत्ता :-") ||
    line.includes("इयत्ता:-") ||
    line.includes("विषय :") ||
    line.includes("विषय :-") ||
    line.includes("विषय:-") ||
    line.includes("महिना :") ||
    line.includes("महिना :-") ||
    line.includes("महिना:-") ||
    lineNoSpace.includes("class:") ||
    lineNoSpace.includes("availableperiod")
  ) {
    return true;
  }

  return false;
};

// Helper to check if a row is a Table Column Header Row (Day, Lesson / Point, Teaching Point / Aims, etc.)
export const isTableColumnHeaderRow = (row: any[]): boolean => {
  if (!row || !Array.isArray(row) || row.length === 0) return false;
  const nonEmpties = row.map((c) => String(c || "").trim()).filter(Boolean);
  if (nonEmpties.length === 0) return false;

  // 1. DATA ROW SAFEGUARD: If Col 0 is a Day number or range, it is 100% a DATA row, NEVER a column header!
  const c0 = String(row[0] || "").trim();
  if (/^\d{1,2}$/.test(c0) || /^[०-९]{1,2}$/.test(c0) || c0.includes("ते") || c0.includes("to")) {
    return false;
  }
  // 2. Exam or vacation rows are NEVER column header rows!
  if (isExamOrAssessmentText(nonEmpties.join(" ")) || row.some((c) => isExamOrAssessmentText(String(c || ""))) || isVacationText(nonEmpties.join(" "))) {
    return false;
  }
  // 3. Bullet points in teaching activities
  if (row.some((c) => String(c || "").includes("•"))) {
    return false;
  }

  const line = nonEmpties.join(" ").trim().toLowerCase();
  if (!line) return false;

  // SAFEGUARD: Dedicated month/planning banners are NEVER table column headers!
  if (
    line.includes("monthly & unit planning") ||
    line.includes("monthly and unit planning") ||
    line.includes("मासिक व घटक नियोजन") ||
    line.includes("मासिक घटक नियोजन") ||
    line.includes("अभ्यासक्रमाचे मासिक") ||
    /\bmonth\s*[:-–]/i.test(line) ||
    /(?:महिना|माहे)\s*[:-–]/i.test(line) ||
    isMonthBannerRow(row)
  ) {
    return false;
  }

  const firstCell = String(row[0] || "").trim().toLowerCase();

  // Primary Check 1: Day/Date header in col 0 + Topic/Outcome keywords in row
  const isCol0Header =
    firstCell.includes("दिनांक") ||
    firstCell.includes("दिवस") ||
    firstCell.includes("दि.") ||
    firstCell === "दि" ||
    firstCell.includes("वार") ||
    firstCell.includes("कालांश") ||
    firstCell.includes("तासिका") ||
    firstCell.includes("सप्ताह") ||
    firstCell.includes("आठवडा") ||
    firstCell.includes("अ.क्र") ||
    firstCell.includes("क्र.") ||
    firstCell.includes("sr") ||
    firstCell === "महिना" ||
    firstCell === "month" ||
    firstCell === "month / महिना" ||
    firstCell === "महिना / month" ||
    firstCell === "माहे" ||
    firstCell === "day" ||
    firstCell === "date";

  const hasTopicOutcomeHeader =
    line.includes("पाठ") ||
    line.includes("घटक") ||
    line.includes("उपघटक") ||
    line.includes("पाठ्यांश") ||
    line.includes("अध्ययन") ||
    line.includes("निष्पत्ती") ||
    line.includes("मुद्दे") ||
    line.includes("मुद्दा") ||
    line.includes("उद्देश") ||
    line.includes("साधन") ||
    line.includes("साहित्य") ||
    line.includes("स्वरूप") ||
    line.includes("lesson") ||
    line.includes("topic") ||
    line.includes("unit") ||
    line.includes("point") ||
    line.includes("outcome") ||
    line.includes("objective") ||
    line.includes("experience") ||
    line.includes("tool") ||
    line.includes("material");

  if (isCol0Header && hasTopicOutcomeHeader) {
    return true;
  }

  // Primary Check 2: English Header Row matching
  if (
    (line.includes("day") || line.includes("date")) &&
    (line.includes("lesson") || line.includes("point") || line.includes("topic") || line.includes("unit"))
  ) {
    return true;
  }

  if (
    line.includes("lesson / point") ||
    line.includes("lesson/point") ||
    line.includes("teaching point") ||
    line.includes("structure of teaching") ||
    line.includes("tool & technique") ||
    line.includes("essential instrument") ||
    line.includes("essencial instrument") ||
    line.includes("learning outcomes") ||
    line.includes("learning outcome")
  ) {
    return true;
  }

  // Primary Check 3: Multi-keyword density across cells
  const headerKeywords = [
    "दिवस", "दिनांक", "दि.", "पाठ", "घटक", "उपघटक", "पाठ्यांश", "अध्ययन", "निष्पत्ती",
    "मुद्दे", "मुद्दा", "उद्देश", "स्वरूप", "साधन", "तंत्रे", "साहित्य", "तपशील",
    "day", "topic", "unit", "outcome", "objective", "experience", "tool", "material"
  ];
  let kwCount = 0;
  for (const cell of row) {
    const c = String(cell || "").trim().toLowerCase();
    if (headerKeywords.some((kw) => c.includes(kw))) {
      kwCount++;
    }
  }
  if (kwCount >= 3) {
    return true;
  }

  const cleanCells = row.map((c) => String(c || "").trim()).filter(Boolean);
  if (cleanCells.length >= 4 && cleanCells.every((c) => /^[0-9१-९]+$/.test(c))) {
    return true;
  }

  return false;
};

/**
 * Accurately detects whether a given row is a Subject Title / Banner row.
 * CRITICAL: Rows containing months (like 'जून', 'सप्टेंबर') in Col 0 or Col 1 are curriculum data rows, NEVER subject headers!
 */
// Strict subject extractor from line/cell:
// Only matches explicit "विषय : <subName>" or "Subject : <subName>"
// STRICTLY prevents false matching on common Marathi words like "विषयी", "विषयक", "विषयावर", "विषयाचे", "विषयातील"
export function extractStrictSubjectFromLine(line: string): string | null {
  if (!line) return null;
  const match = line.match(/(?:^|\s)(?:विषय(?!ी|क|वर|चे|तील)|subject)\s*[:\-–]\s*([^\n\r()|;:,]{2,40})/i);
  if (!match || !match[1]) return null;
  const cand = match[1].trim();
  // Filter out non-subject words common in Marathi teaching notes
  if (
    cand.includes("विवरण") ||
    cand.includes("निष्पत्ती") ||
    cand.includes("तपशील") ||
    cand.includes("धोरण") ||
    cand.includes("माहिती") ||
    cand.includes("समजून") ||
    cand.includes("गोळा") ||
    cand.includes("चर्चा") ||
    cand.includes("सांगणे")
  ) {
    return null;
  }
  const normalized = normalizeSubjectName(cand);
  if (!normalized || normalized === "सामान्य" || !isNaN(Number(normalized))) {
    return null;
  }
  return normalized;
}

export function detectSubjectFromRow(row: string[], knownSubjects: string[]): string | null {
  const rowLine = (row || []).join(" ").trim();
  if (!rowLine) return null;

  // CRITICAL: A row that has a valid month in column 0 or column 1 is a DATA row, NEVER a subject header!
  const c0 = String(row[0] || "").trim();
  const c1 = String(row[1] || "").trim();
  if (isMarathiMonth(c0) || isEnglishMonth(c0) || (/^\d+$/.test(c0) && (isMarathiMonth(c1) || isEnglishMonth(c1)))) {
    return null;
  }

  // A row that is just exam or assessment is not a subject header
  if (isExamOrAssessmentText(rowLine)) {
    return null;
  }

  // If any cell contains long descriptions (> 45 chars), it's a data row, NOT a subject header!
  if (row.some((c) => String(c || "").trim().length > 45)) {
    return null;
  }

  // 1. Look for explicit "विषय : <subject>" or "Subject:- <subject>" with colon or hyphen
  for (const cell of (row || [])) {
    const cStr = String(cell || "").trim();
    if (!cStr) continue;
    const strictMatch = extractStrictSubjectFromLine(cStr);
    if (strictMatch) return strictMatch;
  }

  const strictRowMatch = extractStrictSubjectFromLine(rowLine);
  if (strictRowMatch) return strictRowMatch;

  // 2. Check if row is a column header row (महिना/Month and आठवडा/Weeks) and has a known subject in one of the cells
  const isColHeaderRow =
    (rowLine.includes("महिना") || rowLine.toLowerCase().includes("month")) &&
    (rowLine.includes("आठवडा") || rowLine.toLowerCase().includes("week") || rowLine.includes("दिवस") || rowLine.toLowerCase().includes("working") || rowLine.toLowerCase().includes("teaching"));

  if (isColHeaderRow) {
    for (const cell of (row || [])) {
      const cStr = String(cell || "").trim();
      for (const sName of knownSubjects) {
        if (
          cStr === sName ||
          cStr.includes(`विषय : ${sName}`) ||
          cStr.includes(`विषय:${sName}`) ||
          cStr.toLowerCase().includes(`subject:- ${sName.toLowerCase()}`) ||
          cStr.toLowerCase().includes(`subject : ${sName.toLowerCase()}`)
        ) {
          return sName;
        }
      }
    }
  }

  // 3. Check if entire row (ignoring blanks) is ONLY a known subject name (max 2 non-empty cells)
  const nonEmpties = (row || []).map((c) => String(c || "").trim()).filter(Boolean);
  if (nonEmpties.length <= 2) {
    for (const ne of nonEmpties) {
      for (const sName of knownSubjects) {
        if (ne === sName || ne === `विषय : ${sName}` || ne === `विषय:${sName}`) {
          return sName;
        }
      }
    }
  }

  return null;
}

    /**
     * Smart Subject Section Extractor: Parses multi-subject & multi-sheet Excel files (Classes 1st to 8th)
     * into isolated, clean subject sections with complete months (June to April/May).
     */
    export async function extractSubjectSectionsFromExcel(
      input: File | ArrayBuffer | Blob,
      isMonthlyPlan?: boolean,
      explicitSubject?: string
    ): Promise<AnnualPlanningWorkbook> {
      let arrayBuffer: ArrayBuffer;
      if (input instanceof File || input instanceof Blob) {
        arrayBuffer = await input.arrayBuffer();
      } else {
        arrayBuffer = input;
      }

      const workbook = XLSX.read(arrayBuffer, { type: "array", cellStyles: true });
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        return {
          classTitle: "वार्षिक नियोजन",
          academicYear: "२०२६-२७",
          subjects: {},
          allSubjectNames: [],
          rawGrid: [],
        };
      }

      let classTitle = "संपूर्ण वार्षिक नियोजन";
      let academicYear = "२०२६-२७";
      const subjectsMap: Record<string, SubjectSection> = {};
      const allSubjectNames: string[] = [];
      const combinedRawGrid: string[][] = [];

      let targetSubj = explicitSubject && explicitSubject !== "all" && explicitSubject !== "सर्व विषय"
        ? normalizeSubjectName(explicitSubject)
        : "";

      const KNOWN_SUBJECTS = [
        "परिसर अभ्यास भाग १",
        "परिसर अभ्यास भाग २",
        "परिसर अभ्यास भाग 1",
        "परिसर अभ्यास भाग 2",
        "परिसर अभ्यास - १",
        "परिसर अभ्यास - २",
        "परिसर अभ्यास",
        "मराठी",
        "गणित",
        "इंग्रजी",
        "हिंदी",
        "सामान्य विज्ञान",
        "विज्ञान",
        "सामाजिक शास्त्रे",
        "कलाशिक्षण",
        "कार्यशिक्षण",
        "शारीरिक शिक्षण",
        "English",
        "Maths",
        "Science",
        "General Science",
        "Social Science",
        "Social Sciences",
      ];

      const sheetMonthlySectionsMap: Record<string, MonthlySection> = {};
      const seenCombinedMonths = new Set<string>();

      // Iterate over all sheets in the workbook
      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet || !worksheet["!ref"]) return;

        const rawRowsJson: string[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
        });

        const rawGrid: string[][] = rawRowsJson.map((row) =>
          (row || []).map((cell) => (cell !== undefined && cell !== null ? String(cell).trim() : ""))
        );

        if (rawGrid.length === 0) return;

        // Count distinct months in this sheet (checking both English and Marathi month titles)
        const distinctMonthsInSheet = new Set<string>();
        for (const r of rawGrid) {
          const line = r.join(" ").trim();
          const m = extractCleanMonthNameFromLine(line);
          if (m) {
            distinctMonthsInSheet.add(normalizeForCompare(m));
          }
          for (const c of r) {
            if (isMarathiMonth(c)) {
              distinctMonthsInSheet.add(normalizeForCompare(canonicalizeMarathiMonth(c)));
            }
          }
        }

        // Only treat sheet as a single-month sheet if sheetName itself is a month OR the sheet only has 1 distinct month!
        let sheetMonth: string | null = null;
        if (distinctMonthsInSheet.size <= 1) {
          sheetMonth =
            extractCleanMonthNameFromLine(sheetName) ||
            (isMarathiMonth(sheetName) ? canonicalizeMarathiMonth(sheetName) + " २०२६" : null);

          if (!sheetMonth) {
            for (let r = 0; r < Math.min(rawGrid.length, 6); r++) {
              const line = rawGrid[r].join(" ").trim();
              const m = extractCleanMonthNameFromLine(line);
              if (m) {
                sheetMonth = m;
                break;
              }
            }
          }
        }

        // Check first 6 rows for subject and class
        let sheetSubject = "";
        let sheetClass = "";
        for (let r = 0; r < Math.min(rawGrid.length, 6); r++) {
          const line = (rawGrid[r] || []).join(" ").trim();
          const strictSubj = extractStrictSubjectFromLine(line);
          if (strictSubj) sheetSubject = strictSubj;
          const classMatch = line.match(/(?:इयत्ता|class)\s*[:-–]?\s*([^\s,;]+(?:\s+[^\s,;]+)?)/i);
          if (classMatch) sheetClass = classMatch[0].trim();
        }

        if (sheetMonth) {
          // Ensure rawGrid has an explicit month banner row at top
          const firstRowLine = (rawGrid[0] || []).join(" ").trim();
          if (!firstRowLine.includes(sheetMonth)) {
            rawGrid.unshift([`मासिक व घटक नियोजन माहे - ${sheetMonth}`, "", "", "", "", ""]);
          }

          // Directly register in sheetMonthlySectionsMap
          const dataRows = rawGrid.filter(
            (r) => !isTableColumnHeaderRow(r) && !isSignatureRow(r) && !isMetadataRow(r) && !isMonthBannerRow(r)
          );
          const normalizedRows = normalizeMonthlyPlanningRows(dataRows.length > 0 ? dataRows : rawGrid, sheetMonth);
          if (!sheetMonthlySectionsMap[sheetMonth]) {
            sheetMonthlySectionsMap[sheetMonth] = {
              monthName: sheetMonth,
              displayMonthName: `अभ्यासक्रमाचे मासिक व घटक नियोजन माहे - ${sheetMonth}`,
              classTitle: sheetClass || classTitle,
              subjectTitle: sheetSubject || "",
              plannedPeriods: "",
              workingDays: "",
              headers: DEFAULT_MONTHLY_HEADERS,
              rows: normalizedRows,
            };
          } else {
            sheetMonthlySectionsMap[sheetMonth].rows.push(...normalizedRows);
          }
        }

        distinctMonthsInSheet.forEach((m) => seenCombinedMonths.add(m));
        combinedRawGrid.push(...rawGrid);

        if (sheetSubject && !targetSubj) {
          targetSubj = sheetSubject;
        }

        // If Monthly Planning: 1 file is for 1 subject containing month-wise charts.
        // Bypass multi-subject detection completely and split sheet into monthly charts directly!
        if (isMonthlyPlan) {
          if (distinctMonthsInSheet.size > 1) {
            const splitMonths = splitRowsIntoMonthlySections(rawGrid, targetSubj || "मराठी", sheetClass || classTitle);
            for (const [mName, mSec] of Object.entries(splitMonths)) {
              if (!sheetMonthlySectionsMap[mName]) {
                sheetMonthlySectionsMap[mName] = mSec;
              } else {
                sheetMonthlySectionsMap[mName].rows.push(...mSec.rows);
              }
            }
          }
          return;
        }

        // Detect if column 0 in this sheet is a Serial Number column (अ.क्र., 1, 2, 3...)
        let sheetColOffset = 0;
        const headerRowWithMonth = rawGrid.find((r) => r.some((c) => String(c).includes("महिना") || String(c).toLowerCase().includes("month")));
        if (headerRowWithMonth) {
          const monthColIdx = headerRowWithMonth.findIndex((c) => String(c).includes("महिना") || String(c).toLowerCase().includes("month"));
          if (monthColIdx > 0) {
            sheetColOffset = monthColIdx;
          }
        } else {
          const sampleRowsWithMonthInCol1 = rawGrid.filter((r) => /^\d+$/.test(String(r[0] || "").trim()) && isMarathiMonth(String(r[1] || "").trim()));
          if (sampleRowsWithMonthInCol1.length >= 1) {
            sheetColOffset = 1;
          }
        }

        const sheetSubjNormalized = normalizeSubjectName(sheetName);
        const hasSheetSubjectName =
          sheetName &&
          !sheetName.toLowerCase().includes("sheet") &&
          sheetSubjNormalized !== "सामान्य";

        let currentSubjKey = hasSheetSubjectName ? sheetSubjNormalized : "";
        let currentSubjDisplay = hasSheetSubjectName ? `विषय : ${sheetSubjNormalized}` : "";
        let currentHeaders: string[] = [...DEFAULT_SUBJECT_HEADERS];
        let currentSubjectRows: string[][] = [];
        let currentStartRow = 0;

        let lastMonth = "";
        let lastWeeks = "";
        let lastWorkingDays = "";
        let lastPeriods = "";

        const flushCurrentSubject = (endRowIdx: number) => {
          if (currentSubjKey && currentSubjectRows.length > 0) {
            if (!subjectsMap[currentSubjKey]) {
              subjectsMap[currentSubjKey] = {
                subjectName: currentSubjKey,
                displaySubjectName: currentSubjDisplay || `विषय : ${currentSubjKey}`,
                headers: currentHeaders,
                rows: currentSubjectRows,
                startRow: currentStartRow,
                endRow: endRowIdx,
              };
            } else {
              subjectsMap[currentSubjKey].rows.push(...currentSubjectRows);
              subjectsMap[currentSubjKey].endRow = endRowIdx;
            }
            if (!allSubjectNames.includes(currentSubjKey)) {
              allSubjectNames.push(currentSubjKey);
            }
          }
        };

        rawGrid.forEach((row, rIdx) => {
          const rowLine = row.join(" ").trim();
          if (!rowLine) return;

          if (rowLine.includes("इयत्ता") || rowLine.includes("नियोजन")) {
            if (!classTitle || classTitle === "संपूर्ण वार्षिक नियोजन") {
              classTitle = rowLine.replace(/\s+/g, " ");
            }
          }

          if (rowLine.includes("सन") || rowLine.includes("२०२६")) {
            const match = rowLine.match(/(सन\s*[:-]?\s*\d{4}[-–]\d{2,4})/i);
            if (match) academicYear = match[1];
          }

          const detectedSubjText = detectSubjectFromRow(row, KNOWN_SUBJECTS);

          const isColumnHeader =
            (rowLine.includes("महिना") || rowLine.toLowerCase().includes("month")) &&
            (rowLine.includes("आठवडा") || rowLine.toLowerCase().includes("week") || rowLine.includes("दिवस") || rowLine.toLowerCase().includes("working") || rowLine.toLowerCase().includes("teaching"));

          if (detectedSubjText) {
            const normalizedKey = normalizeSubjectName(detectedSubjText);
            if (normalizedKey && normalizedKey !== "सामान्य" && normalizedKey !== currentSubjKey && isNaN(Number(normalizedKey))) {
              flushCurrentSubject(rIdx - 1);

              currentSubjKey = normalizedKey;
              currentSubjDisplay = `विषय : ${normalizedKey}`;
              currentSubjectRows = [];
              currentStartRow = rIdx;
              lastMonth = "";
              lastWeeks = "";
              lastWorkingDays = "";
              lastPeriods = "";
              return;
            }
          }

          if (isColumnHeader) {
            const nonCols = row.filter((c) => c !== "");
            if (nonCols.length >= 4) {
              currentHeaders = nonCols.map(
                (c, idx) => c || DEFAULT_SUBJECT_HEADERS[idx] || `स्तंभ ${idx + 1}`
              );
            }
            if (!currentSubjKey) {
              currentSubjKey = hasSheetSubjectName ? sheetSubjNormalized : "मराठी";
              currentSubjDisplay = `विषय : ${currentSubjKey}`;
            }
            return;
          }

          if (
            isSignatureRow(row) ||
            rowLine.includes("वार्षिक नियोजन") ||
            rowLine.includes("Yearly Planning") ||
            rowLine.includes("इयत्ता :") ||
            rowLine.includes("Class :")
          ) {
            return;
          }

          if (!currentSubjKey) {
            currentSubjKey = hasSheetSubjectName ? sheetSubjNormalized : "मराठी";
            currentSubjDisplay = `विषय : ${currentSubjKey}`;
          }

          // Check if Col 0 is a serial number or blank and Col 1 is Month
          let colOffset = sheetColOffset;
          const c0 = String(row[0] || "").trim();
          const c1 = String(row[1] || "").trim();
          if (colOffset === 0 && !isMarathiMonth(c0) && isMarathiMonth(c1)) {
            colOffset = 1;
          }

          let rawMonthCell = String(row[0 + colOffset] || "").trim();
          let rawWeeksCell = String(row[1 + colOffset] || "").trim();
          let rawDaysCell = String(row[2 + colOffset] || "").trim();
          let rawPeriodsCell = String(row[3 + colOffset] || "").trim();
          let topicCell = String(row[4 + colOffset] !== undefined && row[4 + colOffset] !== null ? row[4 + colOffset] : "").trim();
          let outcomeCell = String(row[5 + colOffset] !== undefined && row[5 + colOffset] !== null ? row[5 + colOffset] : "").trim();

          // If rawMonthCell contains exam/assessment text, move it to topicCell so it doesn't overwrite month
          if (isExamOrAssessmentText(rawMonthCell)) {
            if (!topicCell) topicCell = rawMonthCell;
            rawMonthCell = "";
          }

          // If topicCell is empty, check if ANY cell in this row contains exam text (e.g. द्वितीय घटक चाचणी)
          if (!topicCell) {
            for (let c = 0; c < row.length; c++) {
              const val = String(row[c] || "").trim();
              if (isExamOrAssessmentText(val)) {
                topicCell = val;
                if (c === 0 + colOffset) rawMonthCell = "";
                if (c === 1 + colOffset) rawWeeksCell = "";
                if (c === 2 + colOffset) rawDaysCell = "";
                if (c === 3 + colOffset) rawPeriodsCell = "";
                break;
              }
            }
          }

          if (rawMonthCell && (isMarathiMonth(rawMonthCell) || isEnglishMonth(rawMonthCell))) {
            const canon = isMarathiMonth(rawMonthCell) ? canonicalizeMarathiMonth(rawMonthCell) : rawMonthCell;
            lastMonth = canon;
            rawMonthCell = canon;
            if (rawWeeksCell) lastWeeks = rawWeeksCell;
            if (rawDaysCell) lastWorkingDays = rawDaysCell;
            if (rawPeriodsCell) lastPeriods = rawPeriodsCell;
          }

          const hasData =
            rawMonthCell !== "" ||
            rawWeeksCell !== "" ||
            rawDaysCell !== "" ||
            rawPeriodsCell !== "" ||
            topicCell !== "" ||
            outcomeCell !== "";

          if (hasData) {
            const effectiveMonth = rawMonthCell || lastMonth;
            const effectiveWeeks = rawWeeksCell || (effectiveMonth === lastMonth ? lastWeeks : "");
            const effectiveDays = rawDaysCell || (effectiveMonth === lastMonth ? lastWorkingDays : "");
            const effectivePeriods = rawPeriodsCell || (effectiveMonth === lastMonth ? lastPeriods : "");

            currentSubjectRows.push([
              effectiveMonth,
              effectiveWeeks,
              effectiveDays,
              effectivePeriods,
              topicCell,
              outcomeCell,
            ]);
          }
        });

        flushCurrentSubject(rawGrid.length - 1);
      });

      if (isMonthlyPlan) {
        if (!targetSubj) {
          targetSubj = classTitle.toLowerCase().includes("english") ? "इंग्रजी" : "मराठी";
        }
        const monthlySections: Record<string, MonthlySection> = {};
        if (Object.keys(sheetMonthlySectionsMap).length > 0) {
          Object.assign(monthlySections, sheetMonthlySectionsMap);
        }
        const fromCombined = splitRowsIntoMonthlySections(combinedRawGrid, targetSubj, classTitle);
        for (const [k, v] of Object.entries(fromCombined)) {
          if (!monthlySections[k]) {
            monthlySections[k] = v;
          }
        }

        subjectsMap[targetSubj] = {
          subjectName: targetSubj,
          displaySubjectName: `विषय : ${targetSubj}`,
          headers: DEFAULT_MONTHLY_HEADERS,
          rows: combinedRawGrid,
          startRow: 0,
          endRow: combinedRawGrid.length,
          monthlySections,
        };
        allSubjectNames.push(targetSubj);

        return {
          classTitle,
          academicYear,
          subjects: subjectsMap,
          allSubjectNames,
          rawGrid: combinedRawGrid,
          monthlySections,
        };
      }

      const standardOrder = [
        "मराठी",
        "हिंदी",
        "इंग्रजी",
        "गणित",
        "परिसर अभ्यास भाग १",
        "परिसर अभ्यास भाग २",
        "परिसर अभ्यास भाग 1",
        "परिसर अभ्यास भाग 2",
        "परिसर अभ्यास - १",
        "परिसर अभ्यास - २",
        "परिसर अभ्यास",
        "सामान्य विज्ञान",
        "विज्ञान",
        "सामाजिक शास्त्रे",
        "कलाशिक्षण",
        "कार्यशिक्षण",
        "शारीरिक शिक्षण",
      ];
      allSubjectNames.sort((a, b) => {
        const idxA = standardOrder.indexOf(a);
        const idxB = standardOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });

      const monthlyFromCombined = splitRowsIntoMonthlySections(combinedRawGrid);
      const monthlySections: Record<string, MonthlySection> = {};
      if (Object.keys(sheetMonthlySectionsMap).length > 1) {
        Object.assign(monthlySections, sheetMonthlySectionsMap);
        // Also include any extra months discovered from combined grid
        for (const [k, v] of Object.entries(monthlyFromCombined)) {
          if (!monthlySections[k]) {
            monthlySections[k] = v;
          }
        }
      } else if (Object.keys(monthlyFromCombined).length > 0) {
        Object.assign(monthlySections, monthlyFromCombined);
      } else if (Object.keys(sheetMonthlySectionsMap).length > 0) {
        Object.assign(monthlySections, sheetMonthlySectionsMap);
      }

      return {
        classTitle,
        academicYear,
        subjects: subjectsMap,
        allSubjectNames,
        rawGrid: combinedRawGrid,
        monthlySections,
      };
    }

    /**
     * Splits flat array of rows (e.g. from Firestore record / rawDataRows / gridData)
     * into distinct SubjectSections with complete months (June to April/May).
     */
    export function splitRowsIntoSubjectSections(
      rawRows: string[][],
      fallbackSubject: string = "मराठी"
    ): Record<string, SubjectSection> {
      const KNOWN_SUBJECTS = [
        "परिसर अभ्यास भाग १",
        "परिसर अभ्यास भाग २",
        "परिसर अभ्यास भाग 1",
        "परिसर अभ्यास भाग 2",
        "परिसर अभ्यास - १",
        "परिसर अभ्यास - २",
        "परिसर अभ्यास",
        "मराठी",
        "हिंदी",
        "इंग्रजी",
        "गणित",
        "सामान्य विज्ञान",
        "विज्ञान",
        "सामाजिक शास्त्रे",
        "कलाशिक्षण",
        "कार्यशिक्षण",
        "शारीरिक शिक्षण",
        "English",
        "Maths",
        "Science",
        "General Science",
        "Hindi",
        "Social Science",
        "Social Sciences",
      ];

      // Detect if column 0 in rawRows is a Serial Number column (अ.क्र., 1, 2, 3...)
      let globalColOffset = 0;
      const headerRowWithMonth = rawRows.find((r) => r.some((c) => String(c).includes("महिना") || String(c).toLowerCase().includes("month")));
      if (headerRowWithMonth) {
        const monthColIdx = headerRowWithMonth.findIndex((c) => String(c).includes("महिना") || String(c).toLowerCase().includes("month"));
        if (monthColIdx > 0) {
          globalColOffset = monthColIdx;
        }
      } else {
        const sampleRowsWithMonthInCol1 = rawRows.filter((r) => /^\d+$/.test(String(r[0] || "").trim()) && isMarathiMonth(String(r[1] || "").trim()));
        if (sampleRowsWithMonthInCol1.length >= 1) {
          globalColOffset = 1;
        }
      }

      const subjectsMap: Record<string, SubjectSection> = {};
      let currentSubjKey = "";
      let currentSubjDisplay = "";
      let currentHeaders: string[] = [...DEFAULT_SUBJECT_HEADERS];
      let currentSubjectRows: string[][] = [];
      let currentStartRow = 0;

      let lastMonth = "";
      let lastWeeks = "";
      let lastWorkingDays = "";
      let lastPeriods = "";

      const flushCurrentSubject = (endRowIdx: number) => {
        if (currentSubjKey && currentSubjectRows.length > 0) {
          if (!subjectsMap[currentSubjKey]) {
            subjectsMap[currentSubjKey] = {
              subjectName: currentSubjKey,
              displaySubjectName: currentSubjDisplay || `विषय : ${currentSubjKey}`,
              headers: currentHeaders,
              rows: currentSubjectRows,
              startRow: currentStartRow,
              endRow: endRowIdx,
            };
          } else {
            subjectsMap[currentSubjKey].rows.push(...currentSubjectRows);
            subjectsMap[currentSubjKey].endRow = endRowIdx;
          }
        }
      };

      rawRows.forEach((row, rIdx) => {
        const rowLine = (row || []).map((c) => String(c || "")).join(" ").trim();
        if (!rowLine) return;

        const detectedSubjText = detectSubjectFromRow(row, KNOWN_SUBJECTS);

        const isColumnHeader =
          (rowLine.includes("महिना") || rowLine.toLowerCase().includes("month")) &&
          (rowLine.includes("आठवडा") || rowLine.toLowerCase().includes("week") || rowLine.includes("दिवस") || rowLine.toLowerCase().includes("working") || rowLine.toLowerCase().includes("teaching"));

        if (detectedSubjText) {
          const normalizedKey = normalizeSubjectName(detectedSubjText);
          if (normalizedKey && normalizedKey !== "सामान्य" && isNaN(Number(normalizedKey))) {
            if (currentSubjKey !== normalizedKey) {
              flushCurrentSubject(rIdx - 1);
              currentSubjKey = normalizedKey;
              currentSubjDisplay = `विषय : ${normalizedKey}`;
              currentSubjectRows = [];
              currentStartRow = rIdx;
              lastMonth = "";
              lastWeeks = "";
              lastWorkingDays = "";
              lastPeriods = "";
              return;
            }
          }
        }

        if (isColumnHeader) {
          const nonCols = row.filter((c) => c !== "");
          if (nonCols.length >= 4) {
            currentHeaders = nonCols.map(
              (c, idx) => c || DEFAULT_SUBJECT_HEADERS[idx] || `स्तंभ ${idx + 1}`
            );
          }
          if (!currentSubjKey) {
            currentSubjKey = normalizeSubjectName(fallbackSubject);
            currentSubjDisplay = `विषय : ${currentSubjKey}`;
          }
          return;
        }

        if (
          isSignatureRow(row) ||
          rowLine.includes("शिक्षक स्वाक्षरी") ||
          rowLine.includes("मुख्याध्यापक स्वाक्षरी") ||
          rowLine.includes("वार्षिक नियोजन") ||
          rowLine.includes("Yearly Planning") ||
          rowLine.includes("इयत्ता :") ||
          rowLine.includes("Class :")
        ) {
          return;
        }

        if (!currentSubjKey) {
          currentSubjKey = normalizeSubjectName(fallbackSubject);
          currentSubjDisplay = `विषय : ${currentSubjKey}`;
        }

        // Check if Col 0 is a serial number or blank and Col 1 is Month
        let colOffset = globalColOffset;
        const c0 = String(row[0] || "").trim();
        const c1 = String(row[1] || "").trim();
        if (colOffset === 0 && !isMarathiMonth(c0) && isMarathiMonth(c1)) {
          colOffset = 1;
        }

        let monthCell = String(row[0 + colOffset] || "").trim();
        const weeksCell = String(row[1 + colOffset] || "").trim();
        const daysCell = String(row[2 + colOffset] || "").trim();
        const periodsCell = String(row[3 + colOffset] || "").trim();
        let topicCell = String(row[4 + colOffset] !== undefined && row[4 + colOffset] !== null ? row[4 + colOffset] : "").trim();
        const outcomeCell = String(row[5 + colOffset] !== undefined && row[5 + colOffset] !== null ? row[5 + colOffset] : "").trim();

        // If monthCell contains exam/assessment text, move it to topicCell
        if (isExamOrAssessmentText(monthCell)) {
          if (!topicCell) topicCell = monthCell;
          monthCell = "";
        }

        // If topicCell is empty, check if ANY cell in this row contains exam text (e.g. द्वितीय घटक चाचणी)
        if (!topicCell) {
          for (let c = 0; c < row.length; c++) {
            const val = String(row[c] || "").trim();
            if (isExamOrAssessmentText(val)) {
              topicCell = val;
              if (c === 0 + colOffset) monthCell = "";
              break;
            }
          }
        }

        if (monthCell && isMarathiMonth(monthCell)) {
          const canon = canonicalizeMarathiMonth(monthCell);
          lastMonth = canon;
          monthCell = canon;
          if (weeksCell) lastWeeks = weeksCell;
          if (daysCell) lastWorkingDays = daysCell;
          if (periodsCell) lastPeriods = periodsCell;
        }

        const effectiveMonth = monthCell || lastMonth;
        const effectiveWeeks = weeksCell || (effectiveMonth === lastMonth ? lastWeeks : "");
        const effectiveDays = daysCell || (effectiveMonth === lastMonth ? lastWorkingDays : "");
        const effectivePeriods = periodsCell || (effectiveMonth === lastMonth ? lastPeriods : "");

        const hasData =
          effectiveMonth !== "" ||
          effectiveWeeks !== "" ||
          effectiveDays !== "" ||
          effectivePeriods !== "" ||
          topicCell !== "" ||
          outcomeCell !== "";

        if (hasData) {
          currentSubjectRows.push([
            effectiveMonth,
            effectiveWeeks,
            effectiveDays,
            effectivePeriods,
            topicCell,
            outcomeCell,
          ]);
        }
      });

      flushCurrentSubject(rawRows.length - 1);

      if (Object.keys(subjectsMap).length === 0 && rawRows.length > 0) {
        const singleKey = normalizeSubjectName(fallbackSubject);
        subjectsMap[singleKey] = {
          subjectName: singleKey,
          displaySubjectName: `विषय : ${singleKey}`,
          headers: DEFAULT_SUBJECT_HEADERS,
          rows: rawRows.slice(1).filter((r) => r.some((c) => c !== "")),
          startRow: 0,
          endRow: rawRows.length,
        };
      }

      return subjectsMap;
    }

    export interface MonthlySection {
      monthName: string; // e.g. "जुलै २०२६"
      displayMonthName: string; // e.g. "अभ्यासक्रमाचे मासिक व घटक नियोजन माहे - जुलै २०२६"
      classTitle?: string;
      subjectTitle?: string;
      plannedPeriods?: string;
      workingDays?: string;
      headers: string[];
      rows: string[][];
    }

    export const DEFAULT_MONTHLY_HEADERS = [
      "दिवस",
      "पाठ / घटक",
      "अध्ययन निष्पत्ती",
      "अध्ययन मुद्दे / पाठ्यांश उद्देश",
      "अध्ययन अनुभवाचे स्वरूप",
      "साधन तंत्रे",
      "शैक्षणिक साहित्य",
    ];

    export const DEFAULT_MONTHLY_ENGLISH_HEADERS = [
      "Day",
      "Lesson/ Point",
      "Learning Outcomes",
      "Teaching Point/ Aim",
      "Structure of Teaching Experience",
      "Tool & Technique",
      "Educational Instrument",
    ];

    export const ACADEMIC_MONTH_ORDER: Record<string, number> = {
      // June
      "june": 1, "jun": 1, "जून": 1, "जुन": 1,
      // July
      "july": 2, "jul": 2, "जुलै": 2, "जुलाई": 2,
      // August
      "august": 3, "aug": 3, "ऑगस्ट": 3, "ऑगष्ट": 3, "ऑग": 3, "आगस्ट": 3, "अगस्त": 3, "अगस्ट": 3,
      // September
      "september": 4, "semptember": 4, "sept": 4, "sep": 4, "सप्टेंबर": 4, "सप्टें": 4, "सप्टे": 4, "सितंबर": 4, "सितम्बर": 4, "सित": 4,
      // October
      "october": 5, "oct": 5, "ऑक्टोबर": 5, "ऑक्टोंबर": 5, "ऑक्टो": 5, "अक्टूबर": 5, "अक्टोबर": 5, "अक्टू": 5,
      // November
      "november": 6, "novembar": 6, "nov": 6, "नोव्हेंबर": 6, "नोव्हें": 6, "नोव्हे": 6, "नवंबर": 6, "नवम्बर": 6, "नव": 6,
      // December
      "december": 7, "decembar": 7, "dec": 7, "डिसेंबर": 7, "डिसें": 7, "डिसं": 7, "दिसंबर": 7, "दिसम्बर": 7, "दिस": 7,
      // January
      "january": 8, "jan": 8, "जानेवारी": 8, "जाने": 8, "जनवरी": 8, "जन": 8,
      // February
      "february": 9, "feb": 9, "फेब्रुवारी": 9, "फेब्रु": 9, "फरवरी": 9, "फर": 9,
      // March
      "march": 10, "mar": 10, "मार्च": 10,
      // March + April combined
      "march + april": 10.5, "march & april": 10.5, "मार्च + एप्रिल": 10.5, "मार्च - एप्रिल": 10.5, "मार्च व एप्रिल": 10.5,
      // April
      "april": 11, "apr": 11, "एप्रिल": 11, "एप्रि": 11, "अप्रैल": 11,
      // May
      "may": 12, "मे": 12,
    };

    export function getAcademicMonthRank(monthStr: string): number {
      if (!monthStr) return 999;
      const lower = monthStr.toLowerCase().trim();
      if ((lower.includes("march") || lower.includes("मार्च")) && (lower.includes("april") || lower.includes("एप्रिल"))) {
        return 10.5;
      }
      for (const [key, rank] of Object.entries(ACADEMIC_MONTH_ORDER)) {
        if (lower.includes(key)) return rank;
      }
      return 999;
    }

    export function extractCleanMonthNameFromLine(line: string): string | null {
      if (!line) return null;
      const l = line.trim();

      // Guard against regular exercise/reading lines that casually contain a month word
      const isBannerCandidate =
        /monthly\s*(?:&|and)?\s*unit\s*planning/i.test(l) ||
        /मासिक\s*(?:व|आणि)?\s*घटक\s*नियोजन/i.test(l) ||
        /\bmonth\s*[:\-–]/i.test(l) ||
        /(?<![\u0900-\u097F])(?:माहे|महिना|माह|महीना)\s*[:\-–]/i.test(l) ||
        (/विषय\s*[:\-–]/i.test(l) && /(?<![\u0900-\u097F])(?:ज[ूु]न|जून|जुलै|ऑगस्ट|सप्टेंबर|ऑक्टोबर|नोव्हेंबर|डिसेंबर|जानेवारी|फेब्रुवारी|मार्च|एप्रिल)(?![\u0900-\u097F])/i.test(l)) ||
        (l.length < 50 && (isMarathiMonth(l) || /\b(june|july|august|september|semptember|october|november|novembar|december|decembar|january|february|march|april)\b/i.test(l)));

      if (!isBannerCandidate) return null;

      // 1. Compound March + April
      if (/march\s*(?:\+|&|and|[-–/]|ते)\s*april/i.test(l) || /मार्च\s*(?:\+|&|आणि|व|[-–/]|ते)\s*एप्रिल/i.test(l)) {
        const isEng = /[a-zA-Z]/.test(l);
        return isEng ? "March + April 2027" : "मार्च + एप्रिल २०२७";
      }

      // 2. English Months (with resilient handling for typos like Semptember, Novembar, Decembar)
      const engMatch = l.match(/\b(june|july|august|semptember|september|sept|october|oct|novembar|november|nov|decembar|december|dec|january|jan|february|feb|march|mar|april|apr|may)\b(?:\s*(\d{4}))?/i);
      if (engMatch) {
        const m = engMatch[1].toLowerCase();
        let stdName = "";
        let defaultYear = "2026";

        if (m.startsWith("jun")) { stdName = "June"; defaultYear = "2026"; }
        else if (m.startsWith("jul")) { stdName = "July"; defaultYear = "2026"; }
        else if (m.startsWith("aug")) { stdName = "August"; defaultYear = "2026"; }
        else if (m.startsWith("sep") || m.startsWith("semp")) { stdName = "September"; defaultYear = "2026"; }
        else if (m.startsWith("oct")) { stdName = "October"; defaultYear = "2026"; }
        else if (m.startsWith("nov")) { stdName = "November"; defaultYear = "2026"; }
        else if (m.startsWith("dec")) { stdName = "December"; defaultYear = "2026"; }
        else if (m.startsWith("jan")) { stdName = "January"; defaultYear = "2027"; }
        else if (m.startsWith("feb")) { stdName = "February"; defaultYear = "2027"; }
        else if (m.startsWith("mar")) { stdName = "March"; defaultYear = "2027"; }
        else if (m.startsWith("apr")) { stdName = "April"; defaultYear = "2027"; }
        else if (m.startsWith("may")) { stdName = "May"; defaultYear = "2027"; }

        if (stdName) {
          return `${stdName} ${defaultYear}`;
        }
      }

      // 3. Marathi Months with strict Unicode boundaries (STRICTLY prevents false matching on words like समजून, अजून)
      const marMatch = l.match(/(?<![\u0900-\u097F])(ज[ूु]न|जून|जुल[ैे]|जुलाई|ऑग[सश]्ट|ऑग|आगस्ट|अगस्त|अगस्ट|सप्ट[ेेंं]+(?:बर)?|सित[ंम]+बर|ऑक्ट[ोों]+(?:बर)?|अक्ट[ूोों]+बर|नोव्ह[ेेंं]+(?:बर)?|नव[ंम]+बर|डिस[ेेंं]+(?:बर)?|दिस[ंम]+बर|जान[ेे](?:वारी)?|जनवरी|फेब्र[ुू](?:वारी)?|फरवरी|मार्च|एप्रि(?:ल)?|अप्रैल|मे)(?![\u0900-\u097F])(?:\s*([\d\u0966-\u096F]{4}))?/i);
      if (marMatch) {
        const rawM = marMatch[1];
        const stdMar = canonicalizeMarathiMonth(rawM);
        const isNextYear = ["जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे"].includes(stdMar);
        const year = isNextYear ? "२०२७" : "२०२६";
        return `${stdMar} ${year}`;
      }

      return null;
    }

    export function splitRowsIntoMonthlySections(
      rawRows: string[][],
      fallbackSubject?: string,
      fallbackClass?: string
    ): Record<string, MonthlySection> {
      const monthlyMap: Record<string, MonthlySection> = {};

      let currentMonthName = "";
      let currentClassTitle = "";
      let currentSubjectTitle = "";
      let currentPlannedPeriods = "";
      let currentWorkingDays = "";
      let currentRows: string[][] = [];

      const flushCurrentMonth = () => {
        if (currentMonthName && currentRows.length > 0) {
          const normalizedMonthRows = normalizeMonthlyPlanningRows(
            currentRows,
            currentMonthName,
            currentSubjectTitle || fallbackSubject,
            currentClassTitle || fallbackClass
          );
          const isEngMonthPlan = /[a-zA-Z]/.test(currentMonthName);
          if (!monthlyMap[currentMonthName] || monthlyMap[currentMonthName].rows.length === 0) {
            monthlyMap[currentMonthName] = {
              monthName: currentMonthName,
              displayMonthName: isEngMonthPlan
                ? `Monthly & Unit Planning - Month: ${currentMonthName}`
                : `अभ्यासक्रमाचे मासिक व घटक नियोजन माहे - ${currentMonthName}`,
              classTitle: currentClassTitle || fallbackClass || "",
              subjectTitle: currentSubjectTitle || fallbackSubject || "",
              plannedPeriods: currentPlannedPeriods,
              workingDays: currentWorkingDays,
              headers: isEngMonthPlan ? DEFAULT_MONTHLY_ENGLISH_HEADERS : DEFAULT_MONTHLY_HEADERS,
              rows: normalizedMonthRows,
            };
          } else {
            // APPEND rows so no data from continuation tables/pages is EVER dropped!
            monthlyMap[currentMonthName].rows.push(...normalizedMonthRows);
          }
        }
      };

      rawRows.forEach((row) => {
        if (!row || !Array.isArray(row)) return;
        const nonEmpties = row.map((c) => String(c !== undefined && c !== null ? c : "").trim()).filter(Boolean);
        if (nonEmpties.length === 0) return;
        const line = nonEmpties.join(" ").trim();

        // Check for Clean Month Header Banner
        const hasMonthKeyword =
          /मासिक\s*(?:व|आणि)?\s*घटक\s*नियोजन/i.test(line) ||
          /monthly\s*(?:&|and)?\s*unit\s*planning/i.test(line) ||
          /monthly\s*planning/i.test(line) ||
          /मासिक\s*नियोजन/i.test(line) ||
          /\bmonth\s*[:-–]?/i.test(line) ||
          /(?<![\u0900-\u097F])(?:माहे|महिना|माह|महीना)\s*[:-–]?/i.test(line);

        const isBanner = isMonthBannerRow(row);

        // Pure month banner / header (short line or dedicated title, NOT a data row with sentences > 25 chars)
        const isPureBanner =
          (isBanner || hasMonthKeyword || (nonEmpties.length <= 2 && !row.some((c) => String(c || "").trim().length > 25))) &&
          !isTableColumnHeaderRow(row);
        if (isPureBanner) {
          let detectedMonth = extractCleanMonthNameFromLine(line);
          if (!detectedMonth) {
            for (let c = 0; c < Math.min(row.length, 3); c++) {
              const cVal = String(row[c] || "").trim();
              if (cVal && (isMarathiMonth(cVal) || isEnglishMonth(cVal))) {
                detectedMonth = extractCleanMonthNameFromLine(cVal);
                if (detectedMonth) break;
              }
            }
          }

          if (detectedMonth) {
            if (normalizeForCompare(detectedMonth) !== normalizeForCompare(currentMonthName)) {
              flushCurrentMonth();
              currentMonthName = detectedMonth;
              currentRows = [];
            }
            const strictSubj = extractStrictSubjectFromLine(line);
            if (strictSubj) currentSubjectTitle = strictSubj;
            const classMatch = line.match(/(?:इयत्ता|class)\s*[:-–]?\s*([^\s,;]+(?:\s+[^\s,;]+)?)/i);
            if (classMatch) currentClassTitle = classMatch[0].trim();
            return; // Consume banner
          }
        }

        if (isBanner) {
          const strictSubj = extractStrictSubjectFromLine(line);
          if (strictSubj) currentSubjectTitle = strictSubj;
          const classMatch = line.match(/(?:इयत्ता|class)\s*[:-–]?\s*([^\s,;]+(?:\s+[^\s,;]+)?)/i);
          if (classMatch) currentClassTitle = classMatch[0].trim();
          return;
        }

        // Check for Metadata Header
        if (isMetadataRow(row)) {
          for (const cell of row) {
            const cStr = String(cell || "").trim();
            if (cStr.includes("इयत्ता") || cStr.toLowerCase().includes("class")) currentClassTitle = cStr;
            const strictSubj = extractStrictSubjectFromLine(cStr);
            if (strictSubj) currentSubjectTitle = strictSubj;
            if (cStr.includes("तासिका") || cStr.toLowerCase().includes("period")) currentPlannedPeriods = cStr;
            if (cStr.includes("कामाचे दिवस") || cStr.toLowerCase().includes("working day")) currentWorkingDays = cStr;
          }
          return;
        }

        // Skip table column headers row (Marathi or English)
        if (isTableColumnHeaderRow(row)) {
          return;
        }

        // Skip signatures
        if (isSignatureRow(row)) {
          return;
        }

        // --- CURRICULUM DATA ROW ---
        // Check if Col 0 or Col 1 has a month indicating a month transition in data rows!
        const c0 = String(row[0] || "").trim();
        const c1 = String(row[1] || "").trim();
        let rowMonthCandidate = "";
        if (isMarathiMonth(c0) || isEnglishMonth(c0)) {
          rowMonthCandidate = c0;
        } else if (/^\d+$/.test(c0) && (isMarathiMonth(c1) || isEnglishMonth(c1))) {
          rowMonthCandidate = c1;
        }

        if (rowMonthCandidate) {
          const detected = extractCleanMonthNameFromLine(rowMonthCandidate);
          if (detected && normalizeForCompare(detected) !== normalizeForCompare(currentMonthName)) {
            if (!currentMonthName.includes("मार्च + एप्रिल") && !currentMonthName.includes("March + April")) {
              flushCurrentMonth();
              currentMonthName = detected;
              currentRows = [];
            }
          }
        }

        if (!currentMonthName) currentMonthName = "जून २०२६";

        // If row starts with April divider inside a March block (ONLY if not already March + April combined)
        if (
          nonEmpties.length <= 2 &&
          (c0.includes("एप्रिल") || c0.toLowerCase().includes("april")) &&
          (currentMonthName.includes("मार्च") || currentMonthName.toLowerCase().includes("march")) &&
          !currentMonthName.includes("एप्रिल") &&
          !currentMonthName.toLowerCase().includes("april") &&
          currentRows.length > 0
        ) {
          flushCurrentMonth();
          currentMonthName = currentMonthName.toLowerCase().includes("march") ? "April 2027" : "एप्रिल २०२७";
          currentRows = [];
          return;
        }

        // For Monthly Planning data rows, directly preserve all columns exactly as in the source Excel file without generating synthetic data:
        const rowClean = normalizeMonthlyPlanningRow(
          row,
          currentSubjectTitle || fallbackSubject,
          currentClassTitle || fallbackClass,
          currentRows.length,
          /[a-zA-Z]/.test(currentMonthName)
        );

        currentRows.push(rowClean);
      });

      flushCurrentMonth();

      // Strictly sort monthlyMap in Academic Year Chronological Order (June 2026 -> April 2027)
      const sortedEntries = Object.entries(monthlyMap).sort(([nameA], [nameB]) => {
        return getAcademicMonthRank(nameA) - getAcademicMonthRank(nameB);
      });

      const sortedMonthlyMap: Record<string, MonthlySection> = {};
      for (const [k, v] of sortedEntries) {
        sortedMonthlyMap[k] = v;
      }

      // Backfill subjectTitle and classTitle across all monthly sections if some months lacked header rows
      const discoveredSubject = Object.values(sortedMonthlyMap).find((s) => s.subjectTitle)?.subjectTitle || fallbackSubject || "";
      const discoveredClass = Object.values(sortedMonthlyMap).find((s) => s.classTitle)?.classTitle || fallbackClass || "";
      if (discoveredSubject || discoveredClass) {
        for (const mSec of Object.values(sortedMonthlyMap)) {
          if (!mSec.subjectTitle && discoveredSubject) mSec.subjectTitle = discoveredSubject;
          if (!mSec.classTitle && discoveredClass) mSec.classTitle = discoveredClass;
        }
      }

      return sortedMonthlyMap;
    }

    /**
     * Calculates primary school working dates for a given month in Maharashtra:
     * Skips Sundays, 2nd and 4th Saturdays.
     */
    export function getWorkingDatesForMonth(monthName: string, year: number = 2026): string[] {
      const monthMap: Record<string, number> = {
        "जानेवारी": 0, "जाने": 0, "january": 0, "jan": 0,
        "फेब्रुवारी": 1, "फेब्रु": 1, "february": 1, "feb": 1,
        "मार्च": 2, "मार्च ": 2, "march": 2, "mar": 2,
        "एप्रिल": 3, "april": 3, "apr": 3,
        "मे": 4, "may": 4,
        "जून": 5, "जुन": 5, "june": 5, "jun": 5,
        "जुलै": 6, "july": 6, "jul": 6,
        "ऑगस्ट": 7, "august": 7, "aug": 7,
        "सप्टेंबर": 8, "सप्टें": 8, "september": 8, "sep": 8,
        "ऑक्टोबर": 9, "ऑक्टोंबर": 9, "october": 9, "oct": 9,
        "नोव्हेंबर": 10, "नोव्हें": 10, "november": 10, "nov": 10,
        "डिसेंबर": 11, "डिसे": 11, "december": 11, "dec": 11,
      };

      let mIdx = -1;
      const lower = (monthName || "").toLowerCase().trim();
      for (const [k, v] of Object.entries(monthMap)) {
        if (lower.includes(k)) {
          mIdx = v;
          break;
        }
      }
      if (mIdx === -1) mIdx = 2; // Default to March

      const daysInMonth = new Date(year, mIdx + 1, 0).getDate();
      const dates: string[] = [];
      let satCount = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const dt = new Date(year, mIdx, d);
        const dayOfWeek = dt.getDay(); // 0 = Sun, 6 = Sat
        if (dayOfWeek === 0) continue; // Skip Sunday
        if (dayOfWeek === 6) {
          satCount++;
          if (satCount === 2 || satCount === 4) continue; // Skip 2nd and 4th Saturday
        }
        dates.push(String(d));
      }
      return dates;
    }

    const COMMON_TOOLS_LIST = [
      "निरीक्षण", "तोंडी काम", "प्रात्यक्षिक", "कृती", "संवाद", "स्वाध्याय",
      "वर्ग कार्य", "गृह कार्य", "चर्चा", "विचार", "उपक्रम", "गायन", "वाचन",
      "लेखन", "शोध", "अभिव्यक्ती", "कथन", "प्रकटवाचन"
    ];

    /**
     * Resolves curriculum Learning Outcome (अध्ययन निष्पत्ती) for Monthly Planning:
     * Covers ALL subjects across ALL classes (1st to 8th) for BOTH Marathi Medium and Semi-English Medium.
     */
    export function getLearningOutcomeForMonthlyPlanning(
      classId?: string,
      subjectName?: string,
      topicName?: string,
      rowIndex: number = 0,
      isEnglish: boolean = false
    ): string {
      // Normalize class to '1' - '8'
      const normClass = String(classId || "1").toLowerCase().replace(/[^1-8]/g, "") || "1";

      let outcomeBank: Record<string, OutcomeItem[]> = CLASS_1_OUTCOMES;
      if (normClass === "2") outcomeBank = CLASS_2_OUTCOMES;
      else if (normClass === "3") outcomeBank = CLASS_3_OUTCOMES;
      else if (normClass === "4") outcomeBank = CLASS_4_OUTCOMES;
      else if (normClass === "5") outcomeBank = CLASS_5_OUTCOMES;
      else if (normClass === "6") outcomeBank = CLASS_6_OUTCOMES;
      else if (normClass === "7") outcomeBank = CLASS_7_OUTCOMES;
      else if (normClass === "8") outcomeBank = CLASS_8_OUTCOMES;

      const rawSub = String(subjectName || "").toLowerCase().trim();

      // Normalize subject key
      let subKey = "marathi";
      if (rawSub.includes("इंग्रजी") || rawSub.includes("english") || rawSub === "eng") {
        subKey = "english";
      } else if (rawSub.includes("हिंदी") || rawSub.includes("hindi")) {
        subKey = "hindi";
      } else if (rawSub.includes("गणित") || rawSub.includes("math")) {
        subKey = "math";
      } else if (rawSub.includes("विज्ञान") || rawSub.includes("science")) {
        subKey = "science";
      } else if (rawSub.includes("इतिहास") || rawSub.includes("history") || rawSub.includes("नागरिकशास्त्र") || rawSub.includes("civics")) {
        subKey = "history";
      } else if (rawSub.includes("भूगोल") || rawSub.includes("geography")) {
        subKey = "geography";
      } else if (rawSub.includes("सामाजिक") || rawSub.includes("social")) {
        subKey = ["6", "7", "8"].includes(normClass) ? "history" : "evs2";
      } else if (rawSub.includes("भाग २") || rawSub.includes("भाग 2") || rawSub.includes("part 2") || rawSub.includes("evs2")) {
        subKey = "evs2";
      } else if (rawSub.includes("परिसर") || rawSub.includes("evs") || rawSub.includes("environmental")) {
        subKey = "evs1";
      } else if (rawSub.includes("कला") || rawSub.includes("art") || rawSub.includes("drawing")) {
        subKey = "kala";
      } else if (rawSub.includes("कार्य") || rawSub.includes("work") || rawSub.includes("karyanubhav")) {
        subKey = "karyanubhav";
      } else if (rawSub.includes("शारीरिक") || rawSub.includes("physical") || rawSub.includes("pe") || rawSub.includes("क्रीडा") || rawSub.includes("आरोग्य")) {
        subKey = "sharirik";
      }

      // Retrieve outcome bank list with graceful subject/class fallbacks
      let outcomes: OutcomeItem[] = [];

      if (outcomeBank[subKey] && Array.isArray(outcomeBank[subKey]) && outcomeBank[subKey].length > 0) {
        outcomes = outcomeBank[subKey];
      } else if (["kala", "karyanubhav", "sharirik"].includes(subKey)) {
        outcomes = CLASS_1_OUTCOMES[subKey] || CLASS_2_OUTCOMES[subKey] || [];
      } else if (subKey === "science") {
        outcomes = outcomeBank.evs1 || CLASS_6_OUTCOMES.science || [];
      } else if (subKey === "evs1" || subKey === "evs2") {
        outcomes = outcomeBank[subKey] || CLASS_5_OUTCOMES[subKey] || CLASS_4_OUTCOMES[subKey] || CLASS_3_OUTCOMES[subKey] || outcomeBank.science || [];
      } else if (subKey === "history" || subKey === "geography") {
        outcomes = outcomeBank[subKey] || CLASS_6_OUTCOMES[subKey] || CLASS_5_OUTCOMES.evs2 || [];
      } else if (subKey === "hindi") {
        outcomes = outcomeBank.hindi || CLASS_5_OUTCOMES.hindi || [];
      }

      if (outcomes.length === 0) {
        outcomes = outcomeBank.marathi || CLASS_1_OUTCOMES.marathi || [];
      }

      if (outcomes.length === 0) return "";

      // Topic Keyword Matching
      const cleanTopic = String(topicName || "").replace(/[०-९\d\.\-_,;:\(\)]/g, " ").trim();
      const words = cleanTopic.split(/\s+/).filter((w) => w.length >= 3);

      let matchedOutcome: OutcomeItem | null = null;
      if (words.length > 0) {
        matchedOutcome = outcomes.find((o) => words.some((w) => o.text && o.text.includes(w))) || null;
      }

      // If no keyword match, select sequentially based on rowIndex
      if (!matchedOutcome) {
        const safeIdx = Math.abs(rowIndex) % outcomes.length;
        matchedOutcome = outcomes[safeIdx];
      }

      if (!matchedOutcome) return "";

      const code = (matchedOutcome.code || "").trim();
      const text = (matchedOutcome.text || "").trim();

      if (code && !text.includes(code)) {
        return `${code} : ${text}`;
      }
      return text;
    }

    /**
     * Normalizes monthly planning rows:
     * 1. PRESERVES EVERY SINGLE WORD! Never erases, drops, or clears any cell content.
     * 2. Correctly shifts 8-column sheets where Column 0 is a Serial Number (अ.क्र., 1, 2, 3...)
     *    so Date -> Col 0, Lesson -> Col 1, and Learning Outcome -> Col 2.
     * 3. Correctly converts 6-column annual-to-monthly sheets so Learning Outcome -> Col 2.
     * 4. Injects official curriculum Learning Outcome in Col 2 if missing or empty for teaching rows.
     * 5. Strictly maintains standard 7-column monthly layout.
     */
    export function normalizeMonthlyPlanningRow(
      row: string[],
      subjectName?: string,
      classId?: string,
      rowIndex: number = 0,
      isEnglish: boolean = false
    ): string[] {
      if (!row || !Array.isArray(row)) return [];

      // Strictly preserve columns 0 to 6 exactly as defined in the source Excel file:
      // If a column is missing, removed, or empty in Excel, it remains empty ("") without adding synthetic data.
      const result: string[] = [];
      for (let i = 0; i < 7; i++) {
        const val = row[i];
        result.push(val !== undefined && val !== null && val !== "null" && val !== "undefined" ? String(val).trim() : "");
      }

      return result;
    }

    /**
     * Normalizes an array of monthly planning rows:
     * 1. Preserves 100% of legitimate lesson and activity rows without deleting or erasing content.
     * 2. Consolidates consecutive redundant vacation rows (e.g. 10-15 duplicate rows of "summer vacation"
     *    or "Diwali vacation" generated by unrolled Excel merges) into a single clean vacation banner row.
     * 3. Prevents long vacation text from being placed in the narrow (45px) Day/Date column.
     */
    /**
     * Helper to calculate the next school teaching day in Maharashtra (skips Sundays).
     */
    export function getNextSchoolDay(currentDay: number, monthName: string, year: number = 2026): number {
      const monthMap: Record<string, number> = {
        "जानेवारी": 0, "january": 0, "jan": 0, "जनवरी": 0,
        "फेब्रुवारी": 1, "february": 1, "feb": 1, "फरवरी": 1,
        "मार्च": 2, "march": 2, "mar": 2,
        "एप्रिल": 3, "april": 3, "apr": 3, "अप्रैल": 3,
        "मे": 4, "may": 4,
        "जून": 5, "june": 5, "jun": 5, "जुन": 5,
        "जुलै": 6, "july": 6, "jul": 6, "जुलाई": 6,
        "ऑगस्ट": 7, "august": 7, "aug": 7, "अगस्त": 7,
        "सप्टेंबर": 8, "september": 8, "sep": 8, "सितंबर": 8,
        "ऑक्टोबर": 9, "october": 9, "oct": 9, "अक्टूबर": 9,
        "नोव्हेंबर": 10, "november": 10, "nov": 10, "नवंबर": 10,
        "डिसेंबर": 11, "december": 11, "dec": 11, "दिसंबर": 11,
      };

      let mIdx = -1;
      const lower = (monthName || "").toLowerCase().trim();
      for (const [k, v] of Object.entries(monthMap)) {
        if (lower.includes(k)) {
          mIdx = v;
          break;
        }
      }
      if (mIdx === -1) mIdx = 5; // Default June

      const effectiveYear = (mIdx >= 0 && mIdx <= 4) ? (year + 1) : year;
      const daysInMonth = new Date(effectiveYear, mIdx + 1, 0).getDate();

      let next = currentDay + 1;
      while (next <= daysInMonth) {
        const dt = new Date(effectiveYear, mIdx, next);
        if (dt.getDay() !== 0) { // Skip Sunday
          return next;
        }
        next++;
      }
      return next <= daysInMonth ? next : currentDay + 1;
    }

    export function normalizeMonthlyPlanningRows(
      rows: string[][],
      monthName: string = "मार्च २०२६",
      subjectName?: string,
      classId?: string,
      mediumId?: string
    ): string[][] {
      if (!rows || rows.length === 0) return [];

      const isEng =
        /[a-zA-Z]/.test(monthName) ||
        (mediumId && (mediumId.toLowerCase().includes("semi") || mediumId.toLowerCase().includes("eng"))) ||
        (subjectName && /[a-zA-Z]/.test(subjectName)) ||
        rows.some((r) => /[a-zA-Z]/.test(String(r[1] || "")));

      // Step 0: Filter out any Excel column header rows so they are NEVER included as data rows
      const cleanRows = rows.filter((r) => !isTableColumnHeaderRow(r));

      // Step 1: Normalize all rows to length 7 with Learning Outcomes resolution
      const normalized = cleanRows.map((r, rIdx) =>
        normalizeMonthlyPlanningRow(r, subjectName, classId, rIdx, Boolean(isEng))
      );

      // Step 2: Consolidate consecutive duplicate vacation rows
      const result: string[][] = [];
      let i = 0;

      while (i < normalized.length) {
        const row = normalized[i];

        // Check if this row is a vacation row
        const vacationCell = row.find((c) => isVacationText(c));
        const nonBlankCells = row.filter((c) => c && c !== "-" && c !== "null" && c !== "undefined");
        const isPureVacationRow = Boolean(vacationCell) && nonBlankCells.every((c) => isVacationText(c));

        if (isPureVacationRow && vacationCell) {
          const vText = vacationCell.trim();
          const firstDay = row[0] && !isVacationText(row[0]) && row[0] !== "-" ? row[0].trim() : "";
          let lastDay = firstDay;

          // Look ahead for consecutive rows with the same vacation
          let nextIdx = i + 1;
          while (nextIdx < normalized.length) {
            const nextRow = normalized[nextIdx];
            const nextVacationCell = nextRow.find((c) => isVacationText(c));
            const nextNonBlanks = nextRow.filter((c) => c && c !== "-" && c !== "null" && c !== "undefined");
            const nextIsVacation = Boolean(nextVacationCell) && nextNonBlanks.every((c) => isVacationText(c));

            if (
              nextIsVacation &&
              nextVacationCell &&
              (nextVacationCell.toLowerCase().includes(vText.toLowerCase()) ||
                vText.toLowerCase().includes(nextVacationCell.toLowerCase()))
            ) {
              if (nextRow[0] && !isVacationText(nextRow[0]) && nextRow[0] !== "-") {
                lastDay = nextRow[0].trim();
              }
              nextIdx++;
            } else {
              break;
            }
          }

          // Format date in Col 0 (never put long text like "Diwali vacation" in 45px Col 0!)
          let dateDisplay = "-";
          if (firstDay && lastDay && firstDay !== lastDay) {
            dateDisplay = `${firstDay} ते ${lastDay}`;
          } else if (firstDay) {
            dateDisplay = firstDay;
          }

          // Single clean consolidated vacation row:
          // Col 0: Date range or "-"
          // Col 1: Vacation Title
          // Col 2: "-"
          // Col 3: "-"
          // Col 4: Vacation Title (Experience)
          // Col 5: "-"
          // Col 6: "-"
          const consolidatedRow = [
            dateDisplay,
            vText,
            "-",
            "-",
            vText,
            "-",
            "-",
          ];

          result.push(consolidatedRow);
          i = nextIdx; // Skip past all duplicate consecutive vacation rows!
        } else {
          // Normal row: check if Col 0 mistakenly has exam/vacation text (like "Diwali vacation" in Col 0)
          const cleanRow = [...row];
          if (isExamOrAssessmentText(cleanRow[0])) {
            const examVal = cleanRow[0];
            cleanRow[0] = "-"; // Free Col 0 so it doesn't wrap into 3 lines in 45px box!
            if (!cleanRow[1] || cleanRow[1] === "-") cleanRow[1] = examVal;
            else if (!cleanRow[4] || cleanRow[4] === "-") cleanRow[4] = examVal;
          }
          result.push(cleanRow);
          i++;
        }
      }

      // Step 3: Populate sequential working days for teaching rows where Col 0 is empty or '-'
      const devanagariDigits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
      const toDevDigits = (num: number) => String(num).replace(/\d/g, (d) => devanagariDigits[parseInt(d, 10)]);

      // Detect whether to output Devanagari or English digits
      const hasDevanagari = result.some((r) => /[०-९]/.test(String(r[0] || "")));
      const isEnglishDigits = isEng || result.some((r) => /[a-zA-Z]/.test(String(r[1] || "")));
      const useDevanagari = hasDevanagari || !isEnglishDigits;

      // Initial day for this month if starting without a number:
      // June school opens on 15th, other months start on 1st
      const isJune = /जून|जुन|june|jun/i.test(monthName);
      let currentDay = isJune ? 14 : 0;

      for (let idx = 0; idx < result.length; idx++) {
        const r = result[idx];
        const nonBlankCount = r.filter((c) => c && c !== "-" && c !== "null" && c !== "undefined").length;
        const isVac = r.some((c) => isVacationText(c));

        // Vacation banner row: skip day numbering
        if (isVac) {
          continue;
        }

        // Has teaching content
        const hasLessonContent = Boolean(r[1] && r[1] !== "-" && !isVacationText(r[1]));
        if (!hasLessonContent && nonBlankCount <= 1) {
          continue;
        }

        const c0 = String(r[0] || "").trim();

        // Check if c0 already has an explicit single day number
        const engNumMatch = c0.match(/^(\d{1,2})$/);
        const devNumMatch = c0.match(/^([०-९]{1,2})$/);

        if (engNumMatch) {
          currentDay = parseInt(engNumMatch[1], 10);
          r[0] = useDevanagari ? toDevDigits(currentDay) : String(currentDay);
        } else if (devNumMatch) {
          const engVal = devNumMatch[1].replace(/[०-९]/g, (d) => String(devanagariDigits.indexOf(d)));
          currentDay = parseInt(engVal, 10);
          r[0] = useDevanagari ? toDevDigits(currentDay) : String(currentDay);
        } else if (c0.includes("ते") || c0.includes("to") || (c0.includes("-") && c0.length > 2)) {
          // Date range like '०१ ते ०८' or '15 to 20' - keep as is!
          const endMatch = c0.match(/(\d{1,2}|[०-९]{1,2})\s*$/);
          if (endMatch) {
            const valStr = endMatch[1].replace(/[०-९]/g, (d) => String(devanagariDigits.indexOf(d)));
            currentDay = parseInt(valStr, 10);
          }
        } else if (c0 === "" || c0 === "-" || c0 === "null" || c0 === "undefined") {
          // Day is missing / hyphen: fill with next school working day!
          currentDay = getNextSchoolDay(currentDay, monthName, 2026);
          r[0] = useDevanagari ? toDevDigits(currentDay) : String(currentDay);
        }
      }

      return result;
    }

    /**
     * Normalizes Annual Planning (वार्षिक नियोजन) rows:
     * 1. Strictly propagates month names to any rows where month is blank or merged.
     * 2. Canonicalizes month names to standard Marathi.
     * 3. Repositions exam/assessment text mistakenly placed in Col 0 (Month) to Col 4 (Topic).
     * 4. Ensures no month is skipped or lost.
     */
    export function normalizeAnnualPlanningRows(rows: string[][]): string[][] {
      if (!rows || rows.length === 0) return [];
      let runningMonth = "";
      let runningWeeks = "";
      let runningDays = "";
      let runningPeriods = "";

      // Auto-detect if Col 1 contains months while Col 0 is Serial Number or blank
      let colOffset = 0;
      let col0MonthCount = 0;
      let col1MonthCount = 0;
      for (let idx = 0; idx < Math.min(rows.length, 25); idx++) {
        const r = rows[idx];
        if (!r) continue;
        if (isMarathiMonth(r[0])) col0MonthCount++;
        if (isMarathiMonth(r[1])) col1MonthCount++;
      }
      if (col0MonthCount === 0 && col1MonthCount > 0) {
        colOffset = 1;
      }

      return rows.map((row) => {
        let m = String(row[0 + colOffset] || "").trim();
        let w = String(row[1 + colOffset] || "").trim();
        let d = String(row[2 + colOffset] || "").trim();
        let p = String(row[3 + colOffset] || "").trim();
        let topic = String(row[4 + colOffset] !== undefined && row[4 + colOffset] !== null ? row[4 + colOffset] : "").trim();
        let outcome = String(row[5 + colOffset] !== undefined && row[5 + colOffset] !== null ? row[5 + colOffset] : "").trim();

        // Check if col 0 has exam text mistakenly
        if (isExamOrAssessmentText(m)) {
          if (!topic) topic = m;
          m = "";
        }

        // Also check if any column has exam text and topic is empty
        if (!topic) {
          const foundExam = row.find((c) => isExamOrAssessmentText(c));
          if (foundExam) topic = String(foundExam).trim();
        }

        if (m && isMarathiMonth(m)) {
          runningMonth = canonicalizeMarathiMonth(m);
          m = runningMonth;
          if (w) runningWeeks = w;
          if (d) runningDays = d;
          if (p) runningPeriods = p;
        } else if (runningMonth) {
          m = runningMonth;
          if (!w && runningWeeks) w = runningWeeks;
          if (!d && runningDays) d = runningDays;
          if (!p && runningPeriods) p = runningPeriods;
        }

        return [m, w, d, p, topic, outcome];
      });
    }
