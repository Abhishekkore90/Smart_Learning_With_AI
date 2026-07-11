
import React, { useState, useEffect } from "react";
import { Modal, Button } from "react-bootstrap";
import "../result/result.css";
import HscSubAlignment from "../result/HscSubAlignment";
import AlertMessage from "../../AlertMessage";
import { useCallback } from 'react';
import AllMarksPath from "./AllMarksPath";


function MarkEnteryHSC() {
    const [academicYear, setAcademicYear] = useState("");
  const [examNames, setExamNames] = useState([
    "Unit Test I",
    "Unit Test II",
    "Semester First ",
    "Unit Test III",
    "Unit Test IV",
    "Semester Second ",
  ]);

  const examNameTranslations = {
    "Unit Test I" : "घटक चाचणी-1",
    "Unit Test II" : "घटक चाचणी-2",
    "Semester First ": "प्रथम सत्र",

    "Unit Test III" : "घटक चाचणी-3",
    "Unit Test IV" : "घटक चाचणी-4",
    "Semester Second ": "द्वितीय सत्र",
  };

  const [classValue, setClassValue] = useState("");
  const [division, setDivision] = useState("");
  const [divisions, setDivisions] = useState(["A", "B", "C", "D"]);
  const [subject, setSubject] = useState("");
  const [subjects, setSubjects] = useState({});
  const [newSubject, setNewSubject] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [studentData, setStudentData] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [customOption, setCustomOption] = useState('');
  const [selectedValue, setSelectedValue] = useState('');
  const udiseNumber = localStorage.getItem("udiseNumber");
  const [marksData, setMarksData] = useState({});
  const [specialEntries, setSpecialEntries] = useState({});
  const [interestsAndHobbies, setInterestsAndHobbies] = useState({});
  const [necessaryCorrections, setNecessaryCorrections] = useState({});
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'English');
  const [showDefaultSubjects, setShowDefaultSubjects] = useState(false);
  const [minMarks, setMinMarks] = useState(0);
  const [outOfMarks, setOutOfMarks] = useState(0);
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);    
  const [divisionSubjects, setDivisionSubjects] = useState({}); // Store subjects by class and division
  const [showGradeModal, setShowGradeModal] = useState(false);

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
  const [selectedExamName, setSelectedExamName] = useState(examNames[0]);
  const [blink, setBlink] = useState(false);
  const handleAcademicYearChange = (e) => setAcademicYear(e.target.value);
  const handleSubjectChange = (e) => {
    const selectedValue = e.target.value;
    setSubject(selectedValue); 
};

// Handle class change
// const handleClassChange = (e) => {
//     setClassValue(e.target.value); // Update the class value
//     setDivision(""); // Reset division when class changes
// };

// Handle division change
const handleDivisionChange = (e) => {
    setDivision(e.target.value); // Update division state
};

  const handleNewSubjectChange = (e) => setNewSubject(e.target.value);
  const handleExamNameChange = (e) => setSelectedExamName(e.target.value);
  const handleOpenModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);
  const addSubject = () => {
    if (!academicYear || !classValue) {
      setAlertMessage(language === "English" ? "Please select Academic Year and Class first!" : "कृपया प्रथम शैक्षणिक वर्ष आणि वर्ग निवडा!");
      return;
    }
    setShowInput(true);
    setShowDefaultSubjects(true); 
  };



  // IndexedDB constants
  const DB_NAME = 'SchoolManagementDB';
  const STUDENT_STORE = 'studentData';
  const DB_VERSION = 1;

  // Function to open IndexedDB
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
      if (!db) {
        console.error("Error: db object is not initialized");
        reject("Error: db object is not initialized");
      } else {
        resolve(db);
      }
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STUDENT_STORE)) {
        db.createObjectStore(STUDENT_STORE, { keyPath: "id" });
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
        const activeStudents = students.filter(student => 
          student.isActive !== false
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

          // Use the ID as the serial number equivalent
          classesAndDivisions[student.currentClass][division].push(student.id);
        }
      });

      // Extract class, division, and srNo from key
      const updatedStudents = activeStudents.map((student) => {
        const keyParts = student.id.split("-"); // Split by "-"
        const className = keyParts[0]; // First part is class
        const division = keyParts[1]; // Second part is division
        const srNo = keyParts[keyParts.length - 1]; // Last part is srNo
        return { ...student, className, division, srNo };
      });

      setClasses(Object.keys(classesAndDivisions));
      setStudentData(updatedStudents); // Store updated students
    };

    request.onerror = (event) => {
      console.error("Error fetching student data from IndexedDB:", event.target.error);
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
      const request = store.getAll(); // Fetch all students
  
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
        } // Update divisions state
      };
  
      request.onerror = (event) => {
        console.error("Error fetching divisions from IndexedDB:", event.target.error);
      };
    } catch (error) {
      console.error("Error opening IndexedDB:", error);
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
  
    if (selectedClass) {
      await fetchDivisionsForClass(selectedClass);
    }
  };


  // Fetch marks data from IndexedDB when exam name changes
  useEffect(() => {
    if (selectedExamName && classValue && academicYear) {
      const fetchMarks = async () => {
        try {
          const db = await openDB();
          const selectedStudents = studentData.filter(
            (student) => student.currentClass === classValue
          );
          setSelectedStudents(selectedStudents);
          const marksDataPromises = selectedStudents.map(async (student) => {
            const studentMarks = await fetchMarksData(db, student.srNo, academicYear, selectedExamName);
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

      fetchMarks();
    }
  }, [selectedExamName, classValue, academicYear]);



//   const fetchStudentData = async () => {
//     try {
//         const response = await fetch(
//             `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData.json`
//         );
//         if (!response.ok) {
//             throw new Error("Network response was not ok");
//         }
//         const data = await response.json();
//         const filteredData = Object.keys(data)
//             .filter(key => data[key] !== null)
//             .map(key => ({ srNo: key, ...data[key] }));
//         setStudentData(filteredData);
//         const classSet = new Set();
//         const divisionSet = new Set(); 
//         filteredData.forEach((student) => {
//             if (student.currentClass) {
//                 classSet.add(String(student.currentClass));
//             }
//             if (student.division) {
//                 divisionSet.add(student.division);
//             }
//         });
//         setClasses([...classSet]);
//         setDivisions([...divisionSet]);
//     } catch (error) {
//         console.error("Error fetching student data:", error);
//     }
// };


// Reset divisions when class changes
useEffect(() => {
  if (classValue) {
      const divisionsForClass = studentData
          .filter(student => student.currentClass === classValue)
          .map(student => student.division)
          .filter((value, index, self) => value && self.indexOf(value) === index);
      if (divisionsForClass.length === 0) { setDivisions(["A", "B", "C", "D"]); } else { setDivisions(divisionsForClass); }
  } else {
      setDivisions(["A", "B", "C", "D"]);
  }
}, [classValue, studentData]);






const fetchSubjectsForClassAndDivision = async (classValue, division) => {
  try {
      if (!classValue || !division || !academicYear) {
          console.error("Class, division, or academic year not set");
          return;
      }

      const url = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/hsc/${academicYear}/${classValue}/${division}.json`;
      const response = await fetch(url);
      if (!response.ok) {
          throw new Error(`Failed to fetch subjects for class ${classValue} and division ${division}`);
      }
      const subjectsData = await response.json();
      if (subjectsData) {
          const validSubjects = Object.entries(subjectsData)
              .filter(([_, value]) => value !== null && value !== undefined)
              .map(([_, subject]) => subject);

          setDivisionSubjects(prev => ({
              ...prev,
              [classValue]: {
                  ...prev[classValue],
                  [division]: validSubjects,
              },
          }));
      } else {
          setDivisionSubjects(prev => ({
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


useEffect(() => {
  fetchStudentData();
}, []);

  useEffect(() => {
    setSubject(Object.keys(subjects)[0] || "");
  }, [subjects]);


  const submitGrade = async () => {
    setSubject("")
    setShowGradeModal(true);
  };

  


  const updateRemark = useCallback(async (remarkRef, value) => {
    if (!remarkRef) {
      console.error('Remark reference is null or undefined');
      return;
    }
  
    try {
      const response = await fetch(remarkRef, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(value)
      });
      const data = await response.json();
    } catch (error) {
      console.error('Error updating remark:', error);
    }
  }, []);
  
  const handleSpecialEntriesChange = (srNo, value) => {
    setSpecialEntries(prevState => ({
      ...prevState,
      [srNo]: value
    }));
  
    const remarkRef = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${srNo}/result/${academicYear}/${selectedExamName}/remark.json`;
    if (remarkRef) {
      updateRemark(remarkRef, value);
    }
  };

  const fetchRemark = async (srNo) => {
    try {
      const remarkRef = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${srNo}/result/${academicYear}/${selectedExamName}/remark.json`;
      const response = await fetch(remarkRef);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching remark:', error);
    }
  };

  const handleFetchRemark = async (srNo) => {
    const remark = await fetchRemark(srNo);
    setSpecialEntries(prevState => ({
      ...prevState,
      [srNo]: remark
    }));
  };
  useEffect(() => {
    const fetchRemarks = async () => {
      const remarks = {};
      for (const student of selectedStudents) {
        const remark = await fetchRemark(student.srNo);
        remarks[student.srNo] = remark;
      }
      setSpecialEntries(remarks);
    };
    fetchRemarks();
  }, [selectedStudents, academicYear, selectedExamName]);




  const fetchMarksData = async () => {
    try {
      if (!selectedStudents.length || !classValue || !division) return;
  
      const db = await openDB();
      const transaction = db.transaction(STUDENT_STORE, "readonly");
      const store = transaction.objectStore(STUDENT_STORE);
      const marksData = {};
  
      // Use Promise.all to handle async operations correctly
      const markPromises = selectedStudents.map(async (student) => {
        // Dynamically generate the key based on selected class, division, and student's serial number
        const key = `${classValue}-${division}-${student.srNo}`;
        
        return new Promise((resolve) => {
          const request = store.get(key);
          
          request.onsuccess = (event) => {
            const studentData = event.target.result;
            
            if (
              studentData && 
              studentData.result && 
              studentData.result[academicYear] && 
              studentData.result[academicYear][selectedExamName]
            ) {
              const marks = studentData.result[academicYear][selectedExamName];
              marksData[student.srNo] = marks;
            }
            
            resolve();
          };
          
          request.onerror = () => {
            console.warn(`No marks found for student with key: ${key}`);
            resolve();
          };
        });
      });
  
      // Wait for all mark retrieval promises to complete
      await Promise.all(markPromises);
  
      setMarksData(marksData);
  
      // Set minMarks and outOfMarks from the first student's data
      const firstStudentMarks = Object.values(marksData)[0];
      if (firstStudentMarks && firstStudentMarks[subject]) {
        setMinMarks(firstStudentMarks[subject].minMarks || 0);
        setOutOfMarks(firstStudentMarks[subject].outOf || 0);
      }
    } catch (error) {
      console.error("Error fetching marks data:", error);
    }
  };
  



  
  useEffect(() => {
    if (classValue && division && academicYear && selectedExamName && subject) {
      fetchMarksData();
    }
  }, [classValue, division, academicYear, selectedExamName, subject]);


  const submit = async () => {
    setShowForm(true);
    setShowModal(true);
    setSubject("")
    // Filter students based on both classValue and division
    const selectedStudents = studentData.filter(
        (student) => student.currentClass === classValue && student.division === division
    );

    setSelectedStudents(selectedStudents); 

    const marksData = {};

    for (const student of selectedStudents) {
        const studentMarks = await (
            student.srNo,
            academicYear,
            selectedExamName,
            subject
        );
        marksData[student.srNo] = studentMarks;
    }

    setMarksData(marksData);
};



const submitNewSubject = async () => {
  if (newSubject.trim() !== "" && classValue && academicYear) {
    try {
      // Check if the subject already exists
      const subjectSequencePath = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/hsc/${academicYear}/${classValue}/${division}.json`;

      const existingSequenceResponse = await fetch(subjectSequencePath);
      const existingSequence = (await existingSequenceResponse.json()) || {};

      const existingSubjects = Object.values(existingSequence);
      if (existingSubjects.includes(newSubject)) {
        setAlertMessage(`${newSubject} already exists in the subject list!`);
        return; // Exit if subject already exists
      }

      // Update the local subjects state
      setDivisionSubjects((prev) => ({
        ...prev,
        [classValue]: {
          ...prev[classValue],
          [division]: [...(prev[classValue]?.[division] || []), newSubject],
        },
      }));

      // Construct updates for all exams for each student
      const updates = {};
      for (const student of studentData) {
        if (student.currentClass === classValue && student.division === division) {
          for (const examName of examNames) {
            updates[
              `/schoolRegister/${udiseNumber}/studentData/${student.srNo}/result/${academicYear}/${examName}/${newSubject}`
            ] = true;
          }
        }
      }

      // Send a single PATCH request for all updates
      await fetch(`${process.env.REACT_APP_FIREBASE_DATABASE_URL}/.json`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      // Update the subjectSequence
      const existingSubjectsArray = Object.entries(existingSequence)
        .filter(([_, value]) => value !== null && value !== undefined)
        .sort(([a], [b]) => parseInt(a) - parseInt(b));
      const nextIndex =
        existingSubjectsArray.length > 0
          ? parseInt(existingSubjectsArray[existingSubjectsArray.length - 1][0]) + 1
          : 1;
      const updateObject = { [nextIndex.toString()]: newSubject };

      await fetch(subjectSequencePath, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateObject),
      });

      setNewSubject("");
      setAlertMessage(`${newSubject} has been added successfully!`);
    } catch (error) {
      console.error(`Error submitting new subject:`, error);
    }
  }
};
const deleteSubject = async (subjectToDelete) => {
  try {
    const updatedSubjects = { ...subjects };
    delete updatedSubjects[subjectToDelete];
    setSubjects(updatedSubjects);

    // Batch delete subject from Firebase for all students and exams
    const updates = {};
    for (const student of studentData) {
      if (student.currentClass === classValue) {
        for (const examName of examNames) {
          updates[
            `/schoolRegister/${udiseNumber}/studentData/${student.srNo}/result/${academicYear}/${examName}/${subjectToDelete}`
          ] = null;
        }
      }
    }

    // Send a single PATCH request for batch deletion
    await fetch(`${process.env.REACT_APP_FIREBASE_DATABASE_URL}/.json`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    // Delete subject from subjectSequence
    const subjectSequencePath = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/hsc/${academicYear}/${classValue}/${division}.json`;

    // Fetch current sequence
    const response = await fetch(subjectSequencePath);
    const currentSequence = await response.json();

    // Find the key of the subject to delete
    const subjectKey = Object.entries(currentSequence).find(
      ([_, value]) => value === subjectToDelete
    )?.[0];

    if (subjectKey) {
      // Create update object with null value for the subject key
      const updateObject = {
        [subjectKey]: null,
      };

      // Update the sequence with null value for the deleted subject
      await fetch(subjectSequencePath, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateObject),
      });
    }

    setAlertMessage(`${subjectToDelete} has been deleted successfully!`);
  } catch (error) {
    console.error(`Error deleting subject ${subjectToDelete}:`, error);
  }
};






const handleMarksChange = (srNo, subject, type, value) => {
  if(subject==="" || subject===undefined || subject===null){
    setAlertMessage("Please Select Subject First")
    return ;
  }
  const newValue = Number(value);

  setMarksData((prevMarksData) => {
    // Create a copy of the previous marks data
    const updatedMarksData = {
      ...prevMarksData,
      [srNo]: {
        ...prevMarksData[srNo], // Keep existing subjects for the student
        [subject]: {
          ...prevMarksData[srNo]?.[subject], // Spread existing subject data
          [type]: newValue, // Update the specific marks type
        },
      },
    };

    return updatedMarksData;
  });

  // Call saveMarks to persist the changes
  saveMark1(srNo, subject, type, value);
};



const saveMark1 = async (srNo, subject, type, value) => {
  if(subject==="" || subject===undefined || subject===null){
    setAlertMessage("Please Select Subject First")
    return ;
  }
  try {
    const db = await openDB();
    const transaction = db.transaction(STUDENT_STORE, "readwrite");
    const store = transaction.objectStore(STUDENT_STORE);

    const updates = {};
    const indexedDBUpdates = [];

    // Prepare IndexedDB update
    const key = `${classValue}-${division}-${srNo}`;
    indexedDBUpdates.push(
      new Promise((resolve, reject) => {
        const getRequest = store.get(key);

        getRequest.onsuccess = (event) => {
          const studentData = event.target.result;

          if (studentData) {
            // Ensure the nested structure exists
            studentData.result = studentData.result || {};
            studentData.result[academicYear] = studentData.result[academicYear] || {};
            studentData.result[academicYear][selectedExamName] = 
              studentData.result[academicYear][selectedExamName] || {};

            // Initialize subject data if it doesn't exist
            studentData.result[academicYear][selectedExamName][subject] = 
              studentData.result[academicYear][selectedExamName][subject] || {
                writtenMarks: 0,
                oralMarks: 0,
                graceMarks: 0,
                obtainMarks: 0,
                minMarks: minMarks, // Store minMarks
                outOf: outOfMarks // Store outOfMarks
              };

            // Update specific subject marks, preserving existing data
            const writtenMarks = studentData.result[academicYear][selectedExamName][subject].writtenMarks;
            const oralMarks = studentData.result[academicYear][selectedExamName][subject].oralMarks;
            const graceMarks = studentData.result[academicYear][selectedExamName][subject].graceMarks;
            const obtainMarks = writtenMarks + oralMarks + (type === 'graceMarks' ? value : graceMarks);

            studentData.result[academicYear][selectedExamName][subject] = {
              ...(studentData.result[academicYear][selectedExamName][subject] || {}),
              [type]: value,
              obtainMarks,
               minMarks: minMarks, // Ensure minMarks is updated
              outOf: outOfMarks
            };

            // Put the updated student data back into IndexedDB
            const updateRequest = store.put(studentData);

            updateRequest.onsuccess = () => {
              console.log(`Successfully updated IndexedDB for ${key}`);
              resolve();
            };
            updateRequest.onerror = (error) => {
              console.error(`Error updating IndexedDB for ${key}:`, error);
              reject(error);
            };
          } else {
            console.warn(`No student data found for key: ${key}`);
            resolve();
          }
        };

        getRequest.onerror = (error) => {
          console.error(`Error getting student data for ${key}:`, error);
          reject(error);
        };
      })
    );

    // Prepare Firebase update
    const firebasePath = 
      `/schoolRegister/${udiseNumber}/studentData/${srNo}/result/${academicYear}/${selectedExamName}/${subject}`;
    const subjectData = {
      minMarks: minMarks,
      outOf: outOfMarks,
      writtenMarks: marksData[srNo]?.[subject]?.writtenMarks || 0,
      oralMarks: marksData[srNo]?.[subject]?.oralMarks || 0,
      graceMarks: marksData[srNo]?.[subject]?.graceMarks || 0,
      obtainMarks: (marksData[srNo]?.[subject]?.writtenMarks || 0) + 
                   (marksData[srNo]?.[subject]?.oralMarks || 0) + 
                   (marksData[srNo]?.[subject]?.graceMarks || 0),
      subtype: "Mark",
    };
    updates[firebasePath] = subjectData;

    // Send Firebase update
    await fetch(`${process.env.REACT_APP_FIREBASE_DATABASE_URL}/.json`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    // Wait for IndexedDB update to complete
    await Promise.all(indexedDBUpdates);

    console.log('Marks saved successfully');
  } catch (error) {
    console.error("Error saving marks:", error);
  }
};

const saveMarks = async () => {
  if(subject==="" || subject===undefined || subject===null){
    setAlertMessage("Please Select Subject First")
    return ;
  }
  try {
    await saveMark1();
    setAlertMessage(
      language === "English"
        ? "Marks saved successfully"
        : "गुण जतन केले"
    );
  } catch (error) {
    console.error("Error saving marks and additional fields:", error);
  }
};


const saveGrades = async () => {
  if(subject==="" || subject===undefined || subject===null){
    setAlertMessage("Please Select Subject First")
    return ;
  }
  try {
    // Open IndexedDB
    const db = await openDB();
    const transaction = db.transaction(STUDENT_STORE, "readwrite");
    const store = transaction.objectStore(STUDENT_STORE);

    const updates = {};
    const indexedDBUpdates = [];

    for (const student of selectedStudents) {
      const marks = marksData[student.srNo] || {};
      const subjectData = {
        grade: marks[subject]?.grade || "",
        subtype: "Grade",
      };

      // Prepare IndexedDB update
      const key = `${classValue}-${division}-${student.srNo}`;
      indexedDBUpdates.push(
        new Promise((resolve, reject) => {
          const getRequest = store.get(key);

          getRequest.onsuccess = (event) => {
            const studentData = event.target.result;

            if (studentData) {
              // Ensure the nested structure exists
              studentData.result = studentData.result || {};
              studentData.result[academicYear] = studentData.result[academicYear] || {};
              studentData.result[academicYear][selectedExamName] = 
                studentData.result[academicYear][selectedExamName] || {};

              // Update specific subject grade, preserving existing data
              studentData.result[academicYear][selectedExamName][subject] = {
                ...(studentData.result[academicYear][selectedExamName][subject] || {}),
                grade: subjectData.grade,
              };

              // Put the updated student data back into IndexedDB
              const updateRequest = store.put(studentData);

              updateRequest.onsuccess = () => {
                console.log(`Successfully updated IndexedDB for ${key}`);
                resolve();
              };
              updateRequest.onerror = (error) => {
                console.error(`Error updating IndexedDB for ${key}:`, error);
                reject(error);
              };
            } else {
              console.warn(`No student data found for key: ${key}`);
              resolve();
            }
          };

          getRequest.onerror = (error) => {
            console.error(`Error getting student data for ${key}:`, error);
            reject(error);
          };
        })
      );

      // Prepare Firebase update
      const firebasePath = 
        `/schoolRegister/${udiseNumber}/studentData/${student.srNo}/result/${academicYear}/${selectedExamName}/${subject}`;
      updates[firebasePath] = subjectData;
    }

    // Send Firebase update
    await fetch(`${process.env.REACT_APP_FIREBASE_DATABASE_URL}/.json`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    // Wait for IndexedDB update to complete
    await Promise.all(indexedDBUpdates);

    setAlertMessage(
      language === "English"
        ? "Grades saved successfully"
        : "श्रेणी यशस्वीरित्या जतन केले"
    );
  } catch (error) {
    console.error("Error saving grades:", error);
  }
};






  const englishSubjects = [
    { name: "Arts", sanklikMarks: 100 },
    { name: "Work Experience", sanklikMarks: 100 },
    { name: "Physical Education", sanklikMarks: 100 },
  ];

  const marathiSubjects = [
    { name: "कला", sanklikMarks: 100 },
    { name: "कार्यानुभव", sanklikMarks: 100 },
    { name: "शा.शिक्षण", sanklikMarks: 100 },
  ];

  const [defaultSubjects, setDefaultSubjects] = useState(englishSubjects);

  useEffect(() => {
    if (language === 'English') {
      setDefaultSubjects(englishSubjects);
    } else {
      setDefaultSubjects(marathiSubjects);
    }
  }, [language]);

  const addDefaultSubject = async (subject) => {
    try {
      // Check if the subject already exists in the subject sequence
      const subjectSequencePath = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/hsc/${academicYear}/${classValue}/${division}.json`;
  
      // Fetch existing subject sequence
      const existingSequenceResponse = await fetch(subjectSequencePath);
      const existingSequence = (await existingSequenceResponse.json()) || {};
  
      const existingSubjects = Object.values(existingSequence);
      if (existingSubjects.includes(subject.name)) {
        setAlertMessage(`${subject.name} already exists in the subject list!`);
        return; // Exit if the subject already exists
      }
  
      // Update local state for division subjects
      setDivisionSubjects((prev) => ({
        ...prev,
        [classValue]: {
          ...prev[classValue],
          [division]: [...(prev[classValue]?.[division] || []), subject.name],
        },
      }));
  
      // Save the subject under all exams for each student in one operation
      await Promise.all(
        studentData.map(async (student) => {
          if (student.currentClass === classValue && student.division === division) {
            // Construct a single object containing the subject for all exams
            const subjectData = examNames.reduce((acc, examName) => {
              acc[examName] = { [subject.name]: true };
              return acc;
            }, {});
  
            // Update Firebase with a single PATCH request
            const url = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${student.srNo}/result/${academicYear}.json`;
            await fetch(url, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(subjectData),
            });
          }
        })
      );
  
      // Update the subject sequence in Firebase
      const existingSubjectsArray = Object.entries(existingSequence)
        .filter(([_, value]) => value !== null && value !== undefined)
        .sort(([a], [b]) => parseInt(a) - parseInt(b));
      const nextIndex =
        existingSubjectsArray.length > 0
          ? parseInt(existingSubjectsArray[existingSubjectsArray.length - 1][0]) + 1
          : 1;
  
      const updateObject = {
        [nextIndex.toString()]: subject.name,
      };
      await fetch(subjectSequencePath, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateObject),
      });
  
      // Track added subjects in state and notify the user
      setAddedSubjects((prev) => [...prev, subject.name]);
      setAlertMessage(`${subject.name} has been added successfully!`);
    } catch (error) {
      console.error(`Error adding default subject:`, error);
    }
  };
  


const [loading, setLoading] = useState(true);
const [addedSubjects, setAddedSubjects] = useState([]);

const fetchAddedSubjects = async () => {
    try {
      setLoading(true);
      const url = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/${academicYear}/${classValue}.json`;
      const response = await fetch(url);
      const subjectsData = await response.json();
      if (subjectsData) {
        const validSubjects = Object.entries(subjectsData)
          .filter(([_, value]) => value !== null && value !== undefined)
          .map(([_, subject]) => subject);
        setAddedSubjects(validSubjects);
      } else {
        setAddedSubjects([]);
      }
    } catch (error) {
      console.error('Error fetching added subjects:', error);
    } finally {
      setLoading(false);
    }
  };                                                    
// Use useEffect to fetch added subjects when component mounts
useEffect(() => {
  if (classValue && academicYear && division && examNames.length > 0) {
      fetchAddedSubjects();
  }
}, [classValue, academicYear, examNames,division]); // Dependenciesg

  const handleDelete = () => {
    if (subject && window.confirm('Are you sure you want to delete this subject? This will delete selected subject data ')) {
      deleteSubject(subject);
    }
  };
  const handleSelectChange = (e) => {
    if (e.target.value === 'custom') {
      // Open the custom input field
    } else {
      setSelectedValue(e.target.value);
    }
  };
  const handleCustomInputChange = (e) => {
    setCustomOption(e.target.value);
  };
  const addCustomOption = () => {
    setSelectedValue(customOption);
  };

  const [showHscSubAlignment, setShowHscSubAlignment] = useState(false);
  const handleSetSequenceClick = () => {
    setShowHscSubAlignment(true);
  };
  const hasSubjects = () => {
    return divisionSubjects[classValue] && divisionSubjects[classValue][division] && divisionSubjects[classValue][division].length > 0;
  };
  // Add this useEffect to filter students when the subject changes
useEffect(() => {
  if (classValue && division) {
    const filteredStudents = studentData.filter(
      (student) => student.currentClass === classValue && student.division === division
    );
    setSelectedStudents(filteredStudents);
  } else {
    setSelectedStudents([]); // Clear selected students if class or division is not set
  }
}, [subject, classValue, division, studentData]); // Add subject to dependencies



  




const handleGradeChange = (srNo, subject, type, value) => {
    setMarksData((prevMarksData) => {
      const updatedMarksData = {
        ...prevMarksData,
        [srNo]: {
          ...prevMarksData[srNo],
          [subject]: {
            ...prevMarksData[srNo]?.[subject],
            grade: value,
          },
        },
      };
      return updatedMarksData;
    });
  };













return (

  <div>
  <AllMarksPath/>
       <AlertMessage message={alertMessage} show={showAlert}/>
 {/* Button to trigger HscSubAlignment */}
 
 {/* Conditionally render HscSubAlignment */}
 {showHscSubAlignment && (
         <HscSubAlignment onClose={() => setShowHscSubAlignment(false)} />
       )}
       <div>
         <div className="main-content-of-page" >
           <h3 style={{color:'rgb(3, 54, 94)', textAlign:'center'}} > {language === "English" ? "HSC Marks Entry" : "गुण नोंदणी"}</h3>
           <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
             <table className="table table-striped table-bordered me-3" style={{ flex: '2' }}>
               <tbody>
                 <tr>
                   <th>{language === "English" ? "Academic Year " : "शैक्षणिक वर्ष"}</th>
                   <td>
   <select
     id="academicYear"
     defaultValue={academicYear} // Add this prop
     value={academicYear}
     onChange={handleAcademicYearChange}
     className="form-control custom-select"
   >
     <option >{language === "English" ? "Select Year " : "वर्ष निवडा"}</option>
     <option value="2023-2024" >2023-2024</option>
     <option value="2024-2025" selected>2024-2025</option>
     <option value="2025-2026">2025-2026</option>
     <option value="2026-2027">2026-2027</option>
   </select>
 </td>
                 </tr>
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
      {["Class XI", "Class XII"].map((cls, index) => (
        <option key={index} value={cls}>
          {cls}
        </option>
      ))}
    </select>
  </td>
</tr>
                 <tr>
     <th>{language === "English" ? "Division" : "तुकडी"}</th>
     <td>
         <select value={division} onChange={handleDivisionChange}  className="form-control custom-select">
             <option value="">{language==="English"? "Select Division" : "तुकडी निवडा"}</option>
             {divisions.map((div) => (
                 <option key={div} value={div}>
                     {div}
                 </option>
             ))}
         </select>
     </td>
 </tr>
 
                 <tr>
                 <th>{language === "English" ? "Subject " : "विषय"}</th>
 <td>
   <div style={{ display: 'flex', alignItems: 'center' }}>
 
   <select value={subject} onChange={handleSubjectChange}  className="form-control custom-select  me-3">
             <option value="">{language==="English"? "Select Subject" : "विषय निवडा"}</option>
             {divisionSubjects[classValue] && divisionSubjects[classValue][division]
                 ? divisionSubjects[classValue][division].map((sub) => (
                       <option key={sub} value={sub}>
                           {sub}
                       </option>
                   ))
                 : null}
         </select>
 
     {subject && (
       <button
         onClick={handleDelete}
         style={{
           marginLeft: '10px',
           backgroundColor: 'transparent',
           border: 'none',
           cursor: 'pointer',
           fontSize: '16px',
         }}
       >
         ❌
       </button>
     )}

     <button
   onClick={addSubject}
   className={`btn btn-primary btn-block me-3 ${academicYear && classValue && !hasSubjects() ? 'blink' : ''}`}
   style={{ backgroundColor: '#60a5fa', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}
 >
   Add Subject
 </button>
   </div>
 </td>
 
                 </tr>
                 <tr>
   <th>{language === "English" ? "Exam Name" : "परीक्षेचे नाव"}</th>
   <td>
     <select
       id="examName"
       value={selectedExamName}
       onChange={handleExamNameChange}
       className="form-control custom-select"
     >
       <option value="">{language === "English" ? "Select Exam" : "परीक्षा निवडा"}</option>
       {examNames.map((examName, index) => (
         <option key={index} value={examName}>
           {language === "English" ? examName : examNameTranslations[examName]}
         </option>
       ))}
     </select>
   </td>
 </tr>
                 <tr>
                   <td colSpan="2">
                   
                   {/* <button
   onClick={academicYear && classValue ? addSubject : null}
   className={`btn btn-primary btn-block me-3 ${academicYear && classValue && division && !hasSubjects() ? 'blink' : ''}`}
   disabled={!academicYear || !classValue || !division}
 >
   Add Subject
 </button> */}
 
 <button 
     onClick={submit} 
     className="btn btn-primary btn-block  me-3" 
     disabled={!academicYear || !classValue || !division} // Disable if academicYear, classValue, or division is not selected
 >
     {language === "English" ? "Enter Marks" : "गुण प्रविष्ट करा"}
 </button>

 <button 
     onClick={submitGrade} 
     className="btn btn-primary btn-block" 
     disabled={!academicYear || !classValue || !division} // Disable if academicYear, classValue, or division is not selected
 >
     {language === "English" ? "Enter Grade" : "श्रेणी प्रविष्ट करा"}
 </button>

                    </td>
                 </tr>
               </tbody>
             </table>
 
         <Modal
           show={showDefaultSubjects}
           onHide={() => setShowDefaultSubjects(false)}
           dialogClassName="modal-50w"
         >
           <Modal.Header closeButton>
             <Modal.Title>{language === "English" ? "Add Subject" : "विषय जोडा"}</Modal.Title>
           </Modal.Header>
          <Modal.Body>
         <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', textAlign: 'left' }}>{language === "English" ? "Subjects" : "विषय"}</h2>
         <table className="table table-bordered" style={{ fontSize: '14px', borderCollapse: 'collapse', textAlign: 'center', verticalAlign: 'middle', width: '100%' }}>
             <thead style={{ backgroundColor: '#b5d3f2' }}>
                 <tr>
                     <th style={{ fontSize: '14px', padding: '10px', fontWeight: 'bold', backgroundColor: '#b5d3f2' }}>{language === "English" ? "Subject Name" : "विषयाचे नाव"}</th>
                     <th style={{ fontSize: '14px', padding: '10px', fontWeight: 'bold', backgroundColor: '#b5d3f2' }}>{language === "English" ? "Action" : "कृती"}</th>
                 </tr>
             </thead>
             <tbody>
                 {defaultSubjects.map((subject) => (
                     <tr key={subject.name}>
                         <td style={{ fontSize: '14px', padding: '10px' }}>{subject.name}</td>
                         <td style={{ fontSize: '14px', padding: '10px' }}>
                             {!addedSubjects.includes(subject.name) ? (
                                 <button 
                                     type="button" 
                                     className="btn btn-primary btn-sm"
                                     onClick={() => addDefaultSubject(subject)}
                                     style={{ fontSize: '14px', padding: '5px 15px', borderRadius: '5px', backgroundColor: '#0d6efd', color: 'white', border: 'none', cursor: 'pointer' }}
                                 >
                                     Add
                                 </button>
                             ) : (
                                 <span style={{ color: 'green', fontSize: '14px', padding: '5px', fontWeight: 'bold' }}>
                                     {language === "English" ? "Added" : "जोडले"}
                                 </span>
                             )}
                         </td>
                     </tr>
                 ))}
 
                 {showInput && (
                  <tr>
    <td colSpan="2" style={{ padding: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <input
                type="text"
                value={newSubject}
                onChange={handleNewSubjectChange}
                className="form-control"
                placeholder={language === "English" ? "Enter new subject" : "नवीन विषय प्रविष्ट करा"}
                style={{ fontSize: '14px', padding: '8px', flex: '1', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <button
                onClick={submitNewSubject}
                className="btn btn-primary"
                style={{ fontSize: '14px', padding: '8px 15px', borderRadius: '5px', backgroundColor: '#0d6efd', color: 'white', border: 'none', cursor: 'pointer' }}
            >
                {language === "English" ? "Submit New Subject" : "नवीन विषय सबमिट करा"}
            </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button 
                onClick={handleSetSequenceClick} 
                className="btn btn-primary" 
                style={{ fontSize: '14px', padding: '8px 15px', borderRadius: '5px', backgroundColor: '#0d6efd', color: 'white', border: 'none', cursor: 'pointer' }}
            >
                {language === "English" ? "Set Subject Sequence" : "विषय क्रम सेट करा"}
            </button>
        </div>
    </td>
</tr>

                 )}
             </tbody>
         </table>
          </Modal.Body>
          <Modal.Footer>
             <Button variant="secondary" onClick={() => setShowDefaultSubjects(false)}>
               {language === "English" ? " Close" : "Close करा"}
             </Button>
          </Modal.Footer>
         </Modal>
 
           </div>
         </div>
 
         {/* Modal for entering marks */}
         <Modal
           show={showModal}
           onHide={handleCloseModal}
           dialogClassName="modal-90w"
         >       
           <Modal.Header closeButton>
           
           <Modal.Title>
           {language === "English" 
   ? `Enter Marks for ${selectedExamName}` 
   : `${selectedExamName} साठी गुण प्रविष्ट करा`}
 
   <div style={{ display: 'flex', alignItems: 'center' }}>
     <td style={{ width: '200px' }}>
     
     <select value={subject} onChange={handleSubjectChange}>
             <option value="">{language==="English"? "Select Subject" : "विषय निवडा"}</option>
             {divisionSubjects[classValue] && divisionSubjects[classValue][division]
                 ? divisionSubjects[classValue][division].map((sub) => (
                       <option key={sub} value={sub}>
                           {sub}
                       </option>
                   ))
                 : null}
         </select>
       
     </td>
     <label style={{ marginLeft: '10px', marginRight: '5px' }}>
       {language === "English" ? "Min Marks:" : "किमान गुण:"}
     </label>
 
     <input
   type="number"
   className="form-control"
   style={{ width: '80px', marginRight: '10px' }} // Adjust width as needed
   placeholder="Min Marks"
   value={minMarks}
   onChange={(e) => {
     const value = Number(e.target.value);
     if (!subject) {
       setAlertMessage(language === "English" ? "Please select a subject before entering marks!" : "कृपया गुण प्रविष्ट करण्यापूर्वी विषय निवडा!");
       setMinMarks(""); // Reset the field
       return;
     }
     if (value < 0) {
       setAlertMessage(language === "English" ? "Marks cannot be less than 0!" : "गुण 0 पेक्षा कमी असू शकत नाहीत!");
       setMinMarks(""); // Reset the field
       return;
     }
     setMinMarks(value); // Update state
   }}
 />
 
     <label style={{ marginLeft: '10px', marginRight: '5px' }}>
       {language === "English" ? "Out Of:" : "एकूण:"}
     </label>
     <input
   type="number"
   className="form-control"
   style={{ width: '80px' }} // Adjust width as needed
   placeholder="Out Of"
   value={outOfMarks}
   onChange={(e) => {
     const value = Number(e.target.value);
     if (!subject) {
       setAlertMessage(language === "English" ? "Please select a subject before entering marks!" : "कृपया गुण प्रविष्ट करण्यापूर्वी विषय निवडा!");
       setOutOfMarks(""); // Reset the field
       return;
     }
     if (value < 0) {
       setAlertMessage(language === "English" ? "Marks cannot be less than 0!" : "गुण 0 पेक्षा कमी असू शकत नाहीत!");
       setOutOfMarks(""); // Reset the field
       return;
     }
     setOutOfMarks(value); // Update state
   }}
 />
   </div>
 </Modal.Title>
 
           </Modal.Header>
           <Modal.Body>
             <table className="table table-striped table-bordered">
               <thead>
                 <tr>
                   <th style={{ padding:'auto 5px' }}>{language === "English" ? "Roll No" : "हजेरी क्र"}</th>
                   <th>{language === "English" ? "Student Name" : "विद्यार्थ्याचे नाव"}</th>
 
                   <th colSpan={"1"} className="text-center">
                     {language === "English" ? "Min Marks" : "किमान गुण"}
                   </th>
                   <th colSpan={"1"} className="text-center">
                     {" "}
                     {language === "English" ? " Out Of" : "पैकी गुण"}
                   </th>



                   <th colSpan={"1"} className="text-center">
                     {" "}
                      {language === "English" ? "Written Marks" : "लेखी गुण"}
                   </th>
                   <th colSpan={"1"} className="text-center">
                     {" "}
                      {language === "English" ? "Oral Marks" : "तोंडी गुण"}
                   </th>
                   <th colSpan={"1"} className="text-center">
                     {" "}
                      {language === "English" ? "Grace Marks" : "ग्रेस गुण"}
                   </th>




                   <th colSpan={"1"} className="text-center">
                     {" "}
                      {language === "English" ? "Obtained Marks" : "मिळालेले गुण"}

                   </th>
                   <th colSpan={"2"} className="text-center">
                    {" "}
                    {language === "English" ? "Student Result Remark for all subject" : "शेरा"}
                  </th>
                 </tr>
     
               </thead>
               <tbody>
  {selectedStudents
    .slice() // Create a shallow copy to avoid mutating the original array
    .sort((a, b) => a.rollNo - b.rollNo) // Sort by rollNo in ascending order
    .map((student) => {
      const studentMarks = marksData[student.srNo]?.[subject] || {}; // Fetch marks for the current student and subject
      return (
        <tr key={student.srNo}>
          <td >{student.rollNo}</td>
          <td>
            {student.stdName} {student.stdFather} {student.stdSurname}
          </td>

          {/* Min Marks */}
          <td>{minMarks || 0}</td>

          {/* Out Of Marks */}
          <td>{outOfMarks || 0}</td>

          <td>
  <input
    type="number"
    value={studentMarks.writtenMarks || ""}
    onChange={(e) => {
      const value = Number(e.target.value);
      const totalMarks = value + (studentMarks.oralMarks || 0) + (studentMarks.graceMarks || 0);

      if (totalMarks > outOfMarks) {
        alert("Total marks cannot exceed Out Of marks!");
      } else {
        handleMarksChange(student.srNo, subject, "writtenMarks", value);
      }
    }}
    disabled={!subject}
    className="form-control"
  />
</td>

<td>
  <input
    type="number"
    value={studentMarks.oralMarks || ""}
    onChange={(e) => {
      const value = Number(e.target.value);
      const totalMarks = value + (studentMarks.writtenMarks || 0) + (studentMarks.graceMarks || 0);

      if (totalMarks > outOfMarks) {
        alert("Total marks cannot exceed Out Of marks!");
      } else {
        handleMarksChange(student.srNo, subject, "oralMarks", value);
      }
    }}
    disabled={!subject}
    className="form-control"
  />
</td>

<td>
  <input
    type="number"
    value={studentMarks.graceMarks || ""}
    onChange={(e) => {
      const value = Number(e.target.value);
      const totalMarks = value + (studentMarks.writtenMarks || 0) + (studentMarks.oralMarks || 0);

      if (totalMarks > outOfMarks) {
        alert("Total marks cannot exceed Out Of marks!");
      } else {
        handleMarksChange(student.srNo, subject, "graceMarks", value);
      }
    }}
    disabled={!subject}
    className="form-control"
  />
</td>


          {/* Obtain Marks */}
          <td>
            {studentMarks.writtenMarks + studentMarks.oralMarks + studentMarks.graceMarks || 0}
          </td>

          <td>
            <input      
              list="special Entries"
              value={specialEntries[student.srNo] || ""}
              onChange={(e) => handleSpecialEntriesChange(student.srNo, e.target.value)}
              placeholder="Type or select an option"
              style={{ padding: '2px', textAlign: 'center' }} // Adjust padding here
            />
          </td>
        </tr>
      );
    })}
</tbody>
 
 
             </table>
           </Modal.Body>
           <Modal.Footer>
             <Button variant="secondary" onClick={handleCloseModal}>
               {language === "English" ? " Close" : "Close करा"}
             </Button>
             <Button variant="primary" onClick={saveMarks}>
               {language === "English" ? " Save" : "Save करा"}
             </Button>
           </Modal.Footer>
         </Modal>





         <Modal
  show={showGradeModal}
  onHide={() => setShowGradeModal(false)}
  dialogClassName="modal-90w"
>
 <Modal.Header closeButton>
           
           <Modal.Title>
           {language === "English" 
   ? `Enter Marks for ${selectedExamName}` 
   : `${selectedExamName} साठी गुण प्रविष्ट करा`}
 
   <div style={{ display: 'flex', alignItems: 'center' }}>
     <td style={{ width: '200px' }}>
     
     <select value={subject} onChange={handleSubjectChange}>
             <option value="">{language==="English"? "Select Subject" : "विषय निवडा"}</option>
             {divisionSubjects[classValue] && divisionSubjects[classValue][division]
                 ? divisionSubjects[classValue][division].map((sub) => (
                       <option key={sub} value={sub}>
                           {sub}
                       </option>
                   ))
                 : null}
         </select>
       
     </td>
   </div>
 </Modal.Title>
 
           </Modal.Header>
           <Modal.Body>
             <table className="table table-striped table-bordered">
               <thead>
                 <tr>
                   <th style={{ padding:'auto 5px' }}>{language === "English" ? "Roll No" : "हजेरी क्र"}</th>
                   <th>{language === "English" ? "Student Name" : "विद्यार्थ्याचे नाव"}</th>
                   <th colSpan={"1"} className="text-center">
                     {" "}
                      {language === "English" ? "Obtained Grade" : "गुण मिळाले"}
                   </th>
                 </tr>
               </thead>
               <tbody>
   {selectedStudents
     .slice() // Create a shallow copy to avoid mutating the original array
     .sort((a, b) => a.rollNo - b.rollNo) // Sort by rollNo in ascending order
     .map((student) => {
       const studentMarks = marksData[student.srNo]?.[subject] || {}; // Fetch marks for the current student and subject
       return (
         <tr key={student.srNo}>
           <td >{student.rollNo}</td>
           <td> {student.stdName} {student.stdFather} {student.stdSurname} </td>


           <td>
  <input
    type="text"
    value={studentMarks.grade || ""}
    onChange={(e) => {
      const value = e.target.value;
      handleGradeChange(student.srNo, subject, "grade", value);
    }}
    list="grades"
    className="form-control"
  />
  <datalist id="grades">
    <option value="A1">A1</option>
    <option value="A2">A2</option>
    <option value="B1">B1</option>
    <option value="B2">B2</option>
    <option value="C1">C1</option>
    <option value="C2">C2</option>
    <option value="D1">D1</option>
    <option value="D2">D2</option>
  </datalist>
</td>

        
         </tr>
       );
     })}
 </tbody>
             </table>
           </Modal.Body>
           <Modal.Footer>
             
             <Button variant="primary" onClick={saveGrades}>
               {language === "English" ? " Save" : "Save करा"}
             </Button>
           </Modal.Footer>
</Modal>
       </div>
       
     </div>
 
   )
}

export default MarkEnteryHSC;