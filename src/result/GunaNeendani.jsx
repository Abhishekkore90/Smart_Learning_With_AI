import React, { useState, useEffect } from "react";
import { Modal, Button } from "react-bootstrap";
import "../result/result.css";
import Alignment from "./Alignment";
import AlertMessage from "../../AlertMessage";
import { useMediaQuery } from 'react-responsive';
import AllMarksPath from "./AllMarksPath";



const ResultEntry = () => {
  const [academicYear, setAcademicYear] = useState("");
  const [examNames, setExamNames] = useState([
    "First Semester",
    "Second Semester",
  ]);

  const examNameTranslations = {
    "First Semester": "प्रथम सत्र",
    "Second Semester": "द्वितीय सत्र",
  };


  const isDesktop = useMediaQuery({ query: '(min-width: 768px)' });
  const isTablet = useMediaQuery({ query: '(min-width: 480px)' });
  const isMobile = useMediaQuery({ query: '(min-width: 320px)' });



  const [classValue, setClassValue] = useState("");
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
  const [division, setDivision] = useState("");
  const [divisions, setDivisions] = useState(["A", "B", "C", "D"]);

  const [specialEntries, setSpecialEntries] = useState({});
  const [interestsAndHobbies, setInterestsAndHobbies] = useState({});
  const [necessaryCorrections, setNecessaryCorrections] = useState({});
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'English');

  const [showDefaultSubjects, setShowDefaultSubjects] = useState(false);

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

  // Handle division change
  const handleDivisionChange = (e) => {
    setDivision(e.target.value); // Update division state
  };

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
  useEffect(() => {
    const storedLanguage = localStorage.getItem('language') || 'English';
    setLanguage(storedLanguage);
  }, []);


  const [selectedExamName, setSelectedExamName] = useState(examNames[0]);



  const [blink, setBlink] = useState(false);
  const handleAcademicYearChange = (e) => setAcademicYear(e.target.value);
  // const handleClassChange = (e) => {
  //   setClassValue(e.target.value);
  //   fetchSubjectsForClass(e.target.value);
  //   setBlink(Object.keys(subjects).length === 0);
  // };

  const handleSubjectChange = (e) => {
    setSubject(e.target.value);

    setSelectedSubject(e.target.value)

    // const selectedSubject = e.target.value;
    // setSubject(selectedSubject);
    // setSelectedSubject(selectedSubject); // Ensure this is set correctly
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
        const allStudents = event.target.result;

        // Filter out students where isActive is false
        const activeStudents = allStudents.filter(student =>
          student.isActive !== false
        );

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
  const handleClassChange = async (e) => {
    const selectedClass = e.target.value;
    setClassValue(selectedClass); // Update the class value
    setDivision(""); // Reset division when class changes
    fetchSubjectsForClass(e.target.value);

    if (selectedClass) {
      await fetchDivisionsForClass(selectedClass);
    }
  };


  const fetchSubjectsForClass = async (classValue) => {
    try {
      if (!academicYear) {
        console.error("Academic year is not set");
        return;
      }

      // Construct the new URL for fetching subjects
      const url = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/ssc/${academicYear}/${classValue}/${division}.json`;

      // Fetch subjects directly from the `subjectSequence` node
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch subjects for class ${classValue}`);
      }

      const subjectsData = await response.json();
      if (subjectsData) {
        // Filter out null values and convert to array of valid subjects
        const validSubjects = Object.entries(subjectsData)
          .filter(([_, value]) => value !== null && value !== undefined)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([_, subject]) => subject);

        // Convert array to object with sequential numbering
        const formattedSubjects = validSubjects.reduce((acc, subject) => {
          acc[subject] = true;
          return acc;
        }, {});

        setSubjects(formattedSubjects); // Update state with the formatted subjects
        setSubject(Object.keys(formattedSubjects)[0] || ""); // Set the first subject as selected
      } else {
        console.warn("No subjects found for the specified class and academic year");
        setSubjects({});
      }
    } catch (error) {
      console.error(
        `Error fetching subjects for class ${classValue} and academic year ${academicYear}:`,
        error
      );
    }
  };




  useEffect(() => {
    fetchStudentData();
  }, []);

  useEffect(() => {
    if (classValue) {
      fetchSubjectsForClass(classValue);
    }
  }, [classValue]);


  useEffect(() => {
    setSubject(Object.keys(subjects)[0] || "");
  }, [subjects]);



  // fetched the marks from the indexeddb 

  const fetchMarksData = async (srNo, academicYear, examName, subject) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STUDENT_STORE, "readonly");
      const store = transaction.objectStore(STUDENT_STORE);
      const request = store.get(`${classValue}-${division}-${srNo}`);
      return new Promise((resolve) => {
        request.onsuccess = (event) => {
          const studentData = event.target.result;
          if (
            studentData &&
            studentData.result &&
            studentData.result[academicYear] &&
            studentData.result[academicYear][examName] &&
            studentData.result[academicYear][examName][subject]
          ) {
            const marks = studentData.result[academicYear][examName][subject];
            resolve(marks);
          } else {
            resolve({});
          }
        };
        request.onerror = () => {
          console.error("Error fetching marks data:");
          resolve({});
        };
      });
    } catch (error) {
      console.error("Error fetching marks data:", error);
      return {};
    }
  };
  const fetchMarksForSelectedSubject = async () => {
    try {
      const selectedStudents = studentData.filter(
        (student) => student.currentClass === classValue && (student.division === division || '')
      );
      setSelectedStudents(selectedStudents);

      // Use Promise.all to fetch marks concurrently
      const marksDataPromises = selectedStudents.map((student) =>
        fetchMarksData(student.srNo, academicYear, selectedExamName, subject)
      );
      // Wait for all fetches to complete
      const marksDataArray = await Promise.all(marksDataPromises);
      // Map the results back to the student SR numbers
      const marksData = {};
      selectedStudents.forEach((student, index) => {
        marksData[student.srNo] = marksDataArray[index];
      });
      setMarksData(marksData);
    } catch (error) {
      console.error("Error fetching marks data:", error);
    }
  };
  useEffect(() => {
    if (subject && selectedExamName && classValue && academicYear) {
      fetchMarksForSelectedSubject();
    }
  }, [subject, selectedExamName, classValue, academicYear]);




  const submit = async () => {
    setShowForm(true);
    setShowModal(true);
    setSubject("");

    // Case: If division is not selected, fetch all from class
    const selectedStudents = studentData.filter((student) => {
      return student.currentClass === classValue && (student.division === division || "");
    });

    setSelectedStudents(selectedStudents);

    const marksData = {};

    for (const student of selectedStudents) {
      const studentMarks = await fetchMarksData(student.srNo, academicYear, selectedExamName, subject);
      marksData[student.srNo] = studentMarks;
    }

    setMarksData(marksData);
  };


  // const submit = async () => {
  //   setShowForm(true);
  //   setShowModal(true);
  //   setSubject("");

  //   let filteredStudents;

  //   if (division === "") {
  //     // Only include students where division is null, undefined, or empty
  //     filteredStudents = studentData.filter(
  //       (student) =>
  //         student.currentClass === classValue &&
  //         (!student.division || student.division.trim() === "")
  //     );
  //   } else {
  //     // Include students from selected division
  //     filteredStudents = studentData.filter(
  //       (student) =>
  //         student.currentClass === classValue &&
  //         student.division === division
  //     );
  //   }

  //   setSelectedStudents(filteredStudents);

  //   const marksData = {};

  //   for (const student of filteredStudents) {
  //     const studentMarks = await fetchMarksData(
  //       student.srNo,
  //       academicYear,
  //       selectedExamName,
  //       subject
  //     );
  //     marksData[student.srNo] = studentMarks;
  //   }

  //   setMarksData(marksData);
  // };






  const submitNewSubject = async () => {
    if (newSubject.trim() !== "" && classValue && academicYear) {
      try {
        // Firebase path without division
        const subjectSequencePath = `/schoolRegister/${udiseNumber}/subjectSequence/ssc/${academicYear}/${classValue}/${division}`;

        // Fetch existing subject sequence
        const existingSequenceResponse = await fetch(
          `${process.env.REACT_APP_FIREBASE_DATABASE_URL}${subjectSequencePath}.json`
        );
        const existingSequence = (await existingSequenceResponse.json()) || {};

        // Check if subject already exists
        const existingSubjects = Object.values(existingSequence);
        if (existingSubjects.includes(newSubject)) {
          setAlertMessage(`${newSubject} already exists in the subject list!`);
          return; // Exit if subject already exists
        }

        // Update local subjects state
        setSubjects((prevSubjects) => ({
          ...prevSubjects,
          [newSubject]: true,
        }));

        // Find the next available index
        const existingSubjectsArray = Object.entries(existingSequence)
          .filter(([_, value]) => value !== null && value !== undefined)
          .sort(([a], [b]) => parseInt(a) - parseInt(b));

        const nextIndex =
          existingSubjectsArray.length > 0
            ? parseInt(existingSubjectsArray[existingSubjectsArray.length - 1][0]) + 1
            : 1;

        // Prepare updates object for Firebase
        const updates = {
          [`${subjectSequencePath}/${nextIndex}`]: newSubject,
        };

        // Send a single PATCH request for all updates
        await fetch(`${process.env.REACT_APP_FIREBASE_DATABASE_URL}/.json`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
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
      const subjectSequencePath = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/ssc/${academicYear}/${classValue}/${division}.json`;

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


  const classMapping = {
    "Class I": 1,
    "Class II": 2,
    "Class III": 3,
    "Class IV": 4,
    "Class V": 5,
    "Class VI": 6,
    "Class VII": 7,
    "Class VIII": 8,

    "1st": 1,
    "2nd": 2,
    "3rd": 3,
    "4th": 4,
    "5th": 5,
    "6th": 6,
    "7th": 7,
    "8th": 8,

    "इयत्ता पहिली": 1,
    "इयत्ता दुसरी": 2,
    "इयत्ता तिसरी": 3,
    "इयत्ता चौथी": 4,
    "इयत्ता पाचवी": 5,
    "इयत्ता सहावी": 6,
    "इयत्ता सातवी": 7,
    "इयत्ता आठवी": 8,


    "पहिली": 1,
    "दुसरी": 2,
    "तिसरी": 3,
    "चौथी": 4,
    "पाचवी": 5,
    "सहावी": 6,
    "सातवी": 7,
    "आठवी": 8,
  };






  const handleMarksChange = (srNo, category, type, value) => {
    // Check if a subject is selected
    if (!subject) {
      setAlertMessage("Please select a subject before entering marks.");
      return; // Exit the function if no subject is selected
    }

    const newValue = Number(value);

    setMarksData((prevMarksData) => {
      const updatedMarksData = {
        ...prevMarksData,
        [srNo]: {
          ...prevMarksData[srNo],
          [category]: {
            ...prevMarksData[srNo]?.[category],
            [type]: newValue,
          },
        },
      };
      let currentClass = selectedStudents.find(
        (student) => student.srNo === srNo
      )?.currentClass;


      // Trim and normalize the class name
      currentClass = currentClass?.trim().replace(/\s+/g, " ");

      // Map the class name to its corresponding numeric value
      currentClass = classMapping[currentClass];

      if (!currentClass) {
        setAlertMessage("Class is undefined or not found in mapping.");
        return prevMarksData; // Prevent further processing
      }

      const isDefaultSubject = defaultSubjects.some(
        (subject) => subject.name === selectedSubject
      );

      let maxTotalAkarik = 0;
      let maxTotalSanklik = 0;

      if (isDefaultSubject) {
        maxTotalAkarik = 100;
        maxTotalSanklik = 0;
      } else {
        if ([1, 2].includes(currentClass)) {
          maxTotalAkarik = 70;
          maxTotalSanklik = 30;
        } else if ([3, 4].includes(currentClass)) {
          maxTotalAkarik = 60;
          maxTotalSanklik = 40;
        } else if ([5, 6].includes(currentClass)) {
          maxTotalAkarik = 50;
          maxTotalSanklik = 50;
        } else if ([7, 8].includes(currentClass)) {
          maxTotalAkarik = 40;
          maxTotalSanklik = 60;
        }
      }

      const totalAkarik = [
        "Daily Monitoring",
        "Oral Work",
        "Demonstration",
        "Activity",
        "Project",
        "Test",
        "Homework",
        "Others",
      ].reduce(
        (acc, key) => acc + (updatedMarksData[srNo]?.Akarik?.[key] || 0),
        0
      );

      const totalSanklik = ["Orally", "Demonstration", "Writing"].reduce(
        (acc, key) => acc + (updatedMarksData[srNo]?.Sanklik?.[key] || 0),
        0
      );

      if (isDefaultSubject) {
        if (category === "Sanklik" && totalSanklik > maxTotalSanklik) {
          setAlertMessage(
            `Sanklik total should not exceed ${maxTotalSanklik} for default subject ${selectedSubject}`
          );
          return prevMarksData;
        }

        if (category === "Akarik" && totalAkarik > maxTotalAkarik) {
          setAlertMessage(
            `Akarik total should not exceed ${maxTotalAkarik} for default subject ${selectedSubject}`
          );
          return prevMarksData;
        }
      } else {
        if (category === "Akarik" && totalAkarik > maxTotalAkarik) {
          setAlertMessage(
            `Akarik total should not exceed ${maxTotalAkarik} for class ${currentClass}`
          );
          return prevMarksData;
        }
        if (category === "Sanklik" && totalSanklik > maxTotalSanklik) {
          setAlertMessage(
            `Sanklik total should not exceed ${maxTotalSanklik} for class ${currentClass}`
          );
          return prevMarksData;
        }
      }

      updatedMarksData[srNo] = {
        ...updatedMarksData[srNo],
        Akarik: {
          ...updatedMarksData[srNo]?.Akarik,
          Total: totalAkarik,
        },
        Sanklik: {
          ...updatedMarksData[srNo]?.Sanklik,
          Total: totalSanklik,
        },
      };

      // After updating marksData, save the marks
      saveMarksForAllStudents(updatedMarksData);
      saveMarksToIndexedDB(updatedMarksData);
      return updatedMarksData;
    });
    // saveMark1();
  };


  const saveMarksToIndexedDB = async (updatedMarksData) => {
    if (subject === "" || subject === undefined || subject === null) {
      setAlertMessage("Please Select Subject First")
      return;
    }
    try {
      const db = await openDB();
      const transaction = db.transaction(STUDENT_STORE, "readwrite");
      const store = transaction.objectStore(STUDENT_STORE);

      for (const student of selectedStudents) {
        const studentKey = `${classValue}-${division}-${student.srNo}`;
        const request = store.get(studentKey);

        await new Promise((resolve, reject) => {
          request.onsuccess = async (event) => {
            const studentData = event.target.result;

            if (studentData) {
              // Ensure the result structure exists
              if (!studentData.result) {
                studentData.result = {};
              }
              if (!studentData.result[academicYear]) {
                studentData.result[academicYear] = {};
              }
              if (!studentData.result[academicYear][selectedExamName]) {
                studentData.result[academicYear][selectedExamName] = {};
              }

              // Update the specific subject marks
              studentData.result[academicYear][selectedExamName][selectedSubject] = {
                Akarik: updatedMarksData[student.srNo]?.Akarik || {},
                Sanklik: updatedMarksData[student.srNo]?.Sanklik || {},
              };

              // Update nondi (additional) fields
              studentData.result[academicYear][selectedExamName].nondi = {
                specialEntries: specialEntries[student.srNo] || "",
                interestsAndHobbies: interestsAndHobbies[student.srNo] || "",
                necessaryCorrections: necessaryCorrections[student.srNo] || "",
              };

              // Put the updated student data back into the store
              const updateRequest = store.put(studentData);

              updateRequest.onsuccess = () => resolve();
              updateRequest.onerror = (error) => reject(error);
            } else {
              console.error(`No student data found for key: ${studentKey}`);
              resolve();
            }
          };

          request.onerror = (error) => {
            console.error("Error retrieving student data:", error);
            reject(error);
          };
        });
      }

      console.log("Marks and nondi fields successfully saved to IndexedDB");
    } catch (error) {
      console.error("Error saving marks to IndexedDB:", error);
    }
  };

  const saveMarksForAllStudents = async (updatedMarksData) => {
    if (subject === "" || subject === undefined || subject === null) {
      setAlertMessage("Please Select Subject First")
      return;
    }
    try {
      const updates = {};

      // Build the updates object for all students
      for (const student of selectedStudents) {
        const marks = updatedMarksData[student.srNo] || {};

        // Prepare subject-specific data
        const subjectData = {
          Akarik: marks.Akarik || {},
          Sanklik: marks.Sanklik || {},
          // Add any other necessary fields here
        };

        // Add subject-specific marks to the updates object
        updates[
          `/schoolRegister/${udiseNumber}/studentData/${student.srNo}/result/${academicYear}/${selectedExamName}/${subject}`
        ] = subjectData;

        // Prepare additional fields
        const additionalFields = {
          specialEntries: specialEntries[student.srNo] || "",
          interestsAndHobbies: interestsAndHobbies[student.srNo] || "",
          necessaryCorrections: necessaryCorrections[student.srNo] || "",
        };

        // Add additional fields to the updates object
        updates[
          `/schoolRegister/${udiseNumber}/studentData/${student.srNo}/result/${academicYear}/${selectedExamName}/nondi`
        ] = additionalFields;
      }

      // Send a single PATCH request for all updates
      await fetch(`${process.env.REACT_APP_FIREBASE_DATABASE_URL}/.json`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      // setAlertMessage(language === "English" ? "Marks saved successfully!" : "गुण यशस्वीरित्या जतन केले");
    } catch (error) {
      console.error("Error saving marks:", error);
    }
  };

  const saveMarks = async () => {
    if (subject === "" || subject === undefined || subject === null) {
      setAlertMessage("Please Select Subject First");
      return;
    }

    try {
      // Open IndexedDB
      const db = await openDB();
      const transaction = db.transaction(STUDENT_STORE, "readwrite");
      const store = transaction.objectStore(STUDENT_STORE);

      // Create array for all save operations
      const saveOperations = [];

      for (const student of selectedStudents) {
        const studentKey = `${classValue}-${division}-${student.srNo}`;

        // Prepare only the additionalFields (nondi)
        const additionalFields = {
          specialEntries: specialEntries[student.srNo] || "",
          interestsAndHobbies: interestsAndHobbies[student.srNo] || "",
          necessaryCorrections: necessaryCorrections[student.srNo] || "",
        };

        // Firebase update (only nondi fields)
        const firebaseUpdate = fetch(
          `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${student.srNo}/result/${academicYear}/${selectedExamName}/nondi.json`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(additionalFields),
          }
        );
        saveOperations.push(firebaseUpdate);

        // IndexedDB update (only nondi fields)
        const indexedDBUpdate = new Promise((resolve, reject) => {
          const request = store.get(studentKey);

          request.onsuccess = (event) => {
            const studentData = event.target.result;

            if (studentData) {
              if (!studentData.result) studentData.result = {};
              if (!studentData.result[academicYear]) studentData.result[academicYear] = {};
              if (!studentData.result[academicYear][selectedExamName]) {
                studentData.result[academicYear][selectedExamName] = {};
              }

              // Only update nondi fields, no marks
              studentData.result[academicYear][selectedExamName].nondi = additionalFields;

              const updateRequest = store.put(studentData);

              updateRequest.onsuccess = () => resolve();
              updateRequest.onerror = (error) => reject(error);
            } else {
              console.error(`No student data found for key: ${studentKey}`);
              resolve();
            }
          };

          request.onerror = (error) => {
            console.error("Error retrieving student data:", error);
            reject(error);
          };
        });

        saveOperations.push(indexedDBUpdate);
      }

      // Wait for all operations to complete
      await Promise.all(saveOperations);

      setAlertMessage(
        language === "English"
          ? "Additional fields saved successfully"
          : "अतिरिक्त फील्ड यशस्वीरित्या जतन केले"
      );
    } catch (error) {
      console.error("Error saving additional fields:", error);
      setAlertMessage(
        language === "English"
          ? "Error saving data. Please try again."
          : "डेटा जतन करताना त्रुटी. कृपया पुन्हा प्रयत्न करा."
      );
    }
  };





















  const handleSpecialEntriesChange = (srNo, value) => {
    setSpecialEntries(prevState => ({
      ...prevState,
      [srNo]: value
    }));
  };

  const handleInterestsAndHobbiesChange = (srNo, value) => {
    setInterestsAndHobbies(prevState => ({
      ...prevState,
      [srNo]: value
    }));
  };

  const handleNecessaryCorrectionsChange = (srNo, value) => {
    setNecessaryCorrections(prevState => ({
      ...prevState,
      [srNo]: value
    }));
  };


  // Function to fetch additional fields for selected students
  const fetchAdditionalFields = async () => {
    try {
      if (selectedStudents.length > 0) {
        // Iterate over selected students
        for (const student of selectedStudents) {
          const response = await fetch(
            `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${student.srNo}/result/${academicYear}/${selectedExamName}/nondi.json`
          );
          const data = await response.json();

          // Check if data is not null and contains the expected properties
          if (data) {
            setSpecialEntries((prev) => ({ ...prev, [student.srNo]: data.specialEntries || "" }));
            setInterestsAndHobbies((prev) => ({ ...prev, [student.srNo]: data.interestsAndHobbies || "" }));
            setNecessaryCorrections((prev) => ({ ...prev, [student.srNo]: data.necessaryCorrections || "" }));
          } else {
            // Handle the case where data is null or undefined
            setSpecialEntries((prev) => ({ ...prev, [student.srNo]: "" }));
            setInterestsAndHobbies((prev) => ({ ...prev, [student.srNo]: "" }));
            setNecessaryCorrections((prev) => ({ ...prev, [student.srNo]: "" }));
          }
        }
      }
    } catch (error) {
      console.error("Error fetching additional fields:", error);
    }
  };

  // Call fetchAdditionalFields when component mounts or selectedStudents change
  useEffect(() => {
    if (selectedStudents.length > 0) {
      fetchAdditionalFields();
    }
  }, [selectedStudents, udiseNumber, academicYear, selectedExamName]);

  const englishSubjects = [
    { name: "Arts", akarikMarks: 100 },
    { name: "Work Experience", akarikMarks: 100 },
    { name: "Physical Education", akarikMarks: 100 },
    { name: "Computer", akarikMarks: 100 }, // New subject added
  ];

  const marathiSubjects = [
    { name: "चित्रकला", akarikMarks: 100 }, // New subject added
    { name: "शारीरिक शिक्षण", akarikMarks: 100 }, // New subject added
    { name: "संगणक", akarikMarks: 100 }, // New subject added
    { name: "कला", akarikMarks: 100 },
    { name: "कार्यानुभव", akarikMarks: 100 },
    { name: "शा.शिक्षण", akarikMarks: 100 },
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
      // Firebase path for the subject sequence
      const subjectSequencePath = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/ssc/${academicYear}/${classValue}/${division}.json`;

      // Fetch existing subject sequence
      const existingSequenceResponse = await fetch(subjectSequencePath);
      const existingSequence = (await existingSequenceResponse.json()) || {};

      // Check if the subject already exists in the sequence
      const existingSubjects = Object.values(existingSequence);
      if (existingSubjects.includes(subject.name)) {
        setAlertMessage(`${subject.name} already exists in the subject list!`);
        return; // Exit if subject already exists
      }

      // Update the local state
      setSubjects((prevSubjects) => ({
        ...prevSubjects,
        [subject.name]: true,
      }));

      // Convert existing sequence to an array and filter out null values
      const existingSubjectsArray = Object.entries(existingSequence)
        .filter(([_, value]) => value !== null && value !== undefined)
        .sort(([a], [b]) => parseInt(a) - parseInt(b));

      // Find the next available index for the new subject
      const nextIndex = existingSubjectsArray.length > 0
        ? parseInt(existingSubjectsArray[existingSubjectsArray.length - 1][0]) + 1
        : 1;

      // Create the update object for the subject sequence
      const updateObject = {
        [nextIndex.toString()]: subject.name
      };

      // Update the subject sequence in Firebase
      await fetch(subjectSequencePath, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateObject),
      });

      // Track the added subjects in state
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
      const url = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/subjectSequence/ssc/${academicYear}/${classValue}/${division}.json`;
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

  useEffect(() => {
    if (classValue) {
      const filteredStudents = studentData.filter(
        (student) => student.currentClass === classValue && (student.division === division || '')
      );
      setSelectedStudents(filteredStudents);
    }
  }, [classValue, division, studentData]);

  // Use useEffect to fetch added subjects when component mounts
  useEffect(() => {
    if (classValue && academicYear && examNames.length > 0) {
      fetchAddedSubjects();
    }
  }, [classValue, academicYear, examNames]); // Dependenciesg

  const [selectedSubject, setSelectedSubject] = useState('');


  const handleDelete = () => {
    if (subject && window.confirm('Are you sure you want to delete this subject? This will delete selected subject data ')) {
      deleteSubject(subject);
    }
  };

  const [showSubjectAlignment, setShowSubjectAlignment] = useState(false);

  const handleSetSequenceClick = () => {
    setShowSubjectAlignment(true);
  };

  return (
    <div>
      <AllMarksPath />


      <AlertMessage message={alertMessage} show={showAlert} />

      {showSubjectAlignment && (
        <Alignment onClose={() => setShowSubjectAlignment(false)} />
      )}

      <div>
        <div className=" main-content-of-page" >
          <h2 style={{ color: '#333', textAlign: 'center', fontWeight: 'bold', marginBottom: '20px' }} > {language === "English" ? "Marks Entry" : "गुण नोंदणी"}</h2>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '20px' }}>
            <table className="table table-striped table-bordered" style={{ flex: '2' }}>
              <tbody>
                <tr>
                  <th style={{ backgroundColor: '#b5d3f2' }}>{language === "English" ? "Academic Year " : "शैक्षणिक वर्ष"}</th>
                  <td>
                    <select
                      id="academicYear"
                      defaultValue={academicYear} // Add this prop
                      value={academicYear}
                      onChange={handleAcademicYearChange}
                      className="form-control custom-select"
                      style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
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
                  <th style={{ backgroundColor: '#b5d3f2' }}>{language === "English" ? "Class " : "वर्ग"}</th>
                  <td>
                    <select
                      id="class"
                      value={classValue}
                      onChange={handleClassChange}
                      className="form-control custom-select"
                      style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                    >
                      <option value="">{language === "English" ? "Select Class " : "वर्ग निवडा"}</option>
                      {["Class I", "Class II", "Class III", "Class IV", "Class V", "Class VI", "Class VII", "Class VIII"]
                        .map((cls, index) => (
                          <option key={index} value={cls}>
                            {cls}
                          </option>
                        ))}
                    </select>
                  </td>

                </tr>
                <tr>
                  <th style={{ backgroundColor: '#b5d3f2' }}>{language === "English" ? "Division" : "तुकडी"}</th>
                  <td>
                    <select
                      value={division}
                      onChange={handleDivisionChange}
                      className="form-control custom-select"
                      style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                    >
                      <option value="">
                        {language === "English" ? "Select Division" : "तुकडी निवडा"}
                      </option>
                      {divisions
                        .filter((div) => div !== null && div !== undefined && div.trim() !== "")
                        .map((div) => (
                          <option key={div} value={div}>
                            {div}
                          </option>
                        ))}
                    </select>
                  </td>
                </tr>
                <tr>


                  <th style={{ backgroundColor: '#b5d3f2' }}>{language === "English" ? "Subject " : "विषय"}</th>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <select
                        id="subject"
                        value={subject}
                        onChange={(e) => {
                          const selectedValue = e.target.value; // Get the selected value
                          setSubject(selectedValue); // Update the state with the selected subject
                          handleSubjectChange(e);
                        }}
                        className="form-control custom-select me-3"
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      >


                        <option value="">
                          {language === "English" ? "Select Subject " : "विषय निवडा"}
                        </option>
                        {Object.keys(subjects).map((sub, index) => (
                          <option key={index} value={sub}>
                            {sub}
                            {/* {language === "English" ? sub : subjects[sub].marathi} Add Marathi translation */}
                          </option>
                        ))}
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
                        className={`btn btn-primary btn-block me-3 ${academicYear && classValue && Object.keys(subjects).length === 0 ? 'blink' : ''}`}
                        style={{ backgroundColor: '#60a5fa', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        Add Subject
                      </button>
                    </div>
                  </td>


                </tr>
                <tr>
                  <th style={{ backgroundColor: '#b5d3f2' }}>{language === "English" ? "Exam Name" : "परीक्षेचे नाव"}</th>
                  <td>
                    <select
                      id="examName"
                      value={selectedExamName}
                      onChange={handleExamNameChange}
                      className="form-control custom-select"
                      style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
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




                    <button
                      onClick={submit}
                      className="btn btn-primary btn-block"
                      disabled={!academicYear || !classValue} // Disable if academicYear or classValue is not selected
                      style={{ backgroundColor: '#60a5fa', color: '#fff', padding: '10px 30px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}
                    >
                      {language === "English" ? "Enter Marks" : "गुण प्रविष्ट करा"}
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

          <div class="footer-notes" >
            <div class="column">
              <h5> {language === "English" ? "  Subject Weight:" : "इतर विषय भारांश"}</h5>
              <ul>
                <li>{language === "English" ? "  First and Second Class - Dimensional + Compiled = Total Marks - 70+30=100 " : "पहिली व दुसरी - आकारिक + संकलित = एकूण गुण - 70+30=100"}</li>
                <li>{language === "English" ? "  Third and Fourth Class - Dimensional + Compiled = Total Marks = 60 +40 100" : "तिसरी व चौथी वर्ग - आकारिक + संकलित = एकूण गुण = 60 +40 100"}</li>
                <li>{language === "English" ? "  Fifth & Sixth Class - Dimensional + Compiled = Total Marks = 50+50=100" : "पाचवी व सहावी वर्ग - आकारिक + संकलित = एकूण गुण = 50+50 = 100"}</li>
                <li>{language === "English" ? "  Seventh and Eighth Class- Dimensional + Compiled = Total marks = 40+60=;100" : "सातवी व आठवी वर्ग- आकारिक + संकलित = एकूण गुण=40+60=100"}</li>
              </ul>
            </div>
            <div class="column">
              <h5>{language === "English" ? " How To Register Marks:" : "मार्क नोंदणी कशी करावी"}</h5>
              <p class="separate-note">{language === "English" ? "  To register marks first select the type of examination then click on 'Enter Marks'. Then fill out special entries." : "मार्क नोंदणी करण्यासाठी प्रथम शैक्षणिक वर्ष निवडा,नंतर वर्ग निवडा, आणि विषय हे 'Add Subject' वर क्लिक करुन विषय भरून घ्या. त्यानंतर परीक्षा सत्र निवडुन गुण प्रविष्ट करा."}</p>
            </div>
            <div class="column">
              <h5>{language === "English" ? "Assessment:" : "कला,कार्यानुभव आणि शा.शिक्षण विषय भारांश"}</h5>
              <p class="separate-note">{language === "English" ? "For Arts, Work Experience and Physical Education subjects, out of 100 marks should be given for the assessment. There are no cumulative assessment points for these subjects." : "कला, कार्यानुभव आणि शारीरिक शिक्षण विषयांसाठी पहिली ते आठवी या वर्गासाठी संकलित मूल्यमापनचेच 100 पैकी गुण द्यावेत.या विषयांसाठी आकारिक मूल्यमापन गुण नाहीत. "}</p>
            </div>
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
              {" "}
              <td style={{ width: '200px' }}>
                <select
                  id="subject"
                  value={subject}
                  onChange={handleSubjectChange}
                  className="form-control custom-select"
                  defaultValue=""
                >
                  <option value="" >{language === "English" ? "Select Subject:" : "विषय निवडा"}</option>
                  {Object.keys(subjects).map((sub, index) => (
                    <option key={index} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>

              </td>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <table className="table table-striped table-bordered"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                overflowX: 'auto',
                display: 'block',
                transform: isDesktop ? 'scale(1)' : isTablet ? 'scale(0.8)' : isMobile ? 'scale(0.6)' : 'scale(0.4)',
                transformOrigin: 'top left',
              }}
            >
              <thead>
                <tr>
                  <th style={{ width: "20px", backgroundColor: '#b5d3f2', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>{language === "English" ? "Roll No" : "हजेरी क्र"}</th>
                  <th style={{ backgroundColor: '#b5d3f2', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>{language === "English" ? "Student Name" : "विद्यार्थ्याचे नाव"}</th>

                  <th colSpan={"9"} className="text-center" style={{ backgroundColor: '#b5d3f2', verticalAlign: 'middle', fontWeight: 'bold' }}>
                    {language === "English" ? "Akarik" : "आकारिक"}
                  </th>
                  <th colSpan={"4"} className="text-center" style={{ backgroundColor: '#b5d3f2', verticalAlign: 'middle', fontWeight: 'bold' }}>
                    {" "}
                    {language === "English" ? " sanklik" : "संकलिक"}
                  </th>
                  <th colSpan={"3"} className="text-center" style={{ backgroundColor: '#b5d3f2', verticalAlign: 'middle', fontWeight: 'bold' }}>
                    {" "}
                    {language === "English" ? " Nondi" : "नोंदी"}
                  </th>
                </tr>
                <tr style={{ backgroundColor: "#f2f2f2", fontSize: "14px", textAlign: "center" }}>
                  <th colSpan="2" style={{ padding: "8px", border: "1px solid black" }}></th>
                  <th style={{
                    padding: "20px",
                    border: "1px solid black",
                    height: "140px",
                    width: "40px", // This width will now be applied correctly
                    writingMode: "vertical-rl", // Rotates the text vertically
                    transform: "rotate(180deg)", // Adjusts the text direction
                    whiteSpace: "nowrap", // Ensures the text doesn't wrap
                    overflow: "hidden", // Prevent overflow
                  }}>{language === "English" ? " Daily Monitoring" : "दैनंदिन निरीक्षण"}</th>

                  <th style={{
                    padding: "20px",
                    border: "1px solid black",
                    height: "150px",
                    width: "40px", // This width will now be applied correctly
                    writingMode: "vertical-rl", // Rotates the text vertically
                    transform: "rotate(180deg)", // Adjusts the text direction
                    whiteSpace: "nowrap", // Ensures the text doesn't wrap
                    overflow: "hidden", // Prevent overflow
                  }}>{language === "English" ? " Oral Work" : "तोंडी काम"}</th>
                  <th style={{
                    padding: "20px",
                    border: "1px solid black",
                    height: "140px",
                    width: "40px", // This width will now be applied correctly
                    writingMode: "vertical-rl", // Rotates the text vertically
                    transform: "rotate(180deg)", // Adjusts the text direction
                    whiteSpace: "nowrap", // Ensures the text doesn't wrap
                    overflow: "hidden", // Prevent overflow
                  }}>{language === "English" ? " Demonstration" : "प्रात्यक्षिके"}</th>
                  <th style={{
                    padding: "20px",
                    border: "1px solid black",
                    height: "140px",
                    width: "40px", // This width will now be applied correctly
                    writingMode: "vertical-rl", // Rotates the text vertically
                    transform: "rotate(180deg)", // Adjusts the text direction
                    whiteSpace: "nowrap", // Ensures the text doesn't wrap
                    overflow: "hidden", // Prevent overflow
                  }}>{language === "English" ? " Activity" : "उपक्रम/कृती"}</th>
                  <th style={{
                    padding: "20px",
                    border: "1px solid black",
                    height: "140px",
                    width: "40px", // This width will now be applied correctly
                    writingMode: "vertical-rl", // Rotates the text vertically
                    transform: "rotate(180deg)", // Adjusts the text direction
                    whiteSpace: "nowrap", // Ensures the text doesn't wrap
                    overflow: "hidden", // Prevent overflow
                  }}>{language === "English" ? " Project" : "प्रकल्प"}</th>
                  <th style={{
                    padding: "20px",
                    border: "1px solid black",
                    height: "140px",
                    width: "40px", // This width will now be applied correctly
                    writingMode: "vertical-rl", // Rotates the text vertically
                    transform: "rotate(180deg)", // Adjusts the text direction
                    whiteSpace: "nowrap", // Ensures the text doesn't wrap
                    overflow: "hidden", // Prevent overflow
                  }}>{language === "English" ? " Test" : "चाचणी"}</th>
                  <th style={{
                    padding: "20px",
                    border: "1px solid black",
                    height: "140px",
                    width: "40px", // This width will now be applied correctly
                    writingMode: "vertical-rl", // Rotates the text vertically
                    transform: "rotate(180deg)", // Adjusts the text direction
                    whiteSpace: "nowrap", // Ensures the text doesn't wrap
                    overflow: "hidden", // Prevent overflow
                  }}>{language === "English" ? " Homework" : "गृहपाठ"}</th>
                  <th style={{
                    padding: "20px",
                    border: "1px solid black",
                    height: "140px",
                    width: "40px", // This width will now be applied correctly
                    writingMode: "vertical-rl", // Rotates the text vertically
                    transform: "rotate(180deg)", // Adjusts the text direction
                    whiteSpace: "nowrap", // Ensures the text doesn't wrap
                    overflow: "hidden", // Prevent overflow
                  }}>{language === "English" ? " Others" : "इतर"}</th>
                  <th style={{
                    padding: "20px",
                    border: "1px solid black",
                    height: "140px",
                    width: "40px", // This width will now be applied correctly
                    writingMode: "vertical-rl", // Rotates the text vertically
                    transform: "rotate(180deg)", // Adjusts the text direction
                    whiteSpace: "nowrap", // Ensures the text doesn't wrap
                    overflow: "hidden", // Prevent overflow
                  }}>{language === "English" ? " Total" : "एकूण"}</th>
                  <th style={{
                    padding: "20px",
                    border: "1px solid black",
                    height: "140px",
                    width: "40px", // This width will now be applied correctly
                    writingMode: "vertical-rl", // Rotates the text vertically
                    transform: "rotate(180deg)", // Adjusts the text direction
                    whiteSpace: "nowrap", // Ensures the text doesn't wrap
                    overflow: "hidden", // Prevent overflow
                  }}>{language === "English" ? " Orally" : "तोंडी"}</th>
                  <th style={{
                    padding: "20px",
                    border: "1px solid black",
                    height: "140px",
                    width: "40px", // This width will now be applied correctly
                    writingMode: "vertical-rl", // Rotates the text vertically
                    transform: "rotate(180deg)", // Adjusts the text direction
                    whiteSpace: "nowrap", // Ensures the text doesn't wrap
                    overflow: "hidden", // Prevent overflow
                  }}>{language === "English" ? " Demonstration" : "प्रात्यक्षिके"}</th>
                  <th style={{
                    padding: "20px",
                    border: "1px solid black",
                    height: "140px",
                    width: "40px", // This width will now be applied correctly
                    writingMode: "vertical-rl", // Rotates the text vertically
                    transform: "rotate(180deg)", // Adjusts the text direction
                    whiteSpace: "nowrap", // Ensures the text doesn't wrap
                    overflow: "hidden", // Prevent overflow
                  }}>{language === "English" ? " Writing" : "लेखन"}</th>
                  <th style={{
                    padding: "20px",
                    border: "1px solid black",
                    height: "140px",
                    width: "40px", // This width will now be applied correctly
                    writingMode: "vertical-rl", // Rotates the text vertically
                    transform: "rotate(180deg)", // Adjusts the text direction
                    whiteSpace: "nowrap", // Ensures the text doesn't wrap
                    overflow: "hidden", // Prevent overflow
                  }}>{language === "English" ? " Total" : "एकूण"}</th>
                  <th style={{ padding: "8px", border: "1px solid black" }}>{language === "English" ? " Special entries" : "विशेष नोंदी"}</th>
                  <th style={{ padding: "8px", border: "1px solid black" }}>{language === "English" ? " Interests and hobbies" : "आवडी आणि छंद"}</th>
                  <th style={{ padding: "8px", border: "1px solid black" }}>{language === "English" ? " Necessary corrections" : "आवश्यक दुरुस्ती"}</th>
                </tr>
              </thead>
              <tbody style={{ padding: '0', margin: '0' }}>
                {[...selectedStudents]
                  .sort((a, b) => a.rollNo - b.rollNo)
                  .map((student) => (
                    <tr key={student.srNo}>
                      <td>{student.rollNo}</td>
                      <td>{student.stdName} {student.stdSurname}</td>
                      <td>
                        <input
                          type="number"
                          value={marksData[student.srNo]?.Akarik?.["Daily Monitoring"] || ""}
                          onChange={(e) =>
                            handleMarksChange(
                              student.srNo,
                              "Akarik",
                              "Daily Monitoring",
                              e.target.value
                            )
                          }
                          className="form-control"
                          style={{ padding: '2px', textAlign: 'center', }} // Adjust padding here
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={marksData[student.srNo]?.Akarik?.["Oral Work"] || ""}
                          onChange={(e) =>
                            handleMarksChange(
                              student.srNo,
                              "Akarik",
                              "Oral Work",
                              e.target.value
                            )
                          }
                          className="form-control"
                          style={{ padding: '2px', textAlign: 'center' }} // Adjust padding here
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={marksData[student.srNo]?.Akarik?.["Demonstration"] || ""}
                          onChange={(e) =>
                            handleMarksChange(
                              student.srNo,
                              "Akarik",
                              "Demonstration",
                              e.target.value
                            )
                          }
                          className="form-control"
                          style={{ padding: '2px', textAlign: 'center' }} // Adjust padding here
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={marksData[student.srNo]?.Akarik?.["Activity"] || ""}
                          onChange={(e) =>
                            handleMarksChange(
                              student.srNo,
                              "Akarik",
                              "Activity",
                              e.target.value
                            )
                          }
                          className="form-control"
                          style={{ padding: '2px', textAlign: 'center' }} // Adjust padding here
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={marksData[student.srNo]?.Akarik?.["Project"] || ""}
                          onChange={(e) =>
                            handleMarksChange(
                              student.srNo,
                              "Akarik",
                              "Project",
                              e.target.value
                            )
                          }
                          className="form-control"
                          style={{ padding: '2px', textAlign: 'center' }} // Adjust padding here
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={marksData[student.srNo]?.Akarik?.["Test"] || ""}
                          onChange={(e) =>
                            handleMarksChange(
                              student.srNo,
                              "Akarik",
                              "Test",
                              e.target.value
                            )
                          }
                          className="form-control"
                          style={{ padding: '2px', textAlign: 'center' }} // Adjust padding here
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={marksData[student.srNo]?.Akarik?.["Homework"] || ""}
                          onChange={(e) =>
                            handleMarksChange(
                              student.srNo,
                              "Akarik",
                              "Homework",
                              e.target.value
                            )
                          }
                          className="form-control"
                          style={{ padding: '2px', textAlign: 'center' }} // Adjust padding here
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={marksData[student.srNo]?.Akarik?.["Others"] || ""}
                          onChange={(e) =>
                            handleMarksChange(
                              student.srNo,
                              "Akarik",
                              "Others",
                              e.target.value
                            )
                          }
                          className="form-control"
                          style={{ padding: '2px', textAlign: 'center' }} // Adjust padding here
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={marksData[student.srNo]?.Akarik?.["Total"] || ""}
                          readOnly
                          className="form-control"
                          style={{ padding: '2px', textAlign: 'center' }} // Adjust padding here
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={marksData[student.srNo]?.Sanklik?.["Orally"] || ""}
                          onChange={(e) =>
                            handleMarksChange(
                              student.srNo,
                              "Sanklik",
                              "Orally",
                              e.target.value
                            )
                          }
                          className="form-control"
                          style={{ padding: '2px', textAlign: 'center' }} // Adjust padding here
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={marksData[student.srNo]?.Sanklik?.["Demonstration"] || ""}
                          onChange={(e) =>
                            handleMarksChange(
                              student.srNo,
                              "Sanklik",
                              "Demonstration",
                              e.target.value
                            )
                          }
                          className="form-control"
                          style={{ padding: '2px', textAlign: 'center' }} // Adjust padding here
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={marksData[student.srNo]?.Sanklik?.["Writing"] || ""}
                          onChange={(e) =>
                            handleMarksChange(
                              student.srNo,
                              "Sanklik",
                              "Writing",
                              e.target.value
                            )
                          }
                          className="form-control"
                          style={{ padding: '2px', textAlign: 'center' }} // Adjust padding here
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          value={marksData[student.srNo]?.Sanklik?.["Total"] || ""}
                          readOnly
                          className="form-control"
                          style={{ padding: '2px', textAlign: 'center' }} // Adjust padding here
                        />
                      </td>



                      <td>
                        <input
                          list="special Entries"
                          value={specialEntries[student.srNo] || ""}
                          onChange={(e) => handleSpecialEntriesChange(student.srNo, e.target.value)}
                          placeholder="Type or select an option"
                        />
                        <datalist id="special Entries">
                          <option value={language === "English" ? "Reads simple sentences" : "साधी वाक्ये वाचतो"} />
                          <option value={language === "English" ? "Recognize the letters in Marathi " : "भौमितिक आकृत्याची परिमिती काढतो/ते."} />
                          <option value={language === "English" ? "Read and write simple words  " : " भौमितिक आकृत्याचे गुणधर्म सांगतो/ते."} />
                          <option value={language === "English" ? "Listen and respond " : " लहान मोठ्या संख्या ओळखतो/ते."} />
                          <option value={language === "English" ? "Participate in classroom activities " : " विविध आकाराचे पृष्ठफळ व घनफळ सांगतो/ते."} />
                          <option value={language === "English" ? "Recognize numbers up to 100 " : "विविध परिमाणे समजून घेतो/ते."} />
                          <option value={language === "English" ? "Solve examples quickly " : " संख्याचा क्रम ओळखतो/ते."} />
                          <option value={language === "English" ? "Understand shapes and patterns " : "संख्याचे प्रकार सांगतो व वाचन करतो/ते."} />
                          <option value={language === "English" ? "Use mathematical reasoning " : " संख्यातील  अंकाची स्थानिक किमत अचूक सांगतो/ते."} />
                          <option value={language === "English" ? "Perform simple addition and subtraction " : "संख्यारेषेवरील अंकाची किंमत सांगतो/ते."} />
                          <option value={language === "English" ? "Identify letters in English " : "संख्यावरील मूलभूत क्रिया बरोबर करतो/ते."} />

                          <option value={language === "English" ? " " : " "} />
                          <option value={language === "English" ? "Marathi" : "मराठी"} />

                          <option value={language === "English" ? "Transcribes accurately in marathi. " : "अचूक अनुलेखन करतो/ते."} />
                          <option value={language === "English" ? "Presents the difficulties problems to the teacher " : "अडचणी समस्या शिक्षकांकडे मांडतो/ते."} />
                          <option value={language === "English" ? "Extra reading, paraphrasing in marathi " : "अवांतर वाचन ,पाठांतर करतो/ते."} />
                          <option value={language === "English" ? "Speaks confidently in marathi" : "आत्मविश्वासपूर्वक बोलतो/ते."} />
                          <option value={language === "English" ? "Expresses thoughts, experiences, feelings in clear words in marathi" : "आपले विचार ,अनुभव ,भावना स्पष्ट शब्दात व्यक्त करतो/ते."} />
                          <option value={language === "English" ? "Draws conclusions about what is heard, read in marathi" : "ऐकलेल्या ,वाचलेल्या गोष्टीबाबत निष्कर्ष काढतो/ते."} />
                          <option value={language === "English" ? "Says the content of the text heard in his/her own words in marathi" : "ऐकलेल्या मजकुरातील आशय स्वत:च्या शब्दात सांगतो/ते."} />
                          <option value={language === "English" ? "The poem says in the move in marathi" : "कविता तालासुरात साभिनय म्हणतो/ते."} />
                          <option value={language === "English" ? " Listens carefully to anything" : "कोणतीही गोष्ट लक्षपूर्वक ऐकतो/ते."} />
                          <option value={language === "English" ? "Do homework and study on time " : "गृहपाठ व स्वाध्याय वेळेवर करतो/ते."} />
                          <option value={language === "English" ? "Writes essays on given topics in marathi" : "दिलेल्या विषयांवर निबंध लिहितो/ते."} />
                          <option value={language === "English" ? "Speaks to the point on given topics in marathi" : "दिलेल्या विषयांवर मुद्देसूद बोलतो/ते."} />
                          <option value={language === "English" ? "Performs revelation, mute reading within the given time" : "दिलेल्या वेळेत प्रकटवाचन , मुकवाचन करतो/ते."} />
                          <option value={language === "English" ? "Uses standard language in daily practice" : "दैनंदिन व्यवहारात प्रमाणभाषेचा वापर करतो/ते."} />
                          <option value={language === "English" ? "Acts according to situation and person" : "नाट्याभिनय प्रसंगानुरूप व व्यक्तिनुरूप करतो/ते."} />
                          <option value={language === "English" ? "Dramatic dialogue is personified and personified in marathi" : "नाट्यातील संवाद साभिनय व व्यक्तिनुरूप करतो/ते."} />
                          <option value={language === "English" ? "Essay writing presents ideas in your own language in marathi" : "निबंध लेखनात आपल्या भाषेत विचार मांडतो/ते."} />
                          <option value={language === "English" ? "Follows rules, instructions, discipline" : "नियम, सुचना ,शिस्त यांचे पालन करतो/ते."} />
                          <option value={language === "English" ? "Asks questions from the text" : "पाठातील शंका विचारतो/ते."} />
                          <option value={language === "English" ? "Communicates effectively in marathi" : "प्रभावीपणे प्रकटवाचन करतो/ते."} />
                          <option value={language === "English" ? "Answers the questions correctly in marathi" : "प्रश्नांची अचूक उत्तरे  देतो/ते."} />
                          <option value={language === "English" ? "Tells a parable in marathi" : "बोधकथा सांगतो/ते."} />
                          <option value={language === "English" ? "Pronounces words clearly while speaking in marathi" : "बोलताना शब्दांचा स्पष्ट उच्चार करतो/ते."} />
                          <option value={language === "English" ? "Knows the difference between colloquial and standard language" : "बोलीभाषा व प्रमाणभाषा यातील फरक जाणतो/ते."} />
                          <option value={language === "English" ? "Listens intently to speech, conversation, communication, discussion" : "भाषण, संभाषण ,संवाद ,चर्चा एकाग्रतेने ऐकतो/ते."} />
                          <option value={language === "English" ? "Notices the beauty of language" : "भाषेतील सौंदर्य लक्षात घेतो/ते."} />
                          <option value={language === "English" ? "Reads the text with understanding in marathi" : "मजकुराचे वाचन समजपूर्वक करतो/ते."} />
                          <option value={language === "English" ? "Reads the text and answers the questions correctly in marathi" : "मजकूर वाचून प्रश्नांची योग्य उत्तरे देतो/ते."} />
                          <option value={language === "English" ? "Reads the text and answers the questions correctly in marathi" : "मुद्देसूद लेखन करतो/ते."} />
                          <option value={language === "English" ? "Reads at appropriate pace and progression in marathi" : "योग्य गतीने व आरोह अवरोहाने वाचन करतो/ते."} />
                          <option value={language === "English" ? "Reads with attention, concentration and comprehension" : "लक्षपूर्वक , एकाग्रतेने व समजपूर्वक मुकवाचन करतो/ते."} />
                          <option value={language === "English" ? "Follows the rules of writing in marathi" : "लेखनाचे नियम पाळतो/ते."} />
                          <option value={language === "English" ? "Follows the rules of writing in marathi" : "लेखनात विरामचिन्हाचा योग्य वापर करतो/ते."} />
                          <option value={language === "English" ? "Uses proverbs and sayings in practice, giving meaning in sentences in marathi" : "वाक्यप्रचार व म्हणीचा व्यवहारात, अर्थ सांगून वाक्यात उपयोग करतो/ते."} />
                          <option value={language === "English" ? "Understands new words in different dialects" : "विविध बोलीभाषेतील नवीन शब्द समजून घेतो/ते."} />
                          <option value={language === "English" ? "Participates in discussions on various topics" : "विविध विषयावरील चर्चेत भाग घेतो/ते."} />
                          <option value={language === "English" ? "Uses grammatically correct language in marathi" : "व्याकरणानुसार भाषेचा वापर करतो/ते."} />
                          <option value={language === "English" ? "Uses phrases, proverbs, slogans etc. in writing in marathi" : "वाक्यप्रचार, म्हणी, बोधवाक्ये इ चा लेखनात वापर करतो/ते."} />
                          <option value={language === "English" ? "Corrects spelling in marathi" : "शुद्धलेखन अचूक करतो/ते."} />
                          <option value={language === "English" ? "Asks himself/herself questions" : "स्वत:हून प्रश्न विचारतो/ते."} />
                          <option value={language === "English" ? "Self study" : "स्वयंअध्ययन करतो/ते."} />
                          <option value={language === "English" ? "Swadhyaya solves it correctly" : "स्वाध्याय अचूक सोडवितो/ते."} />
                          <option value={language === "English" ? "The handwriting is beautiful and meandering in marathi" : "हस्ताक्षर सुंदर व वळणदार आहे."} />

                          <option value={language === "English" ? " " : " "} />
                          <option value={language === "English" ? "Maths" : "गणित"} />

                          <option value={language === "English" ? "Uses various camouflage to solve the example" : "उदाहरण सोडविण्यासाठी विविध क्लृप्त्याचा वापर करतो/ते."} />
                          <option value={language === "English" ? "Solve examples quickly" : "उदाहरणे गतीने सोडवितो/ते."} />
                          <option value={language === "English" ? "Solve the example by sorting" : "क्रमबद्ध मांडणी करून उदाहरण सोडवितो/ते."} />
                          <option value={language === "English" ? "Understands mathematical formulas" : "गणितातील सूत्रे समजून घेतो/ते."} />
                          <option value={language === "English" ? "Solve mathematical puzzles" : "गणितीय कोडी सोडवितो/ते."} />
                          <option value={language === "English" ? "Recognizes mathematical symbols" : "गणितीय चिन्हे ओळखतो/ते."} />
                          <option value={language === "English" ? "Creates a distance by multiplication" : "गुणाकाराने पाढे तयार करतो/ते."} />
                          <option value={language === "English" ? "Solve the example by using the symbol correctly in the example" : "चिन्हाचा उदाहरणात योग्य वापर करून उदाहरण सोडवितो/ते."} />
                          <option value={language === "English" ? "Gives an accurate answer to an oral example" : "तोंडी उदाहरणाचे अचूक उत्तर देतो/ते."} />
                          <option value={language === "English" ? "Gets information about a great mathematician" : "थोर गणिततज्ञाविषयी माहिती मिळवितो/ते."} />
                          <option value={language === "English" ? "Draws graphs from the given information" : "दिलेल्या माहितीवरून आलेख काढतो/ते."} />
                          <option value={language === "English" ? "Uses mathematics in daily life and practice" : "दैनंदिन जीवनात व व्यवहारात गणिताचा वापर करतो/ते."} />
                          <option value={language === "English" ? "Converts to the right dimension when solving a dimension example" : "परिमाणाचे उदाहरण सोडविताना योग्य परिमाणात रूपांतर करतो/ते."} />
                          <option value={language === "English" ? "He reads away" : "पाढे पाठांतर करतो/ते."} />
                          <option value={language === "English" ? "Understands addition, subtraction, multiplication, division verbs" : "बेरीज , वजाबाकी ,गुणकार , भागाकार क्रिया समजून घेतो/ते."} />
                          <option value={language === "English" ? "Draws the perimeter of a geometric figure" : "भौमितिक आकृत्याची परिमिती काढतो/ते."} />
                          <option value={language === "English" ? "Draws the area of a geometric figure accurately" : "भौमितिक आकृत्याचे क्षेत्रफळ अचूक काढतो/ते."} />
                          <option value={language === "English" ? "Explains the properties of a geometric figure" : "भौमितिक आकृत्याचे गुणधर्म सांगतो/ते."} />
                          <option value={language === "English" ? "Recognizes small to large numbers" : "लहान मोठ्या संख्या ओळखतो/ते."} />
                          <option value={language === "English" ? "Specifies the surface and volume of different sizes" : "विविध आकाराचे पृष्ठफळ व घनफळ सांगतो/ते."} />
                          <option value={language === "English" ? "Understands different dimensions" : "विविध परिमाणे समजून घेतो/ते."} />
                          <option value={language === "English" ? "Draws various geometric structures proportionally" : "विविध भौमितिक रचना प्रमाणबद्ध काढतो/ते."} />
                          <option value={language === "English" ? "Understands various geometric expressions" : "विविध भौमितिक संबोध समजून घेतो/ते."} />
                          <option value={language === "English" ? "Tells the units of different zodiac signs" : "विविध राशिची एकके सांगतो/ते."} />
                          <option value={language === "English" ? "Explains the meaning and information of various terms accurately" : "विविध संज्ञाचे अर्थ व माहिती अचूक सांगतो/ते."} />
                          <option value={language === "English" ? "The number is written in alphabetical order" : "संख्या अक्षरी लिहितो/ते."} />
                          <option value={language === "English" ? "The number writes in ascending and descending order" : "संख्या चढत्या उतरत्या क्रमाने लिहितो/ते."} />
                          <option value={language === "English" ? "Reads the number" : "संख्या वाचन करतो/ते."} />
                          <option value={language === "English" ? "Writes the number as an extension" : "संख्या विस्तारीत रूपात लिहितो/ते."} />
                          <option value={language === "English" ? "Recognizes the order of the numbers" : "संख्याचा क्रम ओळखतो/ते."} />
                          <option value={language === "English" ? "Tells and reads the type of number" : "संख्याचे प्रकार सांगतो व वाचन करतो/ते."} />
                          <option value={language === "English" ? "Specifies the local value of the digit in the number" : "संख्यातील  अंकाची स्थानिक किमत अचूक सांगतो/ते."} />
                          <option value={language === "English" ? "Tells the value of the number on the number line" : "संख्यारेषेवरील अंकाची किंमत सांगतो/ते."} />
                          <option value={language === "English" ? "Performs basic operations on numbers" : "संख्यावरील मूलभूत क्रिया बरोबर करतो/ते."} />
                          <option value={language === "English" ? "Solve simple literal examples based on equations" : "समीकरणावर आधारीत सोपी शाब्दिक उदाहरणे सोडवितो/ते."} />
                          <option value={language === "English" ? "Interprets statistical information" : "सांख्यकीय माहितीचे अर्थविवेचन करतो/ते."} />
                          <option value={language === "English" ? "Creates tables and tables" : "सारणी व तक्ता तयार करतो/ते."} />
                          <option value={language === "English" ? "Solve the example by filling in the values in the formula" : "सूत्रात किंमती  भरून उदाहरण सोडवितो/ते."} />

                          <option value={language === "English" ? " " : " "} />
                          <option value={language === "English" ? "English" : "इंग्रजी"} />

                          <option value={language === "English" ? "Copies the Letters and words correctly in english" : "अक्षरे आणि शब्द अचूकपणे कॉपी करतो/ते."} />
                          <option value={language === "English" ? "Enjoys the rhythm and understand in english" : "लय एन्जॉय करतो आणि समजतो/ते."} />
                          <option value={language === "English" ? "Gives responses in various contexts in english" : "विविध संदर्भात प्रतिसाद देतो/ते."} />
                          <option value={language === "English" ? "Identifies commonly used words in english" : "सामान्यतः वापरलेले शब्द ओळखतो/ते."} />
                          <option value={language === "English" ? "Listens with concentration in english" : "एकाग्रतेने ऐकतो/ते."} />
                          <option value={language === "English" ? "Reads aloud from textbook in english" : "पाठ्यपुस्तकातून मोठ्याने वाचतो/ते."} />
                          <option value={language === "English" ? "Reads and act accordingly" : "वाचतो आणि त्यानुसार वागतो/ते."} />
                          <option value={language === "English" ? "Reads silently by understanding" : "समजून घेऊन शांतपणे वाचतो/ते."} />
                          <option value={language === "English" ? "Reads the part in dialougs by understanding in english" : "संवादातील भाग समजून घेऊन वाचतो/ते."} />
                          <option value={language === "English" ? "Reads the poem in rhythm in english" : "लयीत कविता वाचतो/ते."} />
                          <option value={language === "English" ? "Rearranges the story events in english" : "कथेतील घटनांची पुनर्रचना करतो/ते."} />
                          <option value={language === "English" ? "Recites with enjoyment poems and songs in english" : "आनंद देणाऱ्या कविता आणि गाण्यांसह पाठ करतो/ते."} />
                          <option value={language === "English" ? "Solves the Activity by confidence in english" : "आत्मविश्वासाने क्रियाकलाप सोडवतो/ते."} />
                          <option value={language === "English" ? "Takes the dictation of familiar words in english" : "परिचित शब्दांचे श्रुतलेखन घेतो/ते."} />
                          <option value={language === "English" ? "Writes correctly on one line in english" : "एका ओळीवर बरोबर लिहितो/ते."} />
                          <option value={language === "English" ? "Writes the answer of questions in english" : "प्रश्नांची उत्तरे लिहितो/ते."} />

                          <option value={language === "English" ? " " : " "} />
                          <option value={language === "English" ? "Science" : "विज्ञान"} />

                          <option value={language === "English" ? "Raises awareness about superstitions and misconceptions" : "अंधश्रद्धा व गैरसमजुतीबाबत जनजागृती करतो/ते."} />
                          <option value={language === "English" ? "Understands spatial phenomena" : "."} />
                          <option value={language === "English" ? "" : "अवकाशीय घटना समजून घेतो/ते."} />
                          <option value={language === "English" ? "Explains the advantages of modern technology and equipment" : "आधुनिक तंत्रज्ञान व उपकरणे यांचे फायदे स्पष्ट करतो/ते."} />
                          <option value={language === "English" ? "Recognizes magnetic and non-magnetic substances" : "चुंबकीय व अचुंबकीय पदार्थ ओळखतो/ते."} />
                          <option value={language === "English" ? "Organic - classifies inorganic components" : "जैविक - अजैविक घटकाचे वर्गीकरण करतो/ते."} />
                          <option value={language === "English" ? "Makes sustainable items from waste / it" : "टाकाऊ पासून टिकाऊ वस्तु तयार करतो/ते."} />
                          <option value={language === "English" ? "Metals and non-metals" : "धातू व अधातू सांगतो/ते."} />
                          <option value={language === "English" ? "Takes special care when handling dangerous objects" : "धोकादायक वस्तु हाताळताना विशेष कळाजी घेतो/ते."} />
                          <option value={language === "English" ? "Detects natural disasters" : "नैसर्गिक आपत्तीची माहिती करून घेतो/ते."} />
                          <option value={language === "English" ? "Notes causality in natural phenomena" : "नैसर्गिक घटनामधील कार्यकारणभाव लक्षात घेतो/ते."} />
                          <option value={language === "English" ? "Explains the importance of natural resources" : "नैसर्गिक साधनसंपत्तीचे महत्त्व सांगतो/ते."} />
                          <option value={language === "English" ? "Tells the term of the substance" : "पदार्थ्याच्या संज्ञा सांगतो/ते."} />
                          <option value={language === "English" ? "Keeps abreast of developments in the area" : "परिसरात घडणार्‍या घटनांची माहिती घेतो/ते."} />
                          <option value={language === "English" ? "Understands the solution for water conservation" : "पाणी संवर्धनासाठी  उपाय समजून घेतो/ते."} />
                          <option value={language === "English" ? "Knows the importance of water" : "पाण्याचे महत्त्व जाणतो/ते."} />
                          <option value={language === "English" ? "Understands the meaning of technical terms" : "पारीभाषिक शब्दांचे अर्थ समजून घेतो/ते."} />
                          <option value={language === "English" ? "Provides first aid information" : "प्रथमोपचाराची माहिती सांगतो/ते."} />
                          <option value={language === "English" ? "Tells measures to prevent pollution" : "प्रदूषण टाळण्याचे उपाय सांगतो/ते."} />
                          <option value={language === "English" ? "Explains the side effects of pollution" : "प्रदूषणाचे दुष्परिणाम सांगतो/ते."} />
                          <option value={language === "English" ? "Explains the type of pollution" : "प्रदूषणाचे प्रकार सांगतो/ते."} />
                          <option value={language === "English" ? "Draws the exact figure of the experiment" : "प्रयोगाची अचूक आकृती काढतो/ते."} />
                          <option value={language === "English" ? "Handles the experiment material carefully" : "प्रयोगाचे साहित्य काळजीपूर्वक हाताळतो/ते."} />
                          <option value={language === "English" ? "Lay out the experiment materials" : "प्रयोगाच्या साहित्यांची मांडणी करतो/ते."} />
                          <option value={language === "English" ? "Tells the type of change" : "बदलाचे प्रकार सांगतो/ते."} />
                          <option value={language === "English" ? "Classifies change into different types" : "बदलाचे वेगवेगळ्या प्रकारात वर्गीकरण करतो/ते."} />
                          <option value={language === "English" ? "Uses physical money in daily life" : "भौतिक राशीचा दैनंदिन जीवनात वापर करतो/ते."} />
                          <option value={language === "English" ? "Explains the role of science in human life" : "मानवी जीवनात विज्ञानाची भूमिका स्पष्ट करतो/ते."} />
                          <option value={language === "English" ? "Experiments to separate the substances in the mixture" : "मिश्रणातील पदार्थ वेगळे करण्याचे प्रयोग करतो/ते."} />
                          <option value={language === "English" ? "Detects diseases and describes symptoms" : "रोगांची माहिती घेतो व लक्षणे सांगतो/ते."} />
                          <option value={language === "English" ? "Knows the remedies for the disease" : "रोगावरील उपायांची माहिती करून घेतो/ते."} />
                          <option value={language === "English" ? "Explains the interdependence of plants, animals and humans" : "वनस्पती ,प्राणी व मानव यांचे परस्परावलंबन सांगतो/ते."} />
                          <option value={language === "English" ? "Knows the importance of science and technology" : "विज्ञान व तंत्रज्ञानाचे महत्व जाणतो/ते."} />
                          <option value={language === "English" ? "Tells you the benefits of science" : "विज्ञानाचा आपणास होणारा फायदा सांगतो/ते."} />
                          <option value={language === "English" ? "Explains the properties of different substances" : "विविध पदार्थांचे गुणधर्म सांगतो/ते."} />
                          <option value={language === "English" ? "Provides information on different types of forces" : "विविध प्रकारच्या बलांची माहिती सांगतो/ते."} />
                          <option value={language === "English" ? "Cultivates a scientific approach" : "वैज्ञानिक दृष्टीकोण जोपासतो/ते."} />
                          <option value={language === "English" ? "Scientists tell the unit of the zodiac" : "वैज्ञानिक राशीची एकके सांगतो/ते."} />
                          <option value={language === "English" ? "Explains the progress made by scientific research and technology" : "वैज्ञानिक शोध व तंत्रज्ञानामुळे झालेली प्रगती सांगतो/ते."} />
                          <option value={language === "English" ? "Classifies animate and inanimate" : "सजीव व निर्जीव वर्गीकरण करतो/ते."} />
                          <option value={language === "English" ? "Explains the importance of a balanced diet" : "समतोल आहाराचे महत्व सांगतो/ते."} />

                          <option value={language === "English" ? " " : " "} />
                          <option value={language === "English" ? "Hindi" : "हिंदी"} />

                          <option value={language === "English" ? "Communicates with teachers in Hindi" : "अध्यापको के साथ हिंदी मे बातचीत करता/ती है|"} />
                          <option value={language === "English" ? "Expresses his/her thoughts in Hindi" : "अपने विचार हिंदी मे व्यक्त करता/ती है|"} />
                          <option value={language === "English" ? "Memorizes songs and poems in hindi" : "गीत और कविताए कंठस्थ करता/ती है|"} />
                          <option value={language === "English" ? "Says words after seeing thoughts in hindi" : "चिंत्रो को देखकर शब्द कहता/ती है|"} />
                          <option value={language === "English" ? "Writes on his/her own inspiration on a given topic in hindi" : "दिए गए विषयपर स्वयंप्रेरणासे लेखन करता/ती है|"} />
                          <option value={language === "English" ? "Uses Hindi language in daily life in hindi" : "दैनंदिन जीवन में हिंदी भाषा का प्रयोग करता/ती है|"} />
                          <option value={language === "English" ? "Writes an essay on a familiar topic in hindi" : "परिचित विषयपर निबंध लेखन करता/ती है|"} />
                          <option value={language === "English" ? "Understands the meaning of the passage in hindi" : "पाठयांश का आशय समझता/ती है|"} />
                          <option value={language === "English" ? "Reads text with understanding in hindi" : "पाठयांश को समझतापूर्वक पढता/ती है|"} />
                          <option value={language === "English" ? "Reads extracurricular books and written materials in hindi" : "पाठ्येत्तर पुस्तक एवं लिखित सामग्री पढता/ती है|"} />
                          <option value={language === "English" ? "Understands the difference between the sounds of mother tongue and Hindi" : "मातृभाषा और हिंदी के ध्वनीयों का भेद समझता/ती है|"} />
                          <option value={language === "English" ? "Conversates with friends in Hindi" : " मित्रो के साथ हिंदी मे वार्तालाप करता/ती है|"} />
                          <option value={language === "English" ? "Speaks fluently and intelligibly in hindi" : "मुकवाचन चढाव -उतार और समझतापूर्वक करता/ती है|"} />
                          <option value={language === "English" ? "Speaks silently in hindi" : "मौनवाचन समझतापूर्वक करता/ती है|"} />
                          <option value={language === "English" ? "Listens to poetry with interest and pleasure in hindi" : "रुचि एवं आनंदपूर्वक कविता सुनता/ती है|"} />
                          <option value={language === "English" ? "Understands grammar clearly in writing in hindi" : "लेखन में व्याकरण को समझपूर्वक जान लेता/ती है|"} />
                          <option value={language === "English" ? "Varnoka pronounces correctly in hindi" : "वर्णोका योग्य उच्चारण करता/ती है|"} />
                          <option value={language === "English" ? "Writes correctly in hindi" : "शुद्धलेखन समझतापूर्वक करता/ती है|"} />
                          <option value={language === "English" ? "Reads newspaper every day in hindi" : "समाचारपत्र दररोज पढता/ती है|"} />
                          <option value={language === "English" ? "Understands general information in hindi" : "सामान्य सूचनाओ को समझता/ती है|"} />
                          <option value={language === "English" ? "Understands and repeats what he/she hears in hindi" : "सुनी हुई बाते समझ लेता/ती है और दोहरता/ती है|"} />
                          <option value={language === "English" ? "Writes clearly and accurately in hindi" : "सुसष्ट और शुद्ध लेखन करता/ती है|"} />
                          <option value={language === "English" ? "Pronounces clearly and correctly in hindi" : "स्पष्ट तथा उचित उच्चारण करता/ती है|"} />
                          <option value={language === "English" ? "Pronounces vowels and consonants carefully in hindi" : "स्वर तथा व्यंजन के उच्चारण ध्यानपूर्वक करता/ती है|"} />
                          <option value={language === "English" ? "Understands Hindi functional grammar clearly in hindi" : "हिंदी कार्यात्मक व्याकरण को समझपूर्वक जान लेता/ती है|"} />
                          <option value={language === "English" ? "Views Hindi as the national language" : "हिंदी को राष्ट्रभाषा के रूप मे देखता/ती है|"} />
                          <option value={language === "English" ? "Is interested in Hindi language" : "हिंदी भाषा के प्रति रुचि रखता/ती है|"} />
                          <option value={language === "English" ? "Narrates story in hindi" : "हिंदी में कहानी सुनाता/ती है|"} />
                          <option value={language === "English" ? "Translates Hindi words and sentences into mother tongue" : "हिंदी शब्द तथा वाक्यों का मातृभाषा में अनुवाद करता/ती है|"} />

                          <option value={language === "English" ? " " : " "} />
                          <option value={language === "English" ? "Karyanubhav" : "कार्यानुभव"} />

                          <option value={language === "English" ? "Acts with confidence" : "आत्मविश्वासाने कृती करतो/ते."} />
                          <option value={language === "English" ? "Uses modern tools" : "आधुनिक साधनाचा वापर करतो/ते."} />
                          <option value={language === "English" ? "Creates innovation in activities and actions" : "उपक्रमात व कृतीत नाविन्य निर्माण करतो/ते."} />
                          <option value={language === "English" ? "Understands the importance of work education" : "कार्यशिक्षणाचे महत्व समजून घेतो/ते."} />
                          <option value={language === "English" ? "Uses new techniques and technology while performing activities" : "कृती करताना नवीन तंत्राचा व तंत्रज्ञानाचा वापर करतो/ते."} />
                          <option value={language === "English" ? "Participates in discussion" : "चर्चेत सहभागी होतो/ते."} />
                          <option value={language === "English" ? "Uses knowledge for livelihood" : "ज्ञानाचा उपयोग उपजीवेकेसाठी करतो/ते."} />
                          <option value={language === "English" ? "Exhibits the finished product" : "तयार केलेल्या वस्तूचे प्रदर्शन मांडतो/ते."} />
                          <option value={language === "English" ? "Completes the given demonstration" : "दिलेले प्रात्यक्षिक पूर्ण करतो/ते."} />
                          <option value={language === "English" ? "Collects relief during natural calamities" : "नैसर्गिक आपत्तीच्या वेळी मदत गोळा करतो/ते."} />
                          <option value={language === "English" ? "Keeps premises clean" : "परिसर स्वच्छ ठेवतो/ते."} />
                          <option value={language === "English" ? "Does project presentation well" : "प्रकल्पाचे सादरीकरण चांगले करतो/ते."} />
                          <option value={language === "English" ? "Cultivates various values" : "विविध मुल्याची जोपासना करतो/ते."} />
                          <option value={language === "English" ? "Takes teacher's co-operation Behaves in an understanding manner" : "शिक्षकाचे सहकार्य घेतो  समजशील वर्तन करतो/ते."} />
                          <option value={language === "English" ? "Finds solutions to problem solving" : "समस्या निराकरणासाठी उपाय शोधतो/ते."} />
                          <option value={language === "English" ? "Strives for the development of society and nation" : "समाजाच्या व राष्ट्राच्या विकासासाठी झटतो/ते."} />

                          <option value={language === "English" ? " " : " "} />
                          <option value={language === "English" ? "P.T." : "शारीरिक शिक्षण"} />

                          <option value={language === "English" ? "Follows healthy habits" : "आरोग्यदायी सवयींचे पालन करतो/ते."} />
                          <option value={language === "English" ? "Explains the importance of exercise for health" : "आरोग्यासाठी व्यायामांचे महत्व सांगतो/ते."} />
                          <option value={language === "English" ? "Behaves with others in a sportsmanlike manner" : "इतरांशी खिलाडू वृत्तीने वागतो/ते."} />
                          <option value={language === "English" ? "Plans the field keeping in mind the measurements of the playing field" : "क्रिडागंणाचे मोजमापे लक्षात घेऊन मैदानाची आखणी करतो/ते."} />
                          <option value={language === "English" ? "Acquires various sports skills" : "खेळांची विविध कौशल्ये आत्मसात करतो/ते."} />
                          <option value={language === "English" ? "Cultivates patriotic values ​​through sports" : "खेळातून राष्ट्रभक्ती मूल्यांची जोपासना करतो/ते."} />
                          <option value={language === "English" ? "Leads the group" : "गटाचे नेतृत्व करतो/ते."} />
                          <option value={language === "English" ? "Guides group mates" : "गटातील सहकर्‍यांना मार्गदर्शन करतो/ते."} />
                          <option value={language === "English" ? "Joyfully accepts victory and defeat" : "जय पराजय आनंदाने स्वीकारतो/ते."} />
                          <option value={language === "English" ? "Performs rhythmic movements" : "तालबद्ध  हालचाली करतो/ते."} />
                          <option value={language === "English" ? "Participates in daily school sports" : "दैनंदिन शालेय खेळात भाग घेतो/ते."} />
                          <option value={language === "English" ? "Respects the decisions of the umpires" : "पंचांच्या निर्णयांचे आदर करतो/ते."} />
                          <option value={language === "English" ? "Participates in recreational sports" : "मनोरंजक खेळात सहभागी होतो/ते."} />
                          <option value={language === "English" ? "Cleans the grounds" : "मैदानाची स्वच्छता करतो/ते."} />
                          <option value={language === "English" ? "Likes to do various tasks on the field" : "मैदानावरील विविध कामे आवडीने करतो/ते."} />
                          <option value={language === "English" ? "Performs various types of yoga and exercises" : "विविध योगासने व कवायत प्रकार सादर करतो/ते."} />
                          <option value={language === "English" ? "Gets information about various yogasanas and exercises" : "विविध योगासने व कवायत प्रकाराची माहिती घेतो/ते."} />
                          <option value={language === "English" ? "Gets information about various national and international sports" : "विविध राष्ट्रीय व आंतरराष्ट्रीय खेळाची माहिती करून घेतो/ते."} />
                          <option value={language === "English" ? "Does physical labor with pleasure" : "शारीरिक श्रम आनंदाने करतो/ते."} />
                          <option value={language === "English" ? "Follows discipline" : "शिस्तीचे पालन करतो/ते."} />

                          <option value={language === "English" ? " " : " "} />
                          <option value={language === "English" ? "Samajik" : "सामाजिक"} />

                          <option value={language === "English" ? "Tells about the historical place" : "ऐतिहासिक स्थळाची माहिती सांगतो/ते."} />
                          <option value={language === "English" ? "The Constitution and the Pledge says" : "संविधान व प्रतिज्ञा म्हणतो/ते."} />
                          <option value={language === "English" ? "Tells information about social reformer" : "समाजसुधारकाची माहिती सांगतो/ते."} />
                          <option value={language === "English" ? "Explain the importance of the Constitution" : "संविधानाचे महत्व सांगतो/ते."} />
                          <option value={language === "English" ? "Tells about a great leader" : "थोर नेत्याची माहिती सांगतो/ते."} />
                          <option value={language === "English" ? "It tells the AD year of historical events" : "ऐतिहासिक घटनांची इसवी सन सांगतो/ते."} />
                          <option value={language === "English" ? "States the fundamental rights of a citizen" : "नागरिकाचे मूलभूत अधिकार सांगतो/ते."} />


                          {/* Add more predefined options here */}
                        </datalist>
                      </td>

                      <td>
                        <input
                          list="Interests and hobbies"
                          value={interestsAndHobbies[student.srNo] || ""}
                          onChange={(e) => handleInterestsAndHobbiesChange(student.srNo, e.target.value)}
                          placeholder="Type or select an option"
                        />
                        <datalist id="Interests and hobbies">
                          <option value={language === "English" ? "Reads books, novels" : "पुस्तके, कादंबरी वाचतो/ते"} />
                          <option value={language === "English" ? "Playing cricket" : "क्रिकेट खेळणे."} />
                          <option value={language === "English" ? "Swimming" : "पोहणे."} />
                          <option value={language === "English" ? "Recognize the letters in Marathi " : "भौमितिक आकृत्याची परिमिती काढतो/ते."} />
                          <option value={language === "English" ? "Read and write simple words  " : " भौमितिक आकृत्याचे गुणधर्म सांगतो/ते."} />
                          <option value={language === "English" ? "Writes essays, stories, or poetry " : " निबंध, कथा किंवा कविता लिहितो/ते."} />
                          <option value={language === "English" ? "Participate in classroom activities " : " विविध आकाराचे पृष्ठफळ व घनफळ सांगतो/ते."} />
                          <option value={language === "English" ? "Recognize numbers up to 100 " : "विविध परिमाणे समजून घेतो/ते."} />
                          <option value={language === "English" ? "Likes cycling, cricket, running, swimming " : " सायकलिंग, क्रिकेट, धावणे, पोहणे आवडते."} />
                          <option value={language === "English" ? "Likes Drawing, painting " : "रेखाचित्र, चित्रकला आवडते."} />
                          <option value={language === "English" ? "Likes to speaking and debate competitions " : " भाषण आणि वादविवाद स्पर्धा करायला आवडते."} />
                          <option value={language === "English" ? "Perform simple addition and subtraction " : "संख्यारेषेवरील अंकाची किंमत सांगतो/ते."} />
                          <option value={language === "English" ? "Likes traveling, birdwatching" : "प्रवास करणे, पक्षी निरीक्षण करणे आवडते."} />
                          <option value={language === "English" ? "Writes stories, poems, articles, etc" : "गोष्टी,कविता ,लेख वर्णन इ स्वरूपाने लेखन करतो/ते."} />
                          <option value={language === "English" ? "Reads newspapers, magazines etc" : "वर्तमानपत्रे , मासिके इ वाचतो/ते."} />
                          <option value={language === "English" ? "Tells information to others" : "इतरांना माहिती सांगतो/ते."} />
                          <option value={language === "English" ? "Loves reading" : "वाचनाची आवड आहे."} />
                          <option value={language === "English" ? "Maintains an archive" : "संग्रहवृत्ती जोपासतो/ते."} />
                          <option value={language === "English" ? "Collects ideas" : "सुविचारांचा संग्रह करतो/ते."} />
                          <option value={language === "English" ? "Reads english daily newspaper" : "इंग्रजी दैनिक वर्तमानपत्र वाचतो/ते."} />
                          <option value={language === "English" ? "Reads silently by understanding" : "."} />
                          <option value={language === "English" ? "Takes part in language game" : "भाषेच्या खेळात भाग घेतो/ते."} />
                          <option value={language === "English" ? "Inquires about modern inventions" : "आधुनिक शोधाची माहिती घेतो/ते."} />
                          <option value={language === "English" ? "Crops, weather, land etc. Collects information about" : "पिके, हवामान, जमीन इ. विषयी माहिती संकलित करतो/ते."} />
                          <option value={language === "English" ? "Tells funny jokes in science" : "विज्ञानातील गंमतीजमती सांगतो/ते."} />
                          <option value={language === "English" ? "Remains active for tree conservation" : "वृक्ष संवर्धंनासाठी कार्यशील राहतो/ते."} />
                          <option value={language === "English" ? "Reads books by scientists and researchers" : "वैज्ञानिक व संशोधक यांची पुस्तके वाचतो/ते."} />
                          <option value={language === "English" ? "Scientists make simple replicas" : "वैज्ञानिक सोप्या प्रतिकृती तयार करतो/ते."} />
                          <option value={language === "English" ? "dramatizes, participates in conversation" : "नाटयीकरण , वार्तालाप में भाग लेता/ती है|"} />
                          <option value={language === "English" ? "Actions, activities are done with passion" : "कृती,उपक्रम आवडीने करतो/ते."} />
                          <option value={language === "English" ? "Completes the project through his/her own participation" : "प्रकल्प स्वत:च्या सहभागातून पूर्ण करतो/ते."} />
                          <option value={language === "English" ? "Seeks to acquire professional skills" : "व्यावसायिक कौशल्ये प्राप्त करण्याचा प्रयत्न करतो/ते."} />
                          <option value={language === "English" ? "Acquires skill in using materials, tools" : "साहित्य,साधने वापराबाबत कौशल्य प्राप्त करतो/ते."} />
                          <option value={language === "English" ? "Exercises regularly for health" : "आरोग्यासाठी नियमित व्यायाम करतो/ते."} />
                          <option value={language === "English" ? "Interested in art" : "कलेविषयी रुची ठेवतो/ते."} />
                          <option value={language === "English" ? "Enjoys sports and physical activity" : "खेळ व शारिरीक हालचालीतून आनंद मिळवतो/ते."} />
                          <option value={language === "English" ? "Participates spontaneously in sports" : "खेळात उस्फूर्तपणे भाग घेतो/ते."} />
                          <option value={language === "English" ? "Participates in various sports and competitions" : "विविध खेळात व स्पर्धेत भाग घेतो/ते."} />
                          <option value={language === "English" ? "Get to know the best players" : "श्रेष्ठ खेळाडूंची माहिती करून घेतो/ते."} />
                          <option value={language === "English" ? "Likes to do dance" : "नृत्य करायला आवडते."} />
                          <option value={language === "English" ? "Watching television" : "दूरदर्शन पाहणे."} />
                          <option value={language === "English" ? "Kite flying" : "पतंग उडवणे."} />
                          <option value={language === "English" ? "Coin collecting" : "नाणे गोळा करणे."} />
                          <option value={language === "English" ? "Stamp collecting" : "मुद्रांक गोळा करणे."} />


                          {/* Add more predefined options here */}
                        </datalist>
                      </td>

                      <td>
                        <input
                          list="Necessary corrections"
                          value={necessaryCorrections[student.srNo] || ""}
                          onChange={(e) => handleNecessaryCorrectionsChange(student.srNo, e.target.value)}
                          placeholder="Type or select an option"
                        />
                        <datalist id="Necessary corrections">
                          <option value={language === "English" ? "Write more neatly and legibly" : "अधिक व्यवस्थित आणि सुवाच्यपणे लिहिण्याची गरज आहे"} />
                          <option value={language === "English" ? "Revise the chapter, understand the concept " : "संकल्पना अधिक चांगल्या प्रकारे समजून घेण्यासाठी धड्याची पुन्हा उजळणी करावी लागेल."} />
                          <option value={language === "English" ? "Write all steps clearly instead of final answer " : " फक्त अंतिम उत्तराऐवजी सर्व चरण स्पष्टपणे लिहिण्याची गरज आहे."} />
                          <option value={language === "English" ? "Need to maintain silence, pay attention in class " : " शांतता राखणे आणि वर्गात लक्ष देणे आवश्यक आहे."} />
                          <option value={language === "English" ? "Submit assignments on time " : " असाइनमेंट वेळेवर सबमिट करणे आवश्यक आहे."} />
                          <option value={language === "English" ? "Try to answer in more detail with examples " : "उदाहरणांसह अधिक तपशीलवार उत्तर देण्याचा प्रयत्न केला पाहिजे."} />
                          <option value={language === "English" ? "Read the question carefully before answering " : " उत्तर देण्यापूर्वी प्रश्न काळजीपूर्वक वाचा."} />
                          <option value={language === "English" ? "Practice math  problems regularly " : "सारख्या-वेगळ्या गणिताच्या समस्यांचा नियमित सराव करा."} />
                          <option value={language === "English" ? "Practice clear and effective communication " : " स्पष्ट आणि प्रभावी संवादाचा सराव करणे आवश्यक आहे."} />
                          <option value={language === "English" ? "Focus on improving your reading by practicing " : "वाचनाचा सराव करून आपले वाचन सुधारण्यावर भर देणे आवश्यक आहे."} />
                          <option value={language === "English" ? "Wear your uniform properly " : "तुमचा गणवेश व्यवस्थित परिधान करणे आवश्यक आहे."} />
                          <option value={language === "English" ? "Check spelling, punctuation, and grammar mistakes" : "शब्दलेखन, विरामचिन्हे आणि व्याकरणाच्या चुका तपासणे आवश्यक आहे.."} />
                          <option value={language === "English" ? "Revise weak subjects and practice more" : "कमकुवत विषयांची उजळणी करा आणि अधिक सराव करा."} />
                          <option value={language === "English" ? "Neatly label diagrams and use proper margins in notebooks" : "सुबकपणे आकृती लेबल करा आणि नोटबुकमध्ये योग्य मार्जिन वापरा."} />
                          <option value={language === "English" ? "Maintain discipline and avoid unnecessary talking in class" : "शिस्त पाळावी लागेल आणि वर्गात अनावश्यक बोलणे टाळावे लागेल."} />
                          <option value={language === "English" ? "Show respect to teachers, classmates, and school staff" : "शिक्षक, वर्गमित्र आणि शाळेतील कर्मचारी यांचा आदर केला पाहिजे."} />
                          <option value={language === "English" ? "Try science experiments" : "विज्ञानाचे प्रयोग करून पहावे."} />
                          <option value={language === "English" ? "Hindi language should be used" : "हिंदी भाषेचा उपयोग करावे."} />
                          <option value={language === "English" ? "Participate in school activities" : "शालेय उपक्रमात सहभाग घ्यावा."} />
                          <option value={language === "English" ? "Read newspaper regularly" : "वर्तमानपत्राचे नियमित वाचन करावे."} />
                          <option value={language === "English" ? "Computer should be used" : "संगणकाचा वापर करावा."} />
                          <option value={language === "English" ? "There should be active participation in the experiment" : "प्रयोगामध्ये कृतीशील सहभाग असावा."} />
                          <option value={language === "English" ? "Pay attention to mathematics subject" : "गणित विषयाकडे लक्ष द्यावे."} />
                          <option value={language === "English" ? "Translate the words" : "शब्दांचे पाठांतर करावे."} />
                          <option value={language === "English" ? "Vocabulary should be done" : "शब्दसंग्रह करावा."} />
                          <option value={language === "English" ? "Write regular spelling" : "नियमित शुद्धलेखन लिहावे."} />
                          <option value={language === "English" ? "Participate in the sports" : "खेळात सहभागी व्हावे."} />
                          <option value={language === "English" ? "Participate in the process" : "परिपाठात सहभाग घ्यावा  ."} />
                          <option value={language === "English" ? "The handwriting should be improved" : "हस्ताक्षरात सुधारणा करावी."} />
                          <option value={language === "English" ? "Collect and translate English words" : "इंग्रजी शब्दांचे संग्रह व पाठांतर करावे."} />
                          <option value={language === "English" ? "English reading and writing should be practiced" : "इंग्रजी वाचन व लेखन सराव करावा."} />
                          <option value={language === "English" ? "The letter needs to be corrected" : "अक्षर सुधारणे आवश्यक."} />
                          <option value={language === "English" ? "Practice reading jodakshara" : "जोडाक्षर वाचनाचा सराव करावा."} />
                          <option value={language === "English" ? "Reading and writing should be improved" : "वाचन व लेखनात सुधारणा करावी."} />
                          <option value={language === "English" ? "Read a separate, more books" : "अवांतर पुस्तकाचे वाचन करावे."} />
                          <option value={language === "English" ? "Draw the letter curved" : "अक्षर वळणदार काढावे."} />
                          <option value={language === "English" ? "Recite the math formula" : "गणित सूत्राचे पाठांतर करावे."} />
                          <option value={language === "English" ? "Complete homework on time" : "स्वाध्याय वेळेत पूर्ण करावे."} />
                          <option value={language === "English" ? "Pay attention to daily attendance" : "दैनंदीन उपस्थितीकडे लक्ष द्यावे."} />
                          <option value={language === "English" ? "The arrangement in the math should be correct" : "गणितातील मांडणी योग्य करावे."} />


                          {/* Add more predefined options here */}
                        </datalist>
                      </td>








                    </tr>
                  ))}
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
      </div>





    </div>
  );
};

export default ResultEntry;



