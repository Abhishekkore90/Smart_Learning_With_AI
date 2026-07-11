import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  FileSpreadsheet,
  Plus,
  Search,
  Trash2,
  Download,
  UploadCloud,
  FileText,
  Calendar,
  Layers,
  ClipboardList,
  BarChart3,
  Percent,
  Award,
  BookOpen,
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
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  where,
} from "firebase/firestore";

// React Router Dom wrapper imports for supporting legacy navigation inside result folder components
import {
  MemoryRouter,
  Routes,
  Route as ReactRouterRoute,
  useNavigate as useReactRouterNavigate,
  useLocation as useReactRouterLocation,
} from "react-router-dom";

// @ts-ignore
import ResultEntry from "@/result/GunaNeendani";
// @ts-ignore
import MarkEnterySSC from "@/result/MarkEnterySSC";
// @ts-ignore
import MarkEnteryHSC from "@/result/MarkEntryHSC";
// @ts-ignore
import AllMarksPath from "@/result/AllMarksPath";
// @ts-ignore
import ProgressSheet from "@/result/ProgressSheet";
// @ts-ignore
import DailyRegister from "@/result/DailyRegister";
// @ts-ignore
import SubjectWiseResult from "@/result/SubjectWiseResult";
// @ts-ignore
import GradeWise from "@/result/GradeWise";
// @ts-ignore
import BoardResult from "@/result/BoardResult";
// @ts-ignore
import Result5th8th from "@/result/Result5th8th";
// @ts-ignore
import SemesterResult9th10th from "@/result/CombinedResult9th10th";
// @ts-ignore
import StudentProgresswithout from "@/result/StudentProgresswithout";
import { CCEStudentList } from "@/components/teacher/CCEStudentList";
import { CCEAttendance } from "@/components/teacher/CCEAttendance";
import { CCEStudentInfo } from "@/components/teacher/CCEStudentInfo";
import { CCEWeightage } from "@/components/teacher/CCEWeightage";
import { CCEMarksEntry } from "@/components/teacher/CCEMarksEntry";
import { CCERemarks } from "@/components/teacher/CCERemarks";
import { CCESubjectWise } from "@/components/teacher/CCESubjectWise";
import { CCESettings } from "@/components/teacher/CCESettings";
import { CCEPdfCreation } from "@/components/teacher/CCEPdfCreation";
import { CCEPdfFiles } from "@/components/teacher/CCEPdfFiles";
import { CCEAccount } from "@/components/teacher/CCEAccount";
import { CCEOverallResult } from "@/components/teacher/CCEOverallResult";
import { CCESubjectConfig } from "@/components/teacher/CCESubjectConfig";
// @ts-ignore
import ResultSSC from "@/result/ResultSSC";
// @ts-ignore
import ResultHSC from "@/result/ResultHSC";
// @ts-ignore
import Collectout from "@/result/Collectout";
// @ts-ignore
import PromoteStudents from "@/result/PromoteStudents";

export const Route = createFileRoute("/teacher/result")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (search.tab as string) || "dashboard",
  }),
  component: TeacherResultsPage,
});

<<<<<<< HEAD
const CLASSES = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];

// Wrapper for Marks Entry
function MarksEntryWrapper({ initialClass, initialYear }: { initialClass: string; initialYear: string }) {
=======
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
  "11th",
  "12th",
];

// Wrapper for Marks Entry
function MarksEntryWrapper({
  initialClass,
  initialYear,
}: {
  initialClass: string;
  initialYear: string;
}) {
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  return (
    <MemoryRouter initialEntries={["/"]}>
      <div className="space-y-4">
        <Routes>
          <ReactRouterRoute path="/" element={<AllMarksPath />} />
<<<<<<< HEAD
          <ReactRouterRoute path="/GunaNeendani" element={<ResultEntry initialClass={initialClass} initialYear={initialYear} />} />
          <ReactRouterRoute path="/markenterssc" element={<MarkEnterySSC initialClass={initialClass} initialYear={initialYear} />} />
          <ReactRouterRoute path="/markenterhsc" element={<MarkEnteryHSC initialClass={initialClass} initialYear={initialYear} />} />
=======
          <ReactRouterRoute
            path="/GunaNeendani"
            element={
              <ResultEntry
                initialClass={initialClass}
                initialYear={initialYear}
              />
            }
          />
          <ReactRouterRoute
            path="/markenterssc"
            element={
              <MarkEnterySSC
                initialClass={initialClass}
                initialYear={initialYear}
              />
            }
          />
          <ReactRouterRoute
            path="/markenterhsc"
            element={
              <MarkEnteryHSC
                initialClass={initialClass}
                initialYear={initialYear}
              />
            }
          />
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
        </Routes>
      </div>
    </MemoryRouter>
  );
}

const getCurrentAcademicYear = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-indexed: 5 is June
  const referenceYear = currentMonth >= 5 ? currentYear : currentYear - 1;
  return `${referenceYear}-${referenceYear + 1}`;
};

const getDynamicAcademicYears = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const referenceYear = currentMonth >= 5 ? currentYear : currentYear - 1;
  const years = [];
  for (let y = referenceYear + 1; y >= 2020; y--) {
    const start = y;
    const end = y + 1;
    years.push({
      value: `${start}-${end}`,
      label: `${start}-${end.toString().slice(-2)}`,
    });
  }
  return years;
};

function TeacherResultsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (sessionStorage.getItem("is_super_admin")) {
        // Super admin allowed
      } else if (!user || profile?.role !== "teacher") {
        navigate({
          to: "/login",
          search: { redirect: "/teacher/result", role: "teacher" } as any,
        });
      }
    }
  }, [user, profile, authLoading, navigate]);

  // Tab State
  const { tab } = Route.useSearch();
  const activeTab = tab || "dashboard";

  // Form State for custom file uploads
  const [selectedClass, setSelectedClass] = useState(() => {
    return localStorage.getItem("cce_selected_class") || "1st";
  });
  const [academicYear, setAcademicYear] = useState(() => {
<<<<<<< HEAD
    return localStorage.getItem("cce_academic_year") || getCurrentAcademicYear();
  });
  const [studentsCount, setStudentsCount] = useState(3);
  const [examTitle, setExamTitle] = useState("");
  const [fileData, setFileData] = useState<{ name: string; content: string; type: string } | null>(null);
=======
    return (
      localStorage.getItem("cce_academic_year") || getCurrentAcademicYear()
    );
  });
  const [studentsCount, setStudentsCount] = useState(3);
  const [examTitle, setExamTitle] = useState("");
  const [fileData, setFileData] = useState<{
    name: string;
    content: string;
    type: string;
  } | null>(null);
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    localStorage.setItem("cce_selected_class", selectedClass);
  }, [selectedClass]);

  useEffect(() => {
    localStorage.setItem("cce_academic_year", academicYear);
  }, [academicYear]);

  // Real-time student count sync
  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("role", "==", "student"),
<<<<<<< HEAD
      where("class", "==", selectedClass)
=======
      where("class", "==", selectedClass),
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStudentsCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [selectedClass]);

  // Custom File Uploader List States
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [resultsList, setResultsList] = useState<any[]>([]);
  const [cceInfo, setCceInfo] = useState<any>(null);

  // Load cce_settings for the current class+year
  useEffect(() => {
    const loadCceInfo = async () => {
      try {
        const { getDoc, doc } = await import("firebase/firestore");
<<<<<<< HEAD
        
        // 1. Try selected class and year
        let docRef = doc(db, "cce_settings", `${selectedClass}_${academicYear}`);
=======

        // 1. Try selected class and year
        let docRef = doc(
          db,
          "cce_settings",
          `${selectedClass}_${academicYear}`,
        );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
        let snap = await getDoc(docRef);
        if (snap.exists()) {
          setCceInfo(snap.data());
          return;
        }

        // 2. Loop through other common classes and academic years to find ANY saved settings
<<<<<<< HEAD
        const classes = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
=======
        const classes = [
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
          "11th",
          "12th",
        ];
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
        const years = ["2025-2026", "2024-25", "2025-26", "2026-27"];
        for (const cls of classes) {
          for (const yr of years) {
            if (cls === selectedClass && yr === academicYear) continue;
            docRef = doc(db, "cce_settings", `${cls}_${yr}`);
            snap = await getDoc(docRef);
            if (snap.exists()) {
              setCceInfo(snap.data());
              return;
            }
          }
        }

        // 3. Fallback to RTDB schoolData if we have a UDISE code in localStorage
        const udise = localStorage.getItem("udiseNumber");
        if (udise) {
<<<<<<< HEAD
          const dbUrl = 
            (typeof window !== "undefined" && (window as any).env?.REACT_APP_FIREBASE_DATABASE_URL) ||
            (import.meta as any).env?.REACT_APP_FIREBASE_DATABASE_URL ||
            (typeof process !== "undefined" && process?.env?.REACT_APP_FIREBASE_DATABASE_URL);
          if (dbUrl) {
            const res = await fetch(`${dbUrl}/schoolRegister/${udise}/schoolData.json`);
=======
          const dbUrl =
            (typeof window !== "undefined" &&
              (window as any).env?.REACT_APP_FIREBASE_DATABASE_URL) ||
            (import.meta as any).env?.REACT_APP_FIREBASE_DATABASE_URL ||
            (typeof process !== "undefined" &&
              process?.env?.REACT_APP_FIREBASE_DATABASE_URL);
          if (dbUrl) {
            const res = await fetch(
              `${dbUrl}/schoolRegister/${udise}/schoolData.json`,
            );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
            if (res.ok) {
              const data = await res.json();
              if (data) {
                setCceInfo({
                  schoolName: data.schoolName || "",
                  headmasterName: data.headmasterName || data.hmName || "",
                  principalName: data.headmasterName || data.hmName || "",
                  schoolLogo: data.schoolLogo || "",
                  udiseCode: udise,
                });
                return;
              }
            }
          }
        }

        setCceInfo(null);
      } catch (e) {
        console.error("Error loading CCE settings:", e);
        setCceInfo(null);
      }
    };
    loadCceInfo();
  }, [selectedClass, academicYear]);

  // Real-time custom upload list sync
  useEffect(() => {
    setMounted(true);
    const q = query(collection(db, "results"), orderBy("createdAt", "desc"));
<<<<<<< HEAD
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setResultsList(data);
    }, (err: any) => {
      console.error(err);
      toast.error("Error fetching results: " + err.message);
    });
=======
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setResultsList(data);
      },
      (err: any) => {
        console.error(err);
        toast.error("Error fetching results: " + err.message);
      },
    );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557

    return () => unsubscribe();
  }, []);

  // File Upload Handler (Base64 conversion)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 700 * 1024) {
        toast.error("कृपया ७०० KB पेक्षा लहान फाइल निवडा (Firestore Limit).");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFileData({
          name: file.name,
          type: file.type,
          content: reader.result as string,
        });
        toast.success(`File "${file.name}" loaded successfully!`);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Result file to Firestore
  const handleUploadResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle.trim()) {
      toast.error("Please enter the Exam Title!");
      return;
    }
    if (!fileData) {
      toast.error("Please select a result file to upload!");
      return;
    }

    setIsSubmitting(true);
    try {
      const newResult = {
        examTitle: examTitle.trim(),
        class: selectedClass,
        fileName: fileData.name,
        fileType: fileData.type,
        fileContent: fileData.content,
<<<<<<< HEAD
        uploadedBy: profile?.fullName || user?.displayName || user?.email?.split("@")[0] || "Educator",
=======
        uploadedBy:
          profile?.fullName ||
          user?.displayName ||
          user?.email?.split("@")[0] ||
          "Educator",
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
        createdAt: new Date().toISOString(),
        dateStr: new Date().toLocaleDateString("en-GB").replace(/\//g, "-"),
      };

      await addDoc(collection(db, "results"), newResult);
      setExamTitle("");
      setFileData(null);
<<<<<<< HEAD
      const fileInput = document.getElementById("result-file-input") as HTMLInputElement;
=======
      const fileInput = document.getElementById(
        "result-file-input",
      ) as HTMLInputElement;
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      if (fileInput) fileInput.value = "";

      toast.success("Result file uploaded successfully!");
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to upload result file: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Result from Firestore
  const handleDeleteResult = async (id: string) => {
    if (!confirm("Are you sure you want to delete this result?")) return;
    try {
      await deleteDoc(doc(db, "results", id));
      toast.info("Result file deleted successfully.");
    } catch (error) {
      toast.error("Failed to delete result");
    }
  };

  // Trigger File Download
  const handleDownloadFile = (result: any) => {
    try {
      const link = document.createElement("a");
      link.href = result.fileContent;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloading "${result.fileName}"`);
    } catch (err) {
      toast.error("Failed to download file");
    }
  };

  // Search & Filter Memo for custom files
  const filteredData = useMemo(() => {
    return resultsList.filter((res) => {
      const matchSearch =
        res.examTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        res.class?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        res.fileName?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [resultsList, searchTerm]);

  const totalEntries = filteredData.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * entriesPerPage,
    currentPage * entriesPerPage,
  );

  return (
    <div className="min-h-screen bg-slate-50/50">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-64 pt-16 min-h-screen">
        <div className="p-6 md:p-10 space-y-8 max-w-[1600px] mx-auto">
          {activeTab !== "dashboard" && activeTab !== "account" && (
            <div className="mb-6">
              <button
<<<<<<< HEAD
                onClick={() => navigate({ to: "/teacher/result", search: { tab: "dashboard" } as any })}
=======
                onClick={() =>
                  navigate({
                    to: "/teacher/result",
                    search: { tab: "dashboard" } as any,
                  })
                }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-50 hover:bg-[#1E432D] text-blue-800 border border-blue-200 rounded-2xl text-sm font-bold tracking-wide transition-all shadow-sm cursor-pointer"
              >
                ← मुख्यपृष्ठ (Back to Dashboard)
              </button>
            </div>
          )}

          {activeTab === "dashboard" && (
            <div className="w-full max-w-[1200px] mx-auto bg-white text-slate-800 rounded-[2.5rem] p-6 md:p-8 font-sans shadow-2xl border border-slate-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-[150px] pointer-events-none" />
<<<<<<< HEAD
              
=======

>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-2.5 rounded-2xl text-white font-black text-sm flex items-center justify-center shadow-lg shadow-blue-200">
                    <span className="tracking-tighter">निकाल</span>
                  </div>
                  <div>
<<<<<<< HEAD
                    <h1 className="text-xl font-black text-slate-800 tracking-tight">Result</h1>
                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">सतत व सर्वंकष मूल्यमापन</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <select 
=======
                    <h1 className="text-xl font-black text-slate-800 tracking-tight">
                      Result
                    </h1>
                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                      सतत व सर्वंकष मूल्यमापन
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                    className="bg-white text-blue-600 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                  >
                    {getDynamicAcademicYears().map((y) => (
                      <option key={y.value} value={y.value}>
                        {y.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Class selector */}
              <div className="flex justify-end mb-6 pb-4 border-b border-slate-200">
<<<<<<< HEAD
                <select 
=======
                <select
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  className="bg-white text-blue-600 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  <option value="1st">पहिली 1</option>
                  <option value="2nd">दुसरी 2</option>
                  <option value="3rd">तिसरी 3</option>
                  <option value="4th">चौथी 4</option>
                  <option value="5th">पाचवी 5</option>
                  <option value="6th">सहावी 6</option>
                  <option value="7th">सातवी 7</option>
                  <option value="8th">आठवी 8</option>
                  <option value="9th">नववी 9</option>
                  <option value="10th">दहावी 10</option>
                </select>
              </div>

<<<<<<< HEAD



              {/* Dashboard Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* विद्यार्थी (Count) */}
                <button
                  onClick={() => navigate({ to: "/teacher/result", search: { tab: "student-progress" } as any })}
=======
              {/* Dashboard Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* विद्यार्थी (Count) */}
                <button
                  onClick={() =>
                    navigate({
                      to: "/teacher/result",
                      search: { tab: "student-progress" } as any,
                    })
                  }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  className="col-span-1 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer shadow-sm group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
<<<<<<< HEAD
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    </div>
                    <span className="text-xs font-bold text-slate-800">विद्यार्थी ({studentsCount})</span>
=======
                      <svg
                        className="size-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      विद्यार्थी ({studentsCount})
                    </span>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  </div>
                  <span className="text-blue-500 font-bold text-xs">&gt;</span>
                </button>

                {/* उपस्थिती */}
                <button
<<<<<<< HEAD
                  onClick={() => navigate({ to: "/teacher/result", search: { tab: "daily-register" } as any })}
=======
                  onClick={() =>
                    navigate({
                      to: "/teacher/result",
                      search: { tab: "daily-register" } as any,
                    })
                  }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  className="col-span-1 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer shadow-sm group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
<<<<<<< HEAD
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                    </div>
                    <span className="text-xs font-bold text-slate-800">उपस्थिती</span>
=======
                      <svg
                        className="size-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                        />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      उपस्थिती
                    </span>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  </div>
                  <span className="text-blue-500 font-bold text-xs">&gt;</span>
                </button>

                {/* विद्यार्थ्यांची माहिती */}
                <button
<<<<<<< HEAD
                  onClick={() => navigate({ to: "/teacher/result", search: { tab: "view-report" } as any })}
=======
                  onClick={() =>
                    navigate({
                      to: "/teacher/result",
                      search: { tab: "view-report" } as any,
                    })
                  }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  className="col-span-2 md:col-span-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer shadow-sm group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
<<<<<<< HEAD
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 024 0M9 17h.01M9 13h.01M12 17h.01M12 13h.01M15 17h.01M15 13h.01" /></svg>
                    </div>
                    <span className="text-xs font-bold text-slate-800">विद्यार्थ्यांची माहिती</span>
=======
                      <svg
                        className="size-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 024 0M9 17h.01M9 13h.01M12 17h.01M12 13h.01M15 17h.01M15 13h.01"
                        />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      विद्यार्थ्यांची माहिती
                    </span>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  </div>
                  <span className="text-blue-500 font-bold text-xs">&gt;</span>
                </button>

                {/* भारांश निश्चिती */}
                <button
<<<<<<< HEAD
                  onClick={() => navigate({ to: "/teacher/result", search: { tab: "grade-wise" } as any })}
=======
                  onClick={() =>
                    navigate({
                      to: "/teacher/result",
                      search: { tab: "grade-wise" } as any,
                    })
                  }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  className="col-span-1 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer shadow-sm group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
<<<<<<< HEAD
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    </div>
                    <span className="text-xs font-bold text-slate-800">भारांश निश्चिती</span>
=======
                      <svg
                        className="size-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      भारांश निश्चिती
                    </span>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  </div>
                  <span className="text-blue-500 font-bold text-xs">&gt;</span>
                </button>

                {/* गुण नोंदणी */}
                <button
<<<<<<< HEAD
                  onClick={() => navigate({ to: "/teacher/result", search: { tab: "marks-entry" } as any })}
=======
                  onClick={() =>
                    navigate({
                      to: "/teacher/result",
                      search: { tab: "marks-entry" } as any,
                    })
                  }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  className="col-span-1 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer shadow-sm group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
<<<<<<< HEAD
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </div>
                    <span className="text-xs font-bold text-slate-800">गुण नोंदणी</span>
=======
                      <svg
                        className="size-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      गुण नोंदणी
                    </span>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  </div>
                  <span className="text-blue-500 font-bold text-xs">&gt;</span>
                </button>

                {/* वर्णनात्मक नोंदी */}
                <button
<<<<<<< HEAD
                  onClick={() => navigate({ to: "/teacher/result", search: { tab: "progress-sheets" } as any })}
=======
                  onClick={() =>
                    navigate({
                      to: "/teacher/result",
                      search: { tab: "progress-sheets" } as any,
                    })
                  }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  className="col-span-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer shadow-sm group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
<<<<<<< HEAD
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <span className="text-xs font-bold text-slate-800">वर्णनात्मक नोंदी</span>
=======
                      <svg
                        className="size-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      वर्णनात्मक नोंदी
                    </span>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  </div>
                  <span className="text-blue-500 font-bold text-xs">&gt;</span>
                </button>

                {/* अध्ययन निष्पत्तीनिहाय प्रगती */}
                <button
<<<<<<< HEAD
                  onClick={() => navigate({ to: "/teacher/result", search: { tab: "subject-wise" } as any })}
=======
                  onClick={() =>
                    navigate({
                      to: "/teacher/result",
                      search: { tab: "subject-wise" } as any,
                    })
                  }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  className="col-span-2 md:col-span-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer shadow-sm group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
<<<<<<< HEAD
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </div>
                    <span className="text-xs font-bold text-slate-800">अध्ययन निष्पत्तीनिहाय प्रगती</span>
=======
                      <svg
                        className="size-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      अध्ययन निष्पत्तीनिहाय प्रगती
                    </span>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  </div>
                  <span className="text-blue-500 font-bold text-xs">&gt;</span>
                </button>

                {/* विषय निश्चिती (Subject Config) */}
                <button
<<<<<<< HEAD
                  onClick={() => navigate({ to: "/teacher/result", search: { tab: "subject-config" } as any })}
=======
                  onClick={() =>
                    navigate({
                      to: "/teacher/result",
                      search: { tab: "subject-config" } as any,
                    })
                  }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  className="col-span-2 md:col-span-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer shadow-sm group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
<<<<<<< HEAD
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </div>
                    <span className="text-xs font-bold text-slate-800">विषय निश्चिती</span>
=======
                      <svg
                        className="size-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      विषय निश्चिती
                    </span>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  </div>
                  <span className="text-blue-500 font-bold text-xs">&gt;</span>
                </button>

                {/* सेटिंग्स */}
                <button
<<<<<<< HEAD
                  onClick={() => navigate({ to: "/teacher/result", search: { tab: "settings" } as any })}
=======
                  onClick={() =>
                    navigate({
                      to: "/teacher/result",
                      search: { tab: "settings" } as any,
                    })
                  }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  className="col-span-2 md:col-span-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer shadow-sm group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
<<<<<<< HEAD
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <span className="text-xs font-bold text-slate-800">सेटिंग्ज</span>
=======
                      <svg
                        className="size-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      सेटिंग्ज
                    </span>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  </div>
                  <span className="text-blue-500 font-bold text-xs">&gt;</span>
                </button>

                {/* PDF निर्मिती */}
                <button
<<<<<<< HEAD
                  onClick={() => navigate({ to: "/teacher/result", search: { tab: "pdf-creation" } as any })}
=======
                  onClick={() =>
                    navigate({
                      to: "/teacher/result",
                      search: { tab: "pdf-creation" } as any,
                    })
                  }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  className="col-span-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer shadow-sm group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
<<<<<<< HEAD
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <span className="text-xs font-bold text-slate-800">PDF निर्मिती</span>
=======
                      <svg
                        className="size-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      PDF निर्मिती
                    </span>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  </div>
                  <span className="text-blue-500 font-bold text-xs">&gt;</span>
                </button>

                {/* PDF Files */}
                <button
<<<<<<< HEAD
                  onClick={() => navigate({ to: "/teacher/result", search: { tab: "uploads" } as any })}
=======
                  onClick={() =>
                    navigate({
                      to: "/teacher/result",
                      search: { tab: "uploads" } as any,
                    })
                  }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  className="col-span-2 md:col-span-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer shadow-sm group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
<<<<<<< HEAD
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
                    </div>
                    <span className="text-xs font-bold text-slate-800">PDF Files</span>
                  </div>
                  <span className="text-blue-500 font-bold text-xs">&gt;</span>
                </button>



              </div>

              
=======
                      <svg
                        className="size-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      PDF Files
                    </span>
                  </div>
                  <span className="text-blue-500 font-bold text-xs">&gt;</span>
                </button>
              </div>

>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
              {/* Bottom Nav Bar Simulation */}
              <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-around text-center">
                <button className="flex flex-col items-center gap-1 text-blue-600 font-bold text-[10px] cursor-pointer">
                  <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
<<<<<<< HEAD
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
=======
                    <svg
                      className="size-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                      />
                    </svg>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  </div>
                  <span>होम</span>
                </button>
              </div>
<<<<<<< HEAD

=======
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
            </div>
          )}

          {activeTab === "marks-entry" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
<<<<<<< HEAD
              <CCEMarksEntry 
                selectedClass={selectedClass} 
                academicYear={academicYear} 
                onBack={() => navigate({ to: "/teacher/result", search: { tab: "dashboard" } as any })}
=======
              <CCEMarksEntry
                selectedClass={selectedClass}
                academicYear={academicYear}
                onBack={() =>
                  navigate({
                    to: "/teacher/result",
                    search: { tab: "dashboard" } as any,
                  })
                }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
              />
            </motion.div>
          )}

          {activeTab === "progress-sheets" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
<<<<<<< HEAD
              <CCERemarks 
                selectedClass={selectedClass} 
                academicYear={academicYear} 
                onBack={() => navigate({ to: "/teacher/result", search: { tab: "dashboard" } as any })}
=======
              <CCERemarks
                selectedClass={selectedClass}
                academicYear={academicYear}
                onBack={() =>
                  navigate({
                    to: "/teacher/result",
                    search: { tab: "dashboard" } as any,
                  })
                }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
              />
            </motion.div>
          )}

          {activeTab === "daily-register" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
<<<<<<< HEAD
              <CCEAttendance 
                selectedClass={selectedClass} 
                academicYear={academicYear} 
                onBack={() => navigate({ to: "/teacher/result", search: { tab: "dashboard" } as any })}
=======
              <CCEAttendance
                selectedClass={selectedClass}
                academicYear={academicYear}
                onBack={() =>
                  navigate({
                    to: "/teacher/result",
                    search: { tab: "dashboard" } as any,
                  })
                }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
              />
            </motion.div>
          )}

          {activeTab === "subject-config" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
<<<<<<< HEAD
              <CCESubjectConfig 
                selectedClass={selectedClass} 
                academicYear={academicYear} 
                onBack={() => navigate({ to: "/teacher/result", search: { tab: "dashboard" } as any })}
=======
              <CCESubjectConfig
                selectedClass={selectedClass}
                academicYear={academicYear}
                onBack={() =>
                  navigate({
                    to: "/teacher/result",
                    search: { tab: "dashboard" } as any,
                  })
                }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
              />
            </motion.div>
          )}

          {activeTab === "subject-wise" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
<<<<<<< HEAD
              <CCESubjectWise 
                selectedClass={selectedClass} 
                academicYear={academicYear} 
                onBack={() => navigate({ to: "/teacher/result", search: { tab: "dashboard" } as any })}
=======
              <CCESubjectWise
                selectedClass={selectedClass}
                academicYear={academicYear}
                onBack={() =>
                  navigate({
                    to: "/teacher/result",
                    search: { tab: "dashboard" } as any,
                  })
                }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
              />
            </motion.div>
          )}

          {activeTab === "grade-wise" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
<<<<<<< HEAD
              <CCEWeightage 
                selectedClass={selectedClass} 
                academicYear={academicYear} 
                onBack={() => navigate({ to: "/teacher/result", search: { tab: "dashboard" } as any })}
=======
              <CCEWeightage
                selectedClass={selectedClass}
                academicYear={academicYear}
                onBack={() =>
                  navigate({
                    to: "/teacher/result",
                    search: { tab: "dashboard" } as any,
                  })
                }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
              />
            </motion.div>
          )}

          {activeTab === "board-results" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm"
            >
<<<<<<< HEAD
              <BoardResult initialClass={selectedClass} initialYear={academicYear} />
=======
              <BoardResult
                initialClass={selectedClass}
                initialYear={academicYear}
              />
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
            </motion.div>
          )}

          {activeTab === "result-5th-8th" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm"
            >
<<<<<<< HEAD
              <Result5th8th initialClass={selectedClass} initialYear={academicYear} />
=======
              <Result5th8th
                initialClass={selectedClass}
                initialYear={academicYear}
              />
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
            </motion.div>
          )}

          {activeTab === "combined-results" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
<<<<<<< HEAD
              <CCEOverallResult 
                selectedClass={selectedClass} 
                academicYear={academicYear} 
                onBack={() => navigate({ to: "/teacher/result", search: { tab: "dashboard" } as any })}
=======
              <CCEOverallResult
                selectedClass={selectedClass}
                academicYear={academicYear}
                onBack={() =>
                  navigate({
                    to: "/teacher/result",
                    search: { tab: "dashboard" } as any,
                  })
                }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
              />
            </motion.div>
          )}

          {activeTab === "ssc-result" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm"
            >
<<<<<<< HEAD
              <ResultSSC initialClass={selectedClass} initialYear={academicYear} />
=======
              <ResultSSC
                initialClass={selectedClass}
                initialYear={academicYear}
              />
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
            </motion.div>
          )}

          {activeTab === "hsc-result" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm"
            >
<<<<<<< HEAD
              <ResultHSC initialClass={selectedClass} initialYear={academicYear} />
=======
              <ResultHSC
                initialClass={selectedClass}
                initialYear={academicYear}
              />
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
            </motion.div>
          )}

          {activeTab === "view-report" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
<<<<<<< HEAD
              <CCEStudentInfo 
                selectedClass={selectedClass} 
                onBack={() => navigate({ to: "/teacher/result", search: { tab: "dashboard" } as any })}
=======
              <CCEStudentInfo
                selectedClass={selectedClass}
                onBack={() =>
                  navigate({
                    to: "/teacher/result",
                    search: { tab: "dashboard" } as any,
                  })
                }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
              />
            </motion.div>
          )}

          {activeTab === "student-progress" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
<<<<<<< HEAD
              <CCEStudentList 
                selectedClass={selectedClass} 
                academicYear={academicYear} 
                onBack={() => navigate({ to: "/teacher/result", search: { tab: "dashboard" } as any })}
                onViewReport={(studentName: string) => navigate({ to: "/teacher/result", search: { tab: "view-report" } as any })}
=======
              <CCEStudentList
                selectedClass={selectedClass}
                academicYear={academicYear}
                onBack={() =>
                  navigate({
                    to: "/teacher/result",
                    search: { tab: "dashboard" } as any,
                  })
                }
                onViewReport={(studentName: string) =>
                  navigate({
                    to: "/teacher/result",
                    search: { tab: "view-report" } as any,
                  })
                }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
              />
            </motion.div>
          )}

          {activeTab === "promote-students" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm"
            >
<<<<<<< HEAD
              <PromoteStudents initialClass={selectedClass} initialYear={academicYear} />
=======
              <PromoteStudents
                initialClass={selectedClass}
                initialYear={academicYear}
              />
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
            </motion.div>
          )}

          {activeTab === "result-9th-10th" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm"
            >
              <SemesterResult9th10th />
            </motion.div>
          )}

          {activeTab === "attendance" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white text-slate-800 p-8 rounded-[3rem] border border-slate-200 shadow-sm text-center py-20"
            >
<<<<<<< HEAD
              <h2 className="text-2xl font-black text-slate-800 mb-2">विद्यार्थी उपस्थिती (Attendance Tracker)</h2>
              <p className="text-blue-600 font-medium">येथे विद्यार्थ्यांची दैनंदिन उपस्थिती नोंदवता येईल.</p>
            </motion.div>
          )}



=======
              <h2 className="text-2xl font-black text-slate-800 mb-2">
                विद्यार्थी उपस्थिती (Attendance Tracker)
              </h2>
              <p className="text-blue-600 font-medium">
                येथे विद्यार्थ्यांची दैनंदिन उपस्थिती नोंदवता येईल.
              </p>
            </motion.div>
          )}

>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
          {activeTab === "settings" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
<<<<<<< HEAD
              <CCESettings 
                selectedClass={selectedClass} 
                academicYear={academicYear} 
                onBack={() => navigate({ to: "/teacher/result", search: { tab: "dashboard" } as any })}
=======
              <CCESettings
                selectedClass={selectedClass}
                academicYear={academicYear}
                onBack={() =>
                  navigate({
                    to: "/teacher/result",
                    search: { tab: "dashboard" } as any,
                  })
                }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
              />
            </motion.div>
          )}

          {activeTab === "pdf-creation" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
<<<<<<< HEAD
              <CCEPdfCreation 
                selectedClass={selectedClass} 
                academicYear={academicYear} 
                onBack={() => navigate({ to: "/teacher/result", search: { tab: "dashboard" } as any })}
=======
              <CCEPdfCreation
                selectedClass={selectedClass}
                academicYear={academicYear}
                onBack={() =>
                  navigate({
                    to: "/teacher/result",
                    search: { tab: "dashboard" } as any,
                  })
                }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
              />
            </motion.div>
          )}

          {activeTab === "uploads" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
<<<<<<< HEAD
              <CCEPdfFiles 
                selectedClass={selectedClass} 
                academicYear={academicYear} 
                onBack={() => navigate({ to: "/teacher/result", search: { tab: "dashboard" } as any })}
=======
              <CCEPdfFiles
                selectedClass={selectedClass}
                academicYear={academicYear}
                onBack={() =>
                  navigate({
                    to: "/teacher/result",
                    search: { tab: "dashboard" } as any,
                  })
                }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
              />
            </motion.div>
          )}
          {activeTab === "account" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
<<<<<<< HEAD
              <CCEAccount 
                onBack={() => navigate({ to: "/teacher/result", search: { tab: "dashboard" } as any })}
=======
              <CCEAccount
                onBack={() =>
                  navigate({
                    to: "/teacher/result",
                    search: { tab: "dashboard" } as any,
                  })
                }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
              />
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
