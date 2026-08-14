import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Download, Printer, Loader2, RefreshCw } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { matchStudentClassAndMedium, fetchStudentsForClass, fetchFirestoreMarks } from "./firestoreMarksHelper";
import { getTeacherId } from "@/lib/teacherIsolationHelper";
import { DEFAULT_MARATHI_SUBJECTS_MAP, getDefaultSubjectsForClass } from "@/data/cceSubjects";
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
  if (percent === undefined || percent === null || isNaN(percent)) return "e2";
  const p = Number(percent);
  if (p >= 91) return "a1";
  if (p >= 81) return "a2";
  if (p >= 71) return "b1";
  if (p >= 61) return "b2";
  if (p >= 51) return "c1";
  if (p >= 41) return "c2";
  if (p >= 33) return "d";
  if (p >= 21) return "e1";
  return "e2"; // 20% व कमी
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
      e1: { boys: 0, girls: 0 }, // 21 ते 32
      e2: { boys: 0, girls: 0 }, // 20 व कमी
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
      } catch (e) { }

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
        } catch (e) { }
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
        } catch (e) { }
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
        e2: { boys: 0, girls: 0 },
      }));

      // 3. Query for student records & marks across all 8 classes
      try {
        const currentTeacherId = getTeacherId();
        const currentMedium = localStorage.getItem("cce_selected_medium") || "marathi";

        // Determine Term key & Alt Term key
        let termKey = "sem1";
        let altTermKey = "first";
        if (selectedTerm === "द्वितीय सत्र") {
          termKey = "sem2";
          altTermKey = "second";
        }

        // 4. Parallel fetch for all 8 classes (students & marks) from Firestore and LocalStorage
        await Promise.all(
          INITIAL_CLASSES.map(async (clsObj, idx) => {
            const classStudents = (await fetchStudentsForClass(clsObj.id, currentMedium, currentTeacherId)) || [];
            let semMarks = {};

            const mergeDoc = (d) => {
              if (!d) return;
              const recs = d.records || d.semester1 || d.semester2 || d.marksData || d.marks || d.data || d;
              if (recs && typeof recs === "object") {
                Object.entries(recs).forEach(([k, v]) => {
                  if (v && typeof v === "object") {
                    semMarks[k] = { ...(semMarks[k] || {}), ...v };
                  } else if (v !== undefined && v !== null) {
                    if (!semMarks[k]) semMarks[k] = {};
                    semMarks[k].total = v;
                  }
                });
              }
            };

            // LocalStorage cache check for marks
            try {
              const cached = localStorage.getItem(`cce_marks_cache_${clsObj.id}_${academicYear}_${termKey}_${currentMedium}`) ||
                localStorage.getItem(`cce_marks_${clsObj.id}_${academicYear}_${termKey}`) ||
                localStorage.getItem(`cce_marks_${clsObj.id}_${academicYear}`);
              if (cached) mergeDoc(JSON.parse(cached));
            } catch (e) { }

            // Fetch from Firestore cce_marks_v2 and Bunny CDN using helper
            try {
              const fsMarks = await fetchFirestoreMarks(clsObj.id, academicYear, termKey, currentTeacherId) || {};
              semMarks = { ...fsMarks };
            } catch (e) { }

            const docsToFetch = [
              ...(currentTeacherId ? [
                `${currentTeacherId}_${clsObj.id}_${academicYear}`,
                `${currentTeacherId}_${clsObj.id}_${currentMedium}_${academicYear}`,
                `${currentTeacherId}_${clsObj.id}_${academicYear}_${termKey}`,
                `${currentTeacherId}_${clsObj.id}_${currentMedium}_${academicYear}_${termKey}`,
              ] : []),
              `${clsObj.id}_${currentMedium}_${academicYear}_${termKey}`,
              `${clsObj.id}_${academicYear}_${termKey}`,
              `${clsObj.id}_${academicYear}_${altTermKey}`,
              `${clsObj.id}_${currentMedium}_${academicYear}`,
              `${clsObj.id}_${academicYear}`,
              `${clsObj.id}_${termKey}`,
              `${clsObj.id}`,
            ];

            const docResults = await Promise.allSettled(
              docsToFetch.map((dId) => getDoc(doc(db, "cce_marks_v2", dId)))
            );

            docResults.forEach((res) => {
              if (res.status === "fulfilled" && res.value?.exists()) {
                mergeDoc(res.value.data());
              }
            });

            const classSubjects = getDefaultSubjectsForClass(clsObj.id, currentMedium) || DEFAULT_MARATHI_SUBJECTS_MAP[clsObj.id] || DEFAULT_MARATHI_SUBJECTS_MAP["1st"];
            const totalMax = classSubjects.length * 100;

            classStudents.forEach((st) => {
              const gStr = String(st.gender || st.sex || st.ling || st.studentGender || st.genderType || "").toLowerCase().trim();
              const isGirl =
                gStr === "female" || gStr === "f" || gStr === "2" ||
                gStr.includes("female") || gStr.includes("girl") ||
                gStr.includes("मुली") || gStr.includes("मुलगी") || gStr.includes("स्त्री");

              const genderKey = isGirl ? "girls" : "boys";
              newMatrix[idx].pat[genderKey] += 1;

              // Extract student marks object matching all possible student identifiers
              const studentMarksObj =
                semMarks[st.id] ||
                semMarks[st.studentId] ||
                semMarks[st.rollNo] ||
                semMarks[String(st.rollNo)] ||
                semMarks[st.srNo] ||
                semMarks[String(st.srNo)] ||
                semMarks[st.name] ||
                semMarks[st.fullName] ||
                semMarks[st.stdName] ||
                st.marks ||
                st.cce_marks ||
                st.marksData ||
                {};

              let studentMarks = studentMarksObj;
              if (studentMarks && studentMarks.subjects && typeof studentMarks.subjects === "object") {
                studentMarks = studentMarks.subjects;
              } else if (studentMarks && studentMarks.records && typeof studentMarks.records === "object") {
                studentMarks = studentMarks.records;
              }

              let grandObtainedTotal = 0;
              let hasAnyMarkData = false;

              classSubjects.forEach((subName) => {
                const lower = String(subName).toLowerCase().trim();
                let subData = {};

                if (studentMarks[subName]) {
                  subData = studentMarks[subName];
                } else if (lower.includes("मराठी")) {
                  subData = studentMarks["marathi"] || studentMarks["prathambhasha"] || studentMarks["प्रथम भाषा : मराठी"] || studentMarks["प्रथम भाषा: मराठी"] || studentMarks["प्रथम भाषा"] || studentMarks["मराठी"] || {};
                } else if (lower.includes("इंग्रजी")) {
                  subData = studentMarks["english"] || studentMarks["dvitiybhasha"] || studentMarks["द्वितीय भाषा : इंग्रजी"] || studentMarks["द्वितीय भाषा: इंग्रजी"] || studentMarks["तृतीय भाषा: इंग्रजी"] || studentMarks["तृतीय भाषा : इंग्रजी"] || studentMarks["तृतीय भाषा"] || studentMarks["इंग्रजी"] || {};
                } else if (lower.includes("हिंदी")) {
                  subData = studentMarks["hindi"] || studentMarks["tritiyabhasha"] || studentMarks["हिंदी"] || {};
                } else if (lower.includes("गणित")) {
                  subData = studentMarks["ganit"] || studentMarks["math"] || studentMarks["maths"] || studentMarks["गणित"] || {};
                } else if (lower.includes("परिसर")) {
                  subData = studentMarks["parisar"] || studentMarks["parisar1"] || studentMarks["parisar2"] || studentMarks["परिसर अभ्यास"] || studentMarks["vijnan"] || studentMarks["vidnyan"] || studentMarks["विज्ञान"] || {};
                } else if (lower.includes("कला")) {
                  subData = studentMarks["kala"] || studentMarks["कला"] || {};
                } else if (lower.includes("कार्यानुभव")) {
                  subData = studentMarks["karyanubhav"] || studentMarks["कार्यानुभव"] || {};
                } else if (lower.includes("शारीरिक")) {
                  subData = studentMarks["sharirik"] || studentMarks["शारीरिक शिक्षण"] || studentMarks["शारीरिक शिक्षण व आरोग्य"] || {};
                }

                if (!subData || Object.keys(subData).length === 0) {
                  for (const [k, v] of Object.entries(studentMarks)) {
                    const kLower = String(k).toLowerCase().trim();
                    if (
                      (lower.includes("मराठी") && kLower.includes("मराठी")) ||
                      (lower.includes("इंग्रजी") && kLower.includes("इंग्रजी")) ||
                      (lower.includes("हिंदी") && kLower.includes("हिंदी")) ||
                      (lower.includes("गणित") && kLower.includes("गणित")) ||
                      (lower.includes("कला") && kLower.includes("कला")) ||
                      (lower.includes("कार्यानुभव") && kLower.includes("कार्यानुभव")) ||
                      (lower.includes("शारीरिक") && kLower.includes("शारीरिक")) ||
                      (lower.includes("परिसर") && kLower.includes("परिसर")) ||
                      kLower === lower
                    ) {
                      subData = v;
                      break;
                    }
                  }
                }

                const isPracticalSub = lower.includes("कला") || lower.includes("कार्यानुभव") || lower.includes("शारीरिक");

                const tondiKaamObt = Number(subData.tondiKaam ?? subData.tondi ?? subData.oral ?? 0);
                const pratyakshikPrayogObt = Number(subData.pratyakshikPrayog ?? subData.practical ?? subData.activity ?? 0);
                const upakramKritiObt = Number(subData.upakramKriti ?? subData.upakram ?? subData.project ?? 0);
                const prakalpaObt = Number(subData.prakalp ?? subData.prakalpa ?? 0);
                const chaachaniLekhiObt = Number(subData.chaachaniLekhi ?? subData.chaachani ?? subData.test ?? subData.exam ?? 0);
                const swadhyayVargakaryaObt = Number(subData.swadhyayVargakarya ?? subData.swadhyay ?? subData.vargakarya ?? subData.homework ?? 0);
                const itarObt = Number(subData.itar ?? subData.other ?? 0);

                const sankalitTondiObt = Number(subData.sankalitTondi ?? subData.semesterOral ?? 0);
                const sankalitPratyakshikObt = Number(subData.sankalitPratyakshik ?? subData.semesterPractical ?? 0);
                const sankalitLekhiObt = Number(subData.sankalitLekhi ?? subData.lekhi ?? subData.written ?? subData.semesterWritten ?? 0);

                const hasForm = tondiKaamObt > 0 || pratyakshikPrayogObt > 0 || upakramKritiObt > 0 || prakalpaObt > 0 || chaachaniLekhiObt > 0 || swadhyayVargakaryaObt > 0 || itarObt > 0;
                const formTotal = hasForm ? (tondiKaamObt + pratyakshikPrayogObt + upakramKritiObt + prakalpaObt + chaachaniLekhiObt + swadhyayVargakaryaObt + itarObt) : Number(subData.akarik ?? subData.formTotal ?? subData.Akarik?.Total ?? 0);

                const hasSem = sankalitTondiObt > 0 || sankalitPratyakshikObt > 0 || sankalitLekhiObt > 0;
                const semTotal = isPracticalSub ? 0 : (hasSem ? (sankalitTondiObt + sankalitPratyakshikObt + sankalitLekhiObt) : Number(subData.sankalit ?? subData.semTotal ?? subData.Sanklik?.Total ?? 0));
                const grandTotal = (formTotal + semTotal) > 0 ? (formTotal + semTotal) : Number(subData.total ?? subData.grandTotal ?? subData.obtained ?? subData.marks ?? 0);

                if (subData && Object.keys(subData).length > 0 && (hasForm || hasSem || subData.akarik !== undefined || subData.sankalit !== undefined || subData.total !== undefined || subData.grandTotal !== undefined || subData.obtained !== undefined || subData.marks !== undefined)) {
                  hasAnyMarkData = true;
                }

                grandObtainedTotal += grandTotal;
              });

              // Assign every student in the roster to their percentage grade category
              const percent = (hasAnyMarkData && totalMax > 0) ? (grandObtainedTotal / totalMax) * 100 : 0;
              const gradeCat = getGradeCategory(percent);
              newMatrix[idx][gradeCat][genderKey] += 1;
            });
          })
        );
      } catch (e) {
        console.error("Error fetching students for grade wise matrix:", e);
      }

      setGradeMatrix(newMatrix);
      try {
        localStorage.setItem(`gradewise_matrix_cache_${academicYear}_${selectedTerm}`, JSON.stringify(newMatrix));
      } catch (e) { }
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

  // High Quality Crisp PDF Export Handler
  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    toast.info("श्रेणीनिहाय निकाल संकलन प्रपत्र PDF तयार होत आहे...");
    try {
      const { default: html2pdf } = await import("html2pdf.js");
      const element = printRef.current;

      // Clone element to prevent input artifacts and ensure 100% width fit
      const clone = element.cloneNode(true);

      // Replace input elements with clean text spans in clone
      clone.querySelectorAll("input").forEach((inp) => {
        const val = inp.value || "0";
        const parent = inp.parentNode;
        if (parent) {
          const span = document.createElement("span");
          span.style.display = "inline-block";
          span.style.width = "100%";
          span.style.textAlign = "center";
          span.style.fontWeight = "bold";
          span.style.fontSize = "11px";
          span.style.color = "#0f172a";
          span.textContent = val;
          parent.replaceChild(span, inp);
        }
      });

      // Temporary offscreen container styled specifically for A4 landscape
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "-9999px";
      tempContainer.style.width = "1120px";
      tempContainer.style.background = "#ffffff";
      tempContainer.style.padding = "10px";
      tempContainer.appendChild(clone);
      document.body.appendChild(tempContainer);

      const opt = {
        margin: [4, 4, 4, 4],
        filename: `श्रेणीनिहाय_निकाल_संकलन_प्रपत्र_${academicYear}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          windowWidth: 1150,
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape", compress: true },
      };

      await html2pdf().set(opt).from(clone).save();
      document.body.removeChild(tempContainer);
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
      e2: { boys: 0, girls: 0 },
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
            {(() => {
              const curY = new Date().getFullYear();
              const curM = new Date().getMonth();
              const refY = curM >= 5 ? curY : curY - 1;
              const yrs = [];
              for (let y = refY + 1; y >= 2020; y--) {
                yrs.push(`${y}-${y + 1}`);
              }
              return yrs.map((y) => (
                <option key={y} value={y}>{y}</option>
              ));
            })()}
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

            <table className="w-full border-collapse border-2 border-blue-900 text-center text-[11px] font-semibold text-slate-900 grade-matrix-table" style={{ tableLayout: "fixed" }}>
              <colgroup><col style={{ width: "35px" }} /><col style={{ width: "70px" }} /><col style={{ width: "34px" }} /><col style={{ width: "34px" }} /><col style={{ width: "34px" }} /><col style={{ width: "34px" }} /><col style={{ width: "34px" }} /><col style={{ width: "34px" }} /><col style={{ width: "34px" }} /><col style={{ width: "34px" }} /><col style={{ width: "34px" }} /><col style={{ width: "34px" }} /><col style={{ width: "34px" }} /><col style={{ width: "34px" }} /><col style={{ width: "34px" }} /><col style={{ width: "34px" }} /><col style={{ width: "34px" }} /><col style={{ width: "34px" }} /><col style={{ width: "34px" }} /><col style={{ width: "34px" }} /><col style={{ width: "34px" }} /><col style={{ width: "34px" }} /><col style={{ width: "38px" }} /><col style={{ width: "38px" }} /></colgroup>
              <thead>
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
                  <th className="border border-blue-900 p-1" colSpan={18}>
                    वर्गवार श्रेणी
                  </th>
                  <th className="border border-blue-900 p-1" colSpan={2} rowSpan={2}>
                    एकूण
                  </th>
                </tr>

                <tr className="bg-blue-50/50 font-black border-b border-blue-900 text-blue-950 text-[10px]">
                  <th className="border border-blue-900 py-1 px-0.5" colSpan={2}>अ-1<br /><span className="text-[8px] font-normal tracking-tighter">(91 ते 100)</span></th>
                  <th className="border border-blue-900 py-1 px-0.5" colSpan={2}>अ-2<br /><span className="text-[8px] font-normal tracking-tighter">(81 ते 90)</span></th>
                  <th className="border border-blue-900 py-1 px-0.5" colSpan={2}>ब-1<br /><span className="text-[8px] font-normal tracking-tighter">(71 ते 80)</span></th>
                  <th className="border border-blue-900 py-1 px-0.5" colSpan={2}>ब-2<br /><span className="text-[8px] font-normal tracking-tighter">(61 ते 70)</span></th>
                  <th className="border border-blue-900 py-1 px-0.5" colSpan={2}>क-1<br /><span className="text-[8px] font-normal tracking-tighter">(51 ते 60)</span></th>
                  <th className="border border-blue-900 py-1 px-0.5" colSpan={2}>क-2<br /><span className="text-[8px] font-normal tracking-tighter">(41 ते 50)</span></th>
                  <th className="border border-blue-900 py-1 px-0.5" colSpan={2}>ड<br /><span className="text-[8px] font-normal tracking-tighter">(33 ते 40)</span></th>
                  <th className="border border-blue-900 py-1 px-0.5" colSpan={2}>इ-1<br /><span className="text-[8px] font-normal tracking-tighter">(21 ते 32)</span></th>
                  <th className="border border-blue-900 py-1 px-0.5" colSpan={2}>इ-2<br /><span className="text-[8px] font-normal tracking-tighter">(20 व कमी)</span></th>
                </tr>

                <tr className="bg-blue-100/60 font-black border-b-2 border-blue-900 text-blue-950 text-[10px]">
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
                  <th className="border border-blue-900 py-1 px-0.5">मुले</th>
                  <th className="border border-blue-900 py-1 px-0.5">मुली</th>
                  <th className="border border-blue-900 py-1 px-0.5">मुले</th>
                  <th className="border border-blue-900 py-1 px-0.5">मुली</th>
                  <th className="border border-blue-900 py-1 px-0.5 bg-blue-100">मुले</th>
                  <th className="border border-blue-900 py-1 px-0.5 bg-blue-100">मुली</th>
                </tr>
              </thead>

              <tbody>
                {(() => {
                  const activeRows = gradeMatrix.filter((cls) => {
                    const patTotal = (cls.pat?.boys || 0) + (cls.pat?.girls || 0);
                    const gradeSum =
                      (cls.a1?.boys || 0) + (cls.a1?.girls || 0) +
                      (cls.a2?.boys || 0) + (cls.a2?.girls || 0) +
                      (cls.b1?.boys || 0) + (cls.b1?.girls || 0) +
                      (cls.b2?.boys || 0) + (cls.b2?.girls || 0) +
                      (cls.c1?.boys || 0) + (cls.c1?.girls || 0) +
                      (cls.c2?.boys || 0) + (cls.c2?.girls || 0) +
                      (cls.d?.boys || 0) + (cls.d?.girls || 0) +
                      (cls.e1?.boys || 0) + (cls.e1?.girls || 0) +
                      (cls.e2?.boys || 0) + (cls.e2?.girls || 0);
                    return patTotal > 0 || gradeSum > 0;
                  });

                  const rowsToDisplay = activeRows.length > 0 ? activeRows : gradeMatrix;

                  return rowsToDisplay.map((cls, displayIdx) => {
                    const originalIdx = gradeMatrix.findIndex((g) => g.id === cls.id);
                    const targetIdx = originalIdx >= 0 ? originalIdx : displayIdx;

                    const rowTotalBoys =
                      (cls.a1?.boys || 0) +
                      (cls.a2?.boys || 0) +
                      (cls.b1?.boys || 0) +
                      (cls.b2?.boys || 0) +
                      (cls.c1?.boys || 0) +
                      (cls.c2?.boys || 0) +
                      (cls.d?.boys || 0) +
                      (cls.e1?.boys || 0) +
                      (cls.e2?.boys || 0);

                    const rowTotalGirls =
                      (cls.a1?.girls || 0) +
                      (cls.a2?.girls || 0) +
                      (cls.b1?.girls || 0) +
                      (cls.b2?.girls || 0) +
                      (cls.c1?.girls || 0) +
                      (cls.c2?.girls || 0) +
                      (cls.d?.girls || 0) +
                      (cls.e1?.girls || 0) +
                      (cls.e2?.girls || 0);

                    const gradeKeys = ["a1", "a2", "b1", "b2", "c1", "c2", "d", "e1", "e2"];

                    return (
                      <tr key={cls.id} className="border-b border-blue-900 hover:bg-blue-50/30 transition-colors">
                        {/* Sr No */}
                        <td className="border border-blue-900 py-1 font-extrabold">{displayIdx + 1}</td>

                        {/* Class Name */}
                        <td className="border border-blue-900 py-1 px-1 font-black text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis">{cls.name}</td>

                        {/* Pat (Enrolled) */}
                        <td className="border border-blue-900 p-0">
                          <input
                            type="number"
                            value={cls.pat.boys}
                            onChange={(e) => handleCellChange(targetIdx, "pat", "boys", e.target.value)}
                            className="w-full text-center bg-transparent focus:bg-amber-100 border-none font-bold text-xs focus:outline-none py-1"
                          />
                        </td>
                        <td className="border border-blue-900 p-0">
                          <input
                            type="number"
                            value={cls.pat.girls}
                            onChange={(e) => handleCellChange(targetIdx, "pat", "girls", e.target.value)}
                            className="w-full text-center bg-transparent focus:bg-amber-100 border-none font-bold text-xs focus:outline-none py-1"
                          />
                        </td>

                        {/* Grade Columns */}
                        {gradeKeys.map((gKey) => (
                          <React.Fragment key={gKey}>
                            <td className="border border-blue-900 p-0">
                              <input
                                type="number"
                                value={cls[gKey]?.boys || 0}
                                onChange={(e) => handleCellChange(targetIdx, gKey, "boys", e.target.value)}
                                className="w-full text-center bg-transparent focus:bg-amber-100 border-none font-semibold text-xs focus:outline-none py-1"
                              />
                            </td>
                            <td className="border border-blue-900 p-0">
                              <input
                                type="number"
                                value={cls[gKey]?.girls || 0}
                                onChange={(e) => handleCellChange(targetIdx, gKey, "girls", e.target.value)}
                                className="w-full text-center bg-transparent focus:bg-amber-100 border-none font-semibold text-xs focus:outline-none py-1"
                              />
                            </td>
                          </React.Fragment>
                        ))}

                        {/* Row Total */}
                        <td className="border border-blue-900 py-1 font-black text-blue-950 bg-blue-50/30">{rowTotalBoys}</td>
                        <td className="border border-blue-900 py-1 font-black text-blue-950 bg-blue-50/30">{rowTotalGirls}</td>
                      </tr>
                    );
                  });
                })()}

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

                  {/* E2 Totals */}
                  <td className="border border-blue-900 py-2 font-black">{columnTotals.e2.boys}</td>
                  <td className="border border-blue-900 py-2 font-black">{columnTotals.e2.girls}</td>

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
