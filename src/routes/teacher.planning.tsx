import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { AcademicPlanningSystem } from "@/components/teacher/AcademicPlanningSystem";

export const Route = createFileRoute("/teacher/planning")({
  component: TeacherPlanningPage,
});

function TeacherPlanningPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50">
      <TeacherHeader />

      <main className="pt-16 min-h-screen w-full px-2 sm:px-4 py-4">
        <AcademicPlanningSystem mode="teacher" onBack={() => navigate({ to: "/teacher" })} />
      </main>
    </div>
  );
}
