import { createFileRoute, useParams, useNavigate, useSearch } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { HpcAssessmentForm } from "@/hpc/components/HpcAssessmentForm";
import { HpcAnnualSummaryForm } from "@/hpc/components/HpcAnnualSummaryForm";
import { getHpcStudentById, StudentInfoSummary } from "@/hpc/services/hpcService";
import { HpcStageId } from "@/hpc/types/hpc";
import { Loader2, ArrowLeft, BookOpen, Award, Sparkles } from "lucide-react";
import { getCurrentAcademicYear } from "@/hpc/utils/academicYear";

export const Route = createFileRoute("/teacher/hpc/assessment/$studentId")({
  validateSearch: (search: Record<string, unknown>): { session?: "session1" | "session2"; tab?: "assessment" | "annual" } => {
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

  const academicYear = localStorage.getItem("cce_academic_year") || getCurrentAcademicYear();

  useEffect(() => {
    if (studentId) {
      localStorage.setItem("hpc_last_student_id", studentId);
    }
  }, [studentId]);

  useEffect(() => {
    if (search.tab) {
      setActiveTab(search.tab);
    }
  }, [search.tab]);

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
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate({ to: "/teacher/hpc/students" })}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-900 hover:text-white text-slate-800 border border-slate-200 hover:border-slate-900 rounded-2xl text-xs sm:text-sm font-black transition-all shadow-xs cursor-pointer group"
          >
            <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
            <span>विद्यार्थी यादीवर परत जा (Back to Students List)</span>
          </button>
          <button
            onClick={() => navigate({ to: "/teacher/hpc" })}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="size-3.5" />
            <span>HPC डॅशबोर्ड</span>
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
          onProceedToPartC={() => {
            setActiveTab("annual");
            navigate({
              to: "/teacher/hpc/assessment/$studentId",
              params: { studentId },
              search: { tab: "annual" } as any,
            });
            window.scrollTo({ top: 120, behavior: "smooth" });
          }}
        />
      ) : (
        <HpcAnnualSummaryForm
          studentId={studentId}
          academicYear={academicYear}
          stageId={stageId}
          classId={classId}
          onBack={() => setActiveTab("assessment")}
          onSaved={() => {
            navigate({ to: "/teacher/hpc/reports" });
          }}
          onProceedToReports={() => {
            navigate({ to: "/teacher/hpc/reports" });
          }}
        />
      )}
    </div>
  );
}
