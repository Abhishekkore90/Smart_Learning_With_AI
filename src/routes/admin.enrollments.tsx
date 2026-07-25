import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Filter,
  Mail,
  Shield,
  ChevronLeft,
  Loader2,
  BookOpen,
  BadgeCheck,
  GraduationCap,
  CreditCard,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Sparkles,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, doc, getDoc } from "firebase/firestore";

export const Route = createFileRoute("/admin/enrollments")({
  head: () => ({ meta: [{ title: "Enrollment Management — Super Admin" }] }),
  component: EnrollmentsAdmin,
});

interface Enrollment {
  id: string;
  userId: string;
  userName: string;
  courseId: string;
  courseTitle: string;
  category: string;
  priceType: "Free" | "Paid";
  price?: string;
  amount?: string;
  status: "active" | "completed" | "pending";
  paymentStatus: "paid" | "pending" | "free";
  enrolledAt: string;
  progress: number;
}

function EnrollmentsAdmin() {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "paid" | "free" | "active" | "completed"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const isAdmin = sessionStorage.getItem("is_super_admin");
    if (!isAdmin) {
      navigate({
        to: "/login",
        search: { redirect: "/admin/enrollments", role: "admin" } as any,
      });
      return;
    }
    fetchEnrollments();
  }, [navigate]);

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "enrollments"));
      const data = await Promise.all(
        snapshot.docs.map(async (eDoc) => {
          const e = eDoc.data();

          // Fetch course details if not present in enrollment record
          let courseInfo = {
            title: e.courseTitle || "Unknown Course",
            category: e.category || "N/A",
            priceType: e.priceType || "Free",
            amount: e.amount || "0",
          };
          if (!e.courseTitle) {
            try {
              const cDoc = await getDoc(doc(db, "videos", e.courseId));
              if (cDoc.exists()) {
                const c = cDoc.data();
                courseInfo = {
                  title: c.title,
                  category: c.category,
                  priceType: c.priceType === "paid" ? "Paid" : "Free",
                  amount: c.price || "0",
                };
              }
            } catch (err) {}
          }

          // Fetch student name from users collection if missing
          let studentName = e.userName || "Student";
          if (studentName === "Student" || !e.userName) {
            try {
              const uDoc = await getDoc(doc(db, "users", e.userId));
              if (uDoc.exists()) {
                studentName =
                  uDoc.data().fullName || uDoc.data().name || studentName;
              }
            } catch (err) {}
          }

          return {
            id: eDoc.id,
            userId: e.userId,
            userName: studentName,
            courseId: e.courseId,
            courseTitle: courseInfo.title,
            category: courseInfo.category,
            priceType: courseInfo.priceType as any,
            amount: courseInfo.amount,
            status: e.status || "active",
            paymentStatus:
              e.paymentStatus ||
              (courseInfo.priceType === "Paid" ? "paid" : "free"),
            enrolledAt: e.enrolledAt || e.watchedAt || new Date().toISOString(),
            progress: e.progress || 0,
          } as Enrollment;
        }),
      );
      setEnrollments(data);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEnrollments = enrollments.filter((e) => {
    const matchesSearch =
      e.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.courseTitle?.toLowerCase().includes(searchTerm.toLowerCase());

    if (filter === "paid") return matchesSearch && e.priceType === "Paid";
    if (filter === "free") return matchesSearch && e.priceType === "Free";
    if (filter === "active") return matchesSearch && e.status === "active";
    if (filter === "completed")
      return matchesSearch && e.status === "completed";
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-[#111827]">
      <Header />

      <main className="max-w-[1600px] mx-auto px-8 pt-16 pb-24">
        {/* Header Section */}
        <div className="mb-12 space-y-8">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-sm font-black text-[#6B7280] hover:text-indigo-600 uppercase tracking-widest transition-colors"
          >
            <ChevronLeft className="size-4" /> Back to Hub
          </Link>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="space-y-3">
              <h1 className="text-6xl font-black tracking-tighter">
                Student <span className="text-indigo-600">Enrollments.</span>
              </h1>
              <p className="text-[#6B7280] text-lg font-medium">
                Global ledger of platform knowledge transfers and transactions.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[#9CA3AF]" />
                <input
                  type="text"
                  placeholder="Search students or courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-6 py-4 bg-white border border-black/5 rounded-[1.5rem] outline-none focus:border-indigo-600/30 transition-all text-sm font-medium w-80 shadow-sm"
                />
              </div>

              <div className="flex bg-white p-1.5 rounded-2xl border border-black/5 shadow-sm">
                {(["all", "paid", "free", "active"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? "bg-[#111827] text-white shadow-glow-sm" : "text-[#6B7280] hover:bg-gray-50"}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Enrollments Table */}
        <div className="bg-white rounded-[3.5rem] border border-black/5 shadow-soft overflow-hidden relative">
          {loading ? (
            <div className="p-32 flex flex-col items-center justify-center gap-6">
              <div className="relative">
                <Loader2 className="size-16 animate-spin text-indigo-600 opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <CreditCard className="size-6 text-indigo-600" />
                </div>
              </div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600 animate-pulse">
                Syncing Ledger...
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-black/5">
                    <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                      Student Identity
                    </th>
                    <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                      Course Asset
                    </th>
                    <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                      Enrollment Date
                    </th>
                    <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                      Payment Matrix
                    </th>
                    <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                      Status
                    </th>
                    <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  <AnimatePresence>
                    {filteredEnrollments.map((e, i) => (
                      <motion.tr
                        key={e.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="hover:bg-gray-50/50 transition-colors group"
                      >
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-5">
                            <div className="size-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-lg">
                              {e.userName[0]}
                            </div>
                            <div>
                              <div className="font-black text-[#111827] group-hover:text-indigo-600 transition-colors">
                                {e.userName}
                              </div>
                              <div className="text-[10px] text-[#9CA3AF] font-bold uppercase tracking-widest mt-0.5">
                                UID: {e.userId.substring(0, 8)}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-10 py-8">
                          <div className="max-w-xs">
                            <div className="text-sm font-black text-[#111827] leading-tight mb-1 truncate">
                              {e.courseTitle}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black uppercase tracking-widest text-[#6B7280]">
                                {e.category}
                              </span>
                              <div className="size-1 rounded-full bg-gray-300" />
                              <div className="flex items-center gap-1.5">
                                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${e.progress}%` }}
                                    className="h-full bg-indigo-600 rounded-full"
                                  />
                                </div>
                                <span className="text-[9px] font-black text-indigo-600">
                                  {e.progress}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-10 py-8">
                          <div className="flex items-center gap-2.5 text-sm font-bold text-[#111827]">
                            {new Date(e.enrolledAt).toLocaleDateString()}
                          </div>
                        </td>

                        <td className="px-10 py-8">
                          {e.priceType === "Paid" ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg w-fit">
                                <CheckCircle2 className="size-3" />
                                <span className="text-[9px] font-black uppercase tracking-widest">
                                  Paid Success
                                </span>
                              </div>
                              <div className="text-sm font-black text-[#111827] flex items-center gap-1">
                                <DollarSign className="size-3 text-[#9CA3AF]" />
                                {e.amount}{" "}
                                <span className="text-[10px] text-[#9CA3AF] font-bold ml-1 uppercase">
                                  USD
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-2xl w-fit flex items-center gap-2">
                              <Sparkles className="size-3.5" />
                              <span className="text-[10px] font-black uppercase tracking-[0.1em]">
                                Free Course
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="px-10 py-8">
                          <div
                            className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-fit ${
                              e.status === "completed"
                                ? "bg-emerald-100 text-emerald-700"
                                : e.status === "active"
                                  ? "bg-indigo-100 text-indigo-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {e.status === "completed" && (
                              <CheckCircle2 className="size-3" />
                            )}
                            {e.status}
                          </div>
                        </td>

                        <td className="px-10 py-8">
                          <div className="flex items-center gap-2">
                            <button className="p-3 bg-white border border-black/5 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                              <Mail className="size-4" />
                            </button>
                            <button className="p-3 bg-white border border-black/5 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                              <XCircle className="size-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>

              {filteredEnrollments.length === 0 && (
                <div className="p-32 text-center space-y-6">
                  <div className="size-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-gray-200">
                    <Search className="size-10 text-[#9CA3AF]" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black tracking-tight">
                      No Enrollments Found
                    </h3>
                    <p className="text-[#6B7280] font-medium">
                      Try adjusting your filters or search terms.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
