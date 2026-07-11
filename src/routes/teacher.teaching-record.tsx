import { createFileRoute } from "@tanstack/react-router";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { useState, useEffect } from "react";
<<<<<<< HEAD
import { 
  BookOpen, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  ArrowLeft, 
  Search, 
  Quote, 
=======
import {
  BookOpen,
  FileText,
  ChevronLeft,
  ChevronRight,
  Printer,
  ArrowLeft,
  Search,
  Quote,
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  Calendar,
  School,
  UserCheck,
  Sparkles,
  Trash2,
  Plus,
  Eye,
<<<<<<< HEAD
  Download
=======
  Download,
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import parsedDiaryData from "./parsed_diary.json";
import { showToast as toast } from "@/lib/custom-toast";
import { db } from "@/lib/firebase";
<<<<<<< HEAD
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
=======
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
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
<<<<<<< HEAD
      const days = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
=======
      const days = [
        "रविवार",
        "सोमवार",
        "मंगळवार",
        "बुधवार",
        "गुरुवार",
        "शुक्रवार",
        "शनिवार",
      ];
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      return days[dayIndex] || "सोमवार";
    }
  } catch (e) {
    // ignore
  }
  return "सोमवार";
};

<<<<<<< HEAD

const toEnglishDigits = (str: string) => {
  const marathiToEnglish: Record<string, string> = {
    "०": "0", "१": "1", "२": "2", "३": "3", "४": "4", "५": "5", "६": "6", "७": "7", "८": "8", "९": "9"
  };
  return str.split("").map(c => marathiToEnglish[c] || c).join("");
=======
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
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
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
  { id: "1", en: "Class 1", mr: "इयत्ता पहिली" },
  { id: "2", en: "Class 2", mr: "इयत्ता दुसरी" },
  { id: "3", en: "Class 3", mr: "इयत्ता तिसरी" },
  { id: "4", en: "Class 4", mr: "इयत्ता चौथी" },
  { id: "5", en: "Class 5", mr: "इयत्ता पाचवी" },
  { id: "6", en: "Class 6", mr: "इयत्ता सहावी" },
  { id: "7", en: "Class 7", mr: "इयत्ता सातवी" },
  { id: "8", en: "Class 8", mr: "इयत्ता आठवी" },
];

/* ═══════════════ PAGE ═══════════════ */
function TeachingRecordPage() {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [classDiaries, setClassDiaries] = useState<any[]>([]);
<<<<<<< HEAD
  const [selectedDate, setSelectedDate] = useState<string>(() => format(new Date(), "dd/MM/yyyy"));
=======
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    format(new Date(), "dd/MM/yyyy"),
  );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
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

  useEffect(() => {
    setShowPreview(false); // Reset preview when class changes
    if (selectedClass) {
      const fetchDiaries = async () => {
        setLoadingFile(true);
        try {
<<<<<<< HEAD
          const { collection, getDocs, query, where } = await import(
            "firebase/firestore"
          );
          const targetClassName = classMapper[selectedClass] || "";
          const q = query(
            collection(db, "admin_teaching_diaries"),
            where("className", "==", targetClassName)
          );
          const snapshot = await getDocs(q);
          const fetched: any[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Sort by createdAt descending so newest upload is first
          fetched.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
          
=======
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

          // Sort by createdAt descending so newest upload is first
          fetched.sort(
            (a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0),
          );

>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
          setClassDiaries(fetched);
          if (fetched.length > 0) {
            const sorted = [...fetched].sort((a: any, b: any) => {
              const parseDate = (dStr: string) => {
                if (!dStr) return 0;
                const parts = dStr.split("/");
                if (parts.length === 3) {
<<<<<<< HEAD
                  return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
=======
                  return new Date(
                    parseInt(parts[2]),
                    parseInt(parts[1]) - 1,
                    parseInt(parts[0]),
                  ).getTime();
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
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
  }, [selectedClass]);

  // Among all entries matching the selected date, pick the newest upload (highest createdAt)
<<<<<<< HEAD
  const activeDiary = [...classDiaries]
    .filter(d => normalizeDateStr(d.date) === normalizeDateStr(selectedDate))
    .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0))[0] || null;
  const currentClassObj = DIARY_CLASSES.find(c => c.id === selectedClass);
=======
  const activeDiary =
    [...classDiaries]
      .filter(
        (d) => normalizeDateStr(d.date) === normalizeDateStr(selectedDate),
      )
      .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0))[0] ||
    null;
  const currentClassObj = DIARY_CLASSES.find((c) => c.id === selectedClass);
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="print:hidden">
        <TeacherHeader />
        <TeacherSidebar />
      </div>

      <main className="lg:pl-64 pt-16 min-h-screen print:pl-0 print:pt-0">
        <PinGate sectionKey="teaching_record">
          <div className="p-4 sm:p-6 md:p-10 max-w-[1200px] mx-auto space-y-8 print:p-0 print:max-w-full">
<<<<<<< HEAD
          
          <AnimatePresence mode="wait">
            {!selectedClass ? (
              <motion.div
                key="selection-screen"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8"
              >
                <div className="relative overflow-hidden bg-slate-900 rounded-[3rem] p-8 md:p-12 text-white shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#4B7BE5]/20 via-transparent to-purple-600/20" />
                  <div className="relative z-10 space-y-4">
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight">
                      Teaching Diary / <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-[#4B7BE5] italic">टाचणवही</span>
                    </h2>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-xl space-y-6">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800">
                      Select Class / वर्ग निवडा
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                    {DIARY_CLASSES.map((cls) => {
                      const isSelected = selectedClass === cls.id;
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => {
                            setSelectedClass(cls.id);
                          }}
                          className={`py-5 px-4 rounded-[2rem] font-black text-xs uppercase tracking-wider border transition-all duration-300 cursor-pointer text-center ${
                            isSelected
                              ? "bg-[#4B7BE5] text-white border-[#4B7BE5] shadow-lg scale-105"
                              : "bg-slate-50 text-slate-600 border-slate-100 hover:border-[#4B7BE5] hover:text-[#4B7BE5] hover:shadow-sm"
                          }`}
                        >
                          <span className="block">{cls.en}</span>
                          <span className="block mt-1 text-[10px] opacity-80 normal-case tracking-normal">{cls.mr}</span>
                        </button>
                      );
                    })}
                  </div>
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
                      setSelectedClass(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 font-bold text-sm cursor-pointer transition-colors"
                  >
                    <ArrowLeft className="size-4" /> मागे फिरा (Back)
                  </button>
 
                  <div className="flex items-center gap-6">
                    {/* Date Selector Popover (Always Visible) */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-500">तारीख निवडा (Date):</span>
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
                                ? parse(selectedDate, "dd/MM/yyyy", new Date())
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
                        title={activeDiary ? "टाचणवही पहा (View)" : "टाचणवही उपलब्ध नाही"}
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
                            link.download = activeDiary.name || "teaching-diary.pdf";
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            toast.success("Download started / डाउनलोड सुरू झाले!");
                          }
                        }}
                        className={`size-10 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer ${
                          !activeDiary
                            ? "bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed"
                            : "bg-white text-slate-600 border border-slate-200 hover:text-emerald-600 hover:border-emerald-600"
                        }`}
                        title={activeDiary ? "टाचणवही डाउनलोड करा (Download)" : "टाचणवही उपलब्ध नाही"}
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
                        <h2 className="text-lg font-bold text-slate-700 truncate max-w-[70%]" title={activeDiary.name}>
                          {currentClassObj ? `${currentClassObj.en} (${currentClassObj.mr}) - ` : ""}{activeDiary.name} ({activeDiary.date})
                        </h2>
                        <button
                          onClick={() => setShowPreview(false)}
                          className="text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer"
                        >
                          प्रिव्ह्यू बंद करा (Close Preview)
                        </button>
                      </div>
                      {activeDiary.url?.startsWith("data:image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(activeDiary.name || "") ? (
                        <div className="w-full flex justify-center bg-slate-50 rounded-2xl p-4 border border-slate-100 overflow-auto max-h-[700px]">
                          <img src={activeDiary.url} alt={activeDiary.name} className="max-w-full h-auto rounded-xl object-contain shadow-sm" />
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
                      <h3 className="text-lg font-bold text-slate-700 mb-2">टाचणवही उपलब्ध आहे</h3>
                      <p className="text-sm font-semibold text-slate-400 max-w-sm mx-auto">
                        या तारखेसाठी टाचणवही फाईल उपलब्ध आहे. ती पाहण्यासाठी वरील **पहा (Eye)** चिन्हावर क्लिक करा.
                      </p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-20 bg-white border border-slate-100 rounded-[3rem] shadow-md max-w-[600px] mx-auto">
                    <div className="mx-auto size-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-4">
                      <FileText className="size-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">टाचणवही उपलब्ध नाही</h3>
                    <p className="text-sm font-semibold text-slate-400 max-w-sm mx-auto">
                      {currentClassObj ? `${currentClassObj.mr} ` : ""}साठी सध्या कोणतीही टाचणवही अपलोड केलेली नाही.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

=======
            <AnimatePresence mode="wait">
              {!selectedClass ? (
                <motion.div
                  key="selection-screen"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-8"
                >
                  <div className="relative overflow-hidden bg-slate-900 rounded-[3rem] p-8 md:p-12 text-white shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#4B7BE5]/20 via-transparent to-purple-600/20" />
                    <div className="relative z-10 space-y-4">
                      <h2 className="text-4xl md:text-5xl font-black tracking-tight">
                        Teaching Diary /{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-[#4B7BE5] italic">
                          टाचणवही
                        </span>
                      </h2>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-xl space-y-6">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800">
                        Select Class / वर्ग निवडा
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                      {DIARY_CLASSES.map((cls) => {
                        const isSelected = selectedClass === cls.id;
                        return (
                          <button
                            key={cls.id}
                            type="button"
                            onClick={() => {
                              setSelectedClass(cls.id);
                            }}
                            className={`py-5 px-4 rounded-[2rem] font-black text-xs uppercase tracking-wider border transition-all duration-300 cursor-pointer text-center ${
                              isSelected
                                ? "bg-[#4B7BE5] text-white border-[#4B7BE5] shadow-lg scale-105"
                                : "bg-slate-50 text-slate-600 border-slate-100 hover:border-[#4B7BE5] hover:text-[#4B7BE5] hover:shadow-sm"
                            }`}
                          >
                            <span className="block">{cls.en}</span>
                            <span className="block mt-1 text-[10px] opacity-80 normal-case tracking-normal">
                              {cls.mr}
                            </span>
                          </button>
                        );
                      })}
                    </div>
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
                        setSelectedClass(null);
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
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
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
