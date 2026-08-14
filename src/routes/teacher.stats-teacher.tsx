import { createFileRoute, Link } from "@tanstack/react-router";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/teacher/stats-teacher")({
  component: TeacherStatsPage,
});

function TeacherStatsPage() {
  return (
    <div className="h-screen overflow-hidden bg-slate-100 flex flex-col">
      {/* Full-screen iframe showing the sanchika directly */}
      <iframe
        src="/shikshak-sanchika.html"
        className="flex-1 w-full border-none"
        title="शिक्षक संचिका"
      />
    </div>
  );
}
