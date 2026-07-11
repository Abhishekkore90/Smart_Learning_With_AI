<<<<<<< HEAD

=======
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  GraduationCap,
  BookOpen,
  Bot,
  School,
  Globe,
  ChevronDown,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { DICTIONARY } from "@/lib/translations";

import { AboutPage } from "@/components/home/AboutSection";
import { ContactPage } from "@/components/home/ContactSection";
import { Footer } from "@/components/Footer";

import brainovaBg from "@/assets/brainova-bg.jpg";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const t = DICTIONARY[lang] as any;

  const landingCards = [
    {
      title: t.c1_title || "Study",
      desc: t.c1_desc || "Access intelligent virtual AI mentors.",
      icon: Bot,
      color: "sky",
      softBg: "bg-sky-50/80",
      blobColor: "bg-sky-200/60",
      iconBg: "bg-sky-100",
      iconColor: "text-sky-600",
      actionText: t.c1_action || "Launch AI Suite",
      to: "/ai-tools",
    },
    {
      title: t.c4_title || "Practice",
      desc:
        t.c4_desc ||
        "Track academic progress, check exam results, submit school homework assignments, and earn verified performance badges.",
      icon: GraduationCap,
      color: "rose",
      softBg: "bg-rose-50/80",
      blobColor: "bg-rose-200/60",
      iconBg: "bg-rose-100",
      iconColor: "text-rose-600",
      actionText: t.c4_action || "Open Scholar Portal",
      to: "/login",
      search: { role: "student" },
    },
    {
      title: t.c3_title || "Courses",
      desc: t.c3_desc || "Browse a rich catalog of courses.",
      icon: BookOpen,
      color: "violet",
      softBg: "bg-violet-50/80",
      blobColor: "bg-violet-200/60",
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
      actionText: t.c3_action || "Explore Courses",
      to: "/courses",
    },
    {
      title: t.c2_title || "Teacher Section",
      desc: t.c2_desc || "Empower teachers to manage classrooms.",
      icon: School,
      color: "emerald",
      softBg: "bg-emerald-50/80",
      blobColor: "bg-emerald-200/60",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      actionText: t.c2_action || "Enter Teacher Suite",
      to: "/login",
      search: { role: "teacher" },
    },
  ];

  return (
<<<<<<< HEAD
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-primary/20 selection:text-primary overflow-x-hidden relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-slate-50/50">
        {/* Ambient background glow using a blurry version of the image */}
        <img
          src={brainovaBg}
          alt="Ambient Background Glow"
          className="absolute inset-0 w-full h-full object-cover opacity-15 blur-[80px] scale-105"
          loading="eager"
        />

        {/* Subtle overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-sky-100/10 via-indigo-50/5 to-emerald-50/10 z-10" />

        {/* Static soft color accents */}
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-indigo-400/10 z-20" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-emerald-400/10 z-20" />
      </div>

      {/* Hero Section with Split-Screen Grid Layout */}
      <main className="relative z-10 pt-28 pb-16 md:pt-40 md:pb-24 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          
          {/* Left Column: Brand Intro & Landing Cards */}
          <div className="lg:col-span-5 flex flex-col space-y-6 text-left order-2 lg:order-1">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100/80 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm max-w-fit"
            >
              <Bot className="size-4 text-indigo-500 animate-pulse" />
              <span>Next-Gen EdTech Suite</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-slate-900"
=======
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-500/20 selection:text-indigo-700 overflow-x-hidden relative">
      {/* Background System */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-slate-50/60">
        {/* Ambient background glow using a blurry version of the main image */}
        <img
          src={brainovaBg}
          alt="Ambient Background Glow"
          className="absolute inset-0 w-full h-full object-cover opacity-12 blur-[100px] scale-110"
          loading="eager"
        />

        {/* Tech Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:24px_24px] z-10" />

        {/* Dynamic floating light beam overlays */}
        <div className="absolute inset-0 bg-gradient-to-tr from-sky-100/10 via-indigo-50/5 to-emerald-50/10 z-10" />

        {/* Interactive animated background glowing orbs */}
        <motion.div
          animate={{
            scale: [1, 1.18, 1],
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-[-5%] right-[-5%] w-[450px] h-[450px] rounded-full bg-indigo-400/8 blur-[120px] z-20"
        />
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            x: [0, -20, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute bottom-[-5%] left-[-8%] w-[450px] h-[450px] rounded-full bg-teal-400/8 blur-[120px] z-20"
        />
      </div>

      {/* Hero Section with Split-Screen Grid Layout */}
      <main className="relative z-10 pt-20 pb-16 md:pt-24 md:pb-20 lg:pb-32 px-4 md:px-8 max-w-7xl mx-auto flex flex-col justify-center lg:min-h-[calc(100vh-80px)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Brand Intro & Landing Cards (Shows FIRST on mobile) */}
          <div className="lg:col-span-5 flex flex-col space-y-6 text-left order-1 lg:order-1">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-50/90 to-sky-50/90 border border-indigo-100/70 text-indigo-600 text-[10px] font-black uppercase tracking-[0.22em] shadow-[0_2px_8px_rgba(79,70,229,0.04)] max-w-fit relative overflow-hidden group"
            >
              {/* Highlight sweep animation */}
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
              <span className="relative size-1.5 rounded-full bg-indigo-500">
                <span className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-75" />
              </span>
              <span className="relative z-10 flex items-center gap-1">
                Next-Gen EdTech Suite
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-slate-900"
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
            >
              SGK{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-indigo-600 to-pink-500">
                BRAINOVA
              </span>
            </motion.h1>

            <motion.p
<<<<<<< HEAD
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-slate-600 font-bold text-sm sm:text-base md:text-lg leading-relaxed max-w-xl"
            >
              {t.hero_subtitle || "Study with AI, Practice with AI. Empowering students and teachers with smart learning solutions."}
            </motion.p>

            {/* Premium Animated Soft Cards Grid */}
=======
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-slate-600 font-semibold text-sm sm:text-base leading-relaxed max-w-xl"
            >
              {t.hero_subtitle ||
                "Study with AI, Practice with AI. Empowering students and teachers with smart learning solutions."}
            </motion.p>

            {/* Premium Animated Soft Cards Grid - Responsive columns: 1-col on mobile, 2-col on sm+ */}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
<<<<<<< HEAD
                  transition: { staggerChildren: 0.12, delayChildren: 0.3 },
                },
              }}
              className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 w-full"
=======
                  transition: { staggerChildren: 0.1, delayChildren: 0.2 },
                },
              }}
              className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full"
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
            >
              {landingCards.map((card, index) => {
                const Icon = card.icon;

<<<<<<< HEAD
                // Define extra rich styles per card color for premium appearance
                const styleMap: Record<string, { gradient: string; glowBg: string; glowBorder: string }> = {
                  sky: {
                    gradient: "from-sky-400 to-blue-500",
                    glowBg: "group-hover:shadow-[0_20px_45px_rgba(56,189,248,0.35)]",
                    glowBorder: "group-hover:border-sky-400/80",
                  },
                  rose: {
                    gradient: "from-rose-400 to-pink-500",
                    glowBg: "group-hover:shadow-[0_20px_45px_rgba(251,113,133,0.35)]",
                    glowBorder: "group-hover:border-rose-400/80",
                  },
                  violet: {
                    gradient: "from-violet-400 to-purple-500",
                    glowBg: "group-hover:shadow-[0_20px_45px_rgba(167,139,250,0.35)]",
                    glowBorder: "group-hover:border-violet-400/80",
                  },
                  emerald: {
                    gradient: "from-emerald-400 to-teal-500",
                    glowBg: "group-hover:shadow-[0_20px_45px_rgba(52,211,153,0.35)]",
                    glowBorder: "group-hover:border-emerald-400/80",
=======
                // Color mappings for modern border-glow, bg-blurs, and icons
                const styleMap: Record<
                  string,
                  {
                    gradient: string;
                    glowBg: string;
                    borderHover: string;
                    iconColor: string;
                    hoverIconBg: string;
                  }
                > = {
                  sky: {
                    gradient: "from-sky-400 to-blue-500",
                    glowBg:
                      "group-hover:shadow-[0_20px_40px_rgba(56,189,248,0.22)]",
                    borderHover: "hover:border-sky-300/60",
                    iconColor: "text-sky-600 group-hover:text-sky-500",
                    hoverIconBg: "group-hover:bg-sky-50/50",
                  },
                  rose: {
                    gradient: "from-rose-400 to-pink-500",
                    glowBg:
                      "group-hover:shadow-[0_20px_40px_rgba(251,113,133,0.22)]",
                    borderHover: "hover:border-rose-300/60",
                    iconColor: "text-rose-600 group-hover:text-rose-500",
                    hoverIconBg: "group-hover:bg-rose-50/50",
                  },
                  violet: {
                    gradient: "from-violet-400 to-purple-500",
                    glowBg:
                      "group-hover:shadow-[0_20px_40px_rgba(167,139,250,0.22)]",
                    borderHover: "hover:border-violet-300/60",
                    iconColor: "text-violet-600 group-hover:text-violet-500",
                    hoverIconBg: "group-hover:bg-violet-50/50",
                  },
                  emerald: {
                    gradient: "from-emerald-400 to-teal-500",
                    glowBg:
                      "group-hover:shadow-[0_20px_40px_rgba(52,211,153,0.22)]",
                    borderHover: "hover:border-emerald-300/60",
                    iconColor: "text-emerald-600 group-hover:text-emerald-500",
                    hoverIconBg: "group-hover:bg-emerald-50/50",
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  },
                };
                const customStyles = styleMap[card.color] || styleMap.sky;

                return (
                  <motion.button
                    key={index}
                    variants={{
<<<<<<< HEAD
                      hidden: { opacity: 0, y: 30, scale: 0.95 },
=======
                      hidden: { opacity: 0, y: 25, scale: 0.96 },
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                      show: {
                        opacity: 1,
                        y: 0,
                        scale: 1,
<<<<<<< HEAD
                        transition: { type: "spring", stiffness: 300, damping: 20 },
                      },
                    }}
                    whileHover={{
                      y: -10,
                      scale: 1.02,
                      transition: { type: "spring", stiffness: 400, damping: 15 },
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate({ to: card.to as any, search: (card as any).search })}
                    className={`relative text-left group transition-all duration-500 flex flex-col justify-between h-full min-h-[190px] sm:min-h-[220px] rounded-3xl border border-white/50 bg-white/40 backdrop-blur-md shadow-[0_10px_35px_rgba(0,0,0,0.04)] hover:shadow-2xl overflow-hidden ${customStyles.glowBg} ${customStyles.glowBorder}`}
                  >
                    {/* Diagonal Gloss Shine Overlay on Hover */}
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out z-10 pointer-events-none" />

                    {/* Neon Gradient Border Glow on Hover */}
                    <div className={`absolute -inset-px rounded-3xl bg-gradient-to-r ${customStyles.gradient} opacity-0 group-hover:opacity-35 transition-opacity duration-500 blur z-0`} />

                    {/* Soft Pastel Hover Background */}
                    <div
                      className={`absolute inset-0 ${card.softBg} opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-0`}
                    />

                    {/* Animated Soft Pastel Orbs */}
                    <div
                      className={`absolute -top-24 -right-24 w-64 h-64 ${card.blobColor} rounded-full opacity-45 group-hover:scale-125 transition-transform duration-700 ease-out blur-2xl z-0`}
                    />
                    <div
                      className={`absolute -bottom-24 -left-24 w-64 h-64 ${card.blobColor} rounded-full opacity-45 group-hover:scale-125 transition-transform duration-700 ease-out blur-2xl z-0`}
                    />

                    {/* Content */}
=======
                        transition: {
                          type: "spring",
                          stiffness: 300,
                          damping: 20,
                        },
                      },
                    }}
                    whileHover={{
                      y: -6,
                      scale: 1.015,
                      transition: {
                        type: "spring",
                        stiffness: 400,
                        damping: 15,
                      },
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() =>
                      navigate({
                        to: card.to as any,
                        search: (card as any).search,
                      })
                    }
                    className={`relative text-left group transition-all duration-500 flex flex-col justify-between h-full min-h-[140px] sm:min-h-[210px] rounded-[1.8rem] sm:rounded-[2rem] border border-slate-200/50 bg-white/45 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:shadow-xl overflow-hidden ${customStyles.glowBg} ${customStyles.borderHover}`}
                  >
                    {/* Gloss Shine Overlay */}
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-transparent via-white/35 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out z-10 pointer-events-none" />

                    {/* Gradient Border Glow on Hover */}
                    <div
                      className={`absolute -inset-px rounded-[1.8rem] sm:rounded-[2rem] bg-gradient-to-r ${customStyles.gradient} opacity-0 group-hover:opacity-15 transition-opacity duration-500 blur-[1px] z-0`}
                    />

                    {/* Soft Pastel Background Accent */}
                    <div
                      className={`absolute inset-0 ${card.softBg} opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0`}
                    />

                    {/* Interactive Background Orbs */}
                    <div
                      className={`absolute -top-24 -right-24 w-56 h-56 ${card.blobColor} rounded-full opacity-40 group-hover:scale-125 transition-transform duration-700 ease-out blur-2xl z-0`}
                    />
                    <div
                      className={`absolute -bottom-24 -left-24 w-56 h-56 ${card.blobColor} rounded-full opacity-40 group-hover:scale-125 transition-transform duration-700 ease-out blur-2xl z-0`}
                    />

                    {/* Content Layer */}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                    <div className="relative z-20 p-4 sm:p-5 flex flex-col h-full justify-between w-full">
                      <div>
                        {/* Soft Icon Container */}
                        <div
<<<<<<< HEAD
                          className={`size-9 sm:size-10 rounded-2xl ${card.iconBg} ${card.iconColor} flex items-center justify-center mb-3 shadow-sm border border-white/40 transition-all duration-500 group-hover:bg-white group-hover:shadow-md group-hover:scale-110 group-hover:rotate-3`}
                        >
                          <Icon size={18} className="sm:w-5 sm:h-5 transition-transform duration-500" strokeWidth={1.8} />
                        </div>

                        <h3
                          className={`text-sm sm:text-base md:text-lg font-black text-slate-900 tracking-tight mb-1 transition-all duration-300 group-hover:translate-x-1 group-hover:${card.iconColor}`}
                        >
                          {card.title}
                        </h3>
                        <p className="text-slate-600 text-[10px] sm:text-xs font-semibold leading-relaxed tracking-wide group-hover:text-slate-800 transition-colors duration-300 line-clamp-3 sm:line-clamp-none">
=======
                          className={`size-10 sm:size-11 rounded-2xl ${card.iconBg} ${customStyles.iconColor} ${customStyles.hoverIconBg} flex items-center justify-center mb-3.5 sm:mb-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)] border border-white/90 transition-all duration-500 group-hover:shadow-md group-hover:scale-110 group-hover:rotate-3`}
                        >
                          <Icon
                            size={19}
                            className="sm:w-5 sm:h-5 transition-transform duration-500"
                            strokeWidth={1.8}
                          />
                        </div>

                        <h3
                          className={`text-sm sm:text-base font-black text-slate-800 tracking-tight mb-1 sm:mb-1.5 transition-all duration-300 group-hover:translate-x-1 group-hover:${customStyles.iconColor}`}
                        >
                          {card.title}
                        </h3>
                        <p className="text-slate-500 text-[10.5px] sm:text-[11.5px] font-semibold leading-relaxed tracking-wide group-hover:text-slate-700 transition-colors duration-300 line-clamp-3 sm:line-clamp-none">
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                          {card.desc}
                        </p>
                      </div>

<<<<<<< HEAD
                      <div className="pt-3 mt-3 flex items-center justify-between gap-2 border-t border-slate-200/50 group-hover:border-slate-300/40 transition-colors duration-300">
                        <span
                          className={`text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:${card.iconColor} transition-colors duration-300`}
=======
                      <div className="pt-3 sm:pt-3.5 mt-3 sm:mt-3.5 flex items-center justify-between gap-2 border-t border-slate-200/50 group-hover:border-slate-300/40 transition-colors duration-300">
                        <span
                          className={`text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:${customStyles.iconColor} transition-colors duration-300`}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                        >
                          {card.actionText}
                        </span>
                        <div
<<<<<<< HEAD
                          className={`size-6 sm:size-7 shrink-0 rounded-full bg-white border border-slate-200 flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-sm text-slate-400 group-hover:text-white group-hover:border-transparent group-hover:bg-gradient-to-r group-hover:${customStyles.gradient}`}
                        >
                          <ArrowRight
                            size={10}
=======
                          className={`size-6.5 sm:size-7.5 shrink-0 rounded-full bg-white border border-slate-180 flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-sm text-slate-400 group-hover:text-white group-hover:border-transparent group-hover:bg-gradient-to-r group-hover:${customStyles.gradient}`}
                        >
                          <ArrowRight
                            size={11}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                            className="group-hover:translate-x-0.5 transition-transform duration-300"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          </div>

<<<<<<< HEAD
          {/* Right Column: Displaying HD Image Mockup */}
          <div className="lg:col-span-7 flex items-center justify-center lg:justify-end order-1 lg:order-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 25 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.3 }}
              className="relative group p-1 w-full max-w-[500px] lg:max-w-[580px]"
            >
              {/* Glowing Aura */}
              <div className="absolute inset-0 bg-gradient-to-tr from-sky-400 via-indigo-400 to-pink-500 rounded-[2.2rem] blur-[30px] opacity-25 group-hover:opacity-40 transition-all duration-700" />
              
              {/* 3D Glassmorphic Frame */}
              <div className="relative rounded-[2rem] p-3 sm:p-4 bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.06)] transition-all duration-500 group-hover:shadow-[0_25px_60px_rgba(0,0,0,0.1)] group-hover:scale-[1.01]">
                <img
                  src={brainovaBg}
                  alt="SGK Brainova Platform Features"
                  className="w-full h-auto aspect-square rounded-2xl object-cover shadow-[0_4px_15px_rgba(0,0,0,0.02)] border border-slate-100"
                  loading="eager"
                />

                {/* Floating "HD" Badge */}
                <div className="absolute top-6 right-6 px-3 py-1 rounded-full bg-slate-900/95 text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                  Live Preview
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </main>

      <div className="relative z-10">
        <div id="about">
          <AboutPage />
        </div>
        <div id="contact">
=======
          {/* Right Column: Displaying HD Image Mockup with 3D Parallax Tilt (Shows SECOND on mobile) */}
          <div className="lg:col-span-7 flex items-center justify-center lg:justify-end order-2 lg:order-2 [perspective:1200px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 20,
                delay: 0.3,
              }}
              whileHover={{
                rotateX: 3,
                rotateY: -3,
                rotateZ: 0.5,
                scale: 1.015,
              }}
              className="relative group p-1 w-full max-w-[480px] lg:max-w-[550px] transition-transform duration-500 ease-out"
            >
              {/* Glowing Aura behind frame */}
              <div className="absolute inset-0 bg-gradient-to-tr from-sky-400 via-indigo-400 to-pink-500 rounded-[2.3rem] blur-[35px] opacity-20 group-hover:opacity-35 transition-all duration-750 pointer-events-none" />

              {/* 3D Glassmorphic Frame */}
              <div className="relative rounded-[2.2rem] p-3.5 sm:p-4.5 bg-white/75 backdrop-blur-xl border border-white/70 shadow-[0_25px_60px_rgba(0,0,0,0.04)] transition-all duration-500 group-hover:shadow-[0_30px_70px_rgba(0,0,0,0.08)]">
                {/* Diagonal Glass Sweep Reflection */}
                <div className="absolute inset-0 rounded-[2.2rem] overflow-hidden pointer-events-none z-10">
                  <div className="absolute inset-0 w-[200%] h-[200%] bg-gradient-to-tr from-transparent via-white/12 to-transparent -translate-x-[100%] -translate-y-[100%] group-hover:translate-x-full group-hover:translate-y-full transition-transform duration-[1400ms] ease-out" />
                </div>

                <img
                  src={brainovaBg}
                  alt="SGK Brainova Platform Features"
                  className="w-full h-auto aspect-square rounded-2.5xl object-cover shadow-[0_4px_20px_rgba(0,0,0,0.01)] border border-slate-100/70"
                  loading="eager"
                />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer z-25"
          onClick={() =>
            document
              .getElementById("about")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        >
          <span className="text-[8.5px] font-black uppercase tracking-[0.25em] text-slate-400">
            Scroll to Explore
          </span>
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="size-4 text-indigo-500" />
          </motion.div>
        </div>
      </main>

      {/* Sub-sections */}
      <div className="relative z-10">
        <div id="about" className="scroll-mt-16">
          <AboutPage />
        </div>
        <div id="contact" className="scroll-mt-16">
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
          <ContactPage />
        </div>
        <Footer />
      </div>
    </div>
  );
}
