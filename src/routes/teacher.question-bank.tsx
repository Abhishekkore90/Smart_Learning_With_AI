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
  Upload,
  FileSpreadsheet,
  Target,
} from "lucide-react";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { useState, useMemo, useEffect, useCallback } from "react";
import { showToast as toast } from "@/lib/custom-toast";
import { useAuth } from "@/hooks/use-auth";
import { convertElementToPdfBlob, uploadBlobToBunny } from "@/lib/bunnyStorage";
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
import * as XLSX from "xlsx";
import { QuestionBankUploadModule } from "@/components/teacher/QuestionBankUploadModule";
import ExactExcelQuestionBankView from "@/components/teacher/ExactExcelQuestionBankView";
import ExactMultiSubjectQuestionBank from "@/components/teacher/ExactMultiSubjectQuestionBank";
import SubjectDashboardQuestionBank from "@/components/teacher/SubjectDashboardQuestionBank";
import ExactMathsQuestionBank from "@/components/teacher/ExactMathsQuestionBank";

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

  // ─── Question Bank Excel Upload Module State (ISOLATED) ──────────────
  const [activeTab, setActiveTab] = useState<"existing" | "excelUpload" | "exactGrid" | "multiSubject" | "dashboardAuto" | "exactMaths">("exactMaths");
  const [qbExcelRows, setQbExcelRows] = useState<any[][]>([]);
  const [qbSubjectName, setQbSubjectName] = useState("मराठी");
  const [qbClassName, setQbClassName] = useState("पाचवी");
  const [qbAcademicYear, setQbAcademicYear] = useState("२०२६-२७");

  const handleQBFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) return;
        const wb = XLSX.read(data, { type: "array" });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          defval: "",
          blankrows: true,
        });
        setQbExcelRows(rawRows);
        toast.success(`✅ प्रश्नपेढी फाईल "${file.name}" यशस्वीरित्या पार्स झाली! (${rawRows.length} ओळी)`);
      } catch (err: any) {
        console.error("QB Excel parse error:", err);
        toast.error("एक्सेल फाईल पार्स अयशस्वी: " + (err?.message || ""));
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  useEffect(() => {
    setMounted(true);
    const q = query(
      collection(db, "question_bank"),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setQuestions(data);
    });

    return () => unsubscribe();
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
    const filename = `${selectedClass}_प्रश्नपेढी_${subject}_${unitName.replace(/\s+/g, "_")}.pdf`;

    toast.info("📄 PDF तक्ता तयार करून डाऊनलोड होत आहे...");

    try {
      // Create a temporary off-screen container matching the official 9-column A4 Landscape layout
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "absolute";
      tempDiv.style.left = "-9999px";
      tempDiv.style.top = "-9999px";
      tempDiv.style.width = "1100px";
      tempDiv.style.padding = "20px";
      tempDiv.style.background = "#ffffff";
      tempDiv.style.fontFamily = "Noto Sans, Arial, sans-serif";

      tempDiv.innerHTML = `
        <table style="width:100%; border-collapse:collapse; margin-bottom:12px; font-weight:bold; text-align:center; font-size:12px;">
          <tr><td colspan="3" style="border:1px solid #000; padding:6px;">शैक्षणिक वर्ष - २०२६-२७</td></tr>
          <tr><td colspan="3" style="border:1px solid #000; padding:6px;">प्रपत्र क्रमांक - 08  प्रश्नपेढी</td></tr>
          <tr>
            <td style="border:1px solid #000; padding:6px; width:33%;">इयत्ता - ${selectedClass}</td>
            <td style="border:1px solid #000; padding:6px; width:34%;">विषय - ${subject} (${unitName})</td>
            <td style="border:1px solid #000; padding:6px; width:33%;">मार्गदर्शक प्रपत्र</td>
          </tr>
        </table>

        <table style="width:100%; border-collapse:collapse; font-size:11px;">
          <thead>
            <tr style="background-color:#f2f2f2; font-weight:bold; text-align:center;">
              <th style="border:1px solid #000; padding:6px; width:6%;">प्रश्न क्र.</th>
              <th style="border:1px solid #000; padding:6px; width:12%;">क्षेत्र घटक</th>
              <th style="border:1px solid #000; padding:6px; width:38%; text-align:left;">प्रश्न</th>
              <th style="border:1px solid #000; padding:6px; width:5%;">गुण</th>
              <th style="border:1px solid #000; padding:6px; width:9%;">मूल्यमापन</th>
              <th style="border:1px solid #000; padding:6px; width:10%;">प्रश्नाचा प्रकार</th>
              <th style="border:1px solid #000; padding:6px; width:8%;">उद्दिष्ट</th>
              <th style="border:1px solid #000; padding:6px; width:7%;">वैशिष्टय</th>
              <th style="border:1px solid #000; padding:6px; width:5%;">अध्ययन निष्पत्ती</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background-color:#1e1b4b; color:#ffffff; font-weight:bold;">
              <td colspan="9" style="border:1px solid #1e1b4b; padding:8px;">📌 * ${unitName} - संकल्पना आधारित प्रश्नपेढी</td>
            </tr>
            ${(filteredData.length > 0 ? filteredData : [{ text: "योग्य पर्याय निवडून उत्तर लिहा.", marks: 1, type: "Objective" }])
              .map(
                (q: any, i: number) => `
              <tr>
                <td style="border:1px solid #000; padding:5px; text-align:center;">${i + 1})</td>
                <td style="border:1px solid #000; padding:5px; text-align:center;">${unitName}</td>
                <td style="border:1px solid #000; padding:5px;">${q.text || "प्रश्न प्रविष्ट करा"}</td>
                <td style="border:1px solid #000; padding:5px; text-align:center;">${q.marks || 1}</td>
                <td style="border:1px solid #000; padding:5px; text-align:center;">लेखी</td>
                <td style="border:1px solid #000; padding:5px; text-align:center;">${q.type || "वस्तुनिष्ठ"}</td>
                <td style="border:1px solid #000; padding:5px; text-align:center;">उपयोजन</td>
                <td style="border:1px solid #000; padding:5px; text-align:center;">वैज्ञानिक दृष्टीकोन</td>
                <td style="border:1px solid #000; padding:5px; text-align:center;">05.71.01</td>
              </tr>
            `
              )
              .join("")}
            <tr style="height:20px;"><td colspan="9" style="border:none;"></td></tr>
          </tbody>
        </table>
      `;

      document.body.appendChild(tempDiv);

      const pdfBlob = await convertElementToPdfBlob(tempDiv, filename, "landscape");

      // Sync upload to Bunny Storage Zone with application/pdf Content-Type
      uploadBlobToBunny(`question_banks/${filename}`, pdfBlob).catch((err: any) => {
        console.warn("Bunny Storage sync notice:", err);
      });

      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.style.display = "none";
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        link.remove();
        if (document.body.contains(tempDiv)) document.body.removeChild(tempDiv);
        window.URL.revokeObjectURL(url);
      }, 10000);

      toast.success(`🎉 ${filename} यशस्वीरित्या डाऊनलोड झाला!`);
    } catch (err) {
      console.error("PDF download generation error:", err);
      toast.error("PDF तयार करताना एरर आला.");
    }
  };

  const filteredData = useMemo(() => {
    return questions.filter((q) => {
      const matchClass = q.class === selectedClass;
      const matchSubject = q.subjectId === selectedSubjectId;
      const matchSearch = q.text
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
      return matchClass && matchSubject && matchSearch;
    });
  }, [questions, selectedClass, selectedSubjectId, searchTerm]);

  const totalEntries = filteredData.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * entriesPerPage,
    currentPage * entriesPerPage,
  );

  const currentSubject =
    SUBJECTS.find((s) => s.id === selectedSubjectId) || SUBJECTS[0];

  return (
    <div className="min-h-screen bg-[#FDFEFF]">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-0 pt-20 min-h-screen bg-white">
        <div className="p-4 md:p-8 space-y-6 max-w-full mx-auto">

          {/* ─── Tab Switcher ─────────────────────────────────────────── */}
          <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-0 mb-2">
            <button
              onClick={() => setActiveTab("existing")}
              className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-all border-b-2 -mb-[2px] ${activeTab === "existing"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                  : "bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200"
                }`}
            >
              📝 Question Bank (Firestore)
            </button>
            <button
              onClick={() => setActiveTab("excelUpload")}
              className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-all border-b-2 -mb-[2px] flex items-center gap-1.5 ${activeTab === "excelUpload"
                  ? "bg-purple-600 text-white border-purple-600 shadow-md"
                  : "bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200"
                }`}
            >
              <Upload className="w-4 h-4" />
              📋 प्रश्नपेढी Excel अपलोड
            </button>
            <button
              onClick={() => setActiveTab("exactGrid")}
              className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-all border-b-2 -mb-[2px] flex items-center gap-1.5 ${activeTab === "exactGrid"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                  : "bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200"
                }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              📊 Exact Excel Grid View
            </button>
            <button
              onClick={() => setActiveTab("multiSubject")}
              className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-all border-b-2 -mb-[2px] flex items-center gap-1.5 ${activeTab === "multiSubject"
                  ? "bg-amber-600 text-white border-amber-600 shadow-md"
                  : "bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200"
                }`}
            >
              <BookOpen className="w-4 h-4" />
              📚 विषयनिहाय (Multi-Subject)
            </button>
            <button
              onClick={() => setActiveTab("dashboardAuto")}
              className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-all border-b-2 -mb-[2px] flex items-center gap-1.5 ${activeTab === "dashboardAuto"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                  : "bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200"
                }`}
            >
              <Target className="w-4 h-4" />
              🎯 Dashboard Auto-Fetch
            </button>
            <button
              onClick={() => setActiveTab("exactMaths")}
              className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-all border-b-2 -mb-[2px] flex items-center gap-1.5 ${activeTab === "exactMaths"
                  ? "bg-rose-600 text-white border-rose-600 shadow-md"
                  : "bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200"
                }`}
            >
              <Calculator className="w-4 h-4" />
              📐 Maths (इ. १ ली)
            </button>
          </div>

          {/* ─── Tab Content ──────────────────────────────────────────── */}

          {activeTab === "exactMaths" ? (
            <ExactMathsQuestionBank />
          ) : activeTab === "dashboardAuto" ? (
            <SubjectDashboardQuestionBank targetSubject="Maths" targetClass="इयत्ता १ ली (1st)" />
          ) : activeTab === "multiSubject" ? (
            <ExactMultiSubjectQuestionBank />
          ) : activeTab === "exactGrid" ? (
            <ExactExcelQuestionBankView />
          ) : activeTab === "excelUpload" ? (
            <QuestionBankUploadModule
              rawExcelRows={qbExcelRows}
              subjectName={qbSubjectName}
              className={qbClassName}
              academicYear={qbAcademicYear}
              role="admin"
              onFileUpload={handleQBFileUpload}
            />
          ) : (
            <>
              {/* Top Filter Section */}
              <div className="bg-white p-6 border border-[#dee2e6] rounded-md shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[13px] font-bold text-[#333]">
                      Class
                    </label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full h-[34px] px-3 border border-[#ccc] rounded-[4px] text-[14px] text-[#555] focus:border-[#66afe9] outline-none bg-white transition-all shadow-inner"
                    >
                      <option value="">Select</option>
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
                    <select className="w-full h-[34px] px-3 border border-[#ccc] rounded-[4px] text-[14px] text-[#555] focus:border-[#66afe9] outline-none bg-white transition-all shadow-inner">
                      <option value="">Select</option>
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
                      <option value="">Select</option>
                      {SUBJECTS.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-center gap-2">
                  <button className="px-3 py-1.5 bg-[#198754] text-white rounded-[4px] text-[14px] font-medium hover:bg-[#157347] transition-all border border-[#198754]">
                    Search
                  </button>
                  <button className="px-3 py-1.5 bg-[#dc3545] text-white rounded-[4px] text-[14px] font-medium hover:bg-[#bb2d3b] transition-all border border-[#dc3545]">
                    Reset
                  </button>
                </div>
              </div>

              {/* Table Section */}
              <div className="border border-[#dee2e6] rounded-sm overflow-hidden">
                {/* Indigo Heading */}
                <div className="bg-[#3f19c9] px-4 py-2 border-b border-[#dee2e6]">
                  <h2 className="text-white font-bold text-[14px]">
                    Question Bank With Solution for Common Branches-1st/2nd Semester
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse bg-white">
                    <thead>
                      <tr className="border-b border-[#dee2e6] text-[#333] text-[14px] font-bold">
                        <th className="px-4 py-2 border-r border-[#dee2e6] w-16">
                          Sr.No.
                        </th>
                        <th className="px-4 py-2 border-r border-[#dee2e6]">
                          Subject / Topic Name
                        </th>
                        <th className="px-4 py-2 border-r border-[#dee2e6]">
                          Type
                        </th>
                        <th className="px-4 py-2 border-r border-[#dee2e6] w-24">
                          Marks
                        </th>
                        <th className="px-4 py-2">Download file</th>
                      </tr>
                    </thead>
                    <tbody className="text-[14px] text-[#333]">
                      {!mounted ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-10 text-center">
                            Loading...
                          </td>
                        </tr>
                      ) : filteredData.length > 0 ? (
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
                            <td className="px-4 py-2 border-r border-[#dee2e6]">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${q.type === "Objective" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}
                              >
                                {q.type}
                              </span>
                            </td>
                            <td className="px-4 py-2 border-r border-[#dee2e6] text-center font-bold text-slate-600">
                              {q.marks}
                            </td>
                            <td className="px-4 py-2">
                              <button
                                onClick={() =>
                                  handleDownload(`Unit ${idx + 1}`, q.subjectId)
                                }
                                className="text-[#3f19c9] hover:underline font-bold"
                              >
                                Unit {idx + 1}
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

              {/* Minimal Add Form */}
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
                      className="h-[40px] bg-[#3f19c9] text-white rounded-[4px] text-[14px] font-bold hover:bg-[#2e12a1] transition-all"
                    >
                      Save Record
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
