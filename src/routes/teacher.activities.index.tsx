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
  ArrowRight,
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
} from "lucide-react";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/teacher/activities/")({
  component: ActivitiesHubPage,
});

function ActivitiesHubPage() {
  const mainSections = [
    {
      id: "annual",
      title: "Annual Function",
      description:
        "Manage stage performances, chief guests, schedules, and premium invitations.",
      icon: Crown,
      color: "from-amber-400 to-orange-600",
      bg: "bg-amber-50",
      textColor: "text-amber-600",
      link: "/teacher/activities/annual",
      badges: ["Gala Event", "Invitations", "Video Highlights"],
    },
    {
      id: "cultural",
      title: "Cultural Activities",
      description:
        "Organize competitions like Dance, Singing, Drawing, and Traditional Day celebrations.",
      icon: Palette,
      color: "from-emerald-400 to-teal-600",
      bg: "bg-emerald-50",
      textColor: "text-emerald-600",
      link: "/teacher/activities/cultural",
      badges: ["Competitions", "Registration", "certificates"],
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-64 pt-16 min-h-screen">
        <div className="p-6 md:p-12 space-y-12 max-w-7xl mx-auto">
          {/* Hero Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-slate-900 rounded-[3.5rem] p-10 md:p-20 text-white shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 via-transparent to-pink-600/30" />
            <div className="absolute -right-20 -top-20 size-[500px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-12">
              <div className="space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-500/20 backdrop-blur-xl rounded-full border border-indigo-500/30 text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]"
                >
                  <Sparkles className="size-4" /> School Activity Management
                </motion.div>
                <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-none italic">
                  Event{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
                    Mastery
                  </span>
                </h2>
                <p className="text-slate-400 font-medium max-w-2xl text-xl leading-relaxed">
                  The ultimate command center for orchestrating school events.
                  From grand annual galas to creative cultural competitions.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="size-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md">
                  <Star className="size-8 text-amber-400 animate-pulse" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Main Category Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {mainSections.map((section, idx) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -10 }}
                className="group relative bg-white rounded-[4rem] p-8 md:p-12 shadow-xl border border-slate-100 overflow-hidden"
              >
                {/* Decorative Background Icon */}
                <div className="absolute -right-20 -bottom-20 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                  <section.icon className="size-96 text-slate-900" />
                </div>

                <div className="relative z-10 space-y-8">
                  <div
                    className={`size-24 rounded-[2rem] bg-gradient-to-br ${section.color} p-0.5 shadow-2xl`}
                  >
                    <div className="w-full h-full bg-white rounded-[1.9rem] flex items-center justify-center">
                      <section.icon
                        className={`size-10 ${section.textColor}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter">
                      {section.title}
                    </h3>
                    <p className="text-slate-500 font-medium text-lg leading-relaxed">
                      {section.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {section.badges.map((b) => (
                      <span
                        key={b}
                        className="px-4 py-2 bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-slate-100"
                      >
                        {b}
                      </span>
                    ))}
                  </div>

                  <Link
                    to={section.link as any}
                    className="flex items-center gap-3 text-lg font-black text-slate-900 group/btn"
                  >
                    Manage Section{" "}
                    <ArrowRight className="size-5 group-hover/btn:translate-x-2 transition-transform" />
                  </Link>
                </div>

                {/* Animated Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
              </motion.div>
            ))}
          </div>

          {/* Quick Stats / Info Footer */}
          <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="size-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <Calendar className="size-8 text-indigo-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                  Upcoming Milestone
                </p>
                <p className="text-xl font-black text-slate-900">
                  Annual Sports Meet • 15 Days Left
                </p>
              </div>
            </div>
            <button className="px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all">
              View School Calendar
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
