import { createFileRoute, Link } from "@tanstack/react-router";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { ModulePaywall } from "@/components/teacher/ModulePaywall";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/teacher/stats-teacher")({
  component: TeacherStatsPage,
});

function TeacherStatsPage() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <TeacherHeader />
      <TeacherSidebar />
      <main className="lg:pl-0 pt-16 flex-1 flex flex-col">
        <ModulePaywall moduleId="stats-teacher" defaultTitle="शिक्षक संचिका (Teacher Portfolio)">
          <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between">
            <Link
              to="/teacher"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="size-4 text-indigo-600" />
              <span>मुख्य डॅशबोर्डवर मागे जा (Back to Dashboard)</span>
            </Link>
          </div>
          {/* Full-screen iframe showing the sanchika directly */}
          <iframe
            src="/shikshak-sanchika.html"
            className="flex-1 w-full min-h-[calc(100vh-7rem)] border-none"
            title="शिक्षक संचिका"
          />
        </ModulePaywall>
      </main>
    </div>
  );
}

