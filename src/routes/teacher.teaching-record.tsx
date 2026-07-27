import { createFileRoute } from "@tanstack/react-router";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import React, { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  ArrowLeft,
  FileText,
  Sparkles,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { showToast as toast } from "@/lib/custom-toast";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, addDays, subDays } from "date-fns";
import { PinGate } from "@/components/teacher/PinGate";

export const Route = createFileRoute("/teacher/teaching-record")({
  head: () => ({
    meta: [{ title: "Teaching Diary (टाचणवही) — Redesigned" }],
  }),
  component: TeachingRecordPage,
});

const DIARY_CLASSES = [
  { id: "Class 1", badge: "1ST", mr: "इयत्ता पहिली", color: "from-blue-500 to-indigo-600" },
  { id: "Class 2", badge: "2ND", mr: "इयत्ता दुसरी", color: "from-purple-500 to-indigo-600" },
  { id: "Class 3", badge: "3RD", mr: "इयत्ता तिसरी", color: "from-pink-500 to-rose-600" },
  { id: "Class 4", badge: "4TH", mr: "इयत्ता चौथी", color: "from-amber-500 to-orange-600" },
  { id: "Class 5", badge: "5TH", mr: "इयत्ता पाचवी", color: "from-emerald-500 to-teal-600" },
  { id: "Class 6", badge: "6TH", mr: "इयत्ता सहावी", color: "from-cyan-500 to-blue-600" },
  { id: "Class 7", badge: "7TH", mr: "इयत्ता सातवी", color: "from-indigo-500 to-violet-600" },
  { id: "Class 8", badge: "8TH", mr: "इयत्ता आठवी", color: "from-slate-600 to-slate-800" },
];

const MEDIUMS = [
  { id: "Marathi", badge: "M", title: "MARATHI", mr: "मराठी माध्यम" },
  { id: "Semi English", badge: "S", title: "SEMI ENGLISH", mr: "सेमी इंग्रजी" },
];

function TeachingRecordPage() {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedMedium, setSelectedMedium] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isMounted, setIsMounted] = useState(false);
  
  const [pageData, setPageData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setIsMounted(true); }, []);

  // Viewer utilities
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const viewerRef = useRef<HTMLDivElement>(null);

  // Sync date selection
  useEffect(() => {
    if (selectedClass && selectedMedium && selectedDate) {
      fetchDiaryPage(selectedClass, selectedMedium, selectedDate);
    }
  }, [selectedClass, selectedMedium, selectedDate]);

  // Automatically select standard start date of standard uploaded diary when standard standard class and medium are selected
  useEffect(() => {
    if (selectedClass && selectedMedium) {
      const fetchEarliestDate = async () => {
        try {
          const { collection, getDocs } = await import("firebase/firestore");
          const collectionRef = collection(db, "teacher_diaries", selectedClass, selectedMedium);
          const snapshot = await getDocs(collectionRef);
          if (!snapshot.empty) {
            const docIds = snapshot.docs.map((doc) => doc.id);
            docIds.sort(); // ascending, earliest date first
            const earliestDateStr = docIds[0];
            const parts = earliestDateStr.split("-");
            if (parts.length === 3) {
              const year = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1;
              const day = parseInt(parts[2], 10);
              const earliestDate = new Date(year, month, day);

              const today = new Date();
              today.setHours(23, 59, 59, 999);
              if (earliestDate > today) {
                setSelectedDate(new Date());
              } else {
                setSelectedDate(earliestDate);
              }
            }
          }
        } catch (err) {
          console.error("Error fetching earliest diary date:", err);
        }
      };
      fetchEarliestDate();
    }
  }, [selectedClass, selectedMedium]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const fetchDiaryPage = async (cls: string, med: string, date: Date) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (date > today) {
      setPageData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const docRef = doc(db, "teacher_diaries", cls, med, dateStr);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setPageData(docSnap.data());
      } else {
        setPageData(null);
      }
    } catch (err: any) {
      console.error("Error loading diary page:", err);
      setError("Failed to load page details.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrevDay = () => {
    setSelectedDate((prev) => subDays(prev, 1));
  };

  const handleNextDay = () => {
    const nextDate = addDays(selectedDate, 1);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (nextDate > today) {
      toast.error("भविष्यातील दैनंदिनी पाहता येणार नाही / Future diary pages cannot be viewed.");
      return;
    }
    setSelectedDate(nextDate);
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.2, 2.5));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.2, 0.6));
  };

  const handleToggleFullscreen = () => {
    if (!viewerRef.current) return;
    if (!isFullscreen) {
      viewerRef.current.requestFullscreen().catch((err) => {
        toast.error("Could not activate full screen mode.");
        console.error(err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleDownload = () => {
    if (pageData?.pageUrl) {
      const link = document.createElement("a");
      link.href = pageData.pageUrl;
      link.download = `Diary_${selectedClass}_${selectedMedium}_${format(selectedDate, "yyyy-MM-dd")}.pdf`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Downloading page PDF...");
    } else {
      toast.error("No file available for download.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="print:hidden">
        <TeacherHeader />
        <TeacherSidebar />
      </div>

      <main className="lg:pl-64 pt-16 min-h-screen print:pl-0 print:pt-0">
        <PinGate sectionKey="teaching_record">
          <div className="p-4 sm:p-6 md:p-8 max-w-[1200px] mx-auto space-y-6 print:p-0 print:max-w-full">
            <AnimatePresence mode="wait">
              {/* Step 1: Select Class */}
              {!selectedClass && (
                <motion.div
                  key="class-selection"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-8"
                >
                  <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl border border-white/5">
                    <div className="absolute -left-10 -top-10 size-40 bg-indigo-500/25 rounded-full blur-[50px] pointer-events-none" />
                    <div className="absolute -right-10 -bottom-10 size-40 bg-purple-500/25 rounded-full blur-[50px] pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-xs font-semibold tracking-wider text-purple-200">
                          <Sparkles className="size-3.5 text-amber-300 animate-pulse" />
                          TEACHER PORTAL
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight">
                          Teaching Diary <span className="text-indigo-400">टाचणवही.</span>
                        </h2>
                        <p className="text-xs md:text-sm text-slate-400 max-w-xl">
                          Access standard teaching records mapped dynamically by standard, medium, and dates.
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center justify-center size-16 md:size-20 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 shadow-inner">
                        <BookOpen className="size-8 md:size-10 text-indigo-400" />
                      </div>
                    </div>
                  </div>

                  <div className="text-center space-y-2 pt-4">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Select Class / इयत्ता निवडा</h2>
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Step 1: standard Standard Selection</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto w-full">
                    {DIARY_CLASSES.map((cls, idx) => (
                      <motion.button
                        key={cls.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setSelectedClass(cls.id);
                          setSelectedMedium(null);
                        }}
                        className={`group p-8 rounded-[2.5rem] border text-center transition-all duration-500 shadow-md hover:shadow-lg bg-gradient-to-br ${cls.color} text-white border-black/5 cursor-pointer relative overflow-hidden flex flex-col items-center gap-4`}
                      >
                        <div className="size-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform text-white font-black text-sm uppercase">
                          {cls.badge}
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-xl font-black leading-tight tracking-tight">{cls.mr}</h3>
                          <p className="text-[10px] text-slate-100/70 font-bold uppercase tracking-wider">{cls.id}</p>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-100/70 mt-2">
                          OPEN / उघडा <ChevronRight className="size-3" />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Select Medium */}
              {selectedClass && !selectedMedium && (
                <motion.div
                  key="medium-selection"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-8"
                >
                  <div className="text-center space-y-2 pt-4">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Select Medium / माध्यम निवडा</h2>
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                      Class Selected: {selectedClass}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-2xl mx-auto w-full">
                    {MEDIUMS.map((med) => (
                      <motion.button
                        key={med.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedMedium(med.id)}
                        className="group p-10 rounded-[3rem] border text-left transition-all duration-500 shadow-md hover:shadow-xl cursor-pointer relative overflow-hidden flex items-start gap-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-indigo-500/30"
                      >
                        <div className="size-14 rounded-full flex items-center justify-center border border-white/20 bg-white/10 backdrop-blur-sm group-hover:scale-110 transition-transform text-white font-black text-base uppercase shrink-0">
                          {med.badge}
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-black text-xl text-white">{med.mr}</h4>
                          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mt-1">
                            {med.title} Medium
                          </p>
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  <div className="flex justify-center pt-4">
                    <button
                      onClick={() => setSelectedClass(null)}
                      className="flex items-center gap-2 text-indigo-600 hover:text-indigo-900 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="size-4" /> Change Class / मागे फिरा
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Calendar & Date Viewer Panel */}
              {selectedClass && selectedMedium && (
                <motion.div
                  key="diary-viewer"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="space-y-6"
                >
                  {/* Control Bar (Glassmorphism inspired) */}
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200/60 rounded-3xl p-4 shadow-sm print:hidden">
                    <button
                      onClick={() => {
                        setSelectedMedium(null);
                        setPageData(null);
                      }}
                      className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      <ArrowLeft className="size-4" /> Back to Mediums
                    </button>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Date Calendar Popover */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="flex items-center gap-2.5 px-4 py-2 border border-slate-200 hover:border-indigo-600 rounded-xl text-slate-700 font-bold text-xs uppercase tracking-wider bg-white cursor-pointer transition-all">
                            <Calendar className="size-4 text-indigo-600" />
                            <span>{format(selectedDate, "dd/MM/yyyy")}</span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-50">
                          <CalendarComponent
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => date && setSelectedDate(date)}
                            disabled={isMounted ? (date) => {
                              const today = new Date();
                              today.setHours(23, 59, 59, 999);
                              return date > today;
                            } : undefined}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>

                      <div className="h-6 w-px bg-slate-200" />

                      {/* Day navigation */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handlePrevDay}
                          className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 hover:text-indigo-600 transition-colors"
                          title="Previous Day"
                        >
                          <ChevronLeft className="size-4" />
                        </button>
                        <button
                          onClick={handleNextDay}
                          disabled={isMounted ? addDays(selectedDate, 1) > (() => { const t = new Date(); t.setHours(23,59,59,999); return t; })() : false}
                          className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Next Day"
                        >
                          <ChevronRight className="size-4" />
                        </button>
                      </div>

                      <div className="h-6 w-px bg-slate-200" />

                      {/* Zoom Utilities */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleZoomOut}
                          className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 hover:text-indigo-600 transition-colors"
                          title="Zoom Out"
                        >
                          <ZoomOut className="size-4" />
                        </button>
                        <span className="text-[10px] font-black text-slate-400 w-10 text-center select-none">
                          {Math.round(zoomLevel * 100)}%
                        </span>
                        <button
                          onClick={handleZoomIn}
                          className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 hover:text-indigo-600 transition-colors"
                          title="Zoom In"
                        >
                          <ZoomIn className="size-4" />
                        </button>
                      </div>

                      <div className="h-6 w-px bg-slate-200" />

                      {/* Fullscreen and Download */}
                      <button
                        onClick={handleToggleFullscreen}
                        className={`p-2 border rounded-lg transition-colors ${
                          isFullscreen
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-indigo-600"
                        }`}
                        title="Toggle Fullscreen"
                      >
                        <Maximize2 className="size-4" />
                      </button>

                      <button
                        onClick={handleDownload}
                        disabled={!pageData?.pageUrl}
                        className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Download Page"
                      >
                        <Download className="size-4" />
                      </button>
                    </div>
                  </div>

                  {/* Viewer Display Window */}
                  <div
                    ref={viewerRef}
                    className={`bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center overflow-auto min-h-[600px] transition-all relative ${
                      isFullscreen ? "fixed inset-0 z-50 p-10 h-screen w-screen bg-slate-900 border-none rounded-none" : ""
                    }`}
                  >
                    {loading ? (
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <Loader2 className="size-10 animate-spin text-indigo-600" />
                        <span className="text-xs font-bold uppercase tracking-wider">Syncing diary page...</span>
                      </div>
                    ) : pageData?.pageUrl ? (
                      <div
                        className="transition-all duration-200 rounded-xl overflow-hidden shadow-md bg-white border border-slate-100 flex items-center justify-center"
                        style={{
                          width: `${1000 * zoomLevel}px`,
                          height: `${650 * zoomLevel}px`,
                          maxWidth: "100%",
                        }}
                      >
                        <iframe
                          src={`${pageData.pageUrl}#view=FitH`}
                          title={`Page ${pageData.pageNumber}`}
                          className="w-full h-full border-none"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center p-12 space-y-4 max-w-md">
                        <div className="size-16 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                          <FileText className="size-8" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-lg font-bold text-slate-800">No Diary Page Mapped</h3>
                          <p className="text-xs text-slate-400">
                            There is no teaching diary page mapped to the date: <strong className="text-slate-600">{format(selectedDate, "dd/MM/yyyy")}</strong>.
                          </p>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Please select another date on the calendar, use standard Next/Prev arrows, or contact standard admin.
                        </p>
                      </div>
                    )}

                    {/* Overlay badge in Fullscreen mode */}
                    {isFullscreen && (
                      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl text-white text-xs font-bold pointer-events-none">
                        {selectedClass} — {selectedMedium} — {format(selectedDate, "dd/MM/yyyy")}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </PinGate>
      </main>
    </div>
  );
}
