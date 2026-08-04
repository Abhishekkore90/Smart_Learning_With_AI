import * as XLSX from "xlsx";

/**
 * Dynamically loads html2pdf.js in the browser.
 */
async function getHtml2Pdf() {
  const html2pdf = (await import("html2pdf.js")).default;
  return html2pdf;
}

/**
 * Dynamically loads mammoth in the browser.
 */
async function getMammoth() {
  const mammoth = await import("mammoth");
  return mammoth;
}

/**
 * Converts an HTML string into a PDF Blob.
 */
async function convertHtmlToPdfBlob(htmlContent: string, fileName: string): Promise<Blob> {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.width = "790px"; // Standard width for A4
  container.style.padding = "20px";
  container.style.fontFamily = "'Noto Sans Devanagari', 'Inter', sans-serif";
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    const html2pdf = await getHtml2Pdf();
    const opt = {
      margin: [10, 10, 10, 10],
      filename: fileName,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    const pdfBlob = (await html2pdf().from(container).set(opt).output("blob")) as Blob;
    return pdfBlob;
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Converts a Word (.docx) file into a PDF Blob.
 */
export async function convertDocxToPdf(file: File): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const mammoth = await getMammoth();

  const options = {
    styleMap: [
      "p[style-name='Heading 1'] => h1:carousels",
      "p[style-name='Heading 2'] => h2:carousels",
      "table => table.table.table-bordered",
    ],
  };

  const result = await mammoth.convertToHtml({ arrayBuffer }, options);
  let html = result.value;

  // Add styles to make table rendering look good in PDF
  const styledHtml = `
    <style>
      body { font-family: 'Noto Sans Devanagari', sans-serif; font-size: 12px; color: #1e293b; }
      h1, h2, h3 { color: #4f46e5; text-align: center; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
      th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; }
      th { background-color: #f1f5f9; font-weight: bold; }
    </style>
    ${html}
  `;

  return await convertHtmlToPdfBlob(styledHtml, file.name.replace(/\.[^/.]+$/, ".pdf"));
}

/**
 * Converts an Excel (.xlsx, .xls) file into a PDF Blob.
 */
export async function convertExcelToPdf(file: File): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  
  let htmlContent = "";

  workbook.SheetNames.forEach((sheetName, index) => {
    const worksheet = workbook.Sheets[sheetName];
    // Convert to HTML
    const rawHtml = XLSX.utils.sheet_to_html(worksheet, {
      header: `<h3>${sheetName}</h3>`,
      footer: "",
    });

    // Add page break before all sheets except the first
    if (index > 0) {
      htmlContent += `<div style="page-break-before: always;"></div>`;
    }
    htmlContent += rawHtml;
  });

  const styledHtml = `
    <style>
      body { font-family: 'Noto Sans Devanagari', sans-serif; font-size: 10px; color: #1e293b; }
      h3 { color: #4f46e5; margin-top: 20px; font-size: 14px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; }
      th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; }
      th { background-color: #f1f5f9; font-weight: bold; }
    </style>
    ${htmlContent}
  `;

  return await convertHtmlToPdfBlob(styledHtml, file.name.replace(/\.[^/.]+$/, ".pdf"));
}

/**
 * Converts a legacy Word binary (.doc) file by extracting text and rendering it.
 */
export async function convertDocToPdf(file: File): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const len = arrayBuffer.byteLength;
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  let extractedText = "";

  // Unicode text scanner
  for (let i = 0; i < len - 1; i += 2) {
    const code = view.getUint16(i, true);
    if ((code >= 32 && code <= 126) || (code >= 0x0900 && code <= 0x097F) || code === 10 || code === 13) {
      extractedText += String.fromCharCode(code);
    }
  }

  // Fallback to ASCII byte scanner
  if (extractedText.trim().length < 50) {
    extractedText = "";
    for (let i = 0; i < len; i++) {
      const code = bytes[i];
      if ((code >= 32 && code <= 126) || code === 10 || code === 13) {
        extractedText += String.fromCharCode(code);
      }
    }
  }

  // Clean the text
  const cleanParagraphs = extractedText
    .replace(/[ \t]+/g, " ")
    .replace(/\r/g, "")
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 5);

  const htmlContent = cleanParagraphs.map(p => `<p>${p}</p>`).join("");

  const styledHtml = `
    <style>
      body { font-family: 'Noto Sans Devanagari', sans-serif; font-size: 12px; line-height: 1.6; color: #1e293b; }
      p { margin-bottom: 12px; text-align: justify; }
    </style>
    <h2>${file.name.replace(/\.[^/.]+$/, "")}</h2>
    ${htmlContent}
  `;

  return await convertHtmlToPdfBlob(styledHtml, file.name.replace(/\.[^/.]+$/, ".pdf"));
}
