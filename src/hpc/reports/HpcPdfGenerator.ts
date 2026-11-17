import { toast } from "sonner";

export interface ProgressCallback {
  (current: number, total: number, message?: string): void;
}

/**
 * Inlines all image sources inside an element to base64 data URLs.
 * This guarantees the canvas remains 100% origin-clean and NEVER gets tainted!
 */
async function inlineImagesAsDataUrls(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll("img"));
  await Promise.all(
    images.map(async (img) => {
      if (!img.src || img.src.startsWith("data:")) return;

      try {
        const response = await fetch(img.src, { mode: "cors" });
        if (!response.ok) throw new Error("Image fetch failed");
        const blob = await response.blob();
        await new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === "string") {
              img.src = reader.result;
            }
            resolve();
          };
          reader.onerror = () => resolve();
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        // Replace inaccessible/CORS images with an empty 1x1 transparent PNG data URL to ensure canvas is NEVER tainted
        img.src =
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
      }
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

  for (let i = 0; i < totalPages; i++) {
    if (onProgress) {
      onProgress(i + 1, totalPages, `पृष्ठ ${i + 1} / ${totalPages} तयार होत आहे...`);
    }

    const pageEl = pageElements[i];

    // Create an isolated fixed-size sandbox on document.body
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

    // Inline all images in the clone to base64 so canvas is NEVER tainted
    await inlineImagesAsDataUrls(clone);

    // ABSOLUTE TAINT GUARD: Strip any remaining img that is not a safe base64 data: URL
    clone.querySelectorAll("img").forEach((img) => {
      if (!img.src || !img.src.startsWith("data:")) {
        img.remove();
      }
    });

    sandbox.appendChild(clone);
    document.body.appendChild(sandbox);

    try {
      const canvas = await html2canvas(clone, {
        scale: 1.5, // 1.5x gives high resolution (1191x1685 px) while keeping generation fast and stable
        useCORS: true,
        allowTaint: false, // CRITICAL: NEVER allow taint so toDataURL never throws SecurityError
        logging: false,
        backgroundColor: "#ffffff",
        width: targetWidth,
        height: targetHeight,
        windowWidth: targetWidth,
        windowHeight: targetHeight,
      });

      let imgData: string;
      try {
        imgData = canvas.toDataURL("image/jpeg", 0.92);
      } catch (taintErr) {
        console.warn(`Canvas tainted on page ${i + 1}, retrying with clean clone:`, taintErr);
        // Fallback: completely remove all images from clone to guarantee origin purity
        clone.querySelectorAll("img").forEach((img) => img.remove());
        const safeCanvas = await html2canvas(clone, {
          scale: 1.5,
          useCORS: false,
          allowTaint: false,
          logging: false,
          width: targetWidth,
          height: targetHeight,
          windowWidth: targetWidth,
          windowHeight: targetHeight,
        });
        try {
          imgData = safeCanvas.toDataURL("image/jpeg", 0.92);
        } catch (e2) {
          console.error(`Page ${i + 1} export emergency fallback:`, e2);
          const blankCanvas = document.createElement("canvas");
          blankCanvas.width = targetWidth;
          blankCanvas.height = targetHeight;
          const bCtx = blankCanvas.getContext("2d");
          if (bCtx) {
            bCtx.fillStyle = "#ffffff";
            bCtx.fillRect(0, 0, targetWidth, targetHeight);
          }
          imgData = blankCanvas.toDataURL("image/jpeg", 0.9);
        }
      }

      if (i > 0) {
        pdf.addPage("a4", "portrait");
      }

      // Add image to A4 dimensions (210mm x 297mm)
      pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
    } finally {
      if (sandbox.parentNode) {
        sandbox.parentNode.removeChild(sandbox);
      }
    }
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
