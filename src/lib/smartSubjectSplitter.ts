import * as XLSX from "xlsx";

export interface SubjectSection {
  subjectName: string; // e.g. "मराठी", "गणित", "इंग्रजी"
  displaySubjectName: string; // e.g. "विषय : गणित"
  headers: string[];
  rows: string[][];
  startRow: number;
  endRow: number;
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
    s.includes("दिवाळी") ||
    s.includes("सुट्ट्या") ||
    s.includes("सुट्टी") ||
    s.includes("सुट्या") ||
    s.includes("उन्हाळी सुट्टी") ||
    s.includes("उन्हाळी सुट्ट्या") ||
    s.includes("उन्हाळी") ||
    s.includes("मूल्यांकन") ||
    s.includes("चाचणी क्र") ||
    s.includes("मूल्यमापन क्र") ||
    s.includes("प्रथम सत्र संकलित") ||
    s.includes("द्वितीय सत्र संकलित") ||
    s.includes("घटक चाचणी") ||
    s.includes("संकलित मूल्यमापन") ||
    s.includes("चाचणी") ||
    s.includes("मूल्यमापन") ||
    s.includes("परीक्षा") ||
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

const MARATHI_MONTHS = [
  "जून",
  "जुन",
  "जुलै",
  "जुलाई",
  "ऑगस्ट",
  "ऑगष्ट",
  "ऑग",
  "आगस्ट",
  "सप्टेंबर",
  "सप्टें",
  "सप्टे",
  "ऑक्टोबर",
  "ऑक्टोंबर",
  "ऑक्टो",
  "नोव्हेंबर",
  "नोव्हें",
  "नोव्हे",
  "डिसेंबर",
  "डिसें",
  "डिसं",
  "जानेवारी",
  "जाने",
  "फेब्रुवारी",
  "फेब्रु",
  "मार्च",
  "एप्रिल",
  "एप्रि",
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
    .replace(/^(माहे|महिना)\s*[-–:]?\s*/i, "")
    .replace(/\s*[\d\u0966-\u096F]{4}(?:[-–][\d\u0966-\u096F]{2,4})?/g, "")
    .replace(/\s*[\d\u0966-\u096F]{2,4}\s*$/g, "")
    .replace(/[.,:;()]/g, "")
    .trim()
    .toLowerCase();

  // Match Marathi months and abbreviations
  if (/^(?:ज[ूु]न|june?|jun)$/i.test(clean)) return "जून";
  if (/^(?:जुल[ैे]|जुलाई|july?|jul)$/i.test(clean)) return "जुलै";
  if (/^(?:ऑग[सश]्ट|ऑग|आगस्ट|aug(?:ust)?)$/i.test(clean)) return "ऑगस्ट";
  if (/^(?:सप्ट[ेेंं]+(?:बर)?|sep(?:t(?:ember)?)?)$/i.test(clean)) return "सप्टेंबर";
  if (/^(?:ऑक्ट[ोों]+(?:बर)?|oct(?:ober)?)$/i.test(clean)) return "ऑक्टोबर";
  if (/^(?:नोव्ह[ेेंं]+(?:बर)?|nov(?:ember)?)$/i.test(clean)) return "नोव्हेंबर";
  if (/^(?:डिस[ेेंं]+(?:बर)?|dec(?:ember)?)$/i.test(clean)) return "डिसेंबर";
  if (/^(?:जान[ेे](?:वारी)?|जाने|jan(?:uary)?)$/i.test(clean)) return "जानेवारी";
  if (/^(?:फेब्र[ुू](?:वारी)?|फेब्रु|feb(?:ruary)?)$/i.test(clean)) return "फेब्रुवारी";
  if (/^(?:मार्च|mar(?:ch)?)$/i.test(clean)) return "मार्च";
  if (/^(?:एप्रि(?:ल)?|apr(?:il)?)$/i.test(clean)) return "एप्रिल";
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
    .replace(/^(माहे|महिना)\s*[-–:]?\s*/i, "")
    .replace(/\s*[\d\u0966-\u096F]{4}(?:[-–][\d\u0966-\u096F]{2,4})?/g, "")
    .replace(/\s*[\d\u0966-\u096F]{2,4}\s*$/g, "")
    .replace(/[.,:;()]/g, "")
    .trim()
    .toLowerCase();

  const monthRegex =
    /^(?:ज[ूु]न|june?|jun|जुल[ैे]|जुलाई|july?|jul|ऑग[सश]्ट|ऑग|आगस्ट|aug(?:ust)?|सप्ट[ेेंं]+(?:बर)?|sep(?:t(?:ember)?)?|ऑक्ट[ोों]+(?:बर)?|oct(?:ober)?|नोव्ह[ेेंं]+(?:बर)?|nov(?:ember)?|डिस[ेेंं]+(?:बर)?|dec(?:ember)?|जान[ेे](?:वारी)?|जाने|jan(?:uary)?|फेब्र[ुू](?:वारी)?|फेब्रु|feb(?:ruary)?|मार्च|mar(?:ch)?|एप्रि(?:ल)?|apr(?:il)?|मे|may)$/i;

  if (monthRegex.test(clean)) return true;

  return MARATHI_MONTHS.some((m) => clean === m.toLowerCase() || clean.startsWith(m.toLowerCase()));
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
  const line = row.map((c) => String(c || "")).join(" ").trim().toLowerCase();
  if (!line) return false;

  const lineNoSpace = line.replace(/\s+/g, "");

  // Marathi Signature terms
  if (line.includes("स्वाक्षरी") || line.includes("शिक्का")) return true;
  if (line.includes("वर्ग शिक्षक") && line.includes("मुख्याध्यापक")) return true;
  if (line.includes("विषय /") && line.includes("शिक्षक")) return true;
  if (line.includes("शिक्षक") && line.includes("मुख्याध्यापक")) return true;
  if (lineNoSpace.includes("वर्गशिक्षक") || lineNoSpace.includes("मुख्याध्यापक")) return true;

  // English Signature terms (Class teacher sign, Headmaster sign, Teacher sign, Signature)
  if (line.includes("teacher sign") || line.includes("headmaster sign") || line.includes("head master sign")) return true;
  if (line.includes("class teacher sign") || line.includes("principal sign")) return true;
  if (line.includes("teacher signature") || line.includes("headmaster signature") || line.includes("head master signature")) return true;
  if (line.includes("signature") || lineNoSpace.includes("teachersign") || lineNoSpace.includes("headmastersign")) return true;

  return false;
};

// Helper to check if a row is a Metadata Header Row (Class : 2 nd Available Period :, Sub : English Working days :, etc.)
export const isMetadataRow = (row: any[]): boolean => {
  if (!row || !Array.isArray(row) || row.length === 0) return false;
  const line = row.map((c) => String(c || "")).join(" ").trim().toLowerCase();
  if (!line) return false;

  const lineNoSpace = line.replace(/\s+/g, "");

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
    line.includes("कामाचे दिवस") ||
    line.includes("इयत्ता :") ||
    line.includes("विषय :") ||
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
  const line = row.map((c) => String(c || "")).join(" ").trim().toLowerCase();
  if (!line) return false;

  // English Header Row matching
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
    line.includes("learning outcomes")
  ) {
    return true;
  }

  // Marathi Header Row matching
  if (
    (line.includes("दिनांक") || line.includes("दिवस") || line.includes("महिना") || line.includes("आठवडा") || line.includes("वार") || line.includes("day") || line.includes("date")) &&
    (line.includes("पाठ") || line.includes("घटक") || line.includes("अध्ययन") || line.includes("निष्पत्ती") || line.includes("साहित्य") || line.includes("साधन") || line.includes("मुद्दे") || line.includes("उद्देश") || line.includes("स्वरूप") || line.includes("तपशील"))
  ) {
    return true;
  }

  // Multi-keyword check: if 3 or more standard planning column keywords are in this row, it is a header row
  const headerKeywords = [
    "दिवस", "दिनांक", "पाठ", "घटक", "उपघटक", "अध्ययन", "निष्पत्ती",
    "मुद्दे", "उद्देश", "स्वरूप", "साधन", "तंत्रे", "साहित्य", "तपशील",
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

  // Number sequence row like [1, 2, 3, 4, 5, 6, 7] or [१, २, ३, ४, ५, ६, ७]
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
export function detectSubjectFromRow(row: string[], knownSubjects: string[]): string | null {
  const rowLine = (row || []).join(" ").trim();
  if (!rowLine) return null;

  // CRITICAL: A row that has a valid month in column 0 or column 1 is a DATA row, NEVER a subject header!
  const c0 = String(row[0] || "").trim();
  const c1 = String(row[1] || "").trim();
  if (isMarathiMonth(c0) || (/^\d+$/.test(c0) && isMarathiMonth(c1))) {
    return null;
  }

  // A row that is just exam or assessment is not a subject header
  if (isExamOrAssessmentText(rowLine)) {
    return null;
  }

  // 1. Look for explicit "विषय : <subject>" or "Subject:- <subject>" with colon or hyphen
  for (const cell of (row || [])) {
    const cStr = String(cell || "").trim();
    if (!cStr) continue;
    const match = cStr.match(/(?:^|\s)(?:विषय|subject)\s*[:\-–]\s*([^\n\r()|]{2,40})/i);
    if (match && match[1]) {
      const cand = match[1].trim();
      if (!cand.includes("विवरण") && !cand.includes("निष्पत्ती") && !cand.includes("तपशील") && cand.length < 35) {
        return cand;
      }
    }
  }

  const rowMatch = rowLine.match(/(?:^|\s)(?:विषय|subject)\s*[:\-–]\s*([^\n\r()|]{2,40})/i);
  if (rowMatch && rowMatch[1]) {
    const cand = rowMatch[1].trim();
    if (!cand.includes("विवरण") && !cand.includes("निष्पत्ती") && !cand.includes("तपशील") && cand.length < 35) {
      return cand;
    }
  }

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
  input: File | ArrayBuffer | Blob
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
    combinedRawGrid.push(...rawGrid);

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

      if (rawMonthCell && isMarathiMonth(rawMonthCell)) {
        const canon = canonicalizeMarathiMonth(rawMonthCell);
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

  const standardOrder = [
    "मराठी",
    "हिंदी",
    "इंग्रजी",
    "गणित",
    "परिसर अभ्यास भाग १",
    "परिसर अभ्यास भाग २",
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

  const monthlySections = splitRowsIntoMonthlySections(combinedRawGrid);

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
  "पाठ / घटक / उपघटक",
  "अध्ययन निष्पत्ती",
  "अध्ययन मुद्दे / पाठ्यांश उद्देश",
  "अध्ययन अनुभवाचे स्वरूप",
  "उपयोगात आणावयाची साधन तंत्रे",
  "आवश्यक साहित्य",
];

export function splitRowsIntoMonthlySections(rawRows: string[][]): Record<string, MonthlySection> {
  const monthlyMap: Record<string, MonthlySection> = {};

  let currentMonthName = "";
  let currentClassTitle = "";
  let currentSubjectTitle = "";
  let currentPlannedPeriods = "";
  let currentWorkingDays = "";
  let currentRows: string[][] = [];

  const flushCurrentMonth = () => {
    if (currentMonthName && currentRows.length > 0) {
      const normalizedMonthRows = normalizeMonthlyPlanningRows(currentRows, currentMonthName);
      monthlyMap[currentMonthName] = {
        monthName: currentMonthName,
        displayMonthName: `अभ्यासक्रमाचे मासिक व घटक नियोजन माहे - ${currentMonthName}`,
        classTitle: currentClassTitle,
        subjectTitle: currentSubjectTitle,
        plannedPeriods: currentPlannedPeriods,
        workingDays: currentWorkingDays,
        headers: DEFAULT_MONTHLY_HEADERS,
        rows: normalizedMonthRows,
      };
    }
  };

  rawRows.forEach((row) => {
    const line = (row || []).map((c) => String(c || "")).join(" ").trim();
    if (!line) return;

    // Check for Month Header Banner (Marathi or English):
    // e.g. "अभ्यासक्रमाचे मासिक व घटक नियोजन माहे - जुलै २०२६" OR "Monthly Planning Month: June 2026" OR "Month: June"
    const monthMatch = line.match(/(?:मासिक\s+व\s+घटक\s+नियोजन\s+माहे|माहे|month\s*[:\-–]?|monthly\s+planning\s*(?:month)?\s*[:\-–]?)\s*([^\n\r]+)/i);
    const marathiMonthMatch = line.match(/(जुन|जून|जुलै|ऑगस्ट|सप्टेंबर|सप्टें|ऑक्टोबर|ऑक्टो|नोव्हेंबर|नोव्हें|डिसेंबर|डिसे|जानेवारी|जाने|फेब्रुवारी|फेब्रु|मार्च|एप्रिल|मे)(?:\s*\d{4}[-–]?\d{0,4})?/i);
    const englishMonthMatch = line.match(/(June|July|August|September|Sept|October|Oct|November|Nov|December|Dec|January|Jan|February|Feb|March|Mar|April|Apr|May)(?:\s*\d{4}[-–]?\d{0,4})?/i);

    if (
      (monthMatch && monthMatch[1]) ||
      (line.length < 40 && (marathiMonthMatch || englishMonthMatch) && (line.toLowerCase().includes("month") || line.includes("माहे") || line.includes("नियोजन")))
    ) {
      flushCurrentMonth();
      let rawMonth = monthMatch && monthMatch[1] ? monthMatch[1].replace(/^[-\s–:]+/, "").trim() : line.trim();
      const cleanMar = rawMonth.match(/(जुन|जून|जुलै|ऑगस्ट|सप्टेंबर|सप्टें|ऑक्टोबर|ऑक्टो|नोव्हेंबर|नोव्हें|डिसेंबर|डिसे|जानेवारी|जाने|फेब्रुवारी|फेब्रु|मार्च|एप्रिल|मे)(?:\s*\d{4}[-–]?\d{0,4})?/i);
      const cleanEng = rawMonth.match(/(June|July|August|September|Sept|October|Oct|November|Nov|December|Dec|January|Jan|February|Feb|March|Mar|April|Apr|May)(?:\s*\d{4}[-–]?\d{0,4})?/i);

      if (cleanMar) {
        currentMonthName = cleanMar[0].trim();
      } else if (cleanEng) {
        currentMonthName = cleanEng[0].trim();
      } else {
        currentMonthName = rawMonth.split(/\s+अभ्यासक्रमाचे|\s+मासिक|\s+विषय|\s+monthly/i)[0].trim() || rawMonth;
      }
      currentRows = [];
      return;
    }

    // Check for Metadata Header: "Class : 2 nd Available Period :" or "Sub : English Working days :"
    if (isMetadataRow(row)) {
      for (const cell of row) {
        const cStr = String(cell || "").trim();
        if (cStr.includes("इयत्ता") || cStr.toLowerCase().includes("class")) currentClassTitle = cStr;
        if (cStr.includes("विषय") || cStr.toLowerCase().includes("subject") || cStr.toLowerCase().includes("sub :")) currentSubjectTitle = cStr;
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

    // Regular Data Row: ensure 7 columns
    if (!currentMonthName) currentMonthName = "जून २०२६";

    // If row starts with April divider inside a March-April combined block
    const cell0 = String(row[0] || "").trim();
    if (
      (cell0.includes("एप्रिल") || cell0.toLowerCase().includes("april")) &&
      currentMonthName.includes("मार्च") &&
      currentRows.length > 0
    ) {
      flushCurrentMonth();
      currentMonthName = "एप्रिल २०२६";
      currentRows = [];
    }

    const r7 = normalizeMonthlyPlanningRow([
      String(row[0] || "").trim(), // दिनांक
      String(row[1] || "").trim(), // पाठ/घटक/उपघटक
      String(row[2] || "").trim(), // अध्ययन निष्पत्ती
      String(row[3] || "").trim(), // अध्ययन मुद्दे/पाठ्यांश उद्देश
      String(row[4] || "").trim(), // अध्ययन अनुभवाचे स्वरूप
      String(row[5] || "").trim(), // उपयोगात आणावयाची साधन तंत्रे
      String(row[6] || "").trim(), // आवश्यक साहित्य
    ]);

    const hasMeaningfulContent = r7.some((c) => {
      const s = c.trim();
      return s !== "" && s !== "-" && s !== "null" && s !== "undefined";
    });

    if (hasMeaningfulContent) {
      currentRows.push(r7);
    }
  });

  flushCurrentMonth();
  return monthlyMap;
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
 * Normalizes monthly planning rows to ensure contents are in their rightful columns:
 * 1. Never allows month names to appear in Col 0 (दिनांक).
 * 2. Detects and restores shifted columns (e.g. outcome in Col 1, tool in Col 2, material in Col 3).
 * 3. Moves misplaced "अध्ययन निष्पत्ती" text from Col 3 / Col 4 into Col 2.
 * 4. Moves lesson titles misplaced in Col 0 (Date) into Col 1.
 * 5. Removes duplicate teaching points from Col 1 (Lesson) to allow clean lesson row grouping.
 */
export function normalizeMonthlyPlanningRow(row: string[]): string[] {
  if (!row || row.length === 0) return row;
  const r7 = [
    String(row[0] || "").trim(), // 0: दिनांक
    String(row[1] || "").trim(), // 1: पाठ / घटक / उपघटक
    String(row[2] || "").trim(), // 2: अध्ययन निष्पत्ती
    String(row[3] || "").trim(), // 3: अध्ययन मुद्दे / पाठ्यांश उद्देश
    String(row[4] || "").trim(), // 4: अध्ययन अनुभवाचे स्वरूप
    String(row[5] || "").trim(), // 5: उपयोगात आणावयाची साधन तंत्रे
    String(row[6] || "").trim(), // 6: आवश्यक साहित्य
  ];

  let [c0, c1, c2, c3, c4, c5, c6] = r7;

  // 1. Month names in Col 0 (Date) should NEVER be displayed as a date value
  if (isMarathiMonth(c0) || /^(मार्च|एप्रिल|मे|जून|जुन|जुलै|ऑगस्ट|सप्टेंबर|ऑक्टोबर|ऑक्टोंबर|नोव्हेंबर|डिसेंबर|जानेवारी|फेब्रुवारी)$/i.test(c0)) {
    c0 = "-";
  }

  // 2. Check if lesson title was mistakenly placed in Col 0 (Date)
  // e.g. "दिवाळी (चित्रवर्णन) ९.३ / ९.३.२ / ९.४"
  const isDate =
    c0 === "" ||
    c0 === "-" ||
    /^[\d\s\-–,/ते]+$/.test(c0) ||
    /सप्ताह|आठवडा|दिवस|महिना/i.test(c0);

  if (!isDate && c0.length > 3 && !/इयत्ता|विषय|नियोजन|दिनांक|शिक्षक|मुख्याध्यापक|सुट्टी|सुट्ट्या/i.test(c0)) {
    if (!c1 || c1 === "-" || c1 === c3) {
      c1 = c0;
      c0 = "-";
    }
  }

  // 3. Detect and fix shifted rows where Col 1 is an outcome, Col 2 is a tool, Col 3 is material
  // e.g. [19, "साखरेपासून तयार होणाऱ्या पदार्थांची नावे सांगतात.", "निरीक्षण", "साखर पदार्थ", "", "", ""]
  const c1IsOutcome =
    /सांगतात|करतात|ओळखतात|दर्शवतात|वाचतात|लिहितात|शोधतात|दाखवतात|समजतात|अध्ययन\s*निष्पत्ती/i.test(c1) ||
    /^C-|^M-|^E-/i.test(c1);
  const c2IsTool = COMMON_TOOLS_LIST.some((t) => c2.includes(t));

  if ((c1IsOutcome || c2IsTool) && (!c4 || c4 === "-") && (!c5 || c5 === "-")) {
    c6 = c3 && c3 !== "-" ? c3 : c6;
    c5 = c2 && c2 !== "-" ? c2 : c5;
    c2 = c1.replace(/अध्ययन\s*निष्पत्ती\s*[:\-–]?/gi, "").trim();
    c1 = "";
    c3 = "-";
    c4 = "-";
  }

  // 4. Check if Col 1 is duplicate of Col 3 (teaching point mistakenly placed into lesson column)
  if (c1 && c3 && c1 === c3 && c1.length < 25 && !/स्वागत|पूर्वतयारी|उजळणी|सराव|चाचणी|मूल्यमापन|परीक्षा/i.test(c1)) {
    c1 = "";
  }

  // 5. Fix misplaced "अध्ययन निष्पत्ती" (Learning Outcomes)
  // Teacher put "अध्ययन निष्पत्ती" label into Col 3 and the actual outcome text into Col 4
  if (/अध्ययन\s*निष्पत्ती|निष्पती/i.test(c3)) {
    const outcomeText = c4 && c4 !== "-" ? c4 : c3.replace(/अध्ययन\s*निष्पत्ती\s*[:\-–]?/gi, "").trim();
    if (outcomeText) {
      if (!c2 || c2 === "-") {
        c2 = outcomeText;
      } else if (!c2.includes(outcomeText)) {
        c2 = `${c2}\n${outcomeText}`;
      }
    }
    c3 = "-";
    if (c4 === outcomeText) {
      c4 = "-";
    }
  }

  // If Col 4 has "अध्ययन निष्पत्ती" label
  if (/अध्ययन\s*निष्पत्ती|निष्पती/i.test(c4)) {
    const cleanText = c4.replace(/अध्ययन\s*निष्पत्ती\s*[:\-–]?/gi, "").trim();
    if (cleanText) {
      if (!c2 || c2 === "-") {
        c2 = cleanText;
      } else if (!c2.includes(cleanText)) {
        c2 = `${c2}\n${cleanText}`;
      }
    }
    c4 = "-";
  }

  // If Col 1 has "अध्ययन निष्पत्ती" label
  if (/अध्ययन\s*निष्पत्ती|निष्पती/i.test(c1)) {
    const cleanText = c1.replace(/अध्ययन\s*निष्पत्ती\s*[:\-–]?/gi, "").trim();
    if (cleanText && (!c2 || c2 === "-")) {
      c2 = cleanText;
    }
    c1 = "";
  }

  // Clean label from Col 2 if present
  if (c2 && /अध्ययन\s*निष्पत्ती\s*[:\-–]?/i.test(c2)) {
    const cleaned = c2.replace(/अध्ययन\s*निष्पत्ती\s*[:\-–]?/gi, "").trim();
    if (cleaned) c2 = cleaned;
  }

  return [c0, c1, c2, c3, c4, c5, c6];
}

/**
 * Normalizes an array of monthly planning rows:
 * 1. Normalizes each individual row.
 * 2. If the month has NO dates (or almost no dates, e.g. March/April where Excel had only month text or hyphens),
 *    auto-populates sequential school working dates for that month.
 * 3. Aligns lesson-level outcomes: if a lesson block has an outcome on its last row
 *    and no outcome on its first row, promotes it to the start row so it spans the entire lesson.
 */
export function normalizeMonthlyPlanningRows(rows: string[][], monthName: string = "मार्च २०२६"): string[][] {
  const normalized = rows.map((r) => normalizeMonthlyPlanningRow(r));

  // Use days strictly as per Excel - no synthetic date generation logic

  let i = 0;
  while (i < normalized.length) {
    const lessonTitle = normalized[i][1]?.trim();
    if (lessonTitle && lessonTitle !== "-") {
      let j = i + 1;
      while (j < normalized.length && (!normalized[j][1] || normalized[j][1] === "-")) {
        j++;
      }

      // If the lesson start row doesn't have an outcome, look for one inside this lesson block
      if (!normalized[i][2] || normalized[i][2] === "-") {
        for (let k = i + 1; k < j; k++) {
          if (normalized[k][2] && normalized[k][2] !== "-") {
            normalized[i][2] = normalized[k][2];
            normalized[k][2] = "";
            break;
          }
        }
      }

      i = j;
    } else {
      i++;
    }
  }

  return normalized;
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

  return rows.map((row) => {
    const r6 = [
      String(row[0] || "").trim(),
      String(row[1] || "").trim(),
      String(row[2] || "").trim(),
      String(row[3] || "").trim(),
      String(row[4] || "").trim(),
      String(row[5] || "").trim(),
    ];

    let [m, w, d, p, topic, outcome] = r6;

    // Check if col 0 has exam text mistakenly
    if (isExamOrAssessmentText(m)) {
      if (!topic) topic = m;
      m = "";
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
