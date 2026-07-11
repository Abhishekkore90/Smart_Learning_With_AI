import { createFileRoute } from "@tanstack/react-router";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { showToast as toast } from "@/lib/custom-toast";
import {
  Trash2,
  Plus,
  Bell,
  Calendar as CalendarIcon,
  MessageSquare,
} from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/teacher/notices")({
  component: TeacherNoticesPage,
});

function TeacherNoticesPage() {
  const [notices, setNotices] = useState<any[]>([]);
  const [newNoticeText, setNewNoticeText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
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

  const handleAddNotice = async () => {
    if (!newNoticeText) {
      toast.error("Please enter notice text");
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "notices"), {
        text: newNoticeText,
        date: new Date().toLocaleDateString("en-GB").replace(/\//g, "-"),
        createdAt: new Date().toISOString(),
        type: "Official",
      });
      setNewNoticeText("");
      toast.success("Notice published to all students!");
    } catch (e) {
      toast.error("Failed to publish notice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    try {
      await deleteDoc(doc(db, "notices", id));
      toast.info("Notice removed");
    } catch (e) {
      toast.error("Failed to remove notice");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-64 pt-16 min-h-screen">
        <div className="p-6 md:p-10 space-y-8 max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                Institutional <span className="text-blue-600">Notices</span>
              </h1>
              <p className="text-slate-500 text-sm font-medium mt-1">
                Publish and manage official announcements for students.
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <div className="size-2 bg-blue-600 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Live Sync Active
              </span>
            </div>
          </div>

          {/* Add Notice Section */}
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Plus className="size-4 text-blue-600" /> Create New Announcement
            </h3>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newNoticeText}
                  onChange={(e) => setNewNoticeText(e.target.value)}
                  placeholder="Type your announcement here..."
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner"
                />
              </div>
              <button
                onClick={handleAddNotice}
                disabled={isSubmitting}
                className="bg-blue-600 text-white rounded-2xl px-10 py-4 shadow-lg hover:bg-blue-700 transition-all text-xs font-black uppercase tracking-widest disabled:opacity-50"
              >
                {isSubmitting ? "Publishing..." : "Publish Notice"}
              </button>
            </div>
          </div>

          {/* Notice List */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Bell className="size-4 text-blue-600" /> Active Notices (
                {notices.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-50">
              {notices.length > 0 ? (
                notices.map((notice, idx) => (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={notice.id}
                    className="p-8 hover:bg-slate-50/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group"
                  >
                    <div className="flex gap-6 items-start">
                      <div className="flex flex-col items-center min-w-[60px] p-3 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-white transition-colors">
                        <span className="text-blue-600 font-black text-xs">
                          {notice.date.split("-")[0]}
                        </span>
                        <span className="text-slate-400 font-bold text-[10px] uppercase">
                          {notice.date.split("-")[1]}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[8px] font-black uppercase tracking-widest">
                            {notice.type || "Official"}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <CalendarIcon size={10} /> {notice.date}
                          </span>
                        </div>
                        <p className="font-bold text-slate-800 text-lg leading-relaxed">
                          {notice.text}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all">
                        <MessageSquare size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteNotice(notice.id)}
                        className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="p-20 text-center">
                  <div className="size-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                    <Bell size={40} />
                  </div>
                  <h3 className="text-slate-400 font-black uppercase tracking-widest text-xs">
                    No active notices found
                  </h3>
                  <p className="text-slate-300 text-[10px] font-bold mt-2 italic">
                    Use the form above to post a new announcement.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
