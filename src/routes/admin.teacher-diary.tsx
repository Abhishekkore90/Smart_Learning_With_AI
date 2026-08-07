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

  // Selected state
  const [selectedClass, setSelectedClass] = useState<string>("Class 1");
  const [selectedMedium, setSelectedMedium] = useState<string>("Marathi");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);

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

  // Check for existing diary when standard selections change
  useEffect(() => {
    if (selectedClass && selectedMedium) {
      fetchExistingDiaryInfo(selectedClass, selectedMedium);
    }
  }, [selectedClass, selectedMedium]);

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

        const total = docs.length;
        const startD = docs[0].id; // document ID is date YYYY-MM-DD
        const endD = docs[total - 1].id;
        const uploaded = docs[0].timestamp || 0;

        setExistingDiary({
          exists: true,
          totalPages: total,
          startDateStr: startD,
          endDateStr: endD,
          uploadedAt: uploaded,
        });
      } else {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Please upload a PDF file.");
        return;
      }
      setSelectedFile(file);
      // Revoke old URL if exists
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(URL.createObjectURL(file));
    }
  };

  const deleteExistingDiary = async (cls: string, med: string) => {
    const collectionRef = collection(db, "teacher_diaries", cls, med);
    const snapshot = await getDocs(collectionRef);
    if (snapshot.empty) return;

    // Delete files in Storage first
    for (const firestoreDoc of snapshot.docs) {
      const data = firestoreDoc.data();
      if (data.storagePath) {
        const fileRef = ref(storage, data.storagePath);
        await deleteObject(fileRef).catch((err) =>
          console.warn("Storage deletion warning (might be already deleted):", err)
        );
      }
      await deleteDoc(firestoreDoc.ref);
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
    if (!startDate) {
      toast.error("Please select a Start Date.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus("Splitting PDF into individual pages...");

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      // Split the PDF
      const pageBlobs = await splitPdf(arrayBuffer);
      const total = pageBlobs.length;
      setTotalPages(total);

      if (total === 0) {
        throw new Error("The uploaded PDF does not contain any readable pages.");
      }

      // If a diary exists, clear it first (Replace / Upload new version)
      if (existingDiary.exists) {
        setUploadStatus("Replacing existing diary. Clearing old pages...");
        await deleteExistingDiary(selectedClass, selectedMedium);
      }

      setUploadStatus(`Uploading pages (0/${total})...`);

      const start = new Date(startDate);
      const concurrencyLimit = 10;
      const runningPromises: Map<number, Promise<void>> = new Map();
      let completedCount = 0;

      const uploadPageTask = async (i: number) => {
        const pageNum = i + 1;
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);
        const dateStr = format(currentDate, "yyyy-MM-dd");

        const blob = pageBlobs[i];
        const pageFile = new File([blob], `${dateStr}.pdf`, { type: "application/pdf" });

        let attempts = 3;
        let downloadURL = "";
        while (attempts > 0) {
          try {
            const result = await uploadFileWithProgress(pageFile, {
              folderPath: `teacher-diaries/${selectedClass.toLowerCase().replace(/\s+/g, "-")}/${selectedMedium.toLowerCase().replace(/\s+/g, "-")}`,
              maxSizeBytes: 15 * 1024 * 1024,
            });
            downloadURL = result.url;
            break;
          } catch (storageErr) {
            attempts--;
            if (attempts === 0) {
              console.error(`Upload Failed for page ${pageNum}:`, storageErr);
              throw storageErr;
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        const docRef = doc(db, "teacher_diaries", selectedClass, selectedMedium, dateStr);
        await setDoc(docRef, {
          pageUrl: downloadURL,
          pageURL: downloadURL,
          pageNumber: pageNum,
          storagePath: `teacher-diaries/${selectedClass.toLowerCase().replace(/\s+/g, "-")}/${selectedMedium.toLowerCase().replace(/\s+/g, "-")}/${dateStr}.pdf`,
          timestamp: Date.now(),
        });
      };

      for (let i = 0; i < total; i++) {
        const promise = uploadPageTask(i)
          .then(() => {
            completedCount++;
            const percent = Math.round((completedCount / total) * 100);
            setUploadProgress(percent);
            setUploadStatus(`Uploading pages (${completedCount}/${total})...`);
            runningPromises.delete(i);
          })
          .catch((err) => {
            console.error(`Failed at page task ${i + 1}:`, err);
            throw err;
          });

        runningPromises.set(i, promise);

        if (runningPromises.size >= concurrencyLimit) {
          await Promise.race(runningPromises.values());
        }
      }

      await Promise.all(runningPromises.values());

      setLastUploadedDate(format(new Date(), "dd/MM/yyyy HH:mm"));
      setUploadStatus("Success");
      toast.success(`Redesigned Teacher Diary uploaded successfully! (${total} pages matched).`);
      
      // Clean up selected file
      setSelectedFile(null);
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
      setStartDate(undefined);

      // Refresh database status
      await fetchExistingDiaryInfo(selectedClass, selectedMedium);
    } catch (err: any) {
      console.error("Process/Upload error:", err);
      setUploadStatus("Error");
      toast.error(err.message || "Failed to split and upload diary PDF.");
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

              {/* Step 1: Select Class */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center size-5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-black">1</span>
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

              {/* Step 2: Select Medium */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center size-5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-black">2</span>
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

              {/* Step 3: Upload Diary */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center size-5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-black">3</span>
                  <label className="text-xs font-extrabold text-gray-600 uppercase tracking-wider">Upload Teaching Diary PDF</label>
                </div>
                
                <div className="relative border-2 border-dashed border-gray-200 hover:border-indigo-500 bg-gray-50 hover:bg-indigo-50/20 rounded-2xl p-6 text-center cursor-pointer transition-all">
                  <input
                    type="file"
                    accept=".pdf"
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
                        <p className="text-xs font-bold text-gray-700">Click or drag PDF diary here</p>
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                          PDF files only
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 4: Select Start Date */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center size-5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-black">4</span>
                  <label className="text-xs font-extrabold text-gray-600 uppercase tracking-wider">Select Start Date</label>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      disabled={uploading}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 hover:bg-gray-100 flex items-center justify-between cursor-pointer outline-none"
                    >
                      <span>{startDate ? format(startDate, "dd/MM/yyyy") : "Select Start Date..."}</span>
                      <Calendar className="size-4 text-gray-500" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50">
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
                    disabled={uploading || !selectedFile || !startDate}
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
                {uploading && (
                  <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold text-indigo-700">
                      <span className="animate-pulse">{uploadStatus}</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    {totalPages > 0 && (
                      <div className="flex justify-between text-[10px] font-black text-indigo-500 uppercase tracking-wider">
                        <span>Total Pages: {totalPages}</span>
                        <span>Consecutive Mapping Running</span>
                      </div>
                    )}
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

          {/* Right Column - Large PDF Preview Card */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm sticky top-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="text-xs font-extrabold text-gray-600 uppercase tracking-wider">Large PDF Preview</span>
                {selectedFile && (
                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                    PDF Loaded
                  </span>
                )}
              </div>

              {localPreviewUrl ? (
                <div className="w-full rounded-2xl overflow-hidden border border-gray-200 bg-gray-50" style={{ height: "550px" }}>
                  <iframe
                    src={`${localPreviewUrl}#view=FitH`}
                    title="PDF Upload Preview"
                    className="w-full h-full border-none"
                  />
                </div>
              ) : (
                <div className="w-full aspect-[3/4] rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <div className="size-12 rounded-full bg-white flex items-center justify-center text-gray-400 shadow-sm">
                    <FileText className="size-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-700">No PDF selected</p>
                    <p className="text-[10px] text-gray-400 max-w-[200px]">
                      Select a Teaching Diary PDF file in Step 3 to see page preview here.
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
