import React, { useState, useEffect, useRef } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { Download, Printer, ArrowLeft, Loader2, AlertCircle, Copy, FileText } from "lucide-react";
import { toast } from "sonner";
import "./result.css";

import { matchStudentClassAndMedium, fetchStudentsForClass } from "./firestoreMarksHelper";
import { getDefaultSubjectsForClass } from "../data/cceSubjects";
import { getTeacherId } from "../lib/teacherIsolationHelper";

const DEFAULT_SUBJECTS = [
  "प्रथम भाषा : मराठी",
  "द्वितीय भाषा : इंग्रजी",
  "गणित",
  "कला",
  "कार्यानुभव",
  "शारीरिक शिक्षण"
];

// Grade calculation helper based on percentage
const getGrade = (percentage) => {
  const p = Number(percentage) || 0;
  if (p >= 91) return "अ-1";
  if (p >= 81) return "अ-2";
  if (p >= 71) return "ब-1";
  if (p >= 61) return "ब-2";
  if (p >= 51) return "क-1";
  if (p >= 41) return "क-2";
  if (p >= 33) return "ड";
  if (p >= 21) return "इ-1";
  return "इ-2";
};

const ProgressSheet = ({ initialClass = "1st", initialYear = "2025-26", initialSemester = "sem2", onBack }) => {
  const [selectedClass, setSelectedClass] = useState(initialClass || "1st");
  const [academicYear, setAcademicYear] = useState(initialYear || "2025-26");
  const [selectedSemester, setSelectedSemester] = useState(initialSemester || "sem2"); // sem1 = प्रथम सत्र | sem2 = द्वितीय सत्र
  const [division, setDivision] = useState("1");
  const [layoutMode, setLayoutMode] = useState("1page"); // "1page" (१ पान Portrait), "2pages" (२ पाने Portrait), "landscape" (आडवे)
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [selectedMedium, setSelectedMedium] = useState("marathi");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const [schoolData, setSchoolData] = useState({
    schoolName: "",
    udise: "",
    teacherName: "",
    headmasterName: "",
    address: "",
    slogan: "✦ ज्ञान, संस्कार आणि प्रगतीसाठी ✦",
  });

  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [students, setStudents] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [remarksData, setRemarksData] = useState({});
  const [attendanceData, setAttendanceData] = useState({});

  const printRef = useRef(null);

  useEffect(() => {
    // 0. Check Instant LocalStorage Cache first for 0ms initial render
    const cacheKey = `cce_progress_cache_${selectedClass}_${academicYear}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.students && parsed.students.length > 0) {
          if (parsed.schoolData) setSchoolData(parsed.schoolData);
          if (parsed.students) setStudents(parsed.students);
          if (parsed.marksData) setMarksData(parsed.marksData);
          if (parsed.remarksData) setRemarksData(parsed.remarksData);
          if (parsed.attendanceData) setAttendanceData(parsed.attendanceData);
          if (parsed.workingDaysData) setWorkingDaysData(parsed.workingDaysData);
          setLoading(false); // Instant 0ms show!
        }
      }
    } catch (e) { }

    loadUserFirestoreData(selectedSemester);
  }, [selectedClass, academicYear, selectedMedium, selectedSemester]);

  const loadUserFirestoreData = async (term = "sem2") => {
    const termSuffix = term === "sem1" ? "sem1" : "sem2";
    const docId = `${selectedClass}_${academicYear}`;
    const currentTeacherId = getTeacherId();
    const currentMedium = selectedMedium || (typeof localStorage !== "undefined" ? localStorage.getItem("cce_selected_medium") : null) || "marathi";

    try {
      // Execute all 5 major data groups IN PARALLEL with Promise.all
      const [settingsResult, studentsResult, marksResult, remarksResult, attResult] = await Promise.all([
        // Task 1: School Settings & Subjects
        (async () => {
          let globalSettings = null;
          try {
            const cachedGen = localStorage.getItem("cce_general_school_settings");
            if (cachedGen) globalSettings = JSON.parse(cachedGen);
          } catch (e) { }

          let classSettings = {};
          try {
            const settingsSnap = await getDoc(doc(db, "cce_settings", docId));
            if (settingsSnap.exists()) classSettings = settingsSnap.data();
          } catch (e) { }

          const mergedSettings = { ...(globalSettings || {}), ...classSettings };
          const schoolObj = {
            schoolName: mergedSettings.schoolName || globalSettings?.schoolName || "",
            udise: mergedSettings.udiseCode || mergedSettings.udise || globalSettings?.udiseCode || "",
            teacherName: classSettings.teacherName || "",
            headmasterName: mergedSettings.principalName || mergedSettings.headmasterName || globalSettings?.principalName || "",
            address: mergedSettings.address || globalSettings?.address || "",
            slogan: mergedSettings.slogan || "✦ ज्ञान, संस्कार आणि प्रगतीसाठी ✦",
          };

          let classSubjects = (mergedSettings.subjects && Array.isArray(mergedSettings.subjects) && mergedSettings.subjects.length > 0)
            ? mergedSettings.subjects
            : getDefaultSubjectsForClass(selectedClass, selectedMedium);

          return { schoolObj, classSubjects };
        })(),

        // Task 2: Students List
        (async () => {
          let loadedStudents = await fetchStudentsForClass(selectedClass, currentMedium, currentTeacherId) || [];
          if (!Array.isArray(loadedStudents)) loadedStudents = [];

          try {
            const detailsMap = new Map();
            const detailsSnap = await getDocs(collection(db, "student_details"));
            detailsSnap.forEach((docSnap) => detailsMap.set(docSnap.id, docSnap.data()));

            loadedStudents = loadedStudents.map((s) => {
              const det = detailsMap.get(s.id) || {};
              const info = s.studentInfo || {};
              return {
                ...s,
                rollNo: det.rollNo || s.rollNo || info.rollNo || "",
                name: det.name || s.name || s.fullName || info.studentName || "",
                fullName: det.fullName || s.fullName || s.name || info.studentName || "",
                fatherName: det.fatherName || s.fatherName || info.fatherName || "",
                fatherOccupation: det.fatherOccupation || s.fatherOccupation || info.fatherOccupation || "",
                motherName: det.motherName || s.motherName || info.motherName || "",
                motherOccupation: det.motherOccupation || s.motherOccupation || info.motherOccupation || "",
                dob: det.dob || s.dob || info.dob || "",
                aadhar: det.aadhar || s.aadhar || s.aadhaarNo || info.aadhaarNo || "",
                generalRegNo: det.registrationNo || s.generalRegNo || s.grNo || info.grNo || "",
                motherTongue: det.motherTongue || s.motherTongue || info.motherTongue || "मराठी",
                caste: det.caste || s.caste || s.category || info.category || "",
                religion: det.religion || s.religion || info.religion || "",
                address: det.address || s.address || info.address || "",
                mobile: det.phone || s.mobile || s.contact || info.contact || "",
                studentId: det.studentId || s.id || s.penNo || info.penNo || "",
                aparId: det.aparId || info.penNo || "",
                nextClass: det.nextClass || s.nextClass || info.nextClass || "दुसरी",
                height: det.height || s.height || s.health?.height || info.health?.height || "",
                weight: det.weight || s.weight || s.health?.weight || info.health?.weight || "",
                attendance: s.attendance || info.attendance || null,
              };
            });
          } catch (e) { }

          if (loadedStudents.length === 0) {
            loadedStudents = [
              {
                id: "demo_std_1",
                rollNo: "1",
                generalRegNo: "2000",
                studentId: "2011061",
                name: "सिद्धांत आनंदराव सुर्यवंशी",
                fullName: "सिद्धांत आनंदराव सुर्यवंशी",
                dob: "03-07-2019",
                caste: "ओपन",
                motherName: "शोभा",
                fatherName: "आनंदराव",
                motherTongue: "मराठी",
                medium: "मराठी",
                address: "धोंडेवाडी ता. तासगाव जि. सांगली",
                mobile: "9309800969",
                nextClass: "दुसरी",
                weight: "29",
                height: "120",
              }
            ];
          }

          loadedStudents.sort((a, b) => (parseInt(a.rollNo) || 0) - (parseInt(b.rollNo) || 0));
          return loadedStudents;
        })(),

        // Task 3: Marks Data (Parallel Firestore queries)
        (async () => {
          const mergedMarks = {};
          try {
            const termExamKeys = termSuffix === "sem1"
              ? ["sem1", "test1", "oral1", "pratyakshik1"]
              : ["sem2", "test2", "oral2", "pratyakshik2"];

            const [marksGenSnap, ...examSnaps] = await Promise.all([
              getDoc(doc(db, "cce_marks_v2", `${currentTeacherId}_${docId}`)).catch(() => null),
              ...termExamKeys.map(exKey => getDoc(doc(db, "cce_marks_v2", `${currentTeacherId}_${selectedClass}_${academicYear}_${exKey}`)).catch(() => null))
            ]);

            const fsGen = (marksGenSnap && marksGenSnap.exists())
              ? (marksGenSnap.data().records || marksGenSnap.data().marksData || marksGenSnap.data())
              : {};

            const allStudentKeys = new Set(Object.keys(fsGen || {}));

            examSnaps.forEach((snap) => {
              if (snap && snap.exists()) {
                const d = snap.data();
                const exData = d.records || d.marksData || d.data || d;
                Object.keys(exData).forEach((sId) => {
                  allStudentKeys.add(sId);
                  if (!mergedMarks[sId]) mergedMarks[sId] = {};
                  if (!mergedMarks[sId][termSuffix]) mergedMarks[sId][termSuffix] = {};
                  if (exData[sId] && typeof exData[sId] === "object") {
                    Object.assign(mergedMarks[sId][termSuffix], exData[sId]);
                  }
                });
              }
            });

            allStudentKeys.forEach((sId) => {
              if (!mergedMarks[sId]) mergedMarks[sId] = {};
              if (!mergedMarks[sId][termSuffix]) mergedMarks[sId][termSuffix] = {};
              const genStd = fsGen[sId];
              if (genStd && typeof genStd === "object") {
                const termNested = genStd[termSuffix] || genStd[termSuffix === "sem1" ? "semester1" : "semester2"];
                if (termNested && typeof termNested === "object") {
                  Object.assign(mergedMarks[sId][termSuffix], termNested);
                } else {
                  Object.assign(mergedMarks[sId][termSuffix], genStd);
                }
              }
            });
          } catch (e) { }
          return mergedMarks;
        })(),

        // Task 4: Remarks Data
        (async () => {
          let mergedRemarks = {};
          try {
            const cacheKey = `cce_remarks_cache_${currentTeacherId}_${selectedClass}_${academicYear}_${termSuffix}_${currentMedium}`;
            let cached = null;
            try { cached = localStorage.getItem(cacheKey); } catch (e) { }

            if (cached) {
              mergedRemarks = JSON.parse(cached);
            } else {
              const docIds = [
                `${currentTeacherId}_${selectedClass}_${academicYear}_${termSuffix}_${currentMedium}`,
                `${selectedClass}_${academicYear}_${termSuffix}`,
              ];
              const snaps = await Promise.all(docIds.map(id => getDoc(doc(db, "cce_remarks_v2", id)).catch(() => null)));
              for (const snap of snaps) {
                if (snap && snap.exists()) {
                  const data = snap.data();
                  const recs = data.records || data.remarks || data.data || null;
                  if (recs && typeof recs === "object") {
                    Object.entries(recs).forEach(([sId, val]) => {
                      if (!mergedRemarks[sId]) mergedRemarks[sId] = {};
                      mergedRemarks[sId][termSuffix] = val;
                    });
                    break;
                  }
                }
              }
            }
          } catch (e) { }
          return mergedRemarks;
        })(),

        // Task 5: Attendance Data & Working Days (Parallel month queries)
        (async () => {
          const attendanceMap = {};
          let wDays = {};
          try {
            const monthKeys = ["june", "july", "august", "september", "october", "november", "december", "january", "february", "march", "april", "may"];

            const [wDaysSnap, attSnap, ...monthSnaps] = await Promise.all([
              getDoc(doc(db, "cce_attendance", `${selectedClass}_${academicYear}_working_days`)).catch(() => null),
              getDoc(doc(db, "cce_attendance", docId)).catch(() => null),
              ...monthKeys.map(mK => getDoc(doc(db, "cce_attendance", `${selectedClass}_${academicYear}_${mK}`)).catch(() => null))
            ]);

            if (wDaysSnap && wDaysSnap.exists()) {
              wDays = wDaysSnap.data().workingDays || {};
            }

            if (attSnap && attSnap.exists()) {
              const attFsData = attSnap.data().attendanceData || attSnap.data() || {};
              Object.keys(attFsData).forEach((stdId) => {
                if (!attendanceMap[stdId]) attendanceMap[stdId] = {};
                Object.assign(attendanceMap[stdId], attFsData[stdId]);
              });
            }

            monthSnaps.forEach((mSnap, idx) => {
              if (mSnap && mSnap.exists()) {
                const mKey = monthKeys[idx];
                const records = mSnap.data().records || {};
                Object.keys(records).forEach((stdId) => {
                  const stdRecords = records[stdId] || {};
                  let presentCount = 0;
                  if (typeof stdRecords === "object" && stdRecords !== null) {
                    Object.values(stdRecords).forEach((status) => {
                      if (status === "P" || status === "present" || status === "1" || status === 1) {
                        presentCount++;
                      }
                    });
                  } else if (typeof stdRecords === "number") {
                    presentCount = stdRecords;
                  }
                  if (!attendanceMap[stdId]) attendanceMap[stdId] = {};
                  attendanceMap[stdId][mKey] = presentCount;
                });
              }
            });
          } catch (e) { }
          return { attendanceMap, wDays };
        })()
      ]);

      // Apply state updates simultaneously
      if (settingsResult?.schoolObj) setSchoolData(settingsResult.schoolObj);
      if (settingsResult?.classSubjects) setSubjects(settingsResult.classSubjects);
      if (studentsResult) setStudents(studentsResult);
      if (marksResult) setMarksData(marksResult);
      if (remarksResult) setRemarksData(remarksResult);
      if (attResult?.attendanceMap) setAttendanceData(attResult.attendanceMap);
      if (attResult?.wDays) setWorkingDaysData(attResult.wDays);

      // Save to LocalStorage for instant 0ms next load
      try {
        const cacheKey = `cce_progress_cache_${selectedClass}_${academicYear}`;
        localStorage.setItem(cacheKey, JSON.stringify({
          schoolData: settingsResult?.schoolObj,
          students: studentsResult,
          marksData: marksResult,
          remarksData: remarksResult,
          attendanceData: attResult?.attendanceMap,
          workingDaysData: attResult?.wDays,
        }));
      } catch (e) { }

    } catch (err) {
      console.error("Error loading ProgressSheet data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    toast.info("प्रगती पत्रक PDF तयार होत आहे, कृपया वाट पाहा...");
    try {
      let pageElements = printRef.current.querySelectorAll(".pdf-page");
      if (!pageElements || pageElements.length === 0) {
        pageElements = [printRef.current];
      }

      try {
        const html2canvas = (await import("html2canvas")).default;
        const { jsPDF } = await import("jspdf");

        const pdf = new jsPDF({
          unit: "mm",
          format: "a4",
          orientation: "portrait",
          compress: true,
        });

        for (let i = 0; i < pageElements.length; i++) {
          const pageEl = pageElements[i];

          const canvas1 = await html2canvas(pageEl, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
          });

          const canvas2 = document.createElement("canvas");
          canvas2.width = canvas1.height;
          canvas2.height = canvas1.width;

          const ctx = canvas2.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas2.width, canvas2.height);

          ctx.translate(canvas2.width / 2, canvas2.height / 2);
          ctx.rotate((90 * Math.PI) / 180);
          ctx.drawImage(canvas1, -canvas1.width / 2, -canvas1.height / 2);

          const imgData = canvas2.toDataURL("image/jpeg", 0.75);
          if (i > 0) pdf.addPage("a4", "portrait");
          pdf.addImage(imgData, "JPEG", 5, 5, 200, 287, undefined, "FAST");
        }

        pdf.save(`प्रगती_पत्रक_${selectedClass}_${academicYear}.pdf`);
        toast.success("प्रगती पत्रक PDF यशस्वीरित्या डाऊनलोड झाली!");
      } catch (innerErr) {
        // Fallback to html2pdf.js
        const { default: html2pdf } = await import("html2pdf.js");
        const element = printRef.current;
        const opt = {
          margin: [4, 4, 4, 4],
          filename: `प्रगती_पत्रक_${selectedClass}_${academicYear}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
        };
        await html2pdf().set(opt).from(element).save();
        toast.success("प्रगती पत्रक PDF यशस्वीरित्या डाऊनलोड झाली!");
      }
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("PDF निर्मितीत अडचण आली: " + (err?.message || err));
    }
    setDownloading(false);
  };


  const handlePrint = () => {
    window.print();
  };

  // Helper to format student remarks by category/subject
  const getFormattedRemark = (student, labelOrKey, term = "sem1") => {
    if (!student || !remarksData) return "-";

    const stdKeys = [
      student.id,
      student.rollNo,
      String(student.rollNo),
      student.name,
      student.fullName,
      student.studentId,
    ].filter(Boolean);

    let studentRemarksObj = null;
    for (const k of stdKeys) {
      if (remarksData[k]) {
        studentRemarksObj = remarksData[k];
        break;
      }
    }

    if (!studentRemarksObj) {
      const allRemKeys = Object.keys(remarksData);
      for (const k of allRemKeys) {
        const lowerK = String(k).toLowerCase();
        if (
          (student.fullName && lowerK.includes(String(student.fullName).toLowerCase())) ||
          (student.name && lowerK.includes(String(student.name).toLowerCase())) ||
          (student.rollNo && lowerK === String(student.rollNo).toLowerCase())
        ) {
          studentRemarksObj = remarksData[k];
          break;
        }
      }
    }

    if (!studentRemarksObj || typeof studentRemarksObj !== "object") return "-";

    const termObj = term === "sem2"
      ? (studentRemarksObj.term2 || studentRemarksObj.sem2 || studentRemarksObj)
      : (studentRemarksObj.term1 || studentRemarksObj.sem1 || studentRemarksObj);

    if (!termObj || typeof termObj !== "object") return "-";

    const notesObj = termObj.descriptiveNotes || termObj;
    let val = notesObj[labelOrKey];

    if (!val) {
      const lower = String(labelOrKey).toLowerCase();
      if (lower.includes("विशेष")) {
        val = notesObj.specialProgress || notesObj.vishesh;
      } else if (lower.includes("आवड") || lower.includes("छंद")) {
        val = notesObj.interestsHobbies || notesObj.aavad || notesObj.chand;
      } else if (lower.includes("सुधारणा")) {
        val = notesObj.areasForImprovement || notesObj.sudharna;
      }
    }

    if (!val) {
      const lower = String(labelOrKey).toLowerCase();
      const allTermKeys = Object.keys(termObj);

      for (const tKey of allTermKeys) {
        const lowerTKey = tKey.toLowerCase();
        if (
          ((lower.includes("विशेष") || lower.includes("vishesh")) && (lowerTKey.includes("vishesh") || lowerTKey.includes("विशेष"))) ||
          ((lower.includes("आवड") || lower.includes("aavad") || lower.includes("छंद")) && (lowerTKey.includes("aavad") || lowerTKey.includes("आवड") || lowerTKey.includes("छंद"))) ||
          ((lower.includes("सुधारणा") || lower.includes("sudharna")) && (lowerTKey.includes("sudharna") || lowerTKey.includes("सुधारणा"))) ||
          ((lower.includes("मराठी") || lower.includes("prathambhasha")) && (lowerTKey.includes("prathambhasha") || lowerTKey.includes("marathi") || lowerTKey.includes("मराठी"))) ||
          ((lower.includes("इंग्रजी") || lower.includes("dvitiybhasha")) && (lowerTKey.includes("dvitiybhasha") || lowerTKey.includes("english") || lowerTKey.includes("इंग्रजी"))) ||
          ((lower.includes("गणित") || lower.includes("ganit")) && (lowerTKey.includes("ganit") || lowerTKey.includes("math") || lowerTKey.includes("गणित"))) ||
          ((lower.includes("कला") || lower.includes("kala")) && (lowerTKey.includes("kala") || lowerTKey.includes("कला"))) ||
          ((lower.includes("कार्यानुभव") || lower.includes("karyanubhav")) && (lowerTKey.includes("karyanubhav") || lowerTKey.includes("कार्यानुभव"))) ||
          ((lower.includes("शारीरिक") || lower.includes("sharirik")) && (lowerTKey.includes("sharirik") || lowerTKey.includes("शारीरिक"))) ||
          ((lower.includes("व्यक्तिमत्त्व") || lower.includes("vyaktimatva")) && (lowerTKey.includes("vyaktimatva") || lowerTKey.includes("व्यक्तिमत्त्व")))
        ) {
          val = termObj[tKey];
          break;
        }
      }
    }

    if (!val && termObj !== studentRemarksObj) {
      const lower = String(labelOrKey).toLowerCase();
      const allRootKeys = Object.keys(studentRemarksObj);
      for (const rKey of allRootKeys) {
        if (rKey === "sem1" || rKey === "sem2" || rKey === "term1" || rKey === "term2") continue;
        const lowerRKey = rKey.toLowerCase();
        if (
          ((lower.includes("विशेष") || lower.includes("vishesh")) && (lowerRKey.includes("vishesh") || lowerRKey.includes("विशेष"))) ||
          ((lower.includes("आवड") || lower.includes("aavad") || lower.includes("छंद")) && (lowerRKey.includes("aavad") || lowerRKey.includes("आवड") || lowerRKey.includes("छंद"))) ||
          ((lower.includes("सुधारणा") || lower.includes("sudharna")) && (lowerRKey.includes("sudharna") || lowerRKey.includes("सुधारणा")))
        ) {
          val = studentRemarksObj[rKey];
          break;
        }
      }
    }

    if (!val) return "-";
    if (Array.isArray(val)) {
      const filtered = val.map(v => String(v).trim()).filter(Boolean);
      return filtered.length > 0 ? filtered.join(" ") : "-";
    }
    return String(val).trim() || "-";
  };

  // Helper to calculate Grade from percentage according to Maharashtra CCE Grade Scale
  const calculateCceGrade = (percent) => {
    if (percent === undefined || percent === null || isNaN(percent)) return "-";
    const p = Number(percent);
    if (p >= 91) return "अ-1";
    if (p >= 81) return "अ-2";
    if (p >= 71) return "ब-1";
    if (p >= 61) return "ब-2";
    if (p >= 51) return "क-1";
    if (p >= 41) return "क-2";
    if (p >= 33) return "ड";
    if (p >= 21) return "इ-1";
    return "इ-2";
  };

  // Helper to calculate subject grade for a student and semester term
  const getSubjectGradeForTerm = (student, subjectName, term = "sem1") => {
    if (!student) return "-";

    // Direct check if student object has term1 / term2 grades from JSON schema
    const schemaTerm = term === "sem2" ? (student.term2 || student.sem2) : (student.term1 || student.sem1);
    if (schemaTerm && schemaTerm.grades) {
      const lower = String(subjectName).toLowerCase();
      const g = schemaTerm.grades;
      if (lower.includes("मराठी") && g.firstLanguage) return g.firstLanguage;
      if (lower.includes("इंग्रजी") && g.secondLanguage) return g.secondLanguage;
      if (lower.includes("गणित") && (g.maths || g.math)) return g.maths || g.math;
      if (lower.includes("कला") && g.art) return g.art;
      if (lower.includes("कार्यानुभव") && g.workExperience) return g.workExperience;
      if (lower.includes("शारीरिक") && g.physicalEdu) return g.physicalEdu;
    }

    if (!marksData) return "-";
    const stdKeys = [student.id, student.rollNo, student.name, student.fullName, String(student.rollNo)].filter(Boolean);

    let studentMarksObj = null;
    for (const k of stdKeys) {
      if (marksData[k]) {
        studentMarksObj = marksData[k];
        break;
      }
    }
    if (!studentMarksObj || typeof studentMarksObj !== "object") return "-";

    const termMap = term === "sem1"
      ? (studentMarksObj.term1 || studentMarksObj.sem1 || studentMarksObj.semester1 || studentMarksObj)
      : (studentMarksObj.term2 || studentMarksObj.sem2 || studentMarksObj.semester2 || studentMarksObj);

    const getSubData = (subName) => {
      if (termMap.grades && typeof termMap.grades === "object") {
        const lower = String(subName).toLowerCase();
        const g = termMap.grades;
        if (lower.includes("मराठी") && g.firstLanguage) return g.firstLanguage;
        if (lower.includes("इंग्रजी") && g.secondLanguage) return g.secondLanguage;
        if (lower.includes("गणित") && (g.maths || g.math)) return g.maths || g.math;
        if (lower.includes("कला") && g.art) return g.art;
        if (lower.includes("कार्यानुभव") && g.workExperience) return g.workExperience;
        if (lower.includes("शारीरिक") && g.physicalEdu) return g.physicalEdu;
      }

      if (termMap[subName]) return termMap[subName];
      const lower = String(subName).toLowerCase();
      if (lower.includes("मराठी")) return termMap["marathi"] || termMap["firstLanguage"] || termMap["प्रथम भाषा : मराठी"] || termMap["प्रथम भाषा: मराठी"] || termMap["मराठी"] || {};
      if (lower.includes("इंग्रजी")) return termMap["english"] || termMap["secondLanguage"] || termMap["द्वितीय भाषा : इंग्रजी"] || termMap["द्वितीय भाषा: इंग्रजी"] || termMap["तृतीय भाषा: इंग्रजी"] || termMap["इंग्रजी"] || {};
      if (lower.includes("गणित")) return termMap["math"] || termMap["maths"] || termMap["गणित"] || {};
      if (lower.includes("कला")) return termMap["kala"] || termMap["art"] || termMap["कला"] || {};
      if (lower.includes("कार्यानुभव")) return termMap["karyanubhav"] || termMap["workExperience"] || termMap["कार्यानुभव"] || {};
      if (lower.includes("शारीरिक")) return termMap["sharirik"] || termMap["physicalEdu"] || termMap["शारीरिक शिक्षण"] || {};
      return {};
    };

    const subData = getSubData(subjectName);
    if (!subData || (typeof subData !== "object" && typeof subData !== "number")) return "-";

    if (typeof subData === "string" && ["अ-1", "अ-2", "ब-1", "ब-2", "क-1", "क-2", "ड", "इ-1", "इ-2", "A1", "A2", "B1", "B2", "C1", "C2", "D", "E1", "E2"].includes(subData.trim())) {
      return subData.trim();
    }
    if (subData.grade) return String(subData.grade).trim();

    let totalMarks = 0;
    let maxMarks = 100;

    if (typeof subData === "number") {
      totalMarks = subData;
    } else {
      // Semester 2 (Grand Total)
      const oral = Number(subData.oral || subData.tondiKaam || 0);
      const act = Number(subData.activity || subData.upakramKriti || subData.pratyakshikPrayog || 0);
      const prj = Number(subData.project || subData.prakalp || subData.prakalpa || 0);
      const test = Number(subData.test || subData.chaachaniLekhi || 0);
      const hw = Number(subData.swadhyayVargakarya || subData.homework || 0);
      const semOral = Number(subData.semesterOral || subData.sankalitTondi || 0);
      const semPrat = Number(subData.semesterPractical || subData.sankalitPratyakshik || 0);
      const semW = Number(subData.semesterWritten || subData.sankalitLekhi || 0);
      const grandTotal = oral + act + prj + test + hw + semOral + semPrat + semW;
      if (grandTotal === 0) return "-";
      return getGrade((grandTotal / 100) * 100);
    }
  };

  const [workingDaysData, setWorkingDaysData] = useState({});

  const monthsList = [
    { label: "जून", key: "june", defaultDays: 30 },
    { label: "जुलै", key: "july", defaultDays: 31 },
    { label: "ऑगस्ट", key: "august", defaultDays: 31 },
    { label: "सप्टेंबर", key: "september", defaultDays: 30 },
    { label: "ऑक्टोबर", key: "october", defaultDays: 31 },
    { label: "नोव्हेंबर", key: "november", defaultDays: 30 },
    { label: "डिसेंबर", key: "december", defaultDays: 31 },
    { label: "जानेवारी", key: "january", defaultDays: 31 },
    { label: "फेब्रुवारी", key: "february", defaultDays: 28 },
    { label: "मार्च", key: "march", defaultDays: 31 },
    { label: "एप्रिल", key: "april", defaultDays: 30 },
    { label: "मे", key: "may", defaultDays: 31 },
  ];

  const getWorkingDaysForMonth = (student, m) => {
    if (student && student.attendance && Array.isArray(student.attendance)) {
      const match = student.attendance.find((a) => {
        const mLabel = String(a.month || "").toLowerCase();
        const targetLabel = m.label.toLowerCase();
        return mLabel.includes(targetLabel) || targetLabel.includes(mLabel);
      });
      if (match && match.workingDays !== undefined && match.workingDays !== null) {
        return Number(match.workingDays);
      }
    }
    const customWD = workingDaysData[m.key.toLowerCase()];
    if (customWD !== undefined && customWD !== null && customWD !== "") {
      return Number(customWD);
    }
    return m.defaultDays;
  };

  const getStudentPresentDays = (student, m) => {
    if (!student) return 0;
    if (student.attendance && Array.isArray(student.attendance)) {
      const match = student.attendance.find((a) => {
        const mLabel = String(a.month || "").toLowerCase();
        const targetLabel = m.label.toLowerCase();
        return mLabel.includes(targetLabel) || targetLabel.includes(mLabel);
      });
      if (match && match.presentDays !== undefined && match.presentDays !== null) {
        return Number(match.presentDays);
      }
    }

    if (!attendanceData) return 0;
    const stdKeys = [student.id, student.rollNo, student.name, student.fullName, String(student.rollNo)].filter(Boolean);

    let stdAttMap = null;
    for (const k of stdKeys) {
      if (attendanceData[k]) {
        stdAttMap = attendanceData[k];
        break;
      }
    }
    if (!stdAttMap || typeof stdAttMap !== "object") return 0;

    const lowerKey = m.key.toLowerCase();
    const val = stdAttMap[lowerKey];

    if (val !== undefined && val !== null && val !== "") {
      const parsed = Number(val);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
    return 0;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <Loader2 className="size-10 text-orange-600 animate-spin" />
        <p className="text-sm font-bold text-slate-600">विद्यार्थी प्रगती पत्रक लोड होत आहे, कृपया वाट पाहा...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-100 min-h-screen p-4 md:p-6 text-slate-800">


      {/* Top Header Actions */}
      <div className={`${layoutMode === "landscape" ? "max-w-[300mm]" : "max-w-5xl"} mx-auto flex flex-wrap items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 no-print gap-3 transition-all`}>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition-all cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          मागे जा (Back)
        </button>

        <div className="text-center">
          <h1 className="text-base sm:text-lg font-black text-orange-800">विद्यार्थी प्रगती पत्रक (Progress Sheet)</h1>
          <p className="text-xs text-slate-500 font-medium">इयत्ता {selectedClass} | शैक्षणिक वर्ष {academicYear}</p>
        </div>


        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <Printer className="size-4" />
            प्रिंट करा
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            PDF डाउनलोड
          </button>
        </div>
      </div>

      {/* -------------------- PRINTABLE PROGRESS SHEET CONTAINER -------------------- */}
      <div ref={printRef} className="w-full max-w-[295mm] mx-auto overflow-x-auto space-y-6 p-2">

        <style>{`
          @media print {
            @page {
              size: A4 ${layoutMode === "landscape" ? "landscape" : "portrait"};
              margin: 0;
            }
          }
        `}</style>
        {students.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-amber-200 shadow-sm max-w-2xl mx-auto my-8">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="size-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">कोणताही विद्यार्थी सापडला नाही</h3>
            <p className="text-sm text-slate-600 mb-4">
              तुमच्या या टीचर अकाऊंटसाठी इयत्ता <strong>{selectedClass}</strong> मध्ये अजून एकही विद्यार्थी जोडलेला नाही.
              विद्यार्थी जोडण्यासाठी 'विद्यार्थी व्यवस्थापन (Student Management)' विभागाचा वापर करा.
            </p>
          </div>
        ) : (
          students.map((student, idx) => {
            // ==================== LANDSCAPE / SIDE-BY-SIDE LAYOUT (आडवे - एकापुढे एक) ====================
            if (layoutMode === "landscape") {
              return (
                <div
                  key={student.id}
                  className="pdf-page bg-white p-4 border-2 border-amber-400 rounded-3xl h-[200mm] max-h-[200mm] w-[290mm] max-w-[290mm] mx-auto overflow-hidden shadow-sm flex flex-col justify-between mb-6"
                  style={{ pageBreakAfter: "always", breakAfter: "page" }}
                >
                  <div>
                    {/* Top Header Banner across full width */}
                    <div className="flex items-center justify-between border-b-2 border-amber-400 pb-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-orange-600 text-white rounded-lg flex items-center justify-center font-black text-xs shadow-sm">
                          SS
                        </div>
                        <div>
                          <h3 className="text-[11px] font-black text-orange-700 tracking-wider uppercase">समग्र शिक्षा</h3>
                          <p className="text-[8px] text-slate-500 font-bold">Samagra Shiksha</p>
                        </div>
                      </div>

                      <div className="text-center bg-amber-50 px-4 py-1 rounded-xl border border-amber-300">
                        <h2 className="text-xs sm:text-sm font-black text-amber-900 tracking-tight">
                          विद्यार्थी प्रगतीपत्रक सन {academicYear}
                        </h2>
                      </div>

                      <div className="text-right text-[9.5px] font-bold text-slate-700 flex items-center gap-3">
                        <span>विद्यार्थी: <b className="text-blue-800 font-black">{student.name}</b></span>
                        <span>इयत्ता: <b>{selectedClass} ({division})</b></span>
                        <span>हजेरी क्र.: <b className="text-orange-700">{student.rollNo || idx + 1}</b></span>
                        <span>यु-डायस: <b>{schoolData.udise || "-"}</b></span>
                      </div>
                    </div>

                    {/* 2 Main Columns Side-by-Side (Page 1 Left, Page 2 Right) */}
                    <div className="grid grid-cols-12 gap-3">
                      {/* ================= LEFT PAGE (PAGE 1: Profile, Attendance, Grade Reference) ================= */}
                      <div className="col-span-6 space-y-1.5 border-r border-dashed border-amber-300 pr-3">
                        <div className="bg-amber-100/60 px-2 py-0.5 rounded text-[10px] font-black text-amber-900 text-center">
                          १. विद्यार्थी माहिती व हजेरी तक्ता
                        </div>

                        {/* Student Profile Info Table */}
                        <div className="border border-amber-400 rounded-xl p-1 bg-white shadow-2xs overflow-hidden">
                          <table className="w-full text-[8.5px] border-collapse">
                            <tbody>
                              <tr className="border-b border-amber-200 bg-amber-50/50">
                                <td colSpan={4} className="py-0.5 px-1.5 font-bold text-slate-900">
                                  शाळा: <span className="font-extrabold text-amber-950">{schoolData.schoolName || "-"}</span>
                                </td>
                              </tr>
                              <tr className="border-b border-amber-200 bg-blue-50/30">
                                <td colSpan={4} className="py-0.5 px-1.5 font-bold text-slate-900">
                                  विद्यार्थ्याचे नाव: <span className="font-black text-blue-900 text-[9.5px]">{student.name || student.fullName || "-"}</span>
                                </td>
                              </tr>
                              <tr className="border-b border-amber-100">
                                <td className="w-[18%] py-0.5 px-1 font-bold text-slate-700">जन्म दि.:</td>
                                <td className="w-[32%] py-0.5 px-1 font-extrabold text-slate-900">{student.dob || "-"}</td>
                                <td className="w-[18%] py-0.5 px-1 font-bold text-slate-700">जन. रजि. क्र.:</td>
                                <td className="w-[32%] py-0.5 px-1 font-extrabold text-slate-900">{student.generalRegNo || "-"}</td>
                              </tr>
                              <tr className="border-b border-amber-100">
                                <td className="w-[18%] py-0.5 px-1 font-bold text-slate-700">आयडी:</td>
                                <td className="w-[32%] py-0.5 px-1 font-extrabold text-slate-900">{student.studentId || student.id || "-"}</td>
                                <td className="w-[18%] py-0.5 px-1 font-bold text-slate-700">संवर्ग:</td>
                                <td className="w-[32%] py-0.5 px-1 font-extrabold text-slate-900">{student.caste || "-"}</td>
                              </tr>
                              <tr className="border-b border-amber-100">
                                <td className="w-[18%] py-0.5 px-1 font-bold text-slate-700">आईचे नाव:</td>
                                <td className="w-[32%] py-0.5 px-1 font-extrabold text-slate-900">{student.motherName || "-"}</td>
                                <td className="w-[18%] py-0.5 px-1 font-bold text-slate-700">वडिलांचे नाव:</td>
                                <td className="w-[32%] py-0.5 px-1 font-extrabold text-slate-900">{student.fatherName || "-"}</td>
                              </tr>
                              <tr className="border-b border-amber-100">
                                <td className="w-[18%] py-0.5 px-1 font-bold text-slate-700">मातृभाषा:</td>
                                <td className="w-[32%] py-0.5 px-1 font-extrabold text-slate-900">{student.motherTongue || "मराठी"}</td>
                                <td className="w-[18%] py-0.5 px-1 font-bold text-slate-700">माध्यम:</td>
                                <td className="w-[32%] py-0.5 px-1 font-extrabold text-slate-900">मराठी</td>
                              </tr>
                              <tr>
                                <td className="w-[18%] py-0.5 px-1 font-bold text-slate-700">पत्ता:</td>
                                <td className="w-[32%] py-0.5 px-1 font-extrabold text-slate-900 truncate max-w-[100px]">{student.address || schoolData.address || "-"}</td>
                                <td className="w-[18%] py-0.5 px-1 font-bold text-slate-700">संपर्क:</td>
                                <td className="w-[32%] py-0.5 px-1 font-extrabold text-slate-900">{student.mobile || "-"}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Attendance & Grade Classification Tables Side-by-Side */}
                        <div className="grid grid-cols-12 gap-1.5">
                          {/* Attendance Table */}
                          <div className="col-span-7 border border-amber-400 rounded-xl p-1 bg-white">
                            <h4 className="text-[9.5px] font-black text-amber-900 text-center mb-0.5 pb-0.5 border-b border-amber-200">उपस्थिती</h4>
                            <table className="w-full border-collapse border border-amber-300 text-[8px] text-center">
                              <thead>
                                <tr className="bg-amber-100 font-extrabold text-amber-950">
                                  <th className="border border-amber-300 p-0.5">महिना</th>
                                  <th className="border border-amber-300 p-0.5">कामाचे दिवस</th>
                                  <th className="border border-amber-300 p-0.5">हजर दिवस</th>
                                </tr>
                              </thead>
                              <tbody>
                                {monthsList.map((m) => {
                                  const workingDays = getWorkingDaysForMonth(student, m);
                                  const pres = getStudentPresentDays(student, m);
                                  return (
                                    <tr key={m.key} className="border-b border-amber-200">
                                      <td className="border border-amber-300 p-0.2 font-bold text-slate-800 bg-amber-50/40">{m.label}</td>
                                      <td className="border border-amber-300 p-0.2">{workingDays}</td>
                                      <td className="border border-amber-300 p-0.2 font-bold text-blue-800">{pres}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Grade Classification Reference Table */}
                          <div className="col-span-5 border border-amber-400 rounded-xl p-1 bg-white flex flex-col justify-between">
                            <div>
                              <h4 className="text-[9.5px] font-black text-amber-900 text-center mb-0.5 pb-0.5 border-b border-amber-200">श्रेणी तक्ता</h4>
                              <table className="w-full border-collapse border border-amber-300 text-[8px] text-center">
                                <thead>
                                  <tr className="bg-amber-100 font-extrabold text-amber-950">
                                    <th className="border border-amber-300 p-0.5">गुण range</th>
                                    <th className="border border-amber-300 p-0.5">श्रेणी</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="border-b border-amber-200"><td className="border border-amber-300 p-0.2">91%-100%</td><td className="border border-amber-300 p-0.2 font-bold text-blue-700">अ-1</td></tr>
                                  <tr className="border-b border-amber-200"><td className="border border-amber-300 p-0.2">81%-90%</td><td className="border border-amber-300 p-0.2 font-bold text-blue-700">अ-2</td></tr>
                                  <tr className="border-b border-amber-200"><td className="border border-amber-300 p-0.2">71%-80%</td><td className="border border-amber-300 p-0.2 font-bold text-blue-700">ब-1</td></tr>
                                  <tr className="border-b border-amber-200"><td className="border border-amber-300 p-0.2">61%-70%</td><td className="border border-amber-300 p-0.2 font-bold text-blue-700">ब-2</td></tr>
                                  <tr className="border-b border-amber-200"><td className="border border-amber-300 p-0.2">51%-60%</td><td className="border border-amber-300 p-0.2 font-bold text-blue-700">क-1</td></tr>
                                  <tr className="border-b border-amber-200"><td className="border border-amber-300 p-0.2">41%-50%</td><td className="border border-amber-300 p-0.2 font-bold text-blue-700">क-2</td></tr>
                                  <tr className="border-b border-amber-200"><td className="border border-amber-300 p-0.2">33%-40%</td><td className="border border-amber-300 p-0.2 font-bold text-blue-700">ड</td></tr>
                                  <tr className="border-b border-amber-200"><td className="border border-amber-300 p-0.2">21%-32%</td><td className="border border-amber-300 p-0.2 font-bold text-blue-700">इ-1</td></tr>
                                  <tr><td className="border border-amber-300 p-0.2">≤20%</td><td className="border border-amber-300 p-0.2 font-bold text-blue-700">इ-2</td></tr>
                                </tbody>
                              </table>
                            </div>

                            {/* Health info with clean margin and background badge */}
                            <div className="pt-1 pb-1 px-1.5 border-t border-amber-200 text-[8px] font-bold text-slate-800 space-y-0.5 mt-auto bg-amber-50/50 rounded-b-lg border-x border-b border-amber-200/80">
                              <p>वजन: <b className="text-blue-900">{student.weight || "-"} kg</b> | उंची: <b className="text-blue-900">{student.height || "-"} cm</b></p>
                              <p>पुढील इयत्ता: <b className="text-emerald-800 font-black">दुसरी</b></p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ================= RIGHT PAGE (PAGE 2: Subject Grades & Descriptive Remarks) ================= */}
                      <div className="col-span-6 space-y-1.5 pl-1">
                        <div className="bg-amber-100/60 px-2 py-0.5 rounded text-[10px] font-black text-amber-900 text-center">
                          २. विषयनिहाय मूल्यमापन व वर्णनात्मक नोंदी
                        </div>

                        {/* Side-by-Side First Semester vs Second Semester */}
                        <div className="grid grid-cols-12 gap-1.5">
                          {/* FIRST SEMESTER */}
                          <div className="col-span-6 border border-amber-400 rounded-xl p-1 bg-white flex flex-col justify-between">
                            <div>
                              <h4 className="text-[9.5px] font-black text-amber-900 text-center mb-0.5 pb-0.5 border-b border-amber-200">प्रथम सत्र</h4>

                              {/* Subject Grades Table */}
                              <table className="w-full border-collapse border border-amber-300 text-[8px] text-center font-medium mb-1">
                                <thead>
                                  <tr className="bg-amber-100 font-extrabold text-amber-950">
                                    <th className="border border-amber-300 p-0.5 text-left">विषय</th>
                                    <th className="border border-amber-300 p-0.5 w-8">श्रेणी</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {subjects.map((subName) => {
                                    const sem1Grade = getSubjectGradeForTerm(student, subName, "sem1");
                                    return (
                                      <tr key={subName} className="border-b border-amber-200">
                                        <td className="border border-amber-300 p-0.2 text-left font-bold text-slate-900 bg-amber-50/20 truncate max-w-[90px]">{subName}</td>
                                        <td className="border border-amber-300 p-0.2 font-black text-blue-700">{sem1Grade}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>

                              {/* Remarks */}
                              <div className="space-y-0.5 border border-amber-300 rounded-lg p-1 bg-amber-50/20 text-[8px]">
                                <h5 className="font-black text-amber-900 text-center border-b border-amber-200 pb-0.2">वर्णनात्मक नोंदी</h5>
                                <div>
                                  <span className="font-extrabold text-amber-900 block">विशेष प्रगती:</span>
                                  <p className="text-slate-800 leading-tight font-medium bg-white p-0.5 rounded border border-amber-200 min-h-[22px]">
                                    {getFormattedRemark(student, "विशेष प्रगती", "sem1")}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-extrabold text-amber-900 block">आवड / छंद:</span>
                                  <p className="text-slate-800 leading-tight font-medium bg-white p-0.5 rounded border border-amber-200 min-h-[22px]">
                                    {getFormattedRemark(student, "आवड / छंद", "sem1")}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-extrabold text-amber-900 block">सुधारणा आवश्यक:</span>
                                  <p className="text-slate-800 leading-tight font-medium bg-white p-0.5 rounded border border-amber-200 min-h-[22px]">
                                    {getFormattedRemark(student, "सुधारणा आवश्यक", "sem1")}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* SECOND SEMESTER */}
                          <div className="col-span-6 border border-amber-400 rounded-xl p-1 bg-white flex flex-col justify-between">
                            <div>
                              <h4 className="text-[9.5px] font-black text-amber-900 text-center mb-0.5 pb-0.5 border-b border-amber-200">द्वितीय सत्र</h4>

                              {/* Subject Grades Table */}
                              <table className="w-full border-collapse border border-amber-300 text-[8px] text-center font-medium mb-1">
                                <thead>
                                  <tr className="bg-amber-100 font-extrabold text-amber-950">
                                    <th className="border border-amber-300 p-0.5 text-left">विषय</th>
                                    <th className="border border-amber-300 p-0.5 w-8">श्रेणी</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {subjects.map((subName) => {
                                    const sem2Grade = getSubjectGradeForTerm(student, subName, "sem2");
                                    return (
                                      <tr key={subName} className="border-b border-amber-200">
                                        <td className="border border-amber-300 p-0.2 text-left font-bold text-slate-900 bg-amber-50/20 truncate max-w-[90px]">{subName}</td>
                                        <td className="border border-amber-300 p-0.2 font-black text-blue-700">{sem2Grade}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>

                              {/* Remarks */}
                              <div className="space-y-0.5 border border-amber-300 rounded-lg p-1 bg-amber-50/20 text-[8px]">
                                <h5 className="font-black text-amber-900 text-center border-b border-amber-200 pb-0.2">वर्णनात्मक नोंदी</h5>
                                <div>
                                  <span className="font-extrabold text-amber-900 block">विशेष प्रगती:</span>
                                  <p className="text-slate-800 leading-tight font-medium bg-white p-0.5 rounded border border-amber-200 min-h-[22px]">
                                    {getFormattedRemark(student, "विशेष प्रगती", "sem2")}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-extrabold text-amber-900 block">आवड / छंद:</span>
                                  <p className="text-slate-800 leading-tight font-medium bg-white p-0.5 rounded border border-amber-200 min-h-[22px]">
                                    {getFormattedRemark(student, "आवड / छंद", "sem2")}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-extrabold text-amber-900 block">सुधारणा आवश्यक:</span>
                                  <p className="text-slate-800 leading-tight font-medium bg-white p-0.5 rounded border border-amber-200 min-h-[22px]">
                                    {getFormattedRemark(student, "सुधारणा आवश्यक", "sem2")}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Signatures Footer Line across full landscape width */}
                  <div className="flex items-center justify-between pt-1 border-t-2 border-amber-400 mt-1 text-[9.5px] font-bold text-slate-900">
                    <div className="text-center">
                      <p className="font-extrabold">{schoolData.teacherName || "वर्गशिक्षक"}</p>
                      <p className="text-[8px] text-slate-500 font-medium">वर्गशिक्षक</p>
                    </div>
                    <div className="text-center text-[8.5px] text-slate-500 font-semibold">
                      ✦ महाराष्ट्र शासन शालेय शिक्षण व क्रीडा विभाग - प्रगती पत्रक ✦
                    </div>
                    <div className="text-center">
                      <p className="font-extrabold">{schoolData.headmasterName || "मुख्याध्यापक"}</p>
                      <p className="text-[8px] text-slate-500 font-medium">मुख्याध्यापक</p>
                    </div>
                    <div className="text-center">
                      <p className="font-extrabold">पालक स्वाक्षरी</p>
                      <p className="text-[8px] text-slate-500 font-medium">पालक सही</p>
                    </div>
                  </div>
                </div>
              );
            }

            // ==================== ROTATED 90 DEGREES LANDSCAPE ON PORTRAIT A4 LAYOUT ====================
            if (layoutMode === "rotated90" || layoutMode === "1page" || layoutMode === "portrait") {
              return (
                <div
                  key={student.id}
                  className="pdf-page bg-white p-3.5 border-2 border-amber-400 rounded-3xl w-[280mm] max-w-[280mm] h-[192mm] max-h-[192mm] mx-auto overflow-hidden mb-6 flex flex-col justify-between shadow-sm"
                  style={{ pageBreakAfter: "always", breakAfter: "page" }}
                >
                  <div>
                    {/* Top Header Banner across full width */}
                    <div className="border-b-2 border-amber-400 pb-1.5 mb-1.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-orange-600 text-white rounded-lg flex items-center justify-center font-black text-xs shadow-sm">
                            SS
                          </div>
                          <div>
                            <h3 className="text-[11px] font-black text-orange-700 tracking-wider uppercase">समग्र शिक्षा</h3>
                            <p className="text-[7.5px] text-slate-500 font-bold">Samagra Shiksha</p>
                          </div>
                        </div>

                        <div className="text-center bg-amber-50 px-5 py-0.5 rounded-xl border border-amber-300">
                          <h2 className="text-xs sm:text-sm font-black text-amber-900 tracking-tight">
                            विद्यार्थी प्रगतीपत्रक सन {academicYear}
                          </h2>
                        </div>

                        <div className="text-right text-[9px] font-bold text-slate-700">
                          <p>यु-डायस क्र.: <b>{schoolData.udise || "-"}</b></p>
                          <p>इयत्ता: <b>{selectedClass} ({division})</b></p>
                        </div>
                      </div>

                      {/* Student Info Top Bar */}
                      <div className="flex items-center justify-between bg-amber-50/80 px-2.5 py-0.5 rounded-lg border border-amber-200 text-[9.5px] font-bold text-slate-800">
                        <span>विद्यार्थी नाव: <b className="text-blue-900 font-black text-[10.5px]">{student.name}</b></span>
                        <span>हजेरी क्र.: <b className="text-orange-700 font-extrabold">{student.rollNo || idx + 1}</b></span>
                        <span>जन. रजि. क्र.: <b>{student.generalRegNo || "-"}</b></span>
                        <span>आयडी: <b>{student.studentId || student.id || "-"}</b></span>
                      </div>
                    </div>

                    {/* 2 Main Columns Side-by-Side (Left: Info & Attendance, Right: Grades & Remarks) */}
                    <div className="grid grid-cols-12 gap-2.5">
                      {/* LEFT COLUMN: Section 1 */}
                      <div className="col-span-6 space-y-1.5 border-r border-dashed border-amber-300 pr-2.5">
                        <div className="bg-amber-100 border border-amber-400 rounded-full py-0.5 px-4 text-center text-[10px] font-black text-amber-900 shadow-2xs">
                          १. विद्यार्थी माहिती व हजेरी तक्ता
                        </div>

                        {/* Student Profile Info Table */}
                        <div className="border border-amber-400 rounded-xl p-1 bg-white shadow-2xs overflow-hidden">
                          <table className="w-full text-[8.5px] border-collapse">
                            <tbody>
                              <tr className="border-b border-amber-200 bg-amber-50/50">
                                <td colSpan={4} className="py-0.5 px-1.5 font-bold text-slate-900">
                                  शाळा: <span className="font-extrabold text-amber-950">{schoolData.schoolName || "-"}</span>
                                </td>
                              </tr>
                              <tr className="border-b border-amber-200 bg-blue-50/30">
                                <td colSpan={4} className="py-0.5 px-1.5 font-bold text-slate-900">
                                  विद्यार्थ्याचे नाव: <span className="font-black text-blue-900 text-[9.5px]">{student.name || student.fullName || "-"}</span>
                                </td>
                              </tr>
                              <tr className="border-b border-amber-100">
                                <td className="w-[18%] py-0.5 px-1 font-bold text-slate-700">जन्म दि.:</td>
                                <td className="w-[32%] py-0.5 px-1 font-extrabold text-slate-900">{student.dob || "-"}</td>
                                <td className="w-[18%] py-0.5 px-1 font-bold text-slate-700">जन. रजि. क्र.:</td>
                                <td className="w-[32%] py-0.5 px-1 font-extrabold text-slate-900">{student.generalRegNo || "-"}</td>
                              </tr>
                              <tr className="border-b border-amber-100">
                                <td className="w-[18%] py-0.5 px-1 font-bold text-slate-700">आयडी:</td>
                                <td className="w-[32%] py-0.5 px-1 font-extrabold text-slate-900">{student.studentId || student.id || "-"}</td>
                                <td className="w-[18%] py-0.5 px-1 font-bold text-slate-700">संवर्ग:</td>
                                <td className="w-[32%] py-0.5 px-1 font-extrabold text-slate-900">{student.caste || "-"}</td>
                              </tr>
                              <tr className="border-b border-amber-100">
                                <td className="w-[18%] py-0.5 px-1 font-bold text-slate-700">आईचे नाव:</td>
                                <td className="w-[32%] py-0.5 px-1 font-extrabold text-slate-900">{student.motherName || "-"}</td>
                                <td className="w-[18%] py-0.5 px-1 font-bold text-slate-700">वडिलांचे नाव:</td>
                                <td className="w-[32%] py-0.5 px-1 font-extrabold text-slate-900">{student.fatherName || "-"}</td>
                              </tr>
                              <tr className="border-b border-amber-100">
                                <td className="w-[18%] py-0.5 px-1 font-bold text-slate-700">मातृभाषा:</td>
                                <td className="w-[32%] py-0.5 px-1 font-extrabold text-slate-900">{student.motherTongue || "मराठी"}</td>
                                <td className="w-[18%] py-0.5 px-1 font-bold text-slate-700">माध्यम:</td>
                                <td className="w-[32%] py-0.5 px-1 font-extrabold text-slate-900">मराठी</td>
                              </tr>
                              <tr>
                                <td className="w-[18%] py-0.5 px-1 font-bold text-slate-700">पत्ता:</td>
                                <td className="w-[32%] py-0.5 px-1 font-extrabold text-slate-900 truncate max-w-[100px]">{student.address || schoolData.address || "-"}</td>
                                <td className="w-[18%] py-0.5 px-1 font-bold text-slate-700">संपर्क:</td>
                                <td className="w-[32%] py-0.5 px-1 font-extrabold text-slate-900">{student.mobile || "-"}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Attendance & Grade Reference Side-by-Side */}
                        <div className="grid grid-cols-12 gap-1">
                          {/* Attendance Table */}
                          <div className="col-span-7 border border-amber-400 rounded-xl p-1 bg-white">
                            <h4 className="text-[9px] font-black text-amber-900 text-center mb-0.5 pb-0.5 border-b border-amber-200">उपस्थिती तक्ता</h4>
                            <table className="w-full border-collapse border border-amber-300 text-[7.5px] text-center">
                              <thead>
                                <tr className="bg-amber-100 font-extrabold text-amber-950">
                                  <th className="border border-amber-300 p-0.2">महिना</th>
                                  <th className="border border-amber-300 p-0.2">कामाचे</th>
                                  <th className="border border-amber-300 p-0.2">हजर</th>
                                </tr>
                              </thead>
                              <tbody>
                                {monthsList.map((m) => {
                                  const workingDays = getWorkingDaysForMonth(student, m);
                                  const pres = getStudentPresentDays(student, m);
                                  return (
                                    <tr key={m.key} className="border-b border-amber-200">
                                      <td className="border border-amber-300 p-0.2 font-bold text-slate-800 bg-amber-50/40">{m.label}</td>
                                      <td className="border border-amber-300 p-0.2">{workingDays}</td>
                                      <td className="border border-amber-300 p-0.2 font-bold text-blue-800">{pres}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Grade Reference Table */}
                          <div className="col-span-5 border border-amber-400 rounded-xl p-1 bg-white flex flex-col justify-between">
                            <div>
                              <h4 className="text-[9px] font-black text-amber-900 text-center mb-0.5 pb-0.5 border-b border-amber-200">श्रेणी तक्ता</h4>
                              <table className="w-full border-collapse border border-amber-300 text-[7.5px] text-center">
                                <thead>
                                  <tr className="bg-amber-100 font-extrabold text-amber-950">
                                    <th className="border border-amber-300 p-0.2">गुण range</th>
                                    <th className="border border-amber-300 p-0.2">श्रेणी</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="border-b border-amber-200"><td className="border border-amber-300 p-0.2">91%-100%</td><td className="border border-amber-300 p-0.2 font-bold text-blue-700">अ-1</td></tr>
                                  <tr className="border-b border-amber-200"><td className="border border-amber-300 p-0.2">81%-90%</td><td className="border border-amber-300 p-0.2 font-bold text-blue-700">अ-2</td></tr>
                                  <tr className="border-b border-amber-200"><td className="border border-amber-300 p-0.2">71%-80%</td><td className="border border-amber-300 p-0.2 font-bold text-blue-700">ब-1</td></tr>
                                  <tr className="border-b border-amber-200"><td className="border border-amber-300 p-0.2">61%-70%</td><td className="border border-amber-300 p-0.2 font-bold text-blue-700">ब-2</td></tr>
                                  <tr className="border-b border-amber-200"><td className="border border-amber-300 p-0.2">51%-60%</td><td className="border border-amber-300 p-0.2 font-bold text-blue-700">क-1</td></tr>
                                  <tr className="border-b border-amber-200"><td className="border border-amber-300 p-0.2">41%-50%</td><td className="border border-amber-300 p-0.2 font-bold text-blue-700">क-2</td></tr>
                                  <tr className="border-b border-amber-200"><td className="border border-amber-300 p-0.2">33%-40%</td><td className="border border-amber-300 p-0.2 font-bold text-blue-700">ड</td></tr>
                                  <tr className="border-b border-amber-200"><td className="border border-amber-300 p-0.2">21%-32%</td><td className="border border-amber-300 p-0.2 font-bold text-blue-700">इ-1</td></tr>
                                  <tr><td className="border border-amber-300 p-0.2">≤20%</td><td className="border border-amber-300 p-0.2 font-bold text-blue-700">इ-2</td></tr>
                                </tbody>
                              </table>
                            </div>

                            {/* Health info with clean margin and background badge */}
                            <div className="pt-1 pb-1 px-1.5 border-t border-amber-200 text-[8px] font-bold text-slate-800 space-y-0.5 mt-auto bg-amber-50/50 rounded-b-lg border-x border-b border-amber-200/80">
                              <p>वजन: <b className="text-blue-900">{student.weight || "-"} kg</b> | उंची: <b className="text-blue-900">{student.height || "-"} cm</b></p>
                              <p>पुढील इयत्ता: <b className="text-emerald-800 font-black">दुसरी</b></p>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* RIGHT COLUMN: Section 2 */}
                      <div className="col-span-6 space-y-1.5 pl-0.5">
                        <div className="bg-amber-100 border border-amber-400 rounded-full py-0.5 px-4 text-center text-[10px] font-black text-amber-900 shadow-2xs">
                          २. विषयनिहाय मूल्यमापन व वर्णनात्मक नोंदी
                        </div>

                        {/* FIRST SEMESTER (प्रथम सत्र) */}
                        <div className="border-2 border-amber-400 rounded-2xl p-2 bg-white mb-2 shadow-2xs flex flex-col justify-between">
                          <h4 className="text-[10px] font-black text-amber-900 text-center mb-1.5 pb-1 border-b border-amber-200 bg-amber-50 rounded-t-xl py-0.5">
                            प्रथम सत्र
                          </h4>
                          <div className="grid grid-cols-12 gap-2 items-stretch">
                            {/* Left: Subject & Grade Table */}
                            <div className="col-span-5">
                              <table className="w-full border-collapse border border-amber-300 text-[8.5px] text-center font-medium">
                                <thead>
                                  <tr className="bg-amber-100 font-extrabold text-amber-950">
                                    <th className="border border-amber-300 p-1 text-left w-[68%]">विषय</th>
                                    <th className="border border-amber-300 p-1 w-[32%]">श्रेणी</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {subjects.map((subName) => (
                                    <tr key={subName} className="border-b border-amber-200">
                                      <td className="border border-amber-300 p-1 text-left font-bold text-slate-900 bg-amber-50/20">{subName}</td>
                                      <td className="border border-amber-300 p-1 font-black text-blue-800 text-[9px]">{getSubjectGradeForTerm(student, subName, "sem1")}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Right: Descriptive Remarks */}
                            <div className="col-span-7 border border-amber-300 rounded-xl p-1.5 bg-amber-50/30 text-[8.5px] flex flex-col justify-between shadow-2xs">
                              <h5 className="font-extrabold text-amber-950 text-center border border-amber-300 pb-0.5 bg-amber-100 rounded-lg mb-1 py-0.5 text-[8.5px]">
                                वर्णनात्मक नोंदी (प्रथम सत्र)
                              </h5>
                              <div className="space-y-1">
                                <div>
                                  <span className="font-extrabold text-amber-950 block text-[8.5px]">विशेष प्रगती:</span>
                                  <p className="text-slate-900 leading-snug font-bold bg-white p-1.5 rounded-lg border border-amber-200 min-h-[24px] flex items-center break-words text-[8px]">
                                    {getFormattedRemark(student, "विशेष प्रगती", "sem1")}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-extrabold text-amber-950 block text-[8.5px]">आवड / छंद:</span>
                                  <p className="text-slate-900 leading-snug font-bold bg-white p-1.5 rounded-lg border border-amber-200 min-h-[24px] flex items-center break-words text-[8px]">
                                    {getFormattedRemark(student, "आवड / छंद", "sem1")}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-extrabold text-amber-950 block text-[8.5px]">सुधारणा आवश्यक:</span>
                                  <p className="text-slate-900 leading-snug font-bold bg-white p-1.5 rounded-lg border border-amber-200 min-h-[24px] flex items-center break-words text-[8px]">
                                    {getFormattedRemark(student, "सुधारणा आवश्यक", "sem1")}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* SECOND SEMESTER (द्वितीय सत्र) */}
                        <div className="border-2 border-amber-400 rounded-2xl p-2 bg-white shadow-2xs flex flex-col justify-between">
                          <h4 className="text-[10px] font-black text-amber-900 text-center mb-1.5 pb-1 border-b border-amber-200 bg-amber-50 rounded-t-xl py-0.5">
                            द्वितीय सत्र
                          </h4>
                          <div className="grid grid-cols-12 gap-2 items-stretch">
                            {/* Left: Subject & Grade Table */}
                            <div className="col-span-5">
                              <table className="w-full border-collapse border border-amber-300 text-[8.5px] text-center font-medium">
                                <thead>
                                  <tr className="bg-amber-100 font-extrabold text-amber-950">
                                    <th className="border border-amber-300 p-1 text-left w-[68%]">विषय</th>
                                    <th className="border border-amber-300 p-1 w-[32%]">श्रेणी</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {subjects.map((subName) => (
                                    <tr key={subName} className="border-b border-amber-200">
                                      <td className="border border-amber-300 p-1 text-left font-bold text-slate-900 bg-amber-50/20">{subName}</td>
                                      <td className="border border-amber-300 p-1 font-black text-blue-800 text-[9px]">{getSubjectGradeForTerm(student, subName, "sem2")}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Right: Descriptive Remarks */}
                            <div className="col-span-7 border border-amber-300 rounded-xl p-1.5 bg-amber-50/30 text-[8.5px] flex flex-col justify-between shadow-2xs">
                              <h5 className="font-extrabold text-amber-950 text-center border border-amber-300 pb-0.5 bg-amber-100 rounded-lg mb-1 py-0.5 text-[8.5px]">
                                वर्णनात्मक नोंदी (द्वितीय सत्र)
                              </h5>
                              <div className="space-y-1">
                                <div>
                                  <span className="font-extrabold text-amber-950 block text-[8.5px]">विशेष प्रगती:</span>
                                  <p className="text-slate-900 leading-snug font-bold bg-white p-1.5 rounded-lg border border-amber-200 min-h-[24px] flex items-center break-words text-[8px]">
                                    {getFormattedRemark(student, "विशेष प्रगती", "sem2")}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-extrabold text-amber-950 block text-[8.5px]">आवड / छंद:</span>
                                  <p className="text-slate-900 leading-snug font-bold bg-white p-1.5 rounded-lg border border-amber-200 min-h-[24px] flex items-center break-words text-[8px]">
                                    {getFormattedRemark(student, "आवड / छंद", "sem2")}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-extrabold text-amber-950 block text-[8.5px]">सुधारणा आवश्यक:</span>
                                  <p className="text-slate-900 leading-snug font-bold bg-white p-1.5 rounded-lg border border-amber-200 min-h-[24px] flex items-center break-words text-[8px]">
                                    {getFormattedRemark(student, "सुधारणा आवश्यक", "sem2")}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>

                  {/* Signatures Footer */}
                  <div className="flex items-center justify-between pt-1 border-t-2 border-amber-400 mt-0.5 text-[9px] font-bold text-slate-900">
                    <div className="text-center">
                      <p className="font-extrabold text-slate-900">{schoolData.teacherName || "वर्गशिक्षक"}</p>
                      <p className="text-[7.5px] text-slate-500 font-medium">वर्गशिक्षक सही</p>
                    </div>
                    <div className="text-center text-[8px] text-slate-500 font-semibold">
                      ✦ महाराष्ट्र शासन शालेय शिक्षण व क्रीडा विभाग - प्रगती पत्रक ✦
                    </div>
                    <div className="text-center">
                      <p className="font-extrabold text-slate-900">{schoolData.headmasterName || "मुख्याध्यापक"}</p>
                      <p className="text-[7.5px] text-slate-500 font-medium">मुख्याध्यापक सही</p>
                    </div>
                    <div className="text-center">
                      <p className="font-extrabold text-slate-900">पालक स्वाक्षरी</p>
                      <p className="text-[7.5px] text-slate-500 font-medium">पालक सही</p>
                    </div>
                  </div>
                </div>
              );
            }




            // ==================== PORTRAIT LAYOUT (२ पाने - 2 PAGES STACKED) ====================
            return (
              <React.Fragment key={student.id}>
                {/* ==================== PAGE 1: FRONT PAGE (PROFILE, ATTENDANCE & GRADE SCALE) ==================== */}
                <div
                  className="pdf-page bg-white p-6 border-2 border-amber-400 rounded-3xl h-[285mm] max-h-[285mm] overflow-hidden shadow-sm flex flex-col justify-between mb-6"
                  style={{ pageBreakAfter: "always", breakAfter: "page" }}
                >
                  <div>
                    {/* Top Header Banner */}
                    <div className="flex items-center justify-between border-b-2 border-amber-400 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-orange-600 text-white rounded-xl flex items-center justify-center font-black text-sm shadow-sm">
                          SS
                        </div>
                        <div>
                          <h3 className="text-xs font-black text-orange-700 tracking-wider uppercase">समग्र शिक्षा</h3>
                          <p className="text-[10px] text-slate-500 font-bold">Samagra Shiksha</p>
                        </div>
                      </div>

                      <div className="text-center bg-amber-50 px-6 py-2 rounded-2xl border border-amber-300">
                        <h2 className="text-lg font-black text-amber-900 tracking-tight">विद्यार्थी प्रगतीपत्रक सन {academicYear}</h2>
                      </div>

                      <div className="text-right text-[11px] font-bold text-slate-700">
                        <p>हजेरी क्र.: <b className="text-orange-700">{student.rollNo || idx + 1}</b></p>
                        <p>यु-डायस: <b>{schoolData.udise || "-"}</b></p>
                      </div>
                    </div>

                    {/* Student Profile Information Box */}
                    <div className="border border-amber-400 rounded-2xl p-3.5 bg-amber-50/30 text-xs space-y-2 mb-4">
                      <div className="grid grid-cols-12 gap-2 pb-1.5 border-b border-amber-200">
                        <div className="col-span-12 font-bold text-slate-900">
                          शाळेचे नाव: <span className="font-extrabold text-amber-900">{schoolData.schoolName || "-"}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-12 gap-2 pb-1.5 border-b border-amber-200">
                        <div className="col-span-12 font-bold text-slate-900">
                          विद्यार्थ्याचे नाव: <span className="font-black text-blue-800 text-sm">{student.name}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-12 gap-2 pb-1.5 border-b border-amber-200">
                        <div className="col-span-6 font-bold text-slate-800">
                          जन्म दिनांक: <b>{student.dob || "-"}</b>
                        </div>
                        <div className="col-span-6 font-bold text-slate-800">
                          आधार क्रमांक: <b>{student.aadhar || "-"}</b>
                        </div>
                      </div>

                      <div className="grid grid-cols-12 gap-2 pb-1.5 border-b border-amber-200">
                        <div className="col-span-3 font-bold text-slate-800">
                          इयत्ता: <b>{selectedClass}</b>
                        </div>
                        <div className="col-span-3 font-bold text-slate-800">
                          तुकडी: <b>{division}</b>
                        </div>
                        <div className="col-span-3 font-bold text-slate-800">
                          जन. रजि. नं.: <b>{student.generalRegNo || "-"}</b>
                        </div>
                        <div className="col-span-3 font-bold text-slate-800">
                          स्टुडन्ट आयडी: <b>{student.studentId || student.id || "-"}</b>
                        </div>
                      </div>

                      <div className="grid grid-cols-12 gap-2 pb-1.5 border-b border-amber-200">
                        <div className="col-span-6 font-bold text-slate-800">
                          वडिलांचे नाव: <b>{student.fatherName || "-"}</b>
                        </div>
                        <div className="col-span-6 font-bold text-slate-800">
                          व्यवसाय: <b>{student.fatherOccupation || "-"}</b>
                        </div>
                      </div>

                      <div className="grid grid-cols-12 gap-2 pb-1.5 border-b border-amber-200">
                        <div className="col-span-6 font-bold text-slate-800">
                          आईचे नाव: <b>{student.motherName || "-"}</b>
                        </div>
                        <div className="col-span-6 font-bold text-slate-800">
                          व्यवसाय: <b>{student.motherOccupation || "-"}</b>
                        </div>
                      </div>

                      <div className="grid grid-cols-12 gap-2 pb-1.5 border-b border-amber-200">
                        <div className="col-span-6 font-bold text-slate-800">
                          मातृभाषा: <b>{student.motherTongue || "-"}</b>
                        </div>
                        <div className="col-span-6 font-bold text-slate-800">
                          माध्यम: <b>मराठी</b>
                        </div>
                      </div>

                      <div className="grid grid-cols-12 gap-2 pb-1.5 border-b border-amber-200">
                        <div className="col-span-6 font-bold text-slate-800">
                          धर्म: <b>{student.religion || "-"}</b>
                        </div>
                        <div className="col-span-6 font-bold text-slate-800">
                          संवर्ग: <b>{student.caste || "-"}</b>
                        </div>
                      </div>

                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-8 font-bold text-slate-800">
                          पत्ता: <b>{student.address || schoolData.address || "-"}</b>
                        </div>
                        <div className="col-span-4 font-bold text-slate-800">
                          संपर्क: <b>{student.mobile || "-"}</b>
                        </div>
                      </div>
                    </div>

                    {/* Attendance & Grade Classification Tables Side-by-Side */}
                    <div className="grid grid-cols-12 gap-4 mb-4">
                      {/* Attendance Table (উপस्थिति तक्ता) */}
                      <div className="col-span-7 border border-amber-400 rounded-2xl p-2.5 bg-white">
                        <h4 className="text-xs font-black text-amber-900 text-center mb-2 pb-1 border-b border-amber-200">उपस्थिती</h4>
                        <table className="w-full border-collapse border border-amber-300 text-[11px] text-center">
                          <thead>
                            <tr className="bg-amber-100 font-extrabold text-amber-950">
                              <th className="border border-amber-300 p-1">महिना</th>
                              <th className="border border-amber-300 p-1">कामाचे दिवस</th>
                              <th className="border border-amber-300 p-1">हजर दिवस</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monthsList.map((m) => {
                              const workingDays = getWorkingDaysForMonth(student, m);
                              const pres = getStudentPresentDays(student, m);
                              return (
                                <tr key={m.key} className="border-b border-amber-200">
                                  <td className="border border-amber-300 p-0.5 font-bold text-slate-800 bg-amber-50/50">{m.label}</td>
                                  <td className="border border-amber-300 p-0.5">{workingDays}</td>
                                  <td className="border border-amber-300 p-0.5 font-bold text-blue-800">{pres}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Grade Classification Reference Table (श्रेणी तक्ता) */}
                      <div className="col-span-5 border border-amber-400 rounded-2xl p-2.5 bg-white flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-black text-amber-900 text-center mb-2 pb-1 border-b border-amber-200">श्रेणी तक्ता</h4>
                          <table className="w-full border-collapse border border-amber-300 text-[11px] text-center">
                            <thead>
                              <tr className="bg-amber-100 font-extrabold text-amber-950">
                                <th className="border border-amber-300 p-1">गुणांचे वर्गीकरण</th>
                                <th className="border border-amber-300 p-1">श्रेणी</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-amber-200">
                                <td className="border border-amber-300 p-1">91% ते 100%</td>
                                <td className="border border-amber-300 p-1 font-bold text-blue-700">अ-1</td>
                              </tr>
                              <tr className="border-b border-amber-200">
                                <td className="border border-amber-300 p-1">81% ते 90%</td>
                                <td className="border border-amber-300 p-1 font-bold text-blue-700">अ-2</td>
                              </tr>
                              <tr className="border-b border-amber-200">
                                <td className="border border-amber-300 p-1">71% ते 80%</td>
                                <td className="border border-amber-300 p-1 font-bold text-blue-700">ब-1</td>
                              </tr>
                              <tr className="border-b border-amber-200">
                                <td className="border border-amber-300 p-1">61% ते 70%</td>
                                <td className="border border-amber-300 p-1 font-bold text-blue-700">ब-2</td>
                              </tr>
                              <tr className="border-b border-amber-200">
                                <td className="border border-amber-300 p-1">51% ते 60%</td>
                                <td className="border border-amber-300 p-1 font-bold text-blue-700">क-1</td>
                              </tr>
                              <tr className="border-b border-amber-200">
                                <td className="border border-amber-300 p-1">41% ते 50%</td>
                                <td className="border border-amber-300 p-1 font-bold text-blue-700">क-2</td>
                              </tr>
                              <tr className="border-b border-amber-200">
                                <td className="border border-amber-300 p-1">33% ते 40%</td>
                                <td className="border border-amber-300 p-1 font-bold text-blue-700">ड</td>
                              </tr>
                              <tr className="border-b border-amber-200">
                                <td className="border border-amber-300 p-1">21% ते 32%</td>
                                <td className="border border-amber-300 p-1 font-bold text-blue-700">इ-1</td>
                              </tr>
                              <tr>
                                <td className="border border-amber-300 p-1">20% व त्यापेक्षा कमी</td>
                                <td className="border border-amber-300 p-1 font-bold text-blue-700">इ-2</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="pt-3 border-t border-amber-200 text-[11px] font-bold text-slate-800 space-y-1">
                          <p>शाळा भरण्याचा दिनांक: <b>15 Jun 2026</b></p>
                          <p>पुढील वर्षाची इयत्ता: <b>दुसरी</b></p>
                        </div>
                      </div>
                    </div>

                    {/* Health Information Box */}
                    <div className="border border-amber-400 rounded-xl p-2 bg-amber-50/40 text-xs flex items-center justify-between font-bold text-slate-900">
                      <span>वजन: <b className="text-blue-800">{student.weight || "-"}</b> किलो</span>
                      <span className="text-amber-900 font-extrabold">आरोग्य विषयक माहिती</span>
                      <span>उंची: <b className="text-blue-800">{student.height || "-"}</b> सेमी</span>
                    </div>
                  </div>

                  {/* Signatures Footer Line */}
                  <div className="flex items-center justify-between pt-6 border-t-2 border-amber-400 mt-4 text-xs font-bold text-slate-900">
                    <div className="text-center">
                      <p className="font-extrabold text-sm">{schoolData.teacherName || "वर्गशिक्षक"}</p>
                      <p className="text-[11px] text-slate-600 font-medium">वर्गशिक्षक</p>
                    </div>
                    <div className="text-center">
                      <p className="font-extrabold text-sm">{schoolData.headmasterName || "मुख्याध्यापक"}</p>
                      <p className="text-[11px] text-slate-600 font-medium">मुख्याध्यापक</p>
                    </div>
                    <div className="text-center">
                      <p className="font-extrabold text-sm">पालक स्वाक्षरी</p>
                      <p className="text-[11px] text-slate-600 font-medium">पालक सही</p>
                    </div>
                  </div>
                </div>

                {/* ==================== PAGE 2: BACK PAGE (MARKS, GRADES & DESCRIPTIVE REMARKS) ==================== */}
                <div
                  className="pdf-page bg-white p-6 border-2 border-amber-400 rounded-3xl h-[285mm] max-h-[285mm] overflow-hidden shadow-sm flex flex-col justify-between mb-6"
                  style={{ pageBreakAfter: "always", breakAfter: "page" }}
                >
                  <div>
                    {/* Top Student Banner */}
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 border-b-2 border-amber-400 pb-3 mb-4 bg-amber-50/80 p-3 rounded-2xl border border-amber-300">
                      <span>विद्यार्थ्याचे नाव: <b className="text-blue-800 text-sm">{student.name}</b></span>
                      <span>इयत्ता: <b>{selectedClass}</b></span>
                      <span>तुकडी: <b>{division}</b></span>
                      <span>हजेरी क्र.: <b>{student.rollNo || idx + 1}</b></span>
                    </div>

                    {/* Side-by-Side First Semester vs Second Semester Containers */}
                    <div className="grid grid-cols-12 gap-4">
                      {/* FIRST SEMESTER (प्रथम सत्र) */}
                      <div className="col-span-6 border-2 border-amber-400 rounded-2xl p-2 bg-white flex flex-col justify-between">
                        <div>
                          <h3 className="text-xs font-black text-amber-900 text-center mb-2 pb-1 border-b-2 border-amber-300">प्रथम सत्र</h3>

                          {/* Integrated 3-Column Table */}
                          <table className="w-full border-collapse border border-amber-400 text-xs text-center font-medium">
                            <thead>
                              <tr className="bg-amber-100 font-extrabold text-amber-950">
                                <th className="border border-amber-400 p-1 text-left w-[30%]">विषय</th>
                                <th className="border border-amber-400 p-1 w-[15%]">श्रेणी</th>
                                <th className="border border-amber-400 p-1 w-[55%]">वर्णनात्मक नोंदी</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="border border-amber-300 p-1.5 text-left font-bold text-slate-900 bg-amber-50/20">{subjects[0]}</td>
                                <td className="border border-amber-300 p-1.5 font-black text-blue-700">{getSubjectGradeForTerm(student, subjects[0], "sem1")}</td>
                                <td rowSpan={subjects.length} className="border border-amber-300 p-2 text-left align-top bg-amber-50/10">
                                  <div className="flex flex-col justify-between h-full space-y-3 text-xs">
                                    <div>
                                      <span className="font-extrabold text-amber-950 block text-center mb-1">विशेष प्रगती</span>
                                      <p className="text-slate-800 leading-relaxed font-medium text-center px-1">
                                        {getFormattedRemark(student, "विशेष प्रगती", "sem1")}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="font-extrabold text-amber-950 block text-center mb-1">आवड / छंद</span>
                                      <p className="text-slate-800 leading-relaxed font-medium text-center px-1">
                                        {getFormattedRemark(student, "आवड / छंद", "sem1")}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="font-extrabold text-amber-950 block text-center mb-1">सुधारणा आवश्यक</span>
                                      <p className="text-slate-800 leading-relaxed font-medium text-center px-1">
                                        {getFormattedRemark(student, "सुधारणा आवश्यक", "sem1")}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                              {subjects.slice(1).map((subName) => (
                                <tr key={subName}>
                                  <td className="border border-amber-300 p-1.5 text-left font-bold text-slate-900 bg-amber-50/20">{subName}</td>
                                  <td className="border border-amber-300 p-1.5 font-black text-blue-700">{getSubjectGradeForTerm(student, subName, "sem1")}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Signatures */}
                        <div className="flex items-center justify-between pt-3 border-t border-amber-300 mt-2 text-[11px] font-bold text-slate-900">
                          <div className="text-center">
                            <p className="font-extrabold">{schoolData.teacherName || "वर्गशिक्षक"}</p>
                            <p className="text-[10px] text-slate-500 font-medium">वर्गशिक्षक</p>
                          </div>
                          <div className="text-center">
                            <p className="font-extrabold">{schoolData.headmasterName || "मुख्याध्यापक"}</p>
                            <p className="text-[10px] text-slate-500 font-medium">मुख्याध्यापक</p>
                          </div>
                          <div className="text-center">
                            <p className="font-extrabold">पालक स्वाक्षरी</p>
                            <p className="text-[10px] text-slate-500 font-medium">पालक सही</p>
                          </div>
                        </div>
                      </div>

                      {/* SECOND SEMESTER (द्वितीय सत्र) */}
                      <div className="col-span-6 border-2 border-amber-400 rounded-2xl p-2 bg-white flex flex-col justify-between">
                        <div>
                          <h3 className="text-xs font-black text-amber-900 text-center mb-2 pb-1 border-b-2 border-amber-300">द्वितीय सत्र</h3>

                          {/* Integrated 3-Column Table */}
                          <table className="w-full border-collapse border border-amber-400 text-xs text-center font-medium">
                            <thead>
                              <tr className="bg-amber-100 font-extrabold text-amber-950">
                                <th className="border border-amber-400 p-1 text-left w-[30%]">विषय</th>
                                <th className="border border-amber-400 p-1 w-[15%]">श्रेणी</th>
                                <th className="border border-amber-400 p-1 w-[55%]">वर्णनात्मक नोंदी</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="border border-amber-300 p-1.5 text-left font-bold text-slate-900 bg-amber-50/20">{subjects[0]}</td>
                                <td className="border border-amber-300 p-1.5 font-black text-blue-700">{getSubjectGradeForTerm(student, subjects[0], "sem2")}</td>
                                <td rowSpan={subjects.length} className="border border-amber-300 p-2 text-left align-top bg-amber-50/10">
                                  <div className="flex flex-col justify-between h-full space-y-3 text-xs">
                                    <div>
                                      <span className="font-extrabold text-amber-950 block text-center mb-1">विशेष प्रगती</span>
                                      <p className="text-slate-800 leading-relaxed font-medium text-center px-1">
                                        {getFormattedRemark(student, "विशेष प्रगती", "sem2")}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="font-extrabold text-amber-950 block text-center mb-1">आवड / छंद</span>
                                      <p className="text-slate-800 leading-relaxed font-medium text-center px-1">
                                        {getFormattedRemark(student, "आवड / छंद", "sem2")}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="font-extrabold text-amber-950 block text-center mb-1">सुधारणा आवश्यक</span>
                                      <p className="text-slate-800 leading-relaxed font-medium text-center px-1">
                                        {getFormattedRemark(student, "सुधारणा आवश्यक", "sem2")}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                              {subjects.slice(1).map((subName) => (
                                <tr key={subName}>
                                  <td className="border border-amber-300 p-1.5 text-left font-bold text-slate-900 bg-amber-50/20">{subName}</td>
                                  <td className="border border-amber-300 p-1.5 font-black text-blue-700">{getSubjectGradeForTerm(student, subName, "sem2")}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Signatures */}
                        <div className="flex items-center justify-between pt-3 border-t border-amber-300 mt-2 text-[11px] font-bold text-slate-900">
                          <div className="text-center">
                            <p className="font-extrabold">{schoolData.teacherName || "वर्गशिक्षक"}</p>
                            <p className="text-[10px] text-slate-500 font-medium">वर्गशिक्षक</p>
                          </div>
                          <div className="text-center">
                            <p className="font-extrabold">{schoolData.headmasterName || "मुख्याध्यापक"}</p>
                            <p className="text-[10px] text-slate-500 font-medium">मुख्याध्यापक</p>
                          </div>
                          <div className="text-center">
                            <p className="font-extrabold">पालक स्वाक्षरी</p>
                            <p className="text-[10px] text-slate-500 font-medium">पालक सही</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Disclaimer */}
                  <div className="text-center text-[10px] text-slate-500 font-bold border-t border-amber-200 pt-2">
                    ✦ महाराष्ट्र शासन शालेय शिक्षण व क्रीडा विभाग - प्रगती पत्रक ✦
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ProgressSheet;
