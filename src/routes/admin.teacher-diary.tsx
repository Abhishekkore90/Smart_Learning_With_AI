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
  ArrowRight,
} from "lucide-react";
import { collection, doc, setDoc, getDocs, deleteDoc, writeBatch } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, deleteObject } from "firebase/storage";
import { uploadFileWithProgress } from "@/lib/upload";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { showToast as toast } from "@/lib/custom-toast";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { splitPdf } from "@/lib/pdf-splitter";
import { useDiaryProcessing } from "@/contexts/DiaryProcessingContext";
import { useAuthenticatedPdf } from "@/lib/bunny-auth-pdf";
import { convertDocxToPdf, convertExcelToPdf, convertDocToPdf } from "@/lib/file-converter";

export const Route = createFileRoute("/admin/teacher-diary")({
  head: () => ({ meta: [{ title: "Teacher Diary Redesigned — Super Admin" }] }),
  component: TeacherDiaryAdmin,
});

interface ExistingDiaryInfo {
  exists: boolean;
  totalPages: number;
  startDateStr: string;
  endDateStr: string;
  uploadedAt: number;
}

function TeacherDiaryAdmin() {
  const navigate = useNavigate();
  const { activeJobs, failedJobs, retryJob } = useDiaryProcessing();

  // Selected state with localStorage persistence
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    return localStorage.getItem("admin_diary_class") || "Class 1";
  });
  const [selectedMedium, setSelectedMedium] = useState<string>(() => {
    return localStorage.getItem("admin_diary_medium") || "Marathi";
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);

  const activeJob = activeJobs[`${selectedClass}_${selectedMedium}`];
  const failedJob = failedJobs[`${selectedClass}_${selectedMedium}`];
  const isJobProcessing = activeJob && activeJob.status !== "completed" && activeJob.status !== "failed";
  const [prevJobWasProcessing, setPrevJobWasProcessing] = useState(false);
  const [docHtmlPreview, setDocHtmlPreview] = useState<string | null>(null);

  // Fetch the authenticated PDF preview URL to display in the iframe
  const [existingPreviewUrl, setExistingPreviewUrl] = useState<string | null>(null);
  const { pdfBlobUrl: authenticatedPreviewUrl, loading: loadingPreview } = useAuthenticatedPdf(existingPreviewUrl);

  // Sync selections to localStorage
  useEffect(() => {
    if (selectedClass) localStorage.setItem("admin_diary_class", selectedClass);
    if (selectedMedium) localStorage.setItem("admin_diary_medium", selectedMedium);
  }, [selectedClass, selectedMedium]);

  // Upload/Processing state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [totalPages, setTotalPages] = useState<number>(0);
  const [lastUploadedDate, setLastUploadedDate] = useState<string>("");

  // Existing diary check
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [existingDiary, setExistingDiary] = useState<ExistingDiaryInfo>({
    exists: false,
    totalPages: 0,
    startDateStr: "",
    endDateStr: "",
    uploadedAt: 0,
  });

  const classes = [
    { id: "Class 1", badge: "1ST", mr: "इयत्ता पहिली", color: "from-blue-500 to-indigo-600" },
    { id: "Class 2", badge: "2ND", mr: "इयत्ता दुसरी", color: "from-purple-500 to-indigo-600" },
    { id: "Class 3", badge: "3RD", mr: "इयत्ता तिसरी", color: "from-pink-500 to-rose-600" },
    { id: "Class 4", badge: "4TH", mr: "इयत्ता चौथी", color: "from-amber-500 to-orange-600" },
    { id: "Class 5", badge: "5TH", mr: "इयत्ता पाचवी", color: "from-emerald-500 to-teal-600" },
    { id: "Class 6", badge: "6TH", mr: "इयत्ता सहावी", color: "from-cyan-500 to-blue-600" },
    { id: "Class 7", badge: "7TH", mr: "इयत्ता सातवी", color: "from-indigo-500 to-violet-600" },
    { id: "Class 8", badge: "8TH", mr: "इयत्ता आठवी", color: "from-slate-600 to-slate-800" },
  ];

  const mediums = ["Marathi", "Semi English"];

  useEffect(() => {
    const isAdmin = sessionStorage.getItem("is_super_admin");
    if (!isAdmin) {
      navigate({
        to: "/login",
        search: { redirect: "/admin/teacher-diary", role: "admin" } as any,
      });
      return;
    }
  }, [navigate]);

  const [existingDocs, setExistingDocs] = useState<any[]>([]);

  // Check for existing diary when selections change, or when a background job starts/completes
  useEffect(() => {
    if (selectedClass && selectedMedium) {
      fetchExistingDiaryInfo(selectedClass, selectedMedium);
    }
  }, [selectedClass, selectedMedium]);

  // Auto-refresh when background processing finishes
  useEffect(() => {
    if (isJobProcessing) {
      setPrevJobWasProcessing(true);
    } else if (prevJobWasProcessing && !isJobProcessing) {
      setPrevJobWasProcessing(false);
      if (selectedClass && selectedMedium) {
        fetchExistingDiaryInfo(selectedClass, selectedMedium);
      }
    }
  }, [isJobProcessing, prevJobWasProcessing, selectedClass, selectedMedium]);

  // Update PDF preview whenever date selected in Admin panel changes
  useEffect(() => {
    if (startDate && existingDocs.length > 0) {
      const targetDateStr = format(startDate, "yyyy-MM-dd");
      const matched = existingDocs.find(
        (d) => d.id === targetDateStr || d.diaryDate === targetDateStr
      );
      if (matched) {
        const rawUrl = matched.pageUrl || matched.pageURL || "";
        const sanitizedUrl = rawUrl.replace(/vz-7a00d099-4a8\.b-cdn\.net/g, "sgkbrainova.b-cdn.net");
        setExistingPreviewUrl(sanitizedUrl || null);
      }
    }
  }, [startDate, existingDocs]);

  const fetchExistingDiaryInfo = async (cls: string, med: string) => {
    setCheckingExisting(true);
    try {
      const collectionRef = collection(db, "teacher_diaries", cls, med);
      const snapshot = await getDocs(collectionRef);
      if (!snapshot.empty) {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as any[];

        // Sort by page number to find order
        docs.sort((a, b) => a.pageNumber - b.pageNumber);
        setExistingDocs(docs);

        const total = docs.length;
        const startD = docs[0].id; // document ID is date YYYY-MM-DD
        const endD = docs[total - 1].id;
        const uploaded = docs[0].timestamp || 0;

        // Auto pre-fill Start Date from existing diary
        const parts = startD.split("-");
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          setStartDate(new Date(year, month, day));
        }

        const rawUrl = docs[0]?.pageUrl || docs[0]?.pageURL || "";
        const sanitizedUrl = rawUrl.replace(/vz-7a00d099-4a8\.b-cdn\.net/g, "sgkbrainova.b-cdn.net");
        setExistingPreviewUrl(sanitizedUrl || null);

        setExistingDiary({
          exists: true,
          totalPages: total,
          startDateStr: startD,
          endDateStr: endD,
          uploadedAt: uploaded,
        });
      } else {
        setExistingDocs([]);
        setExistingPreviewUrl(null);
        setExistingDiary({
          exists: false,
          totalPages: 0,
          startDateStr: "",
          endDateStr: "",
          uploadedAt: 0,
        });
      }
    } catch (err) {
      console.error("Error fetching existing diary:", err);
    } finally {
      setCheckingExisting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      
      if (ext === "pdf") {
        setSelectedFile(file);
        setDocHtmlPreview(null);
        if (localPreviewUrl && localPreviewUrl !== "doc-html-preview") URL.revokeObjectURL(localPreviewUrl);
        setLocalPreviewUrl(URL.createObjectURL(file));
      } else if (ext === "docx" || ext === "doc" || ext === "xlsx" || ext === "xls") {
        setSelectedFile(file);
        if (localPreviewUrl && localPreviewUrl !== "doc-html-preview") URL.revokeObjectURL(localPreviewUrl);
        
        setUploading(true);
        setUploadStatus("Rendering document preview...");

        try {
          const arrayBuffer = await file.arrayBuffer();

          if (ext === "docx" || ext === "doc") {
            // Convert Word to HTML using mammoth for direct visual preview
            const mammoth = await import("mammoth");
            const result = await mammoth.convertToHtml({ arrayBuffer });
            if (result.value && result.value.trim().length > 0) {
              setDocHtmlPreview(result.value);
              setLocalPreviewUrl("doc-html-preview");
              toast.success("Document preview loaded!");
            } else {
              // Fallback: show file info card
              setDocHtmlPreview(`<div style="text-align:center;padding:40px;"><h3>📄 ${file.name}</h3><p>Size: ${(file.size / 1024 / 1024).toFixed(2)} MB</p><p style="color:#888;">This .doc file cannot be previewed directly. It will be processed after upload.</p></div>`);
              setLocalPreviewUrl("doc-html-preview");
              toast.info("File selected. Preview not available for this format, but upload will work.");
            }
          } else {
            // Excel: Convert to HTML table using SheetJS
            const XLSX = await import("xlsx");
            const workbook = XLSX.read(arrayBuffer, { type: "array" });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const htmlTable = XLSX.utils.sheet_to_html(firstSheet, { editable: false });
            setDocHtmlPreview(htmlTable);
            setLocalPreviewUrl("doc-html-preview");
            toast.success("Excel preview loaded!");
          }
        } catch (err: any) {
          console.error("Error rendering preview:", err);
          // Show file info as fallback
          setDocHtmlPreview(`<div style="text-align:center;padding:40px;"><h3>📄 ${file.name}</h3><p>Size: ${(file.size / 1024 / 1024).toFixed(2)} MB</p><p style="color:#888;">Preview could not be generated, but the file can still be uploaded.</p></div>`);
          setLocalPreviewUrl("doc-html-preview");
        } finally {
          setUploading(false);
          setUploadStatus("");
        }
      } else {
        toast.error("Unsupported file type. Please upload PDF, Word (.docx, .doc) or Excel (.xlsx, .xls) files.");
      }
    }
  };

  const deleteExistingDiary = async (cls: string, med: string) => {
    try {
      const collectionRef = collection(db, "teacher_diaries", cls, med);
      const snapshot = await getDocs(collectionRef);
      if (snapshot.empty) return;

      // 1. Delete Firestore docs instantly in a single Write Batch commit (~50ms)
      const batch = writeBatch(db);
      snapshot.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();

      // 2. Non-blocking asynchronous storage cleanup (fire & forget, never hangs UI)
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.storagePath && storage) {
          try {
            const fileRef = ref(storage, data.storagePath);
            deleteObject(fileRef).catch(() => {});
          } catch (e) {}
        }
      });
    } catch (err) {
      console.warn("Fast clear warning:", err);
    }
  };

  const handleDeleteDiary = async () => {
    if (!confirm(`Are you sure you want to delete the diary for ${selectedClass} (${selectedMedium})? This action is permanent.`)) {
      return;
    }
    setUploading(true);
    setUploadStatus("Deleting diary...");
    try {
      await deleteExistingDiary(selectedClass, selectedMedium);
      toast.success("Diary deleted successfully.");
      await fetchExistingDiaryInfo(selectedClass, selectedMedium);
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error(err.message || "Failed to delete diary.");
    } finally {
      setUploading(false);
      setUploadStatus("");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a Teaching Diary PDF file.");
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    setUploadStatus("Uploading Original PDF...");

    try {
      // Default start date if admin didn't select one
      const effectiveStartDate = startDate || new Date(2026, 6, 1);

      // Upload the single master Teaching Diary PDF file directly to Bunny Storage
      const result = await uploadFileWithProgress(selectedFile, {
        folderPath: `teacher-diaries/${selectedClass.toLowerCase().replace(/\s+/g, "-")}/${selectedMedium.toLowerCase().replace(/\s+/g, "-")}`,
        maxSizeBytes: 50 * 1024 * 1024,
        preferredProvider: "bunny",
        onProgress: (pct) => {
          setUploadProgress(10 + Math.round(pct * 0.90));
        },
      });
      
      const masterPdfUrl = result.url;

      // 1. Wipe out any old split/corrupted Firestore documents for this class and medium
      await deleteExistingDiary(selectedClass, selectedMedium);

      // 2. Save directly to Firestore teacher_diaries as master_diary (no splitting needed!)
      const diaryDocRef = doc(db, "teacher_diaries", selectedClass, selectedMedium, "master_diary");
      await setDoc(diaryDocRef, {
        pageUrl: masterPdfUrl,
        masterPdfUrl: masterPdfUrl,
        fileName: selectedFile.name,
        uploadedAt: Date.now(),
        startDate: format(effectiveStartDate, "yyyy-MM-dd"),
        className: selectedClass,
        medium: selectedMedium,
        pageNumber: 1,
      });

      toast.success("Document uploaded successfully! Direct preview available on teacher dashboard.");

      setUploadProgress(100);
      setUploadStatus("Upload complete!");
      await fetchExistingDiaryInfo(selectedClass, selectedMedium);
      
      // Clean up selected file state
      setSelectedFile(null);
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);

    } catch (err: any) {
      console.error("Upload initialization error:", err);
      setUploadStatus("Error");
      toast.error(err.message || "Failed to upload diary PDF.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#1F2937] font-sans antialiased">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24">
        {/* Breadcrumb & Title */}
        <div className="mb-10 space-y-4">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-indigo-600 uppercase tracking-wider transition-colors"
          >
            <ChevronLeft className="size-4" /> Back to Dashboard
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
                Teacher Diary <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Redesign.</span>
              </h1>
              <p className="text-gray-500 font-medium text-sm">
                Split and map multi-page teaching diaries into individual page dates in Firestore automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Two Column Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column - 5 Step Form & Status */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* The 5-Step Control Panel */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8">
              <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
                <Layers className="size-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-gray-900">Upload Control Flow</h2>
              </div>

              {/* Step 1: Select Medium */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center size-5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-black">1</span>
                  <label className="text-xs font-extrabold text-gray-600 uppercase tracking-wider">Select Medium</label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {mediums.map((med) => (
                    <button
                      key={med}
                      type="button"
                      disabled={uploading}
                      onClick={() => setSelectedMedium(med)}
                      className={`py-3 px-6 rounded-xl text-sm font-bold border transition-all text-center ${
                        selectedMedium === med
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {med}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Select Class */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center size-5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-black">2</span>
                  <label className="text-xs font-extrabold text-gray-600 uppercase tracking-wider">Select Class</label>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {classes.map((cls) => (
                    <button
                      key={cls.id}
                      type="button"
                      disabled={uploading}
                      onClick={() => setSelectedClass(cls.id)}
                      className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all text-center ${
                        selectedClass === cls.id
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {cls.id}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Upload Diary */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center size-5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-black">3</span>
                  <label className="text-xs font-extrabold text-gray-600 uppercase tracking-wider">Upload Teaching Diary (PDF, Word or Excel)</label>
                </div>
                
                <div className="relative border-2 border-dashed border-gray-200 hover:border-indigo-500 bg-gray-50 hover:bg-indigo-50/20 rounded-2xl p-6 text-center cursor-pointer transition-all">
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.xlsx,.xls"
                    disabled={uploading}
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="space-y-2">
                    <div className="size-10 rounded-full bg-white flex items-center justify-center text-gray-400 mx-auto shadow-sm">
                      <Upload className="size-5" />
                    </div>
                    {selectedFile ? (
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-gray-800">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-gray-700">Click or drag file here</p>
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                          PDF, Word (.docx) or Excel (.xlsx) files
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 4: Start Date (Optional) */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center justify-between">
                  <span>4. Select Start Date (Optional)</span>
                  <span className="text-[10px] text-gray-400 font-normal">Defaults to Academic Year Start if left blank</span>
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      disabled={uploading}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100/80 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors cursor-pointer"
                    >
                      <span>
                        {startDate ? format(startDate, "dd/MM/yyyy") : "Auto / Select Start Date..."}
                      </span>
                      <Calendar className="size-4 text-gray-400" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50 bg-white shadow-xl rounded-2xl border border-gray-100" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Step 5: Upload / Actions Button */}
              <div className="pt-4 border-t border-gray-100 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={uploading || !selectedFile}
                    className="flex-1 py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-100 disabled:to-gray-100 disabled:text-gray-400 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-100 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {uploading && uploadStatus.includes("Uploading") ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Uploading... ({uploadProgress}%)</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        <span>
                          {existingDiary.exists ? "Replace / Upload New Version" : "Upload & Auto-Split"}
                        </span>
                      </>
                    )}
                  </button>

                  {existingDiary.exists && !uploading && (
                    <button
                      type="button"
                      onClick={handleDeleteDiary}
                      className="py-3.5 px-6 border border-red-200 bg-red-50/50 hover:bg-red-50 text-red-600 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="size-4" />
                      <span>Delete Current Diary</span>
                    </button>
                  )}
                </div>

                {/* Real-time upload progress details */}
                {(uploading || activeJob) && (
                  <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold text-indigo-700">
                      <span className="animate-pulse">
                        {activeJob ? `Background Job: ${activeJob.status.replace("_", " ").toUpperCase()}` : uploadStatus}
                      </span>
                      <span>
                        {activeJob ? Math.round((activeJob.processedPages / (activeJob.totalPages || 1)) * 100) : uploadProgress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${activeJob ? Math.round((activeJob.processedPages / (activeJob.totalPages || 1)) * 100) : uploadProgress}%` }}
                      />
                    </div>
                    {(totalPages > 0 || (activeJob && activeJob.totalPages > 0)) && (
                      <div className="flex justify-between text-[10px] font-black text-indigo-500 uppercase tracking-wider">
                        <span>Total Pages: {activeJob ? activeJob.totalPages : totalPages}</span>
                        <span>{activeJob ? `Processed: ${activeJob.processedPages}` : "Consecutive Mapping Running"}</span>
                      </div>
                    )}
                  </div>
                )}

                {failedJob && !activeJob && (
                  <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-3 text-rose-800">
                      <AlertTriangle className="size-5 shrink-0 text-rose-600" />
                      <div className="flex-1 space-y-0.5">
                        <h4 className="text-xs font-black uppercase tracking-wider">Background Processing Failed</h4>
                        <p className="text-[10px] font-bold text-rose-600/80">
                          The PDF download/splitting process encountered a network or CORS issue.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const jobId = `${selectedClass}_${selectedMedium}`;
                            await retryJob(jobId);
                            toast.success("Job retry triggered.");
                          } catch (err: any) {
                            toast.error("Failed to trigger job retry.");
                          }
                        }}
                        className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shadow-rose-100"
                      >
                        <RefreshCw className="size-3" /> Retry
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Active Class & Medium Info Box */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
              <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <BookOpen className="size-4 text-indigo-600" /> Currently Active Diary Info
              </h3>
              
              {checkingExisting ? (
                <div className="flex items-center gap-2 py-4 justify-center text-gray-400 text-xs font-bold">
                  <Loader2 className="size-4 animate-spin text-indigo-600" />
                  <span>Checking database...</span>
                </div>
              ) : existingDiary.exists ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Range</span>
                    <p className="text-sm font-bold text-gray-800">
                      {existingDiary.startDateStr} to {existingDiary.endDateStr}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Mapped Pages</span>
                    <p className="text-sm font-bold text-gray-800">
                      {existingDiary.totalPages} Pages
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-1 sm:col-span-2">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Last Upload Timestamp</span>
                    <p className="text-xs font-bold text-gray-800">
                      {format(new Date(existingDiary.uploadedAt), "dd/MM/yyyy HH:mm:ss")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center text-gray-400 space-y-2">
                  <AlertTriangle className="size-8 text-amber-500/80" />
                  <p className="text-xs font-bold text-gray-500">
                    No diary currently uploaded for {selectedClass} ({selectedMedium}).
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Large File Preview Card */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm sticky top-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="text-xs font-extrabold text-gray-600 uppercase tracking-wider">File Preview / तपशील</span>
                {selectedFile ? (
                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                    New File Selected
                  </span>
                ) : existingPreviewUrl ? (
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Active Diary Preview
                  </span>
                ) : null}
              </div>

              {localPreviewUrl === "doc-html-preview" && docHtmlPreview ? (
                <div
                  className="w-full rounded-2xl border border-indigo-100 bg-white p-4 overflow-y-auto scrollbar-thin prose prose-sm max-w-none"
                  style={{ height: "550px" }}
                  dangerouslySetInnerHTML={{ __html: docHtmlPreview }}
                />
              ) : localPreviewUrl ? (
                <div className="w-full rounded-2xl overflow-hidden border border-gray-200 bg-gray-50" style={{ height: "550px" }}>
                  <iframe
                    src={`${localPreviewUrl}#view=FitH`}
                    title="PDF Upload Preview"
                    className="w-full h-full border-none"
                  />
                </div>
              ) : existingPreviewUrl ? (
                <div className="space-y-2">
                  <div className="w-full rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center relative p-6" style={{ minHeight: "450px", height: "530px" }}>
                    {loadingPreview ? (
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <Loader2 className="size-8 animate-spin text-indigo-600" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Syncing preview page...</span>
                      </div>
                    ) : existingPreviewUrl.match(/\.(docx?|xlsx?)$/i) ? (
                      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 bg-white rounded-2xl border border-indigo-100 shadow-sm max-w-sm w-full">
                        <div className="size-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                          <FileText className="size-8" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Active Word / Excel Diary</h4>
                          <p className="text-xs text-slate-500 font-bold">Document is active for {selectedClass} ({selectedMedium})</p>
                        </div>
                        <a
                          href={existingPreviewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                        >
                          <Download className="size-4" /> Download / View File
                        </a>
                      </div>
                    ) : authenticatedPreviewUrl ? (
                      <iframe
                        src={`${authenticatedPreviewUrl}#view=FitH`}
                        title="Existing Active Diary Preview"
                        className="w-full h-full border-none"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-center p-6 text-slate-400">
                        <AlertTriangle className="size-8 text-amber-500 mb-2" />
                        <span className="text-xs font-bold">Failed to load preview PDF</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-center text-slate-500 font-bold uppercase tracking-wider">
                    Active Saved Diary ({existingDiary.startDateStr})
                  </p>
                </div>
              ) : (
                <div className="w-full aspect-[3/4] rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <div className="size-12 rounded-full bg-white flex items-center justify-center text-gray-400 shadow-sm">
                    <FileText className="size-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-700">No file selected</p>
                    <p className="text-[10px] text-gray-400 max-w-[200px]">
                      Select a Teaching Diary PDF, Word or Excel file in Step 3 to see preview here.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
