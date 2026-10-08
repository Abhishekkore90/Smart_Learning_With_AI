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
} from "lucide-react";
import { toast } from "sonner";
import type { MCQHomeworkSet } from "@/types/mcqHomework";
import {
  getMCQHomeworkById,
  subscribeToMCQHomework,
  deleteMCQHomework,
} from "@/services/mcqHomeworkService";
import { MCQQuizPlayer } from "./MCQQuizPlayer";
import { MCQCreatorModal } from "./MCQCreatorModal";
import { MCQHomeworkCalendar } from "./MCQHomeworkCalendar";

const CLASSES = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

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
  initialSubject?: string;
  initialQuizId?: string;
}

export const MCQHomeworkSection: React.FC<MCQHomeworkSectionProps> = ({
  embedded = false,
  defaultRole = "teacher",
  userName = "शिक्षक / प्रशासन",
  initialClass = "all",
  initialSubject = "all",
  initialQuizId,
}) => {
  // If specific quiz ID is active
  const [activeQuizId, setActiveQuizId] = useState<string | null>(initialQuizId || null);
  const [targetQuiz, setTargetQuiz] = useState<MCQHomeworkSet | null>(null);
  const [loadingTarget, setLoadingTarget] = useState(Boolean(initialQuizId));

  // Full list of quizzes from Firestore
  const [quizzes, setQuizzes] = useState<MCQHomeworkSet[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // 2 TABS: "admin" (Uploaded by Admin) vs "custom" (Create Custom)
  const [activeSubTab, setActiveSubTab] = useState<"admin" | "custom">("admin");

  // Filters
  const [selectedClass, setSelectedClass] = useState(initialClass);
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [selectedDate, setSelectedDate] = useState<string>("all");

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

  // Separate quizzes into 2 categories:
  // Tab 1: Admin-uploaded / Official daily quizzes
  const adminQuizzes = useMemo(() => {
    return quizzes.filter((q) => !q.isCustom || q.createdBy?.role === "admin");
  }, [quizzes]);

  // Tab 2: Custom / Teacher / User created quizzes
  const customQuizzes = useMemo(() => {
    return quizzes.filter((q) => q.isCustom && q.createdBy?.role !== "admin");
  }, [quizzes]);

  // Currently active tab's list
  const currentTabQuizzes = activeSubTab === "admin" ? adminQuizzes : customQuizzes;



  // Handle delete (for admin role)
  const handleDeleteQuiz = async (quizId: string, title: string) => {
    if (!window.confirm(`"${title}" हा स्वाध्याय नक्की हटवायचा आहे का?`)) return;
    try {
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
          {/* Header Action Bar */}
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
                {/* Admin button for Admin upload */}
                {defaultRole === "admin" && (
                  <button
                    onClick={() => setCreatorModalMode("admin")}
                    className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-amber-950 font-black px-4 py-3 rounded-2xl shadow-xl transition-all transform active:scale-95 text-xs sm:text-sm cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-900" />
                    <span>+ ॲडमिन MCQ जोडा</span>
                  </button>
                )}

                {/* Create Custom MCQ CTA Button */}
                <button
                  onClick={() => setCreatorModalMode("custom")}
                  className="flex items-center gap-2 bg-white text-indigo-900 hover:bg-indigo-50 font-bold px-4 py-3 rounded-2xl shadow-xl transition-all transform active:scale-95 text-xs sm:text-sm cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-indigo-600" />
                  <span>+ स्वतःचे प्रश्न तयार करा</span>
                </button>
              </div>
            </div>
          </div>

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
                <span>१. ॲडमिनने अपलोड केलेले</span>
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

              {/* TAB 2: Create Custom */}
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
                <span>२. स्वतःचे प्रश्न तयार करा (Custom)</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    activeSubTab === "custom"
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {customQuizzes.length}
                </span>
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

              {activeSubTab === "custom" && (
                <button
                  onClick={() => setCreatorModalMode("custom")}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ नवीन प्रश्न तयार करा</span>
                </button>
              )}
            </div>
          </div>

          {/* Date-wise MCQ Questions via Calendar */}
          {loadingList ? (
            <div className="flex justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            <MCQHomeworkCalendar
              quizzes={currentTabQuizzes}
              selectedDate={selectedDate !== "all" ? selectedDate : todayStr}
              onSelectDate={(d) => setSelectedDate(d)}
              onTakeQuiz={(id) => setActiveQuizId(id)}
              defaultRole={defaultRole}
              onDeleteQuiz={handleDeleteQuiz}
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
            userName={userName}
            defaultClass={selectedClass !== "all" ? selectedClass : "1st"}
            defaultSubject={selectedSubject !== "all" ? selectedSubject : "मराठी"}
            onSuccess={(newId) => {
              setActiveQuizId(newId);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
