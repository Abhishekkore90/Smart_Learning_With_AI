import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Users,
  CloudUpload,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Activity,
  GraduationCap,
  Sparkles,
  Layers,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect } from "react";

export const Route = createFileRoute("/admin/student-management")({
  head: () => ({
    meta: [{ title: "Student Management Hub — SMART LEARNING" }],
  }),
  component: StudentManagementHub,
});

const subModules = [
  {
    label: "Watchers",
    to: "/admin/watchers",
    icon: Users,
    sub: "System Students",
    desc: "Manage and monitor all student accounts and their activity across the platform.",
    color: "from-indigo-600 to-violet-700",
  },
  {
    label: "Uploaders",
    to: "/admin/uploaders",
    icon: CloudUpload,
    sub: "Content Creators",
    desc: "Control creator permissions and monitor uploaded courses and learning materials.",
    color: "from-blue-600 to-indigo-700",
  },
  {
    label: "Reviews",
    to: "/admin/reviews",
    icon: ClipboardList,
    sub: "Approval Queue",
    desc: "Verify and approve course content to maintain the highest institutional standards.",
    color: "from-violet-600 to-purple-700",
  },
];

function StudentManagementHub() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionStorage.getItem("is_super_admin")) {
      navigate({
        to: "/login",
        search: { redirect: "/admin/student-management", role: "admin" } as any,
      });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 selection:bg-violet-500/10 font-sans antialiased">
      <Header />

      <main className="max-w-[1400px] mx-auto px-8 pt-24 pb-24">
        <div className="mb-16 space-y-6">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-[10px] font-black text-violet-600 hover:gap-3 transition-all uppercase tracking-[0.2em]"
          >
            <ChevronLeft className="size-4" /> Back to System Hub
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-stone-900 leading-[0.9]">
                Student{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
                  Management.
                </span>
              </h1>
              <p className="text-[#6B7280] max-w-xl text-lg font-medium leading-relaxed">
                Centralized control for students, content creators, and the
                quality assurance pipeline.
              </p>
            </div>

            <div className="px-6 py-3 bg-white border border-black/5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="size-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Master Control Active
              </span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {subModules.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group"
            >
              <Link
                to={m.to as any}
                className="relative block h-full bg-white border border-black/5 rounded-[3rem] p-10 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]"
              >
                <div
                  className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 p-[2px] bg-gradient-to-br ${m.color} rounded-[3rem] -z-10`}
                />
                <div className="absolute inset-[2px] bg-white rounded-[3rem] -z-10" />

                <div className="relative z-10 flex flex-col h-full justify-between gap-12">
                  <div className="space-y-8">
                    <div
                      className={`size-20 rounded-[2rem] bg-gradient-to-br ${m.color} flex items-center justify-center shadow-xl group-hover:rotate-6 transition-all duration-500`}
                    >
                      <m.icon className="size-10 text-white" />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-3xl font-black tracking-tight text-stone-900">
                          {m.label}
                        </h3>
                        <ChevronRight className="size-6 text-slate-300 group-hover:translate-x-1 group-hover:text-indigo-600 transition-all" />
                      </div>
                      <p className="text-[#6B7280] text-sm leading-relaxed font-medium">
                        {m.desc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-8 border-t border-black/5">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                      {m.sub}
                    </span>
                    <div className="size-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                      <Activity className="size-4" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Global Stats Footer */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Students", val: "12,840", icon: Users },
            { label: "Verified Creators", val: "450", icon: GraduationCap },
            { label: "Pending Reviews", val: "24", icon: ClipboardList },
            { label: "System Health", val: "99.9%", icon: Sparkles },
          ].map((stat, i) => (
            <div
              key={i}
              className="p-8 bg-white border border-black/5 rounded-[2.5rem] shadow-sm flex flex-col items-center text-center gap-2"
            >
              <stat.icon className="size-5 text-slate-300 mb-2" />
              <div className="text-2xl font-black text-stone-900">
                {stat.val}
              </div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
