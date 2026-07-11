import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import "../result/result.css";
import AlertMessage from "../../AlertMessage";
import { useParams } from 'react-router-dom';


const WebResult = () => {

  const params = useParams();
  const udiseNumber = params.udiseNumber;
  const srNo = params.srNo;
  const academicYear = params.academicYear;
  const classValue = params.classValue;
  const selectedExamName = params.selectedExamName;

  const [studentData, setStudentData] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [selectedStudentResults, setSelectedStudentResults] = useState(null);
  const [showModal, setShowModal] = useState(true);
  const [schoolName, setSchoolName] = useState('');
  const [schoolLogo, setSchoolLogo] = useState('');

  const [language, setLanguage] = useState(localStorage.getItem('language') || 'English');
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);

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
    if (selectedExamName && classValue && academicYear) {
      fetchMarksForSelectedSubject();
    }
  }, [selectedExamName, classValue, academicYear]);


  useEffect(() => {
    const fetchBasicStudentInfo = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${srNo}.json`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch student info');
        }
        const studentInfo = await response.json();

        // Set basic student info
        setSelectedStudentResults(prev => ({
          ...prev,
          studentName: studentInfo.stdName,
          stdMother: studentInfo.stdMother,
          stdFather: studentInfo.stdFather,
          stdSurname: studentInfo.stdSurname,
          dob: studentInfo.dob,
          division: studentInfo.division,
          motherTounge: studentInfo.motherTounge,
          studentId: studentInfo.studentId,
          gender: studentInfo.gender,
          rollNo: studentInfo.rollNo
        }));
      } catch (error) {
        console.error('Error fetching student info:', error);
      }
    };

    if (srNo) {
      fetchBasicStudentInfo();
    }
  }, [srNo, udiseNumber]);



  const fetchStudentData = async () => {
    try {
      // First semester data
      const firstSemesterResponse = await fetch(
        `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${srNo}/result/${academicYear}/First Semester.json`
      );

      // Second semester data (if viewing second semester)
      const secondSemesterResponse = await fetch(
        `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${srNo}/result/${academicYear}/${selectedExamName}.json`
      );

      const firstSemesterData = await firstSemesterResponse.json();
      const secondSemesterData = await secondSemesterResponse.json();
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
        ...selectedStudentResults,
        nondi: nondiSecondSemesterData || {},
        firstSemester: nondiFirstSemesterData || {},
      });
      // Process the results similar to your viewResult function
      const resultsWithTotal = {};
      const allSubjects = new Set([
        ...Object.keys(firstSemesterData || {}),
        ...Object.keys(secondSemesterData || {})
      ]);

      allSubjects.forEach((subject) => {
        const firstSemesterGrade = firstSemesterData?.[subject]?.Akarik?.Total
          ? calculateGrade(
            firstSemesterData[subject].Akarik.Total +
            (firstSemesterData[subject].Sanklik?.Total || 0)
          )
          : " ";

        const akarikTotal = secondSemesterData?.[subject]?.Akarik?.Total || 0;
        const sankalikTotal = secondSemesterData?.[subject]?.Sanklik?.Total || 0;
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

      // Update the state with the results
      setSelectedStudentResults(prev => ({
        ...prev,
        results: resultsWithTotal
      }));

      setShowModal(true);
    } catch (error) {
      console.error('Error fetching student data:', error);
    }
  };




  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${srNo}.json`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch student info');
        }
        const studentInfo = await response.json();

        const firstSemesterResponse = await fetch(
          `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${srNo}/result/${academicYear}/First Semester.json`
        );
        const secondSemesterResponse = await fetch(
          `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${srNo}/result/${academicYear}/${selectedExamName}.json`
        );

        const firstSemesterData = await firstSemesterResponse.json();
        const secondSemesterData = await secondSemesterResponse.json();

        // Fetch nondi data for both semesters
        const nondiFirstSemesterResponse = await fetch(
          `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${srNo}/result/${academicYear}/First Semester/nondi.json`
        );
        const nondiSecondSemesterResponse = await fetch(
          `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${srNo}/result/${academicYear}/${selectedExamName}/nondi.json`
        );

        const nondiFirstSemesterData = await nondiFirstSemesterResponse.json();
        const nondiSecondSemesterData = await nondiSecondSemesterResponse.json();

        // Process the results
        const resultsWithTotal = {};
        const allSubjects = new Set([
          ...Object.keys(firstSemesterData || {}),
          ...Object.keys(secondSemesterData || {})
        ]);

        allSubjects.forEach((subject) => {
          const firstSemesterGrade = firstSemesterData?.[subject]?.Akarik?.Total
            ? calculateGrade(
              firstSemesterData[subject].Akarik.Total +
              (firstSemesterData[subject].Sanklik?.Total || 0)
            )
            : " ";

          const akarikTotal = secondSemesterData?.[subject]?.Akarik?.Total || 0;
          const sankalikTotal = secondSemesterData?.[subject]?.Sanklik?.Total || 0;
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

        // Update the state with all the necessary data
        setSelectedStudentResults({
          studentName: studentInfo.stdName,
          stdMother: studentInfo.stdMother,
          stdFather: studentInfo.stdFather,
          stdSurname: studentInfo.stdSurname,
          dob: studentInfo.dob,
          division: studentInfo.division,
          motherTounge: studentInfo.motherTounge,
          studentId: studentInfo.studentId,
          gender: studentInfo.gender,
          rollNo: studentInfo.rollNo,
          results: resultsWithTotal,
          nondi: {
            specialEntries: nondiSecondSemesterData.specialEntries || "",
            interestsAndHobbies: nondiSecondSemesterData.interestsAndHobbies || "",
            necessaryCorrections: nondiSecondSemesterData.necessaryCorrections || "",
          },
          firstSemester: {
            specialEntries: nondiFirstSemesterData.specialEntries || "",
            interestsAndHobbies: nondiFirstSemesterData.interestsAndHobbies || "",
            necessaryCorrections: nondiFirstSemesterData.necessaryCorrections || "",
          },
        });

        setShowModal(true);
      } catch (error) {
        console.error('Error fetching student data:', error);
      }
    };

    if (academicYear && classValue && selectedExamName && srNo) {
      fetchStudentData();
    }
  }, [academicYear, classValue, selectedExamName, srNo]);


  // Call fetchStudentData when the component mounts with URL parameters
  useEffect(() => {
    fetchSchoolName();
    if (academicYear && classValue && selectedExamName && srNo) {
      fetchStudentData();
    }
  }, [academicYear, classValue, selectedExamName, srNo]);


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

  const [selectedStudentForSr, setSelectedStudentForSr] = useState('')


  const viewResult = async (srNo) => {
    try {
      const student = selectedStudents.find((student) => student.srNo === srNo);
      setSelectedStudentForSr(student);
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

      // Check if either semester data is empty
      if (!firstSemesterData || Object.keys(firstSemesterData).length === 0) {
        setAlertMessage("Add the subject and fill the marks to view the result.");
        return; // Exit the function if no data is found
      }

      if (!secondSemesterData || Object.keys(secondSemesterData).length === 0) {
        setAlertMessage("Add the subject and fill the marks to view the result.");
        return; // Exit the function if no data is found
      }


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
        rollNo: student.rollNo,
      });

      setShowModal(true);
    } catch (error) {
      console.error("Error fetching student results:", error);
    }
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
    return 'Absent';
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
    return 'अनुपस्थित';
  };

  // Function to calculate grade based on the current language
  const calculateGrade = (total) => {
    return language === 'English' ? calculateGradeEnglish(total) : calculateGradeMarathi(total);
  };

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


  const handleInputChange = async (type, month, value) => {
    const srNo = selectedStudentForSr.serialNo;
    const updatedAttendance = { ...attendance };
    updatedAttendance[type][month] = value;
    setAttendance(updatedAttendance);

    // Construct the Firebase URL
    const url = `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${srNo}/Attendance/${academicYear}/${month}/${type}.json`;

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
            body {
              font-family: 'Poppins', sans-serif;
              margin: 0;
              padding: 0;
              color: black;
            }
            @page {
                size: A4 Landscape; /* auto is the initial value */
              margin: 3mm; /* this affects the margin in the printer settings */
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
      <AlertMessage message={alertMessage} show={showAlert} />

      <div className=' main-content-of-page' style={{ top: 0 }}>

        <Modal show={showModal} dialogClassName='modal-80w' >

          <Modal.Body>
            {selectedExamName === 'Second Semester' && selectedStudentResults ? (
              <div>


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
                    <br />

                    <div class="student-info-grid">
                      <p>
                        <label>{language === "English" ? "Name :" : "नाव :"}</label>
                        <span>
                          {selectedStudentResults?.studentName || ' '}{' '}
                          {selectedStudentResults?.stdFather || ' '}{' '}
                          {selectedStudentResults?.stdSurname || ' '}
                        </span>
                      </p>
                      <p>
                        <label>{language === "English" ? "Roll No :" : "हजेरी क्रमांक :"}</label>
                        <span>{selectedStudentResults?.rollNo || ' '}</span>
                      </p>
                      <p>
                        <label>{language === "English" ? "Exam :" : "परीक्षा सत्र :"}</label>
                        <span>{selectedExamName || ' '}</span>
                      </p>
                      <p>
                        <label>{language === "English" ? "Year :" : "वर्ष :"}</label>
                        <span>{academicYear || ' '}</span>
                      </p>
                      <p>
                        <label>{language === "English" ? "Class :" : "वर्ग :"}</label>
                        <span>{classValue || ' '}</span>
                      </p>
                      <p>
                        <label>{language === "English" ? "Mother Name :" : "आईचे नाव :"}</label>
                        <span>{selectedStudentResults?.stdMother || ''}</span>
                      </p>
                      <p>
                        <label>{language === "English" ? "DOB :" : "जन्मतारीख :"}</label>
                        <span>{selectedStudentResults?.dob || ' '}</span>
                      </p>
                      <p>
                        <label>{language === "English" ? "Division :" : "तुकडी :"}</label>
                        <span>{selectedStudentResults?.division || ' '}</span>
                      </p>
                      <p>
                        <label>{language === "English" ? "Mother Tongue :" : "मातृभाषा :"}</label>
                        <span>{selectedStudentResults?.motherTounge || ' '}</span>
                      </p>
                      <p>
                        <label>{language === "English" ? "Student ID :" : "विद्यार्थी आयडी :"}</label>
                        <span>{selectedStudentResults?.studentId || ' '}</span>
                      </p>
                      <p>
                        <label>{language === "English" ? "Gender :" : "लिंग :"}</label>
                        <span>{selectedStudentResults?.gender || ' '}</span>
                      </p>
                    </div>
                    <div className="gradable" >
                      <table>
                        <thead>
                          <tr>
                            <th rowspan="2">{language === "English" ? "Subject :" : "विषय"}</th>
                            <th colspan="2">{language === "English" ? "First Semester" : "प्रथम सत्र"}</th>
                            <th colspan="2">{language === "English" ? "Second Semester" : "द्वितीय सत्र"}</th>
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
                            <td>{language === "English" ? "Weight" : "वजन"}</td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                          </tr>
                          <tr>
                            <td>{language === "English" ? "Hight " : "उंची"}</td>
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
                    <h2>{language === "English" ? "Attendance:" : "हजेरी"}</h2>
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


                    <p style={{ marginTop: '5px' }}>{language === "English" ? "After the summer vacation school will start from." : "उन्हाळी सुटीनंतर शाळा दि. पासून सुरू होईल."}</p>
                    <div style={{ width: '150px' }}>
                      <input
                        type="date"
                        value={summerVacationDate}
                        onChange={(e) => setSummerVacationDate(e.target.value)}
                      />
                    </div>

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


                    <p style={{ marginTop: '70px', marginLeft: '350px' }}>{language === "English" ? "Parents Signature " : "पालकांची सही"}</p>
                  </div>
                </div>


                <div className="container mt-1">
                  <div className="left">
                    <h2>{language === "English" ? "Student Progress Report " : "विद्यार्थी प्रगती अहवाल"}</h2>
                    <div>
                      <label htmlFor="roll-no">{language === "English" ? "Roll No: " : "हजेरी क्रमांक"}</label>
                      <span>{selectedStudentResults?.rollNo || ' '}</span>
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
                      <label htmlFor="exam-roll-no">{language === "English" ? "Exam: " : "परीक्षा"}</label>
                      <span>{selectedExamName || ' '}</span>
                    </div>

                    {selectedStudentResults?.results ? (
                      <table className="table table-striped table-bordered">
                        <thead>
                          <tr>
                            <th>{language === "English" ? "Subject " : "विषय"}</th>
                            <th>{language === "English" ? "First Semester " : "पहिली सत्र"}</th>
                            <th>{language === "English" ? "Second Semester " : "द्वितीय सत्र"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjectSequence
                            .filter((subject, index) => subject && index !== 0) // Skip first null or empty subject
                            .map((subject) => {
                              const grades = selectedStudentResults.results[subject] || {}; // Get grades for the subject
                              return (
                                <tr key={subject}>
                                  <td><b>{subject}</b></td>
                                  <td><b>{grades.firstSemesterGrade || "Absent"}</b></td> {/* First semester grade */}
                                  <td><b>{grades.grade || "Absent"}</b></td> {/* Second semester grade */}
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    ) : (
                      <p>{language === "English" ? "No results available." : "कोणतेही प्रगतीपत्रक उपलब्ध नाहीत."}</p>
                    )}


                    <div>

                    </div>
                    <div className="grad" style={{ display: 'flex', alignItems: 'center' }}>
                      <label style={{ marginRight: '20px', marginBottom: '2px', marginLeft: '20px' }} htmlFor="class-teacher">{language === "English" ? "Class Teacher" : "वर्गशिक्षक"}</label>
                      <label style={{ marginRight: '20px', marginBottom: '2px', marginLeft: '45%' }} htmlFor="principal">{language === "English" ? "Principal " : "प्राचार्य"}</label>
                    </div>
                  </div>
                  <div className="right">
                    <h2 style={{ textAlign: "center", color: "black", fontFamily: "Arial, sans-serif", fontWeight: "bold", marginBottom: "20px" }}>
                      {language === "English" ? "Nondi " : "नोंदी"}
                    </h2>

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
                      <h2>{language === "English" ? "Grade Table" : "श्रेणी टेबल"}</h2>
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
                            <th>{language === "English" ? "Absent" : "अनुपस्थित"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>%</td>
                            <td>{language === "English" ? "91% to 100%" : "91% ते 100%"}</td>
                            <td>{language === "English" ? "81% to 90%" : "81% ते 90%"}</td>
                            <td>{language === "English" ? "71% to 80%" : "71% ते 80%"}</td>
                            <td>{language === "English" ? "61% to 70%" : "61% ते 70%"}</td>
                            <td>{language === "English" ? "51% to 60%" : "51% ते 60%"}</td>
                            <td>{language === "English" ? "41% to 50%" : "41% ते 50%"}</td>
                            <td>{language === "English" ? "33% to 40%" : "33% ते 40%"}</td>
                            <td>{language === "English" ? "21% to 32%" : "21% ते 32%"}</td>
                            <td>{language === "English" ? "less than 20%" : "20% पेक्षा कमी"}</td>
                          </tr>
                        </tbody>
                      </table>

                    </div>
                  </div>
                </div>
              </div>

            ) : (


              <div>
                {/* First semester modal content */}
                <div className="container mt-1">
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
                    <br />

                    <div class="student-info-grid">
                      <p>
                        <label>{language === "English" ? "Name :" : "विद्यार्थ्याचे नाव :"}</label>
                        <span>
                          {selectedStudentResults?.studentName || '-'}{' '}
                          {selectedStudentResults?.stdFather || ' '}{' '}
                          {selectedStudentResults?.stdSurname || ' '}
                        </span>
                      </p>
                      <p>
                        <label>{language === "English" ? "Roll No :" : "हजेरी क्रमांक :"}</label>
                        <span>{selectedStudentResults?.rollNo || ' '}</span>
                      </p>
                      <p>
                        <label>{language === "English" ? "Exam :" : "परीक्षा सत्र :"}</label>
                        <span>{selectedExamName || ' '}</span>
                      </p>
                      <p>
                        <label>{language === "English" ? "Year :" : "वर्ष :"}</label>
                        <span>{academicYear || ' '}</span>
                      </p>
                      <p>
                        <label>{language === "English" ? "Class :" : "वर्ग :"}</label>
                        <span>{classValue || ' '}</span>
                      </p>
                      <p>
                        <label>{language === "English" ? "Mother Name :" : "आईचे नाव :"}</label>
                        <span>{selectedStudentResults?.stdMother || ' '}</span>
                      </p>
                      <p>
                        <label>{language === "English" ? "DOB :" : "जन्मतारीख :"}</label>
                        <span>{selectedStudentResults?.dob || ' '}</span>
                      </p>
                      <p>
                        <label>{language === "English" ? "Division :" : "तुकडी :"}</label>
                        <span>{selectedStudentResults?.division || ' '}</span>
                      </p>
                      <p>
                        <label>{language === "English" ? "Mother Tongue :" : "मातृभाषा :"}</label>
                        <span>{selectedStudentResults?.motherTounge || ' '}</span>
                      </p>
                      <p>
                        <label>{language === "English" ? "Student ID :" : "विद्यार्थी आयडी :"}</label>
                        <span>{selectedStudentResults?.studentId || ' '}</span>
                      </p>
                      <p>
                        <label>{language === "English" ? "Gender :" : "लिंग :"}</label>
                        <span>{selectedStudentResults?.gender || ' '}</span>
                      </p>
                    </div>
                    <div className="gradable">
                      <table>
                        <thead>
                          <tr>
                            <th rowspan="2">{language === "English" ? "Subject :" : "विषय"}</th>
                            <th colspan="2">{language === "English" ? "First Semester" : "प्रथम सत्र"}</th>
                            <th colspan="2">{language === "English" ? "Second Semester" : "द्वितीय सत्र"}</th>
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
                            <td>{language === "English" ? "Weight" : "वजन"}</td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                          </tr>
                          <tr>
                            <td>{language === "English" ? "Hight" : "उंची"}</td>
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
                    <h2>{language === "English" ? "Attendance:" : "हजेरी"}</h2>
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
                    <p style={{ marginTop: '5px' }}>{language === "English" ? "After the winter vacation the school will start from." : "हिवाळी सुटीनंतर शाळा दि. पासून सुरू होईल."}</p>
                    <div style={{ width: '150px' }}>

                      <input
                        type="date"
                        value={winterVacationDate}
                        onChange={(e) => setWinterVacationDate(e.target.value)}
                      />
                    </div>

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
                    <p style={{ marginTop: '70px', marginLeft: '350px' }}>{language === "English" ? "Parents Signature " : "पालकांची सही"}</p>

                  </div>
                </div>

                <div className="container mt-1">
                  <div className="left">
                    <h2>{language === "English" ? " Student Progress Report" : "विद्यार्थी प्रगती अहवाल"}</h2>
                    <div>
                      <label htmlFor="roll-no">{language === "English" ? " Roll No:" : "हजेरी क्रमांक:"}</label>
                      <span>{selectedStudentResults?.rollNo || ' '}</span>
                    </div>
                    <div>
                      <label htmlFor="student-name">{language === "English" ? " Student Name:" : "विद्यार्थ्याचे नाव:"}</label>
                      <span>{selectedStudentResults?.studentName || ' '} {selectedStudentResults?.stdFather || ' '} {selectedStudentResults?.stdSurname || ' '}</span>
                    </div>
                    <div>
                      <label htmlFor="class">{language === "English" ? " Class:" : "वर्ग:"}</label>
                      <span>{classValue || ' '}</span>
                    </div>
                    <div>
                      <label htmlFor="exam-roll-no">{language === "English" ? " Exam:" : "परीक्षा:"}</label>
                      <span>{selectedExamName || ' '}</span>
                    </div>







                    {selectedStudentResults?.results ? (
                      <table className="table table-striped table-bordered">
                        <thead>
                          <tr>
                            <th>{language === "English" ? "Subject" : "विषय"}</th>
                            <th>{language === "English" ? "Grade" : "श्रेणी"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjectSequence
                            .filter((subject, index) => subject && index !== 0) // Skip first null or empty subject
                            .map((subject) => {
                              const { grade } = selectedStudentResults.results[subject] || {}; // Get grade for the subject
                              return (
                                <tr key={subject}>
                                  <td><b>{subject}</b></td>
                                  <td><b>{grade || "Absent"}</b></td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    ) : (
                      <p>{language === "English" ? "No results available." : "कोणतेही प्रगतीपत्रक उपलब्ध नाहीत."}</p>
                    )}


                    <div>
                    </div>
                    <div className="grad" style={{ display: 'flex', alignItems: 'center' }}>
                      <label style={{ marginRight: '20px', marginBottom: '2px', marginLeft: '20px' }} htmlFor="class-teacher">{language === "English" ? "Class Teacher" : "वर्गशिक्षक"}</label>
                      <label style={{ marginRight: '20px', marginBottom: '2px', marginLeft: '45%' }} htmlFor="principal">{language === "English" ? "Principal" : "प्राचार्य"}</label>
                    </div>
                  </div>
                  <div className="right">
                    <h2>{language === "English" ? "Nondi" : "नोंदी"}</h2>


                    <table>
                      <tr>
                        <th style={{ width: "33%" }}>{language === "English" ? "Special Progress:" : "विशेष प्रगती:"}</th>
                        <th style={{ width: "33%" }}>{language === "English" ? "Hobbies:" : "छंद:"}</th>
                        <th style={{ width: "33%" }}>{language === "English" ? "Required Improvements:" : "आवश्यक सुधारणा:"}</th>
                      </tr>
                      <tr>
                        <td style={{ width: "33%" }}>
                          <div
                            id="special-progress"
                            style={{
                              height: "150px",
                              overflowY: "auto",
                              padding: "10px",
                              border: "1px solid black",
                            }}
                            contentEditable="false"
                            suppressContentEditableWarning={true}
                          >
                            {selectedStudentResults?.nondi?.specialEntries || ""}
                          </div>
                        </td>
                        <td style={{ width: "33%" }}>
                          <div
                            id="hobbies"
                            style={{
                              height: "150px",
                              overflowY: "auto",
                              padding: "10px",
                              border: "1px solid black",
                            }}
                            contentEditable="false"
                            suppressContentEditableWarning={true}
                          >
                            {selectedStudentResults?.nondi?.interestsAndHobbies || ""}
                          </div>
                        </td>
                        <td style={{ width: "33%" }}>
                          <div
                            id="improvements"
                            style={{
                              height: "150px",
                              overflowY: "auto",
                              padding: "10px",
                              border: "1px solid black",
                            }}
                            contentEditable="false"
                            suppressContentEditableWarning={true}
                          >
                            {selectedStudentResults?.nondi?.necessaryCorrections || ""}
                          </div>
                        </td>
                      </tr>
                    </table>

                    <div className="grade-table">
                      <h2>{language === "English" ? "Grade Table" : "श्रेणी टेबल"}</h2>
                      <table>
                        <thead>
                          <tr>
                            <th>{language === "English" ? "Marks" : "मार्क्स"}</th>
                            <th>{language === "English" ? "A1" : "अ-1"}</th>
                            <th>{language === "English" ? "A2" : "अ-2"}</th>
                            <th>{language === "English" ? "B1" : "ब-1"}</th>
                            <th>{language === "English" ? "B2" : "ब-2"}</th>
                            <th>{language === "English" ? "C1" : "क-1"}</th>
                            <th>{language === "English" ? "C2" : "क-2"}</th>
                            <th>{language === "English" ? "D1" : "ड-1"}</th>
                            <th>{language === "English" ? "D2" : "ड-2"}</th>
                            <th>{language === "English" ? "Absent" : "अनुपस्थित"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>%</td>
                            <td>{language === "English" ? "91% to 100%" : "91% ते 100%"}</td>
                            <td>{language === "English" ? "81% to 90%" : "81% ते 90%"}</td>
                            <td>{language === "English" ? "71% to 80%" : "71% ते 80%"}</td>
                            <td>{language === "English" ? "61% to 70%" : "61% ते 70%"}</td>
                            <td>{language === "English" ? "51% to 60%" : "51% ते 60%"}</td>
                            <td>{language === "English" ? "41% to 50%" : "41% ते 50%"}</td>
                            <td>{language === "English" ? "33% to 40%" : "33% ते 40%"}</td>
                            <td>{language === "English" ? "21% to 32%" : "21% ते 32%"}</td>
                            <td>{language === "English" ? "less than 20%" : "20% पेक्षा कमी"}</td>
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
            <Button variant="primary" onClick={handlePrint}>
              {language === "English" ? "Print" : "Print करा"}
            </Button>
          </Modal.Footer>
        </Modal>

        <style jsx>{`
      .modal.show .modal-dialog {
  transform: auto; 
      }
      `}</style>
      </div>
    </div>
  );
};

export default WebResult;