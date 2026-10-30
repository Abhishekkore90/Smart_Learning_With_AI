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

    // ── PASS 0: Pre-scan all pages to determine subject structure from raw XML ──
    // This must happen before any injection so subject boundaries are based on the
    // original document content, not on content we add later.
    interface PageMeta {
      subjectKey: "marathi" | "english" | "math" | "semi" | "other";
      subjectLabel: string;
      isHeaderPage: boolean;   // page has the school-info header box
      isSubjectStart: boolean; // first page of a subject section
      isSubjectEnd: boolean;   // last page of a subject section (set in second pass)
    }
    const pageMetas: PageMeta[] = [];

    for (let pIdx = 1; pIdx < drawingParts.length; pIdx++) {
      const part = drawingParts[pIdx];
      const shapes = part.match(/<v:shape[\s\S]*?<\/v:shape>/g) || [];
      const partPgSzMatch = part.match(/<w:pgSz[^>]*w:w="([0-9]+)"[^>]*w:h="([0-9]+)"/);
      const pageHeightPtPre = partPgSzMatch ? parseInt(partPgSzMatch[2], 10) / 20 : docPageHeightPt;

      const allPageRawTextPre = shapes.map((s) => {
        const tRuns = s.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
        return tRuns.map((t) => t.replace(/<[^>]+>/g, "")).join(" ");
      }).join(" ");

      // Subject key from raw text
      let sk: PageMeta["subjectKey"] = "other";
      let sl = "सामान्य विभाग";
      if (/भाषा|मराठी|जोड्या जुळव|अक्षराला गोल कर|शब्द वाच|गिरव/i.test(allPageRawTextPre)) {
        sk = "marathi"; sl = "मराठी विभाग (प्रथम भाषा)";
      } else if (/english|oral\s*&amp;\s*practical|listen and act/i.test(allPageRawTextPre)) {
        sk = "english"; sl = "इंग्रजी विभाग (English)";
      } else if (/गणित|संख्या|चित्रे मोज|मोठ्या गाडीखालील/i.test(allPageRawTextPre)) {
        sk = "math"; sl = "गणित विभाग (Mathematics)";
      } else if (/FORMATIVE EVALUATION|SUB\s*[-–]\s*MATH|Qu\.|Write numbers/i.test(allPageRawTextPre)) {
        sk = "semi"; sl = "Semi-English विभाग (Semi Math)";
      }

      // A page is a genuine header page ONLY if it has the school name AND student/class
      // info in its raw XML shapes. This avoids tagging continuation pages.
      const hasSchoolNamePre = shapes.some((s) => {
        const txt = (s.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [])
          .map((t) => t.replace(/<[^>]+>/g, "")).join(" ");
        const sTop = parseFloat(s.match(/margin-top:([0-9.]+)pt/)?.[1] || "999");
        return txt.includes("शाळेचे नाव") || /school\s*name/i.test(txt) ||
          /name\s*of\s*school/i.test(txt) || (sTop < 45 && /\bschool\b/i.test(txt));
      });
      const hasStudentInfoPre = shapes.some((s) => {
        const txt = (s.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [])
          .map((t) => t.replace(/<[^>]+>/g, "")).join(" ");
        return txt.includes("विद्यार्थ्याचे नाव") || txt.includes("विद्यार्थी") ||
          txt.includes("इयत्ता") || txt.includes("दि.") || /student|std|class|date/i.test(txt);
      });
      // Also detect exam header by presence of मूल्यमापन/चाचणी/परीक्षा in top region
      const hasExamTitlePre = shapes.some((s) => {
        const sTop = parseFloat(s.match(/margin-top:([0-9.]+)pt/)?.[1] || "999");
        const topRatio = sTop / pageHeightPtPre;
        if (topRatio >= 0.255) return false;
        const txt = (s.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [])
          .map((t) => t.replace(/<[^>]+>/g, "")).join(" ");
        return txt.includes("मूल्यमापन") || txt.includes("चाचणी") || txt.includes("परीक्षा") ||
          /test|exam|evaluation/i.test(txt);
      });

      // isHeaderPage: first page always, or page with school name + (student info OR exam title)
      const isHeaderPage = pIdx === 1 || (hasSchoolNamePre && (hasStudentInfoPre || hasExamTitlePre));

      // isSubjectStart: first page OR page with explicit subject marker in header region
      // Detect "विषय - भाषा" / "SUB - MATH" etc. ONLY in the header area shapes (top 25.5%)
      const hasSubjectMarkerInHeader = shapes.some((s) => {
        const sTop = parseFloat(s.match(/margin-top:([0-9.]+)pt/)?.[1] || "999");
        const topRatio = sTop / pageHeightPtPre;
        if (topRatio >= 0.255) return false;
        const txt = (s.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [])
          .map((t) => t.replace(/<[^>]+>/g, "")).join(" ");
        return /(?:विषय|subject|sub)\s*[-–:]\s*\S/i.test(txt);
      });
      const isSubjectStart = pIdx === 1 || (isHeaderPage && hasSubjectMarkerInHeader);

      pageMetas.push({ subjectKey: sk, subjectLabel: sl, isHeaderPage, isSubjectStart, isSubjectEnd: false });
    }

    // Second pass: mark isSubjectEnd — last page before next subject start, and very last page
    const totalPages = pageMetas.length;
    for (let i = 0; i < totalPages; i++) {
      const isLastPage = i === totalPages - 1;
      const nextIsSubjectStart = !isLastPage && pageMetas[i + 1].isSubjectStart;
      if (isLastPage || nextIsSubjectStart) {
        pageMetas[i].isSubjectEnd = true;
      }
    }

    // Process each page
    for (let pIdx = 1; pIdx < drawingParts.length; pIdx++) {
      const part = drawingParts[pIdx];
      const meta = pageMetas[pIdx - 1]; // pIdx starts at 1, meta array at 0

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

      // Use pre-scanned subject info from Pass 0
      const allPageTextParts = shapes.map((s) => {
        const tRuns = s.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
        return tRuns.map((t) => t.replace(/<[^>]+>/g, "")).join("");
      });
      const allPageRawText = allPageTextParts.join(" ");

      const subjectKey = meta.subjectKey;
      const subjectLabel = meta.subjectLabel;

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

      // Use pre-computed isHeaderPage from Pass 0 — do NOT re-detect from raw shapes
      // to avoid tagging continuation pages that happen to have top-region shapes.
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

      // hasSchoolHeader: use the pre-computed isHeaderPage flag.
      // Strip the old header shapes ONLY on genuine header pages — not on continuation pages
      // that happen to have shapes near the top (e.g., Q1 positioned high on the page).
      const hasSchoolHeader = meta.isHeaderPage;

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
        hasSchoolNameOnPage &&
        ((schoolNameShapeTop > 65 && (studentNameShapeTop < 0 || schoolNameShapeTop > studentNameShapeTop)) ||
          allPageText.includes("इयत्ता- तिसरी") ||
          allPageText.includes("इयत्ता- चौथी") ||
          allPageText.includes("इयत्ता - ३") ||
          allPageText.includes("इयत्ता - ४") ||
          allPageText.includes("३री") ||
          allPageText.includes("४थी"));

      // Detect if this page specifically has the evaluation grid table in the header (Class 1 & 2 primary papers)
      const isClass1or2Pre =
        /इयत्ता\s*[-_]?\s*(?:१|२|1|2|पहिली|दुसरी)\b/i.test(allPageText) ||
        /\b(?:std|class)\s*[-_]?\s*[12]\b/i.test(allPageText) ||
        /\b(?:1st|2nd)\b/i.test(allPageText) ||
        /पहिली|दुसरी|१ली|२री|१ ली|२ री/i.test(allPageText);
      const isExplicitHigherClassPre =
        /इयत्ता\s*[-_]?\s*(?:३|४|५|६|७|८|3|4|5|6|7|8|तिसरी|चौथी|पाचवी|सहावी|सातवी|आठवी)\b/i.test(allPageText) ||
        /\b(?:std|class)\s*[-_]?\s*[3-8]\b/i.test(allPageText) ||
        /\b(?:3rd|4th|5th|6th|7th|8th)\b/i.test(allPageText) ||
        /तिसरी|चौथी|पाचवी|सहावी|सातवी|आठवी|३री|४थी|५वी|६वी|७वी|८वी/i.test(allPageText);
      const hasEvalGridInHeader =
        !isExplicitHigherClassPre &&
        (isClass1or2Pre ||
          shapes.some((s) => {
            const sTop = parseFloat(s.match(/margin-top:([0-9.]+)pt/)?.[1] || "999");
            const topRatio = sTop / pageHeightPt;
            if (topRatio >= 0.16 && topRatio < 0.255) {
              const tRuns = s.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
              const txt = tRuns.map((t) => t.replace(/<[^>]+>/g, "")).join(" ").trim();
              return txt === "प्रश्न" || txt === "प्र." || txt.includes("गुण") || /^[०-९0-9]+$/.test(txt);
            }
            return false;
          }));

      // 2b. Automatically detect the exact header boundary and geometry from header shapes (page-level)
      let minHeaderTopPt = 999;
      let maxHeaderBottomPt = 0;
      let minHeaderLeftPt = 999;
      let maxHeaderRightPt = 0;

      shapes.forEach((s) => {
        const styleStr = s.match(/style="([^"]+)"/)?.[1] || "";
        const leftMatch = styleStr.match(/margin-left:([0-9.]+)pt/);
        const topMatch = styleStr.match(/margin-top:([0-9.]+)pt/);
        const widthMatch = styleStr.match(/width:([0-9.]+)pt/);
        const heightMatch = styleStr.match(/height:([0-9.]+)pt/);
        const sTop = topMatch ? parseFloat(topMatch[1]) : 999;
        const sLeft = leftMatch ? parseFloat(leftMatch[1]) : 999;
        const sWidth = widthMatch ? parseFloat(widthMatch[1]) : 0;
        const sHeight = heightMatch ? parseFloat(heightMatch[1]) : 0;

        const textRuns = s.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
        const rawText = textRuns.map((t) => t.replace(/<[^>]+>/g, "")).join("").trim();
        const isQ =
          /^(?:प्रश्न|प्र\.|q(?:ue)?\.?)\s*[०-९0-9]+/i.test(rawText) ||
          /^[०-९0-9]+\s*[\)\.]/.test(rawText) ||
          (rawText.length > 20 && (rawText.includes("प्रश्न") || rawText.includes("प्र.")));

        // If shape is inside header zone (< 26% of page) and NOT a real question
        if (sTop < pageHeightPt * 0.26 && !isQ) {
          minHeaderTopPt = Math.min(minHeaderTopPt, sTop);
          maxHeaderBottomPt = Math.max(maxHeaderBottomPt, sTop + sHeight);
          if (sLeft < 900) {
            minHeaderLeftPt = Math.min(minHeaderLeftPt, sLeft);
            maxHeaderRightPt = Math.max(maxHeaderRightPt, sLeft + sWidth);
          }
        }
      });

      // Compute dynamic percentages with fallback bounds
      const detectedHeaderTopPct = minHeaderTopPt < 900 ? (minHeaderTopPt / pageHeightPt) * 100 : (hasEvalGridInHeader ? 1.8 : 2.2);
      const detectedHeaderHeightPct = maxHeaderBottomPt > 0 ? (maxHeaderBottomPt / pageHeightPt) * 100 - detectedHeaderTopPct : (hasEvalGridInHeader ? 23.4 : 22.2);
      const detectedHeaderLeftPct = minHeaderLeftPt < 900 ? Math.max(6.5, (minHeaderLeftPt / pageWidthPt) * 100) : (hasEvalGridInHeader ? 6.8 : 7.6);
      const detectedHeaderWidthPct = maxHeaderRightPt > 0 ? Math.min(88.0, ((maxHeaderRightPt / pageWidthPt) * 100) - detectedHeaderLeftPct) : (hasEvalGridInHeader ? 86.4 : 84.8);

      // Dynamic header threshold: everything inside the detected header height (plus 1% buffer, up to 26.2%) is cleanly stripped
      const headerThreshold = Math.min(0.262, Math.max(0.245, (maxHeaderBottomPt / pageHeightPt) + 0.01));

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
          /^(?:प्रश्न|प्र\.|q(?:ue)?\.?)\s*[०-९0-9]+/i.test(trimmedText) ||
          /^[०-९0-9]+\s*[\)\.]\s*(?:कंसातील|योग्य|रिकाम्या|खालील|जोड्या|एका|[^\s]+)/.test(trimmedText) ||
          (trimmedText.length > 20 && (trimmedText.includes("प्रश्न") || trimmedText.includes("प्र.")));

        if (hasSchoolHeader && topRatio < headerThreshold && !isQ) {
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
            extraBoxStyle = "z-index: 10; white-space: normal !important; overflow: visible !important; display: flex; align-items: center; justify-content: center; text-align: center; max-width: 81.2% !important;";
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
              shapeInnerHtml = `<div class="qp-school-name-block" style="background: #ffffff; padding: 0 2px; display: flex; align-items: center; justify-content: center; text-align: center; width: 100%; overflow: visible;"><strong style="white-space: nowrap; color: #0f172a;">${label} </strong><span class="qp-school-text" style="font-weight: 700; color: #0f172a; margin-left: 6px; white-space: normal; word-break: break-word;" title="${escapeHtml(cleanName)}">${escapeHtml(cleanName)}</span></div>`;
            } else {
              shapeInnerHtml = `<div class="qp-school-name-block" style="background: #ffffff; padding: 0 2px; display: flex; align-items: center; justify-content: center; text-align: center; width: 100%; overflow: visible;"><strong style="white-space: nowrap; color: #0f172a;">${label} </strong><span style="display: inline-block; width: 140px; border-bottom: 1.5px dotted #94a3b8; margin-left: 6px; height: 1em; vertical-align: middle;"></span></div>`;
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
          shapeAlignItems = "center";
          shapeLineHeight = "1.35";
          shapePadding = "2px 4px";
          extraBoxStyle += " justify-content: center !important; text-align: center !important;";
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
          data-is-header-page="${meta.isHeaderPage ? "true" : "false"}"
          data-is-subject-start="${meta.isSubjectStart ? "true" : "false"}"
          data-is-subject-end="${meta.isSubjectEnd ? "true" : "false"}"
          data-has-eval-grid="${hasEvalGridInHeader ? "true" : "false"}"
          data-header-top-pct="${detectedHeaderTopPct.toFixed(2)}"
          data-header-height-pct="${detectedHeaderHeightPct.toFixed(2)}"
          data-header-left-pct="${detectedHeaderLeftPct.toFixed(2)}"
          data-header-width-pct="${detectedHeaderWidthPct.toFixed(2)}"
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

          ${
            hasSchoolHeader
              ? `<div class="qp-header-bg-mask" style="position: absolute; left: 0; top: 0; width: 100%; height: 26.2%; background: #ffffff; z-index: 2; pointer-events: none;"></div>`
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
