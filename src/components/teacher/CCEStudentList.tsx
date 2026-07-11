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
<<<<<<< HEAD
  return (
    <CCEStudentInfo
      selectedClass={selectedClass}
      onBack={onBack}
    />
  );
=======
  return <CCEStudentInfo selectedClass={selectedClass} onBack={onBack} />;
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
}
