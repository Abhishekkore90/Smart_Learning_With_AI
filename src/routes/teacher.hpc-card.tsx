import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { Users, ClipboardCheck, User, ArrowLeft, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
// @ts-ignore
import { matchStudentClassAndMedium } from "@/result/firestoreMarksHelper";
import { CCEStudentList } from "@/components/teacher/CCEStudentList";
import { CCEAttendance } from "@/components/teacher/CCEAttendance";
import { CCEStudentInfo } from "@/components/teacher/CCEStudentInfo";

export const Route = createFileRoute("/teacher/hpc-card")({
  component: TeacherHpcCardPage,
});

const getCurrentAcademicYear = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
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

function TeacherHpcCardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"dashboard" | "student-list" | "attendance" | "student-info">("dashboard");

  const [selectedClass, setSelectedClass] = useState(() => {
    return localStorage.getItem("cce_selected_class") || "1st";
  });
  const [academicYear, setAcademicYear] = useState(() => {
    return localStorage.getItem("cce_academic_year") || getCurrentAcademicYear();
  });
  const [selectedMedium, setSelectedMedium] = useState(() => {
    return localStorage.getItem("cce_selected_medium") || "marathi";
  });
  const [studentsCount, setStudentsCount] = useState(0);

  useEffect(() => {
    localStorage.setItem("cce_selected_class", selectedClass);
  }, [selectedClass]);

  useEffect(() => {
    localStorage.setItem("cce_academic_year", academicYear);
  }, [academicYear]);

  useEffect(() => {
    localStorage.setItem("cce_selected_medium", selectedMedium);
  }, [selectedMedium]);

  // Real-time student count sync for selected class AND medium
  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("role", "==", "student")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const raw = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const filtered = raw.filter((s: any) => {
        return matchStudentClassAndMedium(s, selectedClass, selectedMedium);
      });
      setStudentsCount(filtered.length);
    });
    return () => unsubscribe();
  }, [selectedClass, selectedMedium]);

  // Real-time listener for school_settings/general & local storage updates
  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, "school_settings", "general"), (snap) => {
      if (snap.exists() && snap.data().medium) {
        const isSemi = String(snap.data().medium).toLowerCase().includes("semi");
        const m = isSemi ? "semi" : "marathi";
        setSelectedMedium(m);
        localStorage.setItem("cce_selected_medium", m);
      }
    });

    const handleCustomEvent = () => {
      const stored = localStorage.getItem("cce_selected_medium");
      if (stored) setSelectedMedium(stored);
    };

    window.addEventListener("cce_settings_updated", handleCustomEvent);
    window.addEventListener("storage", handleCustomEvent);

    return () => {
      unsubSettings();
      window.removeEventListener("cce_settings_updated", handleCustomEvent);
      window.removeEventListener("storage", handleCustomEvent);
    };
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (sessionStorage.getItem("is_super_admin")) return;
      if (!user || profile?.role !== "teacher") {
        navigate({
          to: "/login",
          search: { redirect: "/teacher/hpc-card", role: "teacher" } as any,
        });
      }
    }
  }, [user, profile, authLoading, navigate]);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-64 pt-16 min-h-screen">
        <div className="p-6 md:p-10 space-y-8 max-w-[1600px] mx-auto">
          {activeTab !== "dashboard" && (
            <div className="mb-6">
              <button
                onClick={() => setActiveTab("dashboard")}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-50 hover:bg-[#1E432D] hover:text-white text-blue-800 border border-blue-200 rounded-2xl text-sm font-bold tracking-wide transition-all shadow-sm cursor-pointer"
              >
                ← मुख्यपृष्ठ (HPC Dashboard)
              </button>
            </div>
          )}

          {activeTab === "dashboard" && (
            <div className="w-full max-w-[1250px] mx-auto bg-gradient-to-b from-white via-slate-50/50 to-white text-slate-800 rounded-[2.5rem] p-6 md:p-10 font-sans shadow-2xl border border-slate-200/80 relative overflow-hidden">
              {/* Background Ambient Decorative Elements */}
              <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-indigo-400/10 via-purple-400/5 to-transparent rounded-bl-full pointer-events-none blur-xl" />
              <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-gradient-to-tr from-blue-400/10 via-cyan-400/5 to-transparent rounded-full pointer-events-none blur-xl" />

              {/* Top Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200/80 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-3.5 rounded-2xl text-white font-black text-base flex items-center justify-center shadow-lg shadow-purple-500/20 ring-4 ring-purple-50">
                    <Sparkles className="size-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Holistic Progress Card (HPC)</h1>
                      <span className="bg-indigo-100 text-indigo-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-indigo-200">
                        {studentsCount} विद्यार्थी
                      </span>
                    </div>
                    <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mt-0.5">समग्र व सर्वंकष मूल्यमापन नोंदवही</p>
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

                  {/* Medium Indicator (Configured from School Info Settings) */}
                  <div className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20 rounded-2xl px-4 py-2 ring-2 ring-purple-100/50">
                    <span className="text-xs font-bold text-purple-200 uppercase tracking-wider">माध्यम:</span>
                    <span className="text-xs font-black text-white">
                      {selectedMedium === "semi" ? "सेमी इंग्रजी (Semi-English)" : "मराठी माध्यम (Marathi)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dashboard Grid - 3 Core Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                {/* 1. विद्यार्थी (0) */}
                <button
                  onClick={() => setActiveTab("student-list")}
                  className="bg-white/95 hover:bg-white border-2 border-slate-100 hover:border-blue-400/90 rounded-[2.2rem] p-5 flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1.5 active:scale-[0.98] group text-left relative overflow-hidden cursor-pointer"
                >
                  <div className="absolute -top-10 -right-10 size-28 rounded-full bg-gradient-to-br from-blue-500/10 to-indigo-500/5 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="size-13 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/35 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 flex-shrink-0">
                      <Users className="size-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800 group-hover:text-blue-600 transition-colors tracking-tight">
                        विद्यार्थी ({studentsCount})
                      </h3>
                      <p className="text-xs text-slate-500 font-medium leading-snug mt-0.5">विद्यार्थ्यांची यादी व प्रगती</p>
                    </div>
                  </div>
                  <div className="size-8 rounded-xl bg-slate-100/90 group-hover:bg-blue-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-all duration-300 flex-shrink-0 shadow-sm group-hover:shadow-md group-hover:translate-x-0.5 relative z-10">
                    <span className="font-extrabold text-xs">➔</span>
                  </div>
                </button>

                {/* 2. उपस्थिती */}
                <button
                  onClick={() => setActiveTab("attendance")}
                  className="bg-white/95 hover:bg-white border-2 border-slate-100 hover:border-emerald-400/90 rounded-[2.2rem] p-5 flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1.5 active:scale-[0.98] group text-left relative overflow-hidden cursor-pointer"
                >
                  <div className="absolute -top-10 -right-10 size-28 rounded-full bg-gradient-to-br from-emerald-500/10 to-teal-500/5 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="size-13 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/35 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 flex-shrink-0">
                      <ClipboardCheck className="size-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800 group-hover:text-emerald-600 transition-colors tracking-tight">
                        उपस्थिती
                      </h3>
                      <p className="text-xs text-slate-500 font-medium leading-snug mt-0.5">दैनंदिन व मासिक हजेरी</p>
                    </div>
                  </div>
                  <div className="size-8 rounded-xl bg-slate-100/90 group-hover:bg-emerald-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-all duration-300 flex-shrink-0 shadow-sm group-hover:shadow-md group-hover:translate-x-0.5 relative z-10">
                    <span className="font-extrabold text-xs">➔</span>
                  </div>
                </button>

                {/* 3. विद्यार्थ्याची माहिती */}
                <button
                  onClick={() => setActiveTab("student-info")}
                  className="bg-white/95 hover:bg-white border-2 border-slate-100 hover:border-purple-400/90 rounded-[2.2rem] p-5 flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1.5 active:scale-[0.98] group text-left relative overflow-hidden cursor-pointer"
                >
                  <div className="absolute -top-10 -right-10 size-28 rounded-full bg-gradient-to-br from-purple-500/10 to-indigo-500/5 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="size-13 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/35 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 flex-shrink-0">
                      <User className="size-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800 group-hover:text-purple-600 transition-colors tracking-tight">
                        विद्यार्थ्याची माहिती
                      </h3>
                      <p className="text-xs text-slate-500 font-medium leading-snug mt-0.5">प्रोफाईल व वैयक्तिक तपशील</p>
                    </div>
                  </div>
                  <div className="size-8 rounded-xl bg-slate-100/90 group-hover:bg-purple-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-all duration-300 flex-shrink-0 shadow-sm group-hover:shadow-md group-hover:translate-x-0.5 relative z-10">
                    <span className="font-extrabold text-xs">➔</span>
                  </div>
                </button>
              </div>

              {/* Tip / Notice Banner */}
              <div className="mt-8 p-4 md:p-5 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex items-center gap-3.5 shadow-sm text-amber-900 relative z-10">
                <div className="size-9 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center font-black flex-shrink-0 text-sm">
                  💡
                </div>
                <div>
                  <p className="text-xs md:text-sm font-extrabold text-amber-900 leading-snug">
                    टीप: हा विभाग अजून पूर्ण झालेला नाही, हा विभाग तुम्हाला लवकरात लवकर उपलब्ध करून देण्यात येईल.
                  </p>
                  <p className="text-[11px] font-bold text-amber-700 mt-0.5">
                    Note: This section is currently under development and will be fully available very soon.
                  </p>
                </div>
              </div>

              {/* Bottom Return Button */}
              <div className="mt-8 pt-5 border-t border-slate-200/80 flex items-center justify-center">
                <button
                  onClick={() => navigate({ to: "/teacher" })}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white font-extrabold text-xs px-6 py-2.5 rounded-full transition-all shadow-sm cursor-pointer group"
                >
                  <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
                  <span>मुख्य शिक्षक डॅशबोर्ड (Back to Teacher Home)</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === "student-list" && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
              <CCEStudentList
                selectedClass={selectedClass}
                academicYear={academicYear}
                onBack={() => setActiveTab("dashboard")}
              />
            </motion.div>
          )}

          {activeTab === "attendance" && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
              <CCEAttendance
                selectedClass={selectedClass}
                academicYear={academicYear}
                onBack={() => setActiveTab("dashboard")}
              />
            </motion.div>
          )}

          {activeTab === "student-info" && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
              <CCEStudentInfo
                selectedClass={selectedClass}
                onBack={() => setActiveTab("dashboard")}
              />
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
