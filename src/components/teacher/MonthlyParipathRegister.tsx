import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  CalendarDays,
  Trash2,
  Plus,
  X,
  SunMedium,
} from "lucide-react";
import { showToast as toast } from "@/lib/custom-toast";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// ---------- Types ----------
interface DayRowData {
  date: number;
  day: string;
  isSunday: boolean;
  isHoliday?: boolean;
  holidayReason?: string;
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

// Helper: extract the first line or a clean short version of a text
function shortText(text: string | undefined, maxLen = 120): string {
  if (!text) return "";
  const firstLine = text.split("\n").map((s) => s.trim()).filter(Boolean)[0] || "";
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
  const [schoolInfo, setSchoolInfo] = useState({
    schoolName: "",
    udise: "",
    kendra: "",
    taluka: "",
    jilha: "",
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("paripathSchoolInfo");
      if (saved) {
        const parsed = JSON.parse(saved);
        setSchoolInfo(parsed);
        if (parsed.schoolName) {
          setSchoolName(parsed.schoolName);
        }
      }
    } catch (e) {
      console.error("Failed to load paripathSchoolInfo", e);
    }
  }, []);

  const [tableData, setTableData] = useState<Record<number, DayRowData>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Holidays state
  const [holidaysMap, setHolidaysMap] = useState<Record<string, { isHoliday: boolean; reason: string }>>({});
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayDate, setHolidayDate] = useState<string>(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  );
  const [holidayReason, setHolidayReason] = useState("शाळेस सुट्टी");
  const [isSavingHoliday, setIsSavingHoliday] = useState(false);

  // Firebase collection for daily paripath archive
  const getDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  // Declare a holiday
  const handleDeclareHoliday = async (targetDateStr: string, reasonText: string) => {
    if (!targetDateStr) {
      toast.error("कृपया तारीख निवडा");
      return;
    }
    setIsSavingHoliday(true);
    try {
      const declaredRef = doc(db, "school_holidays", "declared");
      const updatedHolidays = {
        ...holidaysMap,
        [targetDateStr]: {
          isHoliday: true,
          reason: reasonText || "शाळेस सुट्टी",
          declaredAt: new Date().toISOString(),
        },
      };
      await setDoc(declaredRef, updatedHolidays, { merge: true });
      setHolidaysMap(updatedHolidays);
      toast.success(`${targetDateStr} ला सुट्टी घोषित करण्यात आली! 🎉`);
      fetchMonthlyData();
    } catch (err) {
      console.error("Error declaring holiday:", err);
      toast.error("सुट्टी सेव्ह करताना त्रुटी आली.");
    } finally {
      setIsSavingHoliday(false);
    }
  };

  // Remove a holiday
  const handleRemoveHoliday = async (targetDateStr: string) => {
    setIsSavingHoliday(true);
    try {
      const declaredRef = doc(db, "school_holidays", "declared");
      const updatedHolidays = { ...holidaysMap };
      delete updatedHolidays[targetDateStr];
      await setDoc(declaredRef, updatedHolidays);
      setHolidaysMap(updatedHolidays);
      toast.success(`${targetDateStr} ची सुट्टी रद्द करण्यात आली!`);
      fetchMonthlyData();
    } catch (err) {
      console.error("Error removing holiday:", err);
      toast.error("सुट्टी रद्द करताना त्रुटी आली.");
    } finally {
      setIsSavingHoliday(false);
    }
  };

  // Fetch daily paripath data from Firebase for the selected month
  const fetchMonthlyData = async () => {
    setIsFetching(true);
    const daysInMonth = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();
    const newRows: Record<number, DayRowData> = {};

    // 1. Fetch declared holidays first
    let holidays: Record<string, { isHoliday: boolean; reason: string }> = {};
    try {
      const hSnap = await getDoc(doc(db, "school_holidays", "declared"));
      if (hSnap.exists()) {
        holidays = hSnap.data() as any;
      }
    } catch (e) {
      console.error("Failed to fetch declared holidays", e);
    }
    setHolidaysMap(holidays);

    try {
      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(selectedYear, selectedMonthIndex, d);
        const dayName = MARATHI_DAYS[dateObj.getDay()];
        const isSunday = dateObj.getDay() === 0;
        const dateKey = getDateKey(selectedYear, selectedMonthIndex, d);
        const holidayInfo = holidays[dateKey];

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

        // Check if declared holiday
        if (holidayInfo && holidayInfo.isHoliday) {
          newRows[d] = {
            date: d,
            day: dayName,
            isSunday: false,
            isHoliday: true,
            holidayReason: holidayInfo.reason || "शाळेस सुट्टी",
            rashtrageet: `सुट्टी (${holidayInfo.reason || "शाळेस सुट्टी"})`,
            pratigya: "सुट्टी",
            sanvidhan: "सुट्टी",
            prarthana: "सुट्टी",
            shlok: "सुट्टी",
            suvichar: "सुट्टी",
            batmya: "सुट्टी",
            dinvishesh: "सुट्टी",
            mhan: "सुट्टी",
            bodhkatha: "सुट्टी",
            samuhgeet: "सुट्टी",
            deshbhaktigeet: "सुट्टी",
            maun: "सुट्टी",
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
              // श्लोक - first line / short text
              shlok: shortText(data.shlok, 70),
              // सुविचार - full suvichar (allows up to 120 characters so it fits completely without '...')
              suvichar: shortText(data.thought || data.suvichar, 120),
              // बातम्या - only first line/title
              batmya: shortText(data.valueNews || data.batmya, 80),
              // दिनविशेष - only first line/title
              dinvishesh: shortText(data.events || data.dinvishesh, 80),
              // म्हण - proverb text
              mhan: shortText(data.proverb || data.mhan, 80),
              // बोधकथा - title
              bodhkatha: data.storyTitle || shortText(data.story || data.bodhkatha, 50),
              // समूहगीत - title
              samuhgeet: data.songTitle || shortText(data.patrioticSong || data.samuhgeet, 50),
              // देशभक्ती गीत - title
              deshbhaktigeet: data.songTitle || shortText(data.patrioticSong || data.deshbhaktigeet, 50),
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

  const handleDownloadPdf = async () => {
    const element = printRef.current;
    if (!element) return;
    toast.success("PDF निर्मिती सुरू आहे...");
    try {
      const html2canvasModule = await import("html2canvas");
      const jsPDFModule = await import("jspdf");
      const html2canvas = html2canvasModule.default || html2canvasModule;
      const jsPDF = jsPDFModule.jsPDF || (jsPDFModule as any).default;

      // Select each of the 3 page chunk containers
      const chunkEls = element.querySelectorAll(".page-chunk-box");
      if (!chunkEls || chunkEls.length === 0) return;

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      for (let i = 0; i < chunkEls.length; i++) {
        const chunkEl = chunkEls[i] as HTMLElement;

        // Clone the single page chunk element
        const clonedChunk = chunkEl.cloneNode(true) as HTMLElement;

        // 1. Hide non-printables
        clonedChunk.querySelectorAll(".non-printable").forEach((el: any) => el.remove());

        // 2. Replace textareas with plain text divs
        clonedChunk.querySelectorAll("textarea").forEach((ta: HTMLTextAreaElement) => {
          const div = document.createElement("div");
          div.textContent = ta.value || "";
          div.style.cssText = `
            font-family: 'Noto Sans Devanagari', sans-serif;
            font-size: 8px;
            font-weight: 600;
            line-height: 1.15;
            text-align: ${ta.classList.contains("text-center") ? "center" : "left"};
            padding: 0.5px 1px;
            word-break: break-word;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            max-height: 20px;
          `;
          ta.parentNode?.replaceChild(div, ta);
        });

        // 3. Wrap in a clean printable container matching A4 landscape canvas
        const container = document.createElement("div");
        container.style.cssText = `
          position: absolute;
          left: -9999px;
          top: -9999px;
          width: 1040px;
          background: #ffffff;
          padding: 8px;
          box-sizing: border-box;
          font-family: 'Noto Sans Devanagari', sans-serif;
        `;

        // Inject PDF specific styling to ensure clean borders & text
        const style = document.createElement("style");
        style.textContent = `
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-size: 8px !important;
            margin: 0 !important;
          }
          th {
            padding: 3px 2px !important;
            border: 1.2px solid #0f172a !important;
            background-color: #f1f5f9 !important;
            font-weight: 900 !important;
            font-size: 8.5px !important;
            text-align: center !important;
            font-family: 'Noto Sans Devanagari', sans-serif !important;
            color: #0f172a !important;
          }
          td {
            padding: 2px 2.5px !important;
            border: 1px solid #334155 !important;
            font-size: 8px !important;
            font-family: 'Noto Sans Devanagari', sans-serif !important;
            vertical-align: middle !important;
            word-break: break-word !important;
            color: #1e293b !important;
            line-height: 1.15 !important;
          }
          tr[class*="bg-rose"] td {
            background-color: #fff1f2 !important;
            color: #be123c !important;
            font-weight: 800 !important;
            text-align: center !important;
          }
          .overflow-x-auto {
            overflow: visible !important;
            border: 1.5px solid #0f172a !important;
            border-radius: 0 !important;
            margin-top: 6px !important;
            margin-bottom: 16px !important;
          }
        `;
        container.appendChild(style);
        container.appendChild(clonedChunk);
        document.body.appendChild(container);

        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          logging: false,
          windowWidth: 1040,
        });

        document.body.removeChild(container);

        const imgData = canvas.toDataURL("image/jpeg", 0.98);

        if (i > 0) {
          pdf.addPage("a4", "landscape");
        }

        // A4 Landscape is 297mm x 210mm. Margins: 6mm left/right, 5mm top/bottom
        const pdfWidth = 285;
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, "JPEG", 6, 5, pdfWidth, Math.min(pdfHeight, 200));
      }

      pdf.save(`Masik_Paripath_${MARATHI_MONTHS[selectedMonthIndex]}_${selectedYear}.pdf`);
      toast.success("PDF यशस्वीरित्या डाउनलोड झाली!");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("PDF निर्मितीमध्ये त्रुटी आली.");
    }
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

  const daysList = Object.values(tableData);

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto p-2 md:p-6">
      {/* Printable CSS */}
      <style>{`
        textarea {
          overflow: hidden !important;
          resize: none !important;
          white-space: pre-wrap !important;
          word-break: break-word !important;
        }

        @media print {
          body {
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
            font-size: 10.5px !important;
            border-collapse: collapse !important;
            width: 100% !important;
          }
          td, th {
            padding: 4px 5px !important;
            border: 1px solid #000000 !important;
            word-break: break-word !important;
            vertical-align: middle !important;
          }
          textarea {
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
            height: auto !important;
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
              onClick={() => setShowHolidayModal(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-900/30 active:scale-95"
            >
              <CalendarDays className="size-4" />
              📅 सुट्टी घोषित करा
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
        {/* ==================== COMBINED PAGE CHUNKS: 1-10, 11-20, 21-31 ==================== */}
        {[
          { min: 1, max: 10, label: "दिनांक १ ते १०" },
          { min: 11, max: 20, label: "दिनांक ११ ते २०" },
          { min: 21, max: 31, label: "दिनांक २१ ते ३१" },
        ].map((chunk, chunkIdx) => {
          const chunkRows = daysList.filter(row => row.date >= chunk.min && row.date <= chunk.max);
          if (chunkRows.length === 0) return null;

          return (
            <React.Fragment key={`page-chunk-${chunkIdx}`}>
              {chunkIdx > 0 && (
                <div className="relative my-8 border-t-4 border-dashed border-slate-300 non-printable flex items-center justify-center">
                  <span className="bg-slate-200 text-slate-700 px-6 py-1.5 rounded-full text-xs font-black uppercase tracking-widest -mt-4 shadow-sm border border-slate-300">
                    पानाचे विभाजन / Page {chunkIdx + 1} ({chunk.label})
                  </span>
                </div>
              )}

              <div className={`page-chunk-box space-y-4 ${chunkIdx > 0 ? "page-break" : ""}`}>
                {/* ---------- SINGLE UNIFIED HEADER ---------- */}
                <div className="flex flex-col gap-1 border-b-2 border-slate-900 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 font-black text-slate-900 text-xs md:text-sm">
                      <div>
                        शाळेचे नाव :{" "}
                        <span className="border-b border-dotted border-slate-700 px-2 py-0.5 text-indigo-900">
                          {schoolName || schoolInfo.schoolName || "..................................................."}
                        </span>
                      </div>
                      <div>
                        सन :{" "}
                        <span className="border-b border-dotted border-slate-700 px-2 py-0.5 text-indigo-900">
                          {academicYear || ".........................................."}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-wider">
                        दैनिक व परिपाठातील उपक्रम ({chunk.label})
                      </h2>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">
                        महिना: {MARATHI_MONTHS[selectedMonthIndex]} {selectedYear}
                      </p>
                    </div>
                  </div>

                  {/* School Metadata Info Row */}
                  {(schoolInfo.udise || schoolInfo.kendra || schoolInfo.taluka || schoolInfo.jilha) && (
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] font-bold text-slate-700 pt-1 border-t border-slate-200">
                      {schoolInfo.udise && <div>युडायस : <span className="font-extrabold text-slate-900">{schoolInfo.udise}</span></div>}
                      {schoolInfo.kendra && <div>केंद्र : <span className="font-extrabold text-slate-900">{schoolInfo.kendra}</span></div>}
                      {schoolInfo.taluka && <div>तालुका : <span className="font-extrabold text-slate-900">{schoolInfo.taluka}</span></div>}
                      {schoolInfo.jilha && <div>जिल्हा : <span className="font-extrabold text-slate-900">{schoolInfo.jilha}</span></div>}
                    </div>
                  )}
                </div>

                {/* ---------- TABLE 1: दैनिक ---------- */}
                <div className="overflow-x-auto border-2 border-slate-900 bg-white shadow-sm mb-4 w-full">
                  <table className="w-full text-left text-[11px] text-slate-900 border-collapse align-middle table-fixed min-w-[950px]">
                    <colgroup>
                      <col style={{ width: "5%" }} />
                      <col style={{ width: "11%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "14%" }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-900 text-center font-black text-slate-900 uppercase text-[11px]">
                        <th className="p-2 border-r border-slate-900 text-center align-middle">दिनांक</th>
                        <th className="p-2 border-r border-slate-900 text-center align-middle">वार</th>
                        <th className="p-2 border-r border-slate-900 text-center align-middle">राष्ट्रगीत</th>
                        <th className="p-2 border-r border-slate-900 text-center align-middle">प्रतिज्ञा</th>
                        <th className="p-2 border-r border-slate-900 text-center align-middle">भारताचे संविधान</th>
                        <th className="p-2 border-r border-slate-900 text-center align-middle">प्रार्थना</th>
                        <th className="p-2 border-r border-slate-900 text-center align-middle">श्लोक</th>
                        <th className="p-2 text-center align-middle">सुविचार</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 font-medium">
                      {chunkRows.map((row) => (
                        <tr
                          key={row.date}
                          className={`${
                            row.isSunday || row.isHoliday
                              ? "bg-rose-50 text-rose-900 font-bold"
                              : "hover:bg-slate-50/80"
                          }`}
                        >
                          {row.isSunday ? (
                            <td colSpan={8} className="p-2.5 text-center font-black text-rose-700 text-[13px] tracking-widest align-middle border-b border-slate-900">
                              रविवार
                            </td>
                          ) : row.isHoliday ? (
                            <td colSpan={8} className="p-2.5 text-center font-black text-rose-700 text-[13px] tracking-wider align-middle border-b border-slate-900">
                              सुट्टी ({row.holidayReason || "शाळेस सुट्टी"})
                            </td>
                          ) : (
                            <>
                              <td className="p-2 border-r border-slate-900 text-center font-black align-middle text-slate-900">
                                {row.date}
                              </td>
                              <td className="p-2 border-r border-slate-900 text-center font-bold text-[11px] align-middle text-slate-900">
                                {row.day}
                              </td>
                              <td className="p-1 border-r border-slate-900 align-middle">
                                <textarea
                                  value={row.rashtrageet}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "rashtrageet", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-center outline-none font-bold text-[11px] leading-snug overflow-hidden resize-none py-1 px-1 border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  rows={1}
                                />
                              </td>
                              <td className="p-1 border-r border-slate-900 align-middle">
                                <textarea
                                  value={row.pratigya}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "pratigya", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-center outline-none font-bold text-[11px] leading-snug overflow-hidden resize-none py-1 px-1 border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  rows={1}
                                />
                              </td>
                              <td className="p-1 border-r border-slate-900 align-middle">
                                <textarea
                                  value={row.sanvidhan}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "sanvidhan", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-center outline-none font-bold text-[11px] leading-snug overflow-hidden resize-none py-1 px-1 border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  rows={1}
                                />
                              </td>
                              <td className="p-1 border-r border-slate-900 align-middle">
                                <textarea
                                  value={row.prarthana}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "prarthana", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-center outline-none font-bold text-[11px] leading-snug overflow-hidden resize-none py-1 px-1 border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  rows={1}
                                />
                              </td>
                              <td className="p-1 border-r border-slate-900 align-middle">
                                <textarea
                                  value={row.shlok}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "shlok", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-left px-1.5 py-1 outline-none font-medium text-[11px] leading-snug overflow-hidden resize-none whitespace-pre-wrap break-words border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  rows={2}
                                  placeholder="श्लोक..."
                                />
                              </td>
                              <td className="p-1 align-middle">
                                <textarea
                                  value={row.suvichar}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "suvichar", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-left px-1.5 py-1 outline-none font-medium text-[11px] leading-snug overflow-hidden resize-none whitespace-pre-wrap break-words border-0 focus:ring-1 focus:ring-indigo-500 rounded"
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

                {/* ---------- TABLE 2: परिपाठातील उपक्रम ---------- */}
                <div className="overflow-x-auto border-2 border-slate-900 bg-white shadow-sm w-full">
                  <table className="w-full text-left text-[11px] text-slate-900 border-collapse align-middle table-fixed min-w-[950px]">
                    <colgroup>
                      <col style={{ width: "5%" }} />
                      <col style={{ width: "11%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "14%" }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-900 text-center font-black text-slate-900 uppercase text-[11px]">
                        <th className="p-2 border-r border-slate-900 text-center align-middle">
                          सुसंस्कारक्षम बातम्या
                        </th>
                        <th className="p-2 border-r border-slate-900 text-center align-middle">दिनविशेष</th>
                        <th className="p-2 border-r border-slate-900 text-center align-middle">म्हण</th>
                        <th className="p-2 border-r border-slate-900 text-center align-middle">बोधकथा</th>
                        <th className="p-2 border-r border-slate-900 text-center align-middle">समूहगीत</th>
                        <th className="p-2 border-r border-slate-900 text-center align-middle">
                          देशभक्ती गीत
                        </th>
                        <th className="p-2 border-r border-slate-900 text-center align-middle">
                          मौन पसायदान
                        </th>
                        <th className="p-2 text-center align-middle">वर्गशिक्षकांची स्वाक्षरी</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 font-medium">
                      {chunkRows.map((row) => (
                        <tr
                          key={row.date}
                          className={`${
                            row.isSunday || row.isHoliday
                              ? "bg-rose-50 text-rose-900 font-bold"
                              : "hover:bg-slate-50/80"
                          }`}
                        >
                          {row.isSunday ? (
                            <td colSpan={8} className="p-2.5 text-center font-black text-rose-700 text-[13px] tracking-widest align-middle border-b border-slate-900">
                              रविवार
                            </td>
                          ) : row.isHoliday ? (
                            <td colSpan={8} className="p-2.5 text-center font-black text-rose-700 text-[13px] tracking-wider align-middle border-b border-slate-900">
                              सुट्टी ({row.holidayReason || "शाळेस सुट्टी"})
                            </td>
                          ) : (
                            <>
                              <td className="p-1 border-r border-slate-900 align-middle">
                                <textarea
                                  value={row.batmya}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "batmya", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-left px-1.5 py-1 outline-none font-medium text-[11px] leading-snug overflow-hidden resize-none whitespace-pre-wrap break-words border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  rows={2}
                                  placeholder="बातम्या..."
                                />
                              </td>
                              <td className="p-1 border-r border-slate-900 align-middle">
                                <textarea
                                  value={row.dinvishesh}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "dinvishesh", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-left px-1.5 py-1 outline-none font-medium text-[11px] leading-snug overflow-hidden resize-none whitespace-pre-wrap break-words border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  rows={2}
                                  placeholder="दिनविशेष..."
                                />
                              </td>
                              <td className="p-1 border-r border-slate-900 align-middle">
                                <textarea
                                  value={row.mhan}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "mhan", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-left px-1.5 py-1 outline-none font-medium text-[11px] leading-snug overflow-hidden resize-none whitespace-pre-wrap break-words border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  rows={2}
                                  placeholder="म्हण..."
                                />
                              </td>
                              <td className="p-1 border-r border-slate-900 align-middle">
                                <textarea
                                  value={row.bodhkatha}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "bodhkatha", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-center outline-none font-bold text-[11px] leading-snug overflow-hidden resize-none py-1 px-1 border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  rows={1}
                                  placeholder="शीर्षक..."
                                />
                              </td>
                              <td className="p-1 border-r border-slate-900 align-middle">
                                <textarea
                                  value={row.samuhgeet}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "samuhgeet", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-center outline-none font-bold text-[11px] leading-snug overflow-hidden resize-none py-1 px-1 border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  rows={1}
                                  placeholder="गीत शीर्षक..."
                                />
                              </td>
                              <td className="p-1 border-r border-slate-900 align-middle">
                                <textarea
                                  value={row.deshbhaktigeet}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "deshbhaktigeet", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-center outline-none font-bold text-[11px] leading-snug overflow-hidden resize-none py-1 px-1 border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  rows={1}
                                  placeholder="गीत शीर्षक..."
                                />
                              </td>
                              <td className="p-1 border-r border-slate-900 align-middle">
                                <textarea
                                  value={row.maun}
                                  onChange={(e) => {
                                    handleCellChange(row.date, "maun", e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                  }}
                                  className="w-full bg-transparent text-center outline-none font-bold text-[11px] leading-snug overflow-hidden resize-none py-1 px-1 border-0 focus:ring-1 focus:ring-indigo-500 rounded"
                                  rows={1}
                                />
                              </td>
                              <td className="p-1 align-middle">
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
            </React.Fragment>
          );
        })}
      </div>

      {/* Holiday Management Modal */}
      {showHolidayModal &&
        typeof window !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/75 animate-in fade-in duration-200 non-printable">
            <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative z-[1000000]">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                    <CalendarDays className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-white">
                      शाळा सुट्टी व्यवस्थापन (Holiday Calendar)
                    </h3>
                    <p className="text-xs text-slate-400">
                      तारीख निवडून सुट्टी घोषित करा किंवा रद्द करा
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHolidayModal(false)}
                  className="size-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 transition-all"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Declare New Holiday Section */}
              <div className="space-y-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                  <Plus className="size-3.5" /> नवीन सुट्टी घोषित करा
                </h4>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      १. तारीख निवडा:
                    </label>
                    <input
                      type="date"
                      value={holidayDate}
                      onChange={(e) => setHolidayDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/20 text-white font-bold outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      २. सुट्टीचे कारण:
                    </label>
                    <input
                      type="text"
                      value={holidayReason}
                      onChange={(e) => setHolidayReason(e.target.value)}
                      placeholder="उदा. सार्वजनिक सुट्टी, दिवाळी सुट्टी, इ."
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/20 text-white font-bold outline-none focus:border-amber-400 mb-2"
                    />

                    {/* Presets */}
                    <div className="flex flex-wrap gap-1.5">
                      {["शाळेस सुट्टी", "सार्वजनिक सुट्टी", "स्थानिक सुट्टी", "जयंती सुट्टी", "सण सुट्टी"].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setHolidayReason(preset)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeclareHoliday(holidayDate, holidayReason)}
                    disabled={isSavingHoliday}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 disabled:opacity-50 mt-2"
                  >
                    {isSavingHoliday ? "सेव्ह होत आहे..." : "🎉 सुट्टी घोषित करा"}
                  </button>
                </div>
              </div>

              {/* Existing Declared Holidays List */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  घोषित केलेल्या सुट्ट्यांची यादी ({MARATHI_MONTHS[selectedMonthIndex]} {selectedYear}):
                </h4>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {Object.entries(holidaysMap)
                    .filter(([dKey, val]) => val.isHoliday && dKey.startsWith(`${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, "0")}`))
                    .length === 0 ? (
                    <p className="text-xs text-slate-500 italic text-center py-4">
                      या महिन्यात कोणतीही सुट्टी घोषित केलेली नाही.
                    </p>
                  ) : (
                    Object.entries(holidaysMap)
                      .filter(([dKey, val]) => val.isHoliday && dKey.startsWith(`${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, "0")}`))
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([dKey, val]) => (
                        <div
                          key={dKey}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs"
                        >
                          <div>
                            <span className="font-bold text-amber-300 block">
                              📅 {dKey}
                            </span>
                            <span className="text-slate-300 text-[11px]">
                              कारण: {val.reason || "शाळेस सुट्टी"}
                            </span>
                          </div>

                          <button
                            onClick={() => handleRemoveHoliday(dKey)}
                            disabled={isSavingHoliday}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/30 font-bold transition-all text-[11px]"
                          >
                            <Trash2 className="size-3.5" />
                            रद्द करा
                          </button>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
