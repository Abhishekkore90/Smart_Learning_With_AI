import {
  createFileRoute,
  Link,
  useParams,
  useNavigate,
} from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  BookOpen,
  BadgeCheck,
  ChevronLeft,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  DollarSign,
  TrendingUp,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

export const Route = createFileRoute("/admin/student/$studentId")({
  head: () => ({ meta: [{ title: "Student Dashboard — Super Admin" }] }),
  component: StudentDetailDashboard,
});

interface StudentProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  createdAt: string;
  role: string;
}

interface Enrollment {
  id: string;
  courseId: string;
  courseTitle: string;
  category: string;
  subcategory: string;
  priceType: string;
  amount: string;
  status: string;
  enrolledAt: string;
  progress: number;
}

function StudentDetailDashboard() {
  const { studentId } = useParams({ from: "/admin/student/$studentId" });
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isAdmin = sessionStorage.getItem("is_super_admin");
    if (!isAdmin) {
      navigate({
        to: "/login",
        search: { redirect: `/admin/student/${studentId}`, role: "admin" } as any,
      });
      return;
    }
    fetchStudentData();
  }, [studentId]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Student Profile
      const sDoc = await getDoc(doc(db, "users", studentId));
      if (sDoc.exists()) {
        setStudent({ id: sDoc.id, ...sDoc.data() } as StudentProfile);
      }

      // 2. Fetch Enrollments
      const q = query(
        collection(db, "enrollments"),
        where("userId", "==", studentId),
      );
      const snapshot = await getDocs(q);
      const eData = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as Enrollment,
      );
      setEnrollments(eData);
    } catch (error) {
      console.error("Error fetching student details:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFDFF] flex flex-col items-center justify-center gap-6">
        <Loader2 className="size-12 animate-spin text-indigo-600" />
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#6B7280]">
          Syncing Student Profile...
        </p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-[#FDFDFF] flex flex-col items-center justify-center p-6 text-center gap-6">
        <div className="size-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center shadow-glow-sm">
          <AlertCircle className="size-10" />
        </div>
        <h2 className="text-3xl font-black">Student Not Found</h2>
        <Link
          to="/admin/watchers"
          className="px-8 py-4 bg-[#111827] text-white rounded-2xl font-black uppercase text-xs tracking-widest"
        >
          Back to Registry
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111827]">
      <Header />

      <main className="max-w-7xl mx-auto px-6 pt-16 pb-24">
        {/* Header Section */}
        <div className="mb-12 space-y-6">
          <Link
            to="/admin/watchers"
            className="inline-flex items-center gap-2 text-sm font-black text-[#6B7280] hover:text-indigo-600 uppercase tracking-widest transition-colors"
          >
            <ChevronLeft className="size-4" /> Back to Registry
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
            <div className="flex items-center gap-8">
              <div className="size-24 rounded-[2rem] bg-indigo-600 shadow-glow flex items-center justify-center text-white text-4xl font-black">
                {student.fullName[0]}
              </div>
              <div className="space-y-1">
                <h1 className="text-5xl font-black tracking-tighter">
                  {student.fullName}
                </h1>
                <div className="flex items-center gap-4 text-[#6B7280] font-medium">
                  <div className="flex items-center gap-1.5">
                    <Mail className="size-4" /> {student.email}
                  </div>
                  <div className="size-1 rounded-full bg-gray-300" />
                  <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                    Student Portal
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <a
                href={`mailto:${student.email}?subject=SMART LEARNING Admin: Reach Out&body=Hello ${student.fullName},`}
                className="px-8 py-4 bg-white border border-black/5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-3 shadow-sm hover:shadow-md active:scale-95"
              >
                <Mail className="size-4" /> Message Student
              </a>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            {
              l: "Courses Joined",
              v: enrollments.length,
              i: BookOpen,
              c: "text-indigo-600",
              bg: "bg-indigo-50",
            },
            {
              l: "Completed",
              v: enrollments.filter((e) => e.status === "completed").length,
              i: CheckCircle2,
              c: "text-emerald-500",
              bg: "bg-emerald-50",
            },
            {
              l: "Total Progress",
              v: `${Math.round(enrollments.reduce((acc, curr) => acc + (curr.progress || 0), 0) / (enrollments.length || 1))}%`,
              i: TrendingUp,
              c: "text-amber-500",
              bg: "bg-amber-50",
            },
            {
              l: "Member Since",
              v: new Date(student.createdAt).toLocaleDateString(),
              i: Calendar,
              c: "text-purple-600",
              bg: "bg-purple-50",
            },
          ].map((s, i) => (
            <div
              key={i}
              className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-soft flex flex-col gap-4"
            >
              <div
                className={`size-12 rounded-2xl ${s.bg} flex items-center justify-center ${s.c}`}
              >
                <s.i className="size-6" />
              </div>
              <div>
                <div className="text-3xl font-black tracking-tight">{s.v}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] mt-1">
                  {s.l}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-10">
          {/* Left: Contact & Profile */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white p-10 rounded-[3rem] border border-black/5 shadow-soft space-y-8">
              <h3 className="text-xl font-black tracking-tight">
                Identity Details
              </h3>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="size-10 rounded-xl bg-gray-50 flex items-center justify-center text-[#9CA3AF]">
                    <Phone className="size-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] mb-1">
                      Contact Number
                    </div>
                    <div className="text-sm font-bold">
                      {student.phone || "Not provided"}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="size-10 rounded-xl bg-gray-50 flex items-center justify-center text-[#9CA3AF]">
                    <MapPin className="size-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] mb-1">
                      Physical Address
                    </div>
                    <div className="text-sm font-bold leading-relaxed">
                      {student.address || "No address on record"}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="size-10 rounded-xl bg-gray-50 flex items-center justify-center text-[#9CA3AF]">
                    <CreditCard className="size-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] mb-1">
                      Billing Status
                    </div>
                    <div className="text-sm font-bold">Standard Account</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Enrollment History */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-10 rounded-[3.5rem] border border-black/5 shadow-soft">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-2xl font-black tracking-tight">
                  Learning Ledger
                </h3>
                <div className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                  {enrollments.length} Enrollments
                </div>
              </div>

              {enrollments.length === 0 ? (
                <div className="py-20 text-center space-y-4 opacity-50">
                  <PlayCircle className="size-12 mx-auto text-gray-300" />
                  <p className="font-bold text-[#6B7280]">
                    No course activity found yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {enrollments.map((e, i) => (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-8 bg-[#F8FAFF] rounded-[2.5rem] border border-black/5 flex flex-col md:flex-row md:items-center justify-between gap-8 group hover:border-indigo-600/20 transition-all"
                    >
                      <div className="flex items-center gap-6">
                        <div className="size-16 rounded-[1.5rem] bg-white shadow-soft flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                          <PlayCircle className="size-8" />
                        </div>
                        <div>
                          <h4 className="text-lg font-black tracking-tight mb-1">
                            {e.courseTitle}
                          </h4>
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                              {e.category}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                              {e.subcategory}
                            </span>
                            <div
                              className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                e.priceType === "Paid"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-blue-50 text-blue-600"
                              }`}
                            >
                              {e.priceType === "Paid"
                                ? `PAID ($${e.amount})`
                                : "FREE COURSE"}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-10">
                        <div className="text-right">
                          <div className="text-xs font-black text-[#111827]">
                            {e.progress || 0}% Completed
                          </div>
                          <div className="w-32 h-1.5 bg-white rounded-full mt-2 overflow-hidden border border-black/5">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${e.progress || 0}%` }}
                              className="h-full bg-indigo-600 rounded-full"
                            />
                          </div>
                        </div>
                        <div className="size-12 rounded-2xl bg-white flex items-center justify-center text-[#111827] border border-black/5">
                          <ChevronRight className="size-5" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
