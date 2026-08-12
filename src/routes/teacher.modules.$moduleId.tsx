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
  ZoomIn,
  ZoomOut,
  Maximize2,
  SunMedium,
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { AcademicPlanningSystem } from "@/components/teacher/AcademicPlanningSystem";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection } from "firebase/firestore";
import { showToast as toast } from "@/lib/custom-toast";
import { uploadBlobToBunny } from "@/lib/bunnyStorage";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { ModulePaywall } from "@/components/teacher/ModulePaywall";
import { TeacherStatisticsEditor } from "@/components/teacher/TeacherStatisticsEditor";
import { MonthlyParipathRegister } from "@/components/teacher/MonthlyParipathRegister";
import { PinGate } from "@/components/teacher/PinGate";
import class1SyllabusData from "./class1_syllabus.json";
import { DEFAULT_FORM_DATA, ASSEMBLY_TRANSLATIONS, DEFAULT_ASSEMBLY_ITEMS } from "@/lib/assemblyTranslations";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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
        <div className="max-w-full w-full mx-auto flex items-center justify-between relative z-10">
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

      <main className="flex-1 lg:pl-0 px-2 sm:px-4 md:px-6 py-4 md:py-6 max-w-full pt-24 mx-auto w-full relative z-10">
        <ModulePaywall moduleId={moduleId} defaultTitle={config.m}>
          <PinGate sectionKey="planning" enabled={moduleId === "annual-monthly-planning"}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-3xl rounded-2xl sm:rounded-[2.5rem] border border-white/50 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] relative overflow-hidden w-full"
          >
            {/* Canvas Decoration */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-[#D6B97A]/30 to-transparent" />

            <div className={`p-2 sm:p-4 ${moduleId === 'special-day' ? 'md:p-8 lg:p-10' : moduleId === 'annual-monthly-planning' ? 'md:p-4 lg:p-6' : 'md:p-16'}`}>
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
                <AcademicPlanningSystem mode="teacher" />
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
        </ModulePaywall>
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
                          Class {editFields.class} ΓÇó Div {editFields.division}
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
                          Grade {editFields.class} ΓÇó Section{" "}
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
                        Elite Champion ΓÇó {editFields.rank}
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

      {books.length > 0 && (
        <>
          {/* Divider */}
          <div className="border-b-2 border-slate-800 pb-2 mb-6 mt-12">
            <h3 className="text-lg font-bold text-slate-800 uppercase tracking-widest">
              {lang === "en" ? "Reference Books & Materials Report" : "αñ╕αñéαñªαñ░αÑìαñ¡ αñùαÑìαñ░αñéαñÑ αñåαñúαñ┐ αñ╕αñ╛αñ╣αñ┐αññαÑìαñ» αñàαñ╣αñ╡αñ╛αñ▓"}
            </h3>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 border border-slate-200 bg-slate-50">
              <Loader2 className="size-6 text-slate-400 animate-spin mb-2" />
              <p className="text-sm font-semibold uppercase tracking-wider">
                {lang === "en" ? "Loading Data..." : "αñ«αñ╛αñ╣αñ┐αññαÑÇ αñ▓αÑïαñí αñ╣αÑïαññ αñåαñ╣αÑç..."}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="overflow-x-auto border border-slate-300 bg-white">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-100 text-slate-800 text-xs uppercase font-bold border-b border-slate-300">
                    <tr>
                      <th className="px-4 py-3 border-r border-slate-200">#</th>
                      <th className="px-4 py-3 border-r border-slate-200">{lang === "en" ? "Document Name" : "αñªαñ╕αÑìαññαñÉαñ╡αñ£αñ╛αñÜαÑç αñ¿αñ╛αñ╡"}</th>
                      <th className="px-4 py-3 border-r border-slate-200">{lang === "en" ? "Size" : "αñåαñòαñ╛αñ░"}</th>
                      <th className="px-4 py-3 border-r border-slate-200">{lang === "en" ? "Date Added" : "αññαñ╛αñ░αÑÇαñû"}</th>
                      <th className="px-4 py-3 text-center">{lang === "en" ? "Actions" : "αñòαÑâαññαÑÇ"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {books.map((book, index) => {
                      const isSelected = selectedBook?.id === book.id;
                      return (
                        <tr
                          key={book.id}
                          className={`border-b last:border-0 transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-slate-50"}`}
                        >
                          <td className="px-4 py-3 border-r border-slate-200 font-semibold">{index + 1}</td>
                          <td className="px-4 py-3 border-r border-slate-200 font-semibold text-slate-800 flex items-center gap-2">
                            <FileText className="size-4 text-slate-500" />
                            {book.name}
                          </td>
                          <td className="px-4 py-3 border-r border-slate-200">{book.size}</td>
                          <td className="px-4 py-3 border-r border-slate-200">{book.date}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleSelectBook(book)}
                                disabled={loadingData && !isSelected}
                                className={`px-3 py-1.5 text-xs font-bold uppercase border rounded disabled:opacity-50 ${isSelected
                                    ? "bg-slate-800 text-white border-slate-800"
                                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                                  }`}
                              >
                                {loadingData && isSelected ? (
                                  <Loader2 className="size-3 animate-spin inline mr-1" />
                                ) : null}
                                {isSelected ? (lang === "en" ? "Close" : "αñ¼αñéαñª αñòαñ░αñ╛") : (lang === "en" ? "View" : "αñ¬αñ╣αñ╛")}
                              </button>
                              <button
                                onClick={() => handleDownload(book)}
                                disabled={loadingData}
                                className="px-3 py-1.5 text-xs font-bold uppercase bg-slate-100 text-slate-700 border border-slate-300 rounded hover:bg-slate-200 disabled:opacity-50 flex items-center gap-1"
                              >
                                {downloadingId === book.id ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <Download className="size-3" />
                                )}
                                {lang === "en" ? "Download" : "αñíαñ╛αñëαñ¿αñ▓αÑïαñí"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {selectedBook && (
                <div className="border border-slate-300 bg-white shadow-sm p-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <FileText className="size-4 text-slate-500" />
                      {lang === "en" ? "Document Preview:" : "αñªαñ╕αÑìαññαñÉαñ╡αñ£ αñ¬αÑéαñ░αÑìαñ╡αñ╛αñ╡αñ▓αÑïαñòαñ¿:"} {selectedBook.name}
                    </h4>
                    <button
                      onClick={() => {
                        setSelectedBook(null);
                        setBookData(null);
                      }}
                      className="px-3 py-1 text-xs font-bold text-slate-600 border border-slate-300 hover:bg-slate-100"
                    >
                      {lang === "en" ? "Close Preview" : "αñ¬αÑéαñ░αÑìαñ╡αñ╛αñ╡αñ▓αÑïαñòαñ¿ αñ¼αñéαñª αñòαñ░αñ╛"}
                    </button>
                  </div>

                  <div className="w-full relative min-h-[400px] bg-slate-50 border border-slate-200 flex flex-col justify-center items-center">
                    {loadingData ? (
                      <div className="flex flex-col items-center gap-2 text-slate-500">
                        <Loader2 className="size-6 animate-spin" />
                        <p className="text-xs font-bold uppercase">
                          {lang === "en" ? "Loading document..." : "αñªαñ╕αÑìαññαñÉαñ╡αñ£ αñ▓αÑïαñí αñ╣αÑïαññ αñåαñ╣αÑç..."}
                        </p>
                      </div>
                    ) : bookData ? (
                      <div className="w-full h-full p-2">
                        {bookData.type.includes("pdf") ? (
                          <iframe
                            src={bookData.base64}
                            className="w-full h-[600px] border-0"
                            title={bookData.name}
                            allowFullScreen
                          />
                        ) : (
                          <img
                            src={bookData.base64}
                            alt={bookData.name}
                            className="max-w-full h-auto mx-auto border border-slate-300 shadow-sm"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="text-slate-400 flex flex-col items-center">
                        <AlertCircle className="size-6 mb-2" />
                        <span className="text-xs font-bold">
                          {lang === "en" ? "Preview Not Available" : "αñ¬αÑéαñ░αÑìαñ╡αñ╛αñ╡αñ▓αÑïαñòαñ¿ αñëαñ¬αñ▓αñ¼αÑìαñº αñ¿αñ╛αñ╣αÑÇ"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
   DailyAssemblyContent ΓÇö Full Paripath / αñ¬αñ░αÑÇαñ¬αñ╛αñá Structured View
   ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
function DailyAssemblyContent() {
  const [assemblyMode, setAssemblyMode] = useState<"daily" | "monthly">("daily");
  const [lang, setLang] = useState<"mr" | "en" | "hi">("mr");

  const getLocalDateString = (d = new Date()): string => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [dbFormData, setDbFormData] = useState<any>(null);
  const [holidayNotice, setHolidayNotice] = useState<{ isHoliday: boolean; reason: string } | null>(null);

  const [schoolInfo, setSchoolInfo] = useState({
    schoolName: "",
    udise: "",
    kendra: "",
    taluka: "",
    jilha: "",
  });
  const [showSchoolInfoModal, setShowSchoolInfoModal] = useState(false);

  // Set selectedDate on client only to avoid SSR hydration mismatch
  useEffect(() => {
    setSelectedDate((prev) => prev || getLocalDateString());
  }, []);

  // Load school info from local storage
  useEffect(() => {
    const savedInfo = localStorage.getItem("paripathSchoolInfo");
    if (savedInfo) {
      try {
        const parsed = JSON.parse(savedInfo);
        setSchoolInfo(parsed);
      } catch (e) {
        console.error("Failed to parse school info", e);
        setShowSchoolInfoModal(true);
      }
    } else {
      setShowSchoolInfoModal(true);
    }
  }, []);

  useEffect(() => {
    if (!selectedDate) return; // Skip on SSR / before client mount
    const todayLocalStr = getLocalDateString();

    // Check declared holidays
    const holidaysRef = doc(db, "school_holidays", "declared");
    getDoc(holidaysRef)
      .then((hSnap) => {
        if (hSnap.exists()) {
          const hData = hSnap.data();
          if (hData[selectedDate]?.isHoliday) {
            setHolidayNotice({
              isHoliday: true,
              reason: hData[selectedDate].reason || "αñ╢αñ╛αñ│αÑçαñ╕ αñ╕αÑüαñƒαÑìαñƒαÑÇ",
            });
            return;
          }
        }
        // Check Sunday
        const parts = selectedDate.split("-").map(Number);
        if (parts.length === 3) {
          const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
          if (dateObj.getDay() === 0) {
            setHolidayNotice({
              isHoliday: true,
              reason: "αñ░αñ╡αñ┐αñ╡αñ╛αñ░αñÜαÑÇ αñ╕αÑüαñƒαÑìαñƒαÑÇ",
            });
            return;
          }
        }
        setHolidayNotice(null);
      })
      .catch((err) => {
        console.error("Error checking holidays", err);
        setHolidayNotice(null);
      });

    const archiveRef = doc(db, "daily_paripath_archive", selectedDate);
    const unsubscribeArchive = onSnapshot(
      archiveRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          setDbFormData(docSnap.data());
        } else if (selectedDate === todayLocalStr) {
          const currentRef = doc(db, "admin_daily_paripath", "current");
          const currentSnap = await getDoc(currentRef);
          if (currentSnap.exists()) {
            setDbFormData(currentSnap.data());
          } else {
            setDbFormData(null);
          }
        } else {
          setDbFormData(null);
        }
      },
      (err) => {
        console.error("Error fetching date paripath data:", err);
      }
    );

    return () => unsubscribeArchive();
  }, [selectedDate]);

  const MARATHI_DAYS_LIST = ["αñ░αñ╡αñ┐αñ╡αñ╛αñ░", "αñ╕αÑïαñ«αñ╡αñ╛αñ░", "αñ«αñéαñùαñ│αñ╡αñ╛αñ░", "αñ¼αÑüαñºαñ╡αñ╛αñ░", "αñùαÑüαñ░αÑüαñ╡αñ╛αñ░", "αñ╢αÑüαñòαÑìαñ░αñ╡αñ╛αñ░", "αñ╢αñ¿αñ┐αñ╡αñ╛αñ░"];
  const MARATHI_MONTHS_LIST = ["αñ£αñ╛αñ¿αÑçαñ╡αñ╛αñ░αÑÇ", "αñ½αÑçαñ¼αÑìαñ░αÑüαñ╡αñ╛αñ░αÑÇ", "αñ«αñ╛αñ░αÑìαñÜ", "αñÅαñ¬αÑìαñ░αñ┐αñ▓", "αñ«αÑç", "αñ£αÑéαñ¿", "αñ£αÑüαñ▓αÑê", "αñæαñùαñ╕αÑìαñƒ", "αñ╕αñ¬αÑìαñƒαÑçαñéαñ¼αñ░", "αñæαñòαÑìαñƒαÑïαñ¼αñ░", "αñ¿αÑïαñ╡αÑìαñ╣αÑçαñéαñ¼αñ░", "αñíαñ┐αñ╕αÑçαñéαñ¼αñ░"];

  const toDevanagariDigits = (str: string | number): string => {
    const devanagariDigits = ["αÑª", "αÑº", "αÑ¿", "αÑ⌐", "αÑ¬", "αÑ½", "αÑ¼", "αÑ¡", "αÑ«", "αÑ»"];
    return String(str).replace(/[0-9]/g, (w) => devanagariDigits[parseInt(w, 10)]);
  };

  const getDynamicFormDataForDate = (dateStr: string, currentLang: "mr" | "en" | "hi") => {
    const baseData = dbFormData || DEFAULT_FORM_DATA[currentLang];
    
    const parts = dateStr.split("-").map(Number);
    if (parts.length !== 3 || isNaN(parts[0])) return baseData;
    const [y, m, d] = parts;
    const dateObj = new Date(y, m - 1, d);

    const dayName = MARATHI_DAYS_LIST[dateObj.getDay()];
    const monthName = MARATHI_MONTHS_LIST[dateObj.getMonth()];
    const formattedDayNum = String(d).padStart(2, "0");
    const dateMonthStr = `${toDevanagariDigits(formattedDayNum)} ${monthName}`;

    const startOfYear = new Date(y, 0, 0);
    const diff = dateObj.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const yearDayStr = toDevanagariDigits(dayOfYear);

    return {
      ...baseData,
      day: dbFormData?.day || dayName,
      dateMonth: dbFormData?.dateMonth || dateMonthStr,
      yearDay: dbFormData?.yearDay || yearDayStr,
    };
  };

  const t = ASSEMBLY_TRANSLATIONS[lang];
  const formData = getDynamicFormDataForDate(selectedDate, lang);
  const assemblyItems = DEFAULT_ASSEMBLY_ITEMS[lang];

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDownloadPdf = async () => {
    if (!formData) {
      toast.error("αñ¬αñ░αñ┐αñ¬αñ╛αñá content αñ╕αñ╛αñ¬αñíαñ▓αñ╛ αñ¿αñ╛αñ╣αÑÇ. αñòαÑâαñ¬αñ»αñ╛ αñ¬αÑüαñ¿αÑìαñ╣αñ╛ αñ¬αÑìαñ░αñ»αññαÑìαñ¿ αñòαñ░αñ╛.");
      return;
    }

    toast.success("PDF αñ¿αñ┐αñ░αÑìαñ«αñ┐αññαÑÇ αñ╕αÑüαñ░αÑé αñåαñ╣αÑç... αñòαÑâαñ¬αñ»αñ╛ αñ¬αÑìαñ░αññαÑÇαñòαÑìαñ╖αñ╛ αñòαñ░αñ╛.");

    try {
      const html2pdfModule = await import("html2pdf.js");
      let html2pdfFn: any = html2pdfModule.default || html2pdfModule;
      if (html2pdfFn && html2pdfFn.default) html2pdfFn = html2pdfFn.default;
      if (typeof html2pdfFn !== "function") {
        if (typeof window !== "undefined" && typeof (window as any).html2pdf === "function") {
          html2pdfFn = (window as any).html2pdf;
        }
      }
      if (typeof html2pdfFn !== "function") {
        throw new Error("html2pdf library is not loaded properly.");
      }

      // Helper for safe text with newlines
      const nl2br = (text: string) => (text || "").replace(/\n/g, "<br/>");

      const data = formData;
      const dateStr = selectedDate || new Date().toISOString().split("T")[0];

      // Build clean HTML template for PDF
      const tempDiv = document.createElement("div");
      tempDiv.id = "temp-pdf-render";
      tempDiv.style.width = "733px";
      tempDiv.style.padding = "0";
      tempDiv.style.margin = "0";
      tempDiv.style.background = "#FFFFFF";
      tempDiv.style.color = "#1F2937";
      tempDiv.style.fontFamily = "'Noto Sans Devanagari', 'Mukta', system-ui, sans-serif";
      tempDiv.style.boxSizing = "border-box";


      // Shared style helpers
      const greenBar = (title: string) =>
        `<div style="background: #2e7d32; color: #fff; text-align: center; font-size: 14px; font-weight: 800; padding: 6px 14px; border-radius: 6px; margin: 0 0 8px 0; letter-spacing: 0.5px; font-family: 'Noto Sans Devanagari', sans-serif; box-sizing: border-box;">${title}</div>`;

      const sectionBox = (borderColor: string = "#e2e8f0") =>
        `border: 1.5px solid ${borderColor}; border-radius: 10px; padding: 12px 20px; margin-bottom: 14px; background: #fff; page-break-inside: avoid; box-sizing: border-box;`;

      const contentText = `font-size: 13px; font-weight: 600; line-height: 1.65; color: #1F2937; margin: 0; text-align: center; font-family: 'Noto Sans Devanagari', sans-serif; white-space: pre-line; word-break: break-word; overflow-wrap: break-word; box-sizing: border-box; padding: 0 10px;`;

      const pageHeader = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2.5px solid #2e7d32; padding-bottom: 6px; margin-bottom: 12px;">
          <div style="font-size: 14px; font-weight: 800; color: #2e7d32; font-family: 'Noto Sans Devanagari', sans-serif;">≡ƒôû αñªαÑêαñ¿αñ┐αñò αñ¬αñ░αñ┐αñ¬αñ╛αñá</div>
          <div style="font-size: 13px; font-weight: 700; color: #2e7d32; font-family: 'Noto Sans Devanagari', sans-serif;">αñªαñ┐αñ¿αñ╛αñéαñò: ${dateStr}</div>
        </div>
      `;

      // School Info Header
      const schoolHeader = (schoolInfo.schoolName || schoolInfo.udise || schoolInfo.kendra) ? `
        <div style="border: 2px solid #2e7d32; border-radius: 10px; padding: 12px 18px; margin-bottom: 14px; background: #f0fdf4; text-align: center; page-break-inside: avoid;">
          ${schoolInfo.schoolName ? `<div style="font-size: 18px; font-weight: 900; color: #166534; margin-bottom: 6px; font-family: 'Noto Sans Devanagari', sans-serif;">αñ╢αñ╛αñ│αÑçαñÜαÑç αñ¿αñ╛αñ╡: ${schoolInfo.schoolName}</div>` : ''}
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #166534; border-top: 1px dashed #86efac; padding-top: 6px; font-family: 'Noto Sans Devanagari', sans-serif;">
            <span>αñòαÑçαñéαñªαÑìαñ░: ${schoolInfo.kendra || '-'} | αñ»αÑüαñíαñ╛αñ»αñ╕ (UDISE): ${schoolInfo.udise || '-'}</span>
            <span>αññαñ╛αñ▓αÑüαñòαñ╛: ${schoolInfo.taluka || '-'} | αñ£αñ┐αñ▓αÑìαñ╣αñ╛: ${schoolInfo.jilha || '-'}</span>
          </div>
        </div>
      ` : '';

      // --- All content data ---
      const nationalAnthem = data.nationalAnthem || data.nationalAnthem_mr || assemblyItems[0]?.content || "";
      const stateAnthem = data.stateAnthem || data.stateAnthem_mr || assemblyItems[1]?.content || "";
      const pledge = data.pledge || data.pledge_mr || assemblyItems[2]?.content || "";

      // --- ALL REMAINING CONTENT flows continuously (no forced page breaks) ---
      const preamble = data.preamble || data.preamble_mr || assemblyItems[3]?.content || "";
      const prayer = data.prayer || data.prayer_mr || assemblyItems[4]?.content || "";
      const silentPasayadan = data.silentPasayadan || assemblyItems[5]?.content || "";

      const panchangItems = [
        { label: "αñ╡αñ╛αñ░", value: data.day },
        { label: "αñ«αñ╛αñ╕", value: data.month },
        { label: "αñ¬αñòαÑìαñ╖", value: data.paksha },
        { label: "αññαñ┐αñÑαÑÇ", value: data.tithi },
        { label: "αñ¿αñòαÑìαñ╖αññαÑìαñ░", value: data.nakshatra },
        { label: "αñ»αÑïαñù", value: data.yog },
        { label: "αñ╕αÑéαñ░αÑìαñ»αÑïαñªαñ»", value: data.sunrise },
        { label: "αñ╕αÑéαñ░αÑìαñ»αñ╛αñ╕αÑìαññ", value: data.sunset },
      ].filter(item => Boolean(item.value));

      const eventsContent = data.events || data.dinvishesh || "";
      const newsContent = data.valueNews || data.batmya || data.news || "";

      const gkItems = [1, 2, 3, 4].map(num => data[`gkQ${num}`] ? `
        <div style="background: #f5f3ff; border: 1px solid #ede9fe; border-radius: 8px; padding: 8px 12px; margin-bottom: 6px;">
          <div style="font-size: 13px; font-weight: 800; color: #5b21b6; font-family: 'Noto Sans Devanagari', sans-serif;">αñ¬αÑìαñ░αñ╢αÑìαñ¿ ${num}: ${data[`gkQ${num}`]}</div>
          <div style="font-size: 13px; font-weight: 700; color: #166534; margin-top: 4px; font-family: 'Noto Sans Devanagari', sans-serif;">αñëαññαÑìαññαñ░: ${data[`gkA${num}`] || "-"}</div>
        </div>
      ` : '').join('');

      // Build ALL content as one continuous flow (no forced page breaks - html2pdf paginates automatically)
      const allContent = `
        <style>
          #temp-pdf-render, #temp-pdf-render * {
            box-sizing: border-box !important;
            word-break: break-word;
            overflow-wrap: break-word;
          }
        </style>
        <div style="padding: 14px 22px; width: 100%; box-sizing: border-box;">
          ${pageHeader}
          ${schoolHeader}
          ${greenBar("αñ¬αñ░αñ┐αñ¬αñ╛αñá αñ╕αÑüαñ░αÑüαñ╡αñ╛αññ")}
          <div style="${sectionBox('#bbf7d0')}">
            ${greenBar(assemblyItems[0]?.label || 'αñ░αñ╛αñ╖αÑìαñƒαÑìαñ░αñùαÑÇαññ')}
            <div style="${contentText} font-weight: 700;">${nl2br(nationalAnthem)}</div>
          </div>
          <div style="${sectionBox('#bbf7d0')}">
            ${greenBar(assemblyItems[1]?.label || 'αñ░αñ╛αñ£αÑìαñ»αñùαÑÇαññ')}
            <div style="${contentText} font-size: 12px; line-height: 1.5;">${nl2br(stateAnthem)}</div>
          </div>
          <div style="${sectionBox('#bbf7d0')}">
            ${greenBar(assemblyItems[2]?.label || 'αñ¬αÑìαñ░αññαñ┐αñ£αÑìαñ₧αñ╛')}
            <div style="${contentText}">${nl2br(pledge)}</div>
          </div>

          <div style="${sectionBox('#fed7aa')}">
            ${greenBar(assemblyItems[3]?.label || 'αñ╕αñéαñ╡αñ┐αñºαñ╛αñ¿ αñëαñªαÑìαñªαÑçαñ╢αñ┐αñòαñ╛')}
            <div style="${contentText}">${nl2br(preamble)}</div>
          </div>

          <div style="${sectionBox('#bbf7d0')}">
            ${greenBar(assemblyItems[4]?.label || 'αñ¬αÑìαñ░αñ╛αñ░αÑìαñÑαñ¿αñ╛')}
            <div style="${contentText}">${nl2br(prayer)}</div>
          </div>

          ${silentPasayadan ? `
          <div style="${sectionBox('#fde68a')}">
            ${greenBar(assemblyItems[5]?.label || 'αñ¬αñ╕αñ╛αñ»αñªαñ╛αñ¿')}
            <div style="${contentText} font-size: 12px; line-height: 1.55;">${nl2br(silentPasayadan)}</div>
          </div>
          ` : ''}

          ${panchangItems.length > 0 ? `
          <div style="${sectionBox('#fed7aa')}">
            ${greenBar("αñåαñ£αñÜαÑç αñ¬αñéαñÜαñ╛αñéαñù")}
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
              ${panchangItems.map(item => `
                <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 6px; text-align: center;">
                  <div style="font-size: 10px; font-weight: 700; color: #92400e; text-transform: uppercase; font-family: 'Noto Sans Devanagari', sans-serif;">${item.label}</div>
                  <div style="font-size: 13px; font-weight: 800; color: #1f2937; font-family: 'Noto Sans Devanagari', sans-serif;">${item.value}</div>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}

          ${data.thought ? `
          <div style="${sectionBox('#ede9fe')}">
            ${greenBar("αñ╕αÑüαñ╡αñ┐αñÜαñ╛αñ░")}
            <div style="padding: 14px; background: #faf5ff; border: 1px solid #ede9fe; border-radius: 8px; text-align: center;">
              <div style="font-size: 16px; font-weight: 800; color: #1f2937; font-style: italic; font-family: 'Noto Sans Devanagari', sans-serif;">"${data.thought}"</div>
            </div>
          </div>
          ` : ''}

          ${data.shlok ? `
          <div style="${sectionBox('#fecaca')}">
            ${greenBar("αñ╢αÑìαñ▓αÑïαñò")}
            <div style="padding: 14px; background: #fff5f5; border: 1px solid #fecaca; border-radius: 8px; text-align: center;">
              <div style="${contentText} font-size: 14px;">${nl2br(data.shlok)}</div>
            </div>
          </div>
          ` : ''}

          ${data.proverb ? `
          <div style="${sectionBox('#ccfbf1')}">
            ${greenBar("αñ«αÑìαñ╣αñú αñ╡ αñàαñ░αÑìαñÑ")}
            <div style="padding: 12px; background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 8px; text-align: center; margin-bottom: 6px;">
              <div style="font-size: 10px; font-weight: 700; color: #0d9488; text-transform: uppercase; margin-bottom: 4px; font-family: 'Noto Sans Devanagari', sans-serif;">αñ«αÑìαñ╣αñú</div>
              <div style="font-size: 15px; font-weight: 800; color: #1f2937; font-family: 'Noto Sans Devanagari', sans-serif;">"${data.proverb}"</div>
            </div>
            ${data.proverbMeaning ? `
            <div style="padding: 10px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center;">
              <div style="font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-bottom: 4px; font-family: 'Noto Sans Devanagari', sans-serif;">αñ«αÑìαñ╣αñúαÑÇαñÜαñ╛ αñàαñ░αÑìαñÑ</div>
              <div style="font-size: 13px; font-weight: 600; color: #4b5563; font-family: 'Noto Sans Devanagari', sans-serif;">${data.proverbMeaning}</div>
            </div>
            ` : ''}
          </div>
          ` : ''}

          ${eventsContent ? `
          <div style="${sectionBox('#bfdbfe')}">
            ${greenBar(`${data.dateMonth ? data.dateMonth + ' ' : ''}αñªαñ┐αñ¿αñ╡αñ┐αñ╢αÑçαñ╖`)}
            ${data.yearDay ? `<div style="font-size: 12px; font-weight: 700; color: #3b82f6; text-align: center; background: #dbeafe; border-radius: 20px; padding: 4px 12px; display: inline-block; margin: 0 auto 8px auto; font-family: 'Noto Sans Devanagari', sans-serif;">αñ╣αñ╛ αñ╡αñ░αÑìαñ╖αñ╛αññαÑÇαñ▓ ${data.yearDay} αñ╡αñ╛ αñªαñ┐αñ╡αñ╕ αñåαñ╣αÑç.</div>` : ''}
            <div style="${contentText} text-align: left; font-size: 13px;">${nl2br(eventsContent)}</div>
          </div>
          ` : ''}

          ${newsContent ? `
          <div style="${sectionBox('#a7f3d0')}">
            ${greenBar("αñ╕αÑüαñ╕αñéαñ╕αÑìαñòαñ╛αñ░αñòαÑìαñ╖αñ« αñ¼αñ╛αññαñ«αÑìαñ»αñ╛")}
            <div style="${contentText} text-align: left; font-size: 13px;">${nl2br(newsContent)}</div>
          </div>
          ` : ''}

          ${data.patrioticSong ? `
          <div style="${sectionBox('#c7d2fe')}">
            ${greenBar(`αñªαÑçαñ╢αñ¡αñòαÑìαññαÑÇ αñùαÑÇαññ${data.songTitle ? ': ' + data.songTitle : ''}`)}
            <div style="${contentText} font-size: 13px;">${nl2br(data.patrioticSong)}</div>
          </div>
          ` : ''}

          ${data.story ? `
          <div style="${sectionBox('#fecdd3')}">
            ${greenBar(`αñ¼αÑïαñºαñòαñÑαñ╛${data.storyTitle ? ': ' + data.storyTitle : ''}`)}
            <div style="${contentText} text-align: left; font-size: 13px;">${nl2br(data.story)}</div>
            ${data.moral ? `
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 8px 14px; border-radius: 0 6px 6px 0; margin-top: 8px;">
              <span style="font-size: 12px; font-weight: 800; color: #92400e; font-family: 'Noto Sans Devanagari', sans-serif;">Γ¡É αññαñ╛αññαÑìαñ¬αñ░αÑìαñ»: </span>
              <span style="font-size: 13px; font-weight: 700; color: #1f2937; font-family: 'Noto Sans Devanagari', sans-serif;">${data.moral}</span>
            </div>
            ` : ''}
          </div>
          ` : ''}

          ${gkItems ? `
          <div style="${sectionBox('#f3e8ff')}">
            ${greenBar("αñ╕αñ╛αñ«αñ╛αñ¿αÑìαñ» αñ£αÑìαñ₧αñ╛αñ¿ (G.K.)")}
            ${gkItems}
          </div>
          ` : ''}

          ${data.personalityTitle || data.personality ? `
          <div style="${sectionBox('#ccfbf1')}">
            ${greenBar(`αñÑαÑïαñ░αñ╡αÑìαñ»αñòαÑìαññαÑÇ αñ¬αñ░αñ┐αñÜαñ»${data.personalityTitle ? ': ' + data.personalityTitle : ''}`)}
            <div style="${contentText} text-align: left;">${nl2br(data.personality || "-")}</div>
          </div>
          ` : ''}

          <div style="width: 100%; height: 1.5px; background: linear-gradient(90deg, transparent, #cbd5e1, transparent); margin: 14px 0;"></div>
          <div style="text-align: center; padding: 8px 0; font-size: 10px; font-weight: 700; color: #9ca3af; font-family: 'Noto Sans Devanagari', sans-serif;">
            αñ¿αñ┐αñ░αÑìαñ«αñ┐αññαÑÇ: ${data.creator || "Smart Learning With AI"} | ┬⌐ αñªαÑêαñ¿αñ┐αñò αñ¬αñ░αñ┐αñ¬αñ╛αñá ${new Date().getFullYear()}
          </div>
        </div>
      `;

      tempDiv.innerHTML = allContent;
      document.body.appendChild(tempDiv);

      const opt = {
        margin: [6, 8, 6, 8],
        filename: `Paripath_${dateStr}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, windowWidth: 733 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      try {
        const pdfBlob = await html2pdfFn().set(opt).from(tempDiv).outputPdf("blob");
        document.body.removeChild(tempDiv);

        const blobUrl = URL.createObjectURL(pdfBlob);
        const downloadLink = document.createElement("a");
        downloadLink.href = blobUrl;
        downloadLink.download = opt.filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

        toast.success("PDF αñ»αñ╢αñ╕αÑìαñ╡αÑÇαñ░αÑÇαññαÑìαñ»αñ╛ αñíαñ╛αñëαñ¿αñ▓αÑïαñí αñ¥αñ╛αñ▓αÑÇ! ≡ƒÄë");
      } catch (innerErr) {
        if (tempDiv.parentNode) document.body.removeChild(tempDiv);
        throw innerErr;
      }
    } catch (err: any) {
      console.error("PDF generation error", err);
      toast.error(`PDF αññαñ»αñ╛αñ░ αñòαñ░αññαñ╛αñ¿αñ╛ αññαÑìαñ░αÑüαñƒαÑÇ αñåαñ▓αÑÇ: ${err.message || "PDF generate failed"}. αñòαÑâαñ¬αñ»αñ╛ αñ¬αÑüαñ¿αÑìαñ╣αñ╛ αñ¬αÑìαñ░αñ»αññαÑìαñ¿ αñòαñ░αñ╛.`);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring" as const, stiffness: 100, damping: 15 }
    }
  };

  const SectionCard = ({ id, emoji, title, gradient, children, pageBreak = false }: {
    id: string;
    emoji?: string;
    title: string;
    icon?: any;
    gradient?: string;
    children: React.ReactNode;
    pageBreak?: boolean;
  }) => {
    return (
      <div
        id={id}
        className={`assembly-section-card space-y-5 p-5 md:p-8 bg-gradient-to-br ${gradient || 'from-slate-50/80 to-slate-100/50 border-slate-200/60'} border rounded-[2rem] shadow-sm mb-6 relative overflow-visible ${pageBreak ? 'html2pdf__page-break' : ''}`}
      >
        <div className="flex justify-center relative z-10">
          <h3 className="text-lg md:text-xl font-black text-slate-800 inline-flex items-center justify-center gap-2 px-5 py-3 bg-white/90 backdrop-blur-md rounded-full shadow-sm border border-slate-200/60 uppercase tracking-wider">
            {emoji && <span>{emoji}</span>} {title}
          </h3>
        </div>
        <div className="relative z-10">
          {children}
        </div>
      </div>
    );
  };

  return (
    <div
      id="daily-assembly-content"
      className="p-4 md:p-6 space-y-6 relative rounded-[2rem] overflow-visible bg-[#F8FAFF]"
    >
      <style>{`
        @media print {
          header, aside, footer, .pdf-hide, button, [role="navigation"] {
            display: none !important;
          }
          #daily-assembly-content {
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
        }
      `}</style>

      {/* Mode Switcher: Daily Assembly vs Monthly Assembly Register */}
      <div className="flex justify-center p-3 bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-800 pdf-hide">
        <div className="flex p-1.5 bg-slate-800/80 rounded-2xl border border-slate-700/60 w-full max-w-2xl">
          <button
            onClick={() => setAssemblyMode("daily")}
            className={`flex-1 py-3 px-6 rounded-xl font-black text-xs md:text-sm tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2.5 ${
              assemblyMode === "daily"
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25 scale-[1.02]"
                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
            }`}
          >
            <BookMarked className="size-4" />
            {lang === "en" ? "Daily Assembly" : "αñªαÑêαñ¿αñ┐αñò αñ¬αñ░αñ┐αñ¬αñ╛αñá"}
          </button>

          <button
            onClick={() => setAssemblyMode("monthly")}
            className={`flex-1 py-3 px-6 rounded-xl font-black text-xs md:text-sm tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2.5 ${
              assemblyMode === "monthly"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 scale-[1.02]"
                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
            }`}
          >
            <Table className="size-4" />
            {lang === "en" ? "Monthly Assembly" : "αñ«αñ╛αñ╕αñ┐αñò αñ¬αñ░αñ┐αñ¬αñ╛αñá (αñ░αñ£αñ┐αñ╕αÑìαñƒαñ░)"}
          </button>
        </div>
      </div>

      {assemblyMode === "monthly" ? (
        <MonthlyParipathRegister />
      ) : (
        <>
          {/* School Info Modal */}
          <Dialog open={showSchoolInfoModal} onOpenChange={setShowSchoolInfoModal}>
            <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 border-0 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-slate-800 flex items-center gap-2 mb-2">
                  <School className="size-6 text-indigo-600" /> αñ╢αñ╛αñ│αÑçαñÜαÑÇ αñ«αñ╛αñ╣αñ┐αññαÑÇ
                </DialogTitle>
                <p className="text-slate-500 text-sm font-medium">
                  αñòαÑâαñ¬αñ»αñ╛ PDF αñ╡αñ░ αñªαñ╛αñûαñ╡αñúαÑìαñ»αñ╛αñ╕αñ╛αñáαÑÇ αñûαñ╛αñ▓αÑÇαñ▓ αñ«αñ╛αñ╣αñ┐αññαÑÇ αñ¡αñ░αñ╛. αñ╣αÑÇ αñ«αñ╛αñ╣αñ┐αññαÑÇ αññαÑüαñ«αñÜαÑìαñ»αñ╛ αñ¼αÑìαñ░αñ╛αñëαñ¥αñ░αñ«αñºαÑìαñ»αÑç αñ╕αÑçαñ╡αÑìαñ╣ αñ░αñ╛αñ╣αÑÇαñ▓.
                </p>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">αñ╢αñ╛αñ│αÑçαñÜαÑç αñ¿αñ╛αñ╡</label>
                  <input 
                    type="text" 
                    value={schoolInfo.schoolName || ""}
                    onChange={(e) => setSchoolInfo({...schoolInfo, schoolName: e.target.value})}
                    placeholder="αñëαñªαñ╛. αñ£αñ┐. αñ¬. αñ¬αÑìαñ░αñ╛. αñ╢αñ╛αñ│αñ╛..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-slate-700 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">αñ»αÑüαñíαñ╛αñ»αñ╕ (UDISE) αñòαÑïαñí</label>
                  <input 
                    type="text" 
                    value={schoolInfo.udise}
                    onChange={(e) => setSchoolInfo({...schoolInfo, udise: e.target.value})}
                    placeholder="αñëαñªαñ╛. 27251..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-slate-700 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">αñòαÑçαñéαñªαÑìαñ░ (Kendra)</label>
                  <input 
                    type="text" 
                    value={schoolInfo.kendra}
                    onChange={(e) => setSchoolInfo({...schoolInfo, kendra: e.target.value})}
                    placeholder="αñòαÑçαñéαñªαÑìαñ░αñ╛αñÜαÑç αñ¿αñ╛αñ╡"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-slate-700 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">αññαñ╛αñ▓αÑüαñòαñ╛</label>
                    <input 
                      type="text" 
                      value={schoolInfo.taluka}
                      onChange={(e) => setSchoolInfo({...schoolInfo, taluka: e.target.value})}
                      placeholder="αññαñ╛αñ▓αÑüαñòαñ╛"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-slate-700 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">αñ£αñ┐αñ▓αÑìαñ╣αñ╛</label>
                    <input 
                      type="text" 
                      value={schoolInfo.jilha}
                      onChange={(e) => setSchoolInfo({...schoolInfo, jilha: e.target.value})}
                      placeholder="αñ£αñ┐αñ▓αÑìαñ╣αñ╛"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-slate-700 outline-none"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <button 
                  onClick={() => {
                    localStorage.setItem("paripathSchoolInfo", JSON.stringify(schoolInfo));
                    setShowSchoolInfoModal(false);
                    toast.success("αñ«αñ╛αñ╣αñ┐αññαÑÇ αñ»αñ╢αñ╕αÑìαñ╡αÑÇαñ░αñ┐αññαÑìαñ»αñ╛ αñ╕αÑçαñ╡αÑìαñ╣ αñ¥αñ╛αñ▓αÑÇ!");
                  }}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-wider transition-colors shadow-lg shadow-indigo-600/20"
                >
                  αñ╕αÑçαñ╡αÑìαñ╣ αñòαñ░αñ╛ (Save)
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Header with Language Toggle */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-8 bg-slate-900 rounded-[3rem] shadow-xl border border-slate-800 relative overflow-hidden pdf-hide">
            <div className="flex items-center gap-5 relative z-10">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-md">
                  αñªαÑêαñ¿αñ┐αñò αñ¬αñ░αñ┐αñ¬αñ╛αñá
                </h2>
                <p className="text-xs font-black text-indigo-200 uppercase tracking-[0.3em] mt-1.5 opacity-80">
                  αñåαñ£αñÜαñ╛ αñ¬αñ░αñ┐αñ¬αñ╛αñá
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 relative z-10 pdf-hide">
              <div className="flex items-center gap-2.5 bg-white/5 px-4 py-2.5 rounded-2xl border border-white/10 text-white shadow-inner">
                <Calendar className="size-4 text-indigo-300" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-xs font-black outline-none cursor-pointer text-indigo-200"
                />
              </div>
              <button
                onClick={() => setShowSchoolInfoModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black text-xs md:text-sm uppercase tracking-wider transition-all border border-white/20"
                title="αñ╢αñ╛αñ│αÑçαñÜαÑÇ αñ«αñ╛αñ╣αñ┐αññαÑÇ αñ¡αñ░αñ╛ / αñ¼αñªαñ▓αñ╛"
              >
                <School className="size-4" />
                <span className="hidden sm:inline">αñ╢αñ╛αñ│αÑçαñÜαÑÇ αñ«αñ╛αñ╣αñ┐αññαÑÇ</span>
              </button>
              <button
                onClick={handleDownloadPdf}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black text-xs md:text-sm uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/25 active:scale-95 border border-indigo-400/30"
              >
                <Download className="size-4" />
                <span>{lang === "en" ? "Download PDF" : "PDF αñíαñ╛αñëαñ¿αñ▓αÑïαñí"}</span>
              </button>
            </div>
          </div>

          {holidayNotice?.isHoliday ? (
            <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-amber-500/20 border-2 border-amber-400/40 p-8 md:p-14 rounded-[3rem] text-center space-y-6 shadow-xl my-6">
              <div className="size-20 bg-amber-500/20 border border-amber-400/50 rounded-3xl flex items-center justify-center mx-auto text-amber-600 shadow-inner">
                <SunMedium className="size-10 animate-pulse" />
              </div>
              <div className="space-y-2">
                <span className="px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-900 border border-amber-400/40 font-black text-xs uppercase tracking-widest inline-block">
                  ≡ƒÅû∩╕Å αñ╕αÑüαñƒαÑìαñƒαÑÇαñÜαÑÇ αñ╕αÑéαñÜαñ¿αñ╛ / School Holiday Notice
                </span>
                <h3 className="text-2xl md:text-4xl font-black text-amber-950 tracking-tight pt-2">
                  αñåαñ£ αñ╢αñ╛αñ│αÑçαñ╕ αñ╕αÑüαñƒαÑìαñƒαÑÇ αñåαñ╣αÑç!
                </h3>
                <p className="text-base md:text-xl font-bold text-amber-800">
                  αñòαñ╛αñ░αñú: <span className="underline decoration-amber-400 font-black text-amber-900">{holidayNotice.reason || "αñ╢αñ╛αñ│αÑçαñ╕ αñ╕αÑüαñƒαÑìαñƒαÑÇ"}</span>
                </p>
              </div>
              <p className="text-slate-600 text-sm max-w-lg mx-auto font-semibold pt-2">
                αñ«αñ╛αñ╕αñ┐αñò αñ¬αñ░αñ┐αñ¬αñ╛αñá αñ¿αÑïαñéαñªαñ╡αñ╣αÑÇαñ«αñºαÑìαñ»αÑç αñ»αñ╛ αñªαñ┐αñ¿αñ╛αñéαñòαñ╛αñ╕ αñ╕αÑüαñƒαÑìαñƒαÑÇ αñ«αÑìαñ╣αñúαÑéαñ¿ αñÿαÑïαñ╖αñ┐αññ αñòαÑçαñ▓αÑç αñåαñ╣αÑç. αññαÑìαñ»αñ╛αñ«αÑüαñ│αÑç αñ»αñ╛ αñªαñ┐αñ¿αñ╛αñéαñòαñ╛αñÜαñ╛ αñªαÑêαñ¿αñ┐αñò αñ¬αñ░αñ┐αñ¬αñ╛αñá αñ╕αÑìαñÑαñùαñ┐αññ αñ░αñ╛αñ╣αÑÇαñ▓.
              </p>
            </div>
          ) : !dbFormData ? (
            <div className="bg-amber-50/80 border-2 border-dashed border-amber-200 p-10 md:p-14 rounded-[3rem] text-center space-y-4 shadow-sm my-6 pdf-hide">
              <div className="size-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto text-amber-600 shadow-inner">
                <Calendar className="size-8" />
              </div>
              <h3 className="text-xl md:text-2xl font-black text-amber-900">
                αñªαñ┐αñ¿αñ╛αñéαñò {formData.dateMonth} ({formData.day}) αñ╕αñ╛αñáαÑÇ αñ¬αñ░αñ┐αñ¬αñ╛αñá αñëαñ¬αñ▓αñ¼αÑìαñº αñ¿αñ╛αñ╣αÑÇ
              </h3>
              <p className="text-slate-600 text-sm max-w-md mx-auto font-medium">
                αñ»αñ╛ αñªαñ┐αñ¿αñ╛αñéαñòαñ╛αñÜαñ╛ αñ¬αñ░αñ┐αñ¬αñ╛αñá αñ╕αÑüαñ¬αñ░ αÑ▓αñíαñ«αñ┐αñ¿ αñòαñíαÑéαñ¿ αñàαñ£αÑéαñ¿ αñàαñ¬αñ▓αÑïαñí αñòαÑçαñ▓αÑçαñ▓αñ╛ αñ¿αñ╛αñ╣αÑÇ. αñòαÑâαñ¬αñ»αñ╛ αñòαÑàαñ▓αÑçαñéαñíαñ░αñ«αñºαÑéαñ¿ αñçαññαñ░ αñªαñ┐αñ¿αñ╛αñéαñò αñ¿αñ┐αñ╡αñíαñ╛ αñòαñ┐αñéαñ╡αñ╛ αÑ▓αñíαñ«αñ┐αñ¿ αñòαñíαÑéαñ¿ αñàαñ¬αñíαÑçαñƒ αñ╣αÑïαñúαÑìαñ»αñ╛αñÜαÑÇ αñ╡αñ╛αñƒ αñ¬αñ╣αñ╛.
              </p>
            </div>
          ) : (
            <>
              {/* School Info Display for PDF and UI */}
              {(schoolInfo.schoolName || schoolInfo.udise || schoolInfo.kendra || schoolInfo.taluka || schoolInfo.jilha) && (
                <div className="bg-[#f0fdf4] border-[2px] border-[#2e7d32] rounded-xl p-4 md:p-6 mb-6 w-full text-center shadow-sm">
                  {schoolInfo.schoolName && (
                    <h3 className="text-lg md:text-xl font-black text-[#166534] mb-3 drop-shadow-sm">
                      αñ╢αñ╛αñ│αÑçαñÜαÑç αñ¿αñ╛αñ╡: {schoolInfo.schoolName}
                    </h3>
                  )}
                  <div className="flex flex-col md:flex-row justify-between items-center gap-3 pt-3 border-t border-dashed border-[#86efac]">
                    <div className="text-sm md:text-base font-bold text-[#166534]">
                      αñòαÑçαñéαñªαÑìαñ░: <span className="font-black text-[#15803d]">{schoolInfo.kendra || '-'}</span> &nbsp;|&nbsp; 
                      αñ»αÑüαñíαñ╛αñ»αñ╕ (UDISE): <span className="font-black text-[#15803d]">{schoolInfo.udise || '-'}</span>
                    </div>
                    <div className="text-sm md:text-base font-bold text-[#166534]">
                      αññαñ╛αñ▓αÑüαñòαñ╛: <span className="font-black text-[#15803d]">{schoolInfo.taluka || '-'}</span> &nbsp;|&nbsp; 
                      αñ£αñ┐αñ▓αÑìαñ╣αñ╛: <span className="font-black text-[#15803d]">{schoolInfo.jilha || '-'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Assembly Start Items (Anthem, State Song, Pledge, Preamble, Prayer) */}
              <div className="flex justify-center mb-4 pdf-hide">
                <h4 className="text-xl md:text-2xl font-black text-green-800 inline-flex items-center justify-center gap-3 px-8 py-4 bg-green-50 rounded-full shadow-sm border border-green-100 uppercase tracking-widest">
                  {t.assemblyStart}
                </h4>
              </div>

          {[
            { key: 'nationalAnthem', fallbackIdx: 0 },
            { key: 'stateAnthem', fallbackIdx: 1 },
            { key: 'pledge', fallbackIdx: 2 },
            { key: 'preamble', fallbackIdx: 3 },
            { key: 'prayer', fallbackIdx: 4 },
            { key: 'silentPasayadan', fallbackIdx: 5 },
          ].map((itemDef, idx) => {
            const fallbackItem = assemblyItems[itemDef.fallbackIdx];
            const content =
              formData[itemDef.key] ||
              formData[`${itemDef.key}_mr`] ||
              formData[`${itemDef.key}_en`] ||
              formData[`${itemDef.key}_hi`] ||
              fallbackItem.content;

            return (
              <div key={idx} id={itemDef.key} className="assembly-section-card bg-white p-4 md:p-8 rounded-[2rem] border border-green-100 shadow-md text-center mb-4">
                <div className="flex justify-center mb-4">
                  <label className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-green-50 text-green-700 rounded-full text-sm font-black uppercase tracking-wider border border-green-100">
                    {fallbackItem.label}
                  </label>
                </div>
                <div className="text-base md:text-xl text-slate-900 font-extrabold leading-relaxed font-sans text-center">
                  {content.split('\n').map((line: string, i: number) => (
                    <React.Fragment key={i}>
                      {line}
                      <br />
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Panchang */}
          {(formData.month || formData.tithi || formData.nakshatra || formData.yog || formData.sunrise || formData.sunset) && (
            <SectionCard
              id="panchang"
              emoji="≡ƒ¬Ç"
              title={t.panchang}
              icon={Calendar}
              gradient="from-amber-100/80 via-orange-50/60 to-yellow-100/80"
              pageBreak={false}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {[
                  { label: t.day, value: formData.day, icon: Calendar, color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-100" },
                  { label: t.month, value: formData.month, icon: Clock, color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-100" },
                  { label: t.paksha, value: formData.paksha, icon: Star, color: "text-yellow-500", bg: "bg-yellow-50", border: "border-yellow-100" },
                  { label: t.tithi, value: formData.tithi, icon: Star, color: "text-red-400", bg: "bg-red-50", border: "border-red-100" },
                  { label: t.nakshatra, value: formData.nakshatra, icon: Sparkles, color: "text-rose-500", bg: "bg-rose-50", border: "border-rose-100" },
                  { label: t.yog, value: formData.yog, icon: Sparkles, color: "text-pink-500", bg: "bg-pink-50", border: "border-pink-100" },
                  { label: t.sunrise, value: formData.sunrise, icon: Sunrise, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
                  { label: t.sunset, value: formData.sunset, icon: Sunset, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100" },
                ].filter(item => Boolean(item.value)).map((item, i) => (
                  <div
                    key={i}
                    className={`p-3 md:p-4 bg-white/80 backdrop-blur-xl border border-white rounded-xl md:rounded-2xl text-center shadow-lg shadow-amber-900/5 hover:scale-105 hover:shadow-xl hover:shadow-amber-900/10 transition-all duration-300 relative overflow-hidden group`}
                  >
                    <div className={`absolute -right-4 -top-4 size-16 ${item.bg} rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity`} />
                    <div className={`size-10 rounded-xl ${item.bg} ${item.border} border flex items-center justify-center mx-auto mb-2 relative z-10 group-hover:rotate-6 transition-transform`}>
                      <item.icon className={`size-5 ${item.color}`} />
                    </div>
                    <div className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5 relative z-10">
                      {item.label}
                    </div>
                    <div className="text-sm md:text-lg font-black text-slate-800 relative z-10">{item.value}</div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Suvichar */}
          {formData.thought && (
            <SectionCard
              id="thought"
              emoji="≡ƒ¬Ç"
              title={t.thought}
              icon={Quote}
              gradient="from-violet-100/80 via-fuchsia-50/60 to-purple-100/80"
              pageBreak={false}
            >
              <div className="p-6 md:p-10 bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] flex flex-col items-center justify-center text-center shadow-xl shadow-violet-900/5 hover:shadow-2xl hover:shadow-violet-900/10 transition-all duration-500 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-48 h-48 bg-violet-200/40 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2 group-hover:bg-violet-300/40 transition-colors" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-fuchsia-200/40 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2 group-hover:bg-fuchsia-300/40 transition-colors" />

                <div className="size-14 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center mb-5 relative z-10 shadow-inner">
                  <Quote className="size-7 text-violet-500" />
                </div>
                <p className="text-xl md:text-2xl font-black text-slate-800 leading-relaxed italic relative z-10 drop-shadow-sm">
                  "{formData.thought}"
                </p>
              </div>
            </SectionCard>
          )}

          {/* Shlok */}
          {formData.shlok && (
            <SectionCard
              id="shlok"
              emoji="≡ƒòë∩╕Å"
              title={(t as any).shlok || "αñ╢αÑìαñ▓αÑïαñò"}
              icon={Quote}
              gradient="from-amber-100/80 via-rose-50/60 to-orange-100/80"
              pageBreak={false}
            >
              <div className="p-6 md:p-10 bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] flex flex-col items-center justify-center text-center shadow-xl shadow-amber-900/5 hover:shadow-2xl hover:shadow-amber-900/10 transition-all duration-500 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-48 h-48 bg-amber-200/40 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2 group-hover:bg-amber-300/40 transition-colors" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-200/40 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2 group-hover:bg-rose-300/40 transition-colors" />

                <div className="size-14 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center mb-5 relative z-10 shadow-inner">
                  <Quote className="size-7 text-amber-600" />
                </div>
                <p className="text-xl md:text-2xl font-black text-slate-800 leading-relaxed relative z-10 drop-shadow-sm whitespace-pre-line">
                  "{formData.shlok}"
                </p>
              </div>
            </SectionCard>
          )}

          {/* M'han & Arth */}
          {formData.proverb && (
            <SectionCard
              id="proverb"
              emoji="≡ƒ¬Ç"
              title={t.proverbTitle}
              icon={BookOpen}
              gradient="from-teal-100/80 via-emerald-50/60 to-cyan-100/80"
              pageBreak={true}
            >
              <div className="space-y-4">
                <div className="p-5 md:p-8 bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] text-center shadow-xl shadow-teal-900/5 hover:shadow-teal-900/10 transition-all relative overflow-hidden group">
                  <div className="absolute right-0 top-0 w-24 h-24 bg-teal-200/30 blur-[40px] rounded-full" />
                  <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-[10px] font-black text-teal-600 uppercase tracking-wider mb-4 relative z-10">
                    {t.proverb}
                  </div>
                  <p className="text-lg md:text-2xl font-black text-slate-800 relative z-10 leading-relaxed">"{formData.proverb}"</p>
                </div>
                {formData.proverbMeaning && (
                  <div className="p-5 md:p-8 bg-white border border-white/80 rounded-[2rem] text-center shadow-lg shadow-slate-200/50">
                    <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider mb-3">
                      {t.proverbMeaning}
                    </div>
                    <p className="text-base md:text-lg font-bold text-slate-600 leading-relaxed max-w-3xl mx-auto">{formData.proverbMeaning}</p>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* Dinvishesh */}
          {(formData.events || formData.dinvishesh) && (
            <SectionCard
              id="events"
              emoji="≡ƒ¬Ç"
              title={`${formData.dateMonth ? formData.dateMonth + ' ' : ''}${t.eventsTitle || 'αñªαñ┐αñ¿αñ╡αñ┐αñ╢αÑçαñ╖'}`}
              icon={Calendar}
              gradient="from-blue-100/80 via-indigo-50/60 to-sky-100/80"
              pageBreak={false}
            >
              <div className="space-y-6">
                {formData.yearDay && (
                  <div className="flex justify-center mb-4">
                    <span className="text-sm font-black text-blue-800 bg-blue-50 border border-blue-100 px-6 py-2 rounded-full uppercase tracking-widest">
                      {t.yearDayStr.replace("${yearDay}", formData.yearDay)}
                    </span>
                  </div>
                )}

                <div className="p-5 md:p-8 bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] shadow-xl shadow-blue-900/5">
                  <div className="text-sm md:text-base font-bold text-slate-800 leading-relaxed font-sans">
                    {((formData.events || formData.dinvishesh) as string).split('\n').map((line: string, i: number) => (
                      <React.Fragment key={i}>
                        {line}
                        <br />
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {/* Patriotic Song */}
          {formData.patrioticSong && (
            <SectionCard
              id="song"
              emoji="≡ƒ¬Ç"
              title={t.patrioticSongTitle}
              icon={Music}
              gradient="from-orange-100/80 via-red-50/60 to-amber-100/80"
              pageBreak={true}
            >
              <div className="space-y-6">
                {formData.songTitle && (
                  <div className="flex justify-center">
                    <div className="inline-flex items-center justify-center gap-3 px-8 py-3 bg-white/80 backdrop-blur-xl border border-white shadow-xl shadow-orange-900/5 rounded-full">
                      <div className="size-8 rounded-full bg-orange-100 flex items-center justify-center">
                        <Music className="size-4 text-orange-600" />
                      </div>
                      <span className="text-sm font-black text-orange-700 uppercase tracking-widest">{formData.songTitle}</span>
                    </div>
                  </div>
                )}
                <div className="p-5 md:p-8 bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] text-center shadow-xl shadow-orange-900/5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-orange-50/30 to-transparent pointer-events-none" />
                  <div className="text-base md:text-xl font-bold text-slate-800 leading-relaxed font-sans relative z-10">
                    {formData.patrioticSong.split('\n').map((line: string, i: number) => (
                      <React.Fragment key={i}>
                        {line}
                        <br />
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {/* Moral Story */}
          {formData.story && (
            <SectionCard
              id="story"
              emoji="≡ƒ¬Ç"
              title={t.storyTitle}
              icon={BookOpen}
              gradient="from-pink-100/80 via-rose-50/60 to-red-100/80"
              pageBreak={false}
            >
              <div className="space-y-6">
                {formData.storyTitle && (
                  <div className="flex justify-center">
                    <div className="inline-flex items-center justify-center gap-3 px-8 py-3 bg-white/80 backdrop-blur-xl border border-white shadow-xl shadow-pink-900/5 rounded-full">
                      <div className="size-8 rounded-full bg-pink-100 flex items-center justify-center">
                        <BookOpen className="size-4 text-pink-600" />
                      </div>
                      <span className="text-sm font-black text-pink-700 uppercase tracking-widest">{formData.storyTitle}</span>
                    </div>
                  </div>
                )}
                <div className="p-5 md:p-8 bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] text-center shadow-xl shadow-pink-900/5">
                  <div className="text-sm md:text-base font-bold text-slate-800 leading-relaxed">
                    {formData.story.split('\n').map((line: string, i: number) => (
                      <React.Fragment key={i}>
                        {line}
                        <br />
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                {formData.moral && (
                  <div className="p-5 md:p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-[2rem] flex flex-col items-center text-center gap-3 shadow-lg shadow-amber-900/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-white/40 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="size-12 rounded-full bg-amber-100 flex items-center justify-center shadow-inner relative z-10">
                      <Star className="size-6 text-amber-500" />
                    </div>
                    <div className="relative z-10">
                      <div className="inline-block px-3 py-1 rounded-full bg-amber-200/50 text-[10px] font-black text-amber-700 uppercase tracking-wider mb-3">{t.moral}</div>
                      <p className="text-lg md:text-xl font-black text-amber-900 leading-relaxed">{formData.moral}</p>
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* Value News */}
          {formData.valueNews && (
            <SectionCard
              id="valueNews"
              emoji="≡ƒô░"
              title={(t as any).valueNews || "αñ╕αÑüαñ╕αñéαñ╕αÑìαñòαñ╛αñ░αñòαÑìαñ╖αñ« αñ¼αñ╛αññαñ«αÑìαñ»αñ╛"}
              icon={BookOpen}
              gradient="from-emerald-100/80 via-teal-50/60 to-emerald-50/80"
              pageBreak={false}
            >
              <div className="p-5 md:p-8 bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] text-center shadow-xl shadow-emerald-900/5">
                <div className="text-base md:text-xl font-bold text-slate-800 leading-relaxed font-sans">
                  {formData.valueNews.split('\n').map((line: string, i: number) => (
                    <React.Fragment key={i}>
                      {line}
                      <br />
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </SectionCard>
          )}

          {/* General Knowledge */}
          {(formData.gkQ1 || formData.gkQ2 || formData.gkQ3 || formData.gkQ4) && (
            <SectionCard
              id="gk"
              emoji="≡ƒ¬Ç"
              title={t.gkTitle}
              icon={HelpCircle}
              gradient="from-cyan-100/80 via-sky-50/60 to-blue-100/80"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { q: formData.gkQ1, a: formData.gkA1, label: t.q1, aLabel: t.a1, iconColor: "text-cyan-500", bg: "bg-cyan-50", border: "border-cyan-200" },
                  { q: formData.gkQ2, a: formData.gkA2, label: t.q2, aLabel: t.a2, iconColor: "text-sky-500", bg: "bg-sky-50", border: "border-sky-200" },
                  { q: formData.gkQ3, a: formData.gkA3, label: t.q3, aLabel: t.a3, iconColor: "text-blue-500", bg: "bg-blue-50", border: "border-blue-200" },
                  { q: formData.gkQ4, a: formData.gkA4, label: t.q4, aLabel: t.a4, iconColor: "text-indigo-500", bg: "bg-indigo-50", border: "border-indigo-200" },
                ].filter(item => item.q).map((item, i) => (
                  <div
                    key={i}
                    className="p-5 md:p-6 bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] shadow-xl shadow-cyan-900/5 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 text-center flex flex-col items-center relative overflow-hidden group"
                  >
                    <div className={`absolute inset-0 ${item.bg} opacity-30 group-hover:opacity-60 transition-opacity`} />
                    <div className={`size-12 rounded-full bg-white border ${item.border} flex items-center justify-center mb-4 shadow-sm relative z-10`}>
                      <HelpCircle className={`size-5 ${item.iconColor}`} />
                    </div>
                    <p className="text-base md:text-lg font-black text-slate-800 mb-5 relative z-10 flex-grow leading-relaxed">{item.q}</p>
                    <div className={`w-full px-4 py-3 bg-white border ${item.border} rounded-xl relative z-10 shadow-sm`}>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">{t.ans}</span>
                      <span className={`text-sm md:text-base font-black ${item.iconColor} drop-shadow-sm`}>{item.a}</span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}


        </>
      )}
        </>
      )}
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
      label: lang === "en" ? "Daily Assembly" : "αñªαÑêαñ¿αñ┐αñò αñ¬αñ░αÑÇαñ¬αñ╛αñá",
      sub: lang === "en" ? "Full Paripath" : "αñ╕αñéαñ¬αÑéαñ░αÑìαñú αñ¬αñ░αñ┐αñ¬αñ╛αñá",
      icon: BookMarked,
      color: "text-orange-500",
      bg: "bg-orange-50",
      gradient: "from-orange-50 to-white",
    },
    {
      id: "assembly-book",
      label: lang === "en" ? "Assembly Book" : "αñ¬αñ░αñ┐αñ¬αñ╛αñá αñ¬αÑüαñ╕αÑìαññαñò",
      sub: lang === "en" ? "Reference Guide" : "αñ«αñ╛αñ░αÑìαñùαñªαñ░αÑìαñ╢αñ┐αñòαñ╛",
      icon: BookOpen,
      color: "text-blue-500",
      bg: "bg-blue-50",
      gradient: "from-blue-50 to-white",
    },
    {
      id: "month-paripath",
      label: lang === "en" ? "Month Register" : "αñ«αñ╛αñ╕αñ┐αñò αñ¬αñ░αñ┐αñ¬αñ╛αñá αñ¿αÑïαñéαñªαñ╡αñ╣αÑÇ",
      sub: lang === "en" ? "Paripath Register" : "αñ«αñ╛αñ╕αñ┐αñò αñ¿αÑïαñéαñª αññαñòαÑìαññαñ╛",
      icon: Table,
      color: "text-emerald-500",
      bg: "bg-emerald-50",
      gradient: "from-emerald-50 to-white",
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
            ) : activeSection === "month-paripath" ? (
              <MonthlyParipathRegister />
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
      mr: "αñ╢αñ┐αñòαñúαÑìαñ»αñ╛αñÜαÑç αñ╕αñ░αÑìαñ╡αñ╛αññ αñ╕αÑüαñéαñªαñ░ αñ╡αÑêαñ╢αñ┐αñ╖αÑìαñƒαÑìαñ» αñ«αÑìαñ╣αñúαñ£αÑç αññαÑç αññαÑüαñ«αñÜαÑìαñ»αñ╛αñòαñíαÑéαñ¿ αñòαÑïαñúαÑÇαñ╣αÑÇ αñ╣αñ┐αñ░αñ╛αñ╡αÑéαñ¿ αñÿαÑçαñè αñ╢αñòαññ αñ¿αñ╛αñ╣αÑÇ. αñ¼αÑÇ.αñ¼αÑÇ. αñòαñ┐αñéαñù αñ»αñ╛αñéαñÜαÑç αñ╣αÑç αñ╕αñûαÑïαñ▓ αñ╡αñ┐αñÜαñ╛αñ░ αñåαñ¬αñ▓αÑìαñ»αñ╛αñ▓αñ╛ αñåαñáαñ╡αñú αñòαñ░αÑéαñ¿ αñªαÑçαññαñ╛αññ αñòαÑÇ αñ╢αñ┐αñòαÑìαñ╖αñú αñ╣αÑÇ αñÅαñò αñòαñ╛αñ»αñ«αñ╕αÑìαñ╡αñ░αÑéαñ¬αÑÇ αñ╕αñéαñ¬αññαÑìαññαÑÇ αñåαñ╣αÑç αñ£αÑÇ αñ╡αÑìαñ»αñòαÑìαññαÑÇαñ▓αñ╛ αñ¡αÑîαññαñ┐αñò αñ╕αÑÇαñ«αñ╛αñéαñÜαÑìαñ»αñ╛ αñ¬αñ▓αÑÇαñòαñíαÑç αñ╕αñòαÑìαñ╖αñ« αñòαñ░αññαÑç. αññαÑüαñ«αÑìαñ╣αÑÇ αñ«αñ┐αñ│αñ╡αñ▓αÑçαñ▓αÑç αñ£αÑìαñ₧αñ╛αñ¿αñ╛αñÜαÑç αñ¬αÑìαñ░αññαÑìαñ»αÑçαñò αñòαñú αñàαñ╢αñ╛ αñ¡αñ╡αñ┐αñ╖αÑìαñ»αñ╛αñÜαñ╛ αñ¬αñ╛αñ»αñ╛ αñ░αñÜαññαñ╛αññ αñ£αñ┐αñÑαÑç αññαÑüαñ«αÑìαñ╣αÑÇ αñ╕αÑìαñ╡αññαñâαñÜαÑìαñ»αñ╛ αñ¿αñ╢αñ┐αñ¼αñ╛αñÜαÑç αñ╕αÑìαñ╡αñ╛αñ«αÑÇ αñàαñ╕αñ╛αñ▓.",
    },
    {
      en: "Education is the most powerful weapon which you can use to change the world. Nelson Mandela's words emphasize that learning is not just about personal growth but about societal transformation. By equipping ourselves with knowledge, we gain the strategic capability to address global challenges and build a more equitable and just society for everyone.",
      mr: "αñ╢αñ┐αñòαÑìαñ╖αñú αñ╣αÑç αñ£αñùαñ╛αñ▓αñ╛ αñ¼αñªαñ▓αñúαÑìαñ»αñ╛αñ╕αñ╛αñáαÑÇ αñ╡αñ╛αñ¬αñ░αñ▓αÑç αñ£αñ╛αñúαñ╛αñ░αÑç αñ╕αñ░αÑìαñ╡αñ╛αññ αñ╢αñòαÑìαññαñ┐αñ╢αñ╛αñ▓αÑÇ αñ╢αñ╕αÑìαññαÑìαñ░ αñåαñ╣αÑç. αñ¿αÑçαñ▓αÑìαñ╕αñ¿ αñ«αñéαñíαÑçαñ▓αñ╛ αñ»αñ╛αñéαñÜαÑç αñ╢αñ¼αÑìαñª αñ»αñ╛αñ╡αñ░ αñ¡αñ░ αñªαÑçαññαñ╛αññ αñòαÑÇ αñ╢αñ┐αñòαñúαÑç αñ╣αÑç αñòαÑçαñ╡αñ│ αñ╡αÑêαñ»αñòαÑìαññαñ┐αñò αñ╡αñ╛αñóαÑÇαñ╕αñ╛αñáαÑÇ αñ¿αñ╛αñ╣αÑÇ αññαñ░ αñ╕αñ╛αñ«αñ╛αñ£αñ┐αñò αñ¬αñ░αñ┐αñ╡αñ░αÑìαññαñ¿αñ╛αñ╕αñ╛αñáαÑÇ αñåαñ╣αÑç. αñ╕αÑìαñ╡αññαñâαñ▓αñ╛ αñ£αÑìαñ₧αñ╛αñ¿αñ╛αñ¿αÑç αñ╕αÑüαñ╕αñ£αÑìαñ£ αñòαñ░αÑéαñ¿, αñåαñ¬αñú αñ£αñ╛αñùαññαñ┐αñò αñåαñ╡αÑìαñ╣αñ╛αñ¿αñ╛αñéαñ¿αñ╛ αñ╕αñ╛αñ«αÑïαñ░αÑç αñ£αñ╛αñúαÑìαñ»αñ╛αñÜαÑÇ αñåαñúαñ┐ αñ╕αñ░αÑìαñ╡αñ╛αñéαñ╕αñ╛αñáαÑÇ αñàαñºαñ┐αñò αñ¿αÑìαñ»αñ╛αñ»αÑìαñ» αñ╕αñ«αñ╛αñ£ αñÿαñíαñ╡αñúαÑìαñ»αñ╛αñÜαÑÇ αñºαÑïαñ░αñúαñ╛αññαÑìαñ«αñò αñòαÑìαñ╖αñ«αññαñ╛ αñ¬αÑìαñ░αñ╛αñ¬αÑìαññ αñòαñ░αññαÑï.",
    },
    {
      en: "Don't let what you cannot do interfere with what you can do. This guidance from John Wooden encourages us to focus our energy on our strengths and possibilities rather than our limitations. Success is often the result of maximizing our current potential while steadily working towards overcoming our obstacles with persistence and a positive mindset.",
      mr: "αññαÑüαñ«αÑìαñ╣αÑÇ αñ£αÑç αñòαñ░αÑé αñ╢αñòαññ αñ¿αñ╛αñ╣αÑÇ, αññαÑç αññαÑüαñ«αÑìαñ╣αÑÇ αñ£αÑç αñòαñ░αÑé αñ╢αñòαññαñ╛ αññαÑìαñ»αñ╛αññ αñàαñíαñÑαñ│αñ╛ αñåαñúαÑé αñªαÑçαñè αñ¿αñòαñ╛. αñ£αÑëαñ¿ αñ╡αÑéαñíαñ¿ αñ»αñ╛αñéαñÜαÑç αñ╣αÑç αñ«αñ╛αñ░αÑìαñùαñªαñ░αÑìαñ╢αñ¿ αñåαñ¬αñ▓αÑìαñ»αñ╛αñ▓αñ╛ αñåαñ¬αñ▓αÑìαñ»αñ╛ αñ«αñ░αÑìαñ»αñ╛αñªαñ╛αñéαñÉαñ╡αñ£αÑÇ αñåαñ¬αñ▓αÑÇ αññαñ╛αñòαñª αñåαñúαñ┐ αñ╢αñòαÑìαñ»αññαñ╛αñéαñ╡αñ░ αñ▓αñòαÑìαñ╖ αñòαÑçαñéαñªαÑìαñ░αñ┐αññ αñòαñ░αñúαÑìαñ»αñ╛αñ╕ αñ¬αÑìαñ░αÑïαññαÑìαñ╕αñ╛αñ╣αñ┐αññ αñòαñ░αññαÑç. αñ»αñ╢ αñ╣αÑç αñ¼αñ▒αÑìαñ»αñ╛αñÜαñªαñ╛ αñåαñ¬αñ▓αÑìαñ»αñ╛ αñ╡αñ░αÑìαññαñ«αñ╛αñ¿ αñòαÑìαñ╖αñ«αññαÑçαñÜαñ╛ αñ£αñ╛αñ╕αÑìαññαÑÇαññ αñ£αñ╛αñ╕αÑìαññ αñ╡αñ╛αñ¬αñ░ αñòαñ░αñúαÑìαñ»αñ╛αñÜαÑç αñåαñúαñ┐ αñ╕αñòαñ╛αñ░αñ╛αññαÑìαñ«αñò αñ╡αñ┐αñÜαñ╛αñ░αñ╕αñ░αñúαÑÇαñ¿αÑç αñåαñ¬αñ▓αÑìαñ»αñ╛ αñàαñíαñÑαñ│αÑìαñ»αñ╛αñéαñ╡αñ░ αñ«αñ╛αññ αñòαñ░αñúαÑìαñ»αñ╛αñÜαÑç αñ½αñ│ αñàαñ╕αññαÑç.",
    },
    {
      en: "A person who never made a mistake never tried anything new. Albert Einstein's perspective validates the necessity of failure in the journey of innovation. Mistakes are not setbacks but essential stepping stones that provide critical insights, helping us refine our approach and eventually achieve breakthroughs that were previously unimaginable.",
      mr: "αñ£αÑìαñ»αñ╛ αñ╡αÑìαñ»αñòαÑìαññαÑÇαñ¿αÑç αñòαñºαÑÇαñÜ αñÜαÑéαñò αñòαÑçαñ▓αÑÇ αñ¿αñ╛αñ╣αÑÇ, αññαÑìαñ»αñ╛αñ¿αÑç αñòαñºαÑÇαñÜ αñòαñ╛αñ╣αÑÇ αñ¿αñ╡αÑÇαñ¿ αñòαñ░αñúαÑìαñ»αñ╛αñÜαñ╛ αñ¬αÑìαñ░αñ»αññαÑìαñ¿ αñòαÑçαñ▓αñ╛ αñ¿αñ╛αñ╣αÑÇ. αñàαñ▓αÑìαñ¼αñ░αÑìαñƒ αñåαñçαñ¿αñ╕αÑìαñƒαñ╛αñçαñ¿ αñ»αñ╛αñéαñÜαñ╛ αñªαÑâαñ╖αÑìαñƒαÑÇαñòαÑïαñ¿ αñ¿αñ╛αñ╡αñ┐αñ¿αÑìαñ»αñ¬αÑéαñ░αÑìαñú αñ¬αÑìαñ░αñ╡αñ╛αñ╕αñ╛αññ αñàαñ¬αñ»αñ╢αñ╛αñÜαÑÇ αñùαñ░αñ£ αñàαñºαÑïαñ░αÑçαñûαñ┐αññ αñòαñ░αññαÑï. αñÜαÑüαñòαñ╛ αñ»αñ╛ αñ«αñ╛αñÿαñ╛αñ░ αñ¿αñ╕αÑéαñ¿ αññαÑìαñ»αñ╛ αñ«αñ╣αññαÑìαññαÑìαñ╡αñ╛αñÜαÑìαñ»αñ╛ αñ¬αñ╛αñ»αñ▒αÑìαñ»αñ╛ αñåαñ╣αÑçαññ αñ£αÑìαñ»αñ╛ αñåαñ¬αñ▓αÑìαñ»αñ╛αñ▓αñ╛ αñºαñíαÑç αñªαÑçαññαñ╛αññ, αñåαñ¬αñ▓αÑÇ αñ¬αñªαÑìαñºαññ αñ╕αÑüαñºαñ╛αñ░αñúαÑìαñ»αñ╛αñ╕ αñ«αñªαññ αñòαñ░αññαñ╛αññ αñåαñúαñ┐ αñ╢αÑçαñ╡αñƒαÑÇ αñàαñ╢αñòαÑìαñ» αñ╡αñ╛αñƒαñúαñ╛αñ░αÑÇ αñ¬αÑìαñ░αñùαññαÑÇ αñ╕αñ╛αñºαÑìαñ» αñòαñ░αñúαÑìαñ»αñ╛αñ╕ αñ«αñªαññ αñòαñ░αññαñ╛αññ.",
    },
  ],
  stories: [
    {
      en: "The Elephant Rope: A traveler noticed that giant elephants were held by only a small rope tied to their front leg. They didn't try to break free because, as calves, they were conditioned to believe the rope was strong enough to hold them. This story teaches us that our limitations are often mental barriers created by past experiences, and we must break free from these self-imposed beliefs to realize our true potential.",
      mr: "αñ╣αññαÑìαññαÑÇαñÜαÑÇ αñªαÑïαñ░αÑÇ: αñÅαñòαñ╛ αñ¬αÑìαñ░αñ╡αñ╛αñ╢αñ╛αñ▓αñ╛ αñªαñ┐αñ╕αñ▓αÑç αñòαÑÇ αñ«αñ╣αñ╛αñòαñ╛αñ» αñ╣αññαÑìαññαÑÇαñéαñ¿αñ╛ αññαÑìαñ»αñ╛αñéαñÜαÑìαñ»αñ╛ αñ¬αÑüαñóαñÜαÑìαñ»αñ╛ αñ¬αñ╛αñ»αñ╛αñ▓αñ╛ αñ¼αñ╛αñéαñºαñ▓αÑçαñ▓αÑìαñ»αñ╛ αñÅαñòαñ╛ αñ▓αñ╣αñ╛αñ¿αñ╢αñ╛ αñªαÑïαñ░αÑÇαñ¿αÑç αñ░αÑïαñûαÑéαñ¿ αñºαñ░αñ▓αÑç αñ╣αÑïαññαÑç. αññαÑç αñ«αÑüαñòαÑìαññ αñ╣αÑïαñúαÑìαñ»αñ╛αñÜαñ╛ αñ¬αÑìαñ░αñ»αññαÑìαñ¿ αñòαñ░αññ αñ¿αñ╡αÑìαñ╣αññαÑç αñòαñ╛αñ░αñú, αñ▓αñ╣αñ╛αñ¿ αñàαñ╕αññαñ╛αñ¿αñ╛ αññαÑìαñ»αñ╛αñéαñ¿αñ╛ αñàαñ╕αÑç αñ╡αñ╛αñƒαñ╛αñ»αñÜαÑç αñòαÑÇ αññαÑÇ αñªαÑïαñ░αÑÇ αññαÑìαñ»αñ╛αñéαñ¿αñ╛ αñ░αÑïαñûαñúαÑìαñ»αñ╛αñ╕αñ╛αñáαÑÇ αñ¬αÑüαñ░αÑçαñ╢αÑÇ αñ«αñ£αñ¼αÑéαññ αñåαñ╣αÑç. αñ╣αÑÇ αñùαÑïαñ╖αÑìαñƒ αñåαñ¬αñ▓αÑìαñ»αñ╛αñ▓αñ╛ αñ╢αñ┐αñòαñ╡αññαÑç αñòαÑÇ αñåαñ¬αñ▓αÑìαñ»αñ╛ αñ«αñ░αÑìαñ»αñ╛αñªαñ╛ αñ¼αñ▒αÑìαñ»αñ╛αñÜαñªαñ╛ αñ¡αÑéαññαñòαñ╛αñ│αñ╛αññαÑÇαñ▓ αñàαñ¿αÑüαñ¡αñ╡αñ╛αñéαñ¿αÑÇ αññαñ»αñ╛αñ░ αñòαÑçαñ▓αÑçαñ▓αÑç αñ«αñ╛αñ¿αñ╕αñ┐αñò αñàαñíαñÑαñ│αÑç αñàαñ╕αññαñ╛αññ αñåαñúαñ┐ αñåαñ¬αñ▓αÑÇ αñûαñ░αÑÇ αñòαÑìαñ╖αñ«αññαñ╛ αñôαñ│αñûαñúαÑìαñ»αñ╛αñ╕αñ╛αñáαÑÇ αñåαñ¬αñú αñ»αñ╛ αñ╕αÑìαñ╡αññαñâαñ╣αÑéαñ¿ αñ▓αñ╛αñªαñ▓αÑçαñ▓αÑìαñ»αñ╛ αñ╡αñ┐αñ╢αÑìαñ╡αñ╛αñ╕αñ╛αññαÑéαñ¿ αñ«αÑüαñòαÑìαññ αñ¥αñ╛αñ▓αÑç αñ¬αñ╛αñ╣αñ┐αñ£αÑç.",
    },
    {
      en: "The Starfish Thrower: An old man saw a boy throwing starfish back into the ocean after a storm. When asked why he bothered since there were thousands, the boy picked one up, threw it back, and said, 'It made a difference to that one.' This narrative reminds us that while we cannot solve every problem in the world, every small act of kindness we perform has a profound and lasting impact on the individuals we help.",
      mr: "αñ╕αÑìαñƒαñ╛αñ░αñ½αñ┐αñ╢ αñ½αÑçαñòαñúαñ╛αñ░αñ╛ αñ«αÑüαñ▓αñùαñ╛: αñÅαñòαñ╛ αñ╡αÑâαñªαÑìαñº αñ«αñ╛αñúαñ╕αñ╛αñ¿αÑç αñÅαñòαñ╛ αñ«αÑüαñ▓αñ╛αñ▓αñ╛ αñ╡αñ╛αñªαñ│αñ╛αñ¿αñéαññαñ░ αñ╕αñ«αÑüαñªαÑìαñ░αñ╛αñÜαÑìαñ»αñ╛ αñòαñ┐αñ¿αñ╛αñ▒αÑìαñ»αñ╛αñ╡αñ░ αñ¬αñíαñ▓αÑçαñ▓αÑç αñ╕αÑìαñƒαñ╛αñ░αñ½αñ┐αñ╢ αñ¬αÑüαñ¿αÑìαñ╣αñ╛ αñ╕αñ«αÑüαñªαÑìαñ░αñ╛αññ αñ½αÑçαñòαññαñ╛αñ¿αñ╛ αñ¬αñ╛αñ╣αñ┐αñ▓αÑç. αñ£αÑçαñ╡αÑìαñ╣αñ╛ αññαÑìαñ»αñ╛αñ▓αñ╛ αñ╡αñ┐αñÜαñ╛αñ░αñ▓αÑç αñùαÑçαñ▓αÑç αñòαÑÇ αñ╣αñ£αñ╛αñ░αÑï αñ╕αÑìαñƒαñ╛αñ░αñ½αñ┐αñ╢ αñàαñ╕αññαñ╛αñ¿αñ╛ αññαÑï αñ╣αñ╛ αññαÑìαñ░αñ╛αñ╕ αñòαñ╛ αñÿαÑçαññ αñåαñ╣αÑç, αññαÑçαñ╡αÑìαñ╣αñ╛ αññαÑìαñ»αñ╛ αñ«αÑüαñ▓αñ╛αñ¿αÑç αñÅαñò αñ╕αÑìαñƒαñ╛αñ░αñ½αñ┐αñ╢ αñëαñÜαñ▓αñ▓αñ╛, αññαÑï αñ╕αñ«αÑüαñªαÑìαñ░αñ╛αññ αñ½αÑçαñòαñ▓αñ╛ αñåαñúαñ┐ αñ«αÑìαñ╣αñúαñ╛αñ▓αñ╛, 'αñ»αñ╛ αñÅαñòαñ╛αñ╕αñ╛αñáαÑÇ αññαñ░αÑÇ αñ½αñ░αñò αñ¬αñíαñ▓αñ╛.' αñ╣αÑÇ αñùαÑïαñ╖αÑìαñƒ αñåαñ¬αñ▓αÑìαñ»αñ╛αñ▓αñ╛ αñåαñáαñ╡αñú αñòαñ░αÑéαñ¿ αñªαÑçαññαÑç αñòαÑÇ αñåαñ¬αñú αñ£αñùαñ╛αññαÑÇαñ▓ αñ¬αÑìαñ░αññαÑìαñ»αÑçαñò αñ╕αñ«αñ╕αÑìαñ»αñ╛ αñ╕αÑïαñíαÑé αñ╢αñòαññ αñ¿αñ╕αñ▓αÑï αññαñ░αÑÇ, αñåαñ¬αñú αñòαÑçαñ▓αÑçαñ▓αÑÇ αñ¬αÑìαñ░αññαÑìαñ»αÑçαñò αñ¢αÑïαñƒαÑÇ αñªαñ»αñ╛αñ│αÑé αñòαÑâαññαÑÇ αñåαñ¬αñú αñ«αñªαññ αñòαÑçαñ▓αÑçαñ▓αÑìαñ»αñ╛ αñ╡αÑìαñ»αñòαÑìαññαÑÇαñ╡αñ░ αñûαÑïαñ▓ αñåαñúαñ┐ αñòαñ╛αñ»αñ«αñ╕αÑìαñ╡αñ░αÑéαñ¬αÑÇ αñ¬αÑìαñ░αñ¡αñ╛αñ╡ αñ¬αñ╛αñíαññαÑç.",
    },
  ],
  significance: [
    {
      en: "National Science Day: Commemorated to honor the discovery of the Raman Effect by Indian physicist Sir C.V. Raman. This day serves as a critical reminder of the importance of scientific inquiry and rational thinking in our daily lives. It encourages students to explore the wonders of the physical world and pursue careers in research and technology to contribute to global progress.",
      mr: "αñ░αñ╛αñ╖αÑìαñƒαÑìαñ░αÑÇαñ» αñ╡αñ┐αñ£αÑìαñ₧αñ╛αñ¿ αñªαñ┐αñ¿: αñ¡αñ╛αñ░αññαÑÇαñ» αñ¡αÑîαññαñ┐αñòαñ╢αñ╛αñ╕αÑìαññαÑìαñ░αñ£αÑìαñ₧ αñ╕αñ░ αñ╕αÑÇ.αñ╡αÑìαñ╣αÑÇ. αñ░αñ«αñú αñ»αñ╛αñéαñ¿αÑÇ αñ╢αÑïαñºαñ▓αÑçαñ▓αÑìαñ»αñ╛ 'αñ░αñ«αñú αñçαñ½αÑçαñòαÑìαñƒ'αñÜαÑìαñ»αñ╛ αñ╕αñ¿αÑìαñ«αñ╛αñ¿αñ╛αñ░αÑìαñÑ αñ╣αñ╛ αñªαñ┐αñ╡αñ╕ αñ╕αñ╛αñ£αñ░αñ╛ αñòαÑçαñ▓αñ╛ αñ£αñ╛αññαÑï. αñ╣αñ╛ αñªαñ┐αñ╡αñ╕ αñåαñ¬αñ▓αÑìαñ»αñ╛ αñªαÑêαñ¿αñéαñªαñ┐αñ¿ αñ£αÑÇαñ╡αñ¿αñ╛αññαÑÇαñ▓ αñ╡αÑêαñ£αÑìαñ₧αñ╛αñ¿αñ┐αñò αñÜαÑîαñòαñ╕ αñ¼αÑüαñªαÑìαñºαÑÇ αñåαñúαñ┐ αññαñ░αÑìαñòαñ╕αñéαñùαññ αñ╡αñ┐αñÜαñ╛αñ░αñ╛αñéαñÜαÑìαñ»αñ╛ αñ«αñ╣αññαÑìαññαÑìαñ╡αñ╛αñÜαÑÇ αñåαñáαñ╡αñú αñòαñ░αÑéαñ¿ αñªαÑçαññαÑï. αñ╣αÑç αñ╡αñ┐αñªαÑìαñ»αñ╛αñ░αÑìαñÑαÑìαñ»αñ╛αñéαñ¿αñ╛ αñ¡αÑîαññαñ┐αñò αñ£αñùαñ╛αñÜαÑç αñÜαñ«αññαÑìαñòαñ╛αñ░ αñ╢αÑïαñºαñúαÑìαñ»αñ╛αñ╕αñ╛αñáαÑÇ αñåαñúαñ┐ αñ£αñ╛αñùαññαñ┐αñò αñ¬αÑìαñ░αñùαññαÑÇαñ«αñºαÑìαñ»αÑç αñ»αÑïαñùαñªαñ╛αñ¿ αñªαÑçαñúαÑìαñ»αñ╛αñ╕αñ╛αñáαÑÇ αñ╕αñéαñ╢αÑïαñºαñ¿ αñåαñúαñ┐ αññαñéαññαÑìαñ░αñ£αÑìαñ₧αñ╛αñ¿αñ╛αñ«αñºαÑìαñ»αÑç αñòαñ░αñ┐αñàαñ░ αñòαñ░αñúαÑìαñ»αñ╛αñ╕αñ╛αñáαÑÇ αñ¬αÑìαñ░αÑïαññαÑìαñ╕αñ╛αñ╣αñ┐αññ αñòαñ░αññαÑç.",
    },
    {
      en: "World Environment Day: A global platform for inspiring positive change in the protection of our planet's ecosystems. It highlights the urgent need to address climate change, deforestation, and pollution through collective action. Students play a pivotal role as future stewards of the earth, and this day empowers them to adopt sustainable habits and advocate for a greener, healthier future for all living beings.",
      mr: "αñ£αñ╛αñùαññαñ┐αñò αñ¬αñ░αÑìαñ»αñ╛αñ╡αñ░αñú αñªαñ┐αñ¿: αñåαñ¬αñ▓αÑìαñ»αñ╛ αñùαÑìαñ░αñ╣αñ╛αñÜαÑìαñ»αñ╛ αñ¬αñ░αñ┐αñ╕αñéαñ╕αÑìαñÑαÑçαñÜαÑìαñ»αñ╛ αñ╕αñéαñ░αñòαÑìαñ╖αñúαñ╛αñ╕αñ╛αñáαÑÇ αñ╕αñòαñ╛αñ░αñ╛αññαÑìαñ«αñò αñ¼αñªαñ▓ αñÿαñíαñ╡αÑéαñ¿ αñåαñúαñúαÑìαñ»αñ╛αñ╕αñ╛αñáαÑÇ αñ╣αÑç αñÅαñò αñ£αñ╛αñùαññαñ┐αñò αñ╡αÑìαñ»αñ╛αñ╕αñ¬αÑÇαñá αñåαñ╣αÑç. αñ╣αÑç αñ╣αñ╡αñ╛αñ«αñ╛αñ¿ αñ¼αñªαñ▓, αñ£αñéαñùαñ▓αññαÑïαñí αñåαñúαñ┐ αñ¬αÑìαñ░αñªαÑéαñ╖αñú αñ»αñ╛αñéαñ╕αñ╛αñ░αñûαÑìαñ»αñ╛ αñ╕αñ«αñ╕αÑìαñ»αñ╛αñéαñ╡αñ░ αñÅαñòαññαÑìαñ░αñ┐αññ αñòαÑâαññαÑÇαñªαÑìαñ╡αñ╛αñ░αÑç αñ«αñ╛αññ αñòαñ░αñúαÑìαñ»αñ╛αñÜαÑÇ αñ¿αñ┐αñòαñí αñàαñºαÑïαñ░αÑçαñûαñ┐αññ αñòαñ░αññαÑç. αñ¬αÑâαñÑαÑìαñ╡αÑÇαñÜαÑç αñ¡αñ╛αñ╡αÑÇ αñ░αñòαÑìαñ╖αñò αñ«αÑìαñ╣αñúαÑéαñ¿ αñ╡αñ┐αñªαÑìαñ»αñ╛αñ░αÑìαñÑαÑÇ αñ«αñ╣αññαÑìαññαÑìαñ╡αñ╛αñÜαÑÇ αñ¡αÑéαñ«αñ┐αñòαñ╛ αñ¼αñ£αñ╛αñ╡αññαñ╛αññ αñåαñúαñ┐ αñ╣αñ╛ αñªαñ┐αñ╡αñ╕ αññαÑìαñ»αñ╛αñéαñ¿αñ╛ αñ╢αñ╛αñ╢αÑìαñ╡αññ αñ╕αñ╡αñ»αÑÇ αñ╕αÑìαñ╡αÑÇαñòαñ╛αñ░αñúαÑìαñ»αñ╛αñ╕ αñåαñúαñ┐ αñ╕αñ░αÑìαñ╡αñ╛αñéαñ╕αñ╛αñáαÑÇ αñ╣αñ┐αñ░αñ╡αÑìαñ»αñ╛αñùαñ╛αñ░ αñ¡αñ╡αñ┐αñ╖αÑìαñ»αñ╛αñÜαñ╛ αñ¬αÑüαñ░αñ╕αÑìαñòαñ╛αñ░ αñòαñ░αñúαÑìαñ»αñ╛αñ╕ αñ╕αñòαÑìαñ╖αñ« αñòαñ░αññαÑï.",
    },
  ],
  jokes: [
    {
      en: "Why did the teacher wear sunglasses in the classroom today? Because she said her students were so bright that they were literally dazzling! It's a humorous way to acknowledge the exceptional potential and intellectual brilliance that each student brings to the learning environment, encouraging them to keep shining in their academic pursuits.",
      mr: "αñåαñ£ αñ╡αñ░αÑìαñùαñ╛αññ αñ╢αñ┐αñòαÑìαñ╖αñòαñ╛αñ¿αÑç αñùαÑëαñùαñ▓ αñòαñ╛ αñ▓αñ╛αñ╡αñ▓αñ╛ αñ╣αÑïαññαñ╛? αñòαñ╛αñ░αñú αññαÑÇ αñ«αÑìαñ╣αñúαñ╛αñ▓αÑÇ αñòαÑÇ αññαñ┐αñÜαÑç αñ╡αñ┐αñªαÑìαñ»αñ╛αñ░αÑìαñÑαÑÇ αñçαññαñòαÑç αññαÑçαñ£αñ╕αÑìαñ╡αÑÇ (αñ¼αÑìαñ░αñ╛αñçαñƒ) αñ╣αÑïαññαÑç αñòαÑÇ αññαÑç αñàαñòαÑìαñ╖αñ░αñ╢αñâ αñíαÑïαñ│αÑç αñªαñ┐αñ¬αñ╡αÑéαñ¿ αñƒαñ╛αñòαññ αñ╣αÑïαññαÑç! αñ╣αñ╛ αñÅαñò αñ╡αñ┐αñ¿αÑïαñªαÑÇ αñ«αñ╛αñ░αÑìαñù αñåαñ╣αÑç αñ£αÑìαñ»αñ╛αñªαÑìαñ╡αñ╛αñ░αÑç αñ¬αÑìαñ░αññαÑìαñ»αÑçαñò αñ╡αñ┐αñªαÑìαñ»αñ╛αñ░αÑìαñÑαÑÇ αñ╢αÑêαñòαÑìαñ╖αñúαñ┐αñò αñ╡αñ╛αññαñ╛αñ╡αñ░αñúαñ╛αññ αñåαñúαññ αñàαñ╕αñ▓αÑçαñ▓αÑìαñ»αñ╛ αñ╡αñ┐αñ▓αñòαÑìαñ╖αñú αñòαÑìαñ╖αñ«αññαñ╛ αñåαñúαñ┐ αñ¼αÑîαñªαÑìαñºαñ┐αñò αññαÑçαñ£αñ╛αñÜαÑÇ αñ¬αÑìαñ░αñ╢αñéαñ╕αñ╛ αñòαÑçαñ▓αÑÇ αñ£αñ╛αññαÑç, αññαÑìαñ»αñ╛αñéαñ¿αñ╛ αññαÑìαñ»αñ╛αñéαñÜαÑìαñ»αñ╛ αñàαñ¡αÑìαñ»αñ╛αñ╕αñ╛αññ αñÜαñ«αñòαññ αñ░αñ╛αñ╣αñúαÑìαñ»αñ╛αñ╕ αñ¬αÑìαñ░αÑïαññαÑìαñ╕αñ╛αñ╣αñ┐αññ αñòαÑçαñ▓αÑç αñ£αñ╛αññαÑç.",
    },
    {
      en: "Why was the math book looking so incredibly sad and overwhelmed? Because it had way too many complex problems to solve all at once! This joke lightens the mood around a challenging subject like mathematics, reminding us that even though problems can seem daunting, they can be tackled one step at a time with patience, practice, and a bit of humor to keep us going.",
      mr: "αñùαñúαñ┐αññαñ╛αñÜαÑç αñ¬αÑüαñ╕αÑìαññαñò αñçαññαñòαÑç αñ¬αÑìαñ░αñÜαñéαñí αñªαÑüαñâαñûαÑÇ αñåαñúαñ┐ αñ╣αññαñ¼αñ▓ αñòαñ╛ αñªαñ┐αñ╕αññ αñ╣αÑïαññαÑç? αñòαñ╛αñ░αñú αññαÑìαñ»αñ╛αñÜαÑìαñ»αñ╛αñòαñíαÑç αñÅαñòαñ╛αñÜ αñ╡αÑçαñ│αÑÇ αñ╕αÑïαñíαñ╡αñúαÑìαñ»αñ╛αñ╕αñ╛αñáαÑÇ αñûαÑéαñ¬ αñ£αñ╛αñ╕αÑìαññ αñ£αñƒαñ┐αñ▓ αñ╕αñ«αñ╕αÑìαñ»αñ╛ (αñ¬αÑìαñ░αÑëαñ¼αÑìαñ▓αÑçαñ«αÑìαñ╕) αñ╣αÑïαññαÑìαñ»αñ╛! αñ╣αñ╛ αñ╡αñ┐αñ¿αÑïαñª αñùαñúαñ┐αññ αñ»αñ╛ αñåαñ╡αÑìαñ╣αñ╛αñ¿αñ╛αññαÑìαñ«αñò αñ╡αñ┐αñ╖αñ»αñ╛αñ¼αñªαÑìαñªαñ▓αñÜαÑÇ αñ¡αÑÇαññαÑÇ αñòαñ«αÑÇ αñòαñ░αññαÑï αñåαñúαñ┐ αñåαñ¬αñ▓αÑìαñ»αñ╛αñ▓αñ╛ αñåαñáαñ╡αñú αñòαñ░αÑéαñ¿ αñªαÑçαññαÑï αñòαÑÇ αñ╕αñ«αñ╕αÑìαñ»αñ╛ αñòαñ┐αññαÑÇαñ╣αÑÇ αñòαñáαÑÇαñú αñ╡αñ╛αñƒαñ▓αÑìαñ»αñ╛ αññαñ░αÑÇ, αñ╕αñéαñ»αñ«, αñ╕αñ░αñ╛αñ╡ αñåαñúαñ┐ αñÑαÑïαñíαÑìαñ»αñ╛ αñ╡αñ┐αñ¿αÑïαñªαñ╛αñ¿αÑç αññαÑìαñ»αñ╛ αñÅαñòαñ╛ αñ╡αÑçαñ│αÑÇ αñÅαñò αñàαñ╢αñ╛ αñ╕αÑïαñíαñ╡αñ▓αÑìαñ»αñ╛ αñ£αñ╛αñè αñ╢αñòαññαñ╛αññ.",
    },
  ],
  news: [
    {
      en: "The school is proud to announce the launch of a new state-of-the-art Digital Learning Hub, equipped with high-speed internet and advanced educational software. This initiative aims to provide students with the latest technological tools to enhance their research capabilities and prepare them for a future dominated by digital innovation. We encourage all students to utilize these resources responsibly to broaden their horizons.",
      mr: "αñ╢αñ╛αñ│αÑçαñ▓αñ╛ αñ¿αñ╡αÑÇαñ¿ αñàαññαÑìαñ»αñ╛αñºαÑüαñ¿αñ┐αñò 'αñíαñ┐αñ£αñ┐αñƒαñ▓ αñ▓αñ░αÑìαñ¿αñ┐αñéαñù αñ╣αñ¼' αñ╕αÑüαñ░αÑé αñ¥αñ╛αñ▓αÑìαñ»αñ╛αñÜαÑÇ αñÿαÑïαñ╖αñúαñ╛ αñòαñ░αññαñ╛αñ¿αñ╛ αñàαñ¡αñ┐αñ«αñ╛αñ¿ αñ╡αñ╛αñƒαññ αñåαñ╣αÑç, αñ£αÑç αñ╣αñ╛αñ»-αñ╕αÑìαñ¬αÑÇαñí αñçαñéαñƒαñ░αñ¿αÑçαñƒ αñåαñúαñ┐ αñ¬αÑìαñ░αñùαññ αñ╢αÑêαñòαÑìαñ╖αñúαñ┐αñò αñ╕αÑëαñ½αÑìαñƒαñ╡αÑçαñàαñ░αñ¿αÑç αñ╕αÑüαñ╕αñ£αÑìαñ£ αñåαñ╣αÑç. αñ»αñ╛ αñëαñ¬αñòαÑìαñ░αñ«αñ╛αñÜαñ╛ αñëαñªαÑìαñªαÑçαñ╢ αñ╡αñ┐αñªαÑìαñ»αñ╛αñ░αÑìαñÑαÑìαñ»αñ╛αñéαñ¿αñ╛ αññαÑìαñ»αñ╛αñéαñÜαÑìαñ»αñ╛ αñ╕αñéαñ╢αÑïαñºαñ¿ αñòαÑìαñ╖αñ«αññαñ╛ αñ╡αñ╛αñóαñ╡αñúαÑìαñ»αñ╛αñ╕αñ╛αñáαÑÇ αñåαñúαñ┐ αñíαñ┐αñ£αñ┐αñƒαñ▓ αñ¿αñ╛αñ╡αñ┐αñ¿αÑìαñ»αñ¬αÑéαñ░αÑìαñú αñ¡αñ╡αñ┐αñ╖αÑìαñ»αñ╛αñ╕αñ╛αñáαÑÇ αññαñ»αñ╛αñ░ αñòαñ░αñúαÑìαñ»αñ╛αñ╕αñ╛αñáαÑÇ αñ¿αñ╡αÑÇαñ¿ αññαñ╛αñéαññαÑìαñ░αñ┐αñò αñ╕αñ╛αñºαñ¿αÑç αñ¬αÑìαñ░αñªαñ╛αñ¿ αñòαñ░αñúαÑç αñåαñ╣αÑç. αñåαñ«αÑìαñ╣αÑÇ αñ╕αñ░αÑìαñ╡ αñ╡αñ┐αñªαÑìαñ»αñ╛αñ░αÑìαñÑαÑìαñ»αñ╛αñéαñ¿αñ╛ αñ╡αñ┐αñ¿αñéαññαÑÇ αñòαñ░αññαÑï αñòαÑÇ αññαÑìαñ»αñ╛αñéαñ¿αÑÇ αñ»αñ╛ αñ╕αñéαñ╕αñ╛αñºαñ¿αñ╛αñéαñÜαñ╛ αñ£αñ¼αñ╛αñ¼αñªαñ╛αñ░αÑÇαñ¿αÑç αñ╡αñ╛αñ¬αñ░ αñòαñ░αÑéαñ¿ αñåαñ¬αñ▓αÑÇ αñòαÑìαñ╖αñ┐αññαñ┐αñ£αÑç αñ╡αñ┐αñ╕αÑìαññαñ╛αñ░αñ▓αÑÇ αñ¬αñ╛αñ╣αñ┐αñ£αÑçαññ.",
    },
    {
      en: "Our annual inter-school Athletics Championship is scheduled to take place next Friday at the main sports complex. This event is a fantastic opportunity for our young athletes to demonstrate their physical prowess, teamwork, and sportsman spirit. We invite all parents and community members to join us in cheering for our students as they compete with dedication and excellence in various track and field events.",
      mr: "αñåαñ«αñÜαÑÇ αñ╡αñ╛αñ░αÑìαñ╖αñ┐αñò αñåαñéαññαñ░αñ╢αñ╛αñ▓αÑçαñ» αÑ▓αñÑαñ▓αÑçαñƒαñ┐αñòαÑìαñ╕ αñÜαÑàαñ«αÑìαñ¬αñ┐αñ»αñ¿αñ╢αñ┐αñ¬ αñ¬αÑüαñóαÑÇαñ▓ αñ╢αÑüαñòαÑìαñ░αñ╡αñ╛αñ░αÑÇ αñ«αÑüαñûαÑìαñ» αñòαÑìαñ░αÑÇαñíαñ╛ αñ╕αñéαñòαÑüαñ▓αñ╛αññ αñåαñ»αÑïαñ£αñ┐αññ αñòαÑçαñ▓αÑÇ αñ£αñ╛αñúαñ╛αñ░ αñåαñ╣αÑç. αñ╣αñ╛ αñòαñ╛αñ░αÑìαñ»αñòαÑìαñ░αñ« αñåαñ¬αñ▓αÑìαñ»αñ╛ αññαñ░αÑüαñú αñûαÑçαñ│αñ╛αñíαÑéαñéαñ╕αñ╛αñáαÑÇ αññαÑìαñ»αñ╛αñéαñÜαÑç αñ╢αñ╛αñ░αÑÇαñ░αñ┐αñò αñòαñ╕αñ¼, αñ╕αñ╛αñéαñÿαñ┐αñò αñòαñ╛αñ░αÑìαñ» αñåαñúαñ┐ αñûαñ┐αñ▓αñ╛αñíαÑéαñ╡αÑâαññαÑìαññαÑÇ αñ¬αÑìαñ░αñªαñ░αÑìαñ╢αñ┐αññ αñòαñ░αñúαÑìαñ»αñ╛αñÜαÑÇ αñÅαñò αñ╡αñ┐αñ▓αñòαÑìαñ╖αñú αñ╕αñéαñºαÑÇ αñåαñ╣αÑç. αñåαñ«αÑìαñ╣αÑÇ αñ╕αñ░αÑìαñ╡ αñ¬αñ╛αñ▓αñò αñåαñúαñ┐ αñ╕αñ«αñ╛αñ£αñ╛αññαÑÇαñ▓ αñ╕αñªαñ╕αÑìαñ»αñ╛αñéαñ¿αñ╛ αñ╡αñ┐αñ¿αñéαññαÑÇ αñòαñ░αññαÑï αñòαÑÇ αññαÑìαñ»αñ╛αñéαñ¿αÑÇ αñåαñ¬αñ▓αÑìαñ»αñ╛ αñ╡αñ┐αñªαÑìαñ»αñ╛αñ░αÑìαñÑαÑìαñ»αñ╛αñéαñÜαñ╛ αñëαññαÑìαñ╕αñ╛αñ╣ αñ╡αñ╛αñóαñ╡αñúαÑìαñ»αñ╛αñ╕αñ╛αñáαÑÇ αñëαñ¬αñ╕αÑìαñÑαñ┐αññ αñ░αñ╛αñ╣αñ╛αñ╡αÑç, αñòαñ╛αñ░αñú αññαÑç αñ╡αñ┐αñ╡αñ┐αñº αñƒαÑìαñ░αÑàαñò αñåαñúαñ┐ αñ½αÑÇαñ▓αÑìαñí αñ╕αÑìαñ¬αñ░αÑìαñºαñ╛αñéαñ«αñºαÑìαñ»αÑç αñ╕αñ«αñ░αÑìαñ¬αñ┐αññαñ¬αñúαÑç αñåαñúαñ┐ αñëαññαÑìαñòαÑâαñ╖αÑìαñƒαññαÑçαñ¿αÑç αñ¡αñ╛αñù αñÿαÑçαñúαñ╛αñ░ αñåαñ╣αÑçαññ.",
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
    { en: "June", mr: "αñ£αÑéαñ¿" },
    { en: "July", mr: "αñ£αÑüαñ▓αÑê" },
    { en: "August", mr: "αñæαñùαñ╕αÑìαñƒ" },
    { en: "September", mr: "αñ╕αñ¬αÑìαñƒαÑçαñéαñ¼αñ░" },
    { en: "October", mr: "αñæαñòαÑìαñƒαÑïαñ¼αñ░" },
    { en: "November", mr: "αñ¿αÑïαñ╡αÑìαñ╣αÑçαñéαñ¼αñ░" },
    { en: "December", mr: "αñíαñ┐αñ╕αÑçαñéαñ¼αñ░" },
    { en: "January", mr: "αñ£αñ╛αñ¿αÑçαñ╡αñ╛αñ░αÑÇ" },
    { en: "February", mr: "αñ½αÑçαñ¼αÑìαñ░αÑüαñ╡αñ╛αñ░αÑÇ" },
    { en: "March", mr: "αñ«αñ╛αñ░αÑìαñÜ" },
    { en: "April", mr: "αñÅαñ¬αÑìαñ░αñ┐αñ▓" },
    { en: "May", mr: "αñ«αÑç" }
  ];

  let subjects: string[] = [];
  if (numericClass <= 3) {
    subjects = ["αñ«αñ░αñ╛αñáαÑÇ", isSemi ? "Mathematics" : "αñùαñúαñ┐αññ", "αñçαñéαñùαÑìαñ░αñ£αÑÇ", "αñûαÑçαñ│αÑé αñòαñ░αÑé αñ╢αñ┐αñòαÑé"];
  } else if (numericClass === 4) {
    subjects = ["αñ«αñ░αñ╛αñáαÑÇ", "αñçαñéαñùαÑìαñ░αñ£αÑÇ", isSemi ? "Mathematics" : "αñùαñúαñ┐αññ", "αñ¬αñ░αñ┐αñ╕αñ░ αñàαñ¡αÑìαñ»αñ╛αñ╕ αÑº", "αñ¬αñ░αñ┐αñ╕αñ░ αñàαñ¡αÑìαñ»αñ╛αñ╕ αÑ¿"];
  } else if (numericClass === 5) {
    subjects = ["αñ«αñ░αñ╛αñáαÑÇ", "αñçαñéαñùαÑìαñ░αñ£αÑÇ", "αñ╣αñ┐αñéαñªαÑÇ", isSemi ? "Mathematics" : "αñùαñúαñ┐αññ", isSemi ? "General Science" : "αñ¬αñ░αñ┐αñ╕αñ░ αñàαñ¡αÑìαñ»αñ╛αñ╕ αÑº", isSemi ? "Social Sciences" : "αñ¬αñ░αñ┐αñ╕αñ░ αñàαñ¡αÑìαñ»αñ╛αñ╕ αÑ¿"];
  } else {
    subjects = ["αñ«αñ░αñ╛αñáαÑÇ", "αñçαñéαñùαÑìαñ░αñ£αÑÇ", "αñ╣αñ┐αñéαñªαÑÇ", isSemi ? "Mathematics" : "αñùαñúαñ┐αññ", isSemi ? "General Science" : "αñ╕αñ╛αñ«αñ╛αñ¿αÑìαñ» αñ╡αñ┐αñ£αÑìαñ₧αñ╛αñ¿", "αñçαññαñ┐αñ╣αñ╛αñ╕ αñ╡ αñ¿αñ╛αñùαñ░αñ┐αñòαñ╢αñ╛αñ╕αÑìαññαÑìαñ░", "αñ¡αÑéαñùαÑïαñ▓"];
  }

  if (numericClass === 1) {
    const syllabusBySubject: Record<string, Record<string, { topic: string; objectives: string; activity: string }>> = {};
    subjects.forEach(subject => {
      syllabusBySubject[subject] = {};
    });

    const mathSubjectName = isSemi ? "Mathematics" : "αñùαñúαñ┐αññ";

    const syllabusData = class1SyllabusData as any;
    months.forEach(m => {
      syllabusBySubject["αñ«αñ░αñ╛αñáαÑÇ"][m.en] = syllabusData.marathi[m.en];
      syllabusBySubject[mathSubjectName][m.en] = isSemi ? syllabusData.math_en[m.en] : syllabusData.math_mr[m.en];
      syllabusBySubject["αñçαñéαñùαÑìαñ░αñ£αÑÇ"][m.en] = syllabusData.english[m.en];
      syllabusBySubject["αñûαÑçαñ│αÑé αñòαñ░αÑé αñ╢αñ┐αñòαÑé"][m.en] = syllabusData.kks[m.en];
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
        topic = langIsEng ? "Summer Vacation / Holidays" : "αñëαñ¿αÑìαñ╣αñ╛αñ│αÑÇ αñ╕αÑüαñƒαÑìαñƒαÑÇ";
        objectives = langIsEng ? "Revision and summer homework assignment" : "αñùαÑâαñ╣αñ¬αñ╛αñá αñ╡ αñ╕αÑüαñƒαÑìαñƒαÑÇ αñëαñ¬αñòαÑìαñ░αñ«.";
        activity = langIsEng ? "Creative projects and hobby exploration" : "αñ╡αñ┐αñ╡αñ┐αñº αñ¢αñéαñª αñ£αÑïαñ¬αñ╛αñ╕αñúαÑç αñ╡ αñùαÑâαñ╣αñ¬αÑìαñ░αñòαñ▓αÑìαñ¬.";
      } else if (subject.includes("αñ«αñ░αñ╛αñáαÑÇ")) {
        if (monthNameEn === "June") {
          topic = "αñ¬αñ╛αñá αÑº. αñ«αñ╛αñ» αñ«αñ░αñ╛αñáαÑÇ (αñòαñ╡αñ┐αññαñ╛)";
          objectives = "αñòαñ╡αñ┐αññαÑçαñÜαÑç αññαñ╛αñ▓αñ╛αñ╕αÑüαñ░αñ╛αññ αñùαñ╛αñ»αñ¿ αñòαñ░αñúαÑç, αñ«αñ╛αññαÑâαñ¡αñ╛αñ╖αÑçαñ╡αñ┐αñ╖αñ»αÑÇ αñ¬αÑìαñ░αÑçαñ« αñ£αñ╛αñùαÑâαññ αñòαñ░αñúαÑç.";
          activity = "αñ╕αñ╛αñ«αÑéαñ╣αñ┐αñò αñòαñ╡αñ┐αññαñ╛ αñùαñ╛αñ»αñ¿ αñ╡ αñ╕αÑüαñ▓αÑçαñûαñ¿ αñ╕αñ░αñ╛αñ╡.";
        } else if (monthNameEn === "July") {
          topic = "αñ¬αñ╛αñá αÑ¿. αñ╣αññαÑìαññαÑÇαñÜαÑç αñÜαñ╛αññαÑüαñ░αÑìαñ» & αñ╡αÑìαñ»αñ╛αñòαñ░αñú: αñ¿αñ╛αñ«";
          objectives = "αñÜαñ┐αññαÑìαñ░αñ╛αñ╡αñ░αÑéαñ¿ αñùαÑïαñ╖αÑìαñƒ αñ╕αñ╛αñéαñùαñúαÑç, αñ¿αñ╛αñ«αñ╛αñÜαÑÇ αñ╡αÑìαñ»αñ╛αñûαÑìαñ»αñ╛ αñ╡ αñëαñªαñ╛αñ╣αñ░αñúαÑç αñôαñ│αñûαñúαÑç.";
          activity = "αñÜαñ┐αññαÑìαñ░αÑç αñ¬αñ╛αñ╣αÑéαñ¿ αñùαÑïαñ╖αÑìαñƒ αñ¬αÑéαñ░αÑìαñú αñòαñ░αñúαÑç, αñ¿αñ╛αñ« αñôαñ│αñûαñ╛ αñ╕αÑìαñ¬αñ░αÑìαñºαñ╛.";
        } else if (monthNameEn === "August") {
          topic = "αñ¬αñ╛αñá αÑ⌐. αñûαÑçαñ│αÑéαñ»αñ╛ αñ╢αñ¼αÑìαñªαñ╛αñéαñ╢αÑÇ & αñ╡αÑìαñ»αñ╛αñòαñ░αñú: αñ╕αñ░αÑìαñ╡αñ¿αñ╛αñ«";
          objectives = "αñ¿αñ╡αÑÇαñ¿ αñ╢αñ¼αÑìαñªαñ╛αñéαñÜαñ╛ αñ╕αñéαñùαÑìαñ░αñ╣ αñòαñ░αñúαÑç, αñ╕αñ░αÑìαñ╡αñ¿αñ╛αñ«αñ╛αñÜαÑç αñëαñ¬αñ»αÑïαñù αñ╕αñ«αñ£αñúαÑç.";
          activity = "αñ¡αñ╛αñ╖αñ┐αñò αñûαÑçαñ│ αñûαÑçαñ│αñúαÑç, αñ╡αñ╛αñòαÑìαñ»αñ╛αñéαñ«αñºαÑÇαñ▓ αñ╕αñ░αÑìαñ╡αñ¿αñ╛αñ« αñ¼αñªαñ▓αñúαÑç.";
        } else if (monthNameEn === "September") {
          topic = "αñ¬αñ╛αñá αÑ¬. αñåαñ«αÑìαñ╣αÑÇ αñ£αñ╛αñ╣αñ┐αñ░αñ╛αññ αñ╡αñ╛αñÜαññαÑï & αñ╡αñ┐αñ╢αÑçαñ╖αñú";
          objectives = "αñ£αñ╛αñ╣αñ┐αñ░αñ╛αññαÑÇαñéαñÜαÑç αñ╡αñ╛αñÜαñ¿ αñòαñ░αÑéαñ¿ αñåαñòαñ▓αñ¿ αñòαñ░αñúαÑç, αñ╡αñ┐αñ╢αÑçαñ╖αñúαÑç αñôαñ│αñûαñúαÑç.";
          activity = "αñ╕αÑìαñ╡αññαñâ αñ╡αñ╕αÑìαññαÑéαñéαñÜαÑÇ αñ£αñ╛αñ╣αñ┐αñ░αñ╛αññ αññαñ»αñ╛αñ░ αñòαñ░αñúαÑç.";
        } else if (monthNameEn === "October") {
          topic = "αñ¬αÑìαñ░αñÑαñ« αñ╕αññαÑìαñ░ αñ¬αñ░αÑÇαñòαÑìαñ╖αñ╛ αñ╡ αñëαñ£αñ│αñúαÑÇ";
          objectives = "αñ╕αññαÑìαñ░ αÑº αñ«αñºαÑÇαñ▓ αñàαñ¡αÑìαñ»αñ╛αñ╕αñòαÑìαñ░αñ«αñ╛αñÜαÑç αñ«αÑéαñ▓αÑìαñ»αñ«αñ╛αñ¬αñ¿ αñòαñ░αñúαÑç.";
          activity = "αñ╕αñ░αñ╛αñ╡ αñ¬αÑìαñ░αñ╢αÑìαñ¿αñ¬αññαÑìαñ░αñ┐αñòαñ╛ αñ╕αÑïαñíαñ╡αñ┐αñúαÑç.";
        } else if (monthNameEn === "November") {
          topic = "αñ¬αñ╛αñá αÑ½. αñ╣αñ┐αñ╡αñ╛αñ│αñ╛ (αñòαñ╡αñ┐αññαñ╛) & αñ¿αñ┐αñ¼αñéαñº αñ▓αÑçαñûαñ¿";
          objectives = "αñïαññαÑéαñéαñ«αñºαÑÇαñ▓ αñ¼αñªαñ▓αñ╛αñéαñ╡αñ┐αñ╖αñ»αÑÇ αñ«αñ╛αñ╣αñ┐αññαÑÇ αñ«αñ┐αñ│αñ╡αñ┐αñúαÑç, αñ¿αñ┐αñ¼αñéαñº αñ▓αÑçαñûαñ¿ αñ╕αñ«αñ£αñúαÑç.";
          activity = "αñ«αñ╛αñ¥αñ╛ αñåαñ╡αñíαññαñ╛ αñïαññαÑé αñ»αñ╛αñ╡αñ░ αñ¿αñ┐αñ¼αñéαñº αñ▓αñ┐αñ╣αñ┐αñúαÑç.";
        } else if (monthNameEn === "December") {
          topic = "αñ¬αñ╛αñá αÑ¼. αñ¬αÑêαñ╢αñ╛αñéαñÜαÑç αñ╡αÑìαñ»αñ╡αñ╣αñ╛αñ░ & αñ¬αññαÑìαñ░αñ▓αÑçαñûαñ¿";
          objectives = "αñ¼αñüαñò αñåαñúαñ┐ αñªαÑêαñ¿αñéαñªαñ┐αñ¿ αñ╡αÑìαñ»αñ╡αñ╣αñ╛αñ░ αñ╕αñ«αñ£αñúαÑç, αñ¬αññαÑìαñ░ αñ▓αÑçαñûαñ¿ αñåαñ░αñ╛αñûαñíαñ╛ αñ╕αñ«αñ£αñúαÑç.";
          activity = "αñ¼αñüαñòαÑçαñ▓αñ╛ αñ¡αÑçαñƒ αñªαÑçαñúαÑç, αñÿαñ░αñùαÑüαññαÑÇ αñ¬αññαÑìαñ░ αñ▓αñ┐αñ╣αñ┐αñúαÑç.";
        } else if (monthNameEn === "January") {
          topic = "αñ¬αñ╛αñá αÑ¡. αñ£αÑïαñíαñ╢αñ¼αÑìαñª αñ╡ αñ╕αÑüαñ╡αñ┐αñÜαñ╛αñ░ αñ▓αÑçαñûαñ¿";
          objectives = "αñ£αÑïαñíαñ╢αñ¼αÑìαñªαñ╛αñéαñÜαÑç αñ»αÑïαñùαÑìαñ» αñëαñÜαÑìαñÜαñ╛αñ░ αñ╡ αñ▓αÑçαñûαñ¿ αñòαñ░αñúαÑç.";
          activity = "αñªαñ░αñ░αÑïαñ£ αñÅαñò αñ╕αÑüαñ╡αñ┐αñÜαñ╛αñ░ αñ½αñ▓αñòαñ╛αñ╡αñ░ αñ▓αñ┐αñ╣αñ┐αñúαÑç.";
        } else if (monthNameEn === "February") {
          topic = "αñ¬αñ╛αñá αÑ«. αñ╡αñ┐αñ░αñ╛αñ«αñÜαñ┐αñ¿αÑìαñ╣αÑç αñ╡ αñòαÑìαñ░αñ┐αñ»αñ╛αñ¬αñª αñôαñ│αñû";
          objectives = "αñ▓αÑçαñûαñ¿αñ╛αññ αñ»αÑïαñùαÑìαñ» αñ╡αñ┐αñ░αñ╛αñ«αñÜαñ┐αñ¿αÑìαñ╣αñ╛αñéαñÜαñ╛ αñ╡αñ╛αñ¬αñ░ αñòαñ░αñúαÑç.";
          activity = "αñ¬αñ░αñ┐αñÜαÑìαñ¢αÑçαñªαñ╛αñ«αñºαÑÇαñ▓ αñ╡αñ┐αñ░αñ╛αñ«αñÜαñ┐αñ¿αÑìαñ╣αÑç αñ╢αÑïαñºαñúαÑç.";
        } else if (monthNameEn === "March") {
          topic = "αñòαñÑαñ╛αñ▓αÑçαñûαñ¿ αñ╡ αñ╕αñéαñ╡αñ╛αñª αñ╡αñ╛αñÜαñ¿ αñ╕αñ░αñ╛αñ╡";
          objectives = "αñùαÑïαñ╖αÑìαñƒαÑÇαñéαñÜαÑç αñ╕αÑìαñ╡αññαñâαñÜαÑìαñ»αñ╛ αñ╢αñ¼αÑìαñªαñ╛αñéαññ αñ╕αñ╛αñªαñ░αÑÇαñòαñ░αñú αñòαñ░αñúαÑç.";
          activity = "αñ¿αñ╛αñƒαÑìαñ»αÑÇαñòαñ░αñú αñ╡ αñ¬αÑìαñ░αñòαñƒ αñ╡αñ╛αñÜαñ¿.";
        } else {
          topic = "αñ╡αñ╛αñ░αÑìαñ╖αñ┐αñò αñ¬αñ░αÑÇαñòαÑìαñ╖αñ╛ αñåαñúαñ┐ αñëαñ£αñ│αñúαÑÇ";
          objectives = "αñ╕αñéαñ¬αÑéαñ░αÑìαñú αñ╡αñ░αÑìαñ╖αñ╛αñÜαñ╛ αñàαñ¡αÑìαñ»αñ╛αñ╕αñòαÑìαñ░αñ« αñëαñ£αñ│αñúαÑÇ αñ╡ αñàαñéαññαñ┐αñ« αñ«αÑéαñ▓αÑìαñ»αñ«αñ╛αñ¬αñ¿.";
          activity = "αñ«αÑîαñ▓αÑìαñ»αñ╡αñ╛αñ¿ αñ╕αñ░αñ╛αñ╡ αñÜαñ╛αñÜαñúαÑìαñ»αñ╛ αñåαñúαñ┐ αñùαÑüαñúαñªαñ╛αñ¿.";
        }
      } else if (subject.includes("Math") || subject.includes("αñùαñúαñ┐αññ")) {
        const langIsEng = isSemi || subject.toLowerCase().includes("math");
        if (monthNameEn === "June") {
          topic = langIsEng ? "Unit 1: Roman Numerals" : "αñÿαñƒαñò αÑº: αñ░αÑïαñ«αñ¿ αñ╕αñéαñûαÑìαñ»αñ╛αñÜαñ┐αñ¿αÑìαñ╣αÑç";
          objectives = langIsEng ? "Unit 1: Numbers and place value up to 100" : "αñÿαñƒαñò αÑº: αñ░αÑïαñ«αñ¿ αñ╕αñéαñûαÑìαñ»αñ╛αñÜαñ┐αñ¿αÑìαñ╣αÑç αñ╡ αñ╕αÑìαñÑαñ╛αñ¿αñ┐αñò αñòαñ┐αñéαñ«αññ";
          activity = langIsEng ? "Number chart activities and place value blocks" : "αñàαñ¼αÑçαñòαñ╕αñ╡αñ░ αñ╕αñéαñûαÑìαñ»αñ╛ αñªαñ╛αñûαñ╡αñúαÑç αñ╡ αñ▓αñ┐αñ╣αñ┐αñúαÑç.";
        } else if (monthNameEn === "July") {
          topic = langIsEng ? "Unit 2: Addition & Subtraction (up to 99)" : "αñÿαñƒαñò αÑ¿: αñ¼αÑçαñ░αÑÇαñ£ αñ╡ αñ╡αñ£αñ╛αñ¼αñ╛αñòαÑÇ (99 αñ¬αñ░αÑìαñ»αñéαññ)";
          objectives = langIsEng ? "Performing addition and subtraction with carrying/borrowing" : "αñ╣αñ╛αññαñëαñ╕αñ¿αÑç αñÿαÑçαñèαñ¿ αñ¼αÑçαñ░αÑÇαñ£-αñ╡αñ£αñ╛αñ¼αñ╛αñòαÑÇ αñòαñ░αñúαÑç.";
          activity = langIsEng ? "Abacus sums, mental math drills" : "αñ╕αñéαñûαÑìαñ»αñ╛αñ░αÑçαñ╖αÑçαñ╡αñ░ αñ¼αÑçαñ░αÑÇαñ£ αñ╡ αñ╡αñ£αñ╛αñ¼αñ╛αñòαÑÇ αñûαÑçαñ│.";
        } else if (monthNameEn === "August") {
          topic = langIsEng ? "Unit 3: Multiplication tables (2-5)" : "αñÿαñƒαñò αÑ⌐: αñùαÑüαñúαñ╛αñòαñ╛αñ░ αñ¬αñ╛αñóαÑç (αÑ¿ αññαÑç αÑ½)";
          objectives = langIsEng ? "Reciting and applying multiplication tables 2ΓÇô5" : "αñ¬αñ╛αñóαÑç αñ«αÑìαñ╣αñúαñúαÑç αñ╡ αñùαÑüαñúαñ╛αñòαñ╛αñ░ αñ╕αñ«αñ£αñúαÑç.";
          activity = langIsEng ? "Times tables songs and flashcard quiz" : "αñùαñ╛αñúαÑìαñ»αñ╛αñÜαÑìαñ»αñ╛ αñÜαñ╛αñ▓αÑÇαñ╡αñ░ αñ¬αñ╛αñóαÑç αñ«αÑìαñ╣αñúαñúαÑç.";
        } else if (monthNameEn === "September") {
          topic = langIsEng ? "Unit 4: Division ΓÇô equal sharing" : "αñÿαñƒαñò αÑ¬: αñ¡αñ╛αñùαñ╛αñòαñ╛αñ░ ΓÇô αñ╕αñ«αñ╛αñ¿ αñ╡αñ╛αñƒαñ¬";
          objectives = langIsEng ? "Understanding division as equal grouping" : "αñ╕αñ«αñ╛αñ¿ αñùαñƒαñ╛αñéαñ«αñºαÑìαñ»αÑç αñ╡αñ┐αñ¡αñ╛αñùαñúαÑÇ αñ╕αñ«αñ£αñúαÑç.";
          activity = langIsEng ? "Sharing objects equally in groups" : "αñ╡αñ╕αÑìαññαÑé αñ╕αñ«αñ╛αñ¿ αñùαñƒαñ╛αñéαññ αñ╡αñ╛αñƒαñ¬ αñòαñ░αñúαÑç.";
        } else if (monthNameEn === "October") {
          topic = langIsEng ? "Unit 5: Fractions & Half/Quarter" : "αñÿαñƒαñò αÑ½: αñàαñ¬αÑéαñ░αÑìαñúαñ╛αñéαñò ΓÇô αñàαñ░αÑìαñºαÑç αñ╡ αñ¬αñ╛αñ╡";
          objectives = langIsEng ? "Identifying ┬╜ and ┬╝ of shapes and sets" : "αñåαñòαÑâαññαÑÇαñéαñÜαÑç αñàαñ░αÑìαñºαÑç αñ╡ αñ¬αñ╛αñ╡ αñ¡αñ╛αñù αñôαñ│αñûαñúαÑç.";
          activity = langIsEng ? "Folding shapes into halves and quarters" : "αñòαñ╛αñùαñªαñ╛αñÜαÑìαñ»αñ╛ αñÿαñíαÑìαñ»αñ╛ αñÿαñ╛αñ▓αÑéαñ¿ αñàαñ░αÑìαñºαÑç αñªαñ╛αñûαñ╡αñúαÑç.";
        } else if (monthNameEn === "November") {
          topic = langIsEng ? "Unit 6: Measurement ΓÇô Length, Weight, Capacity" : "αñÿαñƒαñò αÑ¼: αñ«αñ╛αñ¬αñ¿ ΓÇô αñ▓αñ╛αñéαñ¼αÑÇ, αñ╡αñ£αñ¿ αñ╡ αñòαÑìαñ╖αñ«αññαñ╛";
          objectives = langIsEng ? "Measuring objects using standard & non-standard units" : "αñ«αñ╛αñ¿αñò αñ╡ αñàαñ«αñ╛αñ¿αñò αñÅαñòαñòαñ╛αñéαñ¿αÑÇ αñ«αñ╛αñ¬αñ¿ αñòαñ░αñúαÑç.";
          activity = langIsEng ? "Classroom measurement activities" : "αñ╡αñ░αÑìαñùαñ╛αññαÑÇαñ▓ αñ╡αñ╕αÑìαññαÑé αñ«αÑïαñ£αñúαÑç αñ╡ αññαÑüαñ▓αñ¿αñ╛ αñòαñ░αñúαÑç.";
        } else if (monthNameEn === "December") {
          topic = langIsEng ? "Unit 7: Time ΓÇô Reading Clock" : "αñÿαñƒαñò αÑ¡: αñ╡αÑçαñ│ ΓÇô αñÿαñíαÑìαñ»αñ╛αñ│ αñ╡αñ╛αñÜαñ¿";
          objectives = langIsEng ? "Reading time to the hour and half hour" : "αñ¬αÑéαñ░αÑìαñú αñ╡ αñàαñ░αÑìαñºαÑìαñ»αñ╛ αññαñ╛αñ╕αñ╛αñÜαÑÇ αñ╡αÑçαñ│ αñ╕αñ╛αñéαñùαñúαÑç.";
          activity = langIsEng ? "Clock model making and time matching" : "αñÿαñíαÑìαñ»αñ╛αñ│αñ╛αñÜαÑìαñ»αñ╛ αñòαñ╛αñƒαÑìαñ»αñ╛ αñ½αñ┐αñ░αñ╡αÑéαñ¿ αñ╡αÑçαñ│ αñªαñ╛αñûαñ╡αñúαÑç.";
        } else if (monthNameEn === "January") {
          topic = langIsEng ? "Unit 8: Money ΓÇô Coins and Notes" : "αñÿαñƒαñò αÑ«: αñ¬αÑêαñ╕αÑç ΓÇô αñ¿αñ╛αñúαÑÇ αñ╡ αñ¿αÑïαñƒαñ╛";
          objectives = langIsEng ? "Identifying and counting Indian currency" : "αñ¿αñ╛αñúαÑÇ αñ╡ αñ¿αÑïαñƒαñ╛ αñôαñ│αñûαñúαÑç αñ╡ αñ«αÑïαñ£αñúαÑç.";
          activity = langIsEng ? "Mock shop activity with paper notes" : "αñòαñ╛αñùαñªαÑÇ αñ¿αÑïαñƒαñ╛ αñ╡αñ╛αñ¬αñ░αÑéαñ¿ αñûαñ░αÑçαñªαÑÇ-αñ╡αñ┐αñòαÑìαñ░αÑÇ αñûαÑçαñ│.";
        } else if (monthNameEn === "February") {
          topic = langIsEng ? "Unit 9: Geometry ΓÇô Shapes & Patterns" : "αñÿαñƒαñò αÑ»: αñ¡αÑéαñ«αñ┐αññαÑÇ ΓÇô αñåαñòαñ╛αñ░ αñ╡ αñåαñòαÑâαññαÑÇαñ¼αñéαñº";
          objectives = langIsEng ? "Identifying 2D & 3D shapes and repeating patterns" : "αñ╕αñ«αññαñ▓ αñ╡ αñÿαñ¿αñ╛αñòαñ╛αñ░ αñåαñòαñ╛αñ░ αñôαñ│αñûαñúαÑç.";
          activity = langIsEng ? "Shape collage and pattern drawing" : "αñåαñòαñ╛αñ░αñ╛αñéαñÜαÑç αñÜαñ┐αññαÑìαñ░ αñòαñ╛αñóαñúαÑç αñ╡ αñ░αñéαñùαñ╡αñúαÑç.";
        } else if (monthNameEn === "March") {
          topic = langIsEng ? "Revision & Problem Solving" : "αñëαñ£αñ│αñúαÑÇ αñ╡ αñ╕αñ«αñ╕αÑìαñ»αñ╛ αñ╕αÑïαñíαñ╡αñúαÑç";
          objectives = langIsEng ? "Reviewing all math topics and solving word problems" : "αñ╕αñ░αÑìαñ╡ αñÿαñƒαñòαñ╛αñéαñÜαÑÇ αñëαñ£αñ│αñúαÑÇ αñ╡ αñ╢αñ¼αÑìαñªαñ╕αñ«αñ╕αÑìαñ»αñ╛ αñ╕αÑïαñíαñ╡αñúαÑç.";
          activity = langIsEng ? "Sample paper practice" : "αñ¿αñ«αÑüαñ¿αñ╛ αñ¬αÑìαñ░αñ╢αÑìαñ¿αñ¬αññαÑìαñ░αñ┐αñòαñ╛ αñ╕αÑïαñíαñ╡αñ┐αñúαÑç.";
        } else {
          topic = langIsEng ? "Annual Exam Revision" : "αñ╡αñ╛αñ░αÑìαñ╖αñ┐αñò αñ¬αñ░αÑÇαñòαÑìαñ╖αñ╛ αñëαñ£αñ│αñúαÑÇ";
          objectives = langIsEng ? "Final evaluation and grade compilation" : "αñ╡αñ╛αñ░αÑìαñ╖αñ┐αñò αñ«αÑéαñ▓αÑìαñ»αñ«αñ╛αñ¬αñ¿ αñ╡ αñùαÑüαñúαñªαñ╛αñ¿.";
          activity = langIsEng ? "Final written exam" : "αñàαñéαññαñ┐αñ« αñ¬αñ░αÑÇαñòαÑìαñ╖αñ╛ αñ╡ αñùαÑüαñúαñ¿αÑïαñéαñªαñúαÑÇ.";
        }
      } else if (subject.includes("English") || subject.includes("αñçαñéαñùαÑìαñ░αñ£αÑÇ")) {
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
          topic = "Revision ΓÇô All chapters";
          objectives = "Review vocabulary, grammar, and reading skills.";
          activity = "Fun interactive spelling bee.";
        } else {
          topic = "Annual Exam & Final Evaluation";
          objectives = "Evaluating reading, writing, and speaking skills.";
          activity = "Final written and oral assessment.";
        }
      } else {
        if (monthNameEn === "June") {
          topic = `${subject} ΓÇô αñÿαñƒαñò αÑº: αñ¬αñ╛αñ»αñ╛αñ¡αÑéαññ αñôαñ│αñû`;
          objectives = "αñ╡αñ┐αñ╖αñ»αñ╛αñÜαÑìαñ»αñ╛ αñ¬αñ╛αñ»αñ╛αñ¡αÑéαññ αñ╕αñéαñòαñ▓αÑìαñ¬αñ¿αñ╛αñéαñÜαÑÇ αñôαñ│αñû.";
          activity = "αñÜαñ░αÑìαñÜαñ╛ αñ╡ αñ¬αÑìαñ░αñ╢αÑìαñ¿αÑïαññαÑìαññαñ░αÑç.";
        } else if (monthNameEn === "July") {
          topic = `${subject} ΓÇô αñÿαñƒαñò αÑ¿`;
          objectives = "αñ╡αñ┐αñ╖αñ»αñ╛αñÜαÑìαñ»αñ╛ αñªαÑüαñ╕αñ▒αÑìαñ»αñ╛ αñÿαñƒαñòαñ╛αñÜαÑç αñàαñºαÑìαñ»αñ»αñ¿.";
          activity = "αñùαñƒ αñÜαñ░αÑìαñÜαñ╛ αñ╡ αñ¿αÑïαñƒαÑìαñ╕.";
        } else if (monthNameEn === "August") {
          topic = `${subject} ΓÇô αñÿαñƒαñò αÑ⌐`;
          objectives = "αñÿαñƒαñò αÑ⌐ αñÜαÑìαñ»αñ╛ αñ╕αñéαñòαñ▓αÑìαñ¬αñ¿αñ╛ αñ╕αñ«αñ£αñúαÑç.";
          activity = "αñ¬αÑìαñ░αñ╛αññαÑìαñ»αñòαÑìαñ╖αñ┐αñò αñ╡ αñòαÑâαññαÑÇ αñëαñ¬αñòαÑìαñ░αñ«.";
        } else if (monthNameEn === "September") {
          topic = `${subject} ΓÇô αñÿαñƒαñò αÑ¬`;
          objectives = "αñÿαñƒαñò αÑ¬ αñÜαÑç αñ╕αñûαÑïαñ▓ αñàαñºαÑìαñ»αñ»αñ¿.";
          activity = "αñùαÑâαñ╣αñ¬αñ╛αñá αñ╡ αñ╕αñ░αñ╛αñ╡.";
        } else if (monthNameEn === "October") {
          topic = `${subject} ΓÇô αñ¬αÑìαñ░αñÑαñ« αñ╕αññαÑìαñ░ αñ¬αñ░αÑÇαñòαÑìαñ╖αñ╛`;
          objectives = "αñ╕αññαÑìαñ░ αÑº αñÜαÑç αñ«αÑéαñ▓αÑìαñ»αñ«αñ╛αñ¬αñ¿.";
          activity = "αñ╕αñ░αñ╛αñ╡ αñ¬αÑìαñ░αñ╢αÑìαñ¿αñ¬αññαÑìαñ░αñ┐αñòαñ╛.";
        } else if (monthNameEn === "November") {
          topic = `${subject} ΓÇô αñÿαñƒαñò αÑ½`;
          objectives = "αñÿαñƒαñò αÑ½ αñÜαÑìαñ»αñ╛ αñ╕αñéαñòαñ▓αÑìαñ¬αñ¿αñ╛ αñ╕αñ«αñ£αñúαÑç.";
          activity = "αñÜαñ┐αññαÑìαñ░, αñåαñòαÑâαññαÑìαñ»αñ╛ αñ╡ αñ¿αÑïαñƒαÑìαñ╕ αññαñ»αñ╛αñ░ αñòαñ░αñúαÑç.";
        } else if (monthNameEn === "December") {
          topic = `${subject} ΓÇô αñÿαñƒαñò αÑ¼`;
          objectives = "αñÿαñƒαñò αÑ¼ αñÜαÑç αñàαñºαÑìαñ»αñ»αñ¿.";
          activity = "αñùαñƒ αñòαÑâαññαÑÇ αñ╡ αñ╕αñ╛αñªαñ░αÑÇαñòαñ░αñú.";
        } else if (monthNameEn === "January") {
          topic = `${subject} ΓÇô αñÿαñƒαñò αÑ¡`;
          objectives = "αñÿαñƒαñò αÑ¡ ΓÇô αñ╕αñûαÑïαñ▓ αñàαñ¡αÑìαñ»αñ╛αñ╕.";
          activity = "αñ¬αÑìαñ░αñòαñ▓αÑìαñ¬ αñ╡ αñ▓αÑçαñûαñ¿.";
        } else if (monthNameEn === "February") {
          topic = `${subject} ΓÇô αñÿαñƒαñò αÑ«`;
          objectives = "αñÿαñƒαñò αÑ« αñÜαÑç αñàαñºαÑìαñ»αñ»αñ¿ αñ╡ αñëαñ£αñ│αñúαÑÇ.";
          activity = "αñÜαñ░αÑìαñÜαñ╛ αñ╡ αñ╕αñ░αñ╛αñ╡ αñ¬αÑìαñ░αñ╢αÑìαñ¿.";
        } else if (monthNameEn === "March") {
          topic = `${subject} ΓÇô αñëαñ£αñ│αñúαÑÇ`;
          objectives = "αñ╕αñéαñ¬αÑéαñ░αÑìαñú αñ╡αñ░αÑìαñ╖αñ╛αñÜαñ╛ αñàαñ¡αÑìαñ»αñ╛αñ╕αñòαÑìαñ░αñ« αñëαñ£αñ│αñúαÑÇ.";
          activity = "αñ╕αñ░αñ╛αñ╡ αñÜαñ╛αñÜαñúαÑìαñ»αñ╛.";
        } else {
          topic = `${subject} ΓÇô αñ╡αñ╛αñ░αÑìαñ╖αñ┐αñò αñ¬αñ░αÑÇαñòαÑìαñ╖αñ╛`;
          objectives = "αñàαñéαññαñ┐αñ« αñ«αÑéαñ▓αÑìαñ»αñ«αñ╛αñ¬αñ¿.";
          activity = "αñ╡αñ╛αñ░αÑìαñ╖αñ┐αñò αñ¬αñ░αÑÇαñòαÑìαñ╖αñ╛.";
        }
      }

      syllabusBySubject[subject][monthNameEn] = { topic, objectives, activity };
    });
  });

  return { subjects, months, syllabusBySubject };
};

const CLASS4_JUNE_PLAN: Record<string, Record<number, { topic: string; experience: string; tools: string; materials: string; outcome: string; isHolidayText?: string }>> = {
  "αñ«αñ░αñ╛αñáαÑÇ": {
    15: { topic: "αñÜαñ┐αññαÑìαñ░ αñ╡αñ╛αñÜαñ¿", experience: "αñÜαñ┐αññαÑìαñ░ αñ¬αñ╛αñ╣αÑéαñ¿ αñÜαñ┐αññαÑìαñ░αñ╛αññ αñòαñ╛αñ» αñªαñ┐αñ╕αññαÑç αññαÑç αñ╕αñ╛αñéαñùαñ╛.", tools: "αññαÑïαñéαñíαÑÇαñòαñ╛αñ«", materials: "αñÜαñ┐αññαÑìαñ░", outcome: "αÑº.αÑ⌐.αÑº αñ╕αñ╛αñéαñùαñ┐αññαñ▓αÑçαñ▓αÑìαñ»αñ╛/αñ╡αñ┐αñÜαñ╛αñ░αñ▓αÑçαñ▓αÑìαñ»αñ╛ αñ╡αñ╕αÑìαññαÑéαñéαñ╡αñ┐αñ╖αñ»αÑÇ, αñÿαñƒαñòαñ╛αñ╡αñ┐αñ╖αñ»αÑÇ αñ¬αñ╛αñÜ αññαÑç αñ╕αñ╣αñ╛ αñôαñ│αÑÇαñéαññ αñ«αñ╛αñ╣αñ┐αññαÑÇ αñ╕αñ╛αñéαñùαññαÑï." },
    16: { topic: "αñàαñ¡αñ┐αñ╡αÑìαñ»αñòαÑìαññαÑÇ", experience: "αñªαñ┐αñ▓αÑçαñ▓αÑìαñ»αñ╛ αñ╡αñ┐αñ╖αñ»αñ╛αñ╡αñ░ αñåαñ¬αñ▓αÑç αñ«αññ αñ«αñ╛αñéαñíαññαñ╛αññ.", tools: "αññαÑïαñéαñíαÑÇαñòαñ╛αñ«", materials: "αñÜαñ┐αññαÑìαñ░", outcome: "αÑº.αÑ⌐.αÑº αñ╕αñ╛αñéαñùαñ┐αññαñ▓αÑçαñ▓αÑìαñ»αñ╛/αñ╡αñ┐αñÜαñ╛αñ░αñ▓αÑçαñ▓αÑìαñ»αñ╛ αñ╡αñ╕αÑìαññαÑéαñéαñ╡αñ┐αñ╖αñ»αÑÇ, αñÿαñƒαñòαñ╛αñ╡αñ┐αñ╖αñ»αÑÇ αñ¬αñ╛αñÜ αññαÑç αñ╕αñ╣αñ╛ αñôαñ│αÑÇαñéαññ αñ«αñ╛αñ╣αñ┐αññαÑÇ αñ╕αñ╛αñéαñùαññαÑï." },
    17: { topic: "αñòαñÑαñ╛ αñ╕αñ╛αñéαñùαñúαÑç", experience: "αñòαñÑαñ╛ αñ▓αñòαÑìαñ╖αñ¬αÑéαñ░αÑìαñ╡αñò αñÉαñòαññαñ╛αññ αñ╡ αñÜαñ░αÑìαñÜαñ╛ αñòαñ░αññαñ╛αññ", tools: "αññαÑïαñéαñíαÑÇαñòαñ╛αñ«", materials: "αñÜαñ┐αññαÑìαñ░", outcome: "αÑº.αÑº.αÑ¿ αñòαñÑαñ╛, αñëαññαñ╛αñ░αñ╛, αñ¬αñ░αñ┐αñÜαÑìαñ¢αÑçαñª, αñ¼αñ╛αññαñ«αÑÇ αñÉαñòαÑéαñ¿ αññαÑìαñ»αñ╛αñéαñÜαÑìαñ»αñ╛αñ╡αñ░ αñùαñƒαñÜαñ░αÑìαñÜαñ╛ αñòαñ░αññαÑÇ." },
    18: { topic: "αñ¼αñ╛αññαñ«αÑÇ αñ╡αñ╛αñÜαñ¿", experience: "αñ¼αñ╛αññαñ«αÑÇ αñ╡αñ╛αñÜαñ¿ αñòαñ░αÑéαñ¿ αñÜαñ░αÑìαñÜαñ╛ αñòαñ░αññαñ╛αññ.", tools: "αññαÑïαñéαñíαÑÇαñòαñ╛αñ«", materials: "αñÜαñ┐αññαÑìαñ░", outcome: "αÑº.αÑº.αÑ¿ αñòαñÑαñ╛, αñëαññαñ╛αñ░αñ╛, αñ¬αñ░αñ┐αñÜαÑìαñ¢αÑçαñª, αñ¼αñ╛αññαñ«αÑÇ αñÉαñòαÑéαñ¿ αññαÑìαñ»αñ╛αñéαñÜαÑìαñ»αñ╛αñ╡αñ░ αñùαñƒαñÜαñ░αÑìαñÜαñ╛ αñòαñ░αññαÑÇ." },
    19: { topic: "αñ╢αñ¼αÑìαñªαñ╕αñ«αÑéαñ╣", experience: "αñ╢αñ¼αÑìαñªαñ╕αñ«αÑéαñ╣αñ╛αñÜαñ╛ αñàαñ░αÑìαñÑ αñ╕αñ╛αñéαñùαññαñ╛αññ.", tools: "αññαÑïαñéαñíαÑÇαñòαñ╛αñ«", materials: "αññαñòαÑìαññαñ╛", outcome: "αÑ⌐.αÑº.αÑº αñªαñ┐αñ▓αÑçαñ▓αÑìαñ»αñ╛ αñ╢αñ¼αÑìαñªαñ╕αñ«αÑéαñ╣αñ╛αñ¬αñ╛αñ╕αÑéαñ¿ αñ╕αÑüαñ╕αñéαñùαññ αñ╡αñ╛αñòαÑìαñ» αññαñ»αñ╛αñ░ αñòαñ░αÑéαñ¿ αñ▓αñ┐αñ╣αñ┐αññαÑï." },
    20: { topic: "αñ╢αñ¼αÑìαñªαñ╕αñ«αÑéαñ╣", experience: "αñ╢αñ¼αÑìαñªαñ╕αñ«αÑéαñ╣αñ╛αñÜαñ╛ αñ╡αñ╛αñòαÑìαñ»αñ╛αññ αñëαñ¬αñ»αÑïαñù αñòαñ░αÑéαñ¿ αñ╕αñ╛αñéαñùαññαñ╛αññ.", tools: "αññαÑïαñéαñíαÑÇαñòαñ╛αñ«", materials: "αññαñòαÑìαññαñ╛", outcome: "αÑ⌐.αÑº.αÑº αñªαñ┐αñ▓αÑçαñ▓αÑìαñ»αñ╛ αñ╢αñ¼αÑìαñªαñ╕αñ«αÑéαñ╣αñ╛αñ¬αñ╛αñ╕αÑéαñ¿ αñ╕αÑüαñ╕αñéαñùαññ αñ╡αñ╛αñòαÑìαñ» αññαñ»αñ╛αñ░ αñòαñ░αÑéαñ¿ αñ▓αñ┐αñ╣αñ┐αññαÑï." },
    22: { topic: "αñ╣αÑÇαñÜ αñàαñ«αÑüαñÜαÑÇ αñ¬αÑìαñ░αñ╛αñ░αÑìαñÑαñ¿αñ╛", experience: "αñ¬αÑìαñ░αñ╛αñ░αÑìαñÑαñ¿αñ╛ αñ╕αñ╛αñ«αÑéαñ╣αñ┐αñò αñ¬αñ╛αñáαÑÇαñ«αñ╛αñùαÑç αñ«αÑìαñ╣αñúαññαñ╛αññ.", tools: "αññαÑïαñéαñíαÑÇαñòαñ╛αñ«", materials: "αñºαÑìαñ╡αñ¿αÑÇαñ½αÑÇαññ", outcome: "αÑ¿.αÑ¿.αÑ⌐ αñ╡αñ╛αñÜαñ▓αÑçαñ▓αÑìαñ»αñ╛ αñ╕αñ╛αñ╣αñ┐αññαÑìαñ»αñ╛αññαÑÇαñ▓ (αñùαñªαÑìαñ»/αñ¬αñªαÑìαñ») αñåαñ╢αñ», αñ¿αñ┐αñ╖αÑìαñòαñ░αÑìαñ╖ αñ╕αñ╛αñéαñùαññαÑï." },
    23: { topic: "αñ╣αÑÇαñÜ αñàαñ«αÑüαñÜαÑÇ αñ¬αÑìαñ░αñ╛αñ░αÑìαñÑαñ¿αñ╛", experience: "αñ¬αÑìαñ░αñ╛αñ░αÑìαñÑαñ¿αñ╛ αñ╕αñ╛αñ«αÑéαñ╣αñ┐αñò αññαñ╛αñ▓αñ╛αñ╕αÑüαñ░αñ╛αññ αñ«αÑìαñ╣αñúαññαñ╛αññ.", tools: "αññαÑïαñéαñíαÑÇαñòαñ╛αñ«", materials: "αñºαÑìαñ╡αñ¿αÑÇαñ½αÑÇαññ", outcome: "αÑ¿.αÑ¿.αÑ⌐ αñ╡αñ╛αñÜαñ▓αÑçαñ▓αÑìαñ»αñ╛ αñ╕αñ╛αñ╣αñ┐αññαÑìαñ»αñ╛αññαÑÇαñ▓ (αñùαñªαÑìαñ»/αñ¬αñªαÑìαñ») αñåαñ╢αñ», αñ¿αñ┐αñ╖αÑìαñòαñ░αÑìαñ╖ αñ╕αñ╛αñéαñùαññαÑï." },
    24: { topic: "αñ╣αÑÇαñÜ αñàαñ«αÑüαñÜαÑÇ αñ¬αÑìαñ░αñ╛αñ░αÑìαñÑαñ¿αñ╛", experience: "αñ╡αñ┐αñÜαñ╛αñ░αñ▓αÑçαñ▓αÑìαñ»αñ╛ αñ¬αÑìαñ░αñ╢αÑìαñ¿αñ╛αñéαñÜαÑÇ αñëαññαÑìαññαñ░αÑç αñªαÑçαññαñ╛αññ.", tools: "αññαÑïαñéαñíαÑÇαñòαñ╛αñ«", materials: "αñºαÑìαñ╡αñ¿αÑÇαñ½αÑÇαññ", outcome: "αÑ¿.αÑ¿.αÑ⌐ αñ╡αñ╛αñÜαñ▓αÑçαñ▓αÑìαñ»αñ╛ αñ╕αñ╛αñ╣αñ┐αññαÑìαñ»αñ╛αññαÑÇαñ▓ (αñùαñªαÑìαñ»/αñ¬αñªαÑìαñ») αñåαñ╢αñ», αñ¿αñ┐αñ╖αÑìαñòαñ░αÑìαñ╖ αñ╕αñ╛αñéαñùαññαÑï." },
    25: { topic: "αñ╣αÑÇαñÜ αñàαñ«αÑüαñÜαÑÇ αñ¬αÑìαñ░αñ╛αñ░αÑìαñÑαñ¿αñ╛", experience: "αñåαñ¬αñ▓αÑç αñàαñ¿αÑüαñ¡αñ╡ αñ╕αñ╛αñéαñùαññαñ╛αññ.", tools: "αñëαñ¬αñòαÑìαñ░αñ«", materials: "αñ¬αÑçαñ¬αñ░", outcome: "αÑº.αÑº.αÑ⌐ αñÿαñíαñ▓αÑçαñ▓αÑìαñ»αñ╛ αñÿαñƒαñ¿αñ╛, αñ¬αÑìαñ░αñ╕αñéαñù αñ╡ αñªαÑêαñ¿αñéαñªαñ┐αñ¿ αñàαñ¿αÑüαñ¡αñ╡ αñ»αñ╛αñéαñ¼αñ╛αñ¼αññ αñ╕αÑüαñ╕αñéαñùαññαñ¬αñúαÑç αñ«αññ αñ╡αÑìαñ»αñòαÑìαññ αñòαñ░αññαÑï." },
    26: { topic: "", experience: "", tools: "", materials: "", outcome: "", isHolidayText: "αñ░αñ╛αñ£αñ░αÑìαñ╖αÑÇ αñ╢αñ╛αñ╣αÑé αñ«αñ╣αñ╛αñ░αñ╛αñ£ αñ£αñ»αñéαññαÑÇ αñ╡ αñ«αÑïαñ╣αñ░αñ«" },
    27: { topic: "αñ«αñ╛αñ¥αñ╛ αñ¬αññαñéαñù", experience: "αñÜαñ┐αññαÑìαñ░ αñ¬αñ╣αñ╛, αñ╡αñ╛αñÜαñ╛ αñ╡ αñ╕αñ╛αñéαñùαñ╛.", tools: "αññαÑïαñéαñíαÑÇαñòαñ╛αñ«", materials: "αñÜαñ┐αññαÑìαñ░", outcome: "αÑ¿.αÑº.αÑ¿ αñ«αñ£αñòαÑüαñ░αñ╛αññαÑÇαñ▓ αñ«αÑüαñûαÑìαñ» αñÿαñƒαñ¿αñ╛ αñ╡ αñ¬αñ╛αññαÑìαñ░αÑç αñ»αñ╛αñéαñ╡αñ┐αñ╖αñ»αÑÇ αñ¼αÑïαñ▓αññαÑï." },
    29: { topic: "αñ«αñ╛αñ¥αñ╛ αñ¬αññαñéαñù", experience: "αñÜαñ┐αññαÑìαñ░ αñòαñÑαÑçαñÜαÑìαñ»αñ╛ αñåαñºαñ╛αñ░αÑç αñ╕αñéαñ╡αñ╛αñª αñ▓αñ┐αñ╣αñ┐αññαñ╛αññ.", tools: "αññαÑïαñéαñíαÑÇαñòαñ╛αñ«", materials: "αñÜαñ┐αññαÑìαñ░", outcome: "αÑ⌐.αÑº.αÑ¿ αñ¬αñ░αñ┐αñ╕αñ░αñ╛αññ αñÿαñíαñ▓αÑçαñ▓αÑìαñ»αñ╛ αñÿαñƒαñ¿αñ╛αñéαñÜαñ╛ αñòαÑìαñ░αñ« αñ▓αñ╛αñ╡αÑéαñ¿ αñ╕αÑìαñ╡αñ╛αñ¿αÑüαñ¡αñ╡αñ╛αñ╡αñ░ αñåαñºαñ╛αñ░αñ┐αññ αñ¬αñ░αñ┐αñÜαÑìαñ¢αÑçαñª αññαñ»αñ╛αñ░ αñòαñ░αññαÑï, αñ╕αÑìαñ╡-αñ«αññαñ╛αñ╕αñ╣ αñ╕αñ«αñ╛αñ░αÑïαñ¬ αñòαñ░αññαÑï." },
    30: { topic: "αñ«αñ╛αñ¥αñ╛ αñ¬αññαñéαñù", experience: "αñûαÑçαñ│αññαñ╛αñ¿αñ╛ αñÿαñíαñ▓αÑçαñ▓αÑìαñ»αñ╛ αñ¬αÑìαñ░αñ╕αñéαñùαñ╛αñÜαÑç αñ╡αñ░αÑìαñúαñ¿ αñòαñ░αññαñ╛αññ.", tools: "αññαÑïαñéαñíαÑÇαñòαñ╛αñ«", materials: "αñÜαñ┐αññαÑìαñ░", outcome: "αÑ⌐.αÑ⌐.αÑ¬ αñ╕αÑìαñ╡αññαñâαñÜαÑìαñ»αñ╛ αñàαñ¿αÑüαñ¡αñ╡αñ╛αñÜαÑç αñ╕αñéαñ╡αñ╛αñª αñ░αÑéαñ¬αñ╛αññ αñ▓αÑçαñûαñ¿ αñòαñ░αññαÑï." }
  },
  "αñùαñúαñ┐αññ": {
    15: { topic: "αñ╕αñéαñûαÑìαñ»αñ╛αñ£αÑìαñ₧αñ╛αñ¿", experience: "αÑºαÑªαÑª αññαÑç αÑ»αÑ»αÑ» αñàαñéαñòαñ╛αñÜαÑç αñ╡αñ╛αñÜαñ¿ αñòαñ░αññαñ╛αññ.", tools: "αñ¬αÑìαñ░αñ╛αññαÑìαñ»αñòαÑìαñ╖αñ┐αñò", materials: "αññαñòαÑìαññαñ╛", outcome: "C-1.1 αÑ»αÑ»αÑ»αÑ» αñ¬αñ░αÑìαñ»αñéαññαñÜαÑìαñ»αñ╛ αñ╕αñéαñûαÑìαñ»αñ╛ αñôαñ│αñûαññαÑï. αñ╕αñéαñûαÑìαñ»αñ╛ αñàαñòαÑìαñ╖αñ░αñ╛αñéαññ αñ▓αñ┐αñ╣αñ┐αññαÑï." },
    16: { topic: "αñ╕αñéαñûαÑìαñ»αñ╛αñ£αÑìαñ₧αñ╛αñ¿", experience: "αÑºαÑªαÑª αññαÑç αÑ»αÑ»αÑ» αñàαñéαñòαñ╛αñÜαÑç αñàαñòαÑìαñ╖αñ░αñ╛αññ αñ▓αÑçαñûαñ¿ αñòαñ░αñ╛.", tools: "αñ¬αÑìαñ░αñ╛αññαÑìαñ»αñòαÑìαñ╖αñ┐αñò", materials: "αññαñòαÑìαññαñ╛", outcome: "C-1.1 αÑ»αÑ»αÑ»αÑ» αñ¬αñ░αÑìαñ»αñéαññαñÜαÑìαñ»αñ╛ αñ╕αñéαñûαÑìαñ»αñ╛ αñôαñ│αñûαññαÑï. αñ╕αñéαñûαÑìαñ»αñ╛ αñàαñòαÑìαñ╖αñ░αñ╛αñéαññ αñ▓αñ┐αñ╣αñ┐αññαÑï." },
    17: { topic: "αñ¼αÑçαñ░αÑÇαñ£", experience: "αññαÑÇαñ¿ αñàαñéαñòαÑÇ αñ╕αñéαñûαÑìαñ»αñ╛αñéαñÜαÑÇ αñ¼αÑçαñ░αÑÇαñ£ αñòαñ░αññαñ╛αññ.", tools: "αñ¬αÑìαñ░αñ╛αññαÑìαñ»αñòαÑìαñ╖αñ┐αñò", materials: "αññαñòαÑìαññαñ╛", outcome: "C-1.3 αñ¼αÑçαñ░αÑÇαñ£ αñåαñúαñ┐ αñ╡αñ£αñ╛αñ¼αñ╛αñòαÑÇαñÜαÑÇ αñëαñªαñ╛αñ╣αñ░αñúαÑç αññαñ»αñ╛αñ░ αñòαñ░αññαÑï; αññαÑÇ αñ«αñ╛αñéαñíαññαÑï αñåαñúαñ┐ αñ╕αÑïαñíαñ╡αññαÑï." },
    18: { topic: "αñ╡αñ£αñ╛αñ¼αñ╛αñòαÑÇ", experience: "αññαÑÇαñ¿ αñàαñéαñòαÑÇ αñ╕αñéαñûαÑìαñ»αñ╛αñéαñÜαÑÇ αñ╡αñ£αñ╛αñ¼αñ╛αñòαÑÇ αñòαñ░αññαñ╛αññ.", tools: "αñ¬αÑìαñ░αñ╛αññαÑìαñ»αñòαÑìαñ╖αñ┐αñò", materials: "αññαñòαÑìαññαñ╛", outcome: "C-1.3 αñ¼αÑçαñ░αÑÇαñ£ αñåαñúαñ┐ αñ╡αñ£αñ╛αñ¼αñ╛αñòαÑÇαñÜαÑÇ αñëαñªαñ╛αñ╣αñ░αñúαÑç αññαñ»αñ╛αñ░ αñòαñ░αññαÑï; αññαÑÇ αñ«αñ╛αñéαñíαññαÑï αñåαñúαñ┐ αñ╕αÑïαñíαñ╡αññαÑï." },
    19: { topic: "αñ¡αÑîαñ«αñ┐αññαñ┐αñò αñåαñòαÑâαññαÑìαñ»αñ╛", experience: "αññαÑìαñ░αñ┐αñòαÑïαñú, αñÜαÑîαñòαÑïαñ¿, αñåαñ»αññ, αñ╡αñ░αÑìαññαÑüαñ│ αñ╕αñéαñ¬αÑéαñ░αÑìαñú αñëαñ£αñ│αñúαÑÇ αñòαñ░αññαñ╛αññ.", tools: "αñ¬αÑìαñ░αñ╛αññαÑìαñ»αñòαÑìαñ╖αñ┐αñò", materials: "αñ╕αñ╛αñ░αñúαÑÇ", outcome: "C-2.1 αñ╡αñ┐αñ╡αñ┐αñº αñåαñòαñ╛αñ░ αñôαñ│αñûαññαÑï αñåαñúαñ┐ αññαÑìαñ»αñ╛αñéαñÜαÑÇ αñ»αñ╛αñªαÑÇ αñòαñ░αññαÑï. αñòαñíαñ╛, αñòαÑïαñ¬αñ░αÑç αñåαñúαñ┐ αñ¬αÑâαñ╖αÑìαñáαñ¡αñ╛αñù αñ«αÑïαñ£αññαÑï." },
    20: { topic: "αñ¡αÑîαñ«αñ┐αññαñ┐αñò αñåαñòαÑâαññαÑìαñ»αñ╛", experience: "αñ¡αÑîαñ«αñ┐αññαñ┐αñò αñåαñòαÑâαññαÑìαñ»αñ╛αñéαñÜαÑÇ αñëαñ£αñ│αñúαÑÇ αñòαñ░αññαñ╛αññ.", tools: "αñ¬αÑìαñ░αñ╛αññαÑìαñ»αñòαÑìαñ╖αñ┐αñò", materials: "αñ╕αñ╛αñ░αñúαÑÇ", outcome: "C-2.1 αñ╡αñ┐αñ╡αñ┐αñº αñåαñòαñ╛αñ░ αñôαñ│αñûαññαÑï αñåαñúαñ┐ αññαÑìαñ»αñ╛αñéαñÜαÑÇ αñ»αñ╛αñªαÑÇ αñòαñ░αññαÑï. αñòαñíαñ╛, αñòαÑïαñ¬αñ░αÑç αñåαñúαñ┐ αñ¬αÑâαñ╖αÑìαñáαñ¡αñ╛αñù αñ«αÑïαñ£αññαÑï." },
    22: { topic: "αñûαÑçαñ│αÑéαñ»αñ╛ αñ╕αñéαñûαÑìαñ»αñ╛αñéαñ╢αÑÇ", experience: "αñ╣αñ£αñ╛αñ░αñ╛αñÜαÑÇ αñôαñ│αñû αñòαñ░αÑéαñ¿ αñÿαÑçαññαñ╛αññ.", tools: "αñ¬αÑìαñ░αñ╛αññαÑìαñ»αñòαÑìαñ╖αñ┐αñò", materials: "αññαñòαÑìαññαñ╛", outcome: "C-1.1 'αñ╣αñ£αñ╛αñ░' αñ╣αÑÇ αñ╕αñéαñòαñ▓αÑìαñ¬αñ¿αñ╛ αñ╕αñ«αñ£αÑéαñ¿ αñÿαÑçαññαÑï αñåαñúαñ┐ 'αñ╣αñ£αñ╛αñ░' αñ╣αÑÇ αñ╕αñéαñûαÑìαñ»αñ╛ αñ╡αñ┐αñ╡αñ┐αñº αñ¬αÑìαñ░αñòαñ╛αñ░αÑç αñªαñ░αÑìαñ╢αñ╡αñ┐αññαÑï." },
    23: { topic: "αñûαÑçαñ│αÑéαñ»αñ╛ αñ╕αñéαñûαÑìαñ»αñ╛αñéαñ╢αÑÇ", experience: "αñ╡αÑçαñùαñ╡αÑçαñùαñ│αÑìαñ»αñ╛ αñëαñªαñ╛αñ╣αñ░αñúαñ╛αñªαÑìαñ╡αñ╛αñ░αÑç αñ╣αñ£αñ╛αñ░αñ╛αñÜαÑÇ αñôαñ│αñû", tools: "αñ¬αÑìαñ░αñ╛αññαÑìαñ»αñòαÑìαñ╖αñ┐αñò", materials: "αññαñòαÑìαññαñ╛", outcome: "C-1.1 'αñ╣αñ£αñ╛αñ░' αñ╣αÑÇ αñ╕αñéαñòαñ▓αÑìαñ¬αñ¿αñ╛ αñ╕αñ«αñ£αÑéαñ¿ αñÿαÑçαññαÑï αñåαñúαñ┐ 'αñ╣αñ£αñ╛αñ░' αñ╣αÑÇ αñ╕αñéαñûαÑìαñ»αñ╛ αñ╡αñ┐αñ╡αñ┐αñº αñ¬αÑìαñ░αñòαñ╛αñ░αÑç αñªαñ░αÑìαñ╢αñ╡αñ┐αññαÑï." },
    24: { topic: "αñûαÑçαñ│αÑéαñ»αñ╛ αñ╕αñéαñûαÑìαñ»αñ╛αñéαñ╢αÑÇ", experience: "αñ╣αñ£αñ╛αñ░ αñ╣αÑÇ αñ╕αñéαñûαÑìαñ»αñ╛ αñòαñ╢αÑÇ αñ¼αñ¿αññαÑç αñ╕αñ«αñ£αÑéαñ¿ αñÿαÑçαññαñ╛αññ.", tools: "αñ¬αÑìαñ░αñ╛αññαÑìαñ»αñòαÑìαñ╖αñ┐αñò", materials: "αññαñòαÑìαññαñ╛", outcome: "C-1.1 'αñ╣αñ£αñ╛αñ░' αñ╣αÑÇ αñ╕αñéαñòαñ▓αÑìαñ¬αñ¿αñ╛ αñ╕αñ«αñ£αÑéαñ¿ αñÿαÑçαññαÑï αñåαñúαñ┐ 'αñ╣αñ£αñ╛αñ░' αñ╣αÑÇ αñ╕αñéαñûαÑìαñ»αñ╛ αñ╡αñ┐αñ╡αñ┐αñº αñ¬αÑìαñ░αñòαñ╛αñ░αÑç αñªαñ░αÑìαñ╢αñ╡αñ┐αññαÑï." },
    25: { topic: "αñûαÑçαñ│αÑéαñ»αñ╛ αñ╕αñéαñûαÑìαñ»αñ╛αñéαñ╢αÑÇ", experience: "αñ╡αÑçαñùαñ╡αÑçαñùαñ│αÑìαñ»αñ╛ αñ¬αñªαÑìαñºαññαÑÇαñ¿αÑç αñ╣αñ£αñ╛αñ░ αñ╣αÑÇ αñ╕αñéαñûαÑìαñ»αñ╛ αñòαñ╢αÑÇ αñ¼αñ¿αññαÑç αññαÑç αñ╕αñ«αñ£αÑéαñ¿ αñÿαÑçαññαñ╛αññ.", tools: "αñ¬αÑìαñ░αñ╛αññαÑìαñ»αñòαÑìαñ╖αñ┐αñò", materials: "αññαñòαÑìαññαñ╛", outcome: "C-1.1 'αñ╣αñ£αñ╛αñ░' αñ╣αÑÇ αñ╕αñéαñòαñ▓αÑìαñ¬αñ¿αñ╛ αñ╕αñ«αñ£αÑéαñ¿ αñÿαÑçαññαÑï αñåαñúαñ┐ 'αñ╣αñ£αñ╛αñ░' αñ╣αÑÇ αñ╕αñéαñûαÑìαñ»αñ╛ αñ╡αñ┐αñ╡αñ┐αñº αñ¬αÑìαñ░αñòαñ╛αñ░αÑç αñªαñ░αÑìαñ╢αñ╡αñ┐αññαÑï." },
    26: { topic: "", experience: "", tools: "", materials: "", outcome: "", isHolidayText: "αñ░αñ╛αñ£αñ░αÑìαñ╖αÑÇ αñ╢αñ╛αñ╣αÑé αñ«αñ╣αñ╛αñ░αñ╛αñ£ αñ£αñ»αñéαññαÑÇ αñ╡ αñ«αÑïαñ╣αñ░αñ«" },
    27: { topic: "αñûαÑçαñ│αÑéαñ»αñ╛ αñ╕αñéαñûαÑìαñ»αñ╛αñéαñ╢αÑÇ", experience: "αñ╡αÑçαñùαñ╡αÑçαñùαñ│αÑìαñ»αñ╛ αñ¬αñªαÑìαñºαññαÑÇαñ¿αÑç αñ╣αñ£αñ╛αñ░ αñ╕αñéαñûαÑìαñ»αñ╛ αñ¼αñ¿αñ╡αñ┐αññαñ╛αññ.", tools: "αñ¬αÑìαñ░αñ╛αññαÑìαñ»αñòαÑìαñ╖αñ┐αñò", materials: "αññαñòαÑìαññαñ╛", outcome: "C-1.1 'αñ╣αñ£αñ╛αñ░' αñ╣αÑÇ αñ╕αñéαñòαñ▓αÑìαñ¬αñ¿αñ╛ αñ╕αñ«αñ£αÑéαñ¿ αñÿαÑçαññαÑï αñåαñúαñ┐ 'αñ╣αñ£αñ╛αñ░' αñ╣αÑÇ αñ╕αñéαñûαÑìαñ»αñ╛ αñ╡αñ┐αñ╡αñ┐αñº αñ¬αÑìαñ░αñòαñ╛αñ░αÑç αñªαñ░αÑìαñ╢αñ╡αñ┐αññαÑï." },
    29: { topic: "αñûαÑçαñ│αÑéαñ»αñ╛ αñ╕αñéαñûαÑìαñ»αñ╛αñéαñ╢αÑÇ", experience: "αñÜαñ╛αñ░ αñàαñéαñòαÑÇ αñ╕αñéαñûαÑìαñ»αÑçαñÜαÑÇ αñôαñ│αñû αñ╣αÑïαññαÑç.", tools: "αñ¬αÑìαñ░αñ╛αññαÑìαñ»αñòαÑìαñ╖αñ┐αñò", materials: "αññαñòαÑìαññαñ╛", outcome: "C-1.1 'αñ╣αñ£αñ╛αñ░' αñ╣αÑÇ αñ╕αñéαñòαñ▓αÑìαñ¬αñ¿αñ╛ αñ╕αñ«αñ£αÑéαñ¿ αñÿαÑçαññαÑï αñåαñúαñ┐ 'αñ╣αñ£αñ╛αñ░' αñ╣αÑÇ αñ╕αñéαñûαÑìαñ»αñ╛ αñ╡αñ┐αñ╡αñ┐αñº αñ¬αÑìαñ░αñòαñ╛αñ░αÑç αñªαñ░αÑìαñ╢αñ╡αñ┐αññαÑï." },
    30: { topic: "αñûαÑçαñ│αÑéαñ»αñ╛ αñ╕αñéαñûαÑìαñ»αñ╛αñéαñ╢αÑÇ", experience: "αñÜαñ╛αñ░ αñàαñéαñòαÑÇ αñ╕αñéαñûαÑìαñ»αÑçαñÜαÑç αñ╡αñ╛αñÜαñ¿ αñòαñ░αññαñ╛αññ.", tools: "αñ¬αÑìαñ░αñ╛αññαÑìαñ»αñòαÑìαñ╖αñ┐αñò", materials: "αññαñòαÑìαññαñ╛", outcome: "C-1.1 'αñ╣αñ£αñ╛αñ░' αñ╣αÑÇ αñ╕αñéαñòαñ▓αÑìαñ¬αñ¿αñ╛ αñ╕αñ«αñ£αÑéαñ¿ αñÿαÑçαññαÑï αñåαñúαñ┐ 'αñ╣αñ£αñ╛αñ░' αñ╣αÑÇ αñ╕αñéαñûαÑìαñ»αñ╛ αñ╡αñ┐αñ╡αñ┐αñº αñ¬αÑìαñ░αñòαñ╛αñ░αÑç αñªαñ░αÑìαñ╢αñ╡αñ┐αññαÑï." }
  },
  "αñçαñéαñùαÑìαñ░αñ£αÑÇ": {
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
    26: { topic: "", experience: "", tools: "", materials: "", outcome: "", isHolidayText: "αñ░αñ╛αñ£αñ░αÑìαñ╖αÑÇ αñ╢αñ╛αñ╣αÑé αñ«αñ╣αñ╛αñ░αñ╛αñ£ αñ£αñ»αñéαññαÑÇ αñ╡ αñ«αÑïαñ╣αñ░αñ«" },
    27: { topic: "Back to school", experience: "Look at the picture and find their names.", tools: "Oral", materials: "video", outcome: "04.11 Follows the proper manners of group discussion like attentive listening, active response, respects other's opinion, etc." },
    29: { topic: "Back to school", experience: "Look at the pictures and name the actions", tools: "Oral", materials: "video", outcome: "04.11 Follows the proper manners of group discussion like attentive listening, active response, respects other's opinion, etc." },
    30: { topic: "Back to school", experience: "Look at the pictures and find answers of riddles.", tools: "Oral", materials: "video", outcome: "04.10 Presents orally in the class on the given topics." }
  },
  "αñ¬αñ░αñ┐αñ╕αñ░ αñàαñ¡αÑìαñ»αñ╛αñ╕ αÑº": {
    15: { topic: "αñ╕αÑéαñ░αÑìαñ»αñ«αñ╛αñ▓αñ╛", experience: "αñ╕αÑéαñ░αÑìαñ»αñ«αñ╛αñ▓αÑçαññαÑÇαñ▓ αñùαÑìαñ░αñ╣αñ╛αñéαñÜαÑÇ αñ¿αñ╛αñ╡αÑç αñ╕αñ╛αñéαñùαñ╛.", tools: "αññαÑïαñéαñíαÑÇαñòαñ╛αñ«", materials: "αñÜαñ┐αññαÑìαñ░", outcome: "C-1.1 αñ╕αÑéαñ░αÑìαñ»αñ«αñ╛αñ▓αÑçαññαÑÇαñ▓ αñùαÑìαñ░αñ╣αñ╛αñéαñÜαñ╛ αñ»αÑïαñùαÑìαñ» αñòαÑìαñ░αñ« αñ╕αñ╛αñéαñùαññαÑÇ." },
    16: { topic: "αñ╕αÑéαñ░αÑìαñ»αñ«αñ╛αñ▓αñ╛", experience: "αñ╕αÑéαñ░αÑìαñ»αñ«αñ╛αñ▓αÑçαññαÑÇαñ▓ αñùαÑìαñ░αñ╣ αñ»αÑïαñùαÑìαñ» αñòαÑìαñ░αñ«αñ╛αñ¿αÑç αñ╕αñ╛αñéαñùαñ╛.", tools: "αññαÑïαñéαñíαÑÇαñòαñ╛αñ«", materials: "αñÜαñ┐αññαÑìαñ░", outcome: "C-1.1 αñ╕αÑéαñ░αÑìαñ»αñ«αñ╛αñ▓αÑçαññαÑÇαñ▓ αñùαÑìαñ░αñ╣αñ╛αñéαñÜαñ╛ αñ»αÑïαñùαÑìαñ» αñòαÑìαñ░αñ« αñ╕αñ╛αñéαñùαññαÑÇ." },
    17: { topic: "αñ╕αÑéαñ░αÑìαñ»αñ«αñ╛αñ▓αñ╛", experience: "αñ╕αÑéαñ░αÑìαñ»αñ«αñ╛αñ▓αÑçαññαÑÇαñ▓ αñùαÑìαñ░αñ╣αñ╛αñéαñÜαÑÇ αñ¿αñ╛αñ╡αÑç αñ▓αñ┐αñ╣αñ╛.", tools: "αññαÑïαñéαñíαÑÇαñòαñ╛αñ«", materials: "αñÜαñ┐αññαÑìαñ░", outcome: "C-1.1 αñ╕αÑéαñ░αÑìαñ»αñ«αñ╛αñ▓αÑçαññαÑÇαñ▓ αñùαÑìαñ░αñ╣αñ╛αñéαñÜαñ╛ αñ»αÑïαñùαÑìαñ» αñòαÑìαñ░αñ« αñ╕αñ╛αñéαñùαññαÑÇ." },
    18: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    19: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    20: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    22: { topic: "αñáαÑçαñ╡αñ╛ αñ¿αñ┐αñ╕αñ░αÑìαñùαñ╛αñÜαñ╛", experience: "αñåαñáαñ╡αñ╛ αñåαñúαñ┐ αñ╕αñ╛αñéαñùαñ╛.", tools: "αññαÑïαñéαñíαÑÇαñòαñ╛αñ«", materials: "αñÜαñ┐αññαÑìαñ░", outcome: "C ΓÇô 2.1 αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαÑç αñ╡αñ┐αñ╡αñ┐αñº αñ╕αÑìαñ░αÑïαññ αñ╕αñ╛αñéαñùαÑéαñ¿, αññαÑìαñ»αñ╛αñéαñÜαÑìαñ»αñ╛ αñ╕αÑìαñ╡αñÜαÑìαñ¢αññαÑçαñÜαÑç αñ«αñ╣αññαÑìαññαÑìαñ╡ αñ╕αñ╛αñéαñùαññαÑï." },
    23: { topic: "αñáαÑçαñ╡αñ╛ αñ¿αñ┐αñ╕αñ░αÑìαñùαñ╛αñÜαñ╛", experience: "αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαÑç αñ╕αÑìαñ░αÑïαññ αñ╕αñ╛αñéαñùαñ╛ αñ╡ αñ«αñ╛αñ╣αñ┐αññαÑÇ αñ╕αñ«αñ£αÑéαñ¿ αñÿαÑçαññαñ╛αññ.", tools: "αññαÑïαñéαñíαÑÇαñòαñ╛αñ«", materials: "αñÜαñ┐αññαÑìαñ░", outcome: "C ΓÇô 2.1 αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαÑç αñ╡αñ┐αñ╡αñ┐αñº αñ╕αÑìαñ░αÑïαññ αñ╕αñ╛αñéαñùαÑéαñ¿, αññαÑìαñ»αñ╛αñéαñÜαÑìαñ»αñ╛ αñ╕αÑìαñ╡αñÜαÑìαñ¢αññαÑçαñÜαÑç αñ«αñ╣αññαÑìαññαÑìαñ╡ αñ╕αñ╛αñéαñùαññαÑï." },
    24: { topic: "αñáαÑçαñ╡αñ╛ αñ¿αñ┐αñ╕αñ░αÑìαñùαñ╛αñÜαñ╛", experience: "αñ¬αñ╛αñúαÑÇ αñ╕αñ╛αñáαñ╡αñú αñ«αñ╛αñ╣αñ┐αññαÑÇ αñ╕αñ«αñ£αÑéαñ¿ αñÿαÑçαññαñ╛αññ..", tools: "αññαÑïαñéαñíαÑÇαñòαñ╛αñ«", materials: "αñÜαñ┐αññαÑìαñ░", outcome: "C ΓÇô 2.1 αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαÑç αñ╡αñ┐αñ╡αñ┐αñº αñ╕αÑìαñ░αÑïαññ αñ╕αñ╛αñéαñùαÑéαñ¿, αññαÑìαñ»αñ╛αñéαñÜαÑìαñ»αñ╛ αñ╕αÑìαñ╡αñÜαÑìαñ¢αññαÑçαñÜαÑç αñ«αñ╣αññαÑìαññαÑìαñ╡ αñ╕αñ╛αñéαñùαññαÑï." },
    25: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    26: { topic: "", experience: "", tools: "", materials: "", outcome: "", isHolidayText: "αñ░αñ╛αñ£αñ░αÑìαñ╖αÑÇ αñ╢αñ╛αñ╣αÑé αñ«αñ╣αñ╛αñ░αñ╛αñ£ αñ£αñ»αñéαññαÑÇ αñ╡ αñ«αÑïαñ╣αñ░αñ«" },
    27: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    29: { topic: "αñáαÑçαñ╡αñ╛ αñ¿αñ┐αñ╕αñ░αÑìαñùαñ╛αñÜαñ╛", experience: "αñ¿αñ┐αñ░αÑÇαñòαÑìαñ╖αñú αñòαñ░αñ╛ αñ╡ αñ╕αñ╛αñéαñùαññαñ╛αññ.", tools: "αññαÑïαñéαñíαÑÇαñòαñ╛αñ«", materials: "αñÜαñ┐αññαÑìαñ░", outcome: "C ΓÇô 2.1 αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαÑç αñ╡αñ┐αñ╡αñ┐αñº αñ╕αÑìαñ░αÑïαññ αñ╕αñ╛αñéαñùαÑéαñ¿, αññαÑìαñ»αñ╛αñéαñÜαÑìαñ»αñ╛ αñ╕αÑìαñ╡αñÜαÑìαñ¢αññαÑçαñÜαÑç αñ«αñ╣αññαÑìαññαÑìαñ╡ αñ╕αñ╛αñéαñùαññαÑï." },
    30: { topic: "αñáαÑçαñ╡αñ╛ αñ¿αñ┐αñ╕αñ░αÑìαñùαñ╛αñÜαñ╛", experience: "αñ╡αñ╛αñÜαñ╛ αñ╡ αñ╕αñ«αñ£αÑéαñ¿ αñÿαÑçαññαñ╛αññ.", tools: "αññαÑïαñéαñíαÑÇαñòαñ╛αñ«", materials: "αñÜαñ┐αññαÑìαñ░", outcome: "C ΓÇô 2.1 αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαÑç αñ╡αñ┐αñ╡αñ┐αñº αñ╕αÑìαñ░αÑïαññ αñ╕αñ╛αñéαñùαÑéαñ¿, αññαÑìαñ»αñ╛αñéαñÜαÑìαñ»αñ╛ αñ╕αÑìαñ╡αñÜαÑìαñ¢αññαÑçαñÜαÑç αñ«αñ╣αññαÑìαññαÑìαñ╡ αñ╕αñ╛αñéαñùαññαÑï." }
  },
  "αñ¬αñ░αñ┐αñ╕αñ░ αñàαñ¡αÑìαñ»αñ╛αñ╕ αÑ¿": {
    15: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    16: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    17: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    18: { topic: "αñòαÑüαñƒαÑüαñéαñ¼", experience: "αñòαÑüαñƒαÑüαñéαñ¼αñ╛αññαÑÇαñ▓ αñ╕αñªαñ╕αÑìαñ»αñ╛αñéαñÜαÑÇ αñ¿αñ╛αñ╡αÑç αñ╕αñ╛αñéαñùαñ╛.", tools: "αññαÑïαñéαñíαÑÇαñòαñ╛αñ«", materials: "αñ╡αñ┐αñ╡αñ┐αñº αñÜαñ┐αññαÑìαñ░αÑç", outcome: "04.958.01 αñ╡αñ┐αñ╕αÑìαññαñ╛αñ░αñ┐αññ αñòαÑüαñƒαÑüαñéαñ¼αñ╛αññαÑÇαñ▓ αñ╕αñªαñ╕αÑìαñ»αñ╛αñéαñÜαÑç αñÅαñòαñ«αÑçαñòαñ╛αñéαñ╢αÑÇ αñàαñ╕αñ▓αÑçαñ▓αÑç αñ¿αñ╛αññαÑçαñ╕αñéαñ¼αñéαñº αñôαñ│αñûαññαñ╛αññ." },
    19: { topic: "αñòαÑüαñƒαÑüαñéαñ¼", experience: "αñòαÑüαñƒαÑüαñéαñ¼αñ╛αññαÑÇαñ▓ αñ╕αñªαñ╕αÑìαñ»αñ╛αñéαñÜαÑÇ αñ«αñ╛αñ╣αñ┐αññαÑÇ αñ╕αñ╛αñéαñùαñ╛.", tools: "αññαÑïαñéαñíαÑÇαñòαñ╛αñ«", materials: "αñ╡αñ┐αñ╡αñ┐αñº αñÜαñ┐αññαÑìαñ░αÑç", outcome: "04.958.01 αñ╡αñ┐αñ╕αÑìαññαñ╛αñ░αñ┐αññ αñòαÑüαñƒαÑüαñéαñ¼αñ╛αññαÑÇαñ▓ αñ╕αñªαñ╕αÑìαñ»αñ╛αñéαñÜαÑç αñÅαñòαñ«αÑçαñòαñ╛αñéαñ╢αÑÇ αñàαñ╕αñ▓αÑçαñ▓αÑç αñ¿αñ╛αññαÑçαñ╕αñéαñ¼αñéαñº αñôαñ│αñûαññαñ╛αññ." },
    20: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    22: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    23: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    24: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    25: { topic: "αñàαñ¿αÑüαñ¡αñ╡ αñòαñÑαñ¿", experience: "αñàαñ¿αÑüαñ¡αñ╡αñ▓αÑçαñ▓αÑìαñ»αñ╛ αñ╕αñ«αñ╕αÑìαñ»αñ╛ αñ«αñ╛αñéαñíαññαñ╛αññ.", tools: "αññαÑïαñéαñíαÑÇαñòαñ╛αñ«", materials: "αñ╡αñ┐αñ╡αñ┐αñº αñÜαñ┐αññαÑìαñ░αÑç", outcome: "04.958.02 αñòαÑüαñƒαÑüαñéαñ¼ / αñ╢αñ╛αñ│αñ╛ / αñ╢αÑçαñ£αñ╛αñ░ αñ»αñ╛ αñáαñ┐αñòαñ╛αñúαÑÇ αñ¿αñ┐αñ░αÑÇαñòαÑìαñ╖αñú αñòαÑçαñ▓αÑçαñ▓αÑìαñ»αñ╛ / αñàαñ¿αÑüαñ¡αñ╡αñ▓αÑçαñ▓αÑìαñ»αñ╛ αñ╕αñ«αñ╕αÑìαñ»αñ╛αñéαñ╡αñ░ αñ╕αÑìαñ╡αññαñâαñÜαÑç αñ«αññ αñ«αñ╛αñéαñíαññαñ╛αññ" },
    26: { topic: "", experience: "", tools: "", materials: "", outcome: "", isHolidayText: "αñ░αñ╛αñ£αñ░αÑìαñ╖αÑÇ αñ╢αñ╛αñ╣αÑé αñ«αñ╣αñ╛αñ░αñ╛αñ£ αñ£αñ»αñéαññαÑÇ αñ╡ αñ«αÑïαñ╣αñ░αñ«" },
    27: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    29: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    30: { topic: "", experience: "", tools: "", materials: "", outcome: "" }
  },
  "αñòαñ▓αñ╛": {
    15: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    16: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    17: { topic: "αñ¼αñíαñ¼αñí αñùαÑÇαññ", experience: "αñ¼αñíαñ¼αñí αñùαÑÇαññ αñùαñ╛αñ»αñ¿ αñòαñ░αññαñ╛αññ.", tools: "αññαÑïαñéαñíαÑÇαñòαñ╛αñ«", materials: "αñºαÑìαñ╡αñ¿αÑÇαñ½αÑÇαññ", outcome: "αñ¼αñíαñ¼αñíαñùαÑÇαññ, αñ╕αñ«αÑéαñ╣αñùαÑÇαññ αññαñ╛αñ▓αñ╛αñ╕αÑüαñ░αñ╛αññ αñ«αÑìαñ╣αñúαññαÑï." },
    18: { topic: "αñÜαñ┐αññαÑìαñ░ αñòαñ╛αñóαñúαÑç", experience: "αñ░αÑçαñ╖αñ╛αñéαñÜαÑìαñ»αñ╛ αñ╕αñ╣αñ╛αñ»αÑìαñ»αñ╛αñ¿αÑç αñÜαñ┐αññαÑìαñ░ αñòαñ╛αñóαññαñ╛αññ αñ╡ αñ░αñéαñùαñ╡αñ┐αññαñ╛αññ.", tools: "αñ¬αÑìαñ░αñ╛αññαÑìαñ»αñòαÑìαñ╖αñ┐αñò", materials: "αñÜαñ┐αññαÑìαñ░", outcome: "αñ░αÑçαñ╖αñ╛αñéαñÜαÑìαñ»αñ╛ αñ╡αñ┐αñ╡αñ┐αñº αñåαñòαñ╛αñ░αñ╛αñéαñ¬αñ╛αñ╕αÑéαñ¿ αñ╕αÑïαñ¬αÑç αñåαñòαñ╛αñ░ αñòαñ╛αñóαññαÑï αññαñ╕αÑçαñÜ αñ¿αñòαÑìαñ╖αÑÇαñòαñ╛αñ« αñòαñ░αññαÑï." },
    19: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    20: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    22: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    23: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    24: { topic: "αñ¬αÑìαñ░αñ╛αñ░αÑìαñÑαñ¿αñ╛ αñùαñ╛αñ»αñ¿", experience: "αñ¬αÑìαñ░αñ╛αñ░αÑìαñÑαñ¿αñ╛ αñùαñ╛αñ»αñ¿ αñòαñ░αññαñ╛αññ.", tools: "αññαÑïαñéαñíαÑÇαñòαñ╛αñ«", materials: "αñºαÑìαñ╡αñ¿αÑÇαñ½αÑÇαññ", outcome: "αñ¼αñíαñ¼αñíαñùαÑÇαññ, αñ╕αñ«αÑéαñ╣αñùαÑÇαññ αññαñ╛αñ▓αñ╛αñ╕αÑüαñ░αñ╛αññ αñ«αÑìαñ╣αñúαññαÑï." },
    25: { topic: "αñòαñ╡αñ┐αññαñ╛ αñùαñ╛αñ»αñ¿", experience: "αñòαñ╡αñ┐αññαñ╛ αñùαñ╛αñ»αñ¿ αññαñ╛αñ▓αñ╛αñ╕αÑüαñ░αñ╛αññ αñòαñ░αññαñ╛αññ.", tools: "αñ¬αÑìαñ░αñ╛αññαÑìαñ»αñòαÑìαñ╖αñ┐αñò", materials: "αñÜαñ┐αññαÑìαñ░", outcome: "αñ░αÑçαñ╖αñ╛αñéαñÜαÑìαñ»αñ╛ αñ╡αñ┐αñ╡αñ┐αñº αñåαñòαñ╛αñ░αñ╛αñéαñ¬αñ╛αñ╕αÑéαñ¿ αñ╕αÑïαñ¬αÑç αñåαñòαñ╛αñ░ αñòαñ╛αñóαññαÑï αññαñ╕αÑçαñÜ αñ¿αñòαÑìαñ╖αÑÇαñòαñ╛αñ« αñòαñ░αññαÑï." },
    26: { topic: "", experience: "", tools: "", materials: "", outcome: "", isHolidayText: "αñ░αñ╛αñ£αñ░αÑìαñ╖αÑÇ αñ╢αñ╛αñ╣αÑé αñ«αñ╣αñ╛αñ░αñ╛αñ£ αñ£αñ»αñéαññαÑÇ αñ╡ αñ«αÑïαñ╣αñ░αñ«" },
    27: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    29: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    30: { topic: "", experience: "", tools: "", materials: "", outcome: "" }
  },
  "αñòαñ╛αñ░αÑìαñ»αñ╛αñ¿αÑüαñ¡αñ╡": {
    15: { topic: "αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαñ╛ αñ╡αñ╛αñ¬αñ░", experience: "αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαÑç αñëαñ¬αñ»αÑïαñù αñ╕αñ╛αñéαñùαñ╛.", tools: "αññαÑïαñéαñíαÑÇαñòαñ╛αñ«", materials: "αñÜαñ┐αññαÑìαñ░", outcome: "αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαÑç αñ╡αñ┐αñ╡αñ┐αñº αñëαñ¬αñ»αÑïαñù αñ╕αñ╛αñéαñùαññαÑï. αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαÑç αñ╡αñ┐αñ╡αñ┐αñº αñëαñ¬αñ»αÑïαñù αñ╕αñ╛αñéαñùαññαÑï. αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαÑç αñ╡αñ┐αñ╡αñ┐αñº αñëαñ¬αñ»αÑïαñù αñ╕αñ╛αñéαñùαññαÑï. αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαÑç αñ╡αñ┐αñ╡αñ┐αñº αñëαñ¬αñ»αÑïαñù αñ╕αñ╛αñéαñùαññαÑï. αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαÑç αñ╡αñ┐αñ╡αñ┐αñº αñëαñ¬αñ»αÑïαñù αñ╕αñ╛αñéαñùαññαÑï." },
    16: { topic: "αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαñ╛ αñ╡αñ╛αñ¬αñ░", experience: "αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαñ╛ αñ╡αñ╛αñ¬αñ░ αñ╡ αñ¼αñÜαññ αñ»αñ╛αñ╡αñ░ αñÜαñ░αÑìαñÜαñ╛", tools: "αññαÑïαñéαñíαÑÇαñòαñ╛αñ«", materials: "αñÜαñ┐αññαÑìαñ░", outcome: "αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαÑç αñ╡αñ┐αñ╡αñ┐αñº αñëαñ¬αñ»αÑïαñù αñ╕αñ╛αñéαñùαññαÑï. αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαÑç αñ╡αñ┐αñ╡αñ┐αñº αñëαñ¬αñ»αÑïαñù αñ╕αñ╛αñéαñùαññαÑï. αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαÑç αñ╡αñ┐αñ╡αñ┐αñº αñëαñ¬αñ»αÑïαñù αñ╕αñ╛αñéαñùαññαÑï. αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαÑç αñ╡αñ┐αñ╡αñ┐αñº αñëαñ¬αñ»αÑïαñù αñ╕αñ╛αñéαñùαññαÑï. αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαÑç αñ╡αñ┐αñ╡αñ┐αñº αñëαñ¬αñ»αÑïαñù αñ╕αñ╛αñéαñùαññαÑï." },
    17: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    18: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    19: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    20: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    22: { topic: "αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαñ╛ αñ╡αñ╛αñ¬αñ░", experience: "αñ¬αñ╛αñúαÑìαñ»αñ╛αñ╡αñ┐αñ╖αñ»αÑÇ αñÿαÑïαñ╖αñ╡αñ╛αñòαÑìαñ»αÑç αñ╕αñ╛αñéαñùαñ╛.", tools: "αñëαñ¬αñòαÑìαñ░αñ«", materials: "-", outcome: "αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαÑç αñ╡αñ┐αñ╡αñ┐αñº αñëαñ¬αñ»αÑïαñù αñ╕αñ╛αñéαñùαññαÑï. αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαÑç αñ╡αñ┐αñ╡αñ┐αñº αñëαñ¬αñ»αÑïαñù αñ╕αñ╛αñéαñùαññαÑï. αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαÑç αñ╡αñ┐αñ╡αñ┐αñº αñëαñ¬αñ»αÑïαñù αñ╕αñ╛αñéαñùαññαÑï. αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαÑç αñ╡αñ┐αñ╡αñ┐αñº αñëαñ¬αñ»αÑïαñù αñ╕αñ╛αñéαñùαññαÑï. αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαÑç αñ╡αñ┐αñ╡αñ┐αñº αñëαñ¬αñ»αÑïαñù αñ╕αñ╛αñéαñùαññαÑï." },
    23: { topic: "αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαñ╛ αñ╡αñ╛αñ¬αñ░", experience: "αñ¬αñ╛αñúαÑìαñ»αñ╛αñ╡αñ┐αñ╖αñ»αÑÇ αñÿαÑïαñ╖αñ╡αñ╛αñòαÑìαñ»αÑç αñ▓αñ┐αñ╣αñ╛.", tools: "αññαÑïαñéαñíαÑÇαñòαñ╛αñ«", materials: "αñÜαñ┐αññαÑìαñ░", outcome: "αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαÑç αñ╡αñ┐αñ╡αñ┐αñº αñëαñ¬αñ»αÑïαñù αñ╕αñ╛αñéαñùαññαÑï. αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαÑç αñ╡αñ┐αñ╡αñ┐αñº αñëαñ¬αñ»αÑïαñù αñ╕αñ╛αñéαñùαññαÑï. αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαÑç αñ╡αñ┐αñ╡αñ┐αñº αñëαñ¬αñ»αÑïαñù αñ╕αñ╛αñéαñùαññαÑï. αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαÑç αñ╡αñ┐αñ╡αñ┐αñº αñëαñ¬αñ»αÑïαñù αñ╕αñ╛αñéαñùαññαÑï. αñ¬αñ╛αñúαÑìαñ»αñ╛αñÜαÑç αñ╡αñ┐αñ╡αñ┐αñº αñëαñ¬αñ»αÑïαñù αñ╕αñ╛αñéαñùαññαÑï." },
    24: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    25: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    26: { topic: "", experience: "", tools: "", materials: "", outcome: "", isHolidayText: "αñ░αñ╛αñ£αñ░αÑìαñ╖αÑÇ αñ╢αñ╛αñ╣αÑé αñ«αñ╣αñ╛αñ░αñ╛αñ£ αñ£αñ»αñéαññαÑÇ αñ╡ αñ«αÑïαñ╣αñ░αñ«" },
    27: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    29: { topic: "αñ¼αñÜαññαñ¬αÑçαñƒαÑÇ", experience: "αñòαñ╛αñùαñªαÑÇ αñ¼αñÜαññαñ¬αÑçαñƒαÑÇ αññαñ»αñ╛αñ░ αñòαñ░αñ╛.", tools: "αñëαñ¬αñòαÑìαñ░αñ«", materials: "αñòαñ╛αñùαñª", outcome: "αñùαñ░αñ£αñ╛ αñåαñúαñ┐ αñ╕αñ«αñ╕αÑìαñ»αñ╛ αñ»αñ╛αñéαñÜαÑìαñ»αñ╛αñ╢αÑÇ αñ¿αñ┐αñùαñíαñ┐αññ αñòαÑîαñ╢αñ▓αÑìαñ»αñ¬αÑéαñ░αÑìαñú αñ╕αñ«αñ╛αñ£αÑïαñ¬αñ»αÑïαñùαÑÇ αñ╕αñ╛αñ╣αñ┐αññαÑìαñ» αñ¿αñ┐αñ░αÑìαñ«αñ╛αñú αñòαñ░αññαÑï." },
    30: { topic: "αñ╡αñ░αÑìαñù αñ╕αÑüαñ╢αÑïαñ¡αñ¿", experience: "αñ╕αÑüαñ╢αÑïαñ¡αñ¿αñ╛αñ╕αñ╛αñáαÑÇ αñ╕αÑïαñ¬αÑç αñ╕αñ╛αñ╣αñ┐αññαÑìαñ» αñ╕αñ╛αñéαñùαñ╛.", tools: "αñ╡αñ░αÑìαñùαñòαñ╛αñ░αÑìαñ»", materials: "-", outcome: "αñ╡αñ░αÑìαñùαñ╛αñÜαÑç αñ╕αÑüαñ╢αÑïαñ¡αñ¿ αñòαñ░αÑéαñ¿ αñªαñ┐αñ¿αñ╡αñ┐αñ╢αÑçαñ╖ αñ╡ αñ¬αñ░αñ┐αñ╕αñ░αñ╛αññαÑÇαñ▓ αñ▓αñÿαÑü αñëαñªαÑìαñ»αÑïαñùαñ╛αñéαñÜαÑÇ αñ«αñ╛αñ╣αñ┐αññαÑÇ αñ╕αñ╛αñéαñùαññαÑï." }
  },
  "αñ╢αñ╛αñ░αÑÇαñ░αñ┐αñò αñ╢αñ┐αñòαÑìαñ╖αñú": {
    15: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    16: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    17: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    18: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    19: { topic: "αñ╢αñ╛αñ░αÑÇαñ░αñ┐αñò αñ╕αÑìαñ╡αñÜαÑìαñ¢αññαñ╛", experience: "αñ╡αÑêαñ»αñòαÑìαññαñ┐αñò αñ╕αÑìαñ╡αñÜαÑìαñ¢αññαñ╛ αññαñ¬αñ╛αñ╕αñúαÑç", tools: "αñ╡αñ░αÑìαñùαñòαñ╛αñ░αÑìαñ»", materials: "αññαñòαÑìαññαñ╛", outcome: "αñåαñ░αÑïαñùαÑìαñ»αñ╛αñÜαÑìαñ»αñ╛ αñÜαñ╛αñéαñùαñ▓αÑìαñ»αñ╛ αñ╕αñ╡αñ»αÑÇ αñ╕αñ«αñ£αÑéαñ¿ αñÿαÑçαñèαñ¿ αññαÑìαñ»αñ╛αñéαñÜαÑç αñ¬αñ╛αñ▓αñ¿ αñòαñ░αññαÑï." },
    20: { topic: "αñûαÑçαñ│", experience: "αñòαñ¼αñíαÑìαñíαÑÇ αñûαÑçαñ│ αñûαÑçαñ│αñúαÑç.", tools: "αñ¬αÑìαñ░αñ╛αññαÑìαñ»αñòαÑìαñ╖αñ┐αñò", materials: "αñ╡αñ╕αÑìαññαÑé", outcome: "αñ╡αñ┐αñ╡αñ┐αñº αñ¬αÑìαñ░αñòαñ╛αñ░αñÜαÑìαñ»αñ╛ αñûαÑçαñ│αñ╛αñéαññ αñ░αÑüαñÜαÑÇ αñÿαÑçαññαÑï. αñ╢αñ░αÑìαñ»αññαÑÇαññ αñ╕αñ╣αñ¡αñ╛αñùαÑÇ αñ╣αÑïαññαÑï." },
    22: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    23: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    24: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    25: { topic: "", experience: "", tools: "", materials: "", outcome: "" },
    26: { topic: "", experience: "", tools: "", materials: "", outcome: "", isHolidayText: "αñ░αñ╛αñ£αñ░αÑìαñ╖αÑÇ αñ╢αñ╛αñ╣αÑé αñ«αñ╣αñ╛αñ░αñ╛αñ£ αñ£αñ»αñéαññαÑÇ αñ╡ αñ«αÑïαñ╣αñ░αñ«" },
    27: { topic: "αñûαÑçαñ│", experience: "αñ«αñ¿αÑïαñ░αñéαñ£αñ¿αñ╛αññαÑìαñ«αñò αñûαÑçαñ│ αñûαÑçαñ│αñúαÑç.", tools: "αñ¬αÑìαñ░αñ╛αññαÑìαñ»αñòαÑìαñ╖αñ┐αñò", materials: "αñ╡αñ╕αÑìαññαÑé", outcome: "αñ╡αñ┐αñ╡αñ┐αñº αñ¬αÑìαñ░αñòαñ╛αñ░αñÜαÑìαñ»αñ╛ αñûαÑçαñ│αñ╛αñéαññ αñ░αÑüαñÜαÑÇ αñÿαÑçαññαÑï. αñ╢αñ░αÑìαñ»αññαÑÇαññ αñ╕αñ╣αñ¡αñ╛αñùαÑÇ αñ╣αÑïαññαÑï." },
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
  const daysMr = ["αñ░αñ╡αñ┐", "αñ╕αÑïαñ«", "αñ«αñéαñùαñ│", "αñ¼αÑüαñº", "αñùαÑüαñ░αÑü", "αñ╢αÑüαñòαÑìαñ░", "αñ╢αñ¿αñ┐"];

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
    if (subject.includes("Math") || subject.includes("αñùαñúαñ┐αññ") || subject.includes("Mathematics")) {
      lookupSubject = "αñùαñúαñ┐αññ";
    }
    const subjectPlan = CLASS4_JUNE_PLAN[lookupSubject];
    if (subjectPlan && subjectPlan[dateNum]) {
      return subjectPlan[dateNum];
    }
  }

  if (dayMr === "αñ░αñ╡αñ┐" || dayMr === "αñ░αñ╡αÑÇ") {
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
          αñ«αñ╛αñ╕αñ┐αñò αñ¿αñ┐αñ»αÑïαñ£αñ¿
        </h1>
        <h2 className="text-3xl font-bold text-slate-800 font-devanagari">
          {safeData.academicYear || "αÑ¿αÑªαÑ¿αÑ¼-αÑ¿αÑªαÑ¿αÑ¡"}
        </h2>
        <h3 className="text-3xl font-bold text-slate-800 font-devanagari">
          αñ╡αñ░αÑìαñù ΓÇô {classMrName}
        </h3>
        <h3 className="text-3xl font-bold text-slate-800 font-devanagari">
          {m.mr} ΓÇô {actualYear}
        </h3>

        <div className="w-full max-w-lg mx-auto pt-16 space-y-6 text-left">
          <div className="flex items-center gap-3 text-lg font-bold">
            <span className="shrink-0 font-devanagari">ΓÇó αñ╡αñ░αÑìαñùαñ╢αñ┐αñòαÑìαñ╖αñò αñ¿αñ╛αñ╡ :</span>
            <span className="border-b-2 border-black flex-1 min-w-[200px] pb-1 font-devanagari text-slate-800">
              {safeData.classTeacher || ""}
            </span>
          </div>
          <div className="flex items-center gap-3 text-lg font-bold">
            <span className="shrink-0 font-devanagari">ΓÇó αñ╢αñ╛αñ│αÑçαñÜαÑç αñ¿αñ╛αñ╡ :</span>
            <span className="border-b-2 border-black flex-1 min-w-[200px] pb-1 font-devanagari text-slate-800">
              {safeData.schoolName || ""}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-12 pt-3 border-t-2 border-amber-900 flex justify-between items-center text-[10px] text-slate-650 font-bold font-devanagari">
        <span>ukguruji app αñ╣αÑç play store αñ╡αñ░αÑéαñ¿ αñíαñ╛αñèαñ¿αñ▓αÑïαñí αñòαñ░αñ╛.</span>
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
    "αñ«αñ░αñ╛αñáαÑÇ": {
      June: 35, July: 69, August: 51, September: 53, October: 35,
      November: 61, December: 61, January: 67, February: 59, March: 61, April: 56, May: 0
    },
    "αñùαñúαñ┐αññ": {
      June: 28, July: 56, August: 41, September: 43, October: 28,
      November: 50, December: 50, January: 54, February: 48, March: 50, April: 46, May: 0
    },
    "Mathematics": {
      June: 28, July: 56, August: 41, September: 43, October: 28,
      November: 50, December: 50, January: 54, February: 48, March: 50, April: 46, May: 0
    },
    "αñçαñéαñùαÑìαñ░αñ£αÑÇ": {
      June: 15, July: 30, August: 22, September: 23, October: 15,
      November: 27, December: 27, January: 29, February: 26, March: 27, April: 25, May: 0
    },
    "English": {
      June: 15, July: 30, August: 22, September: 23, October: 15,
      November: 27, December: 27, January: 29, February: 26, March: 27, April: 25, May: 0
    },
    "αñûαÑçαñ│αÑé αñòαñ░αÑé αñ╢αñ┐αñòαÑé": {
      June: 15, July: 30, August: 22, September: 23, October: 15,
      November: 27, December: 27, January: 29, February: 26, March: 27, April: 25, May: 0
    }
  };

  const getWeeklyPeriods = (subj: string, cls: string): number => {
    const isMr = subj.includes("αñ«αñ░αñ╛αñáαÑÇ");
    const isMath = subj.includes("Math") || subj.includes("αñùαñúαñ┐αññ") || subj.includes("Mathematics");
    const isEng = subj.includes("αñçαñéαñùαÑìαñ░αñ£αÑÇ") || subj.includes("English");
    const isHindi = subj.includes("αñ╣αñ┐αñéαñªαÑÇ") || subj.includes("Hindi");
    const isSci = subj.includes("αñ╡αñ┐αñ£αÑìαñ₧αñ╛αñ¿") || subj.includes("Science") || subj.includes("αñ¬αñ░αñ┐αñ╕αñ░ αñàαñ¡αÑìαñ»αñ╛αñ╕ αÑº") || subj.includes("Environmental Studies 1");
    const isSoc = subj.includes("αñ╕αñ«αñ╛αñ£αñ╢αñ╛αñ╕αÑìαññαÑìαñ░") || subj.includes("Social Sciences") || subj.includes("αñ¬αñ░αñ┐αñ╕αñ░ αñàαñ¡αÑìαñ»αñ╛αñ╕ αÑ¿") || subj.includes("Environmental Studies 2") || subj.includes("αñçαññαñ┐αñ╣αñ╛αñ╕") || subj.includes("αñ¡αÑéαñùαÑïαñ▓");

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
      if (subj.includes("αñçαññαñ┐αñ╣αñ╛αñ╕") || subj.includes("αñ¡αÑéαñùαÑïαñ▓")) return 3;
      return 6;
    }
    if (subj.includes("αñûαÑçαñ│αÑé αñòαñ░αÑé αñ╢αñ┐αñòαÑé")) {
      if (cls === "1st" || cls === "2nd") return 12;
      if (cls === "3rd" || cls === "4th") return 10;
      if (cls === "5th") return 9;
      return 10;
    }
    if (subj.includes("αñòαñ▓αñ╛")) {
      if (cls === "1st" || cls === "2nd") return 4;
      if (cls === "3rd" || cls === "4th" || cls === "5th") return 3;
      return 4;
    }
    if (subj.includes("αñòαñ╛αñ░αÑìαñ»αñ╛αñ¿αÑüαñ¡αñ╡")) {
      if (cls === "1st" || cls === "2nd" || cls === "3rd" || cls === "4th") return 4;
      if (cls === "5th") return 3;
      return 2;
    }
    if (subj.includes("αñ╢αñ╛.αñ╢αñ┐αñòαÑìαñ╖αñú")) {
      if (cls === "1st" || cls === "2nd") return 4;
      if (cls === "3rd" || cls === "4th" || cls === "5th") return 3;
      return 4;
    }
    return 3;
  };

  const getPeriodsForMonth = (subj: string, cls: string, monthEn: string): number => {
    const weekly = getWeeklyPeriods(subj, cls);
    const class1Weekly = subj.includes("αñ«αñ░αñ╛αñáαÑÇ") ? 16 : (subj.includes("Math") || subj.includes("αñùαñúαñ┐αññ") || subj.includes("Mathematics")) ? 13 : 7;
    const lookupSubject = subj.includes("αñ«αñ░αñ╛αñáαÑÇ") ? "αñ«αñ░αñ╛αñáαÑÇ" : (subj.includes("Math") || subj.includes("αñùαñúαñ┐αññ") || subj.includes("Mathematics")) ? "αñùαñúαñ┐αññ" : "αñçαñéαñùαÑìαñ░αñ£αÑÇ";
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
    "1st": { mr: "αñ¬αñ╣αñ┐αñ▓αÑÇ", en: "Class 1st" },
    "2nd": { mr: "αñªαÑüαñ╕αñ░αÑÇ", en: "Class 2nd" },
    "3rd": { mr: "αññαñ┐αñ╕αñ░αÑÇ", en: "Class 3rd" },
    "4th": { mr: "αñÜαÑîαñÑαÑÇ", en: "Class 4th" },
    "5th": { mr: "αñ¬αñ╛αñÜαñ╡αÑÇ", en: "Class 5th" },
    "6th": { mr: "αñ╕αñ╣αñ╛αñ╡αÑÇ", en: "Class 6th" },
    "7th": { mr: "αñ╕αñ╛αññαñ╡αÑÇ", en: "Class 7th" },
    "8th": { mr: "αñåαñáαñ╡αÑÇ", en: "Class 8th" },
  };
  const mediums = [
    { id: "Marathi", title: "Marathi", sub: "αñ«αñ░αñ╛αñáαÑÇ αñ«αñ╛αñºαÑìαñ»αñ«", desc: "αñ«αñ░αñ╛αñáαÑÇ αñ«αñ╛αñºαÑìαñ»αñ«αñ╛αñÜαÑç αñ╡αñ╛αñ░αÑìαñ╖αñ┐αñò/αñ«αñ╛αñ╕αñ┐αñò αñ¿αñ┐αñ»αÑïαñ£αñ¿" },
    { id: "Semi English", title: "Semi English", sub: "αñ╕αÑçαñ«αÑÇ αñçαñéαñùαÑìαñ░αñ£αÑÇ", desc: "Semi English medium annual/monthly planning" },
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

      const worker = html2pdfFn().set(opt).from(clone);
      await worker.save();
      toast.success('PDF Downloaded Successfully!');

      try {
        const pdfBlob = (await worker.output("blob")) as Blob;
        const fileName = `${planType === "annual" ? "Annual" : "Monthly"}_Planning_${selectedClass}_${Date.now()}.pdf`;
        const cdnUrl = await uploadBlobToBunny(`planning/${fileName}`, pdfBlob);
        console.log("Uploaded Planning PDF to Bunny Storage:", cdnUrl);
      } catch (uploadErr: any) {
        console.warn("Could not upload Planning PDF to Bunny Storage:", uploadErr);
      }
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
              {planType === "annual" ? "αñ╡αñ╛αñ░αÑìαñ╖αñ┐αñò αñàαñ¡αÑìαñ»αñ╛αñ╕αñòαÑìαñ░αñ« αñ¿αñ┐αñ»αÑïαñ£αñ¿ αñåαñ░αñ╛αñûαñíαñ╛ (αñ╕αññαÑìαñ░ αÑº αñ╡ αñ╕αññαÑìαñ░ αÑ¿)" : "αñ«αñ╛αñ╕αñ┐αñò αñàαñ¡αÑìαñ»αñ╛αñ╕αñòαÑìαñ░αñ« αñ¿αñ┐αñ»αÑïαñ£αñ¿ αñ╡ αñëαñªαÑìαñªαñ┐αñ╖αÑìαñƒαÑç"}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Academic Session: {safeData.academicYear}
            </p>
          </div>
        ) : (
          <div className="text-center space-y-2 mb-8 border-b-4 border-slate-950 pb-4">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">αñ╡αñ╛αñ░αÑìαñ╖αñ┐αñò αñ¿αñ┐αñ»αÑïαñ£αñ¿</h1>
            <h2 className="text-base font-bold text-slate-800">αñ╢αÑêαñòαÑìαñ╖αñúαñ┐αñò αñ╡αñ░αÑìαñ╖ αÑ¿αÑªαÑ¿αÑ¼ ΓÇô αÑ¿αÑªαÑ¿αÑ¡</h2>
            <h3 className="text-sm font-bold text-slate-800">αñçαñ»αññαÑìαññαñ╛ ΓÇô {classNames[selectedClass]?.mr}</h3>
            <div className="flex justify-between text-xs font-bold text-slate-800 px-4 pt-4">
              <div>αñ╡αñ░αÑìαñùαñ╢αñ┐αñòαÑìαñ╖αñò αñ¿αñ╛αñ╡ ΓÇô {safeData.classTeacher}</div>
              <div>αñ╢αñ╛αñ│αñ╛ - {safeData.schoolName}</div>
            </div>
          </div>
        )}

        {/* Metadata tags */}
        {!((selectedMedium === "Marathi" || selectedMedium === "Semi English") && planType === "annual") && (
          <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6 text-[11px] font-medium text-slate-700">
            <div>
              <span className="font-bold text-slate-400 uppercase text-[9px] block">Standard</span>
              {classNames[selectedClass]?.en} (αñçαñ»αññαÑìαññαñ╛ {classNames[selectedClass]?.mr})
            </div>
            <div>
              <span className="font-bold text-slate-400 uppercase text-[9px] block">Medium</span>
              {selectedMedium} ({selectedMedium === "Semi English" ? "αñ╕αÑçαñ«αÑÇ αñçαñéαñùαÑìαñ░αñ£αÑÇ" : "αñ«αñ░αñ╛αñáαÑÇ"})
            </div>
            <div>
              <span className="font-bold text-slate-400 uppercase text-[9px] block">Teacher</span>
              {safeData.classTeacher || "ΓÇö"}
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
                {/* Table 1: αñ╡αñ╛αñ░αÑìαñ╖αñ┐αñò αñòαñ╛αñ«αñ╛αñÜαÑç αñªαñ┐αñ╡αñ╕ */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1 text-center">
                    αñ╡αñ╛αñ░αÑìαñ╖αñ┐αñò αñòαñ╛αñ«αñ╛αñÜαÑç αñªαñ┐αñ╡αñ╕ ( αñ╕αñ¿ -αÑ¿αÑªαÑ¿αÑ¼/αÑ¿αÑªαÑ¿αÑ¡ )
                  </h3>
                  <table>
                    <thead>
                      <tr>
                        <th className="text-center">αñ«αñ╣αñ┐αñ¿αñ╛</th>
                        <th className="text-center">αñ╕αÑïαñ«αñ╡αñ╛αñ░</th>
                        <th className="text-center">αñ«αñéαñùαñ│αñ╡αñ╛αñ░</th>
                        <th className="text-center">αñ¼αÑüαñºαñ╡αñ╛αñ░</th>
                        <th className="text-center">αñùαÑüαñ░αÑüαñ╡αñ╛αñ░</th>
                        <th className="text-center">αñ╢αÑüαñòαÑìαñ░αñ╡αñ╛αñ░</th>
                        <th className="text-center">αñ╢αñ¿αñ┐αñ╡αñ╛αñ░</th>
                        <th className="text-center">αñÅαñòαÑéαñú</th>
                        <th className="text-center">αñ░αñ╡αñ┐αñ╡αñ╛αñ░ αñ╡ αñ╕αÑüαñƒαÑìαñƒαÑÇ</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="font-bold text-center">αñ£αÑéαñ¿</td>
                        <td className="text-center">αÑ⌐</td>
                        <td className="text-center">αÑ⌐</td>
                        <td className="text-center">αÑ¿</td>
                        <td className="text-center">αÑ¿</td>
                        <td className="text-center">αÑº</td>
                        <td className="text-center">αÑ¿</td>
                        <td className="text-center font-bold">αÑºαÑ⌐</td>
                        <td className="text-center">αÑ¬ αñ╡ αÑºαÑ⌐</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-center">αñ£αÑüαñ▓αÑê</td>
                        <td className="text-center">αÑ¬</td>
                        <td className="text-center">αÑ¬</td>
                        <td className="text-center">αÑ½</td>
                        <td className="text-center">αÑ½</td>
                        <td className="text-center">αÑ½</td>
                        <td className="text-center">αÑ¬</td>
                        <td className="text-center font-bold">αÑ¿αÑ¡</td>
                        <td className="text-center">αÑ¬</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-center">αñæαñùαñ╕αÑìαñƒ</td>
                        <td className="text-center">αÑ¬</td>
                        <td className="text-center">αÑ¬</td>
                        <td className="text-center">αÑ⌐</td>
                        <td className="text-center">αÑ¬</td>
                        <td className="text-center">αÑ⌐</td>
                        <td className="text-center">αÑ¬</td>
                        <td className="text-center font-bold">αÑ¿αÑ¿</td>
                        <td className="text-center">αÑ½ αñ╡ αÑ¬</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-center">αñ╕αñ¬αÑìαñƒαÑçαñéαñ¼αñ░</td>
                        <td className="text-center">αÑ⌐</td>
                        <td className="text-center">αÑ⌐</td>
                        <td className="text-center">αÑ⌐</td>
                        <td className="text-center">αÑ¿</td>
                        <td className="text-center">αÑ¿</td>
                        <td className="text-center">αÑº</td>
                        <td className="text-center font-bold">αÑºαÑ¬</td>
                        <td className="text-center">αÑ¬ αñ╡ αÑºαÑ¿</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-center">αñæαñòαÑìαñƒαÑïαñ¼αñ░</td>
                        <td className="text-center">αÑ¬</td>
                        <td className="text-center">αÑ⌐</td>
                        <td className="text-center">αÑ¬</td>
                        <td className="text-center">αÑ½</td>
                        <td className="text-center">αÑ¬</td>
                        <td className="text-center">αÑ½</td>
                        <td className="text-center font-bold">αÑ¿αÑ½</td>
                        <td className="text-center">αÑ¬ αñ╡ αÑ¿</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-center">αñ¿αÑïαñ╡αÑìαñ╣αÑçαñéαñ¼αñ░</td>
                        <td className="text-center">αÑ¬</td>
                        <td className="text-center">αÑ¿</td>
                        <td className="text-center">αÑ⌐</td>
                        <td className="text-center">αÑ⌐</td>
                        <td className="text-center">αÑ¿</td>
                        <td className="text-center">αÑ¿</td>
                        <td className="text-center font-bold">αÑºαÑ¡</td>
                        <td className="text-center">αÑ½ αñ╡ αÑ»</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-center">αñíαñ┐αñ╕αÑçαñéαñ¼αñ░</td>
                        <td className="text-center">αÑ¬</td>
                        <td className="text-center">αÑ½</td>
                        <td className="text-center">αÑ¬</td>
                        <td className="text-center">αÑ½</td>
                        <td className="text-center">αÑ⌐</td>
                        <td className="text-center">αÑ⌐</td>
                        <td className="text-center font-bold">αÑ¿αÑ¬</td>
                        <td className="text-center">αÑ¬ αñ╡ αÑ⌐</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-center">αñ£αñ╛αñ¿αÑçαñ╡αñ╛αñ░αÑÇ</td>
                        <td className="text-center">αÑ¬</td>
                        <td className="text-center">αÑ¬</td>
                        <td className="text-center">αÑ¬</td>
                        <td className="text-center">αÑ⌐</td>
                        <td className="text-center">αÑ½</td>
                        <td className="text-center">αÑ½</td>
                        <td className="text-center font-bold">αÑ¿αÑ½</td>
                        <td className="text-center">αÑ½ αñ╡ αÑº</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-center">αñ½αÑçαñ¼αÑìαñ░αÑüαñ╡αñ╛αñ░αÑÇ</td>
                        <td className="text-center">αÑ¬</td>
                        <td className="text-center">αÑ¬</td>
                        <td className="text-center">αÑ¬</td>
                        <td className="text-center">αÑ⌐</td>
                        <td className="text-center">αÑ¬</td>
                        <td className="text-center">αÑ¬</td>
                        <td className="text-center font-bold">αÑ¿αÑ¿</td>
                        <td className="text-center">αÑ¬ αñ╡ αÑ¿</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-center">αñ«αñ╛αñ░αÑìαñÜ</td>
                        <td className="text-center">αÑ½</td>
                        <td className="text-center">αÑ¬</td>
                        <td className="text-center">αÑ¬</td>
                        <td className="text-center">αÑ¬</td>
                        <td className="text-center">αÑ⌐</td>
                        <td className="text-center">αÑ¬</td>
                        <td className="text-center font-bold">αÑ¿αÑ¬</td>
                        <td className="text-center">αÑ¬ αñ╡ αÑ⌐</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-center">αñÅαñ¬αÑìαñ░αñ┐αñ▓</td>
                        <td className="text-center">αÑ½</td>
                        <td className="text-center">αÑ⌐</td>
                        <td className="text-center">αÑ⌐</td>
                        <td className="text-center">αÑ⌐</td>
                        <td className="text-center">αÑ⌐</td>
                        <td className="text-center">αÑ¬</td>
                        <td className="text-center font-bold">αÑ¿αÑº</td>
                        <td className="text-center">αÑ½ αñ╡ αÑ¬</td>
                      </tr>
                      <tr className="bg-slate-100 font-bold">
                        <td className="text-center">αñÅαñòαÑéαñú</td>
                        <td className="text-center">αÑ¬αÑ¬</td>
                        <td className="text-center">αÑ⌐αÑ»</td>
                        <td className="text-center">αÑ⌐αÑ»</td>
                        <td className="text-center">αÑ⌐αÑ»</td>
                        <td className="text-center">αÑ⌐αÑ½</td>
                        <td className="text-center">αÑ⌐αÑ«</td>
                        <td className="text-center text-[#D6B97A]">αÑ¿αÑ⌐αÑ¬</td>
                        <td className="text-center">αÑ½αÑ¿ αñ╡ αÑ«αÑ½</td>
                      </tr>
                      <tr className="bg-slate-150 font-bold">
                        <td colSpan={7} className="text-right">αñ¬αÑìαñ░αñ╛αñ¬αÑìαññ αñåαñáαñ╡αñíαÑç</td>
                        <td colSpan={2} className="text-center text-[#D6B97A]">αÑ⌐αÑ«.αÑªαÑª</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Table 2: αñ╕αñ╛αñ¬αÑìαññαñ╛αñ╣αñ┐αñò αññαñ╛αñ╕αñ┐αñòαñ╛ */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1 text-center">
                    αñ╕αñ╛αñ¬αÑìαññαñ╛αñ╣αñ┐αñò αññαñ╛αñ╕αñ┐αñòαñ╛ ΓÇô αÑ¿αÑªαÑ¿αÑ¼/αÑ¿αÑªαÑ¿αÑ¡
                  </h3>
                  <table>
                    <thead>
                      <tr>
                        <th>αñ╡αñ┐αñ╖αñ»</th>
                        <th className="text-center">αÑº αñ▓αÑÇ</th>
                        <th className="text-center">αÑ¿ αñ░αÑÇ</th>
                        <th className="text-center">αÑ⌐ αñ░αÑÇ</th>
                        <th className="text-center">αÑ¬ αñÑαÑÇ</th>
                        <th className="text-center">αÑ½ αñ╡αÑÇ</th>
                        <th className="text-center">αÑ¼ αñ╡αÑÇ</th>
                        <th className="text-center">αÑ¡ αñ╡αÑÇ</th>
                        <th className="text-center">αÑ« αñ╡αÑÇ</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="font-bold">αñ«αñ░αñ╛αñáαÑÇ</td>
                        <td className={getCellClass("1st")}>αÑºαÑ¼</td>
                        <td className={getCellClass("2nd")}>αÑºαÑ¼</td>
                        <td className={getCellClass("3rd")}>αÑºαÑ¿</td>
                        <td className={getCellClass("4th")}>αÑºαÑ¿</td>
                        <td className={getCellClass("5th")}>αÑ¼</td>
                        <td className={getCellClass("6th")}>αÑ¼</td>
                        <td className={getCellClass("7th")}>αÑ¼</td>
                        <td className={getCellClass("8th")}>αÑ¼</td>
                      </tr>
                      <tr>
                        <td className="font-bold">αñ╣αñ┐αñéαñªαÑÇ</td>
                        <td className={getCellClass("1st")}>αÑª</td>
                        <td className={getCellClass("2nd")}>αÑª</td>
                        <td className={getCellClass("3rd")}>αÑª</td>
                        <td className={getCellClass("4th")}>αÑª</td>
                        <td className={getCellClass("5th")}>αÑ¼</td>
                        <td className={getCellClass("6th")}>αÑ¼</td>
                        <td className={getCellClass("7th")}>αÑ¼</td>
                        <td className={getCellClass("8th")}>αÑ¼</td>
                      </tr>
                      <tr>
                        <td className="font-bold">αñçαñéαñùαÑìαñ░αñ£αÑÇ</td>
                        <td className={getCellClass("1st")}>αÑ¡</td>
                        <td className={getCellClass("2nd")}>αÑ¡</td>
                        <td className={getCellClass("3rd")}>αÑ¡</td>
                        <td className={getCellClass("4th")}>αÑ¡</td>
                        <td className={getCellClass("5th")}>αÑ¡</td>
                        <td className={getCellClass("6th")}>αÑ¼</td>
                        <td className={getCellClass("7th")}>αÑ¼</td>
                        <td className={getCellClass("8th")}>αÑ¼</td>
                      </tr>
                      <tr>
                        <td className="font-bold">αñùαñúαñ┐αññ</td>
                        <td className={getCellClass("1st")}>αÑºαÑ⌐</td>
                        <td className={getCellClass("2nd")}>αÑºαÑ⌐</td>
                        <td className={getCellClass("3rd")}>αÑ»</td>
                        <td className={getCellClass("4th")}>αÑ»</td>
                        <td className={getCellClass("5th")}>αÑ«</td>
                        <td className={getCellClass("6th")}>αÑ¡</td>
                        <td className={getCellClass("7th")}>αÑ¡</td>
                        <td className={getCellClass("8th")}>αÑ¡</td>
                      </tr>
                      <tr>
                        <td className="font-bold">αñ╡αñ┐αñ£αÑìαñ₧αñ╛αñ¿</td>
                        <td className={getCellClass("1st")}>αÑª</td>
                        <td className={getCellClass("2nd")}>αÑª</td>
                        <td className={getCellClass("3rd")}>αÑ¼</td>
                        <td className={getCellClass("4th")}>αÑ¼</td>
                        <td className={getCellClass("5th")}>αÑ¼</td>
                        <td className={getCellClass("6th")}>αÑ¡</td>
                        <td className={getCellClass("7th")}>αÑ¡</td>
                        <td className={getCellClass("8th")}>αÑ¡</td>
                      </tr>
                      <tr>
                        <td className="font-bold">αñ╕αñ«αñ╛αñ£αñ╢αñ╛αñ╕αÑìαññαÑìαñ░</td>
                        <td className={getCellClass("1st")}>αÑª</td>
                        <td className={getCellClass("2nd")}>αÑª</td>
                        <td className={getCellClass("3rd")}>αÑ¬</td>
                        <td className={getCellClass("4th")}>αÑ¬</td>
                        <td className={getCellClass("5th")}>αÑ¬</td>
                        <td className={getCellClass("6th")}>αÑ¼</td>
                        <td className={getCellClass("7th")}>αÑ¼</td>
                        <td className={getCellClass("8th")}>αÑ¼</td>
                      </tr>
                      <tr>
                        <td className="font-bold">αñòαñ▓αñ╛</td>
                        <td className={getCellClass("1st")}>αÑ¬</td>
                        <td className={getCellClass("2nd")}>αÑ¬</td>
                        <td className={getCellClass("3rd")}>αÑ⌐</td>
                        <td className={getCellClass("4th")}>αÑ⌐</td>
                        <td className={getCellClass("5th")}>αÑ⌐</td>
                        <td className={getCellClass("6th")}>αÑ¬</td>
                        <td className={getCellClass("7th")}>αÑ¬</td>
                        <td className={getCellClass("8th")}>αÑ¬</td>
                      </tr>
                      <tr>
                        <td className="font-bold">αñòαñ╛αñ░αÑìαñ»αñ╛αñ¿αÑüαñ¡αñ╡</td>
                        <td className={getCellClass("1st")}>αÑ¬</td>
                        <td className={getCellClass("2nd")}>αÑ¬</td>
                        <td className={getCellClass("3rd")}>αÑ¬</td>
                        <td className={getCellClass("4th")}>αÑ¬</td>
                        <td className={getCellClass("5th")}>αÑ⌐</td>
                        <td className={getCellClass("6th")}>αÑ¿</td>
                        <td className={getCellClass("7th")}>αÑ¿</td>
                        <td className={getCellClass("8th")}>αÑ¿</td>
                      </tr>
                      <tr>
                        <td className="font-bold">αñ╢αñ╛.αñ╢αñ┐αñòαÑìαñ╖αñú</td>
                        <td className={getCellClass("1st")}>αÑ¬</td>
                        <td className={getCellClass("2nd")}>αÑ¬</td>
                        <td className={getCellClass("3rd")}>αÑ⌐</td>
                        <td className={getCellClass("4th")}>αÑ⌐</td>
                        <td className={getCellClass("5th")}>αÑ⌐</td>
                        <td className={getCellClass("6th")}>αÑ¬</td>
                        <td className={getCellClass("7th")}>αÑ¬</td>
                        <td className={getCellClass("8th")}>αÑ¬</td>
                      </tr>
                      <tr className="bg-slate-100 font-black">
                        <td>αñÅαñòαÑéαñú</td>
                        <td className={getCellClass("1st")}>αÑ¬αÑ«</td>
                        <td className={getCellClass("2nd")}>αÑ¬αÑ«</td>
                        <td className={getCellClass("3rd")}>αÑ¬αÑ«</td>
                        <td className={getCellClass("4th")}>αÑ¬αÑ«</td>
                        <td className={getCellClass("5th")}>αÑ¬αÑ«</td>
                        <td className={getCellClass("6th")}>αÑ¬αÑ«</td>
                        <td className={getCellClass("7th")}>αÑ¬αÑ«</td>
                        <td className={getCellClass("8th")}>αÑ¬αÑ«</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Table 3: αñàαñºαÑìαñ»αñ»αñ¿ αñ¿αñ┐αñ╖αÑìαñ¬αññαÑìαññαÑÇ αñ╕αñéαñûαÑìαñ»αñ╛ */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1 text-center">
                    αñàαñºαÑìαñ»αñ»αñ¿ αñ¿αñ┐αñ╖αÑìαñ¬αññαÑìαññαÑÇ αñ╕αñéαñûαÑìαñ»αñ╛ ( 1 αñ▓αÑÇ αññαÑç αÑ« αñ╡αÑÇ )
                  </h3>
                  <table>
                    <thead>
                      <tr>
                        <th>αñ╡αñ┐αñ╖αñ»</th>
                        <th className="text-center">αñ╡αñ┐αñ╖αñ» αñòαÑïαñí</th>
                        <th className="text-center">1 αñ▓αÑÇ</th>
                        <th className="text-center">αÑ¿ αñ░αÑÇ</th>
                        <th className="text-center">αÑ⌐ αñ░αÑÇ</th>
                        <th className="text-center">αÑ¬ αñÑαÑÇ</th>
                        <th className="text-center">αÑ½ αñ╡αÑÇ</th>
                        <th className="text-center">αÑ¼ αñ╡αÑÇ</th>
                        <th className="text-center">αÑ¡ αñ╡αÑÇ</th>
                        <th className="text-center">αÑ« αñ╡αÑÇ</th>
                        <th className="text-center">αñÅαñòαÑéαñú</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="font-bold">αñ«αñ░αñ╛αñáαÑÇ</td>
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
                        <td className="font-bold">αñ╣αñ┐αñéαñªαÑÇ</td>
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
                        <td className="font-bold">αñçαñéαñùαÑìαñ░αñ£αÑÇ</td>
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
                        <td className="font-bold">αñùαñúαñ┐αññ</td>
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
                        <td className="font-bold">αñ¬.αñàαñ¡αÑìαñ»αñ╛αñ╕ αñ¡αñ╛αñù αÑªαÑº</td>
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
                        <td className="font-bold">αñ¬.αñàαñ¡αÑìαñ»αñ╛αñ╕ αñ¡αñ╛αñù αÑªαÑ¿</td>
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
                        <td className="font-bold">αñ╡αñ┐αñ£αÑìαñ₧αñ╛αñ¿</td>
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
                        <td className="font-bold">αñçαññαñ┐αñ╣αñ╛αñ╕</td>
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
                        <td className="font-bold">αñ¿αñ╛.αñ╢αñ╛αñ╕αÑìαññαÑìαñ░</td>
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
                        <td className="font-bold">αñ¡αÑéαñùαÑïαñ▓</td>
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
                        <td className="font-bold text-left">αñÅαñòαÑéαñú</td>
                        <td></td>
                        <td className={getCellClass("1st")}>αÑ¬αÑ¼</td>
                        <td className={getCellClass("2nd")}>αÑ¬αÑ⌐</td>
                        <td className={getCellClass("3rd")}>αÑ½αÑ»</td>
                        <td className={getCellClass("4th")}>αÑ«αÑ½</td>
                        <td className={getCellClass("5th")}>αÑ«αÑ½</td>
                        <td className={getCellClass("6th")}>αÑºαÑ¡αÑº</td>
                        <td className={getCellClass("7th")}>αÑ¿αÑºαÑº</td>
                        <td className={getCellClass("8th")}>αÑºαÑ½αÑ¬</td>
                        <td className="font-bold text-[#D6B97A]">αÑ«αÑ½αÑ¬</td>
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
                        ? `αñ╡αñ╛αñ░αÑìαñ╖αñ┐αñò αñ¿αñ┐αñ»αÑïαñ£αñ¿ αñ╕αñ¿ - αÑ¿αÑªαÑ¿αÑ¼/αÑ¿αÑªαÑ¿αÑ¡ (αñçαñ»αññαÑìαññαñ╛ ΓÇô ${classNames[selectedClass]?.mr} | αñ╡αñ┐αñ╖αñ» ΓÇô ${subject})`
                        : `αñ╡αñ┐αñ╖αñ» (Subject) ΓÇö ${subject}`
                      }
                    </h3>
                    <table>
                      <thead>
                        <tr>
                          <th className="w-[100px] text-center">
                            {isClass1Mr ? "αñ«αñ╣αñ┐αñ¿αñ╛" : "αñ«αñ╣αñ┐αñ¿αñ╛ (Month)"}
                          </th>
                          <th className="w-[70px] text-center">
                            {isClass1Mr ? "αñòαñ╛αñ«αñ╛αñÜαÑç αñªαñ┐αñ╡αñ╕" : "αñòαñ╛αñ«αñ╛αñÜαÑç αñªαñ┐αñ╡αñ╕ (Days)"}
                          </th>
                          <th className="w-[70px] text-center">
                            {isClass1Mr ? "αñ¬αÑìαñ░αñ╛αñ¬αÑìαññ αññαñ╛αñ╕αñ┐αñòαñ╛" : "αñ¬αÑìαñ░αñ╛αñ¬αÑìαññ αññαñ╛αñ╕αñ┐αñòαñ╛ (Periods)"}
                          </th>
                          <th>
                            {isClass1Mr ? "αñÿαñƒαñò" : "αñÿαñƒαñò (Topics)"}
                          </th>
                          <th className="w-[70px] text-center">
                            {isClass1Mr ? "αñ¬αÑüαñ░αñ╛ /αñàαñ¬αÑüαñ░αñ╛" : "αñ¬αÑüαñ░αÑìαñú / αñàαñ¬αÑüαñ░αÑìαñú"}
                          </th>
                          <th className="w-[85px] text-center">
                            {isClass1Mr ? "αñ╢αñ┐αñòαÑìαñ╖αñò αñ╕αÑìαñ╡αñ╛αñòαÑìαñ╖αñ░αÑÇ" : "αñ╢αñ┐αñòαÑìαñ╖αñò αñ╕αÑìαñ╡αñ╛αñòαÑìαñ╖αñ░αÑÇ"}
                          </th>
                          <th className="w-[100px] text-center">
                            {isClass1Mr ? "αñ«αÑüαñûαÑìαñ»αñ╛αñºαÑìαñ»αñ╛αñ¬αñò αñ╕αÑìαñ╡αñ╛αñòαÑìαñ╖αñ░αÑÇ" : "αñ«αÑüαñûαÑìαñ»αñ╛αñºαÑìαñ»αñ╛αñ¬αñò αñ╕αÑìαñ╡αñ╛αñòαÑìαñ╖αñ░αÑÇ"}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {syllabus.months.map(m => {
                          const monthData = (syllabus.syllabusBySubject[subject]?.[m.en] || { topic: "ΓÇö", objectives: "ΓÇö", activity: "ΓÇö" }) as any;
                          const workingDays = isClass1Mr ? class1WorkingDays[m.en] : (monthData.workingDays || (m.en === "June" ? 13 : m.en === "September" ? 14 : m.en === "November" ? 17 : m.en === "April" ? 21 : m.en === "February" ? 22 : (m.en === "December" || m.en === "March") ? 24 : 25));
                          const defaultPeriods = subject.includes("αñ«αñ░αñ╛αñáαÑÇ") ? 60 : (subject.includes("Math") || subject.includes("αñùαñúαñ┐αññ") || subject.includes("Mathematics")) ? 50 : 30;
                          const periods = isClass1Mr ? (getPeriodsForMonth(subject, selectedClass, m.en) || 30) : (monthData.periods || defaultPeriods);

                          const extraRow = (m.en === "November" && isClass1Mr) ? (
                            <tr key="diwali-holiday">
                              <td colSpan={7} className="bg-slate-50 text-center font-bold text-slate-800 text-xs py-3">
                                αñ╕αñ░αñ╛αñ╡ αñ╡ αñ¬αÑìαñ░αñÑαñ« αñ╕αññαÑìαñ░ αñ╕αñéαñòαñ▓αñ┐αññ αñ«αÑéαñ▓αÑìαñ»αñ«αñ╛αñ¬αñ¿ ΓÇô αñªαñ┐αñ╡αñ╛αñ│αÑÇ αñ╕αÑüαñƒαÑìαñƒαÑÇ
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
                                  {m.mr} {isClass1Mr ? (m.en === "June" || m.en === "July" || m.en === "August" || m.en === "September" || m.en === "October" || m.en === "November" || m.en === "December" ? "αÑ¿αÑªαÑ¿αÑ¼" : "αÑ¿αÑªαÑ¿αÑ¡") : ""}
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
                            <td className="text-center">αñÅαñòαÑéαñú</td>
                            <td className="text-center">αÑ¿αÑ⌐αÑ¬</td>
                            <td className="text-center text-[#D6B97A]">
                              {getWeeklyPeriods(subject, selectedClass) * 38 || "ΓÇö"}
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
                                    αñªαÑêαñ¿αñ┐αñò αñƒαñ╛αñÜαñú / αñ¿αñ┐αñ»αÑïαñ£αñ¿
                                  </h2>
                                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                    αñ╡αñ┐αñ╖αñ» ΓÇô {subject} | αñ╡αñ░αÑìαñù ΓÇô {classNames[selectedClass]?.mr}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-bold text-slate-800 font-devanagari">
                                    αñ«αñ╣αñ┐αñ¿αñ╛: {m.mr} ΓÇô {actualYear}
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
                                      <th className="w-[45px] text-center">αñªαñ┐.</th>
                                      <th className="w-[35px] text-center">αñ╡αñ╛αñ░</th>
                                      <th className="w-[155px]">αñàαñºαÑìαñ»αñ»αñ¿ αñ«αÑüαñªαÑìαñªαñ╛ / αñ¬αñ╛αñáαÑìαñ»αñ╛αñéαñ╢</th>
                                      <th className="w-[175px]">αñàαñºαÑìαñ»αñ»αñ¿ αñàαñ¿αÑüαñ¡αñ╡ αñ╕αÑìαñ╡αñ░αÑéαñ¬</th>
                                      <th className="w-[90px]">αñ«αÑéαñ▓αÑìαñ»αñ«αñ╛αñ¬αñ¿αñ╛αñÜαÑÇ αñ╕αñ╛αñºαñ¿ αññαñéαññαÑìαñ░αÑç</th>
                                      <th className="w-[90px]">αñåαñ╡αñ╢αÑìαñ»αñò αñ╕αñ╛αñ╣αñ┐αññαÑìαñ»</th>
                                      <th className="w-[144px]">αñàαñºαÑìαñ»αñ»αñ¿ αñ¿αñ┐αñ╖αÑìαñ¬αññαÑìαññαÑÇ</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {dates.map((date) => {
                                      const plan = getDefaultDailyPlan(selectedClass, selectedMedium, subject, m.en, date.dateNum, date.dayMr);
                                      const isHoliday = !!plan.isHolidayText || date.isSunday;
                                      const holidayText = date.isSunday ? "αñ░αñ╡αñ┐αñ╡αñ╛αñ░ αñ╕αÑüαñƒαÑìαñƒαÑÇ" : plan.isHolidayText;

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

                                      const dateStr = `${date.dateNum < 10 ? "αÑª" : ""}${date.dateNum}/${m.en === "June" ? "αÑªαÑ¼" :
                                        m.en === "July" ? "αÑªαÑ¡" :
                                          m.en === "August" ? "αÑªαÑ«" :
                                            m.en === "September" ? "αÑªαÑ»" :
                                              m.en === "October" ? "αÑºαÑª" :
                                                m.en === "November" ? "αÑºαÑº" :
                                                  m.en === "December" ? "αÑºαÑ¿" :
                                                    m.en === "January" ? "αÑªαÑº" :
                                                      m.en === "February" ? "αÑªαÑ¿" :
                                                        m.en === "March" ? "αÑªαÑ⌐" :
                                                          m.en === "April" ? "αÑªαÑ¬" : "αÑªαÑ½"}`;

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
                                <div>αñ╡αñ░αÑìαñùαñ╢αñ┐αñòαÑìαñ╖αñò αñ╕αÑìαñ╡αñ╛αñòαÑìαñ╖αñ░αÑÇ</div>
                                <div>αñ«αÑüαñûαÑìαñ»αñ╛αñºαÑìαñ»αñ╛αñ¬αñò αñ╕αÑìαñ╡αñ╛αñòαÑìαñ╖αñ░αÑÇ</div>
                              </div>
                              <div className="pt-2 border-t border-amber-900 flex justify-between items-center text-[10px] text-slate-650 font-bold">
                                <span>ukguruji app αñ╣αÑç play store αñ╡αñ░αÑéαñ¿ αñíαñ╛αñèαñ¿αñ▓αÑïαñí αñòαñ░αñ╛.</span>
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
    { id: "class", label: "αñ╡αñ░αÑìαñù", en: "Class" },
    { id: "medium", label: "αñ«αñ╛αñºαÑìαñ»αñ«", en: "Medium" },
    { id: "planType", label: "αñ¬αÑìαñ░αñòαñ╛αñ░", en: "Plan Type" },
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
                  className={`size-10 rounded-full flex items-center justify-center text-xs font-black transition-all ${isActive
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
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Select Class / αñçαñ»αññαÑìαññαñ╛ αñ¿αñ┐αñ╡αñíαñ╛</h2>
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
                    className={`group p-8 rounded-[2.5rem] border text-center transition-all duration-500 shadow-md hover:shadow-[0_20px_45px_rgba(139,92,246,0.3)] cursor-pointer relative overflow-hidden flex flex-col items-center gap-4 ${isSelected
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
                      <h4 className="font-black text-lg text-white">αñçαñ»αññαÑìαññαñ╛ {classNames[cls]?.mr}</h4>
                      <p className="text-[10px] text-violet-100/70 font-black uppercase tracking-widest mt-1">
                        {classNames[cls]?.en}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-violet-200 mt-2 opacity-80 group-hover:opacity-100 transition-opacity">
                      αñ¬αÑìαñ░αñ╡αÑçαñ╢ αñòαñ░αñ╛ <span className="transform group-hover:translate-x-1 transition-transform">ΓåÆ</span>
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
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Select Medium / αñ«αñ╛αñºαÑìαñ»αñ« αñ¿αñ┐αñ╡αñíαñ╛</h2>
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
                    className={`group p-10 rounded-[3rem] border text-left transition-all duration-500 shadow-md hover:shadow-[0_20px_45px_rgba(139,92,246,0.3)] cursor-pointer relative overflow-hidden flex items-start gap-6 ${isSelected
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
                <ChevronLeft className="size-4" /> αñ«αñ╛αñùαÑç αñ£αñ╛ / Back
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
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Select Type / αñ¬αÑìαñ░αñòαñ╛αñ░ αñ¿αñ┐αñ╡αñíαñ╛</h2>
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                Class: {selectedClass ? `${classNames[selectedClass as string]?.mr}` : ""} | Medium: {selectedMedium}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="size-7 rounded-full bg-[#8b5cf6] text-white flex items-center justify-center font-black text-xs">3</div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800">
                PLANNING FILES / αñ¿αñ┐αñ»αÑïαñ£αñ¿ αñ½αñ╛αñçαñ▓αÑìαñ╕
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
                    <p className="text-[11px] text-violet-100/70 font-semibold mt-1">αñ╡αñ╛αñ░αÑìαñ╖αñ┐αñò αñ¿αñ┐αñ»αÑïαñ£αñ¿ | αñçαñ»αññαÑìαññαñ╛ {classNames[selectedClass as string]?.mr}</p>
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
                    <p className="text-[11px] text-violet-100/70 font-semibold mt-1">αñ«αñ╛αñ╕αñ┐αñò αñ¿αñ┐αñ»αÑïαñ£αñ¿ | αñçαñ»αññαÑìαññαñ╛ {classNames[selectedClass as string]?.mr}</p>
                  </div>
                </div>

                <div className="mt-6 relative z-10">
                  <button
                    type="button"
                    onClick={() => setStep("selectMonth")}
                    className="w-full py-3 px-4 bg-white text-indigo-900 rounded-2xl text-[10px] font-black uppercase tracking-wider hover:bg-violet-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Calendar className="size-3.5" />
                    Select Month / αñ«αñ╣αñ┐αñ¿αñ╛ αñ¿αñ┐αñ╡αñíαñ╛
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
                    <p className="text-[11px] text-violet-100/70 font-semibold mt-1">αñ¬αÑìαñ░αñ╢αÑìαñ¿αñ¬αÑçαñóαÑÇ | αñçαñ»αññαÑìαññαñ╛ {classNames[selectedClass as string]?.mr}</p>
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
                <ChevronLeft className="size-4" /> αñ«αñ╛αñùαÑç αñ£αñ╛ / Back
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
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Select Month / αñ«αñ╣αñ┐αñ¿αñ╛ αñ¿αñ┐αñ╡αñíαñ╛</h2>
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
                <ChevronLeft className="size-4" /> αñ«αñ╛αñùαÑç αñ£αñ╛ / Back
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
            className="bg-white border border-slate-200 rounded-[3rem] max-w-full w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl text-slate-800 font-sans"
          >
            {/* Modal Controls header */}
            <div className="flex items-center justify-between p-6 md:p-8 border-b border-slate-200 bg-white/85 sticky top-0 backdrop-blur z-10">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-[#D6B97A]/20 flex items-center justify-center text-[#D6B97A]">
                  <Eye className="size-4" />
                </div>
                <div>
                  <h3 className="font-black text-base text-[#D6B97A]">
                    {viewingPlan === "annual" ? "Annual Planning Preview (αñ╡αñ╛αñ░αÑìαñ╖αñ┐αñò αñ¿αñ┐αñ»αÑïαñ£αñ¿)" : "Monthly Planning Preview (αñ«αñ╛αñ╕αñ┐αñò αñ¿αñ┐αñ»αÑïαñ£αñ¿)"}
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
                  Γ£ò
                </button>
              </div>
            </div>

            {/* Config panel / Dynamic Editor inputs */}
            <div className="bg-slate-50 p-6 md:p-8 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">School Name / αñ╢αñ╛αñ│αÑçαñÜαÑç αñ¿αñ╛αñ╡</label>
                <input
                  type="text"
                  value={safeData.schoolName}
                  onChange={(e) => handleDataChange("schoolName", e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-[#D6B97A] outline-none"
                  placeholder="Enter School Name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Academic Year / αñ╢αÑêαñòαÑìαñ╖αñúαñ┐αñò αñ╡αñ░αÑìαñ╖</label>
                <input
                  type="text"
                  value={safeData.academicYear}
                  onChange={(e) => handleDataChange("academicYear", e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-[#D6B97A] outline-none"
                  placeholder="Enter Year"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Class Teacher / αñ╡αñ░αÑìαñùαñ╢αñ┐αñòαÑìαñ╖αñò</label>
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
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedMedium, setSelectedMedium] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [pageData, setPageData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Viewer utilities
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const viewerRef = useRef<HTMLDivElement>(null);

  // Listen to fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Sync date selection
  useEffect(() => {
    if (selectedClass && selectedMedium && selectedDate) {
      fetchDiaryPage(selectedClass, selectedMedium, selectedDate);
    }
  }, [selectedClass, selectedMedium, selectedDate]);

  // Automatically select standard start date of standard uploaded diary when standard standard class and medium are selected
  useEffect(() => {
    if (selectedClass && selectedMedium) {
      const fetchEarliestDate = async () => {
        try {
          const { collection, getDocs } = await import("firebase/firestore");
          const collectionRef = collection(db, "teacher_diaries", selectedClass, selectedMedium);
          const snapshot = await getDocs(collectionRef);
          if (!snapshot.empty) {
            const docIds = snapshot.docs.map((doc) => doc.id);
            docIds.sort(); // ascending, earliest date first
            const earliestDateStr = docIds[0];
            const parts = earliestDateStr.split("-");
            if (parts.length === 3) {
              const year = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1;
              const day = parseInt(parts[2], 10);
              setSelectedDate(new Date(year, month, day));
            }
          }
        } catch (err) {
          console.error("Error fetching earliest diary date:", err);
        }
      };
      fetchEarliestDate();
    }
  }, [selectedClass, selectedMedium]);

  const fetchDiaryPage = async (cls: string, med: string, date: Date) => {
    setLoading(true);
    setError(null);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      // Since doc/getDoc are imported at the top, we can use them directly
      const docRef = doc(db, "teacher_diaries", cls, med, dateStr);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setPageData(docSnap.data());
      } else {
        setPageData(null);
      }
    } catch (err: any) {
      console.error("Error loading diary page:", err);
      setError("Failed to load page details.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.2, 2.5));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.2, 0.6));
  };

  const handleToggleFullscreen = () => {
    if (!viewerRef.current) return;
    if (!isFullscreen) {
      viewerRef.current.requestFullscreen().catch((err: any) => {
        toast.error("Could not activate full screen mode.");
        console.error(err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleDownload = () => {
    if (pageData?.pageUrl) {
      const link = document.createElement("a");
      link.href = pageData.pageUrl;
      link.download = `Diary_${selectedClass}_${selectedMedium}_${format(selectedDate, "yyyy-MM-dd")}.pdf`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      toast.error("No file available for download.");
    }
  };

  const classes = [
    { id: "Class 1", badge: "1ST", mr: "αñçαñ»αññαÑìαññαñ╛ αñ¬αñ╣αñ┐αñ▓αÑÇ", color: "from-blue-500 to-indigo-600" },
    { id: "Class 2", badge: "2ND", mr: "αñçαñ»αññαÑìαññαñ╛ αñªαÑüαñ╕αñ░αÑÇ", color: "from-purple-500 to-indigo-600" },
    { id: "Class 3", badge: "3RD", mr: "αñçαñ»αññαÑìαññαñ╛ αññαñ┐αñ╕αñ░αÑÇ", color: "from-pink-500 to-rose-600" },
    { id: "Class 4", badge: "4TH", mr: "αñçαñ»αññαÑìαññαñ╛ αñÜαÑîαñÑαÑÇ", color: "from-amber-500 to-orange-600" },
    { id: "Class 5", badge: "5TH", mr: "αñçαñ»αññαÑìαññαñ╛ αñ¬αñ╛αñÜαñ╡αÑÇ", color: "from-emerald-500 to-teal-600" },
    { id: "Class 6", badge: "6TH", mr: "αñçαñ»αññαÑìαññαñ╛ αñ╕αñ╣αñ╛αñ╡αÑÇ", color: "from-cyan-500 to-blue-600" },
    { id: "Class 7", badge: "7TH", mr: "αñçαñ»αññαÑìαññαñ╛ αñ╕αñ╛αññαñ╡αÑÇ", color: "from-indigo-500 to-violet-600" },
    { id: "Class 8", badge: "8TH", mr: "αñçαñ»αññαÑìαññαñ╛ αñåαñáαñ╡αÑÇ", color: "from-slate-600 to-slate-800" },
  ];

  const mediums = [
    { id: "Marathi", badge: "M", title: "MARATHI", mr: "αñ«αñ░αñ╛αñáαÑÇ αñ«αñ╛αñºαÑìαñ»αñ«" },
    { id: "Semi English", badge: "S", title: "SEMI ENGLISH", mr: "αñ╕αÑçαñ«αÑÇ αñçαñéαñùαÑìαñ░αñ£αÑÇ" },
  ];

  return (
    <div className="space-y-6 font-sans">
      <AnimatePresence mode="wait">
        {/* Step 1: Select Class */}
        {!selectedClass && (
          <motion.div
            key="class-select"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="text-center space-y-1">
              <h3 className="text-2xl font-black text-slate-800">Select Class / αñ╡αñ░αÑìαñù αñ¿αñ┐αñ╡αñíαñ╛</h3>
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Step 1: Standard Selection</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto w-full">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => {
                    setSelectedClass(cls.id);
                    setSelectedMedium(null);
                  }}
                  className={`group p-6 rounded-2xl border text-center transition-all shadow-sm hover:shadow-md bg-gradient-to-br ${cls.color} text-white border-black/5 cursor-pointer relative overflow-hidden flex flex-col items-center gap-3`}
                >
                  <div className="size-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 backdrop-blur-sm text-white font-black text-xs">
                    {cls.badge}
                  </div>
                  <div>
                    <h4 className="text-base font-black leading-tight">{cls.mr}</h4>
                    <p className="text-[9px] text-slate-100/70 font-bold uppercase tracking-wider">{cls.id}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 2: Select Medium */}
        {selectedClass && !selectedMedium && (
          <motion.div
            key="medium-select"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="text-center space-y-1">
              <h3 className="text-2xl font-black text-slate-800">Select Medium / αñ«αñ╛αñºαÑìαñ»αñ« αñ¿αñ┐αñ╡αñíαñ╛</h3>
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Class Selected: {selectedClass}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto w-full">
              {mediums.map((med) => (
                <button
                  key={med.id}
                  onClick={() => setSelectedMedium(med.id)}
                  className="group p-8 rounded-2xl border text-left transition-all shadow-sm hover:shadow-md cursor-pointer relative overflow-hidden flex items-start gap-4 bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-indigo-500/30"
                >
                  <div className="size-10 rounded-full flex items-center justify-center border border-white/20 bg-white/10 backdrop-blur-sm text-white font-black text-sm shrink-0">
                    {med.badge}
                  </div>
                  <div>
                    <h4 className="font-black text-lg text-white">{med.mr}</h4>
                    <p className="text-[9px] font-black uppercase tracking-wider text-indigo-200">{med.title} Medium</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => setSelectedClass(null)}
                className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-900 text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                <ArrowLeft className="size-3.5" /> Back to Classes
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Viewer */}
        {selectedClass && selectedMedium && (
          <motion.div
            key="viewer-panel"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-4"
          >
            {/* Viewer Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/60 rounded-2xl p-3.5 shadow-sm">
              <button
                onClick={() => {
                  setSelectedMedium(null);
                  setPageData(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 font-bold text-[10px] uppercase tracking-wider cursor-pointer"
              >
                <ArrowLeft className="size-3.5" /> Back
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {/* Calendar popover */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 hover:border-indigo-600 rounded-lg text-slate-700 font-bold text-[10px] uppercase tracking-wider bg-white cursor-pointer">
                      <Calendar className="size-3.5 text-indigo-600" />
                      <span>{format(selectedDate, "dd/MM/yyyy")}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <div className="h-4 w-px bg-slate-200" />

                {/* Date navigation */}
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={handlePrevDay}
                    className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-md text-slate-600"
                    title="Previous Day"
                  >
                    <ChevronLeft className="size-3.5" />
                  </button>
                  <button
                    onClick={handleNextDay}
                    className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-md text-slate-600"
                    title="Next Day"
                  >
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>

                <div className="h-4 w-px bg-slate-200" />

                {/* Zoom */}
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={handleZoomOut}
                    className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-md text-slate-600"
                    title="Zoom Out"
                  >
                    <ZoomOut className="size-3.5" />
                  </button>
                  <span className="text-[9px] font-black text-slate-400 w-8 text-center select-none">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-md text-slate-600"
                    title="Zoom In"
                  >
                    <ZoomIn className="size-3.5" />
                  </button>
                </div>

                <div className="h-4 w-px bg-slate-200" />

                {/* Fullscreen and Download */}
                <button
                  onClick={handleToggleFullscreen}
                  className={`p-1.5 border rounded-md ${
                    isFullscreen ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}
                  title="Fullscreen"
                >
                  <Maximize2 className="size-3.5" />
                </button>

                <button
                  onClick={handleDownload}
                  disabled={!pageData?.pageUrl}
                  className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-md text-slate-600 disabled:opacity-55"
                  title="Download Page"
                >
                  <Download className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Preview Frame */}
            <div
              ref={viewerRef}
              className={`bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center overflow-auto min-h-[500px] relative ${
                isFullscreen ? "fixed inset-0 z-50 p-6 h-screen w-screen bg-slate-900 border-none rounded-none" : ""
              }`}
            >
              {loading ? (
                <div className="flex flex-col items-center gap-2.5 text-slate-400">
                  <Loader2 className="size-8 animate-spin text-indigo-600" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Syncing page...</span>
                </div>
              ) : pageData?.pageUrl ? (
                <div
                  className="rounded-lg overflow-hidden shadow bg-white border border-slate-100 flex items-center justify-center"
                  style={{
                    width: `${950 * zoomLevel}px`,
                    height: `${600 * zoomLevel}px`,
                    maxWidth: "100%",
                  }}
                >
                  <iframe
                    src={`${pageData.pageUrl}#view=FitH`}
                    title={`Page ${pageData.pageNumber}`}
                    className="w-full h-full border-none"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center text-center p-8 space-y-3 max-w-sm">
                  <div className="size-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <FileText className="size-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800 font-sans">No Page Found</h4>
                    <p className="text-[11px] text-slate-400">
                      No diary page uploaded for <strong className="text-slate-600">{format(selectedDate, "dd/MM/yyyy")}</strong>.
                    </p>
                  </div>
                </div>
              )}

              {isFullscreen && (
                <div className="absolute top-4 left-4 bg-black/60 px-3 py-1.5 rounded-lg text-white text-[10px] font-bold">
                  {selectedClass} ΓÇö {selectedMedium} ΓÇö {format(selectedDate, "dd/MM/yyyy")}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
