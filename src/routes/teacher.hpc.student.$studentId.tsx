import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { HpcStudentProfileForm } from "@/hpc/components/HpcStudentProfileForm";
import { getHpcStudentById, StudentInfoSummary } from "@/hpc/services/hpcService";
import { HpcStageId } from "@/hpc/types/hpc";
import { Loader2 } from "lucide-react";
import { getCurrentAcademicYear } from "@/hpc/utils/academicYear";

export const Route = createFileRoute("/teacher/hpc/student/$studentId")({
  head: () => ({
    meta: [{ title: "विद्यार्थी प्रोफाईल (भाग अ) — HPC समग्र प्रगतिपत्रक" }],
  }),
  component: TeacherHpcStudentProfilePage,
});

function TeacherHpcStudentProfilePage() {
  const { studentId } = useParams({ from: "/teacher/hpc/student/$studentId" });
  const navigate = useNavigate();

  const [student, setStudent] = useState<StudentInfoSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const academicYear = localStorage.getItem("cce_academic_year") || getCurrentAcademicYear();

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      const st = await getHpcStudentById(studentId);
      if (isMounted) {
        setStudent(st);
        setLoading(false);
        if (st) {
          const cls = st.class || "1st";
          let stg: HpcStageId = "foundational";
          if (["3rd", "4th", "5th"].includes(cls)) stg = "preparatory";
          else if (["6th", "7th", "8th"].includes(cls)) stg = "middle";

          localStorage.setItem("hpc_last_student_id", studentId);
          localStorage.setItem(`hpc_last_student_${cls}`, studentId);
          localStorage.setItem("hpc_selected_class", cls);
          localStorage.setItem("hpc_selected_stage", stg);
          window.dispatchEvent(
            new CustomEvent("hpc_class_changed", {
              detail: { cls, stageId: stg },
            })
          );
        }
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
        <p className="text-sm font-bold text-slate-600">विद्यार्थी माहिती लोड होत आहे...</p>
      </div>
    );
  }

  const classId = student?.class || "1st";
  let stageId: HpcStageId = "foundational";
  if (["3rd", "4th", "5th"].includes(classId)) stageId = "preparatory";
  else if (["6th", "7th", "8th"].includes(classId)) stageId = "middle";

  return (
    <div className="py-2">
      <HpcStudentProfileForm
        studentId={studentId}
        academicYear={academicYear}
        stageId={stageId}
        classId={classId}
        initialTab="a1"
        onBack={() => navigate({ to: "/teacher/hpc/students" })}
        onSaved={() => navigate({ to: "/teacher/hpc/students" })}
        onProceedToPartB={() => {
          navigate({
            to: "/teacher/hpc/assessment/$studentId",
            params: { studentId },
            search: { session: "session1", tab: "assessment" } as any,
          });
        }}
      />
    </div>
  );
}
