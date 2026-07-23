import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Filter,
  Mail,
  Shield,
  UserX,
  Star,
  ChevronLeft,
  Loader2,
  BookOpen,
  BadgeCheck,
  GraduationCap,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export const Route = createFileRoute("/admin/watchers")({
  head: () => ({ meta: [{ title: "Student Management — Super Admin" }] }),
  component: StudentsAdmin,
});

interface Student {
  id: string;
  n: string;
  e: string;
  j: string;
  courses: number;
  status: string;
  phone?: string;
  address?: string;
}

function StudentsAdmin() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const isAdmin = sessionStorage.getItem("is_super_admin");
    if (!isAdmin) {
      navigate({
        to: "/login",
        search: { redirect: "/admin/watchers", role: "admin" } as any,
      });
      return;
    }

    fetchStudents();
  }, [navigate]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // 1. Fetch Students
      const q = query(collection(db, "users"), where("role", "==", "student"));
      const snapshot = await getDocs(q);

      // 2. Fetch all enrollments to count courses per student
      const enrollSnap = await getDocs(collection(db, "enrollments"));
      const enrollMap: Record<string, number> = {};
      enrollSnap.docs.forEach((doc) => {
        const d = doc.data();
        // Check various ID fields for compatibility
        const uid =
          d.userId ||
          d.studentId ||
          d.uid ||
          (doc.id.includes("_") ? doc.id.split("_")[0] : null);
        if (uid) {
          enrollMap[uid] = (enrollMap[uid] || 0) + 1;
        }
      });

      const data = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          n: d.fullName || d.name || "Student",
          e: d.email || "N/A",
          j: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "N/A",
          courses: enrollMap[doc.id] || 0,
          status: (enrollMap[doc.id] || 0) > 0 ? "Learning" : "Inactive",
          phone: d.phone,
          address: d.address,
        } as Student;
      });

      setStudents(data);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.n?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.e?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-[#111827]">
      <Header />

      <main className="max-w-[1440px] mx-auto px-6 pt-16 pb-24">
        {/* Header */}
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
                System <span className="text-indigo-600">Students.</span>
              </h1>
              <p className="text-[#6B7280] font-medium">
                Monitor engagement and track course progress across the
                platform.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[#9CA3AF]" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-6 py-4 bg-white border border-black/5 rounded-2xl outline-none focus:border-indigo-600/30 transition-all text-sm font-medium w-72 shadow-sm"
                />
              </div>
              <button className="px-6 py-4 bg-[#111827] text-white rounded-2xl flex items-center gap-3 text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-glow-sm">
                <Filter className="size-4" /> Filter
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-[3rem] border border-black/5 shadow-soft overflow-hidden">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="size-10 animate-spin text-indigo-600" />
              <p className="text-xs font-black uppercase tracking-widest text-[#6B7280]">
                Syncing Student Database...
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-black/5">
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                      Full Name & Identity
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                      Enrollments
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                      Contact
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                      Registration
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                      Status
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  <AnimatePresence>
                    {filteredStudents.map((s, i) => (
                      <motion.tr
                        key={s.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="hover:bg-gray-50/50 transition-colors group"
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="size-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black">
                              {s.n[0]}
                            </div>
                            <div>
                              <Link
                                to="/admin/student/$studentId"
                                params={{ studentId: s.id }}
                                className="font-black text-[#111827] hover:text-indigo-600 transition-colors cursor-pointer"
                              >
                                {s.n}
                              </Link>
                              <div className="text-[10px] text-[#6B7280] font-bold uppercase tracking-widest">
                                {s.id.substring(0, 8)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                              <BookOpen className="size-4" />
                            </div>
                            <div>
                              <div className="text-sm font-black">
                                {s.courses} Courses
                              </div>
                              <div className="text-[10px] font-bold text-[#6B7280] uppercase tracking-tighter">
                                Watched Content
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-[#111827]">
                              {s.e}
                            </div>
                            <div className="text-[10px] font-medium text-[#6B7280]">
                              {s.phone || "No Phone"}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-sm font-black text-[#111827]">
                          <div className="flex items-center gap-2">{s.j}</div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-fit">
                            <BadgeCheck className="size-3" /> {s.status}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            <Link
                              to="/admin/student/$studentId"
                              params={{ studentId: s.id }}
                              className="p-3 hover:bg-white rounded-xl transition-colors text-[#6B7280] hover:text-indigo-600 shadow-sm border border-transparent hover:border-black/5"
                              title="View Dashboard"
                            >
                              <GraduationCap className="size-4" />
                            </Link>
                            <button
                              className="p-3 hover:bg-white rounded-xl transition-colors text-[#6B7280] hover:text-red-500 shadow-sm border border-transparent hover:border-black/5"
                              title="Restrict Access"
                            >
                              <UserX className="size-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
              {filteredStudents.length === 0 && (
                <div className="p-20 text-center space-y-4">
                  <div className="size-16 bg-gray-50 text-[#9CA3AF] rounded-full flex items-center justify-center mx-auto">
                    <Search className="size-8" />
                  </div>
                  <h3 className="text-xl font-black">No Students Found</h3>
                  <p className="text-sm text-[#6B7280] font-medium">
                    Try adjusting your search criteria or filters.
                  </p>
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
