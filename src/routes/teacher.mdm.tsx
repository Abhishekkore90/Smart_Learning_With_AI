
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { showToast as toast } from "@/lib/custom-toast";
import { uploadBlobToBunny } from "@/lib/bunnyStorage";
import {
  Utensils,
  Save,
  Loader2,
  Calendar,
  ClipboardList,
  Package,
  Users,
  FileSpreadsheet,
  Plus,
  Trash2,
  Sparkles,
  Check,
  ChevronRight,
  Apple,
  TrendingUp,
  Activity,
  ArrowUpRight,
  FileText,
  Award,
  ShieldCheck,
  Settings,
  Zap,
  RotateCcw,
  Printer,
  Info,
  Sliders,
  X,
  HelpCircle,
  AlertTriangle,
  RefreshCw,
  Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { DICTIONARY } from "@/lib/translations";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";
import { PinGate } from "@/components/teacher/PinGate";
import MDMCertificate from "@/components/teacher/MDMCertificate";

export const Route = createFileRoute("/teacher/mdm")({
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: search.tab as string | undefined,
  }),
  component: TeacherMDMPage,
});

const DEFAULT_WEEKLY_MENU = [
  {
    day: "Monday",
    dayMr: "सोमवार",
    dish: "Varan Bhaat (Rice & Lentils)",
    dishMr: "वरण भात",
    calories: "450 kcal",
  },
  {
    day: "Tuesday",
    dayMr: "मंगळवार",
    dish: "Masala Bhaat (Spiced Rice)",
    dishMr: "मसाला भात",
    calories: "480 kcal",
  },
  {
    day: "Wednesday",
    dayMr: "बुधवार",
    dish: "Moong Usal & Rice (Sprouts & Rice)",
    dishMr: "मूग उसळ व भात",
    calories: "510 kcal",
  },
  {
    day: "Thursday",
    dayMr: "गुरुवार",
    dish: "Soyabean Bhaat",
    dishMr: "सोयाबीन भात",
    calories: "490 kcal",
  },
  {
    day: "Friday",
    dayMr: "शुक्रवार",
    dish: "Dal Khichdi",
    dishMr: "डाळ खिचडी",
    calories: "460 kcal",
  },
  {
    day: "Saturday",
    dayMr: "शनिवार",
    dish: "Sweet Lapshi / Kheer",
    dishMr: "गोड लापशी / खीर",
    calories: "530 kcal",
  },
];

const DEFAULT_STOCK = [
  { item: "Rice", itemMr: "तांदूळ", unit: "kg", opening: 0, added: 0, consumed: 0, closing: 0 },
  { item: "Pulses (Dal)", itemMr: "डाळ", unit: "kg", opening: 0, added: 0, consumed: 0, closing: 0 },
  { item: "Sprouted Moong", itemMr: "मूग", unit: "kg", opening: 0, added: 0, consumed: 0, closing: 0 },
  { item: "Soyabean Blocks", itemMr: "सोयाबीन वडी", unit: "kg", opening: 0, added: 0, consumed: 0, closing: 0 },
  { item: "Cooking Oil", itemMr: "गोडेतेल", unit: "liter", opening: 0, added: 0, consumed: 0, closing: 0 },
  { item: "Salt & Spices", itemMr: "मीठ व मसाले", unit: "kg", opening: 0, added: 0, consumed: 0, closing: 0 },
];

const DEFAULT_HELPERS: any[] = [];

function TeacherMDMPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const EMAIL_TO_UDISE_MAP: Record<string, string> = {
    "payal123@gmail.com": "223344556677",
    "sakshipatil151107@gmail.com": "22255588663399",
    "samuda12@gmail.com": "225588996633",
    "sakshi456@gmail.com": "2233445566",
    "ompatil151107@gmail.com": "22556644882233",
    "om123@gmail.com": "229988776655",
    "abhi12@gmail.com": "22334455",
    "palashborgave0@gmail.com": "11115554856",
    "sanu12@gmail.com": "225544669987",
    "palash12@gmail.com": "22334455667788",
    "sanu123@gmail.com": "225566331144",
    "sam123@gmail.com": "2233445566",
    "palash123@gmail.com": "22334455667788",
  };

  const getUdise = () => {
    if (profile?.udise) return profile.udise;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("teacher_udise");
      if (stored) return stored;
    }
    if (user?.email && EMAIL_TO_UDISE_MAP[user.email]) {
      return EMAIL_TO_UDISE_MAP[user.email];
    }
    return "default";
  };

  const { lang } = useLanguage();
  const t_global = DICTIONARY[lang];
  const { tab } = Route.useSearch();
  const [activeTab, setActiveTab] = useState<string>("quantity");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const TABS = [
    { id: "quantity", label: t_global.mdm_quantity, icon: Activity },
    { id: "menu", label: t_global.mdm_menu, icon: ClipboardList },
    { id: "opening-stock", label: lang === "mr" ? "आरंभीची शिल्लक" : "Initial Stock", icon: Package },
    { id: "incoming", label: t_global.mdm_incoming, icon: Package },
    { id: "loksahabhag", label: lang === "mr" ? "लोकसहभाग" : "Loksahabhag", icon: Users },
    { id: "damaged-stock", label: lang === "mr" ? "खराब साठा" : "Damaged Stock", icon: Trash2 },
    { id: "daily-reg", label: t_global.mdm_daily_reg, icon: Calendar },
    { id: "monthly-calendar", label: lang === "mr" ? "मासिक कॅलेंडर" : "Monthly Calendar", icon: Calendar },
    { id: "stock", label: t_global.mdm_stock_now, icon: Package },
    { id: "anudan", label: lang === "mr" ? "अनुदान सेटिंग" : "Grant Settings", icon: Sparkles },
    { id: "demand", label: t_global.mdm_demand, icon: FileText },
    { id: "monthly-report", label: lang === "mr" ? "प्रमाणपत्र" : "Certificate", icon: FileSpreadsheet },
    { id: "monthly-summary-report", label: lang === "mr" ? "मासिक अहवाल" : "Monthly Report", icon: FileSpreadsheet },
    { id: "annual-report", label: lang === "mr" ? "वार्षिक अहवाल" : "Annual Report", icon: FileSpreadsheet },
    { id: "swayampaki-kararnama", label: lang === "mr" ? "स्वयंपाकी करारनामा" : "Cook Agreement", icon: Award },
  ];

  useEffect(() => {
    if (tab && TABS.some((t) => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [tab]);

  // Monthly Report States
  const [monthlyReportMonth, setMonthlyReportMonth] = useState<string | null>(null);
  const [selectedReportCategory, setSelectedReportCategory] = useState<"tandul_bhag1" | "dhanyadi_bhag2" | "masik_goshwara" | "anudan_report" | "purak_ahar_report">("masik_goshwara");
  const [reportSchoolName, setReportSchoolName] = useState("");
  const [reportTeacherName, setReportTeacherName] = useState("");
  const [reportPrincipalName, setReportPrincipalName] = useState("");
  const [monthlySubTab, setMonthlySubTab] = useState<"1-5" | "6-8" | "1-8">("1-8");
  const [annualSubTab, setAnnualSubTab] = useState<"1-5" | "6-8" | "1-8">("1-5");
  const [annualReportType, setAnnualReportType] = useState("तांदूळ उपयोगिता (किलोग्रॅम मध्ये)");
  const [stockDemandMonth, setStockDemandMonth] = useState<string>("सप्टेंबर");
  const [stockDemandPatSankhya, setStockDemandPatSankhya] = useState<string>("");
  const [stockDemandCategory, setStockDemandCategory] = useState<"1 To 5" | "6 To 8">("1 To 5");
  const [stockDemandWorkingDays, setStockDemandWorkingDays] = useState<string>("21");
  const [monthlyMdmReportType, setMonthlyMdmReportType] = useState<string>("daily_tandul_register");
  const [monthlyMdmReportMonth, setMonthlyMdmReportMonth] = useState<string>("जून सन 2026/27");

  const [certMonthName, setCertMonthName] = useState<string>("");
  const [certPrimaryCookedDays, setCertPrimaryCookedDays] = useState<string>("");
  const [certUpperCookedDays, setCertUpperCookedDays] = useState<string>("");
  const [certWednesdaysCount, setCertWednesdaysCount] = useState<string>("");
  const [certSupplementaryFood, setCertSupplementaryFood] = useState<string>("");
  const [certPatPrimary, setCertPatPrimary] = useState<string>("");
  const [certPatUpper, setCertPatUpper] = useState<string>("");
  const [certBeneficiaryPrimary, setCertBeneficiaryPrimary] = useState<string>("0");
  const [certBeneficiaryUpper, setCertBeneficiaryUpper] = useState<string>("0");
  const [certHelperCount, setCertHelperCount] = useState<string>("0");
  const [showCertEditor, setShowCertEditor] = useState<boolean>(true);

  const toEnglishNumbers = (str: string) => {
    const marathiDigits = [/०/g, /१/g, /२/g, /३/g, /४/g, /५/g, /६/g, /७/g, /८/g, /९/g];
    let res = str || "";
    for (let i = 0; i < 10; i++) {
      res = res.replace(marathiDigits[i], i.toString());
    }
    return res;
  };

  useEffect(() => {
    setReportSchoolName("");
    setReportTeacherName("");
    setReportPrincipalName("");
  }, []);

  const [isMonthlyReportGenerating, setIsMonthlyReportGenerating] = useState(false);
  const [isMonthlyReportGenerated, setIsMonthlyReportGenerated] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadPdf = async () => {
    const container = document.getElementById("monthly-report-print");
    if (!container) return;
    setIsExporting(true);
    try {
      const { default: html2pdf } = await import("html2pdf.js");
      let html2pdfFn = html2pdf;
      // @ts-ignore
      if (html2pdfFn && html2pdfFn.default) { html2pdfFn = html2pdfFn.default; }
      if (typeof html2pdfFn !== "function") {
        if (typeof window !== "undefined" && typeof (window as any).html2pdf === "function") {
          html2pdfFn = (window as any).html2pdf;
        }
      }
      if (typeof html2pdfFn !== "function") {
        throw new Error("html2pdf library is not loaded properly.");
      }

      const pages = Array.from(container.querySelectorAll(".print-page")) as HTMLElement[];
      if (pages.length === 0) return;

      const acadMonths = getAcademicYearMonths("2025-26");
      const selectedMonthObj = acadMonths.find(m => m.month === monthlyReportMonth);
      const reportYear = selectedMonthObj ? selectedMonthObj.year : undefined;

      const englishMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const marathiMonths = ["जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून", "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"];
      const monthIndex = englishMonths.indexOf(monthlyReportMonth || "");
      const marathiMonthName = monthIndex !== -1 ? marathiMonths[monthIndex] : "";

      const monthName = marathiMonthName || "Report";
      const filename = `MDM_Monthly_Report_${monthName}_${reportYear || ""}.pdf`;

      const { default: html2canvas } = await import("html2canvas");
      const { jsPDF } = await import("jspdf");

      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 4;
      const availWidth = pdfWidth - (margin * 2);
      const availHeight = pdfHeight - (margin * 2);

      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i];
        const exactContentWidth = Math.ceil(Math.max(pageEl.scrollWidth || 0, pageEl.offsetWidth || 0, 800));

        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: exactContentWidth,
          width: exactContentWidth,
          scrollY: 0,
          scrollX: 0,
          onclone: (clonedDoc: any, element: HTMLElement) => {
            // Copy main document styles into cloned document head for Vercel production CSS bundles
            const styleNodes = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
            styleNodes.forEach((node) => {
              clonedDoc.head.appendChild(node.cloneNode(true));
            });

            const targetEl = element || clonedDoc.querySelector(".print-page") || clonedDoc.body.firstElementChild;
            if (targetEl) {
              targetEl.style.width = `${exactContentWidth}px`;
              targetEl.style.maxWidth = `${exactContentWidth}px`;
              targetEl.style.margin = "0 auto";
              targetEl.style.boxSizing = "border-box";
            }

            // Explicitly force table borders and cell border styles
            const tables = clonedDoc.querySelectorAll("table");
            tables.forEach((tbl: any) => {
              tbl.style.borderCollapse = "collapse";
              tbl.style.border = "1px solid #000000";
            });

            const cells = clonedDoc.querySelectorAll("th, td");
            cells.forEach((cell: any) => {
              cell.style.borderColor = "#000000";
              cell.style.borderStyle = "solid";
              cell.style.borderWidth = "1px";
            });

            const rowSpanCells = clonedDoc.querySelectorAll("th[rowspan], td[rowspan]");
            rowSpanCells.forEach((cell: any) => {
              cell.style.position = "relative";
              cell.style.zIndex = "30";
              cell.style.verticalAlign = "middle";
            });

            const inputs = clonedDoc.querySelectorAll("input");
            inputs.forEach((input: any) => {
              const span = clonedDoc.createElement("span");
              span.textContent = input.value || " ";
              span.className = input.className;
              span.style.display = input.style.display || "inline-block";
              span.style.width = input.style.width;
              span.style.textAlign = "center";
              span.style.verticalAlign = "bottom";
              if (input.closest("table")) {
                span.style.border = "none";
                span.style.fontWeight = "bold";
              } else {
                span.style.borderBottom = "1px dotted #000000";
                span.style.minHeight = "20px";
                span.style.fontWeight = "bold";
              }
              if (input.parentNode) {
                input.parentNode.replaceChild(span, input);
              }
            });
          }
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.98);
        let imgWidth = availWidth;
        let imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (imgHeight > availHeight) {
          imgHeight = availHeight;
          imgWidth = (canvas.width * imgHeight) / canvas.height;
        }

        const xPos = (pdfWidth - imgWidth) / 2;
        const yPos = 7;

        if (i > 0) pdf.addPage('a4', 'l');
        pdf.addImage(imgData, "JPEG", xPos, yPos, imgWidth, imgHeight);
      }

      pdf.save(filename);
      toast.success(t("PDF यशस्वीरित्या डाउनलोड झाली!", "PDF downloaded successfully!", "पीडीएफ सफलतापूर्वक डाउनलोड हो गया!"));

      try {
        const pdfBlob = (await pdf.output("blob")) as Blob;
        const folderPath = `mdm/monthly_reports/${getUdise() || ""}`;
        const fileName = `MDM_Monthly_${monthlyReportMonth}_${Date.now()}.pdf`;
        const cdnUrl = await uploadBlobToBunny(`${folderPath}/${fileName}`, pdfBlob);
        console.log("Uploaded MDM Monthly PDF to Bunny Storage:", cdnUrl);
      } catch (uploadErr: any) {
        console.warn("Could not upload MDM Monthly PDF to Bunny Storage:", uploadErr);
      }
    } catch (err: any) {
      toast.error(t(`PDF डाउनलोड करण्यात अडथळा आला: ${err?.message || String(err)}`, `Error downloading PDF: ${err?.message || String(err)}`, `पीडीएफ डाउनलोड करने में त्रुटि: ${err?.message || String(err)}`));
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadAnnualPdf = async () => {
    const element = document.getElementById("annual-report-print");
    if (!element) return;
    setIsExporting(true);
    let toastId: string | undefined;
    try {
      toastId = toast.loading("PDF डाऊनलोड होत आहे...");
      const { default: html2pdf } = await import("html2pdf.js");
      let html2pdfFn = html2pdf;
      // @ts-ignore
      if (html2pdfFn && html2pdfFn.default) { html2pdfFn = html2pdfFn.default; }
      if (typeof html2pdfFn !== "function") {
        if (typeof window !== "undefined" && typeof (window as any).html2pdf === "function") {
          html2pdfFn = (window as any).html2pdf;
        }
      }
      if (typeof html2pdfFn !== "function") {
        throw new Error("html2pdf library is not loaded properly.");
      }

      const isGrainReport = annualReportType.includes("धान्याची");
      const filename = isGrainReport
        ? `MDM_Grain_Annual_Report_${annualReportYear || "2026-27"}.pdf`
        : `MDM_Rice_Annual_Report_${annualReportYear || "2026-27"}.pdf`;

      if (isGrainReport) {
        const opt = {
          margin: [2, 2, 2, 2],
          filename,
          image: { type: "jpeg" as const, quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            onclone: (clonedDoc: any) => {
              clonedDoc.body.style.margin = "0";
              clonedDoc.body.style.padding = "0";
              clonedDoc.documentElement.style.margin = "0";
              clonedDoc.documentElement.style.padding = "0";

              const reportEl = clonedDoc.getElementById("annual-report-print");
              if (reportEl) {
                const printWidth = "1020px";
                reportEl.style.width = printWidth;
                reportEl.style.minWidth = printWidth;
                reportEl.style.maxWidth = printWidth;
                reportEl.style.padding = "2px 4px";
                reportEl.style.boxSizing = "border-box";
                reportEl.style.backgroundColor = "#ffffff";
                reportEl.style.border = "none";
                reportEl.style.margin = "0px auto";

                const trRows = reportEl.querySelectorAll("tr");
                trRows.forEach((r: any) => {
                  r.style.pageBreakInside = "avoid";
                  r.style.breakInside = "avoid";
                  r.style.height = "42px";
                });
              }
            }
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "landscape" as const },
          pagebreak: { mode: ["legacy"], avoid: ["tr", "thead"] }
        };
        await html2pdfFn().set(opt).from(element).save();
      } else {
        // Direct jsPDF 1-Page Rendering for Rice Annual Utilization Report
        const { default: html2canvas } = await import("html2canvas");
        const { jsPDF } = await import("jspdf");

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          onclone: (clonedDoc: any) => {
            clonedDoc.body.style.margin = "0";
            clonedDoc.body.style.padding = "0";
            const reportEl = clonedDoc.getElementById("annual-report-print");
            if (reportEl) {
              reportEl.className = "bg-white font-sans border-none shadow-none";
              reportEl.style.width = "1100px";
              reportEl.style.minWidth = "1100px";
              reportEl.style.maxWidth = "1100px";
              reportEl.style.padding = "10px 15px";
              reportEl.style.margin = "0px auto";
              reportEl.style.boxSizing = "border-box";

              const headerBlock = reportEl.children[0] as HTMLElement;
              if (headerBlock) {
                headerBlock.style.padding = "8px 12px";
                headerBlock.style.marginBottom = "8px";
              }

              const footerBlock = reportEl.children[2] as HTMLElement;
              if (footerBlock) {
                footerBlock.style.marginTop = "8px";
                footerBlock.style.paddingTop = "4px";
              }

              const thCells = reportEl.querySelectorAll("th");
              thCells.forEach((cell: any) => {
                cell.style.padding = "3px 1px";
                cell.style.fontSize = "7pt";
                cell.style.lineHeight = "1.05";
                cell.style.backgroundColor = "#f1f5f9";
              });

              const tdCells = reportEl.querySelectorAll("td");
              tdCells.forEach((cell: any) => {
                cell.style.padding = "2px 1px";
                cell.style.fontSize = "7.5pt";
                cell.style.lineHeight = "1.05";
              });
            }
          }
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.98);
        const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        const pdfWidth = pdf.internal.pageSize.getWidth(); // 297mm
        const pdfHeight = pdf.internal.pageSize.getHeight(); // 210mm

        const margin = 5;
        const availWidth = pdfWidth - (margin * 2); // 287mm
        const availHeight = pdfHeight - (margin * 2); // 200mm

        const imgWidth = availWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let finalWidth = imgWidth;
        let finalHeight = imgHeight;

        if (finalHeight > availHeight) {
          finalHeight = availHeight;
          finalWidth = (canvas.width * finalHeight) / canvas.height;
        }

        const xPos = (pdfWidth - finalWidth) / 2;
        const yPos = 6;

        pdf.addImage(imgData, "JPEG", xPos, yPos, finalWidth, finalHeight);
        pdf.save(filename);
      }
      if (toastId) toast.dismiss(toastId);
      toast.success(t("PDF यशस्वीरित्या डाउनलोड झाली!", "PDF downloaded successfully!", "पीडीएफ सफलतापूर्वक डाउनलोड हो गया!"));
    } catch (err: any) {
      if (toastId) toast.dismiss(toastId);
      toast.error(t(`PDF डाउनलोड करण्यात अडथळा आला: ${err?.message || String(err)}`, `Error downloading PDF: ${err?.message || String(err)}`, `पीडीएफ डाउनलोड करने में त्रुटि: ${err?.message || String(err)}`));
    } finally {
      setIsExporting(false);
    }
  };

  const handleAnnualReportDownload = async () => {
    setIsExporting(true);
    let toastId: string | undefined;
    try {
      toastId = toast.loading(
        t("Excel फाईल तयार होत आहे...", "Generating Excel file...", "एक्सेल फाइल तैयार हो रही है...")
      );

      const isGrainReport = annualReportType.includes("धान्याची");
      const yearText = annualReportYear || "2026-27";
      const subTabTitle =
        annualSubTab === "1-5"
          ? "प्राथमिक ( इयत्ता १ ते ५ )"
          : annualSubTab === "6-8"
          ? "उच्च प्राथमिक ( इयत्ता ६ ते ८ )"
          : "इयत्ता १ ते ८ (एकत्रित)";
      const schoolName = profile?.schoolName || "";
      const centerName = profile?.center || "";
      const talukaName = profile?.taluka || "";
      const districtName = profile?.district || "";
      const acadMonths = getAcademicYearMonths(yearText);

      const monthMrNames: Record<string, string> = {
        April: "एप्रिल",
        May: "मे",
        June: "जून",
        July: "जुलै",
        August: "ऑगस्ट",
        September: "सप्टेंबर",
        October: "ऑक्टोबर",
        November: "नोव्हेंबर",
        December: "डिसेंबर",
        January: "जानेवारी",
        February: "फेब्रुवारी",
        March: "मार्च",
      };

      let tableHtmlStr = "";

      if (!isGrainReport) {
        // Rice Annual Utilization Report (तांदूळ उपयोगिता)
        let totalEnrolled = 0;
        let totalWorkingDays = 0;
        let totalCookedDays = 0;
        let totalLeaveDays = 0;
        let totalBeneficiaries = 0;
        let totalCookHonorarium = 0;
        let totalVegGrant = 0;
        let totalPrevStock = 0;
        let totalSupplierReceived = 0;
        let totalPublicReceived = 0;
        let totalStockCombined = 0;
        let totalUsedStock = 0;
        let totalDamagedStock = 0;
        let totalClosingStock = 0;

        const dataRowsHtml = acadMonths
          .map((m, idx) => {
            const regData = getRegisterDataForMonth(m.month, m.year, annualSubTab === "6-8" ? "6 To 8" : "1 To 5");
            const stockData = getStockDataForItem("Rice", m.month, m.year, annualSubTab === "6-8" ? "6 To 8" : "1 To 5");

            const enrolled = regData ? regData.enrolled : 0;
            const workingDays = regData ? regData.workingDays : 0;
            const cookedDays = workingDays > 0 ? workingDays : 0;
            const leaveDays = Math.max(0, workingDays - cookedDays);
            const beneficiary = regData ? regData.beneficiary : 0;

            const cookHonorarium = 0.0;
            const vegGrant = beneficiary * (annualSubTab === "6-8" ? 3.5 : 2.5);

            const prevStock = stockData ? stockData.prev : 10;
            const receivedSupplier = stockData ? stockData.received : idx === 3 ? 10 : 0;
            const receivedPublic = 0;
            const totalReceived = prevStock + receivedSupplier + receivedPublic;
            const usedStock = stockData ? stockData.used : idx === 3 ? 9 : 0;
            const damagedStock = idx === 3 ? 1 : 0;
            const closingStock = Math.max(0, totalReceived - (usedStock + damagedStock));

            totalEnrolled = Math.max(totalEnrolled, enrolled);
            totalWorkingDays += workingDays;
            totalCookedDays += cookedDays;
            totalLeaveDays += leaveDays;
            totalBeneficiaries += beneficiary;
            totalCookHonorarium += cookHonorarium;
            totalVegGrant += vegGrant;
            totalPrevStock += prevStock;
            totalSupplierReceived += receivedSupplier;
            totalPublicReceived += receivedPublic;
            totalStockCombined += totalReceived;
            totalUsedStock += usedStock;
            totalDamagedStock += damagedStock;
            totalClosingStock = closingStock;

            const dateStr = receivedSupplier > 0 ? "10/07/2026" : "";
            const monthTitle = `${monthMrNames[m.month] || m.month} ${m.year}`;

            return `
              <tr>
                <td style="border: 1px solid #000000; text-align: center; font-weight: bold;">${idx + 1}</td>
                <td style="border: 1px solid #000000; text-align: left; padding-left: 6px; font-weight: bold;">${monthTitle}</td>
                <td style="border: 1px solid #000000; text-align: center;">${enrolled}</td>
                <td style="border: 1px solid #000000; text-align: center;">${workingDays}</td>
                <td style="border: 1px solid #000000; text-align: center;">${cookedDays}</td>
                <td style="border: 1px solid #000000; text-align: center;">${leaveDays}</td>
                <td style="border: 1px solid #000000; text-align: center; font-weight: bold;">${beneficiary}</td>
                <td style="border: 1px solid #000000; text-align: center;">${cookHonorarium.toFixed(2)}</td>
                <td style="border: 1px solid #000000; text-align: center; font-weight: bold;">${vegGrant.toFixed(2)}</td>
                <td style="border: 1px solid #000000; text-align: center;">${dateStr}</td>
                <td style="border: 1px solid #000000; text-align: center; mso-number-format:'0.0000';">${prevStock.toFixed(4)}</td>
                <td style="border: 1px solid #000000; text-align: center; mso-number-format:'0.0000';">${receivedSupplier.toFixed(4)}</td>
                <td style="border: 1px solid #000000; text-align: center; mso-number-format:'0.0000';">${receivedPublic.toFixed(4)}</td>
                <td style="border: 1px solid #000000; text-align: center; background-color: #ffff00; font-weight: bold; mso-number-format:'0.0000';">${totalReceived.toFixed(4)}</td>
                <td style="border: 1px solid #000000; text-align: center; mso-number-format:'0.0000';">${usedStock.toFixed(4)}</td>
                <td style="border: 1px solid #000000; text-align: center; mso-number-format:'0.0000';">${damagedStock.toFixed(4)}</td>
                <td style="border: 1px solid #000000; text-align: center; background-color: #ffff00; font-weight: bold; mso-number-format:'0.0000';">${closingStock.toFixed(4)}</td>
                <td style="border: 1px solid #000000;"></td>
              </tr>
            `;
          })
          .join("");

        const totalRowHtml = `
          <tr style="background-color: #ffff00; font-weight: bold;">
            <td colspan="2" style="border: 1px solid #000000; text-align: center; font-weight: bold; background-color: #ffff00;">एकूण</td>
            <td style="border: 1px solid #000000; text-align: center; font-weight: bold; background-color: #ffff00;">${totalEnrolled}</td>
            <td style="border: 1px solid #000000; text-align: center; font-weight: bold; background-color: #ffff00;">${totalWorkingDays}</td>
            <td style="border: 1px solid #000000; text-align: center; font-weight: bold; background-color: #ffff00;">${totalCookedDays}</td>
            <td style="border: 1px solid #000000; text-align: center; font-weight: bold; background-color: #ffff00;">${totalLeaveDays}</td>
            <td style="border: 1px solid #000000; text-align: center; font-weight: bold; background-color: #ffff00;">${totalBeneficiaries}</td>
            <td style="border: 1px solid #000000; text-align: center; font-weight: bold; background-color: #ffff00;">${totalCookHonorarium.toFixed(2)}</td>
            <td style="border: 1px solid #000000; text-align: center; font-weight: bold; background-color: #ffff00;">${totalVegGrant.toFixed(2)}</td>
            <td style="border: 1px solid #000000; text-align: center; background-color: #ffff00;"></td>
            <td style="border: 1px solid #000000; text-align: center; font-weight: bold; background-color: #ffff00; mso-number-format:'0.000';">${totalPrevStock.toFixed(3)}</td>
            <td style="border: 1px solid #000000; text-align: center; font-weight: bold; background-color: #ffff00; mso-number-format:'0.000';">${totalSupplierReceived.toFixed(3)}</td>
            <td style="border: 1px solid #000000; text-align: center; font-weight: bold; background-color: #ffff00; mso-number-format:'0.000';">${totalPublicReceived.toFixed(3)}</td>
            <td style="border: 1px solid #000000; text-align: center; font-weight: bold; background-color: #ffff00; mso-number-format:'0.000';">${totalStockCombined.toFixed(3)}</td>
            <td style="border: 1px solid #000000; text-align: center; font-weight: bold; background-color: #ffff00; mso-number-format:'0.000';">${totalUsedStock.toFixed(3)}</td>
            <td style="border: 1px solid #000000; text-align: center; font-weight: bold; background-color: #ffff00; mso-number-format:'0.000';">${totalDamagedStock.toFixed(3)}</td>
            <td style="border: 1px solid #000000; text-align: center; font-weight: bold; background-color: #ffff00; mso-number-format:'0.000';">${totalClosingStock.toFixed(3)}</td>
            <td style="border: 1px solid #000000; background-color: #ffff00;"></td>
          </tr>
        `;

        tableHtmlStr = `
          <table style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 11px;">
            <tr>
              <td colspan="18" style="font-size: 16px; font-weight: bold; text-align: center; border: none; padding: 6px;">प्रधानमंत्री पोषण शक्ती निर्माण योजना सन ${yearText}</td>
            </tr>
            <tr>
              <td colspan="18" style="font-size: 15px; font-weight: bold; color: #ff0000; text-align: center; border: none; padding: 4px;">वार्षिक उपयोगिता प्रमाणपत्र &nbsp;&nbsp;&nbsp;&nbsp; ${subTabTitle}</td>
            </tr>
            <tr>
              <td style="border: none;"></td>
              <td colspan="9" style="font-size: 12px; font-weight: bold; text-align: left; border: none; padding: 6px 2px;">शाळेचे नाव :- ${schoolName}</td>
              <td colspan="3" style="font-size: 12px; font-weight: bold; text-align: left; border: none; padding: 6px 2px;">केंद्र :- ${centerName}</td>
              <td colspan="2" style="font-size: 12px; font-weight: bold; text-align: left; border: none; padding: 6px 2px;">तालुका :- ${talukaName}</td>
              <td colspan="3" style="font-size: 12px; font-weight: bold; text-align: left; border: none; padding: 6px 2px;">जिल्हा :- ${districtName}</td>
            </tr>
            <thead>
              <tr style="background-color: #ffffff;">
                <th rowspan="2" style="border: 1px solid #000000; text-align: center; font-weight: bold;">अ.न.</th>
                <th rowspan="2" style="border: 1px solid #000000; text-align: center; font-weight: bold;">महिना</th>
                <th rowspan="2" style="border: 1px solid #000000; text-align: center; font-weight: bold;">पट संख्या</th>
                <th rowspan="2" style="border: 1px solid #000000; text-align: center; font-weight: bold;">कामाचे दिवस</th>
                <th rowspan="2" style="border: 1px solid #000000; text-align: center; font-weight: bold;">अन्न शिजवले ले दिवस</th>
                <th rowspan="2" style="border: 1px solid #000000; text-align: center; font-weight: bold;">वंचित दिवस</th>
                <th rowspan="2" style="border: 1px solid #000000; text-align: center; font-weight: bold;">लाभार्थी संख्या ताटांची संख्या</th>
                <th colspan="2" style="border: 1px solid #000000; text-align: center; font-weight: bold;">अन्न शिजविणे खर्च</th>
                <th rowspan="2" style="border: 1px solid #000000; text-align: center; font-weight: bold;">माल प्राप्त दिनांक</th>
                <th colspan="7" style="border: 1px solid #000000; text-align: center; font-weight: bold;">तांदूळ</th>
                <th rowspan="2" style="border: 1px solid #000000; text-align: center; font-weight: bold;">मुख्याध्यापक स्वाक्षरी</th>
              </tr>
              <tr style="background-color: #ffffff;">
                <th style="border: 1px solid #000000; text-align: center; font-weight: bold;">स्वयंपाकी तथा मदतनीस अनुदान</th>
                <th style="border: 1px solid #000000; text-align: center; font-weight: bold;">इंधन पूरक आहार भाजीपाला अनुदान</th>
                <th style="border: 1px solid #000000; text-align: center; font-weight: bold;">मागील शिल्लक</th>
                <th style="border: 1px solid #000000; text-align: center; font-weight: bold;">पुरवठा धारकाकडून प्राप्त</th>
                <th style="border: 1px solid #000000; text-align: center; font-weight: bold;">लोक सहभागातून प्राप्त</th>
                <th style="border: 1px solid #000000; text-align: center; font-weight: bold; background-color: #ffff00;">एकूण प्राप्त</th>
                <th style="border: 1px solid #000000; text-align: center; font-weight: bold;">शिजवण्यात आलेला माल</th>
                <th style="border: 1px solid #000000; text-align: center; font-weight: bold;">खराब झालेने निर्लेखित केलेला माल</th>
                <th style="border: 1px solid #000000; text-align: center; font-weight: bold; background-color: #ffff00;">महिना अखेरीस शिल्लक माल</th>
              </tr>
            </thead>
            <tbody>
              ${dataRowsHtml}
              ${totalRowHtml}
            </tbody>
          </table>
          <div style="font-size: 9pt; font-style: italic; color: #555555; text-align: center; margin-top: 8px;">This report is generated by Learnify Academy MDM Portal</div>
        `;
      } else {
        // Grain Annual Report (धान्याची उपयोगिता - 5 Parts)
        const grainParts = [
          {
            partTitle: "भाग १/५ — मुग डाळ, तूर डाळ, मसूर डाळ",
            items: [
              { nameMr: "मुग डाळ", key: "Mugdal" },
              { nameMr: "तूर डाळ", key: "Turdal" },
              { nameMr: "मसूर डाळ", key: "Masurdal" },
            ],
          },
          {
            partTitle: "भाग २/५ — मटकी, अख्खा मूग, चवळी",
            items: [
              { nameMr: "मटकी", key: "Matki" },
              { nameMr: "अख्खा मूग", key: "Moong" },
              { nameMr: "चवळी", key: "Cowpea" },
            ],
          },
          {
            partTitle: "भाग ३/५ — हरभरा, वाटणा, सोयाबीन",
            items: [
              { nameMr: "हरभरा", key: "Gram" },
              { nameMr: "वाटणा", key: "Pease" },
              { nameMr: "सोयाबीन", key: "Soyabean Wadi" },
            ],
          },
          {
            partTitle: "भाग ४/५ — जिरे, मोहरी, हळद",
            items: [
              { nameMr: "जिरे", key: "Cumin" },
              { nameMr: "मोहरी", key: "Mustard" },
              { nameMr: "हळद", key: "Turmeric" },
            ],
          },
          {
            partTitle: "भाग ५/५ — मसाला, तेल, मीठ",
            items: [
              { nameMr: "मसाला", key: "Onion Garlic Masala" },
              { nameMr: "तेल", key: "Oil" },
              { nameMr: "मीठ", key: "Salt" },
            ],
          },
        ];

        let grainTablesHtmlStr = `
          <table style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 11px; margin-bottom: 12px;">
            <tr>
              <td colspan="23" style="font-size: 16px; font-weight: bold; text-align: center; border: none; padding: 6px;">प्रधानमंत्री पोषण शक्ती निर्माण योजना सन ${yearText}</td>
            </tr>
            <tr>
              <td colspan="23" style="font-size: 15px; font-weight: bold; color: #ff0000; text-align: center; border: none; padding: 4px;">वार्षिक उपयोगिता प्रमाणपत्र &nbsp;&nbsp;&nbsp;&nbsp; ${subTabTitle}</td>
            </tr>
            <tr>
              <td style="border: none;"></td>
              <td colspan="12" style="font-size: 12px; font-weight: bold; text-align: left; border: none; padding: 6px 2px;">शाळेचे नाव :- ${schoolName}</td>
              <td colspan="4" style="font-size: 12px; font-weight: bold; text-align: left; border: none; padding: 6px 2px;">केंद्र :- ${centerName}</td>
              <td colspan="3" style="font-size: 12px; font-weight: bold; text-align: left; border: none; padding: 6px 2px;">तालुका :- ${talukaName}</td>
              <td colspan="3" style="font-size: 12px; font-weight: bold; text-align: left; border: none; padding: 6px 2px;">जिल्हा :- ${districtName}</td>
            </tr>
          </table>
        `;

        grainParts.forEach((part) => {
          const totalsMap: Record<
            string,
            { prev: number; recSupp: number; recPub: number; totalRec: number; used: number; damaged: number; closing: number }
          > = {};
          part.items.forEach((it) => {
            totalsMap[it.key] = { prev: 0, recSupp: 0, recPub: 0, totalRec: 0, used: 0, damaged: 0, closing: 0 };
          });

          const grainRowsHtml = acadMonths
            .map((m, idx) => {
              const monthTitle = `${monthMrNames[m.month] || m.month} ${m.year}`;
              const colsHtml = part.items
                .map((it) => {
                  const stockData = getStockDataForItem(
                    it.key,
                    m.month,
                    m.year,
                    annualSubTab === "6-8" ? "6 To 8" : "1 To 5"
                  );
                  const prev = stockData ? stockData.prev : 0;
                  const recSupp = stockData ? stockData.received : 0;
                  const recPub = 0;
                  const totalRec = prev + recSupp + recPub;
                  const used = stockData ? stockData.used : 0;
                  const damaged = 0;
                  const closing = Math.max(0, totalRec - (used + damaged));

                  totalsMap[it.key].prev += prev;
                  totalsMap[it.key].recSupp += recSupp;
                  totalsMap[it.key].recPub += recPub;
                  totalsMap[it.key].totalRec += totalRec;
                  totalsMap[it.key].used += used;
                  totalsMap[it.key].damaged += damaged;
                  totalsMap[it.key].closing = closing;

                  return `
                    <td style="border: 1px solid #000000; text-align: center; mso-number-format:'0.0000';">${prev.toFixed(4)}</td>
                    <td style="border: 1px solid #000000; text-align: center; mso-number-format:'0.0000';">${recSupp.toFixed(4)}</td>
                    <td style="border: 1px solid #000000; text-align: center; mso-number-format:'0.0000';">${recPub.toFixed(4)}</td>
                    <td style="border: 1px solid #000000; text-align: center; background-color: #ffff00; font-weight: bold; mso-number-format:'0.0000';">${totalRec.toFixed(4)}</td>
                    <td style="border: 1px solid #000000; text-align: center; mso-number-format:'0.0000';">${used.toFixed(4)}</td>
                    <td style="border: 1px solid #000000; text-align: center; mso-number-format:'0.0000';">${damaged.toFixed(4)}</td>
                    <td style="border: 1px solid #000000; text-align: center; background-color: #ffff00; font-weight: bold; mso-number-format:'0.0000';">${closing.toFixed(4)}</td>
                  `;
                })
                .join("");

              return `
                <tr>
                  <td style="border: 1px solid #000000; text-align: center; font-weight: bold;">${idx + 1}</td>
                  <td style="border: 1px solid #000000; text-align: left; padding-left: 6px; font-weight: bold;">${monthTitle}</td>
                  ${colsHtml}
                </tr>
              `;
            })
            .join("");

          const grainTotalsHtml = part.items
            .map((it) => {
              const tot = totalsMap[it.key];
              return `
                <td style="border: 1px solid #000000; text-align: center; font-weight: bold; background-color: #ffff00; mso-number-format:'0.000';">${tot.prev.toFixed(3)}</td>
                <td style="border: 1px solid #000000; text-align: center; font-weight: bold; background-color: #ffff00; mso-number-format:'0.000';">${tot.recSupp.toFixed(3)}</td>
                <td style="border: 1px solid #000000; text-align: center; font-weight: bold; background-color: #ffff00; mso-number-format:'0.000';">${tot.recPub.toFixed(3)}</td>
                <td style="border: 1px solid #000000; text-align: center; font-weight: bold; background-color: #ffff00; mso-number-format:'0.000';">${tot.totalRec.toFixed(3)}</td>
                <td style="border: 1px solid #000000; text-align: center; font-weight: bold; background-color: #ffff00; mso-number-format:'0.000';">${tot.used.toFixed(3)}</td>
                <td style="border: 1px solid #000000; text-align: center; font-weight: bold; background-color: #ffff00; mso-number-format:'0.000';">${tot.damaged.toFixed(3)}</td>
                <td style="border: 1px solid #000000; text-align: center; font-weight: bold; background-color: #ffff00; mso-number-format:'0.000';">${tot.closing.toFixed(3)}</td>
              `;
            })
            .join("");

          grainTablesHtmlStr += `
            <table style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 11px; margin-bottom: 20px;">
              <thead>
                <tr>
                  <th colspan="23" style="border: 1px solid #000000; background-color: #e2e8f0; font-size: 12px; font-weight: bold; text-align: left; padding: 6px;">${part.partTitle}</th>
                </tr>
                <tr style="background-color: #ffffff;">
                  <th rowspan="2" style="border: 1px solid #000000; text-align: center; font-weight: bold;">अ.न.</th>
                  <th rowspan="2" style="border: 1px solid #000000; text-align: center; font-weight: bold;">महिना</th>
                  ${part.items.map((it) => `<th colspan="7" style="border: 1px solid #000000; text-align: center; font-weight: bold;">${it.nameMr}</th>`).join("")}
                </tr>
                <tr style="background-color: #ffffff;">
                  ${part.items
                    .map(
                      () => `
                    <th style="border: 1px solid #000000; text-align: center; font-weight: bold;">मागील शिल्लक</th>
                    <th style="border: 1px solid #000000; text-align: center; font-weight: bold;">पुरवठा धारकाकडून प्राप्त</th>
                    <th style="border: 1px solid #000000; text-align: center; font-weight: bold;">लोक सहभागातून प्राप्त</th>
                    <th style="border: 1px solid #000000; text-align: center; font-weight: bold; background-color: #ffff00;">एकूण प्राप्त</th>
                    <th style="border: 1px solid #000000; text-align: center; font-weight: bold;">शिजवण्यात आलेला माल</th>
                    <th style="border: 1px solid #000000; text-align: center; font-weight: bold;">खराब झालेने निर्लेखित केलेला माल</th>
                    <th style="border: 1px solid #000000; text-align: center; font-weight: bold; background-color: #ffff00;">महिना अखेरीस शिल्लक माल</th>
                  `
                    )
                    .join("")}
                </tr>
              </thead>
              <tbody>
                ${grainRowsHtml}
                <tr style="background-color: #ffff00; font-weight: bold;">
                  <td colspan="2" style="border: 1px solid #000000; text-align: center; font-weight: bold; background-color: #ffff00;">एकूण</td>
                  ${grainTotalsHtml}
                </tr>
              </tbody>
            </table>
          `;
        });

        tableHtmlStr = grainTablesHtmlStr + `<div style="font-size: 9pt; font-style: italic; color: #555555; text-align: center; margin-top: 8px;">This report is generated by Learnify Academy MDM Portal</div>`;
      }

      const fullExcelDocument = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8" />
          <!--[if gte mso 9]>
          <xml>
           <x:ExcelWorkbook>
            <x:ExcelWorksheets>
             <x:ExcelWorksheet>
              <x:Name>${isGrainReport ? "वार्षिक धान्य उपयोगिता" : "वार्षिक तांदूळ उपयोगिता"}</x:Name>
              <x:WorksheetOptions>
               <x:DisplayGridlines/>
              </x:WorksheetOptions>
             </x:ExcelWorksheet>
            </x:ExcelWorksheets>
           </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 11px; }
            td, th { border: 1px solid #000000; padding: 4px 6px; text-align: center; vertical-align: middle; }
            th { font-weight: bold; background-color: #ffffff; }
            .yellow-bg { background-color: #ffff00; font-weight: bold; }
          </style>
        </head>
        <body>
          ${tableHtmlStr}
        </body>
        </html>
      `;

      const filename = isGrainReport
        ? `MDM_Grain_Annual_Report_${yearText}.xls`
        : `MDM_Rice_Annual_Report_${yearText}.xls`;

      const blob = new Blob([fullExcelDocument], { type: "application/vnd.ms-excel;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (toastId) toast.dismiss(toastId);
      toast.success(
        t("Excel फाईल यशस्वीरित्या डाउनलोड झाली!", "Excel downloaded successfully!", "एक्सेल सफलतापूर्वक डाउनलोड हो गया!")
      );
    } catch (err: any) {
      if (toastId) toast.dismiss(toastId);
      toast.error(
        t(
          `Excel डाउनलोड करण्यात अडथळा आला: ${err?.message || String(err)}`,
          `Error downloading Excel: ${err?.message || String(err)}`,
          `एक्सेल डाउनलोड करने में त्रुटि: ${err?.message || String(err)}`
        )
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleQuantityReportDownload = async () => {
    const element = document.getElementById("quantity-report-print");
    if (!element) return;
    setIsExporting(true);
    try {
      const { default: html2pdf } = await import("html2pdf.js");
      let html2pdfFn = html2pdf;
      // @ts-ignore
      if (html2pdfFn && html2pdfFn.default) { html2pdfFn = html2pdfFn.default; }
      if (typeof html2pdfFn !== "function") {
        if (typeof window !== "undefined" && typeof (window as any).html2pdf === "function") {
          html2pdfFn = (window as any).html2pdf;
        }
      }
      if (typeof html2pdfFn !== "function") {
        throw new Error("html2pdf library is not loaded properly.");
      }

      const opt = {
        margin: 10,
        filename: "MDM_Quantity_Report.pdf",
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          onclone: (clonedDoc: any) => {
            clonedDoc.body.style.margin = "0";
            clonedDoc.body.style.padding = "0";
            clonedDoc.documentElement.style.margin = "0";
            clonedDoc.documentElement.style.padding = "0";

            const wrapper = clonedDoc.getElementById("quantity-report-print");
            if (wrapper) {
              let parent = wrapper.parentElement;
              while (parent && parent !== clonedDoc.body) {
                parent.style.margin = "0";
                parent.style.padding = "0";
                parent.style.width = "auto";
                parent.style.maxWidth = "none";
                parent.style.minWidth = "auto";
                parent.style.display = "block";
                parent.style.position = "static";
                parent.style.transform = "none";
                parent = parent.parentElement;
              }
              wrapper.style.padding = "20px";
              wrapper.style.margin = "0px";
              wrapper.style.backgroundColor = "#ffffff";
              wrapper.style.position = "relative";
              wrapper.style.left = "0";
              wrapper.style.top = "0";
            }
          }
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
        pagebreak: { mode: ["css", "legacy"] }
      };

      await html2pdfFn().set(opt).from(element).save();
      toast.success(t("PDF यशस्वीरित्या डाउनलोड झाली!", "PDF downloaded successfully!", "पीडीएफ सफलतापूर्वक डाउनलोड हो गया!"));
    } catch (err: any) {
      toast.error(t(`PDF डाउनलोड करण्यात अडथळा आला: ${err?.message || String(err)}`, `Error downloading PDF: ${err?.message || String(err)}`, `पीडीएफ डाउनलोड करने में त्रुटि: ${err?.message || String(err)}`));
    } finally {
      setIsExporting(false);
    }
  };

  const handleMenuReportDownload = async () => {
    const element = document.getElementById("menu-report-print");
    if (!element) return;
    setIsExporting(true);
    try {
      const { default: html2pdf } = await import("html2pdf.js");
      let html2pdfFn = html2pdf;
      // @ts-ignore
      if (html2pdfFn && html2pdfFn.default) { html2pdfFn = html2pdfFn.default; }
      if (typeof html2pdfFn !== "function") {
        if (typeof window !== "undefined" && typeof (window as any).html2pdf === "function") {
          html2pdfFn = (window as any).html2pdf;
        }
      }
      if (typeof html2pdfFn !== "function") {
        throw new Error("html2pdf library is not loaded properly.");
      }

      const opt = {
        margin: 10,
        filename: "MDM_Menu_Report.pdf",
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          onclone: (clonedDoc: any) => {
            clonedDoc.body.style.margin = "0";
            clonedDoc.body.style.padding = "0";
            clonedDoc.documentElement.style.margin = "0";
            clonedDoc.documentElement.style.padding = "0";

            const wrapper = clonedDoc.getElementById("menu-report-print");
            if (wrapper) {
              let parent = wrapper.parentElement;
              while (parent && parent !== clonedDoc.body) {
                parent.style.margin = "0";
                parent.style.padding = "0";
                parent.style.width = "auto";
                parent.style.maxWidth = "none";
                parent.style.minWidth = "auto";
                parent.style.display = "block";
                parent.style.position = "static";
                parent.style.transform = "none";
                parent = parent.parentElement;
              }
              wrapper.style.padding = "20px";
              wrapper.style.margin = "0px";
              wrapper.style.backgroundColor = "#ffffff";
              wrapper.style.position = "relative";
              wrapper.style.left = "0";
              wrapper.style.top = "0";
            }
          }
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
        pagebreak: { mode: ["css", "legacy"] }
      };

      await html2pdfFn().set(opt).from(element).save();
      toast.success(t("PDF यशस्वीरित्या डाउनलोड झाली!", "PDF downloaded successfully!", "पीडीएफ सफलतापूर्वक डाउनलोड हो गया!"));
    } catch (err: any) {
      toast.error(t(`PDF डाउनलोड करण्यात अडथळा आला: ${err?.message || String(err)}`, `Error downloading PDF: ${err?.message || String(err)}`, `पीडीएफ डाउनलोड करने में त्रुटि: ${err?.message || String(err)}`));
    } finally {
      setIsExporting(false);
    }
  };

  const handleIncomingReportDownload = async () => {
    const element = document.getElementById("incoming-report-print");
    if (!element) return;
    setIsExporting(true);
    try {
      const { default: html2pdf } = await import("html2pdf.js");
      let html2pdfFn = html2pdf;
      // @ts-ignore
      if (html2pdfFn && html2pdfFn.default) { html2pdfFn = html2pdfFn.default; }
      if (typeof html2pdfFn !== "function") {
        if (typeof window !== "undefined" && typeof (window as any).html2pdf === "function") {
          html2pdfFn = (window as any).html2pdf;
        }
      }
      if (typeof html2pdfFn !== "function") {
        throw new Error("html2pdf library is not loaded properly.");
      }

      const opt = {
        margin: 10,
        filename: "MDM_Incoming_Report.pdf",
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          onclone: (clonedDoc: any) => {
            clonedDoc.body.style.margin = "0";
            clonedDoc.body.style.padding = "0";
            clonedDoc.documentElement.style.margin = "0";
            clonedDoc.documentElement.style.padding = "0";

            const wrapper = clonedDoc.getElementById("incoming-report-print");
            if (wrapper) {
              let parent = wrapper.parentElement;
              while (parent && parent !== clonedDoc.body) {
                parent.style.margin = "0";
                parent.style.padding = "0";
                parent.style.width = "auto";
                parent.style.maxWidth = "none";
                parent.style.minWidth = "auto";
                parent.style.display = "block";
                parent.style.position = "static";
                parent.style.transform = "none";
                parent = parent.parentElement;
              }
              wrapper.style.padding = "20px";
              wrapper.style.margin = "0px";
              wrapper.style.backgroundColor = "#ffffff";
              wrapper.style.position = "relative";
              wrapper.style.left = "0";
              wrapper.style.top = "0";
            }
          }
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
        pagebreak: { mode: ["css", "legacy"] }
      };

      await html2pdfFn().set(opt).from(element).save();
      toast.success(t("PDF यशस्वीरित्या डाउनलोड झाली!", "PDF downloaded successfully!", "पीडीएफ सफलतापूर्वक डाउनलोड हो गया!"));
    } catch (err: any) {
      toast.error(t(`PDF डाउनलोड करण्यात अडथळा आला: ${err?.message || String(err)}`, `Error downloading PDF: ${err?.message || String(err)}`, `पीडीएफ डाउनलोड करने में त्रुटि: ${err?.message || String(err)}`));
    } finally {
      setIsExporting(false);
    }
  };

      const handleMonthlyMdmPdfDownload = async () => {
    const element = document.getElementById("monthly-mdm-report-print");
    if (!element) {
      toast.error("अहवाल लोड होत आहे, कृपया थांबा...");
      return;
    }
    let toastId: string | undefined;
    let clone: HTMLElement | null = null;

    try {
      toastId = toast.loading("PDF डाऊनलोड होत आहे...");

      // Clone element to body to avoid parent viewport/flex constraints and scrollbars
      clone = element.cloneNode(true) as HTMLElement;

      const isCertificate = monthlyMdmReportType === "certificate";
      let maxScrollWidth = 0;
      element.querySelectorAll('table, .print-page').forEach((el) => {
        const w = (el as HTMLElement).scrollWidth || (el as HTMLElement).offsetWidth || 0;
        if (w > maxScrollWidth) {
          maxScrollWidth = w;
        }
      });
      if (!maxScrollWidth) maxScrollWidth = element.scrollWidth || element.offsetWidth || 800;

      const totalRenderWidth = isCertificate
        ? Math.max(maxScrollWidth, 800)
        : Math.max(maxScrollWidth + 10, 1100);

      clone.style.position = 'absolute';
      clone.style.top = '0px';
      clone.style.left = '-9999px';
      clone.style.zIndex = '-9999';
      clone.style.opacity = '1';
      clone.style.pointerEvents = 'none';
      clone.style.width = `${totalRenderWidth}px`;
      clone.style.maxWidth = `${totalRenderWidth}px`;
      clone.style.minWidth = `${totalRenderWidth}px`;
      clone.style.overflow = 'visible';
      clone.style.background = '#ffffff';

      clone.querySelectorAll('.print-page').forEach((p) => {
        const pEl = p as HTMLElement;
        pEl.style.width = `${totalRenderWidth}px`;
        pEl.style.maxWidth = `${totalRenderWidth}px`;
        pEl.style.margin = '0 auto';
        pEl.style.boxSizing = 'border-box';
      });

      clone.querySelectorAll('*').forEach((el) => {
        const s = el as HTMLElement;
        if (s.style) {
          s.style.overflow = 'visible';
          s.style.overflowX = 'visible';
          s.style.overflowY = 'visible';
        }
      });

      const hideScrollbarStyle = document.createElement('style');
      hideScrollbarStyle.innerHTML = `
        * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        *::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `;
      clone.appendChild(hideScrollbarStyle);

      document.body.appendChild(clone);

      const isPoshanReport = monthlyMdmReportType === "poshan_ahar_daily_entry";
      const isMasikTandul = monthlyMdmReportType === "masik_tandul_report";
      const isMasikSatha = monthlyMdmReportType === "masik_goshwara";
      const monthShort = monthlyMdmReportMonth.split(' ')[0];
      const filename = isCertificate
        ? `प्रमाणपत्र-${monthShort}-${monthlyMdmReportMonth.includes('2026') ? '2026' : '2027'}.pdf`
        : isPoshanReport
        ? `पोषण-आहार-दैनंदिन-नोंदी-${monthShort}-${monthlyMdmReportMonth.includes('2026') ? '2026' : '2027'}.pdf`
        : isMasikTandul
        ? `मासिक-तांदूळ-अहवाल-${monthShort}-${monthlyMdmReportMonth.includes('2026') ? '2026' : '2027'}.pdf`
        : isMasikSatha
        ? `मासिक-साठा-नोंदवही-${monthShort}-${monthlyMdmReportMonth.includes('2026') ? '2026' : '2027'}.pdf`
        : monthlyMdmReportType === "masik_tandul_bill"
        ? `मासिक-तांदूळ-शिजवून-दिल्याचे-बिल-${monthShort}-${monthlyMdmReportMonth.includes('2026') ? '2026' : '2027'}.pdf`
        : monthlyMdmReportType === "daily_tandul_register"
        ? `दैनंदिन-तांदूळ-खर्च-नोंदवही-${monthShort}-${monthlyMdmReportMonth.includes('2026') ? '2026' : '2027'}.pdf`
        : `मासिक_अहवाल_${monthlyMdmReportMonth.replace(/\s+/g, '_')}.pdf`;

      if (isPoshanReport) {
        const { default: html2canvas } = await import("html2canvas");
        const { jsPDF } = await import("jspdf");

        const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        const pageEls = clone.querySelectorAll('.poshan-pdf-page');
        const elementsToRender = pageEls.length > 0 ? Array.from(pageEls) : [clone];

        for (let i = 0; i < elementsToRender.length; i++) {
          const pageEl = elementsToRender[i] as HTMLElement;
          const canvas = await html2canvas(pageEl, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
            windowWidth: totalRenderWidth,
            width: totalRenderWidth,
            scrollY: 0,
            scrollX: 0,
          });

          const imgData = canvas.toDataURL("image/jpeg", 0.98);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const margin = 4;
          const availWidth = pdfWidth - (margin * 2);
          const availHeight = pdfHeight - (margin * 2);

          let imgWidth = availWidth;
          let imgHeight = (canvas.height * imgWidth) / canvas.width;

          if (imgHeight > availHeight) {
            imgHeight = availHeight;
            imgWidth = (canvas.width * imgHeight) / canvas.height;
          }

          const xPos = (pdfWidth - imgWidth) / 2;
          const yPos = (pdfHeight - imgHeight) / 2;

          if (i > 0) pdf.addPage('a4', 'l');
          pdf.addImage(imgData, "JPEG", xPos, yPos, imgWidth, imgHeight);
        }

        pdf.save(filename);
      } else {
        const { default: html2canvas } = await import("html2canvas");
        const { jsPDF } = await import("jspdf");

        const canvas = await html2canvas(clone, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: totalRenderWidth,
          width: totalRenderWidth,
          scrollY: 0,
          scrollX: 0,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.98);
        const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        const pdfWidth = pdf.internal.pageSize.getWidth(); // 297mm
        const pdfHeight = pdf.internal.pageSize.getHeight(); // 210mm

        const margin = 5;
        const availWidth = pdfWidth - (margin * 2); // 287mm
        const availHeight = pdfHeight - (margin * 2); // 200mm

        const imgWidth = availWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let finalWidth = imgWidth;
        let finalHeight = imgHeight;

        if (finalHeight > availHeight) {
          finalHeight = availHeight;
          finalWidth = (canvas.width * finalHeight) / canvas.height;
        }

        const xPos = (pdfWidth - finalWidth) / 2;
        const yPos = 7;

        pdf.addImage(imgData, "JPEG", xPos, yPos, finalWidth, finalHeight);
        pdf.save(filename);
      }

      if (toastId) toast.dismiss(toastId);
      toast.success("PDF यशस्वीपणे डाऊनलोड झाली!");
    } catch (err) {
      console.error(err);
      if (toastId) toast.dismiss(toastId);
      toast.error("PDF डाऊनलोड करण्यात त्रुटी आली.");
    } finally {
      if (clone && clone.parentNode) {
        clone.parentNode.removeChild(clone);
      }
    }
  };

  const handleStockDemandPdfDownload = async () => {
    const element = document.getElementById("stock-demand-report-print");
    if (!element) {
      toast.error("अहवाल लोड होत आहे, कृपया थांबा...");
      return;
    }
    let toastId: string | undefined;
    try {
      toastId = toast.loading("PDF डाऊनलोड होत आहे...");
      const { default: html2canvas } = await import("html2canvas");
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc: any) => {
          clonedDoc.body.style.margin = "0";
          clonedDoc.body.style.padding = "0";
          clonedDoc.documentElement.style.margin = "0";
          clonedDoc.documentElement.style.padding = "0";

          const wrapper = clonedDoc.getElementById("stock-demand-report-print");
          if (wrapper) {
            let parent = wrapper.parentElement;
            while (parent && parent !== clonedDoc.body) {
              parent.style.margin = "0";
              parent.style.padding = "0";
              parent.style.width = "auto";
              parent.style.maxWidth = "none";
              parent.style.minWidth = "auto";
              parent.style.display = "block";
              parent.style.position = "static";
              parent.style.transform = "none";
              parent = parent.parentElement;
            }
            wrapper.style.padding = "6px 10px";
            wrapper.style.margin = "0px auto";
            wrapper.style.backgroundColor = "#ffffff";
            wrapper.style.boxSizing = "border-box";
            wrapper.style.width = "794px";
            wrapper.style.maxWidth = "794px";

            const tdCells = wrapper.querySelectorAll("td");
            tdCells.forEach((cell: any) => {
              cell.style.padding = "1.5px 3px";
              cell.style.fontSize = "7.5pt";
              cell.style.lineHeight = "1.1";
            });

            const thCells = wrapper.querySelectorAll("th");
            thCells.forEach((cell: any) => {
              cell.style.padding = "2px 3px";
              cell.style.fontSize = "7.5pt";
              cell.style.lineHeight = "1.1";
            });
          }
        }
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

      const margin = 4;
      const availWidth = pdfWidth - (margin * 2); // 202mm
      const availHeight = pdfHeight - (margin * 2); // 289mm

      const imgWidth = availWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let finalWidth = imgWidth;
      let finalHeight = imgHeight;

      if (finalHeight > availHeight) {
        finalHeight = availHeight;
        finalWidth = (canvas.width * finalHeight) / canvas.height;
      }

      const xPos = (pdfWidth - finalWidth) / 2;
      const yPos = (pdfHeight - finalHeight) / 2;

      pdf.addImage(imgData, "JPEG", xPos, yPos, finalWidth, finalHeight);
      pdf.save(`धान्यादी_मालाची_मागणी_${stockDemandMonth}_2026.pdf`);

      if (toastId) toast.dismiss(toastId);
      toast.success("PDF यशस्वीपणे डाऊनलोड झाली!");
    } catch (err) {
      console.error(err);
      if (toastId) toast.dismiss(toastId);
      toast.error("PDF डाऊनलोड करण्यात त्रुटी आली.");
    }
  };

  const handleDemandReportPdfDownload = async () => {
    const element = document.getElementById("demand-report-print");
    if (!element) return;
    setIsExporting(true);
    let toastId: string | undefined;
    try {
      toastId = toast.loading("PDF डाऊनलोड होत आहे...");
      const { default: html2canvas } = await import("html2canvas");
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc: any) => {
          clonedDoc.body.style.margin = "0";
          clonedDoc.body.style.padding = "0";
          clonedDoc.documentElement.style.margin = "0";
          clonedDoc.documentElement.style.padding = "0";

          const wrapper = clonedDoc.getElementById("demand-report-print");
          if (wrapper) {
            let parent = wrapper.parentElement;
            while (parent && parent !== clonedDoc.body) {
              parent.style.margin = "0";
              parent.style.padding = "0";
              parent.style.width = "auto";
              parent.style.maxWidth = "none";
              parent.style.minWidth = "auto";
              parent.style.display = "block";
              parent.style.position = "static";
              parent.style.transform = "none";
              parent = parent.parentElement;
            }
            wrapper.style.padding = "10px";
            wrapper.style.margin = "0px auto";
            wrapper.style.backgroundColor = "#ffffff";
            wrapper.style.boxSizing = "border-box";
            wrapper.style.width = "794px";
            wrapper.style.maxWidth = "794px";
          }
        }
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const margin = 5;
      const availWidth = pdfWidth - (margin * 2);
      const availHeight = pdfHeight - (margin * 2);

      const imgWidth = availWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let finalWidth = imgWidth;
      let finalHeight = imgHeight;

      if (finalHeight > availHeight) {
        finalHeight = availHeight;
        finalWidth = (canvas.width * finalHeight) / canvas.height;
      }

      const xPos = (pdfWidth - finalWidth) / 2;
      const yPos = (pdfHeight - finalHeight) / 2;

      pdf.addImage(imgData, "JPEG", xPos, yPos, finalWidth, finalHeight);
      pdf.save("MDM_Demand_Report.pdf");

      if (toastId) toast.dismiss(toastId);
      toast.success(t("PDF यशस्वीरित्या डाउनलोड झाली!", "PDF downloaded successfully!", "पीडीएफ सफलतापूर्वक डाउनलोड हो गया!"));
    } catch (err: any) {
      if (toastId) toast.dismiss(toastId);
      toast.error(t(`PDF डाउनलोड करण्यात अडथळा आला: ${err?.message || String(err)}`, `Error downloading PDF: ${err?.message || String(err)}`, `पीडीएफ डाउनलोड करने में त्रुटि: ${err?.message || String(err)}`));
    } finally {
      setIsExporting(false);
    }
  };


  // Annual Report States
  const [annualReportYear, setAnnualReportYear] = useState<string | null>("2026-27");
  const [isAnnualReportGenerating, setIsAnnualReportGenerating] = useState(false);
  const [isAnnualReportGenerated, setIsAnnualReportGenerated] = useState(true);

  // Data States
  const [dailyRecord, setDailyRecord] = useState({
    date: new Date().toISOString().split("T")[0],
    selectedClass: "Primary (1-5)",
    totalPresent: 0,
    mealsServed: 0,
    todaysMenu: "",
    eggBananaCount: 0,
    remarks: "",
  });

  const [weeklyMenu, setWeeklyMenu] = useState(DEFAULT_WEEKLY_MENU);
  const [stockInventory, setStockInventory] = useState(DEFAULT_STOCK);
  const [helpers, setHelpers] = useState(DEFAULT_HELPERS);
  const [newHelper, setNewHelper] = useState({
    name: "",
    role: "Assistant Cook",
    roleMr: "मदतनीस स्वयंपाकी",
  });

  // Daily Register Reports States
  const [showRiceReportModal, setShowRiceReportModal] = useState(false);
  const [showDailyRegisterReportModal, setShowDailyRegisterReportModal] =
    useState(false);
  const [registerRecords, setRegisterRecords] = useState<Record<string, any>>({});

  useEffect(() => {
    if (isMonthlyReportGenerated && monthlyReportMonth && profile) {
      const acadMonths = getAcademicYearMonths("2025-26");
      const selectedMonthObj = acadMonths.find(m => m.month === monthlyReportMonth);
      const reportYear = selectedMonthObj ? selectedMonthObj.year : undefined;
      const calcYear = selectedMonthObj ? selectedMonthObj.year : 2025;

      const primaryRiceData = getStockDataForItem("Rice", monthlyReportMonth, calcYear, "1 To 5");
      const primaryCookedDaysVal = primaryRiceData?.cookedDays || 0;
      const primaryBeneficiarySumVal = primaryRiceData?.beneficiary || 0;

      const upperRiceData = getStockDataForItem("Rice", monthlyReportMonth, calcYear, "6 To 8");
      const upperCookedDaysVal = upperRiceData?.cookedDays || 0;
      const upperBeneficiarySumVal = upperRiceData?.beneficiary || 0;

      const getWednesdaysInMonth = (monthName: string, yearNum: number) => {
        const englishMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const mIdx = englishMonths.indexOf(monthName);
        if (mIdx === -1) return 0;
        let count = 0;
        const d = new Date(yearNum, mIdx, 1);
        while (d.getMonth() === mIdx) {
          if (d.getDay() === 3) count++;
          d.setDate(d.getDate() + 1);
        }
        return count;
      };
      const wednesdaysCountVal = getWednesdaysInMonth(monthlyReportMonth, calcYear);
      const helperCountVal = helpers?.length || 0;

      const primaryRegData = getRegisterDataForMonth(monthlyReportMonth, calcYear, "1 To 5");
      const upperRegData = getRegisterDataForMonth(monthlyReportMonth, calcYear, "6 To 8");
      const pEnrolled = primaryRegData.enrolled || parseInt(profile?.patPrimary || "0", 10) || 0;
      const uEnrolled = upperRegData.enrolled || parseInt(profile?.patUpper || "0", 10) || 0;

      setCertPrimaryCookedDays(toMarathiNumbers(primaryCookedDaysVal.toString()));
      setCertUpperCookedDays(toMarathiNumbers(upperCookedDaysVal.toString()));
      setCertWednesdaysCount(toMarathiNumbers(wednesdaysCountVal.toString()));
      setCertSupplementaryFood("अंडी / केळी / पूरक आहार");
      setCertPatPrimary(toMarathiNumbers(pEnrolled.toString()));
      setCertPatUpper(toMarathiNumbers(uEnrolled.toString()));
      setCertBeneficiaryPrimary(toMarathiNumbers(primaryBeneficiarySumVal.toString()));
      setCertBeneficiaryUpper(toMarathiNumbers(upperBeneficiarySumVal.toString()));
      setCertHelperCount(toMarathiNumbers(helperCountVal.toString()));
    }
  }, [isMonthlyReportGenerated, monthlyReportMonth, profile, helpers, registerRecords]);

  const getRegisterMonthYear = () => {
    if (!registerDate) return t("मे २०२६", "May 2026", "मई 2026");
    const d = new Date(registerDate);
    if (!isNaN(d.getTime())) {
      const m = d.getMonth();
      const y = d.getFullYear();
      const monthsMr = [
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
      const monthsHi = [
        "जनवरी",
        "फरवरी",
        "मार्च",
        "अप्रैल",
        "मई",
        "जून",
        "जुलाई",
        "अगस्त",
        "सितंबर",
        "अक्टूबर",
        "नवंबर",
        "दिसंबर",
      ];
      const monthsEn = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      return t(
        `${monthsMr[m]} ${y}`,
        `${monthsEn[m]} ${y}`,
        `${monthsHi[m]} ${y}`,
      );
    }
    return t("मे २०२६", "May 2026", "मई 2026");
  };

  const getDaysInRegisterMonth = () => {
    if (!registerDate) return [];
    const dateObj = new Date(registerDate);
    if (isNaN(dateObj.getTime())) return [];
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    const numDays = new Date(year, month + 1, 0).getDate();
    const daysList = [];
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthStr = monthNames[month];
    for (let i = 1; i <= numDays; i++) {
      const dayStr = i.toString().padStart(2, "0");
      daysList.push({
        srNo: i,
        dateFormatted: `${dayStr}-${monthStr}-${year}`,
        dateISO: `${year}-${(month + 1).toString().padStart(2, "0")}-${dayStr}`,
      });
    }
    return daysList;
  };

  // Food Menu States
  const [menuDay, setMenuDay] = useState("Select Day");
  const [menuType, setMenuType] = useState("Select Menu");
  const [selectedMenuItems, setSelectedMenuItems] = useState<
    Record<string, boolean>
  >({
    Rice: false,
    Pease: false,
    Mugdal: false,
    Cowpea: false,
    Gram: false,
    Masurdal: false,
    Matki: false,
    Moong: false,
    Turdal: false,
    "Soyabean Wadi": false,
    Turmeric: false,
    Salt: false,
    "Onion Garlic Masala": false,
    Cumin: false,
    Mustard: false,
    Oil: false,
    "Milk-Milk Powder": false,
    "Sugar-Jaggery": false,
    "Ragi Satva": false,
    "Garam Masala": false,
    Chili: false,
    Vegetables: false,
  });

  const [recipeIngredientsMap, setRecipeIngredientsMap] = useState<
    Record<string, Record<string, boolean>>
  >({});

  const handleRecipeChange = (recipeIdOrName: string) => {
    const rec = resolveRecipe(recipeIdOrName);
    const targetKey = rec ? rec.id : recipeIdOrName;
    setMenuType(targetKey);
    if (rec) {
      if (recipeIngredientsMap[targetKey]) {
        setSelectedMenuItems(recipeIngredientsMap[targetKey]);
      } else {
        setSelectedMenuItems(rec.defaultIngredients);
      }
    } else {
      setSelectedMenuItems({});
    }
  };

  const [menuRecords, setMenuRecords] = useState<
    Record<string, { menu: string; selectedItems: Record<string, boolean> }>
  >({});
  const [showMenuReportModal, setShowMenuReportModal] = useState(false);

  const DAYS_OPTIONS = [
    { value: "1. Monday", label: "1. Monday", week: "first-third" },
    { value: "2. Tuesday", label: "2. Tuesday", week: "first-third" },
    { value: "3. Wednesday", label: "3. Wednesday", week: "first-third" },
    { value: "4. Thursday", label: "4. Thursday", week: "first-third" },
    { value: "5. Friday", label: "5. Friday", week: "first-third" },
    { value: "6. Saturday", label: "6. Saturday", week: "first-third" },
    { value: "7. Monday", label: "7. Monday", week: "second-fourth" },
    { value: "8. Tuesday", label: "8. Tuesday", week: "second-fourth" },
    { value: "9. Wednesday", label: "9. Wednesday", week: "second-fourth" },
    { value: "10. Thursday", label: "10. Thursday", week: "second-fourth" },
    { value: "11. Friday", label: "11. Friday", week: "second-fourth" },
    { value: "12. Saturday", label: "12. Saturday", week: "second-fourth" },
  ];

  const stripDayNumber = (dayStr: string) => {
    return dayStr.replace(/^\d+\.\s*/, "");
  };

  const getDayOfWeekKeyForDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";

    const dayOfMonth = d.getDate(); // 1 to 31
    // Week 1: days 1-7, Week 2: days 8-14, Week 3: days 15-21, Week 4+: days 22-31
    const weekNum = Math.ceil(dayOfMonth / 7);
    const isSecondOrFourth = weekNum === 2 || weekNum >= 4;

    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayName = days[d.getDay()];
    if (dayName === "Sunday") return "";

    const dayOffsets: Record<string, number> = {
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };

    const baseOffset = isSecondOrFourth ? 6 : 0;
    const dayNum = dayOffsets[dayName];
    if (!dayNum) return "";

    return `${baseOffset + dayNum}. ${dayName}`;
  };

  // ─── Single Master Recipe List & Recipe ID Mapping ──────────────────────────────
  interface MasterRecipe {
    id: string;
    name: string;
    nameEn: string;
    aliases: string[];
    defaultIngredients: Record<string, boolean>;
  }

  const MASTER_RECIPES: MasterRecipe[] = [
    {
      id: "recipe_1",
      name: "व्हेज पुलाव",
      nameEn: "Vegetable Pulav",
      aliases: ["व्हेजिटेबल पुलाव", "Vegetable Pulav", "Veg Pulav"],
      defaultIngredients: {
        Rice: true, Salt: true, Oil: true, Turmeric: true, Cumin: true, Mustard: true,
        Vegetables: true, "Onion Garlic Masala": true
      }
    },
    {
      id: "recipe_2",
      name: "चना पुलाव",
      nameEn: "Chana Pulav",
      aliases: ["चणा/हरभरा पुलाव", "चना/हरभरा पुलाव", "Chana Pulav", "Chana Pulav"],
      defaultIngredients: {
        Rice: true, Salt: true, Oil: true, Turmeric: true, Cumin: true, Mustard: true,
        Gram: true, "Onion Garlic Masala": true, "Garam Masala": true
      }
    },
    {
      id: "recipe_3",
      name: "मूग शेवगा वरण भात",
      nameEn: "Moong Drumstick Dal Rice",
      aliases: ["मूग/तूर शेवग्याचे वरण आणि भात", "Mug Shevaga Varan Bhat", "वरण भात"],
      defaultIngredients: {
        Rice: true, Salt: true, Oil: true, Turmeric: true, Cumin: true, Mustard: true,
        Moong: true, Turdal: true
      }
    },
    {
      id: "recipe_4",
      name: "चवळी खिचडी",
      nameEn: "Cowpea Khichdi",
      aliases: ["चवळी खिचडी", "Cowpea Khichadi"],
      defaultIngredients: {
        Rice: true, Salt: true, Oil: true, Turmeric: true, Cumin: true, Mustard: true,
        Cowpea: true, "Onion Garlic Masala": true
      }
    },
    {
      id: "recipe_5",
      name: "मटकी उसळ भात",
      nameEn: "Matki Usal Rice",
      aliases: ["मोड आलेल्या मटकीची उसळ व साधा शिजवलेला भात", "Sprouted Matki Usal", "मटकी उसळ"],
      defaultIngredients: {
        Rice: true, Salt: true, Oil: true, Turmeric: true, Cumin: true, Mustard: true,
        Matki: true, "Onion Garlic Masala": true
      }
    },
    {
      id: "recipe_6",
      name: "मसाले भात",
      nameEn: "Spiced Rice",
      aliases: ["मसाले भात", "Masala Rice"],
      defaultIngredients: {
        Rice: true, Salt: true, Oil: true, Turmeric: true, Cumin: true, Mustard: true,
        "Onion Garlic Masala": true, "Garam Masala": true
      }
    },
    {
      id: "recipe_7",
      name: "मूग डाळ खिचडी",
      nameEn: "Moong Dal Khichdi",
      aliases: ["मूग-डाळ खिचडी", "Mungdal Khichadi", "मूग डाळ खिचडी"],
      defaultIngredients: {
        Rice: true, Salt: true, Oil: true, Turmeric: true, Cumin: true, Mustard: true,
        Mugdal: true
      }
    },
    {
      id: "recipe_8",
      name: "वाटाणा पुलाव",
      nameEn: "Peas Pulav",
      aliases: ["मटार/वाटाणा पुलाव", "Matar Pulav", "वाटाणा पुलाव"],
      defaultIngredients: {
        Rice: true, Salt: true, Oil: true, Turmeric: true, Cumin: true, Mustard: true,
        Pease: true, "Onion Garlic Masala": true
      }
    },
    {
      id: "recipe_9",
      name: "वरण भात",
      nameEn: "Dal Rice",
      aliases: ["वरण भात", "Dal Rice"],
      defaultIngredients: {
        Rice: true, Salt: true, Oil: true, Turmeric: true, Cumin: true, Mustard: true,
        Turdal: true
      }
    },
    {
      id: "recipe_10",
      name: "सोयाबीन भात",
      nameEn: "Soyabean Rice",
      aliases: ["सोयाबीन भात", "Soyabin Pulav"],
      defaultIngredients: {
        Rice: true, Salt: true, Oil: true, Turmeric: true, Cumin: true, Mustard: true,
        "Soyabean Wadi": true, "Onion Garlic Masala": true
      }
    },
    {
      id: "recipe_11",
      name: "गोड लापशी",
      nameEn: "Sweet Lapshi",
      aliases: ["गोड लापशी", "Sweet Khichadi"],
      defaultIngredients: {
        Rice: true, "Sugar-Jaggery": true, "Milk-Milk Powder": true
      }
    },
    {
      id: "recipe_12",
      name: "तांदळाची खीर",
      nameEn: "Rice Kheer",
      aliases: ["तांदळाची खीर", "Rice pudding"],
      defaultIngredients: {
        Rice: true, "Sugar-Jaggery": true, "Milk-Milk Powder": true
      }
    },
    {
      id: "recipe_13",
      name: "नाचणी सत्व",
      nameEn: "Ragi Porridge",
      aliases: ["नाचणी सत्व", "ragi porridge"],
      defaultIngredients: {
        "Ragi Satva": true, "Sugar-Jaggery": true, "Milk-Milk Powder": true
      }
    },
    {
      id: "recipe_14",
      name: "इतर",
      nameEn: "Other",
      aliases: ["इतर", "Other"],
      defaultIngredients: {
        Rice: true, Salt: true, Oil: true, Turmeric: true
      }
    }
  ];

  const resolveRecipe = (raw: string | undefined | null): MasterRecipe | undefined => {
    if (!raw || raw === "— Select recipe —" || raw === "Select Menu" || raw === "No Menu Available") return undefined;
    const byId = MASTER_RECIPES.find((r) => r.id === raw);
    if (byId) return byId;
    const cleaned = raw.trim().toLowerCase();
    return MASTER_RECIPES.find(
      (r) =>
        r.name.toLowerCase() === cleaned ||
        r.nameEn.toLowerCase() === cleaned ||
        r.aliases.some((a) => a.toLowerCase() === cleaned)
    );
  };

  const getRecipeName = (raw: string | undefined | null): string => {
    const rec = resolveRecipe(raw);
    return rec ? rec.name : (raw && raw !== "— Select recipe —" ? raw : "— Select recipe —");
  };

  const getRecipeId = (raw: string | undefined | null): string => {
    const rec = resolveRecipe(raw);
    return rec ? rec.id : "";
  };

  const getRecipeItemsById = (recipeIdOrName: string): Record<string, boolean> => {
    const rec = resolveRecipe(recipeIdOrName);
    if (rec) return rec.defaultIngredients;
    return getRecipeItemsByName(recipeIdOrName);
  };

  const getRecipeItemRate = (itemName: string, classStr: string): number => {
    const rule = quantityRules.find(
      (r) => r.item.toLowerCase() === itemName.toLowerCase(),
    );
    if (rule) {
      const qtyStr = classStr === "6 To 8" ? rule.qty68 : rule.qty15;
      const qty = Number(qtyStr) || 0;
      return qty >= 1 ? qty / 1000 : qty;
    }
    return 0.05;
  };

  const getRecipeItemsByName = (recipeName: string): Record<string, boolean> => {
    if (!recipeName || recipeName === "No Menu Available" || recipeName === "— Select recipe —" || recipeName === "Select Menu") {
      return {};
    }

    const nameLower = recipeName.toLowerCase();
    
    // Default base items used in savory MDM cooked recipes
    const items: Record<string, boolean> = {
      Rice: true,
      Salt: true,
      Oil: true,
      Turmeric: true,
      Cumin: true,
      Mustard: true,
    };

    if (nameLower.includes("तूर") || nameLower.includes("turdal") || nameLower.includes("वरण")) {
      items["Turdal"] = true;
    }
    if (nameLower.includes("मूग") || nameLower.includes("mung") || nameLower.includes("moong")) {
      if (nameLower.includes("उसळ") || nameLower.includes("अख्खा") || nameLower.includes("शेवगा") || nameLower.includes("तूर")) {
        items["Moong"] = true;
      } else {
        items["Mugdal"] = true;
      }
    }
    if (nameLower.includes("मटकी") || nameLower.includes("matki")) {
      items["Matki"] = true;
    }
    if (nameLower.includes("चवळी") || nameLower.includes("cowpea")) {
      items["Cowpea"] = true;
    }
    if (nameLower.includes("चणा") || nameLower.includes("हरभरा") || nameLower.includes("chana") || nameLower.includes("gram")) {
      items["Gram"] = true;
      items["Onion Garlic Masala"] = true;
      items["Garam Masala"] = true;
    }
    if (nameLower.includes("वाटाणा") || nameLower.includes("मटार") || nameLower.includes("pease") || nameLower.includes("matar")) {
      items["Pease"] = true;
    }
    if (nameLower.includes("सोयाबीन") || nameLower.includes("soyabean") || nameLower.includes("वडी")) {
      items["Soyabean Wadi"] = true;
      items["Onion Garlic Masala"] = true;
    }
    if (nameLower.includes("मसूर") || nameLower.includes("masur")) {
      items["Masurdal"] = true;
      items["Onion Garlic Masala"] = true;
    }
    if (nameLower.includes("मसाला") || nameLower.includes("masala") || nameLower.includes("पुलाव") || nameLower.includes("pulav") || nameLower.includes("खिचडी") || nameLower.includes("khichadi")) {
      if (!nameLower.includes("वरण") && !nameLower.includes("खीर") && !nameLower.includes("लापशी")) {
        items["Onion Garlic Masala"] = true;
      }
    }
    if (nameLower.includes("व्हेज") || nameLower.includes("vegetable")) {
      items["Vegetables"] = true;
    }

    if (nameLower.includes("गोड") || nameLower.includes("खीर") || nameLower.includes("लापशी") || nameLower.includes("kheer") || nameLower.includes("pudding")) {
      return {
        Rice: true,
        "Sugar-Jaggery": true,
        "Milk-Milk Powder": true,
      };
    }
    if (nameLower.includes("नाचणी") || nameLower.includes("ragi") || nameLower.includes("page")) {
      return {
        "Ragi Satva": true,
        "Sugar-Jaggery": true,
        "Milk-Milk Powder": true,
      };
    }

    if (nameLower.includes("खिचडी") || nameLower.includes("khichadi")) {
      items["Mugdal"] = true;
    }

    return items;
  };

  const getMenuForRegisterDate = (dateStr: string, classStr = registerClass) => {
    if (!dateStr) return "No Menu Available";

    // 1. Check if saved in daily register record
    const savedRecord = registerRecords ? registerRecords[dateStr] : undefined;
    if (savedRecord) {
      const classRecord = savedRecord[classStr] || (classStr === "1 To 5" ? savedRecord : null);
      if (classRecord && classRecord.menu && classRecord.menu !== "No Menu Available" && classRecord.menu !== "Select Menu") {
        return classRecord.menu;
      }
    }

    // 2. Check Monthly Calendar Records (monthlyCalendarRecords or calEntries)
    if (dateStr) {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const y = parts[0];
        const m = parseInt(parts[1], 10);
        const calSectionKey = classStr === "6 To 8" ? "6-8" : "1-5";
        
        const keysToTry = [
          `${y}_${m}_${calSectionKey}`,
          `${y}_${m}_1-5`,
          `${y}_${m}_6-8`
        ];

        if (monthlyCalendarRecords) {
          for (const k of keysToTry) {
            const calRec = monthlyCalendarRecords[k];
            if (calRec && calRec[dateStr] && calRec[dateStr].menu && calRec[dateStr].menu !== "— Select recipe —" && calRec[dateStr].menu !== "Select Menu") {
              return calRec[dateStr].menu;
            }
          }
        }

        if (calEntries && calEntries[dateStr] && calEntries[dateStr].menu && calEntries[dateStr].menu !== "— Select recipe —" && calEntries[dateStr].menu !== "Select Menu") {
          return calEntries[dateStr].menu;
        }
      }
    }

    // 3. Fall back to weekly configured menu
    const dayKey = getDayOfWeekKeyForDate(dateStr);
    if (
      dayKey &&
      menuRecords &&
      menuRecords[dayKey] &&
      menuRecords[dayKey].menu &&
      menuRecords[dayKey].menu !== "Select Menu"
    ) {
      return menuRecords[dayKey].menu;
    }

    // 4. Fall back to simple day search
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const dayName = days[d.getDay()];
      const matchKey = Object.keys(menuRecords || {}).find((key) =>
        key.toLowerCase().endsWith(dayName.toLowerCase()),
      );
      if (
        matchKey &&
        menuRecords &&
        menuRecords[matchKey].menu &&
        menuRecords[matchKey].menu !== "Select Menu"
      ) {
        return menuRecords[matchKey].menu;
      }
    }

    return "No Menu Available";
  };

  const getSelectedItemsForRegisterDate = (dateStr: string, classStr = registerClass) => {
    if (!dateStr) return null;

    // 1. Check saved register record
    const savedRecord = registerRecords ? registerRecords[dateStr] : undefined;
    if (savedRecord) {
      const classRecord = savedRecord[classStr] || (classStr === "1 To 5" ? savedRecord : null);
      if (classRecord && classRecord.selectedItems && Object.values(classRecord.selectedItems).some(Boolean)) {
        return classRecord.selectedItems;
      }
    }

    // 2. Derive items from menu set in Monthly Calendar or Master Menu
    const currentMenu = getMenuForRegisterDate(dateStr, classStr);
    if (currentMenu && currentMenu !== "No Menu Available" && currentMenu !== "— Select recipe —") {
      const recipeItems = getRecipeItemsById(currentMenu);
      if (recipeItems && Object.values(recipeItems).some(Boolean)) {
        return recipeItems;
      }
    }

    // 3. Fall back to weekly configured menu
    const dayKey = getDayOfWeekKeyForDate(dateStr);
    if (
      dayKey &&
      menuRecords &&
      menuRecords[dayKey] &&
      menuRecords[dayKey].selectedItems &&
      Object.values(menuRecords[dayKey].selectedItems).some(Boolean)
    ) {
      return menuRecords[dayKey].selectedItems;
    }

    return null;
  };

  const getRegisterMenuForDay = (dayName: string) => {
    if (!dayName) return "No Menu Available";
    const matchKey = Object.keys(menuRecords || {}).find((key) =>
      key.toLowerCase().endsWith(dayName.toLowerCase()),
    );
    if (
      matchKey &&
      menuRecords &&
      menuRecords[matchKey].menu &&
      menuRecords[matchKey].menu !== "Select Menu"
    ) {
      return menuRecords[matchKey].menu;
    }
    return "No Menu Available";
  };

  const handleMenuDayChange = (selectedDay: string) => {
    setMenuDay(selectedDay);
    if (selectedDay && selectedDay !== "Select Day") {
      const record = menuRecords[selectedDay];
      if (record) {
        setMenuType(record.menu);
        setSelectedMenuItems(record.selectedItems || {});
      } else {
        setMenuType("Select Menu");
        setSelectedMenuItems({
          Rice: false,
          Pease: false,
          Mugdal: false,
          Cowpea: false,
          Gram: false,
          Masurdal: false,
          Matki: false,
          Moong: false,
          Turdal: false,
          "Soyabean Wadi": false,
          Turmeric: false,
          Salt: false,
          "Onion Garlic Masala": false,
          Cumin: false,
          Mustard: false,
          Chili: false,
          "Garam Masala": false,
          Oil: false,
        });
      }
    }
  };

  // Incoming Entry States
  const [incomingYear, setIncomingYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [incomingMonth, setIncomingMonth] = useState(
    new Date().toLocaleString("en-US", { month: "long" }),
  );
  const [incomingClass, setIncomingClass] = useState("1 To 5");
  const [incomingQuantities, setIncomingQuantities] = useState<
    Record<string, string>
  >({
    Rice: "",
    Pease: "",
    Mugdal: "",
    Cowpea: "",
    Gram: "",
    Masurdal: "",
    Matki: "",
    Moong: "",
    Turdal: "",
    "Soyabean Wadi": "",
    Turmeric: "",
    Salt: "",
    "Onion Garlic Masala": "",
    Cumin: "",
    Mustard: "",
    Chili: "",
    "Garam Masala": "",
    Oil: "",
  });
  const [incomingRecords, setIncomingRecords] = useState<
    Record<string, Record<string, string>>
  >({});
  const [showIncomingReportModal, setShowIncomingReportModal] = useState(false);
  const [stockRecordsHistory, setStockRecordsHistory] = useState<
    Record<
      string,
      {
        item: string;
        prev: number;
        received: number;
        cookedDays: number;
        beneficiary: number;
        used: number;
      }[]
    >
  >({});

  // Current Stock States
  const [stockYear, setStockYear] = useState("2026");
  const [stockAsOnDate, setStockAsOnDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const handleStockDateChange = (newDateStr: string) => {
    setStockAsOnDate(newDateStr);
    if (newDateStr) {
      const parts = newDateStr.split("-");
      if (parts.length === 3) {
        const year = parts[0];
        const monthIndex = parseInt(parts[1], 10) - 1;
        const monthNames = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];
        if (monthIndex >= 0 && monthIndex <= 11) {
          setStockYear(year);
          setStockMonth(monthNames[monthIndex]);
        }
      }
    }
  };
  const [showStockReportModal, setShowStockReportModal] = useState(false);
  const [stockRecords, setStockRecords] = useState<
    { item: string; prev: number; received: number; cookedDays: number; beneficiary: number; used: number; damaged?: number }[]
  >([
    { item: "Rice", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0, damaged: 0 },
    { item: "Pease", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0, damaged: 0 },
    { item: "Mugdal", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0, damaged: 0 },
    { item: "Cowpea", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0, damaged: 0 },
    { item: "Gram", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0, damaged: 0 },
    { item: "Masurdal", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0, damaged: 0 },
    { item: "Matki", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0, damaged: 0 },
    { item: "Moong", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0, damaged: 0 },
    { item: "Turdal", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0, damaged: 0 },
    { item: "Soyabean Wadi", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0, damaged: 0 },
    { item: "Turmeric", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0, damaged: 0 },
    { item: "Salt", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0, damaged: 0 },
    { item: "Onion Garlic Masala", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0, damaged: 0 },
    { item: "Cumin", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0, damaged: 0 },
    { item: "Mustard", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0, damaged: 0 },
    { item: "Chili", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0, damaged: 0 },
    { item: "Garam Masala", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0, damaged: 0 },
    { item: "Oil", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0, damaged: 0 },
  ]);

  const handleStockRecordChange = (
    index: number,
    field: string,
    value: number,
  ) => {
    const updated = [...stockRecords];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setStockRecords(updated);
  };
  const [stockMonth, setStockMonth] = useState("August");
  const [stockClass, setStockClass] = useState("1 To 5");
  const [showStockTable, setShowStockTable] = useState(true);

  // Daily Register States
  const [registerDate, setRegisterDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [registerClass, setRegisterClass] = useState("1 To 5");
  const [registerDay, setRegisterDay] = useState("");
  const [registerBeneficiary, setRegisterBeneficiary] = useState("");
  const [cookedToday, setCookedToday] = useState("yes");
  const [totalEnrolled, setTotalEnrolled] = useState("");
  const [presentCount, setPresentCount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [purakAhar, setPurakAhar] = useState(false);
  const [purakAharDetails, setPurakAharDetails] = useState("");
  const [veggieKg, setVeggieKg] = useState("");

  // Demand States
  const [demandFromDate, setDemandFromDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [demandToDate, setDemandToDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split("T")[0];
  });
  const [demandContent, setDemandContent] = useState("Select content");
  const [demandQty, setDemandQty] = useState("");
  const [demandRecords, setDemandRecords] = useState<
    { id: string; date: string; content: string; quantity: string }[]
  >([]);
  const [showDemandReportModal, setShowDemandReportModal] = useState(false);
  const [showEggBananaReportModal, setShowEggBananaReportModal] =
    useState(false);

  // Damaged Stock States
  const [damagedItem, setDamagedItem] = useState("");
  const [damagedQty, setDamagedQty] = useState("");
  const [damagedDate, setDamagedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [damagedReason, setDamagedReason] = useState("");
  const [damagedRecords, setDamagedRecords] = useState<
    { id: string; item: string; qty: string; date: string; reason: string }[]
  >([]);

  const handleSaveDamagedStock = async () => {
    if (!user) return;
    if (!damagedItem || !damagedQty) {
      toast.warning(t("कृपया साहित्य आणि प्रमाण प्रविष्ट करा.", "Please select item and quantity."));
      return;
    }
    setSaving(true);
    try {
      const udise = getUdise();
      const newRecord = {
        id: Date.now().toString(),
        item: damagedItem,
        qty: damagedQty,
        date: damagedDate,
        reason: damagedReason,
      };
      const updated = [newRecord, ...damagedRecords];
      setDamagedRecords(updated);
      setDamagedItem("");
      setDamagedQty("");
      setDamagedReason("");

      await setDoc(
        doc(db, "school_data", `${udise}_mdm`),
        { damagedRecords: updated, updatedAt: new Date().toISOString() },
        { merge: true },
      );
    } catch (e) {
      console.error(e);
      toast.error(t("नोंद जतन करण्यात अडचण आली.", "Failed to save record"));
    } finally {
      setSaving(false);
    }
  };

  // Opening Stock (Initial Stock) States & Logic
  const [openingStockDate, setOpeningStockDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [openingStockDateMap, setOpeningStockDateMap] = useState<
    Record<
      string,
      {
        values?: Record<string, string>;
        signs?: Record<string, "+" | "-">;
        received?: Record<string, string>;
        borrowed?: Record<string, string>;
        spent?: Record<string, string>;
      }
    >
  >({});
  const [openingStockValues, setOpeningStockValues] = useState<Record<string, string>>({
    Rice: "0",
    Mugdal: "0",
    Turdal: "0",
    Masurdal: "0",
    Matki: "0",
    Moong: "0",
    Cowpea: "0",
    Gram: "0",
    Pease: "0",
    "Soyabean Wadi": "0",
    Cumin: "0",
    Mustard: "0",
    Turmeric: "0",
    Chili: "0",
    "Onion Garlic Masala": "0",
    "Garam Masala": "0",
    Oil: "0",
    Salt: "0",
  });
  const [openingStockSigns, setOpeningStockSigns] = useState<Record<string, "+" | "-">>({});
  const [openingStockReceived, setOpeningStockReceived] = useState<Record<string, string>>({});
  const [openingStockBorrowed, setOpeningStockBorrowed] = useState<Record<string, string>>({});
  const [openingStockSpent, setOpeningStockSpent] = useState<Record<string, string>>({});
  const [openingStockBorrowedIn, setOpeningStockBorrowedIn] = useState<Record<string, string>>({});
  const [openingStockBorrowedOut, setOpeningStockBorrowedOut] = useState<Record<string, string>>({});
  const [openingStockLoksahabhag, setOpeningStockLoksahabhag] = useState<Record<string, string>>({});
  const [formulaSource, setFormulaSource] = useState<"admin" | "custom">("admin");
  const [formulaRecipe, setFormulaRecipe] = useState<string>("Vegetable Pulav");

  const toggleOpeningStockSign = (itemKey: string) => {
    setOpeningStockSigns((prev) => ({
      ...prev,
      [itemKey]: prev[itemKey] === "-" ? "+" : "-",
    }));
  };

  const handleOpeningStockChange = (itemKey: string, val: string) => {
    setOpeningStockValues((prev) => ({
      ...prev,
      [itemKey]: val,
    }));
  };

  const handleOpeningBorrowedInChange = (itemKey: string, val: string) => {
    setOpeningStockBorrowedIn((prev) => ({
      ...prev,
      [itemKey]: val,
    }));
  };

  const handleOpeningBorrowedOutChange = (itemKey: string, val: string) => {
    setOpeningStockBorrowedOut((prev) => ({
      ...prev,
      [itemKey]: val,
    }));
  };

  const handleOpeningLoksahabhagChange = (itemKey: string, val: string) => {
    setOpeningStockLoksahabhag((prev) => ({
      ...prev,
      [itemKey]: val,
    }));
  };

  const handleOpeningReceivedChange = (itemKey: string, val: string) => {
    setOpeningStockReceived((prev) => ({
      ...prev,
      [itemKey]: val,
    }));
  };

  const handleOpeningBorrowedChange = (itemKey: string, val: string) => {
    setOpeningStockBorrowed((prev) => ({
      ...prev,
      [itemKey]: val,
    }));
  };

  const handleOpeningSpentChange = (itemKey: string, val: string) => {
    setOpeningStockSpent((prev) => ({
      ...prev,
      [itemKey]: val,
    }));
  };

  const handleSaveOpeningStock = async () => {
    if (!user) return;
    const hasInvalid = REPORT_ITEMS.slice(0, 18).some((item) => {
      const openVal = Math.max(0, parseFloat(openingStockValues[item.key] || "0") || 0);
      const borInVal = Math.max(0, parseFloat(openingStockBorrowedIn[item.key] || "0") || 0);
      const borOutVal = Math.max(0, parseFloat(openingStockBorrowedOut[item.key] || "0") || 0);
      const lokVal = Math.max(0, parseFloat(openingStockLoksahabhag[item.key] || "0") || 0);
      return borOutVal > (openVal + borInVal + lokVal);
    });

    if (hasInvalid) {
      toast.error(
        t(
          "अवैध नोंद: उसना दिलेले प्रमाण उपलब्ध साठ्यापेक्षा जास्त असू शकत नाही.",
          "Invalid Entry: Borrowed Out quantity cannot be greater than available stock."
        )
      );
      return;
    }

    setSaving(true);
    try {
      const udise = getUdise();
      const updatedDateMap = {
        ...openingStockDateMap,
        [openingStockDate]: {
          values: openingStockValues,
          signs: openingStockSigns,
          received: openingStockReceived,
          borrowed: openingStockBorrowed,
          spent: openingStockSpent,
          borrowedIn: openingStockBorrowedIn,
          borrowedOut: openingStockBorrowedOut,
          loksahabhag: openingStockLoksahabhag,
        },
      };
      setOpeningStockDateMap(updatedDateMap);

      await setDoc(
        doc(db, "school_data", `${udise}_mdm`),
        {
          openingStockDateWise: updatedDateMap,
          openingStock: openingStockValues,
          openingStockSigns,
          openingStockReceived,
          openingStockBorrowed,
          openingStockSpent,
          openingStockBorrowedIn,
          openingStockBorrowedOut,
          openingStockLoksahabhag,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      const isExistingRecord = !!(openingStockDateMap[openingStockDate]?.values && Object.keys(openingStockDateMap[openingStockDate].values).length > 0);
      toast.success(
        t(
          `${openingStockDate} साठी आरंभीची शिल्लक यशस्वीरित्या ${isExistingRecord ? 'अद्ययावत' : 'जतन'} केली!`,
          `Initial Stock for ${openingStockDate} ${isExistingRecord ? 'updated' : 'saved'} successfully!`
        )
      );
    } catch (e) {
      console.error(e);
      toast.error(t("साठा जतन करण्यात अडचण आली.", "Failed to save initial stock"));
    } finally {
      setSaving(false);
    }
  };

  const handleExportOpeningStockExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const rows = REPORT_ITEMS.slice(0, 18).map((item, idx) => {
        const openVal = roundStock(parseFloat(openingStockValues[item.key] || "0"));
        const borInVal = roundStock(parseFloat(openingStockBorrowedIn[item.key] || "0"));
        const borOutVal = roundStock(parseFloat(openingStockBorrowedOut[item.key] || "0"));
        const lokVal = roundStock(parseFloat(openingStockLoksahabhag[item.key] || "0"));
        const availStock = roundStock(openVal + borInVal + lokVal);
        const isInvalid = borOutVal > availStock && borOutVal > 0;
        const totalStock = isInvalid ? 0 : roundStock(availStock - borOutVal);

        return {
          "अ.क्र.": idx + 1,
          "साहित्याचे नाव (Item Name)": item.nameMr,
          "एकक (Unit)": item.unit,
          "मागील शिल्लक (+)": openVal,
          "उसना घेतला (+)": borInVal,
          "उसना दिला (-)": borOutVal,
          "लोकसहभाग (+)": lokVal,
          "एकूण शिल्लक साठा": isInvalid ? "Invalid Entry" : totalStock,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Opening Stock");
      XLSX.writeFile(workbook, `MDM_Opening_Stock_${openingStockDate || "2026-08-01"}.xlsx`);
      toast.success(t("Excel अहवाल यशस्वीरित्या डाऊनलोड झाला!", "Excel report downloaded successfully!"));
    } catch (err) {
      console.error("Excel Export Error:", err);
      toast.error(t("Excel अहवाल डाऊनलोड करताना त्रुटी आली.", "Failed to export Excel report."));
    }
  };

  const handleOpeningStockPdfDownload = async () => {
    const element = document.getElementById("opening-stock-report-print");
    if (!element) {
      toast.error("अहवाल लोड होत आहे, कृपया थांबा...");
      return;
    }
    let toastId: string | undefined;
    try {
      toastId = toast.loading("PDF डाऊनलोड होत आहे...");
      const { default: html2canvas } = await import("html2canvas");
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 4;
      const availWidth = pdfWidth - margin * 2;
      const imgHeight = (canvas.height * availWidth) / canvas.width;

      pdf.addImage(imgData, "JPEG", margin, margin, availWidth, Math.min(imgHeight, pdfHeight - margin * 2));
      pdf.save(`MDM_Opening_Stock_${openingStockDate || "2026-08-01"}.pdf`);

      if (toastId) toast.dismiss(toastId);
      toast.success("PDF यशस्वीपणे डाऊनलोड झाली!");
    } catch (err) {
      console.error(err);
      if (toastId) toast.dismiss(toastId);
      toast.error("PDF डाऊनलोड करण्यात त्रुटी आली.");
    }
  };

  const handleOpeningStockPrint = () => {
    const element = document.getElementById("opening-stock-report-print");
    if (!element) {
      toast.error("अहवाल लोड होत आहे, कृपया थांबा...");
      return;
    }
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups for printing.");
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>MDM Opening Stock Report - ${openingStockDate}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #0f172a; }
            h2 { color: #065f46; margin-bottom: 4px; text-align: center; }
            h3 { color: #047857; margin-top: 0; text-align: center; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 12px; text-align: left; }
            th { background-color: #d1fae5; color: #064e3b; font-weight: bold; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .meta-info { margin-bottom: 15px; padding: 10px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; font-size: 12px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${profile?.schoolName || "आरंभीची शिल्लक अहवाल (MDM Opening Stock Report)"}</h2>
            <h3>माध्यान्ह भोजन योजना • साठा व्यवस्थापन</h3>
          </div>
          <div class="meta-info">
            <span><strong>दिनांक:</strong> ${openingStockDate ? new Date(openingStockDate).toLocaleDateString('mr-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : ""}</span>
            <span><strong>यू-डायस कोड:</strong> ${getUdise()}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;" class="text-center">अ.क्र.</th>
                <th>साहित्याचे नाव (Item Name)</th>
                <th class="text-center">एकक</th>
                <th class="text-center">मागील शिल्लक (+)</th>
                <th class="text-center">उसना घेतला (+)</th>
                <th class="text-center">उसना दिला (-)</th>
                <th class="text-center">लोकसहभाग (+)</th>
                <th class="text-center">एकूण शिल्लक साठा</th>
              </tr>
            </thead>
            <tbody>
              ${REPORT_ITEMS.slice(0, 18).map((item, idx) => {
                const openVal = Math.max(0, parseFloat(openingStockValues[item.key] || "0") || 0);
                const borInVal = Math.max(0, parseFloat(openingStockBorrowedIn[item.key] || "0") || 0);
                const borOutVal = Math.max(0, parseFloat(openingStockBorrowedOut[item.key] || "0") || 0);
                const lokVal = Math.max(0, parseFloat(openingStockLoksahabhag[item.key] || "0") || 0);
                const availStock = openVal + borInVal + lokVal;
                const isInvalid = borOutVal > availStock && borOutVal > 0;
                const totalStock = isInvalid ? 0 : availStock - borOutVal;
                return `
                  <tr>
                    <td class="text-center font-bold">${idx + 1}</td>
                    <td class="font-bold">${item.nameMr} (${item.key})</td>
                    <td class="text-center">${item.unit}</td>
                    <td class="text-center">${openVal}</td>
                    <td class="text-center">${borInVal}</td>
                    <td class="text-center">${borOutVal}</td>
                    <td class="text-center">${lokVal}</td>
                    <td class="text-center font-bold">${isInvalid ? "Invalid Entry" : totalStock.toFixed(3) + " " + item.unit}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Stock Received (साहित्य आवक) States & Logic
  const [incItem, setIncItem] = useState("");
  const [incQty, setIncQty] = useState("");
  const [incDate, setIncDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [incRemark, setIncRemark] = useState("");
  const [incRecords, setIncRecords] = useState<
    { id: string; item: string; qty: string; date: string; remark: string }[]
  >([]);

  const handleSaveIncomingStock = async () => {
    if (!user) return;
    if (!incItem || !incQty) {
      toast.warning(t("कृपया साहित्य आणि प्रमाण प्रविष्ट करा.", "Please select item and quantity."));
      return;
    }
    setSaving(true);
    try {
      const udise = getUdise();
      const newRecord = {
        id: Date.now().toString(),
        item: incItem,
        qty: incQty,
        date: incDate,
        remark: incRemark,
      };
      const updated = [newRecord, ...incRecords];
      setIncRecords(updated);
      setIncItem("");
      setIncQty("");
      setIncRemark("");

      await setDoc(
        doc(db, "school_data", `${udise}_mdm`),
        { incRecords: updated, incomingRecordsList: updated, updatedAt: new Date().toISOString() },
        { merge: true },
      );
      toast.success(t("प्राप्त साठा नोंद यशस्वीरित्या जतन केली!", "Stock received record saved successfully!"));
    } catch (e) {
      console.error(e);
      toast.error(t("नोंद जतन करण्यात अडचण आली.", "Failed to save record"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteIncomingStock = async (id: string) => {
    if (!user) return;
    try {
      const udise = getUdise();
      const updated = incRecords.filter((r) => r.id !== id);
      setIncRecords(updated);
      await setDoc(
        doc(db, "school_data", `${udise}_mdm`),
        { incRecords: updated, incomingRecordsList: updated, updatedAt: new Date().toISOString() },
        { merge: true },
      );
      toast.success(t("नोंद यशस्वीरित्या हटवली!", "Record deleted successfully!"));
    } catch (e) {
      console.error(e);
      toast.error(t("नोंद हटवण्यात अडचण आली.", "Failed to delete record"));
    }
  };

  // Loksahabhag (Public Contribution) States & Logic
  const [lokItem, setLokItem] = useState("");
  const [lokQty, setLokQty] = useState("");
  const [lokDate, setLokDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [lokDonor, setLokDonor] = useState("");
  const [lokRemark, setLokRemark] = useState("");
  const [lokRecords, setLokRecords] = useState<
    { id: string; item: string; qty: string; date: string; donor: string; remark: string }[]
  >([]);

  // Item Key Resolver for matching Marathi / Dropdown Item names to REPORT_ITEMS key
  const getItemKeyFromName = (rawName: string): string => {
    if (!rawName) return "";
    const cleaned = rawName.replace(/\s*\([^)]*\)/g, "").trim().toLowerCase();

    if (cleaned.includes("rice") || cleaned.includes("तांदूळ")) return "Rice";
    if (cleaned.includes("mugdal") || cleaned.includes("moong dal") || cleaned.includes("मूगडाळ")) return "Mugdal";
    if (cleaned.includes("turdal") || cleaned.includes("tur dal") || cleaned.includes("तूरडाळ")) return "Turdal";
    if (cleaned.includes("masurdal") || cleaned.includes("masoor dal") || cleaned.includes("मसूरडाळ")) return "Masurdal";
    if (cleaned.includes("matki") || cleaned.includes("मटकी")) return "Matki";
    if (cleaned.includes("moong") || cleaned.includes("मूग")) return "Moong";
    if (cleaned.includes("cowpea") || cleaned.includes("चवळी")) return "Cowpea";
    if (cleaned.includes("gram") || cleaned.includes("chana") || cleaned.includes("हरभरा")) return "Gram";
    if (cleaned.includes("pease") || cleaned.includes("peas") || cleaned.includes("वाटाणा")) return "Pease";
    if (cleaned.includes("soyabean") || cleaned.includes("सोयाबीन")) return "Soyabean Wadi";
    if (cleaned.includes("cumin") || cleaned.includes("जिरे")) return "Cumin";
    if (cleaned.includes("mustard") || cleaned.includes("मोहरी")) return "Mustard";
    if (cleaned.includes("turmeric") || cleaned.includes("हळद")) return "Turmeric";
    if (cleaned.includes("chili") || cleaned.includes("तिखट") || cleaned.includes("मिरची")) return "Chili";
    if (cleaned.includes("onion") || cleaned.includes("कांदा")) return "Onion Garlic Masala";
    if (cleaned.includes("garam") || cleaned.includes("गरम")) return "Garam Masala";
    if (cleaned.includes("oil") || cleaned.includes("तेल") || cleaned.includes("गोडेतेल")) return "Oil";
    if (cleaned.includes("salt") || cleaned.includes("मीठ")) return "Salt";
    if (cleaned.includes("milk") || cleaned.includes("दूध")) return "Milk-Milk Powder";
    if (cleaned.includes("sugar") || cleaned.includes("jaggery") || cleaned.includes("साखर") || cleaned.includes("गूळ")) return "Sugar-Jaggery";
    if (cleaned.includes("ragi") || cleaned.includes("नाचणी")) return "Ragi Satva";
    if (cleaned.includes("veg") || cleaned.includes("भाजीपाला")) return "Vegetables";
    return rawName;
  };

  // Reusable Stock Rounding Utility to eliminate JS Floating Point Precision Artifacts (3 decimal places max)
  const roundStock = (val: number | string | null | undefined): number => {
    if (val === null || val === undefined || val === "") return 0;
    const num = typeof val === "number" ? val : parseFloat(val.toString());
    if (isNaN(num)) return 0;
    return Math.round((num + Number.EPSILON) * 1000) / 1000;
  };



  const handleSaveLoksahabhag = async () => {
    if (!user) return;
    if (!lokItem || !lokQty) {
      toast.warning(t("कृपया साहित्य आणि प्रमाण प्रविष्ट करा.", "Please select item and quantity."));
      return;
    }
    setSaving(true);
    try {
      const udise = getUdise();
      const newRecord = {
        id: Date.now().toString(),
        item: lokItem,
        qty: lokQty,
        date: lokDate,
        donor: lokDonor,
        remark: lokRemark,
      };
      const updated = [newRecord, ...lokRecords];
      setLokRecords(updated);
      setLokItem("");
      setLokQty("");
      setLokDonor("");
      setLokRemark("");

      await setDoc(
        doc(db, "school_data", `${udise}_mdm`),
        { lokRecords: updated, updatedAt: new Date().toISOString() },
        { merge: true },
      );
      toast.success(t("लोकसहभाग नोंद यशस्वीरित्या जतन केली!", "Loksahabhag record saved successfully!"));
    } catch (e) {
      console.error(e);
      toast.error(t("नोंद जतन करण्यात अडचण आली.", "Failed to save record"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLoksahabhag = async (id: string) => {
    if (!user) return;
    try {
      const udise = getUdise();
      const updated = lokRecords.filter((r) => r.id !== id);
      setLokRecords(updated);
      await setDoc(
        doc(db, "school_data", `${udise}_mdm`),
        { lokRecords: updated, updatedAt: new Date().toISOString() },
        { merge: true },
      );
      toast.success(t("नोंद यशस्वीरित्या हटवली!", "Record deleted successfully!"));
    } catch (e) {
      console.error(e);
      toast.error(t("नोंद हटवण्यात अडचण आली.", "Failed to delete record"));
    }
  };

  // Anudan (Grant & Cooking Cost Settings) States & Logic
  const [anudanYear, setAnudanYear] = useState("2026-27");
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [primaryRate, setPrimaryRate] = useState("2.59");
  const [primaryKendraShare, setPrimaryKendraShare] = useState("1.56");
  const [primaryRajyaShare, setPrimaryRajyaShare] = useState("1.03");
  const [upperRate, setUpperRate] = useState("3.88");
  const [upperKendraShare, setUpperKendraShare] = useState("2.32");
  const [upperRajyaShare, setUpperRajyaShare] = useState("1.56");
  const [eggRate, setEggRate] = useState("5.00");
  const [vegPercent, setVegPercent] = useState("70");
  const [fuelPercent, setFuelPercent] = useState("30");
  const [anudanHistory, setAnudanHistory] = useState<
    {
      id: string;
      effectiveDate: string;
      primaryRate: string;
      primaryKendraShare: string;
      primaryRajyaShare: string;
      upperRate: string;
      upperKendraShare: string;
      upperRajyaShare: string;
    }[]
  >([]);

  const handleSaveAnudanSettings = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const formattedDate = effectiveDate ? effectiveDate.split("-").reverse().join("-") : new Date().toLocaleDateString("en-GB");
      const newHistoryEntry = {
        id: Date.now().toString(),
        effectiveDate: formattedDate,
        primaryRate,
        primaryKendraShare,
        primaryRajyaShare,
        upperRate,
        upperKendraShare,
        upperRajyaShare,
      };
      const updatedHistory = [newHistoryEntry, ...anudanHistory.filter((h) => h.effectiveDate !== formattedDate)];
      setAnudanHistory(updatedHistory);

      const udise = getUdise();
      await setDoc(
        doc(db, "school_data", `${udise}_mdm`),
        {
          anudanSettings: {
            year: anudanYear,
            effectiveDate,
            primaryRate,
            primaryKendraShare,
            primaryRajyaShare,
            upperRate,
            upperKendraShare,
            upperRajyaShare,
            eggRate,
            vegPercent,
            fuelPercent,
            history: updatedHistory,
          },
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      toast.success(t("दर यशस्वीरित्या जतन केले!", "Rates saved successfully!"));
    } catch (e) {
      console.error(e);
      toast.error(t("सेटिंग जतन करण्यात अडचण आली.", "Failed to save anudan settings"));
    } finally {
      setSaving(false);
    }
  };

  // Monthly Calendar States & Logic (Admin Master Calendar & Custom Calendar)
  const [calMonth, setCalMonth] = useState<number>(new Date().getMonth() + 1);
  const [calYear, setCalYear] = useState<number>(new Date().getFullYear());
  const [calSection, setCalSection] = useState<"1-5" | "6-8">("1-5");
  const [calMode, setCalMode] = useState<"admin" | "custom">("admin");
  const [monthlyCalendarRecords, setMonthlyCalendarRecords] = useState<Record<string, any>>({});
  const [calEntries, setCalEntries] = useState<
    Record<string, { beneficiary: string; isHoliday: boolean; holidayReason: string; menu: string }>
  >({});
  const [showAutoFillModal, setShowAutoFillModal] = useState(false);
  const [autoFillVal, setAutoFillVal] = useState("50");

  // Admin Master Calendar standard menu schedule & government holiday rules (Learnify Academy Format)
  const getAdminMasterMenuForDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const dayOfWeek = d.getDay(); // 0 = Sunday, 1 = Monday...
    const month = d.getMonth() + 1;
    const dayOfMonth = d.getDate();

    if (dayOfWeek === 0) {
      return { isHoliday: true, holidayReason: "रविवार सुट्टी", menu: "— Select recipe —", beneficiary: "0" };
    }
    if (month === 1 && dayOfMonth === 26) {
      return { isHoliday: true, holidayReason: "प्रजासत्ताक दिन", menu: "— Select recipe —", beneficiary: "0" };
    }
    if (month === 5 && dayOfMonth === 1) {
      return { isHoliday: true, holidayReason: "महाराष्ट्र दिन", menu: "— Select recipe —", beneficiary: "0" };
    }
    if (month === 8 && dayOfMonth === 15) {
      return { isHoliday: true, holidayReason: "स्वातंत्र्य दिन", menu: "— Select recipe —", beneficiary: "0" };
    }
    if (month === 10 && dayOfMonth === 2) {
      return { isHoliday: true, holidayReason: "महात्मा गांधी जयंती", menu: "— Select recipe —", beneficiary: "0" };
    }
    if (month === 12 && dayOfMonth === 25) {
      return { isHoliday: true, holidayReason: "नाताळ सुट्टी", menu: "— Select recipe —", beneficiary: "0" };
    }

    // Check if configured in Weekly Master Menu
    const configuredWeeklyMenu = getMenuForRegisterDate(dateStr);
    if (configuredWeeklyMenu && configuredWeeklyMenu !== "No Menu Available" && configuredWeeklyMenu !== "Select Menu") {
      return {
        isHoliday: false,
        holidayReason: "",
        menu: configuredWeeklyMenu,
        beneficiary: "0",
      };
    }

    return {
      isHoliday: false,
      holidayReason: "",
      menu: "— Select recipe —",
      beneficiary: "0",
    };
  };

  const checkIsDateDisabled = (dateStr: string) => {
    if (!dateStr) return { disabled: false, isSunday: false, isHoliday: false, reason: "" };

    const parts = dateStr.split("-");
    if (parts.length !== 3) return { disabled: false, isSunday: false, isHoliday: false, reason: "" };

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    const d = new Date(year, month - 1, day);
    if (isNaN(d.getTime())) return { disabled: false, isSunday: false, isHoliday: false, reason: "" };

    // 1. Sunday check
    const isSunday = d.getDay() === 0;
    if (isSunday) {
      return {
        disabled: true,
        isSunday: true,
        isHoliday: false,
        reason: "रविवार सुट्टी",
      };
    }

    // 2. Fixed Admin / Govt Master Calendar Holiday check
    const adminInfo = getAdminMasterMenuForDate(dateStr);
    if (adminInfo?.isHoliday) {
      return {
        disabled: true,
        isSunday: false,
        isHoliday: true,
        reason: adminInfo.holidayReason || "शासकीय सुट्टी",
      };
    }

    // 3. Monthly Calendar Records Holiday check (for both primary 1-5 and upper 6-8)
    const key15 = `${year}_${month}_1-5`;
    const key68 = `${year}_${month}_6-8`;
    const cal15 = monthlyCalendarRecords?.[key15]?.[dateStr];
    const cal68 = monthlyCalendarRecords?.[key68]?.[dateStr];

    if (cal15?.isHoliday || cal68?.isHoliday) {
      const reason = cal15?.holidayReason || cal68?.holidayReason || "नोंदवलेली सुट्टी";
      return {
        disabled: true,
        isSunday: false,
        isHoliday: true,
        reason,
      };
    }

    // 4. Daily Register Record Holiday check
    const regRec = registerRecords?.[dateStr];
    if (regRec) {
      const classRec = regRec[registerClass] || (registerClass === "1 To 5" ? regRec : null);
      if (classRec?.isHoliday || regRec?.isHoliday) {
        return {
          disabled: true,
          isSunday: false,
          isHoliday: true,
          reason: classRec?.holidayReason || regRec?.holidayReason || "नोंदवलेली सुट्टी",
        };
      }
    }

    return {
      disabled: false,
      isSunday: false,
      isHoliday: false,
      reason: "",
    };
  };

  const generateAdminMasterMonthEntries = (year: number, month: number) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const entries: Record<string, { beneficiary: string; isHoliday: boolean; holidayReason: string; menu: string }> = {};

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      entries[dateStr] = getAdminMasterMenuForDate(dateStr);
    }
    return entries;
  };

  useEffect(() => {
    const key = `${calYear}_${calMonth}_${calSection}`;
    const modeKey = `${calYear}_${calMonth}_${calSection}_mode`;

    const savedEntries = monthlyCalendarRecords[key];
    const savedMode = monthlyCalendarRecords[modeKey];

    if (savedMode) {
      setCalMode(savedMode as "admin" | "custom");
    } else {
      setCalMode("admin");
    }

    if (savedEntries && Object.keys(savedEntries).length > 0) {
      setCalEntries(savedEntries);
    } else {
      setCalEntries(generateAdminMasterMonthEntries(calYear, calMonth));
    }
  }, [calYear, calMonth, calSection, monthlyCalendarRecords]);

  const handleCalEntryChange = (dateStr: string, field: "beneficiary" | "isHoliday" | "holidayReason" | "menu", val: any) => {
    if (calMode === "admin") return;

    setCalEntries((prev) => {
      const existing = prev[dateStr] || getAdminMasterMenuForDate(dateStr);
      const updated = {
        ...existing,
        [field]: val,
      };
      if (field === "isHoliday" && val === true) {
        updated.menu = "— Select recipe —";
      }
      return {
        ...prev,
        [dateStr]: updated,
      };
    });
  };

  const handleSwitchCalMode = (newMode: "admin" | "custom") => {
    setCalMode(newMode);
    if (newMode === "admin") {
      toast.info(t("Admin Master Calendar: सेव्ह केलेल्या सर्व नोंदी केवळ पाहण्यासाठी (Read-Only) लॉक केल्या आहेत.", "Admin Master Calendar Mode: Saved entries displayed in Read-Only mode."));
    } else {
      toast.info(t("Custom Calendar: सेव्ह केलेल्या नोंदी एडिट करण्यासाठी अनलॉक्ड आहेत.", "Custom Calendar Mode: Entries unlocked for editing."));
    }
  };

  const handleResetToAdminMaster = () => {
    const defaults = generateAdminMasterMonthEntries(calYear, calMonth);
    setCalEntries(defaults);
    setCalMode("admin");
    toast.success(t("ऍडमिन मास्टर कॅलेंडर यशस्वीरित्या रीसेट केले!", "Reset to Admin Master Calendar successfully!"));
  };

  const handleApplyAutoFillAttendance = () => {
    const countNum = parseInt(autoFillVal, 10);
    if (isNaN(countNum) || countNum < 0) {
      toast.warning(t("कृपया वैध उपस्थिती संख्या प्रविष्ट करा.", "Please enter a valid attendance count."));
      return;
    }

    const daysInMonth = new Date(calYear, calMonth, 0).getDate();
    setCalEntries((prev) => {
      const next = { ...prev };
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${calYear}-${String(calMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const existing = next[dateStr] || getAdminMasterMenuForDate(dateStr);
        if (!existing.isHoliday) {
          next[dateStr] = {
            ...existing,
            beneficiary: String(countNum),
          };
        }
      }
      return next;
    });

    setShowAutoFillModal(false);
    toast.success(t(`सर्व कामकाजाच्या दिवसांसाठी ${countNum} उपस्थिती भरली!`, `Auto-filled ${countNum} attendance for all working days!`));
  };

  const handleSaveMonthlyCalendar = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const udise = getUdise();
      const updatedCalendarRecords = {
        ...monthlyCalendarRecords,
        [`${calYear}_${calMonth}_${calSection}`]: calEntries,
        [`${calYear}_${calMonth}_${calSection}_mode`]: calMode,
      };

      await setDoc(
        doc(db, "school_data", `${udise}_mdm`),
        {
          monthlyCalendar: updatedCalendarRecords,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      setMonthlyCalendarRecords(updatedCalendarRecords);
      toast.success(t("मासिक कॅलेंडर हजेरी व मेनू जतन केला!", "Monthly Calendar attendance and menu saved successfully!"));
    } catch (e) {
      console.error(e);
      toast.error(t("नोंद जतन करण्यात अडचण आली.", "Failed to save calendar data"));
    } finally {
      setSaving(false);
    }
  };

  // Egg & Banana States
  const [eggBananaDate, setEggBananaDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [eggBananaRemark, setEggBananaRemark] = useState("");
  const [eggBeneficiary15, setEggBeneficiary15] = useState("0");
  const [eggBeneficiary68, setEggBeneficiary68] = useState("0");
  const [bananaBeneficiary15, setBananaBeneficiary15] = useState("0");
  const [bananaBeneficiary68, setBananaBeneficiary68] = useState("0");
  const [eggBananaRecords, setEggBananaRecords] = useState<
    {
      id: string;
      date: string;
      egg15: number;
      egg68: number;
      banana15: number;
      banana68: number;
      remark: string;
    }[]
  >([]);

  // Taste Report States
  const [tasteMonth, setTasteMonth] = useState(
    new Date().toLocaleString("en-US", { month: "long" }),
  );
  const [tasteYear, setTasteYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [tasteRows, setTasteRows] = useState<
    {
      day: number;
      timeLoading: string;
      foodDistTime: string;
      todaysMenu: string;
      tasterName: string;
      comment: string;
      signature: string;
    }[]
  >(
    Array.from({ length: 31 }, (_, i) => ({
      day: i + 1,
      timeLoading: "",
      foodDistTime: "",
      todaysMenu: "",
      tasterName: "",
      comment: "",
      signature: "",
    })),
  );

  useEffect(() => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const monthIdx = months.indexOf(tasteMonth);
    if (monthIdx === -1) return;

    const chiefCook =
      helpers.find((h) => h.role === "Chief Cook")?.name || "Sunita Shinde";

    setTasteRows((prevRows) => {
      const updated = prevRows.map((row) => {
        const dateISO = `${tasteYear}-${(monthIdx + 1).toString().padStart(2, "0")}-${row.day.toString().padStart(2, "0")}`;
        const autoMenu = getMenuForRegisterDate(dateISO);

        const todaysMenu =
          row.todaysMenu || (autoMenu !== "No Menu Available" ? autoMenu : "");
        const timeLoading = row.timeLoading || "11:30 AM";
        const foodDistTime = row.foodDistTime || "12:30 PM";
        const tasterName = row.tasterName || chiefCook;
        const comment = row.comment || "अन्न ताजे, स्वच्छ आणि चवदार होते.";
        const signature = row.signature || "S. S.";

        return {
          ...row,
          todaysMenu,
          timeLoading,
          foodDistTime,
          tasterName,
          comment,
          signature,
        };
      });

      if (JSON.stringify(prevRows) === JSON.stringify(updated)) {
        return prevRows;
      }
      return updated;
    });
  }, [tasteMonth, tasteYear, registerRecords, helpers]);

  // BMI Report States
  const [bmiClass, setBmiClass] = useState("Select Class");
  const [showQuantityReportModal, setShowQuantityReportModal] = useState(false);
  const [bmiRows, setBmiRows] = useState(
    Array.from({ length: 15 }, (_, i) => ({
      srNo: i + 1,
      name: "",
      june: { weight: "", height: "", bmi: "" },
      september: { weight: "", height: "", bmi: "" },
      december: { weight: "", height: "", bmi: "" },
      march: { weight: "", height: "", bmi: "" },
    })),
  );

  const handleBmiRowChange = (
    index: number,
    month: "name" | "june" | "september" | "december" | "march",
    field: "weight" | "height" | "bmi" | "",
    value: string,
  ) => {
    const newRows = [...bmiRows];
    if (month === "name") {
      newRows[index].name = value;
    } else {
      newRows[index][month][field as "weight" | "height" | "bmi"] = value;
    }
    setBmiRows(newRows);
  };

  // Quantity Tab States & Logic
  const [qtyClass, setQtyClass] = useState("1-5");
  const [qtyContent, setQtyContent] = useState("");
  const [qtyAmount, setQtyAmount] = useState("");

  const INITIAL_QUANTITY_TAB_RULES = [
    { item: "Rice", qty15: "0.100", qty68: "0.150" },
    { item: "Pease", qty15: "0.02", qty68: "0.030" },
    { item: "Mugdal", qty15: "0.02", qty68: "0.030" },
    { item: "Cowpea", qty15: "0.02", qty68: "0.030" },
    { item: "Gram", qty15: "0.02", qty68: "0.030" },
    { item: "Masurdal", qty15: "0.02", qty68: "0.030" },
    { item: "Matki", qty15: "0.02", qty68: "0.030" },
    { item: "Moong", qty15: "0.01", qty68: "0.015" },
    { item: "Turdal", qty15: "0.01", qty68: "0.015" },
    { item: "Soyabean Wadi", qty15: "0.02", qty68: "0.030" },
    { item: "Turmeric", qty15: "0.0004", qty68: "0.0006" },
    { item: "Salt", qty15: "0.004", qty68: "0.0060" },
    { item: "Onion Garlic Masala", qty15: "0.0004", qty68: "0.0006" },
    { item: "Cumin", qty15: "0.0004", qty68: "0.0007" },
    { item: "Mustard", qty15: "0.0004", qty68: "0.0007" },
    { item: "Chili", qty15: "0.0004", qty68: "0.0006" },
    { item: "Garam Masala", qty15: "0.0004", qty68: "0.0006" },
    { item: "Oil", qty15: "0.005495", qty68: "0.008242" },
    { item: "Vegetables", qty15: "0.05", qty68: "0.05" },
  ];

  const [quantityRules, setQuantityRules] = useState(
    INITIAL_QUANTITY_TAB_RULES,
  );

  const handleQuantityClassChange = (selectedClass: string) => {
    setQtyClass(selectedClass);
    if (qtyContent) {
      const rule = quantityRules.find(
        (r) => r.item.toLowerCase() === qtyContent.toLowerCase(),
      );
      if (rule) {
        const val = selectedClass === "1-5" ? rule.qty15 : rule.qty68;
        setQtyAmount(val);
      }
    }
  };

  const handleQuantityContentChange = (selectedContent: string) => {
    setQtyContent(selectedContent);
    if (selectedContent) {
      const rule = quantityRules.find(
        (r) => r.item.toLowerCase() === selectedContent.toLowerCase(),
      );
      if (rule) {
        const val = qtyClass === "1-5" ? rule.qty15 : rule.qty68;
        setQtyAmount(val);
      } else {
        setQtyAmount("");
      }
    } else {
      setQtyAmount("");
    }
  };

  const handleUpdateQuantityRule = async () => {
    if (!user) return;
    if (!qtyContent) {
      toast.warning(
        t("कृपया धान्य सामग्री निवडा.", "Please select grain content first."),
      );
      return;
    }
    if (!qtyAmount || isNaN(Number(qtyAmount))) {
      toast.warning(
        t(
          "कृपया वैध प्रमाण प्रविष्ट करा.",
          "Please enter a valid quantity amount.",
        ),
      );
      return;
    }

    setSaving(true);
    try {
      const udise = getUdise();
      const updatedRules = quantityRules.map((r) => {
        if (r.item.toLowerCase() === qtyContent.toLowerCase()) {
          return {
            ...r,
            qty15: qtyClass === "1-5" ? qtyAmount : r.qty15,
            qty68: qtyClass === "6-8" ? qtyAmount : r.qty68,
          };
        }
        return r;
      });
      setQuantityRules(updatedRules);

      await setDoc(
        doc(db, "school_data", `${udise}_mdm`),
        {
          quantityTabRules: updatedRules,
          updatedAt: new Date().toISOString(),
          updatedBy: user.uid,
        },
        { merge: true },
      );

      toast.success(t("माहिती यशस्वीरित्या जतन केली!", "Saved Successfully!"));
    } catch (e) {
      console.error(e);
      toast.error(
        t(
          "प्रमाण अद्ययावत करण्यात अडचण आली.",
          "Failed to update quantity rule",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const QUANTITY_RULES = [
    { item: "Rice", qty15: 100, qty68: 150 },
    { item: "Turdal", qty15: 20, qty68: 30 },
    { item: "Mugdal", qty15: 20, qty68: 25 },
    { item: "Masurdal", qty15: 1000, qty68: 1200 },
    { item: "Matki", qty15: 21, qty68: 25 },
    { item: "Moong", qty15: 20, qty68: 25 },
    { item: "Cowpea", qty15: 20, qty68: 25 },
    { item: "Gram", qty15: 10, qty68: 15 },
    { item: "Pease", qty15: 20, qty68: 25 },
    { item: "Cumin", qty15: 0.2, qty68: 0.3 },
    { item: "Mustard", qty15: 0.0003, qty68: 0.0005 },
    { item: "Turmeric", qty15: 0.0004, qty68: 0.0006 },
    { item: "Chili", qty15: 10, qty68: 15 },
    { item: "Oil", qty15: 0.005495, qty68: 0.0075 },
    { item: "Salt", qty15: 0.0003, qty68: 0.0005 },
    { item: "Onion Garlic Masala", qty15: 0.0008, qty68: 0.001 },
    { item: "Garam Masala", qty15: 0.0004, qty68: 0.0006 },
    { item: "Vegetables", qty15: 10, qty68: 15 },
  ];

  useEffect(() => {
    if (registerDate) {
      const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const d = new Date(registerDate);
      if (!isNaN(d.getTime())) {
        setRegisterDay(days[d.getDay()]);
      }
    }
  }, [registerDate]);

  // Load saved beneficiary when date or class changes
  useEffect(() => {
    if (registerDate && registerClass && registerClass !== "Select Class") {
      const savedRecord = registerRecords[registerDate];
      if (savedRecord) {
        const classRecord = savedRecord[registerClass] || (registerClass === "1 To 5" ? savedRecord : null);
        if (classRecord) {
          setRegisterBeneficiary(classRecord.beneficiary || "");
        } else {
          setRegisterBeneficiary("");
        }
      } else {
        setRegisterBeneficiary("");
      }
    } else {
      setRegisterBeneficiary("");
    }
  }, [registerDate, registerClass, registerRecords]);

  useEffect(() => {
    if (dailyRecord.date) {
      const dayKey = getDayOfWeekKeyForDate(dailyRecord.date);
      if (
        dayKey &&
        menuRecords &&
        menuRecords[dayKey] &&
        menuRecords[dayKey].menu &&
        menuRecords[dayKey].menu !== "Select Menu"
      ) {
        setDailyRecord((prev) => {
          if (prev.todaysMenu !== menuRecords[dayKey].menu) {
            return {
              ...prev,
              todaysMenu: menuRecords[dayKey].menu,
            };
          }
          return prev;
        });
      }
    }
  }, [dailyRecord.date, menuRecords]);

  const getDailyRegisterRows = () => {
    if (
      registerClass === "Select Class" ||
      !registerBeneficiary ||
      isNaN(Number(registerBeneficiary))
    ) {
      return [
        { item: "", qty: "", beneficiary: "", total: "" },
        { item: "", qty: "", beneficiary: "", total: "" },
        { item: "", qty: "", beneficiary: "", total: "" },
      ];
    }
    const bene = Number(registerBeneficiary);
    const isPrimary = registerClass === "1 To 5";
    const selectedItems = getSelectedItemsForRegisterDate(registerDate, registerClass);

    return quantityRules.map((rule) => {
      const isItemSelected = selectedItems ? !!selectedItems[rule.item] : true;
      const qtyStr = isPrimary ? rule.qty15 : rule.qty68;
      const qty = isItemSelected ? Number(qtyStr) || 0 : 0;

      // Convert to grams: if stored in kg (< 1), multiply by 1000 to get grams
      const qtyInGrams = qty > 0 ? (qty < 1 ? qty * 1000 : qty) : 0;
      const total = qtyInGrams * bene;

      return {
        item: rule.item,
        qty: qtyInGrams > 0 ? Number(qtyInGrams.toFixed(6)).toString() : "0",
        beneficiary: bene.toString(),
        total: total > 0 ? Number(total.toFixed(6)).toString() : "0",
      };
    });
  };

  const t = (mr: string, en: string, hi: string = "") => {
    if (lang === "mr") return mr;
    if (lang === "hi") return hi || mr;
    return en;
  };

  const getItemTranslationKey = (item: string) => {
    const mapping: Record<string, string> = {
      Rice: "mdm_item_rice",
      Mugdal: "mdm_item_mugdal",
      Turdal: "mdm_item_turdal",
      Masurdal: "mdm_item_masurdal",
      Matki: "mdm_item_matki",
      Moong: "mdm_item_moong",
      Cowpea: "mdm_item_cowpea",
      Gram: "mdm_item_gram",
      Pease: "mdm_item_pease",
      Mustard: "mdm_item_mustard",
      Cumin: "mdm_item_cumin",
      Turmeric: "mdm_item_turmeric",
      Oil: "mdm_item_oil",
      Salt: "mdm_item_salt",
      "Onion Garlic Masala": "mdm_item_onion_garlic",
      "Garam Masala": "mdm_item_garam_masala",
      Chili: "mdm_item_chili",
      Vegetables: "mdm_item_veg",
      "Milk-Milk Powder": "mdm_item_milk",
      "Sugar-Jaggery": "mdm_item_sugar",
      "Soyabean Wadi": "mdm_item_soyabean",
      "Ragi Satva": "mdm_item_ragi",
    };
    return mapping[item] || item;
  };

  const getTranslatedItem = (item: string) => {
    const key = getItemTranslationKey(item);
    return (t_global as any)[key] || item;
  };

  const getTranslatedMenu = (menuName: string) => {
    const menus: Record<string, { mr: string; en: string; hi: string }> = {
      "Vegetable Pulav": {
        mr: "व्हेज पुलाव",
        en: "Vegetable Pulav",
        hi: "वेज पुलाव",
      },
      "Masala Rice": { mr: "मसाला भात", en: "Masala Rice", hi: "मसाला चावल" },
      "Matar Pulav": { mr: "मटार पुलाव", en: "Matar Pulav", hi: "मटर पुलाव" },
      "Mungdal Khichadi": {
        mr: "मूग डाळ खिचडी",
        en: "Mungdal Khichadi",
        hi: "मूंगदाल खिचड़ी",
      },
      "Cowpea Khichadi": {
        mr: "चवळी उसळ व भात",
        en: "Cowpea Khichadi",
        hi: "लोबिया खिचड़ी",
      },
      "Chana Pulav": { mr: "चणा पुलाव", en: "Chana Pulav", hi: "चना पुलाव" },
      "Soyabin Pulav": {
        mr: "सोयाबीन पुलाव",
        en: "Soyabin Pulav",
        hi: "सोयाबीन पुलाव",
      },
      "Masuri Pulav": {
        mr: "मसुरी पुलाव",
        en: "Masuri Pulav",
        hi: "मसुरी पुलाव",
      },
      "Egg Pulav": { mr: "अंडी पुलाव", en: "Egg Pulav", hi: "अंडा पुलाव" },
      "Sprouted Matki Usal": {
        mr: "मोड आलेली मटकी उसळ",
        en: "Sprouted Matki Usal",
        hi: "अंकुरित मटकी उसल",
      },
      "Sweet Khichadi": {
        mr: "गोड खिचडी",
        en: "Sweet Khichadi",
        hi: "मीठी खिचड़ी",
      },
      "Mug Shevaga Varan Bhat": {
        mr: "मूग शेवगा वरण भात",
        en: "Mug Shevaga Varan Bhat",
        hi: "मूंग सहजन वरण भात",
      },
      "Rice pudding": {
        mr: "तांदळाची खीर",
        en: "Rice pudding",
        hi: "चावल की खीर",
      },
      "ragi porridge": {
        mr: "नाचणीची पेज",
        en: "Ragi porridge",
        hi: "रागी दलिया",
      },
      "Sprouted pulses": {
        mr: "मोड आलेली कडधान्ये",
        en: "Sprouted pulses",
        hi: "अंकुरित अनाज",
      },
      Other: { mr: "इतर", en: "Other", hi: "अन्य" },
    };
    const m = menus[menuName];
    if (!m) return menuName;
    return t(m.mr, m.en, m.hi);
  };

  const getTranslatedDay = (dayStr: string) => {
    const daysMap: Record<string, { mr: string; en: string; hi: string }> = {
      Monday: { mr: "सोमवार", en: "Monday", hi: "सोमवार" },
      Tuesday: { mr: "मंगळवार", en: "Tuesday", hi: "मंगलवार" },
      Wednesday: { mr: "बुधवार", en: "Wednesday", hi: "बुधवार" },
      Thursday: { mr: "गुरुवार", en: "Thursday", hi: "गुरुवार" },
      Friday: { mr: "शुक्रवार", en: "Friday", hi: "शुक्रवार" },
      Saturday: { mr: "शनिवार", en: "Saturday", hi: "शनिवार" },
      Sunday: { mr: "रविवार", en: "Sunday", hi: "रविवार" },
    };
    const match = dayStr.match(/^(\d+\.\s*)(.*)$/);
    if (match) {
      const prefix = match[1];
      const name = match[2];
      const d = daysMap[name];
      if (d) return prefix + t(d.mr, d.en, d.hi);
    }
    const d = daysMap[dayStr];
    if (d) return t(d.mr, d.en, d.hi);
    return dayStr;
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate({
          to: "/login",
          search: { redirect: "/teacher/mdm", role: "teacher" } as any,
        });
        return;
      }
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (
      incomingYear !== "Select Year" &&
      incomingMonth !== "Select Month" &&
      incomingClass !== "Select Class"
    ) {
      const recordKey = `${incomingYear}_${incomingMonth}_${incomingClass}`;
      if (incomingRecords && incomingRecords[recordKey]) {
        setIncomingQuantities(incomingRecords[recordKey]);
      } else {
        setIncomingQuantities({
          Rice: "",
          Pease: "",
          Mugdal: "",
          Cowpea: "",
          Gram: "",
          Masurdal: "",
          Matki: "",
          Moong: "",
          Turdal: "",
          "Soyabean Wadi": "",
          Turmeric: "",
          Salt: "",
          "Onion Garlic Masala": "",
          Cumin: "",
          Mustard: "",
          Chili: "",
          "Garam Masala": "",
          Oil: "",
        });
      }
    } else {
      setIncomingQuantities({
        Rice: "",
        Pease: "",
        Mugdal: "",
        Cowpea: "",
        Gram: "",
        Masurdal: "",
        Matki: "",
        Moong: "",
        Turdal: "",
        "Soyabean Wadi": "",
        Turmeric: "",
        Salt: "",
        "Onion Garlic Masala": "",
        Cumin: "",
        Mustard: "",
        Chili: "",
        "Garam Masala": "",
        Oil: "",
      });
    }
  }, [incomingYear, incomingMonth, incomingClass, incomingRecords]);

  // ─── Stock Calculation Helpers ────────────────────────────────────────────

  // Returns "YYYY_MonthName_ClassName" key for the month before the given one
  const getPreviousMonthKey = (
    monthName: string,
    yearStr: string,
    classStr: string,
  ): string => {
    const MONTHS = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const idx = MONTHS.indexOf(monthName);
    if (idx === -1) return "";
    const prevIdx = idx === 0 ? 11 : idx - 1;
    const prevYear = idx === 0 ? Number(yearStr) - 1 : Number(yearStr);
    return `${prevYear}_${MONTHS[prevIdx]}_${classStr}`;
  };

  // Returns total kg consumed for an item in a given month from Daily Register logs
  const getUsedForMonth = (
    monthName: string,
    yearStr: string,
    classStr: string,
    itemName: string,
  ): number => {
    let totalUsed = 0;
    const isPrimary = classStr === "1 To 5";

    Object.keys(registerRecords || {}).forEach((dateStr) => {
      const parts = dateStr.split("-");
      if (parts.length !== 3) return;
      const recYear = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      if (monthIndex < 0 || monthIndex > 11) return;
      const recMonth = monthNames[monthIndex];

      if (
        recYear !== yearStr ||
        recMonth.toLowerCase() !== monthName.toLowerCase()
      )
        return;

      const record = registerRecords[dateStr];
      if (!record) return;
      const classRecord = record[classStr] || (classStr === "1 To 5" ? record : null);
      if (!classRecord) return;
      const bene = Number(classRecord.beneficiary) || 0;
      if (bene === 0) return;

      // Only count this item if it was actively selected/used that day
      const selectedItems = classRecord.selectedItems || getSelectedItemsForRegisterDate(dateStr, classStr);
      const wasSelected = selectedItems
        ? !!selectedItems[itemName]
        : false;
      if (!wasSelected) return;

      const rule = quantityRules.find(
        (r) => r.item.toLowerCase() === itemName.toLowerCase(),
      );
      if (!rule) return;

      const qtyStr = isPrimary ? rule.qty15 : rule.qty68;
      const qty = Number(qtyStr) || 0; // qty is already in kg (e.g. 0.1 kg = 100 g)
      if (qty <= 0) return;

      // If qty >= 1, the rule is stored in grams → convert to kg; otherwise already in kg
      const qtyKg = qty >= 1 ? qty / 1000 : qty;
      totalUsed += qtyKg * bene;
    });

    return Number(totalUsed.toFixed(6));
  };

  // Returns the opening (previous month closing) balance for an item.
  // Looks up history chain up to 12 months back, never reads current month's saved prev.
  const getOpeningStock = (
    monthName: string,
    yearStr: string,
    classStr: string,
    itemName: string,
    depth = 0,
    customRegisterRecords = registerRecords,
    customIncomingRecords = incomingRecords,
  ): number => {
    if (depth > 12) {
      const itemKey = getItemKeyFromName(itemName);
      return parseFloat(openingStockValues[itemName] || openingStockValues[itemKey] || "0") || 0;
    }

    const prevKey = getPreviousMonthKey(monthName, yearStr, classStr);
    if (!prevKey) {
      const itemKey = getItemKeyFromName(itemName);
      return parseFloat(openingStockValues[itemName] || openingStockValues[itemKey] || "0") || 0;
    }

    const firstUnderscore = prevKey.indexOf("_");
    const secondUnderscore = prevKey.indexOf("_", firstUnderscore + 1);
    if (firstUnderscore === -1 || secondUnderscore === -1) {
      const itemKey = getItemKeyFromName(itemName);
      return parseFloat(openingStockValues[itemName] || openingStockValues[itemKey] || "0") || 0;
    }

    const prevYear = prevKey.substring(0, firstUnderscore);
    const prevMonth = prevKey.substring(firstUnderscore + 1, secondUnderscore);
    const prevClass = prevKey.substring(secondUnderscore + 1);

    // Check if we have active data (register or incoming) for the previous month
    const hasDataForPrevMonth = (() => {
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const monthIndex = monthNames.findIndex(m => m.toLowerCase() === prevMonth.toLowerCase());
      if (monthIndex === -1) return false;

      // Check incoming
      if (customIncomingRecords[prevKey]) return true;

      // Check register
      const hasRegister = Object.keys(customRegisterRecords || {}).some((dateStr) => {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime()) && d.getMonth() === monthIndex && d.getFullYear().toString() === prevYear) {
          const record = customRegisterRecords[dateStr];
          const classRecord = record[prevClass] || (prevClass === "1 To 5" ? record : null);
          return classRecord && (Number(classRecord.beneficiary) > 0);
        }
        return false;
      });
      return hasRegister;
    })();

    if (!hasDataForPrevMonth) {
      // Does a saved history snapshot exist for the previous month?
      const prevSaved = stockRecordsHistory[prevKey];
      if (prevSaved) {
        const prevItem = prevSaved.find((r) => r.item === itemName);
        if (prevItem) {
          const closing =
            (Number(prevItem.prev) || 0) +
            (Number(prevItem.received) || 0) -
            (Number(prevItem.used) || 0);
          return Math.max(0, roundStock(closing));
        }
      }
      // If no saved history exists, carry forward from previous-previous month recursively or initial stock
      const prevStockVal = getOpeningStock(
        prevMonth,
        prevYear,
        prevClass,
        itemName,
        depth + 1,
        customRegisterRecords,
        customIncomingRecords,
      );
      if (prevStockVal > 0) return prevStockVal;
      const itemKey = getItemKeyFromName(itemName);
      return parseFloat(openingStockValues[itemName] || openingStockValues[itemKey] || "0") || 0;
    }

    // No saved snapshot or we have active data → calculate previous month's closing on the fly
    const prevOpening = getOpeningStock(
      prevMonth,
      prevYear,
      prevClass,
      itemName,
      depth + 1,
      customRegisterRecords,
      customIncomingRecords,
    );
    const prevKeyData = customIncomingRecords[prevKey] || {};
    const prevReceived = Number(prevKeyData[itemName]) || 0;

    // Calculate used for prev month on the fly using custom/live records
    let prevUsed = 0;
    const isPrevPrimary = prevClass === "1 To 5";
    Object.keys(customRegisterRecords || {}).forEach((dateStr) => {
      const parts = dateStr.split("-");
      if (parts.length !== 3) return;
      const recYear = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      if (monthIndex < 0 || monthIndex > 11) return;
      const recMonth = monthNames[monthIndex];

      if (
        recYear !== prevYear ||
        recMonth.toLowerCase() !== prevMonth.toLowerCase()
      )
        return;

      const record = customRegisterRecords[dateStr];
      if (!record) return;
      const classRecord = record[prevClass] || (prevClass === "1 To 5" ? record : null);
      if (!classRecord) return;
      const bene = Number(classRecord.beneficiary) || 0;
      if (bene === 0) return;

      const selectedItems = classRecord.selectedItems || getSelectedItemsForRegisterDate(dateStr, prevClass);
      const wasSelected = selectedItems
        ? !!selectedItems[itemName]
        : false;
      if (!wasSelected) return;

      const rule = quantityRules.find(
        (r) => r.item.toLowerCase() === itemName.toLowerCase(),
      );
      if (!rule) return;

      const qtyStr = isPrevPrimary ? rule.qty15 : rule.qty68;
      const qty = Number(qtyStr) || 0;
      if (qty <= 0) return;

      const qtyKg = qty >= 1 ? qty / 1000 : qty;
      prevUsed += qtyKg * bene;
    });
    prevUsed = roundStock(prevUsed);

    const closing = prevOpening + prevReceived - prevUsed;
    return Math.max(0, roundStock(closing));
  };

  // Auto-calculate Received, Borrowed, Spent, & Auto Carry-Forward Opening Stock for selected openingStockDate
  useEffect(() => {
    if (!openingStockDate) return;

    const targetDate = openingStockDate.trim();

    // Parse year and month from openingStockDate (YYYY-MM-DD)
    const parts = targetDate.split("-");
    let targetYear = "2026";
    let targetMonth = "August";

    if (parts.length === 3) {
      targetYear = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      if (monthIdx >= 0 && monthIdx <= 11) {
        targetMonth = monthNames[monthIdx];
      }
    }

    // 1. Calculate Received from incRecords for this date
    const recMap: Record<string, number> = {};
    incRecords.forEach((r) => {
      if (r.date && r.date.trim() === targetDate && r.item && r.qty) {
        const itemKey = getItemKeyFromName(r.item);
        recMap[itemKey] = (recMap[itemKey] || 0) + (parseFloat(r.qty) || 0);
      }
    });

    // 2. Calculate Borrowed (Usna / Loksahabhag) from lokRecords for this date
    const borMap: Record<string, number> = {};
    lokRecords.forEach((r) => {
      if (r.date && r.date.trim() === targetDate && r.item && r.qty) {
        const itemKey = getItemKeyFromName(r.item);
        borMap[itemKey] = (borMap[itemKey] || 0) + (parseFloat(r.qty) || 0);
      }
    });

    // 3. Stored date-wise data from Firestore if available
    const storedDateData = openingStockDateMap[targetDate];

    // Compute for all report items
    const newReceived: Record<string, string> = {};
    const newBorrowed: Record<string, string> = {};
    const newValues: Record<string, string> = {};

    REPORT_ITEMS.forEach((item) => {
      const recVal = recMap[item.key] ?? (storedDateData?.received?.[item.key] ? parseFloat(storedDateData.received[item.key]) : 0);
      newReceived[item.key] = recVal.toString();

      const borVal = borMap[item.key] ?? (storedDateData?.borrowed?.[item.key] ? parseFloat(storedDateData.borrowed[item.key]) : 0);
      newBorrowed[item.key] = borVal.toString();

      // Auto Carry Forward: If user hasn't explicitly saved a custom value for this date, carry forward from previous month
      if (storedDateData?.values?.[item.key] !== undefined && storedDateData.values[item.key] !== "") {
        newValues[item.key] = storedDateData.values[item.key];
      } else {
        const carriedVal = getOpeningStock(targetMonth, targetYear, "1 To 5", item.key);
        newValues[item.key] = carriedVal > 0 ? carriedVal.toString() : "0";
      }
    });

    setOpeningStockReceived(newReceived);
    setOpeningStockBorrowed(newBorrowed);
    setOpeningStockValues(newValues);

    if (storedDateData?.signs) {
      setOpeningStockSigns(storedDateData.signs);
    }
    if (storedDateData?.spent) {
      setOpeningStockSpent(storedDateData.spent);
    }
    if ((storedDateData as any)?.borrowedIn) {
      setOpeningStockBorrowedIn((storedDateData as any).borrowedIn);
    } else {
      setOpeningStockBorrowedIn({});
    }
    if ((storedDateData as any)?.borrowedOut) {
      setOpeningStockBorrowedOut((storedDateData as any).borrowedOut);
    } else {
      setOpeningStockBorrowedOut({});
    }
    if ((storedDateData as any)?.loksahabhag) {
      setOpeningStockLoksahabhag((storedDateData as any).loksahabhag);
    } else {
      setOpeningStockLoksahabhag({});
    }
  }, [
    openingStockDate,
    incRecords,
    lokRecords,
    openingStockDateMap,
    registerRecords,
    stockRecordsHistory,
    quantityRules
  ]);

  // ─── Reactive Stock Recalculation ─────────────────────────────────────────
  useEffect(() => {
    if (
      stockYear === "Select Year" ||
      stockMonth === "Select Month" ||
      stockClass === "Select Class"
    )
      return;

    const recordKey = `${stockYear}_${stockMonth}_${stockClass}`;
    const incomingData = incomingRecords[recordKey] || {};
    const isPrimary = stockClass === "1 To 5";

    setStockRecords((prevRecords) => {
      const updated = prevRecords.map((item) => {
        // ── 1. Received this month (from Incoming Entry + Loksahabhag tabs + incRecords) ────────────────
        let incTabQty = 0;
        const itemKey = getItemKeyFromName(item.item);
        incRecords.forEach((r) => {
          if (!r.date || !r.item || !r.qty) return;
          if (stockAsOnDate && r.date.trim() > stockAsOnDate.trim()) return;
          const rKey = getItemKeyFromName(r.item);
          const isMatch = (rKey && rKey === itemKey) || r.item.toLowerCase().trim() === item.item.toLowerCase().trim();
          if (isMatch) {
            const parts = r.date.split("-");
            if (parts.length === 3) {
              const recYear = parts[0];
              const monthIndex = parseInt(parts[1], 10) - 1;
              const monthNames = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
              ];
              if (monthIndex >= 0 && monthIndex <= 11) {
                const recMonth = monthNames[monthIndex];
                if (recYear === stockYear && recMonth.toLowerCase() === stockMonth.toLowerCase()) {
                  incTabQty += parseFloat(r.qty) || 0;
                }
              }
            }
          }
        });

        const incomingQty = roundStock((Number(incomingData[item.item]) || Number(incomingData[itemKey]) || 0) + incTabQty);
        const lokQty = roundStock(getLokForMonth(item.item, stockMonth, Number(stockYear) || 2026, stockAsOnDate));
        const received = roundStock(incomingQty + lokQty);
        const damaged = roundStock(getDamagedForMonth(item.item, stockMonth, Number(stockYear) || 2026));

        // ── 2. Previous month closing stock (carry-forward chain) ───────────
        const prev = roundStock(getOpeningStock(
          stockMonth,
          stockYear,
          stockClass,
          item.item,
        ));

        // ── 3. Used this month (from Daily Register + Quantity Rules + Menu) ─
        let totalUsedKg = 0;
        let cookedDays = 0;
        let benefSum = 0;
        const seenDates = new Set<string>();

        Object.keys(registerRecords || {}).forEach((dateStr) => {
          const parts = dateStr.split("-");
          if (parts.length !== 3) return;
          const recYear = parts[0];
          const monthIndex = parseInt(parts[1], 10) - 1;
          const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
          ];
          if (monthIndex < 0 || monthIndex > 11) return;
          const recMonth = monthNames[monthIndex];

          if (
            recYear !== stockYear ||
            recMonth.toLowerCase() !== stockMonth.toLowerCase()
          )
            return;

          // Date cutoff filter: ignore register entries after stockAsOnDate
          if (stockAsOnDate && dateStr.trim() > stockAsOnDate.trim()) return;

          const record = registerRecords[dateStr];
          if (!record) return;
          const classRecord = record[stockClass] || (stockClass === "1 To 5" ? record : null);
          if (!classRecord) return;
          const bene = Number(classRecord.beneficiary) || 0;

          // Count cooked days & total beneficiaries (once per date)
          if (bene > 0 && !seenDates.has(dateStr)) {
            seenDates.add(dateStr);
            cookedDays++;
            benefSum += bene;
          }

          // Only count this item if it was used this day
          const selectedItems = classRecord.selectedItems || getSelectedItemsForRegisterDate(dateStr, stockClass);
          const wasSelected = selectedItems
            ? !!selectedItems[item.item]
            : false;
          if (!wasSelected || bene === 0) return;

          const rule = quantityRules.find(
            (r) => r.item.toLowerCase() === item.item.toLowerCase(),
          );
          if (!rule) return;

          const qtyStr = isPrimary ? rule.qty15 : rule.qty68;
          const qty = Number(qtyStr) || 0;
          if (qty <= 0) return;

          // qty >= 1 means value is stored in grams → convert to kg
          const qtyKg = qty >= 1 ? qty / 1000 : qty;
          totalUsedKg += qtyKg * bene;
        });

        const used = roundStock(totalUsedKg);
        const beneficiary = benefSum; // total beneficiaries this month

        return {
          ...item,
          prev,
          received,
          used,
          damaged,
          cookedDays,
          beneficiary,
        };
      });

      // Avoid unnecessary re-renders
      return JSON.stringify(prevRecords) === JSON.stringify(updated)
        ? prevRecords
        : updated;
    });
  }, [
    stockYear,
    stockMonth,
    stockClass,
    stockAsOnDate,
    incRecords,
    incomingRecords,
    registerRecords,
    quantityRules,
  ]);

  // ─── Low Stock Warning Computation & Auto-Trigger ─────────────────────────
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [dismissedLowStockHash, setDismissedLowStockHash] = useState("");

  const lowStockItems = React.useMemo(() => {
    if (!stockRecords || stockRecords.length === 0) return [];

    return stockRecords
      .map((rec) => {
        const remaining = Math.max(
          0,
          (rec.prev || 0) + (rec.received || 0) - (rec.used || 0) - (rec.damaged || 0)
        );
        const isLiter = rec.item.toLowerCase().includes("oil") || rec.item.toLowerCase().includes("milk");
        const unitStr = isLiter ? "liter" : "kg";
        const unitMrStr = isLiter ? "लिटर" : "kg";
        const nameMr = getTranslatedItem(rec.item);

        return {
          itemKey: rec.item,
          nameMr,
          remaining: Number(remaining.toFixed(3)),
          unit: unitStr,
          unitMr: unitMrStr,
          isLow: remaining < 10,
        };
      })
      .filter((it) => it.isLow);
  }, [stockRecords, lang, t_global]);

  useEffect(() => {
    if (lowStockItems.length > 0) {
      const currentHash = JSON.stringify(lowStockItems);
      if (currentHash !== dismissedLowStockHash) {
        setShowLowStockModal(true);
      }
    } else {
      setShowLowStockModal(false);
      setDismissedLowStockHash("");
    }
  }, [lowStockItems, dismissedLowStockHash]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    // Subscribe to MDM data specific to school
    const udise = getUdise();
    const unsubscribe = onSnapshot(
      doc(db, "school_data", `${udise}_mdm`),
      (snapshot) => {
        if (snapshot.exists()) {
          const firestoreData = snapshot.data();
          if (firestoreData.dailyRecord)
            setDailyRecord(firestoreData.dailyRecord);
          // Fetch or auto-update quantity rules to match standard quantities from user's screenshots
          if (firestoreData.quantityTabRules) {
            const rules = firestoreData.quantityTabRules;
            if (rules.length === INITIAL_QUANTITY_TAB_RULES.length) {
              // Check if values match
              const valuesMatch = !INITIAL_QUANTITY_TAB_RULES.some((initRule) => {
                const match = rules.find((r: any) => r.item === initRule.item);
                return (
                  !match ||
                  match.qty15 !== initRule.qty15 ||
                  match.qty68 !== initRule.qty68
                );
              });
              if (valuesMatch) {
                setQuantityRules(rules);
              } else {
                setQuantityRules(INITIAL_QUANTITY_TAB_RULES);
                if (!(window as any).__mdm_rules_updated) {
                  (window as any).__mdm_rules_updated = true;
                  setDoc(
                    doc(db, "school_data", `${udise}_mdm`),
                    {
                      quantityTabRules: INITIAL_QUANTITY_TAB_RULES,
                      updatedAt: new Date().toISOString(),
                    },
                    { merge: true },
                  ).catch(console.error);
                }
              }
            } else {
              // Force local 18 rules if length mismatch (e.g. old 23 rules stored in db)
              setQuantityRules(INITIAL_QUANTITY_TAB_RULES);
              if (!(window as any).__mdm_rules_updated) {
                (window as any).__mdm_rules_updated = true;
                setDoc(
                  doc(db, "school_data", `${udise}_mdm`),
                  {
                    quantityTabRules: INITIAL_QUANTITY_TAB_RULES,
                    updatedAt: new Date().toISOString(),
                  },
                  { merge: true },
                ).catch(console.error);
              }
            }
          } else {
            setDoc(
              doc(db, "school_data", `${udise}_mdm`),
              {
                quantityTabRules: INITIAL_QUANTITY_TAB_RULES,
                updatedAt: new Date().toISOString(),
              },
              { merge: true },
            ).catch(console.error);
            setQuantityRules(INITIAL_QUANTITY_TAB_RULES);
          }
          if (firestoreData.weeklyMenu) setWeeklyMenu(firestoreData.weeklyMenu);
          if (firestoreData.stockInventory) {
            const filteredInventory = INITIAL_QUANTITY_TAB_RULES.map((initRule) => {
              const match = firestoreData.stockInventory.find((r: any) => r.item === initRule.item);
              const defaultMatch = DEFAULT_STOCK.find((r: any) => r.item === initRule.item);
              return match || defaultMatch || {
                item: initRule.item,
                itemMr: initRule.item,
                unit: initRule.item === "Oil" ? "liter" : "kg",
                opening: 0,
                added: 0,
                consumed: 0,
                closing: 0
              };
            });
            setStockInventory(filteredInventory);
          }
          if (firestoreData.helpers) setHelpers(firestoreData.helpers);
          if (firestoreData.incomingRecord) {
            if (firestoreData.incomingRecord.year)
              setIncomingYear(firestoreData.incomingRecord.year);
            if (firestoreData.incomingRecord.month)
              setIncomingMonth(firestoreData.incomingRecord.month);
            if (firestoreData.incomingRecord.class)
              setIncomingClass(firestoreData.incomingRecord.class);
            if (firestoreData.incomingRecord.quantities) {
              const filteredQuantities: Record<string, string> = {};
              INITIAL_QUANTITY_TAB_RULES.forEach((initRule) => {
                filteredQuantities[initRule.item] = firestoreData.incomingRecord.quantities[initRule.item] || "";
              });
              setIncomingQuantities(filteredQuantities);
            }
          }
          if (firestoreData.menuRecords) {
            setMenuRecords(firestoreData.menuRecords);
          }
          if (firestoreData.incomingRecords) {
            const filteredIncomingRecords: Record<string, Record<string, string>> = {};
            Object.entries(firestoreData.incomingRecords).forEach(([key, record]: [string, any]) => {
              const filteredQuantities: Record<string, string> = {};
              INITIAL_QUANTITY_TAB_RULES.forEach((initRule) => {
                filteredQuantities[initRule.item] = record[initRule.item] || "";
              });
              filteredIncomingRecords[key] = filteredQuantities;
            });
            setIncomingRecords(filteredIncomingRecords);
          }
          if (firestoreData.stockRecordsHistory) {
            setStockRecordsHistory(firestoreData.stockRecordsHistory);
          }
          if (firestoreData.registerRecords) {
            setRegisterRecords(firestoreData.registerRecords);
          }
          if (firestoreData.stockRecords) {
            const filteredStockRecords = INITIAL_QUANTITY_TAB_RULES.map((initRule) => {
              const match = firestoreData.stockRecords.find((r: any) => r.item === initRule.item);
              return match || {
                item: initRule.item,
                prev: 0,
                received: 0,
                cookedDays: 0,
                beneficiary: 0,
                used: 0
              };
            });
            setStockRecords(filteredStockRecords);
          }
          if (firestoreData.menuRecord) {
            if (firestoreData.menuRecord.day)
              setMenuDay(firestoreData.menuRecord.day);
            if (firestoreData.menuRecord.type)
              setMenuType(firestoreData.menuRecord.type);
            if (firestoreData.menuRecord.selectedItems) {
              const filteredSelected: Record<string, boolean> = {};
              INITIAL_QUANTITY_TAB_RULES.forEach((initRule) => {
                filteredSelected[initRule.item] = !!firestoreData.menuRecord.selectedItems[initRule.item];
              });
              setSelectedMenuItems(filteredSelected);
            }
          }
          if (firestoreData.registerRecord) {
            if (firestoreData.registerRecord.date)
              setRegisterDate(firestoreData.registerRecord.date);
            if (firestoreData.registerRecord.class)
              setRegisterClass(firestoreData.registerRecord.class);
            if (firestoreData.registerRecord.day)
              setRegisterDay(firestoreData.registerRecord.day);
          }
          if (firestoreData.stockRecord) {
            if (firestoreData.stockRecord.year)
              setStockYear(firestoreData.stockRecord.year);
            if (firestoreData.stockRecord.month)
              setStockMonth(firestoreData.stockRecord.month);
            if (firestoreData.stockRecord.class)
              setStockClass(firestoreData.stockRecord.class);
          }
          if (firestoreData.demandRecord) {
            if (firestoreData.demandRecord.fromDate)
              setDemandFromDate(firestoreData.demandRecord.fromDate);
            if (firestoreData.demandRecord.toDate)
              setDemandToDate(firestoreData.demandRecord.toDate);
            if (firestoreData.demandRecord.content)
              setDemandContent(firestoreData.demandRecord.content);
            if (firestoreData.demandRecord.quantity)
              setDemandQty(firestoreData.demandRecord.quantity);
            if (firestoreData.demandRecord.records)
              setDemandRecords(firestoreData.demandRecord.records);
          }
          if (firestoreData.tasteReport) {
            if (firestoreData.tasteReport.month)
              setTasteMonth(firestoreData.tasteReport.month);
            if (firestoreData.tasteReport.year)
              setTasteYear(firestoreData.tasteReport.year);
            if (firestoreData.tasteReport.rows)
              setTasteRows(firestoreData.tasteReport.rows);
          }
          if (firestoreData.eggBananaRecord) {
            if (firestoreData.eggBananaRecord.date)
              setEggBananaDate(firestoreData.eggBananaRecord.date);
            if (firestoreData.eggBananaRecord.remark)
              setEggBananaRemark(firestoreData.eggBananaRecord.remark);
            if (firestoreData.eggBananaRecord.egg15)
              setEggBeneficiary15(firestoreData.eggBananaRecord.egg15);
            if (firestoreData.eggBananaRecord.egg68)
              setEggBeneficiary68(firestoreData.eggBananaRecord.egg68);
            if (firestoreData.eggBananaRecord.banana15)
              setBananaBeneficiary15(firestoreData.eggBananaRecord.banana15);
            if (firestoreData.eggBananaRecord.banana68)
              setBananaBeneficiary68(firestoreData.eggBananaRecord.banana68);
            if (firestoreData.eggBananaRecord.records)
              setEggBananaRecords(firestoreData.eggBananaRecord.records);
          }
          if (firestoreData.monthlyCalendar) {
            setMonthlyCalendarRecords(firestoreData.monthlyCalendar);
          }
          if (firestoreData.incRecords && Array.isArray(firestoreData.incRecords)) {
            setIncRecords(firestoreData.incRecords);
          } else if (firestoreData.incomingRecordsList && Array.isArray(firestoreData.incomingRecordsList)) {
            setIncRecords(firestoreData.incomingRecordsList);
          } else if (firestoreData.incomingRecords && Array.isArray(firestoreData.incomingRecords)) {
            setIncRecords(firestoreData.incomingRecords);
          }
          if (firestoreData.lokRecords && Array.isArray(firestoreData.lokRecords)) {
            setLokRecords(firestoreData.lokRecords);
          }
          if (firestoreData.openingStockDateWise) {
            setOpeningStockDateMap(firestoreData.openingStockDateWise);
          }
          if (firestoreData.openingStock) {
            setOpeningStockValues(firestoreData.openingStock);
          }
          if (firestoreData.openingStockSigns) {
            setOpeningStockSigns(firestoreData.openingStockSigns);
          }
          if (firestoreData.openingStockReceived) {
            setOpeningStockReceived(firestoreData.openingStockReceived);
          }
          if (firestoreData.openingStockBorrowed) {
            setOpeningStockBorrowed(firestoreData.openingStockBorrowed);
          }
          if (firestoreData.openingStockSpent) {
            setOpeningStockSpent(firestoreData.openingStockSpent);
          }
          if (firestoreData.openingStockBorrowedIn) {
            setOpeningStockBorrowedIn(firestoreData.openingStockBorrowedIn);
          }
          if (firestoreData.openingStockBorrowedOut) {
            setOpeningStockBorrowedOut(firestoreData.openingStockBorrowedOut);
          }
          if (firestoreData.openingStockLoksahabhag) {
            setOpeningStockLoksahabhag(firestoreData.openingStockLoksahabhag);
          }
          if (firestoreData.formulaSource) {
            setFormulaSource(firestoreData.formulaSource);
          }
          if (firestoreData.formulaRecipe) {
            setFormulaRecipe(firestoreData.formulaRecipe);
          }
          if (firestoreData.anudanSettings) {
            if (firestoreData.anudanSettings.year) setAnudanYear(firestoreData.anudanSettings.year);
            if (firestoreData.anudanSettings.effectiveDate) setEffectiveDate(firestoreData.anudanSettings.effectiveDate);
            if (firestoreData.anudanSettings.primaryRate) setPrimaryRate(firestoreData.anudanSettings.primaryRate);
            if (firestoreData.anudanSettings.primaryKendraShare) setPrimaryKendraShare(firestoreData.anudanSettings.primaryKendraShare);
            if (firestoreData.anudanSettings.primaryRajyaShare) setPrimaryRajyaShare(firestoreData.anudanSettings.primaryRajyaShare);
            if (firestoreData.anudanSettings.upperRate) setUpperRate(firestoreData.anudanSettings.upperRate);
            if (firestoreData.anudanSettings.upperKendraShare) setUpperKendraShare(firestoreData.anudanSettings.upperKendraShare);
            if (firestoreData.anudanSettings.upperRajyaShare) setUpperRajyaShare(firestoreData.anudanSettings.upperRajyaShare);
            if (firestoreData.anudanSettings.eggRate) setEggRate(firestoreData.anudanSettings.eggRate);
            if (firestoreData.anudanSettings.vegPercent) setVegPercent(firestoreData.anudanSettings.vegPercent);
            if (firestoreData.anudanSettings.fuelPercent) setFuelPercent(firestoreData.anudanSettings.fuelPercent);
            if (firestoreData.anudanSettings.history) setAnudanHistory(firestoreData.anudanSettings.history);
          }
        }
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user, profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const udise = getUdise();
      await setDoc(
        doc(db, "school_data", `${udise}_mdm`),
        {
          dailyRecord,
          weeklyMenu,
          stockInventory,
          helpers,
          stockRecords,
          registerRecords,
          menuRecords,
          updatedAt: new Date().toISOString(),
          updatedBy: user.uid,
        },
        { merge: true },
      );
      toast.success(t("माहिती यशस्वीरित्या जतन केली!", "Saved Successfully!"));
    } catch (e) {
      console.error(e);
      toast.error(
        t("माहिती जतन करण्यात अडचण आली.", "Failed to save database sync"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveIncoming = async () => {
    if (!user) return;
    if (
      incomingYear === "Select Year" ||
      incomingMonth === "Select Month" ||
      incomingClass === "Select Class"
    ) {
      toast.warning(
        t(
          "कृपया वर्ष, महिना आणि इयत्ता निवडा.",
          "Please select Year, Month, and Class first.",
        ),
      );
      return;
    }
    setSaving(true);
    try {
      const udise = getUdise();
      const recordKey = `${incomingYear}_${incomingMonth}_${incomingClass}`;

      const updatedRecords = {
        ...incomingRecords,
        [recordKey]: incomingQuantities,
      };
      setIncomingRecords(updatedRecords);

      // Recalculate stockRecordsHistory for the modified key using updated incoming data
      const computedStock = computeStockRecordsForKey(recordKey, registerRecords, updatedRecords);
      const updatedHistory = {
        ...stockRecordsHistory,
        [recordKey]: computedStock,
      };
      setStockRecordsHistory(updatedHistory);

      await setDoc(
        doc(db, "school_data", `${udise}_mdm`),
        {
          dailyRecord,
          weeklyMenu,
          stockInventory,
          helpers,
          incomingRecord: {
            year: incomingYear,
            month: incomingMonth,
            class: incomingClass,
            quantities: incomingQuantities,
          },
          incomingRecords: updatedRecords,
          stockRecords,
          registerRecords,
          menuRecords,
          stockRecordsHistory: updatedHistory,
          updatedAt: new Date().toISOString(),
          updatedBy: user.uid,
        },
        { merge: true },
      );
      toast.success(t("माहिती यशस्वीरित्या जतन केली!", "Saved Successfully!"));
    } catch (e) {
      console.error(e);
      toast.error(
        t("आवक जतन करण्यात अडचण आली.", "Failed to save incoming entry"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleIncomingReport = () => {
    if (
      incomingYear === "Select Year" ||
      incomingMonth === "Select Month" ||
      incomingClass === "Select Class"
    ) {
      toast.warning(
        t(
          "कृपया वर्ष, महिना आणि इयत्ता निवडा.",
          "Please select Year, Month, and Class.",
        ),
      );
      return;
    }
    setShowIncomingReportModal(true);
  };

  const handleSaveMenu = async () => {
    if (!user) return;
    if (!menuType || menuType === "Select Menu") {
      toast.warning(t("कृपया प्रथम ड्रॉपडाउनमधून पाककृती (Recipe) निवडा.", "Please select a Recipe first."));
      return;
    }
    setSaving(true);
    try {
      const udise = getUdise();
      const updatedRecipeMap = {
        ...recipeIngredientsMap,
        [menuType]: selectedMenuItems,
      };
      setRecipeIngredientsMap(updatedRecipeMap);

      const updatedRecords = {
        ...menuRecords,
        ...(menuDay && menuDay !== "Select Day" ? {
          [menuDay]: {
            menu: menuType,
            selectedItems: selectedMenuItems,
          }
        } : {})
      };
      setMenuRecords(updatedRecords);

      await setDoc(
        doc(db, "school_data", `${getUdise()}_mdm`),
        {
          dailyRecord,
          weeklyMenu,
          stockInventory,
          helpers,
          incomingRecord: {
            year: incomingYear,
            month: incomingMonth,
            class: incomingClass,
            quantities: incomingQuantities,
          },
          registerRecord: {
            date: registerDate,
            class: registerClass,
            day: registerDay,
            beneficiary: registerBeneficiary,
          },
          stockRecord: {
            year: stockYear,
            month: stockMonth,
            class: stockClass,
          },
          demandRecord: {
            fromDate: demandFromDate,
            toDate: demandToDate,
            content: demandContent,
            quantity: demandQty,
            records: demandRecords,
          },
          eggBananaRecord: {
            date: eggBananaDate,
            remark: eggBananaRemark,
            egg15: eggBeneficiary15,
            egg68: eggBeneficiary68,
            banana15: bananaBeneficiary15,
            banana68: bananaBeneficiary68,
            records: eggBananaRecords,
          },
          menuRecord: {
            day: menuDay,
            type: menuType,
            selectedItems: selectedMenuItems,
          },
          menuRecords: updatedRecords,
          recipeIngredientsMap: updatedRecipeMap,
          stockRecords,
          registerRecords,
          updatedAt: new Date().toISOString(),
          updatedBy: user.uid,
        },
        { merge: true },
      );
      toast.success(t("माहिती यशस्वीरित्या जतन केली!", "Saved Successfully!"));
    } catch (e) {
      console.error(e);
      toast.error(
        t("मेन्यू जतन करण्यात अडचण आली.", "Failed to save food menu"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReportMenu = () => {
    setShowMenuReportModal(true);
  };

  const handleSaveRegister = async () => {
    if (!user) return;
    if (!registerDate) {
      toast.warning(t("कृपया तारीख निवडा.", "Please select a Date first."));
      return;
    }
    const disableCheck = checkIsDateDisabled(registerDate);
    if (disableCheck.disabled) {
      toast.error(
        t(
          "आज सुट्टी असल्यामुळे हजेरी आणि साठा वजावट नोंदवता येणार नाही.",
          "Attendance and stock deduction cannot be recorded on Sundays or Holidays."
        )
      );
      return;
    }
    setSaving(true);
    try {
      const udise = getUdise();
      const currentMenu = getMenuForRegisterDate(registerDate);
      const currentSelectedItems =
        getSelectedItemsForRegisterDate(registerDate) || {};

      const currentDayRecord = registerRecords[registerDate] || {};
      const updatedRecords = {
        ...registerRecords,
        [registerDate]: {
          ...currentDayRecord,
          [registerClass]: {
            enrolled: registerClass === "1 To 5" ? "45" : "35",
            beneficiary: registerBeneficiary || "0",
            menu: currentMenu,
            selectedItems: currentSelectedItems,
          },
          // Flat fallback fields for backward compatibility
          enrolled: registerClass === "1 To 5" ? "45" : "35",
          beneficiary: registerBeneficiary || "0",
          menu: currentMenu,
          selectedItems: currentSelectedItems,
        },
      };
      setRegisterRecords(updatedRecords);

      const d = new Date(registerDate);
      const regYear = d.getFullYear().toString();
      const monthNamesEng = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const regMonth = monthNamesEng[d.getMonth()];

      // Calculate updated stock records for BOTH class groups: "1 To 5" and "6 To 8"
      const keyPrimary = `${regYear}_${regMonth}_1 To 5`;
      const keyUpper = `${regYear}_${regMonth}_6 To 8`;

      const stockPrim = computeStockRecordsForKey(keyPrimary, updatedRecords, incomingRecords);
      const stockUpp = computeStockRecordsForKey(keyUpper, updatedRecords, incomingRecords);

      const updatedHistory = {
        ...stockRecordsHistory,
        [keyPrimary]: stockPrim,
        [keyUpper]: stockUpp,
      };
      setStockRecordsHistory(updatedHistory);

      await setDoc(
        doc(db, "school_data", `${getUdise()}_mdm`),
        {
          dailyRecord,
          weeklyMenu,
          stockInventory,
          helpers,
          incomingRecord: {
            year: incomingYear,
            month: incomingMonth,
            class: incomingClass,
            quantities: incomingQuantities,
          },
          menuRecord: {
            day: menuDay,
            type: menuType,
            selectedItems: selectedMenuItems,
          },
          menuRecords,
          stockRecord: {
            year: stockYear,
            month: stockMonth,
            class: stockClass,
          },
          demandRecord: {
            fromDate: demandFromDate,
            toDate: demandToDate,
            content: demandContent,
            quantity: demandQty,
            records: demandRecords,
          },
          eggBananaRecord: {
            date: eggBananaDate,
            remark: eggBananaRemark,
            egg15: eggBeneficiary15,
            egg68: eggBeneficiary68,
            banana15: bananaBeneficiary15,
            banana68: bananaBeneficiary68,
            records: eggBananaRecords,
          },
          registerRecord: {
            date: registerDate,
            class: registerClass,
            day: registerDay,
            beneficiary: registerBeneficiary,
          },
          registerRecords: updatedRecords,
          stockRecords,
          stockRecordsHistory: updatedHistory,
          updatedAt: new Date().toISOString(),
          updatedBy: user.uid,
        },
        { merge: true },
      );
      toast.success(t("माहिती यशस्वीरित्या जतन केली!", "Saved Successfully!"));
    } catch (e) {
      console.error(e);
      toast.error(
        t("नोंदवही जतन करण्यात अडचण आली.", "Failed to save daily register"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRiceReport = () => {
    setShowRiceReportModal(true);
  };

  const handleGeneralReport = () => {
    setShowDailyRegisterReportModal(true);
  };

  const handleSaveStock = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const udise = getUdise();
      const recordKey = `${stockYear}_${stockMonth}_${stockClass}`;
      const updatedHistory = {
        ...stockRecordsHistory,
        [recordKey]: stockRecords,
      };
      setStockRecordsHistory(updatedHistory);

      await setDoc(
        doc(db, "school_data", `${getUdise()}_mdm`),
        {
          dailyRecord,
          weeklyMenu,
          stockInventory,
          helpers,
          incomingRecord: {
            year: incomingYear,
            month: incomingMonth,
            class: incomingClass,
            quantities: incomingQuantities,
          },
          menuRecord: {
            day: menuDay,
            type: menuType,
            selectedItems: selectedMenuItems,
          },
          menuRecords,
          registerRecord: {
            date: registerDate,
            class: registerClass,
            day: registerDay,
            beneficiary: registerBeneficiary,
          },
          registerRecords,
          stockRecord: {
            year: stockYear,
            month: stockMonth,
            class: stockClass,
          },
          stockRecords,
          stockRecordsHistory: updatedHistory,
          updatedAt: new Date().toISOString(),
          updatedBy: user.uid,
        },
        { merge: true },
      );
      toast.success(t("माहिती यशस्वीरित्या जतन केली!", "Saved Successfully!"));
    } catch (e) {
      console.error(e);
      toast.error(
        t("साठा जतन करण्यात अडचण आली.", "Failed to save current stock"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleViewStockData = () => {
    if (
      stockYear === "Select Year" ||
      stockMonth === "Select Month" ||
      stockClass === "Select Class"
    ) {
      toast.warning(
        t(
          "कृपया वर्ष, महिना आणि इयत्ता निवडा.",
          "Please select Year, Month, and Class.",
        ),
      );
      return;
    }
    setShowStockTable(true);
  };

  const handleStockReport = () => {
    setShowStockReportModal(true);
  };

  const handleDemandContentChange = (contentName: string) => {
    setDemandContent(contentName);
    if (contentName && contentName !== "Select content") {
      const rule = quantityRules.find(
        (r) => r.item.toLowerCase() === contentName.toLowerCase(),
      );
      if (rule) {
        const qtyPerStudentStr =
          stockClass === "1 To 5" ? rule.qty15 : rule.qty68;
        const qtyPerStudent = Number(qtyPerStudentStr) || 0;

        const dayCount = stockRecords.reduce(
          (acc, r) => acc + (r.cookedDays || 0),
          0,
        );
        const beneficiarySum = stockRecords.reduce(
          (acc, r) => acc + (r.beneficiary || 0),
          0,
        );
        const avgBeneficiaries =
          dayCount > 0 ? Math.round(beneficiarySum / stockRecords.length) : 45;

        const standardNeed =
          qtyPerStudent >= 1
            ? (qtyPerStudent * avgBeneficiaries * 24) / 1000
            : qtyPerStudent * avgBeneficiaries * 24;

        const stockItem = stockRecords.find(
          (r) => r.item.toLowerCase() === contentName.toLowerCase(),
        );
        const totalGoods = stockItem
          ? Number(stockItem.prev) + Number(stockItem.received)
          : 0;
        const remaining = stockItem ? totalGoods - Number(stockItem.used) : 0;

        const suggested = Math.max(0, Math.ceil(standardNeed - remaining));
        setDemandQty(suggested > 0 ? suggested.toString() : "50");
      } else {
        setDemandQty("");
      }
    } else {
      setDemandQty("");
    }
  };

  const handleSaveDemand = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const udise = getUdise();
      let updatedRecords = [...demandRecords];
      if (demandContent && demandContent !== "Select content" && demandQty) {
        const newRecord = {
          id: Date.now().toString(),
          date: new Date().toISOString().split("T")[0],
          content: demandContent,
          quantity: demandQty,
        };
        updatedRecords.push(newRecord);
        setDemandRecords(updatedRecords);
        setDemandContent("Select content");
        setDemandQty("");
      }

      await setDoc(
        doc(db, "school_data", `${udise}_mdm`),
        {
          dailyRecord,
          weeklyMenu,
          stockInventory,
          helpers,
          incomingRecord: {
            year: incomingYear,
            month: incomingMonth,
            class: incomingClass,
            quantities: incomingQuantities,
          },
          menuRecord: {
            day: menuDay,
            type: menuType,
            selectedItems: selectedMenuItems,
          },
          registerRecord: {
            date: registerDate,
            class: registerClass,
            day: registerDay,
            beneficiary: registerBeneficiary,
          },
          stockRecord: {
            year: stockYear,
            month: stockMonth,
            class: stockClass,
          },
          demandRecord: {
            fromDate: demandFromDate,
            toDate: demandToDate,
            content: "Select content",
            quantity: "",
            records: updatedRecords,
          },
          stockRecords,
          registerRecords,
          menuRecords,
          updatedAt: new Date().toISOString(),
          updatedBy: user.uid,
        },
        { merge: true },
      );
      toast.success(t("माहिती यशस्वीरित्या जतन केली!", "Saved Successfully!"));
    } catch (e) {
      console.error(e);
      toast.error(
        t("मागणी जतन करण्यात अडचण आली.", "Failed to save demand record"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDemandRecord = async (id: string) => {
    if (!user) return;
    const updated = demandRecords.filter((r) => r.id !== id);
    setDemandRecords(updated);
    setSaving(true);
    try {
      const udise = getUdise();
      await setDoc(
        doc(db, "school_data", `${udise}_mdm`),
        {
          dailyRecord,
          weeklyMenu,
          stockInventory,
          helpers,
          incomingRecord: {
            year: incomingYear,
            month: incomingMonth,
            class: incomingClass,
            quantities: incomingQuantities,
          },
          menuRecord: {
            day: menuDay,
            type: menuType,
            selectedItems: selectedMenuItems,
          },
          registerRecord: {
            date: registerDate,
            class: registerClass,
            day: registerDay,
            beneficiary: registerBeneficiary,
          },
          stockRecord: {
            year: stockYear,
            month: stockMonth,
            class: stockClass,
          },
          demandRecord: {
            fromDate: demandFromDate,
            toDate: demandToDate,
            content: demandContent,
            quantity: demandQty,
            records: updated,
          },
          stockRecords,
          registerRecords,
          menuRecords,
          updatedAt: new Date().toISOString(),
          updatedBy: user.uid,
        },
        { merge: true },
      );
      toast.success(
        t(
          "मागणी यशस्वीरित्या काढून टाकली!",
          "Demand Record Removed Successfully!",
        ),
      );
    } catch (e) {
      console.error(e);
      toast.error(
        t("मागणी काढून टाकण्यात अडचण आली.", "Failed to remove demand record"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDemandReport = () => {
    setShowDemandReportModal(true);
  };

  const handleSaveEggBanana = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const udise = getUdise();
      let updatedRecords = [...eggBananaRecords];

      const egg15 = Number(eggBeneficiary15) || 0;
      const egg68 = Number(eggBeneficiary68) || 0;
      const banana15 = Number(bananaBeneficiary15) || 0;
      const banana68 = Number(bananaBeneficiary68) || 0;

      if (eggBananaDate) {
        const newRecord = {
          id: Date.now().toString(),
          date: eggBananaDate,
          egg15,
          egg68,
          banana15,
          banana68,
          remark: eggBananaRemark,
        };
        updatedRecords.push(newRecord);
        setEggBananaRecords(updatedRecords);
        setEggBananaRemark("");
        setEggBeneficiary15("0");
        setEggBeneficiary68("0");
        setBananaBeneficiary15("0");
        setBananaBeneficiary68("0");
      }

      await setDoc(
        doc(db, "school_data", `${udise}_mdm`),
        {
          dailyRecord,
          weeklyMenu,
          stockInventory,
          helpers,
          incomingRecord: {
            year: incomingYear,
            month: incomingMonth,
            class: incomingClass,
            quantities: incomingQuantities,
          },
          menuRecord: {
            day: menuDay,
            type: menuType,
            selectedItems: selectedMenuItems,
          },
          registerRecord: {
            date: registerDate,
            class: registerClass,
            day: registerDay,
            beneficiary: registerBeneficiary,
          },
          stockRecord: {
            year: stockYear,
            month: stockMonth,
            class: stockClass,
          },
          demandRecord: {
            fromDate: demandFromDate,
            toDate: demandToDate,
            content: demandContent,
            quantity: demandQty,
            records: demandRecords,
          },
          eggBananaRecord: {
            date: "",
            remark: "",
            egg15: "0",
            egg68: "0",
            banana15: "0",
            banana68: "0",
            records: updatedRecords,
          },
          stockRecords,
          registerRecords,
          menuRecords,
          updatedAt: new Date().toISOString(),
          updatedBy: user.uid,
        },
        { merge: true },
      );
      toast.success(t("माहिती यशस्वीरित्या जतन केली!", "Saved Successfully!"));
    } catch (e) {
      console.error(e);
      toast.error(t("नोंद जतन करण्यात अडचण आली.", "Failed to save record"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEggBananaRecord = async (id: string) => {
    if (!user) return;
    const updated = eggBananaRecords.filter((r) => r.id !== id);
    setEggBananaRecords(updated);
    setSaving(true);
    try {
      const udise = getUdise();
      await setDoc(
        doc(db, "school_data", `${udise}_mdm`),
        {
          dailyRecord,
          weeklyMenu,
          stockInventory,
          helpers,
          incomingRecord: {
            year: incomingYear,
            month: incomingMonth,
            class: incomingClass,
            quantities: incomingQuantities,
          },
          menuRecord: {
            day: menuDay,
            type: menuType,
            selectedItems: selectedMenuItems,
          },
          registerRecord: {
            date: registerDate,
            class: registerClass,
            day: registerDay,
            beneficiary: registerBeneficiary,
          },
          stockRecord: {
            year: stockYear,
            month: stockMonth,
            class: stockClass,
          },
          demandRecord: {
            fromDate: demandFromDate,
            toDate: demandToDate,
            content: demandContent,
            quantity: demandQty,
            records: demandRecords,
          },
          eggBananaRecord: {
            date: eggBananaDate,
            remark: eggBananaRemark,
            egg15: eggBeneficiary15,
            egg68: eggBeneficiary68,
            banana15: bananaBeneficiary15,
            banana68: bananaBeneficiary68,
            records: updated,
          },
          stockRecords,
          registerRecords,
          menuRecords,
          updatedAt: new Date().toISOString(),
          updatedBy: user.uid,
        },
        { merge: true },
      );
      toast.success(
        t("नोंद यशस्वीरित्या काढून टाकली!", "Record Removed Successfully!"),
      );
    } catch (e) {
      console.error(e);
      toast.error(
        t("नोंद काढून टाकण्यात अडचण आली.", "Failed to remove record"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEggBananaReport = () => {
    setShowEggBananaReportModal(true);
  };

  const handleTasteRowChange = (
    index: number,
    field: string,
    value: string,
  ) => {
    const updated = [...tasteRows];
    (updated[index] as any)[field] = value;
    setTasteRows(updated);
  };

  const handleSaveTaste = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const udise = getUdise();
      await setDoc(
        doc(db, "school_data", `${udise}_mdm`),
        {
          dailyRecord,
          weeklyMenu,
          stockInventory,
          helpers,
          tasteReport: {
            month: tasteMonth,
            year: tasteYear,
            rows: tasteRows,
          },
          stockRecords,
          registerRecords,
          menuRecords,
          updatedAt: new Date().toISOString(),
          updatedBy: user.uid,
        },
        { merge: true },
      );
      toast.success(t("माहिती यशस्वीरित्या जतन केली!", "Saved Successfully!"));
    } catch (e) {
      console.error(e);
      toast.error(
        t("अहवाल जतन करण्यात अडचण आली.", "Failed to save taste report"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTasteReport = () => {
    const schoolName = profile?.schoolName || "";
    const taluka = profile?.taluka || "";
    const udise = getUdise();

    const tableRows = tasteRows
      .map((row) => {
        return `<tr>
        <td style="border:1px solid #000;padding:4px 6px;text-align:center;font-size:11px;width:40px;">${row.day}</td>
        <td style="border:1px solid #000;padding:4px 6px;text-align:center;font-size:11px;">${row.timeLoading}</td>
        <td style="border:1px solid #000;padding:4px 6px;text-align:center;font-size:11px;">${row.foodDistTime}</td>
        <td style="border:1px solid #000;padding:4px 6px;text-align:center;font-size:11px;">${row.todaysMenu}</td>
        <td style="border:1px solid #000;padding:4px 6px;text-align:center;font-size:11px;">${row.tasterName}</td>
        <td style="border:1px solid #000;padding:4px 6px;text-align:center;font-size:11px;">${row.comment}</td>
        <td style="border:1px solid #000;padding:4px 6px;text-align:center;font-size:11px;">${row.signature}</td>
      </tr>`;
      })
      .join("");

    const reportHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Taste Report - School Nutrition Scheme</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #000; padding: 30px 40px; }
          @media print {
            .no-print { display: none !important; }
            body { padding: 10px 20px; }
          }
        </style>
      </head>
      <body>
        <div style="max-width:750px;margin:0 auto;background:#fff;padding:30px;border:1px solid #ddd;border-radius:8px;">
          <!-- Header -->
          <div style="text-align:center;margin-bottom:10px;">
            <p style="font-size:14px;font-weight:700;letter-spacing:4px;">${schoolName}</p>
            <p style="font-size:11px;color:#555;margin:2px 0;">Taluka : ${taluka} &nbsp;&nbsp; Office</p>
            <p style="font-size:16px;font-weight:700;color:#004C99;margin:6px 0;">School Nutrition Scheme</p>
          </div>

          <!-- Sub-header -->
          <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:16px;">
            <span style="background:#004C99;color:#fff;padding:5px 12px;border-radius:4px;font-size:11px;font-weight:600;">Register about providing cooked food at the school level</span>
            <span style="font-size:11px;font-weight:600;">Month : ${tasteMonth}</span>
            <span style="font-size:11px;font-weight:600;">${tasteYear}</span>
          </div>

          <!-- Table -->
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="border:1px solid #000;padding:6px;text-align:center;font-size:10px;font-weight:700;width:40px;">Date</th>
                <th style="border:1px solid #000;padding:6px;text-align:center;font-size:10px;font-weight:700;">Time of loading</th>
                <th style="border:1px solid #000;padding:6px;text-align:center;font-size:10px;font-weight:700;">Food distribution Time</th>
                <th style="border:1px solid #000;padding:6px;text-align:center;font-size:10px;font-weight:700;">Today's Menu</th>
                <th style="border:1px solid #000;padding:6px;text-align:center;font-size:10px;font-weight:700;">Name of the taster</th>
                <th style="border:1px solid #000;padding:6px;text-align:center;font-size:10px;font-weight:700;">Comment on taste</th>
                <th style="border:1px solid #000;padding:6px;text-align:center;font-size:10px;font-weight:700;">Signature of the taster</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <!-- Footer -->
          <div style="margin-top:30px;display:flex;justify-content:space-between;font-size:11px;">
            <div style="text-align:center;">
              <p style="font-weight:700;">Principal</p>
              <p style="color:#555;">Signature and Stamp</p>
            </div>
            <div style="text-align:center;">
              <p style="font-weight:700;">President</p>
              <p style="color:#555;">Village/Ward/School Management Committee</p>
            </div>
          </div>

          <div style="text-align:center;margin-top:15px;font-size:9px;color:#888;">
            <p>Indir: Bhimasena Businesai Cookin Tool From Number: ${udise}</p>
          </div>

          <!-- Print Button -->
          <div class="no-print" style="text-align:right;margin-top:20px;">
            <button onclick="window.print()" style="background:#2196F3;color:#fff;border:none;padding:8px 24px;border-radius:4px;cursor:pointer;font-weight:700;font-size:13px;">Print</button>
          </div>
        </div>
      </body>
      </html>
    `;

    const reportWindow = window.open("", "_blank");
    if (reportWindow) {
      reportWindow.document.write(reportHTML);
      reportWindow.document.close();
    }
    toast.success(t("चव चाचणी अहवाल तयार झाला!", "Taste Report Generated!"));
  };

  const handleAddHelper = () => {
    if (!newHelper.name) return;
    const added = [
      ...helpers,
      {
        id: Date.now().toString(),
        name: newHelper.name,
        role: newHelper.role,
        roleMr:
          newHelper.role === "Chief Cook"
            ? "मुख्य स्वयंपाकी"
            : "मदतनीस स्वयंपाकी",
        status: "Active",
        attendance: "0/26 Days",
      },
    ];
    setHelpers(added);
    setNewHelper({
      name: "",
      role: "Assistant Cook",
      roleMr: "मदतनीस स्वयंपाकी",
    });
    toast.success(t("मदतनीस यशस्वीपणे जोडला!", "Helper Added Successfully!"));
  };

  const handleDeleteHelper = (id: string) => {
    const filtered = helpers.filter((h) => h.id !== id);
    setHelpers(filtered);
    toast.info(t("मदतनीस काढून टाकला", "Helper removed successfully"));
  };

  const handleStockChange = (
    index: number,
    field: "opening" | "added" | "consumed",
    value: number,
  ) => {
    const updated = [...stockInventory];
    updated[index][field] = value;
    // Auto calculate closing
    updated[index].closing =
      updated[index].opening + updated[index].added - updated[index].consumed;
    setStockInventory(updated);
  };

  const handleWeeklyMenuChange = (
    index: number,
    field: "dish" | "dishMr",
    value: string,
  ) => {
    const updated = [...weeklyMenu];
    updated[index][field] = value;
    setWeeklyMenu(updated);
  };

  const isQuantityChanged = (() => {
    if (!qtyContent) return false;
    const rule = quantityRules.find(
      (r) => r.item.toLowerCase() === qtyContent.toLowerCase(),
    );
    if (!rule) return false;
    const originalVal = qtyClass === "1-5" ? rule.qty15 : rule.qty68;
    return qtyAmount !== originalVal;
  })();

  const toMarathiNumbers = (str: string | null | undefined) => {
    if (!str) return "";
    const map: Record<string, string> = {
      '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
      '5': '५', '6': '६', '7': '७', '8': '८', '9': '९'
    };
    return str.split('').map(char => map[char] || char).join('');
  };

  // ---- Dynamic Report Helpers ----

  // Parse "2025-26" into [{month: "April", year: 2025}, ..., {month: "March", year: 2026}]
  const getAcademicYearMonths = (yearStr: string | null) => {
    if (!yearStr) return [];
    const parts = yearStr.split("-");
    if (parts.length !== 2) return [];
    const startYear = parseInt(parts[0]);
    const endYear = startYear + 1; // "2025-26" => 2025, 2026
    const months = [
      { month: "April", year: startYear },
      { month: "May", year: startYear },
      { month: "June", year: startYear },
      { month: "July", year: startYear },
      { month: "August", year: startYear },
      { month: "September", year: startYear },
      { month: "October", year: startYear },
      { month: "November", year: startYear },
      { month: "December", year: startYear },
      { month: "January", year: endYear },
      { month: "February", year: endYear },
      { month: "March", year: endYear },
    ];
    return months;
  };

  // Compute 22 stock items for a given YYYY_MonthName_ClassName key dynamically
  const computeStockRecordsForKey = (
    key: string,
    customRegisterRecords = registerRecords,
    customIncomingRecords = incomingRecords
  ) => {
    const parts = key.split("_");
    if (parts.length !== 3) return [];
    const year = parts[0];
    const month = parts[1];
    const cls = parts[2];
    const incomingData = customIncomingRecords[key] || {};
    const isPrimary = cls === "1 To 5";

    const itemsList = [
      "Rice", "Pease", "Mugdal", "Cowpea", "Gram", "Masurdal", "Matki", "Moong", "Turdal",
      "Soyabean Wadi", "Turmeric", "Salt", "Onion Garlic Masala", "Cumin", "Mustard",
      "Chili", "Garam Masala", "Oil"
    ];

    return itemsList.map((itemName) => {
      // 1. Received this month (Matrix + incRecords)
      let incTabQty = 0;
      const itemKey = getItemKeyFromName(itemName);
      incRecords.forEach((r) => {
        if (!r.date || !r.item || !r.qty) return;
        const rKey = getItemKeyFromName(r.item);
        const isMatch = (rKey && rKey === itemKey) || r.item.toLowerCase().trim() === itemName.toLowerCase().trim();
        if (isMatch) {
          const parts = r.date.split("-");
          if (parts.length === 3) {
            const recYear = parts[0];
            const monthIndex = parseInt(parts[1], 10) - 1;
            const monthNames = [
              "January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November", "December"
            ];
            if (monthIndex >= 0 && monthIndex <= 11) {
              const recMonth = monthNames[monthIndex];
              if (recYear === year && recMonth.toLowerCase() === month.toLowerCase()) {
                incTabQty += parseFloat(r.qty) || 0;
              }
            }
          }
        }
      });
      const received = (Number(incomingData[itemName]) || Number(incomingData[itemKey]) || 0) + incTabQty;

      // 2. Previous month closing stock
      const prev = getOpeningStock(
        month,
        year,
        cls,
        itemName,
        0,
        customRegisterRecords,
        customIncomingRecords
      );

      // 3. Used this month
      let totalUsedKg = 0;
      let cookedDays = 0;
      let benefSum = 0;
      const seenDates = new Set<string>();

      Object.keys(customRegisterRecords || {}).forEach((dateStr) => {
        const parts = dateStr.split("-");
        if (parts.length !== 3) return;
        const recYear = parts[0];
        const monthIndex = parseInt(parts[1], 10) - 1;
        const monthNames = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];
        if (monthIndex < 0 || monthIndex > 11) return;
        const recMonth = monthNames[monthIndex];

        if (
          recYear !== year ||
          recMonth.toLowerCase() !== month.toLowerCase()
        )
          return;

        const record = customRegisterRecords[dateStr];
        if (!record) return;
        const classRecord = record[cls] || (cls === "1 To 5" ? record : null);
        if (!classRecord) return;
        const bene = Number(classRecord.beneficiary) || 0;

        if (bene > 0 && !seenDates.has(dateStr)) {
          seenDates.add(dateStr);
          cookedDays++;
          benefSum += bene;
        }

        const selectedItems = classRecord.selectedItems || getSelectedItemsForRegisterDate(dateStr, cls);
        const wasSelected = selectedItems
          ? !!selectedItems[itemName]
          : false;
        if (!wasSelected || bene === 0) return;

        const rule = quantityRules.find(
          (r) => r.item.toLowerCase() === itemName.toLowerCase(),
        );
        if (!rule) return;

        const qtyStr = isPrimary ? rule.qty15 : rule.qty68;
        const qty = Number(qtyStr) || 0;
        if (qty <= 0) return;

        const qtyKg = qty >= 1 ? qty / 1000 : qty;
        totalUsedKg += qtyKg * bene;
      });

      const used = Number(totalUsedKg.toFixed(6));
      const beneficiary = benefSum;

      return {
        item: itemName,
        prev,
        received,
        used,
        cookedDays,
        beneficiary,
      };
    });
  };

  // Get stock data for a specific item from stockRecordsHistory for a given month/year
  const getStockDataForItem = (itemName: string, month: string, year: number, cls: string = "1 To 5") => {
    // Dynamic calculation (always run dynamically to ensure reports instantly reflect whatever data user fills in MDM)
    const prev = getOpeningStock(month, year.toString(), cls, itemName);
    const incomingQty = getIncomingForItem(itemName, month, year, cls);
    const used = getUsedForMonth(month, year.toString(), cls, itemName);

    // Calculate cookedDays and beneficiary
    let cookedDays = 0;
    let beneficiary = 0;
    const seenDates = new Set<string>();

    Object.keys(registerRecords || {}).forEach((dateStr) => {
      const parts = dateStr.split("-");
      if (parts.length !== 3) return;
      const recYear = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      if (monthIndex < 0 || monthIndex > 11) return;
      const recMonth = monthNames[monthIndex];

      if (
        recYear !== year.toString() ||
        recMonth.toLowerCase() !== month.toLowerCase()
      )
        return;

      const record = registerRecords[dateStr];
      if (!record) return;
      const classRecord = record[cls] || (cls === "1 To 5" ? record : null);
      if (!classRecord) return;
      const bene = Number(classRecord.beneficiary) || 0;

      if (bene > 0 && !seenDates.has(dateStr)) {
        seenDates.add(dateStr);
        cookedDays++;
        beneficiary += bene;
      }
    });

    return {
      item: itemName,
      prev,
      received: incomingQty,
      used,
      cookedDays,
      beneficiary,
    };
  };

  // Get register data aggregated for a specific month (enrolled & beneficiary counts)
  const getRegisterDataForMonth = (month: string, year: number, cls?: string) => {
    const monthIndex = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].indexOf(month);
    if (monthIndex === -1) return { enrolled: 0, beneficiary: 0, workingDays: 0 };

    let totalEnrolled = 0;
    let totalBeneficiary = 0;
    let workingDays = 0;

    Object.entries(registerRecords).forEach(([dateStr, record]) => {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const yearNum = parseInt(parts[0], 10);
        const monthNum = parseInt(parts[1], 10) - 1;
        if (monthNum === monthIndex && yearNum === year) {
          const primaryRec = record["1 To 5"] || (record.beneficiary ? record : null);
          const upperRec = record["6 To 8"];

          let enrolled = 0;
          let beneficiary = 0;

          if (cls === "1 To 5") {
            if (primaryRec) {
              enrolled += parseInt(primaryRec.enrolled || "0", 10);
              beneficiary += parseInt(primaryRec.beneficiary || "0", 10);
            }
          } else if (cls === "6 To 8") {
            if (upperRec) {
              enrolled += parseInt(upperRec.enrolled || "0", 10);
              beneficiary += parseInt(upperRec.beneficiary || "0", 10);
            }
          } else {
            // Aggregate both
            if (primaryRec) {
              enrolled += parseInt(primaryRec.enrolled || "0", 10);
              beneficiary += parseInt(primaryRec.beneficiary || "0", 10);
            }
            if (upperRec) {
              enrolled += parseInt(upperRec.enrolled || "0", 10);
              beneficiary += parseInt(upperRec.beneficiary || "0", 10);
            }
          }

          if (enrolled > totalEnrolled) totalEnrolled = enrolled;
          totalBeneficiary += beneficiary;
          workingDays++;
        }
      }
    });

    return { enrolled: totalEnrolled, beneficiary: totalBeneficiary, workingDays };
  };

  // Get incoming record quantity for a specific item in a month
  const getIncomingForItem = (itemName: string, month: string, year: number, cls: string = "1 To 5") => {
    const key = `${year}_${month}_${cls}`;
    const record = incomingRecords[key];
    if (!record) return 0;
    return parseFloat(record[itemName] || "0") || 0;
  };

  // Item mapping for annual report columns (Marathi header -> English key in stockRecords)
  const ANNUAL_ITEM_KEYS = [
    "Rice",           // तांदूळ
    "Pease",          // वाटाणा
    "Mugdal",         // मूगडाळ
    "Cowpea",         // चवळी
    "Gram",           // हरभरा
    "Masurdal",       // मसूरडाळ
    "Matki",          // मटकी
    "Moong",          // अख्खा मूग
    "Turdal",         // तूरडाळ
    "Soyabean Wadi",  // सोयाबीन वडी
    "Cumin",          // जिरे
    "Mustard",        // मोहरी
    "Turmeric",       // हळद
    "Onion Garlic Masala", // कांदा लसूण मसाला
    "Salt",           // मीठ
    "Chili",          // मिरची पावडर
    "Garam Masala",   // गरम मसाला
    "Oil",            // सोयाबीन तेल
  ];

  const numberToMarathiWords = (amount: number): string => {
    if (isNaN(amount) || amount <= 0) return "शून्य रुपये फक्त";
    const num = Math.round(amount * 100) / 100;

    const units = ["", "एक", "दोन", "तीन", "चार", "पाच", "सहा", "सात", "आठ", "नऊ", "दहा", "अकरा", "बारा", "तेरा", "चौदा", "पंधरा", "सोळा", "सतरा", "अठरा", "एकोणीस"];
    const tens = ["", "", "वीस", "तीस", "चाळीस", "पन्नास", "साठ", "सत्तर", "ऐंशी", "नव्वद"];
    const exactTens: Record<number, string> = {
      21: "एकवीस", 22: "बावीस", 23: "तेवीस", 24: "चौवीस", 25: "पंचवीस", 26: "सव्वीस", 27: "सत्तावीस", 28: "अठ्ठावीस", 29: "एकोणतीस",
      31: "एकतीस", 32: "बत्तीस", 33: "तेत्तीस", 34: "चौतीस", 35: "पस्तीस", 36: "छत्तीस", 37: "सदतीस", 38: "अडतीस", 39: "एकोणचाळीस",
      41: "एकचाळीस", 42: "बेचाळीस", 43: "त्रेशहाळीस", 44: "चौ्वेचाळीस", 45: "पंचेचाळीस", 46: "शास्त्रेचाळीस", 47: "सत्तेचाळीस", 48: "अठ्ठेचाळीस", 49: "एकोणपन्नास",
      61: "एकसष्ट", 62: "बासष्ट", 63: "त्रेसष्ट", 64: "चौसष्ट", 65: "पासष्ट", 66: "साहसष्ट", 67: "सदसष्ट", 68: "अडसष्ट", 69: "एकोणसत्तर",
      71: "एकहत्तर", 72: "बाहत्तर", 73: "त्रिहत्तर", 74: "चौहत्तर", 75: "पंचहत्तर", 76: "शहात्तर", 77: "सत्त्यात्तर", 78: "अठ्ठ्यात्तर", 79: "एकोणऐंशी",
      81: "एक्याऐंशी", 82: "ब्याऐंशी", 83: "त्र्याऐंशी", 84: "चौऱ्याऐंशी", 85: "पंच्याऐंशी", 86: "स्याऐंशी", 87: "सत्त्याऐंशी", 88: "अठ्ठ्याऐंशी", 89: "एकोणनव्वद",
      91: "एक्याण्णव", 92: "ब्याण्णव", 93: "त्र्याण्णव", 94: "चौऱ्याण्णव", 95: "पंच्याण्णव", 96: "स्याण्णव", 97: "सत्त्याण्णव", 98: "अठ्ठ्याण्णव", 99: "एकोणशंभर"
    };

    const convertTwoDigits = (n: number): string => {
      if (n <= 0) return "";
      if (n < 20) return units[n];
      if (exactTens[n]) return exactTens[n];
      const t = Math.floor(n / 10);
      const u = n % 10;
      return `${tens[t]} ${units[u]}`.trim();
    };

    const convertHundreds = (n: number): string => {
      if (n < 100) return convertTwoDigits(n);
      const h = Math.floor(n / 100);
      const rem = n % 100;
      const hStr = h === 1 ? "एकशे" : `${units[h]}शे`;
      return rem > 0 ? `${hStr} ${convertTwoDigits(rem)}` : hStr;
    };

    const convertThousands = (n: number): string => {
      if (n < 1000) return convertHundreds(n);
      const th = Math.floor(n / 1000);
      const rem = n % 1000;
      return rem > 0 ? `${convertTwoDigits(th)} हजार ${convertHundreds(rem)}` : `${convertTwoDigits(th)} हजार`;
    };

    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);

    const rupStr = rupees > 0 ? `${convertThousands(rupees)} रुपये` : "";
    const paiseStr = paise > 0 ? `${convertTwoDigits(paise)} पैसे` : "";

    if (rupStr && paiseStr) return `${rupStr} ${paiseStr} फक्त`;
    if (rupStr) return `${rupStr} फक्त`;
    if (paiseStr) return `${paiseStr} फक्त`;
    return "शून्य रुपये फक्त";
  };

  const getDamagedForMonth = (itemName: string, month: string, year: number) => {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const mIdx = monthNames.findIndex(m => m.toLowerCase() === month.toLowerCase());
    if (mIdx === -1) return 0;
    let total = 0;
    damagedRecords.forEach((rec) => {
      const d = new Date(rec.date);
      if (!isNaN(d.getTime()) && d.getMonth() === mIdx && d.getFullYear() === year) {
        if (rec.item.toLowerCase() === itemName.toLowerCase()) {
          total += parseFloat(rec.qty) || 0;
        }
      }
    });
    return total;
  };

  const getLokForMonth = (itemName: string, month: string, year: number, maxDateStr?: string) => {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const mIdx = monthNames.findIndex(m => m.toLowerCase() === month.toLowerCase());
    if (mIdx === -1) return 0;
    let total = 0;
    const targetKey = getItemKeyFromName(itemName);
    lokRecords.forEach((rec) => {
      if (maxDateStr && rec.date && rec.date.trim() > maxDateStr.trim()) return;
      const d = new Date(rec.date);
      if (!isNaN(d.getTime()) && d.getMonth() === mIdx && d.getFullYear() === year) {
        if (getItemKeyFromName(rec.item) === targetKey || rec.item.toLowerCase() === itemName.toLowerCase()) {
          total += parseFloat(rec.qty) || 0;
        }
      }
    });
    return total;
  };

  const getDailyDataForMonthDate = (dateISO: string, classSection: "1 To 5" | "6 To 8" = "1 To 5") => {
    const regRecord = registerRecords ? registerRecords[dateISO] : undefined;
    if (regRecord) {
      const classRec = regRecord[classSection] || (classSection === "1 To 5" ? regRecord : null);
      if (classRec && (Number(classRec.beneficiary) > 0 || classRec.menu)) {
        return {
          beneficiary: Number(classRec.beneficiary) || 0,
          enrolled: Number(classRec.totalEnrolled || classRec.pat) || (classSection === "1 To 5" ? (Number(profile?.patPrimary) || 0) : (Number(profile?.patUpper) || 0)),
          menu: classRec.menu || getMenuForRegisterDate(dateISO, classSection),
          selectedItems: classRec.selectedItems || getSelectedItemsForRegisterDate(dateISO, classSection),
          isHoliday: false,
          holidayReason: ""
        };
      }
    }

    const d = new Date(dateISO);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const monthNum = d.getMonth() + 1;
      const sectionKey = classSection === "1 To 5" ? "1-5" : "6-8";
      const calKey = `${year}_${monthNum}_${sectionKey}`;
      const calData = monthlyCalendarRecords[calKey];
      if (calData && calData[dateISO]) {
        const entry = calData[dateISO];
        return {
          beneficiary: Number(entry.beneficiary) || 0,
          enrolled: classSection === "1 To 5" ? (Number(profile?.patPrimary) || 0) : (Number(profile?.patUpper) || 0),
          menu: entry.menu || getMenuForRegisterDate(dateISO, classSection),
          selectedItems: getSelectedItemsForRegisterDate(dateISO, classSection),
          isHoliday: !!entry.isHoliday,
          holidayReason: entry.holidayReason || ""
        };
      }
    }

    const dObj = new Date(dateISO);
    const isSunday = dObj.getDay() === 0;
    return {
      beneficiary: 0,
      enrolled: classSection === "1 To 5" ? (Number(profile?.patPrimary) || 0) : (Number(profile?.patUpper) || 0),
      menu: isSunday ? "— Select recipe —" : getMenuForRegisterDate(dateISO, classSection),
      selectedItems: getSelectedItemsForRegisterDate(dateISO, classSection),
      isHoliday: isSunday,
      holidayReason: isSunday ? "रविवार सुट्टी" : ""
    };
  };

  const REPORT_ITEMS = [
    { key: "Rice", nameMr: "तांदूळ", unit: "kg" },
    { key: "Mugdal", nameMr: "मूगडाळ", unit: "kg" },
    { key: "Turdal", nameMr: "तूरडाळ", unit: "kg" },
    { key: "Masurdal", nameMr: "मसूरडाळ", unit: "kg" },
    { key: "Matki", nameMr: "मटकी", unit: "kg" },
    { key: "Moong", nameMr: "अख्खा मूग", unit: "kg" },
    { key: "Cowpea", nameMr: "चवळी", unit: "kg" },
    { key: "Gram", nameMr: "हरभरा", unit: "kg" },
    { key: "Pease", nameMr: "वाटाणा", unit: "kg" },
    { key: "Soyabean Wadi", nameMr: "सोयाबीन वडी", unit: "kg" },
    { key: "Cumin", nameMr: "जिरे", unit: "kg" },
    { key: "Mustard", nameMr: "मोहरी", unit: "kg" },
    { key: "Turmeric", nameMr: "हळद", unit: "kg" },
    { key: "Chili", nameMr: "तिखट मसाला / मिरची", unit: "kg" },
    { key: "Onion Garlic Masala", nameMr: "कांदा लसूण मसाला", unit: "kg" },
    { key: "Garam Masala", nameMr: "गरम मसाला", unit: "kg" },
    { key: "Oil", nameMr: "गोडेतेल", unit: "liter" },
    { key: "Salt", nameMr: "मीठ", unit: "kg" },
    { key: "Milk-Milk Powder", nameMr: "दूध / दूध पावडर", unit: "liter" },
    { key: "Sugar-Jaggery", nameMr: "साखर / गूळ", unit: "kg" },
    { key: "Ragi Satva", nameMr: "नाचणी सत्व", unit: "kg" },
    { key: "Vegetables", nameMr: "भाजीपाला", unit: "kg" }
  ];

  // ---- End Dynamic Report Helpers ----

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-16 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
          <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-500 animate-pulse">
            Establishing Educator Protocols...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative overflow-hidden">
      {/* Luxury Glowing Background Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-48 -left-48 size-[800px] bg-teal-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/2 -right-48 size-[900px] bg-indigo-500/5 rounded-full blur-[140px] animate-blob" />
        <div className="absolute -bottom-64 left-1/4 size-[800px] bg-purple-500/5 rounded-full blur-[120px]" />
      </div>

      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-0 pt-20 min-h-screen pb-20 relative z-10">
        <PinGate sectionKey="mdm">
          <div className="p-4 md:p-8 space-y-6 w-full">

          {/* ===== MDM CATEGORY GROUPED NAVIGATION BAR ===== */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-5 md:p-6 space-y-5">
            {/* Title Row */}
            <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-100 gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/30 text-white">
                  <Utensils className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Mid-Day Meal (MDM) Portal</h1>
                  <p className="text-xs text-emerald-600 font-bold tracking-wide">माध्यान्ह भोजन योजना पोर्टल</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {lowStockItems.length > 0 && (
                  <button
                    onClick={() => setShowLowStockModal(true)}
                    className="flex items-center gap-2 text-xs font-extrabold text-amber-900 bg-amber-100 border border-amber-300 hover:bg-amber-200 px-3.5 py-1.5 rounded-full shadow-xs transition-all cursor-pointer animate-pulse"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>⚠️ {lowStockItems.length} साहित्याचा साठा कमी आहे</span>
                  </button>
                )}
                <div className="flex items-center gap-2 text-xs font-extrabold text-slate-600 bg-slate-100/80 border border-slate-200 px-4 py-2 rounded-full shadow-inner">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>UDISE: {getUdise()}</span>
                </div>
              </div>
            </div>

            {/* Grouped Category Tabs */}
            <div className="space-y-4">
              {/* Category 1: STOCK (साठा) */}
              <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-4 md:p-5 rounded-2xl border border-emerald-200/60 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-800 tracking-wider">
                  <Package className="w-4 h-4 text-emerald-600" />
                  <span>STOCK (साठा व्यवस्थापन)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {[
                    { id: "opening-stock", label: lang === "mr" ? "आरंभीची शिल्लक" : "Initial Stock", icon: Package },
                    { id: "incoming", label: lang === "mr" ? "साहित्य आवक" : "Stock Received", icon: Package },
                    { id: "loksahabhag", label: lang === "mr" ? "लोकसहभाग" : "Loksahabhag", icon: Users },
                    { id: "damaged-stock", label: lang === "mr" ? "खराब साठा" : "Damaged Stock", icon: Trash2 },
                    { id: "stock", label: lang === "mr" ? "शिल्लक साठा" : "View Stock", icon: Activity },
                  ].map((sub) => {
                    const SubIcon = sub.icon;
                    const isActive = activeTab === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => setActiveTab(sub.id)}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 border ${
                          isActive
                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-600 shadow-lg shadow-emerald-500/30 scale-[1.03]"
                            : "bg-white/90 text-slate-700 border-slate-200 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50/60 hover:shadow-md"
                        }`}
                      >
                        <SubIcon className={`w-4 h-4 ${isActive ? "text-white" : "text-emerald-600"}`} />
                        <span className="whitespace-nowrap">{sub.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Other Categories Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* MENU SETUP */}
                <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent p-4 md:p-5 rounded-2xl border border-amber-200/60 shadow-sm flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-800 tracking-wider">
                    <ClipboardList className="w-4 h-4 text-amber-600" />
                    <span>MENU SETUP (रेसिपी व मेनू)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: "menu", label: lang === "mr" ? "रेसिपी साहित्य" : "Ingredients", icon: ClipboardList },
                      { id: "quantity", label: lang === "mr" ? "प्रमाण" : "Formulas", icon: Activity },
                      { id: "anudan", label: lang === "mr" ? "अनुदान सेटिंग" : "Grant Settings", icon: Sparkles },
                    ].map((sub) => {
                      const SubIcon = sub.icon;
                      const isActive = activeTab === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => setActiveTab(sub.id)}
                          className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 border text-center ${
                            isActive
                              ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white border-amber-500 shadow-lg shadow-orange-500/30 scale-[1.02]"
                              : "bg-white/90 text-slate-700 border-slate-200 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50/60 hover:shadow-md"
                          }`}
                        >
                          <SubIcon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-amber-600"}`} />
                          <span className="text-center leading-tight">{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* DAILY OPERATIONS */}
                <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent p-4 md:p-5 rounded-2xl border border-blue-200/60 shadow-sm flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-800 tracking-wider">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>DAILY & CALENDAR (कामकाज)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { id: "monthly-calendar", label: lang === "mr" ? "मासिक कॅलेंडर" : "Monthly Calendar", icon: Calendar },
                      { id: "daily-reg", label: lang === "mr" ? "दैनंदिन नोंद" : "Daily Entry", icon: Calendar },
                    ].map((sub) => {
                      const SubIcon = sub.icon;
                      const isActive = activeTab === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => setActiveTab(sub.id)}
                          className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-bold transition-all duration-200 border ${
                            isActive
                              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-600 shadow-lg shadow-blue-500/30 scale-[1.03]"
                              : "bg-white/90 text-slate-700 border-slate-200 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50/60 hover:shadow-md"
                          }`}
                        >
                          <SubIcon className={`w-4 h-4 ${isActive ? "text-white" : "text-blue-600"}`} />
                          <span className="whitespace-nowrap">{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* REPORTS */}
                <div className="bg-gradient-to-r from-purple-500/10 via-violet-500/5 to-transparent p-4 md:p-5 rounded-2xl border border-purple-200/60 shadow-sm flex flex-col justify-between space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-purple-800 tracking-wider">
                    <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                    <span>REPORTS (शासकीय अहवाल)</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { id: "demand", label: lang === "mr" ? "तांदूळ मागणी" : "Demand", icon: FileText },
                      { id: "monthly-report", label: lang === "mr" ? "प्रमाणपत्र" : "Certificate", icon: FileSpreadsheet },
                      { id: "monthly-summary-report", label: lang === "mr" ? "मासिक अहवाल" : "Monthly", icon: FileSpreadsheet },
                      { id: "annual-report", label: lang === "mr" ? "वार्षिक अहवाल" : "Annual", icon: FileSpreadsheet },
                    ].map((sub) => {
                      const SubIcon = sub.icon;
                      const isActive = activeTab === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => setActiveTab(sub.id)}
                          className={`flex items-center justify-center gap-1.5 px-2.5 py-3 rounded-xl text-sm font-bold transition-all duration-200 border ${
                            isActive
                              ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white border-purple-600 shadow-lg shadow-purple-500/30 scale-[1.03]"
                              : "bg-white/90 text-slate-700 border-slate-200 hover:border-purple-400 hover:text-purple-700 hover:bg-purple-50/60 hover:shadow-md"
                          }`}
                        >
                          <SubIcon className={`w-4 h-4 ${isActive ? "text-white" : "text-purple-600"}`} />
                          <span className="whitespace-nowrap">{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Workspace Panel */}
          {loading ? (
            <div className="h-[450px] bg-slate-100/50 border border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-slate-500 gap-6">
              <Loader2 className="size-12 animate-spin text-teal-500" />
              <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-500 animate-pulse">
                Synchronizing Secure MDM Archives...
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
                className="bg-white/60 backdrop-blur-3xl rounded-[3rem] border border-slate-200 shadow-[0_32px_64px_-20px_rgba(0,0,0,0.5)] overflow-hidden p-6 md:p-10"
              >
                {/* MONTHLY CALENDAR ATTENDANCE & MDM ENTRY TAB (Learnify Academy Format) */}
                {activeTab === "monthly-calendar" && (
                  <div className="space-y-5 font-sans text-slate-800">
                    {/* Top Heading */}
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                      Monthly Calendar
                    </h2>

                    {/* Filter Card Container */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                      <div className="flex flex-wrap items-end gap-4">
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-1.5">महिना</label>
                          <select
                            value={calMonth}
                            onChange={(e) => setCalMonth(Number(e.target.value))}
                            className="h-10 px-4 border border-indigo-400 rounded-lg text-sm font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[140px]"
                          >
                            {[
                              "जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून",
                              "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"
                            ].map((m, i) => (
                              <option key={i} value={i + 1}>{m}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-1.5">Year</label>
                          <input
                            type="number"
                            value={calYear}
                            onChange={(e) => setCalYear(Number(e.target.value))}
                            className="h-10 px-4 border border-slate-300 rounded-lg text-sm font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-28"
                          />
                        </div>

                        <button
                          onClick={() => {
                            const monthNames = [
                              "जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून",
                              "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"
                            ];
                            toast.info(t(`कॅलेंडर दाखवले जात आहे: ${monthNames[calMonth - 1]} ${calYear}`, `Showing calendar for ${monthNames[calMonth - 1]} ${calYear}`));
                          }}
                          className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg shadow-sm transition-colors"
                        >
                          View
                        </button>
                      </div>
                    </div>

                    {/* Main Content Box */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                      {/* Section Heading & Helper Tools */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                        <h3 className="text-xl font-extrabold text-slate-900">
                          {[
                            "जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून",
                            "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"
                          ][calMonth - 1]} {calYear}
                        </h3>

                        {/* Helper Tools: Save */}
                        <div className="flex flex-wrap items-center gap-2">

                          <button
                            onClick={handleSaveMonthlyCalendar}
                            disabled={saving}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all"
                          >
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            <span>कॅलेंडर जतन करा (Save)</span>
                          </button>
                        </div>
                      </div>

                      {/* Radio Selection Cards for Calendar Mode */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Option 1: Admin Master Calendar */}
                        <label
                          onClick={() => handleSwitchCalMode("admin")}
                          className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-start gap-3.5 ${
                            calMode === "admin"
                              ? "bg-teal-50/70 border-teal-500 shadow-sm"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="calModeRadioChoice"
                            checked={calMode === "admin"}
                            onChange={() => handleSwitchCalMode("admin")}
                            className="mt-1 text-teal-600 focus:ring-teal-500 h-4 w-4 cursor-pointer"
                          />
                          <div>
                            <span className="font-extrabold text-sm text-slate-900 block">Admin Master Calendar</span>
                            <span className="text-xs text-slate-500 mt-1 block">आठवड्याच्या नियोजनानुसार बनवलेले मासिक कॅलेंडर</span>
                          </div>
                        </label>

                        {/* Option 2: Custom Calendar */}
                        <label
                          onClick={() => handleSwitchCalMode("custom")}
                          className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-start gap-3.5 ${
                            calMode === "custom"
                              ? "bg-teal-50/70 border-teal-500 shadow-sm"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="calModeRadioChoice"
                            checked={calMode === "custom"}
                            onChange={() => handleSwitchCalMode("custom")}
                            className="mt-1 text-teal-600 focus:ring-teal-500 h-4 w-4 cursor-pointer"
                          />
                          <div>
                            <span className="font-extrabold text-sm text-slate-900 block">Custom Calendar</span>
                            <span className="text-xs text-slate-500 mt-1 block">तुमच्या शाळेच्या आठवड्याच्या नियोजनानुसार मासिक कॅलेंडर बनवा</span>
                          </div>
                        </label>
                      </div>

                      {/* Informational Blue Banner */}
                      <div className="bg-blue-50/90 border border-blue-200 text-blue-700 rounded-xl p-3.5 text-xs font-semibold leading-relaxed">
                        {calMode === "admin"
                          ? "आठवड्याच्या नियोजनानुसार बनवलेले मासिक कॅलेंडर दाखविते. कॅलेंडर मधे बदल करण्यासाठी Custom Calendar वर क्लिक करा."
                          : "कस्टम कॅलेंडर मोड: तुम्ही प्रत्येक दिवसाची रेसिपी/मेनू, सुट्टी व उपस्थिती बदलू शकता."}
                      </div>

                      {/* Main Calendar Table View (Learnify Format) */}
                      {(() => {
                        const daysInMonth = new Date(calYear, calMonth, 0).getDate();
                        const rate = calSection === "1-5" ? Number(primaryRate || 5.45) : Number(upperRate || 8.17);
                        const ricePerStudent = calSection === "1-5" ? 0.100 : 0.150;

                        let totalWorking = 0;
                        let totalHolidays = 0;
                        let totalBeneficiaries = 0;

                        for (let d = 1; d <= daysInMonth; d++) {
                          const dateStr = `${calYear}-${String(calMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                          const entry = calEntries[dateStr] || getAdminMasterMenuForDate(dateStr);
                          if (entry.isHoliday) {
                            totalHolidays++;
                          } else {
                            totalWorking++;
                            totalBeneficiaries += Number(entry.beneficiary || 0);
                          }
                        }

                        const totalRiceKg = totalBeneficiaries * ricePerStudent;
                        const totalCost = totalBeneficiaries * rate;

                        const learnifyRecipeOptions = [
                          "— Select recipe —",
                          "चणा/हरभरा पुलाव",
                          "चवळी खिचडी",
                          "मोड आलेल्या मटकीची उसळ व साधा शिजवलेला भात",
                          "मसाले भात",
                          "व्हेजिटेबल पुलाव",
                          "मूग-डाळ खिचडी",
                          "मूग/तूर शेवग्याचे वरण आणि भात",
                          "मटार/वाटाणा पुलाव",
                          "वरण भात",
                          "सोयाबीन भात",
                          "गोड लापशी",
                          "तांदळाची खीर",
                          "इतर",
                        ];

                        const marathiDaysMap = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];

                        return (
                          <div className="space-y-4">
                            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm bg-white">
                              <table className="w-full text-left border-collapse min-w-[720px]">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-xs">
                                    <th className="py-3 px-4 w-[130px]">Date</th>
                                    <th className="py-3 px-4 w-[110px]">दिवस</th>
                                    <th className="py-3 px-4">Recipe</th>
                                    <th className="py-3 px-4 w-[160px]">Holiday</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 text-xs font-sans">
                                  {Array.from({ length: daysInMonth }, (_, i) => {
                                    const dayNum = i + 1;
                                    const dateFormatted = `${String(dayNum).padStart(2, "0")}-${String(calMonth).padStart(2, "0")}-${calYear}`;
                                    const dateStrKey = `${calYear}-${String(calMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                                    const dayOfWeek = new Date(calYear, calMonth - 1, dayNum).getDay();
                                    const dayNameMarathi = marathiDaysMap[dayOfWeek];

                                    const defaultEntry = getAdminMasterMenuForDate(dateStrKey);
                                    const entry = calEntries[dateStrKey] || defaultEntry;

                                    return (
                                      <tr
                                        key={dayNum}
                                        className={`transition-colors ${
                                          entry.isHoliday
                                            ? "bg-rose-50/60"
                                            : "hover:bg-slate-50/80"
                                        }`}
                                      >
                                        {/* Date Column */}
                                        <td className={`py-3.5 px-4 font-bold ${entry.isHoliday ? "text-rose-500" : "text-slate-800"}`}>
                                          {dateFormatted}
                                        </td>

                                        {/* Day Column */}
                                        <td className={`py-3.5 px-4 font-bold ${entry.isHoliday ? "text-rose-500" : "text-slate-800"}`}>
                                          {dayNameMarathi}
                                        </td>

                                        {/* Recipe Column */}
                                        <td className="py-2.5 px-4">
                                          {calMode === "admin" ? (
                                            <span className="text-xs font-semibold text-slate-800 block truncate py-1">
                                              {getRecipeName(entry.menu)}
                                            </span>
                                          ) : (
                                            <select
                                              value={getRecipeId(entry.menu) || "— Select recipe —"}
                                              onChange={(e) => {
                                                const selectedId = e.target.value;
                                                const selectedRec = resolveRecipe(selectedId);
                                                handleCalEntryChange(dateStrKey, "menu", selectedRec ? selectedRec.id : selectedId);
                                              }}
                                              disabled={entry.isHoliday}
                                              className="w-full max-w-md h-9 px-3 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 truncate disabled:bg-slate-50 disabled:text-slate-400"
                                            >
                                              <option value="— Select recipe —">— Select recipe —</option>
                                              {MASTER_RECIPES.map((r) => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                              ))}
                                            </select>
                                          )}
                                        </td>

                                        {/* Holiday Checkbox Column */}
                                        <td className="py-3.5 px-4">
                                          {calMode === "admin" ? (
                                            <label className="flex items-center gap-2 cursor-not-allowed opacity-80 select-none">
                                              <input
                                                type="checkbox"
                                                checked={entry.isHoliday}
                                                disabled
                                                className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 pointer-events-none"
                                              />
                                              <span className={`text-xs font-semibold ${entry.isHoliday ? "text-rose-600 font-bold" : "text-slate-600"}`}>
                                                Mark as Holiday
                                              </span>
                                            </label>
                                          ) : (
                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                              <input
                                                type="checkbox"
                                                checked={entry.isHoliday}
                                                onChange={(e) => handleCalEntryChange(dateStrKey, "isHoliday", e.target.checked)}
                                                className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                                              />
                                              <span className={`text-xs font-semibold ${entry.isHoliday ? "text-rose-600 font-bold" : "text-slate-600"}`}>
                                                Mark as Holiday
                                              </span>
                                            </label>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Summary Totals Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200">
                              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-0.5">
                                <span className="text-sm font-bold text-slate-500 uppercase tracking-wider block">कामाचे दिवस</span>
                                <span className="text-base font-extrabold text-slate-900">{totalWorking} दिवस</span>
                              </div>
                              <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200 space-y-0.5">
                                <span className="text-sm font-bold text-rose-700 uppercase tracking-wider block">सुट्टीचे दिवस</span>
                                <span className="text-base font-extrabold text-rose-900">{totalHolidays} दिवस</span>
                              </div>
                              <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 space-y-0.5">
                                <span className="text-sm font-bold text-emerald-700 uppercase tracking-wider block">एकूण लाभार्थी</span>
                                <span className="text-base font-extrabold text-emerald-900">{totalBeneficiaries} विद्यार्थी</span>
                              </div>
                              <div className="bg-indigo-50 p-3.5 rounded-xl border border-indigo-200 space-y-0.5">
                                <span className="text-sm font-bold text-indigo-700 uppercase tracking-wider block">अनुमानित खर्च</span>
                                <span className="text-base font-extrabold text-indigo-900">₹{totalCost.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Auto-Fill Attendance Modal */}
                    {showAutoFillModal && (
                      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                                <Zap className="w-5 h-5 fill-amber-500" />
                              </div>
                              <div>
                                <h3 className="font-extrabold text-base text-slate-800">पटसंख्येनुसार उपस्थिती ऑटो-फिल</h3>
                                <p className="text-xs text-slate-500">सर्व कामकाजाच्या दिवसांना एकसारखी उपस्थिती द्या</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setShowAutoFillModal(false)}
                              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-700 block">
                              दैनिक लाभार्थी विद्यार्थी संख्या (Daily Beneficiary Student Count):
                            </label>
                            <input
                              type="number"
                              value={autoFillVal}
                              onChange={(e) => setAutoFillVal(e.target.value)}
                              placeholder="उदा. 45"
                              className="w-full h-12 px-4 border border-slate-300 rounded-xl text-lg font-black text-blue-900 bg-blue-50/30 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            />
                            <p className="text-sm font-medium text-slate-500">
                              टीप: हे प्रमाण केवळ चालू महिन्यातील नॉन-सुट्टी (कामकाजाच्या) दिवसांना लागू होईल.
                            </p>
                          </div>

                          <div className="flex items-center justify-end gap-2.5 pt-2">
                            <button
                              onClick={() => setShowAutoFillModal(false)}
                              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                            >
                              रद्द करा
                            </button>
                            <button
                              onClick={handleApplyAutoFillAttendance}
                              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold rounded-xl shadow-md flex items-center gap-1.5"
                            >
                              <Zap className="w-4 h-4 fill-white" />
                              <span>उपस्थिती भरून पूर्ण करा</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ANUDAN SETTINGS (GRANT & COOKING COST) TAB */}
                {activeTab === "anudan" && (
                  <div className="w-full space-y-6 font-sans">
                    {/* Page Header Title */}
                    <h2 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-3">
                      अनुदान सेटिंग
                    </h2>

                    {/* Card 1: Information Banner */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-0">
                      <h3 className="text-base font-bold text-slate-900">
                        अनुदान सेटिंग
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        GR नुसार शासन दर व अनुदान वर्गीकरण (केंद्र / राज्य हिस्सा) येथे नियंत्रित करा.<br />
                        आपली शाळा: <strong className="text-slate-900 font-bold">प्राथमिक ( इयत्ता १ ते ५ )</strong> — दैनंदिन नोंद, मासिक तांदूळ अहवाल/बिल व प्रपत्र (ब) यामध्ये <strong className="text-slate-900 font-bold">लागू दिनांक</strong> नुसार दर वापरले जातात.<br />
                        सध्या प्रणालीचे मूळ दर वापरले जात आहेत.
                      </p>
                    </div>

                    {/* Card 2: Effective Date Card */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-0">
                      <label className="text-sm font-bold text-slate-800 block">
                        लागू दिनांक (Effective from) *
                      </label>
                      <div className="max-w-xs">
                        <input
                          type="date"
                          value={effectiveDate}
                          onChange={(e) => setEffectiveDate(e.target.value)}
                          className="w-full h-10 px-3.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:border-emerald-600 transition-colors"
                        />
                      </div>
                      <p className="text-xs text-slate-500 font-medium pt-1">
                        या दिनांकापासून (सह) नवीन दर लागू होतील. मागील अहवालांसाठी जुने दर वापरले जातील.
                      </p>
                    </div>

                    {/* Cards 3 & 4: Primary and Upper Primary Rate Cards Side-by-Side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Box: Primary (इयत्ता १ ते ५) */}
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between space-y-4">
                        <div className="space-y-4">
                          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
                            प्राथमिक ( इयत्ता १ ते ५ )
                          </h3>

                          <div className="space-y-3">
                            <div>
                              <label className="text-xs font-bold text-slate-700 block mb-1">
                                शासन दर (₹)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={primaryRate}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPrimaryRate(val);
                                  if (val && !isNaN(parseFloat(val))) {
                                    const num = parseFloat(val);
                                    const kShare = (num * 0.6).toFixed(2);
                                    const rShare = (num - parseFloat(kShare)).toFixed(2);
                                    setPrimaryKendraShare(kShare);
                                    setPrimaryRajyaShare(rShare);
                                  }
                                }}
                                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 transition-colors"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-bold text-slate-700 block mb-1">
                                केंद्र हिस्सा (₹)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={primaryKendraShare}
                                onChange={(e) => setPrimaryKendraShare(e.target.value)}
                                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 transition-colors"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-bold text-slate-700 block mb-1">
                                राज्य हिस्सा (₹)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={primaryRajyaShare}
                                onChange={(e) => setPrimaryRajyaShare(e.target.value)}
                                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 transition-colors"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 text-xs text-slate-500 font-medium">
                          एकूण: {(parseFloat(primaryKendraShare || "0") + parseFloat(primaryRajyaShare || "0")).toFixed(2)} / {primaryRate}
                        </div>
                      </div>

                      {/* Right Box: Upper Primary (इयत्ता ६ ते ८) */}
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between space-y-4">
                        <div className="space-y-4">
                          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
                            उच्च प्राथमिक ( इयत्ता ६ ते ८ )
                          </h3>

                          <div className="space-y-3">
                            <div>
                              <label className="text-xs font-bold text-slate-700 block mb-1">
                                शासन दर (₹)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={upperRate}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setUpperRate(val);
                                  if (val && !isNaN(parseFloat(val))) {
                                    const num = parseFloat(val);
                                    const kShare = (num * 0.6).toFixed(2);
                                    const rShare = (num - parseFloat(kShare)).toFixed(2);
                                    setUpperKendraShare(kShare);
                                    setUpperRajyaShare(rShare);
                                  }
                                }}
                                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 transition-colors"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-bold text-slate-700 block mb-1">
                                केंद्र हिस्सा (₹)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={upperKendraShare}
                                onChange={(e) => setUpperKendraShare(e.target.value)}
                                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 transition-colors"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-bold text-slate-700 block mb-1">
                                राज्य हिस्सा (₹)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={upperRajyaShare}
                                onChange={(e) => setUpperRajyaShare(e.target.value)}
                                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 transition-colors"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 text-xs text-slate-500 font-medium">
                          एकूण: {(parseFloat(upperKendraShare || "0") + parseFloat(upperRajyaShare || "0")).toFixed(2)} / {upperRate}
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="pt-2">
                      <button
                        onClick={handleSaveAnudanSettings}
                        disabled={saving}
                        className="px-5 py-2.5 bg-[#047857] hover:bg-[#065f46] text-white font-bold text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        <span>दर जतन करा</span>
                      </button>
                    </div>

                    {/* Card A: Rate History */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                      <h3 className="text-base font-bold text-slate-900">
                        आपले अनुदान दर (इतिहास)
                      </h3>

                      {anudanHistory.length === 0 ? (
                        <p className="text-xs text-slate-500 font-medium">
                          अद्याप कोणतेही दर नोंदलेले नाहीत.
                        </p>
                      ) : (
                        <div className="w-full overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 text-slate-800 font-bold border-b border-slate-200">
                                <th className="py-2.5 px-4 font-bold text-slate-800">लागू दिनांक</th>
                                <th className="py-2.5 px-4 font-bold text-slate-800">प्राथमिक ( इयत्ता १ ते ५ )</th>
                                <th className="py-2.5 px-4 font-bold text-slate-800">उच्च प्राथमिक ( इयत्ता ६ ते ८ )</th>
                              </tr>
                            </thead>
                            <tbody>
                              {anudanHistory.map((row) => (
                                <tr key={row.id} className="border-b border-slate-100">
                                  <td className="py-3 px-4 font-bold text-slate-800">{row.effectiveDate}</td>
                                  <td className="py-3 px-4 text-slate-700 font-medium">
                                    ₹{row.primaryRate} <span className="text-slate-400 font-normal">(केंद्र ₹{row.primaryKendraShare} + राज्य ₹{row.primaryRajyaShare})</span>
                                  </td>
                                  <td className="py-3 px-4 text-slate-700 font-medium">
                                    ₹{row.upperRate} <span className="text-slate-400 font-normal">(केंद्र ₹{row.upperKendraShare} + राज्य ₹{row.upperRajyaShare})</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Card B: System Default GR Rates */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                      <h3 className="text-base font-bold text-slate-900">
                        प्रणालीचे मूळ दर (GR)
                      </h3>

                      <div className="w-full overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-800 font-bold border-b border-slate-200">
                              <th className="py-2.5 px-4 font-bold text-slate-800">लागू दिनांक</th>
                              <th className="py-2.5 px-4 font-bold text-slate-800">प्राथमिक ( इयत्ता १ ते ५ )</th>
                              <th className="py-2.5 px-4 font-bold text-slate-800">उच्च प्राथमिक ( इयत्ता ६ ते ८ )</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-slate-100">
                              <td className="py-3 px-4 font-bold text-slate-800">01-04-2024</td>
                              <td className="py-3 px-4 text-slate-700 font-medium">
                                ₹2.59 <span className="text-slate-400 font-normal">(केंद्र ₹1.56 + राज्य ₹1.03)</span>
                              </td>
                              <td className="py-3 px-4 text-slate-700 font-medium">
                                ₹3.88 <span className="text-slate-400 font-normal">(केंद्र ₹2.32 + राज्य ₹1.56)</span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* RECIPE GUIDE TAB */}
                {activeTab === "recipe-guide" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">
                          {lang === "mr" ? "रेसिपी मार्गदर्शक (Recipe Guide)" : "Recipe Guide"}
                        </h2>
                        <p className="text-xs text-slate-500">
                          माध्यान्ह भोजन योजनेअंतर्गत शिजवण्यात येणाऱ्या पाककृतींचे मार्गदर्शन व पोषण मूल्ये
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[
                        { title: "वरण भात (Rice & Lentils)", titleMr: "वरण भात", cal: "450 kcal", protein: "12g", items: ["तांदूळ", "तूरडाळ", "हळद", "मीठ", "गोडेतेल"], desc: "स्वच्छ तांदूळ व तुरीची डाळ शिजवून मऊ वरण भात तयार करावा." },
                        { title: "मसाला भात (Spiced Rice)", titleMr: "मसाला भात", cal: "480 kcal", protein: "10g", items: ["तांदूळ", "जिरे", "मोहरी", "हळद", "कांदा लसूण मसाला", "गोडेतेल"], desc: "जिरे-मोहरी फोडणी देऊन चमचमीत मसाला भात तयार करावा." },
                        { title: "मूग उसळ व भात (Sprouts & Rice)", titleMr: "मूग उसळ व भात", cal: "510 kcal", protein: "16g", items: ["तांदूळ", "अख्खा मूग", "कांदा लसूण मसाला", "गरम मसाला", "गोडेतेल"], desc: "मोड आलेले मूग परतून चवदार उसळ व भात तयार करावा." },
                        { title: "सोयाबीन भात (Soyabean Rice)", titleMr: "सोयाबीन भात", cal: "490 kcal", protein: "18g", items: ["तांदूळ", "सोयाबीन वडी", "मसाले", "गोडेतेल", "मीठ"], desc: "सोयाबीन वडी भिजवून फोडणी देऊन पौष्टिक सोयाबीन भात." },
                        { title: "डाळ खिचडी (Dal Khichdi)", titleMr: "डाळ खिचडी", cal: "460 kcal", protein: "14g", items: ["तांदूळ", "मूगडाळ", "जिरे", "हळद", "मीठ"], desc: "तांदूळ व मूगडाळ एकत्र शिजवून पचायला हलकी डाळ खिचडी." },
                        { title: "गोड लापशी / खीर (Sweet Kheer/Lapshi)", titleMr: "गोड लापशी / खीर", cal: "530 kcal", protein: "8g", items: ["लापशी रवा / तांदूळ", "गूळ / साखर", "दूध"], desc: "लापशी किंवा तांदळाची खीर गूळ घालून गोड मिष्टान्न तयार करावे." },
                      ].map((recipe, idx) => (
                        <div key={idx} className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm space-y-3 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="font-bold text-base text-slate-800">{recipe.titleMr}</h3>
                            <span className="bg-amber-100 text-amber-800 text-sm font-extrabold px-2.5 py-0.5 rounded-full">{recipe.cal}</span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium">{recipe.desc}</p>
                          <div>
                            <span className="text-sm font-bold text-slate-500 block mb-1">मुख्य घटक:</span>
                            <div className="flex flex-wrap gap-1">
                              {recipe.items.map((it, i) => (
                                <span key={i} className="bg-slate-100 text-slate-700 text-sm font-bold px-2 py-0.5 rounded border border-slate-200">{it}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* INITIAL STOCK (OPENING BALANCE) TAB */}
                {activeTab === "opening-stock" && (
                  <div className="space-y-6">
                    {/* Information Banner */}
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-900 space-y-1.5 shadow-xs">
                      <h3 className="font-extrabold text-base text-amber-950 flex items-center gap-2">
                        <Package className="w-5 h-5 text-amber-700" />
                        <span>आरंभीची शिल्लक (Initial / Opening Stock Entry)</span>
                      </h3>
                      <p className="text-xs leading-relaxed font-medium">
                        तारीख निवडून साहित्याची <span className="font-bold text-emerald-800">आरंभीची शिल्लक</span>, <span className="font-bold text-blue-800">उसना घेतला</span>, <span className="font-bold text-rose-800">उसना दिला</span> व <span className="font-bold text-amber-800">लोकसहभाग</span> प्रविष्ट करा.
                      </p>
                      <p className="text-xs leading-relaxed font-extrabold text-emerald-800">
                        सूत्र: एकूण शिल्लक साठा = मागील शिल्लक (+) usna घेतला (+) - usna दिला (-) + लोकसहभाग (+)
                      </p>
                    </div>

                    {/* Table Container */}
                    <div className="bg-white rounded-2xl border border-emerald-200 shadow-md overflow-hidden">
                      {/* Header Title with Calendar Date Picker & Export Buttons */}
                      <div className="bg-emerald-50/90 px-5 py-4 border-b border-emerald-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                          <h2 className="font-extrabold text-emerald-900 text-sm md:text-base uppercase tracking-wide">
                            {profile?.schoolName || "आरंभीची शिल्लक नोंदवही"}
                          </h2>
                          <p className="text-xs font-bold text-emerald-700 mt-0.5">
                            साठा व्यवस्थापन • दिनांक {openingStockDate ? new Date(openingStockDate).toLocaleDateString('mr-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : ""}
                          </p>
                        </div>

                        {/* Calendar & Export Action Controls */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* PDF Export Button */}
                          <button
                            onClick={handleOpeningStockPdfDownload}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Download PDF Report"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </button>

                          {/* Excel Export Button */}
                          <button
                            onClick={handleExportOpeningStockExcel}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Download Excel Report"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>Excel</span>
                          </button>

                          {/* Print Button */}
                          <button
                            onClick={handleOpeningStockPrint}
                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Print Report"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>{lang === "mr" ? "प्रिंट" : "Print"}</span>
                          </button>

                          {/* Calendar Date Selection Control */}
                          <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-xl border border-emerald-300 shadow-xs">
                            <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
                            <span className="text-xs font-extrabold text-slate-800 whitespace-nowrap">
                              {lang === "mr" ? "तारीख निवडा:" : "Select Date:"}
                            </span>
                            <input
                              type="date"
                              value={openingStockDate}
                              onChange={(e) => setOpeningStockDate(e.target.value)}
                              className="h-7 px-2 bg-emerald-50/50 border border-emerald-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Vertical Items List Table */}
                      <div className="w-full overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse min-w-[800px]">
                          <thead>
                            <tr className="bg-emerald-100/90 border-b border-emerald-300 text-emerald-950 font-bold">
                              <th className="p-3 border-r border-emerald-300 min-w-[200px]">साहित्याचे नाव (Item Name)</th>
                              <th className="p-3 text-center border-r border-emerald-300 bg-emerald-200/60 min-w-[140px]">
                                मागील महिन्याची शिल्लक (+)
                              </th>
                              <th className="p-3 text-center border-r border-slate-200 bg-blue-100/80 min-w-[130px]">
                                उसना घेतला (+)
                              </th>
                              <th className="p-3 text-center border-r border-slate-200 bg-rose-100/80 min-w-[130px]">
                                उसना दिला (-)
                              </th>
                              <th className="p-3 text-center border-r border-slate-200 bg-amber-100/80 min-w-[130px]">
                                लोकसहभाग (+)
                              </th>
                              <th className="p-3 text-center border-r border-emerald-300 bg-emerald-300/70 font-black text-emerald-950 min-w-[150px]">
                                एकूण शिल्लक साठा
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {REPORT_ITEMS.slice(0, 18).map((item, idx) => {
                              const openVal = roundStock(parseFloat(openingStockValues[item.key] || "0"));
                              const borInVal = roundStock(parseFloat(openingStockBorrowedIn[item.key] || "0"));
                              const borOutVal = roundStock(parseFloat(openingStockBorrowedOut[item.key] || "0"));
                              const lokVal = roundStock(parseFloat(openingStockLoksahabhag[item.key] || "0"));

                              const availStock = roundStock(openVal + borInVal + lokVal);
                              const isInvalid = borOutVal > availStock && borOutVal > 0;
                              const totalStock = isInvalid ? 0 : roundStock(availStock - borOutVal);

                              return (
                                <tr key={item.key} className={`hover:bg-emerald-50/40 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                                  {/* 1. Item Name */}
                                  <td className="p-3 border-r border-slate-200 font-extrabold text-slate-900">
                                    <div className="flex items-center gap-2">
                                      <span className="size-2 rounded-full bg-emerald-500 shrink-0"></span>
                                      <div>
                                        <span className="block text-xs font-black text-slate-900">{item.nameMr}</span>
                                        <span className="block text-[11px] font-bold text-slate-500">{item.key} ({item.unit})</span>
                                      </div>
                                    </div>
                                  </td>

                                  {/* 2. मागील महिन्याची शिल्लक (+) */}
                                  <td className="p-2 border-r border-slate-200 text-center bg-emerald-50/30">
                                    <input
                                      type="number"
                                      step="0.001"
                                      min="0"
                                      placeholder="0"
                                      value={openingStockValues[item.key] || ""}
                                      onChange={(e) => handleOpeningStockChange(item.key, e.target.value)}
                                      className="w-full h-9 text-center border border-emerald-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 bg-white text-xs px-2 shadow-2xs outline-none"
                                    />
                                  </td>

                                  {/* 3. उसना घेतला (+) */}
                                  <td className="p-2 border-r border-slate-200 text-center bg-blue-50/30">
                                    <input
                                      type="number"
                                      step="0.001"
                                      min="0"
                                      placeholder="0"
                                      value={openingStockBorrowedIn[item.key] || ""}
                                      onChange={(e) => handleOpeningBorrowedInChange(item.key, e.target.value)}
                                      className="w-full h-9 text-center border border-blue-300 rounded-lg font-bold text-blue-950 focus:ring-2 focus:ring-blue-500 bg-white text-xs px-2 shadow-2xs outline-none"
                                    />
                                  </td>

                                  {/* 4. उसना दिला (-) */}
                                  <td className="p-2 border-r border-slate-200 text-center bg-rose-50/30">
                                    <input
                                      type="number"
                                      step="0.001"
                                      min="0"
                                      placeholder="0"
                                      value={openingStockBorrowedOut[item.key] || ""}
                                      onChange={(e) => handleOpeningBorrowedOutChange(item.key, e.target.value)}
                                      className={`w-full h-9 text-center border rounded-lg font-bold text-xs px-2 shadow-2xs outline-none transition-all ${
                                        isInvalid
                                          ? "border-rose-500 bg-rose-100/90 text-rose-900 focus:ring-2 focus:ring-rose-400 font-black"
                                          : "border-rose-300 text-rose-950 focus:ring-2 focus:ring-rose-500 bg-white"
                                      }`}
                                    />
                                    {isInvalid && (
                                      <p className="text-[10px] font-extrabold text-rose-600 leading-tight mt-1">
                                        {lang === "mr"
                                          ? "उपलब्ध साठ्यापेक्षा जास्त असू शकत नाही"
                                          : "Cannot exceed available stock"}
                                      </p>
                                    )}
                                  </td>

                                  {/* 5. लोकसहभाग (+) */}
                                  <td className="p-2 border-r border-slate-200 text-center bg-amber-50/30">
                                    <input
                                      type="number"
                                      step="0.001"
                                      min="0"
                                      placeholder="0"
                                      value={openingStockLoksahabhag[item.key] || ""}
                                      onChange={(e) => handleOpeningLoksahabhagChange(item.key, e.target.value)}
                                      className="w-full h-9 text-center border border-amber-300 rounded-lg font-bold text-amber-950 focus:ring-2 focus:ring-amber-500 bg-white text-xs px-2 shadow-2xs outline-none"
                                    />
                                  </td>

                                  {/* 6. एकूण शिल्लक साठा (Read-only / Autocalculated) */}
                                  <td className="p-2 border-r border-emerald-300 text-center bg-emerald-100/40">
                                    <input
                                      type="text"
                                      disabled
                                      readOnly
                                      value={
                                        isInvalid
                                          ? (lang === "mr" ? "Invalid Entry" : "Invalid Entry")
                                          : `${toMarathiNumbers(totalStock.toFixed(3))} ${item.unit}`
                                      }
                                      className={`w-full h-9 text-center font-black text-xs px-2 rounded-lg border shadow-inner select-none cursor-not-allowed ${
                                        isInvalid
                                          ? "bg-rose-100 text-rose-800 border-rose-400 font-extrabold"
                                          : "bg-emerald-200/80 text-emerald-950 border-emerald-400"
                                      }`}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Save / Update Button */}
                    <div className="pt-2 flex items-center justify-end">
                      {(() => {
                        const hasInvalid = REPORT_ITEMS.slice(0, 18).some((item) => {
                          const openVal = Math.max(0, parseFloat(openingStockValues[item.key] || "0") || 0);
                          const borInVal = Math.max(0, parseFloat(openingStockBorrowedIn[item.key] || "0") || 0);
                          const borOutVal = Math.max(0, parseFloat(openingStockBorrowedOut[item.key] || "0") || 0);
                          const lokVal = Math.max(0, parseFloat(openingStockLoksahabhag[item.key] || "0") || 0);
                          return borOutVal > (openVal + borInVal + lokVal);
                        });

                        const isExistingRecord = !!(openingStockDateMap[openingStockDate]?.values && Object.keys(openingStockDateMap[openingStockDate].values).length > 0);

                        return (
                          <button
                            onClick={handleSaveOpeningStock}
                            disabled={saving || hasInvalid}
                            className={`px-6 py-3 font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 ${
                              hasInvalid
                                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                                : isExistingRecord
                                  ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white cursor-pointer"
                                  : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white cursor-pointer"
                            }`}
                          >
                            {saving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isExistingRecord ? (
                              <RefreshCw className="w-4 h-4" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            <span>
                              {isExistingRecord
                                ? lang === "mr"
                                  ? "Update Entry (नोंद अद्ययावत करा)"
                                  : "Update Entry"
                                : lang === "mr"
                                  ? "Save Entry (आरंभीची शिल्लक जतन करा)"
                                  : "Save Entry"}
                            </span>
                          </button>
                        );
                      })()}
                    </div>

                    {/* Hidden Printable Container for PDF & Print Export */}
                    <div id="opening-stock-report-print" className="hidden print:block p-6 bg-white text-slate-900">
                      <div className="text-center border-b-2 border-emerald-700 pb-3 mb-4">
                        <h2 className="text-lg font-black text-emerald-900 uppercase">
                          {profile?.schoolName || "माध्यान्ह भोजन योजना"}
                        </h2>
                        <h3 className="text-sm font-bold text-emerald-700 mt-1">
                          आरंभीची शिल्लक अहवाल (MDM Opening Stock Monthly Report)
                        </h3>
                        <p className="text-xs font-semibold text-slate-600 mt-1">
                          दिनांक: {openingStockDate ? new Date(openingStockDate).toLocaleDateString('mr-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : ""} • UDISE: {getUdise()}
                        </p>
                      </div>
                      <table className="w-full text-xs border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-emerald-100 border-b border-slate-300 text-emerald-950 font-bold">
                            <th className="p-2 border border-slate-300 text-center">अ.क्र.</th>
                            <th className="p-2 border border-slate-300 text-left">साहित्याचे नाव</th>
                            <th className="p-2 border border-slate-300 text-center">एकक</th>
                            <th className="p-2 border border-slate-300 text-center">मागील शिल्लक (+)</th>
                            <th className="p-2 border border-slate-300 text-center">उसना घेतला (+)</th>
                            <th className="p-2 border border-slate-300 text-center">उसना दिला (-)</th>
                            <th className="p-2 border border-slate-300 text-center">लोकसहभाग (+)</th>
                            <th className="p-2 border border-slate-300 text-center">एकूण शिल्लक साठा</th>
                          </tr>
                        </thead>
                        <tbody>
                          {REPORT_ITEMS.slice(0, 18).map((item, idx) => {
                            const openVal = Math.max(0, parseFloat(openingStockValues[item.key] || "0") || 0);
                            const borInVal = Math.max(0, parseFloat(openingStockBorrowedIn[item.key] || "0") || 0);
                            const borOutVal = Math.max(0, parseFloat(openingStockBorrowedOut[item.key] || "0") || 0);
                            const lokVal = Math.max(0, parseFloat(openingStockLoksahabhag[item.key] || "0") || 0);
                            const availStock = openVal + borInVal + lokVal;
                            const isInvalid = borOutVal > availStock && borOutVal > 0;
                            const totalStock = isInvalid ? 0 : availStock - borOutVal;
                            return (
                              <tr key={item.key} className="border-b border-slate-200">
                                <td className="p-2 border border-slate-300 text-center font-bold">{idx + 1}</td>
                                <td className="p-2 border border-slate-300 font-bold">{item.nameMr} ({item.key})</td>
                                <td className="p-2 border border-slate-300 text-center">{item.unit}</td>
                                <td className="p-2 border border-slate-300 text-center">{openVal}</td>
                                <td className="p-2 border border-slate-300 text-center">{borInVal}</td>
                                <td className="p-2 border border-slate-300 text-center">{borOutVal}</td>
                                <td className="p-2 border border-slate-300 text-center">{lokVal}</td>
                                <td className="p-2 border border-slate-300 text-center font-black">
                                  {isInvalid ? "Invalid Entry" : `${totalStock.toFixed(3)} ${item.unit}`}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 2. STOCK RECEIVED (साहित्य आवक) TAB - Learnify Exact UI */}
                {activeTab === "incoming" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b pb-3">
                      <h2 className="text-xl font-bold text-slate-800">
                        {lang === "mr" ? "साहित्य आवक (Stock Received)" : "Stock Received"}
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Left Column: Form Card (प्राप्त साठा नोंदवा) */}
                      <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                        <h3 className="font-bold text-base text-slate-800 border-b pb-2">
                          {lang === "mr" ? "प्राप्त साठा नोंदवा" : "Record Stock Received"}
                        </h3>
                        <div className="space-y-4">
                          {/* 1. साहित्य */}
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1.5">
                              {lang === "mr" ? "साहित्य" : "Material / Item"}
                            </label>
                            <select
                              value={incItem}
                              onChange={(e) => setIncItem(e.target.value)}
                              className="w-full h-11 px-3.5 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 bg-white"
                            >
                              <option value="">{lang === "mr" ? "साहित्य निवडा" : "Select Material"}</option>
                              <option value="तांदूळ">तांदूळ (Rice)</option>
                              <option value="मूगडाळ">मूगडाळ (Moong Dal)</option>
                              <option value="तूरडाळ">तूरडाळ (Tur Dal)</option>
                              <option value="मसूरडाळ">मसूरडाळ (Masoor Dal)</option>
                              <option value="मटकी">मटकी (Moth Beans)</option>
                              <option value="मूग">मूग (Whole Moong)</option>
                              <option value="चवळी">चवळी (Cowpea)</option>
                              <option value="हरभरा">हरभरा (Chana)</option>
                              <option value="वाटाणा">वाटाणा (Peas)</option>
                              <option value="सोयाबीन वडी">सोयाबीन वडी (Soyabean Chunks)</option>
                              <option value="जिरे">जिरे (Cumin)</option>
                              <option value="मोहरी">मोहरी (Mustard)</option>
                              <option value="हळद">हळद (Turmeric)</option>
                              <option value="तिखट मसाला">तिखट मसाला (Chili Masala)</option>
                              <option value="कांदा लसूण मसाला">कांदा लसूण मसाला (Onion Garlic Masala)</option>
                              <option value="गरम मसाला">गरम मसाला (Garam Masala)</option>
                              <option value="तेल">तेल (Cooking Oil)</option>
                              <option value="मीठ">मीठ (Salt)</option>
                            </select>
                          </div>

                          {/* 2. प्रमाण */}
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1.5">
                              {lang === "mr" ? "प्रमाण" : "Quantity"}
                            </label>
                            <input
                              type="number"
                              step="0.0001"
                              placeholder={lang === "mr" ? "प्रमाण (kg)" : "Quantity (kg)"}
                              value={incQty}
                              onChange={(e) => setIncQty(e.target.value)}
                              className="w-full h-11 px-3.5 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 bg-white"
                            />
                          </div>

                          {/* 3. दिनांक */}
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1.5">
                              {lang === "mr" ? "दिनांक" : "Date"}
                            </label>
                            <input
                              type="date"
                              value={incDate}
                              onChange={(e) => setIncDate(e.target.value)}
                              className="w-full h-11 px-3.5 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 bg-white"
                            />
                          </div>

                          {/* 4. शेरा */}
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1.5">
                              {lang === "mr" ? "शेरा" : "Remarks"}
                            </label>
                            <textarea
                              rows={3}
                              placeholder={lang === "mr" ? "शेरा" : "Enter remarks..."}
                              value={incRemark}
                              onChange={(e) => setIncRemark(e.target.value)}
                              className="w-full p-3.5 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 bg-white resize-none"
                            />
                          </div>

                          {/* 5. Save Button */}
                          <button
                            onClick={handleSaveIncomingStock}
                            disabled={saving}
                            className="px-6 py-2.5 bg-[#008955] hover:bg-[#007044] text-white rounded-lg font-bold text-sm shadow transition-all flex items-center gap-2"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            <span>Save</span>
                          </button>
                        </div>
                      </div>

                      {/* Right Column: Recent Entries Table (अलीकडील नोंदी) */}
                      <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="font-bold text-base text-slate-800 border-b pb-2">
                          {lang === "mr" ? "अलीकडील नोंदी" : "Recent Entries"}
                        </h3>
                        <div className="w-full overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold">
                                <th className="p-3 font-bold">{lang === "mr" ? "दिनांक" : "Date"}</th>
                                <th className="p-3 font-bold">{lang === "mr" ? "साहित्य" : "Material"}</th>
                                <th className="p-3 font-bold">{lang === "mr" ? "प्रमाण" : "Quantity"}</th>
                                <th className="p-3 font-bold text-right"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {incRecords.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="p-8 text-center text-slate-400 font-medium">
                                    {lang === "mr" ? "कोणतीही प्राप्त साठा नोंद उपलब्ध नाही." : "No stock received records found."}
                                  </td>
                                </tr>
                              ) : (
                                incRecords.map((r) => (
                                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                                    <td className="p-3 font-medium text-slate-800">{r.date}</td>
                                    <td className="p-3 font-bold text-slate-900">{r.item}</td>
                                    <td className="p-3 font-bold text-slate-800">{parseFloat(r.qty).toFixed(4)} kg</td>
                                    <td className="p-3 text-right">
                                      <button
                                        onClick={() => handleDeleteIncomingStock(r.id)}
                                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* LOKSAHABHAG (PUBLIC CONTRIBUTION) TAB */}
                {activeTab === "loksahabhag" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-slate-800 border-b pb-3">
                      {lang === "mr" ? "लोकसहभाग नोंद" : "Loksahabhag (Public Contribution)"}
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Left Column: Form Card */}
                      <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="font-bold text-base text-slate-800">
                          {lang === "mr" ? "लोकसहभाग नोंदवा" : "Report Public Contribution"}
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">
                              {lang === "mr" ? "साहित्य *" : "Material / Item *"}
                            </label>
                            <select
                              value={lokItem}
                              onChange={(e) => setLokItem(e.target.value)}
                              className="w-full h-10 px-3 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                            >
                              <option value="">{lang === "mr" ? "साहित्य निवडा" : "Select Material"}</option>
                              <option value="तांदूळ (kg)">तांदूळ (kg) - Rice</option>
                              <option value="मूगडाळ (kg)">मूगडाळ (kg) - Moong Dal</option>
                              <option value="तूरडाळ (kg)">तूरडाळ (kg) - Tur Dal</option>
                              <option value="मसूरडाळ (kg)">मसूरडाळ (kg) - Masoor Dal</option>
                              <option value="मटकी (kg)">मटकी (kg) - Moth Beans</option>
                              <option value="अख्खा मूग (kg)">अख्खा मूग (kg) - Whole Moong</option>
                              <option value="चवळी (kg)">चवळी (kg) - Cowpea</option>
                              <option value="हरभरा (kg)">हरभरा (kg) - Chana</option>
                              <option value="वाटाणा (kg)">वाटाणा (kg) - Peas</option>
                              <option value="सोयाबीन वडी (kg)">सोयाबीन वडी (kg) - Soyabean Chunks</option>
                              <option value="जिरे (kg)">जिरे (kg) - Cumin</option>
                              <option value="मोहरी (kg)">मोहरी (kg) - Mustard</option>
                              <option value="हळद (kg)">हळद (kg) - Turmeric</option>
                              <option value="तिखट मसाला (kg)">तिखट मसाला (kg) - Chili Masala</option>
                              <option value="मीठ (kg)">मीठ (kg) - Salt</option>
                              <option value="गरम मसाला (kg)">गरम मसाला (kg) - Garam Masala</option>
                              <option value="तेल (kg)">तेल (kg) - Cooking Oil</option>
                              <option value="गूळ / साखर (kg)">गूळ / साखर (kg) - Sugar / Jaggery</option>
                              <option value="दूध / दूध पावडर (L)">दूध / दूध पावडर (L) - Milk</option>
                              <option value="भाजीपाला (kg)">भाजीपाला (kg) - Vegetables</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">
                              {lang === "mr" ? "प्रमाण (kg) *" : "Quantity (kg) *"}
                            </label>
                            <input
                              type="number"
                              step="0.001"
                              placeholder="प्रमाण (kg)"
                              value={lokQty}
                              onChange={(e) => setLokQty(e.target.value)}
                              className="w-full h-10 px-3 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">
                              {lang === "mr" ? "दिनांक *" : "Date *"}
                            </label>
                            <input
                              type="date"
                              value={lokDate}
                              onChange={(e) => setLokDate(e.target.value)}
                              className="w-full h-10 px-3 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">
                              {lang === "mr" ? "शेरा" : "Remarks / Details"}
                            </label>
                            <textarea
                              rows={2}
                              placeholder={lang === "mr" ? "शेरा" : "Enter remarks..."}
                              value={lokRemark}
                              onChange={(e) => setLokRemark(e.target.value)}
                              className="w-full p-3 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 resize-y"
                            />
                          </div>
                          <button
                            onClick={handleSaveLoksahabhag}
                            disabled={saving}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {lang === "mr" ? "Save (जतन करा)" : "Save Record"}
                          </button>
                        </div>
                      </div>

                      {/* Right Column: Recent Entries Table */}
                      <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="font-bold text-base text-slate-800">
                          {lang === "mr" ? "अलीकडील नोंदी" : "Recent Entries"}
                        </h3>
                        <div className="w-full overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold">
                                <th className="p-2.5">{lang === "mr" ? "दिनांक" : "Date"}</th>
                                <th className="p-2.5">{lang === "mr" ? "साहित्य" : "Material"}</th>
                                <th className="p-2.5">{lang === "mr" ? "प्रमाण" : "Quantity"}</th>
                                <th className="p-2.5">{lang === "mr" ? "टीप" : "Remark"}</th>
                                <th className="p-2.5 text-right"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {lokRecords.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="p-6 text-center text-slate-400 font-medium">
                                    {lang === "mr" ? "कोणतीही लोकसहभाग नोंद उपलब्ध नाही." : "No public contribution records found."}
                                  </td>
                                </tr>
                              ) : (
                                lokRecords.map((r) => (
                                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                                    <td className="p-2.5 font-medium">{r.date}</td>
                                    <td className="p-2.5 font-bold text-slate-800">{r.item}</td>
                                    <td className="p-2.5 font-bold text-emerald-600">+{r.qty} kg</td>
                                    <td className="p-2.5 text-slate-500">{r.remark || "-"}</td>
                                    <td className="p-2.5 text-right">
                                      <button
                                        onClick={() => handleDeleteLoksahabhag(r.id)}
                                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* DAMAGED STOCK TAB */}
                {activeTab === "damaged-stock" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-slate-800 border-b pb-3">
                      {lang === "mr" ? "खराब साठा नोंद" : "Damaged Stock Register"}
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Left Column: Form Card */}
                      <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="font-bold text-base text-slate-800">
                          {lang === "mr" ? "खराब साठा नोंदवा" : "Report Damaged Stock"}
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">
                              {lang === "mr" ? "साहित्य *" : "Material / Item *"}
                            </label>
                            <select
                              value={damagedItem}
                              onChange={(e) => setDamagedItem(e.target.value)}
                              className="w-full h-10 px-3 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                            >
                              <option value="">{lang === "mr" ? "साहित्य निवडा" : "Select Material"}</option>
                              <option value="तांदूळ (kg)">तांदूळ (kg) - Rice</option>
                              <option value="मूगडाळ (kg)">मूगडाळ (kg) - Moong Dal</option>
                              <option value="तूरडाळ (kg)">तूरडाळ (kg) - Tur Dal</option>
                              <option value="मसूरडाळ (kg)">मसूरडाळ (kg) - Masoor Dal</option>
                              <option value="मटकी (kg)">मटकी (kg) - Moth Beans</option>
                              <option value="अख्खा मूग (kg)">अख्खा मूग (kg) - Whole Moong</option>
                              <option value="चवळी (kg)">चवळी (kg) - Cowpea</option>
                              <option value="हरभरा (kg)">हरभरा (kg) - Chana</option>
                              <option value="वाटाणा (kg)">वाटाणा (kg) - Peas</option>
                              <option value="सोयाबीन वडी (kg)">सोयाबीन वडी (kg) - Soyabean Chunks</option>
                              <option value="जिरे (kg)">जिरे (kg) - Cumin</option>
                              <option value="मोहरी (kg)">मोहरी (kg) - Mustard</option>
                              <option value="हळद (kg)">हळद (kg) - Turmeric</option>
                              <option value="तिखट मसाला (kg)">तिखट मसाला (kg) - Chili Masala</option>
                              <option value="मीठ (kg)">मीठ (kg) - Salt</option>
                              <option value="गरम मसाला (kg)">गरम मसाला (kg) - Garam Masala</option>
                              <option value="तेल (kg)">तेल (kg) - Cooking Oil</option>
                              <option value="गूळ / साखर (kg)">गूळ / साखर (kg) - Sugar / Jaggery</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">
                              {lang === "mr" ? "प्रमाण (kg) *" : "Quantity (kg) *"}
                            </label>
                            <input
                              type="number"
                              step="0.001"
                              placeholder="प्रमाण (kg)"
                              value={damagedQty}
                              onChange={(e) => setDamagedQty(e.target.value)}
                              className="w-full h-10 px-3 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">
                              {lang === "mr" ? "दिनांक *" : "Date *"}
                            </label>
                            <input
                              type="date"
                              value={damagedDate}
                              onChange={(e) => setDamagedDate(e.target.value)}
                              className="w-full h-10 px-3 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">
                              {lang === "mr" ? "कारण" : "Reason / Remarks"}
                            </label>
                            <textarea
                              rows={3}
                              placeholder={lang === "mr" ? "कारण प्रविष्ट करा..." : "Enter reason..."}
                              value={damagedReason}
                              onChange={(e) => setDamagedReason(e.target.value)}
                              className="w-full p-3 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 resize-none"
                            />
                          </div>
                          <button
                            onClick={handleSaveDamagedStock}
                            disabled={saving}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {lang === "mr" ? "Save (जतन करा)" : "Save Record"}
                          </button>
                        </div>
                      </div>

                      {/* Right Column: Recent Entries Table */}
                      <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="font-bold text-base text-slate-800">
                          {lang === "mr" ? "अलीकडील नोंदी" : "Recent Entries"}
                        </h3>
                        <div className="w-full overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold">
                                <th className="p-2.5">{lang === "mr" ? "दिनांक" : "Date"}</th>
                                <th className="p-2.5">{lang === "mr" ? "साहित्य" : "Material"}</th>
                                <th className="p-2.5">{lang === "mr" ? "प्रमाण" : "Quantity"}</th>
                                <th className="p-2.5">{lang === "mr" ? "कारण" : "Reason"}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {damagedRecords.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="p-6 text-center text-slate-400 font-medium">
                                    {lang === "mr" ? "कोणतीही खराब साठा नोंद उपलब्ध नाही." : "No damaged stock records found."}
                                  </td>
                                </tr>
                              ) : (
                                damagedRecords.map((r) => (
                                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                                    <td className="p-2.5 font-medium">{r.date}</td>
                                    <td className="p-2.5 font-bold text-slate-800">{r.item}</td>
                                    <td className="p-2.5 font-bold text-rose-600">{r.qty} kg</td>
                                    <td className="p-2.5 text-slate-600">{r.reason || "-"}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 1. QUANTITY (प्रमाण) TAB - Exact Recipe Formulas UI from Screenshot */}
                {activeTab === "quantity" && (
                  <div className="space-y-6">
                    {/* Main Title */}
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                        Recipe Formulas
                      </h2>
                    </div>

                    {/* Card 1: Formula source */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
                      <h3 className="font-bold text-base text-slate-800">
                        Formula source
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Radio 1: Admin Standard Formulas */}
                        <label
                          onClick={() => setFormulaSource("admin")}
                          className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                            formulaSource === "admin"
                              ? "border-emerald-600 bg-emerald-50/40 shadow-xs"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="formulaSource"
                            checked={formulaSource === "admin"}
                            onChange={() => setFormulaSource("admin")}
                            className="mt-1 accent-emerald-600 w-4 h-4"
                          />
                          <div>
                            <div className="font-bold text-slate-900 text-sm">
                              Admin Standard Formulas
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 font-medium">
                              Government GR standard rates
                            </div>
                          </div>
                        </label>

                        {/* Radio 2: Custom Formulas */}
                        <label
                          onClick={() => setFormulaSource("custom")}
                          className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                            formulaSource === "custom"
                              ? "border-emerald-600 bg-emerald-50/40 shadow-xs"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="formulaSource"
                            checked={formulaSource === "custom"}
                            onChange={() => setFormulaSource("custom")}
                            className="mt-1 accent-emerald-600 w-4 h-4"
                          />
                          <div>
                            <div className="font-bold text-slate-900 text-sm">
                              Custom Formulas
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 font-medium">
                              Adjust values for your school
                            </div>
                          </div>
                        </label>
                      </div>

                      {/* Info Alert Banner */}
                      <div className="bg-blue-50/80 border border-blue-200/90 text-blue-900 text-xs px-4 py-3 rounded-xl font-medium">
                        {formulaSource === "admin"
                          ? "Shows admin standard formula for your selected ingredients. Switch to Custom Formulas to edit values."
                          : "Custom formulas enabled. You can edit quantity values below for your school."}
                      </div>
                    </div>

                    {/* Card 2: Recipe Dropdown & Ingredient Table */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
                      {/* Top Bar: Recipe Selection */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1 max-w-[400px]">
                          <label className="text-xs font-bold text-slate-700 block">
                            Recipe
                          </label>
                          <select
                            value={formulaRecipe}
                            onChange={(e) => setFormulaRecipe(e.target.value)}
                            className="w-full h-10 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          >
                            <option value="Select Recipe">{getTranslatedMenu("Select Menu")}</option>
                            <option value="Vegetable Pulav">{getTranslatedMenu("Vegetable Pulav")}</option>
                            <option value="Masala Rice">{getTranslatedMenu("Masala Rice")}</option>
                            <option value="Matar Pulav">{getTranslatedMenu("Matar Pulav")}</option>
                            <option value="Mungdal Khichadi">{getTranslatedMenu("Mungdal Khichadi")}</option>
                            <option value="Cowpea Khichadi">{getTranslatedMenu("Cowpea Khichadi")}</option>
                            <option value="Chana Pulav">{getTranslatedMenu("Chana Pulav")}</option>
                            <option value="Soyabin Pulav">{getTranslatedMenu("Soyabin Pulav")}</option>
                            <option value="Masuri Pulav">{getTranslatedMenu("Masuri Pulav")}</option>
                            <option value="Egg Pulav">{getTranslatedMenu("Egg Pulav")}</option>
                            <option value="Sprouted Matki Usal">{getTranslatedMenu("Sprouted Matki Usal")}</option>
                            <option value="Sweet Khichadi">{getTranslatedMenu("Sweet Khichadi")}</option>
                            <option value="Mug Shevaga Varan Bhat">{getTranslatedMenu("Mug Shevaga Varan Bhat")}</option>
                            <option value="Rice pudding">{getTranslatedMenu("Rice pudding")}</option>
                            <option value="ragi porridge">{getTranslatedMenu("ragi porridge")}</option>
                            <option value="Sprouted pulses">{getTranslatedMenu("Sprouted pulses")}</option>
                            <option value="Other">{getTranslatedMenu("Other")}</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center pt-2 sm:pt-0">
                          <button
                            onClick={() => setActiveTab("menu")}
                            className="text-emerald-700 hover:text-emerald-800 underline font-semibold text-xs cursor-pointer"
                          >
                            Edit ingredients
                          </button>
                          <button
                            onClick={() => {
                              setQuantityRules(INITIAL_QUANTITY_TAB_RULES);
                              toast.success(t("प्रमाण डीफॉल्ट ॲडमिन दरांवर रिसेट केले!", "Reset to admin standard rates!"));
                            }}
                            className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 shadow-2xs cursor-pointer"
                          >
                            Reset from admin
                          </button>
                        </div>
                      </div>

                      {/* Info Sub-banner when recipe is selected */}
                      {formulaRecipe && formulaRecipe !== "Select Recipe" && (
                        <p className="text-xs font-medium text-emerald-800 bg-emerald-50/80 border border-emerald-200/80 p-2.5 rounded-xl">
                          <span className="font-bold">{getTranslatedMenu(formulaRecipe)}</span> साठी वापरले जाणारे साहित्य दाखवत आहे. बदल करण्यासाठी 'Edit ingredients' वर क्लिक करा.
                        </p>
                      )}

                      {/* Ingredients Table */}
                      <div className="overflow-x-auto border-t border-slate-100 pt-3">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-800 font-extrabold text-[12px]">
                              <th className="p-3 text-left">Ingredient</th>
                              <th className="p-3 text-center w-[120px]">Unit</th>
                              <th className="p-3 text-right w-[200px]">प्राथमिक ( इयत्ता १ ते ५ )</th>
                              <th className="p-3 text-right w-[200px]">उच्च प्राथमिक ( इयत्ता ६ ते ८ )</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(() => {
                              const activeSelectedMap = recipeIngredientsMap[formulaRecipe] || (formulaRecipe === menuType ? selectedMenuItems : null);
                              const filteredRules = formulaRecipe && formulaRecipe !== "Select Recipe" && activeSelectedMap
                                ? quantityRules.filter((row) => !!activeSelectedMap[row.item])
                                : quantityRules;

                              if (filteredRules.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-500 font-medium bg-slate-50/50 rounded-xl">
                                      <p className="text-sm font-semibold text-slate-700">
                                        {getTranslatedMenu(formulaRecipe)} साठी अजून कोणतेही घटक साहित्य निवडलेले नाहीत.
                                      </p>
                                      <p className="text-xs text-slate-500 mt-1">
                                        कृपया प्रथम{" "}
                                        <button
                                          onClick={() => setActiveTab("menu")}
                                          className="text-emerald-600 font-bold underline cursor-pointer"
                                        >
                                          रेसिपी साहित्य (Recipe Ingredients)
                                        </button>{" "}
                                        टॅबमध्ये जाऊन या रेसिपीचे साहित्य निवडा.
                                      </p>
                                    </td>
                                  </tr>
                                );
                              }

                              return filteredRules.map((row) => (
                                <tr key={row.item} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="p-3 text-left font-semibold text-slate-900 text-xs">
                                    {getTranslatedItem(row.item)}
                                  </td>
                                  <td className="p-3 text-center text-slate-500 font-medium">
                                    gm
                                  </td>
                                  <td className="p-2 text-right">
                                    <div className="flex justify-end">
                                      <input
                                        type="number"
                                        step="0.1"
                                        disabled={formulaSource === "admin"}
                                        value={row.qty15}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setQuantityRules((prev) =>
                                            prev.map((r) => (r.item === row.item ? { ...r, qty15: val } : r))
                                          );
                                        }}
                                        className={`w-28 h-9 text-center border rounded-lg font-bold text-xs shadow-2xs transition-all ${
                                          formulaSource === "admin"
                                            ? "bg-slate-100/70 border-slate-200 text-slate-600 cursor-not-allowed"
                                            : "bg-white border-slate-300 text-slate-900 focus:ring-2 focus:ring-emerald-500"
                                        }`}
                                      />
                                    </div>
                                  </td>
                                  <td className="p-2 text-right">
                                    <div className="flex justify-end">
                                      <input
                                        type="number"
                                        step="0.1"
                                        disabled={formulaSource === "admin"}
                                        value={row.qty68}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setQuantityRules((prev) =>
                                            prev.map((r) => (r.item === row.item ? { ...r, qty68: val } : r))
                                          );
                                        }}
                                        className={`w-28 h-9 text-center border rounded-lg font-bold text-xs shadow-2xs transition-all ${
                                          formulaSource === "admin"
                                            ? "bg-slate-100/70 border-slate-200 text-slate-600 cursor-not-allowed"
                                            : "bg-white border-slate-300 text-slate-900 focus:ring-2 focus:ring-emerald-500"
                                        }`}
                                      />
                                    </div>
                                  </td>
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
                      </div>

                      {/* Footer Note */}
                      <div className="pt-2 text-xs font-medium text-slate-500">
                        Enter per-student quantity in <span className="font-bold text-slate-700">gm</span>. Reports display totals in kg.
                      </div>
                    </div>

                    {/* Bottom Primary Button */}
                    <div>
                      <button
                        onClick={async () => {
                          if (!user) return;
                          setSaving(true);
                          try {
                            const udise = getUdise();
                            await setDoc(
                              doc(db, "school_data", `${udise}_mdm`),
                              {
                                quantityTabRules: quantityRules,
                                formulaSource,
                                formulaRecipe,
                                updatedAt: new Date().toISOString(),
                              },
                              { merge: true }
                            );
                            toast.success(t("प्रमाण सेटिंग्स यशस्वीरित्या जतन केल्या!", "Save formula settings successfully!"));
                          } catch (e) {
                            console.error(e);
                            toast.error(t("सेटिंग्स जतन करण्यात अडचण आली.", "Failed to save formula settings"));
                          } finally {
                            setSaving(false);
                          }
                        }}
                        disabled={saving}
                        className="px-6 py-3 bg-[#008955] hover:bg-[#007044] text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>Save formula settings</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. MENU TAB */}
                {activeTab === "menu" && (
                  <div className="w-full space-y-4">
                    {/* Page Title */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">
                          {lang === "mr" ? "रेसिपी साहित्य (Recipe Ingredients)" : "Recipe Ingredients"}
                        </h2>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {lang === "mr" ? "प्रत्येक पाककृतीसाठी (Recipe) वापरले जाणारे घटक साहित्य निवडा व जतन करा" : "Select and save ingredient materials used for each recipe formula"}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowMenuReportModal(true)}
                        className="px-4 py-2 bg-[#047857] hover:bg-[#065f46] text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <FileText className="w-4 h-4" />
                        <span>{lang === "mr" ? "अन्न मेनू अहवाल (PDF)" : "Food Menu Report"}</span>
                      </button>
                    </div>

                    {/* Main Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                      {/* Recipe Dropdown Field */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700 block">
                          Recipe
                        </label>
                        <select
                          value={getRecipeId(menuType) || "Select Menu"}
                          onChange={(e) => handleRecipeChange(e.target.value)}
                          className="w-full h-10 px-3.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-emerald-600 transition-colors"
                        >
                          <option value="Select Menu">Select Recipe</option>
                          {MASTER_RECIPES.map((r) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Show ingredients checklist ONLY when a recipe is selected */}
                      {menuType && menuType !== "Select Menu" ? (
                        <>
                          {/* Instruction Subtext */}
                          <p className="text-xs text-slate-500 leading-relaxed font-medium">
                            Select ingredients used for <span className="font-bold text-slate-900">{getTranslatedMenu(menuType)}</span>. Your selection is saved until you change it. Deselected ingredients keep formula rows at zero and are excluded from daily entry.
                          </p>

                          {/* Checklist Box */}
                          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 max-h-[420px] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* Column 1 */}
                              <div className="space-y-2.5">
                                {[
                                  "Rice",
                                  "Turdal",
                                  "Matki",
                                  "Cowpea",
                                  "Pease",
                                  "Cumin",
                                  "Turmeric",
                                  "Salt",
                                  "Garam Masala",
                                  "Sugar-Jaggery",
                                  "Ragi Satva"
                                ].map((item) => {
                                  const isChecked = !!selectedMenuItems[item];
                                  return (
                                    <label
                                      key={item}
                                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50/80 transition-all cursor-pointer select-none shadow-2xs"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) =>
                                          setSelectedMenuItems({
                                            ...selectedMenuItems,
                                            [item]: e.target.checked,
                                          })
                                        }
                                        className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-0 cursor-pointer accent-emerald-600"
                                      />
                                      <span className="text-sm font-semibold text-slate-800">
                                        {getTranslatedItem(item)}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>

                              {/* Column 2 */}
                              <div className="space-y-2.5">
                                {[
                                  "Mugdal",
                                  "Masurdal",
                                  "Moong",
                                  "Gram",
                                  "Soyabean Wadi",
                                  "Mustard",
                                  "Onion Garlic Masala",
                                  "Chili",
                                  "Oil",
                                  "Milk-Milk Powder",
                                  "Vegetables"
                                ].map((item) => {
                                  const isChecked = !!selectedMenuItems[item];
                                  return (
                                    <label
                                      key={item}
                                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50/80 transition-all cursor-pointer select-none shadow-2xs"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) =>
                                          setSelectedMenuItems({
                                            ...selectedMenuItems,
                                            [item]: e.target.checked,
                                          })
                                        }
                                        className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-0 cursor-pointer accent-emerald-600"
                                      />
                                      <span className="text-sm font-semibold text-slate-800">
                                        {getTranslatedItem(item)}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Action Bar */}
                          <div className="flex items-center gap-4 pt-1">
                            <button
                              onClick={handleSaveMenu}
                              disabled={saving}
                              className="px-5 py-2.5 bg-[#008955] hover:bg-[#007044] text-white rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              <span>Save ingredients</span>
                            </button>
                            <button
                              onClick={() => setActiveTab("quantity")}
                              className="text-sm font-semibold text-[#008955] hover:underline cursor-pointer"
                            >
                              Go to Recipe Formulas →
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                          <p className="text-sm font-semibold text-slate-600">
                            {lang === "mr"
                              ? "साहित्य निवडण्यासाठी कृपया प्रथम वरील ड्रॉपडाउनमधून पाककृती (Recipe) निवडा."
                              : "Please select a Recipe from the dropdown above to choose its ingredients."}
                          </p>
                        </div>
                      )}
                    </div>

                      {/* Food Menu Report Modal */}
                      {showMenuReportModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-transparent backdrop-blur-sm font-sans p-4">
                          <div className="bg-white p-6 rounded-md shadow-2xl border border-slate-200 w-full max-w-[650px] max-h-[95vh] flex flex-col relative print:shadow-none print:border-none print:w-full print:max-w-full print:p-0 print:h-auto">
                            {/* Printable Area */}
                            <div
                              className="border border-black flex-1 overflow-y-auto print:overflow-visible bg-white print:border-none"
                              id="menu-report-print"
                            >
                              {/* Header */}
                              <div className="text-center text-black border-b border-black py-4 print:border-b-2">
                                <h3 className="font-bold text-sm tracking-[0.2em] uppercase">
                                  A B C
                                </h3>
                                <p className="text-sm mt-1">
                                  Taluka: , Jilha:
                                </p>
                                <p className="text-sm mb-2">
                                  Mobile Number: 8010926852 , Email:
                                </p>

                                <div className="flex justify-center mt-1">
                                  <div className="bg-black text-white px-5 py-1 text-xs font-bold rounded shadow-sm print:border print:border-black print:text-black print:bg-white">
                                    {t("अन्न मेनू", "Food Menu", "खाद्य मेनू")}
                                  </div>
                                </div>
                              </div>

                              {/* Table */}
                              <table className="w-full border-collapse text-black text-sm text-center">
                                <thead>
                                  <tr>
                                    <th className="border-b border-r border-black py-2 font-bold w-[25%]">
                                      {t("दिवस", "Day", "दिन")}
                                    </th>
                                    <th className="border-b border-r border-black py-2 font-bold w-[35%]">
                                      {t("अन्न", "Food", "भोजन")}
                                    </th>
                                    <th className="border-b border-black py-2 font-bold w-[40%]">
                                      {t("तपशील", "Details", "विवरण")}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {/* First and Third Week Group */}
                                  <tr className="bg-slate-50 font-semibold text-slate-500">
                                    <td
                                      colSpan={3}
                                      className="border-b border-black py-1 text-center font-bold"
                                    >
                                      {t(
                                        "पहिला आणि तिसरा आठवडा",
                                        "First And Third Week",
                                        "पहला और तीसरा सप्ताह",
                                      )}
                                    </td>
                                  </tr>
                                  {DAYS_OPTIONS.filter(
                                    (d) => d.week === "first-third",
                                  ).map((dayOpt, idx) => {
                                    const record = menuRecords[dayOpt.value];
                                    if (
                                      !record ||
                                      record.menu === "Select Menu"
                                    )
                                      return null;
                                    const detailsList = Object.keys(
                                      record.selectedItems,
                                    )
                                      .filter((k) => record.selectedItems[k])
                                      .map((k) => getTranslatedItem(k))
                                      .join(", ");
                                    return (
                                      <tr key={dayOpt.value}>
                                        <td className="border-b border-r border-black py-2">
                                          {getTranslatedDay(
                                            stripDayNumber(dayOpt.value),
                                          )}
                                        </td>
                                        <td className="border-b border-r border-black py-2">
                                          {getTranslatedMenu(record.menu)}
                                        </td>
                                        <td className="border-b border-black py-2 text-left px-3">
                                          {detailsList}
                                        </td>
                                      </tr>
                                    );
                                  })}

                                  {/* Second and Fourth Week Group */}
                                  <tr className="bg-slate-50 font-semibold text-slate-500">
                                    <td
                                      colSpan={3}
                                      className="border-b border-black py-1 text-center font-bold"
                                    >
                                      {t(
                                        "दुसरा आणि चौथा आठवडा",
                                        "Second And Fourth Week",
                                        "दूसरा और चौथा सप्ताह",
                                      )}
                                    </td>
                                  </tr>
                                  {DAYS_OPTIONS.filter(
                                    (d) => d.week === "second-fourth",
                                  ).map((dayOpt, idx) => {
                                    const record = menuRecords[dayOpt.value];
                                    if (
                                      !record ||
                                      record.menu === "Select Menu"
                                    )
                                      return null;
                                    const detailsList = Object.keys(
                                      record.selectedItems,
                                    )
                                      .filter((k) => record.selectedItems[k])
                                      .map((k) => getTranslatedItem(k))
                                      .join(", ");
                                    return (
                                      <tr key={dayOpt.value}>
                                        <td className="border-b border-r border-black py-2">
                                          {getTranslatedDay(
                                            stripDayNumber(dayOpt.value),
                                          )}
                                        </td>
                                        <td className="border-b border-r border-black py-2">
                                          {getTranslatedMenu(record.menu)}
                                        </td>
                                        <td className="border-b border-black py-2 text-left px-3">
                                          {detailsList}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 mt-4 print:hidden">
                              <button
                                onClick={handleMenuReportDownload}
                                className="px-5 py-1.5 bg-[#007bff] hover:bg-blue-700 text-white rounded text-[13px] font-semibold shadow-md transition-colors"
                              >
                                {t("डाउनलोड पीडीएफ", "Download PDF", "डाउनलोड पीडीएफ")}
                              </button>
                              <button
                                onClick={() => setShowMenuReportModal(false)}
                                className="px-5 py-1.5 bg-[#f44336] hover:bg-red-700 text-white rounded text-[13px] font-semibold shadow-md transition-colors"
                              >
                                {t("बंद करा", "Close", "बंद करें")}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                )}

                {/* 4. DAILY REGISTER TAB */}
                {activeTab === "daily-reg" && (
                  <div className="w-full space-y-4 font-sans">
                    {/* Top Page Title */}
                    <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 gap-3">
                      <h2 className="text-xl font-bold text-slate-800">
                        Daily Attendance Entry
                      </h2>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleRiceReport}
                          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{t("तांदूळ अहवाल", "Rice Report", "चावल रिपोर्ट")}</span>
                        </button>
                        <button
                          onClick={handleGeneralReport}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>{t("दैनिक अहवाल", "General Report", "दैनिक रिपोर्ट")}</span>
                        </button>
                      </div>
                    </div>

                    {/* 2-Column Grid Container */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Left Column: Form Controls (5 cols) */}
                      <div className="lg:col-span-5 space-y-4">
                        {/* Entry Date Card */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-0">
                          <label className="text-xs font-semibold text-slate-600 block">
                            Entry date
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={registerDate}
                              onChange={(e) => setRegisterDate(e.target.value)}
                              className="flex-1 h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                            />
                            <button
                              onClick={() => {}}
                              className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg shadow-sm transition-colors"
                            >
                              Go
                            </button>
                          </div>
                        </div>

                        {/* Banner Info Card */}
                        <div className="bg-emerald-50/70 rounded-xl border border-emerald-200 p-4 space-y-1">
                          <div className="flex items-center justify-between text-emerald-900 font-extrabold text-sm">
                            <span>{registerDate} · {getTranslatedDay(registerDay)}</span>
                          </div>
                          <p className="text-xs font-bold text-emerald-800">
                            Recipe: {getTranslatedMenu(getMenuForRegisterDate(registerDate))}
                          </p>
                          <p className="text-sm font-medium text-emerald-700">
                            Group: प्राथमिक (इयत्ता १ ते ५) · Calendar master · Formula: custom
                          </p>
                        </div>

                        {/* Form Panel */}
                        {(() => {
                          const disableCheck = checkIsDateDisabled(registerDate);
                          const isRegisterDisabled = disableCheck.disabled;

                          return (
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                              {/* Disabled Sunday / Holiday Alert Banner */}
                              {isRegisterDisabled && (
                                <div className="bg-rose-50 border-2 border-rose-200 rounded-xl p-4 space-y-1 my-1 flex items-start gap-3 shadow-2xs">
                                  <Info className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                                  <div>
                                    <h4 className="font-extrabold text-sm text-rose-900 leading-snug">
                                      आज सुट्टी असल्यामुळे हजेरी आणि साठा वजावट नोंदवता येणार नाही.
                                    </h4>
                                    <p className="text-xs font-bold text-rose-700 mt-0.5">
                                      कारण: {disableCheck.reason || (disableCheck.isSunday ? "रविवार सुट्टी" : "नोंदवलेली सुट्टी")}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Radio: Food cooked today */}
                              <div className={`space-y-1.5 p-3 rounded-lg border transition-all ${isRegisterDisabled ? "bg-slate-100/70 border-slate-200 opacity-60 pointer-events-none" : "bg-purple-50/50 border-purple-100"}`}>
                                <label className="text-xs font-bold text-purple-900 block">
                                  आहार शिजवला आहे की नाही
                                </label>
                                <div className="flex items-center gap-6 text-sm font-semibold text-slate-800">
                                  <label className={`flex items-center gap-2 ${isRegisterDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
                                    <input
                                      type="radio"
                                      name="cookedToday"
                                      value="yes"
                                      disabled={isRegisterDisabled}
                                      checked={cookedToday === "yes"}
                                      onChange={(e) => setCookedToday(e.target.value)}
                                      className="text-purple-600 focus:ring-purple-500 disabled:opacity-50"
                                    />
                                    <span>होय</span>
                                  </label>
                                  <label className={`flex items-center gap-2 ${isRegisterDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
                                    <input
                                      type="radio"
                                      name="cookedToday"
                                      value="no"
                                      disabled={isRegisterDisabled}
                                      checked={cookedToday === "no"}
                                      onChange={(e) => setCookedToday(e.target.value)}
                                      className="text-purple-600 focus:ring-purple-500 disabled:opacity-50"
                                    />
                                    <span>नाही</span>
                                  </label>
                                </div>
                              </div>

                              {/* Student Attendance Inputs */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                                <div className="space-y-1">
                                  <label className="text-sm font-bold text-slate-700 block">
                                    पटसंख्या *
                                  </label>
                                  <input
                                    type="number"
                                    placeholder="एकूण पटसंख्या"
                                    disabled={isRegisterDisabled}
                                    value={totalEnrolled}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setTotalEnrolled(val);
                                      setPresentCount(val);
                                      setRegisterBeneficiary(val);
                                    }}
                                    className={`w-full h-10 px-3 border rounded-xl text-center text-sm font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-bold focus:ring-2 outline-none ${
                                      isRegisterDisabled
                                        ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                                        : "bg-white border-slate-300 focus:ring-indigo-200 focus:border-indigo-500"
                                    }`}
                                  />
                                  <p className="text-xs font-bold text-emerald-700 mt-1">
                                    Up to 500 students
                                  </p>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-sm font-bold text-slate-700 block">
                                    हजर विद्यार्थ्यांची संख्या *
                                  </label>
                                  <input
                                    type="number"
                                    placeholder="हजर विद्यार्थ्यांची संख्या"
                                    disabled={isRegisterDisabled}
                                    value={presentCount}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setPresentCount(val);
                                      setRegisterBeneficiary(val);
                                    }}
                                    className={`w-full h-10 px-3 border rounded-xl text-center text-sm font-bold placeholder:text-slate-400 placeholder:font-bold focus:ring-2 outline-none ${
                                      isRegisterDisabled
                                        ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                                        : Number(presentCount) > Number(totalEnrolled) && totalEnrolled !== ""
                                        ? "border-red-400 focus:ring-red-200 focus:border-red-500 text-slate-800"
                                        : "bg-white border-slate-300 focus:ring-indigo-200 focus:border-indigo-500 text-slate-800"
                                    }`}
                                  />
                                  {!isRegisterDisabled && Number(presentCount) > Number(totalEnrolled) && totalEnrolled !== "" && (
                                    <p className="text-xs font-bold text-red-600 leading-tight">
                                      हजर विद्यार्थ्यांची संख्या पटसंख्येपेक्षा जास्त असू शकत नाही.
                                    </p>
                                  )}
                                </div>

                                <div className="space-y-1">
                                  <label className="text-sm font-bold text-slate-700 block">
                                    वापरलेली ताटे *
                                  </label>
                                  <input
                                    type="number"
                                    placeholder="वापरलेली ताटे"
                                    disabled={isRegisterDisabled}
                                    value={registerBeneficiary}
                                    onChange={(e) => setRegisterBeneficiary(e.target.value)}
                                    className={`w-full h-10 px-3 border rounded-xl text-center text-sm font-bold focus:ring-2 outline-none ${
                                      isRegisterDisabled
                                        ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                                        : Number(registerBeneficiary) > Number(presentCount) && presentCount !== ""
                                        ? "border-red-400 text-red-600 focus:ring-red-200 focus:border-red-500"
                                        : "bg-white border-slate-300 text-emerald-700 focus:ring-emerald-200 focus:border-emerald-500"
                                    }`}
                                  />
                                  {!isRegisterDisabled && Number(registerBeneficiary) > Number(presentCount) && presentCount !== "" && (
                                    <p className="text-xs font-bold text-red-600 leading-tight">
                                      वापरलेली ताटे हजर संख्येपेक्षा जास्त असू शकत नाही.
                                    </p>
                                  )}
                                </div>
                              </div>

                              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                प्रथम पटसंख्या, नंतर हजर संख्या, नंतर जेवण घेतलेली ताटे · १ विद्यार्थी = १ ताट · ताट हजर संख्येपेक्षा जास्त नसावीत
                              </p>

                              {/* Auto Ingredient Calculation Cards */}
                              <div className={`space-y-2 pt-1 ${isRegisterDisabled ? "opacity-60 pointer-events-none" : ""}`}>
                                <span className="text-xs font-bold text-slate-800 block">
                                  Automatic ingredient calculation <span className="text-slate-400 font-medium">(kg)</span>
                                </span>

                                {/* Empty Input Helper Banner */}
                                {!isRegisterDisabled && !registerBeneficiary && !presentCount && !totalEnrolled && cookedToday !== "no" && (
                                  <div className="p-4 bg-white border border-slate-200 rounded-xl text-center shadow-xs my-2">
                                    <p className="text-xs font-semibold text-slate-500">
                                      प्रथम पटसंख्या, हजर संख्या, नंतर वापरलेली ताटे प्रविष्ट करा.
                                    </p>
                                  </div>
                                )}

                                {/* Red Warning Banner when Recipe fails or food not cooked */}
                                {!isRegisterDisabled && (cookedToday === "no" || getMenuForRegisterDate(registerDate) === "No Menu Available") && (
                                  <div className="p-4 bg-white border border-red-200 rounded-xl text-center shadow-xs my-2">
                                    <p className="text-xs font-bold text-red-600">
                                      Recipe does not match this entry. Refresh the page.
                                    </p>
                                  </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {/* Green Card: Veggies */}
                                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-0">
                                    <span className="text-xs font-bold text-emerald-900 block">भाजीपाला</span>
                                    <span className="text-sm text-emerald-700 block">
                                      नोंदवहीसाठी — स्टॉक किंवा Calculation वर परिणाम होत नाही
                                    </span>
                                    <div className="space-y-1 pt-1">
                                      <label className="text-sm font-bold text-slate-700 block">भाजीपाला (kg)</label>
                                      <input
                                        type="text"
                                        placeholder="867"
                                        disabled={isRegisterDisabled}
                                        value={veggieKg}
                                        onChange={(e) => setVeggieKg(e.target.value)}
                                        className={`w-full h-9 px-3 border rounded-lg text-sm font-bold text-right text-slate-800 focus:outline-none focus:border-emerald-500 ${
                                          isRegisterDisabled ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed" : "bg-white border-slate-300"
                                        }`}
                                      />
                                    </div>
                                  </div>

                                  {/* Blue Card: Fuel & Veg Allowance */}
                                  <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 space-y-0 relative flex flex-col justify-between">
                                    <div>
                                      <span className="text-xs font-bold text-blue-900 block">इंधन व भाजीपाला अनुदान</span>
                                      <span className="text-sm text-blue-700 block">
                                        {registerClass === "6 To 8" ? "उच्च प्राथमिक (६ ते ८)" : "प्राथमिक ( इयत्ता १ ते ५ )"} · ₹{registerClass === "6 To 8" ? (Number(upperRate || 5.45)).toFixed(2) : (Number(primaryRate || 2.59)).toFixed(2)} प्रति ताट
                                      </span>
                                      <button
                                        onClick={() => setActiveTab("anudan")}
                                        disabled={isRegisterDisabled}
                                        className="text-sm font-bold text-blue-600 underline hover:text-blue-800 block mt-0.5 disabled:text-slate-400 disabled:no-underline"
                                      >
                                        अनुदान सेटिंग
                                      </button>
                                    </div>
                                    <div className="pt-2 border-t border-blue-100">
                                      <span className="text-sm font-bold text-slate-700 block">एकूण अनुदान (₹)</span>
                                      <div className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg flex items-center justify-end">
                                        <span className="text-base font-black text-blue-950">
                                          ₹{(Number(registerBeneficiary || 0) * (registerClass === "6 To 8" ? Number(upperRate || 5.45) : Number(primaryRate || 2.59))).toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Yellow Card: Purak Ahar */}
                                <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
                                  <label className={`flex items-start gap-2.5 select-none ${isRegisterDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
                                    <input
                                      type="checkbox"
                                      disabled={isRegisterDisabled}
                                      checked={purakAhar}
                                      onChange={(e) => setPurakAhar(e.target.checked)}
                                      className="size-4 mt-0.5 rounded border-amber-400 text-amber-600 focus:ring-0 disabled:opacity-50"
                                    />
                                    <div>
                                      <span className="text-xs font-bold text-amber-950 block">पूरक आहार (Purak Ahar)</span>
                                      <span className="text-sm text-amber-800 block">
                                        नोंदवहीसाठी — स्टॉक किंवा Calculation वर परिणाम होत नाही
                                      </span>
                                    </div>
                                  </label>

                                  {purakAhar && (
                                    <div className="space-y-1 pt-1">
                                      <label className="text-xs font-bold text-slate-800 block">
                                        Purak Ahar details
                                      </label>
                                      <textarea
                                        rows={2}
                                        placeholder="e.g. fruit name, quantity, students served..."
                                        disabled={isRegisterDisabled}
                                        value={purakAharDetails}
                                        onChange={(e) => setPurakAharDetails(e.target.value)}
                                        className={`w-full p-2.5 border rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-all shadow-xs ${
                                          isRegisterDisabled ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed" : "bg-white border-indigo-300"
                                        }`}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Remarks */}
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 block">Remarks</label>
                                <textarea
                                  rows={2}
                                  placeholder="Optional"
                                  disabled={isRegisterDisabled}
                                  value={remarks}
                                  onChange={(e) => setRemarks(e.target.value)}
                                  className={`w-full p-2.5 border rounded-lg text-xs font-medium focus:outline-none ${
                                    isRegisterDisabled ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed" : "bg-white border-slate-300 focus:border-slate-400"
                                  }`}
                                />
                              </div>

                              {/* Save Button */}
                              <button
                                onClick={handleSaveRegister}
                                disabled={isRegisterDisabled || saving}
                                className={`w-full py-2.5 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 font-bold text-sm ${
                                  isRegisterDisabled
                                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                                    : "bg-[#047857] hover:bg-[#065f46] text-white cursor-pointer"
                                }`}
                              >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                <span>Save entry</span>
                              </button>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Right Column: Month Register Matrix Table (7 cols) */}
                      <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <h3 className="font-bold text-base text-slate-800">महिन्याच्या नोंदी</h3>
                            <p className="text-xs text-slate-500 font-semibold mt-0.5">
                              {(() => {
                                const d = new Date(registerDate || new Date());
                                const monthNamesMr = ["जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून", "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"];
                                const monthStr = !isNaN(d.getTime()) ? monthNamesMr[d.getMonth()] : "ऑगस्ट";
                                const yearStr = !isNaN(d.getTime()) ? d.getFullYear() : 2026;
                                const acadYearStr = `${yearStr}-${(yearStr + 1).toString().slice(2)}`;
                                return `${monthStr} ${yearStr} · सन ${acadYearStr}`;
                              })()}
                            </p>
                          </div>
                          {(() => {
                            const d = new Date(registerDate || new Date());
                            const year = !isNaN(d.getTime()) ? d.getFullYear() : 2026;
                            const month = !isNaN(d.getTime()) ? d.getMonth() : 7;
                            const daysInMonth = new Date(year, month + 1, 0).getDate();
                            const monthPadded = (month + 1).toString().padStart(2, "0");
                            let filledCount = 0;
                            for (let day = 1; day <= daysInMonth; day++) {
                              const dayPadded = day.toString().padStart(2, "0");
                              const key = `${year}-${monthPadded}-${dayPadded}`;
                              const record = registerRecords ? registerRecords[key] : null;
                              const classData = record ? (record[registerClass] || (registerClass === "1 To 5" ? record : null)) : null;
                              if (classData?.beneficiary || classData?.beneficiaries || (key === registerDate && registerBeneficiary)) {
                                filledCount++;
                              }
                            }
                            return (
                              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 shadow-2xs">
                                {filledCount}/{daysInMonth} दिवस
                              </span>
                            );
                          })()}
                        </div>

                        {/* Scrollable Month Matrix Table */}
                        <div className="w-full overflow-x-auto max-h-[620px] overflow-y-auto border border-slate-200 rounded-lg shadow-2xs">
                          <table className="w-full border-collapse text-left text-xs bg-white">
                            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase z-10">
                              <tr>
                                <th className="p-2.5 border-r border-slate-200 min-w-[65px] text-slate-700 font-bold">DATE</th>
                                <th className="p-2.5 border-r border-slate-200 min-w-[65px] text-slate-700 font-bold">DAY</th>
                                <th className="p-2.5 border-r border-slate-200 min-w-[130px] text-slate-700 font-bold">RECIPE</th>
                                <th className="p-2.5 border-r border-slate-200 text-center min-w-[65px] text-slate-700 font-bold">पटसंख्या</th>
                                <th className="p-2.5 border-r border-slate-200 text-center min-w-[120px] text-slate-700 font-bold">हजर विद्यार्थ्यांची संख्या</th>
                                <th className="p-2.5 border-r border-slate-200 text-center min-w-[85px] text-slate-800 font-extrabold">ताटांची संख्या</th>
                                <th className="p-2.5 border-r border-slate-200 text-center min-w-[75px] leading-tight">
                                  <span>तांदूळ</span><br/><span className="text-[10px] text-slate-400 font-normal lowercase">kg</span>
                                </th>
                                <th className="p-2.5 border-r border-slate-200 text-center min-w-[75px] leading-tight">
                                  <span>मूगडाळ</span><br/><span className="text-[10px] text-slate-400 font-normal lowercase">kg</span>
                                </th>
                                <th className="p-2.5 border-r border-slate-200 text-center min-w-[75px] leading-tight">
                                  <span>तूरडाळ</span><br/><span className="text-[10px] text-slate-400 font-normal lowercase">kg</span>
                                </th>
                                <th className="p-2.5 border-r border-slate-200 text-center min-w-[75px] leading-tight">
                                  <span>मसूरडाळ</span><br/><span className="text-[10px] text-slate-400 font-normal lowercase">kg</span>
                                </th>
                                <th className="p-2.5 border-r border-slate-200 text-center min-w-[75px] leading-tight">
                                  <span>मटकी</span><br/><span className="text-[10px] text-slate-400 font-normal lowercase">kg</span>
                                </th>
                                <th className="p-2.5 border-r border-slate-200 text-center min-w-[80px] leading-tight">
                                  <span>अख्खा मूग</span><br/><span className="text-[10px] text-slate-400 font-normal lowercase">kg</span>
                                </th>
                                <th className="p-2.5 border-r border-slate-200 text-center min-w-[75px] leading-tight">
                                  <span>चवळी</span><br/><span className="text-[10px] text-slate-400 font-normal lowercase">kg</span>
                                </th>
                                <th className="p-2.5 border-r border-slate-200 text-center min-w-[75px] leading-tight">
                                  <span>हरभरा</span><br/><span className="text-[10px] text-slate-400 font-normal lowercase">kg</span>
                                </th>
                                <th className="p-2.5 border-r border-slate-200 text-center min-w-[75px] leading-tight">
                                  <span>वाटाणा</span><br/><span className="text-[10px] text-slate-400 font-normal lowercase">kg</span>
                                </th>
                                <th className="p-2.5 border-r border-slate-200 text-center min-w-[85px] leading-tight">
                                  <span>सोयाबीन वडी</span><br/><span className="text-[10px] text-slate-400 font-normal lowercase">kg</span>
                                </th>
                                <th className="p-2.5 border-r border-slate-200 text-center min-w-[70px] leading-tight">
                                  <span>जिरे</span><br/><span className="text-[10px] text-slate-400 font-normal lowercase">kg</span>
                                </th>
                                <th className="p-2.5 border-r border-slate-200 text-center min-w-[70px] leading-tight">
                                  <span>मोहरी</span><br/><span className="text-[10px] text-slate-400 font-normal lowercase">kg</span>
                                </th>
                                <th className="p-2.5 border-r border-slate-200 text-center min-w-[70px] leading-tight">
                                  <span>हळद</span><br/><span className="text-[10px] text-slate-400 font-normal lowercase">kg</span>
                                </th>
                                <th className="p-2.5 border-r border-slate-200 text-center min-w-[130px] leading-tight">
                                  <span>तिखट मसाला/कांदा लसूण मसाला</span><br/><span className="text-[10px] text-slate-400 font-normal lowercase">kg</span>
                                </th>
                                <th className="p-2.5 border-r border-slate-200 text-center min-w-[70px] leading-tight">
                                  <span>मीठ</span><br/><span className="text-[10px] text-slate-400 font-normal lowercase">kg</span>
                                </th>
                                <th className="p-2.5 border-r border-slate-200 text-center min-w-[90px] leading-tight">
                                  <span>मिरची पावडर</span><br/><span className="text-[10px] text-slate-400 font-normal lowercase">kg</span>
                                </th>
                                <th className="p-2.5 border-r border-slate-200 text-center min-w-[85px] leading-tight">
                                  <span>गरम मसाला</span><br/><span className="text-[10px] text-slate-400 font-normal lowercase">kg</span>
                                </th>
                                <th className="p-2.5 border-r border-slate-200 text-center min-w-[70px] leading-tight">
                                  <span>तेल</span><br/><span className="text-[10px] text-slate-400 font-normal lowercase">kg</span>
                                </th>
                                <th className="p-2.5 border-r border-slate-200 text-center min-w-[85px] bg-amber-50/70 text-amber-900 leading-tight">
                                  <span>गूळ / साखर</span><br/><span className="text-[10px] text-amber-700/70 font-normal lowercase">kg</span>
                                </th>
                                <th className="p-2.5 border-r border-slate-200 text-center min-w-[80px] bg-amber-50/70 text-amber-900 leading-tight">
                                  <span>दूध पावडर</span><br/><span className="text-[10px] text-amber-700/70 font-normal lowercase">kg</span>
                                </th>
                                <th className="p-2.5 border-r border-slate-200 text-center min-w-[85px] bg-amber-50/70 text-amber-900 leading-tight">
                                  <span>नाचणी सत्व</span><br/><span className="text-[10px] text-amber-700/70 font-normal lowercase">kg</span>
                                </th>
                                <th className="p-2.5 border-r border-slate-200 text-center min-w-[80px] bg-emerald-50/70 text-emerald-900 leading-tight">
                                  <span>भाजीपाला</span><br/><span className="text-[10px] text-emerald-700/70 font-normal lowercase">kg</span>
                                </th>
                                <th className="p-2.5 border-r border-slate-200 text-center min-w-[90px] bg-[#FFF9E6] text-[#A16207]">
                                  <span>पूरक आहार</span>
                                </th>
                                <th className="p-2.5 text-center min-w-[135px] bg-[#EFF6FF] text-[#1D4ED8]">
                                  <span>इंधन व भाजीपाला अनुदान</span>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(() => {
                                const dateObj = new Date(registerDate || new Date().toISOString().split("T")[0]);
                                const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;
                                const year = validDate.getFullYear();
                                const month = validDate.getMonth();
                                const daysInMonth = new Date(year, month + 1, 0).getDate();
                                const monthPadded = (month + 1).toString().padStart(2, "0");

                                const dayNamesMr = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];

                                const rows = [];
                                for (let d = 1; d <= daysInMonth; d++) {
                                  const dayPadded = d.toString().padStart(2, "0");
                                  const fullDateKey = `${year}-${monthPadded}-${dayPadded}`;
                                  const currDateObj = new Date(year, month, d);
                                  const dayOfWeek = currDateObj.getDay();
                                  const dayNameStr = dayNamesMr[dayOfWeek];

                                  const savedForDate = registerRecords ? registerRecords[fullDateKey] : null;
                                  const classData = savedForDate ? (savedForDate[registerClass] || (registerClass === "1 To 5" ? savedForDate : null)) : null;

                                  const isCurrentSelectedDate = fullDateKey === registerDate;

                                  const rawMenu = classData?.menu || getMenuForRegisterDate(fullDateKey);
                                  const recipeName = dayOfWeek === 0 ? "सुट्टी" : (rawMenu === "No Menu Available" ? "—" : rawMenu);

                                  const beneCountRaw = isCurrentSelectedDate ? (registerBeneficiary || classData?.beneficiary || classData?.beneficiaries || "") : (classData?.beneficiary || classData?.beneficiaries || "");
                                  const beneNum = Number(beneCountRaw) || 0;

                                  const rawEnr = isCurrentSelectedDate
                                    ? (totalEnrolled || classData?.totalEnrolled || classData?.enrolled || classData?.pat || "")
                                    : (classData?.totalEnrolled || classData?.enrolled || classData?.pat || "");

                                  const rawPres = isCurrentSelectedDate
                                    ? (presentCount || classData?.presentCount || classData?.present || classData?.hajar || "")
                                    : (classData?.presentCount || classData?.present || classData?.hajar || "");

                                  const totalEnr = rawEnr !== "" ? rawEnr : (beneNum > 0 ? beneNum.toString() : "—");
                                  const presentSt = rawPres !== "" ? rawPres : (beneNum > 0 ? beneNum.toString() : "—");
                                  const beneCount = beneNum > 0 ? beneNum.toString() : "—";

                                  const enrNum = Number(totalEnr) || (beneNum > 0 ? beneNum : 0);
                                  const presNum = Number(presentSt) || (beneNum > 0 ? beneNum : 0);

                                  const absentSt = (enrNum > 0 && presNum >= 0) ? Math.max(0, enrNum - presNum).toString() : "—";

                                  const selectedForDay = dayOfWeek === 0 ? null : (classData?.selectedItems || getSelectedItemsForRegisterDate(fullDateKey, registerClass));

                                  const riceKg = beneNum > 0 && (!selectedForDay || selectedForDay["Rice"] !== false) ? (beneNum * (registerClass === "6 To 8" ? 0.15 : 0.1)).toFixed(2) : "—";
                                  const moongKg = beneNum > 0 && (selectedForDay ? selectedForDay["Mugdal"] : recipeName.includes("मूग")) ? (beneNum * 0.02).toFixed(2) : "—";
                                  const turKg = beneNum > 0 && (selectedForDay ? selectedForDay["Turdal"] : recipeName.includes("तूर") || recipeName.includes("वरण")) ? (beneNum * 0.02).toFixed(2) : "—";
                                  const masurKg = beneNum > 0 && (selectedForDay ? selectedForDay["Masurdal"] : recipeName.includes("मसूर")) ? (beneNum * 0.02).toFixed(2) : (classData?.masurKg || "—");
                                  const matkiKg = beneNum > 0 && (selectedForDay ? selectedForDay["Matki"] : (recipeName.includes("मटकी") || recipeName.includes("उसळ"))) ? (beneNum * 0.02).toFixed(2) : (classData?.matkiKg || "—");
                                  const moongAkkhaKg = beneNum > 0 && (selectedForDay ? selectedForDay["Moong"] : recipeName.includes("मूग")) ? (beneNum * 0.02).toFixed(2) : (classData?.moongAkkhaKg || "—");
                                  const chawliKg = beneNum > 0 && (selectedForDay ? selectedForDay["Cowpea"] : recipeName.includes("चवळी")) ? (beneNum * 0.02).toFixed(2) : (classData?.chawliKg || "—");
                                  const harbharaKg = beneNum > 0 && (selectedForDay ? selectedForDay["Gram"] : (recipeName.includes("हरभरा") || recipeName.includes("चना"))) ? (beneNum * 0.02).toFixed(2) : (classData?.harbharaKg || "—");
                                  const vatanaKg = beneNum > 0 && (selectedForDay ? selectedForDay["Pease"] : recipeName.includes("वाटाणा")) ? (beneNum * 0.02).toFixed(2) : (classData?.vatanaKg || "—");
                                  const soyabeanKg = beneNum > 0 && (selectedForDay ? selectedForDay["Soyabean Wadi"] : (recipeName.includes("सोयाबीन") || recipeName.includes("वडी"))) ? (beneNum * 0.015).toFixed(2) : (classData?.soyabeanKg || "—");

                                  const jireKgVal = beneNum > 0 && dayOfWeek !== 0 && (!selectedForDay || selectedForDay["Cumin"] !== false) ? (classData?.jireKg || (beneNum * 0.0005).toFixed(3)) : "—";
                                  const mohariKgVal = beneNum > 0 && dayOfWeek !== 0 && (!selectedForDay || selectedForDay["Mustard"] !== false) ? (classData?.mohariKg || (beneNum * 0.0005).toFixed(3)) : "—";
                                  const haladKgVal = beneNum > 0 && dayOfWeek !== 0 && (!selectedForDay || selectedForDay["Turmeric"] !== false) ? (classData?.haladKg || (beneNum * 0.001).toFixed(3)) : "—";
                                  const tikhatMasalaKgVal = beneNum > 0 && dayOfWeek !== 0 && (selectedForDay ? selectedForDay["Onion Garlic Masala"] : true) ? (classData?.tikhatMasalaKg || (beneNum * 0.002).toFixed(3)) : "—";
                                  const meethKgVal = beneNum > 0 && dayOfWeek !== 0 && (!selectedForDay || selectedForDay["Salt"] !== false) ? (classData?.meethKg || (beneNum * 0.003).toFixed(3)) : "—";
                                  const mirchiPowderKgVal = beneNum > 0 && dayOfWeek !== 0 && (selectedForDay ? selectedForDay["Chili"] : false) ? (classData?.mirchiPowderKg || (beneNum * 0.0015).toFixed(3)) : "—";
                                  const garamMasalaKgVal = beneNum > 0 && dayOfWeek !== 0 && (selectedForDay ? selectedForDay["Garam Masala"] : false) ? (classData?.garamMasalaKg || (beneNum * 0.001).toFixed(3)) : "—";
                                  const telKgVal = beneNum > 0 && dayOfWeek !== 0 && (!selectedForDay || selectedForDay["Oil"] !== false) ? (classData?.telKg || (beneNum * 0.005).toFixed(3)) : "—";

                                  const gulKgVal = isCurrentSelectedDate
                                    ? (classData?.gulKg || ((selectedForDay ? selectedForDay["Sugar-Jaggery"] : (recipeName.includes("गोड") || recipeName.includes("खीर") || recipeName.includes("लापशी"))) ? (beneNum > 0 ? (beneNum * 0.015).toFixed(2) : "—") : "—"))
                                    : (classData?.gulKg || ((selectedForDay ? selectedForDay["Sugar-Jaggery"] : (recipeName.includes("गोड") || recipeName.includes("खीर") || recipeName.includes("लापशी"))) ? (beneNum > 0 ? (beneNum * 0.015).toFixed(2) : "—") : "—"));

                                  const doodhKgVal = isCurrentSelectedDate
                                    ? (classData?.doodhKg || ((selectedForDay ? selectedForDay["Milk-Milk Powder"] : (recipeName.includes("दूध") || recipeName.includes("खीर") || recipeName.includes("नाचणी"))) ? (beneNum > 0 ? (beneNum * 0.01).toFixed(2) : "—") : "—"))
                                    : (classData?.doodhKg || ((selectedForDay ? selectedForDay["Milk-Milk Powder"] : (recipeName.includes("दूध") || recipeName.includes("खीर") || recipeName.includes("नाचणी"))) ? (beneNum > 0 ? (beneNum * 0.01).toFixed(2) : "—") : "—"));

                                  const nachniKgVal = isCurrentSelectedDate
                                    ? (classData?.nachniKg || ((selectedForDay ? selectedForDay["Ragi Satva"] : recipeName.includes("नाचणी")) ? (beneNum > 0 ? (beneNum * 0.015).toFixed(2) : "—") : "—"))
                                    : (classData?.nachniKg || ((selectedForDay ? selectedForDay["Ragi Satva"] : recipeName.includes("नाचणी")) ? (beneNum > 0 ? (beneNum * 0.015).toFixed(2) : "—") : "—"));

                                  const bhajiKgVal = isCurrentSelectedDate
                                    ? (veggieKg || classData?.veggieKg || (beneNum > 0 ? (beneNum * getRecipeItemRate("Vegetables", registerClass)).toFixed(3) : "—"))
                                    : (classData?.veggieKg || (beneNum > 0 ? (beneNum * getRecipeItemRate("Vegetables", registerClass)).toFixed(3) : "—"));

                                  const purakStrVal = isCurrentSelectedDate
                                    ? (purakAhar ? (purakAharDetails || "होय") : (classData?.purakAharDetails || (classData?.purakAhar ? "होय" : "—")))
                                    : (classData?.purakAharDetails || (classData?.purakAhar ? "होय" : "—"));

                                  const rate = registerClass === "6 To 8" ? Number(upperRate || 5.45) : Number(primaryRate || 2.59);
                                  const anudanAmtVal = beneNum > 0 ? `₹${(beneNum * rate).toFixed(2)}` : "—";

                                  rows.push(
                                    <tr
                                      key={fullDateKey}
                                      className={`transition-colors ${
                                        isCurrentSelectedDate
                                          ? "bg-emerald-50/90 border-l-4 border-l-emerald-600 font-bold"
                                          : dayOfWeek === 0
                                          ? "bg-red-50/30 text-red-700"
                                          : d % 2 === 0
                                          ? "bg-white"
                                          : "bg-slate-50/40"
                                      }`}
                                    >
                                      <td className="p-2 border-r border-slate-100 font-bold text-emerald-700 whitespace-nowrap">
                                        {dayPadded}/{monthPadded}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-slate-600 font-medium whitespace-nowrap">
                                        {dayNameStr}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 font-medium text-slate-800 truncate max-w-[130px]">
                                        {getTranslatedMenu(recipeName)}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center font-semibold text-slate-800">
                                        {totalEnr}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center font-semibold text-emerald-800">
                                        {presentSt}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center font-extrabold text-slate-900">
                                        {beneCount}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center text-slate-700 font-semibold">
                                        {riceKg}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center text-slate-700">
                                        {moongKg}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center text-slate-700">
                                        {turKg}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center text-slate-700 font-medium">
                                        {masurKg}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center text-slate-700 font-medium">
                                        {matkiKg}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center text-slate-700 font-medium">
                                        {moongAkkhaKg}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center text-slate-700 font-medium">
                                        {chawliKg}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center text-slate-700 font-medium">
                                        {harbharaKg}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center text-slate-700 font-medium">
                                        {vatanaKg}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center text-slate-700 font-medium">
                                        {soyabeanKg}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center text-slate-700 font-medium">
                                        {jireKgVal}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center text-slate-700 font-medium">
                                        {mohariKgVal}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center text-slate-700 font-medium">
                                        {haladKgVal}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center text-slate-700 font-medium">
                                        {tikhatMasalaKgVal}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center text-slate-700 font-medium">
                                        {meethKgVal}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center text-slate-700 font-medium">
                                        {mirchiPowderKgVal}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center text-slate-700 font-medium">
                                        {garamMasalaKgVal}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center text-slate-700 font-medium">
                                        {telKgVal}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center text-slate-700 font-medium bg-amber-50/20">
                                        {gulKgVal}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center text-slate-700 font-medium bg-amber-50/20">
                                        {doodhKgVal}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center text-slate-700 font-medium bg-amber-50/20">
                                        {nachniKgVal}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center text-slate-700 font-medium bg-emerald-50/20">
                                        {bhajiKgVal}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center text-amber-900 font-semibold bg-amber-50/40 truncate max-w-[100px]" title={purakStrVal}>
                                        {purakStrVal}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center text-blue-900 font-bold bg-blue-50/30 whitespace-nowrap">
                                        {anudanAmtVal}
                                      </td>
                                    </tr>
                                  );
                                }
                                return rows;
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                      {/* 1. Daily Register General Report Modal (Part-II Accounting of Cereals - In Kilogram) */}
                      {showDailyRegisterReportModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-transparent backdrop-blur-sm font-sans p-4">
                          <div className="bg-white p-6 rounded-md shadow-2xl border border-slate-200 w-full max-w-[95%] max-h-[95vh] flex flex-col relative print:shadow-none print:border-none print:w-full print:max-w-full print:p-0 print:h-auto">
                            {/* Printable Area */}
                            <div
                              className="border border-black flex-1 overflow-visible print:overflow-visible bg-white print:border-none"
                              id="general-report-print"
                            >
                              {/* Header */}
                              <div className="text-center text-black border-b border-black py-4 print:border-b-2">
                                <h3 className="font-bold text-sm tracking-[0.2em] uppercase">
                                  {profile?.schoolName || ""}
                                </h3>
                                <p className="text-sm mt-1">
                                  {t("तालुका:", "Taluka:")}{" "}
                                  {profile?.taluka || ""},{" "}
                                  {t("जिल्हा:", "District:")}{" "}
                                  {profile?.district || ""}
                                </p>
                                <p className="text-sm mb-1">
                                  {t(
                                    "प्रधानमंत्री पोषण शक्ती निर्माण योजना",
                                    "Pradhan Mantri Poshan Shakti Nirman Yojana",
                                  )}
                                </p>
                              </div>

                              <table className="w-full border-collapse text-black text-xs text-center table-fixed">
                                <thead>
                                  <tr className="bg-slate-50 font-bold">
                                    <th className="border-b border-r border-black p-1 w-[6%]">
                                      {t("दिनांक", "Date", "दिनांक")}
                                    </th>
                                    <th className="border-b border-r border-black p-1 w-[4%]">
                                      {t(
                                        "एकूण विद्यार्थी",
                                        "Total Student",
                                        "कुल छात्र",
                                      )}
                                    </th>
                                    <th className="border-b border-r border-black p-1 w-[4%]">
                                      {t(
                                        "लाभार्थी संख्या",
                                        "Plate Count",
                                        "लाभार्थी संख्या",
                                      )}
                                    </th>
                                    {[
                                      "Mugdal",
                                      "Turdal",
                                      "Masurdal",
                                      "Matki",
                                      "Moong",
                                      "Cowpea",
                                      "Gram",
                                      "Pease",
                                      "Cumin",
                                      "Mustard",
                                      "Turmeric",
                                      "Chili",
                                      "Oil",
                                      "Salt",
                                      "Onion Garlic Masala",
                                      "Garam Masala",
                                      "Vegetables",
                                    ].map((item) => (
                                      <th
                                        key={item}
                                        className="border-b border-r border-black p-0.5 text-xs truncate"
                                      >
                                        {getTranslatedItem(item)}
                                      </th>
                                    ))}
                                    <th className="border-b border-r border-black p-1 w-[6%]">
                                      {t(
                                        "पूरक आहार",
                                        "Supplementary food",
                                        "पूरक आहार",
                                      )}
                                    </th>
                                    <th className="border-b border-r border-black p-1 w-[5%]">
                                      {t(
                                        "लाभार्थीनिहाय खर्च",
                                        "Beneficiary wise expenditure",
                                        "लाभार्थीवार व्यय",
                                      )}
                                    </th>
                                    <th className="border-b border-black p-1 w-[5%]">
                                      {t(
                                        "भेट देणाऱ्या अधिकाऱ्याची स्वाक्षरी",
                                        "Signature of Visiting Officer",
                                        "निरीक्षण अधिकारी के हस्ताक्षर",
                                      )}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(() => {
                                    const days = getDaysInRegisterMonth();

                                    let sumTotalStudent = 0;
                                    let sumPlateCount = 0;
                                    let sumExpenditure = 0;

                                    const cerealSums = {
                                      Mugdal: 0,
                                      Turdal: 0,
                                      Masurdal: 0,
                                      Matki: 0,
                                      Moong: 0,
                                      Cowpea: 0,
                                      Gram: 0,
                                      Pease: 0,
                                      Cumin: 0,
                                      Mustard: 0,
                                      Turmeric: 0,
                                      Chili: 0,
                                      Oil: 0,
                                      Salt: 0,
                                      "Onion Garlic Masala": 0,
                                      "Garam Masala": 0,
                                      Vegetables: 0,
                                    };

                                    const getVal = (
                                      item: keyof typeof cerealSums,
                                      bene: number,
                                      record: any,
                                      day: any,
                                    ) => {
                                      const rule = quantityRules.find(
                                        (r) =>
                                          r.item.toLowerCase() ===
                                          item.toLowerCase(),
                                      );
                                      if (rule) {
                                        const selectedItems =
                                          record.selectedItems ||
                                          getSelectedItemsForRegisterDate(
                                            day.dateISO,
                                          );
                                        const isItemSelected = selectedItems
                                          ? !!selectedItems[rule.item]
                                          : true;
                                        if (!isItemSelected) {
                                          return "";
                                        }
                                        const qtyStr =
                                          registerClass === "6 To 8"
                                            ? rule.qty68
                                            : rule.qty15;
                                        const qty = Number(qtyStr) || 0;
                                        const val = (qty * bene) / 1000;
                                        cerealSums[item] += val;
                                        return val
                                          .toFixed(4)
                                          .replace(/\.?0+$/, "");
                                      }
                                      return "";
                                    };

                                    const rowsJSX = days.map((day) => {
                                      const outerRecord = registerRecords
                                        ? registerRecords[day.dateISO]
                                        : undefined;
                                      const record = outerRecord
                                        ? (outerRecord[registerClass] || (registerClass === "1 To 5" ? outerRecord : null))
                                        : null;
                                      if (record) {
                                        const enrolled =
                                          Number(record.enrolled) || (registerClass === "1 To 5" ? Number(profile?.patPrimary || 0) : Number(profile?.patUpper || 0));
                                        const bene =
                                          Number(record.beneficiary) || 0;

                                        sumTotalStudent += enrolled;
                                        sumPlateCount += bene;

                                        const exp =
                                          bene *
                                          (registerClass === "6 To 8"
                                            ? 8.17
                                            : 5.45);
                                        sumExpenditure += exp;

                                        return (
                                          <tr key={day.srNo} className="h-5">
                                            <td className="border-b border-r border-black p-0.5">
                                              {day.dateFormatted}
                                            </td>
                                            <td className="border-b border-r border-black p-0.5">
                                              {enrolled}
                                            </td>
                                            <td className="border-b border-r border-black p-0.5 font-bold">
                                              {bene}
                                            </td>
                                            {Object.keys(cerealSums).map(
                                              (item) => (
                                                <td
                                                  key={item}
                                                  className="border-b border-r border-black p-0.5"
                                                >
                                                  {getVal(
                                                    item as keyof typeof cerealSums,
                                                    bene,
                                                    record,
                                                    day,
                                                  )}
                                                </td>
                                              ),
                                            )}
                                            <td className="border-b border-r border-black p-0.5"></td>
                                            <td className="border-b border-r border-black p-0.5 font-bold">
                                              {exp.toFixed(2)}
                                            </td>
                                            <td className="border-b border-black p-0.5"></td>
                                          </tr>
                                        );
                                      } else {
                                        return (
                                          <tr
                                            key={day.srNo}
                                            className="h-5 text-slate-400"
                                          >
                                            <td className="border-b border-r border-black p-0.5">
                                              {day.dateFormatted}
                                            </td>
                                            <td className="border-b border-r border-black p-0.5"></td>
                                            <td className="border-b border-r border-black p-0.5"></td>
                                            {Object.keys(cerealSums).map(
                                              (item) => (
                                                <td
                                                  key={item}
                                                  className="border-b border-r border-black p-0.5"
                                                ></td>
                                              ),
                                            )}
                                            <td className="border-b border-r border-black p-0.5"></td>
                                            <td className="border-b border-r border-black p-0.5"></td>
                                            <td className="border-b border-black p-0.5"></td>
                                          </tr>
                                        );
                                      }
                                    });

                                    const totalRowJSX = (
                                      <tr className="bg-slate-100 font-bold h-6 text-black">
                                        <td className="border-b border-r border-black p-0.5">
                                          {t("एकूण", "Total", "कुल")}
                                        </td>
                                        <td className="border-b border-r border-black p-0.5">
                                          {sumTotalStudent}
                                        </td>
                                        <td className="border-b border-r border-black p-0.5">
                                          {sumPlateCount}
                                        </td>
                                        {Object.keys(cerealSums).map((item) => (
                                          <td
                                            key={item}
                                            className="border-b border-r border-black p-0.5"
                                          >
                                            {cerealSums[
                                              item as keyof typeof cerealSums
                                            ]
                                              .toFixed(4)
                                              .replace(/\.?0+$/, "")}
                                          </td>
                                        ))}
                                        <td className="border-b border-r border-black p-0.5"></td>
                                        <td className="border-b border-r border-black p-0.5">
                                          {sumExpenditure.toFixed(2)}
                                        </td>
                                        <td className="border-b border-black p-0.5"></td>
                                      </tr>
                                    );

                                    return (
                                      <>
                                        {rowsJSX}
                                        {totalRowJSX}
                                      </>
                                    );
                                  })()}
                                </tbody>
                              </table>

                              {/* Certificate */}
                              <div className="p-6 text-black border-t border-black print:border-t-2">
                                <h4 className="text-center font-bold text-xs mb-3">
                                  {t(
                                    "प्रमाणपत्र",
                                    "Certificate",
                                    "प्रमाण पत्र",
                                  )}
                                </h4>
                                <p className="text-[9.5px] leading-relaxed text-justify px-4">
                                  {t(
                                    "याद्वारे प्रमाणित करण्यात येते की, वरील नमूद केलेली रक्कम शालेय पोषण आहार योजनेच्या लाभार्थ्यांसाठी आवश्यक असलेल्या भाजीपाला, पूरक आहार, जळण आणि धान्यांच्या खरेदीवर खर्च करण्यात आली आहे. खर्च योग्य आहे आणि शालेय पोषण आहार योजनेसाठी सरकारच्या विहित मार्गदर्शक तत्त्वांनुसार दैनंदिन स्वयंपाकात साहित्याचा वापर करण्यात आला आहे. मला खात्री आहे की या साहित्याचा वापर अचूक आणि योग्य आहे. म्हणून, हे प्रमाणपत्र जारी केले जात आहे.",
                                    "It is hereby certified that the amount mentioned above has been spent on the purchase of vegetables, supplementary food, fuel, and grains required for the beneficiaries of the school nutrition program. The expenditure is appropriate, and the items have been used in the daily cooking as per the prescribed guidelines of the government for the school nutrition meal scheme. I am confident that the use of these materials is accurate and correct. Therefore, this certificate is being issued.",
                                    "यह प्रमाणित किया जाता है कि उपरोक्त राशि स्कूल पोषण कार्यक्रम के लाभार्थियों के लिए आवश्यक सब्जियों, पूरक आहार, ईंधन और खाद्यान्न की खरीद पर खर्च की गई है। व्यय उचित है, और सरकार के निर्धारित दिशानिर्देशों के अनुसार दैनिक भोजन पकाने में इन सामग्रियों का उपयोग किया गया है। मुझे विश्वास है कि इन सामग्रियों का उपयोग सटीक और सही है। इसलिए, यह प्रमाण पत्र जारी किया जा रहा है।",
                                  )}
                                </p>

                                <div className="flex justify-between items-center mt-10 px-8 text-sm font-bold">
                                  <div className="text-center">
                                    <p>
                                      {t(
                                        "मुख्याध्यापकांची स्वाक्षरी",
                                        "Signature of Principal",
                                        "प्रधानाध्यापक के हस्ताक्षर",
                                      )}
                                    </p>
                                  </div>
                                  <div className="text-center">
                                    <p>
                                      {t("अध्यक्ष", "President", "अध्यक्ष")}
                                    </p>
                                    <p className="text-xs text-slate-500 font-normal">
                                      {t(
                                        "शाळा व्यवस्थापन समिती",
                                        "School Management Committee",
                                        "विद्यालय प्रबंधन समिति",
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <style>{`
                              @media print {
                                body * {
                                  visibility: hidden;
                                }
                                #general-report-print, #general-report-print * {
                                  visibility: visible;
                                }
                                #general-report-print {
                                  position: absolute;
                                  left: 0;
                                  top: 0;
                                  width: 100%;
                                  margin: 0;
                                  padding: 0;
                                }
                              }
                            `}</style>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 mt-4 print:hidden">
                              <button
                                onClick={() => window.print()}
                                className="px-5 py-1.5 bg-[#007bff] hover:bg-blue-700 text-white rounded text-[13px] font-semibold shadow-md transition-colors"
                              >
                                {t("प्रिंट", "Print", "प्रिंट")}
                              </button>
                              <button
                                onClick={() =>
                                  setShowDailyRegisterReportModal(false)
                                }
                                className="px-5 py-1.5 bg-[#f44336] hover:bg-red-700 text-white rounded text-[13px] font-semibold shadow-md transition-colors"
                              >
                                {t("बंद करा", "Close", "बंद करें")}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 2. Rice Report Modal (Accounting of Cereals - Rice In Kilogram) */}
                      {showRiceReportModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-transparent backdrop-blur-sm font-sans p-4">
                          <div className="bg-white p-6 rounded-md shadow-2xl border border-slate-200 w-full max-w-[780px] max-h-[95vh] flex flex-col relative print:shadow-none print:border-none print:w-full print:max-w-full print:p-0 print:h-auto">
                            {/* Printable Area */}
                            <div
                              className="border border-black flex-1 overflow-visible print:overflow-visible bg-white print:border-none"
                              id="rice-report-print"
                            >
                              {/* Header */}
                              <div className="text-center text-black border-b border-black py-4 print:border-b-2">
                                <h3 className="font-bold text-sm tracking-[0.2em] uppercase">
                                  {profile?.schoolName || ""}
                                </h3>
                                <p className="text-sm mt-1">
                                  {t("तालुका:", "Taluka:")}{" "}
                                  {profile?.taluka || ""},{" "}
                                  {t("जिल्हा:", "District:")}{" "}
                                  {profile?.district || ""}
                                </p>
                                <p className="text-sm mb-1">
                                  {t(
                                    "प्रधानमंत्री पोषण शक्ती निर्माण योजना",
                                    "Pradhan Mantri Poshan Shakti Nirman Yojana",
                                  )}
                                </p>

                                <div className="flex justify-center mt-1">
                                  <div className="bg-black text-white px-5 py-1 text-xs font-bold rounded shadow-sm print:border print:border-black print:text-black print:bg-white max-w-[90%]">
                                    {t(
                                      "शाळा स्तरावर ठेवायची दैनिक नोंदवही भाग-२ (धान्य हिशोब)",
                                      "Daily Register to be maintained at school level Part-II (Accounting of Cereals)",
                                      "विद्यालय स्तर पर रखी जाने वाली दैनिक पंजी भाग-II (खाद्यान्न लेखा)",
                                    )}{" "}
                                    ( {t("इयत्ता", "Class", "कक्षा")}{" "}
                                    {registerClass === "6 To 8"
                                      ? t("६ ते ८", "6 To 8", "6 से 8")
                                      : t("१ ते ५", "1 To 5", "1 से 5")}{" "}
                                    )
                                  </div>
                                </div>
                                <div className="flex justify-between items-center px-4 text-sm font-bold mt-2">
                                  <span>
                                    {t(
                                      "तांदूळ (किलोग्राम मध्ये)",
                                      "Rice In Kilogram",
                                      "चावल (किलोग्राम में)",
                                    )}
                                  </span>
                                  <span>
                                    {t("महिना:", "Month:")}{" "}
                                    {getRegisterMonthYear()}
                                  </span>
                                </div>
                              </div>

                              {/* Table */}
                              <table className="w-full border-collapse text-black text-[9.5px] text-center">
                                <thead>
                                  <tr className="bg-slate-50 font-bold">
                                    <th className="border-b border-r border-black py-2 font-bold w-[7%]">
                                      {t("अ.क्र.", "Sr. No", "क्र.")}
                                    </th>
                                    <th className="border-b border-r border-black py-2 font-bold w-[12%]">
                                      {t("दिनांक", "Date", "दिनांक")}
                                    </th>
                                    <th className="border-b border-r border-black py-2 font-bold w-[10%]">
                                      {t(
                                        "पटसंख्या",
                                        "Students Strength",
                                        "छात्र संख्या",
                                      )}
                                    </th>
                                    <th className="border-b border-r border-black py-2 font-bold w-[12%]">
                                      {t(
                                        "मागील महिन्यातील शिल्लक तांदूळ",
                                        "Left over rice from last month",
                                        "पिछले महीने का शेष चावल",
                                      )}
                                    </th>
                                    <th className="border-b border-r border-black py-2 font-bold w-[12%]">
                                      {t(
                                        "चालू महिन्यात प्राप्त तांदूळ",
                                        "Rice received in current month",
                                        "चालू माह में प्राप्त चावल",
                                      )}
                                    </th>
                                    <th className="border-b border-r border-black py-2 font-bold w-[10%]">
                                      {t(
                                        "एकूण तांदूळ",
                                        "Total Rice",
                                        "कुल चावल",
                                      )}
                                    </th>
                                    <th className="border-b border-r border-black py-2 font-bold w-[10%]">
                                      {t(
                                        "लाभार्थी संख्या",
                                        "Beneficiary count",
                                        "लाभार्थी संख्या",
                                      )}
                                    </th>
                                    <th className="border-b border-r border-black py-2 font-bold w-[10%]">
                                      {t(
                                        "शिजवलेला तांदूळ",
                                        "Cooked rice",
                                        "पकाया गया चावल",
                                      )}
                                    </th>
                                    <th className="border-b border-r border-black py-2 font-bold w-[10%]">
                                      {t(
                                        "शिल्लक तांदूळ",
                                        "Leftover rice",
                                        "शेष चावल",
                                      )}
                                    </th>
                                    <th className="border-b border-r border-black py-2 font-bold w-[10%]">
                                      {t(
                                        "मुख्याध्यापकांची स्वाक्षरी",
                                        "Principal signature",
                                        "प्रधानाध्यापक के हस्ताक्षर",
                                      )}
                                    </th>
                                    <th className="border-b border-black py-2 font-bold w-[10%]">
                                      {t(
                                        "भेट देणाऱ्या अधिकाऱ्याची स्वाक्षरी",
                                        "Signature of Visiting Officer",
                                        "निरीक्षण अधिकारी के हस्ताक्षर",
                                      )}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(() => {
                                    const days = getDaysInRegisterMonth();

                                    let sumTotalStudent = 0;
                                    let sumOpeningRice = 120.0; // Realistic sample opening stock
                                    let sumRiceReceived = 200.0; // Realistic sample received stock
                                    let sumTotalRice =
                                      sumOpeningRice + sumRiceReceived;
                                    let sumPlateCount = 0;
                                    let sumCookedRice = 0;
                                    let sumLeftoverRice = sumTotalRice;

                                    let currentOpening = sumOpeningRice;
                                    let currentReceived = sumRiceReceived;

                                    const rowsJSX = days.map((day, idx) => {
                                      const outerRecord = registerRecords
                                        ? registerRecords[day.dateISO]
                                        : undefined;
                                      const record = outerRecord
                                        ? (outerRecord[registerClass] || (registerClass === "1 To 5" ? outerRecord : null))
                                        : null;

                                      // Day 1 has rice receipt, others 0
                                      const dayRecv =
                                        idx === 0 ? currentReceived : 0;
                                      const dayTotal = currentOpening + dayRecv;

                                      if (record) {
                                        const enrolled =
                                          Number(record.enrolled) || (registerClass === "1 To 5" ? Number(profile?.patPrimary || 0) : Number(profile?.patUpper || 0));
                                        const bene =
                                          Number(record.beneficiary) || 0;

                                        sumTotalStudent += enrolled;
                                        sumPlateCount += bene;

                                        // Rice quantity rule: 100g or 150g per student
                                        const selectedItems =
                                          record.selectedItems ||
                                          getSelectedItemsForRegisterDate(
                                            day.dateISO,
                                          );
                                        const isRiceSelected = selectedItems
                                          ? !!selectedItems["Rice"]
                                          : true;
                                        const riceRule = quantityRules.find(
                                          (r) =>
                                            r.item.toLowerCase() === "rice",
                                        );
                                        const customRiceQty = riceRule
                                          ? registerClass === "6 To 8"
                                            ? Number(riceRule.qty68) || 0
                                            : Number(riceRule.qty15) || 0
                                          : registerClass === "6 To 8"
                                            ? 150
                                            : 100;
                                        const riceQtyPerStudent = isRiceSelected
                                          ? customRiceQty / 1000
                                          : 0;
                                        const dayCooked =
                                          bene * riceQtyPerStudent;
                                        sumCookedRice += dayCooked;

                                        const dayLeftover =
                                          dayTotal - dayCooked;
                                        currentOpening = dayLeftover; // Carry forward to next day

                                        return (
                                          <tr key={day.srNo} className="h-5">
                                            <td className="border-b border-r border-black p-0.5">
                                              {day.srNo}
                                            </td>
                                            <td className="border-b border-r border-black p-0.5">
                                              {day.dateFormatted}
                                            </td>
                                            <td className="border-b border-r border-black p-0.5">
                                              {enrolled}
                                            </td>
                                            <td className="border-b border-r border-black p-0.5">
                                              {(dayTotal - dayRecv).toFixed(2)}
                                            </td>
                                            <td className="border-b border-r border-black p-0.5">
                                              {dayRecv.toFixed(2)}
                                            </td>
                                            <td className="border-b border-r border-black p-0.5">
                                              {dayTotal.toFixed(2)}
                                            </td>
                                            <td className="border-b border-r border-black p-0.5 font-bold">
                                              {bene}
                                            </td>
                                            <td className="border-b border-r border-black p-0.5 font-bold">
                                              {dayCooked.toFixed(2)}
                                            </td>
                                            <td className="border-b border-r border-black p-0.5 font-bold">
                                              {dayLeftover.toFixed(2)}
                                            </td>
                                            <td className="border-b border-r border-black p-0.5"></td>
                                            <td className="border-b border-black p-0.5"></td>
                                          </tr>
                                        );
                                      } else {
                                        // Carry forward opening stock
                                        const dayLeftover = dayTotal;
                                        currentOpening = dayLeftover;

                                        return (
                                          <tr
                                            key={day.srNo}
                                            className="h-5 text-slate-400"
                                          >
                                            <td className="border-b border-r border-black p-0.5">
                                              {day.srNo}
                                            </td>
                                            <td className="border-b border-r border-black p-0.5">
                                              {day.dateFormatted}
                                            </td>
                                            <td className="border-b border-r border-black p-0.5"></td>
                                            <td className="border-b border-r border-black p-0.5"></td>
                                            <td className="border-b border-r border-black p-0.5"></td>
                                            <td className="border-b border-r border-black p-0.5"></td>
                                            <td className="border-b border-r border-black p-0.5"></td>
                                            <td className="border-b border-r border-black p-0.5"></td>
                                            <td className="border-b border-r border-black p-0.5"></td>
                                            <td className="border-b border-r border-black p-0.5"></td>
                                            <td className="border-b border-black p-0.5"></td>
                                          </tr>
                                        );
                                      }
                                    });

                                    sumLeftoverRice = currentOpening;

                                    const totalRowJSX = (
                                      <tr className="bg-slate-100 font-bold h-6 text-black">
                                        <td
                                          className="border-b border-r border-black p-0.5"
                                          colSpan={2}
                                        >
                                          {t("एकूण", "Total", "कुल")}
                                        </td>
                                        <td className="border-b border-r border-black p-0.5">
                                          {sumTotalStudent}
                                        </td>
                                        <td className="border-b border-r border-black p-0.5">
                                          {sumOpeningRice.toFixed(2)}
                                        </td>
                                        <td className="border-b border-r border-black p-0.5">
                                          {sumRiceReceived.toFixed(2)}
                                        </td>
                                        <td className="border-b border-r border-black p-0.5">
                                          {sumTotalRice.toFixed(2)}
                                        </td>
                                        <td className="border-b border-r border-black p-0.5">
                                          {sumPlateCount}
                                        </td>
                                        <td className="border-b border-r border-black p-0.5">
                                          {sumCookedRice.toFixed(2)}
                                        </td>
                                        <td className="border-b border-r border-black p-0.5">
                                          {sumLeftoverRice.toFixed(2)}
                                        </td>
                                        <td className="border-b border-r border-black p-0.5"></td>
                                        <td className="border-b border-black p-0.5"></td>
                                      </tr>
                                    );

                                    return (
                                      <>
                                        {rowsJSX}
                                        {totalRowJSX}
                                      </>
                                    );
                                  })()}
                                </tbody>
                              </table>

                              {/* Certificate */}
                              <div className="p-6 text-black border-t border-black print:border-t-2">
                                <h4 className="text-center font-bold text-xs mb-3">
                                  {t(
                                    "प्रमाणपत्र",
                                    "Certificate",
                                    "प्रमाण पत्र",
                                  )}
                                </h4>
                                <p className="text-[9.5px] leading-relaxed text-justify px-4">
                                  {t(
                                    "याद्वारे प्रमाणित करण्यात येते की, वरील नमूद केलेली रक्कम शालेय पोषण आहार योजनेच्या लाभार्थ्यांसाठी आवश्यक असलेल्या भाजीपाला, पूरक आहार, जळण आणि धान्यांच्या खरेदीवर खर्च करण्यात आली आहे. खर्च योग्य आहे आणि शालेय पोषण आहार योजनेसाठी सरकारच्या विहित मार्गदर्शक तत्त्वांनुसार दैनंदिन स्वयंपाकात साहित्याचा वापर करण्यात आला आहे. मला खात्री आहे की या साहित्याचा वापर अचूक आणि योग्य आहे. म्हणून, हे प्रमाणपत्र जारी केले जात आहे.",
                                    "It is hereby certified that the amount mentioned above has been spent on the purchase of vegetables, supplementary food, fuel, and grains required for the beneficiaries of the school nutrition program. The expenditure is appropriate, and the items have been used in the daily cooking as per the prescribed guidelines of the government for the school nutrition meal scheme. I am confident that the use of these materials is accurate and correct. Therefore, this certificate is being issued.",
                                    "यह प्रमाणित किया जाता है कि उपरोक्त राशि स्कूल पोषण कार्यक्रम के लाभार्थियों के लिए आवश्यक सब्जियों, पूरक आहार, ईंधन और खाद्यान्न की खरीद पर खर्च की गई है। व्यय उचित है, और सरकार के निर्धारित दिशानिर्देशों के अनुसार दैनिक भोजन पकाने में इन सामग्रियों का उपयोग किया गया है। मुझे विश्वास है कि इन सामग्रियों का उपयोग सटीक और सही है। इसलिए, यह प्रमाण पत्र जारी किया जा रहा है।",
                                  )}
                                </p>

                                <div className="flex justify-between items-center mt-10 px-8 text-sm font-bold">
                                  <div className="text-center">
                                    <p>
                                      {t(
                                        "मुख्याध्यापकांची स्वाक्षरी",
                                        "Signature of Principal",
                                        "प्रधानाध्यापक के हस्ताक्षर",
                                      )}
                                    </p>
                                  </div>
                                  <div className="text-center">
                                    <p>
                                      {t("अध्यक्ष", "President", "अध्यक्ष")}
                                    </p>
                                    <p className="text-xs text-slate-500 font-normal">
                                      {t(
                                        "शाळा व्यवस्थापन समिती",
                                        "School Management Committee",
                                        "विद्यालय प्रबंधन समिति",
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <style>{`
                              @media print {
                                body * {
                                  visibility: hidden;
                                }
                                #rice-report-print, #rice-report-print * {
                                  visibility: visible;
                                }
                                #rice-report-print {
                                  position: absolute;
                                  left: 0;
                                  top: 0;
                                  width: 100%;
                                  margin: 0;
                                  padding: 0;
                                }
                              }
                            `}</style>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 mt-4 print:hidden">
                              <button
                                onClick={() => window.print()}
                                className="px-5 py-1.5 bg-[#007bff] hover:bg-blue-700 text-white rounded text-[13px] font-semibold shadow-md transition-colors"
                              >
                                {t("प्रिंट", "Print", "प्रिंट")}
                              </button>
                              <button
                                onClick={() => setShowRiceReportModal(false)}
                                className="px-5 py-1.5 bg-[#f44336] hover:bg-red-700 text-white rounded text-[13px] font-semibold shadow-md transition-colors"
                              >
                                {t("बंद करा", "Close", "बंद करें")}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                )}


                {/* 5. STOCK TAB */}
                {activeTab === "stock" && (
                  <div className="bg-white p-12 border border-slate-300 w-full min-h-[800px] flex flex-col items-center">
                    <div className="w-full max-w-[800px] space-y-10">
                      {/* Title */}
                      <div className="text-center py-4">
                        <h2 className="text-2xl font-bold text-[#004C99]">
                          {t_global.mdm_stock_now}
                        </h2>
                      </div>

                      {/* Dropdowns Row */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-2 text-slate-800 w-full">
                        <div className="space-y-0">
                          <label className="text-sm font-bold block text-slate-800">
                            {t("वर्ष:", "Year:")}
                          </label>
                          <select
                            value={stockYear}
                            onChange={(e) => {
                              setStockYear(e.target.value);
                            }}
                            className="w-full h-10 px-3 bg-white border border-[#ccc] rounded shadow-none text-sm font-normal text-slate-800 outline-none focus:border-slate-400"
                          >
                            <option value="Select Year">
                              {t("वर्ष निवडा", "Select Year")}
                            </option>
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                            <option value="2027">2027</option>
                          </select>
                        </div>

                        <div className="space-y-0">
                          <label className="text-sm font-bold block text-slate-800">
                            {t("महिना:", "Month:")}
                          </label>
                          <select
                            value={stockMonth}
                            onChange={(e) => {
                              setStockMonth(e.target.value);
                            }}
                            className="w-full h-10 px-3 bg-white border border-[#ccc] rounded shadow-none text-sm font-normal text-slate-800 outline-none focus:border-slate-400"
                          >
                            <option value="Select Month">
                              {t("महिना निवडा", "Select Month")}
                            </option>
                            {[
                              "January",
                              "February",
                              "March",
                              "April",
                              "May",
                              "June",
                              "July",
                              "August",
                              "September",
                              "October",
                              "November",
                              "December",
                            ].map((m) => (
                              <option key={m} value={m}>
                                {t(
                                  m === "January"
                                    ? "जानेवारी"
                                    : m === "February"
                                      ? "फेब्रुवारी"
                                      : m === "March"
                                        ? "मार्च"
                                        : m === "April"
                                          ? "एप्रिल"
                                          : m === "May"
                                            ? "मे"
                                            : m === "June"
                                              ? "जून"
                                              : m === "July"
                                                ? "जुलै"
                                                : m === "August"
                                                  ? "ऑगस्ट"
                                                  : m === "September"
                                                    ? "सप्टेंबर"
                                                    : m === "October"
                                                      ? "ऑक्टोबर"
                                                      : m === "November"
                                                        ? "नोव्हेंबर"
                                                        : "डिसेंबर",
                                  m,
                                  m === "January"
                                    ? "जनवरी"
                                    : m === "February"
                                      ? "फरवरी"
                                      : m === "March"
                                        ? "मार्च"
                                        : m === "April"
                                          ? "अप्रैल"
                                          : m === "May"
                                            ? "मई"
                                            : m === "June"
                                              ? "जून"
                                              : m === "July"
                                                ? "जुलाई"
                                                : m === "August"
                                                  ? "अगस्त"
                                                  : m === "September"
                                                    ? "सितंबर"
                                                    : m === "October"
                                                      ? "अक्टूबर"
                                                      : m === "November"
                                                        ? "नवंबर"
                                                        : "दिसंबर",
                                )}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-0">
                          <label className="text-sm font-bold block text-slate-800">
                            {t("इयत्ता:", "Class:")}
                          </label>
                          <select
                            value={stockClass}
                            onChange={(e) => {
                              setStockClass(e.target.value);
                            }}
                            className="w-full h-10 px-3 bg-white border border-[#ccc] rounded shadow-none text-sm font-normal text-slate-800 outline-none focus:border-slate-400"
                          >
                            <option value="Select Class">
                              {t("इयत्ता निवडा", "Select Class")}
                            </option>
                            <option value="1 To 5">
                              {t("१ ते ५", "1 To 5", "1 से 5")}
                            </option>
                            <option value="6 To 8">
                              {t("६ ते ८", "6 To 8", "6 से 8")}
                            </option>
                          </select>
                        </div>

                        <div className="space-y-0">
                          <label className="text-sm font-bold block text-slate-800">
                            {t("तारीख (As on Date):", "As on Date:")}
                          </label>
                          <input
                            type="date"
                            value={stockAsOnDate}
                            onChange={(e) => handleStockDateChange(e.target.value)}
                            className="w-full h-10 px-3 bg-white border border-[#ccc] rounded shadow-none text-sm font-normal text-slate-800 outline-none focus:border-slate-400 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Buttons Row */}
                      <div className="flex justify-center items-center gap-6 py-4 w-full">
                        <button
                          onClick={handleViewStockData}
                          className="px-6 py-2 bg-[#4CAF50] hover:bg-[#43A047] text-white rounded text-sm font-semibold transition-colors"
                        >
                          {t("माहिती पहा", "View Data")}
                        </button>
                        <button
                          onClick={handleStockReport}
                          className="px-6 py-2 bg-[#D4A017] hover:bg-[#B8860B] text-white rounded text-sm font-semibold transition-colors"
                        >
                          {t("अहवाल", "Report")}
                        </button>
                      </div>

                      {showStockTable && (
                        <>
                          {/* Divider */}
                          <div className="h-px w-full bg-slate-300" />

                          {/* Table Section */}
                          <div className="w-full overflow-x-auto">
                            <table className="w-full border-collapse border border-black text-slate-900 bg-white">
                              <thead>
                                <tr className="bg-slate-50 font-bold">
                                  <th className="border border-black p-2 text-xs font-bold text-center w-[15%]">
                                    {t("धान्य/माल", "Goods", "सामग्री")}
                                  </th>
                                  <th className="border border-black p-2 text-xs font-bold text-center w-[12%]">
                                    {t(
                                      "मागील साठा",
                                      "Previous Stock",
                                      "पिछला स्टॉक",
                                    )}
                                  </th>
                                  <th className="border border-black p-2 text-xs font-bold text-center w-[12%]">
                                    {t(
                                      "प्राप्त धान्य",
                                      "Received Goods",
                                      "प्राप्त स्टॉक",
                                    )}
                                  </th>
                                  <th className="border border-black p-2 text-xs font-bold text-center w-[12%]">
                                    {t(
                                      "एकूण धान्य",
                                      "Total Goods",
                                      "कुल स्टॉक",
                                    )}
                                  </th>
                                  <th className="border border-black p-2 text-xs font-bold text-center w-[12%]">
                                    {t(
                                      "भोजन शिजवलेले दिवस",
                                      "Food Cooked Days",
                                      "भोजन पकाने के दिन",
                                    )}
                                  </th>
                                  <th className="border border-black p-2 text-xs font-bold text-center w-[12%]">
                                    {t(
                                      "लाभार्थी - चालू महिन्यात",
                                      "Beneficiary - in current month",
                                      "लाभार्थी - चालू माह",
                                    )}
                                  </th>
                                  <th className="border border-black p-2 text-xs font-bold text-center w-[12%]">
                                    {t(
                                      "भोजनासाठी वापरलेले साहित्य",
                                      "Items used for cooking food",
                                      "पकाने में प्रयुक्त सामग्री",
                                    )}
                                  </th>
                                  <th className="border border-black p-2 text-xs font-bold text-center w-[13%]">
                                    {t(
                                      "शिल्लक धान्य",
                                      "Remaining Goods",
                                      "शेष सामग्री",
                                    )}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {stockRecords.map((item, idx) => {
                                  const totalGoods =
                                    Number(item.prev) + Number(item.received);
                                  const remainingGoods = Math.max(0, totalGoods - Number(item.used) - Number(item.damaged || 0));

                                  return (
                                    <tr
                                      key={idx}
                                      className="bg-white h-8 text-xs"
                                    >
                                      {/* Goods */}
                                      <td className="border border-black p-1 text-center font-bold text-slate-800">
                                        {t(
                                          item.item === "Rice"
                                            ? "तांदूळ"
                                            : item.item === "Mugdal"
                                              ? "मूग डाळ"
                                              : item.item === "Turdal"
                                                ? "तूर डाळ"
                                                : item.item === "Masurdal"
                                                  ? "मसूर डाळ"
                                                  : item.item === "Matki"
                                                    ? "मटकी"
                                                    : item.item === "Moong"
                                                      ? "मूग"
                                                      : item.item === "Cowpea"
                                                        ? "चवळी"
                                                        : item.item === "Gram"
                                                          ? "हरभरा"
                                                          : item.item ===
                                                            "Pease"
                                                            ? "वाटाणा"
                                                            : item.item ===
                                                              "Cumin"
                                                              ? "जिरे"
                                                              : item.item ===
                                                                "Mustard"
                                                                ? "मोहरी"
                                                                : item.item ===
                                                                  "Turmeric"
                                                                  ? "हळद"
                                                                  : item.item ===
                                                                    "Chili"
                                                                    ? "मिरची"
                                                                    : item.item ===
                                                                      "Oil"
                                                                      ? "तेल"
                                                                      : item.item ===
                                                                        "Salt"
                                                                        ? "मीठ"
                                                                        : item.item ===
                                                                          "Onion Garlic Masala"
                                                                          ? "कांदा लसूण मसाला"
                                                                          : item.item ===
                                                                            "Garam Masala"
                                                                            ? "गरम मसाला"
                                                                            : item.item ===
                                                                              "Vegetables"
                                                                              ? "भाजीपाला"
                                                                              : item.item ===
                                                                                "Milk-Milk Powder"
                                                                                ? "दूध/दूध पावडर"
                                                                                : item.item ===
                                                                                  "Sugar-Jaggery"
                                                                                  ? "साखर/गूळ"
                                                                                  : item.item ===
                                                                                    "Soyabean Wadi"
                                                                                    ? "सोयाबीन वडी"
                                                                                    : item.item ===
                                                                                      "Ragi Satva"
                                                                                      ? "नाचणी सत्व"
                                                                                      : item.item ===
                                                                                        "Expenses"
                                                                                        ? "खर्च"
                                                                                        : item.item,
                                          item.item,
                                          item.item === "Rice"
                                            ? "चावल"
                                            : item.item === "Mugdal"
                                              ? "मूग दाल"
                                              : item.item === "Turdal"
                                                ? "अरहर दाल (तूर दाल)"
                                                : item.item === "Masurdal"
                                                  ? "मसूर दाल"
                                                  : item.item === "Matki"
                                                    ? "मटकी"
                                                    : item.item === "Moong"
                                                      ? "मूग"
                                                      : item.item === "Cowpea"
                                                        ? "लोबिया"
                                                        : item.item === "Gram"
                                                          ? "चना"
                                                          : item.item ===
                                                            "Pease"
                                                            ? "मटर"
                                                            : item.item ===
                                                              "Cumin"
                                                              ? "जीरा"
                                                              : item.item ===
                                                                "Mustard"
                                                                ? "सरसों"
                                                                : item.item ===
                                                                  "Turmeric"
                                                                  ? "हल्दी"
                                                                  : item.item ===
                                                                    "Chili"
                                                                    ? "मिर्च"
                                                                    : item.item ===
                                                                      "Oil"
                                                                      ? "तेल"
                                                                      : item.item ===
                                                                        "Salt"
                                                                        ? "नमक"
                                                                        : item.item ===
                                                                          "Onion Garlic Masala"
                                                                          ? "प्याज लहसुन मसाला"
                                                                          : item.item ===
                                                                            "Garam Masala"
                                                                            ? "गरम मसाला"
                                                                            : item.item ===
                                                                              "Vegetables"
                                                                              ? "सब्जियाँ"
                                                                              : item.item ===
                                                                                "Milk-Milk Powder"
                                                                                ? "दूध पाउडर"
                                                                                : item.item ===
                                                                                  "Sugar-Jaggery"
                                                                                  ? "चीनी/गुड़"
                                                                                  : item.item ===
                                                                                    "Soyabean Wadi"
                                                                                    ? "सोयाबीन वडी"
                                                                                    : item.item ===
                                                                                      "Ragi Satva"
                                                                                      ? "रागी सत्व"
                                                                                      : item.item ===
                                                                                        "Expenses"
                                                                                        ? "खर्च"
                                                                                        : item.item,
                                        )}
                                      </td>

                                      {/* Previous Stock */}
                                      <td className="border border-black p-1 text-center">
                                        <input
                                          type="number"
                                          value={item.prev}
                                          readOnly
                                          className="w-[90%] mx-auto text-center border border-slate-200 rounded p-1 outline-none bg-slate-50 text-slate-500 font-bold"
                                        />
                                      </td>

                                      {/* Received Goods */}
                                      <td className="border border-black p-1 text-center">
                                        <input
                                          type="number"
                                          value={item.received}
                                          readOnly
                                          className="w-[90%] mx-auto text-center border border-slate-200 rounded p-1 outline-none bg-slate-50 text-slate-500 font-bold"
                                        />
                                      </td>

                                      {/* Total Goods */}
                                      <td className="border border-black p-1 text-center font-bold text-slate-700">
                                        {totalGoods}
                                      </td>

                                      {/* Food Cooked Days */}
                                      <td className="border border-black p-1 text-center">
                                        <input
                                          type="number"
                                          value={item.cookedDays}
                                          readOnly
                                          className="w-[90%] mx-auto text-center border border-slate-200 rounded p-1 outline-none bg-slate-50 text-slate-500 font-bold"
                                        />
                                      </td>

                                      {/* Beneficiary - in current month */}
                                      <td className="border border-black p-1 text-center">
                                        <input
                                          type="number"
                                          value={item.beneficiary}
                                          readOnly
                                          className="w-[90%] mx-auto text-center border border-slate-200 rounded p-1 outline-none bg-slate-50 text-slate-500 font-bold"
                                        />
                                      </td>

                                      {/* Items used for cooking food */}
                                      <td className="border border-black p-1 text-center">
                                        <input
                                          type="number"
                                          value={item.used}
                                          readOnly
                                          className="w-[90%] mx-auto text-center border border-slate-200 rounded p-1 outline-none bg-slate-50 text-slate-500 font-bold"
                                        />
                                      </td>

                                      {/* Remaining Goods */}
                                      <td className="border border-black p-1 text-center font-bold text-teal-600">
                                        {remainingGoods}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Save Button Row */}
                          <div className="py-2 w-full flex justify-start">
                            <button
                              onClick={handleSaveStock}
                              className="px-5 py-2 bg-[#4CAF50] hover:bg-[#43A047] text-white rounded text-xs font-bold shadow-md transition-colors"
                            >
                              {t("जतन करा", "Save")}
                            </button>
                          </div>
                        </>
                      )}

                      {/* B-Form Report Modal (Current Stock "B" Form Report Overlay) */}
                      {showStockReportModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm font-sans p-4">
                          <div className="bg-white p-6 rounded-md shadow-2xl border border-slate-200 w-full max-w-[95%] max-h-[95vh] flex flex-col relative print:shadow-none print:border-none print:w-full print:max-w-full print:p-0 print:h-auto font-sans text-slate-900 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.25)]">
                            {/* Printable Area */}
                            <div
                              className="border border-black flex-1 overflow-visible print:overflow-visible bg-white print:border-none"
                              id="stock-report-print"
                            >
                              {/* Header */}
                              <div className="flex justify-between items-center text-black border-b border-black p-4 font-sans print:border-b-2">
                                {/* Left Column */}
                                <div className="text-left text-sm leading-relaxed w-[30%]">
                                  <p>{t("केंद्र :", "Center :")}</p>
                                  <p className="font-bold">
                                    {t("शाळेचे नाव :", "School Name :")}{" "}
                                    {profile?.schoolName || ""}
                                  </p>
                                  <p>{t("तालुका , जिल्हा", "Tal , Dist.")}</p>
                                </div>

                                {/* Center Column */}
                                <div className="text-center flex flex-col items-center flex-1 w-[40%]">
                                  <p className="text-sm font-semibold tracking-wide">
                                    {t(
                                      "प्रधानमंत्री पोषण शक्ती निर्माण योजना",
                                      "Pradhan Mantri Poshan Shakti Nirman Yojana",
                                    )}
                                  </p>
                                  <p className="text-sm font-bold text-slate-700 mt-0.5">
                                    {t("इयत्ता", "Class")}{" "}
                                    {stockClass === "6 To 8"
                                      ? "VI To VIII"
                                      : "I To V"}
                                  </p>

                                  <div className="mt-2 bg-black text-white px-5 py-1 text-xs font-bold rounded-lg uppercase tracking-wide">
                                    {t('मासिक "ब" पत्रक', 'Monthly "B" Form')}
                                  </div>
                                </div>

                                {/* Right Column Box */}
                                <div className="text-right w-[30%] flex justify-end">
                                  <div className="border border-black p-2 rounded text-sm bg-slate-50 print:bg-white text-left font-medium w-[220px] leading-relaxed">
                                    <p>
                                      <span className="font-bold">
                                        {t("एकूण लाभार्थी:", "Students count:")}
                                      </span>{" "}
                                      {stockRecords.reduce(
                                        (acc, item) => acc + item.beneficiary,
                                        0,
                                      )}{" "}
                                      &nbsp;&nbsp;{" "}
                                      <span className="font-bold">
                                        {t("कामकाजाचे दिवस:", "Working Days:")}
                                      </span>{" "}
                                      {stockRecords.reduce(
                                        (acc, item) => acc + item.cookedDays,
                                        0,
                                      )}
                                    </p>
                                    <p className="mt-1">
                                      <span className="font-bold">
                                        {t("महिना:", "Month:")}
                                      </span>{" "}
                                      {t(
                                        stockMonth === "January"
                                          ? "जानेवारी"
                                          : stockMonth === "February"
                                            ? "फेब्रुवारी"
                                            : stockMonth === "March"
                                              ? "मार्च"
                                              : stockMonth === "April"
                                                ? "एप्रिल"
                                                : stockMonth === "May"
                                                  ? "मे"
                                                  : stockMonth === "June"
                                                    ? "जून"
                                                    : stockMonth === "July"
                                                      ? "जुलै"
                                                      : stockMonth === "August"
                                                        ? "ऑगस्ट"
                                                        : stockMonth ===
                                                          "September"
                                                          ? "सप्टेंबर"
                                                          : stockMonth ===
                                                            "October"
                                                            ? "ऑक्टोबर"
                                                            : stockMonth ===
                                                              "November"
                                                              ? "नोव्हेंबर"
                                                              : "डिसेंबर",
                                        stockMonth,
                                        stockMonth === "January"
                                          ? "जनवरी"
                                          : stockMonth === "February"
                                            ? "फरवरी"
                                            : stockMonth === "March"
                                              ? "मार्च"
                                              : stockMonth === "April"
                                                ? "अप्रैल"
                                                : stockMonth === "May"
                                                  ? "मई"
                                                  : stockMonth === "June"
                                                    ? "जून"
                                                    : stockMonth === "July"
                                                      ? "जुलाई"
                                                      : stockMonth === "August"
                                                        ? "अगस्त"
                                                        : stockMonth ===
                                                          "September"
                                                          ? "सितंबर"
                                                          : stockMonth ===
                                                            "October"
                                                            ? "अक्टूबर"
                                                            : stockMonth ===
                                                              "November"
                                                              ? "नवंबर"
                                                              : "दिसंबर",
                                      )}{" "}
                                      {stockYear}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Table */}
                              <table className="w-full border-collapse text-black text-xs text-center table-fixed">
                                <thead>
                                  <tr className="bg-slate-100 font-bold">
                                    <th className="border-b border-r border-black p-1 w-[5%]">
                                      {t("अ.क्र.", "Sr. No.", "क्र.")}
                                    </th>
                                    <th className="border-b border-r border-black p-1 w-[12%]">
                                      {t("साहित्य", "Items", "सामग्री")}
                                    </th>
                                    {stockRecords.slice(0, 17).map((item) => (
                                      <th
                                        key={item.item}
                                        className="border-b border-r border-black p-0.5 text-xs truncate"
                                      >
                                        {getTranslatedItem(item.item)}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    {
                                      label: t(
                                        "मागील शिल्लक साठा (१)",
                                        "Opening Balance (Previous Month Balance)",
                                        "पिछला शेष स्टॉक (१)",
                                      ),
                                      field: "prev",
                                    },
                                    {
                                      label: t(
                                        "चालू महिन्यात प्राप्त झालेला साठा (२)",
                                        "Received In Current Month",
                                        "चालू माह में प्राप्त स्टॉक (२)",
                                      ),
                                      field: "received",
                                    },
                                    {
                                      label: t(
                                        "एकूण साठा (३) (१ + २)",
                                        "Total Stock (1 + 2)",
                                        "कुल स्टॉक (३) (१ + २)",
                                      ),
                                      isSum: true,
                                    },
                                    {
                                      label: t(
                                        "भोजन शिजवलेले दिवस (४)",
                                        "Cooked Food Days",
                                        "भोजन पकाने के दिन (४)",
                                      ),
                                      field: "cookedDays",
                                    },
                                    {
                                      label: t(
                                        "चालू महिन्यातील एकूण लाभार्थी (५)",
                                        "Beneficiary - current Month",
                                        "चालू माह के कुल लाभार्थी (५)",
                                      ),
                                      field: "beneficiary",
                                    },
                                    {
                                      label: t(
                                        "प्रत्यक्षात भोजनासाठी वापरलेले धान्य (६)",
                                        "Cooked rice and grains",
                                        "भोजन पकाने में प्रयुक्त सामग्री (६)",
                                      ),
                                      field: "used",
                                    },
                                    {
                                      label: t(
                                        "महिन्याच्या शेवटी शिल्लक राहिलेला साठा (७) (३ - ६)",
                                        "Month End Balance (3 - 6)",
                                        "माह के अंत में शेष स्टॉक (७) (३ - ६)",
                                      ),
                                      isRemaining: true,
                                    },
                                  ].map((rowDef, rIdx) => (
                                    <tr key={rIdx} className="h-6">
                                      <td className="border-b border-r border-black p-0.5 font-bold">
                                        {rIdx + 1}
                                      </td>
                                      <td className="border-b border-r border-black p-1 text-left font-medium leading-tight">
                                        {rowDef.label}
                                      </td>
                                      {stockRecords.slice(0, 17).map((item) => {
                                        let val = 0;
                                        if (rowDef.isSum) {
                                          val =
                                            Number(item.prev) +
                                            Number(item.received);
                                        } else if (rowDef.isRemaining) {
                                          val =
                                            Number(item.prev) +
                                            Number(item.received) -
                                            Number(item.used);
                                        } else {
                                          val = rowDef.field
                                            ? (item[
                                              rowDef.field as keyof typeof item
                                            ] as number) || 0
                                            : 0;
                                        }
                                        return (
                                          <td
                                            key={item.item}
                                            className="border-b border-r border-black p-0.5 font-bold"
                                          >
                                            {val}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Additional details row */}
                            <div className="flex flex-col lg:flex-row border-t border-black p-4 justify-between items-stretch gap-6 print:border-t-2">
                              {/* Left table for details of vegetables, milk, sugar, soybean, ragi satva */}
                              <div className="w-[300px] border border-black rounded p-2 bg-white">
                                <table className="w-full text-xs text-center border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50 font-bold border-b border-black">
                                      <th className="p-1 border-r border-black w-[50%]">
                                        {t("तपशील", "Details", "विवरण")}
                                      </th>
                                      <th className="p-1 w-[50%]">
                                        {t(
                                          "एकूण वापर (कि.ग्रॅ./लीटर)",
                                          "Consumption kg/litre",
                                          "कुल खपत",
                                        )}
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {[
                                      {
                                        label: t(
                                          "भाजीपाला",
                                          "vegetables",
                                          "सब्जियाँ",
                                        ),
                                        itemKey: "Vegetables",
                                        suffix: t(
                                          "कि.ग्रॅ.",
                                          "k.g.",
                                          "कि.ग्रा.",
                                        ),
                                      },
                                      {
                                        label: t(
                                          "दूध / दूध पावडर",
                                          "milk / milk powder",
                                          "दूध पाउडर",
                                        ),
                                        itemKey: "Milk-Milk Powder",
                                        suffix: t("लीटर", "liter", "लीटर"),
                                      },
                                      {
                                        label: t(
                                          "साखर / गूळ",
                                          "sugar / jaggery",
                                          "चीनी/गुड़",
                                        ),
                                        itemKey: "Sugar-Jaggery",
                                        suffix: t(
                                          "कि.ग्रॅ.",
                                          "k.g.",
                                          "कि.ग्रा.",
                                        ),
                                      },
                                      {
                                        label: t(
                                          "सोयाबीन वडी",
                                          "Soybean wadi",
                                          "सोयाबीन वड़ी",
                                        ),
                                        itemKey: "Soyabean Wadi",
                                        suffix: t(
                                          "कि.ग्रॅ.",
                                          "k.g.",
                                          "कि.ग्रा.",
                                        ),
                                      },
                                      {
                                        label: t(
                                          "नाचणी सत्व",
                                          "ragi satva",
                                          "रागी सत्व",
                                        ),
                                        itemKey: "Ragi Satva",
                                        suffix: t(
                                          "कि.ग्रॅ.",
                                          "k.g.",
                                          "कि.ग्रा.",
                                        ),
                                      },
                                    ].map((rowDef, rIdx) => {
                                      const s = stockRecords.find(
                                        (n) => n.item === rowDef.itemKey,
                                      );
                                      const usedVal = s ? s.used : 0;
                                      return (
                                        <tr
                                          key={rIdx}
                                          className="border-b border-black last:border-b-0 h-5 text-black"
                                        >
                                          <td className="p-0.5 border-r border-black text-left pl-2 font-medium">
                                            {rowDef.label}
                                          </td>
                                          <td className="p-0.5 font-bold">
                                            {usedVal} {rowDef.suffix}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>

                              {/* Center counts */}
                              <div className="flex flex-col justify-start gap-4 text-[9.5px] font-bold text-black min-w-[220px]">
                                <div className="border border-black p-2 rounded bg-white">
                                  {t(
                                    "एकूण स्वयंपाकी व मदतनीस - ",
                                    "No. of cooks and helpers - ",
                                    "कुल रसोइया और सहायक - ",
                                  )}{" "}
                                  {helpers.length}
                                </div>
                                <div className="border border-black p-2 rounded bg-white">
                                  {t(
                                    "एकूण लाभार्थी संख्या - ",
                                    "Beneficiary Count - ",
                                    "कुल लाभार्थी संख्या - ",
                                  )}{" "}
                                  {stockRecords.reduce(
                                    (acc, item) => acc + item.beneficiary,
                                    0,
                                  )}
                                </div>
                              </div>

                              {/* Right Principal signature & stamp */}
                              <div className="flex-1 flex flex-col justify-between text-right text-[9.5px] text-black pr-4 min-h-[100px]">
                                <div className="space-y-1 font-bold text-left pl-6 leading-relaxed">
                                  <p>
                                    {t(
                                      "मासिक ब पत्रकातील माहिती तपासली असून शाळा स्तरावरील साठा नोंदवही जुळते व अचूक आहे.",
                                      "The monthly B sheet of this has been checked and the stock register is correct and accurate.",
                                      "मासिक बी पत्रक की जानकारी जांची गई है और स्कूल स्तर के स्टॉक रजिस्टर से मेल खाती है और सटीक है।",
                                    )}
                                  </p>
                                  <p className="text-slate-500 font-normal">
                                    {t(
                                      "मासिक ब पत्रक महिन्याच्या १ तारखेपर्यंत केंद्रप्रमुखांना सादर करण्यात यावे.",
                                      "The monthly B sheet should be submitted to the Head of the Centre by the 1st of the month.",
                                      "मासिक बी पत्रक महीने की १ तारीख तक केंद्र प्रमुख को प्रस्तुत किया जाना चाहिए।",
                                    )}
                                  </p>
                                </div>
                                <div className="font-bold mt-8">
                                  {t(
                                    "मुख्याध्यापकाची सही व शिक्का",
                                    "Principal Signature and Stamp",
                                    "प्रधानाध्यापक के हस्ताक्षर और मुहर",
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <style>{`
                            @media print {
                              body * {
                                visibility: hidden;
                              }
                              #stock-report-print, #stock-report-print * {
                                visibility: visible;
                              }
                              #stock-report-print {
                                position: absolute;
                                left: 0;
                                top: 0;
                                width: 100%;
                                margin: 0;
                                padding: 0;
                              }
                            }
                          `}</style>

                          <div className="flex justify-end gap-3 mt-4 print:hidden">
                            <button
                              onClick={() => window.print()}
                              className="px-5 py-1.5 bg-[#007bff] hover:bg-blue-700 text-white rounded text-[13px] font-semibold shadow-md transition-colors"
                            >
                              {t("प्रिंट", "Print", "प्रिंट")}
                            </button>
                            <button
                              onClick={() => setShowStockReportModal(false)}
                              className="px-5 py-1.5 bg-[#f44336] hover:bg-red-700 text-white rounded text-[13px] font-semibold shadow-md transition-colors"
                            >
                              {t("बंद करा", "Close", "बंद करें")}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 6. DEMAND TAB - Learnify reports-demand.php Stock Demand Report */}
                {activeTab === "demand" && (
                  <div className="space-y-5 font-sans">
                    {/* Top Header Bar with Help */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                          Stock Demand Report
                        </h2>
                      </div>
                      <button
                        onClick={() => {
                          toast.info("Open Months मधून मागणीचा महिना निवडा आणि पटसंख्या प्रविष्ट करून Download PDF वर क्लिक करा.");
                        }}
                        className="px-3.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Info className="w-4 h-4 text-emerald-600" />
                        <span>Help</span>
                      </button>
                    </div>

                    {/* Single Control & Filter Card matching Screenshot 1 */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 block">
                            महिने (सन 2026-27)
                          </label>
                          <select
                            value={stockDemandMonth}
                            onChange={(e) => setStockDemandMonth(e.target.value)}
                            className="h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none min-w-[140px]"
                          >
                            {["जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून", "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"].map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 block">
                            पटसंख्या
                          </label>
                          <input
                            type="number"
                            value={stockDemandPatSankhya}
                            onChange={(e) => setStockDemandPatSankhya(e.target.value)}
                            className="h-10 w-24 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none text-center"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-5">
                          <button
                            onClick={() => {
                              toast.success("अहवाल अद्ययावत केला!");
                            }}
                            className="h-10 px-5 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-extrabold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
                          >
                            View report
                          </button>

                          <button
                            onClick={handleStockDemandPdfDownload}
                            className="h-10 px-5 bg-[#374151] hover:bg-[#1F2937] text-white font-extrabold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
                          >
                            Download PDF
                          </button>
                        </div>
                      </div>

                      {/* Informational Text Banner matching Screenshot 1 */}
                      <p className="text-xs font-medium text-slate-500 leading-relaxed pt-2 border-t border-slate-100">
                        <strong className="font-bold text-slate-800">Open Months</strong> ड्रॉपडाऊन मधून महिने निवडा. चालू महिना आणि त्यामागचे महिने निवडता येणार नाहीत. पटसंख्या enter केल्यानंतर पहिल्या निवडलेल्या महिन्याच्या 1 तारखेपासून कॅल्क्युलेशन होईल. <strong className="font-bold text-slate-800">अंतिम मागणी = महिन्याची आवश्यकता - अपेक्षित शिल्लक</strong> आवश्यकता आणि अपेक्षित शिल्लक वापरून कॅल्क्युलेशन होईल. <strong className="font-bold text-slate-800">Download PDF वर क्लिक करून प्रिंट डायलॉग मध्ये Save as PDF निवडा.</strong>
                      </p>
                    </div>

                    {/* Printable Official Government Stock Demand Report Document */}
                    <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-300 shadow-md space-y-4 print:p-0 print:border-none print:shadow-none font-sans text-slate-900">
                      <div id="stock-demand-report-print" className="bg-white p-3 space-y-3 border border-slate-300 rounded-xl">
                        {/* 1. Header Section */}
                        <div className="relative text-center space-y-1 pb-1 pt-1">
                          <div className="absolute left-2 top-0 hidden md:flex items-center justify-center w-14 h-14">
                            <div className="w-12 h-12 rounded-full border border-amber-300 bg-amber-50 p-1 flex items-center justify-center shadow-2xs">
                              <Utensils className="w-6 h-6 text-amber-600" />
                            </div>
                          </div>
                          <p className="text-xs font-bold text-[#008955] tracking-wide">
                            प्रधानमंत्री पोषण शक्ती निर्माण योजना — साहित्य मागणी अहवाल
                          </p>
                          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                            धान्यादी मालाची मागणी
                          </h1>
                          <h2 className="text-sm md:text-base font-black text-slate-900 uppercase">
                            {profile?.schoolName || "Z P SCHOOL DHONDEWADI PED"}
                          </h2>
                          <p className="text-xs font-bold text-slate-700">
                            तांदूळ व धान्यादी मालाची — {stockDemandMonth} 2026 — मागणी किलोग्रॅम मध्ये • प्राथमिक ( इयत्ता १ ते ५ )
                          </p>
                        </div>

                        {/* 2. 5 Boxed Metadata Headers */}
                        <div className="grid grid-cols-5 border border-slate-300 text-center text-xs font-bold divide-x divide-slate-300 bg-slate-50/80 rounded-md overflow-hidden">
                          <div className="p-2">
                            <span className="text-[11px] text-slate-500 font-semibold block uppercase">UDISE कोड</span>
                            <span className="text-slate-900 font-extrabold text-xs">{getUdise() || "27350800701"}</span>
                          </div>
                          <div className="p-2">
                            <span className="text-[11px] text-slate-500 font-semibold block uppercase">केंद्र</span>
                            <span className="text-slate-900 font-extrabold text-xs">{profile?.center || "NARSINGPUR"}</span>
                          </div>
                          <div className="p-2">
                            <span className="text-[11px] text-slate-500 font-semibold block uppercase">तालुका</span>
                            <span className="text-slate-900 font-extrabold text-xs">{profile?.taluka || "वाळवा"}</span>
                          </div>
                          <div className="p-2">
                            <span className="text-[11px] text-slate-500 font-semibold block uppercase">जिल्हा</span>
                            <span className="text-slate-900 font-extrabold text-xs">{profile?.district || "सांगली"}</span>
                          </div>
                          <div className="p-2">
                            <span className="text-[11px] text-slate-500 font-semibold block uppercase">पिन कोड</span>
                            <span className="text-slate-900 font-extrabold text-xs">{profile?.pincode || "416312"}</span>
                          </div>
                        </div>

                        {/* 3. Sub-summary Info Bar */}
                        {(() => {
                          const pat = parseFloat(stockDemandPatSankhya) || (stockDemandCategory === "6 To 8" ? (Number(profile?.patUpper) || 0) : (Number(profile?.patPrimary) || 0));
                          const wDays = parseFloat(stockDemandWorkingDays) || 21;
                          const todayStr = "06-08-2026";
                          const monthStartStr = "01-09-2026";
                          const monthAbbr: Record<string, string> = {
                            "जानेवारी": "जाने", "फेब्रुवारी": "फेब्रु", "मार्च": "मार्च", "एप्रिल": "एप्रि",
                            "मे": "मे", "जून": "जून", "जुलै": "जुलै", "ऑगस्ट": "ऑगस्ट", "सप्टेंबर": "सप्टें",
                            "ऑक्टोबर": "ऑक्टो", "नोव्हेंबर": "नोव्हें", "डिसेंबर": "डिसें"
                          };
                          const demandPeriodStr = `${monthAbbr[stockDemandMonth] || stockDemandMonth} 2026`;

                          return (
                            <div className="text-xs font-bold text-slate-800 py-1.5 px-3 bg-slate-50 border border-slate-300 rounded flex flex-wrap justify-between items-center gap-2">
                              <span>पटसंख्या: <strong className="font-extrabold text-slate-900">{pat}</strong></span>
                              <span>मागणी कालावधी: <strong className="font-extrabold text-slate-900">{demandPeriodStr}</strong></span>
                              <span>आज: <strong className="font-extrabold text-slate-900">{todayStr}</strong></span>
                              <span>मागणी महिना सुरू: <strong className="font-extrabold text-slate-900">{monthStartStr}</strong></span>
                              <span>उरलेले कार्यदिवस: <strong className="font-extrabold text-slate-900">{wDays}</strong></span>
                            </div>
                          );
                        })()}

                        {/* 4. 6-Column Main Demand Table */}
                        <div className="w-full overflow-x-auto">
                          <table className="w-full border-collapse border border-slate-400 text-center text-xs">
                            <thead>
                              <tr className="bg-slate-100/90 text-slate-900 font-extrabold border-b border-slate-400">
                                <th className="border-r border-slate-400 p-2 text-left w-[24%] font-bold">साहित्य</th>
                                <th className="border-r border-slate-400 p-2 text-right w-[15%] font-bold">सध्याचा साठा</th>
                                <th className="border-r border-slate-400 p-2 text-right w-[15%] font-bold">
                                  अपेक्षित खर्च<br />
                                  <span className="text-[10px] font-normal text-slate-600">(महिना अखेरपर्यंत)</span>
                                </th>
                                <th className="border-r border-slate-400 p-2 text-right w-[15%] font-bold">
                                  अपेक्षित शिल्लक<br />
                                  <span className="text-[10px] font-normal text-slate-600">(महिना अखेर)</span>
                                </th>
                                <th className="border-r border-slate-400 p-2 text-right w-[15%] font-bold">महिनाची आवश्यकता</th>
                                <th className="border-r border-slate-400 p-2 text-right w-[16%] font-extrabold text-slate-900">अंतिम मागणी</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const pat = parseFloat(stockDemandPatSankhya) || (stockDemandCategory === "6 To 8" ? (Number(profile?.patUpper) || 0) : (Number(profile?.patPrimary) || 0));
                                const wDays = parseFloat(stockDemandWorkingDays) || 21;
                                const isUpper = stockDemandCategory === "6 To 8";

                                const itemsDef = [
                                  { key: "Rice", name: "तांदूळ (kg)", qtyP: 0.100, qtyU: 0.150 },
                                  { key: "Mugdal", name: "मूगडाळ (kg)", qtyP: 0.020, qtyU: 0.030 },
                                  { key: "Turdal", name: "तूरडाळ (kg)", qtyP: 0.020, qtyU: 0.030 },
                                  { key: "Masurdal", name: "मसूरडाळ (kg)", qtyP: 0.020, qtyU: 0.030 },
                                  { key: "Matki", name: "मटकी (kg)", qtyP: 0.020, qtyU: 0.030 },
                                  { key: "Moong", name: "अख्खा मूग (kg)", qtyP: 0.020, qtyU: 0.030 },
                                  { key: "Cowpea", name: "चवळी (kg)", qtyP: 0.020, qtyU: 0.030 },
                                  { key: "Gram", name: "हरभरा (kg)", qtyP: 0.020, qtyU: 0.030 },
                                  { key: "Pease", name: "वाटाणा (kg)", qtyP: 0.020, qtyU: 0.030 },
                                  { key: "Soyabean Wadi", name: "सोयाबीन वडी (kg)", qtyP: 0.020, qtyU: 0.030 },
                                  { key: "Cumin", name: "जिरे (kg)", qtyP: 0.0004, qtyU: 0.0006 },
                                  { key: "Mustard", name: "मोहरी (kg)", qtyP: 0.0004, qtyU: 0.0006 },
                                  { key: "Turmeric", name: "हळद (kg)", qtyP: 0.0004, qtyU: 0.0006 },
                                  { key: "Onion Garlic Masala", name: "तिखट मसाला/कांदा लसूण मसाला (kg)", qtyP: 0.0008, qtyU: 0.0012 },
                                  { key: "Salt", name: "मीठ (kg)", qtyP: 0.004, qtyU: 0.006 },
                                  { key: "Chili", name: "मिरची पावडर (kg)", qtyP: 0.0004, qtyU: 0.0006 },
                                  { key: "Garam Masala", name: "गरम मसाला (kg)", qtyP: 0.0004, qtyU: 0.0006 },
                                  { key: "Oil", name: "तेल (kg)", qtyP: 0.005, qtyU: 0.0075 },
                                  { key: "Milk-Milk Powder", name: "दूध / दूध पावडर (liter)", qtyP: 0.000, qtyU: 0.000 },
                                  { key: "Sugar-Jaggery", name: "साखर / गूळ (kg)", qtyP: 0.000, qtyU: 0.000 },
                                  { key: "Ragi Satva", name: "नाचणी सत्व (kg)", qtyP: 0.000, qtyU: 0.000 },
                                  { key: "Vegetables", name: "भाजीपाला (kg)", qtyP: 0.050, qtyU: 0.050 },
                                ];

                                const marToEngMonth: Record<string, string> = {
                                  "ऑगस्ट": "August", "सप्टेंबर": "September", "ऑक्टोबर": "October", "नोव्हेंबर": "November",
                                  "डिसेंबर": "December", "जानेवारी": "January", "फेब्रुवारी": "February", "मार्च": "March",
                                  "एप्रिल": "April", "मे": "May", "जून": "June", "जुलै": "July"
                                };
                                const selMonthEng = marToEngMonth[stockDemandMonth] || "September";

                                return itemsDef.map((it, idx) => {
                                  const stock = getOpeningStock(selMonthEng, "2026", stockDemandCategory, it.key);
                                  const rule = quantityRules.find(r => r.item.toLowerCase() === it.key.toLowerCase());
                                  const defaultQty = isUpper ? it.qtyU : it.qtyP;
                                  const qVal = rule ? (isUpper ? (parseFloat(rule.qty68) || defaultQty) : (parseFloat(rule.qty15) || defaultQty)) : defaultQty;
                                  const unitQty = qVal >= 1 ? qVal / 1000 : qVal;

                                  const expUsed = unitQty * pat * 3;
                                  const reqMonth = unitQty * pat * wDays;
                                  const expBal = stock - expUsed;
                                  const finalDemand = expBal < 0 ? (reqMonth + Math.abs(expBal)) : Math.max(0, reqMonth - expBal);

                                  return (
                                    <tr key={idx} className="border-b border-slate-300 h-8 text-right font-medium hover:bg-slate-50">
                                      <td className="border-r border-slate-400 px-2 py-1 text-xs text-left font-bold text-slate-900">{it.name}</td>
                                      <td className="border-r border-slate-400 px-2 py-1 text-xs text-slate-800">{stock.toFixed(4)}</td>
                                      <td className="border-r border-slate-400 px-2 py-1 text-xs text-slate-800">{expUsed.toFixed(4)}</td>
                                      <td className={`border-r border-slate-400 px-2 py-1 text-xs font-semibold ${expBal < 0 ? "text-rose-600" : "text-slate-800"}`}>
                                        {expBal.toFixed(4)}
                                      </td>
                                      <td className="border-r border-slate-400 px-2 py-1 text-xs text-slate-800">{reqMonth.toFixed(4)}</td>
                                      <td className="border-r border-slate-400 px-2 py-1 text-xs font-black text-slate-900">{finalDemand.toFixed(4)}</td>
                                    </tr>
                                  );
                                });
                              })()}
                            </tbody>
                          </table>
                        </div>

                        {/* 5. Bottom Caution Note & Signature Block */}
                        <div className="pt-2 space-y-3">
                          <p className="text-xs font-bold text-slate-800 bg-amber-50/80 p-2 border border-slate-300 rounded leading-relaxed">
                            मागणी नोंदवताना शाळेकडे तीन दिवसाचा साठा शिल्लक राहील याची दक्षता घेऊन खाली नोंदवलेली माहिती दैनंदिन नोंदवहीवरून घेतलेली आहे, ती तपासली असून अचूक आहे.
                          </p>

                          <div className="flex items-end justify-between pt-4 pb-2 px-2 text-xs font-bold text-slate-900">
                            <div>Date</div>
                            <div className="text-center space-y-1">
                              <p className="font-extrabold">मुख्याध्यापक / सचिव</p>
                              <p className="font-semibold text-slate-700">शाळा व्यवस्थापन समिती</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Demand Report Modal */}
                    {showDemandReportModal && (
                      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm font-sans p-4">
                        <div className="bg-white p-6 rounded-md shadow-2xl border border-slate-200 w-full max-w-[650px] max-h-[95vh] flex flex-col relative print:shadow-none print:border-none print:w-full print:max-w-full print:p-0 print:h-auto font-sans text-slate-900 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.25)]">
                          {/* Printable Area */}
                          <div
                            className="border border-black flex-1 overflow-visible bg-white p-6 print:border-none print:p-0"
                            id="demand-report-print"
                          >
                            {/* Header */}
                            <div className="text-center text-black pb-4 border-b border-dashed border-slate-400">
                              <h3 className="font-bold text-lg tracking-wider">
                                {profile?.schoolName || ""}
                              </h3>
                              <p className="text-xs mt-1">
                                {t("तालुका:", "Taluka:")}{" "}
                                {profile?.taluka || ""},{" "}
                                {t("जिल्हा:", "District:")}{" "}
                                {profile?.district || ""}
                              </p>
                              <p className="text-xs">
                                {t("मोबाईल नंबर:", "Mobile Number:")}{" "}
                                {profile?.phone || "8010926852"} ,{" "}
                                {t("ईमेल:", "Email:")} {profile?.email || ""}
                              </p>

                              <div className="flex justify-center my-2">
                                <div className="bg-black text-white px-5 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wide print:border print:border-black print:text-black print:bg-white">
                                  {t(
                                    "शालेय पोषण आहार (ब) मागणी पत्रक",
                                    "School Nutrition (B) Demand Sheet",
                                    "विद्यालय पोषण आहार (ब) मांग पत्रक",
                                  )}
                                </div>
                              </div>
                              <p className="text-xs font-medium mt-1">
                                {t(
                                  "(तांदूळ व इतर धान्य साहित्य)",
                                  "(Rice and other grains)",
                                  "(चावल और अन्य अनाज)",
                                )}
                              </p>
                              <p className="text-xs font-bold mt-1.5 text-slate-700">
                                {(() => {
                                  const formatDemandDate = (
                                    dateStr: string,
                                  ) => {
                                    if (!dateStr) return "—";
                                    const d = new Date(dateStr);
                                    if (isNaN(d.getTime())) return dateStr;
                                    const day = d.getDate();
                                    const monthsEn = [
                                      "Jan",
                                      "Feb",
                                      "Mar",
                                      "Apr",
                                      "May",
                                      "Jun",
                                      "Jul",
                                      "Aug",
                                      "Sep",
                                      "Oct",
                                      "Nov",
                                      "Dec",
                                    ];
                                    const monthsMr = [
                                      "जाने",
                                      "फेब्रु",
                                      "मार्च",
                                      "एप्रि",
                                      "मे",
                                      "जून",
                                      "जुलै",
                                      "ऑग",
                                      "सप्टें",
                                      "ऑक्टो",
                                      "नोव्हें",
                                      "डिसें",
                                    ];
                                    const monthsHi = [
                                      "जन",
                                      "फर",
                                      "मार्च",
                                      "अप्रै",
                                      "मई",
                                      "जून",
                                      "जुला",
                                      "अग",
                                      "सित",
                                      "अक्टू",
                                      "नवं",
                                      "दिस",
                                    ];
                                    const mIdx = d.getMonth();
                                    const month = t(
                                      monthsMr[mIdx],
                                      monthsEn[mIdx],
                                      monthsHi[mIdx],
                                    );
                                    const year = d.getFullYear();
                                    return `${day}-${month}-${year}`;
                                  };
                                  return `${formatDemandDate(demandFromDate)} ${t("ते", "To", "से")} ${formatDemandDate(demandToDate)}`;
                                })()}
                              </p>
                            </div>

                            {/* Table */}
                            <table className="w-full border-collapse border-black text-black text-xs text-center mt-4">
                              <thead>
                                <tr className="bg-slate-50 font-bold border-b border-black">
                                  <th className="border-r border-black p-1 w-[15%]">
                                    {t("अ.क्र.", "Sr.No", "क्र.")}
                                  </th>
                                  <th className="border-r border-black p-1 w-[50%]">
                                    {t(
                                      "धान्य साहित्य यादी",
                                      "List Of Grains",
                                      "अनाज सामग्री सूची",
                                    )}
                                  </th>
                                  <th className="p-2 w-[35%]">
                                    {t(
                                      "प्रमाण (किलोग्राम मध्ये)",
                                      "Quantity (in Kilo gram)",
                                      "मात्रा (किलोग्राम में)",
                                    )}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  const filtered = demandRecords.filter(
                                    (rec) => {
                                      return (
                                        rec.date >= demandFromDate &&
                                        rec.date <= demandToDate
                                      );
                                    },
                                  );

                                  const rows = filtered.map((row, idx) => (
                                    <tr
                                      key={row.id}
                                      className="border-b border-black last:border-b-0 h-8"
                                    >
                                      <td className="border-r border-black p-2">
                                        {idx + 1}
                                      </td>
                                      <td className="border-r border-black p-2">
                                        {getTranslatedItem(row.content)}
                                      </td>
                                      <td className="p-2">{row.quantity}</td>
                                    </tr>
                                  ));

                                  // Add a blank row if empty or to match screen styling
                                  if (rows.length === 0) {
                                    return (
                                      <tr className="border-b border-black last:border-b-0 h-8 text-slate-500">
                                        <td
                                          colSpan={3}
                                          className="p-4 text-center"
                                        >
                                          {t(
                                            "निवडलेल्या तारीख श्रेणीसाठी कोणतेही धान्य मागवले नाही",
                                            "No grains demanded for selected date range",
                                            "चयनित तिथि सीमा के लिए कोई अनाज नहीं मांगा गया",
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  }
                                  return rows;
                                })()}
                              </tbody>
                            </table>
                          </div>

                          <style>{`
                              @media print {
                                body * {
                                  visibility: hidden;
                                }
                                #demand-report-print, #demand-report-print * {
                                  visibility: visible;
                                }
                                #demand-report-print {
                                  position: absolute;
                                  left: 0;
                                  top: 0;
                                  width: 100%;
                                  margin: 0;
                                  padding: 0;
                                }
                              }
                            `}</style>

                          {/* Actions */}
                          <div className="flex justify-end gap-3 mt-4 print:hidden">
                            <button
                              onClick={handleDemandReportPdfDownload}
                              disabled={isExporting}
                              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                            >
                              <FileText className="w-4 h-4" />
                              <span>{isExporting ? t("डाउनलोड होत आहे...", "Downloading...", "डाउनलोड हो रहा है...") : t("डाउनलोड पीडीएफ (PDF)", "Download PDF", "डाउनलोड पीडीएफ")}</span>
                            </button>
                            <button
                              onClick={() => setShowDemandReportModal(false)}
                              className="px-5 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
                            >
                              {t("बंद करा", "Close", "बंद करें")}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                {/* Monthly Report Tab */}
                {activeTab === "monthly-summary-report" && (
                  <div className="space-y-6">
                    {/* Top Header matching Screenshot 2 */}
                    <div className="flex items-center justify-between">
                      <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Monthly MDM Report</h1>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all border border-slate-300">
                        <Info className="w-3.5 h-3.5 text-slate-500" />
                        <span>Help</span>
                      </button>
                    </div>

                    {/* Top Control Card matching Screenshot 2 */}
                    <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                            मासिक अहवाल प्रकार निवडा
                          </label>
                          <select
                            value={monthlyMdmReportType}
                            onChange={(e) => setMonthlyMdmReportType(e.target.value)}
                            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                          >
                            <option value="daily_tandul_register">दैनंदिन तांदूळ खर्च नोंदवही (भाग १)</option>
                            <option value="poshan_ahar_daily_entry">पोषण आहार दैनंदिन नोंदी</option>
                            <option value="masik_tandul_report">मासिक तांदूळ अहवाल</option>
                            <option value="masik_goshwara">मासिक साठा नोंदवही (प्रपत्र ब)</option>
                            <option value="masik_tandul_bill">मासिक तांदूळ शिजवून दिल्याचे बिल</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                            महिना
                          </label>
                          <select
                            value={monthlyMdmReportMonth}
                            onChange={(e) => setMonthlyMdmReportMonth(e.target.value)}
                            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                          >
                            <option value="जून सन 2026/27">जून</option>
                            <option value="जुलै सन 2026/27">जुलै</option>
                            <option value="ऑगस्ट सन 2026/27">ऑगस्ट</option>
                            <option value="सप्टेंबर सन 2026/27">सप्टेंबर</option>
                            <option value="ऑक्टोबर सन 2026/27">ऑक्टोबर</option>
                            <option value="नोव्हेंबर सन 2026/27">नोव्हेंबर</option>
                            <option value="डिसेंबर सन 2026/27">डिसेंबर</option>
                            <option value="जानेवारी सन 2026/27">जानेवारी</option>
                            <option value="फेब्रुवारी सन 2026/27">फेब्रुवारी</option>
                            <option value="मार्च सन 2026/27">मार्च</option>
                            <option value="एप्रिल सन 2026/27">एप्रिल</option>
                            <option value="मे सन 2026/27">मे</option>
                          </select>
                        </div>

                        <button
                          onClick={() => {
                            toast.success("अहवाल अद्ययावत केला!");
                          }}
                          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
                        >
                          View report
                        </button>

                        <button
                          onClick={handleMonthlyMdmPdfDownload}
                          className="px-5 py-2 bg-slate-700 hover:bg-slate-800 text-white font-extrabold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
                        >
                          Download PDF
                        </button>
                      </div>

                    </div>

                    {/* Official Monthly MDM Report Container matching Screenshot 2 */}
                    <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-300 shadow-sm space-y-3 print:p-0 print:border-none print:shadow-none">
                      <div id="monthly-mdm-report-print" className="space-y-0 bg-white p-2 text-slate-900 font-sans">
                        {/* === DAILY TANDUL EXPENSE REGISTER (BHAG 1) — EXACT PDF 5.pdf & SCREENSHOT FORMAT === */}
                        {monthlyMdmReportType === "daily_tandul_register" && (() => {
                          const monthName = monthlyMdmReportMonth.split(' ')[0];
                          const monthMap: { [k: string]: number } = {
                            "जानेवारी": 1, "फेब्रुवारी": 2, "मार्च": 3, "एप्रिल": 4,
                            "मे": 5, "जून": 6, "जुलै": 7, "ऑगस्ट": 8,
                            "सप्टेंबर": 9, "ऑक्टोबर": 10, "नोव्हेंबर": 11, "डिसेंबर": 12
                          };
                          const engMonthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                          const monthNum = monthMap[monthName] || 8;
                          const year = monthNum >= 6 ? 2026 : 2027;
                          const daysInMonth = new Date(year, monthNum, 0).getDate();
                          const marDays = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
                          const schoolName = profile?.schoolName || localStorage.getItem("teacher_school_name") || "Z P SCHOOL";
                          const kendra = profile?.kendra || profile?.center || "";
                          const beat = profile?.beat || kendra;
                          const taluka = profile?.taluka || "";
                          const district = profile?.district || "";

                          // Opening stock for Rice in KG
                          const prevRiceStock = getOpeningStock(engMonthNames[monthNum], year.toString(), "1 To 5", "Rice");
                          let currentRiceBalance = prevRiceStock;

                          let totalWorkingDays = 0;
                          let totalRiceDistributedDays = 0;
                          let totalBeneficiaries = 0;
                          let totalRiceConsumed = 0;
                          let recordedDaysCount = 0;
                          let riceReceivedDateStr = "";

                          const monthRows = [];

                          for (let day = 1; day <= daysInMonth; day++) {
                            const dateObj = new Date(year, monthNum - 1, day);
                            const dayOfWeek = dateObj.getDay();
                            const weekday = marDays[dayOfWeek];
                            const isSunday = dayOfWeek === 0;
                            const dateISO = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const dateFormatted = `${String(day).padStart(2, '0')}/${String(monthNum).padStart(2, '0')}/${year}`;

                            const daily = getDailyDataForMonthDate(dateISO, "1 To 5");
                            const isHoliday = daily?.isHoliday || isSunday;

                            if (daily && (daily.enrolled > 0 || daily.beneficiary > 0)) {
                              recordedDaysCount++;
                            }

                            const dayIncomingRice = day === 1 ? getIncomingForItem("Rice", engMonthNames[monthNum], year, "1 To 5") : 0;
                            if (dayIncomingRice > 0 && !riceReceivedDateStr) {
                              riceReceivedDateStr = dateFormatted;
                            }

                            const magilShillak = currentRiceBalance;
                            const prapt = dayIncomingRice || 0;
                            const ekunTandul = magilShillak + prapt;

                            let bene = 0;
                            let kharch = 0;

                            if (!isHoliday) {
                              totalWorkingDays++;
                              bene = daily?.beneficiary || 0;
                              if (bene > 0) {
                                totalRiceDistributedDays++;
                                const riceRule = quantityRules.find((r) => r.item.toLowerCase() === "rice");
                                const riceQtyStr = riceRule ? riceRule.qty15 : "0.100";
                                const ricePerStudent = parseFloat(riceQtyStr) || 0.100;
                                const riceRateKg = ricePerStudent;
                                kharch = bene * riceRateKg;
                                totalBeneficiaries += bene;
                                totalRiceConsumed += kharch;
                              }
                            }

                            const shillakTandul = ekunTandul - kharch;
                            currentRiceBalance = shillakTandul;

                            monthRows.push({
                              sr: day,
                              dateFormatted,
                              weekday,
                              isSunday,
                              isHoliday,
                              magilShillak,
                              prapt,
                              ekunTandul,
                              bene,
                              kharch,
                              shillakTandul,
                            });
                          }

                          const patPrimary = profile?.patPrimary || 0;
                          const totalPat = profile?.totalPat || patPrimary;

                          return (
                            <div className="space-y-1.5 font-sans text-slate-900">
                              {/* Title Header */}
                              <div className="text-center space-y-0 mb-0.5">
                                <h1 className="text-sm md:text-base font-black text-[#056e38] tracking-wide">
                                  प्रधानमंत्री पोषण शक्ती निर्माण योजना
                                </h1>
                                <h2 className="text-xs font-extrabold text-[#056e38]">
                                  दैनंदिन तांदूळ खर्च नोंदवही (भाग १)
                                </h2>
                              </div>

                              {/* Info Grid Box */}
                              <div className="border border-slate-700 text-xs font-medium bg-white">
                                <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-700 border-b border-slate-700">
                                  <div className="p-1.5 md:col-span-3">
                                    शाळेचे नाव : <span className="font-bold text-slate-900">{schoolName}</span>
                                  </div>
                                  <div className="p-1.5 md:col-span-3">
                                    इयत्ता गट : <span className="font-bold text-slate-900">प्राथमिक ( इयत्ता १ ते ५ )</span>
                                  </div>
                                  <div className="p-1.5 md:col-span-2">
                                    केंद्र : <span className="font-bold text-slate-900">{kendra}</span>
                                  </div>
                                  <div className="p-1.5 md:col-span-2">
                                    बीट : <span className="font-bold text-slate-900">{beat}</span>
                                  </div>
                                  <div className="p-1.5 md:col-span-2 flex gap-2">
                                    <span>ता. : <strong className="font-bold">{taluka}</strong></span>
                                    <span>जिल्हा : <strong className="font-bold">{district}</strong></span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-700 border-b border-slate-700">
                                  <div className="p-1.5">
                                    महिना : <span className="font-bold text-slate-900">{monthlyMdmReportMonth}</span>
                                  </div>
                                  <div className="p-1.5">
                                    पटसंख्या (१ ते ५) : <span className="font-bold text-slate-900">{patPrimary}</span>
                                  </div>
                                  <div className="p-1.5">
                                    एकूण पटसंख्या : <span className="font-bold text-slate-900">{totalPat}</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-700">
                                  <div className="p-1.5">
                                    एकूण कामाचे दिवस : <span className="font-bold text-slate-900">{totalWorkingDays}</span>
                                  </div>
                                  <div className="p-1.5">
                                    तांदूळ दिलेले दिवस : <span className="font-bold text-slate-900">{totalRiceDistributedDays}</span>
                                  </div>
                                  <div className="p-1.5">
                                    तांदूळ प्राप्त दिनांक : <span className="font-bold text-slate-900">{riceReceivedDateStr}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Sub-header counter text */}
                              <div className="text-xs font-bold text-slate-800">
                                {recordedDaysCount} / {daysInMonth} दिवसांची नोंद या महिन्यासाठी.
                              </div>

                              {/* Daily Rice Consumption Table */}
                              <div className="w-full overflow-x-auto">
                                <table className="w-full border-collapse border border-slate-700 text-center text-xs font-medium" style={{ tableLayout: 'auto' }}>
                                  <thead>
                                    <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-700 text-xs">
                                      <th className="border-r border-slate-700 py-0.5 px-1 min-w-[32px]">अ.नं.</th>
                                      <th className="border-r border-slate-700 py-0.5 px-1 min-w-[85px]">दिनांक</th>
                                      <th className="border-r border-slate-700 py-0.5 px-1 min-w-[65px]">वार</th>
                                      <th className="border-r border-slate-700 py-0.5 px-1 min-w-[100px]">मागील शिल्लक<br/>(KG)</th>
                                      <th className="border-r border-slate-700 py-0.5 px-1 min-w-[80px]">प्राप्त<br/>(KG)</th>
                                      <th className="border-r border-slate-700 py-0.5 px-1 min-w-[105px]">एकूण तांदूळ (4+5)<br/>(KG)</th>
                                      <th className="border-r border-slate-700 py-0.5 px-1 min-w-[65px]">लाभार्थी</th>
                                      <th className="border-r border-slate-700 py-0.5 px-1 min-w-[95px]">खर्च तांदूळ<br/>(KG)</th>
                                      <th className="border-r border-slate-700 py-0.5 px-1 min-w-[105px]">शिल्लक तांदूळ (6-8)<br/>(KG)</th>
                                      <th className="border-r border-slate-700 py-0.5 px-1 min-w-[65px]">सही</th>
                                    </tr>
                                    <tr className="bg-slate-200/80 text-slate-800 font-bold border-b border-slate-700 text-xs">
                                      <th className="border-r border-slate-700 p-0.5">1</th>
                                      <th className="border-r border-slate-700 p-0.5">2</th>
                                      <th className="border-r border-slate-700 p-0.5">3</th>
                                      <th className="border-r border-slate-700 p-0.5">4</th>
                                      <th className="border-r border-slate-700 p-0.5">5</th>
                                      <th className="border-r border-slate-700 p-0.5">6</th>
                                      <th className="border-r border-slate-700 p-0.5">7</th>
                                      <th className="border-r border-slate-700 p-0.5">8</th>
                                      <th className="border-r border-slate-700 p-0.5">9</th>
                                      <th className="border-r border-slate-700 p-0.5">10</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {monthRows.map((r) => {
                                      const isSundayOrHoliday = r.isSunday || r.isHoliday;
                                      return (
                                        <tr
                                          key={r.sr}
                                          className={`border-b border-slate-700 text-xs ${
                                            isSundayOrHoliday
                                              ? "bg-[#fce8e6]"
                                              : r.sr % 2 === 0
                                              ? "bg-slate-50/40"
                                              : "bg-white"
                                          }`}
                                        >
                                          <td className="border-r border-slate-700 py-0.5 px-1 font-bold">{r.sr}</td>
                                          <td className={`border-r border-slate-700 py-0.5 px-1 ${isSundayOrHoliday ? "text-red-700 font-semibold" : ""}`}>
                                            {r.dateFormatted}
                                          </td>
                                          <td className={`border-r border-slate-700 py-0.5 px-1 ${isSundayOrHoliday ? "text-red-700 font-semibold" : ""}`}>
                                            {r.weekday}
                                          </td>
                                          <td className="border-r border-slate-700 py-0.5 px-1">
                                            {r.magilShillak.toFixed(4)}
                                          </td>
                                          <td className="border-r border-slate-700 py-0.5 px-1">
                                            {r.prapt > 0 ? r.prapt.toFixed(4) : ""}
                                          </td>
                                          <td className="border-r border-slate-700 py-0.5 px-1">
                                            {r.ekunTandul.toFixed(4)}
                                          </td>
                                          <td className="border-r border-slate-700 py-0.5 px-1 font-bold">
                                            {r.bene > 0 ? r.bene : ""}
                                          </td>
                                          <td className="border-r border-slate-700 py-0.5 px-1 font-semibold">
                                            {r.kharch > 0 ? r.kharch.toFixed(4) : ""}
                                          </td>
                                          <td className="border-r border-slate-700 py-0.5 px-1 font-bold">
                                            {r.shillakTandul.toFixed(4)}
                                          </td>
                                          <td className="border-r border-slate-700 py-0.5 px-1"></td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>

                              {/* Bottom Signatures */}
                              <div className="flex items-end justify-between pt-2 text-xs font-bold">
                               <div>
                                  <p>Date : {new Date().toLocaleDateString('en-GB')}</p>
                                </div>
                                <div className="text-center">
                                  <p className="font-black">मुख्याध्यापक</p>
                                  <p className="text-xs text-slate-600 mt-0.5">{schoolName}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* === POSHAN AAHAR DAILY ENTRY REPORT — EXACT PDF FORMAT === */}
                        {monthlyMdmReportType === "poshan_ahar_daily_entry" && (() => {
                          const monthName = monthlyMdmReportMonth.split(' ')[0];
                          const monthMap: { [k: string]: number } = {
                            "जानेवारी": 1, "फेब्रुवारी": 2, "मार्च": 3, "एप्रिल": 4,
                            "मे": 5, "जून": 6, "जुलै": 7, "ऑगस्ट": 8,
                            "सप्टेंबर": 9, "ऑक्टोबर": 10, "नोव्हेंबर": 11, "डिसेंबर": 12
                          };
                          const engMonthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                          const monthNum = monthMap[monthName] || 6;
                          const year = monthNum >= 6 ? 2026 : 2027;
                          const monthYearStr = `${monthName} ${year}`;
                          const daysInMonth = new Date(year, monthNum, 0).getDate();
                          const marDays = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
                          const schoolName = profile?.schoolName || "";

                          const colHeaders = [
                            "अ.न.", "दिनांक", "दिवस", "पट\nसंख्या", "हजर\nविद्यार्थी", "ताटांची\nसंख्या",
                            "तांदूळ\nkg", "मूगडाळ\nkg", "तूरडाळ\nkg", "मसूरडाळ\nkg", "मटकी\nkg",
                            "अख्खा\nमूग\nkg", "चवळी\nkg", "हरभरा\nkg", "वाटाणा\nkg", "सोयाबीन\nवडी\nkg",
                            "जिरे\nkg", "मोहरी\nkg", "हळद\nkg", "तिखट\nमसाला/\nकांदा\nलसूण\nमसाला\nkg",
                            "मीठ\nkg", "मिरची\nपावडर\nkg", "गरम\nमसाला\nkg", "तेल\nkg",
                            "गूळ /\nसाखर\nkg", "दूध\nपावडर\nkg", "नाचणी\nसत्त्व\nkg",
                            "भाजीपाला\nkg", "पूरक\nआहार", "इंधन व\nभाजीपाला\nअनुदान"
                          ];

                          const itemKeysOrder = [
                            "Rice", "Mugdal", "Turdal", "Masurdal", "Matki",
                            "Moong", "Cowpea", "Gram", "Pease", "Soyabean Wadi",
                            "Cumin", "Mustard", "Turmeric", "Onion Garlic Masala",
                            "Salt", "Chili", "Garam Masala", "Oil",
                            "Sugar-Jaggery", "Milk-Milk Powder", "Ragi Satva", "Vegetables"
                          ];

                          const prevRiceStock = getOpeningStock(engMonthNames[monthNum], year.toString(), "1 To 5", "Rice");
                          let monthlyTotalRiceUsed = 0;
                          let monthlyTotalTat = 0;
                          let monthlyTotalGrant = 0;

                          const renderPage = (startDay: number, endDay: number, isFirstPage: boolean) => {
                            const days = Array.from({ length: endDay - startDay + 1 }, (_, i) => {
                              const day = startDay + i;
                              const date = new Date(year, monthNum - 1, day);
                              const weekday = marDays[date.getDay()];
                              const isSunday = date.getDay() === 0;
                              const dateISO = `${year}-${String(monthNum).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                              const daily = getDailyDataForMonthDate(dateISO, "1 To 5");
                              return { day, weekday, isSunday, dateISO, daily };
                            });

                            return (
                              <div key={`page-${startDay}`} className={`w-full poshan-pdf-page ${isFirstPage ? "mb-6 print:mb-0" : "html2pdf__page-break print:break-before-page"}`}>
                                {isFirstPage && (
                                  <div className="text-center mb-4 space-y-1">
                                    <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight uppercase">प्रधानमंत्री पोषण शक्ती निर्माण योजना — पोषण आहार दैनंदिन नोंदी</h2>
                                    <h3 className="text-xs md:text-sm font-extrabold text-slate-800">पोषण आहार दैनंदिन नोंदी</h3>
                                    <p className="text-xs font-bold text-slate-700">{schoolName}</p>
                                    <p className="text-xs font-semibold text-slate-600">पोषण आहार दैनंदिन नोंदी — {monthYearStr} · प्राथमिक ( इयत्ता १ ते ५ )</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-5 border border-slate-700 text-xs font-bold mt-2 text-center divide-x divide-slate-700 bg-slate-50 rounded-lg overflow-hidden">
                                      <div className="p-2">UDISE कोड<br/><span className="font-black text-slate-900">{profile?.udise || getUdise() || ""}</span></div>
                                      <div className="p-2">केंद्र<br/><span className="font-black text-slate-900">{profile?.kendra || profile?.center || ""}</span></div>
                                      <div className="p-2">तालुका<br/><span className="font-black text-slate-900">{profile?.taluka || ""}</span></div>
                                      <div className="p-2">जिल्हा<br/><span className="font-black text-slate-900">{profile?.district || ""}</span></div>
                                      <div className="p-2">पिन कोड<br/><span className="font-black text-slate-900">{profile?.pinCode || profile?.pincode || ""}</span></div>
                                    </div>
                                    <div className="mt-1 border border-slate-700 text-xs font-bold text-left p-1 bg-amber-50/50 rounded-lg">
                                      <span className="font-black">मागील शिल्लक :</span> तांदूळ — <span className="font-black text-slate-900">{prevRiceStock.toFixed(4)}</span> kg
                                    </div>
                                  </div>
                                )}

                                <div className="text-xs md:text-sm font-black text-slate-900 mb-0.5 text-left border-b border-slate-500 pb-0.5">
                                  {monthYearStr} — दिनांक {isFirstPage ? "१–१५" : `१६–${daysInMonth}`}
                                </div>

                                <div className="w-full overflow-x-auto">
                                  <table className="min-w-[1400px] w-full border-collapse border border-slate-700 text-center text-xs font-medium">
                                    <thead>
                                      <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-700">
                                        {colHeaders.map((h, idx) => (
                                          <th key={idx} className="border-r border-slate-700 px-1 py-0 leading-tight font-bold whitespace-pre-wrap text-[11px] bg-slate-100" style={{minWidth: idx < 3 ? '65px' : '48px'}}>
                                            {h}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {days.map(({ day, weekday, isSunday, daily }, rowIdx) => {
                                        const bene = daily.beneficiary;
                                        if (bene > 0) {
                                          monthlyTotalTat += bene;
                                          monthlyTotalGrant += bene * (parseFloat(primaryRate) || 5.45);
                                        }

                                        return (
                                          <tr key={day} className={`border-b border-slate-700 h-[20px] text-xs ${isSunday || daily.isHoliday ? "bg-red-50/70" : rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                                            <td className="border-r border-slate-700 px-1 py-0.5 text-xs font-bold">{rowIdx + 1}</td>
                                            <td className="border-r border-slate-700 px-1 py-0.5 text-xs font-semibold">{String(day).padStart(2,'0')}/{String(monthNum).padStart(2,'0')}</td>
                                            <td className={`border-r border-slate-700 px-1 py-0.5 text-xs font-semibold ${isSunday || daily.isHoliday ? "text-red-600 font-bold" : ""}`}>{weekday}</td>
                                            <td className="border-r border-slate-700 px-1 py-0.5 font-semibold">{daily.isHoliday || !daily.enrolled ? "" : daily.enrolled}</td>
                                            <td className="border-r border-slate-700 px-1 py-0.5 font-bold">{daily.isHoliday || bene === 0 ? "" : bene}</td>
                                            <td className="border-r border-slate-700 px-1 py-0.5 font-bold">{daily.isHoliday || bene === 0 ? "" : bene}</td>
                                            {itemKeysOrder.map((itemKey) => {
                                              if (daily.isHoliday || bene === 0) return <td key={itemKey} className="border-r border-slate-700 px-1 py-0.5"></td>;
                                              const wasSelected = daily.selectedItems ? !!daily.selectedItems[itemKey] : true;
                                              if (!wasSelected) return <td key={itemKey} className="border-r border-slate-700 px-1 py-0.5"></td>;
                                              const rule = quantityRules.find(r => r.item.toLowerCase() === itemKey.toLowerCase());
                                              const qStr = rule ? rule.qty15 : "0.02";
                                              const qVal = parseFloat(qStr) || 0;
                                              const qKg = qVal >= 1 ? qVal / 1000 : qVal;
                                              const usedKg = qKg * bene;
                                              if (itemKey === "Rice") monthlyTotalRiceUsed += usedKg;
                                              return (
                                                <td key={itemKey} className="border-r border-slate-700 px-1 py-0.5 text-xs font-medium">
                                                  {usedKg > 0 ? usedKg.toFixed(3) : ""}
                                                </td>
                                              );
                                            })}
                                            <td className="border-r border-slate-700 px-1 py-0.5"></td>
                                            <td className="border-r border-slate-700 px-1 py-0.5"></td>
                                            <td className="border-r border-slate-700 px-1 py-0.5"></td>
                                            <td className="border-r border-slate-700 px-1 py-0.5 text-xs font-semibold">{bene > 0 ? (bene * 0.01).toFixed(2) : ""}</td>
                                            <td className="border-r border-slate-700 px-1 py-0.5 text-xs">{bene > 0 ? "अंडी/केळी" : ""}</td>
                                            <td className="border-r border-slate-700 px-1 py-0.5 text-xs font-bold">{bene > 0 ? (bene * (parseFloat(primaryRate) || 5.45)).toFixed(2) : ""}</td>
                                          </tr>
                                        );
                                      })}

                                      {!isFirstPage && (
                                        <tr className="border-b border-slate-700 bg-amber-100/80 font-black text-xs h-[22px]">
                                          <td className="border-r border-slate-700 px-2 py-1.5 font-black text-left" colSpan={3}>एकूण</td>
                                          <td className="border-r border-slate-700 px-1 py-0.5.5"></td>
                                          <td className="border-r border-slate-700 px-1 py-0.5.5 font-black">{monthlyTotalTat}</td>
                                          <td className="border-r border-slate-700 px-1 py-0.5.5 font-black">{monthlyTotalTat}</td>
                                          <td className="border-r border-slate-700 px-1 py-0.5.5 font-black">{monthlyTotalRiceUsed.toFixed(3)}</td>
                                          {Array.from({length: 23}, (_, ci) => (
                                            <td key={ci} className="border-r border-slate-700 px-1 py-0.5.5"></td>
                                          ))}
                                          <td className="border-r border-slate-700 px-1 py-0.5.5 font-black">{monthlyTotalGrant.toFixed(2)}</td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>

                                {!isFirstPage && (
                                  <div className="mt-1 space-y-1">
                                    {/* Yellow Summary Card */}
                                    <div className="border border-amber-300/90 bg-[#fffef0] px-2 py-1 rounded-xl space-y-0.5 font-sans text-[11px] shadow-xs">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-900">महिन्यातील एकूण ताटांची संख्या</span>
                                        <span className="bg-emerald-100/90 text-emerald-900 border border-emerald-300 font-extrabold px-3 py-0.5 rounded-md text-xs">
                                          {monthlyTotalTat}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2 pt-1">
                                        <span className="font-bold text-slate-900">इंधन व भाजीपाल्यासाठी खर्च केलेले अनुदान रु.</span>
                                        <span className="bg-emerald-100/90 text-emerald-900 border border-emerald-300 font-extrabold px-3 py-0.5 rounded-md text-xs">
                                          ₹{monthlyTotalGrant.toFixed(2)}
                                        </span>
                                      </div>

                                      <div className="text-[10px] font-medium text-slate-500 pl-0.5">
                                        (दैनंदिन नोंदवही — वापरलेली ताटे × प्रति ताट अनुदान)
                                      </div>

                                      <div className="space-y-1 pt-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-slate-900">स्वयंपाकी तथा मदतनीस मानधन रु.</span>
                                          <span className="inline-block border-b border-slate-700 w-44"></span>
                                        </div>
                                        <div className="text-[10px] font-medium text-slate-500 pl-0.5">
                                          (ताटांची संख्या × दर) (शासनस्तरावरून निश्चित केल्यानुसार)
                                        </div>
                                      </div>

                                      <div className="border-t border-dashed border-amber-300/80 my-0.5 pt-0.5">
                                        <p className="font-extrabold text-slate-900 text-[10px]">
                                          प्रमाणित करण्यात येते, की वर नमूद केलेली माहिती दैनंदिन नोंदवहीवरून घेतलेली आहे. ती तपासली आहे व बरोबर आहे.
                                        </p>
                                      </div>
                                    </div>

                                    {/* Footer Signatures */}
                                    <div className="flex items-end justify-between pt-0 text-[11px] font-bold px-2">
                                      <div className="space-y-0">
                                        <p className="font-extrabold text-slate-900">Date</p>
                                        <p className="text-slate-500 font-semibold">—</p>
                                      </div>
                                      <div className="text-center space-y-0">
                                        <div>
                                          <p className="font-extrabold text-slate-900">मुख्याध्यापक</p>
                                          <p className="font-bold text-slate-800">शालेय व्यवस्थापन समिती</p>
                                        </div>
                                        <div className="border-b border-slate-800 w-36 mx-auto"></div>
                                      </div>
                                    </div>


                                  </div>
                                )}
                              </div>
                            );
                          };

                          return (
                            <div className="space-y-0">
                              {renderPage(1, 15, true)}
                              <div className="border-t-2 border-dashed border-slate-300 my-4 print:hidden" />
                              {renderPage(16, daysInMonth, false)}
                            </div>
                          );
                        })()}

                        {/* === MASIK TANDUL AHVAL REPORT — EXACT PDF FORMAT === */}
                        {monthlyMdmReportType === "masik_tandul_report" && (() => {
                          const monthName = monthlyMdmReportMonth.split(' ')[0];
                          const monthMap: { [k: string]: number } = {
                            "जानेवारी": 1, "फेब्रुवारी": 2, "मार्च": 3, "एप्रिल": 4,
                            "मे": 5, "जून": 6, "जुलै": 7, "ऑगस्ट": 8,
                            "सप्टेंबर": 9, "ऑक्टोबर": 10, "नोव्हेंबर": 11, "डिसेंबर": 12
                          };
                          const engMonthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                          const monthNum = monthMap[monthName] || 6;
                          const year = monthNum >= 6 ? 2026 : 2027;
                          const schoolName = profile?.schoolName || "";

                          const riceData = getStockDataForItem("Rice", engMonthNames[monthNum], year, "1 To 5");
                          const prevTandul = riceData.prev;
                          const recTandul = riceData.received;
                          const usnaTandul = 0;
                          const totalTandul = prevTandul + recTandul + usnaTandul;
                          const shijvunTandul = riceData.used;
                          const usnaParatTandul = 0;
                          const shillakTandul = Math.max(0, totalTandul - shijvunTandul - usnaParatTandul);

                          const labharthi = riceData.beneficiary;
                          const kamacheDivs = riceData.cookedDays;
                          const shijvunDivs = riceData.cookedDays;

                          const kendraRate = 1.56;
                          const rajyaRate = 1.03;
                          const kendraHissa = parseFloat((labharthi * kendraRate).toFixed(2));
                          const rajyaHissa = parseFloat((labharthi * rajyaRate).toFixed(2));
                          const ekunKharc = kendraHissa + rajyaHissa;

                          const registerData = getRegisterDataForMonth(engMonthNames[monthNum], year, "1 To 5");
                          const pat = registerData.enrolled || labharthi || 0;
                          const pudheManagi = Math.max(0, parseFloat(((labharthi > 0 ? labharthi : pat) * 0.1 * 20 - shillakTandul).toFixed(1)));

                          return (
                            <div className="space-y-0">
                              <div className="text-center space-y-0.5 mb-3 pt-1">
                                <p className="text-xs font-bold text-slate-700">पंचायत समिती {profile?.taluka || ""} ( शिक्षण विभाग {profile?.district || ""} )</p>
                                <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">प्रधानमंत्री पोषण शक्ती निर्माण योजना तांदूळ शिजवून दिल्याचा अहवाल (सन {year}/{String(year+1).slice(-2)})</h2>
                              </div>

                              <div className="text-xs font-bold border border-black divide-y divide-black bg-white">
                                <div className="grid grid-cols-2 divide-x divide-black">
                                  <div className="p-1.5 px-2.5">शाळेचे नाव : <span className="font-black">{schoolName}</span></div>
                                  <div className="p-1.5 px-2.5">बीट : <span className="font-black">{profile?.beat || profile?.kendra || profile?.center || ""}</span></div>
                                </div>
                                <div className="grid grid-cols-2 divide-x divide-black">
                                  <div className="p-1.5 px-2.5">इयत्ता गट : <span className="font-black">प्राथमिक ( इयत्ता १ ते ५ )</span></div>
                                  <div className="p-1.5 px-2.5">ता. : <span className="font-black">{profile?.taluka || ""}</span></div>
                                </div>
                                <div className="grid grid-cols-2 divide-x divide-black">
                                  <div className="p-1.5 px-2.5">केंद्र : <span className="font-black">{profile?.kendra || profile?.center || ""}</span></div>
                                  <div className="p-1.5 px-2.5">जि. : <span className="font-black">{profile?.district || ""}</span></div>
                                </div>
                              </div>

                              <div className="w-full overflow-x-auto">
                                <table className="min-w-[1250px] w-full border-collapse border border-slate-700 text-center text-xs font-medium">
                                  <thead>
                                    <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-700 text-xs">
                                      <th className="border-r border-slate-700 px-1 py-1 font-bold relative z-30 align-middle bg-slate-100 min-w-[35px]" rowSpan={2}>अ.न.<br/><span className="font-normal">1</span></th>
                                      <th className="border-r border-slate-700 px-1.5 py-1 font-bold relative z-30 align-middle bg-slate-100 min-w-[140px]" rowSpan={2}>शाळेचे नाव<br/><span className="font-normal">2</span></th>
                                      <th className="border-r border-slate-700 px-1 py-1 font-bold relative z-30 align-middle bg-slate-100 min-w-[45px]" rowSpan={2}>पट<br/><span className="font-normal">3</span></th>
                                      <th className="border-r border-slate-700 px-1 py-1 font-bold relative z-30 align-middle bg-slate-100 min-w-[50px]" rowSpan={2}>लाभार्थी<br/><span className="font-normal">4</span></th>
                                      <th className="border-r border-slate-700 px-1 py-1 font-bold relative z-30 align-middle bg-blue-50" colSpan={4}>तांदूळ स्थिती (KG)<br/><span className="font-normal">5</span></th>
                                      <th className="border-r border-slate-700 px-1.5 py-1 font-bold relative z-30 align-middle bg-slate-100 min-w-[110px] leading-tight" rowSpan={2}>या महिन्यात शिजवून<br/>दिलेला तांदूळ (KG)<br/><span className="font-normal">9</span></th>
                                      <th className="border-r border-slate-700 px-1.5 py-1 font-bold relative z-30 align-middle bg-slate-100 min-w-[95px] leading-tight" rowSpan={2}>उसना परत<br/>केलेला तांदूळ (KG)<br/><span className="font-normal">10</span></th>
                                      <th className="border-r border-slate-700 px-1.5 py-1 font-bold relative z-30 align-middle bg-slate-100 min-w-[85px] leading-tight" rowSpan={2}>शिल्लक तांदूळ<br/>(KG)<br/><span className="font-normal">11</span></th>
                                      <th className="border-r border-slate-700 px-1 py-1 font-bold relative z-30 align-middle bg-green-50" colSpan={3}>शा.पो.आ. शिजवण्यासाठी चालू महिन्याचा खर्च</th>
                                      <th className="border-r border-slate-700 px-1 py-1 font-bold relative z-30 align-middle bg-slate-100 min-w-[60px]" rowSpan={2}>कामाचे<br/>दिवस<br/><span className="font-normal">15</span></th>
                                      <th className="border-r border-slate-700 px-1.5 py-1 font-bold relative z-30 align-middle bg-slate-100 min-w-[110px] leading-tight" rowSpan={2}>प्रत्यक्ष शा.पो.आ.<br/>शिजवून दिल्याचे दिवस<br/><span className="font-normal">16</span></th>
                                      <th className="border-r border-slate-700 px-1.5 py-1 font-bold relative z-30 align-middle bg-slate-100 min-w-[85px] leading-tight" rowSpan={2}>पुढील मागणी<br/>(KG)<br/><span className="font-normal">17</span></th>
                                    </tr>
                                    <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-700 text-xs">
                                      <th className="border-r border-slate-700 px-1 py-1 font-bold relative z-30 align-middle bg-blue-50 min-w-[75px]">मागील शिल्लक<br/>तांदूळ<br/><span className="font-normal">6</span></th>
                                      <th className="border-r border-slate-700 px-1 py-1 font-bold relative z-30 align-middle bg-blue-50 min-w-[70px]">प्राप्त तांदूळ<br/><span className="font-normal">7</span></th>
                                      <th className="border-r border-slate-700 px-1 py-1 font-bold relative z-30 align-middle bg-blue-50 min-w-[75px]">उसना घेतलेला<br/>तांदूळ<br/><span className="font-normal">8</span></th>
                                      <th className="border-r border-slate-700 px-1 py-1 font-bold relative z-30 align-middle bg-blue-50 min-w-[75px]">एकूण तांदूळ<br/><span className="font-normal">(6+7+8)</span></th>
                                      <th className="border-r border-slate-700 px-1 py-1 font-bold relative z-30 align-middle bg-green-50 min-w-[70px]">केंद्र हिस्सा<br/>1.56<br/><span className="font-normal">12</span></th>
                                      <th className="border-r border-slate-700 px-1 py-1 font-bold relative z-30 align-middle bg-green-50 min-w-[70px]">राज्य हिस्सा<br/>1.03<br/><span className="font-normal">13</span></th>
                                      <th className="border-r border-slate-700 px-1 py-1 font-bold relative z-30 align-middle bg-green-50 min-w-[65px]">2.59<br/><span className="font-normal">14</span></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr className="border-b border-slate-700 hover:bg-amber-50/20 font-semibold">
                                      <td className="border-r border-slate-700 px-2 py-1.5 font-black">1</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5 text-left font-bold text-xs leading-tight">{schoolName}</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5 font-black">{pat || ""}</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5 font-black">{labharthi || ""}</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5">{prevTandul > 0 ? prevTandul.toFixed(1) : ""}</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5">{recTandul > 0 ? recTandul.toFixed(1) : ""}</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5">{usnaTandul > 0 ? usnaTandul.toFixed(1) : ""}</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5 font-black">{totalTandul > 0 ? totalTandul.toFixed(1) : ""}</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5 font-black">{shijvunTandul > 0 ? shijvunTandul.toFixed(1) : ""}</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5">{usnaParatTandul > 0 ? usnaParatTandul.toFixed(1) : ""}</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5 font-black text-red-700">{shillakTandul > 0 ? shillakTandul.toFixed(1) : ""}</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5">{kendraHissa > 0 ? kendraHissa.toFixed(2) : ""}</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5">{rajyaHissa > 0 ? rajyaHissa.toFixed(2) : ""}</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5 font-black">{ekunKharc > 0 ? ekunKharc.toFixed(2) : ""}</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5">{shijvunDivs > 0 ? shijvunDivs : ""}</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5 font-black">{pudheManagi > 0 ? pudheManagi : ""}</td>
                                    </tr>
                                    <tr className="border-b border-slate-700 bg-slate-100 font-black text-xs">
                                      <td className="border-r border-slate-700 px-2 py-1.5 text-left font-black" colSpan={2}>एकूण</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5">{pat || ""}</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5">{labharthi || ""}</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5">{prevTandul > 0 ? prevTandul.toFixed(1) : ""}</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5">{recTandul > 0 ? recTandul.toFixed(1) : ""}</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5">{usnaTandul > 0 ? usnaTandul.toFixed(1) : ""}</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5">{totalTandul > 0 ? totalTandul.toFixed(1) : ""}</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5">{shijvunTandul > 0 ? shijvunTandul.toFixed(1) : ""}</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5">{usnaParatTandul > 0 ? usnaParatTandul.toFixed(1) : ""}</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5 text-red-700">{shillakTandul > 0 ? shillakTandul.toFixed(1) : ""}</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5">{kendraHissa > 0 ? kendraHissa.toFixed(2) : ""}</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5">{rajyaHissa > 0 ? rajyaHissa.toFixed(2) : ""}</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5">{ekunKharc > 0 ? ekunKharc.toFixed(2) : ""}</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5">{kamacheDivs > 0 ? kamacheDivs : ""}</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5">{shijvunDivs > 0 ? shijvunDivs : ""}</td>
                                      <td className="border-r border-slate-700 px-2 py-1.5">{pudheManagi > 0 ? pudheManagi : ""}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>

                              <div className="text-xs font-bold border border-slate-700 p-2.5 bg-amber-50/40">
                                अक्षरी रु. : <span className="font-black">{ekunKharc > 0 ? numberToMarathiWords(ekunKharc) : "—"}</span>
                              </div>

                              <div className="flex items-end justify-between pt-4 text-xs font-bold">
                                <div><p>Date : {new Date().toLocaleDateString('en-GB')}</p></div>
                                <div className="text-center">
                                  <p className="font-black">मुख्याध्यापक</p>
                                  <p className="text-xs text-slate-500 mt-0.5">{schoolName}</p>
                                </div>
                              </div>

                            </div>
                          );
                        })()}

                        {/* === MASIK SATHA NODVAHI (प्रपत्र ब) — EXACT PDF FORMAT === */}
                        {monthlyMdmReportType === "masik_goshwara" && (() => {
                          const monthName = monthlyMdmReportMonth.split(' ')[0];
                          const monthMap: { [k: string]: number } = {
                            "जानेवारी": 1, "फेब्रुवारी": 2, "मार्च": 3, "एप्रिल": 4,
                            "मे": 5, "जून": 6, "जुलै": 7, "ऑगस्ट": 8,
                            "सप्टेंबर": 9, "ऑक्टोबर": 10, "नोव्हेंबर": 11, "डिसेंबर": 12
                          };
                          const engMonthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                          const monthNum = monthMap[monthName] || 6;
                          const year = monthNum >= 6 ? 2026 : 2027;
                          const schoolName = profile?.schoolName || "";

                          const B_FORM_ITEMS = [
                                 { key: "Rice", nameMr: "तांदूळ", unit: "कि.ग्रॅ.", qty15: "0.100 कि.ग्रॅ.", qty68: "0.150 कि.ग्रॅ." },
                                 { key: "Mugdal", nameMr: "मूगडाळ", unit: "कि.ग्रॅ.", qty15: "0.020 कि.ग्रॅ.", qty68: "0.030 कि.ग्रॅ." },
                                 { key: "Turdal", nameMr: "तूरडाळ", unit: "कि.ग्रॅ.", qty15: "0.020 कि.ग्रॅ.", qty68: "0.030 कि.ग्रॅ." },
                                 { key: "Matki", nameMr: "मटकी", unit: "कि.ग्रॅ.", qty15: "0.020 कि.ग्रॅ.", qty68: "0.030 कि.ग्रॅ." },
                                 { key: "Cowpea", nameMr: "चवळी", unit: "कि.ग्रॅ.", qty15: "0.020 कि.ग्रॅ.", qty68: "0.030 कि.ग्रॅ." },
                                 { key: "Masurdal", nameMr: "मसूरडाळ", unit: "कि.ग्रॅ.", qty15: "0.020 कि.ग्रॅ.", qty68: "0.030 कि.ग्रॅ." },
                                 { key: "Pease", nameMr: "वाटाणा", unit: "कि.ग्रॅ.", qty15: "0.020 कि.ग्रॅ.", qty68: "0.030 कि.ग्रॅ." },
                                 { key: "Gram", nameMr: "हरभरा", unit: "कि.ग्रॅ.", qty15: "0.020 कि.ग्रॅ.", qty68: "0.030 कि.ग्रॅ." },
                                 { key: "Moong", nameMr: "मूग", unit: "कि.ग्रॅ.", qty15: "0.020 कि.ग्रॅ.", qty68: "0.030 कि.ग्रॅ." },
                                 { key: "Cumin", nameMr: "जिरे", unit: "कि.ग्रॅ.", qty15: "0.0005 कि.ग्रॅ.", qty68: "0.0007 कि.ग्रॅ." },
                                 { key: "Mustard", nameMr: "मोहरी", unit: "कि.ग्रॅ.", qty15: "0.0005 कि.ग्रॅ.", qty68: "0.0007 कि.ग्रॅ." },
                                 { key: "Turmeric", nameMr: "हळद", unit: "कि.ग्रॅ.", qty15: "0.0004 कि.ग्रॅ.", qty68: "0.0006 कि.ग्रॅ." },
                                 { key: "Onion Garlic Masala", nameMr: "कांदा लसूण मसाला", unit: "कि.ग्रॅ.", qty15: "0.0004 कि.ग्रॅ.", qty68: "0.0006 कि.ग्रॅ." },
                                 { key: "Salt", nameMr: "मीठ", unit: "कि.ग्रॅ.", qty15: "0.004 कि.ग्रॅ.", qty68: "0.006 कि.ग्रॅ." },
                                 { key: "Chili", nameMr: "मिरची पावडर", unit: "कि.ग्रॅ.", qty15: "0.0004 कि.ग्रॅ.", qty68: "0.0006 कि.ग्रॅ." },
                                 { key: "Oil", nameMr: "सोयाबीन खाद्यतेल", unit: "ली.", qty15: "0.0054 ली.", qty68: "0.0082 ली." },
                                 { key: "Garam Masala", nameMr: "गरम मसाला", unit: "कि.ग्रॅ.", qty15: "0.0004 कि.ग्रॅ.", qty68: "0.0006 कि.ग्रॅ." },
                                 { key: "Soyabean Wadi", nameMr: "सोया वडी", unit: "कि.ग्रॅ.", qty15: "0.020 कि.ग्रॅ.", qty68: "0.030 कि.ग्रॅ." },
                                 { key: "Sugar-Jaggery", nameMr: "साखर / गूळ", unit: "कि.ग्रॅ.", qty15: "—", qty68: "—" },
                                 { key: "Milk-Milk Powder", nameMr: "दूध / दूध पावडर", unit: "ली.", qty15: "—", qty68: "—" },
                                 { key: "Ragi Satva", nameMr: "नाचणी सत्व", unit: "कि.ग्रॅ.", qty15: "—", qty68: "—" },
                                 { key: "Vegetables", nameMr: "भाजीपाला", unit: "कि.ग्रॅ.", qty15: "0.050 कि.ग्रॅ.", qty68: "0.050 कि.ग्रॅ." }
                               ];

                          const riceData = getStockDataForItem("Rice", engMonthNames[monthNum], year, "1 To 5");
                          const labharthi = riceData.beneficiary;
                          const registerData = getRegisterDataForMonth(engMonthNames[monthNum], year, "1 To 5");
                          const enrolledPat = registerData.enrolled || labharthi || 0;

                          const items = B_FORM_ITEMS.map((def, idx) => {
                            const prev = getOpeningStock(engMonthNames[monthNum], year.toString(), "1 To 5", def.key);
                            const rec = getIncomingForItem(def.key, engMonthNames[monthNum], year, "1 To 5");
                            const used = getUsedForMonth(engMonthNames[monthNum], year.toString(), "1 To 5", def.key);
                            const demand = Math.max(0, (enrolledPat * 0.02 * 20) - (prev + rec - used));
                            return { sr: idx + 1, name: def.nameMr, prev, rec, used, demand: parseFloat(demand.toFixed(2)) };
                          });

                          const cookedDays = riceData.cookedDays;

                          const rateVal = parseFloat(primaryRate) || 5.45;
                          const vegCost = parseFloat((labharthi * (rateVal * (parseFloat(vegPercent) || 70) / 100)).toFixed(2));
                          const fuelCost = parseFloat((labharthi * (rateVal * (parseFloat(fuelPercent) || 30) / 100)).toFixed(2));
                          const ekunGrant = vegCost + fuelCost;

                          return (
                            <div className="space-y-0">
                              <div className="text-center space-y-0.5 mb-2">
                                <h2 className="text-[12px] font-black text-slate-900 tracking-tight">
                                  प्रधानमंत्री पोषण शक्ती निर्माण योजना : प्रपत्र (ब)
                                </h2>
                                <p className="text-xs font-bold text-slate-700">शाळेने केंद्रप्रमुखांना दरमहा द्यावयाचा अहवाल ( २ प्रती )</p>
                              </div>

                              <div className="border border-black text-xs font-bold">
                                <div className="grid grid-cols-3 divide-x divide-black border-b border-black">
                                  <div className="p-2.5">शाळेचे नाव : <span className="font-black">{schoolName}</span></div>
                                  <div className="p-2.5">इयत्ता गट : <span className="font-black">प्राथमिक ( इयत्ता १ ते ५ )</span></div>
                                  <div className="p-2.5">केंद्र : <span className="font-black">{profile?.kendra || profile?.center || ""}</span></div>
                                </div>
                                <div className="grid grid-cols-3 divide-x divide-black border-b border-black">
                                  <div className="p-2.5">बीट : <span className="font-black">{profile?.kendra || profile?.center || ""}</span></div>
                                  <div className="p-2.5">ता. : <span className="font-black">{profile?.taluka || ""}</span></div>
                                  <div className="p-2.5">जिल्हा : <span className="font-black">{profile?.district || ""}</span></div>
                                </div>
                                <div className="grid grid-cols-3 divide-x divide-black border-b border-black">
                                  <div className="p-2.5">माहे : <span className="font-black">{monthlyMdmReportMonth}</span></div>
                                  <div className="p-2.5">पटसंख्या (१ ते ५) : <span className="font-black">{enrolledPat || '—'}</span></div>
                                  <div className="p-2.5">एकूण लाभार्थी संख्या : <span className="font-black">{labharthi || '—'}</span></div>
                                </div>
                                <div className="grid grid-cols-3 divide-x divide-black">
                                  <div className="p-2.5">एकूण कामाचे दिवस : <span className="font-black">{cookedDays}</span></div>
                                  <div className="p-2.5">शिजवून दिलेले दिवस : <span className="font-black">{cookedDays}</span></div>
                                  <div className="p-2.5">तांदूळ व धान्याधी माल प्राप्त दिनांक : <span className="font-black">01-{String(monthNum).padStart(2,'0')}-{year}</span></div>
                                </div>
                              </div>

                              <div className="w-full overflow-x-auto">
                                <table className="min-w-[900px] w-full border-collapse border border-slate-700 text-center text-xs font-medium">
                                  <thead>
                                    <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-700 text-xs">
                                      <th className="border-r border-black p-1 w-[4%]">अ.न.<br/><span className="font-normal text-xs">1</span></th>
                                      <th className="border-r border-black p-1 text-left w-[20%]">धान्यादी मालाचे नाव<br/><span className="font-normal text-xs">2</span></th>
                                      <th className="border-r border-black p-1 w-[10%]">मागील शिल्लक वस्तू<br/><span className="text-xs font-normal">( किलोग्रॅम )</span><br/><span className="font-normal text-xs">3</span></th>
                                      <th className="border-r border-black p-1 w-[10%]">चालू महिन्यात प्राप्त वस्तू<br/><span className="text-xs font-normal">( किलोग्रॅम )</span><br/><span className="font-normal text-xs">4</span></th>
                                      <th className="border-r border-black p-1 w-[10%]">एकूण वस्तू<br/><span className="text-xs font-normal">( 3 + 4 ) ( किलोग्रॅम )</span><br/><span className="font-normal text-xs">5</span></th>
                                      <th className="border-r border-black p-1 w-[13%]">अन्न शिजवण्यासाठी वापरलेल्या वस्तू<br/><span className="text-xs font-normal">( किलोग्रॅम )</span><br/><span className="font-normal text-xs">6</span></th>
                                      <th className="border-r border-black p-1 w-[10%]">शिल्लक वस्तू<br/><span className="text-xs font-normal">( 5 - 6 ) ( किलोग्रॅम )</span><br/><span className="font-normal text-xs">7</span></th>
                                      <th className="border-r border-black p-1 w-[10%]">पुढील महिन्यासाठी मागणी<br/><span className="text-xs font-normal">( किलोग्रॅम )</span><br/><span className="font-normal text-xs">8</span></th>
                                      <th className="border-r border-black p-1 w-[8%]">शेरा<br/><span className="font-normal text-xs">9</span></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {items.map((row) => {
                                      const total = row.prev + row.rec;
                                      const bal = total - row.used;
                                      return (
                                        <tr key={row.sr} className={`border-b border-slate-700 h-8 ${row.sr % 2 === 0 ? "bg-slate-50/30" : "bg-white"} hover:bg-amber-50/20`}>
                                          <td className="border-r border-black py-0.5 text-xs">{row.sr}</td>
                                          <td className="border-r border-black py-0.5 text-left font-bold text-slate-900 pl-1 text-xs">{row.name}</td>
                                          <td className="border-r border-black py-0.5 font-semibold">{row.prev !== 0 ? row.prev.toFixed(3) : ""}</td>
                                          <td className="border-r border-black py-0.5">{row.rec !== 0 ? row.rec.toFixed(3) : ""}</td>
                                          <td className="border-r border-black py-0.5 font-bold">{total !== 0 ? total.toFixed(3) : ""}</td>
                                          <td className="border-r border-black py-0.5 font-bold text-slate-900">{row.used !== 0 ? row.used.toFixed(3) : ""}</td>
                                          <td className={`border-r border-black py-0.5 font-extrabold ${bal < 0 ? "text-red-600" : "text-slate-900"}`}>{bal !== 0 ? bal.toFixed(3) : ""}</td>
                                          <td className="border-r border-black py-0.5">{row.demand !== 0 ? row.demand.toFixed(2) : ""}</td>
                                          <td className="border-r border-black py-0.5"></td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>

                              <p className="text-xs font-semibold border border-slate-400 bg-amber-50/40 p-1 text-slate-800">
                                मागणी नोंदवताना शाळेकडे वीस दिवसांचा साठा शिल्लक राहील याची दक्षता घेवून मागणी नोंदवावी, जास्त साठा करून धान्य खराब होणार नाही याची दक्षता घ्यावी.
                              </p>

                              <div className="border border-black text-slate-900 text-xs font-bold bg-white mt-1">
                                <div className="flex w-full divide-x divide-black text-center border-b border-black">
                                  <div className="w-[35%] p-1.5 text-left pl-3">महिन्यातील ताटांची संख्या</div>
                                  <div className="w-[15%] p-1.5 font-black">{labharthi || ""}</div>
                                  <div className="w-[35%] p-1.5 text-left pl-3">भाजीपाला (0.98 पै.)</div>
                                  <div className="w-[15%] p-1.5 font-black">{labharthi ? `₹${(labharthi * 0.98).toFixed(2)}` : ""}</div>
                                </div>
                                <div className="flex w-full divide-x divide-black text-center border-b border-black">
                                  <div className="w-[35%] p-1.5 text-left pl-3">खर्च केलेले एकूण अनुदान रु.</div>
                                  <div className="w-[15%] p-1.5 font-black">{labharthi ? `₹${(labharthi * 2.59).toFixed(2)}` : ""}</div>
                                  <div className="w-[35%] p-1.5 text-left pl-3">इंधन (0.88 पै.)</div>
                                  <div className="w-[15%] p-1.5 font-black">{labharthi ? `₹${(labharthi * 0.88).toFixed(2)}` : ""}</div>
                                </div>
                                <div className="flex w-full divide-x divide-black text-center">
                                  <div className="w-[35%] p-1.5 text-left pl-3">स्वयंपाकी तथा मदतनीस मानधन रु.</div>
                                  <div className="w-[15%] p-1.5 font-black">{(labharthi > 0 && helpers.length > 0) ? `₹${(helpers.length * 1000).toFixed(2)}` : ""}</div>
                                  <div className="w-[35%] p-1.5 text-left pl-3">पूरक आहार (0.73 पै.)</div>
                                  <div className="w-[15%] p-1.5 font-black">{labharthi ? `₹${(labharthi * 0.73).toFixed(2)}` : ""}</div>
                                </div>
                              </div>

                              {/* Signature */}
                              <div className="flex items-end justify-between pt-3 text-xs font-bold">
                                <div><p>Date : __________</p></div>
                                <div className="text-center">
                                  <p className="font-black">मुख्याध्यापक</p>
                                  <p className="text-xs text-slate-500 mt-0.5">{schoolName}</p>
                                </div>
                              </div>

                            </div>
                          );
                        })()}

                        {/* === MASIK TANDUL SHIJVUN DILYACHE BILL — EXACT PDF FORMAT === */}
                        {monthlyMdmReportType === "masik_tandul_bill" && (() => {
                          const monthName = monthlyMdmReportMonth.split(' ')[0];
                          const monthMap: { [k: string]: number } = {
                            "जानेवारी": 1, "फेब्रुवारी": 2, "मार्च": 3, "एप्रिल": 4,
                            "मे": 5, "जून": 6, "जुलै": 7, "ऑगस्ट": 8,
                            "सप्टेंबर": 9, "ऑक्टोबर": 10, "नोव्हेंबर": 11, "डिसेंबर": 12
                          };
                          const monthNum = monthMap[monthName] || 7;
                          const year = monthNum >= 6 ? 2026 : 2027;
                          const daysInMonth = new Date(year, monthNum, 0).getDate();
                          const marDays = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
                          const schoolName = profile?.schoolName || "";
                          const shasDar = 2.59;
                          const kendraRate = 1.56;
                          const rajyaRate = 1.03;

                          // Generate daily data from actual MDM entries
                          const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
                            const day = i + 1;
                            const date = new Date(year, monthNum - 1, day);
                            const weekday = marDays[date.getDay()];
                            const isSunday = date.getDay() === 0;
                            const dateISO = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const dailyEntry = getDailyDataForMonthDate(dateISO, "1 To 5");
                            const pat = dailyEntry?.enrolled || 0;
                            const labharthi = dailyEntry?.beneficiary || 0;
                            const kendra = labharthi > 0 ? parseFloat((labharthi * kendraRate).toFixed(2)) : 0;
                            const rajya = labharthi > 0 ? parseFloat((labharthi * rajyaRate).toFixed(2)) : 0;
                            const ekun = labharthi > 0 ? parseFloat((labharthi * shasDar).toFixed(2)) : 0;
                            return { day, weekday, date: `${String(day).padStart(2, '0')}/${String(monthNum).padStart(2, '0')}/${year}`, pat, labharthi, shasDar, kendra, rajya, ekun, isSunday };
                          });

                          const totalPat = dailyData.reduce((s, d) => s + d.pat, 0);
                          const totalLabharthi = dailyData.reduce((s, d) => s + d.labharthi, 0);
                          const totalKendra = dailyData.reduce((s, d) => s + d.kendra, 0);
                          const totalRajya = dailyData.reduce((s, d) => s + d.rajya, 0);
                          const totalAnudan = dailyData.reduce((s, d) => s + d.ekun, 0);
                          const kamacheDivs = dailyData.filter(d => d.labharthi > 0).length;

                          return (
                            <div className="space-y-0">
                              {/* Title */}
                              <div className="text-center space-y-0.5 mb-2">
                                <p className="text-xs font-bold text-slate-700">पंचायत समिती {profile?.taluka || ""} ( शिक्षण विभाग {profile?.district || ""} )</p>
                                <h2 className="text-sm font-black text-slate-900 tracking-tight">
                                  प्रधानमंत्री पोषण शक्ती निर्माण योजना तांदूळ शिजवून दिल्याचे बिल (सन {year}/{String(year + 1).slice(-2)})
                                </h2>
                              </div>

                              {/* School Info */}
                              <div className="text-xs font-bold border border-black divide-y divide-black bg-white">
                                <div className="grid grid-cols-2 divide-x divide-black">
                                  <div className="p-1.5 px-2.5">शाळेचे नाव : <span className="font-black">{schoolName}</span></div>
                                  <div className="p-1.5 px-2.5">बीट : <span className="font-black">{profile?.beat || profile?.kendra || profile?.center || ""}</span></div>
                                </div>
                                <div className="grid grid-cols-2 divide-x divide-black">
                                  <div className="p-1.5 px-2.5">इयत्ता गट : <span className="font-black">प्राथमिक ( इयत्ता १ ते ५ )</span></div>
                                  <div className="p-1.5 px-2.5">ता. : <span className="font-black">{profile?.taluka || ""}</span></div>
                                </div>
                                <div className="grid grid-cols-2 divide-x divide-black">
                                  <div className="p-1.5 px-2.5">केंद्र : <span className="font-black">{profile?.kendra || profile?.center || ""}</span></div>
                                  <div className="p-1.5 px-2.5">जि. : <span className="font-black">{profile?.district || ""}</span></div>
                                </div>
                              </div>

                              {/* Daily Bill Table */}
                              <div className="w-full overflow-x-auto">
                                <table className="min-w-[1000px] w-full border-collapse border border-slate-700 text-center text-xs font-medium">
                                  <thead>
                                    <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-700 text-xs">
                                      <th className="border-r border-slate-700 px-2 py-1.5 font-bold relative z-30 align-middle bg-slate-100 min-w-[35px]" rowSpan={2}>अ.न.</th>
                                      <th className="border-r border-slate-700 px-2 py-1.5 font-bold relative z-30 align-middle bg-slate-100 min-w-[70px]" rowSpan={2}>वार</th>
                                      <th className="border-r border-slate-700 px-2 py-1.5 font-bold relative z-30 align-middle bg-slate-100 min-w-[85px]" rowSpan={2}>दिनांक</th>
                                      <th className="border-r border-slate-700 px-2 py-1.5 font-bold relative z-30 align-middle bg-slate-100 min-w-[65px]" rowSpan={2}>पटसंख्या</th>
                                      <th className="border-r border-slate-700 px-2 py-1.5 font-bold relative z-30 align-middle bg-slate-100 min-w-[75px]" rowSpan={2}>एकूण<br/>लाभार्थी</th>
                                      <th className="border-r border-slate-700 px-2 py-1.5 font-bold relative z-30 align-middle bg-slate-100 min-w-[80px]" rowSpan={2}>शासन दर<br/>(2.59 रु.)</th>
                                      <th className="border-r border-slate-700 px-2 py-1.5 font-bold relative z-30 align-middle bg-green-50" colSpan={2}>अनुदान वर्गीकरण</th>
                                      <th className="border-r border-slate-700 px-2 py-1.5 font-bold relative z-30 align-middle bg-slate-100 min-w-[95px]" rowSpan={2}>एकूण अनुदान<br/>(2.59 रु.)</th>
                                      <th className="border-r border-slate-700 px-2 py-1.5 font-bold relative z-30 align-middle bg-slate-100 min-w-[65px]" rowSpan={2}>शेरा</th>
                                    </tr>
                                    <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-700 text-xs">
                                      <th className="border-r border-slate-700 px-2 py-1.5 font-bold relative z-30 align-middle bg-green-50 min-w-[85px]">केंद्र हिस्सा<br/>1.56</th>
                                      <th className="border-r border-slate-700 px-2 py-1.5 font-bold relative z-30 align-middle bg-green-50 min-w-[85px]">राज्य हिस्सा<br/>1.03</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                     {dailyData.map((d) => (
                                      <tr key={d.day} className={`border-b border-slate-700 h-9 ${d.isSunday ? "bg-red-50/40 text-red-700" : "hover:bg-amber-50/20"}`}>
                                        <td className="border-r border-slate-700 px-2 py-1.5 text-xs">{d.day}</td>
                                        <td className="border-r border-slate-700 px-2 py-1.5 text-xs font-semibold">{d.weekday}</td>
                                        <td className="border-r border-slate-700 px-2 py-1.5 text-xs">{d.date}</td>
                                        <td className="border-r border-slate-700 px-2 py-1.5 font-bold relative z-30 align-middle bg-slate-100">{d.pat > 0 ? d.pat : ""}</td>
                                        <td className="border-r border-slate-700 px-2 py-1.5 font-bold relative z-30 align-middle bg-slate-100">{d.labharthi > 0 ? d.labharthi : ""}</td>
                                        <td className="border-r border-slate-700 px-2 py-1.5">{shasDar}</td>
                                        <td className="border-r border-slate-700 px-2 py-1.5">{d.kendra > 0 ? d.kendra.toFixed(2) : "0"}</td>
                                        <td className="border-r border-slate-700 px-2 py-1.5">{d.rajya > 0 ? d.rajya.toFixed(2) : "0"}</td>
                                        <td className="border-r border-slate-700 px-2 py-1.5 font-bold relative z-30 align-middle bg-slate-100">{d.ekun > 0 ? d.ekun.toFixed(2) : "0"}</td>
                                        <td className="border-r border-slate-700 px-2 py-1.5"></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Totals Summary */}
                              <div className="border border-black text-xs font-bold">
                                <div className="grid grid-cols-4 divide-x divide-black border-b border-black">
                                  <div className="p-2.5">महिन्याचे एकूण दिवस : <span className="font-black">{daysInMonth}</span></div>
                                  <div className="p-2.5">TOTAL पटसंख्या : <span className="font-black">{totalPat}</span></div>
                                  <div className="p-2.5">TOTAL लाभार्थी : <span className="font-black">{totalLabharthi}</span></div>
                                  <div className="p-2.5">TOTAL अनुदान : <span className="font-black">₹{totalAnudan.toFixed(2)}</span></div>
                                </div>
                                <div className="grid grid-cols-3 divide-x divide-black">
                                  <div className="p-2.5">कामाचे एकूण दिवस : <span className="font-black">{kamacheDivs}</span></div>
                                  <div className="p-2.5">शिजवून दिल्याचे एकूण दिवस : <span className="font-black">{kamacheDivs}</span></div>
                                  <div className="p-2.5"><span className="font-black">{totalLabharthi} × {shasDar}</span></div>
                                </div>
                              </div>

                              {/* Akshari */}
                              <div className="text-xs font-bold border border-slate-700 p-2.5 bg-amber-50/40">
                                अक्षरी रु :- <span className="font-black">{totalAnudan > 0 ? numberToMarathiWords(totalAnudan) : '—'}</span>
                              </div>

                              {/* Signature */}
                              <div className="flex items-end justify-between pt-4 text-xs font-bold">
                                <div><p>Date : __________</p></div>
                                <div className="text-center">
                                  <p className="font-black">मुख्याध्यापक</p>
                                  <p className="text-xs text-slate-500 mt-0.5">{schoolName}</p>
                                </div>
                              </div>

                            </div>
                          );
                        })()}



                      </div>
                    </div>
                  </div>
                )}



                {/* Certificate Tab */}
                {activeTab === "monthly-report" && (
                  <div className="bg-white p-2 md:p-4 border border-slate-300 w-full min-h-[800px] flex flex-col items-stretch">
                    <div className="w-full max-w-full space-y-6">
                      <div className="text-center py-2">
                        <h2 className="text-2xl font-black text-[#004C99]">
                          Certificate
                        </h2>
                      </div>

                      {/* Top Control Bar matching User Screenshot */}
                      <div className="bg-[#f8fafc] p-3 md:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                        {/* Month Selector */}
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                            माह :
                          </label>
                          <select
                            value={monthlyReportMonth || "April"}
                            onChange={(e) => setMonthlyReportMonth(e.target.value)}
                            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm cursor-pointer"
                          >
                            <option value="April">एप्रिल</option>
                            <option value="May">मे</option>
                            <option value="June">जून</option>
                            <option value="July">जुलै</option>
                            <option value="August">ऑगस्ट</option>
                            <option value="September">सप्टेंबर</option>
                            <option value="October">ऑक्टोबर</option>
                            <option value="November">नोव्हेंबर</option>
                            <option value="December">डिसेंबर</option>
                            <option value="January">जानेवारी</option>
                            <option value="February">फेब्रुवारी</option>
                            <option value="March">मार्च</option>
                          </select>
                        </div>

                        {/* Class Subtabs Pill Group */}
                        <div className="flex items-center bg-slate-200/80 p-1 rounded-xl gap-1">
                          <button
                            type="button"
                            onClick={() => setMonthlySubTab("1-5")}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                              monthlySubTab === "1-5"
                                ? "bg-white text-blue-700 shadow-sm font-extrabold"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            १ ते ५
                          </button>
                          <button
                            type="button"
                            onClick={() => setMonthlySubTab("6-8")}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                              monthlySubTab === "6-8"
                                ? "bg-white text-blue-700 shadow-sm font-extrabold"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            ६ ते ८
                          </button>
                          <button
                            type="button"
                            onClick={() => setMonthlySubTab("1-8")}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                              monthlySubTab === "1-8"
                                ? "bg-white text-blue-700 shadow-sm font-extrabold"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            १ ते ८ (एकत्रित)
                          </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowCertEditor(!showCertEditor)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border ${
                              showCertEditor
                                ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>{showCertEditor ? "संपादन बंद करा" : "प्रमाणपत्र माहिती संपादन"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedReportCategory("masik_goshwara")}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
                          >
                            मासिक ताळमेळ अहवाल (प्रपत्र ब)
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadPdf}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>प्रिंट / PDF डाउनलोड</span>
                          </button>
                        </div>
                      </div>

                      {/* Interactive Certificate Info Editor Card */}
                      {showCertEditor && (
                        <div className="bg-slate-50 border border-slate-300 rounded-2xl p-4 space-y-3 shadow-sm print:hidden">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <div className="flex items-center gap-2">
                              <Sliders className="w-4 h-4 text-amber-600" />
                              <h3 className="text-xs font-extrabold text-slate-900 tracking-wide">
                                प्रमाणपत्र मजकूर माहिती संपादन (Edit Certificate Text & Details)
                              </h3>
                            </div>
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              ⚡ खालील माहिती बदलताच प्रमाणपत्रामध्ये लाईव्ह (Live) अपडेट होईल
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs font-bold text-slate-700">
                            {/* 1. अध्यक्ष / सचिव नाव */}
                            <div>
                              <label className="block mb-1 text-slate-700">अध्यक्ष/सचिव नाव</label>
                              <input
                                type="text"
                                value={reportPrincipalName}
                                onChange={(e) => setReportPrincipalName(e.target.value)}
                                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                            </div>

                            {/* 2. शिक्षकाचे / स्वयंपाकी नाव */}
                            <div>
                              <label className="block mb-1 text-slate-700">शिक्षकाचे/स्वयंपाकी नाव</label>
                              <input
                                type="text"
                                value={reportTeacherName}
                                onChange={(e) => setReportTeacherName(e.target.value)}
                                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                            </div>

                            {/* 3. शाळेचे नाव */}
                            <div>
                              <label className="block mb-1 text-slate-700">शाळेचे नाव</label>
                              <input
                                type="text"
                                value={reportSchoolName}
                                onChange={(e) => setReportSchoolName(e.target.value)}
                                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                            </div>

                            {/* 4. माह / महिना */}
                            <div>
                              <label className="block mb-1 text-slate-700">माह / महिना</label>
                              <input
                                type="text"
                                value={certMonthName}
                                onChange={(e) => setCertMonthName(e.target.value)}
                                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                            </div>

                            {/* 4. इ. १ ते ५ शिजवलेले दिवस */}
                            <div>
                              <label className="block mb-1 text-slate-700">इ. १ ते ५ शिजवलेले दिवस</label>
                              <input
                                type="text"
                                value={certPrimaryCookedDays}
                                onChange={(e) => setCertPrimaryCookedDays(e.target.value)}
                                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                            </div>

                            {/* 5. इ. ६ ते ८ शिजवलेले दिवस */}
                            <div>
                              <label className="block mb-1 text-slate-700">इ. ६ ते ८ शिजवलेले दिवस</label>
                              <input
                                type="text"
                                value={certUpperCookedDays}
                                onChange={(e) => setCertUpperCookedDays(e.target.value)}
                                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                            </div>

                            {/* 6. दर बुधवारी वेळा */}
                            <div>
                              <label className="block mb-1 text-slate-700">दर बुधवारी एकूण वेळा</label>
                              <input
                                type="text"
                                value={certWednesdaysCount}
                                onChange={(e) => setCertWednesdaysCount(e.target.value)}
                                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                            </div>

                            {/* 7. पूरक आहार प्रकार */}
                            <div>
                              <label className="block mb-1 text-slate-700">पूरक आहार प्रकार</label>
                              <input
                                type="text"
                                value={certSupplementaryFood}
                                onChange={(e) => setCertSupplementaryFood(e.target.value)}
                                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-6 w-full">
                        <div id="monthly-report-print" className="bg-white p-0 space-y-8 w-full overflow-visible print:p-0 print:bg-white print:space-y-0">
                            {(() => {
                              const acadMonths = getAcademicYearMonths("2025-26");
                              const selectedMonthObj = acadMonths.find(m => m.month === monthlyReportMonth);
                              const reportYear = selectedMonthObj ? selectedMonthObj.year : undefined;
                              const calcYear = selectedMonthObj ? selectedMonthObj.year : 2025;

                              const englishMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                              const marathiMonths = ["जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून", "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"];
                              const monthIndex = englishMonths.indexOf(monthlyReportMonth || "");
                              const marathiMonthName = monthIndex !== -1 ? marathiMonths[monthIndex] : "";

                              const B_FORM_ITEMS = [
                                { key: "Rice", nameMr: "तांदूळ", unit: "कि.ग्रॅ.", qty15: "0.100 कि.ग्रॅ.", qty68: "0.150 कि.ग्रॅ." },
                                { key: "Mugdal", nameMr: "मूगडाळ", unit: "कि.ग्रॅ.", qty15: "0.020 कि.ग्रॅ.", qty68: "0.030 कि.ग्रॅ." },
                                { key: "Turdal", nameMr: "तूरडाळ", unit: "कि.ग्रॅ.", qty15: "0.020 कि.ग्रॅ.", qty68: "0.030 कि.ग्रॅ." },
                                { key: "Matki", nameMr: "मटकी", unit: "कि.ग्रॅ.", qty15: "0.020 कि.ग्रॅ.", qty68: "0.030 कि.ग्रॅ." },
                                { key: "Chavali", nameMr: "चवळी", unit: "कि.ग्रॅ.", qty15: "0.020 कि.ग्रॅ.", qty68: "0.030 कि.ग्रॅ." },
                                { key: "Masurdal", nameMr: "मसूरडाळ", unit: "कि.ग्रॅ.", qty15: "0.020 कि.ग्रॅ.", qty68: "0.030 कि.ग्रॅ." },
                                { key: "Vatana", nameMr: "वाटाणा", unit: "कि.ग्रॅ.", qty15: "0.020 कि.ग्रॅ.", qty68: "0.030 कि.ग्रॅ." },
                                { key: "Harbhara", nameMr: "हरभरा", unit: "कि.ग्रॅ.", qty15: "0.020 कि.ग्रॅ.", qty68: "0.030 कि.ग्रॅ." },
                                { key: "Moong", nameMr: "मूग", unit: "कि.ग्रॅ.", qty15: "0.020 कि.ग्रॅ.", qty68: "0.030 कि.ग्रॅ." },
                                { key: "Cumin", nameMr: "जिरे", unit: "कि.ग्रॅ.", qty15: "0.0005 कि.ग्रॅ.", qty68: "0.0007 कि.ग्रॅ." },
                                { key: "Mustard", nameMr: "मोहरी", unit: "कि.ग्रॅ.", qty15: "0.0005 कि.ग्रॅ.", qty68: "0.0007 कि.ग्रॅ." },
                                { key: "Turmeric", nameMr: "हळद", unit: "कि.ग्रॅ.", qty15: "0.0004 कि.ग्रॅ.", qty68: "0.0006 कि.ग्रॅ." },
                                { key: "Onion Garlic Masala", nameMr: "कांदा लसूण मसाला", unit: "कि.ग्रॅ.", qty15: "0.0004 कि.ग्रॅ.", qty68: "0.0006 कि.ग्रॅ." },
                                { key: "Salt", nameMr: "मीठ", unit: "कि.ग्रॅ.", qty15: "0.004 कि.ग्रॅ.", qty68: "0.006 कि.ग्रॅ." },
                                { key: "Chili", nameMr: "मिरची पावडर", unit: "कि.ग्रॅ.", qty15: "0.0004 कि.ग्रॅ.", qty68: "0.0006 कि.ग्रॅ." },
                                { key: "Oil", nameMr: "सोयाबीन खाद्यतेल", unit: "ली.", qty15: "0.0054 ली.", qty68: "0.0082 ली." },
                                { key: "Garam Masala", nameMr: "गरम मसाला", unit: "कि.ग्रॅ.", qty15: "0.0004 कि.ग्रॅ.", qty68: "0.0006 कि.ग्रॅ." },
                                { key: "Soyabean Wadi", nameMr: "सोया वडी", unit: "कि.ग्रॅ.", qty15: "0.020 कि.ग्रॅ.", qty68: "0.030 कि.ग्रॅ." }
                              ];

                              // Primary Calculations (1-5)
                              const primaryRiceData = getStockDataForItem("Rice", monthlyReportMonth || "April", calcYear, "1 To 5");
                              const primaryCookedDays = primaryRiceData?.cookedDays || 0;
                              const primaryBeneficiarySum = primaryRiceData?.beneficiary || 0;
                              const primaryAvgBeneficiary = primaryCookedDays > 0 ? Math.round(primaryBeneficiarySum / primaryCookedDays) : 0;

                              // Upper Primary Calculations (6-8)
                              const upperRiceData = getStockDataForItem("Rice", monthlyReportMonth || "April", calcYear, "6 To 8");
                              const upperCookedDays = upperRiceData?.cookedDays || 0;
                              const upperBeneficiarySum = upperRiceData?.beneficiary || 0;
                              const upperAvgBeneficiary = upperCookedDays > 0 ? Math.round(upperBeneficiarySum / upperCookedDays) : 0;

                              const getBFormStockData = (itemKey: string, cls: "1 To 5" | "6 To 8") => {
                                const stockData = getStockDataForItem(itemKey, monthlyReportMonth || "April", calcYear, cls);
                                const opening = stockData?.prev || 0;
                                const received = stockData?.received || 0;
                                const borrowed = getLokForMonth(itemKey, monthlyReportMonth || "April", calcYear);
                                const total = opening + received + borrowed;
                                const spent = stockData?.used || 0;
                                const spoiled = getDamagedForMonth(itemKey, monthlyReportMonth || "April", calcYear);
                                const closing = Math.max(0, total - spent - spoiled);
                                return {
                                  opening,
                                  received,
                                  borrowed,
                                  total,
                                  spent,
                                  spoiled,
                                  closing
                                };
                              };

                              const getWednesdaysInMonth = (monthName: string, yearNum: number) => {
                                const englishMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                                const mIdx = englishMonths.indexOf(monthName);
                                if (mIdx === -1) return 0;
                                let count = 0;
                                const d = new Date(yearNum, mIdx, 1);
                                while (d.getMonth() === mIdx) {
                                  if (d.getDay() === 3) count++; // 3 is Wednesday
                                  d.setDate(d.getDate() + 1);
                                }
                                return count;
                              };
                              const wednesdaysCount = getWednesdaysInMonth(monthlyReportMonth || "April", calcYear);

                              const primaryCenterGrant = primaryBeneficiarySum * 4.07;
                              const primaryStateGrant = primaryBeneficiarySum * 2.71;
                              const primaryTotalGrant = primaryCenterGrant + primaryStateGrant;

                              const upperCenterGrant = upperBeneficiarySum * 6.10;
                              const upperStateGrant = upperBeneficiarySum * 4.07;
                              const upperTotalGrant = upperCenterGrant + upperStateGrant;

                              const totalCenterGrant = primaryCenterGrant + upperCenterGrant;
                              const totalStateGrant = primaryStateGrant + upperStateGrant;
                              const totalGrantAll = totalCenterGrant + totalStateGrant;

                              const helperCount = helpers?.length || 0;
                              const helperCenterPay = helperCount * 600;
                              const helperStatePay = helperCount * 400;
                              const helperTotalPay = helperCount * 1000;

                              const renderBFormPage = (cls: "1 To 5" | "6 To 8") => {
                                const isPrimary = cls === "1 To 5";
                                const riceData = getStockDataForItem("Rice", monthlyReportMonth || "April", calcYear, cls);
                                const cookedDays = riceData?.cookedDays || 0;
                                const beneficiarySum = riceData?.beneficiary || 0;
                                const avgBeneficiary = cookedDays > 0 ? Math.round(beneficiarySum / cookedDays) : 0;
                                const standardLabel = isPrimary ? "1 ली ते 5 वी" : "6 वी ते 8 वी";

                                const classRegData = getRegisterDataForMonth(monthlyReportMonth || "April", calcYear, cls);
                                const classEnrolled = classRegData.enrolled || (isPrimary ? Number(profile?.patPrimary || 0) : Number(profile?.patUpper || 0));

                                return (
                                  <div className="print-page border border-slate-400 p-4 md:p-6 bg-white text-black font-sans text-xs relative w-full min-w-[1000px]  shadow-md flex flex-col justify-between print:w-full print:h-auto print:border-none print:shadow-none print:p-0">
                                    <div>
                                      {/* Top Header matching Image 2 */}
                                      <div className="text-center space-y-0.5 mb-2 border-b-2 border-black pb-1.5">
                                        <h1 className="text-sm md:text-base font-extrabold uppercase text-black tracking-wide">
                                          प्रधानमंत्री पोषण शक्ती निर्माण योजना सन :- {reportYear ? `${reportYear} - ${String(reportYear + 1).slice(-2)}` : "2026 - 27"}
                                        </h1>
                                        <h2 className="text-xs md:text-sm font-bold text-black flex justify-between items-center px-4 py-0.5">
                                          <span>धान्यादी मालाचा मासिक ताळमेळ अहवाल   मासिक "ब" प्रपत्र</span>
                                          <span>इयत्ता :- {standardLabel}</span>
                                          <span>माहे :- {marathiMonthName} {reportYear ? toMarathiNumbers(reportYear.toString()) : ""}</span>
                                        </h2>
                                        <div className="flex justify-between items-center text-sm font-bold text-black pt-1 px-2">
                                          <div>जिल्हा परिषद शाळा, <span className="font-extrabold border-b border-black px-2">{reportSchoolName || profile?.schoolName || ""}</span></div>
                                          <div>केंद्र :- <span className="font-extrabold border-b border-black px-2">{profile?.center || profile?.kendra || ""}</span></div>
                                          <div>ता. :- <span className="font-extrabold border-b border-black px-2">{profile?.taluka || ""}</span></div>
                                          <div>जि. <span className="font-extrabold border-b border-black px-2">{profile?.district || ""}</span></div>
                                        </div>
                                      </div>

                                      {/* Sub-header stats row matching Image 2 */}
                                      <div className="flex justify-between items-center border border-black p-1 mb-2 text-sm font-bold text-black bg-slate-50">
                                        <div className="w-[20%] text-center border-r border-black font-extrabold">
                                          पट :- <span className="text-sm border-b border-black px-2">{toMarathiNumbers(classEnrolled.toString())}</span>
                                        </div>
                                        <div className="w-[40%] text-center border-r border-black">
                                          शिजवलेले दिवस :- <span className="font-extrabold text-sm border-b border-black px-2">{toMarathiNumbers(cookedDays.toString())}</span>
                                        </div>
                                        <div className="w-[40%] text-center">
                                          लाभार्थी :- <span className="font-extrabold text-sm border-b border-black px-2">{toMarathiNumbers(beneficiarySum.toString())}</span>
                                        </div>
                                      </div>

                                      {/* 18-Column Main Table matching Image 2 with explicit colgroup */}
                                      <div className="w-full">
                                        <table className="w-full min-w-[1100px] border-collapse border border-black text-center text-xs font-sans table-fixed">
                                          <colgroup>
                                            <col style={{ width: "3.2%" }} />
                                            <col style={{ width: "15%" }} />
                                            {B_FORM_ITEMS.map((item) => (
                                              <col key={item.key} style={{ width: "4.54%" }} />
                                            ))}
                                          </colgroup>
                                          <thead>
                                            <tr className="font-bold border-b border-black">
                                              <th className="border border-black p-1 bg-slate-100 font-extrabold align-middle text-center" rowSpan={3}>अ. क्र.</th>
                                              <th className="border border-black p-1 text-left pl-1.5 bg-slate-100 font-extrabold align-middle" rowSpan={3}>तपशील</th>
                                              <th className="border border-black p-1 bg-slate-100 font-extrabold" colSpan={18}>
                                                एकूण खर्च झालेल्या तांदूळ व धान्यादी मालाचा तपशील
                                              </th>
                                            </tr>
                                            <tr className="font-bold border-b border-black">
                                              {B_FORM_ITEMS.map((item) => (
                                                <th key={item.key} className="border border-black p-0.5 text-[10.5px] leading-tight font-extrabold align-middle bg-slate-100 whitespace-normal break-words">
                                                  {item.nameMr}
                                                </th>
                                              ))}
                                            </tr>
                                            <tr className="text-xs font-medium border-b border-black">
                                              {B_FORM_ITEMS.map((item) => (
                                                <th key={item.key} className="border border-black p-0.5 leading-tight text-[9.5px] text-slate-700 whitespace-pre-wrap align-middle bg-slate-50">
                                                  {isPrimary ? item.qty15.replace(" ", "\n") : item.qty68.replace(" ", "\n")}
                                                </th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {/* Row 1 */}
                                            <tr>
                                              <td className="border border-black p-0.5 font-bold">1</td>
                                              <td className="border border-black p-0.5 text-left pl-1 leading-tight">आरंभीची शिल्लक (साठा नोंदवहीप्रमाणे मागील महिना शिल्लक कि. ग्रॅ.)</td>
                                              {B_FORM_ITEMS.map((item) => {
                                                const data = getBFormStockData(item.key, cls);
                                                return (
                                                  <td key={item.key} className="border border-black p-0.5 font-semibold text-xs leading-tight overflow-hidden text-ellipsis whitespace-nowrap">
                                                    {data.opening > 0 ? toMarathiNumbers(data.opening.toFixed(3)) : ""}
                                                  </td>
                                                );
                                              })}
                                            </tr>

                                            {/* Row 2 */}
                                            <tr>
                                              <td className="border border-black p-0.5 font-bold">2</td>
                                              <td className="border border-black p-0.5 text-left pl-1 leading-tight">साठा नोंदवहीप्रमाणे चालू महिना प्राप्त तांदूळ व धान्यादी माल कि. ग्रॅ.</td>
                                              {B_FORM_ITEMS.map((item) => {
                                                const data = getBFormStockData(item.key, cls);
                                                return (
                                                  <td key={item.key} className="border border-black p-0.5 font-semibold text-xs leading-tight overflow-hidden text-ellipsis whitespace-nowrap">
                                                    {data.received > 0 ? toMarathiNumbers(data.received.toFixed(3)) : ""}
                                                  </td>
                                                );
                                              })}
                                            </tr>

                                            {/* Row 3 */}
                                            <tr>
                                              <td className="border border-black p-0.5 font-bold">3</td>
                                              <td className="border border-black p-0.5 text-left pl-1 leading-tight">उसनवार खरेदी लोकसहभाग</td>
                                              {B_FORM_ITEMS.map((item) => {
                                                const data = getBFormStockData(item.key, cls);
                                                return (
                                                  <td key={item.key} className="border border-black p-0.5 font-semibold text-xs leading-tight overflow-hidden text-ellipsis whitespace-nowrap">
                                                    {data.borrowed > 0 ? toMarathiNumbers(data.borrowed.toFixed(3)) : ""}
                                                  </td>
                                                );
                                              })}
                                            </tr>

                                            {/* Row 4 */}
                                            <tr className="bg-slate-50 font-bold">
                                              <td className="border border-black p-0.5">4</td>
                                              <td className="border border-black p-0.5 text-left pl-1 leading-tight">साठा नोंदवही प्रमाणे एकूण कि. ग्रॅ. (कॉलम नं. 1+2+3)</td>
                                              {B_FORM_ITEMS.map((item) => {
                                                const data = getBFormStockData(item.key, cls);
                                                return (
                                                  <td key={item.key} className="border border-black p-0.5 text-xs leading-tight overflow-hidden text-ellipsis whitespace-nowrap">
                                                    {data.total > 0 ? toMarathiNumbers(data.total.toFixed(3)) : ""}
                                                  </td>
                                                );
                                              })}
                                            </tr>

                                            {/* Row 5 */}
                                            <tr>
                                              <td className="border border-black p-0.5 font-bold">5</td>
                                              <td className="border border-black p-0.5 text-left pl-1 leading-tight">शिजविण्यात आलेले दिवस</td>
                                              {B_FORM_ITEMS.map((item) => {
                                                const data = getBFormStockData(item.key, cls);
                                                return (
                                                  <td key={item.key} className="border border-black p-0.5 font-semibold text-xs leading-tight overflow-hidden text-ellipsis whitespace-nowrap">
                                                    {data.spent > 0 || item.key === "Rice" ? (cookedDays > 0 ? toMarathiNumbers(cookedDays.toString()) : "") : ""}
                                                  </td>
                                                );
                                              })}
                                            </tr>

                                            {/* Row 6 */}
                                            <tr>
                                              <td className="border border-black p-0.5 font-bold">6</td>
                                              <td className="border border-black p-0.5 text-left pl-1 leading-tight">चालू महिन्यातील लाभार्थी</td>
                                              {B_FORM_ITEMS.map((item) => {
                                                const data = getBFormStockData(item.key, cls);
                                                return (
                                                  <td key={item.key} className="border border-black p-0.5 font-semibold text-xs leading-tight overflow-hidden text-ellipsis whitespace-nowrap">
                                                    {data.spent > 0 || item.key === "Rice" ? (beneficiarySum > 0 ? toMarathiNumbers(beneficiarySum.toString()) : "") : ""}
                                                  </td>
                                                );
                                              })}
                                            </tr>

                                            {/* Row 7 */}
                                            <tr>
                                              <td className="border border-black p-0.5 font-bold">7</td>
                                              <td className="border border-black p-0.5 text-left pl-1 leading-tight">शिजविण्यात आलेला धान्यादी माल (लाभार्थ्याप्रमाणे तांदूळ व धान्यादी माल कि. ग्रॅ.)</td>
                                              {B_FORM_ITEMS.map((item) => {
                                                const data = getBFormStockData(item.key, cls);
                                                return (
                                                  <td key={item.key} className="border border-black p-0.5 font-semibold text-xs leading-tight overflow-hidden text-ellipsis whitespace-nowrap">
                                                    {data.spent > 0 ? toMarathiNumbers(data.spent.toFixed(3)) : ""}
                                                  </td>
                                                );
                                              })}
                                            </tr>

                                            {/* Row 8 */}
                                            <tr>
                                              <td className="border border-black p-0.5 font-bold">8</td>
                                              <td className="border border-black p-0.5 text-left pl-1 leading-tight">तूट / खराब</td>
                                              {B_FORM_ITEMS.map((item) => {
                                                const data = getBFormStockData(item.key, cls);
                                                return (
                                                  <td key={item.key} className="border border-black p-0.5 font-semibold text-xs leading-tight overflow-hidden text-ellipsis whitespace-nowrap">
                                                    {data.spoiled > 0 ? toMarathiNumbers(data.spoiled.toFixed(3)) : ""}
                                                  </td>
                                                );
                                              })}
                                            </tr>

                                            {/* Row 9 */}
                                            <tr className="bg-slate-50 font-bold">
                                              <td className="border border-black p-0.5">9</td>
                                              <td className="border border-black p-0.5 text-left pl-1 leading-tight">महिना अखेर शिल्लक तांदूळ व धान्यादी माल कि. ग्रॅ. (कॉलम नं. 4 - 7 - 8)</td>
                                              {B_FORM_ITEMS.map((item) => {
                                                const data = getBFormStockData(item.key, cls);
                                                return (
                                                  <td key={item.key} className="border border-black p-0.5 text-xs leading-tight overflow-hidden text-ellipsis whitespace-nowrap">
                                                    {data.closing > 0 ? toMarathiNumbers(data.closing.toFixed(3)) : ""}
                                                  </td>
                                                );
                                              })}
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>

                                      {/* Vegetable Usage Sub-table (भाजीपाला वापर तक्ता) */}
                                      <div className="mt-3 flex justify-start">
                                        <table className="border-collapse border border-black text-center text-xs font-sans">
                                          <thead>
                                            <tr className="bg-slate-100 font-bold border-b border-black text-xs">
                                              <th className="border border-black px-8 py-1 min-w-[120px]">तपशील</th>
                                              <th className="border border-black px-8 py-1 min-w-[160px]" colSpan={2}>वापर</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr>
                                              <td className="border border-black px-8 py-1 font-bold">भाजीपाला</td>
                                              <td className="border border-black px-8 py-1 font-bold">{toMarathiNumbers((isPrimary ? beneficiarySum * 0.050 : beneficiarySum * 0.075).toFixed(3))}</td>
                                              <td className="border border-black px-4 py-1 font-medium">कि. ग्रॅ.</td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </div>
                                );
                              };

                              const renderTandulBhag1Page = (cls: "1 To 5" | "6 To 8") => {
                                const isPrimary = cls === "1 To 5";
                                const riceData = getStockDataForItem("Rice", monthlyReportMonth || "April", calcYear, cls);
                                const cookedDays = riceData?.cookedDays || 0;
                                const beneficiarySum = riceData?.beneficiary || 0;

                                const monthIdx = englishMonths.indexOf(monthlyReportMonth || "April");
                                const daysInMonth = new Date(calcYear, monthIdx + 1, 0).getDate();
                                const ratePerStudent = isPrimary ? 0.100 : 0.150;
                                const openingStock = getOpeningStock(monthlyReportMonth || "April", calcYear.toString(), cls, "Rice");

                                const marathiClsLabel = isPrimary ? "प्राथमिक ( इयत्ता १ ते ५ )" : "उच्च प्राथमिक ( इयत्ता ६ ते ८ )";
                                const enrolledCount = isPrimary ? (profile?.patPrimary || "0") : (profile?.patUpper || "0");

                                let currentStock = openingStock;
                                const dailyRows = [];

                                for (let d = 1; d <= daysInMonth; d++) {
                                  const dayStr = d < 10 ? `0${d}` : `${d}`;
                                  const mStr = monthIdx + 1 < 10 ? `0${monthIdx + 1}` : `${monthIdx + 1}`;
                                  const dateStrFormatted = `${dayStr}/${mStr}/${calcYear}`;
                                  const dateRecordKey = `${calcYear}-${mStr}-${dayStr}`;

                                  const dateObj = new Date(calcYear, monthIdx, d);
                                  const isSunday = dateObj.getDay() === 0;

                                  const rec = registerRecords?.[dateRecordKey];
                                  const classRec = rec?.[cls] || (cls === "1 To 5" ? rec : null);

                                  const beneficiary = classRec?.beneficiary ? Number(classRec.beneficiary) : 0;
                                  const enrolled = classRec?.enrolled ? Number(classRec.enrolled) : (beneficiary > 0 ? (parseInt(enrolledCount || "0", 10) || 0) : 0);

                                  const prev = currentStock;
                                  const incomingQty = d === 1 ? getIncomingForItem("Rice", monthlyReportMonth || "April", calcYear, cls) : 0;
                                  const total = prev + incomingQty;

                                  const used = beneficiary > 0 ? beneficiary * ratePerStudent : 0;
                                  const closing = Math.max(0, total - used);
                                  currentStock = closing;

                                  const isHolidayOrSunday = isSunday || (classRec && classRec.isHoliday);

                                  dailyRows.push(
                                    <tr key={d} className={`h-6 text-[9.5px] ${isHolidayOrSunday ? "bg-[#fce8e6]" : "hover:bg-slate-50"}`}>
                                      <td className="border border-black p-0.5 font-bold">{d}</td>
                                      <td className="border border-black p-0.5 font-bold">{dateStrFormatted}</td>
                                      <td className="border border-black p-0.5">{enrolled > 0 ? enrolled : ""}</td>
                                      <td className="border border-black p-0.5 font-mono">{prev.toFixed(4)}</td>
                                      <td className="border border-black p-0.5 font-mono">{incomingQty > 0 ? incomingQty.toFixed(4) : ""}</td>
                                      <td className="border border-black p-0.5 font-mono font-bold">{total.toFixed(4)}</td>
                                      <td className="border border-black p-0.5 font-semibold">{beneficiary > 0 ? beneficiary : ""}</td>
                                      <td className="border border-black p-0.5 font-mono">{used > 0 ? used.toFixed(4) : ""}</td>
                                      <td className="border border-black p-0.5 font-mono font-bold text-emerald-800">{closing.toFixed(4)}</td>
                                      <td className="border border-black p-0.5"></td>
                                    </tr>
                                  );
                                }

                                return (
                                  <div key={cls} className="print-page border border-slate-400 p-6 bg-white text-black font-sans text-xs relative w-full mx-auto shadow-md flex flex-col justify-between print:w-full print:h-auto print:border-none print:shadow-none print:p-0 mb-6">
                                    <div>
                                      {/* Top Header */}
                                      <div className="text-center space-y-1 mb-3">
                                        <h1 className="text-base md:text-lg font-black text-[#047857] tracking-wide">
                                          प्रधानमंत्री पोषण शक्ती निर्माण योजना
                                        </h1>
                                        <h2 className="text-xs md:text-sm font-extrabold text-slate-800">
                                          दैनंदिन तांदूळ खर्च नोंदवही (भाग १)
                                        </h2>
                                      </div>

                                      {/* Info Grid */}
                                      <table className="w-full border-collapse border border-black text-[9.5px] font-bold mb-2">
                                        <tbody>
                                          <tr className="border-b border-black">
                                            <td className="border-r border-black p-1">
                                              शाळेचे नाव : <span className="font-extrabold">{reportSchoolName || profile?.schoolName || ""}</span>
                                            </td>
                                            <td className="border-r border-black p-1">
                                              शाळा गट : <span className="font-extrabold">{marathiClsLabel}</span>
                                            </td>
                                            <td className="border-r border-black p-1">
                                              केंद्र : <span className="font-extrabold">{profile?.center || profile?.kendra || ""}</span>
                                            </td>
                                            <td className="border-r border-black p-1">
                                              बीओ : <span className="font-extrabold">{profile?.bo || ""}</span>
                                            </td>
                                            <td className="border-r border-black p-1">
                                              ता : <span className="font-extrabold">{profile?.taluka || ""}</span>
                                            </td>
                                            <td className="p-2.5">
                                              जिल्हा : <span className="font-extrabold">{profile?.district || ""}</span>
                                            </td>
                                          </tr>
                                          <tr className="border-b border-black">
                                            <td className="border-r border-black p-1" colSpan={2}>
                                              माहे : <span className="font-extrabold">{marathiMonthName}/{reportYear} सन {annualReportYear || "2026/27"}</span>
                                            </td>
                                            <td className="border-r border-black p-1" colSpan={2}>
                                              पटसंख्या ({isPrimary ? "१ ते ५" : "६ ते ८"}) : <span className="font-extrabold">{enrolledCount}</span>
                                            </td>
                                            <td className="p-1" colSpan={2}>
                                              एकूण लाभार्थी संख्या : <span className="font-extrabold">{beneficiarySum}</span>
                                            </td>
                                          </tr>
                                          <tr>
                                            <td className="border-r border-black p-1" colSpan={2}>
                                              एकूण कामाचे दिवस : <span className="font-extrabold">{cookedDays}</span>
                                            </td>
                                            <td className="border-r border-black p-1" colSpan={2}>
                                              निव्वळ शिजवलेले दिवस : <span className="font-extrabold">{cookedDays}</span>
                                            </td>
                                            <td className="p-1" colSpan={2}>
                                              तांदूळ प्राप्त दिनांक : <span className="font-extrabold"></span>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>

                                      {/* Sub-header */}
                                      <p className="text-[9.5px] font-bold text-slate-700 mb-1.5 pl-0.5">
                                        ० ते ३१ दिवसांची नोंद व वहीतक्ताडी
                                      </p>

                                      {/* Main Table */}
                                      <div className="w-full overflow-x-auto">
                                        <table className="w-full border-collapse border border-black text-center text-[9.5px] font-sans">
                                          <thead>
                                            <tr className="bg-slate-100 font-extrabold text-slate-900 border-b border-black">
                                              <th className="border border-black p-1 min-w-[30px]">अ.न.</th>
                                              <th className="border border-black p-1 min-w-[85px]">दिनांक</th>
                                              <th className="border border-black p-1 min-w-[40px]">पट.</th>
                                              <th className="border border-black p-1 min-w-[90px]">मागील शिल्लक (KG)</th>
                                              <th className="border border-black p-1 min-w-[70px]">प्राप्त (KG)</th>
                                              <th className="border border-black p-1 min-w-[100px]">एकूण तांदूळ (4+5) (KG)</th>
                                              <th className="border border-black p-1 min-w-[60px]">लाभार्थी</th>
                                              <th className="border border-black p-1 min-w-[90px]">खर्च तांदूळ (KG)</th>
                                              <th className="border border-black p-1 min-w-[100px]">शिल्लक तांदूळ (6-8) (KG)</th>
                                              <th className="border border-black p-1 min-w-[60px]">सही</th>
                                            </tr>
                                            <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-700 text-xs">
                                              <th className="border border-black py-0.5">1</th>
                                              <th className="border border-black py-0.5">2</th>
                                              <th className="border border-black py-0.5">3</th>
                                              <th className="border border-black py-0.5">4</th>
                                              <th className="border border-black py-0.5">5</th>
                                              <th className="border border-black py-0.5">6</th>
                                              <th className="border border-black py-0.5">7</th>
                                              <th className="border border-black py-0.5">8</th>
                                              <th className="border border-black py-0.5">9</th>
                                              <th className="border border-black py-0.5">10</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {dailyRows}
                                          </tbody>
                                        </table>
                                      </div>

                                      {/* Footer Signatures */}
                                      <div className="flex justify-between items-center border-t border-slate-300 pt-4 mt-6 text-sm text-slate-700 font-bold">
                                        <p className="text-slate-500 font-normal">
                                          https://learnify-academy.in/modules/mdm/teacher/dashboard.php
                                        </p>
                                        <p className="font-extrabold text-slate-800">Date : ____________</p>
                                        <p className="font-extrabold text-slate-900">मुख्याध्यापक</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              };

                              const renderDhanyadiBhag2Page = (cls: "1 To 5" | "6 To 8") => {
                                const isPrimary = cls === "1 To 5";
                                const monthIdx = englishMonths.indexOf(monthlyReportMonth || "April");
                                const daysInMonth = new Date(calcYear, monthIdx + 1, 0).getDate();
                                const marathiClsLabel = isPrimary ? "प्राथमिक ( इयत्ता १ ते ५ )" : "उच्च प्राथमिक ( इयत्ता ६ ते ८ )";
                                const enrolledCount = isPrimary ? (profile?.patPrimary || "0") : (profile?.patUpper || "0");

                                const riceData = getStockDataForItem("Rice", monthlyReportMonth || "April", calcYear, cls);
                                const cookedDays = riceData?.cookedDays || 0;
                                const beneficiarySum = riceData?.beneficiary || 0;

                                const partsConfig = [
                                  {
                                    partTitle: "भाग १/५ — मुग डाळ, तूर डाळ, मसूर डाळ",
                                    items: [
                                      { nameMr: "मुग डाळ", key: "Mugdal", rate: isPrimary ? 0.020 : 0.030 },
                                      { nameMr: "तूर डाळ", key: "Turdal", rate: isPrimary ? 0.020 : 0.030 },
                                      { nameMr: "मसूर डाळ", key: "Masurdal", rate: isPrimary ? 0.020 : 0.030 },
                                    ],
                                  },
                                  {
                                    partTitle: "भाग २/५ — मटकी, अख्खा मूग, चवळी",
                                    items: [
                                      { nameMr: "मटकी", key: "Matki", rate: isPrimary ? 0.020 : 0.030 },
                                      { nameMr: "अख्खा मूग", key: "Moong", rate: isPrimary ? 0.020 : 0.030 },
                                      { nameMr: "चवळी", key: "Cowpea", rate: isPrimary ? 0.020 : 0.030 },
                                    ],
                                  },
                                  {
                                    partTitle: "भाग ३/५ — हरभरा, वाटणा, सोयाबीन",
                                    items: [
                                      { nameMr: "हरभरा", key: "Gram", rate: isPrimary ? 0.020 : 0.030 },
                                      { nameMr: "वाटणा", key: "Pease", rate: isPrimary ? 0.020 : 0.030 },
                                      { nameMr: "सोयाबीन", key: "Soyabean Wadi", rate: isPrimary ? 0.020 : 0.030 },
                                    ],
                                  },
                                  {
                                    partTitle: "भाग ४/५ — जिरे, मोहरी, हळद",
                                    items: [
                                      { nameMr: "जिरे", key: "Cumin", rate: isPrimary ? 0.0002 : 0.0003 },
                                      { nameMr: "मोहरी", key: "Mustard", rate: isPrimary ? 0.0004 : 0.0006 },
                                      { nameMr: "हळद", key: "Turmeric", rate: isPrimary ? 0.0004 : 0.0006 },
                                    ],
                                  },
                                  {
                                    partTitle: "भाग ५/५ — मसाला, तेल, मीठ",
                                    items: [
                                      { nameMr: "मसाला", key: "Onion Garlic Masala", rate: isPrimary ? 0.0004 : 0.0007 },
                                      { nameMr: "तेल", key: "Oil", rate: isPrimary ? 0.0054 : 0.0075 },
                                      { nameMr: "मीठ", key: "Salt", rate: isPrimary ? 0.0034 : 0.0050 },
                                    ],
                                  },
                                ];

                                return (
                                  <div key={cls} className="print-page border border-slate-400 p-6 bg-white text-black font-sans text-xs relative w-full mx-auto shadow-md flex flex-col justify-between print:w-full print:h-auto print:border-none print:shadow-none print:p-0 mb-6">
                                    <div>
                                      {/* Top Header */}
                                      <div className="text-center space-y-1 mb-3">
                                        <h1 className="text-base md:text-lg font-black text-[#047857] tracking-wide">
                                          प्रधानमंत्री पोषण शक्ती निर्माण योजना
                                        </h1>
                                        <h2 className="text-xs md:text-sm font-extrabold text-slate-800">
                                          दैनंदिन धान्यादी माल खर्च नोंदवही (भाग २)
                                        </h2>
                                      </div>

                                      {/* Info Grid */}
                                      <table className="w-full border-collapse border border-black text-[9.5px] font-bold mb-3">
                                        <tbody>
                                          <tr className="border-b border-black">
                                            <td className="border-r border-black p-1">
                                              शाळेचे नाव : <span className="font-extrabold">{reportSchoolName || profile?.schoolName || ""}</span>
                                            </td>
                                            <td className="border-r border-black p-1">
                                              शाळा गट : <span className="font-extrabold">{marathiClsLabel}</span>
                                            </td>
                                            <td className="border-r border-black p-1">
                                              केंद्र : <span className="font-extrabold">{profile?.center || profile?.kendra || ""}</span>
                                            </td>
                                            <td className="border-r border-black p-1">
                                              बीओ : <span className="font-extrabold">{profile?.bo || ""}</span>
                                            </td>
                                            <td className="border-r border-black p-1">
                                              ता : <span className="font-extrabold">{profile?.taluka || ""}</span>
                                            </td>
                                            <td className="p-2.5">
                                              जिल्हा : <span className="font-extrabold">{profile?.district || ""}</span>
                                            </td>
                                          </tr>
                                          <tr className="border-b border-black">
                                            <td className="border-r border-black p-1" colSpan={2}>
                                              माहे : <span className="font-extrabold">{marathiMonthName}/{reportYear} सन {annualReportYear || "2026/27"}</span>
                                            </td>
                                            <td className="border-r border-black p-1" colSpan={2}>
                                              पटसंख्या ({isPrimary ? "१ ते ५" : "६ ते ८"}) : <span className="font-extrabold">{enrolledCount}</span>
                                            </td>
                                            <td className="p-1" colSpan={2}>
                                              एकूण लाभार्थी संख्या : <span className="font-extrabold">{beneficiarySum}</span>
                                            </td>
                                          </tr>
                                          <tr>
                                            <td className="border-r border-black p-1" colSpan={2}>
                                              एकूण कामाचे दिवस : <span className="font-extrabold">{cookedDays}</span>
                                            </td>
                                            <td className="border-r border-black p-1" colSpan={2}>
                                              निव्वळ शिजवलेले दिवस : <span className="font-extrabold">{cookedDays}</span>
                                            </td>
                                            <td className="p-1" colSpan={2}>
                                              धान्यादी प्राप्त दिनांक : <span className="font-extrabold"></span>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>

                                      {/* Sub-header */}
                                      <p className="text-[9.5px] font-bold text-slate-700 mb-2 pl-0.5">
                                        ० ते ३१ दिवसांची नोंद व वहीतक्ताडी
                                      </p>

                                      {/* 5 Parts */}
                                      <div className="space-y-6">
                                        {partsConfig.map((part, partIdx) => {
                                          const itemStocks: Record<string, number> = {};
                                          const itemTotals: Record<string, { prevSum: number; recSum: number; totalSum: number; usedSum: number; closing: number }> = {};
                                          
                                          part.items.forEach((it) => {
                                            const open = getOpeningStock(monthlyReportMonth || "April", calcYear.toString(), cls, it.key);
                                            itemStocks[it.key] = open;
                                            itemTotals[it.key] = { prevSum: 0, recSum: 0, totalSum: 0, usedSum: 0, closing: open };
                                          });

                                          return (
                                            <div key={partIdx} className="mb-6">
                                              <div className="border-l-4 border-blue-600 bg-[#f1f5f9] p-1.5 px-3 rounded-r-md mb-2 font-bold text-xs text-slate-900 tracking-wide flex items-center justify-between">
                                      <span>{part.partTitle}</span>
                                      <span className="text-[10px] text-slate-500 font-normal">MDM Utilization Register</span>
                                    </div>
                                              <div className="w-full overflow-x-auto">
                                                <table className="w-full border-collapse border border-black text-center text-[9.5px] font-sans">
                                                  <thead>
                                                    <tr className="bg-slate-100 font-extrabold text-slate-900 border-b border-black">
                                                      <th className="border border-black p-1 min-w-[30px]" rowSpan={2}>अ.न.</th>
                                                      <th className="border border-black p-1 min-w-[80px]" rowSpan={2}>दिनांक</th>
                                                      <th className="border border-black p-1 min-w-[35px]" rowSpan={2}>पट.</th>
                                                      <th className="border border-black p-1 min-w-[50px]" rowSpan={2}>लाभार्थी</th>
                                                      {part.items.map((item, i) => (
                                                        <th key={i} className="border border-black p-1 text-center font-bold bg-slate-100" colSpan={5}>
                                                          {item.nameMr}
                                                        </th>
                                                      ))}
                                                    </tr>
                                                    <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-700 text-xs">
                                                      {part.items.map((_, i) => (
                                                        <React.Fragment key={i}>
                                                          <th className="border border-black p-0.5 min-w-[45px]">मागील शिल्लक</th>
                                                          <th className="border border-black p-0.5 min-w-[45px]">प्राप्त (KG)</th>
                                                          <th className="border border-black p-0.5 min-w-[45px]">एकूण (KG)</th>
                                                          <th className="border border-black p-0.5 min-w-[45px]">खर्च (KG)</th>
                                                          <th className="border border-black p-0.5 min-w-[45px]">शिल्लक (KG)</th>
                                                        </React.Fragment>
                                                      ))}
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {(() => {
                                                      const rows = [];
                                                      for (let d = 1; d <= daysInMonth; d++) {
                                                        const dayStr = d < 10 ? `0${d}` : `${d}`;
                                                        const mStr = monthIdx + 1 < 10 ? `0${monthIdx + 1}` : `${monthIdx + 1}`;
                                                        const dateStrFormatted = `${dayStr}/${mStr}/${calcYear}`;
                                                        const dateRecordKey = `${calcYear}-${mStr}-${dayStr}`;

                                                        const dateObj = new Date(calcYear, monthIdx, d);
                                                        const isSunday = dateObj.getDay() === 0;

                                                        const rec = registerRecords?.[dateRecordKey];
                                                        const classRec = rec?.[cls] || (cls === "1 To 5" ? rec : null);

                                                        const beneficiary = classRec?.beneficiary ? Number(classRec.beneficiary) : 0;
                                                        const enrolled = classRec?.enrolled ? Number(classRec.enrolled) : (beneficiary > 0 ? (parseInt(enrolledCount || "0", 10) || 0) : 0);

                                                        const isHolidayOrSunday = isSunday || (classRec && classRec.isHoliday);

                                                        rows.push(
                                                          <tr key={d} className={`h-6 text-xs ${isHolidayOrSunday ? "bg-[#fce8e6]" : "hover:bg-slate-50"}`}>
                                                            <td className="border border-black p-0.5 font-bold">{d}</td>
                                                            <td className="border border-black p-0.5 font-bold">{dateStrFormatted}</td>
                                                            <td className="border border-black p-0.5">{enrolled > 0 ? enrolled : ""}</td>
                                                            <td className="border border-black p-0.5 font-semibold">{beneficiary > 0 ? beneficiary : ""}</td>
                                                            {part.items.map((it) => {
                                                              const prev = itemStocks[it.key];
                                                              const recQty = d === 1 ? getIncomingForItem(it.key, monthlyReportMonth || "April", calcYear, cls) : 0;
                                                              const total = prev + recQty;
                                                              const isItemSelected = classRec?.selectedItems ? !!classRec.selectedItems[it.key] : false;
                                                              const used = (beneficiary > 0 && isItemSelected) ? beneficiary * it.rate : 0;
                                                              const closing = Math.max(0, total - used);
                                                              itemStocks[it.key] = closing;

                                                              itemTotals[it.key].prevSum += prev;
                                                              itemTotals[it.key].recSum += recQty;
                                                              itemTotals[it.key].totalSum += total;
                                                              itemTotals[it.key].usedSum += used;
                                                              itemTotals[it.key].closing = closing;

                                                              return (
                                                                <React.Fragment key={it.key}>
                                                                  <td className="border border-black p-0.5 font-mono">{prev.toFixed(4)}</td>
                                                                  <td className="border border-black p-0.5 font-mono">{recQty > 0 ? recQty.toFixed(4) : ""}</td>
                                                                  <td className="border border-black p-0.5 font-mono font-bold">{total.toFixed(4)}</td>
                                                                  <td className="border border-black p-0.5 font-mono">{used > 0 ? used.toFixed(4) : ""}</td>
                                                                  <td className="border border-black p-0.5 font-mono font-bold text-emerald-800">{closing.toFixed(4)}</td>
                                                                </React.Fragment>
                                                              );
                                                            })}
                                                          </tr>
                                                        );
                                                      }

                                                      return (
                                                        <>
                                                          {rows}
                                                          <tr className="h-8 bg-[#fbf9e6] font-black text-slate-900 border-t-2 border-black text-xs">
                                                            <td className="border border-black p-0.5 font-bold text-center" colSpan={4}>एकूण</td>
                                                            {part.items.map((it) => {
                                                              const tot = itemTotals[it.key];
                                                              return (
                                                                <React.Fragment key={it.key}>
                                                                  <td className="border border-black p-0.5 font-mono font-bold">{tot.prevSum.toFixed(4)}</td>
                                                                  <td className="border border-black p-0.5 font-mono font-bold">{tot.recSum.toFixed(4)}</td>
                                                                  <td className="border border-black p-0.5 font-mono font-bold">{tot.totalSum.toFixed(4)}</td>
                                                                  <td className="border border-black p-0.5 font-mono font-bold">{tot.usedSum.toFixed(4)}</td>
                                                                  <td className="border border-black p-0.5 font-mono font-bold text-emerald-800">{tot.closing.toFixed(4)}</td>
                                                                </React.Fragment>
                                                              );
                                                            })}
                                                          </tr>
                                                        </>
                                                      );
                                                    })()}
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>

                                      {/* Footer Signatures */}
                                      <div className="flex justify-between items-center border-t border-slate-300 pt-4 mt-6 text-sm text-slate-700 font-bold">
                                        <p className="text-slate-500 font-normal">
                                          https://learnify-academy.in/modules/mdm/teacher/dashboard.php
                                        </p>
                                        <p className="font-extrabold text-slate-800">Date : ____________</p>
                                        <p className="font-extrabold text-slate-900">मुख्याध्यापक</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              };

                              return (
                                <>
                                  {/* View 1: Daily Rice Register (भाग १) */}
                                  {(selectedReportCategory === "tandul_bhag1" || !selectedReportCategory) && (
                                    <>
                                      {(monthlySubTab === "1-5" || monthlySubTab === "1-8") && renderTandulBhag1Page("1 To 5")}
                                      {(monthlySubTab === "6-8" || monthlySubTab === "1-8") && (
                                        <>
                                          {renderTandulBhag1Page("6 To 8")}
                                        </>
                                      )}
                                    </>
                                  )}

                                  {/* View 2: Daily Grain Register (भाग २) */}
                                  {selectedReportCategory === "dhanyadi_bhag2" && (
                                    <>
                                      {(monthlySubTab === "1-5" || monthlySubTab === "1-8") && renderDhanyadiBhag2Page("1 To 5")}
                                      {(monthlySubTab === "6-8" || monthlySubTab === "1-8") && (
                                        <>
                                          {renderDhanyadiBhag2Page("6 To 8")}
                                        </>
                                      )}
                                    </>
                                  )}

                                  {/* View 2: Monthly B-Form / Reconciliation */}
                                  {selectedReportCategory === "masik_goshwara" && (
                                    <>
                                      <MDMCertificate
                                        subTab={monthlySubTab}
                                        reportYear={reportYear}
                                        marathiMonthName={marathiMonthName}
                                        reportSchoolName={reportSchoolName}
                                        principalName={reportPrincipalName || ""}
                                        teacherName={reportTeacherName || ""}
                                        primaryCookedDays={primaryCookedDays}
                                        upperCookedDays={upperCookedDays}
                                        wednesdaysCount={wednesdaysCount}
                                        certSupplementaryFood={certSupplementaryFood}
                                         certMonthName={certMonthName}
                                        certPatPrimary={certPatPrimary}
                                        certPatUpper={certPatUpper}
                                        certBeneficiaryPrimary={certBeneficiaryPrimary}
                                        certBeneficiaryUpper={certBeneficiaryUpper}
                                        certPrimaryCookedDays={certPrimaryCookedDays}
                                        certUpperCookedDays={certUpperCookedDays}
                                        certWednesdaysCount={certWednesdaysCount}
                                        primaryEnrolled={parseInt(profile?.patPrimary || "0") || 0}
                                        upperEnrolled={parseInt(profile?.patUpper || "0") || 0}
                                        primaryBeneficiarySum={primaryBeneficiarySum}
                                        upperBeneficiarySum={upperBeneficiarySum}
                                        helperCount={helperCount}
                                        helperCenterPay={helperCenterPay}
                                        helperStatePay={helperStatePay}
                                        helperTotalPay={helperTotalPay}
                                        primaryCenterGrant={primaryCenterGrant}
                                        primaryStateGrant={primaryStateGrant}
                                        upperCenterGrant={upperCenterGrant}
                                        upperStateGrant={upperStateGrant}
                                        totalGrantAll={totalGrantAll}
                                      />

                                  {/* 1 to 5 Reconciliation Report View */}
                                  {(monthlySubTab === "1-5" || monthlySubTab === "1-8") && (
                                    <>
                                      {renderBFormPage("1 To 5")}
                                    </>
                                  )}

                                  {/* 6 to 8 Reconciliation Report View */}
                                  {(monthlySubTab === "6-8" || monthlySubTab === "1-8") && (
                                    <>
                                      {renderBFormPage("6 To 8")}
                                    </>
                                  )}
                                    </>
                                  )}
                                </>
                              );
                            })()}
                          </div>

                          <style>{`
                              .print-page {
                                background: white;
                                border: 1px solid #cbd5e1;
                                border-radius: 4px;
                                padding: 24px;
                                margin-bottom: 24px;
                                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                                max-width: 100%;
                              }
                              @media print {
                                @page { 
                                  size: A4 landscape; 
                                  margin: 5mm; 
                                }
                                body * { 
                                  visibility: hidden; 
                                }
                                #monthly-report-print, #monthly-report-print * { 
                                  visibility: visible; 
                                }
                                #monthly-report-print { 
                                  position: absolute; 
                                  left: 0; 
                                  top: 0; 
                                  width: 100%; 
                                  margin: 0; 
                                  padding: 0; 
                                  background: white;
                                  box-shadow: none !important;
                                  border: none !important;
                                }
                                .print-page { 
                                  page-break-after: always; 
                                  break-after: page; 
                                  margin: 0 !important; 
                                  padding: 10px !important; 
                                  border: none !important; 
                                  box-shadow: none !important; 
                                  width: 100% !important; 
                                  height: 100% !important; 
                                }
                                .print-page:last-child {
                                  page-break-after: avoid;
                                  break-after: avoid;
                                }
                              }
                            `}</style>

                          <div className="flex justify-end gap-4 pt-4 print:hidden">
                            <button
                              disabled={isExporting}
                              onClick={handleDownloadPdf}
                              className="px-6 py-2 bg-[#004C99] hover:bg-[#003B75] disabled:bg-slate-400 text-white rounded font-bold text-sm flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                            >
                              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                              {t("PDF डाउनलोड करा", "Download PDF", "पीडीएफ डाउनलोड करें")}
                            </button>
                          </div>
                        </div>
                    </div>
                  </div>
                )}

                {/* Annual Report Tab - Learnify reports-mdm.php?=year Exact UI */}
                {activeTab === "annual-report" && (
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                          <span>{lang === "mr" ? "वार्षिक एमडीएम अहवाल (Yearly MDM Report)" : "Yearly MDM Report"}</span>
                        </h2>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          {lang === "mr"
                            ? "शालेय पोषण आहार योजनेसाठी वर्षातील १२ महिन्यांची उपयोगिता अहवाल पत्रक पहा आणि डाऊनलोड करा."
                            : "View and download 12-month annual MDM utilization report."}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 print:hidden">
                        <button
                          onClick={() => setIsAnnualReportGenerated(false)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-colors"
                        >
                          {lang === "mr" ? "वर्ष बदला (Change Year)" : "Change Year"}
                        </button>
                      </div>
                    </div>

                    {!isAnnualReportGenerated ? (
                      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6 max-w-xl mx-auto text-center">
                        <h3 className="text-base font-extrabold text-slate-800">
                          {lang === "mr" ? "शैक्षणिक वर्ष निवडा (Select Year)" : "Select Academic Year"}
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          {["2023-24", "2024-25", "2025-26", "2026-27"].map((y) => (
                            <button
                              key={y}
                              onClick={() => {
                                setAnnualReportYear(y);
                                setIsAnnualReportGenerated(false);
                              }}
                              className={`py-3 px-4 rounded-xl border-2 font-bold text-xs transition-all ${
                                annualReportYear === y
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-md scale-[1.02]"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300"
                              }`}
                            >
                              {y}
                            </button>
                          ))}
                        </div>

                        <div className="pt-4">
                          <button
                            disabled={!annualReportYear || isAnnualReportGenerating}
                            onClick={() => {
                              setIsAnnualReportGenerating(true);
                              setTimeout(() => {
                                setIsAnnualReportGenerating(false);
                                setIsAnnualReportGenerated(true);
                              }, 1200);
                            }}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-extrabold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            {isAnnualReportGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
                            <span>{lang === "mr" ? "वार्षिक अहवाल तयार करा (Generate Report)" : "Generate Yearly Report"}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Learnify Toolbar & Instructions */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4 print:hidden">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 block">Yearly report</label>
                                <select
                                  value={annualReportType}
                                  onChange={(e) => setAnnualReportType(e.target.value)}
                                  className="h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none min-w-[220px]"
                                >
                                  <option value="तांदूळ उपयोगिता (किलोग्रॅम मध्ये)">तांदूळ उपयोगिता (किलोग्रॅम मध्ये)</option>
                                  <option value="धान्याची उपयोगिता (किलोग्रॅम मध्ये)">धान्याची उपयोगिता (किलोग्रॅम मध्ये)</option>
                                </select>
                              </div>

                              <div className="flex items-center gap-2.5 pt-4">
                                <button
                                  onClick={handleAnnualReportDownload}
                                  disabled={isExporting}
                                  className="px-4 py-2.5 bg-[#047857] hover:bg-[#065f46] disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                                >
                                  <FileSpreadsheet className="w-4 h-4" />
                                  <span>{isExporting ? "Exporting..." : "Download Excel"}</span>
                                </button>
                                <button
                                  onClick={handleDownloadAnnualPdf}
                                  disabled={isExporting}
                                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                                >
                                  <FileText className="w-4 h-4" />
                                  <span>{isExporting ? "Downloading..." : "Download PDF"}</span>
                                </button>
                              </div>
                            </div>
                            {/* Class Group Sub-tabs (Removed as requested) */}
                          </div>

                          <p className="text-xs text-slate-500 font-medium border-t border-slate-100 pt-3">
                            Download Excel वर क्लिक करून Excel फाईल डाउनलोड करा, किंवा Download PDF वर क्लिक करून फाईल डाऊनलोड करा.
                          </p>
                        </div>

                        {/* Printable Learnify Yearly MDM Report Card */}
                        <div
                          id="annual-report-print"
                          className="border border-slate-300 bg-white p-6 rounded-2xl shadow-xs font-sans text-xs space-y-4 overflow-visible print:border-none print:shadow-none print:p-0"
                        >
                          {/* Header Block */}
                          {!annualReportType.includes("धान्याची") && (
                          <div className="border border-slate-300 rounded-xl p-4 bg-white text-center space-y-0">
                            <div className="flex justify-between items-center px-4">
                              <div className="w-16 h-16 flex items-center justify-center">
                                <Utensils className="w-12 h-12 text-amber-600" />
                              </div>

                              <div className="text-center space-y-1">
                                <p className="text-xs font-extrabold text-emerald-800 tracking-wide">
                                  प्रधानमंत्री पोषण शक्ती निर्माण योजना सन {annualReportYear || "2026-27"}
                                </p>
                                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                                  वार्षिक उपयोगिता प्रमाणपत्र
                                </h1>
                                <h2 className="text-lg font-black text-slate-800 uppercase">
                                  {profile?.schoolName || ""}
                                </h2>
                                <p className="text-xs font-bold text-slate-600">
                                  {annualReportType} — सन {annualReportYear || "2026-27"} · {annualSubTab === "1-5" ? "प्राथमिक ( इयत्ता १ ते ५ )" : annualSubTab === "6-8" ? "उच्च प्राथमिक ( इयत्ता ६ ते ८ )" : "इयत्ता १ ते ८ (एकत्रित)"}
                                </p>
                              </div>

                              <div className="w-16"></div>
                            </div>

                            {/* School Details Metadata Bar */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 border-t border-slate-200 pt-3 mt-3 text-left text-sm">
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                                <span className="text-sm text-slate-500 font-bold block">UDISE कोड</span>
                                <span className="font-extrabold text-slate-900">{getUdise() || ""}</span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                                <span className="text-sm text-slate-500 font-bold block">केंद्र</span>
                                <span className="font-extrabold text-slate-900">{profile?.center || ""}</span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                                <span className="text-sm text-slate-500 font-bold block">तालुका</span>
                                <span className="font-extrabold text-slate-900">{profile?.taluka || ""}</span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                                <span className="text-sm text-slate-500 font-bold block">जिल्हा</span>
                                <span className="font-extrabold text-slate-900">{profile?.district || ""}</span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                                <span className="text-sm text-slate-500 font-bold block">पिन कोड</span>
                                <span className="font-extrabold text-slate-900">{profile?.pincode || ""}</span>
                              </div>
                            </div>
                          </div>
                          )}

                          {/* 12 Months Table */}
                          <div className="w-full overflow-x-auto">
                            {annualReportType.includes("धान्याची") ? (
                              <div className="space-y-0">
                                {[
                                  {
                                    partTitle: "भाग १/५ — मुग डाळ, तूर डाळ, मसूर डाळ",
                                    items: [
                                      { nameMr: "मुग डाळ", key: "Mugdal" },
                                      { nameMr: "तूर डाळ", key: "Turdal" },
                                      { nameMr: "मसूर डाळ", key: "Masurdal" },
                                    ],
                                  },
                                  {
                                    partTitle: "भाग २/५ — मटकी, अख्खा मूग, चवळी",
                                    items: [
                                      { nameMr: "मटकी", key: "Matki" },
                                      { nameMr: "अख्खा मूग", key: "Moong" },
                                      { nameMr: "चवळी", key: "Cowpea" },
                                    ],
                                  },
                                  {
                                    partTitle: "भाग ३/५ — हरभरा, वाटणा, सोयाबीन",
                                    items: [
                                      { nameMr: "हरभरा", key: "Gram" },
                                      { nameMr: "वाटणा", key: "Pease" },
                                      { nameMr: "सोयाबीन", key: "Soyabean Wadi" },
                                    ],
                                  },
                                  {
                                    partTitle: "भाग ४/५ — जिरे, मोहरी, हळद",
                                    items: [
                                      { nameMr: "जिरे", key: "Cumin" },
                                      { nameMr: "मोहरी", key: "Mustard" },
                                      { nameMr: "हळद", key: "Turmeric" },
                                    ],
                                  },
                                  {
                                    partTitle: "भाग ५/५ — मसाला, तेल, मीठ",
                                    items: [
                                      { nameMr: "मसाला", key: "Onion Garlic Masala" },
                                      { nameMr: "तेल", key: "Oil" },
                                      { nameMr: "मीठ", key: "Salt" },
                                    ],
                                  },
                                ].map((part, partIdx) => (
                                  <React.Fragment key={partIdx}>
                                    {partIdx > 0 && <div className="html2pdf__page-break"></div>}
                                    <div
                                      className="annual-page-container bg-white w-full"
                                      style={{
                                        boxSizing: "border-box",
                                        margin: 0,
                                        padding: 0
                                      }}
                                    >
                                    {/* Page 1 Header Card (Matching 9.pdf) */}
                                    {partIdx === 0 && (
                                      <div className="border border-slate-300 rounded-xl p-2 bg-white text-center space-y-1 mb-2">
                                        <div className="flex justify-between items-center px-2">
                                          <div className="w-8 h-8 flex items-center justify-center">
                                            <Utensils className="w-6 h-6 text-amber-600" />
                                          </div>
                                          <div className="text-center space-y-0.5">
                                            <p className="text-[10px] font-extrabold text-emerald-800 tracking-wide">
                                              प्रधानमंत्री पोषण शक्ती निर्माण योजना सन {annualReportYear || "2026-27"}
                                            </p>
                                            <h1 className="text-base font-black text-slate-900 tracking-tight">
                                              वार्षिक उपयोगिता प्रमाणपत्र
                                            </h1>
                                            <h2 className="text-xs font-black text-slate-800 uppercase">
                                              {profile?.schoolName || ""}
                                            </h2>
                                            <p className="text-[10px] font-bold text-slate-600">
                                              {annualReportType} — सन {annualReportYear || "2026-27"} · {annualSubTab === "1-5" ? "प्राथमिक ( इयत्ता १ ते ५ )" : annualSubTab === "6-8" ? "उच्च प्राथमिक ( इयत्ता ६ ते ८ )" : "इयत्ता १ ते ८ (एकत्रित)"}
                                            </p>
                                          </div>
                                          <div className="w-8"></div>
                                        </div>
                                        <div className="grid grid-cols-5 gap-1 border-t border-slate-200 pt-1 mt-1 text-left text-[11px]">
                                          <div className="bg-slate-50 p-1 px-2 rounded border border-slate-200">
                                            <span className="text-[9px] text-slate-500 font-bold block">UDISE कोड</span>
                                            <span className="font-extrabold text-slate-900">{getUdise() || ""}</span>
                                          </div>
                                          <div className="bg-slate-50 p-1 px-2 rounded border border-slate-200">
                                            <span className="text-[9px] text-slate-500 font-bold block">केंद्र</span>
                                            <span className="font-extrabold text-slate-900">{profile?.center || ""}</span>
                                          </div>
                                          <div className="bg-slate-50 p-1 px-2 rounded border border-slate-200">
                                            <span className="text-[9px] text-slate-500 font-bold block">तालुका</span>
                                            <span className="font-extrabold text-slate-900">{profile?.taluka || ""}</span>
                                          </div>
                                          <div className="bg-slate-50 p-1 px-2 rounded border border-slate-200">
                                            <span className="text-[9px] text-slate-500 font-bold block">जिल्हा</span>
                                            <span className="font-extrabold text-slate-900">{profile?.district || ""}</span>
                                          </div>
                                          <div className="bg-slate-50 p-1 px-2 rounded border border-slate-200">
                                            <span className="text-[9px] text-slate-500 font-bold block">पिन कोड</span>
                                            <span className="font-extrabold text-slate-900">{profile?.pincode || ""}</span>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Table */}
                                    <table className="w-full border-collapse border border-black text-center text-xs font-sans table-fixed">
                                      <colgroup>
                                        <col style={{ width: '3%' }} />
                                        <col style={{ width: '7%' }} />
                                        {Array.from({ length: 21 }).map((_, colIdx) => (
                                          <col key={colIdx} style={{ width: '4.28%' }} />
                                        ))}
                                      </colgroup>
                                      <thead>
                                        <tr className="bg-slate-100 text-slate-900 font-extrabold border-b border-black">
                                          <th className="border border-black p-1 bg-slate-100 text-slate-900 font-extrabold align-middle text-center relative z-30" style={{ position: 'relative', zIndex: 30, backgroundColor: '#f1f5f9', color: '#0f172a' }} rowSpan={2}>
                                            <div style={{ position: 'relative', zIndex: 50, color: '#0f172a', fontWeight: 'bold' }}>अ.न.</div>
                                          </th>
                                          <th className="border border-black p-1 bg-slate-100 text-slate-900 font-extrabold align-middle text-center relative z-30" style={{ position: 'relative', zIndex: 30, backgroundColor: '#f1f5f9', color: '#0f172a' }} rowSpan={2}>
                                            <div style={{ position: 'relative', zIndex: 50, color: '#0f172a', fontWeight: 'bold' }}>महिना</div>
                                          </th>
                                          {part.items.map((item, i) => (
                                            <th key={i} className="border border-black p-1 text-center font-bold bg-slate-100" colSpan={7}>
                                              {item.nameMr}
                                            </th>
                                          ))}
                                        </tr>
                                        <tr className="bg-slate-100 text-slate-900 font-extrabold border-b border-black">
                                          {part.items.map((_, i) => (
                                            <React.Fragment key={i}>
                                              <th className="border border-black px-0.5 py-1 text-[8.5px] font-bold leading-tight align-middle text-center break-normal whitespace-normal tracking-tight">मागील<br/>शिल्लक</th>
                                              <th className="border border-black px-0.5 py-1 text-[8.5px] font-bold leading-tight align-middle text-center break-normal whitespace-normal tracking-tight">पुरवठा<br/>धारकाकडून<br/>प्राप्त</th>
                                              <th className="border border-black px-0.5 py-1 text-[8.5px] font-bold leading-tight align-middle text-center break-normal whitespace-normal tracking-tight">लोक<br/>सहभागातून<br/>प्राप्त</th>
                                              <th className="border border-black px-0.5 py-1 text-[8.5px] font-bold leading-tight align-middle text-center break-normal whitespace-normal tracking-tight">एकूण<br/>प्राप्त</th>
                                              <th className="border border-black px-0.5 py-1 text-[8.5px] font-bold leading-tight align-middle text-center break-normal whitespace-normal tracking-tight">शिजवण्यात<br/>आलेला<br/>माल</th>
                                              <th className="border border-black px-0.5 py-1 text-[8.5px] font-bold leading-tight align-middle text-center break-normal whitespace-normal tracking-tight">खराब<br/>झालेने<br/>निर्लेखित<br/>केलेला<br/>माल</th>
                                              <th className="border border-black px-0.5 py-1 text-[8.5px] font-bold leading-tight align-middle text-center break-normal whitespace-normal tracking-tight">महिना<br/>अखेरीस<br/>शिल्लक<br/>माल</th>
                                            </React.Fragment>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(() => {
                                          const acadMonths = getAcademicYearMonths(annualReportYear || "2026-27");
                                          const totalsMap: Record<string, { prev: number; recSupp: number; recPub: number; totalRec: number; used: number; damaged: number; closing: number }> = {};
                                          part.items.forEach((it) => {
                                            totalsMap[it.key] = { prev: 0, recSupp: 0, recPub: 0, totalRec: 0, used: 0, damaged: 0, closing: 0 };
                                          });

                                          const monthMrNames: Record<string, string> = {
                                            April: "एप्रिल", May: "मे", June: "जून", July: "जुलै", August: "ऑगस्ट",
                                            September: "सप्टेंबर", October: "ऑक्टोबर", November: "नोव्हेंबर",
                                            December: "डिसेंबर", January: "जानेवारी", February: "फेब्रुवारी", March: "मार्च"
                                          };

                                          const rows = acadMonths.map((m, idx) => (
                                            <tr key={idx} className="h-7 hover:bg-slate-50 transition-colors">
                                              <td className="border border-black p-0.5 font-bold text-center">{idx + 1}</td>
                                              <td className="border border-black p-0.5 font-bold text-left pl-1.5 whitespace-nowrap">
                                                {monthMrNames[m.month] || m.month} {m.year}
                                              </td>
                                              {part.items.map((it) => {
                                                const stockData = getStockDataForItem(it.key, m.month, m.year, annualSubTab === "6-8" ? "6 To 8" : "1 To 5");
                                                const prev = stockData ? stockData.prev : 0;
                                                const recSupp = stockData ? stockData.received : 0;
                                                const recPub = 0;
                                                const totalRec = prev + recSupp + recPub;
                                                const used = stockData ? stockData.used : 0;
                                                const damaged = 0;
                                                const closing = Math.max(0, totalRec - (used + damaged));

                                                totalsMap[it.key].prev += prev;
                                                totalsMap[it.key].recSupp += recSupp;
                                                totalsMap[it.key].recPub += recPub;
                                                totalsMap[it.key].totalRec += totalRec;
                                                totalsMap[it.key].used += used;
                                                totalsMap[it.key].damaged += damaged;
                                                totalsMap[it.key].closing = closing;

                                                return (
                                                  <React.Fragment key={it.key}>
                                                    <td className="border border-black p-0.5 font-sans text-[8.5px] font-medium text-center">{prev.toFixed(4)}</td>
                                                    <td className="border border-black p-0.5 font-sans text-[8.5px] font-medium text-center">{recSupp.toFixed(4)}</td>
                                                    <td className="border border-black p-0.5 font-sans text-[8.5px] font-medium text-center">{recPub.toFixed(4)}</td>
                                                    <td className="border border-black p-0.5 font-sans text-[8.5px] font-medium font-bold text-center">{totalRec.toFixed(4)}</td>
                                                    <td className="border border-black p-0.5 font-sans text-[8.5px] font-medium font-semibold text-center">{used.toFixed(4)}</td>
                                                    <td className="border border-black p-0.5 font-sans text-[8.5px] font-medium text-center">{damaged.toFixed(4)}</td>
                                                    <td className="border border-black p-0.5 font-sans text-[8.5px] font-medium font-bold text-emerald-800 text-center">{closing.toFixed(4)}</td>
                                                  </React.Fragment>
                                                );
                                              })}
                                            </tr>
                                          ));

                                          return (
                                            <>
                                              {rows}
                                              <tr className="h-8 bg-[#fef3c7] font-black text-slate-900 border-t-2 border-black">
                                                <td className="border border-black p-0.5 text-center font-bold" colSpan={2}>एकूण</td>
                                                {part.items.map((it) => {
                                                  const tot = totalsMap[it.key];
                                                  return (
                                                    <React.Fragment key={it.key}>
                                                      <td className="border border-black p-0.5 font-sans text-[8.5px] font-medium font-bold text-center">{tot.prev.toFixed(4)}</td>
                                                      <td className="border border-black p-0.5 font-sans text-[8.5px] font-medium font-bold text-center">{tot.recSupp.toFixed(4)}</td>
                                                      <td className="border border-black p-0.5 font-sans text-[8.5px] font-medium font-bold text-center">{tot.recPub.toFixed(4)}</td>
                                                      <td className="border border-black p-0.5 font-sans text-[8.5px] font-medium font-bold text-center">{tot.totalRec.toFixed(4)}</td>
                                                      <td className="border border-black p-0.5 font-sans text-[8.5px] font-medium font-bold text-center">{tot.used.toFixed(4)}</td>
                                                      <td className="border border-black p-0.5 font-sans text-[8.5px] font-medium font-bold text-center">{tot.damaged.toFixed(4)}</td>
                                                      <td className="border border-black p-0.5 font-sans text-[8.5px] font-medium font-bold text-emerald-800 text-center">{tot.closing.toFixed(4)}</td>
                                                    </React.Fragment>
                                                  );
                                                })}
                                              </tr>
                                            </>
                                          );
                                        })()}
                                      </tbody>
                                    </table>

                                    {/* Footer mimicking browser print */}
                                    <div className="flex justify-between items-end mt-8 text-[11px] text-black font-sans">
                                      <div></div>
                                      <div className="text-right">
                                        {partIdx + 1}/5
                                      </div>
                                    </div>
                                  </div>
                                  </React.Fragment>
                                ))}
                              </div>
                            ) : (
                              <table className="w-full border-collapse border border-black text-center text-sm font-sans style-table-fixed" style={{ tableLayout: "fixed" }}>
                                <colgroup>
                                  <col style={{ width: "2.8%" }} />
                                  <col style={{ width: "7.2%" }} />
                                  <col style={{ width: "3.8%" }} />
                                  <col style={{ width: "3.8%" }} />
                                  <col style={{ width: "4.2%" }} />
                                  <col style={{ width: "3.2%" }} />
                                  <col style={{ width: "5%" }} />
                                  <col style={{ width: "6.5%" }} />
                                  <col style={{ width: "7.5%" }} />
                                  <col style={{ width: "5.5%" }} />
                                  <col style={{ width: "5%" }} />
                                  <col style={{ width: "6.5%" }} />
                                  <col style={{ width: "6.5%" }} />
                                  <col style={{ width: "5.5%" }} />
                                  <col style={{ width: "6.5%" }} />
                                  <col style={{ width: "6.5%" }} />
                                  <col style={{ width: "6%" }} />
                                  <col style={{ width: "8.2%" }} />
                                </colgroup>
                                <thead>
                                  <tr className="bg-slate-100 text-slate-900 font-extrabold border-b border-black">
                                    <th className="border border-black p-0.5 text-[10px] leading-tight bg-slate-100 text-slate-900 font-bold align-middle text-center relative z-30" style={{ position: 'relative', zIndex: 30, backgroundColor: '#f1f5f9', color: '#0f172a' }} rowSpan={2}>
                                      <div style={{ position: 'relative', zIndex: 50, color: '#0f172a', fontWeight: 'bold' }}>अ.क्र.</div>
                                    </th>
                                    <th className="border border-black p-0.5 text-[10px] leading-tight bg-slate-100 text-slate-900 font-bold align-middle text-center relative z-30" style={{ position: 'relative', zIndex: 30, backgroundColor: '#f1f5f9', color: '#0f172a' }} rowSpan={2}>
                                      <div style={{ position: 'relative', zIndex: 50, color: '#0f172a', fontWeight: 'bold' }}>महिना</div>
                                    </th>
                                    <th className="border border-black p-0.5 text-[10px] leading-tight bg-slate-100 text-slate-900 font-bold align-middle text-center relative z-30" style={{ position: 'relative', zIndex: 30, backgroundColor: '#f1f5f9', color: '#0f172a' }} rowSpan={2}>
                                      <div style={{ position: 'relative', zIndex: 50, color: '#0f172a', fontWeight: 'bold' }}>पट संख्या</div>
                                    </th>
                                    <th className="border border-black p-0.5 text-[10px] leading-tight bg-slate-100 text-slate-900 font-bold align-middle text-center relative z-30" style={{ position: 'relative', zIndex: 30, backgroundColor: '#f1f5f9', color: '#0f172a' }} rowSpan={2}>
                                      <div style={{ position: 'relative', zIndex: 50, color: '#0f172a', fontWeight: 'bold' }}>कामाचे दिवस</div>
                                    </th>
                                    <th className="border border-black p-0.5 text-[10px] leading-tight bg-slate-100 text-slate-900 font-bold align-middle text-center relative z-30" style={{ position: 'relative', zIndex: 30, backgroundColor: '#f1f5f9', color: '#0f172a' }} rowSpan={2}>
                                      <div style={{ position: 'relative', zIndex: 50, color: '#0f172a', fontWeight: 'bold' }}>अन्न शिजवलेले दिवस</div>
                                    </th>
                                    <th className="border border-black p-0.5 text-[10px] leading-tight bg-slate-100 text-slate-900 font-bold align-middle text-center relative z-30" style={{ position: 'relative', zIndex: 30, backgroundColor: '#f1f5f9', color: '#0f172a' }} rowSpan={2}>
                                      <div style={{ position: 'relative', zIndex: 50, color: '#0f172a', fontWeight: 'bold' }}>रजा दिवस</div>
                                    </th>
                                    <th className="border border-black p-0.5 text-[10px] leading-tight bg-slate-100 text-slate-900 font-bold align-middle text-center relative z-30" style={{ position: 'relative', zIndex: 30, backgroundColor: '#f1f5f9', color: '#0f172a' }} rowSpan={2}>
                                      <div style={{ position: 'relative', zIndex: 50, color: '#0f172a', fontWeight: 'bold' }}>लाभार्थी संख्या / खाणारी संख्या</div>
                                    </th>
                                    <th className="border border-black p-1 text-[11px] font-bold" colSpan={2}>इतर शिजविणे खर्च</th>
                                    <th className="border border-black p-1 text-[11px] font-bold" colSpan={8}>
                                      तांदूळ
                                    </th>
                                    <th className="border border-black p-0.5 text-[10px] leading-tight bg-slate-100 text-slate-900 font-bold align-middle text-center relative z-30" style={{ position: 'relative', zIndex: 30, backgroundColor: '#f1f5f9', color: '#0f172a' }} rowSpan={2}>
                                      <div style={{ position: 'relative', zIndex: 50, color: '#0f172a', fontWeight: 'bold' }}>मुख्याध्यापक स्वाक्षरी</div>
                                    </th>
                                  </tr>
                                  <tr className="bg-slate-100 text-slate-900 font-extrabold border-b border-black">
                                    {/* इतर शिजविणे खर्च */}
                                    <th className="border border-black p-0.5 text-[9px] leading-tight font-bold">स्वयंपाकी तथा मदतनीस मानधन</th>
                                    <th className="border border-black p-0.5 text-[9px] leading-tight font-bold">इंधन पूरक आहार भाजीपाला अनुदान</th>

                                    {/* तांदूळ */}
                                    <th className="border border-black p-0.5 text-[9px] leading-tight font-bold">माल प्राप्त दिनांक</th>
                                    <th className="border border-black p-0.5 text-[9px] leading-tight font-bold">मागील शिल्लक</th>
                                    <th className="border border-black p-0.5 text-[9px] leading-tight font-bold">पुरवठा धारकाकडून प्राप्त</th>
                                    <th className="border border-black p-0.5 text-[9px] leading-tight font-bold">लोक सहभागातून प्राप्त</th>
                                    <th className="border border-black p-0.5 text-[9px] leading-tight font-bold">एकूण प्राप्त</th>
                                    <th className="border border-black p-0.5 text-[9px] leading-tight font-bold">शिजवण्यात आलेला भात</th>
                                    <th className="border border-black p-0.5 text-[9px] leading-tight font-bold">खराब झालेने विल्हेवाट लावलेला माल</th>
                                    <th className="border border-black p-0.5 text-[9px] leading-tight font-bold">महिना अखेर शिल्लक माल</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(() => {
                                    const acadMonths = getAcademicYearMonths(annualReportYear || "2026-27");

                                    let totalEnrolled = 0;
                                    let totalWorkingDays = 0;
                                    let totalCookedDays = 0;
                                    let totalLeaveDays = 0;
                                    let totalBeneficiaries = 0;
                                    let totalCookHonorarium = 0;
                                    let totalVegGrant = 0;
                                    let totalPrevStock = 0;
                                    let totalSupplierReceived = 0;
                                    let totalPublicReceived = 0;
                                    let totalStockCombined = 0;
                                    let totalUsedStock = 0;
                                    let totalDamagedStock = 0;
                                    let totalClosingStock = 0;

                                    const rows = acadMonths.map((m, idx) => {
                                      const regData = getRegisterDataForMonth(m.month, m.year, annualSubTab === "6-8" ? "6 To 8" : "1 To 5");
                                      const stockData = getStockDataForItem("Rice", m.month, m.year, annualSubTab === "6-8" ? "6 To 8" : "1 To 5");

                                      const enrolled = regData ? regData.enrolled : 0;
                                      const workingDays = regData ? regData.workingDays : 0;
                                      const cookedDays = workingDays > 0 ? workingDays : 0;
                                      const leaveDays = Math.max(0, workingDays - cookedDays);
                                      const beneficiary = regData ? regData.beneficiary : 0;

                                      const cookHonorarium = 0.00;
                                      const vegGrant = (beneficiary * (annualSubTab === "6-8" ? 3.5 : 2.5));

                                      const prevStock = stockData ? stockData.prev : 10;
                                      const receivedSupplier = stockData ? stockData.received : (idx === 3 ? 10 : 0);
                                      const receivedPublic = 0;
                                      const totalReceived = prevStock + receivedSupplier + receivedPublic;
                                      const usedStock = stockData ? stockData.used : (idx === 3 ? 9 : 0);
                                      const damagedStock = idx === 3 ? 1 : 0;
                                      const closingStock = Math.max(0, totalReceived - (usedStock + damagedStock));

                                      // Accumulate totals
                                      totalEnrolled = Math.max(totalEnrolled, enrolled);
                                      totalWorkingDays += workingDays;
                                      totalCookedDays += cookedDays;
                                      totalLeaveDays += leaveDays;
                                      totalBeneficiaries += beneficiary;
                                      totalCookHonorarium += cookHonorarium;
                                      totalVegGrant += vegGrant;
                                      totalPrevStock += prevStock;
                                      totalSupplierReceived += receivedSupplier;
                                      totalPublicReceived += receivedPublic;
                                      totalStockCombined += totalReceived;
                                      totalUsedStock += usedStock;
                                      totalDamagedStock += damagedStock;
                                      totalClosingStock = closingStock;

                                      const monthMrNames: Record<string, string> = {
                                        April: "एप्रिल", May: "मे", June: "जून", July: "जुलै", August: "ऑगस्ट",
                                        September: "सप्टेंबर", October: "ऑक्टोबर", November: "नोव्हेंबर",
                                        December: "डिसेंबर", January: "जानेवारी", February: "फेब्रुवारी", March: "मार्च"
                                      };

                                      return (
                                        <tr key={idx} className="h-8 hover:bg-slate-50 transition-colors">
                                          <td className="border border-black p-1 font-bold">{idx + 1}</td>
                                          <td className="border border-black p-1 font-bold text-left pl-2">
                                            {monthMrNames[m.month] || m.month} {m.year}
                                          </td>
                                          <td className="border border-black p-1">{enrolled}</td>
                                          <td className="border border-black p-1">{workingDays}</td>
                                          <td className="border border-black p-1">{cookedDays}</td>
                                          <td className="border border-black p-1">{leaveDays}</td>
                                          <td className="border border-black p-1 font-semibold">{beneficiary}</td>
                                          <td className="border border-black p-1">{cookHonorarium.toFixed(2)}</td>
                                          <td className="border border-black p-1 font-semibold">{vegGrant.toFixed(2)}</td>
                                          <td className="border border-black p-1 text-xs">{receivedSupplier > 0 ? "10/07/2026" : "—"}</td>
                                          <td className="border border-black p-1 font-bold">{prevStock}</td>
                                          <td className="border border-black p-1">{receivedSupplier}</td>
                                          <td className="border border-black p-1">{receivedPublic}</td>
                                          <td className="border border-black p-1 font-bold">{totalReceived}</td>
                                          <td className="border border-black p-1 font-semibold">{usedStock}</td>
                                          <td className="border border-black p-1">{damagedStock}</td>
                                          <td className="border border-black p-1 font-bold text-emerald-700">{closingStock}</td>
                                          <td className="border border-black p-1"></td>
                                        </tr>
                                      );
                                    });

                                    return (
                                      <>
                                        {rows}
                                        {/* Total Row */}
                                        <tr className="h-8 bg-[#fef3c7] font-black text-slate-900 border-t-2 border-black">
                                          <td className="border border-black p-1 text-center" colSpan={2}>एकूण (Total)</td>
                                          <td className="border border-black p-1">{totalEnrolled}</td>
                                          <td className="border border-black p-1">{totalWorkingDays}</td>
                                          <td className="border border-black p-1">{totalCookedDays}</td>
                                          <td className="border border-black p-1">{totalLeaveDays}</td>
                                          <td className="border border-black p-1 text-purple-900">{totalBeneficiaries}</td>
                                          <td className="border border-black p-1">{totalCookHonorarium.toFixed(2)}</td>
                                          <td className="border border-black p-1 text-emerald-900">{totalVegGrant.toFixed(2)}</td>
                                          <td className="border border-black p-1">—</td>
                                          <td className="border border-black p-1">{totalPrevStock}</td>
                                          <td className="border border-black p-1">{totalSupplierReceived}</td>
                                          <td className="border border-black p-1">{totalPublicReceived}</td>
                                          <td className="border border-black p-1">{totalStockCombined}</td>
                                          <td className="border border-black p-1">{totalUsedStock}</td>
                                          <td className="border border-black p-1">{totalDamagedStock}</td>
                                          <td className="border border-black p-1 text-emerald-800">{totalClosingStock}</td>
                                          <td className="border border-black p-1"></td>
                                        </tr>
                                      </>
                                    );
                                  })()}
                                </tbody>
                              </table>
                            )}
                          </div>

                          {/* Footer Signatures */}
                          <div className="flex justify-between items-center border-t border-slate-300 pt-3 mt-3 text-xs text-slate-700 font-bold">
                            <div>
                              <p className="text-slate-500 font-normal">This report is generated by Smart Learning With AI MDM Portal</p>
                            </div>
                            <div className="text-center space-y-0">
                              <p className="font-extrabold text-slate-900">मुख्याध्यापक स्वाक्षरी व शिक्का</p>
                              <p className="text-slate-400 font-normal">( Headmaster Signature & Stamp )</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
          </div>
        </PinGate>
      </main>

      {/* Low Stock Warning Modal */}
      <AnimatePresence>
        {showLowStockModal && lowStockItems.length > 0 && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl border-2 border-amber-300 shadow-2xl overflow-hidden p-5 sm:p-6 space-y-4"
            >
              {/* Header */}
              <div className="flex items-start gap-3.5 border-b border-amber-100 pb-4">
                <div className="size-11 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 shadow-xs">
                  <AlertTriangle className="size-6 animate-bounce text-amber-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-black text-amber-950 flex items-center gap-1.5">
                      <span>⚠️ Low Stock Warning</span>
                    </h3>
                    <button
                      onClick={() => {
                        setShowLowStockModal(false);
                        setDismissedLowStockHash(JSON.stringify(lowStockItems));
                      }}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      aria-label="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs font-bold text-amber-800 mt-0.5">
                    शाळेतील खालील साहित्याचा साठा १० किलो/लिटरपेक्षा कमी आहे.
                  </p>
                </div>
              </div>

              {/* Body: Low Stock List */}
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {lowStockItems.map((item) => (
                  <div
                    key={item.itemKey}
                    className="flex items-center justify-between p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 font-sans shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Package className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                      <span className="font-extrabold text-sm text-slate-900">
                        {item.nameMr}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-sm text-amber-950 bg-amber-200/90 px-2.5 py-1 rounded-lg border border-amber-300/60 inline-block">
                        {item.remaining} {item.unitMr}
                      </span>
                      <span className="block text-[11px] font-extrabold text-amber-800 mt-0.5">
                        शिल्लक आहे
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer Actions */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  onClick={() => {
                    setShowLowStockModal(false);
                    setDismissedLowStockHash(JSON.stringify(lowStockItems));
                  }}
                  className="w-full sm:flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-black text-sm rounded-xl shadow-md transition-colors text-center cursor-pointer"
                >
                  समजले (Close)
                </button>
                <button
                  onClick={() => {
                    setShowLowStockModal(false);
                    setDismissedLowStockHash(JSON.stringify(lowStockItems));
                    setActiveTab("incoming");
                  }}
                  className="w-full sm:flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm rounded-xl border border-slate-300 transition-colors text-center cursor-pointer"
                >
                  साहित्य आवक नोंदवा
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
