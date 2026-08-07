import { db } from "../lib/firebase";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { fetchJsonFromBunny, saveJsonToBunny } from "../lib/bunnyStorage";

export const normalizeClassKey = (cls) => {
  if (!cls) return "";
  const s = String(cls).trim().toLowerCase();
  if (s.includes("1st") || s.includes("पहिली") || s === "1") return "1st";
  if (s.includes("2nd") || s.includes("दुसरी") || s === "2") return "2nd";
  if (s.includes("3rd") || s.includes("तिसरी") || s === "3") return "3rd";
  if (s.includes("4th") || s.includes("चौथी") || s === "4") return "4th";
  if (s.includes("5th") || s.includes("पाचवी") || s === "5") return "5th";
  if (s.includes("6th") || s.includes("सहावी") || s === "6") return "6th";
  if (s.includes("7th") || s.includes("सातवी") || s === "7") return "7th";
  if (s.includes("8th") || s.includes("आठवी") || s === "8") return "8th";
  return s.replace(/[^0-9a-z]/g, "");
};

export const isStudentSemiEnglish = (s) => {
  if (s.isSemiEnglish === true) return true;
  if (s.isSemiEnglish === false) return false;
  if (s.medium) {
    const m = String(s.medium).toLowerCase().trim();
    if (m === "semi" || m.includes("semi") || m.includes("सेमी") || m.includes("english")) return true;
    if (m === "marathi" || m.includes("मराठी")) return false;
  }
  if (s.class || s.currentClass || s.className) {
    const c = String(s.class || s.currentClass || s.className).toLowerCase();
    if (c.includes("semi") || c.includes("सेमी")) return true;
  }
  return false;
};

export const matchStudentClassAndMedium = (student, targetClass, targetMedium, currentTeacherId = null) => {
  if (!student) return false;

  // If currentTeacherId is supplied, enforce teacher isolation with fallback
  const tId = currentTeacherId || (typeof localStorage !== "undefined" ? localStorage.getItem("current_teacher_id") : null);
  const sTeacherId = student.teacherId || student.createdById || student.userId;
  if (tId && tId !== "default_teacher" && sTeacherId && sTeacherId !== "default_teacher") {
    if (sTeacherId !== tId) return false;
  }

  const stdClass = normalizeClassKey(student.class || student.currentClass || student.className);
  const tgtClass = normalizeClassKey(targetClass);
  if (stdClass !== tgtClass) return false;

  const isSemi = isStudentSemiEnglish(student);
  const targetIsSemi = String(targetMedium || "marathi").toLowerCase().trim() === "semi";
  return targetIsSemi ? isSemi : !isSemi;
};

/**
 * Fetch students for a class from Firestore (users & students collections) and Bunny Storage CDN
 */
export const fetchStudentsForClass = async (selectedClass, medium, teacherId = null) => {
  let loadedStudents = [];
  const targetClassNorm = normalizeClassKey(selectedClass);
  const selectedMedium = medium || (typeof localStorage !== "undefined" ? localStorage.getItem("cce_selected_medium") : null) || "marathi";
  const activeTeacherId = teacherId || (typeof localStorage !== "undefined" ? localStorage.getItem("current_teacher_id") : null);

  try {
    const uQuery = query(collection(db, "users"), where("role", "==", "student"));
    const uSnap = await getDocs(uQuery);
    uSnap.forEach((docSnap) => {
      const d = docSnap.data();
      const studentObj = { id: docSnap.id, ...d };
      if (matchStudentClassAndMedium(studentObj, targetClassNorm, selectedMedium, activeTeacherId)) {
        loadedStudents.push({
          id: docSnap.id,
          srNo: String(d.rollNo || d.srNo || loadedStudents.length + 1),
          rollNo: String(d.rollNo || d.srNo || loadedStudents.length + 1),
          name: d.fullName || d.name || d.studentName || "",
          fullName: d.fullName || d.name || d.studentName || "",
          stdName: d.name || d.fullName || "",
          stdFather: d.fatherName || d.stdFather || "",
          stdSurname: d.surname || d.stdSurname || "",
          stdMother: d.motherName || d.stdMother || "",
          currentClass: d.class || d.currentClass || selectedClass,
          medium: d.medium,
          isSemiEnglish: d.isSemiEnglish,
          teacherId: d.teacherId || d.createdById,
          division: d.division || "1",
          dob: d.dob || d.birthDate || "",
          caste: d.caste || d.category || "",
          studentId: d.studentId || docSnap.id,
        });
      }
    });
  } catch (e) {}

  if (loadedStudents.length === 0) {
    try {
      const studentsSnap = await getDocs(collection(db, "students"));
      studentsSnap.forEach((docSnap) => {
        const d = docSnap.data();
        const studentObj = { id: docSnap.id, ...d };
        if (matchStudentClassAndMedium(studentObj, targetClassNorm, selectedMedium, activeTeacherId)) {
          loadedStudents.push({
            id: docSnap.id,
            srNo: String(d.rollNo || d.srNo || loadedStudents.length + 1),
            rollNo: String(d.rollNo || d.srNo || loadedStudents.length + 1),
            name: d.fullName || d.name || d.studentName || "",
            fullName: d.fullName || d.name || d.studentName || "",
            stdName: d.name || d.fullName || "",
            stdFather: d.fatherName || d.stdFather || "",
            stdSurname: d.surname || d.stdSurname || "",
            stdMother: d.motherName || d.stdMother || "",
            currentClass: d.class || d.currentClass || selectedClass,
            medium: d.medium,
            isSemiEnglish: d.isSemiEnglish,
            division: d.division || "1",
            dob: d.dob || d.birthDate || "",
            caste: d.caste || d.category || "",
            studentId: d.studentId || docSnap.id,
          });
        }
      });
    } catch (e) {}
  }

  // Fetch detailed student profiles from student_details collection
  const detailsMap = new Map();
  try {
    const detailsSnap = await getDocs(collection(db, "student_details"));
    detailsSnap.forEach((docSnap) => {
      detailsMap.set(docSnap.id, docSnap.data());
    });
  } catch (e) {}

  // Deduplicate and merge student_details
  const uniqueMap = new Map();
  loadedStudents.forEach((s) => {
    if (s.name) {
      const det = detailsMap.get(s.id) || {};
      const mergedStudent = {
        ...s,
        fatherName: det.fatherName || s.stdFather || s.fatherName || "",
        fatherOccupation: det.fatherOccupation || "",
        motherName: det.motherName || s.stdMother || s.motherName || "",
        motherOccupation: det.motherOccupation || "",
        dob: det.dob || s.dob || "",
        aadhar: det.aadhar || s.aadhar || "",
        registrationNo: det.registrationNo || s.registrationNo || s.generalRegNo || "",
        generalRegNo: det.registrationNo || s.registrationNo || s.generalRegNo || "",
        motherTongue: det.motherTongue || s.motherTongue || "",
        caste: det.caste || s.caste || "",
        religion: det.religion || s.religion || "",
        address: det.address || s.address || "",
        mobile: det.phone || s.phone || s.mobile || "",
        studentId: det.studentId || s.studentId || s.id || "",
        aparId: det.aparId || "",
        height: det.height || "",
        weight: det.weight || "",
      };
      const key = s.rollNo ? `${s.rollNo}_${s.name}` : s.name;
      if (!uniqueMap.has(key)) uniqueMap.set(key, mergedStudent);
    }
  });
  const finalStudents = Array.from(uniqueMap.values());
  finalStudents.sort((a, b) => (parseInt(a.rollNo) || 0) - (parseInt(b.rollNo) || 0));
  return finalStudents;
};

/**
 * Fetch marks for a class & academicYear & term from all Firestore & Bunny CDN sources
 */
export const fetchFirestoreMarks = async (selectedClass, academicYear, term = "first", teacherId = null) => {
  const activeTeacherId = teacherId || (typeof localStorage !== "undefined" ? localStorage.getItem("current_teacher_id") : null);
  
  let bunnyMarksSec = {};
  let bunnyMarksFirst = {};

  try {
    if (activeTeacherId) {
      bunnyMarksSec = (await fetchJsonFromBunny(`cce_results/${activeTeacherId}_${selectedClass}_${academicYear}_marks_second.json`)) || {};
      bunnyMarksFirst = (await fetchJsonFromBunny(`cce_results/${activeTeacherId}_${selectedClass}_${academicYear}_marks_first.json`)) || {};
    }
  } catch (e) {}

  let mergedMarks = {};

  const loadDocData = async (examKey) => {
    if (activeTeacherId) {
      try {
        const snap = await getDoc(doc(db, "cce_marks_v2", `${activeTeacherId}_${selectedClass}_${academicYear}_${examKey}`));
        if (snap.exists()) return snap.data().records || snap.data().marksData || snap.data();
      } catch (e) {}
    }
    // Fallback if no activeTeacherId or for legacy
    try {
      const snap = await getDoc(doc(db, "cce_marks_v2", `${selectedClass}_${academicYear}_${examKey}`));
      if (snap.exists()) return snap.data().records || snap.data().marksData || snap.data();
    } catch (e) {}
    return {};
  };

  const sem1 = await loadDocData("sem1");
  const sem2 = await loadDocData("sem2");
  const gen = await loadDocData("");

  mergedMarks = {
    ...(gen.semester2 || gen.semester1 || gen.marksData || gen.data || gen || {}),
    ...(sem1.records || sem1.marksData || sem1 || {}),
    ...(sem2.records || sem2.marksData || sem2 || {}),
    ...bunnyMarksFirst,
    ...bunnyMarksSec,
  };

  return mergedMarks;
};

/**
 * Merge marks into student marks format
 */
export const matchAndMergeMarks = (students = [], currentMarks = {}, firestoreMarks = {}, subjects = []) => {
  const merged = { ...(currentMarks || {}) };
  
  (students || []).forEach(std => {
    if (!std) return;
    const stdKeys = [std.id, std.srNo, std.rollNo, std.name, std.fullName, String(std.rollNo)].filter(Boolean);
    
    let stdFsMarks = {};
    for (const k of stdKeys) {
      if (firestoreMarks[k]) {
        stdFsMarks = firestoreMarks[k];
        break;
      }
    }
    
    const targetKey = std.srNo || std.id || std.rollNo || std.name;
    if (!merged[targetKey]) {
      merged[targetKey] = {};
    }
    
    (subjects || []).forEach(sub => {
      let subData = stdFsMarks[sub];
      if (!subData) {
        const lower = String(sub).toLowerCase();
        if (lower.includes("मराठी")) subData = stdFsMarks["marathi"] || stdFsMarks["प्रथम भाषा : मराठी"] || stdFsMarks["Marathi"];
        else if (lower.includes("इंग्रजी") || lower === "english") subData = stdFsMarks["english"] || stdFsMarks["English"] || stdFsMarks["द्वितीय भाषा : इंग्रजी"];
        else if (lower.includes("गणित") || lower.includes("math")) subData = stdFsMarks["Mathematics"] || stdFsMarks["math"] || stdFsMarks["maths"] || stdFsMarks["गणित"];
        else if (lower.includes("विज्ञान") || lower.includes("science")) subData = stdFsMarks["General Science"] || stdFsMarks["science"] || stdFsMarks["सामान्य विज्ञान"];
        else if (lower.includes("सामाजिक") || lower.includes("social")) subData = stdFsMarks["Social Sciences"] || stdFsMarks["social"] || stdFsMarks["सामाजिक शास्त्रे"];
        else if (lower.includes("परिसर") || lower.includes("environment")) subData = stdFsMarks["Environmental Studies"] || stdFsMarks["परिसर अभ्यास"];
        else if (lower.includes("कला")) subData = stdFsMarks["kala"] || stdFsMarks["कला"] || stdFsMarks["Art"];
        else if (lower.includes("कार्यानुभव")) subData = stdFsMarks["karyanubhav"] || stdFsMarks["कार्यानुभव"] || stdFsMarks["Work Experience"];
        else if (lower.includes("शारीरिक")) subData = stdFsMarks["sharirik"] || stdFsMarks["शारीरिक शिक्षण"] || stdFsMarks["Physical Education"];
      }

      if (subData) {
        merged[targetKey][sub] = {
          ...(merged[targetKey][sub] || {}),
          ...subData,
        };
      }
    });
  });
  
  return merged;
};
