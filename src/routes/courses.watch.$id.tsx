import {
  createFileRoute,
  Link,
  useParams,
  useNavigate,
} from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  User,
  Clock,
  Share2,
  Star,
  Play,
  MessageSquare,
  Info,
  Loader2,
  CheckCircle2,
  Zap,
  Award,
  ShieldCheck,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { showToast as toast } from "@/lib/custom-toast";
import { StudentHeader } from "@/components/student/StudentHeader";

export const Route = createFileRoute("/courses/watch/$id")({
  component: VideoWatchPage,
});

interface Video {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  videoLink: string;
  thumbnailUrl?: string;
  pdfUrl?: string;
  uploaderName: string;
  createdAt: string;
  isFree: boolean;
}

const TITLE_TO_ID: Record<string, string> = {
  Education: "edu",
  Medical: "med",
  Management: "mgmt",
  "Arts & Design": "arts",
  "Law LLB": "law",
  Science: "sci",
  Tourism: "tour",
  "Skill Development": "skill",
  Psychology: "psych",
  "Computer/IT": "it",
  Engineering: "eng",
  Commerce: "comm",
  "Media/Reporter": "media",
  Agriculture: "agri",
  "Hotel Management": "hotel",
  "Sports & Fitness": "sports",
  "Performing Arts": "perf",
  "Language Study": "lang",
};

function VideoWatchPage() {
  const { id } = useParams({ from: "/courses/watch/$id" });
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [activeTab, setActiveTab] = useState<
    "about" | "curriculum" | "reviews"
  >("curriculum");
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVideoAndRelated = async () => {
      try {
        const docRef = doc(db, "videos", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const videoData = { id: docSnap.id, ...docSnap.data() } as Video;
          setVideo(videoData);

          // Check Enrollment
          if (auth.currentUser) {
            const enrollRef = doc(
              db,
              "enrollments",
              `${auth.currentUser.uid}_${id}`,
            );
            const enrollSnap = await getDoc(enrollRef);
            if (enrollSnap.exists()) {
              setIsEnrolled(true);
            }
          }

          // Fetch other videos from same category
          const { collection, query, where, getDocs, limit } =
            await import("firebase/firestore");
          const q = query(
            collection(db, "videos"),
            where("category", "==", videoData.category),
            limit(10),
          );
          const snapshot = await getDocs(q);
          const data = snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() }) as Video,
          );

          if (data.length <= 1) {
            setRelatedVideos([
              videoData,
              {
                id: "demo-2",
                title: "Core Principles & Fundamentals",
                category: videoData.category,
                videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                uploaderName: "Smart Learning With AI",
                createdAt: new Date().toISOString(),
                isFree: true,
              },
              {
                id: "demo-3",
                title: "Advanced Professional Workflows",
                category: videoData.category,
                videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                uploaderName: "Smart Learning With AI",
                createdAt: new Date().toISOString(),
                isFree: true,
              },
            ]);
          } else {
            setRelatedVideos(data);
          }
        }
      } catch (error) {
        console.error("Error fetching video:", error);
      } finally {
        setLoading(false);
        setCheckingEnrollment(false);
      }
    };

    fetchVideoAndRelated();
  }, [id]);

  const handleEnrollNow = () => {
    const catId = video ? TITLE_TO_ID[video.category] || video.category : "";
    navigate({ to: "/courses/$catId", params: { catId } });
  };

  const getEmbedLink = (link: string) => {
    if (link.includes("youtube.com/watch?v="))
      return link.replace("watch?v=", "embed/");
    if (link.includes("youtu.be/"))
      return link.replace("youtu.be/", "youtube.com/embed/");
    return link;
  };

  if (loading || checkingEnrollment) {
    return (
      <div className="min-h-screen bg-white">
        <StudentHeader />
        <main className="pt-16 h-[80vh] flex flex-col items-center justify-center gap-4 text-slate-400">
          <Loader2 className="size-10 animate-spin text-indigo-600" />
          <p className="font-black text-[10px] uppercase tracking-widest">
            Initializing Secure Stream...
          </p>
        </main>
      </div>
    );
  }

  if (!video) return null;

  const catId = TITLE_TO_ID[video.category] || video.category;

  return (
    <div className="min-h-screen bg-white">
      <StudentHeader />

      <main className="pt-16 min-h-screen bg-slate-50/50">
        <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto">
          <Link
            to="/courses/$catId"
            params={{ catId }}
            className="inline-flex items-center gap-2 text-[10px] font-black text-indigo-600 hover:gap-3 transition-all uppercase tracking-[0.2em] no-print"
          >
            <ArrowLeft className="size-4" /> Back to {video.category}
          </Link>

          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-10">
              {/* Player Wall */}
              <div className="aspect-video bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl relative border-[12px] border-white">
                {isEnrolled ? (
                  <iframe
                    src={getEmbedLink(video.videoLink)}
                    className="absolute inset-0 w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                ) : (
                  <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-12">
                    <div className="size-20 bg-indigo-600/20 rounded-full flex items-center justify-center mb-6">
                      <Info className="size-10 text-indigo-400" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-4 italic tracking-tight uppercase">
                      Enrollment Required
                    </h2>
                    <p className="text-slate-400 max-w-md mb-10 text-xs font-bold uppercase tracking-widest leading-relaxed">
                      Join the {video.category} Masterclass to unlock this
                      stream and track progress.
                    </p>
                    <button
                      onClick={handleEnrollNow}
                      className="px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-indigo-700 transition-all"
                    >
                      Take Enrollment Now
                    </button>
                  </div>
                )}
              </div>

              {/* Video Details */}
              <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm space-y-8">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div>
                    <span className="px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black tracking-widest uppercase border border-indigo-100">
                      Now Streaming
                    </span>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900 mt-6 leading-tight italic">
                      {video.title}
                    </h1>
                  </div>
                  <div className="flex gap-3">
                    <button className="size-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors border border-slate-100">
                      <Share2 className="size-5" />
                    </button>
                    <button className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-indigo-100">
                      <Star className="size-4 fill-current" /> Rate Course
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-10 py-8 border-y border-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-lg shadow-sm">
                      {video.uploaderName[0]}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Instructor
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {video.uploaderName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm">
                      <Clock className="size-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Published
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {new Date(video.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex gap-8 border-b border-slate-50 overflow-x-auto no-scrollbar">
                    {["curriculum", "about", "reviews"].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-400 hover:text-slate-900"}`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {activeTab === "curriculum" && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                      >
                        {relatedVideos.map((v, i) => (
                          <button
                            key={v.id}
                            onClick={() =>
                              navigate({
                                to: "/courses/watch/$id",
                                params: { id: v.id },
                              })
                            }
                            className={`w-full flex items-center gap-4 p-5 rounded-2xl border transition-all ${video.id === v.id ? "bg-indigo-600 border-indigo-600 text-white shadow-xl" : "bg-slate-50 border-transparent hover:border-indigo-100 hover:bg-white"}`}
                          >
                            <div
                              className={`size-10 rounded-xl flex items-center justify-center font-black text-xs ${video.id === v.id ? "bg-white/20 text-white" : "bg-white text-indigo-600 shadow-sm"}`}
                            >
                              {i + 1}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <h4 className="text-sm font-bold truncate tracking-tight">
                                {v.title}
                              </h4>
                              <p
                                className={`text-[9px] font-black uppercase tracking-widest ${video.id === v.id ? "text-white/60" : "text-slate-400"}`}
                              >
                                Lesson • Video
                              </p>
                            </div>
                            <Play
                              className={`size-4 ${video.id === v.id ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"}`}
                            />
                          </button>
                        ))}
                      </motion.div>
                    )}
                    {activeTab === "about" && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-slate-500 text-sm font-medium leading-relaxed italic"
                      >
                        Master the essentials of {video.category} with{" "}
                        {video.uploaderName}. This comprehensive module covers
                        everything you need to know about {video.title}.
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Sidebar Analytics */}
            <div className="space-y-8">
              <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm space-y-8">
                <h3 className="font-black text-lg italic tracking-tight">
                  Lesson Insights
                </h3>
                <div className="space-y-4">
                  {[
                    { label: "Quality", val: "4K Stream", icon: Play },
                    {
                      label: "Status",
                      val: isEnrolled ? "Unlocked" : "Gated",
                      icon: ShieldCheck,
                    },
                    { label: "Material", val: "PDF Included", icon: BookOpen },
                    {
                      label: "Support",
                      val: "24/7 Access",
                      icon: MessageSquare,
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="size-4 text-indigo-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {item.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                        {item.val}
                      </span>
                    </div>
                  ))}
                </div>
                {video.pdfUrl ? (
                  <a
                    href={video.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 transition-colors text-center"
                  >
                    Download Material <ArrowRight className="size-4" />
                  </a>
                ) : (
                  <button
                    disabled
                    className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 cursor-not-allowed"
                  >
                    No Material Available
                  </button>
                )}
              </div>

              <div className="bg-indigo-600 rounded-[3rem] p-8 text-white shadow-2xl shadow-indigo-100">
                <Award className="size-12 mb-6 opacity-50" />
                <h3 className="text-xl font-black italic">Global Diploma</h3>
                <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-widest mt-4 leading-relaxed">
                  Finish all modules to unlock your verified institutional
                  certification.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
