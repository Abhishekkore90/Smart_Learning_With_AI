import * as pdfjsLib from "pdfjs-dist";
import { jsPDF } from "jspdf";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import type {
  DocumentModel,
  DocumentPage,
  DocumentTextBlock,
  UserDocumentEdits,
  QuestionPaperHeaderData,
} from "@/types/documentEditor";
import { decodeMarathiLegacyText } from "./marathiFontDecoder";
import { fetchBinaryFile } from "@/lib/bunny-auth-pdf";

// Robust worker configuration for PDF.js using local static worker
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

/**
 * Cache for loaded DocumentModels to avoid re-parsing identical documents
 */
const documentCache = new Map<string, DocumentModel>();

/**
 * Group adjacent PDF text items on the same baseline into coherent editable blocks
 */
function groupTextItemsIntoBlocks(
  items: any[],
  viewportWidth: number,
  viewportHeight: number
): DocumentTextBlock[] {
  if (!items || items.length === 0) return [];

  // Filter out empty items and unpack any multi-space or column splits
  const validItems: {
    id: string;
    str: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    fontFamily: string;
    fontWeight: "bold" | "normal";
  }[] = [];

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    if (!item.str || !item.str.trim()) continue;

    // transform: [scaleX, skewY, skewX, scaleY, tx, ty]
    const tx = item.transform ? item.transform[4] : 0;
    const ty = item.transform ? item.transform[5] : 0;
    const fontSize = Math.hypot(item.transform ? item.transform[0] : 12, item.transform ? item.transform[1] : 0) || 12;
    const x = tx;
    const y = viewportHeight - ty - fontSize; // top in viewport
    const width = item.width || (item.str.length * fontSize * 0.55);
    const height = item.height || (fontSize * 1.25);
    const fontName = (item.fontName || "").toLowerCase();
    const isBold =
      fontName.includes("bold") ||
      fontName.includes("black") ||
      fontName.includes("heavy") ||
      Boolean(item.fontWeight && item.fontWeight >= 600);
    const fontWeight: "bold" | "normal" = isBold ? "bold" : "normal";
    const fontFamily = item.fontName || "Noto Sans Devanagari, sans-serif";

    // If a single PDF text item contains a large internal blank gap (>= 3 consecutive spaces),
    // split it into distinct items so separate columns/sentences remain separated!
    if (/\s{3,}/.test(item.str)) {
      const parts = item.str.split(/(\s{3,})/);
      let currentX = x;
      for (const part of parts) {
        const partWidth = (part.length / item.str.length) * width;
        if (part.trim()) {
          validItems.push({
            id: `t_${idx}_${Math.round(currentX)}_${Math.round(y)}`,
            str: part.trim(),
            x: currentX,
            y,
            width: partWidth,
            height,
            fontSize,
            fontFamily,
            fontWeight,
          });
        }
        currentX += partWidth;
      }
    } else {
      validItems.push({
        id: `t_${idx}_${Math.round(x)}_${Math.round(y)}`,
        str: item.str,
        x,
        y,
        width,
        height,
        fontSize,
        fontFamily,
        fontWeight,
      });
    }
  }

  // Sort top-to-bottom, then left-to-right (with Devanagari matra tolerance)
  validItems.sort((a, b) => {
    const yTolerance = Math.max(6, Math.min(a.fontSize, b.fontSize) * 0.45);
    if (Math.abs(a.y - b.y) > yTolerance) {
      return a.y - b.y;
    }
    return a.x - b.x;
  });

  const blocks: DocumentTextBlock[] = [];
  let currentGroup: typeof validItems = [];

  const flushGroup = () => {
    if (currentGroup.length === 0) return;
    const first = currentGroup[0];

    const minX = Math.min(...currentGroup.map((g) => g.x));
    const minY = Math.min(...currentGroup.map((g) => g.y));
    const maxX = Math.max(...currentGroup.map((g) => g.x + g.width));
    const maxY = Math.max(...currentGroup.map((g) => g.y + g.height));

    // Combine text items preserving legitimate word spaces without breaking syllables
    let combinedText = "";
    for (let k = 0; k < currentGroup.length; k++) {
      const g = currentGroup[k];
      if (k === 0) {
        combinedText += g.str;
      } else {
        const prevG = currentGroup[k - 1];
        const gap = g.x - (prevG.x + prevG.width);
        if (gap > Math.max(2, prevG.fontSize * 0.2)) {
          combinedText += " " + g.str;
        } else {
          combinedText += g.str;
        }
      }
    }

    // Automatically decode any legacy Marathi font encoding (DV-TTSurekh, Shree-Lipi, KrutiDev)
    const cleanText = decodeMarathiLegacyText(combinedText);

    const avgFontSize = Math.round(
      currentGroup.reduce((sum, g) => sum + g.fontSize, 0) / currentGroup.length
    );
    const hasBold = currentGroup.some((g) => g.fontWeight === "bold");

    // Convert to percentages
    const xPct = Math.max(0, Math.min(100, (minX / viewportWidth) * 100));
    const yPct = Math.max(0, Math.min(100, (minY / viewportHeight) * 100));
    const wPct = Math.max(2, Math.min(100 - xPct, ((maxX - minX) / viewportWidth) * 100));
    const hPct = Math.max(1.8, Math.min(100 - yPct, ((maxY - minY) / viewportHeight) * 100));

    blocks.push({
      id: `blk_${blocks.length}_${Math.round(minX)}_${Math.round(minY)}`,
      text: cleanText,
      x: Number(xPct.toFixed(2)),
      y: Number(yPct.toFixed(2)),
      width: Number(wPct.toFixed(2)),
      height: Number(hPct.toFixed(2)),
      origX: Number(xPct.toFixed(2)),
      origY: Number(yPct.toFixed(2)),
      origWidth: Number(wPct.toFixed(2)),
      origHeight: Number(hPct.toFixed(2)),
      fontSize: avgFontSize || 12,
      fontWeight: hasBold ? "bold" : "normal",
      fontFamily: first.fontFamily || "Noto Sans Devanagari, sans-serif",
      editable: true,
    });

    currentGroup = [];
  };

  for (const item of validItems) {
    if (currentGroup.length === 0) {
      currentGroup.push(item);
      continue;
    }

    const prev = currentGroup[currentGroup.length - 1];
    
    // Vertical line tolerance: items must be on the exact same line
    const yTolerance = Math.max(6, Math.min(prev.fontSize, item.fontSize) * 0.45);
    const sameLine = Math.abs(item.y - prev.y) <= yTolerance;

    // Horizontal gap between end of previous item and start of current item
    const hGap = item.x - (prev.x + prev.width);

    // Sentence-end punctuation check: if previous item ends with '.', '।', '?', '!', ':', ';', or ')' / ']'
    // E.g. "(गुण २)" or "जुळव." followed by another column/clause like "चित्र बघ..."
    const prevTrimmed = prev.str.trim();
    const isPrevSentenceEnd = /[.!?।:;\]\)\}\>]$/.test(prevTrimmed);

    // Question numbering or bullet start check: e.g. "१)", "1.", "(अ)", etc.
    const itemTrimmed = item.str.trim();
    const isItemNewSection = /^([0-9०-९]+[\.\)]|\([0-9०-९a-zA-Zअ-ह]+\)|[अ-ह]\))/.test(itemTrimmed);

    // Adjacent words check:
    // Regular word spaces are small (~3-8px). Any gap larger than ~12px or 0.85 * font size
    // is a separate column, tab gap, or distinct sentence and MUST NOT be merged!
    // If the previous word ended with punctuation/brackets, even a gap > 5px means a separate sentence!
    const isAdjacentWords =
      hGap >= -Math.max(4, prev.fontSize * 0.3) &&
      hGap <= Math.max(11, prev.fontSize * 0.85) &&
      !isItemNewSection &&
      !(isPrevSentenceEnd && hGap > Math.max(5, prev.fontSize * 0.35));

    if (sameLine && isAdjacentWords) {
      currentGroup.push(item);
    } else {
      flushGroup();
      currentGroup.push(item);
    }
  }
  flushGroup();

  return blocks;
}

/**
 * Automatically detects whether a page has a question paper header box/table
 * and parses its fields (examTitle, className, subjectName, totalMarks, isEnglish, etc.)
 */
export function detectPageHeaderBox(
  page: DocumentPage,
  defaultSchoolName?: string
): QuestionPaperHeaderData | null {
  if (!page.textBlocks || page.textBlocks.length === 0) return null;

  // Filter text blocks in the top 26% header area
  const topBlocks = page.textBlocks.filter((b) => (b.y || 0) < 26 && b.text && b.text.trim());
  if (topBlocks.length === 0) return null;

  const combined = topBlocks.map((b) => b.text.trim()).join(" ");

  const isMarathiHeader =
    combined.includes("शाळेचे नाव") ||
    (combined.includes("चाचणी") && (combined.includes("इयत्ता") || combined.includes("इयšता") || combined.includes("विषय") || combined.includes("िवषय"))) ||
    (combined.includes("विद्यार्थ्याचे नाव") || combined.includes("िवüा›या‚चे नाव")) ||
    ((combined.includes("मूल्यमापन") || combined.includes("मू¨यमापन")) && (combined.includes("विषय") || combined.includes("िवषय")));

  const isEnglishHeader =
    combined.includes("SCHOOL NAME") ||
    (combined.includes("SCHOOL") && combined.includes("NAME")) ||
    (combined.includes("EVALUATION") && (combined.includes("STD") || combined.includes("SUB"))) ||
    (combined.includes("STUDENT NAME") && (combined.includes("ROLL") || combined.includes("NO"))) ||
    (combined.includes("FORMATIVE") && combined.includes("SUB"));

  if (!isMarathiHeader && !isEnglishHeader) return null;

  let examTitle = "";
  let className = "";
  let subjectName = "";
  let totalMarks = "";

  if (isEnglishHeader) {
    if (combined.includes("FORMATIVE EVALUATION TEST 1")) examTitle = "FORMATIVE EVALUATION TEST 1";
    else if (combined.includes("FORMATIVE EVALUATION TEST 2")) examTitle = "FORMATIVE EVALUATION TEST 2";
    else if (combined.includes("SUMMATIVE EVALUATION TEST 1")) examTitle = "SUMMATIVE EVALUATION TEST 1";
    else if (combined.includes("SUMMATIVE EVALUATION TEST 2")) examTitle = "SUMMATIVE EVALUATION TEST 2";
    else {
      const titleMatch = combined.match(/([A-Z\s]+EVALUATION\s+TEST\s+[0-9]+)/i);
      examTitle = titleMatch ? titleMatch[1].trim() : "FORMATIVE EVALUATION TEST 1";
    }

    const stdMatch = combined.match(/STD\s*[–\-:]*\s*([0-9A-Za-z]+)/i);
    className = stdMatch ? stdMatch[1].trim() : "1";

    const subMatch = combined.match(/SUB\s*[–\-:]*\s*([A-Za-z]+)/i);
    subjectName = subMatch ? subMatch[1].trim() : "MATH";

    const marksMatch = combined.match(/TOTAL\s*MARKS\s*[–\-:]*\s*([0-9]+)/i);
    totalMarks = marksMatch ? marksMatch[1].trim() : "20";
  } else {
    if (combined.includes("चाचणी") && (combined.includes("É.२") || combined.includes("क्र. २") || combined.includes("क्र.२") || combined.includes("2"))) {
      examTitle = "आकारिक मूल्यमापन चाचणी क्र. २";
    } else if (combined.includes("संकलित") && (combined.includes("२") || combined.includes("2"))) {
      examTitle = "संकलित मूल्यमापन चाचणी २";
    } else if (combined.includes("संकलित")) {
      examTitle = "संकलित मूल्यमापन चाचणी १";
    } else if (combined.includes("द्वितीय सत्र")) {
      examTitle = "द्वितीय सत्र परीक्षा";
    } else {
      examTitle = "आकारिक मूल्यमापन चाचणी क्र. १";
    }

    const classMatch = combined.match(/इय[त्श][त्श]ा\s*[–\-:]*\s*([०-९0-9]+\s*[लरीथवी]+|[०-९0-9]+)/);
    className = classMatch ? classMatch[1].trim() : "१ ली";

    if (combined.includes("गिणत") || combined.includes("गणित")) subjectName = "गणित";
    else if (combined.includes("भाषा") || combined.includes("मराठी")) subjectName = "भाषा";
    else if (combined.includes("इंग्रजी") || combined.includes("English")) subjectName = "इंग्रजी";
    else if (combined.includes("परिसर")) subjectName = "परिसर अभ्यास";
    else subjectName = "भाषा";

    const marksMatch = combined.match(/एक[łू]ण\s*गुण\s*[–\-:]*\s*([०-९0-9]+)/);
    totalMarks = marksMatch ? marksMatch[1].trim() : "२०";
  }

  return {
    schoolName: defaultSchoolName || "",
    examTitle,
    className,
    subjectName,
    totalMarks,
    studentName: "_____________________",
    rollNo: "",
    examDate: isEnglishHeader ? "DATE -   /   / 2026" : "दि.   /   / २०२६",
    obtainedMarks: "",
    enabled: true,
    isEnglish: Boolean(isEnglishHeader),
  };
}

/**
 * Creates a clean default fallback model when an uploaded image/PDF cannot be fetched directly
 */
export function createDefaultFallbackModel(
  fileUrl: string,
  docId: string,
  fileName?: string,
  cacheKey?: string
): DocumentModel {
  const fallbackWidth = 792;
  const fallbackHeight = 1120;
  const page: DocumentPage = {
    pageNumber: 1,
    width: fallbackWidth,
    height: fallbackHeight,
    backgroundUrl: undefined,
    textBlocks: [
      {
        id: "fb_title",
        text: fileName ? `कागदपत्र: ${fileName}` : "दैनिक स्वाध्याय दस्तऐवज",
        x: 10,
        y: 8,
        width: 80,
        height: 5,
        fontSize: 18,
        fontWeight: "bold",
        color: "#1e293b",
        fontFamily: "Noto Sans Devanagari, sans-serif",
        editable: true,
      },
      {
        id: "fb_content",
        text: "खालील स्वाध्याय काळजीपूर्वक वाचा व सोडवा:\n\n१. धडा लक्षपूर्वक वाचा आणि महत्त्वाचे शब्दार्थ वहीत लिहा.\n२. दिलेल्या प्रश्नांची उत्तरे सुंदर हस्ताक्षरात लिहा.\n३. स्वाध्याय पूर्ण करून पालकांची स्वाक्षरी घ्या.",
        x: 10,
        y: 16,
        width: 80,
        height: 25,
        fontSize: 14,
        fontWeight: "500",
        color: "#334155",
        fontFamily: "Noto Sans Devanagari, sans-serif",
        editable: true,
      },
    ],
    isScanned: false,
  };

  const fallbackModel: DocumentModel = {
    documentId: docId,
    sourceFileUrl: fileUrl,
    fileName: fileName || "document.png",
    fileType: fileUrl?.includes(".pdf") ? "application/pdf" : "image/png",
    pageCount: 1,
    pages: [page],
    isScannedPdf: false,
  };

  if (cacheKey) {
    documentCache.set(cacheKey, fallbackModel);
  }
  return fallbackModel;
}

/**
 * Normalizes file URLs, routing Bunny CDN storage links through the local secure proxy
 * with proper URI encoding for Devanagari and special characters
 */
export function normalizeFileUrl(url: string): string {
  if (!url) return url;
  if (url.includes(".b-cdn.net/") || url.includes("storage.bunnycdn.com/")) {
    let pathPart = url.replace(/^https?:\/\/[^/]+\//, "");
    if (pathPart.startsWith("sgkbrainova/")) {
      pathPart = pathPart.replace(/^sgkbrainova\//, "");
    }
    const encodedSegments = pathPart
      .split("/")
      .map((seg) => encodeURIComponent(decodeURIComponent(seg)))
      .join("/");
    return `/api/bunny-storage/sgkbrainova/${encodedSegments}`;
  }
  return url;
}

/**
 * Loads a document (PDF or Image) into a structured DocumentModel
 * with high-res rendered canvas backgrounds and detected text overlay positions.
 */
export async function loadDocumentModel(
  fileUrl: string,
  docId: string,
  fileName?: string
): Promise<DocumentModel> {
  const resolvedUrl = normalizeFileUrl(fileUrl);
  const cacheKey = `${docId}_${resolvedUrl}`;
  if (documentCache.has(cacheKey)) {
    const cached = documentCache.get(cacheKey)!;
    // Only return if it has a real rendered background, not a fallback placeholder
    if (cached.pages?.[0]?.backgroundUrl) {
      return cached;
    }
  }

  // 1. Direct Base64 Data URL fast path (avoids fetch overhead and CORS)
  if (resolvedUrl.startsWith("data:")) {
    try {
      const commaIdx = resolvedUrl.indexOf(",");
      if (commaIdx !== -1) {
        const meta = resolvedUrl.slice(0, commaIdx);
        const base64Data = resolvedUrl.slice(commaIdx + 1);
        const binaryStr = atob(base64Data);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const buffer = bytes.buffer;
        const headerStr = String.fromCharCode(...bytes.slice(0, 5));
        if (headerStr.startsWith("%PDF") || meta.includes("pdf") || fileName?.endsWith(".pdf")) {
          return await loadPdfFromBuffer(buffer, resolvedUrl, docId, fileName, cacheKey);
        } else {
          return await loadImageDocumentModel(resolvedUrl, docId, fileName, cacheKey);
        }
      }
    } catch (dataErr) {
      console.warn("Base64 data url parse error:", dataErr);
    }
  }

  // 2. Fetch binary file using universal fetcher (Bunny Storage with AccessKey, proxy, or direct URL)
  try {
    const buffer = (await fetchBinaryFile(fileUrl)) || (await fetchBinaryFile(resolvedUrl));
    if (buffer) {
      const headerBytes = new Uint8Array(buffer.slice(0, 5));
      const headerStr = String.fromCharCode(...headerBytes);

      // PDF Magic bytes: '%PDF-'
      if (headerStr.startsWith("%PDF") || fileName?.toLowerCase().endsWith(".pdf")) {
        return await loadPdfFromBuffer(buffer, resolvedUrl, docId, fileName, cacheKey);
      }

      // Image bytes (PNG, JPEG, WebP, GIF)
      const blob = new Blob([buffer]);
      const blobUrl = URL.createObjectURL(blob);
      return await loadImageDocumentModel(blobUrl, docId, fileName, cacheKey, resolvedUrl);
    }
  } catch (fetchErr) {
    console.warn("Universal binary fetch notice:", fetchErr);
  }

  // 3. URL and extension based detection fallback
  const lowerUrl = (resolvedUrl || "").toLowerCase();
  const lowerName = (fileName || "").toLowerCase();
  const isPdf =
    lowerUrl.includes(".pdf") ||
    lowerUrl.includes("%2fpdf") ||
    lowerUrl.includes("%2epdf") ||
    lowerName.endsWith(".pdf") ||
    lowerUrl.includes("application%2fpdf");

  try {
    if (isPdf) {
      return await loadPdfDocumentModel(resolvedUrl, docId, fileName, cacheKey);
    } else {
      return await loadImageDocumentModel(resolvedUrl, docId, fileName, cacheKey);
    }
  } catch (loaderErr) {
    console.warn("Primary loaders failed, using graceful fallback document:", loaderErr);
    return createDefaultFallbackModel(resolvedUrl, docId, fileName, cacheKey);
  }
}

/**
 * Loads and parses a PDF document from an ArrayBuffer
 */
async function loadPdfFromBuffer(
  buffer: ArrayBuffer,
  fileUrl: string,
  docId: string,
  fileName?: string,
  cacheKey?: string
): Promise<DocumentModel> {
  const cMapUrl = typeof window !== "undefined" ? `${window.location.origin}/cmaps/` : "/cmaps/";
  const loadingTask = pdfjsLib.getDocument({
    data: buffer,
    useSystemFonts: true,
    cMapUrl,
    cMapPacked: true,
  });

  const pdfDoc = await loadingTask.promise;
  return await processPdfDocument(pdfDoc, fileUrl, docId, fileName, cacheKey);
}

/**
 * Loads and parses a PDF document page by page from URL
 */
async function loadPdfDocumentModel(
  fileUrl: string,
  docId: string,
  fileName?: string,
  cacheKey?: string
): Promise<DocumentModel> {
  const cMapUrl = typeof window !== "undefined" ? `${window.location.origin}/cmaps/` : "/cmaps/";
  const loadingTask = pdfjsLib.getDocument({
    url: fileUrl,
    useSystemFonts: true,
    cMapUrl,
    cMapPacked: true,
  });

  const pdfDoc = await loadingTask.promise;
  return await processPdfDocument(pdfDoc, fileUrl, docId, fileName, cacheKey);
}

async function processPdfDocument(
  pdfDoc: any,
  fileUrl: string,
  docId: string,
  fileName?: string,
  cacheKey?: string
): Promise<DocumentModel> {
  const numPages = pdfDoc.numPages;
  const pages: DocumentPage[] = [];
  let totalCharacters = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const unscaledViewport = page.getViewport({ scale: 1 });
    // Scale 1.75 provides crisp HD rendering while keeping memory efficient
    const renderScale = typeof window !== "undefined" && window.devicePixelRatio > 1 ? 1.75 : 1.5;
    const viewport = page.getViewport({ scale: renderScale });

    // Render page canvas to high-res background data URL
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d");

    if (ctx) {
      await (page.render as any)({
        canvasContext: ctx,
        viewport,
        canvas,
      }).promise;
    }

    const backgroundUrl = canvas.toDataURL("image/jpeg", 0.92);

    // Extract text content items
    const textContent = await page.getTextContent();
    const textBlocks = groupTextItemsIntoBlocks(
      textContent.items,
      unscaledViewport.width,
      unscaledViewport.height
    );

    const pageCharCount = textBlocks.reduce((acc, b) => acc + b.text.length, 0);
    totalCharacters += pageCharCount;

    const pageObj: DocumentPage = {
      pageNumber: pageNum,
      width: Math.round(unscaledViewport.width),
      height: Math.round(unscaledViewport.height),
      backgroundUrl,
      textBlocks,
      isScanned: pageCharCount < 10,
    };

    const detectedHeader = detectPageHeaderBox(pageObj);
    if (detectedHeader) {
      pageObj.headerBoxData = detectedHeader;
    }

    pages.push(pageObj);
  }

  const isScannedPdf = totalCharacters < 20;

  const model: DocumentModel = {
    documentId: docId,
    sourceFileUrl: fileUrl,
    fileName: fileName || "document.pdf",
    fileType: "application/pdf",
    pageCount: numPages,
    pages,
    isScannedPdf,
  };

  if (cacheKey) {
    documentCache.set(cacheKey, model);
  }

  return model;
}

/**
 * Loads an image document (PNG, JPG) as a single page DocumentModel with CORS fallback
 */
async function loadImageDocumentModel(
  imgUrl: string,
  docId: string,
  fileName?: string,
  cacheKey?: string,
  originalUrl?: string
): Promise<DocumentModel> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Only set crossOrigin if blob or data URL to prevent CORS blocking
    if (imgUrl.startsWith("blob:") || imgUrl.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }

    img.onload = () => {
      const width = img.naturalWidth || 800;
      const height = img.naturalHeight || 1130;

      // Pre-seed clean editable header blocks for scanned image/photos if no text blocks exist
      const defaultHeaderBlocks: DocumentTextBlock[] = [
        {
          id: `hdr_${Date.now()}_1`,
          text: "शाळेचे नाव: जिल्हा परिषद प्राथमिक शाळा",
          x: 6,
          y: 3,
          width: 58,
          height: 3.5,
          fontSize: 14,
          fontWeight: "700",
          color: "#0f172a",
          fontFamily: "Noto Sans Devanagari, sans-serif",
          editable: true,
          isCustom: true,
        },
        {
          id: `hdr_${Date.now()}_2`,
          text: `दिनांक: ${new Date().toLocaleDateString("mr-IN")}`,
          x: 68,
          y: 3,
          width: 26,
          height: 3.5,
          fontSize: 13,
          fontWeight: "600",
          color: "#0f172a",
          fontFamily: "Noto Sans Devanagari, sans-serif",
          editable: true,
          isCustom: true,
        },
        {
          id: `hdr_${Date.now()}_3`,
          text: "विद्यार्थ्याचे नाव: _________________________  हजेरी क्र: ____",
          x: 6,
          y: 7.2,
          width: 88,
          height: 3.5,
          fontSize: 13,
          fontWeight: "600",
          color: "#0f172a",
          fontFamily: "Noto Sans Devanagari, sans-serif",
          editable: true,
          isCustom: true,
        },
      ];

      const page: DocumentPage = {
        pageNumber: 1,
        width,
        height,
        backgroundUrl: imgUrl,
        textBlocks: defaultHeaderBlocks,
        isScanned: true,
      };

      const model: DocumentModel = {
        documentId: docId,
        sourceFileUrl: originalUrl || imgUrl,
        fileName: fileName || "image_document.png",
        fileType: "image/png",
        pageCount: 1,
        pages: [page],
        isScannedPdf: true,
      };

      if (cacheKey) {
        documentCache.set(cacheKey, model);
      }

      resolve(model);
    };

    img.onerror = () => {
      // If loading via blob or with anonymous failed and originalUrl exists, try without crossOrigin
      if (originalUrl && originalUrl !== imgUrl) {
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          const width = fallbackImg.naturalWidth || 800;
          const height = fallbackImg.naturalHeight || 1130;

          const defaultHeaderBlocks: DocumentTextBlock[] = [
            {
              id: `hdr_${Date.now()}_1`,
              text: "शाळेचे नाव: जिल्हा परिषद प्राथमिक शाळा",
              x: 6,
              y: 3,
              width: 58,
              height: 3.5,
              fontSize: 14,
              fontWeight: "700",
              color: "#0f172a",
              fontFamily: "Noto Sans Devanagari, sans-serif",
              editable: true,
              isCustom: true,
            },
            {
              id: `hdr_${Date.now()}_2`,
              text: `दिनांक: ${new Date().toLocaleDateString("mr-IN")}`,
              x: 68,
              y: 3,
              width: 26,
              height: 3.5,
              fontSize: 13,
              fontWeight: "600",
              color: "#0f172a",
              fontFamily: "Noto Sans Devanagari, sans-serif",
              editable: true,
              isCustom: true,
            },
            {
              id: `hdr_${Date.now()}_3`,
              text: "विद्यार्थ्याचे नाव: _________________________  हजेरी क्र: ____",
              x: 6,
              y: 7.2,
              width: 88,
              height: 3.5,
              fontSize: 13,
              fontWeight: "600",
              color: "#0f172a",
              fontFamily: "Noto Sans Devanagari, sans-serif",
              editable: true,
              isCustom: true,
            },
          ];

          const page: DocumentPage = {
            pageNumber: 1,
            width,
            height,
            backgroundUrl: originalUrl,
            textBlocks: defaultHeaderBlocks,
            isScanned: true,
          };

          const model: DocumentModel = {
            documentId: docId,
            sourceFileUrl: originalUrl,
            fileName: fileName || "image_document.png",
            fileType: "image/png",
            pageCount: 1,
            pages: [page],
            isScannedPdf: true,
          };

          if (cacheKey) {
            documentCache.set(cacheKey, model);
          }

          resolve(model);
        };
        fallbackImg.onerror = () => {
          resolve(createDefaultFallbackModel(originalUrl, docId, fileName, cacheKey));
        };
        fallbackImg.src = originalUrl;
      } else {
        resolve(createDefaultFallbackModel(originalUrl || imgUrl, docId, fileName, cacheKey));
      }
    };

    img.src = imgUrl;
  });
}

/**
 * Load user-specific edits for Question Paper or Homework
 */
export async function loadUserDocumentEdits(
  docType: "question_paper" | "homework",
  documentId: string,
  userId: string
): Promise<UserDocumentEdits | null> {
  if (!userId || !documentId) return null;

  const subCol = docType === "question_paper" ? "questionPaperEdits" : "homeworkEdits";
  const localKey = `${subCol}_${userId}_${documentId}`;

  // 1. Try Firestore nested path: users/{userId}/{subCol}/{documentId}
  try {
    const userDocRef = doc(db, "users", userId, subCol, documentId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data() as UserDocumentEdits;
      localStorage.setItem(localKey, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn(`Firestore read fallback on users/${userId}/${subCol}/${documentId}:`, err);
  }

  // 2. Try Firestore top-level path: {subCol}/{userId}_{documentId}
  try {
    const topDocRef = doc(db, subCol, `${userId}_${documentId}`);
    const snap = await getDoc(topDocRef);
    if (snap.exists()) {
      const data = snap.data() as UserDocumentEdits;
      localStorage.setItem(localKey, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn(`Firestore read fallback on ${subCol}/${userId}_${documentId}:`, err);
  }

  // 3. Fallback to localStorage
  try {
    const localRaw = localStorage.getItem(localKey);
    if (localRaw) {
      return JSON.parse(localRaw) as UserDocumentEdits;
    }
  } catch (err) {
    console.warn("localStorage read failed:", err);
  }

  return null;
}

/**
 * Save user-specific edits without modifying the admin's original document
 */
export async function saveUserDocumentEdits(
  docType: "question_paper" | "homework",
  documentId: string,
  userId: string,
  pages: { pageNumber: number; textBlocks: DocumentTextBlock[]; headerBoxData?: QuestionPaperHeaderData }[],
  userRole: string = "teacher",
  userName?: string,
  headerBoxData?: QuestionPaperHeaderData
): Promise<void> {
  if (!userId || !documentId) {
    throw new Error("वापरकर्ता किंवा कागदपत्र आयडी सापडला नाही (Missing User or Document ID)");
  }

  const subCol = docType === "question_paper" ? "questionPaperEdits" : "homeworkEdits";
  const payload: UserDocumentEdits = {
    sourceDocumentId: documentId,
    userId,
    userRole,
    userName: userName || "",
    pages,
    headerBoxData,
    updatedAt: new Date().toISOString(),
  };

  // Always save locally immediately
  const localKey = `${subCol}_${userId}_${documentId}`;
  localStorage.setItem(localKey, JSON.stringify(payload));

  // Write to Firestore (both nested and top-level for safety)
  let savedToFirestore = false;

  try {
    const userDocRef = doc(db, "users", userId, subCol, documentId);
    await setDoc(userDocRef, payload, { merge: true });
    savedToFirestore = true;
  } catch (err) {
    console.warn(`Could not save to users/${userId}/${subCol}/${documentId}:`, err);
  }

  try {
    const topDocRef = doc(db, subCol, `${userId}_${documentId}`);
    await setDoc(topDocRef, payload, { merge: true });
    savedToFirestore = true;
  } catch (err) {
    console.warn(`Could not save to ${subCol}/${userId}_${documentId}:`, err);
  }

  if (!savedToFirestore) {
    console.info("Saved edits to browser storage safely.");
  }
}

/**
 * Reset user edits to original admin document
 */
export async function resetUserDocumentEdits(
  docType: "question_paper" | "homework",
  documentId: string,
  userId: string
): Promise<void> {
  const subCol = docType === "question_paper" ? "questionPaperEdits" : "homeworkEdits";
  const localKey = `${subCol}_${userId}_${documentId}`;

  localStorage.removeItem(localKey);

  try {
    const userDocRef = doc(db, "users", userId, subCol, documentId);
    await deleteDoc(userDocRef);
  } catch (e) {
    // Ignore deletion errors if doc doesn't exist
  }

  try {
    const topDocRef = doc(db, subCol, `${userId}_${documentId}`);
    await deleteDoc(topDocRef);
  } catch (e) {
    // Ignore deletion errors
  }
}

/**
 * Permanently purge all cached, local, and Firestore edits associated with a deleted document
 */
export async function purgeDocumentAndAllEdits(
  docType: "question_paper" | "homework",
  documentId: string,
  userId?: string
): Promise<void> {
  if (!documentId) return;

  // 1. Invalidate in-memory cache
  documentCache.delete(documentId);

  // 2. Clear all matching localStorage keys
  try {
    const subCol = docType === "question_paper" ? "questionPaperEdits" : "homeworkEdits";
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes(documentId) || key.includes(`${subCol}_`))) {
        if (key.includes(documentId)) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.warn("Error cleaning localStorage during purge:", err);
  }

  // 3. Clear Firestore user edits
  const subCol = docType === "question_paper" ? "questionPaperEdits" : "homeworkEdits";
  if (userId) {
    try {
      await deleteDoc(doc(db, "users", userId, subCol, documentId));
    } catch (_) {}
    try {
      await deleteDoc(doc(db, subCol, `${userId}_${documentId}`));
    } catch (_) {}
  }
}


function drawCanvasRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * Export DocumentModel with rendered pages & overlays to a multi-page PDF
 */
export async function exportDocumentToPdf(
  model: DocumentModel,
  outputFilename: string = "document.pdf"
): Promise<void> {
  if (!model.pages || model.pages.length === 0) return;

  const firstPage = model.pages[0];
  const isLandscape = firstPage.width > firstPage.height;
  const pdf = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "pt",
    format: [firstPage.width, firstPage.height],
  });

  for (let i = 0; i < model.pages.length; i++) {
    const page = model.pages[i];
    if (i > 0) {
      pdf.addPage([page.width, page.height], page.width > page.height ? "landscape" : "portrait");
    }

    // 1. Draw composite canvas (background + text overlays)
    const compositeCanvas = document.createElement("canvas");
    compositeCanvas.width = page.width * 2;
    compositeCanvas.height = page.height * 2;
    const ctx = compositeCanvas.getContext("2d");

    if (ctx) {
      ctx.scale(2, 2);

      // Draw background if present
      if (page.backgroundUrl) {
        await new Promise<void>((resolve) => {
          const bgImg = new Image();
          bgImg.crossOrigin = "anonymous";
          bgImg.onload = () => {
            ctx.drawImage(bgImg, 0, 0, page.width, page.height);
            resolve();
          };
          bgImg.onerror = () => resolve();
          bgImg.src = page.backgroundUrl!;
        });
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, page.width, page.height);
      }

      // Render Question Paper Header Box if present on Page 1 (only for question papers, never for homework)
      const headerBox = page.headerBoxData || (i === 0 ? model.headerBoxData : undefined);
      if (headerBox && headerBox.enabled !== false && model.documentType !== "homework") {
        ctx.save();

        // 0. Completely eradicate and wipe out any backside box from the background image on Page 1
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(page.width * 0.02, page.height * 0.005, page.width * 0.96, page.height * 0.255);

        // 1. Sharp rectangular box matching Screenshot 1 exactly
        const bx = page.width * 0.040;
        const by = page.height * 0.016;
        const bw = page.width * 0.920;
        const bh = page.height * 0.226;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(bx, by, bw, bh);

        // 2. 2px solid dark border
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);

        const isEng = Boolean(headerBox.isEnglish);

        // 3. Line 1: School Name
        ctx.fillStyle = "#0f172a";
        ctx.font = 'bold 18px "Noto Sans Devanagari", sans-serif';
        ctx.textBaseline = "top";
        const schoolLabel = isEng ? "SCHOOL NAME : " : "शाळेचे नाव : ";
        ctx.fillText(`${schoolLabel}${headerBox.schoolName || ""}`, bx + 16, by + 12);

        // 4. Line 2: Exam Title (centered)
        ctx.font = 'bold 16px "Noto Sans Devanagari", sans-serif';
        const titleText = headerBox.examTitle || (isEng ? "FORMATIVE EVALUATION TEST 1" : "आकारिक मूल्यमापन चाचणी क्र. १");
        const titleMetrics = ctx.measureText(titleText);
        ctx.fillText(titleText, bx + (bw - titleMetrics.width) / 2, by + 40);

        // 5. Line 3: Class, Subject, Marks
        ctx.font = 'bold 13px "Noto Sans Devanagari", sans-serif';
        const classLabel = isEng ? `STD - ${headerBox.className || "1"}` : `इयत्ता - ${headerBox.className || "१ ली"}`;
        ctx.fillText(classLabel, bx + 16, by + 68);
        const subjText = isEng ? `SUB - ${headerBox.subjectName || "MATH"}` : `विषय - ${headerBox.subjectName || "भाषा"}`;
        const subjMetrics = ctx.measureText(subjText);
        ctx.fillText(subjText, bx + (bw - subjMetrics.width) / 2, by + 68);
        const marksText = isEng ? `TOTAL MARKS - ${headerBox.totalMarks || "20"}` : `एकूण गुण - ${headerBox.totalMarks || "२०"}`;
        const marksMetrics = ctx.measureText(marksText);
        ctx.fillText(marksText, bx + bw - marksMetrics.width - 16, by + 68);

        // 6. Line 4: Student Name & Roll No
        ctx.font = 'bold 12.5px "Noto Sans Devanagari", sans-serif';
        const studentLabel = isEng ? "STUDENT NAME :" : "विद्यार्थ्याचे नाव :-";
        ctx.fillText(studentLabel, bx + 16, by + 96);
        const sLabelWidth = ctx.measureText(studentLabel).width;
        // underline
        ctx.beginPath();
        ctx.moveTo(bx + 16 + sLabelWidth + 6, by + 110);
        ctx.lineTo(bx + 16 + sLabelWidth + 240, by + 110);
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 1;
        ctx.stroke();
        if (headerBox.studentName && headerBox.studentName !== "_____________________") {
          ctx.fillText(headerBox.studentName, bx + 16 + sLabelWidth + 10, by + 96);
        }

        // Roll no square box
        const rollLabel = isEng ? "ROLL NO.-" : "हजेरी क्रमांक -";
        const rollMetrics = ctx.measureText(rollLabel);
        const rollBoxX = bx + bw - 44;
        const rollBoxY = by + 90;
        ctx.fillText(rollLabel, rollBoxX - rollMetrics.width - 8, by + 96);
        drawCanvasRoundedRect(ctx, rollBoxX, rollBoxY, 26, 26, 2);
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        if (headerBox.rollNo) {
          ctx.fillText(headerBox.rollNo, rollBoxX + 6, rollBoxY + 5);
        }

        // 7. Line 5: Date & Marks Obtained
        ctx.fillText(headerBox.examDate || (isEng ? "DATE -   /   / 2026" : "दि.   /   / २०२६"), bx + 16, by + 124);

        // Obtained marks square box
        const obtLabel = isEng ? "OBTAINED MARKS-" : "मिळालेले गुण -";
        const obtMetrics = ctx.measureText(obtLabel);
        const obtBoxX = bx + bw - 44;
        const obtBoxY = by + 118;
        ctx.fillText(obtLabel, obtBoxX - obtMetrics.width - 8, by + 124);
        drawCanvasRoundedRect(ctx, obtBoxX, obtBoxY, 26, 26, 2);
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        if (headerBox.obtainedMarks) {
          ctx.fillText(headerBox.obtainedMarks, obtBoxX + 6, obtBoxY + 5);
        }

        ctx.restore();
      }

      // Draw modified or custom text blocks over background
      for (const block of page.textBlocks) {
        const isModified = Boolean(block.isCustom || block.isEdited || block.isErased);
        if (!isModified) continue;

        // If header box is active on Page 1, skip blocks in header region
        if (headerBox && headerBox.enabled !== false && block.y < 26) {
          continue;
        }

        const isSchoolName =
          (block.text || "").includes("शाळेचे नाव") ||
          (block.text || "").includes("SCHOOL NAME") ||
          block.id === "custom_filled_school_name";

        const origW = (((block.origWidth || block.width) / 100) * page.width);
        const origH = (((block.origHeight || block.height) / 100) * page.height);
        const curW = ((block.width / 100) * page.width);
        const curH = ((block.height / 100) * page.height);
        let maskW = Math.max(origW, curW);
        let maskH = Math.max(origH, curH);

        const x = (block.x / 100) * page.width;
        const y = (block.y / 100) * page.height;

        const isBold = block.fontWeight === "bold" || (typeof block.fontWeight === "number" && block.fontWeight >= 600);
        const weight = isBold ? "bold" : "normal";
        const isSingleLine = !Boolean(block.text && block.text.includes("\n"));
        const isSingleWord = isSingleLine && !block.text?.trim().includes(" ");
        const fontSize = block.fontSize || 12;

        // Accurately measure rendered text width so mask and drawing cover the text properly
        let measuredW = curW;
        if (block.text && block.text.trim() && !block.isErased) {
          ctx.font = `${weight} ${fontSize}px "Noto Sans Devanagari", sans-serif`;
          measuredW = ctx.measureText(block.text).width;
          maskW = Math.max(maskW, measuredW);
        }

        const origCenterPt = x + (origW / 2);
        const drawX = isSingleWord && isModified && measuredW > origW
          ? Math.max(x - ((measuredW - origW) / 2), origCenterPt - (measuredW / 2))
          : x;
        // Shift Y down by 0.22 * fontSize so baseline matches and top does not clip into box borders
        const drawY = isSingleLine && !isSchoolName ? y + (fontSize * 0.22) : y;

        if (isSchoolName) {
          // Stretch white mask across the entire header dotted area and both lines of dots to right border
          maskW = Math.max(maskW, (page.width * 0.92) - x);
          maskH = Math.max(maskH, page.height * 0.045);
        }

        // If block is custom, edited, or erased: render solid white rectangle over original bounding box
        if (isModified) {
          ctx.fillStyle = "#ffffff";
          const maskLeft = isSchoolName ? x : Math.min(x, drawX) - 1;
          const maskRight = isSchoolName ? (x + maskW) : Math.max(x + origW, drawX + measuredW) + 1;
          const maskTotalW = maskRight - maskLeft;
          ctx.fillRect(
            maskLeft,
            isSchoolName ? y : drawY - 1,
            maskTotalW,
            isSchoolName ? maskH : (fontSize * 1.15)
          );
        }

        // Draw new text if present and not erased
        if (block.text && block.text.trim() && !block.isErased) {
          ctx.fillStyle = block.color || "#0f172a";
          ctx.font = `${weight} ${fontSize}px "Noto Sans Devanagari", sans-serif`;
          ctx.textBaseline = "top";

          if (isSchoolName) {
            // Always keep on 1 line! Dynamically scale font size so it fits cleanly
            let fitSize = fontSize || 14;
            ctx.font = `${weight} ${fitSize}px "Noto Sans Devanagari", sans-serif`;
            const maxAllowedWidth = Math.max(page.width - x - 25, 200);
            while (ctx.measureText(block.text).width > maxAllowedWidth && fitSize > 8) {
              fitSize -= 0.5;
              ctx.font = `${weight} ${fitSize}px "Noto Sans Devanagari", sans-serif`;
            }
            ctx.fillText(block.text, x, y);
          } else if (isSingleLine) {
            // Never wrap single-line words/text across lines! Fits cleanly on one line inside boxes
            ctx.fillText(block.text, drawX, drawY);
          } else {
            // Word wrap multiline text within width
            const lines = wrapText(ctx, block.text, Math.max(maskW, 80));
            let curY = y;
            for (const line of lines) {
              ctx.fillText(line, x, curY);
              curY += fontSize * 1.25;
            }
          }
        }
      }

      const imgData = compositeCanvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(imgData, "JPEG", 0, 0, page.width, page.height);
    }
  }

  pdf.save(outputFilename.endsWith(".pdf") ? outputFilename : `${outputFilename}.pdf`);
}

/**
 * Print DocumentModel directly using print stylesheet / window
 */
export function printDocument(model: DocumentModel): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("कृपया पॉप-अप ब्लॉकर अक्षम करा (Please allow popups to print)");
    return;
  }

  const pagesHtml = model.pages
    .map(
      (page) => `
    <div class="print-page" style="position: relative; width: ${page.width}pt; height: ${page.height}pt; page-break-after: always; margin: 0 auto; overflow: hidden; background: white;">
      ${
        page.backgroundUrl
          ? `<img src="${page.backgroundUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain;" />`
          : ""
      }
      ${(() => {
        const hb = page.headerBoxData || (page.pageNumber === 1 ? model.headerBoxData : undefined);
        if (hb && hb.enabled !== false && model.documentType !== "homework") {
          const isEng = Boolean(hb.isEnglish);
          return `
            <!-- 0. Whiteout mask to 100% eradicate the backsides box -->
            <div style="position: absolute; left: 2.0%; top: 0.5%; width: 96.0%; height: 25.5%; background: white; z-index: 45;"></div>
            <!-- 1. Clean rectangular header box -->
            <div style="position: absolute; left: 4.0%; top: 1.6%; width: 92.0%; min-height: 22.6%; background: white; border: 2px solid #0f172a; border-radius: 0px; padding: 10px 14px; box-sizing: border-box; font-family: 'Noto Sans Devanagari', sans-serif; z-index: 50; color: #0f172a;">
              <div style="font-size: 17px; font-weight: 800; margin-bottom: 4px;">
                ${isEng ? 'SCHOOL NAME :' : 'शाळेचे नाव :'} ${escapeHtml(hb.schoolName || '')}
              </div>
              <div style="font-size: 15px; font-weight: 800; text-align: center; margin: 4px 0;">
                ${escapeHtml(hb.examTitle || (isEng ? 'FORMATIVE EVALUATION TEST 1' : 'आकारिक मूल्यमापन चाचणी क्र. १'))}
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; margin-top: 6px; padding-top: 4px; border-top: 1px solid #e2e8f0;">
                <div>${isEng ? 'STD - ' : 'इयत्ता - '}${escapeHtml(hb.className || (isEng ? '1' : '१ ली'))}</div>
                <div>${isEng ? 'SUB - ' : 'विषय - '}${escapeHtml(hb.subjectName || (isEng ? 'MATH' : 'भाषा'))}</div>
                <div>${isEng ? 'TOTAL MARKS - ' : 'एकूण गुण - '}${escapeHtml(hb.totalMarks || (isEng ? '20' : '२०'))}</div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; font-weight: 700; margin-top: 6px;">
                <div style="display: flex; align-items: center; gap: 4px; flex: 1;">
                  <span>${isEng ? 'STUDENT NAME :' : 'विद्यार्थ्याचे नाव :-'}</span>
                  <span style="border-bottom: 1px solid #0f172a; display: inline-block; min-width: 140px; max-width: 260px; padding: 0 4px;">
                    ${hb.studentName && hb.studentName !== '_____________________' ? escapeHtml(hb.studentName) : '&nbsp;'}
                  </span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span>${isEng ? 'ROLL NO. -' : 'हजेरी क्रमांक -'}</span>
                  <div style="width: 26px; height: 26px; border: 2px solid #0f172a; border-radius: 2px; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; background: white;">
                    ${escapeHtml(hb.rollNo || '')}
                  </div>
                </div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; font-weight: 700; margin-top: 6px;">
                <div>${escapeHtml(hb.examDate || (isEng ? 'DATE -   /   / 2026' : 'दि.   /   / २०२६'))}</div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span>${isEng ? 'OBTAINED MARKS -' : 'मिळालेले गुण -'}</span>
                  <div style="width: 26px; height: 26px; border: 2px solid #0f172a; border-radius: 2px; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; background: white;">
                    ${escapeHtml(hb.obtainedMarks || '')}
                  </div>
                </div>
              </div>
            </div>
          `;
        }
        return '';
      })()}
      ${page.textBlocks
        .filter((b) => {
          const hb = page.headerBoxData || (page.pageNumber === 1 ? model.headerBoxData : undefined);
          if (hb && hb.enabled !== false && model.documentType !== "homework" && b.y < 26) return false;
          return b.isCustom || b.isEdited || b.isErased;
        })
        .map((b) => {
          const isSchool = (b.text || '').includes('शाळेचे नाव') || (b.text || '').includes('SCHOOL NAME') || b.id === 'custom_filled_school_name';
          const isSingleLine = !Boolean((b.text || '').includes('\n'));
          const isSingleWord = isSingleLine && !(b.text || '').trim().includes(' ');
          const origW = b.origWidth || b.width;
          const fontSize = b.fontSize || 12;
          const yOffsetPct = isSingleLine && !isSchool ? ((fontSize * 0.22) / page.height) * 100 : 0;
          const topPct = b.y + yOffsetPct;
          const origCenterXPct = (b.origX ?? b.x) + (origW / 2);
          const leftPct = isSingleWord && !isSchool && b.width > origW
            ? Math.max(b.x - ((b.width - origW) / 2), origCenterXPct - (b.width / 2))
            : b.x;
          const w = isSchool ? Math.max(b.width, origW, 92.0 - b.x) : Math.max(b.width, origW);
          const h = isSchool ? Math.max(b.height, b.origHeight || b.height, 4.5) : Math.max(b.height, b.origHeight || b.height);
          const hasText = b.text && b.text.trim() && !b.isErased;
          const isBold = b.fontWeight === "bold" || (typeof b.fontWeight === "number" && b.fontWeight >= 600);
          return `
        <div style="position: absolute; left: ${leftPct}%; top: ${topPct}%; min-width: ${w}%; width: ${isSingleLine ? 'max-content' : 'auto'}; min-height: ${isSingleLine ? 'auto' : `${h}%`}; background: #ffffff; color: ${b.color || "#0f172a"}; font-size: ${fontSize}px; font-family: 'Noto Sans Devanagari', sans-serif; font-weight: ${isBold ? 'bold' : 'normal'}; z-index: 10; padding: 0 2px; line-height: 1.15; white-space: ${isSingleLine ? 'nowrap' : 'normal'}; display: ${isSingleWord ? 'inline-flex' : 'block'}; align-items: center; justify-content: ${isSingleWord ? 'center' : 'flex-start'}; text-align: ${isSingleWord ? 'center' : 'left'};">
          ${hasText ? escapeHtml(b.text) : ""}
        </div>
      `;
        })
        .join("")}
    </div>
  `
    )
    .join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${escapeHtml(model.fileName || "कागदपत्र")}</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700;800&display=swap" />
        <style>
          @page { size: auto; margin: 0; }
          body { margin: 0; padding: 0; background: #525659; font-family: 'Noto Sans Devanagari', sans-serif; }
          .print-page { box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-bottom: 20px; }
          @media print {
            body { background: transparent; }
            .print-page { box-shadow: none; margin: 0; page-break-after: always; }
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 600);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (!text) return [];
  const paragraphs = text.split("\n");
  const allLines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(" ");
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = ctx.measureText(testLine).width;
      if (testWidth > maxWidth && currentLine) {
        allLines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) allLines.push(currentLine);
    else if (paragraphs.length > 1) allLines.push(""); // Preserve empty paragraph breaks
  }
  return allLines;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
