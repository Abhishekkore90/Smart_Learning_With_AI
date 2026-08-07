// CCE Register BoardResult Component
import React, { useState, useEffect, useRef } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { Download, Printer, ArrowLeft, Loader2, AlertCircle, FileText, Copy } from "lucide-react";
import { toast } from "sonner";
import { getDefaultSubjectsForClass } from "@/data/cceSubjects";
import { getTeacherId, matchStudentTeacherClassAndMedium } from "../lib/teacherIsolationHelper";
import { fetchStudentsForClass } from "./firestoreMarksHelper";
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

const BoardResult = ({ initialClass = "1st", initialYear = "2025-26", initialTerm = "sem2", onBack }) => {
  const [selectedClass, setSelectedClass] = useState(initialClass || "1st");
  const [academicYear, setAcademicYear] = useState(initialYear || "2025-26");
  const [selectedTerm, setSelectedTerm] = useState(initialTerm || "sem2");
  const [division, setDivision] = useState("1");
  const [pageMode, setPageMode] = useState("2pages");
  const [showLayoutModal, setShowLayoutModal] = useState(true);
  const [selectedMedium, setSelectedMedium] = useState("marathi");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Sync initialTerm when prop updates
  useEffect(() => {
    if (initialTerm && initialTerm !== selectedTerm) {
      setSelectedTerm(initialTerm);
    }
  }, [initialTerm]);

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
  const [weightages, setWeightages] = useState(null);

  const printRef = useRef(null);

  useEffect(() => {
    loadUserFirestoreData();
  }, [selectedClass, academicYear, selectedMedium, selectedTerm]);

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
        }

        let classSubjects = [];
        if (mergedSettings.subjects && Array.isArray(mergedSettings.subjects) && mergedSettings.subjects.length > 0) {
          classSubjects = mergedSettings.subjects;
        } else {
          classSubjects = getDefaultSubjectsForClass(selectedClass, selectedMedium);
        }
        setSubjects(classSubjects);
      } catch (e) {
        console.error("Error fetching school settings:", e);
      }

      // 2. Fetch User's Real Students for this selected class & medium (Isolated by teacherId)
      const currentTeacherId = getTeacherId();
      const loadedStudents = await fetchStudentsForClass(selectedClass, selectedMedium, currentTeacherId);
      setStudents(loadedStudents);

      // Fetch Weightages (cce_weightage_v2) for Dynamic Max Marks
      try {
        const ref = doc(db, "cce_weightage_v2", `${selectedClass}_${academicYear}`);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const docData = snap.data();
          setWeightages(docData.data || docData);
        } else {
          const oldRef = doc(db, "cce_weightage", `${selectedClass}_${academicYear}`);
          const oldSnap = await getDoc(oldRef);
          if (oldSnap.exists()) {
            setWeightages(oldSnap.data());
          }
        }
      } catch (e) {
        console.error("Error loading weightages:", e);
      }

      // 3. Fetch User's Entered Marks for this Class & Year (Merging all exam docs & Bunny CDN)
      try {
        let mergedMarks = {};

        const loadMarksDoc = async (examKey) => {
          const docIdsToTry = [
            `${currentTeacherId}_${selectedClass}_${academicYear}_${examKey}`,
            `${currentTeacherId}_${selectedClass}_${selectedMedium}_${academicYear}_${examKey}`,
            `${selectedClass}_${academicYear}_${examKey}`,
            `${selectedClass}_${selectedMedium}_${academicYear}_${examKey}`,
          ];
          for (const dId of docIdsToTry) {
            try {
              const snap = await getDoc(doc(db, "cce_marks_v2", dId));
              if (snap.exists()) {
                const d = snap.data();
                return d.records || d.marksData || d.data || d;
              }
            } catch (e) {}
          }
          return null;
        };

        const examKeys = selectedTerm === "sem1"
          ? ["sem1", "test1", "oral1", "pratyakshik1", "general", "sem2"]
          : ["sem2", "sem1", "test2", "oral2", "pratyakshik2", "general"];

        for (const exKey of examKeys) {
          const exData = await loadMarksDoc(exKey);
          if (exData && typeof exData === "object") {
            Object.keys(exData).forEach((stdKey) => {
              if (!mergedMarks[stdKey]) mergedMarks[stdKey] = {};
              const stdObj = exData[stdKey];
              if (stdObj && typeof stdObj === "object") {
                Object.keys(stdObj).forEach((subKey) => {
                  if (!mergedMarks[stdKey][subKey]) mergedMarks[stdKey][subKey] = {};
                  if (typeof stdObj[subKey] === "object") {
                    Object.assign(mergedMarks[stdKey][subKey], stdObj[subKey]);
                  } else {
                    mergedMarks[stdKey][subKey] = stdObj[subKey];
                  }
                });
              }
            });
          }
        }

        // Bunny CDN fallback
        try {
          const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
          const bunnyFiles = selectedTerm === "sem1"
            ? [
                `cce_results/${selectedClass}_${academicYear}_marks_first.json`,
                `cce_results/${selectedClass}_${academicYear}_marks_sem1.json`,
                `cce_results/${selectedClass}_${academicYear}_marks_second.json`,
              ]
            : [
                `cce_results/${selectedClass}_${academicYear}_marks_second.json`,
                `cce_results/${selectedClass}_${academicYear}_marks_sem2.json`,
                `cce_results/${selectedClass}_${academicYear}_marks_first.json`,
              ];
          for (const file of bunnyFiles) {
            const bData = await fetchJsonFromBunny(file);
            if (bData && typeof bData === "object") {
              Object.keys(bData).forEach((stdKey) => {
                if (!mergedMarks[stdKey]) mergedMarks[stdKey] = {};
                const stdObj = bData[stdKey];
                if (stdObj && typeof stdObj === "object") {
                  Object.keys(stdObj).forEach((subKey) => {
                    if (!mergedMarks[stdKey][subKey]) mergedMarks[stdKey][subKey] = {};
                    if (typeof stdObj[subKey] === "object") {
                      Object.assign(mergedMarks[stdKey][subKey], stdObj[subKey]);
                    }
                  });
                }
              });
            }
          }
        } catch (e) {}

        setMarksData(mergedMarks);
      } catch (e) {
        console.error("Error fetching marks:", e);
      }

      // 4. Fetch User's Entered Remarks for this Class & Year (Merging sem1, sem2 & medium variants)
      try {
        let mergedRemarks = {};

        const loadSemesterRemarks = async (sem) => {
          let recs = null;
          const mediumsToTry = [selectedMedium, "marathi", "semi", "english"];
          for (const med of mediumsToTry) {
            const cacheKey = `cce_remarks_cache_${selectedClass}_${academicYear}_${sem}_${med}`;
            try {
              const cached = localStorage.getItem(cacheKey);
              if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
                  recs = parsed;
                  break;
                }
              }
            } catch (e) {}
          }

          if (!recs) {
            const docIds = [
              `${selectedClass}_${academicYear}_${sem}_${selectedMedium}`,
              `${selectedClass}_${academicYear}_${sem}_marathi`,
              `${selectedClass}_${academicYear}_${sem}`,
              `class_${selectedClass}_${selectedMedium}_remarks`,
              `${currentTeacherId}_${selectedClass}_${academicYear}_${sem}_${selectedMedium}`,
              `${currentTeacherId}_${selectedClass}_${academicYear}_${sem}`,
            ];
            for (const dId of docIds) {
              try {
                const snap = await getDoc(doc(db, "cce_remarks_v2", dId));
                if (snap.exists()) {
                  const data = snap.data();
                  const parsedRecs = data.records || data.remarks || data.data || null;
                  if (parsedRecs && typeof parsedRecs === "object" && Object.keys(parsedRecs).length > 0) {
                    recs = parsedRecs;
                    break;
                  }
                }
              } catch (e) {}
            }
          }
          return recs;
        };

        const sem1Recs = await loadSemesterRemarks("sem1");
        const sem2Recs = await loadSemesterRemarks("sem2");

        const mergeStudentRemarksObj = (target, source) => {
          if (!source || typeof source !== "object") return;
          for (const [sKey, sVal] of Object.entries(source)) {
            if (!sVal) continue;
            if (!target[sKey]) {
              target[sKey] = typeof sVal === "object" ? { ...sVal } : sVal;
            } else if (typeof target[sKey] === "object" && typeof sVal === "object") {
              target[sKey] = { ...target[sKey], ...sVal };
            }
          }
        };

        if (selectedTerm === "sem1") {
          mergeStudentRemarksObj(mergedRemarks, sem1Recs);
          mergeStudentRemarksObj(mergedRemarks, sem2Recs);
        } else {
          mergeStudentRemarksObj(mergedRemarks, sem2Recs);
          mergeStudentRemarksObj(mergedRemarks, sem1Recs);
        }

        try {
          const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
          const bunnyRemarks = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_remarks.json`);
          if (bunnyRemarks && typeof bunnyRemarks === "object") {
            mergeStudentRemarksObj(mergedRemarks, bunnyRemarks);
          }
        } catch (e) {}

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

  // Helper to extract student subject mark and grade from all Firestore & Bunny sources
  const getStudentSubjectMark = (student, subjectName, term = "sem2") => {
    if (!student || !marksData) return { grade: "-", mark: null };
    const stdKeys = [student.id, student.rollNo, String(student.rollNo), student.name, student.fullName, student.studentId];

    for (const key of stdKeys) {
      if (!key) continue;
      const sMarks = marksData[key];
      if (sMarks) {
        const termMarks = sMarks[term] || sMarks.sem2 || sMarks.second || sMarks.semester2 || sMarks.sem1 || sMarks;
        if (termMarks && typeof termMarks === "object") {
          const matchedKey = Object.keys(termMarks).find(
            (k) => k.toLowerCase() === subjectName.toLowerCase() || k.includes(subjectName) || subjectName.includes(k)
          );
          if (matchedKey && termMarks[matchedKey] !== undefined && termMarks[matchedKey] !== null) {
            const val = termMarks[matchedKey];

            if (typeof val === "object") {
              const numMark = Number(val.mark || val.total || val.score);
              const g = val.grade || (!isNaN(numMark) && numMark > 0 ? getGrade(numMark) : "-");
              return { grade: g, mark: !isNaN(numMark) && numMark > 0 ? numMark : null };
            }

            if (typeof val === "number") {
              return { grade: getGrade(val), mark: val };
            }

            if (typeof val === "string" && val.trim().length > 0) {
              const num = Number(val);
              if (!isNaN(num) && num > 0) {
                return { grade: getGrade(num), mark: num };
              }
              return { grade: val.trim(), mark: null };
            }
          }
        }
      }
    }
    return { grade: "-", mark: null };
  };

  // Compute real grade distribution count per subject for Page 9 Table
  const getSubjectGradeDistribution = (subjectName, term = "sem2") => {
    const counts = {
      "अ-1": 0,
      "अ-2": 0,
      "ब-1": 0,
      "ब-2": 0,
      "क-1": 0,
      "क-2": 0,
      "ड": 0,
      "इ-1": 0,
      "इ-2": 0,
    };

    students.forEach((student) => {
      const { grade } = getStudentSubjectMark(student, subjectName, term);
      const normalizedGrade = grade && grade !== "-" ? grade.replace("ड-1", "ड").replace("ड-2", "इ-1") : "अ-1";
      if (counts[normalizedGrade] !== undefined) {
        counts[normalizedGrade]++;
      } else {
        counts["अ-1"]++;
      }
    });

    return counts;
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
      {/* Layout Selection Dialog Modal */}
      {showLayoutModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="size-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1.5">नोंदवही PDF स्वरूप निवडा</h3>
            <p className="text-xs text-slate-500 font-medium mb-6">
              तुम्हाला एका विद्यार्थ्याची नोंदवही १ पानामध्ये हवी आहे की २ पानांमध्ये?
            </p>

            <div className="grid grid-cols-1 gap-3.5 mb-2">
              <button
                onClick={() => {
                  setPageMode("1page");
                  setShowLayoutModal(false);
                }}
                className="p-4 rounded-2xl border-2 border-blue-500 bg-blue-50/50 hover:bg-blue-100/80 transition-all text-left flex items-center gap-3.5 cursor-pointer group active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-black text-blue-950 group-hover:text-blue-600">
                    १ पानाची नोंदवही (Single Page)
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium leading-tight">
                    एकाच पानावर गुण तक्ता + वर्णनात्मक नोंदी कॉम्पॅक्ट.
                  </p>
                </div>
              </button>

              <button
                onClick={() => {
                  setPageMode("2pages");
                  setShowLayoutModal(false);
                }}
                className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/50 hover:bg-slate-100 transition-all text-left flex items-center gap-3.5 cursor-pointer group active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center font-bold text-base shadow-sm">
                  2
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-slate-700">
                    २ पानांची नोंदवही (Two Pages)
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium leading-tight">
                    दोन पानांमध्ये सविस्तर गुण तक्ता व वर्णनात्मक नोंदी.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

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


        {/* Semester Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setSelectedTerm("sem1")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              selectedTerm === "sem1"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>📘 प्रथम सत्र</span>
          </button>
          <button
            onClick={() => setSelectedTerm("sem2")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              selectedTerm === "sem2"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>📙 द्वितीय सत्र</span>
          </button>
        </div>

        {/* Page Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setPageMode("1page")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              pageMode === "1page"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText className="size-3.5" />
            <span>१ पान</span>
          </button>
          <button
            onClick={() => setPageMode("2pages")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              pageMode === "2pages"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Copy className="size-3.5" />
            <span>२ पाने</span>
          </button>
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
                      <td className="p-3 text-center text-slate-600 font-mono font-bold">
                        {pageMode === "1page" ? (idx + 3) : `${idx * 2 + 3} - ${idx * 2 + 4}`}
                      </td>
                    </tr>
                  ))
                )}
                <tr className="border-b border-amber-900/40 bg-slate-50">
                  <td className="p-3 border-r border-amber-900/40 text-blue-700 font-bold">श्रेणी निहाय संकलन तक्ता (वर्गस्तर)</td>
                  <td className="p-3 text-center text-slate-600 font-mono font-bold">
                    {pageMode === "1page" ? (students.length + 3) : (students.length * 2 + 3)}
                  </td>
                </tr>
                <tr className="border-b border-amber-900/40 bg-slate-50">
                  <td className="p-3 border-r border-amber-900/40 text-blue-700 font-bold">जातनिहाय व विषयनिहाय एकूण तेरीज पत्रक</td>
                  <td className="p-3 text-center text-slate-600 font-mono font-bold">
                    {pageMode === "1page" ? (students.length + 4) : (students.length * 2 + 4)}
                  </td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="p-3 border-r border-amber-900/40 text-blue-700 font-bold">सातत्यपूर्ण सर्वंकष मूल्यांकन: निकाल पत्रक</td>
                  <td className="p-3 text-center text-slate-600 font-mono font-bold">
                    {pageMode === "1page" ? (students.length + 5) : (students.length * 2 + 5)}
                  </td>
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

        {/* -------------------- STUDENT PAGES -------------------- */}
        {students.map((student, sIdx) => {
          const studentId = student.id || student.name;
          const findStudentMarks = (std) => {
            if (!std || !marksData) return {};
            const stdKeys = [
              std.id,
              std.rollNo,
              String(std.rollNo),
              std.name,
              std.fullName,
              std.studentId,
            ];

            for (const k of stdKeys) {
              if (k && marksData[k]) return marksData[k];
            }

            const allKeys = Object.keys(marksData);
            for (const k of stdKeys) {
              if (!k) continue;
              const targetNorm = String(k).toLowerCase().replace(/\s+/g, "");
              const matchK = allKeys.find((mk) => String(mk).toLowerCase().replace(/\s+/g, "") === targetNorm);
              if (matchK && marksData[matchK]) return marksData[matchK];
            }
            return {};
          };

          const studentMarks = findStudentMarks(student);

          const findStudentRemarks = (std) => {
            if (!std || !remarksData) return {};
            const stdKeys = [
              std.id,
              std.rollNo,
              String(std.rollNo),
              std.name,
              std.fullName,
              std.studentId,
            ];

            for (const k of stdKeys) {
              if (k && remarksData[k]) return remarksData[k];
            }

            const allKeys = Object.keys(remarksData);
            for (const k of stdKeys) {
              if (!k) continue;
              const targetNorm = String(k).toLowerCase().replace(/\s+/g, "");
              const matchK = allKeys.find((rk) => String(rk).toLowerCase().replace(/\s+/g, "") === targetNorm);
              if (matchK && remarksData[matchK]) return remarksData[matchK];
            }
            return {};
          };

          const studentRemarks = findStudentRemarks(student);

          return (
            <React.Fragment key={student.id}>
              {/* Page A: Formative & Summative Evaluation Table */}
              <div
                className={`pdf-page bg-white border border-slate-200 rounded-3xl min-h-[285mm] h-auto overflow-hidden shadow-sm flex flex-col justify-between mb-4 ${pageMode === "1page" ? "p-3" : "p-6"}`}
                style={{ pageBreakAfter: "always", breakAfter: "page" }}
              >
                <div>
                  <h2 className={`font-black text-[#004080] text-center tracking-tight ${pageMode === "1page" ? "text-base mb-1" : "text-2xl mb-4"}`}>सातत्यपूर्ण सर्वंकष मूल्यांकन</h2>

                  {/* Student Meta Header */}
                  <div className={`flex items-center justify-between font-bold text-slate-900 border-b-2 border-sky-100 ${pageMode === "1page" ? "text-[9px] pb-1 mb-1" : "text-xs pb-3 mb-4"}`}>
                    <span>विद्यार्थ्याचे नाव - <b className="text-slate-900">{student.name}</b></span>
                    <span>इयत्ता - <b>{selectedClass}</b></span>
                    <span>तुकडी - <b>{division}</b></span>
                    <span>हजेरी क्र. <b>{student.rollNo}</b></span>
                    <span>{selectedTerm === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}</span>
                  </div>

                  {/* Marks Table */}
                  <div className="overflow-x-auto">
                    <table className={`w-full border-collapse border-2 border-[#0080ff] text-center font-medium table-fixed ${pageMode === "1page" ? "text-[7px]" : "text-xs"}`}>
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
                        <tr className={`bg-[#bfe5ff] text-[#002b66] font-bold border-b border-[#0080ff] ${pageMode === "1page" ? "h-16" : "h-28"}`}>
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
                          const getSubjectWeightageForStudent = (std, subName) => {
                            if (!weightages) return null;
                            
                            const getArr = (v) => (Array.isArray(v) && v.length > 0 ? v : []);
                            const termItems = selectedTerm === "sem1" ? getArr(weightages.semester1) : getArr(weightages.semester2);
                            const rowsItems = getArr(weightages.rows || weightages.data);
                            
                            const primaryItems = termItems.length > 0 ? termItems : rowsItems;
                            if (primaryItems.length === 0) return null;

                            const rollNo = Number(std.rollNo);
                            const stdIdStr = String(std.id || std.rollNo || "").trim().toLowerCase();

                            let item = primaryItems.find((it) => {
                              if (!it.studentIds || !Array.isArray(it.studentIds)) return false;
                              return it.studentIds.some((id) => Number(id) === rollNo || String(id).trim().toLowerCase() === stdIdStr);
                            });

                            if (!item) item = primaryItems[0];
                            if (!item || !item.subjects) return null;

                            if (item.subjects[subName]) return item.subjects[subName];

                            const lower = String(subName).toLowerCase();
                            for (const [sKey, sVal] of Object.entries(item.subjects)) {
                              if (!sVal) continue;
                              const skLower = sKey.toLowerCase();
                              if (lower.includes("मराठी") && (skLower.includes("marathi") || skLower.includes("मराठी"))) return sVal;
                              if (lower.includes("इंग्रजी") && (skLower.includes("english") || skLower.includes("इंग्रजी"))) return sVal;
                              if (lower.includes("गणित") && (skLower.includes("math") || skLower.includes("गणित"))) return sVal;
                              if (lower.includes("कला") && (skLower.includes("kala") || skLower.includes("art") || skLower.includes("कला"))) return sVal;
                              if (lower.includes("कार्यानुभव") && (skLower.includes("karyanubhav") || skLower.includes("work") || skLower.includes("कार्यानुभव"))) return sVal;
                              if (lower.includes("शारीरिक") && (skLower.includes("sharirik") || skLower.includes("pe") || skLower.includes("शारीरिक"))) return sVal;
                            }
                            return null;
                          };

                          const getSubData = (subName) => {
                            if (!studentMarks) return {};
                            if (studentMarks[subName]) return studentMarks[subName];
                            const lower = String(subName).toLowerCase();
                            if (lower.includes("मराठी")) return studentMarks["marathi"] || studentMarks["prathambhasha"] || studentMarks["प्रथम भाषा : मराठी"] || studentMarks["प्रथम भाषा: मराठी"] || {};
                            if (lower.includes("इंग्रजी")) return studentMarks["english"] || studentMarks["dvitiybhasha"] || studentMarks["द्वितीय भाषा : इंग्रजी"] || studentMarks["तृतीय भाषा: इंग्रजी"] || studentMarks["तृतीय भाषा : इंग्रजी"] || {};
                            if (lower.includes("गणित")) return studentMarks["math"] || studentMarks["maths"] || studentMarks["ganit"] || studentMarks["गणित"] || {};
                            if (lower.includes("परिसर")) return studentMarks["parisar"] || studentMarks["parisar1"] || studentMarks["parisar2"] || studentMarks["परिसर अभ्यास"] || {};
                            if (lower.includes("कला")) return studentMarks["kala"] || studentMarks["कला"] || {};
                            if (lower.includes("कार्यानुभव")) return studentMarks["karyanubhav"] || studentMarks["कार्यानुभव"] || {};
                            if (lower.includes("शारीरिक")) return studentMarks["sharirik"] || studentMarks["शारीरिक शिक्षण"] || {};
                            return {};
                          };

                          const subData = getSubData(subjectName);
                          const sw = getSubjectWeightageForStudent(student, subjectName);
                          const isPracticalSub = subjectName.includes("कला") || subjectName.includes("कार्यानुभव") || subjectName.includes("शारीरिक");

                          const getSwVal = (swObj, ...keys) => {
                            if (!swObj || typeof swObj !== "object") return undefined;
                            for (const k of keys) {
                              if (swObj[k] !== undefined && swObj[k] !== null && String(swObj[k]).trim() !== "") return String(swObj[k]);
                            }
                            return undefined;
                          };

                          const swTondi = getSwVal(sw, "tondiKaam", "tondi", "oral");
                          const swPratyakshik = getSwVal(sw, "pratyakshikPrayog", "pratyakshik", "practical");
                          const swUpakram = getSwVal(sw, "upakramKriti", "upakram", "kriti", "project");
                          const swPrakalpa = getSwVal(sw, "prakalpa", "prakalp");
                          const swChaachani = getSwVal(sw, "chaachaniLekhi", "chaachani", "test", "written");
                          const swSwadhyay = getSwVal(sw, "swadhyayVargakarya", "swadhyay", "vargakarya", "homework");
                          const swItar = getSwVal(sw, "itar", "other");

                          const swSankalitTondi = getSwVal(sw, "sankalitTondi", "semOral", "sankalitOral");
                          const swSankalitPratyakshik = getSwVal(sw, "sankalitPratyakshik", "sankalitPractical", "semPractical");
                          const swSankalitLekhi = getSwVal(sw, "sankalitLekhi", "sankalitWritten", "semWritten", "lekhi");

                          const tondiKaamObt = subData.tondiKaam ?? subData.oral ?? subData.oralKaam ?? "";
                          const pratyakshikPrayogObt = subData.pratyakshikPrayog ?? subData.practical ?? subData.pratyakshik ?? "";
                          const upakramKritiObt = subData.upakramKriti ?? subData.upakram ?? subData.kriti ?? subData.project ?? "";
                          const prakalpaObt = subData.prakalp ?? subData.prakalpa ?? "";
                          const chaachaniLekhiObt = subData.chaachaniLekhi ?? subData.chaachani ?? subData.test ?? "";
                          const swadhyayVargakaryaObt = subData.swadhyayVargakarya ?? subData.swadhyay ?? subData.vargakarya ?? subData.homework ?? "";
                          const itarObt = subData.itar ?? subData.other ?? "";

                          const sankalitTondiObt = subData.sankalitTondi ?? subData.semesterOral ?? "";
                          const sankalitPratyakshikObt = subData.sankalitPratyakshik ?? subData.semesterPractical ?? "";
                          const sankalitLekhiObt = subData.sankalitLekhi ?? subData.semesterWritten ?? "";

                          const tondiKaamMax = sw ? (swTondi !== undefined ? swTondi : "0") : "0";
                          const pratyakshikPrayogMax = sw ? (swPratyakshik !== undefined ? swPratyakshik : "0") : "0";
                          const upakramKritiMax = sw ? (swUpakram !== undefined ? swUpakram : "0") : "0";
                          const prakalpaMax = sw ? (swPrakalpa !== undefined ? swPrakalpa : "0") : "0";
                          const chaachaniLekhiMax = sw ? (swChaachani !== undefined ? swChaachani : "0") : "0";
                          const swadhyayVargakaryaMax = sw ? (swSwadhyay !== undefined ? swSwadhyay : "0") : "0";
                          const itarMax = sw ? (swItar !== undefined ? swItar : "0") : "0";

                          const sankalitTondiMax = sw ? (swSankalitTondi !== undefined ? swSankalitTondi : "0") : "0";
                          const sankalitPratyakshikMax = sw ? (swSankalitPratyakshik !== undefined ? swSankalitPratyakshik : "0") : "0";
                          const sankalitLekhiMax = sw ? (swSankalitLekhi !== undefined ? swSankalitLekhi : "0") : "0";

                          const hasFormative = tondiKaamObt !== "" || pratyakshikPrayogObt !== "" || upakramKritiObt !== "" || prakalpaObt !== "" || chaachaniLekhiObt !== "" || swadhyayVargakaryaObt !== "" || itarObt !== "";
                          const formTotalObt = hasFormative ? ((Number(tondiKaamObt) || 0) + (Number(pratyakshikPrayogObt) || 0) + (Number(upakramKritiObt) || 0) + (Number(prakalpaObt) || 0) + (Number(chaachaniLekhiObt) || 0) + (Number(swadhyayVargakaryaObt) || 0) + (Number(itarObt) || 0)) : (sw ? 0 : "0");
                          const formTotalMax = (Number(tondiKaamMax) || 0) + (Number(pratyakshikPrayogMax) || 0) + (Number(upakramKritiMax) || 0) + (Number(prakalpaMax) || 0) + (Number(chaachaniLekhiMax) || 0) + (Number(swadhyayVargakaryaMax) || 0) + (Number(itarMax) || 0);

                          const hasSummative = sankalitTondiObt !== "" || sankalitPratyakshikObt !== "" || sankalitLekhiObt !== "";
                          const semTotalObt = hasSummative ? ((Number(sankalitTondiObt) || 0) + (Number(sankalitPratyakshikObt) || 0) + (Number(sankalitLekhiObt) || 0)) : (sw ? 0 : "0");
                          const semTotalMax = isPracticalSub ? 0 : ((Number(sankalitTondiMax) || 0) + (Number(sankalitPratyakshikMax) || 0) + (Number(sankalitLekhiMax) || 0));

                          const hasGrand = formTotalObt !== "" || semTotalObt !== "";
                          const grandTotalObt = hasGrand ? ((Number(formTotalObt) || 0) + (Number(semTotalObt) || 0)) : 0;
                          const grandMax = formTotalMax + semTotalMax;
                          const grade = (grandTotalObt > 0 && grandMax > 0) ? getGrade((Number(grandTotalObt) / grandMax) * 100) : "0";

                          const cellPad = pageMode === "1page" ? "p-0.5 text-[8px]" : "p-1 text-xs";

                          const getObtValDisp = (obt, maxStr) => {
                            if (obt !== "" && obt !== undefined && obt !== null) return String(obt);
                            if (maxStr === "0" || maxStr === 0 || !sw) return "0";
                            return "";
                          };

                          return (
                            <React.Fragment key={subjectName}>
                              {/* Row 1: पैकी */}
                              <tr className="bg-white text-slate-900 font-bold border-t border-[#0080ff]">
                                <td rowSpan={2} className={`border border-[#0080ff] ${cellPad} font-extrabold align-middle text-center`}>{subIdx + 1}</td>
                                <td rowSpan={2} className={`border border-[#0080ff] ${cellPad} text-[#002b66] text-center font-bold align-middle leading-snug`}>{subjectName}</td>
                                <td className={`border border-[#0080ff] ${cellPad} text-slate-800 font-bold bg-white align-middle text-center`}>पैकी</td>
                                <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{tondiKaamMax}</td>
                                <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{pratyakshikPrayogMax}</td>
                                <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{upakramKritiMax}</td>
                                <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{prakalpaMax}</td>
                                <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{chaachaniLekhiMax}</td>
                                <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{swadhyayVargakaryaMax}</td>
                                <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{itarMax}</td>
                                <td className={`border border-[#0080ff] ${cellPad} font-extrabold align-middle text-center bg-white`}>{formTotalMax}</td>
                                {isPracticalSub ? (
                                  <td colSpan={4} rowSpan={2} className="border border-[#0080ff] bg-slate-50 align-middle"></td>
                                ) : (
                                  <>
                                    <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{sankalitTondiMax}</td>
                                    <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{sankalitPratyakshikMax}</td>
                                    <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{sankalitLekhiMax}</td>
                                    <td className={`border border-[#0080ff] ${cellPad} font-extrabold align-middle text-center bg-white`}>{semTotalMax}</td>
                                  </>
                                )}
                                <td className={`border border-[#0080ff] ${cellPad} font-extrabold align-middle text-center bg-white`}>{grandMax}</td>
                                <td rowSpan={2} className={`border border-[#0080ff] ${cellPad} font-extrabold text-slate-900 align-middle text-center text-xs`}>{grade}</td>
                              </tr>

                              {/* Row 2: प्राप्त */}
                              <tr className="bg-white text-slate-900 font-bold border-b-2 border-[#0080ff]">
                                <td className={`border border-[#0080ff] ${cellPad} text-slate-800 font-bold bg-white align-middle text-center`}>प्राप्त</td>
                                <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{getObtValDisp(tondiKaamObt, tondiKaamMax)}</td>
                                <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{getObtValDisp(pratyakshikPrayogObt, pratyakshikPrayogMax)}</td>
                                <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{getObtValDisp(upakramKritiObt, upakramKritiMax)}</td>
                                <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{getObtValDisp(prakalpaObt, prakalpaMax)}</td>
                                <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{getObtValDisp(chaachaniLekhiObt, chaachaniLekhiMax)}</td>
                                <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{getObtValDisp(swadhyayVargakaryaObt, swadhyayVargakaryaMax)}</td>
                                <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{getObtValDisp(itarObt, itarMax)}</td>
                                <td className={`border border-[#0080ff] ${cellPad} font-extrabold align-middle text-center bg-white`}>{formTotalObt !== "" ? formTotalObt : 0}</td>
                                {!isPracticalSub && (
                                  <>
                                    <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{getObtValDisp(sankalitTondiObt, sankalitTondiMax)}</td>
                                    <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{getObtValDisp(sankalitPratyakshikObt, sankalitPratyakshikMax)}</td>
                                    <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{getObtValDisp(sankalitLekhiObt, sankalitLekhiMax)}</td>
                                    <td className={`border border-[#0080ff] ${cellPad} font-extrabold align-middle text-center bg-white`}>{semTotalObt !== "" ? semTotalObt : 0}</td>
                                  </>
                                )}
                                <td className={`border border-[#0080ff] ${cellPad} font-extrabold align-middle text-center bg-white`}>{grandTotalObt !== "" ? grandTotalObt : 0}</td>
                              </tr>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                  {/* Inline Compact Remarks — ONLY in 1-page mode */}
                  {pageMode === "1page" && (
                    <div className="mt-1.5">
                      <h3 className="text-[9px] font-black text-sky-800 text-center mb-0.5 border-b border-sky-200 pb-0.5">वर्णनात्मक नोंदी</h3>
                      <table className="w-full border-collapse border border-sky-400 text-[7.5px] font-medium">
                        <thead>
                          <tr className="bg-sky-100 text-sky-950 font-bold">
                            <th className="border border-sky-400 p-0.5 text-left w-1/4">विषय / घटक</th>
                            <th className="border border-sky-400 p-0.5 text-left w-3/4">वर्णनात्मक नोंदी</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const getR = (obj, key) => {
                              if (!obj || typeof obj !== "object") return "-";
                              let v = obj[key];
                              if (!v) {
                                const l = String(key).toLowerCase();
                                if (l.includes("मराठी")) v = obj["prathambhasha"] || obj["marathi"] || obj["प्रथम भाषा : मराठी"];
                                else if (l.includes("इंग्रजी")) v = obj["dvitiybhasha"] || obj["english"] || obj["द्वितीय भाषा : इंग्रजी"];
                                else if (l.includes("गणित")) v = obj["ganit"] || obj["math"] || obj["गणित"];
                                else if (l.includes("कला")) v = obj["kala"] || obj["कला"];
                                else if (l.includes("कार्यानुभव")) v = obj["karyanubhav"] || obj["कार्यानुभव"];
                                else if (l.includes("शारीरिक")) v = obj["sharirik"] || obj["शारीरिक शिक्षण"];
                                else if (l.includes("विशेष")) v = obj["visheshpragati"] || obj["vishesh"] || obj["विशेष प्रगती"];
                                else if (l.includes("सुधारणा")) v = obj["sudharna"] || obj["sudharana"] || obj["सुधारणा आवश्यक"];
                                else if (l.includes("आवड")) v = obj["aavad"] || obj["आवड / छंद"];
                                else if (l.includes("व्यक्तिमत्त्व")) v = obj["vyaktimatva"] || obj["व्यक्तिमत्त्व गुणविशेष"];
                              }
                              if (!v) return "-";
                              return Array.isArray(v) ? (v.length > 0 ? v.join(" ") : "-") : (String(v).trim() || "-");
                            };
                            return (
                              <>
                                {subjects.map((s) => (
                                  <tr key={s} className="border-b border-sky-300">
                                    <td className="border border-sky-400 p-0.5 font-bold text-slate-900 bg-sky-50/50 leading-tight">{s}</td>
                                    <td className="border border-sky-400 p-0.5 text-slate-800 leading-tight">{getR(studentRemarks, s)}</td>
                                  </tr>
                                ))}
                                {["विशेष प्रगती", "सुधारणा आवश्यक", "आवड / छंद", "व्यक्तिमत्त्व गुणविशेष"].map((label) => (
                                  <tr key={label} className="border-b border-sky-300">
                                    <td className="border border-sky-400 p-0.5 font-bold text-slate-900 bg-sky-50/50 leading-tight">{label}</td>
                                    <td className="border border-sky-400 p-0.5 text-slate-800 leading-tight">{getR(studentRemarks, label)}</td>
                                  </tr>
                                ))}
                              </>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  )}

                {/* Footer Signatures */}
                <div className={`flex items-center justify-between border-t border-slate-200 font-bold text-slate-900 ${pageMode === "1page" ? "pt-1 mt-1 text-[8px]" : "pt-4 mt-3 text-xs"}`}>
                  <div className="text-center">
                    <p className={pageMode === "1page" ? "font-extrabold text-[9px]" : "font-extrabold text-sm"}>{schoolData.teacherName || "वर्गशिक्षक"}</p>
                    <p className={pageMode === "1page" ? "text-[7px] text-slate-500 font-medium" : "text-[11px] text-slate-600 font-medium"}>वर्गशिक्षक</p>
                  </div>
                  <div className="text-center">
                    <p className={pageMode === "1page" ? "font-extrabold text-[9px]" : "font-extrabold text-sm"}>{schoolData.headmasterName || "मुख्याध्यापक"}</p>
                    <p className={pageMode === "1page" ? "text-[7px] text-slate-500 font-medium" : "text-[11px] text-slate-600 font-medium"}>मुख्याध्यापक</p>
                  </div>
                </div>
              </div>

              {/* Page B: Descriptive Remarks Table — ONLY in 2-pages mode */}
              {pageMode === "2pages" && (
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
                          const targetObj = remarksObj.sem2 || remarksObj.sem1 || remarksObj.second || remarksObj;
                          let val = targetObj[labelOrKey] || remarksObj[labelOrKey];

                          if (!val) {
                            const lower = String(labelOrKey).toLowerCase();

                            const searchObj = (obj) => {
                              if (!obj || typeof obj !== "object") return null;
                              for (const [k, v] of Object.entries(obj)) {
                                if (!v) continue;
                                const kLower = k.toLowerCase();
                                if (lower.includes("मराठी") || lower.includes("prathambhasha")) {
                                  if (kLower.includes("marathi") || kLower.includes("prathambhasha") || kLower.includes("मराठी") || kLower.includes("भाषा")) return v;
                                }
                                if (lower.includes("इंग्रजी") || lower.includes("dvitiybhasha")) {
                                  if (kLower.includes("english") || kLower.includes("dvitiybhasha") || kLower.includes("इंग्रजी")) return v;
                                }
                                if (lower.includes("गणित") || lower.includes("ganit")) {
                                  if (kLower.includes("ganit") || kLower.includes("math") || kLower.includes("गणित")) return v;
                                }
                                if (lower.includes("परिसर") || lower.includes("parisar")) {
                                  if (kLower.includes("parisar") || kLower.includes("परिसर")) return v;
                                }
                                if (lower.includes("कला") || lower.includes("kala")) {
                                  if (kLower.includes("kala") || kLower.includes("कला") || kLower.includes("art")) return v;
                                }
                                if (lower.includes("कार्यानुभव") || lower.includes("karyanubhav")) {
                                  if (kLower.includes("karyanubhav") || kLower.includes("कार्यानुभव") || kLower.includes("work")) return v;
                                }
                                if (lower.includes("शारीरिक") || lower.includes("sharirik")) {
                                  if (kLower.includes("sharirik") || kLower.includes("शारीरिक") || kLower.includes("pe") || kLower.includes("health")) return v;
                                }
                                if (lower.includes("विशेष") || lower.includes("visheshpragati")) {
                                  if (kLower.includes("vishesh") || kLower.includes("विशेष")) return v;
                                }
                                if (lower.includes("सुधारणा") || lower.includes("sudharna")) {
                                  if (kLower.includes("sudharn") || kLower.includes("sudhar") || kLower.includes("सुधारणा")) return v;
                                }
                                if (lower.includes("आवड") || lower.includes("aavad")) {
                                  if (kLower.includes("aavad") || kLower.includes("आवड") || kLower.includes("hobby")) return v;
                                }
                                if (lower.includes("व्यक्तिमत्त्व") || lower.includes("vyaktimatva")) {
                                  if (kLower.includes("vyaktimatva") || kLower.includes("व्यक्तिमत्त्व") || kLower.includes("व्यक्तिमत्व")) return v;
                                }
                              }
                              return null;
                            };

                            val = searchObj(targetObj) || searchObj(remarksObj);
                          }

                          if (!val) return "-";
                          if (Array.isArray(val)) {
                            const validStr = val.filter(Boolean).map(s => String(s).trim()).filter(s => s.length > 0);
                            return validStr.length > 0 ? validStr.join(" ") : "-";
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
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default BoardResult;
