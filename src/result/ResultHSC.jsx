<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import "../result/result.css";
import printJS from 'print-js'; // If using npm
import AlertMessage from "../../AlertMessage";


function ResultHSC() {
  const [academicYear, setAcademicYear] = useState('');
  const [classValue, setClassValue] = useState('');
  const [selectedExamName, setSelectedExamName] = useState('');
=======
import React, { useState, useEffect } from "react";
import { Modal, Button } from "react-bootstrap";
import "../result/result.css";
import printJS from "print-js"; // If using npm
import AlertMessage from "../../AlertMessage";

function ResultHSC() {
  const [academicYear, setAcademicYear] = useState("");
  const [classValue, setClassValue] = useState("");
  const [selectedExamName, setSelectedExamName] = useState("");
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  const [studentData, setStudentData] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [classes, setClasses] = useState([]);
  const [selectedStudentResults, setSelectedStudentResults] = useState(null);
  const [showModal, setShowModal] = useState(false);
<<<<<<< HEAD
  const [schoolName, setSchoolName] = useState('');
  const [schoolLogo, setSchoolLogo] = useState('');
  const [division, setDivision] = useState("");
  const [divisions, setDivisions] = useState(["A", "B", "C", "D"]);
  const [divisionSubjects, setDivisionSubjects] = useState({}); // Store subjects by class and division
const [previousYearClass, setPreviousYearClass] = useState('');

  const udiseNumber = localStorage.getItem("udiseNumber");
    const [examNames, setExamNames] = useState([
      "Unit Test I",
      "Unit Test II",
      "Semester First ",
      "Semester Second ",
      "All Exams",
    ]);
  
    const examNameTranslations = {
      "Unit Test I" : "घटक चाचणी-1",
      "Unit Test II" : "घटक चाचणी-2",
      "Semester First ": "प्रथम सत्र",
      "Semester Second ": "द्वितीय सत्र",
      "Second": "द्वितीय",
    };
  
=======
  const [schoolName, setSchoolName] = useState("");
  const [schoolLogo, setSchoolLogo] = useState("");
  const [division, setDivision] = useState("");
  const [divisions, setDivisions] = useState(["A", "B", "C", "D"]);
  const [divisionSubjects, setDivisionSubjects] = useState({}); // Store subjects by class and division
  const [previousYearClass, setPreviousYearClass] = useState("");

  const udiseNumber = localStorage.getItem("udiseNumber");
  const [examNames, setExamNames] = useState([
    "Unit Test I",
    "Unit Test II",
    "Semester First ",
    "Semester Second ",
    "All Exams",
  ]);

  const examNameTranslations = {
    "Unit Test I": "घटक चाचणी-1",
    "Unit Test II": "घटक चाचणी-2",
    "Semester First ": "प्रथम सत्र",
    "Semester Second ": "द्वितीय सत्र",
    Second: "द्वितीय",
  };

>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  // Reset divisions when class changes
  useEffect(() => {
    if (classValue) {
      const divisionsForClass = studentData
<<<<<<< HEAD
        .filter(student => student.currentClass === classValue)
        .map(student => student.division)
        .filter((value, index, self) => value && self.indexOf(value) === index);
      if (divisionsForClass.length === 0) { setDivisions(["A", "B", "C", "D"]); } else { setDivisions(divisionsForClass); }
=======
        .filter((student) => student.currentClass === classValue)
        .map((student) => student.division)
        .filter((value, index, self) => value && self.indexOf(value) === index);
      if (divisionsForClass.length === 0) {
        setDivisions(["A", "B", "C", "D"]);
      } else {
        setDivisions(divisionsForClass);
      }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
    } else {
      setDivisions(["A", "B", "C", "D"]);
    }
  }, [classValue, studentData]);

  useEffect(() => {
    const fetchDefaultSettings = async () => {
      try {
<<<<<<< HEAD
        const response = await fetch(`${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/defaultSettings.json`);
=======
        const response = await fetch(
          `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/defaultSettings.json`,
        );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
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
<<<<<<< HEAD
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'English');
=======
  const [language, setLanguage] = useState(
    localStorage.getItem("language") || "English",
  );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557

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

<<<<<<< HEAD

  const [subjectSequence, setSubjectSequence] = useState([]); // New state for subject sequence
 // Update your useEffect hook
useEffect(() => {
  if (academicYear && (classValue || previousYearClass) && division) {
    fetchSubjectSequence();
  }
}, [academicYear, classValue, previousYearClass, division]);

// Keep your exact Firebase path structure
const fetchSubjectSequence = async () => {
  try {
    const classToUse = previousYearClass || classValue;
    const response = await fetch(
      `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/hsc/${academicYear}/${classToUse}/${division}.json`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch subject sequence');
    }
    
    const data = await response.json();
    const orderedSubjects = Object.keys(data)
      .map(key => data[key]);
    
    setSubjectSequence(orderedSubjects);
  } catch (error) {
    console.error('Error fetching subject sequence:', error);
    setSubjectSequence([]);
  }
};

=======
  const [subjectSequence, setSubjectSequence] = useState([]); // New state for subject sequence
  // Update your useEffect hook
  useEffect(() => {
    if (academicYear && (classValue || previousYearClass) && division) {
      fetchSubjectSequence();
    }
  }, [academicYear, classValue, previousYearClass, division]);

  // Keep your exact Firebase path structure
  const fetchSubjectSequence = async () => {
    try {
      const classToUse = previousYearClass || classValue;
      const response = await fetch(
        `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/hsc/${academicYear}/${classToUse}/${division}.json`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch subject sequence");
      }

      const data = await response.json();
      const orderedSubjects = Object.keys(data).map((key) => data[key]);

      setSubjectSequence(orderedSubjects);
    } catch (error) {
      console.error("Error fetching subject sequence:", error);
      setSubjectSequence([]);
    }
  };
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557

  useEffect(() => {
    if (academicYear && classValue && division) {
      fetchSubjectSequence();
    }
  }, [academicYear, classValue, division]);

  useEffect(() => {
<<<<<<< HEAD
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
 
=======
    const storedLanguage = localStorage.getItem("language") || "English";
    setLanguage(storedLanguage);
  }, []);

  const fetchSchoolName = async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction(SCHOOL_STORE, "readonly");
      const store = transaction.objectStore(SCHOOL_STORE);

      // Get the school data using the udiseNumber as key
      const request = store.get(udiseNumber);

      request.onsuccess = (event) => {
        const schoolData = event.target.result;
        if (schoolData) {
          // Set school name and logo from IndexedDB
          setSchoolName(schoolData.schoolName || "-");
          setSchoolLogo(schoolData.schoolLogo || "");

          // Update language if available in school data
          if (schoolData.language) {
            setLanguage(schoolData.language);
            localStorage.setItem("language", schoolData.language);
          }
        } else {
          console.log("No school data found in IndexedDB");
          // Fallback to empty values if no data found
          setSchoolName("-");
          setSchoolLogo("");
        }
      };

      request.onerror = (event) => {
        console.error(
          "Error fetching school data from IndexedDB:",
          event.target.error,
        );
        // Fallback to empty values on error
        setSchoolName("-");
        setSchoolLogo("");
      };
    } catch (error) {
      console.error("Error accessing IndexedDB:", error);
      // Fallback to empty values on error
      setSchoolName("-");
      setSchoolLogo("");
    }
  };

  useEffect(() => {
    fetchSchoolName();
    fetchStudentData();
  }, [udiseNumber]); // Add udiseNumber as dependency
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557

  useEffect(() => {
    if (selectedExamName && classValue && academicYear) {
      fetchMarksForSelectedSubject();
    }
  }, [selectedExamName, classValue, academicYear]);

  const handleAcademicYearChange = (e) => setAcademicYear(e.target.value);

<<<<<<< HEAD

=======
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  // const handleClassChange = (e) => {
  //   setClassValue(e.target.value); // Update the class value
  //   setDivision(""); // Reset division when class changes
  // };
  const handleExamNameChange = (e) => {
    setSelectedExamName(e.target.value);
  };

<<<<<<< HEAD
  const filteredExamNames = examNames.filter((examName) => examName === "Semester Second ");









  // IndexedDB constants
  const DB_NAME = 'SchoolManagementDB';
  const STUDENT_STORE = 'studentData';
  const DB_VERSION = 1;
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


// Function to fetch student data from IndexedDB
const fetchStudentData = async () => {
  try {
    const db = await openDB();
    if (!db) {
      console.error("Error: db object is not initialized");
      return;
    }

    const transaction = db.transaction(STUDENT_STORE, "readonly");
    const store = transaction.objectStore(STUDENT_STORE);
    const request = store.getAll();

    request.onsuccess = (event) => {
      const students = event.target.result;

      // ✅ Filter out students where isActive is false
      const activeStudents = students.filter(student => student.isActive !== false);

      setStudentData(activeStudents);

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

          classesAndDivisions[student.currentClass][division].push(student.id);
        }
      });

      const updatedStudents = activeStudents.map((student) => {
        const keyParts = student.id.split("-");
        const className = keyParts[0];
        const division = keyParts[1];
        const srNo = keyParts[keyParts.length - 1];
        return { ...student, className, division, srNo };
      });

      setClasses(Object.keys(classesAndDivisions));
      setStudentData(updatedStudents);
    };

    request.onerror = (event) => {
      console.error("Error fetching student data from IndexedDB:", event.target.error);
    };
  } catch (error) {
    console.error("Error fetching student data:", error);
  }
};
=======
  const filteredExamNames = examNames.filter(
    (examName) => examName === "Semester Second ",
  );

  // IndexedDB constants
  const DB_NAME = "SchoolManagementDB";
  const STUDENT_STORE = "studentData";
  const DB_VERSION = 1;
  const SCHOOL_STORE = "schoolData";

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

  // Function to fetch student data from IndexedDB
  const fetchStudentData = async () => {
    try {
      const db = await openDB();
      if (!db) {
        console.error("Error: db object is not initialized");
        return;
      }

      const transaction = db.transaction(STUDENT_STORE, "readonly");
      const store = transaction.objectStore(STUDENT_STORE);
      const request = store.getAll();

      request.onsuccess = (event) => {
        const students = event.target.result;

        // ✅ Filter out students where isActive is false
        const activeStudents = students.filter(
          (student) => student.isActive !== false,
        );

        setStudentData(activeStudents);

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

            classesAndDivisions[student.currentClass][division].push(
              student.id,
            );
          }
        });

        const updatedStudents = activeStudents.map((student) => {
          const keyParts = student.id.split("-");
          const className = keyParts[0];
          const division = keyParts[1];
          const srNo = keyParts[keyParts.length - 1];
          return { ...student, className, division, srNo };
        });

        setClasses(Object.keys(classesAndDivisions));
        setStudentData(updatedStudents);
      };

      request.onerror = (event) => {
        console.error(
          "Error fetching student data from IndexedDB:",
          event.target.error,
        );
      };
    } catch (error) {
      console.error("Error fetching student data:", error);
    }
  };
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557

  const fetchDivisionsForClass = async (classValue) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STUDENT_STORE, "readonly");
      const store = transaction.objectStore(STUDENT_STORE);
      const request = store.getAll(); // Fetch all students
<<<<<<< HEAD
  
      request.onsuccess = (event) => {
        const students = event.target.result;
        const divisionsForClass = new Set();
  
=======

      request.onsuccess = (event) => {
        const students = event.target.result;
        const divisionsForClass = new Set();

>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
        students.forEach((student) => {
          if (student.currentClass === classValue) {
            divisionsForClass.add(student.division);
          }
        });
<<<<<<< HEAD
  
=======

>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
        if (divisionsForClass.size === 0) {
          setDivisions(["A", "B", "C", "D"]);
        } else {
          setDivisions(Array.from(divisionsForClass));
        } // Update divisions state
      };
<<<<<<< HEAD
  
      request.onerror = (event) => {
        console.error("Error fetching divisions from IndexedDB:", event.target.error);
=======

      request.onerror = (event) => {
        console.error(
          "Error fetching divisions from IndexedDB:",
          event.target.error,
        );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      };
    } catch (error) {
      console.error("Error opening IndexedDB:", error);
    }
  };

  // Function to fetch student data from IndexedDB
  // const fetchStudentData = async (db) => {
  //   return new Promise((resolve, reject) => {
  //     const transaction = db.transaction(STUDENT_STORE, "readonly");
  //     const store = transaction.objectStore(STUDENT_STORE);
  //     const request = store.getAll();
<<<<<<< HEAD
  
  //     request.onsuccess = (event) => {
  //       const students = event.target.result;
  //       setStudentData(students);
  
=======

  //     request.onsuccess = (event) => {
  //       const students = event.target.result;
  //       setStudentData(students);
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557

  //       const classesAndDivisions = {};
  //       students.forEach((student) => {
  //         if (student && student.currentClass) {
  //           if (!classesAndDivisions[student.currentClass]) {
  //             classesAndDivisions[student.currentClass] = {};
  //           }
<<<<<<< HEAD
            
=======

>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  //           const division = student.division || "";
  //           if (!classesAndDivisions[student.currentClass][division]) {
  //             classesAndDivisions[student.currentClass][division] = [];
  //           }
<<<<<<< HEAD
            
=======

>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  //           // Use the ID as the serial number equivalent
  //           classesAndDivisions[student.currentClass][division].push(student.id);
  //         }
  //       });

  //       // Extract class, division, and srNo from key
  //       const updatedStudents = students.map(student => {
  //         const keyParts = student.id.split("-"); // Split by "-"
  //         const className = keyParts[0]; // First part is class
  //         const division = keyParts[1]; // Second part is division
  //         const srNo = keyParts[keyParts.length - 1]; // Last part is srNo
  //         return { ...student, className, division, srNo };
  //       });
<<<<<<< HEAD
  
=======

>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  //       setClasses(Object.keys(classesAndDivisions));
  //       setStudentData(updatedStudents); // Store updated students
  //       resolve(updatedStudents);
  //     };
<<<<<<< HEAD
  
  //     request.onerror = (event) => {
  //       console.error("Error fetching student data from IndexedDB:", event.target.error);
  //       reject(event.target.error);
        
=======

  //     request.onerror = (event) => {
  //       console.error("Error fetching student data from IndexedDB:", event.target.error);
  //       reject(event.target.error);

>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  //     };
  //   });
  // };

<<<<<<< HEAD

=======
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
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
<<<<<<< HEAD
  
    if (selectedClass) {
      await fetchDivisionsForClass(selectedClass);
      const filteredStudents = studentData.filter((student) => student.currentClass === selectedClass);
=======

    if (selectedClass) {
      await fetchDivisionsForClass(selectedClass);
      const filteredStudents = studentData.filter(
        (student) => student.currentClass === selectedClass,
      );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      setSelectedStudents(filteredStudents);
    } else {
      setSelectedStudents([]);
    }
  };

<<<<<<< HEAD

=======
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  // Fetch marks data from IndexedDB when exam name changes
  useEffect(() => {
    if (selectedExamName && classValue && academicYear) {
      const fetchMarks = async () => {
        try {
          const db = await openDB();
          const selectedStudents = studentData.filter(
<<<<<<< HEAD
            (student) => student.currentClass === classValue
          );
          setSelectedStudents(selectedStudents);
          const marksDataPromises = selectedStudents.map(async (student) => {
            const studentMarks = await fetchMarksData(db, student.srNo, academicYear, selectedExamName);
=======
            (student) => student.currentClass === classValue,
          );
          setSelectedStudents(selectedStudents);
          const marksDataPromises = selectedStudents.map(async (student) => {
            const studentMarks = await fetchMarksData(
              db,
              student.srNo,
              academicYear,
              selectedExamName,
            );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
            return { srNo: student.srNo, marks: studentMarks };
          });

          const marksDataArray = await Promise.all(marksDataPromises);
          const marksData = marksDataArray.reduce((acc, { srNo, marks }) => {
            acc[srNo] = marks;
            return acc;
          }, {});

          setMarksData(marksData);
        } catch (error) {
<<<<<<< HEAD
          console.error('Error fetching marks data:', error);
=======
          console.error("Error fetching marks data:", error);
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
        }
      };

      fetchMarks();
    }
  }, [selectedExamName, classValue, academicYear]);

<<<<<<< HEAD

=======
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  // const fetchStudentData = async () => {
  //   try {
  //     const response = await fetch(
  //       `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData.json`
  //     );
  //     if (!response.ok) {
  //       throw new Error("Network response was not ok");
  //     }
  //     const data = await response.json();
  //     const filteredData = Object.keys(data)
  //       .filter(key => data[key] !== null)
  //       .map(key => ({ srNo: key, ...data[key] }));
  //     setStudentData(filteredData);
  //     const classSet = new Set();
  //     const divisionSet = new Set();
  //     filteredData.forEach((student) => {
  //       if (student.currentClass) {
  //         classSet.add(String(student.currentClass));
  //       }
  //       if (student.division) {
  //         divisionSet.add(student.division);
  //       }
  //     });
  //     setClasses([...classSet]);
  //     setDivisions([...divisionSet]);
  //   } catch (error) {
  //     console.error("Error fetching student data:", error);
  //   }
  // };

  const fetchSubjectsForClassAndDivision = async (classValue, division) => {
    try {
      if (!classValue || !division || !academicYear) {
        console.error("Class, division, or academic year not set");
        return;
      }

      const url = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/${academicYear}/${classValue}/${division}.json`;
      const response = await fetch(url);
      if (!response.ok) {
<<<<<<< HEAD
        throw new Error(`Failed to fetch subjects for class ${classValue} and division ${division}`);
=======
        throw new Error(
          `Failed to fetch subjects for class ${classValue} and division ${division}`,
        );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      }
      const subjectsData = await response.json();
      if (subjectsData) {
        const validSubjects = Object.entries(subjectsData)
          .filter(([_, value]) => value !== null && value !== undefined)
          .map(([_, subject]) => subject);

<<<<<<< HEAD
        setDivisionSubjects(prev => ({
=======
        setDivisionSubjects((prev) => ({
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
          ...prev,
          [classValue]: {
            ...prev[classValue],
            [division]: validSubjects,
          },
        }));
      } else {
<<<<<<< HEAD
        setDivisionSubjects(prev => ({
=======
        setDivisionSubjects((prev) => ({
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
          ...prev,
          [classValue]: {
            ...prev[classValue],
            [division]: [],
          },
        }));
      }
    } catch (error) {
      console.error(`Error fetching subjects: ${error}`);
    }
  };

  // Fetch subjects when class or division changes
  useEffect(() => {
    if (classValue && division) {
      fetchSubjectsForClassAndDivision(classValue, division);
    }
  }, [classValue, division, academicYear]);
  const fetchMarksForSelectedSubject = async () => {
    try {
      const selectedStudents = studentData.filter(
<<<<<<< HEAD
        (student) => student.currentClass === classValue
=======
        (student) => student.currentClass === classValue,
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      );
      setSelectedStudents(selectedStudents);
      const marksDataPromises = selectedStudents.map(async (student) => {
        const studentMarks = await fetchMarksData(
          student.srNo,
          academicYear,
<<<<<<< HEAD
          selectedExamName
=======
          selectedExamName,
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
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
<<<<<<< HEAD
      console.error('Error fetching marks data:', error);
=======
      console.error("Error fetching marks data:", error);
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
    }
  };
  // const fetchMarksData = async (srNo, academicYear, examName) => {
  //   const url = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${srNo}/result/${academicYear}/${examName}.json`;
  //   try {
  //     const response = await fetch(url);
  //     if (!response.ok) {
  //       throw new Error(`Error fetching data: ${response.statusText}`);
  //     }
  //     const data = await response.json();
  //     return data || {};
  //   } catch (error) {
  //     console.error('Error fetching marks data:', error);
  //     return {};
  //   }
  // };
  // const [selectedStudentForSr, setSelectedStudentForSr] = useState('')
<<<<<<< HEAD
  
=======

>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  // const viewResult = async (srNo) => {
  //   try {
  //     // Find the selected student based on srNo
  //     const student = selectedStudents.find((student) => student.srNo === srNo);
  //     setSelectedStudentForSr(student);
<<<<<<< HEAD
  
  //     if (!student) {
  //       throw new Error("Student not found");
  //     }
  
=======

  //     if (!student) {
  //       throw new Error("Student not found");
  //     }

>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  //     let results = {};
  //     if (selectedExamName === "All Exams") {
  //       // Fetch data for all exams
  //       const exams = ["Unit Test I", "Unit Test II", "Semester First ", "Semester Second "];
  //       const promises = exams.map((exam) => {
  //         return fetch(
  //           `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${srNo}/result/${academicYear}/${exam}.json`
  //         )
  //           .then((response) => response.json())
  //           .then((data) => ({ exam, data }));
  //       });
<<<<<<< HEAD
  
=======

>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  //       const examResults = await Promise.all(promises);
  //       results = examResults.reduce((acc, { exam, data }) => {
  //         acc[exam] = data;
  //         return acc;
  //       }, {});
<<<<<<< HEAD
  
=======

>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  //       // Combine the data into a single object
  //       const combinedResults = {};
  //       Object.keys(results).forEach((exam) => {
  //         Object.keys(results[exam]).forEach((subject) => {
  //           if (!combinedResults[subject]) {
  //             combinedResults[subject] = {};
  //           }
  //           combinedResults[subject][exam] = results[exam][subject];
  //         });
  //       });
  //       results = combinedResults;
  //     } else {
  //       const url = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${srNo}/result/${academicYear}/${selectedExamName}.json`;
  //       const response = await fetch(url);
  //       if (!response.ok) {
  //         throw new Error(`Failed to fetch data: ${response.statusText}`);
  //       }
  //       results = await response.json();
  //     }
<<<<<<< HEAD
  
=======

>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  //     // Set state with the selected exam data and student details
  //     setSelectedStudentResults({
  //       studentName: student.stdName,
  //       results: results,
  //       stdMother: student.stdMother,
  //       stdFather: student.stdFather,
  //       stdSurname: student.stdSurname,
  //       dob: student.dob,
  //       division: student.division,
  //       motherTounge: student.motherTounge,
  //       studentId: student.studentId,
  //       gender: student.gender,
  //       registerNo: student.registerNo,
  //       rollNo: student.rollNo,
  //       stdPhoto: student.stdPhoto,
  //     });
<<<<<<< HEAD
  
=======

>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  //     // Show the results modal
  //     setShowModal(true);
  //   } catch (error) {
  //     console.error("Error fetching student results:", error);
  //     setAlertMessage("Add the subject and fill the marks to view the result.");
  //   }
  // };
<<<<<<< HEAD
    const [selectedStudentForSr, setSelectedStudentForSr] = useState('');
  

    const fetchMarksData = async (key, academicYear, examName) => {
      try {
        const db = await openDB();
        const transaction = db.transaction(STUDENT_STORE, "readonly");
        const store = transaction.objectStore(STUDENT_STORE);
        
        // Find the correct key based on the numeric identifier
=======
  const [selectedStudentForSr, setSelectedStudentForSr] = useState("");

  const fetchMarksData = async (key, academicYear, examName) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STUDENT_STORE, "readonly");
      const store = transaction.objectStore(STUDENT_STORE);

      // Find the correct key based on the numeric identifier
      const allKeys = await new Promise((resolve, reject) => {
        const keysRequest = store.getAllKeys();
        keysRequest.onsuccess = (event) => resolve(event.target.result);
        keysRequest.onerror = (event) => reject(event.target.error);
      });

      const matchingKey = allKeys.find(
        (storeKey) =>
          typeof storeKey === "string" && storeKey.endsWith(`-${key}`),
      );

      if (!matchingKey) {
        console.error("No matching key found for:", key);
        return {};
      }

      const request = store.get(matchingKey);

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const studentData = event.target.result;

          if (
            !studentData ||
            !studentData.result ||
            !studentData.result[academicYear]
          ) {
            console.warn("No academic year data found");
            resolve({});
            return;
          }

          const yearData = studentData.result[academicYear];

          if (examName === "All Exams") {
            // Return all exam data for the academic year
            const allExamsData = {};

            // Get all available exams for this academic year
            const availableExams = Object.keys(yearData);

            availableExams.forEach((exam) => {
              allExamsData[exam] = yearData[exam];
            });

            resolve(allExamsData);
          } else {
            // Return data for specific exam
            if (yearData[examName]) {
              resolve(yearData[examName]);
            } else {
              console.warn(`No data found for exam: ${examName}`);
              resolve({});
            }
          }
        };

        request.onerror = (event) => {
          console.error(
            "Error fetching marks from IndexedDB:",
            event.target.error,
          );
          reject(event.target.error);
        };
      });
    } catch (error) {
      console.error("Error in fetchMarksData:", error);
      return {};
    }
  };

  const viewResult = async (srNo) => {
    try {
      // Find the selected student based on srNo
      const student = selectedStudents.find((student) => student.srNo === srNo);
      setSelectedStudentForSr(student);

      if (!student) {
        throw new Error("Student not found");
      }

      let results = {};
      if (selectedExamName === "All Exams") {
        // Fetch data for all exams from IndexedDB
        const db = await openDB();
        const transaction = db.transaction(STUDENT_STORE, "readonly");
        const store = transaction.objectStore(STUDENT_STORE);

>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
        const allKeys = await new Promise((resolve, reject) => {
          const keysRequest = store.getAllKeys();
          keysRequest.onsuccess = (event) => resolve(event.target.result);
          keysRequest.onerror = (event) => reject(event.target.error);
        });
<<<<<<< HEAD
    
        const matchingKey = allKeys.find(storeKey => 
          typeof storeKey === 'string' && 
          storeKey.endsWith(`-${key}`)
        );
    
        if (!matchingKey) {
          console.error('No matching key found for:', key);
          return {};
        }
    
        const request = store.get(matchingKey);
    
        return new Promise((resolve, reject) => {
          request.onsuccess = (event) => {
            const studentData = event.target.result;
            
            if (!studentData || !studentData.result || !studentData.result[academicYear]) {
              console.warn('No academic year data found');
              resolve({});
              return;
            }
    
            const yearData = studentData.result[academicYear];
            
            if (examName === "All Exams") {
              // Return all exam data for the academic year
              const allExamsData = {};
              
              // Get all available exams for this academic year
              const availableExams = Object.keys(yearData);
              
              availableExams.forEach(exam => {
                allExamsData[exam] = yearData[exam];
              });
              
              resolve(allExamsData);
            } else {
              // Return data for specific exam
              if (yearData[examName]) {
                resolve(yearData[examName]);
              } else {
                console.warn(`No data found for exam: ${examName}`);
                resolve({});
              }
            }
          };
    
          request.onerror = (event) => {
            console.error("Error fetching marks from IndexedDB:", event.target.error);
            reject(event.target.error);
          };
        });
      } catch (error) {
        console.error('Error in fetchMarksData:', error);
        return {};
      }
    };
  
    const viewResult = async (srNo) => {
      try {
          // Find the selected student based on srNo
          const student = selectedStudents.find((student) => student.srNo === srNo);
          setSelectedStudentForSr(student);
  
          if (!student) {
              throw new Error("Student not found");
          }
  
          let results = {};
          if (selectedExamName === "All Exams") {
              // Fetch data for all exams from IndexedDB
              const db = await openDB();
              const transaction = db.transaction(STUDENT_STORE, "readonly");
              const store = transaction.objectStore(STUDENT_STORE);
  
              const allKeys = await new Promise((resolve, reject) => {
                  const keysRequest = store.getAllKeys();
                  keysRequest.onsuccess = (event) => resolve(event.target.result);
                  keysRequest.onerror = (event) => reject(event.target.error);
              });
  
              const matchingKey = allKeys.find(storeKey => 
                  typeof storeKey === 'string' && 
                  storeKey.endsWith(`-${srNo}`)
              );
  
              if (!matchingKey) {
                  console.error("Student not found for key:", srNo);
                  setAlertMessage("Student not found. Please check the student details.");
                  return;
              }
  
              const studentData = await new Promise((resolve, reject) => {
                  const request = store.get(matchingKey);
                  request.onsuccess = (event) => resolve(event.target.result);
                  request.onerror = (event) => reject(event.target.error);
              });
  
              if (!studentData || !studentData.result || !studentData.result[academicYear]) {
                  console.warn('No academic year data found');
                  setAlertMessage("No marks found for this student.");
                  return;
              }
  
              const yearData = studentData.result[academicYear];
              const exams = ["Unit Test I", "Unit Test II", "Semester First ", "Semester Second "];
  
              // Combine the data into a single object
              const combinedResults = {};
              for (const exam of exams) {
                  if (yearData[exam]) {
                      Object.keys(yearData[exam]).forEach(subject => {
                          if (!combinedResults[subject]) {
                              combinedResults[subject] = {};
                          }
                          combinedResults[subject][exam] = yearData[exam][subject];
                      });
                  }
              }
              results = combinedResults;
          } else {
              // Fetch data for a specific exam
              const url = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${srNo}/result/${academicYear}/${selectedExamName}.json`;
              const response = await fetch(url);
              if (!response.ok) {
                  throw new Error(`Failed to fetch data: ${response.statusText}`);
              }
              results = await response.json();
          }
  
          // Set state with the selected exam data and student details
          setSelectedStudentResults({
              studentName: student.stdName,
              results: results,
              stdMother: student.stdMother,
              stdFather: student.stdFather,
              stdSurname: student.stdSurname,
              dob: student.dob,
              division: student.division,
              motherTounge: student.motherTounge,
              studentId: student.studentId,
              gender: student.gender,
              registerNo: student.registerNo,
              rollNo: student.rollNo,
              stdPhoto: student.stdPhoto,
          });
  
          // Show the results modal
          setShowModal(true);
      } catch (error) {
          console.error("Error fetching student results:", error);
          setAlertMessage("Add the subject and fill the marks to view the result.");
      }
  };



  const calculateGradeEnglish = (total) => {
    if (total >= 90) return 'A+';
    if (total >= 80) return 'A';
    if (total >= 70) return 'B+';
    if (total >= 60) return 'B';
    if (total >= 50) return 'C+';
    if (total >= 40) return 'C';
    if (total >= 30) return 'D+';
    if (total >= 20) return 'D';
    return 'Fail';
  };

  const calculateGradeMarathi = (total) => {
    if (total >= 90) return 'अ-1';
    if (total >= 80) return 'अ-2';
    if (total >= 70) return 'ब-1';
    if (total >= 60) return 'ब-2';
    if (total >= 50) return 'क-1';
    if (total >= 40) return 'क-2';
    if (total >= 30) return 'ड-1';
    if (total >= 20) return 'ड-2';
    return 'नापास';
  };
  // Function to calculate grade based on the current language
  const calculateGrade = (total) => {
    return language === 'English' ? calculateGradeEnglish(total) : calculateGradeMarathi(total);
  };
  const handleCloseModal = () => setShowModal(false);
  //  setting marks to pass 
  const getPassingMarks = (currentClass) => {
    if (selectedStudentForSr.currentClass === "Class V" || selectedStudentForSr.currentClass === "इयत्ता पाचवी") {
      return 18;
    } else if (selectedStudentForSr.currentClass === "Class VIII" || selectedStudentForSr.currentClass === "इयत्ता आठवी") {
=======

        const matchingKey = allKeys.find(
          (storeKey) =>
            typeof storeKey === "string" && storeKey.endsWith(`-${srNo}`),
        );

        if (!matchingKey) {
          console.error("Student not found for key:", srNo);
          setAlertMessage(
            "Student not found. Please check the student details.",
          );
          return;
        }

        const studentData = await new Promise((resolve, reject) => {
          const request = store.get(matchingKey);
          request.onsuccess = (event) => resolve(event.target.result);
          request.onerror = (event) => reject(event.target.error);
        });

        if (
          !studentData ||
          !studentData.result ||
          !studentData.result[academicYear]
        ) {
          console.warn("No academic year data found");
          setAlertMessage("No marks found for this student.");
          return;
        }

        const yearData = studentData.result[academicYear];
        const exams = [
          "Unit Test I",
          "Unit Test II",
          "Semester First ",
          "Semester Second ",
        ];

        // Combine the data into a single object
        const combinedResults = {};
        for (const exam of exams) {
          if (yearData[exam]) {
            Object.keys(yearData[exam]).forEach((subject) => {
              if (!combinedResults[subject]) {
                combinedResults[subject] = {};
              }
              combinedResults[subject][exam] = yearData[exam][subject];
            });
          }
        }
        results = combinedResults;
      } else {
        // Fetch data for a specific exam
        const url = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${srNo}/result/${academicYear}/${selectedExamName}.json`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
        results = await response.json();
      }

      // Set state with the selected exam data and student details
      setSelectedStudentResults({
        studentName: student.stdName,
        results: results,
        stdMother: student.stdMother,
        stdFather: student.stdFather,
        stdSurname: student.stdSurname,
        dob: student.dob,
        division: student.division,
        motherTounge: student.motherTounge,
        studentId: student.studentId,
        gender: student.gender,
        registerNo: student.registerNo,
        rollNo: student.rollNo,
        stdPhoto: student.stdPhoto,
      });

      // Show the results modal
      setShowModal(true);
    } catch (error) {
      console.error("Error fetching student results:", error);
      setAlertMessage("Add the subject and fill the marks to view the result.");
    }
  };

  const calculateGradeEnglish = (total) => {
    if (total >= 90) return "A+";
    if (total >= 80) return "A";
    if (total >= 70) return "B+";
    if (total >= 60) return "B";
    if (total >= 50) return "C+";
    if (total >= 40) return "C";
    if (total >= 30) return "D+";
    if (total >= 20) return "D";
    return "Fail";
  };

  const calculateGradeMarathi = (total) => {
    if (total >= 90) return "अ-1";
    if (total >= 80) return "अ-2";
    if (total >= 70) return "ब-1";
    if (total >= 60) return "ब-2";
    if (total >= 50) return "क-1";
    if (total >= 40) return "क-2";
    if (total >= 30) return "ड-1";
    if (total >= 20) return "ड-2";
    return "नापास";
  };
  // Function to calculate grade based on the current language
  const calculateGrade = (total) => {
    return language === "English"
      ? calculateGradeEnglish(total)
      : calculateGradeMarathi(total);
  };
  const handleCloseModal = () => setShowModal(false);
  //  setting marks to pass
  const getPassingMarks = (currentClass) => {
    if (
      selectedStudentForSr.currentClass === "Class V" ||
      selectedStudentForSr.currentClass === "इयत्ता पाचवी"
    ) {
      return 18;
    } else if (
      selectedStudentForSr.currentClass === "Class VIII" ||
      selectedStudentForSr.currentClass === "इयत्ता आठवी"
    ) {
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      return 21;
    }
    // Default passing marks if none of the specified classes are selected
    return 18;
  };

<<<<<<< HEAD




  const handlePrint = async () => {
    try {
      const printContent = document.querySelector('.modal-body'); // Select the modal body content

      if (!printContent) {
        console.error('Print content not found');
=======
  const handlePrint = async () => {
    try {
      const printContent = document.querySelector(".modal-body"); // Select the modal body content

      if (!printContent) {
        console.error("Print content not found");
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
        return;
      }

      // Clone the print content and apply styles
      const clone = printContent.cloneNode(true);

      // Apply scaling with increased size
      clone.style.padding = "10px"; // Add padding to balance scaling
      clone.style.margin = "0 auto"; // Center the content
      clone.style.transform = "scale(1.2)"; // Increase scale size
      clone.style.transformOrigin = "top center"; // Scale from the center-top
      clone.style.width = "fit-content"; // Ensure it doesn't overflow horizontally

      // Reset unnecessary styles to avoid blank space
<<<<<<< HEAD
      clone.querySelectorAll('p').forEach(p => {
=======
      clone.querySelectorAll("p").forEach((p) => {
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
        p.style.margin = "0";
        p.style.padding = "0";
        p.style.lineHeight = "1.4";
      });

      // Create a temporary container for the clone
      const printContainer = document.createElement("div");
      printContainer.style.margin = "0 auto"; // Center container
      printContainer.appendChild(clone);

      // Use printJS to print the content
      printJS({
        printable: printContainer.innerHTML,
<<<<<<< HEAD
        type: 'raw-html',
=======
        type: "raw-html",
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
        style: `
                    @media print {
                        body { margin: 0; padding: 0; }
                        p { margin: 0; padding: 0; line-height: 1.4; }
    
     .table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .table th, .table td {
      border: 1px solid #000;
      padding: 8px;
      text-align: center;
      font-size: 12px
    }
    
    .table th {
      background-color: #f2f2f2;
      font-weight: bold;
        font-size: 12px
    }
    
    .table thead th {
      vertical-align: middle;
    }
    
    .table tbody td {
      vertical-align: middle;
    }
    
    .text-center {
      text-align: center;
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
                        .grad{
      position: absolute; /* add this */
      bottom: 25px; /* add this */
      left: 20px; /* add this */
      width: 90%; /* add this */
    }
                        @page {
                            margin: 0; /* Remove default page margins */
                        }
                    }
<<<<<<< HEAD
                `
      });
    } catch (error) {
      console.error('Error in handlePrint:', error);
=======
                `,
      });
    } catch (error) {
      console.error("Error in handlePrint:", error);
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
    }
  };

  return (
    <div>
      <AlertMessage message={alertMessage} show={showAlert} />

<<<<<<< HEAD

      <div className=' main-content-of-page'>
        <h3 style={{ color: 'rgb(3, 54, 94)', textAlign: 'center' }}> {language === "English" ? "HSC Exam Result " : " परीक्षेचा निकाल"}</h3>
        <table className="table table-striped table-bordered">
          <tbody>
            <tr>
              <th style={{ width: 'calc(100% / 7)' }}> {language === "English" ? "Year " : "शैक्षणिक वर्ष  "}</th>
=======
      <div className=" main-content-of-page">
        <h3 style={{ color: "rgb(3, 54, 94)", textAlign: "center" }}>
          {" "}
          {language === "English" ? "HSC Exam Result " : " परीक्षेचा निकाल"}
        </h3>
        <table className="table table-striped table-bordered">
          <tbody>
            <tr>
              <th style={{ width: "calc(100% / 7)" }}>
                {" "}
                {language === "English" ? "Year " : "शैक्षणिक वर्ष  "}
              </th>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
              <td>
                <select
                  id="academicYear"
                  defaultValue={academicYear} // Add this prop
                  value={academicYear}
                  onChange={handleAcademicYearChange}
                  className="form-control custom-select"
                >
<<<<<<< HEAD
                  <option >{language === "English" ? "Select Year " : "वर्ष निवडा "}</option>
                  <option value="2023-2024" >2023-2024</option>
                  <option value="2024-2025" selected>2024-2025</option>
=======
                  <option>
                    {language === "English" ? "Select Year " : "वर्ष निवडा "}
                  </option>
                  <option value="2023-2024">2023-2024</option>
                  <option value="2024-2025" selected>
                    2024-2025
                  </option>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  <option value="2025-2026">2025-2026</option>
                  <option value="2026-2027">2026-2027</option>
                </select>
              </td>
            </tr>
<<<<<<< HEAD
          
          
          
            <tr>
  <th> {language === "English" ? "Class " : "वर्ग"}</th>
  <td>
    <select
      id="class"
      value={classValue}
      onChange={handleClassChange}
      className="form-control custom-select"
    >
      <option value="">{language === "English" ? "Select Class " : "वर्ग निवडा"}</option>
        {classes.filter(cls => cls === "Class XI" || cls === "Class XII" || cls === "11th" || cls === "Class 12th" || cls === "इयत्ता अकरावी" || cls === "अकरावी" || cls === "इयत्ता ११ वी"|| cls === "इयत्ता १२ वी" || cls === "इयत्ता बारावी" || cls === "बारावी" ).map((cls, index) => (

        <option key={index} value={cls}>
          {cls}
        </option>
      ))}
    </select>
  </td>
</tr>
           
           
           
           
            <tr>
              <th>{language === "English" ? "Division " : "तुकडी"}</th>
              <td>
    <select
      id="division"
      value={division}
      onChange={(e) => setDivision(e.target.value)}
      className="form-control custom-select"
    >
      <option value="">{language === "English" ? "All Students" : "सर्व विद्यार्थी"}</option>
      {divisions
        .filter((div) => div !== null && div !== undefined && div.trim() !== "")
        .map((div, index) => (
          <option key={index} value={div}>
            {div}
          </option>
        ))}
    </select>
  </td>

=======

            <tr>
              <th> {language === "English" ? "Class " : "वर्ग"}</th>
              <td>
                <select
                  id="class"
                  value={classValue}
                  onChange={handleClassChange}
                  className="form-control custom-select"
                >
                  <option value="">
                    {language === "English" ? "Select Class " : "वर्ग निवडा"}
                  </option>
                  {classes
                    .filter(
                      (cls) =>
                        cls === "Class XI" ||
                        cls === "Class XII" ||
                        cls === "11th" ||
                        cls === "Class 12th" ||
                        cls === "इयत्ता अकरावी" ||
                        cls === "अकरावी" ||
                        cls === "इयत्ता ११ वी" ||
                        cls === "इयत्ता १२ वी" ||
                        cls === "इयत्ता बारावी" ||
                        cls === "बारावी",
                    )
                    .map((cls, index) => (
                      <option key={index} value={cls}>
                        {cls}
                      </option>
                    ))}
                </select>
              </td>
            </tr>

            <tr>
              <th>{language === "English" ? "Division " : "तुकडी"}</th>
              <td>
                <select
                  id="division"
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                  className="form-control custom-select"
                >
                  <option value="">
                    {language === "English"
                      ? "All Students"
                      : "सर्व विद्यार्थी"}
                  </option>
                  {divisions
                    .filter(
                      (div) =>
                        div !== null && div !== undefined && div.trim() !== "",
                    )
                    .map((div, index) => (
                      <option key={index} value={div}>
                        {div}
                      </option>
                    ))}
                </select>
              </td>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
            </tr>
            <tr>
              <th>{language === "English" ? "Exam Name " : "परीक्षा"}</th>
              <td>
                <select
                  id="examName"
                  value={selectedExamName}
                  onChange={handleExamNameChange}
                  className="form-control custom-select"
                >
<<<<<<< HEAD
                  <option value="">{language === "English" ? "Select Exam" : "परीक्षा निवडा"}</option>
                  {examNames.map((examName, index) => (
                    <option key={index} value={examName}>
                      {language === "English" ? examName : examNameTranslations[examName]}
=======
                  <option value="">
                    {language === "English" ? "Select Exam" : "परीक्षा निवडा"}
                  </option>
                  {examNames.map((examName, index) => (
                    <option key={index} value={examName}>
                      {language === "English"
                        ? examName
                        : examNameTranslations[examName]}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                    </option>
                  ))}
                </select>
              </td>
            </tr>

            {academicYear && academicYear !== "2024-2025" && (
<<<<<<< HEAD
  <tr>
    <th>{language === "English" ? "Previous Year Class" : "मागील वर्षाचा वर्ग"}</th>
    <td>
      <select
        value={previousYearClass}
        onChange={(e) => setPreviousYearClass(e.target.value)}
        className="form-control custom-select"
      >
        <option value="">{language === "English" ? "Select Previous Year Class" : "मागील वर्षाचा वर्ग निवडा"}</option>
        {classes.filter(cls => 
          cls === "Class XI" || cls === "Class XII" || 
          cls === "11th" || cls === "Class 12th" || 
          cls === "इयत्ता अकरावी" || cls === "अकरावी" || 
          cls === "इयत्ता ११ वी" || cls === "इयत्ता १२ वी" || 
          cls === "इयत्ता बारावी" || cls === "बारावी"
        ).map((cls, index) => (
          <option key={index} value={cls}>
            {cls}
          </option>
        ))}
      </select>
    </td>
  </tr>
)}


=======
              <tr>
                <th>
                  {language === "English"
                    ? "Previous Year Class"
                    : "मागील वर्षाचा वर्ग"}
                </th>
                <td>
                  <select
                    value={previousYearClass}
                    onChange={(e) => setPreviousYearClass(e.target.value)}
                    className="form-control custom-select"
                  >
                    <option value="">
                      {language === "English"
                        ? "Select Previous Year Class"
                        : "मागील वर्षाचा वर्ग निवडा"}
                    </option>
                    {classes
                      .filter(
                        (cls) =>
                          cls === "Class XI" ||
                          cls === "Class XII" ||
                          cls === "11th" ||
                          cls === "Class 12th" ||
                          cls === "इयत्ता अकरावी" ||
                          cls === "अकरावी" ||
                          cls === "इयत्ता ११ वी" ||
                          cls === "इयत्ता १२ वी" ||
                          cls === "इयत्ता बारावी" ||
                          cls === "बारावी",
                      )
                      .map((cls, index) => (
                        <option key={index} value={cls}>
                          {cls}
                        </option>
                      ))}
                  </select>
                </td>
              </tr>
            )}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
          </tbody>
        </table>

        {selectedStudents.length > 0 && (
          <div className="mt-4">
            <table className="table table-striped table-bordered custom-table">
              <thead>
                <tr>
<<<<<<< HEAD
                  <th className="custom-width">{language === "English" ? "Roll No " : "हजेरी क्र"}</th>
                  <th>{language === "English" ? "Student Name " : "विद्यार्थ्याचे नाव"}</th>
=======
                  <th className="custom-width">
                    {language === "English" ? "Roll No " : "हजेरी क्र"}
                  </th>
                  <th>
                    {language === "English"
                      ? "Student Name "
                      : "विद्यार्थ्याचे नाव"}
                  </th>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  <th>{language === "English" ? "result " : "प्रगतीपत्रक"}</th>
                </tr>
              </thead>
              <tbody>
<<<<<<< HEAD
               
 {selectedStudents
  .filter((student) => division === "" || student.division === division)
  .sort((a, b) => a.rollNo - b.rollNo)
  .map((student) => (
    <tr key={student.srNo}>
      <td>{student.rollNo}</td>
      <td>{student.stdName} {student.stdSurname}</td>
      <td>
        <button className="btn btn-primary" onClick={() => viewResult(student.srNo)}>
          {language === "English" ? "View result" : "प्रगति पत्रक"}
        </button>
      </td>
    </tr>
  ))
}
=======
                {selectedStudents
                  .filter(
                    (student) =>
                      division === "" || student.division === division,
                  )
                  .sort((a, b) => a.rollNo - b.rollNo)
                  .map((student) => (
                    <tr key={student.srNo}>
                      <td>{student.rollNo}</td>
                      <td>
                        {student.stdName} {student.stdSurname}
                      </td>
                      <td>
                        <button
                          className="btn btn-primary"
                          onClick={() => viewResult(student.srNo)}
                        >
                          {language === "English"
                            ? "View result"
                            : "प्रगति पत्रक"}
                        </button>
                      </td>
                    </tr>
                  ))}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
              </tbody>
            </table>
          </div>
        )}

<<<<<<< HEAD

        <Modal show={showModal} onHide={handleCloseModal} dialogClassName='modal-80w'>
          <Modal.Header closeButton>
            <Modal.Title>{language === "English" ? " Exam result " : "विद्यार्थ्यांचे निकाल"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedExamName === 'All Exams' && selectedStudentResults ? (
              <div>
                {/* Semester Second  modal content */}
                <div className="r mt-1" style={{}}>
                  <div className="left" style={{
                    width: '615px',
                    height: '900px',
                    margin: '0 auto', // Center the div horizontally
                    padding: '20px', // Add some padding
                    border: '2px solid #000', // Optional: Add a border for visibility
                    boxSizing: 'border-box', // Include padding and border in the element's total width and height
                    overflow: 'hidden' // Prevent overflow if content is too large
                  }}>
                    <div className="school-info" >
=======
        <Modal
          show={showModal}
          onHide={handleCloseModal}
          dialogClassName="modal-80w"
        >
          <Modal.Header closeButton>
            <Modal.Title>
              {language === "English"
                ? " Exam result "
                : "विद्यार्थ्यांचे निकाल"}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedExamName === "All Exams" && selectedStudentResults ? (
              <div>
                {/* Semester Second  modal content */}
                <div className="r mt-1" style={{}}>
                  <div
                    className="left"
                    style={{
                      width: "615px",
                      height: "900px",
                      margin: "0 auto", // Center the div horizontally
                      padding: "20px", // Add some padding
                      border: "2px solid #000", // Optional: Add a border for visibility
                      boxSizing: "border-box", // Include padding and border in the element's total width and height
                      overflow: "hidden", // Prevent overflow if content is too large
                    }}
                  >
                    <div className="school-info">
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                      {schoolLogo && (
                        <div>
                          <img
                            src={schoolLogo}
                            alt="Logo"
<<<<<<< HEAD
                            style={{ width: '80px', height: 'auto', objectFit: 'contain' }}
=======
                            style={{
                              width: "80px",
                              height: "auto",
                              objectFit: "contain",
                            }}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                          />
                        </div>
                      )}
                      <h2>{schoolName}</h2>
                    </div>
                    <div>
<<<<<<< HEAD
                      <hr style={{
                        width: 'calc(100% + 40px)', // Adjust width to account for padding
                        height: '2px',
                        backgroundColor: 'black',
                        border: 'none',
                        marginLeft: '-20px', // Negative margin to pull it to the left
                        marginRight: '-20px', // Negative margin to pull it to the right
                        marginBottom: '6px', // Adjust this value to reduce the gap below the hr
                      }} />
                      <b>
                        <h6 style={{ textAlign: 'center', margin: '0' }}> {/* Set margin to 0 */}
                          {language === "English" ? "PROGRESS REPORT" : "विद्यार्थी प्रगती अहवाल"}
                        </h6>
                        <h6 style={{ textAlign: 'center', margin: '0' }}> {/* Set margin to 0 */}
                          {language === "English" ? `SECOND SEMESTER EXAMINATION- ${academicYear}` : `प्रथम सत्र परीक्षा-  ${academicYear}`}
                        </h6>
                      </b>
                      <hr style={{ width: 'calc(100% + 40px)', height: '2px', backgroundColor: 'black', border: 'none',marginLeft: '-20px', marginRight: '-20px', marginTop: '6px',marginBottom: '6px', 
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                      <div style={{ flex: '1', textAlign: 'left' }}>
                        <label htmlFor="roll-no" style={{ fontSize: '14px' }}>{language === "English" ? "Roll No : " : "हजेरी क्रमांक : "}</label>
                        <span>{selectedStudentResults?.rollNo || '-'}</span>
                      </div>
                      <div style={{ flex: '1', textAlign: 'center' }}>
                        <label htmlFor="Register No" style={{ fontSize: '14px' }}>{language === "English" ? "Register No : " : "रजिस्टर क्रमांक : "}</label>
                        <span>{selectedStudentResults?.registerNo || '-'}</span>
                      </div>
                      <div style={{ flex: '1', textAlign: 'right' }}>
  <label htmlFor="class" style={{ fontSize: '14px' }}>
    {language === "English" ? "Class : " : "वर्ग : "}
  </label>
  <span>
    {previousYearClass 
      ? `${previousYearClass}`
      : classValue || '-'} 
    {division ? ` ${division}` : ''}
  </span>
</div>
                    </div>
                    <hr style={{ width: 'calc(100% + 40px)', height: '2px', backgroundColor: 'black', border: 'none',marginLeft: '-20px', marginRight: '-20px', marginTop: '1px'
                    }} />
                     <div style={{ fontSize: '14px', marginLeft: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <div style={{ width: '70%' }}>
    <div>
      <label htmlFor="student-name" style={{ fontSize: '14px' }}>{language === "English" ? "Student Name : " : "विद्यार्थ्याचे नाव : "}</label>
      <span>{selectedStudentResults?.studentName || '-'} {selectedStudentResults?.stdFather || '-'} {selectedStudentResults?.stdSurname || '-'}</span>
    </div>
    <div>
      <label htmlFor="class" style={{ fontSize: '14px' }}>{language === "English" ? "Mother Name : " : "आईचे वर्ग : "}</label>
      <span>{ selectedStudentResults?.stdMother || '-'} </span>
    </div>
    <div>
      <label htmlFor="class" style={{ fontSize: '14px' }}>{language === "English" ? "Date Of Birth : " : "जन्मतारीख : "}</label>
      <span>{selectedStudentResults?.dob || '-'} </span>
    </div>
    <div>
      <label htmlFor="exam-roll-no" style={{ fontSize: '14px' }}>{language === "English" ? "Exam : " : "परीक्षा सत्र : "}</label>
      <span>{selectedExamName || '-'}</span>
    </div>
  </div>
<div style={{ width: '30%' }}>
  {selectedStudentResults?.stdPhoto && (
    <img src={selectedStudentResults?.stdPhoto} style={{ width: '80px', height: '80px' }} />
  )}
</div>
</div>
              
              
              
              
              
              
              {selectedStudentResults?.results ? (
  <table className="table table-striped table-bordered" style={{ fontSize: '12px', padding: '5px' }}>
  <thead>
      <tr>
        <th rowSpan="2" style={{ padding: '3px', color: 'black' }}>{language === "English" ? "Subject" : "विषय"}</th>
        {selectedExamName === "All Exams" ? (
          <>
            <th colSpan="2" style={{ padding: '3px', color: 'black' }}>{language === "English" ? "Unit Test I" : "पहिली चाचणी"}</th>
            <th colSpan="2" style={{ padding: '3px', color: 'black' }}>{language === "English" ? "Unit Test II" : "दुसरी चाचणी"}</th>
            <th colSpan="2" style={{ padding: '3px', color: 'black' }}>{language === "English" ? "Semester I " : "प्रथम सत्र"}</th>
            <th colSpan="2" style={{ padding: '3px', color: 'black' }}>{language === "English" ? "Semester II " : "द्वितीय सत्र"}</th>
          </>
        ) : (
          <th colSpan="2" style={{ padding: '3px', color: 'black' }}>{selectedExamName}</th>
        )}
        <th rowSpan="2" colSpan="2" style={{ padding: '3px', color: 'black' }}>{language === "English" ? "Grade" : "श्रेणी"}</th>
      </tr>
      <tr>
        {selectedExamName === "All Exams" ? (
          <>
            <th style={{ padding: '4px', color: 'black', fontWeight: 'normal' }}>{language === "English" ? "M.M" : "पैकी"}</th>
            <th style={{ padding: '4px', color: 'black', fontWeight: 'normal' }}>{language === "English" ? "Obt.M" : "गुण"}</th>
            <th style={{ padding: '4px', color: 'black', fontWeight: 'normal' }}>{language === "English" ? "M.M" : "पैकी"}</th>
            <th style={{ padding: '4px', color: 'black', fontWeight: 'normal' }}>{language === "English" ? "Obt.M" : "गुण"}</th>
            <th style={{ padding: '4px', color: 'black', fontWeight: 'normal' }}>{language === "English" ? "M.M" : "पैकी"}</th>
            <th style={{ padding: '4px', color: 'black', fontWeight: 'normal' }}>{language === "English" ? "Obt.M" : "गुण"}</th>
            <th style={{ padding: '4px', color: 'black', fontWeight: 'normal' }}>{language === "English" ? "M.M" : "पैकी"}</th>
            <th style={{ padding: '4px', color: 'black', fontWeight: 'normal' }}>{language === "English" ? "Obt.M" : "गुण"}</th>
          </>
        ) : (
          <>
            <th style={{ padding: '4px', color: 'black', fontWeight: 'normal' }}>{language === "English" ? "M.M" : "पैकी"}</th>
            <th style={{ padding: '4px', color: 'black', fontWeight: 'normal' }}>{language === "English" ? "Obt.M" : "गुण"}</th>
          </>
        )}
      </tr>
    </thead>
    <tbody>
      {selectedStudentResults && selectedStudentResults.results ? (
        subjectSequence
          .filter((subject) => {
            const grades = selectedStudentResults.results[subject];
            // Only include subjects where at least one of the grade fields has a valid value (not null or undefined)
            return grades && (
      grades["Unit Test I"]?.obtainMarks ||
      grades["Unit Test II"]?.obtainMarks ||
      grades["Semester First "]?.obtainMarks ||
      grades["Semester Second "]?.obtainMarks ||
      grades["Unit Test I"]?.grade ||
      grades["Unit Test II"]?.grade ||
      grades["Semester First "]?.grade ||
      grades["Semester Second "]?.grade
    );
          })
          .map((subject) => {
            const grades = selectedStudentResults.results[subject];
            // Calculate row-wise totals and percentage
            let totalOutOf = 0;
            let totalObtainMarks = 0;
            let rowPercentage = "-";
            let grade = "-";

            if (selectedExamName === "All Exams") {
              totalOutOf =
                (grades["Unit Test I"]?.outOf || 0) +
                (grades["Unit Test II"]?.outOf || 0) +
                (grades["Semester First "]?.outOf || 0) +
                (grades["Semester Second "]?.outOf || 0);
              totalObtainMarks =
                (grades["Unit Test I"]?.obtainMarks || 0) +
                (grades["Unit Test II"]?.obtainMarks || 0) +
                (grades["Semester First "]?.obtainMarks || 0) +
                (grades["Semester Second "]?.obtainMarks || 0);
              rowPercentage =
                totalOutOf > 0 ? ((totalObtainMarks / totalOutOf) * 100).toFixed(2) : "-";
              grade = rowPercentage !== "-" ? calculateGrade(Number(rowPercentage)) : "-";
            } else {
              totalOutOf = grades.outOf || 0;
              totalObtainMarks = grades.obtainMarks || 0;
              rowPercentage =
                totalOutOf > 0 ? ((totalObtainMarks / totalOutOf) * 100).toFixed(2) : "-";
              grade = rowPercentage !== "-" ? calculateGrade(Number(rowPercentage)) : "-";
            }

            return (
              <tr key={subject} style={{ padding: "2px" }}>
                <td style={{ padding: "2px", color: 'black' }}>
                  {subject}
                </td>

                {selectedExamName === "All Exams" ? (
                  <>
                  <td style={{ padding: "2px", color: 'black' }}>{grades["Unit Test I"]?.outOf || "-"}</td>
    <td style={{ padding: "2px", color: 'black' }}>
      {grades["Unit Test I"]?.grade ? grades["Unit Test I"]?.grade : grades["Unit Test I"]?.obtainMarks || "-"}
    </td>
    <td style={{ padding: "2px", color: 'black' }}>{grades["Unit Test II"]?.outOf || "-"}</td>
    <td style={{ padding: "2px", color: 'black' }}>
      {grades["Unit Test II"]?.grade ? grades["Unit Test II"]?.grade : grades["Unit Test II"]?.obtainMarks || "-"}
    </td>
    <td style={{ padding: "2px", color: 'black' }}>{grades["Semester First "]?.outOf || "-"}</td>
    <td style={{ padding: "2px", color: 'black' }}>
      {grades["Semester First "]?.grade ? grades["Semester First "]?.grade : grades["Semester First "]?.obtainMarks || "-"}
    </td>
    <td style={{ padding: "2px", color: 'black' }}>{grades["Semester Second "]?.outOf || "-"}</td>
    <td style={{ padding: "2px", color: 'black' }}>
      {grades["Semester Second "]?.grade ? grades["Semester Second "]?.grade : grades["Semester Second "]?.obtainMarks || "-"}
    </td>
                  </>

                ) : (
                  <>
                    <td style={{ padding: "2px", color: 'black' }}>{grades.outOf || "-"}</td>
                    <td style={{ padding: "2px", color: 'black' }}>{grades.obtainMarks || "-"}</td>
                  
                  
                  </>
                )}
                <td colSpan= "2" style={{ padding: "2px" }}>
                  <b>{grade}</b>
                </td>
              </tr>
              
              
            );
          })
      ) : (
        <tr>
          <td colSpan="6" style={{ padding: "5px" }}>
            {language === "English" ? "No data available" : "डेटा उपलब्ध नाही"}
          </td>
        </tr>
      )}
    </tbody> 


    
    <tfoot>
    <tr>
    <td colSpan="1" style={{ padding: "5px" }}>
      <b>{language === "English" ? "Total Marks" : "एकूण गुण"}</b>
    </td>

    {/* Total M.M and Obt.M for each exam */}
    {["Unit Test I", "Unit Test II", "Semester First ", "Semester Second "].map((exam, index) => (
      <>
        {/* Total M.M (Maximum Marks) */}
        <td colSpan="1" style={{ padding: "5px" }}>
          <b>
            {subjectSequence.reduce((total, subject) => {
              const grades = selectedStudentResults.results[subject];
              return total + (grades?.[exam]?.outOf || 0);
            }, 0)}
          </b>
        </td>

        {/* Total Obt.M (Obtained Marks) */}
        <td colSpan="1" style={{ padding: "5px" }}>
          <b>
            {subjectSequence.reduce((total, subject) => {
              const grades = selectedStudentResults.results[subject];
              return total + (grades?.[exam]?.obtainMarks || 0);
            }, 0)}
          </b>
        </td>
      </>
    ))}

    {/* Grand Total M.M */}
    <td style={{ padding: "5px" }}>
      <b>
        {subjectSequence.reduce((total, subject) => {
          const grades = selectedStudentResults.results[subject];
          return (
            total +
            (grades?.["Unit Test I"]?.outOf || 0) +
            (grades?.["Unit Test II"]?.outOf || 0) +
            (grades?.["Semester First "]?.outOf || 0) +
            (grades?.["Semester Second "]?.outOf || 0)
          );
        }, 0)}
      </b>
    </td>

    {/* Grand Total Obt.M */}
    <td style={{ padding: "5px" }}>
      <b>
        {subjectSequence.reduce((total, subject) => {
          const grades = selectedStudentResults.results[subject];
          return (
            total +
            (grades?.["Unit Test I"]?.obtainMarks || 0) +
            (grades?.["Unit Test II"]?.obtainMarks || 0) +
            (grades?.["Semester First "]?.obtainMarks || 0) +
            (grades?.["Semester Second "]?.obtainMarks || 0)
          );
        }, 0)}
      </b>
    </td>
  </tr>
    <tr>
      <td colSpan="1" style={{ padding: "5px" }}>
        <b>{language === "English" ? "Percentage" : "टक्केवारी"}</b>
      </td>
      {selectedExamName === "All Exams" ? (
        <>
          <td colSpan="2" style={{ padding: "5px" }}>
            <b>
              {(() => {
                const totalMaxMarks = subjectSequence
                  .filter((subject) => {
                    const grades = selectedStudentResults.results[subject];
                    return grades && (
                      grades["Unit Test I"]?.obtainMarks ||
                      grades["Unit Test II"]?.obtainMarks ||
                      grades["Semester First "]?.obtainMarks ||
                      grades["Semester Second "]?.obtainMarks
                    );
                  })
                  .reduce((total, subject) => {
                    const grades = selectedStudentResults.results[subject];
                    return total + (grades["Unit Test I"]?.outOf || 0);
                  }, 0);
                const totalObtainedMarks = subjectSequence
                  .filter((subject) => {
                    const grades = selectedStudentResults.results[subject];
                    return grades && (
                      grades["Unit Test I"]?.obtainMarks ||
                      grades["Unit Test II"]?.obtainMarks ||
                      grades["Semester First "]?.obtainMarks ||
                      grades["Semester Second "]?.obtainMarks
                    );
                  })
                  .reduce((total, subject) => {
                    const grades = selectedStudentResults.results[subject];
                    return total + (grades["Unit Test I"]?.obtainMarks || 0);
                  }, 0);
                return totalMaxMarks > 0 ? ((totalObtainedMarks / totalMaxMarks) * 100).toFixed(2) + "%" : "0%";
              })()}
            </b>
          </td>
          <td colSpan="2" style={{ padding: "5px" }}>
            <b>
              {(() => {
                const totalMaxMarks = subjectSequence
                  .filter((subject) => {
                    const grades = selectedStudentResults.results[subject];
                    return grades && (
                      grades["Unit Test I"]?.obtainMarks ||
                      grades["Unit Test II"]?.obtainMarks ||
                      grades["Semester First "]?.obtainMarks ||
                      grades["Semester Second "]?.obtainMarks
                    );
                  })
                  .reduce((total, subject) => {
                    const grades = selectedStudentResults.results[subject];
                    return total + (grades["Unit Test II"]?.outOf || 0);
                  }, 0);
                const totalObtainedMarks = subjectSequence
                  .filter((subject) => {
                    const grades = selectedStudentResults.results[subject];
                    return grades && (
                      grades["Unit Test I"]?.obtainMarks ||
                      grades["Unit Test II"]?.obtainMarks ||
                      grades["Semester First "]?.obtainMarks ||
                      grades["Semester Second "]?.obtainMarks
                    );
                  })
                  .reduce((total, subject) => {
                    const grades = selectedStudentResults.results[subject];
                    return total + (grades["Unit Test II"]?.obtainMarks || 0);
                  }, 0);
                return totalMaxMarks > 0 ? ((totalObtainedMarks / totalMaxMarks) * 100).toFixed(2) + "%" : "0%";
              })()}
            </b>
          </td>
          <td colSpan="2" style={{ padding: "5px" }}>
            <b>
              {(() => {
                const totalMaxMarks = subjectSequence
                  .filter((subject) => {
                    const grades = selectedStudentResults.results[subject];
                    return grades && (
                      grades["Unit Test I"]?.obtainMarks ||
                      grades["Unit Test II"]?.obtainMarks ||
                      grades["Semester First "]?.obtainMarks ||
                      grades["Semester Second "]?.obtainMarks
                    );
                  })
                  .reduce((total, subject) => {
                    const grades = selectedStudentResults.results[subject];
                    return total + (grades["Semester First "]?.outOf || 0);
                  }, 0);
                const totalObtainedMarks = subjectSequence
                  .filter((subject) => {
                    const grades = selectedStudentResults.results[subject];
                    return grades && (
                      grades["Unit Test I"]?.obtainMarks ||
                      grades["Unit Test II"]?.obtainMarks ||
                      grades["Semester First "]?.obtainMarks ||
                      grades["Semester Second "]?.obtainMarks
                    );
                  })
                  .reduce((total, subject) => {
                    const grades = selectedStudentResults.results[subject];
                    return total + (grades["Semester First "]?.obtainMarks || 0);
                  }, 0);
                return totalMaxMarks > 0 ? ((totalObtainedMarks / totalMaxMarks) * 100).toFixed(2) + "%" : "0%";
              })()}
            </b>
          </td>
          <td colSpan="2" style={{ padding: "5px" }}>
            <b>
              {(() => {
                const totalMaxMarks = subjectSequence
                  .filter((subject) => {
                    const grades = selectedStudentResults.results[subject];
                    return grades && (
                      grades["Unit Test I"]?.obtainMarks ||
                      grades["Unit Test II"]?.obtainMarks ||
                      grades["Semester First "]?.obtainMarks ||
                      grades["Semester Second "]?.obtainMarks
                    );
                  })
                  .reduce((total, subject) => {
                    const grades = selectedStudentResults.results[subject];
                    return total + (grades["Semester Second "]?.outOf || 0);
                  }, 0);
                const totalObtainedMarks = subjectSequence
                  .filter((subject) => {
                    const grades = selectedStudentResults.results[subject];
                    return grades && (
                      grades["Unit Test I"]?.obtainMarks ||
                      grades["Unit Test II"]?.obtainMarks ||
                      grades["Semester First "]?.obtainMarks ||
                      grades["Semester Second "]?.obtainMarks
                    );
                  })
                  .reduce((total, subject) => {
                    const grades = selectedStudentResults.results[subject];
                    return total + (grades["Semester Second "]?.obtainMarks || 0);
                  }, 0);
                return totalMaxMarks > 0 ? ((totalObtainedMarks / totalMaxMarks) * 100).toFixed(2) + "%" : "0%";
              })()}
            </b>
          </td>
        </>
      ) : (
        <td colSpan="2" style={{ padding: "5px" }}>
          <b>
            {(() => {
              const totalMaxMarks = subjectSequence
                .filter((subject) => {
                  const grades = selectedStudentResults.results[subject];
                  return grades && (
                    grades["Unit Test I"]?.obtainMarks ||
                    grades["Unit Test II"]?.obtainMarks ||
                    grades["Semester First "]?.obtainMarks ||
                    grades["Semester Second "]?.obtainMarks
                  );
                })
                .reduce((total, subject) => {
                  const grades = selectedStudentResults.results[subject];
                  return total + (grades.outOf || 0);
                }, 0);
              const totalObtainedMarks = subjectSequence
                .filter((subject) => {
                  const grades = selectedStudentResults.results[subject];
                  return grades && (
                    grades["Unit Test I"]?.obtainMarks ||
                    grades["Unit Test II"]?.obtainMarks ||
                    grades["Semester First "]?.obtainMarks ||
                    grades["Semester Second "]?.obtainMarks
                  );
                })
                .reduce((total, subject) => {
                  const grades = selectedStudentResults.results[subject];
                  return total + (grades.obtainMarks || 0);
                }, 0);
              return totalMaxMarks > 0 ? ((totalObtainedMarks / totalMaxMarks) * 100).toFixed(2) + "%" : "0%";
            })()}
          </b>
        </td>
      )}
      <td colSpan="2" style={{ padding: "5px" }}>
        <b>
          {(() => {
            const totalMaxMarks = subjectSequence
              .filter((subject) => {
                const grades = selectedStudentResults.results[subject];
                return grades && (
                  grades["Unit Test I"]?.obtainMarks ||
                  grades["Unit Test II"]?.obtainMarks ||
                  grades["Semester First "]?.obtainMarks ||
                  grades["Semester Second "]?.obtainMarks
                );
              })
              .reduce((total, subject) => {
                const grades = selectedStudentResults.results[subject];
                return total + (grades["Unit Test I"]?.outOf || 0) + (grades["Unit Test II"]?.outOf || 0) + (grades["Semester First "]?.outOf || 0) + (grades["Semester Second "]?.outOf || 0);
              }, 0);
            const totalObtainedMarks = subjectSequence
              .filter((subject) => {
                const grades = selectedStudentResults.results[subject];
                return grades && (
                  grades["Unit Test I"]?.obtainMarks ||
                  grades["Unit Test II"]?.obtainMarks ||
                  grades["Semester First "]?.obtainMarks ||
                  grades["Semester Second "]?.obtainMarks
                );
              })
              .reduce((total, subject) => {
                const grades = selectedStudentResults.results[subject];
                return total + (grades["Unit Test I"]?.obtainMarks || 0) + (grades["Unit Test II"]?.obtainMarks || 0) + (grades["Semester First "]?.obtainMarks || 0) + (grades["Semester Second "]?.obtainMarks || 0);
              }, 0);
            return totalMaxMarks > 0 ? ((totalObtainedMarks / totalMaxMarks) * 100).toFixed(2) + "%" : "0%";
          })()}
        </b>
      </td>
    </tr>
  </tfoot>



</table>
) : (
  <p style={{ fontSize: '12px' }}>{language === "English" ? "No results available." : "कोणतेही प्रगतीपत्रक उपलब्ध नाहीत."}</p>
)}
=======
                      <hr
                        style={{
                          width: "calc(100% + 40px)", // Adjust width to account for padding
                          height: "2px",
                          backgroundColor: "black",
                          border: "none",
                          marginLeft: "-20px", // Negative margin to pull it to the left
                          marginRight: "-20px", // Negative margin to pull it to the right
                          marginBottom: "6px", // Adjust this value to reduce the gap below the hr
                        }}
                      />
                      <b>
                        <h6 style={{ textAlign: "center", margin: "0" }}>
                          {" "}
                          {/* Set margin to 0 */}
                          {language === "English"
                            ? "PROGRESS REPORT"
                            : "विद्यार्थी प्रगती अहवाल"}
                        </h6>
                        <h6 style={{ textAlign: "center", margin: "0" }}>
                          {" "}
                          {/* Set margin to 0 */}
                          {language === "English"
                            ? `SECOND SEMESTER EXAMINATION- ${academicYear}`
                            : `प्रथम सत्र परीक्षा-  ${academicYear}`}
                        </h6>
                      </b>
                      <hr
                        style={{
                          width: "calc(100% + 40px)",
                          height: "2px",
                          backgroundColor: "black",
                          border: "none",
                          marginLeft: "-20px",
                          marginRight: "-20px",
                          marginTop: "6px",
                          marginBottom: "6px",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "14px",
                      }}
                    >
                      <div style={{ flex: "1", textAlign: "left" }}>
                        <label htmlFor="roll-no" style={{ fontSize: "14px" }}>
                          {language === "English"
                            ? "Roll No : "
                            : "हजेरी क्रमांक : "}
                        </label>
                        <span>{selectedStudentResults?.rollNo || "-"}</span>
                      </div>
                      <div style={{ flex: "1", textAlign: "center" }}>
                        <label
                          htmlFor="Register No"
                          style={{ fontSize: "14px" }}
                        >
                          {language === "English"
                            ? "Register No : "
                            : "रजिस्टर क्रमांक : "}
                        </label>
                        <span>{selectedStudentResults?.registerNo || "-"}</span>
                      </div>
                      <div style={{ flex: "1", textAlign: "right" }}>
                        <label htmlFor="class" style={{ fontSize: "14px" }}>
                          {language === "English" ? "Class : " : "वर्ग : "}
                        </label>
                        <span>
                          {previousYearClass
                            ? `${previousYearClass}`
                            : classValue || "-"}
                          {division ? ` ${division}` : ""}
                        </span>
                      </div>
                    </div>
                    <hr
                      style={{
                        width: "calc(100% + 40px)",
                        height: "2px",
                        backgroundColor: "black",
                        border: "none",
                        marginLeft: "-20px",
                        marginRight: "-20px",
                        marginTop: "1px",
                      }}
                    />
                    <div
                      style={{
                        fontSize: "14px",
                        marginLeft: "30px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ width: "70%" }}>
                        <div>
                          <label
                            htmlFor="student-name"
                            style={{ fontSize: "14px" }}
                          >
                            {language === "English"
                              ? "Student Name : "
                              : "विद्यार्थ्याचे नाव : "}
                          </label>
                          <span>
                            {selectedStudentResults?.studentName || "-"}{" "}
                            {selectedStudentResults?.stdFather || "-"}{" "}
                            {selectedStudentResults?.stdSurname || "-"}
                          </span>
                        </div>
                        <div>
                          <label htmlFor="class" style={{ fontSize: "14px" }}>
                            {language === "English"
                              ? "Mother Name : "
                              : "आईचे वर्ग : "}
                          </label>
                          <span>
                            {selectedStudentResults?.stdMother || "-"}{" "}
                          </span>
                        </div>
                        <div>
                          <label htmlFor="class" style={{ fontSize: "14px" }}>
                            {language === "English"
                              ? "Date Of Birth : "
                              : "जन्मतारीख : "}
                          </label>
                          <span>{selectedStudentResults?.dob || "-"} </span>
                        </div>
                        <div>
                          <label
                            htmlFor="exam-roll-no"
                            style={{ fontSize: "14px" }}
                          >
                            {language === "English"
                              ? "Exam : "
                              : "परीक्षा सत्र : "}
                          </label>
                          <span>{selectedExamName || "-"}</span>
                        </div>
                      </div>
                      <div style={{ width: "30%" }}>
                        {selectedStudentResults?.stdPhoto && (
                          <img
                            src={selectedStudentResults?.stdPhoto}
                            style={{ width: "80px", height: "80px" }}
                          />
                        )}
                      </div>
                    </div>

                    {selectedStudentResults?.results ? (
                      <table
                        className="table table-striped table-bordered"
                        style={{ fontSize: "12px", padding: "5px" }}
                      >
                        <thead>
                          <tr>
                            <th
                              rowSpan="2"
                              style={{ padding: "3px", color: "black" }}
                            >
                              {language === "English" ? "Subject" : "विषय"}
                            </th>
                            {selectedExamName === "All Exams" ? (
                              <>
                                <th
                                  colSpan="2"
                                  style={{ padding: "3px", color: "black" }}
                                >
                                  {language === "English"
                                    ? "Unit Test I"
                                    : "पहिली चाचणी"}
                                </th>
                                <th
                                  colSpan="2"
                                  style={{ padding: "3px", color: "black" }}
                                >
                                  {language === "English"
                                    ? "Unit Test II"
                                    : "दुसरी चाचणी"}
                                </th>
                                <th
                                  colSpan="2"
                                  style={{ padding: "3px", color: "black" }}
                                >
                                  {language === "English"
                                    ? "Semester I "
                                    : "प्रथम सत्र"}
                                </th>
                                <th
                                  colSpan="2"
                                  style={{ padding: "3px", color: "black" }}
                                >
                                  {language === "English"
                                    ? "Semester II "
                                    : "द्वितीय सत्र"}
                                </th>
                              </>
                            ) : (
                              <th
                                colSpan="2"
                                style={{ padding: "3px", color: "black" }}
                              >
                                {selectedExamName}
                              </th>
                            )}
                            <th
                              rowSpan="2"
                              colSpan="2"
                              style={{ padding: "3px", color: "black" }}
                            >
                              {language === "English" ? "Grade" : "श्रेणी"}
                            </th>
                          </tr>
                          <tr>
                            {selectedExamName === "All Exams" ? (
                              <>
                                <th
                                  style={{
                                    padding: "4px",
                                    color: "black",
                                    fontWeight: "normal",
                                  }}
                                >
                                  {language === "English" ? "M.M" : "पैकी"}
                                </th>
                                <th
                                  style={{
                                    padding: "4px",
                                    color: "black",
                                    fontWeight: "normal",
                                  }}
                                >
                                  {language === "English" ? "Obt.M" : "गुण"}
                                </th>
                                <th
                                  style={{
                                    padding: "4px",
                                    color: "black",
                                    fontWeight: "normal",
                                  }}
                                >
                                  {language === "English" ? "M.M" : "पैकी"}
                                </th>
                                <th
                                  style={{
                                    padding: "4px",
                                    color: "black",
                                    fontWeight: "normal",
                                  }}
                                >
                                  {language === "English" ? "Obt.M" : "गुण"}
                                </th>
                                <th
                                  style={{
                                    padding: "4px",
                                    color: "black",
                                    fontWeight: "normal",
                                  }}
                                >
                                  {language === "English" ? "M.M" : "पैकी"}
                                </th>
                                <th
                                  style={{
                                    padding: "4px",
                                    color: "black",
                                    fontWeight: "normal",
                                  }}
                                >
                                  {language === "English" ? "Obt.M" : "गुण"}
                                </th>
                                <th
                                  style={{
                                    padding: "4px",
                                    color: "black",
                                    fontWeight: "normal",
                                  }}
                                >
                                  {language === "English" ? "M.M" : "पैकी"}
                                </th>
                                <th
                                  style={{
                                    padding: "4px",
                                    color: "black",
                                    fontWeight: "normal",
                                  }}
                                >
                                  {language === "English" ? "Obt.M" : "गुण"}
                                </th>
                              </>
                            ) : (
                              <>
                                <th
                                  style={{
                                    padding: "4px",
                                    color: "black",
                                    fontWeight: "normal",
                                  }}
                                >
                                  {language === "English" ? "M.M" : "पैकी"}
                                </th>
                                <th
                                  style={{
                                    padding: "4px",
                                    color: "black",
                                    fontWeight: "normal",
                                  }}
                                >
                                  {language === "English" ? "Obt.M" : "गुण"}
                                </th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {selectedStudentResults &&
                          selectedStudentResults.results ? (
                            subjectSequence
                              .filter((subject) => {
                                const grades =
                                  selectedStudentResults.results[subject];
                                // Only include subjects where at least one of the grade fields has a valid value (not null or undefined)
                                return (
                                  grades &&
                                  (grades["Unit Test I"]?.obtainMarks ||
                                    grades["Unit Test II"]?.obtainMarks ||
                                    grades["Semester First "]?.obtainMarks ||
                                    grades["Semester Second "]?.obtainMarks ||
                                    grades["Unit Test I"]?.grade ||
                                    grades["Unit Test II"]?.grade ||
                                    grades["Semester First "]?.grade ||
                                    grades["Semester Second "]?.grade)
                                );
                              })
                              .map((subject) => {
                                const grades =
                                  selectedStudentResults.results[subject];
                                // Calculate row-wise totals and percentage
                                let totalOutOf = 0;
                                let totalObtainMarks = 0;
                                let rowPercentage = "-";
                                let grade = "-";

                                if (selectedExamName === "All Exams") {
                                  totalOutOf =
                                    (grades["Unit Test I"]?.outOf || 0) +
                                    (grades["Unit Test II"]?.outOf || 0) +
                                    (grades["Semester First "]?.outOf || 0) +
                                    (grades["Semester Second "]?.outOf || 0);
                                  totalObtainMarks =
                                    (grades["Unit Test I"]?.obtainMarks || 0) +
                                    (grades["Unit Test II"]?.obtainMarks || 0) +
                                    (grades["Semester First "]?.obtainMarks ||
                                      0) +
                                    (grades["Semester Second "]?.obtainMarks ||
                                      0);
                                  rowPercentage =
                                    totalOutOf > 0
                                      ? (
                                          (totalObtainMarks / totalOutOf) *
                                          100
                                        ).toFixed(2)
                                      : "-";
                                  grade =
                                    rowPercentage !== "-"
                                      ? calculateGrade(Number(rowPercentage))
                                      : "-";
                                } else {
                                  totalOutOf = grades.outOf || 0;
                                  totalObtainMarks = grades.obtainMarks || 0;
                                  rowPercentage =
                                    totalOutOf > 0
                                      ? (
                                          (totalObtainMarks / totalOutOf) *
                                          100
                                        ).toFixed(2)
                                      : "-";
                                  grade =
                                    rowPercentage !== "-"
                                      ? calculateGrade(Number(rowPercentage))
                                      : "-";
                                }

                                return (
                                  <tr key={subject} style={{ padding: "2px" }}>
                                    <td
                                      style={{ padding: "2px", color: "black" }}
                                    >
                                      {subject}
                                    </td>

                                    {selectedExamName === "All Exams" ? (
                                      <>
                                        <td
                                          style={{
                                            padding: "2px",
                                            color: "black",
                                          }}
                                        >
                                          {grades["Unit Test I"]?.outOf || "-"}
                                        </td>
                                        <td
                                          style={{
                                            padding: "2px",
                                            color: "black",
                                          }}
                                        >
                                          {grades["Unit Test I"]?.grade
                                            ? grades["Unit Test I"]?.grade
                                            : grades["Unit Test I"]
                                                ?.obtainMarks || "-"}
                                        </td>
                                        <td
                                          style={{
                                            padding: "2px",
                                            color: "black",
                                          }}
                                        >
                                          {grades["Unit Test II"]?.outOf || "-"}
                                        </td>
                                        <td
                                          style={{
                                            padding: "2px",
                                            color: "black",
                                          }}
                                        >
                                          {grades["Unit Test II"]?.grade
                                            ? grades["Unit Test II"]?.grade
                                            : grades["Unit Test II"]
                                                ?.obtainMarks || "-"}
                                        </td>
                                        <td
                                          style={{
                                            padding: "2px",
                                            color: "black",
                                          }}
                                        >
                                          {grades["Semester First "]?.outOf ||
                                            "-"}
                                        </td>
                                        <td
                                          style={{
                                            padding: "2px",
                                            color: "black",
                                          }}
                                        >
                                          {grades["Semester First "]?.grade
                                            ? grades["Semester First "]?.grade
                                            : grades["Semester First "]
                                                ?.obtainMarks || "-"}
                                        </td>
                                        <td
                                          style={{
                                            padding: "2px",
                                            color: "black",
                                          }}
                                        >
                                          {grades["Semester Second "]?.outOf ||
                                            "-"}
                                        </td>
                                        <td
                                          style={{
                                            padding: "2px",
                                            color: "black",
                                          }}
                                        >
                                          {grades["Semester Second "]?.grade
                                            ? grades["Semester Second "]?.grade
                                            : grades["Semester Second "]
                                                ?.obtainMarks || "-"}
                                        </td>
                                      </>
                                    ) : (
                                      <>
                                        <td
                                          style={{
                                            padding: "2px",
                                            color: "black",
                                          }}
                                        >
                                          {grades.outOf || "-"}
                                        </td>
                                        <td
                                          style={{
                                            padding: "2px",
                                            color: "black",
                                          }}
                                        >
                                          {grades.obtainMarks || "-"}
                                        </td>
                                      </>
                                    )}
                                    <td colSpan="2" style={{ padding: "2px" }}>
                                      <b>{grade}</b>
                                    </td>
                                  </tr>
                                );
                              })
                          ) : (
                            <tr>
                              <td colSpan="6" style={{ padding: "5px" }}>
                                {language === "English"
                                  ? "No data available"
                                  : "डेटा उपलब्ध नाही"}
                              </td>
                            </tr>
                          )}
                        </tbody>

                        <tfoot>
                          <tr>
                            <td colSpan="1" style={{ padding: "5px" }}>
                              <b>
                                {language === "English"
                                  ? "Total Marks"
                                  : "एकूण गुण"}
                              </b>
                            </td>

                            {/* Total M.M and Obt.M for each exam */}
                            {[
                              "Unit Test I",
                              "Unit Test II",
                              "Semester First ",
                              "Semester Second ",
                            ].map((exam, index) => (
                              <>
                                {/* Total M.M (Maximum Marks) */}
                                <td colSpan="1" style={{ padding: "5px" }}>
                                  <b>
                                    {subjectSequence.reduce(
                                      (total, subject) => {
                                        const grades =
                                          selectedStudentResults.results[
                                            subject
                                          ];
                                        return (
                                          total + (grades?.[exam]?.outOf || 0)
                                        );
                                      },
                                      0,
                                    )}
                                  </b>
                                </td>

                                {/* Total Obt.M (Obtained Marks) */}
                                <td colSpan="1" style={{ padding: "5px" }}>
                                  <b>
                                    {subjectSequence.reduce(
                                      (total, subject) => {
                                        const grades =
                                          selectedStudentResults.results[
                                            subject
                                          ];
                                        return (
                                          total +
                                          (grades?.[exam]?.obtainMarks || 0)
                                        );
                                      },
                                      0,
                                    )}
                                  </b>
                                </td>
                              </>
                            ))}

                            {/* Grand Total M.M */}
                            <td style={{ padding: "5px" }}>
                              <b>
                                {subjectSequence.reduce((total, subject) => {
                                  const grades =
                                    selectedStudentResults.results[subject];
                                  return (
                                    total +
                                    (grades?.["Unit Test I"]?.outOf || 0) +
                                    (grades?.["Unit Test II"]?.outOf || 0) +
                                    (grades?.["Semester First "]?.outOf || 0) +
                                    (grades?.["Semester Second "]?.outOf || 0)
                                  );
                                }, 0)}
                              </b>
                            </td>

                            {/* Grand Total Obt.M */}
                            <td style={{ padding: "5px" }}>
                              <b>
                                {subjectSequence.reduce((total, subject) => {
                                  const grades =
                                    selectedStudentResults.results[subject];
                                  return (
                                    total +
                                    (grades?.["Unit Test I"]?.obtainMarks ||
                                      0) +
                                    (grades?.["Unit Test II"]?.obtainMarks ||
                                      0) +
                                    (grades?.["Semester First "]?.obtainMarks ||
                                      0) +
                                    (grades?.["Semester Second "]
                                      ?.obtainMarks || 0)
                                  );
                                }, 0)}
                              </b>
                            </td>
                          </tr>
                          <tr>
                            <td colSpan="1" style={{ padding: "5px" }}>
                              <b>
                                {language === "English"
                                  ? "Percentage"
                                  : "टक्केवारी"}
                              </b>
                            </td>
                            {selectedExamName === "All Exams" ? (
                              <>
                                <td colSpan="2" style={{ padding: "5px" }}>
                                  <b>
                                    {(() => {
                                      const totalMaxMarks = subjectSequence
                                        .filter((subject) => {
                                          const grades =
                                            selectedStudentResults.results[
                                              subject
                                            ];
                                          return (
                                            grades &&
                                            (grades["Unit Test I"]
                                              ?.obtainMarks ||
                                              grades["Unit Test II"]
                                                ?.obtainMarks ||
                                              grades["Semester First "]
                                                ?.obtainMarks ||
                                              grades["Semester Second "]
                                                ?.obtainMarks)
                                          );
                                        })
                                        .reduce((total, subject) => {
                                          const grades =
                                            selectedStudentResults.results[
                                              subject
                                            ];
                                          return (
                                            total +
                                            (grades["Unit Test I"]?.outOf || 0)
                                          );
                                        }, 0);
                                      const totalObtainedMarks = subjectSequence
                                        .filter((subject) => {
                                          const grades =
                                            selectedStudentResults.results[
                                              subject
                                            ];
                                          return (
                                            grades &&
                                            (grades["Unit Test I"]
                                              ?.obtainMarks ||
                                              grades["Unit Test II"]
                                                ?.obtainMarks ||
                                              grades["Semester First "]
                                                ?.obtainMarks ||
                                              grades["Semester Second "]
                                                ?.obtainMarks)
                                          );
                                        })
                                        .reduce((total, subject) => {
                                          const grades =
                                            selectedStudentResults.results[
                                              subject
                                            ];
                                          return (
                                            total +
                                            (grades["Unit Test I"]
                                              ?.obtainMarks || 0)
                                          );
                                        }, 0);
                                      return totalMaxMarks > 0
                                        ? (
                                            (totalObtainedMarks /
                                              totalMaxMarks) *
                                            100
                                          ).toFixed(2) + "%"
                                        : "0%";
                                    })()}
                                  </b>
                                </td>
                                <td colSpan="2" style={{ padding: "5px" }}>
                                  <b>
                                    {(() => {
                                      const totalMaxMarks = subjectSequence
                                        .filter((subject) => {
                                          const grades =
                                            selectedStudentResults.results[
                                              subject
                                            ];
                                          return (
                                            grades &&
                                            (grades["Unit Test I"]
                                              ?.obtainMarks ||
                                              grades["Unit Test II"]
                                                ?.obtainMarks ||
                                              grades["Semester First "]
                                                ?.obtainMarks ||
                                              grades["Semester Second "]
                                                ?.obtainMarks)
                                          );
                                        })
                                        .reduce((total, subject) => {
                                          const grades =
                                            selectedStudentResults.results[
                                              subject
                                            ];
                                          return (
                                            total +
                                            (grades["Unit Test II"]?.outOf || 0)
                                          );
                                        }, 0);
                                      const totalObtainedMarks = subjectSequence
                                        .filter((subject) => {
                                          const grades =
                                            selectedStudentResults.results[
                                              subject
                                            ];
                                          return (
                                            grades &&
                                            (grades["Unit Test I"]
                                              ?.obtainMarks ||
                                              grades["Unit Test II"]
                                                ?.obtainMarks ||
                                              grades["Semester First "]
                                                ?.obtainMarks ||
                                              grades["Semester Second "]
                                                ?.obtainMarks)
                                          );
                                        })
                                        .reduce((total, subject) => {
                                          const grades =
                                            selectedStudentResults.results[
                                              subject
                                            ];
                                          return (
                                            total +
                                            (grades["Unit Test II"]
                                              ?.obtainMarks || 0)
                                          );
                                        }, 0);
                                      return totalMaxMarks > 0
                                        ? (
                                            (totalObtainedMarks /
                                              totalMaxMarks) *
                                            100
                                          ).toFixed(2) + "%"
                                        : "0%";
                                    })()}
                                  </b>
                                </td>
                                <td colSpan="2" style={{ padding: "5px" }}>
                                  <b>
                                    {(() => {
                                      const totalMaxMarks = subjectSequence
                                        .filter((subject) => {
                                          const grades =
                                            selectedStudentResults.results[
                                              subject
                                            ];
                                          return (
                                            grades &&
                                            (grades["Unit Test I"]
                                              ?.obtainMarks ||
                                              grades["Unit Test II"]
                                                ?.obtainMarks ||
                                              grades["Semester First "]
                                                ?.obtainMarks ||
                                              grades["Semester Second "]
                                                ?.obtainMarks)
                                          );
                                        })
                                        .reduce((total, subject) => {
                                          const grades =
                                            selectedStudentResults.results[
                                              subject
                                            ];
                                          return (
                                            total +
                                            (grades["Semester First "]?.outOf ||
                                              0)
                                          );
                                        }, 0);
                                      const totalObtainedMarks = subjectSequence
                                        .filter((subject) => {
                                          const grades =
                                            selectedStudentResults.results[
                                              subject
                                            ];
                                          return (
                                            grades &&
                                            (grades["Unit Test I"]
                                              ?.obtainMarks ||
                                              grades["Unit Test II"]
                                                ?.obtainMarks ||
                                              grades["Semester First "]
                                                ?.obtainMarks ||
                                              grades["Semester Second "]
                                                ?.obtainMarks)
                                          );
                                        })
                                        .reduce((total, subject) => {
                                          const grades =
                                            selectedStudentResults.results[
                                              subject
                                            ];
                                          return (
                                            total +
                                            (grades["Semester First "]
                                              ?.obtainMarks || 0)
                                          );
                                        }, 0);
                                      return totalMaxMarks > 0
                                        ? (
                                            (totalObtainedMarks /
                                              totalMaxMarks) *
                                            100
                                          ).toFixed(2) + "%"
                                        : "0%";
                                    })()}
                                  </b>
                                </td>
                                <td colSpan="2" style={{ padding: "5px" }}>
                                  <b>
                                    {(() => {
                                      const totalMaxMarks = subjectSequence
                                        .filter((subject) => {
                                          const grades =
                                            selectedStudentResults.results[
                                              subject
                                            ];
                                          return (
                                            grades &&
                                            (grades["Unit Test I"]
                                              ?.obtainMarks ||
                                              grades["Unit Test II"]
                                                ?.obtainMarks ||
                                              grades["Semester First "]
                                                ?.obtainMarks ||
                                              grades["Semester Second "]
                                                ?.obtainMarks)
                                          );
                                        })
                                        .reduce((total, subject) => {
                                          const grades =
                                            selectedStudentResults.results[
                                              subject
                                            ];
                                          return (
                                            total +
                                            (grades["Semester Second "]
                                              ?.outOf || 0)
                                          );
                                        }, 0);
                                      const totalObtainedMarks = subjectSequence
                                        .filter((subject) => {
                                          const grades =
                                            selectedStudentResults.results[
                                              subject
                                            ];
                                          return (
                                            grades &&
                                            (grades["Unit Test I"]
                                              ?.obtainMarks ||
                                              grades["Unit Test II"]
                                                ?.obtainMarks ||
                                              grades["Semester First "]
                                                ?.obtainMarks ||
                                              grades["Semester Second "]
                                                ?.obtainMarks)
                                          );
                                        })
                                        .reduce((total, subject) => {
                                          const grades =
                                            selectedStudentResults.results[
                                              subject
                                            ];
                                          return (
                                            total +
                                            (grades["Semester Second "]
                                              ?.obtainMarks || 0)
                                          );
                                        }, 0);
                                      return totalMaxMarks > 0
                                        ? (
                                            (totalObtainedMarks /
                                              totalMaxMarks) *
                                            100
                                          ).toFixed(2) + "%"
                                        : "0%";
                                    })()}
                                  </b>
                                </td>
                              </>
                            ) : (
                              <td colSpan="2" style={{ padding: "5px" }}>
                                <b>
                                  {(() => {
                                    const totalMaxMarks = subjectSequence
                                      .filter((subject) => {
                                        const grades =
                                          selectedStudentResults.results[
                                            subject
                                          ];
                                        return (
                                          grades &&
                                          (grades["Unit Test I"]?.obtainMarks ||
                                            grades["Unit Test II"]
                                              ?.obtainMarks ||
                                            grades["Semester First "]
                                              ?.obtainMarks ||
                                            grades["Semester Second "]
                                              ?.obtainMarks)
                                        );
                                      })
                                      .reduce((total, subject) => {
                                        const grades =
                                          selectedStudentResults.results[
                                            subject
                                          ];
                                        return total + (grades.outOf || 0);
                                      }, 0);
                                    const totalObtainedMarks = subjectSequence
                                      .filter((subject) => {
                                        const grades =
                                          selectedStudentResults.results[
                                            subject
                                          ];
                                        return (
                                          grades &&
                                          (grades["Unit Test I"]?.obtainMarks ||
                                            grades["Unit Test II"]
                                              ?.obtainMarks ||
                                            grades["Semester First "]
                                              ?.obtainMarks ||
                                            grades["Semester Second "]
                                              ?.obtainMarks)
                                        );
                                      })
                                      .reduce((total, subject) => {
                                        const grades =
                                          selectedStudentResults.results[
                                            subject
                                          ];
                                        return (
                                          total + (grades.obtainMarks || 0)
                                        );
                                      }, 0);
                                    return totalMaxMarks > 0
                                      ? (
                                          (totalObtainedMarks / totalMaxMarks) *
                                          100
                                        ).toFixed(2) + "%"
                                      : "0%";
                                  })()}
                                </b>
                              </td>
                            )}
                            <td colSpan="2" style={{ padding: "5px" }}>
                              <b>
                                {(() => {
                                  const totalMaxMarks = subjectSequence
                                    .filter((subject) => {
                                      const grades =
                                        selectedStudentResults.results[subject];
                                      return (
                                        grades &&
                                        (grades["Unit Test I"]?.obtainMarks ||
                                          grades["Unit Test II"]?.obtainMarks ||
                                          grades["Semester First "]
                                            ?.obtainMarks ||
                                          grades["Semester Second "]
                                            ?.obtainMarks)
                                      );
                                    })
                                    .reduce((total, subject) => {
                                      const grades =
                                        selectedStudentResults.results[subject];
                                      return (
                                        total +
                                        (grades["Unit Test I"]?.outOf || 0) +
                                        (grades["Unit Test II"]?.outOf || 0) +
                                        (grades["Semester First "]?.outOf ||
                                          0) +
                                        (grades["Semester Second "]?.outOf || 0)
                                      );
                                    }, 0);
                                  const totalObtainedMarks = subjectSequence
                                    .filter((subject) => {
                                      const grades =
                                        selectedStudentResults.results[subject];
                                      return (
                                        grades &&
                                        (grades["Unit Test I"]?.obtainMarks ||
                                          grades["Unit Test II"]?.obtainMarks ||
                                          grades["Semester First "]
                                            ?.obtainMarks ||
                                          grades["Semester Second "]
                                            ?.obtainMarks)
                                      );
                                    })
                                    .reduce((total, subject) => {
                                      const grades =
                                        selectedStudentResults.results[subject];
                                      return (
                                        total +
                                        (grades["Unit Test I"]?.obtainMarks ||
                                          0) +
                                        (grades["Unit Test II"]?.obtainMarks ||
                                          0) +
                                        (grades["Semester First "]
                                          ?.obtainMarks || 0) +
                                        (grades["Semester Second "]
                                          ?.obtainMarks || 0)
                                      );
                                    }, 0);
                                  return totalMaxMarks > 0
                                    ? (
                                        (totalObtainedMarks / totalMaxMarks) *
                                        100
                                      ).toFixed(2) + "%"
                                    : "0%";
                                })()}
                              </b>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    ) : (
                      <p style={{ fontSize: "12px" }}>
                        {language === "English"
                          ? "No results available."
                          : "कोणतेही प्रगतीपत्रक उपलब्ध नाहीत."}
                      </p>
                    )}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557

                    <div
                      style={{
                        marginTop: "10px",
                        fontSize: "14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <p>
<<<<<<< HEAD
                        <strong>
  {language === "English" ? "Out Of : " : "एकूण : "}
  {subjectSequence.reduce((total, subject) => {
          const grades = selectedStudentResults.results[subject];
          return (
            total +
            (grades?.["Unit Test I"]?.outOf || 0) +
            (grades?.["Unit Test II"]?.outOf || 0) +
            (grades?.["Semester First "]?.outOf || 0) +
            (grades?.["Semester Second "]?.outOf || 0)
          );
        }, 0)}
</strong>
                        </p>
                        <p>
                          <strong>
                            {language === "English" ? "Obtained Marks : " : "प्राप्त गुण : "}
                           
                             
       

        {subjectSequence.reduce((total, subject) => {
          const grades = selectedStudentResults.results[subject];
          return (
            total +
            (grades?.["Unit Test I"]?.obtainMarks || 0) +
            (grades?.["Unit Test II"]?.obtainMarks || 0) +
            (grades?.["Semester First "]?.obtainMarks || 0) +
            (grades?.["Semester Second "]?.obtainMarks || 0)
          );
        }, 0)}
    
                        
=======
                          <strong>
                            {language === "English" ? "Out Of : " : "एकूण : "}
                            {subjectSequence.reduce((total, subject) => {
                              const grades =
                                selectedStudentResults.results[subject];
                              return (
                                total +
                                (grades?.["Unit Test I"]?.outOf || 0) +
                                (grades?.["Unit Test II"]?.outOf || 0) +
                                (grades?.["Semester First "]?.outOf || 0) +
                                (grades?.["Semester Second "]?.outOf || 0)
                              );
                            }, 0)}
                          </strong>
                        </p>
                        <p>
                          <strong>
                            {language === "English"
                              ? "Obtained Marks : "
                              : "प्राप्त गुण : "}

                            {subjectSequence.reduce((total, subject) => {
                              const grades =
                                selectedStudentResults.results[subject];
                              return (
                                total +
                                (grades?.["Unit Test I"]?.obtainMarks || 0) +
                                (grades?.["Unit Test II"]?.obtainMarks || 0) +
                                (grades?.["Semester First "]?.obtainMarks ||
                                  0) +
                                (grades?.["Semester Second "]?.obtainMarks || 0)
                              );
                            }, 0)}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                          </strong>
                        </p>
                      </div>
                      <div>
                        <p>
<<<<<<< HEAD
                        <b>
  {language === "English" ? "Percentage : " : "टक्केवारी : "}
  <b>
    {(() => {
      const totalMaxMarks = subjectSequence
        .filter((subject) => {
          const grades = selectedStudentResults.results[subject];
          return grades && (
            grades["Unit Test I"]?.obtainMarks ||
            grades["Unit Test II"]?.obtainMarks ||
            grades["Semester First "]?.obtainMarks ||
            grades["Semester Second "]?.obtainMarks
          );
        })
        .reduce((total, subject) => {
          const grades = selectedStudentResults.results[subject];
          return total + (grades["Unit Test I"]?.outOf || 0) + (grades["Unit Test II"]?.outOf || 0) + (grades["Semester First "]?.outOf || 0) + (grades["Semester Second "]?.outOf || 0);
        }, 0);
      const totalObtainedMarks = subjectSequence
        .filter((subject) => {
          const grades = selectedStudentResults.results[subject];
          return grades && (
            grades["Unit Test I"]?.obtainMarks ||
            grades["Unit Test II"]?.obtainMarks ||
            grades["Semester First "]?.obtainMarks ||
            grades["Semester Second "]?.obtainMarks
          );
        })
        .reduce((total, subject) => {
          const grades = selectedStudentResults.results[subject];
          return total + (grades["Unit Test I"]?.obtainMarks || 0) + (grades["Unit Test II"]?.obtainMarks || 0) + (grades["Semester First "]?.obtainMarks || 0) + (grades["Semester Second "]?.obtainMarks || 0);
        }, 0);
      return totalMaxMarks > 0 ? ((totalObtainedMarks / totalMaxMarks) * 100).toFixed(2) + "%" : "0%";
    })()}
  </b>
</b>
=======
                          <b>
                            {language === "English"
                              ? "Percentage : "
                              : "टक्केवारी : "}
                            <b>
                              {(() => {
                                const totalMaxMarks = subjectSequence
                                  .filter((subject) => {
                                    const grades =
                                      selectedStudentResults.results[subject];
                                    return (
                                      grades &&
                                      (grades["Unit Test I"]?.obtainMarks ||
                                        grades["Unit Test II"]?.obtainMarks ||
                                        grades["Semester First "]
                                          ?.obtainMarks ||
                                        grades["Semester Second "]?.obtainMarks)
                                    );
                                  })
                                  .reduce((total, subject) => {
                                    const grades =
                                      selectedStudentResults.results[subject];
                                    return (
                                      total +
                                      (grades["Unit Test I"]?.outOf || 0) +
                                      (grades["Unit Test II"]?.outOf || 0) +
                                      (grades["Semester First "]?.outOf || 0) +
                                      (grades["Semester Second "]?.outOf || 0)
                                    );
                                  }, 0);
                                const totalObtainedMarks = subjectSequence
                                  .filter((subject) => {
                                    const grades =
                                      selectedStudentResults.results[subject];
                                    return (
                                      grades &&
                                      (grades["Unit Test I"]?.obtainMarks ||
                                        grades["Unit Test II"]?.obtainMarks ||
                                        grades["Semester First "]
                                          ?.obtainMarks ||
                                        grades["Semester Second "]?.obtainMarks)
                                    );
                                  })
                                  .reduce((total, subject) => {
                                    const grades =
                                      selectedStudentResults.results[subject];
                                    return (
                                      total +
                                      (grades["Unit Test I"]?.obtainMarks ||
                                        0) +
                                      (grades["Unit Test II"]?.obtainMarks ||
                                        0) +
                                      (grades["Semester First "]?.obtainMarks ||
                                        0) +
                                      (grades["Semester Second "]
                                        ?.obtainMarks || 0)
                                    );
                                  }, 0);
                                return totalMaxMarks > 0
                                  ? (
                                      (totalObtainedMarks / totalMaxMarks) *
                                      100
                                    ).toFixed(2) + "%"
                                  : "0%";
                              })()}
                            </b>
                          </b>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                        </p>
                      </div>
                    </div>
                    <div
                      className="grad"
                      style={{
<<<<<<< HEAD
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0 20px',
=======
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0 20px",
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                      }}
                    >
                      {/* Left-aligned label */}
                      <label
<<<<<<< HEAD
                        style={{ flex: 1, textAlign: 'left', marginBottom: '2px', marginLeft: '-10px' }}
                        htmlFor="Parent's signature"
                      >
                        {language === "English" ? "Parent's signature" : "पालकांची सही"}
                      </label>
                      {/* Center-aligned label */}
                      <label
                        style={{ flex: 1, textAlign: 'center', marginBottom: '2px' }}
                        htmlFor="class-teacher"
                      >
                        {language === "English" ? "Class Teacher" : "वर्गशिक्षक"}
                      </label>
                      {/* Right-aligned label */}
                      <label
                        style={{ flex: 1, textAlign: 'right', marginBottom: '2px', marginRight: '20px' }}
=======
                        style={{
                          flex: 1,
                          textAlign: "left",
                          marginBottom: "2px",
                          marginLeft: "-10px",
                        }}
                        htmlFor="Parent's signature"
                      >
                        {language === "English"
                          ? "Parent's signature"
                          : "पालकांची सही"}
                      </label>
                      {/* Center-aligned label */}
                      <label
                        style={{
                          flex: 1,
                          textAlign: "center",
                          marginBottom: "2px",
                        }}
                        htmlFor="class-teacher"
                      >
                        {language === "English"
                          ? "Class Teacher"
                          : "वर्गशिक्षक"}
                      </label>
                      {/* Right-aligned label */}
                      <label
                        style={{
                          flex: 1,
                          textAlign: "right",
                          marginBottom: "2px",
                          marginRight: "20px",
                        }}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                        htmlFor="principal"
                      >
                        {language === "English" ? "Principal" : "प्राचार्य"}
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
<<<<<<< HEAD




























              
              <div>
                {/* Semester First  modal content */}
                <div className="r mt-1" style={{}}>
                  <div className="left" style=
                  {{
                    width: '615px',
                    height: '900px',
                    margin: '0 auto', // Center the div horizontally
                    padding: '20px', // Add some padding
                    border: '2px solid #000', // Optional: Add a border for visibility
                    boxSizing: 'border-box', // Include padding and border in the element's total width and height
                    overflow: 'hidden' // Prevent overflow if content is too large
                  }}>
                    <div className="school-info" >
=======
              <div>
                {/* Semester First  modal content */}
                <div className="r mt-1" style={{}}>
                  <div
                    className="left"
                    style={{
                      width: "615px",
                      height: "900px",
                      margin: "0 auto", // Center the div horizontally
                      padding: "20px", // Add some padding
                      border: "2px solid #000", // Optional: Add a border for visibility
                      boxSizing: "border-box", // Include padding and border in the element's total width and height
                      overflow: "hidden", // Prevent overflow if content is too large
                    }}
                  >
                    <div className="school-info">
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                      {schoolLogo && (
                        <div>
                          <img
                            src={schoolLogo}
                            alt="Logo"
<<<<<<< HEAD
                            style={{ width: '80px', height: 'auto', objectFit: 'contain' }}
=======
                            style={{
                              width: "80px",
                              height: "auto",
                              objectFit: "contain",
                            }}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                          />
                        </div>
                      )}
                      <h2>{schoolName}</h2>
                    </div>
                    <div>
<<<<<<< HEAD
                      <hr style={{
                        width: 'calc(100% + 40px)', // Adjust width to account for padding
                        height: '2px',
                        backgroundColor: 'black',
                        border: 'none',
                        marginLeft: '-20px', // Negative margin to pull it to the left
                        marginRight: '-20px', // Negative margin to pull it to the right
                        marginBottom: '6px', // Adjust this value to reduce the gap below the hr
                      }} />
                      <b>
                        <h6 style={{ textAlign: 'center', margin: '0' }}> {/* Set margin to 0 */}
                          {language === "English" ? "PROGRESS REPORT" : "विद्यार्थी प्रगती अहवाल"}
                        </h6>
                        <h6 style={{ textAlign: 'center', margin: '0' }}> {/* Set margin to 0 */}
                          {language === "English" ? `${selectedExamName || '-'}  EXAMINATION - ${academicYear}` : `प्रथम सत्र परीक्षा-  ${academicYear}`}
                        </h6>
                      </b>
                      <hr style={{
                        width: 'calc(100% + 40px)', height: '2px', backgroundColor: 'black', border: 'none', marginLeft: '-20px', marginRight: '-20px', marginTop: '6px', marginBottom: '6px',
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                      <div style={{ flex: '1', textAlign: 'left' }}>
                        <label htmlFor="roll-no" style={{ fontSize: '14px' }}>{language === "English" ? "Roll No : " : "हजेरी क्रमांक : "}</label>
                        <span>{selectedStudentResults?.rollNo || '-'}</span>
                      </div>
                      <div style={{ flex: '1', textAlign: 'center' }}>
                        <label htmlFor="Register No" style={{ fontSize: '14px' }}>{language === "English" ? "Register No : " : "रजिस्टर क्रमांक : "}</label>
                        <span>{selectedStudentResults?.registerNo || '-'}</span>
                      </div>
                      <div style={{ flex: '1', textAlign: 'right', }}>
                        <label htmlFor="class" style={{ fontSize: '14px' }}>{language === "English" ? "Class : " : "वर्ग : "}</label>
                        <span>{classValue || '-'} {selectedStudentResults?.division || '-'} </span>
                      </div>
                    </div>
                    <hr style={{
                      width: 'calc(100% + 40px)', height: '2px', backgroundColor: 'black', border: 'none', marginLeft: '-20px', marginRight: '-20px', marginTop: '1px'
                    }} />
                    <div style={{ fontSize: '14px', marginLeft: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ width: '70%' }}>
                        <div>
                          <label htmlFor="student-name" style={{ fontSize: '14px' }}>{language === "English" ? "Student Name : " : "विद्यार्थ्याचे नाव : "}</label>
                          <span>{selectedStudentResults?.studentName || '-'} {selectedStudentResults?.stdFather || '-'} {selectedStudentResults?.stdSurname || '-'}</span>
                        </div>
                        <div>
                          <label htmlFor="class" style={{ fontSize: '14px' }}>{language === "English" ? "Mother Name : " : "आईचे वर्ग : "}</label>
                          <span>{selectedStudentResults?.stdMother || '-'} </span>
                        </div>
                        <div>
                          <label htmlFor="class" style={{ fontSize: '14px' }}>{language === "English" ? "Date Of Birth : " : "जन्मतारीख : "}</label>
                          <span>{selectedStudentResults?.dob || '-'} </span>
                        </div>
                        <div>
                          <label htmlFor="exam-roll-no" style={{ fontSize: '14px' }}>{language === "English" ? "Exam : " : "परीक्षा सत्र : "}</label>
                          <span>{selectedExamName || '-'}</span>
                        </div>
                      </div>
                      <div style={{ width: '30%' }}>
                        {selectedStudentResults?.stdPhoto && (
                          <img src={selectedStudentResults?.stdPhoto} style={{ width: '80px', height: '80px' }} />
=======
                      <hr
                        style={{
                          width: "calc(100% + 40px)", // Adjust width to account for padding
                          height: "2px",
                          backgroundColor: "black",
                          border: "none",
                          marginLeft: "-20px", // Negative margin to pull it to the left
                          marginRight: "-20px", // Negative margin to pull it to the right
                          marginBottom: "6px", // Adjust this value to reduce the gap below the hr
                        }}
                      />
                      <b>
                        <h6 style={{ textAlign: "center", margin: "0" }}>
                          {" "}
                          {/* Set margin to 0 */}
                          {language === "English"
                            ? "PROGRESS REPORT"
                            : "विद्यार्थी प्रगती अहवाल"}
                        </h6>
                        <h6 style={{ textAlign: "center", margin: "0" }}>
                          {" "}
                          {/* Set margin to 0 */}
                          {language === "English"
                            ? `${selectedExamName || "-"}  EXAMINATION - ${academicYear}`
                            : `प्रथम सत्र परीक्षा-  ${academicYear}`}
                        </h6>
                      </b>
                      <hr
                        style={{
                          width: "calc(100% + 40px)",
                          height: "2px",
                          backgroundColor: "black",
                          border: "none",
                          marginLeft: "-20px",
                          marginRight: "-20px",
                          marginTop: "6px",
                          marginBottom: "6px",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "14px",
                      }}
                    >
                      <div style={{ flex: "1", textAlign: "left" }}>
                        <label htmlFor="roll-no" style={{ fontSize: "14px" }}>
                          {language === "English"
                            ? "Roll No : "
                            : "हजेरी क्रमांक : "}
                        </label>
                        <span>{selectedStudentResults?.rollNo || "-"}</span>
                      </div>
                      <div style={{ flex: "1", textAlign: "center" }}>
                        <label
                          htmlFor="Register No"
                          style={{ fontSize: "14px" }}
                        >
                          {language === "English"
                            ? "Register No : "
                            : "रजिस्टर क्रमांक : "}
                        </label>
                        <span>{selectedStudentResults?.registerNo || "-"}</span>
                      </div>
                      <div style={{ flex: "1", textAlign: "right" }}>
                        <label htmlFor="class" style={{ fontSize: "14px" }}>
                          {language === "English" ? "Class : " : "वर्ग : "}
                        </label>
                        <span>
                          {classValue || "-"}{" "}
                          {selectedStudentResults?.division || "-"}{" "}
                        </span>
                      </div>
                    </div>
                    <hr
                      style={{
                        width: "calc(100% + 40px)",
                        height: "2px",
                        backgroundColor: "black",
                        border: "none",
                        marginLeft: "-20px",
                        marginRight: "-20px",
                        marginTop: "1px",
                      }}
                    />
                    <div
                      style={{
                        fontSize: "14px",
                        marginLeft: "30px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ width: "70%" }}>
                        <div>
                          <label
                            htmlFor="student-name"
                            style={{ fontSize: "14px" }}
                          >
                            {language === "English"
                              ? "Student Name : "
                              : "विद्यार्थ्याचे नाव : "}
                          </label>
                          <span>
                            {selectedStudentResults?.studentName || "-"}{" "}
                            {selectedStudentResults?.stdFather || "-"}{" "}
                            {selectedStudentResults?.stdSurname || "-"}
                          </span>
                        </div>
                        <div>
                          <label htmlFor="class" style={{ fontSize: "14px" }}>
                            {language === "English"
                              ? "Mother Name : "
                              : "आईचे वर्ग : "}
                          </label>
                          <span>
                            {selectedStudentResults?.stdMother || "-"}{" "}
                          </span>
                        </div>
                        <div>
                          <label htmlFor="class" style={{ fontSize: "14px" }}>
                            {language === "English"
                              ? "Date Of Birth : "
                              : "जन्मतारीख : "}
                          </label>
                          <span>{selectedStudentResults?.dob || "-"} </span>
                        </div>
                        <div>
                          <label
                            htmlFor="exam-roll-no"
                            style={{ fontSize: "14px" }}
                          >
                            {language === "English"
                              ? "Exam : "
                              : "परीक्षा सत्र : "}
                          </label>
                          <span>{selectedExamName || "-"}</span>
                        </div>
                      </div>
                      <div style={{ width: "30%" }}>
                        {selectedStudentResults?.stdPhoto && (
                          <img
                            src={selectedStudentResults?.stdPhoto}
                            style={{ width: "80px", height: "80px" }}
                          />
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                        )}
                      </div>
                    </div>
                    {selectedStudentResults?.results ? (
<<<<<<< HEAD
  <table className="table table-striped table-bordered" style={{ fontSize: '12px', padding: '5px' }}>
    <thead>
      <tr>
        <th rowSpan="1" style={{ padding: '3px', color: 'black' }}>
          {language === "English" ? "Subject" : "विषय"}
        </th>
        <th style={{ padding: '4px', color: 'black' }}>
          {language === "English" ? "Max. Marks" : "पैकी"}
        </th>
        <th style={{ padding: '4px', color: 'black'}}>
          {language === "English" ? "Written Marks" : "लेखी गुण"}
        </th>
        <th style={{ padding: '4px', color: 'black'}}>
          {language === "English" ? "Oral Marks" : "तोंडी गुण"}
        </th>
        <th style={{ padding: '4px', color: 'black'}}>
          {language === "English" ? "Total Obtained" : "एकूण गुण"}
        </th>
        <th rowSpan="1" style={{ padding: '3px', color: 'black' }}>
          {language === "English" ? "P %" : "%"}
        </th>
      </tr>        
    </thead>
    <tbody>
      {selectedStudentResults && selectedStudentResults.results ? (
        subjectSequence
          .filter((subject) => {
            const grades = selectedStudentResults.results[subject];
            return grades && (
              grades.unitTestIObtainMarks ||
              grades.unitTestIIObtainMarks ||
              grades.obtainMarks ||
              grades.grade
            );
          })
          .map((subject) => {
            const grades = selectedStudentResults.results[subject];
            console.log("selectedStudentResults",selectedStudentResults)
            const totalOutOf = (grades.outOf || 0);
            const totalObtainMarks = (grades.obtainMarks || 0);
            const writtenMarks = (grades.writtenMarks || 0);
            const oralMarks = (grades.oralMarks || 0);
            const rowPercentage = totalOutOf > 0 ? ((totalObtainMarks / totalOutOf) * 100).toFixed(2) : "-";

            return (
              <tr key={subject} style={{ padding: "2px" }}>
                <td style={{ padding: "2px", color: 'black' }}>{subject}</td>
                <td style={{ padding: "2px", color: 'black' }}>{grades.subtype === "Grade" ? "-" : (grades.outOf || "-")}</td>
                <td style={{ padding: "2px", color: 'black' }}>{grades.subtype === "Grade" ? "-" : (grades.writtenMarks || "-")}</td>
                <td style={{ padding: "2px", color: 'black' }}>{grades.subtype === "Grade" ? "-" : (grades.oralMarks || "-")}</td>
                <td style={{ padding: "2px", color: 'black' }}>
                  <b>{grades.subtype === "Grade" ? grades.grade : (grades.obtainMarks || "-")}</b>
                </td>
                <td style={{ padding: "2px" }}>
                  <b>{grades.subtype === "Grade" ? "-" : rowPercentage}</b>
                </td>
              </tr>
            );
          })
      ) : (
        <tr>
          <td colSpan="6" style={{ padding: "5px" }}>
            {language === "English" ? "No data available" : "डेटा उपलब्ध नाही"}
          </td>
        </tr>
      )}

      {selectedStudentResults && selectedStudentResults.results && (
        <tr>
          <td colSpan="1" style={{ padding: "5px" }}>
            <b>{language === "English" ? "Total Marks" : "एकूण गुण"}</b>
          </td>
          <td colSpan="1" style={{ padding: "5px" }}>
            <b>
              {subjectSequence
                .filter(subject => {
                  const grades = selectedStudentResults.results[subject] || {};
                  return grades.obtainMarks && grades.subtype !== "Grade";
                })
                .reduce((total, subject) => {
                  const grades = selectedStudentResults.results[subject] || {};
                  return total + (grades.outOf || 0);
                }, 0)}
            </b>
          </td>
          <td colSpan="1" style={{ padding: "5px" }}>
            <b>
              {subjectSequence
                .filter(subject => {
                  const grades = selectedStudentResults.results[subject] || {};
                  return grades.writtenMarks && grades.subtype !== "Grade";
                })
                .reduce((total, subject) => {
                  const grades = selectedStudentResults.results[subject] || {};
                  return total + (grades.writtenMarks || 0);
                }, 0)}
            </b>
          </td>
          <td colSpan="1" style={{ padding: "5px" }}>
            <b>
              {subjectSequence
                .filter(subject => {
                  const grades = selectedStudentResults.results[subject] || {};
                  return grades.oralMarks && grades.subtype !== "Grade";
                })
                .reduce((total, subject) => {
                  const grades = selectedStudentResults.results[subject] || {};
                  return total + (grades.oralMarks || 0);
                }, 0)}
            </b>
          </td>
          <td colSpan="1" style={{ padding: "5px" }}>
            <b>
              {subjectSequence
                .filter(subject => {
                  const grades = selectedStudentResults.results[subject] || {};
                  return grades.obtainMarks && grades.subtype !== "Grade";
                })
                .reduce((total, subject) => {
                  const grades = selectedStudentResults.results[subject] || {};
                  return total + (grades.obtainMarks || 0);
                }, 0)}
            </b>
          </td>
          <td style={{ padding: "5px" }}>
            <b>
              {(() => {
                const filteredSubjects = subjectSequence.filter(subject => {
                  const grades = selectedStudentResults.results[subject] || {};
                  return grades.obtainMarks && grades.subtype !== "Grade";
                });
                const totalMaxMarks = filteredSubjects.reduce((total, subject) => {
                  const grades = selectedStudentResults.results[subject] || {};
                  return total + (grades.outOf || 0);
                }, 0);
                const totalObtainedMarks = filteredSubjects.reduce((total, subject) => {
                  const grades = selectedStudentResults.results[subject] || {};
                  return total + (grades.obtainMarks || 0);
                }, 0);
                return totalMaxMarks > 0 ? ((totalObtainedMarks / totalMaxMarks) * 100).toFixed(2) + '%' : '0%';
              })()}
            </b>
          </td>
        </tr>
      )}
    </tbody>
  </table>
) : (
  <p style={{ fontSize: '18px', textAlign:'center', marginTop:'20px', color:'red'}}>
    {language === "English" ? "! No result available please fill marks." : "कोणतेही प्रगतीपत्रक उपलब्ध नाहीत."}
  </p>
)}
=======
                      <table
                        className="table table-striped table-bordered"
                        style={{ fontSize: "12px", padding: "5px" }}
                      >
                        <thead>
                          <tr>
                            <th
                              rowSpan="1"
                              style={{ padding: "3px", color: "black" }}
                            >
                              {language === "English" ? "Subject" : "विषय"}
                            </th>
                            <th style={{ padding: "4px", color: "black" }}>
                              {language === "English" ? "Max. Marks" : "पैकी"}
                            </th>
                            <th style={{ padding: "4px", color: "black" }}>
                              {language === "English"
                                ? "Written Marks"
                                : "लेखी गुण"}
                            </th>
                            <th style={{ padding: "4px", color: "black" }}>
                              {language === "English"
                                ? "Oral Marks"
                                : "तोंडी गुण"}
                            </th>
                            <th style={{ padding: "4px", color: "black" }}>
                              {language === "English"
                                ? "Total Obtained"
                                : "एकूण गुण"}
                            </th>
                            <th
                              rowSpan="1"
                              style={{ padding: "3px", color: "black" }}
                            >
                              {language === "English" ? "P %" : "%"}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedStudentResults &&
                          selectedStudentResults.results ? (
                            subjectSequence
                              .filter((subject) => {
                                const grades =
                                  selectedStudentResults.results[subject];
                                return (
                                  grades &&
                                  (grades.unitTestIObtainMarks ||
                                    grades.unitTestIIObtainMarks ||
                                    grades.obtainMarks ||
                                    grades.grade)
                                );
                              })
                              .map((subject) => {
                                const grades =
                                  selectedStudentResults.results[subject];
                                console.log(
                                  "selectedStudentResults",
                                  selectedStudentResults,
                                );
                                const totalOutOf = grades.outOf || 0;
                                const totalObtainMarks =
                                  grades.obtainMarks || 0;
                                const writtenMarks = grades.writtenMarks || 0;
                                const oralMarks = grades.oralMarks || 0;
                                const rowPercentage =
                                  totalOutOf > 0
                                    ? (
                                        (totalObtainMarks / totalOutOf) *
                                        100
                                      ).toFixed(2)
                                    : "-";

                                return (
                                  <tr key={subject} style={{ padding: "2px" }}>
                                    <td
                                      style={{ padding: "2px", color: "black" }}
                                    >
                                      {subject}
                                    </td>
                                    <td
                                      style={{ padding: "2px", color: "black" }}
                                    >
                                      {grades.subtype === "Grade"
                                        ? "-"
                                        : grades.outOf || "-"}
                                    </td>
                                    <td
                                      style={{ padding: "2px", color: "black" }}
                                    >
                                      {grades.subtype === "Grade"
                                        ? "-"
                                        : grades.writtenMarks || "-"}
                                    </td>
                                    <td
                                      style={{ padding: "2px", color: "black" }}
                                    >
                                      {grades.subtype === "Grade"
                                        ? "-"
                                        : grades.oralMarks || "-"}
                                    </td>
                                    <td
                                      style={{ padding: "2px", color: "black" }}
                                    >
                                      <b>
                                        {grades.subtype === "Grade"
                                          ? grades.grade
                                          : grades.obtainMarks || "-"}
                                      </b>
                                    </td>
                                    <td style={{ padding: "2px" }}>
                                      <b>
                                        {grades.subtype === "Grade"
                                          ? "-"
                                          : rowPercentage}
                                      </b>
                                    </td>
                                  </tr>
                                );
                              })
                          ) : (
                            <tr>
                              <td colSpan="6" style={{ padding: "5px" }}>
                                {language === "English"
                                  ? "No data available"
                                  : "डेटा उपलब्ध नाही"}
                              </td>
                            </tr>
                          )}

                          {selectedStudentResults &&
                            selectedStudentResults.results && (
                              <tr>
                                <td colSpan="1" style={{ padding: "5px" }}>
                                  <b>
                                    {language === "English"
                                      ? "Total Marks"
                                      : "एकूण गुण"}
                                  </b>
                                </td>
                                <td colSpan="1" style={{ padding: "5px" }}>
                                  <b>
                                    {subjectSequence
                                      .filter((subject) => {
                                        const grades =
                                          selectedStudentResults.results[
                                            subject
                                          ] || {};
                                        return (
                                          grades.obtainMarks &&
                                          grades.subtype !== "Grade"
                                        );
                                      })
                                      .reduce((total, subject) => {
                                        const grades =
                                          selectedStudentResults.results[
                                            subject
                                          ] || {};
                                        return total + (grades.outOf || 0);
                                      }, 0)}
                                  </b>
                                </td>
                                <td colSpan="1" style={{ padding: "5px" }}>
                                  <b>
                                    {subjectSequence
                                      .filter((subject) => {
                                        const grades =
                                          selectedStudentResults.results[
                                            subject
                                          ] || {};
                                        return (
                                          grades.writtenMarks &&
                                          grades.subtype !== "Grade"
                                        );
                                      })
                                      .reduce((total, subject) => {
                                        const grades =
                                          selectedStudentResults.results[
                                            subject
                                          ] || {};
                                        return (
                                          total + (grades.writtenMarks || 0)
                                        );
                                      }, 0)}
                                  </b>
                                </td>
                                <td colSpan="1" style={{ padding: "5px" }}>
                                  <b>
                                    {subjectSequence
                                      .filter((subject) => {
                                        const grades =
                                          selectedStudentResults.results[
                                            subject
                                          ] || {};
                                        return (
                                          grades.oralMarks &&
                                          grades.subtype !== "Grade"
                                        );
                                      })
                                      .reduce((total, subject) => {
                                        const grades =
                                          selectedStudentResults.results[
                                            subject
                                          ] || {};
                                        return total + (grades.oralMarks || 0);
                                      }, 0)}
                                  </b>
                                </td>
                                <td colSpan="1" style={{ padding: "5px" }}>
                                  <b>
                                    {subjectSequence
                                      .filter((subject) => {
                                        const grades =
                                          selectedStudentResults.results[
                                            subject
                                          ] || {};
                                        return (
                                          grades.obtainMarks &&
                                          grades.subtype !== "Grade"
                                        );
                                      })
                                      .reduce((total, subject) => {
                                        const grades =
                                          selectedStudentResults.results[
                                            subject
                                          ] || {};
                                        return (
                                          total + (grades.obtainMarks || 0)
                                        );
                                      }, 0)}
                                  </b>
                                </td>
                                <td style={{ padding: "5px" }}>
                                  <b>
                                    {(() => {
                                      const filteredSubjects =
                                        subjectSequence.filter((subject) => {
                                          const grades =
                                            selectedStudentResults.results[
                                              subject
                                            ] || {};
                                          return (
                                            grades.obtainMarks &&
                                            grades.subtype !== "Grade"
                                          );
                                        });
                                      const totalMaxMarks =
                                        filteredSubjects.reduce(
                                          (total, subject) => {
                                            const grades =
                                              selectedStudentResults.results[
                                                subject
                                              ] || {};
                                            return total + (grades.outOf || 0);
                                          },
                                          0,
                                        );
                                      const totalObtainedMarks =
                                        filteredSubjects.reduce(
                                          (total, subject) => {
                                            const grades =
                                              selectedStudentResults.results[
                                                subject
                                              ] || {};
                                            return (
                                              total + (grades.obtainMarks || 0)
                                            );
                                          },
                                          0,
                                        );
                                      return totalMaxMarks > 0
                                        ? (
                                            (totalObtainedMarks /
                                              totalMaxMarks) *
                                            100
                                          ).toFixed(2) + "%"
                                        : "0%";
                                    })()}
                                  </b>
                                </td>
                              </tr>
                            )}
                        </tbody>
                      </table>
                    ) : (
                      <p
                        style={{
                          fontSize: "18px",
                          textAlign: "center",
                          marginTop: "20px",
                          color: "red",
                        }}
                      >
                        {language === "English"
                          ? "! No result available please fill marks."
                          : "कोणतेही प्रगतीपत्रक उपलब्ध नाहीत."}
                      </p>
                    )}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                    <div
                      style={{
                        marginTop: "10px",
                        fontSize: "14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <p>
                          <strong>
                            {language === "English" ? "Out Of : " : "एकूण : "}
                            {subjectSequence
<<<<<<< HEAD
                              .filter(subject => {
                                const grades = selectedStudentResults?.results?.[subject] || {};
                                return grades.obtainMarks;
                              })
                              .reduce((total, subject) => {
                                const grades = selectedStudentResults?.results?.[subject] || {};
=======
                              .filter((subject) => {
                                const grades =
                                  selectedStudentResults?.results?.[subject] ||
                                  {};
                                return grades.obtainMarks;
                              })
                              .reduce((total, subject) => {
                                const grades =
                                  selectedStudentResults?.results?.[subject] ||
                                  {};
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                                return total + (grades.outOf || 0);
                              }, 0)}
                          </strong>
                        </p>
                        <p>
                          <strong>
<<<<<<< HEAD
                            {language === "English" ? "Obtained Marks : " : "प्राप्त गुण : "}
                            {subjectSequence.reduce((total, subject) => {
                              const grades = selectedStudentResults?.results?.[subject] || {};
=======
                            {language === "English"
                              ? "Obtained Marks : "
                              : "प्राप्त गुण : "}
                            {subjectSequence.reduce((total, subject) => {
                              const grades =
                                selectedStudentResults?.results?.[subject] ||
                                {};
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                              return (
                                total +
                                (grades.unitTestIObtainMarks || 0) +
                                (grades.unitTestIIObtainMarks || 0) +
                                (grades.obtainMarks || 0)
                              );
                            }, 0)}
                          </strong>
                        </p>
                      </div>
                      <div>
                        <p>
                          <b>
<<<<<<< HEAD
                            {language === "English" ? "Percentage : " : "टक्केवारी : "}
                            {(() => {
                              const totalMaxMarks = subjectSequence.reduce((total, subject) => {
                                const grades = selectedStudentResults?.results?.[subject] || {};
                                return (
                                  total +
                                  (grades.outOf || 0)
                                );
                              }, 0);
                              const totalObtainedMarks = subjectSequence.reduce((total, subject) => {
                                const grades = selectedStudentResults?.results?.[subject] || {};
                                return (
                                  total +
                                  (grades.obtainMarks || 0)
                                );
                              }, 0);

                              // Calculate percentage
                              return totalMaxMarks > 0
                                ? ((totalObtainedMarks / totalMaxMarks) * 100).toFixed(2) + "%"
=======
                            {language === "English"
                              ? "Percentage : "
                              : "टक्केवारी : "}
                            {(() => {
                              const totalMaxMarks = subjectSequence.reduce(
                                (total, subject) => {
                                  const grades =
                                    selectedStudentResults?.results?.[
                                      subject
                                    ] || {};
                                  return total + (grades.outOf || 0);
                                },
                                0,
                              );
                              const totalObtainedMarks = subjectSequence.reduce(
                                (total, subject) => {
                                  const grades =
                                    selectedStudentResults?.results?.[
                                      subject
                                    ] || {};
                                  return total + (grades.obtainMarks || 0);
                                },
                                0,
                              );

                              // Calculate percentage
                              return totalMaxMarks > 0
                                ? (
                                    (totalObtainedMarks / totalMaxMarks) *
                                    100
                                  ).toFixed(2) + "%"
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                                : "0%";
                            })()}
                          </b>
                        </p>
                      </div>
                    </div>

<<<<<<< HEAD
                    {selectedStudentResults && selectedStudentResults.results ? (
  <div>
    <table className="table table-striped table-bordered" style={{ fontSize: '12px', padding: '5px' }}>
      {/* Your table code here */}
    </table>
    {selectedStudentResults.results.remark && (
      <div style={{ marginTop: "10px" }}>
        <p>
          <strong>
            {language === "English" ? "Remark : " : "टिप्पणी : "} 
            {selectedStudentResults.results.remark}
          </strong>
        </p>
      </div>
    )}
  </div>
) : (
  <p style={{ fontSize: '18px' , textAlign:'center', marginTop:'20px',  color:'red'}}>
    {language === "English" ? "! No result available please fill marks." : "कोणतेही प्रगतीपत्रक उपलब्ध नाहीत."}
  </p>
)}
                    <div
                      className="grad"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0 20px',
=======
                    {selectedStudentResults &&
                    selectedStudentResults.results ? (
                      <div>
                        <table
                          className="table table-striped table-bordered"
                          style={{ fontSize: "12px", padding: "5px" }}
                        >
                          {/* Your table code here */}
                        </table>
                        {selectedStudentResults.results.remark && (
                          <div style={{ marginTop: "10px" }}>
                            <p>
                              <strong>
                                {language === "English"
                                  ? "Remark : "
                                  : "टिप्पणी : "}
                                {selectedStudentResults.results.remark}
                              </strong>
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p
                        style={{
                          fontSize: "18px",
                          textAlign: "center",
                          marginTop: "20px",
                          color: "red",
                        }}
                      >
                        {language === "English"
                          ? "! No result available please fill marks."
                          : "कोणतेही प्रगतीपत्रक उपलब्ध नाहीत."}
                      </p>
                    )}
                    <div
                      className="grad"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0 20px",
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                      }}
                    >
                      {/* Left-aligned label */}
                      <label
<<<<<<< HEAD
                        style={{ flex: 1, textAlign: 'left', marginBottom: '2px', marginLeft: '-10px' }}
                        htmlFor="Parent's signature"
                      >
                        {language === "English" ? "Parent's signature" : "पालकांची सही"}
                      </label>
                      {/* Center-aligned label */}
                      <label
                        style={{ flex: 1, textAlign: 'center', marginBottom: '2px' }}
                        htmlFor="class-teacher"
                      >
                        {language === "English" ? "Class Teacher" : "वर्गशिक्षक"}
=======
                        style={{
                          flex: 1,
                          textAlign: "left",
                          marginBottom: "2px",
                          marginLeft: "-10px",
                        }}
                        htmlFor="Parent's signature"
                      >
                        {language === "English"
                          ? "Parent's signature"
                          : "पालकांची सही"}
                      </label>
                      {/* Center-aligned label */}
                      <label
                        style={{
                          flex: 1,
                          textAlign: "center",
                          marginBottom: "2px",
                        }}
                        htmlFor="class-teacher"
                      >
                        {language === "English"
                          ? "Class Teacher"
                          : "वर्गशिक्षक"}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                      </label>

                      {/* Right-aligned label */}
                      <label
<<<<<<< HEAD
                        style={{ flex: 1, textAlign: 'right', marginBottom: '2px', marginRight: '20px' }}
=======
                        style={{
                          flex: 1,
                          textAlign: "right",
                          marginBottom: "2px",
                          marginRight: "20px",
                        }}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                        htmlFor="principal"
                      >
                        {language === "English" ? "Principal" : "प्राचार्य"}
                      </label>
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
<<<<<<< HEAD
};
=======
}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557

export default ResultHSC;
