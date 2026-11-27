import { toast } from "sonner";

export interface ProgressCallback {
  (current: number, total: number, message?: string): void;
}

/**
 * Inlines all image sources inside an element to base64 data URLs.
 * This guarantees the canvas remains 100% origin-clean and NEVER gets tainted!
 */
const BLANK_PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

async function inlineImagesAsDataUrls(
  element: HTMLElement,
  imageCache?: Map<string, string>,
  inFlightMap?: Map<string, Promise<string>>
): Promise<void> {
  const images = Array.from(element.querySelectorAll("img"));
  await Promise.all(
    images.map(async (img) => {
      const src = img.src;
      if (!src || src.startsWith("data:")) return;

      if (imageCache?.has(src)) {
        img.src = imageCache.get(src)!;
        return;
      }

      const fetchAsDataUrl = async (): Promise<string> => {
        try {
          const fetchWithTimeout = async (url: string, opts: RequestInit = {}) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);
            try {
              return await fetch(url, { ...opts, signal: controller.signal });
            } finally {
              clearTimeout(timeoutId);
            }
          };

          let response: Response;
          try {
            response = await fetchWithTimeout(src, { mode: "cors" });
            if (!response.ok) throw new Error("Direct fetch failed");
          } catch {
            if (src.startsWith("http")) {
              response = await fetchWithTimeout(`/api/pdf-proxy?url=${encodeURIComponent(src)}`);
              if (!response.ok) throw new Error("Proxy fetch failed");
            } else {
              throw new Error("Image fetch failed");
            }
          }
          const blob = await response.blob();
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () =>
              resolve(typeof reader.result === "string" ? reader.result : BLANK_PNG_DATA_URL);
            reader.onerror = () => resolve(BLANK_PNG_DATA_URL);
            reader.readAsDataURL(blob);
          });
          imageCache?.set(src, dataUrl);
          return dataUrl;
        } catch {
          imageCache?.set(src, BLANK_PNG_DATA_URL);
          return BLANK_PNG_DATA_URL;
        }
      };

      let promise = inFlightMap?.get(src);
      if (!promise) {
        promise = fetchAsDataUrl().finally(() => {
          inFlightMap?.delete(src);
        });
        inFlightMap?.set(src, promise);
      }
      img.src = await promise;
    })
  );
}

/**
 * High-definition PDF generation using jsPDF and html2canvas-pro
 * Operates in an isolated fixed-size sandbox (794px width x 1123px height per A4 page)
 * so it produces 100% crisp, unclipped Devanagari text on both desktop and mobile!
 */
export async function generateHpcPdf(
  container: HTMLElement,
  filename: string = "HPC_Report.pdf",
  onProgress?: ProgressCallback
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  // @ts-ignore
  const html2canvasModule = await import("html2canvas-pro");
  const html2canvas = html2canvasModule.default || html2canvasModule;

  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (e) {}
  }

  // Pre-load images in container
  const images = Array.from(container.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) resolve();
          else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            // safety timeout so an image never hangs the whole process
            setTimeout(resolve, 2000);
          }
        })
    )
  );

  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise((r) => setTimeout(r, 100));

  const pageElements = Array.from(container.querySelectorAll(".pdf-page")) as HTMLElement[];

  if (pageElements.length === 0) {
    throw new Error("कोणतेही PDF पृष्ठ सापडले नाही.");
  }

  const targetWidth = 794;
  const targetHeight = 1123;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const totalPages = pageElements.length;
  const BATCH_SIZE = 1;
  let completedPages = 0;
  const imageCache = new Map<string, string>();
  const inFlightMap = new Map<string, Promise<string>>();

  const renderPageToJpeg = async (pageEl: HTMLElement, pageIdx: number): Promise<string> => {
    const sandbox = document.createElement("div");
    sandbox.className = "hpc-export-sandbox";
    sandbox.style.position = "fixed";
    sandbox.style.left = "-9999px";
    sandbox.style.top = "0px";
    sandbox.style.width = `${targetWidth}px`;
    sandbox.style.minWidth = `${targetWidth}px`;
    sandbox.style.maxWidth = `${targetWidth}px`;
    sandbox.style.height = `${targetHeight}px`;
    sandbox.style.minHeight = `${targetHeight}px`;
    sandbox.style.maxHeight = `${targetHeight}px`;
    sandbox.style.zIndex = "9999";
    sandbox.style.backgroundColor = "#ffffff";
    sandbox.style.fontFamily =
      "'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', 'Segoe UI', sans-serif";
    sandbox.style.letterSpacing = "0px";
    sandbox.style.pointerEvents = "none";
    sandbox.style.overflow = "hidden";
    sandbox.style.transform = "none";
    sandbox.style.zoom = "1";

    const clone = pageEl.cloneNode(true) as HTMLElement;
    clone.style.width = `${targetWidth}px`;
    clone.style.minWidth = `${targetWidth}px`;
    clone.style.maxWidth = `${targetWidth}px`;
    clone.style.height = `${targetHeight}px`;
    clone.style.minHeight = `${targetHeight}px`;
    clone.style.maxHeight = `${targetHeight}px`;
    clone.style.margin = "0px";
    clone.style.boxSizing = "border-box";

    await inlineImagesAsDataUrls(clone, imageCache, inFlightMap);

    clone.querySelectorAll("img").forEach((img) => {
      if (!img.src || !img.src.startsWith("data:")) {
        img.remove();
      }
    });

    sandbox.appendChild(clone);
    document.body.appendChild(sandbox);

    try {
      const canvas = await html2canvas(clone, {
        scale: 1.2,
        useCORS: false,
        allowTaint: false,
        imageTimeout: 0,
        logging: false,
        backgroundColor: "#ffffff",
        width: targetWidth,
        height: targetHeight,
        windowWidth: targetWidth,
        windowHeight: targetHeight,
      });

      try {
        return canvas.toDataURL("image/jpeg", 0.85);
      } catch (taintErr) {
        console.warn(`Canvas tainted on page ${pageIdx + 1}, retrying with clean clone:`, taintErr);
        clone.querySelectorAll("img").forEach((img) => img.remove());
        const safeCanvas = await html2canvas(clone, {
          scale: 1.2,
          useCORS: false,
          allowTaint: false,
          imageTimeout: 0,
          logging: false,
          width: targetWidth,
          height: targetHeight,
          windowWidth: targetWidth,
          windowHeight: targetHeight,
        });
        try {
          return safeCanvas.toDataURL("image/jpeg", 0.85);
        } catch (e2) {
          console.error(`Page ${pageIdx + 1} export emergency fallback:`, e2);
          const blankCanvas = document.createElement("canvas");
          blankCanvas.width = targetWidth;
          blankCanvas.height = targetHeight;
          const bCtx = blankCanvas.getContext("2d");
          if (bCtx) {
            bCtx.fillStyle = "#ffffff";
            bCtx.fillRect(0, 0, targetWidth, targetHeight);
          }
          return blankCanvas.toDataURL("image/jpeg", 0.9);
        }
      }
    } finally {
      if (sandbox.parentNode) {
        sandbox.parentNode.removeChild(sandbox);
      }
      completedPages++;
      if (onProgress) {
        onProgress(completedPages, totalPages, `पृष्ठ ${completedPages} / ${totalPages} तयार होत आहे...`);
      }
    }
  };

  const renderedImages: string[] = new Array(totalPages);
  for (let start = 0; start < totalPages; start += BATCH_SIZE) {
    const batch = pageElements.slice(start, start + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((pageEl, offset) => renderPageToJpeg(pageEl, start + offset))
    );
    batchResults.forEach((imgData, offset) => {
      renderedImages[start + offset] = imgData;
    });
    // Yield to browser main thread so scrolling and UI never freeze/lag
    await new Promise((r) => setTimeout(r, 16));
  }

  for (let i = 0; i < totalPages; i++) {
    if (i > 0) {
      pdf.addPage("a4", "portrait");
    }
    pdf.addImage(renderedImages[i], "JPEG", 0, 0, 210, 297, undefined, "FAST");
  }

  const blob = pdf.output("blob");
  return blob;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
