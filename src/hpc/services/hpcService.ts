import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
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
import { HPC_ACTIVITIES_BANK, HpcCompetencyActivitiesData, HpcActivityItem } from "../data/hpcActivitiesBank";
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

// ===========================================================================
// DYNAMIC HPC ACTIVITIES & 5 QUESTIONS (Admin & Excel Uploaded)
// ===========================================================================

/**
 * Fetch dynamic activities from Firestore 'hpc_activities' collection
 */
export async function getHpcDynamicActivities(
  competencyCode?: string,
  stageId?: HpcStageId
): Promise<HpcDynamicActivity[]> {
  try {
    const colRef = collection(db, "hpc_activities");
    let q = query(colRef);
    if (competencyCode) {
      q = query(colRef, where("competencyCode", "==", competencyCode));
    }
    const snap = await getDocs(q);
    const list: HpcDynamicActivity[] = [];
    snap.forEach((d) => {
      const data = d.data() as HpcDynamicActivity;
      if (!stageId || data.stageId === stageId) {
        list.push({ ...data, id: d.id });
      }
    });

    return list.sort((a, b) => (a.activityNumber || 1) - (b.activityNumber || 1));
  } catch (err) {
    console.error("Error fetching dynamic HPC activities:", err);
    return [];
  }
}

/**
 * Get unified activity bank data for a competency.
 * Priority: Dynamic Firestore activities > Hardcoded HPC_ACTIVITIES_BANK
 */
export async function getHpcActivityBankForCompetency(
  competencyCode: string,
  stageId?: HpcStageId
): Promise<HpcCompetencyActivitiesData | undefined> {
  try {
    const dynamicList = await getHpcDynamicActivities(competencyCode, stageId);
    if (dynamicList && dynamicList.length > 0) {
      const first = dynamicList[0];
      const activities: HpcActivityItem[] = dynamicList.map((d, index) => ({
        activityNumber: d.activityNumber || index + 1,
        title: d.activityTitle,
        description: d.activityDescription,
        rawText: `${d.activityNumber || index + 1}. ${d.activityTitle}\n\nकृती: ${d.activityDescription}`,
        questions: d.questions && d.questions.length > 0 ? d.questions : [],
      }));

      const teacherRemarks = dynamicList
        .map((d) => d.teacherFeedbackSample)
        .filter((r): r is string => Boolean(r && r.trim()));

      const parentRemarks = dynamicList
        .map((d) => d.parentFeedbackSample)
        .filter((r): r is string => Boolean(r && r.trim()));

      return {
        code: competencyCode,
        description: first.competencyTitle || competencyCode,
        activities,
        teacherRemarks: teacherRemarks.length > 0 ? teacherRemarks : [
          "या कृतीत विद्यार्थ्याची कामगिरी समाधानकारक व उत्साहवर्धक आहे.",
          "विद्यार्थी आत्मविश्वासाने सहभाग घेतो व विचारलेल्या प्रश्नांची योग्य उत्तरे देतो."
        ],
        parentRemarks: parentRemarks.length > 0 ? parentRemarks : [
          "आमच्या निरीक्षणानुसार पाल्याला या उपक्रमात विशेष रुची आहे.",
          "घरीही विद्यार्थी या उपक्रमातील बाबी आनंदाने सांगतो."
        ],
      };
    }
  } catch (err) {
    console.warn("Could not query dynamic activities, falling back to static bank:", err);
  }

  // Fallback to static bank
  return HPC_ACTIVITIES_BANK[competencyCode];
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
 * Reset entire HPC master database (Activities, Remarks, Rubrics)
 */
export async function resetEntireHpcDatabase(): Promise<{
  activitiesDeleted: number;
  remarksDeleted: number;
  rubricsDeleted: number;
}> {
  const actCount = await deleteAllHpcActivities();
  const remCount = await deleteAllHpcRemarks();

  const rubSnap = await getDocs(collection(db, "hpc_rubrics"));
  let rubCount = 0;
  const chunkSize = 400;
  for (let i = 0; i < rubSnap.docs.length; i += chunkSize) {
    const chunk = rubSnap.docs.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const d of chunk) {
      batch.delete(d.ref);
      rubCount++;
    }
    await batch.commit();
  }

  return {
    activitiesDeleted: actCount,
    remarksDeleted: remCount,
    rubricsDeleted: rubCount,
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
  competencyCode?: string
): Promise<HpcDynamicRubric[]> {
  try {
    const colRef = collection(db, "hpc_rubrics");
    let q = query(colRef);
    if (competencyCode) {
      q = query(colRef, where("competencyCode", "==", competencyCode));
    }
    const snap = await getDocs(q);
    const list: HpcDynamicRubric[] = [];
    snap.forEach((d) => {
      list.push({ ...(d.data() as HpcDynamicRubric), id: d.id });
    });
    return list;
  } catch (err) {
    console.error("Error fetching dynamic rubrics:", err);
    return [];
  }
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
