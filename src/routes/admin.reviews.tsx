import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Eye,
  ChevronLeft,
  Loader2,
  Video,
  ExternalLink,
  ShieldAlert,
  BadgeCheck,
  AlertCircle,
  Phone,
  MapPin,
  Mail,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { showToast as toast } from "@/lib/custom-toast";

export const Route = createFileRoute("/admin/reviews")({
  head: () => ({ meta: [{ title: "Review Queue — Super Admin" }] }),
  component: AdminReviewQueue,
});

interface PendingVideo {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  uploaderId: string;
  uploaderName: string;
  videoLink: string;
  createdAt: string;
  isFree: boolean;
  uploaderEmail?: string;
  uploaderPhone?: string;
  uploaderAddress?: string;
}

function AdminReviewQueue() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<PendingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);

  useEffect(() => {
    const isAdmin = sessionStorage.getItem("is_super_admin");
    if (!isAdmin) {
      navigate({
        to: "/login",
        search: { redirect: "/admin/reviews", role: "admin" } as any,
      });
      return;
    }

    fetchPendingVideos();
  }, [navigate]);

  const fetchPendingVideos = async () => {
    setLoading(true);
    try {
      const { collection, query, where, getDocs, doc, getDoc } =
        await import("firebase/firestore");
      const q = query(
        collection(db, "videos"),
        where("status", "==", "pending"),
      );
      const snapshot = await getDocs(q);

      const videoData = await Promise.all(
        snapshot.docs.map(async (vDoc) => {
          const v = vDoc.data();
          let uploaderInfo = {};

          try {
            const uDoc = await getDoc(doc(db, "users", v.uploaderId));
            if (uDoc.exists()) {
              const u = uDoc.data();
              uploaderInfo = {
                uploaderEmail: u.email,
                uploaderPhone: u.phone,
                uploaderAddress: u.address || u.location,
              };
            }
          } catch (e) {
            console.error("Error fetching uploader info:", e);
          }

          return {
            id: vDoc.id,
            ...v,
            ...uploaderInfo,
          } as PendingVideo;
        }),
      );

      setVideos(videoData);
    } catch (error) {
      console.error("Error fetching pending videos:", error);
      toast.error("Failed to sync review queue");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (
    videoId: string,
    status: "approved" | "rejected",
  ) => {
    setActioning(videoId);
    try {
      if (status === "approved") {
        await updateDoc(doc(db, "videos", videoId), { status: "approved" });
        toast.success("Content approved and published!");
      } else {
        // Option A: Set to rejected
        await updateDoc(doc(db, "videos", videoId), { status: "rejected" });
        // Option B: Delete completely
        // await deleteDoc(doc(db, "videos", videoId));
        toast.error("Content rejected and hidden.");
      }
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setActioning(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-[#111827]">
      <Header />

      <main className="max-w-7xl mx-auto px-6 pt-16 pb-24">
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
                Review <span className="text-purple-600">Queue.</span>
              </h1>
              <p className="text-[#6B7280] font-medium">
                Verify content quality before publishing to the knowledge hub.
              </p>
            </div>
            <div className="bg-purple-50 px-6 py-3 rounded-2xl border border-purple-100 flex items-center gap-3">
              <span className="text-sm font-black text-purple-600">
                {videos.length} Pending Requests
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="h-[40vh] flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <Loader2 className="size-10 animate-spin text-purple-600" />
            <p className="font-black uppercase tracking-widest text-xs">
              Syncing Queue...
            </p>
          </div>
        ) : videos.length === 0 ? (
          <div className="bg-white rounded-[3rem] border-2 border-dashed border-black/5 p-20 text-center space-y-4">
            <div className="size-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
              <BadgeCheck className="size-10" />
            </div>
            <h3 className="text-2xl font-black">All Caught Up!</h3>
            <p className="text-[#6B7280] font-medium">
              There are no pending videos waiting for review.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            <AnimatePresence>
              {videos.map((video, i) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-[2.5rem] p-8 border border-black/5 shadow-soft flex flex-col lg:flex-row items-center gap-10 group hover:border-purple-600/20 transition-all"
                >
                  <div className="relative size-40 bg-black rounded-[2rem] overflow-hidden shadow-card shrink-0">
                    <div className="absolute inset-0 flex items-center justify-center text-white/20">
                      <Video className="size-10" />
                    </div>
                    {/* If we had thumbnails, we'd show them here */}
                  </div>

                  <div className="flex-1 space-y-4 text-center lg:text-left min-w-0">
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                      <span className="px-3 py-1 bg-purple-50 text-purple-600 text-[10px] font-black uppercase tracking-widest rounded-lg">
                        {video.category}
                      </span>
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-lg">
                        {video.subcategory}
                      </span>
                      <span
                        className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg ${
                          (video as any).priceType === "paid" || !video.isFree
                            ? "bg-amber-50 text-amber-600 border border-amber-100"
                            : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        }`}
                      >
                        {(video as any).priceType === "paid" || !video.isFree
                          ? "Paid Content"
                          : "Free Content"}
                      </span>
                    </div>

                    <h3 className="text-2xl font-black tracking-tight">
                      {video.title}
                    </h3>

                    <div className="grid sm:grid-cols-2 gap-4 bg-[#F8FAFF] p-6 rounded-[2.5rem] border border-black/5 relative">
                      <div className="space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] flex items-center gap-2">
                          <AlertCircle className="size-3" /> Creator Profile
                        </div>
                        <div className="text-sm font-bold text-[#111827]">
                          {video.uploaderName}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-purple-600 font-bold group/mail">
                          <Mail className="size-3" />
                          {video.uploaderEmail ? (
                            <a
                              href={`mailto:${video.uploaderEmail}?subject=Regarding your course: ${video.title}&body=Hello ${video.uploaderName}, we have reviewed your course submission...`}
                              className="hover:underline"
                            >
                              {video.uploaderEmail}
                            </a>
                          ) : (
                            <span className="text-red-400">
                              Email Not Provided
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] flex items-center gap-2">
                          <Phone className="size-3" /> Contact Details
                        </div>
                        <div className="text-sm font-bold text-[#111827]">
                          {video.uploaderPhone || "N/A"}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#6B7280] font-medium truncate">
                          <MapPin className="size-3" />{" "}
                          {video.uploaderAddress || "Global"}
                        </div>
                      </div>

                      <div className="sm:col-span-2 pt-4 border-t border-black/5 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-600">
                          {new Date(video.createdAt).toLocaleDateString()} at{" "}
                          {new Date(video.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <a
                          href={`mailto:${video.uploaderEmail}?subject=Action Required: ${video.title}`}
                          className="px-4 py-2 bg-[#111827] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-purple-600 transition-all flex items-center gap-2"
                        >
                          <Mail className="size-3" /> Send Message
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <a
                      href={video.videoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 bg-gray-50 text-[#6B7280] rounded-2xl hover:bg-black hover:text-white transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest"
                    >
                      <Eye className="size-4" /> Preview
                    </a>
                    <button
                      onClick={() => handleAction(video.id, "rejected")}
                      disabled={actioning === video.id}
                      className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest"
                    >
                      <XCircle className="size-4" /> Reject
                    </button>
                    <button
                      onClick={() => handleAction(video.id, "approved")}
                      disabled={actioning === video.id}
                      className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest shadow-glow-sm"
                    >
                      {actioning === video.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="size-4" /> Approve
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
