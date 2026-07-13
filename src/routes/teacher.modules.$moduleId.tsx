import {
  createFileRoute,
  Link,
  useParams,
  useNavigate,
} from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  Layout,
  FileText,
  BookOpen,
  Trophy,
  Users,
  Utensils,
  Folder,
  Mic,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Plus,
  Home,
  Grid,
  User,
  ArrowRight,
  Sparkles,
  MessageSquare,
  Brain,
  Send,
  Save,
  Loader2,
  Star,
  Award,
  Users2,
  PieChart,
  Table,
  Calculator,
  Edit3,
  BookCheck,
  ClipboardList,
  Medal,
  School,
  Gift,
  GraduationCap,
  Download,
  Eye,
  ArrowLeft,
  Check,
  Trash2,
  AlertCircle,
  Sunrise,
  Sunset,
  Music,
  Quote,
  HelpCircle,
  BookMarked,
  Flag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection } from "firebase/firestore";
import { showToast as toast } from "@/lib/custom-toast";
import html2pdf from "html2pdf.js";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { TeacherStatisticsEditor } from "@/components/teacher/TeacherStatisticsEditor";
import { PinGate } from "@/components/teacher/PinGate";
import class1SyllabusData from "./class1_syllabus.json";
import { DEFAULT_FORM_DATA, ASSEMBLY_TRANSLATIONS, DEFAULT_ASSEMBLY_ITEMS } from "@/lib/assemblyTranslations";

export const Route = createFileRoute("/teacher/modules/$moduleId")({
  component: ModulePage,
});

const MODULE_MAP: any = {
  timetable: {
    m: "Class Schedule",
    e: "Institutional Timetable",
    icon: Calendar,
    color: "bg-[#D6B97A]",
  },
  "special-day": {
    m: "Daily Assembly (Paripath)",
    e: "Reference Books & Materials",
    icon: Star,
    color: "bg-[#D6B97A]",
  },
  template: {
    m: "Design Hub",
    e: "Template Studio",
    icon: FileText,
    color: "bg-[#D6B97A]",
  },
  "annual-monthly-planning": {
    m: "Academic Planning",
    e: "Strategic Roadmap",
    icon: BookCheck,
    color: "bg-[#D6B97A]",
  },
  "question-bank": {
    m: "Knowledge Bank",
    e: "Exam Preparation",
    icon: ClipboardList,
    color: "bg-[#D6B97A]",
  },

  homework: {
    m: "Assignment Desk",
    e: "Student Engagement",
    icon: BookOpen,
    color: "bg-[#D6B97A]",
  },
  "monthly-meeting": {
    m: "Institutional Briefing",
    e: "Staff Coordination",
    icon: Users2,
    color: "bg-[#D6B97A]",
  },
  "mid-day-meal-(mdm)": {
    m: "Meal Logistics",
    e: "Nutrition Management",
    icon: Utensils,
    color: "bg-[#D6B97A]",
  },
  "teacher-statistics": {
    m: "Professional Analytics",
    e: "Performance Metrics",
    icon: PieChart,
    color: "bg-[#D6B97A]",
  },
  "student-statistics": {
    m: "Student Analytics",
    e: "Enrollment Intelligence",
    icon: Users2,
    color: "bg-[#D6B97A]",
  },
  "sqaaf-evaluation": {
    m: "Quality Framework",
    e: "Educational Audit",
    icon: Calculator,
    color: "bg-[#D6B97A]",
  },
  "teaching-record-notebook": {
    m: "Digital Journal",
    e: "Pedagogical Records",
    icon: Edit3,
    color: "bg-[#D6B97A]",
  },
};

function ModulePage() {
  const { moduleId } = useParams({ from: "/teacher/modules/$moduleId" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any>("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState("5th");


  const config = MODULE_MAP[moduleId] || {
    m: moduleId,
    e: moduleId,
    icon: Folder,
    color: "bg-slate-600",
  };

  useEffect(() => {
    async function fetchExistingData() {
      if (!user) return;
      if (!db) {
        toast.error(
          "Database connection unavailable. Please check your internet.",
        );
        setLoading(false);
        return;
      }
      try {
        const tDoc = await getDoc(doc(db, "teachers", user.uid));
        if (tDoc.exists()) {
          const udise = tDoc.data().udise;
          if (udise) {
            const rDoc = await getDoc(
              doc(db, "school_data", `${udise}_${moduleId}`),
            );
            if (rDoc.exists()) {
              setData(rDoc.data().data || "");
            }
          }
        }
      } catch (e) {
        console.error("Data fetch error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchExistingData();
  }, [user, moduleId]);

  const handleSave = async () => {
    if (!user) return;
    if (!db) {
      toast.error("Database connection lost. Changes cannot be committed.");
      return;
    }
    setSaving(true);
    try {
      const tDoc = await getDoc(doc(db, "teachers", user.uid));
      if (!tDoc.exists()) throw new Error("Teacher profile not found");
      const udise = tDoc.data().udise;
      if (!udise) throw new Error("UDISE code missing in profile");

      await setDoc(doc(db, "school_data", `${udise}_${moduleId}`), {
        data,
        updatedAt: new Date().toISOString(),
        resourceId: moduleId,
        udise,
        teacherId: user.uid,
      });

      toast.success(`${config.e} updated successfully!`);
    } catch (e: any) {
      toast.error(e.message || "Failed to save data");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F5EF] relative overflow-hidden flex flex-col pb-20 md:pb-0 font-sans">
      {/* Premium Luxury Background Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-48 -left-48 size-[800px] bg-[#E8DFD1]/30 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute top-1/2 -right-48 size-[900px] bg-[#C9D8C5]/20 rounded-full blur-[100px] animate-blob" />
        <div className="absolute -bottom-64 left-1/4 size-[800px] bg-[#D6B97A]/10 rounded-full blur-[100px] animate-blob animation-delay-2000" />
      </div>

      <header className="bg-white/40 backdrop-blur-2xl border-b border-[#E8DFD1]/50 fixed top-0 left-0 right-0 h-16 z-30 px-4 md:px-8 flex items-center">
        <div className="max-w-[1600px] w-full mx-auto flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3 md:gap-8">
            <button
              onClick={() => window.history.back()}
              className="size-10 md:size-12 flex items-center justify-center bg-white/50 hover:bg-white rounded-xl md:rounded-2xl transition-all border border-[#E8DFD1]/50 text-[#D6B97A] shadow-sm hover:shadow-md"
            >
              <ChevronLeft className="size-5 md:size-6" />
            </button>
            <div className="flex items-center gap-3 md:gap-6">
              <div
                className={`size-10 md:size-14 ${config.color} rounded-xl md:rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl shadow-[#D6B97A]/20 ring-4 ring-white/50`}
              >
                <config.icon className="size-5 md:size-7" />
              </div>
              <div>
                <h1 className="font-black text-[#1A1A1A] text-lg md:text-2xl tracking-tight leading-none">
                  {config.m}
                </h1>
                <p className="text-[8px] md:text-[11px] font-bold text-[#D6B97A] uppercase tracking-[0.3em] mt-1 md:mt-2">
                  {config.e}
                </p>
              </div>
            </div>
          </div>

           <div className="flex items-center gap-2 md:gap-4">
             {moduleId === "teacher-statistics" && (
               <button
                 onClick={() => window.dispatchEvent(new Event("download-teacher-portfolio-pdf"))}
                 className="group flex items-center gap-2 md:gap-4 px-6 md:px-12 py-3 md:py-5 bg-white text-slate-800 text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] rounded-full hover:bg-[#D6B97A] hover:text-white hover:border-[#D6B97A] border border-slate-200 transition-all duration-700 shadow-xl cursor-pointer"
               >
                 <Download className="size-3 md:size-4 text-[#D6B97A] group-hover:text-white" />
                 <span className="hidden sm:inline">Download PDF</span>
                 <span className="sm:hidden">PDF</span>
               </button>
             )}
             <button
               onClick={handleSave}
               disabled={saving}
               className="group flex items-center gap-2 md:gap-4 px-6 md:px-12 py-3 md:py-5 bg-[#1A1A1A] text-white text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] rounded-full hover:bg-[#D6B97A] transition-all duration-700 shadow-2xl disabled:opacity-50"
             >
               {saving ? (
                 <Loader2 className="size-3 md:size-4 animate-spin" />
               ) : (
                 <Save className="size-3 md:size-4 group-hover:rotate-12 transition-transform text-[#D6B97A] group-hover:text-white" />
               )}
               <span className="hidden sm:inline">Commit Sync</span>
               <span className="sm:hidden">Save</span>
             </button>
           </div>
        </div>
      </header>

      <TeacherSidebar />

      <main className="flex-1 lg:pl-64 pt-24 max-w-[1400px] mx-auto w-full px-6 py-12 md:py-20 relative z-10">
        <PinGate sectionKey="planning" enabled={moduleId === "annual-monthly-planning"}>
          <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-3xl rounded-[4rem] border border-white/50 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] relative overflow-hidden"
        >
          {/* Canvas Decoration */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-[#D6B97A]/30 to-transparent" />

          <div className="p-4 md:p-16">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
              <config.icon className="size-32 md:size-64 text-[#D6B97A]" />
            </div>


            {moduleId === "timetable" && (
              <>
                <div className="md:hidden flex items-center justify-center gap-2 mb-6 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
                  <ArrowRight className="size-3" /> Swipe left to see more{" "}
                  <ArrowRight className="size-3" />
                </div>
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-100 rounded-[2rem] mb-12 overflow-x-auto no-scrollbar shadow-sm"
                >
                  {["5th", "6th", "7th", "8th", "9th", "10th"].map((cls) => (
                    <button
                      key={cls}
                      onClick={() => setSelectedClass(cls)}
                      className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-500 ${selectedClass === cls
                          ? "bg-slate-900 text-white shadow-2xl translate-y-[-2px]"
                          : "text-slate-400 hover:text-slate-900 hover:bg-white"
                        }`}
                    >
                      Class {cls}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
            {loading ? (
              <div className="h-96 flex flex-col items-center justify-center text-slate-400 gap-6">
                <Loader2 className="size-10 animate-spin text-indigo-600" />
                <p className="text-[12px] font-black uppercase tracking-[0.3em] animate-pulse">
                  Synchronizing Data...
                </p>
              </div>
            ) : moduleId === "timetable" ? (
              <TimetableEditor
                data={data}
                selectedClass={selectedClass}
                onChange={(val: any) => setData(val)}
              />
            ) : moduleId === "special-day" ? (
              <AssemblyBookViewer />
            ) : moduleId === "template" ? (
              <TemplateVisualHub data={data} onChange={setData} />

            ) : moduleId === "mid-day-meal-(mdm)" ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6">
                <div className="size-20 rounded-full bg-[#D6B97A]/10 text-[#D6B97A] flex items-center justify-center shadow-inner">
                  <Utensils className="size-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-[#1A1A1A] italic">
                    Mid-Day Meal (MDM) Portal
                  </h3>
                  <p className="text-slate-500 font-medium max-w-md mx-auto">
                    Access the interactive meal distribution registers, food
                    stock inventory ledgers, helper records, and autogenerated
                    reports.
                  </p>
                </div>
                <Link
                  to="/teacher/mdm"
                  className="px-10 py-5 bg-[#1A1A1A] hover:bg-[#D6B97A] text-white rounded-full text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl"
                >
                  Access MDM Workspace
                </Link>
              </div>
            ) : moduleId === "annual-monthly-planning" ? (
              <AnnualMonthlyPlanningEditor
                data={data}
                onChange={(val: any) => setData(val)}
              />
            ) : moduleId === "teaching-record-notebook" ? (
              <TeachingDiaryManager
                data={data}
                onChange={(val: any) => setData(val)}
              />
            ) : moduleId === "teacher-statistics" ? (
              <TeacherStatisticsEditor
                data={data}
                onChange={(val: any) => setData(val)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6">
                <div className="size-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Grid className="size-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900">
                    Module Under Construction
                  </h3>
                  <p className="text-slate-500 font-medium">
                    We're building something amazing here. Please check back
                    soon.
                  </p>
                </div>
              </div>
            )}
          </div>
          </motion.div>
        </PinGate>
      </main>

      <nav className="md:hidden fixed bottom-4 left-4 right-4 h-20 bg-white/90 backdrop-blur-xl border border-slate-200 rounded-[2.5rem] shadow-2xl z-50 flex items-center justify-around px-8">
        <Link to="/teacher" className="p-3 text-slate-400">
          <Home className="size-6" />
        </Link>
        <button
          className={`p-4 rounded-2xl ${config.color} text-white shadow-lg`}
        >
          <config.icon className="size-6" />
        </button>
        <Link to="/profile" className="p-3 text-slate-400">
          <User className="size-6" />
        </Link>
      </nav>
    </div>
  );
}

function TimetableEditor({
  data,
  selectedClass,
  onChange,
}: {
  data: any;
  selectedClass: string;
  onChange: (val: any) => void;
}) {
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const periods = [1, 2, 3, 4, 5, 6, 7, 8];
  const accentColors = [
    {
      border: "from-[#D6B97A] to-[#C4A661]",
      bg: "bg-[#FAFAF7]",
      text: "text-[#D6B97A]",
      shadow: "shadow-[#D6B97A]/10",
    },
    {
      border: "from-[#C9D8C5] to-[#B8C7B4]",
      bg: "bg-[#FAFAF7]",
      text: "text-[#7A8A76]",
      shadow: "shadow-[#C9D8C5]/10",
    },
    {
      border: "from-[#E8DFD1] to-[#D7CEC0]",
      bg: "bg-[#FAFAF7]",
      text: "text-[#8A7A66]",
      shadow: "shadow-[#E8DFD1]/10",
    },
    {
      border: "from-[#D6B97A] to-[#C4A661]",
      bg: "bg-[#FAFAF7]",
      text: "text-[#D6B97A]",
      shadow: "shadow-[#D6B97A]/10",
    },
    {
      border: "from-[#C9D8C5] to-[#B8C7B4]",
      bg: "bg-[#FAFAF7]",
      text: "text-[#7A8A76]",
      shadow: "shadow-[#C9D8C5]/10",
    },
    {
      border: "from-[#E8DFD1] to-[#D7CEC0]",
      bg: "bg-[#FAFAF7]",
      text: "text-[#8A7A66]",
      shadow: "shadow-[#E8DFD1]/10",
    },
    {
      border: "from-[#D6B97A] to-[#C4A661]",
      bg: "bg-[#FAFAF7]",
      text: "text-[#D6B97A]",
      shadow: "shadow-[#D6B97A]/10",
    },
    {
      border: "from-[#C9D8C5] to-[#B8C7B4]",
      bg: "bg-[#FAFAF7]",
      text: "text-[#7A8A76]",
      shadow: "shadow-[#C9D8C5]/10",
    },
  ];

  const safeData = typeof data === "object" && data !== null ? data : {};

  const handleCellChange = (
    day: string,
    period: number,
    field: string,
    value: string,
  ) => {
    const updatedData = { ...safeData };
    if (!updatedData[selectedClass]) updatedData[selectedClass] = {};
    if (!updatedData[selectedClass][day]) updatedData[selectedClass][day] = {};
    if (!updatedData[selectedClass][day][period])
      updatedData[selectedClass][day][period] = {};

    updatedData[selectedClass][day][period][field] = value;
    onChange(updatedData);
  };

  return (
    <div className="space-y-12">
      <div className="overflow-x-auto pb-16 no-scrollbar -mx-8 md:-mx-14 px-8 md:px-14">
        <div className="min-w-[1200px] bg-white/40 backdrop-blur-2xl rounded-[4rem] border border-white shadow-2xl overflow-hidden">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-[#FAFAF7] border-b border-[#E8DFD1]">
                <th className="p-10 text-left border-r border-[#E8DFD1]/50 w-[140px]">
                  <span className="text-[10px] font-black text-[#D6B97A] uppercase tracking-[0.4em]">
                    Chronicle
                  </span>
                </th>
                {days.map((day) => (
                  <th
                    key={day}
                    className="p-10 text-center border-r border-[#E8DFD1]/50 last:border-0"
                  >
                    <span className="text-[11px] font-black text-[#1A1A1A] uppercase tracking-[0.4em]">
                      {day}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr
                  key={p}
                  className="group hover:bg-[#FAFAF7]/50 transition-colors duration-500"
                >
                  <td className="p-10 border-r border-[#E8DFD1]/50 bg-[#FAFAF7]/30">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div
                        className={`size-14 rounded-2xl ${accentColors[p - 1].bg} flex items-center justify-center border border-[#E8DFD1]/50 shadow-sm ring-4 ring-white/50 group-hover:scale-110 transition-transform`}
                      >
                        <span
                          className={`text-lg font-black ${accentColors[p - 1].text}`}
                        >
                          {p}
                        </span>
                      </div>
                      <span className="text-[9px] font-black text-[#D6B97A]/60 uppercase tracking-widest">
                        Period
                      </span>
                    </div>
                  </td>
                  {days.map((day) => {
                    const cell = safeData[selectedClass]?.[day]?.[p] || {
                      subject: "",
                      teacher: "",
                    };
                    return (
                      <td
                        key={day}
                        className="p-4 border-r border-[#E8DFD1]/50 last:border-0"
                      >
                        <div className="p-6 rounded-[2.5rem] transition-all duration-500 border border-transparent focus-within:border-[#D6B97A]/30 focus-within:bg-white focus-within:shadow-xl group-hover:bg-white/40">
                          <div className="relative mb-4">
                            <input
                              type="text"
                              placeholder="Academic Discipline..."
                              className="w-full bg-transparent text-base font-black text-[#1A1A1A] placeholder:text-[#D6B97A]/40 outline-none"
                              value={cell.subject}
                              onChange={(e) =>
                                handleCellChange(
                                  day,
                                  p,
                                  "subject",
                                  e.target.value,
                                )
                              }
                            />
                            <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#D6B97A] group-hover:w-full transition-all duration-700 opacity-20" />
                          </div>
                          <div className="flex items-center gap-3 opacity-60 focus-within:opacity-100 transition-opacity">
                            <div className="size-6 rounded-lg bg-[#F8F5EF] flex items-center justify-center border border-[#E8DFD1]/50">
                              <User className="size-3 text-[#D6B97A]" />
                            </div>
                            <input
                              type="text"
                              placeholder="Instructor"
                              className="w-full bg-transparent text-[11px] font-bold text-[#8A7A66] placeholder:text-[#D6B97A]/30 outline-none"
                              value={cell.teacher}
                              onChange={(e) =>
                                handleCellChange(
                                  day,
                                  p,
                                  "teacher",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TemplateVisualHub({
  data,
  onChange,
}: {
  data: any;
  onChange: (val: any) => void;
}) {
  const [activeTab, setActiveTab] = useState("all");
  const [activeVariant, setActiveVariant] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Initialize with fallback for SSR
  const [safeData, setSafeData] = useState<any>(() => {
    const defaultFields = {
      name: "Aryan Sharma",
      class: "Grade 4",
      division: "A",
      school: "Royal Academy of Excellence",
      date: "May 24, 2026",
      message:
        "Wishing you a year filled with academic brilliance and joyous discoveries!",
      rank: "1st",
      percentage: "98.4%",
      instructor: "Dr. Elena Gilbert",
      course: "Advanced Sciences",
      festival: "Ganesh Chaturthi",
      event: "Annual Sports Meet",
      year: "2025-26",
    };

    if (typeof window === "undefined") {
      return { studentPhoto: null, editFields: defaultFields };
    }

    return typeof data === "object" && data !== null
      ? data
      : {
        studentPhoto: localStorage.getItem("school_template_photo"),
        editFields:
          JSON.parse(
            localStorage.getItem("school_template_fields") || "null",
          ) || defaultFields,
      };
  });

  // Sync safeData with incoming data prop
  useEffect(() => {
    if (typeof data === "object" && data !== null) {
      setSafeData(data);
    }
  }, [data]);

  const studentPhoto = safeData.studentPhoto;
  const editFields = safeData.editFields;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const newData = { ...safeData, studentPhoto: base64 };
        onChange(newData);
        localStorage.setItem("school_template_photo", base64);
        toast.success("Identity portrait synchronized!");
      };
      reader.readAsDataURL(file);
    }
  };

  const updateField = (field: string, value: string) => {
    const newFields = { ...editFields, [field]: value };
    const newData = { ...safeData, editFields: newFields };
    onChange(newData);
    localStorage.setItem("school_template_fields", JSON.stringify(newFields));
  };

  interface Template {
    id: string;
    category: string;
    title: string;
    icon: any;
    color: string;
    desc: string;
  }

  const templates: Template[] = [
    {
      id: "bday-1",
      category: "birthday",
      title: "Royal Birthday",
      icon: Star,
      color: "bg-amber-500",
      desc: "Celebrate milestones with style.",
    },
    {
      id: "adm-1",
      category: "admission",
      title: "Institutional Welcome",
      icon: Award,
      color: "bg-blue-600",
      desc: "Official welcome for new scholars.",
    },
    {
      id: "cert-1",
      category: "certificate",
      title: "Mastery Proof",
      icon: BookOpen,
      color: "bg-slate-900",
      desc: "Formal certification of achievement.",
    },
    {
      id: "sports-1",
      category: "sports",
      title: "Champion Call",
      icon: Trophy,
      color: "bg-rose-600",
      desc: "For sports excellence and spirit.",
    },
    {
      id: "cult-1",
      category: "cultural",
      title: "Stage Magic",
      icon: Mic,
      color: "bg-violet-600",
      desc: "Spotlight on artistic brilliance.",
    },
    {
      id: "rank-1",
      category: "topper",
      title: "Elite Merit",
      icon: Medal,
      color: "bg-emerald-600",
      desc: "Honoring academic top rankers.",
    },
    {
      id: "fest-1",
      category: "festival",
      title: "Festive Joy",
      icon: Sparkles,
      color: "bg-orange-500",
      desc: "Cultural celebration announcements.",
    },
  ];

  return (
    <div className="space-y-12 md:space-y-20 font-sans">
      {/* Search & Navigation Hub */}
      <div className="flex flex-col gap-8 relative z-10">
        <div className="relative group max-w-2xl mx-auto w-full">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#D6B97A] via-[#E8DFD1] to-[#D6B97A] rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search Design Templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 md:pl-16 pr-6 md:pr-8 py-5 md:py-7 bg-white/80 backdrop-blur-xl border-2 border-white rounded-2xl md:rounded-[2.5rem] text-xs md:text-sm font-bold text-[#111827] outline-none focus:ring-4 focus:ring-[#D6B97A]/10 transition-all shadow-2xl"
            />
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[#D6B97A]">
              <Sparkles className="size-6 animate-pulse" />
            </div>
          </div>
        </div>

        <div className="flex overflow-x-auto no-scrollbar gap-3 p-1">
          {[
            "all",
            "birthday",
            "admission",
            "certificate",
            "sports",
            "cultural",
            "topper",
            "festival",
          ].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 whitespace-nowrap border-2 ${activeTab === tab
                  ? "bg-[#111827] text-white border-[#111827] shadow-2xl scale-105"
                  : "bg-white text-[#111827]/40 border-transparent hover:border-[#E8DFD1]/50 hover:text-[#111827]"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12 md:gap-20">
        {/* Atelier Editor Section */}
        {activeTab !== "all" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white/40 backdrop-blur-3xl rounded-[3rem] md:rounded-[4rem] border border-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.05)] overflow-hidden group"
          >
            {/* Decorative Background Texture */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
            <div className="absolute -top-24 -right-24 size-64 bg-[#D6B97A]/10 rounded-full blur-[100px]" />

            <div className="p-6 md:p-14 space-y-12 relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6">
                  <div className="size-14 md:size-16 rounded-2xl md:rounded-[1.5rem] bg-[#111827] flex items-center justify-center text-white shadow-2xl ring-4 ring-white shrink-0">
                    <Edit3 className="size-6 md:size-8 text-[#D6B97A]" />
                  </div>
                  <div>
                    <h3 className="text-2xl md:text-3xl font-black text-[#111827] tracking-tighter">
                      Design <span className="text-[#D6B97A]">Atelier</span>
                    </h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#D6B97A]/60">
                      Studio Precision
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 px-6 py-3 bg-white/60 rounded-2xl border border-white shadow-sm">
                  <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#111827]/40">
                    Active Session
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Universal Fields */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[#111827] uppercase tracking-[0.3em] ml-2">
                    Full Identity
                  </label>
                  <input
                    type="text"
                    value={editFields.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    className="w-full px-8 py-5 bg-[#F8F5EF]/50 border-2 border-transparent rounded-2xl text-sm font-bold text-[#111827] focus:border-[#D6B97A] focus:bg-white outline-none transition-all"
                    placeholder="Enter Full Name"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[#111827] uppercase tracking-[0.3em] ml-2">
                    Academic Placement
                  </label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <input
                      type="text"
                      placeholder="Grade (e.g. Grade 4)"
                      value={editFields.class}
                      onChange={(e) => updateField("class", e.target.value)}
                      className="flex-[2] px-8 py-5 bg-[#F8F5EF]/50 border-2 border-transparent rounded-2xl text-sm font-bold text-[#111827] focus:border-[#D6B97A] focus:bg-white outline-none transition-all"
                    />
                    <input
                      type="text"
                      placeholder="Div (e.g. A)"
                      value={editFields.division}
                      onChange={(e) => updateField("division", e.target.value)}
                      className="flex-1 px-8 py-5 bg-[#F8F5EF]/50 border-2 border-transparent rounded-2xl text-sm font-bold text-[#111827] focus:border-[#D6B97A] focus:bg-white outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Category Specific Fields */}
                {activeTab === "certificate" && (
                  <>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-[#111827] uppercase tracking-[0.3em] ml-2">
                        Specialization
                      </label>
                      <input
                        type="text"
                        value={editFields.course}
                        onChange={(e) => updateField("course", e.target.value)}
                        className="w-full px-8 py-5 bg-[#F8F5EF]/50 border-2 border-transparent rounded-2xl text-sm font-bold text-[#111827] focus:border-[#D6B97A] focus:bg-white outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-[#111827] uppercase tracking-[0.3em] ml-2">
                        Lead Instructor
                      </label>
                      <input
                        type="text"
                        value={editFields.instructor}
                        onChange={(e) =>
                          updateField("instructor", e.target.value)
                        }
                        className="w-full px-8 py-5 bg-[#F8F5EF]/50 border-2 border-transparent rounded-2xl text-sm font-bold text-[#111827] focus:border-[#D6B97A] focus:bg-white outline-none transition-all"
                      />
                    </div>
                  </>
                )}

                {activeTab === "topper" && (
                  <>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-[#111827] uppercase tracking-[0.3em] ml-2">
                        Merit Rank
                      </label>
                      <input
                        type="text"
                        value={editFields.rank}
                        onChange={(e) => updateField("rank", e.target.value)}
                        className="w-full px-8 py-5 bg-[#F8F5EF]/50 border-2 border-transparent rounded-2xl text-sm font-bold text-[#111827] focus:border-[#D6B97A] focus:bg-white outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-[#111827] uppercase tracking-[0.3em] ml-2">
                        Performance %
                      </label>
                      <input
                        type="text"
                        value={editFields.percentage}
                        onChange={(e) =>
                          updateField("percentage", e.target.value)
                        }
                        className="w-full px-8 py-5 bg-[#F8F5EF]/50 border-2 border-transparent rounded-2xl text-sm font-bold text-[#111827] focus:border-[#D6B97A] focus:bg-white outline-none transition-all"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-3 md:col-span-2">
                  <label className="text-[10px] font-black text-[#111827] uppercase tracking-[0.3em] ml-2">
                    Digital Manuscript
                  </label>
                  <textarea
                    value={editFields.message}
                    onChange={(e) => updateField("message", e.target.value)}
                    className="w-full h-32 px-8 py-6 bg-[#F8F5EF]/50 border-2 border-transparent rounded-3xl text-sm font-bold text-[#111827] focus:border-[#D6B97A] focus:bg-white outline-none transition-all resize-none"
                  ></textarea>
                </div>

                <div className="md:col-span-2 space-y-6">
                  <label className="text-[10px] font-black text-[#111827] uppercase tracking-[0.3em] ml-2">
                    Identity Portrait
                  </label>
                  <div className="flex flex-col items-center justify-center gap-8 p-8 md:p-12 bg-[#F8F5EF]/30 border-2 border-dashed border-[#D6B97A]/30 rounded-[3rem]">
                    <div className="flex flex-col items-center gap-4 text-center">
                      <button
                        onClick={() =>
                          document.getElementById("photo-input")?.click()
                        }
                        className="w-full sm:w-auto px-12 py-6 bg-[#111827] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-[#D6B97A] transition-all flex items-center justify-center gap-4 group shadow-2xl"
                      >
                        <Plus className="size-5 group-hover:rotate-90 transition-transform text-[#D6B97A]" />
                        {studentPhoto ? "Update Portrait" : "Upload Portrait"}
                      </button>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Supports PNG, JPG (Max 5MB)
                      </p>
                    </div>

                    <input
                      id="photo-input"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                    />

                    {studentPhoto && (
                      <div className="size-32 md:size-40 rounded-[2.5rem] border-8 border-white shadow-3xl overflow-hidden ring-8 ring-[#D6B97A]/5">
                        <img
                          src={studentPhoto}
                          className="w-full h-full object-cover"
                          alt="Portrait"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((t, idx) => (
              <motion.button
                key={t.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => setActiveTab(t.category)}
                className="group relative h-[420px] rounded-[3rem] bg-white border border-white p-10 text-left transition-all duration-700 shadow-xl hover:shadow-[0_40px_80px_-20px_rgba(214,185,122,0.3)] overflow-hidden hover:-translate-y-4"
              >
                {/* Card Background Bloom */}
                <div
                  className={`absolute -top-20 -right-20 size-64 ${t.color} opacity-[0.03] rounded-full blur-[80px] group-hover:opacity-10 transition-opacity duration-700`}
                />

                <div
                  className={`size-20 ${t.color} rounded-[1.5rem] flex items-center justify-center text-white mb-10 shadow-2xl shadow-[#111827]/10 group-hover:rotate-[15deg] transition-transform duration-700`}
                >
                  <t.icon className="size-10" />
                </div>

                <div className="space-y-4 relative z-10">
                  <h4 className="text-3xl font-black text-[#111827] tracking-tighter leading-none">
                    {t.title}
                  </h4>
                  <p className="text-[11px] font-bold text-[#111827]/40 uppercase tracking-[0.2em] leading-relaxed max-w-[200px]">
                    {t.desc}
                  </p>
                </div>

                <div className="absolute bottom-10 left-10 flex items-center gap-4">
                  <div className="px-4 py-2 bg-[#F8F5EF] rounded-full text-[9px] font-black uppercase tracking-widest text-[#D6B97A]">
                    Template v2.0
                  </div>
                </div>

                <div className="absolute bottom-10 right-10 size-14 rounded-2xl bg-[#111827] flex items-center justify-center text-[#D6B97A] opacity-0 group-hover:opacity-100 translate-x-10 group-hover:translate-x-0 transition-all duration-700 shadow-2xl">
                  <ArrowRight className="size-6" />
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {/* Digital Twin Preview Hub */}
        {activeTab !== "all" && (
          <div className="relative space-y-12 flex flex-col items-center py-20 px-4 md:px-10 bg-[#111827]/[0.02] rounded-[5rem] border border-white/50 overflow-hidden">
            {/* Cinematic Spotlight Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[800px] bg-[#D6B97A]/5 rounded-full blur-[160px] pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between w-full max-w-2xl px-10 py-6 bg-[#111827] rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)]">
              <div className="flex items-center gap-4">
                <div className="size-3 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#D6B97A]">
                  Digital Twin Engine v2.4
                </span>
              </div>
              <div className="flex gap-3">
                <div className="size-2 rounded-full bg-white/20" />
                <div className="size-2 rounded-full bg-white/10" />
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeTab}-${activeVariant}`}
                initial={{ opacity: 0, scale: 0.95, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -40 }}
                className="relative aspect-[3/4.2] w-full max-w-[550px] rounded-[2.5rem] md:rounded-[4.5rem] overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.2)] md:shadow-[0_80px_160px_-40px_rgba(0,0,0,0.4)] border-8 md:border-[16px] border-white bg-white group"
              >
                {/* Distinct Template Renderers */}
                {activeTab === "birthday" && (
                  <div className="h-full bg-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
                    {/* Animated Celebratory Orbs */}
                    <motion.div
                      animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="absolute top-10 left-10 size-40 bg-amber-200/40 rounded-full blur-3xl"
                    />
                    <motion.div
                      animate={{ y: [0, 20, 0], opacity: [0.2, 0.4, 0.2] }}
                      transition={{ duration: 5, repeat: Infinity, delay: 1 }}
                      className="absolute bottom-20 right-10 size-48 bg-orange-200/30 rounded-full blur-3xl"
                    />

                    <div className="relative z-10 w-full h-full border-[2px] border-amber-100 rounded-[3rem] p-8 flex flex-col items-center justify-center">
                      <div className="mb-10 relative">
                        <div className="absolute -inset-4 bg-amber-500/10 rounded-full blur-2xl animate-pulse" />
                        <Sparkles className="size-16 text-amber-500 relative z-10" />
                      </div>

                      <h3 className="text-5xl font-black text-[#111827] tracking-[0.2em] mb-12 leading-none uppercase">
                        Happy
                        <br />
                        <span className="text-amber-500">Birthday</span>
                      </h3>

                      <div className="size-48 md:size-64 rounded-full border-[12px] border-white shadow-[0_32px_64px_-16px_rgba(214,185,122,0.4)] overflow-hidden mb-10 ring-[16px] ring-amber-50/50">
                        {studentPhoto ? (
                          <img
                            src={studentPhoto}
                            className="w-full h-full object-cover"
                            alt="Student"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                            <User className="size-16 md:size-20" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <h2 className="text-4xl font-black text-[#111827] tracking-tight">
                          {editFields.name}
                        </h2>
                        <div className="inline-flex items-center gap-3 px-6 py-2 bg-[#111827] text-white rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-xl">
                          Class {editFields.class} • Div {editFields.division}
                        </div>
                      </div>

                      <p className="mt-10 text-sm font-medium text-slate-500 italic max-w-[280px] leading-relaxed">
                        "{editFields.message}"
                      </p>

                      <div className="mt-auto pt-8 w-full border-t border-amber-100/50 flex flex-col items-center gap-2">
                        <div className="size-2 rounded-full bg-amber-500/20" />
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#111827]">
                          {editFields.school}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "admission" && (
                  <div className="h-full bg-[#111827] flex flex-col items-center justify-center p-12 text-center text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-transparent to-transparent opacity-40" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent" />

                    <div className="relative z-10 w-full h-full border border-white/10 rounded-[3.5rem] p-8 flex flex-col items-center justify-center">
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className="size-24 rounded-[2rem] bg-white text-indigo-600 flex items-center justify-center mb-10 shadow-[0_20px_40px_rgba(255,255,255,0.2)]"
                      >
                        <GraduationCap className="size-12" />
                      </motion.div>

                      <div className="space-y-4 mb-12">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.6em] text-blue-300">
                          Scholastic Admission
                        </h4>
                        <h3 className="text-5xl font-black tracking-tighter uppercase leading-none">
                          Welcome
                          <br />
                          <span className="text-indigo-400">Genius</span>
                        </h3>
                      </div>

                      <div className="size-48 md:size-60 rounded-[2.5rem] border-[8px] border-white/10 p-2 bg-white/5 mb-12 shadow-3xl">
                        <div className="w-full h-full rounded-[2rem] border-4 border-white overflow-hidden">
                          {studentPhoto ? (
                            <img
                              src={studentPhoto}
                              className="w-full h-full object-cover"
                              alt="Student"
                            />
                          ) : (
                            <div className="w-full h-full bg-white/10 flex items-center justify-center">
                              <User className="size-16 md:size-24" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h2 className="text-4xl font-black text-white tracking-tight">
                          {editFields.name}
                        </h2>
                        <div className="inline-flex px-8 py-3 bg-white text-[#111827] rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl">
                          Grade {editFields.class} • Section{" "}
                          {editFields.division}
                        </div>
                      </div>

                      <div className="mt-auto opacity-30 text-[9px] font-black uppercase tracking-[0.5em] border-t border-white/10 pt-8 w-full">
                        {editFields.school}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "certificate" && (
                  <div className="h-full bg-[#FDFCFB] border-[24px] border-[#111827] flex flex-col items-center justify-between p-12 text-center text-[#111827] relative">
                    <div className="absolute inset-0 border border-[#111827]/10 m-4 pointer-events-none" />
                    <div className="absolute inset-0 border-4 border-[#111827]/5 m-8 pointer-events-none" />

                    <div className="flex flex-col items-center gap-6 mt-6">
                      <Trophy className="size-20 text-amber-500 drop-shadow-xl" />
                      <div className="size-2 w-32 bg-amber-500/20 rounded-full" />
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.8em] text-slate-400">
                        Merit Certification
                      </h4>
                      <p className="text-sm font-serif italic text-slate-500 px-10 leading-relaxed">
                        This prestigious document is awarded to
                      </p>
                      <h2 className="text-5xl font-serif italic border-b-4 border-[#111827] pb-4 px-12 leading-none inline-block">
                        {editFields.name}
                      </h2>
                      <p className="text-sm font-serif italic text-slate-500 px-10 leading-relaxed mt-4">
                        for demonstrating exceptional mastery in
                      </p>
                      <h3 className="text-3xl font-black tracking-tight uppercase text-amber-600">
                        {editFields.course}
                      </h3>
                    </div>

                    <div className="w-full grid grid-cols-2 gap-12 pt-12 border-t border-[#111827]/5 mb-6">
                      <div className="space-y-2">
                        <p className="text-xs font-black uppercase">
                          {editFields.instructor}
                        </p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.3em]">
                          Institutional Lead
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-black uppercase">
                          {editFields.date}
                        </p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.3em]">
                          Validation Date
                        </p>
                      </div>
                    </div>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-20">
                      <p className="text-[8px] font-black uppercase tracking-[0.5em]">
                        {editFields.school}
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === "sports" && (
                  <div className="h-full bg-[#111827] flex flex-col items-center justify-center p-12 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-600 via-transparent to-transparent opacity-60" />
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-10" />

                    <div className="relative z-10 w-full h-full border-2 border-white/20 rounded-[3rem] p-10 flex flex-col items-center">
                      <div className="flex justify-between items-start w-full mb-12">
                        <div className="size-16 rounded-2xl bg-amber-500 text-[#111827] flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.4)]">
                          <Trophy className="size-10" />
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-400">
                            {editFields.event}
                          </p>
                          <p className="text-xs font-bold text-white/40 uppercase">
                            {editFields.year}
                          </p>
                        </div>
                      </div>

                      <div className="size-48 md:size-64 rounded-full border-[10px] border-white shadow-[0_0_60px_rgba(255,255,255,0.1)] overflow-hidden mb-12 relative group-hover:scale-105 transition-transform duration-700 ring-8 ring-rose-500/20">
                        {studentPhoto ? (
                          <img
                            src={studentPhoto}
                            className="w-full h-full object-cover"
                            alt="Student"
                          />
                        ) : (
                          <div className="w-full h-full bg-white/10 flex items-center justify-center">
                            <User className="size-16 md:size-24" />
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-rose-600 to-transparent opacity-80" />
                      </div>

                      <h2 className="text-6xl font-black tracking-tighter uppercase italic drop-shadow-2xl mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">
                        {editFields.name}
                      </h2>

                      <div className="px-12 py-4 bg-white text-[#111827] rounded-2xl font-black uppercase tracking-[0.4em] text-xs shadow-3xl flex items-center gap-4">
                        <div className="size-2 rounded-full bg-rose-600 animate-ping" />
                        Elite Champion • {editFields.rank}
                      </div>

                      <div className="mt-auto w-full flex justify-between items-center opacity-20 text-[9px] font-black uppercase tracking-[0.5em] border-t border-white/10 pt-8">
                        <span>Physical Excellence</span>
                        <span>{editFields.school}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "topper" && (
                  <div className="h-full bg-[#0F172A] flex flex-col items-center justify-center p-12 text-center text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-900/40 via-transparent to-transparent" />
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />

                    <div className="relative z-10 w-full h-full border border-white/10 rounded-[3.5rem] p-10 flex flex-col items-center justify-center">
                      <div className="inline-flex items-center gap-3 px-8 py-3 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-[0.4em] shadow-[0_20px_40px_rgba(16,185,129,0.3)] mb-12">
                        <Medal className="size-5" /> Academic Titan
                      </div>

                      <div className="size-48 md:size-60 rounded-full border-[16px] border-emerald-500/10 p-2 mb-12">
                        <div className="w-full h-full rounded-full border-[8px] border-white shadow-3xl overflow-hidden ring-[12px] ring-emerald-500/5">
                          {studentPhoto ? (
                            <img
                              src={studentPhoto}
                              className="w-full h-full object-cover"
                              alt="Student"
                            />
                          ) : (
                            <div className="w-full h-full bg-white/5 flex items-center justify-center">
                              <User className="size-16 md:size-24" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h2 className="text-5xl font-black text-white tracking-tighter uppercase leading-none">
                          {editFields.name}
                        </h2>
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-emerald-400 text-lg font-black tracking-[0.5em]">
                            {editFields.percentage}
                          </p>
                          <div className="px-6 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-emerald-200">
                            State Rank {editFields.rank}
                          </div>
                        </div>
                      </div>

                      <div className="mt-12 p-8 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] max-w-[320px]">
                        <p className="text-xs font-medium text-emerald-100/60 leading-relaxed italic">
                          "Excellence is not an act, but a habit. Recognized for
                          the academic cycle {editFields.year}"
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "cultural" && (
                  <div className="h-full bg-[#2E1065] flex flex-col items-center justify-center p-12 text-center text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-600/30 via-transparent to-transparent opacity-60" />
                    <div className="absolute -bottom-20 -left-20 size-80 bg-indigo-500/20 rounded-full blur-[100px]" />

                    <div className="relative z-10 w-full h-full border border-white/10 rounded-[4rem] p-10 flex flex-col items-center justify-center">
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="size-24 rounded-3xl bg-white/10 backdrop-blur-3xl border border-white/20 flex items-center justify-center mb-10 shadow-2xl"
                      >
                        <Mic className="size-12 text-fuchsia-400" />
                      </motion.div>

                      <div className="space-y-4 mb-10">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.8em] text-fuchsia-300">
                          Cultural Prodigy
                        </h4>
                        <h3 className="text-5xl font-black tracking-tighter mb-10 leading-none">
                          THEATRE
                          <br />
                          <span className="text-fuchsia-400">LEGEND</span>
                        </h3>
                      </div>

                      <div className="size-48 md:size-56 rounded-[3rem] border-[12px] border-white shadow-[0_32px_64px_rgba(0,0,0,0.4)] overflow-hidden mb-12 relative -rotate-3 group-hover:rotate-0 transition-transform duration-700 ring-8 ring-fuchsia-500/10">
                        {studentPhoto ? (
                          <img
                            src={studentPhoto}
                            className="w-full h-full object-cover"
                            alt="Student"
                          />
                        ) : (
                          <div className="w-full h-full bg-white/10 flex items-center justify-center">
                            <User className="size-16 md:size-24" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <h2 className="text-4xl font-black text-white tracking-tight">
                          {editFields.name}
                        </h2>
                        <div className="px-8 py-2 bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-[0.4em] shadow-2xl">
                          {editFields.event}
                        </div>
                      </div>

                      <div className="mt-auto opacity-20 text-[9px] font-black uppercase tracking-[0.6em] border-t border-white/10 pt-8 w-full">
                        {editFields.school}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "festival" && (
                  <div className="h-full bg-[#1A1110] flex flex-col items-center justify-center p-12 text-center text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-orange-600/30 via-transparent to-transparent opacity-80" />
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/criss-xcross.png')] opacity-10" />

                    <div className="relative z-10 w-full h-full border border-orange-500/20 rounded-[4rem] p-10 flex flex-col items-center justify-center">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="relative mb-12"
                      >
                        <div className="absolute -inset-10 bg-orange-500/20 rounded-full blur-[40px] animate-pulse" />
                        <Sparkles className="size-20 text-orange-400 relative z-10" />
                      </motion.div>

                      <h3 className="text-5xl font-black text-orange-200 tracking-[0.3em] uppercase mb-12 leading-none">
                        {editFields.festival}
                      </h3>

                      <div className="size-48 md:size-60 rounded-[3rem] border-[16px] border-orange-950 p-3 bg-orange-900/20 mb-12 shadow-[0_0_80px_rgba(234,88,12,0.2)] ring-8 ring-orange-500/10">
                        <div className="w-full h-full rounded-[2rem] border-4 border-orange-400/30 overflow-hidden shadow-inner">
                          {studentPhoto ? (
                            <img
                              src={studentPhoto}
                              className="w-full h-full object-cover"
                              alt="Student"
                            />
                          ) : (
                            <div className="w-full h-full bg-black/40 flex items-center justify-center">
                              <User className="size-16 md:size-24 text-white/20" />
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-2xl font-serif italic text-orange-50/90 leading-relaxed max-w-[340px] mb-12 drop-shadow-lg">
                        "{editFields.message}"
                      </p>

                      <div className="mt-auto opacity-40 text-[10px] font-black uppercase tracking-[0.8em] text-orange-200/60 border-t border-orange-500/10 pt-8 w-full">
                        {editFields.school}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Action Bar Hub */}
            <div className="w-full max-w-xl flex flex-col sm:flex-row items-center gap-4 p-4 bg-white border border-[#E8DFD1] rounded-[2.5rem] shadow-2xl">
              <button
                onClick={() =>
                  toast.success("Opening Digital Asset Gallery...")
                }
                className="w-full sm:flex-1 py-5 bg-[#111827] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-[#D6B97A] transition-all flex items-center justify-center gap-3"
              >
                <Layout className="size-4" /> Full View Studio
              </button>
              <div className="flex gap-4 w-full sm:w-auto">
                <button
                  onClick={() => toast.success("Asset Committed to Database")}
                  className="flex-1 sm:size-16 size-14 bg-[#F8F5EF] text-[#111827] rounded-2xl flex items-center justify-center hover:bg-[#111827] hover:text-white transition-all shadow-sm"
                  title="Save"
                >
                  <Save className="size-6" />
                </button>
                <button
                  onClick={() => toast.success("Asset URL Copied")}
                  className="flex-1 sm:size-16 size-14 bg-[#F8F5EF] text-[#111827] rounded-2xl flex items-center justify-center hover:bg-[#111827] hover:text-white transition-all shadow-sm"
                  title="Share"
                >
                  <Send className="size-6" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AssemblyBookViewer() {
  const [books, setBooks] = useState<any[]>([]);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [bookData, setBookData] = useState<{ type: string; base64: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [lang, setLang] = useState<"en" | "mr">("en");

  useEffect(() => {
    const htmlLang = document.documentElement.lang || "en";
    setLang(htmlLang.startsWith("mr") ? "mr" : "en");
    
    setLoading(true);
    const q = collection(db, "admin_assembly_books");
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setBooks(list);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading assembly books:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSelectBook = async (book: any) => {
    if (selectedBook?.id === book.id) {
      setSelectedBook(null);
      setBookData(null);
      return;
    }

    setSelectedBook(book);
    setBookData(null);

    if (book.url) {
      setBookData({ type: book.type, base64: book.url, name: book.name });
      return;
    }

    if (book.chunks) {
      setLoadingData(true);
      try {
        let fullBase64 = "";
        for (const chunkId of book.chunks) {
          const chunkDoc = await getDoc(doc(db, "admin_assembly_chunks", chunkId));
          if (chunkDoc.exists()) {
            fullBase64 += chunkDoc.data().data;
          }
        }
        setBookData({ type: book.type, base64: fullBase64, name: book.name });
      } catch (err) {
        console.error("Error loading book data:", err);
        toast.error("Failed to load book file data.");
        setSelectedBook(null);
        setBookData(null);
      } finally {
        setLoadingData(false);
      }
    }
  };

  const handleDownload = async (book: any) => {
    if (book.url) {
      const a = document.createElement("a");
      a.href = book.url;
      a.download = book.name;
      a.click();
      return;
    }
    if (book.chunks) {
      setDownloadingId(book.id);
      toast.success("Preparing download, please wait...");
      try {
        let fullBase64 = "";
        for (const chunkId of book.chunks) {
          const chunkDoc = await getDoc(doc(db, "admin_assembly_chunks", chunkId));
          if (chunkDoc.exists()) fullBase64 += chunkDoc.data().data;
        }
        const a = document.createElement("a");
        a.href = fullBase64;
        a.download = book.name;
        a.click();
      } catch (err) {
        console.error("Download error:", err);
        toast.error("Failed to prepare download.");
      } finally {
        setDownloadingId(null);
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Daily Assembly Structured Content at Center */}
      <DailyAssemblyContent />

      {/* Divider */}
      <div className="flex items-center gap-4 py-2">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#D6B97A]/30 to-transparent" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D6B97A]/50">Reference Books</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#D6B97A]/30 to-transparent" />
      </div>

      {loading ? (
        <div className="h-60 flex flex-col items-center justify-center text-slate-400 gap-4">
          <Loader2 className="size-10 text-[#D6B97A] animate-spin" />
          <p className="text-xs font-black uppercase tracking-wider animate-pulse">
            {lang === "en" ? "Loading books..." : "पुस्तके लोड होत आहेत..."}
          </p>
        </div>
      ) : books.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-200/80 rounded-3xl space-y-3 bg-[#FAFAF7] my-4">
          <div className="size-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mx-auto">
            <AlertCircle className="size-6" />
          </div>
          <div className="space-y-1 px-4">
            <h4 className="text-slate-800 font-extrabold text-sm">
              {lang === "en" ? "No daily assembly books uploaded yet." : "कोणतेही परिपाठ पुस्तक अपलोड केलेले नाही."}
            </h4>
            <p className="text-slate-400 text-[10px] font-bold">
              {lang === "en" ? "Please contact the admin to upload guidebooks." : "नवीन पुस्तकांसाठी कृपया प्रशासकांशी संपर्क साधा."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {books.map((book) => {
              const isSelected = selectedBook?.id === book.id;
              return (
                <div
                  key={book.id}
                  className={`p-5 border rounded-2xl flex flex-col justify-between gap-4 transition-all duration-300 ${
                    isSelected
                      ? "bg-[#D6B97A]/5 border-[#D6B97A]/50 shadow-sm"
                      : "bg-[#FAFAF7]/50 border-slate-200/60 hover:shadow-md"
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`size-12 rounded-xl bg-white border flex items-center justify-center flex-shrink-0 ${
                      isSelected ? "text-[#D6B97A] border-[#D6B97A]/30" : "text-slate-400 border-slate-100"
                    }`}>
                      <FileText className="size-6" />
                    </div>
                    <div className="space-y-1 overflow-hidden">
                      <h4 className="font-extrabold text-slate-800 text-xs truncate pr-2" title={book.name}>
                        {book.name}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {book.size}
                        </span>
                        <span>{book.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleSelectBook(book)}
                      disabled={loadingData && !isSelected}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 ${
                        isSelected
                          ? "bg-red-50 hover:bg-red-100 text-red-600 border border-red-100"
                          : "bg-white border border-slate-200 hover:border-[#D6B97A] hover:text-[#D6B97A]"
                      }`}
                    >
                      {loadingData && isSelected ? (
                        <Loader2 className="size-3 animate-spin text-red-600" />
                      ) : (
                        <Eye className="size-3" />
                      )}
                      <span>{isSelected ? (lang === "en" ? "Close" : "बंद करा") : (lang === "en" ? "View" : "पहा")}</span>
                    </button>
                    <button
                      onClick={() => handleDownload(book)}
                      disabled={loadingData}
                      className="flex items-center justify-center gap-1.5 py-2.5 bg-[#1A1A1A] hover:bg-[#D6B97A] text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                    >
                      {downloadingId === book.id ? (
                        <Loader2 className="size-3 animate-spin text-white" />
                      ) : (
                        <Download className="size-3" />
                      )}
                      <span>{lang === "en" ? "Download" : "डाउनलोड"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {selectedBook && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 p-4 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                    <Eye className="size-3.5 text-[#D6B97A] animate-pulse" />
                    <span>{lang === "en" ? "Book Preview:" : "पुस्तक पूर्वावलोकन:"}</span>
                    <span className="text-[#D6B97A] font-black truncate max-w-xs">{selectedBook.name}</span>
                  </h4>
                  <button
                    onClick={() => {
                      setSelectedBook(null);
                      setBookData(null);
                    }}
                    className="px-2 py-0.5 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded text-[9px] font-bold transition-all cursor-pointer"
                  >
                    {lang === "en" ? "Close" : "बंद करा"}
                  </button>
                </div>

                <div className="w-full relative min-h-[300px]">
                  {loadingData ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-[1px] gap-2 rounded-xl z-10">
                      <Loader2 className="size-8 text-[#D6B97A] animate-spin" />
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 animate-pulse">
                        {lang === "en" ? "Loading preview..." : "पूर्वावलोकन लोड होत आहे..."}
                      </p>
                    </div>
                  ) : null}

                  {bookData ? (
                    <div className="w-full flex justify-center">
                      {bookData.type.includes("pdf") ? (
                        <iframe
                          src={bookData.base64}
                          className="w-full h-[600px] border border-slate-200 rounded-2xl bg-white shadow-inner"
                          title={bookData.name}
                          allowFullScreen
                        />
                      ) : (
                        <img
                          src={bookData.base64}
                          alt={bookData.name}
                          className="w-full max-w-full h-auto border border-slate-200 rounded-2xl bg-white p-1.5 shadow-sm"
                        />
                      )}
                    </div>
                  ) : (
                    !loadingData && (
                      <div className="flex flex-col items-center justify-center h-60 text-slate-400 bg-white border border-slate-100 rounded-2xl">
                        <AlertCircle className="size-6 mb-1" />
                        <span className="text-[10px] font-bold">{lang === "en" ? "No Preview Available" : "पूर्वावलोकन उपलब्ध नाही"}</span>
                      </div>
                    )
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DailyAssemblyContent — Full Paripath / परीपाठ Structured View
   ═══════════════════════════════════════════════════════════════ */
function DailyAssemblyContent() {
  const [lang, setLang] = useState<"mr" | "en" | "hi">("mr");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [dbFormData, setDbFormData] = useState<any>(null);

  useEffect(() => {
    // Fetch live parapith data from Firestore
    const fetchParipath = async () => {
      try {
        const docRef = doc(db, "admin_daily_paripath", "current");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setDbFormData(docSnap.data());
        }
      } catch (err) {
        console.error("Error fetching live paripath data:", err);
      }
    };
    fetchParipath();
  }, []);

  const t = ASSEMBLY_TRANSLATIONS[lang];
  // Use DB data for Marathi if available, else fallback to defaults
  const formData = (lang === "mr" && dbFormData) ? dbFormData : DEFAULT_FORM_DATA[lang];
  const assemblyItems = DEFAULT_ASSEMBLY_ITEMS[lang];

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const SectionCard = ({ id, emoji, title, icon: Icon, gradient, children }: {
    id: string;
    emoji: string;
    title: string;
    icon: any;
    gradient: string;
    children: React.ReactNode;
  }) => {
    const isExpanded = expandedSections[id] !== false; // default expanded
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/90 backdrop-blur-xl border border-[#E8DFD1]/40 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-lg transition-all duration-500"
      >
        <button
          onClick={() => toggleSection(id)}
          className={`w-full flex items-center justify-between p-5 md:p-6 bg-gradient-to-r ${gradient} cursor-pointer group`}
        >
          <div className="flex items-center gap-3 md:gap-4">
            <div className="size-10 md:size-12 rounded-2xl bg-white/80 backdrop-blur-sm flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-transform duration-300">
              {emoji}
            </div>
            <div className="text-left">
              <h3 className="text-sm md:text-base font-black text-[#1A1A1A] tracking-tight">
                {title}
              </h3>
            </div>
          </div>
          <div className="size-8 rounded-full bg-white/50 flex items-center justify-center text-[#D6B97A]">
            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </div>
        </button>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="p-5 md:p-6 border-t border-[#E8DFD1]/30">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Language Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-[#1A1A1A] to-[#2D2D2D] rounded-[2rem] shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-[#D6B97A] flex items-center justify-center text-white shadow-lg">
            <BookMarked className="size-6" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-black text-white tracking-tight">
              {lang === "mr" ? "दैनिक परीपाठ" : lang === "hi" ? "दैनिक प्रार्थना सभा" : "Daily Assembly"}
            </h2>
            <p className="text-[10px] font-bold text-[#D6B97A] uppercase tracking-[0.3em] mt-0.5">
              {lang === "mr" ? "आजचा परिपाठ" : lang === "hi" ? "आज की सभा" : "Today's Assembly"}
            </p>
          </div>
        </div>
        <div className="flex bg-white/10 p-1.5 rounded-2xl border border-white/10">
          {(["mr", "en", "hi"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${
                lang === l
                  ? "bg-[#D6B97A] text-white shadow-lg"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {l === "mr" ? "मराठी" : l === "hi" ? "हिंदी" : "English"}
            </button>
          ))}
        </div>
      </div>

      {/* Assembly Start Items (Anthem, State Song, Pledge, Preamble, Prayer) */}
      <SectionCard
        id="assembly-start"
        emoji="🇮🇳"
        title={t.assemblyStart}
        icon={Flag}
        gradient="from-orange-50/80 via-white/60 to-green-50/80"
      >
        <div className="space-y-6">
          {[
            { key: 'nationalAnthem', fallbackIdx: 0 },
            { key: 'stateAnthem', fallbackIdx: 1 },
            { key: 'pledge', fallbackIdx: 2 },
            { key: 'preamble', fallbackIdx: 3 },
            { key: 'prayer', fallbackIdx: 4 },
          ].map((itemDef, idx) => {
            const fallbackItem = assemblyItems[itemDef.fallbackIdx];
            const content = formData[itemDef.key] || fallbackItem.content;
            
            return (
              <div key={idx} className="bg-[#FAFAF7] border border-[#E8DFD1]/30 rounded-2xl p-6 md:p-8 shadow-sm">
                <div className="flex flex-col items-center justify-center gap-2 mb-6 border-b border-[#E8DFD1]/40 pb-4">
                  <span className="text-3xl mb-1">{fallbackItem.emoji}</span>
                  <h4 className="font-black text-xl text-[#1A1A1A] text-center uppercase tracking-wider">{fallbackItem.label}</h4>
                  <span className="text-[10px] font-black text-[#D6B97A]/80 uppercase tracking-widest text-center">{fallbackItem.sub}</span>
                </div>
                <pre className="whitespace-pre-wrap text-base md:text-lg text-[#1A1A1A] font-bold leading-relaxed font-sans text-center">
                  {content}
                </pre>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Panchang */}
      <SectionCard
        id="panchang"
        emoji="🪀"
        title={t.panchang}
        icon={Calendar}
        gradient="from-amber-50/80 to-orange-50/60"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t.day, value: formData.day, icon: Calendar },
            { label: t.month, value: formData.month, icon: Clock },
            { label: t.paksha, value: formData.paksha, icon: Star },
            { label: t.tithi, value: formData.tithi, icon: Star },
            { label: t.nakshatra, value: formData.nakshatra, icon: Sparkles },
            { label: t.yog, value: formData.yog, icon: Sparkles },
            { label: t.sunrise, value: formData.sunrise, icon: Sunrise },
            { label: t.sunset, value: formData.sunset, icon: Sunset },
          ].map((item, i) => (
            <div
              key={i}
              className="p-3 md:p-4 bg-gradient-to-br from-white to-amber-50/30 border border-amber-100/50 rounded-2xl text-center hover:shadow-md transition-all duration-300"
            >
              <item.icon className="size-4 text-[#D6B97A] mx-auto mb-1.5" />
              <div className="text-[9px] font-black text-[#D6B97A]/60 uppercase tracking-wider mb-1">
                {item.label}
              </div>
              <div className="text-sm font-bold text-[#1A1A1A]">{item.value}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Suvichar */}
      <SectionCard
        id="thought"
        emoji="🪀"
        title={t.thought}
        icon={Quote}
        gradient="from-violet-50/80 to-purple-50/60"
      >
        <div className="p-6 md:p-8 bg-gradient-to-br from-violet-50/50 to-purple-50/30 border border-violet-100/40 rounded-3xl flex flex-col items-center justify-center text-center">
          <Quote className="size-8 text-violet-400/80 mb-4" />
          <p className="text-lg md:text-2xl font-black text-[#1A1A1A] leading-relaxed italic">
            {formData.thought}
          </p>
        </div>
      </SectionCard>

      {/* M'han & Arth */}
      <SectionCard
        id="proverb"
        emoji="🪀"
        title={t.proverbTitle}
        icon={BookOpen}
        gradient="from-teal-50/80 to-emerald-50/60"
      >
        <div className="space-y-4">
          <div className="p-6 bg-gradient-to-br from-teal-50/50 to-emerald-50/30 border border-teal-100/40 rounded-3xl text-center">
            <div className="text-[10px] font-black text-teal-600/80 uppercase tracking-widest mb-3">{t.proverb}</div>
            <p className="text-lg md:text-2xl font-black text-[#1A1A1A]">{formData.proverb}</p>
          </div>
          <div className="p-6 bg-white border border-[#E8DFD1]/30 rounded-3xl text-center">
            <div className="text-[10px] font-black text-[#D6B97A]/80 uppercase tracking-widest mb-3">{t.proverbMeaning}</div>
            <p className="text-base md:text-lg font-bold text-[#333] leading-relaxed">{formData.proverbMeaning}</p>
          </div>
        </div>
      </SectionCard>

      {/* Dinvishesh */}
      <SectionCard
        id="events"
        emoji="🪀"
        title={`${formData.dateMonth} ${t.eventsTitle}`}
        icon={Calendar}
        gradient="from-blue-50/80 to-indigo-50/60"
      >
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-blue-50 border border-blue-100/50 rounded-full">
              <Calendar className="size-4 text-blue-500" />
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                {t.yearDayStr.replace("${yearDay}", formData.yearDay)}
              </span>
            </div>
          </div>

          {/* Important Events */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-blue-600/80 uppercase tracking-widest flex items-center justify-center gap-2 text-center">
              <Star className="size-4" /> {t.importantEvents}
            </h4>
            <div className="space-y-2">
              {formData.events.split("\n").map((event: string, i: number) => (
                <div key={i} className="flex flex-col items-center justify-center p-4 bg-blue-50/40 border border-blue-100/50 rounded-2xl text-center shadow-sm">
                  <span className="text-base md:text-lg font-bold text-[#1A1A1A] leading-relaxed">{event}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Birthdays */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-emerald-600/80 uppercase tracking-widest flex items-center justify-center gap-2 text-center mt-6">
              <Gift className="size-4" /> {t.birthdays}
            </h4>
            <div className="space-y-2">
              {formData.birthdays.split("\n").map((b: string, i: number) => (
                <div key={i} className="flex flex-col items-center justify-center p-4 bg-emerald-50/40 border border-emerald-100/50 rounded-2xl text-center shadow-sm">
                  <span className="text-base md:text-lg font-bold text-[#1A1A1A] leading-relaxed">{b}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Deaths */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-rose-600/80 uppercase tracking-widest flex items-center justify-center gap-2 text-center mt-6">
              <Star className="size-4" /> {t.deaths}
            </h4>
            <div className="space-y-2">
              {formData.deaths.split("\n").map((d: string, i: number) => (
                <div key={i} className="flex flex-col items-center justify-center p-4 bg-rose-50/40 border border-rose-100/50 rounded-2xl text-center shadow-sm">
                  <span className="text-base md:text-lg font-bold text-[#1A1A1A] leading-relaxed">{d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Patriotic Song */}
      <SectionCard
        id="song"
        emoji="🪀"
        title={t.patrioticSongTitle}
        icon={Music}
        gradient="from-orange-50/80 to-amber-50/60"
      >
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-orange-50 border border-orange-100/50 rounded-full">
              <Music className="size-5 text-orange-500" />
              <span className="text-base font-black text-orange-700 uppercase tracking-widest">{formData.songTitle}</span>
            </div>
          </div>
          <div className="p-6 md:p-10 bg-gradient-to-br from-orange-50/40 to-amber-50/30 border border-orange-100/30 rounded-[2rem] text-center shadow-sm">
            <pre className="whitespace-pre-wrap text-base md:text-xl font-bold text-[#1A1A1A] leading-relaxed font-sans">
              {formData.patrioticSong}
            </pre>
          </div>
        </div>
      </SectionCard>

      {/* Moral Story */}
      <SectionCard
        id="story"
        emoji="🪀"
        title={t.storyTitle}
        icon={BookOpen}
        gradient="from-indigo-50/80 to-blue-50/60"
      >
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-indigo-50 border border-indigo-100/50 rounded-full">
              <BookOpen className="size-5 text-indigo-500" />
              <span className="text-base font-black text-indigo-700 uppercase tracking-widest">{formData.storyTitle}</span>
            </div>
          </div>
          <div className="p-6 md:p-10 bg-gradient-to-br from-indigo-50/30 to-blue-50/20 border border-indigo-100/30 rounded-[2rem] text-center shadow-sm">
            <p className="text-base md:text-xl font-bold text-[#1A1A1A] leading-relaxed whitespace-pre-wrap">
              {formData.story}
            </p>
          </div>
          <div className="p-6 bg-amber-50/50 border border-amber-200/40 rounded-[2rem] flex flex-col items-center text-center gap-3 shadow-sm">
            <Star className="size-8 text-amber-500" />
            <div>
              <div className="text-[10px] font-black text-amber-600/80 uppercase tracking-widest mb-2">{t.moral}</div>
              <p className="text-lg md:text-xl font-black text-amber-900 leading-relaxed">{formData.moral}</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* General Knowledge */}
      <SectionCard
        id="gk"
        emoji="🪀"
        title={t.gkTitle}
        icon={HelpCircle}
        gradient="from-cyan-50/80 to-teal-50/60"
      >
        <div className="flex flex-col gap-6">
          {[
            { q: formData.gkQ1, a: formData.gkA1, label: t.q1, aLabel: t.a1 },
            { q: formData.gkQ2, a: formData.gkA2, label: t.q2, aLabel: t.a2 },
            { q: formData.gkQ3, a: formData.gkA3, label: t.q3, aLabel: t.a3 },
            { q: formData.gkQ4, a: formData.gkA4, label: t.q4, aLabel: t.a4 },
          ].map((item, i) => (
            <div
              key={i}
              className="p-6 md:p-8 bg-gradient-to-br from-white to-cyan-50/30 border border-cyan-100/40 rounded-[2rem] hover:shadow-md transition-all duration-300 text-center flex flex-col items-center justify-center shadow-sm"
            >
              <HelpCircle className="size-8 text-cyan-500 mb-4" />
              <p className="text-lg md:text-xl font-black text-[#1A1A1A] mb-5">{item.q}</p>
              <div className="px-6 py-3 bg-cyan-50 border border-cyan-100/50 rounded-2xl inline-block">
                <span className="text-[10px] font-black text-cyan-600/80 uppercase tracking-widest mr-2">{t.ans} : </span>
                <span className="text-base md:text-lg font-black text-cyan-800">{item.a}</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Personality */}
      <SectionCard
        id="personality"
        emoji="🪀"
        title={t.personalityTitle}
        icon={User}
        gradient="from-rose-50/80 to-pink-50/60"
      >
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-rose-50 border border-rose-100/50 rounded-full">
              <User className="size-5 text-rose-500" />
              <span className="text-base font-black text-rose-700 uppercase tracking-widest">{formData.personalityTitle}</span>
            </div>
          </div>
          <div className="p-6 md:p-10 bg-gradient-to-br from-rose-50/30 to-pink-50/20 border border-rose-100/30 rounded-[2rem] text-center shadow-sm">
            <p className="text-base md:text-xl font-bold text-[#1A1A1A] leading-relaxed whitespace-pre-wrap">
              {formData.personality}
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function SpecialDayEditor({
  data,
  onChange,
  loading,
  moduleId,
}: {
  data: any;
  onChange: (val: any) => void;
  loading: boolean;
  moduleId: string;
}) {
  const [activeSection, setActiveSection] = useState("thought");
  const [isGenerating, setIsGenerating] = useState(false);
  const [lang, setLang] = useState<"en" | "mr">("en");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const safeData =
    typeof data === "object" && data !== null
      ? data
      : {
        thought: { en: "", mr: "" },
        story: { en: "", mr: "" },
        joke: { en: "", mr: "" },
        news: { en: "", mr: "" },
        significance: { en: "", mr: "" },
      };

  const updateField = (field: string, value: string) => {
    const updated = { ...safeData };
    if (!updated[field]) updated[field] = { en: "", mr: "" };
    updated[field][lang] = value;
    onChange(updated);
  };

  const generateSection = (key: string) => {
    setIsGenerating(true);
    setTimeout(() => {
      const now = new Date();
      const daySeed =
        now.getDate() + now.getMonth() * 31 + now.getFullYear() * 366;

      let libKey = key;
      if (key === "thought") libKey = "thoughts";
      if (key === "story") libKey = "stories";
      if (key === "joke") libKey = "jokes";

      const pool = DAILY_INTELLIGENCE_LIBRARY[libKey];
      if (pool && pool.length > 0) {
        const updated = { ...safeData };
        updated[key] = pool[daySeed % pool.length];
        onChange(updated);
        toast.success(
          `${key.charAt(0).toUpperCase() + key.slice(1)} synchronized!`,
        );
      }
      setIsGenerating(false);
    }, 800);
  };

  const autoFillIntelligence = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const now = new Date();
      const daySeed =
        now.getDate() + now.getMonth() * 31 + now.getFullYear() * 366;

      const updated: any = {};
      ["thought", "story", "significance", "news", "joke"].forEach((key) => {
        let libKey = key;
        if (key === "thought") libKey = "thoughts";
        if (key === "story") libKey = "stories";
        if (key === "joke") libKey = "jokes";

        const pool = DAILY_INTELLIGENCE_LIBRARY[libKey];
        if (pool && pool.length > 0) {
          updated[key] = pool[daySeed % pool.length];
        }
      });
      onChange(updated);
      setIsGenerating(false);
      toast.success("Daily Intelligence Synchronized!");
    }, 1500);
  };

  // Improved Empty Check for Bilingual Objects
  useEffect(() => {
    if (loading) return; // Wait for Firebase load

    const isActuallyEmpty = (field: any) => {
      if (!field) return true;
      if (typeof field === "string") return !field;
      if (typeof field === "object") return !field.en && !field.mr;
      return true;
    };

    const isEmpty =
      isActuallyEmpty(safeData.thought) &&
      isActuallyEmpty(safeData.story) &&
      isActuallyEmpty(safeData.joke) &&
      isActuallyEmpty(safeData.news) &&
      isActuallyEmpty(safeData.significance);

    if (isEmpty) {
      autoFillIntelligence();
    }
  }, [loading, moduleId]); // Re-run when moduleId changes or loading finishes

  const sections = [
    {
      id: "thought",
      label: "Thought of the Day",
      sub: "Suvichar",
      icon: Sparkles,
      color: "text-amber-500",
      bg: "bg-amber-50",
      gradient: "from-amber-50 to-white",
    },
    {
      id: "story",
      label: "Motivational Story",
      sub: "Daily Inspiration",
      icon: BookOpen,
      color: "text-indigo-500",
      bg: "bg-indigo-50",
      gradient: "from-indigo-50 to-white",
    },
    {
      id: "significance",
      label: "Dinvishesh",
      sub: "Historical Significance",
      icon: Star,
      color: "text-rose-500",
      bg: "bg-rose-50",
      gradient: "from-rose-50 to-white",
    },
    {
      id: "news",
      label: "Today's News",
      sub: "Important Updates",
      icon: FileText,
      color: "text-teal-500",
      bg: "bg-teal-50",
      gradient: "from-teal-50 to-white",
    },
    {
      id: "joke",
      label: "Joke of the Day",
      sub: "Morning Humor",
      icon: Mic,
      color: "text-emerald-500",
      bg: "bg-emerald-50",
      gradient: "from-emerald-50 to-white",
    },
    {
      id: "daily-assembly",
      label: lang === "en" ? "Daily Assembly" : "दैनिक परीपाठ",
      sub: lang === "en" ? "Full Paripath" : "संपूर्ण परिपाठ",
      icon: BookMarked,
      color: "text-orange-500",
      bg: "bg-orange-50",
      gradient: "from-orange-50 to-white",
    },
    {
      id: "assembly-book",
      label: lang === "en" ? "Assembly Book" : "परिपाठ पुस्तक",
      sub: lang === "en" ? "Reference Guide" : "मार्गदर्शिका",
      icon: BookOpen,
      color: "text-blue-500",
      bg: "bg-blue-50",
      gradient: "from-blue-50 to-white",
    },
  ];

  const current = sections.find((s) => s.id === activeSection) || sections[0];

  return (
    <div className="flex flex-col lg:flex-row gap-12 min-h-[700px]">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-96 flex flex-col gap-4">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`p-8 rounded-[3rem] text-left transition-all duration-700 flex items-center gap-6 border-2 relative overflow-hidden group ${activeSection === s.id
                ? "bg-white border-[#D6B97A] shadow-[0_32px_64px_-16px_rgba(214,185,122,0.2)] scale-[1.05]"
                : "bg-white/40 border-transparent hover:bg-white hover:border-[#E8DFD1]"
              }`}
          >
            <div
              className={`size-14 rounded-2xl ${activeSection === s.id ? "bg-[#D6B97A] text-white" : "bg-[#F8F5EF] text-[#D6B97A]"} flex items-center justify-center shadow-sm group-hover:rotate-12 transition-transform duration-500`}
            >
              <s.icon className="size-7" />
            </div>
            <div>
              <p
                className={`text-[11px] font-black uppercase tracking-[0.3em] ${activeSection === s.id ? "text-[#1A1A1A]" : "text-[#D6B97A]/60"}`}
              >
                {s.label}
              </p>
              <p className="text-[10px] font-bold text-[#D6B97A]/40 uppercase tracking-tighter mt-1">
                {s.sub}
              </p>
            </div>
            {activeSection === s.id && (
              <motion.div
                layoutId="active-indicator"
                className="absolute right-6 size-2.5 rounded-full bg-[#D6B97A] shadow-[0_0_15px_#D6B97A]"
              />
            )}
          </button>
        ))}
      </aside>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        <motion.main
          key={activeSection}
          initial={{ opacity: 0, x: 40, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -40, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className="flex-1 bg-white/60 backdrop-blur-3xl rounded-[4rem] border border-white shadow-2xl overflow-hidden flex flex-col relative z-10"
        >
          <header
            className={`p-12 bg-gradient-to-br ${current.gradient} border-b border-[#E8DFD1]/30 flex flex-col xl:flex-row xl:items-center justify-between gap-8`}
          >
            <div className="flex items-center gap-8">
              <motion.div
                layoutId={`icon-${current.id}`}
                className={`size-20 rounded-[2.5rem] bg-[#1A1A1A] text-[#D6B97A] flex items-center justify-center shadow-2xl ring-8 ring-white/50`}
              >
                <current.icon className="size-10" />
              </motion.div>
              <div>
                <h3 className="text-3xl font-black text-[#1A1A1A] tracking-tight">
                  {current.label}
                </h3>
                <p className="text-[11px] font-black text-[#D6B97A] uppercase tracking-[0.4em] mt-2">
                  {current.sub}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-6">
              <div className="flex bg-[#F8F5EF] p-2 rounded-[2rem] border border-[#E8DFD1]/50 shadow-inner">
                <button
                  onClick={() => setLang("en")}
                  className={`px-8 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${lang === "en" ? "bg-white text-[#D6B97A] shadow-md" : "text-[#D6B97A]/40 hover:text-[#D6B97A]"}`}
                >
                  English
                </button>
                <button
                  onClick={() => setLang("mr")}
                  className={`px-8 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${lang === "mr" ? "bg-white text-[#D6B97A] shadow-md" : "text-[#D6B97A]/40 hover:text-[#D6B97A]"}`}
                >
                  Marathi
                </button>
              </div>

              <div className="flex items-center gap-4 px-6 py-4 bg-white/60 backdrop-blur-xl rounded-[2rem] border border-white text-[10px] font-black uppercase tracking-[0.3em] text-[#D6B97A] shadow-sm">
                <Calendar className="size-4" />
                {currentTime.toLocaleDateString("en-US", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
                <div className="w-[1px] h-4 bg-[#E8DFD1] mx-2" />
                <Clock className="size-4" />
                {currentTime.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </header>

          <div className="flex-1 p-12 space-y-8">
            {activeSection === "daily-assembly" ? (
              <DailyAssemblyContent />
            ) : activeSection === "assembly-book" ? (
              <AssemblyBookViewer />
            ) : (
              <>
                <div className="flex items-center justify-between px-8 py-5 bg-[#FAFAF7] border border-[#E8DFD1]/40 rounded-[2.5rem] shadow-sm">
                  <div className="flex items-center gap-5">
                    <button
                      onClick={() => generateSection(activeSection)}
                      disabled={isGenerating}
                      className="flex items-center gap-3 px-8 py-4 bg-[#1A1A1A] text-[#F8F5EF] text-[10px] font-black uppercase tracking-[0.2em] rounded-[1.5rem] hover:bg-[#D6B97A] hover:text-white transition-all duration-500 shadow-xl disabled:opacity-50"
                    >
                      <Sparkles className="size-4" />
                      {isGenerating ? "Curating..." : "AI Oracle"}
                    </button>
                    <button
                      onClick={() =>
                        (
                          document.querySelector("textarea") as HTMLTextAreaElement
                        )?.focus()
                      }
                      className="flex items-center gap-3 px-8 py-4 bg-white border border-[#E8DFD1]/50 text-[#D6B97A] text-[10px] font-black uppercase tracking-[0.2em] rounded-[1.5rem] hover:border-[#D6B97A] transition-all duration-500 shadow-sm"
                    >
                      <Edit3 className="size-4" />
                      Manual Scroll
                    </button>
                  </div>
                  <button
                    onClick={() => updateField(activeSection, "")}
                    className="flex items-center gap-2 px-6 py-3 text-[#D6B97A]/40 hover:text-rose-500 text-[10px] font-black uppercase tracking-widest transition-all duration-500"
                  >
                    Purge Content
                  </button>
                </div>

            <div className="relative group flex-1 flex flex-col">
              <div className="absolute -top-4 left-10 px-5 py-2 bg-[#1A1A1A] text-white rounded-full text-[9px] font-black uppercase tracking-[0.4em] z-10 shadow-xl">
                {lang === "en" ? "Anglicized Manuscript" : "Vedic Manuscript"}
              </div>
              <textarea
                className={`w-full flex-1 p-8 md:p-12 bg-white/40 border-2 border-transparent focus:border-[#D6B97A]/30 rounded-[2.5rem] md:rounded-[3.5rem] outline-none focus:bg-white transition-all text-xl md:text-2xl text-[#1A1A1A] font-medium leading-relaxed resize-none shadow-inner ${isGenerating ? "animate-pulse opacity-50" : ""}`}
                placeholder={
                  isGenerating
                    ? "Transcribing universal knowledge..."
                    : `Document your daily ${current.label.toLowerCase()} in ${lang === "en" ? "English" : "Marathi"}...`
                }
                value={safeData[activeSection]?.[lang] || ""}
                onChange={(e) => updateField(activeSection, e.target.value)}
                disabled={isGenerating}
              ></textarea>
              {isGenerating && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="flex flex-col items-center gap-6">
                    <div className="size-20 rounded-full border-4 border-[#D6B97A]/20 border-t-[#D6B97A] animate-spin" />
                    <span className="text-[11px] font-black uppercase tracking-[0.4em] text-[#D6B97A] animate-pulse">
                      Synchronizing Intelligence
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={autoFillIntelligence}
                className="group flex items-center gap-4 px-10 py-5 bg-[#F8F5EF] text-[#D6B97A] text-[10px] font-black uppercase tracking-[0.3em] rounded-[2rem] border border-[#D6B97A]/30 hover:bg-[#D6B97A] hover:text-white transition-all duration-700 shadow-lg"
              >
                <div className="size-8 rounded-xl bg-white group-hover:bg-[#1A1A1A] flex items-center justify-center shadow-sm transition-colors">
                  <Sparkles className="size-4" />
                </div>
                Global Intelligence Sync
              </button>
            </div>
          </>
        )}
          </div>
        </motion.main>
      </AnimatePresence>
    </div>
  );
}

const DAILY_INTELLIGENCE_LIBRARY: any = {
  thoughts: [
    {
      en: "The beautiful thing about learning is that no one can take it away from you. This profound insight by B.B. King reminds us that education is a permanent asset that empowers individuals beyond physical boundaries. Every piece of knowledge you acquire builds a foundation for a future where you are the master of your own destiny.",
      mr: "शिकण्याचे सर्वात सुंदर वैशिष्ट्य म्हणजे ते तुमच्याकडून कोणीही हिरावून घेऊ शकत नाही. बी.बी. किंग यांचे हे सखोल विचार आपल्याला आठवण करून देतात की शिक्षण ही एक कायमस्वरूपी संपत्ती आहे जी व्यक्तीला भौतिक सीमांच्या पलीकडे सक्षम करते. तुम्ही मिळवलेले ज्ञानाचे प्रत्येक कण अशा भविष्याचा पाया रचतात जिथे तुम्ही स्वतःच्या नशिबाचे स्वामी असाल.",
    },
    {
      en: "Education is the most powerful weapon which you can use to change the world. Nelson Mandela's words emphasize that learning is not just about personal growth but about societal transformation. By equipping ourselves with knowledge, we gain the strategic capability to address global challenges and build a more equitable and just society for everyone.",
      mr: "शिक्षण हे जगाला बदलण्यासाठी वापरले जाणारे सर्वात शक्तिशाली शस्त्र आहे. नेल्सन मंडेला यांचे शब्द यावर भर देतात की शिकणे हे केवळ वैयक्तिक वाढीसाठी नाही तर सामाजिक परिवर्तनासाठी आहे. स्वतःला ज्ञानाने सुसज्ज करून, आपण जागतिक आव्हानांना सामोरे जाण्याची आणि सर्वांसाठी अधिक न्याय्य समाज घडवण्याची धोरणात्मक क्षमता प्राप्त करतो.",
    },
    {
      en: "Don't let what you cannot do interfere with what you can do. This guidance from John Wooden encourages us to focus our energy on our strengths and possibilities rather than our limitations. Success is often the result of maximizing our current potential while steadily working towards overcoming our obstacles with persistence and a positive mindset.",
      mr: "तुम्ही जे करू शकत नाही, ते तुम्ही जे करू शकता त्यात अडथळा आणू देऊ नका. जॉन वूडन यांचे हे मार्गदर्शन आपल्याला आपल्या मर्यादांऐवजी आपली ताकद आणि शक्यतांवर लक्ष केंद्रित करण्यास प्रोत्साहित करते. यश हे बऱ्याचदा आपल्या वर्तमान क्षमतेचा जास्तीत जास्त वापर करण्याचे आणि सकारात्मक विचारसरणीने आपल्या अडथळ्यांवर मात करण्याचे फळ असते.",
    },
    {
      en: "A person who never made a mistake never tried anything new. Albert Einstein's perspective validates the necessity of failure in the journey of innovation. Mistakes are not setbacks but essential stepping stones that provide critical insights, helping us refine our approach and eventually achieve breakthroughs that were previously unimaginable.",
      mr: "ज्या व्यक्तीने कधीच चूक केली नाही, त्याने कधीच काही नवीन करण्याचा प्रयत्न केला नाही. अल्बर्ट आइनस्टाइन यांचा दृष्टीकोन नाविन्यपूर्ण प्रवासात अपयशाची गरज अधोरेखित करतो. चुका या माघार नसून त्या महत्त्वाच्या पायऱ्या आहेत ज्या आपल्याला धडे देतात, आपली पद्धत सुधारण्यास मदत करतात आणि शेवटी अशक्य वाटणारी प्रगती साध्य करण्यास मदत करतात.",
    },
  ],
  stories: [
    {
      en: "The Elephant Rope: A traveler noticed that giant elephants were held by only a small rope tied to their front leg. They didn't try to break free because, as calves, they were conditioned to believe the rope was strong enough to hold them. This story teaches us that our limitations are often mental barriers created by past experiences, and we must break free from these self-imposed beliefs to realize our true potential.",
      mr: "हत्तीची दोरी: एका प्रवाशाला दिसले की महाकाय हत्तींना त्यांच्या पुढच्या पायाला बांधलेल्या एका लहानशा दोरीने रोखून धरले होते. ते मुक्त होण्याचा प्रयत्न करत नव्हते कारण, लहान असताना त्यांना असे वाटायचे की ती दोरी त्यांना रोखण्यासाठी पुरेशी मजबूत आहे. ही गोष्ट आपल्याला शिकवते की आपल्या मर्यादा बऱ्याचदा भूतकाळातील अनुभवांनी तयार केलेले मानसिक अडथळे असतात आणि आपली खरी क्षमता ओळखण्यासाठी आपण या स्वतःहून लादलेल्या विश्वासातून मुक्त झाले पाहिजे.",
    },
    {
      en: "The Starfish Thrower: An old man saw a boy throwing starfish back into the ocean after a storm. When asked why he bothered since there were thousands, the boy picked one up, threw it back, and said, 'It made a difference to that one.' This narrative reminds us that while we cannot solve every problem in the world, every small act of kindness we perform has a profound and lasting impact on the individuals we help.",
      mr: "स्टारफिश फेकणारा मुलगा: एका वृद्ध माणसाने एका मुलाला वादळानंतर समुद्राच्या किनाऱ्यावर पडलेले स्टारफिश पुन्हा समुद्रात फेकताना पाहिले. जेव्हा त्याला विचारले गेले की हजारो स्टारफिश असताना तो हा त्रास का घेत आहे, तेव्हा त्या मुलाने एक स्टारफिश उचलला, तो समुद्रात फेकला आणि म्हणाला, 'या एकासाठी तरी फरक पडला.' ही गोष्ट आपल्याला आठवण करून देते की आपण जगातील प्रत्येक समस्या सोडू शकत नसलो तरी, आपण केलेली प्रत्येक छोटी दयाळू कृती आपण मदत केलेल्या व्यक्तीवर खोल आणि कायमस्वरूपी प्रभाव पाडते.",
    },
  ],
  significance: [
    {
      en: "National Science Day: Commemorated to honor the discovery of the Raman Effect by Indian physicist Sir C.V. Raman. This day serves as a critical reminder of the importance of scientific inquiry and rational thinking in our daily lives. It encourages students to explore the wonders of the physical world and pursue careers in research and technology to contribute to global progress.",
      mr: "राष्ट्रीय विज्ञान दिन: भारतीय भौतिकशास्त्रज्ञ सर सी.व्ही. रमण यांनी शोधलेल्या 'रमण इफेक्ट'च्या सन्मानार्थ हा दिवस साजरा केला जातो. हा दिवस आपल्या दैनंदिन जीवनातील वैज्ञानिक चौकस बुद्धी आणि तर्कसंगत विचारांच्या महत्त्वाची आठवण करून देतो. हे विद्यार्थ्यांना भौतिक जगाचे चमत्कार शोधण्यासाठी आणि जागतिक प्रगतीमध्ये योगदान देण्यासाठी संशोधन आणि तंत्रज्ञानामध्ये करिअर करण्यासाठी प्रोत्साहित करते.",
    },
    {
      en: "World Environment Day: A global platform for inspiring positive change in the protection of our planet's ecosystems. It highlights the urgent need to address climate change, deforestation, and pollution through collective action. Students play a pivotal role as future stewards of the earth, and this day empowers them to adopt sustainable habits and advocate for a greener, healthier future for all living beings.",
      mr: "जागतिक पर्यावरण दिन: आपल्या ग्रहाच्या परिसंस्थेच्या संरक्षणासाठी सकारात्मक बदल घडवून आणण्यासाठी हे एक जागतिक व्यासपीठ आहे. हे हवामान बदल, जंगलतोड आणि प्रदूषण यांसारख्या समस्यांवर एकत्रित कृतीद्वारे मात करण्याची निकड अधोरेखित करते. पृथ्वीचे भावी रक्षक म्हणून विद्यार्थी महत्त्वाची भूमिका बजावतात आणि हा दिवस त्यांना शाश्वत सवयी स्वीकारण्यास आणि सर्वांसाठी हिरव्यागार भविष्याचा पुरस्कार करण्यास सक्षम करतो.",
    },
  ],
  jokes: [
    {
      en: "Why did the teacher wear sunglasses in the classroom today? Because she said her students were so bright that they were literally dazzling! It's a humorous way to acknowledge the exceptional potential and intellectual brilliance that each student brings to the learning environment, encouraging them to keep shining in their academic pursuits.",
      mr: "आज वर्गात शिक्षकाने गॉगल का लावला होता? कारण ती म्हणाली की तिचे विद्यार्थी इतके तेजस्वी (ब्राइट) होते की ते अक्षरशः डोळे दिपवून टाकत होते! हा एक विनोदी मार्ग आहे ज्याद्वारे प्रत्येक विद्यार्थी शैक्षणिक वातावरणात आणत असलेल्या विलक्षण क्षमता आणि बौद्धिक तेजाची प्रशंसा केली जाते, त्यांना त्यांच्या अभ्यासात चमकत राहण्यास प्रोत्साहित केले जाते.",
    },
    {
      en: "Why was the math book looking so incredibly sad and overwhelmed? Because it had way too many complex problems to solve all at once! This joke lightens the mood around a challenging subject like mathematics, reminding us that even though problems can seem daunting, they can be tackled one step at a time with patience, practice, and a bit of humor to keep us going.",
      mr: "गणिताचे पुस्तक इतके प्रचंड दुःखी आणि हतबल का दिसत होते? कारण त्याच्याकडे एकाच वेळी सोडवण्यासाठी खूप जास्त जटिल समस्या (प्रॉब्लेम्स) होत्या! हा विनोद गणित या आव्हानात्मक विषयाबद्दलची भीती कमी करतो आणि आपल्याला आठवण करून देतो की समस्या कितीही कठीण वाटल्या तरी, संयम, सराव आणि थोड्या विनोदाने त्या एका वेळी एक अशा सोडवल्या जाऊ शकतात.",
    },
  ],
  news: [
    {
      en: "The school is proud to announce the launch of a new state-of-the-art Digital Learning Hub, equipped with high-speed internet and advanced educational software. This initiative aims to provide students with the latest technological tools to enhance their research capabilities and prepare them for a future dominated by digital innovation. We encourage all students to utilize these resources responsibly to broaden their horizons.",
      mr: "शाळेला नवीन अत्याधुनिक 'डिजिटल लर्निंग हब' सुरू झाल्याची घोषणा करताना अभिमान वाटत आहे, जे हाय-स्पीड इंटरनेट आणि प्रगत शैक्षणिक सॉफ्टवेअरने सुसज्ज आहे. या उपक्रमाचा उद्देश विद्यार्थ्यांना त्यांच्या संशोधन क्षमता वाढवण्यासाठी आणि डिजिटल नाविन्यपूर्ण भविष्यासाठी तयार करण्यासाठी नवीन तांत्रिक साधने प्रदान करणे आहे. आम्ही सर्व विद्यार्थ्यांना विनंती करतो की त्यांनी या संसाधनांचा जबाबदारीने वापर करून आपली क्षितिजे विस्तारली पाहिजेत.",
    },
    {
      en: "Our annual inter-school Athletics Championship is scheduled to take place next Friday at the main sports complex. This event is a fantastic opportunity for our young athletes to demonstrate their physical prowess, teamwork, and sportsman spirit. We invite all parents and community members to join us in cheering for our students as they compete with dedication and excellence in various track and field events.",
      mr: "आमची वार्षिक आंतरशालेय ॲथलेटिक्स चॅम्पियनशिप पुढील शुक्रवारी मुख्य क्रीडा संकुलात आयोजित केली जाणार आहे. हा कार्यक्रम आपल्या तरुण खेळाडूंसाठी त्यांचे शारीरिक कसब, सांघिक कार्य आणि खिलाडूवृत्ती प्रदर्शित करण्याची एक विलक्षण संधी आहे. आम्ही सर्व पालक आणि समाजातील सदस्यांना विनंती करतो की त्यांनी आपल्या विद्यार्थ्यांचा उत्साह वाढवण्यासाठी उपस्थित राहावे, कारण ते विविध ट्रॅक आणि फील्ड स्पर्धांमध्ये समर्पितपणे आणि उत्कृष्टतेने भाग घेणार आहेत.",
    },
  ],
};

function Info({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

const getSyllabusData = (classVal: string, mediumVal: string) => {
  const numericClass = parseInt(classVal) || 1;
  const isSemi = mediumVal === "Semi English";

  const months = [
    { en: "June", mr: "जून" },
    { en: "July", mr: "जुलै" },
    { en: "August", mr: "ऑगस्ट" },
    { en: "September", mr: "सप्टेंबर" },
    { en: "October", mr: "ऑक्टोबर" },
    { en: "November", mr: "नोव्हेंबर" },
    { en: "December", mr: "डिसेंबर" },
    { en: "January", mr: "जानेवारी" },
    { en: "February", mr: "फेब्रुवारी" },
    { en: "March", mr: "मार्च" },
    { en: "April", mr: "एप्रिल" },
    { en: "May", mr: "मे" }
  ];

  let subjects: string[] = [];
  if (numericClass <= 3) {
    subjects = ["मराठी", isSemi ? "Mathematics" : "गणित", "इंग्रजी", "खेळू करू शिकू"];
  } else if (numericClass === 4) {
    subjects = ["मराठी", "इंग्रजी", isSemi ? "Mathematics" : "गणित", "परिसर अभ्यास १", "परिसर अभ्यास २"];
  } else if (numericClass === 5) {
    subjects = ["मराठी", "इंग्रजी", "हिंदी", isSemi ? "Mathematics" : "गणित", isSemi ? "General Science" : "परिसर अभ्यास १", isSemi ? "Social Sciences" : "परिसर अभ्यास २"];
  } else {
    subjects = ["मराठी", "इंग्रजी", "हिंदी", isSemi ? "Mathematics" : "गणित", isSemi ? "General Science" : "सामान्य विज्ञान", "इतिहास व नागरिकशास्त्र", "भूगोल"];
  }

  if (numericClass === 1) {
    const syllabusBySubject: Record<string, Record<string, { topic: string; objectives: string; activity: string }>> = {};
    subjects.forEach(subject => {
      syllabusBySubject[subject] = {};
    });

    const mathSubjectName = isSemi ? "Mathematics" : "गणित";

    const syllabusData = class1SyllabusData as any;
    months.forEach(m => {
      syllabusBySubject["मराठी"][m.en] = syllabusData.marathi[m.en];
      syllabusBySubject[mathSubjectName][m.en] = isSemi ? syllabusData.math_en[m.en] : syllabusData.math_mr[m.en];
      syllabusBySubject["इंग्रजी"][m.en] = syllabusData.english[m.en];
      syllabusBySubject["खेळू करू शिकू"][m.en] = syllabusData.kks[m.en];
    });

    return { subjects, months, syllabusBySubject };
  }

  const syllabusBySubject: Record<string, Record<string, { topic: string; objectives: string; activity: string }>> = {};

  subjects.forEach(subject => {
    syllabusBySubject[subject] = {};
    months.forEach(m => {
      const monthNameEn = m.en;
      const monthNameMr = m.mr;

      let topic = "";
      let objectives = "";
      let activity = "";

      if (monthNameEn === "May") {
        const langIsEng = isSemi || subject.toLowerCase().includes("english") || subject.toLowerCase().includes("math") || subject.toLowerCase().includes("science");
        topic = langIsEng ? "Summer Vacation / Holidays" : "उन्हाळी सुट्टी";
        objectives = langIsEng ? "Revision and summer homework assignment" : "गृहपाठ व सुट्टी उपक्रम.";
        activity = langIsEng ? "Creative projects and hobby exploration" : "विविध छंद जोपासणे व गृहप्रकल्प.";
      } else if (subject.includes("मराठी")) {
        if (monthNameEn === "June") {
          topic = "पाठ १. माय मराठी (कविता)";
          objectives = "कवितेचे तालासुरात गायन करणे, मातृभाषेविषयी प्रेम जागृत करणे.";
          activity = "सामूहिक कविता गायन व सुलेखन सराव.";
        } else if (monthNameEn === "July") {
          topic = "पाठ २. हत्तीचे चातुर्य & व्याकरण: नाम";
          objectives = "चित्रावरून गोष्ट सांगणे, नामाची व्याख्या व उदाहरणे ओळखणे.";
          activity = "चित्रे पाहून गोष्ट पूर्ण करणे, नाम ओळखा स्पर्धा.";
        } else if (monthNameEn === "August") {
          topic = "पाठ ३. खेळूया शब्दांशी & व्याकरण: सर्वनाम";
          objectives = "नवीन शब्दांचा संग्रह करणे, सर्वनामाचे उपयोग समजणे.";
          activity = "भाषिक खेळ खेळणे, वाक्यांमधील सर्वनाम बदलणे.";
        } else if (monthNameEn === "September") {
          topic = "पाठ ४. आम्ही जाहिरात वाचतो & विशेषण";
          objectives = "जाहिरातींचे वाचन करून आकलन करणे, विशेषणे ओळखणे.";
          activity = "स्वतः वस्तूंची जाहिरात तयार करणे.";
        } else if (monthNameEn === "October") {
          topic = "प्रथम सत्र परीक्षा व उजळणी";
          objectives = "सत्र १ मधील अभ्यासक्रमाचे मूल्यमापन करणे.";
          activity = "सराव प्रश्नपत्रिका सोडविणे.";
        } else if (monthNameEn === "November") {
          topic = "पाठ ५. हिवाळा (कविता) & निबंध लेखन";
          objectives = "ऋतूंमधील बदलांविषयी माहिती मिळविणे, निबंध लेखन समजणे.";
          activity = "माझा आवडता ऋतू यावर निबंध लिहिणे.";
        } else if (monthNameEn === "December") {
          topic = "पाठ ६. पैशांचे व्यवहार & पत्रलेखन";
          objectives = "बँक आणि दैनंदिन व्यवहार समजणे, पत्र लेखन आराखडा समजणे.";
          activity = "बँकेला भेट देणे, घरगुती पत्र लिहिणे.";
        } else if (monthNameEn === "January") {
          topic = "पाठ ७. जोडशब्द व सुविचार लेखन";
          objectives = "जोडशब्दांचे योग्य उच्चार व लेखन करणे.";
          activity = "दररोज एक सुविचार फलकावर लिहिणे.";
        } else if (monthNameEn === "February") {
          topic = "पाठ ८. विरामचिन्हे व क्रियापद ओळख";
          objectives = "लेखनात योग्य विरामचिन्हांचा वापर करणे.";
          activity = "परिच्छेदामधील विरामचिन्हे शोधणे.";
        } else if (monthNameEn === "March") {
          topic = "कथालेखन व संवाद वाचन सराव";
          objectives = "गोष्टींचे स्वतःच्या शब्दांत सादरीकरण करणे.";
          activity = "नाट्यीकरण व प्रकट वाचन.";
        } else {
          topic = "वार्षिक परीक्षा आणि उजळणी";
          objectives = "संपूर्ण वर्षाचा अभ्यासक्रम उजळणी व अंतिम मूल्यमापन.";
          activity = "मौल्यवान सराव चाचण्या आणि गुणदान.";
        }
      } else if (subject.includes("Math") || subject.includes("गणित")) {
        const langIsEng = isSemi || subject.toLowerCase().includes("math");
        if (monthNameEn === "June") {
          topic = langIsEng ? "Unit 1: Roman Numerals" : "घटक १: रोमन संख्याचिन्हे";
          objectives = langIsEng ? "Unit 1: Numbers and place value up to 100" : "घटक १: रोमन संख्याचिन्हे व स्थानिक किंमत";
          activity = langIsEng ? "Number chart activities and place value blocks" : "अबेकसवर संख्या दाखवणे व लिहिणे.";
        } else if (monthNameEn === "July") {
          topic = langIsEng ? "Unit 2: Addition & Subtraction (up to 99)" : "घटक २: बेरीज व वजाबाकी (99 पर्यंत)";
          objectives = langIsEng ? "Performing addition and subtraction with carrying/borrowing" : "हातउसने घेऊन बेरीज-वजाबाकी करणे.";
          activity = langIsEng ? "Abacus sums, mental math drills" : "संख्यारेषेवर बेरीज व वजाबाकी खेळ.";
        } else if (monthNameEn === "August") {
          topic = langIsEng ? "Unit 3: Multiplication tables (2-5)" : "घटक ३: गुणाकार पाढे (२ ते ५)";
          objectives = langIsEng ? "Reciting and applying multiplication tables 2–5" : "पाढे म्हणणे व गुणाकार समजणे.";
          activity = langIsEng ? "Times tables songs and flashcard quiz" : "गाण्याच्या चालीवर पाढे म्हणणे.";
        } else if (monthNameEn === "September") {
          topic = langIsEng ? "Unit 4: Division – equal sharing" : "घटक ४: भागाकार – समान वाटप";
          objectives = langIsEng ? "Understanding division as equal grouping" : "समान गटांमध्ये विभागणी समजणे.";
          activity = langIsEng ? "Sharing objects equally in groups" : "वस्तू समान गटांत वाटप करणे.";
        } else if (monthNameEn === "October") {
          topic = langIsEng ? "Unit 5: Fractions & Half/Quarter" : "घटक ५: अपूर्णांक – अर्धे व पाव";
          objectives = langIsEng ? "Identifying ½ and ¼ of shapes and sets" : "आकृतींचे अर्धे व पाव भाग ओळखणे.";
          activity = langIsEng ? "Folding shapes into halves and quarters" : "कागदाच्या घड्या घालून अर्धे दाखवणे.";
        } else if (monthNameEn === "November") {
          topic = langIsEng ? "Unit 6: Measurement – Length, Weight, Capacity" : "घटक ६: मापन – लांबी, वजन व क्षमता";
          objectives = langIsEng ? "Measuring objects using standard & non-standard units" : "मानक व अमानक एककांनी मापन करणे.";
          activity = langIsEng ? "Classroom measurement activities" : "वर्गातील वस्तू मोजणे व तुलना करणे.";
        } else if (monthNameEn === "December") {
          topic = langIsEng ? "Unit 7: Time – Reading Clock" : "घटक ७: वेळ – घड्याळ वाचन";
          objectives = langIsEng ? "Reading time to the hour and half hour" : "पूर्ण व अर्ध्या तासाची वेळ सांगणे.";
          activity = langIsEng ? "Clock model making and time matching" : "घड्याळाच्या काट्या फिरवून वेळ दाखवणे.";
        } else if (monthNameEn === "January") {
          topic = langIsEng ? "Unit 8: Money – Coins and Notes" : "घटक ८: पैसे – नाणी व नोटा";
          objectives = langIsEng ? "Identifying and counting Indian currency" : "नाणी व नोटा ओळखणे व मोजणे.";
          activity = langIsEng ? "Mock shop activity with paper notes" : "कागदी नोटा वापरून खरेदी-विक्री खेळ.";
        } else if (monthNameEn === "February") {
          topic = langIsEng ? "Unit 9: Geometry – Shapes & Patterns" : "घटक ९: भूमिती – आकार व आकृतीबंध";
          objectives = langIsEng ? "Identifying 2D & 3D shapes and repeating patterns" : "समतल व घनाकार आकार ओळखणे.";
          activity = langIsEng ? "Shape collage and pattern drawing" : "आकारांचे चित्र काढणे व रंगवणे.";
        } else if (monthNameEn === "March") {
          topic = langIsEng ? "Revision & Problem Solving" : "उजळणी व समस्या सोडवणे";
          objectives = langIsEng ? "Reviewing all math topics and solving word problems" : "सर्व घटकांची उजळणी व शब्दसमस्या सोडवणे.";
          activity = langIsEng ? "Sample paper practice" : "नमुना प्रश्नपत्रिका सोडविणे.";
        } else {
          topic = langIsEng ? "Annual Exam Revision" : "वार्षिक परीक्षा उजळणी";
          objectives = langIsEng ? "Final evaluation and grade compilation" : "वार्षिक मूल्यमापन व गुणदान.";
          activity = langIsEng ? "Final written exam" : "अंतिम परीक्षा व गुणनोंदणी.";
        }
      } else if (subject.includes("English") || subject.includes("इंग्रजी")) {
        if (monthNameEn === "June") {
          topic = "Chapter 1: Greetings & Introductions";
          objectives = "Using basic greeting expressions and self-introduction.";
          activity = "Role-play introductions, Hello song.";
        } else if (monthNameEn === "July") {
          topic = "Chapter 2: My School & Classroom";
          objectives = "Naming classroom objects, reading simple sentences.";
          activity = "Label the classroom, picture reading.";
        } else if (monthNameEn === "August") {
          topic = "Chapter 3: Sounds & Phonics (consonants)";
          objectives = "Recognizing and writing consonant sounds.";
          activity = "Sound sorting game, phonics worksheets.";
        } else if (monthNameEn === "September") {
          topic = "Chapter 4: Colours, Fruits & Vegetables";
          objectives = "Identifying and naming colours, fruits, vegetables.";
          activity = "Drawing & colouring activity, vocabulary bingo.";
        } else if (monthNameEn === "October") {
          topic = "Chapter 5: Number words & Rhymes";
          objectives = "Writing numbers as words (one to twenty), reciting rhymes.";
          activity = "Number poem recitation, fill-in-the-blanks.";
        } else if (monthNameEn === "November") {
          topic = "Chapter 6: Action words (Verbs)";
          objectives = "Using simple verbs in sentences.";
          activity = "Act-and-guess game, verb sentences writing.";
        } else if (monthNameEn === "December") {
          topic = "Chapter 7: Describing words (Adjectives)";
          objectives = "Using adjectives to describe objects.";
          activity = "Adjective matching, describe-the-picture worksheet.";
        } else if (monthNameEn === "January") {
          topic = "Chapter 8: Sentence Formation & Punctuation";
          objectives = "Writing complete sentences with full stop and question mark.";
          activity = "Sentence jumbles, punctuation spotting.";
        } else if (monthNameEn === "February") {
          topic = "Chapter 9: Short Stories & Comprehension";
          objectives = "Reading simple stories and answering questions.";
          activity = "Story sequencing cards, comprehension exercise.";
        } else if (monthNameEn === "March") {
          topic = "Revision – All chapters";
          objectives = "Review vocabulary, grammar, and reading skills.";
          activity = "Fun interactive spelling bee.";
        } else {
          topic = "Annual Exam & Final Evaluation";
          objectives = "Evaluating reading, writing, and speaking skills.";
          activity = "Final written and oral assessment.";
        }
      } else {
        if (monthNameEn === "June") {
          topic = `${subject} – घटक १: पायाभूत ओळख`;
          objectives = "विषयाच्या पायाभूत संकल्पनांची ओळख.";
          activity = "चर्चा व प्रश्नोत्तरे.";
        } else if (monthNameEn === "July") {
          topic = `${subject} – घटक २`;
          objectives = "विषयाच्या दुसऱ्या घटकाचे अध्ययन.";
          activity = "गट चर्चा व नोट्स.";
        } else if (monthNameEn === "August") {
          topic = `${subject} – घटक ३`;
          objectives = "घटक ३ च्या संकल्पना समजणे.";
          activity = "प्रात्यक्षिक व कृती उपक्रम.";
        } else if (monthNameEn === "September") {
          topic = `${subject} – घटक ४`;
          objectives = "घटक ४ चे सखोल अध्ययन.";
          activity = "गृहपाठ व सराव.";
        } else if (monthNameEn === "October") {
          topic = `${subject} – प्रथम सत्र परीक्षा`;
          objectives = "सत्र १ चे मूल्यमापन.";
          activity = "सराव प्रश्नपत्रिका.";
        } else if (monthNameEn === "November") {
          topic = `${subject} – घटक ५`;
          objectives = "घटक ५ च्या संकल्पना समजणे.";
          activity = "चित्र, आकृत्या व नोट्स तयार करणे.";
        } else if (monthNameEn === "December") {
          topic = `${subject} – घटक ६`;
          objectives = "घटक ६ चे अध्ययन.";
          activity = "गट कृती व सादरीकरण.";
        } else if (monthNameEn === "January") {
          topic = `${subject} – घटक ७`;
          objectives = "घटक ७ – सखोल अभ्यास.";
          activity = "प्रकल्प व लेखन.";
        } else if (monthNameEn === "February") {
          topic = `${subject} – घटक ८`;
          objectives = "घटक ८ चे अध्ययन व उजळणी.";
          activity = "चर्चा व सराव प्रश्न.";
        } else if (monthNameEn === "March") {
          topic = `${subject} – उजळणी`;
          objectives = "संपूर्ण वर्षाचा अभ्यासक्रम उजळणी.";
          activity = "सराव चाचण्या.";
        } else {
          topic = `${subject} – वार्षिक परीक्षा`;
          objectives = "अंतिम मूल्यमापन.";
          activity = "वार्षिक परीक्षा.";
        }
      }

      syllabusBySubject[subject][monthNameEn] = { topic, objectives, activity };
    });
  });

  return { subjects, months, syllabusBySubject };
};

const CLASS4_JUNE_PLAN: Record<string, Record<number, { topic: string; experience: string; tools: string; materials: string; outcome: string; isHolidayText?: string }>> = {
  "मराठी": {
    15: { topic: "चित्र वाचन", experience: "चित्र पाहून चित्रात काय दिसते ते सांगा.", tools: "तोंडीकाम", materials: "चित्र", outcome: "१.३.१ सांगितलेल्या/विचारलेल्या वस्तूंविषयी, घटकाविषयी पाच ते सहा ओळींत माहिती सांगतो." },
    16: { topic: "अभिव्यक्ती", experience: "दिलेल्या विषयावर आपले मत मांडतात.", tools: "तोंडीकाम", materials: "चित्र", outcome: "१.३.१ सांगितलेल्या/विचारलेल्या वस्तूंविषयी, घटकाविषयी पाच ते सहा ओळींत माहिती सांगतो." },
    17: { topic: "कथा सांगणे", experience: "कथा लक्षपूर्वक ऐकतात व चर्चा करतात", tools: "तोंडीकाम", materials: "चित्र", outcome: "१.१.२ कथा, उतारा, परिच्छेद, बातमी ऐकून त्यांच्यावर गटचर्चा करती." },
    18: { topic: "बातमी वाचन", experience: "बातमी वाचन करून चर्चा करतात.", tools: "तोंडीकाम", materials: "चित्र", outcome: "१.१.२ कथा, उतारा, परिच्छेद, बातमी ऐकून त्यांच्यावर गटचर्चा करती." },
    19: { topic: "शब्दसमूह", experience: "शब्दसमूहाचा अर्थ सांगतात.", tools: "तोंडीकाम", materials: "तक्ता", outcome: "३.१.१ दिलेल्या शब्दसमूहापासून सुसंगत वाक्य तयार करून लिहितो." },
    20: { topic: "शब्दसमूह", experience: "शब्दसमूहाचा वाक्यात उपयोग करून सांगतात.", tools: "तोंडीकाम", materials: "तक्ता", outcome: "३.१.१ दिलेल्या शब्दसमूहापासून सुसंगत वाक्य तयार करून लिहितो." },
    22: { topic: "हीच अमुची प्रार्थना", experience: "प्रार्थना सामूहिक पाठीमागे म्हणतात.", tools: "तोंडीकाम", materials: "ध्वनीफीत", outcome: "२.२.३ वाचलेल्या साहित्यातील (गद्य/पद्य) आशय, निष्कर्ष सांगतो." },
    23: { topic: "हीच अमुची प्रार्थना", experience: "प्रार्थना सामूहिक तालासुरात म्हणतात.", tools: "तोंडीकाम", materials: "ध्वनीफीत", outcome: "२.२.३ वाचलेल्या साहित्यातील (गद्य/पद्य) आशय, निष्कर्ष सांगतो." },
    24: { topic: "हीच अमुची प्रार्थना", experience: "विचारलेल्या प्रश्नांची उत्तरे देतात.", tools: "तोंडीकाम", materials: "ध्वनीफीत", outcome: "२.२.३ वाचलेल्या साहित्यातील (गद्य/पद्य) आशय, निष्कर्ष सांगतो." },
    25: { topic: "हीच अमुची प्रार्थना", experience: "आपले अनुभव सांगतात.", tools: "उपक्रम", materials: "पेपर", outcome: "१.१.३ घडलेल्या घटना, प्रसंग व दैनंदिन अनुभव यांबाबत सुसंगतपणे मत व्यक्त करतो." },
    26: { topic: "", experience: "", tools: "", materials: "", outcome: "", isHolidayText: "राजर्षी शाहू महाराज जयंती व मोहरम" },
    27: { topic: "माझा पतंग", experience: "चित्र पहा, वाचा व सांगा.", tools: "तोंडीकाम", materials: "चित्र", outcome: "२.१.२ मजकुरातील मुख्य घटना व पात्रे यांविषयी बोलतो." },
    29: { topic: "माझा पतंग", experience: "चित्र कथेच्या आधारे संवाद लिहितात.", tools: "तोंडीकाम", materials: "चित्र", outcome: "३.१.२ परिसरात घडलेल्या घटनांचा क्रम लावून स्वानुभवावर आधारित परिच्छेद तयार करतो, स्व-मतासह समारोप करतो." },
    30: { topic: "माझा पतंग", experience: "खेळताना घडलेल्या प्रसंगाचे वर्णन करतात.", tools: "तोंडीकाम", materials: "चित्र", outcome: "३.३.४ स्वतःच्या अनुभवाचे संवाद रूपात लेखन करतो." }
  },
  "गणित": {
    15: { topic: "संख्याज्ञान", experience: "१०० ते ९९९ अंकाचे वाचन करतात.", tools: "प्रात्यक्षिक", materials: "तक्ता", outcome: "C-1.1 ९९९९ पर्यंतच्या संख्या ओळखतो. संख्या अक्षरांत लिहितो." },
    16: { topic: "संख्याज्ञान", experience: "१०० ते ९९९ अंकाचे अक्षरात लेखन करा.", tools: "प्रात्यक्षिक", materials: "तक्ता", outcome: "C-1.1 ९९९९ पर्यंतच्या संख्या ओळखतो. संख्या अक्षरांत लिहितो." },
    17: { topic: "बेरीज", experience: "तीन अंकी संख्यांची बेरीज करतात.", tools: "प्रात्यक्षिक", materials: "तक्ता", outcome: "C-1.3 बेरीज आणि वजाबाकीची उदाहरणे तयार करतो; ती मांडतो आणि सोडवतो." },
    18: { topic: "वजाबाकी", experience: "तीन अंकी संख्यांची वजाबाकी करतात.", tools: "प्रात्यक्षिक", materials: "तक्ता", outcome: "C-1.3 बेरीज आणि वजाबाकीची उदाहरणे तयार करतो; ती मांडतो आणि सोडवतो." },
    19: { topic: "भौमितिक आकृत्या", experience: "त्रिकोण, चौकोन, आयत, वर्तुळ संपूर्ण उजळणी करतात.", tools: "प्रात्यक्षिक", materials: "सारणी", outcome: "C-2.1 विविध आकार ओळखतो आणि त्यांची यादी करतो. कडा, कोपरे आणि पृष्ठभाग मोजतो." },
    20: { topic: "भौमितिक आकृत्या", experience: "भौमितिक आकृत्यांची उजळणी करतात.", tools: "प्रात्यक्षिक", materials: "सारणी", outcome: "C-2.1 विविध आकार ओळखतो आणि त्यांची यादी करतो. कडा, कोपरे आणि पृष्ठभाग मोजतो." },
    22: { topic: "खेळूया संख्यांशी", experience: "हजाराची ओळख करून घेतात.", tools: "प्रात्यक्षिक", materials: "तक्ता", outcome: "C-1.1 'हजार' ही संकल्पना समजून घेतो आणि 'हजार' ही संख्या विविध प्रकारे दर्शवितो." },
    23: { topic: "खेळूया संख्यांशी", experience: "वेगवेगळ्या उदाहरणाद्वारे हजाराची ओळख", tools: "प्रात्यक्षिक", materials: "तक्ता", outcome: "C-1.1 'हजार' ही संकल्पना समजून घेतो आणि 'हजार' ही संख्या विविध प्रकारे दर्शवितो." },
    24: { topic: "खेळूया संख्यांशी", experience: "हजार ही संख्या कशी बनते समजून घेतात.", tools: "प्रात्यक्षिक", materials: "तक्ता", outcome: "C-1.1 'हजार' ही संकल्पना समजून घेतो आणि 'हजार' ही संख्या विविध प्रकारे दर्शवितो." },
    25: { topic: "खेळूया संख्यांशी", experience: "वेगवेगळ्या पद्धतीने हजार ही संख्या कशी बनते ते समजून घेतात.", tools: "प्रात्यक्षिक", materials: "तक्ता", outcome: "C-1.1 'हजार' ही संकल्पना समजून घेतो आणि 'हजार' ही संख्या विविध प्रकारे दर्शवितो." },
    26: { topic: "", experience: "", tools: "", materials: "", outcome: "", isHolidayText: "राजर्षी शाहू महाराज जयंती व मोहरम" },
    27: { topic: "खेळूया संख्यांशी", experience: "वेगवेगळ्या पद्धतीने हजार संख्या बनवितात.", tools: "प्रात्यक्षिक", materials: "तक्ता", outcome: "C-1.1 'हजार' ही संकल्पना समजून घेतो आणि 'हजार' ही संख्या विविध प्रकारे दर्शवितो." },
    29: { topic: "खेळूया संख्यांशी", experience: "चार अंकी संख्येची ओळख होते.", tools: "प्रात्यक्षिक", materials: "तक्ता", outcome: "C-1.1 'हजार' ही संकल्पना समजून घेतो आणि 'हजार' ही संख्या विविध प्रकारे दर्शवितो." },
    30: { topic: "खेळूया संख्यांशी", experience: "चार अंकी संख्येचे वाचन करतात.", tools: "प्रात्यक्षिक", materials: "तक्ता", outcome: "C-1.1 'हजार' ही संकल्पना समजून घेतो आणि 'हजार' ही संख्या विविध प्रकारे दर्शवितो." }
  },
  "इंग्रजी": {
    15: { topic: "Poem", experience: "Sing a poem in rhythm", tools: "Oral", materials: "video", outcome: "04.01 Recognises and explains the central ideas of the poem" },
    16: { topic: "Poem", experience: "Sing a poem with action", tools: "Oral", materials: "video", outcome: "04.01 Recognises and explains the central ideas of the poem" },
    17: { topic: "Conversation", experience: "Participate in conversation", tools: "Oral", materials: "video", outcome: "04.09 Participates in conversations by attentive listening." },
    18: { topic: "Conversation", experience: "Tell about given topic", tools: "Oral", materials: "video", outcome: "04.09 Participates in conversations by attentive listening." },
    19: { topic: "Read Story", experience: "Read aloud story", tools: "Practical", materials: "picture", outcome: "04.17 Reads age appropriate stories with proper pauses and fluency." },
    20: { topic: "Read Story", experience: "Read aloud story", tools: "Practical", materials: "picture", outcome: "04.17 Reads age appropriate stories with proper pauses and fluency." },
    22: { topic: "Back to school", experience: "Listen and sing", tools: "Oral", materials: "video", outcome: "04.01 Recognises and explains the central ideas of the poem" },
    23: { topic: "Back to school", experience: "Sing a poem in rhythm", tools: "Oral", materials: "video", outcome: "04.01 Recognises and explains the central ideas of the poem" },
    24: { topic: "Back to school", experience: "Sing a poem with action.", tools: "Oral", materials: "video", outcome: "04.01 Recognises and explains the central ideas of the poem" },
    25: { topic: "Back to school", experience: "Listen and repeat.", tools: "Oral", materials: "video", outcome: "04.11 Follows the proper manners of group discussion like attentive listening, active response, respects other's opinion, etc." },
    26: { topic: "", experience: "", tools: "", materials: "", outcome: "", isHolidayText: "राजर्षी शाहू महाराज जयंती व मोहरम" },
    27: { topic: "Back to school", experience: "Look at the picture and find their names.", tools: "Oral", materials: "video", outcome: "04.11 Follows the proper manners of group discussion like attentive listening, active response, respects other's opinion, etc." },
    29: { topic: "Back to school", experience: "Look at the pictures and name the actions", tools: "Oral", materials: "video", outcome: "04.11 Follows the proper manners of group discussion like attentive listening, active response, respects other's opinion, etc." },
    30: { topic: "Back to school", experience: "Look at the pictures and find answers of riddles.", tools: "Oral", materials: "video", outcome: "04.10 Presents orally in the class on the given topics." }
  },
  "परिसर अभ्यास १": {
    15: { topic: "सूर्यमाला", experience: "सूर्यमालेतील ग्रहांची नावे सांगा.", tools: "तोंडीकाम", materials: "चित्र", outcome: "C-1.1 सूर्यमालेतील ग्रहांचा योग्य क्रम सांगती." },
    16: { topic: "सूर्यमाला", experience: "सूर्यमालेतील ग्रह योग्य क्रमाने सांगा.", tools: "तोंडीकाम", materials: "चित्र", outcome: "C-1.1 सूर्यमालेतील ग्रहांचा योग्य क्रम सांगती." },
    17: { topic: "सूर्यमाला", experience: "सूर्यमालेतील ग्रहांची नावे लिहा.", tools: "तोंडीकाम", materials: "चित्र", outcome: "C-1.1 सूर्यमालेतील ग्रहांचा योग्य क्रम सांगती." },
    18: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    19: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    20: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    22: { topic: "ठेवा निसर्गाचा", experience: "आठवा आणि सांगा.", tools: "तोंडीकाम", materials: "चित्र", outcome: "C – 2.1 पाण्याचे विविध स्रोत सांगून, त्यांच्या स्वच्छतेचे महत्त्व सांगतो." },
    23: { topic: "ठेवा निसर्गाचा", experience: "पाण्याचे स्रोत सांगा व माहिती समजून घेतात.", tools: "तोंडीकाम", materials: "चित्र", outcome: "C – 2.1 पाण्याचे विविध स्रोत सांगून, त्यांच्या स्वच्छतेचे महत्त्व सांगतो." },
    24: { topic: "ठेवा निसर्गाचा", experience: "पाणी साठवण माहिती समजून घेतात..", tools: "तोंडीकाम", materials: "चित्र", outcome: "C – 2.1 पाण्याचे विविध स्रोत सांगून, त्यांच्या स्वच्छतेचे महत्त्व सांगतो." },
    25: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    26: { topic: "", experience: "", tools: "", materials: "", outcome: "", isHolidayText: "राजर्षी शाहू महाराज जयंती व मोहरम" },
    27: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    29: { topic: "ठेवा निसर्गाचा", experience: "निरीक्षण करा व सांगतात.", tools: "तोंडीकाम", materials: "चित्र", outcome: "C – 2.1 पाण्याचे विविध स्रोत सांगून, त्यांच्या स्वच्छतेचे महत्त्व सांगतो." },
    30: { topic: "ठेवा निसर्गाचा", experience: "वाचा व समजून घेतात.", tools: "तोंडीकाम", materials: "चित्र", outcome: "C – 2.1 पाण्याचे विविध स्रोत सांगून, त्यांच्या स्वच्छतेचे महत्त्व सांगतो." }
  },
  "परिसर अभ्यास २": {
    15: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    16: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    17: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    18: { topic: "कुटुंब", experience: "कुटुंबातील सदस्यांची नावे सांगा.", tools: "तोंडीकाम", materials: "विविध चित्रे", outcome: "04.958.01 विस्तारित कुटुंबातील सदस्यांचे एकमेकांशी असलेले नातेसंबंध ओळखतात." },
    19: { topic: "कुटुंब", experience: "कुटुंबातील सदस्यांची माहिती सांगा.", tools: "तोंडीकाम", materials: "विविध चित्रे", outcome: "04.958.01 विस्तारित कुटुंबातील सदस्यांचे एकमेकांशी असलेले नातेसंबंध ओळखतात." },
    20: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    22: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    23: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    24: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    25: { topic: "अनुभव कथन", experience: "अनुभवलेल्या समस्या मांडतात.", tools: "तोंडीकाम", materials: "विविध चित्रे", outcome: "04.958.02 कुटुंब / शाळा / शेजार या ठिकाणी निरीक्षण केलेल्या / अनुभवलेल्या समस्यांवर स्वतःचे मत मांडतात" },
    26: { topic: "", experience: "", tools: "", materials: "", outcome: "", isHolidayText: "राजर्षी शाहू महाराज जयंती व मोहरम" },
    27: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    29: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    30: { topic: "", experience: "", tools: "", materials: "", outcome: "" }
  },
  "कला": {
    15: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    16: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    17: { topic: "बडबड गीत", experience: "बडबड गीत गायन करतात.", tools: "तोंडीकाम", materials: "ध्वनीफीत", outcome: "बडबडगीत, समूहगीत तालासुरात म्हणतो." },
    18: { topic: "चित्र काढणे", experience: "रेषांच्या सहाय्याने चित्र काढतात व रंगवितात.", tools: "प्रात्यक्षिक", materials: "चित्र", outcome: "रेषांच्या विविध आकारांपासून सोपे आकार काढतो तसेच नक्षीकाम करतो." },
    19: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    20: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    22: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    23: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    24: { topic: "प्रार्थना गायन", experience: "प्रार्थना गायन करतात.", tools: "तोंडीकाम", materials: "ध्वनीफीत", outcome: "बडबडगीत, समूहगीत तालासुरात म्हणतो." },
    25: { topic: "कविता गायन", experience: "कविता गायन तालासुरात करतात.", tools: "प्रात्यक्षिक", materials: "चित्र", outcome: "रेषांच्या विविध आकारांपासून सोपे आकार काढतो तसेच नक्षीकाम करतो." },
    26: { topic: "", experience: "", tools: "", materials: "", outcome: "", isHolidayText: "राजर्षी शाहू महाराज जयंती व मोहरम" },
    27: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    29: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    30: { topic: "", experience: "", tools: "", materials: "", outcome: "" }
  },
  "कार्यानुभव": {
    15: { topic: "पाण्याचा वापर", experience: "पाण्याचे उपयोग सांगा.", tools: "तोंडीकाम", materials: "चित्र", outcome: "पाण्याचे विविध उपयोग सांगतो. पाण्याचे विविध उपयोग सांगतो. पाण्याचे विविध उपयोग सांगतो. पाण्याचे विविध उपयोग सांगतो. पाण्याचे विविध उपयोग सांगतो." },
    16: { topic: "पाण्याचा वापर", experience: "पाण्याचा वापर व बचत यावर चर्चा", tools: "तोंडीकाम", materials: "चित्र", outcome: "पाण्याचे विविध उपयोग सांगतो. पाण्याचे विविध उपयोग सांगतो. पाण्याचे विविध उपयोग सांगतो. पाण्याचे विविध उपयोग सांगतो. पाण्याचे विविध उपयोग सांगतो." },
    17: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    18: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    19: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    20: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    22: { topic: "पाण्याचा वापर", experience: "पाण्याविषयी घोषवाक्ये सांगा.", tools: "उपक्रम", materials: "-", outcome: "पाण्याचे विविध उपयोग सांगतो. पाण्याचे विविध उपयोग सांगतो. पाण्याचे विविध उपयोग सांगतो. पाण्याचे विविध उपयोग सांगतो. पाण्याचे विविध उपयोग सांगतो." },
    23: { topic: "पाण्याचा वापर", experience: "पाण्याविषयी घोषवाक्ये लिहा.", tools: "तोंडीकाम", materials: "चित्र", outcome: "पाण्याचे विविध उपयोग सांगतो. पाण्याचे विविध उपयोग सांगतो. पाण्याचे विविध उपयोग सांगतो. पाण्याचे विविध उपयोग सांगतो. पाण्याचे विविध उपयोग सांगतो." },
    24: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    25: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    26: { topic: "", experience: "", tools: "", materials: "", outcome: "", isHolidayText: "राजर्षी शाहू महाराज जयंती व मोहरम" },
    27: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    29: { topic: "बचतपेटी", experience: "कागदी बचतपेटी तयार करा.", tools: "उपक्रम", materials: "कागद", outcome: "गरजा आणि समस्या यांच्याशी निगडित कौशल्यपूर्ण समाजोपयोगी साहित्य निर्माण करतो." },
    30: { topic: "वर्ग सुशोभन", experience: "सुशोभनासाठी सोपे साहित्य सांगा.", tools: "वर्गकार्य", materials: "-", outcome: "वर्गाचे सुशोभन करून दिनविशेष व परिसरातील लघु उद्योगांची माहिती सांगतो." }
  },
  "शारीरिक शिक्षण": {
    15: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    16: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    17: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    18: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    19: { topic: "शारीरिक स्वच्छता", experience: "वैयक्तिक स्वच्छता तपासणे", tools: "वर्गकार्य", materials: "तक्ता", outcome: "आरोग्याच्या चांगल्या सवयी समजून घेऊन त्यांचे पालन करतो." },
    20: { topic: "खेळ", experience: "कबड्डी खेळ खेळणे.", tools: "प्रात्यक्षिक", materials: "वस्तू", outcome: "विविध प्रकारच्या खेळांत रुची घेतो. शर्यतीत सहभागी होतो." },
    22: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    23: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    24: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    25: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    26: { topic: "", experience: "", tools: "", materials: "", outcome: "", isHolidayText: "राजर्षी शाहू महाराज जयंती व मोहरम" },
    27: { topic: "खेळ", experience: "मनोरंजनात्मक खेळ खेळणे.", tools: "प्रात्यक्षिक", materials: "वस्तू", outcome: "विविध प्रकारच्या खेळांत रुची घेतो. शर्यतीत सहभागी होतो." },
    29: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    30: { topic: "", experience: "", tools: "", materials: "", outcome: "" }
  }
};

const getDatesForMonth = (monthEn: string, year: number = 2026) => {
  const monthMap: Record<string, number> = {
    June: 5, July: 6, August: 7, September: 8, October: 9, November: 10, December: 11,
    January: 0, February: 1, March: 2, April: 3, May: 4
  };
  const monthIndex = monthMap[monthEn];
  if (monthIndex === undefined) return [];
  const actualYear = (monthEn === "January" || monthEn === "February" || monthEn === "March" || monthEn === "April" || monthEn === "May") ? year + 1 : year;
  
  const startDay = (monthEn === "June") ? 15 : 1;
  const tempDate = new Date(actualYear, monthIndex + 1, 0);
  const endDay = tempDate.getDate();
  
  const dates: { dateNum: number; dayMr: string; isSunday: boolean }[] = [];
  const daysMr = ["रवि", "सोम", "मंगळ", "बुध", "गुरु", "शुक्र", "शनि"];
  
  for (let d = startDay; d <= endDay; d++) {
    const dateObj = new Date(actualYear, monthIndex, d);
    const dayName = daysMr[dateObj.getDay()];
    dates.push({
      dateNum: d,
      dayMr: dayName,
      isSunday: dateObj.getDay() === 0
    });
  }
  return dates;
};

const getDefaultDailyPlan = (
  classVal: string, 
  mediumVal: string, 
  subject: string, 
  monthEn: string, 
  dateNum: number,
  dayMr: string
) => {
  const isClass4 = classVal === "4th";
  const isMarathiOrSemi = mediumVal === "Marathi" || mediumVal === "Semi English";
  
  if (isClass4 && isMarathiOrSemi && monthEn === "June") {
    let lookupSubject = subject;
    if (subject.includes("Math") || subject.includes("गणित") || subject.includes("Mathematics")) {
      lookupSubject = "गणित";
    }
    const subjectPlan = CLASS4_JUNE_PLAN[lookupSubject];
    if (subjectPlan && subjectPlan[dateNum]) {
      return subjectPlan[dateNum];
    }
  }
  
  if (dayMr === "रवि" || dayMr === "रवी") {
    return { topic: "-", experience: "-", tools: "-", materials: "-", outcome: "-" };
  }
  
  return { topic: "", experience: "", tools: "", materials: "", outcome: "" };
};

const renderMonthlyCoverPage = (
  m: { en: string; mr: string }, 
  actualYear: number, 
  selectedClass: string | null, 
  classNames: Record<string, { mr: string; en: string }>,
  safeData: { schoolName: string; academicYear: string; classTeacher: string }
) => {
  const classMrName = selectedClass ? (classNames[selectedClass]?.mr || "") : "";
  return (
    <div className="monthly-pdf-page">
      <div className="w-full my-auto flex flex-col justify-center items-center text-center space-y-12">
        <h1 className="text-5xl font-black text-slate-900 tracking-wider font-devanagari mt-10">
          मासिक नियोजन
        </h1>
        <h2 className="text-3xl font-bold text-slate-800 font-devanagari">
          {safeData.academicYear || "२०२६-२०२७"}
        </h2>
        <h3 className="text-3xl font-bold text-slate-800 font-devanagari">
          वर्ग – {classMrName}
        </h3>
        <h3 className="text-3xl font-bold text-slate-800 font-devanagari">
          {m.mr} – {actualYear}
        </h3>
        
        <div className="w-full max-w-lg mx-auto pt-16 space-y-6 text-left">
          <div className="flex items-center gap-3 text-lg font-bold">
            <span className="shrink-0 font-devanagari">• वर्गशिक्षक नाव :</span>
            <span className="border-b-2 border-black flex-1 min-w-[200px] pb-1 font-devanagari text-slate-800">
              {safeData.classTeacher || ""}
            </span>
          </div>
          <div className="flex items-center gap-3 text-lg font-bold">
            <span className="shrink-0 font-devanagari">• शाळेचे नाव :</span>
            <span className="border-b-2 border-black flex-1 min-w-[200px] pb-1 font-devanagari text-slate-800">
              {safeData.schoolName || ""}
            </span>
          </div>
        </div>
      </div>
      
      <div className="mt-12 pt-3 border-t-2 border-amber-900 flex justify-between items-center text-[10px] text-slate-650 font-bold font-devanagari">
        <span>ukguruji app हे play store वरून डाऊनलोड करा.</span>
        <span>Page 1</span>
      </div>
    </div>
  );
};

function AnnualMonthlyPlanningEditor({
  data,
  onChange,
}: {
  data: any;
  onChange: (val: any) => void;
}) {
  const class1WorkingDays: Record<string, number> = {
    June: 13,
    July: 27,
    August: 22,
    September: 14,
    October: 25,
    November: 17,
    December: 24,
    January: 25,
    February: 22,
    March: 24,
    April: 21,
    May: 0
  };

  const class1Periods: Record<string, Record<string, number>> = {
    "मराठी": {
      June: 35, July: 69, August: 51, September: 53, October: 35,
      November: 61, December: 61, January: 67, February: 59, March: 61, April: 56, May: 0
    },
    "गणित": {
      June: 28, July: 56, August: 41, September: 43, October: 28,
      November: 50, December: 50, January: 54, February: 48, March: 50, April: 46, May: 0
    },
    "Mathematics": {
      June: 28, July: 56, August: 41, September: 43, October: 28,
      November: 50, December: 50, January: 54, February: 48, March: 50, April: 46, May: 0
    },
    "इंग्रजी": {
      June: 15, July: 30, August: 22, September: 23, October: 15,
      November: 27, December: 27, January: 29, February: 26, March: 27, April: 25, May: 0
    },
    "English": {
      June: 15, July: 30, August: 22, September: 23, October: 15,
      November: 27, December: 27, January: 29, February: 26, March: 27, April: 25, May: 0
    },
    "खेळू करू शिकू": {
      June: 15, July: 30, August: 22, September: 23, October: 15,
      November: 27, December: 27, January: 29, February: 26, March: 27, April: 25, May: 0
    }
  };

  const getWeeklyPeriods = (subj: string, cls: string): number => {
    const isMr = subj.includes("मराठी");
    const isMath = subj.includes("Math") || subj.includes("गणित") || subj.includes("Mathematics");
    const isEng = subj.includes("इंग्रजी") || subj.includes("English");
    const isHindi = subj.includes("हिंदी") || subj.includes("Hindi");
    const isSci = subj.includes("विज्ञान") || subj.includes("Science") || subj.includes("परिसर अभ्यास १") || subj.includes("Environmental Studies 1");
    const isSoc = subj.includes("समाजशास्त्र") || subj.includes("Social Sciences") || subj.includes("परिसर अभ्यास २") || subj.includes("Environmental Studies 2") || subj.includes("इतिहास") || subj.includes("भूगोल");
    
    if (isMr) {
      if (cls === "1st" || cls === "2nd") return 16;
      if (cls === "3rd" || cls === "4th") return 12;
      return 6;
    }
    if (isHindi) {
      if (cls === "1st" || cls === "2nd" || cls === "3rd" || cls === "4th") return 0;
      return 6;
    }
    if (isEng) {
      if (cls === "1st" || cls === "2nd" || cls === "3rd" || cls === "4th" || cls === "5th") return 7;
      return 6;
    }
    if (isMath) {
      if (cls === "1st" || cls === "2nd") return 13;
      if (cls === "3rd" || cls === "4th") return 9;
      if (cls === "5th") return 8;
      return 7;
    }
    if (isSci) {
      if (cls === "1st" || cls === "2nd") return 0;
      if (cls === "3rd" || cls === "4th" || cls === "5th") return 6;
      return 7;
    }
    if (isSoc) {
      if (cls === "1st" || cls === "2nd") return 0;
      if (cls === "3rd" || cls === "4th" || cls === "5th") return 4;
      if (subj.includes("इतिहास") || subj.includes("भूगोल")) return 3;
      return 6;
    }
    if (subj.includes("खेळू करू शिकू")) {
      if (cls === "1st" || cls === "2nd") return 12;
      if (cls === "3rd" || cls === "4th") return 10;
      if (cls === "5th") return 9;
      return 10;
    }
    if (subj.includes("कला")) {
      if (cls === "1st" || cls === "2nd") return 4;
      if (cls === "3rd" || cls === "4th" || cls === "5th") return 3;
      return 4;
    }
    if (subj.includes("कार्यानुभव")) {
      if (cls === "1st" || cls === "2nd" || cls === "3rd" || cls === "4th") return 4;
      if (cls === "5th") return 3;
      return 2;
    }
    if (subj.includes("शा.शिक्षण")) {
      if (cls === "1st" || cls === "2nd") return 4;
      if (cls === "3rd" || cls === "4th" || cls === "5th") return 3;
      return 4;
    }
    return 3;
  };

  const getPeriodsForMonth = (subj: string, cls: string, monthEn: string): number => {
    const weekly = getWeeklyPeriods(subj, cls);
    const class1Weekly = subj.includes("मराठी") ? 16 : (subj.includes("Math") || subj.includes("गणित") || subj.includes("Mathematics")) ? 13 : 7;
    const lookupSubject = subj.includes("मराठी") ? "मराठी" : (subj.includes("Math") || subj.includes("गणित") || subj.includes("Mathematics")) ? "गणित" : "इंग्रजी";
    const class1Val = class1Periods[lookupSubject]?.[monthEn] || 30;
    return Math.round(class1Val * (weekly / class1Weekly));
  };

  const getCellClass = (colClass: string) => {
    return `text-center ${selectedClass === colClass ? "font-black bg-[#D6B97A]/15 text-slate-900 border-x border-[#D6B97A]/30" : ""}`;
  };

  const [step, setStep] = useState<"class" | "medium" | "planType" | "selectMonth">("class");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedMedium, setSelectedMedium] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [viewingPlan, setViewingPlan] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [planningData, setPlanningData] = useState<Record<string, string>>(() => {
    if (data && typeof data === "object" && data.planningData) return data.planningData;
    return { schoolName: "", academicYear: "2026-27", classTeacher: "" };
  });

  const safeData = {
    schoolName: planningData.schoolName || "",
    academicYear: planningData.academicYear || "2026-27",
    classTeacher: planningData.classTeacher || "",
  };

  const handleDataChange = (key: string, value: string) => {
    const updated = { ...planningData, [key]: value };
    setPlanningData(updated);
    onChange({ ...data, planningData: updated });
  };

  const syllabus = selectedClass && selectedMedium ? getSyllabusData(selectedClass, selectedMedium) : null;
  const subjects = syllabus?.subjects || [];

  const classes = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
  const classNames: Record<string, { mr: string; en: string }> = {
    "1st": { mr: "पहिली", en: "Class 1st" },
    "2nd": { mr: "दुसरी", en: "Class 2nd" },
    "3rd": { mr: "तिसरी", en: "Class 3rd" },
    "4th": { mr: "चौथी", en: "Class 4th" },
    "5th": { mr: "पाचवी", en: "Class 5th" },
    "6th": { mr: "सहावी", en: "Class 6th" },
    "7th": { mr: "सातवी", en: "Class 7th" },
    "8th": { mr: "आठवी", en: "Class 8th" },
  };
  const mediums = [
    { id: "Marathi", title: "Marathi", sub: "मराठी माध्यम", desc: "मराठी माध्यमाचे वार्षिक/मासिक नियोजन" },
    { id: "Semi English", title: "Semi English", sub: "सेमी इंग्रजी", desc: "Semi English medium annual/monthly planning" },
  ];

  const handleDownloadPDF = async (planType: string) => {
    const element = document.getElementById(`planning-pdf-content-${planType}`);
    if (!element) {
      toast.error("Failed to generate PDF: content element not found.");
      return;
    }
    setIsExporting(true);
    let tempWrapper: HTMLDivElement | null = null;
    try {
      // @ts-ignore
      let html2pdfFn = html2pdf;
      // @ts-ignore
      if (html2pdfFn && html2pdfFn.default) { html2pdfFn = html2pdfFn.default; }
      if (typeof html2pdfFn !== 'function') {
        if (typeof window !== 'undefined' && typeof (window as any).html2pdf === 'function') {
          html2pdfFn = (window as any).html2pdf;
        }
      }
      if (typeof html2pdfFn !== 'function') { throw new Error("html2pdf library is not loaded properly."); }

      // Clone the element into a properly-sized off-screen container so html2canvas
      // can measure and render it with correct full dimensions
      // (not zero-size hidden parent which causes bad layout)
      const clone = element.cloneNode(true) as HTMLElement;
      tempWrapper = document.createElement('div');
      tempWrapper.setAttribute('data-pdf-temp', 'true');
      tempWrapper.style.position = 'fixed';
      tempWrapper.style.top = '-99999px';
      tempWrapper.style.left = '0px';
      tempWrapper.style.width = '794px';
      tempWrapper.style.background = 'white';
      tempWrapper.style.zIndex = '-9999';
      tempWrapper.style.overflow = 'visible';
      tempWrapper.style.pointerEvents = 'none';
      tempWrapper.appendChild(clone);
      document.body.appendChild(tempWrapper);

      // Allow browser to fully lay out the cloned element before capturing
      await new Promise((resolve) => setTimeout(resolve, 400));

      const opt = {
        margin: 0,
        filename: `${planType === "annual" ? "Annual" : "Monthly"}_Planning_${selectedClass}_${selectedMedium?.replace(" ", "_")}.pdf`,
        image: { type: 'jpeg' as const, quality: 1.0 },
        html2canvas: {
          scale: 2.5,
          useCORS: true,
          logging: false,
          width: 794,
          windowWidth: 794,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const, compress: true },
        pagebreak: { mode: ['css' as const, 'legacy' as const] },
      };

      await html2pdfFn().set(opt).from(clone).save();
      toast.success('PDF Downloaded Successfully!');
    } catch (err: any) {
      toast.error(`Failed to download PDF: ${err?.message || String(err)}`);
    } finally {
      if (tempWrapper && tempWrapper.parentNode) {
        tempWrapper.parentNode.removeChild(tempWrapper);
      }
      setIsExporting(false);
    }
  };

  const renderPlanningPDFContent = (planType: string) => {
    if (!selectedClass || !selectedMedium || !syllabus) return null;
    return (
      <div
        id={`planning-pdf-content-${planType}`}
        className={`pdf-portrait-layout ${planType !== "annual" ? "no-wrapper-style" : ""} rounded shadow-2xl relative`}
      >
        {/* School Letterhead Header */}
        {!((selectedMedium === "Marathi" || selectedMedium === "Semi English") && planType === "annual") ? (
          <div className="border-b-4 border-slate-950 pb-4 mb-6 text-center space-y-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {safeData.schoolName}
            </h1>
            <h2 className="text-sm font-bold text-slate-655">
              {planType === "annual" ? "वार्षिक अभ्यासक्रम नियोजन आराखडा (सत्र १ व सत्र २)" : "मासिक अभ्यासक्रम नियोजन व उद्दिष्टे"}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Academic Session: {safeData.academicYear}
            </p>
          </div>
        ) : (
          <div className="text-center space-y-2 mb-8 border-b-4 border-slate-950 pb-4">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">वार्षिक नियोजन</h1>
            <h2 className="text-base font-bold text-slate-800">शैक्षणिक वर्ष २०२६ – २०२७</h2>
            <h3 className="text-sm font-bold text-slate-800">इयत्ता – {classNames[selectedClass]?.mr}</h3>
            <div className="flex justify-between text-xs font-bold text-slate-800 px-4 pt-4">
              <div>वर्गशिक्षक नाव – {safeData.classTeacher}</div>
              <div>शाळा - {safeData.schoolName}</div>
            </div>
          </div>
        )}

        {/* Metadata tags */}
        {!((selectedMedium === "Marathi" || selectedMedium === "Semi English") && planType === "annual") && (
          <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6 text-[11px] font-medium text-slate-700">
            <div>
              <span className="font-bold text-slate-400 uppercase text-[9px] block">Standard</span>
              {classNames[selectedClass]?.en} (इयत्ता {classNames[selectedClass]?.mr})
            </div>
            <div>
              <span className="font-bold text-slate-400 uppercase text-[9px] block">Medium</span>
              {selectedMedium} ({selectedMedium === "Semi English" ? "सेमी इंग्रजी" : "मराठी"})
            </div>
            <div>
              <span className="font-bold text-slate-400 uppercase text-[9px] block">Teacher</span>
              {safeData.classTeacher || "—"}
            </div>
            <div>
              <span className="font-bold text-slate-400 uppercase text-[9px] block">Updated At</span>
              {new Date().toLocaleDateString("en-GB")}
            </div>
          </div>
        )}

        {/* Syllabus data sheet tables */}
        {planType === "annual" ? (
          <div className="space-y-10">
            {/* Prefix tables for 1st Class Marathi Medium */}
            {(selectedMedium === "Marathi" || selectedMedium === "Semi English") && (
              <div className="space-y-10">
                {/* Table 1: वार्षिक कामाचे दिवस */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1 text-center">
                    वार्षिक कामाचे दिवस ( सन -२०२६/२०२७ )
                  </h3>
                  <table>
                    <thead>
                      <tr>
                        <th className="text-center">महिना</th>
                        <th className="text-center">सोमवार</th>
                        <th className="text-center">मंगळवार</th>
                        <th className="text-center">बुधवार</th>
                        <th className="text-center">गुरुवार</th>
                        <th className="text-center">शुक्रवार</th>
                        <th className="text-center">शनिवार</th>
                        <th className="text-center">एकूण</th>
                        <th className="text-center">रविवार व सुट्टी</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="font-bold text-center">जून</td>
                        <td className="text-center">३</td>
                        <td className="text-center">३</td>
                        <td className="text-center">२</td>
                        <td className="text-center">२</td>
                        <td className="text-center">१</td>
                        <td className="text-center">२</td>
                        <td className="text-center font-bold">१३</td>
                        <td className="text-center">४ व १३</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-center">जुलै</td>
                        <td className="text-center">४</td>
                        <td className="text-center">४</td>
                        <td className="text-center">५</td>
                        <td className="text-center">५</td>
                        <td className="text-center">५</td>
                        <td className="text-center">४</td>
                        <td className="text-center font-bold">२७</td>
                        <td className="text-center">४</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-center">ऑगस्ट</td>
                        <td className="text-center">४</td>
                        <td className="text-center">४</td>
                        <td className="text-center">३</td>
                        <td className="text-center">४</td>
                        <td className="text-center">३</td>
                        <td className="text-center">४</td>
                        <td className="text-center font-bold">२२</td>
                        <td className="text-center">५ व ४</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-center">सप्टेंबर</td>
                        <td className="text-center">३</td>
                        <td className="text-center">३</td>
                        <td className="text-center">३</td>
                        <td className="text-center">२</td>
                        <td className="text-center">२</td>
                        <td className="text-center">१</td>
                        <td className="text-center font-bold">१४</td>
                        <td className="text-center">४ व १२</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-center">ऑक्टोबर</td>
                        <td className="text-center">४</td>
                        <td className="text-center">३</td>
                        <td className="text-center">४</td>
                        <td className="text-center">५</td>
                        <td className="text-center">४</td>
                        <td className="text-center">५</td>
                        <td className="text-center font-bold">२५</td>
                        <td className="text-center">४ व २</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-center">नोव्हेंबर</td>
                        <td className="text-center">४</td>
                        <td className="text-center">२</td>
                        <td className="text-center">३</td>
                        <td className="text-center">३</td>
                        <td className="text-center">२</td>
                        <td className="text-center">२</td>
                        <td className="text-center font-bold">१७</td>
                        <td className="text-center">५ व ९</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-center">डिसेंबर</td>
                        <td className="text-center">४</td>
                        <td className="text-center">५</td>
                        <td className="text-center">४</td>
                        <td className="text-center">५</td>
                        <td className="text-center">३</td>
                        <td className="text-center">३</td>
                        <td className="text-center font-bold">२४</td>
                        <td className="text-center">४ व ३</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-center">जानेवारी</td>
                        <td className="text-center">४</td>
                        <td className="text-center">४</td>
                        <td className="text-center">४</td>
                        <td className="text-center">३</td>
                        <td className="text-center">५</td>
                        <td className="text-center">५</td>
                        <td className="text-center font-bold">२५</td>
                        <td className="text-center">५ व १</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-center">फेब्रुवारी</td>
                        <td className="text-center">४</td>
                        <td className="text-center">४</td>
                        <td className="text-center">४</td>
                        <td className="text-center">३</td>
                        <td className="text-center">४</td>
                        <td className="text-center">४</td>
                        <td className="text-center font-bold">२२</td>
                        <td className="text-center">४ व २</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-center">मार्च</td>
                        <td className="text-center">५</td>
                        <td className="text-center">४</td>
                        <td className="text-center">४</td>
                        <td className="text-center">४</td>
                        <td className="text-center">३</td>
                        <td className="text-center">४</td>
                        <td className="text-center font-bold">२४</td>
                        <td className="text-center">४ व ३</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-center">एप्रिल</td>
                        <td className="text-center">५</td>
                        <td className="text-center">३</td>
                        <td className="text-center">३</td>
                        <td className="text-center">३</td>
                        <td className="text-center">३</td>
                        <td className="text-center">४</td>
                        <td className="text-center font-bold">२१</td>
                        <td className="text-center">५ व ४</td>
                      </tr>
                      <tr className="bg-slate-100 font-bold">
                        <td className="text-center">एकूण</td>
                        <td className="text-center">४४</td>
                        <td className="text-center">३९</td>
                        <td className="text-center">३९</td>
                        <td className="text-center">३९</td>
                        <td className="text-center">३५</td>
                        <td className="text-center">३८</td>
                        <td className="text-center text-[#D6B97A]">२३४</td>
                        <td className="text-center">५२ व ८५</td>
                      </tr>
                      <tr className="bg-slate-150 font-bold">
                        <td colSpan={7} className="text-right">प्राप्त आठवडे</td>
                        <td colSpan={2} className="text-center text-[#D6B97A]">३८.००</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Table 2: साप्ताहिक तासिका */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1 text-center">
                    साप्ताहिक तासिका – २०२६/२०२७
                  </h3>
                  <table>
                    <thead>
                      <tr>
                        <th>विषय</th>
                        <th className="text-center">१ ली</th>
                        <th className="text-center">२ री</th>
                        <th className="text-center">३ री</th>
                        <th className="text-center">४ थी</th>
                        <th className="text-center">५ वी</th>
                        <th className="text-center">६ वी</th>
                        <th className="text-center">७ वी</th>
                        <th className="text-center">८ वी</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="font-bold">मराठी</td>
                        <td className={getCellClass("1st")}>१६</td>
                        <td className={getCellClass("2nd")}>१६</td>
                        <td className={getCellClass("3rd")}>१२</td>
                        <td className={getCellClass("4th")}>१२</td>
                        <td className={getCellClass("5th")}>६</td>
                        <td className={getCellClass("6th")}>६</td>
                        <td className={getCellClass("7th")}>६</td>
                        <td className={getCellClass("8th")}>६</td>
                      </tr>
                      <tr>
                        <td className="font-bold">हिंदी</td>
                        <td className={getCellClass("1st")}>०</td>
                        <td className={getCellClass("2nd")}>०</td>
                        <td className={getCellClass("3rd")}>०</td>
                        <td className={getCellClass("4th")}>०</td>
                        <td className={getCellClass("5th")}>६</td>
                        <td className={getCellClass("6th")}>६</td>
                        <td className={getCellClass("7th")}>६</td>
                        <td className={getCellClass("8th")}>६</td>
                      </tr>
                      <tr>
                        <td className="font-bold">इंग्रजी</td>
                        <td className={getCellClass("1st")}>७</td>
                        <td className={getCellClass("2nd")}>७</td>
                        <td className={getCellClass("3rd")}>७</td>
                        <td className={getCellClass("4th")}>७</td>
                        <td className={getCellClass("5th")}>७</td>
                        <td className={getCellClass("6th")}>६</td>
                        <td className={getCellClass("7th")}>६</td>
                        <td className={getCellClass("8th")}>६</td>
                      </tr>
                      <tr>
                        <td className="font-bold">गणित</td>
                        <td className={getCellClass("1st")}>१३</td>
                        <td className={getCellClass("2nd")}>१३</td>
                        <td className={getCellClass("3rd")}>९</td>
                        <td className={getCellClass("4th")}>९</td>
                        <td className={getCellClass("5th")}>८</td>
                        <td className={getCellClass("6th")}>७</td>
                        <td className={getCellClass("7th")}>७</td>
                        <td className={getCellClass("8th")}>७</td>
                      </tr>
                      <tr>
                        <td className="font-bold">विज्ञान</td>
                        <td className={getCellClass("1st")}>०</td>
                        <td className={getCellClass("2nd")}>०</td>
                        <td className={getCellClass("3rd")}>६</td>
                        <td className={getCellClass("4th")}>६</td>
                        <td className={getCellClass("5th")}>६</td>
                        <td className={getCellClass("6th")}>७</td>
                        <td className={getCellClass("7th")}>७</td>
                        <td className={getCellClass("8th")}>७</td>
                      </tr>
                      <tr>
                        <td className="font-bold">समाजशास्त्र</td>
                        <td className={getCellClass("1st")}>०</td>
                        <td className={getCellClass("2nd")}>०</td>
                        <td className={getCellClass("3rd")}>४</td>
                        <td className={getCellClass("4th")}>४</td>
                        <td className={getCellClass("5th")}>४</td>
                        <td className={getCellClass("6th")}>६</td>
                        <td className={getCellClass("7th")}>६</td>
                        <td className={getCellClass("8th")}>६</td>
                      </tr>
                      <tr>
                        <td className="font-bold">कला</td>
                        <td className={getCellClass("1st")}>४</td>
                        <td className={getCellClass("2nd")}>४</td>
                        <td className={getCellClass("3rd")}>३</td>
                        <td className={getCellClass("4th")}>३</td>
                        <td className={getCellClass("5th")}>३</td>
                        <td className={getCellClass("6th")}>४</td>
                        <td className={getCellClass("7th")}>४</td>
                        <td className={getCellClass("8th")}>४</td>
                      </tr>
                      <tr>
                        <td className="font-bold">कार्यानुभव</td>
                        <td className={getCellClass("1st")}>४</td>
                        <td className={getCellClass("2nd")}>४</td>
                        <td className={getCellClass("3rd")}>४</td>
                        <td className={getCellClass("4th")}>४</td>
                        <td className={getCellClass("5th")}>३</td>
                        <td className={getCellClass("6th")}>२</td>
                        <td className={getCellClass("7th")}>२</td>
                        <td className={getCellClass("8th")}>२</td>
                      </tr>
                      <tr>
                        <td className="font-bold">शा.शिक्षण</td>
                        <td className={getCellClass("1st")}>४</td>
                        <td className={getCellClass("2nd")}>४</td>
                        <td className={getCellClass("3rd")}>३</td>
                        <td className={getCellClass("4th")}>३</td>
                        <td className={getCellClass("5th")}>३</td>
                        <td className={getCellClass("6th")}>४</td>
                        <td className={getCellClass("7th")}>४</td>
                        <td className={getCellClass("8th")}>४</td>
                      </tr>
                      <tr className="bg-slate-100 font-black">
                        <td>एकूण</td>
                        <td className={getCellClass("1st")}>४८</td>
                        <td className={getCellClass("2nd")}>४८</td>
                        <td className={getCellClass("3rd")}>४८</td>
                        <td className={getCellClass("4th")}>४८</td>
                        <td className={getCellClass("5th")}>४८</td>
                        <td className={getCellClass("6th")}>४८</td>
                        <td className={getCellClass("7th")}>४८</td>
                        <td className={getCellClass("8th")}>४८</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Table 3: अध्ययन निष्पत्ती संख्या */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1 text-center">
                    अध्ययन निष्पत्ती संख्या ( 1 ली ते ८ वी )
                  </h3>
                  <table>
                    <thead>
                      <tr>
                        <th>विषय</th>
                        <th className="text-center">विषय कोड</th>
                        <th className="text-center">1 ली</th>
                        <th className="text-center">२ री</th>
                        <th className="text-center">३ री</th>
                        <th className="text-center">४ थी</th>
                        <th className="text-center">५ वी</th>
                        <th className="text-center">६ वी</th>
                        <th className="text-center">७ वी</th>
                        <th className="text-center">८ वी</th>
                        <th className="text-center">एकूण</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="font-bold">मराठी</td>
                        <td className="text-center">1</td>
                        <td className={getCellClass("1st")}>14</td>
                        <td className={getCellClass("2nd")}>17</td>
                        <td className={getCellClass("3rd")}>14</td>
                        <td className={getCellClass("4th")}>18</td>
                        <td className={getCellClass("5th")}>15</td>
                        <td className={getCellClass("6th")}>28</td>
                        <td className={getCellClass("7th")}>27</td>
                        <td className={getCellClass("8th")}>18</td>
                        <td className="text-center font-bold">151</td>
                      </tr>
                      <tr>
                        <td className="font-bold">हिंदी</td>
                        <td className="text-center">15</td>
                        <td className={getCellClass("1st")}>--</td>
                        <td className={getCellClass("2nd")}>--</td>
                        <td className={getCellClass("3rd")}>--</td>
                        <td className={getCellClass("4th")}>--</td>
                        <td className={getCellClass("5th")}>15</td>
                        <td className={getCellClass("6th")}>13</td>
                        <td className={getCellClass("7th")}>12</td>
                        <td className={getCellClass("8th")}>14</td>
                        <td className="text-center font-bold">54</td>
                      </tr>
                      <tr>
                        <td className="font-bold">इंग्रजी</td>
                        <td className="text-center">17</td>
                        <td className={getCellClass("1st")}>19</td>
                        <td className={getCellClass("2nd")}>16</td>
                        <td className={getCellClass("3rd")}>22</td>
                        <td className={getCellClass("4th")}>23</td>
                        <td className={getCellClass("5th")}>24</td>
                        <td className={getCellClass("6th")}>37</td>
                        <td className={getCellClass("7th")}>73</td>
                        <td className={getCellClass("8th")}>39</td>
                        <td className="text-center font-bold">243</td>
                      </tr>
                      <tr>
                        <td className="font-bold">गणित</td>
                        <td className="text-center">71</td>
                        <td className={getCellClass("1st")}>13</td>
                        <td className={getCellClass("2nd")}>10</td>
                        <td className={getCellClass("3rd")}>13</td>
                        <td className={getCellClass("4th")}>20</td>
                        <td className={getCellClass("5th")}>12</td>
                        <td className={getCellClass("6th")}>31</td>
                        <td className={getCellClass("7th")}>31</td>
                        <td className={getCellClass("8th")}>24</td>
                        <td className="text-center font-bold">154</td>
                      </tr>
                      <tr>
                        <td className="font-bold">प.अभ्यास भाग ०१</td>
                        <td className="text-center">95 A</td>
                        <td className={getCellClass("1st")}>--</td>
                        <td className={getCellClass("2nd")}>--</td>
                        <td className={getCellClass("3rd")}>10</td>
                        <td className={getCellClass("4th")}>18</td>
                        <td className={getCellClass("5th")}>14</td>
                        <td className={getCellClass("6th")}>--</td>
                        <td className={getCellClass("7th")}>--</td>
                        <td className={getCellClass("8th")}>--</td>
                        <td className="text-center font-bold">42</td>
                      </tr>
                      <tr>
                        <td className="font-bold">प.अभ्यास भाग ०२</td>
                        <td className="text-center">95 B</td>
                        <td className={getCellClass("1st")}>--</td>
                        <td className={getCellClass("2nd")}>--</td>
                        <td className={getCellClass("3rd")}>--</td>
                        <td className={getCellClass("4th")}>6</td>
                        <td className={getCellClass("5th")}>5</td>
                        <td className={getCellClass("6th")}>--</td>
                        <td className={getCellClass("7th")}>--</td>
                        <td className={getCellClass("8th")}>--</td>
                        <td className="text-center font-bold">11</td>
                      </tr>
                      <tr>
                        <td className="font-bold">विज्ञान</td>
                        <td className="text-center">72</td>
                        <td className={getCellClass("1st")}>--</td>
                        <td className={getCellClass("2nd")}>--</td>
                        <td className={getCellClass("3rd")}>--</td>
                        <td className={getCellClass("4th")}>--</td>
                        <td className={getCellClass("5th")}>--</td>
                        <td className={getCellClass("6th")}>15</td>
                        <td className={getCellClass("7th")}>23</td>
                        <td className={getCellClass("8th")}>18</td>
                        <td className="text-center font-bold">56</td>
                      </tr>
                      <tr>
                        <td className="font-bold">इतिहास</td>
                        <td className="text-center">73 H</td>
                        <td className={getCellClass("1st")}>--</td>
                        <td className={getCellClass("2nd")}>--</td>
                        <td className={getCellClass("3rd")}>--</td>
                        <td className={getCellClass("4th")}>--</td>
                        <td className={getCellClass("5th")}>--</td>
                        <td className={getCellClass("6th")}>12</td>
                        <td className={getCellClass("7th")}>12</td>
                        <td className={getCellClass("8th")}>13</td>
                        <td className="text-center font-bold">37</td>
                      </tr>
                      <tr>
                        <td className="font-bold">ना.शास्त्र</td>
                        <td className="text-center">73 H</td>
                        <td className={getCellClass("1st")}>--</td>
                        <td className={getCellClass("2nd")}>--</td>
                        <td className={getCellClass("3rd")}>--</td>
                        <td className={getCellClass("4th")}>--</td>
                        <td className={getCellClass("5th")}>--</td>
                        <td className={getCellClass("6th")}>12</td>
                        <td className={getCellClass("7th")}>10</td>
                        <td className={getCellClass("8th")}>10</td>
                        <td className="text-center font-bold">32</td>
                      </tr>
                      <tr>
                        <td className="font-bold">भूगोल</td>
                        <td className="text-center">73 G</td>
                        <td className={getCellClass("1st")}>--</td>
                        <td className={getCellClass("2nd")}>--</td>
                        <td className={getCellClass("3rd")}>--</td>
                        <td className={getCellClass("4th")}>--</td>
                        <td className={getCellClass("5th")}>--</td>
                        <td className={getCellClass("6th")}>23</td>
                        <td className={getCellClass("7th")}>23</td>
                        <td className={getCellClass("8th")}>28</td>
                        <td className="text-center font-bold">74</td>
                      </tr>
                      <tr className="bg-slate-100 font-black text-center">
                        <td className="font-bold text-left">एकूण</td>
                        <td></td>
                        <td className={getCellClass("1st")}>४६</td>
                        <td className={getCellClass("2nd")}>४३</td>
                        <td className={getCellClass("3rd")}>५९</td>
                        <td className={getCellClass("4th")}>८५</td>
                        <td className={getCellClass("5th")}>८५</td>
                        <td className={getCellClass("6th")}>१७१</td>
                        <td className={getCellClass("7th")}>२११</td>
                        <td className={getCellClass("8th")}>१५४</td>
                        <td className="font-bold text-[#D6B97A]">८५४</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Force a page break for the detailed planning subject tables */}
                <div className="pdf-page-break" />
              </div>
            )}

            {syllabus?.subjects
              .filter(subject => !selectedSubject || subject === selectedSubject)
              .map(subject => {
                const isClass1Mr = selectedMedium === "Marathi" || selectedMedium === "Semi English";
                return (
                  <div key={subject} className="space-y-3">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b-2 border-slate-300 pb-1">
                      {isClass1Mr 
                        ? `वार्षिक नियोजन सन - २०२६/२०२७ (इयत्ता – ${classNames[selectedClass]?.mr} | विषय – ${subject})`
                        : `विषय (Subject) — ${subject}`
                      }
                    </h3>
                    <table>
                      <thead>
                        <tr>
                          <th className="w-[100px] text-center">
                            {isClass1Mr ? "महिना" : "महिना (Month)"}
                          </th>
                          <th className="w-[70px] text-center">
                            {isClass1Mr ? "कामाचे दिवस" : "कामाचे दिवस (Days)"}
                          </th>
                          <th className="w-[70px] text-center">
                            {isClass1Mr ? "प्राप्त तासिका" : "प्राप्त तासिका (Periods)"}
                          </th>
                          <th>
                            {isClass1Mr ? "घटक" : "घटक (Topics)"}
                          </th>
                          <th className="w-[70px] text-center">
                            {isClass1Mr ? "पुरा /अपुरा" : "पुर्ण / अपुर्ण"}
                          </th>
                          <th className="w-[85px] text-center">
                            {isClass1Mr ? "शिक्षक स्वाक्षरी" : "शिक्षक स्वाक्षरी"}
                          </th>
                          <th className="w-[100px] text-center">
                            {isClass1Mr ? "मुख्याध्यापक स्वाक्षरी" : "मुख्याध्यापक स्वाक्षरी"}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {syllabus.months.map(m => {
                          const monthData = (syllabus.syllabusBySubject[subject]?.[m.en] || { topic: "—", objectives: "—", activity: "—" }) as any;
                          const workingDays = isClass1Mr ? class1WorkingDays[m.en] : (monthData.workingDays || (m.en === "June" ? 13 : m.en === "September" ? 14 : m.en === "November" ? 17 : m.en === "April" ? 21 : m.en === "February" ? 22 : (m.en === "December" || m.en === "March") ? 24 : 25));
                          const defaultPeriods = subject.includes("मराठी") ? 60 : (subject.includes("Math") || subject.includes("गणित") || subject.includes("Mathematics")) ? 50 : 30;
                          const periods = isClass1Mr ? (getPeriodsForMonth(subject, selectedClass, m.en) || 30) : (monthData.periods || defaultPeriods);
                          
                          const extraRow = (m.en === "November" && isClass1Mr) ? (
                            <tr key="diwali-holiday">
                              <td colSpan={7} className="bg-slate-50 text-center font-bold text-slate-800 text-xs py-3">
                                सराव व प्रथम सत्र संकलित मूल्यमापन – दिवाळी सुट्टी
                              </td>
                            </tr>
                          ) : null;

                          const monthKeyTopic = `${selectedClass}_${selectedMedium}_${subject}_${m.en}_topic`;
                          const monthKeyDays = `${selectedClass}_${selectedMedium}_${subject}_${m.en}_workingDays`;
                          const monthKeyPeriods = `${selectedClass}_${selectedMedium}_${subject}_${m.en}_periods`;

                          const currentTopic = planningData[monthKeyTopic] !== undefined ? planningData[monthKeyTopic] : monthData.topic;
                          const currentWorkingDays = planningData[monthKeyDays] !== undefined ? planningData[monthKeyDays] : workingDays;
                          const currentPeriods = planningData[monthKeyPeriods] !== undefined ? planningData[monthKeyPeriods] : periods;

                          return (
                            <React.Fragment key={m.en}>
                              {extraRow}
                              <tr>
                                <td className="font-bold text-slate-900 text-center">
                                  {m.mr} {isClass1Mr ? (m.en === "June" || m.en === "July" || m.en === "August" || m.en === "September" || m.en === "October" || m.en === "November" || m.en === "December" ? "२०२६" : "२०२७") : ""}
                                </td>
                                <td className="text-center font-bold text-slate-700 p-1">
                                  <input
                                    type="text"
                                    className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none text-center font-bold text-slate-700 p-0 m-0"
                                    value={currentWorkingDays}
                                    onChange={(e) => handleDataChange(monthKeyDays, e.target.value)}
                                  />
                                </td>
                                <td className="text-center font-bold text-slate-700 p-1">
                                  <input
                                    type="text"
                                    className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none text-center font-bold text-slate-700 p-0 m-0"
                                    value={currentPeriods}
                                    onChange={(e) => handleDataChange(monthKeyPeriods, e.target.value)}
                                  />
                                </td>
                                <td className="text-slate-750 font-medium p-1">
                                  <textarea
                                    rows={2}
                                    className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none text-slate-750 font-medium resize-none p-0 m-0"
                                    value={currentTopic}
                                    onChange={(e) => handleDataChange(monthKeyTopic, e.target.value)}
                                  />
                                </td>
                                <td className="text-slate-450 text-center"></td>
                                <td className="text-slate-450 text-center"></td>
                                <td className="text-slate-450 text-center"></td>
                              </tr>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                      {isClass1Mr && (
                        <tfoot>
                          <tr className="bg-slate-100 font-bold">
                            <td className="text-center">एकूण</td>
                            <td className="text-center">२३४</td>
                            <td className="text-center text-[#D6B97A]">
                              {getWeeklyPeriods(subject, selectedClass) * 38 || "—"}
                            </td>
                            <td colSpan={4}></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="space-y-8 print:space-y-0">
            {syllabus?.months
              .filter((m) => planType === "monthly" || m.en === planType)
              .map((m) => {
                const actualYear = (m.en === "January" || m.en === "February" || m.en === "March" || m.en === "April") ? 2027 : 2026;
                const dates = getDatesForMonth(m.en, actualYear);

                return (
                  <React.Fragment key={m.en}>
                    {/* Page 1: Cover Page */}
                    {renderMonthlyCoverPage(m, actualYear, selectedClass, classNames, safeData)}

                    {/* Subsequent pages: one for each subject */}
                    {subjects
                      .filter((subject) => !selectedSubject || subject === selectedSubject)
                      .map((subject, sIdx) => {
                        const pageNum = sIdx + 2;
                        return (
                          <div key={subject} className="monthly-pdf-page font-devanagari">
                            <div className="w-full flex flex-col space-y-4 mb-auto">
                              {/* Page Header */}
                              <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2">
                                <div className="text-left">
                                  <h2 className="text-lg font-black text-slate-900 font-devanagari">
                                    दैनिक टाचण / नियोजन
                                  </h2>
                                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                    विषय – {subject} | वर्ग – {classNames[selectedClass]?.mr}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-bold text-slate-800 font-devanagari">
                                    महिना: {m.mr} – {actualYear}
                                  </p>
                                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">
                                    Academic Session: {safeData.academicYear}
                                  </p>
                                </div>
                              </div>

                              {/* Daily Planning Table */}
                              <div className="w-full overflow-x-auto">
                                <table className="monthly-planning-table">
                                  <thead>
                                    <tr>
                                      <th className="w-[45px] text-center">दि.</th>
                                      <th className="w-[35px] text-center">वार</th>
                                      <th className="w-[155px]">अध्ययन मुद्दा / पाठ्यांश</th>
                                      <th className="w-[175px]">अध्ययन अनुभव स्वरूप</th>
                                      <th className="w-[90px]">मूल्यमापनाची साधन तंत्रे</th>
                                      <th className="w-[90px]">आवश्यक साहित्य</th>
                                      <th className="w-[144px]">अध्ययन निष्पत्ती</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {dates.map((date) => {
                                      const plan = getDefaultDailyPlan(selectedClass, selectedMedium, subject, m.en, date.dateNum, date.dayMr);
                                      const isHoliday = !!plan.isHolidayText || date.isSunday;
                                      const holidayText = date.isSunday ? "रविवार सुट्टी" : plan.isHolidayText;

                                      const tKey = `${selectedClass}_${selectedMedium}_${subject}_${m.en}_${date.dateNum}_topic`;
                                      const eKey = `${selectedClass}_${selectedMedium}_${subject}_${m.en}_${date.dateNum}_experience`;
                                      const tlKey = `${selectedClass}_${selectedMedium}_${subject}_${m.en}_${date.dateNum}_tools`;
                                      const mKey = `${selectedClass}_${selectedMedium}_${subject}_${m.en}_${date.dateNum}_materials`;
                                      const oKey = `${selectedClass}_${selectedMedium}_${subject}_${m.en}_${date.dateNum}_outcome`;

                                      const valTopic = planningData[tKey] !== undefined ? planningData[tKey] : plan.topic;
                                      const valExperience = planningData[eKey] !== undefined ? planningData[eKey] : plan.experience;
                                      const valTools = planningData[tlKey] !== undefined ? planningData[tlKey] : plan.tools;
                                      const valMaterials = planningData[mKey] !== undefined ? planningData[mKey] : plan.materials;
                                      const valOutcome = planningData[oKey] !== undefined ? planningData[oKey] : plan.outcome;

                                      const dateStr = `${date.dateNum < 10 ? "०" : ""}${date.dateNum}/${m.en === "June" ? "०६" : 
                                                       m.en === "July" ? "०७" : 
                                                       m.en === "August" ? "०८" : 
                                                       m.en === "September" ? "०९" : 
                                                       m.en === "October" ? "१०" : 
                                                       m.en === "November" ? "११" : 
                                                       m.en === "December" ? "१२" : 
                                                       m.en === "January" ? "०१" : 
                                                       m.en === "February" ? "०२" : 
                                                       m.en === "March" ? "०३" : 
                                                       m.en === "April" ? "०४" : "०५"}`;

                                      return (
                                        <tr key={date.dateNum} className={date.isSunday ? "bg-red-50/20" : ""}>
                                          <td className="text-center font-bold text-slate-800">{dateStr}</td>
                                          <td className="text-center font-bold text-slate-700">{date.dayMr}</td>
                                          {isHoliday ? (
                                            <td colSpan={5} className="text-center font-bold text-red-600 bg-red-50/10 py-1 font-devanagari">
                                              {holidayText}
                                            </td>
                                          ) : (
                                            <>
                                              <td className="p-1">
                                                <textarea
                                                  rows={2}
                                                  value={valTopic}
                                                  onChange={(e) => handleDataChange(tKey, e.target.value)}
                                                  className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none p-0 m-0 resize-none font-devanagari text-[10px] leading-tight"
                                                />
                                              </td>
                                              <td className="p-1">
                                                <textarea
                                                  rows={2}
                                                  value={valExperience}
                                                  onChange={(e) => handleDataChange(eKey, e.target.value)}
                                                  className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none p-0 m-0 resize-none font-devanagari text-[10px] leading-tight"
                                                />
                                              </td>
                                              <td className="p-1">
                                                <textarea
                                                  rows={2}
                                                  value={valTools}
                                                  onChange={(e) => handleDataChange(tlKey, e.target.value)}
                                                  className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none p-0 m-0 resize-none font-devanagari text-[10px] leading-tight"
                                                />
                                              </td>
                                              <td className="p-1">
                                                <textarea
                                                  rows={2}
                                                  value={valMaterials}
                                                  onChange={(e) => handleDataChange(mKey, e.target.value)}
                                                  className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none p-0 m-0 resize-none font-devanagari text-[10px] leading-tight"
                                                />
                                              </td>
                                              <td className="p-1">
                                                <textarea
                                                  rows={2}
                                                  value={valOutcome}
                                                  onChange={(e) => handleDataChange(oKey, e.target.value)}
                                                  className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none p-0 m-0 resize-none font-devanagari text-[10px] leading-tight"
                                                />
                                              </td>
                                            </>
                                          )}
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Signature & Footer Block */}
                            <div className="mt-4">
                              <div className="grid grid-cols-2 gap-4 text-center font-bold text-slate-700 mb-2">
                                <div>वर्गशिक्षक स्वाक्षरी</div>
                                <div>मुख्याध्यापक स्वाक्षरी</div>
                              </div>
                              <div className="pt-2 border-t border-amber-900 flex justify-between items-center text-[10px] text-slate-650 font-bold">
                                <span>ukguruji app हे play store वरून डाऊनलोड करा.</span>
                                <span>Page {pageNum}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </React.Fragment>
                );
              })}
          </div>
        )}
      </div>
    );
  };

  const stepsList = [
    { id: "class", label: "वर्ग", en: "Class" },
    { id: "medium", label: "माध्यम", en: "Medium" },
    { id: "planType", label: "प्रकार", en: "Plan Type" },
  ] as const;

  return (
    <div className="space-y-12">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700;900&display=swap');

        .font-devanagari {
          font-family: 'Noto Sans Devanagari', sans-serif !important;
        }

        .pdf-portrait-layout {
          width: 794px !important;
          max-width: 794px !important;
          padding: 30px !important;
          background-color: white !important;
          color: black !important;
          border: none !important;
          box-shadow: none !important;
          font-family: 'Inter', 'Noto Sans Devanagari', sans-serif !important;
        }
        .pdf-portrait-layout.no-wrapper-style {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
          width: 794px !important;
          max-width: 794px !important;
        }
        .pdf-portrait-layout table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin-bottom: 20px !important;
        }
        .pdf-portrait-layout th, .pdf-portrait-layout td {
          border: 1px solid #cbd5e1 !important;
          padding: 8px 10px !important;
          font-size: 11px !important;
          line-height: 1.4 !important;
          text-align: left !important;
          color: #1e293b !important;
        }
        .pdf-portrait-layout td.text-center, .pdf-portrait-layout th.text-center {
          text-align: center !important;
        }
        .pdf-portrait-layout th {
          background-color: #f1f5f9 !important;
          font-weight: bold !important;
          color: #0f172a !important;
        }
        .pdf-portrait-layout td input, .pdf-portrait-layout td textarea {
          width: 100% !important;
          border: none !important;
          background: transparent !important;
          font-family: inherit !important;
          font-size: inherit !important;
          font-weight: inherit !important;
          color: inherit !important;
          padding: 0 !important;
          margin: 0 !important;
          resize: none !important;
          box-shadow: none !important;
          outline: none !important;
        }
        .pdf-portrait-layout td input:hover, .pdf-portrait-layout td textarea:hover {
          background-color: rgba(214, 185, 122, 0.05) !important;
        }
        .pdf-portrait-layout td input:focus, .pdf-portrait-layout td textarea:focus {
          background-color: rgba(214, 185, 122, 0.1) !important;
        }
        .pdf-page-break {
          page-break-before: always !important;
          break-before: page !important;
        }

        /* Monthly Daily Planning PDF Page Styles */
        .monthly-pdf-page {
          width: 794px !important;
          min-height: 1123px !important;
          padding: 30px !important;
          box-sizing: border-box !important;
          border: 4px double black !important;
          background-color: white !important;
          color: black !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          page-break-after: always !important;
          break-after: page !important;
          position: relative !important;
          margin-bottom: 30px !important;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1) !important;
        }
        @media print {
          .monthly-pdf-page {
            height: 297mm !important;
            max-height: 297mm !important;
            margin-bottom: 0 !important;
            box-shadow: none !important;
          }
        }
        .monthly-planning-table {
          width: 100% !important;
          border-collapse: collapse !important;
          table-layout: fixed !important;
        }
        .monthly-planning-table th, .monthly-planning-table td {
          border: 1px solid black !important;
          font-size: 10px !important;
          padding: 3px 4px !important;
          line-height: 1.25 !important;
          vertical-align: top !important;
        }
        .monthly-planning-table th {
          background-color: #f8fafc !important;
          font-weight: bold !important;
          text-align: center !important;
        }
        .monthly-planning-table td textarea {
          width: 100% !important;
          border: none !important;
          background: transparent !important;
          font-family: inherit !important;
          font-size: inherit !important;
          color: inherit !important;
          resize: none !important;
          outline: none !important;
          padding: 0 !important;
          margin: 0 !important;
          overflow: hidden !important;
          line-height: inherit !important;
        }
        .monthly-planning-table td textarea:focus {
          background-color: rgba(214, 185, 122, 0.1) !important;
        }
      `}</style>

      {/* Progress Breadcrumbs */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gradient-to-r from-violet-50 to-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100/50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            <BookCheck className="size-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Planning Progress</h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {step === "class" && "Selecting Standard"}
              {step === "medium" && selectedClass && `Class: ${classNames[selectedClass as string]?.mr} | Selecting Medium`}
            </p>
          </div>
        </div>

        {/* Step Circles */}
        <div className="flex items-center gap-2 sm:gap-4 select-none">
          {stepsList.map((s, idx) => {
            const stepsOrder = ["class", "medium", "planType", "selectMonth"];
            const stepIndex = stepsOrder.indexOf(step);
            const thisIndex = stepsOrder.indexOf(s.id);
            const isCompleted = thisIndex < stepIndex;
            const isActive = s.id === step || (s.id === "planType" && step === "selectMonth");

            return (
              <React.Fragment key={s.id}>
                {idx > 0 && (
                  <div className={`h-1 w-6 sm:w-12 rounded ${isCompleted ? "bg-[#8b5cf6]" : "bg-slate-200"}`} />
                )}
                <button
                  disabled={thisIndex > stepIndex && !selectedClass}
                  onClick={() => {
                    if (s.id === "class") {
                      setStep("class");
                    } else if (s.id === "medium" && selectedClass) {
                      setStep("medium");
                    } else if (s.id === "planType" && selectedMedium) {
                      setStep("planType");
                    }
                  }}
                  className={`size-10 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    isActive 
                      ? "bg-[#8b5cf6] text-white ring-4 ring-[#8b5cf6]/20 scale-110 shadow-lg" 
                      : isCompleted 
                        ? "bg-indigo-900 text-white hover:bg-indigo-800" 
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                  title={s.en}
                >
                  {isCompleted ? <Check className="size-4" /> : idx + 1}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Wizard Content */}
      <AnimatePresence mode="wait">

        {step === "class" && (
          <motion.div
            key="class"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Select Class / इयत्ता निवडा</h2>
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Step 2: Choose the target standard</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {classes.map((cls, idx) => {
                const isSelected = selectedClass === cls;
                return (
                  <motion.button
                    key={cls}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => {
                      setSelectedClass(cls);
                      setStep("medium");
                    }}
                    className={`group p-8 rounded-[2.5rem] border text-center transition-all duration-500 shadow-md hover:shadow-[0_20px_45px_rgba(139,92,246,0.3)] cursor-pointer relative overflow-hidden flex flex-col items-center gap-4 ${
                      isSelected 
                        ? "bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] text-white border-2 border-white ring-4 ring-indigo-400 scale-[1.03] shadow-[0_25px_50px_rgba(139,92,246,0.45)]" 
                        : "bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] text-white border-[#7c3aed]/30 hover:scale-[1.02]"
                    }`}
                  >
                    <div className="absolute -bottom-6 -right-6 size-24 text-white/5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                      </svg>
                    </div>

                    <div className="size-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform text-white font-black text-sm uppercase">
                      {cls}
                    </div>
                    <div>
                      <h4 className="font-black text-lg text-white">इयत्ता {classNames[cls]?.mr}</h4>
                      <p className="text-[10px] text-violet-100/70 font-black uppercase tracking-widest mt-1">
                        {classNames[cls]?.en}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-violet-200 mt-2 opacity-80 group-hover:opacity-100 transition-opacity">
                      प्रवेश करा <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {step === "medium" && (
          <motion.div
            key="medium"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Select Medium / माध्यम निवडा</h2>
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                Class: {selectedClass ? `${classNames[selectedClass as string]?.mr} (${classNames[selectedClass as string]?.en})` : ""}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-2xl mx-auto">
              {mediums.map((m) => {
                const isSelected = selectedMedium === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedMedium(m.id);
                      setStep("planType");
                    }}
                    className={`group p-10 rounded-[3rem] border text-left transition-all duration-500 shadow-md hover:shadow-[0_20px_45px_rgba(139,92,246,0.3)] cursor-pointer relative overflow-hidden flex items-start gap-6 ${
                      isSelected 
                        ? "bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] text-white border-2 border-white ring-4 ring-indigo-400 scale-[1.02] shadow-[0_25px_50px_rgba(139,92,246,0.45)]" 
                        : "bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] text-white border-[#7c3aed]/30 hover:scale-[1.01]"
                    }`}
                  >
                    <div className="size-14 rounded-2xl flex items-center justify-center border border-white/20 bg-white/10 backdrop-blur-sm group-hover:scale-110 transition-transform text-white font-black text-base uppercase shrink-0">
                      {m.title[0]}
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-black text-xl text-white">{m.sub}</h4>
                      <p className="text-[10px] font-black uppercase tracking-widest text-violet-200 mt-1">
                        {m.title} Medium
                      </p>
                      <p className="text-xs font-medium text-violet-100/70">
                        {m.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-center gap-6 pt-4">
              <button
                onClick={() => setStep("class")}
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-900 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                <ChevronLeft className="size-4" /> मागे जा / Back
              </button>
            </div>
          </motion.div>
        )}


        {step === "planType" && (
          <motion.div
            key="planType"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Select Type / प्रकार निवडा</h2>
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                Class: {selectedClass ? `${classNames[selectedClass as string]?.mr}` : ""} | Medium: {selectedMedium}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="size-7 rounded-full bg-[#8b5cf6] text-white flex items-center justify-center font-black text-xs">3</div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800">
                PLANNING FILES / नियोजन फाइल्स
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Annual Planning Card */}
              <div className="flex flex-col justify-between p-8 bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] text-white rounded-[2.5rem] border border-[#7c3aed]/30 shadow-md hover:shadow-[0_20px_45px_rgba(139,92,246,0.3)] hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group">
                <div className="absolute -bottom-6 -right-6 size-24 text-white/5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>

                <div className="space-y-4">
                  <div className="size-12 rounded-2xl flex items-center justify-center border border-white/20 bg-white/10 backdrop-blur-sm group-hover:scale-110 transition-transform text-white">
                    <BookOpen className="size-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-black text-white leading-snug">Annual Planning</p>
                    <p className="text-[11px] text-violet-100/70 font-semibold mt-1">वार्षिक नियोजन | इयत्ता {classNames[selectedClass as string]?.mr}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6 relative z-10">
                  <button
                    type="button"
                    onClick={() => setViewingPlan("annual")}
                    className="py-3 px-4 bg-white/10 border border-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider hover:bg-white hover:text-indigo-900 transition-all cursor-pointer text-center backdrop-blur-sm"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadPDF("annual")}
                    className="py-3 px-4 bg-white text-indigo-900 rounded-2xl text-[10px] font-black uppercase tracking-wider hover:bg-violet-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="size-3.5" />
                    Download
                  </button>
                </div>
              </div>

              {/* Monthly Planning Card */}
              <div className="flex flex-col justify-between p-8 bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] text-white rounded-[2.5rem] border border-[#7c3aed]/30 shadow-md hover:shadow-[0_20px_45px_rgba(139,92,246,0.3)] hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group">
                <div className="absolute -bottom-6 -right-6 size-24 text-white/5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>

                <div className="space-y-4">
                  <div className="size-12 rounded-2xl flex items-center justify-center border border-white/20 bg-white/10 backdrop-blur-sm group-hover:scale-110 transition-transform text-white">
                    <BookOpen className="size-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-black text-white leading-snug">Monthly Planning</p>
                    <p className="text-[11px] text-violet-100/70 font-semibold mt-1">मासिक नियोजन | इयत्ता {classNames[selectedClass as string]?.mr}</p>
                  </div>
                </div>

                <div className="mt-6 relative z-10">
                  <button
                    type="button"
                    onClick={() => setStep("selectMonth")}
                    className="w-full py-3 px-4 bg-white text-indigo-900 rounded-2xl text-[10px] font-black uppercase tracking-wider hover:bg-violet-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Calendar className="size-3.5" />
                    Select Month / महिना निवडा
                  </button>
                </div>
              </div>

              {/* Question Bank Card */}
              <div className="flex flex-col justify-between p-8 bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] text-white rounded-[2.5rem] border border-[#7c3aed]/30 shadow-md hover:shadow-[0_20px_45px_rgba(139,92,246,0.3)] hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group">
                <div className="absolute -bottom-6 -right-6 size-24 text-white/5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>

                <div className="space-y-4">
                  <div className="size-12 rounded-2xl flex items-center justify-center border border-white/20 bg-white/10 backdrop-blur-sm group-hover:scale-110 transition-transform text-white">
                    <BookOpen className="size-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-black text-white leading-snug">Question Bank</p>
                    <p className="text-[11px] text-violet-100/70 font-semibold mt-1">प्रश्नपेढी | इयत्ता {classNames[selectedClass as string]?.mr}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6 relative z-10">
                  <button
                    type="button"
                    onClick={() => window.location.href = `/teacher/modules/question-bank?class=${selectedClass}&medium=${selectedMedium}`}
                    className="py-3 px-4 bg-white/10 border border-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider hover:bg-white hover:text-indigo-900 transition-all cursor-pointer text-center backdrop-blur-sm"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => window.location.href = `/teacher/modules/question-bank?class=${selectedClass}&medium=${selectedMedium}`}
                    className="py-3 px-4 bg-white text-indigo-900 rounded-2xl text-[10px] font-black uppercase tracking-wider hover:bg-violet-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="size-3.5" />
                    Open
                  </button>
                </div>
              </div>
            </div>

            {/* Hidden elements for direct PDF download without viewing */}
            <div className="hidden absolute opacity-0 pointer-events-none w-0 h-0 overflow-hidden" style={{ zIndex: -9999 }}>
               {selectedClass && selectedMedium && (
                 <>
                   {renderPlanningPDFContent("annual")}
                   {renderPlanningPDFContent("monthly")}
                   {syllabus?.months.map((m) => (
                     <React.Fragment key={m.en}>
                       {renderPlanningPDFContent(m.en)}
                     </React.Fragment>
                   ))}
                 </>
               )}
            </div>

            <div className="flex justify-center gap-6 pt-4">
              <button
                onClick={() => setStep("medium")}
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-900 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                <ChevronLeft className="size-4" /> मागे जा / Back
              </button>
            </div>
          </motion.div>
        )}

        {step === "selectMonth" && (
          <motion.div
            key="selectMonth"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Select Month / महिना निवडा</h2>
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                Class: {selectedClass ? `${classNames[selectedClass as string]?.mr}` : ""} | Medium: {selectedMedium}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {syllabus?.months.map((m) => (
                <div
                  key={m.en}
                  className="bg-white border border-slate-200 p-4 rounded-3xl shadow-sm flex flex-col justify-between items-center text-center gap-3 hover:shadow-md transition-all duration-300 transform hover:scale-[1.03]"
                >
                  <div>
                    <h4 className="font-black text-sm text-slate-900">{m.mr}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{m.en}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <button
                      type="button"
                      onClick={() => setViewingPlan(m.en)}
                      className="py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[9px] font-bold transition-all cursor-pointer text-center"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadPDF(m.en)}
                      className="py-1.5 px-2 bg-[#D6B97A] hover:bg-[#c4a661] text-white rounded-xl text-[9px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-6 pt-4">
              <button
                onClick={() => setStep("planType")}
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-900 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                <ChevronLeft className="size-4" /> मागे जा / Back
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Modal viewer for PDF preview */}
      {viewingPlan && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-[3rem] max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl text-slate-800 font-sans"
          >
            {/* Modal Controls header */}
            <div className="flex items-center justify-between p-6 md:p-8 border-b border-slate-200 bg-white/85 sticky top-0 backdrop-blur z-10">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-[#D6B97A]/20 flex items-center justify-center text-[#D6B97A]">
                  <Eye className="size-4" />
                </div>
                <div>
                  <h3 className="font-black text-base text-[#D6B97A]">
                    {viewingPlan === "annual" ? "Annual Planning Preview (वार्षिक नियोजन)" : "Monthly Planning Preview (मासिक नियोजन)"}
                  </h3>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">
                    Class: {selectedClass ? classNames[selectedClass as string]?.mr : ""} | Medium: {selectedMedium}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleDownloadPDF(viewingPlan)}
                  disabled={isExporting}
                  className="px-6 py-3 bg-[#D6B97A] hover:bg-[#c4a661] text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Download className="size-3.5" /> Download
                </button>
                <button
                  onClick={() => setViewingPlan(null)}
                  className="size-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer border border-slate-200"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Config panel / Dynamic Editor inputs */}
            <div className="bg-slate-50 p-6 md:p-8 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">School Name / शाळेचे नाव</label>
                <input
                  type="text"
                  value={safeData.schoolName}
                  onChange={(e) => handleDataChange("schoolName", e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-[#D6B97A] outline-none"
                  placeholder="Enter School Name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Academic Year / शैक्षणिक वर्ष</label>
                <input
                  type="text"
                  value={safeData.academicYear}
                  onChange={(e) => handleDataChange("academicYear", e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-[#D6B97A] outline-none"
                  placeholder="Enter Year"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Class Teacher / वर्गशिक्षक</label>
                <input
                  type="text"
                  value={safeData.classTeacher}
                  onChange={(e) => handleDataChange("classTeacher", e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-[#D6B97A] outline-none"
                  placeholder="Enter Teacher Name"
                />
              </div>
            </div>

            {/* Document sheet container with print mockup */}
            <div className="flex-1 overflow-y-auto p-8 md:p-12 bg-slate-100 flex justify-center">
              {renderPlanningPDFContent(viewingPlan)}
            </div>
          </motion.div>
        </div>
      )}

      {/* Off-screen/hidden container for direct PDF downloads */}
      <div 
        style={{ 
          position: "absolute", 
          left: "-9999px", 
          top: "-9999px", 
          width: "0px", 
          height: "0px", 
          overflow: "hidden",
          pointerEvents: "none"
        }}
      >
        {selectedClass && selectedMedium && syllabus && (
          <>
            {renderPlanningPDFContent("annual")}
            {syllabus.months.map(m => (
              <React.Fragment key={m.en}>
                {renderPlanningPDFContent(m.en)}
              </React.Fragment>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function TeachingDiaryManager({
  data,
  onChange,
}: {
  data: any;
  onChange: (val: any) => void;
}) {
  const [step, setStep] = useState<"hub" | "classes" | "months" | "files">("hub");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [diaries, setDiaries] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const classes = [
    "Class 1",
    "Class 2",
    "Class 3",
    "Class 4",
    "Class 5",
    "Class 6",
    "Class 7",
    "Class 8",
  ];

  const months = [
    { en: "June", mr: "जून" },
    { en: "July", mr: "जुलै" },
    { en: "August", mr: "ऑगस्ट" },
    { en: "September", mr: "सप्टेंबर" },
    { en: "October", mr: "ऑक्टोबर" },
    { en: "November", mr: "नोव्हेंबर" },
    { en: "December", mr: "डिसेंबर" },
    { en: "January", mr: "जानेवारी" },
    { en: "February", mr: "फेब्रुवारी" },
    { en: "March", mr: "मार्च" },
    { en: "April", mr: "एप्रिल" },
    { en: "May", mr: "मे" },
  ];

  useEffect(() => {
    if (step === "files" && selectedClass && selectedMonth) {
      const fetchDiaries = async () => {
        setLoading(true);
        try {
          const { collection, getDocs, query, where } = await import(
            "firebase/firestore"
          );
          const q = query(
            collection(db, "admin_teaching_diaries"),
            where("className", "==", selectedClass),
            where("month", "==", selectedMonth)
          );
          const snapshot = await getDocs(q);
          const list = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setDiaries(list);
        } catch (err) {
          console.error("Error fetching teaching diaries:", err);
          toast.error("Failed to load teaching diaries.");
        } finally {
          setLoading(false);
        }
      };
      fetchDiaries();
    }
  }, [step, selectedClass, selectedMonth]);

  const selectedMonthData = months.find((m) => m.en === selectedMonth);
  const selectedMonthMarathi = selectedMonthData ? selectedMonthData.mr : "";

  const classColors = [
    "from-amber-500 to-orange-600",
    "from-indigo-500 to-blue-600",
    "from-emerald-500 to-teal-600",
    "from-rose-500 to-pink-600",
    "from-purple-500 to-violet-600",
    "from-cyan-500 to-sky-600",
    "from-slate-600 to-slate-800",
    "from-fuchsia-500 to-pink-700",
  ];

  const monthColors = [
    "from-rose-500/10 to-pink-500/5 hover:from-rose-500/20 hover:to-pink-500/10 text-rose-700 border-rose-200/40",
    "from-orange-500/10 to-amber-500/5 hover:from-orange-500/20 hover:to-amber-500/10 text-orange-700 border-orange-200/40",
    "from-amber-500/10 to-yellow-500/5 hover:from-amber-500/20 hover:to-yellow-500/10 text-amber-700 border-amber-200/40",
    "from-emerald-500/10 to-teal-500/5 hover:from-emerald-500/20 hover:to-teal-500/10 text-emerald-700 border-emerald-200/40",
    "from-teal-500/10 to-cyan-500/5 hover:from-teal-500/20 hover:to-cyan-500/10 text-teal-700 border-teal-200/40",
    "from-sky-500/10 to-blue-500/5 hover:from-sky-500/20 hover:to-blue-500/10 text-sky-700 border-sky-200/40",
    "from-indigo-500/10 to-violet-500/5 hover:from-indigo-500/20 hover:to-violet-500/10 text-indigo-700 border-indigo-200/40",
    "from-violet-500/10 to-purple-500/5 hover:from-violet-500/20 hover:to-purple-500/10 text-violet-700 border-violet-200/40",
    "from-fuchsia-500/10 to-pink-500/5 hover:from-fuchsia-500/20 hover:to-pink-500/10 text-fuchsia-700 border-fuchsia-200/40",
    "from-rose-500/10 to-orange-500/5 hover:from-rose-500/20 hover:to-orange-500/10 text-rose-700 border-rose-200/40",
    "from-cyan-500/10 to-emerald-500/5 hover:from-cyan-500/20 hover:to-emerald-500/10 text-cyan-700 border-cyan-200/40",
    "from-slate-500/10 to-slate-600/5 hover:from-slate-500/20 hover:to-slate-600/10 text-slate-700 border-slate-200/40",
  ];

  return (
    <div className="space-y-8 font-sans">
      <AnimatePresence mode="wait">
        {step === "hub" && (
          <motion.div
            key="hub"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center p-8 md:p-16 text-center space-y-6 bg-slate-50 border border-slate-100 rounded-3xl"
          >
            <div className="size-20 rounded-full bg-[#D6B97A]/10 text-[#D6B97A] flex items-center justify-center shadow-inner">
              <Edit3 className="size-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-[#1A1A1A]">
                Teaching Diary Workspace
              </h3>
              <p className="text-slate-500 font-medium max-w-md mx-auto">
                शिक्षकांची दैनिक अध्यापन टाचनवही (Teaching Diary) वर्गाप्रमाणे व महिन्याप्रमाणे व्यवस्थापन करण्यासाठी पुढे जा.
              </p>
            </div>
            <button
              onClick={() => setStep("classes")}
              className="px-10 py-5 bg-[#1A1A1A] hover:bg-[#D6B97A] text-white rounded-full text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl flex items-center gap-3 active:scale-95 cursor-pointer"
            >
              Enter Teaching Diary <ArrowRight className="size-4 text-[#D6B97A] group-hover:translate-x-1" />
            </button>
          </motion.div>
        )}

        {step === "classes" && (
          <motion.div
            key="classes"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <BookOpen className="size-6 text-[#D6B97A]" /> Select Class / वर्ग निवडा
              </h3>
              <button
                onClick={() => setStep("hub")}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                ← Back
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {classes.map((cls, idx) => {
                return (
                  <motion.div
                    whileHover={{ scale: 1.03, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    key={cls}
                  >
                    <button
                      onClick={() => {
                        setSelectedClass(cls);
                        setStep("months");
                      }}
                      className={`w-full min-h-[10rem] p-6 rounded-3xl bg-gradient-to-br ${classColors[idx % classColors.length]} text-white text-left flex flex-col justify-between shadow-md hover:shadow-lg transition-all relative overflow-hidden group cursor-pointer`}
                    >
                      <div className="absolute right-[-10%] bottom-[-10%] opacity-10 pointer-events-none">
                        <BookOpen className="size-24" />
                      </div>
                      <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-black self-start">
                        Select
                      </span>
                      <div>
                        <h4 className="text-lg font-black tracking-tight">{cls}</h4>
                        <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider mt-1">अध्यापन नोंद वही</p>
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {step === "months" && selectedClass && (
          <motion.div
            key="months"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <BookOpen className="size-6 text-[#D6B97A]" /> Select Month / महिना निवडा
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Selected Class: {selectedClass}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedClass(null);
                  setStep("classes");
                }}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
              >
                ← Change Class
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {months.map((m, idx) => {
                const colorClass = monthColors[idx % monthColors.length];
                return (
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    key={m.en}
                    onClick={() => {
                      setSelectedMonth(m.en);
                      setStep("files");
                    }}
                    className={`p-6 rounded-2xl bg-gradient-to-br ${colorClass} border text-center flex flex-col justify-center items-center gap-2 shadow-sm transition-all duration-300 cursor-pointer h-28`}
                  >
                    <Calendar className="size-5 opacity-70" />
                    <span className="font-black text-sm tracking-tight">{m.mr}</span>
                    <span className="text-[9px] uppercase tracking-wider font-bold opacity-60">
                      {m.en}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {step === "files" && selectedClass && selectedMonth && (
          <motion.div
            key="files"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <BookOpen className="size-6 text-[#D6B97A]" /> {selectedClass} — {selectedMonthMarathi} ({selectedMonth})
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Teaching Diaries Catalog / दैनिक अध्यापन टाचण वह्या
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedMonth(null);
                  setStep("months");
                }}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
              >
                ← Change Month
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="size-10 text-[#D6B97A] animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">
                  Fetching teaching diaries from database...
                </p>
              </div>
            ) : diaries.length === 0 ? (
              <div className="p-16 text-center border-2 border-dashed border-slate-200 rounded-3xl space-y-4">
                <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mx-auto">
                  <BookOpen className="size-8" />
                </div>
                <div>
                  <h4 className="text-slate-700 font-bold">कोणतीही फाईल आढळली नाही</h4>
                  <p className="text-slate-400 text-xs mt-1">
                    या वर्ग आणि महिन्यासाठी अद्याप कोणतीही अध्यापन टाचनवही फाईल अपलोड केलेली नाही.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {diaries.map((file: any) => (
                  <div
                    key={file.id}
                    className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-[#D6B97A]/40 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="size-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-[#D6B97A] group-hover:border-[#D6B97A]/20 transition-all flex-shrink-0">
                        <FileText className="size-6" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-bold text-slate-800 text-sm truncate max-w-[200px] sm:max-w-xs" title={file.name}>
                          {file.name}
                        </div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                          {file.size} • {file.date || "Unknown Date"}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="size-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-[#D6B97A] hover:border-[#D6B97A]/20 transition-all cursor-pointer shadow-sm"
                        title="पहा (View)"
                      >
                        <Eye className="size-4.5" />
                      </a>
                      <a
                        href={file.url}
                        download={file.name}
                        className="size-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all cursor-pointer shadow-sm"
                        title="डाउनलोड (Download)"
                      >
                        <Download className="size-4.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
