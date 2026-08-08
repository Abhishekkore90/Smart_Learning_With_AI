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
  Edit,
  CheckCircle2,
  CalendarDays,
  Layers,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { showToast as toast } from "@/lib/custom-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, addDays, subDays } from "date-fns";
import { PinGate } from "@/components/teacher/PinGate";
import { useDiaryProcessing } from "@/contexts/DiaryProcessingContext";
import { useAuthenticatedPdf } from "@/lib/bunny-auth-pdf";
import { TeacherTodayDiary } from "@/components/teacher/TeacherTodayDiary";
import { DocumentLivePreview } from "@/components/DocumentLivePreview";

export const Route = createFileRoute("/teacher/teaching-record")({
  head: () => ({
    meta: [{ title: "Teaching Diary Report (टाचणवही अहवाल) — Reports" }],
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

const months = [
  { id: "06", name: "June", mr: "जून", badge: "JUN" },
  { id: "07", name: "July", mr: "जुलै", badge: "JUL" },
  { id: "08", name: "August", mr: "ऑगस्ट", badge: "AUG" },
  { id: "09", name: "September", mr: "सप्टेंबर", badge: "SEP" },
  { id: "10", name: "October", mr: "ऑक्टोबर", badge: "OCT" },
  { id: "11", name: "November", mr: "नोव्हेंबर", badge: "NOV" },
  { id: "12", name: "December", mr: "डिसेंबर", badge: "DEC" },
  { id: "01", name: "January", mr: "जानेवारी", badge: "JAN" },
  { id: "02", name: "February", mr: "फेब्रुवारी", badge: "FEB" },
  { id: "03", name: "March", mr: "मार्च", badge: "MAR" },
  { id: "04", name: "April", mr: "एप्रिल", badge: "APR" },
  { id: "05", name: "May", mr: "मे", badge: "MAY" },
];

const weeks = [
  { id: "Week 1", label: "Week 1", mr: "पहिला आठवडा" },
  { id: "Week 2", label: "Week 2", mr: "दुसरा आठवडा" },
  { id: "Week 3", label: "Week 3", mr: "तिसरा आठवडा" },
  { id: "Week 4", label: "Week 4", mr: "चौथा आठवडा" },
  { id: "Week 5", label: "Week 5", mr: "पाचवा आठवडा" },
];

function TeachingRecordPage() {
  const { activeJobs } = useDiaryProcessing();
  
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedMedium, setSelectedMedium] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string>("Week 1");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const getWeekForDate = (diaryDate: string): string => {
    if (diaryDate === "master_diary") return "all";
    const parts = diaryDate.split("-");
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      if (day <= 7) return "Week 1";
      if (day <= 14) return "Week 2";
      if (day <= 21) return "Week 3";
      if (day <= 28) return "Week 4";
      return "Week 5";
    }
    return "Week 1";
  };

  const getRecordWeek = (rec: any): string => {
    if (rec.week) return rec.week;
    return getWeekForDate(rec.diaryDate);
  };
  

  
  const [pageData, setPageData] = useState<any>(null);
  const [diaryRecords, setDiaryRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Authenticate PDF URL for embedded iframe viewer
  const { pdfBlobUrl: authenticatedPageUrl, loading: loadingPagePdf, error: pdfError } = useAuthenticatedPdf(pageData?.pageUrl || null);

  const [selectedRecordForPreview, setSelectedRecordForPreview] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { pdfBlobUrl: authenticatedPreviewUrl, loading: loadingPreview } = useAuthenticatedPdf(selectedRecordForPreview?.pageUrl || null);

  const [editableContent, setEditableContent] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"document" | "table">("document");
  const [activeViewTab, setActiveViewTab] = useState<"today" | "document">("today");
  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  
  // Viewer utilities
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  // Fetch record whenever Class or Medium changes
  useEffect(() => {
    if (selectedClass && selectedMedium) {
      fetchDiaryRecords(selectedClass, selectedMedium);
    }
  }, [selectedClass, selectedMedium]);

  // Auto select the first record of the selected week/month/year
  useEffect(() => {
    if (selectedClass && selectedMedium && selectedYear && selectedMonth && selectedWeek && diaryRecords.length > 0) {
      const recordsForWeek = diaryRecords.filter(
        (r) => r.diaryDate === "master_diary" || (r.diaryDate.split("-")[0] === String(selectedYear) && r.diaryDate.split("-")[1] === selectedMonth && getRecordWeek(r) === selectedWeek)
      );
      if (recordsForWeek.length > 0) {
        setPageData(recordsForWeek[0]);
        const parts = recordsForWeek[0].diaryDate.split("-");
        if (parts.length === 3) {
          setSelectedDate(new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
        }
      } else {
        setPageData(null);
      }
    } else {
      setPageData(null);
    }
  }, [selectedWeek, selectedMonth, selectedYear, diaryRecords, selectedClass, selectedMedium]);

  const activeJob = selectedClass && selectedMedium ? activeJobs[`${selectedClass}_${selectedMedium}`] : undefined;
  const isJobProcessing = activeJob && activeJob.status !== "completed" && activeJob.status !== "failed";
  const [prevJobWasProcessing, setPrevJobWasProcessing] = useState(false);

  useEffect(() => {
    if (isJobProcessing) {
      setPrevJobWasProcessing(true);
    } else if (prevJobWasProcessing && !isJobProcessing) {
      setPrevJobWasProcessing(false);
      if (selectedClass && selectedMedium) {
        fetchDiaryRecords(selectedClass, selectedMedium);
      }
    }
  }, [isJobProcessing, prevJobWasProcessing, selectedClass, selectedMedium]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  /**
   * Fetch Teaching Diary Record for Medium + Class.
   */
  const fetchDiaryRecords = async (cls: string, med: string) => {
    setLoading(true);
    setError(null);
    try {
      const collectionRef = collection(db, "teacher_diaries", cls, med);
      const querySnapshot = await getDocs(collectionRef);

      if (!querySnapshot.empty) {
        const allDocs: any[] = querySnapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const rawUrl = data.pageUrl || data.masterPdfUrl || data.pageURL || "";
          const sanitizedUrl = rawUrl.replace(/vz-7a00d099-4a8\.b-cdn\.net/g, "sgkbrainova.b-cdn.net");
          const dateKey = data.diaryDate || docSnap.id;
          return {
            id: docSnap.id,
            diaryDate: dateKey,
            pageNumber: data.pageNumber || 1,
            pageUrl: sanitizedUrl,
            uploadedAt: data.uploadedAt || 0,
            ...data,
          };
        });

        // Sort records by date
        allDocs.sort((a, b) => (a.diaryDate || a.id).localeCompare(b.diaryDate || b.id));
        setDiaryRecords(allDocs);
      } else {
        setDiaryRecords([]);
        setPageData(null);
      }
    } catch (err: any) {
      console.error("Error loading teaching diary record:", err);
      setError("Failed to load teaching diary record.");
      setDiaryRecords([]);
      setPageData(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevDay = () => {
    setSelectedDate((prev) => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setSelectedDate((prev) => addDays(prev, 1));
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

  const isWordDoc = (filename?: string | null) => {
    if (!filename) return false;
    const lower = filename.toLowerCase();
    return lower.endsWith(".doc") || lower.endsWith(".docx") || lower.includes(".doc?") || lower.includes(".docx?");
  };

  const handleDownload = () => {
    if (!pageData?.pageUrl) {
      toast.error("No file available for download.");
      return;
    }
    const isWord = isWordDoc(pageData.fileName || pageData.pageUrl);
    const ext = isWord ? (pageData.fileName?.endsWith(".doc") ? "doc" : "docx") : "pdf";
    const link = document.createElement("a");
    link.href = authenticatedPageUrl || pageData.pageUrl;
    link.target = "_blank";
    link.download = pageData.fileName || `Diary_${selectedClass}_${selectedMedium}_${format(selectedDate, "yyyy-MM-dd")}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="print:hidden">
        <TeacherHeader />
        <TeacherSidebar />
      </div>

      <main className="lg:pl-0 pt-16 min-h-screen print:pl-0 print:pt-0">
        <PinGate sectionKey="teaching_record">
          <div className="p-4 sm:p-6 md:p-8 max-w-full mx-auto space-y-6 print:p-0 print:max-w-full">
            <AnimatePresence mode="wait">

              {/* Step 1: Select Medium */}
              {!selectedMedium && (
                <motion.div
                  key="medium-selection"
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
                          REPORTS & REGISTERS (शासकीय अहवाल व नोंदी)
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight">
                          Teaching Diary <span className="text-indigo-400">टाचणवही अहवाल.</span>
                        </h2>
                        <p className="text-xs md:text-sm text-slate-400 max-w-xl">
                          Select Medium, Class, and Date to instantly view official Teaching Diaries (PDF / Word).
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center justify-center size-16 md:size-20 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 shadow-inner">
                        <BookOpen className="size-8 md:size-10 text-indigo-400" />
                      </div>
                    </div>
                  </div>

                  <div className="text-center space-y-2 pt-4">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Select Medium / माध्यम निवडा</h2>
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Step 1: Medium Selection</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-2xl mx-auto w-full">
                    {MEDIUMS.map((med) => (
                      <motion.button
                        key={med.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setSelectedMedium(med.id);
                          if (!selectedClass) setSelectedClass("Class 1");
                        }}
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
                </motion.div>
              )}

              {/* Step 2: Select Class */}
              {selectedMedium && !selectedClass && (
                <motion.div
                  key="class-selection"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-8"
                >
                  <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl border border-white/5">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-xs font-semibold tracking-wider text-purple-200">
                          <Sparkles className="size-3.5 text-amber-300 animate-pulse" />
                          REPORTS & REGISTERS (शासकीय अहवाल व नोंदी)
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight">
                          Teaching Diary <span className="text-indigo-400">टाचणवही अहवाल.</span>
                        </h2>
                      </div>
                    </div>
                  </div>

                  <div className="text-center space-y-2 pt-4">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Select Class / इयत्ता निवडा</h2>
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                      Medium Selected: {selectedMedium === "Marathi" ? "मराठी माध्यम" : "सेमी इंग्रजी"}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 max-w-full mx-auto w-full">
                    {DIARY_CLASSES.map((cls) => (
                      <motion.button
                        key={cls.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedClass(cls.id)}
                        className={`group p-8 rounded-[2.5rem] border text-center transition-all duration-500 shadow-md hover:shadow-lg bg-gradient-to-br ${cls.color} text-white border-black/5 cursor-pointer relative overflow-hidden flex flex-col items-center gap-4`}
                      >
                        <div className="size-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform text-white font-black text-sm uppercase">
                          {cls.badge}
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-xl font-black leading-tight tracking-tight">{cls.mr}</h3>
                          <p className="text-[10px] text-slate-100/70 font-bold uppercase tracking-wider">{cls.id}</p>
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  <div className="flex justify-center pt-4">
                    <button
                      onClick={() => setSelectedMedium(null)}
                      className="flex items-center gap-2 text-indigo-600 hover:text-indigo-900 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="size-4" /> Change Medium / माध्यम बदला
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Select Month (Baby Pink Cards) */}
              {selectedMedium && selectedClass && selectedYear && !selectedMonth && (
                <motion.div
                  key="month-selection"
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
                          REPORTS & REGISTERS (शासकीय अहवाल व नोंदी)
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight">
                          Teaching Diary <span className="text-indigo-400">टाचणवही अहवाल.</span>
                        </h2>
                      </div>
                    </div>
                  </div>

                  <div className="text-center space-y-2 pt-4">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Select Month / महिना निवडा</h2>
                    <p className="text-xs font-bold text-slate-500">
                      निवडलेले माध्यम: <span className="text-indigo-600 font-black">{selectedMedium === "Marathi" ? "मराठी माध्यम" : "सेमी इंग्रजी"}</span> • इयत्ता: <span className="text-purple-600 font-black">{selectedClass}</span> • वर्ष: <span className="text-teal-600 font-black">{selectedYear}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-4xl mx-auto w-full">
                    {months.map((m) => (
                      <motion.button
                        key={m.id}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          setSelectedMonth(m.id);
                          const updatedDate = new Date(selectedDate);
                          updatedDate.setFullYear(selectedYear);
                          updatedDate.setMonth(parseInt(m.id, 10) - 1);
                          setSelectedDate(updatedDate);
                        }}
                        className="group relative p-6 rounded-2xl border-2 text-center transition-all duration-500 cursor-pointer overflow-hidden bg-pink-50/40 border-pink-100 hover:border-pink-300 hover:bg-pink-100/30 text-slate-800 flex flex-col items-center gap-2 shadow-sm"
                      >
                        <div className="size-10 bg-pink-200/50 rounded-xl flex items-center justify-center border border-pink-200 group-hover:scale-110 transition-transform">
                          <Calendar className="size-5 text-pink-600" />
                        </div>
                        <div className="space-y-0.5">
                          <h3 className="text-base font-black leading-tight tracking-tight text-slate-800">{m.mr}</h3>
                          <p className="text-[10px] text-pink-500 font-bold uppercase tracking-wider">{m.name}</p>
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => setSelectedClass(null)}
                      className="flex items-center gap-2 px-5 py-2.5 text-indigo-600 hover:text-indigo-900 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                    >
                      <ArrowLeft className="size-4" /> मागे या (Back to Class)
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 5: Main View (Today's Diary Auto-Detection & PDF Viewer) */}
              {selectedClass && selectedMedium && selectedYear && selectedMonth && (
                <motion.div
                  key="diary-viewer"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="space-y-6"
                >
                  {/* Top bar showing selection + back buttons */}
                  <div className="flex items-center justify-between gap-4 bg-slate-900 text-white p-3 rounded-2xl border border-slate-800 shadow-md">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedMonth(null)}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
                        title="Back to Month Selection"
                      >
                        <ArrowLeft className="size-4" />
                      </button>
                      <div className="flex items-center gap-2">
                        <Layers className="size-4 text-indigo-400" />
                        <span className="text-xs font-black">
                          {selectedMedium === "Marathi" ? "मराठी माध्यम" : "सेमी इंग्रजी"} • {selectedClass} • {months.find(m => m.id === selectedMonth)?.mr}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setSelectedMonth(null); setSelectedClass(null); }}
                        className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                      >
                        Change Class
                      </button>
                      <button
                        onClick={() => { setSelectedMonth(null); setSelectedClass(null); setSelectedMedium(null); }}
                        className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                      >
                        Change Medium
                      </button>
                    </div>
                  </div>

                  {/* Top View Mode Switcher */}
                  <div className="flex items-center justify-between gap-4 bg-slate-900 text-white p-2 rounded-2xl border border-slate-850 shadow-sm">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveViewTab("today")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                          activeViewTab === "today"
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                        }`}
                      >
                        <Sparkles className="size-4 text-amber-300" />
                        <span>आजचे टाचण (Today's Teaching Diary)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveViewTab("document")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                          activeViewTab === "document"
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                        }`}
                      >
                        <FileText className="size-4" />
                        <span>दस्तऐवज अहवाल (PDF / Doc View)</span>
                      </button>
                    </div>
                  </div>

                  {activeViewTab === "today" ? (
                    <TeacherTodayDiary selectedClass={selectedClass} selectedMedium={selectedMedium} />
                  ) : (
                    <>
                      {/* Week Navigation Tabs */}
                      <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200/80 rounded-3xl p-3 shadow-sm print:hidden">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3">
                          आठवडा निवडा / Select Week:
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {weeks.map((wk) => {
                            const isActive = selectedWeek === wk.id;
                            return (
                              <button
                                key={wk.id}
                                type="button"
                                onClick={() => setSelectedWeek(wk.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                  isActive
                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                                    : "bg-slate-50 text-slate-650 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/50"
                                }`}
                              >
                                {wk.mr} ({wk.label})
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Available Diaries List (Centered) */}
                      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                            <BookOpen className="size-4 text-indigo-600" />
                            दैंनदिन टाचण अहवाल (Uploaded Records): {selectedClass} ({selectedMedium}) — {months.find(m => m.id === selectedMonth)?.mr} • {weeks.find(w => w.id === selectedWeek)?.mr}
                          </h3>
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-650 rounded-full text-[10px] font-black">
                            Total {diaryRecords.filter(rec => rec.diaryDate === "master_diary" || (rec.diaryDate.split("-")[0] === String(selectedYear) && rec.diaryDate.split("-")[1] === selectedMonth && getRecordWeek(rec) === selectedWeek)).length}
                          </span>
                        </div>

                        {loading ? (
                          <div className="flex items-center justify-center py-8 text-xs font-bold text-slate-400 gap-2">
                            <Loader2 className="size-4 animate-spin text-indigo-600" /> Loading records...
                          </div>
                        ) : diaryRecords.filter(rec => rec.diaryDate === "master_diary" || (rec.diaryDate.split("-")[0] === String(selectedYear) && rec.diaryDate.split("-")[1] === selectedMonth && getRecordWeek(rec) === selectedWeek)).length > 0 ? (
                          <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                            {diaryRecords
                              .filter(rec => rec.diaryDate === "master_diary" || (rec.diaryDate.split("-")[0] === String(selectedYear) && rec.diaryDate.split("-")[1] === selectedMonth && getRecordWeek(rec) === selectedWeek))
                              .map((rec) => {
                                const isWord = isWordDoc(rec.fileName || rec.pageUrl);
                                return (
                                  <div
                                    key={rec.id}
                                    className="p-3.5 rounded-2xl border bg-slate-50 border-slate-200/60 hover:bg-slate-100 text-slate-700 flex items-center justify-between gap-3"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      {isWord ? <FileText className="size-5 text-blue-600 shrink-0" /> : <BookOpen className="size-5 text-indigo-600 shrink-0" />}
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <p className="text-xs font-extrabold truncate">{rec.fileName}</p>
                                          {isWord && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black rounded uppercase">DOC</span>}
                                        </div>
                                        <p className="text-[10px] text-slate-505 font-semibold">
                                          Date: <span className="font-bold text-slate-800">{rec.diaryDate}</span> • Uploaded {format(new Date(rec.uploadedAt), "dd/MM/yyyy HH:mm")}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedRecordForPreview(rec);
                                          setIsPreviewOpen(true);
                                        }}
                                        className="p-1.5 bg-white border border-slate-205 hover:bg-indigo-50 text-indigo-600 rounded-lg cursor-pointer flex items-center gap-1 text-xs font-bold"
                                        title="View Record"
                                      >
                                        <Eye className="size-3.5" /> View / प्रिव्ह्यू
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-slate-400 space-y-2">
                            <AlertTriangle className="size-6 text-amber-500 mx-auto" />
                            <p className="text-xs font-bold text-slate-500">No teaching diary uploaded yet for {selectedClass} ({selectedMedium}) in {months.find(m => m.id === selectedMonth)?.mr} • {weeks.find(w => w.id === selectedWeek)?.mr}.</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </motion.div>
              )}


            </AnimatePresence>

             {/* Document Live Preview Modal Backdrop & Frame */}
             {isPreviewOpen && selectedRecordForPreview && (
               <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-955/80 backdrop-blur-sm">
                 <div className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-5xl border border-slate-100 flex flex-col h-[85vh]">
                   {/* Modal Header */}
                   <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
                     <div className="flex items-center gap-3 min-w-0">
                       <div className="size-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                         <FileText className="size-4 text-white" />
                       </div>
                       <div className="min-w-0">
                         <p className="text-xs font-bold truncate">{selectedRecordForPreview.fileName || "Teaching Diary Document"}</p>
                         <p className="text-[10px] text-slate-400">{selectedClass} ({selectedMedium}) — {months.find(m => m.id === selectedMonth)?.mr} • {weeks.find(w => w.id === selectedWeek)?.mr}</p>
                       </div>
                     </div>
                     <button
                       onClick={() => {
                         setIsPreviewOpen(false);
                         setSelectedRecordForPreview(null);
                       }}
                       className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
                     >
                       Close ×
                     </button>
                   </div>

                   {/* Modal Body */}
                   <div className="flex-1 overflow-hidden bg-slate-100 p-4">
                     <DocumentLivePreview
                       selectedFile={null}
                       savedRecord={selectedRecordForPreview}
                       authenticatedPdfUrl={authenticatedPreviewUrl}
                       loadingPdf={loadingPreview}
                     />
                   </div>
                 </div>
               </div>
             )}
          </div>
        </PinGate>
      </main>
    </div>
  );
}
