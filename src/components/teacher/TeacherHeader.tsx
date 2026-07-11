import { useAuth } from "@/hooks/use-auth";
import { auth } from "@/lib/firebase";
import {
  LogOut,
  Bell,
  Search,
  Menu,
  User,
  Settings,
  Globe,
  ChevronDown,
} from "lucide-react";
import { showToast as toast } from "@/lib/custom-toast";
import { useLanguage } from "@/hooks/use-language";
import { DICTIONARY } from "@/lib/translations";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@tanstack/react-router";

export function TeacherHeader() {
  const { user } = useAuth();
  const { lang, setLang } = useLanguage();
  const t = DICTIONARY[lang];
  const [langOpen, setLangOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      sessionStorage.removeItem("is_super_admin");
      await auth.signOut();
      toast.success(t.success || "Signed out successfully");
      window.location.href = "/login";
    } catch (error: any) {
      toast.error(t.error || "Failed to sign out");
    }
  };

  return (
    <header className="bg-white/80 backdrop-blur-2xl border-b border-slate-200/60 text-slate-800 h-16 fixed top-0 left-0 right-0 z-[60] px-4 md:px-6 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.03)] transition-all">
      <div className="flex items-center gap-4">
        <button
          onClick={() =>
            window.dispatchEvent(new CustomEvent("toggle-teacher-sidebar"))
          }
          className="lg:hidden size-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 transition-all active:scale-95 shadow-sm"
        >
          <Menu className="size-5" />
        </button>

        {/* Brand Section */}
        <Link to="/teacher" className="flex items-center gap-3 group">
          <div className="size-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center border border-white/50 shadow-lg overflow-hidden group-hover:scale-105 transition-transform duration-300">
            <svg
              className="size-6 text-slate-800 drop-shadow-md"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="8"
              />
              <path
                d="M50 22C34.5 22 28 32.5 35 44C40.5 53 59.5 47 65 56C72 67.5 65.5 78 50 78"
                stroke="currentColor"
                strokeWidth="12"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="35" cy="35" r="6" fill="currentColor" />
              <circle cx="65" cy="65" r="6" fill="currentColor" />
            </svg>
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="font-extrabold tracking-tight hidden sm:block uppercase text-[14px] md:text-[16px] text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 font-poppins drop-shadow-sm leading-tight">
              {t.teacher_section || "TEACHER SECTION"}
            </h1>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block leading-none mt-0.5">
              Dashboard
            </span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Language Selector */}
        <div className="relative ml-1 hidden sm:block">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all border shadow-sm duration-300 ${
              langOpen
                ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                : "bg-slate-50 hover:bg-white border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300"
            }`}
          >
            <Globe className="size-4" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">
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
                className="absolute top-full right-0 mt-2 p-1.5 rounded-2xl bg-white shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-slate-100 min-w-[120px] flex flex-col gap-1 z-50 overflow-hidden text-slate-800"
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
                    className={`px-3 py-2 text-left rounded-xl transition-all flex flex-col group ${
                      lang === l.code
                        ? "bg-indigo-50/80 text-indigo-700 font-bold"
                        : "hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span className="text-xs group-hover:translate-x-1 transition-transform">
                      {l.label}
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">
                      {l.sub}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

        {/* User profile & logout controls */}
        <Link
          to="/teacher/settings"
          className="flex items-center gap-3 pl-1 hover:opacity-85 active:scale-95 transition-all cursor-pointer"
        >
          <div className="text-right hidden md:block">
            <div className="text-xs font-bold text-slate-800 leading-none">
              {user?.displayName || "Teacher"}
            </div>
            <div className="text-[9px] font-black uppercase tracking-widest text-indigo-500 mt-1">
              Educator
            </div>
          </div>
          <div className="size-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold shadow-inner border border-slate-200/60 overflow-hidden relative group">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
                className="size-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            ) : (
              <User className="size-5" />
            )}
            <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-full" />
          </div>
        </Link>

        <button
          onClick={handleSignOut}
          className="size-10 rounded-xl bg-red-50 hover:bg-red-500 border border-red-100 hover:border-red-500 flex items-center justify-center text-red-500 hover:text-slate-800 transition-all shadow-sm hover:shadow-md active:scale-95 group ml-1"
          title="Logout"
        >
          <LogOut className="size-4 group-hover:-translate-x-0.5 transition-transform" />
        </button>
      </div>
    </header>
  );
}
