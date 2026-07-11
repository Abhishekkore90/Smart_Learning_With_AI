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
  Palette,
  PenTool,
  BookOpen,
} from "lucide-react";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { showToast as toast } from "@/lib/custom-toast";
import { useLanguage } from "@/hooks/use-language";

export const Route = createFileRoute("/teacher/templates/cultural")({
  head: () => ({ meta: [{ title: "Cultural Arts Manager — Teacher Portal" }] }),
  component: CulturalTemplatesPage,
});

const CULTURAL_TEMPLATES = [
  {
    id: 1,
    name: "Paint & Splash Hub",
    nameMr: "रंग आणि कुंचला केंद्र",
    nameHi: "रंग और तूलिका केंद्र",
    type: "Fine Arts",
    typeMr: "ललित कला",
    typeHi: "ललित कला",
    bg: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
    accent: "linear-gradient(to right, #34d399, #6ee7b7, #10b981)",
    icon: Palette,
    quote: "Let your colors tell a story. Express your artistic soul!",
    quoteMr: "तुमच्या रंगांना एक कथा सांगू द्या. तुमची कला व्यक्त करा!",
<<<<<<< HEAD
    quoteHi: "अपने रंगों को एक कहानी बयां करने दें। अपनी कलात्मक आत्मा को व्यक्त करें!",
=======
    quoteHi:
      "अपने रंगों को एक कहानी बयां करने दें। अपनी कलात्मक आत्मा को व्यक्त करें!",
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  },
  {
    id: 2,
    name: "Rhythm & Beats",
    nameMr: "लय आणि ताल",
    nameHi: "लय और ताल",
    type: "Performing Arts",
    typeMr: "सादरीकरण कला",
    typeHi: "प्रदर्शन कला",
    bg: "linear-gradient(135deg, #4c1d95 0%, #1e1b4b 100%)",
    accent: "linear-gradient(to right, #a78bfa, #818cf8, #6366f1)",
    icon: Music,
    quote: "Feel the beat, own the stage. Show the world your moves!",
    quoteMr: "आवाज वाढव, मंचावर अधिराज्य गाजवा. जगाला तुमची कला दाखवा!",
    quoteHi: "ताल महसूस करें, मंच पर राज करें। दुनिया को अपनी कला दिखाएं!",
  },
  {
    id: 3,
    name: "Traditional Roots",
    nameMr: "पारंपारिक पाळेमुळे",
    nameHi: "पारंपरिक जड़ें",
    type: "Heritage",
    typeMr: "वारसा",
    typeHi: "धरोहर",
    bg: "linear-gradient(135deg, #78350f 0%, #451a03 100%)",
    accent: "linear-gradient(to right, #fbbf24, #f59e0b, #d97706)",
    icon: School,
    quote: "Celebrating the vibrant traditions that make us who we are.",
    quoteMr: "आपल्याला समृद्ध करणाऱ्या सळसळत्या परंपरांचा उत्सव साजरा करा.",
    quoteHi: "उन जीवंत परंपराओं का जश्न मनाएं जो हमें अद्वितीय बनाती हैं।",
  },
  {
    id: 4,
    name: "Neon Talent Hunt",
    nameMr: "नेऑन टॅलेंट शोध",
    nameHi: "नियॉन टैलेंट खोज",
    type: "Variety Show",
    typeMr: "विविध गुणदर्शन",
    typeHi: "विविध कार्यक्रम",
    bg: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
    accent: "linear-gradient(to right, #22d3ee, #0d9488, #2dd4bf)",
    icon: Sparkles,
    quote: "Uncover the hidden star within you. Your time to shine is now!",
    quoteMr: "तुमच्यातील लपलेला तारा शोधा. चमकण्याची वेळ आता आली आहे!",
    quoteHi: "अपने भीतर छिपे सितारे को खोजें। आपके चमकने का समय आ गया है!",
  },
];

function CulturalTemplatesPage() {
  const { lang } = useLanguage();
  const [studentName, setStudentName] = useState("RAHUL VARMA");
  const [activityName, setActivityName] = useState("CULTURAL WEEK 2026");

  const handleShareDashboard = () => {
    toast.success(`Cultural card published to ${studentName}'s dashboard!`);
  };

  const handleWhatsAppShare = () => {
    const message = `🎨 *Cultural Arts Achievement* ✨\n\nDear Parent, we are proud to celebrate ${studentName}'s creative participation in the ${activityName}!\n\nCheck out the card here: [Link]\n\n— School Arts Council 🎨`;
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
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/30 via-transparent to-indigo-600/30" />
            <div className="absolute -right-20 -top-20 size-96 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
              <div className="space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-500/20 backdrop-blur-xl rounded-full border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em]"
                >
                  <Palette className="size-4" />{" "}
                  {lang === "mr"
                    ? "सांस्कृतिक नियंत्रण केंद्र"
                    : lang === "hi"
                      ? "सांस्कृतिक नियंत्रण केंद्र"
                      : "Cultural Command Center"}
                </motion.div>
                <h2 className="text-6xl md:text-7xl font-black tracking-tighter leading-none">
<<<<<<< HEAD
                  {lang === "mr" ? "सर्जनशील" : lang === "hi" ? "सृजनात्मक" : "Creative"}{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400 italic">
                    {lang === "mr" ? "नैपुण्य" : lang === "hi" ? "महारत" : "Mastery"}
=======
                  {lang === "mr"
                    ? "सर्जनशील"
                    : lang === "hi"
                      ? "सृजनात्मक"
                      : "Creative"}{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400 italic">
                    {lang === "mr"
                      ? "नैपुण्य"
                      : lang === "hi"
                        ? "महारत"
                        : "Mastery"}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  </span>
                </h2>
                <p className="text-slate-400 font-medium max-w-2xl text-xl leading-relaxed">
                  {lang === "mr"
                    ? "शाळेच्या सांस्कृतिक स्पर्धांसाठी आकर्षक प्रमाणपत्रे आणि आमंत्रणे तयार करा."
                    : lang === "hi"
                      ? "अपने स्कूल की सांस्कृतिक प्रतियोगिताओं के लिए जीवंत प्रमाण पत्र और आमंत्रण पत्र डिजाइन करें।"
                      : "Design vibrant certificates and invitations for your school's creative competitions. Arts, rhythm, and soul."}
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
            {CULTURAL_TEMPLATES.map((template, idx) => (
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

                  {/* Animated Artistic Particles */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [0.1, 0.3, 0.1],
                          rotate: [0, 90, 180, 270, 360],
                        }}
                        transition={{
                          duration: 6 + i,
                          repeat: Infinity,
                          delay: i * 0.5,
                        }}
                        className="absolute size-20 rounded-full blur-[30px] bg-white/5"
                        style={{ left: `${(i + 1) * 12}%`, bottom: "10%" }}
                      />
                    ))}
                  </div>

                  <div className="relative h-full p-10 flex flex-col items-center justify-center text-center">
                    <motion.div
                      animate={{ y: [0, -10, 0], scale: [1, 1.1, 1] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="size-20 bg-white/10 backdrop-blur-2xl rounded-[1.8rem] flex items-center justify-center mb-6 border border-white/20 shadow-2xl"
                    >
                      <template.icon className="size-10 text-white" />
                    </motion.div>

                    <h4 className="text-3xl font-black text-white tracking-tighter italic mb-2">
                      {lang === "mr"
                        ? "कलात्मक तारा"
                        : lang === "hi"
                          ? "सृजनात्मक सितारा"
                          : "CREATIVE STAR"}
                    </h4>
                    <div
                      className="h-1 w-12 bg-white/30 rounded-full mb-6"
                      style={{ background: template.accent }}
                    />

                    <p className="text-[8px] font-black uppercase tracking-[0.6em] text-white/50 mb-2 leading-none">
                      {lang === "mr"
                        ? "सांस्कृतिक कला स्पर्धा"
                        : lang === "hi"
                          ? "सांस्कृतिक कला प्रतियोगिता"
                          : "Cultural Arts Contest"}
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
                        {activityName}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-8 py-10 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="max-w-[80%]">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-indigo-100 text-indigo-600">
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
                      <button className="size-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all border border-slate-100 shadow-sm">
                        <Star className="size-5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Link
                      to="/teacher/templates/edit/$templateId"
                      params={{
                        templateId: `cultural-${template.id}`,
                      }}
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
