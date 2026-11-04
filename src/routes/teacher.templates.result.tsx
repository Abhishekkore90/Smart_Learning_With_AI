import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  FileText,
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

export const Route = createFileRoute("/teacher/templates/result")({
  head: () => ({ meta: [{ title: "Result & Progress Templates — Teacher Portal" }] }),
  component: ResultTemplatesPage,
});

const RESULT_TEMPLATES = [
  { id: 1, name: "Championship Shield & Scorecard", nameMr: "चॅम्पियनशिप शील्ड गुणपत्रिका", category: "Master 3D" },
  { id: 2, name: "Navy Sovereign Honors", nameMr: "नेव्ही सोव्हेरिन ऑनर्स", category: "Distinction" },
  { id: 3, name: "Emerald Distinction Report", nameMr: "एमराल्ड डिस्टिंक्शन रिपोर्ट", category: "Honors Plus" },
  { id: 4, name: "Ruby Prestige Progress", nameMr: "रुबी प्रेस्टीज प्रोग्रेस", category: "Merit Star" },
  { id: 5, name: "Modern Neo-Scholastic Report", nameMr: "मॉडर्न निओ-स्कॉलॅस्टिक", category: "Modern 3D" },
  { id: 6, name: "Golden Crown Valedictorian", nameMr: "गोल्डन क्राउन टॉपर निकाल", category: "Valedictorian" },
  { id: 7, name: "Cyber Scholar Matrix", nameMr: "सायबर स्कॉलर मॅट्रिक्स", category: "Cyber Matrix" },
  { id: 8, name: "Holistic NEP 360° Report", nameMr: "होलिस्टिक NEP ३६०° निकाल", category: "NEP 360°" },
  { id: 9, name: "Minimalist Executive Summary", nameMr: "मिनिमलिस्ट एक्झिक्युटिव्ह निकाल", category: "Executive" },
  { id: 10, name: "Grand Academy Distinction", nameMr: "ग्रँड अकॅडमी डिस्टिंक्शन", category: "Grand Academy" },
];

function ResultTemplatesPage() {
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
            className="relative overflow-hidden bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-950 rounded-[3rem] p-8 md:p-12 text-white shadow-2xl border border-purple-500/20"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-black/60 pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-500/20 backdrop-blur-md rounded-full border border-purple-400/40 text-purple-300 text-xs font-black uppercase tracking-widest">
                  <FileText className="size-3.5 text-purple-300" /> 10 Realistic 3D Result & Scorecards
                </div>
                <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                  {lang === "mr"
                    ? "निकाल व प्रगती पत्र "
                    : lang === "hi"
                      ? "परीक्षा परिणाम व अंकतालिका "
                      : "Result & Progress Cards "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-200 to-amber-300">
                    {lang === "mr" ? "१० भव्य ३D कार्ड्स" : "10 3D Cards"}
                  </span>
                </h2>
                <p className="text-purple-100/70 text-sm max-w-xl font-medium">
                  {lang === "mr"
                    ? "गोल्डन शील्ड, गुणपत्रिका क्लिपबोर्ड, टक्केवारी, श्रेणी आणि अभिनंदनाची रिबनसह १० कस्टम ३D निकाल पत्रके."
                    : "10 custom 3D result scorecards with golden shields, progress tables, percentages, and grade honors."}
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
            {RESULT_TEMPLATES.map((template, idx) => (
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
                    category="result"
                    variantId={template.id}
                    studentName="SATYAJIT PATIL"
                    studentClass="5th"
                    totalMarks="500"
                    obtainedMarks="452"
                    percentage="90.40%"
                    grade="A+"
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
                      <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">
                        {template.category}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button className="size-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-purple-500 hover:bg-purple-50 transition-all border border-slate-100">
                        <Heart className="size-3.5" />
                      </button>
                      <button className="size-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all border border-slate-100">
                        <Share2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <Link
                    to="/teacher/templates/edit/$templateId"
                    params={{ templateId: `result-${template.id}` }}
                    className="w-full py-2.5 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-600 hover:to-indigo-600 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md text-center hover:shadow-lg"
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
export default ResultTemplatesPage;
