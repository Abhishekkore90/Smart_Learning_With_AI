import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  ChevronLeft,
  Upload,
  Trash2,
  Calendar,
  Layers,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  FileText,
  Download,
  Eye,
  ArrowLeft,
  ArrowRight,
  PlusCircle,
  FileCheck,
  GraduationCap,
} from "lucide-react";
import { collection, doc, setDoc, getDocs, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadFileWithProgress } from "@/lib/upload";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { showToast as toast } from "@/lib/custom-toast";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useAuthenticatedPdf } from "@/lib/bunny-auth-pdf";
import { parseAndSaveYearlyDiary, generateSampleYearlyCsv } from "@/lib/yearly-diary-parser";
import { DocumentLivePreview } from "@/components/DocumentLivePreview";

export const Route = createFileRoute("/admin/teacher-diary")({
  head: () => ({ meta: [{ title: "Teaching Diary Management — Super Admin" }] }),
  component: TeacherDiaryAdmin,
});

interface DiaryRecordItem {
  id: string;
  diaryDate: string;
  fileName: string;
  pageUrl: string;
  uploadedAt: number;
  className: string;
  medium: string;
}

function TeacherDiaryAdmin() {
  const navigate = useNavigate();

  // Selection states – null means "not yet selected" (show selection cards)
  // Always start from Medium selection when page opens
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedMedium, setSelectedMedium] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const getDaysForWeek = (year: number, monthStr: string, weekStr: string) => {
    const monthIdx = parseInt(monthStr, 10) - 1;
    const days = [];
    let startDay = 1;
    let endDay = 7;
    if (weekStr === "Week 1") { startDay = 1; endDay = 7; }
    else if (weekStr === "Week 2") { startDay = 8; endDay = 14; }
    else if (weekStr === "Week 3") { startDay = 15; endDay = 21; }
    else if (weekStr === "Week 4") { startDay = 22; endDay = 28; }
    else if (weekStr === "Week 5") {
      startDay = 29;
      endDay = new Date(year, monthIdx + 1, 0).getDate();
    }
    const dayNamesMr = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
    const monthNamesMr: Record<string, string> = {
      "01": "जानेवारी", "02": "फेब्रुवारी", "03": "मार्च", "04": "एप्रिल",
      "05": "मे", "06": "जून", "07": "जुलै", "08": "ऑगस्ट",
      "09": "सप्टेंबर", "10": "ऑक्टोबर", "11": "नोव्हेंबर", "12": "डिसेंबर"
    };
    for (let d = startDay; d <= endDay; d++) {
      const dateObj = new Date(year, monthIdx, d);
      if (dateObj.getMonth() === monthIdx) {
        const dateStr = format(dateObj, "yyyy-MM-dd");
        const dayNameMr = dayNamesMr[dateObj.getDay()];
        const monthMr = monthNamesMr[monthStr] || "";
        const label = `${format(dateObj, "dd MMM")} (${format(dateObj, "EEEE")})`;
        const mrLabel = `${d} ${monthMr} (${dayNameMr})`;
        days.push({
          date: dateObj,
          dateStr,
          label,
          mrLabel
        });
      }
    }
    return days;
  };

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



  // Upload/Processing states
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>("");




  // Existing records list for current Class & Medium
  const [existingRecords, setExistingRecords] = useState<DiaryRecordItem[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [selectedRecordForPreview, setSelectedRecordForPreview] = useState<DiaryRecordItem | null>(null);

  // Authenticated PDF URL for active preview
  const previewUrlToFetch = selectedRecordForPreview?.pageUrl || null;
  const { pdfBlobUrl: authenticatedPreviewUrl, loading: loadingPreview } = useAuthenticatedPdf(previewUrlToFetch);

  const classes = [
    { id: "Class 1", badge: "1ST", mr: "इयत्ता पहिली" },
    { id: "Class 2", badge: "2ND", mr: "इयत्ता दुसरी" },
    { id: "Class 3", badge: "3RD", mr: "इयत्ता तिसरी" },
    { id: "Class 4", badge: "4TH", mr: "इयत्ता चौथी" },
    { id: "Class 5", badge: "5TH", mr: "इयत्ता पाचवी" },
    { id: "Class 6", badge: "6TH", mr: "इयत्ता सहावी" },
    { id: "Class 7", badge: "7TH", mr: "इयत्ता सातवी" },
    { id: "Class 8", badge: "8TH", mr: "इयत्ता आठवी" },
  ];

  const mediums = [
    { id: "Marathi", label: "मराठी माध्यम (Marathi)" },
    { id: "Semi English", label: "सेमी इंग्रजी (Semi English)" },
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

  // Auth guard
  useEffect(() => {
    const isAdmin = sessionStorage.getItem("is_super_admin");
    if (!isAdmin) {
      navigate({
        to: "/login",
        search: { redirect: "/admin/teacher-diary", role: "admin" } as any,
      });
    }
  }, [navigate]);

  // Sync selections to localStorage & fetch existing records
  useEffect(() => {
    if (selectedClass) localStorage.setItem("admin_diary_class", selectedClass);
    if (selectedMedium) localStorage.setItem("admin_diary_medium", selectedMedium);
    if (selectedClass && selectedMedium) {
      fetchExistingRecords(selectedClass, selectedMedium);
    }
  }, [selectedClass, selectedMedium]);

  // Fetch all uploaded diaries for the selected Class & Medium
  const fetchExistingRecords = async (cls: string, med: string) => {
    setLoadingRecords(true);
    try {
      const collectionRef = collection(db, "teacher_diaries", cls, med);
      const snapshot = await getDocs(collectionRef);
      const records: DiaryRecordItem[] = [];

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const diaryDate = data.diaryDate || docSnap.id;
        records.push({
          id: docSnap.id,
          diaryDate: diaryDate,
          fileName: data.fileName || "Teaching_Diary.pdf",
          pageUrl: data.pageUrl || data.masterPdfUrl || "",
          uploadedAt: data.uploadedAt || Date.now(),
          className: data.className || cls,
          medium: data.medium || med,
        });
      });

      // Sort records descending by date
      records.sort((a, b) => b.diaryDate.localeCompare(a.diaryDate));
      setExistingRecords(records);

      // Auto select saved preview record from localStorage or latest record
      const savedPreviewId = localStorage.getItem(`admin_diary_preview_${cls}_${med}`);
      const matchedRecord = records.find((r) => r.id === savedPreviewId || r.diaryDate === savedPreviewId);

      if (matchedRecord) {
        setSelectedRecordForPreview(matchedRecord);
      } else if (records.length > 0) {
        setSelectedRecordForPreview(records[0]);
        localStorage.setItem(`admin_diary_preview_${cls}_${med}`, records[0].id);
      } else {
        setSelectedRecordForPreview(null);
      }
    } catch (err) {
      console.error("Error fetching existing diary records:", err);
      toast.error("Failed to load existing diary records");
    } finally {
      setLoadingRecords(false);
    }
  };


  // Helper to check if file is Word doc
  const isWordDoc = (filename?: string | null) => {
    if (!filename) return false;
    const lower = filename.toLowerCase();
    return lower.endsWith(".doc") || lower.endsWith(".docx") || lower.includes(".doc?") || lower.includes(".docx?");
  };

  // Handle PDF, Word, or Excel file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("FILE_SELECTED: ", file.name, "size:", file.size);
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext && ["pdf", "doc", "docx", "xlsx", "xls", "csv"].includes(ext)) {
        setSelectedFile(file);
        if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
        setLocalPreviewUrl(URL.createObjectURL(file));
        toast.success(`Selected File: ${file.name}`);
      } else {
        toast.error("Invalid file format. Please select PDF, Word (.doc, .docx), or Excel (.xlsx, .csv) file.");
        e.target.value = "";
      }
    }
  };

  // Upload PDF/Word & save record to Storage and Firestore
  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a Teaching Diary file (PDF or Word) first.");
      return;
    }
    if (!selectedClass || !selectedMedium || !selectedYear || !selectedMonth || !selectedWeek) return;

    let day = 1;
    if (selectedWeek === "Week 2") day = 8;
    else if (selectedWeek === "Week 3") day = 15;
    else if (selectedWeek === "Week 4") day = 22;
    else if (selectedWeek === "Week 5") day = 29;

    const monthStr = selectedMonth || "01";
    const dateStr = `${selectedYear}-${monthStr}-${String(day).padStart(2, "0")}`;
    const classFolder = selectedClass.toLowerCase().replace(/\s+/g, "-");
    const mediumFolder = selectedMedium.toLowerCase().replace(/\s+/g, "-");

    console.log("UPLOAD_STARTED: Beginning upload process for", selectedFile.name);
    setUploading(true);
    setUploadProgress(0); // Show real progress from 0% instead of hardcoding 10%
    setUploadStatus("Uploading document...");

    try {
      // 1. Upload to Storage
      const result = await uploadFileWithProgress(selectedFile, {
        folderPath: `teacher-diaries/${classFolder}/${mediumFolder}`,
        maxSizeBytes: 50 * 1024 * 1024,
        preferredProvider: "bunny",
        onProgress: (pct) => {
          console.log(`UPLOAD_PROGRESS: ${pct}%`);
          setUploadProgress(pct);
        },
      });

      console.log("UPLOAD_COMPLETED: File uploaded successfully.");
      const fileUrl = result.url;
      console.log("DOWNLOAD_URL_CREATED: ", fileUrl);
      console.log("DATABASE_SAVE_STARTED: Saving record to Firestore...");
      setUploadStatus("Saving record in database...");
      setUploadProgress(95);

      // 2. Save/Update record in Firestore (Doc ID = YYYY-MM-DD for fast date-based lookup)
      const diaryDocRef = doc(db, "teacher_diaries", selectedClass, selectedMedium, dateStr);
      
      const isUpdate = existingRecords.some((r) => r.id === dateStr || r.diaryDate === dateStr);

      await setDoc(diaryDocRef, {
        pageUrl: fileUrl,
        masterPdfUrl: fileUrl,
        fileName: selectedFile.name,
        uploadedAt: Date.now(),
        diaryDate: dateStr,
        className: selectedClass,
        medium: selectedMedium,
        pageNumber: 1,
        week: selectedWeek,
        month: selectedMonth,
      });

      localStorage.setItem(`admin_diary_preview_${selectedClass}_${selectedMedium}`, dateStr);
      console.log("DATABASE_SAVE_COMPLETED: Record saved successfully.");
      setUploadProgress(100);
      setUploadStatus("Upload completed!");
      console.log("UPLOAD_SUCCESS: Complete flow finished perfectly.");


      if (isUpdate) {
        toast.success(`Updated Teaching Diary for ${selectedClass} (${selectedMedium}) on ${dateStr}`);
      } else {
        toast.success(`Successfully uploaded Teaching Diary for ${selectedClass} (${selectedMedium}) on ${dateStr}`);
      }

      // Reset selection state & refresh list
      setSelectedFile(null);
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);

      await fetchExistingRecords(selectedClass, selectedMedium);
    } catch (err: any) {
      console.error("UPLOAD_ERROR:", err);
      setUploadStatus("Upload failed: " + (err.message || "Unknown error"));
      toast.error(err.message || "Failed to upload Teaching Diary file.");
    } finally {
      setUploading(false);
    }
  };

  // Delete an existing diary record
  const handleDeleteRecord = async (record: DiaryRecordItem) => {
    if (!selectedClass || !selectedMedium) return;
    if (!confirm(`Are you sure you want to delete the diary record for ${record.diaryDate}?`)) {
      return;
    }

    try {
      const docRef = doc(db, "teacher_diaries", selectedClass, selectedMedium, record.id);
      await deleteDoc(docRef);
      toast.success(`Deleted diary record for ${record.diaryDate}`);
      await fetchExistingRecords(selectedClass, selectedMedium);
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error("Failed to delete diary record.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-24">
        
        {/* Header Navigation & Title */}
        <div className="mb-8 space-y-3">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 uppercase tracking-wider transition-colors"
          >
            <ChevronLeft className="size-4" /> Back to Admin Dashboard
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                Teaching Diary <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Management</span>
              </h1>
              <p className="text-slate-500 font-medium text-xs sm:text-sm mt-1">
                Select Medium, Class, and Date to upload or manage official Teaching Diaries (PDF format).
              </p>
            </div>
            <Link
              to="/teacher/teaching-record"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-indigo-100"
            >
              <Eye className="size-4" /> View User Portal View
            </Link>
          </div>
        </div>

        <AnimatePresence mode="wait">

          {/* ═══ STEP 1: Select Medium ═══ */}
          {!selectedMedium && (
            <motion.div
              key="medium-selection"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Hero Banner */}
              <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl border border-white/5">
                <div className="absolute -left-10 -top-10 size-40 bg-indigo-500/25 rounded-full blur-[50px] pointer-events-none" />
                <div className="absolute -right-10 -bottom-10 size-40 bg-purple-500/25 rounded-full blur-[50px] pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-xs font-semibold tracking-wider text-purple-200">
                      <Sparkles className="size-3.5 text-amber-300 animate-pulse" />
                      ADMIN PANEL — Teaching Diary Management
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight">
                      Teaching Diary <span className="text-indigo-400">Management.</span>
                    </h2>
                    <p className="text-xs md:text-sm text-slate-400 max-w-xl">
                      Upload, manage and preview official Teaching Diaries (PDF / Word / Excel) for all classes.
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center justify-center size-16 md:size-20 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 shadow-inner">
                    <BookOpen className="size-8 md:size-10 text-indigo-400" />
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center space-y-2 pt-2">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight italic">Select Medium / माध्यम निवडा</h2>
                <p className="text-xs font-bold text-slate-500">
                  वार्षिक व मासिक नियोजनासाठी प्रथम माध्यम निवडा (मराठी किंवा सेमी-इंग्रजी)
                </p>
              </div>

              {/* Medium Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto w-full">
                {mediums.map((med) => (
                  <motion.button
                    key={med.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedMedium(med.id)}
                    className="group relative p-8 rounded-[2.5rem] border text-left transition-all duration-500 shadow-lg hover:shadow-2xl cursor-pointer overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-800 text-white border-indigo-500/30"
                  >
                    <div className="absolute -right-8 -top-8 size-32 bg-white/5 rounded-full blur-xl pointer-events-none" />
                    <div className="relative z-10 flex items-start gap-5">
                      <div className="size-14 rounded-2xl flex items-center justify-center border border-white/20 bg-white/10 backdrop-blur-sm group-hover:scale-110 transition-transform text-white font-black text-xl shrink-0">
                        {med.id === "Marathi" ? "म" : "E"}
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-black text-xl text-white">{med.id === "Marathi" ? "मराठी माध्यम" : "सेमी-इंग्रजी माध्यम"}</h4>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">
                          {med.id === "Marathi" ? "Marathi" : "Semi English"} Medium
                        </p>
                        <p className="text-xs text-white/60 font-semibold flex items-center gap-1 mt-2">
                          इयत्ता निवडण्यासाठी पुढे या <ArrowRight className="size-3.5" />
                        </p>
                      </div>
                    </div>
                    <div className="absolute top-4 right-5">
                      <span className="px-2.5 py-1 bg-white/15 backdrop-blur-sm rounded-full text-[10px] font-black tracking-wider">
                        {med.id}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 2: Select Class ═══ */}
          {selectedMedium && !selectedClass && (
            <motion.div
              key="class-selection"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Hero Banner */}
              <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl border border-white/5">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-xs font-semibold tracking-wider text-purple-200">
                      <Sparkles className="size-3.5 text-amber-300 animate-pulse" />
                      ADMIN PANEL — Teaching Diary Management
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight">
                      Teaching Diary <span className="text-indigo-400">Management.</span>
                    </h2>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center space-y-2 pt-2">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight italic">Select Class / इयत्ता निवडा</h2>
                <p className="text-xs font-bold text-slate-500">
                  निवडलेले माध्यम: <span className="text-indigo-600 font-black">{selectedMedium === "Marathi" ? "मराठी माध्यम" : "सेमी इंग्रजी"}</span>
                </p>
              </div>

              {/* Class Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 max-w-full mx-auto w-full">
                {classes.map((cls) => (
                  <motion.button
                    key={cls.id}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedClass(cls.id)}
                    className="group relative p-7 rounded-[2rem] border text-center transition-all duration-500 shadow-md hover:shadow-xl cursor-pointer overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-800 text-white border-indigo-500/30 flex flex-col items-center gap-3"
                  >
                    <div className="size-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform">
                      <GraduationCap className="size-6 text-white" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-black leading-tight tracking-tight">{cls.mr}</h3>
                      <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider">{cls.id}</p>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Back Button */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setSelectedMedium(null)}
                  className="flex items-center gap-2 px-5 py-2.5 text-indigo-600 hover:text-indigo-900 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                >
                  <ArrowLeft className="size-4" /> मागे या (Back to Medium)
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 3: Select Month (Baby Pink Cards) ═══ */}
          {selectedMedium && selectedClass && selectedYear && !selectedMonth && (
            <motion.div
              key="month-selection"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Hero Banner */}
              <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl border border-white/5">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-xs font-semibold tracking-wider text-purple-200">
                      <Sparkles className="size-3.5 text-amber-300 animate-pulse" />
                      ADMIN PANEL — Teaching Diary Management
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight">
                      Teaching Diary <span className="text-indigo-400">Management.</span>
                    </h2>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center space-y-2 pt-2">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight italic">Select Month / महिना निवडा</h2>
                <p className="text-xs font-bold text-slate-500">
                  निवडलेले माध्यम: <span className="text-indigo-600 font-black">{selectedMedium === "Marathi" ? "मराठी माध्यम" : "सेमी इंग्रजी"}</span> • इयत्ता: <span className="text-purple-600 font-black">{selectedClass}</span> • वर्ष: <span className="text-teal-600 font-black">{selectedYear}</span>
                </p>
              </div>

              {/* Month Cards (Baby Pink Theme) */}
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

              {/* Back Button */}
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

          {/* ═══ STEP 5: Select Week (Week Cards) ═══ */}
          {selectedMedium && selectedClass && selectedYear && selectedMonth && !selectedWeek && (
            <motion.div
              key="week-selection"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Hero Banner */}
              <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl border border-white/5">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-xs font-semibold tracking-wider text-purple-200">
                      <Sparkles className="size-3.5 text-amber-300 animate-pulse" />
                      ADMIN PANEL — Teaching Diary Management
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight">
                      Teaching Diary <span className="text-indigo-400">Management.</span>
                    </h2>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center space-y-2 pt-2">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight italic">Select Week / आठवडा निवडा</h2>
                <p className="text-xs font-bold text-slate-500">
                  निवडलेले माध्यम: <span className="text-indigo-600 font-black">{selectedMedium === "Marathi" ? "मराठी माध्यम" : "सेमी इंग्रजी"}</span> • इयत्ता: <span className="text-purple-600 font-black">{selectedClass}</span> • वर्ष: <span className="text-teal-600 font-black">{selectedYear}</span> • महिना: <span className="text-pink-600 font-black">{months.find(m => m.id === selectedMonth)?.mr}</span>
                </p>
              </div>

              {/* Week Cards (Premium Lavender/Indigo Theme) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 max-w-5xl mx-auto w-full">
                {weeks.map((wk) => (
                  <motion.button
                    key={wk.id}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedWeek(wk.id)}
                    className="group relative p-6 rounded-2xl border-2 text-center transition-all duration-500 cursor-pointer overflow-hidden bg-indigo-50/40 border-indigo-100 hover:border-indigo-300 hover:bg-indigo-100/30 text-slate-800 flex flex-col items-center gap-2 shadow-sm"
                  >
                    <div className="size-10 bg-indigo-200/50 rounded-xl flex items-center justify-center border border-indigo-200 group-hover:scale-110 transition-transform">
                      <Calendar className="size-5 text-indigo-600" />
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="text-base font-black leading-tight tracking-tight text-slate-850">{wk.mr}</h3>
                      <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">{wk.label}</p>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Back Button */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setSelectedMonth(null)}
                  className="flex items-center gap-2 px-5 py-2.5 text-indigo-600 hover:text-indigo-900 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                >
                  <ArrowLeft className="size-4" /> मागे या (Back to Month)
                </button>
              </div>
            </motion.div>
          )}


          {/* ═══ STEP 5: Upload & Records List (Centered layout) ═══ */}
          {selectedMedium && selectedClass && selectedMonth && selectedWeek && (
            <motion.div
              key="diary-content"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-3xl mx-auto w-full space-y-6"
            >
              {/* Top bar showing selection + back button */}
              <div className="flex items-center justify-between gap-4 bg-slate-900 text-white p-3 rounded-2xl border border-slate-800 shadow-md">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedWeek(null)}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
                    title="Back to Week Selection"
                  >
                    <ArrowLeft className="size-4" />
                  </button>
                  <div className="flex items-center gap-2">
                    <Layers className="size-4 text-indigo-400" />
                    <span className="text-xs font-black">
                      {selectedMedium === "Marathi" ? "मराठी माध्यम" : "सेमी इंग्रजी"} • {selectedClass} • {months.find(m => m.id === selectedMonth)?.mr} • {weeks.find(w => w.id === selectedWeek)?.mr}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setSelectedWeek(null); setSelectedMonth(null); }}
                    className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                  >
                    Change Month
                  </button>
                  <button
                    onClick={() => { setSelectedWeek(null); setSelectedMonth(null); setSelectedClass(null); }}
                    className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                  >
                    Change Class
                  </button>
                </div>
              </div>

              {/* Upload Form (Centered) */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <div className="size-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black">
                    <Upload className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">Upload Teaching Diary</h2>
                    <p className="text-xs text-slate-500">{selectedClass} ({selectedMedium}) — {months.find(m => m.id === selectedMonth)?.mr} • {weeks.find(w => w.id === selectedWeek)?.mr}</p>
                  </div>
                </div>
                {/* SINGLE DATE FILE UPLOADER */}
                <div className="space-y-5">

                  <div className="relative border-2 border-dashed border-slate-200 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/20 rounded-2xl p-6 text-center cursor-pointer transition-all">
                    <input type="file" accept=".pdf, .doc, .docx" disabled={uploading} onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                    <div className="space-y-2">
                      <div className="size-12 rounded-2xl bg-white flex items-center justify-center text-indigo-600 mx-auto shadow-sm border border-slate-100">
                        <Upload className="size-6" />
                      </div>
                      {selectedFile ? (
                        <p className="text-xs font-extrabold text-slate-800">{selectedFile.name}</p>
                      ) : (
                        <p className="text-xs font-bold text-slate-600">Click or Drop File Here</p>
                      )}
                    </div>
                  </div>

                  {uploading && (
                    <div className="space-y-2 bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4">
                      <div className="flex justify-between items-center text-xs font-bold text-indigo-700">
                        <span className="animate-pulse">{uploadStatus}</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full transition-all duration-300 rounded-full" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={uploading || !selectedFile}
                    className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {uploading ? (
                      <><Loader2 className="size-4 animate-spin" /> Uploading...</>
                    ) : (
                      <><Sparkles className="size-4" /> Upload Teaching Diary</>
                    )}
                  </button>
                </div>
              </div>

              {/* List of Uploaded Diaries (Centered) */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <BookOpen className="size-4 text-indigo-600" />
                    Uploaded Records: {selectedClass} ({selectedMedium}) — {months.find(m => m.id === selectedMonth)?.mr} • {weeks.find(w => w.id === selectedWeek)?.mr}
                  </h3>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black">
                    Total {existingRecords.filter(rec => rec.diaryDate === "master_diary" || (rec.diaryDate.split("-")[1] === selectedMonth && getRecordWeek(rec) === selectedWeek)).length}
                  </span>
                </div>

                {loadingRecords ? (
                  <div className="flex items-center justify-center py-8 text-xs font-bold text-slate-400 gap-2">
                    <Loader2 className="size-4 animate-spin text-indigo-600" /> Loading records...
                  </div>
                ) : existingRecords.filter(rec => rec.diaryDate === "master_diary" || (rec.diaryDate.split("-")[1] === selectedMonth && getRecordWeek(rec) === selectedWeek)).length > 0 ? (
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                    {existingRecords
                      .filter(rec => rec.diaryDate === "master_diary" || (rec.diaryDate.split("-")[1] === selectedMonth && getRecordWeek(rec) === selectedWeek))
                      .map((rec) => {
                        const isWord = isWordDoc(rec.fileName || rec.pageUrl);
                        return (
                          <div
                            key={rec.id}
                            className="p-3.5 rounded-2xl border bg-slate-50 border-slate-200/60 hover:bg-slate-100 text-slate-700 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {isWord ? <FileText className="size-5 text-blue-600 shrink-0" /> : <FileCheck className="size-5 text-indigo-600 shrink-0" />}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-extrabold truncate">{rec.fileName}</p>
                                  {isWord && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black rounded uppercase">DOC</span>}
                                </div>
                                <p className="text-[10px] text-slate-500 font-semibold">
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
                                className="p-1.5 bg-white border border-slate-200 hover:bg-indigo-50 text-indigo-600 rounded-lg cursor-pointer"
                                title="View Record"
                              >
                                <Eye className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteRecord(rec);
                                }}
                                className="p-1.5 bg-white border border-slate-200 hover:bg-rose-50 text-rose-600 rounded-lg cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="size-3.5" />
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
            </motion.div>
          )}

          {/* Document Live Preview Modal Backdrop & Frame */}
          {isPreviewOpen && selectedRecordForPreview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
              <div className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-[96vw] border border-slate-100 flex flex-col h-[93vh]">
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

        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
