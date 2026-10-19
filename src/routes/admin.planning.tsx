import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Footer } from "@/components/Footer";
import { AcademicPlanningSystem } from "@/components/teacher/AcademicPlanningSystem";

export const Route = createFileRoute("/admin/planning")({
  head: () => ({
    meta: [{ title: "Academic Planning Management — Admin Panel" }],
  }),
  component: AdminPlanningPage,
});

function AdminPlanningPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-2 w-full">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 uppercase tracking-wider transition-colors"
        >
          <ChevronLeft className="size-4" /> Back to Admin Dashboard
        </Link>
      </div>
      <main className="flex-1 pb-6">
        <AcademicPlanningSystem mode="admin" onBack={() => navigate({ to: "/admin" })} />
      </main>

      <Footer />
    </div>
  );
}
