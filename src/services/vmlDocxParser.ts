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

      let subjectKey: "marathi" | "math" | "semi" | "other" = "other";
      let subjectLabel = "सामान्य विभाग";

      if (/भाषा|मराठी|जोड्या जुळव|अक्षराला गोल कर|शब्द वाच|गिरव/i.test(allPageRawText)) {
        subjectKey = "marathi";
        subjectLabel = "मराठी विभाग (प्रथम भाषा)";
      } else if (/गणित|संख्या|चित्रे मोज|मोठ्या गाडीखालील/i.test(allPageRawText)) {
        subjectKey = "math";
        subjectLabel = "गणित विभाग (Mathematics)";
      } else if (/FORMATIVE EVALUATION|SUB\s*[-–]\s*MATH|Qu\.|Write numbers/i.test(allPageRawText)) {
        subjectKey = "semi";
        subjectLabel = "Semi-English विभाग (Semi Math)";
      }

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

        const leftPt = leftMatch ? parseFloat(leftMatch[1]) : 0;
        const topPt = topMatch ? parseFloat(topMatch[1]) : 0;
        let widthPt = widthMatch ? parseFloat(widthMatch[1]) : 120;
        let heightPt = heightMatch ? parseFloat(heightMatch[1]) : 32;

        let fieldAttr = "";
        let extraBoxStyle = "";

        if (rawText.includes("शाळेचे नाव")) {
          fieldAttr = 'data-field="school-name"';
          // Expand width comfortably up to 460pt so school name fits inside the box without touching right border
          widthPt = Math.max(widthPt, 460);
          heightPt = 28;
          extraBoxStyle = "z-index: 10;";
        } else if (rawText.includes("दि.") && (rawText.includes("२०२") || rawText.includes("/"))) {
          fieldAttr = 'data-field="exam-date"';
          widthPt = Math.max(widthPt, 200);
          heightPt = 28;
          extraBoxStyle = "z-index: 10;";
        }

        const leftPct = Math.max(0, Math.min(99.5, (leftPt / pageWidthPt) * 100));
        const topPct = Math.max(0, Math.min(99.5, (topPt / pageHeightPt) * 100));
        const widthPct = Math.max(1, Math.min(100 - leftPct, (widthPt / pageWidthPt) * 100));
        const heightPct = (heightPt / pageHeightPt) * 100;

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

        shapesHtml.push(`
          <div
            contenteditable="true"
            spellcheck="false"
            ${fieldAttr}
            class="vml-shape-text"
            style="position: absolute; left: ${leftPct.toFixed(3)}%; top: ${topPct.toFixed(3)}%; width: ${widthPct.toFixed(3)}%; height: ${heightPct.toFixed(3)}%; display: flex; align-items: center; justify-content: ${justifyCss}; font-size: ${fontSizePt}pt; font-size: ${fontSizeCqw}cqw; font-weight: ${isBold ? "bold" : "normal"}; font-style: ${isItalic ? "italic" : "normal"}; color: ${color}; text-align: ${align}; font-family: ${fontFamily}; line-height: 1.15; padding: 0 4px; box-sizing: border-box; cursor: text; outline: none; white-space: pre-wrap; word-break: break-word; ${extraBoxStyle}"
          >${escapeHtml(rawText)}</div>
        `);
      }

      const hasSchoolHeader = shapes.some((s) => s.includes("शाळेचे नाव"));

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
              ? `<div class="header-dots-mask" style="position: absolute; left: 10.4%; top: 2.26%; width: 81.2%; height: 3.66%; background: #ffffff; z-index: 2; pointer-events: none;"></div>`
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
