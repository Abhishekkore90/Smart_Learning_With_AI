import { auth } from "./firebase";
import { normalizeClassKey, isStudentSemiEnglish, isSemiMedium } from "../result/firestoreMarksHelper";

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
 * Robust Multi-Tenant Student Matcher:
 * Checks Class Normalization + Teacher ID Matching (with global/fallback support) + Medium Matching
 */
export const matchStudentTeacherClassAndMedium = (student, currentTeacherId, selectedClass, selectedMedium, targetAcademicYear = null) => {
  if (!student) return false;

  // 1. Strict Teacher ID Isolation: Each teacher ONLY sees their OWN students
  const activeTeacherId = currentTeacherId || (typeof localStorage !== "undefined" ? localStorage.getItem("current_teacher_id") : null);
  const sTeacherId = student.teacherId || student.createdById || student.userId;

  if (activeTeacherId && activeTeacherId !== "admin" && activeTeacherId !== "super_admin") {
    if (!sTeacherId || (sTeacherId !== activeTeacherId && sTeacherId !== "global")) {
      return false;
    }
  }

  // 2. Strict Class Matching
  const stdClass = normalizeClassKey(student.class || student.currentClass || student.className || student.stdClass);
  const tgtClass = normalizeClassKey(selectedClass);
  if (tgtClass && stdClass && stdClass !== tgtClass) return false;

  // 3. Strict Academic Year Matching
  if (targetAcademicYear && student.academicYear) {
    const stdYr = String(student.academicYear).trim();
    const tgtYr = String(targetAcademicYear).trim();
    const mStd = stdYr.match(/(\d{4})/);
    const mTgt = tgtYr.match(/(\d{4})/);
    if (mStd && mTgt && mStd[1] !== mTgt[1]) return false;
  }

  // 4. Strict Medium Isolation: Marathi vs Semi-English MUST NEVER MIX
  const targetIsSemi = isSemiMedium(selectedMedium);
  const studentIsSemi = isStudentSemiEnglish(student);
  if (targetIsSemi !== studentIsSemi) {
    return false;
  }

  return true;
};
