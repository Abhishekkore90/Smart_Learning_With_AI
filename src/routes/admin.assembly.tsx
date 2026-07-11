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
} from "lucide-react";
import { collection, addDoc, getDocs, deleteDoc, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
  }, [navigate]);

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
                Upload and manage Daily Assembly (Paripath) guidebooks and reference PDFs.
              </p>
            </div>
          </div>
        </div>

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
      </main>
      <Footer />
    </div>
  );
}
