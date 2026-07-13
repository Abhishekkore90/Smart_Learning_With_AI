import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { DICTIONARY } from "@/lib/translations";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import {
  ChevronLeft,
  Save,
  Loader2,
  School,
  CheckCircle2,
  BookOpen,
  Award,
  Sparkles,
  Settings,
  ChevronDown,
  Info,
} from "lucide-react";

export const Route = createFileRoute("/teacher/class-setup")({
  head: () => ({ meta: [{ title: "Class & Medium Setup — Educator" }] }),
  component: TeacherClassSetupPage,
});

const CLASSES = [
  { id: "1st", mr: "इयत्ता पहिली", en: "1st Standard" },
  { id: "2nd", mr: "इयत्ता दुसरी", en: "2nd Standard" },
  { id: "3rd", mr: "इयत्ता तिसरी", en: "3rd Standard" },
  { id: "4th", mr: "इयत्ता चौथी", en: "4th Standard" },
  { id: "5th", mr: "इयत्ता पाचवी", en: "5th Standard" },
  { id: "6th", mr: "इयत्ता सहावी", en: "6th Standard" },
  { id: "7th", mr: "इयत्ता सातवी", en: "7th Standard" },
  { id: "8th", mr: "इयत्ता आठवी", en: "8th Standard" },
  { id: "9th", mr: "इयत्ता नववी", en: "9th Standard" },
  { id: "10th", mr: "इयत्ता दहावी", en: "10th Standard" },
];

const MEDIUM_OPTIONS = [
  { id: "none", mr: "निवडलेले नाही", en: "Not Selected", color: "text-slate-400 bg-slate-100" },
  { id: "marathi", mr: "मराठी माध्यम", en: "Marathi Medium", color: "text-amber-700 bg-amber-50" },
  { id: "semi", mr: "सेमी-इंग्रजी माध्यम", en: "Semi-English Medium", color: "text-teal-700 bg-teal-50" },
  { id: "english", mr: "इंग्रजी माध्यम", en: "English Medium", color: "text-blue-700 bg-blue-50" },
  { id: "both", mr: "दोन्ही (मराठी + सेमी)", en: "Both (Marathi & Semi)", color: "text-indigo-700 bg-indigo-50" },
];

function TeacherClassSetupPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { lang } = useLanguage();
  const t = DICTIONARY[lang];
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classConfig, setClassConfig] = useState<Record<string, string>>(() => {
    // Initial fallback empty state
    const initial: Record<string, string> = {};
    CLASSES.forEach((c) => {
      initial[c.id] = "none";
    });
    return initial;
  });

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const udise =
    profile?.udise ||
    (typeof window !== "undefined" ? localStorage.getItem("teacher_udise") : null) ||
    "default";

  useEffect(() => {
    if (!authLoading) {
      if (sessionStorage.getItem("is_super_admin")) {
        setLoading(false);
        return;
      }
      if (!user || profile?.role !== "teacher") {
        navigate({
          to: "/login",
          search: { redirect: "/teacher/class-setup", role: "teacher" } as any,
        });
        return;
      }
      fetchConfig();
    }
  }, [user, profile, authLoading]);

  const fetchConfig = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, "school_data", `${udise}_class_config`);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists() && docSnap.data().config) {
        setClassConfig(docSnap.data().config);
      } else {
        // Fallback to local storage
        const localSaved = localStorage.getItem(`class_config_${udise}`);
        if (localSaved) {
          setClassConfig(JSON.parse(localSaved));
        }
      }
    } catch (e) {
      console.error("Error fetching class configuration:", e);
      const localSaved = localStorage.getItem(`class_config_${udise}`);
      if (localSaved) {
        setClassConfig(JSON.parse(localSaved));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMedium = (classId: string, value: string) => {
    setClassConfig((prev) => ({
      ...prev,
      [classId]: value,
    }));
    setOpenDropdownId(null);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const docRef = doc(db, "school_data", `${udise}_class_config`);
      await setDoc(
        docRef,
        {
          config: classConfig,
          updatedAt: new Date().toISOString(),
          udise,
          teacherId: user.uid,
        },
        { merge: true }
      );

      // Save to local storage
      localStorage.setItem(`class_config_${udise}`, JSON.stringify(classConfig));
      toast.success(lang === "mr" ? "वर्ग आणि माध्यम रचना यशस्वीरित्या जतन केली!" : "Class & Medium Configuration saved successfully!");
    } catch (e: any) {
      console.error("Error saving class config:", e);
      toast.error(lang === "mr" ? "रचना जतन करण्यात त्रुटी आली." : "Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  };

  // Close dropdowns on clicking outside
  useEffect(() => {
    const handleOutsideClick = () => setOpenDropdownId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const marathiCount = Object.values(classConfig).filter((v) => v === "marathi" || v === "both").length;
  const semiCount = Object.values(classConfig).filter((v) => v === "semi" || v === "both").length;
  const activeCount = Object.values(classConfig).filter((v) => v !== "none").length;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">
            {lang === "mr" ? "रचना लोड होत आहे..." : "Loading Configuration..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F5EF] relative overflow-hidden flex flex-col font-sans">
      {/* Luxury Background Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-48 -left-48 size-[800px] bg-[#E8DFD1]/30 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute top-1/2 -right-48 size-[900px] bg-[#C9D8C5]/20 rounded-full blur-[100px] animate-blob" />
      </div>

      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-64 pt-20 flex-1 relative z-10">
        <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
          {/* Header Card */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/60 backdrop-blur-md p-8 rounded-[2rem] border border-[#E8DFD1]/40 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="size-14 bg-[#D6B97A] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#D6B97A]/20">
                <Settings className="size-7" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {lang === "mr" ? "वर्ग व माध्यम रचना" : "Class & Medium Configuration"}
                </h1>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D6B97A] mt-1">
                  {lang === "mr" ? "पहिली ते दहावी माध्यम निश्चित करा" : "Set Marathi / Semi-English Medium"}
                </p>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-[#D6B97A] active:scale-95 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin text-white" />
              ) : (
                <Save className="size-4 text-[#D6B97A]" />
              )}
              {lang === "mr" ? "रचना जतन करा" : "Save Configuration"}
            </button>
          </div>

          {/* Stats/Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-[#D6B97A] uppercase tracking-widest block">
                  {lang === "mr" ? "एकूण वर्ग" : "Configured Classes"}
                </span>
                <span className="text-3xl font-black text-slate-800">{activeCount} / 10</span>
              </div>
              <div className="size-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <School className="size-6" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block">
                  {lang === "mr" ? "मराठी माध्यम" : "Marathi Medium"}
                </span>
                <span className="text-3xl font-black text-amber-700">{marathiCount}</span>
              </div>
              <div className="size-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                <BookOpen className="size-6" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest block">
                  {lang === "mr" ? "सेमी-इंग्रजी माध्यम" : "Semi-English Medium"}
                </span>
                <span className="text-3xl font-black text-teal-700">{semiCount}</span>
              </div>
              <div className="size-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600">
                <Award className="size-6" />
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-amber-50/50 border border-amber-100 p-5 rounded-2xl flex gap-3 text-amber-800 text-xs font-semibold leading-relaxed">
            <Info className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p>
              {lang === "mr"
                ? "इयत्ता पहिली ते दहावी मधील प्रत्येक वर्गासाठी चालू शैक्षणिक वर्षाचे माध्यम निवडा. ही माहिती वेळापत्रक रचना, निकाल पत्रके आणि विद्यार्थी संचिका अहवालात स्वयं-अपडेट केली जाईल."
                : "Select the language medium of instruction for each standard from 1st to 10th. This layout configuration automatically maps structures for school timetables, report cards, and student logs."}
            </p>
          </div>

          {/* Main Classes Grid */}
          <div className="bg-white rounded-[3rem] border border-slate-200 p-8 md:p-12 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {CLASSES.map((cls, idx) => {
                const currentVal = classConfig[cls.id] || "none";
                const selectedOption = MEDIUM_OPTIONS.find((opt) => opt.id === currentVal) || MEDIUM_OPTIONS[0];

                return (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between p-6 bg-[#FAFAF7] hover:bg-white rounded-2xl border border-slate-100 hover:border-[#D6B97A]/30 hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center gap-4">
                      <div className="size-12 bg-white rounded-xl flex items-center justify-center border border-slate-200/80 shadow-sm text-slate-800 text-base font-black">
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-base">
                          {lang === "mr" ? cls.mr : cls.en}
                        </h3>
                        <span className="text-[9px] font-bold text-slate-400 tracking-wider block">
                          Standard {cls.id.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Premium Custom Dropdown */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setOpenDropdownId((prev) => (prev === cls.id ? null : cls.id))}
                        className={`min-w-[180px] md:min-w-[210px] px-5 py-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs font-black tracking-wide cursor-pointer transition-all ${
                          selectedOption.id !== "none"
                            ? "bg-white border-[#D6B97A]/40 text-slate-800 shadow-sm"
                            : "bg-slate-50 text-slate-400"
                        }`}
                      >
                        <span className="truncate">
                          {lang === "mr" ? selectedOption.mr : selectedOption.en}
                        </span>
                        <ChevronDown
                          className={`size-4 text-slate-400 transition-transform duration-300 ${
                            openDropdownId === cls.id ? "rotate-180 text-[#D6B97A]" : ""
                          }`}
                        />
                      </button>

                      {/* Dropdown Options Portal */}
                      <AnimatePresence>
                        {openDropdownId === cls.id && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-2 min-w-[210px] bg-white border border-slate-200 rounded-2xl shadow-xl z-20 overflow-hidden"
                          >
                            <div className="p-1.5 space-y-1">
                              {MEDIUM_OPTIONS.map((opt) => (
                                <button
                                  key={opt.id}
                                  onClick={() => handleSelectMedium(cls.id, opt.id)}
                                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                                    currentVal === opt.id
                                      ? "bg-[#1A1A1A] text-white"
                                      : "text-slate-700 hover:bg-slate-100"
                                  }`}
                                >
                                  <span>{lang === "mr" ? opt.mr : opt.en}</span>
                                  {currentVal === opt.id && (
                                    <CheckCircle2 className="size-4 text-[#D6B97A]" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
