import { createFileRoute } from "@tanstack/react-router";
import { Footer } from "@/components/Footer";
import { AcademicPlanningSystem } from "@/components/teacher/AcademicPlanningSystem";

export const Route = createFileRoute("/admin/planning-management")({
  head: () => ({
    meta: [{ title: "Curriculum & Planning Management — Admin Panel" }],
  }),
  component: AdminPlanningManagementPage,
});

function AdminPlanningManagementPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 py-6">
        <AcademicPlanningSystem mode="admin" />
      </main>

      <Footer />
    </div>
  );
}
