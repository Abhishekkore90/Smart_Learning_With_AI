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
  if (clean.includes("इंग्रजी") || clean.toLowerCase().includes("english")) return "इंग्रजी";
  if (clean.includes("कला") || clean.includes("शिकू")) return "कलाशिक्षण";
  if (clean.includes("कार्य") || clean.includes("करू")) return "कार्यशिक्षण";
  if (
    clean.includes("शारीरिक") ||
    clean.includes("निरामयता") ||
    clean.includes("क्रीडा") ||
    clean.toLowerCase().includes("pe") ||
    clean.includes("health")
  )
    return "शारीरिक शिक्षण";
  if (
    clean.includes("परिसर") ||
    clean.includes("विज्ञान") ||
    clean.toLowerCase().includes("science") ||
    clean.includes("सामाजिक")
  )
    return "परिसर अभ्यास";

  return clean.replace(/^(?:विषय|subject)\s*[:\-–]?\s*/i, "").trim();
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
        rowLine.includes("शिक्षक स्वाक्षरी") ||
        rowLine.includes("मुख्याध्यापक स्वाक्षरी") ||
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
      const topicCell = String(row[4] || row[3] || "").trim();
      const outcomeCell = String(row[5] || row[4] || row[2] || "").trim();

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
    "गणित",
    "इंग्रजी",
    "कलाशिक्षण",
    "कार्यशिक्षण",
    "शारीरिक शिक्षण",
    "परिसर अभ्यास",
  ];
  allSubjectNames.sort((a, b) => {
    const idxA = standardOrder.indexOf(a);
    const idxB = standardOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  return {
    classTitle,
    academicYear,
    subjects: subjectsMap,
    allSubjectNames,
    rawGrid: combinedRawGrid,
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
    const topicCell = String(row[4] || row[3] || "").trim();
    const outcomeCell = String(row[5] || row[4] || row[2] || "").trim();

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
