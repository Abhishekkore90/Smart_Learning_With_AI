import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import React, { useState, useEffect } from "react";
import {
  BookOpen,
  ChevronRight,
  Calendar,
  ArrowLeft,
  ArrowRight,
  FileText,
  Sparkles,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Layers,
  Eye,
  Upload,
  GraduationCap,
  User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { showToast as toast } from "@/lib/custom-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { PinGate } from "@/components/teacher/PinGate";
import { useAuth } from "@/hooks/use-auth";
import { useDiaryProcessing } from "@/contexts/DiaryProcessingContext";
import { useAuthenticatedPdf } from "@/lib/bunny-auth-pdf";
import { TeacherTodayDiary } from "@/components/teacher/TeacherTodayDiary";
import { DocumentLivePreview } from "@/components/DocumentLivePreview";
import { uploadFileWithProgress } from "@/lib/upload";

export const Route = createFileRoute("/teacher/teaching-record")({
  head: () => ({
    meta: [{ title: "Teaching Diary Report (टाचणवही अहवाल) — Reports" }],
  }),
  component: TeachingRecordPage,
});

const DIARY_CLASSES = [
  { id: "Class 1", badge: "1ST", mr: "इयत्ता पहिली" },
  { id: "Class 2", badge: "2ND", mr: "इयत्ता दुसरी" },
  { id: "Class 3", badge: "3RD", mr: "इयत्ता तिसरी" },
  { id: "Class 4", badge: "4TH", mr: "इयत्ता चौथी" },
  { id: "Class 5", badge: "5TH", mr: "इयत्ता पाचवी" },
  { id: "Class 6", badge: "6TH", mr: "इयत्ता सहावी" },
  { id: "Class 7", badge: "7TH", mr: "इयत्ता सातवी" },
  { id: "Class 8", badge: "8TH", mr: "इयत्ता आठवी" },
];

const MEDIUMS = [
  { id: "Marathi", badge: "म", title: "MARATHI", mr: "मराठी माध्यम" },
  { id: "Semi English", badge: "E", title: "SEMI ENGLISH", mr: "सेमी इंग्रजी" },
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
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { activeJobs } = useDiaryProcessing();

  const [activeMainTab, setActiveMainTab] = useState<"diary" | "school_profile">("diary");

  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedMedium, setSelectedMedium] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const handleBack = () => {
    if (selectedWeek) {
      setSelectedWeek(null);
    } else if (selectedMonth) {
      setSelectedMonth(null);
    } else if (selectedClass) {
      setSelectedClass(null);
    } else if (selectedMedium) {
      setSelectedMedium(null);
    } else {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        navigate({ to: "/teacher" });
      }
    }
  };

  const [schoolProfile, setSchoolProfile] = useState<{
    udiseCode: string;
    schoolName: string;
    teacherName: string;
    headmasterName: string;
    className: string;
    academicYear: string;
    isFilled?: boolean;
  }>({
    udiseCode: "",
    schoolName: "",
    teacherName: "",
    headmasterName: "",
    className: "Class 1",
    academicYear: "2026-27",
    isFilled: false,
  });

  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    const loadUserProfile = async () => {
      const userEmail = (user?.email || profile?.email || "").toLowerCase().trim();
      const userKey = userEmail ? `teaching_diary_school_profile_${userEmail}` : null;

      let loaded: any = null;

      // 1. Try loading user-specific profile from localStorage
      if (userKey) {
        const stored = localStorage.getItem(userKey);
        if (stored) {
          try {
            loaded = JSON.parse(stored);
          } catch (e) { }
        }
      }

      // 2. Try loading from Firestore if not found locally
      if (!loaded && userEmail) {
        try {
          const docRef = doc(db, "teacher_user_profiles", userEmail);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            loaded = docSnap.data();
            if (userKey) {
              localStorage.setItem(userKey, JSON.stringify(loaded));
            }
            localStorage.setItem("teaching_diary_school_profile", JSON.stringify(loaded));
          }
        } catch (e) {
          console.error("Error loading user profile from Firestore:", e);
        }
      }

      // 3. Fallback to generic localStorage ONLY if userEmail is not available
      if (!loaded && !userEmail) {
        const stored = localStorage.getItem("teaching_diary_school_profile");
        if (stored) {
          try {
            loaded = JSON.parse(stored);
          } catch (e) { }
        }
      }

      // Determine if user has previously filled their profile
      if (loaded && (loaded.isFilled || (loaded.udiseCode && loaded.schoolName && loaded.teacherName))) {
        const merged = { ...loaded, isFilled: true };
        setSchoolProfile((prev) => ({ ...prev, ...merged }));
        localStorage.setItem("teaching_diary_school_profile", JSON.stringify(merged));
        setActiveMainTab("diary");
      } else {
        // NEW USER or profile not yet filled!
        const defaultTeacherName = profile?.fullName || user?.displayName || "";
        const freshProfile = {
          udiseCode: "",
          schoolName: "",
          teacherName: defaultTeacherName,
          headmasterName: "",
          className: "Class 1",
          academicYear: "2026-27",
          isFilled: false,
        };
        setSchoolProfile(freshProfile);
        // Remove stale generic storage so old data (e.g. 1234) doesn't show in header pills
        localStorage.removeItem("teaching_diary_school_profile");
        // ALWAYS AUTO-OPEN INFO FILL TAB FOR NEW USER!
        setActiveMainTab("school_profile");
      }
    };

    loadUserProfile();
  }, [authLoading, user, profile]);

  const handleUdiseLookup = async (code: string) => {
    const cleanCode = code.trim();
    setSchoolProfile((prev) => ({ ...prev, udiseCode: cleanCode }));
    if (cleanCode.length >= 10) {
      try {
        const docRef = doc(db, "school_profiles", cleanCode);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSchoolProfile((prev) => ({
            ...prev,
            udiseCode: cleanCode,
            schoolName: data.schoolName || prev.schoolName,
            teacherName: data.teacherName || prev.teacherName,
            headmasterName: data.headmasterName || prev.headmasterName,
            className: data.className || prev.className,
            academicYear: data.academicYear || prev.academicYear,
          }));
          toast.success(`यू-डायस कोड ${cleanCode} साठी माहिती ऑटो-फेच झाली!`);
        }
      } catch (e) {
        console.error("UDISE lookup failed:", e);
      }
    }
  };

  const handleSaveSchoolProfile = async () => {
    setSavingProfile(true);
    try {
      const userEmail = (user?.email || profile?.email || "").toLowerCase().trim();
      const updatedProfile = {
        ...schoolProfile,
        isFilled: true,
        email: userEmail,
        updatedAt: Date.now(),
      };

      // 1. Save user-keyed local storage
      if (userEmail) {
        localStorage.setItem(`teaching_diary_school_profile_${userEmail}`, JSON.stringify(updatedProfile));
      }
      // 2. Save generic local storage
      localStorage.setItem("teaching_diary_school_profile", JSON.stringify(updatedProfile));

      // 3. Save to Firestore under user profile
      if (userEmail) {
        const userDocRef = doc(db, "teacher_user_profiles", userEmail);
        await setDoc(userDocRef, updatedProfile, { merge: true });
      }

      // 4. Save to Firestore under school_profiles (by UDISE code)
      if (schoolProfile.udiseCode?.trim()) {
        const cleanCode = schoolProfile.udiseCode.trim();
        const docRef = doc(db, "school_profiles", cleanCode);
        await setDoc(
          docRef,
          {
            udiseCode: cleanCode,
            schoolName: schoolProfile.schoolName,
            teacherName: schoolProfile.teacherName,
            headmasterName: schoolProfile.headmasterName,
            className: schoolProfile.className,
            academicYear: schoolProfile.academicYear,
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      }

      setSchoolProfile(updatedProfile);
      toast.success("शाळेची व शिक्षकांची माहिती यशस्वीरित्या जतन केली!");
      setActiveMainTab("diary");
    } catch (err: any) {
      console.error("Error saving profile:", err);
      toast.error("माहिती सेव्ह करण्यात अडचण आली.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Upload States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>("");

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

  const [diaryRecords, setDiaryRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedRecordForPreview, setSelectedRecordForPreview] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { pdfBlobUrl: authenticatedPreviewUrl, loading: loadingPreview } = useAuthenticatedPdf(selectedRecordForPreview?.pageUrl || null);

  // Fetch record whenever Class or Medium changes
  useEffect(() => {
    if (selectedClass && selectedMedium) {
      fetchDiaryRecords(selectedClass, selectedMedium);
    }
  }, [selectedClass, selectedMedium]);

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

  const fetchDiaryRecords = async (cls: string, med: string) => {
    setLoading(true);
    setError(null);
    try {
      const collectionRef = collection(db, "teacher_diaries", cls, med);
      const querySnapshot = await getDocs(collectionRef);

      const uniqueMap = new Map<string, any>();

      querySnapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const rawUrl = data.pageUrl || data.masterPdfUrl || data.pageURL || "";
        const sanitizedUrl = rawUrl.replace(/vz-7a00d099-4a8\.b-cdn\.net/g, "sgkbrainova.b-cdn.net");
        const dateKey = data.diaryDate || docSnap.id;

        // Skip Sunday records
        if (dateKey) {
          const parts = dateKey.split("-");
          if (parts.length === 3) {
            const dObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            if (!isNaN(dObj.getTime()) && dObj.getDay() === 0) return;
          }
        }
        if (data.day === "रविवार" || data.day?.toLowerCase() === "sunday") return;

        const groupKey = sanitizedUrl ? sanitizedUrl.split("?")[0] : (data.fileName || docSnap.id);

        if (!uniqueMap.has(groupKey)) {
          uniqueMap.set(groupKey, {
            id: docSnap.id,
            diaryDate: dateKey,
            pageNumber: data.pageNumber || 1,
            pageUrl: sanitizedUrl,
            fileName: data.fileName || "Teaching_Diary.docx",
            uploadedAt: data.uploadedAt || 0,
            ...data,
          });
        } else {
          const existing = uniqueMap.get(groupKey)!;
          if (!existing.structuredData && data.structuredData) {
            existing.structuredData = data.structuredData;
          }
          if ((data.uploadedAt || 0) > (existing.uploadedAt || 0)) {
            existing.uploadedAt = data.uploadedAt;
          }
        }
      });

      const allDocs = Array.from(uniqueMap.values());
      allDocs.sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0));
      setDiaryRecords(allDocs);
    } catch (err: any) {
      console.error("Error loading teaching diary record:", err);
      setError("Failed to load teaching diary record.");
      setDiaryRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const monthFilteredRecords = React.useMemo(() => {
    if (!selectedMonth) return diaryRecords;
    return diaryRecords.filter((rec) => {
      if (rec.diaryDate === "master_diary") return true;
      if (rec.month && String(rec.month).padStart(2, "0") === selectedMonth) return true;
      if (rec.selectedMonth && String(rec.selectedMonth).padStart(2, "0") === selectedMonth) return true;
      if (rec.diaryDate && typeof rec.diaryDate === "string") {
        const parts = rec.diaryDate.split("-");
        if (parts.length === 3 && parts[1] === selectedMonth) return true;
      }
      if (rec.structuredData && Array.isArray(rec.structuredData)) {
        const hasMatchingMonth = rec.structuredData.some((entry: any) => {
          const d = entry.date || entry.displayDate || "";
          if (!d) return false;
          const clean = String(d).trim();
          let m = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
          if (m) return String(m[2]).padStart(2, "0") === selectedMonth;
          m = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
          if (m) return String(m[2]).padStart(2, "0") === selectedMonth;
          return false;
        });
        if (hasMatchingMonth) return true;
      }
      return false;
    });
  }, [diaryRecords, selectedMonth]);

  const isWordDoc = (filename?: string | null) => {
    if (!filename) return false;
    const lower = filename.toLowerCase();
    return lower.endsWith(".doc") || lower.endsWith(".docx") || lower.includes(".doc?") || lower.includes(".docx?");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("FILE_SELECTED: ", file.name, "size:", file.size);
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext && ["pdf", "doc", "docx", "xlsx", "xls", "csv"].includes(ext)) {
        setSelectedFile(file);
        toast.success(`Selected File: ${file.name}`);
      } else {
        toast.error("Invalid file format. Please select PDF, Word, or Excel file.");
        e.target.value = "";
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a Teaching Diary file first.");
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
      setUploadStatus("Parsing multi-day diary file...");
      setUploadProgress(90);

      // Parse multi-day diary entries from file
      let parsedEntries: any[] | null = null;
      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const { parseDiaryFileFromArrayBuffer } = await import("@/lib/parse-diary-file");
        parsedEntries = await parseDiaryFileFromArrayBuffer(arrayBuffer, selectedFile.name, selectedClass);
      } catch (pErr) {
        console.warn("Client multi-day parse note:", pErr);
      }

      setUploadStatus("Saving date records (1-12) to database...");
      setUploadProgress(95);

      const { saveParsedEntriesToFirestore } = await import("@/lib/parse-diary-file");
      const savedDates = await saveParsedEntriesToFirestore({
        entries: parsedEntries,
        fileUrl,
        fileName: selectedFile.name,
        selectedClass,
        selectedMedium,
        selectedYear: String(selectedYear),
        selectedMonth,
        selectedWeek,
      });

      console.log("DATABASE_SAVE_COMPLETED: Saved records for dates:", savedDates);
      setUploadProgress(100);
      setUploadStatus("Upload completed!");

      toast.success(`✅ ${savedDates.length} दिवसांच्या टाचण नोंदी यशस्वीरित्या सेव्ह झाल्या! (Uploaded ${savedDates.length} date records)`);

      setSelectedFile(null);
      await fetchDiaryRecords(selectedClass, selectedMedium);
    } catch (err: any) {
      console.error("UPLOAD_ERROR:", err);
      setUploadStatus("Upload failed: " + (err.message || "Unknown error"));
      toast.error(err.message || "Failed to upload Teaching Diary file.");
    } finally {
      setUploading(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-50">
      <div className="print:hidden">
        <TeacherHeader />
        <TeacherSidebar />
      </div>

      <main className="w-full pt-16 min-h-screen print:pl-0 print:pt-0 pb-24">
        <PinGate sectionKey="teaching_record">
          <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto w-full space-y-6 print:p-0 print:max-w-full">
            {/* Top Navigation Bar with Back Button, Tabs & Breadcrumbs */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 shadow-sm print:hidden">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <ArrowLeft className="size-4 shrink-0" />
                  <span>मागे जा (Back)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMainTab("diary")}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${activeMainTab === "diary"
                      ? "bg-slate-900 text-white shadow-md"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                >
                  <BookOpen className="size-4" />
                  <span>दैनिक टाचणवही</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMainTab("school_profile")}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${activeMainTab === "school_profile"
                      ? "bg-orange-600 text-white shadow-md shadow-orange-500/20"
                      : "bg-orange-100 text-orange-900 hover:bg-orange-200 border border-orange-300"
                    }`}
                >
                  <GraduationCap className="size-4 text-amber-500" />
                  <span>🏫 यू-डायस व शाळा माहिती (UDISE & School Info)</span>
                </button>

                {monthFilteredRecords.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRecordForPreview(monthFilteredRecords[0]);
                      setIsPreviewOpen(true);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <FileText className="size-4" />
                    <span>All Days PDF</span>
                  </button>
                ) : selectedMonth ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRecordForPreview(null);
                      setIsPreviewOpen(true);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-slate-400 to-slate-500 hover:from-slate-500 hover:to-slate-600 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <FileText className="size-4" />
                    <span>All Days PDF</span>
                  </button>
                ) : null}
              </div>

              {/* Dynamic Breadcrumbs & Saved profile status badge */}
              <div className="flex flex-wrap items-center gap-3">
                {(schoolProfile.schoolName || schoolProfile.udiseCode) && (
                  <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200">
                    {schoolProfile.udiseCode && (
                      <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-black">
                        UDISE: {schoolProfile.udiseCode}
                      </span>
                    )}
                    {schoolProfile.schoolName && <span className="text-orange-600 font-extrabold">{schoolProfile.schoolName}</span>}
                    <span>•</span>
                    <span>इयत्ता: <strong className="text-slate-900">{schoolProfile.className}</strong></span>
                    <span>•</span>
                    <span>सन: <strong className="text-emerald-600 font-black">{schoolProfile.academicYear || "2026-27"}</strong></span>
                  </div>
                )}
                {selectedMedium && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-600">
                    <span className="text-orange-600 font-extrabold">{selectedMedium === "Marathi" ? "मराठी माध्यम" : "सेमी इंग्रजी"}</span>
                    {selectedClass && (
                      <>
                        <ChevronRight className="size-3 text-slate-400" />
                        <span className="text-orange-600 font-extrabold">{selectedClass}</span>
                      </>
                    )}
                    {selectedMonth && (
                      <>
                        <ChevronRight className="size-3 text-slate-400" />
                        <span className="text-pink-600 font-extrabold">{months.find(m => m.id === selectedMonth)?.mr}</span>
                      </>
                    )}
                    {selectedWeek && (
                      <>
                        <ChevronRight className="size-3 text-slate-400" />
                        <span className="text-indigo-600 font-extrabold">{weeks.find(w => w.id === selectedWeek)?.mr}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {activeMainTab === "school_profile" ? (
                <motion.div
                  key="school-profile-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm max-w-3xl mx-auto space-y-6"
                >
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="size-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 font-black border border-orange-100">
                      <GraduationCap className="size-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">शाळेची माहिती (School Details)</h2>
                      <p className="text-xs text-slate-500 font-medium">ही माहिती सेव्ह केल्यावर दैनिक व आठवड्याच्या पाठ टाचणमध्ये आपोआप दिसेल.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* यू-डायस कोड (UDISE Code) */}
                    <div className="space-y-1.5 md:col-span-2 bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-2xl border border-orange-200/80">
                      <label className="text-xs font-black text-slate-800 flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-orange-600 text-white rounded text-[10px] font-black uppercase tracking-wider">UDISE</span>
                        <span>यू-डायस कोड (UDISE Code)</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={11}
                        value={schoolProfile.udiseCode}
                        onChange={(e) => handleUdiseLookup(e.target.value)}
                        placeholder="उदा. 27250100101 (11 अंकी यू-डायस कोड)"
                        className="w-full px-4 py-3 rounded-2xl border border-orange-300 text-sm font-extrabold focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white text-slate-900"
                      />
                      <p className="text-[11px] text-orange-800 font-bold">
                        💡 यू-डायस कोड भरताच आधी साठवलेली शाळेची माहिती ऑटोमॅटिक फेच होईल.
                      </p>
                    </div>

                    {/* शाळेचे नाव */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-black text-slate-700 flex items-center gap-1">
                        <span>शाळेचे नाव (School Name)</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={schoolProfile.schoolName}
                        onChange={(e) => setSchoolProfile({ ...schoolProfile, schoolName: e.target.value })}
                        placeholder="उदा. जि. प. प्राथमिक शाळा..."
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-slate-50/50"
                      />
                    </div>

                    {/* वर्गशिक्षकाचे नाव */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 flex items-center gap-1">
                        <span>वर्गशिक्षकाचे नाव (Class Teacher)</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={schoolProfile.teacherName}
                        onChange={(e) => setSchoolProfile({ ...schoolProfile, teacherName: e.target.value })}
                        placeholder="उदा. श्री. नामदेव शिंदे..."
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-slate-50/50"
                      />
                    </div>

                    {/* मुख्याध्यापकांचे नाव */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 flex items-center gap-1">
                        <span>मुख्याध्यापकांचे नाव (Headmaster Name)</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={schoolProfile.headmasterName}
                        onChange={(e) => setSchoolProfile({ ...schoolProfile, headmasterName: e.target.value })}
                        placeholder="उदा. श्री. राजू पाटील..."
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-slate-50/50"
                      />
                    </div>

                    {/* इयत्ता / वर्ग */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 flex items-center gap-1">
                        <span>इयत्ता / वर्ग (Class)</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={schoolProfile.className}
                        onChange={(e) => setSchoolProfile({ ...schoolProfile, className: e.target.value })}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-slate-50/50 cursor-pointer"
                      >
                        {DIARY_CLASSES.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.mr} ({cls.id})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* शैक्षणिक वर्ष (Academic Year) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 flex items-center gap-1">
                        <span>शैक्षणिक वर्ष (Academic Year)</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={schoolProfile.academicYear}
                        onChange={(e) => setSchoolProfile({ ...schoolProfile, academicYear: e.target.value })}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-slate-50/50 text-emerald-700 cursor-pointer"
                      >
                        <option value="2025-26">2025-26</option>
                        <option value="2026-27">2026-27 (Default)</option>
                        <option value="2027-28">2027-28</option>
                        <option value="2028-29">2028-29</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleSaveSchoolProfile}
                      disabled={savingProfile}
                      className="px-8 py-3.5 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white rounded-2xl font-black text-sm shadow-md shadow-orange-500/20 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      {savingProfile ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                      <span>माहिती जतन करा (Save Details)</span>
                    </button>
                  </div>
                </motion.div>
              ) : (
                <>

                  {/* Step 1: Select Medium (Orange Cards) */}
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
                              Select Medium, Class, and Date to upload or view official Teaching Diaries.
                            </p>
                          </div>
                          <div className="shrink-0 flex items-center justify-center size-16 md:size-20 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 shadow-inner">
                            <BookOpen className="size-8 md:size-10 text-indigo-400" />
                          </div>
                        </div>
                      </div>

                      <div className="text-center space-y-2 pt-2">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight italic">Select Medium / माध्यम निवडा</h2>
                        <p className="text-xs font-bold text-slate-500">
                          वार्षिक व मासिक नियोजनासाठी प्रथम माध्यम निवडा (मराठी किंवा सेमी-इंग्रजी)
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto w-full">
                        {MEDIUMS.map((med) => (
                          <motion.button
                            key={med.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedMedium(med.id)}
                            className="group relative p-8 rounded-[2.5rem] border text-left transition-all duration-500 shadow-lg hover:shadow-2xl cursor-pointer overflow-hidden bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 text-white border-orange-500/30"
                          >
                            <div className="absolute -right-8 -top-8 size-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
                            <div className="relative z-10 flex items-start gap-5">
                              <div className="size-14 rounded-2xl flex items-center justify-center border border-white/20 bg-white/15 backdrop-blur-sm group-hover:scale-110 transition-transform text-white font-black text-xl shrink-0">
                                {med.badge}
                              </div>
                              <div className="space-y-2">
                                <h4 className="font-black text-xl text-white">{med.mr}</h4>
                                <p className="text-[10px] font-black uppercase tracking-widest text-orange-200">{med.title}</p>
                                <p className="text-xs text-white/80 font-semibold flex items-center gap-1 mt-2">
                                  इयत्ता निवडण्यासाठी पुढे या <ArrowRight className="size-3.5" />
                                </p>
                              </div>
                            </div>
                            <div className="absolute top-4 right-5">
                              <span className="px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full text-[10px] font-black tracking-wider text-white">
                                {med.title}
                              </span>
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
                      <div className="text-center space-y-2 pt-2">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight italic">Select Class / इयत्ता निवडा</h2>
                        <p className="text-xs font-bold text-slate-500">
                          निवडलेले माध्यम: <span className="text-orange-600 font-black">{selectedMedium === "Marathi" ? "मराठी माध्यम" : "सेमी इंग्रजी"}</span>
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 max-w-5xl mx-auto w-full">
                        {DIARY_CLASSES.map((cls) => (
                          <motion.button
                            key={cls.id}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setSelectedClass(cls.id)}
                            className="group relative p-7 rounded-[2rem] border text-center transition-all duration-500 shadow-md hover:shadow-xl cursor-pointer overflow-hidden bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 text-white border-orange-500/30 flex flex-col items-center gap-3"
                          >
                            <div className="size-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform">
                              <GraduationCap className="size-6 text-white" />
                            </div>
                            <div className="space-y-1">
                              <h3 className="text-lg font-black leading-tight tracking-tight">{cls.mr}</h3>
                              <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider">{cls.id}</p>
                            </div>
                          </motion.button>
                        ))}
                      </div>

                      <div className="flex justify-center pt-2">
                        <button
                          onClick={() => setSelectedMedium(null)}
                          className="flex items-center gap-2 px-5 py-2.5 text-orange-600 hover:text-orange-900 bg-white hover:bg-orange-50 border border-orange-200 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                        >
                          <ArrowLeft className="size-4" /> मागे या (Back to Class)
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Select Month */}
                  {selectedMedium && selectedClass && selectedYear && !selectedMonth && (
                    <motion.div
                      key="month-selection"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="space-y-8"
                    >
                      <div className="text-center space-y-2 pt-2">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight italic">Select Month / महिना निवडा</h2>
                        <p className="text-xs font-bold text-slate-500">
                          निवडलेले माध्यम: <span className="text-orange-600 font-black">{selectedMedium === "Marathi" ? "मराठी माध्यम" : "सेमी इंग्रजी"}</span> • इयत्ता: <span className="text-purple-600 font-black">{selectedClass}</span> • वर्ष: <span className="text-teal-600 font-black">{selectedYear}</span>
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
                              setSelectedWeek("Week 1");
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
                          className="flex items-center gap-2 px-5 py-2.5 text-orange-600 hover:text-orange-900 bg-white hover:bg-orange-50 border border-orange-200 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                        >
                          <ArrowLeft className="size-4" /> मागे या (Back to Class)
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 5: Main View */}
                  {selectedClass && selectedMedium && selectedYear && selectedMonth && (
                    <motion.div
                      key="diary-content"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="max-w-5xl mx-auto w-full space-y-6"
                    >
                      <TeacherTodayDiary
                        selectedClass={selectedClass}
                        selectedMedium={selectedMedium}
                        selectedMonth={selectedMonth}
                        onBack={handleBack}
                        schoolProfile={schoolProfile}
                      />
                    </motion.div>
                  )}
                </>
              )}
            </AnimatePresence>

            {/* Document Live Preview Modal Backdrop & Frame */}
            {isPreviewOpen && selectedRecordForPreview && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
                <div className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-[96vw] border border-slate-100 flex flex-col h-[93vh]">
                  {/* Modal Body with single unified navbar */}
                  <div className="flex-1 overflow-hidden bg-slate-100 p-2 sm:p-4">
                    <DocumentLivePreview
                      selectedFile={null}
                      savedRecord={selectedRecordForPreview}
                      authenticatedPdfUrl={authenticatedPreviewUrl}
                      loadingPdf={loadingPreview}
                      schoolProfile={schoolProfile}
                      onBack={() => {
                        setIsPreviewOpen(false);
                        setSelectedRecordForPreview(null);
                      }}
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
