import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Users,
  Video,
  Sparkles,
  GraduationCap,
  ChevronRight,
  ShieldAlert,
  Activity,
  Database,
  Settings,
  PieChart,
  Zap,
  Globe,
  ShieldCheck,
  Search,
  Bell,
  ArrowUpRight,
  Cpu,
  Layers,
  Terminal,
  BarChart3,
  Fingerprint,
  Lock,
  ClipboardList,
  Eye,
  CloudUpload,
  Book,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { db } from "@/lib/firebase";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Super Admin Command Center — SMART LEARNING" }],
  }),
  component: AdminDashboard,
});

const adminModules = [
  {
    title: "Student Management",
    desc: "Comprehensive control of system students, course uploaders, and the content review queue.",
    icon: Users,
    to: "/admin/student-management",
    color: "from-indigo-600 to-violet-700",
    glow: "bg-indigo-400/20",
    stats: "Unified Hub",
    trend: "System Root",
    status: "Active",
  },
  {
    title: "Teachers & Mentors",
    desc: "Direct access to expert profiles and mentorship scheduling.",
    icon: GraduationCap,
    to: "/admin/teachers",
    color: "from-amber-500 to-yellow-600",
    glow: "bg-amber-400/20",
    stats: "Global Network",
    trend: "+5 new apps",
  },
  {
    title: "Enrollment Matrix",
    desc: "Track global enrollments, payment status, and course progress.",
    icon: Layers,
    to: "/admin/enrollments",
    color: "from-emerald-600 to-teal-700",
    glow: "bg-emerald-400/20",
    stats: "Financial Ledger",
    trend: "Live Sync",
  },
  {
    title: "SQAAF Evidences Config",
    desc: "Configure evidence checklist options and blank lines for standard compliance checklists.",
    icon: ClipboardList,
    to: "/admin/sqaaf-config",
    color: "from-pink-600 to-rose-500",
    glow: "bg-pink-400/20",
    stats: "128 Standards",
    trend: "Local Storage",
    status: "Active",
  },
  {
    title: "Meeting Templates",
    desc: "Set pre-defined (fixed) subjects and resolutions month-wise for all committee sittings.",
    icon: ClipboardList,
    to: "/admin/meeting-templates",
    color: "from-pink-500 to-rose-600",
    glow: "bg-rose-400/20",
    stats: "Committee Agenda",
    trend: "Month-Wise",
  },
  {
    title: "Teacher Diary Uploader",
    desc: "Upload and manage official teaching diaries and lesson guidelines by class and month.",
    icon: CloudUpload,
    to: "/admin/teacher-diary",
    color: "from-violet-600 to-indigo-700",
    glow: "bg-violet-400/20",
    stats: "Teaching Diaries",
    trend: "Live Sync",
  },
  {
    title: "Timetable Uploader",
    desc: "Upload, configure and manage class timetables and schedules for all classes.",
    icon: Calendar,
    to: "/admin/timetable",
    color: "from-sky-500 to-indigo-600",
    glow: "bg-sky-400/20",
    stats: "Class Timetables",
    trend: "Live Sync",
  },
  {
    title: "Daily Assembly Book",
    desc: "Upload and manage guidebooks and references for Daily Assembly (Paripath).",
    icon: Book,
    to: "/admin/assembly",
    color: "from-amber-500 to-yellow-600",
    glow: "bg-amber-400/20",
    stats: "Assembly Guides",
    trend: "Live Sync",
  },
];

const LivePulse = () => (
  <div className="flex items-center gap-1.5">
    <motion.div
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 1.5, repeat: Infinity }}
      className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
    />
    <span className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-600">
      Live
    </span>
  </div>
);

function AdminDashboard() {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    const isAdmin = sessionStorage.getItem("is_super_admin");
    if (!isAdmin) {
      navigate({
        to: "/login",
        search: { redirect: "/admin", role: "admin" } as any,
      });
      return;
    }

    const fetchPending = async () => {
      try {
        const { collection, getDocs, query, where } =
          await import("firebase/firestore");
        const q = query(
          collection(db, "videos"),
          where("status", "==", "pending"),
        );
        const snapshot = await getDocs(q);
        setPendingCount(snapshot.docs.length);
      } catch (e) {
        console.error("Error fetching pending count:", e);
      }
    };

    fetchPending();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [navigate]);
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 selection:bg-violet-500/10 font-sans antialiased">
      <Header />

      <main className="max-w-[1600px] mx-auto px-8 pt-16 pb-24">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-20 gap-10">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="px-4 py-1.5 bg-[#111827] rounded-full flex items-center gap-2.5">
                <ShieldAlert className="size-3.5 text-white" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white">
                  System Root Access
                </span>
              </div>
              <div className="text-[10px] font-bold text-[#6B7280] font-mono tracking-tighter">
                {currentTime.toLocaleTimeString()} | 0.4ms LATENCY
              </div>
            </div>
            <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-stone-900 leading-[0.9]">
              System{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-emerald-600">
                Hub.
              </span>
            </h1>
            <p className="text-[#6B7280] max-w-xl text-lg font-medium leading-relaxed">
              Global control center for SMART LEARNING. Orchestrate, scale, and
              monitor the global educational ecosystem with precision.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {adminModules.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative group"
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0, 0.5, 0],
                }}
                transition={{ duration: 4, repeat: Infinity }}
                className={`absolute inset-0 blur-[60px] rounded-full -z-10 transition-opacity opacity-0 group-hover:opacity-100 ${m.glow}`}
              />

              <Link
                to={m.to as any}
                className="relative block h-full bg-white border border-black/5 rounded-[3rem] p-10 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] group"
              >
                <div
                  className={`absolute inset-0 opacity-20 group-hover:opacity-100 transition-opacity duration-500 p-[2px] bg-gradient-to-br ${m.color} rounded-[3rem] -z-10`}
                />
                <div className="absolute inset-[2px] bg-white rounded-[3rem] -z-10" />

                <div className="relative z-10 flex flex-col h-full justify-between gap-10">
                  <div className="space-y-6">
                    <div
                      className={`size-16 rounded-2xl bg-gradient-to-br ${m.color} flex items-center justify-center shadow-lg group-hover:rotate-3 transition-all duration-500`}
                    >
                      <m.icon className="size-8 text-white" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3
                          className={`text-2xl font-black tracking-tight text-stone-900 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r ${m.color} transition-all`}
                        >
                          {m.title}
                        </h3>
                        <LivePulse />
                      </div>
                      <p className="text-[#6B7280] text-sm leading-relaxed font-medium">
                        {m.desc}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between pt-6 border-t border-black/5">
                      <div>
                        <div className="text-xs font-black text-stone-900">
                          {m.title === "Student Management" &&
                          pendingCount !== null
                            ? `${pendingCount} Reviews Pending`
                            : m.stats}
                        </div>
                        <div className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">
                          {m.trend}
                        </div>
                      </div>
                      <div className="text-xs text-slate-300 group-hover:text-indigo-600 transition-colors">
                        <ChevronRight className="size-6 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
