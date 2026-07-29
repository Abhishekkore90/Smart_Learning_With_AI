import * as pdfjsLib from "pdfjs-dist";
import { PlanningTableRow } from "@/components/teacher/AcademicPlanningSystem";

// Initialize Worker for pdfjs-dist
if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "4.10.38"}/pdf.worker.min.mjs`;
}

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
 * Extracts structured table rows from an uploaded PDF file using pdfjs-dist.
 */
export async function extractTableRowsFromPdf(file: File): Promise<PlanningTableRow[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
    });

    const pdfDoc = await loadingTask.promise;
    const extractedLines: string[] = [];

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();

      let currentLine = "";
      let lastY: number | null = null;

      for (const item of textContent.items as any[]) {
        if (!item.str || !item.str.trim()) continue;
        const y = Math.round(item.transform ? item.transform[5] : 0);

        if (lastY !== null && Math.abs(y - lastY) > 5) {
          if (currentLine.trim()) extractedLines.push(currentLine.trim());
          currentLine = item.str;
        } else {
          currentLine += (currentLine ? " " : "") + item.str;
        }
        lastY = y;
      }
      if (currentLine.trim()) extractedLines.push(currentLine.trim());
    }

    console.log("PDF Extracted Lines Count:", extractedLines.length);

    // Build structured rows from extracted lines
    const parsedRows: PlanningTableRow[] = [];
    let currentMonth = "";
    let currentSubject = "मराठी";
    let currentTopics: string[] = [];
    let currentOutcomes: string[] = [];
    let weeks = "4";
    let workingDays = "20";
    let periods = "50";

    for (const line of extractedLines) {
      // Check if line contains a month
      const foundMonth = MARATHI_MONTHS.find((m) => line.includes(m));
      const foundSubject = KNOWN_SUBJECTS.find((s) => line.includes(s));

      if (foundSubject) {
        currentSubject = foundSubject;
      }

      if (foundMonth) {
        // Push previous row if exists
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

        // Try extracting numbers from line
        const numbers = line.match(/\d+/g);
        if (numbers && numbers.length >= 3) {
          weeks = numbers[0];
          workingDays = numbers[1];
          periods = numbers[2];
        }
        continue;
      }

      // Collect topics & outcomes text
      if (line.includes("निष्पत्ती") || line.includes("साध्य") || line.includes("कौशल्य")) {
        currentOutcomes.push(line);
      } else if (line.length > 2 && !line.startsWith("इयत्ता") && !line.startsWith("वर्ष")) {
        currentTopics.push(line);
      }
    }

    // Flush last row
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

    if (parsedRows.length > 0) {
      return parsedRows;
    }
  } catch (err) {
    console.warn("PDF Auto-Extraction notice (using smart fallback):", err);
  }

  // Fallback if PDF text stream couldn't be parsed into rows
  return [];
}
