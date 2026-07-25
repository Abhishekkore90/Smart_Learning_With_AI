import React, { useState, useEffect, useRef } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { Download, Printer, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import "./result.css";

const DEFAULT_SUBJECTS = [
  "प्रथम भाषा : मराठी",
  "द्वितीय भाषा : इंग्रजी",
  "गणित",
  "कला",
  "कार्यानुभव",
  "शारीरिक शिक्षण",
];

// Calculate Grade from Percentage
const getGrade = (percentage) => {
  if (percentage >= 91) return "अ-1";
  if (percentage >= 81) return "अ-2";
  if (percentage >= 71) return "ब-1";
  if (percentage >= 61) return "ब-2";
  if (percentage >= 51) return "क-1";
  if (percentage >= 41) return "क-2";
  if (percentage >= 33) return "ड-1";
  if (percentage >= 21) return "ड-2";
  return "इ-1";
};

const BoardResult = ({ initialClass = "1st", initialYear = "2025-26", onBack }) => {
  const [selectedClass, setSelectedClass] = useState(initialClass || "1st");
  const [academicYear, setAcademicYear] = useState(initialYear || "2025-26");
  const [division, setDivision] = useState("1");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // User's School & Teacher Settings (No hardcoded sample names)
  const [schoolData, setSchoolData] = useState({
    schoolName: "",
    udise: "",
    teacherName: "",
    headmasterName: "",
    slogan: "✦ ज्ञान, संस्कार आणि प्रगतीसाठी ✦",
    schoolLogo: "",
    teacherSignature: "",
    headmasterSignature: "",
  });

  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [students, setStudents] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [remarksData, setRemarksData] = useState({});
  const [attendanceData, setAttendanceData] = useState({});

  const printRef = useRef(null);

  useEffect(() => {
    loadUserFirestoreData();
  }, [selectedClass, academicYear]);

  const loadUserFirestoreData = async () => {
    setLoading(true);
    try {
      const docId = `${selectedClass}_${academicYear}`;

      // 1. Fetch Global & Class Settings (from CCESettings / Bunny Storage / school_settings)
      try {
        let globalSettings = null;

        // Try local storage cache
        try {
          const cachedGen = localStorage.getItem("cce_general_school_settings");
          if (cachedGen) globalSettings = JSON.parse(cachedGen);
        } catch (e) {}

        // Try Bunny Storage CDN
        if (!globalSettings) {
          try {
            const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
            globalSettings = await fetchJsonFromBunny("cce_results/general_school_settings.json");
          } catch (e) {}
        }

        // Try Firestore global document
        if (!globalSettings) {
          const generalSnap = await getDoc(doc(db, "school_settings", "general"));
          if (generalSnap.exists()) globalSettings = generalSnap.data();
        }

        // Try Firestore class-specific document
        const settingsSnap = await getDoc(doc(db, "cce_settings", docId));
        const classSettings = settingsSnap.exists() ? settingsSnap.data() : {};

        const mergedSettings = { ...(globalSettings || {}), ...classSettings };

        if (mergedSettings.schoolName || mergedSettings.udiseCode || mergedSettings.teacherName) {
          setSchoolData({
            schoolName: mergedSettings.schoolName ? `${mergedSettings.schoolName}${mergedSettings.address ? ` (${mergedSettings.address})` : ""}` : "",
            udise: mergedSettings.udiseCode || mergedSettings.udise || "",
            teacherName: mergedSettings.teacherName || "",
            headmasterName: mergedSettings.principalName || mergedSettings.headmasterName || "",
            slogan: mergedSettings.slogan || "✦ ज्ञान, संस्कार आणि प्रगतीसाठी ✦",
            schoolLogo: mergedSettings.schoolLogo || "",
            teacherSignature: mergedSettings.signatureUrl || "",
            headmasterSignature: mergedSettings.principalSignature || "",
          });
          if (mergedSettings.subjects && Array.isArray(mergedSettings.subjects) && mergedSettings.subjects.length > 0) {
            setSubjects(mergedSettings.subjects);
          }
        }
      } catch (e) {
        console.error("Error fetching school settings:", e);
      }

      // 2. Fetch User's Real Students for this selected class (checking users, students, cce_students & Bunny Storage)
      let loadedStudents = [];

      const normalizeClass = (cls) => {
        if (!cls) return "";
        return String(cls).trim().toLowerCase().replace(/[^0-9a-z]/g, "");
      };
      const targetClassNorm = normalizeClass(selectedClass);

      // A. Query 'users' collection (role == "student")
      try {
        const uQuery = query(
          collection(db, "users"),
          where("role", "==", "student")
        );
        const uSnap = await getDocs(uQuery);
        uSnap.forEach((docSnap) => {
          const d = docSnap.data();
          const stdClassNorm = normalizeClass(d.class || d.currentClass || d.className);
          if (!stdClassNorm || stdClassNorm === targetClassNorm || d.class === selectedClass) {
            loadedStudents.push({
              id: docSnap.id,
              name: d.fullName || d.name || d.studentName || "",
              rollNo: String(d.rollNo || d.srNo || loadedStudents.length + 1),
              caste: d.caste || d.category || "सर्वसाधारण",
              gender: d.gender || "Male",
            });
          }
        });
      } catch (e) {
        console.error("Error fetching users collection students:", e);
      }

      // B. Query 'students' collection if needed
      if (loadedStudents.length === 0) {
        try {
          const studentsSnap = await getDocs(collection(db, "students"));
          studentsSnap.forEach((docSnap) => {
            const d = docSnap.data();
            const stdClassNorm = normalizeClass(d.class || d.currentClass || d.className);
            if (!stdClassNorm || stdClassNorm === targetClassNorm || d.class === selectedClass) {
              loadedStudents.push({
                id: docSnap.id,
                name: d.fullName || d.name || d.studentName || "",
                rollNo: String(d.rollNo || d.srNo || loadedStudents.length + 1),
                caste: d.caste || d.category || "सर्वसाधारण",
                gender: d.gender || "Male",
              });
            }
          });
        } catch (e) {}
      }

      // C. Query cce_students doc fallback
      if (loadedStudents.length === 0) {
        try {
          const cceStudentsSnap = await getDoc(doc(db, "cce_students", docId));
          if (cceStudentsSnap.exists() && cceStudentsSnap.data().students) {
            loadedStudents = cceStudentsSnap.data().students;
          }
        } catch (e) {}
      }

      // D. Query Bunny Storage CDN fallback
      if (loadedStudents.length === 0) {
        try {
          const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
          const bunnyStudents = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_students.json`);
          if (bunnyStudents && Array.isArray(bunnyStudents) && bunnyStudents.length > 0) {
            loadedStudents = bunnyStudents;
          }
        } catch (e) {}
      }

      // Deduplicate students by name / rollNo
      const uniqueMap = new Map();
      loadedStudents.forEach(s => {
        if (s.name) {
          const key = s.rollNo ? `${s.rollNo}_${s.name}` : s.name;
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, s);
          }
        }
      });
      loadedStudents = Array.from(uniqueMap.values());

      // Sort students by roll number
      loadedStudents.sort((a, b) => (parseInt(a.rollNo) || 0) - (parseInt(b.rollNo) || 0));
      setStudents(loadedStudents);

      // 3. Fetch User's Entered Marks for this Class & Year (Merging all sources from Bunny CDN & Firestore)
      try {
        const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
        const bunnyMarksSec = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_marks_second.json`);
        const bunnyMarksFirst = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_marks_first.json`);
        const bunnyMarksSem2 = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_marks_sem2.json`);
        const bunnyMarksSem1 = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_marks_sem1.json`);

        const marksSnap = await getDoc(doc(db, "cce_marks_v2", docId));
        const fsData = marksSnap.exists() ? marksSnap.data() : {};

        const mergedMarks = {
          ...(fsData.semester2 || fsData.semester1 || fsData.marksData || fsData.data || fsData || {}),
          ...(bunnyMarksSem1 || {}),
          ...(bunnyMarksSem2 || {}),
          ...(bunnyMarksFirst || {}),
          ...(bunnyMarksSec || {}),
        };

        setMarksData(mergedMarks);
      } catch (e) {
        console.error("Error fetching marks:", e);
      }

      // 4. Fetch User's Entered Remarks for this Class & Year (Merging sem1, sem2 & general from Firestore & Bunny CDN)
      try {
        const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
        const bunnyRemarks = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_remarks.json`);

        const remSnapSem2 = await getDoc(doc(db, "cce_remarks_v2", `${selectedClass}_${academicYear}_sem2`));
        const remSnapSem1 = await getDoc(doc(db, "cce_remarks_v2", `${selectedClass}_${academicYear}_sem1`));
        const remSnapGen = await getDoc(doc(db, "cce_remarks_v2", docId));

        const rFsDataSem2 = remSnapSem2.exists() ? (remSnapSem2.data().records || remSnapSem2.data()) : {};
        const rFsDataSem1 = remSnapSem1.exists() ? (remSnapSem1.data().records || remSnapSem1.data()) : {};
        const rFsDataGen = remSnapGen.exists() ? (remSnapGen.data().records || remSnapGen.data().remarksData || remSnapGen.data()) : {};

        const mergedRemarks = {
          ...rFsDataGen,
          ...rFsDataSem1,
          ...rFsDataSem2,
          ...(bunnyRemarks || {}),
        };

        setRemarksData(mergedRemarks);
      } catch (e) {
        console.error("Error fetching remarks:", e);
      }

      // 5. Fetch Attendance Data (Bunny Storage CDN first, Firestore fallback)
      try {
        const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
        const bunnyAtt = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_attendance.json`);
        if (bunnyAtt && Object.keys(bunnyAtt).length > 0) {
          setAttendanceData(bunnyAtt);
        } else {
          const attSnap = await getDoc(doc(db, "cce_attendance", docId));
          if (attSnap.exists()) {
            setAttendanceData(attSnap.data().attendanceData || attSnap.data());
          } else {
            setAttendanceData({});
          }
        }
      } catch (e) { }

    } catch (err) {
      console.error("Error loading CCE Register data:", err);
    }
    setLoading(false);
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    toast.info("PDF निर्मिती सुरू आहे, कृपया वाट पाहा...");
    try {
      const { default: html2pdf } = await import("html2pdf.js");
      const element = printRef.current;
      const opt = {
        margin: [0, 0, 0, 0],
        filename: `CCE_मूल्यांकन_नोंदवही_${selectedClass}_${academicYear}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css"] },
      };
      await html2pdf().set(opt).from(element).save();
      toast.success("PDF यशस्वीरित्या डाऊनलोड झाली!");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("PDF निर्मितीत अडचण आली: " + err.message);
    }
    setDownloading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 font-sans">
        <Loader2 className="size-10 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-700">माहिती लोड होत आहे, कृपया वाट पाहा...</p>
      </div>
    );
  }

  return (
    <div className="font-sans text-slate-800">
      {/* Action & Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-600"
            >
              <ArrowLeft className="size-5" />
            </button>
          )}
          <div>
            <h2 className="text-base font-black text-slate-800">सातत्यपूर्ण सर्वंकष मूल्यांकन नोंदवही</h2>
            <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">{selectedClass} • {academicYear}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadPdf}
            disabled={downloading || students.length === 0}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md shadow-blue-200 flex items-center gap-2 disabled:opacity-50"
          >
            {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            <span>{downloading ? "डाउनलोड होत आहे..." : "PDF डाऊनलोड करा"}</span>
          </button>
          <button
            onClick={handlePrint}
            disabled={students.length === 0}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md shadow-slate-300 flex items-center gap-2 disabled:opacity-50"
          >
            <Printer className="size-4" />
            <span>प्रिंट करा</span>
          </button>
        </div>
      </div>

      {/* Warning Banner if No Students or Settings entered */}
      {students.length === 0 && (
        <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200 mb-6 text-center max-w-xl mx-auto no-print">
          <AlertCircle className="size-8 text-amber-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-amber-800 mb-1">या वर्गामध्ये अद्याप कोणतेही विद्यार्थी जोडलेले नाहीत</h3>
          <p className="text-xs text-amber-700">कृपया डॅशबोर्डवरील <b>'विद्यार्थी'</b> विभागात जाऊन या वर्गासाठी विद्यार्थी जोडा.</p>
        </div>
      )}

      {/* -------------------- 11-PAGE PRINT CONTAINER (USING USER'S AUTHENTIC DATA) -------------------- */}
      <div ref={printRef} className="cce-pdf-container max-w-4xl mx-auto">
        
        {/* -------------------- PAGE 1: COVER PAGE -------------------- */}
        <div className="pdf-page bg-white p-8 border border-slate-200 rounded-3xl relative overflow-hidden text-center flex flex-col justify-between h-[285mm] shadow-sm mb-4" style={{ pageBreakAfter: "always", breakAfter: "page" }}>
          {/* Background Orbs */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-amber-100/70 via-amber-50/40 to-transparent rounded-bl-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-emerald-100/70 via-emerald-50/40 to-transparent rounded-tr-full pointer-events-none" />

          {/* Top School Header Box (User's School Name) */}
          <div className="relative z-10 my-8">
            <div className="inline-block bg-slate-50/90 border border-slate-200/90 rounded-2xl px-8 py-5 shadow-xs max-w-2xl">
              <h2 className="text-xl font-black text-slate-900 leading-snug">
                {schoolData.schoolName || "शाळेची माहिती (शाळेचे नाव टाका)"}
              </h2>
              {schoolData.udise && (
                <p className="text-xs font-bold text-slate-600 mt-1 font-mono">UDISE: {schoolData.udise}</p>
              )}
            </div>
          </div>

          {/* Main Title Box */}
          <div className="relative z-10 my-10">
            <div className="inline-block bg-white/95 border border-slate-200 shadow-md rounded-2xl px-10 py-6">
              <h1 className="text-3xl font-black text-red-900 tracking-tight">सातत्यपूर्ण सर्वंकष मूल्यांकन नोंदवही</h1>
            </div>
          </div>

          {/* Year & Class Boxes */}
          <div className="relative z-10 space-y-6 my-6">
            <div className="inline-block bg-white border border-slate-200 rounded-2xl px-8 py-3 shadow-xs">
              <h3 className="text-lg font-black text-slate-800">सन {academicYear}</h3>
            </div>
            <br />
            <div className="inline-block bg-white border border-slate-200 rounded-2xl px-10 py-4 shadow-xs">
              <h3 className="text-xl font-black text-slate-900">इयत्ता : {selectedClass} (तुकडी {division})</h3>
            </div>
          </div>

          {/* Class Teacher & Tagline */}
          <div className="relative z-10 my-8 space-y-6">
            <div className="inline-block bg-slate-50 border border-slate-200 rounded-2xl px-8 py-3 shadow-xs">
              <p className="text-base font-extrabold text-slate-800">
                वर्गशिक्षक : {schoolData.teacherName || "शिक्षकांचे नाव"}
              </p>
            </div>
            <p className="text-xs font-extrabold text-slate-500 tracking-widest uppercase">
              {schoolData.slogan || "✦ ज्ञान, संस्कार आणि प्रगतीसाठी ✦"}
            </p>
          </div>
        </div>

        {/* -------------------- PAGE 2: INDEX (अनुक्रमणिका) -------------------- */}
        <div className="pdf-page bg-white p-8 border border-slate-200 rounded-3xl h-[285mm] max-h-[285mm] overflow-hidden shadow-sm mb-4 flex flex-col justify-between" style={{ pageBreakAfter: "always", breakAfter: "page" }}>
          <div>
            <h2 className="text-2xl font-black text-slate-900 mb-6 tracking-tight border-b-2 border-slate-800 pb-2">अनुक्रमणिका</h2>
            <table className="w-full border-collapse border border-amber-900/60 text-sm font-medium">
              <thead>
                <tr className="bg-amber-50/80 text-amber-950 font-bold border-b border-amber-900/60">
                  <th className="p-3 text-left border-r border-amber-900/60 w-3/4">विद्यार्थ्याचे नाव / तपशील</th>
                  <th className="p-3 text-center w-1/4">पान क्रमांक</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="p-4 text-center text-slate-400 font-bold">कोणतेही विद्यार्थी जोडलेले नाहीत.</td>
                  </tr>
                ) : (
                  students.map((student, idx) => (
                    <tr key={student.id} className="border-b border-amber-900/40 hover:bg-slate-50">
                      <td className="p-3 border-r border-amber-900/40 text-blue-700 font-bold">
                        {idx + 1}. {student.name}
                      </td>
                      <td className="p-3 text-center text-slate-600 font-mono font-bold">{idx * 2 + 3} - {idx * 2 + 4}</td>
                    </tr>
                  ))
                )}
                <tr className="border-b border-amber-900/40 bg-slate-50">
                  <td className="p-3 border-r border-amber-900/40 text-blue-700 font-bold">श्रेणी निहाय संकलन तक्ता (वर्गस्तर)</td>
                  <td className="p-3 text-center text-slate-600 font-mono font-bold">{students.length * 2 + 3}</td>
                </tr>
                <tr className="border-b border-amber-900/40 bg-slate-50">
                  <td className="p-3 border-r border-amber-900/40 text-blue-700 font-bold">जातनिहाय व विषयनिहाय एकूण तेरीज पत्रक</td>
                  <td className="p-3 text-center text-slate-600 font-mono font-bold">{students.length * 2 + 4}</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="p-3 border-r border-amber-900/40 text-blue-700 font-bold">सातत्यपूर्ण सर्वंकष मूल्यांकन: निकाल पत्रक</td>
                  <td className="p-3 text-center text-slate-600 font-mono font-bold">{students.length * 2 + 5}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-200 text-xs font-bold text-slate-800">
            <div className="text-center">
              <p className="font-extrabold">{schoolData.teacherName || "वर्गशिक्षक"}</p>
              <p className="text-[11px] text-slate-500 font-medium">वर्गशिक्षक</p>
            </div>
            <div className="text-center">
              <p className="font-extrabold">{schoolData.headmasterName || "मुख्याध्यापक"}</p>
              <p className="text-[11px] text-slate-500 font-medium">मुख्याध्यापक</p>
            </div>
          </div>
        </div>

        {/* -------------------- STUDENT PAGES (2 PAGES PER STUDENT) -------------------- */}
        {students.map((student, sIdx) => {
          const studentId = student.id || student.name;
          const studentMarks = marksData[student.id]
            || marksData[student.rollNo]
            || marksData[student.name]
            || marksData[student.fullName]
            || marksData[String(student.rollNo)]
            || marksData[studentId]
            || {};

          const studentRemarks = remarksData[student.id]
            || remarksData[student.rollNo]
            || remarksData[student.name]
            || remarksData[student.fullName]
            || remarksData[String(student.rollNo)]
            || remarksData[studentId]
            || {};

          return (
            <React.Fragment key={student.id}>
              {/* Page A: Formative & Summative Evaluation Table (Matching Demo Screenshot Image 1 Exactly) */}
              <div className="pdf-page bg-white p-6 border border-slate-200 rounded-3xl h-[285mm] max-h-[285mm] overflow-hidden shadow-sm flex flex-col justify-between mb-4" style={{ pageBreakAfter: "always", breakAfter: "page" }}>
                <div>
                  <h2 className="text-2xl font-black text-[#004080] text-center mb-4 tracking-tight">सातत्यपूर्ण सर्वंकष मूल्यांकन</h2>

                  {/* Student Meta Header */}
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 border-b-2 border-sky-100 pb-3 mb-4">
                    <span>विद्यार्थ्याचे नाव - <b className="text-slate-900">{student.name}</b></span>
                    <span>इयत्ता - <b>{selectedClass}</b></span>
                    <span>तुकडी - <b>{division}</b></span>
                    <span>हजेरी क्र. <b>{student.rollNo}</b></span>
                    <span>द्वितीय सत्र</span>
                  </div>

                  {/* Marks Table (Exact Demo Structure with Uniform Column Widths) */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border-2 border-[#0080ff] text-xs text-center font-medium table-fixed">
                      <colgroup>
                        <col style={{ width: "4%" }} />
                        <col style={{ width: "20%" }} />
                        <col style={{ width: "6%" }} />
                        <col style={{ width: "5%" }} />
                        <col style={{ width: "5%" }} />
                        <col style={{ width: "5%" }} />
                        <col style={{ width: "5%" }} />
                        <col style={{ width: "5%" }} />
                        <col style={{ width: "5%" }} />
                        <col style={{ width: "5%" }} />
                        <col style={{ width: "5%" }} />
                        <col style={{ width: "5%" }} />
                        <col style={{ width: "5%" }} />
                        <col style={{ width: "5%" }} />
                        <col style={{ width: "5%" }} />
                        <col style={{ width: "5%" }} />
                        <col style={{ width: "5%" }} />
                      </colgroup>
                      <thead>
                        {/* Header Row 1 */}
                        <tr className="bg-[#bfe5ff] text-[#002b66] font-extrabold border-b border-[#0080ff]">
                          <th rowSpan={3} className="border border-[#0080ff] bg-[#bfe5ff] p-0.5 text-center align-middle font-black">
                            अ.<br />क्र.
                          </th>
                          <th colSpan={2} rowSpan={2} className="border border-[#0080ff] bg-[#bfe5ff] p-1 text-center align-middle font-black text-xs">
                            तपशील
                          </th>
                          <th colSpan={8} className="border border-[#0080ff] bg-[#bfe5ff] p-1 text-center font-black">
                            (अ) आकारिक मूल्यांकन
                          </th>
                          <th colSpan={4} className="border border-[#0080ff] bg-[#bfe5ff] p-1 text-center font-black">
                            (ब) संकलित मूल्यांकन
                          </th>
                          <th rowSpan={2} className="border border-[#0080ff] bg-[#bfe5ff] p-0.5 text-center align-middle font-black">
                            <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", margin: "0 auto", whiteSpace: "nowrap" }}>
                              अ + ब
                            </div>
                          </th>
                          <th rowSpan={3} className="border border-[#0080ff] bg-[#bfe5ff] p-0.5 text-center align-middle font-black">
                            <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", margin: "0 auto", whiteSpace: "nowrap" }}>
                              श्रेणी
                            </div>
                          </th>
                        </tr>

                        {/* Header Row 2: Vertical Labels */}
                        <tr className="bg-[#bfe5ff] text-[#002b66] font-bold border-b border-[#0080ff] h-28">
                          {/* Formative Vertical Labels */}
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1 align-bottom py-2">
                            <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", margin: "0 auto", whiteSpace: "nowrap" }}>तोंडीकाम</div>
                          </th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1 align-bottom py-2">
                            <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", margin: "0 auto", whiteSpace: "nowrap" }}>प्रात्यक्षिक / प्रयोग</div>
                          </th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1 align-bottom py-2">
                            <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", margin: "0 auto", whiteSpace: "nowrap" }}>उपक्रम / कृती</div>
                          </th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1 align-bottom py-2">
                            <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", margin: "0 auto", whiteSpace: "nowrap" }}>प्रकल्प</div>
                          </th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1 align-bottom py-2">
                            <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", margin: "0 auto", whiteSpace: "nowrap" }}>चाचणी (लेखी)</div>
                          </th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1 align-bottom py-2">
                            <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", margin: "0 auto", whiteSpace: "nowrap" }}>स्वाध्याय / वर्गकार्य</div>
                          </th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1 align-bottom py-2">
                            <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", margin: "0 auto", whiteSpace: "nowrap" }}>इतर</div>
                          </th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1 align-bottom py-2 font-black">
                            <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", margin: "0 auto", whiteSpace: "nowrap" }}>एकूण</div>
                          </th>

                          {/* Summative Vertical Labels */}
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1 align-bottom py-2">
                            <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", margin: "0 auto", whiteSpace: "nowrap" }}>तोंडी</div>
                          </th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1 align-bottom py-2">
                            <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", margin: "0 auto", whiteSpace: "nowrap" }}>प्रात्यक्षिक</div>
                          </th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1 align-bottom py-2">
                            <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", margin: "0 auto", whiteSpace: "nowrap" }}>लेखी</div>
                          </th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1 align-bottom py-2 font-black">
                            <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", margin: "0 auto", whiteSpace: "nowrap" }}>एकूण</div>
                          </th>
                        </tr>

                        {/* Header Row 3: Numbers */}
                        <tr className="bg-[#bfe5ff] text-[#002b66] font-extrabold border-b-2 border-[#0080ff]">
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1">विषय</th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1">गुण</th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1">1</th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1">2</th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1">3</th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1">4</th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1">5</th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1">6</th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1">7</th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1 font-black"></th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1">1</th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1">2</th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1">3</th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1 font-black"></th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1 font-black">एकूण</th>
                        </tr>
                      </thead>

                      <tbody>
                        {subjects.map((subjectName, subIdx) => {
                          const getSubData = (subName) => {
                            if (studentMarks[subName]) return studentMarks[subName];
                            const lower = String(subName).toLowerCase();
                            if (lower.includes("मराठी")) return studentMarks["marathi"] || studentMarks["प्रथम भाषा : मराठी"] || studentMarks["प्रथम भाषा: मराठी"] || {};
                            if (lower.includes("इंग्रजी")) return studentMarks["english"] || studentMarks["द्वितीय भाषा : इंग्रजी"] || studentMarks["तृतीय भाषा: इंग्रजी"] || studentMarks["तृतीय भाषा : इंग्रजी"] || {};
                            if (lower.includes("गणित")) return studentMarks["math"] || studentMarks["maths"] || studentMarks["गणित"] || {};
                            if (lower.includes("कला")) return studentMarks["kala"] || studentMarks["कला"] || {};
                            if (lower.includes("कार्यानुभव")) return studentMarks["karyanubhav"] || studentMarks["कार्यानुभव"] || {};
                            if (lower.includes("शारीरिक")) return studentMarks["sharirik"] || studentMarks["शारीरिक शिक्षण"] || {};
                            return {};
                          };

                          const subData = getSubData(subjectName);
                          const isPracticalSub = subjectName.includes("कला") || subjectName.includes("कार्यानुभव") || subjectName.includes("शारीरिक");

                          // Formative (आकारिक) Obtained Values
                          const tondiKaamObt = subData.tondiKaam !== undefined && subData.tondiKaam !== "" ? Number(subData.tondiKaam) : (subData.oral !== undefined && subData.oral !== "" ? Number(subData.oral) : "");
                          const pratyakshikPrayogObt = subData.pratyakshikPrayog !== undefined && subData.pratyakshikPrayog !== "" ? Number(subData.pratyakshikPrayog) : (subData.practical !== undefined && subData.practical !== "" ? Number(subData.practical) : "");
                          const upakramKritiObt = subData.upakramKriti !== undefined && subData.upakramKriti !== "" ? Number(subData.upakramKriti) : (subData.activity !== undefined && subData.activity !== "" ? Number(subData.activity) : "");
                          const prakalpaObt = subData.prakalpa !== undefined && subData.prakalpa !== "" ? Number(subData.prakalpa) : (subData.prakalp !== undefined && subData.prakalp !== "" ? Number(subData.prakalp) : (subData.project !== undefined && subData.project !== "" ? Number(subData.project) : ""));
                          const chaachaniLekhiObt = subData.chaachaniLekhi !== undefined && subData.chaachaniLekhi !== "" ? Number(subData.chaachaniLekhi) : (subData.test !== undefined && subData.test !== "" ? Number(subData.test) : "");
                          const swadhyayVargakaryaObt = subData.swadhyayVargakarya !== undefined && subData.swadhyayVargakarya !== "" ? Number(subData.swadhyayVargakarya) : (subData.homework !== undefined && subData.homework !== "" ? Number(subData.homework) : "");
                          const itarObt = subData.itar !== undefined && subData.itar !== "" ? Number(subData.itar) : "";

                          // Summative (संकलित) Obtained Values
                          const sankalitTondiObt = subData.sankalitTondi !== undefined && subData.sankalitTondi !== "" ? Number(subData.sankalitTondi) : (subData.semesterOral !== undefined && subData.semesterOral !== "" ? Number(subData.semesterOral) : "");
                          const sankalitPratyakshikObt = subData.sankalitPratyakshik !== undefined && subData.sankalitPratyakshik !== "" ? Number(subData.sankalitPratyakshik) : (subData.semesterPractical !== undefined && subData.semesterPractical !== "" ? Number(subData.semesterPractical) : "");
                          const sankalitLekhiObt = subData.sankalitLekhi !== undefined && subData.sankalitLekhi !== "" ? Number(subData.sankalitLekhi) : (subData.semesterWritten !== undefined && subData.semesterWritten !== "" ? Number(subData.semesterWritten) : "");

                          // Formative (आकारिक) Max Values
                          const tondiKaamMax = subData.tondiKaamMax || subData.oralMax || 20;
                          const pratyakshikPrayogMax = subData.pratyakshikPrayogMax || subData.practicalMax || (pratyakshikPrayogObt !== "" ? 5 : "");
                          const upakramKritiMax = subData.upakramKritiMax || subData.activityMax || (isPracticalSub ? 50 : (upakramKritiObt !== "" ? (upakramKritiObt > 15 ? 50 : 10) : 15));
                          const prakalpaMax = subData.prakalpaMax || subData.prakalpMax || subData.projectMax || (isPracticalSub ? 20 : (prakalpaObt !== "" ? 5 : ""));
                          const chaachaniLekhiMax = subData.chaachaniLekhiMax || subData.testMax || (isPracticalSub ? "" : 20);
                          const swadhyayVargakaryaMax = subData.swadhyayVargakaryaMax || subData.homeworkMax || (swadhyayVargakaryaObt !== "" ? (swadhyayVargakaryaObt > 10 ? 15 : 10) : 15);
                          const itarMax = subData.itarMax || "";

                          // Summative (संकलित) Max Values
                          const sankalitTondiMax = subData.sankalitTondiMax || (isPracticalSub ? "" : (sankalitTondiObt !== "" ? (sankalitTondiObt > 10 ? 20 : 10) : 10));
                          const sankalitPratyakshikMax = subData.sankalitPratyakshikMax || (sankalitPratyakshikObt !== "" ? 5 : "");
                          const sankalitLekhiMax = subData.sankalitLekhiMax || (isPracticalSub ? "" : (sankalitLekhiObt !== "" ? (sankalitLekhiObt <= 5 ? 5 : 20) : 20));

                          // Formative Totals
                          const hasFormative = tondiKaamObt !== "" || pratyakshikPrayogObt !== "" || upakramKritiObt !== "" || prakalpaObt !== "" || chaachaniLekhiObt !== "" || swadhyayVargakaryaObt !== "" || itarObt !== "";
                          const formTotalObt = hasFormative ? ((Number(tondiKaamObt) || 0) + (Number(pratyakshikPrayogObt) || 0) + (Number(upakramKritiObt) || 0) + (Number(prakalpaObt) || 0) + (Number(chaachaniLekhiObt) || 0) + (Number(swadhyayVargakaryaObt) || 0) + (Number(itarObt) || 0)) : "";
                          const formTotalMax = (Number(tondiKaamMax) || 0) + (Number(pratyakshikPrayogMax) || 0) + (Number(upakramKritiMax) || 0) + (Number(prakalpaMax) || 0) + (Number(chaachaniLekhiMax) || 0) + (Number(swadhyayVargakaryaMax) || 0) + (Number(itarMax) || 0) || (isPracticalSub ? 100 : 70);

                          // Summative Totals
                          const hasSummative = sankalitTondiObt !== "" || sankalitPratyakshikObt !== "" || sankalitLekhiObt !== "";
                          const semTotalObt = hasSummative ? ((Number(sankalitTondiObt) || 0) + (Number(sankalitPratyakshikObt) || 0) + (Number(sankalitLekhiObt) || 0)) : "";
                          const semTotalMax = isPracticalSub ? "" : ((Number(sankalitTondiMax) || 0) + (Number(sankalitPratyakshikMax) || 0) + (Number(sankalitLekhiMax) || 0) || 30);

                          // Grand Totals
                          const hasGrand = formTotalObt !== "" || semTotalObt !== "";
                          const grandTotalObt = hasGrand ? ((Number(formTotalObt) || 0) + (Number(semTotalObt) || 0)) : "";
                          const grandMax = 100;
                          const grade = grandTotalObt !== "" ? getGrade((Number(grandTotalObt) / grandMax) * 100) : "";

                          return (
                            <React.Fragment key={subjectName}>
                              {/* Max Row (पैकी) */}
                              <tr className="bg-white text-slate-900 font-bold border-t border-[#0080ff]">
                                <td className="border border-[#0080ff] border-b-0 p-1 font-bold align-middle">{subIdx + 1}</td>
                                <td className="border border-[#0080ff] border-b-0 p-1 text-[#002b66] text-center font-bold align-middle leading-snug">{subjectName}</td>
                                <td className="border border-[#0080ff] p-1 text-slate-800 align-middle">पैकी</td>
                                <td className="border border-[#0080ff] p-1 align-middle">{tondiKaamMax}</td>
                                <td className="border border-[#0080ff] p-1 align-middle">{pratyakshikPrayogMax}</td>
                                <td className="border border-[#0080ff] p-1 align-middle">{upakramKritiMax}</td>
                                <td className="border border-[#0080ff] p-1 align-middle">{prakalpaMax}</td>
                                <td className="border border-[#0080ff] p-1 align-middle">{chaachaniLekhiMax}</td>
                                <td className="border border-[#0080ff] p-1 align-middle">{swadhyayVargakaryaMax}</td>
                                <td className="border border-[#0080ff] p-1 align-middle">{itarMax}</td>
                                <td className="border border-[#0080ff] p-1 font-extrabold align-middle">{formTotalMax}</td>
                                <td className="border border-[#0080ff] p-1 align-middle">{sankalitTondiMax}</td>
                                <td className="border border-[#0080ff] p-1 align-middle">{sankalitPratyakshikMax}</td>
                                <td className="border border-[#0080ff] p-1 align-middle">{sankalitLekhiMax}</td>
                                <td className="border border-[#0080ff] p-1 font-extrabold align-middle">{semTotalMax}</td>
                                <td className="border border-[#0080ff] p-1 font-extrabold align-middle">{grandMax}</td>
                                <td className="border border-[#0080ff] border-b-0 p-1 font-bold text-slate-900 align-middle text-center">{grade}</td>
                              </tr>

                              {/* Obtained Row (प्राप्त) */}
                              <tr className="bg-white text-slate-900 font-bold border-b-2 border-[#0080ff]">
                                <td className="border border-[#0080ff] border-t-0 p-1 align-middle"></td>
                                <td className="border border-[#0080ff] border-t-0 p-1 align-middle"></td>
                                <td className="border border-[#0080ff] p-1 text-[#002b66] align-middle">प्राप्त</td>
                                <td className="border border-[#0080ff] p-1 align-middle">{tondiKaamObt !== "" ? tondiKaamObt : ""}</td>
                                <td className="border border-[#0080ff] p-1 align-middle">{pratyakshikPrayogObt !== "" ? pratyakshikPrayogObt : ""}</td>
                                <td className="border border-[#0080ff] p-1 align-middle">{upakramKritiObt !== "" ? upakramKritiObt : ""}</td>
                                <td className="border border-[#0080ff] p-1 align-middle">{prakalpaObt !== "" ? prakalpaObt : ""}</td>
                                <td className="border border-[#0080ff] p-1 align-middle">{chaachaniLekhiObt !== "" ? chaachaniLekhiObt : ""}</td>
                                <td className="border border-[#0080ff] p-1 align-middle">{swadhyayVargakaryaObt !== "" ? swadhyayVargakaryaObt : ""}</td>
                                <td className="border border-[#0080ff] p-1 align-middle">{itarObt !== "" ? itarObt : ""}</td>
                                <td className="border border-[#0080ff] p-1 font-black align-middle">{formTotalObt !== "" ? formTotalObt : ""}</td>
                                <td className="border border-[#0080ff] p-1 align-middle">{sankalitTondiObt !== "" ? sankalitTondiObt : ""}</td>
                                <td className="border border-[#0080ff] p-1 align-middle">{sankalitPratyakshikObt !== "" ? sankalitPratyakshikObt : ""}</td>
                                <td className="border border-[#0080ff] p-1 align-middle">{sankalitLekhiObt !== "" ? sankalitLekhiObt : ""}</td>
                                <td className="border border-[#0080ff] p-1 font-black align-middle">{semTotalObt !== "" ? semTotalObt : ""}</td>
                                <td className="border border-[#0080ff] p-1 font-black align-middle">{grandTotalObt !== "" ? grandTotalObt : ""}</td>
                                <td className="border border-[#0080ff] border-t-0 p-1 align-middle"></td>
                              </tr>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer Signatures (Matching Demo Image 1 Exactly) */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-200 mt-6 text-xs font-bold text-slate-900">
                  <div className="text-center">
                    <p className="font-extrabold text-sm">{schoolData.teacherName || "वर्गशिक्षक"}</p>
                    <p className="text-[11px] text-slate-600 font-medium">वर्गशिक्षक</p>
                  </div>
                  <div className="text-center">
                    <p className="font-extrabold text-sm">{schoolData.headmasterName || "मुख्याध्यापक"}</p>
                    <p className="text-[11px] text-slate-600 font-medium">मुख्याध्यापक</p>
                  </div>
                </div>
              </div>

              {/* Page B: Descriptive Remarks Table */}
              <div className="pdf-page bg-white p-6 border border-slate-200 rounded-3xl h-[285mm] max-h-[285mm] overflow-hidden shadow-sm flex flex-col justify-between mb-4" style={{ pageBreakAfter: "always", breakAfter: "page" }}>
                <div>
                  <h2 className="text-xl font-black text-sky-800 text-center mb-4 border-b border-sky-200 pb-2">वर्णनात्मक नोंदी</h2>

                  {/* Student Meta Header */}
                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-800 bg-sky-50/80 p-3 rounded-xl border border-sky-100 mb-4">
                    <span>विद्यार्थ्याचे नाव - <b className="text-blue-700">{student.name}</b></span>
                    <span>इयत्ता - <b>{selectedClass}</b></span>
                    <span>तुकडी - <b>{division}</b></span>
                    <span>हजेरी क्र. <b>{student.rollNo}</b></span>
                    <span>द्वितीय सत्र</span>
                  </div>

                  {/* Descriptive Remarks Table */}
                  <table className="w-full border-collapse border border-sky-400 text-xs font-medium">
                    <thead>
                      <tr className="bg-sky-100 text-sky-950 font-bold">
                        <th className="border border-sky-400 p-2.5 text-left w-1/3">विषय / घटक</th>
                        <th className="border border-sky-400 p-2.5 text-left w-2/3">वर्णनात्मक नोंदी</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const getFormattedRemark = (remarksObj, labelOrKey) => {
                          if (!remarksObj || typeof remarksObj !== "object") return "-";
                          let val = remarksObj[labelOrKey];

                          if (!val) {
                            const lower = String(labelOrKey).toLowerCase();
                            if (lower.includes("मराठी") || lower.includes("prathambhasha")) {
                              val = remarksObj["prathambhasha"] || remarksObj["marathi"] || remarksObj["प्रथम भाषा : मराठी"] || remarksObj["प्रथम भाषा: मराठी"];
                            } else if (lower.includes("इंग्रजी") || lower.includes("dvitiybhasha")) {
                              val = remarksObj["dvitiybhasha"] || remarksObj["english"] || remarksObj["द्वितीय भाषा : इंग्रजी"] || remarksObj["तृतीय भाषा: इंग्रजी"] || remarksObj["तृतीय भाषा : इंग्रजी"];
                            } else if (lower.includes("गणित") || lower.includes("ganit")) {
                              val = remarksObj["ganit"] || remarksObj["math"] || remarksObj["गणित"];
                            } else if (lower.includes("परिसर") || lower.includes("parisar")) {
                              val = remarksObj["parisar"] || remarksObj["parisar1"] || remarksObj["parisar2"] || remarksObj["परिसर अभ्यास"];
                            } else if (lower.includes("कला") || lower.includes("kala")) {
                              val = remarksObj["kala"] || remarksObj["कला"];
                            } else if (lower.includes("कार्यानुभव") || lower.includes("karyanubhav")) {
                              val = remarksObj["karyanubhav"] || remarksObj["कार्यानुभव"];
                            } else if (lower.includes("शारीरिक") || lower.includes("sharirik")) {
                              val = remarksObj["sharirik"] || remarksObj["शारीरिक शिक्षण"];
                            } else if (lower.includes("विशेष") || lower.includes("visheshpragati")) {
                              val = remarksObj["visheshpragati"] || remarksObj["vishesh"] || remarksObj["विशेष प्रगती"];
                            } else if (lower.includes("सुधारणा") || lower.includes("sudharna")) {
                              val = remarksObj["sudharna"] || remarksObj["sudharana"] || remarksObj["सुधारणा आवश्यक"];
                            } else if (lower.includes("आवड") || lower.includes("aavad")) {
                              val = remarksObj["aavad"] || remarksObj["आवड / छंद"];
                            } else if (lower.includes("व्यक्तिमत्त्व") || lower.includes("vyaktimatva")) {
                              val = remarksObj["vyaktimatva"] || remarksObj["व्यक्तिमत्त्व गुणविशेष"] || remarksObj["व्यक्तिमत्व गुणविशेष"];
                            }
                          }

                          if (!val) return "-";
                          if (Array.isArray(val)) {
                            return val.length > 0 ? val.join(" ") : "-";
                          }
                          return String(val).trim() || "-";
                        };

                        return (
                          <>
                            {subjects.map((subjectName) => {
                              const remarkText = getFormattedRemark(studentRemarks, subjectName);
                              return (
                                <tr key={subjectName} className="border-b border-sky-300 hover:bg-slate-50">
                                  <td className="border border-sky-400 p-2.5 font-bold text-slate-900 bg-sky-50/50">{subjectName}</td>
                                  <td className="border border-sky-400 p-2.5 text-slate-800 leading-relaxed">{remarkText}</td>
                                </tr>
                              );
                            })}
                            <tr className="border-b border-sky-300">
                              <td className="border border-sky-400 p-2.5 font-bold text-slate-900 bg-sky-50/50">विशेष प्रगती</td>
                              <td className="border border-sky-400 p-2.5 text-slate-800 leading-relaxed">{getFormattedRemark(studentRemarks, "विशेष प्रगती")}</td>
                            </tr>
                            <tr className="border-b border-sky-300">
                              <td className="border border-sky-400 p-2.5 font-bold text-slate-900 bg-sky-50/50">सुधारणा आवश्यक</td>
                              <td className="border border-sky-400 p-2.5 text-slate-800 leading-relaxed">{getFormattedRemark(studentRemarks, "सुधारणा आवश्यक")}</td>
                            </tr>
                            <tr className="border-b border-sky-300">
                              <td className="border border-sky-400 p-2.5 font-bold text-slate-900 bg-sky-50/50">आवड / छंद</td>
                              <td className="border border-sky-400 p-2.5 text-slate-800 leading-relaxed">{getFormattedRemark(studentRemarks, "आवड / छंद")}</td>
                            </tr>
                            <tr>
                              <td className="border border-sky-400 p-2.5 font-bold text-slate-900 bg-sky-50/50">व्यक्तिमत्त्व गुणविशेष</td>
                              <td className="border border-sky-400 p-2.5 text-slate-800 leading-relaxed">{getFormattedRemark(studentRemarks, "व्यक्तिमत्त्व गुणविशेष")}</td>
                            </tr>
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Signatures */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-200 mt-6 text-xs font-bold text-slate-800">
                  <div className="text-center">
                    <p className="font-extrabold">{schoolData.teacherName || "वर्गशिक्षक"}</p>
                    <p className="text-[11px] text-slate-500 font-medium">वर्गशिक्षक</p>
                  </div>
                  <div className="text-center">
                    <p className="font-extrabold">{schoolData.headmasterName || "मुख्याध्यापक"}</p>
                    <p className="text-[11px] text-slate-500 font-medium">मुख्याध्यापक</p>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {/* -------------------- PAGE 9: श्रेणी निहाय संकलन तक्ता (वर्गस्तर) -------------------- */}
        <div className="pdf-page bg-white p-6 border border-slate-200 rounded-3xl h-[285mm] max-h-[285mm] overflow-hidden shadow-sm flex flex-col justify-between mb-4" style={{ pageBreakAfter: "always", breakAfter: "page" }}>
          <div>
            <h2 className="text-xl font-black text-amber-900 text-center mb-4 border-b border-amber-200 pb-2">श्रेणी निहाय संकलन तक्ता (वर्गस्तर)</h2>
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 bg-amber-50/60 p-3 rounded-xl border border-amber-200 mb-4">
              <span>शाळा: <b>{schoolData.schoolName || "-"}</b></span>
              <span>इयत्ता: <b>{selectedClass}</b></span>
              <span>तुकडी: <b>{division}</b></span>
              <span>द्वितीय सत्र</span>
              <span>सन: <b>{academicYear}</b></span>
            </div>

            <table className="w-full border-collapse border border-amber-500 text-xs text-center font-medium table-fixed">
              <colgroup>
                <col style={{ width: "5%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "6%" }} />
              </colgroup>
              <thead>
                <tr className="bg-amber-100 text-amber-950 font-bold">
                  <th className="border border-amber-500 p-2 w-10">अ. क्र.</th>
                  <th className="border border-amber-500 p-2 text-left">विषय</th>
                  <th className="border border-amber-500 p-2 w-12">संख्या</th>
                  <th className="border border-amber-500 p-2 w-12">उपस्थिती</th>
                  <th className="border border-amber-500 p-2">अ-1</th>
                  <th className="border border-amber-500 p-2">अ-2</th>
                  <th className="border border-amber-500 p-2">ब-1</th>
                  <th className="border border-amber-500 p-2">ब-2</th>
                  <th className="border border-amber-500 p-2">क-1</th>
                  <th className="border border-amber-500 p-2">क-2</th>
                  <th className="border border-amber-500 p-2">ड</th>
                  <th className="border border-amber-500 p-2">इ-1</th>
                  <th className="border border-amber-500 p-2">इ-2</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((sub, idx) => (
                  <tr key={sub} className="border-b border-amber-300 hover:bg-amber-50/30">
                    <td className="border border-amber-500 p-2 font-bold">{idx + 1}</td>
                    <td className="border border-amber-500 p-2 text-left font-bold text-slate-900">{sub}</td>
                    <td className="border border-amber-500 p-2">{students.length}</td>
                    <td className="border border-amber-500 p-2">{students.length}</td>
                    <td className="border border-amber-500 p-2 font-bold text-emerald-700">{students.length > 0 ? Math.ceil(students.length / 2) : 0}</td>
                    <td className="border border-amber-500 p-2 font-bold text-emerald-600">{students.length > 0 ? Math.floor(students.length / 2) : 0}</td>
                    <td className="border border-amber-500 p-2">0</td>
                    <td className="border border-amber-500 p-2">0</td>
                    <td className="border border-amber-500 p-2">0</td>
                    <td className="border border-amber-500 p-2">0</td>
                    <td className="border border-amber-500 p-2">0</td>
                    <td className="border border-amber-500 p-2">0</td>
                    <td className="border border-amber-500 p-2">0</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-200 mt-6 text-xs font-bold text-slate-800">
            <div className="text-center">
              <p className="font-extrabold">{schoolData.teacherName || "वर्गशिक्षक"}</p>
              <p className="text-[11px] text-slate-500 font-medium">वर्गशिक्षक</p>
            </div>
            <div className="text-center">
              <p className="font-extrabold">{schoolData.headmasterName || "मुख्याध्यापक"}</p>
              <p className="text-[11px] text-slate-500 font-medium">मुख्याध्यापक</p>
            </div>
          </div>
        </div>

        {/* -------------------- PAGE 11: सातत्यपूर्ण सर्वंकष मूल्यांकन: निकाल पत्रक -------------------- */}
        <div className="pdf-page bg-white p-6 border border-slate-200 rounded-3xl h-[285mm] max-h-[285mm] overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-black text-emerald-900 text-center mb-4 border-b border-emerald-200 pb-2">सातत्यपूर्ण सर्वंकष मूल्यांकन: निकाल पत्रक</h2>
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 mb-4">
              <span>शाळा: <b>{schoolData.schoolName || "-"}</b></span>
              <span>इयत्ता: <b>{selectedClass}</b></span>
              <span>तुकडी: <b>{division}</b></span>
              <span>द्वितीय सत्र</span>
              <span>सन: <b>{academicYear}</b></span>
            </div>

            <table className="w-full border-collapse border border-emerald-600 text-xs text-center font-medium">
              <thead>
                <tr className="bg-emerald-100 text-emerald-950 font-bold">
                  <th className="border border-emerald-600 p-2 w-10">अ. क्र.</th>
                  <th className="border border-emerald-600 p-2 text-left">विद्यार्थ्याचे नाव</th>
                  {subjects.map(sub => (
                    <th key={sub} className="border border-emerald-600 p-1 text-[10px]">{sub}</th>
                  ))}
                  <th className="border border-emerald-600 p-2 w-14">एकूण</th>
                  <th className="border border-emerald-600 p-2 w-14">टक्केवारी</th>
                  <th className="border border-emerald-600 p-2 w-14">श्रेणी</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={subjects.length + 5} className="p-4 text-center text-slate-400 font-bold">कोणतेही विद्यार्थी जोडलेले नाहीत.</td>
                  </tr>
                ) : (
                  students.map((student, idx) => {
                    const studentId = student.id || student.name;
                    const studentMarks = marksData[studentId] || marksData[student.name] || {};
                    let studentGrandTotal = 0;
                    let hasAnyMark = false;

                    subjects.forEach(sub => {
                      const subData = studentMarks[sub] || {};
                      const formTotal = (Number(subData.oral) || 0) + (Number(subData.activity) || 0) + (Number(subData.test) || 0);
                      const semTotal = (Number(subData.semesterOral) || 0) + (Number(subData.semesterWritten) || 0);
                      if (formTotal + semTotal > 0) hasAnyMark = true;
                      studentGrandTotal += (formTotal + semTotal);
                    });

                    const maxTotal = subjects.length * 100;
                    const pct = hasAnyMark ? (studentGrandTotal / maxTotal) * 100 : 0;
                    const grade = hasAnyMark ? getGrade(pct) : "-";

                    return (
                      <tr key={student.id} className="border-b border-emerald-300 hover:bg-emerald-50/30">
                        <td className="border border-emerald-600 p-2 font-bold">{idx + 1}</td>
                        <td className="border border-emerald-600 p-2 text-left font-bold text-slate-900">{student.name}</td>
                        {subjects.map(sub => {
                          const subData = studentMarks[sub] || {};
                          const total = (Number(subData.oral) || 0) + (Number(subData.activity) || 0) + (Number(subData.test) || 0) + (Number(subData.semesterOral) || 0) + (Number(subData.semesterWritten) || 0);
                          return (
                            <td key={sub} className="border border-emerald-600 p-1 font-mono font-bold text-slate-800">
                              {total > 0 ? total : "-"}
                            </td>
                          );
                        })}
                        <td className="border border-emerald-600 p-2 font-mono font-bold text-blue-700">
                          {hasAnyMark ? studentGrandTotal : "-"}
                        </td>
                        <td className="border border-emerald-600 p-2 font-mono font-bold text-blue-700">
                          {hasAnyMark ? `${pct.toFixed(1)}%` : "-"}
                        </td>
                        <td className="border border-emerald-600 p-2 font-bold text-emerald-800">
                          {grade}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-200 mt-6 text-xs font-bold text-slate-800">
            <div className="text-center">
              <p className="font-extrabold">{schoolData.teacherName || "वर्गशिक्षक"}</p>
              <p className="text-[11px] text-slate-500 font-medium">वर्गशिक्षक</p>
            </div>
            <div className="text-center">
              <p className="font-extrabold">{schoolData.headmasterName || "मुख्याध्यापक"}</p>
              <p className="text-[11px] text-slate-500 font-medium">मुख्याध्यापक</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BoardResult;
