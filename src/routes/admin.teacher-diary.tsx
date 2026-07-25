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
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
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
  class: string;
  month: string;
  medium?: string;
  fileName: string;
  size?: string;
  fileType: string;
  date: string;
  downloadURL: string;
  storagePath: string;
  uploadedAt: number;
  parsedContent?: ParsedDiaryContent | null;
}

function TeacherDiaryAdmin() {
  const navigate = useNavigate();
  const [diaries, setDiaries] = useState<DiaryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const [activeClass, setActiveClass] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>("Class 1");
  const [selectedMonth, setSelectedMonth] = useState<string>("June");
  const [selectedMedium, setSelectedMedium] = useState<string>("Marathi");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isDateFocus, setIsDateFocus] = useState(false);
  const [previewDiaryId, setPreviewDiaryId] = useState<string | null>(null);
  const [viewingDiaryId, setViewingDiaryId] = useState<string | null>(null);
  const filteredDiaries = diaries.filter((d) => d.class === activeClass);

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
      const q = collection(db, "teacher_diaries");
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          class: data.class || data.className || "",
          month: data.month || "",
          medium: data.medium || "",
          fileName: data.fileName || data.name || "",
          size: data.size || "",
          fileType: data.fileType || data.type || "",
          date: data.date || "",
          downloadURL: data.downloadURL || data.url || "",
          storagePath: data.storagePath || "",
          uploadedAt: data.uploadedAt || data.createdAt || 0,
          parsedContent: data.parsedContent || null,
        };
      }) as DiaryFile[];
      list.sort((a: any, b: any) => (b.uploadedAt || 0) - (a.uploadedAt || 0));
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
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(diary.downloadURL)}`;
      const response = await fetch(proxyUrl);
      const blob = await response.blob();
      
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const parsed = await parseDiaryFile(dataUrl, diary.fileType || blob.type, diary.class);
      if (parsed) {
        const { updateDoc, doc: firestoreDoc } = await import("firebase/firestore");
        await updateDoc(firestoreDoc(db, "teacher_diaries", diary.id), {
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

  const isValidFirebaseStorageUrl = (url: string) => {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return (
        parsed.hostname === "firebasestorage.googleapis.com" ||
        parsed.hostname.includes("firebasestorage") ||
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1"
      );
    } catch (e) {
      return false;
    }
  };

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith("image/")) {
        resolve(file);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          const MAX_WIDTH = 1600;
          const MAX_HEIGHT = 1600;
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const compressedFile = new File([blob], file.name, {
                    type: "image/jpeg",
                    lastModified: Date.now(),
                  });
                  resolve(compressedFile);
                } else {
                  resolve(file);
                }
              },
              "image/jpeg",
              0.8
            );
          } else {
            resolve(file);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const uploadToFirebaseStorage = (
    file: File,
    classFolder: string,
    onProgress: (percent: number) => void
  ): Promise<{ downloadURL: string; storagePath: string }> => {
    return new Promise((resolve, reject) => {
      if (!storage) {
        reject(new Error("Firebase Storage is not configured."));
        return;
      }
      const timestamp = Date.now();
      const uniqueFileName = `${timestamp}_${file.name.replace(/\s+/g, "_")}`;
      const storagePath = `teacher-diaries/${classFolder}/${uniqueFileName}`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      let lastPercent = -1;
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const percent = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );
            if (percent !== lastPercent) {
              lastPercent = percent;
              onProgress(percent);
            }
          }
        },
        (error) => {
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({ downloadURL, storagePath });
          } catch (err) {
            reject(err);
          }
        }
      );
    });
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
      // Compress file if it's an image
      const fileToUpload = await compressImage(file);

      const parts = selectedDate.split("-");
      const formattedDate =
        parts.length === 3
          ? `${parts[2].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[0]}`
          : format(new Date(), "dd/MM/yyyy");

      const timestamp = new Date().getTime();
      const classFolder = selectedClass.toLowerCase().replace(/\s+/g, "-");

      const uploadResult = await uploadToFirebaseStorage(fileToUpload, classFolder, (percent) => setUploadProgress(percent));

      const newDiary: any = {
        class: selectedClass,
        month: selectedMonth,
        medium: selectedMedium,
        fileName: fileToUpload.name,
        size: formatSize(fileToUpload.size),
        fileType: fileToUpload.type || "application/pdf",
        date: formattedDate,
        downloadURL: uploadResult.downloadURL,
        storagePath: uploadResult.storagePath,
        uploadedAt: timestamp,
        parsedContent: null,
      };

      const docRef = await addDoc(
        collection(db, "teacher_diaries"),
        newDiary,
      );

      setDiaries((prev) => [
        { id: docRef.id, ...newDiary } as DiaryFile,
        ...prev,
      ]);

      toast.success(`"${file.name}" uploaded successfully! 🎉`);

      // Asynchronously parse document structure in the background
      (async () => {
        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          const parsed = await parseDiaryFile(dataUrl, file.type || "application/pdf", selectedClass);
          if (parsed) {
            const { updateDoc, doc: firestoreDoc } = await import("firebase/firestore");
            await updateDoc(firestoreDoc(db, "teacher_diaries", docRef.id), {
              parsedContent: parsed
            });
            setDiaries((prev) =>
              prev.map((d) => (d.id === docRef.id ? { ...d, parsedContent: parsed } : d))
            );
          }
        } catch (parseErr) {
          console.warn("Background parsing failed:", parseErr);
        }
      })();

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
      if (diary && diary.storagePath && storage) {
        const fileRef = ref(storage, diary.storagePath);
        await deleteObject(fileRef).catch((e) => console.error("Failed to delete from Firebase Storage:", e));
      }

      await deleteDoc(doc(db, "teacher_diaries", id));
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

        {!activeClass ? (
          /* Class Selection Grid */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="text-center space-y-2 pt-4">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Select Class / वर्ग निवडा</h2>
              <p className="text-xs font-bold text-[#6C63FF] uppercase tracking-widest">Select a class to upload or view diaries</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto w-full">
              {classes.map((cls, idx) => (
                <motion.button
                  key={cls.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => {
                    setActiveClass(cls.id);
                    setSelectedClass(cls.id);
                  }}
                  className={`group p-8 rounded-[2.5rem] border text-center transition-all duration-500 shadow-md hover:shadow-[0_20px_45px_rgba(108,99,255,0.3)] cursor-pointer relative overflow-hidden flex flex-col items-center gap-4 bg-gradient-to-br ${cls.color} text-white border-black/5 hover:scale-[1.02]`}
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
                    <p className="text-[10px] text-slate-100/70 font-bold uppercase tracking-wider">
                      {cls.id}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-100/70 mt-2">
                    Open / उघडा{" "}
                    <Plus className="size-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          /* Split Screen: Left - Upload Form, Right - Files Catalog */
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <button
              onClick={() => setActiveClass(null)}
              className="flex items-center gap-2 text-sm font-black text-[#6B7280] hover:text-[#6C63FF] uppercase tracking-widest transition-colors cursor-pointer"
            >
              <ChevronLeft className="size-4" /> Back to Classes / वर्गांची निवड
            </button>

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
                    <div className="w-full px-4 py-3 bg-gradient-to-r from-[#6C63FF] to-indigo-600 rounded-2xl text-sm font-black text-white text-center shadow-sm">
                      {activeClass}
                    </div>
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
                    <BookOpen className="size-5 text-[#6C63FF]" /> Uploaded Diaries Catalog ({activeClass})
                  </h3>
                  <span className="px-3.5 py-1 bg-violet-100 text-[#6C63FF] rounded-full text-[10px] font-black uppercase tracking-wider">
                    {filteredDiaries.length} Files
                  </span>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="size-10 text-[#6C63FF] animate-spin" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">
                      Synchronizing Files Catalog...
                    </p>
                  </div>
                ) : filteredDiaries.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-slate-200 rounded-3xl space-y-6 bg-slate-50/40">
                    <div className="space-y-1">
                      <h4 className="text-slate-700 font-bold">No teaching diaries uploaded yet for {activeClass}</h4>
                      <p className="text-slate-400 text-xs">
                        Select a month and date on the left to start uploading files.
                      </p>
                    </div>
                    <div className="max-w-md mx-auto border border-slate-200/60 rounded-2xl overflow-hidden bg-white p-2 shadow-sm">
                      <img
                        src="/lesson-plan-format.png"
                        alt="Reference Lesson Plan Format"
                        className="w-full h-auto object-contain rounded-xl"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
                    <AnimatePresence>
                      {filteredDiaries.map((diary) => (
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
                            <div className="font-bold text-slate-800 text-sm truncate max-w-[250px] sm:max-w-md" title={diary.fileName}>
                              {diary.fileName}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <span className="px-2 py-0.5 bg-violet-100/50 text-[#6C63FF] rounded">
                                {diary.class}
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
                          {(diary.parsedContent || /\.(pdf|doc|docx)$/i.test(diary.fileName || "")) && (
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
                            onClick={() => {
                              if (!isValidFirebaseStorageUrl(diary.downloadURL)) {
                                toast.error("Firebase Storage URL Invalid");
                                return;
                              }
                              setViewingDiaryId(viewingDiaryId === diary.id ? null : diary.id);
                            }}
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
                            href={diary.downloadURL}
                            download={diary.fileName}
                            className="size-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all cursor-pointer shadow-sm"
                            title="Download"
                          >
                            <Download className="size-4.5" />
                          </a>
                          <button
                            onClick={() => handleDelete(diary.id, diary.fileName)}
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
                                <div className="flex items-center gap-4">
                                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                                    File Preview / फाईल प्रिव्ह्यू
                                  </span>
                                  {(/\.(doc|docx)$/i.test(diary.fileName || "") || diary.fileType?.includes("word") || diary.fileType?.includes("officedocument.wordprocessingml")) && (
                                    <a
                                      href={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(diary.downloadURL)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100/70 rounded-lg text-xs font-bold text-indigo-600 transition-colors shadow-sm cursor-pointer animate-pulse"
                                    >
                                      <Eye className="size-3.5" /> Open Full Screen / नवीन टॅबमध्ये उघडा
                                    </a>
                                  )}
                                </div>
                                <button
                                  onClick={() => setViewingDiaryId(null)}
                                  className="text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer"
                                >
                                  Close Preview / प्रिव्ह्यू बंद करा
                                </button>
                              </div>
                              {diary.downloadURL?.startsWith("data:image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(diary.fileName || "") ? (
                                <div className="w-full flex justify-center bg-slate-50 rounded-xl p-2 border border-slate-100 overflow-auto max-h-[500px]">
                                  <img src={diary.downloadURL} alt={diary.fileName} className="max-w-full h-auto rounded-lg object-contain shadow-sm" />
                                </div>
                              ) : (/\.(doc|docx)$/i.test(diary.fileName || "") || diary.fileType?.includes("word") || diary.fileType?.includes("officedocument.wordprocessingml")) && !diary.downloadURL?.startsWith("data:") ? (
                                <iframe
                                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(diary.downloadURL)}`}
                                  title={diary.fileName}
                                  className="w-full h-[800px] rounded-xl border border-slate-200 shadow-sm bg-slate-50"
                                />
                              ) : (
                                <iframe
                                  src={diary.downloadURL}
                                  title={diary.fileName}
                                  className="w-full h-[500px] rounded-xl border border-slate-200 shadow-sm bg-slate-50"
                                />
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

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
      </motion.div>
      )}
      </main>
      <Footer />
    </div>
  );
}
