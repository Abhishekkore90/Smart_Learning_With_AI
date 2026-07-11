import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Award,
  Star,
  Sparkles,
  CheckCircle2,
  Trophy,
  Download,
  Edit3,
  ArrowLeft,
  User,
  Share2,
  PartyPopper,
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
  School,
  Send,
  Heart,
  BookOpen,
  Compass,
  LayoutGrid,
} from "lucide-react";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { showToast as toast } from "@/lib/custom-toast";
import { useLanguage } from "@/hooks/use-language";

export const Route = createFileRoute("/teacher/templates/admission")({
  head: () => ({
    meta: [{ title: "Admission Welcome Manager — Teacher Portal" }],
  }),
  component: AdmissionTemplatesPage,
});

const ADMISSION_TEMPLATES = [
  {
    id: 1,
    name: "Royal Ivy Welcome",
    nameMr: "रॉयल आयव्ही स्वागत",
    nameHi: "रॉयल आइवी स्वागत",
    theme: "emerald-gold",
    category: "Elite",
    bg: "linear-gradient(135deg, #064e3b 0%, #1a2e21 100%)",
    accent: "linear-gradient(to right, #bf953f, #fcf6ba, #b38728)",
    icon: School,
    quote:
      "Step into excellence. Your legacy of learning begins in these halls.",
    quoteMr:
      "उत्कृष्टतेच्या जगात प्रवेश करा. तुमचा शैक्षणिक वारसा येथे सुरू होतो.",
    quoteHi: "उत्कृष्टता की ओर पहला कदम। इस ज्ञान के मंदिर में आपका स्वागत है।",
    particle: "sparkle",
  },
  {
    id: 2,
    name: "Future Leaders Glow",
    nameMr: "भावी नेतृत्व प्रकाश",
    nameHi: "भावी नेता चमक",
    theme: "purple-blue",
    category: "Premium",
    bg: "linear-gradient(135deg, #4c1d95 0%, #1e1b4b 100%)",
    accent: "linear-gradient(to right, #a78bfa, #818cf8, #6366f1)",
    icon: Crown,
    quote:
      "A bright future awaits. We are honored to have you as our newest leader.",
    quoteMr:
      "एक उज्ज्वल भविष्य तुमची वाट पाहत आहे. आमचे नवीन नेते म्हणून तुमचे स्वागत.",
    quoteHi:
      "एक उज्ज्वल भविष्य आपका इंतजार कर रहा है। नए नेता के रूप में आपका स्वागत है।",
    particle: "float",
  },
  {
    id: 3,
    name: "Academic Spark Hub",
    nameMr: "शैक्षणिक स्फुल्लिंग केंद्र",
    nameHi: "शैक्षणिक स्फुलिंग केंद्र",
    theme: "amber-orange",
    category: "Modern",
    bg: "linear-gradient(135deg, #78350f 0%, #451a03 100%)",
    accent: "linear-gradient(to right, #fbbf24, #f59e0b, #d97706)",
    icon: BookOpen,
    quote: "Unleash your curiosity. Welcome to a journey of endless knowledge.",
    quoteMr:
      "तुमची जिज्ञासा जागृत करा. अमर्याद ज्ञानाच्या प्रवासात आपले स्वागत.",
    quoteHi: "अपनी जिज्ञासा को जगाएं। अनंत ज्ञान की यात्रा में आपका स्वागत है।",
    particle: "orbit",
  },
  {
    id: 4,
    name: "Oceanic Merit Shield",
    nameMr: "सागरी गुणवत्ता ढाल",
    nameHi: "समुद्री योग्यता ढाल",
    theme: "cyan-teal",
    category: "Traditional",
    bg: "linear-gradient(135deg, #164e63 0%, #083344 100%)",
    accent: "linear-gradient(to right, #22d3ee, #0d9488, #2dd4bf)",
    icon: GraduationCap,
    quote: "Steady sails to success. We're proud to welcome you on board.",
    quoteMr:
      "यशाच्या दिशेने मार्गक्रमण. आमच्यासोबत जोडल्याबद्दल आम्हाचा अभिमान आहे.",
    quoteHi:
      "सफलता की स्थिर लहरें। हमें आपको शालेय परिवार में शामिल करने पर गर्व है।",
    particle: "wave",
  },
  {
    id: 5,
    name: "Sunset Success Blaze",
    nameMr: "सूर्यास्त यश ज्वाला",
    nameHi: "सूर्यास्त सफलता ज्वाला",
    theme: "red-yellow",
    category: "Dynamic",
    bg: "linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)",
    accent: "linear-gradient(to right, #f87171, #fbbf24, #facc15)",
    icon: Trophy,
    quote: "The heat is on! Welcome to the home of champions and achievers.",
    quoteMr: "विजेत्यांच्या आणि यशवंतांच्या घरामध्ये तुमचे सहर्ष स्वागत आहे!",
    quoteHi: "विजेताओं और सफलताओं के घर में आपका हार्दिक स्वागत है।",
    particle: "flame",
  },
  {
    id: 6,
    name: "Infinite Wisdom Star",
    nameMr: "अनंत ज्ञान तारा",
    nameHi: "अनंत ज्ञान तारा",
    theme: "indigo-violet",
    category: "Elite",
    bg: "linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)",
    accent: "linear-gradient(to right, #818cf8, #c084fc, #e879f9)",
    icon: Compass,
    quote: "Navigate your dreams. A world of wisdom is now yours to explore.",
    quoteMr: "तुमच्या स्वप्नांना नवी दिशा द्या. ज्ञानाचे जग आता तुमचेच आहे.",
    quoteHi: "अपने सपनों को नई उड़ान दें। ज्ञान की दुनिया अब आपकी है।",
    particle: "star",
  },
];

function AdmissionTemplatesPage() {
  const { lang } = useLanguage();
  const [studentName, setStudentName] = useState("RAHUL DESHMUKH");
  const [studentClass, setStudentClass] = useState("CLASS 1st-A");

  const handleShareDashboard = () => {
    toast.success(
      `Welcome Masterpiece Published to ${studentName}'s Dashboard!`,
    );
  };

  const handleWhatsAppShare = () => {
    const message = `🎉 *Congratulations & Welcome!* 🎓\n\nDear Parent, we are delighted to welcome ${studentName} to our school family in ${studentClass}!\n\nYour child's success journey starts now.\n\n— From School Management ❤️`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-64 pt-16 min-h-screen">
        <div className="p-6 md:p-10 space-y-10">
          {/* High-Fidelity Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-slate-900 rounded-[3.5rem] p-10 md:p-16 text-white shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/30 via-transparent to-blue-600/30" />
            <div className="absolute -right-20 -top-20 size-96 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
              <div className="space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-500/20 backdrop-blur-xl rounded-full border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em]"
                >
                  <Sparkles className="size-4" />{" "}
                  {lang === "mr"
                    ? "प्रवेश कलात्मक दालन"
                    : lang === "hi"
                      ? "प्रवेश कलात्मक स्टूडियो"
                      : "Admission Creative Studio"}
                </motion.div>
                <h2 className="text-6xl md:text-7xl font-black tracking-tighter leading-none">
                  {lang === "mr"
                    ? "स्वागत"
                    : lang === "hi"
                      ? "स्वागत"
                      : "Welcome"}{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 italic">
                    {lang === "mr"
                      ? "तेजस्वी विद्यार्थ्यांचे"
                      : lang === "hi"
                        ? "तेजस्वी छात्रों का"
                        : "Bright Minds"}
                  </span>
                </h2>
                <p className="text-slate-400 font-medium max-w-2xl text-xl leading-relaxed">
                  {lang === "mr"
                    ? "प्रत्येक नवीन प्रवेशाचा आनंद घ्या आकर्षक स्वागत कार्डांसह. पहिल्या दिवसापासून प्रोत्साहित करा."
                    : lang === "hi"
                      ? "आकर्षक स्वागत कार्डों के साथ प्रत्येक नए प्रवेश का जश्न मनाएं। पहले दिन से प्रेरित करें।"
                      : "Celebrate every new enrollment with cinematic, high-fidelity welcome cards. Personalize, publish, and inspire from day one."}
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

          {/* Premium Template Gallery */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {ADMISSION_TEMPLATES.map((template, idx) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="group relative bg-white rounded-[4rem] p-5 shadow-2xl border border-slate-100"
              >
                <div
                  className="aspect-[4/3] rounded-[3rem] overflow-hidden relative shadow-inner"
                  style={{ background: template.bg }}
                >
                  <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />

                  {/* Unique Template Animations */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={
                          template.particle === "sparkle"
                            ? {
                                scale: [1, 1.5, 1],
                                opacity: [0.1, 0.4, 0.1],
                              }
                            : template.particle === "float"
                              ? { y: [0, -100, 0], x: [0, 20, 0] }
                              : template.particle === "wave"
                                ? {
                                    x: [-20, 20, -20],
                                    opacity: [0.1, 0.3, 0.1],
                                  }
                                : {
                                    scale: [0.8, 1.2, 0.8],
                                    opacity: [0.1, 0.3, 0.1],
                                  }
                        }
                        transition={{
                          duration: 4 + i,
                          repeat: Infinity,
                          delay: i * 0.4,
                        }}
                        className="absolute size-4 rounded-full blur-[2px] bg-white/20"
                        style={{ left: `${(i + 1) * 12}%`, bottom: "10%" }}
                      />
                    ))}
                  </div>

                  <div className="relative h-full p-10 flex flex-col items-center justify-center text-center">
                    <motion.div
                      animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="size-20 bg-white/10 backdrop-blur-2xl rounded-[1.8rem] flex items-center justify-center mb-6 border border-white/20 shadow-2xl"
                    >
                      <template.icon className="size-10 text-white" />
                    </motion.div>

                    <h4 className="text-3xl font-black text-white tracking-tighter italic mb-2">
                      {lang === "mr"
                        ? "हार्दिक अभिनंदन!"
                        : lang === "hi"
                          ? "हार्दिक बधाई!"
                          : "Congratulations!"}
                    </h4>
                    <div
                      className="h-1 w-12 bg-white/30 rounded-full mb-6"
                      style={{ background: template.accent }}
                    />

                    <p className="text-[8px] font-black uppercase tracking-[0.6em] text-white/50 mb-2 leading-none">
                      {lang === "mr"
                        ? "शाळेत आपले स्वागत आहे"
                        : lang === "hi"
                          ? "विद्यालय में आपका स्वागत है"
                          : "Welcome to the Academy"}
                    </p>
                    <h5
                      className="text-3xl md:text-4xl font-black text-white tracking-tighter leading-none px-4"
                      style={{
                        backgroundImage: template.accent,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.4))",
                      }}
                    >
                      {studentName}
                    </h5>

                    <div className="mt-8 px-10 py-4 rounded-3xl bg-black/20 backdrop-blur-xl border border-white/10 shadow-2xl">
                      <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] italic">
                        {studentClass}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-8 py-10 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="max-w-[80%]">
                      <p className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">
                        {lang === "mr"
                          ? template.nameMr
                          : lang === "hi"
                            ? template.nameHi
                            : template.name}
                      </p>
                      <p className="text-xs font-bold text-slate-400 italic leading-snug">
                        "
                        {lang === "mr"
                          ? template.quoteMr
                          : lang === "hi"
                            ? template.quoteHi
                            : template.quote}
                        "
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button className="size-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 hover:text-pink-500 hover:bg-pink-50 transition-all border border-slate-100 shadow-sm">
                        <Heart className="size-5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Link
                      to="/teacher/templates/edit/$templateId"
                      params={{
                        templateId: `admission-${template.id}`,
                      }}
                      className="flex-1 py-3.5 bg-slate-950 text-white rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-slate-800 transition-all shadow-md text-center font-black"
                    >
                      <Edit3 className="size-4" />{" "}
                      {lang === "mr"
                        ? "संपादन"
                        : lang === "hi"
                          ? "संपादन"
                          : "Edit"}
                    </Link>
                    <button className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-blue-700 transition-all shadow-md font-black">
                      <Download className="size-4" />{" "}
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
