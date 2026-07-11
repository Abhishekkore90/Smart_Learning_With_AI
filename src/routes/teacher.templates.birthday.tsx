import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gift,
  Heart,
  Star,
  Sparkles,
  Cake,
  Download,
  Edit3,
  ArrowLeft,
  User,
  GraduationCap,
  Share2,
  PartyPopper,
  Trophy,
  Zap,
  Crown,
  Flame,
  Rocket,
  Settings2,
  Calendar,
  MessageCircle,
  ToggleLeft,
  History,
  Users2,
  BellRing,
  Save,
  Loader2,
} from "lucide-react";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { showToast as toast } from "@/lib/custom-toast";
import { useLanguage } from "@/hooks/use-language";

export const Route = createFileRoute("/teacher/templates/birthday")({
  head: () => ({ meta: [{ title: "Birthday Manager — Teacher Portal" }] }),
  component: BirthdayTemplatesPage,
});

const BIRTHDAY_TEMPLATES = [
  {
    id: 1,
    name: "Chocolate Gold Royale",
    nameMr: "चॉकलेट गोल्ड रॉयल",
    nameHi: "चॉकलेट गोल्ड रॉयल",
    theme: "chocolate-gold",
    category: "Elite",
    categoryMr: "एलिट",
    categoryHi: "एलीट",
    bg: "linear-gradient(135deg, #2d1b0f 0%, #1a0f0a 100%)",
    accent:
      "linear-gradient(to right, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c)",
    icon: Crown,
  },
  {
    id: 2,
    name: "Cosmic Celebration",
    nameMr: "कॉस्मिक सेलिब्रेशन",
    nameHi: "कॉस्मिक सेलिब्रेशन",
    theme: "cosmic",
    category: "Modern",
    categoryMr: "मॉडर्न",
    categoryHi: "मॉडर्न",
    bg: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
    accent: "linear-gradient(to right, #818cf8, #c084fc, #e879f9)",
    icon: Rocket,
  },
  {
    id: 3,
    name: "Emerald Garden",
    nameMr: "एमराल्ड गार्डन",
    nameHi: "एमेरल्ड गार्डन",
    theme: "emerald",
    category: "Premium",
    categoryMr: "प्रीमियम",
    categoryHi: "प्रीमियम",
    bg: "linear-gradient(135deg, #064e3b 0%, #022c22 100%)",
    accent: "linear-gradient(to right, #34d399, #6ee7b7, #10b981)",
    icon: Sparkles,
  },
  {
    id: 4,
    name: "Fiery Success",
    nameMr: "फायरी सक्सेस",
    nameHi: "फायरी सक्सेस",
    theme: "fiery",
    category: "Dynamic",
    categoryMr: "डायनॅमिक",
    categoryHi: "डायनेमिक",
    bg: "linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)",
    accent: "linear-gradient(to right, #f87171, #fb923c, #facc15)",
    icon: Flame,
  },
  {
    id: 5,
    name: "Oceanic Sparkle",
    nameMr: "ओशनिक स्पार्कल",
    nameHi: "ओशनिक स्पार्कल",
    theme: "ocean",
    category: "Elite",
    categoryMr: "एलिट",
    categoryHi: "एलीट",
    bg: "linear-gradient(135deg, #0c4a6e 0%, #082f49 100%)",
    accent: "linear-gradient(to right, #38bdf8, #818cf8, #2dd4bf)",
    icon: Zap,
  },
  {
    id: 6,
    name: "Diamond Night",
    nameMr: "डायमंड नाईट",
    nameHi: "डायमंड नाइट",
    theme: "diamond",
    category: "Premium",
    categoryMr: "प्रीमियम",
    categoryHi: "प्रीमियम",
    bg: "linear-gradient(135deg, #18181b 0%, #27272a 100%)",
    accent: "linear-gradient(to right, #94a3b8, #f8fafc, #64748b)",
    icon: Trophy,
  },
];

function BirthdayTemplatesPage() {
  const { lang } = useLanguage();
  const [studentName, setStudentName] = useState("ADITYA SHINDE");
  const [studentClass, setStudentClass] = useState("CLASS 4th-A");
  const [autoPopup, setAutoPopup] = useState(true);
  const [globalMessage, setGlobalMessage] = useState(
    "May your life be filled with happiness, success and joy. Have a wonderful day!",
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSettings = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Birthday System Settings Updated!");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-64 pt-16 min-h-screen">
        <div className="p-6 md:p-10 space-y-10">
          {/* Cinematic Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-slate-900 rounded-[3rem] p-10 md:p-14 text-white shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-pink-600/20 via-transparent to-blue-600/20" />
            <div className="absolute -right-20 -top-20 size-80 bg-pink-500/10 rounded-full blur-[100px] animate-pulse" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
              <div className="space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-pink-500/20 backdrop-blur-md rounded-full border border-pink-500/30 text-pink-400 text-xs font-black uppercase tracking-widest"
                >
                  <Sparkles className="size-4" />{" "}
                  {lang === "mr"
                    ? "वाढदिवस नियंत्रण केंद्र"
                    : lang === "hi"
                      ? "जन्मदिन नियंत्रण केंद्र"
                      : "Birthday Command Center"}
                </motion.div>
                <h2 className="text-5xl md:text-6xl font-black tracking-tighter leading-none">
                  {lang === "mr"
                    ? "विद्यार्थी वाढदिवस "
                    : lang === "hi"
                      ? "छात्र जन्मदिन "
                      : "Student Birthday "}{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-yellow-400">
                    {lang === "mr"
                      ? "प्रणाली"
                      : lang === "hi"
                        ? "प्रणाली"
                        : "System"}
                  </span>
                </h2>
                <p className="text-slate-400 font-medium max-w-xl text-lg">
                  {lang === "mr"
                    ? "स्वयंचलित शुभेच्छा, सानुकूल टेम्पलेट्स व्यवस्थापित करा आणि विद्यार्थ्यांचे विशेष क्षण साजरा करा."
                    : lang === "hi"
                      ? "स्वचालित शुभकामनाएं, कस्टम टेम्पलेट्स प्रबंधित करें और छात्रों के विशेष पलों का जश्न मनाएं।"
                      : "Manage automated wishes, custom templates, and celebrate student milestones with high-fidelity production tools."}
                </p>
              </div>
              <Link
                to="/teacher/templates"
                className="group flex items-center gap-4 px-10 py-6 bg-white text-slate-900 rounded-[2.5rem] font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-2xl"
              >
                <ArrowLeft className="size-5 group-hover:-translate-x-1 transition-transform" />{" "}
                {lang === "mr"
                  ? "टेम्प्लेट्स"
                  : lang === "hi"
                    ? "टेम्प्लेट्स"
                    : "Templates"}
              </Link>
            </div>
          </motion.div>

          {/* Template Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {BIRTHDAY_TEMPLATES.map((template, idx) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="group relative bg-white rounded-[3rem] p-4 shadow-xl border border-slate-100"
              >
                <div
                  className="aspect-video rounded-[2rem] overflow-hidden relative shadow-inner"
                  style={{ background: template.bg }}
                >
                  <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
                  <div className="relative h-full p-8 flex flex-col items-center justify-center text-center">
                    <template.icon className="size-10 text-white mb-4 drop-shadow-lg" />
                    <h4 className="text-2xl font-black text-white tracking-tighter italic mb-1">
                      {lang === "mr"
                        ? "वाढदिवसाच्या हार्दिक शुभेच्छा!"
                        : lang === "hi"
                          ? "जन्मदिन की हार्दिक शुभकामनाएं!"
                          : "Happy Birthday!"}
                    </h4>
                    <div
                      className="h-0.5 w-10 bg-white/30 rounded-full mb-4"
                      style={{ background: template.accent }}
                    />
                    <p className="text-[8px] font-black uppercase tracking-[0.4em] text-white/40 mb-1">
                      {lang === "mr"
                        ? "नाव"
                        : lang === "hi"
                          ? "नाम"
                          : "Presented To"}
                    </p>
                    <h5
                      className="text-2xl font-black text-white tracking-tighter leading-none"
                      style={{
                        backgroundImage: template.accent,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      {studentName}
                    </h5>
                    <div className="mt-4 px-6 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10">
                      <span className="text-[8px] font-black text-white uppercase tracking-widest">
                        {studentClass}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-black text-slate-900 tracking-tight">
                        {lang === "mr"
                          ? template.nameMr
                          : lang === "hi"
                            ? template.nameHi
                            : template.name}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {lang === "mr"
                          ? template.categoryMr
                          : lang === "hi"
                            ? template.categoryHi
                            : template.category}{" "}
                        {lang === "mr"
                          ? "इंजिन"
                          : lang === "hi"
                            ? "इंजन"
                            : "ENGINE"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 hover:text-pink-500 hover:bg-pink-50 transition-all border border-slate-100">
                        <Heart className="size-4" />
                      </button>
                      <button className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-all border border-slate-100">
                        <Share2 className="size-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Link
                      to="/teacher/templates/edit/$templateId"
                      params={{ templateId: `birthday-${template.id}` }}
                      className="flex-1 py-3 bg-slate-950 text-white rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-slate-800 transition-all shadow-md text-center font-black"
                    >
                      <Edit3 className="size-3.5" />{" "}
                      {lang === "mr"
                        ? "संपादन"
                        : lang === "hi"
                          ? "संपादन"
                          : "Edit"}
                    </Link>
                    <button className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-blue-700 transition-all shadow-md font-black">
                      <Download className="size-3.5" />{" "}
                      {lang === "mr"
                        ? "डाउनलोड"
                        : lang === "hi"
                          ? "डाउनलोड"
                          : "Download"}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
