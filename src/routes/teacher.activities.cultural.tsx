import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Music,
  Palette,
  Theater,
  Mic2,
  Star,
  PartyPopper,
  Heart,
  Users,
  Download,
  Send,
  ArrowLeft,
  MessageCircle,
  Info,
  Camera,
  PenTool,
  Sparkles,
  BookOpen,
  History,
  Trophy,
  Zap,
  School,
} from "lucide-react";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { showToast as toast } from "@/lib/custom-toast";

export const Route = createFileRoute("/teacher/activities/cultural")({
  component: CulturalActivitiesPage,
});

const CULTURAL_ACTIVITIES = [
  {
    id: 1,
    name: "Dance Competition",
    date: "Oct 12",
    icon: Music,
    color: "bg-pink-500",
    gradient: "from-pink-400 to-rose-600",
    desc: "Showcase your rhythm and moves in various dance styles.",
    img: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: 2,
    name: "Singing Competition",
    date: "Oct 15",
    icon: Mic2,
    color: "bg-indigo-500",
    gradient: "from-indigo-400 to-blue-600",
    desc: "A platform for young vocalists to share their soulful voices.",
    img: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: 3,
    name: "Drawing Competition",
    date: "Oct 18",
    icon: Palette,
    color: "bg-amber-500",
    gradient: "from-amber-400 to-orange-600",
    desc: "Let your imagination flow on canvas with vibrant colors.",
    img: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: 4,
    name: "Rangoli Art Contest",
    date: "Oct 20",
    icon: Sparkles,
    color: "bg-emerald-500",
    gradient: "from-emerald-400 to-teal-600",
    desc: "Celebrate tradition with intricate and colorful patterns.",
    img: "https://images.unsplash.com/photo-1582230303831-29e1966e632d?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: 5,
    name: "Fancy Dress Show",
    date: "Oct 22",
    icon: Theater,
    color: "bg-violet-500",
    gradient: "from-violet-400 to-purple-600",
    desc: "Step into character and bring your favorite icons to life.",
    img: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: 6,
    name: "Story Telling",
    date: "Oct 25",
    icon: BookOpen,
    color: "bg-cyan-500",
    gradient: "from-cyan-400 to-sky-600",
    desc: "Enchant the audience with your narrative skills.",
    img: "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: 7,
    name: "Poetry Recitation",
    date: "Oct 28",
    icon: PenTool,
    color: "bg-rose-500",
    gradient: "from-rose-400 to-red-600",
    desc: "Express profound emotions through the power of verse.",
    img: "https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: 8,
    name: "Traditional Day",
    date: "Nov 01",
    icon: History,
    color: "bg-orange-500",
    gradient: "from-orange-400 to-amber-600",
    desc: "A day to honor and celebrate our rich cultural roots.",
    img: "https://images.unsplash.com/photo-1583089892943-e02e5b017b6a?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: 9,
    name: "Art & Craft",
    date: "Nov 05",
    icon: Zap,
    color: "bg-blue-500",
    gradient: "from-blue-400 to-indigo-600",
    desc: "Transform simple materials into beautiful creations.",
    img: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: 10,
    name: "Talent Hunt",
    date: "Nov 10",
    icon: Trophy,
    color: "bg-yellow-500",
    gradient: "from-yellow-400 to-amber-500",
    desc: "Uncover and showcase the unique hidden stars of our school.",
    img: "https://images.unsplash.com/photo-1496337589254-7e19d01ced44?q=80&w=400&auto=format&fit=crop",
  },
];

function CulturalActivitiesPage() {
  const [activeId, setActiveId] = useState<number | null>(null);

  const handleSendCard = (activity: any) => {
    const message = `🎨 *Cultural Activity Registration* ✨\n\nYour child is invited to participate in the *${activity.name}*!\n\n📅 *Date:* ${activity.date}, 2026\n📝 *Description:* ${activity.desc}\n\n— Let's celebrate creativity together! ❤️`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    toast.success(`${activity.name} card sent to WhatsApp!`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-64 pt-16 min-h-screen">
        <div className="p-6 md:p-12 space-y-12 max-w-7xl mx-auto">
          {/* Back Button */}
          <Link
            to="/teacher/activities"
            className="inline-flex items-center gap-3 text-slate-400 hover:text-slate-900 font-black text-xs uppercase tracking-widest transition-all"
          >
            <ArrowLeft className="size-5" /> Back to Activities
          </Link>

          {/* Vibrant Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-white rounded-[4rem] p-12 md:p-20 shadow-2xl border border-slate-100"
          >
            <div className="absolute -right-20 -top-20 size-96 bg-emerald-500/5 rounded-full blur-[100px]" />
            <div className="absolute -left-20 -bottom-20 size-96 bg-indigo-500/5 rounded-full blur-[100px]" />

            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-12 text-center md:text-left">
              <div className="space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[10px] font-black uppercase tracking-[0.4em]"
                >
                  <Palette className="size-4" /> Cultural & Creative Hub
                </motion.div>
                <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-slate-900 leading-none">
                  Cultivating{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-indigo-600">
                    Creativity
                  </span>
                </h1>
                <p className="text-slate-500 font-medium max-w-2xl text-xl leading-relaxed mx-auto md:mx-0">
                  Organize, manage, and celebrate the diverse talents of your
                  students across 10+ artistic disciplines.
                </p>
              </div>
              <div className="flex gap-6">
                <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-50 text-center">
                  <p className="text-4xl font-black text-slate-900 leading-none mb-1">
                    10
                  </p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                    Activities
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Activity Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
            {CULTURAL_ACTIVITIES.map((activity, idx) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                onHoverStart={() => setActiveId(activity.id)}
                onHoverEnd={() => setActiveId(null)}
                className="group relative bg-white rounded-[4rem] p-6 shadow-xl border border-slate-50 overflow-hidden hover:shadow-2xl transition-all"
              >
                {/* Image Section */}
                <div className="aspect-[16/10] rounded-[3rem] overflow-hidden relative mb-8">
                  <img
                    src={activity.img}
                    alt={activity.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-6 right-6">
                    <div
                      className={`px-5 py-2 rounded-full border border-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest`}
                    >
                      {activity.date}
                    </div>
                  </div>
                  <div className="absolute bottom-6 left-8">
                    <div
                      className={`size-14 rounded-2xl ${activity.color} flex items-center justify-center shadow-2xl`}
                    >
                      <activity.icon className="size-7 text-white" />
                    </div>
                  </div>
                </div>

                <div className="px-4 space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                      {activity.name}
                    </h3>
                    <p className="text-slate-500 font-medium text-sm leading-relaxed line-clamp-2">
                      {activity.desc}
                    </p>
                  </div>

                  <div className="pt-4 flex gap-4">
                    <button className="flex-1 py-5 bg-slate-50 text-slate-900 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                      <Info className="size-4" /> View Details
                    </button>
                    <button
                      onClick={() => handleSendCard(activity)}
                      className={`flex-1 py-5 bg-gradient-to-r ${activity.gradient} text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/10 hover:scale-105 transition-all flex items-center justify-center gap-2`}
                    >
                      <MessageCircle className="size-4" /> Send Card
                    </button>
                  </div>
                </div>

                {/* Animated Background Icon on Hover */}
                <AnimatePresence>
                  {activeId === activity.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                      animate={{ opacity: 0.05, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="absolute -right-10 -bottom-10 pointer-events-none"
                    >
                      <activity.icon className="size-48 text-slate-900" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          {/* Quick Registration Footer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 rounded-[4rem] p-12 md:p-16 text-white relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-transparent" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="space-y-4 text-center md:text-left">
                <h3 className="text-4xl font-black tracking-tighter">
                  Student Participation
                </h3>
                <p className="text-slate-400 font-medium max-w-xl text-lg leading-relaxed">
                  Generate certificates, track registrations, and manage the
                  talent leaderboard for all cultural events.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-6 w-full md:w-auto">
                <button className="px-10 py-5 bg-white text-slate-900 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:scale-105 transition-all">
                  Talent Leaderboard
                </button>
                <button className="px-10 py-5 bg-emerald-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20">
                  Bulk Registration
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
