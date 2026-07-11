
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { showToast as toast } from "@/lib/custom-toast";
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
  {
    item: "Rice",
    itemMr: "तांदूळ",
    unit: "kg",
    opening: 450,
    added: 200,
    consumed: 120,
    closing: 530,
  },
  {
    item: "Pulses (Dal)",
    itemMr: "डाळ",
    unit: "kg",
    opening: 120,
    added: 50,
    consumed: 35,
    closing: 135,
  },
  {
    item: "Sprouted Moong",
    itemMr: "मूग",
    unit: "kg",
    opening: 80,
    added: 40,
    consumed: 28,
    closing: 92,
  },
  {
    item: "Soyabean Blocks",
    itemMr: "सोयाबीन वडी",
    unit: "kg",
    opening: 40,
    added: 20,
    consumed: 15,
    closing: 45,
  },
  {
    item: "Cooking Oil",
    itemMr: "गोडेतेल",
    unit: "liter",
    opening: 65,
    added: 30,
    consumed: 18,
    closing: 77,
  },
  {
    item: "Salt & Spices",
    itemMr: "मीठ व मसाले",
    unit: "kg",
    opening: 25,
    added: 10,
    consumed: 6,
    closing: 29,
  },
];

const DEFAULT_HELPERS = [
  {
    id: "1",
    name: "Sunita Devidas Shinde",
    role: "Chief Cook",
    roleMr: "मुख्य स्वयंपाकी",
    status: "Active",
    attendance: "24/26 Days",
  },
  {
    id: "2",
    name: "Rekha Ramchandra Patil",
    role: "Assistant Cook",
    roleMr: "मदतनीस स्वयंपाकी",
    status: "Active",
    attendance: "25/26 Days",
  },
];

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
    { id: "incoming", label: t_global.mdm_incoming, icon: Package },
    { id: "daily-reg", label: t_global.mdm_daily_reg, icon: Calendar },
    { id: "stock", label: t_global.mdm_stock_now, icon: Package },
    { id: "demand", label: t_global.mdm_demand, icon: FileText },
    { id: "monthly-report", label: lang === "mr" ? "मासिक अहवाल" : "Monthly Report", icon: FileSpreadsheet },
    { id: "annual-report", label: lang === "mr" ? "वार्षिक अहवाल" : "Annual Report", icon: FileSpreadsheet },
  ];

  useEffect(() => {
    if (tab && TABS.some((t) => t.id === tab)) {
      setActiveTab(tab);
    } 313
  }, [tab]);

  // Monthly Report States
  const [monthlyReportMonth, setMonthlyReportMonth] = useState<string | null>(null);
  const [reportSchoolName, setReportSchoolName] = useState("");
  const [reportTeacherName, setReportTeacherName] = useState("");
  const [reportPrincipalName, setReportPrincipalName] = useState("");
  const [monthlySubTab, setMonthlySubTab] = useState<"1-5" | "6-8" | "1-8">("1-8");
  const [annualSubTab, setAnnualSubTab] = useState<"6-8" | "1-8">("1-8");

  const [certPrimaryCookedDays, setCertPrimaryCookedDays] = useState<string>("0");
  const [certUpperCookedDays, setCertUpperCookedDays] = useState<string>("0");
  const [certWednesdaysCount, setCertWednesdaysCount] = useState<string>("0");
  const [certSupplementaryFood, setCertSupplementaryFood] = useState<string>("अंडी / केळी / पूरक आहार");
  const [certPatPrimary, setCertPatPrimary] = useState<string>("४५");
  const [certPatUpper, setCertPatUpper] = useState<string>("३५");
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

      await html2pdfFn().set(opt).from(element).save();
      toast.success(t("PDF यशस्वीरित्या डाउनलोड झाली!", "PDF downloaded successfully!", "पीडीएफ सफलतापूर्वक डाउनलोड हो गया!"));
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


  // Annual Report States
  const [annualReportYear, setAnnualReportYear] = useState<string | null>("2026-27");
  const [isAnnualReportGenerating, setIsAnnualReportGenerating] = useState(false);
  const [isAnnualReportGenerated, setIsAnnualReportGenerated] = useState(true);

  // Data States
  const [dailyRecord, setDailyRecord] = useState({
    date: new Date().toISOString().split("T")[0],
    selectedClass: "Primary (1-5)",
    totalPresent: 45,
    mealsServed: 43,
    todaysMenu: "मूग उसळ व भात",
    eggBananaCount: 43,
    remarks: "सर्व अन्न ताजे आणि स्वच्छ बनवले होते.",
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

      setCertPrimaryCookedDays(toMarathiNumbers(primaryCookedDaysVal.toString()));
      setCertUpperCookedDays(toMarathiNumbers(upperCookedDaysVal.toString()));
      setCertWednesdaysCount(toMarathiNumbers(wednesdaysCountVal.toString()));
      setCertSupplementaryFood("अंडी / केळी / पूरक आहार");
      setCertPatPrimary(toMarathiNumbers("४५"));
      setCertPatUpper(toMarathiNumbers("३५"));
      setCertBeneficiaryPrimary(toMarathiNumbers(primaryBeneficiarySumVal.toString()));
      setCertBeneficiaryUpper(toMarathiNumbers(upperBeneficiarySumVal.toString()));
      setCertHelperCount(toMarathiNumbers(helperCountVal.toString()));
    }
  }, [isMonthlyReportGenerated, monthlyReportMonth, profile, helpers]);

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
    Chili: false,
    "Garam Masala": false,
    Oil: false,
  });
  const [menuRecords, setMenuRecords] = useState<
    Record<string, { menu: string; selectedItems: Record<string, boolean> }>
  >({
    "2. Tuesday": {
      menu: "Vegetable Pulav",
      selectedItems: { Masurdal: true, Mugdal: true, Rice: true, Turdal: true },
    },
  });
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
  const [registerClass, setRegisterClass] = useState("Select Class");
  const [registerDay, setRegisterDay] = useState("");
  const [registerBeneficiary, setRegisterBeneficiary] = useState("");

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
    if (menuDay === "Select Day") {
      toast.warning(t("कृपया दिवस निवडा.", "Please select a Day first."));
      return;
    }
    setSaving(true);
    try {
      const udise = getUdise();
      const updatedRecords = {
        ...menuRecords,
        [menuDay]: {
          menu: menuType,
          selectedItems: selectedMenuItems,
        },
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
    "Mugdal",         // मूगदाळ
    "Cowpea",         // चवळी
    "Gram",           // हरभरा
    "Masurdal",       // मसूरदाळ
    "Matki",          // मटकी
    "Moong",          // अख्खा मूग
    "Turdal",         // तूरदाळ
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

      <main className="lg:pl-64 pt-20 min-h-screen pb-20 relative z-10">
        <PinGate sectionKey="mdm">
          <div className="p-6 md:p-10 space-y-6 max-w-7xl mx-auto">

          {/* ===== MDM TAB NAVIGATION BAR ===== */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-4">
            {/* Title Row */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-md">
                <Utensils className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-800">Mid-Day Meal (MDM)</h1>
                <p className="text-xs text-slate-500 font-medium">माध्यान्ह भोजन व्यवस्थापन</p>
              </div>
            </div>
            {/* Tab Buttons Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TABS.map((tabItem) => {
                const Icon = tabItem.icon;
                const isActive = activeTab === tabItem.id;
                return (
                  <button
                    key={tabItem.id}
                    onClick={() => setActiveTab(tabItem.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 border ${isActive
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-500 shadow-md shadow-indigo-200 scale-[1.02]"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
                      }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : "text-indigo-400"}`} />
                    <span className="truncate">{tabItem.label}</span>
                  </button>
                );
              })}
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
                {/* 1. QUANTITY TAB */}
                {activeTab === "quantity" && (
                  <div className="bg-white p-12 border border-slate-300 w-full min-h-[800px] flex flex-col items-center">
                    <div className="w-full max-w-[800px] space-y-10">
                      {/* Title */}
                      <div className="text-center py-4">
                        <h2 className="text-2xl font-bold text-[#004C99]">
                          {t_global.mdm_quantity}
                        </h2>
                      </div>

                      {/* Input Form */}
                      <div className="flex flex-col md:flex-row items-end gap-6">
                        <div className="flex-1 space-y-2">
                          <label className="text-xs font-bold block">
                            {t_global.mdm_class_label}
                          </label>
                          <select
                            value={qtyClass}
                            onChange={(e) =>
                              handleQuantityClassChange(e.target.value)
                            }
                            className="w-full h-8 px-2 bg-white border border-black rounded shadow-sm text-sm font-medium"
                          >
                            <option value="1-5">
                              {t("१ ते ५", "1 To 5", "1 से 5")}
                            </option>
                            <option value="6-8">
                              {t("६ ते ८", "6 To 8", "6 से 8")}
                            </option>
                          </select>
                        </div>

                        <div className="flex-1 space-y-2">
                          <label className="text-xs font-bold block">
                            {t_global.mdm_contents_label}
                          </label>
                          <select
                            value={qtyContent}
                            onChange={(e) =>
                              handleQuantityContentChange(e.target.value)
                            }
                            className="w-full h-8 px-2 bg-white border border-black rounded shadow-sm text-sm font-medium"
                          >
                            <option value="">
                              {t_global.mdm_select_content}
                            </option>
                            <option value="Rice">
                              {t_global.mdm_item_rice}
                            </option>
                            <option value="Pease">
                              {t_global.mdm_item_pease}
                            </option>
                            <option value="Mugdal">
                              {t_global.mdm_item_mugdal}
                            </option>
                            <option value="Cowpea">
                              {t_global.mdm_item_cowpea}
                            </option>
                            <option value="Gram">
                              {t_global.mdm_item_gram}
                            </option>
                            <option value="Masurdal">
                              {t_global.mdm_item_masurdal}
                            </option>
                            <option value="Matki">
                              {t_global.mdm_item_matki}
                            </option>
                            <option value="Moong">
                              {t_global.mdm_item_moong}
                            </option>
                            <option value="Turdal">
                              {t_global.mdm_item_turdal}
                            </option>
                            <option value="Soyabean Wadi">
                              {t_global.mdm_item_soyabean}
                            </option>
                            <option value="Turmeric">
                              {t_global.mdm_item_turmeric}
                            </option>
                            <option value="Salt">
                              {t_global.mdm_item_salt}
                            </option>
                            <option value="Onion Garlic Masala">
                              {t_global.mdm_item_onion_garlic}
                            </option>
                            <option value="Cumin">
                              {t_global.mdm_item_cumin}
                            </option>
                            <option value="Mustard">
                              {t_global.mdm_item_mustard}
                            </option>
                            <option value="Chili">
                              {t_global.mdm_item_chili}
                            </option>
                            <option value="Garam Masala">
                              {t_global.mdm_item_garam_masala}
                            </option>
                            <option value="Oil">
                              {t_global.mdm_item_oil}
                            </option>
                          </select>
                        </div>

                        <div className="flex-1 space-y-2">
                          <label className="text-xs font-bold block">
                            {t_global.mdm_qty_gram_note}
                          </label>
                          <input
                            type="text"
                            value={qtyAmount}
                            onChange={(e) => setQtyAmount(e.target.value)}
                            className="w-full h-8 px-2 bg-white border border-black rounded shadow-sm text-sm font-medium"
                          />
                        </div>
                      </div>

                      <div className="py-2 flex gap-4">
                        <button
                          onClick={() => setShowQuantityReportModal(true)}
                          className="px-5 py-2 bg-[#007bff] text-white rounded text-xs font-bold shadow-md hover:bg-blue-700 transition-colors"
                        >
                          {t_global.mdm_report_btn}
                        </button>
                        {isQuantityChanged && (
                          <button
                            onClick={handleUpdateQuantityRule}
                            className="px-5 py-2 bg-[#28a745] hover:bg-[#218838] text-white rounded text-xs font-bold shadow-md transition-colors"
                          >
                            {t("अद्यतन करा", "Update", "अपडेट करें")}
                          </button>
                        )}
                      </div>

                      {/* Quantity Report Modal (Overlay without dark background) */}
                      {showQuantityReportModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-transparent backdrop-blur-sm font-sans p-4">
                          <div className="bg-white p-6 rounded-md shadow-2xl border border-slate-200 w-full max-w-[650px] max-h-[95vh] flex flex-col relative print:shadow-none print:border-none print:w-full print:max-w-full print:p-0 print:h-auto">
                            {/* Printable Area */}
                            <div
                              className="border border-black flex-1 overflow-y-auto print:overflow-visible bg-white print:border-none"
                              id="quantity-report-print"
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
                                    {t(
                                      "पोषण आहार",
                                      "Nutritional intake",
                                      "पोषण आहार",
                                    )}{" "}
                                    ( {t("इयत्ता", "Class", "कक्षा")}{" "}
                                    {qtyClass === "1-5"
                                      ? t("१ ते ५", "1 To 5", "1 से 5")
                                      : t("६ ते ८", "6 To 8", "6 से 8")}{" "}
                                    )
                                  </div>
                                </div>
                              </div>

                              {/* Table */}
                              <table className="w-full border-collapse text-black text-[11px] text-center border border-black">
                                <thead>
                                  <tr className="bg-slate-50">
                                    <th className="border border-black py-2 font-bold w-[15%]">
                                      {t("अ.क्र.", "Sr. No.", "क्र.")}
                                    </th>
                                    <th className="border border-black py-2 font-bold w-[50%]">
                                      {t("तपशील", "Details / Contents", "विवरण")}
                                    </th>
                                    <th className="border border-black py-2 font-bold w-[35%]">
                                      {qtyClass === "1-5"
                                        ? t("प्रमाण इ १ ते ५", "Quantity Class 1 to 5", "मात्रा कक्षा 1 से 5")
                                        : t("प्रमाण इ ६ ते ८", "Quantity Class 6 to 8", "मात्रा कक्षा 6 से 8")}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {quantityRules.map((row, idx) => (
                                    <tr key={idx} className="bg-white">
                                      <td className="border border-black py-1.5 text-center font-medium">
                                        {idx + 1}
                                      </td>
                                      <td className="border border-black py-1.5 text-center font-semibold">
                                        {getTranslatedItem(row.item)}
                                      </td>
                                      <td className="border border-black py-1.5 text-center font-bold italic">
                                        {qtyClass === "1-5"
                                          ? row.qty15
                                          : row.qty68}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 mt-4 print:hidden">
                              <button
                                onClick={handleQuantityReportDownload}
                                className="px-5 py-1.5 bg-[#007bff] hover:bg-blue-700 text-white rounded text-[13px] font-semibold shadow-md transition-colors"
                              >
                                {t("डाउनलोड पीडीएफ", "Download PDF", "डाउनलोड पीडीएफ")}
                              </button>
                              <button
                                onClick={() =>
                                  setShowQuantityReportModal(false)
                                }
                                className="px-5 py-1.5 bg-[#f44336] hover:bg-red-700 text-white rounded text-[13px] font-semibold shadow-md transition-colors"
                              >
                                {t("बंद करा", "Close", "बंद करें")}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Divider */}
                      <div className="h-px w-full bg-slate-300" />

                      {/* Table Section */}
                      <div className="space-y-4">
                        <div className="text-center space-y-1 font-serif print:text-black">
                          <h3 className="text-lg font-bold text-slate-800 tracking-wide">
                            {t(
                              "मध्यान्ह भोजन योजना सन २०२५-२६",
                              "Mid-Day Meal Scheme Year 2025-26",
                              "मध्यान्ह भोजन योजना वर्ष २०२५-२६",
                            )}
                          </h3>
                          <h4 className="text-md font-bold text-slate-700">
                            {t(
                              "नवीन पाककृती प्रमाण",
                              "New Recipe Quantities",
                              "नवीन नुस्खा मात्रा",
                            )}
                          </h4>
                          <p className="text-xs font-medium text-slate-500">
                            {t(
                              "ऑगस्ट २५ ते सप्टेंबर २०२५",
                              "August 25 to September 2025",
                              "अगस्त २०२५ से सितंबर २०२५",
                            )}
                          </p>
                        </div>

                        <div className="w-full">
                          <table className="w-full border-collapse border border-black">
                            <thead>
                              <tr className="bg-slate-50">
                                <th className="border border-black p-2 text-sm font-bold text-center w-[15%]">
                                  {t("अ.क्र.", "Sr. No.", "क्र.")}
                                </th>
                                <th className="border border-black p-2 text-sm font-bold text-center w-[50%]">
                                  {t("तपशील", "Details / Contents", "विवरण")}
                                </th>
                                <th className="border border-black p-2 text-sm font-bold text-center w-[35%]">
                                  {qtyClass === "1-5"
                                    ? t("प्रमाण इ १ ते ५", "Quantity Class 1 to 5", "मात्रा कक्षा 1 से 5")
                                    : t("प्रमाण इ ६ ते ८", "Quantity Class 6 to 8", "मात्रा कक्षा 6 से 8")}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {quantityRules.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50 bg-white transition-colors">
                                  <td className="border border-black p-2 text-center text-xs font-medium text-slate-800">
                                    {i + 1}
                                  </td>
                                  <td className="border border-black p-2 text-center text-xs font-semibold text-slate-800">
                                    {getTranslatedItem(row.item)}
                                  </td>
                                  <td className="border border-black p-2 text-center text-xs font-bold text-slate-800 italic">
                                    {qtyClass === "1-5" ? row.qty15 : row.qty68}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. MENU TAB */}
                {activeTab === "menu" && (
                  <div className="bg-white p-12 border border-slate-300 w-full min-h-[800px] flex flex-col items-center">
                    <div className="w-full max-w-[800px] space-y-10">
                      {/* Title */}
                      <div className="text-center py-4">
                        <h2 className="text-2xl font-bold text-[#004C99]">
                          {t("अन्न मेनू", "Food Menu", "खाद्य मेनू")}
                        </h2>
                      </div>

                      {/* Dropdowns row */}
                      <div className="flex flex-col md:flex-row justify-center items-center gap-8 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800">
                            {t("दिवस:", "Day:")}
                          </span>
                          <select
                            value={menuDay}
                            onChange={(e) =>
                              handleMenuDayChange(e.target.value)
                            }
                            className="h-8 px-2 bg-white border border-black rounded shadow-sm text-sm font-medium"
                          >
                            <option value="Select Day">
                              {t("दिवस निवडा", "Select Day")}
                            </option>
                            <option disabled>
                              {t(
                                "—— पहिला आणि तिसरा आठवडा ——",
                                "—— First And Third Week ——",
                                "—— पहला और तीसरा सप्ताह ——",
                              )}
                            </option>
                            <option value="1. Monday">
                              {getTranslatedDay("1. Monday")}
                            </option>
                            <option value="2. Tuesday">
                              {getTranslatedDay("2. Tuesday")}
                            </option>
                            <option value="3. Wednesday">
                              {getTranslatedDay("3. Wednesday")}
                            </option>
                            <option value="4. Thursday">
                              {getTranslatedDay("4. Thursday")}
                            </option>
                            <option value="5. Friday">
                              {getTranslatedDay("5. Friday")}
                            </option>
                            <option value="6. Saturday">
                              {getTranslatedDay("6. Saturday")}
                            </option>
                            <option disabled>
                              {t(
                                "—— दुसरा आणि चौथा आठवडा ——",
                                "—— Second And Fourth Week ——",
                                "—— दूसरा और चौथा सप्ताह ——",
                              )}
                            </option>
                            <option value="7. Monday">
                              {getTranslatedDay("7. Monday")}
                            </option>
                            <option value="8. Tuesday">
                              {getTranslatedDay("8. Tuesday")}
                            </option>
                            <option value="9. Wednesday">
                              {getTranslatedDay("9. Wednesday")}
                            </option>
                            <option value="10. Thursday">
                              {getTranslatedDay("10. Thursday")}
                            </option>
                            <option value="11. Friday">
                              {getTranslatedDay("11. Friday")}
                            </option>
                            <option value="12. Saturday">
                              {getTranslatedDay("12. Saturday")}
                            </option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800">
                            {t("मेनू:", "Menu:")}
                          </span>
                          <select
                            value={menuType}
                            onChange={(e) => setMenuType(e.target.value)}
                            className="h-8 px-2 bg-white border border-black rounded shadow-sm text-sm font-medium min-w-[120px]"
                          >
                            <option value="Select Menu">
                              {t("मेनू निवडा", "Select Menu")}
                            </option>
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
                      </div>

                      {/* Double Divider */}
                      <div className="space-y-1 w-full">
                        <div className="h-px w-full bg-slate-300" />
                        <div className="h-px w-full bg-slate-300" />
                      </div>

                      {/* Checkbox Checklist Panel */}
                      <div className="w-full border border-black bg-[#F5F5F5] rounded p-8 md:p-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                          {/* Left Column Checkboxes */}
                          <div className="space-y-4">
                            {[
                              "Rice",
                              "Mugdal",
                              "Turdal",
                              "Masurdal",
                              "Matki",
                              "Moong",
                              "Cowpea",
                              "Gram",
                              "Pease",
                              "Mustard",
                              "Cumin",
                            ].map((item) => (
                              <label
                                key={item}
                                className="flex items-center gap-4 cursor-pointer select-none"
                              >
                                <input
                                  type="checkbox"
                                  checked={!!selectedMenuItems[item]}
                                  onChange={(e) =>
                                    setSelectedMenuItems({
                                      ...selectedMenuItems,
                                      [item]: e.target.checked,
                                    })
                                  }
                                  className="size-5 border border-slate-400 bg-white checked:bg-blue-600 focus:ring-0 rounded outline-none"
                                />
                                <span className="text-sm font-bold text-slate-800">
                                  {getTranslatedItem(item)}
                                </span>
                              </label>
                            ))}
                          </div>

                          {/* Right Column Checkboxes */}
                          <div className="space-y-4">
                            {[
                              "Turmeric",
                              "Oil",
                              "Salt",
                              "Onion Garlic Masala",
                              "Garam Masala",
                              "Chili",
                              "Vegetables",
                              "Milk-Milk Powder",
                              "Sugar-Jaggery",
                              "Soyabean Wadi",
                              "Ragi Satva",
                            ].map((item) => (
                              <label
                                key={item}
                                className="flex items-center gap-4 cursor-pointer select-none"
                              >
                                <input
                                  type="checkbox"
                                  checked={!!selectedMenuItems[item]}
                                  onChange={(e) =>
                                    setSelectedMenuItems({
                                      ...selectedMenuItems,
                                      [item]: e.target.checked,
                                    })
                                  }
                                  className="size-5 border border-slate-400 bg-white checked:bg-blue-600 focus:ring-0 rounded outline-none"
                                />
                                <span className="text-sm font-bold text-slate-800">
                                  {getTranslatedItem(item)}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Buttons Row */}
                      <div className="w-full flex justify-between items-center py-2">
                        <button
                          onClick={handleSaveMenu}
                          className="px-5 py-2 bg-[#4CAF50] hover:bg-[#43A047] text-white rounded text-xs font-bold shadow-md transition-colors"
                        >
                          {t("जतन करा", "Save", "सहेजें")}
                        </button>
                        <button
                          onClick={handleReportMenu}
                          className="px-5 py-2 bg-[#D4A017] hover:bg-[#B8860B] text-white rounded text-xs font-bold shadow-md transition-colors"
                        >
                          {t("अहवाल", "Report", "रिपोर्ट")}
                        </button>
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
                  </div>
                )}

                {/* 3. INCOMING ENTRY TAB */}
                {activeTab === "incoming" && (
                  <div className="bg-white p-12 border border-slate-300 w-full min-h-[800px] flex flex-col items-center">
                    <div className="w-full max-w-[800px] space-y-10">
                      {/* Title */}
                      <div className="text-center py-4">
                        <h2 className="text-2xl font-bold text-[#004C99]">
                          {t("येणारी नोंद", "Incoming entry", "आगम प्रविष्टि")}
                        </h2>
                      </div>

                      {/* Dropdowns row */}
                      <div className="flex flex-col md:flex-row justify-center items-center gap-8 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800">
                            {t("वर्ष:", "Year:")}
                          </span>
                          <select
                            value={incomingYear}
                            onChange={(e) => setIncomingYear(e.target.value)}
                            className="h-8 px-2 bg-white border border-black rounded shadow-sm text-sm font-medium"
                          >
                            <option value="Select Year">
                              {t("वर्ष निवडा", "Select Year")}
                            </option>
                            <option value="2020">2020</option>
                            <option value="2021">2021</option>
                            <option value="2022">2022</option>
                            <option value="2023">2023</option>
                            <option value="2024">2024</option>
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                            <option value="2027">2027</option>
                            <option value="2028">2028</option>
                            <option value="2029">2029</option>
                            <option value="2030">2030</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800">
                            {t("महिना:", "Month:")}
                          </span>
                          <select
                            value={incomingMonth}
                            onChange={(e) => setIncomingMonth(e.target.value)}
                            className="h-8 px-2 bg-white border border-black rounded shadow-sm text-sm font-medium min-w-[120px]"
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

                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800">
                            {t("इयत्ता:", "Class:")}
                          </span>
                          <select
                            value={incomingClass}
                            onChange={(e) => setIncomingClass(e.target.value)}
                            className="h-8 px-2 bg-white border border-black rounded shadow-sm text-sm font-medium"
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

                      {/* Divider */}
                      <div className="h-px w-full bg-slate-300" />

                      {/* Table Section */}
                      <div className="w-full overflow-x-auto">
                        <table className="w-full border-collapse border border-black text-slate-900 bg-white">
                          <thead>
                            <tr className="bg-white">
                              <th className="border border-black p-2 text-sm font-bold text-center w-[25%]">
                                {t("साहित्य", "Items", "सामग्री")}
                              </th>
                              <th className="border border-black p-2 text-sm font-bold text-center w-[25%]">
                                {t(
                                  "प्रमाण (१ ग्राम = ०.००१ किलो)",
                                  "Quantity(1gram = 0.001 kilo)",
                                  "मात्रा (1 ग्राम = 0.001 किलोग्राम)",
                                )}
                              </th>
                              <th className="border border-black p-2 text-sm font-bold text-center w-[25%]">
                                {t("साहित्य", "Items", "सामग्री")}
                              </th>
                              <th className="border border-black p-2 text-sm font-bold text-center w-[25%]">
                                {t(
                                  "प्रमाण (१ ग्राम = ०.००१ किलो)",
                                  "Quantity(1gram = 0.001 kilo)",
                                  "मात्रा (1 ग्राम = 0.001 किलोग्राम)",
                                )}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { left: "Rice", right: "Turmeric" },
                              { left: "Mugdal", right: "Chili" },
                              { left: "Turdal", right: "Oil" },
                              { left: "Masurdal", right: "Salt" },
                              { left: "Matki", right: "Onion Garlic Masala" },
                              { left: "Moong", right: "Garam Masala" },
                              { left: "Cowpea", right: "Vegetables" },
                              { left: "Gram", right: "Milk-Milk Powder" },
                              { left: "Pease", right: "Sugar-Jaggery" },
                              { left: "Cumin", right: "Soyabean Wadi" },
                              { left: "Mustard", right: "Ragi Satva" },
                            ].map((row, i) => (
                              <tr key={i} className="bg-white">
                                <td className="border border-black p-2 text-center text-xs font-medium text-slate-700">
                                  {getTranslatedItem(row.left)}
                                </td>
                                <td className="border border-black p-2 text-center text-xs font-medium">
                                  <input
                                    type="text"
                                    value={incomingQuantities[row.left] || ""}
                                    onChange={(e) =>
                                      setIncomingQuantities({
                                        ...incomingQuantities,
                                        [row.left]: e.target.value,
                                      })
                                    }
                                    className="w-[80%] mx-auto text-center border-t-0 border-l-0 border-r-0 border-b border-slate-400 focus:border-black outline-none bg-transparent text-slate-850 font-bold"
                                  />
                                </td>
                                <td className="border border-black p-2 text-center text-xs font-medium text-slate-700">
                                  {getTranslatedItem(row.right)}
                                </td>
                                <td className="border border-black p-2 text-center text-xs font-medium">
                                  <input
                                    type="text"
                                    value={incomingQuantities[row.right] || ""}
                                    onChange={(e) =>
                                      setIncomingQuantities({
                                        ...incomingQuantities,
                                        [row.right]: e.target.value,
                                      })
                                    }
                                    className="w-[80%] mx-auto text-center border-t-0 border-l-0 border-r-0 border-b border-slate-400 focus:border-black outline-none bg-transparent text-slate-850 font-bold"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Save & Report Buttons Row */}
                      <div className="py-2 w-full flex justify-start gap-4">
                        <button
                          onClick={handleSaveIncoming}
                          className="px-5 py-2 bg-[#4CAF50] hover:bg-[#43A047] text-white rounded text-xs font-bold shadow-md transition-colors"
                        >
                          {t("जतन करा", "Save", "सहेजें")}
                        </button>
                        <button
                          onClick={handleIncomingReport}
                          className="px-5 py-2 bg-[#007bff] hover:bg-blue-700 text-white rounded text-xs font-bold shadow-md transition-colors"
                        >
                          {t("अहवाल", "Report", "रिपोर्ट")}
                        </button>
                      </div>

                      {/* Incoming Report Modal */}
                      {showIncomingReportModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-transparent backdrop-blur-sm font-sans p-4">
                          <div className="bg-white p-6 rounded-md shadow-2xl border border-slate-200 w-full max-w-[650px] max-h-[95vh] flex flex-col relative print:shadow-none print:border-none print:w-full print:max-w-full print:p-0 print:h-auto">
                            {/* Printable Area */}
                            <div
                              className="border border-black flex-1 overflow-y-auto print:overflow-visible bg-white print:border-none"
                              id="incoming-report-print"
                            >
                              {/* Header */}
                              <div className="text-center text-black border-b border-black py-4 print:border-b-2">
                                <h3 className="font-bold text-sm tracking-[0.2em] uppercase">
                                  {profile?.schoolName || "A B C"}
                                </h3>
                                <p className="text-[10px] mt-1">
                                  {t("तालुका:", "Taluka:")}{" "}
                                  {profile?.taluka || ""}, UDISE: {getUdise()}
                                </p>
                                <p className="text-[10px] mb-2">
                                  {t(
                                    "येणारा साठा अहवाल",
                                    "Incoming Stock Report",
                                    "आगम स्टॉक रिपोर्ट",
                                  )}{" "}
                                  (
                                  {t(
                                    incomingMonth === "January"
                                      ? "जानेवारी"
                                      : incomingMonth === "February"
                                        ? "फेब्रुवारी"
                                        : incomingMonth === "March"
                                          ? "मार्च"
                                          : incomingMonth === "April"
                                            ? "एप्रिल"
                                            : incomingMonth === "May"
                                              ? "मे"
                                              : incomingMonth === "June"
                                                ? "जून"
                                                : incomingMonth === "July"
                                                  ? "जुलै"
                                                  : incomingMonth === "August"
                                                    ? "ऑगस्ट"
                                                    : incomingMonth ===
                                                      "September"
                                                      ? "सप्टेंबर"
                                                      : incomingMonth ===
                                                        "October"
                                                        ? "ऑक्टोबर"
                                                        : incomingMonth ===
                                                          "November"
                                                          ? "नोव्हेंबर"
                                                          : incomingMonth ===
                                                            "December"
                                                            ? "डिसेंबर"
                                                            : incomingMonth,
                                    incomingMonth,
                                    incomingMonth === "January"
                                      ? "जनवरी"
                                      : incomingMonth === "February"
                                        ? "फरवरी"
                                        : incomingMonth === "March"
                                          ? "मार्च"
                                          : incomingMonth === "April"
                                            ? "अप्रैल"
                                            : incomingMonth === "May"
                                              ? "मई"
                                              : incomingMonth === "June"
                                                ? "जून"
                                                : incomingMonth === "July"
                                                  ? "जुलाई"
                                                  : incomingMonth === "August"
                                                    ? "अगस्त"
                                                    : incomingMonth ===
                                                      "September"
                                                      ? "सितंबर"
                                                      : incomingMonth ===
                                                        "October"
                                                        ? "अक्टूबर"
                                                        : incomingMonth ===
                                                          "November"
                                                          ? "नवंबर"
                                                          : incomingMonth ===
                                                            "December"
                                                            ? "दिसंबर"
                                                            : incomingMonth,
                                  )}{" "}
                                  {incomingYear})
                                </p>

                                <div className="flex justify-center mt-1">
                                  <div className="bg-black text-white px-5 py-1 text-xs font-bold rounded shadow-sm print:border print:border-black print:text-black print:bg-white">
                                    {t(
                                      "येणारा साठा",
                                      "Incoming Stock",
                                      "आगम स्टॉक",
                                    )}{" "}
                                    ( {t("इयत्ता", "Class", "कक्षा")}{" "}
                                    {incomingClass === "1 To 5"
                                      ? t("१ ते ५", "1 To 5", "1 से 5")
                                      : t("६ ते ८", "6 To 8", "6 से 8")}{" "}
                                    )
                                  </div>
                                </div>
                              </div>

                              {/* Table */}
                              <table className="w-full border-collapse text-black text-[11px] text-center">
                                <thead>
                                  <tr>
                                    <th className="border-b border-r border-black py-2 font-bold w-[20%]">
                                      {t("अ.क्र.", "Sr.No", "क्र.")}
                                    </th>
                                    <th className="border-b border-r border-black py-2 font-bold w-[45%]">
                                      {t(
                                        "साहित्याचे नाव",
                                        "Item name",
                                        "सामग्री का नाम",
                                      )}
                                    </th>
                                    <th className="border-b border-black py-2 font-bold w-[35%]">
                                      {t(
                                        "प्राप्त प्रमाण (ग्राम / युनिट्स)",
                                        "Quantity Received (grams / units)",
                                        "मात्रा प्राप्त (ग्राम / इकाइयां)",
                                      )}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Object.keys(incomingQuantities).map(
                                    (item, idx) => {
                                      const qty = incomingQuantities[item];
                                      return (
                                        <tr key={item}>
                                          <td className="border-b border-r border-black py-1.5">
                                            {idx + 1}
                                          </td>
                                          <td className="border-b border-r border-black py-1.5">
                                            {getTranslatedItem(item)}
                                          </td>
                                          <td className="border-b border-black py-1.5">
                                            {qty || "0"}
                                          </td>
                                        </tr>
                                      );
                                    },
                                  )}
                                </tbody>
                              </table>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 mt-4 print:hidden">
                              <button
                                onClick={handleIncomingReportDownload}
                                className="px-5 py-1.5 bg-[#007bff] hover:bg-blue-700 text-white rounded text-[13px] font-semibold shadow-md transition-colors"
                              >
                                {t(
                                  "डाउनलोड पीडीएफ",
                                  "Download PDF",
                                  "डाउनलोड पीडीएफ",
                                )}
                              </button>
                              <button
                                onClick={() =>
                                  setShowIncomingReportModal(false)
                                }
                                className="px-5 py-1.5 bg-[#f44336] hover:bg-red-700 text-white rounded text-[13px] font-semibold shadow-md transition-colors"
                              >
                                {t("बंद करा", "Close", "बंद करें")}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. DAILY REGISTER TAB */}
                {activeTab === "daily-reg" && (
                  <div className="bg-white p-12 border border-slate-300 w-full min-h-[800px] flex flex-col items-center">
                    <div className="w-full max-w-[800px] space-y-10">
                      {/* Title */}
                      <div className="text-center py-4">
                        <h2 className="text-2xl font-bold text-[#004C99]">
                          {t(
                            "दैनिक नोंदवही",
                            "Daily register",
                            "दैनिक रजिस्टर",
                          )}
                        </h2>
                      </div>

                      {/* Inputs Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-2 text-slate-800">
                        <div className="space-y-2">
                          <span className="text-sm font-bold block">
                            {t("दिनांक:", "Date:")}
                          </span>
                          <input
                            type="date"
                            value={registerDate}
                            onChange={(e) => setRegisterDate(e.target.value)}
                            className="w-full h-8 px-2 bg-white border border-black rounded shadow-sm text-sm font-medium outline-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <span className="text-sm font-bold block">
                            {t("इयत्ता:", "Class:")}
                          </span>
                          <select
                            value={registerClass}
                            onChange={(e) => setRegisterClass(e.target.value)}
                            className="w-full h-8 px-2 bg-white border border-black rounded shadow-sm text-sm font-medium outline-none"
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

                        <div className="space-y-2">
                          <span className="text-sm font-bold block">
                            {t("दिवस:", "Day:")}
                          </span>
                          <input
                            type="text"
                            value={registerDay}
                            onChange={(e) => setRegisterDay(e.target.value)}
                            className="w-full h-8 px-2 bg-white border border-black rounded shadow-sm text-sm font-medium outline-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <span className="text-sm font-bold block">
                            {t("लाभार्थी संख्या:", "Beneficiary:", "लाभार्थी:")}
                          </span>
                          <input
                            type="text"
                            value={registerBeneficiary}
                            onChange={(e) =>
                              setRegisterBeneficiary(e.target.value)
                            }
                            className="w-full h-8 px-2 bg-white border border-black rounded shadow-sm text-sm font-medium outline-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <span className="text-sm font-bold block">
                            {t("मेनू:", "Menu:")}
                          </span>
                          <div className="h-8 flex items-center text-sm font-medium text-slate-500">
                            {getTranslatedMenu(
                              getMenuForRegisterDate(registerDate),
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="h-px w-full bg-slate-300" />

                      {/* Buttons Row */}
                      <div className="w-full flex justify-between items-center py-2">
                        <button
                          onClick={handleSaveRegister}
                          className="px-5 py-2 bg-[#4CAF50] hover:bg-[#43A047] text-white rounded text-xs font-bold shadow-md transition-colors"
                        >
                          {t("जतन करा", "Save", "सहेजें")}
                        </button>
                        <div className="flex gap-4">
                          <button
                            onClick={handleRiceReport}
                            className="px-5 py-2 bg-[#D4A017] hover:bg-[#B8860B] text-white rounded text-xs font-bold shadow-md transition-colors"
                          >
                            {t("तांदूळ अहवाल", "Rice Report", "चावल रिपोर्ट")}
                          </button>
                          <button
                            onClick={handleGeneralReport}
                            className="px-5 py-2 bg-[#D4A017] hover:bg-[#B8860B] text-white rounded text-xs font-bold shadow-md transition-colors"
                          >
                            {t("अहवाल", "Report", "रिपोर्ट")}
                          </button>
                        </div>
                      </div>

                      {/* Table Section */}
                      <div className="w-full overflow-x-auto">
                        <table className="w-full border-collapse border border-black text-slate-900 bg-white">
                          <thead>
                            <tr className="bg-white">
                              <th className="border border-black p-2 text-sm font-bold text-center w-[25%]">
                                {t(
                                  "मेनू साहित्य",
                                  "Menu Content",
                                  "मेनू सामग्री",
                                )}
                              </th>
                              <th className="border border-black p-2 text-sm font-bold text-center w-[25%]">
                                {t(
                                  "प्रमाण (ग्राम मध्ये)",
                                  "Quantity (In Gram)",
                                  "मात्रा (ग्राम में)",
                                )}
                              </th>
                              <th className="border border-black p-2 text-sm font-bold text-center w-[25%]">
                                {t("लाभार्थी", "Beneficiary", "लाभार्थी")}
                              </th>
                              <th className="border border-black p-2 text-sm font-bold text-center w-[25%]">
                                {t(
                                  "एकूण (ग्राम मध्ये)",
                                  "Total (In Gram)",
                                  "कुल (ग्राम में)",
                                )}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const rows = getDailyRegisterRows();
                              return rows.map((row, i) => (
                                <tr key={i} className="bg-white h-8">
                                  <td className="border border-black p-2 text-center text-xs font-medium text-slate-700">
                                    {getTranslatedItem(row.item)}
                                  </td>
                                  <td className="border border-black p-2 text-center text-xs font-medium text-slate-700">
                                    {row.qty}
                                  </td>
                                  <td className="border border-black p-2 text-center text-xs font-medium text-slate-700">
                                    {row.beneficiary}
                                  </td>
                                  <td className="border border-black p-2 text-center text-xs font-medium text-slate-700">
                                    {row.total}
                                  </td>
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
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

                {/* 6. DEMAND TAB */}
                {activeTab === "demand" && (
                  <div className="bg-white p-12 border border-slate-300 w-full min-h-[800px] flex flex-col items-center">
                    <div className="w-full max-w-[800px] space-y-10">
                      {/* Title */}
                      <div className="text-center py-4">
                        <h2 className="text-2xl font-bold text-[#004C99]">
                          {t("मागणी", "Demand", "मांग")}
                        </h2>
                      </div>

                      {/* Dropdowns Row 1 */}
                      <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-2 text-slate-800 w-full">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800 whitespace-nowrap">
                            {t(
                              "पासून दिनांक :",
                              "From Date :",
                              "प्रारंभ तिथि :",
                            )}
                          </span>
                          <input
                            type="date"
                            value={demandFromDate}
                            onChange={(e) => setDemandFromDate(e.target.value)}
                            className="h-8 px-2 bg-white border border-[#ccc] rounded shadow-none text-sm font-normal text-slate-800 outline-none focus:border-slate-400"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800 whitespace-nowrap">
                            {t(
                              "धान्य सामग्री :",
                              "Menu content:",
                              "खाद्य सामग्री :",
                            )}
                          </span>
                          <select
                            value={demandContent}
                            onChange={(e) =>
                              handleDemandContentChange(e.target.value)
                            }
                            className="h-8 px-2 bg-white border border-[#ccc] rounded shadow-none text-sm font-normal text-slate-800 outline-none focus:border-slate-400 min-w-[140px]"
                          >
                            <option value="Select content">
                              {t(
                                "सामग्री निवडा",
                                "Select content",
                                "सामग्री चुनें",
                              )}
                            </option>
                            {[
                              "Rice",
                              "Mugdal",
                              "Turdal",
                              "Masurdal",
                              "Matki",
                              "Moong",
                              "Cowpea",
                              "Gram",
                              "Pease",
                              "Oil",
                              "Salt",
                              "Onion Garlic Masala",
                              "Garam Masala",
                              "Chili",
                              "Vegetables",
                              "Milk-Milk Powder",
                              "Sugar-Jaggery",
                              "Soyabean Wadi",
                              "Ragi Satva",
                            ].map((c) => (
                              <option key={c} value={c}>
                                {getTranslatedItem(c)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800 whitespace-nowrap">
                            {t("मागणी :", "Demand :", "मांग :")}
                          </span>
                          <input
                            type="text"
                            value={demandQty}
                            onChange={(e) => setDemandQty(e.target.value)}
                            className="h-8 w-36 px-2 bg-white border border-[#ccc] rounded shadow-none text-sm font-normal text-slate-800 outline-none focus:border-slate-400"
                          />
                        </div>
                      </div>

                      {/* Dropdowns Row 2 */}
                      <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-2 text-slate-800 w-full">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800 whitespace-nowrap">
                            {t("पर्यंत दिनांक :", "To Date:", "अंतिम तिथि :")}
                          </span>
                          <input
                            type="date"
                            value={demandToDate}
                            onChange={(e) => setDemandToDate(e.target.value)}
                            className="h-8 px-2 bg-white border border-[#ccc] rounded shadow-none text-sm font-normal text-slate-800 outline-none focus:border-slate-400"
                          />
                        </div>

                        <div className="flex gap-4">
                          <button
                            onClick={handleSaveDemand}
                            className="px-5 py-2 bg-[#4CAF50] hover:bg-[#43A047] text-white rounded text-xs font-bold shadow-md transition-colors"
                          >
                            {t("जतन करा", "Save", "सहेजें")}
                          </button>
                          <button
                            onClick={handleDemandReport}
                            className="px-5 py-2 bg-[#D4A017] hover:bg-[#B8860B] text-white rounded text-xs font-bold shadow-md transition-colors"
                          >
                            {t("अहवाल", "Report", "रिपोर्ट")}
                          </button>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="h-px w-full bg-slate-300" />

                      {/* Table Section */}
                      <div className="w-full overflow-x-auto font-sans">
                        <table className="w-full border-collapse border border-black text-slate-900 bg-white">
                          <thead>
                            <tr className="bg-slate-50">
                              <th className="border border-black p-3 text-sm font-bold text-center w-[25%]">
                                {t("दिनांक", "Date", "दिनांक")}
                              </th>
                              <th className="border border-black p-3 text-sm font-bold text-center w-[30%]">
                                {t(
                                  "धान्य सामग्री",
                                  "Menu content",
                                  "खाद्य सामग्री",
                                )}
                              </th>
                              <th className="border border-black p-3 text-sm font-bold text-center w-[30%]">
                                {t(
                                  "मागणी (किलोग्राम मध्ये)",
                                  "Demand (In Kilo Gram)",
                                  "मांग (किलोग्राम में)",
                                )}
                              </th>
                              <th className="border border-black p-3 text-sm font-bold text-center w-[15%]">
                                {t("कृती", "Actions", "कार्रवाई")}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const filtered = demandRecords.filter((rec) => {
                                return (
                                  rec.date >= demandFromDate &&
                                  rec.date <= demandToDate
                                );
                              });

                              if (filtered.length === 0) {
                                return (
                                  <tr>
                                    <td
                                      colSpan={4}
                                      className="border border-black p-4 text-center text-sm font-medium text-slate-500 bg-white"
                                    >
                                      {t(
                                        "निवडलेल्या तारखांमध्ये कोणतीही नोंद आढळली नाही.",
                                        "No records found within selected dates.",
                                        "चयनित तिथियों में कोई रिकॉर्ड नहीं मिला।",
                                      )}
                                    </td>
                                  </tr>
                                );
                              }

                              return filtered.map((row) => (
                                <tr
                                  key={row.id}
                                  className="bg-white hover:bg-slate-50 h-10"
                                >
                                  <td className="border border-black p-2 text-center text-xs font-semibold text-slate-800">
                                    {(() => {
                                      const parts = row.date.split("-");
                                      if (parts.length !== 3) return row.date;
                                      const [y, m, d] = parts;
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
                                      const mIdx = parseInt(m, 10) - 1;
                                      const mName = t(
                                        monthsMr[mIdx] || m,
                                        monthsEn[mIdx] || m,
                                        monthsHi[mIdx] || m,
                                      );
                                      return `${d}-${mName}-${y}`;
                                    })()}
                                  </td>
                                  <td className="border border-black p-2 text-center text-xs font-semibold text-slate-800">
                                    {getTranslatedItem(row.content)}
                                  </td>
                                  <td className="border border-black p-2 text-center text-xs font-semibold text-slate-800">
                                    {row.quantity}
                                  </td>
                                  <td className="border border-black p-2 text-center text-xs font-semibold">
                                    <button
                                      onClick={() =>
                                        handleDeleteDemandRecord(row.id)
                                      }
                                      className="text-red-600 hover:text-red-800 font-bold uppercase text-[10px]"
                                    >
                                      {t("काढून टाका", "Delete", "हटाएं")}
                                    </button>
                                  </td>
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>

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
                            <table className="w-full border-collapse text-black text-xs text-center mt-4">
                              <thead>
                                <tr className="bg-slate-50 font-bold border-b border-black">
                                  <th className="border-r border-black p-2 w-[15%]">
                                    {t("अ.क्र.", "Sr.No", "क्र.")}
                                  </th>
                                  <th className="border-r border-black p-2 w-[50%]">
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
                              onClick={() => window.print()}
                              className="px-6 py-2 bg-[#007bff] hover:bg-blue-700 text-white rounded text-sm font-semibold shadow-md transition-all active:scale-95"
                            >
                              {t("प्रिंट", "Print", "प्रिंट")}
                            </button>
                            <button
                              onClick={() => setShowDemandReportModal(false)}
                              className="px-6 py-2 bg-[#f44336] hover:bg-red-700 text-white rounded text-sm font-semibold shadow-md transition-all active:scale-95 ml-3"
                            >
                              {t("बंद करा", "Close", "बंद करें")}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Monthly Report Tab */}
                {activeTab === "monthly-report" && (
                  <div className="bg-white p-12 border border-slate-300 w-full min-h-[800px] flex flex-col items-center">
                    <div className={`w-full ${isMonthlyReportGenerated ? 'max-w-[1200px]' : 'max-w-[800px]'} space-y-10`}>
                      <div className="text-center py-4">
                        <h2 className="text-2xl font-bold text-[#004C99]">
                          {t("मासिक अहवाल", "Monthly Report", "मासिक रिपोर्ट")}
                        </h2>
                      </div>

                      {!isMonthlyReportGenerated ? (
                        <div className="space-y-6">
                          <h3 className="text-lg font-semibold text-slate-800 text-center">
                            {t("महिना निवडा", "Select Month", "महीना चुनें")}
                          </h3>
                          <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                            {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                              <button
                                key={m}
                                onClick={() => {
                                  setMonthlyReportMonth(m);
                                  setIsMonthlyReportGenerated(false);
                                }}
                                className={`py-3 px-4 rounded border font-semibold text-sm transition-colors ${monthlyReportMonth === m ? 'bg-[#004C99] text-white border-[#004C99]' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                              >
                                {t(
                                  ["जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून", "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"][["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].indexOf(m)],
                                  m,
                                  ["जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"][["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].indexOf(m)]
                                )}
                              </button>
                            ))}
                          </div>

                          <div className="flex justify-center pt-8">
                            <button
                              disabled={!monthlyReportMonth || isMonthlyReportGenerating}
                              onClick={() => {
                                setIsMonthlyReportGenerating(true);
                                setTimeout(() => {
                                  setIsMonthlyReportGenerating(false);
                                  setIsMonthlyReportGenerated(true);
                                }, 1500);
                              }}
                              className="px-8 py-3 bg-[#4CAF50] hover:bg-[#43A047] disabled:bg-slate-400 text-white rounded text-sm font-bold shadow-md transition-colors flex items-center gap-2"
                            >
                              {isMonthlyReportGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
                              {t("अहवाल तयार करा", "Generate Report", "रिपोर्ट जेनरेट करें")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="flex justify-between items-center bg-slate-50 p-4 border border-slate-200 rounded print:hidden">
                            <div>
                              <p className="text-sm font-semibold text-slate-500">{t("निवडलेला महिना", "Selected Month", "चयनित महीना")}</p>
                              <p className="text-lg font-bold text-slate-800">{monthlyReportMonth}</p>
                            </div>
                            <button
                              onClick={() => {
                                setIsMonthlyReportGenerated(false);
                                setMonthlyReportMonth(null);
                              }}
                              className="px-4 py-2 text-sm text-[#004C99] hover:bg-blue-50 font-bold rounded transition-colors"
                            >
                              {t("महिना बदला", "Change Month", "महीना बदलें")}
                            </button>
                          </div>

                          {/* Monthly Report Sub-tabs Selector */}
                          <div className="flex justify-center border-b border-slate-200 print:hidden mt-2">
                            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                              <button
                                onClick={() => setMonthlySubTab("1-5")}
                                className={`shrink-0 border-b-2 py-4 px-1 text-sm font-bold transition-all ${monthlySubTab === "1-5"
                                  ? "border-indigo-500 text-indigo-600"
                                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                                  }`}
                              >
                                {lang === "mr" ? "१ ते ५" : "1 to 5"}
                              </button>
                              <button
                                onClick={() => setMonthlySubTab("6-8")}
                                className={`shrink-0 border-b-2 py-4 px-1 text-sm font-bold transition-all ${monthlySubTab === "6-8"
                                  ? "border-indigo-500 text-indigo-600"
                                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                                  }`}
                              >
                                {lang === "mr" ? "६ ते ८" : "6 to 8"}
                              </button>
                              <button
                                onClick={() => setMonthlySubTab("1-8")}
                                className={`shrink-0 border-b-2 py-4 px-1 text-sm font-bold transition-all ${monthlySubTab === "1-8"
                                  ? "border-indigo-500 text-indigo-600"
                                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                                  }`}
                              >
                                {lang === "mr" ? "१ ते ८" : "1 to 8"}
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

                              // Items for B-Form (12 columns)
                              const B_FORM_ITEMS = [
                                { key: "Rice", nameMr: "तांदूळ", unit: "kg", qty15: "100 ग्रॅम", qty68: "150 ग्रॅम" },
                                { key: "Mugdal", nameMr: "मूगडाळ", unit: "kg", qty15: "20 ग्रॅम", qty68: "30 ग्रॅम" },
                                { key: "Matki", nameMr: "मटकी", unit: "kg", qty15: "20 ग्रॅम", qty68: "30 ग्रॅम" },
                                { key: "Gram", nameMr: "हरभरा", unit: "kg", qty15: "20 ग्रॅम", qty68: "30 ग्रॅम" },
                                { key: "Turdal", nameMr: "तूरडाळ", unit: "kg", qty15: "20 ग्रॅम", qty68: "30 ग्रॅम" },
                                { key: "Cumin", nameMr: "जिरे", unit: "kg", qty15: "0.0002", qty68: "0.0003" },
                                { key: "Mustard", nameMr: "मोहरी", unit: "kg", qty15: "0.0002", qty68: "0.0003" },
                                { key: "Turmeric", nameMr: "हळद", unit: "kg", qty15: "0.0003", qty68: "0.0004" },
                                { key: "Onion Garlic Masala", nameMr: "कांदा लसूण मसाला", unit: "kg", qty15: "0.0004", qty68: "0.0007" },
                                { key: "Salt", nameMr: "मीठ", unit: "kg", qty15: "0.0030", qty68: "0.0040" },
                                { key: "Chili", nameMr: "मिरची पावडर", unit: "kg", qty15: "0.0003", qty68: "0.0005" },
                                { key: "Oil", nameMr: "सोयाबीन तेल", unit: "liter", qty15: "5 ग्रॅम", qty68: "7.5 ग्रॅम" }
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
                                const closing = total - spent - spoiled;
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
                                const standardLabel = isPrimary ? "इयत्ता १ ली ते ५ वी" : "इयत्ता ६ वी ते ८ वी";

                                return (
                                  <div className="print-page border border-slate-300 p-8 bg-white text-black font-sans text-[10px] relative w-[297mm] h-[210mm] mx-auto shadow-md flex flex-col justify-between print:w-full print:h-auto print:border-none print:shadow-none print:p-0">
                                    <div>
                                      <div className="text-center space-y-1 mb-2 border-b border-black pb-1">
                                        <h2 className="text-xs font-bold uppercase">...</h2>
                                        <h3 className="text-sm font-bold tracking-wide">मासिक "ब" प्रपत्र</h3>
                                        <div className="flex justify-between font-bold text-[10px] pt-1">
                                          <div>माहे: {marathiMonthName} {toMarathiNumbers(reportYear.toString())}</div>
                                          <div>{standardLabel}</div>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-4 gap-2 mb-2 text-[10px] font-bold text-black border-b border-black pb-1">
                                        <div>केंद्र - <span className="border-b border-black px-1 font-normal outline-none focus:bg-yellow-100" contentEditable suppressContentEditableWarning>{profile?.center || "_________________"}</span></div>
                                        <div>शाळेचे नांव - <span className="border-b border-black px-1 font-normal outline-none focus:bg-yellow-100" contentEditable suppressContentEditableWarning>{reportSchoolName || "_________________"}</span></div>
                                        <div>पट - <span className="border-b border-black px-2 font-normal outline-none focus:bg-yellow-100" contentEditable suppressContentEditableWarning>{toMarathiNumbers(isPrimary ? "४५" : "३५")}</span></div>
                                        <div>शिजवलेले दिवस - <span className="border-b border-black px-2 font-normal outline-none focus:bg-yellow-100" contentEditable suppressContentEditableWarning>{toMarathiNumbers(cookedDays.toString())}</span></div>
                                      </div>

                                      <div className="w-full overflow-x-auto">
                                        <table className="w-full border-collapse border border-black text-center text-[8.5px] table-fixed">
                                          <thead>
                                            <tr className="bg-slate-50 font-bold">
                                              <th className="border border-black p-1 w-[4%]">अ.क्र.</th>
                                              <th className="border border-black p-1 w-[20%] text-left pl-1">तपशील</th>
                                              {B_FORM_ITEMS.map((item) => (
                                                <th key={item.key} className="border border-black p-0.5 text-[7.5px] leading-tight">
                                                  <div className="font-bold">{item.nameMr}</div>
                                                  <div className="font-normal text-[7px]">({isPrimary ? item.qty15 : item.qty68})</div>
                                                </th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {/* Row 1: Opening */}
                                            <tr>
                                              <td className="border border-black p-0.5 font-bold">१</td>
                                              <td className="border border-black p-0.5 text-left pl-1">आरंभीची शिल्लक (मागील महिन्याची शिल्लक कि.ग्रॅ.)</td>
                                              {B_FORM_ITEMS.map((item) => {
                                                const data = getBFormStockData(item.key, cls);
                                                return (
                                                  <td key={item.key} className="border border-black p-0.5 font-semibold">
                                                    {toMarathiNumbers(data.opening.toFixed(4))}
                                                  </td>
                                                );
                                              })}
                                            </tr>

                                            {/* Row 2: Received */}
                                            <tr>
                                              <td className="border border-black p-0.5 font-bold">२</td>
                                              <td className="border border-black p-0.5 text-left pl-1">चालू महिन्यात प्राप्त तांदूळ व धान्यादी माल कि.ग्रॅ.</td>
                                              {B_FORM_ITEMS.map((item) => {
                                                const data = getBFormStockData(item.key, cls);
                                                return (
                                                  <td key={item.key} className="border border-black p-0.5 font-semibold">
                                                    {toMarathiNumbers(data.received.toFixed(4))}
                                                  </td>
                                                );
                                              })}
                                            </tr>

                                            {/* Row 3: Borrowed */}
                                            <tr>
                                              <td className="border border-black p-0.5 font-bold">३</td>
                                              <td className="border border-black p-0.5 text-left pl-1">उसनवार/ लोकसहभागातून प्राप्त तांदूळ तसेच धान्यादी माल</td>
                                              {B_FORM_ITEMS.map((item) => {
                                                const data = getBFormStockData(item.key, cls);
                                                return (
                                                  <td key={item.key} className="border border-black p-0.5 font-semibold">
                                                    {toMarathiNumbers(data.borrowed.toFixed(4))}
                                                  </td>
                                                );
                                              })}
                                            </tr>

                                            {/* Row 4: Total */}
                                            <tr className="bg-slate-50 font-bold">
                                              <td className="border border-black p-0.5">४</td>
                                              <td className="border border-black p-0.5 text-left pl-1">साठा नोंदवही प्रमाणे एकूण कि.ग्रॅ. (1+2+3)</td>
                                              {B_FORM_ITEMS.map((item) => {
                                                const data = getBFormStockData(item.key, cls);
                                                return (
                                                  <td key={item.key} className="border border-black p-0.5">
                                                    {toMarathiNumbers(data.total.toFixed(4))}
                                                  </td>
                                                );
                                              })}
                                            </tr>

                                            {/* Row 5: Beneficiary / Health Check */}
                                            <tr>
                                              <td className="border border-black p-0.5 font-bold">५</td>
                                              <td className="border border-black p-0.5 text-left pl-1 font-semibold">चालू महिन्यातील लाभार्थी</td>
                                              <td className="border border-black p-0.5 text-center font-bold" colSpan={7}>
                                                चालू महिन्यातील एकूण लाभार्थी संख्या: {toMarathiNumbers(avgBeneficiary.toString())}
                                              </td>
                                              <td className="border border-black p-0.5 text-left pl-2 font-bold" colSpan={5}>
                                                या महिन्यात आरोग्य तपासणी केलेली विद्यार्थी संख्या: ०
                                              </td>
                                            </tr>

                                            {/* Row 6: Used */}
                                            <tr>
                                              <td className="border border-black p-0.5 font-bold">६</td>
                                              <td className="border border-black p-0.5 text-left pl-1">शिजवलेला माल (लाभार्थी प्रमाणे वापरलेला माल कि.ग्रॅ.)</td>
                                              {B_FORM_ITEMS.map((item) => {
                                                const data = getBFormStockData(item.key, cls);
                                                return (
                                                  <td key={item.key} className="border border-black p-0.5 font-semibold">
                                                    {toMarathiNumbers(data.spent.toFixed(4))}
                                                  </td>
                                                );
                                              })}
                                            </tr>

                                            {/* Row 7: Closing */}
                                            <tr className="bg-slate-50 font-bold">
                                              <td className="border border-black p-0.5">७</td>
                                              <td className="border border-black p-0.5 text-left pl-1">महिन्याअखेर शिल्लक तांदूळ व धान्यादी माल कि.ग्रॅ. (4-6)</td>
                                              {B_FORM_ITEMS.map((item) => {
                                                const data = getBFormStockData(item.key, cls);
                                                return (
                                                  <td key={item.key} className="border border-black p-0.5">
                                                    {toMarathiNumbers(data.closing.toFixed(4))}
                                                  </td>
                                                );
                                              })}
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>

                                    <div className="flex justify-between items-end mt-4">
                                      <div className="text-[9px] font-semibold text-black space-y-0.5">
                                        <div className="font-bold">महत्वाचे -</div>
                                        <div>१. सर्व माहिती अचूक भरणे आवश्यक.</div>
                                        <div>२. सदर "ब" प्रपत्रक हे दर महिन्याच्या ३ तारखेपर्यंत जमा करणे आवश्यक आहे.</div>
                                      </div>
                                      <div className="text-center font-bold text-[10px] pr-4">
                                        <div>मुख्याध्यापक सही व शिक्का</div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              };

                              return (
                                <>
                                  {/* PAGE 1: Certificate (प्रमाणपत्र) */}
                                  {(monthlySubTab === "1-8" || monthlySubTab === "1-5" || monthlySubTab === "6-8") && (
                                    <div className="print-page border border-slate-300 py-5 px-8 bg-white text-black font-sans text-xs relative w-[297mm] h-[210mm] mx-auto shadow-md flex flex-col justify-between print:w-full print:h-auto print:border-none print:shadow-none print:p-0">
                                      <div>
                                        <div className="text-center space-y-0.5 mb-3 border-b border-black pb-1.5">
                                          <h2 className="text-sm font-bold border-b border-black pb-1 inline-block px-12 uppercase">- प्रमाणपत्र -</h2>
                                          <h3 className="text-xs font-bold">
                                            {monthlySubTab === "1-8" ? "इयत्ता १ ते ८" : monthlySubTab === "1-5" ? "इयत्ता १ ते ५" : "इयत्ता ६ ते ८"}
                                          </h3>
                                          <h3 className="text-xs font-bold">माहे: {marathiMonthName} {toMarathiNumbers(reportYear.toString())}</h3>
                                        </div>

                                        <div className="text-justify text-[11px] leading-[1.8rem] space-y-2 px-4 font-normal text-black">
                                          <p>
                                            अध्यक्ष/ सचिव शाळा व्यवस्थापन समिती <input
                                              type="text"
                                              value={reportPrincipalName}
                                              onChange={(e) => setReportPrincipalName(e.target.value)}
                                              style={{ display: "inline-block", width: "180px", border: "none", borderBottom: "1px dotted black", textAlign: "center", height: "24px", backgroundColor: "transparent", padding: "0 4px" }}
                                              className="font-bold focus:outline-none focus:border-blue-500 text-[11px]"
                                              placeholder="________________________"
                                            /> कडून प्रमाणित करणेत येते की,
                                            जिल्हा परिषद शाळा <input
                                              type="text"
                                              value={reportSchoolName}
                                              onChange={(e) => setReportSchoolName(e.target.value)}
                                              style={{ display: "inline-block", width: "240px", border: "none", borderBottom: "1px dotted black", textAlign: "center", height: "24px", backgroundColor: "transparent", padding: "0 4px" }}
                                              className="font-bold focus:outline-none focus:border-blue-500 text-[11px]"
                                              placeholder="________________________"
                                            /> या शाळेतील{" "}
                                            <input
                                              type="text"
                                              value={reportTeacherName}
                                              onChange={(e) => setReportTeacherName(e.target.value)}
                                              style={{ display: "inline-block", width: "180px", border: "none", borderBottom: "1px dotted black", textAlign: "center", height: "24px", backgroundColor: "transparent", padding: "0 4px" }}
                                              className="font-bold focus:outline-none focus:border-blue-500 text-[11px]"
                                              placeholder="________________________"
                                            /> यांनी शालेय पोषण आहार अंतर्गत माहे{" "}
                                            <span className="font-bold border-b border-dotted border-black px-1">{marathiMonthName} {toMarathiNumbers(reportYear.toString())}</span> मध्ये
                                            {monthlySubTab === "1-8" && (
                                              <>
                                                {" "}इ. १ ली ते ५ वी च्या विद्यार्थ्यांसाठी{" "}
                                                <input
                                                  type="text"
                                                  value={certPrimaryCookedDays}
                                                  onChange={(e) => setCertPrimaryCookedDays(e.target.value)}
                                                  style={{ display: "inline-block", width: "50px", border: "none", borderBottom: "1px dotted black", textAlign: "center", height: "24px", backgroundColor: "transparent", padding: "0 4px" }}
                                                  className="font-bold focus:outline-none focus:border-blue-500 text-[11px]"
                                                /> दिवस आणि इ. ६ वी ते ८ वीच्या विद्यार्थ्यांसाठी एकूण <input
                                                  type="text"
                                                  value={certUpperCookedDays}
                                                  onChange={(e) => setCertUpperCookedDays(e.target.value)}
                                                  style={{ display: "inline-block", width: "50px", border: "none", borderBottom: "1px dotted black", textAlign: "center", height: "24px", backgroundColor: "transparent", padding: "0 4px" }}
                                                  className="font-bold focus:outline-none focus:border-blue-500 text-[11px]"
                                                /> दिवस अन्न शिजवून देणेचे काम केले आहे. तसेच योग्य उष्मांकाचा व चविष्ठ पोषण आहार होणेसाठी दररोज इ. १ ली ते ५ वी साठी ५० ग्रॅम व इ. ६वी ते ८ वी साठी ७५ ग्रॅम प्रमाणे
                                              </>
                                            )}
                                            {monthlySubTab === "1-5" && (
                                              <>
                                                {" "}इ. १ ली ते ५ वी च्या विद्यार्थ्यांसाठी{" "}
                                                <input
                                                  type="text"
                                                  value={certPrimaryCookedDays}
                                                  onChange={(e) => setCertPrimaryCookedDays(e.target.value)}
                                                  style={{ display: "inline-block", width: "50px", border: "none", borderBottom: "1px dotted black", textAlign: "center", height: "24px", backgroundColor: "transparent", padding: "0 4px" }}
                                                  className="font-bold focus:outline-none focus:border-blue-500 text-[11px]"
                                                /> दिवस अन्न शिजवून देणेचे काम केले आहे. तसेच योग्य उष्मांकाचा व चविष्ठ पोषण आहार होणेसाठी दररोज इ. १ ली ते ५ वी साठी ५० ग्रॅम प्रमाणे
                                              </>
                                            )}
                                            {monthlySubTab === "6-8" && (
                                              <>
                                                {" "}इ. ६ वी ते ८ वीच्या विद्यार्थ्यांसाठी एकूण <input
                                                  type="text"
                                                  value={certUpperCookedDays}
                                                  onChange={(e) => setCertUpperCookedDays(e.target.value)}
                                                  style={{ display: "inline-block", width: "50px", border: "none", borderBottom: "1px dotted black", textAlign: "center", height: "24px", backgroundColor: "transparent", padding: "0 4px" }}
                                                  className="font-bold focus:outline-none focus:border-blue-500 text-[11px]"
                                                /> दिवस अन्न शिजवून देणेचे काम केले आहे. तसेच योग्य उष्मांकाचा व चविष्ठ पोषण आहार होणेसाठी दररोज इ. ६ वी ते ८ वी साठी ७५ ग्रॅम प्रमाणे
                                              </>
                                            )}
                                            {" "}विविध भाज्या वापरल्या आहेत. आणि खोबरे, कांदा, लसून इ. मसाल्यांचा योग्य प्रमाणात वापर केला
                                            आहे. सदर महिन्यात दर बुधवारी एकूण <input
                                              type="text"
                                              value={certWednesdaysCount}
                                              onChange={(e) => setCertWednesdaysCount(e.target.value)}
                                              style={{ display: "inline-block", width: "40px", border: "none", borderBottom: "1px dotted black", textAlign: "center", height: "24px", backgroundColor: "transparent", padding: "0 4px" }}
                                              className="font-bold focus:outline-none focus:border-blue-500 text-[11px]"
                                            /> वेळा{" "}
                                            <input
                                              type="text"
                                              value={certSupplementaryFood}
                                              onChange={(e) => setCertSupplementaryFood(e.target.value)}
                                              style={{ display: "inline-block", width: "160px", border: "none", borderBottom: "1px dotted black", textAlign: "center", height: "24px", backgroundColor: "transparent", padding: "0 4px" }}
                                              className="font-bold focus:outline-none focus:border-blue-500 text-[11px]"
                                              placeholder="________________________"
                                            /> असा पूरक आहार
                                            दिलेला आहे. अन्न शिजवून देणेचे व महाराष्ट्र शासन, शालेय शिक्षण व क्रिडा विभागातील शासन निर्णय क्र.शापोआ / २०१०/प्र.क्र.१८/ प्राशि४,
                                            दि.२.२.२०११ मधील बाब क्र. ९ नुसार शालेय पोषण आहाराचे सर्व कामकाज पूर्ण केले आहे.
                                          </p>
                                          <p>
                                            सदर खालीलप्रमाणे पट, लाभार्थी, दिवस यांची माहिती बरोबर असून त्यानुसार इंधन भाजीपाला
                                            तसेच स्वयंपाकी तथा मदतनीस मानधन अदा करणेस हरकत नाही म्हणून दिले असे प्रमाणपत्र.
                                          </p>
                                        </div>

                                        <div className="mt-4 px-2 w-full">
                                          <table className="w-full border-collapse border border-black text-center text-[10px]">
                                            <thead>
                                              <tr className="bg-slate-50 font-bold">
                                                <th className="border border-black p-1">इयत्ता</th>
                                                <th className="border border-black p-1">पट</th>
                                                <th className="border border-black p-1">प्रोगेसिव्ह लाभार्थी</th>
                                                <th className="border border-black p-1">शिजवलेले दिवस</th>
                                                <th className="border border-black p-1">हिस्सा</th>
                                                <th className="border border-black p-1">दर</th>
                                                <th className="border border-black p-1">इंधन भाजीपाला देय अनुदान</th>
                                                <th className="border border-black p-1">स्वयंपाकी तथा मदतनीस संख्या</th>
                                                <th className="border border-black p-1">स्वयंपाकी तथा मदतनीस मानधन</th>
                                                <th className="border border-black p-1">शेरा</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {/* Row 1: 1 To 5 */}
                                              {(monthlySubTab === "1-8" || monthlySubTab === "1-5") && (
                                                <>
                                                  <tr>
                                                    <td className="border border-black p-1 font-bold" rowSpan={2}>१ ते ५</td>
                                                    <td className="border border-black p-1" rowSpan={2}>
                                                      <input
                                                        type="text"
                                                        value={certPatPrimary}
                                                        onChange={(e) => setCertPatPrimary(e.target.value)}
                                                        className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none p-0 m-0 text-center font-bold text-[10px] print:border-none"
                                                      />
                                                    </td>
                                                    <td className="border border-black p-1" rowSpan={2}>
                                                      <input
                                                        type="text"
                                                        value={certBeneficiaryPrimary}
                                                        onChange={(e) => setCertBeneficiaryPrimary(e.target.value)}
                                                        className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none p-0 m-0 text-center font-bold text-[10px] print:border-none"
                                                      />
                                                    </td>
                                                    <td className="border border-black p-1" rowSpan={2}>
                                                      <input
                                                        type="text"
                                                        value={certPrimaryCookedDays}
                                                        onChange={(e) => setCertPrimaryCookedDays(e.target.value)}
                                                        className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none p-0 m-0 text-center font-bold text-[10px] print:border-none"
                                                      />
                                                    </td>
                                                    <td className="border border-black p-0.5 font-medium">केंद्र</td>
                                                    <td className="border border-black p-0.5">{toMarathiNumbers("४.०७")}</td>
                                                    <td className="border border-black p-0.5">
                                                      {toMarathiNumbers(((parseFloat(toEnglishNumbers(certBeneficiaryPrimary)) || 0) * 4.07).toFixed(2))}
                                                    </td>
                                                    <td className="border border-black p-1" rowSpan={2}>
                                                      <input
                                                        type="text"
                                                        value={certHelperCount}
                                                        onChange={(e) => setCertHelperCount(e.target.value)}
                                                        className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none p-0 m-0 text-center font-bold text-[10px] print:border-none"
                                                      />
                                                    </td>
                                                    <td className="border border-black p-0.5">
                                                      केंद्र - {toMarathiNumbers(((parseFloat(toEnglishNumbers(certHelperCount)) || 0) * 600).toFixed(2))}
                                                    </td>
                                                    <td className="border border-black p-1" rowSpan={2}></td>
                                                  </tr>
                                                  <tr>
                                                    <td className="border border-black p-0.5 font-medium">राज्य</td>
                                                    <td className="border border-black p-0.5">{toMarathiNumbers("२.७१")}</td>
                                                    <td className="border border-black p-0.5">
                                                      {toMarathiNumbers(((parseFloat(toEnglishNumbers(certBeneficiaryPrimary)) || 0) * 2.71).toFixed(2))}
                                                    </td>
                                                    <td className="border border-black p-0.5">
                                                      राज्य - {toMarathiNumbers(((parseFloat(toEnglishNumbers(certHelperCount)) || 0) * 400).toFixed(2))}
                                                    </td>
                                                  </tr>
                                                </>
                                              )}

                                              {/* Row 2: 6 To 8 */}
                                              {(monthlySubTab === "1-8" || monthlySubTab === "6-8") && (
                                                <>
                                                  <tr>
                                                    <td className="border border-black p-1 font-bold" rowSpan={2}>६ ते ८</td>
                                                    <td className="border border-black p-1" rowSpan={2}>
                                                      <input
                                                        type="text"
                                                        value={certPatUpper}
                                                        onChange={(e) => setCertPatUpper(e.target.value)}
                                                        className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none p-0 m-0 text-center font-bold text-[10px] print:border-none"
                                                      />
                                                    </td>
                                                    <td className="border border-black p-1" rowSpan={2}>
                                                      <input
                                                        type="text"
                                                        value={certBeneficiaryUpper}
                                                        onChange={(e) => setCertBeneficiaryUpper(e.target.value)}
                                                        className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none p-0 m-0 text-center font-bold text-[10px] print:border-none"
                                                      />
                                                    </td>
                                                    <td className="border border-black p-1" rowSpan={2}>
                                                      <input
                                                        type="text"
                                                        value={certUpperCookedDays}
                                                        onChange={(e) => setCertUpperCookedDays(e.target.value)}
                                                        className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none p-0 m-0 text-center font-bold text-[10px] print:border-none"
                                                      />
                                                    </td>
                                                    <td className="border border-black p-0.5 font-medium">केंद्र</td>
                                                    <td className="border border-black p-0.5">{toMarathiNumbers("६.१०")}</td>
                                                    <td className="border border-black p-0.5">
                                                      {toMarathiNumbers(((parseFloat(toEnglishNumbers(certBeneficiaryUpper)) || 0) * 6.10).toFixed(2))}
                                                    </td>
                                                    <td className="border border-black p-1" rowSpan={2}>
                                                      <input
                                                        type="text"
                                                        value={certHelperCount}
                                                        onChange={(e) => setCertHelperCount(e.target.value)}
                                                        className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none p-0 m-0 text-center font-bold text-[10px] print:border-none"
                                                      />
                                                    </td>
                                                    <td className="border border-black p-0.5">
                                                      केंद्र - {toMarathiNumbers(((parseFloat(toEnglishNumbers(certHelperCount)) || 0) * 600).toFixed(2))}
                                                    </td>
                                                    <td className="border border-black p-1" rowSpan={2}></td>
                                                  </tr>
                                                  <tr>
                                                    <td className="border border-black p-0.5 font-medium">राज्य</td>
                                                    <td className="border border-black p-0.5">{toMarathiNumbers("४.०७")}</td>
                                                    <td className="border border-black p-0.5">
                                                      {toMarathiNumbers(((parseFloat(toEnglishNumbers(certBeneficiaryUpper)) || 0) * 4.07).toFixed(2))}
                                                    </td>
                                                    <td className="border border-black p-0.5">
                                                      राज्य - {toMarathiNumbers(((parseFloat(toEnglishNumbers(certHelperCount)) || 0) * 400).toFixed(2))}
                                                    </td>
                                                  </tr>
                                                </>
                                              )}

                                              {/* Row 3: Total */}
                                              <tr className="bg-slate-50 font-bold">
                                                <td className="border border-black p-1">एकूण</td>
                                                <td className="border border-black p-1">
                                                  {toMarathiNumbers((
                                                    ((monthlySubTab === "1-8" || monthlySubTab === "1-5") ? (parseInt(toEnglishNumbers(certPatPrimary)) || 0) : 0) +
                                                    ((monthlySubTab === "1-8" || monthlySubTab === "6-8") ? (parseInt(toEnglishNumbers(certPatUpper)) || 0) : 0)
                                                  ).toString())}
                                                </td>
                                                <td className="border border-black p-1">
                                                  {toMarathiNumbers((
                                                    ((monthlySubTab === "1-8" || monthlySubTab === "1-5") ? (parseInt(toEnglishNumbers(certBeneficiaryPrimary)) || 0) : 0) +
                                                    ((monthlySubTab === "1-8" || monthlySubTab === "6-8") ? (parseInt(toEnglishNumbers(certBeneficiaryUpper)) || 0) : 0)
                                                  ).toString())}
                                                </td>
                                                <td className="border border-black p-1">
                                                  {toMarathiNumbers((
                                                    ((monthlySubTab === "1-8" || monthlySubTab === "1-5") ? (parseInt(toEnglishNumbers(certPrimaryCookedDays)) || 0) : 0) +
                                                    ((monthlySubTab === "1-8" || monthlySubTab === "6-8") ? (parseInt(toEnglishNumbers(certUpperCookedDays)) || 0) : 0)
                                                  ).toString())}
                                                </td>
                                                <td className="border border-black p-1"></td>
                                                <td className="border border-black p-1"></td>
                                                <td className="border border-black p-1">
                                                  {toMarathiNumbers((
                                                    ((monthlySubTab === "1-8" || monthlySubTab === "1-5") ? ((parseFloat(toEnglishNumbers(certBeneficiaryPrimary)) || 0) * (4.07 + 2.71)) : 0) +
                                                    ((monthlySubTab === "1-8" || monthlySubTab === "6-8") ? ((parseFloat(toEnglishNumbers(certBeneficiaryUpper)) || 0) * (6.10 + 4.07)) : 0)
                                                  ).toFixed(2))}
                                                </td>
                                                <td className="border border-black p-1">
                                                  {toMarathiNumbers(certHelperCount)}
                                                </td>
                                                <td className="border border-black p-1">
                                                  {toMarathiNumbers(((parseFloat(toEnglishNumbers(certHelperCount)) || 0) * 1000).toFixed(2))}
                                                </td>
                                                <td className="border border-black p-1"></td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>

                                      <div className="flex justify-between items-end mt-6 px-4 text-xs font-bold text-black select-none">
                                        <div className="space-y-3 text-[12px]">
                                          <div className="flex items-center gap-1">
                                            स्थळ -
                                            <span
                                              contentEditable
                                              suppressContentEditableWarning
                                              className="outline-none focus:bg-yellow-100 border-b border-dotted border-black min-w-[150px] inline-block text-center px-2"
                                            >
                                              &nbsp;
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            दि. -
                                            <span
                                              contentEditable
                                              suppressContentEditableWarning
                                              className="outline-none focus:bg-yellow-100 border-b border-dotted border-black min-w-[150px] inline-block text-center px-2"
                                            >
                                              &nbsp;
                                            </span>
                                          </div>
                                        </div>
                                        <div className="text-center pb-2 text-[12px] font-bold">मुख्याध्यापक तथा सचिव</div>
                                        <div className="text-center pb-2 text-[12px] font-bold">अध्यक्ष</div>
                                      </div>
                                    </div>
                                  )}

                                  {/* PAGE 2: B-Form (Primary 1 to 5) */}
                                  {monthlySubTab === "1-5" && renderBFormPage("1 To 5")}

                                  {/* PAGE 3: B-Form (Upper Primary 6 to 8) */}
                                  {monthlySubTab === "6-8" && renderBFormPage("6 To 8")}
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
                      )}
                    </div>
                  </div>
                )}

                {/* Annual Report Tab */}
                {activeTab === "annual-report" && (
                  <div className="bg-white p-12 border border-slate-300 w-full min-h-[800px] flex flex-col items-center">
                    <div className={`w-full ${isAnnualReportGenerated ? 'max-w-[1200px]' : 'max-w-[800px]'} space-y-10`}>
                      <div className="text-center py-4">
                        <h2 className="text-2xl font-bold text-[#004C99]">
                          {t("वार्षिक अहवाल", "Annual Report", "वार्षिक रिपोर्ट")}
                        </h2>
                      </div>

                      {!isAnnualReportGenerated ? (
                        <div className="space-y-6">
                          <h3 className="text-lg font-semibold text-slate-800 text-center">
                            {t("वर्ष निवडा", "Select Year", "वर्ष चुनें")}
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {["2023-24", "2024-25", "2025-26", "2026-27"].map(y => (
                              <button
                                key={y}
                                onClick={() => {
                                  setAnnualReportYear(y);
                                  setIsAnnualReportGenerated(false);
                                }}
                                className={`py-3 px-4 rounded border font-semibold text-sm transition-colors ${annualReportYear === y ? 'bg-[#004C99] text-white border-[#004C99]' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                              >
                                {y}
                              </button>
                            ))}
                          </div>

                          <div className="flex justify-center pt-8">
                            <button
                              disabled={!annualReportYear || isAnnualReportGenerating}
                              onClick={() => {
                                setIsAnnualReportGenerating(true);
                                setTimeout(() => {
                                  setIsAnnualReportGenerating(false);
                                  setIsAnnualReportGenerated(true);
                                }, 1500);
                              }}
                              className="px-8 py-3 bg-[#4CAF50] hover:bg-[#43A047] disabled:bg-slate-400 text-white rounded text-sm font-bold shadow-md transition-colors flex items-center gap-2"
                            >
                              {isAnnualReportGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
                              {t("अहवाल तयार करा", "Generate Report", "रिपोर्ट जेनरेट करें")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="flex justify-between items-center bg-slate-50 p-4 border border-slate-200 rounded">
                            <div>
                              <p className="text-sm font-semibold text-slate-500">{t("निवडलेले वर्ष", "Selected Year", "चयनित वर्ष")}</p>
                              <p className="text-lg font-bold text-slate-800">{annualReportYear}</p>
                            </div>
                            <button
                              onClick={() => {
                                setIsAnnualReportGenerated(false);
                                setAnnualReportYear(null);
                              }}
                              className="px-4 py-2 text-sm text-[#004C99] hover:bg-blue-50 font-bold rounded transition-colors"
                            >
                              {t("वर्ष बदला", "Change Year", "वर्ष बदलें")}
                            </button>
                          </div>

                          {/* Annual Report Sub-tabs Selector */}
                          <div className="flex justify-center border-b border-slate-200 print:hidden mt-2">
                            <nav className="-mb-px flex space-x-8" aria-label="Tabs">

                              <button
                                onClick={() => setAnnualSubTab("6-8")}
                                className={`shrink-0 border-b-2 py-4 px-1 text-sm font-bold transition-all ${annualSubTab === "6-8"
                                  ? "border-indigo-500 text-indigo-600"
                                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                                  }`}
                              >
                                {lang === "mr" ? "६ ते ८" : "6 to 8"}
                              </button>
                              <button
                                onClick={() => setAnnualSubTab("1-8")}
                                className={`shrink-0 border-b-2 py-4 px-1 text-sm font-bold transition-all ${annualSubTab === "1-8"
                                  ? "border-indigo-500 text-indigo-600"
                                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                                  }`}
                              >
                                {lang === "mr" ? "१ ते ८" : "1 to 8"}
                              </button>
                            </nav>
                          </div>

                          <div id="annual-report-print" className="border border-slate-300 bg-white p-4 font-sans text-xs w-full overflow-x-auto">
                            <div className="text-center pb-2 mb-4 space-y-1">
                              <h3 className="font-bold text-sm">प्रधानमंत्री पोषण शक्ती निर्माण योजना सन {toMarathiNumbers(annualReportYear)}</h3>
                              <h3 className="font-bold text-sm">वार्षिक उपयोगिता प्रमाणपत्र</h3>
                              <h3 className="font-bold text-sm">
                                {annualSubTab === "6-8" && "इयत्ता ६ वी ते ८ वी"}
                                {annualSubTab === "1-8" && "इयत्ता १ ली ते ८ वी"}
                              </h3>
                            </div>
                            <div className="flex justify-between mb-2">
                              <div><strong>केंद्र -</strong> {localStorage.getItem("teacher_center") || "_________________"}</div>
                              <div><strong>शाळेचे नांव -</strong> {localStorage.getItem("teacher_school_name") || profile?.schoolName || "_________________"}</div>
                              <div><strong>मुख्याध्यापक नांव व मो.नं. -</strong> {localStorage.getItem("teacher_principal_name") || "_________________"}</div>
                            </div>

                            <div className="w-full">
                              <table className="w-full border-collapse border border-black text-center text-[8px] md:text-[9.5px]">
                                <thead>
                                  <tr>
                                    <th className="border border-black p-0.5" rowSpan={2}>अ.क्र.</th>
                                    <th className="border border-black p-0.5 w-[110px] min-w-[110px]" rowSpan={2}>तपशील</th>
                                    <th className="border border-black p-0.5" colSpan={18}>एकूण खर्च झालेला तांदूळ व धान्यादी मालाचा तपशील (किलोग्रॅममध्ये)</th>
                                  </tr>
                                  <tr>
                                    <th className="border border-black p-0.5 font-normal"><div className="writing-vertical">तांदूळ</div></th>
                                    <th className="border border-black p-0.5 font-normal"><div className="writing-vertical">वाटाणा</div></th>
                                    <th className="border border-black p-0.5 font-normal"><div className="writing-vertical">मूगदाळ</div></th>
                                    <th className="border border-black p-0.5 font-normal"><div className="writing-vertical">चवळी</div></th>
                                    <th className="border border-black p-0.5 font-normal"><div className="writing-vertical">हरभरा</div></th>
                                    <th className="border border-black p-0.5 font-normal"><div className="writing-vertical">मसूरदाळ</div></th>
                                    <th className="border border-black p-0.5 font-normal"><div className="writing-vertical">मटकी</div></th>
                                    <th className="border border-black p-0.5 font-normal"><div className="writing-vertical">अख्खा मूग</div></th>
                                    <th className="border border-black p-0.5 font-normal"><div className="writing-vertical">तूरदाळ</div></th>
                                    <th className="border border-black p-0.5 font-normal"><div className="writing-vertical">सोयाबीन वडी</div></th>
                                    <th className="border border-black p-0.5 font-normal"><div className="writing-vertical">जिरे</div></th>
                                    <th className="border border-black p-0.5 font-normal"><div className="writing-vertical">मोहरी</div></th>
                                    <th className="border border-black p-0.5 font-normal"><div className="writing-vertical">हळद</div></th>
                                    <th className="border border-black p-0.5 font-normal"><div className="writing-vertical">कांदा लसूण मसाला</div></th>
                                    <th className="border border-black p-0.5 font-normal"><div className="writing-vertical">मीठ</div></th>
                                    <th className="border border-black p-0.5 font-normal"><div className="writing-vertical">मिरची पावडर</div></th>
                                    <th className="border border-black p-0.5 font-normal"><div className="writing-vertical">गरम मसाला</div></th>
                                    <th className="border border-black p-0.5 font-normal"><div className="writing-vertical">सोयाबीन तेल (लि.)</div></th>
                                  </tr>
                                  <tr className="bg-gray-100">
                                    {Array.from({ length: 20 }, (_, i) => (
                                      <th key={i} className="border border-black p-0.5">{toMarathiNumbers((i + 1).toString())}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {(() => {
                                    const acadMonths = getAcademicYearMonths(annualReportYear);
                                    const formatVal = (v: number) => v ? toMarathiNumbers(v.toString()) : "";

                                    if (acadMonths.length === 0) return null;

                                    const startYear = acadMonths[0].year;
                                    const endYear = acadMonths[11].year;
                                    const startYearShort = startYear.toString().slice(-2);
                                    const endYearShort = endYear.toString().slice(-2);

                                    // For each item, calculate annual totals
                                    const itemData = ANNUAL_ITEM_KEYS.map(itemKey => {
                                      let openingBalance = 0;
                                      let totalReceived = 0;
                                      let totalReceivedPublic = 0;
                                      let totalUsed = 0;
                                      let totalLoss = 0;

                                      const classesToSum: ("1 To 5" | "6 To 8")[] =
                                        annualSubTab === "6-8" ? ["6 To 8"] :
                                          ["1 To 5", "6 To 8"];

                                      acadMonths.forEach((m, mIdx) => {
                                        classesToSum.forEach(cls => {
                                          const stockData = getStockDataForItem(itemKey, m.month, m.year, cls);
                                          const incomingQty = getIncomingForItem(itemKey, m.month, m.year, cls);

                                          if (mIdx === 0 && stockData) {
                                            openingBalance += stockData.prev;
                                          }
                                          totalReceived += incomingQty || (stockData ? stockData.received : 0);
                                          if (stockData) {
                                            totalUsed += stockData.used;
                                          }
                                        });
                                      });

                                      const totalStock = openingBalance + totalReceived + totalReceivedPublic;
                                      const totalExpended = totalUsed + totalLoss;
                                      const closingBalance = totalStock - totalExpended;

                                      return {
                                        opening: openingBalance,
                                        received: totalReceived,
                                        receivedPublic: totalReceivedPublic,
                                        totalStock,
                                        used: totalUsed,
                                        loss: totalLoss,
                                        totalExpended,
                                        closing: closingBalance,
                                      };
                                    });

                                    // Row labels (dynamically adjusted for year)
                                    const rowLabels = [
                                      `३१ मार्च / १ एप्रिल ${toMarathiNumbers(startYear.toString())} अखेर शिल्लक`,
                                      `प्राप्त तांदूळ व धान्यादी माल कि.ग्रॅ. (एप्रिल ${toMarathiNumbers(startYearShort)} ते मार्च ${toMarathiNumbers(endYearShort)} अखेर )`,
                                      "उसनवार/ लोकसहभागातून प्राप्त तांदूळ तसेच धान्यादी माल",
                                      `साठा नोंदवही प्रमाणे एकूण कि.ग्रॅ. (${toMarathiNumbers("1")}+${toMarathiNumbers("3")})`,
                                      "शिजवलेला/ वापरलेला माल (लाभार्थी प्रमाणे तांदूळ व धान्यादी माल कि.ग्रॅ.)",
                                      "चोरी/ नैसर्गिक आपत्तीमुळे खराब झालेला माल/ उसनवार घेतलेला माल परत करणे इ.",
                                      `एकूण वापरण्यात आलेला तांदूळ व धान्यादी माल कि.ग्रॅ. (कॉलम नं. ${toMarathiNumbers("5")}+${toMarathiNumbers("6")})`,
                                      `दि. ३१ मार्च ${toMarathiNumbers(endYear.toString())} अखेर शिल्लक माल (${toMarathiNumbers("4")}-${toMarathiNumbers("7")})`
                                    ];

                                    // Data rows: row 0=opening, 1=received, 2=receivedPublic, 3=totalStock, 4=used, 5=loss, 6=totalExpended, 7=closing
                                    const getRowData = (rowIdx: number) => {
                                      return itemData.map(d => {
                                        switch (rowIdx) {
                                          case 0: return d.opening;
                                          case 1: return d.received;
                                          case 2: return d.receivedPublic;
                                          case 3: return d.totalStock;
                                          case 4: return d.used;
                                          case 5: return d.loss;
                                          case 6: return d.totalExpended;
                                          case 7: return d.closing;
                                          default: return 0;
                                        }
                                      });
                                    };

                                    // Monthly register data
                                    const monthlyRegData = acadMonths.map(m => {
                                      if (annualSubTab === "6-8") {
                                        return getRegisterDataForMonth(m.month, m.year, "6 To 8");
                                      } else {
                                        return getRegisterDataForMonth(m.month, m.year);
                                      }
                                    });
                                    const totalEnrolled = Math.max(...monthlyRegData.map(d => d.enrolled), 0);
                                    const totalBeneficiary = monthlyRegData.reduce((s, d) => s + d.beneficiary, 0);
                                    const totalWorkingDays = monthlyRegData.reduce((s, d) => s + d.workingDays, 0);

                                    // Month short labels for header
                                    const monthShortLabels = [
                                      `एप्रिल ${toMarathiNumbers(startYearShort)}`,
                                      `मे ${toMarathiNumbers(startYearShort)}`,
                                      `जून ${toMarathiNumbers(startYearShort)}`,
                                      `जुलै ${toMarathiNumbers(startYearShort)}`,
                                      `ऑगस्ट ${toMarathiNumbers(startYearShort)}`,
                                      `सप्टेंबर ${toMarathiNumbers(startYearShort)}`,
                                      `ऑक्टोबर ${toMarathiNumbers(startYearShort)}`,
                                      `नोव्हेंबर ${toMarathiNumbers(startYearShort)}`,
                                      `डिसेंबर ${toMarathiNumbers(startYearShort)}`,
                                      `जाने ${toMarathiNumbers(endYearShort)}`,
                                      `फेब्रुवारी ${toMarathiNumbers(endYearShort)}`,
                                      `मार्च ${toMarathiNumbers(endYearShort)}`,
                                    ];

                                    return (
                                      <>
                                        {rowLabels.map((detail, idx) => {
                                          const rowData = getRowData(idx);
                                          const isBoldRow = idx === 3 || idx === 6 || idx === 7;
                                          return (
                                            <tr key={idx} className={isBoldRow ? "font-bold" : ""}>
                                              <td className="border border-black p-0.5">{toMarathiNumbers((idx + 1).toString())}</td>
                                              <td className="border border-black p-0.5 text-left">{detail}</td>
                                              {rowData.map((val, i) => (
                                                <td key={i} className="border border-black p-0.5">{formatVal(val)}</td>
                                              ))}
                                            </tr>
                                          );
                                        })}

                                        {/* Monthly section headers */}
                                        <tr className="bg-gray-100 font-bold">
                                          <td className="border border-black p-0.5" colSpan={2}>महिना</td>
                                          {monthShortLabels.map((label, i) => (
                                            <td key={i} className="border border-black p-0.5">{label}</td>
                                          ))}
                                          <td className="border border-black p-0.5">एकूण</td>
                                          <td className="border border-black p-0.5" colSpan={4}></td>
                                        </tr>

                                        <tr>
                                          <td className="border border-black p-0.5" rowSpan={2}>{toMarathiNumbers("9")}</td>
                                          <td className="border border-black p-0.5 text-left">महिनानिहाय पट संख्या</td>
                                          {monthlyRegData.map((d, i) => (
                                            <td key={i} className="border border-black p-0.5">{formatVal(d.enrolled)}</td>
                                          ))}
                                          <td className="border border-black p-0.5 font-bold">{formatVal(totalEnrolled)}</td>
                                          <td className="border border-black p-0.5 align-middle" colSpan={4} rowSpan={3}>
                                            <strong>सन {toMarathiNumbers(annualReportYear)} मधील एकूण कामाचे दिवस</strong>
                                            <br /><br />
                                            <strong>{formatVal(totalWorkingDays)}</strong>
                                          </td>
                                        </tr>
                                        <tr>
                                          <td className="border border-black p-0.5 text-left">माहे एप्रिल {toMarathiNumbers(startYearShort)} ते मार्च {toMarathiNumbers(endYearShort)} अखेर एकूण लाभार्थी संख्या</td>
                                          {monthlyRegData.map((d, i) => (
                                            <td key={i} className="border border-black p-0.5">{formatVal(d.beneficiary)}</td>
                                          ))}
                                          <td className="border border-black p-0.5 font-bold">{formatVal(totalBeneficiary)}</td>
                                        </tr>
                                        <tr>
                                          <td className="border border-black p-0.5">{toMarathiNumbers("10")}</td>
                                          <td className="border border-black p-0.5 text-left">आरोग्य तपासणी झालेली विद्यार्थी संख्या</td>
                                          {Array.from({ length: 13 }, (_, i) => <td key={i} className="border border-black p-0.5 h-6"></td>)}
                                        </tr>
                                      </>
                                    );
                                  })()}
                                </tbody>
                              </table>
                            </div>
                            <div className="flex justify-between mt-6">
                              <div className="font-bold">महत्वाचे - सर्व माहिती अचूक भरणे आवश्यक</div>
                              <div className="font-bold pr-12">मुख्याध्यापक सही व शिक्का</div>
                            </div>
                          </div>

                          <style>{`
                              .writing-vertical {
                                writing-mode: vertical-rl;
                                transform: rotate(180deg);
                                white-space: nowrap;
                                padding: 4px 1px;
                                margin: 0 auto;
                              }
                              @media print {
                                @page { size: landscape; margin: 5mm; }
                                body * { visibility: hidden; }
                                #annual-report-print, #annual-report-print * { visibility: visible; }
                                #annual-report-print { position: absolute; left: 0; top: 0; width: 100vw; margin: 0; padding: 10px; }
                                #annual-report-print table { transform-origin: top left; transform: scale(0.95); width: 100%; }
                              }
                            `}</style>

                          <div className="flex justify-end gap-4 pt-4 print:hidden">
                            <button
                              onClick={async () => {
                                const el = document.getElementById('annual-report-print');
                                if (!el) { alert('Report element not found!'); return; }

                                const inputs = el.querySelectorAll('input, textarea');
                                const replacements: { old: Element, new: HTMLSpanElement }[] = [];

                                inputs.forEach((input) => {
                                  const span = document.createElement('span');
                                  span.className = input.className;
                                  span.style.cssText = (input as HTMLElement).style.cssText;
                                  span.style.display = 'inline-block';
                                  span.innerText = (input as HTMLInputElement).value;

                                  input.parentNode?.insertBefore(span, input);
                                  (input as HTMLElement).style.display = 'none';

                                  replacements.push({ old: input, new: span });
                                });

                                try {
                                  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollY: -window.scrollY });
                                  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
                                  const pdfW = pdf.internal.pageSize.getWidth();
                                  const pdfH = pdf.internal.pageSize.getHeight();
                                  const imgW = canvas.width;
                                  const imgH = canvas.height;

                                  // Scale to fit on a single landscape A4 page
                                  const scaleX = pdfW / imgW;
                                  const scaleY = pdfH / imgH;
                                  const scale = Math.min(scaleX, scaleY);

                                  const w = imgW * scale;
                                  const h = imgH * scale;

                                  // Center the image on the PDF page
                                  const x = (pdfW - w) / 2;
                                  const y = (pdfH - h) / 2;

                                  const imgData = canvas.toDataURL('image/jpeg', 0.98);
                                  pdf.addImage(imgData, 'JPEG', x, y, w, h);
                                  pdf.save('Annual_Report.pdf');
                                } catch (e) {
                                  alert('PDF download failed: ' + e);
                                } finally {
                                  replacements.forEach(({ old, new: span }) => {
                                    (old as HTMLElement).style.display = '';
                                    span.remove();
                                  });
                                }
                              }}
                              className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded font-bold text-sm flex items-center gap-2 shadow-sm"
                            >
                              <FileText className="w-4 h-4" />
                              {t("PDF डाउनलोड करा", "Download PDF", "पीडीएफ डाउनलोड करें")}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
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