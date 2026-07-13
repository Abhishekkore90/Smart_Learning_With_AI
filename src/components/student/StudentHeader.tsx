import { useAuth } from "@/hooks/use-auth";
import { auth } from "@/lib/firebase";
import {
  LogOut,
  Bell,
  Search,
  Menu,
  User,
  GraduationCap,
  ArrowLeft,
  Globe,
  ChevronDown,
} from "lucide-react";
import { showToast as toast } from "@/lib/custom-toast";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useLanguage } from "@/hooks/use-language";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function StudentHeader() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { lang, setLang } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);

  const isDashboard =
    location.pathname === "/student" || location.pathname === "/student/";

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      toast.success("Signed out successfully");
    } catch (error: any) {
      toast.error("Sign out failed");
    }
  };

  return (
    <header className="bg-slate-950/60 backdrop-blur-2xl text-white h-16 fixed top-0 left-0 right-0 z-50 px-6 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.3)] border-b border-white/10">
      <div className="flex items-center gap-4">
        {!isDashboard && (
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-white/10 rounded-lg flex items-center gap-2 transition-all group"
            title="Go Back"
          >
            <ArrowLeft className="size-5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-xs font-bold uppercase hidden md:block">
              Back
            </span>
          </button>
        )}
        <button
          onClick={() =>
            window.dispatchEvent(new CustomEvent("toggle-student-sidebar"))
          }
          className="lg:hidden p-2 hover:bg-white/10 rounded-lg"
        >
          <Menu className="size-6" />
        </button>
        <div className="flex items-center gap-2">
          <div className="size-9 bg-white/20 rounded-lg flex items-center justify-center border border-white/30 backdrop-blur-sm">
            <GraduationCap className="size-5 text-white" />
          </div>
          <h1 className="font-bold tracking-tight hidden sm:block uppercase text-sm">
            Student Portal {user?.displayName ? `(${user.displayName})` : ""}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center bg-white/10 rounded-full px-4 py-1.5 border border-white/20">
          <Search className="size-4 text-white/70" />
          <input
            type="text"
            placeholder="Search courses..."
            className="bg-transparent border-none outline-none text-xs px-2 w-48 placeholder:text-white/50"
          />
        </div>

        <div className="flex items-center gap-4">
          <button className="relative p-2 hover:bg-white/10 rounded-full transition-colors">
            <Bell className="size-5" />
            <span className="absolute top-1.5 right-1.5 size-2 bg-amber-400 rounded-full border border-slate-900"></span>
          </button>

          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all border shadow-sm ${langOpen
                ? "bg-white text-slate-900 border-white"
                : "bg-white/10 border-white/20 text-white hover:bg-white/20"
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
                  className="absolute top-full right-0 mt-2 p-1.5 rounded-2xl bg-white shadow-xl border border-slate-100 min-w-[120px] flex flex-col gap-1 z-50 overflow-hidden text-slate-800"
                >
                  {[
                    { code: "en", label: "English" },
                    { code: "mr", label: "मराठी" },
                    { code: "hi", label: "हिन्दी" },
                  ].map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLang(l.code as any);
                        setLangOpen(false);
                      }}
                      className={`px-3 py-2 text-left rounded-xl transition-all flex flex-col ${lang === l.code
                        ? "bg-indigo-50 text-indigo-600 font-bold"
                        : "hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                        }`}
                    >
                      <span className="text-xs">{l.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-6 w-px bg-white/20"></div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold leading-none">
                {user?.displayName || "Student"}
              </div>
              <div className="text-[10px] text-white/70 font-medium mt-1">
                Scholar
              </div>
            </div>
            <div className="size-9 bg-amber-500 rounded-xl flex items-center justify-center text-slate-950 font-bold shadow-md">
              <User className="size-5" />
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="p-2 hover:bg-red-500 hover:text-white rounded-lg transition-all text-white/70"
            title="Logout"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
