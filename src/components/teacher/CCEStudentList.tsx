import { CCEStudentInfo } from "./CCEStudentInfo";

export function CCEStudentList({
  selectedClass,
  academicYear,
  onBack,
  onViewReport,
}: {
  selectedClass: string;
  academicYear: string;
  onBack: () => void;
  onViewReport: (studentName: string) => void;
}) {
  return (
    <CCEStudentInfo
      selectedClass={selectedClass}
      onBack={onBack}
    />
  );
}
