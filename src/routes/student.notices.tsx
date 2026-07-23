import { createFileRoute } from "@tanstack/react-router";
import { StudentHeader } from "@/components/student/StudentHeader";
import { StudentSidebar } from "@/components/student/StudentSidebar";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import {
  Bell,
  ChevronRight,
  GraduationCap,
  MapPin,
  Search,
  Star,
  Trophy,
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  Layout,
  Sparkles,
  MessageCircle,
  Hash,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/student/notices")({
  component: StudentNoticesPage,
});

function StudentNoticesPage() {
  const [notices, setNotices] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNotices(data);
    });
    return () => unsubscribe();
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white">
      <StudentHeader />
      <StudentSidebar />

      <main className="lg:pl-64 pt-16 min-h-screen bg-slate-50/50">
        <div className="p-6 md:p-10 space-y-10 max-w-5xl mx-auto">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic">
                Digital Notice Board
              </h1>
              <div className="flex items-center gap-3">
                <span className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.3em]">
                  Official Broadcast Hub
                </span>
                <div className="size-1 bg-slate-300 rounded-full" />
                <span className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">
                  Live Stream
                </span>
              </div>
            </div>
            <div className="size-14 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-100">
              <Bell className="size-7 animate-ring" />
            </div>
          </header>

          <div className="grid grid-cols-1 gap-6">
            {notices.length > 0 ? (
              notices.map((notice, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={notice.id}
                  className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-2xl hover:border-indigo-100 transition-all group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex gap-8 items-start">
                      <div className="flex flex-col items-center min-w-[70px] p-4 bg-slate-50 rounded-[2rem] border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                        <span className="text-indigo-600 font-black text-sm group-hover:text-white transition-colors">
                          {notice.date.split("-")[0]}
                        </span>
                        <span className="text-slate-400 font-bold text-[10px] uppercase group-hover:text-indigo-100 transition-colors">
                          {notice.date.split("-")[1]}
                        </span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase tracking-widest border border-indigo-100">
                            Official Notification
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Clock size={12} /> Just Now
                          </span>
                        </div>
                        <h3 className="font-black text-slate-800 text-xl md:text-2xl tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">
                          {notice.text}
                        </h3>
                      </div>
                    </div>
                    <button className="self-end md:self-center px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-indigo-600 transition-all shadow-xl">
                      Read Full Detail
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="p-32 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                <div className="size-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-slate-300">
                  <Bell size={40} />
                </div>
                <h3 className="text-slate-900 font-black text-xl tracking-tight">
                  No New Broadcasts
                </h3>
                <p className="text-slate-400 text-sm font-medium mt-2">
                  The notice board is currently empty. Check back soon for
                  updates.
                </p>
              </div>
            )}
          </div>

          {/* Bottom Banner */}
          <div className="p-10 bg-indigo-600 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-10" />
            <div className="relative z-10 flex items-center gap-8">
              <div className="size-16 rounded-[1.5rem] bg-white/20 flex items-center justify-center backdrop-blur-xl">
                <Sparkles className="size-8" />
              </div>
              <div>
                <h4 className="text-xl font-black italic tracking-tight italic">
                  Stay Informed
                </h4>
                <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mt-1">
                  Real-time alerts directly from your institution's
                  administration.
                </p>
              </div>
            </div>
            <div className="relative z-10 size-12 bg-white/10 rounded-full flex items-center justify-center border border-white/20 animate-bounce">
              <ArrowRight className="size-6" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
