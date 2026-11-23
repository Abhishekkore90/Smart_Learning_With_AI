import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Search,
  ArrowRight,
  PlusCircle,
  Share2,
  Loader2,
  Filter,
  FileQuestion,
  HelpCircle,
  Layers,
  BookOpen,
  ShieldCheck,
  UserCheck,
  Trash2,
  Calendar,
  GraduationCap,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { auth } from "@/lib/firebase";
import type { MCQHomeworkSet } from "@/types/mcqHomework";
import {
  getMCQHomeworkById,
  subscribeToMCQHomework,
  deleteMCQHomework,
  getDeletedMCQIds,
} from "@/services/mcqHomeworkService";
import { MCQQuizPlayer } from "./MCQQuizPlayer";
import { MCQCreatorModal } from "./MCQCreatorModal";
import { MCQHomeworkCalendar } from "./MCQHomeworkCalendar";
import { MCQAdminDashboard } from "./MCQAdminDashboard";

const CLASS_LIST = [
  { id: "1st", mr: "१ ली", en: "1st" },
  { id: "2nd", mr: "२ री", en: "2nd" },
  { id: "3rd", mr: "३ री", en: "3rd" },
  { id: "4th", mr: "४ थी", en: "4th" },
  { id: "5th", mr: "५ वी", en: "5th" },
  { id: "6th", mr: "६ वी", en: "6th" },
  { id: "7th", mr: "७ वी", en: "7th" },
  { id: "8th", mr: "८ वी", en: "8th" },
];

const MEDIUM_LIST = [
  { id: "all", label: "सर्व माध्यम" },
  { id: "marathi", label: "मराठी माध्यम" },
  { id: "semi", label: "सेमी-इंग्रजी" },
];

const SUBJECTS = [
  { id: "all", label: "सर्व विषय" },
  { id: "मराठी", label: "मराठी" },
  { id: "इंग्रजी", label: "इंग्रजी" },
  { id: "गणित", label: "गणित" },
  { id: "विज्ञान", label: "विज्ञान" },
  { id: "सामाजिक शास्त्रे", label: "सामाजिक शास्त्रे" },
  { id: "सामान्य ज्ञान", label: "सामान्य ज्ञान" },
];

export interface MCQHomeworkSectionProps {
  embedded?: boolean;
  defaultRole?: "teacher" | "student" | "admin" | "user";
  userName?: string;
  initialClass?: string;
  onClassChange?: (classId: string) => void;
  onBackStep?: () => void;
  initialSubject?: string;
  initialQuizId?: string;
  sharedTeacherName?: string;
  sharedSchoolName?: string;
  initialMedium?: "marathi" | "semi" | "all";
  initialDate?: string;
  onDateChange?: (dateStr: string) => void;
}

export const MCQHomeworkSection: React.FC<MCQHomeworkSectionProps> = ({
  embedded = false,
  defaultRole = "teacher",
  userName = "शिक्षक / प्रशासन",
  initialClass = "1st",
  onClassChange,
  onBackStep,
  initialSubject = "all",
  initialQuizId,
  sharedTeacherName,
  sharedSchoolName,
  initialMedium = "all",
  initialDate,
  onDateChange,
}) => {
  const { user, profile } = useAuth();

  // If specific quiz ID is active
  const [activeQuizId, setActiveQuizId] = useState<string | null>(initialQuizId || null);
  const [targetQuiz, setTargetQuiz] = useState<MCQHomeworkSet | null>(null);
  const [loadingTarget, setLoadingTarget] = useState(Boolean(initialQuizId));

  // Full list of quizzes from Firestore
  const [quizzes, setQuizzes] = useState<MCQHomeworkSet[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // 2 TABS: "admin" (Uploaded by Admin) vs "custom" (Create Custom)
  const [activeSubTab, setActiveSubTab] = useState<"admin" | "custom">("admin");

  // Class and Medium Filters (Class-wise logic)
  const [selectedClass, setSelectedClass] = useState<string>(initialClass && initialClass !== "all" ? initialClass : "1st");
  const [selectedMedium, setSelectedMedium] = useState<"marathi" | "semi" | "all">(initialMedium || "all");
  const [selectedSubject, setSelectedSubject] = useState(embedded ? "all" : initialSubject);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || "all");

  useEffect(() => {
    if (initialDate && initialDate !== selectedDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  const handleDateSelect = (d: string) => {
    setSelectedDate(d);
    onDateChange?.(d);
  };

  // Modal mode: "admin" (Admin MCQ Uploader) or "custom" (Custom MCQ Creator) or null (closed)
  const [creatorModalMode, setCreatorModalMode] = useState<"admin" | "custom" | null>(null);

  // Load target quiz directly by ID
  useEffect(() => {
    if (!activeQuizId) {
      setTargetQuiz(null);
      setLoadingTarget(false);
      return;
    }

    setLoadingTarget(true);
    getMCQHomeworkById(activeQuizId).then((data) => {
      setTargetQuiz(data);
      setLoadingTarget(false);
    });
  }, [activeQuizId]);

  // Subscribe to all public & custom MCQ quizzes
  useEffect(() => {
    const unsub = subscribeToMCQHomework((items) => {
      setQuizzes(items);
      setLoadingList(false);
    });
    return () => unsub();
  }, []);

  // Today's date string YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  }, []);

  // Deleted quiz IDs blacklist (persisted in localStorage)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => getDeletedMCQIds());

  // Only authentic quizzes from Firestore (excluding any deleted quizzes; demo questions removed)
  const allQuizzes = useMemo(() => {
    return quizzes.filter((q) => !deletedIds.has(q.id));
  }, [quizzes, deletedIds]);

  // Quizzes count per class (for badges on class pills)
  const countByClass = useMemo(() => {
    const map: Record<string, number> = {};
    CLASS_LIST.forEach((c) => {
      map[c.id] = 0;
    });
    for (const q of allQuizzes) {
      const cId = q.classId || (q as any).class;
      if (cId && map[cId] !== undefined) {
        if (selectedMedium === "all" || !q.medium || q.medium === selectedMedium) {
          map[cId]++;
        }
      }
    }
    return map;
  }, [allQuizzes, selectedMedium]);

  // Sync with initialClass & initialMedium changes
  useEffect(() => {
    if (initialClass && initialClass !== "all") {
      setSelectedClass(initialClass);
    }
  }, [initialClass]);

  useEffect(() => {
    if (initialMedium) {
      setSelectedMedium(initialMedium);
    }
  }, [initialMedium]);

  // Separate quizzes into 2 categories:
  // Tab 1: Admin-uploaded / Official daily quizzes (filtered class-wise, medium-wise & subject-wise)
  const adminQuizzes = useMemo(() => {
    return allQuizzes.filter((q) => {
      // Must be admin / official
      if (q.isCustom && q.createdBy?.role !== "admin") return false;

      // Filter by Class
      if (selectedClass && selectedClass !== "all") {
        const cId = q.classId || (q as any).class;
        if (cId && cId !== selectedClass) return false;
      }

      // Filter by Medium
      if (selectedMedium && selectedMedium !== "all") {
        if (q.medium && q.medium !== selectedMedium) return false;
      }

      // Filter by Subject (bypassed in embedded mode to show all subjects' questions together)
      if (!embedded && selectedSubject && selectedSubject !== "all") {
        if (q.subject && q.subject !== selectedSubject) return false;
      }

      return true;
    });
  }, [allQuizzes, selectedClass, selectedMedium, selectedSubject, embedded]);

  // Tab 2: Custom / Personal Question Bank (strictly for the creator/teacher only, also filtered class-wise)
  const customQuizzes = useMemo(() => {
    return allQuizzes.filter((q) => {
      if (!q.isCustom || q.createdBy?.role === "admin") return false;

      // Filter by Class
      if (selectedClass && selectedClass !== "all") {
        const cId = q.classId || (q as any).class;
        if (cId && cId !== selectedClass) return false;
      }

      // Filter by Medium
      if (selectedMedium && selectedMedium !== "all") {
        if (q.medium && q.medium !== selectedMedium) return false;
      }

      // Filter by Subject (bypassed in embedded mode to show all subjects' questions together)
      if (!embedded && selectedSubject && selectedSubject !== "all") {
        if (q.subject && q.subject !== selectedSubject) return false;
      }

      // Admin sees all custom quizzes
      if (defaultRole === "admin") return true;

      const currentUid = user?.uid || auth?.currentUser?.uid;
      if (currentUid && q.createdBy?.uid) {
        return q.createdBy.uid === currentUid;
      }

      // Match by teacher/creator name or stored teacher name
      const myName = (userName || profile?.fullName || user?.displayName || (typeof window !== "undefined" ? localStorage.getItem("mcq_share_teacher_name") : "") || "").trim().toLowerCase();
      if (myName && myName !== "विद्यार्थी" && myName !== "विद्यार्थी / पालक") {
        const creatorName = (q.createdBy?.name || "").trim().toLowerCase();
        const tName = (q.teacherName || "").trim().toLowerCase();
        return (creatorName !== "" && creatorName === myName) || (tName !== "" && tName === myName);
      }

      return false;
    });
  }, [allQuizzes, defaultRole, user?.uid, userName, profile?.fullName, selectedClass, selectedMedium, selectedSubject, embedded]);

  // Currently active tab's list
  const currentTabQuizzes = activeSubTab === "admin" ? adminQuizzes : customQuizzes;



  // Handle delete (for admin role)
  const handleDeleteQuiz = async (quizId: string, title: string) => {
    if (!window.confirm(`"${title}" हा स्वाध्याय नक्की हटवायचा आहे का?`)) return;
    try {
      // Immediate optimistic removal so the card vanishes right away
      setDeletedIds((prev) => new Set([...prev, quizId]));
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));

      await deleteMCQHomework(quizId);
      toast.success("स्वाध्याय यशस्वीपणे हटवला!");
    } catch (err: any) {
      toast.error("स्वाध्याय हटवताना त्रुटी आली: " + (err.message || ""));
    }
  };

  return (
    <div className="space-y-6">
      {/* CASE 1: ACTIVE QUIZ PLAYER VIEW */}
      {activeQuizId ? (
        loadingTarget ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">
              MCQ स्वाध्याय लोड होत आहे...
            </p>
          </div>
        ) : targetQuiz ? (
          <MCQQuizPlayer
            quiz={targetQuiz}
            studentName={userName}
            teacherName={sharedTeacherName || targetQuiz.teacherName || targetQuiz.createdBy?.name}
            schoolName={sharedSchoolName || targetQuiz.schoolName}
            onBack={() => setActiveQuizId(null)}
            showBackBtn={true}
          />
        ) : (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
              ✕
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              स्वाध्याय सापडला नाही
            </h3>
            <p className="text-sm text-slate-500 mt-2">
              हा स्वाध्याय काढून टाकला गेला असावा किंवा लिंक चुकीची आहे.
            </p>
            <button
              onClick={() => setActiveQuizId(null)}
              className="mt-6 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow cursor-pointer"
            >
              सर्व स्वाध्याय यादी पहा
            </button>
          </div>
        )
      ) : (
        /* CASE 2: MAIN MCQ DASHBOARD & LISTING */
        <div className="space-y-6">
          {/* Header Action Bar (Standalone mode only) */}
          {!embedded && (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 text-white p-6 sm:p-8 shadow-xl">
              <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-indigo-100 mb-3">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    दररोज नवीन विषय • ऑनलाईन बहुपर्यायी प्रश्न (MCQ)
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    दैनिक MCQ स्वाध्याय व प्रश्नमंजुषा
                  </h2>
                  <p className="mt-1.5 text-indigo-100 text-xs sm:text-sm leading-relaxed">
                    इयत्ता १ली ते ८वी च्या सर्व विषयांचे बहुपर्यायी प्रश्न सोडवा, किंवा शिक्षकांनी व ॲडमिनने स्वतःचे प्रश्न तयार करून WhatsApp द्वारे थेट विद्यार्थ्यांना शेअर करा.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="shrink-0 flex items-center flex-wrap gap-2.5">
                  {/* Admin button - ONLY available for Admin */}
                  {defaultRole === "admin" ? (
                    <button
                      onClick={() => setCreatorModalMode("admin")}
                      className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-amber-950 font-black px-4 sm:px-5 py-3 rounded-2xl shadow-xl transition-all transform active:scale-95 text-xs sm:text-sm cursor-pointer border border-amber-500/30"
                    >
                      <ShieldCheck className="w-4 h-4 text-amber-950" />
                      <span>+ ॲडमिन अधिकृत प्रश्न तयार करा</span>
                    </button>
                  ) : (
                    /* Teachers & Students: Notice to share questions with students */
                    <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl text-white text-xs sm:text-sm font-semibold border border-white/20 shadow-sm">
                      <Share2 className="w-4 h-4 text-emerald-300 shrink-0" />
                      <span>खालील स्वाध्याय यादीतून WhatsApp द्वारे थेट विद्यार्थ्यांशी शेअर करा</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Embedded Mini Header for Class-wise Homework Integration */}
          {embedded && (
            <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 dark:from-purple-950/40 dark:via-indigo-950/40 dark:to-pink-950/40 p-4 rounded-2xl border border-purple-200 dark:border-purple-800/60 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {onBackStep && (
                    <button
                      type="button"
                      onClick={onBackStep}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-300 dark:border-slate-700 shadow-2xs cursor-pointer flex items-center gap-1 active:scale-95 transition-all"
                      title="मागील पायरीवर जा (Go Back)"
                    >
                      <ChevronLeft className="size-4 text-purple-600" />
                      <span>मागे जा (Back)</span>
                    </button>
                  )}
                  <div className="size-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <GraduationCap className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                      <span>इयत्तानिहाय ऑनलाईन MCQ स्वाध्याय</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-600 text-white font-bold">
                        {CLASS_LIST.find((c) => c.id === selectedClass)?.mr || selectedClass}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      या इयत्तेचे प्रश्न सोडवा किंवा स्वतः तयार करून WhatsApp द्वारे थेट विद्यार्थ्यांना पाठवा.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Class Switcher Tabs inside embedded mode */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none border-t border-purple-200/60 dark:border-purple-800/40">
                <span className="text-[11px] font-black text-slate-500 uppercase shrink-0 mr-1">
                  इयत्ता बदला:
                </span>
                {CLASS_LIST.map((cls) => {
                  const isSelected = selectedClass === cls.id;
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => {
                        setSelectedClass(cls.id);
                        onClassChange?.(cls.id);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-purple-600 text-white shadow-xs font-black scale-102"
                          : "bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-white"
                      }`}
                    >
                      इ. {cls.mr}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Class & Medium Selection Bar (Standalone mode only) */}
          {!embedded && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              {/* Top row: Medium and Subject filters */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                {/* Medium selector */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" /> माध्यम:
                  </span>
                  <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {MEDIUM_LIST.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMedium(m.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          selectedMedium === m.id
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> विषय:
                  </span>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bottom row: Class Selection (इयत्ता १ ली ते ८ वी) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    इयत्ता निवडा (Class-wise MCQ):
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    सर्व इयत्तांसाठी समान मॉडेल उपलब्ध
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-9 gap-2">
                  {/* All Classes option */}
                  <button
                    type="button"
                    onClick={() => setSelectedClass("all")}
                    className={`p-2.5 rounded-2xl text-center border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      selectedClass === "all"
                        ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-transparent shadow-md scale-102 font-bold"
                        : "bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                    }`}
                  >
                    <span className="text-xs font-black">सर्व इयत्ता</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      selectedClass === "all" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}>
                      {allQuizzes.length}
                    </span>
                  </button>

                  {/* Class 1st to 8th */}
                  {CLASS_LIST.map((cls) => {
                    const isSelected = selectedClass === cls.id;
                    const count = countByClass[cls.id] || 0;
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => setSelectedClass(cls.id)}
                        className={`p-2.5 rounded-2xl text-center border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? "bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white border-transparent shadow-md scale-102 font-bold"
                            : "bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                        }`}
                      >
                        <span className="text-xs font-black">इ. {cls.mr}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isSelected ? "bg-white/25 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        }`}>
                          {count} MCQ
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 2 TABS: "Uploaded by Admin" vs "Create Custom" */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 w-fit">
              {/* TAB 1: Uploaded by Admin */}
              <button
                type="button"
                onClick={() => setActiveSubTab("admin")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                  activeSubTab === "admin"
                    ? "bg-indigo-600 text-white shadow-md font-extrabold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-300" />
                <span>{defaultRole === "admin" ? "१. ॲडमिनने अपलोड केलेले" : "१. दैनिक MCQ स्वाध्याय"}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    activeSubTab === "admin"
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {adminQuizzes.length}
                </span>
              </button>

              {/* TAB 2: Custom / Practice */}
              <button
                type="button"
                onClick={() => setActiveSubTab("custom")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                  activeSubTab === "custom"
                    ? "bg-purple-600 text-white shadow-md font-extrabold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>दैनिक एमसीक्यू स्वाध्याय स्वतः तयार करा</span>
              </button>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">


              {/* Quick Action Button for the active tab */}
              {activeSubTab === "admin" && defaultRole === "admin" && (
                <button
                  onClick={() => setCreatorModalMode("admin")}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ नवीन ॲडमिन MCQ जोडा</span>
                </button>
              )}

              {activeSubTab === "custom" && (defaultRole === "admin" || defaultRole === "teacher") && (
                <button
                  onClick={() => setCreatorModalMode("custom")}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ स्वतःचे प्रश्न तयार करा (Make Your Own)</span>
                </button>
              )}
            </div>
          </div>

          {/* Admin Panel vs Teacher/Student Panel */}
          {loadingList ? (
            <div className="flex justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : defaultRole === "admin" && activeSubTab === "admin" ? (
            <MCQAdminDashboard
              quizzes={adminQuizzes}
              selectedClass={selectedClass}
              onSelectClass={setSelectedClass}
              selectedMedium={selectedMedium}
              selectedSubject={selectedSubject}
              selectedDate={selectedDate}
              onSelectDate={handleDateSelect}
              onOpenManualCreator={(d) => {
                if (d) setSelectedDate(d);
                setCreatorModalMode("admin");
              }}
              onDeleteQuiz={handleDeleteQuiz}
              userName={userName}
            />
          ) : (
            <MCQHomeworkCalendar
              quizzes={currentTabQuizzes}
              selectedDate={selectedDate}
              onSelectDate={handleDateSelect}
              onTakeQuiz={(id) => setActiveQuizId(id)}
              defaultRole={defaultRole}
              userName={userName}
              onDeleteQuiz={handleDeleteQuiz}
              selectedClass={selectedClass}
              selectedMedium={selectedMedium}
            />
          )}
    </div>
  )}

      {/* Creator Modal for Admin and Custom MCQs */}
      <AnimatePresence>
        {creatorModalMode && (
          <MCQCreatorModal
            key={creatorModalMode}
            isOpen={Boolean(creatorModalMode)}
            mode={creatorModalMode}
            onClose={() => setCreatorModalMode(null)}
            defaultRole={defaultRole === "admin" ? "admin" : (defaultRole === "teacher" ? "teacher" : "user")}
            userName={userName || profile?.fullName || user?.displayName || "शिक्षक"}
            defaultDate={selectedDate !== "all" ? selectedDate : todayStr}
            defaultClass={selectedClass !== "all" ? selectedClass : "1st"}
            defaultMedium={selectedMedium !== "all" ? selectedMedium : "marathi"}
            defaultSubject={selectedSubject !== "all" ? selectedSubject : "मराठी"}
            onSuccess={(newId, createdAsAdmin) => {
              setActiveSubTab(createdAsAdmin ? "admin" : "custom");
              setActiveQuizId(newId);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
