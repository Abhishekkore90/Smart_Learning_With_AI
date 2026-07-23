import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  ChevronLeft,
  Plus,
  Trash2,
  Download,
  Eye,
  FileText,
  Check,
  Calendar,
  Layers,
  Loader2,
} from "lucide-react";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { showToast as toast } from "@/lib/custom-toast";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { parseDiaryFile, type ParsedDiaryContent } from "@/lib/parse-diary-file";
import { uploadFileWithProgress } from "@/lib/upload";

export const Route = createFileRoute("/admin/teacher-diary")({
  head: () => ({ meta: [{ title: "Teacher Diary Uploader — Super Admin" }] }),
  component: TeacherDiaryAdmin,
});

interface DiaryFile {
  id: string;
  className: string;
  month: string;
  medium?: string;
  name: string;
  size: string;
  type: string;
  date: string;
  url: string;
  parsedContent?: ParsedDiaryContent | null;
}

function TeacherDiaryAdmin() {
  const navigate = useNavigate();
  const [diaries, setDiaries] = useState<DiaryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const [selectedClass, setSelectedClass] = useState<string>("Class 1");
  const [selectedMonth, setSelectedMonth] = useState<string>("June");
  const [selectedMedium, setSelectedMedium] = useState<string>("Marathi");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isDateFocus, setIsDateFocus] = useState(false);
  const [previewDiaryId, setPreviewDiaryId] = useState<string | null>(null);
  const [viewingDiaryId, setViewingDiaryId] = useState<string | null>(null);

  const classes = [
    "Class 1",
    "Class 2",
    "Class 3",
    "Class 4",
    "Class 5",
    "Class 6",
    "Class 7",
    "Class 8",
  ];

  const months = [
    { en: "June", mr: "जून" },
    { en: "July", mr: "जुलै" },
    { en: "August", mr: "ऑगस्ट" },
    { en: "September", mr: "सप्टेंबर" },
    { en: "October", mr: "ऑक्टोबर" },
    { en: "November", mr: "नोव्हेंबर" },
    { en: "December", mr: "डिसेंबर" },
    { en: "January", mr: "जानेवारी" },
    { en: "February", mr: "फेब्रुवारी" },
    { en: "March", mr: "मार्च" },
    { en: "April", mr: "एप्रिल" },
    { en: "May", mr: "मे" },
  ];

  useEffect(() => {
    const isAdmin = sessionStorage.getItem("is_super_admin");
    if (!isAdmin) {
      navigate({
        to: "/login",
        search: { redirect: "/admin/teacher-diary", role: "admin" } as any,
      });
      return;
    }

    fetchDiaries();
  }, [navigate]);

  const fetchDiaries = async () => {
    setLoading(true);
    try {
      const q = collection(db, "admin_teaching_diaries");
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DiaryFile[];
      list.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
      setDiaries(list);
    } catch (err) {
      console.error("Error fetching diaries:", err);
      toast.error("Failed to load diaries.");
    } finally {
      setLoading(false);
    }
  };

  const handleParseOnTheFly = async (diary: DiaryFile) => {
    if (diary.parsedContent) return diary.parsedContent;
    try {
      toast.success("Parsing document structure... 📄");
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(diary.url)}`;
      const response = await fetch(proxyUrl);
      const blob = await response.blob();
      
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const parsed = await parseDiaryFile(dataUrl, diary.type || blob.type, diary.className);
      if (parsed) {
        const { updateDoc, doc: firestoreDoc } = await import("firebase/firestore");
        await updateDoc(firestoreDoc(db, "admin_teaching_diaries", diary.id), {
          parsedContent: parsed
        });
        setDiaries(prev => prev.map(d => d.id === diary.id ? { ...d, parsedContent: parsed } : d));
        toast.success("Structure successfully parsed and saved! 🎉");
        return parsed;
      }
    } catch (err) {
      console.error("On-the-fly parsing failed:", err);
      toast.error("Could not parse file structure.");
    }
    return null;
  };

  const toggleParsedPreview = async (diary: DiaryFile) => {
    if (previewDiaryId === diary.id) {
      setPreviewDiaryId(null);
      return;
    }
    if (!diary.parsedContent) {
      const parsed = await handleParseOnTheFly(diary);
      if (parsed) {
        setPreviewDiaryId(diary.id);
      }
    } else {
      setPreviewDiaryId(diary.id);
    }
  };

  const processSelectedFile = async (file: File) => {
    if (!file) return;

    if (file.size > 1024 * 1024 * 10) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const parts = selectedDate.split("-");
      const formattedDate =
        parts.length === 3
          ? `${parts[2].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[0]}`
          : format(new Date(), "dd/MM/yyyy");

      const timestamp = new Date().getTime();

      // Read file to parse content
      const reader = new FileReader();
      const parsedContentPromise = new Promise<any>((resolve) => {
        reader.onloadend = async () => {
          try {
            const dataUrl = reader.result as string;
            const parsed = await parseDiaryFile(dataUrl, file.type, selectedClass);
            resolve(parsed);
          } catch (e) {
            console.error("Error parsing file:", e);
            resolve(null);
          }
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });

      const [uploadResult, parsedContent] = await Promise.all([
        uploadFileWithProgress(file, {
          folderPath: "teaching_diaries",
          maxSizeBytes: 10 * 1024 * 1024,
          onProgress: (percent) => setUploadProgress(percent),
        }),
        parsedContentPromise
      ]);

      const newDiary: any = {
        className: selectedClass,
        month: selectedMonth,
        medium: selectedMedium,
        name: file.name,
        size: formatSize(file.size),
        type: file.type || "application/pdf",
        date: formattedDate,
        url: uploadResult.url,
        parsedContent: parsedContent || null,
        createdAt: timestamp,
      };

      const docRef = await addDoc(
        collection(db, "admin_teaching_diaries"),
        newDiary,
      );

      setDiaries((prev) => [
        { id: docRef.id, ...newDiary } as DiaryFile,
        ...prev,
      ]);

      toast.success(`"${file.name}" uploaded successfully! 🎉`);
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err?.message || "Failed to upload file.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processSelectedFile(file);
    e.target.value = "";
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const diary = diaries.find((d) => d.id === id);
      if (diary && diary.url && diary.url.includes("b-cdn.net")) {
        const storageApiKey = import.meta.env.VITE_BUNNY_STORAGE_API_KEY;
        const storageZone = import.meta.env.VITE_BUNNY_STORAGE_ZONE;
        if (storageApiKey && storageZone) {
          const urlParts = diary.url.split("/");
          const fileName = urlParts[urlParts.length - 1];
          await fetch(`/api/bunny-storage/${storageZone}/documents/${fileName}`, {
            method: "DELETE",
            headers: {
              "AccessKey": storageApiKey
            }
          }).catch((e) => console.error("Failed to delete from Bunny Storage:", e));
        }
      }

      await deleteDoc(doc(db, "admin_teaching_diaries", id));
      setDiaries((prev) => prev.filter((d) => d.id !== id));
      toast.success("Diary file deleted successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete diary file.");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-[#F8FAFF] text-[#111827] font-sans antialiased">
      <Header />
      <main className="max-w-[1440px] mx-auto px-8 pt-16 pb-24">
        <div className="mb-12 space-y-6">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-sm font-black text-[#6B7280] hover:text-[#6C63FF] uppercase tracking-widest transition-colors"
          >
            <ChevronLeft className="size-4" /> Back to Hub
          </Link>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-2">
              <h1 className="text-5xl font-black tracking-tight">
                Teacher Diary <span className="text-[#6C63FF]">Uploader.</span>
              </h1>
              <p className="text-[#6B7280] font-medium max-w-xl">
                Upload official teaching diaries and lesson plan guidelines
                categorized by class and month. These will sync instantly to
                the educator workspace panels.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Uploader Card */}
          <div className="lg:col-span-1 bg-white border border-black/5 rounded-[3rem] p-8 shadow-sm space-y-6 h-fit">
            <h3 className="text-xl font-black tracking-tight text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
              <Layers className="size-5 text-[#6C63FF]" /> File Metadata
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  Target Class
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:border-[#6C63FF] outline-none"
                >
                  {classes.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  Target Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:border-[#6C63FF] outline-none"
                >
                  {months.map((m) => (
                    <option key={m.en} value={m.en}>
                      {m.mr} ({m.en})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  Target Medium
                </label>
                <select
                  value={selectedMedium}
                  onChange={(e) => setSelectedMedium(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:border-[#6C63FF] outline-none"
                >
                  <option value="Marathi">Marathi</option>
                  <option value="Semi English">Semi English</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  Target Date / तारीख निवडा
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus-within:border-[#6C63FF] outline-none flex items-center justify-between cursor-pointer">
                      <span>{selectedDate ? format(new Date(selectedDate), "dd/MM/yyyy") : "DD/MM/YYYY"}</span>
                      <Calendar className="size-4 text-slate-500" />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate ? new Date(selectedDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          // Standardize internal date as YYYY-MM-DD
                          const formattedDate = format(date, "yyyy-MM-dd");
                          setSelectedDate(formattedDate);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 space-y-4">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                Upload File
              </label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) processSelectedFile(file);
                }}
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-[#6C63FF] bg-violet-500/10 scale-[1.02]"
                    : "border-slate-300 hover:border-[#6C63FF] bg-slate-50 hover:bg-violet-500/5"
                } group`}
              >
                <input
                  type="file"
                  accept=".pdf,image/*,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                {uploading ? (
                  <div className="space-y-3 py-3">
                    <Loader2 className="size-8 animate-spin text-[#6C63FF] mx-auto" />
                    <div className="text-xs font-bold text-[#6C63FF]">
                      Uploading file... {uploadProgress}%
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden max-w-xs mx-auto">
                      <div
                        className="bg-[#6C63FF] h-full transition-all duration-300 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="size-12 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-[#6C63FF] mx-auto shadow-sm transition-transform duration-500 group-hover:scale-110">
                      <Plus className="size-6" />
                    </div>
                    <div className="text-xs font-bold text-slate-700">
                      {isDragging ? "Drop file to upload" : "Click to choose or drag file"}
                    </div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      PDF, Word or Images up to 10MB
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* List of Files Card */}
          <div className="lg:col-span-2 bg-white border border-black/5 rounded-[3rem] p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-xl font-black tracking-tight text-stone-900 flex items-center gap-2">
                <BookOpen className="size-5 text-[#6C63FF]" /> Uploaded Diaries Catalog
              </h3>
              <span className="px-3.5 py-1 bg-violet-100 text-[#6C63FF] rounded-full text-[10px] font-black uppercase tracking-wider">
                {diaries.length} Files
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="size-10 text-[#6C63FF] animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">
                  Synchronizing Files Catalog...
                </p>
              </div>
            ) : diaries.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-slate-200 rounded-3xl space-y-4">
                <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mx-auto">
                  <BookOpen className="size-8" />
                </div>
                <div>
                  <h4 className="text-slate-700 font-bold">No teaching diaries uploaded yet</h4>
                  <p className="text-slate-400 text-xs mt-1">
                    Select a class and month on the left to start uploading.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
                <AnimatePresence>
                  {diaries.map((diary) => (
                    <motion.div
                      key={diary.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="space-y-0"
                    >
                      <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-[#6C63FF]/30 transition-all shadow-sm">
                        <div className="flex items-center gap-4 overflow-hidden">
                          <div className="size-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-[#6C63FF] group-hover:border-[#6C63FF]/20 transition-all flex-shrink-0">
                            <FileText className="size-6" />
                          </div>
                          <div className="overflow-hidden">
                            <div className="font-bold text-slate-800 text-sm truncate max-w-[250px] sm:max-w-md" title={diary.name}>
                              {diary.name}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <span className="px-2 py-0.5 bg-violet-100/50 text-[#6C63FF] rounded">
                                {diary.className}
                              </span>
                              <span className="px-2 py-0.5 bg-emerald-100/50 text-emerald-700 rounded">
                                {diary.month}
                              </span>
                              {diary.medium && (
                                <span className="px-2 py-0.5 bg-amber-100/50 text-amber-700 rounded">
                                  {diary.medium}
                                </span>
                              )}
                              <span>{diary.size}</span>
                              <span>{diary.date}</span>
                              {diary.parsedContent && (
                                <span className="px-2 py-0.5 bg-blue-100/50 text-blue-700 rounded">
                                  ✓ Parsed
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                          {(diary.parsedContent || /\.(pdf|doc|docx)$/i.test(diary.name || "")) && (
                            <button
                              onClick={() => toggleParsedPreview(diary)}
                              className={`size-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                                previewDiaryId === diary.id 
                                  ? "bg-[#6C63FF] border-[#6C63FF] text-white" 
                                  : "bg-white border-slate-100 text-slate-400 hover:text-[#6C63FF] hover:border-[#6C63FF]/20"
                              }`}
                              title="Preview Parsed Content"
                            >
                              <BookOpen className="size-4.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setViewingDiaryId(viewingDiaryId === diary.id ? null : diary.id)}
                            className={`size-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                              viewingDiaryId === diary.id
                                ? "bg-indigo-600 border-indigo-600 text-white"
                                : "bg-white border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-200/20"
                            }`}
                            title="View File"
                          >
                            <Eye className="size-4.5" />
                          </button>
                          <a
                            href={diary.url}
                            download={diary.name}
                            className="size-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all cursor-pointer shadow-sm"
                            title="Download"
                          >
                            <Download className="size-4.5" />
                          </a>
                          <button
                            onClick={() => handleDelete(diary.id, diary.name)}
                            className="size-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-red-600 hover:border-red-200 transition-all cursor-pointer shadow-sm"
                            title="Delete"
                          >
                            <Trash2 className="size-4.5" />
                          </button>
                        </div>
                      </div>

                      {/* File PDF/Image View Preview */}
                      <AnimatePresence>
                        {viewingDiaryId === diary.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mx-2 mt-2 mb-4 bg-white border border-slate-100 rounded-2xl p-4 shadow-inner space-y-4">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                                  File Preview / फाईल प्रिव्ह्यू
                                </span>
                                <button
                                  onClick={() => setViewingDiaryId(null)}
                                  className="text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer"
                                >
                                  Close Preview / प्रिव्ह्यू बंद करा
                                </button>
                              </div>
                              {diary.url?.startsWith("data:image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(diary.name || "") ? (
                                <div className="w-full flex justify-center bg-slate-50 rounded-xl p-2 border border-slate-100 overflow-auto max-h-[500px]">
                                  <img src={diary.url} alt={diary.name} className="max-w-full h-auto rounded-lg object-contain shadow-sm" />
                                </div>
                              ) : (/\.(doc|docx)$/i.test(diary.name || "") || diary.type?.includes("word") || diary.type?.includes("officedocument.wordprocessingml")) && !diary.url?.startsWith("data:") ? (
                                <iframe
                                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(diary.url)}`}
                                  title={diary.name}
                                  className="w-full h-[600px] rounded-xl border border-slate-200 shadow-sm bg-slate-50"
                                />
                              ) : (
                                <iframe
                                  src={diary.url}
                                  title={diary.name}
                                  className="w-full h-[500px] rounded-xl border border-slate-200 shadow-sm bg-slate-50"
                                />
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Parsed Content Preview */}
                      {/* Parsed Content Preview */}
                      <AnimatePresence>
                        {previewDiaryId === diary.id && diary.parsedContent && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mx-2 mt-2 mb-4 bg-white border-[3px] border-black rounded-sm p-4 space-y-4">
                              {/* Header */}
                              <div className="flex flex-wrap items-center justify-between gap-4 px-2">
                                <div className="text-[#0056b3] text-[16px] font-bold">
                                  तारीख : {diary.parsedContent.date || diary.date}
                                </div>
                                <div className="bg-black text-white text-base font-bold px-6 py-1 border-[2px] border-double border-white outline outline-2 outline-black">
                                  टाचन बुक
                                </div>
                                <div className="text-[#0056b3] text-[16px] font-bold">
                                  दिवस : {diary.parsedContent.day || "-"}
                                </div>
                              </div>

                              {/* Thought & Dinvishesh */}
                              <div className="space-y-1 px-2 text-[#0056b3] text-[14px] font-bold">
                                {diary.parsedContent.thought && (
                                  <div>आजचा सुविचार : {diary.parsedContent.thought}</div>
                                )}
                                {diary.parsedContent.dinvishesh && (
                                  <div>आजचा दिनविशेष : {diary.parsedContent.dinvishesh}</div>
                                )}
                              </div>

                              {/* Periods Table */}
                              {diary.parsedContent.periods.length > 0 && (
                                <div className="overflow-x-auto border-[2px] border-black">
                                  <table className="min-w-full border-collapse text-[12px]">
                                    <thead className="bg-white text-[#0056b3]">
                                      <tr className="border-b-[2px] border-black">
                                        <th className="px-2 py-1.5 text-center font-bold border-r-[2px] border-black w-[40px]">तास</th>
                                        <th className="px-2 py-1.5 text-center font-bold border-r-[2px] border-black w-[100px]">वर्ग / विषय</th>
                                        <th className="px-2 py-1.5 text-center font-bold border-r-[2px] border-black">अध्याय / धडा</th>
                                        <th className="px-2 py-1.5 text-center font-bold border-r-[2px] border-black">अनुभव</th>
                                        <th className="px-2 py-1.5 text-center font-bold border-r-[2px] border-black w-[80px]">साधन तंत्र</th>
                                        <th className="px-2 py-1.5 text-center font-bold border-r-[2px] border-black w-[80px]">साहित्य</th>
                                        <th className="px-2 py-1.5 text-center font-bold">परिणाम</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {diary.parsedContent.periods.map((p, idx) => (
                                        <tr key={idx} className="border-b border-black last:border-b-0">
                                          <td className="px-2 py-1.5 text-center font-bold border-r-[2px] border-black text-[#0056b3]">{p.period}</td>
                                          <td className="px-2 py-1.5 text-left font-bold border-r-[2px] border-black text-[#0056b3]">
                                            {p.class && <span>{p.class} / </span>}{p.subject}
                                          </td>
                                          <td className="px-2 py-1.5 text-left border-r-[2px] border-black text-[#0056b3]">{p.topic}</td>
                                          <td className="px-2 py-1.5 text-left border-r-[2px] border-black text-[#0056b3]">{p.experience}</td>
                                          <td className="px-2 py-1.5 text-left border-r-[2px] border-black text-[#0056b3]">{p.tools}</td>
                                          <td className="px-2 py-1.5 text-left border-r-[2px] border-black text-[#0056b3]">{p.materials}</td>
                                          <td className="px-2 py-1.5 text-left text-[#0056b3]">{p.outcome}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* Highlights */}
                              {diary.parsedContent.highlights && (
                                <div className="border-[2px] border-black rounded-sm overflow-hidden">
                                  <div className="border-b-[2px] border-black py-1.5 text-center text-[14px] font-bold text-[#0056b3] bg-white">
                                    दिवसातील प्रमुख उपक्रम
                                  </div>
                                  <div className="p-3 text-[12px] font-semibold text-black">
                                    {diary.parsedContent.highlights}
                                  </div>
                                </div>
                              )}

                              {diary.parsedContent.periods.length === 0 && !diary.parsedContent.thought && !diary.parsedContent.highlights && (
                                <div className="text-center py-6 text-sm text-slate-400 font-bold">
                                  या फाईल मधून content extract करता आले नाही.
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
