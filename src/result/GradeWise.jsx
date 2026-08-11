import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Download, Printer, Loader2, RefreshCw } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { matchStudentClassAndMedium } from "./firestoreMarksHelper";
import { getTeacherId } from "@/lib/teacherIsolationHelper";
import { toast } from "sonner";

// Default Class Definitions
const INITIAL_CLASSES = [
  { id: "1st", name: "1 ली (1)" },
  { id: "2nd", name: "2 री (1)" },
  { id: "3rd", name: "3 री (1)" },
  { id: "4th", name: "4 थी (1)" },
  { id: "5th", name: "5 वी (1)" },
  { id: "6th", name: "6 वी (1)" },
  { id: "7th", name: "7 वी (1)" },
  { id: "8th", name: "8 वी (1)" },
];

// Helper to determine Grade from percentage
const getGradeCategory = (percent) => {
  if (percent === undefined || percent === null || isNaN(percent)) return "e1";
  const p = Number(percent);
  if (p >= 91) return "a1";
  if (p >= 81) return "a2";
  if (p >= 71) return "b1";
  if (p >= 61) return "b2";
  if (p >= 51) return "c1";
  if (p >= 41) return "c2";
  if (p >= 33) return "d";
  return "e1";
};

// Helper to match class string to index 0-7
const getClassIndex = (rawClassStr) => {
  if (!rawClassStr) return -1;
  const s = String(rawClassStr).trim().toLowerCase();
  if (s.includes("10") || s.includes("१०")) return -1;
  if (s.includes("1") || s.includes("१")) return 0;
  if (s.includes("2") || s.includes("२")) return 1;
  if (s.includes("3") || s.includes("३")) return 2;
  if (s.includes("4") || s.includes("४")) return 3;
  if (s.includes("5") || s.includes("५")) return 4;
  if (s.includes("6") || s.includes("६")) return 5;
  if (s.includes("7") || s.includes("७")) return 6;
  if (s.includes("8") || s.includes("८")) return 7;
  return -1;
};

export default function GradeWise({ initialClass, initialYear, onBack }) {
  const [academicYear, setAcademicYear] = useState(
    initialYear || localStorage.getItem("cce_academic_year") || "2025-26"
  );
  const [selectedTerm, setSelectedTerm] = useState("प्रथम सत्र");
  const [schoolName, setSchoolName] = useState(
    localStorage.getItem("schoolName") ||
    localStorage.getItem("teacher_school_name") ||
    "जिल्हा परिषद शाळा धोंडेवाडी(पेड)ता.तासगाव जि.सांगली"
  );
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Class-wise Grade Data Matrix
  const [gradeMatrix, setGradeMatrix] = useState(() =>
    INITIAL_CLASSES.map((cls) => ({
      ...cls,
      pat: { boys: 0, girls: 0 },
      a1: { boys: 0, girls: 0 }, // 91 ते 100
      a2: { boys: 0, girls: 0 }, // 81 ते 90
      b1: { boys: 0, girls: 0 }, // 71 ते 80
      b2: { boys: 0, girls: 0 }, // 61 ते 70
      c1: { boys: 0, girls: 0 }, // 51 ते 60
      c2: { boys: 0, girls: 0 }, // 41 ते 50
      d: { boys: 0, girls: 0 },  // 33 ते 40
      e1: { boys: 0, girls: 0 }, // 32 व कमी
    }))
  );

  const printRef = useRef(null);

  useEffect(() => {
    fetchSchoolDataAndCalculate();
  }, [academicYear, selectedTerm]);

  const fetchSchoolDataAndCalculate = async () => {
    setLoading(true);
    try {
      // 1. Fetch School Name from Settings / LocalStorage / Firebase
      let fetchedSchoolName = "";
      try {
        const cachedGen = localStorage.getItem("cce_general_school_settings");
        if (cachedGen) {
          const parsed = JSON.parse(cachedGen);
          if (parsed.schoolName) fetchedSchoolName = parsed.schoolName;
        }
      } catch (e) {}

      if (!fetchedSchoolName) {
        fetchedSchoolName =
          localStorage.getItem("schoolName") ||
          localStorage.getItem("teacher_school_name") ||
          "";
      }

      if (!fetchedSchoolName) {
        try {
          const genSnap = await getDoc(doc(db, "school_settings", "general"));
          if (genSnap.exists() && genSnap.data().schoolName) {
            fetchedSchoolName = genSnap.data().schoolName;
          }
        } catch (e) {}
      }

      if (!fetchedSchoolName) {
        try {
          const udise = localStorage.getItem("teacher_udise") || localStorage.getItem("udiseNumber");
          if (udise) {
            const sSnap = await getDoc(doc(db, "school_data", udise));
            if (sSnap.exists() && sSnap.data().schoolName) {
              fetchedSchoolName = sSnap.data().schoolName;
            }
          }
        } catch (e) {}
      }

      if (fetchedSchoolName) {
        setSchoolName(fetchedSchoolName);
      }

      // 2. Initialize empty matrix structure
      const newMatrix = INITIAL_CLASSES.map((cls) => ({
        ...cls,
        pat: { boys: 0, girls: 0 },
        a1: { boys: 0, girls: 0 },
        a2: { boys: 0, girls: 0 },
        b1: { boys: 0, girls: 0 },
        b2: { boys: 0, girls: 0 },
        c1: { boys: 0, girls: 0 },
        c2: { boys: 0, girls: 0 },
        d: { boys: 0, girls: 0 },
        e1: { boys: 0, girls: 0 },
      }));

      // 3. Query all students from Firestore
      try {
        const currentTeacherId = getTeacherId();
        const uSnap = await getDocs(query(collection(db, "users"), where("role", "==", "student")));
        const studentsByClass = {};

        const currentMedium = localStorage.getItem("cce_selected_medium") || "marathi";
        uSnap.forEach((docSnap) => {
          const sData = docSnap.data();
          const rawClass = String(sData.class || sData.currentClass || "").toLowerCase();
          const idx = getClassIndex(rawClass);
          if (idx >= 0 && idx < INITIAL_CLASSES.length) {
            const classId = INITIAL_CLASSES[idx].id; // e.g., "1st", "2nd"
            if (matchStudentClassAndMedium({ id: docSnap.id, ...sData }, classId, currentMedium, currentTeacherId)) {
              if (!studentsByClass[idx]) studentsByClass[idx] = [];
              studentsByClass[idx].push({ id: docSnap.id, ...sData });
            }
          }
        });

        // Determine Term key
        let termKey = "sem1";
        if (selectedTerm === "द्वितीय सत्र") termKey = "sem2";

        // Loop over classes and calculate grade buckets
        for (let idx = 0; idx < INITIAL_CLASSES.length; idx++) {
          const clsObj = INITIAL_CLASSES[idx];
          const classStudents = studentsByClass[idx] || [];

          let semMarks = {};

          const mergeDoc = (d) => {
            if (!d) return;
            const recs = d.records || d.marksData || d.marks || d.data || d;
            if (recs && typeof recs === "object") {
              Object.entries(recs).forEach(([k, v]) => {
                if (v && typeof v === "object") {
                  semMarks[k] = { ...(semMarks[k] || {}), ...v };
                }
              });
            }
          };

          // 1. Bunny storage marks
          try {
            const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
            const b1 = await fetchJsonFromBunny(`cce_results/${clsObj.id}_${academicYear}_${termKey}.json`);
            mergeDoc(b1);
            const bGen = await fetchJsonFromBunny(`cce_results/${clsObj.id}_${academicYear}_marks.json`);
            mergeDoc(bGen);
          } catch (e) {}

          // 2. Firestore cce_marks_v2 documents to try
          const docsToTry = [
            `${clsObj.id}_${academicYear}_${termKey}`,
            `${clsObj.id}_${academicYear}`,
            `${clsObj.id}_${termKey}`,
            `${clsObj.id}`,
          ];

          for (const dId of docsToTry) {
            try {
              const mSnap = await getDoc(doc(db, "cce_marks_v2", dId));
              if (mSnap.exists()) {
                mergeDoc(mSnap.data());
              }
            } catch (e) {}
          }

          classStudents.forEach((st) => {
            const isGirl =
              String(st.gender || st.sex || "").toLowerCase().includes("female") ||
              String(st.gender || st.sex || "").includes("मुली") ||
              String(st.gender || st.sex || "").includes("मुलगी") ||
              String(st.gender || st.sex || "").includes("स्त्री");

            const genderKey = isGirl ? "girls" : "boys";
            newMatrix[idx].pat[genderKey] += 1;

            // Fetch Marks for this student
            const stdRecord =
              semMarks[st.id] ||
              semMarks[st.rollNo] ||
              semMarks[String(st.rollNo)] ||
              semMarks[st.name] ||
              semMarks[st.fullName] ||
              st.marks ||
              st.cce_marks ||
              st.marksData ||
              {};

            let totalObtained = 0;
            let totalMax = 0;

            Object.entries(stdRecord).forEach(([subKey, subVal]) => {
              if (subVal && typeof subVal === "object") {
                let obtained = 0;
                let max = 0;
                if (subVal[termKey]) {
                  const tv = subVal[termKey];
                  obtained = Number(tv.total !== undefined ? tv.total : tv.obtained !== undefined ? tv.obtained : (Number(tv.formative || 0) + Number(tv.summative || 0))) || 0;
                  max = Number(tv.outOf || tv.max || 100) || 100;
                } else {
                  obtained = Number(subVal.total !== undefined ? subVal.total : subVal.obtained !== undefined ? subVal.obtained : (Number(subVal.formative || 0) + Number(subVal.summative || 0))) || 0;
                  max = Number(subVal.outOf || subVal.max || subVal.totalMax || 100) || 100;
                }
                totalObtained += obtained;
                totalMax += max;
              } else if (typeof subVal === "number" || (typeof subVal === "string" && !isNaN(subVal))) {
                totalObtained += Number(subVal);
                totalMax += 100;
              }
            });

            if (totalMax > 0 && totalObtained > 0) {
              const percent = (totalObtained / totalMax) * 100;
              const gradeCat = getGradeCategory(percent);
              newMatrix[idx][gradeCat][genderKey] += 1;
            } else {
              // Default to E1 bucket if no marks recorded yet, so Pat = Sum of Grades
              const gradeCat = getGradeCategory(0);
              newMatrix[idx][gradeCat][genderKey] += 1;
            }
          });
        }
      } catch (e) {
        console.error("Error fetching students for grade wise matrix:", e);
      }

      setGradeMatrix(newMatrix);
    } catch (err) {
      console.error("Error loading grade compilation matrix:", err);
    }
    setLoading(false);
  };

  // Cell Change Handler for manual edits
  const handleCellChange = (classIdx, field, gender, value) => {
    const numVal = Math.max(0, parseInt(value) || 0);
    setGradeMatrix((prev) => {
      const updated = [...prev];
      updated[classIdx] = {
        ...updated[classIdx],
        [field]: {
          ...updated[classIdx][field],
          [gender]: numVal,
        },
      };
      return updated;
    });
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // PDF Export Handler
  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    toast.info("श्रेणीनिहाय निकाल संकलन प्रपत्र PDF तयार होत आहे...");
    try {
      const { default: html2pdf } = await import("html2pdf.js");
      const element = printRef.current;
      const opt = {
        margin: [4, 4, 4, 4],
        filename: `श्रेणीनिहाय_निकाल_संकलन_प्रपत्र_${academicYear}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
      };
      await html2pdf().set(opt).from(element).save();
      toast.success("PDF यशस्वीरित्या डाऊनलोड झाली!");
    } catch (err) {
      console.error("PDF download error:", err);
      toast.error("PDF निर्मितीत अडचण आली: " + (err.message || err));
    }
    setDownloading(false);
  };

  // Calculate Totals Across All Classes
  const calculateTotals = () => {
    const totals = {
      pat: { boys: 0, girls: 0 },
      a1: { boys: 0, girls: 0 },
      a2: { boys: 0, girls: 0 },
      b1: { boys: 0, girls: 0 },
      b2: { boys: 0, girls: 0 },
      c1: { boys: 0, girls: 0 },
      c2: { boys: 0, girls: 0 },
      d: { boys: 0, girls: 0 },
      e1: { boys: 0, girls: 0 },
    };

    gradeMatrix.forEach((row) => {
      Object.keys(totals).forEach((key) => {
        totals[key].boys += row[key]?.boys || 0;
        totals[key].girls += row[key]?.girls || 0;
      });
    });

    return totals;
  };

  const columnTotals = calculateTotals();

  return (
    <div className="min-h-screen bg-slate-100 p-3 md:p-6 font-sans text-slate-900 select-none">
      {/* Action Bar */}
      <div className="max-w-[1400px] mx-auto bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-5 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700 cursor-pointer"
            >
              <ArrowLeft className="size-5" />
            </button>
          )}
          <div>
            <h1 className="text-base md:text-lg font-black text-blue-900 tracking-tight">
              सातत्यपूर्ण सर्वंकष मूल्यमापन श्रेणीनिहाय निकाल संकलन प्रपत्र - 1
            </h1>
            <p className="text-xs font-bold text-slate-500">
              वर्ष: <span className="text-blue-700">{academicYear}</span> | सत्र: <span className="text-blue-700">{selectedTerm}</span>
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Term Selector */}
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="प्रथम सत्र">प्रथम सत्र</option>
            <option value="द्वितीय सत्र">द्वितीय सत्र</option>
            <option value="वार्षिक">वार्षिक</option>
          </select>

          {/* Academic Year Selector */}
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="2024-25">2024-25</option>
            <option value="2025-26">2025-26</option>
            <option value="2026-27">2026-27</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={fetchSchoolDataAndCalculate}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            रीफ्रेश
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
          >
            <Printer className="size-3.5" />
            प्रिंट काढा
          </button>

          {/* PDF Download Button */}
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-md disabled:opacity-50"
          >
            {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            PDF डाऊनलोड करा
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-28 bg-white rounded-3xl border border-slate-200 shadow-sm max-w-[1400px] mx-auto">
          <Loader2 className="size-10 text-blue-600 animate-spin mb-3" />
          <p className="text-sm font-bold text-slate-500">श्रेणीनिहाय निकाल संकलन प्रपत्र लोड होत आहे...</p>
        </div>
      ) : (
        /* Printable Document Container */
        <div className="max-w-[1400px] mx-auto overflow-x-auto">
          <div
            ref={printRef}
            className="bg-white p-6 md:p-8 rounded-2xl border border-slate-300 shadow-lg min-w-[1050px]"
            style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
          >
            {/* Header matching PDF structure */}
            <div className="text-center mb-5 space-y-2">
              <h1 className="text-xl md:text-2xl font-black text-blue-900 tracking-wide">
                सातत्यपूर्ण सर्वंकष मूल्यमापन श्रेणीनिहाय निकाल संकलन प्रपत्र - 1
              </h1>

              <div className="flex flex-wrap items-center justify-between text-xs font-bold text-slate-900 border-b-2 border-slate-800 pb-2 px-1 gap-2">
                <div className="flex items-center gap-1">
                  <span>शाळा:</span>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="font-bold text-slate-900 bg-transparent border-b border-dotted border-slate-400 focus:outline-none px-1 text-xs min-w-[320px]"
                  />
                </div>
                <div>
                  <span>सत्र:</span> <span className="font-extrabold">{selectedTerm}</span>
                </div>
                <div>
                  <span>सन:</span> <span className="font-extrabold">{academicYear}</span>
                </div>
              </div>
            </div>

            {/* Table matching PDF Layout with Colgroup for exact alignment */}
            <table className="w-full border-collapse border-2 border-blue-900 text-center text-[11px] font-semibold text-slate-900 grade-matrix-table" style={{ tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "35px" }} /> {/* अ.क्र. */}
                <col style={{ width: "75px" }} /> {/* इयत्ता */}
                <col style={{ width: "38px" }} /> {/* पट मुले */}
                <col style={{ width: "38px" }} /> {/* पट मुली */}
                <col style={{ width: "38px" }} /> {/* अ-1 मुले */}
                <col style={{ width: "38px" }} /> {/* अ-1 मुली */}
                <col style={{ width: "38px" }} /> {/* अ-2 मुले */}
                <col style={{ width: "38px" }} /> {/* अ-2 मुली */}
                <col style={{ width: "38px" }} /> {/* ब-1 मुले */}
                <col style={{ width: "38px" }} /> {/* ब-1 मुली */}
                <col style={{ width: "38px" }} /> {/* ब-2 मुले */}
                <col style={{ width: "38px" }} /> {/* ब-2 मुली */}
                <col style={{ width: "38px" }} /> {/* क-1 मुले */}
                <col style={{ width: "38px" }} /> {/* क-1 मुली */}
                <col style={{ width: "38px" }} /> {/* क-2 मुले */}
                <col style={{ width: "38px" }} /> {/* क-2 मुली */}
                <col style={{ width: "38px" }} /> {/* ड मुले */}
                <col style={{ width: "38px" }} /> {/* ड मुली */}
                <col style={{ width: "38px" }} /> {/* इ-1 मुले */}
                <col style={{ width: "38px" }} /> {/* इ-1 मुली */}
                <col style={{ width: "42px" }} /> {/* एकूण मुले */}
                <col style={{ width: "42px" }} /> {/* एकूण मुली */}
              </colgroup>
              <thead>
                {/* Row 1: Super Headers */}
                <tr className="bg-blue-50/80 font-black border-b-2 border-blue-900 text-blue-950">
                  <th className="border border-blue-900 p-1" rowSpan={3}>
                    अ. क्र.
                  </th>
                  <th className="border border-blue-900 p-1" rowSpan={3}>
                    इयत्ता
                  </th>
                  <th className="border border-blue-900 p-1" colSpan={2} rowSpan={2}>
                    पट
                  </th>
                  <th className="border border-blue-900 p-1" colSpan={16}>
                    वर्गवार श्रेणी
                  </th>
                  <th className="border border-blue-900 p-1" colSpan={2} rowSpan={2}>
                    एकूण
                  </th>
                </tr>

                {/* Row 2: Grade Ranges */}
                <tr className="bg-blue-50/50 font-black border-b border-blue-900 text-blue-950 text-[10px]">
                  <th className="border border-blue-900 py-1 px-0.5" colSpan={2}>अ-1<br /><span className="text-[8.5px] font-normal tracking-tighter">(91 ते 100)</span></th>
                  <th className="border border-blue-900 py-1 px-0.5" colSpan={2}>अ-2<br /><span className="text-[8.5px] font-normal tracking-tighter">(81 ते 90)</span></th>
                  <th className="border border-blue-900 py-1 px-0.5" colSpan={2}>ब-1<br /><span className="text-[8.5px] font-normal tracking-tighter">(71 ते 80)</span></th>
                  <th className="border border-blue-900 py-1 px-0.5" colSpan={2}>ब-2<br /><span className="text-[8.5px] font-normal tracking-tighter">(61 ते 70)</span></th>
                  <th className="border border-blue-900 py-1 px-0.5" colSpan={2}>क-1<br /><span className="text-[8.5px] font-normal tracking-tighter">(51 ते 60)</span></th>
                  <th className="border border-blue-900 py-1 px-0.5" colSpan={2}>क-2<br /><span className="text-[8.5px] font-normal tracking-tighter">(41 ते 50)</span></th>
                  <th className="border border-blue-900 py-1 px-0.5" colSpan={2}>ड<br /><span className="text-[8.5px] font-normal tracking-tighter">(33 ते 40)</span></th>
                  <th className="border border-blue-900 py-1 px-0.5" colSpan={2}>इ-1<br /><span className="text-[8.5px] font-normal tracking-tighter">(32 व कमी)</span></th>
                </tr>

                {/* Row 3: Sub Header Boys/Girls */}
                <tr className="bg-blue-100/60 font-black border-b-2 border-blue-900 text-blue-950 text-[10px]">
                  {/* Pat */}
                  <th className="border border-blue-900 py-1 px-0.5">मुले</th>
                  <th className="border border-blue-900 py-1 px-0.5">मुली</th>

                  {/* Grades */}
                  <th className="border border-blue-900 py-1 px-0.5">मुले</th>
                  <th className="border border-blue-900 py-1 px-0.5">मुली</th>

                  <th className="border border-blue-900 py-1 px-0.5">मुले</th>
                  <th className="border border-blue-900 py-1 px-0.5">मुली</th>

                  <th className="border border-blue-900 py-1 px-0.5">मुले</th>
                  <th className="border border-blue-900 py-1 px-0.5">मुली</th>

                  <th className="border border-blue-900 py-1 px-0.5">मुले</th>
                  <th className="border border-blue-900 py-1 px-0.5">मुली</th>

                  <th className="border border-blue-900 py-1 px-0.5">मुले</th>
                  <th className="border border-blue-900 py-1 px-0.5">मुली</th>

                  <th className="border border-blue-900 py-1 px-0.5">मुले</th>
                  <th className="border border-blue-900 py-1 px-0.5">मुली</th>

                  <th className="border border-blue-900 py-1 px-0.5">मुले</th>
                  <th className="border border-blue-900 py-1 px-0.5">मुली</th>

                  <th className="border border-blue-900 py-1 px-0.5">मुले</th>
                  <th className="border border-blue-900 py-1 px-0.5">मुली</th>

                  {/* Total */}
                  <th className="border border-blue-900 py-1 px-0.5">मुले</th>
                  <th className="border border-blue-900 py-1 px-0.5">मुली</th>
                </tr>
              </thead>

              <tbody>
                {gradeMatrix.map((cls, idx) => {
                  // Calculate Total Row Passed Boys & Girls
                  const rowTotalBoys =
                    (cls.a1?.boys || 0) +
                    (cls.a2?.boys || 0) +
                    (cls.b1?.boys || 0) +
                    (cls.b2?.boys || 0) +
                    (cls.c1?.boys || 0) +
                    (cls.c2?.boys || 0) +
                    (cls.d?.boys || 0) +
                    (cls.e1?.boys || 0);

                  const rowTotalGirls =
                    (cls.a1?.girls || 0) +
                    (cls.a2?.girls || 0) +
                    (cls.b1?.girls || 0) +
                    (cls.b2?.girls || 0) +
                    (cls.c1?.girls || 0) +
                    (cls.c2?.girls || 0) +
                    (cls.d?.girls || 0) +
                    (cls.e1?.girls || 0);

                  return (
                    <tr key={cls.id} className="border-b border-blue-900 hover:bg-blue-50/30 transition-colors">
                      {/* Sr No */}
                      <td className="border border-blue-900 py-1 font-extrabold">{idx + 1}</td>

                      {/* Class Name */}
                      <td className="border border-blue-900 py-1 px-1 font-black text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis">{cls.name}</td>

                      {/* Pat (Enrolled) */}
                      <td className="border border-blue-900 p-0">
                        <input
                          type="number"
                          value={cls.pat.boys}
                          onChange={(e) => handleCellChange(idx, "pat", "boys", e.target.value)}
                          className="w-full text-center bg-transparent focus:bg-amber-100 border-none font-bold text-xs focus:outline-none py-1"
                        />
                      </td>
                      <td className="border border-blue-900 p-0">
                        <input
                          type="number"
                          value={cls.pat.girls}
                          onChange={(e) => handleCellChange(idx, "pat", "girls", e.target.value)}
                          className="w-full text-center bg-transparent focus:bg-amber-100 border-none font-bold text-xs focus:outline-none py-1"
                        />
                      </td>

                      {/* Grade A1 */}
                      <td className="border border-blue-900 p-0">
                        <input
                          type="number"
                          value={cls.a1.boys}
                          onChange={(e) => handleCellChange(idx, "a1", "boys", e.target.value)}
                          className="w-full text-center bg-transparent focus:bg-amber-100 border-none font-semibold text-xs focus:outline-none py-1"
                        />
                      </td>
                      <td className="border border-blue-900 p-0">
                        <input
                          type="number"
                          value={cls.a1.girls}
                          onChange={(e) => handleCellChange(idx, "a1", "girls", e.target.value)}
                          className="w-full text-center bg-transparent focus:bg-amber-100 border-none font-semibold text-xs focus:outline-none py-1"
                        />
                      </td>

                      {/* Grade A2 */}
                      <td className="border border-blue-900 p-0">
                        <input
                          type="number"
                          value={cls.a2.boys}
                          onChange={(e) => handleCellChange(idx, "a2", "boys", e.target.value)}
                          className="w-full text-center bg-transparent focus:bg-amber-100 border-none font-semibold text-xs focus:outline-none py-1"
                        />
                      </td>
                      <td className="border border-blue-900 p-0">
                        <input
                          type="number"
                          value={cls.a2.girls}
                          onChange={(e) => handleCellChange(idx, "a2", "girls", e.target.value)}
                          className="w-full text-center bg-transparent focus:bg-amber-100 border-none font-semibold text-xs focus:outline-none py-1"
                        />
                      </td>

                      {/* Grade B1 */}
                      <td className="border border-blue-900 p-0">
                        <input
                          type="number"
                          value={cls.b1.boys}
                          onChange={(e) => handleCellChange(idx, "b1", "boys", e.target.value)}
                          className="w-full text-center bg-transparent focus:bg-amber-100 border-none font-semibold text-xs focus:outline-none py-1"
                        />
                      </td>
                      <td className="border border-blue-900 p-0">
                        <input
                          type="number"
                          value={cls.b1.girls}
                          onChange={(e) => handleCellChange(idx, "b1", "girls", e.target.value)}
                          className="w-full text-center bg-transparent focus:bg-amber-100 border-none font-semibold text-xs focus:outline-none py-1"
                        />
                      </td>

                      {/* Grade B2 */}
                      <td className="border border-blue-900 p-0">
                        <input
                          type="number"
                          value={cls.b2.boys}
                          onChange={(e) => handleCellChange(idx, "b2", "boys", e.target.value)}
                          className="w-full text-center bg-transparent focus:bg-amber-100 border-none font-semibold text-xs focus:outline-none py-1"
                        />
                      </td>
                      <td className="border border-blue-900 p-0">
                        <input
                          type="number"
                          value={cls.b2.girls}
                          onChange={(e) => handleCellChange(idx, "b2", "girls", e.target.value)}
                          className="w-full text-center bg-transparent focus:bg-amber-100 border-none font-semibold text-xs focus:outline-none py-1"
                        />
                      </td>

                      {/* Grade C1 */}
                      <td className="border border-blue-900 p-0">
                        <input
                          type="number"
                          value={cls.c1.boys}
                          onChange={(e) => handleCellChange(idx, "c1", "boys", e.target.value)}
                          className="w-full text-center bg-transparent focus:bg-amber-100 border-none font-semibold text-xs focus:outline-none py-1"
                        />
                      </td>
                      <td className="border border-blue-900 p-0">
                        <input
                          type="number"
                          value={cls.c1.girls}
                          onChange={(e) => handleCellChange(idx, "c1", "girls", e.target.value)}
                          className="w-full text-center bg-transparent focus:bg-amber-100 border-none font-semibold text-xs focus:outline-none py-1"
                        />
                      </td>

                      {/* Grade C2 */}
                      <td className="border border-blue-900 p-0">
                        <input
                          type="number"
                          value={cls.c2.boys}
                          onChange={(e) => handleCellChange(idx, "c2", "boys", e.target.value)}
                          className="w-full text-center bg-transparent focus:bg-amber-100 border-none font-semibold text-xs focus:outline-none py-1"
                        />
                      </td>
                      <td className="border border-blue-900 p-0">
                        <input
                          type="number"
                          value={cls.c2.girls}
                          onChange={(e) => handleCellChange(idx, "c2", "girls", e.target.value)}
                          className="w-full text-center bg-transparent focus:bg-amber-100 border-none font-semibold text-xs focus:outline-none py-1"
                        />
                      </td>

                      {/* Grade D */}
                      <td className="border border-blue-900 p-0">
                        <input
                          type="number"
                          value={cls.d.boys}
                          onChange={(e) => handleCellChange(idx, "d", "boys", e.target.value)}
                          className="w-full text-center bg-transparent focus:bg-amber-100 border-none font-semibold text-xs focus:outline-none py-1"
                        />
                      </td>
                      <td className="border border-blue-900 p-0">
                        <input
                          type="number"
                          value={cls.d.girls}
                          onChange={(e) => handleCellChange(idx, "d", "girls", e.target.value)}
                          className="w-full text-center bg-transparent focus:bg-amber-100 border-none font-semibold text-xs focus:outline-none py-1"
                        />
                      </td>

                      {/* Grade E1 */}
                      <td className="border border-blue-900 p-0">
                        <input
                          type="number"
                          value={cls.e1.boys}
                          onChange={(e) => handleCellChange(idx, "e1", "boys", e.target.value)}
                          className="w-full text-center bg-transparent focus:bg-amber-100 border-none font-semibold text-xs focus:outline-none py-1"
                        />
                      </td>
                      <td className="border border-blue-900 p-0">
                        <input
                          type="number"
                          value={cls.e1.girls}
                          onChange={(e) => handleCellChange(idx, "e1", "girls", e.target.value)}
                          className="w-full text-center bg-transparent focus:bg-amber-100 border-none font-semibold text-xs focus:outline-none py-1"
                        />
                      </td>

                      {/* Row Total */}
                      <td className="border border-blue-900 py-1 font-black text-blue-950 bg-blue-50/30">{rowTotalBoys}</td>
                      <td className="border border-blue-900 py-1 font-black text-blue-950 bg-blue-50/30">{rowTotalGirls}</td>
                    </tr>
                  );
                })}

                {/* Bottom Total Row (एकूण) matching PDF */}
                <tr className="bg-amber-100/80 font-black text-slate-950 text-[11px] border-t-2 border-blue-900">
                  <td className="border border-blue-900 py-2 text-center font-black" colSpan={2}>
                    एकूण
                  </td>

                  {/* Pat Totals */}
                  <td className="border border-blue-900 py-2 font-black">{columnTotals.pat.boys}</td>
                  <td className="border border-blue-900 py-2 font-black">{columnTotals.pat.girls}</td>

                  {/* A1 Totals */}
                  <td className="border border-blue-900 py-2 font-black">{columnTotals.a1.boys}</td>
                  <td className="border border-blue-900 py-2 font-black">{columnTotals.a1.girls}</td>

                  {/* A2 Totals */}
                  <td className="border border-blue-900 py-2 font-black">{columnTotals.a2.boys}</td>
                  <td className="border border-blue-900 py-2 font-black">{columnTotals.a2.girls}</td>

                  {/* B1 Totals */}
                  <td className="border border-blue-900 py-2 font-black">{columnTotals.b1.boys}</td>
                  <td className="border border-blue-900 py-2 font-black">{columnTotals.b1.girls}</td>

                  {/* B2 Totals */}
                  <td className="border border-blue-900 py-2 font-black">{columnTotals.b2.boys}</td>
                  <td className="border border-blue-900 py-2 font-black">{columnTotals.b2.girls}</td>

                  {/* C1 Totals */}
                  <td className="border border-blue-900 py-2 font-black">{columnTotals.c1.boys}</td>
                  <td className="border border-blue-900 py-2 font-black">{columnTotals.c1.girls}</td>

                  {/* C2 Totals */}
                  <td className="border border-blue-900 py-2 font-black">{columnTotals.c2.boys}</td>
                  <td className="border border-blue-900 py-2 font-black">{columnTotals.c2.girls}</td>

                  {/* D Totals */}
                  <td className="border border-blue-900 py-2 font-black">{columnTotals.d.boys}</td>
                  <td className="border border-blue-900 py-2 font-black">{columnTotals.d.girls}</td>

                  {/* E1 Totals */}
                  <td className="border border-blue-900 py-2 font-black">{columnTotals.e1.boys}</td>
                  <td className="border border-blue-900 py-2 font-black">{columnTotals.e1.girls}</td>

                  {/* Total Sum Across All Grades */}
                  <td className="border border-blue-900 py-2 font-black bg-amber-200">
                    {Object.keys(columnTotals)
                      .filter((k) => k !== "pat")
                      .reduce((acc, k) => acc + columnTotals[k].boys, 0)}
                  </td>
                  <td className="border border-blue-900 py-2 font-black bg-amber-200">
                    {Object.keys(columnTotals)
                      .filter((k) => k !== "pat")
                      .reduce((acc, k) => acc + columnTotals[k].girls, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Styles for Table Layout & Print */}
      <style>{`
        table.grade-matrix-table input[type=number]::-webkit-inner-spin-button,
        table.grade-matrix-table input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        table.grade-matrix-table input[type=number] {
          -moz-appearance: textfield;
        }
        @media print {
          @page {
            size: A4 landscape;
            margin: 4mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          button, select {
            display: none !important;
          }
          input {
            border: none !important;
            background: transparent !important;
          }
        }
      `}</style>
    </div>
  );
}
