import { parseWordData } from "@/services/fileReader/WordParser";

export interface DocxToPdfResult {
  pdfBlob: Blob;
  textContent: string;
  htmlContent: string;
}

/**
 * Converts a Word (.docx) file ArrayBuffer into a printable, high-quality A4 PDF Blob.
 * Handles Marathi Devanagari text, tables, and images gracefully.
 */
export async function convertDocxToPdfBlob(
  arrayBuffer: ArrayBuffer,
  documentTitle: string = "Question Paper"
): Promise<DocxToPdfResult> {
  // 1. Extract HTML and Text using Mammoth
  const parsed = await parseWordData(arrayBuffer);
  const rawHtml = parsed.htmlContent || `<p>${parsed.text}</p>`;

  // 2. Create off-screen styled container placed at (0, 0) behind viewport (zIndex: -99999)
  // html2canvas fails and produces blank canvases if elements are positioned at negative coordinates like left: -9999px!
  const tempContainer = document.createElement("div");
  tempContainer.style.position = "absolute";
  tempContainer.style.left = "0px";
  tempContainer.style.top = "0px";
  tempContainer.style.width = "794px"; // Standard A4 width at 96 DPI
  tempContainer.style.minHeight = "1123px"; // Standard A4 height at 96 DPI
  tempContainer.style.padding = "32px 36px";
  tempContainer.style.background = "#ffffff";
  tempContainer.style.color = "#0f172a";
  tempContainer.style.fontFamily = "'Noto Sans Devanagari', 'Inter', -apple-system, sans-serif";
  tempContainer.style.fontSize = "13.5px";
  tempContainer.style.lineHeight = "1.65";
  tempContainer.style.boxSizing = "border-box";
  tempContainer.style.zIndex = "-99999";
  tempContainer.style.opacity = "1";
  tempContainer.style.pointerEvents = "none";

  // Inject enhanced styling for tables, images, and paragraphs
  tempContainer.innerHTML = `
    <style>
      .docx-pdf-root {
        font-family: 'Noto Sans Devanagari', 'Inter', -apple-system, sans-serif;
        color: #0f172a;
        background: #ffffff;
      }
      .docx-pdf-root h1, .docx-pdf-root h2, .docx-pdf-root h3 {
        font-weight: 800;
        color: #0f172a;
        margin-top: 14px;
        margin-bottom: 8px;
      }
      .docx-pdf-root p {
        margin: 6px 0;
        line-height: 1.6;
        font-size: 13.5px;
      }
      .docx-pdf-root table {
        width: 100%;
        border-collapse: collapse;
        margin: 12px 0;
      }
      .docx-pdf-root th, .docx-pdf-root td {
        border: 1px solid #334155;
        padding: 8px 10px;
        text-align: left;
        font-size: 12.5px;
      }
      .docx-pdf-root img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 10px auto;
      }
    </style>
    <div class="docx-pdf-root">
      ${rawHtml}
    </div>
  `;

  document.body.appendChild(tempContainer);

  try {
    // Wait for fonts to be ready
    if (document.fonts) {
      try {
        await document.fonts.ready;
      } catch (e) {}
    }

    // Wait for all inline images to load/decode
    const imgElements = Array.from(tempContainer.querySelectorAll("img"));
    if (imgElements.length > 0) {
      await Promise.all(
        imgElements.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );
    }

    // 3. Dynamically import html2pdf.js
    const html2pdfModule = await import("html2pdf.js");
    let html2pdfFn: any = html2pdfModule.default || html2pdfModule;
    if (html2pdfFn && html2pdfFn.default) {
      html2pdfFn = html2pdfFn.default;
    }

    if (typeof html2pdfFn !== "function") {
      if (typeof window !== "undefined" && typeof (window as any).html2pdf === "function") {
        html2pdfFn = (window as any).html2pdf;
      }
    }

    let pdfBlob: Blob | null = null;

    if (typeof html2pdfFn === "function") {
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${documentTitle}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 794,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      try {
        pdfBlob = await html2pdfFn().set(opt).from(tempContainer).outputPdf("blob");
      } catch (hErr) {
        console.warn("html2pdf processing notice, falling back to direct jsPDF:", hErr);
      }
    }

    // Robust jsPDF fallback if html2pdf failed or returned empty
    if (!pdfBlob || pdfBlob.size < 200) {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.text(documentTitle, 15, 20);
      doc.setFontSize(11);
      const plainLines = (parsed.text || rawHtml.replace(/<[^>]+>/g, " "))
        .split("\n")
        .filter((l: string) => l.trim());
      let y = 30;
      for (const line of plainLines) {
        const wrapped = doc.splitTextToSize(line, 180);
        for (const subLine of wrapped) {
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
          doc.text(subLine, 15, y);
          y += 6;
        }
      }
      pdfBlob = doc.output("blob");
    }

    return {
      pdfBlob,
      textContent: parsed.text,
      htmlContent: parsed.htmlContent,
    };
  } finally {
    if (document.body.contains(tempContainer)) {
      document.body.removeChild(tempContainer);
    }
  }
}
