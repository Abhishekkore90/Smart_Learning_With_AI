import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import type { HomeworkItem, DailyHomeworkVariables } from "@/types/documentEditor";
import {
  type HomeworkHeaderProfile,
  formatHomeworkDateToMarathi,
  getMarathiClassLabel,
  formatHomeworkFileName,
  isWordHomework,
} from "@/utils/homeworkDocHelper";

export interface DirectShareHomeworkPdfOptions {
  dateStr: string; // YYYY-MM-DD
  classId?: string; // e.g. "1st", "2nd"
  medium?: string; // "marathi" | "semi"
  homeworkItems?: HomeworkItem[];
  singleItem?: HomeworkItem | null;
  schoolProfile?: HomeworkHeaderProfile;
  variables?: DailyHomeworkVariables;
}

/**
 * Directly shares that day's homework as an A4 PDF file onto WhatsApp.
 * Does NOT send any links or text messages.
 * Uses Web Share API to attach the PDF file directly, with a desktop download & open WhatsApp fallback.
 */
export async function directShareHomeworkPdfToWhatsApp({
  dateStr,
  classId = "1st",
  medium = "marathi",
  homeworkItems = [],
  singleItem = null,
  schoolProfile,
  variables,
}: DirectShareHomeworkPdfOptions): Promise<void> {
  const items = singleItem ? [singleItem] : homeworkItems;
  const fileName = formatHomeworkFileName(classId);

  toast.info("गृहपाठ PDF WhatsApp साठी तयार होत आहे...");

  // If a single homework item already has a direct PDF URL, try fetching it first
  if (singleItem?.fileUrl && singleItem.fileUrl.toLowerCase().endsWith(".pdf")) {
    try {
      const response = await fetch(singleItem.fileUrl);
      if (response.ok) {
        const blob = await response.blob();
        const pdfFile = new File([blob], fileName, { type: "application/pdf" });

        if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
          try {
            await navigator.share({ files: [pdfFile] });
            toast.success("गृहपाठ PDF WhatsApp वर यशस्वीरीत्या पाठवली!");
            return;
          } catch (shareErr: any) {
            if (shareErr.name === "AbortError") return;
          }
        }

        // Desktop fallback: download and open WhatsApp Web
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);

        window.open("https://web.whatsapp.com", "_blank");
        toast.success("गृहपाठ PDF डाउनलोड झाली आणि WhatsApp उघडले! कृपया फाईल अटॅच करा.");
        return;
      }
    } catch {
      // Fallback to rendering the daywise worksheet PDF
    }
  }

  // Render printable A4 worksheet offscreen
  // Placed at (0, 0) with zIndex -99999 so Android WebView renders the layout inside the viewport
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "0px";
  container.style.top = "0px";
  container.style.width = "794px"; // Standard A4 width at 96 DPI
  container.style.backgroundColor = "#ffffff";
  container.style.zIndex = "-99999";
  container.style.pointerEvents = "none";
  container.style.overflow = "hidden";
  document.body.appendChild(container);

  try {
    const isWord = isWordHomework(singleItem);
    const docxUrl = isWord ? (singleItem?.wordFileUrl || singleItem?.fileUrl) : null;
    let hasWordPages = false;

    if (docxUrl) {
      try {
        const { fetchBinaryFile } = await import("@/lib/bunny-auth-pdf");
        const buf = await fetchBinaryFile(docxUrl);
        if (buf) {
          const { parseVmlDocxToHtml } = await import("@/services/vmlDocxParser");
          const wordHtml = await parseVmlDocxToHtml(buf);
          if (wordHtml && wordHtml.trim()) {
            container.innerHTML = `<div style="width: 794px; background: #ffffff;">${wordHtml}</div>`;
            hasWordPages = true;
          }
        }
      } catch (e) {
        console.warn("Failed to parse Word docx in directShare, falling back to summary sheet:", e);
      }
    }

    if (!hasWordPages) {
      const { dayOfWeek, dateStr: formattedMarathiDate } = formatHomeworkDateToMarathi(dateStr);
      const classLabelMr = getMarathiClassLabel(classId);
      const mediumLabelMr = medium === "semi" ? "सेमी-इंग्रजी माध्यम" : "मराठी माध्यम";
      const schoolName = schoolProfile?.schoolName || "जिल्हा परिषद प्राथमिक शाळा";
      const kendra = schoolProfile?.kendra || "";
      const taluka = schoolProfile?.taluka || "";
      const district = schoolProfile?.district || "";
      const teacherName = schoolProfile?.teacherName || "वर्गशिक्षक";

      // Build structured HTML for the A4 sheet
      let subjectsHtml = "";
      if (items.length > 0) {
        subjectsHtml = items
          .map(
            (item, idx) => `
          <div style="padding: 12px; margin-bottom: 12px; border: 1px solid #cbd5e1; border-radius: 12px; background-color: #f8fafc;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px;">
              <span style="font-weight: 900; font-size: 13px; color: #0f172a;">
                ${idx + 1}. विषय: ${item.subject || "सर्वसाधारण"} ${
              item.title && item.title !== item.subject ? `— ${item.title}` : ""
            }
              </span>
              <span style="font-size: 11px; font-weight: 700; color: #64748b;">${item.class || classLabelMr}</span>
            </div>
            ${
              item.description
                ? `<div style="font-size: 12px; color: #1e293b; font-weight: 500; white-space: pre-wrap; line-height: 1.6; padding-left: 10px;">${item.description}</div>`
                : ""
            }
          </div>
        `
          )
          .join("");
      } else if (variables) {
        const parts: string[] = [];
        if (variables.marathi) {
          parts.push(`
            <div style="padding: 12px; margin-bottom: 12px; border: 1px solid #cbd5e1; border-radius: 12px; background-color: #f8fafc;">
              <div style="font-weight: 900; font-size: 13px; color: #0f172a; margin-bottom: 6px;">१. विषय: मराठी ${
                variables.marathi.topic ? `— ${variables.marathi.topic}` : ""
              }</div>
              ${
                variables.marathi.instructions
                  ? `<div style="font-size: 11px; color: #475569; margin-bottom: 4px;">${variables.marathi.instructions}</div>`
                  : ""
              }
              ${(variables.marathi.questions || [])
                .map((q) => `<div style="font-size: 12px; color: #1e293b; padding-left: 12px;">• ${q}</div>`)
                .join("")}
            </div>
          `);
        }
        if (variables.maths) {
          parts.push(`
            <div style="padding: 12px; margin-bottom: 12px; border: 1px solid #cbd5e1; border-radius: 12px; background-color: #f8fafc;">
              <div style="font-weight: 900; font-size: 13px; color: #0f172a; margin-bottom: 6px;">२. विषय: गणित ${
                variables.maths.topic ? `— ${variables.maths.topic}` : ""
              }</div>
              ${
                variables.maths.instructions
                  ? `<div style="font-size: 11px; color: #475569; margin-bottom: 4px;">${variables.maths.instructions}</div>`
                  : ""
              }
              ${(variables.maths.questions || [])
                .map((q) => `<div style="font-size: 12px; color: #1e293b; padding-left: 12px;">• ${q}</div>`)
                .join("")}
            </div>
          `);
        }
        if (variables.english) {
          parts.push(`
            <div style="padding: 12px; margin-bottom: 12px; border: 1px solid #cbd5e1; border-radius: 12px; background-color: #f8fafc;">
              <div style="font-weight: 900; font-size: 13px; color: #0f172a; margin-bottom: 6px;">३. Subject: English ${
                variables.english.topic ? `— ${variables.english.topic}` : ""
              }</div>
              ${
                variables.english.instructions
                  ? `<div style="font-size: 11px; color: #475569; margin-bottom: 4px;">${variables.english.instructions}</div>`
                  : ""
              }
              ${(variables.english.questions || [])
                .map((q) => `<div style="font-size: 12px; color: #1e293b; padding-left: 12px;">• ${q}</div>`)
                .join("")}
            </div>
          `);
        }
        if (variables.activity) {
          parts.push(`
            <div style="padding: 12px; margin-bottom: 12px; border: 1px solid #fde68a; border-radius: 12px; background-color: #fffbeb;">
              <div style="font-weight: 900; font-size: 13px; color: #78350f; margin-bottom: 4px;">४. ${
                variables.activity.title || "दैनिक उपक्रम / खेळ"
              }</div>
              <div style="font-size: 12px; color: #1e293b;">${variables.activity.description}</div>
            </div>
          `);
        }
        subjectsHtml = parts.join("");
      } else {
        subjectsHtml = `
          <div style="padding: 14px; border: 1px solid #cbd5e1; border-radius: 12px; background-color: #f8fafc; font-size: 12px; line-height: 1.8;">
            <div>१. <strong>मराठी:</strong> पाठाचे प्रकट वाचन करा व कठीण शब्द वहीमध्ये ५ वेळा लिहा.</div>
            <div>२. <strong>गणित:</strong> १ ते १०० मधील सम व विषम संख्या लिहा आणि पाढे पाठ करा.</div>
            <div>३. <strong>English:</strong> Read and write 5 simple sentences in your notebook.</div>
            <div>४. <strong>उपक्रम:</strong> घरातील उपयुक्त वस्तूंची नावे लिहून आई-वडिलांना दाखवा.</div>
          </div>
        `;
      }

      container.innerHTML = `
        <div style="padding: 28px; font-family: 'Noto Sans Devanagari', -apple-system, sans-serif; color: #0f172a; background: #ffffff;">
          <div style="border: 2px solid #0f172a; border-radius: 16px; padding: 22px;">
            <!-- Header -->
            <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 12px;">
              <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #475569; margin-bottom: 4px;">
                महाराष्ट्र शासन मान्यताप्राप्त — दैनिक गृहपाठ कार्यपुस्तिका
              </div>
              <h1 style="font-size: 22px; font-weight: 900; margin: 4px 0; color: #020617;">
                ${schoolName}
              </h1>
              <div style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 10px;">
                ${kendra ? `केंद्र: ${kendra} • ` : ""}${taluka ? `तालुका: ${taluka} • ` : ""}${
        district ? `जिल्हा: ${district}` : ""
      }
              </div>

              <!-- Ribbon -->
              <div style="background-color: #0f172a; color: #ffffff; padding: 7px 16px; border-radius: 10px; display: flex; justify-content: space-between; font-size: 12px; font-weight: 800;">
                <div>📅 वार: ${dayOfWeek} • दिनांक: ${formattedMarathiDate}</div>
                <div>इयत्ता: ${classLabelMr} (${mediumLabelMr})</div>
              </div>
            </div>

            <!-- Metadata Strip -->
            <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; padding: 4px 0 10px 0; border-bottom: 1px solid #e2e8f0; margin-bottom: 12px;">
              <div>विद्यार्थ्याचे नाव: ____________________________________</div>
              <div>वर्गशिक्षक: <strong>${teacherName}</strong></div>
            </div>

            <!-- Subjects Content -->
            <div style="margin-bottom: 16px;">
              <div style="font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; background: #f1f5f9; padding: 6px 12px; border-radius: 8px; margin-bottom: 12px;">
                आजचा विषयनिहाय गृहपाठ (Today's Homework)
              </div>
              ${subjectsHtml}
            </div>

            <!-- Parent Note -->
            <div style="padding: 8px 14px; border-radius: 8px; background-color: #f1f5f9; border: 1px solid #cbd5e1; text-align: center; font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 24px;">
              💡 पालकांसाठी सूचना: सर्व पालकांनी आपल्या पाल्याचा आजचा गृहपाठ तपासून वहीमध्ये स्वाक्षरी करावी.
            </div>

            <!-- Signatures -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center; border-top: 2px solid #0f172a; padding-top: 32px; font-size: 11px; font-weight: 900; color: #0f172a;">
              <div>
                <div style="border-top: 1px dotted #475569; padding-top: 6px;">पालकांची स्वाक्षरी (Parent Sign)</div>
              </div>
              <div>
                <div style="border-top: 1px dotted #475569; padding-top: 6px;">वर्गशिक्षकाची स्वाक्षरी (Teacher Sign)</div>
              </div>
              <div>
                <div style="border-top: 1px dotted #475569; padding-top: 6px;">मुख्याध्यापकांची स्वाक्षरी व शिक्का</div>
              </div>
            </div>

            <!-- Footer -->
            <div style="margin-top: 18px; text-align: center; font-size: 9.5px; font-weight: 600; color: #94a3b8;">
              स्मार्ट लर्निंग विथ एआय — दैनिक गृहपाठ प्रणाली
            </div>
          </div>
        </div>
      `;
    }

    // Ensure all images are fully loaded and rendered
    const cloneImages = Array.from(container.querySelectorAll<HTMLImageElement>("img"));
    await Promise.all(
      cloneImages.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((res) => {
          img.onload = res;
          img.onerror = res;
        });
      })
    );
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const vmlPages = Array.from(container.querySelectorAll<HTMLElement>(".vml-page-wrapper"));
    let pdf: jsPDF;

    if (vmlPages.length > 0) {
      pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();

      for (let i = 0; i < vmlPages.length; i++) {
        const pg = vmlPages[i];
        const pageCanvas = await html2canvas(pg, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
          windowWidth: 794,
          width: 794,
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: 0,
        });
        const imgData = pageCanvas.toDataURL("image/jpeg", 0.95);
        const pageHeight = (pageCanvas.height * pdfWidth) / pageCanvas.width;
        if (i > 0) {
          pdf.addPage([pdfWidth, pageHeight], "portrait");
        }
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pageHeight, undefined, "FAST");
      }
    } else {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 794,
        width: 794,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
    }

    const blob = pdf.output("blob");
    const pdfFile = new File([blob], fileName, { type: "application/pdf" });

    // Directly share to WhatsApp
    if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          files: [pdfFile],
        });
        toast.success("गृहपाठ PDF WhatsApp वर यशस्वीरीत्या पाठवली!");
        return;
      } catch (shareErr: any) {
        if (shareErr.name === "AbortError") return;
      }
    }

    // Desktop fallback: Download PDF and open WhatsApp Web
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);

    window.open("https://web.whatsapp.com", "_blank");
    toast.success("गृहपाठ PDF डाउनलोड झाली आणि WhatsApp उघडले! कृपया फाईल अटॅच करा.");
  } catch (error: any) {
    console.error("Direct PDF WhatsApp share error:", error);
    toast.error("PDF तयार करताना त्रुटी आली: " + (error?.message || "कृपया पुन्हा प्रयत्न करा"));
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}
