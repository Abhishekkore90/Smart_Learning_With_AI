import { createFileRoute } from "@tanstack/react-router";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { useState } from "react";

export const Route = createFileRoute("/teacher/timetable/add-subject")({
  component: AddSubjectPage,
});

interface SubjectEntry {
  id: string;
  name: string;
  year: string;
  classLevel: string;
}

function AddSubjectPage() {
  const [year, setYear] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjects, setSubjects] = useState<SubjectEntry[]>([]);

  const handleSave = () => {
    if (!subjectName.trim()) return;

    const newSubject: SubjectEntry = {
      id: `SUB-${(subjects.length + 1).toString().padStart(3, "0")}`,
      name: subjectName,
      year,
      classLevel,
    };

    setSubjects([...subjects, newSubject]);
    setSubjectName(""); // clear only subject name for quick entry
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-64 pt-20 min-h-screen">
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold text-center text-[#0f2d69] mb-8">
              Add Subject
            </h2>

            <form
              className="space-y-6 max-w-3xl mx-auto"
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
            >
              {/* Year */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Year :
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm text-slate-700"
                >
                  <option value="">Select Year</option>
                  <option value="2026-2027">2026-2027</option>
                  <option value="2027-2028">2027-2028</option>
                </select>
              </div>

              {/* Class */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Class :
                </label>
                <select
                  value={classLevel}
                  onChange={(e) => setClassLevel(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm text-slate-700"
                >
                  <option value="">Select Class</option>
                  <option value="1st">1st</option>
                  <option value="2nd">2nd</option>
                  <option value="3rd">3rd</option>
                  <option value="4th">4th</option>
                  <option value="5th">5th</option>
                </select>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Subject :
                </label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm text-slate-700"
                  placeholder="Enter subject name"
                />
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-6 py-2 bg-[#0d6efd] hover:bg-blue-700 text-white font-medium rounded text-sm transition-colors"
                >
                  Save
                </button>
              </div>
            </form>

            {/* All Subjects Table */}
            <div className="mt-12 max-w-3xl mx-auto">
              <h3 className="text-xl font-bold text-slate-800 mb-4">
                All Subjects
              </h3>

              <div className="overflow-x-auto border border-slate-200 rounded">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-3 font-bold w-32 border-r border-slate-200">
                        ID
                      </th>
                      <th className="p-3 font-bold">Subject</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.length === 0 ? (
                      <tr>
                        <td
                          colSpan={2}
                          className="p-4 text-center text-slate-500"
                        >
                          No subjects added yet
                        </td>
                      </tr>
                    ) : (
                      subjects.map((sub) => (
                        <tr
                          key={sub.id}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                        >
                          <td className="p-3 border-r border-slate-200">
                            {sub.id}
                          </td>
                          <td className="p-3">{sub.name}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
