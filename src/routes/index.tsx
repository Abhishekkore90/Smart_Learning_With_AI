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

  const landingCards = [
    {
      title: "Teacher AI",
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
      title: "Digital School",
      desc: "Access digital school portal, student resources, and interactive learning tools.",
      icon: GraduationCap,
      color: "pink",
      softBg: "bg-feature-pink/90",
      blobColor: "bg-icon-pink/15",
      iconBg: "bg-white",
      iconColor: "text-icon-pink",
      btnHover: "group-hover:bg-icon-pink group-hover:text-white group-hover:border-transparent",
      actionText: "Open Digital School",
      to: "#",
    },
    {
      title: t.c2_title || "Teacher Section",
      desc: t.c2_desc || "Manage homework, review submissions and track class telemetry.",
      icon: School,
      color: "green",
      softBg: "bg-feature-green/90",
      blobColor: "bg-icon-green/15",
      iconBg: "bg-white",
      iconColor: "text-icon-green",
      btnHover: "group-hover:bg-icon-green group-hover:text-white group-hover:border-transparent",
      actionText: t.c2_action || "Enter Teacher Suite",
      to: "/login",
      search: { role: "teacher" },
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
      <div className="relative w-full overflow-hidden z-10 border-b border-border mt-[50px] md:mt-0 min-h-[480px] md:min-h-[620px] lg:min-h-[700px] flex items-center bg-slate-950">
        <video
          key={heroVideo}
          src={heroVideo}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Gradient Overlay for high left-side contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-black/20 pointer-events-none z-10" />

        {/* Floating Vertical Cards Container on Left Side (Flush to Left Edge) */}
        <div className="relative z-20 w-full pl-3 sm:pl-5 md:pl-7 lg:pl-10 pr-4 pt-20 md:pt-28 lg:pt-32 pb-8 flex justify-start">
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
            className="flex flex-col gap-2.5 sm:gap-3 w-full sm:w-[290px] md:w-[320px] lg:w-[340px]"
          >
            {landingCards.map((card, index) => {
              const Icon = card.icon;

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
                  onClick={() => {
                    if (card.to && card.to !== "#") {
                      navigate({ to: card.to as any, search: (card as any).search });
                    }
                  }}
                  className={`relative text-left group transition-all duration-300 flex flex-col justify-between rounded-xl border border-white/20 bg-black/35 dark:bg-black/45 backdrop-blur-md shadow-xl hover:bg-black/55 hover:border-white/40 overflow-hidden cursor-pointer ${customStyles.glowBg}`}
                >
                  {/* Diagonal Gloss Shine Overlay */}
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out z-10 pointer-events-none" />

                  {/* Neon Glow on Hover */}
                  <div className={`absolute -inset-px rounded-xl bg-gradient-to-r ${customStyles.gradient} opacity-0 group-hover:opacity-25 transition-opacity duration-500 blur z-0`} />

                  {/* Content */}
                  <div className="relative z-20 p-3 sm:p-3.5 flex flex-col justify-between w-full">
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      {/* Transparent Soft Icon Container */}
                      <div
                        className={`size-8 sm:size-9 shrink-0 rounded-lg bg-white/15 backdrop-blur-md text-white flex items-center justify-center shadow-sm border border-white/30 transition-all duration-500 group-hover:bg-white group-hover:text-slate-950 group-hover:shadow-md group-hover:scale-105`}
                      >
                        <Icon size={16} className="transition-transform duration-500" strokeWidth={2} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-black text-white tracking-tight transition-colors duration-300">
                          {card.title}
                        </h3>
                        <p className="text-white/80 text-[11px] sm:text-xs font-medium leading-snug tracking-wide group-hover:text-white transition-colors duration-300 line-clamp-2 mt-0.5">
                          {card.desc}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Action Section */}
                    <div className="pt-2 mt-2 flex items-center justify-between gap-2 border-t border-white/20 transition-colors duration-300">
                      <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.12em] text-white/90 group-hover:text-white transition-colors duration-300">
                        {card.actionText}
                      </span>
                      <div className="size-6 sm:size-6.5 shrink-0 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center transition-all duration-500 group-hover:scale-105 shadow-sm text-white group-hover:bg-white group-hover:text-slate-950">
                        <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform duration-300" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* Main Container */}
      <main className="relative z-10 pb-16 md:pb-24 px-4 md:px-8 max-w-[1380px] mx-auto">
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
          className="mt-16 md:mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full"
        >
          {landingCards.map((card, index) => {
            const Icon = card.icon;

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
                  y: -8,
                  scale: 1.01,
                  transition: { type: "spring", stiffness: 400, damping: 15 },
                }}
                onClick={() => {
                  if (card.to && card.to !== "#") {
                    navigate({ to: card.to as any, search: (card as any).search });
                  }
                }}
                className={`relative text-left group transition-all duration-500 flex flex-col justify-between h-full min-h-[210px] rounded-none border border-border bg-white dark:bg-slate-900 shadow-[0_10px_35px_rgba(108,78,246,0.05)] hover:shadow-2xl overflow-hidden cursor-pointer ${customStyles.glowBg} ${customStyles.glowBorder}`}
              >
                {/* Diagonal Gloss Shine Overlay */}
                <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out z-10 pointer-events-none" />

                {/* Neon Glow on Hover */}
                <div className={`absolute -inset-px rounded-none bg-gradient-to-r ${customStyles.gradient} opacity-0 group-hover:opacity-15 transition-opacity duration-500 blur z-0`} />

                {/* Hover Soft Background */}
                <div className={`absolute inset-0 ${card.softBg} opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-0`} />

                {/* Content */}
                <div className="relative z-20 p-6 flex flex-col h-full justify-between w-full">
                  <div>
                    {/* Soft Icon Container */}
                    <div
                      className={`size-11 rounded-2xl ${card.softBg} ${card.iconColor} flex items-center justify-center mb-4 shadow-sm border border-white/40 transition-all duration-500 group-hover:bg-white group-hover:shadow-md group-hover:scale-105`}
                    >
                      <Icon size={22} className="transition-transform duration-500" strokeWidth={2} />
                    </div>

                    <h3 className="text-2xl font-black text-heading dark:text-white tracking-tight mb-2 transition-colors duration-300 group-hover:text-slate-950 dark:group-hover:text-white">
                      {card.title}
                    </h3>
                    <p className="text-text dark:text-slate-300 text-base font-semibold leading-relaxed tracking-wide group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors duration-300 line-clamp-3">
                      {card.desc}
                    </p>
                  </div>

                  {/* Bottom Action Section */}
                  <div className="pt-4 mt-4 flex items-center justify-between gap-2 border-t border-border group-hover:border-border transition-colors duration-300">
                    <span className={`text-[13px] font-black uppercase tracking-[0.15em] text-light-text group-hover:${card.iconColor} transition-colors duration-300`}>
                      {card.actionText}
                    </span>
                    <div className={`size-8 shrink-0 rounded-full bg-slate-50 border border-border flex items-center justify-center transition-all duration-500 group-hover:scale-105 shadow-sm text-light-text ${card.btnHover}`}>
                      <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform duration-300" />
                    </div>
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
