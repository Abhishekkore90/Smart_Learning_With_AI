import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Download, Printer, Loader2, RefreshCw } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { matchStudentClassAndMedium } from "./firestoreMarksHelper";
import { getTeacherId } from "@/lib/teacherIsolationHelper";
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
  return "इ-1";
};

// Format Subject Label for Display
const getSubjectDisplayLabel = (subName) => {
  if (!subName) return "";
  const s = String(subName).trim();
  if (s.toLowerCase().includes("मराठी") && !s.includes("प्रथम")) return "प्रथम भाषा: मराठी";
  if (s.toLowerCase().includes("इंग्रजी") && !s.includes("तृतीय") && !s.includes("द्वितीय")) return "तृतीय भाषा: इंग्रजी";
  if (s.toLowerCase().includes("हिंदी") && !s.includes("तृतीय") && !s.includes("द्वितीय")) return "द्वितीय भाषा: हिंदी";
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

export default function AnnualResultRegister({ initialClass, initialYear, onBack }) {
  const [selectedClass, setSelectedClass] = useState(
    initialClass || localStorage.getItem("cce_selected_class") || "1st"
  );
  const [academicYear, setAcademicYear] = useState(
    initialYear || localStorage.getItem("cce_academic_year") || "2025-26"
  );
  const [selectedMedium, setSelectedMedium] = useState(
    localStorage.getItem("cce_selected_medium") || "marathi"
  );

  const [schoolName, setSchoolName] = useState(
    localStorage.getItem("schoolName") ||
    localStorage.getItem("teacher_school_name") ||
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
    loadRegisterData();
  }, [selectedClass, academicYear, selectedMedium]);

  const loadRegisterData = async () => {
    setLoading(true);
    try {
      // 1. Fetch School Settings
      let sName = "";
      const currentTeacherId = getTeacherId();

      try {
        const cachedTeacher = localStorage.getItem(`cce_general_school_settings_${currentTeacherId}`);
        const cachedGen = localStorage.getItem("cce_general_school_settings");
        const cached = cachedTeacher || cachedGen;
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.schoolName) sName = parsed.schoolName;
        }
      } catch (e) {}

      if (!sName) {
        sName =
          localStorage.getItem("schoolName") ||
          localStorage.getItem("teacher_school_name") ||
          "";
      }

      if (!sName && currentTeacherId) {
        try {
          const teacherGenSnap = await getDoc(doc(db, "school_settings", `${currentTeacherId}_general`));
          if (teacherGenSnap.exists() && teacherGenSnap.data().schoolName) {
            sName = teacherGenSnap.data().schoolName;
          }
        } catch (e) {}
      }

      if (!sName && currentTeacherId) {
        try {
          const teacherSnap = await getDoc(doc(db, "school_settings", currentTeacherId));
          if (teacherSnap.exists() && teacherSnap.data().schoolName) {
            sName = teacherSnap.data().schoolName;
          }
        } catch (e) {}
      }

      if (!sName) {
        try {
          const genSnap = await getDoc(doc(db, "school_settings", "general"));
          if (genSnap.exists() && genSnap.data().schoolName) {
            sName = genSnap.data().schoolName;
          }
        } catch (e) {}
      }

      if (sName) setSchoolName(sName);

      // 2. Fetch Subjects
      const classSubjects = getDefaultSubjectsForClass(selectedClass, selectedMedium) || [
        "मराठी",
        "इंग्रजी",
        "गणित",
        "कला",
        "कार्यानुभव",
        "शारीरिक शिक्षण व आरोग्य",
      ];
      setSubjects(classSubjects);

      // 3. Fetch Students from Firestore & Merge student_details
      const uSnap = await getDocs(query(collection(db, "users"), where("role", "==", "student")));
      const matchedStudents = [];
      uSnap.forEach((docSnap) => {
        const sData = docSnap.data();
        if (matchStudentClassAndMedium({ id: docSnap.id, ...sData }, selectedClass, selectedMedium, currentTeacherId)) {
          matchedStudents.push({ id: docSnap.id, ...sData });
        }
      });

      // Merge student_details collection for exact user-entered details (GR No, Roll No, Attendance etc.)
      try {
        const detailsMap = new Map();
        const detailsSnap = await getDocs(collection(db, "student_details"));
        detailsSnap.forEach((docSnap) => {
          detailsMap.set(docSnap.id, docSnap.data());
        });

        matchedStudents.forEach((st, idx) => {
          const det = detailsMap.get(st.id) || detailsMap.get(st.name) || detailsMap.get(st.fullName) || {};
          matchedStudents[idx] = { ...st, ...det };
        });
      } catch (e) {}

      matchedStudents.sort((a, b) => {
        const rA = parseInt(a.rollNo || a.roll_number || "999", 10);
        const rB = parseInt(b.rollNo || b.roll_number || "999", 10);
        return rA - rB;
      });

      setStudents(matchedStudents);

      // Fetch Attendance Data
      let attMap = {};
      try {
        const cached = localStorage.getItem(`cce_monthly_attendance_${selectedClass}_${academicYear}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === "object") {
            Object.assign(attMap, parsed);
          }
        }
      } catch (e) {}

      const attDocIds = [
        ...(currentTeacherId ? [
          `${currentTeacherId}_${selectedClass}_${academicYear}_monthly`,
          `${currentTeacherId}_${selectedClass}_${academicYear}`,
        ] : []),
        `${selectedClass}_${academicYear}_monthly`,
        `${selectedClass}_${academicYear}`,
      ];

      for (const dId of attDocIds) {
        try {
          const attSnap = await getDoc(doc(db, "cce_attendance", dId));
          if (attSnap.exists()) {
            const data = attSnap.data().records || attSnap.data().attendanceData || attSnap.data();
            if (data && typeof data === "object") {
              Object.entries(data).forEach(([stId, stAtt]) => {
                if (!attMap[stId]) attMap[stId] = stAtt;
                else if (typeof stAtt === "object") Object.assign(attMap[stId], stAtt);
              });
            }
          }
        } catch (e) {}
      }

      setAttendanceData(attMap);

      // 4. Fetch Marks for Sem 1 & Sem 2
      const loadSemesterMarks = async (semKey) => {
        let merged = {};
        const aliasBunny = semKey === "sem1" ? "first" : "second";

        // Try Bunny Storage first
        try {
          const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
          const b1 = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_marks_${semKey}.json`);
          if (b1) Object.assign(merged, b1.records || b1.marksData || b1);
          const bAlias = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_marks_${aliasBunny}.json`);
          if (bAlias) Object.assign(merged, bAlias.records || bAlias.marksData || bAlias);
          const bGen = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_marks.json`);
          if (bGen) Object.assign(merged, bGen.records || bGen.marksData || bGen);
        } catch (e) {}

        // Try Firestore cce_marks_v2
        const docIds = [
          ...(currentTeacherId ? [
            `${currentTeacherId}_${selectedClass}_${selectedMedium}_${academicYear}_${semKey}`,
            `${currentTeacherId}_${selectedClass}_${academicYear}_${semKey}`,
            `${currentTeacherId}_${selectedClass}_${academicYear}`,
          ] : []),
          `${selectedClass}_${selectedMedium}_${academicYear}_${semKey}`,
          `${selectedClass}_${academicYear}_${semKey}`,
          `${selectedClass}_${academicYear}`,
        ];

        for (const dId of docIds) {
          try {
            const mSnap = await getDoc(doc(db, "cce_marks_v2", dId));
            if (mSnap.exists()) {
              const dData = mSnap.data();
              const recs = dData.records || dData.marksData || dData.marks || dData.data || dData;
              if (recs && typeof recs === "object") {
                Object.assign(merged, recs);
              }
            }
          } catch (e) {}
        }

        return merged;
      };

      const sem1 = await loadSemesterMarks("sem1");
      const sem2 = await loadSemesterMarks("sem2");

      setSem1MarksData(sem1);
      setSem2MarksData(sem2);
    } catch (err) {
      console.error("Error loading Annual Result Register:", err);
    }
    setLoading(false);
  };

  // Extract Subject Obtained Mark
  const getSubjectMarkForTerm = (student, subjectName, termData) => {
    if (!student || !termData) return 0;
    const stdKeys = [student.id, student.rollNo, String(student.rollNo), student.name, student.fullName, student.studentId];

    let stdRec = null;
    for (const k of stdKeys) {
      if (k && termData[k]) {
        stdRec = termData[k];
        break;
      }
    }

    if (!stdRec) return 0;

    // Match subject key
    const targetSubLower = subjectName.toLowerCase();
    const matchedKey = Object.keys(stdRec).find(
      (k) => k.toLowerCase() === targetSubLower || k.includes(subjectName) || subjectName.includes(k)
    );

    if (!matchedKey || !stdRec[matchedKey]) return 0;

    const subVal = stdRec[matchedKey];
    if (typeof subVal === "number") return subVal;
    if (typeof subVal === "string" && !isNaN(subVal)) return Number(subVal);

    if (typeof subVal === "object") {
      if (subVal.total !== undefined) return Number(subVal.total) || 0;
      if (subVal.obtained !== undefined) return Number(subVal.obtained) || 0;
      if (subVal.mark !== undefined) return Number(subVal.mark) || 0;

      // Sum component fields
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
    if (!student) return "-";

    // 1. Direct student profile check
    if (student.attendance && Number(student.attendance) > 0) return Number(student.attendance);
    if (student.presentDays && Number(student.presentDays) > 0) return Number(student.presentDays);
    if (student.totalPresent && Number(student.totalPresent) > 0) return Number(student.totalPresent);
    if (student.totalAttendance && Number(student.totalAttendance) > 0) return Number(student.totalAttendance);

    // 2. Check attData map
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

    return student.attendance || student.presentDays || "-";
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-6 font-sans">
      {/* Action Bar (Hidden on Print) */}
      <div className="no-print max-w-7xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
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
            <h2 className="text-base font-bold text-slate-800">वार्षिक निकाल पत्रक (Annual Result Sheet)</h2>
            <p className="text-xs text-slate-500">इयत्ता {formatClassName(selectedClass)} वी | सत्र १ व २ गुण संकलन</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={loadRegisterData}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw className="size-4" /> रिफ्रेश
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-200 transition-all cursor-pointer"
          >
            <Printer className="size-4" /> प्रिंट काढा
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
          <Loader2 className="size-9 text-emerald-600 animate-spin mb-3" />
          <p className="text-sm font-bold text-slate-700">वार्षिक निकाल पत्रक लोड होत आहे...</p>
        </div>
      ) : (
        <div
          ref={printRef}
          className="print-area max-w-[100%] mx-auto bg-white p-6 rounded-2xl border border-slate-300 shadow-xl overflow-x-auto"
          style={{ fontFamily: "'Noto Sans Devanagari', 'Inter', sans-serif" }}
        >
          {/* Main Document Header */}
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-wide mb-4" style={{ color: "#2b4009" }}>
              सातत्यपूर्ण सर्वंकष मूल्यमापन: वार्षिक निकाल पत्रक
            </h1>

            {/* School Metadata Bar */}
            <div className="flex flex-wrap items-center justify-between text-xs sm:text-sm font-bold text-slate-800 px-2 py-1 border-b-2 border-slate-800 gap-2">
              <div>
                <span className="font-extrabold">शाळा:</span> {schoolName}
              </div>
              <div>
                <span className="font-extrabold">इयत्ता:</span> {formatClassName(selectedClass)}
              </div>
              <div>
                <span className="font-extrabold">तुकडी:</span> {division}
              </div>
              <div>
                <span className="font-extrabold">सन:</span> {academicYear}
              </div>
            </div>
          </div>

          {/* Matrix Register Table */}
          <table
            className="w-full text-center text-xs border-collapse border border-slate-800"
            style={{ borderColor: "#2b4009", borderWidth: "1.5px" }}
          >
            <thead>
              <tr style={{ backgroundColor: "#edf5bd", color: "#1f2e0c" }}>
                <th
                  rowSpan={3}
                  className="border border-slate-700 px-2 py-2 font-black"
                  style={{ width: "40px" }}
                >
                  अ. क्र.
                </th>
                <th
                  rowSpan={3}
                  className="border border-slate-700 px-3 py-2 font-black text-left"
                  style={{ minWidth: "160px" }}
                >
                  विद्यार्थ्याचे नाव
                </th>

                {/* Dynamic Subject Headers */}
                {subjects.map((sub, sIdx) => (
                  <th
                    key={sIdx}
                    colSpan={4}
                    className="border border-slate-700 px-2 py-1 font-extrabold text-sm"
                  >
                    {getSubjectDisplayLabel(sub)}
                  </th>
                ))}

                <th rowSpan={3} className="border border-slate-700 px-1 py-1 font-bold">
                  <div className="writing-vertical">उपस्थिती</div>
                </th>
                <th rowSpan={3} className="border border-slate-700 px-1 py-1 font-bold">
                  <div className="writing-vertical">एकूण</div>
                </th>
                <th rowSpan={3} className="border border-slate-700 px-1 py-1 font-bold">
                  <div className="writing-vertical">टक्केवारी</div>
                </th>
                <th rowSpan={3} className="border border-slate-700 px-1 py-1 font-bold">
                  <div className="writing-vertical">श्रेणी</div>
                </th>
              </tr>

              {/* Sub Headers Row 2 (Semester Breakdown) */}
              <tr style={{ backgroundColor: "#edf5bd", color: "#1f2e0c" }}>
                {subjects.map((_, sIdx) => (
                  <React.Fragment key={sIdx}>
                    <th className="border border-slate-700 p-1 font-bold" style={{ width: "36px", minWidth: "36px", maxWidth: "36px" }}>
                      <div className="writing-vertical">प्रथम सत्र</div>
                    </th>
                    <th className="border border-slate-700 p-1 font-bold" style={{ width: "36px", minWidth: "36px", maxWidth: "36px" }}>
                      <div className="writing-vertical">द्वितीय सत्र</div>
                    </th>
                    <th className="border border-slate-700 p-1 font-bold" style={{ width: "36px", minWidth: "36px", maxWidth: "36px" }}>
                      <div className="writing-vertical">एकूण</div>
                    </th>
                    <th className="border border-slate-700 p-1 font-bold" style={{ width: "36px", minWidth: "36px", maxWidth: "36px" }}>
                      <div className="writing-vertical">श्रेणी</div>
                    </th>
                  </React.Fragment>
                ))}
              </tr>

              {/* Max Marks Row 3 */}
              <tr style={{ backgroundColor: "#edf5bd", color: "#1f2e0c" }}>
                {subjects.map((_, sIdx) => (
                  <React.Fragment key={sIdx}>
                    <th className="border border-slate-700 p-1 font-extrabold" style={{ width: "36px", minWidth: "36px" }}>100</th>
                    <th className="border border-slate-700 p-1 font-extrabold" style={{ width: "36px", minWidth: "36px" }}>100</th>
                    <th className="border border-slate-700 p-1 font-extrabold" style={{ width: "36px", minWidth: "36px" }}>200</th>
                    <th className="border border-slate-700 p-1" style={{ width: "36px", minWidth: "36px" }}></th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td
                    colSpan={2 + subjects.length * 4 + 4}
                    className="border border-slate-700 py-8 text-center text-slate-500 font-bold"
                  >
                    या इयत्तेत विद्यार्थी उपलब्ध नाहीत.
                  </td>
                </tr>
              ) : (
                students.map((st, idx) => {
                  let grandTotalObt = 0;
                  const grandTotalMax = subjects.length * 200;

                  const subjectRows = subjects.map((sub) => {
                    const m1 = getSubjectMarkForTerm(st, sub, sem1MarksData);
                    const m2 = getSubjectMarkForTerm(st, sub, sem2MarksData);
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
                    <tr key={st.id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="border border-slate-700 px-2 py-1.5 font-bold text-center" style={{ width: "40px" }}>
                        {idx + 1}
                      </td>
                      <td className="border border-slate-700 px-3 py-1.5 font-bold text-left text-slate-900 whitespace-nowrap" style={{ minWidth: "160px" }}>
                        {st.fullName || st.name || `विद्यार्थी ${idx + 1}`}
                      </td>

                      {/* Subject Marks Columns */}
                      {subjectRows.map((subRes, sIdx) => (
                        <React.Fragment key={sIdx}>
                          <td className="border border-slate-700 p-1 font-semibold text-slate-800 text-center" style={{ width: "36px", minWidth: "36px" }}>
                            {subRes.m1 > 0 ? subRes.m1 : "-"}
                          </td>
                          <td className="border border-slate-700 p-1 font-semibold text-slate-800 text-center" style={{ width: "36px", minWidth: "36px" }}>
                            {subRes.m2 > 0 ? subRes.m2 : "-"}
                          </td>
                          <td className="border border-slate-700 p-1 font-black text-slate-950 text-center" style={{ width: "36px", minWidth: "36px" }}>
                            {subRes.subTotal > 0 ? subRes.subTotal : "-"}
                          </td>
                          <td className="border border-slate-700 p-1 font-extrabold text-slate-900 text-center" style={{ width: "36px", minWidth: "36px" }}>
                            {subRes.subGrade}
                          </td>
                        </React.Fragment>
                      ))}

                      {/* Student Summary Columns */}
                      <td className="border border-slate-700 p-1 font-bold text-slate-800 text-center" style={{ width: "40px", minWidth: "40px" }}>
                        {attendance}
                      </td>
                      <td className="border border-slate-700 p-1 font-black text-slate-950 text-center" style={{ width: "40px", minWidth: "40px" }}>
                        {grandTotalObt > 0 ? grandTotalObt : "-"}
                      </td>
                      <td className="border border-slate-700 p-1 font-black text-slate-950 text-center" style={{ width: "40px", minWidth: "40px" }}>
                        {overallPercent > 0 ? overallPercent.toFixed(2) : "-"}
                      </td>
                      <td className="border border-slate-700 p-1 font-black text-slate-950 text-center" style={{ width: "40px", minWidth: "40px" }}>
                        {overallGrade}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Print Specific CSS */}
      <style>{`
        .writing-vertical {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          text-align: center;
          white-space: nowrap;
          margin: 0 auto;
          padding: 8px 2px;
          height: 100px;
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
            padding: 10px !important;
            box-shadow: none !important;
            border: none !important;
          }
          @page {
            size: landscape;
            margin: 8mm;
          }
        }
      `}</style>
    </div>
  );
}
