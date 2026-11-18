import { db, auth } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  deleteField,
  query,
  where,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import { getCurrentAcademicYear } from "../utils/academicYear";
import {
  HpcStudentProfile,
  HpcSessionAssessment,
  HpcAnnualSummary,
  HpcStageId,
  HpcCurricularGoal,
  HpcCompetency,
  HpcDynamicActivity,
  HpcDynamicRubric,
  HpcDynamicRemark,
} from "../types/hpc";
import {
  HPC_ACTIVITIES_BANK,
  HpcCompetencyActivitiesData,
  HpcActivityItem,
  getActivitiesForCompetency,
} from "../data/hpcActivitiesBank";
import {
  CLASSWISE_ACTIVITIES,
  CLASSWISE_LEARNING_OUTCOMES,
} from "../data/hpcClasswiseCurricularData";
import {
  HPC_CURRICULAR_GOALS,
  HPC_COMPETENCIES,
  HpcAreaDefinition,
  getAreasForStage,
} from "../data/hpcCurricularGoals";
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
  grNo?: string;
  age?: string | number;
  bloodGroup?: string;
  caste?: string;
  category?: string;
  fatherName?: string;
  motherName?: string;
  phone?: string;
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

export interface CreateStudentParams {
  name: string;
  fullName?: string;
  rollNo?: string;
  class: string;
  division?: string;
  gender?: string;
  medium?: string;
  academicYear?: string;
  teacherId?: string;
  dob?: string;
  saralId?: string;
  aadhaar?: string;
  aparId?: string;
  fatherName?: string;
  motherName?: string;
  parentPhone?: string;
  address?: string;
  grNo?: string;
  caste?: string;
  religion?: string;
  taluka?: string;
  district?: string;
  motherTongue?: string;
  fatherOccupation?: string;
  motherOccupation?: string;
  fatherEducation?: string;
  motherEducation?: string;
}

/**
 * Add a new student to Firestore (`users`, `student_details`, and initialize `hpc_student_profiles`)
 * Saves class-wise, medium-wise, and teacher-isolated properly.
 */
export async function createHpcStudent(data: CreateStudentParams): Promise<string> {
  try {
    const activeTeacherId =
      data.teacherId ||
      (typeof localStorage !== "undefined" ? localStorage.getItem("current_teacher_id") : null) ||
      getTeacherId() ||
      "global";

    const cleanName = (data.fullName || data.name || "").trim();
    const cleanRollNo = (data.rollNo || "").trim();
    const cleanClass = (data.class || "").trim();
    const cleanDivision = (data.division || "अ").trim();
    const cleanMedium = data.medium || "marathi";
    const cleanYear = data.academicYear || getCurrentAcademicYear();

    // 1. Save to `users` collection (main identity & queryable in list)
    const userPayload: any = {
      fullName: cleanName,
      name: cleanName,
      studentName: cleanName,
      rollNo: cleanRollNo,
      srNo: cleanRollNo,
      gender: data.gender || "male",
      class: cleanClass,
      currentClass: cleanClass,
      className: cleanClass,
      division: cleanDivision,
      medium: cleanMedium,
      isSemiEnglish: cleanMedium === "semi",
      teacherId: activeTeacherId,
      createdById: activeTeacherId,
      userId: activeTeacherId,
      academicYear: cleanYear,
      role: "student",
      createdAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, "users"), userPayload);

    // 2. Save extended details in `student_details` collection
    const detailsPayload: any = {
      id: docRef.id,
      fullName: cleanName,
      name: cleanName,
      rollNo: cleanRollNo,
      gender: data.gender || "male",
      class: cleanClass,
      currentClass: cleanClass,
      division: cleanDivision,
      medium: cleanMedium,
      dob: data.dob || "",
      birthDate: data.dob || "",
      studentId: data.saralId || "",
      saralId: data.saralId || "",
      aadhar: data.aadhaar || "",
      aparId: data.aparId || "",
      fatherName: data.fatherName || "",
      motherName: data.motherName || "",
      phone: data.parentPhone || "",
      parentPhone: data.parentPhone || "",
      address: data.address || "",
      grNo: data.grNo || "",
      caste: data.caste || "",
      religion: data.religion || "",
      taluka: data.taluka || "",
      studentTaluka: data.taluka || "",
      district: data.district || "",
      studentDistrict: data.district || "",
      motherTongue: data.motherTongue || "",
      fatherOccupation: data.fatherOccupation || "",
      motherOccupation: data.motherOccupation || "",
      fatherEducation: data.fatherEducation || "",
      motherEducation: data.motherEducation || "",
      teacherId: activeTeacherId,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "student_details", docRef.id), detailsPayload, { merge: true });

    // 3. Initialize blank HPC profile in `hpc_student_profiles`
    const profileDocId = `${docRef.id}_${cleanYear}`;
    await setDoc(
      doc(db, "hpc_student_profiles", profileDocId),
      {
        studentId: docRef.id,
        academicYear: cleanYear,
        class: cleanClass,
        division: cleanDivision,
        studentTaluka: data.taluka || "",
        studentDistrict: data.district || "",
        motherTongue: data.motherTongue || "",
        fatherOccupation: data.fatherOccupation || "",
        motherOccupation: data.motherOccupation || "",
        fatherEducation: data.fatherEducation || "",
        motherEducation: data.motherEducation || "",
        interestsHobbies: "",
        generalObservations: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return docRef.id;
  } catch (err) {
    console.error("Error creating student in HPC backend:", err);
    throw err;
  }
}

/**
 * Fetch School General Settings (School name, cluster, HM, etc.)
 * Strictly prioritizes the currently logged-in teacher's account, profile,
 * and user-specific settings before falling back to generic settings.
 */
export async function getHpcSchoolSettings(): Promise<any> {
  try {
    const tid = getTeacherId();
    const isCleanSchool = (val?: string | null): boolean => {
      if (!val || typeof val !== "string") return false;
      const s = val.trim();
      if (!s || s.includes("___") || s.toLowerCase().includes("willingdon")) return false;
      if (/[-_.~=—–•\.]{4,}/.test(s)) return false;
      return true;
    };

    let schoolName = "";
    let udise = "";
    let cluster = "";
    let taluka = "";
    let district = "";
    let headmaster = "";
    let teacherName = "";
    let address = "";
    let pincode = "";

    // 1. Check users collection first (the currently logged-in teacher profile)
    if (tid && tid !== "default_teacher") {
      try {
        const uSnap = await getDoc(doc(db, "users", tid));
        if (uSnap.exists()) {
          const ud = uSnap.data();
          const cand = ud.schoolName || ud.school || ud.institutionName;
          if (isCleanSchool(cand)) schoolName = cand.trim();
          if (ud.udise || ud.udiseNumber) udise = String(ud.udise || ud.udiseNumber);
          if (ud.kendra || ud.centerName) cluster = ud.kendra || ud.centerName;
          if (ud.taluka) taluka = ud.taluka;
          if (ud.district || ud.jilha) district = ud.district || ud.jilha;
          if (ud.headmaster || ud.principalName) headmaster = ud.headmaster || ud.principalName;
          if (ud.fullName || ud.displayName || ud.teacherName) teacherName = ud.fullName || ud.displayName || ud.teacherName;
          if (ud.address) address = ud.address;
          if (ud.pincode) pincode = String(ud.pincode);
        }
      } catch (e) {}

      // 2. Check Teacher-Specific Firestore School Settings: school_settings/${tid}_general or school_settings/${tid}
      try {
        const sSnap = await getDoc(doc(db, "school_settings", `${tid}_general`));
        if (sSnap.exists()) {
          const sd = sSnap.data();
          if (isCleanSchool(sd.schoolName)) schoolName = sd.schoolName.trim();
          if (sd.udiseCode || sd.udise) udise = String(sd.udiseCode || sd.udise);
          if (sd.kendra || sd.cluster) cluster = sd.kendra || sd.cluster;
          if (sd.taluka) taluka = sd.taluka;
          if (sd.district || sd.jilha) district = sd.district || sd.jilha;
          if (sd.principalName || sd.headmasterName || sd.headMaster) headmaster = sd.principalName || sd.headmasterName || sd.headMaster;
          if (sd.teacherName || sd.classTeacher) teacherName = sd.teacherName || sd.classTeacher;
          if (sd.address) address = sd.address;
          if (sd.pincode) pincode = String(sd.pincode);
        } else {
          const sSnap2 = await getDoc(doc(db, "school_settings", tid));
          if (sSnap2.exists()) {
            const sd2 = sSnap2.data();
            if (isCleanSchool(sd2.schoolName)) schoolName = sd2.schoolName.trim();
            if (sd2.udiseCode || sd2.udise) udise = String(sd2.udiseCode || sd2.udise);
            if (sd2.kendra || sd2.cluster) cluster = sd2.kendra || sd2.cluster;
            if (sd2.taluka) taluka = sd2.taluka;
            if (sd2.district || sd2.jilha) district = sd2.district || sd2.jilha;
            if (sd2.principalName || sd2.headmasterName || sd2.headMaster) headmaster = sd2.principalName || sd2.headmasterName || sd2.headMaster;
            if (sd2.teacherName || sd2.classTeacher) teacherName = sd2.teacherName || sd2.classTeacher;
            if (sd2.address) address = sd2.address;
            if (sd2.pincode) pincode = String(sd2.pincode);
          }
        }
      } catch (e) {}
    }

    // 3. Check Unified School Profile helper as fallback if fields are still missing
    if (!schoolName) {
      try {
        const { getUnifiedSchoolProfile, fetchUnifiedSchoolProfile } = await import("@/utils/schoolProfileHelper");
        let uni = getUnifiedSchoolProfile(tid !== "default_teacher" ? tid : undefined);
        if ((!uni?.schoolName || !isCleanSchool(uni.schoolName)) && tid && tid !== "default_teacher") {
          uni = await fetchUnifiedSchoolProfile(tid);
        }
        if (uni && isCleanSchool(uni.schoolName)) {
          schoolName = uni.schoolName.trim();
          if (!udise) udise = uni.udise || "";
          if (!cluster) cluster = uni.kendra || uni.centerName || "";
          if (!taluka) taluka = uni.taluka || "";
          if (!district) district = uni.jilha || uni.district || "";
          if (!headmaster) headmaster = uni.headmaster || "";
          if (!teacherName) teacherName = uni.teacherName || "";
          if (!address) address = uni.address || "";
          if (!pincode) pincode = (uni as any).pincode || "";
        }
      } catch (e) {
        console.warn("Unified school profile fetch in getHpcSchoolSettings:", e);
      }
    }

    // 4. Check auth.currentUser displayName (e.g. if account was created with school name)
    if (!schoolName && auth?.currentUser?.displayName) {
      const dName = auth.currentUser.displayName.trim();
      if (isCleanSchool(dName) && dName !== "Educator" && dName !== "Teacher") {
        schoolName = dName;
      }
    }

    // 5. Fallback only if no teacher school name was found: generic school_settings/general
    let generalSettings: any = {};
    try {
      const snap = await getDoc(doc(db, "school_settings", "general"));
      if (snap.exists()) {
        generalSettings = snap.data();
      }
    } catch (err) {}

    // If teacher has set their own school name, do NOT contaminate it with generic "लिंबा तांडा" address/pincode!
    const isUsingGeneral = !schoolName;
    if (isUsingGeneral) {
      schoolName = generalSettings.schoolName || "";
      address = generalSettings.address || "";
      pincode = String(generalSettings.pincode || "");
      udise = String(generalSettings.udiseNumber || generalSettings.udise || "");
      cluster = generalSettings.cluster || generalSettings.kendra || "";
      taluka = generalSettings.taluka || "";
      district = generalSettings.district || "";
      headmaster = generalSettings.headMaster || generalSettings.headmaster || "";
      teacherName = generalSettings.classTeacher || generalSettings.teacherName || "";
    } else {
      if (!udise && (generalSettings.udiseNumber || generalSettings.udise) && generalSettings.schoolName === schoolName) {
        udise = String(generalSettings.udiseNumber || generalSettings.udise);
      }
      if (!cluster) cluster = generalSettings.cluster || generalSettings.kendra || "";
      if (!taluka) taluka = generalSettings.taluka || "";
      if (!district) district = generalSettings.district || "";
      if (!headmaster) headmaster = generalSettings.headMaster || generalSettings.headmaster || "";
      if (!teacherName) teacherName = generalSettings.classTeacher || generalSettings.teacherName || "";
    }

    return {
      ...generalSettings,
      schoolName,
      name: schoolName,
      udiseNumber: udise,
      udise,
      cluster,
      kendra: cluster,
      taluka,
      district,
      jilha: district,
      headMaster: headmaster,
      headmaster,
      teacherName,
      classTeacher: teacherName,
      address,
      pincode,
    };
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

/**
 * Delete student photo from backend (hpc_student_profiles, users, and student_details)
 */
export async function deleteHpcStudentPhoto(studentId: string, academicYear: string): Promise<boolean> {
  try {
    const hpcDocId = `${studentId}_${academicYear}`;
    const hpcRef = doc(db, "hpc_student_profiles", hpcDocId);
    try {
      const snap = await getDoc(hpcRef);
      if (snap.exists()) {
        await updateDoc(hpcRef, {
          photoUrl: deleteField(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn("Could not delete photoUrl from hpc_student_profiles:", e);
    }

    try {
      const userRef = doc(db, "users", studentId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await updateDoc(userRef, {
          photoUrl: deleteField(),
        });
      }
    } catch (e) {
      console.warn("Could not delete photoUrl from users:", e);
    }

    try {
      const detailsRef = doc(db, "student_details", studentId);
      const detailsSnap = await getDoc(detailsRef);
      if (detailsSnap.exists()) {
        await updateDoc(detailsRef, {
          photoUrl: deleteField(),
        });
      }
    } catch (e) {
      console.warn("Could not delete photoUrl from student_details:", e);
    }

    try {
      const studRef = doc(db, "students", studentId);
      const studSnap = await getDoc(studRef);
      if (studSnap.exists()) {
        await updateDoc(studRef, {
          photoUrl: deleteField(),
        });
      }
    } catch (e) {
      // ignore
    }

    return true;
  } catch (err) {
    console.error("Error deleting student photo:", err);
    return false;
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

// ===========================================================================
// DYNAMIC HPC ACTIVITIES & 5 QUESTIONS (Admin & Excel Uploaded)
// ===========================================================================

/**
 * Fetch dynamic activities from Firestore 'hpc_activities' collection
 */
export async function getHpcDynamicActivities(
  competencyCode?: string,
  stageId?: HpcStageId,
  subjectOrArea?: string,
  classId?: string
): Promise<HpcDynamicActivity[]> {
  try {
    const colRef = collection(db, "hpc_activities");
    let q = query(colRef);
    if (competencyCode) {
      q = query(colRef, where("competencyCode", "==", competencyCode.trim()));
    }
    const snap = await getDocs(q);
    const rawList: HpcDynamicActivity[] = [];
    snap.forEach((d) => {
      const raw = d.data() as any;
      const desc = raw.activityDescription || raw.description || "";
      const teacherSample = raw.teacherFeedbackSample || raw.teacherFeedbackBank?.[0] || "";
      const parentSample = raw.parentFeedbackSample || raw.parentFeedbackBank?.[0] || "";

      const data: HpcDynamicActivity = {
        ...raw,
        id: d.id,
        activityDescription: desc,
        description: desc,
        teacherFeedbackSample: teacherSample,
        parentFeedbackSample: parentSample,
      };

      const matchesStage = !stageId || !data.stageId || data.stageId === stageId;
      const matchesSubject = !subjectOrArea || data.subjectOrArea === subjectOrArea;
      const matchesClass =
        !classId ||
        !data.classId ||
        data.classId === "all" ||
        data.classId === classId ||
        (data.stageId === "foundational" && (classId === "1st" || classId === "2nd"));
      if (matchesStage && matchesSubject && matchesClass) {
        rawList.push(data);
      }
    });

    // If Firestore has activities for this query, return deduped
    if (rawList.length > 0) {
      const cleanTitle = (t?: string) =>
        (t || "")
          .trim()
          .toLowerCase()
          .replace(/^([०-९0-9]+[.:)\-\s]+)+/, "")
          .replace(/\s+/g, " ")
          .trim();

      // Deduplicate by competencyCode + clean activityTitle + classId
      const dedupedMap = new Map<string, HpcDynamicActivity>();
      rawList.forEach((act) => {
        const cCode = (act.competencyCode || "").trim().toLowerCase();
        const cleanT = cleanTitle(act.activityTitle);
        const cls = act.classId || "all";
        const key = `${cCode}___${cls}___${cleanT}`;

        if (!dedupedMap.has(key)) {
          dedupedMap.set(key, act);
        } else {
          const existing = dedupedMap.get(key)!;
          const existingScore = (existing.activityDescription?.length || 0) + (existing.questions?.length || 0) * 10;
          const currentScore = (act.activityDescription?.length || 0) + (act.questions?.length || 0) * 10;
          if (currentScore > existingScore) {
            dedupedMap.set(key, act);
          }
        }
      });

      const uniqueList = Array.from(dedupedMap.values());
      uniqueList.sort((a, b) => (a.activityNumber || 1) - (b.activityNumber || 1));
      return uniqueList.map((a, idx) => ({
        ...a,
        activityNumber: idx + 1,
      }));
    }

    // Fallback to built-in class-specific activities for foundational stage
    const targetClass = classId || (stageId === "foundational" ? "1st" : undefined);
    if (targetClass && CLASSWISE_ACTIVITIES[targetClass]) {
      let builtIn = CLASSWISE_ACTIVITIES[targetClass];
      if (competencyCode) {
        const cleanComp = competencyCode.trim().toLowerCase();
        builtIn = builtIn.filter((a) => a.competencyCode.trim().toLowerCase() === cleanComp);
      }
      if (subjectOrArea) {
        builtIn = builtIn.filter((a) => a.subjectOrArea === subjectOrArea);
      }
      return builtIn as any[];
    }

    return [];
  } catch (err) {
    console.error("Error fetching dynamic HPC activities:", err);
    return [];
  }
}

/**
 * Get unified activity bank data for a competency including class-specific learning outcomes.
 * Priority: Dynamic Firestore activities > Classwise built-in data > Hardcoded HPC_ACTIVITIES_BANK
 */
export async function getHpcActivityBankForCompetency(
  competencyCode: string,
  stageId?: HpcStageId,
  classId?: string
): Promise<HpcCompetencyActivitiesData | undefined> {
  try {
    const dynamicList = await getHpcDynamicActivities(competencyCode, stageId, undefined, classId);
    if (dynamicList && dynamicList.length > 0) {
      // Deduplicate dynamic activities by title
      const uniqueActivitiesMap = new Map<string, HpcDynamicActivity>();
      dynamicList.forEach((d) => {
        const cleanT = (d.activityTitle || "").trim().toLowerCase();
        if (cleanT && !uniqueActivitiesMap.has(cleanT)) {
          uniqueActivitiesMap.set(cleanT, d);
        }
      });
      const dedupedList = Array.from(uniqueActivitiesMap.values());
      const first = dedupedList[0] || dynamicList[0];
      const activities: HpcActivityItem[] = dedupedList.map((d, index) => {
        const desc = d.activityDescription || (d as any).description || "";
        return {
          activityNumber: index + 1,
          title: d.activityTitle,
          description: desc,
          rawText: `${index + 1}. ${d.activityTitle}${desc ? `\n\nकृती: ${desc}` : ""}`,
          questions: d.questions && d.questions.length > 0 ? d.questions : [],
        };
      });

      const staticData = HPC_ACTIVITIES_BANK[competencyCode];
      const teacherRemarks = dynamicList
        .map((d) => d.teacherFeedbackSample || (d as any).teacherFeedbackBank?.[0])
        .filter((r): r is string => Boolean(r && r.trim()));

      const parentRemarks = dynamicList
        .map((d) => d.parentFeedbackSample || (d as any).parentFeedbackBank?.[0])
        .filter((r): r is string => Boolean(r && r.trim()));

      const targetCls = classId || (stageId === "foundational" ? "1st" : "all");
      const loList =
        dynamicList.find((d) => d.learningOutcomes && d.learningOutcomes.length > 0)?.learningOutcomes ||
        CLASSWISE_LEARNING_OUTCOMES[targetCls]?.[competencyCode] ||
        CLASSWISE_LEARNING_OUTCOMES["1st"]?.[competencyCode] ||
        CLASSWISE_LEARNING_OUTCOMES["2nd"]?.[competencyCode] ||
        [];

      return {
        code: competencyCode,
        description: first.competencyTitle || competencyCode,
        learningOutcomes: loList,
        activities,
        teacherRemarks: teacherRemarks.length > 0 ? teacherRemarks : (staticData?.teacherRemarks || [
          "या कृतीत विद्यार्थ्याची कामगिरी समाधानकारक व उत्साहवर्धक आहे.",
          "विद्यार्थी आत्मविश्वासाने सहभाग घेतो व विचारलेल्या प्रश्नांची योग्य उत्तरे देतो."
        ]),
        parentRemarks: parentRemarks.length > 0 ? parentRemarks : (staticData?.parentRemarks || [
          "आमच्या निरीक्षणानुसार पाल्याला या उपक्रमात विशेष रुची आहे.",
          "घरीही विद्यार्थी या उपक्रमातील बाबी आनंदाने सांगतो."
        ]),
      };
    }

    // Check if ANY dynamic activities exist in this stage
    const allStageActivities = await getHpcDynamicActivities(undefined, stageId, undefined, classId);
    if (allStageActivities && allStageActivities.length > 0) {
      const cleanTarget = (competencyCode || "").trim().toLowerCase();
      const matched = allStageActivities.filter(
        (a) => (a.competencyCode || "").trim().toLowerCase() === cleanTarget
      );
      if (matched.length > 0) {
        const first = matched[0];
        const staticData = HPC_ACTIVITIES_BANK[competencyCode];
        const matchedTeachers = matched
          .map((d) => d.teacherFeedbackSample || (d as any).teacherFeedbackBank?.[0])
          .filter(Boolean) as string[];
        const matchedParents = matched
          .map((d) => d.parentFeedbackSample || (d as any).parentFeedbackBank?.[0])
          .filter(Boolean) as string[];

        const targetCls = classId || (stageId === "foundational" ? "1st" : "all");
        const loList =
          matched.find((d) => d.learningOutcomes && d.learningOutcomes.length > 0)?.learningOutcomes ||
          CLASSWISE_LEARNING_OUTCOMES[targetCls]?.[competencyCode] ||
          [];

        return {
          code: competencyCode,
          description: first.competencyTitle || competencyCode,
          learningOutcomes: loList,
          activities: matched.map((d, index) => {
            const desc = d.activityDescription || (d as any).description || "";
            return {
              activityNumber: index + 1,
              title: d.activityTitle,
              description: desc,
              rawText: `${index + 1}. ${d.activityTitle}${desc ? `\n\nकृती: ${desc}` : ""}`,
              questions: d.questions && d.questions.length > 0 ? d.questions : [],
            };
          }),
          teacherRemarks: matchedTeachers.length > 0 ? matchedTeachers : (staticData?.teacherRemarks || []),
          parentRemarks: matchedParents.length > 0 ? matchedParents : (staticData?.parentRemarks || []),
        };
      }
    }
  } catch (err) {
    console.warn("Could not query dynamic activities:", err);
  }

  // Fallback to class-specific built-in data or static bank
  return getActivitiesForCompetency(competencyCode, classId);
}

/**
 * Get learning outcomes for a specific class and competency
 */
export function getHpcClassLearningOutcomes(competencyCode: string, classId?: string): string[] {
  const cCode = (competencyCode || "").trim();
  const cls = classId || "1st";
  if (CLASSWISE_LEARNING_OUTCOMES[cls]?.[cCode]) {
    return CLASSWISE_LEARNING_OUTCOMES[cls][cCode];
  }
  return CLASSWISE_LEARNING_OUTCOMES["1st"]?.[cCode] || CLASSWISE_LEARNING_OUTCOMES["2nd"]?.[cCode] || [];
}

/**
 * Save or update a dynamic HPC activity in Firestore
 */
export async function saveHpcDynamicActivity(
  activity: Partial<HpcDynamicActivity> & { competencyCode: string; activityTitle: string }
): Promise<string> {
  const id = activity.id || `act_${activity.competencyCode}_${Date.now()}`;
  const now = new Date().toISOString();
  const payload: HpcDynamicActivity = {
    id,
    stageId: activity.stageId || "preparatory",
    subjectOrArea: activity.subjectOrArea || "",
    goalCode: activity.goalCode || "",
    goalTitle: activity.goalTitle || "",
    competencyCode: activity.competencyCode,
    competencyTitle: activity.competencyTitle || "",
    activityNumber: activity.activityNumber || 1,
    activityTitle: activity.activityTitle,
    activityDescription: activity.activityDescription || "",
    questions: activity.questions || [],
    teacherFeedbackSample: activity.teacherFeedbackSample || "",
    parentFeedbackSample: activity.parentFeedbackSample || "",
    updatedAt: now,
    createdAt: activity.createdAt || now,
  };

  await setDoc(doc(db, "hpc_activities", id), payload);
  return id;
}

/**
 * Delete a dynamic HPC activity from Firestore
 */
export async function deleteHpcDynamicActivity(id: string): Promise<boolean> {
  await deleteDoc(doc(db, "hpc_activities", id));
  return true;
}

/**
 * Delete all dynamic HPC activities (optionally filtered by stage)
 */
export async function deleteAllHpcActivities(stageId?: HpcStageId): Promise<number> {
  const colRef = collection(db, "hpc_activities");
  const snap = await getDocs(colRef);
  let count = 0;
  const docsToDelete = snap.docs.filter((d) => {
    if (!stageId) return true;
    return d.data().stageId === stageId;
  });

  const chunkSize = 400;
  for (let i = 0; i < docsToDelete.length; i += chunkSize) {
    const chunk = docsToDelete.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const d of chunk) {
      batch.delete(d.ref);
      count++;
    }
    await batch.commit();
  }
  return count;
}

/**
 * Delete all dynamic HPC remarks
 */
export async function deleteAllHpcRemarks(): Promise<number> {
  const colRef = collection(db, "hpc_remarks_bank");
  const snap = await getDocs(colRef);
  let count = 0;
  const chunkSize = 400;
  for (let i = 0; i < snap.docs.length; i += chunkSize) {
    const chunk = snap.docs.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const d of chunk) {
      batch.delete(d.ref);
      count++;
    }
    await batch.commit();
  }
  return count;
}

/**
 * Reset entire HPC master database (Activities, Remarks, Rubrics, Custom Goals, Custom Competencies)
 */
export async function resetEntireHpcDatabase(): Promise<{
  activitiesDeleted: number;
  remarksDeleted: number;
  rubricsDeleted: number;
  goalsDeleted: number;
  compsDeleted: number;
}> {
  const actCount = await deleteAllHpcActivities();
  const remCount = await deleteAllHpcRemarks();
  const rubCount = await deleteAllHpcRubrics();
  const goalsRes = await deleteAllHpcGoalsAndCompetencies();

  return {
    activitiesDeleted: actCount,
    remarksDeleted: remCount,
    rubricsDeleted: rubCount,
    goalsDeleted: goalsRes.goalsDeleted,
    compsDeleted: goalsRes.compsDeleted,
  };
}

/**
 * Bulk upload activities in batches of 400
 */
export async function bulkUploadHpcActivities(
  activities: HpcDynamicActivity[],
  onProgress?: (processed: number, total: number) => void
): Promise<number> {
  let count = 0;
  const chunkSize = 400;
  for (let i = 0; i < activities.length; i += chunkSize) {
    const chunk = activities.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const act of chunk) {
      const docRef = doc(db, "hpc_activities", act.id);
      batch.set(docRef, act, { merge: true });
      count++;
    }
    await batch.commit();
    if (onProgress) {
      onProgress(Math.min(i + chunkSize, activities.length), activities.length);
    }
  }
  return count;
}

// ===========================================================================
// DYNAMIC HPC YEAR-END REMARKS (शिक्षकांचा अंतिम सारांश शेरे बँक)
// ===========================================================================

export async function getHpcDynamicRemarks(
  subjectOrArea?: string,
  level?: string
): Promise<HpcDynamicRemark[]> {
  try {
    const colRef = collection(db, "hpc_remarks_bank");
    let q = query(colRef);
    if (subjectOrArea) {
      q = query(colRef, where("subjectOrArea", "==", subjectOrArea));
    }
    const snap = await getDocs(q);
    const list: HpcDynamicRemark[] = [];
    snap.forEach((d) => {
      const data = d.data() as HpcDynamicRemark;
      if (!level || data.level === level) {
        list.push({ ...data, id: d.id });
      }
    });
    return list;
  } catch (err) {
    console.error("Error fetching dynamic HPC remarks:", err);
    return [];
  }
}

export async function saveHpcDynamicRemark(
  remark: Partial<HpcDynamicRemark> & { subjectOrArea: string; remarkText: string; level: string }
): Promise<string> {
  const id = remark.id || `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const payload: HpcDynamicRemark = {
    id,
    subjectOrArea: remark.subjectOrArea,
    level: remark.level,
    remarkText: remark.remarkText,
    stageId: remark.stageId,
    createdAt: remark.createdAt || new Date().toISOString(),
  };

  await setDoc(doc(db, "hpc_remarks_bank", id), payload);
  return id;
}

export async function deleteHpcDynamicRemark(id: string): Promise<boolean> {
  await deleteDoc(doc(db, "hpc_remarks_bank", id));
  return true;
}

export async function bulkUploadHpcRemarks(
  remarks: HpcDynamicRemark[],
  onProgress?: (processed: number, total: number) => void
): Promise<number> {
  let count = 0;
  const chunkSize = 400;
  for (let i = 0; i < remarks.length; i += chunkSize) {
    const chunk = remarks.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const rem of chunk) {
      const docRef = doc(db, "hpc_remarks_bank", rem.id);
      batch.set(docRef, rem, { merge: true });
      count++;
    }
    await batch.commit();
    if (onProgress) {
      onProgress(Math.min(i + chunkSize, remarks.length), remarks.length);
    }
  }
  return count;
}

// ===========================================================================
// DYNAMIC HPC RUBRICS (मूल्यांकन रुब्रिक्स)
// ===========================================================================

export async function getHpcDynamicRubrics(
  competencyCode?: string,
  activityTitle?: string,
  stageId?: HpcStageId
): Promise<HpcDynamicRubric[]> {
  try {
    const colRef = collection(db, "hpc_rubrics");
    let q = query(colRef);
    if (competencyCode) {
      q = query(colRef, where("competencyCode", "==", competencyCode.trim()));
    }
    const snap = await getDocs(q);
    const list: HpcDynamicRubric[] = [];
    const cleanStr = (s?: string) =>
      (s || "")
        .trim()
        .toLowerCase()
        .replace(/^([०-९0-9]+[.:)\-\s]+)+/, "")
        .replace(/\s+/g, " ")
        .trim();

    const targetActClean = cleanStr(activityTitle);

    snap.forEach((d) => {
      const data = d.data() as HpcDynamicRubric;
      const matchesStage = !stageId || !data.stageId || data.stageId === stageId;
      const dataActClean = cleanStr(data.activityTitle);
      const matchesAct =
        !targetActClean ||
        !dataActClean ||
        dataActClean === targetActClean ||
        (targetActClean.length > 5 && dataActClean.includes(targetActClean)) ||
        (dataActClean.length > 5 && targetActClean.includes(dataActClean));

      if (matchesStage && matchesAct) {
        list.push({ ...data, id: d.id });
      }
    });
    return list;
  } catch (err) {
    console.error("Error fetching dynamic rubrics:", err);
    return [];
  }
}

export async function saveHpcDynamicRubric(
  rubric: Partial<HpcDynamicRubric> & { dimension: string }
): Promise<string> {
  const id = rubric.id || `rub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const payload: HpcDynamicRubric = {
    id,
    stageId: rubric.stageId || "preparatory",
    goalCode: rubric.goalCode || "",
    competencyCode: rubric.competencyCode || "",
    activityTitle: rubric.activityTitle || "",
    dimension: rubric.dimension,
    beginner: rubric.beginner || "",
    proficient: rubric.proficient || "",
    advanced: rubric.advanced || "",
    createdAt: rubric.createdAt || new Date().toISOString(),
  };

  await setDoc(doc(db, "hpc_rubrics", id), payload);
  return id;
}

export async function deleteHpcDynamicRubric(id: string): Promise<boolean> {
  await deleteDoc(doc(db, "hpc_rubrics", id));
  return true;
}

export async function deleteAllHpcRubrics(stageId?: HpcStageId): Promise<number> {
  const colRef = collection(db, "hpc_rubrics");
  const snap = await getDocs(colRef);
  let count = 0;
  const docsToDelete = snap.docs.filter((d) => {
    if (!stageId) return true;
    return d.data().stageId === stageId;
  });

  const chunkSize = 400;
  for (let i = 0; i < docsToDelete.length; i += chunkSize) {
    const chunk = docsToDelete.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const d of chunk) {
      batch.delete(d.ref);
      count++;
    }
    await batch.commit();
  }
  return count;
}

export async function bulkUploadHpcRubrics(
  rubrics: HpcDynamicRubric[],
  onProgress?: (processed: number, total: number) => void
): Promise<number> {
  let count = 0;
  const chunkSize = 400;
  for (let i = 0; i < rubrics.length; i += chunkSize) {
    const chunk = rubrics.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const rub of chunk) {
      const docRef = doc(db, "hpc_rubrics", rub.id);
      batch.set(docRef, rub, { merge: true });
      count++;
    }
    await batch.commit();
    if (onProgress) {
      onProgress(Math.min(i + chunkSize, rubrics.length), rubrics.length);
    }
  }
  return count;
}

// ===========================================================================
// DYNAMIC HPC GOALS & COMPETENCIES (Admin & Excel Uploaded)
// ===========================================================================

export async function getHpcCurricularGoals(stageId?: HpcStageId): Promise<HpcCurricularGoal[]> {
  try {
    const customSnap = await getDocs(collection(db, "hpc_custom_goals"));
    const customList: HpcCurricularGoal[] = [];
    customSnap.forEach((d) => {
      const raw = d.data() as any;
      const data: HpcCurricularGoal = {
        id: d.id,
        code: raw.code || d.id.replace("CUSTOM-", ""),
        titleMarathi: raw.titleMarathi || raw.nameMarathi || raw.title || raw.code || "",
        titleEnglish: raw.titleEnglish || raw.nameEnglish || "",
        stageId: raw.stageId || "foundational",
        areaOrSubjectId: raw.areaOrSubjectId || raw.subjectOrArea || "general",
      };
      if (!stageId || data.stageId === stageId) {
        customList.push(data);
      }
    });

    // Also extract any unique goals from hpc_activities
    const actSnap = await getDocs(collection(db, "hpc_activities"));
    actSnap.forEach((d) => {
      const data = d.data() as HpcDynamicActivity;
      if (data.goalCode && (!stageId || data.stageId === stageId)) {
        const cleanCode = data.goalCode.trim();
        const gId = `CUSTOM-${cleanCode}`;
        if (!customList.some((g) => g.code === cleanCode || g.id === gId)) {
          customList.push({
            id: gId,
            code: cleanCode,
            titleMarathi: data.goalTitle || cleanCode,
            stageId: data.stageId,
            areaOrSubjectId: data.subjectOrArea || "general",
          });
        }
      }
    });

    // If uploaded/custom goals exist, return ONLY those!
    if (customList.length > 0) {
      return customList;
    }
  } catch (err) {
    console.error("Error fetching custom goals:", err);
  }
  // Fallback to static goals ONLY if no uploaded goals exist at all
  return HPC_CURRICULAR_GOALS.filter((g) => !stageId || g.stageId === stageId);
}

export async function getHpcCompetencies(
  stageId?: HpcStageId,
  goalId?: string,
  classId?: string,
  session?: "session1" | "session2"
): Promise<HpcCompetency[]> {
  try {
    const customSnap = await getDocs(collection(db, "hpc_custom_competencies"));
    const customList: HpcCompetency[] = [];
    customSnap.forEach((d) => {
      const raw = d.data() as any;
      const data: HpcCompetency = {
        id: d.id,
        code: raw.code || d.id.replace("CUSTOM-", ""),
        titleMarathi: raw.titleMarathi || raw.nameMarathi || raw.title || raw.code || "",
        titleEnglish: raw.titleEnglish || raw.nameEnglish || "",
        goalId: raw.goalId || (raw.goalCode ? `CUSTOM-${raw.goalCode}` : ""),
        stageId: raw.stageId || "foundational",
        applicableClassIds:
          raw.applicableClassIds ||
          (raw.stageId === "foundational"
            ? ["1st", "2nd"]
            : raw.stageId === "preparatory"
            ? ["3rd", "4th", "5th"]
            : ["6th", "7th", "8th"]),
        applicableSession: raw.applicableSession || "both",
        learningOutcomes: raw.learningOutcomes || [],
      };
      if (!stageId || data.stageId === stageId) {
        customList.push(data);
      }
    });

    // Also extract any unique competencies from hpc_activities
    const actSnap = await getDocs(collection(db, "hpc_activities"));
    actSnap.forEach((d) => {
      const data = d.data() as HpcDynamicActivity;
      if (data.competencyCode && (!stageId || data.stageId === stageId)) {
        const cleanCode = data.competencyCode.trim();
        const cId = `CUSTOM-${cleanCode}`;
        if (!customList.some((c) => c.code === cleanCode || c.id === cId)) {
          customList.push({
            id: cId,
            code: cleanCode,
            titleMarathi: data.competencyTitle || cleanCode,
            goalId: data.goalCode ? `CUSTOM-${data.goalCode.trim()}` : "",
            stageId: data.stageId,
            applicableClassIds:
              data.stageId === "foundational"
                ? ["1st", "2nd"]
                : data.stageId === "preparatory"
                ? ["3rd", "4th", "5th"]
                : ["6th", "7th", "8th"],
            applicableSession: "both",
            learningOutcomes: data.learningOutcomes || [],
          });
        }
      }
    });

    // If uploaded/custom competencies exist, filter and return ONLY those!
    if (customList.length > 0) {
      return customList.filter((c) => {
        if (goalId) {
          const cleanGoalId = goalId.replace("CUSTOM-", "").trim().toLowerCase();
          const cleanCompGoalId = (c.goalId || "").replace("CUSTOM-", "").trim().toLowerCase();
          if (cleanCompGoalId && cleanCompGoalId !== cleanGoalId) return false;
        }
        if (classId && c.applicableClassIds?.length > 0 && !c.applicableClassIds.includes(classId)) {
          return false;
        }
        if (session && c.applicableSession && c.applicableSession !== "both" && c.applicableSession !== session) {
          return false;
        }
        return true;
      });
    }
  } catch (err) {
    console.error("Error fetching custom competencies:", err);
  }

  // Fallback ONLY if no custom competencies exist at all
  return HPC_COMPETENCIES.filter((c) => {
    if (stageId && c.stageId !== stageId) return false;
    if (goalId && c.goalId !== goalId) return false;
    if (classId && c.applicableClassIds?.length > 0 && !c.applicableClassIds.includes(classId)) return false;
    if (session && c.applicableSession && c.applicableSession !== "both" && c.applicableSession !== session) return false;
    return true;
  });
}

export async function saveHpcGoal(goal: HpcCurricularGoal): Promise<string> {
  const id = goal.id || `CUSTOM-${goal.code.replace(/\s+/g, "_")}`;
  await setDoc(doc(db, "hpc_custom_goals", id), { ...goal, id });
  return id;
}

export async function deleteHpcGoal(id: string): Promise<boolean> {
  await deleteDoc(doc(db, "hpc_custom_goals", id));
  return true;
}

export async function deleteAllHpcGoals(stageId?: HpcStageId): Promise<number> {
  const colRef = collection(db, "hpc_custom_goals");
  const snap = await getDocs(colRef);
  let count = 0;
  const docsToDelete = snap.docs.filter((d) => {
    if (!stageId) return true;
    return d.data().stageId === stageId;
  });

  const chunkSize = 400;
  for (let i = 0; i < docsToDelete.length; i += chunkSize) {
    const chunk = docsToDelete.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const d of chunk) {
      batch.delete(d.ref);
      count++;
    }
    await batch.commit();
  }
  return count;
}

export async function saveHpcCompetency(comp: HpcCompetency): Promise<string> {
  const id = comp.id || `CUSTOM-${comp.code.replace(/\s+/g, "_")}`;
  await setDoc(doc(db, "hpc_custom_competencies", id), { ...comp, id });
  return id;
}

export async function deleteHpcCompetency(id: string): Promise<boolean> {
  await deleteDoc(doc(db, "hpc_custom_competencies", id));
  return true;
}

export async function deleteAllHpcCompetencies(stageId?: HpcStageId): Promise<number> {
  const colRef = collection(db, "hpc_custom_competencies");
  const snap = await getDocs(colRef);
  let count = 0;
  const docsToDelete = snap.docs.filter((d) => {
    if (!stageId) return true;
    return d.data().stageId === stageId;
  });

  const chunkSize = 400;
  for (let i = 0; i < docsToDelete.length; i += chunkSize) {
    const chunk = docsToDelete.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const d of chunk) {
      batch.delete(d.ref);
      count++;
    }
    await batch.commit();
  }
  return count;
}

export async function deleteAllHpcGoalsAndCompetencies(stageId?: HpcStageId): Promise<{
  goalsDeleted: number;
  compsDeleted: number;
}> {
  const gCount = await deleteAllHpcGoals(stageId);
  const cCount = await deleteAllHpcCompetencies(stageId);
  return { goalsDeleted: gCount, compsDeleted: cCount };
}

export async function bulkUploadHpcGoalsAndCompetencies(
  goals: HpcCurricularGoal[],
  competencies: HpcCompetency[],
  onProgress?: (processed: number, total: number) => void
): Promise<{ goalsCount: number; compsCount: number }> {
  let gCount = 0;
  let cCount = 0;
  const total = goals.length + competencies.length;

  const chunkSize = 400;
  for (let i = 0; i < goals.length; i += chunkSize) {
    const chunk = goals.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const g of chunk) {
      const docRef = doc(db, "hpc_custom_goals", g.id);
      batch.set(docRef, g, { merge: true });
      gCount++;
    }
    await batch.commit();
    if (onProgress) onProgress(gCount, total);
  }

  for (let i = 0; i < competencies.length; i += chunkSize) {
    const chunk = competencies.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const c of chunk) {
      const docRef = doc(db, "hpc_custom_competencies", c.id);
      batch.set(docRef, c, { merge: true });
      cCount++;
    }
    await batch.commit();
    if (onProgress) onProgress(gCount + cCount, total);
  }

  return { goalsCount: gCount, compsCount: cCount };
}

/**
 * Helper to get dynamic areas/subjects for a stage.
 * If dynamic goals or dynamic activities exist, extracts the subjects/areas from them.
 * Otherwise falls back to official default areas.
 */
export function getHpcAreasForStage(
  stageId: HpcStageId,
  dynamicGoals?: HpcCurricularGoal[],
  dynamicActivities?: HpcDynamicActivity[]
): HpcAreaDefinition[] {
  const subjectSet = new Set<string>();

  if (dynamicGoals && dynamicGoals.length > 0) {
    dynamicGoals.forEach((g) => {
      if (g.areaOrSubjectId && g.areaOrSubjectId !== "general") {
        subjectSet.add(g.areaOrSubjectId.trim());
      }
    });
  }

  if (dynamicActivities && dynamicActivities.length > 0) {
    dynamicActivities.forEach((a) => {
      if (a.subjectOrArea && a.stageId === stageId) {
        subjectSet.add(a.subjectOrArea.trim());
      }
    });
  }

  if (subjectSet.size > 0) {
    const defaultAreas = getAreasForStage(stageId);
    return Array.from(subjectSet).map((sub, index) => {
      const matchDefault = defaultAreas.find(
        (a) => a.id === sub || a.nameMarathi === sub || a.code === sub
      );
      if (matchDefault) return matchDefault;
      return {
        id: sub,
        code: `विषय ${index + 1}`,
        nameMarathi: sub,
        nameEnglish: sub,
        stageId,
        order: index + 1,
      };
    });
  }

  return getAreasForStage(stageId);
}
