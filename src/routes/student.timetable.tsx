import { createFileRoute } from "@tanstack/react-router";
import { StudentHeader } from "@/components/student/StudentHeader";
import { StudentSidebar } from "@/components/student/StudentSidebar";
import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import {
  Clock,
  Calendar as CalendarIcon,
  User,
  Sparkles,
  GraduationCap,
  Download,
  AlertCircle,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { showToast as toast } from "@/lib/custom-toast";

export const Route = createFileRoute("/student/timetable")({
  component: StudentTimetablePage,
});

const CLASSES = [
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
];

const CLASS_NAME_MAP: Record<string, { mr: string; en: string }> = {
  "1st": { mr: "पहिली", en: "1st Standard" },
  "2nd": { mr: "दुसरी", en: "2nd Standard" },
  "3rd": { mr: "तिसरी", en: "3rd Standard" },
  "4th": { mr: "चौथी", en: "4th Standard" },
  "5th": { mr: "पाचवी", en: "5th Standard" },
  "6th": { mr: "सहावी", en: "6th Standard" },
  "7th": { mr: "सातवी", en: "7th Standard" },
  "8th": { mr: "आठवी", en: "8th Standard" },
  "9th": { mr: "नववी", en: "9th Standard" },
  "10th": { mr: "दहावी", en: "10th Standard" },
};

const CLASS_SUBJECTS_MAP: Record<string, { label: string; key: string }[]> = {
  "1st": [
    { label: "भाषा", key: "marathi" },
    { label: "गणित", key: "maths" },
    { label: "इंग्रजी", key: "english" },
    { label: "कला", key: "art" },
    { label: "कार्यानुभव", key: "work" },
    { label: "शा.शिक्षण", key: "pe" },
  ],
  "2nd": [
    { label: "भाषा", key: "marathi" },
    { label: "गणित", key: "maths" },
    { label: "इंग्रजी", key: "english" },
    { label: "कला", key: "art" },
    { label: "कार्यानुभव", key: "work" },
    { label: "शा.शिक्षण", key: "pe" },
  ],
  "3rd": [
    { label: "भाषा", key: "marathi" },
    { label: "गणित", key: "maths" },
    { label: "इंग्रजी", key: "english" },
    { label: "प.अभ्यास", key: "evs" },
    { label: "कला", key: "art" },
    { label: "कार्यानुभव", key: "work" },
    { label: "शा.शिक्षण", key: "pe" },
  ],
  "4th": [
    { label: "भाषा", key: "marathi" },
    { label: "गणित", key: "maths" },
    { label: "इंग्रजी", key: "english" },
    { label: "प.अभ्यास", key: "evs" },
    { label: "कला", key: "art" },
    { label: "कार्यानुभव", key: "work" },
    { label: "शा.शिक्षण", key: "pe" },
  ],
  "5th": [
    { label: "मराठी", key: "marathi" },
    { label: "गणित", key: "maths" },
    { label: "इंग्रजी", key: "english" },
    { label: "हिंदी", key: "hindi" },
    { label: "प.अभ्यास", key: "evs" },
    { label: "कला", key: "art" },
    { label: "कार्यानुभव", key: "work" },
    { label: "शा.शिक्षण", key: "pe" },
  ],
  "6th": [
    { label: "मराठी", key: "marathi" },
    { label: "गणित", key: "maths" },
    { label: "इंग्रजी", key: "english" },
    { label: "हिंदी", key: "hindi" },
    { label: "विज्ञान", key: "science" },
    { label: "सा.शास्त्रे", key: "socialScience" },
    { label: "कला", key: "art" },
    { label: "कार्यानुभव", key: "work" },
    { label: "शा.शिक्षण", key: "pe" },
  ],
  "7th": [
    { label: "मराठी", key: "marathi" },
    { label: "गणित", key: "maths" },
    { label: "इंग्रजी", key: "english" },
    { label: "हिंदी", key: "hindi" },
    { label: "विज्ञान", key: "science" },
    { label: "सा.शास्त्रे", key: "socialScience" },
    { label: "कला", key: "art" },
    { label: "कार्यानुभव", key: "work" },
    { label: "शा.शिक्षण", key: "pe" },
  ],
  "8th": [
    { label: "मराठी", key: "marathi" },
    { label: "गणित", key: "maths" },
    { label: "इंग्रजी", key: "english" },
    { label: "हिंदी", key: "hindi" },
    { label: "विज्ञान", key: "science" },
    { label: "सा.शास्त्रे", key: "socialScience" },
    { label: "कला", key: "art" },
    { label: "कार्यानुभव", key: "work" },
    { label: "शा.शिक्षण", key: "pe" },
  ],
};

function StudentTimetablePage() {
  const [selectedClass, setSelectedClass] = useState("1st");
  const [gridData, setGridData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { lang } = useLanguage();

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;
      const parentWidth = containerRef.current.clientWidth || window.innerWidth;
      const targetWidth = 1000;
      const calculatedScale = parentWidth / targetWidth;
      setScale(calculatedScale < 1 ? calculatedScale : 1);

      const tableEl = document.getElementById("student-timetable-container");
      if (tableEl) {
        const h = Math.max(tableEl.scrollHeight, tableEl.offsetHeight);
        setContainerHeight(h);
      }
    };

    updateDimensions();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateDimensions();
      });
      resizeObserver.observe(containerRef.current);
      const tableEl = document.getElementById("student-timetable-container");
      if (tableEl) {
        resizeObserver.observe(tableEl);
      }
    }

    window.addEventListener("resize", updateDimensions);
    window.addEventListener("orientationchange", updateDimensions);
    if ((document as any).fonts && (document as any).fonts.ready) {
      (document as any).fonts.ready.then(updateDimensions);
    }

    const timer1 = setTimeout(updateDimensions, 150);
    const timer2 = setTimeout(updateDimensions, 600);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("resize", updateDimensions);
      window.removeEventListener("orientationchange", updateDimensions);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [gridData]);

  useEffect(() => {
    setLoading(true);
    setGridData(null);

    // Subscribe to class_timetables/${selectedClass}
    const docRef = doc(db, "class_timetables", selectedClass);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        setGridData(snapshot.data());
      } else {
        setGridData(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore loading error:", error);
      toast.error("Failed to load timetable");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedClass]);

  // Native Android & Mobile WebView download trigger
  const triggerDeviceDownload = (cdnUrl: string, filename: string, pdfBlob?: Blob) => {
    try {
      const win = window as any;
      if (typeof win.Android?.downloadFile === "function") {
        win.Android.downloadFile(cdnUrl, filename);
        return;
      }
      if (typeof win.AndroidBridge?.downloadFile === "function") {
        win.AndroidBridge.downloadFile(cdnUrl, filename);
        return;
      }
      if (typeof win.flutter_inappwebview?.callHandler === "function") {
        win.flutter_inappwebview.callHandler("downloadFile", cdnUrl, filename);
        return;
      }
      if (typeof win.webkit?.messageHandlers?.downloadFile?.postMessage === "function") {
        win.webkit.messageHandlers.downloadFile.postMessage({ url: cdnUrl, filename });
        return;
      }

      if (pdfBlob) {
        const blobUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (document.body.contains(link)) document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 3000);
        return;
      }

      if (cdnUrl) {
        const link = document.createElement("a");
        link.href = cdnUrl;
        link.download = filename;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (document.body.contains(link)) document.body.removeChild(link);
        }, 3000);
      }
    } catch (e) {
      console.error("Device download error:", e);
    }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById("student-timetable-container");
    if (!element) return;

    toast.success(lang === "mr" ? "PDF तयार होत आहे..." : "Generating PDF...");

    let tempWrapper: HTMLDivElement | null = null;
    try {
      const clone = element.cloneNode(true) as HTMLElement;
      clone.id = "student-timetable-pdf-clone";

      // 1. Clean off-screen staging container with fixed 1200px desktop width so mobile screens and WebViews render the exact full desktop layout
      const targetWidth = 1200;
      tempWrapper = document.createElement('div');
      tempWrapper.setAttribute('data-pdf-temp', 'true');
      tempWrapper.style.position = 'fixed';
      tempWrapper.style.top = '0px';
      tempWrapper.style.left = '0px';
      tempWrapper.style.width = `${targetWidth}px`;
      tempWrapper.style.minWidth = `${targetWidth}px`;
      tempWrapper.style.maxWidth = `${targetWidth}px`;
      tempWrapper.style.background = '#ffffff';
      tempWrapper.style.zIndex = '99999';
      tempWrapper.style.overflow = 'visible';
      tempWrapper.style.pointerEvents = 'none';
      tempWrapper.style.transform = 'none';
      tempWrapper.style.fontFamily = "'Noto Sans Devanagari', 'Inter', sans-serif";

      // 2. Clean, compact clone formatting, expanded horizontally to fill A4 landscape width
      clone.classList.remove('w-[1000px]', 'min-w-[1000px]', 'mx-auto');
      clone.style.zoom = '1';
      (clone.style as any).WebkitZoom = '1';
      clone.style.width = `${targetWidth}px`;
      clone.style.minWidth = `${targetWidth}px`;
      clone.style.maxWidth = `${targetWidth}px`;
      clone.style.margin = '0';
      clone.style.padding = '8px 12px 12px 12px';
      clone.style.boxSizing = 'border-box';
      clone.style.transform = 'none';
      clone.style.backgroundColor = '#ffffff';

      // Ensure school header and other non-table elements never truncate text in PDF
      clone.querySelectorAll('.truncate, [class*="overflow-hidden"], [class*="text-ellipsis"]').forEach((el: any) => {
        if (!el.closest('table')) {
          el.classList.remove('truncate', 'overflow-hidden', 'text-ellipsis');
          el.style.overflow = 'visible';
          el.style.textOverflow = 'clip';
          el.style.whiteSpace = 'nowrap';
        }
      });

      // Force explicit Flex layouts on clone sections so mobile viewports / CSS Grid never collapse:
      // Section 1: Header Banner (वेळापत्रक & सन)
      const headerBanner = clone.children[0] as HTMLElement;
      if (headerBanner) {
        headerBanner.style.display = 'flex';
        headerBanner.style.flexDirection = 'row';
        headerBanner.style.alignItems = 'center';
        headerBanner.style.justifyContent = 'space-between';
        headerBanner.style.width = '100%';
        headerBanner.style.boxSizing = 'border-box';
        headerBanner.style.background = 'linear-gradient(to right, #00d2ff, #0072ff)';
        headerBanner.style.borderRadius = '8px';
        headerBanner.style.border = '1px solid black';
        headerBanner.style.padding = '8px';

        const bChildren = Array.from(headerBanner.children) as HTMLElement[];
        if (bChildren.length >= 2) {
          bChildren[0].style.flex = '1';
          bChildren[0].style.display = 'flex';
          bChildren[0].style.justifyContent = 'center';
          bChildren[0].style.alignItems = 'center';
          bChildren[0].style.whiteSpace = 'nowrap';
          bChildren[0].style.margin = '0 16px';
          bChildren[1].style.flexShrink = '0';
          bChildren[1].style.whiteSpace = 'nowrap';
        }
      }

      // Section 2: School Details Bar (शाळेचे नाव, केंद्र, तालुका, जिल्हा)
      const schoolBar = clone.children[1] as HTMLElement;
      if (schoolBar) {
        schoolBar.classList.remove('grid', 'grid-cols-12');
        schoolBar.style.display = 'flex';
        schoolBar.style.flexDirection = 'row';
        schoolBar.style.width = '100%';
        schoolBar.style.boxSizing = 'border-box';
        schoolBar.style.border = '1px solid black';
        schoolBar.style.fontWeight = '900';

        const sChildren = Array.from(schoolBar.children) as HTMLElement[];
        if (sChildren.length >= 4) {
          // शाळेचे नाव: 50%
          sChildren[0].style.width = '50%';
          sChildren[0].style.flex = '0 0 50%';
          sChildren[0].style.boxSizing = 'border-box';
          sChildren[0].style.borderRight = '1px solid black';
          sChildren[0].style.display = 'flex';
          sChildren[0].style.alignItems = 'center';
          sChildren[0].style.whiteSpace = 'nowrap';

          // केंद्र: 16.666%
          sChildren[1].style.width = '16.666%';
          sChildren[1].style.flex = '0 0 16.666%';
          sChildren[1].style.boxSizing = 'border-box';
          sChildren[1].style.borderRight = '1px solid black';
          sChildren[1].style.display = 'flex';
          sChildren[1].style.alignItems = 'center';
          sChildren[1].style.backgroundColor = '#C6E0B4';
          sChildren[1].style.whiteSpace = 'nowrap';

          // तालुका: 16.666%
          sChildren[2].style.width = '16.666%';
          sChildren[2].style.flex = '0 0 16.666%';
          sChildren[2].style.boxSizing = 'border-box';
          sChildren[2].style.borderRight = '1px solid black';
          sChildren[2].style.display = 'flex';
          sChildren[2].style.alignItems = 'center';
          sChildren[2].style.backgroundColor = '#C6E0B4';
          sChildren[2].style.whiteSpace = 'nowrap';

          // जिल्हा: 16.668%
          sChildren[3].style.width = '16.668%';
          sChildren[3].style.flex = '0 0 16.668%';
          sChildren[3].style.boxSizing = 'border-box';
          sChildren[3].style.display = 'flex';
          sChildren[3].style.alignItems = 'center';
          sChildren[3].style.backgroundColor = '#F2DCDB';
          sChildren[3].style.whiteSpace = 'nowrap';
        }
      }

      // Section 3: Timetable Table
      const tableWrapper = clone.children[2] as HTMLElement;
      if (tableWrapper) {
        tableWrapper.style.width = '100%';
        const tbl = tableWrapper.querySelector('table');
        if (tbl) {
          tbl.style.width = '100%';
          tbl.style.borderCollapse = 'collapse';
          tbl.style.tableLayout = 'fixed';
        }
      }

      // Section 4: Bottom Bar (तासिका विभागणी & स्वाक्षरी बॉक्स)
      const bottomBar = clone.children[3] as HTMLElement;
      if (bottomBar) {
        bottomBar.classList.remove('grid', 'grid-cols-12');
        bottomBar.style.display = 'flex';
        bottomBar.style.flexDirection = 'row';
        bottomBar.style.alignItems = 'flex-end';
        bottomBar.style.justifyContent = 'space-between';
        bottomBar.style.width = '100%';
        bottomBar.style.boxSizing = 'border-box';
        bottomBar.style.borderTop = '1px solid black';
        bottomBar.style.paddingTop = '8px';

        const bChildren = Array.from(bottomBar.children) as HTMLElement[];
        if (bChildren.length >= 2) {
          // Left: तासिका विभागणी
          bChildren[0].style.width = '58%';
          bChildren[0].style.flex = '0 0 58%';
          bChildren[0].style.boxSizing = 'border-box';
          const subTbl = bChildren[0].querySelector('table');
          if (subTbl) {
            subTbl.style.width = '100%';
            subTbl.style.borderCollapse = 'collapse';
          }

          // Right: स्वाक्षरी Rounded Box
          bChildren[1].style.width = '40%';
          bChildren[1].style.flex = '0 0 40%';
          bChildren[1].style.boxSizing = 'border-box';
          bChildren[1].style.display = 'flex';
          bChildren[1].style.flexDirection = 'row';
          bChildren[1].style.justifyContent = 'space-between';
          bChildren[1].style.alignItems = 'center';
          bChildren[1].style.backgroundColor = '#FCE4D6';
          bChildren[1].style.border = '1px solid black';
          bChildren[1].style.borderRadius = '1.8rem';
          bChildren[1].style.padding = '8px 12px';
        }
      }

      tempWrapper.appendChild(clone);
      document.body.appendChild(tempWrapper);

      // Allow browser / WebView layout and fonts to settle
      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
        } catch (e) {}
      }
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 3. High-res capture using html2canvas-pro with explicit desktop windowWidth
      let html2canvas: any;
      try {
        const hModule = await import("html2canvas-pro");
        html2canvas = hModule.default || hModule;
      } catch (e) {
        const hModule = await import("html2canvas");
        html2canvas = hModule.default || hModule;
      }

      const cloneHeight = clone.offsetHeight || 800;
      const canvas = await html2canvas(clone, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: targetWidth,
        windowWidth: targetWidth,
        windowHeight: cloneHeight,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc: Document) => {
          try {
            const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
            styles.forEach((st) => {
              clonedDoc.head.appendChild(st.cloneNode(true));
            });
          } catch (e) {}
        }
      });

      // 4. Guaranteed 1-page A4 Landscape PDF using jsPDF
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pageWidth = 297;  // A4 landscape width in mm
      const pageHeight = 210; // A4 landscape height in mm

      // 5mm margins on all sides so timetable has maximum printable area
      const maxContentWidth = pageWidth - 10;   // 287mm
      const maxContentHeight = pageHeight - 10; // 200mm

      const canvasAspect = canvas.width / canvas.height;
      let imgWidth = maxContentWidth;
      let imgHeight = imgWidth / canvasAspect;

      if (imgHeight > maxContentHeight) {
        imgHeight = maxContentHeight;
        imgWidth = imgHeight * canvasAspect;
      }

      // Center perfectly on the single A4 Landscape page
      const xOffset = (pageWidth - imgWidth) / 2;
      const yOffset = (pageHeight - imgHeight) / 2;

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      pdf.addImage(imgData, "JPEG", xOffset, yOffset, imgWidth, imgHeight, undefined, "FAST");

      const downloadFilename = `${selectedClass}_Timetable.pdf`;
      const pdfBlob = pdf.output("blob");

      const win = window as any;
      const isWebViewBridge = typeof win.Android?.downloadFile === "function" ||
                              typeof win.AndroidBridge?.downloadFile === "function" ||
                              typeof win.flutter_inappwebview?.callHandler === "function" ||
                              typeof win.webkit?.messageHandlers?.downloadFile?.postMessage === "function";

      if (isWebViewBridge && pdfBlob) {
        triggerDeviceDownload("", downloadFilename, pdfBlob);
        toast.success(lang === "mr" ? "PDF यशस्वीरीत्या डाऊनलोड झाली!" : "PDF downloaded successfully!");
      } else {
        pdf.save(downloadFilename);
      }
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error(lang === "mr" ? "PDF तयार करण्यात त्रुटी आली" : "Failed to generate PDF");
    } finally {
      if (tempWrapper && tempWrapper.parentNode) {
        tempWrapper.parentNode.removeChild(tempWrapper);
      }
    }
  };

    const selectedClassNameMr = CLASS_NAME_MAP[selectedClass]?.mr || selectedClass;
  const selectedClassNameEn = CLASS_NAME_MAP[selectedClass]?.en || selectedClass;

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans flex flex-col">
      <StudentHeader />
      <div className="flex flex-1 mt-16">
        <StudentSidebar />
        <main className="flex-1 lg:pl-64 p-4 md:p-6 space-y-6">
          <header className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xl font-black text-slate-900 tracking-tight italic">
                {lang === "mr" ? "वेळापत्रक" : "Class Timetable"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <span>Academic Year 2025-26</span>
            </div>
          </header>

          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 md:p-8 shadow-sm space-y-6 w-full max-w-full overflow-hidden">
            {/* Class Selector tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-4">
                {lang === "mr" ? "इयत्ता निवडा:" : "Select Grade:"}
              </span>
              {CLASSES.map((cls) => (
                <button
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    selectedClass === cls
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 scale-105"
                      : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                  }`}
                >
                  {lang === "mr" ? `इयत्ता ${CLASS_NAME_MAP[cls]?.mr || cls}` : `Class ${cls}`}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="h-96 flex flex-col items-center justify-center text-slate-400 gap-4">
                <div className="size-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-xs font-black uppercase tracking-wider animate-pulse">
                  {lang === "mr" ? "वेळापत्रक लोड होत आहे..." : "Loading timetable..."}
                </p>
              </div>
            ) : gridData ? (
              <div className="space-y-6">
                {/* Download action button */}
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 text-center sm:text-left">
                    {lang === "mr" ? "वेळापत्रक खालील तक्त्यामध्ये उपलब्ध आहे." : "The official timetable is listed below."}
                  </span>
                  <button
                    onClick={handleDownloadPDF}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95"
                  >
                    <Download className="size-4" />
                    <span>{lang === "mr" ? "PDF डाउनलोड" : "Download PDF"}</span>
                  </button>
                </div>

                <div className="block lg:hidden text-center text-[11px] font-bold text-indigo-500 animate-pulse pb-1">
                  {lang === "mr" ? "← पूर्ण वेळापत्रक पाहण्यासाठी डावीकडे/उजवीकडे स्क्रोल करा →" : "← Scroll horizontally to view full timetable →"}
                </div>

                {/* Unified beautiful read-only ZP timetable grid */}
                <div
                  className="w-full max-w-full min-w-0 overflow-hidden pb-4"
                  ref={containerRef}
                  style={{
                    WebkitOverflowScrolling: 'touch',
                    ...(scale < 1
                      ? {
                          height: containerHeight ? `${containerHeight * scale + 16}px` : 'auto',
                          overflow: 'hidden'
                        }
                      : {})
                  }}
                >
                  <div 
                    id="student-timetable-container" 
                    className="p-3 sm:p-4 pt-4 sm:pt-6 bg-white text-slate-900 border border-black shadow-sm font-sans space-y-2.5 sm:space-y-3 w-[1000px] min-w-[1000px] mx-auto overflow-hidden"
                    style={
                      scale < 1
                        ? {
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left',
                            width: '1000px',
                            minWidth: '1000px',
                            fontFamily: "'Noto Sans Devanagari', 'Inter', sans-serif"
                          }
                        : {
                            width: '1000px',
                            minWidth: '1000px',
                            fontFamily: "'Noto Sans Devanagari', 'Inter', sans-serif"
                          }
                    }
                  >
                    {/* Header bar */}
                    <div 
                      className="flex items-center justify-between p-2 border border-black rounded-lg"
                      style={{
                        background: "linear-gradient(to right, #00d2ff, #0072ff)"
                      }}
                    >

                      <div className="flex-1 flex justify-center whitespace-nowrap overflow-visible mx-4">
                        <div className="px-6 py-1.5 text-center rounded-lg shadow-sm whitespace-nowrap flex items-center justify-center gap-1" style={{ background: 'linear-gradient(to bottom, #ffffff, #e6f7ff)', border: '1px solid black' }}>
                          <span className="text-[16px] font-black text-black tracking-wider whitespace-nowrap" style={{ fontWeight: 900 }}>
                            वेळापत्रक ( इयत्ता :- {gridData.classNameMr || selectedClassNameMr} )
                          </span>
                        </div>
                      </div>
                      <div className="px-4 py-1.5 text-center rounded-lg whitespace-nowrap flex-shrink-0" style={{ background: 'linear-gradient(to bottom, #ffffff, #e6f7ff)', border: '1px solid black' }}>
                        <span className="text-[13.5px] font-black text-black whitespace-nowrap" style={{ fontWeight: 900 }}>
                          सन {gridData.academicYear}
                        </span>
                      </div>
                    </div>

                    {/* ZP Info bar */}
                    <div className="border border-black text-[12.5px] font-black grid grid-cols-12 bg-white" style={{ fontWeight: 900 }}>
                      <div className="col-span-6 flex items-center gap-1 p-1.5 bg-white whitespace-nowrap overflow-visible" style={{ borderRight: '1px solid black' }}>
                        <span className="whitespace-nowrap flex-shrink-0 font-black text-black text-[12.5px]" style={{ fontWeight: 900 }}>शाळेचे नाव :</span>
                        <span className="font-black text-black px-1 whitespace-nowrap text-[13px]" style={{ fontWeight: 900 }}>{gridData.schoolName}</span>
                      </div>
                      <div className="col-span-2 flex items-center gap-1 p-1.5 whitespace-nowrap overflow-visible" style={{ backgroundColor: '#C6E0B4', borderRight: '1px solid black' }}>
                        <span className="whitespace-nowrap flex-shrink-0 font-black text-black text-[12px]" style={{ fontWeight: 900 }}>केंद्र :-</span>
                        <span className="font-black text-black px-1 whitespace-nowrap text-[12.5px]" style={{ fontWeight: 900 }}>{gridData.center}</span>
                      </div>
                      <div className="col-span-2 flex items-center gap-1 p-1.5 whitespace-nowrap overflow-visible" style={{ backgroundColor: '#C6E0B4', borderRight: '1px solid black' }}>
                        <span className="whitespace-nowrap flex-shrink-0 font-black text-black text-[12px]" style={{ fontWeight: 900 }}>तालुका :-</span>
                        <span className="font-black text-black px-1 whitespace-nowrap text-[12.5px]" style={{ fontWeight: 900 }}>{gridData.taluka}</span>
                      </div>
                      <div className="col-span-2 flex items-center gap-1 p-1.5 whitespace-nowrap overflow-visible" style={{ backgroundColor: '#F2DCDB' }}>
                        <span className="whitespace-nowrap flex-shrink-0 font-black text-black text-[12px]" style={{ fontWeight: 900 }}>जिल्हा :-</span>
                        <span className="font-black text-black px-1 whitespace-nowrap text-[12.5px]" style={{ fontWeight: 900 }}>{gridData.district}</span>
                      </div>
                    </div>

                    {/* Unified 12-column table grid */}
                    <div className="w-full">
                      <table className="w-full text-center" style={{ borderCollapse: 'collapse', border: '1px solid black' }}>
                        <thead>
                          <tr className="text-black font-black text-[12px] h-8">
                            <th style={{ backgroundColor: '#C6E0B4', border: '1px solid black', width: '4%', textAlign: 'center', fontWeight: 900 }} className="font-black text-black text-[12px]">तासिका</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '8%', textAlign: 'center', fontWeight: 900 }} className="font-black text-black text-[12px]">वेळ</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '9%', textAlign: 'center', fontWeight: 900 }} className="font-black text-black text-[12px]">सोमवार</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '9%', textAlign: 'center', fontWeight: 900 }} className="font-black text-black text-[12px]">मंगळवार</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '9%', textAlign: 'center', fontWeight: 900 }} className="font-black text-black text-[12px]">बुधवार</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '9%', textAlign: 'center', fontWeight: 900 }} className="font-black text-black text-[12px]">गुरुवार</th>
                            
                            <th style={{ backgroundColor: '#C6E0B4', border: '1px solid black', width: '4%', textAlign: 'center', fontWeight: 900 }} className="font-black text-black text-[12px]">तासिका</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '8%', textAlign: 'center', fontWeight: 900 }} className="font-black text-black text-[12px]">वेळ</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '10%', textAlign: 'center', fontWeight: 900 }} className="font-black text-black text-[12px]">शुक्रवार</th>
                            
                            <th style={{ backgroundColor: '#C6E0B4', border: '1px solid black', width: '4%', textAlign: 'center', fontWeight: 900 }} className="font-black text-black text-[12px]">तासिका</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '8%', textAlign: 'center', fontWeight: 900 }} className="font-black text-black text-[12px]">वेळ</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '10%', textAlign: 'center', fontWeight: 900 }} className="font-black text-black text-[12px]">शनिवार</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gridData.rows && gridData.rows.map((row: any, idx: number) => {
                            const isRecessValue = (val: string) => {
                              if (!val) return false;
                              const clean = val.trim();
                              return clean === "लहान सुट्टी" || clean === "मोठी सुट्टी" || clean === "सफाई" || clean === "परिपाठ";
                            };
                            
                            const getRecessStyle = (val: string) => {
                              if (val.includes("परिपाठ")) return { backgroundColor: '#F2DCDB' };
                              return { backgroundColor: '#C6E0B4' };
                            };

                            const hasMonThu = row.monThuPeriod && row.monThuPeriod.trim() !== "";
                            const monThuPeriodBg = hasMonThu ? "#C6E0B4" : "white";
                            const monThuTimeBg = row.monThuTime && row.monThuTime.trim() !== "" ? "#F2DCDB" : "white";
                            
                            const getMonThuRecessValue = (r: any) => {
                              if (isRecessValue(r.monday)) return r.monday;
                              if (isRecessValue(r.tuesday)) return r.tuesday;
                              if (isRecessValue(r.wednesday)) return r.wednesday;
                              if (isRecessValue(r.thursday)) return r.thursday;
                              return null;
                            };
                            const monThuRecessVal = getMonThuRecessValue(row);
                            const isMonThuRecess = monThuRecessVal !== null;

                            const hasFri = row.friPeriod && row.friPeriod.trim() !== "";
                            const friPeriodBg = hasFri ? "#C6E0B4" : "white";
                            const friTimeBg = row.friTime && row.friTime.trim() !== "" ? "#F2DCDB" : "white";
                            const isFriRecess = isRecessValue(row.friday);

                            const hasSat = row.satPeriod && row.satPeriod.trim() !== "";
                            const satPeriodBg = hasSat ? "#C6E0B4" : "white";
                            const satTimeBg = row.satTime && row.satTime.trim() !== "" ? "#F2DCDB" : "white";
                            const isSatRecess = isRecessValue(row.saturday);

                            return (
                              <tr key={idx} className="text-[12px] h-7 font-black text-black" style={{ fontWeight: 900 }}>
                                <td className="font-black py-0.5 text-[11px] text-black" style={{ backgroundColor: monThuPeriodBg, border: '1px solid black', width: '4%', fontWeight: 900 }}>{row.monThuPeriod}</td>
                                <td className="py-0.5 font-black text-[11.5px] whitespace-nowrap" style={{ backgroundColor: monThuTimeBg, border: '1px solid black', width: '8%', color: '#C00000', fontWeight: 900 }}>{row.monThuTime}</td>
                                {isMonThuRecess ? (
                                  <td className="font-black text-center py-0.5 text-[12.5px] text-black" style={{ ...getRecessStyle(monThuRecessVal || ""), border: '1px solid black', fontWeight: 900 }} colSpan={4}>{monThuRecessVal}</td>
                                ) : (
                                  <>
                                    <td className="py-0.5 bg-white font-black text-black text-[12.5px]" style={{ border: '1px solid black', width: '9%', fontWeight: 900 }}>{row.monday}</td>
                                    <td className="py-0.5 bg-white font-black text-black text-[12.5px]" style={{ border: '1px solid black', width: '9%', fontWeight: 900 }}>{row.tuesday}</td>
                                    <td className="py-0.5 bg-white font-black text-black text-[12.5px]" style={{ border: '1px solid black', width: '9%', fontWeight: 900 }}>{row.wednesday}</td>
                                    <td className="py-0.5 bg-white font-black text-black text-[12.5px]" style={{ border: '1px solid black', width: '9%', fontWeight: 900 }}>{row.thursday}</td>
                                  </>
                                )}
                                <td className="font-black py-0.5 text-[11px] text-black" style={{ backgroundColor: friPeriodBg, border: '1px solid black', width: '4%', fontWeight: 900 }}>{row.friPeriod}</td>
                                <td className="py-0.5 font-black text-[11.5px] whitespace-nowrap" style={{ backgroundColor: friTimeBg, border: '1px solid black', width: '8%', color: '#C00000', fontWeight: 900 }}>{row.friTime}</td>
                                <td className="py-0.5 font-black text-black text-[12.5px]" style={{ ...(isFriRecess ? getRecessStyle(row.friday) : { backgroundColor: 'white' }), border: '1px solid black', width: '10%', fontWeight: 900 }}>{row.friday}</td>
                                <td className="font-black py-0.5 text-[11px] text-black" style={{ backgroundColor: satPeriodBg, border: '1px solid black', width: '4%', fontWeight: 900 }}>{row.satPeriod}</td>
                                <td className="py-0.5 font-black text-[11.5px] whitespace-nowrap" style={{ backgroundColor: satTimeBg, border: '1px solid black', width: '8%', color: '#C00000', fontWeight: 900 }}>{row.satTime}</td>
                                {idx === 14 ? (
                                  <td className="py-0.5" style={{ backgroundColor: '#FF0000', border: '1px solid black', width: '10%' }}></td>
                                ) : (
                                  <td className="py-0.5 font-black text-black text-[12.5px]" style={{ ...(isSatRecess ? getRecessStyle(row.saturday) : { backgroundColor: 'white' }), border: '1px solid black', width: '10%', fontWeight: 900 }}>{row.saturday}</td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Bottom section subject distribution counts & signatures */}
                    <div className="grid grid-cols-12 gap-4 items-end pt-2 border-t border-black">
                      <div className="col-span-7 space-y-1.5 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-black text-black tracking-widest" style={{ fontWeight: 900 }}>तासिका विभागणी :</span>
                          <svg viewBox="0 0 100 40" className="w-12 h-5 select-none inline-block align-middle">
                            <path d="M 5,12 L 60,12 L 60,4 L 95,20 L 60,36 L 60,28 L 5,28 Z" fill="#2E75B6" stroke="black" strokeWidth="1.5" />
                          </svg>
                        </div>
                        <table className="text-[11.5px] text-center w-full" style={{ borderCollapse: 'collapse', border: '1px solid black' }}>
                          <thead>
                            <tr className="font-black text-black" style={{ fontWeight: 900 }}>
                              {(CLASS_SUBJECTS_MAP[selectedClass] || CLASS_SUBJECTS_MAP["8th"]).map((subj) => (
                                <th key={subj.key} style={{ backgroundColor: 'white', border: '1px solid black', padding: '2px 6px', textAlign: 'center', fontWeight: 900 }} className="font-black text-black text-[11.5px]">{subj.label}</th>
                              ))}
                              <th style={{ backgroundColor: 'white', border: '1px solid black', padding: '2px 6px', textAlign: 'center', fontWeight: 900 }} className="font-black text-black text-[11.5px]">एकूण</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ backgroundColor: '#FFFF00', fontWeight: 900 }} className="font-black text-black">
                              {(CLASS_SUBJECTS_MAP[selectedClass] || CLASS_SUBJECTS_MAP["8th"]).map((subj) => (
                                <td key={subj.key} style={{ backgroundColor: '#FFFF00', border: '1px solid black', padding: '2px', fontWeight: 900, fontSize: '12px' }} className="font-black text-black">
                                  {gridData.subjectDistribution?.[subj.key] || "0"}
                                </td>
                              ))}
                              <td style={{ backgroundColor: '#FFFF00', border: '1px solid black', padding: '2px', fontSize: '12px', fontWeight: 900 }} className="font-black text-black">
                                {gridData.subjectDistribution?.total || "48"}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="col-span-5 p-3 flex justify-between items-center h-16 rounded-lg" style={{ backgroundColor: '#FCE4D6', border: '1px solid black' }}>
                        <div className="text-center flex-1 flex flex-col justify-between h-full">
                          <span className="font-black text-black text-[12px]" style={{ fontWeight: 900 }}>{gridData.teacherName}</span>
                          <div style={{ fontWeight: 900 }} className="border-t border-dashed border-black mt-1 pt-1 text-[10.5px] font-black text-black text-center uppercase tracking-wider">वर्गशिक्षक</div>
                        </div>
                        <div className="h-full w-px bg-black/20 mx-4" />
                        <div className="text-center flex-1 flex flex-col justify-between h-full">
                          <span className="font-black text-black text-[12px]" style={{ fontWeight: 900 }}>{gridData.headmasterName}</span>
                          <div style={{ fontWeight: 900 }} className="border-t border-dashed border-black mt-1 pt-1 text-[10.5px] font-black text-black text-center uppercase tracking-wider">मुख्याध्यापक</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center border-2 border-dashed border-slate-200 rounded-[2rem] space-y-4 max-w-xl mx-auto my-6 bg-slate-50/50">
                <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                  <AlertCircle className="size-8" />
                </div>
                <div className="space-y-2 px-4">
                  <h4 className="text-slate-800 font-extrabold text-lg">
                    {lang === "mr" ? "वेळापत्रक अद्याप उपलब्ध नाही" : "Timetable has not been updated yet."}
                  </h4>
                  <p className="text-slate-500 text-xs font-bold leading-relaxed">
                    {lang === "mr" ? "कृपया वर्गशिक्षक किंवा प्रशासकाद्वारे जतन होण्याची वाट पहा." : "Please wait for the class teacher or administrator to save the timetable details."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
