import { db } from "../lib/firebase";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { fetchJsonFromBunny, saveJsonToBunny } from "../lib/bunnyStorage";

/**
 * Fetch students for a class from Firestore (users & students collections) and Bunny Storage CDN
 */
export const fetchStudentsForClass = async (selectedClass) => {
  let loadedStudents = [];
  const normalizeClass = (cls) => (cls ? String(cls).trim().toLowerCase().replace(/[^0-9a-z]/g, "") : "");
  const targetClassNorm = normalizeClass(selectedClass);

  try {
    const uQuery = query(collection(db, "users"), where("role", "==", "student"));
    const uSnap = await getDocs(uQuery);
    uSnap.forEach((docSnap) => {
      const d = docSnap.data();
      const stdClassNorm = normalizeClass(d.class || d.currentClass || d.className);
      if (!stdClassNorm || stdClassNorm === targetClassNorm || d.class === selectedClass) {
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
        const stdClassNorm = normalizeClass(d.class || d.currentClass || d.className);
        if (!stdClassNorm || stdClassNorm === targetClassNorm || d.class === selectedClass) {
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
export const fetchFirestoreMarks = async (selectedClass, academicYear, term = "first") => {
  const filePathSec = `cce_results/${selectedClass}_${academicYear}_marks_second.json`;
  const filePathFirst = `cce_results/${selectedClass}_${academicYear}_marks_first.json`;
  
  let bunnyMarksSec = {};
  let bunnyMarksFirst = {};

  try {
    bunnyMarksSec = (await fetchJsonFromBunny(filePathSec)) || {};
    bunnyMarksFirst = (await fetchJsonFromBunny(filePathFirst)) || {};
  } catch (e) {}

  let fsDataGen = {};
  let fsDataSem1 = {};
  let fsDataSem2 = {};

  try {
    const docId = `${selectedClass}_${academicYear}`;
    const snapGen = await getDoc(doc(db, "cce_marks_v2", docId));
    const snapSem1 = await getDoc(doc(db, "cce_marks_v2", `${selectedClass}_${academicYear}_sem1`));
    const snapSem2 = await getDoc(doc(db, "cce_marks_v2", `${selectedClass}_${academicYear}_sem2`));

    fsDataGen = snapGen.exists() ? snapGen.data() : {};
    fsDataSem1 = snapSem1.exists() ? snapSem1.data() : {};
    fsDataSem2 = snapSem2.exists() ? snapSem2.data() : {};
  } catch (err) {
    console.error("Error fetching marks:", err);
  }

  const merged = {
    ...(fsDataGen.semester2 || fsDataGen.semester1 || fsDataGen.marksData || fsDataGen.data || fsDataGen || {}),
    ...(fsDataSem1.records || fsDataSem1.marksData || fsDataSem1 || {}),
    ...(fsDataSem2.records || fsDataSem2.marksData || fsDataSem2 || {}),
    ...bunnyMarksFirst,
    ...bunnyMarksSec,
  };

  return merged;
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
        if (lower.includes("मराठी")) subData = stdFsMarks["marathi"] || stdFsMarks["प्रथम भाषा : मराठी"];
        else if (lower.includes("इंग्रजी")) subData = stdFsMarks["english"] || stdFsMarks["द्वितीय भाषा : इंग्रजी"];
        else if (lower.includes("गणित")) subData = stdFsMarks["math"] || stdFsMarks["maths"] || stdFsMarks["गणित"];
        else if (lower.includes("कला")) subData = stdFsMarks["kala"] || stdFsMarks["कला"];
        else if (lower.includes("कार्यानुभव")) subData = stdFsMarks["karyanubhav"] || stdFsMarks["कार्यानुभव"];
        else if (lower.includes("शारीरिक")) subData = stdFsMarks["sharirik"] || stdFsMarks["शारीरिक शिक्षण"];
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
