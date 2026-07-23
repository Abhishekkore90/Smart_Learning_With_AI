import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  ChevronLeft,
  Plus,
  Trash2,
  Download,
  Eye,
  FileText,
  Layers,
  Loader2,
} from "lucide-react";
import { collection, addDoc, getDocs, deleteDoc, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { showToast as toast } from "@/lib/custom-toast";
import { uploadFileWithProgress } from "@/lib/upload";

export const Route = createFileRoute("/admin/timetable")({
  head: () => ({ meta: [{ title: "Timetable Uploader — Super Admin" }] }),
  component: TimetableAdmin,
});

interface TimetableFile {
  id: string;
  className: string;
  name: string;
  size: string;
  type: string;
  date: string;
  url?: string;
  chunks?: string[];
}

function TimetableAdmin() {
  const navigate = useNavigate();
  const [timetables, setTimetables] = useState<TimetableFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>("Class 1");

  const classes = [
    "Class 1",
    "Class 2",
    "Class 3",
    "Class 4",
    "Class 5",
    "Class 6",
    "Class 7",
    "Class 8",
    "Class 9",
    "Class 10",
  ];

  useEffect(() => {
    const isAdmin = sessionStorage.getItem("is_super_admin");
    if (!isAdmin) {
      navigate({
        to: "/login",
        search: { redirect: "/admin/timetable", role: "admin" } as any,
      });
      return;
    }

    fetchTimetables();
  }, [navigate]);

  const fetchTimetables = async () => {
    setLoading(true);
    try {
      const q = collection(db, "admin_timetables");
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TimetableFile[];
      setTimetables(list);
    } catch (err) {
      console.error("Error fetching timetables:", err);
      toast.error("Failed to load timetables.");
    } finally {
      setLoading(false);
    }
  };

  const chunkString = (str: string, size: number) => {
    const chunks = [];
    for (let i = 0; i < str.length; i += size) {
      chunks.push(str.slice(i, i + size));
    }
    return chunks;
  };

  const processSelectedFile = async (file: File) => {
    if (!file) return;

    if (file.size > 1024 * 1024 * 10) {
      toast.error(`File is too large (${formatSize(file.size)}). Maximum allowed size is 10MB.`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formattedDate = new Date().toLocaleDateString("en-IN");

      const { url: fileUrl } = await uploadFileWithProgress(file, {
        folderPath: "timetables",
        maxSizeBytes: 10 * 1024 * 1024,
        onProgress: (percent) => setUploadProgress(percent),
      });

      const newTimetable: any = {
        className: selectedClass,
        name: file.name,
        size: formatSize(file.size),
        type: file.type || "application/pdf",
        date: formattedDate,
        url: fileUrl,
      };

      const docRef = await addDoc(
        collection(db, "admin_timetables"),
        newTimetable,
      );

      setTimetables((prev) => [
        ...prev,
        { id: docRef.id, ...newTimetable } as TimetableFile,
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

  const handleDelete = async (timetable: TimetableFile) => {
    if (!confirm(`Are you sure you want to delete "${timetable.name}"?`)) return;

    try {
      if (timetable.chunks) {
        for (const chunkId of timetable.chunks) {
          await deleteDoc(doc(db, "admin_timetables_chunks", chunkId)).catch(() => {});
        }
      }

      // Delete from Bunny Storage if it exists
      if (timetable.url && timetable.url.includes("b-cdn.net")) {
        const storageApiKey = import.meta.env.VITE_BUNNY_STORAGE_API_KEY;
        const storageZone = import.meta.env.VITE_BUNNY_STORAGE_ZONE;
        if (storageApiKey && storageZone) {
          const urlParts = timetable.url.split("/");
          const fileName = urlParts[urlParts.length - 1];
          await fetch(`/api/bunny-storage/${storageZone}/documents/${fileName}`, {
            method: "DELETE",
            headers: {
              "AccessKey": storageApiKey
            }
          }).catch((e) => console.error("Failed to delete from Bunny Storage:", e));
        }
      }

      await deleteDoc(doc(db, "admin_timetables", timetable.id));
      setTimetables((prev) => prev.filter((d) => d.id !== timetable.id));
      toast.success("Timetable file deleted successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete timetable file.");
    }
  };

  const handleView = async (timetable: TimetableFile) => {
    if (timetable.url) {
      window.open(timetable.url);
      return;
    }
    if (timetable.chunks) {
      toast.success("Loading preview, please wait...");
      try {
        let fullBase64 = "";
        for (const chunkId of timetable.chunks) {
          const chunkDoc = await getDoc(doc(db, "admin_timetables_chunks", chunkId));
          if (chunkDoc.exists()) fullBase64 += chunkDoc.data().data;
        }
        if (timetable.type.includes("pdf")) {
          const newWin = window.open();
          if (newWin) newWin.document.write(`<iframe src="${fullBase64}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
        } else {
          const newWin = window.open();
          if (newWin) newWin.document.write(`<img src="${fullBase64}" style="max-width:100%;" />`);
        }
      } catch (err) {
        console.error("View error:", err);
        toast.error("Failed to load file preview.");
      }
    }
  };

  const handleDownload = async (timetable: TimetableFile) => {
    if (timetable.url) {
      const a = document.createElement("a");
      a.href = timetable.url;
      a.download = timetable.name;
      a.click();
      return;
    }
    if (timetable.chunks) {
      toast.success("Preparing download, please wait...");
      try {
        let fullBase64 = "";
        for (const chunkId of timetable.chunks) {
          const chunkDoc = await getDoc(doc(db, "admin_timetables_chunks", chunkId));
          if (chunkDoc.exists()) fullBase64 += chunkDoc.data().data;
        }
        const a = document.createElement("a");
        a.href = fullBase64;
        a.download = timetable.name;
        a.click();
      } catch (err) {
        console.error("Download error:", err);
        toast.error("Failed to prepare download.");
      }
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
                Timetable <span className="text-[#6C63FF]">Uploader.</span>
              </h1>
              <p className="text-[#6B7280] font-medium max-w-xl">
                Upload official class timetables to sync globally for all teachers and students.
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
                    : "border-slate-300 hover:border-[#6C63FF] bg-slate-50 hover:bg-blue-500/5"
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
                <Calendar className="size-5 text-[#6C63FF]" /> Uploaded Timetables
              </h3>
              <span className="px-3.5 py-1 bg-blue-100 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                {timetables.length} Files
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="size-10 text-[#6C63FF] animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">
                  Synchronizing Files Catalog...
                </p>
              </div>
            ) : timetables.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-slate-200 rounded-3xl space-y-4">
                <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mx-auto">
                  <Calendar className="size-8" />
                </div>
                <div>
                  <h4 className="text-slate-700 font-bold">No timetables uploaded yet</h4>
                  <p className="text-slate-400 text-xs mt-1">
                    Select a class on the left to start uploading.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
                <AnimatePresence>
                  {timetables.map((timetable) => (
                    <motion.div
                      key={timetable.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-[#6C63FF]/30 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="size-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-[#6C63FF] group-hover:border-[#6C63FF]/20 transition-all flex-shrink-0">
                          <FileText className="size-6" />
                        </div>
                        <div className="overflow-hidden">
                          <div className="font-bold text-slate-800 text-sm truncate max-w-[250px] sm:max-w-md" title={timetable.name}>
                            {timetable.name}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span className="px-2 py-0.5 bg-blue-100/50 text-blue-600 rounded">
                              {timetable.className}
                            </span>
                            <span>{timetable.size}</span>
                            <span>{timetable.date}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <button
                          onClick={() => handleView(timetable)}
                          className="size-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all cursor-pointer shadow-sm"
                          title="View"
                        >
                          <Eye className="size-4.5" />
                        </button>
                        <button
                          onClick={() => handleDownload(timetable)}
                          className="size-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all cursor-pointer shadow-sm"
                          title="Download"
                        >
                          <Download className="size-4.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(timetable)}
                          className="size-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-red-600 hover:border-red-200 transition-all cursor-pointer shadow-sm"
                          title="Delete"
                        >
                          <Trash2 className="size-4.5" />
                        </button>
                      </div>
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
