<<<<<<< HEAD
import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { Star, GraduationCap, Trophy, Music, Sparkles, Award, ArrowRight } from "lucide-react";
=======
import {
  createFileRoute,
  Outlet,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import { motion } from "framer-motion";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import {
  Star,
  GraduationCap,
  Trophy,
  Music,
  Sparkles,
  Award,
  ArrowRight,
} from "lucide-react";
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
import { useLanguage } from "@/hooks/use-language";
import { DICTIONARY } from "@/lib/translations";

export const Route = createFileRoute("/teacher/templates")({
  component: TemplatesLayout,
});

const CATEGORIES = [
  {
    id: "birthday",
    labelKey: "birthdayWishes",
    to: "/teacher/templates/birthday",
    icon: Star,
    color: "from-pink-500 to-rose-500",
    shadow: "hover:shadow-[0_20px_45px_rgba(244,63,94,0.35)]",
    border: "border-pink-500/20",
<<<<<<< HEAD
    textLight: "text-pink-200"
=======
    textLight: "text-pink-200",
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  },
  {
    id: "admission",
    labelKey: "admissionWelcome",
    to: "/teacher/templates/admission",
    icon: GraduationCap,
    color: "from-blue-500 to-indigo-500",
    shadow: "hover:shadow-[0_20px_45px_rgba(99,102,241,0.35)]",
    border: "border-indigo-500/20",
<<<<<<< HEAD
    textLight: "text-indigo-200"
=======
    textLight: "text-indigo-200",
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  },
  {
    id: "sports",
    labelKey: "sportsDay",
    to: "/teacher/templates/sports",
    icon: Trophy,
    color: "from-amber-500 to-orange-500",
    shadow: "hover:shadow-[0_20px_45px_rgba(245,158,11,0.35)]",
    border: "border-orange-500/20",
<<<<<<< HEAD
    textLight: "text-orange-200"
=======
    textLight: "text-orange-200",
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  },
  {
    id: "cultural",
    labelKey: "culturalActivities",
    to: "/teacher/templates/cultural",
    icon: Music,
    color: "from-purple-500 to-violet-500",
    shadow: "hover:shadow-[0_20px_45px_rgba(139,92,246,0.35)]",
    border: "border-violet-500/20",
<<<<<<< HEAD
    textLight: "text-violet-200"
=======
    textLight: "text-violet-200",
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  },
  {
    id: "annual",
    labelKey: "annualFunction",
    to: "/teacher/templates/annual",
    icon: Sparkles,
    color: "from-teal-500 to-emerald-500",
    shadow: "hover:shadow-[0_20px_45px_rgba(20,184,166,0.35)]",
    border: "border-emerald-500/20",
<<<<<<< HEAD
    textLight: "text-emerald-200"
=======
    textLight: "text-emerald-200",
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  },
  {
    id: "achievement",
    labelKey: "resultAchievement",
    to: "/teacher/templates/achievement",
    icon: Award,
    color: "from-cyan-500 to-sky-500",
    shadow: "hover:shadow-[0_20px_45px_rgba(6,182,212,0.35)]",
    border: "border-sky-500/20",
<<<<<<< HEAD
    textLight: "text-sky-200"
  }
=======
    textLight: "text-sky-200",
  },
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
];

function TemplatesLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useLanguage();
  const t = DICTIONARY[lang as keyof typeof DICTIONARY] || DICTIONARY.mr;

<<<<<<< HEAD
  const isIndex = location.pathname === "/teacher/templates" || location.pathname === "/teacher/templates/";
=======
  const isIndex =
    location.pathname === "/teacher/templates" ||
    location.pathname === "/teacher/templates/";
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557

  if (isIndex) {
    return (
      <div className="min-h-screen bg-slate-50">
        <TeacherHeader />
        <TeacherSidebar />

        <main className="lg:pl-64 pt-16 min-h-screen">
          <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 flex flex-col justify-center min-h-[calc(100vh-8rem)]">
            <div className="text-center space-y-2">
<<<<<<< HEAD
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Select Template Category / वर्ग निवडा</h2>
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Choose a template type to view and download</p>
=======
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                Select Template Category / वर्ग निवडा
              </h2>
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                Choose a template type to view and download
              </p>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto w-full">
              {CATEGORIES.map((cat, idx) => {
                return (
                  <motion.button
                    key={cat.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => {
                      navigate({ to: cat.to as any });
                    }}
                    className={`group p-8 rounded-[2.5rem] border text-center transition-all duration-500 shadow-md ${cat.shadow} cursor-pointer relative overflow-hidden flex flex-col items-center gap-4 bg-gradient-to-br ${cat.color} text-white ${cat.border} hover:scale-[1.02]`}
                  >
                    <div className="absolute -bottom-6 -right-6 size-24 text-white/5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                      <cat.icon className="w-full h-full" strokeWidth={1.5} />
                    </div>

                    <div className="size-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform text-white">
                      <cat.icon className="size-6" strokeWidth={2} />
                    </div>
<<<<<<< HEAD
                    
=======

>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                    <div className="space-y-1">
                      <h3 className="text-lg font-black leading-tight tracking-tight">
                        {t[cat.labelKey as keyof typeof t] || cat.labelKey}
                      </h3>
<<<<<<< HEAD
                      <p className={`text-[10px] ${cat.textLight} font-bold uppercase tracking-wider`}>
=======
                      <p
                        className={`text-[10px] ${cat.textLight} font-bold uppercase tracking-wider`}
                      >
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                        {cat.id} Templates
                      </p>
                    </div>

<<<<<<< HEAD
                    <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${cat.textLight} mt-2`}>
=======
                    <div
                      className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${cat.textLight} mt-2`}
                    >
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                      प्रवेश करा{" "}
                      <ArrowRight className="size-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return <Outlet />;
}
