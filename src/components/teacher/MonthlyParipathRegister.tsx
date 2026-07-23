import React, { useState, useEffect, useRef } from "react";
import {
  Printer,
  Download,
  Sparkles,
  Save,
  RotateCcw,
  Calendar,
  BookOpen,
  FileSpreadsheet,
  Check,
  Building2,
  Clock,
  CheckCircle2,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { showToast as toast } from "@/lib/custom-toast";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// ---------- Types ----------
interface DayRowData {
  date: number;
  day: string;
  isSunday: boolean;
  rashtrageet: string;
  pratigya: string;
  sanvidhan: string;
  prarthana: string;
  shlok: string;
  suvichar: string;
  batmya: string;
  dinvishesh: string;
  mhan: string;
  bodhkatha: string;
  samuhgeet: string;
  deshbhaktigeet: string;
  maun: string;
  swakshari: string;
}

// ---------- Constants ----------
const MARATHI_DAYS = [
  "रविवार",
  "सोमवार",
  "मंगळवार",
  "बुधवार",
  "गुरुवार",
  "शुक्रवार",
  "शनिवार",
];

const MARATHI_MONTHS = [
  "जानेवारी",
  "फेब्रुवारी",
  "मार्च",
  "एप्रिल",
  "मे",
  "जून",
  "जुलै",
  "ऑगस्ट",
  "सप्टेंबर",
  "ऑक्टोबर",
  "नोव्हेंबर",
  "डिसेंबर",
];

// Helper: extract the first line or a short version of a text
function shortText(text: string | undefined, maxLen = 40): string {
  if (!text) return "";
  const firstLine = text.split("\n")[0].trim();
  if (firstLine.length <= maxLen) return firstLine;
  return firstLine.substring(0, maxLen) + "...";
}

// Helper: get prayer title from content
function getPrayerShortName(prayerContent: string | undefined): string {
  if (!prayerContent) return "प्रार्थना";
  const content = prayerContent.trim();
  // Detect common prayers by first few words
  if (content.includes("हीच अमुची प्रार्थना")) return "हीच अमुची प्रार्थना";
  if (content.includes("इतनी शक्ति हमें")) return "इतनी शक्ति हमें देना";
  if (content.includes("दया कर दान विद्या")) return "दया कर दान विद्या का";
  if (content.includes("ऐ मालिक तेरे बंदे")) return "ऐ मालिक तेरे बंदे हम";
  if (content.includes("हम को मन की शक्ति")) return "हम को मन की शक्ति देना";
  if (content.includes("तू प्यार का सागर")) return "तू प्यार का सागर है";
  if (content.includes("ॐ सह नाववतु")) return "ॐ सह नाववतु";
  if (content.includes("असतो मा सद्गमय")) return "असतो मा सद्गमय";
  if (content.includes("वक्रतुंड महाकाय")) return "वक्रतुंड महाकाय";
  if (content.includes("गणपती बाप्पा")) return "गणपती बाप्पा मोरया";
  if (content.includes("शुभं करोति")) return "शुभं करोति कल्याणम्";
  // Fallback: first 30 chars
  const firstLine = content.split("\n")[0].trim();
  return firstLine.length > 30 ? firstLine.substring(0, 30) + "..." : firstLine;
}

// Helper: detect language of content
function detectLanguage(content: string | undefined): string {
  if (!content) return "मराठी";
  // Check for Hindi specific patterns
  if (content.includes("हम,") || content.includes("हम भारत के लोग") || content.includes("भारत मेरा देश है")) return "हिंदी";
  // Check for English
  if (/^[A-Za-z\s,.'"\-!?]+$/.test(content.substring(0, 50))) return "इंग्रजी";
  // Check for Marathi specific patterns
  if (content.includes("भारत माझा देश") || content.includes("माझ्या")) return "मराठी";
  // Default
  return "मराठी";
}

// ---------- Main Component ----------
export function MonthlyParipathRegister() {
  const printRef = useRef<HTMLDivElement>(null);
  const now = new Date();

  const [schoolName, setSchoolName] = useState("जि. प. प्राथमिक शाळा");
  const [academicYear, setAcademicYear] = useState("२०२५-२०२६");
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [tableData, setTableData] = useState<Record<number, DayRowData>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Firebase collection for daily paripath archive
  const getDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  // Fetch daily paripath data from Firebase for the selected month
  const fetchMonthlyData = async () => {
    setIsFetching(true);
    const daysInMonth = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();
    const newRows: Record<number, DayRowData> = {};

    try {
      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(selectedYear, selectedMonthIndex, d);
        const dayName = MARATHI_DAYS[dateObj.getDay()];
        const isSunday = dateObj.getDay() === 0;
        const dateKey = getDateKey(selectedYear, selectedMonthIndex, d);

        if (isSunday) {
          newRows[d] = {
            date: d,
            day: dayName,
            isSunday: true,
            rashtrageet: "रविवार",
            pratigya: "रविवार",
            sanvidhan: "रविवार",
            prarthana: "रविवार",
            shlok: "रविवार",
            suvichar: "रविवार",
            batmya: "रविवार",
            dinvishesh: "रविवार",
            mhan: "रविवार",
            bodhkatha: "रविवार",
            samuhgeet: "रविवार",
            deshbhaktigeet: "रविवार",
            maun: "रविवार",
            swakshari: "",
          };
          continue;
        }

        // Try to fetch from Firebase archive
        try {
          const docRef = doc(db, "daily_paripath_archive", dateKey);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Extract actual content from the saved daily paripath data
            const nationalAnthemContent = data.nationalAnthem || "";
            const pledgeContent = data.pledge || data.pratigya || "";
            const preambleContent = data.preamble || data.sanvidhan || "";
            const prayerContent = data.prayer || data.prarthana || "";
            
            // Detect languages
            const anthemLang = detectLanguage(nationalAnthemContent);
            const pledgeLang = detectLanguage(pledgeContent);
            const preambleLang = detectLanguage(preambleContent);

            newRows[d] = {
              date: d,
              day: dayName,
              isSunday: false,
              // राष्ट्रगीत - जन गण मन
              rashtrageet: "जन गण मन",
              // प्रतिज्ञा - भारत माझा देश आहे
              pratigya: "भारत माझा देश आहे",
              // संविधान - आम्ही भारताचे नागरिक
              sanvidhan: "आम्ही भारताचे नागरिक",
              // प्रार्थना - short name of prayer
              prarthana: getPrayerShortName(prayerContent),
              // श्लोक - full shlok text
              shlok: data.shlok || data.thought || "",
              // सुविचार - full thought/suvichar
              suvichar: data.thought || data.suvichar || "",
              // बातम्या - all news items
              batmya: data.events || data.batmya || "",
              // दिनविशेष - full day significance
              dinvishesh: data.events || data.dinvishesh || "",
              // म्हण - proverb text
              mhan: data.proverb || data.mhan || "",
              // बोधकथा - only heading/title
              bodhkatha: data.storyTitle || data.bodhkatha || "",
              // समूहगीत - only heading/title
              samuhgeet: data.songTitle || data.samuhgeet || "",
              // देशभक्ती गीत - song title
              deshbhaktigeet: data.songTitle || data.deshbhaktigeet || "",
              // मौन पसायदान - just "पसायदान"
              maun: "पसायदान",
              // वर्गशिक्षकांची स्वाक्षरी - blank
              swakshari: "",
            };
          } else {
            // No data for this day - check if it's a future date
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const thisDate = new Date(selectedYear, selectedMonthIndex, d);
            
            if (thisDate > today) {
              // Future date - leave empty
              newRows[d] = {
                date: d,
                day: dayName,
                isSunday: false,
                rashtrageet: "",
                pratigya: "",
                sanvidhan: "",
                prarthana: "",
                shlok: "",
                suvichar: "",
                batmya: "",
                dinvishesh: "",
                mhan: "",
                bodhkatha: "",
                samuhgeet: "",
                deshbhaktigeet: "",
                maun: "",
                swakshari: "",
              };
            } else {
              // Past date but no data - show placeholder
              newRows[d] = {
                date: d,
                day: dayName,
                isSunday: false,
                rashtrageet: "जन गण मन",
                pratigya: "भारत माझा देश आहे",
                sanvidhan: "आम्ही भारताचे नागरिक",
                prarthana: "प्रार्थना",
                shlok: "",
                suvichar: "",
                batmya: "",
                dinvishesh: "",
                mhan: "",
                bodhkatha: "",
                samuhgeet: "",
                deshbhaktigeet: "",
                maun: "पसायदान",
                swakshari: "",
              };
            }
          }
        } catch (dayErr) {
          console.error(`Error fetching data for ${dateKey}:`, dayErr);
          newRows[d] = {
            date: d,
            day: dayName,
            isSunday: false,
            rashtrageet: "",
            pratigya: "",
            sanvidhan: "",
            prarthana: "",
            shlok: "",
            suvichar: "",
            batmya: "",
            dinvishesh: "",
            mhan: "",
            bodhkatha: "",
            samuhgeet: "",
            deshbhaktigeet: "",
            maun: "",
            swakshari: "",
          };
        }
      }

      setTableData(newRows);
      toast.success(`${MARATHI_MONTHS[selectedMonthIndex]} ${selectedYear} चा डेटा यशस्वीरीत्या लोड झाला!`);
    } catch (err) {
      console.error("Error fetching monthly data:", err);
      toast.error("डेटा लोड करताना त्रुटी आली.");
      // Generate empty rows
      generateEmptyRows();
    } finally {
      setIsFetching(false);
    }
  };

  // Also try loading from "current" document and save it as today's archive
  const fetchAndArchiveToday = async () => {
    try {
      const today = new Date();
      const dateKey = getDateKey(today.getFullYear(), today.getMonth(), today.getDate());
      
      // Check if today's archive already exists
      const archiveRef = doc(db, "daily_paripath_archive", dateKey);
      const archiveSnap = await getDoc(archiveRef);
      
      if (!archiveSnap.exists()) {
        // Fetch "current" and save as today's archive
        const currentRef = doc(db, "admin_daily_paripath", "current");
        const currentSnap = await getDoc(currentRef);
        
        if (currentSnap.exists()) {
          const currentData = currentSnap.data();
          await setDoc(archiveRef, {
            ...currentData,
            archivedDate: dateKey,
            archivedAt: new Date().toISOString(),
          });
          console.log(`Archived today's paripath data: ${dateKey}`);
        }
      }
    } catch (err) {
      console.error("Error archiving today's data:", err);
    }
  };

  // Generate empty rows for a month
  const generateEmptyRows = () => {
    const daysInMonth = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();
    const rows: Record<number, DayRowData> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(selectedYear, selectedMonthIndex, d);
      const dayName = MARATHI_DAYS[dateObj.getDay()];
      const isSunday = dateObj.getDay() === 0;
      rows[d] = {
        date: d,
        day: dayName,
        isSunday,
        rashtrageet: isSunday ? "रविवार" : "",
        pratigya: isSunday ? "रविवार" : "",
        sanvidhan: isSunday ? "रविवार" : "",
        prarthana: isSunday ? "रविवार" : "",
        shlok: isSunday ? "रविवार" : "",
        suvichar: isSunday ? "रविवार" : "",
        batmya: isSunday ? "रविवार" : "",
        dinvishesh: isSunday ? "रविवार" : "",
        mhan: isSunday ? "रविवार" : "",
        bodhkatha: isSunday ? "रविवार" : "",
        samuhgeet: isSunday ? "रविवार" : "",
        deshbhaktigeet: isSunday ? "रविवार" : "",
        maun: isSunday ? "रविवार" : "",
        swakshari: "",
      };
    }
    setTableData(rows);
  };

  // Auto-fetch when month/year changes
  useEffect(() => {
    fetchAndArchiveToday();
    fetchMonthlyData();
  }, [selectedMonthIndex, selectedYear]);

  const handleCellChange = (
    dateNum: number,
    field: keyof DayRowData,
    val: string
  ) => {
    setTableData((prev) => ({
      ...prev,
      [dateNum]: {
        ...prev[dateNum],
        [field]: val,
      },
    }));
  };

  // Save to Firebase as monthly register
  const handleSaveData = async () => {
    setIsSaving(true);
    try {
      const registerKey = `monthly_register_${selectedYear}_${selectedMonthIndex}`;
      await setDoc(doc(db, "monthly_paripath_registers", registerKey), {
        schoolName,
        academicYear,
        month: selectedMonthIndex,
        year: selectedYear,
        tableData,
        savedAt: new Date().toISOString(),
      });
      toast.success("परिपाठ नोंदवही यशस्वीरीत्या सेव्ह झाली! 🎉");
    } catch (e) {
      console.error("Save error:", e);
      toast.error("सेव्ह करताना त्रुटी आली.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleDownloadPdf = async () => {
    const element = printRef.current;
    if (!element) return;
    toast.success("PDF निर्मिती सुरू आहे...");
    try {
      const html2pdfModule = await import("html2pdf.js");
      let html2pdfFn: any = html2pdfModule.default || html2pdfModule;
      if (html2pdfFn && html2pdfFn.default) html2pdfFn = html2pdfFn.default;

      const opt = {
        margin: [3, 3, 3, 3],
        filename: `Masik_Paripath_${MARATHI_MONTHS[selectedMonthIndex]}_${selectedYear}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
      };
      await html2pdfFn().set(opt).from(element).save();
      toast.success("PDF यशस्वीरीत्या डाउनलोड झाली!");
    } catch (err: any) {
      console.error(err);
      toast.error("PDF तयार करताना त्रुटी आली. Print पर्याय वापरा.");
    }
  };

  const daysList = Object.values(tableData);

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto p-2 md:p-6">
      {/* Printable CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .non-printable, header, aside, footer, nav, button {
            display: none !important;
          }
          #printable-paripath-register, #printable-paripath-register * {
            visibility: visible !important;
          }
          #printable-paripath-register {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
          }
          .page-break {
            page-break-before: always !important;
            break-before: page !important;
          }
          table {
            font-size: 10px !important;
            border-collapse: collapse !important;
          }
          td, th {
            padding: 2px 3px !important;
            border: 1px solid #000000 !important;
            word-break: break-word !important;
          }
          textarea, input {
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
            font-size: 9px !important;
            padding: 0 !important;
            resize: none !important;
          }
        }
      `}</style>

      {/* Control Panel (Hidden in Print) */}
      <div className="non-printable bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl space-y-6 border border-indigo-900/40">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <FileSpreadsheet className="size-8" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                मासिक परिपाठ नोंदवही
              </h2>
              <p className="text-xs font-semibold text-indigo-300/80 uppercase tracking-widest mt-1">
                दैनिक परिपाठातून स्वयंचलित डेटा • Day-to-Day Auto Fetch
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchMonthlyData}
              disabled={isFetching}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500/20 text-amber-200 hover:bg-amber-500/40 border border-amber-400/30 font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {isFetching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              {isFetching ? "डेटा लोड होत आहे..." : "🔄 रिफ्रेश डेटा"}
            </button>

            <button
              onClick={handleSaveData}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-900/40 active:scale-95"
            >
              <Save className="size-4" />
              {isSaving ? "सेव्ह होत आहे..." : "सेव्ह करा"}
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider border border-white/20 transition-all active:scale-95"
            >
              <Printer className="size-4 text-sky-400" />
              प्रिंट नोंदवही
            </button>

            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/30 active:scale-95"
            >
              <Download className="size-4" />
              PDF डाउनलोड
            </button>
          </div>
        </div>

        {/* Inputs row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-white/10 text-xs font-medium">
          <div className="space-y-1.5">
            <label className="text-indigo-200/80 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="size-3.5" /> शाळेचे नाव
            </label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white outline-none focus:border-indigo-400 font-bold"
              placeholder="शाळेचे नाव टाका"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-indigo-200/80 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="size-3.5" /> सन (शैक्षणिक वर्ष)
            </label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white outline-none focus:border-indigo-400 font-bold"
              placeholder="२०२५-२०२६"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-indigo-200/80 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="size-3.5" /> महिना निवडा
            </label>
            <select
              value={selectedMonthIndex}
              onChange={(e) => setSelectedMonthIndex(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/20 text-white outline-none focus:border-indigo-400 font-bold cursor-pointer"
            >
              {MARATHI_MONTHS.map((m, idx) => (
                <option key={idx} value={idx}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-indigo-200/80 font-bold uppercase tracking-wider flex items-center gap-1.5">
              वर्ष निवडा
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/20 text-white outline-none focus:border-indigo-400 font-bold cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status info */}
        {isFetching && (
          <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
            <Loader2 className="size-5 animate-spin text-amber-400" />
            <span className="text-amber-200 text-sm font-bold">
              दैनिक परिपाठ डेटा Firebase मधून लोड होत आहे... कृपया प्रतीक्षा करा.
            </span>
          </div>
        )}
      </div>

      {/* REGISTER DISPLAY AREA */}
      <div
        id="printable-paripath-register"
        ref={printRef}
        className="bg-white p-4 md:p-6 rounded-[2rem] shadow-xl border border-slate-300 font-sans space-y-8"
      >
        {/* ==================== PAGE 1: दैनिक ==================== */}
        <div className="space-y-3">
          {/* Header Line 1 */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
            <div className="flex items-center gap-8 font-black text-slate-900 text-sm md:text-base">
              <div>
                शाळेचे नाव :{" "}
                <span className="border-b-2 border-dotted border-slate-700 px-3 py-0.5 text-indigo-900">
                  {schoolName || "..................................................."}
                </span>
              </div>
            </div>

            <div className="text-right">
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-wider">
                दैनिक
              </h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase">
                {MARATHI_MONTHS[selectedMonthIndex]} {selectedYear}
              </p>
            </div>
          </div>

          {/* Page 1 Table */}
          <div className="overflow-x-auto border-2 border-slate-900 rounded-none bg-white">
            <table className="w-full table-fixed text-left text-[10px] text-slate-900 border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-900 text-center font-black text-slate-900 uppercase text-xs">
                  <th className="p-1.5 border-r border-slate-900 w-[2%]">दिनांक</th>
                  <th className="p-1.5 border-r border-slate-900 w-[6%]">वार</th>
                  <th className="p-1.5 border-r border-slate-900 w-[10%]">राष्ट्रगीत</th>
                  <th className="p-1.5 border-r border-slate-900 w-[10%]">प्रतिज्ञा</th>
                  <th className="p-1.5 border-r border-slate-900 w-[11%]">भारताचे संविधान</th>
                  <th className="p-1.5 border-r border-slate-900 w-[11%]">प्रार्थना</th>
                  <th className="p-1.5 border-r border-slate-900 w-[16%]">श्लोक</th>
                  <th className="p-1.5 w-[34%]">सुविचार</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {daysList.map((row) => (
                  <tr
                    key={row.date}
                    className={`${
                      row.isSunday
                        ? "bg-rose-50/70 text-rose-900 font-bold"
                        : "hover:bg-slate-50"
                    }`}
                  >
                     {/* Date */}
                    <td className="p-1 border-r border-slate-800 text-center font-black text-slate-900">
                      {row.date}
                    </td>

                    {/* Day */}
                    <td className="p-1 border-r border-slate-800 text-center font-bold text-[11px]">
                      {row.day}
                    </td>

                    {row.isSunday ? (
                      <td colSpan={6} className="p-1 text-center font-black text-rose-700 text-[13px] tracking-widest">
                        रविवार
                      </td>
                    ) : (
                      <>
                        {/* Rashtrageet */}
                        <td className="p-0.5 border-r border-slate-800">
                          <textarea
                            value={row.rashtrageet}
                            onChange={(e) =>
                              handleCellChange(row.date, "rashtrageet", e.target.value)
                            }
                            className="w-full bg-transparent text-center outline-none font-bold text-[11px] resize-none leading-tight"
                            rows={1}
                          />
                        </td>

                        {/* Pratigya */}
                        <td className="p-0.5 border-r border-slate-800">
                          <textarea
                            value={row.pratigya}
                            onChange={(e) =>
                              handleCellChange(row.date, "pratigya", e.target.value)
                            }
                            className="w-full bg-transparent text-center outline-none font-bold text-[11px] resize-none leading-tight"
                            rows={1}
                          />
                        </td>

                        {/* Sanvidhan */}
                        <td className="p-0.5 border-r border-slate-800">
                          <textarea
                            value={row.sanvidhan}
                            onChange={(e) =>
                              handleCellChange(row.date, "sanvidhan", e.target.value)
                            }
                            className="w-full bg-transparent text-center outline-none font-bold text-[11px] resize-none leading-tight"
                            rows={1}
                          />
                        </td>

                        {/* Prarthana */}
                        <td className="p-0.5 border-r border-slate-800">
                          <textarea
                            value={row.prarthana}
                            onChange={(e) =>
                              handleCellChange(row.date, "prarthana", e.target.value)
                            }
                            className="w-full bg-transparent text-center outline-none font-bold text-[11px] resize-none leading-tight"
                            rows={1}
                          />
                        </td>

                        {/* Shlok */}
                        <td className="p-0.5 border-r border-slate-800">
                          <textarea
                            value={row.shlok}
                            onChange={(e) =>
                              handleCellChange(row.date, "shlok", e.target.value)
                            }
                            className="w-full bg-transparent text-left px-0.5 outline-none font-medium text-[10px] resize-none leading-tight"
                            rows={2}
                            placeholder="श्लोक..."
                          />
                        </td>

                        {/* Suvichar */}
                        <td className="p-0.5">
                          <textarea
                            value={row.suvichar}
                            onChange={(e) =>
                              handleCellChange(row.date, "suvichar", e.target.value)
                            }
                            className="w-full bg-transparent text-left px-0.5 outline-none font-medium text-[10px] resize-none leading-tight"
                            rows={2}
                            placeholder="सुविचार..."
                          />
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Page Break */}
        <div className="relative my-6 border-t-4 border-dashed border-slate-300 non-printable flex items-center justify-center">
          <span className="bg-slate-200 text-slate-700 px-6 py-1.5 rounded-full text-xs font-black uppercase tracking-widest -mt-4 shadow-sm border border-slate-300">
            पानाचे विभाजन / Page 2 (परिपाठातील उपक्रम)
          </span>
        </div>

        {/* ==================== PAGE 2: परिपाठातील उपक्रम ==================== */}
        <div className="space-y-3 page-break">
          {/* Header Line 2 */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
            <div className="font-black text-slate-900 text-sm md:text-base">
              सन :{" "}
              <span className="border-b-2 border-dotted border-slate-700 px-4 py-0.5 text-indigo-900">
                {academicYear || ".........................................."}
              </span>
            </div>

            <div className="text-center">
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-wider">
                परिपाठातील उपक्रम
              </h2>
            </div>

            <div className="text-right text-xs font-bold text-slate-600">
              महिना: {MARATHI_MONTHS[selectedMonthIndex]} {selectedYear}
            </div>
          </div>

          {/* Page 2 Table */}
          <div className="overflow-x-auto border-2 border-slate-900 rounded-none bg-white">
            <table className="w-full text-left text-[10px] text-slate-900 border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-900 text-center font-black text-slate-900 uppercase text-[11px]">
                  <th className="p-1.5 border-r border-slate-900 w-[14%]">
                    सुसंस्कारक्षम बातम्या
                  </th>
                  <th className="p-1.5 border-r border-slate-900 w-[14%]">दिनविशेष</th>
                  <th className="p-1.5 border-r border-slate-900 w-[13%]">म्हण</th>
                  <th className="p-1.5 border-r border-slate-900 w-[12%]">बोधकथा</th>
                  <th className="p-1.5 border-r border-slate-900 w-[12%]">समूहगीत</th>
                  <th className="p-1.5 border-r border-slate-900 w-[13%]">
                    देशभक्ती गीत
                  </th>
                  <th className="p-1.5 border-r border-slate-900 w-[10%]">
                    मौन पसायदान
                  </th>
                  <th className="p-1.5 w-[12%]">वर्गशिक्षकांची स्वाक्षरी</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {daysList.map((row) => (
                  <tr
                    key={row.date}
                    className={`${
                      row.isSunday
                        ? "bg-rose-50/70 text-rose-900 font-bold"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    {row.isSunday ? (
                      <td colSpan={8} className="p-1 text-center font-black text-rose-700 text-[13px] tracking-widest">
                        रविवार
                      </td>
                    ) : (
                      <>
                        {/* बातम्या - all news */}
                        <td className="p-0.5 border-r border-slate-800">
                          <textarea
                            value={row.batmya}
                            onChange={(e) =>
                              handleCellChange(row.date, "batmya", e.target.value)
                            }
                            className="w-full bg-transparent text-left px-0.5 outline-none font-medium text-[10px] resize-none leading-tight"
                            rows={2}
                            placeholder="बातम्या..."
                          />
                        </td>

                        {/* दिनविशेष - full */}
                        <td className="p-0.5 border-r border-slate-800">
                          <textarea
                            value={row.dinvishesh}
                            onChange={(e) =>
                              handleCellChange(row.date, "dinvishesh", e.target.value)
                            }
                            className="w-full bg-transparent text-left px-0.5 outline-none font-medium text-[10px] resize-none leading-tight"
                            rows={2}
                            placeholder="दिनविशेष..."
                          />
                        </td>

                        {/* म्हण */}
                        <td className="p-0.5 border-r border-slate-800">
                          <textarea
                            value={row.mhan}
                            onChange={(e) =>
                              handleCellChange(row.date, "mhan", e.target.value)
                            }
                            className="w-full bg-transparent text-left px-0.5 outline-none font-medium text-[10px] resize-none leading-tight"
                            rows={2}
                            placeholder="म्हण..."
                          />
                        </td>

                        {/* बोधकथा - only heading */}
                        <td className="p-0.5 border-r border-slate-800">
                          <textarea
                            value={row.bodhkatha}
                            onChange={(e) =>
                              handleCellChange(row.date, "bodhkatha", e.target.value)
                            }
                            className="w-full bg-transparent text-center outline-none font-bold text-[11px] resize-none leading-tight"
                            rows={1}
                            placeholder="शीर्षक..."
                          />
                        </td>

                        {/* समूहगीत - only heading */}
                        <td className="p-0.5 border-r border-slate-800">
                          <textarea
                            value={row.samuhgeet}
                            onChange={(e) =>
                              handleCellChange(row.date, "samuhgeet", e.target.value)
                            }
                            className="w-full bg-transparent text-center outline-none font-bold text-[11px] resize-none leading-tight"
                            rows={1}
                            placeholder="गीत शीर्षक..."
                          />
                        </td>

                        {/* देशभक्ती गीत - title */}
                        <td className="p-0.5 border-r border-slate-800">
                          <textarea
                            value={row.deshbhaktigeet}
                            onChange={(e) =>
                              handleCellChange(row.date, "deshbhaktigeet", e.target.value)
                            }
                            className="w-full bg-transparent text-center outline-none font-bold text-[11px] resize-none leading-tight"
                            rows={1}
                            placeholder="गीत शीर्षक..."
                          />
                        </td>

                        {/* मौन पसायदान */}
                        <td className="p-0.5 border-r border-slate-800">
                          <textarea
                            value={row.maun}
                            onChange={(e) =>
                              handleCellChange(row.date, "maun", e.target.value)
                            }
                            className="w-full bg-transparent text-center outline-none font-bold text-[11px] resize-none leading-tight"
                            rows={1}
                          />
                        </td>

                        {/* वर्गशिक्षकांची स्वाक्षरी - blank */}
                        <td className="p-1">
                          <div className="h-6 w-full"></div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
