import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Heart,
  Share2,
  Edit3,
  ArrowLeft,
  Crown,
  Sparkles,
} from "lucide-react";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { Link } from "@tanstack/react-router";
import { useLanguage } from "@/hooks/use-language";
import { CustomTemplateFrame, TEMPLATE_THEMES } from "@/components/teacher/CustomTemplateFrame";

export const Route = createFileRoute("/teacher/templates/studentofmonth")({
  head: () => ({
    meta: [{ title: "Student of the Month Templates — Teacher Portal" }],
  }),
  component: StudentOfMonthTemplatesPage,
});

const SOM_TEMPLATES = [
  { id: 1, name: "Royale Stage Spotlight", nameMr: "रॉयल स्टेज स्पॉटलाईट (मास्टर ३D)", category: "Master 3D" },
  { id: 2, name: "Red Carpet Grand Gala", nameMr: "रेड कार्पेट भव्य सोहळा", category: "Red Carpet 3D" },
  { id: 3, name: "Classical Library Hall of Fame", nameMr: "क्लासिकल लायब्ररी हॉल ऑफ फेम", category: "Library 3D" },
  { id: 4, name: "Crown & Trophy Studio 3D", nameMr: "क्राउन व ट्रॉफी स्टुडिओ ३D", category: "Studio 3D" },
  { id: 5, name: "Midnight Sapphire Gala", nameMr: "मिडनाईट सॅफायर गाला", category: "Sapphire 3D" },
  { id: 6, name: "Imperial Purple Sovereign", nameMr: "इम्पिरियल पर्पल मुकुट", category: "Imperial 3D" },
  { id: 7, name: "Emerald Prestige Honor", nameMr: "एमराल्ड प्रेस्टीज सन्मान", category: "Prestige 3D" },
  { id: 8, name: "Ruby Crimson Champion", nameMr: "रुबी क्रिम्सन चॅम्पियन", category: "Grand 3D" },
  { id: 9, name: "Golden Jubilee Sovereign", nameMr: "गोल्डन ज्युबिली गौरव", category: "Jubilee 3D" },
  { id: 10, name: "Cyber Star AI Luminary", nameMr: "सायबर स्टार AI ल्युमिनरी", category: "Neo-Tech 3D" },
];

function StudentOfMonthTemplatesPage() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-0 pt-16 min-h-screen">
        <div className="p-3 xs:p-4 md:p-10 space-y-4 sm:space-y-8 max-w-7xl mx-auto">
          {/* Cinematic Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-950 rounded-2xl sm:rounded-3xl md:rounded-[3rem] p-4 xs:p-5 sm:p-8 md:p-12 text-white shadow-xl md:shadow-2xl border border-indigo-500/20"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-black/60 pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6">
              <div className="space-y-1.5 sm:space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-4 sm:py-1.5 bg-indigo-500/20 backdrop-blur-md rounded-full border border-indigo-400/40 text-indigo-300 text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest">
                  <Crown className="size-3 sm:size-3.5 text-amber-300" /> 10 Realistic 3D Star Student Posters
                </div>
                <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-5xl font-black tracking-tight leading-tight">
                  {lang === "mr"
                    ? "महिना विद्यार्थी सन्मान "
                    : lang === "hi"
                      ? "महीने का सर्वश्रेष्ठ छात्र "
                      : "Student of the Month "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500">
                    {lang === "mr" ? "१० भव्य ३D पोस्टर्स" : "10 3D Posters"}
                  </span>
                </h2>
                <p className="text-indigo-100/70 text-xs sm:text-sm max-w-xl font-medium line-clamp-2 sm:line-clamp-none">
                  {lang === "mr"
                    ? "रॉयल मुकुट, स्टेज स्पॉटलाईट्स, गोल्डन लॉरेल पुष्पहार, सुवर्ण रिबन, पोडियम आणि ट्रॉफीसह १० भव्य कस्टम टेम्पलेट्स."
                    : "10 rich custom 3D templates with royal crowns, stage spotlights, golden laurels, and championship trophies."}
                </p>
              </div>
              <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0 flex-wrap">
                <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md p-1 rounded-xl border border-white/20 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setLang("mr")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      lang === "mr"
                        ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md scale-105"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    🇮🇳 मराठी
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang("en")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      lang === "en"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md scale-105"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    🇬🇧 English
                  </button>
                </div>
                <Link
                to="/teacher/templates"
                className="inline-flex items-center gap-1.5 px-4 py-2 sm:px-6 sm:py-3 bg-white text-slate-950 rounded-xl sm:rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-wider hover:scale-105 transition-all shadow-md sm:shadow-xl self-start sm:self-auto shrink-0"
              >
                <ArrowLeft className="size-3.5 sm:size-4" />{" "}
                {lang === "mr" ? "सर्व टेम्पलेट्स" : "All Templates"}
              </Link>
              </div>
            </div>
          </motion.div>

          {/* 10 Template Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SOM_TEMPLATES.map((template, idx) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative bg-white rounded-[2.5rem] p-4 shadow-xl border border-slate-100 flex flex-col justify-between hover:shadow-2xl transition-all duration-300"
              >
                {/* 3D Realistic Live Custom Visual */}
                <div className="relative aspect-square w-full rounded-[2rem] overflow-hidden shadow-lg group-hover:scale-[1.02] transition-transform duration-300 select-none">
                  <CustomTemplateFrame
                    category="studentofmonth"
                    variantId={template.id}
                    studentName={lang === "mr" ? "सत्यजित पाटील" : "SATYAJIT PATIL"}
                    studentClass={lang === "mr" ? "इयत्ता ५-वी" : "5th"}
                    cardQuote={lang === "mr" ? "आदर्श शिस्त, परिश्रम आणि शैक्षणिक उत्कृष्टतेबद्दल हार्दिक अभिनंदन!" : "Inspiring excellence, character, and scholastic diligence."}
                  />

                  {/* Badge */}
                  <div className="absolute top-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-black text-white border border-white/20 uppercase tracking-wider flex items-center gap-1.5 shadow-lg z-30">
                    <Sparkles className="size-3 text-amber-300" />
                    <span>{template.category}</span>
                  </div>
                </div>

                {/* Card Controls */}
                <div className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-900 tracking-tight">
                        {lang === "mr" ? template.nameMr : template.name}
                      </p>
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                        {template.category}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button className="size-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-all border border-slate-100">
                        <Heart className="size-3.5" />
                      </button>
                      <button className="size-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all border border-slate-100">
                        <Share2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <Link
                    to="/teacher/templates/edit/$templateId"
                    params={{ templateId: `studentofmonth-${template.id}` }}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md text-center hover:shadow-lg"
                  >
                    <Edit3 className="size-3.5" />{" "}
                    {lang === "mr" ? "तयार करा / संपादन" : "Create & Edit"}
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
