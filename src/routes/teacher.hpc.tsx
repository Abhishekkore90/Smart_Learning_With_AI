import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { HpcNav } from "@/hpc/components/HpcNav";
import { HpcDashboard } from "@/hpc/components/HpcDashboard";

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
    <div className="min-h-screen bg-slate-50/70 font-sans">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-0 pt-16 min-h-screen">
        <HpcNav />

        <div className="p-4 sm:p-6 md:p-8">
          {isIndex ? <HpcDashboard /> : <Outlet />}
        </div>
      </main>
    </div>
  );
}
