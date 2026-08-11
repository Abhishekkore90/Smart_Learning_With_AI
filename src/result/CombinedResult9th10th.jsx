import React, { useState, useEffect } from "react";
import "../result/result.css";

function SemesterResult9th10th() {
    const [academicYear, setAcademicYear] = useState("");
    const [classValue, setClassValue] = useState("");
    const [division, setDivision] = useState("");
    const [selectedExamName, setSelectedExamName] = useState("");

    const [studentData, setStudentData] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [marksData, setMarksData] = useState({});
    const [classes, setClasses] = useState([]);
    const [divisions, setDivisions] = useState(["A", "B", "C", "D"]);
    const [subjects, setSubjects] = useState([]);
    const [schoolData, setSchoolData] = useState(null);

    const examNames = ["Semester First ", "Semester Second ", "Semester First & Second"];

    const udiseNumber = localStorage.getItem("udiseNumber");
    const [language, setLanguage] = useState(localStorage.getItem('language') || 'English');

    const gradedSubjects = ["Jalsuraksha", "Arogya v.sha.shi", "Sanrakshanshastra", "जलसुरक्षा", "आरोग्य व.शा.शि.", "संरक्षणशास्त्र"];

    useEffect(() => {
        const storedLanguage = localStorage.getItem('language') || 'English';
        setLanguage(storedLanguage);
    }, []);

    useEffect(() => {
        if (udiseNumber) {
            fetchStudentData();
            fetchSchoolData();
        }
    }, [udiseNumber]);

    useEffect(() => {
        const fetchDefaultSettings = async () => {
            try {
                const response = await fetch(`${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/defaultSettings.json`);
                if (response.ok) {
                    const data = await response.json();
                    if (data) setAcademicYear(data.defaultYear || "");
                }
            } catch (error) {
                console.error("Error fetching default settings:", error);
            }
        };
        fetchDefaultSettings();
    }, [udiseNumber]);

    const DB_NAME = 'SchoolManagementDB';
    const STUDENT_STORE = 'studentData';
    const SCHOOL_STORE = 'schoolData';
    const DB_VERSION = 1;

    const openDB = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = (event) => reject(event.target.error);
            request.onsuccess = (event) => resolve(event.target.result);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STUDENT_STORE)) db.createObjectStore(STUDENT_STORE, { keyPath: "id" });
                if (!db.objectStoreNames.contains(SCHOOL_STORE)) db.createObjectStore(SCHOOL_STORE, { keyPath: "udiseNumber" });
            };
        });
    };

    const fetchStudentData = async () => {
        try {
            const db = await openDB();
            const transaction = db.transaction(STUDENT_STORE, "readonly");
            const store = transaction.objectStore(STUDENT_STORE);
            const request = store.getAll();

            request.onsuccess = (event) => {
                const students = event.target.result;
                const activeStudents = students.filter(student => student.isActive !== false);

                const classesAndDivisions = {};
                activeStudents.forEach((student) => {
                    if (student && student.currentClass) {
                        if (!classesAndDivisions[student.currentClass]) {
                            classesAndDivisions[student.currentClass] = {};
                        }
                        const div = student.division || "";
                        if (!classesAndDivisions[student.currentClass][div]) {
                            classesAndDivisions[student.currentClass][div] = [];
                        }
                        classesAndDivisions[student.currentClass][div].push(student.id);
                    }
                });

                const updatedStudents = activeStudents.map((student) => {
                    const keyParts = student.id.split("-");
                    const className = keyParts[0];
                    const div = keyParts[1];
                    const srNo = keyParts[keyParts.length - 1];
                    return { ...student, className, division: div, srNo };
                });

                setClasses(Object.keys(classesAndDivisions));
                setStudentData(updatedStudents);
            };
        } catch (error) {
            console.error("Error fetching student data:", error);
        }
    };

    const fetchDivisionsForClass = async (classValue) => {
        try {
            const db = await openDB();
            const transaction = db.transaction(STUDENT_STORE, "readonly");
            const store = transaction.objectStore(STUDENT_STORE);
            const request = store.getAll();

            request.onsuccess = (event) => {
                const students = event.target.result;
                const divisionsForClass = new Set();
                students.forEach((student) => {
                    if (student.currentClass === classValue) {
                        divisionsForClass.add(student.division);
                    }
                });
                if (divisionsForClass.size === 0) {
          setDivisions(["A", "B", "C", "D"]);
        } else {
          setDivisions(Array.from(divisionsForClass));
        }
            };
        } catch (error) {
            console.error("Error fetching divisions:", error);
        }
    };

    const fetchSubjectsForClass = async (classValue) => {
        try {
            if (!academicYear) return;
            const url = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/${academicYear}/${classValue}.json`;
            const response = await fetch(url);
            if (response.ok) {
                const subjectsData = await response.json();
                if (subjectsData) {
                    const validSubjects = Object.entries(subjectsData)
                        .filter(([_, value]) => value !== null && value !== undefined)
                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                        .map(([_, sub]) => sub);
                    setSubjects(validSubjects);
                } else {
                    setSubjects(["मराठी", "हिंदी", "इंग्रजी", "इतिहास", "भूगोल", "गणित 1", "गणित 2", "विज्ञान व तंत्रज्ञान 1", "विज्ञान व तंत्रज्ञान 2"]);
                }
            } else {
                setSubjects(["मराठी", "हिंदी", "इंग्रजी", "इतिहास", "भूगोल", "गणित 1", "गणित 2", "विज्ञान व तंत्रज्ञान 1", "विज्ञान व तंत्रज्ञान 2"]);
            }
        } catch (error) {
            console.error("Error fetching subjects:", error);
            setSubjects(["मराठी", "हिंदी", "इंग्रजी", "इतिहास", "भूगोल", "गणित 1", "गणित 2", "विज्ञान व तंत्रज्ञान 1", "विज्ञान व तंत्रज्ञान 2"]);
        }
    };

    const handleClassChange = async (e) => {
        const selectedClass = e.target.value;
        setClassValue(selectedClass);
        setDivision("");
        fetchSubjectsForClass(selectedClass);

        if (selectedClass) {
            await fetchDivisionsForClass(selectedClass);
        }
        const filteredStudents = studentData
            .filter((student) => student.currentClass === selectedClass)
            .sort((a, b) => {
                const rollA = Number(a.rollNo) || Number(a.srNo) || 0;
                const rollB = Number(b.rollNo) || Number(b.srNo) || 0;
                return rollA - rollB;
            });
        setSelectedStudents(filteredStudents);
    };

    const handleDivisionChange = (e) => {
        const selectedDivision = e.target.value;
        setDivision(selectedDivision);
        const filteredStudents = studentData
            .filter((student) => student.currentClass === classValue && student.division === selectedDivision)
            .sort((a, b) => {
                const rollA = Number(a.rollNo) || Number(a.srNo) || 0;
                const rollB = Number(b.rollNo) || Number(b.srNo) || 0;
                return rollA - rollB;
            });
        setSelectedStudents(filteredStudents);
    };

    const fetchMarksData = (student, subject) => {
        if (student && student.result && student.result[academicYear] && student.result[academicYear][selectedExamName] && student.result[academicYear][selectedExamName][subject]) {
            return student.result[academicYear][selectedExamName][subject];
        } else if (student && student.icseResult && student.icseResult[academicYear] && student.icseResult[academicYear][selectedExamName] && student.icseResult[academicYear][selectedExamName][subject]) {
            return student.icseResult[academicYear][selectedExamName][subject];
        } else {
            return {};
        }
    };

    const fetchAllMarks = async () => {
        try {
            const db = await openDB();
            const transaction = db.transaction(STUDENT_STORE, "readonly");
            const store = transaction.objectStore(STUDENT_STORE);
            const request = store.getAll();

            request.onsuccess = async (event) => {
                const allStudents = event.target.result;
                const activeStudents = allStudents.filter(student => student.isActive !== false);

                const updatedStudents = activeStudents.map((student) => {
                    const keyParts = student.id.split("-");
                    const className = keyParts[0];
                    const div = keyParts[1];
                    const srNo = keyParts[keyParts.length - 1];
                    return { ...student, className, division: div, srNo };
                });

                // Ensure studentData state is perfectly fresh
                setStudentData(updatedStudents);

                const filteredStudents = updatedStudents
                    .filter((student) => student.currentClass === classValue && (division ? student.division === division : true))
                    .sort((a, b) => {
                        const rollA = Number(a.rollNo) || Number(a.srNo) || 0;
                        const rollB = Number(b.rollNo) || Number(b.srNo) || 0;
                        return rollA - rollB;
                    });

                setSelectedStudents(filteredStudents);

                if (filteredStudents.length === 0 || !selectedExamName || subjects.length === 0) {
                    setMarksData({});
                    return;
                }

                // Fetch marks directly from Firebase to bypass any IndexedDB sync issues
                const url = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData.json`;
                let firebaseData = {};
                try {
                    const fbResponse = await fetch(url);
                    if (fbResponse.ok) {
                        firebaseData = await fbResponse.json() || {};
                    }
                } catch (fbErr) {
                    console.error("Error fetching from Firebase:", fbErr);
                }

                const allMarksData = {};
                for (const student of filteredStudents) {
                    allMarksData[student.srNo] = {};
                    const fbStudent = firebaseData[student.srNo] || student; // Fallback to IDB student if Firebase fails

                    for (const subject of subjects) {
                        let marks = {};
                        if (selectedExamName === "Semester First & Second") {
                            const semesters = ["Semester First ", "Semester Second "];
                            let combinedObtain = 0;
                            let combinedTotal = 0;
                            let isAnyPresent = false;

                            semesters.forEach(exam => {
                                let examMarks = {};
                                if (fbStudent && fbStudent.result && fbStudent.result[academicYear] && fbStudent.result[academicYear][exam] && fbStudent.result[academicYear][exam][subject]) {
                                    examMarks = fbStudent.result[academicYear][exam][subject];
                                } else if (fbStudent && fbStudent.icseResult && fbStudent.icseResult[academicYear] && fbStudent.icseResult[academicYear][exam] && fbStudent.icseResult[academicYear][exam][subject]) {
                                    examMarks = fbStudent.icseResult[academicYear][exam][subject];
                                }

                                if (examMarks.obtainMarks !== undefined && examMarks.obtainMarks !== "") {
                                    if (String(examMarks.obtainMarks).toLowerCase() !== 'ab') {
                                        combinedObtain += parseFloat(examMarks.obtainMarks) || 0;
                                        isAnyPresent = true;
                                    }
                                }
                                if (examMarks.totalMarks !== undefined && examMarks.totalMarks !== "") {
                                    if (String(examMarks.totalMarks).toLowerCase() !== 'ab') {
                                        combinedObtain += parseFloat(examMarks.totalMarks) || 0;
                                        isAnyPresent = true;
                                    }
                                }
                            });

                            if (isAnyPresent) {
                                marks = { obtainMarks: combinedObtain };
                            } else {
                                marks = { obtainMarks: "AB" };
                            }
                        } else {
                            if (fbStudent && fbStudent.result && fbStudent.result[academicYear] && fbStudent.result[academicYear][selectedExamName] && fbStudent.result[academicYear][selectedExamName][subject]) {
                                marks = fbStudent.result[academicYear][selectedExamName][subject];
                            } else if (fbStudent && fbStudent.icseResult && fbStudent.icseResult[academicYear] && fbStudent.icseResult[academicYear][selectedExamName] && fbStudent.icseResult[academicYear][selectedExamName][subject]) {
                                marks = fbStudent.icseResult[academicYear][selectedExamName][subject];
                            } else {
                                marks = fetchMarksData(student, subject); // Ultimate fallback to local IDB
                            }
                        }
                        allMarksData[student.srNo][subject] = marks;
                    }
                }
                setMarksData(allMarksData);
            };
        } catch (error) {
            console.error("Error formatting marks:", error);
        }
    };

    useEffect(() => {
        if (classValue && academicYear && selectedExamName && subjects.length > 0) {
            fetchAllMarks();
        }
    }, [classValue, division, academicYear, selectedExamName, subjects]);

    const fetchSchoolData = async () => {
        try {
            const db = await openDB();
            const transaction = db.transaction(SCHOOL_STORE, "readonly");
            const store = transaction.objectStore(SCHOOL_STORE);
            const udise = localStorage.getItem("udiseNumber");
            const request = store.get(udise);
            return new Promise((resolve) => {
                request.onsuccess = (event) => {
                    const data = event.target.result;
                    if (data) setSchoolData(data);
                    resolve(data);
                };
            });
        } catch (error) {
            console.error("Error accessing IndexedDB:", error);
        }
    };



    const handlePrint = () => {
        const tableElement = document.getElementById("printableTable");
        if (tableElement) {
            const tableContent = tableElement.outerHTML;
            const schoolName = schoolData?.schoolName || " ";
            const schoolLogo = schoolData?.schoolLogo || " ";

            const printWindow = window.open("", "", "height=600,width=800");
            printWindow.document.write("<html><head><title>Print</title>");
            printWindow.document.write(`
        <style>
          @page { size: A4 Landscape; margin: 3mm; }
          body { font-family: Arial, sans-serif; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid black !important; padding: 4px; text-align: center; }
          thead th { background-color: #f4f4f4; font-weight: bold; }
          .school-header { display: flex; align-items: center; justify-content: flex-start; margin-bottom: 15px; padding: 10px; border-bottom: 2px solid #ccc; }
          .school-header img { max-height: 70px; margin-right: 15px; }
          .school-header h1 { font-size: 24px; margin: 0; text-align: left; flex: 1; }
          .school-header p { margin: 0 0 0 15px; font-size: 16px; }
        </style>
      `);
            printWindow.document.write("</head><body>");

            printWindow.document.write(`
        <div class="school-header">
          ${schoolLogo ? '<img src="' + schoolLogo + '" alt="School Logo">' : ''}
          <h1>${schoolName}</h1>
          <p>Class: ${classValue} ${division} | Exam: ${selectedExamName}</p>
        </div>
      `);

            printWindow.document.write(tableContent);
            printWindow.document.write("</body></html>");
            printWindow.document.close();

            setTimeout(() => {
                printWindow.print();
            }, 500);
        }
    };

    const getSubjectMaxMarks = (subjectName) => {
        if (selectedExamName === "Semester First & Second") {
            return 200;
        }
        return 100; // As per user request, Ganit and Vidnyan are 100, and others are typically 100.
    };

    const getSubjectMark = (studentSrNo, subject) => {
        const m = marksData[studentSrNo]?.[subject];
        if (!m) return { value: 0, text: "AB" };
        if (m.obtainMarks !== undefined && m.obtainMarks !== "") {
            if (String(m.obtainMarks).toLowerCase() === 'ab') return { value: 0, text: "AB" };
            return { value: parseFloat(m.obtainMarks) || 0, text: m.obtainMarks };
        }
        if (m.totalMarks !== undefined && m.totalMarks !== "") {
            if (String(m.totalMarks).toLowerCase() === 'ab') return { value: 0, text: "AB" };
            return { value: parseFloat(m.totalMarks) || 0, text: m.totalMarks };
        }
        return { value: 0, text: "AB" };
    };

    const nonGradedSubjects = subjects.filter(s => !gradedSubjects.some(g => s.toLowerCase().includes(g.toLowerCase())));

    const getTransformedSubjects = () => {
        const newSubs = [];
        let hasMath = false;
        let hasScience = false;
        let hasSocialScience = false;

        nonGradedSubjects.forEach(s => {
            const trimmedS = s.trim();
            const lower = trimmedS.toLowerCase();
            // Explicitly skip "भाग" subjects as per user request to remove duplicate columns
            if (lower.includes("भाग -1") || lower.includes("भाग -2") || lower.includes("भाग-1") || lower.includes("भाग-2") || lower.includes("part-1") || lower.includes("part-2") || lower.includes("part 1") || lower.includes("part 2")) {
                return;
            }

            if (lower.includes("math") || lower.includes("ganit") || lower.includes("algebra") || lower.includes("geometry") || lower.includes("बीजगणित") || lower.includes("भूमिती") || lower.includes("गणित")) {
                if (!hasMath) {
                    newSubs.push("गणित");
                    hasMath = true;
                }
            }
            else if (lower.includes("science") || lower.includes("विज्ञान") || lower.includes("तंत्रज्ञान")) {
                if (!hasScience) {
                    newSubs.push("विज्ञान");
                    hasScience = true;
                }
            }
            else if (lower.includes("history") || lower.includes("geography") || lower.includes("इतिहास") || lower.includes("भूगोल") || lower.includes("समाजशास्त्र")) {
                if (!hasSocialScience) {
                    newSubs.push("समाजशास्त्र");
                    hasSocialScience = true;
                }
            }
            else {
                newSubs.push(s);
            }
        });
        return newSubs;
    };

    const displaySubjects = getTransformedSubjects();

    const getCombinedSubjectMark = (studentSrNo, displaySubject) => {
        const isMath = displaySubject === "Math" || displaySubject === "गणित";
        const isScience = displaySubject === "Science" || displaySubject === "विज्ञान";
        const isSocialScience = displaySubject === "Social Science" || displaySubject === "समाजशास्त्र";

        if (isMath) {
            let totalValue = 0;
            let allAb = true;
            nonGradedSubjects.forEach(s => {
                const trimmedS = s.trim();
                const lower = trimmedS.toLowerCase();
                if (lower.includes("math") || lower.includes("ganit") || lower.includes("maths") || lower.includes("algebra") || lower.includes("geometry") || lower.includes("बीजगणित") || lower.includes("भूमिती") || lower.includes("गणित")) {
                    const m = getSubjectMark(studentSrNo, s);
                    if (m.text !== "AB") {
                        totalValue += m.value;
                        allAb = false;
                    }
                }
            });
            return allAb ? { value: 0, text: "AB" } : { value: totalValue, text: totalValue };
        }

        if (isScience) {
            let totalValue = 0;
            let allAb = true;
            nonGradedSubjects.forEach(s => {
                const lower = s.toLowerCase();
                if (lower.includes("science") || lower.includes("विज्ञान") || lower.includes("तंत्रज्ञान")) {
                    const m = getSubjectMark(studentSrNo, s);
                    if (m.text !== "AB") {
                        totalValue += m.value;
                        allAb = false;
                    }
                }
            });
            return allAb ? { value: 0, text: "AB" } : { value: totalValue, text: totalValue };
        }

        if (isSocialScience) {
            let totalValue = 0;
            let allAb = true;
            nonGradedSubjects.forEach(s => {
                const lower = s.toLowerCase();
                if (lower.includes("history") || lower.includes("geography") || lower.includes("इतिहास") || lower.includes("भूगोल") || lower.includes("समाजशास्त्र")) {
                    const m = getSubjectMark(studentSrNo, s);
                    if (m.text !== "AB") {
                        totalValue += m.value;
                        allAb = false;
                    }
                }
            });
            return allAb ? { value: 0, text: "AB" } : { value: totalValue, text: totalValue };
        }

        return getSubjectMark(studentSrNo, displaySubject);
    };

    const calculateTotal = (studentSrNo) => {
        let totalObtained = 0;
        let totalMax = 0;
        let allAbsent = true;

        displaySubjects.forEach(sub => {
            const maxMarks = getSubjectMaxMarks(sub);
            totalMax += maxMarks;

            const mark = getCombinedSubjectMark(studentSrNo, sub);
            if (mark.text !== "AB") {
                totalObtained += mark.value;
                allAbsent = false;
            }
        });

        return { totalObtained, totalMax, allAbsent };
    };

    const getPercentage = (totalObtained, totalMax) => {
        if (totalMax === 0) return 0;
        return ((totalObtained / totalMax) * 100).toFixed(2);
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f5f7fa', paddingBottom: '100px' }}>
            <div className="p-3 main-content-of-page" style={{ padding: '20px', maxWidth: '100%', overflowX: 'auto', marginBottom: '80px' }}>
                <h3 style={{ color: 'rgb(3, 54, 94)', marginBottom: '25px', textAlign: 'center', fontSize: '1.8rem', fontWeight: '600' }} className="title">
                    {language === "English" ? "9th & 10th Combined" : "९ वी व १० वी एकत्रित"}
                </h3>

                <table className="table table-striped table-bordered" style={{ width: '100%', marginBottom: '25px', backgroundColor: '#fff', borderRadius: '8px' }}>
                    <tbody>
                        <tr>
                            <th style={{ backgroundColor: '#b5d3f2', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>{language === "English" ? "Academic Year" : "शैक्षणिक वर्ष"}</th>
                            <td>
                                <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="form-control custom-select" style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
                                    <option value="">{language === "English" ? "Select Year" : "वर्ष निवडा"}</option>
                                    <option value="2023-2024">2023-2024</option>
                                    <option value="2024-2025">2024-2025</option>
                                    <option value="2025-2026">2025-2026</option>
                                    <option value="2026-2027">2026-2027</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <th style={{ backgroundColor: '#b5d3f2', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>{language === "English" ? "Class" : "वर्ग"}</th>
                            <td>
                                <select value={classValue} onChange={handleClassChange} className="form-control custom-select" style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
                                    <option value="">{language === "English" ? "Select Class" : "वर्ग निवडा"}</option>
                                    {["Class IX", "Class X"].map(cls => <option key={cls} value={cls}>{cls}</option>)}
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <th style={{ backgroundColor: '#b5d3f2', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>{language === "English" ? "Division" : "तुकडी"}</th>
                            <td>
                                <select value={division} onChange={handleDivisionChange} className="form-control custom-select" style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
                                    <option value="">{language === "English" ? "Select Division" : "तुकडी निवडा"}</option>
                                    {divisions.map(div => <option key={div} value={div}>{div}</option>)}
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <th style={{ backgroundColor: '#b5d3f2', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>{language === "English" ? "Exam Name" : "परीक्षेचे नाव"}</th>
                            <td>
                                <select value={selectedExamName} onChange={(e) => setSelectedExamName(e.target.value)} className="form-control custom-select" style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
                                    <option value="">{language === "English" ? "Select Exam" : "परीक्षा निवडा"}</option>
                                    {examNames.map((exam, i) => <option key={i} value={exam}>{exam}</option>)}
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td colSpan="2" style={{ textAlign: 'center' }}>
                                <button onClick={handlePrint} className="btn btn-primary" style={{ padding: '10px 25px' }}>
                                    {language === "English" ? "Print" : "Print करा"}
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div style={{ width: '100%', overflowX: 'auto', backgroundColor: '#fff', borderRadius: '8px' }}>
                    <table className="table table-striped table-bordered custom-table" id="printableTable" style={{ minWidth: '1200px', fontSize: '0.95rem' }}>
                        <thead>
                            <tr>
                                <th rowSpan="2" style={{ backgroundColor: '#b5d3f2', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>
                                    {language === "English" ? "Roll No" : "अ.क्र."}
                                </th>
                                <th rowSpan="2" style={{ backgroundColor: '#b5d3f2', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', minWidth: '200px' }}>
                                    {language === "English" ? "Student Name" : "विद्यार्थ्याचे नाव"}
                                </th>
                                {displaySubjects.map((sub, i) => (
                                    <th key={i} colSpan="2" style={{ backgroundColor: '#b5d3f2', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>{sub}</th>
                                ))}
                                <th colSpan="2" style={{ backgroundColor: '#b5d3f2', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>{language === "English" ? "Total" : "एकूण"}</th>
                                <th rowSpan="2" style={{ backgroundColor: '#b5d3f2', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>{language === "English" ? "Percentage" : "टक्केवारी"}</th>
                            </tr>
                            <tr>
                                {displaySubjects.map((sub, i) => (
                                    <React.Fragment key={`sub-${i}`}>
                                        <th style={{ backgroundColor: '#b5d3f2', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>M.M.</th>
                                        <th style={{ backgroundColor: '#b5d3f2', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>Obt. M.</th>
                                    </React.Fragment>
                                ))}
                                <th style={{ backgroundColor: '#b5d3f2', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>M.M.</th>
                                <th style={{ backgroundColor: '#b5d3f2', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>Obt. M.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedStudents.map((student, index) => {
                                const { totalObtained, totalMax, allAbsent } = calculateTotal(student.srNo);
                                const percentage = getPercentage(totalObtained, totalMax);

                                return (
                                    <tr key={index}>
                                        <td style={{ textAlign: 'center' }}>{student.rollNo}</td>
                                        <td style={{ textAlign: 'left' }}>{student.stdName} {student.stdFather} {student.stdSurname}</td>
                                        {displaySubjects.map((sub, i) => {
                                            const maxMarks = getSubjectMaxMarks(sub);
                                            const mark = getCombinedSubjectMark(student.srNo, sub);
                                            return (
                                                <React.Fragment key={`dm-${i}`}>
                                                    <td style={{ textAlign: 'center' }}>{maxMarks}</td>
                                                    <td style={{ textAlign: 'center' }}>{mark.text}</td>
                                                </React.Fragment>
                                            );
                                        })}
                                        <td style={{ textAlign: 'center' }}>{totalMax}</td>
                                        <td style={{ textAlign: 'center' }}>{allAbsent ? "AB" : totalObtained}</td>
                                        <td style={{ textAlign: 'center' }}>{allAbsent ? "AB" : `${percentage}%`}</td>
                                    </tr>
                                );
                            })}
                            {selectedStudents.length === 0 && (
                                <tr>
                                    <td colSpan={displaySubjects.length * 2 + 5} style={{ textAlign: 'center', padding: '20px' }}>
                                        No Data Available
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default SemesterResult9th10th;
