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

const SubjectWiseResult = ({ initialClass, initialYear, onBack }) => {
  const [academicYear, setAcademicYear] = useState(initialYear || localStorage.getItem("cce_academic_year") || "");
  const [classValue, setClassValue] = useState(initialClass || localStorage.getItem("cce_selected_class") || "");
  const [activeSemester, setActiveSemester] = useState("first"); // "first" or "second"
  const [division, setDivision] = useState("");
  const [divisions, setDivisions] = useState(["A", "B", "C", "D"]);

  const [studentData, setStudentData] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [schoolData, setSchoolData] = useState(null);
  const [schoolName, setSchoolName] = useState("");
  const [schoolLogo, setSchoolLogo] = useState("");
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
    if (udiseNumber) {
      fetchSchoolData();
      fetchStudentData();
    }
  }, [udiseNumber]);

  // Handle automatic division fetching and default selection
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

  // Fetch subjects whenever class, division or year changes
  useEffect(() => {
    if (academicYear && classValue && division) {
      fetchSubjectSequence();
    }
  }, [academicYear, classValue, division]);

  // Fetch marks data whenever students or semester selection updates
  useEffect(() => {
    if (classValue && academicYear && selectedStudents.length > 0) {
      fetchMarksForAllStudents();
    }
  }, [classValue, academicYear, selectedStudents, activeSemester]);

  const fetchSchoolData = async () => {
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
      if (!academicYear || !classValue || !division) return;
      
      const urlSsc = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/ssc/${academicYear}/${classValue}/${division}.json`;
      const urlRegular = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/${academicYear}/${classValue}.json`;
      const urlSscNoDiv = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/ssc/${academicYear}/${classValue}.json`;

      let subjectsData = null;

      try {
        const response = await fetch(urlSsc);
        if (response.ok) {
          subjectsData = await response.json();
        }
      } catch (err) {
        console.warn("Failed fetching from SSC sequence:", err);
      }

      if (!subjectsData) {
        try {
          const response = await fetch(urlRegular);
          if (response.ok) {
            subjectsData = await response.json();
          }
        } catch (err) {
          console.warn("Failed fetching from Regular sequence:", err);
        }
      }

      if (!subjectsData) {
        try {
          const response = await fetch(urlSscNoDiv);
          if (response.ok) {
            subjectsData = await response.json();
          }
        } catch (err) {
          console.warn("Failed fetching from SSC No Div sequence:", err);
        }
      }

      if (subjectsData) {
        const orderedSubjects = Object.keys(subjectsData)
          .sort((a, b) => parseInt(a) - parseInt(b))
          .map((key) => subjectsData[key])
          .filter(Boolean);
        
        setSubjectSequence(orderedSubjects);

        const formattedSubjects = orderedSubjects.reduce((acc, sub) => {
          acc[sub] = true;
          return acc;
        }, {});
        setSubjects(formattedSubjects);
      } else {
        setSubjectSequence([]);
        setSubjects({});
      }
    } catch (error) {
      console.error("Error fetching subject sequence:", error);
    }
  };

  const fetchMarksForAllStudents = async () => {
    try {
      const examName = activeSemester === "first" ? "First Semester" : "Second Semester";
      
      const marksDataPromises = selectedStudents.map(async (student) => {
        try {
          const response = await fetch(
            `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${student.srNo}/result/${academicYear}/${examName}.json`
          );
          const marks = response.ok ? await response.json() : {};
          return {
            srNo: student.srNo,
            marks: marks || {},
          };
        } catch (err) {
          console.warn(`Error fetching marks for ${student.srNo}:`, err);
          return { srNo: student.srNo, marks: {} };
        }
      });

      const results = await Promise.all(marksDataPromises);
      const tempMarks = {};
      results.forEach((item) => {
        tempMarks[item.srNo] = item.marks;
      });

      // Also fetch from Firestore marks collection and merge
      try {
        const term = activeSemester; // "first" or "second"
        const firestoreMarks = await fetchFirestoreMarks(classValue, academicYear, term);
        if (firestoreMarks.length > 0) {
          const subjectList = subjectSequence.length > 0 ? subjectSequence : Object.keys(subjects);
          const merged = matchAndMergeMarks(selectedStudents, tempMarks, firestoreMarks, subjectList);
          setMarksData(merged);
        } else {
          setMarksData(tempMarks);
        }
      } catch (fsError) {
        console.warn("Firestore marks fetch failed, using RTDB data:", fsError);
        setMarksData(tempMarks);
      }
    } catch (error) {
      console.error("Error loading marks:", error);
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

  const getSubjectLabel = (sub) => {
    if (!sub) return "";
    const translations = {
      marathi: "प्रथम भाषा : मराठी",
      english: "द्वितीय भाषा : इंग्रजी",
      maths: "गणित",
      science: "विज्ञान",
      social_studies: "सामाजिक शास्त्रे",
      art: "कला",
      craft: "कार्यानुभव",
      physical_education: "शारीरिक शिक्षण",
      hindi: "तृतीय भाषा : हिंदी",
      "first language: marathi": "प्रथम भाषा : मराठी",
      "second language: english": "द्वितीय भाषा : इंग्रजी",
      "mathematics": "गणित"
    };
    const key = sub.toLowerCase().trim();
    return translations[key] || sub;
  };

  const handlePrintCompiledRegister = () => {
    if (selectedStudents.length === 0) {
      setAlertMessage("विद्यार्थी यादी उपलब्ध नाही.");
      return;
    }

    setIsCompiling(true);

    const examName = activeSemester === "first" ? "First Semester" : "Second Semester";
    const termLabel = activeSemester === "first" ? "प्रथम सत्र" : "द्वितीय सत्र";
    const subjectList = subjectSequence.length > 0 ? subjectSequence : Object.keys(subjects);

    if (subjectList.length === 0) {
      setAlertMessage("विषय यादी उपलब्ध नाही.");
      setIsCompiling(false);
      return;
    }

    const printWindow = window.open("", "", "height=700,width=1000");
    if (!printWindow) {
      setAlertMessage("पॉपअप ब्लॉकर सक्रिय आहे, कृपया परवानगी द्या.");
      setIsCompiling(false);
      return;
    }

    let htmlContent = `
      <html>
        <head>
          <title>Learning Outcomes Achievement Register - ${classValue}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700&family=Poppins:wght@400;700&display=swap');
            
            @page {
              size: A4 landscape;
              margin: 6mm;
            }
            body {
              font-family: 'Poppins', 'Noto Sans Devanagari', sans-serif;
              margin: 0;
              padding: 0;
              color: #121212;
              background-color: #fff;
              font-size: 9px;
            }
            .page {
              page-break-after: always;
              position: relative;
              width: 100%;
              box-sizing: border-box;
            }
            .page:last-child {
              page-break-after: avoid;
            }
            
            .doc-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #1e3a2f;
              padding-bottom: 6px;
              margin-bottom: 12px;
            }
            .doc-header img {
              height: 40px;
            }
            .doc-header h2 {
              font-size: 15px;
              margin: 0;
              color: #1b4d3e;
              font-weight: bold;
            }
            .doc-header p {
              margin: 2px 0 0 0;
              font-size: 9px;
              color: #666;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
              font-size: 8.5px;
            }
            th, td {
              border: 1px solid #1e3a2f !important;
              padding: 3px;
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
            
            .rotate-header {
              writing-mode: vertical-rl;
              transform: rotate(180deg);
              white-space: nowrap;
              padding: 6px 2px !important;
              height: 70px;
            }
            
            .sig-row {
              margin-top: 30px;
              display: flex;
              justify-content: space-between;
              font-weight: bold;
              font-size: 10px;
              padding: 0 15px;
            }
          </style>
        </head>
        <body>
    `;

    // Generate sheet for each subject
    subjectList.forEach((sub) => {
      htmlContent += `
        <div class="page">
          <div class="doc-header">
            <div style="display: flex; align-items: center; gap: 10px;">
              ${schoolLogo ? `<img src="${schoolLogo}" alt="Logo">` : ""}
              <div>
                <h2>${schoolName}</h2>
                <p>अध्ययन निष्पत्तीनिहाय संपादणूक प्रगतीदर्शक नोंदतक्ता (विद्यार्थीनिहाय) &bull; सत्र: ${termLabel} &bull; शैक्षणिक वर्ष: ${academicYear}</p>
              </div>
            </div>
            <div style="text-align: right;">
              <span style="font-weight: bold; color: #1b4d3e; font-size: 11px;">
                इयत्ता: ${classValue} &bull; तुकडी: ${division || "-"} &bull; विषय: ${getSubjectLabel(sub)}
              </span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th rowspan="2" style="width: 5%;">${language === "English" ? "Roll No" : "हजेरी नं"}</th>
                <th rowspan="2" style="width: 25%;">${language === "English" ? "Student Name" : "विद्यार्थ्याचे नाव"}</th>
                <th colspan="9">${language === "English" ? "Formative Assessment (Akarik)" : "आकारिक मूल्यमापन"}</th>
                <th colspan="4">${language === "English" ? "Summative Assessment (Sanklit)" : "संकलित मूल्यमापन"}</th>
                <th rowspan="2" style="width: 6%;">${language === "English" ? "Grand Total" : "एकूण"}</th>
                <th rowspan="2" style="width: 6%;">${language === "English" ? "Grade" : "श्रेणी"}</th>
              </tr>
              <tr>
                <th class="rotate-header">${language === "English" ? "Activity" : "उपक्रम/कृती"}</th>
                <th class="rotate-header">${language === "English" ? "Daily Mon." : "दैनंदिन निरीक्षण"}</th>
                <th class="rotate-header">${language === "English" ? "Demonstration" : "प्रात्यक्षिके"}</th>
                <th class="rotate-header">${language === "English" ? "Homework" : "गृहपाठ"}</th>
                <th class="rotate-header">${language === "English" ? "Oral Work" : "तोंडी काम"}</th>
                <th class="rotate-header">${language === "English" ? "Others" : "इतर"}</th>
                <th class="rotate-header">${language === "English" ? "Project" : "प्रकल्प"}</th>
                <th class="rotate-header">${language === "English" ? "Test" : "चाचणी"}</th>
                <th style="font-weight: bold; background-color: #d0edd2;">${language === "English" ? "Total" : "एकूण"}</th>
                <th class="rotate-header">${language === "English" ? "Orally" : "तोंडी"}</th>
                <th class="rotate-header">${language === "English" ? "Demonstration" : "प्रात्यक्षिके"}</th>
                <th class="rotate-header">${language === "English" ? "Writing" : "लेखन"}</th>
                <th style="font-weight: bold; background-color: #d0edd2;">${language === "English" ? "Total" : "एकूण"}</th>
              </tr>
            </thead>
            <tbody>
      `;

      const sortedStudents = [...selectedStudents].sort((a, b) => {
        const rA = parseInt(a.rollNo) || 999;
        const rB = parseInt(b.rollNo) || 999;
        return rA - rB;
      });

      sortedStudents.forEach((student) => {
        const studentMarks = marksData[student.srNo]?.[sub] || {};
        const akarik = studentMarks.Akarik || {};
        const sanklik = studentMarks.Sanklik || {};

        const akarikTotal = Number(akarik.Total) || 0;
        const sanklikTotal = Number(sanklik.Total) || 0;
        const hasMarks = Object.keys(akarik).length > 0 || Object.keys(sanklik).length > 0;
        const grandTotal = hasMarks ? (akarikTotal + sanklikTotal) : 0;
        const grade = hasMarks ? calculateGrade(grandTotal) : "-";

        htmlContent += `
          <tr>
            <td>${student.rollNo || "-"}</td>
            <td class="left-align" style="font-weight: bold;">${student.stdName || ""} ${student.stdFather || ""} ${student.stdSurname || ""}</td>
            <td>${akarik["Activity"] ?? "-"}</td>
            <td>${akarik["Daily Monitoring"] ?? "-"}</td>
            <td>${akarik["Demonstration"] ?? "-"}</td>
            <td>${akarik["Homework"] ?? "-"}</td>
            <td>${akarik["Oral Work"] ?? "-"}</td>
            <td>${akarik["Others"] ?? "-"}</td>
            <td>${akarik["Project"] ?? "-"}</td>
            <td>${akarik["Test"] ?? "-"}</td>
            <td style="font-weight: bold; background-color: #f5fbf6;">${akarik.Total ?? "-"}</td>
            <td>${sanklik["Orally"] ?? "-"}</td>
            <td>${sanklik["Demonstration"] ?? "-"}</td>
            <td>${sanklik["Writing"] ?? "-"}</td>
            <td style="font-weight: bold; background-color: #f5fbf6;">${sanklik.Total ?? "-"}</td>
            <td style="font-weight: bold; background-color: #e8f5e9;">${hasMarks ? grandTotal : "-"}</td>
            <td style="font-weight: bold; background-color: #e8f5e9;">${grade}</td>
          </tr>
        `;
      });

      htmlContent += `
            </tbody>
          </table>
          
          <div class="sig-row" style="align-items: flex-end;">
            <div style="text-align: center;">
              ${cceSettings?.signatureUrl ? `<img src="${cceSettings.signatureUrl}" style="max-height: 40px; display: block; margin: 0 auto 2px;" />` : ""}
              ${cceSettings?.teacherName || "वर्गशिक्षक"}
            </div>
            <div style="text-align: center;">
              ${cceSettings?.principalSignature ? `<img src="${cceSettings.principalSignature}" style="max-height: 40px; display: block; margin: 0 auto 2px;" />` : ""}
              ${cceSettings?.principalName || "मुख्याध्यापक"}
            </div>
          </div>
        </div>
      `;
    });

    htmlContent += `
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Trigger printing once content is fully written
    setTimeout(() => {
      printWindow.print();
      setIsCompiling(false);
    }, 500);
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
              {language === "English" ? "Learning Outcomes Register" : "अध्ययन निष्पत्तीनिहाय संपादणूक प्रगती..."}
            </h2>
            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mt-0.5">
              Learning Outcomes Achievement Register (Student-wise)
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

        {/* Info Text */}
        <div className="space-y-4 pt-4 text-center">
          <p className="text-sm text-emerald-100/90 leading-relaxed max-w-md mx-auto">
            {language === "English" 
              ? "Hello, the learning outcomes achievement register is attached student-wise." 
              : "नमस्कार, अध्ययन निष्पत्तीनिहाय संपादणूक प्रगतीदर्शक नोंदतक्ता विद्यार्थीनिहाय जोडला आहे."}
          </p>
        </div>

        {/* Warning Block */}
        <div className="bg-[#121c16]/50 border border-emerald-950/40 rounded-2xl p-5 text-xs text-emerald-400/80 leading-relaxed space-y-3 max-w-md mx-auto">
          {/* School Name Check */}
          <div className="flex items-start gap-2.5">
            {schoolName && schoolName !== "N/A" ? (
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

          {/* Paper orientation disclaimer */}
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-emerald-500" />
            <span>
              {language === "English" 
                ? "This table will be printed on landscape A4 sheets, containing formative and summative scores for all subjects." 
                : "हा तक्ता सर्व विषयांच्या आकारिक व संकलित मूल्यमापन गुणांसह landscape A4 पानांवर प्रिंट केला जाईल."}
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
                {language === "English" ? "Compiling results..." : "गुण तक्ते संकलित करत आहे..."}
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

export default SubjectWiseResult;