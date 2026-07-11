<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
import 'chart.js/auto';
import AlertMessage from "../../AlertMessage";
import { Line, Bar } from 'react-chartjs-2';

// import './studentprogress.css';


const generateAttendanceChartData = (attendanceRecords = {}) => {
  const monthsOrder = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const attendanceData = monthsOrder.map(month => {
=======
import React, { useState, useEffect } from "react";
import "chart.js/auto";
import AlertMessage from "../../AlertMessage";
import { Line, Bar } from "react-chartjs-2";

// import './studentprogress.css';

const generateAttendanceChartData = (attendanceRecords = {}) => {
  const monthsOrder = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const attendanceData = monthsOrder.map((month) => {
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
    return attendanceRecords[month] || 0; // Default to 0 if month data is missing
  });

  return {
    labels: monthsOrder,
    datasets: [
      {
<<<<<<< HEAD
        label: 'Attendance',
        data: attendanceData,
        borderColor: '#36A2EB',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
=======
        label: "Attendance",
        data: attendanceData,
        borderColor: "#36A2EB",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
        fill: true,
        tension: 0.3,
      },
    ],
  };
};

const calculateTotalMarksAndPercentage = (marksData) => {
  const totalMarks = {};
  const totalObtainedMarks = {};
  const percentages = {};

  Object.keys(marksData).forEach((srNo) => {
    const studentMarks = marksData[srNo];
    totalMarks[srNo] = {};
    totalObtainedMarks[srNo] = {};
    percentages[srNo] = {};

    Object.keys(studentMarks).forEach((semester) => {
      const semesterMarks = studentMarks[semester];
      let totalOutOf = 0;
      let totalObtained = 0;
      let subjectCount = 0;

      Object.keys(semesterMarks).forEach((subject) => {
<<<<<<< HEAD
        if (subject !== "nondi") { // Ignore the "nondi" node
=======
        if (subject !== "nondi") {
          // Ignore the "nondi" node
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
          const subjectMarks = semesterMarks[subject];
          const sanklikTotal = subjectMarks.Sanklik?.Total || 0;
          const akarikTotal = subjectMarks.Akarik?.Total || 0;
          totalOutOf += 100; // Each subject has a total of 100 marks
          totalObtained += sanklikTotal + akarikTotal;
          subjectCount++;
        }
      });

      totalMarks[srNo][semester] = subjectCount * 100; // Total marks based on the number of subjects
      totalObtainedMarks[srNo][semester] = totalObtained;
<<<<<<< HEAD
      percentages[srNo][semester] = totalOutOf > 0 ? ((totalObtained / totalOutOf) * 100).toFixed(2) : "0";
=======
      percentages[srNo][semester] =
        totalOutOf > 0 ? ((totalObtained / totalOutOf) * 100).toFixed(2) : "0";
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
    });
  });

  Object.keys(totalObtainedMarks).forEach((srNo) => {
<<<<<<< HEAD
    Object.keys(totalObtainedMarks[srNo]).forEach((semester) => {
    });
  });

  localStorage.setItem("totalMarks", JSON.stringify(totalMarks));
  localStorage.setItem("totalObtainedMarks", JSON.stringify(totalObtainedMarks));
  localStorage.setItem("percentages", JSON.stringify(percentages));
};

const renderBarGraph = (totalMarks = {}, totalObtainedMarks = {}, percentages = {}) => {
  const exams = ['First Semester', 'Second Semester'];
=======
    Object.keys(totalObtainedMarks[srNo]).forEach((semester) => {});
  });

  localStorage.setItem("totalMarks", JSON.stringify(totalMarks));
  localStorage.setItem(
    "totalObtainedMarks",
    JSON.stringify(totalObtainedMarks),
  );
  localStorage.setItem("percentages", JSON.stringify(percentages));
};

const renderBarGraph = (
  totalMarks = {},
  totalObtainedMarks = {},
  percentages = {},
) => {
  const exams = ["First Semester", "Second Semester"];
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557

  return (
    <Bar
      data={{
        labels: exams,
        datasets: [
          {
<<<<<<< HEAD
            label: 'Total Marks',
            data: exams.map(exam => totalMarks[exam] ?? 0),
            backgroundColor: 'rgba(8, 5, 175, 0.2)',
            borderColor: '#36A2EB',
            fill: true,
          },
          {
            label: 'Total Obtained Marks',
            data: exams.map(exam => totalObtainedMarks[exam] ?? 0),
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: '#36A2EB',
            fill: true,
          },
          {
            label: 'Percentage',
            data: exams.map(exam => (percentages[exam] !== undefined && !isNaN(percentages[exam])) ? parseFloat(percentages[exam]) : 0),
            backgroundColor: 'rgba(200, 6, 6, 0.2)',
            borderColor: '#FF6384',
            fill: true,
            yAxisID: 'y-percentage',
=======
            label: "Total Marks",
            data: exams.map((exam) => totalMarks[exam] ?? 0),
            backgroundColor: "rgba(8, 5, 175, 0.2)",
            borderColor: "#36A2EB",
            fill: true,
          },
          {
            label: "Total Obtained Marks",
            data: exams.map((exam) => totalObtainedMarks[exam] ?? 0),
            backgroundColor: "rgba(54, 162, 235, 0.2)",
            borderColor: "#36A2EB",
            fill: true,
          },
          {
            label: "Percentage",
            data: exams.map((exam) =>
              percentages[exam] !== undefined && !isNaN(percentages[exam])
                ? parseFloat(percentages[exam])
                : 0,
            ),
            backgroundColor: "rgba(200, 6, 6, 0.2)",
            borderColor: "#FF6384",
            fill: true,
            yAxisID: "y-percentage",
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
          },
        ],
      }}
      options={{
        responsive: true,
        plugins: {
<<<<<<< HEAD
          legend: { position: 'top' },
          title: { display: true, text: 'Exam Performance' },
=======
          legend: { position: "top" },
          title: { display: true, text: "Exam Performance" },
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
        },
        scales: {
          y: {
            ticks: { stepSize: 25 },
            beginAtZero: true,
          },
<<<<<<< HEAD
          'y-percentage': {
            type: 'linear',
            position: 'right',
            ticks: {
              callback: function(value) {
                return value + '%';
=======
          "y-percentage": {
            type: "linear",
            position: "right",
            ticks: {
              callback: function (value) {
                return value + "%";
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
              },
              stepSize: 10,
              beginAtZero: true,
            },
            grid: {
              drawOnChartArea: false,
            },
          },
        },
      }}
    />
  );
};

<<<<<<< HEAD
const fetchAndCalculateMarksData = async (studentData, classValue, divisionValue, udiseNumber, academicYear) => {
  try {
    const filteredStudents = studentData.filter(
      (student) => student.currentClass === classValue && student.division === divisionValue
=======
const fetchAndCalculateMarksData = async (
  studentData,
  classValue,
  divisionValue,
  udiseNumber,
  academicYear,
) => {
  try {
    const filteredStudents = studentData.filter(
      (student) =>
        student.currentClass === classValue &&
        student.division === divisionValue,
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
    );

    const marksDataPromises = filteredStudents.map(async (student) => {
      const response = await fetch(
<<<<<<< HEAD
        `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${student.srNo}/result/${academicYear}.json`
=======
        `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${student.srNo}/result/${academicYear}.json`,
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      );
      if (!response.ok) {
        console.warn(`Marks data missing for student: ${student.srNo}`);
        return { srNo: student.srNo, marks: {} };
      }

      const data = await response.json();
      return { srNo: student.srNo, marks: data };
    });

    const fetchedMarksData = await Promise.all(marksDataPromises);

    const marksData = fetchedMarksData.reduce((acc, { srNo, marks }) => {
      acc[srNo] = marks;
      return acc;
    }, {});

    calculateTotalMarksAndPercentage(marksData);
  } catch (error) {
<<<<<<< HEAD
    console.error('Error fetching marks data:', error);
=======
    console.error("Error fetching marks data:", error);
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  }
};

const fetchStoredData = () => {
  const results = JSON.parse(localStorage.getItem("result")) || {};

<<<<<<< HEAD

=======
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  const academicYear = Object.keys(results)[0]; // Assuming latest year is the first key

  if (!academicYear || !results[academicYear]) {
    console.warn("No valid academic year data found in localStorage");
    return { totalMarks: {}, totalObtainedMarks: {}, percentages: {} };
  }

  const totalMarks = {};
  const totalObtainedMarks = {};
  const percentages = {};

  Object.entries(results[academicYear]).forEach(([exam, data]) => {
    if (exam.startsWith("Semester")) {
      let totalOutOf = 0;
      let totalObtained = 0;

<<<<<<< HEAD
      Object.values(data).forEach(subject => {
        if (subject && subject.obtainedMarks !== undefined && subject.maxMarks !== undefined) {
=======
      Object.values(data).forEach((subject) => {
        if (
          subject &&
          subject.obtainedMarks !== undefined &&
          subject.maxMarks !== undefined
        ) {
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
          totalOutOf += subject.maxMarks;
          totalObtained += subject.obtainedMarks;
        }
      });

      totalMarks[exam] = totalOutOf;
      totalObtainedMarks[exam] = totalObtained;
<<<<<<< HEAD
      percentages[exam] = totalOutOf > 0 ? (totalObtained / totalOutOf) * 100 : 0;
    } else {
      totalMarks[exam] = data.totalOutOf || 0;
      totalObtainedMarks[exam] = data.totalObtainedMarks || 0;
      percentages[exam] = (typeof data.percentages === "number" && !isNaN(data.percentages))
        ? parseFloat(data.percentages)
        : 0;
=======
      percentages[exam] =
        totalOutOf > 0 ? (totalObtained / totalOutOf) * 100 : 0;
    } else {
      totalMarks[exam] = data.totalOutOf || 0;
      totalObtainedMarks[exam] = data.totalObtainedMarks || 0;
      percentages[exam] =
        typeof data.percentages === "number" && !isNaN(data.percentages)
          ? parseFloat(data.percentages)
          : 0;
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
    }
  });

  return { totalMarks, totalObtainedMarks, percentages };
};

const FullReport = () => {
  const [totalMarks, setTotalMarks] = useState({});
  const [obtainedMarks, setObtainedMarks] = useState({});
  const [percentages, setPercentages] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { totalMarks, totalObtainedMarks, percentages } = fetchStoredData();

    setTotalMarks(totalMarks);
    setObtainedMarks(totalObtainedMarks);
    setPercentages(percentages);
    setLoading(false);
  }, []);

  if (loading) {
    return <p>Loading data...</p>;
  }

<<<<<<< HEAD
  return (
    <div>
      {renderBarGraph(totalMarks, obtainedMarks, percentages)}
    </div>
  );
=======
  return <div>{renderBarGraph(totalMarks, obtainedMarks, percentages)}</div>;
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
};

function StudentProgresswithout() {
  const [attendance, setAttendance] = useState([]);
<<<<<<< HEAD
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [studentData, setStudentData] = useState([]);
  const [classes, setClasses] = useState([]);
  const [divisions, setDivisions] = useState(["A", "B", "C", "D"]);
  const [classValue, setClassValue] = useState('');
  const [divisionValue, setDivisionValue] = useState('');

  const [language, setLanguage] = useState(localStorage.getItem('language') || 'English');
=======
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [studentData, setStudentData] = useState([]);
  const [classes, setClasses] = useState([]);
  const [divisions, setDivisions] = useState(["A", "B", "C", "D"]);
  const [classValue, setClassValue] = useState("");
  const [divisionValue, setDivisionValue] = useState("");

  const [language, setLanguage] = useState(
    localStorage.getItem("language") || "English",
  );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557

  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [academicYear, setAcademicYear] = useState(""); // Default value

  const handleAcademicYearChange = (e) => {
    const selectedYear = e.target.value;
    setAcademicYear(selectedYear);
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

<<<<<<< HEAD

  useEffect(() => {
    const storedLanguage = localStorage.getItem('language') || 'English';
    setLanguage(storedLanguage);
  }, []);


  const [chartData, setChartData] = useState({
    labels: ['Present', 'Absent'],
    datasets: [
      {
        data: [0, 0],
        backgroundColor: ['#36A2EB', '#FF6384'],
=======
  useEffect(() => {
    const storedLanguage = localStorage.getItem("language") || "English";
    setLanguage(storedLanguage);
  }, []);

  const [chartData, setChartData] = useState({
    labels: ["Present", "Absent"],
    datasets: [
      {
        data: [0, 0],
        backgroundColor: ["#36A2EB", "#FF6384"],
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      },
    ],
  });

  const udiseNumber = localStorage.getItem("udiseNumber");

  useEffect(() => {
    fetchStudentData();
  }, []);

<<<<<<< HEAD
  const DB_NAME = 'SchoolManagementDB';
  const STUDENT_STORE = 'studentData';
=======
  const DB_NAME = "SchoolManagementDB";
  const STUDENT_STORE = "studentData";
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  const DB_VERSION = 1;

  const openDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = (event) => reject(event.target.error);
      request.onsuccess = (event) => resolve(event.target.result);
    });
  };

  const fetchStudentData = async () => {
    try {
      let fetchedStudents = [];
<<<<<<< HEAD
      
      // 1. Try to fetch from Firebase
      try {
        const response = await fetch(
          `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData.json`
=======

      // 1. Try to fetch from Firebase
      try {
        const response = await fetch(
          `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData.json`,
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
        );
        if (response.ok) {
          const data = await response.json();
          if (data) {
            fetchedStudents = Object.keys(data)
<<<<<<< HEAD
              .filter(key => data[key] !== null)
              .map(key => ({ srNo: key, ...data[key] }));
          }
        }
      } catch (firebaseError) {
        console.warn('Firebase fetch student data failed, will check IndexedDB:', firebaseError);
=======
              .filter((key) => data[key] !== null)
              .map((key) => ({ srNo: key, ...data[key] }));
          }
        }
      } catch (firebaseError) {
        console.warn(
          "Firebase fetch student data failed, will check IndexedDB:",
          firebaseError,
        );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      }

      // 2. Try to fetch from IndexedDB if Firebase had no data
      if (fetchedStudents.length === 0) {
        try {
          const db = await openDB();
          const transaction = db.transaction(STUDENT_STORE, "readonly");
          const store = transaction.objectStore(STUDENT_STORE);
          const request = store.getAll();

          const idbStudents = await new Promise((resolve, reject) => {
            request.onsuccess = (event) => resolve(event.target.result || []);
            request.onerror = (event) => reject(event.target.error);
          });

          if (idbStudents && idbStudents.length > 0) {
            fetchedStudents = idbStudents.map((student) => {
              // Extract class, division, and srNo from id if not present
              const keyParts = student.id ? student.id.split("-") : [];
              const className = keyParts[0] || "";
              const division = keyParts[1] || "";
              const srNo = keyParts[2] || "";
              return {
                ...student,
                currentClass: student.currentClass || className,
                division: student.division || division,
<<<<<<< HEAD
                srNo: student.srNo || srNo
=======
                srNo: student.srNo || srNo,
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
              };
            });
          }
        } catch (idbError) {
<<<<<<< HEAD
          console.warn('IndexedDB fetch student data failed:', idbError);
=======
          console.warn("IndexedDB fetch student data failed:", idbError);
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
        }
      }

      // Filter active students
<<<<<<< HEAD
      const activeStudents = fetchedStudents.filter(student => student.isActive !== false);
=======
      const activeStudents = fetchedStudents.filter(
        (student) => student.isActive !== false,
      );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      setStudentData(activeStudents);

      const classSet = new Set();
      activeStudents.forEach((student) => {
        if (student.currentClass) {
          classSet.add(String(student.currentClass));
        }
      });
      setClasses(Array.from(classSet));
    } catch (error) {
<<<<<<< HEAD
      console.error('Error fetching student data:', error);
=======
      console.error("Error fetching student data:", error);
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
    }
  };

  const handleClassChange = (e) => {
    const selectedClass = e.target.value;
    setClassValue(selectedClass);
    const divisionSet = new Set();
    studentData.forEach((student) => {
      if (student.currentClass === selectedClass && student.division) {
        divisionSet.add(student.division);
      }
    });

    if (divisionSet.size === 0 && selectedClass) {
      // Fallback divisions if none found in student data
      setDivisions(["A", "B", "C", "D"]);
    } else {
      setDivisions([...divisionSet]);
    }
<<<<<<< HEAD
    setDivisionValue('');
=======
    setDivisionValue("");
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  };

  const handleDivisionChange = (e) => {
    setDivisionValue(e.target.value);
  };

<<<<<<< HEAD


=======
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  useEffect(() => {
    if (classValue && divisionValue) {
      const currentDate = new Date(selectedDate);
      const year = currentDate.getFullYear();
<<<<<<< HEAD
      const month = currentDate.toLocaleString('default', { month: 'short' });
=======
      const month = currentDate.toLocaleString("default", { month: "short" });
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      const day = currentDate.getDate();

      fetchAttendanceData(year, month, day);
    }
  }, [classValue, divisionValue, selectedDate]);

  const fetchAttendanceData = async (year, month, day) => {
    if (!classValue || !divisionValue) {
<<<<<<< HEAD
      setAlertMessage('Please select both class and division.');
=======
      setAlertMessage("Please select both class and division.");
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      return;
    }

    try {
      const filteredStudents = studentData.filter(
<<<<<<< HEAD
        (student) => student.currentClass === classValue && student.division === divisionValue
=======
        (student) =>
          student.currentClass === classValue &&
          student.division === divisionValue,
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      );

      const attendancePromises = filteredStudents.map(async (student) => {
        const response = await fetch(
<<<<<<< HEAD
          `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/Attendance/${student.srNo}/Presenty/${year}/${month}/${day}.json`
=======
          `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/Attendance/${student.srNo}/Presenty/${year}/${month}/${day}.json`,
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
        );
        if (!response.ok) {
          console.warn(`Attendance data missing for student: ${student.srNo}`);
          return { srNo: student.srNo, present: false }; // Default as absent if data not found
        }

        const data = await response.json();

<<<<<<< HEAD
        return { srNo: student.srNo, present: data?.present === 'present' };
=======
        return { srNo: student.srNo, present: data?.present === "present" };
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      });

      const fetchedAttendance = await Promise.all(attendancePromises);

      setAttendance(fetchedAttendance);
      calculateChartData(fetchedAttendance);
    } catch (error) {
<<<<<<< HEAD
      console.error('Error fetching attendance:', error);
      setAlertMessage('Failed to fetch attendance data. Please try again.');
=======
      console.error("Error fetching attendance:", error);
      setAlertMessage("Failed to fetch attendance data. Please try again.");
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
    }
  };

  // Fetch height and weight data for students
  // const fetchHeightWeightData = async () => {
  //   try {
  //     const filteredStudents = studentData.filter(
  //       (student) => student.currentClass === classValue && student.division === divisionValue
  //     );

  //     const heightWeightPromises = filteredStudents.map(async (student) => {
  //       const response = await fetch(
  //         `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${student.srNo}.json`
  //       );
  //       if (!response.ok) {
  //         console.warn(`Height and weight data missing for student: ${student.srNo}`);
  //         return { srNo: student.srNo, height: null, weight: null }; // Default as null if data not found
  //       }

  //       const data = await response.json();
  //       const latestMonth = Object.keys(data.weightandHeight).sort((a, b) => new Date(b) - new Date(a))[0];
  //       const height = data.weightandHeight[latestMonth]?.height || null;
  //       const weight = data.weightandHeight[latestMonth]?.weight || null;

<<<<<<< HEAD
      
=======
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  //       return { srNo: student.srNo, height, weight };
  //     });

  //     const fetchedHeightWeightData = await Promise.all(heightWeightPromises);

  //   } catch (error) {
  //     console.error('Error fetching height and weight data:', error);
  //     setAlertMessage('Failed to fetch height and weight data. Please try again.');
  //   }
  // };

<<<<<<< HEAD
  const filteredStudents = studentData.filter(student =>
    student.currentClass === classValue && student.division === divisionValue
=======
  const filteredStudents = studentData.filter(
    (student) =>
      student.currentClass === classValue && student.division === divisionValue,
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  );

  const calculateChartData = (attendanceList) => {
    const totalStudents = filteredStudents.length;
<<<<<<< HEAD
    const presentCount = attendanceList.filter(student => student.present).length;
    const absentCount = totalStudents - presentCount;

    const data = {
      labels: ['Present', 'Absent'],
      datasets: [
        {
          data: [presentCount, absentCount],
          backgroundColor: ['#36A2EB', '#FF6384'],
=======
    const presentCount = attendanceList.filter(
      (student) => student.present,
    ).length;
    const absentCount = totalStudents - presentCount;

    const data = {
      labels: ["Present", "Absent"],
      datasets: [
        {
          data: [presentCount, absentCount],
          backgroundColor: ["#36A2EB", "#FF6384"],
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
        },
      ],
    };
    setChartData(data);
  };

<<<<<<< HEAD


=======
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  const sortClasses = (classes, language) => {
    const classOrder = {
      "Class I": 1,
      "Class II": 2,
      "Class III": 3,
      "Class IV": 4,
      "Class V": 5,
      "Class VI": 6,
      "Class VII": 7,
      "Class VIII": 8,
      "Class IX": 9,
      "Class X": 10,
      "Class XI": 11,
      "Class XII": 12,

      "1st": 1,
      "2nd": 2,
      "3rd": 3,
      "4th": 4,
      "5th": 5,
      "6th": 6,
      "7th": 7,
      "8th": 8,
      "9th": 9,
      "10th": 10,
      "11th": 11,
      "12th": 12,

      "इयत्ता पहिली": 1,
      "इयत्ता दुसरी": 2,
      "इयत्ता तिसरी": 3,
      "इयत्ता चौथी": 4,
      "इयत्ता पाचवी": 5,
      "इयत्ता सहावी": 6,
      "इयत्ता सातवी": 7,
      "इयत्ता आठवी": 8,
      "इयत्ता नववी": 9,
      "इयत्ता दहावी": 10,
      "इयत्ता अकरावी": 11,
      "इयत्ता बारावी": 12,

<<<<<<< HEAD
      
      "पहिली": 1,
      "दुसरी": 2,
      "तिसरी": 3,
      "चौथी": 4,
      "पाचवी": 5,
      "सहावी": 6,
      "सातवी": 7,
      "आठवी": 8,
      "नववी": 9,
      "दहावी": 10,
      "अकरावी": 11,
      "बारावी": 12,
    };

    return classes.sort((a, b) => (classOrder[a] || 99) - (classOrder[b] || 99));
=======
      पहिली: 1,
      दुसरी: 2,
      तिसरी: 3,
      चौथी: 4,
      पाचवी: 5,
      सहावी: 6,
      सातवी: 7,
      आठवी: 8,
      नववी: 9,
      दहावी: 10,
      अकरावी: 11,
      बारावी: 12,
    };

    return classes.sort(
      (a, b) => (classOrder[a] || 99) - (classOrder[b] || 99),
    );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  };

  useEffect(() => {
    if (classValue && divisionValue && academicYear) {
<<<<<<< HEAD
      fetchAndCalculateMarksData(studentData, classValue, divisionValue, udiseNumber, academicYear);
    }
  }, [classValue, divisionValue, academicYear]);


  const openPopup = async (student) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${student.srNo}.json`
      );
      if (!response.ok) throw new Error('Failed to fetch student data');
=======
      fetchAndCalculateMarksData(
        studentData,
        classValue,
        divisionValue,
        udiseNumber,
        academicYear,
      );
    }
  }, [classValue, divisionValue, academicYear]);

  const openPopup = async (student) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${student.srNo}.json`,
      );
      if (!response.ok) throw new Error("Failed to fetch student data");
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557

      const data = await response.json();

      if (!data) {
        setSelectedStudent({ noData: true });
        setShowPopup(true);
        return;
      }

      let missingData = [];

<<<<<<< HEAD
      if (!data.weightandHeight || Object.keys(data.weightandHeight).length === 0) {
        console.error('Student data is missing or does not have a weightandHeight property');
        missingData.push('height and weight');
      }

      const latestMonth = Object.keys(data.weightandHeight || {}).sort((a, b) => new Date(b) - new Date(a))[0];
=======
      if (
        !data.weightandHeight ||
        Object.keys(data.weightandHeight).length === 0
      ) {
        console.error(
          "Student data is missing or does not have a weightandHeight property",
        );
        missingData.push("height and weight");
      }

      const latestMonth = Object.keys(data.weightandHeight || {}).sort(
        (a, b) => new Date(b) - new Date(a),
      )[0];
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      const height = data.weightandHeight?.[latestMonth]?.height || 0;
      const weight = data.weightandHeight?.[latestMonth]?.weight || 0;

      if (!height || !weight) {
<<<<<<< HEAD
        console.error('Student data is missing height or weight property');
        missingData.push('height and weight');
      }

      const attendanceResponse = await fetch(
        `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/Attendance/${student.srNo}/Presenty.json`
      );
      if (!attendanceResponse.ok) throw new Error('Failed to fetch attendance data');
=======
        console.error("Student data is missing height or weight property");
        missingData.push("height and weight");
      }

      const attendanceResponse = await fetch(
        `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/Attendance/${student.srNo}/Presenty.json`,
      );
      if (!attendanceResponse.ok)
        throw new Error("Failed to fetch attendance data");
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557

      const attendanceData = await attendanceResponse.json();
      const monthlyAttendance = {};

      for (const year in attendanceData) {
        for (const month in attendanceData[year]) {
          let presentDays = Object.values(attendanceData[year][month]).filter(
<<<<<<< HEAD
            (day) => day?.present === 'present'
=======
            (day) => day?.present === "present",
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
          ).length;
          monthlyAttendance[month] = presentDays; // Month-wise data processing
        }
      }

<<<<<<< HEAD

      const resultResponse = await fetch(
        `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${student.srNo}/result/${academicYear}.json`
      );
      if (!resultResponse.ok) throw new Error('Failed to fetch results');

      const results = await resultResponse.json();

      const totalMarks = JSON.parse(localStorage.getItem('totalMarks')) || {};
      const totalObtainedMarks = JSON.parse(localStorage.getItem('totalObtainedMarks')) || {};
      const percentages = JSON.parse(localStorage.getItem('percentages')) || {};

      Object.keys(totalObtainedMarks[student.srNo] || {}).forEach((semester) => {
        });

      if (missingData.length > 0) {
        setAlertMessage(`Missing data: ${missingData.join(', ')}. Please fill that data.`);
        setShowAlert(true);
      }

      setSelectedStudent({ ...data, attendanceRecords: monthlyAttendance, height, weight, results, academicYear, totalMarks: totalMarks[student.srNo], totalObtainedMarks: totalObtainedMarks[student.srNo], percentages: percentages[student.srNo] });
      setShowPopup(true);
    } catch (error) {
      console.error('Error fetching student data:', error);
=======
      const resultResponse = await fetch(
        `${process.env.REACT_APP_FIREBASE_DATABASE_URL}/schoolRegister/${udiseNumber}/studentData/${student.srNo}/result/${academicYear}.json`,
      );
      if (!resultResponse.ok) throw new Error("Failed to fetch results");

      const results = await resultResponse.json();

      const totalMarks = JSON.parse(localStorage.getItem("totalMarks")) || {};
      const totalObtainedMarks =
        JSON.parse(localStorage.getItem("totalObtainedMarks")) || {};
      const percentages = JSON.parse(localStorage.getItem("percentages")) || {};

      Object.keys(totalObtainedMarks[student.srNo] || {}).forEach(
        (semester) => {},
      );

      if (missingData.length > 0) {
        setAlertMessage(
          `Missing data: ${missingData.join(", ")}. Please fill that data.`,
        );
        setShowAlert(true);
      }

      setSelectedStudent({
        ...data,
        attendanceRecords: monthlyAttendance,
        height,
        weight,
        results,
        academicYear,
        totalMarks: totalMarks[student.srNo],
        totalObtainedMarks: totalObtainedMarks[student.srNo],
        percentages: percentages[student.srNo],
      });
      setShowPopup(true);
    } catch (error) {
      console.error("Error fetching student data:", error);
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      setSelectedStudent({ noData: true });
      setShowPopup(true);
    }
  };

<<<<<<< HEAD
  const renderBarGraph = (totalMarks = {}, totalObtainedMarks = {}, percentages = {}) => {
    const exams = ['First Semester', 'Second Semester'];
  
=======
  const renderBarGraph = (
    totalMarks = {},
    totalObtainedMarks = {},
    percentages = {},
  ) => {
    const exams = ["First Semester", "Second Semester"];

>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
    return (
      <Bar
        data={{
          labels: exams,
          datasets: [
            {
<<<<<<< HEAD
              label: 'Total Marks',
              data: exams.map(exam => totalMarks[exam] ?? 0),
              backgroundColor: 'rgba(8, 5, 175, 0.2)',
              borderColor: '#36A2EB',
              fill: true,
            },
            {
              label: 'Total Obtained Marks',
              data: exams.map(exam => totalObtainedMarks[exam] ?? 0),
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
              borderColor: '#36A2EB',
              fill: true,
            },
            {
              label: 'Percentage',
              data: exams.map(exam => (percentages[exam] !== undefined && !isNaN(percentages[exam])) ? parseFloat(percentages[exam]) : 0),
              backgroundColor: 'rgba(200, 6, 6, 0.2)',
              borderColor: '#FF6384',
              fill: true,
              yAxisID: 'y-percentage',
=======
              label: "Total Marks",
              data: exams.map((exam) => totalMarks[exam] ?? 0),
              backgroundColor: "rgba(8, 5, 175, 0.2)",
              borderColor: "#36A2EB",
              fill: true,
            },
            {
              label: "Total Obtained Marks",
              data: exams.map((exam) => totalObtainedMarks[exam] ?? 0),
              backgroundColor: "rgba(54, 162, 235, 0.2)",
              borderColor: "#36A2EB",
              fill: true,
            },
            {
              label: "Percentage",
              data: exams.map((exam) =>
                percentages[exam] !== undefined && !isNaN(percentages[exam])
                  ? parseFloat(percentages[exam])
                  : 0,
              ),
              backgroundColor: "rgba(200, 6, 6, 0.2)",
              borderColor: "#FF6384",
              fill: true,
              yAxisID: "y-percentage",
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
            },
          ],
        }}
        options={{
          responsive: true,
          plugins: {
<<<<<<< HEAD
            legend: { position: 'top' },
            title: { display: true, text: 'Exam Performance' },
=======
            legend: { position: "top" },
            title: { display: true, text: "Exam Performance" },
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
          },
          scales: {
            y: {
              ticks: { stepSize: 25 },
              beginAtZero: true,
            },
<<<<<<< HEAD
            'y-percentage': {
              type: 'linear',
              position: 'right',
              ticks: {
                callback: function(value) {
                  return value + '%';
=======
            "y-percentage": {
              type: "linear",
              position: "right",
              ticks: {
                callback: function (value) {
                  return value + "%";
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                },
                stepSize: 10,
                beginAtZero: true,
              },
              grid: {
                drawOnChartArea: false,
              },
            },
          },
        }}
      />
    );
  };
<<<<<<< HEAD
  
  const fetchStoredData = () => {
    const results = JSON.parse(localStorage.getItem("result")) || {};
  
    const academicYear = Object.keys(results)[0]; // Assuming latest year is the first key
  
=======

  const fetchStoredData = () => {
    const results = JSON.parse(localStorage.getItem("result")) || {};

    const academicYear = Object.keys(results)[0]; // Assuming latest year is the first key

>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
    if (!academicYear || !results[academicYear]) {
      console.warn("No valid academic year data found in localStorage");
      return { totalMarks: {}, totalObtainedMarks: {}, percentages: {} };
    }
<<<<<<< HEAD
  
    const totalMarks = {};
    const totalObtainedMarks = {};
    const percentages = {};
  
=======

    const totalMarks = {};
    const totalObtainedMarks = {};
    const percentages = {};

>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
    Object.entries(results[academicYear]).forEach(([exam, data]) => {
      if (exam.startsWith("Semester")) {
        // Handle nested structure for Semester First and Semester Second
        let totalOutOf = 0;
        let totalObtained = 0;
<<<<<<< HEAD
  
        Object.values(data).forEach(subject => {
          if (subject && subject.obtainedMarks !== undefined && subject.maxMarks !== undefined) {
=======

        Object.values(data).forEach((subject) => {
          if (
            subject &&
            subject.obtainedMarks !== undefined &&
            subject.maxMarks !== undefined
          ) {
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
            totalOutOf += subject.maxMarks;
            totalObtained += subject.obtainedMarks;
          }
        });
<<<<<<< HEAD
  
        totalMarks[exam] = totalOutOf;
        totalObtainedMarks[exam] = totalObtained;
        percentages[exam] = totalOutOf > 0 ? (totalObtained / totalOutOf) * 100 : 0;
=======

        totalMarks[exam] = totalOutOf;
        totalObtainedMarks[exam] = totalObtained;
        percentages[exam] =
          totalOutOf > 0 ? (totalObtained / totalOutOf) * 100 : 0;
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      } else {
        // Handle normal unit tests
        totalMarks[exam] = data.totalOutOf || 0;
        totalObtainedMarks[exam] = data.totalObtainedMarks || 0;
<<<<<<< HEAD
        percentages[exam] = (typeof data.percentages === "number" && !isNaN(data.percentages))
          ? parseFloat(data.percentages)
          : 0;
      }
    });
  
  
    return { totalMarks, totalObtainedMarks, percentages };
  };
  
=======
        percentages[exam] =
          typeof data.percentages === "number" && !isNaN(data.percentages)
            ? parseFloat(data.percentages)
            : 0;
      }
    });

    return { totalMarks, totalObtainedMarks, percentages };
  };

>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  const FullReport = () => {
    const [totalMarks, setTotalMarks] = useState({});
    const [obtainedMarks, setObtainedMarks] = useState({});
    const [percentages, setPercentages] = useState({});
    const [loading, setLoading] = useState(true);
<<<<<<< HEAD
  
    useEffect(() => {
      const { totalMarks, totalObtainedMarks, percentages } = fetchStoredData();
  
=======

    useEffect(() => {
      const { totalMarks, totalObtainedMarks, percentages } = fetchStoredData();

>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      setTotalMarks(totalMarks);
      setObtainedMarks(totalObtainedMarks);
      setPercentages(percentages);
      setLoading(false);
    }, []);
<<<<<<< HEAD
  
    if (loading) {
      return <p>Loading data...</p>;
    }
  
    return (
      <div>
        {renderBarGraph(totalMarks, obtainedMarks, percentages)}
      </div>
    );
  };
  
=======

    if (loading) {
      return <p>Loading data...</p>;
    }

    return <div>{renderBarGraph(totalMarks, obtainedMarks, percentages)}</div>;
  };
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557

  // Close popup
  const closePopup = () => {
    setShowPopup(false);
    setSelectedStudent(null);
  };

  return (
<<<<<<< HEAD
    <div style={{ padding: '0px', fontFamily: 'Arial, sans-serif', width: '100%' }}>
      <AlertMessage message={alertMessage} show={showAlert} />

      <div style={{ width: '100%' }}>
        <h2 style={{ color: '#0c2a52', textAlign: 'center', fontWeight: 'bold', marginBottom: '20px', fontSize: '24px' }}>
          {language === "English" ? "Student Progress Report" : "विद्यार्थी प्रगती अहवाल"}
        </h2>

        <div style={{ width: '100%', marginBottom: '20px' }}>
          <table className="table table-bordered" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', border: '1px solid #cbd5e1' }}>
            <tbody>
              <tr>
                <th style={{ backgroundColor: '#b5d3f2', color: '#0c2a52', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', width: '25%', padding: '12px', border: '1px solid #cbd5e1' }}>
                  {language === "English" ? "Class" : "वर्ग"}
                </th>
                <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>
=======
    <div
      style={{ padding: "0px", fontFamily: "Arial, sans-serif", width: "100%" }}
    >
      <AlertMessage message={alertMessage} show={showAlert} />

      <div style={{ width: "100%" }}>
        <h2
          style={{
            color: "#0c2a52",
            textAlign: "center",
            fontWeight: "bold",
            marginBottom: "20px",
            fontSize: "24px",
          }}
        >
          {language === "English"
            ? "Student Progress Report"
            : "विद्यार्थी प्रगती अहवाल"}
        </h2>

        <div style={{ width: "100%", marginBottom: "20px" }}>
          <table
            className="table table-bordered"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: "20px",
              border: "1px solid #cbd5e1",
            }}
          >
            <tbody>
              <tr>
                <th
                  style={{
                    backgroundColor: "#b5d3f2",
                    color: "#0c2a52",
                    textAlign: "center",
                    verticalAlign: "middle",
                    fontWeight: "bold",
                    width: "25%",
                    padding: "12px",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  {language === "English" ? "Class" : "वर्ग"}
                </th>
                <td style={{ padding: "8px", border: "1px solid #cbd5e1" }}>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  <select
                    id="class"
                    value={classValue}
                    onChange={handleClassChange}
                    className="form-control custom-select"
<<<<<<< HEAD
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', outline: 'none' }}
                  >
                    <option value="">{language === "English" ? "Select Class" : "वर्ग निवडा"}</option>
                    {(() => {
                      const defaultClasses = language === "English" 
                        ? ["Class I", "Class II", "Class III", "Class IV", "Class V", "Class VI", "Class VII", "Class VIII", "Class IX", "Class X"]
                        : ["इयत्ता पहिली", "इयत्ता दुसरी", "इयत्ता तिसरी", "इयत्ता चौथी", "इयत्ता पाचवी", "इयत्ता सहावी", "इयत्ता सातवी", "इयत्ता आठवी", "इयत्ता नववी", "इयत्ता दहावी"];
                      const classesToRender = classes.length > 0 ? classes : defaultClasses;
                      return sortClasses(classesToRender.filter(cls => cls && cls.trim() !== ""), language).map((cls, index) => (
=======
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      outline: "none",
                    }}
                  >
                    <option value="">
                      {language === "English" ? "Select Class" : "वर्ग निवडा"}
                    </option>
                    {(() => {
                      const defaultClasses =
                        language === "English"
                          ? [
                              "Class I",
                              "Class II",
                              "Class III",
                              "Class IV",
                              "Class V",
                              "Class VI",
                              "Class VII",
                              "Class VIII",
                              "Class IX",
                              "Class X",
                            ]
                          : [
                              "इयत्ता पहिली",
                              "इयत्ता दुसरी",
                              "इयत्ता तिसरी",
                              "इयत्ता चौथी",
                              "इयत्ता पाचवी",
                              "इयत्ता सहावी",
                              "इयत्ता सातवी",
                              "इयत्ता आठवी",
                              "इयत्ता नववी",
                              "इयत्ता दहावी",
                            ];
                      const classesToRender =
                        classes.length > 0 ? classes : defaultClasses;
                      return sortClasses(
                        classesToRender.filter(
                          (cls) => cls && cls.trim() !== "",
                        ),
                        language,
                      ).map((cls, index) => (
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                        <option key={index} value={cls}>
                          {cls}
                        </option>
                      ));
                    })()}
                  </select>
                </td>
              </tr>

              <tr>
<<<<<<< HEAD
                <th style={{ backgroundColor: '#b5d3f2', color: '#0c2a52', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', padding: '12px', border: '1px solid #cbd5e1' }}>
                  {language === "English" ? "Division" : "तुकडी"}
                </th>
                <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>
=======
                <th
                  style={{
                    backgroundColor: "#b5d3f2",
                    color: "#0c2a52",
                    textAlign: "center",
                    verticalAlign: "middle",
                    fontWeight: "bold",
                    padding: "12px",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  {language === "English" ? "Division" : "तुकडी"}
                </th>
                <td style={{ padding: "8px", border: "1px solid #cbd5e1" }}>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  <select
                    id="division"
                    value={divisionValue}
                    onChange={handleDivisionChange}
                    className="form-control custom-select"
<<<<<<< HEAD
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', outline: 'none' }}
                  >
                    <option value="">{language === "English" ? "Select Division" : "तुकडी निवडा"}</option>
=======
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      outline: "none",
                    }}
                  >
                    <option value="">
                      {language === "English"
                        ? "Select Division"
                        : "तुकडी निवडा"}
                    </option>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                    {divisions.map((div, index) => (
                      <option key={index} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>

              <tr>
<<<<<<< HEAD
                <th style={{ backgroundColor: '#b5d3f2', color: '#0c2a52', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', padding: '12px', border: '1px solid #cbd5e1' }}>
                  {language === "English" ? "Year" : "शैक्षणिक वर्ष"}
                </th>
                <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>
=======
                <th
                  style={{
                    backgroundColor: "#b5d3f2",
                    color: "#0c2a52",
                    textAlign: "center",
                    verticalAlign: "middle",
                    fontWeight: "bold",
                    padding: "12px",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  {language === "English" ? "Year" : "शैक्षणिक वर्ष"}
                </th>
                <td style={{ padding: "8px", border: "1px solid #cbd5e1" }}>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  <select
                    id="academicYear"
                    defaultValue={academicYear}
                    value={academicYear}
                    onChange={handleAcademicYearChange}
                    className="form-control custom-select"
<<<<<<< HEAD
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', outline: 'none' }}
                  >
                    <option value="">{language === "English" ? "Select Year" : "वर्ष निवडा"}</option>
=======
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      outline: "none",
                    }}
                  >
                    <option value="">
                      {language === "English" ? "Select Year" : "वर्ष निवडा"}
                    </option>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                    <option value="2023-2024">2023-2024</option>
                    <option value="2024-2025">2024-2025</option>
                    <option value="2025-2026">2025-2026</option>
                    <option value="2026-2027">2026-2027</option>
                    <option value="2027-2028">2027-2028</option>
                    <option value="2028-2029">2028-2029</option>
                    <option value="2029-2030">2029-2030</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

<<<<<<< HEAD
        <div style={{ maxHeight: '400px', overflowY: 'auto', width: '100%' }}>
          <table
            className={`table table-striped table-bordered ${!(classValue && divisionValue) ? 'disabled-table' : ''}`}
            style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1' }}
          >
            <thead>
              <tr>
                <th style={{ backgroundColor: '#b5d3f2', color: '#0c2a52', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', width: '20%', padding: '12px', border: '1px solid #cbd5e1' }}>
                  {language === "English" ? "Roll No" : "हजेरी क्र."}
                </th>
                <th style={{ backgroundColor: '#b5d3f2', color: '#0c2a52', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', width: '60%', padding: '12px', border: '1px solid #cbd5e1' }}>
                  {language === "English" ? "Name" : "नाव"}
                </th>
                <th style={{ backgroundColor: '#b5d3f2', color: '#0c2a52', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', width: '20%', padding: '12px', border: '1px solid #cbd5e1' }}>
=======
        <div style={{ maxHeight: "400px", overflowY: "auto", width: "100%" }}>
          <table
            className={`table table-striped table-bordered ${!(classValue && divisionValue) ? "disabled-table" : ""}`}
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #cbd5e1",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    backgroundColor: "#b5d3f2",
                    color: "#0c2a52",
                    textAlign: "center",
                    verticalAlign: "middle",
                    fontWeight: "bold",
                    width: "20%",
                    padding: "12px",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  {language === "English" ? "Roll No" : "हजेरी क्र."}
                </th>
                <th
                  style={{
                    backgroundColor: "#b5d3f2",
                    color: "#0c2a52",
                    textAlign: "center",
                    verticalAlign: "middle",
                    fontWeight: "bold",
                    width: "60%",
                    padding: "12px",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  {language === "English" ? "Name" : "नाव"}
                </th>
                <th
                  style={{
                    backgroundColor: "#b5d3f2",
                    color: "#0c2a52",
                    textAlign: "center",
                    verticalAlign: "middle",
                    fontWeight: "bold",
                    width: "20%",
                    padding: "12px",
                    border: "1px solid #cbd5e1",
                  }}
                >
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  {language === "English" ? "Report" : "अहवाल"}
                </th>
              </tr>
            </thead>
            <tbody>
              {classValue && divisionValue ? (
                filteredStudents
                  .sort((a, b) => a.rollNo - b.rollNo)
                  .map((student) => (
                    <tr key={student.srNo}>
<<<<<<< HEAD
                      <td style={{ padding: '10px', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #cbd5e1' }}>{student.rollNo}</td>
                      <td style={{ padding: '10px', textAlign: 'left', verticalAlign: 'middle', border: '1px solid #cbd5e1' }}>
                        {student.stdName} {student.stdFather} {student.stdSurname}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #cbd5e1' }}>
                        <button
                          onClick={() => openPopup(student)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#0d6efd',
                            cursor: 'pointer',
                            fontSize: '1.1rem'
=======
                      <td
                        style={{
                          padding: "10px",
                          textAlign: "center",
                          verticalAlign: "middle",
                          border: "1px solid #cbd5e1",
                        }}
                      >
                        {student.rollNo}
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          textAlign: "left",
                          verticalAlign: "middle",
                          border: "1px solid #cbd5e1",
                        }}
                      >
                        {student.stdName} {student.stdFather}{" "}
                        {student.stdSurname}
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          textAlign: "center",
                          verticalAlign: "middle",
                          border: "1px solid #cbd5e1",
                        }}
                      >
                        <button
                          onClick={() => openPopup(student)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#0d6efd",
                            cursor: "pointer",
                            fontSize: "1.1rem",
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                          }}
                        >
                          <i className="fa-solid fa-arrow-trend-up"></i>
                        </button>
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
<<<<<<< HEAD
                  <td colSpan="3" className="text-center" style={{ padding: '20px', color: '#64748b', fontStyle: 'italic', border: '1px solid #cbd5e1' }}>
=======
                  <td
                    colSpan="3"
                    className="text-center"
                    style={{
                      padding: "20px",
                      color: "#64748b",
                      fontStyle: "italic",
                      border: "1px solid #cbd5e1",
                    }}
                  >
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                    {language === "English"
                      ? "Please select class and division to view students"
                      : "विद्यार्थ्यांना पाहण्यासाठी वर्ग आणि तुकडी निवडा"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showPopup && selectedStudent && (
<<<<<<< HEAD
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backdropFilter: 'blur(5px)',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.3s ease-in-out',
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(135deg, #f0f4ff, #dff6ff)',
            padding: '40px',
            borderRadius: '20px',
            width: '90%',
            maxWidth: '1220px',
            height: 'auto',
            position: 'relative',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
            animation: 'slideUp 0.4s ease-in-out',
          }}>
            <button
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'transparent',
                border: 'none',
                fontSize: '26px',
                cursor: 'pointer',
                color: '#ff4d4d',
                transition: 'color 0.3s',
              }} 
              onClick={closePopup}
              onMouseEnter={(e) => e.target.style.color = '#d63031'}
              onMouseLeave={(e) => e.target.style.color = '#ff4d4d'}
=======
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backdropFilter: "blur(5px)",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            animation: "fadeIn 0.3s ease-in-out",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: "linear-gradient(135deg, #f0f4ff, #dff6ff)",
              padding: "40px",
              borderRadius: "20px",
              width: "90%",
              maxWidth: "1220px",
              height: "auto",
              position: "relative",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
              animation: "slideUp 0.4s ease-in-out",
            }}
          >
            <button
              style={{
                position: "absolute",
                top: "15px",
                right: "15px",
                background: "transparent",
                border: "none",
                fontSize: "26px",
                cursor: "pointer",
                color: "#ff4d4d",
                transition: "color 0.3s",
              }}
              onClick={closePopup}
              onMouseEnter={(e) => (e.target.style.color = "#d63031")}
              onMouseLeave={(e) => (e.target.style.color = "#ff4d4d")}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
            >
              ×
            </button>

            {selectedStudent.noData ? (
<<<<<<< HEAD
              <div style={{ textAlign: 'center', color: '#ff4d4d', fontSize: '25px' }}>
=======
              <div
                style={{
                  textAlign: "center",
                  color: "#ff4d4d",
                  fontSize: "25px",
                }}
              >
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                No data found or present
              </div>
            ) : (
              <div>
<<<<<<< HEAD
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1, paddingRight: '30px' }}>
                    <h2 style={{ marginBottom: '10px', color: '#333', fontWeight: 'bold' }}>
                      {`${selectedStudent.stdName} ${selectedStudent.stdFather} ${selectedStudent.stdSurname}`}
                    </h2>
                    <p style={{ marginBottom: '5px', fontSize: '18px', color: '#555' }}>
                      <strong>Register No:</strong> {selectedStudent.registerNo}
                    </p>
                    <p style={{ marginBottom: '5px', fontSize: '18px', color: '#555' }}>
                      <strong>Roll No:</strong> {selectedStudent.rollNo}
                    </p>
                    <p style={{ marginBottom: '20px', fontSize: '18px', color: '#555' }}>
                      <strong>Academic Year:</strong> {selectedStudent.academicYear}
                    </p>
                    {selectedStudent.photo && (
                      <div style={{
                        width: '200px',
                        height: '200px',
                        overflow: 'hidden',
                        borderRadius: '50%',
                        border: '5px solid #36A2EB',
                        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.2)',
                      }}>
                        <img src={selectedStudent.photo} alt="Student" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
=======
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ flex: 1, paddingRight: "30px" }}>
                    <h2
                      style={{
                        marginBottom: "10px",
                        color: "#333",
                        fontWeight: "bold",
                      }}
                    >
                      {`${selectedStudent.stdName} ${selectedStudent.stdFather} ${selectedStudent.stdSurname}`}
                    </h2>
                    <p
                      style={{
                        marginBottom: "5px",
                        fontSize: "18px",
                        color: "#555",
                      }}
                    >
                      <strong>Register No:</strong> {selectedStudent.registerNo}
                    </p>
                    <p
                      style={{
                        marginBottom: "5px",
                        fontSize: "18px",
                        color: "#555",
                      }}
                    >
                      <strong>Roll No:</strong> {selectedStudent.rollNo}
                    </p>
                    <p
                      style={{
                        marginBottom: "20px",
                        fontSize: "18px",
                        color: "#555",
                      }}
                    >
                      <strong>Academic Year:</strong>{" "}
                      {selectedStudent.academicYear}
                    </p>
                    {selectedStudent.photo && (
                      <div
                        style={{
                          width: "200px",
                          height: "200px",
                          overflow: "hidden",
                          borderRadius: "50%",
                          border: "5px solid #36A2EB",
                          boxShadow: "0 5px 15px rgba(0, 0, 0, 0.2)",
                        }}
                      >
                        <img
                          src={selectedStudent.photo}
                          alt="Student"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                      </div>
                    )}
                  </div>

<<<<<<< HEAD
                  <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'start', width: '47%', height: '280px', marginRight: '20px' }}>
                    <Line
                      data={generateAttendanceChartData(selectedStudent.attendanceRecords)}
=======
                  <div
                    style={{
                      display: "flex",
                      alignItems: "start",
                      justifyContent: "start",
                      width: "47%",
                      height: "280px",
                      marginRight: "20px",
                    }}
                  >
                    <Line
                      data={generateAttendanceChartData(
                        selectedStudent.attendanceRecords,
                      )}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                      options={{
                        responsive: true,
                        plugins: {
                          legend: { display: false },
<<<<<<< HEAD
                          title: { display: true, text: 'Monthly Attendance' },
=======
                          title: { display: true, text: "Monthly Attendance" },
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                        },
                        scales: {
                          x: {
                            title: {
                              display: true,
<<<<<<< HEAD
                              text: 'Month'
                            }
=======
                              text: "Month",
                            },
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                          },
                          y: {
                            title: {
                              display: true,
<<<<<<< HEAD
                              text: 'Attendance'
=======
                              text: "Attendance",
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                            },
                            min: 1,
                            max: 31,
                            ticks: {
<<<<<<< HEAD
                              stepSize: 1
                            }
                          }
                        }
=======
                              stepSize: 1,
                            },
                          },
                        },
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                      }}
                    />
                  </div>
                </div>

<<<<<<< HEAD
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'start' }}>
                  <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'start', width: '47%', height: '280px', marginLeft: '20px' }}>
=======
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "start",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "start",
                      justifyContent: "start",
                      width: "47%",
                      height: "280px",
                      marginLeft: "20px",
                    }}
                  >
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                    <Line
                      data={{
                        datasets: [
                          {
<<<<<<< HEAD
                            label: 'Student Height and Weight',
                            data: selectedStudent.weightandHeight 
          ? Object.keys(selectedStudent.weightandHeight).map((month) => ({
              x: selectedStudent.weightandHeight[month]?.height || 0, // Use optional chaining and default to 0
              y: selectedStudent.weightandHeight[month]?.weight || 0, // Use optional chaining and default to 0
            }))
          : [],
                            backgroundColor: 'rgba(54, 162, 235, 0.2)',
                            borderColor: '#36A2EB',
                            pointRadius: 10,
                            pointHoverRadius: 15,
                            pointHoverBorderWidth: 2,
                            pointHoverBackgroundColor: '#36A2EB',
                            pointHoverBorderColor: '#36A2EB',
                            pointHoverFontColor: '#fff',
                            pointHoverFontFamily: 'Arial',
                            pointHoverFontStyle: 'normal',
                            pointHoverFontSize: 12,
                            pointHoverFontWeight: 'bold',
=======
                            label: "Student Height and Weight",
                            data: selectedStudent.weightandHeight
                              ? Object.keys(
                                  selectedStudent.weightandHeight,
                                ).map((month) => ({
                                  x:
                                    selectedStudent.weightandHeight[month]
                                      ?.height || 0, // Use optional chaining and default to 0
                                  y:
                                    selectedStudent.weightandHeight[month]
                                      ?.weight || 0, // Use optional chaining and default to 0
                                }))
                              : [],
                            backgroundColor: "rgba(54, 162, 235, 0.2)",
                            borderColor: "#36A2EB",
                            pointRadius: 10,
                            pointHoverRadius: 15,
                            pointHoverBorderWidth: 2,
                            pointHoverBackgroundColor: "#36A2EB",
                            pointHoverBorderColor: "#36A2EB",
                            pointHoverFontColor: "#fff",
                            pointHoverFontFamily: "Arial",
                            pointHoverFontStyle: "normal",
                            pointHoverFontSize: 12,
                            pointHoverFontWeight: "bold",
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                            showLine: true,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        plugins: {
<<<<<<< HEAD
                          legend: { position: 'top' },
                          title: { display: true, text: 'Student Height and Weight' },
=======
                          legend: { position: "top" },
                          title: {
                            display: true,
                            text: "Student Height and Weight",
                          },
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                        },
                        scales: {
                          x: {
                            title: {
                              display: true,
<<<<<<< HEAD
                              text: 'Height (cm)'
                            }
=======
                              text: "Height (cm)",
                            },
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                          },
                          y: {
                            title: {
                              display: true,
<<<<<<< HEAD
                              text: 'Weight (kg)'
                            }
                          }
=======
                              text: "Weight (kg)",
                            },
                          },
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                        },
                        interaction: {
                          intersect: false,
                        },
                        hover: {
<<<<<<< HEAD
                          mode: 'nearest',
=======
                          mode: "nearest",
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                          intersect: false,
                          animationDuration: 0,
                        },
                        tooltip: {
                          enabled: true,
<<<<<<< HEAD
                          mode: 'nearest',
=======
                          mode: "nearest",
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                          intersect: false,
                          animationDuration: 0,
                          callbacks: {
                            label: (tooltipItem) => {
                              return `Height: ${tooltipItem.formattedValue}cm`;
                            },
                            footer: (tooltipItem) => {
<<<<<<< HEAD
                              const month = Object.keys(selectedStudent.weightandHeight)[tooltipItem[0].dataIndex];
                              const height = selectedStudent.weightandHeight[month].height;
                              const weight = selectedStudent.weightandHeight[month].weight;
=======
                              const month = Object.keys(
                                selectedStudent.weightandHeight,
                              )[tooltipItem[0].dataIndex];
                              const height =
                                selectedStudent.weightandHeight[month].height;
                              const weight =
                                selectedStudent.weightandHeight[month].weight;
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                              const bmi = weight / (height / 100) ** 2;
                              return `Month: ${month}, Weight: ${weight}kg, BMI: ${bmi.toFixed(2)}`;
                            },
                          },
<<<<<<< HEAD
                        }
=======
                        },
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                      }}
                    />
                  </div>

<<<<<<< HEAD
                  <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'end', width: '50%', height: '280px' }}>
                    {renderBarGraph(selectedStudent.totalMarks, selectedStudent.totalObtainedMarks, selectedStudent.percentages)}
=======
                  <div
                    style={{
                      display: "flex",
                      alignItems: "end",
                      justifyContent: "end",
                      width: "50%",
                      height: "280px",
                    }}
                  >
                    {renderBarGraph(
                      selectedStudent.totalMarks,
                      selectedStudent.totalObtainedMarks,
                      selectedStudent.percentages,
                    )}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
<<<<<<< HEAD

=======
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
    </div>
  );
}

<<<<<<< HEAD

export default StudentProgresswithout;
=======
export default StudentProgresswithout;
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
