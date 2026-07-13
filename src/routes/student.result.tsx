import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Search,
  Download,
  Calendar,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  Award,
  BookOpen,
} from "lucide-react";
import { StudentHeader } from "@/components/student/StudentHeader";
import { StudentSidebar } from "@/components/student/StudentSidebar";
import { useState, useMemo, useEffect } from "react";
import { showToast as toast } from "@/lib/custom-toast";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

export const Route = createFileRoute("/student/result")({
  component: StudentResultsPage,
});

function StudentResultsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [resultsList, setResultsList] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setMounted(true);
    if (!authLoading) {
      if (sessionStorage.getItem("is_super_admin")) {
        // Super admin allowed
      } else if (!user || profile?.role !== "student") {
        navigate({
          to: "/login",
          search: { redirect: "/student/result", role: "student" } as any,
        });
      }
    }
  }, [user, profile, authLoading, navigate]);

  // Fetch results based on student's class standard
  useEffect(() => {
    if (!user || !profile?.class) return;

    // Normalizing class standard (e.g. if profile class is "4" or "4th", try to match "4th")
    let studentClass = profile.class;
    if (!studentClass.toLowerCase().endsWith("th") && !studentClass.toLowerCase().endsWith("st") && !studentClass.toLowerCase().endsWith("nd") && !studentClass.toLowerCase().endsWith("rd")) {
      // If it's a number, map it:
      const suffixMap: Record<string, string> = {
        "1": "1st", "2": "2nd", "3": "3rd", "4": "4th", "5": "5th",
        "6": "6th", "7": "7th", "8": "8th", "9": "9th", "10": "10th"
      };
      studentClass = suffixMap[studentClass] || studentClass;
    }

    const q = query(
      collection(db, "results"),
      where("class", "==", studentClass)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Sort in memory since Firestore compound queries with where & order-by require composite indexes
      data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setResultsList(data);
    });

    return () => unsubscribe();
  }, [user, profile]);

  // Download trigger
  const handleDownloadFile = (result: any) => {
    try {
      const link = document.createElement("a");
      link.href = result.fileContent;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloading "${result.fileName}"`);
    } catch (err) {
      toast.error("Failed to download file");
    }
  };

  // Search Filter
  const filteredData = useMemo(() => {
    return resultsList.filter((res) => {
      const matchSearch =
        res.examTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        res.fileName?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [resultsList, searchTerm]);

  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">
            Loading results...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <StudentHeader />
      <StudentSidebar />

      <main className="lg:pl-64 pt-16 min-h-screen">
        <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto">
          {/* Welcome/Header card */}
          <div className="bg-white p-10 md:p-14 rounded-[4rem] border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] size-96 bg-indigo-50 rounded-full blur-3xl -z-10" />
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100 text-[10px] font-black uppercase tracking-[0.3em]">
                <Award size={14} /> Academic Performance Records
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-[0.9] italic">
                My <span className="text-indigo-600">Results</span> & Marksheets
              </h1>
              <p className="text-slate-400 text-sm font-semibold uppercase tracking-widest">
                Class: {profile?.class || "N/A"} Standard
              </p>
            </div>
          </div>

          {/* Search Bar & Stats */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border border-slate-200 rounded-2xl pl-12 pr-6 py-4 text-[11px] font-black uppercase tracking-widest outline-none focus:border-indigo-500 transition-all w-full shadow-sm"
                placeholder="Search result files..."
              />
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
              Total Reports: <span className="text-slate-900 font-black">{filteredData.length}</span>
            </div>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredData.length > 0 ? (
              filteredData.map((res, idx) => (
                <motion.div
                  key={res.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm flex flex-col justify-between hover:shadow-xl transition-all duration-300 relative group"
                >
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="size-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black shadow-sm">
                        <FileSpreadsheet className="size-6 text-indigo-600" />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Calendar size={12} /> {res.dateStr}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-slate-900 leading-tight truncate">
                        {res.examTitle}
                      </h3>
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest truncate">
                        File: {res.fileName}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400">
                      <span>Uploaded By:</span>
                      <span className="text-slate-900 font-black uppercase tracking-wider">{res.uploadedBy}</span>
                    </div>
                  </div>

                  <div className="mt-8">
                    <button
                      onClick={() => handleDownloadFile(res)}
                      className="w-full py-4 bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl font-black text-[9px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-indigo-600 hover:text-white transition-all shadow-sm group"
                    >
                      <Download size={14} className="group-hover:scale-110 transition-transform" /> Download Marksheet
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border border-slate-200">
                <div className="size-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                  <FileText size={40} />
                </div>
                <h3 className="text-slate-400 font-black uppercase tracking-widest text-xs">
                  No academic results uploaded
                </h3>
                <p className="text-slate-300 text-[10px] font-bold mt-2 italic">
                  Results uploaded by your teachers for Class {profile?.class || "your class"} will show up here.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
