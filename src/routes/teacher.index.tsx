import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Users,
  UserPlus,
  CreditCard,
  UserCheck,
  Plus,
  MessageSquare,
  Trash2,
  Calendar as CalendarIcon,
  ChevronRight,
  TrendingUp,
  PieChart as PieChartIcon,
  Star,
  Layout,
  Target,
  BookOpen,
  FileSpreadsheet,
  Utensils,
  FolderOpen,
  Folder,
  Activity,
  ClipboardCheck,
  Notebook,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  FileText,
  Lock,
  CheckCircle2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { showToast as toast } from "@/lib/custom-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { DICTIONARY } from "@/lib/translations";
import { getTeacherId } from "@/lib/teacherIsolationHelper";

function WhatsAppIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const MODULE_CARDS = [
  {
    moduleId: "timetable",
    labelKey: "timetable_teacher",
    fallbackLabel: "१. वेळापत्रक",
    to: "/teacher/timetable",
    icon: CalendarIcon,
    description: "या विभागात आपणास इयत्ता पहिली ते आठवीचे वर्गनिहाय दैनिक व साप्ताहिक वेळापत्रक उपलब्ध होईल यामध्ये आवश्यक तो बदल करून एडिट करून शाळेच्या शिक्षकाच्या आणि मुख्याध्यापकांच्या नावासह आपणास ते प्रिंट करून आपल्या वर्गात वापरता येईल.",
  },
  {
    moduleId: "templates",
    labelKey: "templates",
    fallbackLabel: "२. टेम्पलेट",
    to: "/teacher/templates",
    icon: Layout,
    description: "या विभागात आपण विद्यार्थ्यांच्या नावासह नाव, फोटो इयत्ता आकर्षक संदेश एडिट करून आकर्षक टेम्पलेट सह वाढदिवसाच्या शुभेच्छा, प्रवेश स्वागत, क्रीडा दिन, सांस्कृतिक कार्यक्रम, स्नेहसंमेलन, निकाल आणि यश असे विविध शुभेच्छा संदेश व्हाट्सअप वर पाठवू शकता.",
  },
  {
    moduleId: "special-day",
    labelKey: "specialDay",
    fallbackLabel: "३. परिपाठ",
    to: "/teacher/modules/special-day",
    icon: Star,
    description: "या विभागांतर्गत आपणास शाळेतील दैनिक परिपाठ उपलब्ध होईल या परिपाठाची पीडीएफ डाऊनलोड करून आपण ती विद्यार्थ्यांना व्हाट्सअप ग्रुप वर शेअर करू शकता तसेच परिपाठ रजिस्टर साठी महिन्याची एकत्रित पीडीएफ देखील उपलब्ध आहे.",
  },
  {
    moduleId: "meeting-register",
    labelKey: "monthlyMeeting",
    fallbackLabel: "४. मासिक सभा",
    to: "/teacher/meeting",
    icon: Users,
    description: "या विभागात शाळा स्तरावरील सर्व समित्यांचे मासिक अहवाल व इतिवृत्त निमंत्रण पत्रासह उपलब्ध होईल यामध्ये शाळा व्यवस्थापन समिती, विद्यार्थी सुरक्षा व भौतिक सुविधा विकसन समिती, सखी सावित्री समिती, महिला तक्रार निवारण समिती, माजी विद्यार्थी संघ, आणि इको क्लब यांचा समावेश आहे.",
  },
  {
    moduleId: "mdm-register",
    labelKey: "mdm",
    fallbackLabel: "५. माध्यान्ह भोजन",
    to: "/teacher/mdm",
    icon: Utensils,
    description: "या विभागात आपणास आरंभीची शिल्लक, आवक साहित्य आणि दैनंदिन नोंद भरल्यानंतर तांदूळ मागणी, धान्यादी मालाची मागणी, प्रमाणपत्र, मासिक अहवालामध्ये दैनंदिन तांदूळ खर्च नोंदवही भाग एक, पोषण आहार दैनंदिन नोंदी, मासिक तांदूळ अहवाल, मासिक साठा नोंदवही प्रपत्र ब, मासिक तांदूळ शिजवून दिल्याचे बिल, तसेच वार्षिक अहवालामध्ये तांदूळ उपयोगिता आणि धान्याची उपयोगिता आपणास उपलब्ध होणार आहे.",
  },
  {
    moduleId: "sqaf-register",
    labelKey: "sqaaf",
    fallbackLabel: "६. SQAAF मूल्यमापन",
    to: "/teacher/sqaaf",
    icon: ClipboardCheck,
    description: "या विभागात आपणास मानकांच्या स्तरानुसार प्रतिसाद नोंदवल्यानंतर प्रत्येक स्तरानुसार पुरावे निवडल्यानंतर आपणास स्वयं मूल्यांकन व बाह्य मूल्यांकन अहवाल, शाळा प्रतिसाद अहवाल व एकत्रित गुण अहवाल शाळेच्या श्रेणीसह उपलब्ध होईल. स्वयं मूल्यांकन व बाह्य मूल्यांकन अहवालामध्ये बाह्य मूल्यांकनाची सोयही उपलब्ध करून देण्यात आलेली आहे.",
  },
  {
    moduleId: "cce-result",
    labelKey: "results",
    fallbackLabel: "७. CCE निकाल",
    to: "/teacher/result",
    icon: FileSpreadsheet,
    description: "या विभागात इयत्ता पहिली ते आठवी मराठी व सेमी माध्यमाचा निकाल आपणास तयार करता येईल. सर्व नोंदी निवडून सातत्यपूर्ण सर्वंकष मूल्यमापन नोंदवही, गुणपत्रक, प्रगती पत्रक, श्रेणी निहाय निकाल सर्व बाबी या ठिकाणी उपलब्ध आहेत.",
  },
  {
    moduleId: "hpc-card",
    labelKey: "hpcCard",
    fallbackLabel: "८. Holistic Progress Card (HPC)",
    to: "/teacher/hpc-card",
    icon: Sparkles,
    description: "या विभागात आपणास तीनही स्तरातील इयत्ता पहिली ते आठवीपर्यंतचे एचपीसी कार्ड उपलब्ध आहेत. CCE रिजल्ट सेक्शन मध्ये भरलेली विद्यार्थ्यांची माहिती ऑटोमॅटिक या विभागांमध्ये येईल. त्यामुळे विद्यार्थ्यांची माहिती परत भरावी लागणार नाही.",
  },
  {
    moduleId: "stats-teacher",
    labelKey: "statsTeacher",
    fallbackLabel: "९. शिक्षक संचिका",
    to: "/teacher/stats-teacher",
    icon: FolderOpen,
    description: "या विभागात आपणास शिक्षक संचिका उपलब्ध करून देण्यात आलेली आहे आपण आपली सर्व माहिती त्यात भरून एडिट करून आपल्या नावासह व मुख्याध्यापकांच्या नावासह प्रिंट करून शिक्षक संचिका वापरू शकता.",
  },
  {
    moduleId: "annual-monthly-planning",
    labelKey: "planningQuestionBank",
    fallbackLabel: "१०. वार्षिक नियोजन, मासिक नियोजन व प्रश्नपेढी",
    to: "/teacher/modules/annual-monthly-planning",
    icon: Target,
    description: "या विभागात आपणास इयत्ता पहिली ते आठवी पर्यंतचे मराठी तसेच सेमी माध्यमचे वार्षिक नियोजन मासिक नियोजन आणि प्रश्नपेढी उपलब्ध होईल. त्यात आपण शाळेचे नाव शिक्षकाचे नाव मुख्याध्यापकांचे नाव आवश्यक बाबी भरून प्रिंट काढून वापरता येईल जर आपणास त्यात बदल करायचा असेल तर एडिट करण्याची सोय सुद्धा उपलब्ध आहे. सर्व विषयांचे आदर्श वार्षिक नियोजन. सर्व विषयांचे संपूर्ण मासिक नियोजन. अध्ययन निष्पत्तीसह सर्व विषयांची प्रश्नपेढी . A4 HD PDF व ऑनलाइन व्ह्यू.",
  },
  {
    moduleId: "teaching-record",
    labelKey: "teachingRecord",
    fallbackLabel: "११. टाचणवही",
    to: "/teacher/teaching-record",
    icon: Notebook,
    description: "या विभागात आपणास इयत्ता पहिली ते आठवी मराठी आणि सेमी माध्यमचे टाचण उपलब्ध आहे. प्रत्येक दिवसाचे टाचण एडिट करून त्यात हवा तो बदल करून प्रिंट काढता येईल. शाळेच्या वर्ग शिक्षकाच्या आणि मुख्याध्यापकाच्या नावासह आपण प्रिंट काढून वापरू शकतो.",
  },
  {
    moduleId: "stats-student",
    labelKey: "statsStudent",
    fallbackLabel: "१२. विद्यार्थी संचिका",
    to: "/teacher/stats-student",
    icon: Folder,
    description: "या विभागात आपणास विद्यार्थी संचिका उपलब्ध करून देण्यात आलेली आहे यात आपण विद्यार्थ्यांची सर्व माहिती भरून, एडिट करून, आपण ती संचिका शाळेचे नाव, शिक्षकाचे नाव व मुख्याध्यापकांच्या नावासह प्रिंट करून वापरू शकता.",
  },
  {
    moduleId: "homework",
    labelKey: "homework",
    fallbackLabel: "१३. गृहपाठ (Homework)",
    to: "/teacher/homework",
    icon: BookOpen,
    description: "या विभागात आपणास इयत्ता पहिली ते आठवी मराठी व सेमी माध्यमासाठी विषयनिहाय गृहपाठ तयार करता येईल व विद्यार्थ्यांना पाठवता येईल.",
  },
  {
    moduleId: "question-paper",
    labelKey: "questionPaper",
    fallbackLabel: "१४. प्रश्नपत्रिका (Question Paper)",
    to: "/teacher/question-paper",
    icon: FileText,
    description: "या विभागात आपणास इयत्ता पहिली ते आठवी मराठी व सेमी माध्यमासाठी विषयनिहाय घटक चाचणी व सत्र परीक्षा प्रश्नपत्रिका तयार करता येईल व प्रिंट काढता येईल.",
  },
];

export const Route = createFileRoute("/teacher/")({
  component: TeacherDashboard,
});

function TeacherDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { lang } = useLanguage();
  const t = DICTIONARY[lang];

  const [expandedModule, setExpandedModule] = useState<number | null>(null);
  const [pricings, setPricings] = useState<Record<string, any>>({});
  const [grantedModules, setGrantedModules] = useState<string[]>([]);
  const [paidModules, setPaidModules] = useState<string[]>([]);

  // 1. Fetch real-time module pricing from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "cce_module_pricing"), (snap) => {
      const map: Record<string, any> = {};
      snap.docs.forEach((d) => {
        map[d.id] = d.data();
      });
      setPricings(map);
    });

    return () => unsub();
  }, []);

  // 2. Fetch current teacher's granted access and paid records
  const teacherId = getTeacherId(user, profile) || "teacher_guest";
  const userKeys = Array.from(
    new Set(
      [
        teacherId,
        user?.uid,
        user?.email,
        profile?.id,
        profile?.email,
        localStorage.getItem("teacher_email"),
        localStorage.getItem("user_email"),
      ].filter((k): k is string => Boolean(k))
    )
  );

  const isAdmin =
    (user as any)?.role === "admin" ||
    (profile as any)?.role === "admin" ||
    localStorage.getItem("is_super_admin") === "true" ||
    sessionStorage.getItem("is_super_admin") === "true";

  useEffect(() => {
    if (isAdmin) {
      setGrantedModules(["ALL"]);
      return;
    }

    // Listen to admin grants
    const unsubAccess = onSnapshot(collection(db, "teacher_module_access"), (snap) => {
      const list: string[] = [];
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.status === "GRANTED") {
          const matches =
            userKeys.includes(data.teacherId) ||
            userKeys.includes(data.teacherEmail) ||
            (data.id && userKeys.some((k) => data.id.startsWith(k)));
          if (matches) {
            list.push(data.moduleId);
          }
        }
      });
      setGrantedModules(list);
    });

    // Listen to payments
    const unsubPayments = onSnapshot(collection(db, "teacher_module_payments"), (snap) => {
      const paidList: string[] = [];
      const now = Date.now();
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.status === "SUCCESS") {
          const matches =
            userKeys.includes(data.teacherId) ||
            userKeys.includes(data.teacherEmail) ||
            (data.id && userKeys.some((k) => data.id.startsWith(k)));
          if (matches) {
            const expiresTime = data.expiresAt ? new Date(data.expiresAt).getTime() : 0;
            if (!expiresTime || expiresTime > now) {
              paidList.push(data.moduleId);
            }
          }
        }
      });
      setPaidModules(paidList);
    });

    return () => {
      unsubAccess();
      unsubPayments();
    };
  }, [user, profile, isAdmin]);

  const handleModuleAccess = (targetPath: string) => {
    if (user) {
      navigate({ to: targetPath as any });
    } else {
      navigate({
        to: "/login",
        search: { redirect: targetPath, role: "teacher" } as any,
      });
    }
  };

  // Determine Free/Paid status for each card
  const getCardStatus = (modId: string) => {
    const itemPricing = pricings[modId];
    const defaultPrices: Record<string, number> = {
      timetable: 0,
      templates: 149,
      "special-day": 299,
      "meeting-register": 99,
      "mdm-register": 149,
      "sqaf-register": 299,
      "cce-result": 199,
      "hpc-card": 199,
      "stats-teacher": 99,
      "annual-monthly-planning": 149,
      "teaching-record": 99,
      "stats-student": 99,
      homework: 149,
      "question-paper": 199,
    };

    const hasClassPrices =
      itemPricing?.classPrices &&
      Object.values(itemPricing.classPrices).some((p) => typeof p === "number" && p > 0);

    // If admin set price === 0 or enabled === false, or timetable/paripath default is free
    const isFree =
      modId === "special-day" ||
      itemPricing?.enabled === false ||
      (!hasClassPrices && (
        itemPricing?.price === 0 ||
        itemPricing?.monthlyPrice === 0 ||
        itemPricing?.yearlyPrice === 0 ||
        itemPricing?.perStudentPrice === 0 ||
        (!itemPricing && defaultPrices[modId] === 0)
      ));

    const isParipathMatch = (m: string) =>
      ["special-day", "paripath", "daily-assembly", "month-paripath"].includes(m);
    const isPlanningMatch = (m: string) =>
      ["annual-monthly-planning", "academic-planning", "question-bank"].includes(m);

    const isUnlocked =
      isAdmin ||
      grantedModules.includes("ALL") ||
      grantedModules.includes(modId) ||
      paidModules.includes("ALL") ||
      paidModules.includes(modId) ||
      (modId === "special-day" && (grantedModules.some(isParipathMatch) || paidModules.some(isParipathMatch))) ||
      (modId === "annual-monthly-planning" && (grantedModules.some(isPlanningMatch) || paidModules.some(isPlanningMatch)));

    let priceDisplay = "";
    if (!isFree) {
      if (hasClassPrices && itemPricing?.classPrices) {
        const prices = Object.values(itemPricing.classPrices).filter((p): p is number => typeof p === "number" && p > 0);
        const minPrice = prices.length > 0 ? Math.min(...prices) : (itemPricing?.price || 299);
        priceDisplay = `₹${minPrice}/इयत्ता`;
      } else if (modId === "mdm-register" && itemPricing?.yearlyPrice) {
        priceDisplay = `₹${itemPricing.yearlyPrice}`;
      } else if (modId === "hpc-card" && itemPricing?.perStudentPrice) {
        priceDisplay = `₹${itemPricing.perStudentPrice}`;
      } else if (itemPricing?.price) {
        priceDisplay = `₹${itemPricing.price}`;
      } else {
        priceDisplay = `₹${defaultPrices[modId] || 149}`;
      }
    }

    return { isFree, isUnlocked, priceDisplay };
  };

  return (
    <div className="min-h-screen bg-white">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-0 pt-16 min-h-screen bg-slate-50/50">
        <div className="p-4 sm:p-6 space-y-6">
          {/* Top Navigation & Home Back Button */}
          <div className="flex items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to="/"
                className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 text-indigo-700 hover:text-indigo-900 border border-indigo-200/80 rounded-xl text-xs sm:text-sm font-black transition-all shadow-xs active:scale-95 cursor-pointer"
                title="मुख्य होमपेजवर जा (Go to Main Homepage)"
              >
                <ArrowLeft className="size-4 shrink-0" />
                <span>← मुख्य पान (Home Page)</span>
              </Link>
              <span className="text-slate-300 font-bold hidden xs:inline">/</span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-700">शिक्षक विभाग डॅशबोर्ड (Teacher Suite)</span>
            </div>
          </div>

          {/* Quick Access Modules Card Grid */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8 pt-2">
              {MODULE_CARDS.map((item, idx) => {
                const CardIcon = item.icon;
                const isExpanded = expandedModule === idx;
                const status = getCardStatus(item.moduleId);

                return (
                  <motion.div
                    whileHover={{ scale: 1.03, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    key={idx}
                  >
                    <div
                      onClick={() => handleModuleAccess(item.to)}
                      className="min-h-[17.5rem] h-full bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] text-white rounded-3xl sm:rounded-[2.25rem] p-5 sm:p-7 shadow-md hover:shadow-[0_20px_45px_rgba(139,92,246,0.3)] text-left flex flex-col gap-3 transition-all border border-[#7c3aed]/30 relative overflow-hidden group cursor-pointer block w-full"
                    >
                      {/* Watermark background icon */}
                      <div className="absolute right-[-8%] bottom-[-8%] opacity-10 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none">
                        <CardIcon className="size-44" strokeWidth={1} />
                      </div>

                      {/* 0. Top Status Badge: FREE vs PAID */}
                      <div className="relative z-10 flex items-center justify-between gap-2">
                        {status.isFree ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-400/25 text-emerald-100 border border-emerald-300/40 backdrop-blur-md shadow-xs tracking-wide">
                            <Sparkles className="size-3 text-emerald-300" />
                            <span>मोफत (FREE)</span>
                          </span>
                        ) : status.isUnlocked ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-400/25 text-emerald-100 border border-emerald-300/40 backdrop-blur-md shadow-xs tracking-wide">
                            <CheckCircle2 className="size-3 text-emerald-300" />
                            <span>सशुल्क • ॲक्टिव्ह (PAID)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-amber-400/25 text-amber-100 border border-amber-300/40 backdrop-blur-md shadow-xs tracking-wide">
                            <Lock className="size-3 text-amber-300" />
                            <span>सशुल्क (PAID)</span>
                          </span>
                        )}

                        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                          <a
                            href="https://chat.whatsapp.com/IUcC4XskSSQF8dFpQWUMb4?s=sh&p=a&mlu=4&ilr=4"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-extrabold bg-[#25D366]/20 hover:bg-[#25D366] text-white border border-[#25D366]/40 backdrop-blur-md shadow-xs transition-all active:scale-95 group/wa cursor-pointer"
                            title="WhatsApp ग्रुप जॉईन करा (Join WhatsApp Group)"
                          >
                            <WhatsAppIcon className="size-3.5 fill-[#25D366] group-hover/wa:fill-white transition-colors" />
                            <span className="text-[10px] font-black text-emerald-100 group-hover/wa:text-white">Join</span>
                          </a>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedModule(isExpanded ? null : idx);
                            }}
                            className="sm:hidden text-[10px] font-bold text-amber-200 bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-full border border-white/20 flex items-center gap-1 shrink-0"
                          >
                            <span>{isExpanded ? "कमी करा" : "माहिती"}</span>
                          </button>
                        </div>
                      </div>

                      {/* 1. Header: Icon & Title */}
                      <div className="relative z-10 flex items-center gap-3">
                        <div className="size-10 sm:size-11 bg-white/15 rounded-xl sm:rounded-2xl flex items-center justify-center border border-white/25 backdrop-blur-md shrink-0 group-hover:scale-105 group-hover:bg-white group-hover:text-purple-900 transition-all shadow-xs text-white">
                          <CardIcon className="size-5 sm:size-5.5 text-white group-hover:text-purple-900 transition-colors" />
                        </div>
                        <h3 className="text-base sm:text-lg font-black leading-tight tracking-tight text-white flex-1 truncate pr-1">
                          {t[item.labelKey as keyof typeof t] || item.fallbackLabel}
                        </h3>
                      </div>

                      {/* 2. Entering Action Button */}
                      <div className="relative z-10 py-2 px-3 sm:py-2.5 sm:px-3.5 rounded-xl sm:rounded-2xl bg-white/15 group-hover:bg-white/25 border border-white/25 flex items-center justify-between gap-2 transition-all duration-300 group-hover:border-white/40 shadow-xs">
                        <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-white">
                          {lang === "mr" ? "विभागात प्रवेश करा" : "ENTER SECTION"}
                        </span>
                        <div className="size-6 sm:size-7 shrink-0 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm text-white group-hover:bg-white group-hover:text-purple-900">
                          <ArrowRight className="size-3.5 sm:size-4 group-hover:translate-x-0.5 transition-transform duration-300" />
                        </div>
                      </div>

                      {/* 3. Description */}
                      <div className="relative z-10 pt-2 sm:pt-2.5 border-t border-white/20 flex-1 flex flex-col justify-start">
                        <p
                          className={`text-[11.5px] sm:text-xs text-violet-100/95 font-medium leading-relaxed transition-all duration-300 ${
                            isExpanded || item.moduleId === "annual-monthly-planning"
                              ? "line-clamp-none text-white font-medium"
                              : "line-clamp-3 sm:line-clamp-3 group-hover:line-clamp-none"
                          }`}
                        >
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
