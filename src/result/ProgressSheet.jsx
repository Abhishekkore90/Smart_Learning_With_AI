import React, { useState, useEffect } from "react";
import { 
  ChevronLeft, 
  ArrowLeft,
  Check, 
  AlertTriangle,
  Loader2
} from "lucide-react";
import AlertMessage from "../../AlertMessage";
import { fetchFirestoreMarks, matchAndMergeMarks } from "./firestoreMarksHelper";
import "../result/result.css";

const ProgressSheet = ({ initialClass, initialYear, onBack }) => {
  const [academicYear, setAcademicYear] = useState(initialYear || localStorage.getItem("cce_academic_year") || "");
  const [classValue, setClassValue] = useState(initialClass || localStorage.getItem("cce_selected_class") || "");
  const [activeSemester, setActiveSemester] = useState("first"); // "first", "second", or "extra"
  const [division, setDivision] = useState("");
  const [divisions, setDivisions] = useState(["A", "B", "C", "D"]);

  const [studentData, setStudentData] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [schoolName, setSchoolName] = useState("");
  const [schoolLogo, setSchoolLogo] = useState("");
  const [schoolData, setSchoolData] = useState(null);
  const [subjectSequence, setSubjectSequence] = useState([]);
  const [language, setLanguage] = useState(localStorage.getItem("language") || "English");

  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);

  const [summerVacationDate, setSummerVacationDate] = useState("");
  const [winterVacationDate, setWinterVacationDate] = useState("");

  const udiseNumber = localStorage.getItem("udiseNumber");

  const [cceSettings, setCceSettings] = useState(null);

  useEffect(() => {
    const fetchCceSettings = async () => {
      if (!classValue || !academicYear) return;
      try {
        const { db } = await import("@/lib/firebase");
        const { doc, getDoc } = await import("firebase/firestore");
        const docRef = doc(db, "cce_settings", `${classValue}_${academicYear}`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCceSettings(data);
          if (data.schoolName) setSchoolName(data.schoolName);
          if (data.schoolLogo) setSchoolLogo(data.schoolLogo);
        }
      } catch (error) {
        console.error("Error fetching CCE settings from Firestore:", error);
      }
    };
    fetchCceSettings();
  }, [classValue, academicYear]);

  const firstSemesterMonths = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
  const secondSemesterMonths = ["Dec", "Jan", "Feb", "Mar", "Apr", "May"];

  // IndexedDB constants
  const DB_NAME = "SchoolManagementDB";
  const STUDENT_STORE = "studentData";
  const ATTENDANCE_STORE = "attendance";
  const SCHOOL_STORE = "schoolData";
  const DB_VERSION = 1;

  useEffect(() => {
    if (alertMessage) {
      setShowAlert(true);
      const timeoutId = setTimeout(() => {
        setShowAlert(false);
        setAlertMessage("");
      }, 3000);
      return () => clearTimeout(timeoutId);
    }
  }, [alertMessage]);

  useEffect(() => {
    if (udiseNumber) {
      fetchSchoolName();
      fetchStudentData();
    }
  }, [udiseNumber]);

  // Handle automatic division selection
  useEffect(() => {
    if (classValue && studentData.length > 0) {
      const divisionsForClass = new Set();
      studentData.forEach((student) => {
        if (student.currentClass === classValue && student.division) {
          divisionsForClass.add(student.division);
        }
      });
      const divs = Array.from(divisionsForClass).sort();
      if (divs.length > 0) {
        setDivisions(divs);
        if (!division || !divs.includes(division)) {
          setDivision(divs[0]);
        }
      } else {
        setDivisions(["A", "B", "C", "D"]);
        if (!division) {
          setDivision("A");
        }
      }
    }
  }, [classValue, studentData]);

  // Filter students based on class and division
  useEffect(() => {
    if (classValue && studentData.length > 0) {
      const filtered = studentData.filter(
        (student) => student.currentClass === classValue && student.division === division
      );
      setSelectedStudents(filtered);
    }
  }, [classValue, division, studentData]);

  // Fetch subject sequence for the class
  useEffect(() => {
    if (academicYear && classValue) {
      fetchSubjectSequence();
    }
  }, [academicYear, classValue]);

  const openDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = (event) => reject(event.target.error);
      request.onsuccess = (event) => resolve(event.target.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STUDENT_STORE)) {
          db.createObjectStore(STUDENT_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(SCHOOL_STORE)) {
          db.createObjectStore(SCHOOL_STORE, { keyPath: "udiseNumber" });
        }
      };
    });
  };

  const fetchSchoolName = async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction(SCHOOL_STORE, "readonly");
      const store = transaction.objectStore(SCHOOL_STORE);
      const request = store.get(udiseNumber);

      request.onsuccess = (event) => {
        const data = event.target.result;
        if (data) {
          setSchoolData(data);
          setSchoolName(data.schoolName || "-");
          setSchoolLogo(data.schoolLogo || "");
          if (data.language) {
            setLanguage(data.language);
          }
        }
      };
    } catch (error) {
      console.error("Error fetching school name:", error);
    }
  };

  const fetchStudentData = async () => {
    try {
      let fetchedStudents = [];

      try {
        const response = await fetch(
          `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData.json`
        );
        if (response.ok) {
          const data = await response.json();
          if (data) {
            fetchedStudents = Object.keys(data)
              .filter(key => data[key] !== null)
              .map(key => ({ srNo: key, ...data[key] }));
          }
        }
      } catch (firebaseError) {
        console.warn("Firebase fetch student data failed, using IndexedDB:", firebaseError);
      }

      if (fetchedStudents.length === 0) {
        const db = await openDB();
        const transaction = db.transaction(STUDENT_STORE, "readonly");
        const store = transaction.objectStore(STUDENT_STORE);
        const request = store.getAll();

        const idbStudents = await new Promise((resolve, reject) => {
          request.onsuccess = (event) => resolve(event.target.result || []);
          request.onerror = (event) => reject(event.target.error);
        });

        fetchedStudents = idbStudents.map((student) => {
          const keyParts = student.id ? student.id.split("-") : [];
          const className = keyParts[0] || "";
          const division = keyParts[1] || "";
          const srNo = keyParts[keyParts.length - 1] || "";
          return {
            ...student,
            currentClass: student.currentClass || className,
            division: student.division || division,
            srNo: student.srNo || srNo
          };
        });
      }

      const activeStudents = fetchedStudents.filter(student => student.isActive !== false);
      const updatedStudents = activeStudents.map((student) => {
        const keyParts = student.id ? student.id.split("-") : [];
        const className = keyParts[0] || student.currentClass || "";
        const division = keyParts[1] || student.division || "";
        const srNo = keyParts[keyParts.length - 1] || student.srNo || "";
        return { 
          ...student, 
          className: student.currentClass || className, 
          division: student.division || division, 
          srNo: student.srNo || srNo 
        };
      });

      setStudentData(updatedStudents);
    } catch (error) {
      console.error("Error fetching student data:", error);
    }
  };

  const fetchSubjectSequence = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/${academicYear}/${classValue}.json`
      );
      if (response.ok) {
        const data = await response.json();
        const orderedSubjects = Object.keys(data)
          .sort((a, b) => parseInt(a) - parseInt(b))
          .map((key) => data[key])
          .filter(Boolean);
        setSubjectSequence(orderedSubjects);
      }
    } catch (error) {
      console.error("Error fetching subject sequence:", error);
    }
  };

  const fetchMarksData = async (key, academicYear, examName) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STUDENT_STORE, "readonly");
      const store = transaction.objectStore(STUDENT_STORE);
      const allKeys = await new Promise((resolve, reject) => {
        const keysRequest = store.getAllKeys();
        keysRequest.onsuccess = (event) => resolve(event.target.result);
        keysRequest.onerror = (event) => reject(event.target.error);
      });

      const matchingKey = allKeys.find(storeKey =>
        typeof storeKey === "string" &&
        (storeKey.endsWith(`-${key}`) || storeKey === key)
      );

      if (!matchingKey) return null;

      const request = store.get(matchingKey);
      return new Promise((resolve) => {
        request.onsuccess = (event) => {
          const studentData = event.target.result;
          if (!studentData || !studentData.result || !studentData.result[academicYear]) {
            resolve(null);
            return;
          }
          resolve(studentData.result[academicYear][examName] || null);
        };
        request.onerror = () => resolve(null);
      });
    } catch (error) {
      console.error("Error fetching marks:", error);
      return null;
    }
  };

  const fetchHeightWeightData = async (srNo, academicYear) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STUDENT_STORE, "readonly");
      const store = transaction.objectStore(STUDENT_STORE);
      const request = store.get(srNo);

      return new Promise((resolve) => {
        request.onsuccess = (event) => {
          const studentData = event.target.result;
          if (!studentData || !studentData.weightandHeight) {
            resolve(null);
            return;
          }
          resolve(studentData.weightandHeight[academicYear] || null);
        };
        request.onerror = () => resolve(null);
      });
    } catch (error) {
      console.error("Error in fetchHeightWeightData:", error);
      return null;
    }
  };

  const fetchAttendanceFromIndexedDB = async (srNo, academicYear) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(ATTENDANCE_STORE, "readonly");
      const store = transaction.objectStore(ATTENDANCE_STORE);

      const allKeys = await new Promise((resolve, reject) => {
        const keysRequest = store.getAllKeys();
        keysRequest.onsuccess = (event) => resolve(event.target.result);
        keysRequest.onerror = (event) => reject(event.target.error);
      });

      const matchingKey = allKeys.find(storeKey => String(storeKey).trim() === String(srNo).trim());
      if (!matchingKey) return null;

      const request = store.get(matchingKey);
      return new Promise((resolve) => {
        request.onsuccess = (event) => {
          const attendanceData = event.target.result;
          if (!attendanceData) {
            resolve(null);
            return;
          }

          const startYear = academicYear.split("-")[0];
          const endYear = academicYear.split("-")[1];
          const fetchedAttendance = { Present: {}, Absent: {}, Leave: {} };

          const allMonths = [...firstSemesterMonths, ...secondSemesterMonths];
          allMonths.forEach(month => {
            const yearForMonth = firstSemesterMonths.includes(month) ? startYear : endYear;
            const monthData = attendanceData.Presenty?.Presenty?.[yearForMonth]?.[month] || {};

            let presentCount = 0;
            let absentCount = 0;
            let leaveCount = 0;

            Object.keys(monthData).forEach(day => {
              const statusObj = monthData[day];
              let status = (statusObj && typeof statusObj === "object") ? (statusObj.present || statusObj.status) : statusObj;

              if (status === "present" || status === true) presentCount++;
              else if (status === "absent" || status === false) absentCount++;
              else if (status === null || status === undefined) leaveCount++;
            });

            fetchedAttendance.Present[month] = presentCount;
            fetchedAttendance.Absent[month] = absentCount;
            fetchedAttendance.Leave[month] = leaveCount - 1;
          });

          resolve(fetchedAttendance);
        };
        request.onerror = () => resolve(null);
      });
    } catch (error) {
      console.error("Error in fetchAttendanceFromIndexedDB:", error);
      return null;
    }
  };

  const calculateGrade = (total) => {
    if (total >= 91) return "A1";
    if (total >= 81) return "A2";
    if (total >= 71) return "B1";
    if (total >= 61) return "B2";
    if (total >= 51) return "C1";
    if (total >= 41) return "C2";
    if (total >= 33) return "D";
    if (total >= 21) return "E1";
    return "E2";
  };

  const calculateSubjectTotal = (marks) => {
    if (!marks) return 0;
    if (marks.Akarik || marks.Sanklik) {
      return (marks.Akarik?.Total || 0) + (marks.Sanklik?.Total || 0);
    }
    return marks.obtainMarks || 0;
  };

  const getMonthName = (month) => {
    const marathiMonths = {
      Jun: "जून", Jul: "जुलै", Aug: "ऑगस्ट", Sep: "सप्टेंबर", Oct: "ऑक्टोबर", Nov: "नोव्हेंबर",
      Dec: "डिसेंबर", Jan: "जानेवारी", Feb: "फेब्रुवारी", Mar: "मार्च", Apr: "एप्रिल", May: "मे"
    };
    return language === "English" ? month : marathiMonths[month];
  };

  const getAttendanceType = (type) => {
    const marathiTypes = {
      Present: "उपस्थित", Absent: "गैरहजर", Leave: "रजा"
    };
    return language === "English" ? type : marathiTypes[type];
  };

  const handlePrintCompiledRegister = async () => {
    if (selectedStudents.length === 0) {
      setAlertMessage("विद्यार्थी यादी उपलब्ध नाही.");
      return;
    }

    setIsCompiling(true);

    const examName = activeSemester === "first" 
      ? "First Semester" 
      : activeSemester === "second" 
        ? "Second Semester" 
        : "Second Semester"; // For extra templates, query second semester data
    const termLabel = activeSemester === "first" 
      ? "प्रथम सत्र" 
      : activeSemester === "second" 
        ? "द्वितीय सत्र" 
        : "अतिरिक्त टेम्पलेट";

    const printWindow = window.open("", "", "height=700,width=1000");
    if (!printWindow) {
      setAlertMessage("पॉपअप ब्लॉकर सक्रिय आहे, कृपया परवानगी द्या.");
      setIsCompiling(false);
      return;
    }

    // Load detailed data for all students in parallel
    const studentDataPromises = selectedStudents.map(async (student) => {
      const studentId = student.id || `${classValue}-${division}-${student.srNo}`;
      const [firstSemesterData, secondSemesterData, heightWeightData, attendanceData] = await Promise.all([
        fetchMarksData(studentId, academicYear, "First Semester"),
        fetchMarksData(studentId, academicYear, "Second Semester"),
        fetchHeightWeightData(studentId, academicYear),
        fetchAttendanceFromIndexedDB(student.srNo, academicYear)
      ]);

      const firstSemesterResults = firstSemesterData || {};
      const secondSemesterResults = secondSemesterData || {};
      const resultsWithTotal = {};

      subjectSequence.forEach((subject) => {
        const firstSemMarks = firstSemesterResults[subject] || {};
        const firstSemTotal = calculateSubjectTotal(firstSemMarks);
        const firstSemGrade = calculateGrade(firstSemTotal);

        const secondSemMarks = secondSemesterResults[subject] || {};
        const secondSemTotal = calculateSubjectTotal(secondSemMarks);
        const secondSemGrade = calculateGrade(secondSemTotal);

        resultsWithTotal[subject] = {
          firstSemesterMarks: firstSemMarks,
          firstSemesterTotal: firstSemTotal,
          firstSemesterGrade: firstSemGrade,
          secondSemesterMarks: secondSemMarks,
          secondSemesterTotal: secondSemTotal,
          secondSemesterGrade: secondSemGrade
        };
      });

      return {
        student,
        firstSemesterData,
        secondSemesterData,
        heightWeightData,
        attendanceData,
        resultsWithTotal
      };
    });

    const studentRecords = await Promise.all(studentDataPromises);

    // Fetch Firestore marks for both semesters and merge into student records
    try {
      const [fsMarksFirst, fsMarksSecond] = await Promise.all([
        fetchFirestoreMarks(classValue, academicYear, "first"),
        fetchFirestoreMarks(classValue, academicYear, "second")
      ]);

      if (fsMarksFirst.length > 0 || fsMarksSecond.length > 0) {
        studentRecords.forEach((record) => {
          // Build temp marks objects from IndexedDB data
          const tempFirst = {};
          const tempSecond = {};
          tempFirst[record.student.srNo] = record.firstSemesterData || {};
          tempSecond[record.student.srNo] = record.secondSemesterData || {};

          // Merge with Firestore data
          if (fsMarksFirst.length > 0) {
            const mergedFirst = matchAndMergeMarks([record.student], tempFirst, fsMarksFirst, subjectSequence);
            record.firstSemesterData = mergedFirst[record.student.srNo] || record.firstSemesterData;
          }
          if (fsMarksSecond.length > 0) {
            const mergedSecond = matchAndMergeMarks([record.student], tempSecond, fsMarksSecond, subjectSequence);
            record.secondSemesterData = mergedSecond[record.student.srNo] || record.secondSemesterData;
          }

          // Recalculate resultsWithTotal with merged data
          subjectSequence.forEach((subject) => {
            const firstSemMarks = (record.firstSemesterData || {})[subject] || {};
            const firstSemTotal = calculateSubjectTotal(firstSemMarks);
            const firstSemGrade = calculateGrade(firstSemTotal);

            const secondSemMarks = (record.secondSemesterData || {})[subject] || {};
            const secondSemTotal = calculateSubjectTotal(secondSemMarks);
            const secondSemGrade = calculateGrade(secondSemTotal);

            record.resultsWithTotal[subject] = {
              firstSemesterMarks: firstSemMarks,
              firstSemesterTotal: firstSemTotal,
              firstSemesterGrade: firstSemGrade,
              secondSemesterMarks: secondSemMarks,
              secondSemesterTotal: secondSemTotal,
              secondSemesterGrade: secondSemGrade
            };
          });
        });
      }
    } catch (fsError) {
      console.warn("Firestore marks merge failed for ProgressSheet, using IndexedDB data:", fsError);
    }

    let htmlContent = `
      <html>
        <head>
          <title>Progress Sheets - ${classValue}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700&family=Poppins:wght@400;700&display=swap');
            
            @page {
              size: ${activeSemester === "extra" ? "A4 portrait" : "A4 landscape"};
              margin: 4mm;
            }
            body {
              font-family: 'Poppins', 'Noto Sans Devanagari', sans-serif;
              margin: 0;
              padding: 0;
              color: black;
              background-color: #fff;
              font-size: 10px;
            }
            .page-break {
              page-break-after: always;
              width: 100%;
              box-sizing: border-box;
            }
            .page-break:last-child {
              page-break-after: avoid;
            }
            
            .container {
              width: 285mm;
              height: 195mm;
              margin: 0 auto;
              box-sizing: border-box;
              padding: 4mm;
              border: 3px solid #000;
              overflow: hidden;
              display: flex;
              justify-content: space-between;
              background: linear-gradient(to bottom, #fdfbfb 0%, #ebedee 100%);
            }
            .left, .right {
              width: 48%;
              border: 2px solid black;
              padding: 10px;
              box-sizing: border-box;
              position: relative;
              height: 100%;
            }
            .left-box {
              background-color: #f9f9f9;
              padding: 10px;
              border: 1px solid #000;
              border-radius: 8px;
            }
            .school-info {
              display: flex;
              align-items: center;
              margin-bottom: 5px;
            }
            .school-info img {
              width: 50px;
              height: 50px;
              object-fit: cover;
              margin-right: 15px;
            }
            .school-info h2 {
              font-size: 14px;
              font-weight: bold;
              margin: 0;
              color: #1a237e;
            }
            
            .student-info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
              background-color: #f9f9f9;
              padding: 8px;
              border-radius: 6px;
              border: 1px solid #000;
              margin-top: 10px;
            }
            .student-info-grid p {
              margin: 1px 0;
              font-size: 9.5px;
            }
            .student-info-grid label {
              font-weight: bold;
              color: #1a237e;
            }
            .student-info-grid span {
              margin-left: 5px;
              color: #333;
            }
            
            .gradable {
              margin-top: 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
              font-size: 9px;
            }
            th, td {
              border: 1px solid #000 !important;
              padding: 4px;
              text-align: center;
              vertical-align: middle;
            }
            thead th {
              background-color: #e8f5e9;
              font-weight: bold;
              color: #1b4d3e;
            }
            .attendance-table th, .attendance-table td {
              width: 14%;
            }
            .attendance-table td:first-child {
              width: 16%;
              font-weight: bold;
            }
            
            .grad {
              margin-top: 10px;
              font-size: 8.5px;
            }
            .grad p {
              margin: 2px 0;
            }
            .grade-table {
              margin-top: 8px;
            }
            
            .extra-template-container {
              width: 200mm;
              min-height: 285mm;
              padding: 10mm;
              background: linear-gradient(to bottom, #fdfbfb 0%, #ebedee 100%);
              border: 8px double #1a237e;
              margin: 0 auto;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              line-height: 1.3;
              color: #000;
            }
          </style>
        </head>
        <body>
    `;

    // Loop through records
    studentRecords.forEach(({ student, firstSemesterData, secondSemesterData, heightWeightData, attendanceData, resultsWithTotal }) => {
      const hwData = heightWeightData || {};
      const attData = attendanceData || { Present: {}, Absent: {}, Leave: {} };
      const firstSemesterNondi = firstSemesterData?.nondi || {};
      const secondSemesterNondi = secondSemesterData?.nondi || {};

      if (activeSemester === "first") {
        // First Semester Layout (Landscape - 2 Containers)
        htmlContent += `
          <div class="page-break">
            <!-- First Semester: Container 1 -->
            <div class="container">
              <div class="left">
                <div class="left-box">
                  <div class="school-info">
                    ${schoolLogo ? `<img src="${schoolLogo}" alt="Logo">` : ""}
                    <h2>${schoolName}</h2>
                  </div>
                </div>
                <br />
                <div class="student-info-grid">
                  <p><label>${language === "English" ? "Name :" : "नाव :"}</label><span>${student.stdName || ""} ${student.stdFather || ""} ${student.stdSurname || ""}</span></p>
                  <p><label>${language === "English" ? "Roll No :" : "हजेरी क्र. :"}</label><span>${student.rollNo || " "}</span></p>
                  <p><label>${language === "English" ? "Exam :" : "परीक्षा सत्र :"}</label><span>${termLabel}</span></p>
                  <p><label>${language === "English" ? "Year :" : "वर्ष :"}</label><span>${academicYear}</span></p>
                  <p><label>${language === "English" ? "Class :" : "वर्ग :"}</label><span>${classValue}</span></p>
                  <p><label>${language === "English" ? "Mother's Name :" : "आईचे नाव :"}</label><span>${student.stdMother || ""}</span></p>
                  <p><label>${language === "English" ? "DOB :" : "जन्मतारीख :"}</label><span>${student.dob || " "}</span></p>
                  <p><label>${language === "English" ? "Division :" : "तुकडी :"}</label><span>${student.division || " "}</span></p>
                  <p><label>${language === "English" ? "Mother Tongue :" : "मातृभाषा :"}</label><span>${student.motherTounge || " "}</span></p>
                  <p><label>${language === "English" ? "Student ID :" : "विद्यार्थी आयडी :"}</label><span>${student.studentId || " "}</span></p>
                  <p><label>${language === "English" ? "Gender :" : "लिंग :"}</label><span>${student.gender === "Male" ? "मुलगा" : student.gender === "Female" ? "मुलगी" : "-"}</span></p>
                </div>
                <div class="gradable">
                  <table>
                    <thead>
                      <tr>
                        <th rowspan="2"></th>
                        <th>${language === "English" ? "First Semester" : "प्रथम सत्र"}</th>
                        <th>${language === "English" ? "Second Semester" : "द्वितीय सत्र"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>${language === "English" ? "Weight" : "वजन"} (Kg)</td>
                        <td><span>${hwData.September?.weight || ""}</span></td>
                        <td><span>${hwData.March?.weight || ""}</span></td>
                      </tr>
                      <tr>
                        <td>${language === "English" ? "Height" : "उंची"} (Cm)</td>
                        <td><span>${hwData.September?.height || ""}</span></td>
                        <td><span>${hwData.March?.height || ""}</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div class="right">
                <h2>${language === "English" ? "Attendance:" : "हजेरी"}</h2>
                <table class="attendance-table">
                  <thead>
                    <tr>
                      <th>${language === "English" ? "Type:" : "प्रकार"}</th>
                      ${firstSemesterMonths.map(m => `<th>${getMonthName(m)}</th>`).join("")}
                    </tr>
                  </thead>
                  <tbody>
                    ${["Present", "Absent", "Leave"].map(type => `
                      <tr>
                        <td>${getAttendanceType(type)}</td>
                        ${firstSemesterMonths.map(m => `<td>${(type === "Leave" && attData[type]?.[m] < 0) ? "" : (attData[type]?.[m] || 0)}</td>`).join("")}
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
                <p style="margin-top: 15px;">${language === "English" ? "After the winter vacation the school will start from." : "हिवाळी सुटीनंतर शाळा दि. पासून सुरू होईल."}</p>
                <div style="width: 150px; font-weight: bold; border-bottom: 1px solid black; padding-bottom: 2px;">
                  ${winterVacationDate || ""}
                </div>
                <div class="grad">
                  <p>
                    <strong>${language === "English" ? " Instructions for parents:" : "पालकांसाठी सूचना"}</strong>
                    <br/>1. ${language === "English" ? " Students should wear school uniform every day." : "विद्यार्थ्यांनी दररोज शालेय गणवेश परिधान करावा."}
                    <br/>2. ${language === "English" ? " A student should do the study given in school every day." : "विद्यार्थ्याने शाळेत दिलेला अभ्यास दररोज करावा."}
                    <br/>3. ${language === "English" ? " Students should attend school on time and regularly every day." : "विद्यार्थ्यांनी दररोज वेळेवर व नियमितपणे शाळेत हजर राहावे."}
                    <br/>4. ${language === "English" ? " Students should not carry valuables, money." : "विद्यार्थ्यांनी मौल्यवान वस्तू, पैसे घेऊन जाऊ नये."}
                    <br/>5. ${language === "English" ? " Students should follow the rules and discipline of the school." : "विद्यार्थ्यांनी शाळेचे नियम व शिस्तीचे पालन करावे."}
                  </p>
                </div>
                <p style="margin-top: 40px; text-align: right; padding-right: 20px;">${language === "English" ? "Parents Signature " : "पालकांची सही"}</p>
              </div>
            </div>
          </div>

          <div class="page-break">
            <!-- First Semester: Container 2 -->
            <div class="container">
              <div class="left">
                <h2 style="text-decoration: underline;">${language === "English" ? "Student Progress Report" : "विद्यार्थी प्रगती अहवाल"}</h2>
                <div><label>${language === "English" ? "Roll No: " : "हजेरी क्रमांक: "}</label><span>${student.rollNo || " "}</span></div>
                <div><label>${language === "English" ? "Student Name: " : "विद्यार्थ्याचे नाव: "}</label><span>${student.stdName || ""} ${student.stdFather || ""} ${student.stdSurname || ""}</span></div>
                <div><label>${language === "English" ? "Class: " : "वर्ग: "}</label><span>${classValue}</span></div>
                <div><label>${language === "English" ? "Exam: " : "परीक्षा: "}</label><span>${termLabel}</span></div>
                
                <table style="margin-top: 10px;">
                  <thead>
                    <tr>
                      <th>${language === "English" ? "Subject" : "विषय"}</th>
                      <th>${language === "English" ? "Grade" : "श्रेणी"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${subjectSequence.map(sub => {
                      const { firstSemesterGrade } = resultsWithTotal[sub] || {};
                      return `
                        <tr>
                          <td><b>${sub}</b></td>
                          <td><b>${firstSemesterGrade || "-"}</b></td>
                        </tr>
                      `;
                    }).join("")}
                  </tbody>
                </table>
                <div style="display: flex; justify-content: space-between; align-items: flex-end; width: 90%; position: absolute; bottom: 20px; font-weight: bold; left: 15px;">
                  <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
                    ${cceSettings?.signatureUrl ? `<img src="${cceSettings.signatureUrl}" style="max-height: 40px; display: block; margin-bottom: 2px;" />` : `<div style="height: 42px;"></div>`}
                    <span>${cceSettings?.teacherName || (language === "English" ? "Class Teacher" : "वर्गशिक्षक")}</span>
                  </div>
                  <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
                    ${cceSettings?.principalSignature ? `<img src="${cceSettings.principalSignature}" style="max-height: 40px; display: block; margin-bottom: 2px;" />` : `<div style="height: 42px;"></div>`}
                    <span>${cceSettings?.principalName || (language === "English" ? "Principal" : "प्राचार्य")}</span>
                  </div>
                </div>
              </div>
              <div class="right">
                <h2>${language === "English" ? "Remark" : "नोंदी"}</h2>
                <table style="width: 100%;">
                  <thead>
                    <tr>
                      <th style="width: 33%;">${language === "English" ? "Special Progress:" : "विशेष प्रगती:"}</th>
                      <th style="width: 33%;">${language === "English" ? "Hobbies:" : "छंद:"}</th>
                      <th style="width: 33%;">${language === "English" ? "Required Improvements:" : "आवश्यक सुधारणा:"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style="height: 110px; vertical-align: top; text-align: left; padding: 5px;">${firstSemesterNondi.specialEntries || ""}</td>
                      <td style="height: 110px; vertical-align: top; text-align: left; padding: 5px;">${firstSemesterNondi.interestsAndHobbies || ""}</td>
                      <td style="height: 110px; vertical-align: top; text-align: left; padding: 5px;">${firstSemesterNondi.necessaryCorrections || ""}</td>
                    </tr>
                  </tbody>
                </table>
                <div class="grade-table">
                  <h2>${language === "English" ? "Grade Table" : "श्रेणी टेबल"}</h2>
                  <table>
                    <thead>
                      <tr>
                        <th>%</th>
                        <th>अ-1</th>
                        <th>अ-2</th>
                        <th>ब-1</th>
                        <th>ब-2</th>
                        <th>क-1</th>
                        <th>क-2</th>
                        <th>ड-1</th>
                        <th>ड-2</th>
                        <th>अनुपस्थित</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>%</td>
                        <td>91%-100%</td>
                        <td>81%-90%</td>
                        <td>71%-80%</td>
                        <td>61%-70%</td>
                        <td>51%-60%</td>
                        <td>41%-50%</td>
                        <td>33%-40%</td>
                        <td>21%-32%</td>
                        <td>&lt;20%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        `;
      } else if (activeSemester === "second") {
        // Second Semester Layout (Landscape - 2 Containers)
        htmlContent += `
          <div class="page-break">
            <!-- Second Semester: Container 1 -->
            <div class="container">
              <div class="left">
                <div class="left-box">
                  <div class="school-info">
                    ${schoolLogo ? `<img src="${schoolLogo}" alt="Logo">` : ""}
                    <h2>${schoolName}</h2>
                  </div>
                </div>
                <br />
                <div class="student-info-grid">
                  <p><label>${language === "English" ? "Name :" : "नाव :"}</label><span>${student.stdName || ""} ${student.stdFather || ""} ${student.stdSurname || ""}</span></p>
                  <p><label>${language === "English" ? "Roll No :" : "हजेरी क्र. :"}</label><span>${student.rollNo || " "}</span></p>
                  <p><label>${language === "English" ? "Exam :" : "परीक्षा सत्र :"}</label><span>${termLabel}</span></p>
                  <p><label>${language === "English" ? "Year :" : "वर्ष :"}</label><span>${academicYear}</span></p>
                  <p><label>${language === "English" ? "Class :" : "वर्ग :"}</label><span>${classValue}</span></p>
                  <p><label>${language === "English" ? "Mother's Name :" : "आईचे नाव :"}</label><span>${student.stdMother || ""}</span></p>
                  <p><label>${language === "English" ? "DOB :" : "जन्मतारीख :"}</label><span>${student.dob || " "}</span></p>
                  <p><label>${language === "English" ? "Division :" : "तुकडी :"}</label><span>${student.division || " "}</span></p>
                  <p><label>${language === "English" ? "Mother Tongue :" : "मातृभाषा :"}</label><span>${student.motherTounge || " "}</span></p>
                  <p><label>${language === "English" ? "Student ID :" : "विद्यार्थी आयडी :"}</label><span>${student.studentId || " "}</span></p>
                  <p><label>${language === "English" ? "Gender :" : "लिंग :"}</label><span>${student.gender === "Male" ? "मुलगा" : student.gender === "Female" ? "मुलगी" : "-"}</span></p>
                </div>
                <div class="gradable">
                  <table>
                    <thead>
                      <tr>
                        <th rowspan="2"></th>
                        <th>${language === "English" ? "First Semester" : "प्रथम सत्र"}</th>
                        <th>${language === "English" ? "Second Semester" : "द्वितीय सत्र"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>${language === "English" ? "Weight" : "वजन"} (Kg)</td>
                        <td><span>${hwData.September?.weight || ""}</span></td>
                        <td><span>${hwData.March?.weight || ""}</span></td>
                      </tr>
                      <tr>
                        <td>${language === "English" ? "Height" : "उंची"} (Cm)</td>
                        <td><span>${hwData.September?.height || ""}</span></td>
                        <td><span>${hwData.March?.height || ""}</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div class="right">
                <h2>${language === "English" ? "Attendance:" : "हजेरी"}</h2>
                <table class="attendance-table">
                  <thead>
                    <tr>
                      <th>${language === "English" ? "Type:" : "प्रकार"}</th>
                      ${firstSemesterMonths.map(m => `<th>${getMonthName(m)}</th>`).join("")}
                    </tr>
                  </thead>
                  <tbody>
                    ${["Present", "Absent", "Leave"].map(type => `
                      <tr>
                        <td>${getAttendanceType(type)}</td>
                        ${firstSemesterMonths.map(m => `<td>${(type === "Leave" && attData[type]?.[m] < 0) ? "" : (attData[type]?.[m] || 0)}</td>`).join("")}
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
                <h5 style="margin-top: 5px; margin-bottom: 5px;">${language === "English" ? "Second Semester Attendance:" : "द्वितीय सत्राची हजेरी:"}</h5>
                <table class="attendance-table">
                  <thead>
                    <tr>
                      <th>${language === "English" ? "Type:" : "प्रकार"}</th>
                      ${secondSemesterMonths.map(m => `<th>${getMonthName(m)}</th>`).join("")}
                    </tr>
                  </thead>
                  <tbody>
                    ${["Present", "Absent", "Leave"].map(type => `
                      <tr>
                        <td>${getAttendanceType(type)}</td>
                        ${secondSemesterMonths.map(m => `<td>${(type === "Leave" && attData[type]?.[m] < 0) ? "" : (attData[type]?.[m] || 0)}</td>`).join("")}
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
                <p style="margin-top: 5px;">${language === "English" ? "After the summer vacation school will start from." : "उन्हाळी सुटीनंतर शाळा दि. पासून सुरू होईल."}</p>
                <div style="width: 150px; font-weight: bold; border-bottom: 1px solid black; padding-bottom: 2px;">
                  ${summerVacationDate || ""}
                </div>
                <div class="grad">
                  <p>
                    <strong>${language === "English" ? " Instructions for parents:" : "पालकांसाठी सूचना"}</strong>
                    <br/>1. ${language === "English" ? " Students should wear school uniform every day." : "विद्यार्थ्यांनी दररोज शालेय गणवेश परिधान करावा."}
                    <br/>2. ${language === "English" ? " A student should do the study given in school every day." : "विद्यार्थ्याने शाळेत दिलेला अभ्यास दररोज करावा."}
                    <br/>3. ${language === "English" ? " Students should attend school on time and regularly every day." : "विद्यार्थ्यांनी दररोज वेळेवर व नियमितपणे शाळेत हजर राहावे."}
                    <br/>4. ${language === "English" ? " Students should not carry valuables, money." : "विद्यार्थ्यांनी मौल्यवान वस्तू, पैसे घेऊन जाऊ नये."}
                    <br/>5. ${language === "English" ? " Students should follow the rules and discipline of the school." : "विद्यार्थ्यांनी शाळेचे नियम व शिस्तीचे पालन करावे."}
                  </p>
                </div>
                <p style="margin-top: 25px; text-align: right; padding-right: 20px;">${language === "English" ? "Parents Signature " : "पालकांची सही"}</p>
              </div>
            </div>
          </div>

          <div class="page-break">
            <!-- Second Semester: Container 2 -->
            <div class="container">
              <div class="left">
                <h2 style="text-decoration: underline;">${language === "English" ? "Student Progress Report" : "विद्यार्थी प्रगती अहवाल"}</h2>
                <div><label>${language === "English" ? "Roll No: " : "हजेरी क्रमांक: "}</label><span>${student.rollNo || " "}</span></div>
                <div><label>${language === "English" ? "Student Name: " : "विद्यार्थ्याचे नाव: "}</label><span>${student.stdName || ""} ${student.stdFather || ""} ${student.stdSurname || ""}</span></div>
                <div><label>${language === "English" ? "Class: " : "वर्ग: "}</label><span>${classValue}</span></div>
                <div><label>${language === "English" ? "Exam: " : "परीक्षा: "}</label><span>${termLabel}</span></div>
                
                <table style="margin-top: 10px;">
                  <thead>
                    <tr>
                      <th rowspan="2">${language === "English" ? "Subject" : "विषय"}</th>
                      <th colspan="2">${language === "English" ? "First Semester" : "प्रथम सत्र"}</th>
                      <th colspan="2">${language === "English" ? "Second Semester" : "द्वितीय सत्र"}</th>
                      <th rowspan="2">${language === "English" ? "Total (100)" : "एकूण (100)"}</th>
                      <th rowspan="2">${language === "English" ? "Grade" : "श्रेणी"}</th>
                    </tr>
                    <tr>
                      <th>${language === "English" ? "Marks" : "गुण"}</th>
                      <th>${language === "English" ? "Grade" : "श्रेणी"}</th>
                      <th>${language === "English" ? "Marks" : "गुण"}</th>
                      <th>${language === "English" ? "Grade" : "श्रेणी"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${subjectSequence.map(sub => {
                      const rowData = resultsWithTotal[sub] || {};
                      const firstTotal = rowData.firstSemesterTotal || 0;
                      const secondTotal = rowData.secondSemesterTotal || 0;
                      const combTotal = firstTotal + secondTotal;
                      const combGrade = calculateGrade(combTotal);
                      return `
                        <tr>
                          <td><b>${sub}</b></td>
                          <td><b>${rowData.firstSemesterTotal ?? "-"}</b></td>
                          <td><b>${rowData.firstSemesterGrade ?? "-"}</b></td>
                          <td><b>${rowData.secondSemesterTotal ?? "-"}</b></td>
                          <td><b>${rowData.secondSemesterGrade ?? "-"}</b></td>
                          <td><b>${combTotal || "-"}</b></td>
                          <td><b>${combGrade || "-"}</b></td>
                        </tr>
                      `;
                    }).join("")}
                  </tbody>
                </table>
                <div style="display: flex; justify-content: space-between; align-items: flex-end; width: 90%; position: absolute; bottom: 20px; font-weight: bold; left: 15px;">
                  <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
                    ${cceSettings?.signatureUrl ? `<img src="${cceSettings.signatureUrl}" style="max-height: 40px; display: block; margin-bottom: 2px;" />` : `<div style="height: 42px;"></div>`}
                    <span>${language === "English" ? "Class Teacher" : "वर्गशिक्षक"}</span>
                  </div>
                  <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
                    ${cceSettings?.principalSignature ? `<img src="${cceSettings.principalSignature}" style="max-height: 40px; display: block; margin-bottom: 2px;" />` : `<div style="height: 42px;"></div>`}
                    <span>${language === "English" ? "Principal" : "प्राचार्य"}</span>
                  </div>
                </div>
              </div>
              <div class="right">
                <h2>${language === "English" ? "Remark" : "नोंदी"}</h2>
                <table style="width: 100%;">
                  <thead>
                    <tr>
                      <th style="width: 33%;">${language === "English" ? "Special Progress:" : "विशेष प्रगती:"}</th>
                      <th style="width: 33%;">${language === "English" ? "Hobbies:" : "छंद:"}</th>
                      <th style="width: 33%;">${language === "English" ? "Required Improvements:" : "आवश्यक सुधारणा:"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style="height: 110px; vertical-align: top; text-align: left; padding: 5px;">${secondSemesterNondi.specialEntries || ""}</td>
                      <td style="height: 110px; vertical-align: top; text-align: left; padding: 5px;">${secondSemesterNondi.interestsAndHobbies || ""}</td>
                      <td style="height: 110px; vertical-align: top; text-align: left; padding: 5px;">${secondSemesterNondi.necessaryCorrections || ""}</td>
                    </tr>
                  </tbody>
                </table>
                <div class="grade-table">
                  <h2>${language === "English" ? "Grade Table" : "श्रेणी टेबल"}</h2>
                  <table>
                    <thead>
                      <tr>
                        <th>%</th>
                        <th>अ-1</th>
                        <th>अ-2</th>
                        <th>ब-1</th>
                        <th>ब-2</th>
                        <th>क-1</th>
                        <th>क-2</th>
                        <th>ड-1</th>
                        <th>ड-2</th>
                        <th>अनुपस्थित</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>%</td>
                        <td>91%-100%</td>
                        <td>81%-90%</td>
                        <td>71%-80%</td>
                        <td>61%-70%</td>
                        <td>51%-60%</td>
                        <td>41%-50%</td>
                        <td>33%-40%</td>
                        <td>21%-32%</td>
                        <td>&lt;20%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        `;
      } else if (activeSemester === "extra") {
        // Extra Template Layout (Portrait - 1 Page)
        htmlContent += `
          <div class="page-break">
            <div class="extra-template-container">
              <div style="display: flex; justify-content: space-between; mb: 10px;">
                <div style="flex: 1.2;">
                  <div style="font-size: 11px; color: #1a237e; font-weight: bold;">${language === "English" ? "|| Sarva Shiksha Abhiyan ||" : "।। सर्व शिक्षा अभियान ।।"}</div>
                  <div style="font-size: 9px; color: #1a237e;">${language === "English" ? "Education for All" : "सब पढे सब बढे"}</div>
                </div>
                <div style="flex: 2; text-align: center;">
                  <h2 style="font-size: 18px; font-weight: bold; margin: 0; color: #1a237e; text-decoration: underline;">
                    ${language === "English" ? "Continuous Comprehensive Evaluation Form A" : "सातत्यपूर्ण सर्वंकष मूल्यमापन प्रपत्र अ"}
                  </h2>
                  <div style="font-size: 14px; margin-top: 5px; font-weight: bold;">
                    ${language === "English" ? "School" : "शाळा"} : <span style="border-bottom: 2px solid #1a237e; min-width: 250px; display: inline-block; color: #b71c1c;">${schoolName}</span>
                  </div>
                  <div style="font-size: 12px; margin-top: 5px;">
                    ${language === "English" ? "Year" : "सन"} : २०${academicYear.split("-")[0].slice(-2)}-२०${academicYear.split("-")[1].slice(-2)}
                  </div>
                </div>
                <div style="flex: 1; border: 1.5px solid #1a237e; padding: 3px; font-size: 9px; text-align: center; background-color: #fff; border-radius: 6px;">
                  <div style="font-weight: bold; border-bottom: 1px solid #1a237e; margin-bottom: 2px; color: #b71c1c; font-size: 10px;">${language === "English" ? "Grade" : "श्रेणी"}</div>
                  <div>91-100: A1 &bull; 81-90: A2</div>
                  <div>71-80: B1 &bull; 61-70: B2</div>
                  <div>51-60: C1 &bull; 41-50: C2</div>
                  <div>33-40: D &bull; 21-32: E1</div>
                </div>
              </div>

              <div style="margin-top: 10px; margin-bottom: 10px; font-size: 13px; background-color: rgba(255,255,255,0.8); padding: 8px; border-radius: 6px; border: 1.5px solid #1a237e;">
                <div style="display: flex; justify-content: space-between;">
                  <div>${language === "English" ? "Student's Name" : "विद्यार्थ्याचे नांव"} : <span style="border-bottom: 1.5px solid #1a237e; min-width: 280px; display: inline-block; font-weight: bold; color: #1a237e;">${student.stdName} ${student.stdFather} ${student.stdSurname}</span></div>
                  <div>${language === "English" ? "Class" : "इयत्ता"} : <span style="border-bottom: 1.5px solid #1a237e; min-width: 60px; display: inline-block; font-weight: bold; text-align: center; color: #b71c1c;">${classValue}</span></div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                  <div>${language === "English" ? "Reg. No." : "रजि.नं."} : <span style="font-weight: bold; color: #1a237e;">${student.studentId || ""}</span></div>
                  <div>${language === "English" ? "Division" : "तुकडी"} : <span style="border-bottom: 1.5px solid #1a237e; min-width: 60px; display: inline-block; text-align: center; font-weight: bold; color: #b71c1c;">${student.division || "-"}</span></div>
                </div>
              </div>

              <table style="width: 100%; border: 1.5px solid #1a237e; font-size: 11px;">
                <thead>
                  <tr style="background-color: #1a237e; color: #fff;">
                    <th style="color:#fff; background-color:#0d47a1; padding: 6px;">${language === "English" ? "Subject" : "विषय"}</th>
                    <th style="color:#fff; background-color:#1a237e;">मराठी</th>
                    <th style="color:#fff; background-color:#1a237e;">हिंदी</th>
                    <th style="color:#fff; background-color:#1a237e;">इंग्रजी</th>
                    <th style="color:#fff; background-color:#1a237e;">गणित</th>
                    <th style="color:#fff; background-color:#1a237e;">विज्ञान</th>
                    <th style="color:#fff; background-color:#1a237e;">स.शास्त्र</th>
                    <th style="color:#fff; background-color:#1a237e;">कला</th>
                    <th style="color:#fff; background-color:#1a237e;">कार्यानुभव</th>
                    <th style="color:#fff; background-color:#1a237e;">शा.शि.</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="font-weight: bold; background-color: #f5f5f5;">${language === "English" ? "Sem I Grade" : "सत्र १ श्रेणी"}</td>
                    <td>${resultsWithTotal["मराठी"]?.firstSemesterGrade || resultsWithTotal["marathi"]?.firstSemesterGrade || "-"}</td>
                    <td>${resultsWithTotal["हिंदी"]?.firstSemesterGrade || resultsWithTotal["hindi"]?.firstSemesterGrade || "-"}</td>
                    <td>${resultsWithTotal["इंग्रजी"]?.firstSemesterGrade || resultsWithTotal["english"]?.firstSemesterGrade || "-"}</td>
                    <td>${resultsWithTotal["गणित"]?.firstSemesterGrade || resultsWithTotal["maths"]?.firstSemesterGrade || "-"}</td>
                    <td>${resultsWithTotal["विज्ञान"]?.firstSemesterGrade || resultsWithTotal["science"]?.firstSemesterGrade || "-"}</td>
                    <td>${resultsWithTotal["स.शास्त्र"]?.firstSemesterGrade || resultsWithTotal["social_studies"]?.firstSemesterGrade || "-"}</td>
                    <td>${resultsWithTotal["कला"]?.firstSemesterGrade || resultsWithTotal["art"]?.firstSemesterGrade || "-"}</td>
                    <td>${resultsWithTotal["कार्यानुभव"]?.firstSemesterGrade || resultsWithTotal["craft"]?.firstSemesterGrade || "-"}</td>
                    <td>${resultsWithTotal["शा.शि."]?.firstSemesterGrade || resultsWithTotal["physical_education"]?.firstSemesterGrade || "-"}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold; background-color: #f5f5f5;">${language === "English" ? "Sem II Grade" : "सत्र २ श्रेणी"}</td>
                    <td>${resultsWithTotal["मराठी"]?.secondSemesterGrade || resultsWithTotal["marathi"]?.secondSemesterGrade || "-"}</td>
                    <td>${resultsWithTotal["हिंदी"]?.secondSemesterGrade || resultsWithTotal["hindi"]?.secondSemesterGrade || "-"}</td>
                    <td>${resultsWithTotal["इंग्रजी"]?.secondSemesterGrade || resultsWithTotal["english"]?.secondSemesterGrade || "-"}</td>
                    <td>${resultsWithTotal["गणित"]?.secondSemesterGrade || resultsWithTotal["maths"]?.secondSemesterGrade || "-"}</td>
                    <td>${resultsWithTotal["विज्ञान"]?.secondSemesterGrade || resultsWithTotal["science"]?.secondSemesterGrade || "-"}</td>
                    <td>${resultsWithTotal["स.शास्त्र"]?.secondSemesterGrade || resultsWithTotal["social_studies"]?.secondSemesterGrade || "-"}</td>
                    <td>${resultsWithTotal["कला"]?.secondSemesterGrade || resultsWithTotal["art"]?.secondSemesterGrade || "-"}</td>
                    <td>${resultsWithTotal["कार्यानुभव"]?.secondSemesterGrade || resultsWithTotal["craft"]?.secondSemesterGrade || "-"}</td>
                    <td>${resultsWithTotal["शा.शि."]?.secondSemesterGrade || resultsWithTotal["physical_education"]?.secondSemesterGrade || "-"}</td>
                  </tr>
                </tbody>
              </table>

              <div style="margin-top: 10px; border: 1.5px solid #1a237e; padding: 8px; border-radius: 6px; font-size: 11px; background-color:#fff;">
                <div style="font-weight: bold; color: #1a237e; border-bottom: 1px dashed #ccc; pb: 2px; mb: 5px;">
                  ${language === "English" ? "Descriptive Remarks" : "वर्णनात्मक नोंदी"}
                </div>
                <div style="margin-bottom: 5px;">
                  <b>१) विशेष प्रगती:</b> <span style="color: #0d47a1;">${secondSemesterNondi.specialEntries || ""}</span>
                </div>
                <div style="margin-bottom: 5px;">
                  <b>२) आवड / छंद:</b> <span style="color: #0d47a1;">${secondSemesterNondi.interestsAndHobbies || ""}</span>
                </div>
                <div>
                  <b>३) सुधारणा आवश्यक:</b> <span style="color: #0d47a1;">${secondSemesterNondi.necessaryCorrections || ""}</span>
                </div>
              </div>

              <div style="margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; font-weight: bold; font-size: 13px;">
                <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
                  ${cceSettings?.signatureUrl ? `<img src="${cceSettings.signatureUrl}" style="max-height: 50px; display: block; margin-bottom: 2px;" />` : `<div style="height: 52px;"></div>`}
                  <span>${language === "English" ? "Class Teacher Signature" : "वर्गशिक्षक स्वाक्षरी"}</span>
                </div>
                <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
                  ${cceSettings?.principalSignature ? `<img src="${cceSettings.principalSignature}" style="max-height: 50px; display: block; margin-bottom: 2px;" />` : `<div style="height: 52px;"></div>`}
                  <span>${language === "English" ? "Principal Signature" : "मुख्याध्यापक स्वाक्षरी"}</span>
                </div>
              </div>
            </div>
          </div>
        `;
      }
    });

    htmlContent += `
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
      setIsCompiling(false);
    }, 800);
  };

  return (
    <div className="w-full bg-[#0d1310] text-[#e1f5fe] p-6 font-sans relative">
      <AlertMessage message={alertMessage} show={showAlert} />

      {/* Header Bar */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-emerald-950/40">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-[#a2d8b4] hover:text-white transition-colors p-2.5 bg-[#121c16] border border-emerald-950/60 rounded-2xl cursor-pointer shadow-sm hover:scale-105 active:scale-95 duration-200"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
              {language === "English" ? "Progress Sheet" : "प्रगती पत्रक"}
            </h2>
            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mt-0.5">
              Report Card / Progress Sheet
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-emerald-600/80">
          {language === "English" ? "Class" : "वर्ग"}: {classValue}
        </span>
      </div>

      {/* Settings Options Card */}
      <div className="flex-1 max-w-2xl mx-auto w-full space-y-6">
        
        {/* Semester Tab Selection */}
        <div className="flex bg-[#121c16] rounded-full p-1 border border-emerald-950/60 max-w-md mx-auto shadow-inner">
          <button
            onClick={() => setActiveSemester("first")}
            className={`flex-1 py-2.5 rounded-full font-bold text-xs transition-all cursor-pointer ${
              activeSemester === "first" 
                ? "bg-[#223d2e] text-[#a2d8b4] shadow-md border border-emerald-900/30" 
                : "text-emerald-600/70 hover:text-emerald-500"
            }`}
          >
            {language === "English" ? "First Semester" : "प्रथम सत्र"}
          </button>
          <button
            onClick={() => setActiveSemester("second")}
            className={`flex-1 py-2.5 rounded-full font-bold text-xs transition-all cursor-pointer ${
              activeSemester === "second" 
                ? "bg-[#223d2e] text-[#a2d8b4] shadow-md border border-emerald-900/30" 
                : "text-emerald-600/70 hover:text-emerald-500"
            }`}
          >
            {language === "English" ? "Second Semester" : "द्वितीय सत्र"}
          </button>
          <button
            onClick={() => setActiveSemester("extra")}
            className={`flex-1 py-2.5 rounded-full font-bold text-xs transition-all cursor-pointer ${
              activeSemester === "extra" 
                ? "bg-[#223d2e] text-[#a2d8b4] shadow-md border border-emerald-900/30" 
                : "text-emerald-600/70 hover:text-emerald-500"
            }`}
          >
            {language === "English" ? "Extra Template" : "अतिरिक्त टेम्पलेट"}
          </button>
        </div>

        {/* Division Selection */}
        {divisions.length > 1 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#a2d8b4]/90 text-center">
              {language === "English" ? "Select Division" : "तुकडी निवडा (Select Division)"}
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {divisions.map((div) => (
                <button
                  key={div}
                  onClick={() => setDivision(div)}
                  className={`px-5 py-2 rounded-2xl font-bold text-xs transition-all cursor-pointer border ${
                    division === div
                      ? "bg-[#223d2e] border-emerald-500 text-[#a2d8b4] shadow-md"
                      : "bg-[#121c16] border-emerald-950/60 text-emerald-600/70 hover:text-[#a2d8b4]"
                  }`}
                >
                  {language === "English" ? `Division ${div}` : `तुकडी ${div}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Summer/Winter Reopening Date Config Inputs */}
        <div className="border-t border-emerald-950/40 pt-4 space-y-4 max-w-md mx-auto">
          {activeSemester === "first" && (
            <div className="flex items-center justify-between gap-4">
              <label className="text-xs font-bold text-emerald-100/90">
                {language === "English" ? "School reopening date after winter vacation:" : "हिवाळी सुटीनंतर शाळा सुरू दिनांक:"}
              </label>
              <input
                type="date"
                value={winterVacationDate}
                onChange={(e) => setWinterVacationDate(e.target.value)}
                className="bg-[#121c16] border border-emerald-950/60 text-[#a2d8b4] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}
          {activeSemester === "second" && (
            <div className="flex items-center justify-between gap-4">
              <label className="text-xs font-bold text-emerald-100/90">
                {language === "English" ? "School reopening date after summer vacation:" : "उन्हाळी सुटीनंतर शाळा सुरू दिनांक:"}
              </label>
              <input
                type="date"
                value={summerVacationDate}
                onChange={(e) => setSummerVacationDate(e.target.value)}
                className="bg-[#121c16] border border-emerald-950/60 text-[#a2d8b4] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}
        </div>

        {/* Info Text */}
        <div className="space-y-2 pt-4 text-center">
          <p className="text-sm text-emerald-100/95 leading-relaxed max-w-md mx-auto">
            {language === "English" ? "Hello, report cards / progress sheets have been loaded." : "नमस्कार, प्रगती पत्रक जोडला आहे."}
          </p>
          <p className="text-xs text-emerald-400/80 leading-relaxed max-w-md mx-auto">
            {language === "English" ? "It may take 2-3 minutes to compile PDFs. Please wait." : "PDF तयार होण्यासाठी दोन, तीन मिनिटे लागू शकतात. वाट पहावे."}
          </p>
          <p className="text-[11px] text-emerald-500/70 italic leading-relaxed max-w-md mx-auto">
            {language === "English" ? "School logo, slogan, and signatures are loaded dynamically from settings." : "शाळेचा लोगो, स्लोगन, सही सेटिंग्जमधून लोड केली जातात."}
          </p>
        </div>

        {/* Warnings */}
        <div className="bg-[#121c16]/50 border border-emerald-950/40 rounded-2xl p-5 text-xs text-emerald-400/80 leading-relaxed space-y-3 max-w-md mx-auto">
          {/* School Name Check */}
          <div className="flex items-start gap-2.5">
            {schoolName && schoolName !== "-" ? (
              <>
                <Check size={15} className="shrink-0 mt-0.5 text-emerald-400" />
                <span>
                  {language === "English"
                    ? `School Name: ${schoolName}`
                    : `शाळेचे नाव: ${schoolName}`}
                </span>
              </>
            ) : (
              <>
                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-[#ff9800]" />
                <span className="text-[#ff9800]/90">
                  {language === "English"
                    ? "School Name is missing in School Info."
                    : "शाळेचे नाव शाळेच्या माहितीमध्ये भरलेले नाही."}
                </span>
              </>
            )}
          </div>

          {/* Headmaster Name Check */}
          <div className="flex items-start gap-2.5">
            {(() => {
              const hmName = schoolData?.headmasterName || schoolData?.hmName || schoolData?.headmaster || cceSettings?.headmasterName || cceSettings?.principalName || "";
              if (hmName.trim()) {
                return (
                  <>
                    <Check size={15} className="shrink-0 mt-0.5 text-emerald-400" />
                    <span>
                      {language === "English"
                        ? `Headmaster: ${hmName}`
                        : `मुख्याध्यापक: ${hmName}`}
                    </span>
                  </>
                );
              } else {
                return (
                  <>
                    <AlertTriangle size={15} className="shrink-0 mt-0.5 text-[#ff9800]" />
                    <span className="text-[#ff9800]/90">
                      {language === "English"
                        ? "Headmaster name is missing in School Info."
                        : "शाळेच्या माहितीमध्ये मुख्याध्यापकांचे नाव भरलेले नाही."}
                    </span>
                  </>
                );
              }
            })()}
          </div>

          {/* Caste Configured Check */}
          <div className="flex items-start gap-2.5">
            {(() => {
              const missing = selectedStudents.filter(s => !s.caste || !s.caste.trim());
              if (selectedStudents.length === 0) {
                return (
                  <>
                    <AlertTriangle size={15} className="shrink-0 mt-0.5 text-[#ff9800]" />
                    <span className="text-[#ff9800]/90">
                      {language === "English"
                        ? "No student data available to check castes."
                        : "जात तपासण्यासाठी विद्यार्थी माहिती उपलब्ध नाही."}
                    </span>
                  </>
                );
              } else if (missing.length > 0) {
                const sampleNames = missing.slice(0, 2).map(s => s.fullName || s.studentName || s.name || `Roll ${s.rollNo || s.srNo}`).join(", ");
                const remaining = missing.length - 2;
                const sampleText = remaining > 0 
                  ? `${sampleNames} + ${remaining} ${language === "English" ? "more" : "इतर"}`
                  : sampleNames;
                return (
                  <>
                    <AlertTriangle size={15} className="shrink-0 mt-0.5 text-[#ff9800]" />
                    <span className="text-[#ff9800]/90">
                      {language === "English"
                        ? `Caste missing for ${missing.length} student(s) (${sampleText}). Select it in Student Info.`
                        : `${missing.length} विद्यार्थ्यांची जात निवडलेली नाही (${sampleText}). विद्यार्थी माहितीमध्ये ती निवडा.`}
                    </span>
                  </>
                );
              } else {
                return (
                  <>
                    <Check size={15} className="shrink-0 mt-0.5 text-emerald-400" />
                    <span>
                      {language === "English"
                        ? "Castes configured for all students."
                        : "सर्व विद्यार्थ्यांची जात निवडलेली आहे."}
                    </span>
                  </>
                );
              }
            })()}
          </div>

          {/* Print Layout Disclaimer */}
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-emerald-500" />
            <span>
              {language === "English" 
                ? "This table will be printed on A4 pages containing the summative progress grade for all subjects." 
                : "हा तक्ता सर्व विषयांच्या संकलित प्रगती श्रेणीसह A4 पानांवर प्रिंट केला जाईल."}
            </span>
          </div>
        </div>

        {/* Bottom Button */}
        <button
          onClick={handlePrintCompiledRegister}
          disabled={isCompiling}
          className="w-full py-4 bg-[#98d9a4] hover:bg-[#8ad499] active:scale-[0.99] text-[#0d1310] font-black text-sm rounded-2xl tracking-wide transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer duration-200 disabled:opacity-50"
        >
          {isCompiling ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>
                {language === "English" ? "Compiling progress sheets..." : "प्रगती पत्रके संकलित करत आहे..."}
              </span>
            </>
          ) : (
            <span>{language === "English" ? "Generate / Print" : "तयार करा"}</span>
          )}
        </button>

      </div>
    </div>
  );
};

export default ProgressSheet;
