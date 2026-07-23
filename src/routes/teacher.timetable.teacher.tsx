import { createFileRoute } from "@tanstack/react-router";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";

export const Route = createFileRoute("/teacher/timetable/teacher")({
  component: TeacherTimetablePage,
});

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function TeacherTimetablePage() {
  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      <TeacherHeader />
      <div className="flex flex-1 mt-16">
        <TeacherSidebar />
        <main className="flex-1 lg:pl-64 p-6">
          <div className="max-w-5xl mx-auto space-y-8 pt-4">
            <div className="text-center space-y-4">
              <h1 className="text-xl font-medium text-slate-800">
                Teacher Timetable
              </h1>

              <div className="mx-auto w-full max-w-sm border border-slate-100 rounded p-4 bg-white shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)]">
                <label className="block text-left text-xs font-semibold text-slate-600 mb-2">
                  Select Teacher
                </label>
                <select className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm text-slate-700 outline-none focus:border-blue-500 bg-white">
                  <option value="">Select Teacher</option>
                </select>
              </div>
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-base font-medium text-slate-800">
                Chintamanrao Institute of Technology University
              </h2>
              <p className="text-[11px] text-slate-600 font-medium">
                Tal:- Andheri, Dist:- Mumbai City
              </p>
            </div>

            <div className="border border-slate-200 rounded-sm overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#bce0fd]">
                    <th className="py-2.5 px-4 font-bold text-slate-800 border-b border-r border-slate-200 w-1/2">
                      Day
                    </th>
                    <th className="py-2.5 px-4 font-bold text-slate-800 border-b border-slate-200 w-1/2">
                      Period 1
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day) => (
                    <tr
                      key={day}
                      className="bg-slate-50 border-b border-slate-200 last:border-b-0"
                    >
                      <td className="py-2 px-4 text-center text-slate-600 border-r border-slate-200">
                        {day}
                      </td>
                      <td className="py-2 px-4 text-center text-slate-500">
                        -
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button className="bg-[#0066ff] hover:bg-blue-600 text-white text-[11px] font-medium py-2 px-4 rounded shadow-sm transition-colors">
              Print Timetable
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
