/**
 * parse-diary-file.ts
 * 
 * Utility to extract text from PDF/DOCX files and parse it into
 * the teaching diary structure used by teacher.teaching-record.tsx
 */

// ─── Types ───
export interface ParsedPeriod {
  period: string;
  class: string;
  subject: string;
  topic: string;
  experience: string;
  tools: string;
  materials: string;
  outcome: string;
}

export interface ParsedDiaryContent {
  date: string;
  day: string;
  thought: string;
  dinvishesh: string;
  highlights: string;
  periods: ParsedPeriod[];
}

// ─── Text Extraction ───

/**
 * Extract text from a PDF file using pdf.js
 */
async function extractTextFromPDF(base64Data: string): Promise<string> {
  try {
    // Dynamic import for pdfjs-dist
    const pdfjsLib = await import("pdfjs-dist");
    
    // Set worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

    // Convert base64 to ArrayBuffer
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const textParts: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      textParts.push(pageText);
    }

    return textParts.join("\n");
  } catch (err) {
    console.error("PDF extraction error:", err);
    return "";
  }
}

/**
 * Extract text from a DOCX file using mammoth
 */
async function extractTextFromDOCX(base64Data: string): Promise<string> {
  try {
    const mammoth = await import("mammoth");

    // Convert base64 to ArrayBuffer
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const result = await mammoth.extractRawText({
      arrayBuffer: bytes.buffer as ArrayBuffer,
    });

    return result.value;
  } catch (err) {
    console.error("DOCX extraction error:", err);
    return "";
  }
}

/**
 * Extract base64 data from a data URL
 */
function getBase64FromDataUrl(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex >= 0) {
    return dataUrl.substring(commaIndex + 1);
  }
  return dataUrl;
}

// ─── Text Parsing into Diary Structure ───

/**
 * Parse extracted raw text into the diary structure.
 * Tries multiple strategies to find period/lesson rows.
 */
function parseTextToDiary(rawText: string, className: string): ParsedDiaryContent {
  const lines = rawText.split(/\n/).map(l => l.trim()).filter(Boolean);
  const fullText = rawText;

  // ─── Extract date ───
  let date = "";
  const datePatterns = [
    /तारीख\s*[:：]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
    /Date\s*[:：]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
  ];
  for (const pattern of datePatterns) {
    const match = fullText.match(pattern);
    if (match) {
      date = match[1];
      break;
    }
  }

  // ─── Extract day ───
  let day = "";
  const dayPatterns = [
    /दिवस\s*[:：]?\s*(सोमवार|मंगळवार|बुधवार|गुरुवार|शुक्रवार|शनिवार|रविवार)/i,
    /Day\s*[:：]?\s*(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i,
  ];
  for (const pattern of dayPatterns) {
    const match = fullText.match(pattern);
    if (match) {
      day = match[1];
      break;
    }
  }

  // ─── Extract thought (suvichar) ───
  let thought = "";
  const thoughtPatterns = [
    /(?:सुविचार|आजचा सुविचार)\s*[:：]?\s*(.+?)(?:\n|$)/i,
    /(?:Thought|Today.?s Thought)\s*[:：]?\s*(.+?)(?:\n|$)/i,
  ];
  for (const pattern of thoughtPatterns) {
    const match = fullText.match(pattern);
    if (match) {
      thought = match[1].trim();
      break;
    }
  }

  // ─── Extract dinvishesh ───
  let dinvishesh = "";
  const dinvisheshPatterns = [
    /(?:दिनविशेष|आजचा दिनविशेष)\s*[:：]?\s*(.+?)(?:\n|$)/i,
    /(?:Day Special|Special Day)\s*[:：]?\s*(.+?)(?:\n|$)/i,
  ];
  for (const pattern of dinvisheshPatterns) {
    const match = fullText.match(pattern);
    if (match) {
      dinvishesh = match[1].trim();
      break;
    }
  }

  // ─── Extract highlights ───
  let highlights = "";
  const highlightsPatterns = [
    /(?:दिवसातील प्रमुख उपक्रम|प्रमुख उपक्रम)\s*[:：]?\s*(.+?)(?:\n|$)/i,
    /(?:Highlights|Day.?s Activities)\s*[:：]?\s*(.+?)(?:\n|$)/i,
  ];
  for (const pattern of highlightsPatterns) {
    const match = fullText.match(pattern);
    if (match) {
      highlights = match[1].trim();
      break;
    }
  }

  // ─── Extract periods/lessons ───
  const periods: ParsedPeriod[] = [];

  // Strategy 1: Look for structured table rows with known Marathi subject names
  const marathiSubjects = [
    "मराठी", "गणित", "इंग्रजी", "हिंदी", "विज्ञान", "सामाजिक शास्त्र",
    "परिसर अभ्यास", "परिसर अभ्यास १", "परिसर अभ्यास २",
    "कला", "शा. शि.", "शारीरिक शिक्षण", "क्रीडा", "कार्यानुभव",
    "संगीत", "चित्रकला", "सुलेख",
  ];

  // Try to find tab/pipe-separated table rows (common in DOCX tables)
  const tableRowPattern = /(\d+)\s*[\t|]+\s*(.+?)[\t|]+\s*(.+?)[\t|]+\s*(.+?)(?:[\t|]+\s*(.+?))?(?:[\t|]+\s*(.+?))?(?:[\t|]+\s*(.+?))?/g;
  let tableMatch;
  while ((tableMatch = tableRowPattern.exec(fullText)) !== null) {
    const periodNum = tableMatch[1].trim();
    if (!isNaN(parseInt(periodNum))) {
      periods.push({
        period: periodNum,
        class: className,
        subject: tableMatch[2]?.trim() || "",
        topic: tableMatch[3]?.trim() || "",
        experience: tableMatch[4]?.trim() || "",
        tools: tableMatch[5]?.trim() || "",
        materials: tableMatch[6]?.trim() || "",
        outcome: tableMatch[7]?.trim() || "",
      });
    }
  }

  // Strategy 2: Look for period markers like "तास 1:", "तासिका 1:", "Period 1:" etc.
  if (periods.length === 0) {
    const periodMarkerPattern = /(?:तास(?:िका)?\s*|Period\s*|तास\s*क्र\s*\.?\s*)(\d+)\s*[:：\-]?\s*/gi;
    const periodMarkers: { index: number; num: string }[] = [];
    let markerMatch;
    while ((markerMatch = periodMarkerPattern.exec(fullText)) !== null) {
      periodMarkers.push({ index: markerMatch.index, num: markerMatch[1] });
    }

    for (let i = 0; i < periodMarkers.length; i++) {
      const start = periodMarkers[i].index;
      const end = i + 1 < periodMarkers.length ? periodMarkers[i + 1].index : fullText.length;
      const section = fullText.substring(start, end).trim();

      // Try to extract subject, topic, etc. from the section
      let subject = "";
      let topic = "";
      let experience = "";
      let tools = "";
      let materials = "";
      let outcome = "";

      // Find subject
      for (const sub of marathiSubjects) {
        if (section.includes(sub)) {
          subject = sub;
          break;
        }
      }
      // Also check for English subjects
      const engSubjects = ["English", "Maths", "Mathematics", "Science", "Social Studies", "Hindi", "Marathi", "Art", "Music", "PT"];
      for (const sub of engSubjects) {
        if (section.toLowerCase().includes(sub.toLowerCase()) && !subject) {
          subject = sub;
          break;
        }
      }

      // Extract fields using Marathi/English labels
      const topicMatch = section.match(/(?:विषय|अध्याय|धडा|घटक|Topic|Chapter)\s*[:：]?\s*(.+?)(?:\n|$)/i);
      if (topicMatch) topic = topicMatch[1].trim();

      const expMatch = section.match(/(?:अनुभव|अभ्यासाच्या अनुभवाचे स्वरूप|Experience)\s*[:：]?\s*(.+?)(?:\n|$)/i);
      if (expMatch) experience = expMatch[1].trim();

      const toolsMatch = section.match(/(?:साधन|तंत्र|साधन तंत्र|Tools|Method)\s*[:：]?\s*(.+?)(?:\n|$)/i);
      if (toolsMatch) tools = toolsMatch[1].trim();

      const matMatch = section.match(/(?:साहित्य|आवश्यक साहित्य|Materials)\s*[:：]?\s*(.+?)(?:\n|$)/i);
      if (matMatch) materials = matMatch[1].trim();

      const outcomeMatch = section.match(/(?:परिणाम|निष्कर्ष|Outcome|Result)\s*[:：]?\s*(.+?)(?:\n|$)/i);
      if (outcomeMatch) outcome = outcomeMatch[1].trim();

      // If no specific topic extracted, use remaining text as topic
      if (!topic && section.length > 20) {
        const cleanedSection = section
          .replace(/(?:तास(?:िका)?\s*|Period\s*)(\d+)\s*[:：\-]?\s*/i, "")
          .replace(subject, "")
          .trim();
        if (cleanedSection) {
          topic = cleanedSection.substring(0, 200);
        }
      }

      periods.push({
        period: periodMarkers[i].num,
        class: className,
        subject,
        topic,
        experience,
        tools,
        materials,
        outcome,
      });
    }
  }

  // Strategy 3: Look for subject headings directly in lines
  if (periods.length === 0) {
    let periodCounter = 1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const sub of marathiSubjects) {
        if (line.includes(sub) && line.length < 200) {
          // This line likely starts a period section
          const topic = lines[i + 1] || "";
          const experience = lines[i + 2] || "";
          
          periods.push({
            period: periodCounter.toString(),
            class: className,
            subject: sub,
            topic: topic.length > 10 ? topic : "",
            experience: experience.length > 10 ? experience : "",
            tools: "",
            materials: "",
            outcome: "",
          });
          periodCounter++;
          break; // Don't match multiple subjects on same line
        }
      }
    }
  }

  // Strategy 4: If still no periods, split content into chunks and assign as periods
  if (periods.length === 0 && lines.length > 3) {
    // Use entire text as a single period with full content
    const contentLines = lines.filter(l => 
      !l.match(/तारीख|दिवस|सुविचार|दिनविशेष|टाचन|वर्गशिक्षक|मुख्याध्यापक/i) &&
      l.length > 5
    );
    
    if (contentLines.length > 0) {
      // Try to split into reasonable chunks as periods
      const chunkSize = Math.max(1, Math.ceil(contentLines.length / 4));
      let periodNum = 1;
      
      for (let i = 0; i < contentLines.length && periodNum <= 8; i += chunkSize) {
        const chunk = contentLines.slice(i, i + chunkSize);
        periods.push({
          period: periodNum.toString(),
          class: className,
          subject: "",
          topic: chunk[0] || "",
          experience: chunk.slice(1).join(" ") || "",
          tools: "",
          materials: "",
          outcome: "",
        });
        periodNum++;
      }
    }
  }

  return {
    date,
    day,
    thought,
    dinvishesh,
    highlights,
    periods,
  };
}

// ─── Main Export ───

/**
 * Parse a diary file (PDF or DOCX) from its data URL and return structured content.
 */
export async function parseDiaryFile(
  dataUrl: string,
  fileType: string,
  className: string
): Promise<ParsedDiaryContent | null> {
  try {
    const base64Data = getBase64FromDataUrl(dataUrl);

    let rawText = "";

    if (fileType.includes("pdf")) {
      rawText = await extractTextFromPDF(base64Data);
    } else if (
      fileType.includes("word") ||
      fileType.includes("document") ||
      fileType.includes("docx") ||
      fileType.includes("doc") ||
      fileType.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    ) {
      rawText = await extractTextFromDOCX(base64Data);
    } else {
      console.warn("Unsupported file type for parsing:", fileType);
      return null;
    }

    if (!rawText || rawText.trim().length < 10) {
      console.warn("Extracted text is too short or empty");
      return null;
    }

    const parsed = parseTextToDiary(rawText, className);
    return parsed;
  } catch (err) {
    console.error("Error parsing diary file:", err);
    return null;
  }
}
