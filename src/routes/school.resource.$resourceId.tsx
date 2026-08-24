import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  School,
  CalendarDays,
  Star,
  FileText,
  BookCheck,
  ClipboardList,
  BookOpen,
  Award,
  Users2,
  Utensils,
  PieChart,
  Table,
  Calculator,
  Edit3,
  Clock,
  Download,
  Share2,
  Info,
  Loader2,
  AlertCircle,
  ArrowRight,
  GraduationCap,
  Search,
  Sparkles,
  CheckCircle2,
  Eye,
} from "lucide-react";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";


import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StudentSidebar } from "@/components/student/StudentSidebar";
import { StudentHeader } from "@/components/student/StudentHeader";

import { useLanguage } from "@/hooks/use-language";

export const Route = createFileRoute("/school/resource/$resourceId")({
  component: ResourcePage,
});

const RESOURCE_MAP: any = {
  timetable: {
    m: "वेळापत्रक",
    e: "Timetable",
    icon: CalendarDays,
    color: "bg-violet-600",
  },
  "special-day": {
    m: "दिनविशेष",
    e: "Paripath (Daily Assembly)",
    icon: Star,
    color: "bg-amber-500",
  },
  template: {
    m: "टेम्पलेट",
    e: "Template",
    icon: FileText,
    color: "bg-blue-500",
  },
  "annual-monthly-planning": {
    m: "वार्षिक मासिक नियोजन",
    e: "Annual & Monthly Planning & Question Bank",
    icon: BookCheck,
    color: "bg-emerald-600",
  },
  "question-bank": {
    m: "प्रश्नपेढी",
    e: "Question Bank",
    icon: ClipboardList,
    color: "bg-rose-500",
  },
  homework: {
    m: "होमवर्क",
    e: "Homework",
    icon: BookOpen,
    color: "bg-orange-500",
  },

  "monthly-meeting": {
    m: "मासिक सभा",
    e: "Monthly Meeting (Masik Sabha)",
    icon: Users2,
    color: "bg-cyan-600",
  },
  "mid-day-meal-(mdm)": {
    m: "एमडीएम",
    e: "Mid-Day Meal (MDM)",
    icon: Utensils,
    color: "bg-orange-600",
  },
  "teacher-statistics": {
    m: "शिक्षक संख्यिका",
    e: "Teacher Statistics",
    icon: PieChart,
    color: "bg-teal-600",
  },
  "student-statistics": {
    m: "विद्यार्थी संख्यिका",
    e: "Student Statistics",
    icon: Users2,
    color: "bg-blue-600",
  },
  "sqaaf-evaluation": {
    m: "एसक्यूएफ मूल्यांकन",
    e: "SQAAF Evaluation",
    icon: Calculator,
    color: "bg-slate-600",
  },
  "teaching-record-notebook": {
    m: "टाचन वही",
    e: "Tachanvahi (Teaching Record Notebook)",
    icon: Edit3,
    color: "bg-pink-600",
  },
};

function ResourcePage() {
  const { resourceId } = useParams({ from: "/school/resource/$resourceId" });
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const config = RESOURCE_MAP[resourceId] || {
    m: resourceId,
    e: resourceId,
    icon: Info,
    color: "bg-slate-600",
  };

  useEffect(() => {
    async function fetchResource() {
      if (!user) return;
      try {
        const uDoc = await getDoc(doc(db, "users", user.uid));
        if (uDoc.exists()) {
          const udise = uDoc.data().schoolConnection?.udise;
          if (udise) {
            const rDoc = await getDoc(
              doc(db, "school_data", `${udise}_${resourceId}`),
            );
            if (rDoc.exists()) {
              setContent(rDoc.data());
            } else {
              setError("No data uploaded by teacher yet.");
            }
          } else {
            setError("You are not connected to any school.");
          }
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load resource data.");
      } finally {
        setLoading(false);
      }
    }
    fetchResource();
  }, [user, resourceId]);

  return (
    <div className="min-h-screen bg-white">
      <StudentHeader />
      <StudentSidebar />

      <main className="lg:pl-64 pt-16 min-h-screen bg-slate-50/50">
        <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
            <div className="space-y-4">
              <Link
                to="/profile"
                className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-indigo-600 transition-colors"
              >
                <ChevronLeft className="size-4" /> Back to Dashboard
              </Link>
              <div className="flex items-center gap-6">
                <div
                  className={`size-16 rounded-[1.5rem] ${config.color} text-white flex items-center justify-center shadow-lg`}
                >
                  <config.icon className="size-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight italic">
                    {lang === "en" ? config.e : config.m}
                  </h1>
                  <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">
                    {lang === "en" ? `${config.m} Section` : `${config.e} Section`}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all">
                <Share2 className="size-5" />
              </button>
              <button className="px-8 py-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-600 transition-all shadow-xl flex items-center gap-3">
                <Download className="size-4" /> Export Data
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400">
                <Loader2 className="size-10 animate-spin text-indigo-600" />
                <p className="text-[10px] font-black uppercase tracking-widest">
                  Synchronizing School Database...
                </p>
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6">
                <div className="size-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                  <AlertCircle className="size-10" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-slate-900 italic">
                    Information Pending
                  </h2>
                  <p className="text-slate-500 font-medium max-w-sm mx-auto">
                    {error}
                  </p>
                </div>
                <Link
                  to="/profile"
                  className="px-8 py-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all"
                >
                  Request Teacher Update
                </Link>
              </div>
            ) : (
              <div className="p-10 md:p-16 space-y-12">
                <div className="flex items-center gap-4 p-6 bg-emerald-50 border border-emerald-100 rounded-3xl">
                  <div className="size-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                    <CheckCircle2 className="size-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-emerald-900">
                      Official Data Verified
                    </div>
                    <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                      Last updated: {content.updatedAt || "Recently"}
                    </div>
                  </div>
                </div>

                {resourceId === "teaching-record-notebook" ? (
                  <StudentTeachingDiaryFlow content={content} />
                ) : (
                  <>
                    <div className="prose prose-slate max-w-none">
                      <div className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap text-lg italic">
                        {content.data ||
                          "The teacher has not added specific text content for this module yet."}
                      </div>
                    </div>

                    {content.files && content.files.length > 0 && (
                      <div className="space-y-8 pt-12 border-t border-slate-100">
                        <h3 className="text-xl font-black text-slate-900 italic tracking-tight">
                          Attached Documents
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {content.files.map((file: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-6 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-between group hover:border-indigo-200 transition-all"
                            >
                              <div className="flex items-center gap-4">
                                <div className="size-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                                  <FileText className="size-6" />
                                </div>
                                <div>
                                  <div className="font-black text-slate-900">
                                    {file.name}
                                  </div>
                                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {file.size} • {file.type}
                                  </div>
                                </div>
                              </div>
                              <button className="size-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all">
                                <Download className="size-5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StudentTeachingDiaryFlow({ content }: { content: any }) {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  const filesByClass = content && typeof content === "object" && content.filesByClass
    ? content.filesByClass
    : {
        "Class 1": [
          { name: "वर्ग १ ली - मराठी दैनिक टाचण.pdf", size: "1.4 MB", type: "application/pdf", date: "19/06/2026", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" },
          { name: "Class 1 - English Lesson Plan.pdf", size: "980 KB", type: "application/pdf", date: "19/06/2026", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" }
        ],
        "Class 2": [
          { name: "वर्ग २ री - गणित टाचण वही.pdf", size: "2.1 MB", type: "application/pdf", date: "19/06/2026", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" }
        ],
        "Class 3": [
          { name: "वर्ग ३ री - इंग्रजी मासिक नियोजन.pdf", size: "1.8 MB", type: "application/pdf", date: "19/06/2026", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" }
        ],
        "Class 4": [
          { name: "वर्ग ४ थी - परिसर अभ्यास टाचण.pdf", size: "2.4 MB", type: "application/pdf", date: "19/06/2026", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" }
        ],
        "Class 5": [
          { name: "वर्ग ५ वी - हिंदी व गणित टाचण.pdf", size: "1.5 MB", type: "application/pdf", date: "19/06/2026", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" }
        ],
        "Class 6": [
          { name: "वर्ग ६ वी - विज्ञान अध्यापन टाचण.pdf", size: "3.2 MB", type: "application/pdf", date: "19/06/2026", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" }
        ],
        "Class 7": [
          { name: "वर्ग ७ वी - समाजशास्त्र टाचण.pdf", size: "2.8 MB", type: "application/pdf", date: "19/06/2026", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" }
        ]
      };

  const classes = ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7"];
  const currentFiles = selectedClass ? filesByClass[selectedClass] || [] : [];

  const classColors = [
    "from-amber-500 to-orange-600",
    "from-indigo-500 to-blue-600",
    "from-emerald-500 to-teal-600",
    "from-rose-500 to-pink-600",
    "from-purple-500 to-violet-600",
    "from-cyan-500 to-sky-600",
    "from-slate-600 to-slate-800",
  ];

  return (
    <div className="space-y-8 font-sans">
      <AnimatePresence mode="wait">
        {!selectedClass ? (
          <motion.div
            key="classes"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                Select Class / वर्ग निवडा
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">अध्यापन टाचण पाहण्यासाठी वर्ग निवडा</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {classes.map((cls, idx) => {
                const fileCount = filesByClass[cls]?.length || 0;
                return (
                  <motion.div
                    whileHover={{ scale: 1.03, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    key={cls}
                  >
                    <button
                      onClick={() => setSelectedClass(cls)}
                      className={`w-full min-h-[10rem] p-6 rounded-3xl bg-gradient-to-br ${classColors[idx % classColors.length]} text-white text-left flex flex-col justify-between shadow-md hover:shadow-lg transition-all relative overflow-hidden group cursor-pointer`}
                    >
                      <div className="absolute right-[-10%] bottom-[-10%] opacity-10 pointer-events-none">
                        <BookOpen className="size-24" />
                      </div>
                      <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-black self-start">
                        {fileCount} Files
                      </span>
                      <div>
                        <h4 className="text-lg font-black tracking-tight">{cls}</h4>
                        <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider mt-1">अध्यापन नोंद वही</p>
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="files"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  {selectedClass} Diary Files
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">वर्गवार दैनिक टाचण फाईल्स</p>
              </div>
              <button
                onClick={() => setSelectedClass(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
              >
                ← Change Class
              </button>
            </div>

            {currentFiles.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl space-y-4">
                <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mx-auto">
                  <BookOpen className="size-8" />
                </div>
                <div>
                  <h4 className="text-slate-700 font-bold">या वर्गासाठी कोणतीही फाईल आढळली नाही</h4>
                  <p className="text-slate-400 text-xs mt-1">शिक्षकाने या वर्गासाठी अजून फाईल्स अपलोड केलेल्या नाहीत.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {currentFiles.map((file: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-5 bg-slate-50 border border-slate-100 rounded-[2rem] flex items-center justify-between group hover:border-indigo-200 transition-all"
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="size-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-all flex-shrink-0">
                        <FileText className="size-6" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-bold text-slate-800 text-sm truncate max-w-[200px] sm:max-w-xs" title={file.name}>
                          {file.name}
                        </div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                          {file.size} • {file.date || "Verified"}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="size-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all cursor-pointer"
                        title="View / पहा"
                      >
                        <Eye className="size-5" />
                      </a>
                      <a
                        href={file.url}
                        download={file.name}
                        className="size-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all cursor-pointer"
                        title="Download / डाउनलोड"
                      >
                        <Download className="size-5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


