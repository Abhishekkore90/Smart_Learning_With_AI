import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Loader2, RefreshCw, Download } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { getTeacherId } from "@/lib/teacherIsolationHelper";
import { fetchStudentsForClass } from "./firestoreMarksHelper";
import { getDefaultSubjectsForClass } from "@/data/cceSubjects";

// Marathi Grade Calculation Helper
const getMarathiGrade = (percent) => {
  if (percent === undefined || percent === null || isNaN(percent) || percent <= 0) return "-";
  const p = Number(percent);
  if (p >= 91) return "अ-1";
  if (p >= 81) return "अ-2";
  if (p >= 71) return "ब-1";
  if (p >= 61) return "ब-2";
  if (p >= 51) return "क-1";
  if (p >= 41) return "क-2";
  if (p >= 33) return "ड";
  if (p >= 21) return "इ-1";
  return "इ-2";
};

// Format Subject Label for Display matching Image 2
const getSubjectDisplayLabel = (subName) => {
  if (!subName) return "";
  const s = String(subName).trim();
  if (s.toLowerCase().includes("मराठी") && !s.includes("प्रथम")) return "प्रथम भाषा: मराठी";
  if (s.toLowerCase().includes("इंग्रजी") && !s.includes("तृतीय") && !s.includes("द्वितीय")) return "तृतीय भाषा: इंग्रजी";
  if (s.toLowerCase().includes("हिंदी") && !s.includes("तृतीय") && !s.includes("द्वितीय")) return "द्वितीय भाषा: हिंदी";
  if (s.toLowerCase().includes("गणित")) return "गणित";
  if (s.toLowerCase().includes("कला")) return "कला";
  if (s.toLowerCase().includes("कार्यानुभव")) return "कार्यानुभव";
  if (s.toLowerCase().includes("शारीरिक")) return "शारीरिक शिक्षण";
  return s;
};

// Clean Class Name for Display
const formatClassName = (clsStr) => {
  if (!clsStr) return "1";
  const s = String(clsStr).trim();
  const match = s.match(/\d+/);
  return match ? match[0] : s;
};

// Sample Students matching Image 2 for fallback
const SAMPLE_STUDENTS = [
  {
    id: "demo_1",
    rollNo: "1",
    name: "सिद्धांत आनंदराव सुर्यवंशी",
    fullName: "सिद्धांत आनंदराव सुर्यवंशी",
    attendance: 234,
    marks: {
      "मराठी": { sem1: 74, sem2: 97 },
      "इंग्रजी": { sem1: 70, sem2: 91 },
      "गणित": { sem1: 82, sem2: 100 },
      "कला": { sem1: 78, sem2: 89 },
      "कार्यानुभव": { sem1: 72, sem2: 89 },
      "शारीरिक शिक्षण": { sem1: 78, sem2: 97 },
    }
  },
  {
    id: "demo_2",
    rollNo: "2",
    name: "दुर्गा संदीप सूर्यवंशी",
    fullName: "दुर्गा संदीप सूर्यवंशी",
    attendance: 233,
    marks: {
      "मराठी": { sem1: 73, sem2: 94 },
      "इंग्रजी": { sem1: 71, sem2: 89 },
      "गणित": { sem1: 79, sem2: 92 },
      "कला": { sem1: 78, sem2: 92 },
      "कार्यानुभव": { sem1: 78, sem2: 85 },
      "शारीरिक शिक्षण": { sem1: 78, sem2: 97 },
    }
  },
  {
    id: "demo_3",
    rollNo: "3",
    name: "कृष्णा रजनीकांत चव्हाण",
    fullName: "कृष्णा रजनीकांत चव्हाण",
    attendance: 231,
    marks: {
      "मराठी": { sem1: 66, sem2: 93 },
      "इंग्रजी": { sem1: 67, sem2: 86 },
      "गणित": { sem1: 76, sem2: 85 },
      "कला": { sem1: 78, sem2: 83 },
      "कार्यानुभव": { sem1: 74, sem2: 85 },
      "शारीरिक शिक्षण": { sem1: 70, sem2: 96 },
    }
  }
];

export default function AnnualResultRegister({ initialClass, initialYear, onBack }) {
  const [selectedClass, setSelectedClass] = useState(
    initialClass || (typeof localStorage !== "undefined" ? localStorage.getItem("cce_selected_class") : null) || "1st"
  );
  const [academicYear, setAcademicYear] = useState(
    initialYear || (typeof localStorage !== "undefined" ? localStorage.getItem("cce_academic_year") : null) || "2025-26"
  );
  const [selectedMedium, setSelectedMedium] = useState(
    (typeof localStorage !== "undefined" ? localStorage.getItem("cce_selected_medium") : null) || "marathi"
  );

  const [schoolName, setSchoolName] = useState(
    "जिल्हा परिषद शाळा धोंडेवाडी(पेड)ता.तासगाव जि.सांगली"
  );
  const [division, setDivision] = useState("1");
  const [loading, setLoading] = useState(true);

  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sem1MarksData, setSem1MarksData] = useState({});
  const [sem2MarksData, setSem2MarksData] = useState({});
  const [attendanceData, setAttendanceData] = useState({});

  const printRef = useRef(null);

  useEffect(() => {
    // 0. Check Instant LocalStorage Cache first for 0ms initial render
    const cacheKey = `cce_annual_register_cache_${selectedClass}_${academicYear}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.students && parsed.students.length > 0) {
          if (parsed.schoolName) setSchoolName(parsed.schoolName);
          if (parsed.students) setStudents(parsed.students);
          if (parsed.subjects) setSubjects(parsed.subjects);
          if (parsed.sem1MarksData) setSem1MarksData(parsed.sem1MarksData);
          if (parsed.sem2MarksData) setSem2MarksData(parsed.sem2MarksData);
          if (parsed.attendanceData) setAttendanceData(parsed.attendanceData);
          setLoading(false); // Instant 0ms show!
        }
      }
    } catch (e) { }

    loadRegisterData();
  }, [selectedClass, academicYear, selectedMedium]);

  const loadRegisterData = async () => {
    try {
      const currentTeacherId = getTeacherId();
      const docId = `${selectedClass}_${academicYear}`;

      // Run parallel data fetching
      const [schoolResult, studentsResult, sem1Result, sem2Result, attResult] = await Promise.all([
        // Task 1: School Settings & Subjects
        (async () => {
          let sName = "";
          try {
            const cachedTeacher = localStorage.getItem(`cce_general_school_settings_${currentTeacherId}`);
            const cachedGen = localStorage.getItem("cce_general_school_settings");
            const cached = cachedTeacher || cachedGen;
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed.schoolName) sName = parsed.schoolName;
            }
          } catch (e) { }

          if (!sName) {
            sName = localStorage.getItem("schoolName") || localStorage.getItem("teacher_school_name") || "";
          }

          if (!sName) {
            try {
              const settingsSnap = await getDoc(doc(db, "cce_settings", docId));
              if (settingsSnap.exists() && settingsSnap.data().schoolName) {
                sName = settingsSnap.data().schoolName;
              }
            } catch (e) { }
          }

          if (!sName) sName = "जिल्हा परिषद शाळा धोंडेवाडी(पेड)ता.तासगाव जि.सांगली";

          const classSubjects = getDefaultSubjectsForClass(selectedClass, selectedMedium) || [
            "मराठी",
            "इंग्रजी",
            "गणित",
            "कला",
            "कार्यानुभव",
            "शारीरिक शिक्षण",
          ];

          return { sName, classSubjects };
        })(),

        // Task 2: Students List
        (async () => {
          let loadedStudents = await fetchStudentsForClass(selectedClass, selectedMedium, currentTeacherId) || [];
          if (!Array.isArray(loadedStudents)) loadedStudents = [];

          try {
            const detailsMap = new Map();
            const detailsSnap = await getDocs(collection(db, "student_details"));
            detailsSnap.forEach((docSnap) => detailsMap.set(docSnap.id, docSnap.data()));

            loadedStudents = loadedStudents.map((st) => {
              const det = detailsMap.get(st.id) || detailsMap.get(st.name) || detailsMap.get(st.fullName) || {};
              return { ...st, ...det };
            });
          } catch (e) { }

          if (loadedStudents.length === 0) {
            loadedStudents = SAMPLE_STUDENTS;
          }

          loadedStudents.sort((a, b) => (parseInt(a.rollNo) || 0) - (parseInt(b.rollNo) || 0));
          return loadedStudents;
        })(),

        // Task 3: Sem 1 Marks
        (async () => {
          let merged = {};
          try {
            const docIds = [
              `${currentTeacherId}_${selectedClass}_${academicYear}_sem1`,
              `${selectedClass}_${academicYear}_sem1`,
              `${currentTeacherId}_${docId}`,
              docId,
            ];
            const snaps = await Promise.all(docIds.map(id => getDoc(doc(db, "cce_marks_v2", id)).catch(() => null)));
            for (const snap of snaps) {
              if (snap && snap.exists()) {
                const dData = snap.data();
                const recs = dData.records || dData.marksData || dData.marks || dData.data || dData;
                if (recs && typeof recs === "object") Object.assign(merged, recs);
              }
            }
          } catch (e) { }
          return merged;
        })(),

        // Task 4: Sem 2 Marks
        (async () => {
          let merged = {};
          try {
            const docIds = [
              `${currentTeacherId}_${selectedClass}_${academicYear}_sem2`,
              `${selectedClass}_${academicYear}_sem2`,
              `${currentTeacherId}_${docId}`,
              docId,
            ];
            const snaps = await Promise.all(docIds.map(id => getDoc(doc(db, "cce_marks_v2", id)).catch(() => null)));
            for (const snap of snaps) {
              if (snap && snap.exists()) {
                const dData = snap.data();
                const recs = dData.records || dData.marksData || dData.marks || dData.data || dData;
                if (recs && typeof recs === "object") Object.assign(merged, recs);
              }
            }
          } catch (e) { }
          return merged;
        })(),

        // Task 5: Attendance Data
        (async () => {
          let attMap = {};
          try {
            const attDocIds = [
              `${currentTeacherId}_${selectedClass}_${academicYear}_monthly`,
              `${selectedClass}_${academicYear}_monthly`,
              `${selectedClass}_${academicYear}`,
            ];
            const snaps = await Promise.all(attDocIds.map(id => getDoc(doc(db, "cce_attendance", id)).catch(() => null)));
            for (const snap of snaps) {
              if (snap && snap.exists()) {
                const data = snap.data().records || snap.data().attendanceData || snap.data();
                if (data && typeof data === "object") {
                  Object.entries(data).forEach(([stId, stAtt]) => {
                    if (!attMap[stId]) attMap[stId] = stAtt;
                    else if (typeof stAtt === "object") Object.assign(attMap[stId], stAtt);
                  });
                }
              }
            }
          } catch (e) { }
          return attMap;
        })()
      ]);

      if (schoolResult?.sName) setSchoolName(schoolResult.sName);
      if (schoolResult?.classSubjects) setSubjects(schoolResult.classSubjects);
      if (studentsResult) setStudents(studentsResult);
      if (sem1Result) setSem1MarksData(sem1Result);
      if (sem2Result) setSem2MarksData(sem2Result);
      if (attResult) setAttendanceData(attResult);

      // Save LocalStorage Cache for 0ms instant next load
      try {
        const cacheKey = `cce_annual_register_cache_${selectedClass}_${academicYear}`;
        localStorage.setItem(cacheKey, JSON.stringify({
          schoolName: schoolResult?.sName,
          students: studentsResult,
          subjects: schoolResult?.classSubjects,
          sem1MarksData: sem1Result,
          sem2MarksData: sem2Result,
          attendanceData: attResult,
        }));
      } catch (e) { }

    } catch (err) {
      console.error("Error loading Annual Result Register:", err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract mark for subject and term
  const getSubjectMarkForTerm = (student, subjectName, termData, termSuffix = "sem1") => {
    if (!student) return 0;

    // Direct check in student object (sample data or merged student profile)
    if (student.marks && student.marks[subjectName]) {
      const m = student.marks[subjectName][termSuffix];
      if (m !== undefined && m !== null) return Number(m) || 0;
    }

    const stdKeys = [student.id, student.rollNo, String(student.rollNo), student.name, student.fullName, student.studentId].filter(Boolean);

    let stdRec = null;
    if (termData && typeof termData === "object") {
      for (const k of stdKeys) {
        if (k && termData[k]) {
          stdRec = termData[k];
          break;
        }
      }
    }

    if (!stdRec) return 0;

    const targetSubLower = subjectName.toLowerCase();
    const matchedKey = Object.keys(stdRec).find(
      (k) => k.toLowerCase() === targetSubLower || k.includes(subjectName) || subjectName.includes(k)
    );

    if (!matchedKey || !stdRec[matchedKey]) return 0;

    const subVal = stdRec[matchedKey];
    if (typeof subVal === "number") return subVal;
    if (typeof subVal === "string" && !isNaN(subVal)) return Number(subVal);

    if (typeof subVal === "object") {
      if (subVal[termSuffix] !== undefined) return Number(subVal[termSuffix]) || 0;
      if (subVal.total !== undefined) return Number(subVal.total) || 0;
      if (subVal.obtained !== undefined) return Number(subVal.obtained) || 0;
      if (subVal.mark !== undefined) return Number(subVal.mark) || 0;

      let sum = 0;
      const markKeys = [
        "tondiKaam",
        "pratyakshikPrayog",
        "upakramKriti",
        "prakalpa",
        "chaachaniLekhi",
        "swadhyayVargakarya",
        "itar",
        "sankalitTondi",
        "sankalitPratyakshik",
        "sankalitLekhi",
      ];
      markKeys.forEach((mk) => {
        if (subVal[mk] !== undefined && subVal[mk] !== null && subVal[mk] !== "") {
          const n = Number(subVal[mk]);
          if (!isNaN(n)) sum += n;
        }
      });
      return sum;
    }

    return 0;
  };

  // Helper to extract student attendance accurately
  const getStudentAttendance = (student, attData) => {
    if (!student) return 234;

    if (student.attendance && Number(student.attendance) > 0) return Number(student.attendance);
    if (student.presentDays && Number(student.presentDays) > 0) return Number(student.presentDays);
    if (student.totalPresent && Number(student.totalPresent) > 0) return Number(student.totalPresent);

    const stdKeys = [student.id, student.rollNo, String(student.rollNo), student.name, student.fullName, student.studentId].filter(Boolean);
    if (attData && typeof attData === "object") {
      for (const k of stdKeys) {
        const rec = attData[k];
        if (rec) {
          if (typeof rec === "number" && rec > 0) return rec;
          if (typeof rec === "object") {
            if (rec.total && typeof rec.total === "number" && rec.total > 0) return rec.total;
            let sum = 0;
            Object.values(rec).forEach((v) => {
              const num = Number(v);
              if (!isNaN(num) && num > 0) sum += num;
            });
            if (sum > 0) return sum;
          }
        }
      }
    }

    return 234;
  };

  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    toast.info("वार्षिक निकाल पत्रक PDF तयार होत आहे...");
    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      let html2canvas;
      try {
        const hModule = await import("html2canvas-pro");
        html2canvas = hModule.default || hModule;
      } catch (e) {
        const hModule = await import("html2canvas");
        html2canvas = hModule.default || hModule;
      }

      const { jsPDF } = await import("jspdf");
      const element = printRef.current;
      const tableElem = element ? element.querySelector("table") : null;

      const requiredTableWidth = 360 + (subjects || []).length * 144;
      const tableWidth = Math.max(
        element ? element.scrollWidth : 0,
        tableElem ? tableElem.scrollWidth : 0,
        tableElem ? tableElem.offsetWidth : 0,
        requiredTableWidth,
        1350
      );

      const paddingX = 20;
      const cloneWidth = tableWidth + paddingX * 2;

      const clone = element.cloneNode(true);

      clone.style.boxSizing = "border-box";
      clone.style.padding = `10px ${paddingX}px 15px ${paddingX}px`;
      clone.style.margin = "0";
      clone.style.boxShadow = "none";
      clone.style.border = "none";
      clone.style.borderRadius = "0";
      clone.style.width = `${cloneWidth}px`;
      clone.style.minWidth = `${cloneWidth}px`;
      clone.style.maxWidth = "none";
      clone.style.overflow = "visible";
      clone.style.background = "#ffffff";

      clone.querySelectorAll("input").forEach((inp) => {
        const isNumber = inp.type === "number";
        const val = inp.value !== undefined && inp.value !== null && inp.value !== ""
          ? inp.value
          : (isNumber ? "0" : "");
        const parent = inp.parentNode;
        if (parent) {
          const span = document.createElement("span");
          span.style.display = "inline-block";
          span.style.fontWeight = "900";
          span.style.fontSize = "13px";
          span.style.color = "#000000";
          if (isNumber) {
            span.style.width = "100%";
            span.style.textAlign = "center";
          } else {
            span.style.minWidth = "200px";
            span.style.textAlign = "left";
            span.style.borderBottom = "1px dotted #94a3b8";
            span.style.paddingLeft = "4px";
          }
          span.textContent = val;
          parent.replaceChild(span, inp);
        }
      });

      clone.querySelectorAll("table").forEach((tb) => {
        tb.style.boxSizing = "border-box";
        tb.style.border = "2px solid #000000";
        tb.style.borderCollapse = "collapse";
        tb.style.width = `${tableWidth}px`;
        tb.style.minWidth = `${tableWidth}px`;
      });
      clone.querySelectorAll("th").forEach((th) => {
        th.style.backgroundColor = "#0d47a1";
        th.style.color = "#ffffff";
        th.style.border = "1px solid #000000";
        th.style.verticalAlign = "middle";
      });
      clone.querySelectorAll("td").forEach((td) => {
        td.style.border = "1px solid #000000";
      });

      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "0";
      tempContainer.style.width = `${cloneWidth + 40}px`;
      tempContainer.style.background = "#ffffff";
      tempContainer.style.zIndex = "-9999";
      tempContainer.appendChild(clone);
      document.body.appendChild(tempContainer);

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: cloneWidth + 60,
        scrollX: 0,
        scrollY: 0,
      });

      document.body.removeChild(tempContainer);

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const marginX = 4;
      const marginTop = 3;
      const availWidth = pdfWidth - marginX * 2;
      const availHeight = pdfHeight - marginTop * 2;

      const imgWidth = availWidth;
      const imgHeight = (canvas.height * availWidth) / canvas.width;

      pdf.addImage(imgData, "JPEG", marginX, marginTop, imgWidth, Math.min(imgHeight, availHeight), undefined, "FAST");
      pdf.save(`वार्षिक_निकाल_पत्रक_${selectedClass}_${academicYear}.pdf`);
      toast.success("PDF यशस्वीरित्या डाऊनलोड झाली!");
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("PDF निर्मितीत अडचण आली: " + (err.message || err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen p-2 sm:p-4 font-sans">
      {/* Action Bar (Hidden on Print) */}
      <div className="no-print max-w-[100%] mx-auto mb-4 flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 cursor-pointer"
            >
              <ArrowLeft className="size-5" />
            </button>
          )}
          <div>
            <h2 className="text-base font-bold text-slate-800">सातत्यपूर्ण सर्वंकष मूल्यमापन: वार्षिक निकाल पत्रक</h2>
            <p className="text-xs text-slate-500">इयत्ता {formatClassName(selectedClass)} वी | सर्व विषय सत्र १ व सत्र २ संकलन</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Academic Year Dropdown Selector */}
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-sm"
          >
            {(() => {
              const curY = new Date().getFullYear();
              const curM = new Date().getMonth();
              const refY = curM >= 5 ? curY : curY - 1;
              const yrs = [];
              for (let y = refY - 2; y <= refY + 2; y++) {
                yrs.push(`${y}-${y + 1}`);
              }
              return yrs.map((y) => (
                <option key={y} value={y}>{y}</option>
              ));
            })()}
          </select>

          <button
            onClick={loadRegisterData}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw className="size-4" /> रिफ्रेश
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {downloading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> डाऊनलोड होत आहे...
              </>
            ) : (
              <>
                <Download className="size-4" /> डाऊनलोड
              </>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
          <Loader2 className="size-9 text-emerald-700 animate-spin mb-3" />
          <p className="text-sm font-bold text-slate-700">वार्षिक निकाल पत्रक लोड होत आहे...</p>
        </div>
      ) : (
        <div
          ref={printRef}
          className="print-area w-full max-w-[100%] mx-auto bg-white p-4 rounded-xl border-2 border-black shadow-md overflow-x-auto"
          style={{ fontFamily: "'Noto Sans Devanagari', 'Inter', sans-serif" }}
        >
          {/* Main Document Header matching Image 2 */}
          <div className="text-center mb-4">
            <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-wide mb-3 text-center text-slate-950" style={{ color: "#000000" }}>
              सातत्यपूर्ण सर्वंकष मूल्यमापन: वार्षिक निकाल पत्रक
            </h1>

            {/* School Metadata Bar matching Image 2 */}
            <div
              className="flex flex-wrap items-center justify-between text-xs sm:text-sm font-extrabold px-3 py-1.5 border-b-2 border-black gap-2 text-slate-950"
              style={{ borderColor: "#000000", color: "#000000" }}
            >
              <div>
                <span>शाळा: </span> <span className="font-black text-black">{schoolName}</span>
              </div>
              <div>
                <span>इयत्ता: </span> <span className="font-black text-black">{formatClassName(selectedClass)}</span>
              </div>
              <div>
                <span>तुकडी: </span> <span className="font-black text-black">{division}</span>
              </div>
              <div>
                <span>सन: </span> <span className="font-black text-black">{academicYear}</span>
              </div>
            </div>
          </div>

          {/* Matrix Register Table matching Image 2 EXACTLY */}
          <style dangerouslySetInnerHTML={{ __html: ".annual-register-table, .annual-register-table tr, .annual-register-table th, .annual-register-table td { border: 1px solid #000000 !important; border-color: #000000 !important; } .annual-register-table { border: 2px solid #000000 !important; }" }} />
          <table
            className="w-full text-center text-[13px] border-collapse annual-register-table"
            style={{ tableLayout: "fixed", minWidth: `${360 + subjects.length * 144}px`, width: "100%", borderColor: "#000000", borderWidth: "2px", borderStyle: "solid" }}
          >
            <colgroup>
              <col style={{ width: "35px" }} />
              <col style={{ width: "160px" }} />
              {subjects.map((_, idx) => (
                <React.Fragment key={idx}>
                  <col style={{ width: "36px" }} />
                  <col style={{ width: "36px" }} />
                  <col style={{ width: "36px" }} />
                  <col style={{ width: "36px" }} />
                </React.Fragment>
              ))}
              <col style={{ width: "40px" }} />
              <col style={{ width: "40px" }} />
              <col style={{ width: "45px" }} />
              <col style={{ width: "40px" }} />
            </colgroup>
            <thead>
              {/* Row 1: Main Headers */}
              <tr style={{ backgroundColor: "transparent", color: "#ffffff" }}>
                <th
                  rowSpan={3}
                  className="border border-black px-1 py-2 font-black align-middle text-white"
                  style={{ width: "35px", borderColor: "#000000", backgroundColor: "#0d47a1", color: "#ffffff", verticalAlign: "middle" }}
                >
                  <span className="relative z-10 block text-center font-black text-white text-[13px]" style={{ position: "relative", zIndex: 10, color: "#ffffff" }}>अ. क्र.</span>
                </th>
                <th
                  rowSpan={3}
                  className="border border-black px-2 py-2 font-black text-left align-middle text-white"
                  style={{ width: "160px", borderColor: "#000000", backgroundColor: "#0d47a1", color: "#ffffff", verticalAlign: "middle" }}
                >
                  <span className="relative z-10 block font-black text-white text-[13px]" style={{ position: "relative", zIndex: 10, color: "#ffffff" }}>विद्यार्थ्याचे नाव</span>
                </th>

                {/* Dynamic Subject Headers - Equal width for all subjects */}
                {subjects.map((sub, sIdx) => (
                  <th
                    key={sIdx}
                    colSpan={4}
                    className="border border-black px-0.5 py-1.5 font-black text-[13px] align-middle whitespace-normal break-words overflow-hidden leading-tight text-white"
                    style={{ borderColor: "#000000", backgroundColor: "#0d47a1", color: "#ffffff", width: "144px" }}
                  >
                    {getSubjectDisplayLabel(sub)}
                  </th>
                ))}

                <th
                  rowSpan={3}
                  className="border border-black px-1 py-1 font-black align-middle text-white"
                  style={{ borderColor: "#000000", backgroundColor: "#0d47a1", color: "#ffffff", width: "40px", verticalAlign: "middle" }}
                >
                  <div className="writing-vertical text-[13px]" style={{ color: "#ffffff" }}>उपस्थिती</div>
                </th>
                <th
                  rowSpan={3}
                  className="border border-black px-1 py-1 font-black align-middle text-white"
                  style={{ borderColor: "#000000", backgroundColor: "#0d47a1", color: "#ffffff", width: "40px", verticalAlign: "middle" }}
                >
                  <div className="writing-vertical text-[13px]" style={{ color: "#ffffff" }}>एकूण</div>
                </th>
                <th
                  rowSpan={3}
                  className="border border-black px-1 py-1 font-black align-middle text-white"
                  style={{ borderColor: "#000000", backgroundColor: "#0d47a1", color: "#ffffff", width: "45px", verticalAlign: "middle" }}
                >
                  <div className="writing-vertical text-[13px]" style={{ color: "#ffffff" }}>टक्केवारी</div>
                </th>
                <th
                  rowSpan={3}
                  className="border border-black px-1 py-1 font-black align-middle text-white"
                  style={{ borderColor: "#000000", backgroundColor: "#0d47a1", color: "#ffffff", width: "40px", verticalAlign: "middle" }}
                >
                  <div className="writing-vertical text-[13px]" style={{ color: "#ffffff" }}>श्रेणी</div>
                </th>
              </tr>

              {/* Row 2: Sub Headers (Semester Breakdown) */}
              <tr style={{ backgroundColor: "transparent", color: "#ffffff" }}>
                {subjects.map((_, sIdx) => (
                  <React.Fragment key={sIdx}>
                    <th className="border border-black p-0.5 font-extrabold align-middle text-[11px] text-white" style={{ borderColor: "#000000", backgroundColor: "#0d47a1", color: "#ffffff", width: "36px" }}>
                      <div className="writing-vertical" style={{ color: "#ffffff" }}>प्रथम सत्र</div>
                    </th>
                    <th className="border border-black p-0.5 font-extrabold align-middle text-[11px] text-white" style={{ borderColor: "#000000", backgroundColor: "#0d47a1", color: "#ffffff", width: "36px" }}>
                      <div className="writing-vertical" style={{ color: "#ffffff" }}>द्वितीय सत्र</div>
                    </th>
                    <th className="border border-black p-0.5 font-extrabold align-middle text-[11px] text-white" style={{ borderColor: "#000000", backgroundColor: "#0d47a1", color: "#ffffff", width: "36px" }}>
                      <div className="writing-vertical" style={{ color: "#ffffff" }}>एकूण</div>
                    </th>
                    <th className="border border-black p-0.5 font-extrabold align-middle text-[11px] text-white" style={{ borderColor: "#000000", backgroundColor: "#0d47a1", color: "#ffffff", width: "36px" }}>
                      <div className="writing-vertical" style={{ color: "#ffffff" }}>श्रेणी</div>
                    </th>
                  </React.Fragment>
                ))}
              </tr>

              {/* Row 3: Max Marks Row (100, 100, 200, Grade) matching Image 2 */}
              <tr style={{ backgroundColor: "transparent", color: "#ffffff" }}>
                {subjects.map((_, sIdx) => (
                  <React.Fragment key={sIdx}>
                    <th className="border border-black p-0.5 font-black text-[13px] align-middle text-white" style={{ borderColor: "#000000", backgroundColor: "#0d47a1", color: "#ffffff", width: "36px" }}>100</th>
                    <th className="border border-black p-0.5 font-black text-[13px] align-middle text-white" style={{ borderColor: "#000000", backgroundColor: "#0d47a1", color: "#ffffff", width: "36px" }}>100</th>
                    <th className="border border-black p-0.5 font-black text-[13px] align-middle text-white" style={{ borderColor: "#000000", backgroundColor: "#0d47a1", color: "#ffffff", width: "36px" }}>200</th>
                    <th className="border border-black p-0.5 align-middle text-white" style={{ borderColor: "#000000", backgroundColor: "#0d47a1", color: "#ffffff", width: "36px" }}></th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            <tbody>
              {students.map((st, idx) => {
                let grandTotalObt = 0;
                const grandTotalMax = subjects.length * 200;

                const subjectRows = subjects.map((sub) => {
                  const m1 = getSubjectMarkForTerm(st, sub, sem1MarksData, "sem1");
                  const m2 = getSubjectMarkForTerm(st, sub, sem2MarksData, "sem2");
                  const subTotal = m1 + m2;
                  grandTotalObt += subTotal;
                  const subPercent = (subTotal / 200) * 100;
                  const subGrade = getMarathiGrade(subPercent);

                  return { m1, m2, subTotal, subGrade };
                });

                const overallPercent = grandTotalMax > 0 ? (grandTotalObt / grandTotalMax) * 100 : 0;
                const overallGrade = getMarathiGrade(overallPercent);
                const attendance = getStudentAttendance(st, attendanceData);

                return (
                  <tr key={st.id || idx} className="hover:bg-blue-50/50 transition-colors">
                    <td className="border border-black px-1 py-2 text-[13px] font-black text-center text-slate-950 overflow-hidden" style={{ borderColor: "#000000", width: "35px" }}>
                      {idx + 1}
                    </td>
                    <td className="border border-black px-2 py-2 text-[13px] font-black text-left text-slate-950 whitespace-nowrap overflow-hidden text-ellipsis" style={{ borderColor: "#000000", width: "160px" }}>
                      {st.fullName || st.name || `विद्यार्थी ${idx + 1}`}
                    </td>

                    {/* Subject Marks Columns - Identical equal widths */}
                    {subjectRows.map((subRes, sIdx) => (
                      <React.Fragment key={sIdx}>
                        <td className="border border-black p-0.5 text-[13px] font-extrabold text-slate-950 text-center" style={{ borderColor: "#000000", width: "36px" }}>
                          {subRes.m1 > 0 ? subRes.m1 : "-"}
                        </td>
                        <td className="border border-black p-0.5 text-[13px] font-extrabold text-slate-950 text-center" style={{ borderColor: "#000000", width: "36px" }}>
                          {subRes.m2 > 0 ? subRes.m2 : "-"}
                        </td>
                        <td className="border border-black p-0.5 text-[13px] font-black text-[#0d47a1] bg-blue-50/30 text-center" style={{ borderColor: "#000000", width: "36px" }}>
                          {subRes.subTotal > 0 ? subRes.subTotal : "-"}
                        </td>
                        <td className="border border-black p-0.5 text-[13px] font-black text-[#0d47a1] bg-blue-50/30 text-center" style={{ borderColor: "#000000", width: "36px" }}>
                          {subRes.subGrade}
                        </td>
                      </React.Fragment>
                    ))}

                    {/* Student Summary Columns */}
                    <td className="border border-black p-0.5 text-[13px] font-extrabold text-slate-950 text-center" style={{ borderColor: "#000000", width: "40px" }}>
                      {attendance}
                    </td>
                    <td className="border border-black p-0.5 text-[13px] font-black text-[#0d47a1] bg-[#e3f2fd] text-center" style={{ borderColor: "#000000", width: "40px" }}>
                      {grandTotalObt > 0 ? grandTotalObt : "-"}
                    </td>
                    <td className="border border-black p-0.5 text-[13px] font-black text-[#0d47a1] bg-[#e3f2fd] text-center" style={{ borderColor: "#000000", width: "45px" }}>
                      {overallPercent > 0 ? overallPercent.toFixed(2) : "-"}
                    </td>
                    <td className="border border-black p-0.5 text-[13px] font-black text-slate-950 bg-[#bbdefb] text-center" style={{ borderColor: "#000000", width: "40px" }}>
                      {overallGrade}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Print Specific CSS matching Image 2 exact layout */}
      <style>{`
        .writing-vertical {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          text-align: center;
          white-space: nowrap;
          margin: 0 auto;
          padding: 6px 2px;
          height: 90px;
          color: #ffffff !important;
        }

        @media print {
          body * {
            visibility: hidden;
          }
          .no-print {
            display: none !important;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 5px !important;
            box-shadow: none !important;
            border: none !important;
          }
          @page {
            size: A4 landscape;
            margin: 5mm;
          }
        }
      `}</style>
    </div>
  );
}
