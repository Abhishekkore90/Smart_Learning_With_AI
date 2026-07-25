import { createFileRoute } from "@tanstack/react-router";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";

export const Route = createFileRoute("/teacher/timetable/assign-class-subject")(
  {
    component: AssignClassSubjectPage,
  },
);

function AssignClassSubjectPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-64 pt-20 min-h-screen">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-center text-[#0f2d69] mb-6">
            Assign Class & Subject to Teacher
          </h2>

          <div className="bg-white rounded-lg shadow-sm border border-slate-700 mb-8 max-w-2xl mx-auto p-6 md:p-8">
            <form className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  Year:
                </label>
                <select className="w-full p-2.5 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm">
                  <option>Select a Year</option>
                  <option>2026-2027</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  Teacher:
                </label>
                <select className="w-full p-2.5 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm">
                  <option>Select a Teacher</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  Class:
                </label>
                <select className="w-full p-2.5 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm">
                  <option>Select a Class</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  Division:
                </label>
                <select className="w-full p-2.5 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm">
                  <option>Select a Division</option>
                </select>
              </div>

              <div className="space-y-1 pb-4">
                <label className="block text-sm font-medium text-slate-700">
                  Subject:
                </label>
                <select className="w-full p-2.5 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm">
                  <option>Select a Subject</option>
                </select>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  className="px-16 py-2.5 bg-[#4caf50] hover:bg-green-600 text-white font-medium rounded text-sm transition-colors"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>

          <div className="max-w-5xl mx-auto">
            <h3 className="text-lg font-medium text-center text-slate-800 mb-4">
              Saved Data
            </h3>

            <div className="bg-white overflow-x-auto border border-slate-700">
              <table className="w-full text-center text-sm text-slate-700">
                <thead className="bg-[#dbeafe] border-b border-slate-700">
                  <tr>
                    <th className="p-3 font-semibold border-r border-slate-700">
                      Teacher
                    </th>
                    <th className="p-3 font-semibold border-r border-slate-700">
                      Class
                    </th>
                    <th className="p-3 font-semibold">Subject</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { teacher: "Ashish patil", cls: "2", sub: "Marathi" },
                    { teacher: "Ashish patil", cls: "Class I", sub: "English" },
                    { teacher: "Ashish patil", cls: "Class II", sub: "Hindi" },
                    {
                      teacher: "Ashish patil",
                      cls: "Class IX",
                      sub: "English",
                    },
                    { teacher: "Isha Gaikwad", cls: "4", sub: "Marathi" },
                    { teacher: "JAANU", cls: "Class II", sub: "English" },
                    { teacher: "Rohan", cls: "Class I", sub: "English" },
                    { teacher: "Rohan", cls: "Class II", sub: "Marathi" },
                    { teacher: "Rohan", cls: "Class IV", sub: "sanskrit" },
                    { teacher: "SARINA ATTAR", cls: "Class I", sub: "Marathi" },
                  ].map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-slate-700 last:border-0 hover:bg-slate-50"
                    >
                      <td className="p-3 border-r border-slate-700">
                        {row.teacher}
                      </td>
                      <td className="p-3 border-r border-slate-700">
                        {row.cls}
                      </td>
                      <td className="p-3">{row.sub}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
