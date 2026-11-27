import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { HpcNav } from "@/hpc/components/HpcNav";
import { HpcDashboard } from "@/hpc/components/HpcDashboard";
import { ModulePaywall } from "@/components/teacher/ModulePaywall";

export const Route = createFileRoute("/teacher/hpc")({
  head: () => ({
    meta: [{ title: "समग्र प्रगतिपत्रक (HPC) व्यवस्थापन — SMART LEARNING" }],
  }),
  component: TeacherHpcLayout,
});

function TeacherHpcLayout() {
  const location = useLocation();
  const isIndex =
    location.pathname === "/teacher/hpc" || location.pathname === "/teacher/hpc/";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/25 to-purple-50/20 font-sans selection:bg-indigo-600 selection:text-white">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-0 pt-16 min-h-screen">
        <HpcNav />

        <div className="p-4 sm:p-6 md:p-8">
          <ModulePaywall moduleId="hpc-card" isPaidTab={true}>
            {isIndex ? <HpcDashboard /> : <Outlet />}
          </ModulePaywall>
        </div>
      </main>
    </div>
  );
}
