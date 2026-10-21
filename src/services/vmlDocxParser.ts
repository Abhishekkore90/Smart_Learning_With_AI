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

      const hasSchoolHeader = hasSchoolNameOnPage && hasStudentOrStdOnPage;

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

        // Check if this shape is purely underlines/dots in the top header area
        const isOnlyUnderlines = /^[\s\-_.~=—–•\.]+$/.test(trimmedText);
        if (isOnlyUnderlines && topPt < 45) {
          // Skip redundant underline shape at top header because school-name element and header-dots-mask handle it cleanly
          continue;
        }

        const topRatio = topPt / pageHeightPt;
        const leftRatio = leftPt / pageWidthPt;
        const isInRightHeaderQuadrant =
          (topPt < 185 || topRatio < 0.22) && (leftPt > pageWidthPt * 0.52 || leftRatio > 0.52);

        const isHeaderMarksOrRoll =
          hasSchoolHeader &&
          isInRightHeaderQuadrant &&
          (
            trimmedText.includes("हजेरी") ||
            /roll\s*no/i.test(trimmedText) ||
            trimmedText.includes("गुण") ||
            /total\s*marks|obtained\s*marks|marks/i.test(trimmedText) ||
            /^[\s\-_.~=—–•\[\]\(\)]*$/.test(trimmedText) ||
            !trimmedText
          );

        if (isHeaderMarksOrRoll) {
          // Suppress raw scattered shape or old box in the school header box; reconstructed cleanly via code below
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
          // Span box comfortably up to ~81.2% inside the border (497pt / 612pt)
          widthPt = Math.max(widthPt, 497);
          heightPt = 28;
          extraBoxStyle = "z-index: 10; white-space: normal !important; overflow: visible !important; display: flex; align-items: flex-start; max-width: 81.2% !important;";

          const isEng = /school/i.test(trimmedText) || !trimmedText.includes("शाळेचे");
          const cleanName = trimmedText
            .replace(/^(?:शाळेचे\s*नाव|school\s*name)\s*[:\-–—]?\s*/i, "")
            .replace(/^[_.\s\-–—]+$/, "")
            .trim();

          const label = isEng ? "SCHOOL NAME -" : "शाळेचे नाव :";

          if (cleanName) {
            shapeInnerHtml = `<div class="qp-school-name-block" style="background: #ffffff; padding: 0 2px; display: block; flex: 1; min-width: 0; margin-right: 14px; overflow: visible;"><strong style="white-space: nowrap; color: #0f172a;">${label} </strong><span class="qp-school-text" style="font-weight: 700; color: #0f172a; margin-left: 6px; white-space: normal; word-break: break-word;" title="${escapeHtml(cleanName)}">${escapeHtml(cleanName)}</span></div>`;
          } else {
            shapeInnerHtml = `<div class="qp-school-name-block" style="background: #ffffff; padding: 0 2px; display: block; flex: 1; min-width: 0; margin-right: 14px; overflow: visible;"><strong style="white-space: nowrap; color: #0f172a;">${label} </strong><span style="display: inline-block; width: 140px; border-bottom: 1.5px dotted #94a3b8; margin-left: 6px; height: 1em; vertical-align: middle;"></span></div>`;
          }
        } else if (
          (trimmedText.includes("चाचणी") || trimmedText.includes("मूल्यमापन") || trimmedText.includes("परीक्षा") || /test|evaluation/i.test(trimmedText)) &&
          topPt < 65
        ) {
          fieldAttr = 'data-field="exam-title"';
          extraBoxStyle = "z-index: 10; overflow: visible !important;";
        } else if (
          (trimmedText.includes("दि.") || /date\s*[:\-–—]?/i.test(trimmedText)) &&
          (trimmedText.includes("२०२") || trimmedText.includes("202") || trimmedText.includes("/"))
        ) {
          fieldAttr = 'data-field="exam-date"';
          widthPt = Math.max(widthPt, 200);
          heightPt = 28;
          extraBoxStyle = "z-index: 10; white-space: nowrap !important; overflow: hidden !important;";
        }

        let leftPct = Math.max(0, Math.min(99.5, (leftPt / pageWidthPt) * 100));
        let topPct = Math.max(0, Math.min(99.5, (topPt / pageHeightPt) * 100));
        let widthPct = Math.max(1, Math.min(100 - leftPct, (widthPt / pageWidthPt) * 100));
        let heightPct = (heightPt / pageHeightPt) * 100;

        if (isSchoolNameText) {
          leftPct = 10.458;
          topPct = 2.3;
          widthPct = 81.2;
          heightPct = 3.66;
        } else if (fieldAttr === 'data-field="exam-title"') {
          topPct = 6.8;
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

        const isSchoolNameField = fieldAttr === 'data-field="school-name"';

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

      if (hasSchoolHeader) {
        const isEngPage = subjectKey === "english" || subjectKey === "semi" || /TOTAL MARKS/i.test(allPageRawText);
        const rollLabel = isEngPage ? "ROLL NO. -" : "हजेरी क्रमांक -";
        const totalLabel = isEngPage ? "TOTAL MARKS -" : "एकूण गुण -";
        const obtLabel = isEngPage ? "OBTAINED MARKS -" : "मिळालेले गुण -";
        const displayTotalMarks = isEngPage
          ? (pageTotalMarks.replace(/[०-९]/g, (d) => "0123456789"["०१२३४५६७८९".indexOf(d)]))
          : pageTotalMarks;

        shapesHtml.push(`
          <div
            class="qp-header-marks-block"
            data-field="qp-header-marks-block"
            contenteditable="false"
            style="position: absolute; right: 10.458%; top: 10.9%; width: 23.0%; height: 10.2%; z-index: 12; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; font-family: 'Noto Sans Devanagari', 'Tiro Devanagari Marathi', 'Nirmala UI', sans-serif; pointer-events: auto;"
          >
            <!-- 1. हजेरी क्रमांक -->
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: clamp(2px, 0.7cqw, 6px); width: 100%;">
              <span style="font-size: clamp(6.0px, 1.8cqw, 10.5pt); font-weight: 700; color: #0f172a; white-space: nowrap; background: #ffffff; padding: 0 2px;">${rollLabel}</span>
              <div style="width: clamp(16px, 5.0cqw, 34px); height: clamp(12px, 3.5cqw, 24px); border: clamp(1px, 0.22cqw, 1.5px) solid #0f172a; border-radius: clamp(2px, 0.5cqw, 4px); background: #ffffff; display: flex; align-items: center; justify-content: center; font-size: clamp(6.5px, 1.9cqw, 11pt); font-weight: 800; color: #0f172a; flex-shrink: 0; box-sizing: border-box;"></div>
            </div>

            <!-- 2. एकूण गुण (with box for fetched marks) -->
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: clamp(2px, 0.7cqw, 6px); width: 100%;">
              <span style="font-size: clamp(6.0px, 1.8cqw, 10.5pt); font-weight: 700; color: #0f172a; white-space: nowrap; background: #ffffff; padding: 0 2px;">${totalLabel}</span>
              <div
                contenteditable="true"
                data-field="total-marks-box"
                title="एकूण गुण संपादित करा"
                style="width: clamp(16px, 5.0cqw, 34px); height: clamp(12px, 3.5cqw, 24px); border: clamp(1px, 0.22cqw, 1.5px) solid #0f172a; border-radius: clamp(2px, 0.5cqw, 4px); background: #ffffff; display: flex; align-items: center; justify-content: center; font-size: clamp(6.5px, 1.9cqw, 11pt); font-weight: 800; color: #0f172a; flex-shrink: 0; box-sizing: border-box; cursor: text; outline: none;"
              >${escapeHtml(displayTotalMarks)}</div>
            </div>

            <!-- 3. मिळालेले गुण -->
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: clamp(2px, 0.7cqw, 6px); width: 100%;">
              <span style="font-size: clamp(6.0px, 1.8cqw, 10.5pt); font-weight: 700; color: #0f172a; white-space: nowrap; background: #ffffff; padding: 0 2px;">${obtLabel}</span>
              <div style="width: clamp(16px, 5.0cqw, 34px); height: clamp(12px, 3.5cqw, 24px); border: clamp(1px, 0.22cqw, 1.5px) solid #0f172a; border-radius: clamp(2px, 0.5cqw, 4px); background: #ffffff; display: flex; align-items: center; justify-content: center; font-size: clamp(6.5px, 1.9cqw, 11pt); font-weight: 800; color: #0f172a; flex-shrink: 0; box-sizing: border-box;"></div>
            </div>
          </div>
        `);
      }

      pagesHtml.push(`
        <div
          class="vml-page-wrapper"
          data-page-index="${pIdx}"
          data-subject-key="${subjectKey}"
          data-subject-label="${subjectLabel}"
          style="position: relative; width: 100%; max-width: ${Math.round(pageWidthPt * (4/3))}px; aspect-ratio: ${pageWidthPt} / ${pageHeightPt}; margin: 0 auto 32px auto; background: #ffffff; box-shadow: 0 6px 24px -2px rgba(0, 0, 0, 0.18); border-radius: 2px; overflow: hidden; container-type: inline-size;"
        >
          ${
            bgDataUrl
              ? `<img src="${bgDataUrl}" alt="पृष्ठ ${pIdx} डिझाईन बॉर्डर्स" style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; object-fit: fill; pointer-events: none; z-index: 1;" />`
              : ""
          }
          ${
            hasSchoolHeader
              ? `
                <div class="header-dots-mask" style="position: absolute; left: 10.4%; top: 2.5%; width: 81.2%; height: 4.8%; background: #ffffff; z-index: 2; pointer-events: none;"></div>
                <div class="header-orphan-boxes-mask" style="position: absolute; right: 8.9%; top: 13.8%; width: 7.8%; height: 9.1%; background: #ffffff; z-index: 2; pointer-events: none;"></div>
              `
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
