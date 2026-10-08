import React, { useRef, useState } from "react";
import {
  Download,
  Share2,
  Award,
  Sparkles,
  Calendar,
  ExternalLink,
  Printer,
  Loader2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import logoImg from "@/assets/logo.jpeg";

export interface MCQCertificateProps {
  studentName: string;
  quizTitle: string;
  subject: string;
  classId: string;
  score: number;
  totalMarks: number;
  percentage: number;
  dateStr?: string;
  shareableUrl?: string;
}

export const MCQCertificate: React.FC<MCQCertificateProps> = ({
  studentName,
  quizTitle,
  subject,
  classId,
  score,
  totalMarks,
  percentage,
  dateStr,
  shareableUrl,
}) => {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const formattedDate = dateStr || new Date().toISOString().split("T")[0];

  const gradeText =
    percentage >= 90
      ? "A+ (उत्कृष्ट / Outstanding)"
      : percentage >= 75
      ? "A (फार छान / Distinction)"
      : percentage >= 60
      ? "B+ (छान / First Class)"
      : percentage >= 40
      ? "B (उत्तीर्ण / Pass)"
      : "सराव आवश्यक (Keep Practicing)";

  // One-click PNG image download of the certificate
  const handleDownloadImage = async () => {
    if (!certificateRef.current) return;
    setIsDownloading(true);
    try {
      // Small delay to ensure rendering
      await new Promise((r) => setTimeout(r, 100));

      const dataUrl = await toPng(certificateRef.current, {
        quality: 0.98,
        pixelRatio: 2.5,
        cacheBust: true,
        backgroundColor: "#fffdf9",
      });

      const safeName = (studentName || "Student")
        .replace(/[^a-zA-Z0-9\u0900-\u097F_-]/g, "_")
        .slice(0, 30);
      const link = document.createElement("a");
      link.download = `MCQ_Certificate_${safeName}_${subject}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("प्रमाणपत्र इमेज यशस्वीपणे डाउनलोड झाली! 🎉");
    } catch (err: any) {
      console.error("Certificate download error:", err);
      toast.error("प्रमाणपत्र डाउनलोड करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.");
    } finally {
      setIsDownloading(false);
    }
  };

  // WhatsApp share with attached certificate file & CDN image link
  const handleShareToTeacher = async () => {
    if (!certificateRef.current) return;
    setIsDownloading(true);

    const safeName = (studentName || "Student")
      .trim()
      .replace(/[^a-zA-Z0-9\u0900-\u097F_-]/g, "_")
      .slice(0, 30);
    const safeSub = (subject || "Subject")
      .trim()
      .replace(/[^a-zA-Z0-9\u0900-\u097F_-]/g, "_")
      .slice(0, 20);
    const fileName = `Certificate_${safeName}_${safeSub}.png`;

    try {
      // 1. Generate high-res Certificate PNG
      await new Promise((r) => setTimeout(r, 100));
      const dataUrl = await toPng(certificateRef.current, {
        quality: 0.98,
        pixelRatio: 2.5,
        cacheBust: true,
        backgroundColor: "#fffdf9",
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], fileName, { type: "image/png" });

      // 2. Upload to CDN / Storage so recipient can directly view the high-res image
      let certificateImageUrl = "";
      try {
        const { uploadFileWithProgress } = await import("@/lib/upload");
        const uploadRes = await uploadFileWithProgress(file, { folderPath: "certificates" });
        if (uploadRes?.url && !uploadRes.url.startsWith("data:")) {
          certificateImageUrl = uploadRes.url;
        }
      } catch (e) {
        console.warn("Certificate CDN upload skipped:", e);
      }

      // 3. Build comprehensive WhatsApp message
      const quizLink = shareableUrl || `${window.location.origin}/mcq`;
      let message = `🏆 *स्मार्ट लर्निंग MCQ स्वाध्याय निकाल व प्रमाणपत्र*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 *विद्यार्थी:* ${studentName || "विद्यार्थी"}\n` +
        `📚 *विषय:* ${subject} (इयत्ता: ${classId})\n` +
        `📝 *चाचणी:* ${quizTitle}\n` +
        `🎯 *मिळालेले गुण:* ${score} / ${totalMarks} (${percentage}%)\n` +
        `🏅 *श्रेणी/ग्रेड:* ${gradeText}\n` +
        `📅 *दिनांक:* ${formattedDate}\n` +
        `🌐 *अधिकृत संकेतस्थळ:* https://sgkbrainova.com\n`;

      if (certificateImageUrl) {
        message += `🖼️ *अधिकृत गुणवत्ता प्रमाणपत्र थेट पहा:*\n${certificateImageUrl}\n`;
      }

      message += `━━━━━━━━━━━━━━━━━━━━\n` +
        `👉 *शिक्षकांसाठी नोंद:* विद्यार्थ्याचे अधिकृत प्रमाणपत्र सोबत जोडले आहे. चाचणी सोडवण्यासाठी खालील लिंक उघडा:\n${quizLink}`;

      // 4. Try Web Share API with attached File
      if (
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            title: `माझे गुणवत्ता प्रमाणपत्र - ${quizTitle}`,
            text: message,
            files: [file],
          });
          toast.success("प्रमाणपत्र व निकाल यशस्वीपणे शेअर झाले! 🎉");
          return;
        } catch (shareErr: any) {
          if (shareErr.name === "AbortError") return;
          console.warn("Native file share fallback:", shareErr);
        }
      }

      // 5. Desktop / WhatsApp Web Fallback:
      // A) Copy image to clipboard so user can press Ctrl+V in WhatsApp
      if (typeof navigator !== "undefined" && navigator.clipboard?.write) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
        } catch {}
      }

      // B) Auto-download file
      const link = document.createElement("a");
      link.download = fileName;
      link.href = dataUrl;
      link.click();

      // C) Open WhatsApp
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank");

      toast.success("प्रमाणपत्र डाऊनलोड झाले व कॉपी झाले आहे! WhatsApp मध्ये Ctrl+V करून पाठवा. 📋");
    } catch (err: any) {
      console.error("Certificate share error:", err);
      handleDownloadImage();
      const basicUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
        `🏆 निकाल: ${studentName || "विद्यार्थी"} - ${score}/${totalMarks} (${percentage}%)\n👉 ${shareableUrl || window.location.href}`
      )}`;
      window.open(basicUrl, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  // Direct PDF Download of the certificate
  const handleDownloadPDF = async () => {
    if (!certificateRef.current) return;
    setIsDownloading(true);
    try {
      await new Promise((r) => setTimeout(r, 100));

      const dataUrl = await toPng(certificateRef.current, {
        quality: 0.98,
        pixelRatio: 2.5,
        cacheBust: true,
        backgroundColor: "#fffdf9",
      });

      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pdfWidth = 297;
      const pdfHeight = 210;
      const elementWidth = certificateRef.current.offsetWidth || 800;
      const elementHeight = certificateRef.current.offsetHeight || 550;
      const calculatedHeight = (pdfWidth * elementHeight) / elementWidth;

      const finalHeight = Math.min(calculatedHeight, pdfHeight);
      const yOffset = Math.max(0, (pdfHeight - finalHeight) / 2);

      pdf.addImage(dataUrl, "PNG", 0, yOffset, pdfWidth, finalHeight, undefined, "FAST");

      const safeName = (studentName || "Student")
        .replace(/[^a-zA-Z0-9\u0900-\u097F_-]/g, "_")
        .slice(0, 30);
      pdf.save(`MCQ_Certificate_${safeName}_${subject}.pdf`);

      toast.success("प्रमाणपत्र PDF थेट डाउनलोड झाली! 🏆");
    } catch (err: any) {
      console.error("Certificate PDF download error:", err);
      toast.error("प्रमाणपत्र PDF डाउनलोड करताना त्रुटी आली.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4 w-full">
      {/* Top Banner Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
            विद्यार्थी गुणवत्ता प्रमाणपत्र (Digital Certificate)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-70"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{isDownloading ? "तयार होत आहे..." : "प्रमाणपत्र इमेज डाऊनलोड (PNG)"}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer disabled:opacity-70"
            title="प्रमाणपत्र PDF डाउनलोड करा"
          >
            <Download className="w-4 h-4" />
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={handleShareToTeacher}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>शिक्षकांना WhatsApp वर पाठवा</span>
          </button>
        </div>
      </div>

      {/* CERTIFICATE CONTAINER (Designed for clean image export & on-screen beauty) */}
      <div className="overflow-x-auto pb-2">
        <div
          ref={certificateRef}
          id="mcq-student-certificate"
          style={{
            minWidth: "780px",
            background: "#fffdf9",
            color: "#0f172a",
          }}
          className="relative mx-auto rounded-3xl p-8 sm:p-10 shadow-2xl border-[6px] border-[#d97706] font-sans selection:bg-amber-100 overflow-hidden"
        >
          {/* Inner Ornate Gold Border */}
          <div
            style={{
              borderColor: "#b45309",
            }}
            className="absolute inset-3 border-2 border-dashed rounded-2xl pointer-events-none opacity-40"
          />

          {/* Corner Flourish Elements (SVG Ornaments) */}
          <svg
            className="absolute top-2 left-2 w-16 h-16 pointer-events-none text-amber-600 opacity-60"
            viewBox="0 0 100 100"
          >
            <path
              d="M 5,5 L 5,45 C 5,25 25,5 45,5 Z"
              fill="currentColor"
            />
            <circle cx="15" cy="15" r="4" fill="currentColor" />
          </svg>

          <svg
            className="absolute top-2 right-2 w-16 h-16 pointer-events-none text-amber-600 opacity-60"
            viewBox="0 0 100 100"
          >
            <path
              d="M 95,5 L 95,45 C 95,25 75,5 55,5 Z"
              fill="currentColor"
            />
            <circle cx="85" cy="15" r="4" fill="currentColor" />
          </svg>

          <svg
            className="absolute bottom-2 left-2 w-16 h-16 pointer-events-none text-amber-600 opacity-60"
            viewBox="0 0 100 100"
          >
            <path
              d="M 5,95 L 5,55 C 5,75 25,95 45,95 Z"
              fill="currentColor"
            />
            <circle cx="15" cy="85" r="4" fill="currentColor" />
          </svg>

          <svg
            className="absolute bottom-2 right-2 w-16 h-16 pointer-events-none text-amber-600 opacity-60"
            viewBox="0 0 100 100"
          >
            <path
              d="M 95,95 L 95,55 C 95,75 75,95 55,95 Z"
              fill="currentColor"
            />
            <circle cx="85" cy="85" r="4" fill="currentColor" />
          </svg>

          {/* Background Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035]">
            <span className="text-[120px] font-black tracking-widest text-slate-900 select-none">
              BRAINOVA
            </span>
          </div>

          {/* Certificate Content */}
          <div className="relative z-10 flex flex-col items-center text-center space-y-4">
            {/* Header: Logo + Organization + Official Link */}
            <div className="w-full flex items-center justify-between pb-3 border-b border-amber-200/80">
              {/* Organization Logo */}
              <div className="flex items-center gap-3">
                <img
                  src={logoImg}
                  alt="SGK Brainova"
                  className="w-12 h-12 rounded-xl object-cover shadow-sm border border-amber-300"
                  crossOrigin="anonymous"
                />
                <div className="text-left">
                  <span className="text-[11px] font-black tracking-widest uppercase text-amber-800 block">
                    SMART LEARNING WITH AI
                  </span>
                  <span className="text-base font-extrabold text-slate-900 block leading-tight">
                    SGK BRAINOVA DIGITAL ACADEMY
                  </span>
                </div>
              </div>

              {/* Official Website Badge */}
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  अधिकृत संकेतस्थळ (Official Portal)
                </span>
                <span className="text-xs sm:text-sm font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full shadow-xs">
                  🌐 sgkbrainova.com
                </span>
              </div>
            </div>

            {/* Certificate Header Banner */}
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white text-xs sm:text-sm font-black uppercase tracking-[0.25em] shadow-md">
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>गुणवत्ता प्रमाणपत्र • CERTIFICATE OF ACHIEVEMENT</span>
                <Sparkles className="w-4 h-4 text-amber-200" />
              </div>
            </div>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm text-slate-600 font-medium italic pt-1">
              हे प्रमाणपत्र अभिमानाने व सन्मानपूर्वक प्रमाणित करते की,
            </p>

            {/* Student Name */}
            <div className="w-full max-w-xl py-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-indigo-950 tracking-wide font-serif">
                {studentName || "विद्यार्थी"}
              </h1>
              <div className="h-1 w-48 mx-auto bg-gradient-to-r from-transparent via-amber-500 to-transparent rounded-full mt-2" />
            </div>

            {/* Body Description */}
            <p className="text-xs sm:text-sm text-slate-700 max-w-2xl leading-relaxed">
              यांनी <span className="font-bold text-slate-900">“{quizTitle}”</span> (विषय:{" "}
              <span className="font-bold text-indigo-900">{subject}</span>, इयत्ता:{" "}
              <span className="font-bold text-slate-900">{classId}</span>) हा दैनिक बहुपर्यायी
              (MCQ) स्वाध्याय यशस्वीरीत्या पूर्ण केला असून खालीलप्रमाणे उत्तम यश संपादन केले आहे:
            </p>

            {/* Score & Evaluation Plaque */}
            <div className="grid grid-cols-3 gap-4 w-full max-w-xl bg-amber-50/60 border border-amber-200/90 rounded-2xl p-3.5 my-2 shadow-xs">
              <div className="text-center border-r border-amber-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  मिळालेले गुण
                </span>
                <span className="text-xl sm:text-2xl font-black text-indigo-900">
                  {score} / {totalMarks}
                </span>
              </div>

              <div className="text-center border-r border-amber-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  टक्केवारी (Score)
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-700">
                  {percentage}%
                </span>
              </div>

              <div className="text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  श्रेणी (Grade)
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-amber-800 line-clamp-1 mt-1">
                  {gradeText}
                </span>
              </div>
            </div>

            {/* Footer Sign-off & Verification Seal */}
            <div className="w-full flex items-end justify-between pt-6 border-t border-amber-200/80 mt-2">
              {/* Date */}
              <div className="text-left space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span>दिनांक: {formattedDate}</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  तपासणी: संगणकीय अचूक मूल्यमापन
                </div>
              </div>


              {/* Authority Signature */}
              <div className="text-right space-y-1">
                <div className="font-serif italic font-bold text-sm text-indigo-950 border-b border-slate-300 pb-0.5">
                  SGK Brainova Academic Team
                </div>
                <div className="text-[11px] font-bold text-slate-700">
                  स्वाध्याय प्रमुख (Examiner)
                </div>
                <div className="text-[10px] font-medium text-indigo-600">
                  Smart Learning with AI
                </div>
              </div>
            </div>

            {/* Bottom URL Watermark */}
            <div className="pt-2 text-[10px] font-bold text-slate-400 tracking-wider">
              अधिकृत स्वाध्याय व निकाल पोर्टल:{" "}
              <span className="text-indigo-600 font-black">https://sgkbrainova.com</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
