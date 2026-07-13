import { createFileRoute, Link } from "@tanstack/react-router";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { Star, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/teacher/special-day")({
  component: TeacherSpecialDayPage,
});

function TeacherSpecialDayPage() {
  return (
    <div className="min-h-screen bg-slate-50/50">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-64 pt-16 min-h-screen">
        <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 flex flex-col justify-center min-h-[calc(100vh-8rem)]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-[3rem] p-10 md:p-16 text-center max-w-xl mx-auto shadow-xl space-y-8"
          >
            <div className="size-20 bg-amber-50 rounded-[2rem] flex items-center justify-center text-amber-500 mx-auto shadow-sm">
              <Star className="size-10 animate-pulse" />
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                विशेष दिवस / <span className="text-amber-500">Special Days</span>
              </h1>
              <p className="text-slate-500 font-medium leading-relaxed">
                शाळेतील विविध दिनविशेष, महापुरुषांची जयंती व राष्ट्रीय सण यांची माहिती आणि उपक्रम येथे लवकरच उपलब्ध होतील.
              </p>
              <p className="text-slate-400 text-xs font-bold leading-relaxed italic">
                Information about national events, national heroes anniversaries, and school functions is coming soon.
              </p>
            </div>

            <div className="pt-4">
              <Link
                to="/teacher"
                className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg active:scale-95"
              >
                <ChevronLeft className="size-4" /> Go to Dashboard
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
