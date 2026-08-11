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
import heroVideo from "@/assets/hero-banner-video-3.mp4";

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
      title: t.c1_title || "Study",
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
      title: t.c4_title || "Practice",
      desc:
        t.c4_desc ||
        "Track progress, attempt mock tests and submit assignments effortlessly.",
      icon: Target,
      color: "pink",
      softBg: "bg-feature-pink/90",
      blobColor: "bg-icon-pink/15",
      iconBg: "bg-white",
      iconColor: "text-icon-pink",
      btnHover: "group-hover:bg-icon-pink group-hover:text-white group-hover:border-transparent",
      actionText: t.c4_action || "Open Scholar Portal",
      to: "/login",
      search: { role: "student" },
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

      {/* Raw Unfiltered Hero Video Section */}
      <div className="relative w-full overflow-hidden z-10 border-b border-border mt-[50px] md:mt-0">
        <video
          src={heroVideo}
          autoPlay
          loop
          muted
          playsInline
          className="w-full block h-auto"
        />
        {/* Invisible Interactive Hotspot Overlays for Video-Burned Buttons */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          {/* Explore Products Hotspot (Redirects to Products Page) */}
          <Link
            to="/products"
            className="absolute pointer-events-auto cursor-pointer hover:bg-white/5 rounded-full transition-all duration-300"
            style={{
              left: "7.8%",
              top: "58%",
              width: "19.8%",
              height: "12%",
            }}
            title="Explore Products"
          />
          {/* Explore Courses Hotspot (Redirects to Courses) */}
          <Link
            to="/courses"
            className="absolute pointer-events-auto cursor-pointer hover:bg-white/5 rounded-full transition-all duration-300"
            style={{
              left: "28.8%",
              top: "58%",
              width: "19.2%",
              height: "12%",
            }}
            title="Explore Courses"
          />
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
          className="mt-20 md:mt-28 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full"
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
                onClick={() => navigate({ to: card.to as any, search: (card as any).search })}
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
