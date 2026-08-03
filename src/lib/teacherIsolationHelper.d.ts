declare module "@/lib/teacherIsolationHelper" {
  export function getTeacherId(user?: any, profile?: any): string;
  export function getTeacherDocId(teacherId?: string, key?: string): string;
  export function matchStudentTeacherClassAndMedium(
    student: any,
    currentTeacherId: string,
    selectedClass: string,
    selectedMedium: string
  ): boolean;
}
