import { createFileRoute, Link } from "@tanstack/react-router";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { ModulePaywall } from "@/components/teacher/ModulePaywall";
import { ChevronLeft } from "lucide-react";

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
          {/* Full-screen iframe showing the sanchika directly */}
          <iframe
            src="/shikshak-sanchika.html"
            className="flex-1 w-full min-h-[calc(100vh-4rem)] border-none"
            title="शिक्षक संचिका"
          />
        </ModulePaywall>
      </main>
    </div>
  );
}

