import { Link, useLocation } from "@tanstack/react-router";
import {
  Bell,
  UserCircle2,
  LogOut,
  Search,
  User,
  Sparkles,
  Plus,
  ChevronLeft,
  Menu,
  X,
  Globe,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { auth } from "@/lib/firebase";
import { showToast as toast } from "@/lib/custom-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/use-language";
import logoImg from "@/assets/logo.jpeg";

const TRANSLATIONS = {
  en: {
    explore: "Home",
    teacher: "Teacher",
    courses: "Courses",
    about: "About",
    contact: "Contact",
    login: "Login",
    getStarted: "Get Started",
  },
  mr: {
    explore: "होम",
    teacher: "शिक्षक",
    courses: "कोर्सेस",
    about: "आमच्याबद्दल",
    contact: "संपर्क",
    login: "लॉगिन",
    getStarted: "सुरू करा",
  },
  hi: {
    explore: "होम",
    teacher: "शिक्षक",
    courses: "कोर्स",
    about: "हमारे बारे में",
    contact: "संपर्क",
    login: "लॉगिन",
    getStarted: "शुरू करें",
  },
};

const nav = [
  { to: "/", labelKey: "explore", exact: true },
  { to: "/teacher/login", labelKey: "teacher", exact: false },
  { to: "/courses", labelKey: "courses", exact: false },
  { to: "/about", labelKey: "about", exact: false },
  { to: "/contact", labelKey: "contact", exact: false },
] as const;

export function Header() {
  const loc = useLocation();
  const { user, profile } = useAuth();
  const { lang, setLang } = useLanguage();
  const t = TRANSLATIONS[lang];
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    try {
      sessionStorage.removeItem("is_super_admin");
      if (typeof window !== "undefined") {
        try {
          Object.keys(sessionStorage).forEach((key) => {
            if (key.startsWith("unlocked_section_")) {
              sessionStorage.removeItem(key);
            }
          });
        } catch (e) {}
      }
      await auth.signOut();
      toast.success("Signed out successfully");
      window.location.href = "/login";
    } catch (error: any) {
      toast.error("Failed to sign out");
    }
  };

  const isHome = loc.pathname === "/";
  // Home is now white theme, so we don't need light-on-dark styles
  const shouldBeLight = false;

  const isExcludedPath = (path: string) => {
    return (
      path.startsWith("/admin") ||
      path.startsWith("/teacher") ||
      path.startsWith("/student") ||
      path.startsWith("/courses") ||
      path.startsWith("/profile") ||
      path.startsWith("/ai-tools") ||
      path.startsWith("/digital-school") ||
      path.startsWith("/digital_school") ||
      path === "/digital_school.html" ||
      path === "/login" ||
      path === "/signup"
    );
  };

  const currentPath = loc.pathname;
  const browserPath = typeof window !== "undefined" ? window.location.pathname : "";

  if (isExcludedPath(currentPath) || isExcludedPath(browserPath)) {
    return null;
  }

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
        scrolled
          ? "bg-white/95 dark:bg-slate-950/[0.95] shadow-md border-b border-slate-200/80 dark:border-white/10 backdrop-blur-md py-2 md:py-3"
          : "bg-white/95 sm:bg-transparent dark:bg-slate-950/95 sm:dark:bg-transparent border-b border-slate-200/60 sm:border-none backdrop-blur-md sm:backdrop-blur-none py-2.5 sm:py-3 md:py-5"
      }`}
    >
      <div className="w-full px-3 xs:px-4 md:px-8 lg:px-12">
        <div className="flex items-center justify-between relative">
          {/* Logo Section */}
          <div className="flex items-center z-10">
            <Link
              to="/"
              className={`flex items-center gap-2 md:gap-3.5 group transition-all duration-300 ${
                !scrolled
                  ? "bg-white/90 dark:bg-slate-900/90 rounded-2xl px-2.5 py-1.5 shadow-md border border-slate-200/60 dark:border-white/10 backdrop-blur-sm"
                  : ""
              }`}
            >
              <div className="relative shrink-0">
                <img
                  src={logoImg}
                  alt="SGK Brainova Logo"
                  className="size-8 md:size-10 rounded-xl object-cover shadow-xs group-hover:-translate-y-0.5 transition-all duration-500"
                />
                <div className="absolute inset-0 bg-primary-light blur-xl rounded-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
              </div>
              <div className="flex flex-col justify-center">
                <span className="font-black text-xs xs:text-sm md:text-xl text-slate-950 dark:text-white tracking-tight leading-none whitespace-nowrap py-0.5">
                  SGK Brainova
                </span>
                <span className="text-[7px] md:text-[8px] font-black tracking-wider uppercase text-primary dark:text-teal-400 mt-0.5 whitespace-nowrap">
                  Smart Learning With AI
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation (Centered) */}
          <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center z-0">
            <nav className="flex items-center gap-1.5">
              {nav.map((n) => {
                const active = n.exact
                  ? loc.pathname === n.to
                  : loc.pathname.startsWith(n.to);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`px-5 py-2 rounded-full text-[13px] uppercase tracking-[0.2em] transition-all duration-300 relative ${
                      !scrolled
                        ? active
                          ? "bg-white text-primary shadow-md font-black border border-primary/20 scale-105"
                          : "bg-white/85 text-slate-900 hover:bg-white hover:text-primary font-black shadow-sm border border-slate-200/60"
                        : active
                          ? "bg-primary/10 text-primary dark:bg-white/10 dark:text-indigo-400 font-black shadow-none border-none"
                          : "bg-transparent text-slate-700 hover:text-primary dark:text-slate-300 dark:hover:text-white font-bold border-none"
                    }`}
                  >
                    <span>{t[n.labelKey as keyof typeof t]}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 xs:gap-2.5 z-10">
            <div className="flex items-center gap-1.5 xs:gap-2">
              {user ? (
                <div className="flex items-center gap-1.5 md:gap-3">
                  <Link
                    to="/profile"
                    className="size-8.5 md:size-11 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-xs flex items-center justify-center text-slate-700 dark:text-slate-300 hover:border-indigo-500/30 hover:text-indigo-600 transition-all duration-300 group"
                  >
                    <User className="size-4 md:size-5 transition-transform group-hover:scale-110" />
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="hidden sm:flex items-center justify-center size-10 md:size-11 rounded-full bg-red-950/30 border border-red-900/30 text-red-400 hover:bg-red-500 hover:text-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <LogOut className="size-4.5" />
                  </button>
                </div>
              ) : null}

              {/* Language Selector */}
              <div className="relative">
                <button
                  onClick={() => setLangOpen(!langOpen)}
                  className="flex items-center gap-1 px-2.5 md:px-4 py-1.5 md:py-2.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white text-xs font-extrabold shadow-xs transition-all"
                >
                  <Globe className="size-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-wider hidden md:inline">
                    {lang.toUpperCase()}
                  </span>
                  <ChevronDown
                    className={`size-3 transition-transform duration-300 ${langOpen ? "rotate-180" : ""}`}
                  />
                </button>

                <AnimatePresence>
                  {langOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full right-0 mt-3 p-2 rounded-[1.2rem] bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-slate-250/60 dark:border-white/10 min-w-[140px] flex flex-col gap-1 z-50 overflow-hidden"
                    >
                      {[
                        { code: "en", label: "English", sub: "Global" },
                        { code: "mr", label: "मराठी", sub: "महाराष्ट्र" },
                        { code: "hi", label: "हिन्दी", sub: "भारत" },
                      ].map((l) => (
                        <button
                          key={l.code}
                          onClick={() => {
                            setLang(l.code as any);
                            setLangOpen(false);
                          }}
                          className={`px-4 py-2.5 text-left rounded-xl transition-all flex flex-col gap-0.5 group ${lang === l.code
                            ? "bg-indigo-55 text-indigo-700 border border-indigo-100 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-900/50"
                            : "text-slate-600 hover:bg-slate-50 hover:text-indigo-650 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                            }`}
                        >
                          <span className="text-xs font-black tracking-tight group-hover:translate-x-1 transition-transform duration-300">
                            {l.label}
                          </span>
                          <span className="text-[8px] font-bold uppercase tracking-widest opacity-50">
                            {l.sub}
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden size-8.5 md:size-11 rounded-full flex items-center justify-center bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-white shadow-xs active:scale-95 transition-all ml-0.5 duration-300"
              >
                {isMobileMenuOpen ? (
                  <X className="size-4 md:size-5" />
                ) : (
                  <Menu className="size-4 md:size-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="lg:hidden mt-4 overflow-hidden rounded-[2rem] bg-white shadow-[0_30px_70px_rgba(0,0,0,0.15)] border border-slate-100 p-6 z-50 relative"
            >
              <div className="space-y-2">
                {nav.map((n) => (
                  <Link
                    key={n.labelKey}
                    to={n.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex justify-between items-center w-full p-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 hover:bg-indigo-50 hover:text-indigo-650 transition-all active:scale-[0.98] group"
                  >
                    <span
                      className={`transition-transform duration-300 group-hover:translate-x-2 ${lang === "mr" || lang === "hi" ? "text-base font-bold tracking-normal" : ""}`}
                    >
                      {t[n.labelKey as keyof typeof t]}
                    </span>
                    <ArrowRight
                      size={14}
                      className="opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
                    />
                  </Link>
                ))}

                {user && (
                  <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col gap-4">
                    <button
                      onClick={() => {
                        handleSignOut();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 border border-red-100 text-center flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all duration-300"
                    >
                      <LogOut size={14} />{" "}
                      {lang === "en"
                        ? "Sign Out"
                        : lang === "mr"
                          ? "बाहेर पडा"
                          : "लॉग आउट"}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
