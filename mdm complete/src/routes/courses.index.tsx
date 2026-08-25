import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  CloudUpload,
  PlayCircle,
  Star,
  Zap,
  ArrowRight,
  BookOpen,
  TrendingUp,
  Code,
  Brain,
  Palette,
  ShieldCheck,
  Database,
  Globe,
  ChevronLeft,
  Scale,
  Atom,
  Plane,
  Settings,
  Leaf,
  Activity,
  Music,
  Languages,
  Sparkles,
} from "lucide-react";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { StudentHeader } from "@/components/student/StudentHeader";

// Assets
import uploadImg from "@/assets/upload_full.png";
import watchImg from "@/assets/watch_full.png";
import courseBg from "@/assets/course.jpg";

export const Route = createFileRoute("/courses/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { action?: "watch" | "upload" } => ({
    action:
      search.action === "watch" || search.action === "upload"
        ? search.action
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Choose Your Path — SMART LEARNING" },
      {
        name: "description",
        content:
          "Select a domain and start your learning journey or contribute your knowledge.",
      },
    ],
  }),
  component: InteractiveCourseSelection,
});

import { DOMAINS as domains } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";

function InteractiveCourseSelection() {
  const { user, profile } = useAuth();
  const { action: userAction } = useSearch({ from: "/courses/" });
  const [activeType, setActiveType] = useState<"all" | "free" | "paid">("all");
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const navigate = useNavigate({ from: "/courses/" });
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setUserName(profile?.fullName || profile?.name || "Scholar");
    }
  }, [user, profile]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const fadeUp = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -15 },
    transition: { duration: 0.3, ease: "circOut" as any },
  };

  return (
    <div className="min-h-screen bg-slate-950 relative">
      {/* Full-screen background image with proper colors */}
      <div className="fixed inset-0 z-0">
        <img
          src={courseBg}
          alt="Course Background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Subtle dark overlay for text readability */}
        <div className="absolute inset-0 bg-slate-950/50" />
      </div>

      <div className="relative z-10">
        <StudentHeader />

        <main className="pt-16 min-h-screen relative overflow-hidden flex flex-col justify-center">
          <div className="max-w-7xl mx-auto px-6 py-12 md:py-20 relative z-10 min-h-[80vh] flex flex-col justify-center w-full">
            <AnimatePresence mode="wait">
              {!userAction ? (
                <motion.div
                  key="step-1"
                  {...fadeUp}
                  className="w-full max-w-5xl mx-auto"
                >
                  <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-7xl font-black tracking-tight mb-4 px-4 italic text-white">
                      Choose Your{" "}
                      <span className="bg-gradient-to-r from-amber-400 via-rose-400 to-violet-400 bg-clip-text text-transparent">
                        Path.
                      </span>
                    </h2>
                    <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed px-4 font-medium">
                      Start learning from experts or share your own knowledge
                      with the global community.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-10">
                    {/* WATCH CARD */}
                    <motion.div
                      whileHover={{ y: -15, scale: 1.02 }}
                      onClick={() => navigate({ search: { action: "watch" } })}
                      className="bg-gradient-to-br from-amber-950/40 via-slate-950/70 to-orange-950/40 backdrop-blur-2xl rounded-[3.5rem] p-8 border border-amber-500/15 shadow-[0_20px_60px_rgba(245,158,11,0.1)] hover:shadow-[0_25px_70px_rgba(245,158,11,0.25)] hover:border-amber-500/30 transition-all relative overflow-hidden flex flex-col h-full cursor-pointer group"
                    >
                      {/* Glowing accent blob */}
                      <div className="absolute -top-20 -right-20 w-60 h-60 bg-amber-500/10 rounded-full blur-[80px] group-hover:bg-amber-500/20 transition-all duration-700" />
                      <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-orange-500/10 rounded-full blur-[60px] group-hover:bg-orange-400/15 transition-all duration-700" />

                      <div className="mb-8 rounded-[2.5rem] overflow-hidden border-2 border-amber-500/15 group-hover:border-amber-400/30 group-hover:scale-[1.02] transition-all duration-500 relative aspect-video bg-slate-900/50 shadow-inner">
                        <img
                          src={watchImg}
                          alt="Watch"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 space-y-4 relative z-10">
                        <div className="flex items-center justify-between">
                          <h3 className="text-3xl font-black tracking-tight italic text-white">
                            Watch Courses
                          </h3>
                          <PlayCircle className="size-8 text-amber-500/30 group-hover:text-amber-400 transition-colors" />
                        </div>
                        <p className="text-sm text-slate-400 font-medium leading-relaxed">
                          Access world-class lectures and master new skills at
                          your own pace from industry leaders.
                        </p>
                      </div>

                      <div className="w-full mt-8 py-5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-[1.8rem] font-black text-center shadow-[0_10px_35px_rgba(245,158,11,0.3)] flex items-center justify-center gap-3 relative z-10 transition-all">
                        Start Learning <ArrowRight className="size-5" />
                      </div>
                    </motion.div>

                    {/* UPLOAD CARD */}
                    <motion.div
                      whileHover={{ y: -15, scale: 1.02 }}
                      onClick={() => {
                        const isSuperAdmin =
                          sessionStorage.getItem("is_super_admin");
                        if (
                          !isSuperAdmin &&
                          (!user || profile?.role !== "uploader")
                        ) {
                          navigate({
                            to: "/login",
                            search: {
                              redirect: "/courses?action=upload",
                              role: "uploader",
                            } as any,
                          });
                        } else {
                          navigate({ search: { action: "upload" } });
                        }
                      }}
                      className="bg-gradient-to-br from-amber-950/40 via-slate-950/70 to-orange-950/40 backdrop-blur-2xl rounded-[3.5rem] p-8 border border-amber-500/15 shadow-[0_20px_60px_rgba(245,158,11,0.1)] hover:shadow-[0_25px_70px_rgba(245,158,11,0.25)] hover:border-amber-500/30 transition-all relative overflow-hidden flex flex-col h-full cursor-pointer group"
                    >
                      {/* Glowing accent blob */}
                      <div className="absolute -top-20 -left-20 w-60 h-60 bg-amber-500/10 rounded-full blur-[80px] group-hover:bg-amber-500/20 transition-all duration-700" />
                      <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-orange-500/10 rounded-full blur-[60px] group-hover:bg-orange-400/15 transition-all duration-700" />

                      <div className="mb-8 rounded-[2.5rem] overflow-hidden border-2 border-amber-500/15 group-hover:border-amber-400/30 group-hover:scale-[1.02] transition-all duration-500 relative aspect-video bg-slate-900/50 shadow-inner">
                        <img
                          src={uploadImg}
                          alt="Upload"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 space-y-4 relative z-10">
                        <div className="flex items-center justify-between">
                          <h3 className="text-3xl font-black tracking-tight italic text-white">
                            Upload Course
                          </h3>
                          <CloudUpload className="size-8 text-amber-500/30 group-hover:text-amber-400 transition-colors" />
                        </div>
                        <p className="text-sm text-slate-400 font-medium leading-relaxed">
                          Share your expertise and empower a global community of
                          scholars while building your personal brand.
                        </p>
                      </div>

                      <div className="w-full mt-8 py-5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-[1.8rem] font-black text-center shadow-[0_10px_35px_rgba(245,158,11,0.3)] flex items-center justify-center gap-3 relative z-10 transition-all">
                        Upload Course <ArrowRight className="size-5" />
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="step-2" {...fadeUp} className="w-full">
                  <div className="flex items-center justify-between mb-12">
                    <button
                      onClick={() =>
                        navigate({ search: { action: undefined } })
                      }
                      className="flex items-center gap-2 text-xs md:text-sm font-black text-teal-400 hover:gap-3 transition-all uppercase tracking-widest"
                    >
                      <ChevronLeft className="size-5" /> Back
                    </button>

                    <div className="flex bg-slate-950/60 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10">
                      {[
                        { id: "all", label: "All" },
                        { id: "free", label: "Free" },
                        { id: "paid", label: "Paid" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setActiveType(t.id as any)}
                          className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeType === t.id ? "bg-teal-500 text-slate-950 shadow-xl" : "text-slate-400 hover:text-white"}`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-7xl font-black tracking-tight mb-4 px-4 italic text-white">
                      {userName ? `Hi, ${userName}` : "Choose Your"}{" "}
                      <span className="text-teal-400">
                        {userName ? "Focus" : "Expertise"}
                      </span>
                    </h1>
                  </div>

                  {/* Two-column layout: Sidebar + Grid */}
                  <div className="flex gap-8 items-start">
                    {/* ── SIDEBAR ── */}
                    <motion.aside
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="hidden lg:flex flex-col gap-5 w-64 xl:w-72 shrink-0 sticky top-24"
                    >
                      {userAction === "watch" ? (
                        <>
                          {/* Watch Mode Badge */}
                          <div className="bg-slate-950/70 backdrop-blur-2xl rounded-[2rem] p-6 border border-white/10 shadow-xl">
                            <div className="flex items-center gap-3 mb-5">
                              <div className="size-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
                                <PlayCircle className="size-5 text-amber-400" />
                              </div>
                              <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                                  Mode
                                </p>
                                <p className="text-xs font-black text-amber-400 uppercase tracking-widest">
                                  Watch Courses
                                </p>
                              </div>
                            </div>
                            <div className="space-y-3">
                              {[
                                {
                                  label: "Total Categories",
                                  val: `${domains.length}`,
                                  icon: BookOpen,
                                },
                                {
                                  label: "Free Courses",
                                  val: `${domains.filter((d) => d.isFree).length}`,
                                  icon: Zap,
                                },
                                {
                                  label: "Premium Courses",
                                  val: `${domains.filter((d) => !d.isFree).length}`,
                                  icon: Star,
                                },
                                {
                                  label: "Expert Instructors",
                                  val: "50+",
                                  icon: TrendingUp,
                                },
                              ].map((s, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <s.icon className="size-3.5 text-teal-400" />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                      {s.label}
                                    </span>
                                  </div>
                                  <span className="text-xs font-black text-white">
                                    {s.val}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Popular shortcuts */}
                          <div className="bg-slate-950/70 backdrop-blur-2xl rounded-[2rem] p-6 border border-white/10 shadow-xl">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-4">
                              Popular Topics
                            </p>
                            <div className="space-y-2">
                              {[
                                { label: "Computer/IT", id: "it", icon: Code },
                                {
                                  label: "Engineering",
                                  id: "eng",
                                  icon: Settings,
                                },
                                { label: "Science", id: "sci", icon: Atom },
                                {
                                  label: "Commerce",
                                  id: "comm",
                                  icon: TrendingUp,
                                },
                                {
                                  label: "Psychology",
                                  id: "psych",
                                  icon: Brain,
                                },
                              ].map((item, i) => (
                                <motion.button
                                  key={i}
                                  whileHover={{ x: 4 }}
                                  whileTap={{ scale: 0.97 }}
                                  onClick={() =>
                                    navigate({
                                      to: "/courses/$catId",
                                      params: { catId: item.id },
                                    })
                                  }
                                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left bg-white/5 hover:bg-teal-500/10 border border-white/5 hover:border-teal-500/20 transition-all group"
                                >
                                  <item.icon className="size-4 text-slate-500 group-hover:text-teal-400 transition-colors" />
                                  <span className="text-[10px] font-black text-slate-400 group-hover:text-white uppercase tracking-widest transition-colors">
                                    {item.label}
                                  </span>
                                  <ArrowRight className="size-3 ml-auto text-slate-600 group-hover:text-teal-400 group-hover:translate-x-1 transition-all" />
                                </motion.button>
                              ))}
                            </div>
                          </div>

                          {/* Tip Card */}
                          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-[2rem] p-6 border border-amber-500/20">
                            <Sparkles className="size-5 text-amber-400 mb-3" />
                            <p className="text-xs font-black text-white mb-1">
                              Pro Tip
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                              Enrolled students get access to downloadable PDFs
                              and certificates on course completion.
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Upload Mode Badge */}
                          <div className="bg-slate-950/70 backdrop-blur-2xl rounded-[2rem] p-6 border border-white/10 shadow-xl">
                            <div className="flex items-center gap-3 mb-5">
                              <div className="size-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
                                <CloudUpload className="size-5 text-violet-400" />
                              </div>
                              <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                                  Mode
                                </p>
                                <p className="text-xs font-black text-violet-400 uppercase tracking-widest">
                                  Upload Course
                                </p>
                              </div>
                            </div>
                            <div className="space-y-3">
                              {[
                                {
                                  label: "Step 1",
                                  val: "Pick Category",
                                  icon: Palette,
                                },
                                {
                                  label: "Step 2",
                                  val: "Fill Details",
                                  icon: BookOpen,
                                },
                                {
                                  label: "Step 3",
                                  val: "Publish & Earn",
                                  icon: Star,
                                },
                              ].map((s, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
                                >
                                  <div className="size-7 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                                    <s.icon className="size-3.5 text-violet-400" />
                                  </div>
                                  <div>
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                      {s.label}
                                    </p>
                                    <p className="text-[10px] font-black text-white">
                                      {s.val}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Upload Guidelines */}
                          <div className="bg-slate-950/70 backdrop-blur-2xl rounded-[2rem] p-6 border border-white/10 shadow-xl">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-4">
                              Upload Guidelines
                            </p>
                            <div className="space-y-3">
                              {[
                                { rule: "High Resolution Video", ok: true },
                                { rule: "Clear Audio Quality", ok: true },
                                { rule: "Original Content Only", ok: true },
                                { rule: "Educational Value", ok: true },
                                { rule: "No Copyrighted Music", ok: false },
                              ].map((g, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-3"
                                >
                                  <div
                                    className={`size-1.5 rounded-full shrink-0 ${g.ok ? "bg-teal-400" : "bg-rose-400"}`}
                                  />
                                  <span className="text-[10px] font-bold text-slate-400">
                                    {g.rule}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Creator Tip */}
                          <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/5 rounded-[2rem] p-6 border border-violet-500/20">
                            <Sparkles className="size-5 text-violet-400 mb-3" />
                            <p className="text-xs font-black text-white mb-1">
                              Creator Tip
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                              Specific subcategories help students find your
                              content 3× faster. Choose wisely!
                            </p>
                          </div>
                        </>
                      )}
                    </motion.aside>

                    {/* ── DOMAIN GRID ── */}
                    <div className="flex-1 min-w-0">
                      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {domains
                          .filter((d) => {
                            if (activeType === "all") return true;
                            return activeType === "free" ? d.isFree : !d.isFree;
                          })
                          .map((domain, i) => (
                            <motion.button
                              key={domain.id}
                              layout
                              whileHover={{ y: -8, scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                const uploadType = domain.isFree
                                  ? "free"
                                  : "paid";
                                if (userAction === "watch") {
                                  navigate({
                                    to: "/courses/$catId",
                                    params: { catId: domain.id },
                                  });
                                } else {
                                  const isSuperAdmin =
                                    sessionStorage.getItem("is_super_admin");
                                  if (
                                    !isSuperAdmin &&
                                    (!user || profile?.role !== "uploader")
                                  ) {
                                    navigate({
                                      to: "/login",
                                      search: {
                                        redirect: `/upload?category=${domain.t}&type=${uploadType}`,
                                        role: "uploader",
                                      } as any,
                                    });
                                  } else {
                                    navigate({
                                      to: "/upload",
                                      search: {
                                        category: domain.t,
                                        type: uploadType,
                                      },
                                    });
                                  }
                                }
                              }}
                              className="bg-slate-950/60 backdrop-blur-2xl p-7 rounded-[2.5rem] border border-white/10 shadow-sm hover:border-teal-500/30 hover:shadow-lg transition-all text-center flex flex-col items-center justify-center group"
                            >
                              <div
                                className={`size-14 rounded-2xl bg-gradient-to-br ${domain.color} text-white flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}
                              >
                                <domain.icon className="size-7" />
                              </div>
                              <h3 className="font-black text-white group-hover:text-teal-400 transition-colors leading-tight italic tracking-tight text-sm">
                                {domain.t}
                              </h3>
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1.5">
                                {domain.d}
                              </p>
                            </motion.button>
                          ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
