import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Star,
  Mic2,
  Music,
  Camera,
  Theater,
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
  Medal,
  Timer,
  Zap,
  Trophy,
  LayoutGrid,
} from "lucide-react";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { showToast as toast } from "@/lib/custom-toast";
import { useLanguage } from "@/hooks/use-language";

export const Route = createFileRoute("/teacher/templates/annual")({
  head: () => ({
    meta: [{ title: "Annual Function Manager — Teacher Portal" }],
  }),
  component: AnnualTemplatesPage,
});

const ANNUAL_TEMPLATES = [
  {
    id: 1,
    name: "Royal Stage Welcome",
    nameMr: "शाही मंच स्वागत",
    nameHi: "शाही मंच स्वागत",
    type: "Premium Gala",
    typeMr: "प्रिमियम सोहळा",
    typeHi: "प्रीमियम समारोह",
    bg: "linear-gradient(135deg, #1a1a1a 0%, #3d2b1f 100%)",
    accent: "linear-gradient(to right, #bf953f, #fcf6ba, #b38728)",
    icon: Theater,
    quote: "Step into a night of wonder and celebration. Witness the magic!",
<<<<<<< HEAD
    quoteMr: "अद्भूत आणि उत्साहाच्या संध्याकाळमध्ये सामील व्हा. जादूचे साक्षीदार व्हा!",
=======
    quoteMr:
      "अद्भूत आणि उत्साहाच्या संध्याकाळमध्ये सामील व्हा. जादूचे साक्षीदार व्हा!",
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
    quoteHi: "अद्भुत और उत्सव की रात में शामिल हों। जादू के साक्षी बनें!",
  },
  {
    id: 2,
    name: "Golden Legacy Awards",
    nameMr: "सुवर्ण वारसा पुरस्कार",
    nameHi: "स्वर्ण विरासत पुरस्कार",
    type: "Ceremony",
    typeMr: "पुरस्कार सोहळा",
    typeHi: "पुरस्कार समारोह",
    bg: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
    accent: "linear-gradient(to right, #facc15, #fbbf24, #f59e0b)",
    icon: Trophy,
    quote: "Celebrating the hard work, talent, and achievements of our stars.",
    quoteMr: "आमच्या ताऱ्यांच्या कठोर परिश्रम, प्रतिभा आणि यशाचा गौरव सोहळा.",
<<<<<<< HEAD
    quoteHi: "हमारे सितारों की कड़ी मेहनत, प्रतिभा और उपलब्धियों का सम्मान सोहळा।",
=======
    quoteHi:
      "हमारे सितारों की कड़ी मेहनत, प्रतिभा और उपलब्धियों का सम्मान सोहळा।",
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  },
  {
    id: 3,
    name: "Retro Drama Gala",
    nameMr: "पारंपारिक नाटक सोहळा",
    nameHi: "पारंपरिक नाटक समारोह",
    type: "Live Show",
    typeMr: "थेट सादरीकरण",
    typeHi: "लाइव शो",
    bg: "linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)",
    accent: "linear-gradient(to right, #f87171, #fb923c, #facc15)",
    icon: Mic2,
    quote: "Experience the timeless stories brought to life by our performers.",
    quoteMr: "आमच्या कलाकारांनी जिवंत केलेल्या अजरामर कथांचा अनुभव घ्या.",
    quoteHi: "हमारे कलाकारों द्वारा जीवंत की गई कालजयी कहानियों का अनुभव करें।",
  },
  {
    id: 4,
    name: "Futuristic Fusion",
    nameMr: "भविष्यकालीन फ्युजन",
    nameHi: "भविष्योन्मुखी फ्यूजन",
    type: "Modern",
    typeMr: "आधुनिक",
    typeHi: "आधुनिक",
    bg: "linear-gradient(135deg, #0c4a6e 0%, #082f49 100%)",
    accent: "linear-gradient(to right, #38bdf8, #818cf8, #2dd4bf)",
    icon: Rocket,
    quote: "Where tradition meets the future. A high-energy showcase!",
    quoteMr: "जिथे परंपरांचा आणि भविष्याचा मेळ होतो. एक उर्जावान सोहळा!",
    quoteHi: "जहां परंपरा का भविष्य से मेल होता है। एक उच्च ऊर्जा वाला शो!",
  },
];

function AnnualTemplatesPage() {
  const { lang } = useLanguage();
  const [studentName, setStudentName] = useState("ADITYA DESHMUKH");
  const [eventName, setEventName] = useState("ANNUAL GALA 2026");

  const handleShareDashboard = () => {
    toast.success(`Annual invitation published to ${studentName}'s dashboard!`);
  };

  const handleWhatsAppShare = () => {
    const message = `🎭 *Grand Annual Function 2026* 🌟\n\nDear Parent, we are proud to share a special update regarding ${studentName} for the ${eventName}!\n\nCheck out the invitation here: [Link]\n\n— School Events Department 🎭`;
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
            <div className="absolute inset-0 bg-gradient-to-br from-amber-600/30 via-transparent to-orange-600/30" />
            <div className="absolute -right-20 -top-20 size-96 bg-amber-500/10 rounded-full blur-[120px] animate-pulse" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
              <div className="space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-amber-500/20 backdrop-blur-xl rounded-full border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-[0.2em]"
                >
                  <Sparkles className="size-4" />{" "}
                  {lang === "mr"
                    ? "स्नेहसंमेलन नियंत्रण केंद्र"
                    : lang === "hi"
                      ? "वार्षिकोत्सव नियंत्रण केंद्र"
                      : "Annual Command Center"}
                </motion.div>
                <h2 className="text-6xl md:text-7xl font-black tracking-tighter leading-none">
<<<<<<< HEAD
                  {lang === "mr" ? "वार्षिक" : lang === "hi" ? "वार्षिक" : "Annual"}{" "}
=======
                  {lang === "mr"
                    ? "वार्षिक"
                    : lang === "hi"
                      ? "वार्षिक"
                      : "Annual"}{" "}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 italic">
                    {lang === "mr"
                      ? "स्नेहसंमेलन नैपुण्य"
                      : lang === "hi"
                        ? "उत्कृष्टता"
                        : "Excellence"}
                  </span>
                </h2>
                <p className="text-slate-400 font-medium max-w-2xl text-xl leading-relaxed">
                  {lang === "mr"
                    ? "सिनेमॅटिक आमंत्रणे आणि पुरस्कार टेम्पलेट्ससह तुमच्या शाळेचा भव्य सोहळा आयोजित करा."
                    : lang === "hi"
                      ? "सिनेमैटिक आमंत्रण और पुरस्कार टेम्पलेट्स के साथ अपने स्कूल के भव्य समारोह का आयोजन करें।"
                      : "Orchestrate your school's grandest night with cinematic invitations and award templates. Legacy, talent, and glory."}
                </p>
              </div>
              <Link
                to="/teacher/templates"
                className="group flex items-center gap-4 px-10 py-6 bg-white text-slate-900 rounded-[2.5rem] font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-2xl"
              >
                <ArrowLeft className="size-5 group-hover:-translate-x-1 transition-transform" />{" "}
<<<<<<< HEAD
                {lang === "mr" ? "टेम्प्लेट्स" : lang === "hi" ? "टेम्प्लेट्स" : "Templates"}
=======
                {lang === "mr"
                  ? "टेम्प्लेट्स"
                  : lang === "hi"
                    ? "टेम्प्लेट्स"
                    : "Templates"}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
              </Link>
            </div>
          </motion.div>

          {/* Template Gallery */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {ANNUAL_TEMPLATES.map((template, idx) => (
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

                  {/* Animated Stage Elements */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(6)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          opacity: [0.1, 0.4, 0.1],
                          scale: [1, 1.2, 1],
                          y: [0, -20, 0],
                        }}
                        transition={{
                          duration: 4 + i,
                          repeat: Infinity,
                          delay: i * 0.5,
                        }}
                        className="absolute size-40 rounded-full blur-[40px] bg-white/5"
                        style={{ left: `${i * 20}%`, top: "-10%" }}
                      />
                    ))}
                  </div>

                  <div className="relative h-full p-10 flex flex-col items-center justify-center text-center">
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0],
                      }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="size-20 bg-white/10 backdrop-blur-2xl rounded-[1.8rem] flex items-center justify-center mb-6 border border-white/20 shadow-2xl"
                    >
                      <template.icon className="size-10 text-white" />
                    </motion.div>

                    <h4 className="text-3xl font-black text-white tracking-tighter italic mb-2">
                      {lang === "mr"
                        ? "महा सोहळा"
                        : lang === "hi"
                          ? "महा समारोह"
                          : "GRAND FINALE"}
                    </h4>
                    <div
                      className="h-1 w-12 bg-white/30 rounded-full mb-6"
                      style={{ background: template.accent }}
                    />

                    <p className="text-[8px] font-black uppercase tracking-[0.6em] text-white/50 mb-2 leading-none">
                      {lang === "mr"
                        ? "वार्षिक स्नेहसंमेलन"
                        : lang === "hi"
                          ? "वार्षिक स्नेहसंमेलन"
                          : "Annual Celebration"}
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
                        {eventName}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-8 py-10 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="max-w-[80%]">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-amber-100 text-amber-600">
                          {lang === "mr"
                            ? template.typeMr
                            : lang === "hi"
                              ? template.typeHi
                              : template.type}
                        </span>
                      </div>
                      <p className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">
                        {lang === "mr"
                          ? template.nameMr
                          : lang === "hi"
                            ? template.nameHi
                            : template.name}
                      </p>
                      <p className="text-xs font-bold text-slate-400 italic leading-snug">
<<<<<<< HEAD
                        "{lang === "mr"
                          ? template.quoteMr
                          : lang === "hi"
                            ? template.quoteHi
                            : template.quote}"
=======
                        "
                        {lang === "mr"
                          ? template.quoteMr
                          : lang === "hi"
                            ? template.quoteHi
                            : template.quote}
                        "
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button className="size-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 hover:text-amber-500 hover:bg-amber-50 transition-all border border-slate-100 shadow-sm">
                        <Star className="size-5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Link
                      to="/teacher/templates/edit/$templateId"
                      params={{ templateId: `annual-${template.id}` }}
                      className="flex-1 py-3.5 bg-slate-950 text-white rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-slate-800 transition-all shadow-md text-center font-black"
                    >
                      <Edit3 className="size-4" />{" "}
<<<<<<< HEAD
                      {lang === "mr" ? "संपादन" : lang === "hi" ? "संपादन" : "Edit"}
                    </Link>
                    <button className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-blue-700 transition-all shadow-md font-black">
                      <Download className="size-4" />{" "}
                      {lang === "mr" ? "डाउनलोड" : lang === "hi" ? "डाउनलोड" : "Download"}
=======
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
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
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
