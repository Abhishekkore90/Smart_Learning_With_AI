import * as pdfjsLib from "pdfjs-dist";
import { jsPDF } from "jspdf";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import type {
  DocumentModel,
  DocumentPage,
  DocumentTextBlock,
  UserDocumentEdits,
} from "@/types/documentEditor";

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

  // Filter out empty items
  const validItems = items
    .filter((item) => item.str && item.str.trim())
    .map((item, idx) => {
      // transform: [scaleX, skewY, skewX, scaleY, tx, ty]
      const tx = item.transform[4];
      const ty = item.transform[5];
      // In PDF coordinate space, ty is from bottom. Convert to top-left coordinate
      const fontSize = Math.hypot(item.transform[0], item.transform[1]) || 12;
      const x = tx;
      const y = viewportHeight - ty - fontSize; // approximate top in viewport
      const width = item.width || (item.str.length * fontSize * 0.55);
      const height = item.height || (fontSize * 1.2);

      return {
        id: `t_${idx}_${Math.round(x)}_${Math.round(y)}`,
        str: item.str,
        x,
        y,
        width,
        height,
        fontSize,
        fontFamily: item.fontName || "Noto Sans Devanagari",
      };
    });

  // Sort top-to-bottom, then left-to-right
  validItems.sort((a, b) => {
    if (Math.abs(a.y - b.y) > 6) {
      return a.y - b.y;
    }
    return a.x - b.x;
  });

  const blocks: DocumentTextBlock[] = [];
  let currentGroup: typeof validItems = [];

  const flushGroup = () => {
    if (currentGroup.length === 0) return;
    const first = currentGroup[0];
    const last = currentGroup[currentGroup.length - 1];

    const minX = Math.min(...currentGroup.map((g) => g.x));
    const minY = Math.min(...currentGroup.map((g) => g.y));
    const maxX = Math.max(...currentGroup.map((g) => g.x + g.width));
    const maxY = Math.max(...currentGroup.map((g) => g.y + g.height));

    const combinedText = currentGroup.map((g) => g.str).join(" ");
    const avgFontSize = Math.round(
      currentGroup.reduce((sum, g) => sum + g.fontSize, 0) / currentGroup.length
    );

    // Convert to percentages
    const xPct = Math.max(0, Math.min(100, (minX / viewportWidth) * 100));
    const yPct = Math.max(0, Math.min(100, (minY / viewportHeight) * 100));
    const wPct = Math.max(2, Math.min(100 - xPct, ((maxX - minX) / viewportWidth) * 100));
    const hPct = Math.max(1.5, Math.min(100 - yPct, ((maxY - minY) / viewportHeight) * 100));

    blocks.push({
      id: `blk_${blocks.length}_${Math.round(minX)}_${Math.round(minY)}`,
      text: combinedText,
      x: Number(xPct.toFixed(2)),
      y: Number(yPct.toFixed(2)),
      width: Number(wPct.toFixed(2)),
      height: Number(hPct.toFixed(2)),
      fontSize: avgFontSize || 14,
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
    const sameLine = Math.abs(item.y - prev.y) <= Math.max(5, prev.fontSize * 0.4);
    const adjacent = (item.x - (prev.x + prev.width)) <= Math.max(30, prev.fontSize * 2.2);

    if (sameLine && adjacent) {
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
  if (url.includes(".b-cdn.net/")) {
    const pathPart = url.replace(/^https?:\/\/[^/]+\//, "");
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

  // 2. Try fetching arrayBuffer to detect magic bytes and avoid CORS issues
  try {
    const res = await fetch(resolvedUrl);
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const headerBytes = new Uint8Array(buffer.slice(0, 5));
      const headerStr = String.fromCharCode(...headerBytes);

      // PDF Magic bytes: '%PDF-'
      if (headerStr.startsWith("%PDF")) {
        return await loadPdfFromBuffer(buffer, resolvedUrl, docId, fileName, cacheKey);
      }

      // Image bytes (PNG, JPEG, WebP, GIF)
      const blob = new Blob([buffer]);
      const blobUrl = URL.createObjectURL(blob);
      return await loadImageDocumentModel(blobUrl, docId, fileName, cacheKey, resolvedUrl);
    }
  } catch (fetchErr) {
    console.warn("Direct buffer fetch bypassed, using URL loaders:", fetchErr);
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

    pages.push({
      pageNumber: pageNum,
      width: Math.round(unscaledViewport.width),
      height: Math.round(unscaledViewport.height),
      backgroundUrl,
      textBlocks,
      isScanned: pageCharCount < 10,
    });
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
  pages: { pageNumber: number; textBlocks: DocumentTextBlock[] }[],
  userRole: string = "teacher",
  userName?: string
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

      // Draw modified or custom text blocks over background
      for (const block of page.textBlocks) {
        if (!block.text) continue;
        const x = (block.x / 100) * page.width;
        const y = (block.y / 100) * page.height;
        const w = (block.width / 100) * page.width;
        const h = (block.height / 100) * page.height;

        // If block is custom or was edited, render opaque backing so original text is cleanly replaced
        if (block.isCustom || (block as any).isEdited) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
        }

        ctx.fillStyle = block.color || "#0f172a";
        ctx.font = `${block.fontWeight || "600"} ${block.fontSize || 12}px "Noto Sans Devanagari", sans-serif`;
        ctx.textBaseline = "top";

        // Word wrap text within width
        const lines = wrapText(ctx, block.text, w);
        let curY = y;
        for (const line of lines) {
          ctx.fillText(line, x, curY);
          curY += (block.fontSize || 12) * 1.25;
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
      ${page.textBlocks
        .filter((b) => b.isCustom || (b as any).isEdited)
        .map(
          (b) => `
        <div style="position: absolute; left: ${b.x}%; top: ${b.y}%; width: ${b.width}%; background: white; color: ${b.color || "#0f172a"}; font-size: ${b.fontSize}px; font-family: 'Noto Sans Devanagari', sans-serif; font-weight: ${b.fontWeight || 600}; z-index: 10;">
          ${escapeHtml(b.text)}
        </div>
      `
        )
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
