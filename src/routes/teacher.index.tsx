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
  Sparkles,
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

const MODULE_CARDS = [
  {
    labelKey: "timetable_teacher",
    fallbackLabel: "१. वेळापत्रक",
    to: "/teacher/timetable",
    icon: CalendarIcon,
    description: "या विभागात आपणास इयत्ता पहिली ते आठवीचे वर्गनिहाय दैनिक व साप्ताहिक वेळापत्रक उपलब्ध होईल यामध्ये आवश्यक तो बदल करून एडिट करून शाळेच्या शिक्षकाच्या आणि मुख्याध्यापकांच्या नावासह आपणास ते प्रिंट करून आपल्या वर्गात वापरता येईल.",
  },
  {
    labelKey: "specialDay",
    fallbackLabel: "२. परिपाठ",
    to: "/teacher/modules/special-day",
    icon: Star,
    description: "या विभागांतर्गत आपणास शाळेतील दैनिक परिपाठ उपलब्ध होईल या परिपाठाची पीडीएफ डाऊनलोड करून आपण ती विद्यार्थ्यांना व्हाट्सअप ग्रुप वर शेअर करू शकता तसेच परिपाठ रजिस्टर साठी महिन्याची एकत्रित पीडीएफ देखील उपलब्ध आहे.",
  },
  {
    labelKey: "templates",
    fallbackLabel: "३. टेम्पलेट",
    to: "/teacher/templates",
    icon: Layout,
    description: "या विभागात आपण विद्यार्थ्यांच्या नावासह नाव, फोटो इयत्ता आकर्षक संदेश एडिट करून आकर्षक टेम्पलेट सह वाढदिवसाच्या शुभेच्छा, प्रवेश स्वागत, क्रीडा दिन, सांस्कृतिक कार्यक्रम, स्नेहसंमेलन, निकाल आणि यश असे विविध शुभेच्छा संदेश व्हाट्सअप वर पाठवू शकता.",
  },
  {
    labelKey: "results",
    fallbackLabel: "४. CCE निकाल",
    to: "/teacher/result",
    icon: FileSpreadsheet,
    description: "या विभागात इयत्ता पहिली ते आठवी मराठी व सेमी माध्यमाचा निकाल आपणास तयार करता येईल. सर्व नोंदी निवडून सातत्यपूर्ण सर्वंकष मूल्यमापन नोंदवही, गुणपत्रक, प्रगती पत्रक, श्रेणी निहाय निकाल सर्व बाबी या ठिकाणी उपलब्ध आहेत.",
  },
  {
    labelKey: "monthlyMeeting",
    fallbackLabel: "५. मासिक सभा",
    to: "/teacher/meeting",
    icon: Users,
    description: "विविध शालेय समित्यांचे मासिक अहवाल, इतिवृत्त आणि स्वाक्षरी नोंदणी.",
  },
  {
    labelKey: "mdm",
    fallbackLabel: "६. माध्यान्ह भोजन",
    to: "/teacher/mdm",
    icon: Utensils,
    description: "माध्यान्ह भोजन (MDM) योजना मधील साहित्य साठा आणि नोंदणी.",
  },
  {
    labelKey: "statsTeacher",
    fallbackLabel: "७. शिक्षक संचिका",
    to: "/teacher/stats-teacher",
    icon: FolderOpen,
    description: "शिक्षकांची वैयक्तिक आणि व्यावसायिक माहिती संचिका.",
  },
  {
    labelKey: "statsStudent",
    fallbackLabel: "८. विद्यार्थी संचिका",
    to: "/teacher/stats-student",
    icon: Folder,
    description: "विद्यार्थ्यांची वैयक्तिक, शैक्षणिक आणि प्रगती संचिका.",
  },
  {
    labelKey: "sqaaf",
    fallbackLabel: "९. SQAAF मूल्यमापन",
    to: "/teacher/sqaaf",
    icon: ClipboardCheck,
    description: "शालेय गुणवत्ता आश्वासन फ्रेमवर्क (SQAAF) स्वयं-मूल्यमापन.",
  },
  {
    labelKey: "teachingRecord",
    fallbackLabel: "१०. टाचणवही",
    to: "/teacher/teaching-record",
    icon: Notebook,
    description: "या विभागात आपणास इयत्ता पहिली ते आठवी मराठी आणि सेमी माध्यमचे टाचण उपलब्ध आहे. प्रत्येक दिवसाचे टाचण एडिट करून त्यात हवा तो बदल करून प्रिंट काढता येईल. शाळेच्या वर्ग शिक्षकाच्या आणि मुख्याध्यापकाच्या नावासह आपण प्रिंट काढून वापरू शकतो.",
  },
  {
    labelKey: "planningQuestionBank",
    fallbackLabel: "११. वार्षिक नियोजन, मासिक नियोजन व प्रश्नपेढी",
    to: "/teacher/modules/annual-monthly-planning",
    icon: Target,
    description: "या विभागात आपणास इयत्ता पहिली ते आठवी पर्यंतचे मराठी तसेच सेमी माध्यमचे वार्षिक नियोजन मासिक नियोजन आणि प्रश्नपेढी उपलब्ध होईल. त्यात आपण शाळेचे नाव शिक्षकाचे नाव मुख्याध्यापकांचे नाव आवश्यक बाबी भरून प्रिंट काढून वापरता येईल जर आपणास त्यात बदल करायचा असेल तर एडिट करण्याची सोय सुद्धा उपलब्ध आहे.",
  },
  {
    labelKey: "hpcCard",
    fallbackLabel: "१२. Holistic Progress Card (HPC)",
    to: "/teacher/hpc-card",
    icon: Sparkles,
    description: "विद्यार्थ्यांचे समग्र व सर्वंकष प्रगती पत्रक (HPC Card) मूल्यमापन.",
  },
];

export const Route = createFileRoute("/teacher/")({
  component: TeacherDashboard,
});

function TeacherDashboard() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { lang } = useLanguage();
  const t = DICTIONARY[lang];

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

  return (
    <div className="min-h-screen bg-white">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-0 pt-16 min-h-screen bg-slate-50/50">
        <div className="p-6 space-y-6">
          {/* Quick Access Modules Card Grid */}
          <div className="space-y-6">


            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pt-2">
              {MODULE_CARDS.map((item, idx) => {
                const CardIcon = item.icon;
                return (
                  <motion.div
                    whileHover={{ scale: 1.04, y: -6 }}
                    whileTap={{ scale: 0.98 }}
                    key={idx}
                  >
                    <div
                      onClick={() => handleModuleAccess(item.to)}
                      className="h-64 bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] text-white rounded-[2.5rem] p-8 shadow-md hover:shadow-[0_20px_45px_rgba(139,92,246,0.3)] text-left flex flex-col justify-between transition-all border border-[#7c3aed]/30 relative overflow-hidden group cursor-pointer block w-full"
                    >
                      {/* Watermark background icon */}
                      <div className="absolute right-[-10%] bottom-[-10%] opacity-10 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none">
                        <CardIcon className="size-48" strokeWidth={1} />
                      </div>

                      {/* Small Icon Badge */}
                      <div className="size-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform">
                        <CardIcon className="size-6 text-white" />
                      </div>

                      {/* Committee Name */}
                      <div className="space-y-2">
                        <h3 className="text-xl font-black leading-tight tracking-tight pr-4">
                          {t[item.labelKey as keyof typeof t] || item.fallbackLabel}
                        </h3>
                        <p className="text-[11px] text-violet-100/70 font-semibold line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {/* Footer Arrow Action */}
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-violet-200 mt-2">
                        प्रवेश करा{" "}
                        <ArrowRight className="size-3 group-hover:translate-x-1.5 transition-transform duration-300" />
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
