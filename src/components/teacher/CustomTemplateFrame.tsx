import React from "react";
import {
  CardBackgroundThemeLayer,
  RealisticPaperclipSVG,
  CelebrationGiftBoxSVG,
  GoldenLaurelWreath,
  OverheadSpotlightBeam,
} from "./CreativeCardDecorations";
import {
  Crown,
  Cake,
  Award,
  CreditCard,
  User,
  Trophy,
  Sparkles,
  Rocket,
  Flame,
  Zap,
  Star,
  GraduationCap,
  Shield,
  Medal,
  BookOpen,
  Calendar,
  CheckCircle2,
  QrCode,
  Heart,
  PartyPopper,
} from "lucide-react";

export interface CustomTemplateProps {
  category:
    | "studentofmonth"
    | "birthday"
    | "idcard"
    | "achievement"
    | "result"
    | "profile"
    | "admission"
    | "annual"
    | "sports"
    | "cultural";
  variantId?: number | string;
  studentName?: string;
  studentPhoto?: string | null;
  studentClass?: string;
  schoolName?: string;
  cardTitle?: string;
  cardQuote?: string;
  rollNo?: string;
  dob?: string;
  gender?: string;
  totalMarks?: string;
  obtainedMarks?: string;
  percentage?: string;
  grade?: string;
  barcodeNumber?: string;
  className?: string;
  interactive?: boolean;
  onCanvasReady?: any;
  frameStyle?: "circle" | "polaroid" | "arch" | "laurel";
  sticker?: "crown" | "gifts" | "medal" | "gradcap" | "none";
}

export interface TemplateThemeItem {
  id: number;
  name: string;
  nameMr: string;
  bg: string;
  bgImage?: string;
  accent: string;
  icon: any;
  category: string;
  subCategory?: string;
}

// -------------------------------------------------------------
// SIMPLE, ATTRACTIVE GRADIENT PRESETS FOR ALL CATEGORIES
// -------------------------------------------------------------
export const SIMPLE_THEMES: Record<string, TemplateThemeItem[]> = {
  studentofmonth: [
    {
      id: 1,
      name: "Royale Gold Spotlight",
      nameMr: "रॉयल गोल्ड सोहळा",
      bg: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)",
      bgImage: "/templates/studentofmonth_red_carpet_3d.jpg",
      accent: "linear-gradient(to right, #fbbf24, #f59e0b, #d97706)",
      icon: Crown,
      category: "Royale",
      subCategory: "Honor Roll",
    },
    {
      id: 2,
      name: "Crimson Honor Gala",
      nameMr: "क्रिम्सन सन्मान सोहळा",
      bg: "linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)",
      bgImage: "/templates/studentofmonth_library_3d.jpg",
      accent: "linear-gradient(to right, #f87171, #fb923c, #facc15)",
      icon: Trophy,
      category: "Grand",
      subCategory: "Champion",
    },
    {
      id: 3,
      name: "Sapphire Hall of Fame",
      nameMr: "सॅफायर हॉल ऑफ फेम",
      bg: "linear-gradient(135deg, #0c4a6e 0%, #082f49 100%)",
      bgImage: "/templates/studentofmonth_clean_3d.jpg",
      accent: "linear-gradient(to right, #38bdf8, #818cf8, #2dd4bf)",
      icon: Star,
      category: "Honor",
      subCategory: "Valedictorian",
    },
    {
      id: 4,
      name: "Emerald Distinction",
      nameMr: "एमराल्ड गुणवत्ता सन्मान",
      bg: "linear-gradient(135deg, #064e3b 0%, #022c22 100%)",
      accent: "linear-gradient(to right, #34d399, #6ee7b7, #10b981)",
      icon: Award,
      category: "Elite",
      subCategory: "Summa Cum Laude",
    },
    {
      id: 5,
      name: "Imperial Purple Sovereign",
      nameMr: "इम्पिरियल पर्पल गौरव",
      bg: "linear-gradient(135deg, #3b0764 0%, #1e1b4b 100%)",
      accent: "linear-gradient(to right, #c084fc, #e879f9, #f472b6)",
      icon: Crown,
      category: "Imperial",
      subCategory: "Leadership",
    },
    {
      id: 6,
      name: "Golden Jubilee Star",
      nameMr: "गोल्डन ज्युबिली स्टार",
      bg: "linear-gradient(135deg, #2d1b0f 0%, #1a0f0a 100%)",
      accent: "linear-gradient(to right, #bf953f, #fcf6ba, #b38728)",
      icon: Sparkles,
      category: "Jubilee",
      subCategory: "Merit Star",
    },
  ],
  birthday: [
    {
      id: 1,
      name: "Chocolate Gold Royale",
      nameMr: "चॉकलेट गोल्ड रॉयल",
      bg: "linear-gradient(135deg, #2d1b0f 0%, #1a0f0a 100%)",
      accent: "linear-gradient(to right, #bf953f, #fcf6ba, #b38728)",
      icon: Crown,
      category: "Elite",
      subCategory: "Royale Wish",
    },
    {
      id: 2,
      name: "Cosmic Celebration",
      nameMr: "कॉस्मिक सेलिब्रेशन",
      bg: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
      accent: "linear-gradient(to right, #818cf8, #c084fc, #e879f9)",
      icon: Rocket,
      category: "Modern",
      subCategory: "Galaxy Fiesta",
    },
    {
      id: 3,
      name: "Emerald Garden",
      nameMr: "एमराल्ड गार्डन",
      bg: "linear-gradient(135deg, #064e3b 0%, #022c22 100%)",
      accent: "linear-gradient(to right, #34d399, #6ee7b7, #10b981)",
      icon: Sparkles,
      category: "Premium",
      subCategory: "Nature Joy",
    },
    {
      id: 4,
      name: "Fiery Success",
      nameMr: "फायरी सक्सेस",
      bg: "linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)",
      accent: "linear-gradient(to right, #f87171, #fb923c, #facc15)",
      icon: Flame,
      category: "Dynamic",
      subCategory: "Celebration",
    },
    {
      id: 5,
      name: "Oceanic Sparkle",
      nameMr: "ओशनिक स्पार्कल",
      bg: "linear-gradient(135deg, #0c4a6e 0%, #082f49 100%)",
      accent: "linear-gradient(to right, #38bdf8, #818cf8, #2dd4bf)",
      icon: Zap,
      category: "Elite",
      subCategory: "Aqua Star",
    },
    {
      id: 6,
      name: "Rose Gold Blossom",
      nameMr: "रोझ गोल्ड ब्लॉसम",
      bg: "linear-gradient(135deg, #4c0519 0%, #881337 100%)",
      accent: "linear-gradient(to right, #fda4af, #f43f5e, #fb7185)",
      icon: Cake,
      category: "Blossom",
      subCategory: "Sweet Joy",
    },
  ],
  idcard: [
    {
      id: 1,
      name: "Navy Executive ID",
      nameMr: "नेव्ही एक्झिक्युटिव्ह आयडी",
      bg: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
      accent: "linear-gradient(to right, #60a5fa, #93c5fd, #3b82f6)",
      icon: CreditCard,
      category: "Executive",
      subCategory: "Official Pass",
    },
    {
      id: 2,
      name: "Burgundy Prestige ID",
      nameMr: "बर्गंडी प्रेस्टीज आयडी",
      bg: "linear-gradient(135deg, #450a0a 0%, #1c1917 100%)",
      accent: "linear-gradient(to right, #f87171, #fbbf24, #f87171)",
      icon: Shield,
      category: "Prestige",
      subCategory: "Student ID",
    },
    {
      id: 3,
      name: "Emerald Scholar ID",
      nameMr: "एमराल्ड स्कॉलर आयडी",
      bg: "linear-gradient(135deg, #064e3b 0%, #0f172a 100%)",
      accent: "linear-gradient(to right, #34d399, #a7f3d0, #10b981)",
      icon: GraduationCap,
      category: "Scholar",
      subCategory: "Smart Campus",
    },
  ],
  achievement: [
    {
      id: 1,
      name: "Elite Scholar Award",
      nameMr: "एलिट स्कॉलर सन्मान",
      bg: "linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%)",
      bgImage: "/templates/achievement_clean_3d.jpg",
      accent: "linear-gradient(to right, #fbbf24, #f59e0b, #d97706)",
      icon: Trophy,
      category: "Academic",
      subCategory: "Merit Citation",
    },
    {
      id: 2,
      name: "Golden Laurel Honor",
      nameMr: "गोल्डन लॉरेल गौरव",
      bg: "linear-gradient(135deg, #064e3b 0%, #0f172a 100%)",
      accent: "linear-gradient(to right, #34d399, #facc15, #10b981)",
      icon: Award,
      category: "Honor",
      subCategory: "Valedictorian",
    },
  ],
  result: [
    {
      id: 1,
      name: "Championship Scorecard",
      nameMr: "चॅम्पियनशिप गुणपत्रिका",
      bg: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
      accent: "linear-gradient(to right, #38bdf8, #818cf8, #2dd4bf)",
      icon: Trophy,
      category: "Championship",
      subCategory: "Annual Score",
    },
  ],
  profile: [
    {
      id: 1,
      name: "Holistic Student Bio",
      nameMr: "होलिस्टिक विद्यार्थी बायो",
      bg: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      accent: "linear-gradient(to right, #38bdf8, #818cf8, #c084fc)",
      icon: User,
      category: "Bio",
      subCategory: "Comprehensive",
    },
  ],
};

export const TEMPLATE_THEMES = SIMPLE_THEMES;

/**
 * CustomTemplateFrame — Attractive, Content-Rich & 100% Reliable Card
 */
export function CustomTemplateFrame({
  category = "birthday",
  variantId = 1,
  studentName = "SATYAJIT PATIL",
  studentPhoto = null,
  studentClass = "5th",
  schoolName = "Zilla Parishad Primary School",
  cardTitle = "",
  cardQuote = "",
  rollNo = "12",
  dob = "04/05/2015",
  gender = "Male",
  totalMarks = "500",
  obtainedMarks = "452",
  percentage = "90.40%",
  grade = "A+",
  barcodeNumber = "202600012",
  className = "",
  frameStyle,
  sticker = "crown",
}: CustomTemplateProps) {
  const numericId =
    typeof variantId === "number"
      ? variantId
      : parseInt(String(variantId).replace(/[^0-9]/g, "") || "1", 10) || 1;

  const categoryList = SIMPLE_THEMES[category] || SIMPLE_THEMES.birthday;
  const themeIndex = (Math.max(1, numericId) - 1) % categoryList.length;
  const theme = categoryList[themeIndex] || categoryList[0];
  const IconComponent = theme.icon || Sparkles;

  const displayTitle =
    cardTitle ||
    (category === "studentofmonth"
      ? "STUDENT OF THE MONTH"
      : category === "birthday"
        ? "HAPPY BIRTHDAY!"
        : category === "idcard"
          ? "STUDENT IDENTITY PASS"
          : category === "achievement"
            ? "CERTIFICATE OF MERIT"
            : category === "result"
              ? "ANNUAL PROGRESS REPORT"
              : category === "profile"
                ? "STUDENT SCHOLAR DOSSIER"
                : "CELEBRATION OF EXCELLENCE");

  const displayQuote =
    cardQuote ||
    (category === "birthday"
      ? "May your special day be filled with endless happiness, bright smiles, and magnificent triumphs!"
      : category === "studentofmonth"
        ? "Honored for outstanding academic performance, exemplary character, and school leadership."
        : category === "achievement"
          ? "In recognition of exceptional achievement, continuous dedication, and scholastic excellence."
          : category === "result"
            ? "Exemplary scholastic performance and remarkable progress throughout the academic term."
            : "Dedicated to academic excellence, disciplined leadership, and lifelong learning.");

  return (
    <div
      className={`relative aspect-square w-full rounded-[2.5rem] overflow-hidden shadow-2xl p-5 sm:p-7 flex flex-col justify-between text-white select-none border-2 sm:border-3 border-white/20 group ${className}`}
      style={{ background: theme.bg }}
    >
      {/* Realistic Background Image */}
      {theme.bgImage ? (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <img
            src={theme.bgImage}
            alt={theme.name}
            className="w-full h-full object-cover object-center filter brightness-[0.52] contrast-[1.2] scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/60 mix-blend-multiply" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_25%,rgba(0,0,0,0.85)_100%)]" />
        </div>
      ) : (
        <>
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none" />
          <CardBackgroundThemeLayer themeType="auto" templateId={category} />
        </>
      )}

      {/* Decorative Golden Corner Accents */}
      <div className="absolute top-2 left-2 size-4 border-t-2 border-l-2 border-amber-300/50 rounded-tl pointer-events-none" />
      <div className="absolute top-2 right-2 size-4 border-t-2 border-r-2 border-amber-300/50 rounded-tr pointer-events-none" />
      <div className="absolute bottom-2 left-2 size-4 border-b-2 border-l-2 border-amber-300/50 rounded-bl pointer-events-none" />
      <div className="absolute bottom-2 right-2 size-4 border-b-2 border-r-2 border-amber-300/50 rounded-br pointer-events-none" />

      {/* ── 1. Top Header: School Branding & Session ── */}
      <div className="relative z-10 flex items-center justify-between w-full">
        <div className="flex items-center gap-2.5">
          <div className="size-10 rounded-2xl bg-white/12 backdrop-blur-md flex items-center justify-center border border-white/25 shadow-md group-hover:scale-105 transition-transform">
            <IconComponent className="size-5 text-amber-300 drop-shadow-sm" />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black tracking-widest uppercase text-white/75 truncate max-w-[190px]">
              {schoolName}
            </p>
            <p className="text-xs font-black tracking-wider uppercase text-amber-300 drop-shadow-sm">
              {displayTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-amber-300 shadow-sm flex items-center gap-1">
            <Sparkles className="size-2.5 text-amber-300" />
            {theme.category}
          </span>
          <span className="hidden sm:inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-white/10 border border-white/15 text-white/70">
            2026-27
          </span>
        </div>
      </div>

      {/* ── 2. Center Hero: Student Portrait + Dynamic Content ── */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto py-1">
        {/* Prominent Hero Photo Container with Multi-Layered Golden Bevel */}
        <div className="relative my-2 sm:my-3">
          {studentPhoto ? (
            (() => {
              const effectiveFrame = frameStyle || (category === "birthday" && numericId === 1 ? "polaroid" : category === "studentofmonth" && numericId === 2 ? "arch" : "circle");

              if (effectiveFrame === "polaroid") {
                return (
                  <div className="w-32 h-40 sm:w-36 sm:h-44 bg-white p-2 pb-6 rounded-sm shadow-2xl rotate-[-2deg] relative border border-slate-100 group-hover:scale-105 transition-transform duration-300">
                    <RealisticPaperclipSVG className="absolute -top-3 -left-2 size-7 pointer-events-none z-20" color="#f59e0b" />
                    <div className="w-full h-full overflow-hidden bg-slate-900 border border-slate-200">
                      <img src={studentPhoto} alt={studentName} className="size-full object-cover" />
                    </div>
                    <p className="text-[8px] font-black text-slate-800 tracking-wider uppercase text-center mt-1 truncate">
                      ★ {studentName} ★
                    </p>
                  </div>
                );
              }

              if (effectiveFrame === "arch") {
                return (
                  <div className="w-32 h-40 sm:w-36 sm:h-44 rounded-t-[5rem] rounded-b-xl p-1.5 bg-gradient-to-t from-amber-500 via-yellow-200 to-amber-400 shadow-2xl border border-white relative group-hover:scale-105 transition-transform duration-300">
                    <div className="w-full h-full rounded-t-[4.5rem] rounded-b-lg overflow-hidden bg-slate-900">
                      <img src={studentPhoto} alt={studentName} className="size-full object-cover" />
                    </div>
                  </div>
                );
              }

              return (
                <div className="size-32 sm:size-36 md:size-40 rounded-full p-1.5 bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-600 shadow-[0_15px_35px_rgba(0,0,0,0.7)] drop-shadow-[0_0_20px_rgba(251,191,36,0.35)] border-2 border-white/80 group-hover:scale-105 transition-transform duration-300 relative">
                  <div className="size-full rounded-full overflow-hidden border border-amber-950/20 shadow-inner">
                    <img
                      src={studentPhoto}
                      alt={studentName}
                      className="size-full object-cover"
                    />
                  </div>

                  {/* Top Crown Honor Badge */}
                  {sticker === "crown" && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-950 border border-white text-[8px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md whitespace-nowrap">
                      <Crown className="size-2.5 fill-amber-950" />
                      <span>{category === "birthday" ? "BIRTHDAY STAR" : category === "studentofmonth" ? "TOP SCHOLAR" : "HONORED"}</span>
                    </div>
                  )}

                  {/* Bottom Star Badge */}
                  <div className="absolute bottom-0 right-1 size-7 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center border border-white shadow-md rotate-12">
                    <Star className="size-3.5 fill-slate-950" />
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="size-28 sm:size-32 rounded-full bg-white/12 backdrop-blur-md flex items-center justify-center border-2 border-white/30 shadow-2xl p-2 group-hover:scale-105 transition-transform duration-300 relative">
              <div className="size-full rounded-full border border-amber-300/40 flex items-center justify-center bg-black/20">
                <IconComponent className="size-12 text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
              </div>
              <div className="absolute -bottom-1 -right-1 size-7 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center border border-white shadow-md">
                <Star className="size-3.5 fill-slate-950" />
              </div>
            </div>
          )}
        </div>

        {/* Shimmer Divider */}
        <div
          className="h-1 w-14 rounded-full mb-2 shadow-sm"
          style={{ background: theme.accent }}
        />

        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-0.5">
          Presented To
        </p>

        {/* Large Bold Student Name in Gradient Typography */}
        <h2
          className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight px-2 max-w-full truncate py-0.5"
          style={{
            backgroundImage: theme.accent,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.5))",
          }}
        >
          {studentName}
        </h2>

        {/* Dynamic Category-Specific Content Badges */}
        {category === "birthday" && (
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] font-extrabold bg-pink-500/20 text-pink-200 border border-pink-400/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <PartyPopper className="size-3 text-pink-300" />
              Special Celebration
            </span>
            <span className="text-[10px] font-extrabold bg-amber-500/20 text-amber-200 border border-amber-400/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Cake className="size-3 text-amber-300" />
              Joy & Blessings
            </span>
          </div>
        )}

        {category === "studentofmonth" && (
          <div className="flex items-center gap-1.5 mt-1.5 text-amber-300">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="size-3 fill-amber-300 text-amber-300" />
            ))}
            <span className="text-[10px] font-black tracking-wider text-white/90 ml-1">
              STAR SCHOLAR
            </span>
          </div>
        )}

        {category === "idcard" && (
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] font-mono font-bold bg-white/10 px-2.5 py-0.5 rounded-md border border-white/20 text-cyan-200">
              DOB: {dob}
            </span>
            <span className="text-[10px] font-mono font-bold bg-white/10 px-2.5 py-0.5 rounded-md border border-white/20 text-amber-200">
              ID: {barcodeNumber}
            </span>
          </div>
        )}

        {category === "achievement" && (
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] font-extrabold bg-amber-500/25 text-amber-200 border border-amber-400/40 px-3 py-0.5 rounded-full flex items-center gap-1">
              <Medal className="size-3 text-amber-300" />
              Outstanding Distinction
            </span>
          </div>
        )}

        {category === "result" && (
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] font-black bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 px-2.5 py-0.5 rounded-full">
              Grade: {grade}
            </span>
            <span className="text-[10px] font-black bg-purple-500/25 text-purple-200 border border-purple-400/40 px-2.5 py-0.5 rounded-full">
              Score: {obtainedMarks}/{totalMarks} ({percentage})
            </span>
          </div>
        )}

        {/* Quote / Wishing Message */}
        <p className="text-[10px] sm:text-xs italic text-white/85 max-w-sm mt-2 line-clamp-2 px-3 font-medium leading-relaxed">
          "{displayQuote}"
        </p>
      </div>

      {/* ── 3. Bottom Footer: Class, Official Seal & Badges ── */}
      <div className="relative z-10 flex items-center justify-between w-full pt-2.5 border-t border-white/12">
        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1 rounded-full bg-white/12 backdrop-blur-md border border-white/20 shadow-sm">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-300">
              Class : {studentClass} {rollNo ? `| Roll : ${rollNo}` : ""}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider text-white/70 bg-black/25 px-2.5 py-1 rounded-full border border-white/10">
          <CheckCircle2 className="size-3 text-emerald-400" />
          <span>Official Award</span>
        </div>
      </div>

      {/* Shimmer Sweep Effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
    </div>
  );
}

export default CustomTemplateFrame;
