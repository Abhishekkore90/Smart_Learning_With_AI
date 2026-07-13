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
  Loader2,
  Book,
  Edit3,
  Save,
  MessageSquare,
} from "lucide-react";
import { collection, addDoc, getDocs, deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_FORM_DATA } from "@/lib/assemblyTranslations";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { showToast as toast } from "@/lib/custom-toast";

export const Route = createFileRoute("/admin/assembly")({
  head: () => ({ meta: [{ title: "Daily Assembly Book Uploader — Super Admin" }] }),
  component: AssemblyBookAdmin,
});

interface AssemblyBookFile {
  id: string;
  name: string;
  size: string;
  type: string;
  date: string;
  url?: string;
  chunks?: string[];
}

function AssemblyBookAdmin() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<AssemblyBookFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"pdf" | "paripath">("paripath");
  const [paripathData, setParipathData] = useState<any>(DEFAULT_FORM_DATA.mr);
  const [savingParipath, setSavingParipath] = useState(false);

  useEffect(() => {
    const isAdmin = sessionStorage.getItem("is_super_admin");
    if (!isAdmin) {
      navigate({
        to: "/login",
        search: { redirect: "/admin/assembly", role: "admin" } as any,
      });
      return;
    }

    fetchBooks();
    fetchParipath();
  }, [navigate]);

  const fetchParipath = async () => {
    try {
      const docRef = doc(db, "admin_daily_paripath", "current");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setParipathData(docSnap.data());
      } else {
        setParipathData(DEFAULT_FORM_DATA.mr); // Fallback to template
      }
    } catch (err) {
      console.error("Error fetching paripath:", err);
      toast.error("Failed to load today's Paripath.");
    }
  };

  const handleSaveParipath = async () => {
    setSavingParipath(true);
    try {
      await setDoc(doc(db, "admin_daily_paripath", "current"), paripathData);
      toast.success("Paripath updated successfully! 🎉");
    } catch (err) {
      console.error("Error saving paripath:", err);
      toast.error("Failed to save Paripath.");
    } finally {
      setSavingParipath(false);
    }
  };

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const q = collection(db, "admin_assembly_books");
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AssemblyBookFile[];
      setBooks(list);
    } catch (err) {
      console.error("Error fetching assembly books:", err);
      toast.error("Failed to load assembly books.");
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024 * 10) { // Limit to 10MB
      toast.error(`File is too large (${formatSize(file.size)}). Maximum allowed size is 10MB.`);
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        const formattedDate = new Date().toLocaleDateString("en-IN");
        
        // Chunk the base64 string to bypass 1MB Firestore limit
        const base64Chunks = chunkString(base64, 800000); // 800KB chunks
        
        const chunkUploadPromises = base64Chunks.map((chunk) =>
          addDoc(collection(db, "admin_assembly_chunks"), { data: chunk })
        );
        
        const chunkRefs = await Promise.all(chunkUploadPromises);
        const chunkIds = chunkRefs.map((ref) => ref.id);

        const newBook: any = {
          name: file.name,
          size: formatSize(file.size),
          type: file.type || "application/pdf",
          date: formattedDate,
          chunks: chunkIds,
        };

        const docRef = await addDoc(
          collection(db, "admin_assembly_books"),
          newBook,
        );

        setBooks((prev) => [
          ...prev,
          { id: docRef.id, ...newBook } as AssemblyBookFile,
        ]);
        
        toast.success(`"${file.name}" uploaded successfully! 🎉`);
      } catch (err: any) {
        console.error("Upload error:", err);
        toast.error(err?.message || "Failed to save file details.");
      } finally {
        setUploading(false);
        if (e.target) e.target.value = ''; // Reset input
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (book: AssemblyBookFile) => {
    if (!confirm(`Are you sure you want to delete "${book.name}"?`)) return;

    try {
      if (book.chunks) {
        for (const chunkId of book.chunks) {
          await deleteDoc(doc(db, "admin_assembly_chunks", chunkId)).catch(() => {});
        }
      }

      await deleteDoc(doc(db, "admin_assembly_books", book.id));
      setBooks((prev) => prev.filter((d) => d.id !== book.id));
      toast.success("Assembly book deleted successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete assembly book.");
    }
  };

  const handleView = async (book: AssemblyBookFile) => {
    if (book.url) {
      window.open(book.url);
      return;
    }
    if (book.chunks) {
      toast.success("Loading preview, please wait...");
      try {
        let fullBase64 = "";
        for (const chunkId of book.chunks) {
          const chunkDoc = await getDoc(doc(db, "admin_assembly_chunks", chunkId));
          if (chunkDoc.exists()) fullBase64 += chunkDoc.data().data;
        }
        const newWin = window.open();
        if (newWin) {
          if (book.type.includes("pdf")) {
            newWin.document.write(`<iframe src="${fullBase64}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
          } else {
            newWin.document.write(`<img src="${fullBase64}" style="max-width:100%; margin:auto; display:block;" />`);
          }
        }
      } catch (err) {
        console.error("View error:", err);
        toast.error("Failed to load file preview.");
      }
    }
  };

  const handleDownload = async (book: AssemblyBookFile) => {
    if (book.url) {
      const a = document.createElement("a");
      a.href = book.url;
      a.download = book.name;
      a.click();
      return;
    }
    if (book.chunks) {
      toast.success("Preparing download, please wait...");
      try {
        let fullBase64 = "";
        for (const chunkId of book.chunks) {
          const chunkDoc = await getDoc(doc(db, "admin_assembly_chunks", chunkId));
          if (chunkDoc.exists()) fullBase64 += chunkDoc.data().data;
        }
        const a = document.createElement("a");
        a.href = fullBase64;
        a.download = book.name;
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
                Daily Assembly Book <span className="text-[#6C63FF]">Uploader.</span>
              </h1>
              <p className="text-[#6B7280] max-w-xl text-lg font-medium leading-relaxed">
                Manage the daily structure (Paripath) and upload reference guidebooks.
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 w-fit">
            <button
              onClick={() => setActiveTab("paripath")}
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
                activeTab === "paripath"
                  ? "bg-[#6C63FF] text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Edit3 className="size-4" /> Edit Today's Paripath
            </button>
            <button
              onClick={() => setActiveTab("pdf")}
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
                activeTab === "pdf"
                  ? "bg-[#6C63FF] text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <FileText className="size-4" /> PDF Guidebooks
            </button>
          </div>
        </div>

        {activeTab === "pdf" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Upload Card */}
          <div className="bg-white border border-black/5 rounded-[3rem] p-8 shadow-sm space-y-6">
            <h3 className="text-xl font-black tracking-tight text-stone-900">
              Upload PDF Book
            </h3>
            
            <div className="space-y-4">
              <div className="relative group border-2 border-dashed border-slate-200 hover:border-[#6C63FF]/50 rounded-[2rem] p-8 text-center transition-all bg-slate-50/50 hover:bg-white cursor-pointer overflow-hidden">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  accept=".pdf,image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  disabled={uploading}
                />
                {uploading ? (
                  <div className="space-y-4 py-4">
                    <Loader2 className="size-10 text-[#6C63FF] animate-spin mx-auto" />
                    <div className="text-xs font-black uppercase tracking-widest text-[#6C63FF] animate-pulse">
                      Uploading book...
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="size-12 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-[#6C63FF] mx-auto shadow-sm transition-transform duration-500 group-hover:scale-110">
                      <Plus className="size-6" />
                    </div>
                    <div className="text-xs font-bold text-slate-700">
                      Click to choose or drag book file
                    </div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      PDF or Images up to 10MB
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
                <Book className="size-5 text-[#6C63FF]" /> Uploaded Assembly Books
              </h3>
              <span className="px-3.5 py-1 bg-blue-100 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                {books.length} Files
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="size-10 text-[#6C63FF] animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">
                  Synchronizing Books Catalog...
                </p>
              </div>
            ) : books.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-slate-200 rounded-3xl space-y-4">
                <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mx-auto">
                  <Book className="size-8" />
                </div>
                <div>
                  <h4 className="text-slate-700 font-bold">No assembly books uploaded yet</h4>
                  <p className="text-slate-400 text-xs mt-1">
                    Upload a book PDF on the left.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
                <AnimatePresence>
                  {books.map((book) => (
                    <motion.div
                      key={book.id}
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
                          <div className="font-bold text-slate-800 text-sm truncate max-w-[250px] sm:max-w-md" title={book.name}>
                            {book.name}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span>{book.size}</span>
                            <span>{book.date}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <button
                          onClick={() => handleView(book)}
                          className="size-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all cursor-pointer shadow-sm"
                          title="View"
                        >
                          <Eye className="size-4.5" />
                        </button>
                        <button
                          onClick={() => handleDownload(book)}
                          className="size-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all cursor-pointer shadow-sm"
                          title="Download"
                        >
                          <Download className="size-4.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(book)}
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
        ) : (
          /* Paripath Form Editor */
          <div className="bg-white border border-black/5 rounded-[3rem] p-8 md:p-12 shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-stone-100 pb-6">
              <div>
                <h3 className="text-2xl font-black tracking-tight text-stone-900 flex items-center gap-3">
                  <MessageSquare className="size-6 text-[#6C63FF]" /> Today's Paripath Data
                </h3>
                <p className="text-slate-500 mt-2">Edit the structured text below. It will automatically update in the teacher's Daily Assembly module.</p>
              </div>
              <button
                onClick={handleSaveParipath}
                disabled={savingParipath}
                className="px-8 py-4 bg-[#6C63FF] text-white text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-600 transition-all shadow-xl hover:shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50"
              >
                {savingParipath ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
                Save Paripath
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
              {/* Assembly Start Section */}
              <div className="space-y-6 lg:col-span-2 p-6 bg-green-50/50 border border-green-100 rounded-3xl">
                <h4 className="text-lg font-bold text-green-900 flex items-center gap-2 mb-4">
                  🇮🇳 सुरुवातीचा परिपाठ (Assembly Start)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { key: 'nationalAnthem', label: '🇮🇳 राष्ट्रगीत (National Anthem)', rows: 4 },
                    { key: 'stateAnthem', label: '🚩 राज्यगीत (State Anthem)', rows: 4 },
                    { key: 'pledge', label: '🇮🇳 प्रतिज्ञा (Pledge)', rows: 4 },
                    { key: 'preamble', label: '🇪🇺 संविधान (Preamble)', rows: 4 },
                    { key: 'prayer', label: '👏🏻 प्रार्थना (Prayer)', rows: 4 },
                  ].map((field) => (
                    <div key={field.key} className={field.key === 'prayer' ? "md:col-span-2" : ""}>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-green-700 mb-2">{field.label}</label>
                      <textarea
                        rows={field.rows}
                        value={paripathData[field.key] || ''}
                        onChange={(e) => setParipathData({ ...paripathData, [field.key]: e.target.value })}
                        className="w-full px-5 py-4 bg-white border border-green-200 rounded-2xl focus:outline-none focus:border-green-400 focus:ring-4 focus:ring-green-400/10 transition-all resize-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Panchang Section */}
              <div className="space-y-6 lg:col-span-2 p-6 bg-amber-50/50 border border-amber-100 rounded-3xl">
                <h4 className="text-lg font-bold text-amber-900 flex items-center gap-2 mb-4">
                  🪀 पंचांग (Panchang)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['day', 'month', 'paksha', 'tithi', 'nakshatra', 'yog', 'sunrise', 'sunset'].map((field) => (
                    <div key={field}>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-amber-700 mb-2">{field}</label>
                      <input
                        type="text"
                        value={paripathData[field] || ''}
                        onChange={(e) => setParipathData({ ...paripathData, [field]: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Suvichar & Proverb */}
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">🪀 सुविचार (Thought)</label>
                  <textarea
                    rows={3}
                    value={paripathData.thought || ''}
                    onChange={(e) => setParipathData({ ...paripathData, thought: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-[#6C63FF] focus:ring-4 focus:ring-[#6C63FF]/10 transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">🪀 म्हण (Proverb)</label>
                  <input
                    type="text"
                    value={paripathData.proverb || ''}
                    onChange={(e) => setParipathData({ ...paripathData, proverb: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-[#6C63FF] focus:ring-4 focus:ring-[#6C63FF]/10 transition-all mb-4"
                  />
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">अर्थ (Meaning)</label>
                  <textarea
                    rows={2}
                    value={paripathData.proverbMeaning || ''}
                    onChange={(e) => setParipathData({ ...paripathData, proverbMeaning: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-[#6C63FF] focus:ring-4 focus:ring-[#6C63FF]/10 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Dinvishesh */}
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Date (e.g. ०९ जुलै)</label>
                    <input
                      type="text"
                      value={paripathData.dateMonth || ''}
                      onChange={(e) => setParipathData({ ...paripathData, dateMonth: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-[#6C63FF] focus:ring-4 focus:ring-[#6C63FF]/10 transition-all"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Day Number (e.g. १९०)</label>
                    <input
                      type="text"
                      value={paripathData.yearDay || ''}
                      onChange={(e) => setParipathData({ ...paripathData, yearDay: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-[#6C63FF] focus:ring-4 focus:ring-[#6C63FF]/10 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">🪀 महत्त्वाच्या घटना (Events - line separated)</label>
                  <textarea
                    rows={4}
                    value={paripathData.events || ''}
                    onChange={(e) => setParipathData({ ...paripathData, events: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-[#6C63FF] focus:ring-4 focus:ring-[#6C63FF]/10 transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">🪀 जन्मदिवस (Birthdays - line separated)</label>
                  <textarea
                    rows={3}
                    value={paripathData.birthdays || ''}
                    onChange={(e) => setParipathData({ ...paripathData, birthdays: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-[#6C63FF] focus:ring-4 focus:ring-[#6C63FF]/10 transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">🪀 मृत्यू / पुण्यतिथी (Deaths - line separated)</label>
                  <textarea
                    rows={3}
                    value={paripathData.deaths || ''}
                    onChange={(e) => setParipathData({ ...paripathData, deaths: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-[#6C63FF] focus:ring-4 focus:ring-[#6C63FF]/10 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Story */}
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">🪀 बोधकथा (Story Title)</label>
                  <input
                    type="text"
                    value={paripathData.storyTitle || ''}
                    onChange={(e) => setParipathData({ ...paripathData, storyTitle: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-[#6C63FF] focus:ring-4 focus:ring-[#6C63FF]/10 transition-all mb-4"
                  />
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Story Content</label>
                  <textarea
                    rows={6}
                    value={paripathData.story || ''}
                    onChange={(e) => setParipathData({ ...paripathData, story: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-[#6C63FF] focus:ring-4 focus:ring-[#6C63FF]/10 transition-all resize-none mb-4"
                  />
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">तात्पर्य (Moral)</label>
                  <input
                    type="text"
                    value={paripathData.moral || ''}
                    onChange={(e) => setParipathData({ ...paripathData, moral: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-[#6C63FF] focus:ring-4 focus:ring-[#6C63FF]/10 transition-all"
                  />
                </div>
              </div>

              {/* Patriotic Song & GK */}
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">🪀 देशभक्ती गीत (Song Title)</label>
                  <input
                    type="text"
                    value={paripathData.songTitle || ''}
                    onChange={(e) => setParipathData({ ...paripathData, songTitle: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-[#6C63FF] focus:ring-4 focus:ring-[#6C63FF]/10 transition-all mb-4"
                  />
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Lyrics</label>
                  <textarea
                    rows={6}
                    value={paripathData.patrioticSong || ''}
                    onChange={(e) => setParipathData({ ...paripathData, patrioticSong: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-[#6C63FF] focus:ring-4 focus:ring-[#6C63FF]/10 transition-all resize-none"
                  />
                </div>
                
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
                  <h4 className="text-sm font-bold text-slate-800 mb-4">🪀 सामान्य ज्ञान (GK)</h4>
                  {[1, 2, 3, 4].map((num) => (
                    <div key={`gk${num}`} className="mb-4">
                      <input
                        type="text"
                        placeholder={`Question ${num}`}
                        value={paripathData[`gkQ${num}`] || ''}
                        onChange={(e) => setParipathData({ ...paripathData, [`gkQ${num}`]: e.target.value })}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-t-xl text-sm focus:outline-none focus:border-[#6C63FF] transition-all"
                      />
                      <input
                        type="text"
                        placeholder={`Answer ${num}`}
                        value={paripathData[`gkA${num}`] || ''}
                        onChange={(e) => setParipathData({ ...paripathData, [`gkA${num}`]: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-100 border border-slate-200 border-t-0 rounded-b-xl text-sm font-bold focus:outline-none focus:border-[#6C63FF] transition-all"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Personality */}
              <div className="space-y-6 lg:col-span-2">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">🪀 थोरव्यक्ती परिचय (Name & Dates)</label>
                  <input
                    type="text"
                    value={paripathData.personalityTitle || ''}
                    onChange={(e) => setParipathData({ ...paripathData, personalityTitle: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-[#6C63FF] focus:ring-4 focus:ring-[#6C63FF]/10 transition-all mb-4"
                  />
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Biography</label>
                  <textarea
                    rows={6}
                    value={paripathData.personality || ''}
                    onChange={(e) => setParipathData({ ...paripathData, personality: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-[#6C63FF] focus:ring-4 focus:ring-[#6C63FF]/10 transition-all resize-none"
                  />
                </div>
              </div>

            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
