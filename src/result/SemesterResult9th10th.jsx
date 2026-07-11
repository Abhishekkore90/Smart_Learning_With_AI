import React, { useState, useEffect } from "react";
import "../result/result.css";

function CombinedResult9th10th() {
  const [academicYear, setAcademicYear] = useState("");
  const [classValue, setClassValue] = useState("");
  const [division, setDivision] = useState("");
  const [subject, setSubject] = useState("");
  
  const [studentData, setStudentData] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [classes, setClasses] = useState([]);
  const [divisions, setDivisions] = useState(["A", "B", "C", "D"]);
  const [subjects, setSubjects] = useState({});
  const [schoolData, setSchoolData] = useState(null); 

  const examNames = [
    "Unit Test I",
    "Unit Test II",
    "Semester First ",
    "Unit Test III",
    "Unit Test IV",
    "Semester Second "
  ];

  const udiseNumber = localStorage.getItem("udiseNumber");
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'English');

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

  const handleAcademicYearChange = (e) => setAcademicYear(e.target.value);
  const handleSubjectChange = (e) => setSubject(e.target.value);

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
      const url = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/ssc/${academicYear}/${classValue}/${division}.json`;
      const response = await fetch(url);
      if (response.ok) {
        const subjectsData = await response.json();
        if (subjectsData) {
          const validSubjects = Object.entries(subjectsData)
            .filter(([_, value]) => value !== null && value !== undefined)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([_, sub]) => sub);
          
          const formattedSubjects = validSubjects.reduce((acc, sub) => {
            acc[sub] = true;
            return acc;
          }, {});
          
          setSubjects(formattedSubjects);
          setSubject(Object.keys(formattedSubjects)[0] || "");
        } else {
          setSubjects({});
          setSubject("");
        }
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  const handleClassChange = async (e) => {
    const selectedClass = e.target.value;
    setClassValue(selectedClass);
    setDivision("");
    setSubject("");
    fetchSubjectsForClass(selectedClass);

    if (selectedClass) {
      await fetchDivisionsForClass(selectedClass);
    }
    const filteredStudents = studentData.filter((student) => student.currentClass === selectedClass);
    setSelectedStudents(filteredStudents);
  };

  const handleDivisionChange = (e) => {
    const selectedDivision = e.target.value;
    setDivision(selectedDivision);
    const filteredStudents = studentData.filter((student) => student.currentClass === classValue && student.division === selectedDivision);
    setSelectedStudents(filteredStudents);
  };

  const fetchMarksData = async (srNo, examName) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STUDENT_STORE, "readonly");
      const store = transaction.objectStore(STUDENT_STORE);
      const request = store.get(`${classValue}-${division}-${srNo}`);
      return new Promise((resolve) => {
        request.onsuccess = (event) => {
          const sData = event.target.result;
          if (sData && sData.result && sData.result[academicYear] && sData.result[academicYear][examName] && sData.result[academicYear][examName][subject]) {
            resolve(sData.result[academicYear][examName][subject]);
          } else if (sData && sData.icseResult && sData.icseResult[academicYear] && sData.icseResult[academicYear][examName] && sData.icseResult[academicYear][examName][subject]) {
             resolve(sData.icseResult[academicYear][examName][subject]);
          } else {
            resolve({});
          }
        };
        request.onerror = () => resolve({});
      });
    } catch (error) {
      return {};
    }
  };

  const fetchAllMarks = async () => {
    try {
      const filteredStudents = studentData.filter((student) => student.currentClass === classValue && (division ? student.division === division : true));
      if (filteredStudents.length === 0 || !subject) {
        setMarksData({});
        return;
      }

      const allMarksData = {};

      for (const student of filteredStudents) {
        allMarksData[student.srNo] = {};
        for (const examName of examNames) {
          const marks = await fetchMarksData(student.srNo, examName);
          allMarksData[student.srNo][examName] = marks;
        }
      }
      setMarksData(allMarksData);
    } catch (error) {
      console.error("Error fetching marks:", error);
    }
  };

  useEffect(() => {
    if (classValue && academicYear && subject) {
      fetchAllMarks();
    }
  }, [classValue, division, academicYear, subject, studentData]);

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
          <p>Class: ${classValue} ${division} | Subject: ${subject}</p>
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

  const getExamMaxMarks = (examName) => {
    if (examName.includes("Semester")) return 50;
    return 25;
  };

  const calculateTotal = (studentSrNo) => {
    let obtainedTotal = 0;
    const studentMarks = marksData[studentSrNo];
    if (!studentMarks) return { obtained: 0, max: 200, status: "AB" };
    
    let allAbsent = true;
    
    examNames.forEach(examName => {
      const m = studentMarks[examName];
      if (m && m.obtainMarks && m.obtainMarks.toLowerCase() !== 'ab') {
        obtainedTotal += parseFloat(m.obtainMarks) || 0;
        allAbsent = false;
      }
    });

    return { obtained: obtainedTotal, max: 200, status: allAbsent ? "AB" : obtainedTotal };
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f7fa' }}>
      <div className="p-3 main-content-of-page" style={{ padding: '20px', maxWidth: '100%', overflowX: 'auto' }}>
        <h3 style={{ color: 'rgb(3, 54, 94)', marginBottom: '25px', textAlign: 'center', fontSize: '1.8rem', fontWeight: '600' }} className="title">
          {language === "English" ? "9th & 10th Combined Result" : "9वी आणि 10वी एकत्रित निकाल"}
        </h3>
        
        <table className="table table-striped table-bordered" style={{ width: '100%', marginBottom: '25px', backgroundColor: '#fff', borderRadius: '8px' }}>
          <tbody>
            <tr>
              <th>{language === "English" ? "Academic Year" : "शैक्षणिक वर्ष"}</th>
              <td>
                <select value={academicYear} onChange={handleAcademicYearChange} className="form-control custom-select">
                  <option value="">{language === "English" ? "Select Year" : "वर्ष निवडा"}</option>
                  <option value="2023-2024">2023-2024</option>
                  <option value="2024-2025">2024-2025</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2026-2027">2026-2027</option>
                </select>
              </td>
            </tr>
            <tr>
              <th>{language === "English" ? "Class" : "वर्ग"}</th>
              <td>
                <select value={classValue} onChange={handleClassChange} className="form-control custom-select">
                  <option value="">{language === "English" ? "Select Class" : "वर्ग निवडा"}</option>
                  {["Class IX", "Class X"].map(cls => <option key={cls} value={cls}>{cls}</option>)}
                </select>
              </td>
            </tr>
            <tr>
              <th>{language === "English" ? "Division" : "तुकडी"}</th>
              <td>
                <select value={division} onChange={handleDivisionChange} className="form-control custom-select">
                  <option value="">{language === "English" ? "Select Division" : "तुकडी निवडा"}</option>
                  {divisions.map(div => <option key={div} value={div}>{div}</option>)}
                </select>
              </td>
            </tr>
            <tr>
              <th>{language === "English" ? "Subject" : "विषय"}</th>
              <td>
                <select value={subject} onChange={handleSubjectChange} className="form-control custom-select">
                  <option value="">{language === "English" ? "Select Subject" : "विषय निवडा"}</option>
                  {Object.keys(subjects).map((sub, i) => <option key={i} value={sub}>{sub}</option>)}
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
          <table className="table table-bordered" id="printableTable" style={{ minWidth: '1200px', fontSize: '0.95rem' }}>
            <thead style={{ backgroundColor: '#cce5ff' }}>
              <tr>
                <th rowSpan="2" style={{ verticalAlign: 'middle', textAlign: 'center', backgroundColor: '#b8daff' }}>Roll No</th>
                <th rowSpan="2" style={{ verticalAlign: 'middle', textAlign: 'center', backgroundColor: '#b8daff' }}>Name</th>
                {examNames.map((exam, i) => (
                  <th colSpan="2" key={i} style={{ textAlign: 'center', backgroundColor: '#b8daff' }}>{exam}</th>
                ))}
                <th colSpan="2" style={{ textAlign: 'center', backgroundColor: '#b8daff' }}>Total Marks</th>
              </tr>
              <tr>
                {examNames.map((_, i) => (
                  <React.Fragment key={i}>
                    <th style={{ textAlign: 'center', backgroundColor: '#e2e3e5' }}>M.M.</th>
                    <th style={{ textAlign: 'center', backgroundColor: '#e2e3e5' }}>Obt. M.</th>
                  </React.Fragment>
                ))}
                <th style={{ textAlign: 'center', backgroundColor: '#e2e3e5' }}>M.M.</th>
                <th style={{ textAlign: 'center', backgroundColor: '#e2e3e5' }}>Obt. M.</th>
              </tr>
            </thead>
            <tbody>
              {selectedStudents.map((student, index) => {
                const total = calculateTotal(student.srNo);
                return (
                  <tr key={index}>
                    <td style={{ textAlign: 'center' }}>{student.rollNo}</td>
                    <td style={{ textAlign: 'left' }}>{student.stdName} {student.stdFather} {student.stdSurname}</td>
                    {examNames.map((exam, i) => {
                      const m = marksData[student.srNo]?.[exam];
                      const obtMarks = m?.obtainMarks || "AB";
                      return (
                        <React.Fragment key={i}>
                          <td style={{ textAlign: 'center' }}>{getExamMaxMarks(exam)}</td>
                          <td style={{ textAlign: 'center' }}>{obtMarks}</td>
                        </React.Fragment>
                      );
                    })}
                    <td style={{ textAlign: 'center' }}>{total.max}</td>
                    <td style={{ textAlign: 'center' }}>{total.status}</td>
                  </tr>
                );
              })}
              {selectedStudents.length === 0 && (
                <tr>
                  <td colSpan={examNames.length * 2 + 4} style={{ textAlign: 'center', padding: '20px' }}>
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

export default CombinedResult9th10th;
