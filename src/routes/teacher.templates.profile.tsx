import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  User,
  Heart,
  Share2,
  Edit3,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { Link } from "@tanstack/react-router";
import { useLanguage } from "@/hooks/use-language";
import { CustomTemplateFrame } from "@/components/teacher/CustomTemplateFrame";

export const Route = createFileRoute("/teacher/templates/profile")({
  head: () => ({ meta: [{ title: "Student Profile Templates — Teacher Portal" }] }),
  component: ProfileTemplatesPage,
});

const PROFILE_TEMPLATES = [
  { id: 1, name: "Holistic 360° Student Dossier", nameMr: "होलिस्टिक ३६०° विद्यार्थी प्रोफाईल", category: "NEP 3D" },
  { id: 2, name: "Royal Navy Scholar Bio", nameMr: "रॉयल नेव्ही स्कॉलर बायो", category: "Scholar Bio" },
  { id: 3, name: "Emerald Growth Portfolio", nameMr: "एमराल्ड ग्रोथ पोर्टफोलिओ", category: "Growth Eco" },
  { id: 4, name: "Ruby Leadership Profile", nameMr: "रुबी लीडरशिप प्रोफाईल", category: "Leadership" },
  { id: 5, name: "Modern Creative Portfolio", nameMr: "मॉडर्न क्रिएटिव्ह पोर्टफोलिओ", category: "Creative Arts" },
  { id: 6, name: "Cyber Scholar Identity", nameMr: "सायबर स्कॉलर डिजिटल आयडी", category: "Digital ID" },
  { id: 7, name: "Sunrise Primary Dossier", nameMr: "सनराईज प्रायमरी डॉझियर", category: "Primary Joy" },
  { id: 8, name: "Classic Ivy League Dossier", nameMr: "क्लासिक आयव्ही लीग डॉझियर", category: "Ivy Heritage" },
  { id: 9, name: "STEM Prodigy Profile", nameMr: "STEM प्रॉडिजी प्रोफाईल", category: "STEM Genius" },
  { id: 10, name: "Valedictorian Comprehensive", nameMr: "कॉम्प्रिहेन्सिव्ह स्कॉलर प्रोफाईल", category: "Comprehensive" },
];

function ProfileTemplatesPage() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-0 pt-16 min-h-screen">
        <div className="p-3 xs:p-4 md:p-10 space-y-4 sm:space-y-8 max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-gradient-to-r from-orange-950 via-amber-950 to-slate-950 rounded-2xl sm:rounded-3xl md:rounded-[3rem] p-4 xs:p-5 sm:p-8 md:p-12 text-white shadow-xl md:shadow-2xl border border-orange-500/20"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-500/10 via-transparent to-black/60 pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-1.5 bg-orange-500/20 backdrop-blur-md rounded-full border border-orange-400/40 text-orange-300 text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest">
                  <User className="size-3.5 text-orange-300" /> 10 Realistic 3D Student Profiles
                </div>
                <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-5xl font-black tracking-tight leading-tight">
                  {lang === "mr"
                    ? "विद्यार्थी प्रोफाईल कार्ड "
                    : lang === "hi"
                      ? "छात्र प्रोफाइल कार्ड "
                      : "Student Profile Cards "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-amber-200 to-yellow-300">
                    {lang === "mr" ? "१० भव्य ३D कार्ड्स" : "10 3D Cards"}
                  </span>
                </h2>
                <p className="text-orange-100/70 text-xs sm:text-sm max-w-xl font-medium line-clamp-2 sm:line-clamp-none">
                  {lang === "mr"
                    ? "३D पुस्तके, वाचन, क्रीडा, चित्रकला व संगीत या ४ कौशल्यांच्या आयकॉन्ससह १० कस्टम ३D प्रोफाईल कार्ड्स."
                    : "10 custom 3D student profile cards with 3D books, circular photo frames, and 4 skill tokens."}
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
            {PROFILE_TEMPLATES.map((template, idx) => (
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
                    category="profile"
                    variantId={template.id}
                    studentName={lang === "mr" ? "सत्यजित पाटील" : "SATYAJIT PATIL"}
                    studentClass={lang === "mr" ? "इयत्ता ५-वी" : "5th"}
                    rollNo="12"
                    gender="Male"
                    dob="04/05/2015"
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
                      <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">
                        {template.category}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button className="size-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition-all border border-slate-100">
                        <Heart className="size-3.5" />
                      </button>
                      <button className="size-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all border border-slate-100">
                        <Share2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <Link
                    to="/teacher/templates/edit/$templateId"
                    params={{ templateId: `profile-${template.id}` }}
                    className="w-full py-2.5 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:from-orange-500 hover:to-amber-500 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md text-center hover:shadow-lg"
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
