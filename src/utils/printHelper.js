/**
 * Utility for printing elements or HTML content with full Vercel CSS styles,
 * Google Devanagari fonts, exact color preservation, and proper load waiting.
 */
export const printReportContent = (contentOrElement, options = {}) => {
  const {
    title = "Report Print",
    landscape = false,
    extraCss = "",
  } = options;

  let htmlContent = "";
  if (typeof contentOrElement === "string") {
    htmlContent = contentOrElement;
  } else if (contentOrElement && contentOrElement.innerHTML) {
    htmlContent = contentOrElement.innerHTML;
  } else {
    console.error("Invalid content element provided for printing");
    return;
  }

  // 1. Gather all CSS link tags and style tags from current document (crucial for Vercel production bundles)
  const currentStyles = typeof document !== "undefined"
    ? Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map((el) => el.outerHTML)
        .join("\n")
    : "";

  // 2. Google Devanagari & Marathi Fonts
  const googleFonts = `
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@400;500;600;700;800&family=Noto+Sans+Devanagari:wght@400;500;600;700;800;900&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
  `;

  // 3. Create print window
  const printWindow = window.open("", "_blank", "width=1100,height=800");
  if (!printWindow) {
    alert("Popup blocked! Please allow popups for this site to view/print reports.");
    return;
  }

  const pageMargin = landscape
    ? "@page { size: A4 landscape; margin: 4mm; }"
    : "@page { size: A4 portrait; margin: 4mm; }";

  const fullDocument = `
    <!DOCTYPE html>
    <html lang="mr">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        ${googleFonts}
        ${currentStyles}
        <style>
          ${pageMargin}
          html, body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-family: 'Noto Sans Devanagari', 'Mukta', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif !important;
            margin: 0 !important;
            padding: 4mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          table th, table td {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @media print {
            .no-print, button, .pdf-hide, nav, header, footer {
              display: none !important;
            }
            body {
              background-color: #ffffff !important;
            }
          }
          ${extraCss}
        </style>
      </head>
      <body>
        <div class="print-container-root">
          ${htmlContent}
        </div>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(fullDocument);
  printWindow.document.close();

  const doPrint = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };

  if (printWindow.document.readyState === "complete") {
    doPrint();
  } else {
    printWindow.onload = doPrint;
  }
};
