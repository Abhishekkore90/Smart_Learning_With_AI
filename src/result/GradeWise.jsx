import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Download, Printer, Loader2, RefreshCw } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { toast } from "sonner";

// Grade scale helper according to CCE rules
const calculateCceGrade = (percent) => {
  if (percent === undefined || percent === null || isNaN(percent)) return "-";
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

const DEFAULT_SUBJECTS = [
  "प्रथम भाषा : मराठी",
  "तृतीय भाषा : इंग्रजी",
  "गणित",
  "कला",
  "कार्यानुभव",
  "शारीरिक शिक्षण",
];

function GradeWise({ initialClass, initialYear, onBack }) {
  const [selectedClass, setSelectedClass] = useState(
    initialClass || localStorage.getItem("cce_selected_class") || "1st"
  );
  const [academicYear, setAcademicYear] = useState(
    initialYear || localStorage.getItem("cce_academic_year") || "2025-26"
  );
  const [division, setDivision] = useState(
    localStorage.getItem("cce_selected_division") || "1"
  );
  const [schoolName, setSchoolName] = useState("");
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [marksSem1, setMarksSem1] = useState({});
  const [marksSem2, setMarksSem2] = useState({});
  const [attendanceData, setAttendanceData] = useState({});
  const [totalWorkingDays, setTotalWorkingDays] = useState(234);
  const [downloading, setDownloading] = useState(false);

  const printRef = useRef(null);

  useEffect(() => {
    loadAnnualSheetData();
  }, [selectedClass, academicYear]);

  const loadAnnualSheetData = async () => {
    setLoading(true);
    try {
      // 1. Fetch School Name & Settings
      try {
        const udise = localStorage.getItem("teacher_udise") || localStorage.getItem("udiseNumber");
        if (udise) {
          const sSnap = await getDoc(doc(db, "school_data", udise));
          if (sSnap.exists() && sSnap.data().schoolName) {
            setSchoolName(sSnap.data().schoolName);
          }
        }
      } catch (e) {}

      // 2. Fetch Subjects for Class
      try {
        const setSnap = await getDoc(doc(db, "cce_settings", `${selectedClass}_${academicYear}`));
        if (setSnap.exists() && Array.isArray(setSnap.data().subjects) && setSnap.data().subjects.length > 0) {
          setSubjects(setSnap.data().subjects);
        } else {
          setSubjects(DEFAULT_SUBJECTS);
        }
      } catch (e) {
        setSubjects(DEFAULT_SUBJECTS);
      }

      // 3. Fetch Students from Firestore
      let loadedStudents = [];
      try {
        const q = query(
          collection(db, "users"),
          where("role", "==", "student"),
          where("class", "==", selectedClass)
        );
        const snap = await getDocs(q);
        loadedStudents = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Merge student_details
        for (let i = 0; i < loadedStudents.length; i++) {
          const s = loadedStudents[i];
          try {
            const detSnap = await getDoc(doc(db, "student_details", s.id));
            if (detSnap.exists()) {
              loadedStudents[i] = { ...s, ...detSnap.data() };
            }
          } catch (e) {}
        }

        // Sort by Roll No
        loadedStudents.sort(
          (a, b) => (parseInt(a.rollNo) || 999) - (parseInt(b.rollNo) || 999)
        );
        setStudents(loadedStudents);
      } catch (e) {
        console.error("Error fetching students:", e);
      }

      // 4. Fetch Marks for Sem1 & Sem2
      try {
        const sem1Snap = await getDoc(
          doc(db, "cce_marks_v2", `${selectedClass}_${academicYear}_sem1`)
        );
        const sem2Snap = await getDoc(
          doc(db, "cce_marks_v2", `${selectedClass}_${academicYear}_sem2`)
        );

        setMarksSem1(sem1Snap.exists() ? sem1Snap.data().records || {} : {});
        setMarksSem2(sem2Snap.exists() ? sem2Snap.data().records || {} : {});
      } catch (e) {
        console.error("Error fetching marks:", e);
      }

      // 5. Fetch Attendance Data
      try {
        const monthlySnap = await getDoc(
          doc(db, "cce_attendance", `${selectedClass}_${academicYear}_monthly`)
        );
        const attMap = {};
        if (monthlySnap.exists()) {
          const records = monthlySnap.data().records || {};
          Object.keys(records).forEach((stdId) => {
            const stdMonths = records[stdId] || {};
            const totalPres = Object.values(stdMonths).reduce(
              (acc, v) => acc + (Number(v) || 0),
              0
            );
            attMap[stdId] = totalPres;
          });
        }
        setAttendanceData(attMap);

        // Fetch Working Days
        const wdSnap = await getDoc(
          doc(db, "cce_attendance", `${selectedClass}_${academicYear}_working_days`)
        );
        if (wdSnap.exists() && wdSnap.data().workingDays) {
          const sumWD = Object.values(wdSnap.data().workingDays).reduce(
            (acc, v) => acc + (Number(v) || 0),
            0
          );
          if (sumWD > 0) setTotalWorkingDays(sumWD);
        }
      } catch (e) {
        console.error("Error fetching attendance:", e);
      }
    } catch (err) {
      console.error("Error loading Annual Sheet Data:", err);
    }
    setLoading(false);
  };

  // Helper to extract student subject marks for term (out of 100)
  const getSubjectMarksForTerm = (student, subName, term = "sem1") => {
    if (!student) return 0;
    const termMarks = term === "sem1" ? marksSem1 : marksSem2;

    const stdKeys = [student.id, student.rollNo, student.name, student.fullName, String(student.rollNo)].filter(Boolean);
    let sObj = null;
    for (const k of stdKeys) {
      if (termMarks[k]) {
        sObj = termMarks[k];
        break;
      }
    }
    if (!sObj) return 0;

    const getSubObj = (sn) => {
      if (sObj[sn]) return sObj[sn];
      const lower = String(sn).toLowerCase();
      if (lower.includes("मराठी")) return sObj["marathi"] || sObj["प्रथम भाषा : मराठी"] || sObj["प्रथम भाषा: मराठी"] || sObj["मराठी"] || {};
      if (lower.includes("इंग्रजी")) return sObj["english"] || sObj["तृतीय भाषा : इंग्रजी"] || sObj["तृतीय भाषा: इंग्रजी"] || sObj["द्वितीय भाषा : इंग्रजी"] || sObj["इंग्रजी"] || {};
      if (lower.includes("गणित")) return sObj["math"] || sObj["maths"] || sObj["गणित"] || {};
      if (lower.includes("कला")) return sObj["kala"] || sObj["art"] || sObj["कला"] || {};
      if (lower.includes("कार्यानुभव")) return sObj["karyanubhav"] || sObj["work"] || sObj["कार्यानुभव"] || {};
      if (lower.includes("शारीरिक")) return sObj["sharirik"] || sObj["pe"] || sObj["शारीरिक शिक्षण"] || {};
      return {};
    };

    const subObj = getSubObj(subName);
    if (!subObj) return 0;
    if (typeof subObj === "number") return subObj;
    if (subObj.total !== undefined) return Number(subObj.total) || 0;
    if (subObj.obtained !== undefined) return Number(subObj.obtained) || 0;

    const formative = Number(subObj.formative || subObj.aakarik || 0);
    const summative = Number(subObj.summative || subObj.sankalit || 0);
    const oral = Number(subObj.oral || subObj.tondiKaam || 0);
    const act = Number(subObj.activity || subObj.upakramKriti || subObj.pratyakshikPrayog || 0);
    const prj = Number(subObj.project || subObj.prakalpa || 0);
    const test = Number(subObj.test || subObj.chaachaniLekhi || 0);
    const hw = Number(subObj.swadhyayVargakarya || subObj.homework || 0);
    const semOral = Number(subObj.semesterOral || subObj.sankalitTondi || 0);
    const semPrat = Number(subObj.semesterPractical || subObj.sankalitPratyakshik || 0);
    const semW = Number(subObj.semesterWritten || subObj.sankalitLekhi || 0);

    return formative + summative + oral + act + prj + test + hw + semOral + semPrat + semW;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    toast.info("वार्षिक निकाल पत्रक PDF तयार होत आहे...");
    try {
      const { default: html2pdf } = await import("html2pdf.js");
      const element = printRef.current;
      const opt = {
        margin: [5, 5, 5, 5],
        filename: `वार्षिक_निकाल_पत्रक_${selectedClass}_${academicYear}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
      };
      await html2pdf().set(opt).from(element).save();
      toast.success("वार्षिक निकाल पत्रक PDF यशस्वीरित्या डाऊनलोड झाली!");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("PDF निर्मितीत अडचण आली: " + err.message);
    }
    setDownloading(false);
  };

  const maxTotalPerSubject = 200;
  const grandMaxMarks = subjects.length * maxTotalPerSubject;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 select-none font-sans text-slate-800">
      {/* Top Navigation & Controls */}
      <div className="max-w-[1400px] mx-auto bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer text-slate-700"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">
              सातत्यपूर्ण सर्वंकष मूल्यमापन: वार्षिक निकाल पत्रक
            </h1>
            <p className="text-xs font-bold text-slate-500">
              इयत्ता: <span className="text-blue-600 font-extrabold">{selectedClass}</span> | सन: <span className="text-blue-600 font-extrabold">{academicYear}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAnnualSheetData}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            रीफ्रेश
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
          >
            <Printer className="size-4" />
            प्रिंट काढा
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-colors shadow-md disabled:opacity-50"
          >
            {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            PDF डाऊनलोड करा
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-slate-200 shadow-sm max-w-[1400px] mx-auto">
          <Loader2 className="size-10 text-blue-600 animate-spin mb-3" />
          <p className="text-sm font-bold text-slate-500">वार्षिक निकाल पत्रक तयार होत आहे...</p>
        </div>
      ) : (
        /* Print Area */
        <div className="max-w-[1400px] mx-auto overflow-x-auto">
          <div
            ref={printRef}
            className="bg-white p-6 rounded-3xl border border-slate-300 shadow-lg min-w-[1100px]"
            style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
          >
            {/* Header Heading matching PDF */}
            <div className="text-center mb-4">
              <h2 className="text-lg font-black text-slate-900 tracking-wide mb-2">
                सातत्यपूर्ण सर्वंकष मूल्यमापन: वार्षिक निकाल पत्रक
              </h2>
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 px-2 py-1 bg-amber-50/50 rounded-xl border border-amber-200">
                <span>शाळा: <b>{schoolName || "जिल्हा परिषद शाळा"}</b></span>
                <span>इयत्ता: <b>{selectedClass}</b></span>
                <span>तुकडी: <b>{division}</b></span>
                <span>सन: <b>{academicYear}</b></span>
              </div>
            </div>

            {/* Master Consolidated Result Table */}
            <table className="w-full border-collapse border-2 border-slate-900 text-center text-[11px] font-semibold text-slate-900">
              <thead>
                {/* Row 1: Super Headers */}
                <tr className="bg-lime-100 font-extrabold border-b-2 border-slate-900 text-slate-950">
                  <th className="border border-slate-900 px-1 py-2 w-10" rowSpan={3}>
                    अ. क्र.
                  </th>
                  <th className="border border-slate-900 px-2 py-2 text-left min-w-[160px]" rowSpan={3}>
                    विद्यार्थ्याचे नाव
                  </th>
                  {subjects.map((sub) => (
                    <th key={sub} className="border border-slate-900 px-1 py-1.5" colSpan={4}>
                      {sub}
                    </th>
                  ))}
                  <th className="border border-slate-900 px-1 py-2 w-16" rowSpan={3}>
                    उपस्थिती
                  </th>
                  <th className="border border-slate-900 px-1 py-2 w-16" rowSpan={3}>
                    एकूण
                  </th>
                  <th className="border border-slate-900 px-1 py-2 w-16" rowSpan={3}>
                    टक्केवारी
                  </th>
                  <th className="border border-slate-900 px-1 py-2 w-14" rowSpan={3}>
                    श्रेणी
                  </th>
                </tr>

                {/* Row 2: Terms & Grade Headers */}
                <tr className="bg-lime-50 font-extrabold border-b border-slate-900 text-slate-900 text-[10px]">
                  {subjects.map((sub) => (
                    <React.Fragment key={sub + "_sub_headers"}>
                      <th className="border border-slate-900 py-1 w-12">प्रथम सत्र</th>
                      <th className="border border-slate-900 py-1 w-12">द्वितीय सत्र</th>
                      <th className="border border-slate-900 py-1 w-12">एकूण</th>
                      <th className="border border-slate-900 py-1 w-12">श्रेणी</th>
                    </React.Fragment>
                  ))}
                </tr>

                {/* Row 3: Maximum Marks Row */}
                <tr className="bg-lime-100/70 font-black border-b-2 border-slate-900 text-slate-900 text-[10px]">
                  {subjects.map((sub) => (
                    <React.Fragment key={sub + "_max"}>
                      <td className="border border-slate-900 py-1">100</td>
                      <td className="border border-slate-900 py-1">100</td>
                      <td className="border border-slate-900 py-1">200</td>
                      <td className="border border-slate-900 py-1"></td>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>

              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={subjects.length * 4 + 6} className="py-12 text-slate-400 font-bold italic">
                      विद्यार्थी माहिती उपलब्ध नाही
                    </td>
                  </tr>
                ) : (
                  students.map((st, sIdx) => {
                    let studentGrandObtained = 0;

                    return (
                      <tr key={st.id || sIdx} className="border-b border-slate-800 hover:bg-slate-50 transition-colors">
                        {/* Roll / Sr No */}
                        <td className="border border-slate-800 py-1.5 font-bold">
                          {sIdx + 1}
                        </td>

                        {/* Student Name */}
                        <td className="border border-slate-800 px-2 py-1.5 text-left font-bold text-slate-950">
                          {st.fullName || st.name || "विद्यार्थी"}
                        </td>

                        {/* Per Subject Marks & Grades */}
                        {subjects.map((subName) => {
                          const sem1M = getSubjectMarksForTerm(st, subName, "sem1");
                          const sem2M = getSubjectMarksForTerm(st, subName, "sem2");
                          const subTotal = sem1M + sem2M;
                          studentGrandObtained += subTotal;

                          const subGrade = calculateCceGrade((subTotal / maxTotalPerSubject) * 100);

                          return (
                            <React.Fragment key={subName}>
                              <td className="border border-slate-800 py-1.5">{sem1M || "-"}</td>
                              <td className="border border-slate-800 py-1.5">{sem2M || "-"}</td>
                              <td className="border border-slate-800 py-1.5 font-extrabold text-slate-900">{subTotal || "-"}</td>
                              <td className="border border-slate-800 py-1.5 font-black text-blue-700">{subGrade}</td>
                            </React.Fragment>
                          );
                        })}

                        {/* Attendance */}
                        <td className="border border-slate-800 py-1.5 font-bold">
                          {attendanceData[st.id] !== undefined ? attendanceData[st.id] : totalWorkingDays}
                        </td>

                        {/* Grand Total Obtained */}
                        <td className="border border-slate-800 py-1.5 font-black text-slate-950">
                          {studentGrandObtained}
                        </td>

                        {/* Grand Percentage */}
                        <td className="border border-slate-800 py-1.5 font-black text-slate-950">
                          {((studentGrandObtained / grandMaxMarks) * 100).toFixed(2)}%
                        </td>

                        {/* Grand Overall Grade */}
                        <td className="border border-slate-800 py-1.5 font-black text-emerald-700">
                          {calculateCceGrade((studentGrandObtained / grandMaxMarks) * 100)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Print Specific CSS */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default GradeWise;
