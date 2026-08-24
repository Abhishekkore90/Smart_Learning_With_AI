import { UniversalFileReader } from "@/services/fileReader";
import { parseExcelFile } from "@/lib/tableParser";

export type PlanningCategory = "varshik_niyojan" | "masik_niyojan" | "prashnapedhi";

export interface PlanningHeaderMetadata {
  title: string;
  planned_periods: string;
  working_days: string;
  academic_year: string;
  class_display: string;
  subject_display: string;
}

export interface PlanningDocumentRecord {
  id: string;
  category?: PlanningCategory;
  classId?: string; // "1" to "8"
  subjectId?: string; // "मराठी", "इंग्रजी", "गणित", etc.
  month?: string; // e.g. "जून २०२६"
  metadata?: PlanningHeaderMetadata;
  headers?: string[];
  rows?: string[][];
  fileName?: string;
  fileUrl?: string;
  uploadedAt?: string;
  uploadedBy?: string;
  planningType?: "annual" | "monthly" | "question_bank";
  gridData?: any[][];
  htmlContent?: string;
  rawDataRows?: string[][];
  tableRows?: any[];
  isCustomUserEdit?: boolean;
  editedByUserId?: string;
  editedAt?: string;
}

export const DEFAULT_HEADERS: Record<PlanningCategory, string[]> = {
  varshik_niyojan: [
    "महिना",
    "आठवडा",
    "कामाचे दिवस",
    "प्राप्त तासिका",
    "पाठ / घटक / विषयाचे नाव",
    "अध्ययन निष्पत्ती",
  ],
  masik_niyojan: [
    "दिनांक / दिवस",
    "पाठ / घटक / उपघटक",
    "अध्ययन निष्पत्ती",
    "अध्ययन अनुभवाचे स्वरूप",
    "उपयोगात आणावयाची साधन तंत्रे",
    "आवश्यक साहित्य",
  ],
  prashnapedhi: [
    "प्रश्न प्रकार",
    "घटक / उपघटक",
    "गुण",
    "प्रश्न मजकूर",
    "उत्तर / मुद्दे",
  ],
};

const MARATHI_CLASS_NAMES: Record<string, string> = {
  "1": "इयत्ता पहिली",
  "2": "इयत्ता दुसरी",
  "3": "इयत्ता तिसरी",
  "4": "इयत्ता चौथी",
  "5": "इयत्ता पाचवी",
  "6": "इयत्ता सहावी",
  "7": "इयत्ता सातवी",
  "8": "इयत्ता आठवी",
  "Class 1": "इयत्ता पहिली",
  "Class 2": "इयत्ता दुसरी",
  "Class 3": "इयत्ता तिसरी",
  "Class 4": "इयत्ता चौथी",
  "Class 5": "इयत्ता पाचवी",
  "Class 6": "इयत्ता सहावी",
  "Class 7": "इयत्ता सातवी",
  "Class 8": "इयत्ता आठवी",
};

/**
 * Extracts metadata (Title, Planned Periods, Working Days) from top rows of uploaded sheet
 */
export function extractHeaderMetadata(
  dataRows: string[][],
  category: PlanningCategory,
  classId: string,
  subjectId: string,
  month?: string
): PlanningHeaderMetadata {
  let title = "";
  let planned_periods = "";
  let working_days = "";
  let academic_year = "२०२६-२७";

  const class_display = MARATHI_CLASS_NAMES[classId] || `इयत्ता ${classId}`;
  const subject_display = subjectId === "all" ? "सर्व विषय" : subjectId;

  // Scan top 15 rows for header metadata
  for (let r = 0; r < Math.min(dataRows.length, 15); r++) {
    const rowStr = (dataRows[r] || []).join(" ").trim();
    if (!rowStr) continue;

    // Title Banner Detection
    if (
      !title &&
      (rowStr.includes("अभ्यासक्रमाचे") ||
        rowStr.includes("वार्षिक नियोजन") ||
        rowStr.includes("मासिक") ||
        rowStr.includes("प्रश्नपेढी") ||
        rowStr.includes("नियोजन"))
    ) {
      title = rowStr.replace(/\s+/g, " ");
    }

    // Academic Year
    if (rowStr.includes("सन") || rowStr.includes("२०२६")) {
      const match = rowStr.match(/(सन\s*[:-]?\s*\d{4}[-–]\d{2,4})/i);
      if (match) academic_year = match[1];
    }

    // Planned Periods & Working Days
    for (const cell of dataRows[r] || []) {
      if (!cell) continue;
      const cleanCell = String(cell).trim();

      if (cleanCell.includes("तासिका") || cleanCell.includes("नियोजित तासिका")) {
        const numMatch = cleanCell.match(/\d+/);
        if (numMatch) planned_periods = numMatch[0];
      }

      if (cleanCell.includes("कामाचे दिवस") || cleanCell.includes("दिवस")) {
        const numMatch = cleanCell.match(/\d+/);
        if (numMatch) working_days = numMatch[0];
      }
    }
  }

  if (!title) {
    if (category === "varshik_niyojan") {
      title = `${class_display} संपूर्ण वार्षिक नियोजन सन ${academic_year}`;
    } else if (category === "masik_niyojan") {
      title = `अभ्यासक्रमाचे मासिक व घटक नियोजन ${month ? `माहे - ${month}` : ""} सन ${academic_year}`;
    } else {
      title = `इयत्ता ${classId} विषय ${subject_display} प्रश्नपेढी संच सन ${academic_year}`;
    }
  }

  return {
    title,
    planned_periods: planned_periods || "33",
    working_days: working_days || "13",
    academic_year,
    class_display,
    subject_display,
  };
}

/**
 * Smart Excel Parser Engine: Converts uploaded file into standard PlanningDocumentRecord JSON structure
 */
export async function parsePlanningExcelFile(
  file: File,
  category: PlanningCategory,
  classId: string,
  subjectId: string,
  month?: string
): Promise<PlanningDocumentRecord> {
  const excelResult = await parseExcelFile(file);

  const rawDataRows: string[][] = excelResult.gridData.map((row) =>
    row.map((cell) => cell.value || "")
  );

  const metadata = extractHeaderMetadata(rawDataRows, category, classId, subjectId, month);

  let headers = DEFAULT_HEADERS[category];
  if (excelResult.rawHeaders && excelResult.rawHeaders.length >= 4) {
    headers = excelResult.rawHeaders.map((h, i) => h.trim() || DEFAULT_HEADERS[category][i] || `स्तंभ ${i + 1}`);
  }

  const cleanRows: string[][] = [];
  rawDataRows.forEach((row) => {
    const rowText = row.join(" ").trim();
    if (!rowText) return;
    if (
      rowText.includes("इयत्ता :") ||
      rowText.includes("अभ्यासक्रमाचे मासिक") ||
      rowText.includes("वर्ग शिक्षक") ||
      rowText.includes("मुख्याध्यापक")
    ) {
      return;
    }

    const normalizedRow: string[] = [];
    for (let c = 0; c < headers.length; c++) {
      normalizedRow.push((row[c] || "").trim());
    }

    if (normalizedRow.some((cell) => cell !== "")) {
      cleanRows.push(normalizedRow);
    }
  });

  const recordId = `${category}_${classId}_${subjectId}_${month ? month.replace(/\s+/g, "_") : "annual"}_${Date.now()}`;

  return {
    id: recordId,
    category,
    classId,
    subjectId,
    month,
    metadata,
    headers,
    rows: cleanRows,
    fileName: file.name,
    uploadedAt: new Date().toISOString(),
    gridData: excelResult.gridData,
    htmlContent: excelResult.htmlContent,
  };
}
