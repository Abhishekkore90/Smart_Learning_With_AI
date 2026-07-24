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

const CLASSES = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

// Wrapper for Marks Entry
function MarksEntryWrapper({ initialClass, initialYear }: { initialClass: string; initialYear: string }) {
  return (
    <MemoryRouter initialEntries={["/"]}>
      <div className="space-y-4">
        <Routes>
          <ReactRouterRoute path="/" element={<AllMarksPath />} />
          <ReactRouterRoute path="/GunaNeendani" element={<ResultEntry initialClass={initialClass} initialYear={initialYear} />} />
          <ReactRouterRoute path="/markenterssc" element={<MarkEnterySSC initialClass={initialClass} initialYear={initialYear} />} />
          <ReactRouterRoute path="/markenterhsc" element={<MarkEnteryHSC initialClass={initialClass} initialYear={initialYear} />} />
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
    return localStorage.getItem("cce_academic_year") || getCurrentAcademicYear();
  });
  const [selectedMedium, setSelectedMedium] = useState(() => {
    return localStorage.getItem("cce_selected_medium") || "marathi";
  });
  const [studentsCount, setStudentsCount] = useState(3);
  const [examTitle, setExamTitle] = useState("");
  const [fileData, setFileData] = useState<{ name: string; content: string; type: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    localStorage.setItem("cce_selected_class", selectedClass);
  }, [selectedClass]);

  useEffect(() => {
    localStorage.setItem("cce_academic_year", academicYear);
  }, [academicYear]);

  useEffect(() => {
    localStorage.setItem("cce_selected_medium", selectedMedium);
  }, [selectedMedium]);

  // Real-time student count sync
  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("role", "==", "student"),
      where("class", "==", selectedClass)
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

  useEffect(() => {
    if (cceInfo?.medium) {
      const isSemi = cceInfo.medium.toLowerCase().includes("semi");
      const m = isSemi ? "semi" : "marathi";
      setSelectedMedium(m);
      localStorage.setItem("cce_selected_medium", m);
    }
  }, [cceInfo]);

  // Load cce_settings for the current class+year with instant cache and parallel fallback
  useEffect(() => {
    // 1. Instant Cache Hydration
    try {
      const cached = localStorage.getItem(`cce_info_${selectedClass}_${academicYear}`) || localStorage.getItem("cce_info_cache");
      if (cached) {
        setCceInfo(JSON.parse(cached));
      }
    } catch (e) {}

    const loadCceInfo = async () => {
      try {
        const { getDoc, doc } = await import("firebase/firestore");
        
        // 2. Try selected class and year first
        let docRef = doc(db, "cce_settings", `${selectedClass}_${academicYear}`);
        let snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setCceInfo(data);
          localStorage.setItem(`cce_info_${selectedClass}_${academicYear}`, JSON.stringify(data));
          localStorage.setItem("cce_info_cache", JSON.stringify(data));
          return;
        }

        // 3. Parallel fetch instead of 32 sequential queries in nested loops
        const classes = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
        const years = ["2025-2026", "2024-25", "2025-26", "2026-27"];
        const docPromises: Promise<any>[] = [];

        for (const cls of classes) {
          for (const yr of years) {
            if (cls === selectedClass && yr === academicYear) continue;
            docPromises.push(
              getDoc(doc(db, "cce_settings", `${cls}_${yr}`)).then(s => (s.exists() ? s.data() : null))
            );
          }
        }

        const results = await Promise.all(docPromises);
        const found = results.find(data => data !== null);
        if (found) {
          setCceInfo(found);
          localStorage.setItem(`cce_info_${selectedClass}_${academicYear}`, JSON.stringify(found));
          localStorage.setItem("cce_info_cache", JSON.stringify(found));
          return;
        }

        // 4. Fallback to RTDB schoolData
        const udise = localStorage.getItem("udiseNumber");
        if (udise) {
          const dbUrl = 
            (typeof window !== "undefined" && (window as any).env?.REACT_APP_FIREBASE_DATABASE_URL) ||
            (import.meta as any).env?.REACT_APP_FIREBASE_DATABASE_URL ||
            (typeof process !== "undefined" && process?.env?.REACT_APP_FIREBASE_DATABASE_URL);
          if (dbUrl) {
            const res = await fetch(`${dbUrl}/schoolRegister/${udise}/schoolData.json`);
            if (res.ok) {
              const data = await res.json();
              if (data) {
                const info = {
                  schoolName: data.schoolName || "",
                  headmasterName: data.headmasterName || data.hmName || "",
                  principalName: data.headmasterName || data.hmName || "",
                  schoolLogo: data.schoolLogo || "",
                  udiseCode: udise,
                };
                setCceInfo(info);
                localStorage.setItem(`cce_info_${selectedClass}_${academicYear}`, JSON.stringify(info));
                localStorage.setItem("cce_info_cache", JSON.stringify(info));
                return;
              }
            }
          }
        }
      } catch (e) {
        console.error("Error loading cce info:", e);
      }
    };
    loadCceInfo();
  }, [selectedClass, academicYear]);

  // Real-time custom upload list sync
  useEffect(() => {
    setMounted(true);
    const q = query(collection(db, "results"), orderBy("createdAt", "desc"));
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
        uploadedBy: profile?.fullName || user?.displayName || user?.email?.split("@")[0] || "Educator",
        createdAt: new Date().toISOString(),
        dateStr: new Date().toLocaleDateString("en-GB").replace(/\//g, "-"),
      };

      await addDoc(collection(db, "results"), newResult);
      setExamTitle("");
      setFileData(null);
      const fileInput = document.getElementById("result-file-input") as HTMLInputElement;
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
                onClick={() => navigate({ to: "/teacher/result", search: { tab: "dashboard" } as any })}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-50 hover:bg-[#1E432D] hover:text-white text-blue-800 border border-blue-200 rounded-2xl text-sm font-bold tracking-wide transition-all shadow-sm cursor-pointer"
              >
                ← मुख्यपृष्ठ (Back to Dashboard)
              </button>
            </div>
          )}

          {activeTab === "dashboard" && (
            <div className="w-full max-w-[1250px] mx-auto bg-gradient-to-b from-white via-slate-50/50 to-white text-slate-800 rounded-[2.5rem] p-6 md:p-10 font-sans shadow-2xl border border-slate-200/80 relative overflow-hidden">
              {/* Background Ambient Decorative Elements */}
              <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-blue-400/10 via-cyan-400/5 to-transparent rounded-bl-full pointer-events-none blur-xl" />
              <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-gradient-to-tr from-indigo-400/10 via-purple-400/5 to-transparent rounded-full pointer-events-none blur-xl" />

              {/* Top Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200/80 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 p-3.5 rounded-2xl text-white font-black text-base flex items-center justify-center shadow-lg shadow-blue-500/20 ring-4 ring-blue-50">
                    <span className="tracking-tight">निकाल</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">CCE Result Dashboard</h1>
                      <span className="bg-blue-100 text-blue-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-blue-200">
                        {studentsCount} विद्यार्थी
                      </span>
                    </div>
                    <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mt-0.5">सतत व सर्वंकष मूल्यमापन प्रणाली</p>
                  </div>
                </div>

                {/* Dropdowns Selector Pills */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Academic Year Selector */}
                  <div className="flex items-center gap-2 bg-white border border-slate-200 shadow-sm rounded-2xl px-3.5 py-2 hover:border-blue-300 transition-colors">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">वर्ष:</span>
                    <select 
                      className="bg-transparent text-blue-700 text-xs font-extrabold outline-none cursor-pointer"
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

                  {/* Class Selector */}
                  <div className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 rounded-2xl px-4 py-2 ring-2 ring-blue-100">
                    <span className="text-xs font-medium text-blue-100 uppercase tracking-wider">इयत्ता:</span>
                    <select 
                      className="bg-transparent text-white text-xs font-extrabold outline-none cursor-pointer border-none"
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                    >
                      <option value="1st" className="text-slate-800 font-bold">पहिली (1st)</option>
                      <option value="2nd" className="text-slate-800 font-bold">दुसरी (2nd)</option>
                      <option value="3rd" className="text-slate-800 font-bold">तिसरी (3rd)</option>
                      <option value="4th" className="text-slate-800 font-bold">चौथी (4th)</option>
                      <option value="5th" className="text-slate-800 font-bold">पाचवी (5th)</option>
                      <option value="6th" className="text-slate-800 font-bold">सहावी (6th)</option>
                      <option value="7th" className="text-slate-800 font-bold">सातवी (7th)</option>
                      <option value="8th" className="text-slate-800 font-bold">आठवी (8th)</option>
                    </select>
                  </div>

                  {/* Medium Display Badge (Read-only from Settings) */}
                  <div className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20 rounded-2xl px-4 py-2 ring-2 ring-purple-100">
                    <span className="text-xs font-medium text-purple-100 uppercase tracking-wider">माध्यम:</span>
                    <span className="text-xs font-extrabold">
                      {selectedMedium === "semi" ? "सेमी इंग्रजी माध्यम (Semi-English)" : "मराठी माध्यम (Marathi)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dashboard Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 relative z-10">
                
                {/* 1. शाळेची माहिती */}
                <button
                  onClick={() => navigate({ to: "/teacher/result", search: { tab: "settings" } as any })}
                  className="bg-white/95 hover:bg-white border-2 border-slate-100 hover:border-slate-400/90 rounded-[2.2rem] p-4.5 flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-slate-500/10 hover:-translate-y-1.5 active:scale-[0.98] group text-left relative overflow-hidden cursor-pointer"
                >
                  <div className="absolute -top-10 -right-10 size-28 rounded-full bg-gradient-to-br from-slate-400/10 to-zinc-500/5 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
                  <div className="flex items-center gap-3.5 relative z-10">
                    <div className="size-12 rounded-2xl bg-gradient-to-br from-slate-700 to-zinc-800 text-white flex items-center justify-center shadow-md shadow-slate-600/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 flex-shrink-0">
                      <svg className="size-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <div>
                      <h3 className="text-[14.5px] font-black text-slate-800 group-hover:text-slate-900 transition-colors tracking-tight">शाळेची माहिती</h3>
                      <p className="text-[11.5px] text-slate-500 font-medium leading-snug mt-0.5">मूल्यमापन व शाळा सेटिंग्ज</p>
                    </div>
                  </div>
                  <div className="size-8 rounded-xl bg-slate-100/90 group-hover:bg-slate-800 text-slate-400 group-hover:text-white flex items-center justify-center transition-all duration-300 flex-shrink-0 shadow-sm group-hover:shadow-md group-hover:translate-x-0.5 relative z-10">
                    <span className="font-extrabold text-xs">➔</span>
                  </div>
                </button>

                {/* 2. विद्यार्थी */}
                <button
                  onClick={() => navigate({ to: "/teacher/result", search: { tab: "student-progress" } as any })}
                  className="bg-white/95 hover:bg-white border-2 border-slate-100 hover:border-blue-400/90 rounded-[2.2rem] p-4.5 flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1.5 active:scale-[0.98] group text-left relative overflow-hidden cursor-pointer"
                >
                  <div className="absolute -top-10 -right-10 size-28 rounded-full bg-gradient-to-br from-blue-500/10 to-indigo-500/5 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
                  <div className="flex items-center gap-3.5 relative z-10">
                    <div className="size-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/35 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 flex-shrink-0">
                      <svg className="size-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    </div>
                    <div>
                      <h3 className="text-[14.5px] font-black text-slate-800 group-hover:text-blue-600 transition-colors tracking-tight">विद्यार्थी ({studentsCount})</h3>
                      <p className="text-[11.5px] text-slate-500 font-medium leading-snug mt-0.5">विद्यार्थ्यांची यादी व प्रगती</p>
                    </div>
                  </div>
                  <div className="size-8 rounded-xl bg-slate-100/90 group-hover:bg-blue-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-all duration-300 flex-shrink-0 shadow-sm group-hover:shadow-md group-hover:translate-x-0.5 relative z-10">
                    <span className="font-extrabold text-xs">➔</span>
                  </div>
                </button>

                {/* 3. उपस्थिती */}
                <button
                  onClick={() => navigate({ to: "/teacher/result", search: { tab: "daily-register" } as any })}
                  className="bg-white/95 hover:bg-white border-2 border-slate-100 hover:border-teal-400/90 rounded-[2.2rem] p-4.5 flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-teal-500/10 hover:-translate-y-1.5 active:scale-[0.98] group text-left relative overflow-hidden cursor-pointer"
                >
                  <div className="absolute -top-10 -right-10 size-28 rounded-full bg-gradient-to-br from-teal-500/10 to-emerald-500/5 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
                  <div className="flex items-center gap-3.5 relative z-10">
                    <div className="size-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-teal-500/35 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 flex-shrink-0">
                      <svg className="size-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                    </div>
                    <div>
                      <h3 className="text-[14.5px] font-black text-slate-800 group-hover:text-teal-600 transition-colors tracking-tight">उपस्थिती</h3>
                      <p className="text-[11.5px] text-slate-500 font-medium leading-snug mt-0.5">दैनंदिन व मासिक हजेरी</p>
                    </div>
                  </div>
                  <div className="size-8 rounded-xl bg-slate-100/90 group-hover:bg-teal-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-all duration-300 flex-shrink-0 shadow-sm group-hover:shadow-md group-hover:translate-x-0.5 relative z-10">
                    <span className="font-extrabold text-xs">➔</span>
                  </div>
                </button>

                {/* 4. विद्यार्थ्यांची माहिती */}
                <button
                  onClick={() => navigate({ to: "/teacher/result", search: { tab: "view-report" } as any })}
                  className="bg-white/95 hover:bg-white border-2 border-slate-100 hover:border-purple-400/90 rounded-[2.2rem] p-4.5 flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1.5 active:scale-[0.98] group text-left relative overflow-hidden cursor-pointer"
                >
                  <div className="absolute -top-10 -right-10 size-28 rounded-full bg-gradient-to-br from-purple-500/10 to-violet-500/5 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
                  <div className="flex items-center gap-3.5 relative z-10">
                    <div className="size-12 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/35 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 flex-shrink-0">
                      <svg className="size-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 0 1 4 0M9 17h.01M9 13h.01M12 17h.01M12 13h.01M15 17h.01M15 13h.01" /></svg>
                    </div>
                    <div>
                      <h3 className="text-[14.5px] font-black text-slate-800 group-hover:text-purple-600 transition-colors tracking-tight">विद्यार्थ्यांची माहिती</h3>
                      <p className="text-[11.5px] text-slate-500 font-medium leading-snug mt-0.5">प्रोफाइल व वैयक्तिक तपशील</p>
                    </div>
                  </div>
                  <div className="size-8 rounded-xl bg-slate-100/90 group-hover:bg-purple-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-all duration-300 flex-shrink-0 shadow-sm group-hover:shadow-md group-hover:translate-x-0.5 relative z-10">
                    <span className="font-extrabold text-xs">➔</span>
                  </div>
                </button>

                {/* 5. भारांश निश्चिती */}
                <button
                  onClick={() => navigate({ to: "/teacher/result", search: { tab: "grade-wise" } as any })}
                  className="bg-white/95 hover:bg-white border-2 border-slate-100 hover:border-amber-400/90 rounded-[2.2rem] p-4.5 flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-1.5 active:scale-[0.98] group text-left relative overflow-hidden cursor-pointer"
                >
                  <div className="absolute -top-10 -right-10 size-28 rounded-full bg-gradient-to-br from-amber-500/10 to-orange-500/5 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
                  <div className="flex items-center gap-3.5 relative z-10">
                    <div className="size-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/35 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 flex-shrink-0">
                      <svg className="size-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    </div>
                    <div>
                      <h3 className="text-[14.5px] font-black text-slate-800 group-hover:text-amber-600 transition-colors tracking-tight">भारांश निश्चिती</h3>
                      <p className="text-[11.5px] text-slate-500 font-medium leading-snug mt-0.5">परीक्षेचे भारांश व नियम</p>
                    </div>
                  </div>
                  <div className="size-8 rounded-xl bg-slate-100/90 group-hover:bg-amber-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-all duration-300 flex-shrink-0 shadow-sm group-hover:shadow-md group-hover:translate-x-0.5 relative z-10">
                    <span className="font-extrabold text-xs">➔</span>
                  </div>
                </button>

                {/* 6. गुण नोंदणी */}
                <button
                  onClick={() => navigate({ to: "/teacher/result", search: { tab: "marks-entry" } as any })}
                  className="bg-white/95 hover:bg-white border-2 border-slate-100 hover:border-indigo-400/90 rounded-[2.2rem] p-4.5 flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1.5 active:scale-[0.98] group text-left relative overflow-hidden cursor-pointer"
                >
                  <div className="absolute -top-10 -right-10 size-28 rounded-full bg-gradient-to-br from-indigo-500/10 to-blue-500/5 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
                  <div className="flex items-center gap-3.5 relative z-10">
                    <div className="size-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/35 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 flex-shrink-0">
                      <svg className="size-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </div>
                    <div>
                      <h3 className="text-[14.5px] font-black text-slate-800 group-hover:text-indigo-600 transition-colors tracking-tight">गुण नोंदणी</h3>
                      <p className="text-[11.5px] text-slate-500 font-medium leading-snug mt-0.5">सत्र १ व सत्र २ गुण प्रविष्ट करा</p>
                    </div>
                  </div>
                  <div className="size-8 rounded-xl bg-slate-100/90 group-hover:bg-indigo-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-all duration-300 flex-shrink-0 shadow-sm group-hover:shadow-md group-hover:translate-x-0.5 relative z-10">
                    <span className="font-extrabold text-xs">➔</span>
                  </div>
                </button>

                {/* 7. वर्णनात्मक नोंदी */}
                <button
                  onClick={() => navigate({ to: "/teacher/result", search: { tab: "progress-sheets" } as any })}
                  className="bg-white/95 hover:bg-white border-2 border-slate-100 hover:border-emerald-400/90 rounded-[2.2rem] p-4.5 flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1.5 active:scale-[0.98] group text-left relative overflow-hidden cursor-pointer"
                >
                  <div className="absolute -top-10 -right-10 size-28 rounded-full bg-gradient-to-br from-emerald-500/10 to-green-500/5 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
                  <div className="flex items-center gap-3.5 relative z-10">
                    <div className="size-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/35 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 flex-shrink-0">
                      <svg className="size-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div>
                      <h3 className="text-[14.5px] font-black text-slate-800 group-hover:text-emerald-600 transition-colors tracking-tight">वर्णनात्मक नोंदी</h3>
                      <p className="text-[11.5px] text-slate-500 font-medium leading-snug mt-0.5">विषयनिहाय विशेष प्रगती नोंदी</p>
                    </div>
                  </div>
                  <div className="size-8 rounded-xl bg-slate-100/90 group-hover:bg-emerald-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-all duration-300 flex-shrink-0 shadow-sm group-hover:shadow-md group-hover:translate-x-0.5 relative z-10">
                    <span className="font-extrabold text-xs">➔</span>
                  </div>
                </button>

                {/* 8. अध्ययन निष्पत्ती प्रगती */}
                <button
                  onClick={() => navigate({ to: "/teacher/result", search: { tab: "subject-wise" } as any })}
                  className="bg-white/95 hover:bg-white border-2 border-slate-100 hover:border-sky-400/90 rounded-[2.2rem] p-4.5 flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-sky-500/10 hover:-translate-y-1.5 active:scale-[0.98] group text-left relative overflow-hidden cursor-pointer"
                >
                  <div className="absolute -top-10 -right-10 size-28 rounded-full bg-gradient-to-br from-sky-500/10 to-cyan-500/5 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
                  <div className="flex items-center gap-3.5 relative z-10">
                    <div className="size-12 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white flex items-center justify-center shadow-md shadow-sky-500/35 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 flex-shrink-0">
                      <svg className="size-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </div>
                    <div>
                      <h3 className="text-[14.5px] font-black text-slate-800 group-hover:text-sky-600 transition-colors tracking-tight">अध्ययन निष्पत्ती प्रगती</h3>
                      <p className="text-[11.5px] text-slate-500 font-medium leading-snug mt-0.5">कौशल्य व गुण निष्पत्ती चार्ट</p>
                    </div>
                  </div>
                  <div className="size-8 rounded-xl bg-slate-100/90 group-hover:bg-sky-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-all duration-300 flex-shrink-0 shadow-sm group-hover:shadow-md group-hover:translate-x-0.5 relative z-10">
                    <span className="font-extrabold text-xs">➔</span>
                  </div>
                </button>

                {/* 9. विषय निश्चिती */}
                <button
                  onClick={() => navigate({ to: "/teacher/result", search: { tab: "subject-config" } as any })}
                  className="bg-white/95 hover:bg-white border-2 border-slate-100 hover:border-fuchsia-400/90 rounded-[2.2rem] p-4.5 flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-fuchsia-500/10 hover:-translate-y-1.5 active:scale-[0.98] group text-left relative overflow-hidden cursor-pointer"
                >
                  <div className="absolute -top-10 -right-10 size-28 rounded-full bg-gradient-to-br from-fuchsia-500/10 to-pink-500/5 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
                  <div className="flex items-center gap-3.5 relative z-10">
                    <div className="size-12 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white flex items-center justify-center shadow-md shadow-fuchsia-500/35 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 flex-shrink-0">
                      <svg className="size-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </div>
                    <div>
                      <h3 className="text-[14.5px] font-black text-slate-800 group-hover:text-fuchsia-600 transition-colors tracking-tight">विषय निश्चिती</h3>
                      <p className="text-[11.5px] text-slate-500 font-medium leading-snug mt-0.5">इयत्तानिहाय विषय रचना सेट करा</p>
                    </div>
                  </div>
                  <div className="size-8 rounded-xl bg-slate-100/90 group-hover:bg-fuchsia-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-all duration-300 flex-shrink-0 shadow-sm group-hover:shadow-md group-hover:translate-x-0.5 relative z-10">
                    <span className="font-extrabold text-xs">➔</span>
                  </div>
                </button>

                {/* 10. PDF निर्मिती */}
                <button
                  onClick={() => navigate({ to: "/teacher/result", search: { tab: "pdf-creation" } as any })}
                  className="bg-white/95 hover:bg-white border-2 border-slate-100 hover:border-rose-400/90 rounded-[2.2rem] p-4.5 flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-rose-500/10 hover:-translate-y-1.5 active:scale-[0.98] group text-left relative overflow-hidden cursor-pointer"
                >
                  <div className="absolute -top-10 -right-10 size-28 rounded-full bg-gradient-to-br from-rose-500/10 to-red-500/5 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
                  <div className="flex items-center gap-3.5 relative z-10">
                    <div className="size-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-md shadow-rose-500/35 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 flex-shrink-0">
                      <svg className="size-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div>
                      <h3 className="text-[14.5px] font-black text-slate-800 group-hover:text-rose-600 transition-colors tracking-tight">PDF निर्मिती</h3>
                      <p className="text-[11.5px] text-slate-500 font-medium leading-snug mt-0.5">प्रगतीपत्रक व गॅझेट PDF</p>
                    </div>
                  </div>
                  <div className="size-8 rounded-xl bg-slate-100/90 group-hover:bg-rose-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-all duration-300 flex-shrink-0 shadow-sm group-hover:shadow-md group-hover:translate-x-0.5 relative z-10">
                    <span className="font-extrabold text-xs">➔</span>
                  </div>
                </button>

                {/* 11. PDF Files */}
                <button
                  onClick={() => navigate({ to: "/teacher/result", search: { tab: "uploads" } as any })}
                  className="bg-white/95 hover:bg-white border-2 border-slate-100 hover:border-cyan-400/90 rounded-[2.2rem] p-4.5 flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-1.5 active:scale-[0.98] group text-left relative overflow-hidden cursor-pointer"
                >
                  <div className="absolute -top-10 -right-10 size-28 rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-500/5 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
                  <div className="flex items-center gap-3.5 relative z-10">
                    <div className="size-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-cyan-500/35 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 flex-shrink-0">
                      <svg className="size-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 01-2 2v5a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div>
                      <h3 className="text-[14.5px] font-black text-slate-800 group-hover:text-cyan-600 transition-colors tracking-tight">PDF Files</h3>
                      <p className="text-[11.5px] text-slate-500 font-medium leading-snug mt-0.5">साठवलेले निकाल व स्टोरेझ</p>
                    </div>
                  </div>
                  <div className="size-8 rounded-xl bg-slate-100/90 group-hover:bg-cyan-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-all duration-300 flex-shrink-0 shadow-sm group-hover:shadow-md group-hover:translate-x-0.5 relative z-10">
                    <span className="font-extrabold text-xs">➔</span>
                  </div>
                </button>

              </div>

              {/* Bottom Nav Simulation */}
              <div className="mt-10 pt-5 border-t border-slate-200/80 flex items-center justify-center">
                <button 
                  onClick={() => navigate({ to: "/teacher" })}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white font-extrabold text-xs px-6 py-2.5 rounded-full transition-all shadow-sm cursor-pointer group"
                >
                  <svg className="size-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  <span>मुख्य शिक्षक डॅशबोर्ड (Back to Teacher Home)</span>
                </button>
              </div>

            </div>
          )}

          {activeTab === "marks-entry" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CCEMarksEntry 
                selectedClass={selectedClass} 
                academicYear={academicYear} 
                onBack={() => navigate({ to: "/teacher/result", search: { tab: "dashboard" } as any })}
              />
            </motion.div>
          )}

          {activeTab === "progress-sheets" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CCERemarks 
                selectedClass={selectedClass} 
                academicYear={academicYear} 
                selectedMedium={selectedMedium}
                onBack={() => navigate({ to: "/teacher/result", search: { tab: "dashboard" } as any })}
              />
            </motion.div>
          )}

          {activeTab === "daily-register" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CCEAttendance 
                selectedClass={selectedClass} 
                academicYear={academicYear} 
                onBack={() => navigate({ to: "/teacher/result", search: { tab: "dashboard" } as any })}
              />
            </motion.div>
          )}

          {activeTab === "subject-config" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CCESubjectConfig 
                selectedClass={selectedClass} 
                academicYear={academicYear} 
                onBack={() => navigate({ to: "/teacher/result", search: { tab: "dashboard" } as any })}
              />
            </motion.div>
          )}

          {activeTab === "subject-wise" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CCESubjectWise 
                selectedClass={selectedClass} 
                academicYear={academicYear} 
                onBack={() => navigate({ to: "/teacher/result", search: { tab: "dashboard" } as any })}
              />
            </motion.div>
          )}

          {activeTab === "grade-wise" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CCEWeightage 
                selectedClass={selectedClass} 
                academicYear={academicYear} 
                onBack={() => navigate({ to: "/teacher/result", search: { tab: "dashboard" } as any })}
              />
            </motion.div>
          )}

          {activeTab === "board-results" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm"
            >
              <BoardResult initialClass={selectedClass} initialYear={academicYear} />
            </motion.div>
          )}

          {activeTab === "result-5th-8th" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm"
            >
              <Result5th8th initialClass={selectedClass} initialYear={academicYear} />
            </motion.div>
          )}

          {activeTab === "combined-results" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CCEOverallResult 
                selectedClass={selectedClass} 
                academicYear={academicYear} 
                onBack={() => navigate({ to: "/teacher/result", search: { tab: "dashboard" } as any })}
              />
            </motion.div>
          )}

          {activeTab === "ssc-result" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm"
            >
              <ResultSSC initialClass={selectedClass} initialYear={academicYear} />
            </motion.div>
          )}

          {activeTab === "hsc-result" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm"
            >
              <ResultHSC initialClass={selectedClass} initialYear={academicYear} />
            </motion.div>
          )}

          {activeTab === "view-report" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CCEStudentInfo 
                selectedClass={selectedClass} 
                onBack={() => navigate({ to: "/teacher/result", search: { tab: "dashboard" } as any })}
              />
            </motion.div>
          )}

          {activeTab === "student-progress" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CCEStudentList 
                selectedClass={selectedClass} 
                academicYear={academicYear} 
                onBack={() => navigate({ to: "/teacher/result", search: { tab: "dashboard" } as any })}
                onViewReport={(studentName: string) => navigate({ to: "/teacher/result", search: { tab: "view-report" } as any })}
              />
            </motion.div>
          )}

          {activeTab === "promote-students" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm"
            >
              <PromoteStudents initialClass={selectedClass} initialYear={academicYear} />
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
              <h2 className="text-2xl font-black text-slate-800 mb-2">विद्यार्थी उपस्थिती (Attendance Tracker)</h2>
              <p className="text-blue-600 font-medium">येथे विद्यार्थ्यांची दैनंदिन उपस्थिती नोंदवता येईल.</p>
            </motion.div>
          )}



          {activeTab === "settings" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CCESettings 
                selectedClass={selectedClass} 
                academicYear={academicYear} 
                onBack={() => navigate({ to: "/teacher/result", search: { tab: "dashboard" } as any })}
              />
            </motion.div>
          )}

          {activeTab === "pdf-creation" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CCEPdfCreation 
                selectedClass={selectedClass} 
                academicYear={academicYear} 
                onBack={() => navigate({ to: "/teacher/result", search: { tab: "dashboard" } as any })}
              />
            </motion.div>
          )}

          {activeTab === "uploads" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CCEPdfFiles 
                selectedClass={selectedClass} 
                academicYear={academicYear} 
                onBack={() => navigate({ to: "/teacher/result", search: { tab: "dashboard" } as any })}
              />
            </motion.div>
          )}
          {activeTab === "account" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CCEAccount 
                onBack={() => navigate({ to: "/teacher/result", search: { tab: "dashboard" } as any })}
              />
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
