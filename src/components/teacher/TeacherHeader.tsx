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
  ArrowLeft,
  Home,
} from "lucide-react";
import { showToast as toast } from "@/lib/custom-toast";
import { useLanguage } from "@/hooks/use-language";
import { DICTIONARY } from "@/lib/translations";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation } from "@tanstack/react-router";
import { clearUnlockedPinSections } from "@/components/teacher/PinGate";

function WhatsAppIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function TeacherHeader() {
  const { user } = useAuth();
  const { lang, setLang } = useLanguage();
  const location = useLocation();
  const t = DICTIONARY[lang];
  const [langOpen, setLangOpen] = useState(false);

  const isDashboard = location.pathname === "/teacher" || location.pathname === "/teacher/";

  const handleSignOut = async () => {
    try {
      sessionStorage.removeItem("is_super_admin");
      clearUnlockedPinSections();
      await auth.signOut();
      toast.success(t.success || "Signed out successfully");
      window.location.href = "/login";
    } catch (error: any) {
      toast.error(t.error || "Failed to sign out");
    }
  };

  return (
    <header className="bg-white/80 backdrop-blur-2xl border-b border-slate-200/60 text-slate-800 h-16 fixed top-0 left-0 right-0 z-[60] px-3 sm:px-4 md:px-6 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.03)] transition-all">
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={() =>
            window.dispatchEvent(new CustomEvent("toggle-teacher-sidebar"))
          }
          className="lg:hidden size-9 sm:size-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 transition-all active:scale-95 shadow-sm"
        >
          <Menu className="size-5" />
        </button>

        {/* Home Back Button (Navigates to main landing homepage) */}
        <Link
          to="/"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-slate-100 to-indigo-50 hover:from-indigo-100 hover:to-purple-100 text-slate-800 hover:text-indigo-900 border border-slate-300/80 rounded-xl text-xs font-black transition-all shadow-xs active:scale-95 cursor-pointer shrink-0"
          title="मुख्य होमपेजवर जा (Go to Main Homepage)"
        >
          <ArrowLeft className="size-3.5 text-indigo-600 shrink-0" />
          <Home className="size-3.5 text-indigo-600 shrink-0 hidden xs:inline" />
          <span className="font-extrabold text-[11px] sm:text-xs">मुख्य पान (Home)</span>
        </Link>

        {/* Brand Section */}
        <Link to="/teacher" className="flex items-center gap-2.5 group">
          <div className="size-9 sm:size-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center border border-white/50 shadow-lg overflow-hidden group-hover:scale-105 transition-transform duration-300">
            <svg
              className="size-5 sm:size-6 text-slate-800 drop-shadow-md"
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

        {/* Universal Back Button for sub-sections to return to teacher dashboard */}
        {!isDashboard && (
          <Link
            to="/teacher"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 text-indigo-700 hover:text-indigo-900 border border-indigo-200/80 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
            title="शिक्षक डॅशबोर्डवर मागे जा (Back to Teacher Dashboard)"
          >
            <ArrowLeft className="size-3.5 shrink-0" />
            <span className="font-bold hidden xs:inline">डॅशबोर्ड (Dashboard)</span>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* WhatsApp Group for Queries */}
        <a
          href="https://chat.whatsapp.com/IUcC4XskSSQF8dFpQWUMb4?s=sh&p=a&mlu=4&ilr=4"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-emerald-50 hover:bg-[#25D366] text-emerald-800 hover:text-white border border-emerald-300 hover:border-[#25D366] rounded-xl text-xs font-black transition-all shadow-xs active:scale-95 group/wa shrink-0 cursor-pointer"
          title="शंका / मदतीसाठी WhatsApp ग्रुप जॉईन करा (Join WhatsApp Group for Queries)"
        >
          <WhatsAppIcon className="size-4 fill-[#25D366] group-hover/wa:fill-white transition-colors shrink-0" />
          <span className="hidden sm:inline font-extrabold text-[11px] sm:text-xs text-emerald-900 group-hover/wa:text-white">
            {lang === "mr" ? "WhatsApp शंका / मदत" : "WhatsApp Queries"}
          </span>
        </a>

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

        {/* User profile & logout controls / Guest Login Button */}
        {user ? (
          <>
            <Link to="/teacher/settings" className="flex items-center gap-3 pl-1 hover:opacity-85 active:scale-95 transition-all cursor-pointer">
              <div className="text-right hidden md:block">
                <div className="text-xs font-bold text-slate-800 leading-none">
                  {user.displayName || "Teacher"}
                </div>
                <div className="text-[9px] font-black uppercase tracking-widest text-indigo-500 mt-1">
                  Educator
                </div>
              </div>
              <div className="size-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold shadow-inner border border-slate-200/60 overflow-hidden relative group">
                {user.photoURL ? (
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
              className="size-10 rounded-xl bg-red-50 hover:bg-red-500 border border-red-100 hover:border-red-500 flex items-center justify-center text-red-500 hover:text-white transition-all shadow-sm hover:shadow-md active:scale-95 group ml-1"
              title="Logout"
            >
              <LogOut className="size-4 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          </>
        ) : (
          <Link
            to="/login"
            search={{ redirect: "/teacher", role: "teacher" } as any}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer ml-1"
          >
            <User className="size-4" />
            <span>{lang === "mr" ? "शिक्षक लॉगिन" : "Teacher Login"}</span>
          </Link>
        )}
      </div>
    </header>
  );
}
