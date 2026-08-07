import { auth } from "./firebase";
import { normalizeClassKey, isStudentSemiEnglish } from "../result/firestoreMarksHelper";

/**
 * Get current logged in teacher ID (unique per Firebase user login)
 */
export const getTeacherId = (user = null, profile = null) => {
  if (user?.uid) {
    if (typeof localStorage !== "undefined") localStorage.setItem("current_teacher_id", user.uid);
    return user.uid;
  }
  if (profile?.id || profile?.teacherId) {
    const tid = profile.id || profile.teacherId;
    if (typeof localStorage !== "undefined") localStorage.setItem("current_teacher_id", tid);
    return tid;
  }
  if (auth?.currentUser?.uid) {
    const tid = auth.currentUser.uid;
    if (typeof localStorage !== "undefined") localStorage.setItem("current_teacher_id", tid);
    return tid;
  }
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem("current_teacher_id") || localStorage.getItem("user_id");
    if (stored) return stored;
  }
  return "default_teacher";
};

/**
 * Build teacher-scoped document keys for Firestore & Bunny Storage & LocalStorage
 */
export const getTeacherDocId = (teacherId, key) => {
  const tId = teacherId || getTeacherId();
  return `${tId}_${key}`;
};

/**
 * Strict Multi-Tenant Student Matcher:
 * Checks Teacher Isolation + Class Normalization + Medium Isolation
 */
export const matchStudentTeacherClassAndMedium = (student, currentTeacherId, selectedClass, selectedMedium) => {
  if (!student) return false;

  // 1. Teacher ID Isolation (with fallback for unbound / general students)
  const sTeacherId = student.teacherId || student.createdById || student.userId;
  if (
    currentTeacherId &&
    currentTeacherId !== "default_teacher" &&
    sTeacherId &&
    sTeacherId !== "default_teacher"
  ) {
    if (sTeacherId !== currentTeacherId) return false;
  }

  // 2. Class Normalization Matching
  const stdClass = normalizeClassKey(student.class || student.currentClass || student.className);
  const tgtClass = normalizeClassKey(selectedClass);
  if (stdClass !== tgtClass) return false;

  // 3. Medium Isolation Matching (Strict Semi vs Marathi)
  const isSemi = isStudentSemiEnglish(student);
  const targetIsSemi = String(selectedMedium || "marathi").toLowerCase().trim() === "semi";
  return targetIsSemi ? isSemi : !isSemi;
};
