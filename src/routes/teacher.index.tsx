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
    fallbackLabel: "वेळापत्रक",
    to: "/teacher/timetable",
    icon: CalendarIcon,
    description: "शिक्षकांचे व वर्गांचे दैनिक तसेच साप्ताहिक वेळापत्रक व्यवस्थापन.",
  },
  {
    labelKey: "specialDay",
    fallbackLabel: "परिपाठ",
    to: "/teacher/modules/special-day",
    icon: Star,
    description: "शाळेचा दैनिक परिपाठ आणि विशेष दिनाची माहिती नोंदवणे व व्यवस्थापन.",
  },
  {
    labelKey: "templates",
    fallbackLabel: "टेम्पलेट्स",
    to: "/teacher/templates",
    icon: Layout,
    description: "विविध शुभेच्छा संदेश, क्रीडा आणि स्नेहसंमेलन कार्यक्रम पत्रिका डिझाइन टेम्पलेट्स.",
  },
  {
    labelKey: "planningQuestionBank",
    fallbackLabel: "नियोजन व प्रश्नपेढी",
    to: "/teacher/modules/annual-monthly-planning",
    icon: Target,
    description: "वार्षिक व मासिक अभ्यासक्रम नियोजन आणि प्रश्नपेढी निर्मिती.",
  },
  {
    labelKey: "teachingRecord",
    fallbackLabel: "टाचनवही",
    to: "/teacher/teaching-record",
    icon: Notebook,
    description: "शिक्षकांची दैनिक अध्यापन टाचनवही (Teaching Diary) नोंदी.",
  },

  {
    labelKey: "results",
    fallbackLabel: "माझे निकाल",
    to: "/teacher/result",
    icon: FileSpreadsheet,
    description: "विद्यार्थ्यांचे गुण नोंदणी, प्रगती पत्रके आणि निकाल विश्लेषण.",
  },
  {
    labelKey: "monthlyMeeting",
    fallbackLabel: "मासिक सभा",
    to: "/teacher/meeting",
    icon: Users,
    description: "विविध शालेय समित्यांचे मासिक अहवाल, इतिवृत्त आणि स्वाक्षरी नोंदणी.",
  },
  {
    labelKey: "mdm",
    fallbackLabel: "माध्यान्ह भोजन",
    to: "/teacher/mdm",
    icon: Utensils,
    description: "माध्यान्ह भोजन (MDM) योजना मधील साहित्य साठा आणि नोंदणी.",
  },
  {
    labelKey: "statsTeacher",
    fallbackLabel: "शिक्षक संचिका",
    to: "/teacher/stats-teacher",
    icon: FolderOpen,
    description: "शिक्षकांची वैयक्तिक आणि व्यावसायिक माहिती संचिका.",
  },
  {
    labelKey: "statsStudent",
    fallbackLabel: "विद्यार्थी संचिका",
    to: "/teacher/stats-student",
    icon: Folder,
    description: "विद्यार्थ्यांची वैयक्तिक, शैक्षणिक आणि प्रगती संचिका.",
  },

  {
    labelKey: "sqaaf",
    fallbackLabel: "SQAAF मूल्यमापन",
    to: "/teacher/sqaaf",
    icon: ClipboardCheck,
    description: "शालेय गुणवत्ता आश्वासन फ्रेमवर्क (SQAAF) स्वयं-मूल्यमापन.",
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

  useEffect(() => {
    if (!authLoading) {
      if (sessionStorage.getItem("is_super_admin")) {
        return;
      }
      if (!user || profile?.role !== "teacher") {
        navigate({
          to: "/login",
          search: { redirect: "/teacher", role: "teacher" } as any,
        });
        return;
      }
    }
  }, [user, profile, authLoading, navigate]);

  if (authLoading || !user)
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">
            Verifying Educator Credentials...
          </p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-white">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-64 pt-16 min-h-screen bg-slate-50/50">
        <div className="p-6 space-y-6">
          {/* Quick Access Modules Card Grid */}
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-violet-50 to-indigo-50/50 p-8 rounded-[2rem] border border-indigo-100/50 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
              <div className="space-y-1">
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Sparkles className="size-5 text-indigo-600 animate-pulse" /> शिक्षक विभाग सेवा सूची (Teacher Modules)
                </h2>
                <p className="text-xs font-bold text-slate-500">
                  माहिती भरण्यासाठी किंवा अहवाल पाहण्यासाठी खालीलपैकी कोणतेही एक मॉड्यूल निवडा.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl">
                <span>एकूण {MODULE_CARDS.length} सक्रिय मॉड्यूल्स</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pt-2">
              {MODULE_CARDS.map((item, idx) => {
                const CardIcon = item.icon;
                return (
                  <motion.div
                    whileHover={{ scale: 1.04, y: -6 }}
                    whileTap={{ scale: 0.98 }}
                    key={idx}
                  >
                    <Link
                      to={item.to}
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
                    </Link>
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
