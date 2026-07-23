import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  BookOpen,
  GraduationCap,
  ChevronLeft,
  Search,
  Plus,
  Save,
  UserCheck,
  Star,
  Target,
  Zap,
  Languages,
  Beaker,
  Calculator,
} from "lucide-react";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { useState, useMemo, useEffect } from "react";
import { showToast as toast } from "@/lib/custom-toast";

export const Route = createFileRoute("/teacher/concept-mapping")({
  component: ConceptMappingPage,
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
    color: "text-pink-500",
    bg: "bg-pink-50",
  },
  {
    id: "hindi",
    name: "Hindi",
    icon: Languages,
    color: "text-orange-500",
    bg: "bg-orange-50",
  },
  {
    id: "english",
    name: "English",
    icon: BookOpen,
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  {
    id: "maths",
    name: "Maths",
    icon: Calculator,
    color: "text-violet-500",
    bg: "bg-violet-50",
  },
  {
    id: "science",
    name: "Science",
    icon: Beaker,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
  },
];

const DUMMY_STUDENTS = [
  { id: "s1", name: "Rahul Deshmukh", rollNo: 1 },
  { id: "s2", name: "Ananya Patil", rollNo: 2 },
  { id: "s3", name: "Sahil Kulkarni", rollNo: 3 },
  { id: "s4", name: "Priya Shinde", rollNo: 4 },
  { id: "s5", name: "Aryan More", rollNo: 5 },
];

function ConceptMappingPage() {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Data State: { studentId: { subjectId: conceptText } }
  const [conceptData, setConceptData] = useState<
    Record<string, Record<string, string>>
  >({});

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("school_concepts_v1");
    if (saved) {
      setConceptData(JSON.parse(saved));
    }
  }, []);

  const handleSaveConcept = (
    studentId: string,
    subjectId: string,
    value: string,
  ) => {
    const updated = {
      ...conceptData,
      [studentId]: {
        ...(conceptData[studentId] || {}),
        [subjectId]: value,
      },
    };
    setConceptData(updated);
    localStorage.setItem("school_concepts_v1", JSON.stringify(updated));
  };

  const filteredStudents = useMemo(() => {
    return DUMMY_STUDENTS.filter((s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-white">
      <TeacherHeader />
      <TeacherSidebar />

      <main className="lg:pl-64 pt-20 min-h-screen bg-slate-50/30">
        <div className="p-4 md:p-8 space-y-6 max-w-[1400px] mx-auto">
          <AnimatePresence mode="wait">
            {!selectedClass ? (
              /* VIEW 1: CLASS SELECTION */
              <motion.div
                key="class-selection"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-2 pt-10">
                  <h1 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase">
                    Concept Mastery
                  </h1>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                    Select a class to manage student-wise subject concepts
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  {CLASSES.map((cls) => (
                    <button
                      key={cls}
                      onClick={() => setSelectedClass(cls)}
                      className="group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:scale-105 transition-all flex flex-col items-center gap-4 relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-full h-1 bg-[#6FA0D8] opacity-0 group-hover:opacity-100 transition-all" />
                      <div className="size-16 rounded-[1.5rem] bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                        <GraduationCap size={32} />
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Grade
                        </span>
                        <h3 className="text-2xl font-black text-slate-900 leading-none">
                          {cls}
                        </h3>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              /* VIEW 2: STUDENT CONCEPT GRID */
              <motion.div
                key="concept-grid"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 border border-slate-100 rounded-[2rem] shadow-sm">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setSelectedClass(null)}
                      className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-900 hover:text-white transition-all"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 leading-none">
                        Class {selectedClass} Concepts
                      </h2>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                        Add mastery levels for each student
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <Search
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                      size={16}
                    />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search student name..."
                      className="h-12 pl-12 pr-6 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-blue-300 transition-all w-72"
                    />
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-20 text-center">
                            Roll
                          </th>
                          <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[200px]">
                            Student Name
                          </th>
                          {SUBJECTS.map((sub) => (
                            <th
                              key={sub.id}
                              className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[220px]"
                            >
                              <div className="flex items-center gap-2">
                                <sub.icon size={14} className={sub.color} />
                                {sub.name}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredStudents.map((student) => (
                          <tr
                            key={student.id}
                            className="hover:bg-slate-50/50 transition-all"
                          >
                            <td className="px-6 py-6 text-center font-black text-slate-400 text-xs">
                              {student.rollNo}
                            </td>
                            <td className="px-6 py-6">
                              <div className="flex items-center gap-3">
                                <div className="size-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">
                                  {student.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </div>
                                <span className="text-sm font-black text-slate-900">
                                  {student.name}
                                </span>
                              </div>
                            </td>
                            {SUBJECTS.map((sub) => (
                              <td key={sub.id} className="px-4 py-4">
                                <div className="relative group">
                                  <textarea
                                    rows={1}
                                    value={
                                      conceptData[student.id]?.[sub.id] || ""
                                    }
                                    onChange={(e) =>
                                      handleSaveConcept(
                                        student.id,
                                        sub.id,
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Add concept..."
                                    className="w-full min-h-[44px] max-h-32 p-3 bg-white border border-slate-200 rounded-xl text-[11px] font-medium text-slate-600 outline-none focus:border-blue-300 focus:shadow-sm transition-all resize-none overflow-hidden"
                                  />
                                  <div className="absolute top-2 right-2 opacity-0 group-focus-within:opacity-100 transition-opacity">
                                    <div className="size-2 rounded-full bg-blue-500 animate-pulse" />
                                  </div>
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-blue-600 p-6 rounded-[2rem] text-white flex items-center justify-between shadow-xl shadow-blue-100">
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-white/20 flex items-center justify-center">
                      <Target className="animate-bounce" />
                    </div>
                    <div>
                      <h4 className="font-black leading-none">
                        Auto-Sync Enabled
                      </h4>
                      <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-1">
                        Concepts are saved locally for each student
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      toast.success("All concepts synchronized successfully!")
                    }
                    className="px-8 py-3 bg-white text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                  >
                    Manual Backup
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
