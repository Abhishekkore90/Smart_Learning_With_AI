import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Footer } from "@/components/Footer";
import { AcademicPlanningSystem } from "@/components/teacher/AcademicPlanningSystem";

export const Route = createFileRoute("/teacher/planning-view")({
  head: () => ({
    meta: [{ title: "Academic Planning & Curriculum View — Teacher Portal" }],
  }),
  component: TeacherPlanningViewPage,
});

function TeacherPlanningViewPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 py-6">
        <AcademicPlanningSystem mode="teacher" onBack={() => navigate({ to: "/teacher" })} />
      </main>

      <Footer />
    </div>
  );
}
