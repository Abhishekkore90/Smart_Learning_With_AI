import { createFileRoute } from "@tanstack/react-router";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";

export const Route = createFileRoute("/teacher/timetable/add-teacher")({
  component: AddTeacherPage,
});

function AddTeacherPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-64 pt-20 min-h-screen">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 md:p-8 mb-8 max-w-2xl mx-auto relative">
            <button className="absolute top-4 right-4 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded flex items-center justify-center transition-colors">
              <span className="sr-only">Close</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            <h2 className="text-xl font-bold text-center text-[#0f2d69] mb-8">
              Add Staff Details
            </h2>

            <form className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <label className="md:w-1/3 text-sm font-semibold text-slate-700">
                  Name of Staff
                </label>
                <div className="md:w-2/3">
                  <input
                    type="text"
                    placeholder="Name"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <label className="md:w-1/3 text-sm font-semibold text-slate-700">
                  Mobile Number
                </label>
                <div className="md:w-2/3">
                  <input
                    type="text"
                    placeholder="0000000000"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <label className="md:w-1/3 text-sm font-semibold text-slate-700">
                  Email ID
                </label>
                <div className="md:w-2/3">
                  <input
                    type="email"
                    placeholder="Enter Staff Email Id"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              <div className="pt-4 text-center">
                <button
                  type="button"
                  className="px-8 py-2.5 bg-[#0f2d69] hover:bg-blue-900 text-white font-medium rounded text-sm transition-colors"
                >
                  Add
                </button>
              </div>
            </form>
          </div>

          {/* Staff Data Table */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <h3 className="text-lg font-bold text-center text-[#0f2d69] p-4 border-b border-slate-200">
              Staff Data
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-center text-sm text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-semibold border-r border-slate-200">
                      Name of Staff
                    </th>
                    <th className="p-3 font-semibold border-r border-slate-200">
                      Mobile Number
                    </th>
                    <th className="p-3 font-semibold border-r border-slate-200">
                      Email ID
                    </th>
                    <th className="p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: "nhwa", mobile: "54vd", email: "env" },
                    {
                      name: "rohit",
                      mobile: "0780887654",
                      email: "rohitp@gmail.com",
                    },
                    {
                      name: "JAANU",
                      mobile: "7887547689",
                      email: "JANUM@GMAIL.COM",
                    },
                    {
                      name: "Sagar",
                      mobile: "8530275602",
                      email: "sag@gmail.com",
                    },
                    {
                      name: "Vaishali madam",
                      mobile: "9156740152",
                      email: "vaishu@gmail.com",
                    },
                    {
                      name: "Aniket Kusundal",
                      mobile: "9175501971",
                      email: "aniketkusundal0@gmail.com",
                    },
                  ].map((staff, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-slate-200 last:border-0 hover:bg-slate-50"
                    >
                      <td className="p-3 border-r border-slate-200">
                        {staff.name}
                      </td>
                      <td className="p-3 border-r border-slate-200">
                        {staff.mobile}
                      </td>
                      <td className="p-3 border-r border-slate-200">
                        {staff.email}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <button className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded">
                            Edit
                          </button>
                          <button className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded">
                            Delete
                          </button>
                          <button className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs rounded">
                            More
                          </button>
                        </div>
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
