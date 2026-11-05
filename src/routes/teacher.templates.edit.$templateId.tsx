import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Maximize2,
  ChevronUp,
  ChevronDown,
  X,
  Download,
  Share2,
  Save,
  User,
  GraduationCap,
  Type,
  Palette as PaletteIcon,
  Sparkles,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  Crown,
  Rocket,
  Flame,
  Zap,
  Trophy,
  Cake,
  Send,
  MessageCircle,
  Heart,
  Star,
  PartyPopper,
  School,
  BookOpen,
  Compass,
  Flag,
  Calendar,
  Medal,
  Theater,
  Mic2,
  Music,
  Palette,
  Award,
  FileText,
} from "lucide-react";
import { useState, useRef, useMemo, useEffect } from "react";
import { flushSync } from "react-dom";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { showToast as toast } from "@/lib/custom-toast";
import { useLanguage } from "@/hooks/use-language";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { toPng } from "html-to-image";
import {
  CornerOrnaments,
  CelebrationBalloonsLeft,
  CelebrationBalloonsRight,
  FestiveBirthdayCake,
  GoldenLaurelWreath,
  FloatingSparkles,
  CardBackgroundThemeLayer,
  RealisticPaperclipSVG,
  CelebrationGiftBoxSVG,
  OverheadSpotlightBeam,
  GoldenMedalEmblemSVG,
} from "@/components/teacher/CreativeCardDecorations";



export const Route = createFileRoute("/teacher/templates/edit/$templateId")({
  component: TemplateEditorPage,
});



const TEMPLATE_CONFIGS: Record<string, any> = {
  // Birthday Templates
  "birthday-1": {
    name: "Luxury Gold Royale",
    bg: "linear-gradient(135deg, #1a1a1a 0%, #3d2b1f 100%)",
    accent:
      "linear-gradient(to right, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c)",
    icon: Crown,
    title: "Happy Birthday!",
    quote: "May your day be as royal and golden as your future.",
    particleColor: "rgba(251, 245, 183, 0.4)",
  },
  "birthday-2": {
    name: "Cosmic Nebula",
    bg: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
    accent: "linear-gradient(to right, #818cf8, #c084fc, #e879f9)",
    icon: Rocket,
    title: "Celestial Celebration!",
    quote: "Shooting for the stars on your special day. Keep shining bright!",
    particleColor: "rgba(192, 132, 252, 0.4)",
  },
  "birthday-3": {
    name: "Emerald Gardenia",
    bg: "linear-gradient(135deg, #064e3b 0%, #022c22 100%)",
    accent: "linear-gradient(to right, #34d399, #6ee7b7, #10b981)",
    icon: Sparkles,
    title: "Birthday Blossoms",
    quote: "Wishing you a day filled with natural joy and infinite growth.",
    particleColor: "rgba(110, 231, 183, 0.4)",
  },
  "birthday-4": {
    name: "Sunset Ember",
    bg: "linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)",
    accent: "linear-gradient(to right, #f87171, #fb923c, #facc15)",
    icon: Flame,
    title: "Birthday Blaze!",
    quote:
      "Ignite your potential. Today is the spark for your greatest year yet.",
    particleColor: "rgba(251, 146, 60, 0.4)",
  },
  "birthday-5": {
    name: "Electric Azure",
    bg: "linear-gradient(135deg, #0c4a6e 0%, #082f49 100%)",
    accent: "linear-gradient(to right, #38bdf8, #818cf8, #2dd4bf)",
    icon: Zap,
    title: "Shockingly Awesome!",
    quote: "May your energy electrify the world. Have a powerful birthday!",
    particleColor: "rgba(56, 189, 248, 0.4)",
  },
  "birthday-6": {
    name: "Midnight Diamond",
    bg: "linear-gradient(135deg, #09090b 0%, #18181b 100%)",
    accent: "linear-gradient(to right, #94a3b8, #f8fafc, #64748b)",
    icon: Trophy,
    title: "Rare & Brilliant",
    quote: "You are a true gem. May your brilliance illuminate every path.",
    particleColor: "rgba(248, 250, 252, 0.4)",
  },



  // --- Student of the Month 3D Templates (10 Cards) ---
  "studentofmonth-1": {
    name: "Royale Stage Spotlight",
    bg: "linear-gradient(135deg, #18181b 0%, #27272a 50%, #3f3f46 100%)",
    accent: "linear-gradient(to right, #bf953f, #fcf6ba, #b38728, #fbf5b7)",
    icon: Crown,
    title: "STUDENT OF THE MONTH",
    quote: "Royale Stage Spotlight • Inspiring excellence, character, and scholastic diligence.",
    particleColor: "rgba(251, 191, 36, 0.4)",
  },
  "studentofmonth-2": {
    name: "Red Carpet Grand Gala",
    bg: "linear-gradient(135deg, #450a0a 0%, #7f1d1d 50%, #991b1b 100%)",
    accent: "linear-gradient(to right, #fbbf24, #f59e0b, #d97706)",
    icon: Trophy,
    title: "STAR SCHOLAR OF THE MONTH",
    quote: "Red Carpet Grand Gala • Recognized for premier academic and leadership triumphs.",
    particleColor: "rgba(248, 113, 113, 0.4)",
  },
  "studentofmonth-3": {
    name: "Classical Library Hall of Fame",
    bg: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)",
    accent: "linear-gradient(to right, #38bdf8, #818cf8, #c084fc)",
    icon: Award,
    title: "HALL OF FAME SCHOLAR",
    quote: "Classical Library Hall of Fame • Diligence in studies, reading, and exemplary conduct.",
    particleColor: "rgba(129, 140, 248, 0.4)",
  },
  "studentofmonth-4": {
    name: "Crown & Trophy Studio 3D",
    bg: "linear-gradient(135deg, #1c1917 0%, #44403c 50%, #292524 100%)",
    accent: "linear-gradient(to right, #facc15, #f59e0b, #d97706)",
    icon: Crown,
    title: "TOP ACHIEVER OF THE MONTH",
    quote: "Crown & Trophy Studio • Setting the benchmark for dedication and discipline.",
    particleColor: "rgba(250, 204, 21, 0.4)",
  },
  "studentofmonth-5": {
    name: "Midnight Sapphire Gala",
    bg: "linear-gradient(135deg, #030712 0%, #172554 50%, #1e3a8a 100%)",
    accent: "linear-gradient(to right, #60a5fa, #93c5fd, #38bdf8)",
    icon: Star,
    title: "SAPPHIRE STAR STUDENT",
    quote: "Midnight Sapphire Gala • Brilliant intellect, creative thought, and golden character.",
    particleColor: "rgba(96, 165, 250, 0.4)",
  },
  "studentofmonth-6": {
    name: "Imperial Purple Sovereign",
    bg: "linear-gradient(135deg, #2e1065 0%, #4c1d95 50%, #3b0764 100%)",
    accent: "linear-gradient(to right, #c084fc, #e879f9, #f472b6)",
    icon: Medal,
    title: "IMPERIAL SCHOLAR AWARD",
    quote: "Imperial Purple Sovereign • Radiating leadership, kindness, and scholastic grace.",
    particleColor: "rgba(192, 132, 252, 0.4)",
  },
  "studentofmonth-7": {
    name: "Emerald Prestige Honor",
    bg: "linear-gradient(135deg, #022c22 0%, #064e3b 50%, #065f46 100%)",
    accent: "linear-gradient(to right, #34d399, #6ee7b7, #a7f3d0)",
    icon: Sparkles,
    title: "EMERALD MERIT SCHOLAR",
    quote: "Emerald Prestige Honor • Deep curiosity, active participation, and scholastic zest.",
    particleColor: "rgba(52, 211, 153, 0.4)",
  },
  "studentofmonth-8": {
    name: "Ruby Crimson Champion",
    bg: "linear-gradient(135deg, #450a0a 0%, #881337 50%, #9f1239 100%)",
    accent: "linear-gradient(to right, #fb7185, #fda4af, #f43f5e)",
    icon: Trophy,
    title: "CRIMSON STAR OF EXCELLENCE",
    quote: "Ruby Crimson Champion • Tireless commitment to learning and classroom leadership.",
    particleColor: "rgba(251, 113, 133, 0.4)",
  },
  "studentofmonth-9": {
    name: "Golden Jubilee Sovereign",
    bg: "linear-gradient(135deg, #292524 0%, #44403c 50%, #78350f 100%)",
    accent: "linear-gradient(to right, #fde047, #facc15, #eab308)",
    icon: Crown,
    title: "GOLDEN JUBILEE SCHOLAR",
    quote: "Golden Jubilee Sovereign • A month of shining milestones and academic triumph.",
    particleColor: "rgba(250, 204, 21, 0.4)",
  },
  "studentofmonth-10": {
    name: "Cyber Star AI Luminary",
    bg: "linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e293b 100%)",
    accent: "linear-gradient(to right, #38bdf8, #22d3ee, #818cf8)",
    icon: Rocket,
    title: "NEO-SCHOLAR LUMINARY",
    quote: "Cyber Star AI Luminary • Innovating with intellect and shining in modern knowledge.",
    particleColor: "rgba(56, 189, 248, 0.4)",
  },



  // --- Student ID Card 3D Templates (10 Cards) ---
  "idcard-1": {
    name: "Royale Burgundy & Gold",
    bg: "linear-gradient(135deg, #450a0a 0%, #2e0808 100%)",
    accent: "linear-gradient(to right, #bf953f, #fcf6ba, #b38728)",
    icon: School,
    title: "STUDENT IDENTITY CARD",
    quote: "Academic Session 2026-27 • Valid for School Campus, Lab & Library",
    particleColor: "rgba(251, 245, 183, 0.4)",
  },
  "idcard-2": {
    name: "Navy Sapphire Executive",
    bg: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
    accent: "linear-gradient(to right, #38bdf8, #818cf8, #c084fc)",
    icon: School,
    title: "STUDENT IDENTITY PASS",
    quote: "Smart Learning Academy • Official Student Identification Credential",
    particleColor: "rgba(56, 189, 248, 0.4)",
  },
  "idcard-3": {
    name: "Emerald Prestige Scholar",
    bg: "linear-gradient(135deg, #064e3b 0%, #022c22 100%)",
    accent: "linear-gradient(to right, #34d399, #6ee7b7, #10b981)",
    icon: School,
    title: "CAMPUS IDENTITY PASS",
    quote: "Student Identity & Campus Access Pass • Valid through 2026-27",
    particleColor: "rgba(110, 231, 183, 0.4)",
  },
  "idcard-4": {
    name: "Imperial Purple Sovereign",
    bg: "linear-gradient(135deg, #3b0764 0%, #1e1035 100%)",
    accent: "linear-gradient(to right, #c084fc, #e879f9, #f472b6)",
    icon: School,
    title: "STUDENT IDENTITY CARD",
    quote: "Academic Identity Pass • Smart Learning Academy",
    particleColor: "rgba(192, 132, 252, 0.4)",
  },
  "idcard-5": {
    name: "Cyber Tech RFID",
    bg: "linear-gradient(135deg, #020617 0%, #0f172a 100%)",
    accent: "linear-gradient(to right, #22d3ee, #0284c7, #38bdf8)",
    icon: School,
    title: "DIGITAL STUDENT BADGE",
    quote: "Smart RFID Verified Student Pass • Academic Year 2026-27",
    particleColor: "rgba(34, 211, 238, 0.4)",
  },
  "idcard-6": {
    name: "Crimson Academy Gold",
    bg: "linear-gradient(135deg, #581c87 0%, #2e1065 100%)",
    accent: "linear-gradient(to right, #facc15, #f59e0b, #d97706)",
    icon: School,
    title: "SCHOLASTIC ID CARD",
    quote: "Official Identity & Library Membership • Session 2026-27",
    particleColor: "rgba(250, 204, 21, 0.4)",
  },
  "idcard-7": {
    name: "Slate Minimalist Pass",
    bg: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    accent: "linear-gradient(to right, #94a3b8, #cbd5e1, #e2e8f0)",
    icon: School,
    title: "STUDENT PASS",
    quote: "Smart Campus Access Credential • Session 2026-27",
    particleColor: "rgba(203, 213, 225, 0.4)",
  },
  "idcard-8": {
    name: "Amber Sunrise Campus",
    bg: "linear-gradient(135deg, #78350f 0%, #451a03 100%)",
    accent: "linear-gradient(to right, #fbbf24, #f59e0b, #d97706)",
    icon: School,
    title: "STUDENT IDENTITY CARD",
    quote: "Campus Scholar Card • Smart Learning Academy",
    particleColor: "rgba(251, 191, 36, 0.4)",
  },
  "idcard-9": {
    name: "Classic Ivy League",
    bg: "linear-gradient(135deg, #14532d 0%, #052e16 100%)",
    accent: "linear-gradient(to right, #fde047, #facc15, #eab308)",
    icon: School,
    title: "ACADEMY IDENTITY PASS",
    quote: "Heritage Scholar Identification • Session 2026-27",
    particleColor: "rgba(250, 204, 21, 0.4)",
  },
  "idcard-10": {
    name: "Titanium Black Pass",
    bg: "linear-gradient(135deg, #09090b 0%, #18181b 100%)",
    accent: "linear-gradient(to right, #e4e4e7, #fafafa, #d4d4d8)",
    icon: School,
    title: "STUDENT IDENTITY BADGE",
    quote: "Official High-Security Identification • Smart Learning Academy",
    particleColor: "rgba(244, 244, 245, 0.4)",
  },



  // --- Result & Progress Report 3D Templates (10 Cards) ---
  "result-1": {
    name: "Championship Shield & Scorecard",
    bg: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)",
    accent: "linear-gradient(to right, #bf953f, #fcf6ba, #b38728)",
    icon: Trophy,
    title: "ACADEMIC PROGRESS REPORT",
    quote: "Passed with High Distinction & Scholastic Honors • Session 2026-27",
    particleColor: "rgba(251, 245, 183, 0.4)",
  },
  "result-2": {
    name: "Navy Sovereign Honors",
    bg: "linear-gradient(135deg, #0c4a6e 0%, #082f49 100%)",
    accent: "linear-gradient(to right, #38bdf8, #818cf8, #c084fc)",
    icon: Award,
    title: "ANNUAL PROGRESS CARD",
    quote: "Outstanding Achievement & All-Round Scholastic Excellence",
    particleColor: "rgba(56, 189, 248, 0.4)",
  },
  "result-3": {
    name: "Emerald Distinction Report",
    bg: "linear-gradient(135deg, #064e3b 0%, #022c22 100%)",
    accent: "linear-gradient(to right, #34d399, #6ee7b7, #10b981)",
    icon: Award,
    title: "DISTINCTION SCHOLASTIC REPORT",
    quote: "Demonstrating exemplary academic mastery and commendable discipline.",
    particleColor: "rgba(110, 231, 183, 0.4)",
  },
  "result-4": {
    name: "Ruby Prestige Progress",
    bg: "linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)",
    accent: "linear-gradient(to right, #f87171, #fb923c, #facc15)",
    icon: Trophy,
    title: "MERIT PROGRESS REPORT",
    quote: "Commendable growth, peak determination, and high scholastic standing.",
    particleColor: "rgba(248, 113, 113, 0.4)",
  },
  "result-5": {
    name: "Modern Neo-Scholastic Report",
    bg: "linear-gradient(135deg, #18181b 0%, #27272a 100%)",
    accent: "linear-gradient(to right, #a1a1aa, #e4e4e7, #f4f4f5)",
    icon: Award,
    title: "EVALUATION & PROGRESS DOSSIER",
    quote: "Holistic evaluation with top rankings across all core disciplines.",
    particleColor: "rgba(228, 228, 231, 0.4)",
  },
  "result-6": {
    name: "Golden Crown Valedictorian",
    bg: "linear-gradient(135deg, #292524 0%, #44403c 100%)",
    accent: "linear-gradient(to right, #fde047, #facc15, #eab308)",
    icon: Crown,
    title: "VALEDICTORIAN REPORT",
    quote: "Ranked #1 in Class with Outstanding Academic Distinction.",
    particleColor: "rgba(250, 204, 21, 0.4)",
  },
  "result-7": {
    name: "Cyber Scholar Matrix",
    bg: "linear-gradient(135deg, #020617 0%, #0f172a 100%)",
    accent: "linear-gradient(to right, #22d3ee, #38bdf8, #818cf8)",
    icon: Rocket,
    title: "DIGITAL PERFORMANCE MATRIX",
    quote: "Advanced cognitive skills, STEM mastery, and analytical acumen.",
    particleColor: "rgba(34, 211, 238, 0.4)",
  },
  "result-8": {
    name: "Holistic NEP 360° Report",
    bg: "linear-gradient(135deg, #1e3a8a 0%, #172554 100%)",
    accent: "linear-gradient(to right, #60a5fa, #93c5fd, #bfdbfe)",
    icon: Sparkles,
    title: "HOLISTIC 360° REPORT CARD",
    quote: "NEP Aligned Comprehensive Progress Across Cognitive, Social & Creative Domains.",
    particleColor: "rgba(96, 165, 250, 0.4)",
  },
  "result-9": {
    name: "Minimalist Executive Summary",
    bg: "linear-gradient(135deg, #334155 0%, #1e293b 100%)",
    accent: "linear-gradient(to right, #cbd5e1, #e2e8f0, #f8fafc)",
    icon: Award,
    title: "ACADEMIC SUMMARY CARD",
    quote: "Official Scholastic Standing & Verified Academic Grade Certificate.",
    particleColor: "rgba(203, 213, 225, 0.4)",
  },
  "result-10": {
    name: "Grand Academy Distinction",
    bg: "linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)",
    accent: "linear-gradient(to right, #facc15, #f59e0b, #d97706)",
    icon: Trophy,
    title: "GRAND ACADEMY DISTINCTION",
    quote: "Awarded for highest honor, academic integrity, and diligence.",
    particleColor: "rgba(250, 204, 21, 0.4)",
  },



  // --- Student Profile Dossier 3D Templates (10 Cards) ---
  "profile-1": {
    name: "Holistic 360° Student Dossier",
    bg: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    accent: "linear-gradient(to right, #38bdf8, #818cf8, #c084fc)",
    icon: User,
    title: "STUDENT PROFILE DOSSIER",
    quote: "Comprehensive 360° Academic, Behavioral & Co-Curricular Portfolio",
    particleColor: "rgba(56, 189, 248, 0.4)",
  },
  "profile-2": {
    name: "Royal Navy Scholar Bio",
    bg: "linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)",
    accent: "linear-gradient(to right, #bf953f, #fcf6ba, #b38728)",
    icon: User,
    title: "SCHOLAR BIOGRAPHY & RECORD",
    quote: "Dedicated Learner, Creative Problem Solver, and Active Leader",
    particleColor: "rgba(251, 245, 183, 0.4)",
  },
  "profile-3": {
    name: "Emerald Growth Portfolio",
    bg: "linear-gradient(135deg, #064e3b 0%, #022c22 100%)",
    accent: "linear-gradient(to right, #34d399, #6ee7b7, #10b981)",
    icon: User,
    title: "GROWTH & LEADERSHIP PORTFOLIO",
    quote: "Demonstrating character, curiosity, collaboration, and academic enthusiasm.",
    particleColor: "rgba(110, 231, 183, 0.4)",
  },
  "profile-4": {
    name: "Ruby Leadership Profile",
    bg: "linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)",
    accent: "linear-gradient(to right, #f87171, #fb923c, #facc15)",
    icon: User,
    title: "STUDENT LEADERSHIP DOSSIER",
    quote: "Integrity, initiative, and commendable team leadership in the classroom.",
    particleColor: "rgba(248, 113, 113, 0.4)",
  },
  "profile-5": {
    name: "Modern Creative Portfolio",
    bg: "linear-gradient(135deg, #4c1d95 0%, #2e1065 100%)",
    accent: "linear-gradient(to right, #c084fc, #e879f9, #f472b6)",
    icon: User,
    title: "CREATIVE & SCHOLASTIC DOSSIER",
    quote: "Innovative, expressive, and actively involved in co-curricular excellence.",
    particleColor: "rgba(192, 132, 252, 0.4)",
  },
  "profile-6": {
    name: "Cyber Scholar Identity",
    bg: "linear-gradient(135deg, #020617 0%, #0f172a 100%)",
    accent: "linear-gradient(to right, #22d3ee, #0284c7, #38bdf8)",
    icon: User,
    title: "DIGITAL SCHOLAR DOSSIER",
    quote: "Future-ready student profile with 21st-century technological skills.",
    particleColor: "rgba(34, 211, 238, 0.4)",
  },
  "profile-7": {
    name: "Sunrise Primary Dossier",
    bg: "linear-gradient(135deg, #78350f 0%, #451a03 100%)",
    accent: "linear-gradient(to right, #fbbf24, #f59e0b, #d97706)",
    icon: User,
    title: "PRIMARY SCHOLAR PROFILE",
    quote: "Joyful learner, keen observer, and enthusiastic participant in school life.",
    particleColor: "rgba(251, 191, 36, 0.4)",
  },
  "profile-8": {
    name: "Classic Ivy League Dossier",
    bg: "linear-gradient(135deg, #14532d 0%, #052e16 100%)",
    accent: "linear-gradient(to right, #fde047, #facc15, #eab308)",
    icon: User,
    title: "IVY SCHOLAR BIOGRAPHY",
    quote: "Upholding high academic standards, ethical conduct, and diligence.",
    particleColor: "rgba(250, 204, 21, 0.4)",
  },
  "profile-9": {
    name: "STEM Prodigy Profile",
    bg: "linear-gradient(135deg, #0e7490 0%, #155e75 100%)",
    accent: "linear-gradient(to right, #38bdf8, #22d3ee, #2dd4bf)",
    icon: User,
    title: "STEM SCHOLAR DOSSIER",
    quote: "Passionate about scientific inquiry, mathematics, and technological discovery.",
    particleColor: "rgba(56, 189, 248, 0.4)",
  },
  "profile-10": {
    name: "Valedictorian Comprehensive",
    bg: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)",
    accent: "linear-gradient(to right, #fbbf24, #f59e0b, #d97706)",
    icon: User,
    title: "COMPREHENSIVE SCHOLAR DOSSIER",
    quote: "An all-round exemplary student with high distinction across all metrics.",
    particleColor: "rgba(251, 191, 36, 0.4)",
  },



  // Admission Templates
  "admission-1": {
    name: "Royal Ivy Welcome",
    bg: "linear-gradient(135deg, #064e3b 0%, #1a2e21 100%)",
    accent: "linear-gradient(to right, #bf953f, #fcf6ba, #b38728)",
    icon: School,
    title: "Welcome to School!",
    quote:
      "Congratulations! We are thrilled to welcome you to our school family.",
    particleColor: "rgba(251, 245, 183, 0.3)",
  },
  "admission-2": {
    name: "Future Leaders Glow",
    bg: "linear-gradient(135deg, #4c1d95 0%, #1e1b4b 100%)",
    accent: "linear-gradient(to right, #a78bfa, #818cf8, #6366f1)",
    icon: Crown,
    title: "Welcome Dear Student!",
    quote:
      "Congratulations on your admission! Your bright future begins here with us.",
    particleColor: "rgba(167, 139, 250, 0.3)",
  },
  "admission-3": {
    name: "Academic Spark Hub",
    bg: "linear-gradient(135deg, #78350f 0%, #451a03 100%)",
    accent: "linear-gradient(to right, #fbbf24, #f59e0b, #d97706)",
    icon: BookOpen,
    title: "Congratulations!",
    quote:
      "Welcome to our school. We're excited to help you unlock your full potential.",
    particleColor: "rgba(251, 191, 36, 0.3)",
  },
  "admission-4": {
    name: "Oceanic Merit Shield",
    bg: "linear-gradient(135deg, #164e63 0%, #083344 100%)",
    accent: "linear-gradient(to right, #22d3ee, #0d9488, #2dd4bf)",
    icon: GraduationCap,
    title: "Welcome On Board!",
    quote:
      "Congratulations on joining our academy. Let's sail towards success together.",
    particleColor: "rgba(34, 211, 238, 0.3)",
  },
  "admission-5": {
    name: "Sunset Success Blaze",
    bg: "linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)",
    accent: "linear-gradient(to right, #f87171, #fbbf24, #facc15)",
    icon: Trophy,
    title: "Welcome Achiever!",
    quote:
      "Congratulations! You're now a part of our winning school community.",
    particleColor: "rgba(248, 113, 113, 0.3)",
  },
  "admission-6": {
    name: "Infinite Wisdom Star",
    bg: "linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)",
    accent: "linear-gradient(to right, #818cf8, #c084fc, #e879f9)",
    icon: Compass,
    title: "Welcome to Excellence!",
    quote:
      "Congratulations on your admission. A world of wisdom awaits you here.",
    particleColor: "rgba(129, 140, 248, 0.3)",
  },
  // Sports Templates
  "sports-1": {
    name: "Grand Sports Day Invitation",
    bg: "linear-gradient(135deg, #450a0a 0%, #991b1b 100%)",
    accent: "linear-gradient(to right, #facc15, #fbbf24, #f59e0b)",
    icon: Flag,
    title: "YOU'RE INVITED!",
    quote: "Join us for a day of speed, strength, and school spirit!",
    particleColor: "rgba(250, 204, 21, 0.3)",
  },
  "sports-2": {
    name: "Victory Award Ceremony",
    bg: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
    accent: "linear-gradient(to right, #818cf8, #c084fc, #e879f9)",
    icon: Calendar,
    title: "OFFICIAL INVITATION",
    quote: "Celebrating our athletes' incredible journey and achievements.",
    particleColor: "rgba(129, 140, 248, 0.3)",
  },
  "sports-3": {
    name: "Gold Medal Achievement",
    bg: "linear-gradient(135deg, #1a1a1a 0%, #3d2b1f 100%)",
    accent: "linear-gradient(to right, #bf953f, #fcf6ba, #b38728)",
    icon: Medal,
    title: "CHAMPION!",
    quote: "Hard work pays off. Congratulations on your historic win!",
    particleColor: "rgba(251, 245, 183, 0.3)",
  },
  "sports-4": {
    name: "Athlete of the Year",
    bg: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
    accent: "linear-gradient(to right, #34d399, #6ee7b7, #10b981)",
    icon: Trophy,
    title: "GOLDEN ACHIEVEMENT",
    quote: "You've set the bar high. A true inspiration to the whole school.",
    particleColor: "rgba(52, 211, 153, 0.3)",
  },
  // Annual Function Templates
  "annual-1": {
    name: "Royal Stage Welcome",
    bg: "linear-gradient(135deg, #1a1a1a 0%, #3d2b1f 100%)",
    accent: "linear-gradient(to right, #bf953f, #fcf6ba, #b38728)",
    icon: Theater,
    title: "THE STAGE IS SET!",
    quote: "Step into a night of wonder and celebration. Witness the magic!",
    particleColor: "rgba(251, 245, 183, 0.3)",
  },
  "annual-2": {
    name: "Golden Legacy Awards",
    bg: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
    accent: "linear-gradient(to right, #facc15, #fbbf24, #f59e0b)",
    icon: Trophy,
    title: "HONORING EXCELLENCE",
    quote: "Celebrating the hard work, talent, and achievements of our stars.",
    particleColor: "rgba(250, 204, 21, 0.3)",
  },
  "annual-3": {
    name: "Retro Drama Gala",
    bg: "linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)",
    accent: "linear-gradient(to right, #f87171, #fb923c, #facc15)",
    icon: Mic2,
    title: "A DRAMATIC NIGHT",
    quote: "Experience the timeless stories brought to life by our performers.",
    particleColor: "rgba(248, 113, 113, 0.3)",
  },
  "annual-4": {
    name: "Futuristic Fusion",
    bg: "linear-gradient(135deg, #0c4a6e 0%, #082f49 100%)",
    accent: "linear-gradient(to right, #38bdf8, #818cf8, #2dd4bf)",
    icon: Rocket,
    title: "FUSION FIESTA 2026",
    quote: "Where tradition meets the future. A high-energy showcase!",
    particleColor: "rgba(56, 189, 248, 0.3)",
  },
  "annual-5": {
    name: "Midnight Symphony",
    bg: "linear-gradient(135deg, #09090b 0%, #18181b 100%)",
    accent: "linear-gradient(to right, #94a3b8, #f8fafc, #64748b)",
    icon: Music,
    title: "GRAND FINALE",
    quote: "The final symphony of a year filled with growth and joy.",
    particleColor: "rgba(248, 250, 252, 0.3)",
  },
  // Cultural Templates
  "cultural-1": {
    name: "Paint & Splash Hub",
    bg: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
    accent: "linear-gradient(to right, #34d399, #6ee7b7, #10b981)",
    icon: Palette,
    title: "CREATIVE CANVAS",
    quote: "Let your colors tell a story. Express your artistic soul!",
    particleColor: "rgba(52, 211, 153, 0.3)",
  },
  "cultural-2": {
    name: "Rhythm & Beats",
    bg: "linear-gradient(135deg, #4c1d95 0%, #1e1b4b 100%)",
    accent: "linear-gradient(to right, #a78bfa, #818cf8, #6366f1)",
    icon: Music,
    title: "DANCE REVOLUTION",
    quote: "Feel the beat, own the stage. Show the world your moves!",
    particleColor: "rgba(167, 139, 250, 0.3)",
  },
  "cultural-3": {
    name: "Traditional Roots",
    bg: "linear-gradient(135deg, #78350f 0%, #451a03 100%)",
    accent: "linear-gradient(to right, #fbbf24, #f59e0b, #d97706)",
    icon: School,
    title: "CULTURAL PRIDE",
    quote: "Celebrating the vibrant traditions that make us who we are.",
    particleColor: "rgba(251, 191, 36, 0.3)",
  },
  "cultural-4": {
    name: "Neon Talent Hunt",
    bg: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
    accent: "linear-gradient(to right, #22d3ee, #0d9488, #2dd4bf)",
    icon: Sparkles,
    title: "SHINE BRIGHT!",
    quote: "Uncover the hidden star within you. Your time to shine is now!",
    particleColor: "rgba(34, 211, 238, 0.3)",
  },
  "cultural-5": {
    name: "Storyteller's Nook",
    bg: "linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)",
    accent: "linear-gradient(to right, #f87171, #fbbf24, #facc15)",
    icon: BookOpen,
    title: "ONCE UPON A TIME...",
    quote: "Enchant us with your tales and take us to far-off worlds.",
    particleColor: "rgba(248, 113, 113, 0.3)",
  },
  // Achievement Templates
  "achievement-1": {
    name: "Elite Scholar Award",
    bg: "linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%)",
    accent: "linear-gradient(to right, #fbbf24, #f59e0b, #d97706)",
    icon: Trophy,
    title: "CONGRATULATIONS!",
    quote: "Excellence is not a skill, it's an attitude. Well deserved!",
    particleColor: "rgba(251, 191, 36, 0.3)",
  },
  "achievement-2": {
    name: "Perfect Attendance",
    bg: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
    accent: "linear-gradient(to right, #34d399, #6ee7b7, #10b981)",
    icon: Calendar,
    title: "DEDICATION AWARD",
    quote: "Your consistency is the foundation of your success. Well done!",
    particleColor: "rgba(52, 211, 153, 0.3)",
  },
  "achievement-3": {
    name: "Rising Star Growth",
    bg: "linear-gradient(135deg, #4c1d95 0%, #2e1065 100%)",
    accent: "linear-gradient(to right, #a78bfa, #818cf8, #6366f1)",
    icon: Sparkles,
    title: "RISING STAR!",
    quote: "Watching you grow and succeed is our greatest reward.",
    particleColor: "rgba(167, 139, 250, 0.3)",
  },
  "achievement-4": {
    name: "Citizen of Honor",
    bg: "linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)",
    accent: "linear-gradient(to right, #f87171, #fb923c, #facc15)",
    icon: Medal,
    title: "HONOR & INTEGRITY",
    quote: "Integrity and character define a true leader. We're proud of you!",
    particleColor: "rgba(248, 113, 113, 0.3)",
  },
};





const BACKGROUND_IMAGE_OPTIONS = [
  {
    id: "som_clean",
    label: "👑 3D Studio Spotlight",
    labelMr: "👑 ३D स्टुडिओ स्पॉटलाईट",
    url: "/templates/studentofmonth_clean_3d.jpg",
  },
  {
    id: "som_redcarpet",
    label: "🏆 Red Carpet Gala",
    labelMr: "🏆 रेड कार्पेट सन्मान",
    url: "/templates/studentofmonth_red_carpet_3d.jpg",
  },
  {
    id: "som_library",
    label: "📚 Scholastic Hall",
    labelMr: "📚 भव्य ग्रंथालय हॉल",
    url: "/templates/studentofmonth_library_3d.jpg",
  },
  {
    id: "idcard_3d",
    label: "🪪 ID Card 3D Studio",
    labelMr: "🪪 ३D ओळखपत्र स्टुडिओ",
    url: "/templates/idcard_clean_3d.jpg",
  },
  {
    id: "result_3d",
    label: "📊 Result & Shield 3D",
    labelMr: "📊 ३D निकाल व गुणपत्रिका",
    url: "/templates/result_clean_3d.jpg",
  },
  {
    id: "profile_3d",
    label: "👤 Scholar Profile 3D",
    labelMr: "👤 ३D विद्यार्थी प्रोफाईल",
    url: "/templates/profile_clean_3d.jpg",
  },
  {
    id: "achievement_3d",
    label: "🎖️ Merit Citation",
    labelMr: "🎖️ सुवर्ण सन्मान",
    url: "/templates/achievement_clean_3d.jpg",
  },
  {
    id: "admission_3d",
    label: "🏫 Academy Welcome",
    labelMr: "🏫 शालेय सहर्ष स्वागत",
    url: "/templates/admission_hd.jpg",
  },
  {
    id: "annual_3d",
    label: "🎭 Annual Gala Stage",
    labelMr: "🎭 वार्षिक स्नेहसंमेलन मंच",
    url: "/templates/annual_hd.jpg",
  },
  {
    id: "balloons",
    label: "🎈 3D Golden Balloons",
    labelMr: "🎈 ३D सोनेरी फुगे",
    url: "/templates/birthday_balloons_3d.jpg",
  },
  {
    id: "galaxy",
    label: "🌌 Cosmic Galaxy",
    labelMr: "🌌 कॉस्मिक आकाशगंगा",
    url: "/templates/birthday_galaxy_3d.jpg",
  },
  {
    id: "cake",
    label: "🎂 3D Cake Studio",
    labelMr: "🎂 ३D केक स्टुडिओ",
    url: "/templates/birthday_clean_3d.jpg",
  },
  {
    id: "poster",
    label: "✨ Royal Celebration",
    labelMr: "✨ रॉयल सेलिब्रेशन",
    url: "/templates/birthday_poster_hd.jpg",
  },
];



function TemplateEditorPage() {
  const { templateId } = Route.useParams();
  const { lang, setLang } = useLanguage();
  // Disable accidental pull-to-refresh reload in WebView on THIS PAGE ONLY
  useEffect(() => {
    const prevOverscroll = document.body.style.overscrollBehavior;
    const prevOverscrollY = document.body.style.overscrollBehaviorY;
    document.body.style.overscrollBehavior = "none";
    document.body.style.overscrollBehaviorY = "none";
    return () => {
      document.body.style.overscrollBehavior = prevOverscroll;
      document.body.style.overscrollBehaviorY = prevOverscrollY;
    };
  }, []);
  const [studentName, setStudentName] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`template_draft_${templateId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.studentName) return parsed.studentName;
      }
    } catch (e) {}
    const isMr = lang === "mr";
    if (templateId?.includes("studentofmonth")) return isMr ? "सत्यजित पाटील" : "SATYAJIT PATIL";
    if (templateId?.includes("idcard")) return isMr ? "आरव देशमुख" : "AARAV DESHMUKH";
    if (templateId?.includes("result")) return isMr ? "सान्वी जाधव" : "SANVI JADHAV";
    if (templateId?.includes("profile")) return isMr ? "रोहन कुलकर्णी" : "ROHAN KULKARNI";
    return isMr ? "आदित्य शिंदे" : "ADITYA SHINDE";
  });
  const [studentClass, setStudentClass] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`template_draft_${templateId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.studentClass) return parsed.studentClass;
      }
    } catch (e) {}
    return lang === "mr" ? "इयत्ता ५-वी" : "CLASS 5-A";
  });
  const handleLanguageChange = (newLang: any) => {
    setLang(newLang);
    if (newLang === "mr") {
      if (studentName === "SATYAJIT PATIL") setStudentName("सत्यजित पाटील");
      else if (studentName === "AARAV DESHMUKH") setStudentName("आरव देशमुख");
      else if (studentName === "SANVI JADHAV") setStudentName("सान्वी जाधव");
      else if (studentName === "ROHAN KULKARNI") setStudentName("रोहन कुलकर्णी");
      else if (studentName === "ADITYA SHINDE") setStudentName("आदित्य शिंदे");
      if (studentClass === "CLASS 5-A" || studentClass === "5th Standard" || studentClass === "5th") {
        setStudentClass("इयत्ता ५-वी");
      }
      if (wisherName === "Principal & Teaching Staff" || !wisherName) {
        setWisherName("मुख्याध्यापक व शिक्षक वृंद");
      }
    } else {
      if (studentName === "सत्यजित पाटील") setStudentName("SATYAJIT PATIL");
      else if (studentName === "आरव देशमुख") setStudentName("AARAV DESHMUKH");
      else if (studentName === "सान्वी जाधव") setStudentName("SANVI JADHAV");
      else if (studentName === "रोहन कुलकर्णी") setStudentName("ROHAN KULKARNI");
      else if (studentName === "आदित्य शिंदे") setStudentName("ADITYA SHINDE");
      if (studentClass === "इयत्ता ५-वी") {
        setStudentClass("CLASS 5-A");
      }
      if (wisherName === "मुख्याध्यापक व शिक्षक वृंद") {
        setWisherName("Principal & Teaching Staff");
      }
    }
  };
  const [cardTitle, setCardTitle] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`template_draft_${templateId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.cardTitle) return parsed.cardTitle;
      }
    } catch (e) {}
    return "";
  });
  const [cardQuote, setCardQuote] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`template_draft_${templateId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.cardQuote) return parsed.cardQuote;
      }
    } catch (e) {}
    return "";
  });
  const [wisherName, setWisherName] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`template_draft_${templateId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.wisherName) return parsed.wisherName;
      }
    } catch (e) {}
    try {
      const savedSchool = localStorage.getItem("timetable_school_details");
      if (savedSchool) {
        const parsed = JSON.parse(savedSchool);
        if (parsed.headmasterName) {
          return `${parsed.headmasterName} व शिक्षक वृंद`;
        }
        if (parsed.schoolName) {
          return parsed.schoolName;
        }
      }
    } catch {}
    return lang === "mr" ? "मुख्याध्यापक व शिक्षक वृंद" : "Principal & Teaching Staff";
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const templateRef = useRef<HTMLDivElement>(null);
  const [studentPhoto, setStudentPhoto] = useState<string | null>(() => {
    try {
      const saved = sessionStorage.getItem(`template_draft_${templateId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.studentPhoto) return parsed.studentPhoto;
      }
    } catch (e) {}
    return null;
  });
  const [selectedBgTheme, setSelectedBgTheme] = useState<string>("auto");
  const [selectedBgImage, setSelectedBgImage] = useState<string>(() => {
    if (templateId?.includes("birthday-2")) return "/templates/birthday_galaxy_3d.jpg";
    if (templateId?.includes("birthday-3")) return "/templates/birthday_clean_3d.jpg";
    if (templateId?.includes("birthday")) return "/templates/birthday_balloons_3d.jpg";
    if (templateId?.includes("studentofmonth-2") || templateId?.includes("studentofmonth-8")) return "/templates/studentofmonth_red_carpet_3d.jpg";
    if (templateId?.includes("studentofmonth-3") || templateId?.includes("studentofmonth-10")) return "/templates/studentofmonth_library_3d.jpg";
    if (templateId?.includes("studentofmonth")) return "/templates/studentofmonth_clean_3d.jpg";
    if (templateId?.includes("idcard")) return "/templates/idcard_clean_3d.jpg";
    if (templateId?.includes("result")) return "/templates/result_clean_3d.jpg";
    if (templateId?.includes("profile")) return "/templates/profile_clean_3d.jpg";
    if (templateId?.includes("achievement")) return "/templates/achievement_clean_3d.jpg";
    if (templateId?.includes("admission")) return "/templates/admission_hd.jpg";
    if (templateId?.includes("annual")) return "/templates/annual_hd.jpg";
    if (templateId?.includes("cultural")) return "/templates/annual_hd.jpg";
    if (templateId?.includes("sports")) return "/templates/achievement_clean_3d.jpg";
    return "/templates/studentofmonth_clean_3d.jpg";
  });
  const fileInputRef = useRef<HTMLInputElement>(null);



  // Display photo fallback so frames and stickers work immediately
  const displayPhoto = studentPhoto || "/templates/sample_student_portrait.png";



  // Advanced Visual Customization States (Items 1, 2, 4, 5, 6)
  const [frameStyle, setFrameStyle] = useState<"circle" | "polaroid" | "arch" | "laurel">("circle");
  const [headerStyle, setHeaderStyle] = useState<"calligraphy" | "bold" | "serif">("calligraphy");
  const [spotlightEnabled, setSpotlightEnabled] = useState<boolean>(true);
  const [activeSticker, setActiveSticker] = useState<"crown" | "gifts" | "medal" | "gradcap" | "none">("crown");
  const [photoScale, setPhotoScale] = useState<number>(1);
  const [photoOffsetY, setPhotoOffsetY] = useState<number>(0);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [isMobilePreviewCollapsed, setIsMobilePreviewCollapsed] = useState(false);



  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStudentPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };



  const config = useMemo(() => {
    if (TEMPLATE_CONFIGS[templateId]) return TEMPLATE_CONFIGS[templateId];



    // Comprehensive Category Detection for Fallbacks
    const isSOM = templateId?.includes("studentofmonth") || templateId?.startsWith("som-");
    const isID = templateId?.includes("idcard");
    const isRes = templateId?.includes("result");
    const isProf = templateId?.includes("profile");
    const isAch = templateId?.includes("achievement");
    const isAdm = templateId?.includes("admission");
    const isSp = templateId?.includes("sports");
    const isAnn = templateId?.includes("annual");
    const isCult = templateId?.includes("cultural");
    const isBday = templateId?.includes("birthday");



    return {
      bg: isSOM
        ? "linear-gradient(135deg, #18181b 0%, #27272a 50%, #3f3f46 100%)"
        : isID
          ? "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)"
          : isRes
            ? "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)"
            : isProf
              ? "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)"
              : isAdm
                ? "linear-gradient(135deg, #064e3b 0%, #022c22 100%)"
                : isSp
                  ? "linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)"
                  : isAnn
                    ? "linear-gradient(135deg, #1a1a1a 0%, #3d2b1f 100%)"
                    : isCult
                      ? "linear-gradient(135deg, #064e3b 0%, #065f46 100%)"
                      : isAch
                        ? "linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%)"
                        : isBday
                          ? "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)"
                          : "linear-gradient(135deg, #18181b 0%, #27272a 100%)",
      accent: "linear-gradient(to right, #bf953f, #fcf6ba, #b38728)",
      icon: isSOM
        ? Crown
        : isID
          ? School
          : isRes
            ? Trophy
            : isProf
              ? User
              : isAdm
                ? School
                : isSp
                  ? Trophy
                  : isAnn
                    ? Theater
                    : isCult
                      ? Palette
                      : isAch
                        ? Award
                        : isBday
                          ? Cake
                          : Crown,
      title: isSOM
        ? "STUDENT OF THE MONTH"
        : isID
          ? "STUDENT IDENTITY CARD"
          : isRes
            ? "ACADEMIC PROGRESS REPORT"
            : isProf
              ? "STUDENT PROFILE DOSSIER"
              : isAdm
                ? "Welcome to School!"
                : isSp
                  ? "Sports Star Champion!"
                  : isAnn
                    ? "Annual Day Gala!"
                    : isCult
                      ? "Cultural Star Showcase!"
                      : isAch
                        ? "Congratulations & Honors!"
                        : isBday
                          ? "Happy Birthday!"
                          : "Scholastic Excellence",
      quote: isSOM
        ? "Inspiring excellence, character, and scholastic diligence."
        : isID
          ? "Academic Session 2026-27 • Valid for School Campus, Lab & Library"
          : isRes
            ? "Passed with High Distinction & Scholastic Honors • Session 2026-27"
            : isProf
              ? "Comprehensive 360° Academic, Behavioral & Co-Curricular Portfolio"
              : isAdm
                ? "Congratulations! Welcome to our school family."
                : isSp
                  ? "Speed, strength, and sportsmanship. Congratulations on your victory!"
                  : isBday
                    ? "Have a wonderful day filled with joy!"
                    : "Excellence is an attitude of continuous dedication.",
      particleColor: "rgba(255, 255, 255, 0.4)",
    };
  }, [templateId]);




  // Auto-save form draft so that accidental pull-to-refresh or webview reload never loses filled data on this page
  useEffect(() => {
    try {
      const draft = {
        studentName,
        studentClass,
        cardTitle,
        cardQuote,
        wisherName,
        studentPhoto,
        frameStyle,
        activeSticker,
      };
      sessionStorage.setItem(`template_draft_${templateId}`, JSON.stringify(draft));
    } catch (e) {}
  }, [studentName, studentClass, cardTitle, cardQuote, wisherName, studentPhoto, frameStyle, activeSticker, templateId]);

  const translatedTitle = useMemo(() => {
    if (lang === "mr") {
      if (templateId?.startsWith("studentofmonth") || templateId?.startsWith("som-")) {
        if (templateId === "studentofmonth-2") return "रेड कार्पेट स्टार स्कॉलर!";
        if (templateId === "studentofmonth-3") return "हॉल ऑफ फेम आदर्श विद्यार्थी!";
        if (templateId === "studentofmonth-4") return "मासिक टॉपर सन्मान!";
        if (templateId === "studentofmonth-5") return "सॅफायर स्टार विद्यार्थी!";
        if (templateId === "studentofmonth-6") return "इम्पिरियल स्कॉलर गौरव!";
        if (templateId === "studentofmonth-7") return "एमराल्ड गुणवत्ता पुरस्कार!";
        if (templateId === "studentofmonth-8") return "रुबी स्टार ऑफ एक्सलन्स!";
        if (templateId === "studentofmonth-9") return "गोल्डन ज्युबिली स्कॉलर!";
        if (templateId === "studentofmonth-10") return "सायबर ल्युमिनरी स्टार!";
        return "महिन्याचा सर्वोत्कृष्ट विद्यार्थी!";
      }
      if (templateId?.startsWith("idcard")) {
        if (templateId === "idcard-1") return "रॉयल बर्गंडी ओळखपत्र";
        if (templateId === "idcard-2") return "नेव्ही सॅफायर ओळखपत्र";
        if (templateId === "idcard-3") return "एमराल्ड प्रेस्टीज ओळखपत्र";
        return "अधिकृत विद्यार्थी ओळखपत्र";
      }
      if (templateId?.startsWith("result")) {
        if (templateId === "result-1") return "चॅम्पियनशिप गुणपत्रिका निकाल";
        if (templateId === "result-2") return "वार्षिक शैक्षणिक निकाल";
        if (templateId === "result-3") return "डिस्टिंक्शन प्रगती पुस्तक";
        return "शैक्षणिक प्रगती पुस्तक व निकाल";
      }
      if (templateId?.startsWith("profile")) {
        if (templateId === "profile-1") return "होलिस्टिक ३६०° विद्यार्थी प्रोफाईल";
        if (templateId === "profile-2") return "रॉयल स्कॉलर परिचय डॉझियर";
        return "विद्यार्थी व्यक्तिमत्त्व परिचय डॉझियर";
      }
      if (templateId?.startsWith("birthday")) {
        if (templateId === "birthday-2") return "खगोलीय सोहळा!";
        if (templateId === "birthday-3") return "उगवते चैतन्य!";
        if (templateId === "birthday-4") return "यशस्वी तेजस्विता!";
        if (templateId === "birthday-5") return "उर्जावान वाढदिवस!";
        if (templateId === "birthday-6") return "अमूल्य हिरा!";
        return "वाढदिवसाच्या हार्दिक शुभेच्छा!";
      }
      if (templateId?.startsWith("admission")) {
        if (templateId === "admission-2") return " स्वागत आहे प्रिय विद्यार्थ्या!";
        if (templateId === "admission-4") return "सहर्ष स्वागत!";
        if (templateId === "admission-5") return "स्वागत विजेत्याचे!";
        if (templateId === "admission-6") return "स्वागत यशाचे!";
        return "शाळेत आपले सहर्ष स्वागत!";
      }
      if (templateId?.startsWith("sports")) {
        if (templateId === "sports-1") return "आग्रहाचे आमंत्रण!";
        if (templateId === "sports-2") return "अधिकृत आमंत्रण";
        if (templateId === "sports-3") return "विजेता!";
        return "सुवर्ण पदक यश संपादन!";
      }
      if (templateId?.startsWith("annual")) {
        if (templateId === "annual-1") return "मंच सज्ज आहे!";
        if (templateId === "annual-2") return "उत्कृष्टतेचा सन्मान";
        if (templateId === "annual-3") return "नाट्यमय संध्याकाळ";
        if (templateId === "annual-4") return "फ्युजन सोहळा २०२६";
        return "महा सोहळा";
      }
      if (templateId?.startsWith("cultural")) {
        if (templateId === "cultural-1") return "सर्जनशील कॅनव्हास";
        if (templateId === "cultural-2") return "नृत्य क्रांती";
        if (templateId === "cultural-3") return "सांस्कृतिक अभिमान";
        if (templateId === "cultural-4") return "तेजस्वी व्हा!";
        return "एकदा एका काळी...";
      }
      if (templateId?.startsWith("achievement")) {
        if (templateId === "achievement-2") return "उपस्थिती गौरव पुरस्कार";
        if (templateId === "achievement-3") return "उगवता तारा!";
        if (templateId === "achievement-4") return "सन्मान व प्रामाणिकता";
        return "हार्दिक अभिनंदन!";
      }
    } else if (lang === "hi") {
      if (templateId?.startsWith("birthday")) {
        if (templateId === "birthday-2") return "खगोलीय उत्सव!";
        if (templateId === "birthday-3") return "जन्मदिन बहार!";
        if (templateId === "birthday-4") return "जन्मदिन की ज्वाला!";
        if (templateId === "birthday-5") return "अद्भुत रूप से शानदार!";
        if (templateId === "birthday-6") return "दुर्लभ और शानदार!";
        return "जन्मदिन की हार्दिक शुभकामनाएं!";
      }
      if (templateId?.startsWith("admission")) {
        if (templateId === "admission-2") return "प्रिय छात्र, आपका स्वागत है!";
        if (templateId === "admission-4") return "बोर्ड पर आपका स्वागत है!";
        if (templateId === "admission-5") return "अचीवर का स्वागत है!";
        if (templateId === "admission-6") return "उत्कृष्टता में आपका स्वागत है!";
        return "स्कूल में आपका स्वागत है!";
      }
      if (templateId?.startsWith("sports")) {
        if (templateId === "sports-1") return "आपको आमंत्रित किया गया है!";
        if (templateId === "sports-2") return "आधिकारिक आमंत्रण";
        if (templateId === "sports-3") return "चैंपियन!";
        return "स्वर्ण पदक उपलब्धि!";
      }
      if (templateId?.startsWith("annual")) {
        if (templateId === "annual-1") return "मंच तैयार है!";
        if (templateId === "annual-2") return "उत्कृष्टता का सम्मान";
        if (templateId === "annual-3") return "एक नाटकीय रात";
        if (templateId === "annual-4") return "फ्यूजन उत्सव २०२६";
        return "महा समारोह";
      }
      if (templateId?.startsWith("cultural")) {
        if (templateId === "cultural-1") return "सृजनात्मक कैनवास";
        if (templateId === "cultural-2") return "डांस रेवोल्यूशन";
        if (templateId === "cultural-3") return "सांस्कृतिक गौरव";
        if (templateId === "cultural-4") return "चमक उठें!";
        return "एक समय की बात है...";
      }
      if (templateId?.startsWith("achievement")) {
        if (templateId === "achievement-2") return "समर्पण पुरस्कार";
        if (templateId === "achievement-3") return "उगता सितारा!";
        if (templateId === "achievement-4") return "सम्मान और ईमानदारी";
        return "बधाई हो!";
      }
    }
    return config.title;
  }, [config.title, templateId, lang]);



  const translatedQuote = useMemo(() => {
    if (lang === "mr") {
      if (templateId?.startsWith("studentofmonth") || templateId?.startsWith("som-")) {
        if (templateId === "studentofmonth-1") return "रॉयल स्टेज स्पॉटलाईट • आदर्श शिस्त, परिश्रम आणि शैक्षणिक उत्कृष्टतेचा सर्वोच्च गौरव!";
        if (templateId === "studentofmonth-2") return "रेड कार्पेट भव्य सोहळा • वर्गातील सर्वोच्च शैक्षणिक प्रगती आणि नेतृत्व गुणांचा सन्मान!";
        if (templateId === "studentofmonth-3") return "क्लासिकल लायब्ररी हॉल ऑफ फेम • अष्टपैलू प्रगती आणि उत्कृष्ट आचरणाबद्दल विशेष गौरव!";
        if (templateId === "studentofmonth-4") return "क्राउन व ट्रॉफी स्टुडिओ • अद्वितीय परिश्रम आणि उच्च श्रेणी संपादन केल्याबद्दल विशेष सन्मान!";
        return "आदर्श शिस्त, परिश्रम आणि शैक्षणिक उत्कृष्टतेबद्दल हार्दिक अभिनंदन!";
      }
      if (templateId?.startsWith("idcard")) {
        return "शैक्षणिक वर्ष २०२६-२७ • शाळा परिसर, प्रयोगशाळा व ग्रंथालय प्रवेशासाठी अधिकृत ओळखपत्र.";
      }
      if (templateId?.startsWith("result")) {
        return "विशेष प्राविण्यासह उत्तीर्ण (Grade A+) • पुढील उज्वल शैक्षणिक वाटचालीस हार्दिक शुभेच्छा!";
      }
      if (templateId?.startsWith("profile")) {
        return "होलिस्टिक ३६०° शैक्षणिक, सह-शालेय, कला व क्रीडा कौशल्यांची सर्वसमावेशक नोंद.";
      }
      if (templateId?.startsWith("birthday")) {
        if (templateId === "birthday-1") return "तुमचे आयुष्य तुमच्या भविष्यासारखेच शाही आणि सुवर्णमयी असो.";
        if (templateId === "birthday-2") return "तुमच्या या विशेष दिवशी यशाची उंच शिखरे गाठा. सदैव चमकत राहा!";
        if (templateId === "birthday-3") return "तुम्हाला नैसर्गिक आनंद आणि शाश्वत प्रगतीने समृद्ध आयुष्य लाभो.";
        if (templateId === "birthday-4") return "तुमची क्षमता ओळखा. आजचा दिवस तुमच्या सर्वोत्तम वर्षाची सुरुवात करो.";
        if (templateId === "birthday-5") return "तुमची उर्जा संपूर्ण जगाला प्रकाशमय करो. वाढदिवसाच्या हार्दिक शुभेच्छा!";
        return "तुम्ही एक मौल्यवान रत्न आहात. तुमची चमक प्रत्येक मार्गाला सुकर करो.";
      }
      if (templateId?.startsWith("admission")) {
        if (templateId === "admission-1") return "हार्दिक अभिनंदन! आमच्या शालेय परिवारात स्वागत करताना आम्हाला आनंद होत आहे.";
        if (templateId === "admission-2") return "नवीन प्रवेशाबद्दल अभिनंदन! तुमचे उज्ज्वल भविष्य आजपासून येथे सुरू होत आहे.";
        if (templateId === "admission-3") return "शाळेत आपले स्वागत आहे. तुमची कौशल्ये विकसित करण्यासाठी आम्ही कटिबद्ध आहोत.";
        if (templateId === "admission-4") return "शाळेत प्रवेश घेतल्याबद्दल अभिनंदन. चला यशाच्या दिशेने एकत्र वाटचाल करूया.";
        if (templateId === "admission-5") return "अभिनंदन! तुम्ही आता आमच्या विजयी शालेय समुदायाचा एक भाग आहात.";
        return "प्रवेशाबद्दल अभिनंदन. ज्ञानाचे एक मोठे दालन आता तुमच्यासाठी खुले आहे.";
      }
      if (templateId?.startsWith("sports")) {
        if (templateId === "sports-1") return "वेग, ताकद आणि शालेय उत्साहाच्या सोहळ्यात सहभागी व्हा!";
        if (templateId === "sports-2") return "आमच्या क्रीडापटूंच्या अविश्वसनीय प्रवासाचे आणि यशाचे कौतुक सोहळा.";
        if (templateId === "sports-3") return "कष्ट फळले! तुमच्या ऐतिहासिक विजयाबद्दल तुमचे खूप अभिनंदन!";
        return "तुम्ही एक नवा आदर्श प्रस्थापित केला आहे. संपूर्ण शाळेसाठी एक खरी प्रेरणा.";
      }
      if (templateId?.startsWith("annual")) {
        if (templateId === "annual-1") return "अद्भूत आणि उत्साहाच्या संध्याकाळमध्ये सामील व्हा. जादूचे साक्षीदार व्हा!";
        if (templateId === "annual-2") return "आमच्या ताऱ्यांच्या कठोर परिश्रम, प्रतिभा आणि यशाचा गौरव सोहळा.";
        if (templateId === "annual-3") return "आमच्या कलाकारांनी जिवंत केलेल्या अजरामर कथांचा अनुभव घ्या.";
        if (templateId === "annual-4") return "जिथे परंपरांचा आणि भविष्याचा मेळ होतो. एक उर्जावान सोहळा!";
        return "आनंद आणि विकासाने समृद्ध असलेल्या वर्षाची सांगता.";
      }
      if (templateId?.startsWith("cultural")) {
        if (templateId === "cultural-1") return "तुमच्या रंगांना एक कथा सांगू द्या. तुमची कला व्यक्त करा!";
        if (templateId === "cultural-2") return "ताल अनुभवा, मंचावर अधिराज्य गाजवा. जगाला तुमची कला दाखवा!";
        if (templateId === "cultural-3") return "आपल्याला समृद्ध करणाऱ्या सळसळत्या परंपरांचा उत्सव साजरा करा.";
        if (templateId === "cultural-4") return "तुमच्यातील लपलेला तारा शोधा. चमकण्याची वेळ आता आली आहे!";
        return "तुमच्या अद्भुत कथांनी आम्हाला मंत्रमुग्ध करा आणि एका वेगळ्या जगात घेऊन जा.";
      }
      if (templateId?.startsWith("admission")) {
        if (templateId === "admission-1") return "बधाई हो! हमारे स्कूल परिवार में आपका स्वागत करते हुए हमें बेहद खुशी है।";
        if (templateId === "admission-2") return "प्रवेश मिलने पर बधाई! आपका उज्ज्वल भविष्य आज से हमारे साथ शुरू हो रहा है।";
        if (templateId === "admission-3") return "स्कूल में आपका स्वागत है। आपकी पूरी क्षमता को उजागर करने में मदद करने के लिए हम उत्सुक हैं।";
        if (templateId === "admission-4") return "अकादमी में शामिल होने पर बधाई। आइए मिलकर सफलता की ओर कदम बढ़ाएं।";
        if (templateId === "admission-5") return "बधाई हो! अब आप हमारे विजयी स्कूल समुदाय का हिस्सा हैं।";
        return "प्रवेश पर बधाई। यहाँ ज्ञान का एक अनूठा संसार आपका इंतजार कर रहा है।";
      }
      if (templateId?.startsWith("sports")) {
        if (templateId === "sports-1") return "रफ़्तार, ताक़त और स्कूल भावना से भरे इस दिन में हमारे साथ शामिल हों!";
        if (templateId === "sports-2") return "हमारे एथलीटों की अविश्वसनीय यात्रा और उपलब्धियों का जश्न मनाते हुए।";
        if (templateId === "sports-3") return "कड़ी मेहनत रंग लाती है। आपकी ऐतिहासिक जीत पर बधाई!";
        return "आपने एक ऊँचा मानदंड स्थापित किया है। पूरे स्कूल के लिए एक सच्ची प्रेरणा।";
      }
      if (templateId?.startsWith("annual")) {
        if (templateId === "annual-1") return "अद्भुत और उत्सव की रात में शामिल हों। जादू के साक्षी बनें!";
        if (templateId === "annual-2") return "हमारे सितारों की कड़ी मेहनत, प्रतिभा और उपलब्धियों का उत्सव।";
        if (templateId === "annual-3") return "हमारे कलाकारों द्वारा जीवंत की गई कालजयी कहानियों का अनुभव करें।";
        if (templateId === "annual-4") return "जहां परंपरा का भविष्य से मेल होता है। एक उच्च ऊर्जा वाला शो!";
        return "विकास और खुशियों से भरे एक शानदार वर्ष का अंतिम सोपान।";
      }
      if (templateId?.startsWith("cultural")) {
        if (templateId === "cultural-1") return "अपने रंगों को एक कहानी बयां करने दें। अपनी कलात्मक आत्मा को व्यक्त करें!";
        if (templateId === "cultural-2") return "ताल महसूस करें, मंच पर राज करें। दुनिया को अपनी कला दिखाएं!";
        if (templateId === "cultural-3") return "उन जीवंत परंपराओं का जश्न मनाएं जो हमें अद्वितीय बनाती हैं।";
        if (templateId === "cultural-4") return "अपने भीतर छिपे सितारे को खोजें। आपके चमकने का समय आ गया है!";
        return "अपनी कहानियों से हमें मंत्रमुग्ध करें और दूरदराज के देशों की सैर कराएं।";
      }
      if (templateId?.startsWith("achievement")) {
        if (templateId === "achievement-1") return "उत्कृष्टता कोई कौशल नहीं, बल्कि एक दृष्टिकोण है। बहुत-बहुत बधाई!";
        if (templateId === "achievement-2") return "आपकी निरंतरता ही आपकी सफलता की नींव है। बहुत बढ़िया!";
        if (templateId === "achievement-3") return "आपको बढ़ते और सफल होते देखना हमारा सबसे बड़ा पुरस्कार है।";
        return "ईमानदारी और चरित्र एक सच्चे नेता की पहचान हैं। हमें आप पर गर्व है!";
      }
    }
    return config.quote;
  }, [config.quote, templateId, lang]);



  useEffect(() => {
    setCardTitle(translatedTitle);
  }, [translatedTitle]);



  useEffect(() => {
    setCardQuote(translatedQuote);
  }, [translatedQuote]);



  const configTrans = useMemo(() => {
    return { ...config, title: translatedTitle, quote: translatedQuote };
  }, [config, translatedTitle, translatedQuote]);



  const configToUse = useMemo(() => {
    return {
      ...configTrans,
      title: cardTitle,
      quote: cardQuote,
    };
  }, [configTrans, cardTitle, cardQuote]);



  const isStudentOfMonth = Boolean(templateId?.includes("studentofmonth") || templateId?.startsWith("som-"));
  const isIdCard = Boolean(templateId?.includes("idcard"));
  const isResult = Boolean(templateId?.includes("result"));
  const isProfile = Boolean(templateId?.includes("profile"));
  const isAchievement = Boolean(templateId?.includes("achievement"));
  const isAdmission = Boolean(templateId?.includes("admission"));
  const isSports = Boolean(templateId?.includes("sports"));
  const isAnnual = Boolean(templateId?.includes("annual"));
  const isCultural = Boolean(templateId?.includes("cultural"));
  const isBirthday = Boolean(templateId?.includes("birthday"));



  const handleShareToStudent = async () => {
    setIsSaving(true);
    try {
      const type = isStudentOfMonth
        ? "StudentOfMonth"
        : isIdCard
          ? "IDCard"
          : isResult
            ? "Result"
            : isProfile
              ? "Profile"
              : isAdmission
                ? "Welcome"
                : isSports
                  ? "Sports"
                  : isAnnual
                    ? "Annual"
                    : isCultural
                      ? "Cultural"
                      : isAchievement
                        ? "Achievement"
                        : "Birthday";



      await addDoc(collection(db, "shared_cards"), {
        templateId,
        studentName,
        studentClass,
        title: cardTitle,
        quote: cardQuote,
        studentPhoto: studentPhoto || "",
        createdAt: new Date().toISOString(),
        type,
      });



      toast.success(
        lang === "mr"
          ? `कार्ड यशस्वीरित्या ${studentName} च्या डॅशबोर्डवर शेअर केले!`
          : lang === "hi"
            ? `कार्ड सफलतापूर्वक ${studentName} के डैशबोर्ड पर साझा किया गया!`
            : `${type} card published to ${studentName}'s dashboard!`
      );
    } catch (error) {
      console.error("Error sharing card:", error);
      toast.error("Failed to share card to dashboard.");
    } finally {
      setIsSaving(false);
    }
  };







  const generateCardImage = async () => {
    if (!templateRef.current) {
      throw new Error("Card element not found");
    }



    // Ensure pristine unscaled 2K export even when mobile preview scaling is active
    const el = templateRef.current;
    const prevTransform = el.style.transform;
    el.style.transform = "none";



    let dataUrl: string;
    try {
      dataUrl = await toPng(el, {
        quality: 1.0,
        pixelRatio: 3,
        cacheBust: true,
      });
    } finally {
      el.style.transform = prevTransform;
    }



    const res = await fetch(dataUrl);
    const blob = await res.blob();



    const safeStudentName = (studentName || "student").trim().replace(/\s+/g, '_');
    const safeTitle = (cardTitle || configToUse.title || "card").trim().replace(/\s+/g, '_');
    const filename = `${safeStudentName}_${safeTitle}.png`;



    return { blob, dataUrl, filename };
  };



  const handleDownloadTemplate = async () => {
    if (!templateRef.current) return;
    setIsDownloading(true);



    try {
      const { dataUrl, filename } = await generateCardImage();
      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);



      toast.success(
        lang === "mr"
          ? "कार्ड यशस्वीरित्या डाउनलोड झाले!"
          : lang === "hi"
            ? "कार्ड सफलतापूर्वक डाउनलोड हुआ!"
            : "Card downloaded successfully!"
      );
    } catch (error) {
      console.error("Error downloading card:", error);
      const errMsg = error instanceof Error ? error.message : String(error);
      toast.error(
        lang === "mr"
          ? `कार्ड डाउनलोड करण्यात त्रुटी: ${errMsg}`
          : lang === "hi"
            ? `कार्ड डाउनलोड करने में त्रुटि: ${errMsg}`
            : `Failed to download card: ${errMsg}`
      );
    } finally {
      setIsDownloading(false);
    }
  };



  const handleWhatsAppShare = async () => {
    if (!templateRef.current) return;
    setIsDownloading(true);



    try {
      const { blob, dataUrl, filename } = await generateCardImage();
      const file = new File([blob], filename, { type: "image/png" });



      let sharedSuccessfully = false;



      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
          });
          toast.success(
            lang === "mr" ? "कार्ड यशस्वीरित्या शेअर केले!" : "Card shared successfully!"
          );
          sharedSuccessfully = true;
        } catch (shareErr: any) {
          if (shareErr.name === "AbortError") {
            return;
          }
          console.error("Native share failed:", shareErr);
        }
      }



      if (!sharedSuccessfully) {
        try {
          await navigator.clipboard.write([
            new window.ClipboardItem({
              "image/png": blob,
            }),
          ]);
          toast.success(
            lang === "mr"
              ? "कार्ड इमेज कॉपी झाली! आता WhatsApp मध्ये पेस्ट (Ctrl+V) करा."
              : "Card image copied! Paste it in WhatsApp (Ctrl+V)."
          );



          setTimeout(() => {
            window.open("https://wa.me/", "_blank");
          }, 1200);
        } catch (err) {
          console.error("Clipboard failed, downloading file fallback:", err);
          const link = document.createElement("a");
          link.download = filename;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);



          toast.success(
            lang === "mr"
              ? "कार्ड इमेज डाउनलोड झाली! आता WhatsApp मध्ये जोडा (Attach)."
              : "Card image downloaded! Attach it in WhatsApp."
          );



          setTimeout(() => {
            window.open("https://wa.me/", "_blank");
          }, 1200);
        }
      }
    } catch (error: any) {
      console.error("Error sharing card:", error);
      const errMsg = error?.message || String(error);
      toast.error(
        lang === "mr"
          ? `कार्ड शेअर करण्यात त्रुटी: ${errMsg}`
          : `Failed to share card: ${errMsg}`
      );
    } finally {
      setIsDownloading(false);
    }
  };



  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] overflow-hidden select-none">
      <TeacherHeader />
      <TeacherSidebar />



      {/* Main Studio Workspace - Fixed Studio Layout (No Whole-Page Scroll) */}
      <main className="flex-1 pt-16 flex flex-col lg:flex-row overflow-hidden relative">
{/* 1. Live Card Stage: Visible at top on mobile (order-1), right on desktop (lg:order-2) */}
        <div
          className={`w-full lg:flex-1 shrink-0 flex flex-col items-center justify-center bg-slate-100/80 lg:bg-slate-100/60 border-b lg:border-b-0 lg:border-l border-slate-200/80 shadow-sm relative z-20 order-1 lg:order-2 transition-all duration-300 ${
            isMobilePreviewCollapsed ? "h-12 py-1.5 px-4" : "h-[290px] sm:h-[340px] lg:h-full p-2.5 sm:p-4 lg:p-8"
          }`}
        >
          {/* Mobile Status and Action Bar (Hidden on Desktop) */}
          <div className="lg:hidden w-full flex items-center justify-between px-2 pb-1.5 shrink-0 max-w-[420px]">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{lang === "mr" ? "थेट कार्ड प्रिव्ह्यू" : "Live Preview"}</span>
              <span className="text-[10px] text-slate-400 font-semibold hidden xs:inline">
                ({lang === "mr" ? "बदल त्वरित दिसतील" : "Instant updates"})
              </span>
            </div>



            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowFullPreview(true)}
                className="px-2.5 py-1 text-[11px] font-black bg-white rounded-lg border border-slate-200 text-slate-800 shadow-xs hover:bg-slate-50 flex items-center gap-1 transition-all"
                title={lang === "mr" ? "कार्ड पूर्ण स्क्रीन पहा" : "View Full Screen"}
              >
                <Maximize2 className="size-3 text-indigo-600" />
                <span>{lang === "mr" ? "मोठा आकार" : "Full"}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsMobilePreviewCollapsed(!isMobilePreviewCollapsed)}
                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors"
                title={isMobilePreviewCollapsed ? (lang === "mr" ? "उघडा" : "Expand") : (lang === "mr" ? "लहान करा" : "Collapse")}
              >
                {isMobilePreviewCollapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
              </button>
            </div>
          </div>



          {!isMobilePreviewCollapsed && (
            <div className="relative flex items-center justify-center w-[190px] h-[245px] sm:w-[230px] sm:h-[295px] lg:w-full lg:h-full lg:max-w-[420px] sm:lg:max-w-[460px] xl:max-w-[500px] lg:aspect-[3/4] lg:max-h-[calc(100vh-6rem)]">
              <div className="w-[360px] h-[480px] sm:w-[380px] sm:h-[507px] lg:w-full lg:h-full origin-center scale-[0.51] sm:scale-[0.58] lg:scale-100 shrink-0 transition-transform duration-200">
                <motion.div
              ref={templateRef}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full h-full rounded-[2rem] sm:rounded-[2.5rem] md:rounded-[3rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden relative group border-4 sm:border-6 md:border-8 border-white"
            >
              <div className="w-full h-full relative overflow-hidden flex flex-col">
                {/* Realistic Background Image */}
                {selectedBgImage ? (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <img
                      src={selectedBgImage}
                      alt="Template Atmosphere"
                      className="w-full h-full object-cover object-center filter brightness-[0.52] contrast-[1.2] scale-105 transition-all duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/60 mix-blend-multiply" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(0,0,0,0.85)_100%)]" />
                  </div>
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{ background: configToUse.bg }}
                  />
                )}



                {/* Rich Theme Scenery (Bokeh Lights, Streamers, Cosmic Stars, Velvet Damask) */}
                <CardBackgroundThemeLayer themeType={selectedBgTheme} templateId={templateId} />



                {/* Animated Floating Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        y: [0, -100, 0],
                        x: [0, Math.sin(i) * 20, 0],
                        rotate: [0, 180, 360],
                        opacity: [0.1, 0.3, 0.1],
                      }}
                      transition={{
                        duration: 8 + i,
                        repeat: Infinity,
                        delay: i * 0.5,
                      }}
                      className="absolute size-4 rounded-lg blur-[1px]"
                      style={{
                        background: configToUse.particleColor,
                        left: `${(i + 1) * 12}%`,
                        bottom: "-5%",
                      }}
                    />
                  ))}
                </div>



                {/* Decorative Glows */}
                <div className="absolute -top-32 -right-32 size-96 bg-white/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute -bottom-32 -left-32 size-96 bg-black/40 rounded-full blur-[120px]" />



                {/* Corner Ornaments */}
                <CornerOrnaments color="#fef08a" />



                {/* Floating Celebration Balloons & Sparkles (For Birthday & Celebratory) */}
                {isBirthday && (
                  <>
                    <CelebrationBalloonsLeft />
                    <CelebrationBalloonsRight />
                  </>
                )}
                <FloatingSparkles />



                {/* Card Content */}
                <div className="relative z-10 w-full h-full flex flex-col items-center justify-between p-3 sm:p-4 md:p-5 text-center overflow-hidden select-none">
                  
                  {/* Top Celebratory Header Badge */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 backdrop-blur-md shadow-md mb-2 shrink-0"
                  >
                    <Sparkles className="size-3 text-amber-300 animate-spin" style={{ animationDuration: "6s" }} />
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-200">
                      {isBirthday
                        ? (lang === "mr" ? "✦ विशेष वाढदिवस सोहळा ✦" : "✦ SPECIAL BIRTHDAY CELEBRATION ✦")
                        : isStudentOfMonth
                          ? (lang === "mr" ? "★ महिन्याचा विद्यार्थी • अधिकृत गौरव ★" : "★ STUDENT OF THE MONTH • OFFICIAL AWARD ★")
                          : isIdCard
                            ? (lang === "mr" ? "★ अधिकृत विद्यार्थी ओळखपत्र ★" : "★ OFFICIAL STUDENT IDENTITY CARD ★")
                            : isResult
                              ? (lang === "mr" ? "★ शैक्षणिक प्रगती व गुणवत्ता अहवाल ★" : "★ ACADEMIC PROGRESS & MERIT REPORT ★")
                              : isProfile
                                ? (lang === "mr" ? "★ अधिकृत विद्यार्थी प्रोफाइल डॉझियर ★" : "★ OFFICIAL STUDENT PROFILE DOSSIER ★")
                                : isAchievement
                                  ? (lang === "mr" ? "★ विशेष प्राविण्य व प्रशस्तीपत्रक ★" : "★ OFFICIAL MERIT & ACHIEVEMENT AWARD ★")
                                  : isAdmission
                                    ? (lang === "mr" ? "★ शाळेत सहर्ष स्वागत ★" : "★ WELCOME TO OUR SCHOOL FAMILY ★")
                                    : isSports
                                      ? (lang === "mr" ? "★ क्रीडा स्पर्धा विजेता गौरव ★" : "★ CHAMPIONSHIP ATHLETE • SPORTS MERIT ★")
                                      : isAnnual
                                        ? (lang === "mr" ? "✦ वार्षिक स्नेहसंमेलन सोहळा ✦" : "✦ ANNUAL FUNCTION CELEBRATION ✦")
                                        : isCultural
                                          ? (lang === "mr" ? "★ सांस्कृतिक कला महोत्सव ★" : "★ CULTURAL FESTIVAL & TALENT SHOW ★")
                                          : (lang === "mr" ? "✦ शैक्षणिक उत्कृष्टता ✦" : "✦ SCHOLASTIC EXCELLENCE ✦")}
                    </span>
                    <Sparkles className="size-3 text-amber-300" />
                  </motion.div>



                  {/* Main Hero Container */}
                  <div className="w-full flex flex-col items-center justify-center my-auto py-0">
                    
                    {/* 4. Overhead Studio Spotlight Beam */}
                    {spotlightEnabled && <OverheadSpotlightBeam />}



                    {/* Visual Focus: Customizable High-Impact Hero Photo Frame */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 14 }}
                      className="relative my-1 sm:my-2 shrink-0"
                    >
                      {studentPhoto ? (
                        <div className="relative">
                          {/* 1. FRAME STYLES */}
                          {frameStyle === "polaroid" ? (
                            /* Polaroid Frame Style */
                            <div className="w-32 h-40 sm:w-36 sm:h-46 md:w-40 md:h-50 bg-white p-2 pb-6 rounded-sm shadow-xl rotate-[-2deg] relative border border-slate-100">
                              <RealisticPaperclipSVG className="absolute -top-3.5 -left-2 size-9 pointer-events-none z-30 drop-shadow-md" color="#fbbf24" />
                              <div className="w-full h-full overflow-hidden bg-slate-900 border border-slate-200/50 shadow-inner relative">
                                <img
                                  src={displayPhoto}
                                  alt={studentName}
                                  style={{
                                    transform: `scale(${photoScale}) translateY(${photoOffsetY}%)`,
                                    transition: "transform 0.1s ease-out",
                                  }}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="absolute bottom-1.5 left-0 right-0 text-center">
                                <p className="text-[10px] font-black text-slate-800 tracking-widest uppercase truncate px-2 font-serif">
                                  ★ {studentName} ★
                                </p>
                              </div>
                            </div>
                          ) : frameStyle === "arch" ? (
                            /* Cathedral Royal Arch Frame Style */
                            <div className="w-32 h-40 sm:w-36 sm:h-46 md:w-40 md:h-50 rounded-t-[5rem] rounded-b-xl p-1.5 bg-gradient-to-t from-amber-600 via-amber-300 to-yellow-100 shadow-xl border border-white relative">
                              <div className="w-full h-full rounded-t-[7.5rem] rounded-b-xl overflow-hidden bg-slate-900 shadow-inner relative border border-amber-950/20">
                                <img
                                  src={displayPhoto}
                                  alt={studentName}
                                  style={{
                                    transform: `scale(${photoScale}) translateY(${photoOffsetY}%)`,
                                    transition: "transform 0.1s ease-out",
                                  }}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                          ) : frameStyle === "laurel" ? (
                            /* Golden Laurel Garland Surround Style */
                            <div className="relative flex items-center justify-center">
                              <GoldenLaurelWreath className="size-44 sm:size-50 md:size-54 absolute pointer-events-none z-20" />
                              <div className="size-28 sm:size-34 md:size-38 rounded-full p-1.5 bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-600 shadow-xl border-2 border-white/80 overflow-hidden relative">
                                <img
                                  src={displayPhoto}
                                  alt={studentName}
                                  style={{
                                    transform: `scale(${photoScale}) translateY(${photoOffsetY}%)`,
                                    transition: "transform 0.1s ease-out",
                                  }}
                                  className="w-full h-full object-cover rounded-full"
                                />
                              </div>
                            </div>
                          ) : (
                            /* Classic Royal Ring Frame Style */
                            <div className="relative size-28 sm:size-34 md:size-38 rounded-full p-1.5 bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-600 shadow-xl border-2 border-white/80">
                              <div className="w-full h-full rounded-full overflow-hidden border-2 border-amber-950/20 relative shadow-inner">
                                <img
                                  src={displayPhoto}
                                  alt={studentName}
                                  style={{
                                    transform: `scale(${photoScale}) translateY(${photoOffsetY}%)`,
                                    transition: "transform 0.1s ease-out",
                                  }}
                                  className="w-full h-full object-cover rounded-full"
                                />
                              </div>
                              <div className="absolute bottom-1 right-2 size-8 sm:size-9 bg-amber-400 rounded-full flex items-center justify-center shadow-lg border-2 border-white rotate-12">
                                <Star className="size-4 sm:size-5 text-amber-950 fill-amber-950" />
                              </div>
                            </div>
                          )}



                          {/* 5. ACTIVE STICKERS OVERLAY */}
                          {activeSticker === "crown" && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 rounded-full shadow-lg border border-white flex items-center gap-1.5 z-30 whitespace-nowrap">
                              <Crown className="size-3.5 sm:size-4 text-amber-950 fill-amber-950" />
                              <span className="text-[9px] sm:text-[10px] font-black uppercase text-amber-950 tracking-wider">
                                {isBirthday
                                  ? (lang === "mr" ? "वाढदिवस स्टार" : "BIRTHDAY STAR")
                                  : isStudentOfMonth
                                    ? (lang === "mr" ? "महिन्याचा विद्यार्थी" : "STUDENT OF THE MONTH")
                                    : isIdCard
                                      ? (lang === "mr" ? "विद्यार्थी ओळखपत्र" : "STUDENT PASS")
                                      : isResult
                                        ? (lang === "mr" ? "शैक्षणिक टॉपर" : "ACADEMIC TOPPER")
                                        : isProfile
                                          ? (lang === "mr" ? "आदर्श विद्यार्थी" : "HONOR SCHOLAR")
                                          : isAchievement
                                            ? (lang === "mr" ? "गुणवंत विद्यार्थी" : "HONORED ACHIEVER")
                                            : isSports
                                              ? (lang === "mr" ? "क्रीडा विजेता" : "SPORTS CHAMPION")
                                              : (lang === "mr" ? "स्टार स्कॉलर" : "STAR SCHOLAR")}
                              </span>
                            </div>
                          )}



                          {activeSticker === "gifts" && (
                            <CelebrationGiftBoxSVG className="absolute -bottom-3 -right-3 size-12 sm:size-14 drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)] z-30" />
                          )}



                          {activeSticker === "medal" && (
                            <GoldenMedalEmblemSVG className="absolute -bottom-4 -left-3 size-12 sm:size-14 drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)] z-30" />
                          )}



                          {activeSticker === "gradcap" && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full backdrop-blur-md border border-amber-300/60 shadow-lg flex items-center gap-1.5 z-30">
                              <GraduationCap className="size-4 text-amber-300 fill-amber-300" />
                              <span className="text-[9px] font-black uppercase text-amber-200">{lang === "mr" ? "गुणवत्ता यादी" : "HONOR ROLL"}</span>
                            </div>
                          )}
                        </div>
                      ) : isBirthday ? (
                        <div className="flex flex-col items-center py-2">
                          <div className="scale-125 sm:scale-150 transform mb-3">
                            <FestiveBirthdayCake />
                          </div>
                          <div className="px-4 py-1 rounded-full bg-pink-500/30 border border-pink-400/40 backdrop-blur-sm text-[10px] font-black text-pink-200 tracking-wider shadow-md">
                            🎂 CELEBRATION TIME • MAKE A WISH 🎂
                          </div>
                        </div>
                      ) : isStudentOfMonth ? (
                        <div className="relative flex flex-col items-center justify-center py-2">
                          <div className="relative flex items-center justify-center">
                            <GoldenLaurelWreath className="size-36 sm:size-44" />
                            <div className="size-24 sm:size-28 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 p-1 shadow-2xl flex items-center justify-center border-2 border-white/80">
                              <Crown className="size-14 text-amber-950 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] fill-amber-950" />
                            </div>
                            <div className="absolute -bottom-2 size-9 bg-amber-400 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                              <Star className="size-5 text-amber-950 fill-amber-950" />
                            </div>
                          </div>
                          <div className="mt-3 px-4 py-1 rounded-full bg-amber-400/25 border border-amber-300/40 backdrop-blur-sm text-[10px] font-black text-amber-200 tracking-wider shadow-md uppercase">
                            👑 STAR SCHOLAR • MONTHLY MERIT 👑
                          </div>
                        </div>
                      ) : isIdCard ? (
                        <div className="flex flex-col items-center justify-center py-2">
                          <div className="size-28 sm:size-32 rounded-3xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 border-2 border-amber-400/60 flex flex-col items-center justify-center shadow-2xl relative p-3">
                            <School className="size-12 text-amber-300 mb-1" />
                            <div className="w-16 h-1 bg-amber-300/80 rounded-full mb-1" />
                            <div className="w-10 h-0.5 bg-white/40 rounded-full" />
                            <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-amber-400 text-slate-950 rounded-full text-[8px] font-black">
                              ID PASS
                            </div>
                          </div>
                          <div className="mt-3 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-[10px] font-black text-indigo-200 tracking-wider">
                            CAMPUS IDENTIFICATION 2026-27
                          </div>
                        </div>
                      ) : isResult ? (
                        <div className="relative flex flex-col items-center justify-center py-2">
                          <div className="relative flex items-center justify-center">
                            <GoldenLaurelWreath className="size-36 sm:size-44" />
                            <div className="size-24 sm:size-28 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-500 to-amber-500 p-1.5 shadow-2xl flex flex-col items-center justify-center border-2 border-white/80">
                              <Award className="size-10 text-amber-300 mb-0.5" />
                              <span className="text-[11px] font-black text-white tracking-widest">GRADE A+</span>
                            </div>
                          </div>
                          <div className="mt-3 px-4 py-1 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-[10px] font-black text-emerald-200 tracking-wider uppercase">
                            ★ SCHOLASTIC DISTINCTION & HONORS ★
                          </div>
                        </div>
                      ) : isProfile ? (
                        <div className="flex flex-col items-center justify-center py-2">
                          <div className="size-28 sm:size-32 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-2xl relative">
                            <User className="size-16 text-amber-300" />
                            <div className="absolute -top-2.5 -right-2.5 size-8 bg-amber-400 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                              <Star className="size-4 text-amber-950 fill-amber-950" />
                            </div>
                          </div>
                          <div className="mt-3 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[10px] font-black text-amber-200 tracking-wider uppercase">
                            ★ STUDENT PROFILE DOSSIER ★
                          </div>
                        </div>
                      ) : isAchievement ? (
                        <div className="relative flex flex-col items-center justify-center py-2">
                          <div className="relative flex items-center justify-center">
                            <GoldenLaurelWreath className="size-36 sm:size-44" />
                            <Trophy className="absolute size-14 text-amber-300 drop-shadow-[0_0_20px_rgba(251,191,36,0.9)]" />
                          </div>
                          <div className="mt-3 px-4 py-1 rounded-full bg-amber-500/25 border border-amber-300/40 text-[10px] font-black text-amber-200 tracking-wider uppercase">
                            ★ OFFICIAL MERIT AWARD ★
                          </div>
                        </div>
                      ) : (
                        <div className="size-32 sm:size-40 rounded-3xl bg-white/15 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-2xl relative">
                          <configToUse.icon className="size-16 sm:size-20 text-amber-300 drop-shadow-[0_0_20px_rgba(251,191,36,0.7)]" />
                          <div className="absolute -top-3 -right-3 size-10 bg-amber-400 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                            <Star className="size-5 text-amber-950 fill-amber-950" />
                          </div>
                        </div>
                      )}
                    </motion.div>



                    {/* 2. Card Title with Calligraphy / Typography Styles */}
                    <motion.h1
                      key={configToUse.title}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`text-lg sm:text-xl md:text-2xl py-0.5 drop-shadow-lg leading-snug ${
                        headerStyle === "calligraphy"
                          ? "font-serif italic font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-300"
                          : headerStyle === "serif"
                          ? "font-serif font-black uppercase text-white tracking-wider"
                          : "font-sans font-black text-white tracking-tight"
                      }`}
                    >
                      {configToUse.title}
                    </motion.h1>



                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "45px" }}
                      className="h-0.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent rounded-full my-0.5 shadow-glow"
                    />



                    {/* Honored Student Name */}
                    <div className="space-y-0.5 sm:space-y-1 mb-2 max-w-full px-2">
                      <div className="flex items-center justify-center gap-2 text-amber-200/90 font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs">
                        <span className="h-px w-5 bg-gradient-to-r from-transparent to-amber-300/60" />
                        <span>{lang === "mr" ? "गौरवमूर्ती" : lang === "hi" ? "गौरवान्वित नाम" : "Presented To"}</span>
                        <span className="h-px w-5 bg-gradient-to-l from-transparent to-amber-300/60" />
                      </div>
                      <motion.h2
                        key={studentName}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-xl sm:text-2xl md:text-3xl font-black tracking-normal leading-tight py-0.5 break-words max-w-full bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-400 bg-clip-text text-transparent filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                      >
                        {studentName}
                      </motion.h2>
                    </div>



                    {/* Frosted Wishing Quote Box */}
                    <motion.div
                      key={configToUse.quote}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-black/35 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15 shadow-md max-w-[92%] mx-auto my-1 relative"
                    >
                      <p className="text-white/95 font-medium text-xs sm:text-sm md:text-base italic leading-relaxed">
                        "{configToUse.quote}"
                      </p>
                    </motion.div>



                    {/* Student Class & Badge */}
                    <motion.div
                      initial={{ y: 15, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-500/20 border border-amber-300/40 px-3.5 py-1 rounded-full backdrop-blur-md shadow-md inline-flex items-center gap-1.5 my-0.5"
                    >
                      {isAnnual ? (
                        <Theater className="size-4 text-amber-300" />
                      ) : isCultural ? (
                        <PaletteIcon className="size-4 text-amber-300" />
                      ) : isAchievement ? (
                        <Trophy className="size-4 text-amber-300" />
                      ) : (
                        <GraduationCap className="size-4 text-amber-300" />
                      )}
                      <span className="text-amber-100 font-black text-xs sm:text-sm tracking-widest uppercase">
                        {studentClass}
                      </span>
                      <Star className="size-3 text-amber-300 fill-amber-300" />
                    </motion.div>
                  </div>



                  {/* 3. Creative Footer: Wisher's Name / शुभेच्छुक */}
                  <div className="w-full pt-2 border-t border-white/15 flex items-center justify-center px-2 sm:px-3 text-amber-200/90 shrink-0">
                    <div className="w-full bg-black/40 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-xl border border-white/15 flex items-center justify-between gap-2 shadow-sm">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="size-6 rounded-lg bg-amber-400/25 border border-amber-300/40 flex items-center justify-center shrink-0">
                          <Heart className="size-3 text-pink-300 fill-pink-400/50" />
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="text-[9px] sm:text-[10px] font-extrabold text-amber-300 tracking-wider uppercase shrink-0">
                            {lang === "mr" ? "शुभेच्छुक :" : lang === "hi" ? "शुभचिंतक :" : "Best Wishes :"}
                          </span>
                          <span className="text-[10px] sm:text-[11px] font-black text-white tracking-wide uppercase truncate drop-shadow-sm">
                            {wisherName || (lang === "mr" ? "मुख्याध्यापक व शिक्षक वृंद" : "Principal & Teaching Staff")}
                          </span>
                        </div>
                      </div>
                      <Sparkles className="size-3 text-amber-300 shrink-0 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>



              {/* Shimmer Effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none group-hover:translate-x-full transition-transform duration-1500 ease-in-out" />
            </motion.div>



              </div>
            </div>
          )}



          <p className="mt-3 text-slate-500 font-extrabold text-xs tracking-normal hidden lg:flex items-center justify-center gap-2">
            <PartyPopper className="size-3.5 text-pink-500" /> {lang === "mr" ? "थेट प्रिव्ह्यू • अल्ट्रा-प्रीमियम डिजिटल कार्ड" : "Live Preview • Ultra-Premium Digital Card"}
          </p>
        </div>
      



{/* 1. Left Panel: Independent Scrollable Controls Sidebar */}
        <div
          className="w-full lg:w-[480px] xl:w-[540px] flex-1 lg:h-full overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 shrink-0 bg-white lg:border-r border-slate-200/80 shadow-sm order-2 lg:order-1"
        >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/90 p-3 rounded-2xl border border-slate-200/80 shadow-sm mb-4">
              <button
                onClick={() => window.history.back()}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold transition-all text-xs uppercase tracking-wider group cursor-pointer"
              >
                <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />{" "}
                {lang === "mr"
                  ? "टेम्पलेट्सवर परत जा"
                  : lang === "hi"
                    ? "टेम्पलेट्स पर वापस जाएं"
                    : "Back to Templates"}
              </button>
              {/* Prominent Language Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner self-end sm:self-auto">
                <span className="text-[10px] font-black text-slate-500 uppercase px-2 hidden sm:inline">
                  {lang === "mr" ? "भाषा :" : "Lang :"}
                </span>
                <button
                  type="button"
                  onClick={() => handleLanguageChange("mr")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    lang === "mr"
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm scale-105"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white"
                  }`}
                >
                  <span>🇮🇳</span>
                  <span>मराठी</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange("en")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    lang === "en"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm scale-105"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white"
                  }`}
                >
                  <span>🇬🇧</span>
                  <span>English</span>
                </button>
              </div>
            </div>



            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 space-y-10"
            >
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic">
                  {lang === "mr"
                    ? "कला दालन"
                    : lang === "hi"
                      ? "सृजनात्मक स्टूडियो"
                      : "Creative Studio"}
                </h2>
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-1">
                  {lang === "mr"
                    ? "थेट सानुकूलन इंजिन"
                    : lang === "hi"
                      ? "लाइव पर्सनलाइजेशन इंजन"
                      : "Live Personalization Engine"}
                </p>
              </div>



              <div className="space-y-8">
                <div className="space-y-2 group">
                  <label className="text-xs sm:text-sm font-extrabold text-slate-700 ml-1 tracking-normal block">
                    {lang === "mr"
                      ? "विद्यार्थ्याचे पूर्ण नाव"
                      : lang === "hi"
                        ? "छात्र का पूरा नाम"
                        : "Student Full Name"}
                  </label>
                  <div className="bg-slate-50 rounded-[2rem] flex items-center gap-4 px-8 border-2 border-transparent focus-within:bg-white focus-within:border-emerald-500/20 transition-all shadow-inner">
                    <User className="size-5 text-slate-300 group-focus-within:text-emerald-500" />
                    <input
                      type="text"
                      value={studentName}
                      onChange={(e) =>
                        setStudentName(e.target.value.toUpperCase())
                      }
                      className="bg-transparent outline-none w-full py-6 text-sm font-black text-slate-900"
                    />
                  </div>
                </div>



                <div className="space-y-2 group">
                  <label className="text-xs sm:text-sm font-extrabold text-slate-700 ml-1 tracking-normal block">
                    {isAnnual ? (
                      lang === "mr" ? "कामगिरीची भूमिका" : lang === "hi" ? "प्रदर्शन की भूमिका" : "Performance Role"
                    ) : isCultural ? (
                      lang === "mr" ? "उपक्रम श्रेणी" : lang === "hi" ? "गतिविधि श्रेणी" : "Activity Category"
                    ) : isAchievement ? (
                      lang === "mr" ? "यशाचे नाव" : lang === "hi" ? "उपलब्धि का नाम" : "Achievement Title"
                    ) : (
                      lang === "mr" ? "इयत्ता आणि तुकडी" : lang === "hi" ? "कक्षा और अनुभाग" : "Class & Section"
                    )}
                  </label>
                  <div className="bg-slate-50 rounded-[2rem] flex items-center gap-4 px-8 border-2 border-transparent focus-within:bg-white focus-within:border-blue-500/20 transition-all shadow-inner">
                    {isAnnual ? (
                      <Theater className="size-5 text-slate-300 group-focus-within:text-blue-500" />
                    ) : isCultural ? (
                      <PaletteIcon className="size-5 text-slate-300 group-focus-within:text-blue-500" />
                    ) : isAchievement ? (
                      <Trophy className="size-5 text-slate-300 group-focus-within:text-blue-500" />
                    ) : (
                      <GraduationCap className="size-5 text-slate-300 group-focus-within:text-blue-500" />
                    )}
                    <input
                      type="text"
                      value={studentClass}
                      onChange={(e) =>
                        setStudentClass(e.target.value.toUpperCase())
                      }
                      className="bg-transparent outline-none w-full py-6 text-sm font-black text-slate-900"
                      placeholder={
                        isAnnual
                          ? (lang === "mr" ? "उदा. स्वागत नृत्य" : lang === "hi" ? "उदा. स्वागत नृत्य" : "E.G. WELCOME DANCE")
                          : isCultural
                            ? (lang === "mr" ? "उदा. चित्रकला स्पर्धा" : lang === "hi" ? "उदा. चित्रकला प्रतियोगिता" : "E.G. PAINTING CONTEST")
                            : isAchievement
                              ? (lang === "mr" ? "उदा. प्रथम क्रमांक" : lang === "hi" ? "उदा. प्रथम स्थान" : "E.G. CLASS TOPPER")
                              : "CLASS 5-A"
                      }
                    />
                  </div>
                </div>



                <div className="space-y-2 group">
                  <label className="text-xs sm:text-sm font-extrabold text-slate-700 ml-1 tracking-normal block">
                    {lang === "mr" ? "कार्ड मथळा (Title)" : lang === "hi" ? "कार्ड का शीर्षक" : "Card Title"}
                  </label>
                  <div className="bg-slate-50 rounded-[2rem] flex items-center gap-4 px-8 border-2 border-transparent focus-within:bg-white focus-within:border-indigo-500/20 transition-all shadow-inner">
                    <FileText className="size-5 text-slate-300 group-focus-within:text-indigo-500" />
                    <input
                      type="text"
                      value={cardTitle}
                      onChange={(e) => setCardTitle(e.target.value)}
                      className="bg-transparent outline-none w-full py-6 text-sm font-black text-slate-900"
                    />
                  </div>
                </div>



                <div className="space-y-2 group">
                  <label className="text-xs sm:text-sm font-extrabold text-slate-700 ml-1 tracking-normal block">
                    {lang === "mr" ? "शुभेच्छा संदेश (Quote)" : lang === "hi" ? "शुभकामना संदेश (Quote)" : "Wishing Message / Quote"}
                  </label>
                  <div className="bg-slate-50 rounded-[2.5rem] flex items-start gap-4 px-8 py-4 border-2 border-transparent focus-within:bg-white focus-within:border-indigo-500/20 transition-all shadow-inner">
                    <MessageCircle className="size-5 text-slate-300 mt-2 group-focus-within:text-indigo-500" />
                    <textarea
                      value={cardQuote}
                      onChange={(e) => setCardQuote(e.target.value)}
                      rows={3}
                      className="bg-transparent outline-none w-full py-2 text-sm font-black text-slate-900 resize-none"
                    />
                  </div>
                </div>



                <div className="space-y-2 group">
                  <label className="text-xs sm:text-sm font-extrabold text-slate-700 ml-1 tracking-normal block">
                    {lang === "mr" ? "शुभेच्छुकाचे नाव (Wisher Name)" : lang === "hi" ? "शुभचिंतक का नाम" : "Wisher Name / Organization"}
                  </label>
                  <div className="bg-slate-50 rounded-[2rem] flex items-center gap-4 px-8 border-2 border-transparent focus-within:bg-white focus-within:border-amber-500/20 transition-all shadow-inner">
                    <Heart className="size-5 text-slate-300 group-focus-within:text-amber-500" />
                    <input
                      type="text"
                      value={wisherName}
                      onChange={(e) => setWisherName(e.target.value)}
                      placeholder={lang === "mr" ? "उदा. मुख्याध्यापक, शिक्षक वृंद किंवा शाळेचे नाव" : "E.g. Principal, Staff or School Name"}
                      className="bg-transparent outline-none w-full py-6 text-sm font-black text-slate-900"
                    />
                  </div>
                </div>



                {/* Background Image Selection Gallery */}
                <div className="space-y-2.5 group">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-xs sm:text-sm font-extrabold text-slate-700 tracking-normal block">
                      {lang === "mr" ? "आकर्षक बॅकग्राउंड चित्र निवडा (Background Image)" : "Choose Background Image"}
                    </label>
                    <span className="text-[10px] text-pink-600 font-extrabold uppercase tracking-wider bg-pink-50 px-2 py-0.5 rounded-md border border-pink-200">
                      3D HD Scenery
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {BACKGROUND_IMAGE_OPTIONS.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setSelectedBgImage(img.url)}
                        className={`group/btn relative aspect-[4/3] rounded-2xl overflow-hidden border-2 transition-all p-0.5 cursor-pointer ${
                          selectedBgImage === img.url
                            ? "border-pink-500 shadow-lg ring-2 ring-pink-500/40 scale-105 z-10"
                            : "border-slate-200 hover:border-slate-400 opacity-75 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={img.url}
                          alt={img.label}
                          className="w-full h-full object-cover rounded-xl"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex items-end p-1">
                          <span className="text-[8px] sm:text-[9px] font-black text-white truncate drop-shadow-md w-full text-left">
                            {lang === "mr" ? img.labelMr : img.label}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>



                {/* Background Visual Theme Overlay Selector */}
                <div className="space-y-2 group">
                  <label className="text-xs sm:text-sm font-extrabold text-slate-700 ml-1 tracking-normal block">
                    {lang === "mr" ? "बॅकग्राउंड इफेक्ट्स (Lighting Effects)" : "Background Lighting Effects"}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "royal-gold-bokeh", label: "🌟 Royal Gold Bokeh", labelMr: "🌟 रॉयल गोल्ड बोकेह" },
                      { id: "party-streamers", label: "🎉 Party Streamers", labelMr: "🎉 पार्टी स्ट्रीमर्स" },
                      { id: "cosmic-galaxy", label: "🌌 Cosmic Galaxy", labelMr: "🌌 कॉस्मिक गॅलक्सी" },
                      { id: "royal-palace", label: "🏛️ Red Velvet Palace", labelMr: "🏛️ रेड वेलव्हेट पॅलेस" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedBgTheme(t.id)}
                        className={`px-3 py-2 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                          (selectedBgTheme === t.id || (selectedBgTheme === "auto" && t.id === "royal-gold-bokeh"))
                            ? "bg-slate-900 text-amber-300 border-slate-900 shadow-md scale-[1.02]"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {lang === "mr" ? t.labelMr : t.label}
                      </button>
                    ))}
                  </div>
                </div>



                {/* Photo Upload Option */}
                <div className="space-y-2 group">
                  <label className="text-xs sm:text-sm font-extrabold text-slate-700 ml-1 tracking-normal block">
                    {lang === "mr" ? "विद्यार्थ्याचा फोटो जोडा" : lang === "hi" ? "छात्र का फोटो जोड़ें" : "Add Student Photo"}
                  </label>
                  <div className="flex gap-4 items-center">
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors font-bold text-xs uppercase tracking-wider rounded-2xl px-6 py-4 flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <ImageIcon className="size-4" />
                      {studentPhoto ? (lang === "mr" ? "फोटो बदला" : "Change Photo") : (lang === "mr" ? "फोटो ॲड करा" : "Add Photo")}
                    </button>
                    {studentPhoto && (
                      <button
                        type="button"
                        onClick={() => {
                          setStudentPhoto(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="bg-red-50 border border-red-150 text-red-600 hover:bg-red-100 transition-colors font-bold text-xs uppercase tracking-wider rounded-2xl px-6 py-4 cursor-pointer shadow-sm"
                      >
                        {lang === "mr" ? "काढून टाका" : "Remove"}
                      </button>
                    )}
                  </div>
                </div>



                {/* 1. Photo Frame Styles Picker */}
                <div className="space-y-2 group">
                  <label className="text-xs sm:text-sm font-extrabold text-slate-700 ml-1 tracking-normal block flex items-center justify-between">
                    <span>{lang === "mr" ? "१. फोटो फ्रेम डिझाईन (Frame Style)" : "1. Photo Frame Style"}</span>
                    <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">4 Unique Styles</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "circle", label: "⭕ Royal Ring", labelMr: "⭕ रॉयल रिंग" },
                      { id: "polaroid", label: "📸 Polaroid", labelMr: "📸 पोलरॉइड" },
                      { id: "arch", label: "🏛️ Royal Arch", labelMr: "🏛️ कमानी कमान" },
                      { id: "laurel", label: "🌿 Laurel Crest", labelMr: "🌿 पुष्पहार" },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFrameStyle(f.id as any)}
                        className={`px-3 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1 border cursor-pointer ${
                          frameStyle === f.id
                            ? "bg-amber-500 text-slate-950 border-amber-500 shadow-md scale-105"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {lang === "mr" ? f.labelMr : f.label}
                      </button>
                    ))}
                  </div>
                </div>



                {/* 6. Photo Zoom & Position Adjustment Controls (Only when photo exists) */}
                {studentPhoto && (
                  <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <label className="text-xs font-black text-slate-800 tracking-normal block flex items-center justify-between">
                      <span>{lang === "mr" ? "६. फोटो ॲडजस्टमेंट (Zoom & Position)" : "6. Photo Zoom & Position"}</span>
                      <span className="text-[10px] font-mono text-indigo-600 font-bold">Zoom: {photoScale.toFixed(1)}x</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setPhotoScale((prev) => Math.max(0.8, prev - 0.15))}
                        className="size-8 rounded-lg bg-white border border-slate-300 font-black text-slate-700 flex items-center justify-center hover:bg-slate-100 shadow-sm"
                      >
                        -
                      </button>
                      <input
                        type="range"
                        min="0.8"
                        max="2.2"
                        step="0.05"
                        value={photoScale}
                        onChange={(e) => setPhotoScale(parseFloat(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => setPhotoScale((prev) => Math.min(2.2, prev + 0.15))}
                        className="size-8 rounded-lg bg-white border border-slate-300 font-black text-slate-700 flex items-center justify-center hover:bg-slate-100 shadow-sm"
                      >
                        +
                      </button>
                    </div>



                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-[11px] font-bold text-slate-600">{lang === "mr" ? "स्थान हलवा:" : "Pan:"}</span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPhotoOffsetY((p) => p - 8)}
                          className="px-2.5 py-1 rounded bg-white border border-slate-300 text-[10px] font-bold hover:bg-slate-100"
                        >
                          ▲ {lang === "mr" ? "वर" : "Up"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setPhotoOffsetY(0); setPhotoScale(1); }}
                          className="px-2.5 py-1 rounded bg-white border border-slate-300 text-[10px] font-bold hover:bg-slate-100"
                        >
                          ● {lang === "mr" ? "मध्य" : "Reset"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPhotoOffsetY((p) => p + 8)}
                          className="px-2.5 py-1 rounded bg-white border border-slate-300 text-[10px] font-bold hover:bg-slate-100"
                        >
                          ▼ {lang === "mr" ? "खाली" : "Down"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}



                {/* 2. Typography Style */}
                <div className="space-y-2 group">
                  <label className="text-xs sm:text-sm font-extrabold text-slate-700 ml-1 tracking-normal block">
                    {lang === "mr" ? "२. टायपोग्राफी व फॉन्ट शैली (Typography)" : "2. Typography & Font Style"}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "calligraphy", label: "🖋️ Calligraphy", labelMr: "🖋️ कॅलिग्राफी" },
                      { id: "bold", label: "🔤 Modern Bold", labelMr: "🔤 मॉडर्न बोल्ड" },
                      { id: "serif", label: "📜 Royal Serif", labelMr: "📜 रॉयल सेरिफ" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setHeaderStyle(s.id as any)}
                        className={`px-3 py-2 rounded-2xl text-xs font-black transition-all border cursor-pointer ${
                          headerStyle === s.id
                            ? "bg-slate-900 text-amber-300 border-slate-900 shadow-md scale-102"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {lang === "mr" ? s.labelMr : s.label}
                      </button>
                    ))}
                  </div>
                </div>



                {/* 4 & 5. Studio Lighting Spotlight & Decorative Stickers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Spotlight Toggle */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-800">{lang === "mr" ? "४. स्टुडिओ स्पॉटलाईट" : "4. Studio Spotlight"}</p>
                      <p className="text-[10px] text-slate-500 font-bold">{lang === "mr" ? "नाट्यमय प्रकाशझोत" : "Dramatic Rim Glow"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSpotlightEnabled(!spotlightEnabled)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                        spotlightEnabled
                          ? "bg-amber-400 text-amber-950 shadow-md"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {spotlightEnabled ? "ON" : "OFF"}
                    </button>
                  </div>



                  {/* Stickers Picker */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <p className="text-xs font-black text-slate-800 mb-1.5">{lang === "mr" ? "५. बॅज / स्टिकर" : "5. Badge Sticker"}</p>
                    <div className="flex gap-1.5 justify-between">
                      {[
                        { id: "crown", icon: "👑" },
                        { id: "gifts", icon: "🎁" },
                        { id: "medal", icon: "🏅" },
                        { id: "gradcap", icon: "🎓" },
                        { id: "none", icon: "✖" },
                      ].map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setActiveSticker(st.id as any)}
                          className={`size-8 rounded-xl flex items-center justify-center text-sm font-black border transition-all cursor-pointer ${
                            activeSticker === st.id
                              ? "bg-amber-400 border-amber-500 shadow-md scale-110"
                              : "bg-white border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {st.icon}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>



                <div className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={handleDownloadTemplate}
                      disabled={isDownloading}
                      className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-[0.98] text-white py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/25"
                    >
                      {isDownloading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}{" "}
                      {lang === "mr" ? "डाउनलोड" : lang === "hi" ? "डाउनलोड" : "Download"}
                    </button>



                    <button
                      onClick={handleWhatsAppShare}
                      disabled={isDownloading}
                      className="w-full bg-[#25D366] hover:bg-[#1ebe5b] active:scale-[0.98] text-white py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/25"
                    >
                      {isDownloading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Share2 className="size-4" />
                      )}{" "}
                      {lang === "mr" ? "शेअर" : lang === "hi" ? "शेयर" : "Share"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
        </div>





        {/* Fullscreen Preview Lightbox Modal */}
        <AnimatePresence>
          {showFullPreview && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6"
            >
              <div className="w-full max-w-md flex items-center justify-between text-white pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-amber-400" />
                  <span className="font-black text-sm tracking-wide">
                    {lang === "mr" ? "संपूर्ण कार्ड प्रिव्ह्यू" : "Full Card Preview"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFullPreview(false)}
                  className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>



              {/* Centered Large Card Preview */}
              <div className="flex-1 w-full flex items-center justify-center overflow-hidden py-2">
                <div className="w-full max-w-[340px] sm:max-w-[420px] aspect-[3/4] max-h-[75vh] flex items-center justify-center">
                  <div className="w-full h-full rounded-[2.5rem] shadow-2xl overflow-hidden relative border-4 sm:border-6 border-white">
                    {selectedBgImage ? (
                      <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <img
                          src={selectedBgImage}
                          alt="Template Atmosphere"
                          className="w-full h-full object-cover object-center filter brightness-[0.52] contrast-[1.2] scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/60 mix-blend-multiply" />
                      </div>
                    ) : (
                      <div className="absolute inset-0" style={{ background: configToUse.bg }} />
                    )}
                    <CardBackgroundThemeLayer themeType={selectedBgTheme} templateId={templateId} />
                    <CornerOrnaments color="#fef08a" />
                    {isBirthday && (
                      <>
                        <CelebrationBalloonsLeft />
                        <CelebrationBalloonsRight />
                      </>
                    )}
                    <FloatingSparkles />
                    <div className="relative z-10 w-full h-full flex flex-col items-center justify-between p-3 sm:p-4 text-center overflow-hidden">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 backdrop-blur-md mb-2 shrink-0">
                        <Sparkles className="size-3 text-amber-300" />
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-200">
                      {isBirthday
                        ? (lang === "mr" ? "✦ विशेष वाढदिवस सोहळा ✦" : "✦ SPECIAL BIRTHDAY CELEBRATION ✦")
                        : isStudentOfMonth
                          ? (lang === "mr" ? "★ महिन्याचा विद्यार्थी • अधिकृत गौरव ★" : "★ STUDENT OF THE MONTH • OFFICIAL AWARD ★")
                          : isIdCard
                            ? (lang === "mr" ? "★ अधिकृत विद्यार्थी ओळखपत्र ★" : "★ OFFICIAL STUDENT IDENTITY CARD ★")
                            : isResult
                              ? (lang === "mr" ? "★ शैक्षणिक प्रगती व गुणवत्ता अहवाल ★" : "★ ACADEMIC PROGRESS & MERIT REPORT ★")
                              : isProfile
                                ? (lang === "mr" ? "★ अधिकृत विद्यार्थी प्रोफाइल डॉझियर ★" : "★ OFFICIAL STUDENT PROFILE DOSSIER ★")
                                : isAchievement
                                  ? (lang === "mr" ? "★ विशेष प्राविण्य व प्रशस्तीपत्रक ★" : "★ OFFICIAL MERIT & ACHIEVEMENT AWARD ★")
                                  : isAdmission
                                    ? (lang === "mr" ? "★ शाळेत सहर्ष स्वागत ★" : "★ WELCOME TO OUR SCHOOL FAMILY ★")
                                    : isSports
                                      ? (lang === "mr" ? "★ क्रीडा स्पर्धा विजेता गौरव ★" : "★ CHAMPIONSHIP ATHLETE • SPORTS MERIT ★")
                                      : isAnnual
                                        ? (lang === "mr" ? "✦ वार्षिक स्नेहसंमेलन सोहळा ✦" : "✦ ANNUAL FUNCTION CELEBRATION ✦")
                                        : isCultural
                                          ? (lang === "mr" ? "★ सांस्कृतिक कला महोत्सव ★" : "★ CULTURAL FESTIVAL & TALENT SHOW ★")
                                          : (lang === "mr" ? "✦ शैक्षणिक उत्कृष्टता ✦" : "✦ SCHOLASTIC EXCELLENCE ✦")}
                        </span>
                      </div>
                      <div className="relative my-1 shrink-0">
                        {frameStyle === "polaroid" ? (
                          <div className="w-32 h-40 bg-white p-2 pb-6 rounded-sm shadow-xl rotate-[-2deg] relative border border-slate-100">
                            <RealisticPaperclipSVG className="absolute -top-3.5 -left-2 size-9 pointer-events-none z-30 drop-shadow-md" color="#fbbf24" />
                            <div className="w-full h-full overflow-hidden bg-slate-900 border border-slate-200/50 relative">
                              <img src={displayPhoto} alt={studentName} className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute bottom-1.5 left-0 right-0 text-center">
                              <p className="text-[10px] font-black text-slate-800 tracking-widest uppercase truncate px-2 font-serif">★ {studentName} ★</p>
                            </div>
                          </div>
                        ) : frameStyle === "arch" ? (
                          <div className="w-32 h-40 rounded-t-[5rem] rounded-b-xl p-1.5 bg-gradient-to-t from-amber-600 via-amber-300 to-yellow-100 shadow-xl border border-white relative">
                            <div className="w-full h-full rounded-t-[7.5rem] rounded-b-xl overflow-hidden bg-slate-900 relative">
                              <img src={displayPhoto} alt={studentName} className="w-full h-full object-cover" />
                            </div>
                          </div>
                        ) : frameStyle === "laurel" ? (
                          <div className="relative flex items-center justify-center">
                            <GoldenLaurelWreath className="size-44 absolute pointer-events-none z-20" />
                            <div className="size-28 rounded-full p-1.5 bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-600 shadow-xl border-2 border-white/80 overflow-hidden relative">
                              <img src={displayPhoto} alt={studentName} className="w-full h-full object-cover rounded-full" />
                            </div>
                          </div>
                        ) : (
                          <div className="relative size-28 rounded-full p-1.5 bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-600 shadow-xl border-2 border-white/80">
                            <div className="w-full h-full rounded-full overflow-hidden relative">
                              <img src={displayPhoto} alt={studentName} className="w-full h-full object-cover rounded-full" />
                            </div>
                          </div>
                        )}
                      </div>
                      <h1 className="text-lg sm:text-xl font-serif italic font-black text-amber-200">{configToUse.title}</h1>
                      <div className="space-y-0.5">
                        <p className="text-amber-200/80 text-[10px] uppercase tracking-widest">{lang === "mr" ? "गौरवमूर्ती" : "Presented To"}</p>
                        <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-400 bg-clip-text text-transparent">{studentName}</h2>
                      </div>
                      <div className="bg-black/35 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15 max-w-[90%] mx-auto">
                        <p className="text-white/95 font-medium text-xs italic">"{configToUse.quote}"</p>
                      </div>
                      <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-500/20 border border-amber-300/40 px-3.5 py-1 rounded-full backdrop-blur-md inline-flex items-center gap-1.5">
                        <GraduationCap className="size-4 text-amber-300" />
                        <span className="text-amber-100 font-black text-xs uppercase">{studentClass}</span>
                        <Star className="size-3 text-amber-300 fill-amber-300" />
                      </div>
                      <div className="w-full pt-2 border-t border-white/15 flex items-center justify-center px-2 sm:px-3 text-amber-200/90 shrink-0">
                        <div className="w-full bg-black/40 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-xl border border-white/15 flex items-center justify-between gap-2 shadow-sm">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="size-6 rounded-lg bg-amber-400/25 border border-amber-300/40 flex items-center justify-center shrink-0">
                              <Heart className="size-3 text-pink-300 fill-pink-400/50" />
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <span className="text-[9px] sm:text-[10px] font-extrabold text-amber-300 tracking-wider uppercase shrink-0">
                                {lang === "mr" ? "शुभेच्छुक :" : lang === "hi" ? "शुभचिंतक :" : "Best Wishes :"}
                              </span>
                              <span className="text-[10px] sm:text-[11px] font-black text-white tracking-wide uppercase truncate drop-shadow-sm">
                                {wisherName || (lang === "mr" ? "मुख्याध्यापक व शिक्षक वृंद" : "Principal & Teaching Staff")}
                              </span>
                            </div>
                          </div>
                          <Sparkles className="size-3 text-amber-300 shrink-0" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>



              {/* Action Buttons */}
              <div className="w-full max-w-sm flex items-center gap-3 pt-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowFullPreview(false);
                    handleDownloadTemplate();
                  }}
                  disabled={isDownloading}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
                >
                  <Download className="size-4" />
                  {lang === "mr" ? "डाउनलोड" : "Download"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowFullPreview(false);
                    handleWhatsAppShare();
                  }}
                  disabled={isDownloading}
                  className="flex-1 bg-[#25D366] text-white py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
                >
                  <Share2 className="size-4" />
                  {lang === "mr" ? "शेअर करा" : "Share"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>



</main>
    </div>
  );
}
