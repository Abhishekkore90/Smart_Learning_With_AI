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

const MARATHI_MONTHS = [
  "जून",
  "जुलै",
  "ऑगस्ट",
  "सप्टेंबर",
  "ऑक्टोबर",
  "ऑक्टोंबर",
  "नोव्हेंबर",
  "डिसेंबर",
  "जानेवारी",
  "फेब्रुवारी",
  "मार्च",
  "एप्रिल",
  "मे",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  "January",
  "February",
  "March",
  "April",
];

export function isMarathiMonth(cellText: string): boolean {
  if (!cellText) return false;
  const clean = cellText.trim().toLowerCase();
  return MARATHI_MONTHS.some((m) => clean.includes(m.toLowerCase()));
}

export function normalizeSubjectName(rawName: string): string {
  if (!rawName) return "सामान्य";
  const clean = rawName.trim();

  if (clean.includes("गणित") || clean.toLowerCase().includes("math")) return "गणित";
  if (clean.includes("मराठी")) return "मराठी";
  if (clean.includes("हिंदी") || clean.toLowerCase().includes("hindi")) return "हिंदी";
  if (clean.includes("इंग्रजी") || clean.toLowerCase().includes("english")) return "इंग्रजी";

  if (
    clean.includes("कला") ||
    clean.includes("शिकू") ||
    clean.includes("आ जाण")
  )
    return "कलाशिक्षण";

  if (
    clean.includes("कार्य") ||
    clean.includes("करू") ||
    clean.includes("ब जाण")
  )
    return "कार्यशिक्षण";

  if (
    clean.includes("शारीरिक") ||
    clean.includes("निरामयता") ||
    clean.includes("क्रीडा") ||
    clean.includes("क जाण") ||
    clean.includes("आरोग्य") ||
    clean.toLowerCase().includes("pe") ||
    clean.includes("health")
  )
    return "शारीरिक शिक्षण";

  if (
    clean.includes("परिसर")
  )
    return "परिसर अभ्यास";

  if (
    clean.includes("विज्ञान") ||
    clean.toLowerCase().includes("science")
  )
    return "विज्ञान";

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

  if (line.includes("स्वाक्षरी") || line.includes("शिक्का")) return true;
  if (line.includes("वर्ग शिक्षक") && line.includes("मुख्याध्यापक")) return true;
  if (line.includes("विषय /") && line.includes("शिक्षक")) return true;
  if (line.includes("शिक्षक") && line.includes("मुख्याध्यापक")) return true;
  if (lineNoSpace.includes("वर्गशिक्षक") || lineNoSpace.includes("मुख्याध्यापक")) return true;

  return false;
};

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
    "मराठी",
    "गणित",
    "इंग्रजी",
    "कलाशिक्षण",
    "कार्यशिक्षण",
    "शारीरिक शिक्षण",
    "परिसर अभ्यास",
    "विज्ञान",
    "सामाजिक शास्त्रे",
    "English",
    "Maths",
    "Science",
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

      const subjMatch = rowLine.match(
        /(?:विषय|subject)\s*[:\-–]?\s*([^\s\|()\d]+(?:\s+[^\s\|()\d]+)*)/i
      );

      let detectedSubjText: string | null = null;
      if (subjMatch && subjMatch[1]) {
        const matchClean = subjMatch[1].trim();
        if (
          !matchClean.includes("विवरण") &&
          !matchClean.includes("निष्पत्ती") &&
          !matchClean.includes("निष्पती")
        ) {
          detectedSubjText = matchClean;
        }
      }

      if (!detectedSubjText) {
        const found = KNOWN_SUBJECTS.find(
          (sName) =>
            rowLine.startsWith(`विषय : ${sName}`) ||
            rowLine.startsWith(`विषय:${sName}`) ||
            rowLine.startsWith(`विषय-${sName}`) ||
            rowLine === sName ||
            (rowLine.includes(sName) && (rowLine.includes("विषय") || rowLine.length < 35))
        );
        if (found) {
          detectedSubjText = found;
        }
      }

      const isColumnHeader = rowLine.includes("महिना") && rowLine.includes("आठवडा");

      if (detectedSubjText) {
        const normalizedKey = normalizeSubjectName(detectedSubjText);
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
        rowLine.includes("इयत्ता :")
      ) {
        return;
      }

      if (!currentSubjKey) {
        currentSubjKey = hasSheetSubjectName ? sheetSubjNormalized : "मराठी";
        currentSubjDisplay = `विषय : ${currentSubjKey}`;
      }

      const monthCell = String(row[0] || "").trim();
      const topicCell = String(row[4] !== undefined && row[4] !== null ? row[4] : "").trim();
      const outcomeCell = String(row[5] !== undefined && row[5] !== null ? row[5] : "").trim();

      if (monthCell && isMarathiMonth(monthCell)) {
        lastMonth = monthCell;
        lastWeeks = String(row[1] || lastWeeks);
        lastWorkingDays = String(row[2] || lastWorkingDays);
        lastPeriods = String(row[3] || lastPeriods);
        currentSubjectRows.push([
          monthCell,
          lastWeeks,
          lastWorkingDays,
          lastPeriods,
          topicCell,
          outcomeCell,
        ]);
      } else if (topicCell || outcomeCell) {
        if (currentSubjectRows.length > 0) {
          const lastRow = currentSubjectRows[currentSubjectRows.length - 1];
          if (topicCell) lastRow[4] += (lastRow[4] ? "\n" : "") + topicCell;
          if (outcomeCell) lastRow[5] += (lastRow[5] ? "\n" : "") + outcomeCell;
        }
      }
    });

    flushCurrentSubject(rawGrid.length - 1);
  });

  const standardOrder = [
    "मराठी",
    "हिंदी",
    "इंग्रजी",
    "गणित",
    "विज्ञान",
    "परिसर अभ्यास",
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
    "मराठी",
    "हिंदी",
    "इंग्रजी",
    "गणित",
    "विज्ञान",
    "परिसर अभ्यास",
    "सामाजिक शास्त्रे",
    "कलाशिक्षण",
    "कार्यशिक्षण",
    "शारीरिक शिक्षण",
    "English",
    "Maths",
    "Science",
    "Hindi",
    "Social Science",
  ];

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

    let detectedSubjText: string | null = null;
    for (const c of (row || [])) {
      if (!c) continue;
      const cStr = String(c).trim();
      const m = cStr.match(/(?:विषय|subject)\s*[:\-–]?\s*([^\s\|()\d]+(?:\s+[^\s\|()\d]+)*)/i);
      if (m && m[1]) {
        const cleanVal = m[1].trim();
        if (
          !cleanVal.includes("विवरण") &&
          !cleanVal.includes("निष्पत्ती") &&
          !cleanVal.includes("निष्पती") &&
          !cleanVal.includes("नावा") &&
          cleanVal.length < 30
        ) {
          detectedSubjText = cleanVal;
          break;
        }
      }
      const known = KNOWN_SUBJECTS.find(
        (s) => cStr === s || cStr === `विषय : ${s}` || cStr === `विषय:${s}`
      );
      if (known) {
        detectedSubjText = known;
        break;
      }
    }

    if (!detectedSubjText) {
      const subjMatch = rowLine.match(
        /(?:विषय|subject)\s*[:\-–]?\s*([^\s\|()\d]+(?:\s+[^\s\|()\d]+)*)/i
      );
      if (subjMatch && subjMatch[1]) {
        const matchClean = subjMatch[1].trim();
        if (
          !matchClean.includes("विवरण") &&
          !matchClean.includes("निष्पत्ती") &&
          !matchClean.includes("निष्पती") &&
          matchClean.length < 30
        ) {
          detectedSubjText = matchClean;
        }
      }
    }

    const isColumnHeader = rowLine.includes("महिना") && rowLine.includes("आठवडा");

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
      rowLine.includes("शिक्षक स्वाक्षरी") ||
      rowLine.includes("मुख्याध्यापक स्वाक्षरी") ||
      rowLine.includes("वार्षिक नियोजन") ||
      rowLine.includes("इयत्ता :")
    ) {
      return;
    }

    if (!currentSubjKey) {
      currentSubjKey = normalizeSubjectName(fallbackSubject);
      currentSubjDisplay = `विषय : ${currentSubjKey}`;
    }

    const monthCell = String(row[0] || "").trim();
    const topicCell = String(row[4] !== undefined && row[4] !== null ? row[4] : "").trim();
    const outcomeCell = String(row[5] !== undefined && row[5] !== null ? row[5] : "").trim();

    if (monthCell && isMarathiMonth(monthCell)) {
      lastMonth = monthCell;
      lastWeeks = String(row[1] || lastWeeks);
      lastWorkingDays = String(row[2] || lastWorkingDays);
      lastPeriods = String(row[3] || lastPeriods);
      currentSubjectRows.push([
        monthCell,
        lastWeeks,
        lastWorkingDays,
        lastPeriods,
        topicCell,
        outcomeCell,
      ]);
    } else if (topicCell || outcomeCell) {
      if (currentSubjectRows.length > 0) {
        const lastRow = currentSubjectRows[currentSubjectRows.length - 1];
        if (topicCell) lastRow[4] += (lastRow[4] ? "\n" : "") + topicCell;
        if (outcomeCell) lastRow[5] += (lastRow[5] ? "\n" : "") + outcomeCell;
      }
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
  "दिनांक",
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
      monthlyMap[currentMonthName] = {
        monthName: currentMonthName,
        displayMonthName: `अभ्यासक्रमाचे मासिक व घटक नियोजन माहे - ${currentMonthName}`,
        classTitle: currentClassTitle,
        subjectTitle: currentSubjectTitle,
        plannedPeriods: currentPlannedPeriods,
        workingDays: currentWorkingDays,
        headers: DEFAULT_MONTHLY_HEADERS,
        rows: currentRows,
      };
    }
  };

  rawRows.forEach((row) => {
    const line = (row || []).map((c) => String(c || "")).join(" ").trim();
    if (!line) return;

    // Check for Month Header Banner: "अभ्यासक्रमाचे मासिक व घटक नियोजन माहे - जुलै २०२६"
    const monthMatch = line.match(/(?:मासिक\s+व\s+घटक\s+नियोजन\s+माहे|माहे)\s*[:\-–]?\s*([^\n\r]+)/i);
    if (monthMatch && monthMatch[1]) {
      flushCurrentMonth();
      let rawMonth = monthMatch[1].replace(/^[-\s–:]+/, "").trim();
      const cleanMonthMatch = rawMonth.match(/(जुन|जून|जुलै|ऑगस्ट|सप्टेंबर|सप्टें|ऑक्टोबर|ऑक्टो|नोव्हेंबर|नोव्हें|डिसेंबर|डिसे|जानेवारी|जाने|फेब्रुवारी|फेब्रु|मार्च|एप्रिल|मे)(?:\s*\d{4}[-–]?\d{0,4})?/i);
      if (cleanMonthMatch) {
        currentMonthName = cleanMonthMatch[0].trim();
      } else {
        currentMonthName = rawMonth.split(/\s+अभ्यासक्रमाचे|\s+मासिक|\s+विषय/i)[0].trim() || rawMonth;
      }
      currentRows = [];
      return;
    }

    // Check for Metadata Header: "इयत्ता : दुसरी ... नियोजित तासिका : 25"
    if (line.includes("इयत्ता :") || line.includes("विषय :") || line.includes("कामाचे दिवस")) {
      for (const cell of row) {
        const cStr = String(cell || "").trim();
        if (cStr.includes("इयत्ता")) currentClassTitle = cStr;
        if (cStr.includes("विषय")) currentSubjectTitle = cStr;
        if (cStr.includes("तासिका")) currentPlannedPeriods = cStr;
        if (cStr.includes("कामाचे दिवस")) currentWorkingDays = cStr;
      }
      return;
    }

    // Skip table column headers row
    if (line.includes("दिनांक") && (line.includes("पाठ") || line.includes("घटक") || line.includes("साहित्य"))) {
      return;
    }

    // Skip signatures
    if (isSignatureRow(row)) {
      return;
    }

    // Regular Data Row: ensure 7 columns
    if (!currentMonthName) currentMonthName = "जून २०२६";

    const r7 = [
      String(row[0] || "").trim(), // दिनांक
      String(row[1] || "").trim(), // पाठ/घटक/उपघटक
      String(row[2] || "").trim(), // अध्ययन निष्पत्ती
      String(row[3] || "").trim(), // अध्ययन मुद्दे/पाठ्यांश उद्देश
      String(row[4] || "").trim(), // अध्ययन अनुभवाचे स्वरूप
      String(row[5] || "").trim(), // उपयोगात आणावयाची साधन तंत्रे
      String(row[6] || "").trim(), // आवश्यक साहित्य
    ];

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

