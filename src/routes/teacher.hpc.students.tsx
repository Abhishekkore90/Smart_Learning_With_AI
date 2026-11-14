import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  User,
  Search,
  Filter,
  CheckCircle2,
  Edit,
  Eye,
  Plus,
  ArrowLeft,
  Sparkles,
  Smile,
  BookOpen,
  Calendar,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { HpcStageId } from "@/hpc/types/hpc";
import { HPC_STAGES_INFO } from "@/hpc/data/hpcCurricularGoals";
import {
  getHpcStudents,
  StudentInfoSummary,
  getHpcStudentProfile,
} from "@/hpc/services/hpcService";
import {
  getCurrentAcademicYear,
  getAcademicYearOptions,
  getInitialAcademicYear,
} from "@/hpc/utils/academicYear";

export const Route = createFileRoute("/teacher/hpc/students")({
  head: () => ({
    meta: [{ title: "विद्यार्थी नोंदी (भाग अ) — HPC समग्र प्रगतिपत्रक" }],
  }),
  component: TeacherHpcStudentsPage,
});

const CLASSES_LIST = [
  { id: "1st", label: "इयत्ता १ ली", stageId: "foundational" },
  { id: "2nd", label: "इयत्ता २ री", stageId: "foundational" },
  { id: "3rd", label: "इयत्ता ३ री", stageId: "preparatory" },
  { id: "4th", label: "इयत्ता ४ थी", stageId: "preparatory" },
  { id: "5th", label: "इयत्ता ५ वी", stageId: "preparatory" },
  { id: "6th", label: "इयत्ता ६ वी", stageId: "middle" },
  { id: "7th", label: "इयत्ता ७ वी", stageId: "middle" },
  { id: "8th", label: "इयत्ता ८ वी", stageId: "middle" },
];

function TeacherHpcStudentsPage() {
  const navigate = useNavigate();

  const academicYearOptions = useMemo(() => getAcademicYearOptions(), []);
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    return localStorage.getItem("cce_selected_class") || "1st";
  });
  const [academicYear, setAcademicYear] = useState<string>(() => getInitialAcademicYear());
  const [selectedMedium, setSelectedMedium] = useState<string>(() => {
    return localStorage.getItem("cce_selected_medium") || "marathi";
  });

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentInfoSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("all");

  const stageId: HpcStageId = useMemo(() => {
    const match = CLASSES_LIST.find((c) => c.id === selectedClass);
    return (match?.stageId as HpcStageId) || "foundational";
  }, [selectedClass]);

  const stageInfo = HPC_STAGES_INFO.find((s) => s.id === stageId) || HPC_STAGES_INFO[0];

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        const list = await getHpcStudents(selectedClass, selectedMedium);
        if (isMounted) setStudents(list);
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [selectedClass, selectedMedium]);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (selectedDivision !== "all" && s.division !== selectedDivision) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return s.name.toLowerCase().includes(q) || (s.rollNo && s.rollNo.includes(q));
      }
      return true;
    });
  }, [students, selectedDivision, searchQuery]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Back Action Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link
          to="/teacher/hpc"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-900 hover:text-white text-slate-800 border border-slate-200 hover:border-slate-900 rounded-2xl text-xs sm:text-sm font-black transition-all shadow-xs cursor-pointer group"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
          <span>मुख्य HPC डॅशबोर्डवर परत जा (Back to HPC Dashboard)</span>
        </Link>
        <Link
          to="/teacher"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
        >
          <ArrowLeft className="size-3.5" />
          <span>मुख्य शिक्षक पॅनल</span>
        </Link>
      </div>

      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
              {stageInfo.titleMarathi} ({stageInfo.partLabelMarathi})
            </span>
            <span className="text-xs font-bold text-slate-500">
              भाग अ: विद्यार्थी वैयक्तिक माहिती व परिसर
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            विद्यार्थी नोंदी व वैयक्तिक विकास (Part A)
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            मी व माझा परिसर, आवडीनिवडी, छंद, घरातील कामे व विद्यार्थी स्वतःच्या प्रगतीविषयी नोंदी
          </p>
        </div>

        {/* Class Filter Dropdown */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Academic Year Selector */}
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-500">वर्ष:</span>
            <select
              value={academicYear}
              onChange={(e) => {
                setAcademicYear(e.target.value);
                localStorage.setItem("cce_academic_year", e.target.value);
              }}
              className="bg-transparent text-xs font-black text-slate-900 outline-none cursor-pointer"
            >
              {academicYearOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-500">इयत्ता:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-900 outline-none cursor-pointer"
            >
              {CLASSES_LIST.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-500">तुकडी:</span>
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-900 outline-none cursor-pointer"
            >
              <option value="all">सर्व</option>
              <option value="अ">तुकडी अ</option>
              <option value="ब">तुकडी ब</option>
              <option value="क">तुकडी क</option>
              <option value="ड">तुकडी ड</option>
            </select>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="size-4 text-slate-400 absolute left-4 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="विद्यार्थ्याचे नाव किंवा हजेरी क्रमांकाने शोधा..."
          className="w-full pl-11 pr-4 py-3 text-xs font-bold rounded-2xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white shadow-xs"
        />
      </div>

      {/* Students Grid */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200">
          <Loader2 className="size-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-600">विद्यार्थी यादी लोड होत आहे...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
          <Users className="size-12 text-slate-300 mx-auto" />
          <p className="text-base font-bold text-slate-700">विद्यार्थी सापडले नाहीत</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="size-13 rounded-2xl bg-indigo-50 font-black text-indigo-700 flex items-center justify-center flex-shrink-0 border border-indigo-100 overflow-hidden">
                  {s.photoUrl ? (
                    <img src={s.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    s.name.charAt(0)
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      हजेरी क्र: {s.rollNo}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      तुकडी: {s.division || "अ"}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900 mt-1 line-clamp-1">
                    {s.fullName || s.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    सरल आयडी: {s.saralId || "-"}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <Link
                  to="/teacher/hpc/student/$studentId"
                  params={{ studentId: s.id }}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black transition-all text-center shadow-xs flex items-center justify-center gap-1.5"
                >
                  <User className="size-3.5" />
                  <span>भाग अ: विद्यार्थी प्रोफाईल (A1 व A2)</span>
                </Link>

                <Link
                  to="/teacher/hpc/assessment/$studentId"
                  params={{ studentId: s.id }}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  title="मूल्यांकन (Part B)"
                >
                  <BookOpen className="size-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
