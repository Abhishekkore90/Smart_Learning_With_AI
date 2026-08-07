import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { showToast as toast } from "@/lib/custom-toast";
import {
  Play,
  Clock,
  User,
  ExternalLink,
  ArrowLeft,
  Loader2,
  PlayCircle,
  Star,
  ShieldCheck,
  BookOpen,
  Award,
  CheckCircle2,
  ChevronRight,
  Zap,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { DOMAINS } from "@/lib/constants";
import { StudentHeader } from "@/components/student/StudentHeader";

export const Route = createFileRoute("/courses/$catId")({
  component: CategoryDetailPage,
});

interface Video {
  id: string;
  title: string;
  category: string;
  videoLink: string;
  uploaderName: string;
  createdAt: string;
  isFree: boolean;
}

const CATEGORY_CONTENT: Record<string, { desc: string; points: string[] }> = {
  Education: {
    desc: "Master modern pedagogical techniques and educational leadership to shape the future of learning.",
    points: [
      "Instructional Design",
      "Student Psychology",
      "Curriculum Development",
      "EdTech Integration",
      "Assessment Strategies",
      "Leadership in Education",
    ],
  },
  Medical: {
    desc: "Explore advanced healthcare sciences, research methodologies, and clinical best practices in modern medicine.",
    points: [
      "Medical Research Basics",
      "Healthcare Management",
      "Patient Care Standards",
      "Global Health Trends",
      "Clinical Ethics",
      "Bio-medical Innovations",
    ],
  },
  Management: {
    desc: "Develop elite leadership skills and strategic thinking to manage complex organizations and global teams.",
    points: [
      "Strategic Leadership",
      "Project Management",
      "Organizational Behavior",
      "Financial Planning",
      "Operations Excellence",
      "Change Management",
    ],
  },
  "Arts & Design": {
    desc: "Express your creativity through visual arts, graphic design, and modern digital communication techniques.",
    points: [
      "Visual Storytelling",
      "Graphic Design Principles",
      "Digital Illustration",
      "User-Centric Design",
      "Art History",
      "Portfolio Development",
    ],
  },
  "Law LLB": {
    desc: "Deep dive into legal systems, constitutional frameworks, and the art of professional legal advocacy.",
    points: [
      "Constitutional Law",
      "Legal Research",
      "Corporate Governance",
      "Human Rights",
      "Criminal Justice",
      "Contract Negotiation",
    ],
  },
  Science: {
    desc: "Discover the laws of the universe through advanced physics, biology, and chemistry research modules.",
    points: [
      "Advanced Physics",
      "Biotechnology",
      "Chemical Analysis",
      "Environmental Science",
      "Scientific Research",
      "Data in Science",
    ],
  },
  Tourism: {
    desc: "Navigate the global travel industry and master hospitality management for world-class destinations.",
    points: [
      "Global Destination Management",
      "Hospitality Services",
      "Sustainable Tourism",
      "Travel Logistics",
      "Cultural Intelligence",
      "Marketing for Tourism",
    ],
  },
  "Skill Development": {
    desc: "Gain practical, high-demand vocational skills to accelerate your career in any technical or creative field.",
    points: [
      "Technical Proficiency",
      "Soft Skills Mastery",
      "Vocational Training",
      "Career Planning",
      "Industry Certifications",
      "Problem Solving",
    ],
  },
  Psychology: {
    desc: "Understand the complexities of the human mind, behavior, and the science of mental well-being.",
    points: [
      "Cognitive Psychology",
      "Behavioral Analysis",
      "Mental Health Support",
      "Social Psychology",
      "Developmental Science",
      "Research Methods",
    ],
  },
  "Computer/IT": {
    desc: "Accelerate your career in technology with deep dives into software engineering, AI, and systems architecture.",
    points: [
      "Software Engineering",
      "Full-stack Development",
      "System Architecture",
      "AI Integration",
      "Cyber Security Basics",
      "Cloud Management",
    ],
  },
  Engineering: {
    desc: "Master the principles of technical design, structural integrity, and innovative engineering solutions.",
    points: [
      "Mechanical Systems",
      "Civil Engineering",
      "Electrical Circuitry",
      "CAD & Simulation",
      "Materials Science",
      "Structural Analysis",
    ],
  },
  Commerce: {
    desc: "Drive global business success through finance, international trade, and advanced market analysis.",
    points: [
      "Financial Accounting",
      "Market Economics",
      "Business Law",
      "International Trade",
      "Investment Strategy",
      "E-commerce Growth",
    ],
  },
  "Media/Reporter": {
    desc: "Become a voice for the truth through professional journalism, digital reporting, and media production.",
    points: [
      "Investigative Journalism",
      "Digital Storytelling",
      "Media Ethics",
      "Video Production",
      "News Writing",
      "Social Media Reporting",
    ],
  },
  Agriculture: {
    desc: "Pioneer sustainable food systems through modern farming techniques and agricultural innovations.",
    points: [
      "Sustainable Farming",
      "Agri-tech Systems",
      "Soil Science",
      "Crop Management",
      "Agri-business",
      "Food Security",
    ],
  },
  "Hotel Management": {
    desc: "Set the standard for luxury through elite hospitality, service excellence, and international management.",
    points: [
      "Luxury Service Standards",
      "Hotel Operations",
      "Food & Beverage Mgmt",
      "Guest Experience",
      "Revenue Management",
      "Events Planning",
    ],
  },
  "Sports & Fitness": {
    desc: "Optimize human performance through scientific training, professional athletics, and nutrition mastery.",
    points: [
      "Sports Science",
      "Kinesiology",
      "Nutrition Planning",
      "Professional Coaching",
      "Injury Prevention",
      "Athlete Management",
    ],
  },
  "Performing Arts": {
    desc: "Command the stage through music, dance, and theatrical mastery under the guidance of industry experts.",
    points: [
      "Theatrical Performance",
      "Music Theory",
      "Modern Dance",
      "Stage Management",
      "Script Analysis",
      "Directing Essentials",
    ],
  },
  "Language Study": {
    desc: "Break boundaries through global linguistics and the mastery of multiple international languages.",
    points: [
      "Linguistic Theory",
      "Fluency Training",
      "Cultural Context",
      "Translation Skills",
      "Professional Communication",
      "Grammar Mastery",
    ],
  },
  "Other/+": {
    desc: "Explore miscellaneous and niche fields of knowledge not covered in standard domains.",
    points: [
      "Cross-disciplinary studies",
      "Experimental research",
      "Niche expertise",
      "General interest topics",
      "Creative projects",
      "Uncategorized learning",
    ],
  },
};

const ID_TO_TITLE: Record<string, string> = {
  edu: "Education",
  med: "Medical",
  mgmt: "Management",
  arts: "Arts & Design",
  law: "Law LLB",
  sci: "Science",
  tour: "Tourism",
  skill: "Skill Development",
  psych: "Psychology",
  it: "Computer/IT",
  eng: "Engineering",
  comm: "Commerce",
  media: "Media/Reporter",
  agri: "Agriculture",
  hotel: "Hotel Management",
  sports: "Sports & Fitness",
  perf: "Performing Arts",
  lang: "Language Study",
  other: "Other/+",
};

function CategoryDetailPage() {
  const { catId } = useParams({ from: "/courses/$catId" });
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [subcategory, setSubcategory] = useState<string>("");

  const decodedCat = ID_TO_TITLE[catId] || decodeURIComponent(catId);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        let q = query(
          collection(db, "videos"),
          where("category", "==", decodedCat),
          where("status", "==", "approved"),
        );

        if (subcategory) {
          q = query(q, where("subcategory", "==", subcategory));
        }

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Video,
        );

        if (data.length === 0) {
          const placeholders: Video[] = [
            {
              id: "demo-1",
              title: `Introduction to Master ${decodedCat}`,
              category: decodedCat,
              videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
              uploaderName: "Smart Learning With AI",
              createdAt: new Date().toISOString(),
              isFree: true,
            },
            {
              id: "demo-2",
              title: "Core Principles & Fundamentals",
              category: decodedCat,
              videoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
              uploaderName: "Smart Learning With AI",
              createdAt: new Date().toISOString(),
              isFree: true,
            },
          ];
          setVideos(placeholders);
          setActiveVideo(placeholders[0]);
        } else {
          setVideos(data);
          setActiveVideo(data[0]);
        }
      } catch (error) {
        console.error("Error fetching videos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [catId, decodedCat, subcategory]);

  useEffect(() => {
    const checkEnrollment = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(
          collection(db, "enrollments"),
          where("userId", "==", auth.currentUser.uid),
          where("courseTitle", "==", decodedCat),
        );
        const snap = await getDocs(q);
        if (!snap.empty) setIsEnrolled(true);
      } catch (err) {}
    };
    checkEnrollment();
  }, [decodedCat]);

  const handleEnroll = async () => {
    if (!auth.currentUser) {
      toast.error("Please login to enroll in this course");
      return;
    }

    if (isEnrolled) return;

    try {
      const { setDoc, doc } = await import("firebase/firestore");
      const enrollRef = doc(
        db,
        "enrollments",
        `${auth.currentUser.uid}_${catId}`,
      );

      await setDoc(enrollRef, {
        userId: auth.currentUser.uid,
        userName:
          auth.currentUser.displayName ||
          auth.currentUser.email?.split("@")[0] ||
          "Student",
        courseId: catId,
        courseTitle: decodedCat,
        category: decodedCat,
        subcategory: subcategory || "General",
        priceType: DOMAINS.find((d) => d.t === decodedCat)?.isFree
          ? "Free"
          : "Paid",
        amount: "0",
        enrolledAt: new Date().toISOString(),
        status: "active",
        progress: 10,
      });

      setIsEnrolled(true);
      toast.success(`Welcome to ${decodedCat} Masterclass!`);
    } catch (err) {
      toast.error("Enrollment failed. Please try again.");
    }
  };

  const content = CATEGORY_CONTENT[decodedCat] || {
    desc: `Elevate your professional skills with our comprehensive ${decodedCat} program. Master modern tools and build a state-of-the-art portfolio under expert guidance.`,
    points: [
      "Advanced professional workflows",
      "Industry-standard tool mastery",
      "High-performance architecture",
      "Next-generation best practices",
      "Portfolio-grade project builds",
      "Expert-led cognitive insights",
    ],
  };

  const getEmbedLink = (link: string) => {
    if (!link) return "";
    if (link.includes("youtube.com/watch?v="))
      return link.replace("watch?v=", "embed/");
    if (link.includes("youtu.be/"))
      return link.replace("youtu.be/", "youtube.com/embed/");
    return link;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <StudentHeader />
        <main className="pt-16 h-[80vh] flex flex-col items-center justify-center gap-4 text-slate-400">
          <Loader2 className="size-10 animate-spin text-indigo-600" />
          <p className="font-black text-[10px] uppercase tracking-widest">
            Initializing Academy Modules...
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <StudentHeader />

      <main className="pt-16 min-h-screen bg-slate-50/50">
        <div className="p-6 md:p-10 space-y-12 max-w-7xl mx-auto">
          <Link
            to="/courses"
            search={{ action: "watch" as any }}
            className="inline-flex items-center gap-2 text-[10px] font-black text-indigo-600 hover:gap-3 transition-all uppercase tracking-[0.2em] no-print"
          >
            <ArrowLeft className="size-4" /> Back to Knowledge Hub
          </Link>

          {/* HERO SECTION */}
          <div className="grid lg:grid-cols-2 gap-12 items-center bg-white rounded-[3.5rem] p-10 md:p-16 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 blur-[80px] rounded-full opacity-50 -z-10" />

            <motion.div
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black tracking-widest uppercase mb-6 border border-indigo-100">
                Master Series Domain
              </span>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-[1] italic text-slate-900">
                {decodedCat}
              </h1>
              <p className="text-slate-500 text-xl font-medium leading-relaxed mb-10 max-w-xl">
                {activeVideo
                  ? `Currently Playing: ${activeVideo.title}`
                  : `Select a module to begin your journey in ${decodedCat}.`}
              </p>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleEnroll}
                  disabled={isEnrolled}
                  className={`px-10 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl transition-all flex items-center gap-3 ${isEnrolled ? "bg-emerald-600 text-white cursor-default" : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95"}`}
                >
                  {isEnrolled ? (
                    <>
                      <CheckCircle2 className="size-6" /> Enrolled Successfully
                    </>
                  ) : (
                    <>
                      <Zap className="size-6 fill-current" /> Enroll Now — Full
                      Access
                    </>
                  )}
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative group"
            >
              <div className="aspect-video rounded-[2.5rem] overflow-hidden bg-slate-900 shadow-2xl relative border-4 border-white">
                {isEnrolled ? (
                  activeVideo ? (
                    activeVideo.videoLink.includes("youtube.com") ||
                    activeVideo.videoLink.includes("youtu.be") ? (
                      <iframe
                        src={getEmbedLink(activeVideo.videoLink)}
                        className="w-full h-full"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    ) : (
                      <video
                        src={activeVideo.videoLink}
                        controls
                        className="w-full h-full"
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-white/20">
                      <PlayCircle className="size-20" />
                      <p className="font-black uppercase tracking-widest text-[10px]">
                        No Video Available
                      </p>
                    </div>
                  )
                ) : (
                  <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8">
                    <div className="size-16 bg-white/10 rounded-full flex items-center justify-center mb-6">
                      <ShieldCheck className="size-8 text-white/60" />
                    </div>
                    <h3 className="text-xl font-black text-white mb-2 uppercase tracking-widest">
                      Access Locked
                    </h3>
                    <p className="text-white/60 text-[10px] max-w-[240px] font-bold uppercase tracking-widest leading-relaxed mb-8">
                      Enroll to unlock the curriculum and begin certification.
                    </p>
                    <button
                      onClick={handleEnroll}
                      className="px-8 py-4 bg-white text-slate-900 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform"
                    >
                      Enroll Now
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Topic Filter Sidebar */}
            <aside className="lg:col-span-1 space-y-8">
              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
                <div className="mb-8">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-2">
                    Topic Niches
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Filter by expertise.
                  </p>
                </div>

                <nav className="space-y-2">
                  <button
                    onClick={() => setSubcategory("")}
                    className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${subcategory === "" ? "bg-indigo-600 text-white shadow-xl" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
                  >
                    <span>All Modules</span>
                    {subcategory === "" && (
                      <div className="size-1.5 rounded-full bg-white" />
                    )}
                  </button>

                  {DOMAINS.find((d) => d.t === decodedCat)?.subcategories.map(
                    (sub) => (
                      <button
                        key={sub}
                        onClick={() => setSubcategory(sub)}
                        className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${subcategory === sub ? "bg-indigo-600 text-white shadow-xl" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
                      >
                        <span className="truncate">{sub}</span>
                        {subcategory === sub && (
                          <div className="size-1.5 rounded-full bg-white" />
                        )}
                      </button>
                    ),
                  )}
                </nav>
              </div>

              <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                <Award className="size-12 mb-6 opacity-50 text-indigo-400" />
                <h3 className="text-xl font-black italic">Certification</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4 leading-relaxed">
                  Finish all lessons to unlock your verified {decodedCat}{" "}
                  diploma.
                </p>
              </div>
            </aside>

            {/* Curriculum & Details */}
            <div className="lg:col-span-3 space-y-12">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm space-y-6">
                  <h2 className="text-2xl font-black italic tracking-tight">
                    Curriculum
                  </h2>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {videos.map((v, i) => (
                      <button
                        key={v.id}
                        onClick={() => setActiveVideo(v)}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${activeVideo?.id === v.id ? "bg-indigo-600 border-indigo-600 text-white shadow-lg" : "bg-slate-50 border-transparent hover:bg-white hover:border-indigo-200"}`}
                      >
                        <div
                          className={`size-10 rounded-xl flex items-center justify-center font-black text-xs ${activeVideo?.id === v.id ? "bg-white/20 text-white" : "bg-white text-indigo-600 shadow-sm"}`}
                        >
                          {i + 1}
                        </div>
                        <div className="flex-1 text-left">
                          <h4 className="text-sm font-bold truncate tracking-tight">
                            {v.title}
                          </h4>
                          <p
                            className={`text-[9px] font-black uppercase tracking-widest ${activeVideo?.id === v.id ? "text-white/60" : "text-slate-400"}`}
                          >
                            Lesson • Video
                          </p>
                        </div>
                        <Play
                          className={`size-4 ${activeVideo?.id === v.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm space-y-8">
                  <h2 className="text-2xl font-black italic tracking-tight">
                    Program Goals
                  </h2>
                  <div className="grid gap-4">
                    {content.points.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100"
                      >
                        <CheckCircle2 className="size-5 text-emerald-500" />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
