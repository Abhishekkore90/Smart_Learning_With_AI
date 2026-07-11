import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import "../result/result.css";
import { Link } from 'react-router-dom';
// import Sidebar from '../../components/Sidebar';

  
const Failed = () => {
    const [academicYear, setAcademicYear] = useState('');
    const [classValue, setClassValue] = useState('');
    const [selectedExamName, setSelectedExamName] = useState('');
    const [studentData, setStudentData] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [marksData, setMarksData] = useState({});
    const [classes, setClasses] = useState([]);
    const [selectedStudentResults, setSelectedStudentResults] = useState(null);
    const [division, setDivision] = useState("");
    const [divisions, setDivisions] = useState(["A", "B", "C", "D"]);
    const [showModal, setShowModal] = useState(false);
    const [schoolName, setSchoolName] = useState('');
    const [schoolLogo, setSchoolLogo] = useState('');
  
    const udiseNumber = localStorage.getItem("udiseNumber");
    const examNames = ['First Semester', 'Second Semester'];
    const examNameTranslations = {
      "First Semester": "प्रथम सत्र",
      "Second Semester": "द्वितीय सत्र",
    };
const [totalMarks, setTotalMarks] = useState(0);
const [percentage, setPercentage] = useState(0);
  
    const [language, setLanguage] = useState(localStorage.getItem('language') || 'English');


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
    const fetchSchoolName = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/schoolData.json`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch school name');
        }
        const data = await response.json();
        setSchoolName(data.schoolName || ' ');
        setSchoolLogo(data.schoolLogo || ''); // Add this line
      } catch (error) {
        console.error('Error fetching school name:', error);
      }
    };
    useEffect(() => {
      fetchSchoolName();
      fetchStudentData();
    }, []);
  
    useEffect(() => {
      if (selectedExamName && classValue && academicYear) {
        fetchMarksForSelectedSubject();
      }
    }, [selectedExamName, classValue, academicYear, division]);
  
    const handleAcademicYearChange = (e) => setAcademicYear(e.target.value);

    const fetchDivisionsForClass = (selectedClass) => {
      const divisionsForClass = new Set();
      studentData.forEach((student) => {
        if (student.currentClass === selectedClass && student.division) {
          divisionsForClass.add(student.division);
        }
      });
      if (divisionsForClass.size === 0) {
          setDivisions(["A", "B", "C", "D"]);
        } else {
          setDivisions(Array.from(divisionsForClass));
        }
    };

    const handleClassChange = (e) => {
      const selectedClass = e.target.value;
      setClassValue(selectedClass);
      setDivision(""); // Reset division when class changes
      fetchSubjectsForClass(selectedClass);
      fetchDivisionsForClass(selectedClass);

      if (selectedClass) {
        const filteredStudents = studentData.filter((student) => student.currentClass === selectedClass);
        setSelectedStudents(filteredStudents);
      } else {
        setSelectedStudents([]);
      }
    };

    const handleDivisionChange = (e) => {
      const selectedDivision = e.target.value;
      setDivision(selectedDivision);

      let filtered = studentData.filter((student) => student.currentClass === classValue);
      if (selectedDivision) {
        filtered = filtered.filter((student) => student.division === selectedDivision);
      }
      setSelectedStudents(filtered);
    };

    const handleExamNameChange = (e) => {
      // Prevent changing the selected exam name from "Second Semester"
      if (e.target.value !== "Second Semester") {
        return;
      }
      setSelectedExamName(e.target.value);
    };
    
    const filteredExamNames = examNames.filter((examName) => examName === "Second Semester");
  
    const fetchStudentData = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData.json`
        );
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
  
        const filteredData = Object.keys(data)
          .filter(key => data[key] !== null)
          .map(key => ({ srNo: key, ...data[key] }));
  
              const activeStudents = filteredData.filter(student => student.isActive !== false);

        setStudentData(activeStudents);
        const classSet = new Set();
        activeStudents.forEach((student) => {
          if (student.currentClass) {
            classSet.add(String(student.currentClass));
          }
        });
        setClasses([...classSet]);
      } catch (error) {
        console.error('Error fetching student data:', error);
      }
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
            (student) => student.currentClass === classValue && (division === "" || student.division === division)
          );
          const failedStudents = [];
      
          const marksDataPromises = selectedStudents.map(async (student) => {
            const studentMarks = await fetchMarksData(
              student.srNo,
              academicYear,
              selectedExamName
            );
            const failConditionMet = Object.keys(studentMarks).some(subject => {
              const sankalikTotal = studentMarks[subject]?.Sanklik?.Total || 0;
              const passingMarks = getPassingMarks(student.currentClass); // Determine passing marks for the class
              return sankalikTotal < passingMarks; // Check if the student has failed in any subject
            });
      
            // If the student fails in any subject, add them to the failedStudents array
            if (failConditionMet) {
              failedStudents.push(student);
            }
          });
      
          await Promise.all(marksDataPromises);
      
          setSelectedStudents(failedStudents); // Update with only failed students
        } catch (error) {
          console.error('Error fetching marks data:', error);
        }
      };
      
  
    const fetchMarksData = async (srNo, academicYear, examName) => { 
      const url = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${srNo}/result/${academicYear}/${examName}.json`;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Error fetching data: ${response.statusText}`);
        }
        const data = await response.json();
        return data || {};
      } catch (error) {
        console.error('Error fetching marks data:', error);
        return {};
      }
    };
  
    const [selectedStudentForSr, setSelectedStudentForSr]= useState('')
    const viewResult = async (srNo) => {
    try {
      const student = selectedStudents.find((student) => student.srNo === srNo);
      setSelectedStudentForSr(student)
      if (!student) {
        throw new Error("Student not found");
      }
  
      // Fetch both first and second semester data
      const firstSemesterResponse = await fetch(
        `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${srNo}/result/${academicYear}/First Semester.json`
      );
      const secondSemesterResponse = await fetch(
        `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${srNo}/result/${academicYear}/${selectedExamName}.json`
      );
  
      if (!firstSemesterResponse.ok || !secondSemesterResponse.ok) {
        throw new Error("Network response was not ok");
      }
  
      const firstSemesterData = await firstSemesterResponse.json();
      const secondSemesterData = await secondSemesterResponse.json();
  
  
      const resultsWithTotal = {};
  
      // Combine all subjects from both semesters
      const allSubjects = new Set([
        ...Object.keys(firstSemesterData),
        ...Object.keys(secondSemesterData),
      ]);
  
      allSubjects.forEach((subject) => {
        const firstSemesterGrade = firstSemesterData[subject]?.Akarik?.Total
          ? calculateGrade(
              firstSemesterData[subject].Akarik.Total +
                (firstSemesterData[subject].Sanklik?.Total || 0)
            )
          : " ";
  
        const akarikTotal =
          secondSemesterData[subject]?.Akarik?.Total || 0;
        const sankalikTotal =
          secondSemesterData[subject]?.Sanklik?.Total || 0;
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
  
      // Fetch nondi data for both semesters
      const nondiFirstSemesterResponse = await fetch( 
        `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${srNo}/result/${academicYear}/First Semester/nondi.json`
      );
      
      const nondiSecondSemesterResponse = await fetch(
        `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${srNo}/result/${academicYear}/${selectedExamName}/nondi.json`
      );
      
      if (!nondiFirstSemesterResponse.ok || !nondiSecondSemesterResponse.ok) {
        throw new Error("Failed to fetch nondi data");
      }
  
      const nondiFirstSemesterData = await nondiFirstSemesterResponse.json();
      const nondiSecondSemesterData = await nondiSecondSemesterResponse.json();
  
      // Set state with both semester data
      setSelectedStudentResults({
        studentName: student.stdName,
        results: resultsWithTotal,
        nondi: nondiSecondSemesterData || {},
        firstSemester: nondiFirstSemesterData || {},
        stdMother: student.stdMother,
        stdFather: student.stdFather,
        stdSurname: student.stdSurname,
        dob: student.dob,
        division: student.division,
        motherTounge: student.motherTounge,
        studentId: student.studentId,
        gender: student.gender,
      });
  
      setShowModal(true);
    } catch (error) {
      console.error("Error fetching student results:", error);
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
  
  
    const handleCloseModal = () => setShowModal(false);
   
  
  
    const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
    const [attendance, setAttendance] = useState({
      Present: {},
      Absent: {},
      Leave: {}
    });
    
    
    useEffect(() => {
      const fetchAttendanceData = async () => {
        const srNo = selectedStudentForSr.serialNo;
        const startYear = academicYear.split('-')[0];
        const urlBase = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/Attendance/${srNo}/Presenty/${startYear}`;
    
    
        try {
          const fetchedAttendance = {
            Present: {},
            Absent: {},
            Leave: {}
          };
    
          for (const month of months) {
            const url = `${urlBase}/${month}.json`;
    
            const response = await fetch(url);
            if (response.ok) {
              const data = await response.json();
    
              if (data) {
                let presentCount = 0;
                let absentCount = 0;
                let leaveCount = -1;
    
  
                for (const day in data) {
                  const status = data[day]?.present;
                  
                  if (status === 'present') {
                    presentCount++;
                  } else if (status === 'absent') {
                    absentCount++;
                  } else if (status === null || status === undefined) {
                    // Only count `null` or `undefined` values as "Leave"
                    leaveCount++;
                  }
                }
    
                fetchedAttendance.Present[month] = presentCount; 
                fetchedAttendance.Absent[month] = absentCount;
                fetchedAttendance.Leave[month] = leaveCount;
              } else {
                console.warn(`No data found for ${month}`);
              }
            } else {
              console.error(`Failed to fetch data for ${month}:`, response.statusText);
            }
          }
    
          setAttendance(fetchedAttendance);
        } catch (error) {
          console.error('Error fetching attendance data:', error);
        }
      };
    
      fetchAttendanceData();
    }, [selectedStudentForSr, udiseNumber, academicYear]);
    
  
  
  
  
  
    
    // Function to handle input changes and save the data to Firebase
    const handleInputChange = async (type, month, value) => {
      // Update local state
      const srNo= selectedStudentForSr.serialNo;
      const updatedAttendance = { ...attendance };
      updatedAttendance[type][month] = value;
      setAttendance(updatedAttendance);
    
      // Construct the Firebase URL
      const url = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${srNo}/Attendance/${academicYear}/${month}/${type}.json`;
    
      // Save the value directly to Firebase
      try {
        const response = await fetch(url, {
          method: 'PUT', // Use PUT to set the value
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(value)
        });
    
        if (!response.ok) {
          console.error('Failed to save data:', response.statusText);
        }
      } catch (error) {
        console.error('Error saving data:', error);
      }
    };
  
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
      if (selectedStudentForSr.currentClass === "Class V" || selectedStudentForSr.currentClass === "इयत्ता पाचवी") {
        return 18;
      } else if (selectedStudentForSr.currentClass === "Class VIII" || selectedStudentForSr.currentClass === "इयत्ता आठवी") {
        return 21;
      }
      // Default passing marks if none of the specified classes are selected
      return 18;
    };
  
    const passingMarks = getPassingMarks(selectedStudentForSr.currentClass);
  
  
  
  //percentage 

  
  // Re-Exam
    const currentClass = selectedStudentResults?.currentClass; // Example: "Class V" or "Class VIII"
    const hasFailed = selectedStudentResults?.results && 
      Object.values(selectedStudentResults.results).some(grades => (grades.sankalikTotal || 0) + (grades.akarikTotal || 0) < passingMarks);
    
    // Add "Re-Exam" if the student is in Class V or VIII and has failed
    let examOptions = [...filteredExamNames];
    if ((currentClass === "Class V" || currentClass === "Class VIII") && hasFailed) {
      examOptions.push("Re-Exam");
    }



    const [marks, setMarks] = useState("");

    const handleInChange = (e) => {
      const value = parseInt(e.target.value, 10);
  
      // Prevent setting value below min (0) or above max (50)
      if (value >= 0 && value <= 50) {
        setMarks(value);
      } else if (value > 50) {
        setMarks(50);
      } else if (value < 0) {
        setMarks(0);
      }
    };
  


    const handleSankalikChange = (e, subject) => {
      const value = Number(e.target.value);
      
      // Update the selected student results with the new temporary marks
      const updatedResults = { ...selectedStudentResults };
      if (updatedResults.results[subject]) {
        updatedResults.results[subject].tempSankalikTotal = value;
      }
      
      setSelectedStudentResults(updatedResults);
      calculateTotalAndPercentage(updatedResults);
    };
    
    const calculateTotalAndPercentage = (results) => {
      let newTotalMarks = 0;
      let subjectsCount = 0;
    
      Object.entries(results.results).forEach(([subject, grades]) => {
        if (subject !== "nondi") { // Exclude "nondi"
          const akarikTotal = grades.akarikTotal || 0;
          const sankalikTotal = grades.tempSankalikTotal || 0;
    
          newTotalMarks += akarikTotal + sankalikTotal;
          subjectsCount++; // Only count valid subjects
        }
      });
    
      setTotalMarks(newTotalMarks);
      const newPercentage = subjectsCount > 0 ? (newTotalMarks / (subjectsCount * 100)) * 100 : 0;
      setPercentage(newPercentage);
    
    };

    const totalSubjects = selectedStudentResults?.results 
  ? Object.keys(selectedStudentResults.results).filter(subject => subject !== "nondi").length 
  : 0;





  const handlePrint = () => {
    const printContent = document.querySelector('.modal-body'); // Select the modal body content
  
    if (printContent) {
      const printWindow = window.open('', '', 'height=600,width=800');
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Student Report</title>
            <style>
              /* General body styles */
               @page {
                size: A4 Landscape; /* auto is the initial value */
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
              }
  
              th, td {
                border: 1px solid #130606;
                padding: 5px;
                text-align: left;
                word-wrap: break-word;
                box-sizing: border-box;
              }
  
              .table-striped tbody tr:nth-of-type(odd) {
                background-color: rgba(0, 0, 0, 0.05); /* Stripe effect */
              }
  
              .table-bordered {
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
  border: 1px solid #ccc;
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


      return (
        <div>
          {/* <Sidebar /> */}
          <div className=' main-content-of-page'>
          <h3  style={{color:'rgb(3, 54, 94)', textAlign:'center'}}> {language === "English" ? "Re-Exam" : "पुनर परिषा"}</h3>
            <table className="table table-striped table-bordered">
              <tbody>
                <tr>
                  <th> {language === "English" ? "Academic Year " : "शैक्षणिक वर्ष"}</th>
                  <td>
                    <select  id="academicYear"  value={academicYear}  onChange={handleAcademicYearChange}  className="form-control custom-select"
                    >
                      <option value="2023-2024" selected>2023-2024</option>
                      <option value="2024-2025">2024-2025</option>
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
    defaultValue={examNames[0]}
  >
    <option value="">{language === "English" ? "Select Class " : "वर्ग निवडा"}</option>
    {classes
      .filter(cls => cls === 'Class V' || cls === 'Class VIII') // Filter to include only classes 5 and 8
      .map((cls, index) => (
        <option key={index} value={cls}>
          {cls}
        </option>
      ))}
  </select>
                  </td>
                </tr>
                <tr>
                  <th> {language === "English" ? "Division " : "तुकडी"}</th>
                  <td>
                    <select
                      id="division"
                      value={division}
                      onChange={handleDivisionChange}
                      className="form-control custom-select"
                    >
                      <option value="">
                        {language === "English" ? "All Student" : "सर्व विद्यार्थी"}
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
                  <th>{language === "English" ? "Exam Name " : "परीक्षेचे नाव"}</th>
                  <td>
                  <select 
      id="examName" 
      value={selectedExamName}
      onChange={handleExamNameChange}
      className="form-control custom-select"
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
            <Link to="/boardresult">
        {language === "English" ? (
          <button className="btn btn-primary">Back</button>
        ) : (
          <button className="btn btn-primary">मागे</button>
        )}
      </Link>
      {selectedStudents.length > 0 && (
  <div className="mt-4">
    <table className="table table-striped table-bordered custom-table">
      <thead>
        <tr>
          <th className="custom-width">{language === "English" ? "Register No " : "रजिस्टर नंबर"}</th>
          <th>{language === "English" ? "Student Name " : "विद्यार्थ्याचे नाव"}</th>
          <th>{language === "English" ? "Result " : "प्रगतीपत्रक"}</th>
        </tr>
      </thead>
      <tbody>
        {selectedStudents
          .filter((student) => division ? student.division === division : true)
          .map((student,index) => (
          <tr key={index}>
            <td>{student.RegisterNo}</td>
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
                <Modal.Title>{language === "English" ? "Re-Exam Result " : "विद्यार्थ्यांचे निकाल"}</Modal.Title>
              </Modal.Header>
              <Modal.Body>
             
      <div>
        {/* Second semester modal content */}
    
      
    <div className="container ">
              <div className="left">
              <div className="left-box">
  <div className="school-info">
    {schoolLogo && (
      <div>
        <img src={schoolLogo} alt={`$Logo`} />
      </div>
    )}
    <h2>{schoolName}</h2>
  </div>
</div>
<br/>

<div class="student-info-grid">
    <p>
      <label>{language === "English" ? "Student Name:" : "विद्यार्थ्याचे नाव"}</label>
      <span>
        {selectedStudentResults?.studentName || ' '}{' '}
        {selectedStudentResults?.stdFather || ' '}{' '}
        {selectedStudentResults?.stdSurname || ' '}
      </span>
    </p>
    <p>
      <label>{language === "English" ? "Roll No:" : "हजेरी क्रमांक"}</label>
      <span>{selectedStudentResults?.rollNo || ' '}</span>
    </p>
    <p>
      <label>{language === "English" ? "Exam Roll No:" : "परीक्षेचा हजेरी क्रमांक"}</label>
      <span>{selectedExamName || ' '}</span>
    </p>
    <p>
      <label>{language === "English" ? "Academic Year:" : "शैक्षणिक वर्ष:"}</label>
      <span>{academicYear || ' '}</span>
    </p>
    <p>
      <label>{language === "English" ? "Class:" : "वर्ग"}</label>
      <span>{classValue || ' '}</span>
    </p>
    <p>
      <label>{language === "English" ? "Mother Name:" : "आईचे नाव"}</label>
      <span>{selectedStudentResults?.stdMother || ' '}</span>
    </p>
    <p>
      <label>{language === "English" ? "Date Of Birth:" : "जन्मतारीख"}</label>
      <span>{selectedStudentResults?.dob || ' '}</span>
    </p>   
    <p>
      <label>{language === "English" ? "Division:" : "तुकडी"}</label>
      <span>{selectedStudentResults?.division || ' '}</span>
    </p>
    <p>
      <label>{language === "English" ? "Mother Tongue:" : "मातृभाषा"}</label>
      <span>{selectedStudentResults?.motherTounge || ' '}</span>
    </p>
    <p>
      <label>{language === "English" ? "Student ID:" : "विद्यार्थी आयडी"}</label>
      <span>{selectedStudentResults?.studentId || ' '}</span>
    </p>
    <p>
      <label>{language === "English" ? "Gender:" : "लिंग"}</label>
      <span>{selectedStudentResults?.gender || ' '}</span>
    </p>
</div>
               <div className="gradable" > 
<table>
    <thead>
        <tr>
            <th rowspan="2">विषय</th>
            <th colspan="2">प्रथम सत्र</th>
            <th colspan="2">द्वितीय सत्र</th>
        </tr>
        <tr>
            <th>Kg</th>
            <th>Cm</th>
            <th>Kg</th>
            <th>Cm</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>वजन</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>उंची</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
    </tbody>
</table>
               </div>
              </div>
              <div className="right">
            
         {/* First Semester Attendance Table */}
    <h3>{language === "English" ? "Attendance:" : "हजेरी"}</h3>
    <table>
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
                  onChange={(e) => handleInputChange(type, month, e.target.value)}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>

    {/* Second Semester Attendance Table */}
    <h5 style={{ marginTop: '10px' }}>{language === "English" ? "Second Semester Attendance:" : "द्वितीय सत्राची हजेरी:"}</h5>
    <table>
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
                  onChange={(e) => handleInputChange(type, month, e.target.value)}
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
                <p style={{marginTop:'70px', marginLeft: '350px' }}>{language === "English" ? "Parents Signature " : "पालकांची सही"}</p>

              </div>
            </div>

   
    <div className="container mt-1" >
      <div className="left">
        <h3>{language === "English" ? "Student Progress Report " : "विद्यार्थी प्रगती अहवाल"}</h3>
        <div>
          <label htmlFor="roll-no">{language === "English" ? "Roll No: " : "हजेरी क्रमांक"}</label>
          <span>{selectedStudentResults?.studentName || ' '}</span>
        </div>
        <div>
          <label htmlFor="student-name">{language === "English" ? "Student Name: " : "विद्यार्थ्याचे नाव"}</label>
          <span>{selectedStudentResults?.studentName || ' '} {selectedStudentResults?.stdFather || ' '} {selectedStudentResults?.stdSurname || ' '}</span>
        </div>
        <div>
          <label htmlFor="class">{language === "English" ? "Class: " : "वर्ग"}</label>
          <span>{classValue || ' '}</span>
        </div>
        
                <div>
                  <label htmlFor="exam-roll-no">{language === "English" ? "Exam Roll No: " : "परीक्षेचा हजेरी क्रमांक"}</label>
                  <span>{selectedExamName || ' '}</span>
                </div>
                <br />

               {selectedStudentResults?.results ? (
  <table className="table table-striped table-bordered">
    <thead>
      <tr>
        <th colSpan="2">{language === "English" ? "First Semester" : "पहिला सेमिस्टर"}</th>
        <th colSpan="3">{language === "English" ? "Second Semester" : "दुसरा सेमिस्टर"}</th>
      </tr>
      <tr>
        <th>{language === "English" ? "Subject" : "विषय"}</th>
        <th>{language === "English" ? "Grade" : "गुण"}</th>
        <th>{language === "English" ? "Min. Mark" : "किमान गुण"}</th>
        <th>{language === "English" ? "Total Marks" : "एकूण गुण"}</th>
        <th>{language === "English" ? "Remark" : "शेरा"}</th>
      </tr>
    </thead>
    <tbody>
    
    
  
    {selectedStudentResults && selectedStudentResults.results ? (
  subjectSequence
    .filter((subject) => subject in selectedStudentResults.results) // Ensure subjects exist in the results
    .map((subject) => {
      const grades = selectedStudentResults.results[subject];
      return (
        <tr key={subject}>
          <td><b>{subject}</b></td>
          <td><b>{grades.firstSemesterGrade || ' '}</b></td> {/* First semester grade */}
          <td>
            <input
              type="number"
              value={passingMarks}
              readOnly
              style={{ textAlign: "center" }}
              className="form-control"
            />
          </td>
          <td>
            <input
              type="number"
              value={grades.tempSankalikTotal || ''} // Temporary second semester marks
              onChange={(e) => handleSankalikChange(e, subject)}
              className="form-control"
            />
          </td>
          <td>
            <b>
              {grades.tempSankalikTotal >= passingMarks
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
                <p>{language === "English" ? "School d after summer vacation. / / will start from" : "उन्हाळी सुटीनंतर शाळा दि. / / पासून सुरू होईल."}</p>
                </div>
                <div className="grad"  style={{ display: 'flex', alignItems: 'center' }}>
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
      <th colSpan="" style={{ padding: "2px", border: "1px solid #ddd", fontSize: "16px" }}>{language === "English" ? "First Semester " : "पहिली सत्र"} </th>
      <th colSpan="" style={{ padding: "2px", border: "1px solid #ddd", fontSize: "16px" }}>{language === "English" ? "Second Semester " : "दुसरी सत्र"} </th>
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

      <td style={{width: "50%", padding: "2px", border: "1px solid #ddd", verticalAlign: "top" }}>
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
      <th colSpan="2" style={{ padding: "2px", border: "1px solid #ddd", fontSize: "16px"}}>{language === "English" ? "Hobbies" : "छंद"}</th>
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
        readOnly/>
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
      value=  {selectedStudentResults?.firstSemester?.necessaryCorrections || "No data available"}
      readonly/>
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
    };
    


export default Failed