import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  CreditCard,
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

export const Route = createFileRoute("/teacher/templates/idcard")({
  head: () => ({ meta: [{ title: "ID Card Templates — Teacher Portal" }] }),
  component: IdCardTemplatesPage,
});

const IDCARD_TEMPLATES = [
  { id: 1, name: "Royale Burgundy & Gold", nameMr: "रॉयल बर्गंडी व गोल्ड", category: "Elite 3D" },
  { id: 2, name: "Navy Sapphire Executive", nameMr: "नेव्ही सॅफायर एक्झिक्युटिव्ह", category: "Executive" },
  { id: 3, name: "Emerald Prestige Scholar", nameMr: "एमराल्ड प्रेस्टीज स्कॉलर", category: "Prestige" },
  { id: 4, name: "Imperial Purple Sovereign", nameMr: "इम्पिरियल पर्पल ओळखपत्र", category: "Imperial" },
  { id: 5, name: "Cyber Tech RFID", nameMr: "सायबर टेक RFID पास", category: "Cyber Smart" },
  { id: 6, name: "Crimson Academy Gold", nameMr: "क्रिम्सन अकॅडमी गोल्ड", category: "Grand Scholar" },
  { id: 7, name: "Slate Minimalist Pass", nameMr: "स्लेट मिनिमलिस्ट पास", category: "Modern Minimal" },
  { id: 8, name: "Amber Sunrise Campus", nameMr: "अंबर सनराईज कॅम्पस", category: "Sunrise Gold" },
  { id: 9, name: "Classic Ivy League", nameMr: "क्लासिक आयव्ही लीग", category: "Heritage" },
  { id: 10, name: "Titanium Black Pass", nameMr: "टायटॅनियम ब्लॅक पास", category: "Titanium Elite" },
];

function IdCardTemplatesPage() {
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-0 pt-16 min-h-screen">
        <div className="p-4 md:p-10 space-y-8 max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-gradient-to-r from-red-950 via-rose-950 to-slate-950 rounded-[3rem] p-8 md:p-12 text-white shadow-2xl border border-rose-500/20"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-500/10 via-transparent to-black/60 pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-500/20 backdrop-blur-md rounded-full border border-rose-400/40 text-rose-300 text-xs font-black uppercase tracking-widest">
                  <CreditCard className="size-3.5 text-rose-300" /> 10 Realistic 3D Student ID Cards
                </div>
                <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                  {lang === "mr"
                    ? "विद्यार्थी ओळखपत्र "
                    : lang === "hi"
                      ? "छात्र पहचान पत्र "
                      : "Student ID Cards "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-300 via-amber-200 to-yellow-400">
                    {lang === "mr" ? "१० भव्य ३D कार्ड्स" : "10 3D Cards"}
                  </span>
                </h2>
                <p className="text-rose-100/70 text-sm max-w-xl font-medium">
                  {lang === "mr"
                    ? "मेटॅलिक क्लिप, सर्क्युलर फोटो फ्रेम, बारकोड आणि संपूर्ण विद्यार्थी तपशीलासह १० कस्टम ३D कार्ड्स."
                    : "10 custom 3D ID cards with metallic lanyard clips, circular frames, and barcodes."}
                </p>
              </div>
              <Link
                to="/teacher/templates"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-wider hover:scale-105 transition-all shadow-xl self-start md:self-auto"
              >
                <ArrowLeft className="size-4" />{" "}
                {lang === "mr" ? "सर्व टेम्पलेट्स" : "All Templates"}
              </Link>
            </div>
          </motion.div>

          {/* 10 Template Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {IDCARD_TEMPLATES.map((template, idx) => (
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
                    category="idcard"
                    variantId={template.id}
                    studentName="SATYAJIT PATIL"
                    studentClass="5th"
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
                      <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">
                        {template.category}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button className="size-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all border border-slate-100">
                        <Heart className="size-3.5" />
                      </button>
                      <button className="size-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all border border-slate-100">
                        <Share2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <Link
                    to="/teacher/templates/edit/$templateId"
                    params={{ templateId: `idcard-${template.id}` }}
                    className="w-full py-2.5 bg-gradient-to-r from-red-700 via-rose-700 to-red-800 hover:from-red-600 hover:to-rose-600 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md text-center hover:shadow-lg"
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
export default IdCardTemplatesPage;
