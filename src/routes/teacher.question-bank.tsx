import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle,
  Book,
  Languages,
  Beaker,
  Calculator,
  Globe,
  ScrollText,
  Users,
  Plus,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  ArrowRight,
  MoreVertical,
  Trash2,
  Edit3,
  Share2,
  Download,
  MessageCircle,
  Hash,
  GraduationCap,
  ChevronRight,
  Zap,
  Star,
  Trophy,
  Award,
  Rocket,
  ChevronLeft,
  BookOpen,
  FileText,
  Layout,
  ListChecks,
  Sparkles,
  PlusCircle,
  RotateCcw,
} from "lucide-react";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { useState, useMemo, useEffect } from "react";
import { showToast as toast } from "@/lib/custom-toast";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

export const Route = createFileRoute("/teacher/question-bank")({
  component: QuestionBankPage,
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
  {
    id: "marathi",
    name: "Marathi",
    icon: Languages,
    color: "bg-pink-500",
    gradient: "from-pink-500 to-rose-600",
  },
  {
    id: "hindi",
    name: "Hindi",
    icon: Languages,
    color: "bg-orange-500",
    gradient: "from-orange-500 to-amber-600",
  },
  {
    id: "english",
    name: "English",
    icon: Book,
    color: "bg-blue-500",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    id: "science",
    name: "Science",
    icon: Beaker,
    color: "bg-emerald-500",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    id: "maths",
    name: "Maths",
    icon: Calculator,
    color: "bg-violet-500",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    id: "geography",
    name: "Geography",
    icon: Globe,
    color: "bg-cyan-500",
    gradient: "from-cyan-500 to-sky-600",
  },
  {
    id: "history",
    name: "History",
    icon: ScrollText,
    color: "bg-amber-600",
    gradient: "from-amber-600 to-yellow-700",
  },
  {
    id: "civics",
    name: "Civics",
    icon: Users,
    color: "bg-slate-600",
    gradient: "from-slate-600 to-slate-800",
  },
];

function QuestionBankPage() {
  const { user } = useAuth();
  const [selectedClass, setSelectedClass] = useState("1st");
  const [selectedSubjectId, setSelectedSubjectId] = useState(SUBJECTS[0].id);
  const [selectedSemester, setSelectedSemester] = useState("1");
  const [newQuestion, setNewQuestion] = useState({
    text: "",
    type: "Objective",
    marks: "1",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [mounted, setMounted] = useState(false);

  const [questions, setQuestions] = useState<any[]>([]);

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
          console.warn("Ordered Firestore query failed, falling back to unordered:", error);
          // Fallback query without orderBy for documents missing createdAt field or missing index
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
              console.error("Firestore question_bank fetch error:", err2);
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

  const handleAddQuestion = async () => {
    if (!newQuestion.text) {
      toast.error("Please enter a question!");
      return;
    }
    setIsSubmitting(true);

    try {
      const newEntry = {
        text: newQuestion.text,
        type: newQuestion.type,
        marks: newQuestion.marks,
        class: selectedClass,
        subjectId: selectedSubjectId,
        semester: selectedSemester,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "question_bank"), newEntry);

      setNewQuestion({ text: "", type: "Objective", marks: "1" });
      toast.success("Question added to bank!");
    } catch (error) {
      toast.error("Failed to add question");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteQuestion = async (id: string) => {
    try {
      await deleteDoc(doc(db, "question_bank", id));
      toast.info("Question removed.");
    } catch (error) {
      toast.error("Failed to delete question");
    }
  };

  const handleDownload = async (unitName: string, subjectId: string) => {
    const subject = SUBJECTS.find((s) => s.id === subjectId)?.name || "Subject";
    const filename = `Question_Bank_${subject}_${unitName.replace(/\s+/g, "_")}.pdf`;

    try {
      toast.info("📄 Generating official PDF file...");

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
          <h2 style="color:#1e1b4b;margin:0;">Institutional Question Bank — ${subject}</h2>
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
        <div style="margin-top:20px;display:flex;justify-between:space-between;font-size:11px;font-weight:bold;">
          <span>Teacher Signature: ____________</span>
          <span>Principal Signature: ____________</span>
        </div>
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
      toast.success(`${filename} download complete!`);
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF download.");
    }
  };

  const handleResetFilters = () => {
    setSelectedClass("1st");
    setSelectedSubjectId(SUBJECTS[0].id);
    setSelectedSemester("1");
    setSearchTerm("");
    setCurrentPage(1);
    toast.info("Filters reset.");
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

  const totalEntries = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / entriesPerPage));
  const paginatedData = useMemo(() => {
    return filteredData.slice(
      (currentPage - 1) * entriesPerPage,
      currentPage * entriesPerPage,
    );
  }, [filteredData, currentPage, entriesPerPage]);

  const currentSubject =
    SUBJECTS.find((s) => s.id === selectedSubjectId) || SUBJECTS[0];

  return (
    <div className="min-h-screen bg-[#FDFEFF]">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-0 pt-20 min-h-screen bg-white">
        <div className="p-4 md:p-8 space-y-6 max-w-full mx-auto">
          {/* Top Filter Section */}
          <div className="bg-white p-6 border border-[#dee2e6] rounded-md shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-bold text-[#333]">
                  Class
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setCurrentPage(1);
                  }}
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
                  onChange={(e) => {
                    setSelectedSemester(e.target.value);
                    setCurrentPage(1);
                  }}
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
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    setCurrentPage(1);
                  }}
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
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-[34px] px-3 border border-[#ccc] rounded-[4px] text-[14px] text-[#555] focus:border-[#66afe9] outline-none bg-white transition-all shadow-inner"
                />
              </div>
            </div>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                className="px-4 py-1.5 bg-[#198754] text-white rounded-[4px] text-[14px] font-medium hover:bg-[#157347] transition-all border border-[#198754] flex items-center gap-1 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                Search
              </button>
              <button
                onClick={handleResetFilters}
                className="px-4 py-1.5 bg-[#dc3545] text-white rounded-[4px] text-[14px] font-medium hover:bg-[#bb2d3b] transition-all border border-[#dc3545] flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
          </div>

          {/* Table Section */}
          <div className="border border-[#dee2e6] rounded-sm overflow-hidden">
            {/* Indigo Heading */}
            <div className="bg-[#3f19c9] px-4 py-2 border-b border-[#dee2e6] flex justify-between items-center">
              <h2 className="text-white font-bold text-[14px]">
                Question Bank With Solution for Common Branches-1st/2nd Semester
              </h2>
              <span className="text-xs text-amber-200 font-semibold">
                Total Records: {totalEntries}
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
                    <th className="px-4 py-2 border-r border-[#dee2e6] text-center">
                      Download file
                    </th>
                    <th className="px-4 py-2 text-center w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-[14px] text-[#333]">
                  {!mounted ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center">
                        Loading...
                      </td>
                    </tr>
                  ) : paginatedData.length > 0 ? (
                    paginatedData.map((q, idx) => {
                      const absoluteIdx = (currentPage - 1) * entriesPerPage + idx + 1;
                      return (
                        <tr
                          key={q.id}
                          className="border-b border-[#dee2e6] hover:bg-slate-50"
                        >
                          <td className="px-4 py-2 border-r border-[#dee2e6] text-center text-[#777]">
                            {absoluteIdx}
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
                          <td className="px-4 py-2 border-r border-[#dee2e6] text-center">
                            <button
                              onClick={() =>
                                handleDownload(`Unit ${absoluteIdx}`, q.subjectId || selectedSubjectId)
                              }
                              className="text-[#3f19c9] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Unit {absoluteIdx}
                            </button>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => deleteQuestion(q.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center text-[#999] italic"
                      >
                        No records found for the selected criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Working Pagination Bar */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-[#dee2e6]">
                <span className="text-xs text-slate-600 font-medium">
                  Showing {(currentPage - 1) * entriesPerPage + 1} to{" "}
                  {Math.min(currentPage * entriesPerPage, totalEntries)} of {totalEntries} entries
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-white border border-[#ccc] text-xs font-bold text-slate-700 rounded hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-bold text-slate-700 px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 bg-white border border-[#ccc] text-xs font-bold text-slate-700 rounded hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Add Form */}
          <div className="bg-white p-6 border border-[#dee2e6] rounded-md shadow-sm">
            <h3 className="text-[16px] font-bold text-[#333] mb-4">
              Add New Record
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <textarea
                value={newQuestion.text}
                onChange={(e) =>
                  setNewQuestion({ ...newQuestion, text: e.target.value })
                }
                className="w-full h-[100px] p-3 border border-[#ccc] rounded-[4px] text-[14px] outline-none focus:border-[#66afe9]"
                placeholder="Enter question/name..."
              />
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={newQuestion.type}
                    onChange={(e) =>
                      setNewQuestion({ ...newQuestion, type: e.target.value })
                    }
                    className="h-[34px] px-3 border border-[#ccc] rounded-[4px] text-[14px]"
                  >
                    <option value="Objective">Objective</option>
                    <option value="Descriptive">Descriptive</option>
                  </select>
                  <input
                    type="number"
                    value={newQuestion.marks}
                    onChange={(e) =>
                      setNewQuestion({ ...newQuestion, marks: e.target.value })
                    }
                    className="h-[34px] px-3 border border-[#ccc] rounded-[4px] text-[14px]"
                  />
                </div>
                <button
                  onClick={handleAddQuestion}
                  disabled={isSubmitting}
                  className="h-[40px] bg-[#3f19c9] text-white rounded-[4px] text-[14px] font-bold hover:bg-[#2e12a1] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Saving..." : "Save Record"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
