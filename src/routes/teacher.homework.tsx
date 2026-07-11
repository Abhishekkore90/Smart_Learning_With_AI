import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Book,
  Languages,
  Beaker,
  Calculator,
  Globe,
  ScrollText,
  Users,
  Plus,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  ArrowRight,
  MoreVertical,
  Trash2,
  Edit3,
  Share2,
  Download,
  MessageCircle,
  Hash,
  GraduationCap,
  ChevronRight,
  Zap,
  Send as SendIcon,
  Star,
  Trophy,
  Award,
  Rocket,
  ChevronLeft,
} from "lucide-react";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { useState, useMemo, useEffect } from "react";
import { showToast as toast } from "@/lib/custom-toast";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

export const Route = createFileRoute("/teacher/homework")({
  component: HomeworkPage,
});

const CLASSES = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
const SUBJECTS = [
  {
    id: "marathi",
    name: "Marathi",
    icon: Languages,
    color: "bg-pink-500",
    gradient: "from-pink-500 to-rose-600",
  },
  {
    id: "hindi",
    name: "Hindi",
    icon: Languages,
    color: "bg-orange-500",
    gradient: "from-orange-500 to-amber-600",
  },
  {
    id: "english",
    name: "English",
    icon: Book,
    color: "bg-blue-500",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    id: "science",
    name: "Science",
    icon: Beaker,
    color: "bg-emerald-500",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    id: "maths",
    name: "Maths",
    icon: Calculator,
    color: "bg-violet-500",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    id: "geography",
    name: "Geography",
    icon: Globe,
    color: "bg-cyan-500",
    gradient: "from-cyan-500 to-sky-600",
  },
  {
    id: "history",
    name: "History",
    icon: ScrollText,
    color: "bg-amber-600",
    gradient: "from-amber-600 to-yellow-700",
  },
  {
    id: "civics",
    name: "Civics",
    icon: Users,
    color: "bg-slate-600",
    gradient: "from-slate-600 to-slate-800",
  },
];

function HomeworkPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (sessionStorage.getItem("is_super_admin")) {
        // Super Admin is allowed
      } else if (!user || profile?.role !== "teacher") {
        navigate({
          to: "/login",
          search: { redirect: "/teacher/homework", role: "teacher" } as any,
        });
      }
    }
  }, [user, profile, authLoading, navigate]);
  const [selectedClass, setSelectedClass] = useState("1st");
  const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[0]);
  const [homeworkText, setHomeworkText] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Table state
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [mounted, setMounted] = useState(false);

  // Persistence Logic (Firestore)
  const [savedHomework, setSavedHomework] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    const q = query(collection(db, "homework"), orderBy("postedAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSavedHomework(data);
    });

    return () => unsubscribe();
  }, []);

  const handlePostHomework = async () => {
    if (!homeworkText) {
      toast.error("Please enter homework details!");
      return;
    }
    setIsSubmitting(true);

    try {
      const newEntry = {
        subjectId: selectedSubject.id,
        subjectName: selectedSubject.name,
        class: selectedClass,
        text: homeworkText,
        dueDate: dueDate || "Not Set",
        timeLimit: "Untimed",
        attempts: "0/1",
        score: "-",
        postedAt: new Date().toISOString(),
        color: selectedSubject.gradient,
        teacherName:
          user?.displayName || user?.email?.split("@")[0] || "Professor",
      };

      await addDoc(collection(db, "homework"), newEntry);

      setHomeworkText("");
      toast.success(`Homework for ${selectedSubject.name} saved!`);
    } catch (error: any) {
      toast.error("Failed to post homework");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteHomework = async (id: string) => {
    try {
      await deleteDoc(doc(db, "homework", id));
      toast.info("Assignment removed.");
    } catch (error) {
      toast.error("Failed to delete homework");
    }
  };

  const filteredData = useMemo(() => {
    return savedHomework.filter((hw) => {
      const matchSearch =
        hw.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hw.subjectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hw.class?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [savedHomework, searchTerm]);

  const totalEntries = filteredData.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * entriesPerPage,
    currentPage * entriesPerPage,
  );

  return (
    <div className="min-h-screen bg-[#FDFEFF]">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-64 pt-16 min-h-screen">
        <div className="p-6 md:p-12 space-y-12 max-w-[1600px] mx-auto">
          {/* Integrated LMS Style Table Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden"
          >
            {/* Image 2 Header Style with Dashboard Branding */}
            <div className="p-10 md:p-12 pb-6 flex items-end justify-between">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                  My Class Homeworks
                </h1>
                <p className="text-slate-400 font-bold text-sm mt-1 uppercase tracking-widest">
                  {user?.displayName ||
                    user?.email?.split("@")[0] ||
                    "Professor"}
                </p>
              </div>
              <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                <button className="px-6 py-2 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
                  Detailed View
                </button>
                <button className="px-6 py-2 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
                  Analytics
                </button>
              </div>
            </div>

            <div className="px-10 md:p-12 pt-0">
              {/* Table Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-t border-slate-50 pt-10">
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
                <div className="flex items-center gap-4">
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
                      placeholder="SEARCH ASSIGNMENTS..."
                    />
                  </div>
                </div>
              </div>

              {/* LMS Enhanced Table (Merging Image 1 and Image 2) */}
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
                    {!mounted ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-8 py-24 text-center text-slate-300 font-black uppercase tracking-[0.4em] text-xs italic"
                        >
                          Synchronizing...
                        </td>
                      </tr>
                    ) : paginatedData.length > 0 ? (
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
                              {new Date(hw.dueDate).toLocaleDateString() ===
                              "Invalid Date"
                                ? hw.dueDate
                                : new Date(hw.dueDate).toLocaleDateString()}
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
                            <div className="flex items-center justify-end gap-4">
                              <button className="px-6 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all">
                                VIEW DETAIL
                              </button>
                              <button
                                onClick={() => deleteHomework(hw.id)}
                                className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-8 py-24 text-center text-slate-300 font-black uppercase tracking-[0.3em] text-xs italic"
                        >
                          Initial Search: No Assignments Found
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
          </motion.div>

          {/* Posting Studio (Simplified for Dashboard Flow) */}
          <div className="xl:col-span-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-12 rounded-[4rem] shadow-sm border border-slate-100 relative overflow-hidden"
            >
              <div className="flex items-center gap-6 mb-10 overflow-x-auto no-scrollbar pb-2">
                {CLASSES.map((cls) => (
                  <button
                    key={cls}
                    onClick={() => setSelectedClass(cls)}
                    className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${selectedClass === cls ? "bg-slate-900 text-white shadow-xl" : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`}
                  >
                    {cls} CLASS
                  </button>
                ))}
              </div>

              <div className="grid md:grid-cols-4 gap-8">
                <div className="md:col-span-2">
                  <div className="bg-slate-50 rounded-[2.5rem] p-10 border-2 border-transparent focus-within:bg-white focus-within:border-indigo-500/10 transition-all shadow-inner">
                    <textarea
                      value={homeworkText}
                      onChange={(e) => setHomeworkText(e.target.value)}
                      placeholder="Describe the new assignment..."
                      className="w-full h-64 bg-transparent outline-none text-xl font-bold text-slate-700 placeholder:text-slate-200 resize-none italic"
                    />
                  </div>
                </div>
                <div className="md:col-span-1 space-y-4">
                  <div className="bg-slate-50 rounded-2xl p-6 flex items-center gap-4">
                    <Calendar className="size-5 text-slate-300" />
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="bg-transparent outline-none w-full text-[10px] font-black text-slate-900 uppercase tracking-widest cursor-pointer"
                    />
                  </div>
                  <select
                    value={selectedSubject.id}
                    onChange={(e) =>
                      setSelectedSubject(
                        SUBJECTS.find((s) => s.id === e.target.value) ||
                          SUBJECTS[0],
                      )
                    }
                    className="w-full h-14 px-6 bg-slate-50 rounded-2xl border-none text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-1 flex items-end">
                  <button
                    onClick={handlePostHomework}
                    disabled={isSubmitting}
                    className="w-full h-20 bg-indigo-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-indigo-200 flex items-center justify-center gap-4 hover:bg-indigo-700 transition-all"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <>
                        <Rocket size={20} /> POST
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
