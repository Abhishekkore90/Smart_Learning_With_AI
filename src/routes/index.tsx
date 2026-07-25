
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
            >
              SGK{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-indigo-600 to-pink-500">
                BRAINOVA
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-slate-600 font-bold text-sm sm:text-base md:text-lg leading-relaxed max-w-xl"
            >
              {t.hero_subtitle || "Study with AI, Practice with AI. Empowering students and teachers with smart learning solutions."}
            </motion.p>

            {/* Premium Animated Soft Cards Grid */}
            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: { staggerChildren: 0.12, delayChildren: 0.3 },
                },
              }}
              className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 w-full"
            >
              {landingCards.map((card, index) => {
                const Icon = card.icon;

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
                  },
                };
                const customStyles = styleMap[card.color] || styleMap.sky;

                return (
                  <motion.button
                    key={index}
                    variants={{
                      hidden: { opacity: 0, y: 30, scale: 0.95 },
                      show: {
                        opacity: 1,
                        y: 0,
                        scale: 1,
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
                    <div className="relative z-20 p-4 sm:p-5 flex flex-col h-full justify-between w-full">
                      <div>
                        {/* Soft Icon Container */}
                        <div
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
                          {card.desc}
                        </p>
                      </div>

                      <div className="pt-3 mt-3 flex items-center justify-between gap-2 border-t border-slate-200/50 group-hover:border-slate-300/40 transition-colors duration-300">
                        <span
                          className={`text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:${card.iconColor} transition-colors duration-300`}
                        >
                          {card.actionText}
                        </span>
                        <div
                          className={`size-6 sm:size-7 shrink-0 rounded-full bg-white border border-slate-200 flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-sm text-slate-400 group-hover:text-white group-hover:border-transparent group-hover:bg-gradient-to-r group-hover:${customStyles.gradient}`}
                        >
                          <ArrowRight
                            size={10}
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
          <ContactPage />
        </div>
        <Footer />
      </div>
    </div>
  );
}
