import React, { useState, useEffect } from "react";
import { 
  ChevronLeft, 
  ArrowLeft,
  Check, 
  FileText, 
  AlertTriangle,
  Loader2
} from "lucide-react";
import AlertMessage from "../../AlertMessage";
import { fetchFirestoreMarks, matchAndMergeMarks } from "./firestoreMarksHelper";

function DailyRegister({ initialClass, initialYear, onBack }) {
  const [academicYear, setAcademicYear] = useState(initialYear || localStorage.getItem("cce_academic_year") || "");
  const [classValue, setClassValue] = useState(initialClass || localStorage.getItem("cce_selected_class") || "");
  const [activeSemester, setActiveSemester] = useState("first"); // "first" or "second"
  const [pageLayout, setPageLayout] = useState("single"); // "single" or "double"
  const [includeAttendance, setIncludeAttendance] = useState(false);

  const [studentData, setStudentData] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [allNondiData, setAllNondiData] = useState({ firstSemester: {}, secondSemester: {} });
  const [schoolName, setSchoolName] = useState("");
  const [schoolLogo, setSchoolLogo] = useState("");
  const [schoolData, setSchoolData] = useState(null);
  const [subjectSequence, setSubjectSequence] = useState([]);
  const [subjects, setSubjects] = useState({});
  const [language, setLanguage] = useState(localStorage.getItem("language") || "English");

  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);

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
    fetchSchoolName();
    fetchStudentData();
  }, [udiseNumber]);

  useEffect(() => {
    if (academicYear && classValue) {
      fetchSubjectSequence();
    }
  }, [academicYear, classValue]);

  useEffect(() => {
    if (classValue && studentData.length > 0) {
      const filtered = studentData.filter((student) => student.currentClass === classValue);
      setSelectedStudents(filtered);
    }
  }, [classValue, studentData]);

  useEffect(() => {
    if (classValue && academicYear && selectedStudents.length > 0) {
      fetchMarksAndNondiForAllStudents();
    }
  }, [classValue, academicYear, selectedStudents, activeSemester]);

  const fetchSchoolName = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/schoolData.json`
      );
      if (response.ok) {
        const data = await response.json();
        setSchoolData(data);
        setSchoolName(data.schoolName || "N/A");
        setSchoolLogo(data.schoolLogo || "");
      }
    } catch (error) {
      console.error("Error fetching school name:", error);
    }
  };

  const fetchStudentData = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData.json`
      );
      if (response.ok) {
        const data = await response.json();
        const filteredData = Object.keys(data)
          .filter((key) => data[key] !== null)
          .map((key) => ({ srNo: key, ...data[key] }));

        const activeStudents = filteredData.filter((student) => student.isActive !== false);
        setStudentData(activeStudents);
      }
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
        if (data) {
          const orderedSubjects = Object.keys(data)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map((key) => data[key]);
          setSubjectSequence(orderedSubjects);

          const formattedSubjects = orderedSubjects.reduce((acc, sub) => {
            acc[sub] = true;
            return acc;
          }, {});
          setSubjects(formattedSubjects);
        }
      }
    } catch (error) {
      console.error("Error fetching subject sequence:", error);
    }
  };

  const fetchMarksAndNondiForAllStudents = async () => {
    try {
      const examName = activeSemester === "first" ? "First Semester" : "Second Semester";
      
      const marksDataPromises = selectedStudents.map(async (student) => {
        const [marksRes, nondiFirstRes, nondiSecondRes] = await Promise.all([
          fetch(
            `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${student.srNo}/result/${academicYear}/${examName}.json`
          ),
          fetch(
            `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${student.srNo}/result/${academicYear}/First Semester/nondi.json`
          ),
          fetch(
            `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${student.srNo}/result/${academicYear}/Second Semester/nondi.json`
          ),
        ]);

        const marks = marksRes.ok ? await marksRes.json() : {};
        const nondiFirst = nondiFirstRes.ok ? await nondiFirstRes.json() : {};
        const nondiSecond = nondiSecondRes.ok ? await nondiSecondRes.json() : {};

        return {
          srNo: student.srNo,
          marks: marks || {},
          nondiFirst: nondiFirst || {},
          nondiSecond: nondiSecond || {},
        };
      });

      const results = await Promise.all(marksDataPromises);
      const tempMarks = {};
      const tempNondi = { firstSemester: {}, secondSemester: {} };

      results.forEach((item) => {
        tempMarks[item.srNo] = item.marks;
        tempNondi.firstSemester[item.srNo] = item.nondiFirst;
        tempNondi.secondSemester[item.srNo] = item.nondiSecond;
      });

      // Fetch from Firestore descriptive_remarks
      try {
        const { db } = await import("@/lib/firebase");
        const { collection, query, where, getDocs } = await import("firebase/firestore");
        const remarksQuery = query(
          collection(db, "descriptive_remarks"),
          where("class", "==", classValue),
          where("academicYear", "==", academicYear),
          where("term", "==", activeSemester)
        );
        const remarksSnap = await getDocs(remarksQuery);
        remarksSnap.forEach(docSnap => {
          const rData = docSnap.data();
          if (rData.studentId) {
            const semKey = activeSemester === "first" ? "firstSemester" : "secondSemester";
            // Merge Firestore descriptive remarks fields into tempNondi
            tempNondi[semKey][rData.studentId] = {
              ...tempNondi[semKey][rData.studentId],
              ...rData,
            };
          }
        });
      } catch (fsRemarksErr) {
        console.warn("Firestore descriptive remarks fetch failed:", fsRemarksErr);
      }

      // Also fetch from Firestore marks collection and merge
      let finalMarks = tempMarks;
      try {
        const term = activeSemester; // "first" or "second"
        const firestoreMarks = await fetchFirestoreMarks(classValue, academicYear, term);
        if (firestoreMarks.length > 0) {
          const subjectList = subjectSequence.length > 0 ? subjectSequence : Object.keys(subjects);
          const merged = matchAndMergeMarks(selectedStudents, tempMarks, firestoreMarks, subjectList);
          finalMarks = merged;
          setMarksData(merged);
        } else {
          setMarksData(tempMarks);
        }
      } catch (fsError) {
        console.warn("Firestore marks fetch failed, using RTDB data:", fsError);
        setMarksData(tempMarks);
      }

      setAllNondiData(tempNondi);

      // Auto-trigger printing once data loading is complete
      setTimeout(() => {
        handlePrintCompiledRegister(selectedStudents, finalMarks, tempNondi);
      }, 500);
    } catch (error) {
      console.error("Error loading marks & remarks data:", error);
    }
  };

  const calculateGrade = (total) => {
    if (total >= 91) return "A1";
    if (total >= 81) return "A2";
    if (total >= 71) return "B1";
    if (total >= 61) return "B2";
    if (total >= 51) return "C1";
    if (total >= 41) return "C2";
    if (total >= 33) return "D1";
    if (total >= 21) return "D2";
    return "Fail";
  };

  const handlePrintCompiledRegister = (
    overrideStudents = selectedStudents,
    overrideMarks = marksData,
    overrideNondi = allNondiData
  ) => {
    const selectedStudents = overrideStudents;
    const marksData = overrideMarks;
    const allNondiData = overrideNondi;

    if (selectedStudents.length === 0) {
      setAlertMessage("विद्यार्थी यादी उपलब्ध नाही.");
      return;
    }

    setIsCompiling(true);

    const examName = activeSemester === "first" ? "First Semester" : "Second Semester";
    const termLabel = activeSemester === "first" ? "प्रथम सत्र" : "द्वितीय सत्र";
    const subjectList = subjectSequence.length > 0 ? subjectSequence : Object.keys(subjects);

    // Dynamic Marathi grade mapping
    const getMarathiGrade = (total) => {
      if (total >= 91) return "अ-1";
      if (total >= 81) return "अ-2";
      if (total >= 71) return "ब-1";
      if (total >= 61) return "ब-2";
      if (total >= 51) return "क-1";
      if (total >= 41) return "क-2";
      if (total >= 33) return "ड";
      if (total >= 21) return "इ-1";
      return "इ-2";
    };

    const isPrimarySubject = (subName) => {
      if (!subName) return false;
      const name = subName.toLowerCase().trim();
      return name.includes("मराठी") || name.includes("marathi") || name.includes("इंग्रजी") || name.includes("english") || name.includes("गणित") || name.includes("math");
    };

    const getCasteCategoryMarathi = (casteName) => {
      if (!casteName) return "बिगर मागास";
      const name = casteName.toLowerCase().trim();
      if (name.includes("sc") || name.includes("अनुसूचित जाती") || name.includes("मातंग") || name.includes("चर्मकार") || name.includes("बौद्ध") || name.includes("महार")) return "अनुसूचित जाती";
      if (name.includes("st") || name.includes("अनुसूचित जमाती") || name.includes("भिल्ल") || name.includes("कोळी")) return "अनुसूचित जमाती";
      if (name.includes("vj") || name.includes("nt") || name.includes("भटके") || name.includes("विमुक्त") || name.includes("धनगर") || name.includes("वंजारी")) return "वि.जा.भ. जाती";
      if (name.includes("obc") || name.includes("इतर मागास") || name.includes("माळी") || name.includes("तेली") || name.includes("कुणबी") || name.includes("sbc") || name.includes("विशेष मागास")) return "इतर मागास";
      return "बिगर मागास"; // Default to Open
    };

    const schoolNameFallback = schoolName && schoolName !== "N/A" && schoolName.trim() !== ""
      ? schoolName
      : "जिल्हा परिषद शाळा धोंडेवाडी(पेड)ता.तासगाव";
  
    const teacherNameVal = cceSettings?.teacherName || schoolData?.teacherName || schoolData?.classTeacher || "";
    const hmNameVal = schoolData?.headmasterName || schoolData?.hmName || schoolData?.headmaster || cceSettings?.headmasterName || cceSettings?.principalName || "";

    const teacherNameFallback = teacherNameVal && teacherNameVal.trim() !== ""
      ? teacherNameVal
      : (schoolNameFallback.includes("धोंडेवाडी") ? "श्री. विशाल रंजिना विष्णू खाडे" : "");

    const hmNameFallback = hmNameVal && hmNameVal.trim() !== ""
      ? hmNameVal
      : (schoolNameFallback.includes("धोंडेवाडी") ? "बाळासाहेब रामकिशन कंद्रे" : "");

    const getMark = (obj, key) => {
      const val = obj[key];
      if (val === undefined || val === null || val === "") return "";
      return val;
    };

    // Sort students by roll number
    const sortedStudents = [...selectedStudents].sort((a, b) => {
      const rollA = parseInt(a.rollNo) || 999;
      const rollB = parseInt(b.rollNo) || 999;
      return rollA - rollB;
    });

    const printWindow = window.open("", "", "height=700,width=1000");
    if (!printWindow) {
      setAlertMessage("पॉपअप ब्लॉकर सक्रिय आहे, कृपया परवानगी द्या.");
      setIsCompiling(false);
      return;
    }

    let htmlContent = `
      <html>
        <head>
          <title>CCE Evaluation Register - ${classValue}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700;900&family=Poppins:wght@400;700;900&display=swap');
            
            @page {
              size: A4 landscape;
              margin: 4mm 6mm;
            }
            body {
              font-family: 'Poppins', 'Noto Sans Devanagari', sans-serif;
              margin: 0;
              padding: 0;
              color: #121212;
              background-color: #fff;
            }
            .page {
              page-break-after: always;
              position: relative;
              width: 284mm;
              height: 198mm;
              box-sizing: border-box;
              border: 1.5px solid #1e3a2f;
              padding: 10px 14px;
              margin: 0 auto;
              background-color: #fafdfb;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            /* Cover Page styling */
            .cover-page {
              height: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              border: 4px double #1e3a2f;
              padding: 30px;
              box-sizing: border-box;
              text-align: center;
              background-color: #fafdfb;
            }
            .cover-logo {
              max-height: 90px;
              margin-bottom: 20px;
            }
            .cover-title {
              font-size: 26px;
              font-weight: 900;
              color: #1b4d3e;
              margin: 0 0 10px 0;
            }
            .cover-subtitle {
              font-size: 18px;
              font-weight: 700;
              color: #4a7c59;
              margin: 0 0 40px 0;
            }
            .cover-details {
              font-size: 14px;
              margin-bottom: 8px;
              color: #333;
            }
            .cover-details strong {
              color: #1b4d3e;
            }
            .cover-footer {
              margin-top: 50px;
              display: flex;
              width: 100%;
              justify-content: space-around;
              font-weight: bold;
              font-size: 13px;
              color: #333;
            }

            /* Header component */
            .doc-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #1e3a2f;
              padding-bottom: 5px;
              margin-bottom: 8px;
            }
            .doc-header h2 {
              font-size: 14px;
              margin: 0;
              color: #1b4d3e;
              font-weight: bold;
            }
            .doc-header p {
              margin: 1px 0 0 0;
              font-size: 9px;
              color: #666;
            }

            /* Tables general styling */
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 8px;
              font-size: 8px;
            }
            th, td {
              border: 1px solid #1e3a2f !important;
              padding: 3.5px;
              text-align: center;
              vertical-align: middle;
            }
            thead th {
              background-color: #e8f5e9;
              font-weight: bold;
              color: #1b4d3e;
            }
            .left-align {
              text-align: left;
              padding-left: 6px;
            }

            /* Student-wise layout */
            .student-meta {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 6px;
              background-color: #f4fcf7;
              padding: 6px;
              border: 1px solid #1e3a2f;
              border-radius: 4px;
              margin-bottom: 8px;
              font-size: 9px;
            }
            .meta-item {
              font-size: 9px;
            }
            .meta-item strong {
              color: #1b4d3e;
            }

            /* Legends at bottom of student marks page */
            .legend-container {
              display: flex;
              justify-content: space-between;
              font-size: 7.5px;
              border: 1px solid #c8e6c9;
              background-color: #fcfdfe;
              padding: 5px;
              margin-top: 5px;
            }
            .legend-col {
              width: 48%;
            }
            .legend-title {
              font-weight: bold;
              color: #1b4d3e;
              margin-bottom: 2px;
              border-bottom: 1px solid #e8f5e9;
            }
            .legend-list {
              display: flex;
              flex-wrap: wrap;
              gap: 4px 10px;
            }

            /* Signatures line */
            .sig-row {
              margin-top: auto;
              padding-top: 10px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              font-weight: bold;
              font-size: 9px;
              color: #1b4d3e;
            }
            .sig-box {
              text-align: center;
              width: 220px;
            }
            .sig-img {
              max-height: 35px;
              display: block;
              margin: 0 auto 2px auto;
            }
            .sig-space {
              height: 37px;
            }
            
            .rotate-header {
              writing-mode: vertical-rl;
              transform: rotate(180deg);
              white-space: nowrap;
              padding: 6px 2px !important;
              height: 65px;
            }

            /* Larger Tables styling */
            .caste-table {
              font-size: 6.5px;
            }
            .caste-table th, .caste-table td {
              padding: 1.5px 2px;
            }

            .result-table {
              font-size: 7.5px;
            }
            .result-table th, .result-table td {
              padding: 2.5px;
            }
          </style>
        </head>
        <body>
    `;

    // ────────────────────────────────────────────────────────
    // PAGE 1: COVER PAGE
    // ────────────────────────────────────────────────────────
    htmlContent += `
      <div class="page">
        <div class="cover-page">
          ${schoolLogo ? `<img class="cover-logo" src="${schoolLogo}" alt="Logo">` : ""}
          <h1 class="cover-title">${schoolNameFallback}</h1>
          <p style="font-size: 13px; font-weight: bold; margin: -5px 0 25px 0; color: #555;">UDISE: ${udiseNumber || "27350800701"}</p>
          <h2 class="cover-subtitle">सातत्यपूर्ण सर्वंकष मूल्यांकन नोंदवही</h2>
          <div style="margin-top: 35px; padding: 22px; background-color: #f4fcf7; border-radius: 8px; border: 1px dashed #1e3a2f; width: 60%; margin-left: auto; margin-right: auto; text-align: left;">
            <p class="cover-details"><strong>शैक्षणिक वर्ष (Academic Year):</strong> ${academicYear}</p>
            <p class="cover-details"><strong>इयत्ता (Class):</strong> ${classValue}</p>
            <p class="cover-details"><strong>वर्ग शिक्षक (Class Teacher):</strong> ${teacherNameFallback}</p>
          </div>
          <div style="margin-top: 45px; font-size: 14px; font-weight: bold; color: #1b4d3e;">✦ ज्ञान, संस्कार आणि प्रगतीसाठी ✦</div>
          <div class="cover-footer">
            <div>वर्गशिक्षक</div>
            <div>मुख्याध्यापक</div>
          </div>
        </div>
      </div>
    `;

    // ────────────────────────────────────────────────────────
    // PAGE 2: INDEX PAGE
    // ────────────────────────────────────────────────────────
    htmlContent += `
      <div class="page">
        <div class="doc-header">
          <div>
            <h2>${schoolNameFallback}</h2>
            <p>अनुक्रमणिका &bull; सत्र: ${termLabel} &bull; शैक्षणिक वर्ष: ${academicYear}</p>
          </div>
          <div>
            <span style="font-weight: bold; color: #1b4d3e;">इयत्ता: ${classValue}</span>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; flex: 1; justify-content: center; max-width: 600px; margin: 0 auto; width: 100%;">
          <h3 style="text-align: center; border-bottom: 2px solid #1b4d3e; padding-bottom: 5px; margin-bottom: 20px; color: #1b4d3e; font-size: 15px;">अनुक्रमणिका (Index)</h3>
          <table style="font-size: 10px;">
            <thead>
              <tr>
                <th style="width: 15%; padding: 6px;">अ. क्र.</th>
                <th style="width: 65%; padding: 6px; text-align: left; padding-left: 15px;">विद्यार्थ्याचे नाव</th>
                <th style="width: 20%; padding: 6px;">पान क्रमांक</th>
              </tr>
            </thead>
            <tbody>
              ${sortedStudents.map((student, index) => {
                const startPage = 3 + (index * 2);
                const endPage = startPage + 1;
                return `
                  <tr>
                    <td style="padding: 6px;">${index + 1}</td>
                    <td class="left-align" style="font-weight: bold; padding: 6px; padding-left: 15px;">${student.stdName || ""} ${student.stdFather || ""} ${student.stdSurname || ""}</td>
                    <td style="padding: 6px;">${startPage} - ${endPage}</td>
                  </tr>
                `;
              }).join("")}
              <tr>
                <td style="padding: 6px;">-</td>
                <td class="left-align" style="font-weight: bold; padding: 6px; padding-left: 15px;">श्रेणी निहाय संकलन तक्ता (वर्गस्तर)</td>
                <td style="padding: 6px;">${3 + (sortedStudents.length * 2)}</td>
              </tr>
              <tr>
                <td style="padding: 6px;">-</td>
                <td class="left-align" style="font-weight: bold; padding: 6px; padding-left: 15px;">जातनिहाय व विषयनिहाय एकूण तेरीज पत्रक</td>
                <td style="padding: 6px;">${4 + (sortedStudents.length * 2)}</td>
              </tr>
              <tr>
                <td style="padding: 6px;">-</td>
                <td class="left-align" style="font-weight: bold; padding: 6px; padding-left: 15px;">निकाल पत्रक (Result Sheet)</td>
                <td style="padding: 6px;">${5 + (sortedStudents.length * 2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="sig-row">
          <div class="sig-box">
            ${cceSettings?.signatureUrl ? `<img class="sig-img" src="${cceSettings.signatureUrl}" alt="Sign">` : `<div class="sig-space"></div>`}
            <div>वर्गशिक्षक स्वाक्षरी</div>
            <div style="font-size: 8px; color: #555; margin-top: 2px;">${teacherNameFallback}</div>
          </div>
          <div class="sig-box">
            ${cceSettings?.principalSignature ? `<img class="sig-img" src="${cceSettings.principalSignature}" alt="Sign">` : `<div class="sig-space"></div>`}
            <div>मुख्याध्यापक स्वाक्षरी</div>
            <div style="font-size: 8px; color: #555; margin-top: 2px;">${hmNameFallback}</div>
          </div>
        </div>
      </div>
    `;

    // ────────────────────────────────────────────────────────
    // STUDENT PAGES (Marks & Remarks - 2 Pages per Student)
    // ────────────────────────────────────────────────────────
    sortedStudents.forEach((student) => {
      const studentRemarks = allNondiData[activeSemester === "first" ? "firstSemester" : "secondSemester"]?.[student.srNo] || {};
      const results = marksData[student.srNo] || {};

      // Student page 1: Marks Table
      htmlContent += `
        <div class="page">
          <div class="doc-header">
            <div>
              <h2>${schoolNameFallback}</h2>
              <p>सातत्यपूर्ण सर्वंकष मूल्यांकन &bull; सत्र: ${termLabel} &bull; शैक्षणिक वर्ष: ${academicYear}</p>
            </div>
            <div>
              <span style="font-weight: bold; color: #1b4d3e;">इयत्ता: ${classValue} &bull; तुकडी: ${student.division || "-"} &bull; हजेरी क्र: ${student.rollNo || "-"}</span>
            </div>
          </div>

          <div class="student-meta">
            <div class="meta-item"><strong>विद्यार्थ्याचे नाव:</strong> ${student.stdName || ""} ${student.stdFather || ""} ${student.stdSurname || ""}</div>
            <div class="meta-item"><strong>लिंग:</strong> ${student.gender === "Male" ? "मुला" : student.gender === "Female" ? "मुलगी" : "-"}</div>
            <div class="meta-item"><strong>जात:</strong> ${student.caste || "-"}</div>
            <div class="meta-item"><strong>जन्मतारीख:</strong> ${student.dob || "-"}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th rowspan="2" style="width: 18%;">विषय (Subject)</th>
                <th rowspan="2" style="width: 7%;">गुण</th>
                <th colspan="8">आकारिक मूल्यमापन (अ) (Formative Assessment)</th>
                <th colspan="4">संकलित मूल्यमापन (ब) (Summative Assessment)</th>
                <th rowspan="2" style="width: 7%;">एकूण (अ+ब) (100)</th>
                <th rowspan="2" style="width: 7%;">श्रेणी (Grade)</th>
              </tr>
              <tr>
                <th style="width: 5.5%;">१</th>
                <th style="width: 5.5%;">२</th>
                <th style="width: 5.5%;">३</th>
                <th style="width: 5.5%;">४</th>
                <th style="width: 5.5%;">५</th>
                <th style="width: 5.5%;">६</th>
                <th style="width: 5.5%;">७</th>
                <th style="width: 8%; background-color: #e8f5e9;">एकूण</th>
                <th style="width: 5.5%;">१</th>
                <th style="width: 5.5%;">२</th>
                <th style="width: 5.5%;">३</th>
                <th style="width: 8%; background-color: #e8f5e9;">एकूण</th>
              </tr>
            </thead>
            <tbody>
              ${subjectList.map((sub) => {
                const isPrimary = isPrimarySubject(sub);
                const subData = results[sub] || {};
                const akarik = subData.Akarik || {};
                const sanklik = subData.Sanklik || {};
                
                const a1 = getMark(akarik, "Oral Work") || getMark(akarik, "OralWork") || "";
                const a2 = getMark(akarik, "Demonstration") || "";
                const a3 = getMark(akarik, "Activity") || "";
                const a4 = getMark(akarik, "Project") || "";
                const a5 = getMark(akarik, "Test") || "";
                const a6 = getMark(akarik, "Homework") || "";
                const a7 = getMark(akarik, "Others") || getMark(akarik, "Daily Monitoring") || "";
                
                const b1 = getMark(sanklik, "Orally") || getMark(sanklik, "Oral") || "";
                const b2 = getMark(sanklik, "Demonstration") || "";
                const b3 = getMark(sanklik, "Writing") || "";

                const akarikTotal = akarik.Total || 0;
                const sanklikTotal = sanklik.Total || 0;
                const grandTotal = akarikTotal + sanklikTotal;
                const subjectGrade = getMarathiGrade(grandTotal);

                if (isPrimary) {
                  return `
                    <tr>
                      <td rowspan="2" class="left-align" style="font-weight: bold;">${sub}</td>
                      <td style="font-weight: bold; background-color: #f4fcf7;">पैकी</td>
                      <td>20</td>
                      <td>-</td>
                      <td>15</td>
                      <td>-</td>
                      <td>20</td>
                      <td>15</td>
                      <td>-</td>
                      <td style="font-weight: bold; background-color: #e8f5e9;">70</td>
                      <td>10</td>
                      <td>-</td>
                      <td>20</td>
                      <td style="font-weight: bold; background-color: #e8f5e9;">30</td>
                      <td rowspan="2" style="font-weight: bold; background-color: #e8f5e9;">100</td>
                      <td rowspan="2" style="font-weight: bold; background-color: #e8f5e9; font-size: 8.5px; color: #1b4d3e;">${subjectGrade}</td>
                    </tr>
                    <tr>
                      <td style="font-weight: bold; background-color: #fcfefe;">प्राप्त</td>
                      <td>${a1 !== "" ? a1 : "-"}</td>
                      <td>-</td>
                      <td>${a3 !== "" ? a3 : "-"}</td>
                      <td>-</td>
                      <td>${a5 !== "" ? a5 : "-"}</td>
                      <td>${a6 !== "" ? a6 : "-"}</td>
                      <td>-</td>
                      <td style="font-weight: bold; background-color: #e8f5e9;">${akarikTotal || "0"}</td>
                      <td>${b1 !== "" ? b1 : "-"}</td>
                      <td>-</td>
                      <td>${b3 !== "" ? b3 : "-"}</td>
                      <td style="font-weight: bold; background-color: #e8f5e9;">${sanklikTotal || "0"}</td>
                    </tr>
                  `;
                } else {
                  return `
                    <tr>
                      <td rowspan="2" class="left-align" style="font-weight: bold;">${sub}</td>
                      <td style="font-weight: bold; background-color: #f4fcf7;">पैकी</td>
                      <td>20</td>
                      <td>50</td>
                      <td>20</td>
                      <td>10</td>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                      <td style="font-weight: bold; background-color: #e8f5e9;">100</td>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                      <td style="font-weight: bold; background-color: #e8f5e9;">-</td>
                      <td rowspan="2" style="font-weight: bold; background-color: #e8f5e9;">100</td>
                      <td rowspan="2" style="font-weight: bold; background-color: #e8f5e9; font-size: 8.5px; color: #1b4d3e;">${subjectGrade}</td>
                    </tr>
                    <tr>
                      <td style="font-weight: bold; background-color: #fcfefe;">प्राप्त</td>
                      <td>${a1 !== "" ? a1 : "-"}</td>
                      <td>${a2 !== "" ? a2 : "-"}</td>
                      <td>${a3 !== "" ? a3 : "-"}</td>
                      <td>${a4 !== "" ? a4 : "-"}</td>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                      <td style="font-weight: bold; background-color: #e8f5e9;">${akarikTotal || "0"}</td>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                      <td style="font-weight: bold; background-color: #e8f5e9;">-</td>
                    </tr>
                  `;
                }
              }).join("")}
            </tbody>
          </table>

          <div class="legend-container">
            <div class="legend-col">
              <div class="legend-title">(अ) आकारिक मूल्यमापन साधन व तंत्रे:</div>
              <div class="legend-list">
                <div><strong>१:</strong> तोंडीकाम</div>
                <div><strong>२:</strong> प्रात्यक्षिक/प्रयोग</div>
                <div><strong>३:</strong> उपक्रम/कृती</div>
                <div><strong>४:</strong> प्रकल्प</div>
                <div><strong>५:</strong> चाचणी(लेखी)</div>
                <div><strong>६:</strong> स्वाध्याय/वर्गकार्य</div>
                <div><strong>७:</strong> इतर</div>
              </div>
            </div>
            <div class="legend-col" style="border-left: 1px solid #c8e6c9; padding-left: 15px;">
              <div class="legend-title">(ब) संकलित मूल्यमापन साधने:</div>
              <div class="legend-list">
                <div><strong>१:</strong> तोंडी</div>
                <div><strong>२:</strong> प्रात्यक्षिक</div>
                <div><strong>३:</strong> लेखी</div>
              </div>
            </div>
          </div>

          <div class="sig-row">
            <div class="sig-box">
              ${cceSettings?.signatureUrl ? `<img class="sig-img" src="${cceSettings.signatureUrl}" alt="Sign">` : `<div class="sig-space"></div>`}
              <div>वर्गशिक्षक स्वाक्षरी</div>
              <div style="font-size: 8px; color: #555; margin-top: 2px;">${teacherNameFallback}</div>
            </div>
            <div class="sig-box">
              ${cceSettings?.principalSignature ? `<img class="sig-img" src="${cceSettings.principalSignature}" alt="Sign">` : `<div class="sig-space"></div>`}
              <div>मुख्याध्यापक स्वाक्षरी</div>
              <div style="font-size: 8px; color: #555; margin-top: 2px;">${hmNameFallback}</div>
            </div>
          </div>
        </div>
      `;

      // Student page 2: Remarks Table
      htmlContent += `
        <div class="page">
          <div class="doc-header">
            <div>
              <h2>${schoolNameFallback}</h2>
              <p>वर्णनात्मक नोंदी &bull; सत्र: ${termLabel} &bull; शैक्षणिक वर्ष: ${academicYear}</p>
            </div>
            <div>
              <span style="font-weight: bold; color: #1b4d3e;">इयत्ता: ${classValue} &bull; तुकडी: ${student.division || "-"} &bull; हजेरी क्र: ${student.rollNo || "-"}</span>
            </div>
          </div>

          <div class="student-meta" style="margin-bottom: 10px;">
            <div class="meta-item"><strong>विद्यार्थ्याचे नाव:</strong> ${student.stdName || ""} ${student.stdFather || ""} ${student.stdSurname || ""}</div>
            <div class="meta-item"><strong>लिंग:</strong> ${student.gender === "Male" ? "मुला" : student.gender === "Female" ? "मुलगी" : "-"}</div>
            <div class="meta-item"><strong>जात:</strong> ${student.caste || "-"}</div>
            <div class="meta-item"><strong>जन्मतारीख:</strong> ${student.dob || "-"}</div>
          </div>

          <table style="font-size: 9px; margin-bottom: auto; border: 1.5px solid #1e3a2f;">
            <thead>
              <tr>
                <th style="width: 10%; padding: 6px;">अ. क्र.</th>
                <th style="width: 25%; padding: 6px; text-align: left; padding-left: 10px;">विषय / क्षेत्र (Subject / Area)</th>
                <th style="width: 65%; padding: 6px; text-align: left; padding-left: 15px;">वर्णनात्मक नोंदी (Descriptive Remarks)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 5px;">१</td>
                <td class="left-align" style="font-weight: bold; padding: 5px;">प्रथम भाषा: मराठी</td>
                <td class="left-align" style="padding: 5px; padding-left: 15px;">${studentRemarks.subjectRemarks?.marathi?.selected?.join(", ") || studentRemarks.subjectRemarks?.marathi?.custom || "-"}</td>
              </tr>
              <tr>
                <td style="padding: 5px;">२</td>
                <td class="left-align" style="font-weight: bold; padding: 5px;">तृतीय भाषा: इंग्रजी</td>
                <td class="left-align" style="padding: 5px; padding-left: 15px;">${studentRemarks.subjectRemarks?.english?.selected?.join(", ") || studentRemarks.subjectRemarks?.english?.custom || "-"}</td>
              </tr>
              <tr>
                <td style="padding: 5px;">३</td>
                <td class="left-align" style="font-weight: bold; padding: 5px;">गणित</td>
                <td class="left-align" style="padding: 5px; padding-left: 15px;">${studentRemarks.subjectRemarks?.math?.selected?.join(", ") || studentRemarks.subjectRemarks?.math?.custom || "-"}</td>
              </tr>
              <tr>
                <td style="padding: 5px;">४</td>
                <td class="left-align" style="font-weight: bold; padding: 5px;">कला</td>
                <td class="left-align" style="padding: 5px; padding-left: 15px;">${studentRemarks.subjectRemarks?.art?.selected?.join(", ") || studentRemarks.subjectRemarks?.art?.custom || "-"}</td>
              </tr>
              <tr>
                <td style="padding: 5px;">५</td>
                <td class="left-align" style="font-weight: bold; padding: 5px;">कार्यानुभव</td>
                <td class="left-align" style="padding: 5px; padding-left: 15px;">${studentRemarks.subjectRemarks?.workExperience?.selected?.join(", ") || studentRemarks.subjectRemarks?.workExperience?.custom || "-"}</td>
              </tr>
              <tr>
                <td style="padding: 5px;">६</td>
                <td class="left-align" style="font-weight: bold; padding: 5px;">शारीरिक शिक्षण</td>
                <td class="left-align" style="padding: 5px; padding-left: 15px;">${studentRemarks.subjectRemarks?.physicalEducation?.selected?.join(", ") || studentRemarks.subjectRemarks?.physicalEducation?.custom || "-"}</td>
              </tr>
              <tr>
                <td style="padding: 5px;">७</td>
                <td class="left-align" style="font-weight: bold; padding: 5px; color: #1b4d3e;">विशेष प्रगती (Special Progress)</td>
                <td class="left-align" style="padding: 5px; padding-left: 15px; font-weight: bold; color: #1b4d3e;">${studentRemarks.subjectRemarks?.specialProgress?.selected?.join(", ") || studentRemarks.subjectRemarks?.specialProgress?.custom || studentRemarks.specialProgress || studentRemarks.nondi?.specialEntries || "-"}</td>
              </tr>
              <tr>
                <td style="padding: 5px;">८</td>
                <td class="left-align" style="font-weight: bold; padding: 5px; color: #b71c1c;">सुधारणा आवश्यक (Needs Imp.)</td>
                <td class="left-align" style="padding: 5px; padding-left: 15px; color: #b71c1c;">${studentRemarks.subjectRemarks?.improvement?.selected?.join(", ") || studentRemarks.subjectRemarks?.improvement?.custom || studentRemarks.improvementAreas || studentRemarks.nondi?.necessaryCorrections || "-"}</td>
              </tr>
              <tr>
                <td style="padding: 5px;">९</td>
                <td class="left-align" style="font-weight: bold; padding: 5px;">आवड / छंद (Hobbies)</td>
                <td class="left-align" style="padding: 5px; padding-left: 15px;">${studentRemarks.subjectRemarks?.hobbies?.selected?.join(", ") || studentRemarks.subjectRemarks?.hobbies?.custom || studentRemarks.interestsHobbies || studentRemarks.nondi?.interestsAndHobbies || "-"}</td>
              </tr>
              <tr>
                <td style="padding: 5px;">१०</td>
                <td class="left-align" style="font-weight: bold; padding: 5px;">व्यक्तिमत्व गुणविशेष (Personality)</td>
                <td class="left-align" style="padding: 5px; padding-left: 15px;">${studentRemarks.subjectRemarks?.personality?.selected?.join(", ") || studentRemarks.subjectRemarks?.personality?.custom || "-"}</td>
              </tr>
            </tbody>
          </table>

          <div class="sig-row">
            <div class="sig-box">
              ${cceSettings?.signatureUrl ? `<img class="sig-img" src="${cceSettings.signatureUrl}" alt="Sign">` : `<div class="sig-space"></div>`}
              <div>वर्गशिक्षक स्वाक्षरी</div>
              <div style="font-size: 8px; color: #555; margin-top: 2px;">${teacherNameFallback}</div>
            </div>
            <div class="sig-box">
              ${cceSettings?.principalSignature ? `<img class="sig-img" src="${cceSettings.principalSignature}" alt="Sign">` : `<div class="sig-space"></div>`}
              <div>मुख्याध्यापक स्वाक्षरी</div>
              <div style="font-size: 8px; color: #555; margin-top: 2px;">${hmNameFallback}</div>
            </div>
          </div>
        </div>
      `;
    });

    // ────────────────────────────────────────────────────────
    // PAGE 9: GRADE-WISE COMPILATION PAGE
    // ────────────────────────────────────────────────────────
    const marathiGrades = ["अ-1", "अ-2", "ब-1", "ब-2", "क-1", "क-2", "ड", "इ-1", "इ-2"];
    
    htmlContent += `
      <div class="page">
        <div class="doc-header">
          <div>
            <h2>${schoolNameFallback}</h2>
            <p>श्रेणी निहाय संकलन तक्ता (वर्गस्तर) &bull; सत्र: ${termLabel} &bull; शैक्षणिक वर्ष: ${academicYear}</p>
          </div>
          <div>
            <span style="font-weight: bold; color: #1b4d3e;">इयत्ता: ${classValue}</span>
          </div>
        </div>

        <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-around; gap: 8px;">
          <!-- Table 1 (Total Grade Counts) -->
          <div>
            <h4 style="margin: 0 0 4px 0; font-size: 9px; color: #1b4d3e;">तक्ता १: श्रेणी निहाय एकूण संकलन (Total Summary)</h4>
            <table style="font-size: 7.5px; margin-bottom: 0;">
              <thead>
                <tr>
                  <th style="width: 5%;">अ. क्र.</th>
                  <th style="width: 20%; text-align: left; padding-left: 6px;">विषय</th>
                  <th style="width: 8%;">नोंदणीकृत संख्या</th>
                  <th style="width: 8%;">उपस्थिती</th>
                  ${marathiGrades.map(g => `<th>${g}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${subjectList.map((sub, index) => {
                  const counts = {};
                  marathiGrades.forEach(g => counts[g] = 0);
                  selectedStudents.forEach(student => {
                    const results = marksData[student.srNo] || {};
                    const subData = results[sub] || {};
                    const total = (subData.Akarik?.Total || 0) + (subData.Sanklik?.Total || 0);
                    const g = getMarathiGrade(total);
                    if (counts[g] !== undefined) counts[g]++;
                  });
                  return `
                    <tr>
                      <td>${index + 1}</td>
                      <td class="left-align" style="font-weight: bold;">${sub}</td>
                      <td>${selectedStudents.length}</td>
                      <td>${selectedStudents.length}</td>
                      ${marathiGrades.map(g => `<td style="font-weight: bold;">${counts[g] || "0"}</td>`).join("")}
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>

          <!-- Table 2 (Boys / Girls Split) -->
          <div>
            <h4 style="margin: 0 0 4px 0; font-size: 9px; color: #1b4d3e;">तक्ता २: मुले व मुली श्रेणी निहाय स्वतंत्र संकलन (Gender-wise Summary)</h4>
            <table style="font-size: 7px; margin-bottom: 0;">
              <thead>
                <tr>
                  <th rowspan="2" style="width: 4%;">अ. क्र.</th>
                  <th rowspan="2" style="width: 18%; text-align: left; padding-left: 6px;">विषय</th>
                  <th rowspan="2" style="width: 10%;">नोंदणीकृत संख्या</th>
                  <th rowspan="2" style="width: 10%;">उपस्थिती</th>
                  ${marathiGrades.map(g => `<th colspan="2">${g}</th>`).join("")}
                </tr>
                <tr>
                  ${marathiGrades.map(() => `<th>मुले</th><th>मुली</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${subjectList.map((sub, index) => {
                  const counts = {};
                  marathiGrades.forEach(g => {
                    counts[g] = { boys: 0, girls: 0 };
                  });
                  let boysTotal = 0;
                  let girlsTotal = 0;

                  selectedStudents.forEach(student => {
                    const isBoy = student.gender === "Male";
                    if (isBoy) boysTotal++; else girlsTotal++;

                    const results = marksData[student.srNo] || {};
                    const subData = results[sub] || {};
                    const total = (subData.Akarik?.Total || 0) + (subData.Sanklik?.Total || 0);
                    const g = getMarathiGrade(total);
                    if (counts[g] !== undefined) {
                      if (isBoy) counts[g].boys++; else counts[g].girls++;
                    }
                  });

                  return `
                    <tr>
                      <td>${index + 1}</td>
                      <td class="left-align" style="font-weight: bold;">${sub}</td>
                      <td>मुले: ${boysTotal} | मुली: ${girlsTotal} | एकूण: ${boysTotal + girlsTotal}</td>
                      <td>मुले: ${boysTotal} | मुली: ${girlsTotal} | एकूण: ${boysTotal + girlsTotal}</td>
                      ${marathiGrades.map(g => `
                        <td>${counts[g].boys || "0"}</td>
                        <td>${counts[g].girls || "0"}</td>
                      `).join("")}
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>
        </div>

        <div class="sig-row">
          <div class="sig-box">
            ${cceSettings?.signatureUrl ? `<img class="sig-img" src="${cceSettings.signatureUrl}" alt="Sign">` : `<div class="sig-space"></div>`}
            <div>वर्गशिक्षक स्वाक्षरी</div>
            <div style="font-size: 8px; color: #555; margin-top: 2px;">${teacherNameFallback}</div>
          </div>
          <div class="sig-box">
            ${cceSettings?.principalSignature ? `<img class="sig-img" src="${cceSettings.principalSignature}" alt="Sign">` : `<div class="sig-space"></div>`}
            <div>मुख्याध्यापक स्वाक्षरी</div>
            <div style="font-size: 8px; color: #555; margin-top: 2px;">${hmNameFallback}</div>
          </div>
        </div>
      </div>
    `;

    // ────────────────────────────────────────────────────────
    // PAGE 10: CASTE-WISE COMPILATION PAGE (32-Column Matrix)
    // ────────────────────────────────────────────────────────
    const casteCategories = ["अनुसूचित जाती", "अनुसूचित जमाती", "वि.जा.भ. जाती", "इतर मागास", "बिगर मागास"];
    
    let casteHtml = "";
    subjectList.forEach((sub, subIdx) => {
      const catStats = {};
      casteCategories.forEach(cat => {
        catStats[cat] = {
          count: { boys: 0, girls: 0, total: 0 },
          grades: {}
        };
        marathiGrades.forEach(g => {
          catStats[cat].grades[g] = { boys: 0, girls: 0, total: 0 };
        });
      });

      const totalRow = {
        count: { boys: 0, girls: 0, total: 0 },
        grades: {}
      };
      marathiGrades.forEach(g => {
        totalRow.grades[g] = { boys: 0, girls: 0, total: 0 };
      });

      selectedStudents.forEach(student => {
        const results = marksData[student.srNo] || {};
        const subData = results[sub] || {};
        const total = (subData.Akarik?.Total || 0) + (subData.Sanklik?.Total || 0);
        const g = getMarathiGrade(total);

        const cat = getCasteCategoryMarathi(student.caste);
        const isBoy = student.gender === "Male";

        if (catStats[cat]) {
          if (isBoy) {
            catStats[cat].count.boys++;
            catStats[cat].grades[g].boys++;
            totalRow.count.boys++;
            totalRow.grades[g].boys++;
          } else {
            catStats[cat].count.girls++;
            catStats[cat].grades[g].girls++;
            totalRow.count.girls++;
            totalRow.grades[g].girls++;
          }
          catStats[cat].count.total++;
          catStats[cat].grades[g].total++;
          totalRow.count.total++;
          totalRow.grades[g].total++;
        }
      });

      casteCategories.forEach((cat, catIdx) => {
        const stats = catStats[cat];
        casteHtml += `
          <tr>
            ${catIdx === 0 ? `<td rowspan="6" style="font-weight: bold; writing-mode: vertical-rl; transform: rotate(180deg); font-size: 8px; max-width: 15px; background-color: #e8f5e9; color: #1b4d3e;">${sub}</td>` : ""}
            <td style="font-weight: bold; text-align: left; padding-left: 4px;">${cat}</td>
            
            <td>${stats.count.boys || "0"}</td>
            <td>${stats.count.girls || "0"}</td>
            <td style="font-weight: bold; background-color: #f4fcf7;">${stats.count.total || "0"}</td>

            ${marathiGrades.map(g => `
              <td>${stats.grades[g].boys || "0"}</td>
              <td>${stats.grades[g].girls || "0"}</td>
              <td style="font-weight: bold; background-color: #f4fcf7;">${stats.grades[g].total || "0"}</td>
            `).join("")}
          </tr>
        `;
      });

      casteHtml += `
        <tr style="background-color: #f1f8f5; font-weight: bold; border-bottom: 2px solid #1e3a2f;">
          <td style="text-align: left; padding-left: 4px;">एकूण</td>
          <td>${totalRow.count.boys || "0"}</td>
          <td>${totalRow.count.girls || "0"}</td>
          <td style="background-color: #e8f5e9;">${totalRow.count.total || "0"}</td>
          ${marathiGrades.map(g => `
            <td>${totalRow.grades[g].boys || "0"}</td>
            <td>${totalRow.grades[g].girls || "0"}</td>
            <td style="background-color: #e8f5e9;">${totalRow.grades[g].total || "0"}</td>
          `).join("")}
        </tr>
      `;
    });

    htmlContent += `
      <div class="page">
        <div class="doc-header">
          <div>
            <h2>${schoolNameFallback}</h2>
            <p>जातनिहाय व विषयनिहाय एकूण तेरीज पत्रक &bull; सत्र: ${termLabel} &bull; शैक्षणिक वर्ष: ${academicYear}</p>
          </div>
          <div>
            <span style="font-weight: bold; color: #1b4d3e;">इयत्ता: ${classValue}</span>
          </div>
        </div>

        <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; justify-content: center;">
          <table class="caste-table" style="margin-bottom: 0;">
            <thead>
              <tr>
                <th rowspan="2" style="width: 3%;">विषय</th>
                <th rowspan="2" style="width: 8%;">जात संवर्ग</th>
                <th colspan="3" style="width: 7%;">संख्या</th>
                ${marathiGrades.map(g => `<th colspan="3">${g}</th>`).join("")}
              </tr>
              <tr>
                <th>मुले</th><th>मुली</th><th>एकूण</th>
                ${marathiGrades.map(() => `<th>मु</th><th>मु</th><th>ए</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${casteHtml}
            </tbody>
          </table>
        </div>

        <div class="sig-row">
          <div class="sig-box">
            ${cceSettings?.signatureUrl ? `<img class="sig-img" src="${cceSettings.signatureUrl}" alt="Sign">` : `<div class="sig-space"></div>`}
            <div>वर्गशिक्षक स्वाक्षरी</div>
            <div style="font-size: 8px; color: #555; margin-top: 2px;">${teacherNameFallback}</div>
          </div>
          <div class="sig-box">
            ${cceSettings?.principalSignature ? `<img class="sig-img" src="${cceSettings.principalSignature}" alt="Sign">` : `<div class="sig-space"></div>`}
            <div>मुख्याध्यापक स्वाक्षरी</div>
            <div style="font-size: 8px; color: #555; margin-top: 2px;">${hmNameFallback}</div>
          </div>
        </div>
      </div>
    `;

    // ────────────────────────────────────────────────────────
    // PAGE 11: FINAL RESULT SHEET (निकालपत्रक)
    // ────────────────────────────────────────────────────────
    let resultRowsHtml = "";
    sortedStudents.forEach((student, index) => {
      const results = marksData[student.srNo] || {};
      let studentGrandTotal = 0;
      let studentMaxTotal = 0;
      let failedCount = 0;

      const cells = subjectList.map(sub => {
        const isPrimary = isPrimarySubject(sub);
        const subData = results[sub] || {};
        const akarik = subData.Akarik || {};
        const sanklik = subData.Sanklik || {};

        const akarikTotal = akarik.Total || 0;
        const sanklikTotal = sanklik.Total || 0;
        const total = akarikTotal + sanklikTotal;
        const grade = getMarathiGrade(total);

        studentGrandTotal += total;
        studentMaxTotal += 100;

        if (grade === "इ-2") {
          failedCount++;
        }

        if (isPrimary) {
          return `
            <td>${akarikTotal || "0"}</td>
            <td>${sanklikTotal || "0"}</td>
            <td style="font-weight: bold; background-color: #f4fcf7;">${total || "0"}</td>
            <td style="font-weight: bold; color: #1b4d3e;">${grade}</td>
          `;
        } else {
          return `
            <td>${akarikTotal || "0"}</td>
            <td style="font-weight: bold; background-color: #f4fcf7;">${total || "0"}</td>
            <td style="font-weight: bold; color: #1b4d3e;">${grade}</td>
          `;
        }
      }).join("");

      const pct = studentMaxTotal > 0 ? (studentGrandTotal / studentMaxTotal) * 100 : 0;
      const pctFormatted = pct.toFixed(2);
      const overallGrade = getMarathiGrade(Math.round(pct));
      const status = failedCount === 0 ? "उत्तीर्ण" : "सुधारणा आवश्यक";

      resultRowsHtml += `
        <tr>
          <td>${student.rollNo || "-"}</td>
          <td class="left-align" style="font-weight: bold;">${student.stdName || ""} ${student.stdFather || ""} ${student.stdSurname || ""}</td>
          ${cells}
          <td style="font-weight: bold; background-color: #e8f5e9;">${studentGrandTotal}</td>
          <td style="font-weight: bold; background-color: #e8f5e9;">${pctFormatted}%</td>
          <td style="font-weight: bold; background-color: #e8f5e9; color: #1b4d3e;">${overallGrade}</td>
          <td style="font-weight: bold; color: ${failedCount === 0 ? "#1b4d3e" : "#b71c1c"};">${status}</td>
          ${includeAttendance ? `<td>-</td>` : ""}
        </tr>
      `;
    });

    htmlContent += `
      <div class="page">
        <div class="doc-header">
          <div>
            <h2>${schoolNameFallback}</h2>
            <p>सातत्यपूर्ण सर्वंकष मूल्यमापन: निकाल पत्रक &bull; सत्र: ${termLabel} &bull; शैक्षणिक वर्ष: ${academicYear}</p>
          </div>
          <div>
            <span style="font-weight: bold; color: #1b4d3e;">इयत्ता: ${classValue}</span>
          </div>
        </div>

        <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; overflow: hidden;">
          <table class="result-table" style="margin-bottom: 0;">
            <thead>
              <tr>
                <th rowspan="2" style="width: 3%;">हजेरी क्र.</th>
                <th rowspan="2" style="width: 14%; text-align: left; padding-left: 8px;">विद्यार्थ्याचे नाव</th>
                ${subjectList.map(sub => {
                  const isPrimary = isPrimarySubject(sub);
                  return `<th colspan="${isPrimary ? 4 : 3}">${sub}</th>`;
                }).join("")}
                <th rowspan="2" class="rotate-header">एकूण गुण (${subjectList.length * 100})</th>
                <th rowspan="2" class="rotate-header">टक्केवारी (%)</th>
                <th rowspan="2" class="rotate-header">एकूण श्रेणी</th>
                <th rowspan="2" class="rotate-header" style="width: 6%;">निकाल</th>
                ${includeAttendance ? `<th rowspan="2" class="rotate-header">उपस्थिती</th>` : ""}
              </tr>
              <tr>
                ${subjectList.map(sub => {
                  const isPrimary = isPrimarySubject(sub);
                  if (isPrimary) {
                    return `<th>अ (70)</th><th>ब (30)</th><th>एकूण</th><th>श्रेणी</th>`;
                  } else {
                    return `<th>अ (100)</th><th>एकूण</th><th>श्रेणी</th>`;
                  }
                }).join("")}
              </tr>
            </thead>
            <tbody>
              ${resultRowsHtml}
            </tbody>
          </table>
        </div>

        <div class="sig-row">
          <div class="sig-box">
            ${cceSettings?.signatureUrl ? `<img class="sig-img" src="${cceSettings.signatureUrl}" alt="Sign">` : `<div class="sig-space"></div>`}
            <div>वर्गशिक्षक स्वाक्षरी</div>
            <div style="font-size: 8px; color: #555; margin-top: 2px;">${teacherNameFallback}</div>
          </div>
          <div class="sig-box" style="width: 120px;">
            <div class="sig-space"></div>
            <div>परीक्षा प्रमुख स्वाक्षरी</div>
          </div>
          <div class="sig-box">
            ${cceSettings?.principalSignature ? `<img class="sig-img" src="${cceSettings.principalSignature}" alt="Sign">` : `<div class="sig-space"></div>`}
            <div>मुख्याध्यापक स्वाक्षरी</div>
            <div style="font-size: 8px; color: #555; margin-top: 2px;">${hmNameFallback}</div>
          </div>
        </div>
      </div>
    `;

    htmlContent += `
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Small delay to make sure rendering context starts, then open printing dialog
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      setIsCompiling(false);
    }, 1200);
  };

  return (
    <div className="w-full min-h-screen bg-[#0d1310] text-[#a2d8b4] p-6 font-sans flex flex-col justify-between">
      <AlertMessage message={alertMessage} show={showAlert} />

      {/* Header Panel */}
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
              {language === "English" ? "CCE Evaluation Register" : "CCE CCE मूल्यांकन नोंदवही"}
            </h2>
            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mt-0.5">
              Evaluation Register (Daily Sheets)
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-emerald-600/80">
          {language === "English" ? "Class" : "वर्ग"}: {classValue}
        </span>
      </div>

      {/* Main Settings Card */}
      <div className="flex-1 max-w-2xl mx-auto w-full space-y-6">
        
        {/* Semester Tab Selection */}
        <div className="flex bg-[#121c16] rounded-full p-1 border border-emerald-950/60 max-w-sm mx-auto shadow-inner">
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
        </div>

        {/* Informational Intro Paragraph */}
        <div className="space-y-4">
          <p className="text-sm text-emerald-100/80 leading-relaxed">
            {language === "English"
              ? "Hello, the following components will be included in a single PDF for CCE Evaluation Register:"
              : "नमस्कार, CCE मूल्यांकन नोंदवहीसाठी एकाच PDF मध्ये खालील घटक समाविष्ट केले जातील -"}
          </p>
          <ol className="list-decimal list-inside space-y-2 pl-2 text-emerald-200/90 text-sm font-semibold">
            <li>{language === "English" ? "Cover Page" : "पृष्ठभाग (Cover Page)"}</li>
            <li>{language === "English" ? "Student Formative/Summative Marks & Remarks" : "विद्यार्थ्यांचे आकारिक-संकलित गुण व नोंदी"}</li>
            <li>{language === "English" ? "Grade-wise Compilation Table" : "श्रेणी-निहाय संकलन तक्ता"}</li>
            <li>{language === "English" ? "Category-wise & Subject-wise Marks Sheet" : "जात-निहाय व विषय-निहाय एकूण गुणांचे पत्रक"}</li>
            <li>{language === "English" ? "Final Result Sheet" : "अखेरीस निकालपत्रक"}</li>
          </ol>
        </div>

        {/* Config Options Group */}
        <div className="border-t border-emerald-950/40 pt-6 space-y-5">
          
          {/* Page Layout Radios */}
          <div>
            <h3 className="text-sm font-bold text-[#a2d8b4]/90 mb-3">
              {language === "English" ? "Student Formative/Summative Marks & Remarks" : "विद्यार्थ्यांचे आकारिक-संकलित गुण व नोंदी"}
            </h3>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-3 cursor-pointer text-sm text-white select-none">
                <input
                  type="radio"
                  name="pageLayout"
                  value="single"
                  checked={pageLayout === "single"}
                  onChange={() => setPageLayout("single")}
                  className="hidden"
                />
                <div className={`size-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  pageLayout === "single" ? "border-[#98d9a4] bg-transparent" : "border-emerald-800"
                }`}>
                  {pageLayout === "single" && <div className="size-2.5 rounded-full bg-[#98d9a4]" />}
                </div>
                <span>{language === "English" ? "Single Page" : "एकाच पानावर"}</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer text-sm text-white select-none">
                <input
                  type="radio"
                  name="pageLayout"
                  value="double"
                  checked={pageLayout === "double"}
                  onChange={() => setPageLayout("double")}
                  className="hidden"
                />
                <div className={`size-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  pageLayout === "double" ? "border-[#98d9a4] bg-transparent" : "border-emerald-800"
                }`}>
                  {pageLayout === "double" && <div className="size-2.5 rounded-full bg-[#98d9a4]" />}
                </div>
                <span>{language === "English" ? "Double Page" : "दोन पानांवर"}</span>
              </label>
            </div>
          </div>

          {/* Attendance Column Checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer text-sm text-white select-none">
              <input
                type="checkbox"
                checked={includeAttendance}
                onChange={(e) => setIncludeAttendance(e.target.checked)}
                className="hidden"
              />
              <div className={`size-5 rounded border-2 flex items-center justify-center transition-all ${
                includeAttendance ? "border-[#98d9a4] bg-[#223d2e] text-[#98d9a4]" : "border-emerald-800"
              }`}>
                {includeAttendance && <Check size={14} strokeWidth={3} />}
              </div>
              <span>{language === "English" ? "Attendance Column in Result Sheet" : "निकाल पत्रक मधील उपस्थिती कॉलम"}</span>
            </label>
          </div>

        </div>



        {/* Bottom Compilation Trigger */}
        <button
          onClick={handlePrintCompiledRegister}
          disabled={isCompiling}
          className="w-full py-4 bg-[#98d9a4] hover:bg-[#8ad499] active:scale-[0.99] text-[#0d1310] font-black text-sm rounded-2xl tracking-wide transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer duration-200 disabled:opacity-50"
        >
          {isCompiling ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>
                {language === "English" ? "Compiling register..." : "पद्धती संकलित करत आहे..."}
              </span>
            </>
          ) : (
            <span>{language === "English" ? "Generate / Print" : "तयार करा"}</span>
          )}
        </button>

      </div>
    </div>
  );
}

export default DailyRegister;
