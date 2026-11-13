import { createFileRoute, useParams, useNavigate, useSearch } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { HpcAssessmentForm } from "@/hpc/components/HpcAssessmentForm";
import { HpcAnnualSummaryForm } from "@/hpc/components/HpcAnnualSummaryForm";
import { getHpcStudentById, StudentInfoSummary } from "@/hpc/services/hpcService";
import { HpcStageId } from "@/hpc/types/hpc";
import { Loader2, ArrowLeft, BookOpen, Award, Sparkles } from "lucide-react";

export const Route = createFileRoute("/teacher/hpc/assessment/$studentId")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      session: (search.session as "session1" | "session2") || "session1",
      tab: (search.tab as "assessment" | "annual") || "assessment",
    };
  },
  head: () => ({
    meta: [{ title: "HPC मूल्यमापन नोंद (Part B & C) — SMART LEARNING" }],
  }),
  component: TeacherHpcAssessmentPage,
});

function TeacherHpcAssessmentPage() {
  const { studentId } = useParams({ from: "/teacher/hpc/assessment/$studentId" });
  const search = useSearch({ from: "/teacher/hpc/assessment/$studentId" });
  const navigate = useNavigate();

  const [student, setStudent] = useState<StudentInfoSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"assessment" | "annual">(
    search.tab || "assessment"
  );
  const [activeSession, setActiveSession] = useState<"session1" | "session2">(
    search.session || "session1"
  );

  const academicYear = localStorage.getItem("cce_academic_year") || "2025-2026";

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      const st = await getHpcStudentById(studentId);
      if (isMounted) {
        setStudent(st);
        setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [studentId]);

  if (loading) {
    return (
      <div className="p-16 text-center">
        <Loader2 className="size-8 text-indigo-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-600">विद्यार्थी मूल्यमापन लोड होत आहे...</p>
      </div>
    );
  }

  const classId = student?.class || "1st";
  let stageId: HpcStageId = "foundational";
  if (["3rd", "4th", "5th"].includes(classId)) stageId = "preparatory";
  else if (["6th", "7th", "8th"].includes(classId)) stageId = "middle";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Tab Bar: Assessment vs Annual Summary */}
      <div className="bg-white rounded-3xl p-3 border border-slate-200 shadow-sm flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate({ to: "/teacher/hpc" })}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          <span>HPC डॅशबोर्डवर परत जा</span>
        </button>

        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab("assessment")}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === "assessment"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookOpen className="size-3.5" />
            <span>भाग ब: सत्रनिहाय मूल्यमापन</span>
          </button>

          <button
            onClick={() => setActiveTab("annual")}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === "annual"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Award className="size-3.5" />
            <span>भाग क: वार्षिक सर्वंकष गोषवारा</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "assessment" ? (
        <HpcAssessmentForm
          studentId={studentId}
          academicYear={academicYear}
          stageId={stageId}
          classId={classId}
          session={activeSession}
          onBack={() => navigate({ to: "/teacher/hpc" })}
          onSaved={() => {}}
        />
      ) : (
        <HpcAnnualSummaryForm
          studentId={studentId}
          academicYear={academicYear}
          stageId={stageId}
          classId={classId}
          onBack={() => setActiveTab("assessment")}
          onSaved={() => {}}
        />
      )}
    </div>
  );
}
