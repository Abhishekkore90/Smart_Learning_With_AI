import { createFileRoute } from "@tanstack/react-router";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { useState, useEffect } from "react";
import {
  BookOpen,
  FileText,
  ChevronLeft,
  ChevronRight,
  Printer,
  ArrowLeft,
  Search,
  Quote,
  Calendar,
  School,
  UserCheck,
  Sparkles,
  Trash2,
  Plus,
  Eye,
  Download,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import parsedDiaryData from "./parsed_diary.json";
import { showToast as toast } from "@/lib/custom-toast";
import { db } from "@/lib/firebase";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, parse } from "date-fns";
import { PinGate } from "@/components/teacher/PinGate";

const getMarathiDayName = (dateStr: string, fallbackDay: string) => {
  if (fallbackDay) return fallbackDay;
  if (!dateStr) return "सोमवार";
  try {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      const dayIndex = date.getDay();
      const days = [
        "रविवार",
        "सोमवार",
        "मंगळवार",
        "बुधवार",
        "गुरुवार",
        "शुक्रवार",
        "शनिवार",
      ];
      return days[dayIndex] || "सोमवार";
    }
  } catch (e) {
    // ignore
  }
  return "सोमवार";
};

const toEnglishDigits = (str: string) => {
  const marathiToEnglish: Record<string, string> = {
    "०": "0",
    "१": "1",
    "२": "2",
    "३": "3",
    "४": "4",
    "५": "5",
    "६": "6",
    "७": "7",
    "८": "8",
    "९": "9",
  };
  return str
    .split("")
    .map((c) => marathiToEnglish[c] || c)
    .join("");
};

const normalizeDateStr = (dateStr: string) => {
  if (!dateStr) return "";
  const englishStr = toEnglishDigits(dateStr);
  const parts = englishStr.split(/[\/\-]/);
  if (parts.length === 3) {
    let d = parts[0];
    let m = parts[1];
    let y = parts[2];
    if (d.length === 4) {
      y = parts[0];
      m = parts[1];
      d = parts[2];
    }
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  }
  return englishStr;
};

/* ─── Class & File Data ─── */
const DIARY_CLASSES = [
  { id: "1", badge: "1ST", en: "CLASS 1ST", mr: "इयत्ता पहिली" },
  { id: "2", badge: "2ND", en: "CLASS 2ND", mr: "इयत्ता दुसरी" },
  { id: "3", badge: "3RD", en: "CLASS 3RD", mr: "इयत्ता तिसरी" },
  { id: "4", badge: "4TH", en: "CLASS 4TH", mr: "इयत्ता चौथी" },
  { id: "5", badge: "5TH", en: "CLASS 5TH", mr: "इयत्ता पाचवी" },
  { id: "6", badge: "6TH", en: "CLASS 6TH", mr: "इयत्ता सहावी" },
  { id: "7", badge: "7TH", en: "CLASS 7TH", mr: "इयत्ता सातवी" },
  { id: "8", badge: "8TH", en: "CLASS 8TH", mr: "इयत्ता आठवी" },
];

/* ═══════════════ PAGE ═══════════════ */
function TeachingRecordPage() {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedMedium, setSelectedMedium] = useState<string | null>(null);
  const [classDiaries, setClassDiaries] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    format(new Date(), "dd/MM/yyyy"),
  );
  const [loadingFile, setLoadingFile] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);

  const classMapper: Record<string, string> = {
    "1": "Class 1",
    "2": "Class 2",
    "3": "Class 3",
    "4": "Class 4",
    "5": "Class 5",
    "6": "Class 6",
    "7": "Class 7",
    "8": "Class 8",
  };

  const mediums = [
    { id: "Marathi", badge: "M", title: "MARATHI", sub: "मराठी माध्यम", desc: "मराठी माध्यमाचे वार्षिक/मासिक नियोजन" },
    { id: "Semi English", badge: "S", title: "SEMI ENGLISH", sub: "सेमी इंग्रजी", desc: "Semi English medium annual/monthly planning" },
  ];

  useEffect(() => {
    setShowPreview(false); // Reset preview when class or medium changes
    if (selectedClass && selectedMedium) {
      const fetchDiaries = async () => {
        setLoadingFile(true);
        try {
          const { collection, getDocs, query, where } =
            await import("firebase/firestore");
          const targetClassName = classMapper[selectedClass] || "";
          const q = query(
            collection(db, "admin_teaching_diaries"),
            where("className", "==", targetClassName),
          );
          const snapshot = await getDocs(q);
          const fetched: any[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Client-side filtering by medium (if the field exists in the document)
          const filtered = fetched.filter((d: any) => {
            if (d.medium) {
              return d.medium.toLowerCase() === selectedMedium.toLowerCase();
            }
            return true; // fallback if no medium field exists
          });

          // Sort by createdAt descending so newest upload is first
          filtered.sort(
            (a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0),
          );

          setClassDiaries(filtered);
          if (filtered.length > 0) {
            const sorted = [...filtered].sort((a: any, b: any) => {
              const parseDate = (dStr: string) => {
                if (!dStr) return 0;
                const parts = dStr.split("/");
                if (parts.length === 3) {
                  return new Date(
                    parseInt(parts[2]),
                    parseInt(parts[1]) - 1,
                    parseInt(parts[0]),
                  ).getTime();
                }
                return 0;
              };
              try {
                return parseDate(b.date) - parseDate(a.date);
              } catch (e) {
                return 0;
              }
            });
            setSelectedDate(sorted[0].date);
          } else {
            setSelectedDate(format(new Date(), "dd/MM/yyyy"));
          }
        } catch (err) {
          console.error("Error fetching class diaries:", err);
          toast.error("Failed to load teaching diaries.");
        } finally {
          setLoadingFile(false);
        }
      };
      fetchDiaries();
    } else {
      setClassDiaries([]);
    }
  }, [selectedClass, selectedMedium]);

  // Among all entries matching the selected date, pick the newest upload (highest createdAt)
  const activeDiary =
    [...classDiaries]
      .filter(
        (d) => normalizeDateStr(d.date) === normalizeDateStr(selectedDate),
      )
      .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0))[0] ||
    null;
  const currentClassObj = DIARY_CLASSES.find((c) => c.id === selectedClass);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="print:hidden">
        <TeacherHeader />
        <TeacherSidebar />
      </div>

      <main className="lg:pl-64 pt-16 min-h-screen print:pl-0 print:pt-0">
        <PinGate sectionKey="teaching_record">
          <div className="p-4 sm:p-6 md:p-10 max-w-[1200px] mx-auto space-y-8 print:p-0 print:max-w-full">
            <AnimatePresence mode="wait">
              {!selectedClass ? (
                <motion.div
                  key="selection-screen"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-8"
                >
                  <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 rounded-[3rem] p-8 md:p-12 text-white shadow-2xl border border-white/5">
                    {/* Glowing decorative gradient circles */}
                    <div className="absolute -left-10 -top-10 size-40 bg-[#4B7BE5]/25 rounded-full blur-[50px] pointer-events-none" />
                    <div className="absolute -right-10 -bottom-10 size-40 bg-purple-500/20 rounded-full blur-[50px] pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-xs font-semibold tracking-wider text-purple-200 w-fit">
                          <Sparkles className="size-3.5 text-amber-300 animate-pulse" />
                          TEACHER PORTAL
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight flex flex-wrap items-center gap-x-4">
                          <span>Teaching Diary</span>
                          <span className="text-white/40 font-light">/</span>
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-[#4B7BE5] italic font-extrabold drop-shadow-[0_2px_10px_rgba(59,130,246,0.3)]">
                            टाचणवही
                          </span>
                        </h2>
                        <p className="text-xs md:text-sm font-semibold text-slate-400 max-w-xl">
                          दैनिक अध्यापन नियोजन आणि शैक्षणिक नोंदी मासिक नोंदवही (Daily Lesson Planning and Academic Record Book)
                        </p>
                      </div>
                      
                      <div className="shrink-0 flex items-center justify-center size-16 md:size-20 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 shadow-inner group">
                        <BookOpen className="size-8 md:size-10 text-[#4B7BE5] group-hover:scale-110 transition-transform duration-500" />
                      </div>
                    </div>
                  </div>

                  <div className="text-center space-y-2 pt-4">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Select Class / इयत्ता निवडा</h2>
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">STEP 2: CHOOSE THE TARGET STANDARD</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto w-full">
                    {DIARY_CLASSES.map((cls, idx) => {
                      return (
                        <motion.button
                          key={cls.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => {
                            setSelectedClass(cls.id);
                            setSelectedMedium(null);
                          }}
                          className="group p-8 rounded-[2.5rem] border text-center transition-all duration-500 shadow-md hover:shadow-[0_20px_45px_rgba(139,92,246,0.3)] cursor-pointer relative overflow-hidden flex flex-col items-center gap-4 bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] text-white border-[#7c3aed]/30 hover:scale-[1.02]"
                        >
                          <div className="absolute -bottom-6 -right-6 size-24 text-white/5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                            </svg>
                          </div>

                          <div className="size-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform text-white font-black text-sm uppercase">
                            {cls.badge}
                          </div>
                          
                          <div className="space-y-1">
                            <h3 className="text-xl font-black leading-tight tracking-tight">
                              {cls.mr}
                            </h3>
                            <p className="text-[10px] text-[#C4B5FD] font-bold uppercase tracking-wider">
                              {cls.en}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#C4B5FD] mt-2">
                            प्रवेश करा{" "}
                            <ArrowRight className="size-3 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              ) : !selectedMedium ? (
                /* ── Select Medium Screen ── */
                <motion.div
                  key="medium-selection-screen"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-8"
                >
                  <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 rounded-[3rem] p-8 md:p-12 text-white shadow-2xl border border-white/5">
                    {/* Glowing decorative gradient circles */}
                    <div className="absolute -left-10 -top-10 size-40 bg-[#4B7BE5]/25 rounded-full blur-[50px] pointer-events-none" />
                    <div className="absolute -right-10 -bottom-10 size-40 bg-purple-500/20 rounded-full blur-[50px] pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-xs font-semibold tracking-wider text-purple-200 w-fit">
                          <Sparkles className="size-3.5 text-amber-300 animate-pulse" />
                          TEACHER PORTAL
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight flex flex-wrap items-center gap-x-4">
                          <span>Teaching Diary</span>
                          <span className="text-white/40 font-light">/</span>
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-[#4B7BE5] italic font-extrabold drop-shadow-[0_2px_10px_rgba(59,130,246,0.3)]">
                            टाचणवही
                          </span>
                        </h2>
                        <p className="text-xs md:text-sm font-semibold text-slate-400 max-w-xl">
                          दैनिक अध्यापन नियोजन आणि शैक्षणिक नोंदी मासिक नोंदवही (Daily Lesson Planning and Academic Record Book)
                        </p>
                      </div>
                      
                      <div className="shrink-0 flex items-center justify-center size-16 md:size-20 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 shadow-inner group">
                        <BookOpen className="size-8 md:size-10 text-[#4B7BE5] group-hover:scale-110 transition-transform duration-500" />
                      </div>
                    </div>
                  </div>

                  <div className="text-center space-y-2 pt-4">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Select Medium / माध्यम निवडा</h2>
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                      CLASS: {currentClassObj ? `${currentClassObj.mr.replace("इयत्ता ", "")} (${currentClassObj.en})` : ""}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-2xl mx-auto w-full">
                    {mediums.map((m) => {
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            setSelectedMedium(m.id);
                          }}
                          className="group p-10 rounded-[3rem] border text-left transition-all duration-500 shadow-md hover:shadow-[0_20px_45px_rgba(139,92,246,0.3)] cursor-pointer relative overflow-hidden flex items-start gap-6 bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] text-white border-[#7c3aed]/30 hover:scale-[1.02]"
                        >
                          <div className="size-14 rounded-full flex items-center justify-center border border-white/20 bg-white/10 backdrop-blur-sm group-hover:scale-110 transition-transform text-white font-black text-base uppercase shrink-0">
                            {m.badge}
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-black text-xl text-white">{m.sub}</h4>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#C4B5FD] mt-1">
                              {m.title} Medium
                            </p>
                            <p className="text-xs font-medium text-violet-100/70">
                              {m.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex justify-center pt-4">
                    <button
                      onClick={() => {
                        setSelectedClass(null);
                      }}
                      className="flex items-center gap-2 text-indigo-600 hover:text-indigo-900 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="size-4" /> मागे जा / BACK
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* ── Interactive Lesson Diary Viewer Screen ── */
                <motion.div
                  key="diary-viewer"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="space-y-8"
                >
                  {/* Control Bar (hidden in print) */}
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-100 rounded-[2rem] p-4 shadow-md print:hidden">
                    <button
                      onClick={() => {
                        setSelectedMedium(null);
                      }}
                      className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 font-bold text-sm cursor-pointer transition-colors"
                    >
                      <ArrowLeft className="size-4" /> मागे फिरा (Back)
                    </button>

                    <div className="flex items-center gap-6">
                      {/* Date Selector Popover (Always Visible) */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500">
                          तारीख निवडा (Date):
                        </span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:border-[#4B7BE5] rounded-xl text-slate-700 font-bold text-sm bg-white cursor-pointer transition-all">
                              <Calendar className="size-4 text-[#4B7BE5]" />
                              <span>{selectedDate}</span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 z-50">
                            <CalendarComponent
                              mode="single"
                              selected={
                                selectedDate
                                  ? parse(
                                      selectedDate,
                                      "dd/MM/yyyy",
                                      new Date(),
                                    )
                                  : undefined
                              }
                              onSelect={(date) => {
                                if (date) {
                                  const newDateStr = format(date, "dd/MM/yyyy");
                                  setSelectedDate(newDateStr);
                                  setShowPreview(false); // Reset preview when date changes
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Circular Action Buttons Row */}
                      <div className="flex items-center gap-3">
                        {/* View Button */}
                        <button
                          disabled={!activeDiary}
                          onClick={() => setShowPreview(!showPreview)}
                          className={`size-10 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer ${
                            !activeDiary
                              ? "bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed"
                              : showPreview
                                ? "bg-[#4B7BE5] text-white border border-[#4B7BE5] hover:bg-[#3563C9]"
                                : "bg-white text-slate-600 border border-slate-200 hover:text-[#4B7BE5] hover:border-[#4B7BE5]"
                          }`}
                          title={
                            activeDiary
                              ? "टाचणवही पहा (View)"
                              : "टाचणवही उपलब्ध नाही"
                          }
                        >
                          <Eye className="size-5" />
                        </button>

                        {/* Download Button */}
                        <button
                          disabled={!activeDiary}
                          onClick={() => {
                            if (activeDiary?.url) {
                              const link = document.createElement("a");
                              link.href = activeDiary.url;
                              link.download =
                                activeDiary.name || "teaching-diary.pdf";
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              toast.success(
                                "Download started / डाउनलोड सुरू झाले!",
                              );
                            }
                          }}
                          className={`size-10 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer ${
                            !activeDiary
                              ? "bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed"
                              : "bg-white text-slate-600 border border-slate-200 hover:text-emerald-600 hover:border-emerald-600"
                          }`}
                          title={
                            activeDiary
                              ? "टाचणवही डाउनलोड करा (Download)"
                              : "टाचणवही उपलब्ध नाही"
                          }
                        >
                          <Download className="size-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {loadingFile ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                      <div className="size-10 border-4 border-[#4B7BE5] border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm font-bold text-slate-500">
                        शोधत आहे... / Loading diary file...
                      </p>
                    </div>
                  ) : activeDiary ? (
                    showPreview ? (
                      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-xl space-y-4 max-w-[1000px] mx-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h2
                            className="text-lg font-bold text-slate-700 truncate max-w-[70%]"
                            title={activeDiary.name}
                          >
                            {currentClassObj
                              ? `${currentClassObj.en} (${currentClassObj.mr}) - `
                              : ""}
                            {activeDiary.name} ({activeDiary.date})
                          </h2>
                          <button
                            onClick={() => setShowPreview(false)}
                            className="text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer"
                          >
                            प्रिव्ह्यू बंद करा (Close Preview)
                          </button>
                        </div>
                        {activeDiary.url?.startsWith("data:image/") ||
                        /\.(jpg|jpeg|png|gif|webp)$/i.test(
                          activeDiary.name || "",
                        ) ? (
                          <div className="w-full flex justify-center bg-slate-50 rounded-2xl p-4 border border-slate-100 overflow-auto max-h-[700px]">
                            <img
                              src={activeDiary.url}
                              alt={activeDiary.name}
                              className="max-w-full h-auto rounded-xl object-contain shadow-sm"
                            />
                          </div>
                        ) : (
                          <iframe
                            src={activeDiary.url}
                            title={activeDiary.name}
                            className="w-full h-[700px] rounded-2xl border border-slate-200 shadow-sm"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-20 bg-white border border-slate-100 rounded-[3rem] shadow-md max-w-[600px] mx-auto">
                        <div className="mx-auto size-16 bg-blue-50 rounded-2xl flex items-center justify-center text-[#4B7BE5] mb-4">
                          <FileText className="size-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 mb-2">
                          टाचणवही उपलब्ध आहे
                        </h3>
                        <p className="text-sm font-semibold text-slate-400 max-w-sm mx-auto">
                          या तारखेसाठी टाचणवही फाईल उपलब्ध आहे. ती पाहण्यासाठी
                          वरील **पहा (Eye)** चिन्हावर क्लिक करा.
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-20 bg-white border border-slate-100 rounded-[3rem] shadow-md max-w-[600px] mx-auto">
                      <div className="mx-auto size-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-4">
                        <FileText className="size-8" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-700 mb-2">
                        टाचणवही उपलब्ध नाही
                      </h3>
                      <p className="text-sm font-semibold text-slate-400 max-w-sm mx-auto">
                        {currentClassObj ? `${currentClassObj.mr} ` : ""}साठी
                        सध्या कोणतीही टाचणवही अपलोड केलेली नाही.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </PinGate>
      </main>
    </div>
  );
}

export const Route = createFileRoute("/teacher/teaching-record")({
  head: () => ({
    meta: [{ title: "Teaching Diary (टाचणवही) — Teacher Portal" }],
  }),
  component: TeachingRecordPage,
});
