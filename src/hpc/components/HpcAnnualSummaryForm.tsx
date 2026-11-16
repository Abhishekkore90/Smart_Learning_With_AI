import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Save,
  ArrowLeft,
  Award,
  CheckCircle2,
  Calendar,
  Sparkles,
  BookOpen,
  UserCheck,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  HpcStageId,
  HpcAnnualSummary,
  HpcCurricularGoal,
  HpcDynamicActivity,
  HpcDynamicRemark,
} from "../types/hpc";
import {
  getAreasForStage,
  HPC_STAGES_INFO,
} from "../data/hpcCurricularGoals";
import {
  getHpcAnnualSummary,
  saveHpcAnnualSummary,
  getHpcStudentById,
  getHpcStudentAttendance,
  StudentInfoSummary,
  getHpcCurricularGoals,
  getHpcDynamicActivities,
  getHpcDynamicRemarks,
  getHpcAreasForStage,
} from "../services/hpcService";
import {
  HPC_FINAL_COMPREHENSIVE_REMARKS,
  HPC_NEXT_CLASS_RECOMMENDATIONS,
} from "../data/hpcFinalRemarksBank";

interface HpcAnnualSummaryFormProps {
  studentId: string;
  academicYear: string;
  stageId: HpcStageId;
  classId: string;
  onBack?: () => void;
  onSaved?: () => void;
  onProceedToReports?: () => void;
}

function matchAreaName(areaName?: string, remarkArea?: string): boolean {
  if (!areaName || !remarkArea) return false;
  const a1 = areaName.trim().toLowerCase().replace(/[\s\-_,]+/g, "");
  const a2 = remarkArea.trim().toLowerCase().replace(/[\s\-_,]+/g, "");
  if (a1 === a2 || a1.includes(a2) || a2.includes(a1)) return true;

  if (a1.includes("शारीरिक") && a2.includes("शारीरिक")) return true;
  if ((a1.includes("सामाजिक") || a1.includes("भावनिक")) && (a2.includes("सामाजिक") || a2.includes("भावनिक"))) return true;
  if (a1.includes("बोध") && a2.includes("बोध")) return true;
  if ((a1.includes("भाषा") || a1.includes("साक्षरता")) && (a2.includes("भाषा") || a2.includes("साक्षरता"))) return true;
  if (
    (a1.includes("सौंदर्य") || a1.includes("सांस्कृतिक") || a1.includes("कला")) &&
    (a2.includes("सौंदर्य") || a2.includes("सांस्कृतिक") || a2.includes("कला"))
  )
    return true;
  if (a1.includes("सवयी") && a2.includes("सवयी")) return true;
  return false;
}

function matchLevel(lvlKey: "beginner" | "proficient" | "advanced", remarkLevel?: string): boolean {
  if (!remarkLevel) return false;
  const r = remarkLevel.trim().toLowerCase();
  if (lvlKey === "beginner") {
    return r.includes("निर्झर") || r.includes("प्रवाह") || r.includes("प्रारंभिक") || r.includes("beginner");
  }
  if (lvlKey === "proficient") {
    return r.includes("पर्वत") || r.includes("प्रवीण") || r.includes("proficient");
  }
  if (lvlKey === "advanced") {
    return r.includes("आकाश") || r.includes("प्रगत") || r.includes("advanced");
  }
  return false;
}

export function HpcAnnualSummaryForm({
  studentId,
  academicYear,
  stageId,
  classId,
  onBack,
  onSaved,
  onProceedToReports,
}: HpcAnnualSummaryFormProps) {
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentInfoSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dynamic HPC Master Data from Firestore (Excel Uploads)
  const [customGoals, setCustomGoals] = useState<HpcCurricularGoal[]>([]);
  const [stageActivities, setStageActivities] = useState<HpcDynamicActivity[]>([]);
  const [dynamicRemarks, setDynamicRemarks] = useState<HpcDynamicRemark[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadMasterData() {
      try {
        const [gList, aList, remList] = await Promise.all([
          getHpcCurricularGoals(stageId),
          getHpcDynamicActivities(undefined, stageId),
          getHpcDynamicRemarks(undefined),
        ]);
        if (isMounted) {
          setCustomGoals(gList);
          setStageActivities(aList);
          setDynamicRemarks(remList);
        }
      } catch (err) {
        console.warn("Could not load dynamic HPC master data:", err);
      }
    }
    loadMasterData();
    return () => {
      isMounted = false;
    };
  }, [stageId]);

  const areas = useMemo(
    () => getHpcAreasForStage(stageId, customGoals, stageActivities),
    [stageId, customGoals, stageActivities]
  );
  const isFoundational = stageId === "foundational";

  // Form State
  const [areaSummaries, setAreaSummaries] = useState<
    Record<
      string,
      {
        areaOrSubjectId: string;
        areaOrSubjectNameMarathi: string;
        finalLevel: "beginner" | "proficient" | "advanced" | "";
        awarenessSummary?: string;
        sensitivitySummary?: string;
        creativitySummary?: string;
        qualitativeRemarks?: string;
      }
    >
  >({});

  const [finalTeacherRemarks, setFinalTeacherRemarks] = useState("");
  const [recommendationsForNextClass, setRecommendationsForNextClass] = useState("");
  const [attendance, setAttendance] = useState<any>(null);

  // Helper to remove level names like [निर्झर], [पर्वत], [आकाश], निर्झर –, पर्वत –, आकाश –
  const cleanDisplayOption = (
    text: string,
    title?: string
  ): { cleanTitle: string; cleanSnippet: string; cleanFullText: string } => {
    if (!text) return { cleanTitle: "", cleanSnippet: "", cleanFullText: "" };

    // Remove leading bracket like [निर्झर], [पर्वत], [आकाश], [प्रवाह]
    let cleaned = text.replace(/^\[(निर्झर|पर्वत|आकाश|प्रवाह)\]\s*/i, "").trim();

    // If text has pattern: "निर्झर – शीर्षक : मुख्य मजकूर" OR "शीर्षक : मुख्य मजकूर"
    const colonMatch = cleaned.match(
      /^(?:(?:निर्झर|पर्वत|आकाश|प्रवाह|निर्झर ते पर्वत|पर्वत ते आकाश)\s*[-–—]\s*)?([^:]+)\s*:\s*([\s\S]+)$/i
    );

    let cleanTitle = title
      ? title.replace(/^(?:निर्झर|पर्वत|आकाश|प्रवाह|निर्झर ते पर्वत|पर्वत ते आकाश)\s*[-–—]\s*/i, "").trim()
      : "";
    let cleanSnippet = "";
    let cleanFullText = "";

    if (colonMatch) {
      if (!cleanTitle) cleanTitle = colonMatch[1].trim();
      cleanSnippet = colonMatch[2].trim();
      cleanFullText = cleanSnippet;
    } else {
      cleaned = cleaned.replace(/^(?:निर्झर|पर्वत|आकाश|प्रवाह|निर्झर ते पर्वत|पर्वत ते आकाश)\s*[-–—]\s*/i, "").trim();
      cleanSnippet = cleaned;
      cleanFullText = cleaned;
    }

    cleanTitle = cleanTitle
      .replace(/^\[(निर्झर|पर्वत|आकाश|प्रवाह)\]\s*/i, "")
      .replace(/^(?:निर्झर|पर्वत|आकाश|प्रवाह|निर्झर ते पर्वत|पर्वत ते आकाश)\s*[-–—]\s*/i, "")
      .trim();

    cleanSnippet = cleanSnippet
      .replace(/^\[(निर्झर|पर्वत|आकाश|प्रवाह)\]\s*/i, "")
      .replace(/^(?:निर्झर|पर्वत|आकाश|प्रवाह|निर्झर ते पर्वत|पर्वत ते आकाश)\s*[-–—]\s*/i, "")
      .trim();

    return { cleanTitle, cleanSnippet, cleanFullText };
  };

  // Level filters for Sheet 4 & Sheet 5 (Initially empty: teacher selects level)
  const [finalRemarksLevelFilter, setFinalRemarksLevelFilter] = useState<string>("");
  const [recommendationLevelFilter, setRecommendationLevelFilter] = useState<string>("");

  // Sheet 4 - Final Comprehensive Remarks
  const availableFinalRemarks = useMemo(() => {
    if (!finalRemarksLevelFilter) return [];
    const dynamicFinal = dynamicRemarks.filter(
      (r) =>
        (r as any).type === "final_comprehensive" ||
        r.subjectOrArea === "अंतिम सर्वंकष वार्षिक अभिप्राय" ||
        r.subjectOrArea?.includes("अंतिम") ||
        r.subjectOrArea?.includes("सर्वंकष")
    );
    const baseList =
      dynamicFinal.length > 0
        ? dynamicFinal.map((d) => ({
            id: d.id,
            level: (d.level || "पर्वत") as any,
            title: (d as any).title || d.level || "",
            remarkText: d.remarkText,
          }))
        : HPC_FINAL_COMPREHENSIVE_REMARKS;

    return baseList.filter((item) => {
      const l = (item.level || "").toLowerCase();
      if (finalRemarksLevelFilter === "nirjhar")
        return l.includes("निर्झर") || l.includes("प्रवाह") || l.includes("beginner");
      if (finalRemarksLevelFilter === "parvat")
        return l.includes("पर्वत") || l.includes("proficient");
      if (finalRemarksLevelFilter === "aakash")
        return l.includes("आकाश") || l.includes("advanced");
      return false;
    });
  }, [dynamicRemarks, finalRemarksLevelFilter]);

  // Sheet 5 - Next Class Recommendations
  const availableRecommendations = useMemo(() => {
    if (!recommendationLevelFilter) return [];
    const dynamicRecs = dynamicRemarks.filter(
      (r) =>
        (r as any).type === "next_class_recommendation" ||
        r.subjectOrArea === "पुढील इयत्तेसाठी मार्गदर्शन व शिफारस" ||
        r.subjectOrArea?.includes("शिफारस") ||
        r.subjectOrArea?.includes("मार्गदर्शन")
    );
    const baseList =
      dynamicRecs.length > 0
        ? dynamicRecs.map((d) => ({
            id: d.id,
            level: (d.level || "पर्वत") as any,
            title: (d as any).title || d.level || "",
            recommendationText: d.remarkText || (d as any).recommendationText || "",
          }))
        : HPC_NEXT_CLASS_RECOMMENDATIONS;

    return baseList.filter((item) => {
      const l = (item.level || "").toLowerCase();
      if (recommendationLevelFilter === "nirjhar")
        return l.includes("निर्झर") || l.includes("प्रवाह") || l.includes("beginner");
      if (recommendationLevelFilter === "parvat")
        return l.includes("पर्वत") || l.includes("proficient");
      if (recommendationLevelFilter === "aakash")
        return l.includes("आकाश") || l.includes("advanced");
      return false;
    });
  }, [dynamicRemarks, recommendationLevelFilter]);

  // Default remarks template matching official PDF
  const defaultFoundationalRemarks =
    "विद्यार्थ्याने सामाजिक व भावनिक क्षेत्रात उत्तम प्रगती केली असून समवयस्कांसोबत खेळणे व सहकार्याने वागणे चांगले जमते. पायाभूत साक्षरता व संख्याज्ञानात अधिक नियमित सरावाची आवश्यकता आहे. पुढील इयत्तेत यशस्वी प्रगती करण्यासाठी मनःपूर्वक शुभेच्छा!";

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      const st = await getHpcStudentById(studentId);
      if (!isMounted) return;
      setStudent(st);

      const att = await getHpcStudentAttendance(classId, academicYear, studentId);
      if (!isMounted) return;
      setAttendance(att);

      const existing = await getHpcAnnualSummary(studentId, academicYear);
      if (!isMounted) return;

      if (existing) {
        setAreaSummaries(existing.areaSummaries || {});
        setFinalTeacherRemarks(existing.finalTeacherRemarks || "");
        setRecommendationsForNextClass(existing.recommendationsForNextClass || "");
      } else {
        // Initialize area summaries safely without wiping in-flight selections
        setAreaSummaries((prev) => {
          if (Object.keys(prev).length > 0) return prev;
          const initialSummaries: any = {};
          areas.forEach((a) => {
            initialSummaries[a.id] = {
              areaOrSubjectId: a.id,
              areaOrSubjectNameMarathi: a.nameMarathi,
              finalLevel: "proficient",
              qualitativeRemarks: "समाधानकारक प्रगती दिसून येत आहे.",
            };
          });
          return initialSummaries;
        });
        setFinalTeacherRemarks((prev) => prev || (isFoundational ? defaultFoundationalRemarks : ""));
      }
      setLoading(false);
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [studentId, academicYear, stageId, classId, areas, isFoundational]);

  const updateAreaSummary = (
    areaId: string,
    field: "finalLevel" | "qualitativeRemarks" | "awarenessSummary" | "sensitivitySummary" | "creativitySummary",
    val: any
  ) => {
    setAreaSummaries((prev) => ({
      ...prev,
      [areaId]: {
        ...(prev[areaId] || {
          areaOrSubjectId: areaId,
          areaOrSubjectNameMarathi: areas.find((a) => a.id === areaId)?.nameMarathi || "",
          finalLevel: "proficient",
        }),
        [field]: val,
      },
    }));
  };

  const handleSave = async (markComplete: boolean = false) => {
    setSaving(true);
    try {
      const summaryData: HpcAnnualSummary = {
        studentId,
        academicYear,
        stageId,
        classId,
        areaSummaries,
        finalTeacherRemarks,
        recommendationsForNextClass,
        attendanceSummary: attendance
          ? {
              term1WorkingDays: attendance.term1?.totalWorking || 110,
              term1PresentDays: attendance.term1?.totalPresent || 0,
              term2WorkingDays: attendance.term2?.totalWorking || 115,
              term2PresentDays: attendance.term2?.totalPresent || 0,
              totalWorkingDays: attendance.annualTotalWorking || 225,
              totalPresentDays: attendance.annualTotalPresent || 0,
              percentage: parseFloat(attendance.attendancePercentage || "0"),
            }
          : undefined,
        status: markComplete ? "completed" : "draft",
      };

      await saveHpcAnnualSummary(summaryData);
      localStorage.setItem("hpc_last_student_id", studentId);
      toast.success(
        markComplete
          ? "वार्षिक सर्वंकष गोषवारा (भाग क) जतन झाला! आता HPC अहवाल व PDF उघडत आहे..."
          : "वार्षिक अहवाल मसुदा यशस्वीरित्या सेव्ह झाला!"
      );

      if (markComplete) {
        if (onProceedToReports) {
          onProceedToReports();
        } else if (onSaved) {
          onSaved();
        } else {
          navigate({ to: "/teacher/hpc/reports" });
        }
      } else {
        if (onSaved) onSaved();
      }
    } catch (err: any) {
      toast.error("अहवाल सेव्ह करताना त्रुटी: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
        <Loader2 className="size-8 text-indigo-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-600">वार्षिक अहवाल लोड होत आहे...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="size-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-5" />
            </button>
          )}
          <div className="size-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center font-black text-xl shadow-md overflow-hidden">
            <Award className="size-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                भाग क (Part C)
              </span>
              <span className="text-xs font-bold text-slate-500">
                हजेरी क्र: <b className="text-slate-800">{student?.rollNo}</b>
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              वार्षिक सर्वंकष प्रगती गोषवारा (Annual Summary)
            </h2>
            <p className="text-xs text-slate-500 font-semibold">
              {student?.fullName || student?.name} | {classId} वर्ग | {academicYear}
            </p>
          </div>
        </div>

        <button
          onClick={() => handleSave(true)}
          disabled={saving}
          className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-black shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          <span>जतन करा आणि HPC अहवाल (PDF) पहा →</span>
        </button>
      </div>

      {/* Attendance Summary Strip */}
      {attendance && (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Calendar className="size-5 text-indigo-300" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-200">
                  वार्षिक उपस्थिती अहवाल (Annual Attendance)
                </p>
                <p className="text-sm font-black text-white">
                  एकूण उपस्थिती: {attendance.annualTotalPresent} / {attendance.annualTotalWorking} दिवस
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">
                  वार्षिक टक्केवारी:
                </span>
                <p className="text-xl font-black text-emerald-400">
                  {attendance.attendancePercentage}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Area / Subject-wise Annual Evaluation Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <h3 className="text-base font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
          <BookOpen className="size-5 text-indigo-600" />
          <span>
            {isFoundational
              ? "विकास क्षेत्रनिहाय वार्षिक प्रगती व स्तर (Developmental Area Summary)"
              : "विषयनिहाय वार्षिक प्रगती व स्तर (Subject-wise Annual Summary)"}
          </span>
        </h3>

        <div className="space-y-4">
          {areas.map((area) => {
            const current = areaSummaries[area.id] || {
              areaOrSubjectId: area.id,
              areaOrSubjectNameMarathi: area.nameMarathi,
              finalLevel: "proficient",
              qualitativeRemarks: "",
            };

            const activeLevelKey = (current.finalLevel || "proficient") as "beginner" | "proficient" | "advanced";
            const selectedLevelLabel = isFoundational
              ? activeLevelKey === "beginner"
                ? "प्रवाह (निर्झर)"
                : activeLevelKey === "proficient"
                ? "पर्वत"
                : "आकाश"
              : activeLevelKey === "beginner"
              ? "प्रारंभिक"
              : activeLevelKey === "proficient"
              ? "प्रवीण"
              : "प्रगत";

            const matchingRemarks = dynamicRemarks.filter(
              (rem) =>
                matchAreaName(area.nameMarathi, rem.subjectOrArea) &&
                matchLevel(activeLevelKey, rem.level)
            );

            return (
              <div
                key={area.id}
                className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                      {area.code}
                    </span>
                    <span className="text-sm font-black text-slate-900">{area.nameMarathi}</span>
                  </div>

                  {/* Level Radio/Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(["beginner", "proficient", "advanced"] as const).map((lvl) => {
                      const isSelected = current.finalLevel === lvl;
                      const label = isFoundational
                        ? lvl === "beginner"
                          ? "प्रवाह (निर्झर)"
                          : lvl === "proficient"
                          ? "पर्वत"
                          : "आकाश"
                        : lvl === "beginner"
                        ? "प्रारंभिक"
                        : lvl === "proficient"
                        ? "प्रवीण"
                        : "प्रगत";

                      return (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => updateAreaSummary(area.id, "finalLevel", lvl)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-slate-900 text-white shadow-xs"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Remarks Dropdown & Textarea for selected level */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-purple-600" />
                      <span>{selectedLevelLabel} स्तरासाठीचे तयार शेरे (Sheet 3 Remarks):</span>
                    </label>
                    {matchingRemarks.length > 0 && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                        {matchingRemarks.length} पर्याय उपलब्ध
                      </span>
                    )}
                  </div>

                  {matchingRemarks.length > 0 ? (
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          updateAreaSummary(area.id, "qualitativeRemarks", e.target.value);
                          toast.success("अभिप्राय निवडला!");
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-50/90 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-300 transition-all cursor-pointer"
                    >
                      <option value="">
                        -- {selectedLevelLabel} स्तरासाठीचा शिक्षकांचा शेरा निवडा ({matchingRemarks.length} पर्याय) --
                      </option>
                      {matchingRemarks.map((rem, rIdx) => (
                        <option key={rem.id || rIdx} value={rem.remarkText}>
                          {rIdx + 1}. {rem.remarkText}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">या स्तरासाठी शेरे उपलब्ध नाहीत.</p>
                  )}

                  <textarea
                    rows={2}
                    value={current.qualitativeRemarks || ""}
                    onChange={(e) => updateAreaSummary(area.id, "qualitativeRemarks", e.target.value)}
                    placeholder="वरील ड्रॉपडाउनमधून शेरा निवडा किंवा स्वतःची प्रगती व गुणात्मक नोंद टाईप करा..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all leading-relaxed"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Final Comprehensive Teacher Remarks (Sheet 4) & Next Class Recommendation (Sheet 5) */}
        <div className="pt-6 border-t border-slate-100 space-y-6">
          {/* 1. Final Comprehensive Teacher Remarks */}
          <div className="p-4 sm:p-5 rounded-2xl border border-indigo-200/90 bg-indigo-50/20 space-y-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-indigo-100">
              <label className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Sparkles className="size-4 text-indigo-600" />
                <span>शिक्षकांचा अंतिम सर्वंकष वार्षिक अभिप्राय (Teacher's Final Comprehensive Remarks) *</span>
              </label>

              {/* Level Options (No "All" option - user must select level) */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500 mr-1">स्तर निवडा:</span>
                {[
                  { key: "nirjhar", label: "प्रवाह (निर्झर)" },
                  { key: "parvat", label: "पर्वत" },
                  { key: "aakash", label: "आकाश" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFinalRemarksLevelFilter(tab.key)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      finalRemarksLevelFilter === tab.key
                        ? "bg-indigo-600 text-white shadow-2xs ring-2 ring-indigo-200"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dropdown Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-indigo-900">
                  तयार अंतिम सर्वंकष शेऱ्यांमधून निवडा (Sheet 4 Remarks):
                </span>
                {finalRemarksLevelFilter ? (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    {availableFinalRemarks.length} पर्याय उपलब्ध
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                    आधी स्तर निवडा
                  </span>
                )}
              </div>

              <select
                value=""
                disabled={!finalRemarksLevelFilter}
                onChange={(e) => {
                  if (e.target.value) {
                    setFinalTeacherRemarks(e.target.value);
                    toast.success("अंतिम सर्वंकष वार्षिक अभिप्राय निवडला व भरला गेला!");
                  }
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all shadow-2xs ${
                  !finalRemarksLevelFilter
                    ? "bg-slate-50 text-slate-400 cursor-not-allowed"
                    : "bg-white hover:bg-indigo-50/40 cursor-pointer"
                }`}
              >
                <option value="">
                  {!finalRemarksLevelFilter
                    ? "-- कृपया आधी कामगिरी स्तर निवडा (प्रवाह / पर्वत / आकाश) --"
                    : `-- तयार अंतिम सर्वंकष शेरा निवडा (${availableFinalRemarks.length} पर्याय उपलब्ध) --`}
                </option>
                {availableFinalRemarks.map((rem, idx) => {
                  const { cleanTitle, cleanSnippet, cleanFullText } = cleanDisplayOption(
                    rem.remarkText,
                    rem.title
                  );
                  return (
                    <option key={rem.id || idx} value={cleanFullText}>
                      {idx + 1}. {cleanTitle} — {cleanSnippet.slice(0, 85)}...
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Editable Textarea */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">
                शेरा संपादित करा किंवा स्वतःचा अभिप्राय लिहा:
              </span>
              <textarea
                rows={4}
                value={finalTeacherRemarks}
                onChange={(e) => setFinalTeacherRemarks(e.target.value)}
                placeholder="उदा. विद्यार्थ्याचा संकोची स्वभाव कमी होऊन आत्मविश्वास वाढला आहे. विविध उपक्रमांत सहभाग उत्साहवर्धक आहे..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 leading-relaxed shadow-2xs"
              />
            </div>
          </div>

          {/* 2. Next Class Recommendation */}
          <div className="p-4 sm:p-5 rounded-2xl border border-teal-200/90 bg-teal-50/20 space-y-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-teal-100">
              <label className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Sparkles className="size-4 text-teal-600" />
                <span>पुढील इयत्तेसाठी मार्गदर्शन व शिफारस (Next Class Recommendation)</span>
              </label>

              {/* Level Options (No "All" option - user must select level) */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500 mr-1">स्तर निवडा:</span>
                {[
                  { key: "nirjhar", label: "प्रवाह (निर्झर)" },
                  { key: "parvat", label: "पर्वत" },
                  { key: "aakash", label: "आकाश" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setRecommendationLevelFilter(tab.key)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      recommendationLevelFilter === tab.key
                        ? "bg-teal-600 text-white shadow-2xs ring-2 ring-teal-200"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dropdown Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-teal-900">
                  तयार शिफारस व मार्गदर्शनामधून निवडा (Sheet 5 Recommendations):
                </span>
                {recommendationLevelFilter ? (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                    {availableRecommendations.length} पर्याय उपलब्ध
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                    आधी स्तर निवडा
                  </span>
                )}
              </div>

              <select
                value=""
                disabled={!recommendationLevelFilter}
                onChange={(e) => {
                  if (e.target.value) {
                    setRecommendationsForNextClass(e.target.value);
                    toast.success("पुढील इयत्तेसाठी शिफारस निवडली व भरली गेली!");
                  }
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl border border-teal-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-300 transition-all shadow-2xs ${
                  !recommendationLevelFilter
                    ? "bg-slate-50 text-slate-400 cursor-not-allowed"
                    : "bg-white hover:bg-teal-50/40 cursor-pointer"
                }`}
              >
                <option value="">
                  {!recommendationLevelFilter
                    ? "-- कृपया आधी कामगिरी स्तर निवडा (प्रवाह / पर्वत / आकाश) --"
                    : `-- तयार शिफारस निवडा (${availableRecommendations.length} पर्याय उपलब्ध) --`}
                </option>
                {availableRecommendations.map((rec, idx) => {
                  const { cleanTitle, cleanSnippet, cleanFullText } = cleanDisplayOption(
                    rec.recommendationText,
                    rec.title
                  );
                  return (
                    <option key={rec.id || idx} value={cleanFullText}>
                      {idx + 1}. {cleanTitle} — {cleanSnippet.slice(0, 85)}...
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Editable Textarea */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">
                शिफारस संपादित करा किंवा स्वतःची नोंद लिहा:
              </span>
              <textarea
                rows={3}
                value={recommendationsForNextClass}
                onChange={(e) => setRecommendationsForNextClass(e.target.value)}
                placeholder="उदा. पुढील इयत्तेत प्रवेशास पात्र / वाचन व गणिताचा नियमित सराव चालू ठेवावा."
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold bg-white text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 leading-relaxed shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Bottom Save Action */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          {onBack && (
            <button
              onClick={onBack}
              type="button"
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              रद्द करा (Cancel)
            </button>
          )}
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs sm:text-sm font-black shadow-md shadow-emerald-500/20 hover:from-emerald-700 hover:to-teal-700 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            <span>वार्षिक अहवाल जतन करा आणि HPC अहवाल (PDF) पहा →</span>
          </button>
        </div>
      </div>
    </div>
  );
}
