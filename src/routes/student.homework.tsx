import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  Calendar,
  Clock,
  ArrowLeft,
  Sparkles,
  GraduationCap,
  Search,
  CheckCircle2,
  Book,
  Languages,
  Beaker,
  Calculator,
  Globe,
  ScrollText,
  Users,
  MessageCircle,
  ChevronRight,
  MapPin,
  Star,
  ArrowRight,
  Trophy,
  Trash2,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { StudentSidebar } from "@/components/student/StudentSidebar";
import { StudentHeader } from "@/components/student/StudentHeader";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/student/homework")({
  component: StudentHomeworkPage,
});

const CLASSES = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

function StudentHomeworkPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [selectedClass, setSelectedClass] = useState("1st");
  const [homeworkList, setHomeworkList] = useState<any[]>([]);

  // Table state
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (sessionStorage.getItem("is_super_admin")) {
        // Super Admin is allowed
      } else if (!user || profile?.role !== "student") {
        navigate({
          to: "/login",
          search: { redirect: "/student/homework", role: "student" } as any,
        });
        return;
      }
    }
    setMounted(true);
    const q = query(collection(db, "homework"), orderBy("postedAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setHomeworkList(data);
    });

    return () => unsubscribe();
  }, []);

  const filteredData = useMemo(() => {
    return homeworkList.filter((hw) => {
      const matchClass = hw.class === selectedClass;
      const matchSearch =
        hw.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hw.subjectName?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchClass && matchSearch;
    });
  }, [homeworkList, selectedClass, searchTerm]);

  const totalEntries = filteredData.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * entriesPerPage,
    currentPage * entriesPerPage,
  );

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white">
      <StudentHeader />
      <StudentSidebar />

      <main className="lg:pl-64 pt-16 min-h-screen bg-slate-50/50">
        <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto">
          {/* Synchronized LMS Style Table Section */}
          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-10 md:p-12 pb-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic">
                  My Class Homeworks
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">
                    Class:
                  </span>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="bg-slate-50 border-none text-[10px] font-black uppercase tracking-widest text-indigo-600 outline-none cursor-pointer"
                  >
                    {CLASSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <span className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">
                    | Status: Synchronized
                  </span>
                </div>
              </div>
              <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 self-start">
                <button className="px-6 py-2 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
                  Current
                </button>
                <button className="px-6 py-2 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
                  Archive
                </button>
              </div>
            </div>

            <div className="p-8 md:p-12">
              {/* Table Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Show
                  <select
                    className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 outline-none text-slate-900"
                    value={entriesPerPage}
                    onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  entries
                </div>
                <div className="relative">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                    size={16}
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-slate-50/50 border border-slate-100 rounded-2xl pl-12 pr-6 py-3 text-[11px] font-black uppercase tracking-widest outline-none focus:bg-white focus:border-indigo-500 transition-all w-72"
                    placeholder="SEARCH TASKS..."
                  />
                </div>
              </div>

              {/* Identical LMS Table UI */}
              <div className="overflow-x-auto rounded-[2rem] border border-slate-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800">
                      <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center w-16">
                        Sr.No.
                      </th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2">
                        Due <Clock size={14} className="text-slate-400" />
                      </th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-white">
                        Assignment Brief
                      </th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-white text-center">
                        Time Limit
                      </th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-white text-center">
                        Attempts
                      </th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-white text-center">
                        Gradebook Score
                      </th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-white text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paginatedData.length > 0 ? (
                      paginatedData.map((hw, idx) => (
                        <tr
                          key={hw.id}
                          className={`${idx % 2 === 0 ? "bg-white" : "bg-indigo-50/20"} hover:bg-indigo-50/50 transition-colors group`}
                        >
                          <td className="px-6 py-6 text-center">
                            <span className="text-[10px] font-black text-slate-400">
                              {(currentPage - 1) * entriesPerPage + idx + 1}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-relaxed">
                              {hw.dueDate}
                              <br />
                              <span className="text-slate-400">1:00pm</span>
                            </p>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="size-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs shadow-sm">
                                H
                              </div>
                              <Link
                                to="."
                                className="text-sm font-black text-indigo-600 hover:underline decoration-2 underline-offset-4 italic"
                              >
                                {hw.text}
                              </Link>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {hw.timeLimit || "Untimed"}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {hw.attempts || "0/1"}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button className="text-[10px] font-black text-indigo-600 hover:underline underline-offset-2 uppercase tracking-widest">
                              {hw.score !== "-"
                                ? `SEE SCORE (${hw.score})`
                                : "SEE SCORE"}
                            </button>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl">
                              View Task
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-8 py-24 text-center text-slate-300 font-black uppercase tracking-[0.4em] text-xs italic"
                        >
                          No Assignments Found For {selectedClass}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer / Pagination */}
              <div className="mt-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Showing{" "}
                  {Math.min(
                    (currentPage - 1) * entriesPerPage + 1,
                    totalEntries,
                  )}{" "}
                  to {Math.min(currentPage * entriesPerPage, totalEntries)} of{" "}
                  {totalEntries} entries
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                    className="px-8 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-400 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-50 transition-all uppercase tracking-widest"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (p) => (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`size-10 rounded-xl text-[10px] font-black transition-all ${currentPage === p ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100" : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`}
                        >
                          {p}
                        </button>
                      ),
                    )}
                  </div>
                  <button
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                    className="px-8 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-400 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-50 transition-all uppercase tracking-widest"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Institutional Banner */}
          <div className="p-10 bg-slate-900 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
            <div className="flex items-center gap-6">
              <div className="size-16 rounded-2xl bg-white/10 flex items-center justify-center text-indigo-300">
                <BookOpen className="size-8" />
              </div>
              <div>
                <h4 className="text-xl font-black italic tracking-tight">
                  Sync Status: Active
                </h4>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  Your local assignment database is up to date with teacher
                  postings.
                </p>
              </div>
            </div>
            <button className="px-10 py-5 bg-white text-slate-950 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-xl">
              Report Discrepancy
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
