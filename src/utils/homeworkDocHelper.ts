import { jsPDF } from "jspdf";

/**
 * Helper to identify whether a homework item is a Word (.docx / .doc) document
 */
export const isWordHomework = (item: any): boolean => {
  if (!item) return false;
  if (item.wordFileUrl) return true;
  if (item.documentType === "docx" || item.documentType === "word") return true;
  const lowerUrl = (item.fileUrl || "").toLowerCase();
  const lowerName = (item.fileName || "").toLowerCase();
  const lowerWordName = (item.wordFileName || "").toLowerCase();
  return (
    lowerName.endsWith(".docx") ||
    lowerName.endsWith(".doc") ||
    lowerWordName.endsWith(".docx") ||
    lowerWordName.endsWith(".doc") ||
    lowerUrl.includes(".docx") ||
    lowerUrl.includes(".doc")
  );
};

export interface HomeworkHeaderProfile {
  schoolName: string;
  kendra: string;
  taluka: string;
  district: string;
  teacherName: string;
  headmasterName: string;
}

export const getHomeworkHeaderProfile = (userId?: string): HomeworkHeaderProfile => {
  const uKey = userId || "guest";
  if (typeof window === "undefined") {
    return {
      schoolName: "",
      kendra: "",
      taluka: "",
      district: "",
      teacherName: "",
      headmasterName: "",
    };
  }

  const getVal = (prefix: string): string => {
    const directUser = localStorage.getItem(`${prefix}_${uKey}`);
    if (directUser && directUser.trim()) return directUser.trim();

    const globalVal = localStorage.getItem(prefix);
    if (globalVal && globalVal.trim()) return globalVal.trim();

    const guestVal = localStorage.getItem(`${prefix}_guest`);
    if (guestVal && guestVal.trim()) return guestVal.trim();

    const guestTeacherVal = localStorage.getItem(`${prefix}_guest_teacher`);
    if (guestTeacherVal && guestTeacherVal.trim()) return guestTeacherVal.trim();

    return "";
  };

  let schoolName =
    getVal("hw_v2_school") ||
    getVal("user_school_name") ||
    "";
  let kendra = getVal("hw_v2_kendra");
  let taluka = getVal("hw_v2_taluka");
  let district = getVal("hw_v2_district");
  let teacherName = getVal("hw_v2_teacher");
  let headmasterName = getVal("hw_v2_headmaster");

  // If blank in hw_v2_*, fall back to sqaaf_teacher_profile
  if (!schoolName || !teacherName) {
    try {
      const sqaaf = localStorage.getItem("sqaaf_teacher_profile");
      if (sqaaf) {
        const p = JSON.parse(sqaaf);
        if (!schoolName && p.schoolName) schoolName = p.schoolName.trim();
        if (!kendra && p.kendra) kendra = p.kendra.trim();
        if (!taluka && p.taluka) taluka = p.taluka.trim();
        if (!district && p.district) district = p.district.trim();
        if (!teacherName && p.fullName) teacherName = p.fullName.trim();
        if (!headmasterName && p.headmasterName) headmasterName = p.headmasterName.trim();
      }
    } catch {}
  }

  return {
    schoolName,
    kendra,
    taluka,
    district,
    teacherName,
    headmasterName,
  };
};

export const saveHomeworkHeaderProfile = (
  userId: string | undefined,
  profile: Partial<HomeworkHeaderProfile>
) => {
  if (typeof window === "undefined") return;
  const uKey = userId || "guest";
  localStorage.setItem(`hw_profile_v2_saved_${uKey}`, "true");
  localStorage.setItem("hw_profile_v2_saved", "true");

  const saveMulti = (prefix: string, val?: string) => {
    const clean = val?.trim();
    if (clean) {
      localStorage.setItem(`${prefix}_${uKey}`, clean);
      localStorage.setItem(prefix, clean);
      localStorage.setItem(`${prefix}_guest`, clean);
      localStorage.setItem(`${prefix}_guest_teacher`, clean);
    } else {
      localStorage.removeItem(`${prefix}_${uKey}`);
    }
  };

  saveMulti("hw_v2_school", profile.schoolName);
  if (profile.schoolName?.trim()) {
    saveMulti("user_school_name", profile.schoolName);
  }

  saveMulti("hw_v2_kendra", profile.kendra);
  saveMulti("hw_v2_taluka", profile.taluka);
  saveMulti("hw_v2_district", profile.district);
  saveMulti("hw_v2_teacher", profile.teacherName);
  saveMulti("hw_v2_headmaster", profile.headmasterName);
};

export const formatHomeworkDateToMarathi = (
  dateInput?: string
): { dayOfWeek: string; dateStr: string } => {
  const marathiDays = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
  const marathiMonths = [
    "जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून",
    "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"
  ];

  let d = new Date();
  if (dateInput) {
    const clean = dateInput.trim();
    if (clean.includes("-") || clean.includes("/")) {
      const parts = clean.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          d = new Date(y, m, day);
        } else {
          // DD-MM-YYYY
          const day = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const y = parseInt(parts[2], 10);
          d = new Date(y, m, day);
        }
      }
    } else {
      const parsed = new Date(dateInput);
      if (!isNaN(parsed.getTime())) {
        d = parsed;
      }
    }
  }

  const dayOfWeek = marathiDays[d.getDay()] || "शुक्रवार";
  const dateStr = `${d.getDate()} ${marathiMonths[d.getMonth()] || "ऑक्टोबर"} ${d.getFullYear()}`;
  return { dayOfWeek, dateStr };
};

export const getMarathiClassLabel = (cls?: string): string => {
  if (!cls) return "१ ली";
  const c = cls.trim().toLowerCase();
  if (c.includes("1st") || c.includes("1 ली") || c === "1" || c.includes("पहिली") || c.includes("first")) return "१ ली";
  if (c.includes("2nd") || c.includes("2 री") || c === "2" || c.includes("दुसरी") || c.includes("second")) return "२ री";
  if (c.includes("3rd") || c.includes("3 री") || c === "3" || c.includes("तिसरी") || c.includes("third")) return "३ री";
  if (c.includes("4th") || c.includes("4 थी") || c === "4" || c.includes("चौथी") || c.includes("fourth")) return "४ थी";
  if (c.includes("5th") || c.includes("5 वी") || c === "5" || c.includes("पाचवी") || c.includes("fifth")) return "५ वी";
  if (c.includes("6th") || c.includes("6 वी") || c === "6" || c.includes("सहावी") || c.includes("sixth")) return "६ वी";
  if (c.includes("7th") || c.includes("7 वी") || c === "7" || c.includes("सातवी") || c.includes("seventh")) return "७ वी";
  if (c.includes("8th") || c.includes("8 वी") || c === "8" || c.includes("आठवी") || c.includes("eighth")) return "८ वी";
  return cls;
};

/**
 * Generates a clean, WhatsApp-compatible ASCII filename in the exact requested format:
 * "Class [X] Homework.pdf" (e.g. "Class 1st Homework.pdf")
 * This eliminates Unicode / Devanagari mojibake in WhatsApp and all OS file receivers.
 */
export const formatHomeworkFileName = (cls?: string): string => {
  let classLabel = "1st";
  if (cls) {
    const c = cls.trim().toLowerCase();
    if (c.includes("1st") || c.includes("1 ली") || c.includes("पहिली") || c.includes("first") || c === "1") {
      classLabel = "1st";
    } else if (c.includes("2nd") || c.includes("2 री") || c.includes("दुसरी") || c.includes("second") || c === "2") {
      classLabel = "2nd";
    } else if (c.includes("3rd") || c.includes("3 री") || c.includes("तिसरी") || c.includes("third") || c === "3") {
      classLabel = "3rd";
    } else if (c.includes("4th") || c.includes("4 थी") || c.includes("चौथी") || c.includes("fourth") || c === "4") {
      classLabel = "4th";
    } else if (c.includes("5th") || c.includes("5 वी") || c.includes("पाचवी") || c.includes("fifth") || c === "5") {
      classLabel = "5th";
    } else if (c.includes("6th") || c.includes("6 वी") || c.includes("सहावी") || c.includes("sixth") || c === "6") {
      classLabel = "6th";
    } else if (c.includes("7th") || c.includes("7 वी") || c.includes("सातवी") || c.includes("seventh") || c === "7") {
      classLabel = "7th";
    } else if (c.includes("8th") || c.includes("8 वी") || c.includes("आठवी") || c.includes("eighth") || c === "8") {
      classLabel = "8th";
    } else {
      const sanitized = cls.replace(/[^a-zA-Z0-9]/g, "");
      classLabel = sanitized || "1st";
    }
  }

  return `Class ${classLabel} Homework.pdf`;
};

export const HOMEWORK_WHATSAPP_LINK =
  "https://chat.whatsapp.com/IUcC4XskSSQF8dFpQWUMb4?s=cl&p=a&mlu=4&ilr=4";
export const HOMEWORK_WEBSITE_URL = "https://sgkbrainova.com";
export const HOMEWORK_WEBSITE_LABEL = "sgkbrainova.com";

/**
 * Adds clickable footer link badges for WhatsApp and Website on the LAST page of a homework PDF (ONE TIME ONLY).
 * Ensures the interactive link annotations (URI actions) are registered in the PDF dictionary
 * so that tapping or clicking on the buttons in any PDF reader directly opens the URLs.
 */
export const addHomeworkFooterLinksToPdf = (pdf: jsPDF | null): jsPDF | null => {
  if (!pdf) return pdf;

  try {
    const totalPages = pdf.getNumberOfPages();
    if (totalPages < 1) return pdf;

    const originalPage = pdf.getCurrentPageInfo()?.pageNumber || 1;

    // Apply ONLY on the very last page of the document (ONE TIME ONLY)
    pdf.setPage(totalPages);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const margin = 24;
    const gap = 12;
    const btnHeight = 18;
    const footerY = pageHeight - btnHeight - 8; // 8 pt padding from bottom edge
    const btnWidth = (pageWidth - margin * 2 - gap) / 2;

    // Draw clean solid white background strip behind the footer bar to avoid any overlapping
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, footerY - 5, pageWidth, pageHeight - (footerY - 5), "F");

    // Top divider line
    pdf.setDrawColor(226, 232, 240); // slate-200
    pdf.setLineWidth(0.6);
    pdf.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

    // 1. WhatsApp Button (Left)
    const waX = margin;
    const waY = footerY;
    pdf.setFillColor(37, 211, 102); // #25D366 (WhatsApp Green)
    pdf.setDrawColor(22, 163, 74); // #16a34a border
    pdf.setLineWidth(0.5);
    pdf.roundedRect(waX, waY, btnWidth, btnHeight, 3.5, 3.5, "FD");

    // WhatsApp text
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.text("WhatsApp Group: Click to Join", waX + btnWidth / 2, waY + 12, {
      align: "center",
    });

    // Interactive link annotation for WhatsApp
    pdf.link(waX, waY, btnWidth, btnHeight, {
      url: HOMEWORK_WHATSAPP_LINK,
    });

    // 2. Website Button (Right)
    const webX = margin + btnWidth + gap;
    const webY = footerY;
    pdf.setFillColor(30, 58, 138); // #1e3a8a (Navy/Blue)
    pdf.setDrawColor(29, 78, 216); // #1d4ed8 border
    pdf.setLineWidth(0.5);
    pdf.roundedRect(webX, webY, btnWidth, btnHeight, 3.5, 3.5, "FD");

    // Website text
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.text(`Website: ${HOMEWORK_WEBSITE_LABEL} (Click Here)`, webX + btnWidth / 2, webY + 12, {
      align: "center",
    });

    // Interactive link annotation for Website
    pdf.link(webX, webY, btnWidth, btnHeight, {
      url: HOMEWORK_WEBSITE_URL,
    });

    // Restore originally active page
    pdf.setPage(originalPage);
  } catch (err) {
    console.error("Error adding footer links to PDF:", err);
  }

  return pdf;
};

/**
 * Returns clean, attractive HTML for the clickable WhatsApp and Website footer bar
 * to be embedded in printable / previewable homework worksheets.
 */
export const getHomeworkFooterHtml = (): string => {
  return `
    <div data-header-field="hw-footer-links" style="margin-top: 14px; padding-top: 10px; border-top: 1.5px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: center; gap: 12px; font-family: 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box; width: 100%;">
      <a href="${HOMEWORK_WHATSAPP_LINK}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; background-color: #25D366; color: #ffffff !important; padding: 6px 12px; border-radius: 6px; font-size: 10pt; font-weight: 700; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
        <span>💬 WhatsApp ग्रुप जॉईन करा (Click Here)</span>
      </a>
      <a href="${HOMEWORK_WEBSITE_URL}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; background-color: #1e3a8a; color: #ffffff !important; padding: 6px 12px; border-radius: 6px; font-size: 10pt; font-weight: 700; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
        <span>🌐 ${HOMEWORK_WEBSITE_LABEL} (सराव व माहिती)</span>
      </a>
    </div>
  `.trim();
};

/**
 * Intelligently appends one or more A4 pages to a jsPDF instance from a rendered canvas.
 * - If the canvas fits on 1 A4 page (with 5% margin tolerance), adds 1 page.
 * - If the canvas is taller than 1 A4 page, slices it at clean blank whitespace rows
 *   between questions/paragraphs into multiple A4 pages so that NO text, images, or content is ever cut off!
 */
export const addCanvasPagesToPdf = (
  pdf: jsPDF | null,
  canvas: HTMLCanvasElement,
  isFirstElement: boolean = false
): jsPDF => {
  const imgWidth = 595.28; // Standard A4 width in pt
  const pageHeightPt = 841.89; // Standard A4 height in pt
  const pxPerPt = canvas.width / imgWidth;
  const pageHeightPx = Math.floor(pageHeightPt * pxPerPt);

  let activePdf = pdf;

  // Single page case: canvas fits comfortably within 1 A4 page
  if (canvas.height <= pageHeightPx * 1.05) {
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdfHeight = (canvas.height / canvas.width) * imgWidth;
    if (!activePdf) {
      activePdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
        compress: true,
      });
      activePdf.addImage(imgData, "JPEG", 0, 0, imgWidth, pdfHeight, undefined, "FAST");
    } else {
      activePdf.addPage([imgWidth, pageHeightPt], "portrait");
      activePdf.addImage(imgData, "JPEG", 0, 0, imgWidth, pdfHeight, undefined, "FAST");
    }
    return activePdf;
  }

  // Multi-page case: canvas is taller than 1 A4 page, slice cleanly across pages
  if (!activePdf) {
    activePdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
      compress: true,
    });
  }

  const ctx = canvas.getContext("2d");
  let currentY = 0;
  let isFirstSlice = isFirstElement;

  while (currentY < canvas.height) {
    let sliceHeight = Math.min(pageHeightPx, canvas.height - currentY);

    // If this slice doesn't reach the end of the canvas, find a clean whitespace row
    if (currentY + sliceHeight < canvas.height && ctx) {
      const maxSearch = Math.floor(pageHeightPx * 0.28);
      const startCheck = currentY + sliceHeight;
      let bestBreak = startCheck;
      let foundBreak = false;

      // Search upward for a clean whitespace row
      for (let testY = startCheck; testY > startCheck - maxSearch; testY -= 2) {
        const imgDataRow = ctx.getImageData(0, testY, canvas.width, 1).data;
        let isBlank = true;
        for (let px = 0; px < canvas.width; px += 8) {
          const idx = px * 4;
          if (imgDataRow[idx] < 240 || imgDataRow[idx + 1] < 240 || imgDataRow[idx + 2] < 240) {
            isBlank = false;
            break;
          }
        }
        if (isBlank) {
          bestBreak = testY;
          foundBreak = true;
          break;
        }
      }

      if (foundBreak && bestBreak > currentY + pageHeightPx * 0.60) {
        sliceHeight = bestBreak - currentY;
      }
    }

    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeight;

    const sliceCtx = sliceCanvas.getContext("2d");
    if (sliceCtx) {
      sliceCtx.fillStyle = "#ffffff";
      sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceHeight);
      sliceCtx.drawImage(
        canvas,
        0,
        currentY,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight
      );
    }

    const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.95);
    const sliceHeightPt = (sliceHeight / canvas.width) * imgWidth;

    if (isFirstSlice && currentY === 0) {
      activePdf.addImage(sliceData, "JPEG", 0, 0, imgWidth, sliceHeightPt, undefined, "FAST");
    } else {
      activePdf.addPage([imgWidth, pageHeightPt], "portrait");
      activePdf.addImage(sliceData, "JPEG", 0, 0, imgWidth, sliceHeightPt, undefined, "FAST");
    }

    isFirstSlice = false;
    currentY += sliceHeight;
  }

  return activePdf;
};



