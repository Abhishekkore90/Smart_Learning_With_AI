import JSZip from "jszip";

export interface VmlParsedShape {
  text: string;
  leftPct: number;
  topPct: number;
  widthPct: number;
  minHeightPct: number;
  fontSizePt: number;
  isBold: boolean;
  isItalic: boolean;
  color: string;
  align: "left" | "center" | "right" | "justify";
  fontFamily: string;
}

export interface VmlParsedPage {
  pageNumber: number;
  bgDataUrl?: string;
  shapes: VmlParsedShape[];
}

/**
 * Checks if a Word (.docx) file is composed of full-page background images + VML textboxes.
 * This pattern is widely used in question papers with custom decorative borders, frames, and illustration backgrounds.
 */
export async function isVmlDocx(arrayBuffer: ArrayBuffer): Promise<boolean> {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docXml = zip.file("word/document.xml");
    if (!docXml) return false;
    const xml = await docXml.async("string");

    const hasVmlShapes = xml.includes("<v:shape") && xml.includes("position:absolute");
    // Ensure it has full-page drawings (cx >= 5000000 && cy >= 7000000)
    const hasFullPageDrawing = /<wp:extent[^>]*cx="([5-9][0-9]{6}|[1-9][0-9]{7})"[^>]*cy="([7-9][0-9]{6}|[1-9][0-9]{7})"/i.test(xml);

    return hasVmlShapes && hasFullPageDrawing;
  } catch (err) {
    console.warn("isVmlDocx check failed:", err);
    return false;
  }
}

/**
 * Parses full-page background design borders and positioned textboxes from a Word (.docx) file.
 * Returns clean, 100% responsive HTML with editable text boxes positioned over the exact original borders.
 */
export async function parseVmlDocxToHtml(arrayBuffer: ArrayBuffer): Promise<string | null> {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docXml = zip.file("word/document.xml");
    if (!docXml) return null;
    const xml = await docXml.async("string");

    // Read relationships to map rId to media files (e.g. rId9 -> media/image1.png)
    const rels: Record<string, string> = {};
    const relsFile = zip.file("word/_rels/document.xml.rels");
    if (relsFile) {
      const relsXml = await relsFile.async("string");
      const relRegex = /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g;
      let rMatch: RegExpExecArray | null;
      while ((rMatch = relRegex.exec(relsXml)) !== null) {
        rels[rMatch[1]] = rMatch[2];
      }
    }

    // Split document by drawing sections (each drawing corresponds to a page background)
    const drawingParts = xml.split(/<w:drawing/);
    if (drawingParts.length <= 1) {
      return null;
    }

    // Dynamic page size from document XML (twips / 20 = pt)
    const pgSzMatch = xml.match(/<w:pgSz[^>]*w:w="([0-9]+)"[^>]*w:h="([0-9]+)"/);
    const docPageWidthPt = pgSzMatch ? parseInt(pgSzMatch[1], 10) / 20 : 612;
    const docPageHeightPt = pgSzMatch ? parseInt(pgSzMatch[2], 10) / 20 : 792;

    const pagesHtml: string[] = [];

    // Process each page
    for (let pIdx = 1; pIdx < drawingParts.length; pIdx++) {
      const part = drawingParts[pIdx];

      // Check if page part has specific page size
      const partPgSzMatch = part.match(/<w:pgSz[^>]*w:w="([0-9]+)"[^>]*w:h="([0-9]+)"/);
      const pageWidthPt = partPgSzMatch ? parseInt(partPgSzMatch[1], 10) / 20 : docPageWidthPt;
      const pageHeightPt = partPgSzMatch ? parseInt(partPgSzMatch[2], 10) / 20 : docPageHeightPt;

      // 1. Extract background image
      const rId = part.match(/r:embed="([^"]+)"/)?.[1];
      let bgDataUrl = "";
      if (rId && rels[rId]) {
        const mediaPath = "word/" + rels[rId].replace(/^\/?/, "");
        const imgFile = zip.file(mediaPath);
        if (imgFile) {
          const imgBase64 = await imgFile.async("base64");
          const ext = mediaPath.endsWith(".jpg") || mediaPath.endsWith(".jpeg") ? "jpeg" : "png";
          bgDataUrl = `data:image/${ext};base64,${imgBase64}`;
        }
      }

      // 2. Extract all VML text shapes on this page
      const shapes = part.match(/<v:shape[\s\S]*?<\/v:shape>/g) || [];
      const shapesHtml: string[] = [];

      // Detect subject from all text on this page
      const allPageTextParts = shapes.map((s) => {
        const tRuns = s.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
        return tRuns.map((t) => t.replace(/<[^>]+>/g, "")).join("");
      });
      const allPageRawText = allPageTextParts.join(" ");

      let subjectKey: "marathi" | "english" | "math" | "semi" | "other" = "other";
      let subjectLabel = "सामान्य विभाग";

      if (/भाषा|मराठी|जोड्या जुळव|अक्षराला गोल कर|शब्द वाच|गिरव/i.test(allPageRawText)) {
        subjectKey = "marathi";
        subjectLabel = "मराठी विभाग (प्रथम भाषा)";
      } else if (/english|oral\s*&amp;\s*practical|listen and act/i.test(allPageRawText)) {
        subjectKey = "english";
        subjectLabel = "इंग्रजी विभाग (English)";
      } else if (/गणित|संख्या|चित्रे मोज|मोठ्या गाडीखालील/i.test(allPageRawText)) {
        subjectKey = "math";
        subjectLabel = "गणित विभाग (Mathematics)";
      } else if (/FORMATIVE EVALUATION|SUB\s*[-–]\s*MATH|Qu\.|Write numbers/i.test(allPageRawText)) {
        subjectKey = "semi";
        subjectLabel = "Semi-English विभाग (Semi Math)";
      }

      // Detect total marks from all text/shapes on this page
      let pageTotalMarks = "२०";
      for (const s of shapes) {
        const tRuns = s.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
        const txt = tRuns.map((t) => t.replace(/<[^>]+>/g, "")).join(" ");
        const marksMatch = txt.match(/(?:एकूण\s*गुण|total\s*marks)\s*[:\-–—]?\s*([०-९0-9]+)/i);
        if (marksMatch && marksMatch[1]) {
          pageTotalMarks = marksMatch[1].trim();
          break;
        }
      }

      // Check if this page has the full school header box (shown in third image)
      const hasSchoolNameOnPage = shapes.some((s) => {
        const tRuns = s.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
        const txt = tRuns.map((t) => t.replace(/<[^>]+>/g, "")).join(" ");
        const sTop = parseFloat(s.match(/margin-top:([0-9.]+)pt/)?.[1] || "999");
        return (
          txt.includes("शाळेचे नाव") ||
          /school\s*name/i.test(txt) ||
          /name\s*of\s*school/i.test(txt) ||
          (sTop < 45 && /\bschool\b/i.test(txt))
        );
      });

      const hasStudentOrStdOnPage = shapes.some((s) => {
        const tRuns = s.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
        const txt = tRuns.map((t) => t.replace(/<[^>]+>/g, "")).join(" ");
        return (
          txt.includes("विद्यार्थ्याचे नाव") ||
          txt.includes("विद्यार्थी") ||
          txt.includes("इयत्ता") ||
          txt.includes("दि.") ||
          /student|std|class|date/i.test(txt)
        );
      });

      const hasSchoolHeader = pIdx === 1 || (hasSchoolNameOnPage && hasStudentOrStdOnPage);

      // Extract all header metadata from Word document's shapes before skipping them
      let headerSchoolName = "";
      let headerKendra = "";
      let headerTaluka = "";
      let headerJilha = "";
      let headerExamTitle = "";
      let headerClass = "";
      let headerSubject = "";
      let headerTotalMarks = "";
      let headerDate = "";

      for (const s of shapes) {
        const tRuns = s.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
        const raw = tRuns.map((t) => t.replace(/<[^>]+>/g, "")).join(" ");
        const txt = decodeXmlEntities(raw).trim();
        if (!txt) continue;

        const sTop = parseFloat(s.match(/margin-top:([0-9.]+)pt/)?.[1] || "999");
        const topRatio = sTop / pageHeightPt;

        if (topRatio < 0.255) {
          // School Name
          if (!headerSchoolName && (txt.includes("शाळेचे नाव") || /school\s*name/i.test(txt))) {
            const clean = txt
              .replace(/^(?:शाळेचे\s*नाव|school\s*name)\s*[:\-–—]?\s*/i, "")
              .replace(/^[_.\s\-–—]+$/, "")
              .trim();
            if (clean) headerSchoolName = clean;
          }

          // Kendra, Taluka, Jilha
          if (!headerKendra && (txt.includes("केंद्र") || txt.includes("केंद्र-"))) {
            const m = txt.match(/केंद्र\s*[:\-–—]?\s*([^\s|•,]+)/i);
            if (m && m[1]) headerKendra = m[1].trim();
          }
          if (!headerTaluka && (txt.includes("तालुका") || txt.startsWith("ता.") || txt.includes("ता."))) {
            const m = txt.match(/(?:तालुका|ता\.)\s*[:\-–—]?\s*([^\s|•,]+)/i);
            if (m && m[1]) headerTaluka = m[1].trim();
          }
          if (!headerJilha && (txt.includes("जिल्हा") || txt.startsWith("जि.") || txt.includes("जि."))) {
            const m = txt.match(/(?:जिल्हा|जि\.)\s*[:\-–—]?\s*([^\s|•,]+)/i);
            if (m && m[1]) headerJilha = m[1].trim();
          }

          // Exam Title
          if (!headerExamTitle && (txt.includes("मूल्यमापन") || txt.includes("चाचणी") || txt.includes("परीक्षा") || /test|exam|evaluation/i.test(txt)) && sTop < 80) {
            headerExamTitle = txt;
          }

          // Class
          if (!headerClass && (txt.includes("इयत्ता") || /std|class/i.test(txt))) {
            const m = txt.match(/इयत्ता\s*[-:–—]?\s*([०-९0-9]+(?:\s*(?:ली|री|थी|वी))?|पहिली|दुसरी|तिसरी|चौथी|पाचवी|सहावी|सातवी|आठवी|[१-८])/i);
            if (m) headerClass = m[0].trim();
          }

          // Subject
          if (!headerSubject && txt.includes("विषय")) {
            const m = txt.match(/विषय\s*[-:–—]?\s*([^\n\r,•()]+)/i);
            if (m && m[1]?.trim()) headerSubject = m[1].trim();
          }

          // Total Marks
          if (!headerTotalMarks) {
            const m = txt.match(/(?:एकूण\s*गुण|total\s*marks)\s*[:\-–—]?\s*\[?\s*([०-९0-9]+)\s*\]?/i);
            if (m && m[1]) headerTotalMarks = m[1].trim();
          }

          // Date
          if (!headerDate && (txt.includes("दि.") || txt.includes("दिनांक") || /date/i.test(txt))) {
            const m = txt.match(/(?:दिनांक|दि\.?|date)\s*[:\-–—]?\s*([0-9०-९\/\-.]+)/i);
            if (m && m[1]) headerDate = m[1].trim();
          }
        }
      }

      let schoolNameShapeTop = 999;
      let studentNameShapeTop = -1;
      shapes.forEach((s) => {
        const tRuns = s.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
        const txt = tRuns.map((t) => t.replace(/<[^>]+>/g, "")).join(" ");
        const sTop = parseFloat(s.match(/margin-top:([0-9.]+)pt/)?.[1] || "999");
        if (txt.includes("शाळेचे नाव") || /school\s*name/i.test(txt)) {
          schoolNameShapeTop = Math.min(schoolNameShapeTop, sTop);
        }
        if (txt.includes("विद्यार्थ्याचे नाव") || /student\s*name/i.test(txt)) {
          studentNameShapeTop = Math.max(studentNameShapeTop, sTop);
        }
      });

      // Detect if this page has an inline school header (Line 4) like Class 3 & 4
      const allPageText = shapes.map((s) => {
        const tRuns = s.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
        return tRuns.map((t) => t.replace(/<[^>]+>/g, "")).join(" ");
      }).join(" ");

      const isInlineSchoolHeader =
        hasSchoolHeader &&
        ((schoolNameShapeTop > 65 && (studentNameShapeTop < 0 || schoolNameShapeTop > studentNameShapeTop)) ||
          allPageText.includes("इयत्ता- तिसरी") ||
          allPageText.includes("इयत्ता- चौथी") ||
          allPageText.includes("इयत्ता - ३") ||
          allPageText.includes("इयत्ता - ४") ||
          allPageText.includes("३री") ||
          allPageText.includes("४थी"));

      for (const s of shapes) {
        const styleStr = s.match(/style="([^"]+)"/)?.[1] || "";
        const leftMatch = styleStr.match(/margin-left:([0-9.]+)pt/);
        const topMatch = styleStr.match(/margin-top:([0-9.]+)pt/);
        const widthMatch = styleStr.match(/width:([0-9.]+)pt/);
        const heightMatch = styleStr.match(/height:([0-9.]+)pt/);

        // Extract text runs first to check text content
        const textRuns = s.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
        const rawText = textRuns.map((t) => t.replace(/<[^>]+>/g, "")).join("");
        if (!rawText.trim() && !s.includes("<w:br")) {
          // If shape is empty and has no line break, skip unless it's an answer box
          continue;
        }

        // Decode XML entities from Word XML so < and > aren't double escaped
        const decodedText = decodeXmlEntities(rawText);
        const trimmedText = decodedText.trim();

        const leftPt = leftMatch ? parseFloat(leftMatch[1]) : 0;
        const topPt = topMatch ? parseFloat(topMatch[1]) : 0;
        let widthPt = widthMatch ? parseFloat(widthMatch[1]) : 120;
        let heightPt = heightMatch ? parseFloat(heightMatch[1]) : 32;

        const topRatio = topPt / pageHeightPt;
        const leftRatio = leftPt / pageWidthPt;

        const isQ =
          trimmedText.includes("प्रश्न") ||
          trimmedText.includes("प्र.") ||
          /q(?:ue)?\.?\s*[0-9]/i.test(trimmedText) ||
          /^[०-९0-9]+\s*[\)\.]\s*(?:कंसातील|योग्य|रिकाम्या|खालील|जोड्या|एका)/.test(trimmedText);

        // USER INSTRUCTION: Keep the Word document's header box completely blank/empty!
        // Do not add any of the Word file's old shapes, dots, lines or boxes in the header area (< 0.255).
        // Our unified structure will be placed in that blank box with the fetched info.
        if (hasSchoolHeader && topRatio < 0.255 && !isQ) {
          continue;
        }

        let fieldAttr = "";
        let extraBoxStyle = "";

        let shapeInnerHtml = escapeHtml(decodedText);

        const isSchoolNameText =
          trimmedText.includes("शाळेचे नाव") ||
          /school\s*name/i.test(trimmedText) ||
          /name\s*of\s*school/i.test(trimmedText) ||
          (topPt < 40 && /\bschool\b/i.test(trimmedText));

        if (isSchoolNameText) {
          fieldAttr = 'data-field="school-name"';
          if (isInlineSchoolHeader) {
            fieldAttr += ' data-field-mode="inline"';
            widthPt = Math.max(widthPt, 320);
            extraBoxStyle = "z-index: 10; white-space: normal !important; overflow: visible !important; display: flex; align-items: flex-start;";
          } else {
            // Span box comfortably up to ~81.2% inside the border (497pt / 612pt)
            widthPt = Math.max(widthPt, 497);
            heightPt = 28;
            extraBoxStyle = "z-index: 10; white-space: normal !important; overflow: visible !important; display: flex; align-items: flex-start; max-width: 81.2% !important;";
          }

          const isEng = /school/i.test(trimmedText) || !trimmedText.includes("शाळेचे");
          const cleanName = trimmedText
            .replace(/^(?:शाळेचे\s*नाव|school\s*name)\s*[:\-–—]?\s*/i, "")
            .replace(/^[_.\s\-–—]+$/, "")
            .trim();

          const label = isEng ? "SCHOOL NAME -" : "शाळेचे नाव :";

          if (isInlineSchoolHeader) {
            const inlineLabel = isEng ? "SCHOOL NAME -" : "शाळेचे नाव-";
            if (cleanName) {
              shapeInnerHtml = `<span style="background: #ffffff; padding: 0 2px; white-space: nowrap;"><strong>${inlineLabel} </strong><span class="qp-school-text" style="font-weight: 700; color: #0f172a; margin-left: 4px;">${escapeHtml(cleanName)}</span></span>`;
            } else {
              shapeInnerHtml = `<span style="background: #ffffff; padding: 0 2px; white-space: nowrap;"><strong>${inlineLabel} </strong><span style="display: inline-block; width: 160px; border-bottom: 1.5px dotted #94a3b8; margin-left: 4px; height: 1em; vertical-align: middle;"></span></span>`;
            }
          } else {
            if (cleanName) {
              shapeInnerHtml = `<div class="qp-school-name-block" style="background: #ffffff; padding: 0 2px; display: block; flex: 1; min-width: 0; margin-right: 14px; overflow: visible;"><strong style="white-space: nowrap; color: #0f172a;">${label} </strong><span class="qp-school-text" style="font-weight: 700; color: #0f172a; margin-left: 6px; white-space: normal; word-break: break-word;" title="${escapeHtml(cleanName)}">${escapeHtml(cleanName)}</span></div>`;
            } else {
              shapeInnerHtml = `<div class="qp-school-name-block" style="background: #ffffff; padding: 0 2px; display: block; flex: 1; min-width: 0; margin-right: 14px; overflow: visible;"><strong style="white-space: nowrap; color: #0f172a;">${label} </strong><span style="display: inline-block; width: 140px; border-bottom: 1.5px dotted #94a3b8; margin-left: 6px; height: 1em; vertical-align: middle;"></span></div>`;
            }
          }
        } else if (
          (trimmedText.includes("चाचणी") || trimmedText.includes("मूल्यमापन") || trimmedText.includes("परीक्षा") || /test|evaluation/i.test(trimmedText)) &&
          topPt < 65
        ) {
          fieldAttr = 'data-field="exam-title"';
          extraBoxStyle = "z-index: 10; overflow: visible !important;";
        } else if (
          (trimmedText.includes("दि.") || trimmedText.includes("दिनांक") || /date\s*[:\-–—]?/i.test(trimmedText)) &&
          (trimmedText.includes("२०२") || trimmedText.includes("202") || trimmedText.includes("/"))
        ) {
          fieldAttr = 'data-field="exam-date"';
          widthPt = Math.max(widthPt, 160);
          heightPt = 28;
          extraBoxStyle = "z-index: 10; white-space: nowrap !important; overflow: visible !important;";
        }

        if (isInlineSchoolHeader && topPt < 200) {
          // Line 5: Kendra, Taluka, Jilha strictly before topPt 160
          if (topPt < 160) {
            if (trimmedText.startsWith("केंद्र") || trimmedText.includes("केंद्र-")) {
              fieldAttr = 'data-field="kendra-name"';
              extraBoxStyle += " width: auto !important; min-width: 90px !important; z-index: 10; white-space: nowrap !important; overflow: visible !important;";
            } else if (trimmedText === "ता." || trimmedText.startsWith("ता.")) {
              fieldAttr = 'data-field="taluka-name"';
              extraBoxStyle += " width: auto !important; min-width: 90px !important; z-index: 10; white-space: nowrap !important; overflow: visible !important;";
            } else if (trimmedText === "जि." || trimmedText.startsWith("जि.")) {
              fieldAttr = 'data-field="jilha-name"';
              extraBoxStyle += " width: auto !important; min-width: 90px !important; z-index: 10; white-space: nowrap !important; overflow: visible !important;";
            }
          }
          // Line 6: Teacher signature strictly at or below topPt 160
          else if (topPt >= 160) {
            if (trimmedText.includes("शिक्षकांची स्वाक्षरी") || trimmedText.includes("स्वाक्षरी-")) {
              fieldAttr = 'data-field="teacher-sign"';
              extraBoxStyle += " width: auto !important; min-width: 140px !important; z-index: 10; white-space: nowrap !important; overflow: visible !important;";
            }
          }
        }

        let leftPct = Math.max(0, Math.min(99.5, (leftPt / pageWidthPt) * 100));
        let topPct = Math.max(0, Math.min(99.5, (topPt / pageHeightPt) * 100));
        let widthPct = Math.max(1, Math.min(100 - leftPct, (widthPt / pageWidthPt) * 100));
        let heightPct = (heightPt / pageHeightPt) * 100;

        if (isSchoolNameText) {
          if (!isInlineSchoolHeader) {
            leftPct = 10.458;
            topPct = 2.3;
            widthPct = 81.2;
            heightPct = 3.66;
          }
        } else if (fieldAttr === 'data-field="exam-title"') {
          if (!isInlineSchoolHeader) {
            topPct = 6.8;
          }
        }

        // Font formatting
        const isBold = s.includes("<w:b/>") || s.includes("<w:b ");
        const isItalic = s.includes("<w:i/>") || s.includes("<w:i ");
        const isCenter = s.includes('w:jc w:val="center"');
        const isRight = s.includes('w:jc w:val="right"');
        const align = isCenter ? "center" : isRight ? "right" : "left";
        const justifyCss = isCenter ? "center" : isRight ? "flex-end" : "flex-start";

        const szMatch = s.match(/<w:sz w:val="([0-9]+)"/);
        const fontSizePt = szMatch ? parseInt(szMatch[1], 10) / 2 : 14;
        const fontSizeCqw = ((fontSizePt / pageWidthPt) * 100).toFixed(3);

        const colorMatch = s.match(/<w:color w:val="([0-9A-Fa-f]{6})"/);
        const color = colorMatch ? `#${colorMatch[1]}` : "#0f172a";

        // Font family (Devanagari font preference)
        const fontMatch = s.match(/<w:rFonts[^>]*w:cs="([^"]+)"/) || s.match(/<w:rFonts[^>]*w:ascii="([^"]+)"/);
        const docFont = fontMatch ? fontMatch[1] : "";
        const fontFamily = docFont
          ? `'${docFont}', 'Noto Sans Devanagari', 'Tiro Devanagari Marathi', 'Nirmala UI', 'Mangal', sans-serif`
          : `'Noto Sans Devanagari', 'Tiro Devanagari Marathi', 'Nirmala UI', 'Mangal', sans-serif`;

        const isSchoolNameField = fieldAttr.includes('data-field="school-name"');

        // 1. Check if shape is a marks indicator, e.g. "(1)", "( 1 )", "(2)", "(3)", "(गुण २)", "( Marks 2 )"
        const isMarksShape =
          /^\s*\(\s*(?:गुण|Marks|marks)?\s*[०-९0-9]+\s*(?:गुण|Marks|marks)?\s*\)\s*$/i.test(trimmedText) ||
          /^\s*\(?\s*(?:गुण|Marks)\s*[:\-–—]?\s*[०-९0-9]+\s*\)?\s*$/i.test(trimmedText);

        // 2. Sub-question indexes, e.g. "1)", "2)", "3)", "4)", "1 )", "A)", "B)"
        const isSubQuestionIndex =
          /^\s*[०-९0-9a-zA-Zअ-ज्ञ]\s*[\)\.\-]\s*$/.test(trimmedText) ||
          /^\s*\(\s*[०-९0-9a-zA-Zअ-ज्ञ]\s*\)\s*$/.test(trimmedText);

        // 3. Table operators with numbers, e.g. "+1", "+2", "-5", "-2", "+ 1"
        const isTableOperatorNum = /^[+\-−±]\s*[०-९0-9]+$/.test(trimmedText);

        // 4. Short math tokens / single digits / operators, e.g. "2", "8", "+", "−", "x", "=", "180°", "70°"
        const isShortMathToken =
          trimmedText.length <= 4 &&
          /^[०-९0-9+\-−±xX=*/÷°\s]+$/.test(trimmedText);

        // 5. Short word / token, e.g. "दह", "ह", "श", "द", "ए"
        const isShortWordToken = trimmedText.length <= 6 && !trimmedText.includes(" ");

        let whiteSpaceRule = "white-space: pre-wrap; word-break: break-word;";
        let shapeAlignItems = "center";
        let shapeLineHeight = "1.35";
        let shapePadding = "0px 2px";

        if (isSchoolNameField) {
          whiteSpaceRule = "white-space: normal !important; overflow: visible !important;";
          shapeAlignItems = "flex-start";
          shapeLineHeight = "1.35";
          shapePadding = "2px 4px";
        } else if (isMarksShape) {
          whiteSpaceRule = "white-space: nowrap !important; word-break: normal !important; overflow: visible !important;";
          shapeAlignItems = "center";
          shapeLineHeight = "1.35";
          shapePadding = "0 2px";
          extraBoxStyle += " min-width: 36px !important; width: auto !important; z-index: 11; justify-content: flex-end !important; text-align: right !important;";
          if (leftRatio > 0.80 || leftPt > pageWidthPt * 0.80) {
            extraBoxStyle += " right: 10.458% !important; left: auto !important;";
          }
        } else if (isSubQuestionIndex) {
          whiteSpaceRule = "white-space: nowrap !important; word-break: normal !important; overflow: visible !important;";
          shapeAlignItems = "center";
          shapeLineHeight = "1.35";
          shapePadding = "0 1px";
          extraBoxStyle += " min-width: 24px !important; width: auto !important; z-index: 10;";
        } else if (isTableOperatorNum) {
          whiteSpaceRule = "white-space: nowrap !important; word-break: normal !important; overflow: visible !important;";
          shapeAlignItems = "center";
          shapeLineHeight = "1.35";
          shapePadding = "0 1px";
          const opMatch = trimmedText.match(/^([+\-−±])\s*([०-९0-9]+)$/);
          if (opMatch) {
            shapeInnerHtml = `${opMatch[1]}&nbsp;${opMatch[2]}`;
          }
          extraBoxStyle += " min-width: 28px !important; width: auto !important; z-index: 10; letter-spacing: 1px !important;";
        } else if (isShortMathToken || isShortWordToken) {
          whiteSpaceRule = "white-space: nowrap !important; word-break: normal !important; overflow: visible !important;";
          shapeAlignItems = "center";
          shapeLineHeight = "1.35";
          shapePadding = "0 1px";
          extraBoxStyle += ` width: auto !important; min-width: ${Math.max(16, widthPt)}px !important; z-index: 10;`;
        }

        shapesHtml.push(`
          <div
            contenteditable="true"
            spellcheck="false"
            ${fieldAttr}
            class="vml-shape-text"
            style="position: absolute; left: ${leftPct.toFixed(3)}%; top: ${topPct.toFixed(3)}%; width: ${widthPct.toFixed(3)}%; height: ${heightPct.toFixed(3)}%; display: flex; align-items: ${shapeAlignItems}; justify-content: ${justifyCss}; font-size: ${fontSizePt}pt; font-size: ${fontSizeCqw}cqw; font-weight: ${isBold ? "bold" : "normal"}; font-style: ${isItalic ? "italic" : "normal"}; color: ${color}; text-align: ${align}; font-family: ${fontFamily}; line-height: ${shapeLineHeight}; padding: ${shapePadding}; box-sizing: border-box; cursor: text; outline: none; ${whiteSpaceRule} ${extraBoxStyle}"
          >${shapeInnerHtml}</div>
        `);
      }


      pagesHtml.push(`
        <div
          class="vml-page-wrapper"
          data-page-index="${pIdx}"
          data-subject-key="${subjectKey}"
          data-subject-label="${subjectLabel}"
          data-is-inline-header="${isInlineSchoolHeader ? "true" : "false"}"
          data-extracted-school="${escapeHtml(headerSchoolName)}"
          data-extracted-kendra="${escapeHtml(headerKendra)}"
          data-extracted-taluka="${escapeHtml(headerTaluka)}"
          data-extracted-jilha="${escapeHtml(headerJilha)}"
          data-extracted-title="${escapeHtml(headerExamTitle)}"
          data-extracted-class="${escapeHtml(headerClass)}"
          data-extracted-subject="${escapeHtml(headerSubject)}"
          data-extracted-marks="${escapeHtml(headerTotalMarks)}"
          data-extracted-date="${escapeHtml(headerDate)}"
          style="position: relative; width: 100%; max-width: ${Math.round(pageWidthPt * (4/3))}px; aspect-ratio: ${pageWidthPt} / ${pageHeightPt}; margin: 0 auto 32px auto; background: #ffffff; box-shadow: 0 6px 24px -2px rgba(0, 0, 0, 0.18); border-radius: 2px; overflow: hidden; container-type: inline-size;"
        >
          ${
            bgDataUrl
              ? `<img src="${bgDataUrl}" alt="पृष्ठ ${pIdx} डिझाईन बॉर्डर्स" style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; object-fit: fill; pointer-events: none; z-index: 1;" />`
              : ""
          }

          <div class="vml-shapes-layer" style="position: absolute; inset: 0; z-index: 3;">
            ${shapesHtml.join("\n")}
          </div>
        </div>
      `);
    }

    return pagesHtml.join("\n");
  } catch (err) {
    console.error("parseVmlDocxToHtml error:", err);
    return null;
  }
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
