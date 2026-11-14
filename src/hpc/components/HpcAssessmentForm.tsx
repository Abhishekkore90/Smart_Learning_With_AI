import React, { useState, useEffect, useMemo } from "react";
import {
  Save,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Check,
  ChevronDown,
  ChevronRight,
  User,
  Users,
  Heart,
  BookOpen,
  Send,
  Loader2,
  Smile,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import {
  HpcStageId,
  HpcSessionAssessment,
  HpcAreaAssessment,
} from "../types/hpc";
import {
  getAreasForStage,
  getGoalsForArea,
  getCompetenciesForGoalAndClass,
  HpcAreaDefinition,
  HPC_STAGES_INFO,
} from "../data/hpcCurricularGoals";
import {
  HPC_CORE_RUBRICS,
  SELF_ASSESSMENT_OPTIONS,
} from "../data/hpcRubrics";
import {
  getHpcSessionAssessment,
  saveHpcSessionAssessment,
  getHpcStudentById,
  StudentInfoSummary,
} from "../services/hpcService";

interface HpcAssessmentFormProps {
  studentId: string;
  academicYear: string;
  stageId: HpcStageId;
  classId: string;
  session?: "session1" | "session2";
  onBack?: () => void;
  onSaved?: () => void;
}

export function HpcAssessmentForm({
  studentId,
  academicYear,
  stageId,
  classId,
  session: initialSession = "session1",
  onBack,
  onSaved,
}: HpcAssessmentFormProps) {
  const [student, setStudent] = useState<StudentInfoSummary | null>(null);
  const [session, setSession] = useState<"session1" | "session2">(initialSession);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Applicable areas for the current stage
  const areas = useMemo(() => getAreasForStage(stageId), [stageId]);
  const [activeAreaId, setActiveAreaId] = useState<string>(() => areas[0]?.id || "");

  // Area assessments state
  const [areaAssessments, setAreaAssessments] = useState<Record<string, HpcAreaAssessment>>({});
  const [teacherGeneralRemarks, setTeacherGeneralRemarks] = useState("");
  const [assessmentStatus, setAssessmentStatus] = useState<"draft" | "completed">("draft");

  const isFoundational = stageId === "foundational";

  // Level labels based on stage
  const levelLabels = useMemo(() => {
    if (isFoundational) {
      return {
        beginner: "प्रवाह / निर्झर (Stream / Emerging)",
        proficient: "पर्वत (Mountain / Developing)",
        advanced: "आकाश (Sky / Advanced)",
      };
    }
    return {
      beginner: "प्रारंभिक (Beginner)",
      proficient: "प्रवीण (Proficient)",
      advanced: "प्रगत (Advanced)",
    };
  }, [isFoundational]);

  // Load student & existing assessment for selected session
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      const st = await getHpcStudentById(studentId);
      if (!isMounted) return;
      setStudent(st);

      const existing = await getHpcSessionAssessment(studentId, academicYear, session);
      if (!isMounted) return;

      if (existing) {
        setAreaAssessments(existing.areaAssessments || {});
        setTeacherGeneralRemarks(existing.teacherGeneralRemarks || "");
        setAssessmentStatus(existing.status || "draft");
      } else {
        // Initialize blank state for all areas
        const initialMap: Record<string, HpcAreaAssessment> = {};
        areas.forEach((area) => {
          const areaGoals = getGoalsForArea(area.id, stageId);
          initialMap[area.id] = {
            areaOrSubjectId: area.id,
            areaOrSubjectNameMarathi: area.nameMarathi,
            selectedGoalIds: areaGoals.length > 0 ? [areaGoals[0].id] : [],
            selectedCompetencyIds: [],
            activity1Title: "",
            activity1Description: "",
            activity1Outcome: "",
            activity2Title: "",
            activity2Description: "",
            activity2Outcome: "",
            assessmentQuestions: ["", "", ""],
            assessmentEvidence: "",
            awarenessLevel: "",
            sensitivityLevel: "",
            creativityLevel: "",
            threeSixty: {
              selfAssessment: {
                likedActivity: "yes",
                feltEasy: "yes",
                neededHelpFrom: ["none"],
                customRemark: "",
              },
              peerAssessment: {
                peerLiked: "yes",
                peerFeltEasy: "yes",
                peerNeededHelpFrom: [],
                peerRemarks: "",
              },
              parentFeedback: {
                learningResourcesAtHome: ["books"],
                parentObservations: "",
                parentExpectations: "",
              },
              teacherRemarks: {
                observation: "",
                guidanceSuggestion: "",
              },
            },
          };
        });
        setAreaAssessments(initialMap);
        setTeacherGeneralRemarks("");
        setAssessmentStatus("draft");
      }
      setLoading(false);
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [studentId, academicYear, session, stageId, areas]);

  // Active Area Data Helper
  const currentArea = useMemo(() => {
    return areas.find((a) => a.id === activeAreaId) || areas[0];
  }, [areas, activeAreaId]);

  const currentAssessment = useMemo((): HpcAreaAssessment => {
    if (!currentArea) return {} as any;
    return (
      areaAssessments[currentArea.id] || {
        areaOrSubjectId: currentArea.id,
        areaOrSubjectNameMarathi: currentArea.nameMarathi,
        selectedGoalIds: [],
        selectedCompetencyIds: [],
        activity1Title: "",
        activity1Description: "",
        activity1Outcome: "",
        activity2Title: "",
        activity2Description: "",
        activity2Outcome: "",
        assessmentQuestions: ["", "", ""],
        assessmentEvidence: "",
        awarenessLevel: "",
        sensitivityLevel: "",
        creativityLevel: "",
        threeSixty: {
          selfAssessment: {},
          peerAssessment: {},
          parentFeedback: {},
          teacherRemarks: { observation: "" },
        },
      }
    );
  }, [areaAssessments, currentArea]);

  // Available goals and competencies for current area
  const availableGoals = useMemo(() => {
    if (!currentArea) return [];
    return getGoalsForArea(currentArea.id, stageId);
  }, [currentArea, stageId]);

  const availableCompetencies = useMemo(() => {
    const list: any[] = [];
    currentAssessment.selectedGoalIds.forEach((goalId) => {
      const comps = getCompetenciesForGoalAndClass(goalId, classId, session);
      comps.forEach((c) => {
        if (!list.some((existing) => existing.id === c.id)) {
          list.push(c);
        }
      });
    });
    return list;
  }, [currentAssessment.selectedGoalIds, classId, session]);

  // Update field in current area assessment
  const updateCurrentAssessment = (updates: Partial<HpcAreaAssessment>) => {
    if (!currentArea) return;
    setAreaAssessments((prev) => ({
      ...prev,
      [currentArea.id]: {
        ...(prev[currentArea.id] || currentAssessment),
        ...updates,
      },
    }));
  };

  // Toggle goal selection
  const toggleGoal = (goalId: string) => {
    const current = currentAssessment.selectedGoalIds || [];
    const updated = current.includes(goalId)
      ? current.filter((id) => id !== goalId)
      : [...current, goalId];
    updateCurrentAssessment({ selectedGoalIds: updated });
  };

  // Toggle competency selection
  const toggleCompetency = (compId: string) => {
    const current = currentAssessment.selectedCompetencyIds || [];
    const updated = current.includes(compId)
      ? current.filter((id) => id !== compId)
      : [...current, compId];
    updateCurrentAssessment({ selectedCompetencyIds: updated });
  };

  // 360-degree update helpers
  const update360 = (
    section: "selfAssessment" | "peerAssessment" | "parentFeedback" | "teacherRemarks",
    field: string,
    value: any
  ) => {
    const current360 = currentAssessment.threeSixty || {
      selfAssessment: {},
      peerAssessment: {},
      parentFeedback: {},
      teacherRemarks: { observation: "" },
    };

    updateCurrentAssessment({
      threeSixty: {
        ...current360,
        [section]: {
          ...(current360[section] || {}),
          [field]: value,
        },
      },
    });
  };

  const handleSave = async (markComplete: boolean = false) => {
    setSaving(true);
    try {
      const assessmentData: HpcSessionAssessment = {
        studentId,
        academicYear,
        stageId,
        classId,
        session,
        status: markComplete ? "completed" : "draft",
        areaAssessments,
        teacherGeneralRemarks,
        completedAt: markComplete ? new Date().toISOString() : undefined,
      };

      await saveHpcSessionAssessment(assessmentData);
      setAssessmentStatus(markComplete ? "completed" : "draft");
      toast.success(
        markComplete
          ? `${session === "session1" ? "प्रथम सत्र (सत्र १)" : "द्वितीय सत्र (सत्र २)"} मूल्यांकन पूर्ण म्हणून सेव्ह झाले!`
          : "मूल्यांकन मसुदा (Draft) यशस्वीरित्या सेव्ह झाला!"
      );
      if (onSaved) onSaved();
    } catch (err: any) {
      toast.error("मूल्यांकन सेव्ह करताना त्रुटी: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const currentAreaIndex = useMemo(() => {
    return areas.findIndex((a) => a.id === currentArea?.id);
  }, [areas, currentArea]);

  const isFirstArea = currentAreaIndex <= 0;
  const isLastArea = currentAreaIndex === areas.length - 1;
  const nextArea = !isLastArea && currentAreaIndex >= 0 ? areas[currentAreaIndex + 1] : null;
  const prevArea = !isFirstArea && currentAreaIndex >= 0 ? areas[currentAreaIndex - 1] : null;

  const handlePrevArea = () => {
    if (prevArea) {
      setActiveAreaId(prevArea.id);
      window.scrollTo({ top: 180, behavior: "smooth" });
    }
  };

  const handleSaveAndNext = async () => {
    if (!nextArea) return;
    setSaving(true);
    try {
      const assessmentData: HpcSessionAssessment = {
        studentId,
        academicYear,
        stageId,
        classId,
        session,
        status: "draft",
        areaAssessments,
        teacherGeneralRemarks,
      };

      await saveHpcSessionAssessment(assessmentData);
      toast.success(
        `${currentArea?.nameMarathi || "क्षेत्र"} मसुदा जतन झाला! आता पुढील क्षेत्र: ${nextArea.nameMarathi} उघडले आहे.`
      );
      setActiveAreaId(nextArea.id);
      window.scrollTo({ top: 180, behavior: "smooth" });
      if (onSaved) onSaved();
    } catch (err: any) {
      toast.error("मूल्यांकन सेव्ह करताना त्रुटी: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
        <Loader2 className="size-8 text-indigo-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-600">मूल्यांकन फॉर्म लोड होत आहे...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* ---------------- Top Banner ---------------- */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="size-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-5" />
            </button>
          )}
          <div className="size-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 text-white flex items-center justify-center font-black text-xl shadow-md overflow-hidden">
            {student?.photoUrl ? (
              <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              student?.name?.charAt(0) || "वि"
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                भाग ब: विकासात्मक / विषयनिहाय मूल्यांकन
              </span>
              <span className="text-xs font-bold text-slate-500">
                हजेरी क्र: <b className="text-slate-800">{student?.rollNo}</b>
              </span>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  assessmentStatus === "completed"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {assessmentStatus === "completed" ? "✓ पूर्ण (Completed)" : "मसुदा (Draft)"}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              {student?.fullName || student?.name}
            </h2>
            <p className="text-xs text-slate-500 font-semibold">
              {HPC_STAGES_INFO.find((s) => s.id === stageId)?.titleMarathi} | {classId} वर्ग | {academicYear}
            </p>
          </div>
        </div>

        {/* Session Switcher & Save Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-end">
          {/* Session Switcher Pills */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setSession("session1")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                session === "session1"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              प्रथम सत्र (Session 1)
            </button>
            <button
              onClick={() => setSession("session2")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                session === "session2"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              द्वितीय सत्र (Session 2)
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="size-3.5" />
            <span>मसुदा सेव्ह (Draft)</span>
          </button>

          {!isLastArea ? (
            <button
              type="button"
              onClick={handleSaveAndNext}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-black shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="size-3.5" />
              <span>जतन व पुढील क्षेत्र →</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="size-3.5" />
              <span>पूर्ण सबमिट करा (Submit)</span>
            </button>
          )}
        </div>
      </div>

      {/* ---------------- Area / Subject Tabs ---------------- */}
      <div className="bg-white rounded-3xl p-3 border border-slate-200 shadow-xs">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 pt-1 pb-2">
          {isFoundational ? "६ विकास क्षेत्रे (6 Developmental Areas):" : "मूल्यांकन विषय सूची (Subjects):"}
        </p>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {areas.map((area, idx) => {
            const isSelected = activeAreaId === area.id;
            const areaRecord = areaAssessments[area.id];
            const hasLevels =
              areaRecord &&
              areaRecord.awarenessLevel &&
              areaRecord.sensitivityLevel &&
              areaRecord.creativityLevel;

            return (
              <button
                key={area.id}
                onClick={() => setActiveAreaId(area.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/20 scale-[1.01]"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                }`}
              >
                <span className="opacity-70">{area.code}</span>
                <span>{area.nameMarathi}</span>
                {hasLevels && (
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------- Active Area Card Container ---------------- */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-8">
        {/* Area Header */}
        <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                {currentArea?.code}
              </span>
              <span className="text-xs font-bold text-slate-500">
                {session === "session1" ? "प्रथम सत्र (Term 1)" : "द्वितीय सत्र (Term 2)"}
              </span>
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1">
              {currentArea?.nameMarathi}
            </h3>
            <p className="text-xs text-slate-500 font-semibold">{currentArea?.nameEnglish}</p>
          </div>
        </div>

        {/* ---------------- 1. Curricular Goals (CG) Checkboxes ---------------- */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <BookOpen className="size-4 text-indigo-600" />
              <span>अभ्यासक्रमाची ध्येये (Curricular Goals - CG)</span>
            </h4>
            <span className="text-[11px] text-slate-400 font-bold">
              लागू ध्येयांवर खूण करा (Select Applicable)
            </span>
          </div>

          <div className="space-y-2.5 mt-4">
            {availableGoals.map((goal) => {
              const isSelected = (currentAssessment.selectedGoalIds || []).includes(goal.id);
              return (
                <div
                  key={goal.id}
                  onClick={() => toggleGoal(goal.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    isSelected
                      ? "bg-indigo-50/70 border-indigo-400 text-indigo-950 shadow-xs"
                      : "bg-slate-50/40 hover:bg-slate-100/70 border-slate-200 text-slate-700"
                  }`}
                >
                  <div
                    className={`size-5 rounded-lg border mt-0.5 flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && <Check className="size-3.5 stroke-[3]" />}
                  </div>
                  <div>
                    <span className="text-xs font-black text-indigo-700 mr-2">{goal.code}*:</span>
                    <span className="text-xs sm:text-sm font-bold leading-relaxed">
                      {goal.titleMarathi}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ---------------- 2. Competencies (क्षमता) ---------------- */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="size-4 text-purple-600" />
              <span>क्षमता (Competencies - C)**</span>
            </h4>
            <span className="text-[11px] text-slate-400 font-bold">
              निवडलेल्या ध्येयांनुसार लागू क्षमता (Auto-filtered)
            </span>
          </div>

          {availableCompetencies.length === 0 ? (
            <p className="text-xs text-slate-400 font-bold p-4 bg-slate-50 rounded-2xl mt-3 text-center">
              कृपया वरीलपैकी किमान एक अभ्यासक्रमाचे ध्येय (CG) निवडा.
            </p>
          ) : (
            <div className="space-y-2.5 mt-4">
              {availableCompetencies.map((comp) => {
                const isChecked = (currentAssessment.selectedCompetencyIds || []).includes(comp.id);
                return (
                  <div
                    key={comp.id}
                    onClick={() => toggleCompetency(comp.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isChecked
                        ? "bg-purple-50/70 border-purple-400 text-purple-950 shadow-xs"
                        : "bg-slate-50/40 hover:bg-slate-100/70 border-slate-200 text-slate-700"
                    }`}
                  >
                    <div
                      className={`size-5 rounded-lg border mt-0.5 flex items-center justify-center flex-shrink-0 transition-all ${
                        isChecked
                          ? "bg-purple-600 border-purple-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isChecked && <Check className="size-3.5 stroke-[3]" />}
                    </div>
                    <div>
                      <span className="text-xs font-black text-purple-700 mr-2">📌 {comp.code}:</span>
                      <span className="text-xs sm:text-sm font-bold leading-relaxed">
                        {comp.titleMarathi}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ---------------- 3. Activities & Outcomes (उपक्रम व कृती) ---------------- */}
        <div>
          <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Layers className="size-4 text-emerald-600" />
            <span>सविस्तर उपक्रम व कृती (Activities & Learning Outcomes)</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
            {/* Activity 1 */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-3">
              <span className="text-[11px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                उपक्रम १ (Activity 1)
              </span>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  उपक्रमाचे नाव / कृती
                </label>
                <input
                  type="text"
                  value={currentAssessment.activity1Title || ""}
                  onChange={(e) => updateCurrentAssessment({ activity1Title: e.target.value })}
                  placeholder="उदा. दैनंदिन व्यायाम / चित्र निरीक्षण / शब्दसंपत्ती वाढवणे"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  उपक्रमाचे सविस्तर वर्णन
                </label>
                <textarea
                  rows={2}
                  value={currentAssessment.activity1Description || ""}
                  onChange={(e) => updateCurrentAssessment({ activity1Description: e.target.value })}
                  placeholder="कृतीचे स्वरूप व पद्धत..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  निष्पत्ती (Learning Outcome)
                </label>
                <input
                  type="text"
                  value={currentAssessment.activity1Outcome || ""}
                  onChange={(e) => updateCurrentAssessment({ activity1Outcome: e.target.value })}
                  placeholder="उदा. विद्यार्थ्यांमध्ये संघभावना व शारीरिक तंदुरुस्ती वाढते."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-800"
                />
              </div>
            </div>

            {/* Activity 2 */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-3">
              <span className="text-[11px] font-black uppercase text-teal-700 bg-teal-100 px-2 py-0.5 rounded-md">
                उपक्रम २ (Activity 2)
              </span>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  उपक्रमाचे नाव / कृती
                </label>
                <input
                  type="text"
                  value={currentAssessment.activity2Title || ""}
                  onChange={(e) => updateCurrentAssessment({ activity2Title: e.target.value })}
                  placeholder="उदा. खेळ आणि स्पर्धा / कोडी सोडवणे / भूमिका अभिनय"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  उपक्रमाचे सविस्तर वर्णन
                </label>
                <textarea
                  rows={2}
                  value={currentAssessment.activity2Description || ""}
                  onChange={(e) => updateCurrentAssessment({ activity2Description: e.target.value })}
                  placeholder="कृतीचे स्वरूप व पद्धत..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  निष्पत्ती (Learning Outcome)
                </label>
                <input
                  type="text"
                  value={currentAssessment.activity2Outcome || ""}
                  onChange={(e) => updateCurrentAssessment({ activity2Outcome: e.target.value })}
                  placeholder="उदा. समस्या सोडवण्याचे कौशल्य व बौद्धिक क्षमता वाढते."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- 4. Assessment Questions (मूल्यमापनासाठी प्रश्न) ---------------- */}
        <div>
          <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <HelpCircle className="size-4 text-sky-600" />
            <span>मूल्यमापनासाठी विचारलेले प्रश्न (Assessment Questions)</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            {[0, 1, 2].map((qIndex) => {
              const questions = currentAssessment.assessmentQuestions || ["", "", ""];
              return (
                <div key={qIndex}>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    प्रश्न {qIndex + 1}:
                  </label>
                  <input
                    type="text"
                    value={questions[qIndex] || ""}
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[qIndex] = e.target.value;
                      updateCurrentAssessment({ assessmentQuestions: updated });
                    }}
                    placeholder={`उदा. प्रश्न क्र. ${qIndex + 1}...`}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50/50"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* ---------------- 5. Performance Dimensions Matrix (३ पैलू व स्तर) ---------------- */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="size-4 text-amber-500" />
                <span>कामगिरी स्तर मूल्यमापन (Performance Dimensions & Rubric Levels)</span>
              </h4>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                प्रत्येक पैलूसाठी विद्यार्थ्याचा योग्य स्तर निवडा: {levelLabels.beginner} | {levelLabels.proficient} | {levelLabels.advanced}
              </p>
            </div>
          </div>

          <div className="space-y-5 mt-5">
            {/* Dimension 1: Awareness */}
            <div className="p-4 sm:p-5 rounded-2xl border border-blue-200 bg-blue-50/30 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-blue-600 text-white">
                    पैलू १
                  </span>
                  <span className="text-sm font-black text-blue-950">
                    {HPC_CORE_RUBRICS.awareness.titleMarathi} ({HPC_CORE_RUBRICS.awareness.titleEnglish})
                  </span>
                </div>
                <span className="text-xs font-bold text-blue-700">
                  निवडलेला स्तर: <b>{currentAssessment.awarenessLevel ? levelLabels[currentAssessment.awarenessLevel] : "निवडला नाही"}</b>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                {(["beginner", "proficient", "advanced"] as const).map((lvl) => {
                  const isLvl = currentAssessment.awarenessLevel === lvl;
                  const rubricInfo = HPC_CORE_RUBRICS.awareness.levels[lvl];
                  const label = isFoundational ? rubricInfo.labelFoundational : rubricInfo.labelStandard;

                  return (
                    <div
                      key={lvl}
                      onClick={() => updateCurrentAssessment({ awarenessLevel: lvl })}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isLvl
                          ? "bg-white border-blue-600 shadow-md ring-2 ring-blue-100"
                          : "bg-white/80 hover:bg-white border-slate-200 hover:border-blue-300"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-black text-slate-900">{label}</span>
                          <div
                            className={`size-4 rounded-full border flex items-center justify-center ${
                              isLvl ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300"
                            }`}
                          >
                            {isLvl && <Check className="size-3" />}
                          </div>
                        </div>
                        <p className="text-[11px] font-bold text-slate-500 mb-1.5">{rubricInfo.shortDesc}</p>
                        <p className="text-[11px] text-slate-600 leading-relaxed font-medium line-clamp-4">
                          {rubricInfo.detailedDesc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dimension 2: Sensitivity */}
            <div className="p-4 sm:p-5 rounded-2xl border border-rose-200 bg-rose-50/30 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-rose-600 text-white">
                    पैलू २
                  </span>
                  <span className="text-sm font-black text-rose-950">
                    {HPC_CORE_RUBRICS.sensitivity.titleMarathi} ({HPC_CORE_RUBRICS.sensitivity.titleEnglish})
                  </span>
                </div>
                <span className="text-xs font-bold text-rose-700">
                  निवडलेला स्तर: <b>{currentAssessment.sensitivityLevel ? levelLabels[currentAssessment.sensitivityLevel] : "निवडला नाही"}</b>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                {(["beginner", "proficient", "advanced"] as const).map((lvl) => {
                  const isLvl = currentAssessment.sensitivityLevel === lvl;
                  const rubricInfo = HPC_CORE_RUBRICS.sensitivity.levels[lvl];
                  const label = isFoundational ? rubricInfo.labelFoundational : rubricInfo.labelStandard;

                  return (
                    <div
                      key={lvl}
                      onClick={() => updateCurrentAssessment({ sensitivityLevel: lvl })}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isLvl
                          ? "bg-white border-rose-600 shadow-md ring-2 ring-rose-100"
                          : "bg-white/80 hover:bg-white border-slate-200 hover:border-rose-300"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-black text-slate-900">{label}</span>
                          <div
                            className={`size-4 rounded-full border flex items-center justify-center ${
                              isLvl ? "bg-rose-600 border-rose-600 text-white" : "border-slate-300"
                            }`}
                          >
                            {isLvl && <Check className="size-3" />}
                          </div>
                        </div>
                        <p className="text-[11px] font-bold text-slate-500 mb-1.5">{rubricInfo.shortDesc}</p>
                        <p className="text-[11px] text-slate-600 leading-relaxed font-medium line-clamp-4">
                          {rubricInfo.detailedDesc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dimension 3: Creativity */}
            <div className="p-4 sm:p-5 rounded-2xl border border-purple-200 bg-purple-50/30 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-purple-600 text-white">
                    पैलू ३
                  </span>
                  <span className="text-sm font-black text-purple-950">
                    {HPC_CORE_RUBRICS.creativity.titleMarathi} ({HPC_CORE_RUBRICS.creativity.titleEnglish})
                  </span>
                </div>
                <span className="text-xs font-bold text-purple-700">
                  निवडलेला स्तर: <b>{currentAssessment.creativityLevel ? levelLabels[currentAssessment.creativityLevel] : "निवडला नाही"}</b>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                {(["beginner", "proficient", "advanced"] as const).map((lvl) => {
                  const isLvl = currentAssessment.creativityLevel === lvl;
                  const rubricInfo = HPC_CORE_RUBRICS.creativity.levels[lvl];
                  const label = isFoundational ? rubricInfo.labelFoundational : rubricInfo.labelStandard;

                  return (
                    <div
                      key={lvl}
                      onClick={() => updateCurrentAssessment({ creativityLevel: lvl })}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isLvl
                          ? "bg-white border-purple-600 shadow-md ring-2 ring-purple-100"
                          : "bg-white/80 hover:bg-white border-slate-200 hover:border-purple-300"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-black text-slate-900">{label}</span>
                          <div
                            className={`size-4 rounded-full border flex items-center justify-center ${
                              isLvl ? "bg-purple-600 border-purple-600 text-white" : "border-slate-300"
                            }`}
                          >
                            {isLvl && <Check className="size-3" />}
                          </div>
                        </div>
                        <p className="text-[11px] font-bold text-slate-500 mb-1.5">{rubricInfo.shortDesc}</p>
                        <p className="text-[11px] text-slate-600 leading-relaxed font-medium line-clamp-4">
                          {rubricInfo.detailedDesc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- 6. 360-DEGREE ASSESSMENT SECTION ---------------- */}
        <div>
          <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Heart className="size-4 text-pink-600" />
            <span>३६० अंश बहुआयामी मूल्यमापन (360-Degree Feedback Sources)</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
            {/* 1. Student Self-Assessment (स्वयं मूल्यमापन) */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-3">
              <div className="flex items-center gap-2">
                <span className="size-6 rounded-lg bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center">
                  १
                </span>
                <span className="text-xs font-black text-slate-800">
                  स्वयं मूल्यमापन (Student Self-Assessment)
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  मला हे काम करायला आवडले:
                </label>
                <div className="flex items-center gap-2">
                  {SELF_ASSESSMENT_OPTIONS.likedQuestions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update360("selfAssessment", "likedActivity", opt.value)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        currentAssessment.threeSixty?.selfAssessment?.likedActivity === opt.value
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {opt.labelMarathi}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  मला हे काम सोपे वाटले:
                </label>
                <div className="flex items-center gap-2">
                  {SELF_ASSESSMENT_OPTIONS.likedQuestions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update360("selfAssessment", "feltEasy", opt.value)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        currentAssessment.threeSixty?.selfAssessment?.feltEasy === opt.value
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {opt.labelMarathi}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  विद्यार्थ्याचा स्वतःचा शेरा / मत:
                </label>
                <input
                  type="text"
                  value={currentAssessment.threeSixty?.selfAssessment?.customRemark || ""}
                  onChange={(e) => update360("selfAssessment", "customRemark", e.target.value)}
                  placeholder="उदा. मला चित्र काढायला खूप आवडते / वाचनाचा सराव करतो."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-800"
                />
              </div>
            </div>

            {/* 2. Peer Assessment (सहकारी मूल्यमापन) */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-3">
              <div className="flex items-center gap-2">
                <span className="size-6 rounded-lg bg-teal-600 text-white text-[11px] font-black flex items-center justify-center">
                  २
                </span>
                <span className="text-xs font-black text-slate-800">
                  सहकारी मूल्यमापन (Peer Assessment)
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  माझ्या मित्राला हे काम करायला आवडले:
                </label>
                <div className="flex items-center gap-2">
                  {SELF_ASSESSMENT_OPTIONS.likedQuestions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update360("peerAssessment", "peerLiked", opt.value)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        currentAssessment.threeSixty?.peerAssessment?.peerLiked === opt.value
                          ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {opt.labelMarathi}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  माझ्या मित्राला/मैत्रिणीला हे काम सोपे वाटले:
                </label>
                <div className="flex items-center gap-2">
                  {SELF_ASSESSMENT_OPTIONS.likedQuestions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update360("peerAssessment", "peerFeltEasy", opt.value)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        currentAssessment.threeSixty?.peerAssessment?.peerFeltEasy === opt.value
                          ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {opt.labelMarathi}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  मित्राचा अभिप्राय / शेरा (Peer Remark):
                </label>
                <input
                  type="text"
                  value={currentAssessment.threeSixty?.peerAssessment?.peerRemarks || ""}
                  onChange={(e) => update360("peerAssessment", "peerRemarks", e.target.value)}
                  placeholder="उदा. याचे चित्र चांगले असते / आम्ही याला सोबत खेळात घेतो."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-800"
                />
              </div>
            </div>

            {/* 3. Parent Feedback (पालक मूल्यमापन) */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-3">
              <div className="flex items-center gap-2">
                <span className="size-6 rounded-lg bg-amber-600 text-white text-[11px] font-black flex items-center justify-center">
                  ३
                </span>
                <span className="text-xs font-black text-slate-800">
                  पालक मूल्यमापन (Parent Feedback)
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  पालकांचे निरीक्षण व अभिप्राय:
                </label>
                <input
                  type="text"
                  value={currentAssessment.threeSixty?.parentFeedback?.parentObservations || ""}
                  onChange={(e) => update360("parentFeedback", "parentObservations", e.target.value)}
                  placeholder="उदा. वागण्यात पूर्वीपेक्षा शांतपणा आलाय / प्रगतीची अपेक्षा आहे."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  पालकांच्या अपेक्षा / सूचना:
                </label>
                <input
                  type="text"
                  value={currentAssessment.threeSixty?.parentFeedback?.parentExpectations || ""}
                  onChange={(e) => update360("parentFeedback", "parentExpectations", e.target.value)}
                  placeholder="उदा. गणितात अधिक सराव करावा अशी अपेक्षा आहे."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-800"
                />
              </div>
            </div>

            {/* 4. Teacher Remarks (शिक्षक मूल्यमापन) */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-3">
              <div className="flex items-center gap-2">
                <span className="size-6 rounded-lg bg-purple-600 text-white text-[11px] font-black flex items-center justify-center">
                  ४
                </span>
                <span className="text-xs font-black text-slate-800">
                  शिक्षक मूल्यमापन व मार्गदर्शन (Teacher Observation)
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  शिक्षकांचे प्रत्यक्ष निरीक्षण व शेरा *:
                </label>
                <input
                  type="text"
                  value={currentAssessment.threeSixty?.teacherRemarks?.observation || ""}
                  onChange={(e) => update360("teacherRemarks", "observation", e.target.value)}
                  placeholder="उदा. खेळांच्या माध्यमातून तू छान शिकतोस / रोज उपस्थित राहण्याची सवय कर."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  पुढील सुधारणेसाठी वैयक्तिक सूचना:
                </label>
                <input
                  type="text"
                  value={currentAssessment.threeSixty?.teacherRemarks?.guidanceSuggestion || ""}
                  onChange={(e) => update360("teacherRemarks", "guidanceSuggestion", e.target.value)}
                  placeholder="उदा. अक्षरे गिरवण्याचा सराव नियमित करावा."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- 7. Save Actions ---------------- */}
        <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-black px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              क्षेत्र {currentAreaIndex + 1} / {areas.length}
            </span>
            <span className="text-xs text-slate-500 font-bold">
              सक्रिय क्षेत्र: <b className="text-slate-800">{currentArea?.nameMarathi}</b>
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
            {!isFirstArea && (
              <button
                type="button"
                onClick={handlePrevArea}
                disabled={saving}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="size-4" />
                <span>मागील क्षेत्र</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="px-5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-black transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="size-4" />
              <span>मसुदा जतन करा (Save Draft)</span>
            </button>

            {!isLastArea ? (
              <button
                type="button"
                onClick={handleSaveAndNext}
                disabled={saving}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs sm:text-sm font-black shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="size-4" />
                <span>जतन करा आणि पुढील क्षेत्र उघडा ({nextArea?.nameMarathi ? nextArea.nameMarathi.slice(0, 18) + '...' : 'पुढील क्षेत्र'})</span>
                <ArrowRight className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-black shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="size-4" />
                <span>सत्र मूल्यांकन पूर्ण करा (Submit)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
