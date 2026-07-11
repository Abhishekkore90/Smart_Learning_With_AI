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
      path === "/login" ||
      path === "/signup"
    );
  };

  const currentPath = loc.pathname;
  const browserPath =
    typeof window !== "undefined" ? window.location.pathname : "";

  if (isExcludedPath(currentPath) || isExcludedPath(browserPath)) {
    return null;
  }

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${scrolled ? "bg-white/[0.97] shadow-[0_4px_30px_rgba(0,0,0,0.08)] border-b border-slate-200/60 py-3" : "bg-transparent py-5"}`}
    >
      <div className="w-full px-4 md:px-8 lg:px-12">
        <div className="flex items-center justify-between relative">
          {/* Logo Section */}
          <div className="flex items-center z-10">
            <Link to="/" className="flex items-center gap-3.5 group">
              <div className="relative">
                <img
                  src={logoImg}
                  alt="SGK Brainova Logo"
                  className="size-10 md:size-12 rounded-[1.2rem] object-cover shadow-[0_4px_20px_rgba(20,184,166,0.4)] group-hover:-translate-y-0.5 group-hover:shadow-[0_8px_25px_rgba(20,184,166,0.5)] transition-all duration-500"
                />
                <div className="absolute inset-0 bg-teal-400 blur-xl rounded-[1.2rem] opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-xl md:text-2xl tracking-tighter text-slate-800 leading-none group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-teal-600 group-hover:to-emerald-600 transition-all duration-500 py-0.5">
                  SGK Brainova
                </span>
                <span className="text-[8.5px] font-black tracking-[0.2em] text-teal-600/70 uppercase mt-0.5">
                  Smart Learning With AI
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation (Centered) */}
          <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center z-0">
            <nav className="flex items-center gap-1">
              {nav.map((n) => {
                const active = n.exact
                  ? loc.pathname === n.to
                  : loc.pathname.startsWith(n.to);
                return (
                  <Link
                    key={n.labelKey}
                    to={n.to}
                    className={`px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-[0.15em] transition-all relative group flex items-center gap-2 ${
                      active
                        ? "text-indigo-600"
                        : "text-slate-600 hover:text-indigo-600"
                    }`}
                  >
                    <span
                      className={`relative z-10 ${lang === "mr" || lang === "hi" ? "text-sm font-bold tracking-normal" : ""}`}
                    >
                      {t[n.labelKey as keyof typeof t]}
                    </span>
                    {active && (
                      <motion.div
                        layoutId="navTab"
                        className="absolute inset-0 bg-indigo-50/80 rounded-full"
                        transition={{
                          type: "spring",
                          bounce: 0.2,
                          duration: 0.6,
                        }}
                      />
                    )}
                    {!active && (
                      <div className="absolute inset-0 bg-slate-50 opacity-0 group-hover:opacity-100 transform scale-95 group-hover:scale-100 transition-all duration-300 rounded-full" />
                    )}
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
                    className="size-10 md:size-11 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group"
                  >
                    <User className="size-5 md:size-5 transition-transform group-hover:scale-110" />
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="hidden sm:flex items-center justify-center size-10 md:size-11 rounded-full bg-red-50 border border-red-100 text-red-500 hover:bg-red-500 hover:text-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <LogOut className="size-4.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 md:gap-3">
                  <Link
                    to="/login"
                    className="hidden sm:flex px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-full transition-all duration-300"
                  >
                    {t.login}
                  </Link>
                  <Link
                    to="/signup"
                    className="px-6 md:px-7 py-2.5 md:py-3 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-[0_4px_14px_rgba(79,70,229,0.3)] hover:bg-indigo-700 hover:shadow-[0_6px_20px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
                  >
                    {t.getStarted}
                  </Link>
                </div>
              )}

              {/* Language Selector */}
              <div className="relative ml-1 md:ml-2">
                <button
                  onClick={() => setLangOpen(!langOpen)}
                  className={`flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-full transition-all border shadow-sm duration-300 ${
                    langOpen
                      ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-600"
                  }`}
                >
                  <Globe className="size-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">
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
                      className="absolute top-full right-0 mt-3 p-2 rounded-[1.2rem] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-200/50 min-w-[140px] flex flex-col gap-1 z-50 overflow-hidden"
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
                          className={`px-4 py-2.5 text-left rounded-xl transition-all flex flex-col gap-0.5 group ${
                            lang === l.code
                              ? "bg-indigo-50/80 text-indigo-600"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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
                className="lg:hidden size-10 md:size-11 rounded-full flex items-center justify-center bg-slate-900 text-white shadow-md active:scale-95 transition-all ml-1 duration-300"
              >
                {isMobileMenuOpen ? (
                  <X className="size-5" />
                ) : (
                  <Menu className="size-5" />
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
                    className="flex justify-between items-center w-full p-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-[0.98] group"
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

                <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col gap-4">
                  {!user ? (
                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        to="/login"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-900 bg-slate-100 text-center hover:bg-slate-200 transition-colors"
                      >
                        {t.login}
                      </Link>
                      <Link
                        to="/signup"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white bg-indigo-600 text-center hover:bg-indigo-700 shadow-md transition-all"
                      >
                        {t.getStarted}
                      </Link>
                    </div>
                  ) : (
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
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
