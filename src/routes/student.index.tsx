import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  GraduationCap,
  ChevronRight,
  Calendar as CalendarIcon,
  Bell,
  Clock,
  BookOpen,
  Trophy,
  Star,
  Activity,
  CreditCard,
  Gift,
  Download,
  User,
  Layout,
  MessageSquare,
  Sparkles,
  Zap,
  ClipboardCheck,
  TrendingUp,
  MapPin,
  Phone,
  Hash,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { StudentSidebar } from "@/components/student/StudentSidebar";
import { StudentHeader } from "@/components/student/StudentHeader";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/student/")({
  component: StudentDashboard,
});

function StudentDashboard() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [notices, setNotices] = useState<any[]>([]);
  const [homework, setHomework] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    if (!authLoading) {
      if (sessionStorage.getItem("is_super_admin")) {
        // Super Admin is allowed to browse, but typically they manage from /admin
        return;
      }
      if (!user || profile?.role !== "student") {
        navigate({
          to: "/login",
          search: { redirect: "/student", role: "student" } as any,
        });
        return;
      }
    }

    const qNotices = query(
      collection(db, "notices"),
      orderBy("createdAt", "desc"),
      limit(3),
    );
    const unsubNotices = onSnapshot(qNotices, (snapshot) => {
      setNotices(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const qHomework = query(
      collection(db, "homework"),
      orderBy("createdAt", "desc"),
      limit(2),
    );
    const unsubHomework = onSnapshot(qHomework, (snapshot) => {
      setHomework(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubNotices();
      unsubHomework();
    };
  }, [user, profile, authLoading, navigate]);

  if (!mounted || authLoading || !user)
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">
            Initializing Portal...
          </p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50/50">
      <StudentHeader />
      <StudentSidebar />

      <main className="lg:pl-64 pt-16 min-h-screen">
        <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto">
          {/* Header / Welcome Hero */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-700 rounded-[3rem] opacity-5 shadow-2xl blur-3xl -z-10" />
            <div className="bg-white p-10 md:p-16 rounded-[4rem] border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-10 relative overflow-hidden">
              <div className="absolute top-[-10%] right-[-10%] size-96 bg-indigo-50 rounded-full blur-3xl -z-10" />

              <div className="space-y-4 relative z-10">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100 text-[10px] font-black uppercase tracking-[0.3em]"
                >
                  <Sparkles size={14} /> Scholastic Identity Verified
                </motion.div>
                <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[0.9] italic">
                  Welcome back, <br />
                  <span className="text-indigo-600">
                    {profile?.fullName || "Scholar"}
                  </span>
                </h1>
                <p className="text-slate-400 text-lg font-medium max-w-md">
                  Today is{" "}
                  <span className="text-slate-900 font-bold">
                    {new Date().toLocaleDateString("en-GB", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </span>
                  . Ready to architect your future?
                </p>
              </div>

              <div className="flex items-center gap-8 shrink-0">
                <div className="flex flex-col items-center gap-3">
                  <div className="size-24 rounded-[2.5rem] bg-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-indigo-200 rotate-3 hover:rotate-0 transition-transform">
                    <GraduationCap size={40} />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Class {profile?.class || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Core Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              label="Attendance"
              value="94.2%"
              icon={Activity}
              sub="Last 30 days"
              color="indigo"
              trend="+2.1%"
            />
            <MetricCard
              label="Fee Status"
              value="Paid"
              icon={CreditCard}
              sub="Term 2 Clearance"
              color="emerald"
              trend="Clear"
            />
            <MetricCard
              label="GPA Score"
              value="3.8"
              icon={Trophy}
              sub="Out of 4.0"
              color="amber"
              trend="Top 5%"
            />
            <MetricCard
              label="Tasks"
              value="04"
              icon={ClipboardCheck}
              sub="Pending Homework"
              color="violet"
              trend="Urgent"
            />
          </div>

          {/* Performance Analytics & Profile */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Analytics */}
            <div className="lg:col-span-2 bg-white rounded-[3rem] border border-slate-200 p-10 shadow-sm space-y-10">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight italic">
                    Performance Matrix
                  </h3>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    Global Institutional Benchmarking
                  </p>
                </div>
                <button className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-600 transition-all">
                  <Download size={14} /> Download Transcript
                </button>
              </div>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={[
                      { name: "Unit 1", score: 78, avg: 72 },
                      { name: "Unit 2", score: 85, avg: 74 },
                      { name: "Midterm", score: 82, avg: 70 },
                      { name: "Unit 3", score: 94, avg: 75 },
                      { name: "Final", score: 92, avg: 78 },
                    ]}
                  >
                    <defs>
                      <linearGradient
                        id="colorScore"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#4F46E5"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#4F46E5"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 10,
                        fontWeight: "bold",
                        fill: "#94a3b8",
                      }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "24px",
                        border: "none",
                        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.1)",
                      }}
                      itemStyle={{ fontSize: "12px", fontWeight: "bold" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#4F46E5"
                      fillOpacity={1}
                      fill="url(#colorScore)"
                      strokeWidth={4}
                      dot={{
                        fill: "#4F46E5",
                        r: 6,
                        strokeWidth: 2,
                        stroke: "#fff",
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Scholar Profile Summary */}
            <div className="bg-slate-900 rounded-[3rem] p-10 text-white flex flex-col justify-between relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                <User size={200} />
              </div>
              <div className="space-y-8 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="size-20 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center overflow-hidden">
                    {profile?.profilePhoto ? (
                      <img
                        src={profile.profilePhoto}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="size-10" />
                    )}
                  </div>
                  <div className="text-right">
                    <div className="px-3 py-1 bg-indigo-600 rounded-full text-[8px] font-black uppercase tracking-widest">
                      Active Scholar
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="text-2xl font-black italic tracking-tight uppercase">
                    {profile?.fullName}
                  </h4>
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                    <Hash size={12} /> {profile?.usid || "USID-PENDING"}
                  </div>
                </div>
                <div className="space-y-4 pt-6 border-t border-white/10">
                  <ProfileInfo
                    label="Standard"
                    val={`${profile?.class || "N/A"} Grade`}
                    icon={GraduationCap}
                  />
                  <ProfileInfo
                    label="Mobile"
                    val={profile?.phone || "N/A"}
                    icon={Phone}
                  />
                  <ProfileInfo
                    label="Address"
                    val={profile?.address || "N/A"}
                    icon={MapPin}
                  />
                </div>
              </div>
              <Link
                to="/profile"
                className="relative z-10 w-full py-5 bg-white text-slate-900 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-indigo-400 hover:text-white transition-all shadow-xl mt-10"
              >
                Edit Scholar Identity
              </Link>
            </div>
          </div>

          {/* Bottom Interaction Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Notices Board */}
            <InteractionPanel
              title="Official Broadcasts"
              subtitle="Live Institutional Updates"
              icon={Bell}
              cta="View All Notices"
              to="/student/notices"
            >
              <div className="space-y-4">
                {notices.map((n, i) => (
                  <div
                    key={n.id}
                    className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white transition-all group"
                  >
                    <div className="size-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 font-black text-xs shadow-sm border border-slate-50">
                      {n.date?.split("-")[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-black text-slate-900 line-clamp-1">
                        {n.text}
                      </p>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        {n.date}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </InteractionPanel>

            {/* Homework & Assignments */}
            <InteractionPanel
              title="Knowledge Tasks"
              subtitle="Active Assignments"
              icon={BookOpen}
              cta="Open Workshop"
              to="/student/homework"
            >
              <div className="space-y-4">
                {homework.map((h, i) => (
                  <div
                    key={h.id}
                    className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 flex items-center justify-between group hover:bg-white transition-all"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-black text-slate-900 uppercase tracking-tight italic">
                        {h.subject}
                      </p>
                      <p className="text-[10px] font-bold text-indigo-600/60 uppercase tracking-widest">
                        Due: {h.deadline}
                      </p>
                    </div>
                    <div className="size-8 rounded-full bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                      <ChevronRight size={14} />
                    </div>
                  </div>
                ))}
              </div>
            </InteractionPanel>

            {/* Life & Culture (Birthdays & Activities) */}
            <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm flex flex-col">
              <div className="p-8 border-b border-slate-50 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-2xl bg-pink-50 flex items-center justify-center text-pink-600">
                    <Gift size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight italic">
                      Scholastic Spirit
                    </h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                      Life at the Academy
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex-1 p-8 space-y-6">
                <div className="bg-gradient-to-br from-pink-50 to-rose-50 p-6 rounded-3xl border border-pink-100 flex items-center gap-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Star size={60} />
                  </div>
                  <div className="size-14 rounded-full border-4 border-white bg-white flex items-center justify-center text-2xl">
                    🎂
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest italic">
                      Scholar Birthdays
                    </p>
                    <p className="text-[10px] font-bold text-pink-600 mt-1">
                      2 classmates celebrating today!
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-3xl border border-emerald-100 flex items-center gap-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Zap size={60} />
                  </div>
                  <div className="size-14 rounded-full border-4 border-white bg-white flex items-center justify-center text-2xl">
                    🎭
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest italic">
                      Cultural Updates
                    </p>
                    <p className="text-[10px] font-bold text-emerald-600 mt-1">
                      Annual Fest registrations open.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="h-10" />
        </div>
      </main>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, sub, color, trend }: any) {
  const colors: any = {
    indigo: "from-indigo-600 to-indigo-700 shadow-indigo-100",
    emerald: "from-emerald-600 to-emerald-700 shadow-emerald-100",
    amber: "from-amber-500 to-amber-600 shadow-amber-100",
    violet: "from-violet-600 to-violet-700 shadow-violet-100",
  };

  return (
    <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div
            className={`size-12 rounded-2xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform`}
          >
            <Icon size={20} />
          </div>
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
            {trend}
          </span>
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-black text-slate-900 tracking-tighter">
            {value}
          </p>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
              {label}
            </span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              {sub}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileInfo({ label, val, icon: Icon }: any) {
  return (
    <div className="flex items-center gap-4">
      <div className="size-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 shrink-0">
        <Icon size={14} />
      </div>
      <div>
        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
          {label}
        </p>
        <p className="text-[11px] font-bold text-white tracking-tight">{val}</p>
      </div>
    </div>
  );
}

function InteractionPanel({
  title,
  subtitle,
  icon: Icon,
  children,
  cta,
  to,
}: any) {
  return (
    <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm flex flex-col">
      <div className="p-8 border-b border-slate-50 space-y-4">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Icon size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight italic">
              {title}
            </h3>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
              {subtitle}
            </p>
          </div>
        </div>
      </div>
      <div className="flex-1 p-8">{children}</div>
      <div className="p-8 pt-0">
        <Link
          to={to}
          className="w-full py-4 bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl font-black text-[9px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-indigo-600 hover:text-white transition-all shadow-sm group"
        >
          {cta}{" "}
          <ChevronRight
            size={14}
            className="group-hover:translate-x-1 transition-transform"
          />
        </Link>
      </div>
    </div>
  );
}
