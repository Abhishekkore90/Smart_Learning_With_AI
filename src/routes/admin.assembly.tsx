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
import { DEFAULT_FORM_DATA, DEFAULT_ASSEMBLY_ITEMS } from "@/lib/assemblyTranslations";
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
                Manage the daily structure (Paripath).
              </p>
            </div>
          </div>
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

            <div className="flex flex-col space-y-12 max-w-4xl mx-auto w-full">
              {/* Assembly Start Section */}
              <div className="space-y-8 p-8 md:p-12 bg-gradient-to-br from-green-50/80 to-emerald-100/50 border border-green-200/60 rounded-[3rem] shadow-[0_8px_30px_rgb(34,197,94,0.12)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-300/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-300/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>
                
                <div className="flex justify-center relative">
                  <h4 className="text-xl md:text-2xl font-black text-green-800 inline-flex items-center justify-center gap-3 px-8 py-4 bg-white/80 backdrop-blur-md rounded-full shadow-sm border border-green-100/50 uppercase tracking-widest">
                    🇮🇳 सुरुवातीचा परिपाठ (Assembly Start)
                  </h4>
                </div>
                
                <div className="flex flex-col space-y-8 max-w-3xl mx-auto relative">
                  {[
                    { key: 'nationalAnthem', label: '🇮🇳 राष्ट्रगीत (National Anthem)', rows: 11, idx: 0 },
                    { key: 'stateAnthem', label: '🚩 राज्यगीत (State Anthem)', rows: 14, idx: 1 },
                    { key: 'pledge', label: '🇮🇳 प्रतिज्ञा (Pledge)', rows: 17, idx: 2 },
                    { key: 'preamble', label: '🇪🇺 संविधान (Preamble)', rows: 6, idx: 3 },
                    { key: 'prayer', label: '👏🏻 प्रार्थना (Prayer)', rows: 14, idx: 4 },
                  ].map((field) => (
                    <div key={field.key} className="bg-white/90 backdrop-blur-sm p-6 md:p-8 rounded-[2.5rem] border border-green-100 shadow-xl shadow-green-900/5 hover:shadow-2xl hover:shadow-green-900/10 transition-all duration-300 text-center">
                      <label className="inline-block px-4 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-black uppercase tracking-widest mb-4 border border-green-100">{field.label}</label>
                      <textarea
                        rows={field.rows}
                        value={paripathData[field.key] || DEFAULT_ASSEMBLY_ITEMS.mr[field.idx].content}
                        onChange={(e) => setParipathData({ ...paripathData, [field.key]: e.target.value })}
                        className="w-full px-6 py-5 bg-green-50/30 border border-green-100 hover:border-green-300 focus:bg-white rounded-2xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all resize-none text-center font-bold text-slate-800 leading-relaxed"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Panchang Section */}
              <div className="space-y-8 p-8 md:p-12 bg-gradient-to-br from-amber-50/80 to-yellow-100/50 border border-amber-200/60 rounded-[3rem] shadow-[0_8px_30px_rgb(245,158,11,0.12)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-64 h-64 bg-amber-300/20 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/3"></div>
                
                <div className="flex justify-center relative">
                  <h4 className="text-xl md:text-2xl font-black text-amber-800 inline-flex items-center justify-center gap-3 px-8 py-4 bg-white/80 backdrop-blur-md rounded-full shadow-sm border border-amber-100/50 uppercase tracking-widest">
                    🪀 पंचांग (Panchang)
                  </h4>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative">
                  {['day', 'month', 'paksha', 'tithi', 'nakshatra', 'yog', 'sunrise', 'sunset'].map((field) => (
                    <div key={field} className="text-center bg-white/90 backdrop-blur-sm p-5 rounded-[2rem] border border-amber-100 shadow-xl shadow-amber-900/5 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-amber-600 mb-3">{field}</label>
                      <input
                        type="text"
                        value={paripathData[field] || ''}
                        onChange={(e) => setParipathData({ ...paripathData, [field]: e.target.value })}
                        className="w-full px-4 py-3 bg-amber-50/30 border border-amber-100 hover:border-amber-300 focus:bg-white rounded-xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all text-center font-bold text-slate-800"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Suvichar & Proverb */}
              <div className="space-y-8 p-8 md:p-12 bg-gradient-to-br from-violet-50/80 to-fuchsia-100/50 border border-violet-200/60 rounded-[3rem] shadow-[0_8px_30px_rgb(139,92,246,0.12)] relative overflow-hidden">
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-fuchsia-300/20 rounded-full blur-3xl translate-y-1/3 translate-x-1/3"></div>
                
                <div className="bg-white/90 backdrop-blur-sm p-8 md:p-10 rounded-[2.5rem] border border-violet-100 shadow-xl shadow-violet-900/5 hover:shadow-2xl hover:shadow-violet-900/10 transition-all duration-300 text-center relative">
                  <div className="flex justify-center mb-6">
                    <span className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-violet-50 text-violet-700 rounded-full text-xs font-black uppercase tracking-widest border border-violet-100">
                      🪀 सुविचार (Thought)
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={paripathData.thought || ''}
                    onChange={(e) => setParipathData({ ...paripathData, thought: e.target.value })}
                    className="w-full px-6 py-5 bg-violet-50/30 border border-violet-100 hover:border-violet-300 focus:bg-white rounded-2xl focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all resize-none text-center font-bold text-slate-800 text-lg md:text-xl leading-relaxed"
                  />
                </div>
                
                <div className="bg-white/90 backdrop-blur-sm p-8 md:p-10 rounded-[2.5rem] border border-violet-100 shadow-xl shadow-violet-900/5 hover:shadow-2xl hover:shadow-violet-900/10 transition-all duration-300 text-center space-y-8 relative">
                  <div>
                    <div className="flex justify-center mb-6">
                      <span className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-fuchsia-50 text-fuchsia-700 rounded-full text-xs font-black uppercase tracking-widest border border-fuchsia-100">
                        🪀 म्हण (Proverb)
                      </span>
                    </div>
                    <input
                      type="text"
                      value={paripathData.proverb || ''}
                      onChange={(e) => setParipathData({ ...paripathData, proverb: e.target.value })}
                      className="w-full px-6 py-5 bg-fuchsia-50/30 border border-fuchsia-100 hover:border-fuchsia-300 focus:bg-white rounded-2xl focus:outline-none focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-500/10 transition-all text-center font-bold text-slate-800 text-lg md:text-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-violet-500 mb-4">अर्थ (Meaning)</label>
                    <textarea
                      rows={2}
                      value={paripathData.proverbMeaning || ''}
                      onChange={(e) => setParipathData({ ...paripathData, proverbMeaning: e.target.value })}
                      className="w-full px-6 py-5 bg-violet-50/30 border border-violet-100 hover:border-violet-300 focus:bg-white rounded-2xl focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all resize-none text-center font-bold text-slate-800 leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* Dinvishesh */}
              <div className="space-y-8 p-8 md:p-12 bg-gradient-to-br from-sky-50/80 to-blue-100/50 border border-blue-200/60 rounded-[3rem] shadow-[0_8px_30px_rgb(59,130,246,0.12)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-sky-300/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                
                <div className="flex flex-col md:flex-row gap-6 relative">
                  <div className="flex-1 bg-white/90 backdrop-blur-sm p-6 rounded-[2.5rem] border border-blue-100 shadow-xl shadow-blue-900/5 text-center">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-blue-500 mb-4">Date (e.g. ०९ जुलै)</label>
                    <input
                      type="text"
                      value={paripathData.dateMonth || ''}
                      onChange={(e) => setParipathData({ ...paripathData, dateMonth: e.target.value })}
                      className="w-full px-6 py-4 bg-sky-50/30 border border-sky-100 hover:border-sky-300 focus:bg-white rounded-2xl focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all text-center font-bold text-slate-800"
                    />
                  </div>
                  <div className="flex-1 bg-white/90 backdrop-blur-sm p-6 rounded-[2.5rem] border border-blue-100 shadow-xl shadow-blue-900/5 text-center">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-blue-500 mb-4">Day Number (e.g. १९०)</label>
                    <input
                      type="text"
                      value={paripathData.yearDay || ''}
                      onChange={(e) => setParipathData({ ...paripathData, yearDay: e.target.value })}
                      className="w-full px-6 py-4 bg-sky-50/30 border border-sky-100 hover:border-sky-300 focus:bg-white rounded-2xl focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all text-center font-bold text-slate-800"
                    />
                  </div>
                </div>
                
                <div className="bg-white/90 backdrop-blur-sm p-8 rounded-[2.5rem] border border-blue-100 shadow-xl shadow-blue-900/5 hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-300 text-center relative">
                  <div className="flex justify-center mb-6">
                    <span className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-blue-50 text-blue-700 rounded-full text-xs font-black uppercase tracking-widest border border-blue-100">
                      🪀 महत्त्वाच्या घटना (Events)
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={paripathData.events || ''}
                    onChange={(e) => setParipathData({ ...paripathData, events: e.target.value })}
                    className="w-full px-6 py-5 bg-blue-50/30 border border-blue-100 hover:border-blue-300 focus:bg-white rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none text-center font-bold text-slate-800 leading-relaxed"
                  />
                </div>
                
                <div className="bg-white/90 backdrop-blur-sm p-8 rounded-[2.5rem] border border-emerald-100 shadow-xl shadow-emerald-900/5 hover:shadow-2xl hover:shadow-emerald-900/10 transition-all duration-300 text-center relative">
                  <div className="flex justify-center mb-6">
                    <span className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-emerald-50 text-emerald-700 rounded-full text-xs font-black uppercase tracking-widest border border-emerald-100">
                      🪀 जन्मदिवस (Birthdays)
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={paripathData.birthdays || ''}
                    onChange={(e) => setParipathData({ ...paripathData, birthdays: e.target.value })}
                    className="w-full px-6 py-5 bg-emerald-50/30 border border-emerald-100 hover:border-emerald-300 focus:bg-white rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all resize-none text-center font-bold text-slate-800 leading-relaxed"
                  />
                </div>
                
                <div className="bg-white/90 backdrop-blur-sm p-8 rounded-[2.5rem] border border-rose-100 shadow-xl shadow-rose-900/5 hover:shadow-2xl hover:shadow-rose-900/10 transition-all duration-300 text-center relative">
                  <div className="flex justify-center mb-6">
                    <span className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-rose-50 text-rose-700 rounded-full text-xs font-black uppercase tracking-widest border border-rose-100">
                      🪀 मृत्यू / पुण्यतिथी (Deaths)
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={paripathData.deaths || ''}
                    onChange={(e) => setParipathData({ ...paripathData, deaths: e.target.value })}
                    className="w-full px-6 py-5 bg-rose-50/30 border border-rose-100 hover:border-rose-300 focus:bg-white rounded-2xl focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all resize-none text-center font-bold text-slate-800 leading-relaxed"
                  />
                </div>
              </div>

              {/* Story */}
              <div className="space-y-8 p-8 md:p-12 bg-gradient-to-br from-orange-50/80 to-rose-100/50 border border-orange-200/60 rounded-[3rem] shadow-[0_8px_30px_rgb(249,115,22,0.12)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-64 h-64 bg-orange-300/20 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/3"></div>
                
                <div className="bg-white/90 backdrop-blur-sm p-8 md:p-10 rounded-[2.5rem] border border-orange-100 shadow-xl shadow-orange-900/5 hover:shadow-2xl hover:shadow-orange-900/10 transition-all duration-300 text-center space-y-8 relative">
                  <div>
                    <div className="flex justify-center mb-6">
                      <span className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-orange-50 text-orange-700 rounded-full text-xs font-black uppercase tracking-widest border border-orange-100">
                        🪀 बोधकथा (Story Title)
                      </span>
                    </div>
                    <input
                      type="text"
                      value={paripathData.storyTitle || ''}
                      onChange={(e) => setParipathData({ ...paripathData, storyTitle: e.target.value })}
                      className="w-full px-6 py-5 bg-orange-50/30 border border-orange-100 hover:border-orange-300 focus:bg-white rounded-2xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all text-center font-bold text-slate-800 text-lg md:text-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-orange-500 mb-4">Story Content</label>
                    <textarea
                      rows={6}
                      value={paripathData.story || ''}
                      onChange={(e) => setParipathData({ ...paripathData, story: e.target.value })}
                      className="w-full px-6 py-5 bg-orange-50/30 border border-orange-100 hover:border-orange-300 focus:bg-white rounded-2xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all resize-none text-center font-bold text-slate-800 leading-relaxed"
                    />
                  </div>
                  <div className="pt-4 border-t border-orange-100/50">
                    <div className="flex justify-center mb-6">
                      <span className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-rose-50 text-rose-700 rounded-full text-xs font-black uppercase tracking-widest border border-rose-100">
                        तात्पर्य (Moral)
                      </span>
                    </div>
                    <input
                      type="text"
                      value={paripathData.moral || ''}
                      onChange={(e) => setParipathData({ ...paripathData, moral: e.target.value })}
                      className="w-full px-6 py-5 bg-rose-50/30 border border-rose-100 hover:border-rose-300 focus:bg-white rounded-2xl focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all text-center font-bold text-slate-800 text-lg md:text-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Patriotic Song & GK */}
              <div className="space-y-8 p-8 md:p-12 bg-gradient-to-br from-indigo-50/80 to-purple-100/50 border border-indigo-200/60 rounded-[3rem] shadow-[0_8px_30px_rgb(99,102,241,0.12)] relative overflow-hidden">
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-300/20 rounded-full blur-3xl translate-y-1/3 translate-x-1/3"></div>
                
                <div className="bg-white/90 backdrop-blur-sm p-8 md:p-10 rounded-[2.5rem] border border-indigo-100 shadow-xl shadow-indigo-900/5 hover:shadow-2xl hover:shadow-indigo-900/10 transition-all duration-300 text-center space-y-8 relative">
                  <div>
                    <div className="flex justify-center mb-6">
                      <span className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-indigo-50 text-indigo-700 rounded-full text-xs font-black uppercase tracking-widest border border-indigo-100">
                        🪀 देशभक्ती गीत (Song Title)
                      </span>
                    </div>
                    <input
                      type="text"
                      value={paripathData.songTitle || ''}
                      onChange={(e) => setParipathData({ ...paripathData, songTitle: e.target.value })}
                      className="w-full px-6 py-5 bg-indigo-50/30 border border-indigo-100 hover:border-indigo-300 focus:bg-white rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-center font-bold text-slate-800 text-lg md:text-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-4">Lyrics</label>
                    <textarea
                      rows={6}
                      value={paripathData.patrioticSong || ''}
                      onChange={(e) => setParipathData({ ...paripathData, patrioticSong: e.target.value })}
                      className="w-full px-6 py-5 bg-indigo-50/30 border border-indigo-100 hover:border-indigo-300 focus:bg-white rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none text-center font-bold text-slate-800 leading-relaxed"
                    />
                  </div>
                </div>
                
                <div className="bg-white/90 backdrop-blur-sm p-8 md:p-10 rounded-[2.5rem] border border-purple-100 shadow-xl shadow-purple-900/5 hover:shadow-2xl hover:shadow-purple-900/10 transition-all duration-300 text-center relative">
                  <div className="flex justify-center mb-8">
                    <span className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-purple-50 text-purple-700 rounded-full text-sm font-black uppercase tracking-widest border border-purple-100">
                      🪀 सामान्य ज्ञान (GK)
                    </span>
                  </div>
                  <div className="space-y-6">
                    {[1, 2, 3, 4].map((num) => (
                      <div key={`gk${num}`} className="flex flex-col group">
                        <input
                          type="text"
                          placeholder={`Question ${num}`}
                          value={paripathData[`gkQ${num}`] || ''}
                          onChange={(e) => setParipathData({ ...paripathData, [`gkQ${num}`]: e.target.value })}
                          className="w-full px-6 py-5 bg-purple-50/30 border border-purple-100 hover:border-purple-300 focus:bg-white rounded-t-2xl focus:outline-none focus:border-purple-500 transition-all text-center font-bold text-slate-800"
                        />
                        <input
                          type="text"
                          placeholder={`Answer ${num}`}
                          value={paripathData[`gkA${num}`] || ''}
                          onChange={(e) => setParipathData({ ...paripathData, [`gkA${num}`]: e.target.value })}
                          className="w-full px-6 py-4 bg-purple-100/50 border border-purple-200 border-t-0 rounded-b-2xl focus:outline-none focus:bg-purple-100 focus:border-purple-500 transition-all text-center font-black text-purple-900"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Personality */}
              <div className="space-y-8 p-8 md:p-12 bg-gradient-to-br from-teal-50/80 to-cyan-100/50 border border-teal-200/60 rounded-[3rem] shadow-[0_8px_30px_rgb(20,184,166,0.12)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-300/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                
                <div className="bg-white/90 backdrop-blur-sm p-8 md:p-10 rounded-[2.5rem] border border-teal-100 shadow-xl shadow-teal-900/5 hover:shadow-2xl hover:shadow-teal-900/10 transition-all duration-300 text-center space-y-8 relative">
                  <div>
                    <div className="flex justify-center mb-6">
                      <span className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-teal-50 text-teal-700 rounded-full text-xs font-black uppercase tracking-widest border border-teal-100">
                        🪀 थोरव्यक्ती परिचय (Name & Dates)
                      </span>
                    </div>
                    <input
                      type="text"
                      value={paripathData.personalityTitle || ''}
                      onChange={(e) => setParipathData({ ...paripathData, personalityTitle: e.target.value })}
                      className="w-full px-6 py-5 bg-teal-50/30 border border-teal-100 hover:border-teal-300 focus:bg-white rounded-2xl focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all text-center font-bold text-slate-800 text-lg md:text-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-teal-500 mb-4">Biography</label>
                    <textarea
                      rows={6}
                      value={paripathData.personality || ''}
                      onChange={(e) => setParipathData({ ...paripathData, personality: e.target.value })}
                      className="w-full px-6 py-5 bg-teal-50/30 border border-teal-100 hover:border-teal-300 focus:bg-white rounded-2xl focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all resize-none text-center font-bold text-slate-800 leading-relaxed"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
      </main>
      <Footer />
    </div>
  );
}
