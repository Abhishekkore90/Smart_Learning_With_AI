import { UniversalFileReader } from "@/services/fileReader";
import { PlanningTableRow } from "@/components/teacher/AcademicPlanningSystem";

const MARATHI_MONTHS = [
  "जून",
  "जुलै",
  "ऑगस्ट",
  "सप्टेंबर",
  "ऑक्टोबर",
  "नोव्हेंबर",
  "डिसेंबर",
  "जानेवारी",
  "फेब्रुवारी",
  "मार्च",
  "एप्रिल",
  "जून - जुलै",
  "ऑगस्ट - सप्टें",
  "ऑक्टोबर - नोव्हें",
  "डिसें - एप्रिल",
  "वार्षिक उपक्रम",
];

const KNOWN_SUBJECTS = ["मराठी", "गणित", "इंग्रजी", "परिसर अभ्यास", "विज्ञान", "कला / क्रीडा", "शारीरिक शिक्षण"];

/**
 * Extracts structured table rows from an uploaded PDF file using UniversalFileReader service.
 */
export async function extractTableRowsFromPdf(file: File): Promise<PlanningTableRow[]> {
  try {
    const result = await UniversalFileReader.readFile(file);
    if (!result.success || !result.text) {
      console.warn("PDF extraction notice:", result.errors[0]?.message);
      return [];
    }

    const extractedLines = result.text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("--- Page"));

    const parsedRows: PlanningTableRow[] = [];
    let currentMonth = "";
    let currentSubject = "मराठी";
    let currentTopics: string[] = [];
    let currentOutcomes: string[] = [];
    let weeks = "4";
    let workingDays = "20";
    let periods = "50";

    for (const line of extractedLines) {
      const foundMonth = MARATHI_MONTHS.find((m) => line.includes(m));
      const foundSubject = KNOWN_SUBJECTS.find((s) => line.includes(s));

      if (foundSubject) {
        currentSubject = foundSubject;
      }

      if (foundMonth) {
        if (currentMonth && (currentTopics.length > 0 || currentOutcomes.length > 0)) {
          parsedRows.push({
            id: `extracted-${Date.now()}-${parsedRows.length}`,
            month: currentMonth,
            subject: currentSubject,
            weeks,
            workingDays,
            periods,
            topics: currentTopics.join("\n"),
            outcomes: currentOutcomes.join("\n"),
          });
          currentTopics = [];
          currentOutcomes = [];
        }

        currentMonth = foundMonth;
        const numbers = line.match(/\d+/g);
        if (numbers && numbers.length >= 3) {
          weeks = numbers[0];
          workingDays = numbers[1];
          periods = numbers[2];
        }
        continue;
      }

      const trimmedLine = line.trim();
      const isHeaderLabel =
        trimmedLine === "अध्ययन निष्पत्ती" ||
        trimmedLine === "अध्ययन निष्पती" ||
        trimmedLine === "अध्ययन निष्पत्ति" ||
        trimmedLine === "अध्ययन निष्पत्ती:" ||
        trimmedLine === "अध्ययन निष्पती:";

      if (!isHeaderLabel && (line.includes("निष्पत्ती") || line.includes("साध्य") || line.includes("कौशल्य"))) {
        currentOutcomes.push(line);
      } else if (!isHeaderLabel && line.length > 2 && !line.startsWith("इयत्ता") && !line.startsWith("वर्ष")) {
        currentTopics.push(line);
      }
    }

    if (currentMonth && (currentTopics.length > 0 || currentOutcomes.length > 0)) {
      parsedRows.push({
        id: `extracted-${Date.now()}-${parsedRows.length}`,
        month: currentMonth,
        subject: currentSubject,
        weeks,
        workingDays,
        periods,
        topics: currentTopics.join("\n"),
        outcomes: currentOutcomes.join("\n"),
      });
    }

    return parsedRows;
  } catch (err) {
    console.warn("PDF Extraction notice:", err);
    return [];
  }
}
