import { useState, useEffect, useRef } from "react";
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
  Users,
  Star,
  Rocket,
  Zap,
  Target,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { DICTIONARY } from "@/lib/translations";

import { AboutPage } from "@/components/home/AboutSection";
import { ContactPage } from "@/components/home/ContactSection";
import { Footer } from "@/components/Footer";

import brainovaBg from "@/assets/brainova-bg.jpg";
import robotImg from "@/assets/robot-1.png";
import logoImg from "@/assets/logo.jpeg";
import heroVideo from "@/assets/new-hero-banner.mp4";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function CountUp({ target, suffix = "", duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const elementRef = useRef<HTMLSpanElement>(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!hasStarted) return;

    let start = 0;
    const end = target;
    if (start === end) return;

    const totalSteps = 60;
    const stepTime = Math.max(Math.floor(duration / totalSteps), 15);
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / totalSteps;
      // Ease out quad animation
      const currentCount = Math.floor(end * (progress * (2 - progress)));
      
      if (step >= totalSteps) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(currentCount);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [hasStarted, target, duration]);

  return <span ref={elementRef}>{count}{suffix}</span>;
}

function LandingPage() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const t = DICTIONARY[lang] as any;

  const [heroExpandedIndex, setHeroExpandedIndex] = useState<number | null>(null);
  const [gridExpandedIndex, setGridExpandedIndex] = useState<number | null>(null);

  const landingCards = [
    {
      title: t.c2_title || "Teacher Section",
      desc: t.c2_desc || `👩‍🏫 शिक्षकांसाठी सर्वसमावेशक डिजिटल सुविधा! वेळापत्रक, दैनिक परिपाठ, आकर्षक टेम्पलेट, वार्षिक व मासिक नियोजन, प्रश्नपेढी, टाचणवही, CCE निकाल, HPC Card, मासिक सभा - शाळा स्तरावरील सर्व समित्यांचे मासिक अहवाल व इतिवृत्त निमंत्रण पत्रासह उपलब्ध आणि Mid Day Meal (MDM) यांसारखी शाळेच्या दैनंदिन कामासाठी आवश्यक साधने एकाच ठिकाणी उपलब्ध.\n📊 SQAAF Evaluation द्वारे स्वयंमूल्यांकन व बाह्य मूल्यांकन अहवालासह एकत्रित गुणांकन ताक्त्यासह श्रेणी , तर शिक्षक संचिका व विद्यार्थी संचयिका यामुळे आवश्यक माहिती व्यवस्थित तयार, एडिट आणि प्रिंट करता येते.\n✨ माहिती एकदा भरल्यानंतर अनेक ठिकाणी तिचा उपयोग होऊन वेळ, श्रम आणि कागदपत्रांची पुनरावृत्ती कमी होते.\n🚀 SGK BRAINOVA – शिक्षकांचे काम अधिक सोपे, जलद, स्मार्ट आणि डिजिटल बनवणारे एक विश्वासार्ह व्यासपीठ!`,
      icon: School,
      color: "green",
      softBg: "bg-feature-green/90",
      blobColor: "bg-icon-green/15",
      iconBg: "bg-white",
      iconColor: "text-icon-green",
      btnHover: "group-hover:bg-icon-green group-hover:text-white group-hover:border-transparent",
      actionText: t.c2_action || "Enter Teacher Suite",
      to: "/teacher",
    },
    {
      title: "Digital School Software",
      desc: "Access digital school software portal, student resources, and interactive learning tools.",
      icon: GraduationCap,
      color: "pink",
      softBg: "bg-feature-pink/90",
      blobColor: "bg-icon-pink/15",
      iconBg: "bg-white",
      iconColor: "text-icon-pink",
      btnHover: "group-hover:bg-icon-pink group-hover:text-white group-hover:border-transparent",
      actionText: "Open Digital School",
      to: "/digital-school",
    },
    {
      title: "AI Teacher",
      desc: t.c1_desc || "Access virtual AI mentors, study bots, and real-time coding assistance.",
      icon: Bot,
      color: "blue",
      softBg: "bg-feature-blue/90",
      blobColor: "bg-icon-blue/15",
      iconBg: "bg-white",
      iconColor: "text-icon-blue",
      btnHover: "group-hover:bg-icon-blue group-hover:text-white group-hover:border-transparent",
      actionText: t.c1_action || "Launch AI Suite",
      to: "/ai-tools",
    },
    {
      title: t.c3_title || "Courses",
      desc: t.c3_desc || "Explore courses, syllabus paths, video lectures and masterclass materials.",
      icon: BookOpen,
      color: "purple",
      softBg: "bg-feature-purple/90",
      blobColor: "bg-icon-purple/15",
      iconBg: "bg-white",
      iconColor: "text-icon-purple",
      btnHover: "group-hover:bg-icon-purple group-hover:text-white group-hover:border-transparent",
      actionText: t.c3_action || "Explore Courses",
      to: "/courses",
    },
  ];

  return (
    <div className="min-h-screen font-sans selection:bg-primary/20 selection:text-primary overflow-x-hidden relative text-text dark:text-white bg-background">
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" style={{ background: "var(--hero-gradient)" }}>
        {/* Ambient background glow */}
        <img
          src={brainovaBg}
          alt="Ambient Background Glow"
          className="absolute inset-0 w-full h-full object-cover opacity-10 blur-[80px] scale-105"
          loading="eager"
        />
      </div>

      {/* Hero Video Section with Right-Aligned Vertical Overlay Cards */}
      <div className="relative w-full overflow-hidden z-10 border-b border-border mt-14 xs:mt-16 lg:mt-0 min-h-[460px] xs:min-h-[520px] sm:min-h-[620px] md:min-h-[680px] lg:min-h-[720px] xl:min-h-[760px] flex items-center bg-slate-950">
        <video
          key={heroVideo}
          src={heroVideo}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover object-[70%_center] sm:object-center md:object-[75%_center] lg:object-center pointer-events-none transition-opacity duration-700"
        />

        {/* Gradient Overlay for crystal clear video visibility on right and text contrast on left */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/55 to-black/20 sm:from-black/80 sm:via-black/40 sm:to-transparent pointer-events-none z-10" />

        {/* Subtle Ambient Radial Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(99,102,241,0.12),transparent_60%)] pointer-events-none z-10" />

        {/* Floating Cards Container on Left Side */}
        <div className="relative z-20 w-full px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 pt-3 xs:pt-4 sm:pt-28 md:pt-32 pb-4 sm:pb-8 flex flex-col sm:flex-row justify-start min-h-[460px] xs:min-h-[520px] sm:min-h-[620px] md:min-h-[680px] lg:min-h-[720px]">
          
          {/* MOBILE VIEW: Fully Legible Vertical Stack on Upper Left (No Cutoffs) */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0, x: -20 },
              show: {
                opacity: 1,
                x: 0,
                transition: { staggerChildren: 0.08, delayChildren: 0.2 },
              },
            }}
            className="flex flex-col gap-5 xs:gap-6 w-[215px] xs:w-[240px] max-w-[65%] mt-2 xs:mt-3 mb-auto sm:hidden"
          >
            {landingCards.map((card, index) => {
              const Icon = card.icon;

              const styleMap: Record<string, { gradient: string; iconBg: string; textAccent: string }> = {
                blue: { gradient: "from-icon-blue to-[#4d7eff]", iconBg: "bg-blue-500/25 border-blue-400/40 text-blue-300", textAccent: "text-blue-300" },
                pink: { gradient: "from-icon-pink to-[#ff5b9b]", iconBg: "bg-pink-500/25 border-pink-400/40 text-pink-300", textAccent: "text-pink-300" },
                purple: { gradient: "from-icon-purple to-primary", iconBg: "bg-purple-500/25 border-purple-400/40 text-purple-300", textAccent: "text-purple-300" },
                green: { gradient: "from-icon-green to-[#2dbb71]", iconBg: "bg-emerald-500/25 border-emerald-400/40 text-emerald-300", textAccent: "text-emerald-300" },
              };
              const customStyles = styleMap[card.color] || styleMap.blue;

              return (
                <motion.div
                  key={index}
                  variants={{
                    hidden: { opacity: 0, x: -15 },
                    show: { opacity: 1, x: 0 },
                  }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    if ((card as any).externalUrl) {
                      window.location.href = (card as any).externalUrl;
                    } else if (card.to && card.to !== "#") {
                      navigate({ to: card.to as any, search: (card as any).search });
                    }
                  }}
                  className="relative group p-2 xs:p-2.5 rounded-2xl border border-white/25 bg-slate-950/85 backdrop-blur-xl shadow-xl active:bg-slate-900 flex items-center justify-between gap-2 overflow-hidden cursor-pointer"
                >
                  {/* Subtle Glow Accent */}
                  <div className={`absolute -inset-px rounded-2xl bg-gradient-to-r ${customStyles.gradient} opacity-25 blur-xs pointer-events-none`} />

                  <div className="relative z-10 flex items-center gap-2 xs:gap-2.5 min-w-0 flex-1">
                    <div className={`size-8 rounded-xl ${customStyles.iconBg} backdrop-blur-md flex items-center justify-center border shadow-xs text-white shrink-0`}>
                      <Icon className="size-4 text-white" strokeWidth={2.2} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-[11.5px] xs:text-xs font-black text-white tracking-tight leading-snug whitespace-normal break-words">
                        {card.title}
                      </h3>
                      <span className={`text-[8.5px] xs:text-[9px] font-black uppercase tracking-wider ${customStyles.textAccent} block whitespace-normal leading-tight mt-0.5`}>
                        {card.actionText}
                      </span>
                    </div>
                  </div>

                  <div className="relative z-10 size-6 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shrink-0">
                    <ArrowRight className="size-3" />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* DESKTOP VIEW (sm: and above): Full Vertical Glass Cards Stack */}
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
            className="hidden sm:flex flex-col gap-1.5 xs:gap-2 sm:gap-3 w-full sm:w-[290px] md:w-[320px] lg:w-[340px]"
          >
            {landingCards.map((card, index) => {
              const Icon = card.icon;
              const isHeroExpanded = heroExpandedIndex === index;

              const styleMap: Record<string, { gradient: string; glowBg: string; glowBorder: string }> = {
                blue: {
                  gradient: "from-icon-blue to-[#4d7eff]",
                  glowBg: "hover:shadow-[0_15px_35px_rgba(91,140,255,0.25)]",
                  glowBorder: "hover:border-icon-blue/80",
                },
                pink: {
                  gradient: "from-icon-pink to-[#ff5b9b]",
                  glowBg: "hover:shadow-[0_15px_35px_rgba(255,109,170,0.25)]",
                  glowBorder: "hover:border-icon-pink/80",
                },
                purple: {
                  gradient: "from-icon-purple to-primary",
                  glowBg: "hover:shadow-[0_15px_35px_rgba(122,90,248,0.25)]",
                  glowBorder: "hover:border-icon-purple/80",
                },
                green: {
                  gradient: "from-icon-green to-[#2dbb71]",
                  glowBg: "hover:shadow-[0_15px_35px_rgba(57,201,122,0.25)]",
                  glowBorder: "hover:border-icon-green/80",
                },
              };
              const customStyles = styleMap[card.color] || styleMap.blue;

              return (
                <motion.div
                  key={index}
                  variants={{
                    hidden: { opacity: 0, x: -40, scale: 0.95 },
                    show: {
                      opacity: 1,
                      x: 0,
                      scale: 1,
                      transition: { type: "spring", stiffness: 300, damping: 22 },
                    },
                  }}
                  whileHover={{
                    scale: 1.02,
                    x: 4,
                    transition: { type: "spring", stiffness: 400, damping: 15 },
                  }}
                  className={`relative text-left group transition-all duration-300 flex flex-col justify-between rounded-xl border border-white/25 bg-black/55 dark:bg-black/65 backdrop-blur-md shadow-xl hover:bg-black/75 hover:border-white/40 overflow-hidden ${customStyles.glowBg}`}
                >
                  {/* Diagonal Gloss Shine Overlay */}
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out z-10 pointer-events-none" />

                  {/* Neon Glow on Hover */}
                  <div className={`absolute -inset-px rounded-xl bg-gradient-to-r ${customStyles.gradient} opacity-0 group-hover:opacity-25 transition-opacity duration-500 blur z-0`} />

                  {/* Content */}
                  <div
                    onClick={() => {
                      if ((card as any).externalUrl) {
                        window.location.href = (card as any).externalUrl;
                      } else if (card.to && card.to !== "#") {
                        navigate({ to: card.to as any, search: (card as any).search });
                      }
                    }}
                    className="relative z-20 p-2.5 xs:p-3 sm:p-3.5 flex flex-col w-full gap-2 cursor-pointer"
                  >
                    {/* Top Header: Icon & Title */}
                    <div className="flex items-center gap-2 sm:gap-2.5">
                      {/* Transparent Soft Icon Container */}
                      <div
                        className={`size-7 sm:size-8 shrink-0 rounded-lg bg-white/15 backdrop-blur-md text-white flex items-center justify-center shadow-sm border border-white/30 transition-all duration-500 group-hover:bg-white group-hover:text-slate-950 group-hover:shadow-md group-hover:scale-105`}
                      >
                        <Icon className="size-3.5 sm:size-4 transition-transform duration-500" strokeWidth={2.2} />
                      </div>

                      <h3 className="text-sm sm:text-base font-black text-white tracking-tight leading-snug break-words flex-1">
                        {card.title}
                      </h3>
                    </div>

                    {/* Entering Action Button shifted to UPSIDE */}
                    <div className="py-1.5 px-2.5 rounded-lg bg-white/15 group-hover:bg-white/25 border border-white/25 flex items-center justify-between gap-1.5 transition-all duration-300 group-hover:border-white/40 shadow-xs">
                      <span className="text-[9px] xs:text-[10px] sm:text-[10.5px] font-black uppercase tracking-[0.1em] text-white">
                        {card.actionText}
                      </span>
                      <div className="size-5 sm:size-6 shrink-0 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center transition-all duration-300 group-hover:scale-105 shadow-sm text-white group-hover:bg-white group-hover:text-slate-950">
                        <ArrowRight className="size-2.5 sm:size-3 group-hover:translate-x-0.5 transition-transform duration-300" />
                      </div>
                    </div>

                    {/* Information / Description shown DOWN under the button */}
                    <div className="pt-0.5 border-t border-white/15">
                      <p className={`text-white/85 text-[10px] xs:text-[11px] sm:text-xs font-medium leading-normal sm:leading-relaxed tracking-wide group-hover:text-white transition-all duration-300 whitespace-pre-line mt-1 ${isHeroExpanded ? "line-clamp-none text-amber-100" : "line-clamp-2 sm:line-clamp-2 group-hover:line-clamp-none"}`}>
                        {card.desc}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* Main Container */}
      <main className="relative z-10 pb-16 md:pb-24 px-3 xs:px-4 md:px-8 max-w-[1380px] mx-auto">
        {/* Feature Cards Grid (4 Columns) - Positioned below the Hero section */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.12, delayChildren: 0.4 },
            },
          }}
          className="mt-8 sm:mt-16 md:mt-24 grid grid-cols-2 lg:grid-cols-4 gap-2.5 xs:gap-3.5 sm:gap-6 lg:gap-8 w-full"
        >
          {landingCards.map((card, index) => {
            const Icon = card.icon;
            const isGridExpanded = gridExpandedIndex === index;

            const styleMap: Record<string, { gradient: string; glowBg: string; glowBorder: string }> = {
              blue: {
                gradient: "from-icon-blue to-[#4d7eff]",
                glowBg: "hover:shadow-[0_20px_45px_rgba(91,140,255,0.15)]",
                glowBorder: "hover:border-icon-blue/80",
              },
              pink: {
                gradient: "from-icon-pink to-[#ff5b9b]",
                glowBg: "hover:shadow-[0_20px_45px_rgba(255,109,170,0.15)]",
                glowBorder: "hover:border-icon-pink/80",
              },
              purple: {
                gradient: "from-icon-purple to-primary",
                glowBg: "hover:shadow-[0_20px_45px_rgba(122,90,248,0.15)]",
                glowBorder: "hover:border-icon-purple/80",
              },
              green: {
                gradient: "from-icon-green to-[#2dbb71]",
                glowBg: "hover:shadow-[0_20px_45px_rgba(57,201,122,0.15)]",
                glowBorder: "hover:border-icon-green/80",
              },
            };
            const customStyles = styleMap[card.color] || styleMap.blue;

            return (
              <motion.div
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
                  y: -6,
                  scale: 1.02,
                  transition: { type: "spring", stiffness: 400, damping: 18 },
                }}
                className={`relative text-left group transition-all duration-500 flex flex-col justify-between h-full min-h-[160px] sm:min-h-[220px] rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md sm:shadow-xl hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden ${customStyles.glowBg} ${customStyles.glowBorder}`}
              >
                {/* Moving Shimmer / Gloss Light Beam across card */}
                <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-transparent via-white/40 dark:via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out z-10 pointer-events-none" />

                {/* Glowing Neon Outline Border Effect */}
                <div className={`absolute -inset-px rounded-2xl sm:rounded-3xl bg-gradient-to-r ${customStyles.gradient} opacity-0 group-hover:opacity-40 transition-opacity duration-500 blur-sm z-0`} />

                {/* Soft Background Fill on Hover */}
                <div className={`absolute inset-0 ${card.softBg} opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0`} />

                {/* Content */}
                <div
                  onClick={() => {
                    if ((card as any).externalUrl) {
                      window.location.href = (card as any).externalUrl;
                    } else if (card.to && card.to !== "#") {
                      navigate({ to: card.to as any, search: (card as any).search });
                    }
                  }}
                  className="relative z-20 p-2.5 xs:p-3 sm:p-6 md:p-7 flex flex-col gap-2 xs:gap-2.5 sm:gap-4 h-full w-full cursor-pointer"
                >
                  {/* 1. Top Header: Option 1 Stacked on Mobile (Icon + Badge on row 1, Full Width Title on row 2), Inline on Desktop */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2.5">
                    {/* Top row: Icon & (on mobile: Badge, on desktop: Title) */}
                    <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 min-w-0 w-full sm:w-auto">
                      <div
                        className={`size-7 xs:size-8 sm:size-12 rounded-xl sm:rounded-2xl ${card.softBg} ${card.iconColor} flex items-center justify-center shadow-xs sm:shadow-md border border-white/50 transition-all duration-500 group-hover:bg-white group-hover:shadow-lg group-hover:scale-110 shrink-0`}
                      >
                        <Icon className="size-3.5 xs:size-4 sm:size-5.5 transition-transform duration-500" strokeWidth={2.2} />
                      </div>

                      {/* Desktop Title (Inline beside icon) */}
                      <h3 className="hidden sm:block text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-snug group-hover:text-slate-950 dark:group-hover:text-white break-words">
                        {card.title}
                      </h3>

                      {/* Mobile Badge (Aligned to top right on row 1) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setGridExpandedIndex(isGridExpanded ? null : index);
                        }}
                        className="sm:hidden text-[8px] xs:text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 hover:bg-amber-100 dark:hover:bg-amber-900 px-1.5 xs:px-2 py-0.5 rounded-full border border-amber-200/80 dark:border-amber-800 flex items-center gap-0.5 xs:gap-1 transition-all shrink-0"
                      >
                        <span>{isGridExpanded ? "कमी करा" : "सविस्तर माहिती"}</span>
                        <ChevronDown className={`size-2.5 transition-transform ${isGridExpanded ? "rotate-180" : ""}`} />
                      </button>
                    </div>

                    {/* Mobile Title (Full width on row 2 without being squeezed by badge) */}
                    <h3 className="sm:hidden text-[12px] xs:text-[13px] font-black text-slate-900 dark:text-white tracking-tight leading-tight group-hover:text-slate-950 dark:group-hover:text-white break-normal">
                      {card.title}
                    </h3>

                    {/* Desktop Badge (Aligned to right) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setGridExpandedIndex(isGridExpanded ? null : index);
                      }}
                      className="hidden sm:flex text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 hover:bg-amber-100 dark:hover:bg-amber-900 px-2.5 py-1 rounded-full border border-amber-200/80 dark:border-amber-800 items-center gap-1 transition-all shrink-0 self-center"
                    >
                      <span>{isGridExpanded ? "कमी करा" : "सविस्तर माहिती"}</span>
                      <ChevronDown className={`size-3 transition-transform ${isGridExpanded ? "rotate-180" : ""}`} />
                    </button>
                  </div>

                  {/* 2. Entering Action Button shifted to UPSIDE (Below Title/Icon) */}
                  <div className="py-1.5 px-2 xs:py-1.5 xs:px-2.5 sm:py-3 sm:px-4 rounded-lg xs:rounded-xl sm:rounded-2xl bg-slate-900 dark:bg-slate-800 group-hover:bg-slate-950 dark:group-hover:bg-slate-700 text-white border border-slate-800 dark:border-slate-700 flex items-center justify-between gap-1 xs:gap-2 transition-all duration-300 shadow-xs sm:shadow-sm">
                    <span className="text-[7.5px] xs:text-[8.5px] sm:text-[12px] font-black uppercase tracking-[0.06em] sm:tracking-[0.12em] text-white truncate">
                      {card.actionText}
                    </span>
                    <div className="size-4 xs:size-4.5 sm:size-7 shrink-0 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-xs sm:shadow-sm text-white group-hover:bg-white group-hover:text-slate-900">
                      <ArrowRight className="size-2 xs:size-2.5 sm:size-3.5 group-hover:translate-x-0.5 transition-transform duration-300" strokeWidth={2.5} />
                    </div>
                  </div>

                  {/* 3. Information / Description shown DOWN under the button */}
                  <div className="pt-1 sm:pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex-1 flex flex-col justify-start">
                    <p className={`text-slate-700 dark:text-slate-300 text-[8.5px] xs:text-[9.5px] sm:text-[13px] font-medium leading-relaxed tracking-wide group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-all duration-500 whitespace-pre-line ${isGridExpanded ? "line-clamp-none text-slate-950 dark:text-white font-semibold" : "line-clamp-2 group-hover:line-clamp-none"}`}>
                      {card.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </main>

      {/* Pages sections & Footer */}
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
