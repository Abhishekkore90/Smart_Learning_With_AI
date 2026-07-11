import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Medal,
  Award,
  Star,
  Target,
  CheckCircle,
  Download,
  Edit3,
  ArrowLeft,
  User,
  Share2,
  PartyPopper,
  Crown,
  Flame,
  Rocket,
  Settings2,
  Calendar,
  MessageCircle,
  History,
  Users2,
  BellRing,
  Save,
  Loader2,
  School,
  Send,
  Medal as MedalIcon,
  Timer,
  Zap,
  Trophy as TrophyIcon,
  LayoutGrid,
  Sparkles,
} from "lucide-react";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { showToast as toast } from "@/lib/custom-toast";
import { useLanguage } from "@/hooks/use-language";

export const Route = createFileRoute("/teacher/templates/achievement")({
  head: () => ({
    meta: [{ title: "Achievement & Victory Hub — Teacher Portal" }],
  }),
  component: AchievementTemplatesPage,
});

const ACHIEVEMENT_TEMPLATES = [
  {
    id: 1,
    name: "Elite Scholar Award",
    nameMr: "उत्कृष्ट स्कॉलर पुरस्कार",
    nameHi: "उत्कृष्ट छात्र पुरस्कार",
    type: "Academic",
    typeMr: "शैक्षणिक",
    typeHi: "शैक्षणिक",
    bg: "linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%)",
    accent: "linear-gradient(to right, #fbbf24, #f59e0b, #d97706)",
    icon: Trophy,
    quote:
      "Excellence is not a skill, it's an attitude. Congratulations on your rank!",
    quoteMr:
      "उत्कृष्टता हे केवळ कौशल्य नसून एक वृत्ती आहे. तुमच्या रँक बद्दल अभिनंदन!",
    quoteHi:
      "उत्कृष्टता एक कौशल नहीं, बल्कि एक दृष्टिकोण है। आपकी रैंक पर बधाई!",
  },
  {
    id: 2,
    name: "Perfect Attendance",
    nameMr: "शंभर टक्के उपस्थिती",
    nameHi: "शत-प्रतिशत उपस्थिति",
    type: "Dedication",
    typeMr: "समर्पण",
    typeHi: "समर्पण",
    bg: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
    accent: "linear-gradient(to right, #34d399, #6ee7b7, #10b981)",
    icon: Calendar,
    quote: "Your consistency is the foundation of your success. Well done!",
    quoteMr: "तुमचे सातत्य हेच तुमच्या यशाचा पाया आहे. खूप छान!",
    quoteHi: "आपकी निरंतरता ही आपकी सफलता की नींव है। बहुत बढ़िया!",
  },
  {
    id: 3,
    name: "Rising Star Growth",
    nameMr: "उगवता तारा प्रगती",
    nameHi: "उगता सितारा प्रगति",
    type: "Progress",
    typeMr: "प्रगती",
    typeHi: "प्रगति",
    bg: "linear-gradient(135deg, #4c1d95 0%, #2e1065 100%)",
    accent: "linear-gradient(to right, #a78bfa, #818cf8, #6366f1)",
    icon: Sparkles,
    quote: "Watching you grow and succeed is our greatest reward. Keep it up!",
    quoteMr:
      "तुम्हाला प्रगती करताना आणि यशस्वी होताना पाहणे हाच आमचा सर्वात मोठा आनंद आहे. असेच पुढे जा!",
    quoteHi:
      "आपको बढ़ते और सफल होते देखना हमारा सबसे बड़ा पुरस्कार है। इसे जारी रखें!",
  },
  {
    id: 4,
    name: "Citizen of Honor",
    nameMr: "सन्माननीय नागरिक पुरस्कार",
    nameHi: "सम्मानित नागरिक",
    type: "Discipline",
    typeMr: "शिस्त",
    typeHi: "अनुशासन",
    bg: "linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)",
    accent: "linear-gradient(to right, #f87171, #fb923c, #facc15)",
    icon: Medal,
    quote: "Integrity and character define a true leader. We are proud of you!",
    quoteMr:
      "प्रामाणिकता आणि चारित्र्य खऱ्या नेत्याची व्याख्या करते. आम्हाला तुमचा सार्थ अभिमान आहे!",
    quoteHi:
      "ईमानदारी और चरित्र एक सच्चे नेता की पहचान हैं। हमें आप पर गर्व है!",
  },
];

function AchievementTemplatesPage() {
  const { lang } = useLanguage();
  const [studentName, setStudentName] = useState("ROHIT PATIL");
  const [achievementType, setAchievementType] = useState("CLASS TOPPER 2026");

  const handleShareDashboard = () => {
    toast.success(`Victory card published to ${studentName}'s dashboard!`);
  };

  const handleWhatsAppShare = () => {
    const message = `🏆 *Achievement Celebration* 🏅\n\nDear Parent, we are thrilled to celebrate ${studentName}'s victory in ${achievementType}!\n\nView the certificate: [Link]\n\n— Proud School Management ❤️`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-64 pt-16 min-h-screen">
        <div className="p-6 md:p-10 space-y-10">
          {/* Cinematic Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-slate-900 rounded-[3.5rem] p-10 md:p-16 text-white shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 via-transparent to-amber-600/30" />
            <div className="absolute -right-20 -top-20 size-96 bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
              <div className="space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-500/20 backdrop-blur-xl rounded-full border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]"
                >
                  <Trophy className="size-4" />{" "}
                  {lang === "mr"
                    ? "विजय नियंत्रण केंद्र"
                    : lang === "hi"
                      ? "विजय नियंत्रण केंद्र"
                      : "Victory Command Center"}
                </motion.div>
                <h2 className="text-6xl md:text-7xl font-black tracking-tighter leading-none">
                  {lang === "mr"
                    ? "यशस्वी"
                    : lang === "hi"
                      ? "विजय"
                      : "Victory"}{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-amber-400 italic">
                    {lang === "mr"
                      ? "दालन"
                      : lang === "hi"
                        ? "दालान"
                        : "Pavilion"}
                  </span>
                </h2>
                <p className="text-slate-400 font-medium max-w-2xl text-xl leading-relaxed">
                  {lang === "mr"
                    ? "तुमच्या विद्यार्थ्यांच्या समर्पण आणि कष्टाचा सन्मान करा. प्रत्येक मैलाचा दगड आणि विजय साजरा करणारी उत्कृष्ट प्रमाणपत्रे तयार करा."
                    : lang === "hi"
                      ? "अपने छात्रों के समर्पण और कड़ी मेहनत का सम्मान करें। प्रत्येक मील के पत्थर और जीत का जश्न मनाने वाले प्रीमियम प्रमाण पत्र बनाएं।"
                      : "Honor your students' dedication and hard work. Create premium certificates that celebrate every milestone and victory."}
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

          {/* Template Gallery */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {ACHIEVEMENT_TEMPLATES.map((template, idx) => (
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

                  {/* Animated Victory Particles */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(6)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          y: [-100, 500],
                          x: [0, Math.sin(i) * 50],
                          opacity: [0, 1, 0],
                          rotate: [0, 360],
                        }}
                        transition={{
                          duration: 3 + i,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                        className="absolute size-4 rounded-sm bg-white/20"
                        style={{ left: `${(i + 1) * 15}%`, top: "-10%" }}
                      />
                    ))}
                  </div>

                  <div className="relative h-full p-10 flex flex-col items-center justify-center text-center">
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 10, -10, 0],
                      }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="size-24 bg-white/10 backdrop-blur-2xl rounded-[2.5rem] flex items-center justify-center mb-8 border border-white/20 shadow-2xl"
                    >
                      <template.icon className="size-12 text-white" />
                    </motion.div>

                    <h4 className="text-4xl font-black text-white tracking-tighter italic mb-2 leading-none">
                      {lang === "mr"
                        ? "हार्दिक अभिनंदन!"
                        : lang === "hi"
                          ? "हार्दिक बधाई!"
                          : "CONGRATULATIONS"}
                    </h4>
                    <div
                      className="h-1.5 w-16 bg-white/30 rounded-full mb-8"
                      style={{ background: template.accent }}
                    />

                    <p className="text-[10px] font-black uppercase tracking-[0.8em] text-white/50 mb-3 leading-none">
                      {lang === "mr"
                        ? "यशस्वी संपादन पुरस्कार"
                        : lang === "hi"
                          ? "उपलब्धि पुरस्कार"
                          : "Achievement Award"}
                    </p>
                    <h5
                      className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none px-4"
                      style={{
                        backgroundImage: template.accent,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
                      }}
                    >
                      {studentName}
                    </h5>

                    <div className="mt-10 px-12 py-5 rounded-3xl bg-black/30 backdrop-blur-xl border border-white/10 shadow-2xl">
                      <span className="text-xs font-black text-white uppercase tracking-[0.3em] italic">
                        {achievementType}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-10 py-12 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="max-w-[70%]">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-blue-100 text-blue-600">
                          {lang === "mr"
                            ? template.typeMr
                            : lang === "hi"
                              ? template.typeHi
                              : template.type}
                        </span>
                      </div>
                      <p className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-3">
                        {lang === "mr"
                          ? template.nameMr
                          : lang === "hi"
                            ? template.nameHi
                            : template.name}
                      </p>
                      <p className="text-sm font-bold text-slate-400 italic leading-relaxed">
                        "
                        {lang === "mr"
                          ? template.quoteMr
                          : lang === "hi"
                            ? template.quoteHi
                            : template.quote}
                        "
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div className="size-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100">
                        <Star className="size-6" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Link
                      to="/teacher/templates/edit/$templateId"
                      params={{
                        templateId: `achievement-${template.id}`,
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
