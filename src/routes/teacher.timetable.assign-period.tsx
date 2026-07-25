import { createFileRoute } from "@tanstack/react-router";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";

export const Route = createFileRoute("/teacher/timetable/assign-period")({
  component: AssignPeriodPage,
});

function AssignPeriodPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-64 pt-20 min-h-screen">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-center text-[#0f2d69] mb-6">
            Period Assign Timetable
          </h2>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">
                Number of Periods :
              </label>
              <input
                type="number"
                defaultValue={1}
                className="w-16 p-1.5 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">
                Year :
              </label>
              <select className="p-1.5 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm">
                <option>Select a Year</option>
              </select>
            </div>
            <button
              type="button"
              className="px-4 py-1.5 bg-[#198754] hover:bg-green-700 text-white font-medium rounded text-sm transition-colors"
            >
              Save
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-slate-200 mb-12 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  Select a weekday:
                </label>
                <select className="w-full p-2 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm">
                  <option>-- Select Weekday --</option>
                  <option>Monday</option>
                  <option>Tuesday</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  Select a teacher:
                </label>
                <select className="w-full p-2 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm">
                  <option>-- Select Teacher --</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  Period Name
                </label>
                <input
                  type="text"
                  placeholder="Select Period"
                  className="w-full p-2 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  Start Time
                </label>
                <div className="relative">
                  <input
                    type="time"
                    className="w-full p-2 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  End Time
                </label>
                <div className="relative">
                  <input
                    type="time"
                    className="w-full p-2 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  Class
                </label>
                <select className="w-full p-2 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm">
                  <option>Select Class</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">
                    Division
                  </label>
                  <select className="w-full p-2 bg-slate-100 border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm">
                    <option>Select Division</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">
                    Subject
                  </label>
                  <select className="w-full p-2 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm">
                    <option>Select Subject</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-[#0d6efd] hover:bg-blue-700 text-white font-medium rounded text-sm transition-colors"
                >
                  Add Period
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-[#dc3545] hover:bg-red-700 text-white font-medium rounded text-sm transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-center font-semibold text-slate-800 mb-4">
              Assigned Periods
            </h3>
            <div className="bg-white overflow-x-auto border border-slate-700 shadow-sm">
              <table className="w-full text-center text-sm text-slate-700 whitespace-nowrap">
                <thead className="bg-[#dbeafe] border-b border-slate-700">
                  <tr>
                    <th className="p-2 font-bold border-r border-slate-700">
                      Weekday
                    </th>
                    <th className="p-2 font-bold border-r border-slate-700">
                      Period Name
                    </th>
                    <th className="p-2 font-bold border-r border-slate-700">
                      Start Time
                    </th>
                    <th className="p-2 font-bold border-r border-slate-700">
                      End Time
                    </th>
                    <th className="p-2 font-bold border-r border-slate-700">
                      Class
                    </th>
                    <th className="p-2 font-bold border-r border-slate-700">
                      Division
                    </th>
                    <th className="p-2 font-bold border-r border-slate-700">
                      Teacher
                    </th>
                    <th className="p-2 font-bold border-r border-slate-700">
                      Subject
                    </th>
                    <th className="p-2 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      day: "Monday",
                      period: "1",
                      start: "10:00 AM",
                      end: "11:00 AM",
                      cls: "Class I",
                      div: "-",
                      teacher: "वैभव अविनाश लोखंडे",
                      sub: "marathi",
                    },
                    {
                      day: "Monday",
                      period: "1",
                      start: "3:30 PM",
                      end: "4:30 PM",
                      cls: "Class I",
                      div: "-",
                      teacher: "Ashish patil",
                      sub: "Hindi",
                    },
                    {
                      day: "Monday",
                      period: "1",
                      start: "3:27 PM",
                      end: "3:27 PM",
                      cls: "Class II",
                      div: "-",
                      teacher: "Sagar",
                      sub: "Marathi",
                    },
                    {
                      day: "Monday",
                      period: "1",
                      start: "1:37 PM",
                      end: "2:38 PM",
                      cls: "Class II",
                      div: "-",
                      teacher: "vishal patil",
                      sub: "maths 2",
                    },
                    {
                      day: "Monday",
                      period: "1",
                      start: "3:05 PM",
                      end: "3:18 PM",
                      cls: "Class II",
                      div: "-",
                      teacher: "ganesh patil",
                      sub: "Drawing",
                    },
                  ].map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-slate-700 last:border-0 hover:bg-slate-50"
                    >
                      <td className="p-2 border-r border-slate-700">
                        {row.day}
                      </td>
                      <td className="p-2 border-r border-slate-700">
                        {row.period}
                      </td>
                      <td className="p-2 border-r border-slate-700">
                        {row.start}
                      </td>
                      <td className="p-2 border-r border-slate-700">
                        {row.end}
                      </td>
                      <td className="p-2 border-r border-slate-700">
                        {row.cls}
                      </td>
                      <td className="p-2 border-r border-slate-700">
                        {row.div}
                      </td>
                      <td className="p-2 border-r border-slate-700">
                        {row.teacher}
                      </td>
                      <td className="p-2 border-r border-slate-700">
                        {row.sub}
                      </td>
                      <td className="p-2">
                        <button className="px-3 py-1 bg-[#dc3545] hover:bg-red-700 text-white text-xs font-medium rounded">
                          Delete
                        </button>
                      </td>
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
