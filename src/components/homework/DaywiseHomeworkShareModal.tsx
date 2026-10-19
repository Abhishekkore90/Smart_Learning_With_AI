import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Share2,
  Copy,
  Check,
  MessageCircle,
  FileText,
  Download,
  Building2,
  Calendar,
  GraduationCap,
  User,
  Sparkles,
  ExternalLink,
  Save,
  Loader2,
  Link as LinkIcon,
  Printer,
  Eye,
  CheckCircle2,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import type { HomeworkItem, DailyHomeworkVariables } from "@/types/documentEditor";
import {
  type HomeworkHeaderProfile,
  getHomeworkHeaderProfile,
  saveHomeworkHeaderProfile,
  formatHomeworkDateToMarathi,
  getMarathiClassLabel,
  formatHomeworkFileName,
} from "@/utils/homeworkDocHelper";

export interface DaywiseHomeworkShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string; // YYYY-MM-DD
  classId?: string; // e.g. "1st", "2nd", "3rd"
  medium?: string; // "marathi" | "semi"
  homeworkItems?: HomeworkItem[];
  singleItem?: HomeworkItem | null;
  initialProfile?: HomeworkHeaderProfile;
  userId?: string;
  variables?: DailyHomeworkVariables;
}

export const DaywiseHomeworkShareModal: React.FC<DaywiseHomeworkShareModalProps> = ({
  isOpen,
  onClose,
  dateStr,
  classId = "1st",
  medium = "marathi",
  homeworkItems = [],
  singleItem = null,
  initialProfile,
  userId = "guest",
  variables,
}) => {
  const [activeTab, setActiveTab] = useState<"share" | "pdf_preview" | "settings">("share");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Profile data (School, Kendra, Taluka, District, Teacher, Headmaster)
  const [schoolProfile, setSchoolProfile] = useState<HomeworkHeaderProfile>(() => {
    return initialProfile || getHomeworkHeaderProfile(userId);
  });

  // Class WhatsApp Group link or phone number
  const [classWaLink, setClassWaLink] = useState<string>("");
  const [isWaLinkSaved, setIsWaLinkSaved] = useState(false);

  // Custom teacher notes to append to WhatsApp message
  const [customNote, setCustomNote] = useState<string>("");

  // Hidden Printable Worksheet Ref for high-res PDF generation
  const printSheetRef = useRef<HTMLDivElement>(null);

  // Sync profile when opened or userId changes
  useEffect(() => {
    if (isOpen) {
      const prof = initialProfile || getHomeworkHeaderProfile(userId);
      setSchoolProfile(prof);

      // Load saved class WhatsApp group link/number from localStorage
      const savedLink = localStorage.getItem(`hw_class_wa_link_${classId}`) || "";
      setClassWaLink(savedLink);
      setCopiedText(false);
      setCopiedLink(false);
      setActiveTab("share");
    }
  }, [isOpen, userId, classId, initialProfile]);

  // Format date to Marathi
  const { dayOfWeek, dateStr: formattedMarathiDate } = useMemo(() => {
    return formatHomeworkDateToMarathi(dateStr);
  }, [dateStr]);

  // Clean class label (e.g. "१ ली")
  const classLabelMr = useMemo(() => {
    return getMarathiClassLabel(classId);
  }, [classId]);

  const mediumLabelMr = medium === "semi" ? "सेमी-इंग्रजी माध्यम" : "मराठी माध्यम";

  // Items to share: if singleItem passed, use that; otherwise use homeworkItems
  const itemsToShare = useMemo(() => {
    if (singleItem) return [singleItem];
    return homeworkItems || [];
  }, [singleItem, homeworkItems]);

  // Save class WhatsApp group link
  const handleSaveClassWaLink = () => {
    const clean = classWaLink.trim();
    localStorage.setItem(`hw_class_wa_link_${classId}`, clean);
    setIsWaLinkSaved(true);
    toast.success(`इयत्ता ${classLabelMr} साठी WhatsApp ग्रुप लिंक सेव्ह झाली! ✓`);
    setTimeout(() => setIsWaLinkSaved(false), 2500);
  };

  // Construct structured Marathi WhatsApp message
  const whatsappMessageText = useMemo(() => {
    const school = schoolProfile.schoolName || "जिल्हा परिषद प्राथमिक शाळा";
    const kendra = schoolProfile.kendra;
    const taluka = schoolProfile.taluka;
    const district = schoolProfile.district;
    const teacher = schoolProfile.teacherName;

    let text = `📚 *दैनिक गृहपाठ (Daily Homework)* 📚\n`;
    text += `🏫 *शाळा:* ${school}\n`;
    if (kendra || taluka || district) {
      const locParts = [
        kendra ? `केंद्र: ${kendra}` : "",
        taluka ? `ता.: ${taluka}` : "",
        district ? `जि.: ${district}` : "",
      ].filter(Boolean);
      text += `📍 *${locParts.join(" | ")}*\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📅 *वार व दिनांक:* ${dayOfWeek}, ${formattedMarathiDate}\n`;
    text += `🎒 *इयत्ता:* ${classLabelMr} (${mediumLabelMr})\n`;
    if (teacher) {
      text += `👨‍🏫 *वर्गशिक्षक:* ${teacher}\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `📝 *आजचा विषयनिहाय गृहपाठ (Today's Homework):*\n\n`;

    if (itemsToShare.length > 0) {
      itemsToShare.forEach((item, index) => {
        text += `🔹 *${index + 1}) विषय: ${item.subject || "सर्वसाधारण"}*\n`;
        if (item.title && item.title !== item.subject) {
          text += `📌 *घटक / शीर्षक:* ${item.title}\n`;
        }
        if (item.description) {
          text += `✍️ *स्वाध्याय / अभ्यास:*\n${item.description.trim()}\n`;
        }
        if (item.fileUrl) {
          text += `📎 *फाईल लिंक:* ${item.fileUrl}\n`;
        }
        text += `\n`;
      });
    } else if (variables) {
      if (variables.marathi) {
        text += `🔹 *१) विषय: मराठी*\n`;
        if (variables.marathi.topic) text += `📌 घटक: ${variables.marathi.topic}\n`;
        if (variables.marathi.instructions) text += `✍️ ${variables.marathi.instructions}\n`;
        if (variables.marathi.questions?.length) {
          variables.marathi.questions.forEach((q) => {
            text += `   • ${q}\n`;
          });
        }
        text += `\n`;
      }
      if (variables.maths) {
        text += `🔹 *२) विषय: गणित*\n`;
        if (variables.maths.topic) text += `📌 घटक: ${variables.maths.topic}\n`;
        if (variables.maths.instructions) text += `✍️ ${variables.maths.instructions}\n`;
        if (variables.maths.questions?.length) {
          variables.maths.questions.forEach((q) => {
            text += `   • ${q}\n`;
          });
        }
        text += `\n`;
      }
      if (variables.english) {
        text += `🔹 *३) विषय: इंग्रजी (English)*\n`;
        if (variables.english.topic) text += `📌 Topic: ${variables.english.topic}\n`;
        if (variables.english.instructions) text += `✍️ ${variables.english.instructions}\n`;
        if (variables.english.questions?.length) {
          variables.english.questions.forEach((q) => {
            text += `   • ${q}\n`;
          });
        }
        text += `\n`;
      }
      if (variables.activity) {
        text += `🔹 *४) ${variables.activity.title || "दैनिक उपक्रम"}*\n`;
        text += `✨ ${variables.activity.description}\n\n`;
      }
    } else {
      text += `🔹 *१) मराठी:* पाठाचे वाचन करून कठीण शब्द वहीत ५ वेळा लिहा.\n`;
      text += `🔹 *२) गणित:* १ ते १०० मधील सम व विषम संख्या लिहा आणि पाढे पाठ करा.\n`;
      text += `🔹 *३) इंग्रजी:* Read and write 5 simple sentences from English textbook.\n`;
      text += `🔹 *४) उपक्रम:* घरातील उपलब्ध वस्तू मोजून त्यांची यादी करा.\n\n`;
    }

    if (customNote.trim()) {
      text += `📢 *शिक्षकांची विशेष सूचना:*\n${customNote.trim()}\n\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🙏 *पालकांना नम्र विनंती:* कृपया आपल्या पाल्याकडून आजचा अभ्यास वेळेत पूर्ण करून घेऊन वहीत स्वाक्षरी करावी.\n`;
    text += `🌐 *स्मार्ट लर्निंग डिजिटल गृहपाठ प्रणाली*`;

    return text;
  }, [
    schoolProfile,
    dayOfWeek,
    formattedMarathiDate,
    classLabelMr,
    mediumLabelMr,
    itemsToShare,
    variables,
    customNote,
  ]);

  // Generate crisp A4 PDF Blob
  const generateHomeworkPdfBlob = async (): Promise<{ blob: Blob; fileName: string }> => {
    if (!printSheetRef.current) {
      throw new Error("Printable sheet element not found");
    }

    const element = printSheetRef.current;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
    const blob = pdf.output("blob");
    const fileName = formatHomeworkFileName(classId);

    return { blob, fileName };
  };

  // 1. WhatsApp Text Message Share Handler
  const handleShareTextMessage = () => {
    const encoded = encodeURIComponent(whatsappMessageText);
    let waUrl = `https://api.whatsapp.com/send?text=${encoded}`;

    // If teacher provided a specific phone number or group link
    if (classWaLink.trim()) {
      const link = classWaLink.trim();
      if (link.startsWith("http://") || link.startsWith("https://")) {
        // It's a group link; copy message and open group link
        navigator.clipboard.writeText(whatsappMessageText).catch(() => {});
        window.open(link, "_blank");
        toast.success("वर्ग ग्रुप उघडला जात आहे! गृहपाठ मेसेज क्लिपबोर्डवर कॉपी झाला आहे (Ctrl+V / Paste करा).");
        return;
      } else {
        // Assume phone number
        const cleanPhone = link.replace(/[^0-9]/g, "");
        if (cleanPhone.length >= 10) {
          waUrl = `https://wa.me/${cleanPhone}?text=${encoded}`;
        }
      }
    }

    window.open(waUrl, "_blank");
    toast.success("WhatsApp उघडले जात आहे!");
  };

  // 2. Share Homework as PDF to WhatsApp Handler (MAIN REQUIREMENT)
  const handleSharePdfToWhatsApp = async () => {
    setIsSharingPdf(true);
    toast.info("गृहपाठ PDF तयार केली जात आहे...");

    try {
      const { blob, fileName } = await generateHomeworkPdfBlob();
      const pdfFile = new File([blob], fileName, { type: "application/pdf" });

      let sharedSuccessfully = false;

      // Check if Web Share API Level 2 (files sharing) is supported by browser/device
      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
          await navigator.share({
            files: [pdfFile],
          });
          toast.success("गृहपाठ PDF WhatsApp वर यशस्वीरीत्या शेअर केली! ✓");
          sharedSuccessfully = true;
          setIsSharingPdf(false);
          return;
        } catch (shareErr: any) {
          if (shareErr.name === "AbortError") {
            // User cancelled the share dialog
            setIsSharingPdf(false);
            return;
          }
          console.warn("Native file share rejected/failed, using fallback:", shareErr);
        }
      }

      // Fallback for Desktop Browsers (Chrome / Edge / Firefox on Windows/Mac where Web Share doesn't support file attachment directly)
      if (!sharedSuccessfully) {
        // Step 1: Download the PDF file directly to user's device
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);

        // Step 2: Open WhatsApp Web / WhatsApp app to attach the downloaded PDF
        let targetWaUrl = "https://web.whatsapp.com";

        if (classWaLink.trim()) {
          const l = classWaLink.trim();
          if (l.startsWith("http://") || l.startsWith("https://")) {
            targetWaUrl = l;
          } else {
            const cleanPhone = l.replace(/[^0-9]/g, "");
            if (cleanPhone.length >= 10) {
              targetWaUrl = `https://wa.me/${cleanPhone}`;
            }
          }
        }

        setTimeout(() => {
          window.open(targetWaUrl, "_blank");
        }, 800);

        toast.success(
          "✅ गृहपाठ PDF डाउनलोड झाली आहे! आता WhatsApp मधील वर्ग ग्रुपमध्ये फाईल अटॅच (📎 Document) करून पाठवा.",
          { duration: 5000 }
        );
      }
    } catch (err: any) {
      console.error("PDF share error:", err);
      toast.error("PDF तयार करताना त्रुटी आली: " + (err?.message || "कृपया पुन्हा प्रयत्न करा"));
    } finally {
      setIsSharingPdf(false);
    }
  };

  // 3. Direct PDF Download Handler
  const handleDownloadPdfOnly = async () => {
    setIsGeneratingPdf(true);
    toast.info("गृहपाठ PDF डाऊनलोड होत आहे...");
    try {
      const { blob, fileName } = await generateHomeworkPdfBlob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
      toast.success("गृहपाठ PDF यशस्वीरित्या डाऊनलोड झाली!");
    } catch (err: any) {
      toast.error("PDF डाऊनलोड करताना त्रुटी: " + err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 4. Copy Message Handler
  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(whatsappMessageText);
      setCopiedText(true);
      toast.success("संपूर्ण गृहपाठ मेसेज क्लिपबोर्डवर कॉपी झाला!");
      setTimeout(() => setCopiedText(false), 2500);
    } catch {
      toast.error("मजकूर कॉपी करता आला नाही.");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[94vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-green-700 p-4 sm:p-5 text-white flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner shrink-0">
                <MessageCircle className="size-6 text-emerald-100" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black tracking-tight leading-snug">
                    दैनिक गृहपाठ WhatsApp वर पाठवा
                  </h3>
                  <span className="bg-white/25 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full backdrop-blur-xs">
                    {classLabelMr} • {mediumLabelMr}
                  </span>
                </div>
                <p className="text-xs text-emerald-100 font-medium mt-0.5">
                  {dayOfWeek}, {formattedMarathiDate} — मजकूर व PDF स्वरूपात वर्ग WhatsApp वर शेअर करा
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all cursor-pointer shrink-0"
              title="बंद करा"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 border-b border-slate-200 shrink-0 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab("share")}
              className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "share"
                  ? "bg-white text-emerald-800 shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <MessageCircle className="size-3.5 text-emerald-600" />
              <span>WhatsApp शेअरिंग पर्याय</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("pdf_preview")}
              className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "pdf_preview"
                  ? "bg-white text-emerald-800 shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="size-3.5 text-teal-600" />
              <span>PDF कार्यपुस्तिका प्रिव्ह्यू</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "settings"
                  ? "bg-white text-emerald-800 shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="वर्ग WhatsApp ग्रुप लिंक व शाळा माहिती"
            >
              <LinkIcon className="size-3.5 text-indigo-600" />
              <span className="hidden sm:inline">ग्रुप लिंक</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
            {/* TAB 1: MAIN SHARING PANEL */}
            {activeTab === "share" && (
              <div className="space-y-4">
                {/* Highlight Banner with Class and Date Info */}
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-3.5 rounded-2xl border border-emerald-200 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                      {classLabelMr}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>इयत्ता {classLabelMr} ({mediumLabelMr})</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-black">{dayOfWeek}, {formattedMarathiDate}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {schoolProfile.schoolName || "शाळेचे नाव सेट केलेले नाही"}
                        {schoolProfile.teacherName ? ` • शिक्षक: ${schoolProfile.teacherName}` : ""}
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {itemsToShare.length > 0 ? `${itemsToShare.length} विषय समाविष्ट` : "दैनिक स्वाध्याय"}
                  </span>
                </div>

                {/* Primary Dual WhatsApp Share Cards (THE STAR OF THE MODAL) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Card 1: Share Homework as PDF to WhatsApp */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg space-y-2.5 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 size-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/20 text-[10px] font-black uppercase tracking-wider mb-1">
                        <Sparkles className="size-3 text-amber-300" />
                        <span>शिफारस केलेले (Recommended)</span>
                      </div>
                      <h4 className="text-sm sm:text-base font-black flex items-center gap-1.5">
                        <FileText className="size-4.5 text-amber-300" />
                        <span>PDF फाईल WhatsApp वर पाठवा</span>
                      </h4>
                      <p className="text-[11.5px] text-emerald-100 leading-relaxed mt-1">
                        आजच्या संपूर्ण गृहपाठाची अधिकृत स्कूल कार्यपुस्तिका A4 PDF तयार करून थेट WhatsApp वर शेअर करा.
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleSharePdfToWhatsApp}
                        disabled={isSharingPdf}
                        className="w-full py-2.5 px-3 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        {isSharingPdf ? (
                          <Loader2 className="size-4 animate-spin text-emerald-700" />
                        ) : (
                          <Share2 className="size-4 text-emerald-700" />
                        )}
                        <span>{isSharingPdf ? "PDF तयार होत आहे..." : "PDF WhatsApp वर पाठवा"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Card 2: Share Formatted Text Message to WhatsApp */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-lg space-y-2.5 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 size-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/20 text-[10px] font-black uppercase tracking-wider mb-1">
                        <MessageCircle className="size-3 text-emerald-300" />
                        <span>थेट मजकूर मेसेज</span>
                      </div>
                      <h4 className="text-sm sm:text-base font-black flex items-center gap-1.5">
                        <MessageCircle className="size-4.5 text-emerald-300" />
                        <span>मजकूर मेसेज WhatsApp वर पाठवा</span>
                      </h4>
                      <p className="text-[11.5px] text-slate-300 leading-relaxed mt-1">
                        विषयनिहाय अभ्यास, सूचना व पालकांसाठी संदेश असलेला सुटसुटीत मेसेज WhatsApp वर पाठवा.
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleShareTextMessage}
                        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                      >
                        <MessageCircle className="size-4 text-slate-950" />
                        <span>मेसेज WhatsApp वर पाठवा</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Additional Quick Utility Actions (Download PDF & Copy Text) */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleDownloadPdfOnly}
                    disabled={isGeneratingPdf}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-slate-200 active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {isGeneratingPdf ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Download className="size-3.5 text-teal-600" />
                    )}
                    <span>केवळ PDF डाउनलोड करा</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-slate-200 active:scale-95 cursor-pointer"
                  >
                    {copiedText ? (
                      <Check className="size-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="size-3.5 text-indigo-600" />
                    )}
                    <span>{copiedText ? "मेसेज कॉपी झाला ✓" : "मेसेज कॉपी करा"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("pdf_preview")}
                    className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-slate-200 active:scale-95 cursor-pointer"
                  >
                    <Eye className="size-3.5 text-amber-600" />
                    <span>प्रिव्ह्यू पहा</span>
                  </button>
                </div>

                {/* Custom Note Input */}
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-amber-600" />
                      <span>शिक्षकांची विशेष सूचना (Optional Extra Note for Parents)</span>
                    </span>
                    <span className="text-[10px] text-slate-400">मेसेजमध्ये शेवटी जोडली जाईल</span>
                  </label>
                  <input
                    type="text"
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="उदा. उद्या शाळेची वेळ सकाळी ८:०० वाजता राहील किंवा वह्या तपासायला आणाव्यात."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                  />
                </div>

                {/* WhatsApp Message Preview Box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1">
                      <MessageCircle className="size-3 text-emerald-600" />
                      <span>WhatsApp मेसेज प्रिव्ह्यू (Message Preview)</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyMessage}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer flex items-center gap-1"
                    >
                      {copiedText ? "कॉपी झाले ✓" : "कॉपी करा"}
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 text-emerald-300 rounded-xl text-[11px] font-mono leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto border border-slate-800 custom-scrollbar select-text">
                    {whatsappMessageText}
                  </pre>
                </div>
              </div>
            )}

            {/* TAB 2: PDF PREVIEW */}
            {activeTab === "pdf_preview" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs text-slate-600 font-semibold">
                    * हीच कार्यपुस्तिका A4 PDF म्हणून तयार होऊन WhatsApp वर पाठवली जाईल
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSharePdfToWhatsApp}
                      disabled={isSharingPdf}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <Share2 className="size-3.5" />
                      <span>WhatsApp वर पाठवा</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadPdfOnly}
                      disabled={isGeneratingPdf}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <Download className="size-3.5" />
                      <span>डाउनलोड करा</span>
                    </button>
                  </div>
                </div>

                {/* Visible Preview of the Sheet */}
                <div className="border border-slate-300 rounded-2xl p-4 bg-slate-100 max-h-[60vh] overflow-y-auto flex justify-center">
                  <div className="w-[620px] bg-white p-6 shadow-md rounded-xl text-slate-900 scale-[0.85] origin-top border border-slate-200">
                    <WorksheetDocumentContent
                      schoolProfile={schoolProfile}
                      dayOfWeek={dayOfWeek}
                      formattedMarathiDate={formattedMarathiDate}
                      classLabelMr={classLabelMr}
                      mediumLabelMr={mediumLabelMr}
                      itemsToShare={itemsToShare}
                      variables={variables}
                      customNote={customNote}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SETTINGS (CLASS WHATSAPP GROUP LINK) */}
            {activeTab === "settings" && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-slate-800 font-black text-xs sm:text-sm">
                    <LinkIcon className="size-4 text-emerald-600" />
                    <span>इयत्ता {classLabelMr} WhatsApp ग्रुप लिंक किंवा नंबर सेट करा</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    येथे आपल्या वर्गाच्या अधिकृत पालक-शिक्षक WhatsApp ग्रुपची इनव्हाईट लिंक (उदा. <code>https://chat.whatsapp.com/...</code>) किंवा वर्गशिक्षकाचा मोबाईल नंबर सेव्ह करा. एकदा सेव्ह केल्यावर गृहपाठ थेट या ग्रुपमध्ये पाठवला जाईल.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      ग्रुप लिंक किंवा मोबाईल नंबर:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={classWaLink}
                        onChange={(e) => setClassWaLink(e.target.value)}
                        placeholder="https://chat.whatsapp.com/XYZ... किंवा 98XXXXXXXX"
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleSaveClassWaLink}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm"
                      >
                        {isWaLinkSaved ? <Check className="size-3.5" /> : <Save className="size-3.5" />}
                        <span>{isWaLinkSaved ? "सेव्ह झाले ✓" : "सेव्ह करा"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* School Profile summary */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-amber-600" />
                      <span>शाळा व शिक्षक माहिती (दैनिक गृहपाठ शीर्षकासाठी):</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div>
                      <span className="font-semibold text-slate-400">शाळा: </span>
                      <span className="font-bold text-slate-800">{schoolProfile.schoolName || "—"}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400">वर्गशिक्षक: </span>
                      <span className="font-bold text-slate-800">{schoolProfile.teacherName || "—"}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400">केंद्र: </span>
                      <span>{schoolProfile.kendra || "—"}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400">तालुका व जिल्हा: </span>
                      <span>{schoolProfile.taluka || "—"}, {schoolProfile.district || "—"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
            <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
              इयत्ता {classLabelMr} • {dayOfWeek}, {formattedMarathiDate}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
              >
                बंद करा
              </button>
              <button
                type="button"
                onClick={handleSharePdfToWhatsApp}
                disabled={isSharingPdf}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-black text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isSharingPdf ? (
                  <Loader2 className="size-3.5 animate-spin text-white" />
                ) : (
                  <Share2 className="size-3.5 text-white" />
                )}
                <span>PDF WhatsApp वर पाठवा</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Hidden Offscreen Container for html2canvas to render crisp A4 printable sheet */}
      <div
        style={{
          position: "fixed",
          left: "-9999px",
          top: "0",
          width: "794px", // Standard A4 width at 96 DPI
          backgroundColor: "#ffffff",
          zIndex: -100,
        }}
      >
        <div ref={printSheetRef} className="w-[794px] bg-white p-8 text-slate-900 font-sans">
          <WorksheetDocumentContent
            schoolProfile={schoolProfile}
            dayOfWeek={dayOfWeek}
            formattedMarathiDate={formattedMarathiDate}
            classLabelMr={classLabelMr}
            mediumLabelMr={mediumLabelMr}
            itemsToShare={itemsToShare}
            variables={variables}
            customNote={customNote}
          />
        </div>
      </div>
    </AnimatePresence>
  );
};

// Clean, authentic Maharashtra school layout for the A4 Homework PDF
interface WorksheetDocumentContentProps {
  schoolProfile: HomeworkHeaderProfile;
  dayOfWeek: string;
  formattedMarathiDate: string;
  classLabelMr: string;
  mediumLabelMr: string;
  itemsToShare: HomeworkItem[];
  variables?: DailyHomeworkVariables;
  customNote?: string;
}

const WorksheetDocumentContent: React.FC<WorksheetDocumentContentProps> = ({
  schoolProfile,
  dayOfWeek,
  formattedMarathiDate,
  classLabelMr,
  mediumLabelMr,
  itemsToShare,
  variables,
  customNote,
}) => {
  return (
    <div className="space-y-4 border-2 border-slate-800 p-5 rounded-2xl bg-white text-slate-900">
      {/* 1. Header Box */}
      <div className="text-center pb-3 border-b-2 border-slate-800 space-y-1">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-600">
          महाराष्ट्र शासन मान्यताप्राप्त — दैनिक गृहपाठ कार्यपुस्तिका
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-tight">
          {schoolProfile.schoolName || "जिल्हा परिषद प्राथमिक शाळा"}
        </h1>
        <div className="text-xs font-bold text-slate-700 flex items-center justify-center gap-2 flex-wrap">
          {schoolProfile.kendra && <span>केंद्र: {schoolProfile.kendra}</span>}
          {schoolProfile.taluka && <span>• तालुका: {schoolProfile.taluka}</span>}
          {schoolProfile.district && <span>• जिल्हा: {schoolProfile.district}</span>}
        </div>

        {/* Highlighted Ribbon */}
        <div className="mt-2 py-1.5 px-4 rounded-xl bg-slate-900 text-white flex items-center justify-between text-xs font-bold flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span>📅 वार: {dayOfWeek}</span>
            <span>•</span>
            <span>दिनांक: {formattedMarathiDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded font-black text-[11px]">
              इयत्ता {classLabelMr}
            </span>
            <span>({mediumLabelMr})</span>
          </div>
        </div>
      </div>

      {/* 2. Student & Teacher Metadata Strip */}
      <div className="grid grid-cols-2 gap-2 text-xs font-semibold py-1 border-b border-slate-200">
        <div>
          <span className="text-slate-500">विद्यार्थ्याचे नाव: </span>
          <span className="border-b border-dotted border-slate-600 inline-block w-48"></span>
        </div>
        <div className="text-right">
          <span className="text-slate-500">वर्गशिक्षक: </span>
          <span className="font-bold text-slate-800">
            {schoolProfile.teacherName || "वर्गशिक्षक"}
          </span>
        </div>
      </div>

      {/* 3. Homework Subjects & Exercises */}
      <div className="space-y-3.5 pt-1">
        <div className="text-xs font-black uppercase tracking-wider text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center justify-between">
          <span>दैनिक विषयनिहाय स्वाध्याय व गृहपाठ (Daily Subject Tasks)</span>
          <span className="text-[10px] text-slate-500 font-bold">तारीखनिहाय कार्य</span>
        </div>

        {itemsToShare.length > 0 ? (
          itemsToShare.map((item, idx) => (
            <div
              key={item.id || idx}
              className="p-3 rounded-xl border border-slate-300 bg-slate-50/60 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1">
                <span className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                  <span className="size-4.5 rounded bg-slate-900 text-white text-[10px] flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <span>विषय: {item.subject || "सर्वसाधारण"}</span>
                  {item.title && item.title !== item.subject && (
                    <span className="text-slate-600 font-semibold">— {item.title}</span>
                  )}
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  {item.class || classLabelMr}
                </span>
              </div>
              {item.description && (
                <div className="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed pl-6">
                  {item.description}
                </div>
              )}
            </div>
          ))
        ) : variables ? (
          <>
            {variables.marathi && (
              <div className="p-3 rounded-xl border border-slate-300 bg-slate-50/60 space-y-1">
                <div className="font-black text-xs text-slate-900">
                  १. विषय: मराठी {variables.marathi.topic ? `— ${variables.marathi.topic}` : ""}
                </div>
                {variables.marathi.instructions && (
                  <p className="text-[11px] text-slate-700 font-medium">
                    {variables.marathi.instructions}
                  </p>
                )}
                {variables.marathi.questions?.map((q, i) => (
                  <div key={i} className="text-xs text-slate-800 font-medium pl-3">
                    • {q}
                  </div>
                ))}
              </div>
            )}

            {variables.maths && (
              <div className="p-3 rounded-xl border border-slate-300 bg-slate-50/60 space-y-1">
                <div className="font-black text-xs text-slate-900">
                  २. विषय: गणित {variables.maths.topic ? `— ${variables.maths.topic}` : ""}
                </div>
                {variables.maths.instructions && (
                  <p className="text-[11px] text-slate-700 font-medium">
                    {variables.maths.instructions}
                  </p>
                )}
                {variables.maths.questions?.map((q, i) => (
                  <div key={i} className="text-xs text-slate-800 font-medium pl-3">
                    • {q}
                  </div>
                ))}
              </div>
            )}

            {variables.english && (
              <div className="p-3 rounded-xl border border-slate-300 bg-slate-50/60 space-y-1">
                <div className="font-black text-xs text-slate-900">
                  ३. Subject: English {variables.english.topic ? `— ${variables.english.topic}` : ""}
                </div>
                {variables.english.instructions && (
                  <p className="text-[11px] text-slate-700 font-medium">
                    {variables.english.instructions}
                  </p>
                )}
                {variables.english.questions?.map((q, i) => (
                  <div key={i} className="text-xs text-slate-800 font-medium pl-3">
                    • {q}
                  </div>
                ))}
              </div>
            )}

            {variables.activity && (
              <div className="p-3 rounded-xl border border-slate-300 bg-amber-50/50 space-y-1">
                <div className="font-black text-xs text-amber-950">
                  ४. {variables.activity.title || "दैनिक उपक्रम / खेळ"}
                </div>
                <p className="text-xs text-slate-800 font-medium">
                  {variables.activity.description}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="p-4 rounded-xl border border-slate-300 bg-slate-50 space-y-2 text-xs font-medium">
            <div>१. <strong>मराठी:</strong> पाठ क्रमांक वाचन करून कठीण शब्द वहीत ५ वेळा लिहावेत.</div>
            <div>२. <strong>गणित:</strong> १ ते १०० मधील सम व विषम संख्या लिहा आणि २ ते १० पर्यंत पाढे म्हणा.</div>
            <div>३. <strong>English:</strong> Read and write 5 action words in your four-line notebook.</div>
            <div>४. <strong>उपक्रम:</strong> परिसरातील ५ पानांचे किंवा फुलांचे निरीक्षण करून नावे लिहा.</div>
          </div>
        )}

        {customNote && (
          <div className="p-2.5 rounded-xl border border-amber-300 bg-amber-50 text-xs font-semibold text-amber-950">
            📢 <strong>विशेष सूचना:</strong> {customNote}
          </div>
        )}
      </div>

      {/* 4. Parent Note Banner */}
      <div className="p-2 rounded-lg bg-slate-100 border border-slate-300 text-center text-[10.5px] font-bold text-slate-700">
        💡 पालकांसाठी सूचना: सर्व पालकांनी आपल्या पाल्याचा आजचा गृहपाठ तपासून वहीमध्ये स्वाक्षरी करावी.
      </div>

      {/* 5. Three Signatures Block */}
      <div className="pt-6 grid grid-cols-3 gap-4 text-center border-t-2 border-slate-800">
        <div className="space-y-8">
          <div className="h-6"></div>
          <div className="border-t border-dotted border-slate-700 pt-1 text-[11px] font-black text-slate-800">
            पालकांची स्वाक्षरी (Parent Sign)
          </div>
        </div>

        <div className="space-y-8">
          <div className="h-6"></div>
          <div className="border-t border-dotted border-slate-700 pt-1 text-[11px] font-black text-slate-800">
            वर्गशिक्षकाची स्वाक्षरी (Teacher Sign)
          </div>
        </div>

        <div className="space-y-8">
          <div className="h-6"></div>
          <div className="border-t border-dotted border-slate-700 pt-1 text-[11px] font-black text-slate-800">
            मुख्याध्यापकांची स्वाक्षरी व शिक्का
          </div>
        </div>
      </div>

      {/* 6. Footer Note */}
      <div className="pt-2 text-center text-[9px] font-semibold text-slate-400">
        स्मार्ट लर्निंग विथ एआय — दैनिक गृहपाठ प्रणाली • डिजिटल शाळा महाराष्ट्र
      </div>
    </div>
  );
};
