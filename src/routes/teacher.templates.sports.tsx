import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Target,
  Zap,
  Activity,
  Dumbbell,
  Flag,
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
  Star,
} from "lucide-react";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { showToast as toast } from "@/lib/custom-toast";
import { useLanguage } from "@/hooks/use-language";

export const Route = createFileRoute("/teacher/templates/sports")({
  head: () => ({
    meta: [{ title: "Sports Excellence Manager — Teacher Portal" }],
  }),
  component: SportsTemplatesPage,
});

const SPORTS_TEMPLATES = [
  {
    id: 1,
    name: "Grand Sports Day Invitation",
    nameMr: "भव्य क्रीडा दिन आमंत्रण",
    nameHi: "भव्य खेल दिवस आमंत्रण",
    type: "Invitation",
    typeMr: "आमंत्रण",
    typeHi: "आमंत्रण",
    bg: "linear-gradient(135deg, #450a0a 0%, #991b1b 100%)",
    accent: "linear-gradient(to right, #facc15, #fbbf24, #f59e0b)",
    icon: Flag,
    quote: "Join us for a day of speed, strength, and school spirit!",
    quoteMr: "वेग, ताकद आणि शालेय उत्साहाच्या सोहळ्यात सहभागी व्हा!",
<<<<<<< HEAD
    quoteHi: "गति, शक्ति और विद्यालय की खेल भावना से भरे इस दिन में हमारे साथ जुड़ें!",
=======
    quoteHi:
      "गति, शक्ति और विद्यालय की खेल भावना से भरे इस दिन में हमारे साथ जुड़ें!",
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  },
  {
    id: 2,
    name: "Victory Award Ceremony",
    nameMr: "विजय पुरस्कार सोहळा",
    nameHi: "विजय पुरस्कार समारोह",
    type: "Invitation",
    typeMr: "आमंत्रण",
    typeHi: "आमंत्रण",
    bg: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
    accent: "linear-gradient(to right, #818cf8, #c084fc, #e879f9)",
    icon: Calendar,
    quote: "Celebrating our athletes' incredible journey and achievements.",
<<<<<<< HEAD
    quoteMr: "आमच्या क्रीडापटूंच्या अविश्वसनीय प्रवासाचे आणि यशाचे कौतुक सोहळा.",
=======
    quoteMr:
      "आमच्या क्रीडापटूंच्या अविश्वसनीय प्रवासाचे आणि यशाचे कौतुक सोहळा.",
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
    quoteHi: "हमारे एथलीटों की अविश्वसनीय यात्रा और उपलब्धियों का उत्सव।",
  },
  {
    id: 3,
    name: "Gold Medal Achievement",
    nameMr: "सुवर्ण पदक यश संपादन",
    nameHi: "स्वर्ण पदक उपलब्धि",
    type: "Congratulation",
    typeMr: "अभिनंदन",
    typeHi: "बधाई",
    bg: "linear-gradient(135deg, #1a1a1a 0%, #3d2b1f 100%)",
    accent: "linear-gradient(to right, #bf953f, #fcf6ba, #b38728)",
    icon: Medal,
    quote: "Hard work pays off. Congratulations on your historic win!",
    quoteMr: "कष्ट फळले! तुमच्या ऐतिहासिक विजयाबद्दल तुमचे खूप अभिनंदन!",
    quoteHi: "कड़ी मेहनत का फल। आपके ऐतिहासिक जीत पर बहुत-बहुत बधाई!",
  },
  {
    id: 4,
    name: "Athlete of the Year",
    nameMr: "वर्षातील सर्वोत्तम खेळाडू",
    nameHi: "वर्ष का सर्वश्रेष्ठ एथलीट",
    type: "Congratulation",
    typeMr: "अभिनंदन",
    typeHi: "बधाई",
    bg: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
    accent: "linear-gradient(to right, #34d399, #6ee7b7, #10b981)",
    icon: Trophy,
    quote: "You've set the bar high. A true inspiration to the whole school.",
<<<<<<< HEAD
    quoteMr: "तुम्ही एक नवा आदर्श प्रस्थापित केला आहे. संपूर्ण शाळेसाठी एक खरी प्रेरणा.",
    quoteHi: "आपने एक नया मानदंड स्थापित किया है। पूरे स्कूल के लिए एक सच्ची प्रेरणा।",
=======
    quoteMr:
      "तुम्ही एक नवा आदर्श प्रस्थापित केला आहे. संपूर्ण शाळेसाठी एक खरी प्रेरणा.",
    quoteHi:
      "आपने एक नया मानदंड स्थापित किया है। पूरे स्कूल के लिए एक सच्ची प्रेरणा।",
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  },
];

function SportsTemplatesPage() {
  const { lang } = useLanguage();
  const [studentName, setStudentName] = useState("ADITYA RATHOD");
  const [eventName, setEventName] = useState("ANNUAL SPORTS MEET 2026");

  const handleShareDashboard = () => {
    toast.success(`Sports card published to ${studentName}'s dashboard!`);
  };

  const handleWhatsAppShare = () => {
    const message = `🏆 *Sports Excellence News!* 🏅\n\nDear Parent, we are proud to share a special update regarding ${studentName} for the ${eventName}!\n\nCheck out the card here: [Link]\n\n— School Sports Department ⚡`;
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
            <div className="absolute inset-0 bg-gradient-to-br from-rose-600/30 via-transparent to-orange-600/30" />
            <div className="absolute -right-20 -top-20 size-96 bg-rose-500/10 rounded-full blur-[120px] animate-pulse" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
              <div className="space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-rose-500/20 backdrop-blur-xl rounded-full border border-rose-500/30 text-rose-400 text-[10px] font-black uppercase tracking-[0.2em]"
                >
                  <Trophy className="size-4" />{" "}
                  {lang === "mr"
                    ? "क्रीडा नियंत्रण केंद्र"
                    : lang === "hi"
                      ? "खेल नियंत्रण केंद्र"
                      : "Sports Command Center"}
                </motion.div>
                <h2 className="text-6xl md:text-7xl font-black tracking-tighter leading-none">
                  {lang === "mr" ? "क्रीडा" : lang === "hi" ? "खेल" : "Athlete"}{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-400 italic">
<<<<<<< HEAD
                    {lang === "mr" ? "नैपुण्य" : lang === "hi" ? "उत्कृष्टता" : "Excellence"}
=======
                    {lang === "mr"
                      ? "नैपुण्य"
                      : lang === "hi"
                        ? "उत्कृष्टता"
                        : "Excellence"}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  </span>
                </h2>
                <p className="text-slate-400 font-medium max-w-2xl text-xl leading-relaxed">
                  {lang === "mr"
                    ? "उद्याच्या विजेत्यांसाठी क्रीडा सोहळ्याचे आमंत्रण आणि अभिनंदन कार्ड तयार करा."
                    : lang === "hi"
                      ? "कल के विजेताओं के लिए खेल समारोह के आमंत्रण और बधाई पत्र डिजाइन करें।"
                      : "Design high-energy invitations and congratulation cards for the champions of tomorrow. Speed, power, and glory."}
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
            {SPORTS_TEMPLATES.map((template, idx) => (
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

                  {/* Animated Action Particles */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(10)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          x: [0, 200, 0],
                          opacity: [0, 0.4, 0],
                          scale: [0.5, 1.5, 0.5],
                        }}
                        transition={{
                          duration: 3 + i * 0.2,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                        className="absolute h-1 w-20 rounded-full bg-white/20 blur-[1px]"
                        style={{ top: `${(i + 1) * 10}%`, left: "-20%" }}
                      />
                    ))}
                  </div>

                  <div className="relative h-full p-10 flex flex-col items-center justify-center text-center">
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, 10, -10, 0],
                      }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="size-20 bg-white/10 backdrop-blur-2xl rounded-[1.8rem] flex items-center justify-center mb-6 border border-white/20 shadow-2xl"
                    >
                      <template.icon className="size-10 text-white" />
                    </motion.div>

                    <h4 className="text-3xl font-black text-white tracking-tighter italic mb-2">
                      {template.type === "Invitation"
                        ? lang === "mr"
                          ? "आपणास आग्रहाचे आमंत्रण!"
                          : lang === "hi"
                            ? "आपको सादर आमंत्रित किया जाता है!"
                            : "YOU'RE INVITED!"
                        : lang === "mr"
                          ? "विजेता!"
                          : lang === "hi"
                            ? "विजेता!"
                            : "CHAMPION!"}
                    </h4>
                    <div
                      className="h-1 w-12 bg-white/30 rounded-full mb-6"
                      style={{ background: template.accent }}
                    />

                    <p className="text-[8px] font-black uppercase tracking-[0.6em] text-white/50 mb-2 leading-none">
                      {template.type === "Invitation"
                        ? lang === "mr"
                          ? "अधिकृत क्रीडा स्पर्धा"
                          : lang === "hi"
                            ? "आधिकारिक खेल स्पर्धा"
                            : "Official Sports Event"
                        : lang === "mr"
                          ? "उत्कृष्टता पुरस्कार"
                          : lang === "hi"
                            ? "उत्कृष्टता पुरस्कार"
                            : "Award of Excellence"}
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
                        <span
                          className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${template.type === "Invitation" ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"}`}
                        >
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
                      <button className="size-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all border border-slate-100 shadow-sm">
                        <Star className="size-5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Link
                      to="/teacher/templates/edit/$templateId"
                      params={{ templateId: `sports-${template.id}` }}
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
