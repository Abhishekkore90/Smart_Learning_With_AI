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
} from "lucide-react";
import type { MCQHomeworkSet } from "@/types/mcqHomework";
import {
  getMCQHomeworkById,
  subscribeToMCQHomework,
} from "@/services/mcqHomeworkService";
import { MCQQuizPlayer } from "./MCQQuizPlayer";
import { MCQCreatorModal } from "./MCQCreatorModal";

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

  // Full list of quizzes
  const [quizzes, setQuizzes] = useState<MCQHomeworkSet[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Filters
  const [selectedClass, setSelectedClass] = useState(initialClass);
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [searchQuery, setSearchQuery] = useState("");

  // Custom MCQ Creator Modal state
  const [showCreatorModal, setShowCreatorModal] = useState(false);

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

  // Filtered quizzes
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      if (selectedClass !== "all" && q.classId !== selectedClass) return false;
      if (selectedSubject !== "all" && q.subject !== selectedSubject) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          q.title.toLowerCase().includes(query) ||
          q.subject.toLowerCase().includes(query) ||
          q.classId.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [quizzes, selectedClass, selectedSubject, searchQuery]);

  // Today's Daily Featured Quiz
  const todayDailyQuiz = useMemo(() => {
    return (
      quizzes.find((q) => q.date === todayStr && !q.isCustom) ||
      quizzes.find((q) => !q.isCustom) ||
      null
    );
  }, [quizzes, todayStr]);

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
                  इयत्ता १ली ते ८वी च्या सर्व विषयांचे बहुपर्यायी प्रश्न सोडवा, किंवा शिक्षकांनी स्वतःचे प्रश्न तयार करून WhatsApp द्वारे थेट विद्यार्थ्यांना शेअर करा.
                </p>
              </div>

              {/* Create Custom MCQ CTA Button */}
              <div className="shrink-0 flex items-center gap-3">
                <button
                  onClick={() => setShowCreatorModal(true)}
                  className="flex items-center gap-2 bg-white text-indigo-900 hover:bg-indigo-50 font-bold px-5 py-3 rounded-2xl shadow-xl transition-all transform active:scale-95 text-sm cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-indigo-600" />
                  <span>+ नवीन MCQ प्रश्न तयार करा</span>
                </button>
              </div>
            </div>
          </div>

          {/* Today's Featured Daily MCQ */}
          {todayDailyQuiz && (
            <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500/30 rounded-3xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xl shrink-0">
                    🌟
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-rose-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        आजचा स्वाध्याय ({todayDailyQuiz.date})
                      </span>
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        {todayDailyQuiz.subject} • इयत्ता {todayDailyQuiz.classId}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
                      {todayDailyQuiz.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      एकूण {todayDailyQuiz.questions.length} प्रश्न • {todayDailyQuiz.totalMarks} गुण
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setActiveQuizId(todayDailyQuiz.id)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl shadow transition-all active:scale-95 text-xs sm:text-sm cursor-pointer"
                  >
                    <span>आताच सोडवा</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Filter & Search Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Search */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="स्वाध्याय शोधा (उदा. मराठी, गणित)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Class Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                <span className="text-xs font-bold text-slate-500 mr-1 shrink-0 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> इयत्ता:
                </span>
                <button
                  onClick={() => setSelectedClass("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedClass === "all"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  सर्व
                </button>
                {CLASSES.map((cls) => (
                  <button
                    key={cls}
                    onClick={() => setSelectedClass(cls)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedClass === cls
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-500 mr-1 shrink-0">विषय:</span>
              {SUBJECTS.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubject(sub.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    selectedSubject === sub.id
                      ? "bg-purple-600 text-white shadow-sm font-bold"
                      : "bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quizzes Grid */}
          {loadingList ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
              <FileQuestion className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                कोणताही स्वाध्याय उपलब्ध नाही
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                निवडलेल्या विषयात सध्या स्वाध्याय उपलब्ध नाही. तुम्ही स्वतःचा प्रश्न संच तयार करू शकता!
              </p>
              <button
                onClick={() => setShowCreatorModal(true)}
                className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow cursor-pointer"
              >
                + स्वतःचा MCQ स्वाध्याय तयार करा
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-lg transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {quiz.subject}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          इयत्ता {quiz.classId}
                        </span>
                      </div>
                      {quiz.isCustom && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          कस्टम
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                      {quiz.title}
                    </h3>

                    {/* Details */}
                    <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                      <span>📅 {quiz.date}</span>
                      <span>•</span>
                      <span>{quiz.questions.length} प्रश्न</span>
                      <span>•</span>
                      <span>{quiz.totalMarks} गुण</span>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400 truncate max-w-[120px]">
                      {quiz.createdBy.name}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/mcq?id=${quiz.id}`;
                          navigator.clipboard.writeText(url);
                          alert("स्वाध्याय लिंक कॉपी झाली!");
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="लिंक कॉपी करा"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setActiveQuizId(quiz.id)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer"
                      >
                        <span>सोडवा</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Creator Modal for Custom MCQs */}
      <AnimatePresence>
        {showCreatorModal && (
          <MCQCreatorModal
            isOpen={showCreatorModal}
            onClose={() => setShowCreatorModal(false)}
            defaultRole={defaultRole === "teacher" ? "teacher" : "user"}
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
