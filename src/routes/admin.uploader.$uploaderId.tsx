import {
  createFileRoute,
  Link,
  useParams,
  useNavigate,
} from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Mail,
  Calendar,
  Video,
  Eye,
  BarChart3,
  ChevronLeft,
  Star,
  Globe,
  Lock,
  Unlock,
  ArrowUpRight,
  Settings,
  BadgeCheck,
  FileText,
  LayoutDashboard,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/uploader/$uploaderId")({
  head: () => ({ meta: [{ title: "Creator Dashboard — Super Admin" }] }),
  component: UploaderDetailDashboard,
});

// Fallback Mock Data for demo IDs
const MOCK_FALLBACK = {
  n: "Premium Academy",
  e: "support@SMART LEARNING.io",
  j: "2024-01-01",
  s: "Verified",
  plan: "Premium",
  bio: "Academy profile not yet fully configured by the creator.",
  location: "Global Office",
  phone: "N/A",
  courses: [],
};

function UploaderDetailDashboard() {
  const { uploaderId } = useParams({ from: "/admin/uploader/$uploaderId" });
  const navigate = useNavigate();
  const [uploader, setUploader] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isAdmin = sessionStorage.getItem("is_super_admin");
    if (!isAdmin) {
      navigate({
        to: "/login",
        search: { redirect: `/admin/uploader/${uploaderId}`, role: "admin" } as any,
      });
      return;
    }

    const fetchData = async () => {
      try {
        const { collection, query, where, getDocs, doc, getDoc } =
          await import("firebase/firestore");

        // 1. Fetch User Profile
        const userDoc = await getDoc(doc(db, "users", uploaderId));
        let profileData = MOCK_FALLBACK;

        if (userDoc.exists()) {
          const ud = userDoc.data();
          profileData = {
            ...profileData,
            n: ud.name || ud.fullName || "Unknown Creator",
            e: ud.email || "N/A",
            j: ud.createdAt
              ? new Date(ud.createdAt).toLocaleDateString()
              : "N/A",
            phone: ud.phone || "N/A",
            location: ud.address || ud.location || "N/A",
          };
        }

        // 2. Fetch User Videos
        const q = query(
          collection(db, "videos"),
          where("uploaderId", "==", uploaderId),
        );
        const vSnap = await getDocs(q);
        const courses = vSnap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            t: d.title,
            cat: d.category,
            sub: d.subcategory,
            type: d.priceType || (d.isFree ? "Free" : "Paid"),
            views: d.views || "0",
            date: d.createdAt
              ? new Date(d.createdAt).toLocaleDateString()
              : "N/A",
            img: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=400",
          };
        });

        setUploader({
          ...profileData,
          courses,
        });
      } catch (error) {
        console.error("Error fetching creator data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [uploaderId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#F8FAFF]">
        <Loader2 className="size-10 animate-spin text-purple-600" />
        <p className="font-black uppercase tracking-widest text-xs text-[#6B7280]">
          Loading Creator Portfolio...
        </p>
      </div>
    );
  }

  if (!uploader)
    return (
      <div className="p-20 text-center font-black uppercase text-red-600">
        Creator Not Found
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F8FAFF] text-[#111827] selection:bg-purple-500/20">
      <main className="max-w-[1440px] mx-auto px-6 pt-16 pb-24">
        {/* Navigation */}
        <div className="mb-12">
          <Link
            to="/admin/uploaders"
            className="inline-flex items-center gap-2 text-sm font-black text-[#6B7280] hover:text-purple-600 uppercase tracking-widest transition-colors"
          >
            <ChevronLeft className="size-4" /> All Creators
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* LEFT: Profile Card */}
          <div className="lg:col-span-1 space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-[3rem] p-10 border border-black/5 shadow-soft relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 rounded-bl-full" />

              <div className="relative z-10 text-center">
                <div className="size-24 rounded-[2rem] bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 mx-auto mb-6 shadow-card">
                  <Building2 className="size-10" />
                </div>
                <h1 className="text-3xl font-black tracking-tight mb-2">
                  {uploader.n}
                </h1>
                <div className="flex items-center justify-center gap-2 mb-8">
                  <span
                    className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      uploader.s === "Elite"
                        ? "bg-purple-100 text-purple-700"
                        : uploader.s === "Verified"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {uploader.s} Status
                  </span>
                  <span
                    className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      uploader.plan === "Premium"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {uploader.plan} Plan
                  </span>
                </div>

                <div className="space-y-6 text-left">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#F8FAFF] border border-black/5">
                    <Mail className="size-5 text-[#9CA3AF]" />
                    <div className="overflow-hidden">
                      <div className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
                        Official Email
                      </div>
                      <div className="text-sm font-bold truncate">
                        {uploader.e}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#F8FAFF] border border-black/5">
                    <Calendar className="size-5 text-[#9CA3AF]" />
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
                        Joined Platform
                      </div>
                      <div className="text-sm font-bold">{uploader.j}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#F8FAFF] border border-black/5">
                    <Globe className="size-5 text-[#9CA3AF]" />
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
                        Headquarters
                      </div>
                      <div className="text-sm font-bold">
                        {uploader.location}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#F8FAFF] border border-black/5">
                    <BarChart3 className="size-5 text-[#9CA3AF]" />
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
                        Contact Number
                      </div>
                      <div className="text-sm font-bold">{uploader.phone}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-10 pt-10 border-t border-black/5">
                  <p className="text-sm text-[#6B7280] leading-relaxed font-medium italic">
                    "{uploader.bio}"
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-soft text-center">
                <div className="text-3xl font-black text-purple-600 mb-1">
                  {uploader.courses.length}
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
                  Total Courses
                </div>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-soft text-center">
                <div className="text-3xl font-black text-emerald-600 mb-1">
                  {uploader.courses
                    .reduce(
                      (acc: number, c: any) => acc + parseFloat(c.views || "0"),
                      0,
                    )
                    .toFixed(1)}
                  k
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
                  Total Views
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Courses Table */}
          <div className="lg:col-span-2 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[3rem] border border-black/5 shadow-soft overflow-hidden"
            >
              <div className="px-10 py-8 border-b border-black/5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">
                    Uploaded Content
                  </h2>
                  <p className="text-xs text-[#6B7280] font-medium mt-1">
                    Detailed list of all modules published by this creator.
                  </p>
                </div>
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                  <Video className="size-5" />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                        Course Details
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                        Category
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                        Type
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                        Engagement
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {uploader.courses.map((course: any, i: number) => (
                      <tr
                        key={course.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <img
                              src={course.img}
                              className="size-14 rounded-xl object-cover shadow-sm border border-black/5"
                            />
                            <div>
                              <div className="font-black text-sm text-[#111827]">
                                {course.t}
                              </div>
                              <div className="text-[10px] text-[#6B7280] font-bold mt-1 uppercase tracking-wider flex items-center gap-2">
                                {course.date}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="space-y-1">
                            <div className="text-xs font-black text-[#111827]">
                              {course.cat}
                            </div>
                            <div className="text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-md inline-block">
                              {course.sub}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div
                            className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${course.type === "Paid" ? "text-amber-600" : "text-emerald-600"}`}
                          >
                            {course.type === "Paid" ? (
                              <Lock className="size-3" />
                            ) : (
                              <Unlock className="size-3" />
                            )}
                            {course.type}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-gray-50 flex items-center justify-center text-[#6B7280]">
                              <Eye className="size-4" />
                            </div>
                            <div>
                              <div className="text-sm font-black">
                                {course.views}
                              </div>
                              <div className="text-[10px] font-bold text-[#6B7280] uppercase tracking-tighter">
                                Total Watches
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button className="p-3 bg-purple-600 text-white rounded-xl shadow-glow-sm hover:scale-105 transition-all">
                            <ArrowUpRight className="size-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Performance Chart Placeholder */}
            <div className="p-10 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-[3rem] text-white shadow-glow flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-4 py-1 rounded-full bg-white/10 border border-white/20 w-fit">
                  <BarChart3 className="size-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Growth Analytics
                  </span>
                </div>
                <h3 className="text-3xl font-black">Creator Performance</h3>
                <p className="text-white/70 max-w-sm font-medium">
                  This creator has seen a 12% increase in course engagement over
                  the last 30 days.
                </p>
              </div>
              <div className="flex gap-4">
                <button className="px-8 py-4 bg-white text-purple-600 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all">
                  Download Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
