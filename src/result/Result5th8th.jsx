import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import "../result/result.css";
import { Link } from '@tanstack/react-router';
// import Sidebar from '../../components/Sidebar';
import AlertMessage from "../../AlertMessage";

const Result5th8th = () => {
  const [academicYear, setAcademicYear] = useState('');
  const [classValue, setClassValue] = useState('');
  const [selectedExamName, setSelectedExamName] = useState('');
  const [studentData, setStudentData] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [classes, setClasses] = useState([]);
  const [selectedStudentResults, setSelectedStudentResults] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [schoolLogo, setSchoolLogo] = useState('');
  const [division, setDivision] = useState("");
  const [divisions, setDivisions] = useState(["A", "B", "C", "D"]);
  const udiseNumber = localStorage.getItem("udiseNumber");
  const examNames = ['First Semester', 'Second Semester', 'All Exams'];
  const examNameTranslations = {
    "First Semester": "प्रथम सत्र",
    "Second Semester": "द्वितीय सत्र",
    "All Exams": "सर्व परीक्षा",
  };
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'English');

  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);



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
    const fetchDefaultSettings = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/defaultSettings.json`);
        if (response.ok) {
          const data = await response.json();

          if (data) {
            setAcademicYear(data.defaultYear || "");
          }
        } else {
          console.error("Failed to fetch default settings.");
        }
      } catch (error) {
        console.error("Error fetching default settings:", error);
      }
    };

    fetchDefaultSettings();
  }, [udiseNumber]);

  const [subjectSequence, setSubjectSequence] = useState([]); // New state for subject sequence
  useEffect(() => {
    if (academicYear && classValue) {
      fetchSubjectSequence();
    }
  }, [academicYear, classValue]);

  const fetchSubjectSequence = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/${academicYear}/${classValue}.json`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch subject sequence');
      }
      const data = await response.json();
      // Assuming the data is an object with numeric keys
      const orderedSubjects = Object.keys(data)
        .sort((a, b) => parseInt(a) - parseInt(b)) // Sort by numeric keys
        .map((key) => data[key]); // Map keys to subject names
      setSubjectSequence(orderedSubjects);
    } catch (error) {
      console.error('Error fetching subject sequence:', error);
    }
  };


  useEffect(() => {
    const storedLanguage = localStorage.getItem('language') || 'English';
    setLanguage(storedLanguage);
  }, []);



  const fetchSchoolName = async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction(SCHOOL_STORE, 'readonly');
      const store = transaction.objectStore(SCHOOL_STORE);

      // Get the school data using the udiseNumber as key
      const request = store.get(udiseNumber);

      request.onsuccess = (event) => {
        const schoolData = event.target.result;
        if (schoolData) {
          // Set school name and logo from IndexedDB
          setSchoolName(schoolData.schoolName || '-');
          setSchoolLogo(schoolData.schoolLogo || '');

          // Update language if available in school data
          if (schoolData.language) {
            setLanguage(schoolData.language);
            localStorage.setItem('language', schoolData.language);
          }
        } else {
          console.log('No school data found in IndexedDB');
          // Fallback to empty values if no data found
          setSchoolName('-');
          setSchoolLogo('');
        }
      };

      request.onerror = (event) => {
        console.error('Error fetching school data from IndexedDB:', event.target.error);
        // Fallback to empty values on error
        setSchoolName('-');
        setSchoolLogo('');
      };
    } catch (error) {
      console.error('Error accessing IndexedDB:', error);
      // Fallback to empty values on error
      setSchoolName('-');
      setSchoolLogo('');
    }
  };

  useEffect(() => {
    fetchSchoolName();
    fetchStudentData();

  }, [udiseNumber]); // Add udiseNumber as dependency

  useEffect(() => {
    if (selectedExamName && classValue && academicYear) {
      fetchMarksForSelectedSubject();
    }
  }, [selectedExamName, classValue, academicYear]);

  const handleAcademicYearChange = (e) => setAcademicYear(e.target.value);
  // const handleClassChange = (e) => {
  //   setClassValue(e.target.value);
  //   fetchSubjectsForClass(e.target.value);
  // };
  const handleExamNameChange = (e) => {
    // Prevent changing the selected exam name from "Second Semester" or "All Exams"
    if (e.target.value !== "Second Semester" && e.target.value !== "All Exams") {
      return;
    }
    setSelectedExamName(e.target.value);
  };

  const filteredExamNames = examNames.filter((examName) => examName === "Second Semester" || examName === "All Exams");

  // IndexedDB constants
  const DB_NAME = 'SchoolManagementDB';
  const STUDENT_STORE = 'studentData';
  const DB_VERSION = 1;
  const ATTENDANCE_STORE = 'attendance';


  const SCHOOL_STORE = 'schoolData';


  // Function to open IndexedDB
  const openDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error("IndexedDB error:", event.target.error);
        reject(event.target.error);
      };

      request.onsuccess = (event) => {
        const db = event.target.result;
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(STUDENT_STORE)) {
          db.createObjectStore(STUDENT_STORE, { keyPath: "id" });
        }

        // Add SCHOOL_STORE if it doesn't exist
        if (!db.objectStoreNames.contains(SCHOOL_STORE)) {
          db.createObjectStore(SCHOOL_STORE, { keyPath: "udiseNumber" });
        }
      };
    });
  };
  const sortClasses = (classesList, lang) => {
    const classOrder = {
      "Class I": 1, "Class II": 2, "Class III": 3, "Class IV": 4, "Class V": 5,
      "Class VI": 6, "Class VII": 7, "Class VIII": 8, "Class IX": 9, "Class X": 10,
      "Class XI": 11, "Class XII": 12,
      "1st": 1, "2nd": 2, "3rd": 3, "4th": 4, "5th": 5, "6th": 6, "7th": 7, "8th": 8, "9th": 9, "10th": 10, "11th": 11, "12th": 12,
      "इयत्ता पहिली": 1, "इयत्ता दुसरी": 2, "इयत्ता तिसरी": 3, "इयत्ता चौथी": 4, "इयत्ता पाचवी": 5, "इयत्ता सहावी": 6,
      "इयत्ता सातवी": 7, "इयत्ता आठवी": 8, "इयत्ता नववी": 9, "इयत्ता दहावी": 10, "इयत्ता अकरावी": 11, "इयत्ता बारावी": 12,
      "पहिली": 1, "दुसरी": 2, "तिसरी": 3, "चौथी": 4, "पाचवी": 5, "सहावी": 6,
      "सातवी": 7, "आठवी": 8, "नववी": 9, "दहावी": 10, "अकरावी": 11, "बारावी": 12,
    };
    return [...classesList].sort((a, b) => (classOrder[a] || 99) - (classOrder[b] || 99));
  };

  // Function to fetch student data from Firebase + IndexedDB
  const fetchStudentData = async () => {
    try {
      let fetchedStudents = [];

      // 1. Try to fetch from Firebase
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
        console.warn('Firebase fetch student data failed, checking IndexedDB:', firebaseError);
      }

      // 2. Try to fetch from IndexedDB if Firebase was empty
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
          }
        } catch (idbError) {
          console.warn('IndexedDB fetch student data failed:', idbError);
        }
      }

      // Process and set state
      const activeStudents = fetchedStudents.filter(student => student.isActive !== false);

      const classesAndDivisions = {};
      activeStudents.forEach((student) => {
        if (student && student.currentClass) {
          if (!classesAndDivisions[student.currentClass]) {
            classesAndDivisions[student.currentClass] = {};
          }
          const division = student.division || "";
          if (!classesAndDivisions[student.currentClass][division]) {
            classesAndDivisions[student.currentClass][division] = [];
          }
          classesAndDivisions[student.currentClass][division].push(student.id || student.srNo);
        }
      });

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

      const classList = Object.keys(classesAndDivisions);
      setClasses(classList);
      setStudentData(updatedStudents); // Store updated students 
    } catch (error) {
      console.error("Error fetching student data:", error);
    }
  };

  const fetchDivisionsForClass = async (classValue) => {
    try {
      const divisionsForClass = new Set();
      studentData.forEach((student) => {
        if (student.currentClass === classValue && student.division) {
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
                  if (student.currentClass === classValue && student.division) {
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
        setDivisions(Array.from(divisionsForClass)); // Update divisions state
      }
    } catch (error) {
      console.error("Error fetching divisions:", error);
    }
  };

  // Load student data and marks from IndexedDB
  useEffect(() => {
    const loadData = async () => {
      try {
        const db = await openDB();
        await fetchStudentData(db);
      } catch (error) {
        console.error("Error loading data from IndexedDB:", error);
      }
    };

    loadData();
  }, []);


  const handleClassChange = async (e) => {
    const selectedClass = e.target.value;
    setClassValue(selectedClass); // Update the class value
    setDivision(""); // Reset division when class changes
    fetchSubjectsForClass(e.target.value);

    if (selectedClass) {
      await fetchDivisionsForClass(selectedClass);
    }

    // Filter students based on the selected class
    const filteredStudents = studentData.filter((student) => student.currentClass === selectedClass);
    setSelectedStudents(filteredStudents);
  };





  const fetchSubjectsForClass = async (classValue) => {
    try {
      if (!academicYear) {
        console.error('Academic year is not set');
        return;
      }
    } catch (error) {
      console.error(`Error fetching subjects for class ${classValue} and academic year ${academicYear}:`, error);
    }
  };

  const fetchMarksForSelectedSubject = async () => {
    try {
      const selectedStudents = studentData.filter(
        (student) => student.currentClass === classValue
      );
      setSelectedStudents(selectedStudents);
      const marksDataPromises = selectedStudents.map(async (student) => {
        const studentMarks = await fetchMarksData(
          student.srNo,
          academicYear,
          selectedExamName
        );
        return { srNo: student.srNo, marks: studentMarks };
      });

      const marksDataArray = await Promise.all(marksDataPromises);
      const marksData = marksDataArray.reduce((acc, { srNo, marks }) => {
        acc[srNo] = marks;
        return acc;
      }, {});

      setMarksData(marksData);
    } catch (error) {
      console.error('Error fetching marks data:', error);
    }
  };

  const fetchMarksData = async (key, academicYear, examName) => {
    try {
      console.log('Fetching Marks Data with:', {
        key,
        academicYear,
        examName
      });

      const db = await openDB();
      const transaction = db.transaction(STUDENT_STORE, "readonly");
      const store = transaction.objectStore(STUDENT_STORE);

      // Find the correct key based on the numeric identifier
      const allKeys = await new Promise((resolve, reject) => {
        const keysRequest = store.getAllKeys();
        keysRequest.onsuccess = (event) => resolve(event.target.result);
        keysRequest.onerror = (event) => reject(event.target.error);
      });

      // Improved key matching to handle more flexible key formats
      const matchingKey = allKeys.find(storeKey =>
        typeof storeKey === 'string' &&
        (storeKey.endsWith(`-${key}`) || storeKey === key)
      );

      console.log('Matching Key:', matchingKey);

      if (!matchingKey) {
        console.warn('No matching key found for:', key);
        return null;
      }

      const request = store.get(matchingKey);

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const studentData = event.target.result;

          console.log('Raw Student Data:', studentData);

          // More robust nested structure checking
          if (!studentData || !studentData.result) {
            console.warn('No result data found for student');
            resolve(null);
            return;
          }

          const academicYearData = studentData.result[academicYear];
          if (!academicYearData) {
            console.warn(`No data found for academic year: ${academicYear}`);
            resolve(null);
            return;
          }

          const examData = academicYearData[examName];
          if (!examData) {
            console.warn(`No exam data found for: ${examName}`);
            resolve(null);
            return;
          }

          const result = {
            studentInfo: {
              name: studentData.stdName,
              surname: studentData.stdSurname,
              class: studentData.currentClass,
              rollNo: studentData.rollNo
            }
          };

          // Dynamically process subjects, including specialized structures
          Object.keys(examData).forEach((subject) => {
            // Skip 'remark' and other non-subject keys
            if (subject === 'remark') {
              result.remark = examData[subject];
              return;
            }

            // Explicitly handle 'nondi' key
            if (subject === 'nondi') {
              result.nondi = examData[subject];
              return;
            }

            // Handle different subject mark structures
            const subjectData = examData[subject];

            // Check for Akarik/Sanklik type structures (like in Physics, Maths)
            if (subjectData.Akarik || subjectData.Sanklik) {
              result[subject] = {
                Akarik: processSubjectSection(subjectData.Akarik),
                Sanklik: processSubjectSection(subjectData.Sanklik),
                Total: {
                  Akarik: subjectData.Akarik?.Total || 0,
                  Sanklik: subjectData.Sanklik?.Total || 0
                }
              };
            }
            // Standard subject mark structure
            else {
              result[subject] = {
                outOf: subjectData.outOf,
                obtainMarks: subjectData.obtainMarks,
                minMarks: subjectData.minMarks,
                writtenMarks: subjectData.writtenMarks,
                oralMarks: subjectData.oralMarks,
                subtype: subjectData.subtype,
                graceMarks: subjectData.graceMarks
              };
            }
          });

          console.log('Processed Marks:', result);
          resolve(result);
        };

        request.onerror = (event) => {
          console.error("Error fetching marks from IndexedDB:", event.target.error);
          reject(event.target.error);
        };
      });
    } catch (error) {
      console.error('Error in fetchMarksData:', error);
      return null;
    }
  };

  // Helper function to process Akarik/Sanklik subject sections
  function processSubjectSection(section) {
    if (!section) return {};

    return {
      Activity: section.Activity || 0,
      'Daily Monitoring': section['Daily Monitoring'] || 0,
      Demonstration: section.Demonstration || 0,
      Homework: section.Homework || 0,
      'Oral Work': section['Oral Work'] || 0,
      Others: section.Others || 0,
      Project: section.Project || 0,
      Test: section.Test || 0,
      Total: section.Total || 0,
      Orally: section.Orally || 0,
      Writing: section.Writing || 0
    };
  }

  const [selectedStudentForSr, setSelectedStudentForSr] = useState('')


  const fetchHeightWeightData = async (srNo, academicYear) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STUDENT_STORE, "readonly");
      const store = transaction.objectStore(STUDENT_STORE);

      const request = store.get(srNo); // Fetch student data by srNo

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const studentData = event.target.result;

          if (!studentData || !studentData.weightandHeight) {
            console.warn('No height and weight data found for student');
            resolve(null);
            return;
          }

          const heightWeight = studentData.weightandHeight[academicYear] || {};
          resolve(heightWeight);
        };

        request.onerror = (event) => {
          console.error("Error fetching height and weight from IndexedDB:", event.target.error);
          reject(event.target.error);
        };
      });
    } catch (error) {
      console.error('Error in fetchHeightWeightData:', error);
      return null;
    }
  };

  const viewResult = async (srNo) => {
    try {
      // Find the student in the selected students array
      const student = selectedStudents.find((student) => student.srNo === srNo);

      if (!student) {
        throw new Error("Student not found");
      }

      // Set the selected student
      setSelectedStudentForSr(student);

      // Fetch height and weight data
      const heightWeightData = await fetchHeightWeightData(student.id || srNo, academicYear);

      // Fetch First Semester marks
      const firstSemesterData = await fetchMarksData(
        student.id || srNo,
        academicYear,
        'First Semester'
      );

      // Fetch Selected Exam (Second Semester) marks
      const secondSemesterData = await fetchMarksData(
        student.id || srNo,
        academicYear,
        selectedExamName === "All Exams" ? "Second Semester" : selectedExamName
      );

      // Validate data
      if (!firstSemesterData || !secondSemesterData) {
        setAlertMessage("Add the subject and fill the marks to view the result.");
        return;
      }

      const resultsWithTotal = {};

      // Combine all subjects from both semesters
      const allSubjects = new Set([
        ...Object.keys(firstSemesterData).filter(key => key !== 'studentInfo' && key !== 'remark' && key !== 'nondi'),
        ...Object.keys(secondSemesterData).filter(key => key !== 'studentInfo' && key !== 'remark' && key !== 'nondi')
      ]);

      allSubjects.forEach((subject) => {
        // First Semester Grade Calculation
        const firstSemesterAkarikTotal = firstSemesterData[subject]?.Akarik?.Total || 0;
        const firstSemesterSankalikTotal = firstSemesterData[subject]?.Sanklik?.Total || 0;
        const firstSemesterTotal = firstSemesterAkarikTotal + firstSemesterSankalikTotal;
        const firstSemesterGrade = calculateGrade(firstSemesterTotal);

        // Second Semester Grade Calculation
        const akarikTotal = secondSemesterData[subject]?.Akarik?.Total || 0;
        const sankalikTotal = secondSemesterData[subject]?.Sanklik?.Total || 0;
        const total = akarikTotal + sankalikTotal;
        const grade = calculateGrade(total);

        resultsWithTotal[subject] = {
          akarikTotal,
          sankalikTotal,
          total,
          grade,
          firstSemesterGrade,
        };
      });


      // Prepare height and weight data for display
      const heightSeptember = heightWeightData?.September ?? {};
      const heightMarch = heightWeightData?.March ?? {};

      // Extract nondi data
      const firstSemesterNondi = firstSemesterData.nondi || {};
      const secondSemesterNondi = secondSemesterData.nondi || {};

      // Set state with both semester data
      setSelectedStudentResults({
        studentName: student.stdName,
        results: resultsWithTotal,
        heightSeptember: heightSeptember.height || '',
        weightSeptember: heightSeptember.weight || '',
        heightMarch: heightMarch.height || '',
        weightMarch: heightMarch.weight || '',
        nondi: secondSemesterNondi, // Use second semester nondi as primary
        firstSemester: firstSemesterNondi,
        stdMother: student.stdMother,
        stdFather: student.stdFather,
        stdSurname: student.stdSurname,
        dob: student.dob,
        division: student.division,
        motherTounge: student.motherTounge,
        studentId: student.studentId,
        gender: student.gender,
        rollNo: student.rollNo,
      });

      setShowModal(true);
    } catch (error) {
      console.error("Error fetching student results:", error);
      setAlertMessage("Failed to fetch student results. Please try again.");
    }
  };




  const handleGradeChange = (subject, type, value) => {
    setSelectedStudentResults((prevState) => {
      const updatedResults = { ...prevState.results };
      updatedResults[subject][type] = parseInt(value, 10) || 0; // Ensure the value is a number

      return {
        ...prevState,
        results: updatedResults,
      };
    });
  };


  const calculateGradeEnglish = (total) => {
    if (total >= 91) return 'A1';
    if (total >= 81) return 'A2';
    if (total >= 71) return 'B1';
    if (total >= 61) return 'B2';
    if (total >= 51) return 'C1';
    if (total >= 41) return 'C2';
    if (total >= 33) return 'D1';
    if (total >= 21) return 'D2';
    return 'Fail';
  };

  const calculateGradeMarathi = (total) => {
    if (total >= 91) return 'अ-1';
    if (total >= 81) return 'अ-2';
    if (total >= 71) return 'ब-1';
    if (total >= 61) return 'ब-2';
    if (total >= 51) return 'क-1';
    if (total >= 41) return 'क-2';
    if (total >= 33) return 'ड-1';
    if (total >= 21) return 'ड-2';
    return 'नापास';
  };

  // Function to calculate grade based on the current language
  const calculateGrade = (total) => {
    return language === 'English' ? calculateGradeEnglish(total) : calculateGradeMarathi(total);
  };

  const submit = () => {
    // Handle submit logic here
  };
  const handleCloseModal = () => setShowModal(false);

  const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
  const [attendance, setAttendance] = useState({
    Present: {},
    Absent: {},
    Leave: {}
  });

  const fetchAttendanceFromIndexedDB = async (srNo, academicYear) => {
    try {
      console.log('Fetching Attendance Data with:', { srNo, academicYear });

      const db = await openDB();
      const transaction = db.transaction(ATTENDANCE_STORE, "readonly");
      const store = transaction.objectStore(ATTENDANCE_STORE);

      // Find all keys and log them
      const allKeys = await new Promise((resolve, reject) => {
        const keysRequest = store.getAllKeys();
        keysRequest.onsuccess = (event) => {
          const keys = event.target.result;
          console.log('ALL KEYS IN ATTENDANCE STORE:', keys);
          resolve(keys);
        };
        keysRequest.onerror = (event) => reject(event.target.error);
      });

      // Improved key matching with extensive logging
      const matchingKey = allKeys.find(storeKey => {
        const storeKeyStr = String(storeKey).trim();
        const srNoStr = String(srNo).trim();

        const isMatch = storeKeyStr === srNoStr;

        if (isMatch) {
          console.log('MATCHING KEY FOUND:', {
            storeKey,
            srNo,
            match: isMatch
          });
        }

        return isMatch;
      });


      console.log('Matching Attendance Key:', matchingKey);

      if (!matchingKey) {
        console.warn('No matching attendance key found for:', srNo);
        console.warn('Available keys:', allKeys);
        return null;
      }

      const request = store.get(matchingKey);

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const attendanceData = event.target.result;

          console.log('RAW ATTENDANCE DATA:', JSON.stringify(attendanceData, null, 2));

          // Extract the year from academic year
          const startYear = academicYear.split('-')[0];
          const endYear = academicYear.split('-')[1];

          // Process the attendance based on the months
          const fetchedAttendance = {
            Present: {},
            Absent: {},
            Leave: {}
          };

          // Define the first and second semester months
          const firstSemesterMonths = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',];
          const secondSemesterMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];

          // Process each month
          [...firstSemesterMonths, ...secondSemesterMonths].forEach(month => {
            let yearForMonth = firstSemesterMonths.includes(month) ? startYear : endYear;

            // Get the attendance for the month
            const monthData = attendanceData.Presenty?.Presenty?.[yearForMonth]?.[month] || {};

            let presentCount = 0;
            let absentCount = 0;
            let leaveCount = 0;

            // Count attendance status for each day in the month
            Object.keys(monthData).forEach(day => {
              const statusObj = monthData[day];
              let status;

              if (statusObj && typeof statusObj === 'object') {
                status = statusObj.present || statusObj.status;
              } else {
                status = statusObj;
              }

              if (status === 'present' || status === true) {
                presentCount++;
              } else if (status === 'absent' || status === false) {
                absentCount++;
              } else if (status === null || status === undefined) {
                leaveCount++;
              }
            });

            // Store the counts in the fetched attendance data
            fetchedAttendance.Present[month] = presentCount;
            fetchedAttendance.Absent[month] = absentCount;
            fetchedAttendance.Leave[month] = leaveCount - 1;
          });

          console.log('PROCESSED ATTENDANCE:', fetchedAttendance);
          resolve(fetchedAttendance);
        };

        request.onerror = (event) => {
          console.error("Error fetching attendance from IndexedDB:", event.target.error);
          reject(event.target.error);
        };
      });
    } catch (error) {
      console.error('Error in fetchAttendanceFromIndexedDB:', error);
      return null;
    }
  };



  useEffect(() => {
    const fetchAttendanceData = async () => {
      console.log('FETCH ATTENDANCE EFFECT TRIGGERED');
      console.log('Selected Student:', selectedStudentForSr);
      console.log('Academic Year:', academicYear);

      if (!selectedStudentForSr) {
        console.warn('No student selected');
        return;
      }

      const srNo = selectedStudentForSr.serialNo;
      console.log('Student SR No:', srNo);
      const academicYearParts = academicYear.split('-');

      try {
        const attendanceData = await fetchAttendanceFromIndexedDB(srNo, academicYearParts[0] + '-' + academicYearParts[1]);

        if (attendanceData) {
          setAttendance(attendanceData);
          console.log('FINAL ATTENDANCE SET:', attendanceData);
        } else {
          console.warn('No attendance data found');
          setAttendance({
            Present: {},
            Absent: {},
            Leave: {}
          });
        }
      } catch (error) {
        console.error('Error fetching attendance data:', error);
        setAttendance({
          Present: {},
          Absent: {},
          Leave: {}
        });
      }
    };

    fetchAttendanceData();
  }, [selectedStudentForSr, academicYear]);


  const [summerVacationDate, setSummerVacationDate] = useState('');
  const [winterVacationDate, setWinterVacationDate] = useState('');

  // Define the English month names
  const firstSemesterMonths = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  const secondSemesterMonths = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];

  // Function to translate month to Marathi if needed
  const getMonthName = (month) => {
    const marathiMonths = {
      Jun: 'जून', Jul: 'जुलै', Aug: 'ऑगस्ट', Sep: 'सप्टेंबर', Oct: 'ऑक्टोबर', Nov: 'नोव्हेंबर',
      Dec: 'डिसेंबर', Jan: 'जानेवारी', Feb: 'फेब्रुवारी', Mar: 'मार्च', Apr: 'एप्रिल', May: 'मे'
    };
    return language === "English" ? month : marathiMonths[month];
  };

  const getAttendanceType = (type) => {
    const marathiTypes = {
      Present: 'उपस्थित',
      Absent: 'गैरहजर',
      Leave: 'रजा'
    };
    return language === "English" ? type : marathiTypes[type];
  };

  //  setting marks to pass 
  const getPassingMarks = (currentClass) => {
    if (selectedStudentForSr.currentClass === "Class V" || selectedStudentForSr.currentClass === "5th" || selectedStudentForSr.currentClass === "इयत्ता पाचवी") {
      return 18;
    } else if (selectedStudentForSr.currentClass === "Class VIII" || selectedStudentForSr.currentClass === "8th" || selectedStudentForSr.currentClass === "इयत्ता आठवी") {
      return 21;
    }
    // Default passing marks if none of the specified classes are selected
    return 18;
  };

  const passingMarks = getPassingMarks(selectedStudentForSr.currentClass);

  //percentage 
  let totalSubjects = 0;
  let totalMarks = 0;
  let percentage = 0;

  if (selectedStudentResults && selectedStudentResults.results) {
    totalSubjects = Object.entries(selectedStudentResults.results)
      .filter(([subject]) => subject !== "nondi").length;

    totalMarks = Object.entries(selectedStudentResults.results)
      .filter(([subject]) => subject !== "nondi")
      .reduce((acc, [subject, grades]) => acc + (grades.sankalikTotal || 0) + (grades.akarikTotal || 0), 0);

    percentage = (totalMarks / (totalSubjects * 100)) * 100;
  }

  // Re-Exam
  const currentClass = selectedStudentResults?.currentClass; // Example: "Class V" or "Class VIII"
  const hasFailed = selectedStudentResults?.results &&
    Object.values(selectedStudentResults.results).some(grades => (grades.sankalikTotal || 0) + (grades.akarikTotal || 0) < passingMarks);

  // Add "Re-Exam" if the student is in Class V or VIII and has failed
  let examOptions = [...examNames];
  if ((currentClass === "Class V" || currentClass === "Class VIII") && hasFailed) {
    examOptions.push("Re-Exam");
  }

  const handleDivisionChange = (e) => {
    const selectedDivision = e.target.value;
    setDivision(selectedDivision); // Update division state

    let filteredStudents;

    if (selectedDivision === "") {
      // Show all students from the selected class if "All Student" is chosen
      filteredStudents = studentData.filter((student) => student.currentClass === classValue);
    } else {
      // Filter by class and division
      filteredStudents = studentData.filter(
        (student) => student.currentClass === classValue && student.division === selectedDivision
      );
    }

    setSelectedStudents(filteredStudents);
  };



  const handlePrint = () => {
    const printContent = document.querySelector('.modal-body'); // Select the modal body content

    if (printContent) {
      const printWindow = window.open('', '', 'height=600,width=800');
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Student Report</title>
            <style>
             @page {
                size: ${selectedExamName === 'All Exams' ? 'A4 Portrait' : 'A4 Landscape'}; /* auto is the initial value */
              margin: 3mm; /* this affects the margin in the printer settings */
            }
              body {
                font-family: 'Poppins', sans-serif;
                margin: 0;
                padding: 0;
                color: black;
              }
  
              .container {
                width: 297mm;
                height: 200mm;
                margin: 0 auto;
                box-sizing: border-box;
                padding: 3mm;
                border: 3px solid #0e0303;
                overflow: hidden;
                display: flex;
                justify-content: space-between;
                margin-bottom: 20px;
              }
  .gradient-background {
  background: linear-gradient(to bottom, rgb(240, 217, 228), rgb(245, 255, 255), rgb(250, 230, 240));
}
              .left, .right {
                width: 48%;
                border: 2px solid black;
                padding: 10px;
                box-sizing: border-box;
              }
  .gradable{
  position: absolute; /* add this */
  bottom: 2px; /* add this */
  left: 1%; /* add this */
  width: 98%; /* add this */
}
           


.grad{
  position: absolute; /* add this */
  bottom: 0; /* add this */
  left: 20px; /* add this */
  width: 100%; /* add this */
}

.attendance-table th {
  font-weight: normal;
  font-size: 14px;
}

.attendance-table td:first-child {
  font-size: 12px;
  font-weight: normal;
}

  
              .left-box {
                background-color: #f9f9f9;
                padding: 20px;
                border: 1px solid #ddd;
                border-radius: 10px;
              }
  
              .school-info {
                display: flex;
                align-items: center;
                margin-bottom: 20px;
              }
  
              .school-info img {
                width: 100px;
                height: 100px;
                object-fit: cover;
                margin-right: 20px;
              }
  
              .school-info h2 {
                font-size: 18px;
                font-weight: bold;
                margin: 0;
              }
  
              .student-info {
                margin-top: 20px;
              }
  
              .student-info h3 {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 10px;
              }
  
              .student-info ul {
                list-style: none;
                padding: 0;
                margin: 0;
              }
  
              .student-info li {
                margin-bottom: 10px;
              }
  
              .student-info label {
                font-weight: bold;
                margin-right: 10px;
              }
  
              .student-info span {
                font-size: 14px;
                color: #666;
              }
  
              .student-info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                background-color: #f9f9f9;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
              }
  
              .student-info-grid section {
                background-color: #ffffff;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              }
  
              .student-info-grid h2 {
                font-size: 1em;
                margin-bottom: 10px;
                color: #333;
                border-bottom: 2px solid #ddd;
                padding-bottom: 5px;
              }
  
              .student-info-grid p {
                margin: 1px 0;
                font-size: 0.9em;
              }
  
              .student-info-grid label {
                font-weight: bold;
                color: #555;
              }
  
              .student-info-grid span {
                margin-left: 5px;
                color: #666;
              }
  
              .student-info-grid p:last-child {
                margin-bottom: 0;
              }
  
              .left {
                border: 2px solid #0f0202;
                padding: 20px;
                position: relative;
              }
  
              .right {
                position: relative;
                width: 48% !important;
                border: 2px solid #0e0101;
                padding: 10px;
                overflow: hidden;
              }
  
              /* Table styles */
              table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
                border: 1px solid #130606;
              }
  
              th, td {
                border: 1px solid #130606;
                padding: 5px;
                text-align: left;
                word-wrap: break-word;
                box-sizing: border-box;
              }

               table th {
                border: 1px solid #130606;
              }

              .student-info-grid {
                border: 1px solid #130606;
              }

              .left-box  {
                border: 1px solid #130606;
              }
  
              .table-striped tbody tr:nth-of-type(odd) {
                background-color: rgba(0, 0, 0, 0.05); /* Stripe effect */
              }
  
              .table-bordered ,tr , th, td {
                border: 1px solid #130606;
              }

              .table-striped th ,td , tbody td {
              border: 1px solid #130606;
              }
  
             .grade-table {
  margin-top: 20px;
}

.grade-table table {
  width: 100%;
  border-collapse: collapse;
}

.grade-table th, .grade-table td {
                border: 1px solid #130606;
  padding: 5px;
  text-align: center;
  box-sizing: border-box;
}

.grade-table thead th {
  background-color: #f4f4f4;
}

.grade-table tbody td {
  text-align: center;
}
  
              .attendance-table th, .attendance-table td {
                width: 33%;
              }
                /* General Table Styles */
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px; /* Adds space above the table */
}

thead {
  background-color: #f2f2f2; /* Light grey background for header */
}

th, td {
  border: 1px solid #ddd; /* Light grey border */
  padding: 8px; /* Space within cells */
  text-align: left; /* Align text to the left */
}

th {
  background-color: #f4f4f4; /* Slightly darker grey background for header cells */
  font-weight: bold; /* Bold text in header */
}

input[type="text"] {
  width: 100%; /* Full width of cell */
  box-sizing: border-box; /* Include padding and border in element's total width and height */
  border: 1px solid #ccc; /* Light grey border for input */
  padding: 4px; /* Space inside input field */
  font-size: 14px; /* Text size inside input */
}

input[type="text"]:focus {
  outline: none; /* Remove default focus outline */
  border-color: #007bff; /* Border color on focus */
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25); /* Shadow effect on focus */
}

/* Zebra striping for table rows */
tbody tr:nth-child(odd) {
  background-color: #fafafa; /* Light grey background for odd rows */

  }
  
              /* Ensure the right container does not overflow */
              .right {
                overflow: hidden; /* Clipping any content that exceeds the container bounds */
              }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } else {
      console.error('Print content not found');
    }
  };

  const englishSubjects = [
    { name: "Arts", akarikMarks: 100 },
    { name: "Work Experience", akarikMarks: 100 },
    { name: "Physical Education", akarikMarks: 100 },
    { name: "Computer", akarikMarks: 100 }, // New subject added
    { name: "computer", akarikMarks: 100 }, // New subject added
  ];

  const marathiSubjects = [
    { name: "चित्रकला", akarikMarks: 100 }, // New subject added
    { name: "शारीरिक शिक्षण", akarikMarks: 100 }, // New subject added
    { name: "संगणक", akarikMarks: 100 }, // New subject added
    { name: "कला", akarikMarks: 100 },
    { name: "कार्यानुभव", akarikMarks: 100 },
  ];
  try {
    return (
    <div>
      <AlertMessage message={alertMessage} show={showAlert} />

      {/* <Sidebar /> */}
      <div className=' main-content-of-page'>
        <h2 style={{ color: '#0c2a52', textAlign: 'center', fontWeight: 'bold', marginBottom: '20px' }} className="title">  {language === "English" ? "5th & 8th Result " : " ५ वी आणि ८ वी निकाल"}</h2>
        <table className="table table-striped table-bordered">
          <tbody>
            <tr>
              <th style={{ backgroundColor: '#b5d3f2', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}> {language === "English" ? "Academic Year " : "शैक्षणिक वर्ष"}</th>
              <td>
                <select id="academicYear" value={academicYear} onChange={handleAcademicYearChange} className="form-control custom-select"
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  <option >{language === "English" ? "Select Year " : "वर्ष निवडा"}</option>
                  <option value="2023-2024" >2023-2024</option>
                  <option value="2024-2025" >2024-2025</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2026-2027">2026-2027</option>
                </select>
              </td>
            </tr>
            <tr>
              <th style={{ backgroundColor: '#b5d3f2', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}> {language === "English" ? "Class " : "वर्ग"}</th>
              <td>
                <select
                  id="class"
                  value={classValue}
                  onChange={handleClassChange}
                  className="form-control custom-select"
                  defaultValue={examNames[0]}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  <option value="">{language === "English" ? "Select Class " : "वर्ग निवडा"}</option>
                  {(() => {
                    const defaultClasses = language === "English"
                      ? ["Class V", "Class VIII"]
                      : ["इयत्ता पाचवी", "इयत्ता आठवी"];
                    const classesToRender = classes.length > 0 ? classes : defaultClasses;
                    return sortClasses(classesToRender
                      .filter(cls => cls === 'Class V' || cls === 'Class VIII' || cls === '5th' || cls === '8th' || cls === 'इयत्ता पाचवी' || cls === 'इयत्ता आठवी' || cls === 'पाचवी' || cls === 'आठवी')
                    , language).map((cls, index) => (
                      <option key={index} value={cls}>
                        {cls}
                      </option>
                    ));
                  })()}
                </select>
              </td>
            </tr>
            <tr>
              <th style={{ backgroundColor: '#b5d3f2', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>{language === "English" ? "Division" : "तुकडी"}</th>
              <td>
                <select
                  value={division}
                  onChange={handleDivisionChange}
                  className="form-control custom-select"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  <option value="">
                    {language === "English" ? "All Student" : "सर्व विद्यार्थी"}
                  </option>
                  {divisions
                    .filter((div) => div !== null && div !== undefined && String(div).trim() !== "")
                    .map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                </select>

              </td>
            </tr>
            <tr>
              <th style={{ backgroundColor: '#b5d3f2', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>{language === "English" ? "Exam Name " : "परीक्षेचे नाव"}</th>
              <td>
                <select
                  id="examName"
                  value={selectedExamName}
                  onChange={handleExamNameChange}
                  className="form-control custom-select"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  <option value="">{language === "English" ? "Select Exam " : "परीक्षा निवडा"}</option>
                  {examOptions.map((examName, index) => (
                    <option key={index} value={examName}>
                      {language === "English" ? examName : examNameTranslations[examName]}
                    </option>
                  ))}
                </select>

              </td>
            </tr>
          </tbody>
        </table>

        <a href="/failed" style={{ textDecoration: 'none' }}>
          {language === "English" ? (
            <button className="btn btn-primary" style={{ backgroundColor: '#0d6efd', color: '#fff', border: 'none', padding: '10px 25px', fontSize: '1rem', fontWeight: '500', borderRadius: '6px' }}>Go to Re-Exam Page</button>
          ) : (
            <button className="btn btn-primary" style={{ backgroundColor: '#0d6efd', color: '#fff', border: 'none', padding: '10px 25px', fontSize: '1rem', fontWeight: '500', borderRadius: '6px' }}>पुनर परिषा</button>
          )}
        </a>
        {selectedStudents.length > 0 && (
          <div className="mt-4">
            <table className="table table-striped table-bordered custom-table">
              <thead>
                <tr>
                  <th style={{ backgroundColor: '#b5d3f2', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }} className="custom-width">{language === "English" ? "Roll No " : "हजरी क्र"}</th>
                  <th style={{ backgroundColor: '#b5d3f2', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>{language === "English" ? "Name " : "नाव"}</th>
                  <th style={{ backgroundColor: '#b5d3f2', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>{language === "English" ? "Result " : "प्रगतीपत्रक"}</th>
                </tr>
              </thead>
              <tbody>
                {selectedStudents
                  .sort((a, b) => a.rollNo - b.rollNo)
                  .map((student) => (
                    <tr key={student.srNo}>
                      <td>{student.rollNo}</td>
                      <td>{student.stdName} {student.stdFather} {student.stdSurname}</td>
                      <td>
                        <button className="btn btn-primary" onClick={() => viewResult(student.srNo)}>
                          {language === "English" ? "View Result" : "प्रगति पत्रक"}
                        </button>

                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
        <Modal show={showModal} onHide={handleCloseModal} dialogClassName='modal-80w'>
          <Modal.Header closeButton>
            <Modal.Title>{language === "English" ? "Exam Result " : "विद्यार्थ्यांचे निकाल"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>















            {selectedExamName === 'All Exams' && selectedStudentResults ? (
              <div style={{
                width: '210mm',
                minHeight: '297mm',
                padding: '15mm',
                background: 'linear-gradient(to bottom, rgb(240, 217, 228), rgb(245, 255, 255), rgb(250, 230, 240))',
                fontFamily: '"Nirmala UI", Arial, sans-serif',
                border: '12px double #2c3e50',
                margin: '20px auto',
                boxSizing: 'border-box',
                position: 'relative',
                color: '#000',
                boxShadow: '0 0 20px rgba(0,0,0,0.2)'
              }} className="board-result-container">
                {/* Header Section */}
                <div style={{ textAlign: 'center', position: 'relative', marginBottom: '20px' }}>
                  <p style={{ position: 'absolute', left: 0, top: 0, margin: 0, fontSize: '10px', fontWeight: 'bold' }}>
                    शासन निर्णय क्रमांक: आरटीई-२०२२/प्र.क्र. २७६/एस.डी-१
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '10px' }}>
                    {schoolLogo ? (
                      <img src={schoolLogo} alt="Logo" style={{ height: '50px', marginRight: '15px' }} />
                    ) : (
                      <div style={{ height: '50px', width: '50px', borderRadius: '50%', backgroundColor: '#ffd700', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '15px' }}>
                        <span style={{ fontSize: '20px' }}>🪔</span>
                      </div>
                    )}
                  </div>
                  <h5 style={{ margin: '2px 0', color: '#2c3e50', fontWeight: 'bold' }}>परिशिष्ट- १</h5>
                  <h4 style={{ margin: '2px 0', color: '#d35400', fontWeight: 'bold', textTransform: 'uppercase' }}>गुणपत्रक नमुना - वार्षिक परीक्षा / पुनर्परीक्षा</h4>
                </div>

                {/* School & Student Info Section */}
                <div style={{ marginBottom: '15px', borderBottom: '1px solid #000', paddingBottom: '10px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <div style={{ flex: 2 }}><strong>शाळेचे नाव:</strong> {schoolName}</div>
                    <div style={{ flex: 1 }}><strong>शाळा UDISE:</strong> {udiseNumber}</div>
                    <div style={{ flex: 1 }}><strong>शैक्षणिक वर्ष:</strong> {academicYear}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ flex: 2 }}><strong>विद्यार्थ्यांचे नाव:</strong> {selectedStudentResults?.studentName} {selectedStudentResults?.stdFather} {selectedStudentResults?.stdSurname}</div>
                    <div style={{ flex: 0.5 }}><strong>हजेरी क्र.:</strong> {selectedStudentResults?.rollNo}</div>
                    <div style={{ flex: 0.5 }}><strong>तुकडी:</strong> {selectedStudentResults?.division}</div>
                    <div style={{ flex: 1 }}><strong>इयत्ता:</strong> {classValue === 'Class V' ? '५ वी' : '८ वी'}</div>
                  </div>
                </div>

                {/* Marks Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #2c3e50', fontSize: '13px', backgroundColor: '#fff' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#d1e7ff', color: '#003366' }}>
                      <th style={{ border: '1px solid #000', padding: '5px', width: '40px', textAlign: 'center' }}>अ.क्र.</th>
                      <th style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>विषय</th>
                      <th style={{ border: '1px solid #000', padding: '5px', width: '100px', textAlign: 'center' }}>किमान आवश्यक गुण</th>
                      <th style={{ border: '1px solid #000', padding: '5px', width: '120px', textAlign: 'center' }}>एकूण गुण ५०/६० पैकी</th>
                      <th style={{ border: '1px solid #000', padding: '5px', width: '120px', textAlign: 'center' }}>शेरा (उत्तीर्ण/अनुत्तीर्ण)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectSequence && subjectSequence.filter(s => s).map((subject, index) => {
                      const marks = selectedStudentResults.results[subject] || {};

                      // Check if it's an extra/grade-based subject (Art, PE, etc.)
                      const isExtraSubject = [...englishSubjects, ...marathiSubjects].some(
                        s => s?.name?.toLowerCase() === subject?.toLowerCase()
                      );

                      // For Board Results, show Sankalik (Summative) marks (out of 50/60)
                      const obtMarks = marks.sankalikTotal !== undefined ? marks.sankalikTotal : '-';
                      const isPass = marks.sankalikTotal >= (isExtraSubject ? 0 : passingMarks);

                      // Determine the remark/grade
                      const remark = isExtraSubject
                        ? (marks.grade || '-')
                        : (obtMarks === '-' ? '-' : (isPass ? 'उत्तीर्ण' : 'अनुत्तीर्ण'));

                      return (
                        <tr key={index}>
                          <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{index + 1}</td>
                          <td style={{ border: '1px solid #000', padding: '5px', fontWeight: 'bold' }}>{subject}</td>
                          <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{isExtraSubject ? '-' : passingMarks}</td>
                          <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{obtMarks}</td>
                          <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>
                            {isExtraSubject ? `श्रेणी - ${remark}` : remark}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    {(() => {
                      const academicResults = Object.keys(selectedStudentResults.results).filter(subj =>
                        !['Art', 'Work Experience', 'Physical Education', 'कला', 'कार्यानुभव', 'शारीरिक शिक्षण'].includes(subj)
                      );
                      const totalM = academicResults.reduce((sum, s) => sum + (selectedStudentResults.results[s]?.total || 0), 0);
                      const totalS = academicResults.length;
                      const perc = totalS > 0 ? (totalM / (totalS * 100)) * 100 : 0;

                      return (
                        <>
                          <tr>
                            <td colSpan="3" style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}><strong>शेकडा गुण :</strong></td>
                            <td colSpan="2" style={{ border: '1px solid #000', padding: '5px' }}><strong>{perc.toFixed(2)}%</strong></td>
                          </tr>
                          <tr>
                            <td colSpan="3" style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}><strong>निकाल दिनांक :</strong></td>
                            <td colSpan="2" style={{ border: '1px solid #000', padding: '5px' }}><strong>{new Date().toLocaleDateString('mr-IN')}</strong></td>
                          </tr>
                        </>
                      );
                    })()}
                  </tfoot>
                </table>

                {/* Footer Signatures */}
                <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: '30px' }}>..........................................</div>
                    <strong>वर्गशिक्षक नाव व स्वाक्षरी</strong>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: '30px' }}>..........................................</div>
                    <strong>मुख्याध्यापक नाव व स्वाक्षरी</strong>
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '5px' }}>
                  <p style={{ margin: 0, fontStyle: 'italic', fontSize: '12px' }}>शाळेचा शिक्का</p>
                </div>
              </div>
            ) : (

              <div>
                {/* Second semester modal content */}

                <div className="container  " style={{
                  background: `linear-gradient(to bottom, rgb(240, 217, 228), rgb(245, 255, 255), rgb(250, 230, 240))`
                }} >
                  <div className="left">
                    <div className="left-box" style={{ border: '1px solid black' }}>
                      <div className="school-info">
                        {schoolLogo && (
                          <div>
                            <img src={schoolLogo} alt={`$Logo`} />
                          </div>
                        )}
                        <h2>{schoolName}</h2>
                      </div>
                    </div>
                    <br />

                    <div class="student-info-grid" style={{ border: '1px solid black' }}>
                      <p>
                        <label>{language === "English" ? "Name:" : "नाव:"}</label>
                        <span>
                          {selectedStudentResults?.studentName || 'N/A'}{' '}
                          {selectedStudentResults?.stdFather || 'N/A'}{' '}
                          {selectedStudentResults?.stdSurname || 'N/A'}
                        </span>
                      </p>
                      <p>
                        <label>{language === "English" ? "Academic Year: " : "शैक्षणिक वर्ष: "}</label>
                        <span>{academicYear || 'N/A'}</span>
                      </p>
                      <p>
                        <label>{language === "English" ? "Roll No: " : "हजेरी क्रमांक: "}</label>
                        <span>{selectedStudentResults?.rollNo || 'N/A'}</span>

                      </p>
                      <p>
                        <label>{language === "English" ? "Exam: " : "परीक्षा: "}</label>
                        <span>{selectedExamName || 'N/A'}</span>

                      </p>
                      <p>
                        <label>{language === "English" ? "Class:" : "वर्ग:"}</label>
                        <span>{classValue || 'N/A'}</span>
                      </p>
                      <p>
                        <label>{language === "English" ? "Mother Name:" : "आईचे नाव:"}</label>
                        <span>{selectedStudentResults?.stdMother || 'N/A'}</span>
                      </p>
                      <p>
                        <label>{language === "English" ? "Date Of Birth:" : "जन्मतारीख:"}</label>
                        <span>{selectedStudentResults?.dob || 'N/A'}</span>
                      </p>
                      <p>
                        <label>{language === "English" ? "Division:" : "तुकडी:"}</label>
                        <span>{selectedStudentResults?.division || 'N/A'}</span>
                      </p>
                      <p>
                        <label>{language === "English" ? "Mother Tongue:" : "मातृभाषा:"}</label>
                        <span>{selectedStudentResults?.motherTounge || 'N/A'}</span>
                      </p>
                      {/* <p>
        <label>{language === "English" ? "Student ID:" : "विद्यार्थी आयडी:"}</label>
        <span>{selectedStudentResults?.studentId || 'N/A'}</span>
      </p> */}
                      <p>
                        <label>{language === "English" ? "Gender:" : "लिंग:"}</label>
                        <span>{selectedStudentResults?.gender || 'N/A'}</span>
                      </p>
                    </div>
                    <div className="gradable" >


                      <table>
                        <thead>
                          <tr>
                            <th rowspan="2"></th>
                            <th colspan="1">{language === "English" ? "First Semester" : "प्रथम सत्र"}</th>
                            <th colspan="1">{language === "English" ? "Second Semester" : "द्वितीय सत्र"}</th>
                          </tr>

                        </thead>
                        <tbody>
                          <tr>
                            <td>{language === "English" ? "Weight" : "वजन"} (Kg)</td>
                            <td>
                              <span>
                                {selectedStudentResults?.weightSeptember ?? ''}
                              </span>
                            </td>
                            <td>
                              <span>
                                {selectedStudentResults?.weightMarch ?? ''}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td>{language === "English" ? "Height" : "उंची"} (Cm)</td>
                            <td>
                              <span>
                                {selectedStudentResults?.heightSeptember ?? ''}
                              </span>
                            </td>
                            <td>
                              <span>
                                {selectedStudentResults?.heightMarch ?? ''}
                              </span>
                            </td>
                          </tr>
                        </tbody>

                      </table>
                    </div>
                  </div>
                  <div className="right">
                    {/* First Semester Attendance Table */}
                    <h3>{language === "English" ? "Attendance:" : "हजेरी"}</h3>
                    <table className="attendance-table">
                      <thead>
                        <tr>
                          <th>{language === "English" ? "Type:" : "प्रकार"}</th>
                          {firstSemesterMonths.map((month, index) => (
                            <th key={index}>{getMonthName(month)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {['Present', 'Absent', 'Leave'].map((type) => (
                          <tr key={type}>
                            <td>{getAttendanceType(type)}</td>
                            {firstSemesterMonths.map((month, index) => (
                              <td key={index}>
                                <input
                                  type="text"
                                  value={type === 'Leave' && attendance[type][month] < 0 ? '' : attendance[type][month] || ''}
                                // onChange={(e) => handleInputChange(type, month, e.target.value)}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Second Semester Attendance Table */}
                    <h5 style={{ marginTop: '10px' }}>{language === "English" ? "Second Semester Attendance:" : "द्वितीय सत्राची हजेरी:"}</h5>
                    <table className="attendance-table">
                      <thead>
                        <tr>
                          <th>{language === "English" ? "Type:" : "प्रकार"}</th>
                          {secondSemesterMonths.map((month, index) => (
                            <th key={index}>{getMonthName(month)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {['Present', 'Absent', 'Leave'].map((type) => (
                          <tr key={type}>
                            <td>{getAttendanceType(type)}</td>
                            {secondSemesterMonths.map((month, index) => (
                              <td key={index}>
                                <input
                                  type="text"
                                  value={type === 'Leave' && attendance[type][month] < 0 ? '' : attendance[type][month] || ''}
                                // onChange={(e) => handleInputChange(type, month, e.target.value)}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="grad">
                      <p>
                        {language === "English" ? " Instructions for parents:" : "पालकांसाठी सूचना"}
                        <li>  {language === "English" ? " Students should wear school uniform every day." : "विद्यार्थ्यांनी दररोज शालेय गणवेश परिधान करावा."}</li>
                        <li> {language === "English" ? "  A student should do the study given in school every day." : "विद्यार्थ्याने शाळेत दिलेला अभ्यास दररोज करावा."}</li>
                        <li> {language === "English" ? " Students should attend school on time and regularly every day." : "विद्यार्थ्यांनी दररोज वेळेवर व नियमितपणे शाळेत हजर राहावे."}</li>
                        <li> {language === "English" ? " Students should not carry valuables, money. " : "विद्यार्थ्यांनी मौल्यवान वस्तू, पैसे घेऊन जाऊ नये."}</li>
                        <li>  {language === "English" ? " Students should follow the rules and discipline of the school. " : "विद्यार्थ्यांनी शाळेचे नियम व शिस्तीचे पालन करावे."}</li>
                      </p>
                    </div>
                    <p style={{ marginTop: '40px', marginLeft: '350px' }}>{language === "English" ? "Parents Signature " : "पालकांची सही"}</p>

                  </div>
                </div>


                <div className="container mt-1" style={{ background: `linear-gradient(to bottom, rgb(240, 217, 228), rgb(245, 255, 255), rgb(250, 230, 240))` }}>
                  <div className="left"   >
                    <h3>{language === "English" ? "Student Progress Report " : "विद्यार्थी प्रगती अहवाल"}</h3>
                    <div>
                      <label htmlFor="roll-no">{language === "English" ? "Roll No: " : "हजेरी क्रमांक: "}</label>
                      <span>{selectedStudentResults?.rollNo || 'N/A'}</span>
                    </div>
                    <div>
                      <label htmlFor="student-name">{language === "English" ? "Student Name: " : "विद्यार्थ्याचे नाव: "}</label>
                      <span>{selectedStudentResults?.studentName || 'N/A'} {selectedStudentResults?.stdFather || 'N/A'} {selectedStudentResults?.stdSurname || 'N/A'}</span>
                    </div>
                    <div>
                      <label htmlFor="class">{language === "English" ? "Class: " : "वर्ग: "}</label>
                      <span>{classValue || 'N/A'}</span>
                    </div>

                    <div>
                      <label htmlFor="exam-roll-no">{language === "English" ? "Exam: " : "परीक्षा सत्र: "}</label>
                      <span>{selectedExamName || 'N/A'}</span>
                    </div>

                    {selectedStudentResults?.results ? (
                      <table className="table table-striped table-bordered">
                        <thead>
                          <tr>
                            <th rowSpan='2'>{language === "English" ? "Subject" : "विषय"}</th>
                            <th colSpan="1">{language === "English" ? "First Sem" : "प्रथम सत्र"}</th>
                            <th colSpan="3">{language === "English" ? "Second Sem" : "द्वितीय सत्र"}</th>
                          </tr>
                          <tr>

                            <th>{language === "English" ? "Grade" : "गुण"}</th>
                            <th>{language === "English" ? "Min.M" : "किमान गुण"}</th>
                            <th>{language === "English" ? "Obt.M" : "एकूण गुण"}</th>
                            <th>{language === "English" ? "Remark" : "शेरा"}</th>
                          </tr>
                        </thead>
                        <tbody>





                          {/* {selectedStudentResults && selectedStudentResults.results ? (
  subjectSequence
    .filter((subject) => subject in selectedStudentResults.results) 
    .map((subject) => {
      const grades = selectedStudentResults.results[subject];
      return (
        <tr key={subject}>
          <td><b>{subject}</b></td>
          <td><b>{grades.firstSemesterGrade || 'N/A'}</b></td> 
          <td>
          <b>{passingMarks || 'N/A'}</b>
         
          </td>
          <td>
          <b>{grades.sankalikTotal || 'N/A'}</b>
          </td>
          <td>
            <b>
              {grades.sankalikTotal >= passingMarks
                ? language === "English"
                  ? "Pass"
                  : "उत्तीर्ण"
                : language === "English"
                ? "Fail"
                : "अनुत्तीर्ण"}
            </b>
          </td>
        </tr>
      );
    })
) : (
  <tr>
    <td colSpan="5">{language === "English" ? "No data available" : "डेटा उपलब्ध नाही"}</td>
  </tr>
)} */}

                          {selectedStudentResults && selectedStudentResults.results ? (
                            subjectSequence
                              .filter((subject) => subject in selectedStudentResults.results)
                              .map((subject) => {
                                const grades = selectedStudentResults.results[subject];
                                const isExtraSubject = [...englishSubjects, ...marathiSubjects].some(
                                  s => s.name.toLowerCase() === subject.toLowerCase()
                                );

                                // If it's an extra subject, calculate grade using only Akarik total
                                const remark = isExtraSubject
                                  ? calculateGrade(grades.akarikTotal || 0)
                                  : grades.sankalikTotal >= passingMarks
                                    ? language === "English" ? "Pass" : "उत्तीर्ण"
                                    : language === "English" ? "Fail" : "अनुत्तीर्ण";

                                return (
                                  <tr key={subject}>
                                    <td><b>{subject}</b></td>
                                    <td><b>{grades.firstSemesterGrade || '-'}</b></td>
                                    <td><b>{passingMarks || 'N/A'}</b></td>
                                    <td><b>{grades.sankalikTotal || '-'}</b></td>
                                    <td><b>{remark}</b></td> {/* Modified Remark column */}
                                  </tr>
                                );
                              })
                          ) : (
                            <tr>
                              <td colSpan="5">{language === "English" ? "No data available" : "डेटा उपलब्ध नाही"}</td>
                            </tr>
                          )}









                          {selectedStudentResults && selectedStudentResults.results && (
                            <>

                              <tr>
                                <td colSpan="1"></td>
                                <td colSpan="2"><b>{language === "English" ? "Total Marks" : "एकूण गुण"}</b></td>
                                <td colSpan="1"><b>{totalMarks} / {totalSubjects * 100}</b></td>
                                <td colSpan="1"><b>{percentage.toFixed(2)}%</b></td>
                              </tr>
                            </>
                          )}
                        </tbody>
                      </table>
                    ) : (
                      <p>{language === "English" ? "No results available. " : "कोणतेही प्रगतीपत्रक उपलब्ध नाहीत."}</p>
                    )}
                    <div>
                    </div>
                    <div className="grad" style={{ display: 'flex', alignItems: 'center' }}>
                      <label style={{ marginRight: '20px', marginBottom: '2px', marginLeft: '20px' }} htmlFor="class-teacher">{language === "English" ? "Class Teacher" : "वर्गशिक्षक"}</label>
                      <label style={{ marginRight: '20px', marginBottom: '2px', marginLeft: '45%' }} htmlFor="principal">{language === "English" ? "Principal " : "प्राचार्य"}</label>
                    </div>
                  </div>
                  <div className="right">
                    <h3 style={{ textAlign: "center", color: "black", fontFamily: "Arial, sans-serif", fontWeight: "bold", marginBottom: "20px" }}>
                      {language === "English" ? "Nondi " : "नोंदी"}
                    </h3>

                    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Arial, sans-serif" }}>

                      <thead>
                        <tr style={{ color: "black", textAlign: "center" }}>
                          <th colSpan="" style={{ padding: "2px", border: "1px solid #ddd", fontSize: "16px" }}>{language === "English" ? "First Semester " : "प्रथम सत्र"} </th>
                          <th colSpan="" style={{ padding: "2px", border: "1px solid #ddd", fontSize: "16px" }}>{language === "English" ? "Second Semester " : "द्वितीय सत्र"} </th>
                        </tr>
                      </thead>

                      <tbody>
                        <tr style={{ color: "black", textAlign: "center" }}>
                          <th colSpan="2" style={{ padding: "2px", border: "1px solid #ddd", fontSize: "16px" }}>{language === "English" ? "Special Progress" : "विशेष प्रगती"}</th>

                        </tr>
                        <tr style={{ backgroundColor: "#ffffff" }}>
                          <td style={{ width: "50%", padding: "2px", border: "1px solid #ddd", verticalAlign: "top" }}>
                            <textarea
                              id="special-progress"
                              style={{
                                width: "100%",
                                padding: "10px",
                                borderRadius: "4px",
                                border: "1px solid #ccc",
                                boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
                                resize: "none",
                                fontSize: "14px",
                                height: "100px"
                              }}
                              value={selectedStudentResults?.firstSemester?.specialEntries || "No data available"}
                              readOnly
                            />
                          </td>

                          <td style={{ width: "50%", padding: "2px", border: "1px solid #ddd", verticalAlign: "top" }}>
                            <textarea
                              id="special-progress"
                              style={{
                                width: "100%",
                                padding: "10px",
                                borderRadius: "4px",
                                border: "1px solid #ccc",
                                boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
                                resize: "none",
                                fontSize: "14px",
                                height: "100px"
                              }}
                              value={selectedStudentResults?.nondi?.specialEntries || "No data available"}
                              readOnly
                            />
                          </td>
                        </tr>
                        <tr style={{ color: "black", textAlign: "center" }}>
                          <th colSpan="2" style={{ padding: "2px", border: "1px solid #ddd", fontSize: "16px" }}>{language === "English" ? "Hobbies" : "छंद"}</th>
                        </tr>
                        <tr style={{ backgroundColor: "#ffffff" }}>
                          <td style={{ width: "33%", padding: "2px", border: "1px solid #ddd", verticalAlign: "top" }}>
                            <textarea
                              id="special-progress"
                              style={{
                                width: "100%",
                                padding: "10px",
                                borderRadius: "4px",
                                border: "1px solid #ccc",
                                boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
                                resize: "none",
                                fontSize: "14px",
                                height: "100px"
                              }}
                              value={selectedStudentResults?.firstSemester?.interestsAndHobbies || "No data available"}
                              readOnly />
                          </td>
                          <td style={{ padding: "2px", border: "1px solid #ddd", verticalAlign: "top" }}>
                            <textarea
                              id="hobbies"
                              style={{
                                width: "100%",
                                padding: "10px",
                                borderRadius: "4px",
                                border: "1px solid #ccc",
                                boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
                                resize: "none",
                                fontSize: "14px",
                                height: "100px"
                              }}
                              value={selectedStudentResults?.nondi?.interestsAndHobbies || "No data available"}
                              readOnly
                            />
                          </td>

                        </tr>
                        <tr style={{ color: "black", textAlign: "center" }}>
                          <th colSpan="2" style={{ padding: "2px", border: "1px solid #ddd", fontSize: "16px" }}>{language === "English" ? "Required Improvements" : "आवश्यक सुधारणा"}</th>
                        </tr>
                        <tr style={{ backgroundColor: "#ffffff" }}>
                          <td style={{ width: "33%", padding: "2px", border: "1px solid #ddd", verticalAlign: "top" }}>
                            <textarea
                              id="special-progress"
                              style={{
                                width: "100%",
                                padding: "10px",
                                borderRadius: "4px",
                                border: "1px solid #ccc",
                                boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
                                resize: "none",
                                fontSize: "14px",
                                height: "100px"
                              }}
                              value={selectedStudentResults?.firstSemester?.necessaryCorrections || "No data available"}
                              readonly />
                          </td>
                          <td style={{ padding: "2px", border: "1px solid #ddd", verticalAlign: "top" }}>
                            <textarea
                              id="improvements"
                              style={{
                                width: "100%",
                                padding: "10px",
                                borderRadius: "4px",
                                border: "1px solid #ccc",
                                boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
                                resize: "none",
                                fontSize: "14px",
                                height: "100px"
                              }}
                              value={selectedStudentResults?.nondi?.necessaryCorrections || "No data available"}
                              readOnly
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="grade-table" >
                      <h3>{language === "English" ? "Grade Table" : "श्रेणी टेबल"}</h3>
                      <table >
                        <thead>
                          <tr>
                            <th>{language === "English" ? "Marks" : "मार्क्स"}</th>
                            <th>{language === "English" ? "A1" : "अ1"}</th>
                            <th>{language === "English" ? "A2" : "अ2"}</th>
                            <th>{language === "English" ? "B1" : "ब1"}</th>
                            <th>{language === "English" ? "B2" : "ब2"}</th>
                            <th>{language === "English" ? "C1" : "क1"}</th>
                            <th>{language === "English" ? "C2" : "क2"}</th>
                            <th>{language === "English" ? "D1" : "ड1"}</th>
                            <th>{language === "English" ? "D2" : "ड2"}</th>
                            <th>{language === "English" ? "Fail" : "नापास"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>%</td>
                            <td>91% ते 100%</td>
                            <td>81% ते 90%</td>
                            <td>71% ते 80%</td>
                            <td>61% ते 70%</td>
                            <td>51% ते 60%</td>
                            <td>41% ते 50%</td>
                            <td>33% ते 40%</td>
                            <td>21% ते 32%</td>
                            <td>20% पेक्षा कमी</td>
                          </tr>
                        </tbody>
                      </table>

                    </div>
                  </div>
                </div>
              </div>

            )}
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              {language === "English" ? " Close " : "Close करा"}
            </Button>
            <Button variant="primary" onClick={handlePrint}>
              {language === "English" ? "Print" : "Print करा"}
            </Button>
          </Modal.Footer>
        </Modal>

      </div>

    </div>
    );
  } catch (error) {
    return <div style={{ color: 'red', padding: '50px', fontSize: '20px' }}>Error rendering Result5th8th: {error.message}<br/>{error.stack}</div>;
  }
};

export default Result5th8th;

