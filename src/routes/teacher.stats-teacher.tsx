import { createFileRoute, Link } from "@tanstack/react-router";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/teacher/stats-teacher")({
  component: TeacherStatsPage,
});

function TeacherStatsPage() {
  return (
    <div className="h-screen overflow-hidden bg-slate-100">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-64 pt-16 h-screen flex flex-col">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-200 shadow-sm shrink-0">
          <Link
            to="/teacher"
            className="inline-flex items-center gap-1 text-xs font-black text-slate-500 hover:text-indigo-600 uppercase tracking-widest transition-colors"
          >
            <ChevronLeft className="size-3.5" /> Back
          </Link>
<<<<<<< HEAD
          <span className="text-sm font-black text-slate-700">शिक्षक संचिका</span>
=======
          <span className="text-sm font-black text-slate-700">
            शिक्षक संचिका
          </span>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
        </div>

        {/* Full-screen iframe showing the sanchika directly */}
        <iframe
          src="/shikshak-sanchika.html"
          className="flex-1 w-full border-none"
          title="शिक्षक संचिका"
        />
      </main>
    </div>
  );
}
