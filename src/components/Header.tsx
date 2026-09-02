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
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${scrolled ? "bg-nav-bg/[0.93] dark:bg-slate-950/[0.93] shadow-[0_4px_30px_rgba(108,78,246,0.05)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.3)] border-b border-border dark:border-white/10 backdrop-blur-md py-2 md:py-3" : "bg-transparent py-3 md:py-5"}`}
    >
      <div className="w-full px-4 md:px-8 lg:px-12">
        <div className="flex items-center justify-between relative">
          {/* Logo Section */}
          <div className="flex items-center z-10">
            <Link
              to="/"
              className={`flex items-center gap-2 md:gap-3.5 group transition-all duration-300 ${
                !scrolled
                  ? "bg-white/90 dark:bg-white/90 px-4 py-1.5 rounded-full border border-slate-200/60 shadow-sm"
                  : "bg-transparent p-0 border-none shadow-none"
              }`}
            >
              <div className="relative">
                <img
                  src={logoImg}
                  alt="SGK Brainova Logo"
                  className="size-8 md:size-10 rounded-[0.8rem] md:rounded-[1rem] object-cover shadow-sm group-hover:-translate-y-0.5 transition-all duration-500"
                />
                <div className="absolute inset-0 bg-primary-light blur-xl rounded-[1rem] opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
              </div>
              <div className="flex flex-col justify-center">
                <span className={`font-black text-[13px] md:text-xl tracking-tighter leading-none whitespace-nowrap py-0.5 transition-colors ${
                  !scrolled ? "text-slate-950" : "text-nav-text dark:text-white"
                }`}>
                  SGK Brainova
                </span>
                <span className={`text-[7px] md:text-[8px] font-black tracking-[0.12em] md:tracking-[0.18em] uppercase mt-0.5 whitespace-nowrap ${
                  !scrolled ? "text-primary font-black" : "text-primary dark:text-teal-400/80"
                }`}>
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
          <div className="flex items-center gap-3 z-10">
            <div className="flex items-center gap-2">
              {user ? (
                <div className="flex items-center gap-2 md:gap-3">
                  <Link
                    to="/profile"
                    className="size-10 md:size-11 rounded-full bg-white/5 border border-white/10 shadow-sm flex items-center justify-center text-slate-300 hover:border-indigo-500/30 hover:text-indigo-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group"
                  >
                    <User className="size-5 md:size-5 transition-transform group-hover:scale-110" />
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
              <div className="relative ml-1 md:ml-2">
                <button
                  onClick={() => setLangOpen(!langOpen)}
                  className={`flex items-center gap-2 px-2.5 md:px-4 py-1.5 md:py-2.5 rounded-full transition-all border shadow-sm duration-300 ${
                    !scrolled
                      ? "bg-white/85 text-slate-900 border-slate-200/60 hover:bg-white hover:text-primary font-black"
                      : langOpen
                      ? "bg-indigo-55 border-indigo-500/20 text-indigo-700 dark:bg-indigo-950/80 dark:border-indigo-500/30 dark:text-indigo-300"
                      : "bg-slate-100/60 border-slate-200/80 text-slate-700 hover:bg-slate-200/60 hover:border-indigo-500/20 hover:text-indigo-650 dark:bg-white/5 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:border-indigo-500/30 dark:hover:text-indigo-300"
                  }`}
                >
                  <Globe className="size-4" />
                  <span className="text-xs font-black uppercase tracking-widest hidden md:inline">
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
                className="lg:hidden size-8 md:size-11 rounded-full flex items-center justify-center bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-white shadow-md active:scale-95 transition-all ml-1 duration-300"
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
