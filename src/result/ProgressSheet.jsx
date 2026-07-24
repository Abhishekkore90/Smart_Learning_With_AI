import React, { useState, useEffect, useRef } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { Download, Printer, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import "./result.css";

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

const ProgressSheet = ({ initialClass = "1st", initialYear = "2025-26", onBack }) => {
  const [selectedClass, setSelectedClass] = useState(initialClass || "1st");
  const [academicYear, setAcademicYear] = useState(initialYear || "2025-26");
  const [division, setDivision] = useState("1");
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
    loadUserFirestoreData();
  }, [selectedClass, academicYear]);

  const loadUserFirestoreData = async () => {
    setLoading(true);
    try {
      const docId = `${selectedClass}_${academicYear}`;

      // 1. Fetch Global & Class School Settings
      try {
        let globalSettings = null;
        try {
          const cachedGen = localStorage.getItem("cce_general_school_settings");
          if (cachedGen) globalSettings = JSON.parse(cachedGen);
        } catch (e) {}

        if (!globalSettings) {
          try {
            const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
            globalSettings = await fetchJsonFromBunny("cce_results/general_school_settings.json");
          } catch (e) {}
        }

        const settingsSnap = await getDoc(doc(db, "cce_settings", docId));
        const classSettings = settingsSnap.exists() ? settingsSnap.data() : {};
        const mergedSettings = { ...(globalSettings || {}), ...classSettings };

        setSchoolData({
          schoolName: mergedSettings.schoolName || globalSettings?.schoolName || "",
          udise: mergedSettings.udiseCode || mergedSettings.udise || globalSettings?.udiseCode || "",
          teacherName: classSettings.teacherName || "",
          headmasterName: mergedSettings.principalName || mergedSettings.headmasterName || globalSettings?.principalName || "",
          address: mergedSettings.address || globalSettings?.address || "",
          slogan: mergedSettings.slogan || "✦ ज्ञान, संस्कार आणि प्रगतीसाठी ✦",
        });

        if (mergedSettings.subjects && Array.isArray(mergedSettings.subjects) && mergedSettings.subjects.length > 0) {
          setSubjects(mergedSettings.subjects);
        }
      } catch (e) {
        console.error("Error fetching school settings:", e);
      }

      // 2. Fetch Students for Selected Class
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
              name: d.fullName || d.name || d.studentName || "",
              rollNo: String(d.rollNo || d.srNo || loadedStudents.length + 1),
              fatherName: d.fatherName || d.stdFather || "",
              motherName: d.motherName || d.stdMother || "",
              dob: d.dob || d.birthDate || "",
              aadhar: d.aadhar || d.aadharNo || "",
              generalRegNo: d.generalRegNo || d.grNo || d.srNo || "",
              motherTongue: d.motherTongue || d.motherTounge || "",
              caste: d.caste || d.category || "",
              religion: d.religion || "",
              address: d.address || "",
              mobile: d.mobile || d.contact || d.phone || "",
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
                name: d.fullName || d.name || d.studentName || "",
                rollNo: String(d.rollNo || d.srNo || loadedStudents.length + 1),
                fatherName: d.fatherName || d.stdFather || "",
                motherName: d.motherName || d.stdMother || "",
                dob: d.dob || d.birthDate || "",
                aadhar: d.aadhar || d.aadharNo || "",
                generalRegNo: d.generalRegNo || d.grNo || d.srNo || "",
                motherTongue: d.motherTongue || d.motherTounge || "",
                caste: d.caste || d.category || "",
                religion: d.religion || "",
                address: d.address || "",
                mobile: d.mobile || d.contact || d.phone || "",
              });
            }
          });
        } catch (e) {}
      }

      // Deduplicate students
      const uniqueMap = new Map();
      loadedStudents.forEach((s) => {
        if (s.name) {
          const key = s.rollNo ? `${s.rollNo}_${s.name}` : s.name;
          if (!uniqueMap.has(key)) uniqueMap.set(key, s);
        }
      });
      loadedStudents = Array.from(uniqueMap.values());

      // Merge student_details collection (for exact user-filled details)
      try {
        const detailsMap = new Map();
        const detailsSnap = await getDocs(collection(db, "student_details"));
        detailsSnap.forEach((docSnap) => {
          detailsMap.set(docSnap.id, docSnap.data());
        });

        loadedStudents = loadedStudents.map((s) => {
          const det = detailsMap.get(s.id) || {};
          return {
            ...s,
            fatherName: det.fatherName || s.fatherName || "",
            fatherOccupation: det.fatherOccupation || "",
            motherName: det.motherName || s.motherName || "",
            motherOccupation: det.motherOccupation || "",
            dob: det.dob || s.dob || "",
            aadhar: det.aadhar || s.aadhar || "",
            generalRegNo: det.registrationNo || s.generalRegNo || "",
            motherTongue: det.motherTongue || s.motherTongue || "",
            caste: det.caste || s.caste || "",
            religion: det.religion || s.religion || "",
            address: det.address || s.address || "",
            mobile: det.phone || s.mobile || "",
            studentId: det.studentId || s.id || "",
            aparId: det.aparId || "",
            height: det.height || "",
            weight: det.weight || "",
          };
        });
      } catch (e) {}

      loadedStudents.sort((a, b) => (parseInt(a.rollNo) || 0) - (parseInt(b.rollNo) || 0));
      setStudents(loadedStudents);

      // 3. Fetch Marks Data (Merging sem1, sem2, Bunny Storage CDN & Firestore)
      try {
        const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
        const bunnyMarksSec = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_marks_second.json`);
        const bunnyMarksFirst = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_marks_first.json`);

        const marksSnapSem1 = await getDoc(doc(db, "cce_marks_v2", `${selectedClass}_${academicYear}_sem1`));
        const marksSnapSem2 = await getDoc(doc(db, "cce_marks_v2", `${selectedClass}_${academicYear}_sem2`));
        const marksSnapGen = await getDoc(doc(db, "cce_marks_v2", docId));

        const fsSem1 = marksSnapSem1.exists() ? (marksSnapSem1.data().records || marksSnapSem1.data()) : {};
        const fsSem2 = marksSnapSem2.exists() ? (marksSnapSem2.data().records || marksSnapSem2.data()) : {};
        const fsGen = marksSnapGen.exists() ? (marksSnapGen.data().records || marksSnapGen.data().marksData || marksSnapGen.data()) : {};

        const bunnyFirst = bunnyMarksFirst || {};
        const bunnySec = bunnyMarksSec || {};

        const mergedMarks = {};
        const allStudentKeys = new Set([
          ...Object.keys(fsSem1 || {}),
          ...Object.keys(fsSem2 || {}),
          ...Object.keys(fsGen || {}),
          ...Object.keys(bunnyFirst || {}),
          ...Object.keys(bunnySec || {}),
        ]);

        allStudentKeys.forEach((sId) => {
          mergedMarks[sId] = {
            ...(fsGen[sId] || {}),
            sem1: {
              ...(fsGen[sId]?.sem1 || fsGen[sId]?.semester1 || {}),
              ...(bunnyFirst[sId] || {}),
              ...(fsSem1[sId] || {}),
            },
            sem2: {
              ...(fsGen[sId]?.sem2 || fsGen[sId]?.semester2 || {}),
              ...(bunnySec[sId] || {}),
              ...(fsSem2[sId] || {}),
            },
          };
          if (fsSem1[sId]) {
            Object.keys(fsSem1[sId]).forEach((subK) => {
              if (subK !== "sem1" && subK !== "sem2") {
                mergedMarks[sId].sem1[subK] = fsSem1[sId][subK];
              }
            });
          }
          if (fsSem2[sId]) {
            Object.keys(fsSem2[sId]).forEach((subK) => {
              if (subK !== "sem1" && subK !== "sem2") {
                mergedMarks[sId].sem2[subK] = fsSem2[sId][subK];
              }
            });
          }
        });

        setMarksData(mergedMarks);
      } catch (e) {
        console.error("Error fetching marks:", e);
      }

      // 4. Fetch Remarks Data (Merging sem1, sem2, Bunny Storage CDN & Firestore)
      try {
        const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
        const bunnyRemarks = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_remarks.json`);

        const remSnapSem2 = await getDoc(doc(db, "cce_remarks_v2", `${selectedClass}_${academicYear}_sem2`));
        const remSnapSem1 = await getDoc(doc(db, "cce_remarks_v2", `${selectedClass}_${academicYear}_sem1`));
        const remSnapGen = await getDoc(doc(db, "cce_remarks_v2", docId));

        const mergedRemarks = {};
        
        const mergeStudentRecords = (sourceData, isSem1 = false, isSem2 = false) => {
          if (!sourceData || typeof sourceData !== "object") return;
          const recs = sourceData.records || sourceData.remarksData || sourceData.data || sourceData;
          if (!recs || typeof recs !== "object") return;

          Object.keys(recs).forEach((sId) => {
            if (sId === "class" || sId === "academicYear" || sId === "semester" || sId === "updatedAt") return;
            if (!mergedRemarks[sId]) {
              mergedRemarks[sId] = { sem1: {}, sem2: {} };
            }
            const data = recs[sId] || {};
            if (isSem1) {
              Object.assign(mergedRemarks[sId].sem1, data);
            } else if (isSem2) {
              Object.assign(mergedRemarks[sId].sem2, data);
            } else {
              if (data.sem1) Object.assign(mergedRemarks[sId].sem1, data.sem1);
              if (data.sem2) Object.assign(mergedRemarks[sId].sem2, data.sem2);
              Object.assign(mergedRemarks[sId], data);
            }
          });
        };

        if (remSnapSem1.exists()) mergeStudentRecords(remSnapSem1.data(), true, false);
        if (remSnapSem2.exists()) mergeStudentRecords(remSnapSem2.data(), false, true);
        if (remSnapGen.exists()) mergeStudentRecords(remSnapGen.data(), false, false);
        if (bunnyRemarks) mergeStudentRecords(bunnyRemarks, false, false);

        setRemarksData(mergedRemarks);
      } catch (e) {
        console.error("Error fetching remarks:", e);
      }

      // 5. Fetch Monthly Attendance Data & Working Days from Firestore & Bunny CDN
      const monthKeys = ["june", "july", "august", "september", "october", "november", "december", "january", "february", "march", "april", "may"];
      const attendanceMap = {};

      try {
        // A. Fetch custom working days
        try {
          const wDaysSnap = await getDoc(doc(db, "cce_attendance", `${selectedClass}_${academicYear}_working_days`));
          if (wDaysSnap.exists()) {
            setWorkingDaysData(wDaysSnap.data().workingDays || {});
          }
        } catch (e) {}

        // B. Fetch general attendance docs from Firestore & Bunny CDN
        try {
          const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
          const bunnyAtt = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_attendance.json`);
          const attSnap = await getDoc(doc(db, "cce_attendance", docId));
          const attFsData = attSnap.exists() ? (attSnap.data().attendanceData || attSnap.data()) : {};

          if (attFsData && typeof attFsData === "object") {
            Object.keys(attFsData).forEach((stdId) => {
              if (!attendanceMap[stdId]) attendanceMap[stdId] = {};
              Object.assign(attendanceMap[stdId], attFsData[stdId]);
            });
          }
          if (bunnyAtt && typeof bunnyAtt === "object") {
            Object.keys(bunnyAtt).forEach((stdId) => {
              if (!attendanceMap[stdId]) attendanceMap[stdId] = {};
              Object.assign(attendanceMap[stdId], bunnyAtt[stdId]);
            });
          }
        } catch (e) {}

        // C. Fetch daily attendance documents for all 12 months
        for (const mKey of monthKeys) {
          try {
            const mSnap = await getDoc(doc(db, "cce_attendance", `${selectedClass}_${academicYear}_${mKey}`));
            if (mSnap.exists()) {
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
          } catch (e) {}
        }

        // D. Fetch explicit student-wise monthly summary attendance (HIGHEST PRIORITY)
        try {
          const monthlySnap = await getDoc(doc(db, "cce_attendance", `${selectedClass}_${academicYear}_monthly`));
          if (monthlySnap.exists()) {
            const monthlyRecords = monthlySnap.data().records || {};
            Object.keys(monthlyRecords).forEach((stdId) => {
              if (!attendanceMap[stdId]) attendanceMap[stdId] = {};
              const stdMonths = monthlyRecords[stdId] || {};
              Object.keys(stdMonths).forEach((mK) => {
                const val = stdMonths[mK];
                if (val !== undefined && val !== null) {
                  attendanceMap[stdId][mK.toLowerCase()] = Number(val);
                }
              });
            });
          }
        } catch (e) {}

        setAttendanceData(attendanceMap);
      } catch (e) {
        console.error("Error fetching attendance data:", e);
      }

    } catch (err) {
      console.error("Error loading ProgressSheet data:", err);
    }
    setLoading(false);
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    toast.info("प्रगती पत्रक PDF तयार होत आहे, कृपया वाट पाहा...");
    try {
      const { default: html2pdf } = await import("html2pdf.js");
      const element = printRef.current;
      const opt = {
        margin: [0, 0, 0, 0],
        filename: `प्रगती_पत्रक_${selectedClass}_${academicYear}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css"] },
      };
      await html2pdf().set(opt).from(element).save();
      toast.success("प्रगती पत्रक PDF यशस्वीरित्या डाऊनलोड झाली!");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("PDF निर्मितीत अडचण आली: " + err.message);
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
      ? (studentRemarksObj.sem2 || studentRemarksObj)
      : (studentRemarksObj.sem1 || studentRemarksObj);

    if (!termObj || typeof termObj !== "object") return "-";

    let val = termObj[labelOrKey];

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
        if (rKey === "sem1" || rKey === "sem2") continue;
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
    if (!student || !marksData) return "-";
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
      ? (studentMarksObj.sem1 || studentMarksObj.semester1 || studentMarksObj)
      : (studentMarksObj.sem2 || studentMarksObj.semester2 || studentMarksObj);

    const getSubData = (subName) => {
      if (termMap[subName]) return termMap[subName];
      const lower = String(subName).toLowerCase();
      if (lower.includes("मराठी")) return termMap["marathi"] || termMap["प्रथम भाषा : मराठी"] || termMap["प्रथम भाषा: मराठी"] || termMap["मराठी"] || {};
      if (lower.includes("इंग्रजी")) return termMap["english"] || termMap["द्वितीय भाषा : इंग्रजी"] || termMap["द्वितीय भाषा: इंग्रजी"] || termMap["तृतीय भाषा: इंग्रजी"] || termMap["इंग्रजी"] || {};
      if (lower.includes("गणित")) return termMap["math"] || termMap["maths"] || termMap["गणित"] || {};
      if (lower.includes("कला")) return termMap["kala"] || termMap["कला"] || {};
      if (lower.includes("कार्यानुभव")) return termMap["karyanubhav"] || termMap["कार्यानुभव"] || {};
      if (lower.includes("शारीरिक")) return termMap["sharirik"] || termMap["शारीरिक शिक्षण"] || {};
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

  const getWorkingDaysForMonth = (m) => {
    const customWD = workingDaysData[m.key.toLowerCase()];
    if (customWD !== undefined && customWD !== null && customWD !== "") {
      return Number(customWD);
    }
    return m.defaultDays;
  };

  const getStudentPresentDays = (student, m) => {
    if (!student || !attendanceData) return 0;
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
      <div className="max-w-5xl mx-auto flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 no-print">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition-all cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          मागे जा (Back)
        </button>

        <div className="text-center">
          <h1 className="text-lg font-black text-orange-800">विद्यार्थी प्रगती पत्रक (Progress Sheet)</h1>
          <p className="text-xs text-slate-500 font-medium">इयत्ता {selectedClass} | शैक्षणिक वर्ष {academicYear}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <Printer className="size-4" />
            प्रिंट करा
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            PDF डाउनलोड
          </button>
        </div>
      </div>

      {/* -------------------- PRINTABLE PROGRESS SHEET CONTAINER -------------------- */}
      <div ref={printRef} className="max-w-4xl mx-auto space-y-6">
        {students.map((student, idx) => {
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
                            const workingDays = getWorkingDaysForMonth(m);
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
                    <div className="col-span-6 border-2 border-amber-400 rounded-2xl p-3 bg-white flex flex-col justify-between h-[210mm]">
                      <div>
                        <h3 className="text-sm font-black text-amber-900 text-center mb-3 pb-1.5 border-b-2 border-amber-300">प्रथम सत्र</h3>

                        {/* Subject Grades Table */}
                        <table className="w-full border-collapse border border-amber-300 text-xs text-center font-medium mb-4">
                          <thead>
                            <tr className="bg-amber-100 font-extrabold text-amber-950">
                              <th className="border border-amber-300 p-2 text-left w-3/4">विषय</th>
                              <th className="border border-amber-300 p-2 w-1/4">श्रेणी</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subjects.map((subName) => {
                              const sem1Grade = getSubjectGradeForTerm(student, subName, "sem1");
                              return (
                                <tr key={subName} className="border-b border-amber-200">
                                  <td className="border border-amber-300 p-1.5 text-left font-bold text-slate-900 bg-amber-50/30">{subName}</td>
                                  <td className="border border-amber-300 p-1.5 font-black text-blue-700">{sem1Grade}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        {/* Descriptive Remarks Section */}
                        <div className="space-y-2 border border-amber-300 rounded-xl p-2.5 bg-amber-50/20 text-xs">
                          <h4 className="font-black text-amber-900 border-b border-amber-200 pb-1 text-center">वर्णनात्मक नोंदी</h4>
                          
                          <div>
                            <span className="font-extrabold text-amber-900 block mb-0.5">विशेष प्रगती:</span>
                            <p className="text-slate-800 leading-relaxed font-medium bg-white p-2 rounded-lg border border-amber-200 min-h-[36px]">
                              {getFormattedRemark(student, "विशेष प्रगती", "sem1")}
                            </p>
                          </div>

                          <div>
                            <span className="font-extrabold text-amber-900 block mb-0.5">आवड / छंद:</span>
                            <p className="text-slate-800 leading-relaxed font-medium bg-white p-2 rounded-lg border border-amber-200 min-h-[36px]">
                              {getFormattedRemark(student, "आवड / छंद", "sem1")}
                            </p>
                          </div>

                          <div>
                            <span className="font-extrabold text-amber-900 block mb-0.5">सुधारणा आवश्यक:</span>
                            <p className="text-slate-800 leading-relaxed font-medium bg-white p-2 rounded-lg border border-amber-200 min-h-[36px]">
                              {getFormattedRemark(student, "सुधारणा आवश्यक", "sem1")}
                            </p>
                          </div>
                        </div>
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
                    <div className="col-span-6 border-2 border-amber-400 rounded-2xl p-3 bg-white flex flex-col justify-between h-[210mm]">
                      <div>
                        <h3 className="text-sm font-black text-amber-900 text-center mb-3 pb-1.5 border-b-2 border-amber-300">द्वितीय सत्र</h3>

                        {/* Subject Grades Table */}
                        <table className="w-full border-collapse border border-amber-300 text-xs text-center font-medium mb-4">
                          <thead>
                            <tr className="bg-amber-100 font-extrabold text-amber-950">
                              <th className="border border-amber-300 p-2 text-left w-3/4">विषय</th>
                              <th className="border border-amber-300 p-2 w-1/4">श्रेणी</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subjects.map((subName) => {
                              const sem2Grade = getSubjectGradeForTerm(student, subName, "sem2");
                              return (
                                <tr key={subName} className="border-b border-amber-200">
                                  <td className="border border-amber-300 p-1.5 text-left font-bold text-slate-900 bg-amber-50/30">{subName}</td>
                                  <td className="border border-amber-300 p-1.5 font-black text-blue-700">{sem2Grade}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        {/* Descriptive Remarks Section */}
                        <div className="space-y-2 border border-amber-300 rounded-xl p-2.5 bg-amber-50/20 text-xs">
                          <h4 className="font-black text-amber-900 border-b border-amber-200 pb-1 text-center">वर्णनात्मक नोंदी</h4>
                          
                          <div>
                            <span className="font-extrabold text-amber-900 block mb-0.5">विशेष प्रगती:</span>
                            <p className="text-slate-800 leading-relaxed font-medium bg-white p-2 rounded-lg border border-amber-200 min-h-[36px]">
                              {getFormattedRemark(student, "विशेष प्रगती", "sem2")}
                            </p>
                          </div>

                          <div>
                            <span className="font-extrabold text-amber-900 block mb-0.5">आवड / छंद:</span>
                            <p className="text-slate-800 leading-relaxed font-medium bg-white p-2 rounded-lg border border-amber-200 min-h-[36px]">
                              {getFormattedRemark(student, "आवड / छंद", "sem2")}
                            </p>
                          </div>

                          <div>
                            <span className="font-extrabold text-amber-900 block mb-0.5">सुधारणा आवश्यक:</span>
                            <p className="text-slate-800 leading-relaxed font-medium bg-white p-2 rounded-lg border border-amber-200 min-h-[36px]">
                              {getFormattedRemark(student, "सुधारणा आवश्यक", "sem2")}
                            </p>
                          </div>
                        </div>
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
        })}
      </div>
    </div>
  );
};

export default ProgressSheet;
