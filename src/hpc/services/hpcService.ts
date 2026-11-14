import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import {
  HpcStudentProfile,
  HpcSessionAssessment,
  HpcAnnualSummary,
  HpcStageId,
} from "../types/hpc";
// @ts-ignore
import { matchStudentClassAndMedium } from "@/result/firestoreMarksHelper";
// @ts-ignore
import { getTeacherId, matchStudentTeacherClassAndMedium } from "@/lib/teacherIsolationHelper";

export interface StudentInfoSummary {
  id: string;
  name: string;
  fullName?: string;
  rollNo?: string;
  gender?: string;
  class?: string;
  division?: string;
  photoUrl?: string;
  dob?: string;
  saralId?: string;
  aadhaar?: string;
  aparId?: string;
  address?: string;
  parentName?: string;
  parentPhone?: string;
  parentOccupation?: string;
  parentEducation?: string;
  teacherName?: string;
  schoolName?: string;
}

export interface HpcStudentProgressItem {
  student: StudentInfoSummary;
  profileCompleted: boolean;
  session1Completed: boolean;
  session2Completed: boolean;
  annualCompleted: boolean;
  overallStatus: "pending" | "in_progress" | "completed";
}

/**
 * Fetch students for HPC from existing `users` collection (READ-ONLY)
 */
export async function getHpcStudents(
  classId: string,
  selectedMedium: string = "marathi",
  teacherId?: string
): Promise<StudentInfoSummary[]> {
  try {
    const q = query(collection(db, "users"), where("role", "==", "student"));
    const snap = await getDocs(q);
    const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

    const filtered = raw.filter((s) => {
      if (teacherId) {
        return matchStudentTeacherClassAndMedium(s, teacherId, classId, selectedMedium);
      }
      return matchStudentClassAndMedium(s, classId, selectedMedium);
    });

    // Also fetch student_details for personal fields
    const detailsSnap = await getDocs(collection(db, "student_details"));
    const detailsMap: Record<string, any> = {};
    detailsSnap.forEach((d) => {
      detailsMap[d.id] = d.data();
    });

    const list: StudentInfoSummary[] = filtered.map((s) => {
      const d = detailsMap[s.id] || {};
      return {
        id: s.id,
        name: s.fullName || s.name || "विद्यार्थी",
        fullName: s.fullName || s.name || "",
        rollNo: s.rollNo || "0",
        gender: s.gender || "male",
        class: s.class || classId,
        division: d.division || s.division || "अ",
        photoUrl: s.photoUrl || d.photoUrl || "",
        dob: d.dob || s.dob || "",
        saralId: d.studentId || s.studentId || s.saralId || "",
        aadhaar: d.aadhar || s.aadhar || "",
        aparId: d.aparId || s.aparId || "",
        address: d.address || s.address || "",
        parentName: s.parentName || d.fatherName || d.motherName || "",
        parentPhone: d.phone || s.phone || "",
        parentOccupation: d.fatherOccupation || d.motherOccupation || "",
        parentEducation: d.fatherEducation || d.motherEducation || "",
      };
    });

    return list.sort((a, b) => parseInt(a.rollNo || "999") - parseInt(b.rollNo || "999"));
  } catch (err) {
    console.error("Error fetching HPC students:", err);
    return [];
  }
}

/**
 * Fetch single student details (from users + student_details)
 */
export async function getHpcStudentById(studentId: string): Promise<StudentInfoSummary | null> {
  try {
    const userDocRef = doc(db, "users", studentId);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) return null;

    const s = { id: userSnap.id, ...userSnap.data() } as any;

    const detailsRef = doc(db, "student_details", studentId);
    const detailsSnap = await getDoc(detailsRef);
    const d = detailsSnap.exists() ? detailsSnap.data() : {};

    return {
      id: s.id,
      name: s.fullName || s.name || "विद्यार्थी",
      fullName: s.fullName || s.name || "",
      rollNo: s.rollNo || "0",
      gender: s.gender || "male",
      class: s.class || "",
      division: d.division || s.division || "अ",
      photoUrl: s.photoUrl || d.photoUrl || "",
      dob: d.dob || s.dob || "",
      saralId: d.studentId || s.studentId || s.saralId || "",
      aadhaar: d.aadhar || s.aadhar || "",
      aparId: d.aparId || s.aparId || "",
      address: d.address || s.address || "",
      parentName: s.parentName || d.fatherName || d.motherName || "",
      parentPhone: d.phone || s.phone || "",
      parentOccupation: d.fatherOccupation || d.motherOccupation || "",
      parentEducation: d.fatherEducation || d.motherEducation || "",
    };
  } catch (err) {
    console.error("Error fetching student by ID:", err);
    return null;
  }
}

/**
 * Fetch School General Settings (School name, cluster, HM, etc.)
 */
export async function getHpcSchoolSettings(): Promise<any> {
  try {
    const snap = await getDoc(doc(db, "school_settings", "general"));
    return snap.exists() ? snap.data() : {};
  } catch (err) {
    console.error("Error fetching school settings:", err);
    return {};
  }
}

/**
 * Fetch Student Attendance from CCE attendance records (READ-ONLY)
 */
export async function getHpcStudentAttendance(
  classId: string,
  academicYear: string,
  studentId: string
) {
  try {
    const ref = doc(db, "cce_attendance", `${classId}_${academicYear}_monthly`);
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data().records) {
      const recs = snap.data().records;
      const studentRec = recs[studentId] || {};

      // Months
      // Term 1: june, july, august, september, october
      const term1Months = ["june", "july", "august", "september", "october"];
      // Term 2: november, december, january, february, march, april
      const term2Months = ["november", "december", "january", "february", "march", "april"];

      let t1Present = 0;
      let t2Present = 0;

      term1Months.forEach((m) => {
        t1Present += Number(studentRec[m] || 0);
      });
      term2Months.forEach((m) => {
        t2Present += Number(studentRec[m] || 0);
      });

      // Default standard working days in Maharashtra schools if not recorded
      const t1Working = 110;
      const t2Working = 115;
      const totalWorking = t1Working + t2Working;
      const totalPresent = t1Present + t2Present;
      const pct = totalWorking > 0 ? ((totalPresent / totalWorking) * 100).toFixed(1) : "0.0";

      return {
        term1: {
          june: studentRec.june || 0,
          july: studentRec.july || 0,
          august: studentRec.august || 0,
          september: studentRec.september || 0,
          october: studentRec.october || 0,
          totalWorking: t1Working,
          totalPresent: t1Present,
        },
        term2: {
          november: studentRec.november || 0,
          december: studentRec.december || 0,
          january: studentRec.january || 0,
          february: studentRec.february || 0,
          march: studentRec.march || 0,
          april: studentRec.april || 0,
          totalWorking: t2Working,
          totalPresent: t2Present,
        },
        annualTotalWorking: totalWorking,
        annualTotalPresent: totalPresent,
        attendancePercentage: pct,
      };
    }
  } catch (err) {
    console.error("Error reading attendance:", err);
  }

  // Fallback default attendance structure
  return {
    term1: { june: 0, july: 0, august: 0, september: 0, october: 0, totalWorking: 110, totalPresent: 0 },
    term2: { november: 0, december: 0, january: 0, february: 0, march: 0, april: 0, totalWorking: 115, totalPresent: 0 },
    annualTotalWorking: 225,
    annualTotalPresent: 0,
    attendancePercentage: "0.0",
  };
}

// ---------------- HPC Student Profile (Part A) ----------------
export async function getHpcStudentProfile(
  studentId: string,
  academicYear: string
): Promise<HpcStudentProfile | null> {
  try {
    const docId = `${studentId}_${academicYear}`;
    const snap = await getDoc(doc(db, "hpc_student_profiles", docId));
    if (snap.exists()) {
      return snap.data() as HpcStudentProfile;
    }
    return null;
  } catch (err) {
    console.error("Error fetching HPC profile:", err);
    return null;
  }
}

export async function saveHpcStudentProfile(profile: HpcStudentProfile): Promise<boolean> {
  try {
    const docId = `${profile.studentId}_${profile.academicYear}`;
    await setDoc(doc(db, "hpc_student_profiles", docId), {
      ...profile,
      updatedAt: new Date().toISOString(),
    });

    // Also sync to student_details if fields provided
    try {
      const detailsRef = doc(db, "student_details", profile.studentId);
      const studentDetailsUpdate: Record<string, any> = {};
      if (profile.fullName) studentDetailsUpdate.fullName = profile.fullName;
      if (profile.dob) studentDetailsUpdate.dob = profile.dob;
      if (profile.homeAddress) studentDetailsUpdate.address = profile.homeAddress;
      if (profile.saralId) studentDetailsUpdate.studentId = profile.saralId;
      if (profile.aadhaar) studentDetailsUpdate.aadhar = profile.aadhaar;
      if (profile.aparId) studentDetailsUpdate.aparId = profile.aparId;
      if (profile.parentPhone) studentDetailsUpdate.phone = profile.parentPhone;
      if (profile.bloodGroup) studentDetailsUpdate.bloodGroup = profile.bloodGroup;
      if (profile.caste) studentDetailsUpdate.caste = profile.caste;
      if (profile.category) studentDetailsUpdate.category = profile.category;
      if (profile.parentName) studentDetailsUpdate.fatherName = profile.parentName;
      if (profile.parentOccupation) studentDetailsUpdate.fatherOccupation = profile.parentOccupation;
      if (profile.parentEducation) studentDetailsUpdate.fatherEducation = profile.parentEducation;

      if (Object.keys(studentDetailsUpdate).length > 0) {
        await setDoc(detailsRef, studentDetailsUpdate, { merge: true });
      }
    } catch (e) {
      console.warn("Could not sync to student_details:", e);
    }

    // Also update cce_attendance monthly record if monthlyAttendance provided
    if (profile.monthlyAttendance && profile.classId && profile.academicYear) {
      try {
        const attRef = doc(db, "cce_attendance", `${profile.classId}_${profile.academicYear}_monthly`);
        const snap = await getDoc(attRef);
        const currentData = snap.exists() ? snap.data() : { records: {} };
        const records = currentData.records || {};
        records[profile.studentId] = {
          ...(records[profile.studentId] || {}),
          ...profile.monthlyAttendance,
        };
        if (profile.rollNo) {
          records[profile.rollNo] = {
            ...(records[profile.rollNo] || {}),
            ...profile.monthlyAttendance,
          };
        }
        await setDoc(attRef, { records }, { merge: true });
      } catch (e) {
        console.warn("Could not sync to cce_attendance:", e);
      }
    }

    return true;
  } catch (err) {
    console.error("Error saving HPC profile:", err);
    throw err;
  }
}

// ---------------- HPC Assessments (Part B) ----------------
export async function getHpcSessionAssessment(
  studentId: string,
  academicYear: string,
  session: "session1" | "session2"
): Promise<HpcSessionAssessment | null> {
  try {
    const docId = `${studentId}_${academicYear}_${session}`;
    const snap = await getDoc(doc(db, "hpc_assessments", docId));
    if (snap.exists()) {
      return snap.data() as HpcSessionAssessment;
    }
    return null;
  } catch (err) {
    console.error("Error fetching HPC assessment:", err);
    return null;
  }
}

export async function saveHpcSessionAssessment(
  assessment: HpcSessionAssessment
): Promise<boolean> {
  try {
    const docId = `${assessment.studentId}_${assessment.academicYear}_${assessment.session}`;
    await setDoc(doc(db, "hpc_assessments", docId), {
      ...assessment,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.error("Error saving HPC assessment:", err);
    throw err;
  }
}

// ---------------- HPC Annual Summary (Part C) ----------------
export async function getHpcAnnualSummary(
  studentId: string,
  academicYear: string
): Promise<HpcAnnualSummary | null> {
  try {
    const docId = `${studentId}_${academicYear}`;
    const snap = await getDoc(doc(db, "hpc_annual_summaries", docId));
    if (snap.exists()) {
      return snap.data() as HpcAnnualSummary;
    }
    return null;
  } catch (err) {
    console.error("Error fetching HPC annual summary:", err);
    return null;
  }
}

export async function saveHpcAnnualSummary(summary: HpcAnnualSummary): Promise<boolean> {
  try {
    const docId = `${summary.studentId}_${summary.academicYear}`;
    await setDoc(doc(db, "hpc_annual_summaries", docId), {
      ...summary,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.error("Error saving HPC annual summary:", err);
    throw err;
  }
}

// ---------------- Dashboard Aggregates ----------------
export async function getHpcProgressForClass(
  classId: string,
  academicYear: string,
  selectedMedium: string = "marathi",
  teacherId?: string
): Promise<HpcStudentProgressItem[]> {
  const students = await getHpcStudents(classId, selectedMedium, teacherId);

  // Read all assessments for this class and year
  const profilesSnap = await getDocs(collection(db, "hpc_student_profiles"));
  const profilesMap = new Set<string>();
  profilesSnap.forEach((d) => {
    if (d.id.endsWith(`_${academicYear}`)) {
      profilesMap.add(d.id.replace(`_${academicYear}`, ""));
    }
  });

  const assessmentsSnap = await getDocs(collection(db, "hpc_assessments"));
  const s1Map = new Set<string>();
  const s2Map = new Set<string>();
  assessmentsSnap.forEach((d) => {
    const data = d.data();
    if (data.academicYear === academicYear && data.classId === classId) {
      if (data.session === "session1" && (data.status === "completed" || Object.keys(data.areaAssessments || {}).length > 0)) {
        s1Map.add(data.studentId);
      }
      if (data.session === "session2" && (data.status === "completed" || Object.keys(data.areaAssessments || {}).length > 0)) {
        s2Map.add(data.studentId);
      }
    }
  });

  const summariesSnap = await getDocs(collection(db, "hpc_annual_summaries"));
  const annualMap = new Set<string>();
  summariesSnap.forEach((d) => {
    if (d.id.endsWith(`_${academicYear}`)) {
      annualMap.add(d.id.replace(`_${academicYear}`, ""));
    }
  });

  return students.map((st) => {
    const hasProfile = profilesMap.has(st.id);
    const hasS1 = s1Map.has(st.id);
    const hasS2 = s2Map.has(st.id);
    const hasAnnual = annualMap.has(st.id);

    let overallStatus: "pending" | "in_progress" | "completed" = "pending";
    if (hasS1 && hasS2 && hasAnnual) {
      overallStatus = "completed";
    } else if (hasProfile || hasS1 || hasS2 || hasAnnual) {
      overallStatus = "in_progress";
    }

    return {
      student: st,
      profileCompleted: hasProfile,
      session1Completed: hasS1,
      session2Completed: hasS2,
      annualCompleted: hasAnnual,
      overallStatus,
    };
  });
}
