import { createFileRoute, Outlet, useNavigate, useLocation, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import {
  CreditCard,
  Crown,
  Cake,
  Award,
  User,
  Trophy,
  GraduationCap,
  Flag,
  Music,
  Sparkles,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { ModulePaywall } from "@/components/teacher/ModulePaywall";
import { useState, useRef, useCallback } from "react";

export const Route = createFileRoute("/teacher/templates")({
  component: TemplatesLayout,
});

const CATEGORIES = [
  {
    id: "idcard",
    titleMr: "शाळा ओळखपत्र (School ID)",
    titleHi: "स्कूल आईडी कार्ड",
    titleEn: "School ID Card",
    descMr: "बारकोड व गोल्ड फ्रेमसह डिजिटल आयडी",
    to: "/teacher/templates/idcard",
    icon: CreditCard,
    color: "from-amber-700 via-rose-800 to-amber-900",
    gradientBg: "linear-gradient(145deg, #b45309 0%, #9f1239 55%, #78350f 100%)",
    shadowColor: "rgba(180,83,9,0.55)",
    shadow: "hover:shadow-[0_20px_45px_rgba(180,83,9,0.4)]",
    border: "border-amber-400/30",
    textLight: "text-amber-200",
    badge: "3D Realistic",
  },
  {
    id: "studentofmonth",
    titleMr: "महिन्याचा विद्यार्थी (Star Student)",
    titleHi: "महीने का छात्र",
    titleEn: "Student of the Month",
    descMr: "रॉयल मुकुट, ट्रॉफी व स्टेज लाईट्स",
    to: "/teacher/templates/studentofmonth",
    icon: Crown,
    color: "from-indigo-900 via-blue-900 to-slate-950",
    gradientBg: "linear-gradient(145deg, #312e81 0%, #1e3a8a 55%, #020617 100%)",
    shadowColor: "rgba(99,102,241,0.55)",
    shadow: "hover:shadow-[0_20px_45px_rgba(99,102,241,0.4)]",
    border: "border-indigo-400/30",
    textLight: "text-indigo-200",
    badge: "Royale Gold",
  },
  {
    id: "birthday",
    titleMr: "वाढदिवस शुभेच्छा (Birthday Wishes)",
    titleHi: "जन्मदिन शुभकामनाएं",
    titleEn: "Happy Birthday",
    descMr: "पोलारॉइड फोटो, ३D केक व फुगे",
    to: "/teacher/templates/birthday",
    icon: Cake,
    color: "from-rose-500 via-pink-500 to-fuchsia-600",
    gradientBg: "linear-gradient(145deg, #f43f5e 0%, #ec4899 50%, #a21caf 100%)",
    shadowColor: "rgba(244,63,94,0.55)",
    shadow: "hover:shadow-[0_20px_45px_rgba(244,63,94,0.4)]",
    border: "border-pink-300/30",
    textLight: "text-pink-100",
    badge: "3D Polaroid",
  },
  {
    id: "achievement",
    titleMr: "प्रशस्तीपत्रक (Achievement)",
    titleHi: "प्रशस्ति पत्र",
    titleEn: "Achievement Certificate",
    descMr: "गोल्ड मेडल, रिबन व क्लासिक फ्रेम",
    to: "/teacher/templates/achievement",
    icon: Award,
    color: "from-slate-900 via-blue-950 to-amber-950",
    gradientBg: "linear-gradient(145deg, #0f172a 0%, #1e3a5f 50%, #451a03 100%)",
    shadowColor: "rgba(234,179,8,0.55)",
    shadow: "hover:shadow-[0_20px_45px_rgba(234,179,8,0.4)]",
    border: "border-yellow-400/30",
    textLight: "text-amber-200",
    badge: "Gold Seal",
  },
  {
    id: "profile",
    titleMr: "विद्यार्थी प्रोफाइल (Student Profile)",
    titleHi: "छात्र प्रोफ़ाइल",
    titleEn: "Student Profile",
    descMr: "माहिती व ३D छंद/क्रीडा कार्ड्स",
    to: "/teacher/templates/profile",
    icon: User,
    color: "from-amber-600 via-orange-600 to-yellow-600",
    gradientBg: "linear-gradient(145deg, #d97706 0%, #ea580c 50%, #ca8a04 100%)",
    shadowColor: "rgba(249,115,22,0.55)",
    shadow: "hover:shadow-[0_20px_45px_rgba(249,115,22,0.4)]",
    border: "border-orange-300/30",
    textLight: "text-orange-100",
    badge: "Modern Bio",
  },
  {
    id: "result",
    titleMr: "निकाल व प्रगती (Result Card)",
    titleHi: "रिजल्ट व प्रगति पत्र",
    titleEn: "Result / Progress Card",
    descMr: "रॉयल शील्ड, ग्रेड व गुणतक्ता",
    to: "/teacher/templates/result",
    icon: Trophy,
    color: "from-purple-900 via-violet-900 to-indigo-950",
    gradientBg: "linear-gradient(145deg, #581c87 0%, #4c1d95 50%, #1e1b4b 100%)",
    shadowColor: "rgba(168,85,247,0.55)",
    shadow: "hover:shadow-[0_20px_45px_rgba(168,85,247,0.4)]",
    border: "border-purple-400/30",
    textLight: "text-purple-200",
    badge: "Shield Crest",
  },
  {
    id: "admission",
    titleMr: "प्रवेश स्वागत (Admission)",
    titleHi: "प्रवेश स्वागत",
    titleEn: "Admission Welcome",
    descMr: "शाळा प्रवेश जाहिरात व स्वागत पत्रक",
    to: "/teacher/templates/admission",
    icon: GraduationCap,
    color: "from-blue-600 via-cyan-600 to-teal-700",
    gradientBg: "linear-gradient(145deg, #2563eb 0%, #0891b2 50%, #0f766e 100%)",
    shadowColor: "rgba(6,182,212,0.55)",
    shadow: "hover:shadow-[0_20px_45px_rgba(6,182,212,0.4)]",
    border: "border-cyan-300/30",
    textLight: "text-cyan-100",
    badge: "Welcome",
  },
  {
    id: "sports",
    titleMr: "क्रीडा स्पर्धा (Sports Day)",
    titleHi: "खेलकूद दिवस",
    titleEn: "Sports Day",
    descMr: "विजयी खेळाडू गौरव व आमंत्रण",
    to: "/teacher/templates/sports",
    icon: Flag,
    color: "from-red-600 via-orange-600 to-amber-700",
    gradientBg: "linear-gradient(145deg, #dc2626 0%, #ea580c 50%, #b45309 100%)",
    shadowColor: "rgba(239,68,68,0.55)",
    shadow: "hover:shadow-[0_20px_45px_rgba(239,68,68,0.4)]",
    border: "border-red-400/30",
    textLight: "text-red-100",
    badge: "Victory",
  },
  {
    id: "annual",
    titleMr: "वार्षिक स्नेहसंमेलन (Annual)",
    titleHi: "वार्षिक स्नेह सम्मेलन",
    titleEn: "Annual Function",
    descMr: "वार्षिक स्नेहसंमेलन आमंत्रण पत्रिका",
    to: "/teacher/templates/annual",
    icon: Sparkles,
    color: "from-teal-700 via-emerald-800 to-slate-900",
    gradientBg: "linear-gradient(145deg, #0f766e 0%, #065f46 50%, #0f172a 100%)",
    shadowColor: "rgba(20,184,166,0.55)",
    shadow: "hover:shadow-[0_20px_45px_rgba(20,184,166,0.4)]",
    border: "border-teal-300/30",
    textLight: "text-teal-100",
    badge: "Grand Stage",
  },
  {
    id: "cultural",
    titleMr: "सांस्कृतिक महोत्सव (Cultural)",
    titleHi: "सांस्कृतिक कार्यक्रम",
    titleEn: "Cultural Gathering",
    descMr: "नाट्य, नृत्य व कला महोत्सव",
    to: "/teacher/templates/cultural",
    icon: Music,
    color: "from-fuchsia-700 via-pink-700 to-rose-900",
    gradientBg: "linear-gradient(145deg, #a21caf 0%, #be185d 50%, #881337 100%)",
    shadowColor: "rgba(217,70,239,0.55)",
    shadow: "hover:shadow-[0_20px_45px_rgba(217,70,239,0.4)]",
    border: "border-fuchsia-300/30",
    textLight: "text-fuchsia-100",
    badge: "Festive",
  },
];

function TemplatesLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useLanguage();
  // Per-card 3D tilt state: cardId → { rotX, rotY, shimmerX, shimmerY }
  const [tilts, setTilts] = useState<Record<string, { rx: number; ry: number; sx: number; sy: number }>>({});

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>, catId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    // Max tilt 12°
    const rx = -((y - cy) / cy) * 12;
    const ry = ((x - cx) / cx) * 12;
    // Shimmer highlight position (0-100%)
    const sx = (x / rect.width) * 100;
    const sy = (y / rect.height) * 100;
    setTilts(prev => ({ ...prev, [catId]: { rx, ry, sx, sy } }));
  }, []);

  const handleMouseLeave = useCallback((catId: string) => {
    setTilts(prev => ({ ...prev, [catId]: { rx: 0, ry: 0, sx: 50, sy: 30 } }));
  }, []);

  const isIndex =
    location.pathname === "/teacher/templates" ||
    location.pathname === "/teacher/templates/";

  if (isIndex) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <TeacherHeader />
        <TeacherSidebar />

        <main className="lg:pl-0 pt-16 min-h-screen">
          <ModulePaywall
            moduleId="templates"
            defaultTitle="शुभेच्छा व कार्यक्रम पत्रिका टेम्पलेट्स (Templates)"
          >
            <div className="p-4 md:p-8 w-full max-w-7xl mx-auto space-y-8 flex flex-col justify-center min-h-[calc(100vh-8rem)]">
              <div className="flex items-center justify-between gap-4 w-full">
                <Link
                  to="/teacher"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <ArrowLeft className="size-4" /> मुख्य डॅशबोर्डवर मागे जा (Back to Dashboard)
                </Link>
                <span className="text-xs font-black px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 rounded-full shadow-md">
                  ✨ 3D Ultra-Realistic Posters
                </span>
              </div>

              <div className="text-center space-y-2">
                <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
                  {lang === "mr"
                    ? "टेम्पलेट्स गॅलरी निवडा"
                    : lang === "hi"
                      ? "टेम्प्लेट्स गैलरी चुनें"
                      : "Select Template Category"}
                </h2>
                <p className="text-xs md:text-sm font-bold text-indigo-600 uppercase tracking-widest">
                  {lang === "mr"
                    ? "शाळा ओळखपत्र, महिन्याचा विद्यार्थी, वाढदिवस, प्रशस्तीपत्रक, प्रोफाइल व निकाल कार्ड्स"
                    : "School ID, Star Student, Birthday, Certificate, Profile & Result Cards"}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
                {CATEGORIES.map((cat, idx) => {
                  const title =
                    lang === "mr"
                      ? cat.titleMr
                      : lang === "hi"
                        ? cat.titleHi
                        : cat.titleEn;
                  const tilt = tilts[cat.id] || { rx: 0, ry: 0, sx: 50, sy: 30 };

                  return (
                    <motion.button
                      key={cat.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      onClick={() => navigate({ to: cat.to as any })}
                      onMouseMove={(e) => handleMouseMove(e, cat.id)}
                      onMouseLeave={() => handleMouseLeave(cat.id)}
                      style={{ perspective: "900px" }}
                      className="group cursor-pointer relative text-left outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    >
                      {/* 3D Tilting card body */}
                      <div
                        className="relative min-h-[230px] rounded-[2rem] flex flex-col justify-between p-5 overflow-hidden text-white"
                        style={{
                          background: cat.gradientBg,
                          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateZ(0px)`,
                          transformStyle: "preserve-3d",
                          transition: "transform 0.15s ease-out, box-shadow 0.2s ease",
                          boxShadow: (tilt.rx !== 0 || tilt.ry !== 0)
                            ? `0 20px 50px -8px ${cat.shadowColor}, 0 8px 20px -6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.18)`
                            : `0 8px 24px -4px rgba(0,0,0,0.35), 0 2px 8px -2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.14)`,
                          willChange: "transform",
                        }}
                      >
                        {/* Dynamic shimmer/specular highlight that follows mouse */}
                        <div
                          className="pointer-events-none absolute inset-0 rounded-[2rem] transition-opacity duration-200"
                          style={{
                            background: `radial-gradient(ellipse 70% 55% at ${tilt.sx}% ${tilt.sy}%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 45%, transparent 70%)`,
                            opacity: (tilt.rx !== 0 || tilt.ry !== 0) ? 1 : 0.5,
                          }}
                        />

                        {/* Static top-left specular (ambient light) */}
                        <div
                          className="pointer-events-none absolute inset-0 rounded-[2rem]"
                          style={{
                            background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 40%)",
                          }}
                        />

                        {/* Embossed rim — simulates physical card edge depth */}
                        <div
                          className="pointer-events-none absolute inset-0 rounded-[2rem]"
                          style={{
                            boxShadow: "inset 1.5px 1.5px 0 rgba(255,255,255,0.20), inset -1px -1px 0 rgba(0,0,0,0.18)",
                          }}
                        />

                        {/* Recessed icon plate — depth illusion */}
                        <div
                          className="absolute top-4 left-4 size-[3.6rem] rounded-2xl"
                          style={{
                            background: "rgba(0,0,0,0.28)",
                            boxShadow: "inset 2px 2px 8px rgba(0,0,0,0.5), inset -1px -1px 3px rgba(255,255,255,0.07)",
                          }}
                        />

                        {/* Ghost watermark icon */}
                        <div className="absolute -bottom-5 -right-4 size-28 pointer-events-none select-none opacity-[0.07] group-hover:opacity-[0.13] transition-opacity duration-500">
                          <cat.icon className="w-full h-full" strokeWidth={1} />
                        </div>

                        {/* ── Row 1: Icon + Badge ── */}
                        <div className="flex items-start justify-between w-full relative z-10">
                          <div
                            className="size-[3.6rem] rounded-2xl flex items-center justify-center border text-white transition-transform duration-300 group-hover:scale-110"
                            style={{
                              background: "rgba(255,255,255,0.13)",
                              borderColor: "rgba(255,255,255,0.22)",
                              boxShadow: "0 4px 14px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.18) inset, 0 -1px 0 rgba(0,0,0,0.22) inset",
                              backdropFilter: "blur(10px)",
                            }}
                          >
                            <cat.icon className="size-7" strokeWidth={2} />
                          </div>
                          <span
                            className="text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full text-yellow-200"
                            style={{
                              background: "rgba(0,0,0,0.48)",
                              border: "1px solid rgba(255,255,255,0.15)",
                              boxShadow: "0 2px 10px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.08) inset",
                              backdropFilter: "blur(8px)",
                            }}
                          >
                            {cat.badge}
                          </span>
                        </div>

                        {/* ── Row 2: Title + Desc ── */}
                        <div className="space-y-1 relative z-10 mt-2">
                          <h3 className="text-[15px] font-black leading-snug tracking-tight drop-shadow-sm">
                            {title}
                          </h3>
                          <p className={`text-[11px] ${cat.textLight} font-medium line-clamp-1 opacity-80`}>
                            {cat.descMr}
                          </p>
                        </div>

                        {/* ── Row 3: CTA Footer ── */}
                        <div
                          className={`flex items-center justify-between text-[11px] font-black uppercase tracking-wider ${cat.textLight} pt-2.5 mt-1 border-t border-white/10 relative z-10`}
                        >
                          <span className="group-hover:text-white transition-colors">
                            {lang === "mr" ? "पहा व तयार करा" : "Open & Create"}
                          </span>
                          <div
                            className="size-6 rounded-full flex items-center justify-center transition-all duration-300 group-hover:translate-x-1"
                            style={{ background: "rgba(255,255,255,0.12)" }}
                          >
                            <ArrowRight className="size-3.5" />
                          </div>
                        </div>
                      </div>

                      {/* Cast shadow beneath the card — deepens as card tilts */}
                      <div
                        className="absolute -bottom-2 left-4 right-4 h-5 -z-10 blur-xl transition-all duration-200"
                        style={{
                          background: cat.shadowColor,
                          opacity: (tilt.rx !== 0 || tilt.ry !== 0) ? 0.55 : 0.3,
                        }}
                      />
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </ModulePaywall>
        </main>
      </div>
    );
  }

  return <Outlet />;
}
