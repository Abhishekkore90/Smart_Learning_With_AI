import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { HpcStudentProfileForm } from "@/hpc/components/HpcStudentProfileForm";
import { getHpcStudentById, StudentInfoSummary } from "@/hpc/services/hpcService";
import { HpcStageId } from "@/hpc/types/hpc";
import { Loader2 } from "lucide-react";

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
        onBack={() => navigate({ to: "/teacher/hpc/students" })}
        onSaved={() => navigate({ to: "/teacher/hpc/students" })}
      />
    </div>
  );
}
