
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { DICTIONARY } from "@/lib/translations";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";
import { PinGate } from "@/components/teacher/PinGate";

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
    } 313
  }, [tab]);

  // Monthly Report States
  const [monthlyReportMonth, setMonthlyReportMonth] = useState<string | null>(null);
  const [selectedReportCategory, setSelectedReportCategory] = useState<"tandul_bhag1" | "dhanyadi_bhag2" | "masik_goshwara" | "anudan_report" | "purak_ahar_report">("tandul_bhag1");
  const [reportSchoolName, setReportSchoolName] = useState("");
  const [reportTeacherName, setReportTeacherName] = useState("");
  const [reportPrincipalName, setReportPrincipalName] = useState("");
  const [monthlySubTab, setMonthlySubTab] = useState<"1-5" | "6-8" | "1-8">("1-8");
  const [annualSubTab, setAnnualSubTab] = useState<"1-5" | "6-8" | "1-8">("1-5");
  const [annualReportType, setAnnualReportType] = useState("तांदूळ उपयोगिता (किलोग्रॅम मध्ये)");
  const [stockDemandMonth, setStockDemandMonth] = useState<string>("ऑगस्ट");
  const [stockDemandPatSankhya, setStockDemandPatSankhya] = useState<string>("");
  const [monthlyMdmReportType, setMonthlyMdmReportType] = useState<string>("daily_tandul_register");
  const [monthlyMdmReportMonth, setMonthlyMdmReportMonth] = useState<string>("जून सन 2026/27");

  const [certPrimaryCookedDays, setCertPrimaryCookedDays] = useState<string>("0");
  const [certUpperCookedDays, setCertUpperCookedDays] = useState<string>("0");
  const [certWednesdaysCount, setCertWednesdaysCount] = useState<string>("0");
  const [certSupplementaryFood, setCertSupplementaryFood] = useState<string>("अंडी / केळी / पूरक आहार");
  const [certPatPrimary, setCertPatPrimary] = useState<string>("");
  const [certPatUpper, setCertPatUpper] = useState<string>("");
  const [certBeneficiaryPrimary, setCertBeneficiaryPrimary] = useState<string>("0");
  const [certBeneficiaryUpper, setCertBeneficiaryUpper] = useState<string>("0");
  const [certHelperCount, setCertHelperCount] = useState<string>("0");

  const toEnglishNumbers = (str: string) => {
    const marathiDigits = [/०/g, /१/g, /२/g, /३/g, /४/g, /५/g, /६/g, /७/g, /८/g, /९/g];
    let res = str || "";
    for (let i = 0; i < 10; i++) {
      res = res.replace(marathiDigits[i], i.toString());
    }
    return res;
  };

  useEffect(() => {
    setReportSchoolName(localStorage.getItem("teacher_school_name") || profile?.schoolName || "");
    setReportTeacherName(localStorage.getItem("teacher_name") || profile?.cookName || "");
    setReportPrincipalName(localStorage.getItem("teacher_principal_name") || profile?.smcPresident || "");
  }, [profile]);

  const [isMonthlyReportGenerating, setIsMonthlyReportGenerating] = useState(false);
  const [isMonthlyReportGenerated, setIsMonthlyReportGenerated] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadPdf = async () => {
    const element = document.getElementById("monthly-report-print");
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

      const acadMonths = getAcademicYearMonths("2025-26");
      const selectedMonthObj = acadMonths.find(m => m.month === monthlyReportMonth);
      const reportYear = selectedMonthObj ? selectedMonthObj.year : 2025;

      const englishMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const marathiMonths = ["जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून", "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"];
      const monthIndex = englishMonths.indexOf(monthlyReportMonth || "");
      const marathiMonthName = monthIndex !== -1 ? marathiMonths[monthIndex] : "";

      const monthName = marathiMonthName || "Report";
      const opt = {
        margin: 0,
        filename: `MDM_Monthly_Report_${monthName}_${reportYear}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          onclone: (clonedDoc: any) => {
            // Reset body/html styles to prevent parent offsets
            clonedDoc.body.style.margin = "0";
            clonedDoc.body.style.padding = "0";
            clonedDoc.documentElement.style.margin = "0";
            clonedDoc.documentElement.style.padding = "0";

            const wrapper = clonedDoc.getElementById("monthly-report-print");
            if (wrapper) {
              // Reset all parents to prevent centering and negative offsets
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

              wrapper.className = "bg-white p-0 w-full flex flex-col gap-0 space-y-0";
              wrapper.style.padding = "0px";
              wrapper.style.margin = "0px";
              wrapper.style.backgroundColor = "#ffffff";
              wrapper.style.gap = "0px";
              wrapper.style.position = "relative";
              wrapper.style.left = "0";
              wrapper.style.top = "0";
              wrapper.scrollLeft = 0;
              wrapper.scrollTop = 0;
            }
            const pages = clonedDoc.querySelectorAll(".print-page");
            pages.forEach((page: any) => {
              page.style.border = "none";
              page.style.boxShadow = "none";
              page.style.borderRadius = "0px";
              page.style.margin = "0px";
              page.style.padding = "24px";
            });

            // Ensure rowSpan TH headings (अ. क्र., तपशील) are explicitly z-indexed and visible in html2canvas PDF export
            const rowSpanCells = clonedDoc.querySelectorAll("th[rowspan]");
            rowSpanCells.forEach((cell: any) => {
              cell.style.position = "relative";
              cell.style.zIndex = "30";
              cell.style.backgroundColor = "#f1f5f9";
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
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" as const },
        pagebreak: { mode: ["css", "legacy"] }
      };

      const worker = html2pdfFn().set(opt).from(element);
      await worker.save();
      toast.success(t("PDF यशस्वीरित्या डाउनलोड झाली!", "PDF downloaded successfully!", "पीडीएफ सफलतापूर्वक डाउनलोड हो गया!"));

      try {
        const pdfBlob = (await worker.output("blob")) as Blob;
        const folderPath = `mdm/monthly_reports/${getUdise() || "default"}`;
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
        filename: `MDM_Annual_Report_${annualReportYear || "Year"}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          onclone: (clonedDoc: any) => {
            // Reset body/html styles to prevent parent offsets
            clonedDoc.body.style.margin = "0";
            clonedDoc.body.style.padding = "0";
            clonedDoc.documentElement.style.margin = "0";
            clonedDoc.documentElement.style.padding = "0";

            const reportEl = clonedDoc.getElementById("annual-report-print");
            if (reportEl) {
              // Reset all parents to prevent centering and negative offsets
              let parent = reportEl.parentElement;
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

              // 1046px is the exact width for A4 landscape with 10mm margins at 96 DPI
              reportEl.style.width = "1046px";
              reportEl.style.minWidth = "1046px";
              reportEl.style.maxWidth = "1046px";
              reportEl.style.padding = "20px 10px";
              reportEl.style.boxSizing = "border-box";
              reportEl.style.backgroundColor = "#ffffff";
              reportEl.style.border = "none";
              reportEl.style.margin = "0px";
              reportEl.style.position = "relative";
              reportEl.style.left = "0";
              reportEl.style.top = "0";

              // Reset scroll position on container and inner scrollable tables
              reportEl.scrollLeft = 0;
              reportEl.scrollTop = 0;
              const scrollable = reportEl.querySelectorAll(".overflow-x-auto, .overflow-auto");
              scrollable.forEach((s: any) => {
                s.scrollLeft = 0;
                s.scrollTop = 0;
                s.style.overflow = "visible"; // expand fully
              });

              // Apply table sizing to fit all columns inside the 1046px width without scroll overflow
              const table = reportEl.querySelector("table");
              if (table) {
                table.style.width = "100%";
                table.style.minWidth = "100%";
                table.style.maxWidth = "100%";
                table.style.tableLayout = "fixed"; // enforce column widths strictly

                // Insert colgroup to define column widths
                // Printable width = 1046px - 20px padding = 1026px
                // Column 1 (Sr. No.): 25px
                // Column 2 (Details/Tapasheel): 170px
                // Columns 3-20 (18 item columns): 46px each (Total = 25 + 170 + 18 * 46 = 1023px)
                const colgroup = clonedDoc.createElement("colgroup");

                const col1 = clonedDoc.createElement("col");
                col1.style.width = "25px";
                colgroup.appendChild(col1);

                const col2 = clonedDoc.createElement("col");
                col2.style.width = "170px";
                colgroup.appendChild(col2);

                for (let i = 0; i < 18; i++) {
                  const colItem = clonedDoc.createElement("col");
                  colItem.style.width = "46px";
                  colgroup.appendChild(colItem);
                }

                table.insertBefore(colgroup, table.firstChild);

                // Set small padding, font sizes and wrap properties on cells
                const cells = table.querySelectorAll("th, td");
                cells.forEach((cell: any) => {
                  cell.style.padding = "2px 1px";
                  cell.style.fontSize = "8px";
                  cell.style.lineHeight = "1.1";
                  cell.style.wordBreak = "break-all";
                });

                // Adjust vertical writing headers styling to ensure they fit correctly
                const verticalDivs = table.querySelectorAll(".writing-vertical");
                verticalDivs.forEach((div: any) => {
                  div.style.padding = "4px 1px";
                  div.style.fontSize = "8px";
                  div.style.height = "75px";
                  div.style.lineHeight = "1";
                });
              }
            }
          }
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" as const },
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

  const handleAnnualReportDownload = handleDownloadAnnualPdf;

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
    try {
      toast.loading("PDF डाऊनलोड होत आहे...");
      const { default: html2pdf } = await import("html2pdf.js");
      let html2pdfFn = html2pdf;
      // @ts-ignore
      if (html2pdfFn && html2pdfFn.default) { html2pdfFn = html2pdfFn.default; }
      const isPoshanReport = monthlyMdmReportType === "poshan_ahar_daily_entry";
      const isMasikTandul = monthlyMdmReportType === "masik_tandul_report";
      const isMasikSatha = monthlyMdmReportType === "masik_goshwara";
      const monthShort = monthlyMdmReportMonth.split(' ')[0];
      const filename = isPoshanReport
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
      const opt = {
        margin: isPoshanReport ? [3, 3, 3, 3] : [2, 2, 2, 2],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
      };
      await html2pdfFn().set(opt).from(element).save();
      toast.success("PDF यशस्वीपणे डाऊनलोड झाली!");
    } catch (err) {
      console.error(err);
      toast.error("PDF डाऊनलोड करण्यात त्रुटी आली.");
    }
  };

const handleStockDemandPdfDownload = async () => {
    const element = document.getElementById("stock-demand-report-print");
    if (!element) {
      toast.error("अहवाल लोड होत आहे, कृपया थांबा...");
      return;
    }
    try {
      toast.loading("PDF डाऊनलोड होत आहे...");
      const { default: html2pdf } = await import("html2pdf.js");
      let html2pdfFn = html2pdf;
      // @ts-ignore
      if (html2pdfFn && html2pdfFn.default) { html2pdfFn = html2pdfFn.default; }
      const opt = {
        margin: [2, 2, 2, 2],
        filename: `धान्यादी_मालाची_मागणी_${stockDemandMonth}_2026.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
      };
      await html2pdfFn().set(opt).from(element).save();
      toast.success("PDF यशस्वीपणे डाऊनलोड झाली!");
    } catch (err) {
      console.error(err);
      toast.error("PDF डाऊनलोड करण्यात त्रुटी आली.");
    }
  };

const handleDemandReportPdfDownload = async () => {
    const element = document.getElementById("demand-report-print");
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
        filename: "MDM_Demand_Report.pdf",
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
      const reportYear = selectedMonthObj ? selectedMonthObj.year : 2025;

      const primaryRiceData = getStockDataForItem("Rice", monthlyReportMonth, reportYear, "1 To 5");
      const primaryCookedDaysVal = primaryRiceData?.cookedDays || 0;
      const primaryBeneficiarySumVal = primaryRiceData?.beneficiary || 0;

      const upperRiceData = getStockDataForItem("Rice", monthlyReportMonth, reportYear, "6 To 8");
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
      const wednesdaysCountVal = getWednesdaysInMonth(monthlyReportMonth, reportYear);
      const helperCountVal = helpers?.length || 0;

      const primaryRegData = getRegisterDataForMonth(monthlyReportMonth, reportYear, "1 To 5");
      const upperRegData = getRegisterDataForMonth(monthlyReportMonth, reportYear, "6 To 8");
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
  });

  const [recipeIngredientsMap, setRecipeIngredientsMap] = useState<
    Record<string, Record<string, boolean>>
  >({});

  const handleRecipeChange = (recipe: string) => {
    setMenuType(recipe);
    if (recipe && recipe !== "Select Menu") {
      if (recipeIngredientsMap[recipe]) {
        setSelectedMenuItems(recipeIngredientsMap[recipe]);
      } else {
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
          "Milk-Milk Powder": false,
          "Ragi Satva": false,
          "Sugar-Jaggery": false
        });
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

  const getMenuForRegisterDate = (dateStr: string, classStr = registerClass) => {
    if (!dateStr) return "No Menu Available";

    // 1. Check if saved in daily register record
    const savedRecord = registerRecords ? registerRecords[dateStr] : undefined;
    if (savedRecord) {
      const classRecord = savedRecord[classStr] || (classStr === "1 To 5" ? savedRecord : null);
      if (classRecord && classRecord.menu) {
        return classRecord.menu;
      }
    }

    // 2. Fall back to weekly configured menu
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

    // 3. Fall back to simple day search
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
      if (classRecord && classRecord.selectedItems) {
        return classRecord.selectedItems;
      }
    }

    // 2. Fall back to weekly configured menu
    const dayKey = getDayOfWeekKeyForDate(dateStr);
    if (
      dayKey &&
      menuRecords &&
      menuRecords[dayKey] &&
      menuRecords[dayKey].selectedItems
    ) {
      return menuRecords[dayKey].selectedItems;
    }

    // 3. Fall back to simple day search
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
      if (matchKey && menuRecords && menuRecords[matchKey].selectedItems) {
        return menuRecords[matchKey].selectedItems;
      }
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
  const [stockYear, setStockYear] = useState("2025");
  const [showStockReportModal, setShowStockReportModal] = useState(false);
  const [stockRecords, setStockRecords] = useState([
    { item: "Rice", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0 },
    { item: "Pease", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0 },
    { item: "Mugdal", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0 },
    { item: "Cowpea", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0 },
    { item: "Gram", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0 },
    { item: "Masurdal", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0 },
    { item: "Matki", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0 },
    { item: "Moong", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0 },
    { item: "Turdal", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0 },
    { item: "Soyabean Wadi", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0 },
    { item: "Turmeric", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0 },
    { item: "Salt", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0 },
    { item: "Onion Garlic Masala", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0 },
    { item: "Cumin", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0 },
    { item: "Mustard", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0 },
    { item: "Chili", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0 },
    { item: "Garam Masala", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0 },
    { item: "Oil", prev: 0, received: 0, cookedDays: 0, beneficiary: 0, used: 0 },
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
  const [stockMonth, setStockMonth] = useState("May");
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
  const [formulaSource, setFormulaSource] = useState<"admin" | "custom">("admin");
  const [formulaRecipe, setFormulaRecipe] = useState<string>("मूग-डाळ खिचडी");

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
    setSaving(true);
    try {
      const udise = getUdise();
      await setDoc(
        doc(db, "school_data", `${udise}_mdm`),
        {
          openingStock: openingStockValues,
          openingStockSigns,
          openingStockReceived,
          openingStockBorrowed,
          openingStockSpent,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      toast.success(t("आरंभीची शिल्लक यशस्वीरित्या जतन केली!", "Initial Stock saved successfully!"));
    } catch (e) {
      console.error(e);
      toast.error(t("साठा जतन करण्यात अडचण आली.", "Failed to save initial stock"));
    } finally {
      setSaving(false);
    }
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
        { incomingRecords: updated, updatedAt: new Date().toISOString() },
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
        { incomingRecords: updated, updatedAt: new Date().toISOString() },
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

  // Anudan (Grant & Cooking Cost Settings) States & Logic — Learnify-style
  const [anudanYear, setAnudanYear] = useState("2026-27");
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [primaryRate, setPrimaryRate] = useState("5.45");
  const [upperRate, setUpperRate] = useState("8.17");
  const [eggRate, setEggRate] = useState("5.00");
  const [vegPercent, setVegPercent] = useState("70");
  const [fuelPercent, setFuelPercent] = useState("30");
  // Learnify-style per-section breakdown
  const [primaryCentralShare, setPrimaryCentralShare] = useState("1.56");
  const [primaryStateShare, setPrimaryStateShare] = useState("1.03");
  const [upperCentralShare, setUpperCentralShare] = useState("2.32");
  const [upperStateShare, setUpperStateShare] = useState("1.56");
  const [anudanRateHistory, setAnudanRateHistory] = useState<Array<{ date: string; primary: string; upper: string; centralPrimary: string; statePrimary: string; centralUpper: string; stateUpper: string }>>([]);
  const [anudanLoaded, setAnudanLoaded] = useState(false);

  // Derived totals for Learnify-style display
  const primaryTotal = (parseFloat(primaryCentralShare || "0") + parseFloat(primaryStateShare || "0")).toFixed(2);
  const upperTotal = (parseFloat(upperCentralShare || "0") + parseFloat(upperStateShare || "0")).toFixed(2);
  const primaryGovRate = parseFloat(primaryRate || "0");
  const upperGovRate = parseFloat(upperRate || "0");

  // Load anudan settings from Firestore
  useEffect(() => {
    async function loadAnudanSettings() {
      try {
        const udise = getUdise();
        const snap = await getDoc(doc(db, "school_data", `${udise}_mdm`));
        if (snap.exists() && snap.data().anudanSettings) {
          const s = snap.data().anudanSettings;
          if (s.year) setAnudanYear(s.year);
          if (s.effectiveDate) setEffectiveDate(s.effectiveDate);
          if (s.primaryRate) setPrimaryRate(s.primaryRate);
          if (s.upperRate) setUpperRate(s.upperRate);
          if (s.eggRate) setEggRate(s.eggRate);
          if (s.vegPercent) setVegPercent(s.vegPercent);
          if (s.fuelPercent) setFuelPercent(s.fuelPercent);
          if (s.primaryCentralShare) setPrimaryCentralShare(s.primaryCentralShare);
          if (s.primaryStateShare) setPrimaryStateShare(s.primaryStateShare);
          if (s.upperCentralShare) setUpperCentralShare(s.upperCentralShare);
          if (s.upperStateShare) setUpperStateShare(s.upperStateShare);
        }
        if (snap.exists() && snap.data().anudanRateHistory) {
          setAnudanRateHistory(snap.data().anudanRateHistory);
        }
      } catch (e) {
        console.warn("Error loading anudan settings:", e);
      } finally {
        setAnudanLoaded(true);
      }
    }
    loadAnudanSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveAnudanSettings = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const udise = getUdise();
      const newHistoryEntry = {
        date: effectiveDate,
        primary: primaryRate,
        upper: upperRate,
        centralPrimary: primaryCentralShare,
        statePrimary: primaryStateShare,
        centralUpper: upperCentralShare,
        stateUpper: upperStateShare,
      };
      const updatedHistory = [
        newHistoryEntry,
        ...anudanRateHistory.filter((h) => h.date !== effectiveDate),
      ].slice(0, 20);
      await setDoc(
        doc(db, "school_data", `${udise}_mdm`),
        {
          anudanSettings: {
            year: anudanYear,
            effectiveDate,
            primaryRate,
            upperRate,
            eggRate,
            vegPercent,
            fuelPercent,
            primaryCentralShare,
            primaryStateShare,
            upperCentralShare,
            upperStateShare,
          },
          anudanRateHistory: updatedHistory,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      setAnudanRateHistory(updatedHistory);
      toast.success(t("अनुदान सेटिंग यशस्वीरित्या जतन केली!", "Anudan settings saved successfully!"));
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
      const wasSelected = classRecord.selectedItems
        ? !!classRecord.selectedItems[itemName]
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
    if (depth > 12) return 0;

    const prevKey = getPreviousMonthKey(monthName, yearStr, classStr);
    if (!prevKey) return 0;

    const firstUnderscore = prevKey.indexOf("_");
    const secondUnderscore = prevKey.indexOf("_", firstUnderscore + 1);
    if (firstUnderscore === -1 || secondUnderscore === -1) return 0;

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
          return Math.max(0, Number(closing.toFixed(6)));
        }
      }
      // If no saved history exists, carry forward from previous-previous month recursively
      return getOpeningStock(
        prevMonth,
        prevYear,
        prevClass,
        itemName,
        depth + 1,
        customRegisterRecords,
        customIncomingRecords,
      );
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

      const wasSelected = classRecord.selectedItems
        ? !!classRecord.selectedItems[itemName]
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
    prevUsed = Number(prevUsed.toFixed(6));

    const closing = prevOpening + prevReceived - prevUsed;
    return Math.max(0, Number(closing.toFixed(6)));
  };

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
        // ── 1. Received this month (from Incoming Entry tab) ────────────────
        const received = Number(incomingData[item.item]) || 0;

        // ── 2. Previous month closing stock (carry-forward chain) ───────────
        const prev = getOpeningStock(
          stockMonth,
          stockYear,
          stockClass,
          item.item,
        );

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
          const wasSelected = classRecord.selectedItems
            ? !!classRecord.selectedItems[item.item]
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

        const used = Number(totalUsedKg.toFixed(6));
        const beneficiary = benefSum; // total beneficiaries this month

        return {
          ...item,
          prev,
          received,
          used,
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
    incomingRecords,
    registerRecords,
    quantityRules,
    stockRecordsHistory,
  ]);

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
            if (firestoreData.registerRecord.beneficiary)
              setRegisterBeneficiary(firestoreData.registerRecord.beneficiary);
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
          if (firestoreData.formulaSource) {
            setFormulaSource(firestoreData.formulaSource);
          }
          if (firestoreData.formulaRecipe) {
            setFormulaRecipe(firestoreData.formulaRecipe);
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
    const schoolName = profile?.schoolName || "A B C";
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
      // 1. Received this month
      const received = Number(incomingData[itemName]) || 0;

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

        const wasSelected = classRecord.selectedItems
          ? !!classRecord.selectedItems[itemName]
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

  const getLokForMonth = (itemName: string, month: string, year: number) => {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const mIdx = monthNames.findIndex(m => m.toLowerCase() === month.toLowerCase());
    if (mIdx === -1) return 0;
    let total = 0;
    lokRecords.forEach((rec) => {
      const d = new Date(rec.date);
      if (!isNaN(d.getTime()) && d.getMonth() === mIdx && d.getFullYear() === year) {
        if (rec.item.toLowerCase() === itemName.toLowerCase()) {
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
          enrolled: Number(classRec.totalEnrolled || classRec.pat) || (classSection === "1 To 5" ? 45 : 35),
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
          enrolled: classSection === "1 To 5" ? 45 : 35,
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
      enrolled: classSection === "1 To 5" ? 45 : 35,
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
    { key: "Ragi Satva", nameMr: "नाचणी सत्व", unit: "kg" }
  ];

  // ---- End Dynamic Report Helpers ----

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-16 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 animate-pulse">
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
              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-600 bg-slate-100/80 border border-slate-200 px-4 py-2 rounded-full shadow-inner">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>UDISE: {getUdise()}</span>
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
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 animate-pulse">
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
                                              {entry.menu || "— Select recipe —"}
                                            </span>
                                          ) : (
                                            <select
                                              value={entry.menu || "— Select recipe —"}
                                              onChange={(e) => handleCalEntryChange(dateStrKey, "menu", e.target.value)}
                                              disabled={entry.isHoliday}
                                              className="w-full max-w-md h-9 px-3 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 truncate disabled:bg-slate-50 disabled:text-slate-400"
                                            >
                                              {learnifyRecipeOptions.map((r) => (
                                                <option key={r} value={r}>{r}</option>
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
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">कामाचे दिवस</span>
                                <span className="text-base font-extrabold text-slate-900">{totalWorking} दिवस</span>
                              </div>
                              <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200 space-y-0.5">
                                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">सुट्टीचे दिवस</span>
                                <span className="text-base font-extrabold text-rose-900">{totalHolidays} दिवस</span>
                              </div>
                              <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 space-y-0.5">
                                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">एकूण लाभार्थी</span>
                                <span className="text-base font-extrabold text-emerald-900">{totalBeneficiaries} विद्यार्थी</span>
                              </div>
                              <div className="bg-indigo-50 p-3.5 rounded-xl border border-indigo-200 space-y-0.5">
                                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">अनुमानित खर्च</span>
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
                            <p className="text-[11px] font-medium text-slate-500">
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

                {/* ANUDAN SETTINGS (GRANT & COOKING COST) TAB — Learnify Style */}
                {activeTab === "anudan" && (
                  <div className="w-full space-y-6 font-sans">

                    {/* Page Header */}
                    <h2 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-3">
                      {lang === "mr" ? "अनुदान सेटिंग" : "Anudan Settings"}
                    </h2>

                    {/* Card 1: Information Banner */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-2">
                      <h3 className="text-lg font-bold text-slate-800">
                        {lang === "mr" ? "अनुदान सेटिंग" : "Anudan Settings"}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        GR नुसार शासन दर व अनुदान वर्गीकरण (केंद्र / राज्य हिस्सा) येथे नियंत्रित करा. आपली शाळा: <strong className="text-slate-900">प्राथमिक ( इयत्ता १ ते ५ )</strong> — दैनंदिन नोंद, मासिक तांदूळ अहवाल/बिल व प्रपत्र (ब) यामध्ये <strong className="text-slate-900">लागू दिनांक</strong> नुसार दर वापरले जातात.
                        <br />सध्या प्रणालीचे मूळ दर वापरले जात आहेत.
                      </p>
                    </div>

                    {/* Card 2: Effective Date */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-2">
                      <label className="text-sm font-bold text-slate-700 block">
                        {lang === "mr" ? "लागू दिनांक (Effective from) *" : "Effective Date (Effective from) *"}
                      </label>
                      <div className="max-w-xs">
                        <input
                          type="date"
                          value={effectiveDate}
                          onChange={(e) => setEffectiveDate(e.target.value)}
                          className="w-full h-10 px-3.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 transition-colors"
                        />
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        या दिनांकापासून (सह) नवीन दर लागू होतील. मागील अहवालांसाठी जुने दर वापरले जातील.
                      </p>
                    </div>

                    {/* Card 3: Primary & Upper Primary Rate Breakdown — Learnify-style side-by-side bordered sections */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                      {/* Left: प्राथमिक (इयत्ता १ ते ५) */}
                      <div className="bg-white rounded-2xl border-2 border-emerald-500 shadow-sm overflow-hidden">
                        <div className="bg-emerald-50 border-b-2 border-emerald-500 px-5 py-3">
                          <h3 className="text-base font-bold text-emerald-800">
                            {lang === "mr" ? "प्राथमिक ( इयत्ता १ ते ५ )" : "Primary (Class 1 to 5)"}
                          </h3>
                        </div>
                        <div className="p-5 space-y-4">
                          {/* शासन दर (₹) */}
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">
                              {lang === "mr" ? "शासन दर (₹)" : "Govt. Rate (₹)"}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={primaryRate}
                              onChange={(e) => setPrimaryRate(e.target.value)}
                              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-lg font-extrabold text-right text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                            />
                          </div>
                          {/* केंद्र हिस्सा (₹) */}
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">
                              {lang === "mr" ? "केंद्र हिस्सा (₹)" : "Central Share (₹)"}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={primaryCentralShare}
                              onChange={(e) => setPrimaryCentralShare(e.target.value)}
                              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-lg font-extrabold text-right text-blue-700 focus:ring-2 focus:ring-blue-400 focus:border-blue-500 transition-all"
                            />
                          </div>
                          {/* राज्य हिस्सा / एकूण हिस्सा */}
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">
                              {lang === "mr" ? "राज्य हिस्सा (₹)" : "State Share (₹)"}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={primaryStateShare}
                              onChange={(e) => setPrimaryStateShare(e.target.value)}
                              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-lg font-extrabold text-right text-orange-600 focus:ring-2 focus:ring-orange-400 focus:border-orange-500 transition-all"
                            />
                          </div>
                          <div className="bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-600">{lang === "mr" ? "एकूण" : "Total"}: {primaryCentralShare} + {primaryStateShare}</span>
                            <span className="text-sm font-extrabold text-slate-900">₹ {primaryTotal}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: उच्च प्राथमिक (इयत्ता ६ ते ८) */}
                      <div className="bg-white rounded-2xl border-2 border-emerald-500 shadow-sm overflow-hidden">
                        <div className="bg-emerald-50 border-b-2 border-emerald-500 px-5 py-3">
                          <h3 className="text-base font-bold text-emerald-800">
                            {lang === "mr" ? "उच्च प्राथमिक ( इयत्ता ६ ते ८ )" : "Upper Primary (Class 6 to 8)"}
                          </h3>
                        </div>
                        <div className="p-5 space-y-4">
                          {/* शासन दर (₹) */}
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">
                              {lang === "mr" ? "शासन दर (₹)" : "Govt. Rate (₹)"}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={upperRate}
                              onChange={(e) => setUpperRate(e.target.value)}
                              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-lg font-extrabold text-right text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                            />
                          </div>
                          {/* केंद्र हिस्सा (₹) */}
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">
                              {lang === "mr" ? "केंद्र हिस्सा (₹)" : "Central Share (₹)"}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={upperCentralShare}
                              onChange={(e) => setUpperCentralShare(e.target.value)}
                              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-lg font-extrabold text-right text-blue-700 focus:ring-2 focus:ring-blue-400 focus:border-blue-500 transition-all"
                            />
                          </div>
                          {/* राज्य हिस्सा */}
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">
                              {lang === "mr" ? "राज्य हिस्सा (₹)" : "State Share (₹)"}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={upperStateShare}
                              onChange={(e) => setUpperStateShare(e.target.value)}
                              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-lg font-extrabold text-right text-orange-600 focus:ring-2 focus:ring-orange-400 focus:border-orange-500 transition-all"
                            />
                          </div>
                          <div className="bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-600">{lang === "mr" ? "एकूण" : "Total"}: {upperCentralShare} + {upperStateShare}</span>
                            <span className="text-sm font-extrabold text-slate-900">₹ {upperTotal}</span>
                          </div>
                        </div>
                      </div>
                    </div>



                    {/* Save Button */}
                    <button
                      onClick={handleSaveAnudanSettings}
                      disabled={saving}
                      className="px-6 py-2.5 bg-[#047857] hover:bg-[#065f46] text-white font-bold text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>{lang === "mr" ? "दर नमूना पत्रा" : "Save Rate Settings"}</span>
                    </button>

                    {/* Card 5: आपले अनुदान दर (इतिहास) — Learnify Style */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-2">
                      <h3 className="font-bold text-base text-slate-800">
                        {lang === "mr" ? "आपले अनुदान दर (इतिहास)" : "Your Grant Rates (History)"}
                      </h3>
                      {anudanRateHistory.length === 0 ? (
                        <p className="text-sm text-slate-500 font-medium">
                          {lang === "mr" ? "अद्याप कोणतेही दर नोंदवलेले नाहीत." : "No rates recorded yet."}
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-slate-200 mt-2">
                          <table className="w-full text-xs text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-100 text-slate-700 font-bold">
                                <th className="p-2.5 border-b border-slate-200">{lang === "mr" ? "लागू दिनांक" : "Effective Date"}</th>
                                <th className="p-2.5 border-b border-slate-200">{lang === "mr" ? "प्राथमिक ( इयत्ता १ ते ५ )" : "Primary (1-5)"}</th>
                                <th className="p-2.5 border-b border-slate-200">{lang === "mr" ? "उच्च प्राथमिक ( इयत्ता ६ ते ८ )" : "Upper Primary (6-8)"}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {anudanRateHistory.map((h, i) => (
                                <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-emerald-50/40 transition-colors`}>
                                  <td className="p-2.5 border-b border-slate-100 font-bold text-slate-800">{h.date}</td>
                                  <td className="p-2.5 border-b border-slate-100">
                                    <span className="font-bold text-slate-900">₹{h.primary}</span>
                                    <span className="text-[10px] text-slate-500 ml-1">({lang === "mr" ? "केंद्र" : "C"} ₹{h.centralPrimary} + {lang === "mr" ? "राज्य" : "S"} ₹{h.statePrimary})</span>
                                  </td>
                                  <td className="p-2.5 border-b border-slate-100">
                                    <span className="font-bold text-slate-900">₹{h.upper}</span>
                                    <span className="text-[10px] text-slate-500 ml-1">({lang === "mr" ? "केंद्र" : "C"} ₹{h.centralUpper} + {lang === "mr" ? "राज्य" : "S"} ₹{h.stateUpper})</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Card 6: प्रणालीचे मूळ दर (GR) — Default System Rates */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-2">
                      <h3 className="font-bold text-base text-slate-800">
                        {lang === "mr" ? "प्रणालीचे मूळ दर (GR)" : "System Default Rates (GR)"}
                      </h3>
                      <div className="overflow-x-auto rounded-lg border border-slate-200 mt-2">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 font-bold">
                              <th className="p-2.5 border-b border-slate-200">{lang === "mr" ? "लागू दिनांक" : "Effective Date"}</th>
                              <th className="p-2.5 border-b border-slate-200">{lang === "mr" ? "प्राथमिक ( इयत्ता १ ते ५ )" : "Primary (1-5)"}</th>
                              <th className="p-2.5 border-b border-slate-200">{lang === "mr" ? "उच्च प्राथमिक ( इयत्ता ६ ते ८ )" : "Upper Primary (6-8)"}</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="bg-white hover:bg-emerald-50/40 transition-colors">
                              <td className="p-2.5 border-b border-slate-100 font-bold text-slate-800">01-04-2024</td>
                              <td className="p-2.5 border-b border-slate-100">
                                <span className="font-bold text-slate-900">₹2.59</span>
                                <span className="text-[10px] text-slate-500 ml-1">({lang === "mr" ? "केंद्र" : "C"} ₹1.56 + {lang === "mr" ? "राज्य" : "S"} ₹1.03)</span>
                              </td>
                              <td className="p-2.5 border-b border-slate-100">
                                <span className="font-bold text-slate-900">₹3.88</span>
                                <span className="text-[10px] text-slate-500 ml-1">({lang === "mr" ? "केंद्र" : "C"} ₹2.32 + {lang === "mr" ? "राज्य" : "S"} ₹1.56)</span>
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
                            <span className="bg-amber-100 text-amber-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">{recipe.cal}</span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium">{recipe.desc}</p>
                          <div>
                            <span className="text-[11px] font-bold text-slate-500 block mb-1">मुख्य घटक:</span>
                            <div className="flex flex-wrap gap-1">
                              {recipe.items.map((it, i) => (
                                <span key={i} className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">{it}</span>
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
                    {/* Learnify Yellow Notice Banner */}
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-900 space-y-2 shadow-sm">
                      <h3 className="font-extrabold text-base text-amber-950 flex items-center gap-2">
                        <span>प्रारंभिक साठा (Initial stock)</span>
                      </h3>
                      <p className="text-xs leading-relaxed font-medium">
                        ज्या महिन्यापासून रिपोर्ट्स हवे आहेत त्या महिन्याची <span className="font-bold text-emerald-800">आरंभीची शिल्लक (Opening/Initial Stock)</span> हिरव्या "शिल्लक" कॉलममध्ये भरा. प्राथमिक ( इयत्ता १ ते ५ ) गटाच्या साहित्यासाठी तुम्ही शिल्लक भरणार आहात.
                      </p>
                      <p className="text-xs leading-relaxed font-medium">
                        जर उसना (लोकसहभाग) साहित्य वापरले असेल आणि शिल्लक <span className="font-bold text-rose-700">negative</span> असेल, तर प्रमाण भरा आणि <span className="font-bold">+ / -</span> बटण दाबून <span className="font-bold text-rose-700">- (minus)</span> निवडा — मोबाईलवर Negative टाईप करण्याची गरज नाही.
                      </p>
                    </div>

                    {/* Table Container */}
                    <div className="bg-white rounded-2xl border border-emerald-200 shadow-md overflow-hidden">
                      {/* Header Title */}
                      <div className="bg-emerald-50 text-center py-3 border-b border-emerald-200">
                        <h2 className="font-extrabold text-emerald-900 text-sm md:text-base uppercase tracking-wide">
                          {profile?.schoolName || "Z P SCHOOL"}
                        </h2>
                        <p className="text-xs font-bold text-emerald-700 mt-0.5">
                          आरंभीची शिल्लक • सन 2026-27
                        </p>
                      </div>

                      {/* Horizontal Scrollable Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-center text-xs border-collapse min-w-[3200px]">
                          <thead>
                            <tr className="bg-emerald-100/70 border-b border-emerald-300 text-emerald-950 font-bold">
                              <th className="p-3 border-r border-emerald-300 bg-emerald-100" style={{ minWidth: "180px", width: "180px" }}>साहित्य (Item Name)</th>
                              {REPORT_ITEMS.slice(0, 18).map((item) => (
                                <th key={item.key} colSpan={6} className="p-2.5 border-r border-emerald-300 text-center font-extrabold text-emerald-900 bg-emerald-100/80 text-xs">
                                  {item.nameMr} ({item.unit})
                                </th>
                              ))}
                            </tr>
                            <tr className="bg-emerald-50 border-b border-emerald-200 text-[11px] font-bold text-slate-700">
                              <th className="p-2 border-r border-emerald-200 bg-emerald-100/50" style={{ minWidth: "120px", width: "120px" }}>तपशील</th>
                              {REPORT_ITEMS.slice(0, 18).map((item) => (
                                <React.Fragment key={item.key}>
                                  <th className="p-2 border-r border-emerald-200 bg-emerald-100/80 text-emerald-900 font-black" style={{ minWidth: "130px", width: "130px" }}>शिल्लक</th>
                                  <th className="p-2 border-r border-slate-200 bg-blue-100/80 text-blue-900 font-extrabold" style={{ minWidth: "120px", width: "120px" }}>प्राप्त</th>
                                  <th className="p-2 border-r border-slate-200 bg-amber-100/80 text-amber-900 font-extrabold" style={{ minWidth: "120px", width: "120px" }}>उसना</th>
                                  <th className="p-2 border-r border-slate-200 bg-slate-200/80 text-slate-900 font-black" style={{ minWidth: "120px", width: "120px" }}>एकूण</th>
                                  <th className="p-2 border-r border-slate-200 bg-rose-100/80 text-rose-900 font-extrabold" style={{ minWidth: "120px", width: "120px" }}>खर्च</th>
                                  <th className="p-2 border-r border-emerald-300 bg-emerald-200/80 text-emerald-950 font-black" style={{ minWidth: "120px", width: "120px" }}>शिल्लक</th>
                                </React.Fragment>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-slate-200 hover:bg-slate-50">
                              <td className="p-3 border-r border-emerald-200 font-extrabold text-slate-900 bg-amber-50/50 text-left" style={{ minWidth: "180px", width: "180px" }}>
                                आरंभीची शिल्लक <br />
                                <span className="text-[10px] text-slate-500 font-normal">Opening/Initial Stock</span>
                              </td>
                              {REPORT_ITEMS.slice(0, 18).map((item) => {
                                const isMinus = openingStockSigns[item.key] === "-";
                                const rawOpening = parseFloat(openingStockValues[item.key] || "0") || 0;
                                const openingVal = isMinus ? -rawOpening : rawOpening;
                                const receivedVal = parseFloat(openingStockReceived[item.key] || "0") || 0;
                                const borrowedVal = parseFloat(openingStockBorrowed[item.key] || "0") || 0;
                                const totalVal = openingVal + receivedVal + borrowedVal;
                                const spentVal = parseFloat(openingStockSpent[item.key] || "0") || 0;
                                const closingVal = totalVal - spentVal;

                                return (
                                  <React.Fragment key={item.key}>
                                    {/* 1. Opening Balance Input */}
                                    <td className="p-1.5 border-r border-emerald-200 bg-emerald-50/60" style={{ minWidth: "130px", width: "130px" }}>
                                      <div className="flex items-center gap-1 justify-center w-full">
                                        <button
                                          onClick={() => toggleOpeningStockSign(item.key)}
                                          className={`px-2 py-1 text-xs font-black rounded-lg border cursor-pointer shrink-0 shadow-xs ${
                                            isMinus ? "bg-rose-600 text-white border-rose-700" : "bg-emerald-600 text-white border-emerald-700"
                                          }`}
                                          title="Toggle +/- sign"
                                        >
                                          {isMinus ? "-" : "+"}
                                        </button>
                                        <input
                                          type="number"
                                          step="0.001"
                                          value={openingStockValues[item.key] || "0"}
                                          onChange={(e) => handleOpeningStockChange(item.key, e.target.value)}
                                          className="w-full h-9 text-center border border-emerald-400 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 bg-white text-xs px-2 shadow-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                      </div>
                                    </td>

                                    {/* 2. Received Input */}
                                    <td className="p-1.5 border-r border-slate-200 bg-blue-50/30" style={{ minWidth: "120px", width: "120px" }}>
                                      <input
                                        type="number"
                                        step="0.001"
                                        placeholder="0"
                                        value={openingStockReceived[item.key] || ""}
                                        onChange={(e) => handleOpeningReceivedChange(item.key, e.target.value)}
                                        className="w-full h-9 text-center border-2 border-blue-300 rounded-lg font-extrabold text-blue-950 focus:ring-2 focus:ring-blue-500 bg-white text-xs px-2 shadow-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      />
                                    </td>

                                    {/* 3. Borrowed Input */}
                                    <td className="p-1.5 border-r border-slate-200 bg-amber-50/30" style={{ minWidth: "120px", width: "120px" }}>
                                      <input
                                        type="number"
                                        step="0.001"
                                        placeholder="0"
                                        value={openingStockBorrowed[item.key] || ""}
                                        onChange={(e) => handleOpeningBorrowedChange(item.key, e.target.value)}
                                        className="w-full h-9 text-center border-2 border-amber-300 rounded-lg font-extrabold text-amber-950 focus:ring-2 focus:ring-amber-500 bg-white text-xs px-2 shadow-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      />
                                    </td>

                                    {/* 4. Total Stock Column (Live Computed) */}
                                    <td className="p-1.5 border-r border-slate-200 bg-slate-100/60" style={{ minWidth: "120px", width: "120px" }}>
                                      <div className="w-full h-9 flex items-center justify-center font-black text-slate-950 text-xs px-2 bg-slate-100 rounded-lg border border-slate-300 shadow-inner">
                                        {toMarathiNumbers(totalVal.toFixed(3))}
                                      </div>
                                    </td>

                                    {/* 5. Spent Input */}
                                    <td className="p-1.5 border-r border-slate-200 bg-rose-50/30" style={{ minWidth: "120px", width: "120px" }}>
                                      <input
                                        type="number"
                                        step="0.001"
                                        placeholder="0"
                                        value={openingStockSpent[item.key] || ""}
                                        onChange={(e) => handleOpeningSpentChange(item.key, e.target.value)}
                                        className="w-full h-9 text-center border-2 border-rose-300 rounded-lg font-extrabold text-rose-950 focus:ring-2 focus:ring-rose-500 bg-white text-xs px-2 shadow-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      />
                                    </td>

                                    {/* 6. Closing Stock Column (Live Computed) */}
                                    <td className="p-1.5 border-r border-emerald-300 bg-emerald-50" style={{ minWidth: "120px", width: "120px" }}>
                                      <div className={`w-full h-9 flex items-center justify-center font-black text-xs px-2 rounded-lg border shadow-inner ${
                                        closingVal < 0 ? "bg-rose-100 text-rose-700 border-rose-400 font-extrabold" : "bg-emerald-100/80 text-emerald-950 border-emerald-300"
                                      }`}>
                                        {toMarathiNumbers(closingVal.toFixed(3))}
                                      </div>
                                    </td>
                                  </React.Fragment>
                                );
                              })}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="pt-2">
                      <button
                        onClick={handleSaveOpeningStock}
                        disabled={saving}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center gap-2"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>Save opening stock (आरंभीची शिल्लक जतन करा)</span>
                      </button>
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
                        <div className="overflow-x-auto">
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
                              {lang === "mr" ? "दाताचे नाव (Donor Name)" : "Donor Name"}
                            </label>
                            <input
                              type="text"
                              placeholder={lang === "mr" ? "उदा. ग्रामपंचायत / पालकांचे नाव" : "Donor name..."}
                              value={lokDonor}
                              onChange={(e) => setLokDonor(e.target.value)}
                              className="w-full h-10 px-3 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">
                              {lang === "mr" ? "टीप / तपशील" : "Remarks / Details"}
                            </label>
                            <textarea
                              rows={2}
                              placeholder={lang === "mr" ? "टीप प्रविष्ट करा..." : "Enter remarks..."}
                              value={lokRemark}
                              onChange={(e) => setLokRemark(e.target.value)}
                              className="w-full p-3 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 resize-none"
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
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold">
                                <th className="p-2.5">{lang === "mr" ? "दिनांक" : "Date"}</th>
                                <th className="p-2.5">{lang === "mr" ? "साहित्य" : "Material"}</th>
                                <th className="p-2.5">{lang === "mr" ? "प्रमाण" : "Quantity"}</th>
                                <th className="p-2.5">{lang === "mr" ? "दाताचे नाव" : "Donor"}</th>
                                <th className="p-2.5">{lang === "mr" ? "टीप" : "Remark"}</th>
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
                                    <td className="p-2.5 text-slate-700 font-medium">{r.donor || "-"}</td>
                                    <td className="p-2.5 text-slate-500">{r.remark || "-"}</td>
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
                        <div className="overflow-x-auto">
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
                            <option value="व्हेजिटेबल पुलाव">व्हेजिटेबल पुलाव</option>
                            <option value="मूग-डाळ खिचडी">मूग-डाळ खिचडी</option>
                            <option value="चणा/हरभरा पुलाव">चणा/हरभरा पुलाव</option>
                            <option value="चवळी खिचडी">चवळी खिचडी</option>
                            <option value="मोड आलेल्या मटकीची उसळ व साधा शिजवलेला भात">मोड आलेल्या मटकीची उसळ व साधा शिजवलेला भात</option>
                            <option value="मसाले भात">मसाले भात</option>
                            <option value="सोयाबीन पुलाव">सोयाबीन पुलाव</option>
                            <option value="मसुरी पुलाव">मसुरी पुलाव</option>
                            <option value="मूग/तूर शेवग्याचे वरण आणि भात">मूग/तूर शेवग्याचे वरण आणि भात</option>
                            <option value="मटार/वाटाणा पुलाव">मटार/वाटाणा पुलाव</option>
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
                            {quantityRules.map((row) => (
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
                            ))}
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
                    <h2 className="text-xl font-bold text-slate-800">
                      Recipe Ingredients
                    </h2>

                    {/* Main Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                      {/* Recipe Dropdown Field */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700 block">
                          Recipe
                        </label>
                        <select
                          value={menuType}
                          onChange={(e) => handleRecipeChange(e.target.value)}
                          className="w-full h-10 px-3.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-emerald-600 transition-colors"
                        >
                          <option value="Select Menu">Select Recipe</option>
                          <option value="Vegetable Pulav">
                            {getTranslatedMenu("Vegetable Pulav")}
                          </option>
                          <option value="Masala Rice">
                            {getTranslatedMenu("Masala Rice")}
                          </option>
                          <option value="Matar Pulav">
                            {getTranslatedMenu("Matar Pulav")}
                          </option>
                          <option value="Mungdal Khichadi">
                            {getTranslatedMenu("Mungdal Khichadi")}
                          </option>
                          <option value="Cowpea Khichadi">
                            {getTranslatedMenu("Cowpea Khichadi")}
                          </option>
                          <option value="Chana Pulav">
                            {getTranslatedMenu("Chana Pulav")}
                          </option>
                          <option value="Soyabin Pulav">
                            {getTranslatedMenu("Soyabin Pulav")}
                          </option>
                          <option value="Masuri Pulav">
                            {getTranslatedMenu("Masuri Pulav")}
                          </option>
                          <option value="Egg Pulav">
                            {getTranslatedMenu("Egg Pulav")}
                          </option>
                          <option value="Sprouted Matki Usal">
                            {getTranslatedMenu("Sprouted Matki Usal")}
                          </option>
                          <option value="Sweet Khichadi">
                            {getTranslatedMenu("Sweet Khichadi")}
                          </option>
                          <option value="Mug Shevaga Varan Bhat">
                            {getTranslatedMenu("Mug Shevaga Varan Bhat")}
                          </option>
                          <option value="Rice pudding">
                            {getTranslatedMenu("Rice pudding")}
                          </option>
                          <option value="ragi porridge">
                            {getTranslatedMenu("ragi porridge")}
                          </option>
                          <option value="Sprouted pulses">
                            {getTranslatedMenu("Sprouted pulses")}
                          </option>
                          <option value="Other">
                            {getTranslatedMenu("Other")}
                          </option>
                        </select>
                      </div>

                      {/* Show ingredients checklist ONLY when a recipe is selected */}
                      {menuType && menuType !== "Select Menu" ? (
                        <>
                          {/* Instruction Subtext */}
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Select ingredients used for <span className="font-bold text-slate-900">{getTranslatedMenu(menuType)}</span>. Your selection is saved until you change it. Deselected ingredients keep formula rows at zero and are excluded from daily entry.
                          </p>

                          {/* Checklist Box */}
                          <div className="border border-slate-200 rounded-lg p-3 bg-white max-h-[380px] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {/* Column 1 */}
                              <div className="space-y-2">
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
                                  "Milk-Milk Powder",
                                  "Ragi Satva"
                                ].map((item) => {
                                  const isChecked = !!selectedMenuItems[item];
                                  return (
                                    <label
                                      key={item}
                                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 cursor-pointer select-none"
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
                                        className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-0 cursor-pointer"
                                      />
                                      <span className="text-sm font-medium">
                                        {getTranslatedItem(item)}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>

                              {/* Column 2 */}
                              <div className="space-y-2">
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
                                  "Sugar-Jaggery"
                                ].map((item) => {
                                  const isChecked = !!selectedMenuItems[item];
                                  return (
                                    <label
                                      key={item}
                                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 cursor-pointer select-none"
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
                                        className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-0 cursor-pointer"
                                      />
                                      <span className="text-sm font-medium">
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
                              className="px-4 py-2 bg-[#047857] hover:bg-[#065f46] text-white rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              <span>Save ingredients</span>
                            </button>
                            <button
                              onClick={() => setActiveTab("quantity")}
                              className="text-sm font-semibold text-[#047857] hover:underline cursor-pointer"
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
                                <p className="text-[10px] mt-1">
                                  Taluka: , Jilha:
                                </p>
                                <p className="text-[10px] mb-2">
                                  Mobile Number: 8010926852 , Email:
                                </p>

                                <div className="flex justify-center mt-1">
                                  <div className="bg-black text-white px-5 py-1 text-xs font-bold rounded shadow-sm print:border print:border-black print:text-black print:bg-white">
                                    {t("अन्न मेनू", "Food Menu", "खाद्य मेनू")}
                                  </div>
                                </div>
                              </div>

                              {/* Table */}
                              <table className="w-full border-collapse text-black text-[11px] text-center">
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
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2">
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
                          <p className="text-[11px] font-medium text-emerald-700">
                            Group: प्राथमिक (इयत्ता १ ते ५) · Calendar master · Formula: custom
                          </p>
                        </div>

                        {/* Form Panel */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                          {/* Radio: Food cooked today */}
                          <div className="space-y-1.5 p-3 rounded-lg bg-purple-50/50 border border-purple-100">
                            <label className="text-xs font-bold text-purple-900 block">
                              आहार शिजवला आहे की नाही
                            </label>
                            <div className="flex items-center gap-6 text-sm font-semibold text-slate-800">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="cookedToday"
                                  value="yes"
                                  checked={cookedToday === "yes"}
                                  onChange={(e) => setCookedToday(e.target.value)}
                                  className="text-purple-600 focus:ring-purple-500"
                                />
                                <span>होय</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="cookedToday"
                                  value="no"
                                  checked={cookedToday === "no"}
                                  onChange={(e) => setCookedToday(e.target.value)}
                                  className="text-purple-600 focus:ring-purple-500"
                                />
                                <span>नाही</span>
                              </label>
                            </div>
                          </div>

                          {/* Student Attendance Inputs */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-slate-700 block">
                                पटसंख्या *
                              </label>
                              <input
                                type="number"
                                placeholder="२३"
                                value={totalEnrolled}
                                onChange={(e) => setTotalEnrolled(e.target.value)}
                                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-center text-base font-extrabold text-slate-900 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none"
                              />
                              <p className="text-[10px] font-bold text-emerald-700">
                                Up to 500 students
                              </p>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-slate-700 block">
                                हजर विद्यार्थ्यांची संख्या *
                              </label>
                              <input
                                type="number"
                                placeholder="३२"
                                value={presentCount}
                                onChange={(e) => setPresentCount(e.target.value)}
                                className={`w-full h-10 px-3 bg-white border rounded-xl text-center text-base font-extrabold text-slate-900 focus:ring-2 outline-none ${
                                  Number(presentCount) > Number(totalEnrolled) && totalEnrolled !== ""
                                    ? "border-red-400 focus:ring-red-200 focus:border-red-500"
                                    : "border-slate-300 focus:ring-indigo-200 focus:border-indigo-500"
                                }`}
                              />
                              {Number(presentCount) > Number(totalEnrolled) && totalEnrolled !== "" && (
                                <p className="text-[10px] font-bold text-red-600 leading-tight">
                                  हजर विद्यार्थ्यांची संख्या पटसंख्येपेक्षा जास्त असू शकत नाही.
                                </p>
                              )}
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-slate-700 block">
                                वापरलेली ताटे *
                              </label>
                              <input
                                type="number"
                                placeholder="७७"
                                value={registerBeneficiary}
                                onChange={(e) => setRegisterBeneficiary(e.target.value)}
                                className={`w-full h-10 px-3 bg-white border rounded-xl text-center text-base font-extrabold focus:ring-2 outline-none ${
                                  Number(registerBeneficiary) > Number(presentCount) && presentCount !== ""
                                    ? "border-red-400 text-red-600 focus:ring-red-200 focus:border-red-500"
                                    : "border-slate-300 text-emerald-700 focus:ring-emerald-200 focus:border-emerald-500"
                                }`}
                              />
                              {Number(registerBeneficiary) > Number(presentCount) && presentCount !== "" && (
                                <p className="text-[10px] font-bold text-red-600 leading-tight">
                                  वापरलेली ताटे हजर संख्येपेक्षा जास्त असू शकत नाही.
                                </p>
                              )}
                            </div>
                          </div>

                          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                            प्रथम पटसंख्या, नंतर हजर संख्या, नंतर जेवण घेतलेली ताटे · १ विद्यार्थी = १ ताट · ताट हजर संख्येपेक्षा जास्त नसावीत
                          </p>

                          {/* Auto Ingredient Calculation Cards */}
                          <div className="space-y-2 pt-1">
                            <span className="text-xs font-bold text-slate-800 block">
                              Automatic ingredient calculation <span className="text-slate-400 font-medium">(kg)</span>
                            </span>

                            {/* Red Warning Banner when Recipe fails or food not cooked */}
                            {(cookedToday === "no" || getMenuForRegisterDate(registerDate) === "No Menu Available") && (
                              <div className="p-4 bg-white border border-red-200 rounded-xl text-center shadow-xs">
                                <p className="text-xs font-bold text-red-600">
                                  Recipe does not match this entry. Refresh the page.
                                </p>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Green Card: Veggies */}
                              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                                <span className="text-xs font-bold text-emerald-900 block">भाजीपाला</span>
                                <span className="text-[10px] text-emerald-700 block">
                                  नोंदवहीसाठी — स्टॉक किंवा Calculation वर परिणाम होत नाही
                                </span>
                                <div className="space-y-1 pt-1">
                                  <label className="text-[11px] font-bold text-slate-700 block">भाजीपाला (kg)</label>
                                  <input
                                    type="text"
                                    placeholder="867"
                                    value={veggieKg}
                                    onChange={(e) => setVeggieKg(e.target.value)}
                                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-sm font-bold text-right text-slate-800 focus:outline-none focus:border-emerald-500"
                                  />
                                </div>
                              </div>

                              {/* Blue Card: Fuel & Veg Allowance */}
                              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 space-y-2 relative flex flex-col justify-between">
                                <div>
                                  <span className="text-xs font-bold text-blue-900 block">इंधन व भाजीपाला अनुदान</span>
                                  <span className="text-[10px] text-blue-700 block">
                                    {registerClass === "6 To 8" ? "उच्च प्राथमिक (६ ते ८)" : "प्राथमिक ( इयत्ता १ ते ५ )"} · ₹{registerClass === "6 To 8" ? (Number(upperRate || 5.45)).toFixed(2) : (Number(primaryRate || 2.59)).toFixed(2)} प्रति ताट
                                  </span>
                                  <button
                                    onClick={() => setActiveTab("anudan")}
                                    className="text-[11px] font-bold text-blue-600 underline hover:text-blue-800 block mt-0.5"
                                  >
                                    अनुदान सेटिंग
                                  </button>
                                </div>
                                <div className="pt-2 border-t border-blue-100">
                                  <span className="text-[11px] font-bold text-slate-700 block">एकूण अनुदान (₹)</span>
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
                              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={purakAhar}
                                  onChange={(e) => setPurakAhar(e.target.checked)}
                                  className="size-4 mt-0.5 rounded border-amber-400 text-amber-600 focus:ring-0"
                                />
                                <div>
                                  <span className="text-xs font-bold text-amber-950 block">पूरक आहार (Purak Ahar)</span>
                                  <span className="text-[10px] text-amber-800 block">
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
                                    value={purakAharDetails}
                                    onChange={(e) => setPurakAharDetails(e.target.value)}
                                    className="w-full p-2.5 bg-white border border-indigo-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-all shadow-sm"
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
                              value={remarks}
                              onChange={(e) => setRemarks(e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:border-slate-400"
                            />
                          </div>

                          {/* Save Button */}
                          <button
                            onClick={handleSaveRegister}
                            className="w-full py-2.5 bg-[#047857] hover:bg-[#065f46] text-white font-bold text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                          >
                            <Save className="w-4 h-4" />
                            <span>Save entry</span>
                          </button>
                        </div>
                      </div>

                      {/* Right Column: Month Register Matrix Table (7 cols) */}
                      <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div>
                            <h3 className="font-bold text-sm text-slate-800">महिनावारी नोंदी</h3>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {(() => {
                                const d = new Date(registerDate || new Date());
                                const monthNamesMr = ["जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून", "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"];
                                return !isNaN(d.getTime()) ? `${monthNamesMr[d.getMonth()]} ${d.getFullYear()}` : "जुलै २०२६";
                              })()}
                            </p>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                            ५०% दिवस
                          </span>
                        </div>

                        {/* Scrollable Month Matrix Table */}
                        <div className="w-full overflow-x-auto max-h-[620px] overflow-y-auto border border-slate-200 rounded-lg">
                          <table className="w-full border-collapse text-left text-xs bg-white">
                            <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase">
                              <tr>
                                <th className="p-2 border-r border-slate-200 min-w-[65px]">DATE</th>
                                <th className="p-2 border-r border-slate-200 min-w-[65px]">DAY</th>
                                <th className="p-2 border-r border-slate-200 min-w-[130px]">RECIPE</th>
                                <th className="p-2 border-r border-slate-200 text-center min-w-[65px]">पटसंख्या</th>
                                <th className="p-2 border-r border-slate-200 text-center min-w-[65px]">हजर पट</th>
                                <th className="p-2 border-r border-slate-200 text-center min-w-[65px] text-rose-700">गेरहजर</th>
                                <th className="p-2 border-r border-slate-200 text-center min-w-[70px]">लाभार्थी</th>
                                <th className="p-2 border-r border-slate-200 text-center min-w-[70px]">तांदूळ KG</th>
                                <th className="p-2 border-r border-slate-200 text-center min-w-[70px]">मूगडाळ KG</th>
                                <th className="p-2 text-center min-w-[70px]">तूरडाळ KG</th>
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

                                  const recipeName = classData?.menu || getMenuForRegisterDate(fullDateKey);

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

                                  const riceKg = beneNum > 0 ? (beneNum * (registerClass === "6 To 8" ? 0.15 : 0.1)).toFixed(2) : "—";
                                  const moongKg = beneNum > 0 ? (beneNum * 0.02).toFixed(2) : "—";
                                  const turKg = beneNum > 0 ? (beneNum * 0.02).toFixed(2) : "—";

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
                                      <td className="p-2 border-r border-slate-100 font-semibold text-slate-800 whitespace-nowrap">
                                        {dayPadded}/{monthPadded}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-slate-600 whitespace-nowrap">
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
                                      <td className="p-2 border-r border-slate-100 text-center font-semibold text-rose-600">
                                        {absentSt}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center font-bold text-slate-900">
                                        {beneCount}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center text-slate-700 font-semibold">
                                        {riceKg}
                                      </td>
                                      <td className="p-2 border-r border-slate-100 text-center text-slate-700">
                                        {moongKg}
                                      </td>
                                      <td className="p-2 text-center text-slate-700">
                                        {turKg}
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
                              className="border border-black flex-1 overflow-auto print:overflow-visible bg-white print:border-none"
                              id="general-report-print"
                            >
                              {/* Header */}
                              <div className="text-center text-black border-b border-black py-4 print:border-b-2">
                                <h3 className="font-bold text-sm tracking-[0.2em] uppercase">
                                  {profile?.schoolName || "A B C"}
                                </h3>
                                <p className="text-[10px] mt-1">
                                  {t("तालुका:", "Taluka:")}{" "}
                                  {profile?.taluka || ""},{" "}
                                  {t("जिल्हा:", "District:")}{" "}
                                  {profile?.district || ""}
                                </p>
                                <p className="text-[10px] mb-1">
                                  {t(
                                    "प्रधानमंत्री पोषण शक्ती निर्माण योजना",
                                    "Pradhan Mantri Poshan Shakti Nirman Yojana",
                                  )}
                                </p>
                              </div>

                              <table className="w-full border-collapse text-black text-[9px] text-center table-fixed">
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
                                        className="border-b border-r border-black p-0.5 text-[8px] truncate"
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
                                          Number(record.enrolled) || 45;
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

                                <div className="flex justify-between items-center mt-10 px-8 text-[10px] font-bold">
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
                                    <p className="text-[9px] text-slate-500 font-normal">
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
                              className="border border-black flex-1 overflow-auto print:overflow-visible bg-white print:border-none"
                              id="rice-report-print"
                            >
                              {/* Header */}
                              <div className="text-center text-black border-b border-black py-4 print:border-b-2">
                                <h3 className="font-bold text-sm tracking-[0.2em] uppercase">
                                  {profile?.schoolName || "A B C"}
                                </h3>
                                <p className="text-[10px] mt-1">
                                  {t("तालुका:", "Taluka:")}{" "}
                                  {profile?.taluka || ""},{" "}
                                  {t("जिल्हा:", "District:")}{" "}
                                  {profile?.district || ""}
                                </p>
                                <p className="text-[10px] mb-1">
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
                                <div className="flex justify-between items-center px-4 text-[10px] font-bold mt-2">
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
                                          Number(record.enrolled) || 45;
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

                                <div className="flex justify-between items-center mt-10 px-8 text-[10px] font-bold">
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
                                    <p className="text-[9px] text-slate-500 font-normal">
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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-2 text-slate-800 w-full">
                        <div className="space-y-2">
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

                        <div className="space-y-2">
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

                        <div className="space-y-2">
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
                                  const remainingGoods =
                                    totalGoods - Number(item.used);

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
                              className="border border-black flex-1 overflow-auto print:overflow-visible bg-white print:border-none"
                              id="stock-report-print"
                            >
                              {/* Header */}
                              <div className="flex justify-between items-center text-black border-b border-black p-4 font-sans print:border-b-2">
                                {/* Left Column */}
                                <div className="text-left text-[11px] leading-relaxed w-[30%]">
                                  <p>{t("केंद्र :", "Center :")}</p>
                                  <p className="font-bold">
                                    {t("शाळेचे नाव :", "School Name :")}{" "}
                                    {profile?.schoolName || "A B C"}
                                  </p>
                                  <p>{t("तालुका , जिल्हा", "Tal , Dist.")}</p>
                                </div>

                                {/* Center Column */}
                                <div className="text-center flex flex-col items-center flex-1 w-[40%]">
                                  <p className="text-[11px] font-semibold tracking-wide">
                                    {t(
                                      "प्रधानमंत्री पोषण शक्ती निर्माण योजना",
                                      "Pradhan Mantri Poshan Shakti Nirman Yojana",
                                    )}
                                  </p>
                                  <p className="text-[11px] font-bold text-slate-700 mt-0.5">
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
                                  <div className="border border-black p-2 rounded text-[11px] bg-slate-50 print:bg-white text-left font-medium w-[220px] leading-relaxed">
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
                              <table className="w-full border-collapse text-black text-[9px] text-center table-fixed">
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
                                        className="border-b border-r border-black p-0.5 text-[8.5px] truncate"
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
                                <table className="w-full text-[9px] text-center border-collapse">
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

                {/* 6. DEMAND TAB - Learnify reports-demand.php Exact UI */}
                {activeTab === "demand" && (
                  <div className="space-y-6">
                    {/* Top Control Card matching Screenshot 1 */}
                    <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                            महिने (सन 2026-27)
                          </label>
                          <select
                            value={stockDemandMonth}
                            onChange={(e) => setStockDemandMonth(e.target.value)}
                            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                          >
                            <option value="ऑगस्ट">ऑगस्ट</option>
                            <option value="सप्टेंबर">सप्टेंबर</option>
                            <option value="ऑक्टोबर">ऑक्टोबर</option>
                            <option value="नोव्हेंबर">नोव्हेंबर</option>
                            <option value="डिसेंबर">डिसेंबर</option>
                            <option value="जानेवारी">जानेवारी</option>
                            <option value="फेब्रुवारी">फेब्रुवारी</option>
                            <option value="मार्च">मार्च</option>
                            <option value="एप्रिल">एप्रिल</option>
                            <option value="मे">मे</option>
                            <option value="जून">जून</option>
                            <option value="जुलै">जुलै</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                            पटसंख्या
                          </label>
                          <input
                            type="number"
                            value={stockDemandPatSankhya}
                            onChange={(e) => setStockDemandPatSankhya(e.target.value)}
                            className="w-20 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none text-center"
                          />
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
                          onClick={handleStockDemandPdfDownload}
                          className="px-5 py-2 bg-slate-700 hover:bg-slate-800 text-white font-extrabold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
                        >
                          Download PDF
                        </button>
                      </div>

                      {/* Informational Text Banner matching Screenshot 1 */}
                      <p className="text-[11px] font-medium text-slate-600 leading-snug pt-1 border-t border-slate-100">
                        Open Months : जून, जुलै, ऑगस्ट... चालू महिना आणि मागचे महिने निवडता येतील. निवडल्यानंतर प्रोसेस होण्यास वेळ लागेल. नंतर डाऊनलोड होईल. <span className="font-bold text-slate-800">Download PDF वर क्लिक करून प्रिंट काढताना मधे Save as PDF निवडा.</span>
                      </p>
                    </div>

                    {/* Official Government Stock Demand Report Card matching Screenshot 1 */}
                    <div className="bg-white p-5 md:p-8 rounded-2xl border border-slate-300 shadow-sm space-y-4 print:p-0 print:border-none print:shadow-none">
                      <div id="stock-demand-report-print" className="space-y-1.5 bg-white p-1">
                        {/* Report Top Header */}
                        <div className="text-center space-y-0.5 mb-1.5">
                          <p className="text-xs font-extrabold text-emerald-800 tracking-wide">
                            प्रधानमंत्री पोषण शक्ती निर्माण योजना — साखळी मागणी अहवाल
                          </p>
                          <h2 className="text-xl font-black text-slate-900 tracking-tight">
                            धान्यादी मालाची मागणी
                          </h2>
                          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                            {profile?.schoolName || "Z P SCHOOL DHONDEWADI PED"}
                          </h3>
                          <p className="text-xs font-bold text-slate-800">
                            धान्यादी मालाची मागणी — {stockDemandMonth} 2026 — मध्यवर्ती स्वयंपाकगृह मध्ये : प्राथमिक ( इयत्ता १ ते ५ )
                          </p>
                        </div>

                        {/* 5 Metadata Boxes Grid matching Screenshot 1 */}
                        <div className="grid grid-cols-5 border border-slate-300 text-center text-[11px] font-bold divide-x divide-slate-300 bg-slate-50 mb-1.5 rounded-md overflow-hidden">
                          <div className="p-1">
                            <span className="text-[9px] text-slate-500 font-semibold block">UDISE कोड</span>
                            <span className="text-slate-900 font-extrabold">{getUdise() || "27350800701"}</span>
                          </div>
                          <div className="p-1">
                            <span className="text-[9px] text-slate-500 font-semibold block">केंद्र</span>
                            <span className="text-slate-900 font-extrabold">{profile?.center || "NARSINGPUR"}</span>
                          </div>
                          <div className="p-1">
                            <span className="text-[9px] text-slate-500 font-semibold block">तालुका</span>
                            <span className="text-slate-900 font-extrabold">{profile?.taluka || "तासगाव"}</span>
                          </div>
                          <div className="p-1">
                            <span className="text-[9px] text-slate-500 font-semibold block">जिल्हा</span>
                            <span className="text-slate-900 font-extrabold">{profile?.district || "सांगली"}</span>
                          </div>
                          <div className="p-1">
                            <span className="text-[9px] text-slate-500 font-semibold block">पिन कोड</span>
                            <span className="text-slate-900 font-extrabold">{profile?.pincode || "416312"}</span>
                          </div>
                        </div>

                        {/* Secondary Sub-Info Bar matching Screenshot 1 */}
                        <div className="text-[10px] font-bold text-slate-800 py-1 px-2.5 bg-slate-100/70 border border-slate-300 rounded flex flex-wrap justify-between items-center">
                          <span>पटसंख्या: <strong className="font-extrabold text-slate-900">{stockDemandPatSankhya || "80"}</strong></span>
                          <span>मागणी कालावधी: <strong className="font-extrabold text-slate-900">{stockDemandMonth} 2026</strong></span>
                          <span>आज: <strong className="font-extrabold text-slate-900">28-07-2026</strong></span>
                          <span>मागणी महिना सुरू: <strong className="font-extrabold text-slate-900">01-08-2026</strong></span>
                          <span>उरलेले कार्यदिवस: <strong className="font-extrabold text-slate-900">3</strong></span>
                        </div>

                        {/* 6 Column Official Demand Table matching Screenshot 1 */}
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-black text-center text-[10px]">
                            <thead>
                              <tr className="bg-slate-100 text-slate-900 font-black border-b border-black text-[11px]">
                                <th className="border-r border-black p-1 text-left w-[22%]">साहित्य</th>
                                <th className="border-r border-black p-1 text-right w-[15.6%]">हातावर साठा</th>
                                <th className="border-r border-black p-1 text-right w-[15.6%]">अपेक्षित वापर<br/><span className="text-[9px] font-normal">(उरलेले दिवस)</span></th>
                                <th className="border-r border-black p-1 text-right w-[15.6%]">अपेक्षित शिल्लक<br/><span className="text-[9px] font-normal">(हातावर - वापर)</span></th>
                                <th className="border-r border-black p-1 text-right w-[15.6%]">महिण्याची आवश्यकता</th>
                                <th className="border-r border-black p-1 text-right w-[15.6%] font-black">अंतिम मागणी</th>
                              </tr>
                            </thead>
                              <tbody>
                                {(() => {
                                  const pat = parseFloat(stockDemandPatSankhya) || 80;

                                  const demandItemDefs = [
                                    { itemKey: "Rice", name: "तांदूळ (kg)", qty15: 0.100 },
                                    { itemKey: "Mugdal", name: "मूगडाळ (kg)", qty15: 0.020 },
                                    { itemKey: "Turdal", name: "तूरडाळ (kg)", qty15: 0.020 },
                                    { itemKey: "Masurdal", name: "मसूरडाळ (kg)", qty15: 0.020 },
                                    { itemKey: "Matki", name: "मटकी (kg)", qty15: 0.020 },
                                    { itemKey: "Moong", name: "अख्खा मूग (kg)", qty15: 0.020 },
                                    { itemKey: "Cowpea", name: "चवळी (kg)", qty15: 0.020 },
                                    { itemKey: "Gram", name: "हरभरा (kg)", qty15: 0.020 },
                                    { itemKey: "Pease", name: "वाटाणा (kg)", qty15: 0.020 },
                                    { itemKey: "Soyabean Wadi", name: "सोयाबीन वडी (kg)", qty15: 0.020 },
                                    { itemKey: "Cumin", name: "जिरे (kg)", qty15: 0.0004 },
                                    { itemKey: "Mustard", name: "मोहरी (kg)", qty15: 0.0004 },
                                    { itemKey: "Turmeric", name: "हळद (kg)", qty15: 0.0004 },
                                    { itemKey: "Onion Garlic Masala", name: "तीट मसाला / कांदा लसूण मसाला (kg)", qty15: 0.0008 },
                                    { itemKey: "Salt", name: "मीठ (kg)", qty15: 0.004 },
                                    { itemKey: "Oil", name: "तेल (kg)", qty15: 0.005495 },
                                    { itemKey: "Vegetables", name: "भाजीपाला (kg)", qty15: 0.010 },
                                  ];

                                  const marToEngMonth: Record<string, string> = {
                                    "ऑगस्ट": "August", "सप्टेंबर": "September", "ऑक्टोबर": "October", "नोव्हेंबर": "November",
                                    "डिसेंबर": "December", "जानेवारी": "January", "फेब्रुवारी": "February", "मार्च": "March",
                                    "एप्रिल": "April", "मे": "May", "जून": "June", "जुलै": "July"
                                  };
                                  const selMonthEng = marToEngMonth[stockDemandMonth] || "August";

                                  return demandItemDefs.map((it, idx) => {
                                    const stock = getOpeningStock(selMonthEng, "2026", "1 To 5", it.itemKey);
                                    const rule = quantityRules.find(r => r.item.toLowerCase() === it.itemKey.toLowerCase());
                                    const qVal = rule ? parseFloat(rule.qty15) || it.qty15 : it.qty15;
                                    const unitQty = qVal >= 1 ? qVal / 1000 : qVal;

                                    const expUsed = unitQty * pat * 3;
                                    const reqMonth = unitQty * pat * 20;
                                    const expBal = stock - expUsed;
                                    const finalDemand = Math.max(0, reqMonth - expBal);

                                    return (
                                      <tr key={idx} className="border-b border-black h-5 text-right font-medium hover:bg-slate-50">
                                        <td className="border-r border-black px-1.5 py-0.5 text-[9px] text-left font-bold text-slate-900">{it.name}</td>
                                        <td className="border-r border-black px-1.5 py-0.5 text-[9px]">{stock.toFixed(4)}</td>
                                        <td className="border-r border-black px-1.5 py-0.5 text-[9px]">{expUsed.toFixed(4)}</td>
                                        <td className="border-r border-black px-1.5 py-0.5 text-[9px]">{expBal.toFixed(4)}</td>
                                        <td className="border-r border-black px-1.5 py-0.5 text-[9px]">{reqMonth.toFixed(4)}</td>
                                        <td className="border-r border-black px-1.5 py-0.5 text-[9px] font-extrabold text-slate-900">{finalDemand.toFixed(4)}</td>
                                      </tr>
                                    );
                                  });
                                })()}
                            </tbody>
                          </table>
                        </div>

                        {/* Bottom Note & Signature matching Screenshot 1 */}
                        <div className="pt-1 space-y-1">
                          <p className="text-[9px] font-bold text-slate-700 bg-amber-50/50 p-1.5 border border-slate-300 rounded">
                            महिने नोंदवताना शाळेकडे असलेल्या शिल्लक साठ्याची खात्री करून मागणी नोंदवावी. नोंदवलेली माहिती नंतर बदलता येणार नाही.
                          </p>

                          <div className="flex justify-end pt-1">
                            <div className="text-center space-y-3">
                              <p className="font-extrabold text-xs text-slate-900">मुख्याध्यापक/सचिव<br/><span className="text-[10px] text-slate-600">शालेय पोषण आहार समिती</span></p>
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
                            className="border border-black flex-1 overflow-auto bg-white p-6 print:border-none print:p-0"
                            id="demand-report-print"
                          >
                            {/* Header */}
                            <div className="text-center text-black pb-4 border-b border-dashed border-slate-400">
                              <h3 className="font-bold text-lg tracking-wider">
                                {profile?.schoolName || "A B C"}
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

                      {/* Informational Banner text matching Screenshot 2 */}
                      <p className="text-[11px] font-medium text-slate-600 leading-snug pt-1 border-t border-slate-100">
                        Download PDF. उत्तर वर क्लिक करून प्रिंट काढताना मध्ये <span className="font-bold text-slate-800">Save as PDF निवडा.</span>
                      </p>
                    </div>

                    {/* Official Monthly MDM Report Container matching Screenshot 2 */}
                    <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-300 shadow-sm space-y-3 print:p-0 print:border-none print:shadow-none">
                      <div id="monthly-mdm-report-print" className="space-y-2 bg-white p-2 text-slate-900 font-sans">

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
                            "Salt", "Chili", "Garam Masala", "Oil"
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
                              <div key={`page-${startDay}`} className="mb-6">
                                {isFirstPage && (
                                  <div className="text-center mb-2">
                                    <h2 className="text-[11px] font-black text-slate-900 tracking-tight uppercase">प्रधानमंत्री पोषण शक्ती निर्माण योजना — पोषण आहार दैनंदिन नोंदी</h2>
                                    <h3 className="text-[10px] font-extrabold text-slate-900">पोषण आहार दैनंदिन नोंदी</h3>
                                    <p className="text-[9px] font-bold text-slate-700">{schoolName}</p>
                                    <p className="text-[8.5px] font-semibold text-slate-600">पोषण आहार दैनंदिन नोंदी — {monthYearStr} · प्राथमिक ( इयत्ता १ ते ५ )</p>
                                    <div className="grid grid-cols-5 border border-black text-[8px] font-bold mt-1.5 text-center divide-x divide-black">
                                      <div className="p-0.5">UDISE कोड<br/><span className="font-black">{profile?.udise || getUdise() || ""}</span></div>
                                      <div className="p-0.5">केंद्र<br/><span className="font-black">{profile?.kendra || profile?.center || ""}</span></div>
                                      <div className="p-0.5">तालुका<br/><span className="font-black">{profile?.taluka || ""}</span></div>
                                      <div className="p-0.5">जिल्हा<br/><span className="font-black">{profile?.district || ""}</span></div>
                                      <div className="p-0.5">पिन कोड<br/><span className="font-black">{profile?.pinCode || profile?.pincode || ""}</span></div>
                                    </div>
                                    <div className="mt-1 border border-black text-[8px] font-bold text-left p-0.5">
                                      <span className="font-black">मागील शिल्लक :</span> तांदूळ — <span className="font-black">{prevRiceStock.toFixed(4)}</span> kg
                                    </div>
                                  </div>
                                )}

                                <div className="text-[9px] font-black text-slate-800 mb-1 text-left border-b border-slate-400 pb-0.5">
                                  {monthYearStr} — दिनांक {isFirstPage ? "१–१५" : `१६–${daysInMonth}`}
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full border-collapse border border-black text-center text-[7px] font-medium" style={{tableLayout: 'fixed'}}>
                                    <thead>
                                      <tr className="bg-slate-100 text-slate-900 font-bold border-b border-black">
                                        {colHeaders.map((h, idx) => (
                                          <th key={idx} className="border-r border-black p-0.5 leading-tight whitespace-pre-wrap" style={{fontSize: '6.5px', width: idx < 3 ? '3.2%' : idx < 6 ? '3.4%' : '3%'}}>
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
                                          <tr key={day} className={`border-b border-black h-4 ${isSunday || daily.isHoliday ? "bg-red-50/50" : rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                                            <td className="border-r border-black py-0 text-[7px] font-bold">{rowIdx + 1}</td>
                                            <td className="border-r border-black py-0 text-[7px] font-semibold">{String(day).padStart(2,'0')}/{String(monthNum).padStart(2,'0')}</td>
                                            <td className={`border-r border-black py-0 text-[7px] font-semibold ${isSunday || daily.isHoliday ? "text-red-600 font-bold" : ""}`}>{weekday}</td>
                                            <td className="border-r border-black py-0 font-semibold">{daily.isHoliday || !daily.enrolled ? "" : daily.enrolled}</td>
                                            <td className="border-r border-black py-0 font-bold">{daily.isHoliday || bene === 0 ? "" : bene}</td>
                                            <td className="border-r border-black py-0 font-bold">{daily.isHoliday || bene === 0 ? "" : bene}</td>
                                            {itemKeysOrder.map((itemKey) => {
                                              if (daily.isHoliday || bene === 0) return <td key={itemKey} className="border-r border-black py-0"></td>;
                                              const wasSelected = daily.selectedItems ? !!daily.selectedItems[itemKey] : true;
                                              if (!wasSelected) return <td key={itemKey} className="border-r border-black py-0"></td>;
                                              const rule = quantityRules.find(r => r.item.toLowerCase() === itemKey.toLowerCase());
                                              const qStr = rule ? rule.qty15 : "0.02";
                                              const qVal = parseFloat(qStr) || 0;
                                              const qKg = qVal >= 1 ? qVal / 1000 : qVal;
                                              const usedKg = qKg * bene;
                                              if (itemKey === "Rice") monthlyTotalRiceUsed += usedKg;
                                              return (
                                                <td key={itemKey} className="border-r border-black py-0 text-[6.5px]">
                                                  {usedKg > 0 ? usedKg.toFixed(3) : ""}
                                                </td>
                                              );
                                            })}
                                            <td className="border-r border-black py-0"></td>
                                            <td className="border-r border-black py-0"></td>
                                            <td className="border-r border-black py-0"></td>
                                            <td className="border-r border-black py-0 text-[6.5px]">{bene > 0 ? (bene * 0.01).toFixed(2) : ""}</td>
                                            <td className="border-r border-black py-0 text-[6px]">{bene > 0 ? "अंडी/केळी" : ""}</td>
                                            <td className="border-r border-black py-0 text-[6.5px] font-bold">{bene > 0 ? (bene * (parseFloat(primaryRate) || 5.45)).toFixed(2) : ""}</td>
                                          </tr>
                                        );
                                      })}

                                      {!isFirstPage && (
                                        <tr className="border-b border-black bg-amber-50 font-black text-[7px]">
                                          <td className="border-r border-black p-0.5 font-black text-left" colSpan={3}>एकूण</td>
                                          <td className="border-r border-black p-0.5"></td>
                                          <td className="border-r border-black p-0.5">{monthlyTotalTat}</td>
                                          <td className="border-r border-black p-0.5">{monthlyTotalTat}</td>
                                          <td className="border-r border-black p-0.5">{monthlyTotalRiceUsed.toFixed(3)}</td>
                                          {Array.from({length: 23}, (_, ci) => (
                                            <td key={ci} className="border-r border-black p-0.5"></td>
                                          ))}
                                          <td className="border-r border-black p-0.5">{monthlyTotalGrant.toFixed(2)}</td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>

                                {!isFirstPage && (
                                  <div className="mt-2 space-y-1.5">
                                    <div className="text-[8px] font-bold border border-black p-1 bg-slate-50">
                                      <div className="flex justify-between">
                                        <span>शिल्लक धान्यादी :</span>
                                        <span className="font-black">तांदूळ — {Math.max(0, prevRiceStock - monthlyTotalRiceUsed).toFixed(3)} kg</span>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-[8px] font-bold border border-black divide-x divide-black">
                                      <div className="p-1">महिन्यातील एकूण ताटांची संख्या : <span className="font-black">{monthlyTotalTat}</span></div>
                                      <div className="p-1">इंधन व भाजीपाल्यासाठी खर्च केलेले अनुदान रु. : <span className="font-black">₹{monthlyTotalGrant.toFixed(2)}</span></div>
                                    </div>
                                    <div className="text-[8px] font-semibold border border-black p-1 bg-slate-50 text-slate-700">
                                      (दैनंदिन नोंदवही — वापरलेली ताटे × प्रति ताट अनुदान)
                                    </div>
                                    <div className="text-[8px] font-bold border border-black p-1">
                                      स्वयंपाकी तथा मदतनीस मानधन रु. : <span className="font-black">₹{(helpers.length * 1000).toFixed(2)}</span>
                                      <span className="text-[7px] font-semibold text-slate-500 ml-2">(ताटांची संख्या × दर) (शासनस्तरावरून निश्चित केल्यानुसार)</span>
                                    </div>
                                    <div className="text-[8px] font-semibold border border-slate-400 p-1 bg-amber-50/40 text-slate-800">
                                      प्रमाणित करण्यात येते, की वर नमूद केलेली माहिती दैनंदिन नोंदवहीवरून घेतलेली आहे. ती तपासली आहे व बरोबर आहे.
                                    </div>
                                    <div className="flex items-end justify-between pt-3 text-[9px] font-bold">
                                      <div>
                                        <p>Date : {new Date().toLocaleDateString('en-GB')}</p>
                                      </div>
                                      <div className="text-center">
                                        <p className="font-black">मुख्याध्यापक/सचिव</p>
                                        <p className="text-[8px] font-semibold text-slate-600">शालेय व्यवस्थापन समिती</p>
                                        <p className="text-[7px] text-slate-400 mt-0.5">{schoolName}</p>
                                      </div>
                                    </div>
                                    <p className="text-[7.5px] text-center text-slate-400 font-semibold pt-1">This report is generated by Learnify Academy MDM Portal</p>
                                  </div>
                                )}
                              </div>
                            );
                          };

                          return (
                            <div className="space-y-0">
                              {renderPage(1, 15, true)}
                              <div className="border-t-2 border-dashed border-slate-300 my-4 print:border-none" />
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
                          const schoolName = profile?.schoolName || "Z P SCHOOL DHONDEWADI PED";

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

                          const pudheManagi = Math.max(0, parseFloat(((labharthi > 0 ? labharthi : 45) * 0.1 * 20 - shillakTandul).toFixed(1)));
                          const pat = 45;

                          return (
                            <div className="space-y-2">
                              <div className="text-center space-y-0.5 mb-2">
                                <p className="text-[9px] font-bold text-slate-700">पंचायत समिती {profile?.taluka || ""} ( शिक्षण विभाग {profile?.district || ""} )</p>
                                <h2 className="text-[11px] font-black text-slate-900 tracking-tight uppercase">प्रधानमंत्री पोषण शक्ती निर्माण योजना तांदूळ शिजवून दिल्याचा अहवाल (सन {year}/{String(year+1).slice(-2)})</h2>
                              </div>

                              <div className="text-[9px] font-bold border border-black grid grid-cols-2 gap-0 divide-x divide-black">
                                <div className="p-1 space-y-0.5">
                                  <div>शाळेचे नाव : <span className="font-black">{schoolName}</span></div>
                                  <div>इयत्ता गट : <span className="font-black">प्राथमिक ( इयत्ता १ ते ५ )</span></div>
                                  <div>केंद्र : <span className="font-black">{profile?.kendra || profile?.center || ""}</span></div>
                                </div>
                                <div className="p-1 space-y-0.5">
                                  <div>बीट : <span className="font-black">{profile?.kendra || profile?.center || ""}</span></div>
                                  <div>ता. : <span className="font-black">{profile?.taluka || ""}</span></div>
                                  <div>जि. : <span className="font-black">{profile?.district || ""}</span></div>
                                </div>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full border-collapse border border-black text-center text-[7.5px] font-medium">
                                  <thead>
                                    <tr className="bg-slate-100 text-slate-900 font-bold border-b border-black text-[7px]">
                                      <th className="border-r border-black p-0.5" rowSpan={2}>अ.न.<br/><span className="font-normal">1</span></th>
                                      <th className="border-r border-black p-0.5" rowSpan={2}>शाळेचे नाव<br/><span className="font-normal">2</span></th>
                                      <th className="border-r border-black p-0.5" rowSpan={2}>पट<br/><span className="font-normal">3</span></th>
                                      <th className="border-r border-black p-0.5" rowSpan={2}>लाभार्थी<br/><span className="font-normal">4</span></th>
                                      <th className="border-r border-black p-0.5 bg-blue-50" colSpan={4}>तांदूळ स्थिती (KG)<br/><span className="font-normal">5</span></th>
                                      <th className="border-r border-black p-0.5" rowSpan={2}>या महिन्यात शिजवून दिलेला तांदूळ (KG)<br/><span className="font-normal">9</span></th>
                                      <th className="border-r border-black p-0.5" rowSpan={2}>उसना परत केलेला तांदूळ (KG)<br/><span className="font-normal">10</span></th>
                                      <th className="border-r border-black p-0.5" rowSpan={2}>शिल्लक तांदूळ (KG)<br/><span className="font-normal">11</span></th>
                                      <th className="border-r border-black p-0.5 bg-green-50" colSpan={3}>शा.पो.आ. शिजवण्यासाठी चालू महिन्याचा खर्च</th>
                                      <th className="border-r border-black p-0.5" rowSpan={2}>कामाचे दिवस<br/><span className="font-normal">15</span></th>
                                      <th className="border-r border-black p-0.5" rowSpan={2}>प्रत्यक्ष शा.पो.आ. शिजवून दिल्याचे दिवस<br/><span className="font-normal">16</span></th>
                                      <th className="border-r border-black p-0.5" rowSpan={2}>पुढील मागणी (KG)<br/><span className="font-normal">17</span></th>
                                    </tr>
                                    <tr className="bg-slate-100 text-slate-900 font-bold border-b border-black text-[7px]">
                                      <th className="border-r border-black p-0.5 bg-blue-50">मागील शिल्लक तांदूळ<br/><span className="font-normal">6</span></th>
                                      <th className="border-r border-black p-0.5 bg-blue-50">प्राप्त तांदूळ<br/><span className="font-normal">7</span></th>
                                      <th className="border-r border-black p-0.5 bg-blue-50">उसना घेतलेला तांदूळ<br/><span className="font-normal">8</span></th>
                                      <th className="border-r border-black p-0.5 bg-blue-50">एकूण तांदूळ<br/><span className="font-normal">(6+7+8)</span></th>
                                      <th className="border-r border-black p-0.5 bg-green-50">केंद्र हिस्सा<br/>1.56<br/><span className="font-normal">12</span></th>
                                      <th className="border-r border-black p-0.5 bg-green-50">राज्य हिस्सा<br/>1.03<br/><span className="font-normal">13</span></th>
                                      <th className="border-r border-black p-0.5 bg-green-50">2.59<br/><span className="font-normal">14</span></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr className="border-b border-black hover:bg-amber-50/20 font-semibold">
                                      <td className="border-r border-black p-0.5 font-black">1</td>
                                      <td className="border-r border-black p-0.5 text-left font-bold text-[7px] leading-tight">{schoolName}</td>
                                      <td className="border-r border-black p-0.5 font-black">{pat}</td>
                                      <td className="border-r border-black p-0.5 font-black">{labharthi}</td>
                                      <td className="border-r border-black p-0.5">{prevTandul.toFixed(1)}</td>
                                      <td className="border-r border-black p-0.5">{recTandul || ""}</td>
                                      <td className="border-r border-black p-0.5">0</td>
                                      <td className="border-r border-black p-0.5 font-black">{totalTandul.toFixed(1)}</td>
                                      <td className="border-r border-black p-0.5 font-black">{shijvunTandul.toFixed(1)}</td>
                                      <td className="border-r border-black p-0.5">0</td>
                                      <td className="border-r border-black p-0.5 font-black text-red-700">{shillakTandul.toFixed(1)}</td>
                                      <td className="border-r border-black p-0.5">{kendraHissa.toFixed(2)}</td>
                                      <td className="border-r border-black p-0.5">{rajyaHissa.toFixed(2)}</td>
                                      <td className="border-r border-black p-0.5 font-black">{ekunKharc.toFixed(2)}</td>
                                      <td className="border-r border-black p-0.5">{shijvunDivs}</td>
                                      <td className="border-r border-black p-0.5 font-black">{pudheManagi}</td>
                                    </tr>
                                    <tr className="border-b border-black bg-slate-100 font-black text-[8px]">
                                      <td className="border-r border-black p-0.5 text-left font-black" colSpan={2}>एकूण</td>
                                      <td className="border-r border-black p-0.5">{pat}</td>
                                      <td className="border-r border-black p-0.5">{labharthi}</td>
                                      <td className="border-r border-black p-0.5">{prevTandul.toFixed(1)}</td>
                                      <td className="border-r border-black p-0.5">{recTandul || ""}</td>
                                      <td className="border-r border-black p-0.5">{usnaTandul || ""}</td>
                                      <td className="border-r border-black p-0.5">{totalTandul.toFixed(1)}</td>
                                      <td className="border-r border-black p-0.5">{shijvunTandul.toFixed(1)}</td>
                                      <td className="border-r border-black p-0.5">{usnaParatTandul || ""}</td>
                                      <td className="border-r border-black p-0.5 text-red-700">{shillakTandul.toFixed(1)}</td>
                                      <td className="border-r border-black p-0.5">{kendraHissa.toFixed(2)}</td>
                                      <td className="border-r border-black p-0.5">{rajyaHissa.toFixed(2)}</td>
                                      <td className="border-r border-black p-0.5">{ekunKharc.toFixed(2)}</td>
                                      <td className="border-r border-black p-0.5">{kamacheDivs}</td>
                                      <td className="border-r border-black p-0.5">{shijvunDivs}</td>
                                      <td className="border-r border-black p-0.5">{pudheManagi}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>

                              <div className="text-[9px] font-bold border border-black p-1 bg-amber-50/40">
                                अक्षरी रु. : <span className="font-black">{numberToMarathiWords(ekunKharc)}</span>
                              </div>

                              <div className="flex items-end justify-between pt-4 text-[9px] font-bold">
                                <div><p>Date : {new Date().toLocaleDateString('en-GB')}</p></div>
                                <div className="text-center">
                                  <p className="font-black">मुख्याध्यापक</p>
                                  <p className="text-[7px] text-slate-400 mt-0.5">{schoolName}</p>
                                </div>
                              </div>
                              <p className="text-[7.5px] text-center text-slate-400 font-semibold">This report is generated by Learnify Academy MDM Portal</p>
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
                          const schoolName = profile?.schoolName || "Z P SCHOOL DHONDEWADI PED";

                          const itemDefs = [
                            { sr: 1,  key: "Rice", name: "तांदूळ" },
                            { sr: 2,  key: "Mugdal", name: "मूगडाळ" },
                            { sr: 3,  key: "Turdal", name: "तूरडाळ" },
                            { sr: 4,  key: "Masurdal", name: "मसूरडाळ" },
                            { sr: 5,  key: "Matki", name: "मटकी" },
                            { sr: 6,  key: "Moong", name: "अख्खा मूग" },
                            { sr: 7,  key: "Cowpea", name: "चवळी" },
                            { sr: 8,  key: "Gram", name: "हरभरा" },
                            { sr: 9,  key: "Pease", name: "वाटाणा" },
                            { sr: 10, key: "Soyabean Wadi", name: "सोयाबीन वडी" },
                            { sr: 11, key: "Cumin", name: "जिरे" },
                            { sr: 12, key: "Mustard", name: "मोहरी" },
                            { sr: 13, key: "Turmeric", name: "हळद" },
                            { sr: 14, key: "Onion Garlic Masala", name: "तिखट मसाला/कांदा लसूण मसाला" },
                            { sr: 15, key: "Salt", name: "मीठ" },
                            { sr: 16, key: "Chili", name: "मिरची पावडर" },
                            { sr: 17, key: "Garam Masala", name: "गरम मसाला" },
                            { sr: 18, key: "Oil", name: "तेल" },
                            { sr: 19, key: "Sugar", name: "गूळ / साखर" },
                            { sr: 20, key: "Milk", name: "दूध पावडर" },
                            { sr: 21, key: "Ragi", name: "नाचणी सत्त्व" },
                            { sr: 22, key: "Vegetables", name: "भाजीपाला" },
                          ];

                          const items = itemDefs.map(def => {
                            const prev = getOpeningStock(engMonthNames[monthNum], year.toString(), "1 To 5", def.key);
                            const rec = getIncomingForItem(def.key, engMonthNames[monthNum], year, "1 To 5");
                            const used = getUsedForMonth(engMonthNames[monthNum], year.toString(), "1 To 5", def.key);
                            const demand = Math.max(0, (45 * 0.02 * 20) - (prev + rec - used));
                            return { sr: def.sr, name: def.name, prev, rec, used, demand: parseFloat(demand.toFixed(2)) };
                          });

                          const riceData = getStockDataForItem("Rice", engMonthNames[monthNum], year, "1 To 5");
                          const labharthi = riceData.beneficiary;
                          const cookedDays = riceData.cookedDays;

                          const rateVal = parseFloat(primaryRate) || 5.45;
                          const vegCost = parseFloat((labharthi * (rateVal * (parseFloat(vegPercent) || 70) / 100)).toFixed(2));
                          const fuelCost = parseFloat((labharthi * (rateVal * (parseFloat(fuelPercent) || 30) / 100)).toFixed(2));
                          const ekunGrant = vegCost + fuelCost;

                          return (
                            <div className="space-y-2">
                              <div className="text-center space-y-0.5 mb-2">
                                <h2 className="text-[12px] font-black text-slate-900 tracking-tight">
                                  प्रधानमंत्री पोषण शक्ती निर्माण योजना : प्रपत्र (ब)
                                </h2>
                                <p className="text-[9px] font-bold text-slate-700">शाळेने केंद्रप्रमुखांना दरमहा द्यावयाचा अहवाल ( २ प्रती )</p>
                              </div>

                              <div className="border border-black text-[9px] font-bold">
                                <div className="grid grid-cols-3 divide-x divide-black border-b border-black">
                                  <div className="p-1">शाळेचे नाव : <span className="font-black">{schoolName}</span></div>
                                  <div className="p-1">इयत्ता गट : <span className="font-black">प्राथमिक ( इयत्ता १ ते ५ )</span></div>
                                  <div className="p-1">केंद्र : <span className="font-black">{profile?.kendra || profile?.center || ""}</span></div>
                                </div>
                                <div className="grid grid-cols-3 divide-x divide-black border-b border-black">
                                  <div className="p-1">बीट : <span className="font-black">{profile?.kendra || profile?.center || ""}</span></div>
                                  <div className="p-1">ता. : <span className="font-black">{profile?.taluka || ""}</span></div>
                                  <div className="p-1">जिल्हा : <span className="font-black">{profile?.district || ""}</span></div>
                                </div>
                                <div className="grid grid-cols-3 divide-x divide-black border-b border-black">
                                  <div className="p-1">माहे : <span className="font-black">{monthlyMdmReportMonth}</span></div>
                                  <div className="p-1">पटसंख्या (१ ते ५) : <span className="font-black">45</span></div>
                                  <div className="p-1">एकूण लाभार्थी संख्या : <span className="font-black">{labharthi}</span></div>
                                </div>
                                <div className="grid grid-cols-3 divide-x divide-black">
                                  <div className="p-1">एकूण कामाचे दिवस : <span className="font-black">{cookedDays}</span></div>
                                  <div className="p-1">शिजवून दिलेले दिवस : <span className="font-black">{cookedDays}</span></div>
                                  <div className="p-1">तांदूळ व धान्याधी माल प्राप्त दिनांक : <span className="font-black">01-{String(monthNum).padStart(2,'0')}-{year}</span></div>
                                </div>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full border-collapse border border-black text-center text-[9px] font-medium">
                                  <thead>
                                    <tr className="bg-slate-100 text-slate-900 font-bold border-b border-black text-[9px]">
                                      <th className="border-r border-black p-1 w-[4%]">अ.न.<br/><span className="font-normal text-[8px]">1</span></th>
                                      <th className="border-r border-black p-1 text-left w-[20%]">धान्यादी मालाचे नाव<br/><span className="font-normal text-[8px]">2</span></th>
                                      <th className="border-r border-black p-1 w-[10%]">मागील शिल्लक वस्तू<br/><span className="text-[7px] font-normal">( किलोग्रॅम )</span><br/><span className="font-normal text-[8px]">3</span></th>
                                      <th className="border-r border-black p-1 w-[10%]">चालू महिन्यात प्राप्त वस्तू<br/><span className="text-[7px] font-normal">( किलोग्रॅम )</span><br/><span className="font-normal text-[8px]">4</span></th>
                                      <th className="border-r border-black p-1 w-[10%]">एकूण वस्तू<br/><span className="text-[7px] font-normal">( 3 + 4 ) ( किलोग्रॅम )</span><br/><span className="font-normal text-[8px]">5</span></th>
                                      <th className="border-r border-black p-1 w-[13%]">अन्न शिजवण्यासाठी वापरलेल्या वस्तू<br/><span className="text-[7px] font-normal">( किलोग्रॅम )</span><br/><span className="font-normal text-[8px]">6</span></th>
                                      <th className="border-r border-black p-1 w-[10%]">शिल्लक वस्तू<br/><span className="text-[7px] font-normal">( 5 - 6 ) ( किलोग्रॅम )</span><br/><span className="font-normal text-[8px]">7</span></th>
                                      <th className="border-r border-black p-1 w-[10%]">पुढील महिन्यासाठी मागणी<br/><span className="text-[7px] font-normal">( किलोग्रॅम )</span><br/><span className="font-normal text-[8px]">8</span></th>
                                      <th className="border-r border-black p-1 w-[8%]">शेरा<br/><span className="font-normal text-[8px]">9</span></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {items.map((row) => {
                                      const total = row.prev + row.rec;
                                      const bal = total - row.used;
                                      return (
                                        <tr key={row.sr} className={`border-b border-black h-5 ${row.sr % 2 === 0 ? "bg-slate-50/30" : "bg-white"} hover:bg-amber-50/20`}>
                                          <td className="border-r border-black py-0.5 text-[9px]">{row.sr}</td>
                                          <td className="border-r border-black py-0.5 text-left font-bold text-slate-900 pl-1 text-[9px]">{row.name}</td>
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

                              <p className="text-[8.5px] font-semibold border border-slate-400 bg-amber-50/40 p-1 text-slate-800">
                                मागणी नोंदवताना शाळेकडे वीस दिवसांचा साठा शिल्लक राहील याची दक्षता घेवून मागणी नोंदवावी, जास्त साठा करून धान्य खराब होणार नाही याची दक्षता घ्यावी.
                              </p>

                              <div className="border border-slate-400 divide-y divide-slate-400 bg-amber-50/20 text-slate-900 text-[9px] font-bold">
                                <div className="grid grid-cols-3 divide-x divide-slate-400 p-1 text-center">
                                  <div></div>
                                </div>
                                <div className="grid grid-cols-3 divide-x divide-slate-400 p-1 text-center">
                                  <div>खर्च केलेले एकूण अनुदान रु. : <strong className="font-black">₹238.28</strong></div>
                                  <div>इंधन (0.88 पै.) : <strong className="font-black">₹80.96</strong></div>
                                  <div></div>
                                </div>
                                <div className="grid grid-cols-3 divide-x divide-slate-400 p-1 text-center">
                                  <div>स्वयंपाकी तथा मदतनीस मानधन रु. : <strong className="font-black">—</strong></div>
                                  <div>पूरक आहार (0.73 पै.) : <strong className="font-black">₹67.16</strong></div>
                                  <div></div>
                                </div>
                              </div>

                              {/* Signature */}
                              <div className="flex items-end justify-between pt-3 text-[9px] font-bold">
                                <div><p>Date : __________</p></div>
                                <div className="text-center">
                                  <p className="font-black">मुख्याध्यापक</p>
                                  <p className="text-[7.5px] text-slate-500 mt-0.5">{schoolName}</p>
                                </div>
                              </div>
                              <p className="text-[7.5px] text-center text-slate-400 font-semibold">This report is generated by Learnify Academy MDM Portal</p>
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
                          const schoolName = profile?.schoolName || "Z P SCHOOL DHONDEWADI PED";
                          const shasDar = 2.59;
                          const kendraRate = 1.56;
                          const rajyaRate = 1.03;

                          // Generate daily data
                          const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
                            const day = i + 1;
                            const date = new Date(year, monthNum - 1, day);
                            const weekday = marDays[date.getDay()];
                            const isSunday = date.getDay() === 0;
                            // Sample: Day 23 → pat=100, labharthi=90; Day 24 → pat=23, labharthi=2; else 0
                            let pat = 0, labharthi = 0;
                            if (day === 23) { pat = 100; labharthi = 90; }
                            else if (day === 24) { pat = 23; labharthi = 2; }
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
                            <div className="space-y-2">
                              {/* Title */}
                              <div className="text-center space-y-0.5 mb-2">
                                <p className="text-[9px] font-bold text-slate-700">पंचायत समिती _______________ ( शिक्षण विभाग _______________ )</p>
                                <h2 className="text-[11px] font-black text-slate-900 tracking-tight">
                                  प्रधानमंत्री पोषण शक्ती निर्माण योजना तांदूळ शिजवून दिल्याचे बिल (सन {year}/{String(year + 1).slice(-2)})
                                </h2>
                              </div>

                              {/* School Info */}
                              <div className="text-[9px] font-bold border border-black grid grid-cols-2 gap-0 divide-x divide-black">
                                <div className="p-1 space-y-0.5">
                                  <div>शाळेचे नाव : <span className="font-black">{schoolName}</span></div>
                                  <div>इयत्ता गट : <span className="font-black">प्राथमिक ( इयत्ता १ ते ५ )</span></div>
                                  <div>केंद्र : <span className="font-black">{profile?.kendra || "NARSINGPUR"}</span></div>
                                </div>
                                <div className="p-1 space-y-0.5">
                                  <div>बीट : <span className="font-black">{profile?.kendra || "NARSINGPUR"}</span></div>
                                  <div>ता. : <span className="font-black">{profile?.taluka || "तासगाव"}</span></div>
                                  <div>जि. : <span className="font-black">{profile?.district || "सांगली"}</span></div>
                                </div>
                              </div>

                              {/* Daily Bill Table */}
                              <div className="overflow-x-auto">
                                <table className="w-full border-collapse border border-black text-center text-[8px] font-medium">
                                  <thead>
                                    <tr className="bg-slate-100 text-slate-900 font-bold border-b border-black text-[7.5px]">
                                      <th className="border-r border-black p-0.5" rowSpan={2}>अ.न.</th>
                                      <th className="border-r border-black p-0.5" rowSpan={2}>वार</th>
                                      <th className="border-r border-black p-0.5" rowSpan={2}>दिनांक</th>
                                      <th className="border-r border-black p-0.5" rowSpan={2}>पटसंख्या</th>
                                      <th className="border-r border-black p-0.5" rowSpan={2}>एकूण<br/>लाभार्थी</th>
                                      <th className="border-r border-black p-0.5" rowSpan={2}>शासन दर<br/>(2.59 रु.)</th>
                                      <th className="border-r border-black p-0.5 bg-green-50" colSpan={2}>अनुदान वर्गीकरण</th>
                                      <th className="border-r border-black p-0.5" rowSpan={2}>एकूण अनुदान<br/>(2.59 रु.)</th>
                                      <th className="border-r border-black p-0.5" rowSpan={2}>शेरा</th>
                                    </tr>
                                    <tr className="bg-slate-100 text-slate-900 font-bold border-b border-black text-[7.5px]">
                                      <th className="border-r border-black p-0.5 bg-green-50">केंद्र हिस्सा<br/>1.56</th>
                                      <th className="border-r border-black p-0.5 bg-green-50">राज्य हिस्सा<br/>1.03</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {dailyData.map((d) => (
                                      <tr key={d.day} className={`border-b border-black h-[18px] ${d.isSunday ? "bg-red-50/40 text-red-700" : "hover:bg-amber-50/20"}`}>
                                        <td className="border-r border-black py-0 px-0.5 text-[8px]">{d.day}</td>
                                        <td className="border-r border-black py-0 px-0.5 text-[7.5px] font-semibold">{d.weekday}</td>
                                        <td className="border-r border-black py-0 px-0.5 text-[7.5px]">{d.date}</td>
                                        <td className="border-r border-black py-0 px-0.5 font-bold">{d.pat > 0 ? d.pat : ""}</td>
                                        <td className="border-r border-black py-0 px-0.5 font-bold">{d.labharthi > 0 ? d.labharthi : ""}</td>
                                        <td className="border-r border-black py-0 px-0.5">{shasDar}</td>
                                        <td className="border-r border-black py-0 px-0.5">{d.kendra > 0 ? d.kendra.toFixed(2) : "0"}</td>
                                        <td className="border-r border-black py-0 px-0.5">{d.rajya > 0 ? d.rajya.toFixed(2) : "0"}</td>
                                        <td className="border-r border-black py-0 px-0.5 font-bold">{d.ekun > 0 ? d.ekun.toFixed(2) : "0"}</td>
                                        <td className="border-r border-black py-0 px-0.5"></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Totals Summary */}
                              <div className="border border-black text-[9px] font-bold">
                                <div className="grid grid-cols-4 divide-x divide-black border-b border-black">
                                  <div className="p-1">महिन्याचे एकूण दिवस : <span className="font-black">{daysInMonth}</span></div>
                                  <div className="p-1">TOTAL पटसंख्या : <span className="font-black">{totalPat}</span></div>
                                  <div className="p-1">TOTAL लाभार्थी : <span className="font-black">{totalLabharthi}</span></div>
                                  <div className="p-1">TOTAL अनुदान : <span className="font-black">₹{totalAnudan.toFixed(2)}</span></div>
                                </div>
                                <div className="grid grid-cols-3 divide-x divide-black">
                                  <div className="p-1">कामाचे एकूण दिवस : <span className="font-black">{kamacheDivs}</span></div>
                                  <div className="p-1">शिजवून दिल्याचे एकूण दिवस : <span className="font-black">{kamacheDivs}</span></div>
                                  <div className="p-1"><span className="font-black">{totalLabharthi} × {shasDar}</span></div>
                                </div>
                              </div>

                              {/* Akshari */}
                              <div className="text-[9px] font-bold border border-black p-1 bg-amber-50/40">
                                अक्षरी रु :- <span className="font-black">दोनशे अडतीस रुपये अठ्ठावीस पैसे फक्त</span>
                              </div>

                              {/* Signature */}
                              <div className="flex items-end justify-between pt-4 text-[9px] font-bold">
                                <div><p>Date : __________</p></div>
                                <div className="text-center">
                                  <p className="font-black">मुख्याध्यापक</p>
                                  <p className="text-[7.5px] text-slate-500 mt-0.5">{schoolName}</p>
                                </div>
                              </div>
                              <p className="text-[7.5px] text-center text-slate-400 font-semibold">This report is generated by Learnify Academy MDM Portal</p>
                            </div>
                          );
                        })()}

                        {/* === DAILY TANDUL REGISTER (भाग १) — 2-PAGE EXACT FORMAT === */}
                        {monthlyMdmReportType === "daily_tandul_register" && (() => {
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
                          const engMonthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                          const riceStockData = getStockDataForItem("Rice", engMonthNames[monthNum] || "July", year, "1 To 5");
                          const cookedDays = riceStockData.cookedDays || 0;
                          const labharthi = riceStockData.beneficiary || 0;
                          const enrolledPat = getRegisterDataForMonth(engMonthNames[monthNum] || "July", year, "1 To 5").enrolled || profile?.patPrimary || "";

                          // Page 1 — Daily Tandul Register
                          // Dynamic running balance calculation from user entries
                          const initialShillak = getOpeningStock(engMonthNames[monthNum] || "July", year.toString(), "1 To 5", "Rice") || 0;
                          const dailyRows: { day: number; date: string; pat: number; shillak: number; prapt: number; ekun: number; labharthi: number; kharc: number; balShillak: number; isSunday: boolean }[] = [];
                          let runBalance = initialShillak;
                          for (let i = 0; i < daysInMonth; i++) {
                            const day = i + 1;
                            const dateObj = new Date(year, monthNum - 1, day);
                            const isSunday = dateObj.getDay() === 0;
                            const dateISO = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const dateStr = `${String(day).padStart(2, '0')}/${String(monthNum).padStart(2, '0')}/${year}`;
                            const daily = getDailyDataForMonthDate(dateISO, "1 To 5");
                            const pat = daily.enrolled || 0;
                            const labharthiVal = daily.beneficiary || 0;
                            const kharc = parseFloat((labharthiVal * 0.1).toFixed(2));
                            const prapt = day === 1 ? getIncomingForItem("Rice", engMonthNames[monthNum] || "July", year, "1 To 5") : 0;
                            const ekun = runBalance + prapt;
                            const balShillak = Math.max(0, ekun - kharc);
                            dailyRows.push({ day, date: dateStr, pat, shillak: runBalance, prapt, ekun, labharthi: labharthiVal, kharc, balShillak, isSunday });
                            runBalance = balShillak;
                          }

                          // Page 2 — Stock items (Prapatra B) — Dynamic user items
                          const itemDefs = [
                            { sr: 1,  key: "Rice", name: "तांदूळ" },
                            { sr: 2,  key: "Mugdal", name: "मूगडाळ" },
                            { sr: 3,  key: "Turdal", name: "तूरडाळ" },
                            { sr: 4,  key: "Masurdal", name: "मसूरडाळ" },
                            { sr: 5,  key: "Matki", name: "मटकी" },
                            { sr: 6,  key: "Moong", name: "अख्खा मूग" },
                            { sr: 7,  key: "Cowpea", name: "चवळी" },
                            { sr: 8,  key: "Gram", name: "हरभरा" },
                            { sr: 9,  key: "Pease", name: "वाटाणा" },
                            { sr: 10, key: "Soyabean Wadi", name: "सोयाबीन वडी" },
                            { sr: 11, key: "Cumin", name: "जिरे" },
                            { sr: 12, key: "Mustard", name: "मोहरी" },
                            { sr: 13, key: "Turmeric", name: "हळद" },
                            { sr: 14, key: "Onion Garlic Masala", name: "तिखट मसाला/कांदा लसूण मसाला" },
                            { sr: 15, key: "Salt", name: "मीठ" },
                            { sr: 16, key: "Chili", name: "मिरची पावडर" },
                            { sr: 17, key: "Garam Masala", name: "गरम मसाला" },
                            { sr: 18, key: "Oil", name: "तेल" },
                            { sr: 19, key: "Sugar", name: "गूळ / साखर" },
                            { sr: 20, key: "Milk", name: "दूध पावडर" },
                            { sr: 21, key: "Ragi", name: "नाचणी सत्त्व" },
                            { sr: 22, key: "Vegetables", name: "भाजीपाला" },
                          ];

                          const stockItems = itemDefs.map(def => {
                            const data = getStockDataForItem(def.key, engMonthNames[monthNum] || "July", year, "1 To 5");
                            const prev = data.prev || 0;
                            const rec = data.received || 0;
                            const used = data.used || 0;
                            const patNum = parseInt(enrolledPat || "0", 10) || 0;
                            const demand = Math.max(0, (patNum * 0.02 * 20) - (prev + rec - used));
                            return { sr: def.sr, name: def.name, prev, rec, used, demand: parseFloat(demand.toFixed(2)) };
                          });

                          return (
                            <div className="space-y-0">
                              {/* ============ PAGE 1 — दैनंदिन तांदूळ खर्च नोंदवही ============ */}
                              <div className="space-y-2 pb-4">
                                {/* Title Header */}
                                <div className="text-center space-y-0 bg-rose-100/60 border border-rose-300 py-1.5 rounded-sm">
                                  <h2 className="text-[11px] font-black text-slate-900 tracking-tight">प्रधानमंत्री पोषण शक्ती निर्माण योजना</h2>
                                  <p className="text-[10px] font-bold text-slate-800">दैनंदिन तांदूळ खर्च नोंदवही (भाग १)</p>
                                </div>

                                {/* School Info Grid — matching screenshot */}
                                <div className="border border-black text-[8.5px] font-bold">
                                  <div className="grid grid-cols-6 divide-x divide-black border-b border-black">
                                    <div className="p-0.5 col-span-2">शाळेचे नाव : <span className="font-black">{schoolName}</span></div>
                                    <div className="p-0.5 col-span-2">इयत्ता गट : <span className="font-black">प्राथमिक ( इयत्ता १ ते ५ )</span></div>
                                    <div className="p-0.5">केंद्र : <span className="font-black">{profile?.kendra || ""}</span></div>
                                    <div className="p-0.5">बीट : <span className="font-black">{profile?.kendra || ""}</span></div>
                                  </div>
                                  <div className="grid grid-cols-6 divide-x divide-black border-b border-black">
                                    <div className="p-0.5">ता. : <span className="font-black">{profile?.taluka || ""}</span></div>
                                    <div className="p-0.5">जिल्हा : <span className="font-black">{profile?.district || ""}</span></div>
                                    <div className="p-0.5 col-span-2"></div>
                                    <div className="p-0.5 col-span-2"></div>
                                  </div>
                                  <div className="grid grid-cols-4 divide-x divide-black border-b border-black">
                                    <div className="p-0.5">माहे : <span className="font-black">{monthlyMdmReportMonth}</span></div>
                                    <div className="p-0.5">पटसंख्या (१ ते ५) : <span className="font-black">23</span></div>
                                    <div className="p-0.5"></div>
                                    <div className="p-0.5">एकूण लाभार्थी संख्या : <span className="font-black">92</span></div>
                                  </div>
                                  <div className="grid grid-cols-4 divide-x divide-black">
                                    <div className="p-0.5">एकूण कामाचे दिवस : <span className="font-black">2</span></div>
                                    <div className="p-0.5"></div>
                                    <div className="p-0.5">शिजवून दिलेले दिवस : <span className="font-black">2</span></div>
                                    <div className="p-0.5">तांदूळ प्राप्त दिनांक : <span className="font-black">24-07-2026</span></div>
                                  </div>
                                </div>

                                <p className="text-[8px] font-semibold text-slate-600">(2.1) हिताची पे व मंडलावरती</p>

                                {/* Daily Register Table — 10 columns */}
                                <div className="overflow-x-auto">
                                  <table className="w-full border-collapse border border-black text-center text-[8px] font-medium" style={{ tableLayout: 'fixed' }}>
                                    <thead>
                                      <tr className="bg-slate-100 text-slate-900 font-bold border-b border-black text-[7.5px]">
                                        <th className="border-r border-black p-0.5 w-[4%]">अ.न.<br/><span className="font-normal">1</span></th>
                                        <th className="border-r border-black p-0.5 w-[10%]">दिनांक<br/><span className="font-normal">2</span></th>
                                        <th className="border-r border-black p-0.5 w-[5%]">पट<br/><span className="font-normal">3</span></th>
                                        <th className="border-r border-black p-0.5 w-[10%]">तांदूळ शिल्लक<br/>(KG)<br/><span className="font-normal">4</span></th>
                                        <th className="border-r border-black p-0.5 w-[8%]">प्राप्त<br/>(KG)<br/><span className="font-normal">5</span></th>
                                        <th className="border-r border-black p-0.5 w-[12%]">एकूण तांदूळ (4+5)<br/>(KG)<br/><span className="font-normal">6</span></th>
                                        <th className="border-r border-black p-0.5 w-[8%]">लाभार्थी<br/><span className="font-normal">7</span></th>
                                        <th className="border-r border-black p-0.5 w-[10%]">खर्च तांदूळ<br/>(KG)<br/><span className="font-normal">8</span></th>
                                        <th className="border-r border-black p-0.5 w-[12%]">शिल्लक तांदूळ<br/>(04-05 (KG))<br/><span className="font-normal">9</span></th>
                                        <th className="border-r border-black p-0.5 w-[8%]">शेरा<br/><span className="font-normal">10</span></th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {dailyRows.map((d) => (
                                        <tr key={d.day} className={`border-b border-black h-[17px] ${d.isSunday ? "bg-red-50/50 text-red-600" : "hover:bg-amber-50/20"}`}>
                                          <td className="border-r border-black py-0 px-0.5">{d.day}</td>
                                          <td className="border-r border-black py-0 px-0.5 text-[7.5px]">{d.date}</td>
                                          <td className="border-r border-black py-0 px-0.5 font-bold">{d.pat > 0 ? d.pat : ""}</td>
                                          <td className="border-r border-black py-0 px-0.5">{d.shillak !== 0 ? parseFloat(d.shillak.toFixed(1)) : ""}</td>
                                          <td className="border-r border-black py-0 px-0.5">{d.prapt > 0 ? d.prapt : ""}</td>
                                          <td className="border-r border-black py-0 px-0.5">{d.ekun !== 0 ? parseFloat(d.ekun.toFixed(1)) : ""}</td>
                                          <td className="border-r border-black py-0 px-0.5 font-bold">{d.labharthi > 0 ? d.labharthi : ""}</td>
                                          <td className="border-r border-black py-0 px-0.5">{d.kharc > 0 ? d.kharc : ""}</td>
                                          <td className={`border-r border-black py-0 px-0.5 font-bold ${d.balShillak < 0 ? "text-red-600" : ""}`}>{d.balShillak !== 0 ? parseFloat(d.balShillak.toFixed(1)) : ""}</td>
                                          <td className="border-r border-black py-0 px-0.5"></td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Signature for Page 1 */}
                                <div className="flex items-end justify-between pt-3 text-[9px] font-bold">
                                  <div><p>Date : __________</p></div>
                                  <div className="text-center">
                                    <p className="font-black">मुख्याध्यापक</p>
                                  </div>
                                </div>
                                <p className="text-[7.5px] text-center text-slate-400 font-semibold">This report is generated by Learnify Academy MDM Portal</p>
                              </div>

                              {/* Page Break */}
                              <div className="border-t-2 border-dashed border-slate-300 my-4 print:border-none" />

                              {/* ============ PAGE 2 — प्रपत्र (ब) — Monthly Stock Summary ============ */}
                              <div className="space-y-2">
                                {/* Page 2 Title */}
                                <div className="text-center space-y-0.5 mb-2">
                                  <p className="text-[9px] font-bold text-slate-700">शाळेने केंद्रप्रमुखांना दरमहा द्यावयाचा अहवाल ( २ प्रती )</p>
                                </div>

                                {/* School Info */}
                                <div className="border border-black text-[9px] font-bold">
                                  <div className="grid grid-cols-3 divide-x divide-black border-b border-black">
                                    <div className="p-1">शाळेचे नाव : <span className="font-black">{schoolName}</span></div>
                                    <div className="p-1">इयत्ता गट : <span className="font-black">प्राथमिक ( इयत्ता १ ते ५ )</span></div>
                                    <div className="p-1">केंद्र : <span className="font-black">{profile?.kendra || ""}</span></div>
                                  </div>
                                  <div className="grid grid-cols-3 divide-x divide-black border-b border-black">
                                    <div className="p-1">बीट : <span className="font-black">{profile?.kendra || ""}</span></div>
                                    <div className="p-1">ता. : <span className="font-black">{profile?.taluka || ""}</span></div>
                                    <div className="p-1">जिल्हा : <span className="font-black">{profile?.district || ""}</span></div>
                                  </div>
                                  <div className="grid grid-cols-3 divide-x divide-black border-b border-black">
                                    <div className="p-1">माहे : <span className="font-black">{monthlyMdmReportMonth}</span></div>
                                    <div className="p-1">पटसंख्या (१ ते ५) : <span className="font-black">{enrolledPat}</span></div>
                                    <div className="p-1">एकूण लाभार्थी संख्या : <span className="font-black">{labharthi}</span></div>
                                  </div>
                                  <div className="grid grid-cols-3 divide-x divide-black">
                                    <div className="p-1">एकूण कामाचे दिवस : <span className="font-black">{cookedDays}</span></div>
                                    <div className="p-1">शिजवून दिलेले दिवस : <span className="font-black">{cookedDays}</span></div>
                                    <div className="p-1">तांदूळ व धान्याधी माल प्राप्त दिनांक : <span className="font-black">01-{String(monthNum).padStart(2,'0')}-{year}</span></div>
                                  </div>
                                </div>

                                {/* Stock Table — 9 Columns */}
                                <div className="overflow-x-auto">
                                  <table className="w-full border-collapse border border-black text-center text-[9px] font-medium">
                                    <thead>
                                      <tr className="bg-slate-100 text-slate-900 font-bold border-b border-black text-[9px]">
                                        <th className="border-r border-black p-1 w-[4%]">अ.न.<br/><span className="font-normal text-[8px]">1</span></th>
                                        <th className="border-r border-black p-1 text-left w-[20%]">धान्यादी मालाचे नाव<br/><span className="font-normal text-[8px]">2</span></th>
                                        <th className="border-r border-black p-1 w-[10%]">मागील शिल्लक वस्तू<br/><span className="text-[7px] font-normal">( किलोग्रॅम )</span><br/><span className="font-normal text-[8px]">3</span></th>
                                        <th className="border-r border-black p-1 w-[10%]">चालू महिन्यात प्राप्त वस्तू<br/><span className="text-[7px] font-normal">( किलोग्रॅम )</span><br/><span className="font-normal text-[8px]">4</span></th>
                                        <th className="border-r border-black p-1 w-[10%]">एकूण वस्तू<br/><span className="text-[7px] font-normal">( 3 + 4 ) ( किलोग्रॅम )</span><br/><span className="font-normal text-[8px]">5</span></th>
                                        <th className="border-r border-black p-1 w-[13%]">अन्न शिजवण्यासाठी वापरलेल्या वस्तू<br/><span className="text-[7px] font-normal">( किलोग्रॅम )</span><br/><span className="font-normal text-[8px]">6</span></th>
                                        <th className="border-r border-black p-1 w-[10%]">शिल्लक वस्तू<br/><span className="text-[7px] font-normal">( 5 - 6 ) ( किलोग्रॅम )</span><br/><span className="font-normal text-[8px]">7</span></th>
                                        <th className="border-r border-black p-1 w-[10%]">पुढील महिन्यासाठी मागणी<br/><span className="text-[7px] font-normal">( किलोग्रॅम )</span><br/><span className="font-normal text-[8px]">8</span></th>
                                        <th className="border-r border-black p-1 w-[8%]">शेरा<br/><span className="font-normal text-[8px]">9</span></th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {stockItems.map((row) => {
                                        const total = row.prev + row.rec;
                                        const bal = total - row.used;
                                        return (
                                          <tr key={row.sr} className={`border-b border-black h-5 ${row.sr % 2 === 0 ? "bg-slate-50/30" : "bg-white"} hover:bg-amber-50/20`}>
                                            <td className="border-r border-black py-0.5">{row.sr}</td>
                                            <td className="border-r border-black py-0.5 text-left font-bold text-slate-900 pl-1">{row.name}</td>
                                            <td className="border-r border-black py-0.5 font-semibold">{row.prev !== 0 ? row.prev : ""}</td>
                                            <td className="border-r border-black py-0.5">{row.rec !== 0 ? row.rec : ""}</td>
                                            <td className="border-r border-black py-0.5 font-bold">{total !== 0 ? total : ""}</td>
                                            <td className="border-r border-black py-0.5 font-bold text-slate-900">{row.used !== 0 ? row.used : ""}</td>
                                            <td className={`border-r border-black py-0.5 font-extrabold ${bal < 0 ? "text-red-600" : "text-slate-900"}`}>{bal !== 0 ? parseFloat(bal.toFixed(3)) : ""}</td>
                                            <td className="border-r border-black py-0.5">{row.demand !== 0 ? row.demand : ""}</td>
                                            <td className="border-r border-black py-0.5"></td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Bottom Note */}
                                <p className="text-[8.5px] font-semibold border border-slate-400 bg-amber-50/40 p-1 text-slate-800">
                                  मागणी नोंदवताना शाळेकडे वीस दिवसांचा साठा शिल्लक राहील याची दक्षता घेवून मागणी नोंदवावी, जास्त साठा करून धान्य खराब होणार नाही याची दक्षता घ्यावी.
                                </p>

                                {/* Signature */}
                                <div className="flex items-end justify-between pt-3 text-[9px] font-bold">
                                  <div><p>Date : __________</p></div>
                                  <div className="text-center">
                                    <p className="font-black">मुख्याध्यापक</p>
                                    <p className="text-[7.5px] text-slate-500 mt-0.5">{schoolName}</p>
                                  </div>
                                </div>
                                <p className="text-[7.5px] text-center text-slate-400 font-semibold">This report is generated by Learnify Academy MDM Portal</p>
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
                  <div className="bg-white p-12 border border-slate-300 w-full min-h-[800px] flex flex-col items-center">
                    <div className={`w-full ${isMonthlyReportGenerated ? 'max-w-full' : 'max-w-[800px]'} space-y-10`}>
                      <div className="text-center py-4">
                        <h2 className="text-2xl font-bold text-[#004C99]">
                          {t("मासिक अहवाल", "Monthly Report", "मासिक रिपोर्ट")}
                        </h2>
                      </div>

                      <div className="space-y-6">
                          {/* Top Controls Card matching Learnify Academy reports-mdm.php */}
                          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 p-4 md:p-5 rounded-2xl border border-emerald-200/80 shadow-sm space-y-4 print:hidden">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-emerald-200/60 pb-3">
                              <div className="flex items-center gap-2">
                                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                                <h2 className="text-base md:text-lg font-black text-slate-900 tracking-tight">
                                  मासिक अहवाल व्यवस्थापन (MDM Monthly Reports)
                                </h2>
                              </div>
                              
                              {/* Month Selector Dropdown */}
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-700 whitespace-nowrap">महिना निवडा:</span>
                                <select
                                  value={monthlyReportMonth || "April"}
                                  onChange={(e) => {
                                    setMonthlyReportMonth(e.target.value);
                                    setIsMonthlyReportGenerated(true);
                                  }}
                                  className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs cursor-pointer"
                                >
                                  {[
                                    { id: "April", nameMr: "एप्रिल 2026" },
                                    { id: "May", nameMr: "मे 2026" },
                                    { id: "June", nameMr: "जून 2026" },
                                    { id: "July", nameMr: "जुलै 2026" },
                                    { id: "August", nameMr: "ऑगस्ट 2026" },
                                    { id: "September", nameMr: "सप्टेंबर 2026" },
                                    { id: "October", nameMr: "ऑक्टोबर 2026" },
                                    { id: "November", nameMr: "नोव्हेंबर 2026" },
                                    { id: "December", nameMr: "डिसेंबर 2026" },
                                    { id: "January", nameMr: "जानेवारी 2027" },
                                    { id: "February", nameMr: "फेब्रुवारी 2027" },
                                    { id: "March", nameMr: "मार्च 2027" },
                                  ].map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.nameMr}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Learnify Academy MDM Monthly Report Category Selector Bar */}
                          <div className="flex flex-wrap items-center justify-center gap-2 print:hidden bg-slate-100 p-2 rounded-xl border border-slate-200">
                            {[
                              { id: "tandul_bhag1", label: "तांदूळ अहवाल (भाग १)" },
                              { id: "dhanyadi_bhag2", label: "धान्यादी माल (भाग २)" },
                              { id: "masik_goshwara", label: "मासिक 'ब' प्रपत्र" },
                              { id: "anudan_report", label: "इंधन व भाजीपाला अनुदान" },
                              { id: "purak_ahar_report", label: "पूरक आहार अहवाल" },
                            ].map((cat) => (
                              <button
                                key={cat.id}
                                onClick={() => setSelectedReportCategory(cat.id as any)}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                                  selectedReportCategory === cat.id
                                    ? "bg-[#047857] text-white shadow-sm"
                                    : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                                }`}
                              >
                                {cat.label}
                              </button>
                            ))}
                          </div>

                          {/* Monthly Report Sub-tabs Selector (1-5, 6-8, 1-8) */}
                          <div className="flex justify-center border-b border-slate-200 print:hidden mt-1">
                            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                              <button
                                onClick={() => setMonthlySubTab("1-5")}
                                className={`shrink-0 border-b-2 py-3 px-2 text-xs font-bold transition-all ${monthlySubTab === "1-5"
                                  ? "border-[#047857] text-[#047857]"
                                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                                  }`}
                              >
                                {lang === "mr" ? "इयत्ता १ ते ५" : "Class 1 to 5"}
                              </button>
                              <button
                                onClick={() => setMonthlySubTab("6-8")}
                                className={`shrink-0 border-b-2 py-3 px-2 text-xs font-bold transition-all ${monthlySubTab === "6-8"
                                  ? "border-[#047857] text-[#047857]"
                                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                                  }`}
                              >
                                {lang === "mr" ? "इयत्ता ६ ते ८" : "Class 6 to 8"}
                              </button>
                              <button
                                onClick={() => setMonthlySubTab("1-8")}
                                className={`shrink-0 border-b-2 py-3 px-2 text-xs font-bold transition-all ${monthlySubTab === "1-8"
                                  ? "border-[#047857] text-[#047857]"
                                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                                  }`}
                              >
                                {lang === "mr" ? "इयत्ता १ ते ८ (एकत्रित)" : "Class 1 to 8 (Combined)"}
                              </button>
                            </nav>
                          </div>

                          <div id="monthly-report-print" className="bg-slate-100 p-6 space-y-8 w-full overflow-x-auto print:p-0 print:bg-white print:space-y-0">
                            {(() => {
                              const acadMonths = getAcademicYearMonths("2025-26");
                              const selectedMonthObj = acadMonths.find(m => m.month === monthlyReportMonth);
                              const reportYear = selectedMonthObj ? selectedMonthObj.year : 2025;

                              const englishMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                              const marathiMonths = ["जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून", "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"];
                              const monthIndex = englishMonths.indexOf(monthlyReportMonth || "");
                              const marathiMonthName = monthIndex !== -1 ? marathiMonths[monthIndex] : "";

                              // Items for B-Form (18 columns matching official Image 2 format)
                              const B_FORM_ITEMS = [
                                { key: "Rice", nameMr: "तांदूळ", unit: "कि.ग्रॅ.", qty15: "0.100 कि.ग्रॅ.", qty68: "0.150 कि.ग्रॅ." },
                                { key: "Mugdal", nameMr: "मूगडाळ", unit: "कि.ग्रॅ.", qty15: "0.020 कि.ग्रॅ.", qty68: "0.030 कि.ग्रॅ." },
                                { key: "Turdal", nameMr: "तूरडाळ", unit: "कि.ग्रॅ.", qty15: "0.020 कि.ग्रॅ.", qty68: "0.030 कि.ग्रॅ." },
                                { key: "Matki", nameMr: "मटकी", unit: "कि.ग्रॅ.", qty15: "0.020 कि.ग्रॅ.", qty68: "0.030 कि.ग्रॅ." },
                                { key: "Chawali", nameMr: "चवळी", unit: "कि.ग्रॅ.", qty15: "0.020 कि.ग्रॅ.", qty68: "0.030 कि.ग्रॅ." },
                                { key: "MasurDal", nameMr: "मसूर डाळ", unit: "कि.ग्रॅ.", qty15: "0.020 कि.ग्रॅ.", qty68: "0.030 कि.ग्रॅ." },
                                { key: "Vatana", nameMr: "वाटाणा", unit: "कि.ग्रॅ.", qty15: "0.020 कि.ग्रॅ.", qty68: "0.030 कि.ग्रॅ." },
                                { key: "Gram", nameMr: "हरभरा", unit: "कि.ग्रॅ.", qty15: "0.020 कि.ग्रॅ.", qty68: "0.030 कि.ग्रॅ." },
                                { key: "Moong", nameMr: "मूग", unit: "कि.ग्रॅ.", qty15: "0.020 कि.ग्रॅ.", qty68: "0.030 कि.ग्रॅ." },
                                { key: "Cumin", nameMr: "जिरे", unit: "कि.ग्रॅ.", qty15: "0.0002 कि.ग्रॅ.", qty68: "0.0003 कि.ग्रॅ." },
                                { key: "Mustard", nameMr: "मोहरी", unit: "कि.ग्रॅ.", qty15: "0.0004 कि.ग्रॅ.", qty68: "0.0006 कि.ग्रॅ." },
                                { key: "Turmeric", nameMr: "हळद", unit: "कि.ग्रॅ.", qty15: "0.0004 कि.ग्रॅ.", qty68: "0.0006 कि.ग्रॅ." },
                                { key: "Onion Garlic Masala", nameMr: "कांदा लसूण मसाला", unit: "कि.ग्रॅ.", qty15: "0.0004 कि.ग्रॅ.", qty68: "0.0007 कि.ग्रॅ." },
                                { key: "Salt", nameMr: "मीठ", unit: "कि.ग्रॅ.", qty15: "0.0034 कि.ग्रॅ.", qty68: "0.0050 कि.ग्रॅ." },
                                { key: "Chili", nameMr: "मिरची पावडर", unit: "कि.ग्रॅ.", qty15: "0.0004 कि.ग्रॅ.", qty68: "0.0006 कि.ग्रॅ." },
                                { key: "Oil", nameMr: "सोयाबीन खाद्यतेल", unit: "ली.", qty15: "0.0054 ली.", qty68: "0.0075 ली." },
                                { key: "Garam Masala", nameMr: "गरम मसाला", unit: "कि.ग्रॅ.", qty15: "0.0004 कि.ग्रॅ.", qty68: "0.0006 कि.ग्रॅ." },
                                { key: "Soyabean Wadi", nameMr: "सोया वडी", unit: "कि.ग्रॅ.", qty15: "0.020 कि.ग्रॅ.", qty68: "0.030 कि.ग्रॅ." }
                              ];

                              // Primary Calculations (1-5)
                              const primaryRiceData = getStockDataForItem("Rice", monthlyReportMonth || "April", reportYear, "1 To 5");
                              const primaryCookedDays = primaryRiceData?.cookedDays || 0;
                              const primaryBeneficiarySum = primaryRiceData?.beneficiary || 0;
                              const primaryAvgBeneficiary = primaryCookedDays > 0 ? Math.round(primaryBeneficiarySum / primaryCookedDays) : 0;

                              // Upper Primary Calculations (6-8)
                              const upperRiceData = getStockDataForItem("Rice", monthlyReportMonth || "April", reportYear, "6 To 8");
                              const upperCookedDays = upperRiceData?.cookedDays || 0;
                              const upperBeneficiarySum = upperRiceData?.beneficiary || 0;
                              const upperAvgBeneficiary = upperCookedDays > 0 ? Math.round(upperBeneficiarySum / upperCookedDays) : 0;

                              const getBFormStockData = (itemKey: string, cls: "1 To 5" | "6 To 8") => {
                                const stockData = getStockDataForItem(itemKey, monthlyReportMonth || "April", reportYear, cls);
                                const opening = stockData?.prev || 0;
                                const received = stockData?.received || 0;
                                const borrowed = 0; // usna defaults to 0
                                const total = opening + received + borrowed;
                                const spent = stockData?.used || 0;
                                const spoiled = 0; // spoiled defaults to 0
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
                              const wednesdaysCount = getWednesdaysInMonth(monthlyReportMonth || "April", reportYear);

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
                                const riceData = getStockDataForItem("Rice", monthlyReportMonth || "April", reportYear, cls);
                                const cookedDays = riceData?.cookedDays || 0;
                                const beneficiarySum = riceData?.beneficiary || 0;
                                const avgBeneficiary = cookedDays > 0 ? Math.round(beneficiarySum / cookedDays) : 0;
                                const standardLabel = isPrimary ? "1 ली ते 5 वी" : "6 वी ते 8 वी";

                                const classRegData = getRegisterDataForMonth(monthlyReportMonth || "April", reportYear, cls);
                                const classEnrolled = classRegData.enrolled || (isPrimary ? (parseInt(profile?.patPrimary || "0", 10) || 45) : (parseInt(profile?.patUpper || "0", 10) || 35));

                                return (
                                  <div className="print-page border border-slate-400 p-6 bg-white text-black font-sans text-[9px] relative w-[297mm] h-[210mm] mx-auto shadow-md flex flex-col justify-between print:w-full print:h-auto print:border-none print:shadow-none print:p-0">
                                    <div>
                                      {/* Top Header matching Image 2 */}
                                      <div className="text-center space-y-0.5 mb-2 border-b-2 border-black pb-1.5">
                                        <h1 className="text-sm md:text-base font-extrabold uppercase text-black tracking-wide">
                                          प्रधानमंत्री पोषण शक्ती निर्माण योजना सन :- {reportYear ? `${reportYear} - ${String(reportYear + 1).slice(-2)}` : "2026 - 27"}
                                        </h1>
                                        <h2 className="text-xs md:text-sm font-bold text-black flex justify-between items-center px-4 py-0.5">
                                          <span>धान्यादी मालाचा मासिक ताळमेळ अहवाल   मासिक "ब" प्रपत्र</span>
                                          <span>इयत्ता :- {standardLabel}</span>
                                          <span>माहे :- {marathiMonthName} {toMarathiNumbers(reportYear.toString())}</span>
                                        </h2>
                                        <div className="flex justify-between items-center text-[10px] font-bold text-black pt-1 px-2">
                                          <div>जिल्हा परिषद शाळा, <span className="font-extrabold border-b border-black px-2">{reportSchoolName || profile?.schoolName || "_________________"}</span></div>
                                          <div>केंद्र :- <span className="font-extrabold border-b border-black px-2">{profile?.center || profile?.kendra || "चिंचणी"}</span></div>
                                          <div>ता. :- <span className="font-extrabold border-b border-black px-2">{profile?.taluka || "तासगाव"}</span></div>
                                          <div>जि. <span className="font-extrabold border-b border-black px-2">{profile?.district || "सांगली"}</span></div>
                                        </div>
                                      </div>

                                      {/* Sub-header stats row matching Image 2 */}
                                      <div className="flex justify-between items-center border border-black p-1 mb-2 text-[10px] font-bold text-black bg-slate-50">
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
                                      <div className="w-full overflow-x-auto">
                                        <table className="w-full min-w-[1000px] border-collapse border border-black text-center text-[7.5px] table-fixed">
                                          <colgroup>
                                            <col className="w-[3%]" />
                                            <col className="w-[17%]" />
                                            {B_FORM_ITEMS.map((item) => (
                                              <col key={item.key} className="w-[4.44%]" />
                                            ))}
                                          </colgroup>
                                          <thead>
                                            <tr className="font-bold border-b border-black">
                                              <th className="border border-black p-0.5 bg-slate-100 relative z-20 font-extrabold align-middle text-center" rowSpan={3}>अ. क्र.</th>
                                              <th className="border border-black p-0.5 text-left pl-1 bg-slate-100 relative z-20 font-extrabold align-middle" rowSpan={3}>तपशील</th>
                                              <th className="border border-black p-0.5 bg-slate-100 font-extrabold" colSpan={18}>
                                                एकूण खर्च झालेल्या तांदूळ व धान्यादी मालाचा तपशील
                                              </th>
                                            </tr>
                                            <tr className="font-bold border-b border-black">
                                              {B_FORM_ITEMS.map((item) => (
                                                <th key={item.key} className="border border-black p-0.5 text-[6.5px] leading-tight font-extrabold break-words whitespace-normal align-middle bg-slate-100">
                                                  {item.nameMr}
                                                </th>
                                              ))}
                                            </tr>
                                            <tr className="text-[6px] font-medium border-b border-black">
                                              {B_FORM_ITEMS.map((item) => (
                                                <th key={item.key} className="border border-black p-0.5 leading-none text-slate-700 whitespace-pre-wrap align-middle bg-slate-50">
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
                                                  <td key={item.key} className="border border-black p-0.5 font-semibold text-[7px] leading-tight overflow-hidden text-ellipsis whitespace-nowrap">
                                                    {toMarathiNumbers(data.opening.toFixed(3))}
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
                                                  <td key={item.key} className="border border-black p-0.5 font-semibold text-[7px] leading-tight overflow-hidden text-ellipsis whitespace-nowrap">
                                                    {toMarathiNumbers(data.received.toFixed(3))}
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
                                                  <td key={item.key} className="border border-black p-0.5 font-semibold text-[7px] leading-tight overflow-hidden text-ellipsis whitespace-nowrap">
                                                    {toMarathiNumbers(data.borrowed.toFixed(3))}
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
                                                  <td key={item.key} className="border border-black p-0.5 text-[7px] leading-tight overflow-hidden text-ellipsis whitespace-nowrap">
                                                    {toMarathiNumbers(data.total.toFixed(3))}
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
                                                  <td key={item.key} className="border border-black p-0.5 font-semibold text-[7px] leading-tight overflow-hidden text-ellipsis whitespace-nowrap">
                                                    {data.spent > 0 || item.key === "Rice" ? toMarathiNumbers(cookedDays.toString()) : "0"}
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
                                                  <td key={item.key} className="border border-black p-0.5 font-semibold text-[7px] leading-tight overflow-hidden text-ellipsis whitespace-nowrap">
                                                    {data.spent > 0 || item.key === "Rice" ? toMarathiNumbers(beneficiarySum.toString()) : "0"}
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
                                                  <td key={item.key} className="border border-black p-0.5 font-semibold text-[7px] leading-tight overflow-hidden text-ellipsis whitespace-nowrap">
                                                    {toMarathiNumbers(data.spent.toFixed(3))}
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
                                                  <td key={item.key} className="border border-black p-0.5 font-semibold text-[7px] leading-tight overflow-hidden text-ellipsis whitespace-nowrap">
                                                    {toMarathiNumbers(data.spoiled.toFixed(3))}
                                                  </td>
                                                );
                                              })}
                                            </tr>

                                            {/* Row 9 */}
                                            <tr className="bg-slate-50 font-bold">
                                              <td className="border border-black p-0.5">9</td>
                                              <td className="border border-black p-0.5 text-left pl-1 leading-tight">महिना अखेर शिल्लक तांदूळ व धान्यादी माल कि. ग्रॅ. (कॉलम नं. 4 - 7)</td>
                                              {B_FORM_ITEMS.map((item) => {
                                                const data = getBFormStockData(item.key, cls);
                                                return (
                                                  <td key={item.key} className="border border-black p-0.5 text-[7px] leading-tight overflow-hidden text-ellipsis whitespace-nowrap">
                                                    {toMarathiNumbers(data.closing.toFixed(3))}
                                                  </td>
                                                );
                                              })}
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>

                                      {/* Vegetable usage table and signatures matching Image 2 */}
                                      <div className="flex justify-between items-start mt-3 pt-1">
                                        <div className="w-[32%]">
                                          <table className="border-collapse border border-black text-center text-[9px] font-bold w-full">
                                            <thead>
                                              <tr className="bg-slate-100 border-b border-black">
                                                <th className="border-r border-black p-1 w-[45%]">तपशील</th>
                                                <th className="border-r border-black p-1 w-[35%]">वापर</th>
                                                <th className="p-1 w-[20%]">युनिट</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              <tr>
                                                <td className="border-r border-black p-1 font-bold text-left pl-2">भाजीपाला</td>
                                                <td className="border-r border-black p-1 font-bold text-center">
                                                  {toMarathiNumbers((beneficiarySum * (isPrimary ? 0.05 : 0.075)).toFixed(3))}
                                                </td>
                                                <td className="p-1 font-bold text-center">कि. ग्रॅ.</td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </div>

                                        <div className="flex justify-end gap-16 items-end text-[10px] font-bold text-black pr-6 pt-2">
                                          <div className="text-center">
                                            <p className="pb-8">अध्यक्ष सही</p>
                                            <p className="border-t border-black pt-0.5">अध्यक्ष, शाळा व्यवस्थापन समिती</p>
                                          </div>
                                          <div className="text-center">
                                            <p className="pb-8">मुख्याध्यापक सही व शिक्का</p>
                                            <p className="border-t border-black pt-0.5">मुख्याध्यापक / सचिव</p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              };

                              if (selectedReportCategory === "tandul_bhag1") {
                                const mIdx = monthIndex !== -1 ? monthIndex : 7;
                                const daysInMonth = new Date(reportYear, mIdx + 1, 0).getDate();
                                const clsSection = monthlySubTab === "6-8" ? "6 To 8" : "1 To 5";

                                const openingRiceData = getStockDataForItem("Rice", monthlyReportMonth || "August", reportYear, clsSection);
                                const currentBalance = openingRiceData?.prev || 0;

                                let totalLabharthiMonth = 0;
                                let totalCookedDays = 0;
                                let totalSpentRiceMonth = 0;
                                let totalReceivedRiceMonth = 0;

                                const dailyRows = [];
                                let currentShillak = currentBalance;

                                for (let day = 1; day <= daysInMonth; day++) {
                                  const dayStr = String(day).padStart(2, '0');
                                  const monthNumStr = String(mIdx + 1).padStart(2, '0');
                                  const dateISO = `${reportYear}-${monthNumStr}-${dayStr}`;
                                  const dateDisplay = `${dayStr}/${monthNumStr}/${reportYear}`;

                                  const dailyInfo = getDailyDataForMonthDate(dateISO, clsSection);
                                  const labharthi = dailyInfo?.beneficiary || 0;
                                  const pat = dailyInfo?.enrolled || (monthlySubTab === "6-8" ? (parseInt(profile?.patUpper || "0", 10) || 35) : (parseInt(profile?.patPrimary || "0", 10) || 23));
                                  const isSunday = dailyInfo?.isHoliday || false;
                                  const sheraText = dailyInfo?.holidayReason || (isSunday ? "रविवार सुट्टी" : "");

                                  const prapt = 0;
                                  const magilShillak = currentShillak;
                                  const ekunSatakha = magilShillak + prapt;

                                  const ratePerStudent = clsSection === "1 To 5" ? 0.100 : 0.150;
                                  const kharchTandul = labharthi > 0 ? (labharthi * ratePerStudent) : 0;
                                  const shillakSatakha = Math.max(0, ekunSatakha - kharchTandul);

                                  currentShillak = shillakSatakha;

                                  if (labharthi > 0) {
                                    totalLabharthiMonth += labharthi;
                                    totalCookedDays++;
                                    totalSpentRiceMonth += kharchTandul;
                                  }
                                  totalReceivedRiceMonth += prapt;

                                  dailyRows.push({
                                    day,
                                    dateDisplay,
                                    pat,
                                    magilShillak,
                                    prapt,
                                    ekunSatakha,
                                    labharthi,
                                    kharchTandul,
                                    shillakSatakha,
                                    shera: sheraText,
                                    isSunday
                                  });
                                }

                                const currentPat = monthlySubTab === "6-8"
                                  ? (profile?.patUpper || "35")
                                  : (profile?.patPrimary || "23");

                                return (
                                  <div className="print-page border border-slate-300 p-6 bg-white text-black font-sans text-xs relative w-full shadow-md flex flex-col justify-between print:w-full print:h-auto print:border-none print:shadow-none print:p-0">
                                    <div>
                                      {/* Top Header Banner matching Learnify */}
                                      <div className="bg-red-50 border border-red-200 text-center py-2.5 px-4 rounded-xl mb-3">
                                        <h1 className="text-sm md:text-base font-extrabold text-red-900 tracking-wide">
                                          प्रधानमंत्री पोषण शक्ती निर्माण योजना
                                        </h1>
                                        <h2 className="text-xs md:text-sm font-bold text-red-800">
                                          दैनंदिन तांदूळ खर्च नोंदवही (भाग १)
                                        </h2>
                                      </div>

                                      {/* School Info Table Header matching Learnify */}
                                      <div className="border border-black text-[10px] font-bold text-black mb-3">
                                        <div className="grid grid-cols-6 divide-x divide-black border-b border-black p-1 text-center bg-slate-50">
                                          <div className="col-span-2 text-left pl-2">शाळेचे नाव : <span className="font-extrabold">{reportSchoolName || profile?.schoolName || "Z P SCHOOL DHONDEWADI PED"}</span></div>
                                          <div className="col-span-2">इयत्ता गट : <span className="font-extrabold">{monthlySubTab === "6-8" ? "उच्च प्राथमिक (इयत्ता ६ ते ८)" : "प्राथमिक (इयत्ता १ ते ५)"}</span></div>
                                          <div>केंद्र : <span className="font-extrabold">{profile?.kendra || profile?.center || "NARSINGPUR"}</span></div>
                                          <div>बीट : <span className="font-extrabold">{profile?.kendra || profile?.center || "NARSINGPUR"}</span></div>
                                        </div>
                                        <div className="grid grid-cols-6 divide-x divide-black border-b border-black p-1 text-center bg-slate-50">
                                          <div>ता. : <span className="font-extrabold">{profile?.taluka || "तासगाव"}</span></div>
                                          <div>जि. : <span className="font-extrabold">{profile?.district || "सांगली"}</span></div>
                                          <div className="col-span-2">माहे : <span className="font-extrabold">{marathiMonthName || "ऑगस्ट"} सन {reportYear}/{String(reportYear + 1).slice(-2)}</span></div>
                                          <div>पटसंख्या ({monthlySubTab === "6-8" ? "६ ते ८" : "१ ते ५"}) : <span className="font-extrabold">{toMarathiNumbers(currentPat.toString())}</span></div>
                                          <div>एकूण लाभार्थी संख्या : <span className="font-extrabold">{toMarathiNumbers(totalLabharthiMonth.toString())}</span></div>
                                        </div>
                                        <div className="grid grid-cols-3 divide-x divide-black p-1 text-center bg-slate-50">
                                          <div>एकूण कामाचे दिवस : <span className="font-extrabold">{toMarathiNumbers(totalCookedDays.toString())}</span></div>
                                          <div>शिजवून दिलेले दिवस : <span className="font-extrabold">{toMarathiNumbers(totalCookedDays.toString())}</span></div>
                                          <div>अंजूळ वाटप दिनांक : <span className="font-extrabold">{toMarathiNumbers(new Date().toLocaleDateString('en-GB'))}</span></div>
                                        </div>
                                      </div>

                                      <div className="text-[10px] font-semibold text-slate-600 mb-2">
                                        {toMarathiNumbers(totalCookedDays.toString())} / {toMarathiNumbers(daysInMonth.toString())} दिवसांची नोंद या महिन्यासाठी.
                                      </div>

                                      {/* Main 10-Column Daily Rice Log Table */}
                                      <div className="overflow-x-auto">
                                        <table className="w-full border-collapse border border-black text-center text-[9px] font-medium table-fixed">
                                          <colgroup>
                                            <col className="w-[4%]" />
                                            <col className="w-[12%]" />
                                            <col className="w-[7%]" />
                                            <col className="w-[12%]" />
                                            <col className="w-[10%]" />
                                            <col className="w-[13%]" />
                                            <col className="w-[9%]" />
                                            <col className="w-[13%]" />
                                            <col className="w-[13%]" />
                                            <col className="w-[7%]" />
                                          </colgroup>
                                          <thead>
                                            <tr className="bg-slate-100 font-bold border-b border-black text-[9px]">
                                              <th className="border border-black p-1">अ.क्र.</th>
                                              <th className="border border-black p-1">दिनांक</th>
                                              <th className="border border-black p-1">पट</th>
                                              <th className="border border-black p-1">मागील शिल्लक (KG)</th>
                                              <th className="border border-black p-1">प्राप्त (KG)</th>
                                              <th className="border border-black p-1">एकूण साठा (4+5) (KG)</th>
                                              <th className="border border-black p-1">लाभार्थी</th>
                                              <th className="border border-black p-1">खर्च तांदूळ (KG)</th>
                                              <th className="border border-black p-1">शिल्लक साठा (6-8) (KG)</th>
                                              <th className="border border-black p-1">शेरा</th>
                                            </tr>
                                            <tr className="bg-slate-50 text-[8px] font-bold border-b border-black text-slate-700">
                                              <th className="border border-black p-0.5">1</th>
                                              <th className="border border-black p-0.5">2</th>
                                              <th className="border border-black p-0.5">3</th>
                                              <th className="border border-black p-0.5">4</th>
                                              <th className="border border-black p-0.5">5</th>
                                              <th className="border border-black p-0.5">6</th>
                                              <th className="border border-black p-0.5">7</th>
                                              <th className="border border-black p-0.5">8</th>
                                              <th className="border border-black p-0.5">9</th>
                                              <th className="border border-black p-0.5">10</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {dailyRows.map((r) => (
                                              <tr
                                                key={r.day}
                                                className={`border-b border-black h-[20px] ${r.isSunday ? "bg-red-50/60 text-red-700 font-semibold" : "hover:bg-slate-50"}`}
                                              >
                                                <td className="border border-black p-0.5 font-bold">{toMarathiNumbers(r.day.toString())}</td>
                                                <td className="border border-black p-0.5 font-bold">{toMarathiNumbers(r.dateDisplay)}</td>
                                                <td className="border border-black p-0.5">{r.labharthi > 0 || r.pat > 0 ? toMarathiNumbers(r.pat.toString()) : ""}</td>
                                                <td className="border border-black p-0.5">{toMarathiNumbers(r.magilShillak.toFixed(4))}</td>
                                                <td className="border border-black p-0.5">{r.prapt > 0 ? toMarathiNumbers(r.prapt.toFixed(4)) : ""}</td>
                                                <td className="border border-black p-0.5">{toMarathiNumbers(r.ekunSatakha.toFixed(4))}</td>
                                                <td className="border border-black p-0.5">{r.labharthi > 0 ? toMarathiNumbers(r.labharthi.toString()) : ""}</td>
                                                <td className="border border-black p-0.5">{r.kharchTandul > 0 ? toMarathiNumbers(r.kharchTandul.toFixed(4)) : ""}</td>
                                                <td className="border border-black p-0.5">{toMarathiNumbers(r.shillakSatakha.toFixed(4))}</td>
                                                <td className="border border-black p-0.5 text-[8px] truncate">{r.shera}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>

                                      {/* Footer */}
                                      <div className="flex justify-between items-end mt-8 text-xs font-bold text-black px-4 pt-4">
                                        <div>Date</div>
                                        <div className="text-center font-bold">मुख्याध्यापक</div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <>
                                  {/* Consolidated Certificate View for 1-8 */}
                                  {monthlySubTab === "1-8" && (
                                    <div className="print-page border border-slate-300 py-5 px-8 bg-white text-black font-sans text-xs relative w-[297mm] h-[210mm] mx-auto shadow-md flex flex-col justify-between print:w-full print:h-auto print:border-none print:shadow-none print:p-0">
                                      <div>
                                        <div className="text-center space-y-0.5 mb-3 border-b border-black pb-1.5">
                                          <h2 className="text-sm font-bold border-b border-black pb-1 inline-block px-12 uppercase">- शालेय पोषण आहार मासिक प्रमाणपत्र व अहवाल -</h2>
                                          <h3 className="text-xs font-bold">इयत्ता १ ते ८ (एकत्रित)</h3>
                                          <h3 className="text-xs font-bold">माहे: {marathiMonthName} {toMarathiNumbers(reportYear.toString())}</h3>
                                        </div>

                                        <div className="text-justify text-[11px] leading-[1.8rem] space-y-2 px-4 font-normal text-black">
                                          <p>
                                            अध्यक्ष/ सचिव शाळा व्यवस्थापन समिती <span className="font-bold border-b border-dotted border-black px-3">{reportPrincipalName || "________________________"}</span> कडून प्रमाणित करणेत येते की,
                                            जिल्हा परिषद शाळा <span className="font-bold border-b border-dotted border-black px-3">{reportSchoolName || "________________________"}</span> या शाळेतील{" "}
                                            <span className="font-bold border-b border-dotted border-black px-3">{reportTeacherName || "________________________"}</span> यांनी शालेय पोषण आहार अंतर्गत माहे{" "}
                                            <span className="font-bold border-b border-dotted border-black px-1">{marathiMonthName} {toMarathiNumbers(reportYear.toString())}</span> मध्ये
                                            इ. १ ली ते ५ वी च्या विद्यार्थ्यांसाठी <span className="font-bold border-b border-dotted border-black px-2">{certPrimaryCookedDays}</span> दिवस आणि इ. ६ वी ते ८ वीच्या विद्यार्थ्यांसाठी एकूण <span className="font-bold border-b border-dotted border-black px-2">{certUpperCookedDays}</span> दिवस अन्न शिजवून देणेचे काम केले आहे. तसेच योग्य उष्मांकाचा व चविष्ठ पोषण आहार होणेसाठी दररोज इ. १ ली ते ५ वी साठी ५० ग्रॅम व इ. ६वी ते ८ वी साठी ७५ ग्रॅम प्रमाणे
                                            विविध भाज्या वापरल्या आहेत. आणि खोबरे, कांदा, लसून इ. मसाल्यांचा योग्य प्रमाणात वापर केला आहे. सदर महिन्यात दर बुधवारी एकूण <span className="font-bold border-b border-dotted border-black px-2">{certWednesdaysCount}</span> वेळा {certSupplementaryFood} असा पूरक आहार दिलेला आहे.
                                          </p>
                                          <p>
                                            सदर खालीलप्रमाणे पट, लाभार्थी, दिवस यांची माहिती बरोबर असून त्यानुसार इंधन भाजीपाला तसेच स्वयंपाकी तथा मदतनीस मानधन अदा करणेस हरकत नाही म्हणून दिले असे प्रमाणपत्र.
                                          </p>
                                        </div>

                                        <div className="mt-4 px-2 w-full">
                                          <table className="w-full border-collapse border border-black text-center text-[10px]">
                                            <thead>
                                              <tr className="bg-slate-50 font-bold">
                                                <th className="border border-black p-1">इयत्ता</th>
                                                <th className="border border-black p-1">पट (Enrollment)</th>
                                                <th className="border border-black p-1">एकूण लाभार्थी</th>
                                                <th className="border border-black p-1">शिजवलेले दिवस</th>
                                                <th className="border border-black p-1">हिस्सा</th>
                                                <th className="border border-black p-1">दर</th>
                                                <th className="border border-black p-1">इंधन भाजीपाला देय अनुदान (₹)</th>
                                                <th className="border border-black p-1">स्वयंपाकी तथा मदतनीस संख्या</th>
                                                <th className="border border-black p-1">स्वयंपाकी मानधन (₹)</th>
                                                <th className="border border-black p-1">शेरा</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {/* Row 1: 1 To 5 */}
                                              <tr>
                                                <td className="border border-black p-1 font-bold" rowSpan={2}>१ ते ५ (प्राथमिक)</td>
                                                <td className="border border-black p-1 font-bold" rowSpan={2}>{certPatPrimary}</td>
                                                <td className="border border-black p-1 font-bold" rowSpan={2}>{certBeneficiaryPrimary}</td>
                                                <td className="border border-black p-1 font-bold" rowSpan={2}>{certPrimaryCookedDays}</td>
                                                <td className="border border-black p-0.5 font-medium">केंद्र (60%)</td>
                                                <td className="border border-black p-0.5">{toMarathiNumbers("४.०७")}</td>
                                                <td className="border border-black p-0.5 font-semibold">{toMarathiNumbers(primaryCenterGrant.toFixed(2))}</td>
                                                <td className="border border-black p-1 font-bold" rowSpan={2}>{certHelperCount}</td>
                                                <td className="border border-black p-0.5">केंद्र - {toMarathiNumbers(helperCenterPay.toFixed(2))}</td>
                                                <td className="border border-black p-1 text-emerald-700 font-bold" rowSpan={2}>अचूक नोंदवलेले</td>
                                              </tr>
                                              <tr>
                                                <td className="border border-black p-0.5 font-medium">राज्य (40%)</td>
                                                <td className="border border-black p-0.5">{toMarathiNumbers("२.७१")}</td>
                                                <td className="border border-black p-0.5 font-semibold">{toMarathiNumbers(primaryStateGrant.toFixed(2))}</td>
                                                <td className="border border-black p-0.5">राज्य - {toMarathiNumbers(helperStatePay.toFixed(2))}</td>
                                              </tr>

                                              {/* Row 2: 6 To 8 */}
                                              <tr>
                                                <td className="border border-black p-1 font-bold" rowSpan={2}>६ ते ८ (उच्च प्राथमिक)</td>
                                                <td className="border border-black p-1 font-bold" rowSpan={2}>{certPatUpper}</td>
                                                <td className="border border-black p-1 font-bold" rowSpan={2}>{certBeneficiaryUpper}</td>
                                                <td className="border border-black p-1 font-bold" rowSpan={2}>{certUpperCookedDays}</td>
                                                <td className="border border-black p-0.5 font-medium">केंद्र (60%)</td>
                                                <td className="border border-black p-0.5">{toMarathiNumbers("६.१०")}</td>
                                                <td className="border border-black p-0.5 font-semibold">{toMarathiNumbers(upperCenterGrant.toFixed(2))}</td>
                                                <td className="border border-black p-1 font-bold" rowSpan={2}>{certHelperCount}</td>
                                                <td className="border border-black p-0.5">केंद्र - {toMarathiNumbers(helperCenterPay.toFixed(2))}</td>
                                                <td className="border border-black p-1 text-emerald-700 font-bold" rowSpan={2}>अचूक नोंदवलेले</td>
                                              </tr>
                                              <tr>
                                                <td className="border border-black p-0.5 font-medium">राज्य (40%)</td>
                                                <td className="border border-black p-0.5">{toMarathiNumbers("४.०७")}</td>
                                                <td className="border border-black p-0.5 font-semibold">{toMarathiNumbers(upperStateGrant.toFixed(2))}</td>
                                                <td className="border border-black p-0.5">राज्य - {toMarathiNumbers(helperStatePay.toFixed(2))}</td>
                                              </tr>

                                              {/* Row 3: Total */}
                                              <tr className="bg-slate-50 font-bold">
                                                <td className="border border-black p-1">एकूण (१ ते ८)</td>
                                                <td className="border border-black p-1">
                                                  {toMarathiNumbers(((parseInt(toEnglishNumbers(certPatPrimary)) || 0) + (parseInt(toEnglishNumbers(certPatUpper)) || 0)).toString())}
                                                </td>
                                                <td className="border border-black p-1">
                                                  {toMarathiNumbers(((parseInt(toEnglishNumbers(certBeneficiaryPrimary)) || 0) + (parseInt(toEnglishNumbers(certBeneficiaryUpper)) || 0)).toString())}
                                                </td>
                                                <td className="border border-black p-1">
                                                  {toMarathiNumbers(((parseInt(toEnglishNumbers(certPrimaryCookedDays)) || 0) + (parseInt(toEnglishNumbers(certUpperCookedDays)) || 0)).toString())}
                                                </td>
                                                <td className="border border-black p-1">---</td>
                                                <td className="border border-black p-1">---</td>
                                                <td className="border border-black p-1 text-emerald-800">
                                                  {toMarathiNumbers(totalGrantAll.toFixed(2))}
                                                </td>
                                                <td className="border border-black p-1">{toMarathiNumbers(certHelperCount)}</td>
                                                <td className="border border-black p-1 text-emerald-800">
                                                  {toMarathiNumbers(helperTotalPay.toFixed(2))}
                                                </td>
                                                <td className="border border-black p-1 text-blue-700">प्रमाणित</td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>

                                      <div className="flex justify-between items-end mt-6 px-4 text-xs font-bold text-black select-none">
                                        <div className="space-y-3 text-[12px]">
                                          <div>स्थळ - <span className="border-b border-dotted border-black px-4">{profile?.center || "________"}</span></div>
                                          <div>दिनांक - <span className="border-b border-dotted border-black px-4">{toMarathiNumbers(new Date().toLocaleDateString('en-GB'))}</span></div>
                                        </div>
                                        <div className="text-center pb-2 text-[12px] font-bold">मुख्याध्यापक तथा सचिव</div>
                                        <div className="text-center pb-2 text-[12px] font-bold">अध्यक्ष (शाळा व्यवस्थापन समिती)</div>
                                      </div>
                                    </div>
                                  )}

                                  {/* 1 to 5 Reconciliation Report View */}
                                  {(monthlySubTab === "1-5" || monthlySubTab === "1-8") && renderBFormPage("1 To 5")}

                                  {/* 6 to 8 Reconciliation Report View */}
                                  {(monthlySubTab === "6-8" || monthlySubTab === "1-8") && renderBFormPage("6 To 8")}
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
                                  className="px-4 py-2.5 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-black rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                                >
                                  <FileSpreadsheet className="w-4 h-4" />
                                  <span>Download Excel</span>
                                </button>
                                <button
                                  onClick={async () => {
                                    const el = document.getElementById('annual-report-print');
                                    if (!el) return;
                                    try {
                                      setIsExporting(true);
                                      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
                                      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
                                      const imgData = canvas.toDataURL('image/jpeg', 0.98);
                                      pdf.addImage(imgData, 'JPEG', 5, 5, 287, 200);
                                      pdf.save(`Yearly_MDM_Report_${annualReportYear}.pdf`);
                                      toast.success("PDF यशस्वीरित्या डाउनलोड झाली!");
                                    } catch (e: any) {
                                      toast.error("PDF डाऊनलोड त्रुटी: " + e?.message);
                                    } finally {
                                      setIsExporting(false);
                                    }
                                  }}
                                  disabled={isExporting}
                                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                                >
                                  <FileText className="w-4 h-4" />
                                  <span>{isExporting ? "Downloading..." : "Download PDF"}</span>
                                </button>
                              </div>
                            </div>

                            {/* Class Group Sub-tabs */}
                            <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                              <button
                                onClick={() => setAnnualSubTab("1-5")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                                  annualSubTab === "1-5" ? "bg-emerald-700 text-white shadow-xs" : "text-slate-700 hover:bg-white"
                                }`}
                              >
                                {lang === "mr" ? "प्राथमिक (१ ते ५)" : "Primary (1-5)"}
                              </button>
                              <button
                                onClick={() => setAnnualSubTab("6-8")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                                  annualSubTab === "6-8" ? "bg-emerald-700 text-white shadow-xs" : "text-slate-700 hover:bg-white"
                                }`}
                              >
                                {lang === "mr" ? "उच्च प्राथमिक (६ ते ८)" : "Upper Primary (6-8)"}
                              </button>
                              <button
                                onClick={() => setAnnualSubTab("1-8")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                                  annualSubTab === "1-8" ? "bg-emerald-700 text-white shadow-xs" : "text-slate-700 hover:bg-white"
                                }`}
                              >
                                {lang === "mr" ? "एकत्रित (१ ते ८)" : "Combined (1-8)"}
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-slate-500 font-medium border-t border-slate-100 pt-3">
                            Download Excel वर क्लिक करून Excel फाईल डाउनलोड करा, किंवा Download PDF वर क्लिक करून फाईल डाऊनलोड करा.
                          </p>
                        </div>

                        {/* Printable Learnify Yearly MDM Report Card */}
                        <div
                          id="annual-report-print"
                          className="border border-slate-300 bg-white p-6 rounded-2xl shadow-xs font-sans text-xs space-y-4 overflow-x-auto print:border-none print:shadow-none print:p-0"
                        >
                          {/* Header Block */}
                          <div className="border border-slate-300 rounded-xl p-4 bg-white text-center space-y-2">
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
                                  {profile?.schoolName || "Z P SCHOOL DHONDEWADI PED"}
                                </h2>
                                <p className="text-xs font-bold text-slate-600">
                                  {annualReportType} — सन {annualReportYear || "2026-27"} · {annualSubTab === "1-5" ? "प्राथमिक ( इयत्ता १ ते ५ )" : annualSubTab === "6-8" ? "उच्च प्राथमिक ( इयत्ता ६ ते ८ )" : "इयत्ता १ ते ८ (एकत्रित)"}
                                </p>
                              </div>

                              <div className="w-16"></div>
                            </div>

                            {/* School Details Metadata Bar */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 border-t border-slate-200 pt-3 mt-3 text-left text-[11px]">
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                                <span className="text-[10px] text-slate-500 font-bold block">UDISE कोड</span>
                                <span className="font-extrabold text-slate-900">{getUdise() || "27350800701"}</span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                                <span className="text-[10px] text-slate-500 font-bold block">केंद्र</span>
                                <span className="font-extrabold text-slate-900">{profile?.center || "NARSINGPUR"}</span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                                <span className="text-[10px] text-slate-500 font-bold block">तालुका</span>
                                <span className="font-extrabold text-slate-900">{profile?.taluka || "तासगाव"}</span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                                <span className="text-[10px] text-slate-500 font-bold block">जिल्हा</span>
                                <span className="font-extrabold text-slate-900">{profile?.district || "सांगली"}</span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                                <span className="text-[10px] text-slate-500 font-bold block">पिन कोड</span>
                                <span className="font-extrabold text-slate-900">{profile?.pincode || "416312"}</span>
                              </div>
                            </div>
                          </div>

                          {/* 12 Months Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-black text-center text-[10px] font-sans">
                              <thead>
                                <tr className="bg-slate-100 text-slate-900 font-extrabold border-b border-black">
                                  <th className="border border-black p-2" rowSpan={2}>अ.क्र.</th>
                                  <th className="border border-black p-2 min-w-[90px]" rowSpan={2}>महिना</th>
                                  <th className="border border-black p-2" rowSpan={2}>पट संख्या</th>
                                  <th className="border border-black p-2" rowSpan={2}>कामाचे दिवस</th>
                                  <th className="border border-black p-2" rowSpan={2}>अन्न शिजवलेले दिवस</th>
                                  <th className="border border-black p-2" rowSpan={2}>रजा दिवस</th>
                                  <th className="border border-black p-2" rowSpan={2}>लाभार्थी संख्या/खाणारी संख्या</th>
                                  <th className="border border-black p-2" colSpan={2}>इतर शिजविणे खर्च</th>
                                  <th className="border border-black p-2" colSpan={8}>
                                    {annualReportType.includes("धान्याची") ? "धान्याची उपयोगिता" : "तांदूळ"}
                                  </th>
                                  <th className="border border-black p-2 min-w-[80px]" rowSpan={2}>मुख्याध्यापक स्वाक्षरी</th>
                                </tr>
                                <tr className="bg-slate-100 text-slate-900 font-extrabold border-b border-black">
                                  {/* इतर शिजविणे खर्च */}
                                  <th className="border border-black p-1 text-[9px]">स्वयंपाकी तथा मदतनीस मानधन</th>
                                  <th className="border border-black p-1 text-[9px]">इंधन पूरक आहार भाजीपाला अनुदान</th>

                                  {/* तांदूळ / धान्य */}
                                  <th className="border border-black p-1 text-[9px]">माल प्राप्त दिनांक</th>
                                  <th className="border border-black p-1 text-[9px]">मागील शिल्लक</th>
                                  <th className="border border-black p-1 text-[9px]">पुरवठा धारकाकडून प्राप्त</th>
                                  <th className="border border-black p-1 text-[9px]">लोक सहभागातून प्राप्त</th>
                                  <th className="border border-black p-1 text-[9px]">एकूण प्राप्त</th>
                                  <th className="border border-black p-1 text-[9px]">शिलजणारात आलेला भात</th>
                                  <th className="border border-black p-1 text-[9px]">खराब झालेने विल्हेवाट लावलेला माल</th>
                                  <th className="border border-black p-1 text-[9px]">महिन अखेर शिल्लक माल</th>
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
                                    const itemKey = annualReportType.includes("धान्याची") ? "Mugdal" : "Rice";
                                    const stockData = getStockDataForItem(itemKey, m.month, m.year, annualSubTab === "6-8" ? "6 To 8" : "1 To 5");

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
                                    totalClosingStock = closingStock; // Last month closing

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
                                        <td className="border border-black p-1 text-[9px]">{receivedSupplier > 0 ? "10/07/2026" : "—"}</td>
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
                                      <tr className="h-9 bg-slate-100 font-black text-slate-900 border-t-2 border-black">
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
                          </div>

                          {/* Footer Signatures */}
                          <div className="flex justify-between items-center border-t border-slate-300 pt-6 mt-6 text-xs text-slate-700 font-bold">
                            <div>
                              <p className="text-slate-500 font-normal">This report is generated by Smart Learning With AI MDM Portal</p>
                            </div>
                            <div className="text-center space-y-8">
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
    </div>
  );
}
