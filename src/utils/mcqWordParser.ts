import type { MCQQuestion } from "@/types/mcqHomework";

export interface ParsedMCQResult {
  title?: string;
  detectedClass?: string;
  detectedMedium?: "marathi" | "semi";
  totalQuestions: number;
  sections: string[];
  questions: MCQQuestion[];
  sectionQuestions: Record<string, MCQQuestion[]>;
}

export function toWesternNum(str?: string): string {
  if (!str) return "";
  const map: Record<string, string> = {
    "०": "0", "१": "1", "२": "2", "३": "3", "४": "4",
    "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
  };
  return String(str).replace(/[०-९]/g, (d) => map[d] || d);
}

export function toDevanagariNum(num: number | string): string {
  const map: Record<string, string> = {
    "0": "०", "1": "१", "2": "२", "3": "३", "4": "४",
    "5": "५", "6": "६", "7": "७", "8": "८", "9": "९",
  };
  return String(num).replace(/[0-9]/g, (d) => map[d] || d);
}

function detectClassFromText(text: string): string {
  if (text.includes("पहिली") || text.includes("1 ली") || text.includes("1st")) return "1st";
  if (text.includes("दुसरी") || text.includes("2 री") || text.includes("2nd")) return "2nd";
  if (text.includes("तिसरी") || text.includes("3 री") || text.includes("3rd")) return "3rd";
  if (text.includes("चौथी") || text.includes("4 थी") || text.includes("4th")) return "4th";
  if (text.includes("पाचवी") || text.includes("5 वी") || text.includes("5th")) return "5th";
  if (text.includes("सहावी") || text.includes("6 वी") || text.includes("6th")) return "6th";
  if (text.includes("सातवी") || text.includes("7 वी") || text.includes("7th")) return "7th";
  if (text.includes("आठवी") || text.includes("8 वी") || text.includes("8th")) return "8th";
  return "";
}

function extractOptionsFromText(text: string): { label: string; text: string }[] {
  const results: { label: string; text: string }[] = [];

  // 1. Matches (1), (2), (3), (4) or (A), (B), (C), (D) or (अ), (ब), (क), (ड)
  const bracketRegex = /\(([1-4१-४A-Da-dअ-ड])\)\s*([^(\n\r]+)/g;
  let m: RegExpExecArray | null;
  while ((m = bracketRegex.exec(text)) !== null) {
    results.push({ label: m[1], text: m[2].trim() });
  }

  // 2. If no bracketed options, try 1) opt1, 2) opt2 or A) optA, B) optB
  if (results.length === 0) {
    const parenRegex = /(?:^|\s+)([1-4१-४A-Da-dअ-ड])\)\s+([^1-4१-४A-Da-d\n\r]+)/g;
    let m2: RegExpExecArray | null;
    while ((m2 = parenRegex.exec(text)) !== null) {
      results.push({ label: m2[1], text: m2[2].trim() });
    }
  }

  return results;
}

/**
 * Parses MCQs from browser DOM Document (produced by mammoth.convertToHtml)
 */
export function parseMCQFromDOM(doc: Document, fileName?: string): ParsedMCQResult {
  let title = "";
  let detectedClass = "";
  let detectedMedium: "marathi" | "semi" = "marathi";

  // 1. Parse Answer Key from Tables (उत्तरसूची तक्ता)
  const answerKeyMap: Record<string, number> = {};
  const tables = Array.from(doc.querySelectorAll("table"));

  for (const table of tables) {
    const text = table.textContent || "";
    const prevEl = table.previousElementSibling;
    const isAnswerTable =
      (prevEl && prevEl.textContent?.includes("उत्तर")) ||
      text.includes("उत्तरसूची") ||
      text.includes("विषय / प्रश्न") ||
      (text.includes("मराठी") && (text.includes("गणित") || text.includes("इंग्रजी")));

    if (isAnswerTable) {
      const rows = Array.from(table.querySelectorAll("tr"));
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll("td, th")).map((c) => (c.textContent || "").trim());
        if (cells.length > 2) {
          const firstCell = cells[0];
          // Skip header row if it only has numbers or "विषय / प्रश्न"
          if (firstCell.includes("विषय") || firstCell.includes("प्रश्न") || /^[0-9०-९]+$/.test(firstCell)) {
            continue;
          }

          const subject = firstCell.replace(/[^a-zA-Z\u0900-\u097F\s()]/g, "").trim();

          for (let col = 1; col < cells.length; col++) {
            const rawVal = toWesternNum(cells[col]).trim();
            const valNum = parseInt(rawVal, 10);
            if (!isNaN(valNum) && valNum >= 1 && valNum <= 4) {
              answerKeyMap[`${subject}_${col}`] = valNum - 1;
              answerKeyMap[`col_${col}`] = valNum - 1;
            }
          }
        }
      }
    }
  }

  // 2. Extract linear blocks: headings, paragraphs, and non-answer table cells
  const blocks: string[] = [];

  function collectBlocks(node: Element) {
    if (!node) return;

    if (node.tagName === "TABLE") {
      const text = node.textContent || "";
      if (text.includes("उत्तरसूची") || text.includes("विषय / प्रश्न")) {
        return; // Skip answer key table from question flow
      }

      // If it's a content table (e.g. 2x2 options grid), process row by row
      const rows = Array.from(node.querySelectorAll("tr"));
      for (const row of rows) {
        const cellTexts = Array.from(row.querySelectorAll("td, th"))
          .map((td) => (td.textContent || "").trim())
          .filter(Boolean);
        if (cellTexts.length > 0) {
          blocks.push(cellTexts.join("    "));
        }
      }
      return;
    }

    if (["P", "H1", "H2", "H3", "H4", "LI"].includes(node.tagName)) {
      const t = (node.textContent || "").trim();
      if (t) blocks.push(t);
      return;
    }

    for (const child of Array.from(node.children)) {
      collectBlocks(child);
    }
  }

  collectBlocks(doc.body);

  // 3. Process blocks into Questions
  const questions: (MCQQuestion & { section?: string; qNumber?: number })[] = [];
  const sectionQuestions: Record<string, MCQQuestion[]> = {};

  let currentSection = "सामान्य";
  let currentQ: (MCQQuestion & { section: string; qNumber: number }) | null = null;

  const flushCurrentQ = () => {
    if (currentQ && currentQ.question) {
      while (currentQ.options.length < 4) {
        currentQ.options.push("");
      }
      currentQ.options = currentQ.options.slice(0, 4);

      if (currentQ.correctIndex === undefined || currentQ.correctIndex < 0 || currentQ.correctIndex > 3) {
        const bySubject = answerKeyMap[`${currentQ.section}_${currentQ.qNumber}`];
        const byCol = answerKeyMap[`col_${currentQ.qNumber}`];
        const byQNum = answerKeyMap[`q_${currentQ.qNumber}`];

        if (bySubject !== undefined) currentQ.correctIndex = bySubject;
        else if (byCol !== undefined) currentQ.correctIndex = byCol;
        else if (byQNum !== undefined) currentQ.correctIndex = byQNum;
        else currentQ.correctIndex = 0;
      }

      const qItem: MCQQuestion = {
        id: currentQ.id,
        question: currentQ.question.trim(),
        options: currentQ.options.map((o) => o.trim()),
        correctIndex: currentQ.correctIndex,
        explanation: currentQ.explanation?.trim() || "",
        marks: 1,
      };

      questions.push({ ...qItem, section: currentQ.section, qNumber: currentQ.qNumber });

      if (!sectionQuestions[currentQ.section]) {
        sectionQuestions[currentQ.section] = [];
      }
      sectionQuestions[currentQ.section].push(qItem);

      currentQ = null;
    }
  };

  for (let i = 0; i < blocks.length; i++) {
    const rawLine = blocks[i].replace(/\u00a0/g, " ").trim();
    if (!rawLine) continue;

    // Detect Title / Header
    if (rawLine.includes("इयत्ता") || rawLine.includes("परीक्षा") || rawLine.includes("प्रश्नपत्रिका")) {
      if (!title && !rawLine.includes("नाव") && !rawLine.includes("सूचना")) {
        title = rawLine.replace(/[|]/g, "").trim();
      }
      if (!detectedClass) {
        detectedClass = detectClassFromText(rawLine);
      }
      if (rawLine.includes("सेमी") || rawLine.toLowerCase().includes("semi")) {
        detectedMedium = "semi";
      }
    }

    // Detect Section Header: e.g. "| भाग 1 : मराठी |", "विभाग २ : गणित"
    const secMatch = rawLine.match(/(?:\|?\s*(?:भाग|विभाग|विषय)\s*[0-9०-९]*\s*[:\-]\s*([^|]+)\s*\|?)/i);
    if (secMatch && !rawLine.includes("विद्यार्थ्याचे") && !rawLine.includes("एकूण प्रश्न")) {
      flushCurrentQ();
      currentSection = secMatch[1].trim();
      continue;
    }

    // Check if line is Answer Key header or title
    if (rawLine.includes("उत्तरसूची") || rawLine.includes("Answer Key")) {
      flushCurrentQ();
      continue;
    }

    // Check if line has inline answer: e.g. "उत्तर : (2) रवी" or "उत्तर : 2"
    const ansMatch = rawLine.match(/(?:उत्तर|Ans(?:wer)?|योग्य पर्याय)\s*[:=\-]\s*\(?([1-4१-४A-Da-dअ-ड])\)?(?:\s*(.*))?/i);
    if (ansMatch && currentQ) {
      const rawAns = toWesternNum(ansMatch[1]);
      let optIdx = 0;
      if (/[1-4]/.test(rawAns)) optIdx = parseInt(rawAns, 10) - 1;
      else if (/[A-Da-d]/.test(rawAns)) optIdx = rawAns.toUpperCase().charCodeAt(0) - 65;
      else if (rawAns === "अ") optIdx = 0;
      else if (rawAns === "ब") optIdx = 1;
      else if (rawAns === "क") optIdx = 2;
      else if (rawAns === "ड") optIdx = 3;

      currentQ.correctIndex = optIdx;
      if (ansMatch[2]) currentQ.explanation = ansMatch[2].trim();
      continue;
    }

    // Check if line starts with question number: e.g. "1) ...", "1. ...", "१) ...", "Q.1 ..."
    // Note: Question NEVER starts with (1) - options start with (1)!
    const isStartsStrictlyWithOption = /^\s*\([1-4१-४A-Da-dअ-ड]\)/.test(rawLine);
    const qMatch = !isStartsStrictlyWithOption && rawLine.match(/^(?:(?:प्र(?:श्न)?|Q(?:uestion)?)\s*[\s.]*)?([0-9०-९]+)[\s.)\-]+(.*)/i);

    if (qMatch && !rawLine.includes("विद्यार्थ्याचे") && !rawLine.includes("एकूण प्रश्न")) {
      flushCurrentQ();
      const qNum = parseInt(toWesternNum(qMatch[1]), 10);
      currentQ = {
        id: `q_${Date.now()}_${questions.length + 1}`,
        qNumber: qNum,
        section: currentSection,
        question: qMatch[2].trim(),
        options: [],
        correctIndex: -1,
        explanation: "",
        marks: 1,
      };
      continue;
    }

    // Check if line has options: e.g. "(1) चंद्र (2) रवी"
    const foundOptions = extractOptionsFromText(rawLine);
    if (foundOptions.length > 0 && currentQ) {
      for (const fo of foundOptions) {
        const rawLabel = toWesternNum(fo.label);
        let optIdx = currentQ.options.length;
        if (/[1-4]/.test(rawLabel)) optIdx = parseInt(rawLabel, 10) - 1;
        else if (/[A-Da-d]/.test(rawLabel)) optIdx = rawLabel.toUpperCase().charCodeAt(0) - 65;
        else if (rawLabel === "अ") optIdx = 0;
        else if (rawLabel === "ब") optIdx = 1;
        else if (rawLabel === "क") optIdx = 2;
        else if (rawLabel === "ड") optIdx = 3;

        currentQ.options[optIdx] = fo.text;
      }
      continue;
    }

    // If we have an active question with no options yet, append line to question text
    if (currentQ && currentQ.options.length === 0) {
      if (!rawLine.startsWith("सूचना") && !rawLine.startsWith("विद्यार्थ्या")) {
        currentQ.question += " " + rawLine;
      }
    }
  }

  flushCurrentQ();

  if (!title && fileName) {
    title = fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
  }

  return {
    title: title || "दैनिक MCQ सराव स्वाध्याय",
    detectedClass,
    detectedMedium,
    totalQuestions: questions.length,
    sections: Object.keys(sectionQuestions),
    questions: questions.map(({ section, qNumber, ...rest }) => rest),
    sectionQuestions,
  };
}

/**
 * Parses raw text extracted from Word or pasted by user
 */
export function parseMCQRawText(rawText: string, fileName?: string): ParsedMCQResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let title = "";
  let detectedClass = "";
  let detectedMedium: "marathi" | "semi" = "marathi";

  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const l = lines[i];
    if (!title && (l.includes("परीक्षा") || l.includes("प्रश्नपत्रिका") || l.includes("स्वाध्याय") || l.includes("शिष्यवृत्ती"))) {
      title = l.replace(/[|]/g, "").trim();
    }
    if (!detectedClass && l.includes("इयत्ता")) {
      detectedClass = detectClassFromText(l);
    }
    if (l.includes("सेमी") || l.toLowerCase().includes("semi")) {
      detectedMedium = "semi";
    }
  }

  if (!title && fileName) {
    title = fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
  }

  // Separate question lines from answer key lines
  const questionLines: string[] = [];
  const answerKeyLines: string[] = [];
  let inAnswerKey = false;

  for (const line of lines) {
    if (/^(?:\|?\s*(?:उत्तरसूची|उत्तरपत्रिका|Answer\s*Key)\s*\|?)/i.test(line)) {
      inAnswerKey = true;
      continue;
    }
    if (inAnswerKey) {
      answerKeyLines.push(line);
    } else {
      questionLines.push(line);
    }
  }

  // Parse Answer Key
  const answerKeyMap: Record<string, number> = {};

  for (const aLine of answerKeyLines) {
    if (aLine.includes("|")) {
      const cells = aLine.split("|").map((c) => c.trim()).filter(Boolean);
      if (cells.length > 2) {
        const subjectName = cells[0];
        if (subjectName.includes("विषय") || subjectName.includes("प्रश्न")) continue;

        for (let colIdx = 1; colIdx < cells.length; colIdx++) {
          const val = toWesternNum(cells[colIdx]).trim();
          const optNum = parseInt(val, 10);
          if (!isNaN(optNum) && optNum >= 1 && optNum <= 4) {
            answerKeyMap[`${subjectName}_${colIdx}`] = optNum - 1;
            answerKeyMap[`col_${colIdx}`] = optNum - 1;
          }
        }
      }
    } else {
      const matches = aLine.matchAll(/(?:([0-9०-९]+)[\s:.\-\)]+([1-4१-४A-Da-dअ-ड]))/g);
      for (const m of matches) {
        const qNum = parseInt(toWesternNum(m[1]), 10);
        const rawAns = toWesternNum(m[2]);
        let optIdx = 0;
        if (/[1-4]/.test(rawAns)) optIdx = parseInt(rawAns, 10) - 1;
        else if (/[A-Da-d]/.test(rawAns)) optIdx = rawAns.toUpperCase().charCodeAt(0) - 65;
        else if (rawAns === "अ") optIdx = 0;
        else if (rawAns === "ब") optIdx = 1;
        else if (rawAns === "क") optIdx = 2;
        else if (rawAns === "ड") optIdx = 3;

        answerKeyMap[`q_${qNum}`] = optIdx;
      }
    }
  }

  // Parse Questions
  const questions: (MCQQuestion & { section?: string; qNumber?: number })[] = [];
  const sectionQuestions: Record<string, MCQQuestion[]> = {};

  let currentSection = "सामान्य";
  let currentQ: (MCQQuestion & { section: string; qNumber: number }) | null = null;

  const flushCurrentQ = () => {
    if (currentQ && currentQ.question) {
      while (currentQ.options.length < 4) {
        currentQ.options.push("");
      }
      currentQ.options = currentQ.options.slice(0, 4);

      if (currentQ.correctIndex === undefined || currentQ.correctIndex < 0 || currentQ.correctIndex > 3) {
        const bySubject = answerKeyMap[`${currentQ.section}_${currentQ.qNumber}`];
        const byCol = answerKeyMap[`col_${currentQ.qNumber}`];
        const byQNum = answerKeyMap[`q_${currentQ.qNumber}`];

        if (bySubject !== undefined) currentQ.correctIndex = bySubject;
        else if (byCol !== undefined) currentQ.correctIndex = byCol;
        else if (byQNum !== undefined) currentQ.correctIndex = byQNum;
        else currentQ.correctIndex = 0;
      }

      const qItem: MCQQuestion = {
        id: currentQ.id,
        question: currentQ.question.trim(),
        options: currentQ.options.map((o) => o.trim()),
        correctIndex: currentQ.correctIndex,
        explanation: currentQ.explanation?.trim() || "",
        marks: 1,
      };

      questions.push({ ...qItem, section: currentQ.section, qNumber: currentQ.qNumber });

      if (!sectionQuestions[currentQ.section]) {
        sectionQuestions[currentQ.section] = [];
      }
      sectionQuestions[currentQ.section].push(qItem);

      currentQ = null;
    }
  };

  for (let i = 0; i < questionLines.length; i++) {
    const line = questionLines[i];

    const sectionMatch = line.match(/(?:\|?\s*(?:भाग|विभाग|विषय)\s*[0-9०-९]*\s*[:\-]\s*([^|]+)\s*\|?)/i);
    if (sectionMatch && !line.includes("विद्यार्थ्याचे") && !line.includes("एकूण प्रश्न")) {
      flushCurrentQ();
      currentSection = sectionMatch[1].trim();
      continue;
    }

    const ansMatch = line.match(/(?:उत्तर|Ans(?:wer)?|योग्य पर्याय)\s*[:=\-]\s*\(?([1-4१-४A-Da-dअ-ड])\)?(?:\s*(.*))?/i);
    if (ansMatch && currentQ) {
      const rawAns = toWesternNum(ansMatch[1]);
      let optIdx = 0;
      if (/[1-4]/.test(rawAns)) optIdx = parseInt(rawAns, 10) - 1;
      else if (/[A-Da-d]/.test(rawAns)) optIdx = rawAns.toUpperCase().charCodeAt(0) - 65;
      else if (rawAns === "अ") optIdx = 0;
      else if (rawAns === "ब") optIdx = 1;
      else if (rawAns === "क") optIdx = 2;
      else if (rawAns === "ड") optIdx = 3;

      currentQ.correctIndex = optIdx;
      if (ansMatch[2]) currentQ.explanation = ansMatch[2].trim();
      continue;
    }

    const isStartsStrictlyWithOption = /^\s*\([1-4१-४A-Da-dअ-ड]\)/.test(line);
    const qMatch = !isStartsStrictlyWithOption && line.match(/^(?:(?:प्र(?:श्न)?|Q(?:uestion)?)\s*[\s.]*)?([0-9०-९]+)[\s.)\-]+(.*)/i);

    if (qMatch && !line.includes("विद्यार्थ्याचे") && !line.includes("एकूण प्रश्न")) {
      flushCurrentQ();
      const qNum = parseInt(toWesternNum(qMatch[1]), 10);
      currentQ = {
        id: `q_${Date.now()}_${questions.length + 1}`,
        qNumber: qNum,
        section: currentSection,
        question: qMatch[2].trim(),
        options: [],
        correctIndex: -1,
        explanation: "",
        marks: 1,
      };
      continue;
    }

    const foundOptions = extractOptionsFromText(line);
    if (foundOptions.length > 0 && currentQ) {
      for (const fo of foundOptions) {
        const rawLabel = toWesternNum(fo.label);
        let optIdx = currentQ.options.length;
        if (/[1-4]/.test(rawLabel)) optIdx = parseInt(rawLabel, 10) - 1;
        else if (/[A-Da-d]/.test(rawLabel)) optIdx = rawLabel.toUpperCase().charCodeAt(0) - 65;
        else if (rawLabel === "अ") optIdx = 0;
        else if (rawLabel === "ब") optIdx = 1;
        else if (rawLabel === "क") optIdx = 2;
        else if (rawLabel === "ड") optIdx = 3;

        currentQ.options[optIdx] = fo.text;
      }
      continue;
    }

    if (currentQ && currentQ.options.length === 0) {
      if (!line.startsWith("सूचना") && !line.startsWith("विद्यार्थ्या")) {
        currentQ.question += " " + line;
      }
    }
  }

  flushCurrentQ();

  return {
    title: title || "दैनिक MCQ सराव स्वाध्याय",
    detectedClass,
    detectedMedium,
    totalQuestions: questions.length,
    sections: Object.keys(sectionQuestions),
    questions: questions.map(({ section, qNumber, ...rest }) => rest),
    sectionQuestions,
  };
}

/**
 * Extracts and parses MCQs from a Word (.docx) File
 */
export async function parseMCQWordFile(file: File): Promise<ParsedMCQResult> {
  const arrayBuffer = await file.arrayBuffer();
  const mammoth = await import("mammoth");

  // 1. Try HTML conversion first (DOM parser handles tables & answer keys accurately)
  let html = "";
  try {
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
    html = htmlResult.value || "";
  } catch (err) {
    console.warn("mammoth convertToHtml failed", err);
  }

  // 2. Try raw text extraction as fallback
  let rawText = "";
  try {
    const textResult = await mammoth.extractRawText({ arrayBuffer });
    rawText = textResult.value || "";
  } catch (err) {
    console.warn("mammoth extractRawText failed", err);
  }

  // Run DOM parser if in browser and html exists
  if (html && typeof window !== "undefined" && typeof DOMParser !== "undefined") {
    try {
      const dom = new DOMParser().parseFromString(html, "text/html");
      const htmlRes = parseMCQFromDOM(dom, file.name);
      if (htmlRes.questions.length > 0) {
        return htmlRes;
      }
    } catch (e) {
      console.warn("DOM parsing error, falling back to raw text:", e);
    }
  }

  // Fallback to raw text parser
  if (rawText.trim()) {
    const textRes = parseMCQRawText(rawText, file.name);
    if (textRes.questions.length > 0) {
      return textRes;
    }
  }

  throw new Error("Word फाईलमधून प्रश्न ओळखता आले नाहीत. कृपया प्रश्नांचे फॉरमॅट 1), 2) आणि पर्यायांचे फॉरमॅट (1), (2), (3), (4) असल्याची खात्री करा.");
}

/**
 * Convenience method for direct pasted text
 */
export function parseMCQPastedText(pastedText: string): ParsedMCQResult {
  return parseMCQRawText(pastedText);
}
