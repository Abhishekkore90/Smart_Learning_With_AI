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
} from "../services/hpcService";

interface HpcAnnualSummaryFormProps {
  studentId: string;
  academicYear: string;
  stageId: HpcStageId;
  classId: string;
  onBack?: () => void;
  onSaved?: () => void;
  onProceedToReports?: () => void;
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

  const areas = useMemo(() => getAreasForStage(stageId), [stageId]);
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
        // Initialize area summaries
        const initialSummaries: any = {};
        areas.forEach((a) => {
          initialSummaries[a.id] = {
            areaOrSubjectId: a.id,
            areaOrSubjectNameMarathi: a.nameMarathi,
            finalLevel: "proficient",
            qualitativeRemarks: "समाधानकारक प्रगती दिसून येत आहे.",
          };
        });
        setAreaSummaries(initialSummaries);
        setFinalTeacherRemarks(isFoundational ? defaultFoundationalRemarks : "");
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

            return (
              <div
                key={area.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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

                <div>
                  <input
                    type="text"
                    value={current.qualitativeRemarks || ""}
                    onChange={(e) => updateAreaSummary(area.id, "qualitativeRemarks", e.target.value)}
                    placeholder="या क्षेत्रातील विद्यार्थ्याची प्रगती व गुणात्मक नोंद..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-800"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Final Comprehensive Teacher Remarks */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div>
            <label className="block text-sm font-black text-slate-900 mb-2">
              शिक्षकांचा अंतिम सर्वंकष वार्षिक अभिप्राय (Teacher's Final Comprehensive Remarks) *
            </label>
            <textarea
              rows={4}
              value={finalTeacherRemarks}
              onChange={(e) => setFinalTeacherRemarks(e.target.value)}
              placeholder="उदा. विद्यार्थ्याचा संकोची स्वभाव कमी होऊन आत्मविश्वास वाढला आहे. विविध उपक्रमांत सहभाग उत्साहवर्धक आहे..."
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium text-slate-800 bg-slate-50/50 focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              पुढील इयत्तेसाठी मार्गदर्शन व शिफारस (Next Class Recommendation):
            </label>
            <input
              type="text"
              value={recommendationsForNextClass}
              onChange={(e) => setRecommendationsForNextClass(e.target.value)}
              placeholder="उदा. पुढील इयत्तेत प्रवेशास पात्र / वाचन व गणिताचा नियमित सराव चालू ठेवावा."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50/50 text-slate-800"
            />
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
