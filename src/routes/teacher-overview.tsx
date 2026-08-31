import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  School,
  Sparkles,
  Calendar,
  FileSpreadsheet,
  Notebook,
  Target,
  Star,
  Layout,
  ArrowRight,
  LogIn,
  ChevronRight,
} from "lucide-react";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/teacher-overview")({
  component: TeacherOverviewPage,
});

function TeacherOverviewPage() {
  const navigate = useNavigate();

  const handleLoginClick = (redirectPath = "/teacher") => {
    navigate({
      to: "/login",
      search: { redirect: redirectPath, role: "teacher" } as any,
    });
  };

  const modulesList = [
    {
      id: "01",
      name: "१. वेळापत्रक",
      targetRoute: "/teacher/timetable",
      icon: Calendar,
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/40",
      borderColor: "border-indigo-100 dark:border-indigo-900/30",
      description:
        "या विभागात आपणास इयत्ता पहिली ते आठवीचे वर्गनिहाय दैनिक व साप्ताहिक वेळापत्रक उपलब्ध होईल यामध्ये आवश्यक तो बदल करून एडिट करून शाळेच्या शिक्षकाच्या आणि मुख्याध्यापकांच्या नावासह आपणास ते प्रिंट करून आपल्या वर्गात वापरता येईल.",
    },
    {
      id: "02",
      name: "२. परिपाठ",
      targetRoute: "/teacher/modules/special-day",
      icon: Star,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/40",
      borderColor: "border-amber-100 dark:border-amber-900/30",
      description:
        "या विभागांतर्गत आपणास शाळेतील दैनिक परिपाठ उपलब्ध होईल या परिपाठाची पीडीएफ डाऊनलोड करून आपण ती विद्यार्थ्यांना व्हाट्सअप ग्रुप वर शेअर करू शकता तसेच परिपाठ रजिस्टर साठी महिन्याची एकत्रित पीडीएफ देखील उपलब्ध आहे.",
    },
    {
      id: "03",
      name: "३. टेम्पलेट",
      targetRoute: "/teacher/templates",
      icon: Layout,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/40",
      borderColor: "border-orange-100 dark:border-orange-900/30",
      description:
        "या विभागात आपण विद्यार्थ्यांच्या नावासह नाव, फोटो इयत्ता आकर्षक संदेश एडिट करून आकर्षक टेम्पलेट सह वाढदिवसाच्या शुभेच्छा, प्रवेश स्वागत, क्रीडा दिन, सांस्कृतिक कार्यक्रम, स्नेहसंमेलन, निकाल आणि यश असे विविध शुभेच्छा संदेश व्हाट्सअप वर पाठवू शकता.",
    },
    {
      id: "04",
      name: "४. वार्षिक नियोजन, मासिक नियोजन व प्रश्नपेढी",
      targetRoute: "/teacher/modules/annual-monthly-planning",
      icon: Target,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/40",
      borderColor: "border-blue-100 dark:border-blue-900/30",
      description:
        "या विभागात आपणास इयत्ता पहिली ते आठवी पर्यंतचे मराठी तसेच सेमी माध्यमचे वार्षिक नियोजन मासिक नियोजन आणि प्रश्नपेढी उपलब्ध होईल. त्यात आपण शाळेचे नाव शिक्षकाचे नाव मुख्याध्यापकांचे नाव आवश्यक बाबी भरून प्रिंट काढून वापरता येईल जर आपणास त्यात बदल करायचा असेल तर एडिट करण्याची सोय सुद्धा उपलब्ध आहे.",
    },
    {
      id: "05",
      name: "५. टाचणवही",
      targetRoute: "/teacher/teaching-record",
      icon: Notebook,
      color: "text-violet-600 dark:text-violet-400",
      bgColor: "bg-violet-50 dark:bg-violet-950/40",
      borderColor: "border-violet-100 dark:border-violet-900/30",
      description:
        "या विभागात आपणास इयत्ता पहिली ते आठवी मराठी आणि सेमी माध्यमचे टाचण उपलब्ध आहे. प्रत्येक दिवसाचे टाचण एडिट करून त्यात हवा तो बदल करून प्रिंट काढता येईल. शाळेच्या वर्ग शिक्षकाच्या आणि मुख्याध्यापकाच्या नावासह आपण प्रिंट काढून वापरू शकतो.",
    },
    {
      id: "06",
      name: "६. CCE निकाल",
      targetRoute: "/teacher/result",
      icon: FileSpreadsheet,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/40",
      borderColor: "border-purple-100 dark:border-purple-900/30",
      description:
        "या विभागात इयत्ता पहिली ते आठवी मराठी व सेमी माध्यमाचा निकाल आपणास तयार करता येईल. सर्व नोंदी निवडून सातत्यपूर्ण सर्वंकष मूल्यमापन नोंदवही, गुणपत्रक, प्रगती पत्रक, श्रेणी निहाय निकाल सर्व बाबी या ठिकाणी उपलब्ध आहेत.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 selection:bg-indigo-500/20 selection:text-indigo-500">
      {/* Sleek Top Header Navigation */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <Link to="/" className="flex items-center gap-3">
          <div className="size-9 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg flex items-center justify-center font-bold">
            <School className="size-5" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">
              Teacher Suite Modules
            </h1>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase mt-0.5">
              SGK Brainova Educator Hub
            </p>
          </div>
        </Link>

        {/* CTA Enter Button */}
        <button
          onClick={() => handleLoginClick("/teacher")}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <LogIn className="size-4" />
          <span>शिक्षक लॉगिन करा (Teacher Login)</span>
          <ArrowRight className="size-4" />
        </button>
      </header>

      {/* Hero Header */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-10 md:py-14 px-4 md:px-8">
        <div className="max-w-[900px] mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="size-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>शिक्षक विभाग - सुविधा व सेवा माहिती सूची</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            शिक्षक विभागातील मॉड्यूल्स व सेवासुविधांची सविस्तर माहिती
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            खालील यादीमध्ये शिक्षक विभागातील उपलब्ध सेवासुविधांची सविस्तर माहिती दिली आहे. 
            कोणतेही मॉड्यूल वापरण्यासाठी **'वापरायला लॉगिन करा'** किंवा **'शिक्षक लॉगिन'** बटणावर क्लिक करा.
          </p>

          <div className="pt-2 flex justify-center">
            <button
              onClick={() => handleLoginClick("/teacher")}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold text-sm shadow-sm transition-all cursor-pointer"
            >
              <LogIn className="size-4" />
              <span>शिक्षक कक्षात प्रवेश करा (Enter Teacher Suite)</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Main Single-Column Vertical List (Eka Khali Ek) */}
      <main className="max-w-[900px] mx-auto px-4 md:px-6 py-10 space-y-6">
        {modulesList.map((item) => {
          const ModIcon = item.icon;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 md:p-7 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            >
              {/* Left Side: Number, Icon & Content */}
              <div className="flex items-start gap-4 flex-1 min-w-0">
                {/* Number Badge & Icon */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <span className="text-xs font-black text-slate-400 tracking-wider">
                    {item.id}
                  </span>
                  <div
                    className={`size-11 rounded-xl ${item.bgColor} ${item.color} flex items-center justify-center border ${item.borderColor}`}
                  >
                    <ModIcon className="size-5" />
                  </div>
                </div>

                {/* Info Text */}
                <div className="space-y-2 flex-1 min-w-0">
                  <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                    {item.name}
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-line">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Right Action Button */}
              <div className="w-full md:w-auto shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => handleLoginClick(item.targetRoute)}
                  className="w-full md:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-600 text-indigo-700 dark:text-slate-300 hover:text-white dark:hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer group"
                >
                  <span>वापरायला लॉगिन करा</span>
                  <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          );
        })}

        {/* Bottom Plain Banner */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 text-center space-y-4 shadow-sm">
          <h3 className="text-lg md:text-xl font-bold">
            शिक्षक डॅशबोर्ड वापरण्यासाठी तयार आहात?
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto font-medium">
            खालील बटणावर क्लिक करा आणि तुमच्या शिक्षक क्रेडेन्शियल्ससह सुरक्षित लॉगिन करा.
          </p>
          <div className="pt-2 flex justify-center">
            <button
              onClick={() => handleLoginClick("/teacher")}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
            >
              <LogIn className="size-4" />
              <span>शिक्षक लॉगिन करा (Login Now)</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
