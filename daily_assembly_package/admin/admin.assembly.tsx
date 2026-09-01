import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  ChevronLeft,
  Plus,
  Trash2,
  Download,
  Eye,
  FileText,
  Loader2,
  Book,
  Edit3,
  Save,
  MessageSquare,
  Newspaper,
  Sparkles,
  Globe,
} from "lucide-react";
import { collection, addDoc, getDocs, deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_FORM_DATA, DEFAULT_ASSEMBLY_ITEMS } from "@/lib/assemblyTranslations";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { showToast as toast } from "@/lib/custom-toast";
import { uploadFileWithProgress } from "@/lib/upload";

export const Route = createFileRoute("/admin/assembly")({
  head: () => ({ meta: [{ title: "Daily Assembly Book Uploader — Super Admin" }] }),
  component: AssemblyBookAdmin,
});

interface AssemblyBookFile {
  id: string;
  name: string;
  size: string;
  type: string;
  date: string;
  url?: string;
  chunks?: string[];
}

function AssemblyBookAdmin() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<AssemblyBookFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<"pdf" | "paripath">("paripath");
  
  const getLocalDateString = (d = new Date()): string => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateString());
  const [adminLang, setAdminLang] = useState<"mr" | "en" | "hi">("mr");
  const [anthemLang, setAnthemLang] = useState<"mr" | "en" | "hi">("mr");
  const [pledgeLang, setPledgeLang] = useState<"mr" | "en" | "hi">("mr");
  const [preambleLang, setPreambleLang] = useState<"mr" | "en" | "hi">("mr");
  const [paripathData, setParipathData] = useState<any>(DEFAULT_FORM_DATA.mr);
  const [savingParipath, setSavingParipath] = useState(false);
  const [isSavedForDate, setIsSavedForDate] = useState(false);

  useEffect(() => {
    const isAdmin = sessionStorage.getItem("is_super_admin");
    if (!isAdmin) {
      navigate({
        to: "/login",
        search: { redirect: "/admin/assembly", role: "admin" } as any,
      });
      return;
    }

    fetchBooks();
  }, [navigate]);

  useEffect(() => {
    fetchParipath(selectedDate);
  }, [selectedDate]);

  const MARATHI_DAYS_LIST = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
  const MARATHI_MONTHS_LIST = ["जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून", "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"];

  const toDevanagariDigits = (str: string | number): string => {
    const devanagariDigits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
    return String(str).replace(/[0-9]/g, (w) => devanagariDigits[parseInt(w, 10)]);
  };

  const getParipathDefaultsForDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);

    const dayName = MARATHI_DAYS_LIST[dateObj.getDay()];
    const monthName = MARATHI_MONTHS_LIST[dateObj.getMonth()];
    const formattedDayNum = String(d).padStart(2, "0");
    const dateMonthStr = `${toDevanagariDigits(formattedDayNum)} ${monthName}`;

    const startOfYear = new Date(y, 0, 1);
    const diff = dateObj.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay) + 1;
    const yearDayStr = toDevanagariDigits(dayOfYear);

    return {
      ...DEFAULT_FORM_DATA.mr,
      nationalAnthem: DEFAULT_ASSEMBLY_ITEMS.mr[0].content,
      stateAnthem: DEFAULT_ASSEMBLY_ITEMS.mr[1].content,
      pledge: DEFAULT_ASSEMBLY_ITEMS.mr[2].content,
      preamble: DEFAULT_ASSEMBLY_ITEMS.mr[3].content,
      silentPasayadan: DEFAULT_ASSEMBLY_ITEMS.mr[5].content,
      day: dayName,
      dateMonth: dateMonthStr,
      yearDay: yearDayStr,
      events: "",
      birthdays: "",
      deaths: "",
      thought: "",
      shlok: "",
      panchang: "",
      proverb: "",
      proverbMeaning: "",
      storyTitle: "",
      story: "",
      moral: "",
      songTitle: "",
      patrioticSong: "",
      personalityTitle: "",
      personality: "",
      silentPasayadanTitle: "",
      valueNews: "",
    };
  };

  const fetchParipath = async (dateStr: string) => {
    try {
      const docRef = doc(db, "daily_paripath_archive", dateStr);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setParipathData(docSnap.data());
        setIsSavedForDate(true);
      } else {
        const todayStr = getLocalDateString();
        if (dateStr === todayStr) {
          const currentRef = doc(db, "admin_daily_paripath", "current");
          const currentSnap = await getDoc(currentRef);
          if (currentSnap.exists()) {
            const cData = currentSnap.data();
            if (cData.archivedDate === dateStr || cData.date === dateStr) {
              setParipathData(cData);
              setIsSavedForDate(true);
              return;
            }
          }
        }
        setParipathData(getParipathDefaultsForDate(dateStr));
        setIsSavedForDate(false);
      }
    } catch (err) {
      console.error("Error fetching paripath:", err);
      toast.error("Failed to load Paripath for this date.");
    }
  };

  const generateParipathPdfBlob = async (data: any, dateStr: string) => {
    const html2pdfModule = await import("html2pdf.js");
    let html2pdfFn: any = html2pdfModule.default || html2pdfModule;
    if (html2pdfFn && html2pdfFn.default) html2pdfFn = html2pdfFn.default;
  
    // Helper for safe text with newlines
    const nl2br = (text: string) => (text || "").replace(/\n/g, "<br/>");

    // Get assembly items for default content
    const assemblyItems = DEFAULT_ASSEMBLY_ITEMS[adminLang] || DEFAULT_ASSEMBLY_ITEMS.mr;

    const tempDiv = document.createElement("div");
    tempDiv.id = "temp-pdf-render";
    tempDiv.style.width = "718px";
    tempDiv.style.padding = "24px 32px";
    tempDiv.style.background = "#FFFFFF";
    tempDiv.style.color = "#1F2937";
    tempDiv.style.fontFamily = "'Noto Sans Devanagari', 'Mukta', system-ui, sans-serif";
    tempDiv.style.boxSizing = "border-box";
  
    // Shared styles
    const sectionBox = (bg: string, border: string) => `background: ${bg}; border: 1.5px solid ${border}; border-radius: 14px; padding: 16px 22px; margin-bottom: 14px; box-sizing: border-box;`;
    const sectionTitle = (color: string) => `font-size: 15px; font-weight: 800; color: ${color}; margin: 0 0 8px 0; letter-spacing: 0.3px; box-sizing: border-box;`;
    const bodyText = `font-size: 12.5px; font-weight: 600; line-height: 1.65; color: #1F2937; margin: 0; white-space: pre-line; word-break: break-word; overflow-wrap: break-word; box-sizing: border-box; padding: 0 10px;`;
    const divider = `<div style="width: 100%; height: 1.5px; background: linear-gradient(90deg, transparent, #CBD5E1, transparent); margin: 10px 0;"></div>`;

    const formatDateToDDMMYYYY = (dStr: string) => {
      if (!dStr) return "";
      const parts = dStr.split(/[-/]/);
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2].padStart(2, "0")}-${parts[1].padStart(2, "0")}-${parts[0]}`;
      }
      return dStr;
    };

    const formattedDate = formatDateToDDMMYYYY(dateStr);

    // Page header helper
    const pageHeader = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2.5px solid #166534; padding-bottom: 6px; margin-bottom: 14px;">
        <div style="font-size: 12px; font-weight: 800; color: #166534;">📖 दैनिक परिपाठ</div>
        <div style="font-size: 12px; font-weight: 800; color: #166534;">दिनांक: ${formattedDate}</div>
      </div>
    `;

    // --- PAGE 1: राष्ट्रगीत, राज्यगीत, प्रतिज्ञा ---
    const nationalAnthem = data.nationalAnthem || data[`nationalAnthem_${adminLang}`] || assemblyItems[0]?.content || "";
    const stateAnthem = data.stateAnthem || data[`stateAnthem_${adminLang}`] || assemblyItems[1]?.content || "";
    const pledge = data.pledge || data[`pledge_${adminLang}`] || assemblyItems[2]?.content || "";

    const page1 = `
      <div style="page-break-after: always;">
        ${pageHeader}
        <div style="${sectionBox('#FFFBEB', '#FDE68A')}">
          <h2 style="${sectionTitle('#92400E')}">🇮🇳 ${assemblyItems[0]?.label || 'राष्ट्रगीत'}</h2>
          <div style="${bodyText} text-align: center;">${nl2br(nationalAnthem)}</div>
        </div>
        <div style="${sectionBox('#F0FDF4', '#BBF7D0')}">
          <h2 style="${sectionTitle('#166534')}">🚩 ${assemblyItems[1]?.label || 'राज्यगीत'}</h2>
          <div style="${bodyText} text-align: center;">${nl2br(stateAnthem)}</div>
        </div>
        <div style="${sectionBox('#EFF6FF', '#BFDBFE')}">
          <h2 style="${sectionTitle('#1E40AF')}">🇮🇳 ${assemblyItems[2]?.label || 'प्रतिज्ञा'}</h2>
          <div style="${bodyText} text-align: center;">${nl2br(pledge)}</div>
        </div>
      </div>
    `;

    // --- PAGE 2: संविधान उद्देशिका, प्रार्थना, मौन पसायदान ---
    const preamble = data.preamble || data[`preamble_${adminLang}`] || assemblyItems[3]?.content || "";
    const prayer = data.prayer || data[`prayer_${adminLang}`] || assemblyItems[4]?.content || "";
    const silentPasayadan = data.silentPasayadan || assemblyItems[5]?.content || "";

    const page2 = `
      <div style="page-break-after: always;">
        ${pageHeader}
        <div style="${sectionBox('#FFF7ED', '#FED7AA')}">
          <h2 style="${sectionTitle('#C2410C')}">📜 ${assemblyItems[3]?.label || 'संविधान उद्देशिका'}</h2>
          <div style="${bodyText} text-align: center;">${nl2br(preamble)}</div>
        </div>
        <div style="${sectionBox('#F0FDF4', '#BBF7D0')}">
          <h2 style="${sectionTitle('#166534')}">🙏🏻 ${assemblyItems[4]?.label || 'प्रार्थना'}</h2>
          <div style="${bodyText} text-align: center;">${nl2br(prayer)}</div>
        </div>
        ${silentPasayadan ? `
        <div style="${sectionBox('#FFFBEB', '#FDE68A')}">
          <h2 style="${sectionTitle('#92400E')}">✨ ${assemblyItems[5]?.label || 'पसायदान'}</h2>
          <div style="${bodyText} text-align: center;">${nl2br(silentPasayadan)}</div>
        </div>
        ` : ''}
      </div>
    `;

    // --- PAGE 3: पंचांग, सुविचार, श्लोक, म्हण ---
    const panchangTextStr = data.panchang
      ? typeof data.panchang === "string"
        ? data.panchang
        : Object.values(data.panchang).filter(Boolean).join(" ")
      : "";
    const hasGridPanchang = !!(data.month || data.tithi || data.nakshatra || data.paksha);

    const panchang = (panchangTextStr || hasGridPanchang) ? `
      <div style="${sectionBox('#FFF7ED', '#FFEDD5')}">
        <h2 style="${sectionTitle('#C2410C')}">🗓️ आजचे पंचांग</h2>
        ${panchangTextStr ? `<div style="${bodyText} text-align: center; font-size: 13px; font-weight: 700; margin-bottom: 6px;">${nl2br(panchangTextStr)}</div>` : ''}
        ${hasGridPanchang ? `
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px;">
          ${data.day ? `<div style="background: #FEF3C7; border-radius: 8px; padding: 8px; text-align: center;"><div style="font-size: 9px; font-weight: 700; color: #92400E; text-transform: uppercase;">वार</div><div style="font-size: 12px; font-weight: 800; color: #1F2937;">${data.day}</div></div>` : ''}
          ${data.month ? `<div style="background: #FEF3C7; border-radius: 8px; padding: 8px; text-align: center;"><div style="font-size: 9px; font-weight: 700; color: #92400E; text-transform: uppercase;">मास</div><div style="font-size: 12px; font-weight: 800; color: #1F2937;">${data.month}</div></div>` : ''}
          ${data.paksha ? `<div style="background: #FEF3C7; border-radius: 8px; padding: 8px; text-align: center;"><div style="font-size: 9px; font-weight: 700; color: #92400E; text-transform: uppercase;">पक्ष</div><div style="font-size: 12px; font-weight: 800; color: #1F2937;">${data.paksha}</div></div>` : ''}
          ${data.tithi ? `<div style="background: #FEF3C7; border-radius: 8px; padding: 8px; text-align: center;"><div style="font-size: 9px; font-weight: 700; color: #92400E; text-transform: uppercase;">तिथी</div><div style="font-size: 12px; font-weight: 800; color: #1F2937;">${data.tithi}</div></div>` : ''}
          ${data.nakshatra ? `<div style="background: #FEF3C7; border-radius: 8px; padding: 8px; text-align: center;"><div style="font-size: 9px; font-weight: 700; color: #92400E; text-transform: uppercase;">नक्षत्र</div><div style="font-size: 12px; font-weight: 800; color: #1F2937;">${data.nakshatra}</div></div>` : ''}
          ${data.yog ? `<div style="background: #FEF3C7; border-radius: 8px; padding: 8px; text-align: center;"><div style="font-size: 9px; font-weight: 700; color: #92400E; text-transform: uppercase;">योग</div><div style="font-size: 12px; font-weight: 800; color: #1F2937;">${data.yog}</div></div>` : ''}
          ${data.sunrise ? `<div style="background: #FEF3C7; border-radius: 8px; padding: 8px; text-align: center;"><div style="font-size: 9px; font-weight: 700; color: #92400E; text-transform: uppercase;">सूर्योदय</div><div style="font-size: 12px; font-weight: 800; color: #1F2937;">${data.sunrise}</div></div>` : ''}
          ${data.sunset ? `<div style="background: #FEF3C7; border-radius: 8px; padding: 8px; text-align: center;"><div style="font-size: 9px; font-weight: 700; color: #92400E; text-transform: uppercase;">सूर्यास्त</div><div style="font-size: 12px; font-weight: 800; color: #1F2937;">${data.sunset}</div></div>` : ''}
        </div>
        ` : ''}
      </div>
    ` : '';

    const page3 = `
      <div style="page-break-after: always;">
        ${pageHeader}
        ${panchang}
        <div style="${sectionBox('#F5F3FF', '#EDE9FE')}">
          <h2 style="${sectionTitle('#5B21B6')}">💭 आजचा सुविचार</h2>
          <div style="${bodyText} text-align: center; font-size: 14px; font-style: italic;">"${data.thought || "-"}"</div>
        </div>
        ${data.shlok ? `
        <div style="${sectionBox('#FFF5F5', '#FECACA')}">
          <h2 style="${sectionTitle('#991B1B')}">🕉️ आजचा श्लोक</h2>
          <div style="${bodyText} text-align: center;">${nl2br(data.shlok)}</div>
        </div>
        ` : ''}
        <div style="${sectionBox('#FDF2F8', '#FCE7F3')}">
          <h2 style="${sectionTitle('#9D174D')}">📖 आजची म्हण</h2>
          <div style="${bodyText} text-align: center; font-size: 14px; font-weight: 700;">"${data.proverb || "-"}"</div>
          ${data.proverbMeaning ? `<div style="font-size: 11.5px; color: #6B7280; margin-top: 6px; text-align: center; font-weight: 600;">अर्थ: ${data.proverbMeaning}</div>` : ''}
        </div>
      </div>
    `;

    // --- PAGE 4: दिनविशेष, सुसंस्कारक्षम बातम्या ---
    const eventsContent = data.events || data.dinvishesh || "";
    const newsContent = data.valueNews || data.batmya || data.news || "";

    const page4 = `
      <div style="page-break-after: always;">
        ${pageHeader}
        ${eventsContent ? `
        <div style="${sectionBox('#EFF6FF', '#BFDBFE')}">
          <h2 style="${sectionTitle('#1E40AF')}">📅 ${data.dateMonth ? data.dateMonth + ' ' : ''}दिनविशेष</h2>
          ${data.yearDay ? `<div style="font-size: 11px; font-weight: 700; color: #3B82F6; margin-bottom: 8px; text-align: center; background: #DBEAFE; border-radius: 20px; padding: 4px 12px; display: inline-block;">हा वर्षातील ${data.yearDay} वा दिवस आहे.</div>` : ''}
          <div style="${bodyText}">${nl2br(eventsContent)}</div>
        </div>
        ` : ''}
        ${newsContent ? `
        <div style="${sectionBox('#ECFDF5', '#A7F3D0')}">
          <h2 style="${sectionTitle('#065F46')}">📰 सुसंस्कारक्षम बातम्या</h2>
          <div style="${bodyText}">${nl2br(newsContent)}</div>
        </div>
        ` : ''}
      </div>
    `;

    // --- PAGE 5: देशभक्ती गीत, बोधकथा ---
    const page5 = `
      <div style="page-break-after: always;">
        ${pageHeader}
        ${data.patrioticSong ? `
        <div style="${sectionBox('#EEF2FF', '#C7D2FE')}">
          <h2 style="${sectionTitle('#3730A3')}">🎵 देशभक्ती गीत${data.songTitle ? ': ' + data.songTitle : ''}</h2>
          <div style="${bodyText} text-align: center;">${nl2br(data.patrioticSong)}</div>
        </div>
        ` : ''}
        ${data.story ? `
        <div style="${sectionBox('#FFF7ED', '#FFEDD5')}">
          <h2 style="${sectionTitle('#C2410C')}">📖 बोधकथा${data.storyTitle ? ': ' + data.storyTitle : ''}</h2>
          <div style="${bodyText}">${nl2br(data.story)}</div>
          ${data.moral ? `
          ${divider}
          <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 10px 14px; border-radius: 0 8px 8px 0; margin-top: 8px;">
            <span style="font-size: 11px; font-weight: 800; color: #92400E;">⭐ तात्पर्य: </span>
            <span style="font-size: 12px; font-weight: 700; color: #1F2937;">${data.moral}</span>
          </div>
          ` : ''}
        </div>
        ` : ''}
      </div>
    `;

    // --- PAGE 6: सामान्य ज्ञान, थोरव्यक्ती ---
    const gkHtml = [1, 2, 3, 4].map(num => data[`gkQ${num}`] ? `
      <div style="background: #F5F3FF; border: 1px solid #EDE9FE; border-radius: 10px; padding: 10px 14px; margin-bottom: 8px;">
        <div style="font-size: 12px; font-weight: 800; color: #5B21B6;">प्रश्न ${num}: ${data[`gkQ${num}`]}</div>
        <div style="font-size: 12px; font-weight: 700; color: #166534; margin-top: 4px;">उत्तर: ${data[`gkA${num}`] || "-"}</div>
      </div>
    ` : '').join('');

    const page6 = `
      <div>
        ${pageHeader}
        ${gkHtml ? `
        <div style="${sectionBox('#FAF5FF', '#F3E8FF')}">
          <h2 style="${sectionTitle('#6B21A8')}">🧠 सामान्य ज्ञान (G.K.)</h2>
          ${gkHtml}
        </div>
        ` : ''}
        ${data.personalityTitle || data.personality ? `
        <div style="${sectionBox('#F0FDFA', '#CCFBF1')}">
          <h2 style="${sectionTitle('#115E59')}">👤 थोरव्यक्ती परिचय${data.personalityTitle ? ': ' + data.personalityTitle : ''}</h2>
          <div style="${bodyText}">${nl2br(data.personality || "-")}</div>
        </div>
        ` : ''}
        ${divider}
        <div style="text-align: center; padding: 12px 0 4px; font-size: 10px; font-weight: 700; color: #9CA3AF;">
          निर्मिती: ${data.creator || "Smart Learning With AI"} | © दैनिक परिपाठ ${new Date().getFullYear()}
        </div>
      </div>
    `;

    const styleBlock = `<style>#temp-pdf-render, #temp-pdf-render * { box-sizing: border-box !important; word-break: break-word; overflow-wrap: break-word; }</style>`;
    tempDiv.innerHTML = styleBlock + page1 + page2 + page3 + page4 + page5 + page6;
  
    document.body.appendChild(tempDiv);
  
    const opt = {
      margin: [8, 10, 8, 10],
      filename: `Paripath_${dateStr}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, windowWidth: 718 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };
  
    try {
      const blob = await html2pdfFn().set(opt).from(tempDiv).outputPdf("blob");
      document.body.removeChild(tempDiv);
      return blob;
    } catch (err) {
      if (tempDiv.parentNode) document.body.removeChild(tempDiv);
      throw err;
    }
  };

  const handleSaveParipath = async () => {
    setSavingParipath(true);
    try {
      // 1. Generate PDF Blob from form content
      toast.success("Generating Daily Paripath PDF... 📄");
      const pdfBlob = await generateParipathPdfBlob(paripathData, selectedDate);
      const pdfFile = new File([pdfBlob], `paripath_${selectedDate}.pdf`, { type: "application/pdf" });

      // 2. Upload generated PDF directly to Bunny Storage
      let bunnyPdfUrl = "";
      try {
        const { url } = await uploadFileWithProgress(pdfFile, {
          folderPath: "documents",
          maxSizeBytes: 50 * 1024 * 1024,
        });
        bunnyPdfUrl = url;
      } catch (err: any) {
        console.warn("Bunny upload failed, saving text only.", err);
      }

      // 3. Save as "current" for live display if it is today
      const todayStr = getLocalDateString();
      const payload = {
        ...paripathData,
        bunnyPdfUrl,
        lastUpdated: new Date().toISOString(),
      };

      if (selectedDate === todayStr) {
        await setDoc(doc(db, "admin_daily_paripath", "current"), payload);
      }
      
      // 4. Archive under selected date
      await setDoc(doc(db, "daily_paripath_archive", selectedDate), {
        ...payload,
        archivedDate: selectedDate,
      });

      setIsSavedForDate(true);
      
      toast.success("Paripath data and PDF saved successfully! 🎉");
    } catch (err: any) {
      console.error("Error saving paripath:", err);
      toast.error(err?.message || "Failed to save Paripath.");
    } finally {
      setSavingParipath(false);
    }
  };

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const q = collection(db, "admin_assembly_books");
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AssemblyBookFile[];
      setBooks(list);
    } catch (err) {
      console.error("Error fetching assembly books:", err);
      toast.error("Failed to load assembly books.");
    } finally {
      setLoading(false);
    }
  };

  const chunkString = (str: string, size: number) => {
    const chunks = [];
    for (let i = 0; i < str.length; i += size) {
      chunks.push(str.slice(i, i + size));
    }
    return chunks;
  };

  const processSelectedFile = async (file: File) => {
    if (!file) return;

    if (file.size > 1024 * 1024 * 10) {
      toast.error(`File is too large (${formatSize(file.size)}). Maximum allowed size is 10MB.`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formattedDate = new Date().toLocaleDateString("en-IN");

      const { url: fileUrl } = await uploadFileWithProgress(file, {
        folderPath: "documents",
        maxSizeBytes: 10 * 1024 * 1024,
        onProgress: (percent) => setUploadProgress(percent),
      });

      const newBook: any = {
        name: file.name,
        size: formatSize(file.size),
        type: file.type || "application/pdf",
        date: formattedDate,
        url: fileUrl,
      };

      const docRef = await addDoc(
        collection(db, "admin_assembly_books"),
        newBook,
      );

      setBooks((prev) => [
        ...prev,
        { id: docRef.id, ...newBook } as AssemblyBookFile,
      ]);

      toast.success(`"${file.name}" uploaded successfully! 🎉`);
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err?.message || "Failed to upload file.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processSelectedFile(file);
    e.target.value = "";
  };

  const handleDelete = async (book: AssemblyBookFile) => {
    if (!confirm(`Are you sure you want to delete "${book.name}"?`)) return;

    try {
      if (book.chunks) {
        for (const chunkId of book.chunks) {
          await deleteDoc(doc(db, "admin_assembly_chunks", chunkId)).catch(() => {});
        }
      }

      // Delete from Bunny Storage if it exists
      if (book.url && book.url.includes("b-cdn.net")) {
        const storageApiKey = import.meta.env.VITE_BUNNY_STORAGE_API_KEY;
        const storageZone = import.meta.env.VITE_BUNNY_STORAGE_ZONE;
        if (storageApiKey && storageZone) {
          const urlParts = book.url.split("/");
          const fileName = urlParts[urlParts.length - 1];
          await fetch(`/api/bunny-storage/${storageZone}/documents/${fileName}`, {
            method: "DELETE",
            headers: {
              "AccessKey": storageApiKey
            }
          }).catch((e) => console.error("Failed to delete from Bunny Storage:", e));
        }
      }

      await deleteDoc(doc(db, "admin_assembly_books", book.id));
      setBooks((prev) => prev.filter((d) => d.id !== book.id));
      toast.success("Assembly book deleted successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete assembly book.");
    }
  };

  const handleView = async (book: AssemblyBookFile) => {
    if (book.url) {
      window.open(book.url);
      return;
    }
    if (book.chunks) {
      toast.success("Loading preview, please wait...");
      try {
        let fullBase64 = "";
        for (const chunkId of book.chunks) {
          const chunkDoc = await getDoc(doc(db, "admin_assembly_chunks", chunkId));
          if (chunkDoc.exists()) fullBase64 += chunkDoc.data().data;
        }
        const newWin = window.open();
        if (newWin) {
          if (book.type.includes("pdf")) {
            newWin.document.write(`<iframe src="${fullBase64}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
          } else {
            newWin.document.write(`<img src="${fullBase64}" style="max-width:100%; margin:auto; display:block;" />`);
          }
        }
      } catch (err) {
        console.error("View error:", err);
        toast.error("Failed to load file preview.");
      }
    }
  };

  const handleDownload = async (book: AssemblyBookFile) => {
    if (book.url) {
      const a = document.createElement("a");
      a.href = book.url;
      a.download = book.name;
      a.click();
      return;
    }
    if (book.chunks) {
      toast.success("Preparing download, please wait...");
      try {
        let fullBase64 = "";
        for (const chunkId of book.chunks) {
          const chunkDoc = await getDoc(doc(db, "admin_assembly_chunks", chunkId));
          if (chunkDoc.exists()) fullBase64 += chunkDoc.data().data;
        }
        const a = document.createElement("a");
        a.href = fullBase64;
        a.download = book.name;
        a.click();
      } catch (err) {
        console.error("Download error:", err);
        toast.error("Failed to prepare download.");
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-[#F8FAFF] text-[#111827] font-sans antialiased">
      <Header />
      <main className="max-w-[1440px] mx-auto px-8 pt-16 pb-24">
        <div className="mb-12 space-y-6">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-sm font-black text-[#6B7280] hover:text-[#6C63FF] uppercase tracking-widest transition-colors"
          >
            <ChevronLeft className="size-4" /> Back to Hub
          </Link>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-2">
              <h1 className="text-5xl font-black tracking-tight">
                Daily Assembly Book <span className="text-[#6C63FF]">Uploader.</span>
              </h1>
              <p className="text-[#6B7280] max-w-xl text-lg font-medium leading-relaxed">
                Manage the daily structure (Paripath) and upload reference guidebooks.
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 w-fit flex-wrap gap-1">
            <button
              onClick={() => setActiveTab("paripath")}
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
                activeTab === "paripath"
                  ? "bg-[#6C63FF] text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Edit3 className="size-4" /> Edit Today's Paripath
            </button>
            <button
              onClick={() => setActiveTab("pdf")}
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
                activeTab === "pdf"
                  ? "bg-[#6C63FF] text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <FileText className="size-4" /> PDF Guidebooks
            </button>
          </div>
        </div>

        {activeTab === "pdf" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Upload Card */}
          <div className="bg-white border border-black/5 rounded-[3rem] p-8 shadow-sm space-y-6">
            <h3 className="text-xl font-black tracking-tight text-stone-900">
              Upload PDF Book
            </h3>
            
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) processSelectedFile(file);
                }}
                className={`relative group border-2 border-dashed rounded-[2rem] p-8 text-center transition-all cursor-pointer overflow-hidden ${
                  isDragging
                    ? "border-[#6C63FF] bg-violet-500/10 scale-[1.02]"
                    : "border-slate-200 hover:border-[#6C63FF]/50 bg-slate-50/50 hover:bg-white"
                }`}
              >
                <input
                  type="file"
                  onChange={handleFileUpload}
                  accept=".pdf,image/*,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  disabled={uploading}
                />
                {uploading ? (
                  <div className="space-y-4 py-4">
                    <Loader2 className="size-10 text-[#6C63FF] animate-spin mx-auto" />
                    <div className="text-xs font-black uppercase tracking-widest text-[#6C63FF] animate-pulse">
                      Uploading book... {uploadProgress}%
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden max-w-xs mx-auto">
                      <div
                        className="bg-[#6C63FF] h-full transition-all duration-300 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="size-12 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-[#6C63FF] mx-auto shadow-sm transition-transform duration-500 group-hover:scale-110">
                      <Plus className="size-6" />
                    </div>
                    <div className="text-xs font-bold text-slate-700">
                      {isDragging ? "Drop book to upload" : "Click to choose or drag book file"}
                    </div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      PDF, Word or Images up to 10MB
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* List of Files Card */}
          <div className="lg:col-span-2 bg-white border border-black/5 rounded-[3rem] p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-xl font-black tracking-tight text-stone-900 flex items-center gap-2">
                <Book className="size-5 text-[#6C63FF]" /> Uploaded Assembly Books
              </h3>
              <span className="px-3.5 py-1 bg-blue-100 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                {books.length} Books
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
                <Loader2 className="size-8 animate-spin text-[#6C63FF]" />
                <span className="text-xs font-black uppercase tracking-widest">Loading books...</span>
              </div>
            ) : books.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-slate-100 rounded-[2rem] text-slate-400 space-y-3">
                <Book className="size-10 mx-auto text-slate-300" />
                <p className="text-xs font-black uppercase tracking-widest">No books uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {books.map((book) => (
                    <motion.div
                      key={book.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-5 border border-slate-100 rounded-2xl flex items-center justify-between gap-4 hover:border-slate-200 transition-all bg-slate-50/20 group"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="size-11 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-[#6C63FF] shadow-sm transition-colors">
                          <FileText className="size-5.5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-slate-800 truncate max-w-[200px] md:max-w-md">
                            {book.name}
                          </h4>
                          <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                            <span>{book.size}</span>
                            <span>•</span>
                            <span>{book.date}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(book)}
                          className="size-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all cursor-pointer shadow-sm"
                          title="View"
                        >
                          <Eye className="size-4.5" />
                        </button>
                        <button
                          onClick={() => handleDownload(book)}
                          className="size-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all cursor-pointer shadow-sm"
                          title="Download"
                        >
                          <Download className="size-4.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(book)}
                          className="size-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-red-600 hover:border-red-200 transition-all cursor-pointer shadow-sm"
                          title="Delete"
                        >
                          <Trash2 className="size-4.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
        ) : (
          /* Paripath Form Editor */
          <div className="bg-white border border-black/5 rounded-[3rem] p-8 md:p-12 shadow-sm space-y-8">
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 border-b border-stone-100 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-stone-900 flex items-center gap-3">
                    <MessageSquare className="size-6 text-[#6C63FF]" /> Daily Paripath Data
                  </h3>
                  <p className="text-slate-500 mt-2">Edit the structured text below. It will automatically update in the teacher's Daily Assembly module.</p>
                </div>
                <div 
                  className="relative flex items-center gap-3 bg-indigo-50/90 hover:bg-indigo-100/90 px-4 py-2.5 rounded-2xl border border-indigo-200 shadow-sm transition-all cursor-pointer group"
                  onClick={(e) => {
                    const input = e.currentTarget.querySelector('input[type="date"]') as HTMLInputElement;
                    if (input && typeof input.showPicker === 'function') {
                      try { input.showPicker(); } catch (err) {}
                    }
                  }}
                  title="तारीख बदला (Change Date)"
                >
                  <Calendar className="size-5 text-[#6C63FF] group-hover:scale-110 transition-transform shrink-0" />
                  <span className="text-sm font-black text-slate-900 tracking-wide font-mono">
                    {(() => {
                      if (!selectedDate) return "";
                      const parts = selectedDate.split("-");
                      return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : selectedDate;
                    })()}
                  </span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                  />
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider relative z-20 pointer-events-none ${
                    isSavedForDate
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-amber-100 text-amber-800 border border-amber-300"
                  }`}>
                    {isSavedForDate ? "✓ डेटा सेव्ह आहे" : "✨ नवीन तारीख एंट्री"}
                  </span>
                </div>
              </div>
              <button
                onClick={handleSaveParipath}
                disabled={savingParipath}
                className="px-8 py-4 bg-[#6C63FF] text-white text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-600 transition-all shadow-xl hover:shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50 xl:self-center w-full xl:w-auto justify-center"
              >
                {savingParipath ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
                Save Paripath
              </button>
            </div>

            <div className="flex flex-col space-y-12 max-w-4xl mx-auto w-full">
              {/* Assembly Start Section */}
              <div className="space-y-8 p-8 md:p-12 bg-gradient-to-br from-green-50/80 to-emerald-100/50 border border-green-200/60 rounded-[3rem] shadow-[0_8px_30px_rgb(34,197,94,0.12)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-300/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-300/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>
                
                <div className="flex justify-center relative z-10">
                  <h4 className="text-xl md:text-2xl font-black text-green-800 inline-flex items-center justify-center gap-3 px-8 py-4 bg-white/80 backdrop-blur-md rounded-full shadow-sm border border-green-100/50 uppercase tracking-widest">
                    🇮🇳 सुरुवातीचा परिपाठ (Assembly Start)
                  </h4>
                </div>
                
                <div className="flex flex-col space-y-8 max-w-3xl mx-auto relative">
                  {/* National Anthem - Single field */}
                  {/* ─── National Anthem (राष्ट्रगीत) with 3-language tabs ─── */}
                  <div className="bg-white/90 backdrop-blur-sm p-6 md:p-8 rounded-[2.5rem] border border-green-100 shadow-xl shadow-green-900/5 hover:shadow-2xl hover:shadow-green-900/10 transition-all duration-300 text-center">
                    <label className="inline-block px-4 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-black uppercase tracking-widest mb-4 border border-green-100">
                      🇮🇳 राष्ट्रगीत (National Anthem)
                    </label>
                    <div className="flex justify-center mb-4">
                      <div className="flex bg-green-50 p-1 rounded-xl border border-green-100 shadow-sm">
                        {(["mr", "en", "hi"] as const).map((lk) => (
                          <button
                            key={lk}
                            type="button"
                            onClick={() => setAnthemLang(lk)}
                            className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all duration-200 ${
                              anthemLang === lk
                                ? "bg-green-600 text-white shadow-sm"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            {lk === "mr" ? "मराठी" : lk === "en" ? "English" : "हिंदी"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      rows={12}
                      value={
                        paripathData[`nationalAnthem_${anthemLang}`] !== undefined
                          ? paripathData[`nationalAnthem_${anthemLang}`]
                          : (anthemLang === 'mr' ? paripathData.nationalAnthem : undefined) || DEFAULT_ASSEMBLY_ITEMS[anthemLang]?.[0]?.content || ""
                      }
                      onChange={(e) => setParipathData({ ...paripathData, [`nationalAnthem_${anthemLang}`]: e.target.value, nationalAnthem: anthemLang === 'mr' ? e.target.value : paripathData.nationalAnthem })}
                      className="w-full px-6 py-5 bg-green-50/30 border border-green-100 hover:border-green-300 focus:bg-white rounded-2xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all resize-none text-center font-bold text-slate-800 leading-relaxed"
                    />
                  </div>

                  {/* ─── State Anthem (राज्यगीत) ─── */}
                  <div className="bg-white/90 backdrop-blur-sm p-6 md:p-8 rounded-[2.5rem] border border-green-100 shadow-xl shadow-green-900/5 hover:shadow-2xl hover:shadow-green-900/10 transition-all duration-300 text-center">
                    <label className="inline-block px-4 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-black uppercase tracking-widest mb-4 border border-green-100">
                      🚩 राज्यगीत (State Anthem)
                    </label>
                    <textarea
                      rows={14}
                      value={paripathData.stateAnthem || DEFAULT_ASSEMBLY_ITEMS.mr[1].content}
                      onChange={(e) => setParipathData({ ...paripathData, stateAnthem: e.target.value })}
                      className="w-full px-6 py-5 bg-green-50/30 border border-green-100 hover:border-green-300 focus:bg-white rounded-2xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all resize-none text-center font-bold text-slate-800 leading-relaxed"
                    />
                  </div>

                  {/* ─── Pledge (प्रतिज्ञा) with 3-language tabs ─── */}
                  <div className="bg-white/90 backdrop-blur-sm p-6 md:p-8 rounded-[2.5rem] border border-green-100 shadow-xl shadow-green-900/5 hover:shadow-2xl hover:shadow-green-900/10 transition-all duration-300 text-center">
                    <label className="inline-block px-4 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-black uppercase tracking-widest mb-4 border border-green-100">
                      🇮🇳 प्रतिज्ञा (Pledge)
                    </label>
                    {/* Language tabs for Pledge */}
                    <div className="flex justify-center mb-4">
                      <div className="flex bg-green-50 p-1 rounded-xl border border-green-100 shadow-sm">
                        {(["mr", "en", "hi"] as const).map((lk) => (
                          <button
                            key={lk}
                            type="button"
                            onClick={() => setPledgeLang(lk)}
                            className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all duration-200 ${
                              pledgeLang === lk
                                ? "bg-green-600 text-white shadow-sm"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            {lk === "mr" ? "मराठी" : lk === "en" ? "English" : "हिंदी"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      rows={17}
                      value={
                        paripathData[`pledge_${pledgeLang}`] !== undefined
                          ? paripathData[`pledge_${pledgeLang}`]
                          : (pledgeLang === 'mr' ? paripathData.pledge : undefined) || DEFAULT_ASSEMBLY_ITEMS[pledgeLang]?.[2]?.content || ""
                      }
                      onChange={(e) => setParipathData({ ...paripathData, [`pledge_${pledgeLang}`]: e.target.value, pledge: pledgeLang === 'mr' ? e.target.value : paripathData.pledge })}
                      className="w-full px-6 py-5 bg-green-50/30 border border-green-100 hover:border-green-300 focus:bg-white rounded-2xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all resize-none text-center font-bold text-slate-800 leading-relaxed"
                    />
                  </div>

                  {/* ─── Constitution / Preamble (संविधान) with 3-language tabs ─── */}
                  <div className="bg-white/90 backdrop-blur-sm p-6 md:p-8 rounded-[2.5rem] border border-green-100 shadow-xl shadow-green-900/5 hover:shadow-2xl hover:shadow-green-900/10 transition-all duration-300 text-center">
                    <label className="inline-block px-4 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-black uppercase tracking-widest mb-4 border border-green-100">
                      🇪🇺 संविधान उद्देशिका (Preamble)
                    </label>
                    {/* Language tabs for Preamble */}
                    <div className="flex justify-center mb-4">
                      <div className="flex bg-green-50 p-1 rounded-xl border border-green-100 shadow-sm">
                        {(["mr", "en", "hi"] as const).map((lk) => (
                          <button
                            key={lk}
                            type="button"
                            onClick={() => setPreambleLang(lk)}
                            className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all duration-200 ${
                              preambleLang === lk
                                ? "bg-green-600 text-white shadow-sm"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            {lk === "mr" ? "मराठी" : lk === "en" ? "English" : "हिंदी"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      rows={6}
                      value={
                        (() => {
                          const val = paripathData[`preamble_${preambleLang}`] !== undefined
                            ? paripathData[`preamble_${preambleLang}`]
                            : (preambleLang === 'mr' ? paripathData.preamble : undefined);
                          if (preambleLang === 'mr' && (!val || val.includes("हम, भारत के लोग"))) {
                            return DEFAULT_ASSEMBLY_ITEMS.mr[3].content;
                          }
                          return val || DEFAULT_ASSEMBLY_ITEMS[preambleLang]?.[3]?.content || "";
                        })()
                      }
                      onChange={(e) => setParipathData({ ...paripathData, [`preamble_${preambleLang}`]: e.target.value, preamble: preambleLang === 'mr' ? e.target.value : paripathData.preamble })}
                      className="w-full px-6 py-5 bg-green-50/30 border border-green-100 hover:border-green-300 focus:bg-white rounded-2xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all resize-none text-center font-bold text-slate-800 leading-relaxed"
                    />
                  </div>

                  {/* Prayer - Single field */}
                  <div className="bg-white/90 backdrop-blur-sm p-6 md:p-8 rounded-[2.5rem] border border-green-100 shadow-xl shadow-green-900/5 hover:shadow-2xl hover:shadow-green-900/10 transition-all duration-300 text-center">
                    <label className="inline-block px-4 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-black uppercase tracking-widest mb-4 border border-green-100">
                      👏🏻 प्रार्थना (Prayer)
                    </label>
                    <textarea
                      rows={14}
                      value={paripathData.prayer || ''}
                      onChange={(e) => setParipathData({ ...paripathData, prayer: e.target.value })}
                      placeholder="येथे प्रार्थना प्रविष्ट करा..."
                      className="w-full px-6 py-5 bg-green-50/30 border border-green-100 hover:border-green-300 focus:bg-white rounded-2xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all resize-none text-center font-bold text-slate-800 leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* Shlok & Suvichar */}
              <div className="space-y-8 p-8 md:p-12 bg-gradient-to-br from-violet-50/80 to-fuchsia-100/50 border border-violet-200/60 rounded-[3rem] shadow-[0_8px_30px_rgb(139,92,246,0.12)] relative overflow-hidden">
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-fuchsia-300/20 rounded-full blur-3xl translate-y-1/3 translate-x-1/3"></div>
                
                {/* Shlok */}
                <div className="bg-white/90 backdrop-blur-sm p-8 md:p-10 rounded-[2.5rem] border border-amber-100 shadow-xl shadow-amber-900/5 hover:shadow-2xl hover:shadow-amber-900/10 transition-all duration-300 text-center relative">
                  <div className="flex justify-center mb-6">
                    <span className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-amber-50 text-amber-700 rounded-full text-xs font-black uppercase tracking-widest border border-amber-100">
                      🕉️ श्लोक (Shlok)
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={paripathData.shlok || ''}
                    onChange={(e) => setParipathData({ ...paripathData, shlok: e.target.value })}
                    className="w-full px-6 py-5 bg-amber-50/30 border border-amber-100 hover:border-amber-300 focus:bg-white rounded-2xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all resize-none text-center font-bold text-slate-800 text-lg md:text-xl leading-relaxed"
                    placeholder="उदा. वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ..."
                  />
                </div>

                {/* Panchang */}
                <div className="bg-white/90 backdrop-blur-sm p-8 md:p-10 rounded-[2.5rem] border border-orange-100 shadow-xl shadow-orange-900/5 hover:shadow-2xl hover:shadow-orange-900/10 transition-all duration-300 text-center relative">
                  <div className="flex justify-center mb-6">
                    <span className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-orange-50 text-orange-700 rounded-full text-xs font-black uppercase tracking-widest border border-orange-100">
                      🗓️ पंचांग (Panchang)
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={paripathData.panchang || ''}
                    onChange={(e) => setParipathData({ ...paripathData, panchang: e.target.value })}
                    className="w-full px-6 py-5 bg-orange-50/30 border border-orange-100 hover:border-orange-300 focus:bg-white rounded-2xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all resize-none text-center font-bold text-slate-800 text-lg md:text-xl leading-relaxed"
                    placeholder="उदा. शके १९४६, विक्रम संवत २०८१, तिथी, नक्षत्र..."
                  />
                </div>

                {/* Suvichar */}
                <div className="bg-white/90 backdrop-blur-sm p-8 md:p-10 rounded-[2.5rem] border border-violet-100 shadow-xl shadow-violet-900/5 hover:shadow-2xl hover:shadow-violet-900/10 transition-all duration-300 text-center relative">
                  <div className="flex justify-center mb-6">
                    <span className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-violet-50 text-violet-700 rounded-full text-xs font-black uppercase tracking-widest border border-violet-100">
                      🪀 सुविचार (Thought)
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={paripathData.thought || ''}
                    onChange={(e) => setParipathData({ ...paripathData, thought: e.target.value })}
                    className="w-full px-6 py-5 bg-violet-50/30 border border-violet-100 hover:border-violet-300 focus:bg-white rounded-2xl focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all resize-none text-center font-bold text-slate-800 text-lg md:text-xl leading-relaxed"
                  />
                </div>
              </div>

              {/* Batmya (News) */}
              <div className="space-y-8 p-8 md:p-12 bg-gradient-to-br from-emerald-50/80 to-teal-100/50 border border-emerald-200/60 rounded-[3rem] shadow-[0_8px_30px_rgb(16,185,129,0.12)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-300/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                
                <div className="bg-white/90 backdrop-blur-sm p-8 rounded-[2.5rem] border border-emerald-100 shadow-xl shadow-emerald-900/5 hover:shadow-2xl hover:shadow-emerald-900/10 transition-all duration-300 text-center relative">
                  <div className="flex justify-center mb-6">
                    <span className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-emerald-50 text-emerald-700 rounded-full text-xs font-black uppercase tracking-widest border border-emerald-100">
                      📰 सुसंस्कारक्षम बातम्या (News / Batmya)
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={paripathData.valueNews || paripathData.batmya || ''}
                    onChange={(e) => setParipathData({ ...paripathData, valueNews: e.target.value, batmya: e.target.value, news: e.target.value })}
                    className="w-full px-6 py-5 bg-emerald-50/30 border border-emerald-100 hover:border-emerald-300 focus:bg-white rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all resize-none text-center font-bold text-slate-800 leading-relaxed text-base"
                    placeholder="येथे आजच्या मुख्य बातम्या (अंतरराष्ट्रीय, राष्ट्रीय, राज्यस्तरीय, क्रीडा इ.) टाका..."
                  />
                </div>
              </div>

              {/* Dinvishesh */}
              <div className="space-y-8 p-8 md:p-12 bg-gradient-to-br from-sky-50/80 to-blue-100/50 border border-blue-200/60 rounded-[3rem] shadow-[0_8px_30px_rgb(59,130,246,0.12)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-sky-300/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                
                <div className="flex flex-col md:flex-row gap-6 relative">
                  <div className="flex-1 bg-white/90 backdrop-blur-sm p-6 rounded-[2.5rem] border border-blue-100 shadow-xl shadow-blue-900/5 text-center">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-blue-500 mb-4">Date (e.g. ०९ जुलै)</label>
                    <input
                      type="text"
                      value={paripathData.dateMonth || ''}
                      onChange={(e) => setParipathData({ ...paripathData, dateMonth: e.target.value })}
                      className="w-full px-6 py-4 bg-sky-50/30 border border-sky-100 hover:border-sky-300 focus:bg-white rounded-2xl focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all text-center font-bold text-slate-800"
                    />
                  </div>
                  <div className="flex-1 bg-white/90 backdrop-blur-sm p-6 rounded-[2.5rem] border border-blue-100 shadow-xl shadow-blue-900/5 text-center">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-blue-500 mb-4">Day Number (e.g. १९०)</label>
                    <input
                      type="text"
                      value={paripathData.yearDay || ''}
                      onChange={(e) => setParipathData({ ...paripathData, yearDay: e.target.value })}
                      className="w-full px-6 py-4 bg-sky-50/30 border border-sky-100 hover:border-sky-300 focus:bg-white rounded-2xl focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all text-center font-bold text-slate-800"
                    />
                  </div>
                </div>
                
                <div className="bg-white/90 backdrop-blur-sm p-8 rounded-[2.5rem] border border-blue-100 shadow-xl shadow-blue-900/5 hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-300 text-center relative">
                  <div className="flex justify-center mb-6">
                    <span className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-blue-50 text-blue-700 rounded-full text-xs font-black uppercase tracking-widest border border-blue-100">
                      📅 दिनविशेष (Dinvishesh)
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={paripathData.events || ''}
                    onChange={(e) => setParipathData({ ...paripathData, events: e.target.value, dinvishesh: e.target.value })}
                    className="w-full px-6 py-5 bg-blue-50/30 border border-blue-100 hover:border-blue-300 focus:bg-white rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none text-center font-bold text-slate-800 leading-relaxed text-base"
                    placeholder="येथे दिनविशेष (घटना, जन्मदिवस, पुण्यतिथी इत्यादी) टाका..."
                  />
                </div>
              </div>

              {/* Proverb */}
              <div className="space-y-8 p-8 md:p-12 bg-gradient-to-br from-fuchsia-50/80 to-pink-100/50 border border-fuchsia-200/60 rounded-[3rem] shadow-[0_8px_30px_rgb(217,70,239,0.12)] relative overflow-hidden">
                <div className="bg-white/90 backdrop-blur-sm p-8 md:p-10 rounded-[2.5rem] border border-fuchsia-100 shadow-xl shadow-fuchsia-900/5 hover:shadow-2xl hover:shadow-fuchsia-900/10 transition-all duration-300 text-center space-y-8 relative">
                  <div>
                    <div className="flex justify-center mb-6">
                      <span className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-fuchsia-50 text-fuchsia-700 rounded-full text-xs font-black uppercase tracking-widest border border-fuchsia-100">
                        🪀 म्हण (Proverb)
                      </span>
                    </div>
                    <input
                      type="text"
                      value={paripathData.proverb || ''}
                      onChange={(e) => setParipathData({ ...paripathData, proverb: e.target.value })}
                      className="w-full px-6 py-5 bg-fuchsia-50/30 border border-fuchsia-100 hover:border-fuchsia-300 focus:bg-white rounded-2xl focus:outline-none focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-500/10 transition-all text-center font-bold text-slate-800 text-lg md:text-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-fuchsia-500 mb-4">अर्थ (Meaning)</label>
                    <textarea
                      rows={2}
                      value={paripathData.proverbMeaning || ''}
                      onChange={(e) => setParipathData({ ...paripathData, proverbMeaning: e.target.value })}
                      className="w-full px-6 py-5 bg-fuchsia-50/30 border border-fuchsia-100 hover:border-fuchsia-300 focus:bg-white rounded-2xl focus:outline-none focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-500/10 transition-all resize-none text-center font-bold text-slate-800 leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* Story */}
              <div className="space-y-8 p-8 md:p-12 bg-gradient-to-br from-orange-50/80 to-rose-100/50 border border-orange-200/60 rounded-[3rem] shadow-[0_8px_30px_rgb(249,115,22,0.12)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-64 h-64 bg-orange-300/20 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/3"></div>
                
                <div className="bg-white/90 backdrop-blur-sm p-8 md:p-10 rounded-[2.5rem] border border-orange-100 shadow-xl shadow-orange-900/5 hover:shadow-2xl hover:shadow-orange-900/10 transition-all duration-300 text-center space-y-8 relative">
                  <div>
                    <div className="flex justify-center mb-6">
                      <span className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-orange-50 text-orange-700 rounded-full text-xs font-black uppercase tracking-widest border border-orange-100">
                        📖 बोधकथा (Story Title)
                      </span>
                    </div>
                    <input
                      type="text"
                      value={paripathData.storyTitle || ''}
                      onChange={(e) => setParipathData({ ...paripathData, storyTitle: e.target.value })}
                      className="w-full px-6 py-5 bg-orange-50/30 border border-orange-100 hover:border-orange-300 focus:bg-white rounded-2xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all text-center font-bold text-slate-800 text-lg md:text-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-orange-500 mb-4">Story Content</label>
                    <textarea
                      rows={6}
                      value={paripathData.story || ''}
                      onChange={(e) => setParipathData({ ...paripathData, story: e.target.value })}
                      className="w-full px-6 py-5 bg-orange-50/30 border border-orange-100 hover:border-orange-300 focus:bg-white rounded-2xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all resize-none text-center font-bold text-slate-800 leading-relaxed"
                    />
                  </div>
                  <div className="pt-4 border-t border-orange-100/50">
                    <div className="flex justify-center mb-6">
                      <span className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-rose-50 text-rose-700 rounded-full text-xs font-black uppercase tracking-widest border border-rose-100">
                        तात्पर्य (Moral)
                      </span>
                    </div>
                    <input
                      type="text"
                      value={paripathData.moral || ''}
                      onChange={(e) => setParipathData({ ...paripathData, moral: e.target.value })}
                      className="w-full px-6 py-5 bg-rose-50/30 border border-rose-100 hover:border-rose-300 focus:bg-white rounded-2xl focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all text-center font-bold text-slate-800 text-lg md:text-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Patriotic Song */}
              <div className="space-y-8 p-8 md:p-12 bg-gradient-to-br from-indigo-50/80 to-purple-100/50 border border-indigo-200/60 rounded-[3rem] shadow-[0_8px_30px_rgb(99,102,241,0.12)] relative overflow-hidden">
                <div className="bg-white/90 backdrop-blur-sm p-8 md:p-10 rounded-[2.5rem] border border-indigo-100 shadow-xl shadow-indigo-900/5 hover:shadow-2xl hover:shadow-indigo-900/10 transition-all duration-300 text-center space-y-8 relative">
                  <div>
                    <div className="flex justify-center mb-6">
                      <span className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-indigo-50 text-indigo-700 rounded-full text-xs font-black uppercase tracking-widest border border-indigo-100">
                        🎵 समूहगीत/देशभक्ती गीत (Group / Patriotic Song)
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="गीताचे नाव (Song Title)"
                      value={paripathData.songTitle || ''}
                      onChange={(e) => setParipathData({ ...paripathData, songTitle: e.target.value })}
                      className="w-full px-6 py-5 bg-indigo-50/30 border border-indigo-100 hover:border-indigo-300 focus:bg-white rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-center font-bold text-slate-800 text-lg md:text-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-4">Lyrics (संपूर्ण गीत)</label>
                    <textarea
                      rows={6}
                      value={paripathData.patrioticSong || ''}
                      onChange={(e) => setParipathData({ ...paripathData, patrioticSong: e.target.value })}
                      className="w-full px-6 py-5 bg-indigo-50/30 border border-indigo-100 hover:border-indigo-300 focus:bg-white rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none text-center font-bold text-slate-800 leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* Pasaydan - Editable Card */}
              <div className="space-y-8 p-8 md:p-12 bg-gradient-to-br from-amber-50/80 to-yellow-100/50 border border-amber-200/60 rounded-[3rem] shadow-[0_8px_30px_rgb(245,158,11,0.12)] relative overflow-hidden">
                <div className="bg-white/90 backdrop-blur-sm p-8 rounded-[2.5rem] border border-amber-100 shadow-xl shadow-amber-900/5 hover:shadow-2xl hover:shadow-amber-900/10 transition-all duration-300 text-center relative space-y-4">
                  <div className="flex justify-center mb-2">
                    <span className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-amber-50 text-amber-700 rounded-full text-xs font-black uppercase tracking-widest border border-amber-100">
                      ✨ मौन पसायदान (Silent Pasayadan)
                    </span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">
                      पसायदान शीर्षक (Title / Heading)
                    </label>
                    <input
                      type="text"
                      placeholder="उदा. पसायदान / आता विश्वात्मकें देवें"
                      value={paripathData.silentPasayadanTitle || paripathData.pasaydanTitle || ''}
                      onChange={(e) => setParipathData({ ...paripathData, silentPasayadanTitle: e.target.value, pasaydanTitle: e.target.value })}
                      className="w-full max-w-2xl mx-auto px-6 py-3.5 bg-amber-50/30 border border-amber-100 hover:border-amber-300 focus:bg-white rounded-2xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all text-center font-bold text-slate-800 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">
                      पसायदान संपूर्ण मजकूर (Full Content)
                    </label>
                    <textarea
                      rows={10}
                      value={
                        paripathData.silentPasayadan !== undefined
                          ? paripathData.silentPasayadan
                          : (paripathData.silentPasayadan || DEFAULT_ASSEMBLY_ITEMS[adminLang]?.[5]?.content || "")
                      }
                      onChange={(e) => setParipathData({ ...paripathData, silentPasayadan: e.target.value })}
                      className="w-full px-6 py-5 bg-amber-50/30 border border-amber-100 hover:border-amber-300 focus:bg-white rounded-2xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all resize-none text-center font-bold text-slate-800 leading-relaxed max-w-2xl mx-auto block"
                      placeholder="उदा. आता विश्वात्मकें देवें..."
                    />
                  </div>
                </div>
              </div>

              {/* General Knowledge */}
              <div className="space-y-8 p-8 md:p-12 bg-gradient-to-br from-purple-50/80 to-indigo-100/50 border border-purple-200/60 rounded-[3rem] shadow-[0_8px_30px_rgb(168,85,247,0.12)] relative overflow-hidden">
                <div className="bg-white/90 backdrop-blur-sm p-8 md:p-10 rounded-[2.5rem] border border-purple-100 shadow-xl shadow-purple-900/5 hover:shadow-2xl hover:shadow-purple-900/10 transition-all duration-300 text-center relative">
                  <div className="flex justify-center mb-8">
                    <span className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-purple-50 text-purple-700 rounded-full text-sm font-black uppercase tracking-widest border border-purple-100">
                      🧠 सामान्य ज्ञान (General Knowledge)
                    </span>
                  </div>
                  <div className="space-y-6">
                    {[1, 2, 3, 4].map((num) => (
                      <div key={`gk${num}`} className="flex flex-col group">
                        <input
                          type="text"
                          placeholder={`Question ${num}`}
                          value={paripathData[`gkQ${num}`] || ''}
                          onChange={(e) => setParipathData({ ...paripathData, [`gkQ${num}`]: e.target.value })}
                          className="w-full px-6 py-5 bg-purple-50/30 border border-purple-100 hover:border-purple-300 focus:bg-white rounded-t-2xl focus:outline-none focus:border-purple-500 transition-all text-center font-bold text-slate-800"
                        />
                        <input
                          type="text"
                          placeholder={`Answer ${num}`}
                          value={paripathData[`gkA${num}`] || ''}
                          onChange={(e) => setParipathData({ ...paripathData, [`gkA${num}`]: e.target.value })}
                          className="w-full px-6 py-4 bg-purple-100/50 border border-purple-200 border-t-0 rounded-b-2xl focus:outline-none focus:bg-purple-100 focus:border-purple-500 transition-all text-center font-black text-purple-900"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
