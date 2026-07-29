import { createFileRoute } from "@tanstack/react-router";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { AcademicPlanningSystem } from "@/components/teacher/AcademicPlanningSystem";

export const Route = createFileRoute("/teacher/planning")({
  component: TeacherPlanningPage,
});

function TeacherPlanningPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <TeacherHeader />

      <main className="pt-16 min-h-screen w-full px-2 sm:px-4 py-4">
        <AcademicPlanningSystem mode="teacher" />
      </main>
    </div>
  );
}
