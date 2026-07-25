import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Music,
  Mic2,
  Palette,
  Theater,
  Camera,
  Video,
  MapPin,
  Calendar,
  Clock,
  Trophy,
  Share2,
  Download,
  Send,
  ArrowLeft,
  Star,
  Heart,
  PartyPopper,
  Users,
  GraduationCap,
  Megaphone,
  Flame,
  Zap,
  Crown,
  School,
  MessageCircle,
  Ticket,
  Timer,
  UserCheck,
  Play,
} from "lucide-react";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { showToast as toast } from "@/lib/custom-toast";
import confetti from "canvas-confetti";

export const Route = createFileRoute("/teacher/activities/annual")({
  component: AnnualFunctionPage,
});

const PERFORMANCE_CARDS = [
  {
    id: 1,
    title: "Welcome Dance (Ganesh Vandana)",
    time: "05:00 PM",
    icon: Sparkles,
    participants: "12 Students",
    bg: "linear-gradient(135deg, #1a1a1a 0%, #3d2b1f 100%)",
    accent: "#bf953f",
  },
  {
    id: 2,
    title: "The Great Maratha Drama",
    time: "05:45 PM",
    icon: Theater,
    participants: "24 Students",
    bg: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
    accent: "#818cf8",
  },
  {
    id: 3,
    title: "High Fashion Fusion Show",
    time: "06:30 PM",
    icon: Crown,
    participants: "18 Students",
    bg: "linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)",
    accent: "#f87171",
  },
  {
    id: 4,
    title: "Harmonic Youth Choir",
    time: "07:15 PM",
    icon: Mic2,
    participants: "40 Students",
    bg: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
    accent: "#34d399",
  },
  {
    id: 5,
    title: "Annual Prize Ceremony",
    time: "08:00 PM",
    icon: Trophy,
    participants: "All Winners",
    bg: "linear-gradient(135deg, #09090b 0%, #27272a 100%)",
    accent: "#facc15",
  },
];

function AnnualFunctionPage() {
  const [timeLeft, setTimeLeft] = useState({ days: 12, hours: 0, mins: 0 });

  useEffect(() => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#bf953f", "#fcf6ba", "#b38728"],
    });
  }, []);

  const handleShareInvite = (performance: string) => {
    const message = `🎭 *School Annual Function 2026* 🌟\n\nYou are cordially invited to witness our grand celebration!\n\n✨ *Highlight:* ${performance}\n📅 *Date:* 25th Dec 2026\n📍 *Venue:* School Main Ground\n\n— Experience the magic of our students' talent! ❤️`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    toast.success("Invitation link generated!");
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-64 pt-16 min-h-screen">
        <div className="p-6 md:p-12 space-y-16">
          {/* Back Button */}
          <Link
            to="/teacher/activities"
            className="inline-flex items-center gap-3 text-slate-400 hover:text-white font-black text-xs uppercase tracking-widest transition-all"
          >
            <ArrowLeft className="size-5" /> Back to Activities
          </Link>

          {/* Premium Hero Section with Stage Lights Effect */}
          <div className="relative overflow-hidden rounded-[4rem] p-12 md:p-24 border border-white/10 bg-slate-900 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)]">
            {/* Animated Stage Lights */}
            <div className="absolute top-0 left-1/4 w-px h-[500px] bg-white/20 rotate-[30deg] blur-[10px] animate-pulse" />
            <div className="absolute top-0 right-1/4 w-px h-[500px] bg-white/20 -rotate-[30deg] blur-[10px] animate-pulse delay-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

            <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-12">
              <div className="space-y-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-amber-500/20 backdrop-blur-xl rounded-full border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-[0.4em]"
                >
                  <Crown className="size-4" /> 10th Annual Function 2026
                </motion.div>
                <h1 className="text-7xl md:text-9xl font-black tracking-tighter leading-none">
                  A LEGACY OF{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#b38728] italic">
                    EXCELLENCE
                  </span>
                </h1>
                <p className="text-slate-400 font-medium max-w-3xl text-2xl leading-relaxed">
                  Join us for a mesmerizing night of dance, drama, and
                  celebration as we honor our students' achievements and
                  creativity.
                </p>
                <div className="flex gap-6 pt-6">
                  <button className="px-12 py-6 bg-gradient-to-r from-[#bf953f] to-[#b38728] text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-2xl shadow-amber-500/20">
                    Register Students
                  </button>
                  <button className="px-12 py-6 bg-white/5 backdrop-blur-xl border border-white/10 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all">
                    Download Schedule
                  </button>
                </div>
              </div>

              {/* Countdown Timer */}
              <div className="bg-white/5 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 space-y-6 w-full md:w-auto">
                <div className="flex items-center gap-4 mb-4">
                  <Timer className="size-6 text-amber-500" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 leading-none">
                    Countdown to Grand Opening
                  </p>
                </div>
                <div className="flex gap-8">
                  {[
                    { val: timeLeft.days, label: "DAYS" },
                    { val: "12", label: "HOURS" },
                    { val: "45", label: "MINS" },
                  ].map((t, i) => (
                    <div key={i} className="text-center">
                      <p className="text-5xl font-black tracking-tighter mb-1 leading-none">
                        {t.val}
                      </p>
                      <p className="text-[8px] font-black text-slate-500 tracking-[0.4em]">
                        {t.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
            {/* Performance Timeline */}
            <div className="xl:col-span-2 space-y-12">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-4xl font-black tracking-tighter italic">
                    Event Program
                  </h3>
                  <p className="text-slate-500 text-sm font-bold mt-1 uppercase tracking-widest">
                    Main Stage Timeline
                  </p>
                </div>
                <div className="size-14 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/20">
                  <Play className="size-6 text-amber-500 fill-amber-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {PERFORMANCE_CARDS.map((card, idx) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    whileHover={{ y: -10 }}
                    className="relative p-1 rounded-[3.5rem] overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${card.accent}33, transparent)`,
                    }}
                  >
                    <div className="bg-slate-900 rounded-[3.4rem] p-10 h-full border border-white/5 space-y-8">
                      <div className="flex justify-between items-start">
                        <div className="size-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                          <card.icon
                            className="size-8 text-white"
                            style={{ color: card.accent }}
                          />
                        </div>
                        <span className="text-[10px] font-black px-4 py-2 bg-white/5 rounded-full border border-white/10 tracking-[0.2em]">
                          {card.time}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-2xl font-black leading-tight tracking-tight">
                          {card.title}
                        </h4>
                        <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">
                          {card.participants}
                        </p>
                      </div>

                      <div className="flex gap-4 pt-4">
                        <button
                          onClick={() => handleShareInvite(card.title)}
                          className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/10 flex items-center justify-center gap-3 transition-all"
                        >
                          <MessageCircle className="size-4" /> Share Card
                        </button>
                        <button className="size-14 bg-white text-slate-900 rounded-2xl flex items-center justify-center hover:scale-110 transition-transform">
                          <Download className="size-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Sidebar Stats & Info */}
            <div className="space-y-10">
              {/* Chief Guest Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-slate-900 to-black p-10 rounded-[3.5rem] border border-white/10 space-y-8 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-10 opacity-5">
                  <UserCheck className="size-40" />
                </div>
                <div className="space-y-2 relative z-10">
                  <p className="text-amber-500 text-[10px] font-black uppercase tracking-[0.4em]">
                    Chief Guest 2026
                  </p>
                  <h3 className="text-3xl font-black tracking-tighter">
                    Hon. Dr. Rajesh Shinde
                  </h3>
                  <p className="text-slate-400 font-medium">
                    Minister of Education, Maharashtra State
                  </p>
                </div>
                <div className="flex -space-x-3 relative z-10 pt-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="size-12 rounded-full border-4 border-slate-900 bg-slate-800"
                    />
                  ))}
                  <div className="size-12 rounded-full border-4 border-slate-900 bg-amber-500 flex items-center justify-center text-[10px] font-black">
                    +12 VIPs
                  </div>
                </div>
              </motion.div>

              {/* Venue Details */}
              <div className="bg-white/5 p-10 rounded-[3.5rem] border border-white/10 space-y-8">
                <div className="flex items-center gap-5">
                  <div className="size-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                    <MapPin className="size-7 text-indigo-400" />
                  </div>
                  <h4 className="text-2xl font-black italic tracking-tighter">
                    Venue Details
                  </h4>
                </div>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="size-2 bg-indigo-500 rounded-full mt-2" />
                    <div>
                      <p className="text-sm font-black text-white/80">
                        Shivaji Global Arena
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Main Sports Pavilion, East Campus
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="size-2 bg-pink-500 rounded-full mt-2" />
                    <div>
                      <p className="text-sm font-black text-white/80">
                        Parking Available
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Gate No. 4 for Parents & Guests
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-6">
                <button className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 flex flex-col items-center gap-4 hover:bg-white/10 transition-all">
                  <Camera className="size-8 text-amber-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                    Gallery
                  </span>
                </button>
                <button className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 flex flex-col items-center gap-4 hover:bg-white/10 transition-all">
                  <Video className="size-8 text-pink-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                    Highlights
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
