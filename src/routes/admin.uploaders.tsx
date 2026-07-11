import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Video,
  Search,
  Filter,
  Mail,
  BadgeCheck,
  XCircle,
  BarChart3,
  ChevronLeft,
  Building2,
  Loader2,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export const Route = createFileRoute("/admin/uploaders")({
  head: () => ({ meta: [{ title: "Creator Management — Super Admin" }] }),
  component: UploadersAdmin,
});

interface Uploader {
  id: string;
  n: string;
  e: string;
  c: number;
  s: string;
  j: string;
  r: string;
  plan: string;
}

function UploadersAdmin() {
  const navigate = useNavigate();
  const [uploaders, setUploaders] = useState<Uploader[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isAdmin = sessionStorage.getItem("is_super_admin");
    if (!isAdmin) {
      navigate({
        to: "/login",
        search: { redirect: "/admin/uploaders", role: "admin" } as any,
      });
      return;
    }

    const fetchData = async () => {
      try {
        const { collection, getDocs, query, where } =
          await import("firebase/firestore");

        // Fetch Pending Count
        const pendingSnapshot = await getDocs(
          query(collection(db, "videos"), where("status", "==", "pending")),
        );
        setPendingCount(pendingSnapshot.docs.length);

        // Fetch Uploaders
        const snapshot = await getDocs(collection(db, "videos"));
        const videos = snapshot.docs.map((doc) => doc.data());

        const uploaderMap: Record<string, Uploader> = {};

        videos.forEach((v: any) => {
          if (!uploaderMap[v.uploaderId]) {
            uploaderMap[v.uploaderId] = {
              id: v.uploaderId,
              n: v.uploaderName || "Anonymous",
              e:
                v.uploaderEmail ||
                `${v.uploaderId.substring(0, 5)}@SMART LEARNING.io`,
              c: 0,
              s: "Verified",
              j: v.createdAt
                ? new Date(v.createdAt).toLocaleDateString()
                : "2024-01-01",
              r: "$0",
              plan: "Free",
            };
          }
          uploaderMap[v.uploaderId].c += 1;
        });

        const result = Object.values(uploaderMap);
        if (result.length === 0) {
          setUploaders([
            {
              id: "1",
              n: "Quantum Labs",
              e: "lab@quantum.io",
              c: 24,
              s: "Verified",
              j: "2023-11-12",
              r: "$45k",
              plan: "Premium",
            },
            {
              id: "2",
              n: "Elena Design",
              e: "elena@design.com",
              c: 12,
              s: "Pending",
              j: "2024-02-15",
              r: "$12k",
              plan: "Free",
            },
          ]);
        } else {
          setUploaders(result);
        }
      } catch (error) {
        console.error("Error fetching uploaders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#F8FAFF] text-[#111827]">
      <Header />
      <main className="max-w-[1440px] mx-auto px-6 pt-16 pb-24">
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
                Course <span className="text-purple-600">Uploaders.</span>
              </h1>
              <p className="text-[#6B7280] font-medium">
                Oversee creators, verify academies, and review platform content.
              </p>
            </div>
            <div className="flex gap-4">
              <Link
                to="/admin/reviews"
                className="px-8 py-4 bg-[#111827] text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-glow hover:bg-purple-600 transition-all flex items-center gap-3"
              >
                Review Queue{" "}
                <div className="px-2 py-0.5 bg-purple-600 rounded-md text-[10px]">
                  {pendingCount} Pending
                </div>
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-soft overflow-hidden">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <Loader2 className="size-10 animate-spin text-purple-600" />
              <p className="font-bold uppercase tracking-widest text-xs">
                Syncing Creator Database...
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-black/5">
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                      Academy / Creator
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                      Courses
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                      Revenue
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                      Status
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                      Plan
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {uploaders.map((u, i) => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="hover:bg-gray-50/50 transition-colors group"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="size-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                            <Building2 className="size-6" />
                          </div>
                          <div>
                            <Link
                              to="/admin/uploader/$uploaderId"
                              params={{ uploaderId: u.id }}
                              className="font-black text-[#111827] hover:text-purple-600 transition-colors cursor-pointer"
                            >
                              {u.n}
                            </Link>
                            <div className="text-xs text-[#6B7280] font-medium">
                              {u.e}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm font-black text-[#111827]">
                          {u.c} Courses
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm font-black text-emerald-600">
                          {u.r}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span
                          className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                            u.s === "Elite"
                              ? "bg-purple-100 text-purple-700"
                              : u.s === "Verified"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {u.s}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span
                          className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                            u.plan === "Premium"
                              ? "bg-purple-600 text-white"
                              : "bg-gray-100 text-[#111827]"
                          }`}
                        >
                          {u.plan}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <button
                            className="p-2 hover:bg-white rounded-lg transition-colors text-[#6B7280] hover:text-purple-600"
                            title="View Analytics"
                          >
                            <BarChart3 className="size-4" />
                          </button>
                          <button
                            className="p-2 hover:bg-white rounded-lg transition-colors text-[#6B7280] hover:text-blue-600"
                            title="Verify Creator"
                          >
                            <BadgeCheck className="size-4" />
                          </button>
                          <button
                            className="p-2 hover:bg-white rounded-lg transition-colors text-[#6B7280] hover:text-red-500"
                            title="Suspend Creator"
                          >
                            <XCircle className="size-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
