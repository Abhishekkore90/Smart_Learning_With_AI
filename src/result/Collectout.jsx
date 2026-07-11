import React, { useState, useEffect } from "react";
import { 
  ChevronLeft, 
  AlertTriangle,
  Loader2,
  Check
} from "lucide-react";
import AlertMessage from "../AlertMessage";
import { fetchFirestoreMarks, matchAndMergeMarks } from "./firestoreMarksHelper";
import "../result/result.css";

function Collectout({ initialClass, initialYear, onBack }) {
    const [academicYear, setAcademicYear] = useState(initialYear || localStorage.getItem("cce_academic_year") || "");
    const [classValue, setClassValue] = useState(initialClass || localStorage.getItem("cce_selected_class") || "");
    const [selectedExamName, setSelectedExamName] = useState("First Semester");
    const [division, setDivision] = useState("");
    const [divisions, setDivisions] = useState(["A", "B", "C", "D"]);
    
    const [studentData, setStudentData] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [marksData, setMarksData] = useState({});
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState({});
    const [schoolData, setSchoolData] = useState(null);
    const [schoolName, setSchoolName] = useState("");
    const [schoolLogo, setSchoolLogo] = useState("");
    const [cceSettings, setCceSettings] = useState(null);
    const [language, setLanguage] = useState(localStorage.getItem('language') || 'English');

    const [alertMessage, setAlertMessage] = useState("");
    const [showAlert, setShowAlert] = useState(false);
    const [isCompiling, setIsCompiling] = useState(false);

    const examNames = ["First Semester", "Second Semester"];
    const examNameTranslations = {
        "First Semester": "प्रथम सत्र",
        "Second Semester": "द्वितीय सत्र",
    };
    const udiseNumber = localStorage.getItem("udiseNumber");

    // IndexedDB constants
    const DB_NAME = 'SchoolManagementDB';
    const STUDENT_STORE = 'studentData';
    const SCHOOL_STORE = 'schoolData';
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
        const storedLanguage = localStorage.getItem('language') || 'English';
        setLanguage(storedLanguage);
    }, []);

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
        if (udiseNumber) {
            fetchStudentData();
            fetchSchoolData();
        }
    }, [udiseNumber]);

    useEffect(() => {
        const targetClass = initialClass || localStorage.getItem("cce_selected_class");
        if (targetClass) {
            setClassValue(targetClass);
            fetchSubjectsForClass(targetClass);
        }
    }, [initialClass]);

    useEffect(() => {
        const targetYear = initialYear || localStorage.getItem("cce_academic_year");
        if (targetYear) {
            setAcademicYear(targetYear);
        }
    }, [initialYear]);

    useEffect(() => {
        if (classValue && studentData.length > 0) {
            fetchDivisionsForClass(classValue);
        }
    }, [classValue, studentData]);

    // Filter students by class and division
    useEffect(() => {
        if (classValue && studentData.length > 0) {
            const filtered = studentData.filter(
                (student) => 
                    student.currentClass === classValue && 
                    (division ? student.division === division : true)
            );
            setSelectedStudents(filtered);
        } else {
            setSelectedStudents([]);
        }
    }, [classValue, division, studentData]);

    // Fetch marks when students, exam, year, or subjects change
    useEffect(() => {
        if (selectedStudents.length > 0 && selectedExamName && academicYear && Object.keys(subjects).length > 0) {
            const fetchMarks = async () => {
                const subjectList = Object.keys(subjects);
                const marksDataPromises = selectedStudents.map((student) =>
                    subjectList.map((sub) =>
                        fetchMarksData(student.srNo, student.division, academicYear, selectedExamName, sub)
                    )
                );

                const flattenedPromises = marksDataPromises.flat();
                const marksDataArray = await Promise.all(flattenedPromises);

                const newMarksData = {};
                selectedStudents.forEach((student, index) => {
                    newMarksData[student.srNo] = {};
                    subjectList.forEach((sub, subjectIndex) => {
                        newMarksData[student.srNo][sub] = marksDataArray[index * subjectList.length + subjectIndex] || {};
                    });
                });

                setMarksData(newMarksData);

                // Also fetch from Firestore marks collection and merge
                try {
                    const term = selectedExamName === "First Semester" ? "first" : "second";
                    const firestoreMarks = await fetchFirestoreMarks(classValue, academicYear, term);
                    if (firestoreMarks.length > 0) {
                        const merged = matchAndMergeMarks(selectedStudents, newMarksData, firestoreMarks, subjectList);
                        setMarksData(merged);
                    }
                } catch (fsError) {
                    console.warn("Firestore marks fetch failed for Collectout, using IndexedDB data:", fsError);
                }
            };
            fetchMarks();
        } else {
            setMarksData({});
        }
    }, [selectedStudents, selectedExamName, academicYear, subjects]);

    useEffect(() => {
        const fetchDefaultSettings = async () => {
            try {
                const response = await fetch(`${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/defaultSettings.json`);
                if (response.ok) {
                    const data = await response.json();
                    if (data && !initialYear && !localStorage.getItem("cce_academic_year")) {
                        setAcademicYear(data.defaultYear || ""); 
                    }
                }
            } catch (error) {
                console.error("Error fetching default settings:", error);
            }
        };
        fetchDefaultSettings();
    }, [udiseNumber]);

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
                console.warn('Firebase student data fetch failed, checking IndexedDB:', firebaseError);
            }

            if (fetchedStudents.length === 0) {
                try {
                    const db = await openDB();
                    if (db) {
                        const transaction = db.transaction(STUDENT_STORE, "readonly");
                        const store = transaction.objectStore(STUDENT_STORE);
                        const request = store.getAll();

                        const idbStudents = await new Promise((resolve, reject) => {
                            request.onsuccess = (event) => resolve(event.target.result || []);
                            request.onerror = (event) => reject(event.target.error);
                        });

                        if (idbStudents && idbStudents.length > 0) {
                            fetchedStudents = idbStudents.map((student) => {
                                const keyParts = student.id ? student.id.split("-") : [];
                                const className = keyParts[0] || "";
                                const divisionName = keyParts[1] || "";
                                const srNo = keyParts[keyParts.length - 1] || "";
                                return {
                                    ...student,
                                    currentClass: student.currentClass || className,
                                    division: student.division || divisionName,
                                    srNo: student.srNo || srNo
                                };
                            });
                        }
                    }
                } catch (idbError) {
                    console.warn('IndexedDB student fetch failed:', idbError);
                }
            }

            const activeStudents = fetchedStudents.filter(student => student.isActive !== false);

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
                    classesAndDivisions[student.currentClass][div].push(student.id || student.srNo);
                }
            });

            const updatedStudents = activeStudents.map((student) => {
                const keyParts = student.id ? student.id.split("-") : [];
                const className = keyParts[0] || student.currentClass || "";
                const div = keyParts[1] || student.division || "";
                const srNo = keyParts[keyParts.length - 1] || student.srNo || "";
                return { 
                    ...student, 
                    className: student.currentClass || className, 
                    division: student.division || div, 
                    srNo: student.srNo || srNo 
                };
            });

            const classList = Object.keys(classesAndDivisions);
            setClasses(classList);
            setStudentData(updatedStudents); 
        } catch (error) {
            console.error("Error fetching student data:", error);
        }
    };

    const fetchDivisionsForClass = async (classVal) => {
        try {
            const divisionsForClass = new Set();
            studentData.forEach((student) => {
                if (student.currentClass === classVal && student.division) {
                    divisionsForClass.add(student.division);
                }
            });

            if (divisionsForClass.size === 0) {
                try {
                    const db = await openDB();
                    if (db) {
                        const transaction = db.transaction(STUDENT_STORE, "readonly");
                        const store = transaction.objectStore(STUDENT_STORE);
                        const request = store.getAll();

                        await new Promise((resolve) => {
                            request.onsuccess = (event) => {
                                const students = event.target.result || [];
                                students.forEach((student) => {
                                    if (student.currentClass === classVal && student.division) {
                                        divisionsForClass.add(student.division);
                                    }
                                });
                                resolve();
                            };
                            request.onerror = () => resolve();
                        });
                    }
                } catch (err) {
                    console.warn("Could not read divisions from IndexedDB:", err);
                }
            }

            if (divisionsForClass.size === 0) {
                setDivisions(["A", "B", "C", "D"]);
            } else {
                setDivisions(Array.from(divisionsForClass).sort());
            }
        } catch (error) {
            console.error("Error fetching divisions:", error);
        }
    };

    const fetchSubjectsForClass = async (classVal) => {
        try {
            if (!academicYear) return;
            const url = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/${academicYear}/${classVal}.json`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch subjects for class ${classVal}`);
            }

            const subjectsData = await response.json();
            if (subjectsData) {
                const validSubjects = Object.entries(subjectsData)
                    .filter(([_, value]) => value !== null && value !== undefined)
                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                    .map(([_, subject]) => subject);

                const formattedSubjects = validSubjects.reduce((acc, subject) => {
                    acc[subject] = true;
                    return acc;
                }, {});

                setSubjects(formattedSubjects);
            } else {
                setSubjects({});
            }
        } catch (error) {
            console.error(`Error fetching subjects for class ${classVal}:`, error);
        }
    };

    const fetchMarksData = async (srNo, studentDivision, acadYear, examName, subject) => {
        try {
            const db = await openDB();
            const transaction = db.transaction(STUDENT_STORE, "readonly");
            const store = transaction.objectStore(STUDENT_STORE);
            const key = `${classValue}-${studentDivision || ""}-${srNo}`;
            const request = store.get(key);
            return new Promise((resolve) => {
                request.onsuccess = (event) => {
                    const data = event.target.result;
                    if (
                        data &&
                        data.result &&
                        data.result[acadYear] &&
                        data.result[acadYear][examName] &&
                        data.result[acadYear][examName][subject]
                    ) {
                        resolve(data.result[acadYear][examName][subject]);
                    } else {
                        resolve({});
                    }
                };
                request.onerror = () => {
                    resolve({});
                };
            });
        } catch (error) {
            console.error("Error fetching marks data:", error);
            return {};
        }
    };

    const fetchSchoolData = async () => {
        try {
            const db = await openDB();
            const transaction = db.transaction(SCHOOL_STORE, "readonly");
            const store = transaction.objectStore(SCHOOL_STORE);
            const request = store.get(udiseNumber);

            return new Promise((resolve) => {
                request.onsuccess = (event) => {
                    const data = event.target.result;
                    if (data) {
                        setSchoolData(data);
                        if (!schoolName) setSchoolName(data.schoolName || "");
                        if (!schoolLogo) setSchoolLogo(data.schoolLogo || "");
                        resolve(data);
                    }
                };
                request.onerror = () => {
                    resolve(null);
                };
            });
        } catch (error) {
            console.error("Error accessing IndexedDB:", error);
        }
    };

    const getGrade = (total) => {
        if (total >= 91) return 'A1';
        if (total >= 81) return 'A2';
        if (total >= 71) return 'B1';
        if (total >= 61) return 'B2';
        if (total >= 51) return 'C1';
        if (total >= 41) return 'C2';
        if (total >= 33) return 'D1';
        if (total >= 21) return 'D2';
        return 'Ab';
    };

    const getGradeColor = (total) => {
        if (total >= 91) return '#28a745';
        if (total >= 81) return '#5cb85c';
        if (total >= 71) return '#5bc0de';
        if (total >= 61) return '#0275d8';
        if (total >= 51) return '#f0ad4e';
        if (total >= 41) return '#ff9800';
        if (total >= 33) return '#ff5722';
        if (total >= 21) return '#e53935';
        return '#dc3545';
    };

    const handlePrint = () => {
        const tableElement = document.getElementById("printableTable");
        if (tableElement) {
            if (selectedStudents.length === 0) {
                setAlertMessage(language === "English" ? "No student list available." : "विद्यार्थी यादी उपलब्ध नाही.");
                return;
            }
            if (Object.keys(subjects).length === 0) {
                setAlertMessage(language === "English" ? "No subject sequence configured." : "विषय यादी उपलब्ध नाही.");
                return;
            }

            setIsCompiling(true);
            const tableContent = tableElement.outerHTML;
            const finalSchoolName = schoolName || schoolData?.schoolName || " ";
            const finalSchoolLogo = schoolLogo || schoolData?.schoolLogo || " ";

            const printWindow = window.open("", "", "height=600,width=800");
            printWindow.document.write("<html><head><title>Print</title>");
            printWindow.document.write(`
                <style>
                    @page {
                        size: A4 Landscape;
                        margin: 5mm;
                    }
                    body {
                        font-family: 'Arial', sans-serif;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 15px;
                    }
                    th, td {
                        border: 1px solid #000;
                        padding: 5px;
                        text-align: center;
                        font-size: 10px;
                    }
                    thead th {
                        background-color: #f4f4f4;
                        font-weight: bold;
                    }
                    .rotate-print-header {
                        padding: 7px 3px;
                        text-align: center;
                        writing-mode: vertical-rl;
                        transform: rotate(180deg);
                        width: 28px;
                        height: 100px;
                        white-space: nowrap;
                        vertical-align: middle;
                        background-color: #f4f4f4;
                        font-weight: bold;
                    }
                    .rotate-print-header div {
                        writing-mode: vertical-rl;
                        transform: rotate(180deg);
                    }
                    .school-header {
                        display: flex;
                        align-items: center;
                        justify-content: flex-start;
                        margin-bottom: 20px;
                        padding: 10px;
                        border: 1px solid #ccc;
                    }
                    .school-header img {
                        max-height: 70px;
                        margin-right: 15px;
                    }
                    .school-header h1 {
                        font-size: 22px;
                        margin: 0;
                        text-align: left;
                        flex: 1;
                    }
                    .school-header p {
                        margin: 0;
                        font-size: 12px;
                        font-weight: bold;
                        text-align: right;
                    }
                </style>
            `);
            printWindow.document.write("</head><body>");

            const img = printWindow.document.createElement("img");
            img.src = finalSchoolLogo;

            const printHeader = (hasLogo = true) => {
                const logoHtml = hasLogo ? `<img src="${finalSchoolLogo}" alt="School Logo">` : "";
                printWindow.document.write(`
                    <div class="school-header">
                        ${logoHtml}
                        <div style="flex: 1; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h1 style="margin: 0;">${finalSchoolName}</h1>
                                ${cceSettings?.address ? `<p style="margin: 2px 0; font-size: 11px; color: #555;">${cceSettings.address}</p>` : ""}
                                ${cceSettings?.medium ? `<p style="margin: 2px 0; font-size: 11px; color: #555;">माध्यम: ${cceSettings.medium}</p>` : ""}
                                ${cceSettings?.teacherName ? `<p style="margin: 2px 0; font-size: 11px; color: #333;">वर्गशिक्षक: <strong>${cceSettings.teacherName}</strong>${cceSettings?.teacherMobile ? ` | मो: ${cceSettings.teacherMobile}` : ""}</p>` : ""}
                                ${cceSettings?.principalName ? `<p style="margin: 2px 0; font-size: 11px; color: #333;">मुख्याध्यापक: <strong>${cceSettings.principalName}</strong></p>` : ""}
                            </div>
                            <div style="text-align: right;">
                                <p style="margin: 0; font-size: 13px;">${language === "English" ? "Class" : "वर्ग"}: ${classValue}</p>
                                <p style="margin: 0; font-size: 13px;">${language === "English" ? "Division" : "तुकडी"}: ${division || "-"}</p>
                                <p style="margin: 0; font-size: 13px;">${language === "English" ? "Semester" : "सत्र"}: ${language === "English" ? selectedExamName : examNameTranslations[selectedExamName]}</p>
                            </div>
                        </div>
                    </div>
                    <h2 style="text-align: center; font-size: 16px; margin: 10px 0;">${language === "English" ? "Grade-wise Result Compilation Form" : "श्रेणीनिहाय निकाल संकलन प्रपत्र"}</h2>
                `);

                // Convert th class rotate-90 to rotate-print-header for proper rotating layout in printed sheet
                const processedTableContent = tableContent
                    .replace(/class="rotate-90"/g, 'class="rotate-print-header"')
                    .replace(/<th class="rotate-print-header">([^<]+)<\/th>/g, 
                             '<th class="rotate-print-header"><div>$1</div></th>');

                printWindow.document.write(processedTableContent);
                printWindow.document.write("</body></html>");
                printWindow.document.close();
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    setIsCompiling(false);
                }, 800);
            };

            img.onload = function() {
                printHeader(true);
            };

            img.onerror = function() {
                printHeader(false);
            };
        } else {
            console.error("Table element with ID 'printableTable' not found.");
        }
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
                            {language === "English" ? "Compilation Form" : "श्रेणीनिहाय-निकाल-संकलन-प्रपत्र"}
                        </h2>
                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mt-0.5">
                            Grade-wise Result Compilation Form
                        </p>
                    </div>
                </div>
                <span className="text-xs font-bold text-emerald-600/80">
                    {language === "English" ? "Class" : "वर्ग"}: {classValue}
                </span>
            </div>

            {/* Settings Card */}
            <div className="flex-1 max-w-2xl mx-auto w-full space-y-6">
                {/* Semester Tab Selection */}
                <div className="flex bg-[#121c16] rounded-full p-1 border border-emerald-950/60 max-w-sm mx-auto shadow-inner">
                    {examNames.map((examName) => (
                        <button
                            key={examName}
                            onClick={() => setSelectedExamName(examName)}
                            className={`flex-1 py-2.5 rounded-full font-bold text-xs transition-all cursor-pointer ${
                                selectedExamName === examName 
                                    ? "bg-[#223d2e] text-[#a2d8b4] shadow-md border border-emerald-900/30" 
                                    : "text-emerald-600/70 hover:text-emerald-500"
                            }`}
                        >
                            {language === "English" ? examName : examNameTranslations[examName]}
                        </button>
                    ))}
                </div>

                {/* Division Selection */}
                {divisions.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-[#a2d8b4]/90 text-center">
                            {language === "English" ? "Select Division" : "तुकडी निवडा"}
                        </h3>
                        <div className="flex flex-wrap justify-center gap-3">
                            <button
                                onClick={() => setDivision("")}
                                className={`px-5 py-2 rounded-2xl font-bold text-xs transition-all cursor-pointer border ${
                                    division === ""
                                        ? "bg-[#223d2e] border-emerald-500 text-[#a2d8b4] shadow-md"
                                        : "bg-[#121c16] border-emerald-950/60 text-emerald-600/70 hover:text-[#a2d8b4]"
                                }`}
                            >
                                {language === "English" ? "All Student" : "सर्व विद्यार्थी"}
                            </button>
                            {divisions
                                .filter((div) => div !== null && div !== undefined && div.trim() !== "")
                                .map((div) => (
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

                {/* Informational Intro Paragraph */}
                <div className="space-y-4 pt-4 text-center">
                    <p className="text-sm text-emerald-100/90 leading-relaxed max-w-md mx-auto">
                        {language === "English" 
                            ? "Hello, the grade-wise result compilation form compiles the formative, summative, total, and grade for each subject of all students in the class."
                            : "नमस्कार, श्रेणीनिहाय निकाल संकलन प्रपत्र जोडला आहे. हा तक्ता सर्व विषयांच्या आकारिक व संकलित मूल्यमापन गुणांसह एकत्रित निकाल पत्रक तयार करेल."}
                    </p>
                </div>

                {/* Warning / Disclaimers Blocks */}
                <div className="bg-[#121c16]/50 border border-emerald-950/40 rounded-2xl p-5 text-xs text-emerald-400/80 leading-relaxed space-y-3 max-w-md mx-auto">
                    {/* School Name Check */}
                    <div className="flex items-start gap-2.5">
                        {(schoolName || schoolData?.schoolName) ? (
                            <>
                                <Check size={15} className="shrink-0 mt-0.5 text-emerald-400" />
                                <span>
                                    {language === "English"
                                        ? `School Name: ${schoolName || schoolData.schoolName}`
                                        : `शाळेचे नाव: ${schoolName || schoolData.schoolName}`}
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
                                ? "This sheet will be printed on landscape A4 paper."
                                : "हा तक्ता landscape A4 पानांवर प्रिंट केला जाईल."}
                        </span>
                    </div>
                </div>

                {/* Bottom Compilation Trigger */}
                <button
                    onClick={handlePrint}
                    disabled={isCompiling}
                    className="w-full py-4 bg-[#98d9a4] hover:bg-[#8ad499] active:scale-[0.99] text-[#0d1310] font-black text-sm rounded-2xl tracking-wide transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer duration-200 disabled:opacity-50"
                >
                    {isCompiling ? (
                        <>
                            <Loader2 className="size-4 animate-spin" />
                            <span>
                                {language === "English" ? "Compiling results..." : "निकाल संकलित करत आहे..."}
                            </span>
                        </>
                    ) : (
                        <span>{language === "English" ? "Generate / Print" : "तयार करा"}</span>
                    )}
                </button>

                {/* Live Compilation Form Table Section */}
                {Object.keys(subjects).length > 0 && selectedStudents.length > 0 && (
                    <div className="mt-8 bg-[#121c16]/30 border border-emerald-950/40 rounded-2xl p-5 shadow-inner">
                        <h3 className="text-sm font-bold text-white mb-4 text-center">
                            {language === "English" ? "Live Compilation Form" : "थेट संकलन प्रपत्र"}
                        </h3>
                        <div className="overflow-x-auto rounded-xl border border-emerald-950/40 max-h-[500px]">
                            <table className="w-full border-collapse text-xs text-center" id="printableTable">
                                <thead className="sticky top-0 bg-[#223d2e] text-white z-20">
                                    <tr>
                                        <th className="p-3 border border-emerald-950/40 font-bold sticky left-0 bg-[#223d2e] z-30 min-w-[70px]">
                                            {language === "English" ? "Roll No" : "हजेरी क्र."}
                                        </th>
                                        <th className="p-3 border border-emerald-950/40 font-bold sticky left-[70px] bg-[#223d2e] z-30 text-left min-w-[150px]">
                                            {language === "English" ? "Student Name" : "विद्यार्थ्याचे नाव"}
                                        </th>
                                        {Object.keys(subjects).map((subj, index) => (
                                            <th key={index} colSpan="4" className="p-3 border border-emerald-950/40 font-bold text-emerald-400">
                                                {subj}
                                            </th>
                                        ))}
                                    </tr>
                                    <tr>
                                        <th className="p-2 border border-emerald-950/40 sticky left-0 bg-[#223d2e] z-30"></th>
                                        <th className="p-2 border border-emerald-950/40 sticky left-[70px] bg-[#223d2e] z-30"></th>
                                        {Object.keys(subjects).map((subj, index) => (
                                            <React.Fragment key={index}>
                                                <th className="p-2 border border-emerald-950/40 font-bold text-emerald-300">
                                                    {language === "English" ? "Akarik" : "आकारिक"}
                                                </th>
                                                <th className="p-2 border border-emerald-950/40 font-bold text-emerald-300">
                                                    {language === "English" ? "Sanklit" : "संकलित"}
                                                </th>
                                                <th className="p-2 border border-emerald-950/40 font-bold text-emerald-300">
                                                    {language === "English" ? "Total" : "एकूण"}
                                                </th>
                                                <th className="p-2 border border-emerald-950/40 font-bold text-emerald-300">
                                                    {language === "English" ? "Grade" : "श्रेणी"}
                                                </th>
                                            </React.Fragment>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-emerald-950/30">
                                    {[...selectedStudents]
                                        .sort((a, b) => a.rollNo - b.rollNo)
                                        .map((student) => (
                                            <tr key={student.srNo} className="hover:bg-[#121c16]/40 transition-colors">
                                                <td className="p-2.5 border border-emerald-950/40 font-extrabold text-white sticky left-0 bg-[#14231b] z-10">
                                                    {student.rollNo}
                                                </td>
                                                <td className="p-2.5 border border-emerald-950/40 text-left font-semibold text-white sticky left-[70px] bg-[#14231b] z-10 truncate max-w-[150px]">
                                                    {student.stdName} {student.stdFather} {student.stdSurname}
                                                </td>
                                                {Object.keys(subjects).map((subj, idx) => {
                                                    const akarTotal = marksData[student.srNo]?.[subj]?.Akarik?.Total ?? '-';
                                                    const sankTotal = marksData[student.srNo]?.[subj]?.Sanklik?.Total ?? '-';
                                                    const totalObt = (marksData[student.srNo]?.[subj]?.Akarik?.Total ?? 0) + (marksData[student.srNo]?.[subj]?.Sanklik?.Total ?? 0);
                                                    const hasMarks = (marksData[student.srNo]?.[subj]?.Akarik?.Total !== undefined) || (marksData[student.srNo]?.[subj]?.Sanklik?.Total !== undefined);
                                                    return (
                                                        <React.Fragment key={idx}>
                                                            <td className="p-2 border border-emerald-950/40 text-[#a2d8b4]/90">{akarTotal}</td>
                                                            <td className="p-2 border border-emerald-950/40 text-[#a2d8b4]/90">{sankTotal}</td>
                                                            <td className="p-2 border border-emerald-950/40 font-semibold text-white">{hasMarks ? totalObt : '-'}</td>
                                                            <td className="p-2 border border-emerald-950/40 font-bold" style={{ color: getGradeColor(totalObt) }}>
                                                                {hasMarks ? getGrade(totalObt) : '-'}
                                                            </td>
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Collectout;