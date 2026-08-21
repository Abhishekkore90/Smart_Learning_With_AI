import * as XLSX from "xlsx";
import { format } from "date-fns";

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

import { UniversalFileReader } from "@/services/fileReader";

// ─── Text Extraction ───

/**
 * Extract text from a PDF file using UniversalFileReader service
 */
async function extractTextFromPDF(base64Data: string): Promise<string> {
  try {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const result = await UniversalFileReader.readFile(bytes.buffer as ArrayBuffer);
    return result.text || "";
  } catch (err) {
    console.warn("PDF diary extraction notice:", err);
    return "";
  }
}

/**
 * Extract text from a DOCX file using UniversalFileReader service
 */
async function extractTextFromDOCX(base64Data: string): Promise<string> {
  try {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const result = await UniversalFileReader.readFile(bytes.buffer as ArrayBuffer);
    return result.text || "";
  } catch (err) {
    console.warn("DOCX diary extraction notice:", err);
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
    /(?:दिवस|वार)\s*[:：\-]?\s*(सोमवार|मंगळवार|बुधवार|गुरुवार|शुक्रवार|शनिवार|रविवार)/i,
    /Day\s*[:：\-]?\s*(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i,
  ];
  for (const pattern of dayPatterns) {
    const match = fullText.match(pattern);
    if (match) {
      day = match[1];
      break;
    }
  }

  // Automatic computation of day from date
  if (date) {
    const cleaned = date.replace(/\s+/g, "");
    const parts = cleaned.split(/[\/\-\.]/);
    if (parts.length === 3) {
      let d = 0, m = 0, y = 0;
      if (parts[0].length === 4) {
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10) - 1;
        d = parseInt(parts[2], 10);
      } else {
        d = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10) - 1;
        y = parseInt(parts[2], 10);
        if (y < 100) y += 2000;
      }
      const dateObj = new Date(y, m, d);
      if (!isNaN(dateObj.getTime())) {
        const daysInMarathi = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
        day = daysInMarathi[dateObj.getDay()];
      }
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
        outcome: tableMatch[4]?.trim() || "",
        experience: tableMatch[5]?.trim() || "",
        tools: tableMatch[6]?.trim() || "",
        materials: tableMatch[7]?.trim() || "",
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
  if (periods.length === 0 && lines.length > 0) {
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

function extractWordDocumentStream(bytes: Uint8Array): Uint8Array | null {
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    // Verify magic bytes: d0 cf 11 e0 a1 b1 1a e1
    if (
      bytes[0] !== 0xd0 ||
      bytes[1] !== 0xcf ||
      bytes[2] !== 0x11 ||
      bytes[3] !== 0xe0 ||
      bytes[4] !== 0xa1 ||
      bytes[5] !== 0xb1 ||
      bytes[6] !== 0x1a ||
      bytes[7] !== 0xe1
    ) {
      return null;
    }

    const sectorSizeShift = view.getUint16(30, true);
    const sectorSize = 1 << sectorSizeShift;
    const dirStartSector = view.getUint32(48, true);
    const entrySize = 128;

    const getSectorOffset = (sectorIdx: number) => 512 + sectorIdx * sectorSize;

    let currentDirSector = dirStartSector;
    const entries: { name: string; startSector: number; streamSize: number }[] = [];

    for (let s = 0; s < 20; s++) {
      if (currentDirSector === 0xfffffffe || currentDirSector === 0xffffffff) break;
      const offset = getSectorOffset(currentDirSector);
      if (offset + sectorSize > bytes.length) break;

      for (let e = 0; e < sectorSize; e += entrySize) {
        const entryOffset = offset + e;
        const nameLen = view.getUint16(entryOffset + 64, true);
        if (nameLen > 2 && nameLen <= 64) {
          let name = "";
          for (let i = 0; i < nameLen - 2; i += 2) {
            name += String.fromCharCode(view.getUint16(entryOffset + i, true));
          }
          const startSector = view.getUint32(entryOffset + 116, true);
          const streamSize = view.getUint32(entryOffset + 120, true);
          entries.push({ name, startSector, streamSize });
        }
      }
      currentDirSector++;
    }

    const wordDocEntry = entries.find((e) => e.name === "WordDocument");
    if (!wordDocEntry) return null;

    const satSectors: number[] = [];
    for (let i = 0; i < 109; i++) {
      const satSec = view.getUint32(76 + i * 4, true);
      if (satSec === 0xffffffff || satSec === 0xfffffffe) break;
      satSectors.push(satSec);
    }

    const satTable: number[] = [];
    for (const satSec of satSectors) {
      const offset = getSectorOffset(satSec);
      if (offset + sectorSize <= bytes.length) {
        for (let i = 0; i < sectorSize; i += 4) {
          satTable.push(view.getUint32(offset + i, true));
        }
      }
    }

    const chain: number[] = [];
    let nextSec = wordDocEntry.startSector;
    while (nextSec !== 0xfffffffe && nextSec !== 0xffffffff && nextSec < satTable.length) {
      chain.push(nextSec);
      nextSec = satTable[nextSec];
    }

    const streamData = new Uint8Array(wordDocEntry.streamSize);
    let written = 0;
    for (const sec of chain) {
      const offset = getSectorOffset(sec);
      if (offset + sectorSize <= bytes.length) {
        const chunk = bytes.subarray(offset, offset + Math.min(sectorSize, wordDocEntry.streamSize - written));
        streamData.set(chunk, written);
        written += chunk.length;
        if (written >= wordDocEntry.streamSize) break;
      }
    }

    return streamData;
  } catch (err) {
    console.error("Error extracting WordDocument stream from OLE:", err);
    return null;
  }
}

function cleanExtractedText(rawText: string): string {
  let cleaned = "";
  for (let i = 0; i < rawText.length; i++) {
    const code = rawText.charCodeAt(i);
    if (
      (code >= 32 && code <= 126) ||
      (code >= 0x0900 && code <= 0x097F) ||
      (code >= 0xA0 && code <= 0xFF) ||
      code === 10 ||
      code === 13 ||
      code === 9
    ) {
      cleaned += rawText[i];
    } else {
      cleaned += " ";
    }
  }

  return cleaned
    .replace(/[ \t]+/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

async function extractTextFromBinaryDOC(base64Data: string): Promise<string> {
  try {
    console.log("extractTextFromBinaryDOC: start, data length =", base64Data.length);
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Attempt high-fidelity OLE stream extraction
    console.log("extractTextFromBinaryDOC: attempting OLE stream extraction...");
    const stream = extractWordDocumentStream(bytes);
    if (stream) {
      console.log("extractTextFromBinaryDOC: OLE stream extracted successfully, stream size =", stream.byteLength);
      
      // Decode as UTF-16LE using built-in TextDecoder (millisecond-speed, no browser hang!)
      const utf16Decoder = new TextDecoder("utf-16le");
      const utf16Text = utf16Decoder.decode(stream);

      // Decode as Latin1 (windows-1252) using built-in TextDecoder
      const latin1Decoder = new TextDecoder("windows-1252");
      const latin1Text = latin1Decoder.decode(stream);

      // Check if UTF-16LE contains Devanagari characters (scan first 2000 chars for efficiency)
      let hasDevanagari = false;
      const scanLimit = Math.min(utf16Text.length, 2000);
      for (let i = 0; i < scanLimit; i++) {
        const code = utf16Text.charCodeAt(i);
        if (code >= 0x0900 && code <= 0x097F) {
          hasDevanagari = true;
          break;
        }
      }
      console.log("extractTextFromBinaryDOC: hasDevanagari =", hasDevanagari);

      const selectedText = hasDevanagari ? utf16Text : latin1Text;
      const cleaned = cleanExtractedText(selectedText);
      console.log("extractTextFromBinaryDOC: cleaned text length =", cleaned.length);
      if (cleaned.length > 50) {
        return cleaned;
      }
    }

    // Fallback to simple TextDecoder decode instead of character loop to prevent browser hang
    console.log("extractTextFromBinaryDOC: OLE stream extraction failed or was too short. Running fast fallback...");
    const fallbackUtf16 = new TextDecoder("utf-16le").decode(bytes);
    let hasDevanagariFallback = false;
    const fallbackScanLimit = Math.min(fallbackUtf16.length, 2000);
    for (let i = 0; i < fallbackScanLimit; i++) {
      const code = fallbackUtf16.charCodeAt(i);
      if (code >= 0x0900 && code <= 0x097F) {
        hasDevanagariFallback = true;
        break;
      }
    }

    const fallbackText = hasDevanagariFallback 
      ? fallbackUtf16 
      : new TextDecoder("windows-1252").decode(bytes);
      
    return cleanExtractedText(fallbackText);
  } catch (err) {
    console.error("Binary .doc text extraction error:", err);
    return "";
  }
}

function createFallbackStructure(className: string): ParsedDiaryContent {
  const days = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
  const currentDay = days[new Date().getDay()];
  
  return {
    date: new Date().toLocaleDateString("en-IN"),
    day: currentDay,
    thought: "सुविचार उपलब्ध नाही (मूळ फाईल पहा)",
    dinvishesh: "दिनविशेष उपलब्ध नाही (मूळ फाईल पहा)",
    highlights: "टाचन बुक फाईल यशस्वीरित्या जतन केली आहे. (स्वयंचलित माहिती संकलन या फाईल प्रकारासाठी उपलब्ध नाही.)",
    periods: [
      {
        period: "1",
        class: className,
        subject: "माहिती संकलन",
        topic: "मूळ टाचन बुक जोडले गेले आहे",
        experience: "कृपया वर दिलेल्या 'मूळ फाईल डाऊनलोड करा' वरून फाईल तपासा.",
        tools: "",
        materials: "",
        outcome: ""
      }
    ]
  };
}

export function parseAndStandardizeDate(dateStr: string | undefined | null): string | null {
  if (!dateStr) return null;
  // Normalize internal spaces around date separators (e.g. "12/ 8 /2026" -> "12/8/2026")
  let clean = dateStr.trim().replace(/(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{2,4})/, "$1/$2/$3");
  
  // Match DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  let m = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (m) {
    const day = m[1].padStart(2, '0');
    const month = m[2].padStart(2, '0');
    let year = m[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  // Also extract date pattern inside longer strings (e.g., "दिनांक: 12/ 8 /2026")
  m = clean.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (m) {
    const day = m[1].padStart(2, '0');
    const month = m[2].padStart(2, '0');
    let year = m[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  // Match YYYY-MM-DD
  m = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (m) {
    const year = m[1];
    const month = m[2].padStart(2, '0');
    const day = m[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return null;
}

export function splitTextByDates(rawText: string, className: string): ParsedDiaryContent[] {
  const dateRegex = /(?:तारीख|दिनांक|Date)\s*[:：]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/gi;
  const matches: { dateStr: string; index: number }[] = [];
  let match;
  
  while ((match = dateRegex.exec(rawText)) !== null) {
    matches.push({ dateStr: match[1], index: match.index });
  }

  if (matches.length === 0) {
    return [parseTextToDiary(rawText, className)];
  }

  const entries: ParsedDiaryContent[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : rawText.length;
    const sectionText = rawText.substring(start, end);
    const parsed = parseTextToDiary(sectionText, className);
    const standardizedDate = parseAndStandardizeDate(matches[i].dateStr);
    if (standardizedDate) {
      parsed.date = standardizedDate;
    }
    entries.push(parsed);
  }

  return entries;
}

export function parseExcelToDiaries(arrayBuffer: ArrayBuffer, className: string): ParsedDiaryContent[] {
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const entriesMap: Record<string, ParsedDiaryContent> = {};

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    if (rows.length < 2) return;

    let headerRowIndex = 0;
    for (let r = 0; r < Math.min(5, rows.length); r++) {
      const row = rows[r];
      if (row && row.some(cell => typeof cell === 'string' && /तारीख|दिनांक|Date|विषय|तास/i.test(cell))) {
        headerRowIndex = r;
        break;
      }
    }

    const headers = (rows[headerRowIndex] || []).map(h => String(h || "").trim().toLowerCase());
    
    const colIndex = {
      date: headers.findIndex(h => /तारीख|दिनांक|date/i.test(h)),
      period: headers.findIndex(h => /तास|तासिका|period|time/i.test(h)),
      subject: headers.findIndex(h => /विषय|subject/i.test(h)),
      topic: headers.findIndex(h => /मुद्दा|पाठ्यांश|पाठ्यघटक|घटक|पाठ|topic|chapter/i.test(h)),
      outcome: headers.findIndex(h => /निष्पत्ती|निष्पती|दर्शक|दर्शके|outcome|result/i.test(h)),
      experience: headers.findIndex(h => /अनुभव|अनुभवाचे|स्वरूप|कृती|experience/i.test(h)),
      tools: headers.findIndex(h => /साधन|तंत्र|tools|method/i.test(h)),
      materials: headers.findIndex(h => /साहित्य|materials/i.test(h)),
      thought: headers.findIndex(h => /सुविचार|thought/i.test(h)),
      dinvishesh: headers.findIndex(h => /दिनविशेष|special/i.test(h)),
      highlights: headers.findIndex(h => /प्रमुख उपक्रम|highlights/i.test(h)),
    };

    if (colIndex.date === -1) colIndex.date = 0;

    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const rawDate = String(row[colIndex.date] || "").trim();
      if (!rawDate) continue;

      let dateKey = parseAndStandardizeDate(rawDate);
      if (!dateKey) {
        if (!isNaN(Number(rawDate)) && Number(rawDate) > 30000) {
          const excelDate = new Date((Number(rawDate) - 25569) * 86400 * 1000);
          dateKey = format(excelDate, "yyyy-MM-dd");
        } else {
          continue;
        }
      }

      if (!entriesMap[dateKey]) {
        entriesMap[dateKey] = {
          date: dateKey,
          day: "",
          thought: colIndex.thought !== -1 ? String(row[colIndex.thought] || "").trim() : "",
          dinvishesh: colIndex.dinvishesh !== -1 ? String(row[colIndex.dinvishesh] || "").trim() : "",
          highlights: colIndex.highlights !== -1 ? String(row[colIndex.highlights] || "").trim() : "",
          periods: [],
        };
      }

      const entry = entriesMap[dateKey];
      
      const periodNum = colIndex.period !== -1 ? String(row[colIndex.period] || "").trim() : (entry.periods.length + 1).toString();
      const subject = colIndex.subject !== -1 ? String(row[colIndex.subject] || "").trim() : "";
      const topic = colIndex.topic !== -1 ? String(row[colIndex.topic] || "").trim() : "";
      const experience = colIndex.experience !== -1 ? String(row[colIndex.experience] || "").trim() : "";
      const tools = colIndex.tools !== -1 ? String(row[colIndex.tools] || "").trim() : "";
      const materials = colIndex.materials !== -1 ? String(row[colIndex.materials] || "").trim() : "";
      const outcome = colIndex.outcome !== -1 ? String(row[colIndex.outcome] || "").trim() : "";

      if (subject || topic || experience) {
        entry.periods.push({
          period: periodNum,
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
  });

  return Object.values(entriesMap);
}

export function parseDocxHtmlToDiaries(html: string, className: string): ParsedDiaryContent[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  
  // Un-wrap container elements (e.g., <div class="WordSection1">) so we iterate directly over top-level paragraphs and tables
  let elements: Element[] = [];
  const topChildren = Array.from(doc.body.children);
  topChildren.forEach((child) => {
    if ((child.tagName === "DIV" || child.tagName === "SECTION") && child.children.length > 0) {
      elements.push(...Array.from(child.children));
    } else {
      elements.push(child);
    }
  });
  if (elements.length === 0) {
    elements = topChildren;
  }

  const dateRegex = /(?:तारीख|दिनांक|Date)?\s*[:：]?\s*(\d{1,2}\s*[\/\-\.]\s*\d{1,2}\s*[\/\-\.]\s*\d{2,4})/gi;
  const allText = doc.body.textContent || "";
  const dateMatches: { dateStr: string; index: number }[] = [];
  let match;
  while ((match = dateRegex.exec(allText)) !== null) {
    const std = parseAndStandardizeDate(match[1]);
    if (std) {
      dateMatches.push({ dateStr: match[1], index: match.index });
    }
  }

  // If 0 or 1 date match found in the whole document, treat the ENTIRE document as a single section!
  if (dateMatches.length <= 1) {
    const singleDateStr = dateMatches.length === 1 ? dateMatches[0].dateStr : "";
    return [parseHtmlSection({ dateStr: singleDateStr, elements }, className)];
  }

  // If multiple distinct dates found, split elements by date section
  const sections: { dateStr: string; elements: Element[] }[] = [];
  let currentSection: { dateStr: string; elements: Element[] } | null = null;

  elements.forEach((el) => {
    const text = el.textContent || "";
    const dMatch = text.match(/(?:तारीख|दिनांक|Date)?\s*[:：]?\s*(\d{1,2}\s*[\/\-\.]\s*\d{1,2}\s*[\/\-\.]\s*\d{2,4})/i);
    if (dMatch) {
      const std = parseAndStandardizeDate(dMatch[1]);
      if (std) {
        if (!currentSection || currentSection.elements.length > 0) {
          currentSection = { dateStr: dMatch[1], elements: [] };
          sections.push(currentSection);
        }
      }
    }
    if (!currentSection) {
      currentSection = { dateStr: dateMatches[0].dateStr, elements: [] };
      sections.push(currentSection);
    }
    currentSection.elements.push(el);
  });

  const rawParsedList = sections.map(sec => parseHtmlSection(sec, className)).filter(Boolean) as ParsedDiaryContent[];

  // Merge sections with the same date
  const mergedMap: Record<string, ParsedDiaryContent> = {};
  rawParsedList.forEach((item) => {
    const key = item.date || "default";
    if (!mergedMap[key]) {
      mergedMap[key] = { ...item, periods: [...(item.periods || [])] };
    } else {
      if (!mergedMap[key].day && item.day) mergedMap[key].day = item.day;
      if (!mergedMap[key].thought && item.thought) mergedMap[key].thought = item.thought;
      if (!mergedMap[key].dinvishesh && item.dinvishesh) mergedMap[key].dinvishesh = item.dinvishesh;
      if (item.periods && item.periods.length > 0) {
        mergedMap[key].periods.push(...item.periods);
      }
    }
  });

  return Object.values(mergedMap);
}

function getCellTextWithNewlines(cell: Element): string {
  if (!cell) return "";
  const clone = cell.cloneNode(true) as Element;
  clone.querySelectorAll("br").forEach(br => br.replaceWith("\n"));
  clone.querySelectorAll("p").forEach(p => {
    p.prepend(document.createTextNode("\n"));
  });
  return (clone.textContent || "")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .join("\n");
}

function parseHtmlTableToGrid(tableEl: Element): string[][] {
  const trs = Array.from(tableEl.querySelectorAll("tr"));
  const grid: string[][] = [];

  trs.forEach((tr, rIdx) => {
    if (!grid[rIdx]) grid[rIdx] = [];
    const cells = Array.from(tr.querySelectorAll("td, th"));
    let cIdx = 0;

    cells.forEach((cell) => {
      while (grid[rIdx][cIdx] !== undefined) {
        cIdx++;
      }

      const cellText = getCellTextWithNewlines(cell);
      const rowspan = parseInt(cell.getAttribute("rowspan") || "1", 10) || 1;
      const colspan = parseInt(cell.getAttribute("colspan") || "1", 10) || 1;

      for (let r = 0; r < rowspan; r++) {
        for (let c = 0; c < colspan; c++) {
          const targetRow = rIdx + r;
          const targetCol = cIdx + c;
          if (!grid[targetRow]) grid[targetRow] = [];
          grid[targetRow][targetCol] = cellText;
        }
      }

      cIdx += colspan;
    });
  });

  return grid;
}

function parseHtmlSection(sec: { dateStr: string; elements: Element[] }, className: string): ParsedDiaryContent {
  let date = parseAndStandardizeDate(sec.dateStr) || "";
  let day = "";
  let thought = "";
  let dinvishesh = "";
  let highlights = "";
  const periods: ParsedPeriod[] = [];

  const thoughtRegex = /(?:सुविचार|आजचा सुविचार|Thought|Today.?s Thought)\s*[:：]?\s*(.+)/i;
  const dinvisheshRegex = /(?:दिनविशेष|आजचा दिनविशेष|Day Special|Special Day)\s*[:：]?\s*(.+)/i;
  const highlightsRegex = /(?:दिवसातील प्रमुख उपक्रम|प्रमुख उपक्रम|Highlights|Activities)\s*[:：]?\s*(.+)/i;
  const dayRegex = /(?:दिवस|Day)\s*[:：]?\s*(सोमवार|मंगळवार|बुधवार|गुरुवार|शुक्रवार|शनिवार|रविवार|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i;

  sec.elements.forEach((el) => {
    const text = el.textContent || "";
    
    const dayMatch = text.match(dayRegex);
    if (dayMatch && !day) {
      day = dayMatch[1].trim();
    }

    const thoughtMatch = text.match(thoughtRegex);
    if (thoughtMatch && !thought) {
      thought = thoughtMatch[1].trim();
    }

    const dinMatch = text.match(dinvisheshRegex);
    if (dinMatch && !dinvishesh) {
      dinvishesh = dinMatch[1].trim();
    }

    const highMatch = text.match(highlightsRegex);
    if (highMatch && !highlights) {
      highlights = highMatch[1].trim();
    }
  });

  // Extract all tables in sec.elements (including nested tables inside wrapper divs or sections)
  const tables: Element[] = [];
  sec.elements.forEach((el) => {
    if (el.tagName === "TABLE") {
      tables.push(el);
    } else {
      const nestedTables = Array.from(el.querySelectorAll("table"));
      tables.push(...nestedTables);
    }
  });

  const uniqueTables = Array.from(new Set(tables));

  uniqueTables.forEach((tableEl) => {
    const grid = parseHtmlTableToGrid(tableEl);
    if (grid.length > 0) {
        let headerRowIndex = -1;
        for (let r = 0; r < Math.min(10, grid.length); r++) {
          const rowCells = grid[r] || [];
          if (rowCells.some(c => /तास|तासिका|विषय|घटक|Period|Subject|Topic/i.test(c))) {
            headerRowIndex = r;
            break;
          }
        }

        let colMap = { period: 0, subject: 1, topic: 2, outcome: 3, experience: 4, tools: 5, materials: 6 };

        if (headerRowIndex !== -1) {
          const headerCells = (grid[headerRowIndex] || []).map(c => c.toLowerCase());
          colMap = {
            period: headerCells.findIndex(h => /तास|तासिका|period|time/i.test(h)),
            subject: headerCells.findIndex(h => /विषय|subject/i.test(h)),
            topic: headerCells.findIndex(h => /मुद्दा|पाठ्यांश|पाठ्यघटक|घटक|पाठ|topic|chapter/i.test(h)),
            outcome: headerCells.findIndex(h => /निष्पत्ती|निष्पती|दर्शक|दर्शके|outcome|result/i.test(h)),
            experience: headerCells.findIndex(h => /अनुभव|अनुभवाचे|स्वरूप|कृती|experience/i.test(h)),
            tools: headerCells.findIndex(h => /साधन|तंत्र|tools|method/i.test(h)),
            materials: headerCells.findIndex(h => /साहित्य|materials/i.test(h)),
          };

          if (colMap.period === -1) colMap.period = 0;
          if (colMap.subject === -1) colMap.subject = 1;
          if (colMap.topic === -1) colMap.topic = 2;
          if (colMap.outcome === -1) colMap.outcome = 3;
          if (colMap.experience === -1) colMap.experience = 4;
          if (colMap.tools === -1) colMap.tools = 5;
          if (colMap.materials === -1) colMap.materials = 6;
        }

        const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;
        for (let r = startRow; r < grid.length; r++) {
          const cells = grid[r] || [];
          if (cells.length < 2) continue;

          const rawPeriodStr = colMap.period !== -1 && cells[colMap.period] ? cells[colMap.period] : "";
          if (rawPeriodStr === "तासिका" || rawPeriodStr === "Period" || rawPeriodStr === "तास") continue;

          const periodNum = rawPeriodStr || (periods.length + 1).toString();
          const subject = colMap.subject !== -1 && cells[colMap.subject] ? cells[colMap.subject] : "";
          const topic = colMap.topic !== -1 && cells[colMap.topic] ? cells[colMap.topic] : "";
          const outcome = colMap.outcome !== -1 && cells[colMap.outcome] ? cells[colMap.outcome] : "";
          const experience = colMap.experience !== -1 && cells[colMap.experience] ? cells[colMap.experience] : "";
          const tools = colMap.tools !== -1 && cells[colMap.tools] ? cells[colMap.tools] : "";
          const materials = colMap.materials !== -1 && cells[colMap.materials] ? cells[colMap.materials] : "";

          if (subject || topic || outcome || experience) {
            periods.push({
              period: periodNum,
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
      }
    });

  return {
    date,
    day,
    thought,
    dinvishesh,
    highlights,
    periods,
  };
}

async function parseDiaryTextWithAI(rawText: string, className: string): Promise<ParsedDiaryContent[] | null> {
  try {
    console.log("parseDiaryTextWithAI: Sending text directly from browser to Gemini...");
    
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("parseDiaryTextWithAI: VITE_GEMINI_API_KEY is not defined in frontend environment.");
      return null;
    }

    const systemPrompt = `You are an expert school teacher's diary parser. 
I will give you the raw extracted text of a teacher's daily teaching diary. 
This text might contain layout shifts, column text joined together, Marathi text, and spelling mistakes.
Your task is to reconstruct the exact table structure of the diary.
Identify each day's entry. For each entry, extract:
1. date (standardized as YYYY-MM-DD)
2. day (in Marathi, e.g., सोमवार, मंगळवार, बुधवार, गुरुवार, शुक्रवार, शनिवार,रविवार)
3. thought (सुविचार)
4. dinvishesh (दिनविशेष)
5. highlights (प्रमुख उपक्रम)
6. periods (taas / तासिका list)
For each period in the table, extract:
- period: the period number (e.g. 1, 2, 3...)
- subject: the subject name (e.g. मराठी, गणित, इंग्रजी...)
- topic: the topic/chapter name (घटक / पाठ)
- experience: the learning experience details (अध्ययन अनुभव)
- tools: teaching tools used (साधन / तंत्र)
- materials: required materials (साहित्य)
- outcome: learning outcome (निष्पत्ती)

If a column is empty or missing, set its value to "".
Return ONLY a valid JSON array of these entries matching this TypeScript structure:
[
  {
    "date": "YYYY-MM-DD",
    "day": "वार",
    "thought": "सुविचार",
    "dinvishesh": "दिनविशेष",
    "highlights": "प्रमुख उपक्रम",
    "periods": [
      {
        "period": "1",
        "subject": "विषय",
        "topic": "घटक",
        "experience": "अध्ययन अनुभव",
        "tools": "साधन",
        "materials": "साहित्य",
        "outcome": "निष्पत्ती"
      }
    ]
  }
]`;

    const userText = `Class: ${className}\n\nRaw Text:\n${rawText.substring(0, 15000)}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const result = await response.json();
    const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonText) {
      console.warn("parseDiaryTextWithAI: Empty text in Gemini response.");
      return null;
    }

    const parsedEntries = JSON.parse(jsonText.trim()) as ParsedDiaryContent[];
    console.log("parseDiaryTextWithAI: Successfully structured", parsedEntries.length, "entries directly from browser.");
    
    parsedEntries.forEach((entry) => {
      if (entry.periods) {
        entry.periods.forEach((p) => {
          p.class = className;
        });
      }
    });

    return parsedEntries;
  } catch (err) {
    console.error("parseDiaryTextWithAI: Browser Gemini parsing failed:", err);
    return null;
  }
}

export async function parseDiaryFileFromArrayBuffer(
  arrayBuffer: ArrayBuffer,
  fileType: string,
  className: string
): Promise<ParsedDiaryContent[] | null> {
  try {
    const lowerType = fileType.toLowerCase();

    if (
      lowerType.includes("officedocument.wordprocessingml.document") ||
      lowerType.includes("docx")
    ) {
      const mammoth = await import("mammoth");
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value;
      return parseDocxHtmlToDiaries(html, className);
    } else if (
      lowerType.includes("msword") ||
      lowerType.includes("doc")
    ) {
      const bytes = new Uint8Array(arrayBuffer);
      let binaryString = "";
      for (let i = 0; i < bytes.length; i++) {
        binaryString += String.fromCharCode(bytes[i]);
      }
      const base64Data = btoa(binaryString);
      const rawText = await extractTextFromBinaryDOC(base64Data);
      
      // Attempt structured AI parsing first
      const aiParsed = await parseDiaryTextWithAI(rawText, className);
      if (aiParsed && aiParsed.length > 0) {
        return aiParsed;
      }
      
      return splitTextByDates(rawText, className);
    } else if (
      lowerType.includes("spreadsheet") ||
      lowerType.includes("excel") ||
      lowerType.includes("xls") ||
      lowerType.includes("xlsx")
    ) {
      return parseExcelToDiaries(arrayBuffer, className);
    } else {
      console.warn("Unsupported file type for splitting:", fileType);
      return null;
    }
  } catch (err) {
    console.error("Error in parseDiaryFileFromArrayBuffer:", err);
    return null;
  }
}

export async function parseDiaryFile(
  dataUrl: string,
  fileType: string,
  className: string
): Promise<ParsedDiaryContent | null> {
  try {
    const base64Data = getBase64FromDataUrl(dataUrl);

    let rawText = "";
    const lowerType = fileType.toLowerCase();

    if (lowerType.includes("pdf")) {
      rawText = await extractTextFromPDF(base64Data);
    } else if (
      lowerType.includes("officedocument.wordprocessingml.document") ||
      lowerType.includes("docx")
    ) {
      rawText = await extractTextFromDOCX(base64Data);
    } else if (
      lowerType.includes("msword") ||
      lowerType.includes("doc")
    ) {
      rawText = await extractTextFromBinaryDOC(base64Data);
    } else {
      console.warn("Unsupported file type for parsing:", fileType);
      return createFallbackStructure(className);
    }

    if (!rawText || rawText.trim().length < 10) {
      console.warn("Extracted text is too short or empty, falling back to dummy structure");
      return createFallbackStructure(className);
    }

    const parsed = parseTextToDiary(rawText, className);
    if (!parsed || (parsed.periods.length === 0 && !parsed.thought)) {
      return createFallbackStructure(className);
    }
    
    return parsed;
  } catch (err) {
    console.error("Error parsing diary file, falling back:", err);
    return createFallbackStructure(className);
  }
}

export async function saveParsedEntriesToFirestore({
  entries,
  fileUrl,
  fileName,
  selectedClass,
  selectedMedium,
  selectedYear,
  selectedMonth,
  selectedWeek,
}: {
  entries: ParsedDiaryContent[] | null;
  fileUrl: string;
  fileName: string;
  selectedClass: string;
  selectedMedium: string;
  selectedYear: string;
  selectedMonth: string;
  selectedWeek: string;
}): Promise<string[]> {
  const { doc, setDoc } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");

  const monthStr = selectedMonth || "01";
  const daysOfWeek = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];

  let baseDay = 1;
  if (selectedWeek === "Week 2") baseDay = 8;
  else if (selectedWeek === "Week 3") baseDay = 15;
  else if (selectedWeek === "Week 4") baseDay = 22;
  else if (selectedWeek === "Week 5") baseDay = 29;

  const validEntries = entries && entries.length > 0 ? entries : [];
  const dateCursor = new Date(parseInt(selectedYear, 10), parseInt(monthStr, 10) - 1, baseDay);
  const savedDates: string[] = [];

  // Save primary file record in teacher_diaries so it represents the uploaded file
  const masterDocId = `file_${Date.now()}`;
  const masterDocRef = doc(db, "teacher_diaries", selectedClass, selectedMedium, masterDocId);
  const firstValidDate = validEntries.length > 0 && validEntries[0].date ? (parseAndStandardizeDate(validEntries[0].date) || null) : null;
  let primaryDateStr = firstValidDate || `${selectedYear}-${monthStr}-${String(baseDay).padStart(2, "0")}`;
  if (primaryDateStr && selectedYear) {
    const p = primaryDateStr.split("-");
    if (p.length === 3) primaryDateStr = `${selectedYear}-${p[1]}-${p[2]}`;
  }

  const masterData = {
    id: masterDocId,
    pageUrl: fileUrl,
    masterPdfUrl: fileUrl,
    fileName,
    uploadedAt: Date.now(),
    diaryDate: primaryDateStr,
    date: primaryDateStr,
    displayDate: primaryDateStr,
    className: selectedClass,
    medium: selectedMedium,
    week: selectedWeek,
    month: selectedMonth,
    structuredData: validEntries.length > 0 ? validEntries : undefined,
    periods: validEntries[0]?.periods || [],
  };

  try {
    await setDoc(masterDocRef, masterData, { merge: true });
  } catch (e) {
    console.error("Failed to save master record:", e);
  }

  const count = validEntries.length > 0 ? validEntries.length : 10;

  for (let idx = 0; idx < count; idx++) {
    const entry = validEntries[idx] || null;

    let targetDateStr = "";
    if (entry?.date) {
      targetDateStr = parseAndStandardizeDate(entry.date) || "";
    }

    if (!targetDateStr) {
      while (dateCursor.getDay() === 0) { // skip Sundays
        dateCursor.setDate(dateCursor.getDate() + 1);
      }
      targetDateStr = format(dateCursor, "yyyy-MM-dd");
      dateCursor.setDate(dateCursor.getDate() + 1);
    }

    if (targetDateStr && selectedYear) {
      const parts = targetDateStr.split("-");
      if (parts.length === 3) {
        targetDateStr = `${selectedYear}-${parts[1]}-${parts[2]}`;
      }
    }

    const parts = targetDateStr.split("-");
    let dObj: Date | null = null;
    if (parts.length === 3) {
      dObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }

    // Skip Sundays (School holiday)
    if (dObj && !isNaN(dObj.getTime()) && dObj.getDay() === 0) {
      continue;
    }

    const dayName = dObj && !isNaN(dObj.getTime()) ? daysOfWeek[dObj.getDay()] : (entry?.day || "");
    const periods = entry?.periods || (validEntries[0]?.periods || []);

    const recordData = {
      pageUrl: fileUrl,
      masterPdfUrl: fileUrl,
      fileName,
      uploadedAt: Date.now(),
      diaryDate: targetDateStr,
      date: targetDateStr,
      displayDate: targetDateStr,
      day: dayName,
      className: selectedClass,
      medium: selectedMedium,
      pageNumber: idx + 1,
      week: selectedWeek,
      month: selectedMonth,
      thought: entry?.thought || validEntries[0]?.thought || "",
      dinvishesh: entry?.dinvishesh || validEntries[0]?.dinvishesh || "",
      periods: periods,
      parsedContent: entry || { date: targetDateStr, day: dayName, periods },
      structuredData: validEntries.length > 0 ? validEntries : undefined,
    };

    try {
      // 1. Save to teacher_diaries doc for specific date
      const teacherDocRef = doc(db, "teacher_diaries", selectedClass, selectedMedium, targetDateStr);
      await setDoc(teacherDocRef, recordData, { merge: true });

      // 2. Save to teaching_diaries doc for specific date
      const tdDocId = `${selectedClass}_${selectedMedium}_${targetDateStr}`;
      const tdDocRef = doc(db, "teaching_diaries", tdDocId);
      await setDoc(tdDocRef, recordData, { merge: true });

      savedDates.push(targetDateStr);
    } catch (e) {
      console.error(`Failed to save record for date ${targetDateStr}:`, e);
    }
  }

  return savedDates;
}
