import { createFileRoute } from "@tanstack/react-router";
import {
  HelpCircle,
  Book,
  Languages,
  Beaker,
  Calculator,
  Globe,
  ScrollText,
  Users,
  Search,
  Clock,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { StudentSidebar } from "@/components/student/StudentSidebar";
import { StudentHeader } from "@/components/student/StudentHeader";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

export const Route = createFileRoute("/student/question-bank")({
  component: StudentQuestionBank,
});

const CLASSES = [
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
];
const SUBJECTS = [
  { id: "marathi", name: "Marathi", icon: Languages },
  { id: "hindi", name: "Hindi", icon: Languages },
  { id: "english", name: "English", icon: Book },
  { id: "science", name: "Science", icon: Beaker },
  { id: "maths", name: "Maths", icon: Calculator },
  { id: "geography", name: "Geography", icon: Globe },
  { id: "history", name: "History", icon: ScrollText },
  { id: "civics", name: "Civics", icon: Users },
];

function StudentQuestionBank() {
  const [selectedClass, setSelectedClass] = useState("1st");
  const [selectedSubjectId, setSelectedSubjectId] = useState(SUBJECTS[0].id);
  const [selectedSemester, setSelectedSemester] = useState("1");
  const [questions, setQuestions] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setMounted(true);
    let isMounted = true;

    const fetchQuestionBank = () => {
      const q = query(
        collection(db, "question_bank"),
        orderBy("createdAt", "desc"),
      );

      return onSnapshot(
        q,
        (snapshot) => {
          if (!isMounted) return;
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setQuestions(data);
        },
        (error) => {
          console.warn("Student ordered query failed, falling back to unordered:", error);
          onSnapshot(
            collection(db, "question_bank"),
            (snapshot) => {
              if (!isMounted) return;
              const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }));
              setQuestions(data);
            },
            (err2) => {
              console.error("Student Firestore question_bank fetch error:", err2);
            }
          );
        }
      );
    };

    const unsubscribe = fetchQuestionBank();
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const handleDownload = async (unitName: string, subjectId: string) => {
    const subject = SUBJECTS.find((s) => s.id === subjectId)?.name || "Subject";
    const filename = `Question_Bank_${subject}_${unitName.replace(/\s+/g, "_")}.pdf`;

    try {
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const container = document.createElement("div");
      container.style.padding = "20px";
      container.style.fontFamily = "sans-serif";

      const currentQuestions = filteredData.length > 0 ? filteredData : [
        { text: `${subject} ${unitName} sample question 1`, type: "Objective", marks: "1" },
        { text: `${subject} ${unitName} sample question 2`, type: "Descriptive", marks: "2" },
      ];

      let rowsHtml = currentQuestions
        .map(
          (q, i) =>
            `<tr style="border-bottom:1px solid #ccc;">
              <td style="padding:8px;text-align:center;">${i + 1}</td>
              <td style="padding:8px;">${q.text || "Question"}</td>
              <td style="padding:8px;text-align:center;">${q.type || "Objective"}</td>
              <td style="padding:8px;text-align:center;">${q.marks || 1}</td>
            </tr>`
        )
        .join("");

      container.innerHTML = `
        <div style="text-align:center;margin-bottom:15px;">
          <h2 style="color:#1e1b4b;margin:0;">Student Question Bank — ${subject}</h2>
          <p style="color:#555;margin:5px 0;">Class: ${selectedClass} | Semester: ${selectedSemester} | ${unitName}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;border:1px solid #ccc;">
          <thead>
            <tr style="background:#3f19c9;color:#fff;">
              <th style="padding:8px;">Sr.No.</th>
              <th style="padding:8px;">Question / Topic</th>
              <th style="padding:8px;">Type</th>
              <th style="padding:8px;">Marks</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `;

      document.body.appendChild(container);

      const opt = {
        margin: [10, 10, 10, 10],
        filename: filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
      };

      await html2pdf().set(opt).from(container).save();
      document.body.removeChild(container);
    } catch (err: any) {
      console.error("Student PDF download failed:", err);
    }
  };

  const handleResetFilters = () => {
    setSelectedClass("1st");
    setSelectedSubjectId(SUBJECTS[0].id);
    setSelectedSemester("1");
    setSearchTerm("");
  };

  const filteredData = useMemo(() => {
    return questions.filter((q) => {
      const matchClass =
        !selectedClass ||
        q.class === selectedClass ||
        q.standard === selectedClass ||
        q.std === selectedClass;
      const matchSubject =
        !selectedSubjectId ||
        q.subjectId === selectedSubjectId ||
        q.subject === selectedSubjectId ||
        q.subjectId?.toLowerCase() === selectedSubjectId.toLowerCase();
      const matchSemester =
        !selectedSemester ||
        !q.semester ||
        String(q.semester) === String(selectedSemester);
      const qText = String(q.text || q.question || q.topic || q.question_text || "");
      const matchSearch =
        !searchTerm ||
        qText.toLowerCase().includes(searchTerm.toLowerCase());
      return matchClass && matchSubject && matchSemester && matchSearch;
    });
  }, [questions, selectedClass, selectedSubjectId, selectedSemester, searchTerm]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white">
      <StudentHeader />
      <StudentSidebar />

      <main className="lg:pl-64 pt-20 min-h-screen bg-white">
        <div className="p-4 md:p-8 space-y-6 max-w-[1200px] mx-auto">
          <div className="bg-white p-6 border border-[#dee2e6] rounded-md shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-bold text-[#333]">
                  Class
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full h-[34px] px-3 border border-[#ccc] rounded-[4px] text-[14px] text-[#555] focus:border-[#66afe9] outline-none bg-white transition-all shadow-inner"
                >
                  <option value="">Select All</option>
                  {CLASSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-bold text-[#333]">
                  Semester
                </label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="w-full h-[34px] px-3 border border-[#ccc] rounded-[4px] text-[14px] text-[#555] focus:border-[#66afe9] outline-none bg-white transition-all shadow-inner"
                >
                  <option value="">Select All</option>
                  <option value="1">1st Semester</option>
                  <option value="2">2nd Semester</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-bold text-[#333]">
                  Subject
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full h-[34px] px-3 border border-[#ccc] rounded-[4px] text-[14px] text-[#555] focus:border-[#66afe9] outline-none bg-white transition-all shadow-inner"
                >
                  <option value="">Select All</option>
                  {SUBJECTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-bold text-[#333]">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-[34px] px-3 border border-[#ccc] rounded-[4px] text-[14px] text-[#555] focus:border-[#66afe9] outline-none bg-white transition-all shadow-inner"
                />
              </div>
            </div>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => {}}
                className="px-4 py-1.5 bg-[#198754] text-white rounded-[4px] text-[14px] font-medium hover:bg-[#157347] transition-all border border-[#198754] flex items-center gap-1 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                Search
              </button>
              <button
                onClick={handleResetFilters}
                className="px-4 py-1.5 bg-[#dc3545] text-white rounded-[4px] text-[14px] font-medium hover:bg-[#bb2d3b] transition-all border border-[#dc3545] cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="border border-[#dee2e6] rounded-sm overflow-hidden">
            <div className="bg-[#3f19c9] px-4 py-2 border-b border-[#dee2e6] flex justify-between items-center">
              <h2 className="text-white font-bold text-[14px]">
                Question Bank With Solution for Common Branches-1st/2nd Semester
              </h2>
              <span className="text-xs text-amber-200 font-semibold">
                Total Records: {filteredData.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse bg-white">
                <thead>
                  <tr className="border-b border-[#dee2e6] text-[#333] text-[14px] font-bold">
                    <th className="px-4 py-2 border-r border-[#dee2e6] w-16 text-center">
                      Sr.No.
                    </th>
                    <th className="px-4 py-2 border-r border-[#dee2e6]">
                      Subject / Topic Name
                    </th>
                    <th className="px-4 py-2 border-r border-[#dee2e6] text-center w-28">
                      Type
                    </th>
                    <th className="px-4 py-2 border-r border-[#dee2e6] w-24 text-center">
                      Marks
                    </th>
                    <th className="px-4 py-2 text-center">Download file</th>
                  </tr>
                </thead>
                <tbody className="text-[14px] text-[#333]">
                  {filteredData.length > 0 ? (
                    filteredData.map((q, idx) => (
                      <tr
                        key={q.id}
                        className="border-b border-[#dee2e6] hover:bg-slate-50"
                      >
                        <td className="px-4 py-2 border-r border-[#dee2e6] text-center text-[#777]">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-2 border-r border-[#dee2e6] text-[#555] font-medium">
                          {q.text}
                        </td>
                        <td className="px-4 py-2 border-r border-[#dee2e6] text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${q.type === "Objective" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}
                          >
                            {q.type}
                          </span>
                        </td>
                        <td className="px-4 py-2 border-r border-[#dee2e6] text-center font-bold text-slate-600">
                          {q.marks}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() =>
                              handleDownload(`Unit ${idx + 1}`, q.subjectId || selectedSubjectId)
                            }
                            className="text-[#3f19c9] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            Download PDF
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-12 text-center text-[#999] italic"
                      >
                        No records found for the selected criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-[#f8f9fa] p-4 border border-[#dee2e6] rounded-md">
            <p className="text-[12px] text-[#666]">
              Note: This question bank is curated for official institutional
              use. Please ensure you are studying the correct unit for your
              semester.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
