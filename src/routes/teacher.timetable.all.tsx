import { createFileRoute } from "@tanstack/react-router";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";

export const Route = createFileRoute("/teacher/timetable/all")({
  component: AllTimetablePage,
});

function AllTimetablePage() {
  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      <TeacherHeader />
      <div className="flex flex-1 mt-16">
        <TeacherSidebar />
        <main className="flex-1 lg:pl-64 p-6 relative">
          <div className="absolute top-32 left-8 md:left-16 space-y-2 z-10">
            <button className="bg-[#2e7d32] hover:bg-green-800 text-white text-[13px] font-medium py-1.5 px-4 rounded-sm shadow-sm transition-colors">
              Print Timetable
            </button>
            <p className="text-[13px] text-slate-600">No data available</p>
          </div>

          <div className="flex flex-col items-center pt-8 w-full">
            <h1 className="text-[22px] text-slate-800 mb-6">All Timetable</h1>

            <div className="w-full max-w-[400px] border border-slate-200 p-5 bg-white shadow-[0_4px_20px_-5px_rgba(0,0,0,0.15)] rounded-sm">
              <label className="block text-left text-[13px] font-bold text-slate-800 mb-3">
                Select Type:
              </label>
              <select className="w-full px-2 py-1.5 border border-slate-300 rounded-[3px] text-[13px] text-slate-700 outline-none focus:border-blue-500 bg-white">
                <option value="">--Select--</option>
              </select>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
