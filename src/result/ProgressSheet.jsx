import React, { useState, useEffect, useRef } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { Download, Printer, ArrowLeft, Loader2, User, RotateCw, FileText, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import "./result.css";

import { fetchStudentsForClass } from "./firestoreMarksHelper";
import { getDefaultSubjectsForClass } from "../data/cceSubjects";
import { getTeacherId } from "../lib/teacherIsolationHelper";

const DEFAULT_SUBJECTS = [
  "प्रथम भाषा : मराठी",
  "द्वितीय भाषा : इंग्रजी",
  "गणित",
  "परिसर अभ्यास",
  "कला",
  "कार्यानुभव",
  "शारीरिक शिक्षण",
];

const getGrade = (percentage) => {
  if (percentage === null || percentage === undefined || isNaN(percentage) || percentage <= 0) return "-";
  const p = Number(percentage);
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

const getNextClassLabel = (currentClass) => {
  const map = {
    "1st": "दुसरी",
    "2nd": "तिसरी",
    "3rd": "चौथी",
    "4th": "पाचवी",
    "5th": "सहावी",
    "6th": "सातवी",
    "7th": "आठवी",
    "8th": "नववी",
    "9th": "दहावी",
    "10th": "अकरावी",
  };
  return map[currentClass] || "पाचवी";
};

const monthsList = [
  { key: "june", label: "जून" },
  { key: "july", label: "जुलै" },
  { key: "august", label: "ऑगस्ट" },
  { key: "september", label: "सप्टेंबर" },
  { key: "october", label: "ऑक्टोबर" },
  { key: "november", label: "नोव्हेंबर" },
  { key: "december", label: "डिसेंबर" },
  { key: "january", label: "जानेवारी" },
  { key: "february", label: "फेब्रुवारी" },
  { key: "march", label: "मार्च" },
  { key: "april", label: "एप्रिल" },
  { key: "may", label: "मे" },
];

const ProgressSheet = ({ initialClass = "1st", initialYear = "2025-26", initialTerm = "sem2", onBack }) => {
  const [selectedClass, setSelectedClass] = useState(initialClass || "1st");
  const [academicYear, setAcademicYear] = useState(initialYear || "2025-26");
  const [selectedTerm, setSelectedTerm] = useState(initialTerm || "sem2");
  const [division, setDivision] = useState("1");
  const [selectedMedium, setSelectedMedium] = useState("marathi");
  const [viewMode, setViewMode] = useState("rotated"); // "rotated" (90° Rotated View) | "portrait" (A4 Portrait) | "landscape" (A4 Landscape)
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (initialTerm && initialTerm !== selectedTerm) {
      setSelectedTerm(initialTerm);
    }
  }, [initialTerm]);

  const [schoolData, setSchoolData] = useState({
    schoolName: "",
    udise: "",
    teacherName: "",
    headmasterName: "",
    address: "",
    slogan: "✦ ज्ञान, संस्कार आणि प्रगतीसाठी ✦",
  });

  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [students, setStudents] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [remarksData, setRemarksData] = useState({});
  const [attendanceData, setAttendanceData] = useState({});

  const printRef = useRef(null);

  useEffect(() => {
    loadUserFirestoreData();
  }, [selectedClass, academicYear, selectedMedium, selectedTerm]);

  const loadUserFirestoreData = async () => {
    setLoading(true);
    try {
      const docId = `${selectedClass}_${academicYear}`;

      // 1. School Settings
      try {
        let globalSettings = null;
        try {
          const cachedGen = localStorage.getItem("cce_general_school_settings");
          if (cachedGen) globalSettings = JSON.parse(cachedGen);
        } catch (e) {}

        if (!globalSettings) {
          try {
            const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
            globalSettings = await fetchJsonFromBunny("cce_results/general_school_settings.json");
          } catch (e) {}
        }

        const settingsSnap = await getDoc(doc(db, "cce_settings", docId));
        const classSettings = settingsSnap.exists() ? settingsSnap.data() : {};
        const mergedSettings = { ...(globalSettings || {}), ...classSettings };

        setSchoolData({
          schoolName: mergedSettings.schoolName || globalSettings?.schoolName || "जिल्हा परिषद शाळा धोंडेवाडी(पेढ)ता.तासगाव जि.सांगली",
          udise: mergedSettings.udiseCode || mergedSettings.udise || globalSettings?.udiseCode || "27350800701",
          teacherName: classSettings.teacherName || globalSettings?.teacherName || "",
          headmasterName: mergedSettings.principalName || mergedSettings.headmasterName || globalSettings?.principalName || "",
          address: mergedSettings.address || globalSettings?.address || "मुक्काम धोंडेवाडी पोस्ट पेड तालुका तासगाव जिल्हा सांगली",
          slogan: mergedSettings.slogan || "✦ ज्ञान, संस्कार आणि प्रगतीसाठी ✦",
        });

        let classSubjects = [];
        if (mergedSettings.subjects && Array.isArray(mergedSettings.subjects) && mergedSettings.subjects.length > 0) {
          classSubjects = mergedSettings.subjects;
        } else {
          classSubjects = getDefaultSubjectsForClass(selectedClass, selectedMedium) || DEFAULT_SUBJECTS;
        }
        setSubjects(classSubjects);
      } catch (e) {
        console.error("Error fetching school settings:", e);
      }

      // 2. Fetch Students
      const currentTeacherId = getTeacherId();
      const currentMedium = selectedMedium || (typeof localStorage !== "undefined" ? localStorage.getItem("cce_selected_medium") : null) || "marathi";
      let loadedStudents = await fetchStudentsForClass(selectedClass, currentMedium, currentTeacherId);

      // Merge student_details & photo lookups
      try {
        const detailsMap = new Map();
        const detailsSnap = await getDocs(collection(db, "student_details"));
        detailsSnap.forEach((docSnap) => {
          detailsMap.set(docSnap.id, docSnap.data());
        });

        // Also fetch from student_photos collection if present
        const photosMap = new Map();
        try {
          const photoSnap = await getDocs(collection(db, "student_photos"));
          photoSnap.forEach((pDoc) => {
            const pData = pDoc.data();
            const pUrl = pData?.photoUrl || pData?.photoURL || pData?.photo || pData?.url || pData?.imageUrl;
            if (pUrl) photosMap.set(pDoc.id, pUrl);
          });
        } catch (e) {}

        loadedStudents = loadedStudents.map((s) => {
          const det = detailsMap.get(s.id) || {};
          const photoFromMap = photosMap.get(s.id) || photosMap.get(s.studentId) || photosMap.get(String(s.rollNo));

          let localPhoto = null;
          if (typeof localStorage !== "undefined") {
            localPhoto =
              localStorage.getItem(`student_photo_${s.id}`) ||
              localStorage.getItem(`student_photo_${s.rollNo}`) ||
              localStorage.getItem(`cce_photo_${s.id}`) ||
              localStorage.getItem(`cce_photo_${s.rollNo}`) ||
              localStorage.getItem("school_template_photo");
          }

          const photoUrl =
            s.photoUrl ||
            s.photoURL ||
            s.photo ||
            s.studentPhoto ||
            s.profilePhoto ||
            s.avatarUrl ||
            s.image ||
            det.photoUrl ||
            det.photoURL ||
            det.photo ||
            det.studentPhoto ||
            det.profilePhoto ||
            det.avatarUrl ||
            det.image ||
            photoFromMap ||
            localPhoto ||
            "";

          return {
            ...s,
            fatherName: det.fatherName || s.fatherName || s.stdFather || "",
            fatherOccupation: det.fatherOccupation || "नोकरी",
            motherName: det.motherName || s.motherName || s.stdMother || "",
            motherOccupation: det.motherOccupation || "घरकाम",
            dob: det.dob || s.dob || "",
            aadhar: det.aadhar || s.aadhar || "",
            generalRegNo: det.registrationNo || s.generalRegNo || "",
            motherTongue: det.motherTongue || s.motherTongue || "मराठी",
            caste: det.caste || s.caste || "ओपन",
            religion: det.religion || s.religion || "हिंदू",
            address: det.address || s.address || schoolData.address || "",
            mobile: det.phone || s.mobile || "",
            studentId: det.studentId || s.studentId || s.id || "",
            height: det.height || s.height || "134",
            weight: det.weight || s.weight || "28",
            photoUrl: photoUrl,
          };
        });
      } catch (e) {}

      loadedStudents.sort((a, b) => (parseInt(a.rollNo) || 0) - (parseInt(b.rollNo) || 0));
      setStudents(loadedStudents);

      // 3. Fetch Marks
      try {
        const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
        const bunnyMarksSec = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_marks_second.json`);
        const bunnyMarksFirst = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_marks_first.json`);

        const marksSnapSem1 = await getDoc(doc(db, "cce_marks_v2", `${selectedClass}_${academicYear}_sem1`));
        const marksSnapSem2 = await getDoc(doc(db, "cce_marks_v2", `${selectedClass}_${academicYear}_sem2`));
        const marksSnapGen = await getDoc(doc(db, "cce_marks_v2", docId));

        const fsSem1 = marksSnapSem1.exists() ? (marksSnapSem1.data().records || marksSnapSem1.data()) : {};
        const fsSem2 = marksSnapSem2.exists() ? (marksSnapSem2.data().records || marksSnapSem2.data()) : {};
        const fsGen = marksSnapGen.exists() ? (marksSnapGen.data().records || marksSnapGen.data().marksData || marksSnapGen.data()) : {};

        const bunnyFirst = bunnyMarksFirst || {};
        const bunnySec = bunnyMarksSec || {};

        const mergedMarks = {};
        const allStudentKeys = new Set([
          ...Object.keys(fsSem1 || {}),
          ...Object.keys(fsSem2 || {}),
          ...Object.keys(fsGen || {}),
          ...Object.keys(bunnyFirst || {}),
          ...Object.keys(bunnySec || {}),
        ]);

        allStudentKeys.forEach((sId) => {
          mergedMarks[sId] = {
            ...(fsGen[sId] || {}),
            sem1: {
              ...(fsGen[sId]?.sem1 || fsGen[sId]?.semester1 || {}),
              ...(bunnyFirst[sId] || {}),
              ...(fsSem1[sId] || {}),
            },
            sem2: {
              ...(fsGen[sId]?.sem2 || fsGen[sId]?.semester2 || {}),
              ...(bunnySec[sId] || {}),
              ...(fsSem2[sId] || {}),
            },
          };
        });

        setMarksData(mergedMarks);
      } catch (e) {
        console.error("Error fetching marks:", e);
      }

      // 4. Fetch Remarks
      try {
        let mergedRemarks = {};
        const loadSemesterRemarks = async (sem) => {
          let recs = null;
          const currentTeacherId = getTeacherId();
          const cacheKey = `cce_remarks_cache_${selectedClass}_${academicYear}_${sem}_${selectedMedium}`;
          try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
                recs = parsed;
              }
            }
          } catch (e) {}

          if (!recs || Object.keys(recs).length === 0) {
            const docIds = [
              ...(currentTeacherId ? [
                `${currentTeacherId}_${selectedClass}_${academicYear}_${sem}_${selectedMedium}`,
                `${currentTeacherId}_${selectedClass}_${academicYear}_${sem}`,
                `${currentTeacherId}_${selectedClass}_${academicYear}_${sem}_marathi`,
              ] : []),
              `${selectedClass}_${academicYear}_${sem}_${selectedMedium}`,
              `${selectedClass}_${academicYear}_${sem}`,
              `${selectedClass}_${academicYear}_${sem}_marathi`,
              `${selectedClass}_${academicYear}`,
            ];
            for (const dId of docIds) {
              try {
                const snap = await getDoc(doc(db, "cce_remarks_v2", dId));
                if (snap.exists()) {
                  const dData = snap.data();
                  const r = dData.records || dData.remarks || dData.data;
                  if (r && typeof r === "object" && Object.keys(r).length > 0) {
                    recs = r;
                    break;
                  }
                }
              } catch (e) {}
            }
          }

          if (!recs || Object.keys(recs).length === 0) {
            try {
              const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
              const bFile = `cce_results/${selectedClass}_${academicYear}_remarks_${sem}.json`;
              const bData = await fetchJsonFromBunny(bFile);
              if (bData && typeof bData === "object" && Object.keys(bData).length > 0) {
                recs = bData;
              }
            } catch (e) {}
          }
          return recs;
        };

        const sem1Recs = await loadSemesterRemarks("sem1");
        const sem2Recs = await loadSemesterRemarks("sem2");

        const mergeStudentRecords = (recs, semKey) => {
          if (!recs || typeof recs !== "object") return;
          Object.entries(recs).forEach(([sId, val]) => {
            if (!mergedRemarks[sId]) mergedRemarks[sId] = { sem1: {}, sem2: {} };
            if (val && typeof val === "object") {
              if (semKey) {
                mergedRemarks[sId][semKey] = { ...(mergedRemarks[sId][semKey] || {}), ...val };
              } else {
                if (val.sem1) Object.assign(mergedRemarks[sId].sem1, val.sem1);
                if (val.sem2) Object.assign(mergedRemarks[sId].sem2, val.sem2);
                Object.assign(mergedRemarks[sId], val);
              }
            }
          });
        };

        if (sem1Recs) mergeStudentRecords(sem1Recs, "sem1");
        if (sem2Recs) mergeStudentRecords(sem2Recs, "sem2");

        setRemarksData(mergedRemarks);
      } catch (e) {
        console.error("Error fetching remarks:", e);
      }

      // 5. Attendance Data
      const attendanceMap = {};
      try {
        const monthlySnap = await getDoc(doc(db, "cce_attendance", `${selectedClass}_${academicYear}_monthly`));
        if (monthlySnap.exists()) {
          const monthlyRecords = monthlySnap.data().records || {};
          Object.keys(monthlyRecords).forEach((stdId) => {
            if (!attendanceMap[stdId]) attendanceMap[stdId] = {};
            const stdMonths = monthlyRecords[stdId] || {};
            Object.keys(stdMonths).forEach((mK) => {
              const val = stdMonths[mK];
              if (val !== undefined && val !== null) {
                attendanceMap[stdId][mK.toLowerCase()] = Number(val);
              }
            });
          });
        }
      } catch (e) {}

      setAttendanceData(attendanceMap);
    } catch (err) {
      console.error("Error loading ProgressSheet data:", err);
    }
    setLoading(false);
  };

  // PDF Export Function
  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    toast.info("प्रगती पत्रक PDF तयार होत आहे, कृपया वाट पाहा...");

    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const pageElements = printRef.current.querySelectorAll(".pdf-page");
      if (!pageElements || pageElements.length === 0) {
        toast.error("प्रगती पत्रक पेज सापडले नाही.");
        setDownloading(false);
        return;
      }

      const orientation = viewMode === "landscape" ? "landscape" : "portrait";
      const pdf = new jsPDF({
        unit: "mm",
        format: "a4",
        orientation: orientation,
      });

      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i];

        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: 1200,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.98);

        if (i > 0) {
          pdf.addPage("a4", orientation);
        }

        if (orientation === "landscape") {
          pdf.addImage(imgData, "JPEG", 4, 4, 289, 202);
        } else {
          pdf.addImage(imgData, "JPEG", 3, 3, 204, 291);
        }
      }

      pdf.save(`प्रगती_पत्रक_${selectedClass}_${academicYear}.pdf`);
      toast.success("प्रगती पत्रक PDF यशस्वीरित्या डाऊनलोड झाली!");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("PDF निर्मितीत अडचण आली: " + (err?.message || "त्रुटी आली"));
    }
    setDownloading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const getFormattedRemark = (student, labelOrKey, term = "sem1") => {
    if (!student || !remarksData) return "";
    const stdKeys = [student.id, student.rollNo, String(student.rollNo), student.name, student.fullName, student.studentId];

    // Determine category aliases (English transliterations & Marathi labels)
    let aliases = [labelOrKey.toLowerCase()];
    if (labelOrKey.includes("प्रगती") || labelOrKey.includes("विशेष")) {
      aliases.push("visheshpragati", "vishesh_pragati", "visheshpragaty", "vishesh", "विशेष प्रगती", "विशेष");
    } else if (labelOrKey.includes("आवड") || labelOrKey.includes("छंद")) {
      aliases.push("aavad", "aavadchhand", "aawadchhand", "chhand", "aavad_chhand", "आवडी-निवडी", "आवड", "छंद");
    } else if (labelOrKey.includes("सुधारणा")) {
      aliases.push("sudharna", "sudharana", "sudharna_aavashyak", "sudharanaaavashyak", "सुधारणा आवश्यक", "सुधारणा");
    }

    for (const key of stdKeys) {
      if (!key) continue;
      const sRem = remarksData[key];
      if (sRem) {
        const termRem = sRem[term] || sRem[term === "sem1" ? "semester1" : "semester2"] || sRem;
        if (termRem && typeof termRem === "object") {
          const matchedKey = Object.keys(termRem).find((k) => {
            const lowerK = k.toLowerCase();
            return aliases.some((alias) => lowerK === alias || lowerK.includes(alias) || alias.includes(lowerK));
          });

          if (matchedKey && termRem[matchedKey]) {
            const val = termRem[matchedKey];
            if (Array.isArray(val)) {
              const clean = val.filter(Boolean).map((v) => String(v).trim()).filter((v) => v.length > 0);
              if (clean.length > 0) return clean.join(", ");
            }
            if (typeof val === "string" && val.trim().length > 0) {
              return val.trim();
            }
            if (typeof val === "object") {
              const str = val.text || val.value || val.remark || val.name || "";
              if (typeof str === "string" && str.trim().length > 0) return str.trim();
            }
          }
        }
      }
    }

    return "";
  };

  const getSubjectGradeForTerm = (student, subjectName, term = "sem1") => {
    if (!student || !marksData) return "-";
    const stdKeys = [student.id, student.rollNo, String(student.rollNo), student.name, student.fullName, student.studentId];

    for (const key of stdKeys) {
      if (!key) continue;
      const sMarks = marksData[key];
      if (sMarks) {
        const termMarks = sMarks[term] || sMarks[term === "sem1" ? "semester1" : "semester2"] || sMarks;
        if (termMarks && typeof termMarks === "object") {
          const matchedKey = Object.keys(termMarks).find(
            (k) => k.toLowerCase() === subjectName.toLowerCase() || k.includes(subjectName) || subjectName.includes(k)
          );
          if (matchedKey && termMarks[matchedKey] !== undefined && termMarks[matchedKey] !== null) {
            const val = termMarks[matchedKey];

            // 1. Direct string grade
            if (typeof val === "string" && val.trim().length > 0) {
              const strVal = val.trim();
              if (strVal.includes("अ") || strVal.includes("ब") || strVal.includes("क") || strVal.includes("ड") || strVal.includes("इ")) {
                return strVal;
              }
              const num = Number(strVal);
              if (!isNaN(num) && num > 0) {
                return getGrade(num);
              }
            }

            // 2. Object grade or numeric breakdown
            if (typeof val === "object") {
              if (val.grade && typeof val.grade === "string" && val.grade.trim().length > 0) {
                return val.grade.trim();
              }

              const markKeys = ["tondiKaam", "pratyakshikPrayog", "upakramKriti", "prakalpa", "chaachaniLekhi", "swadhyayVargakarya", "itar", "sankalitTondi", "sankalitPratyakshik", "sankalitLekhi"];
              let totalObtained = 0;
              let hasValue = false;

              markKeys.forEach((mK) => {
                if (val[mK] !== undefined && val[mK] !== null && val[mK] !== "") {
                  const n = Number(val[mK]);
                  if (!isNaN(n)) {
                    totalObtained += n;
                    if (n > 0) hasValue = true;
                  }
                }
              });

              if (hasValue && totalObtained > 0) {
                const pct = Math.min(100, Math.max(0, totalObtained));
                return getGrade(pct);
              }

              if (val.mark || val.total || val.score) {
                const numMark = Number(val.mark || val.total || val.score);
                if (!isNaN(numMark) && numMark > 0) {
                  return getGrade(numMark);
                }
              }
            }

            // 3. Direct number mark
            if (typeof val === "number" && val > 0) {
              return getGrade(val);
            }
          }
        }
      }
    }
    return "-";
  };

  const getStudentPresentDays = (student, month) => {
    const stdId = student.id || student.rollNo;
    const monthKey = month.key;

    if (attendanceData && attendanceData[stdId] && attendanceData[stdId][monthKey] !== undefined) {
      return attendanceData[stdId][monthKey];
    }
    const defaultWorking = {
      june: 13, july: 25, august: 23, september: 21, october: 12, november: 23, december: 26, january: 24, february: 22, march: 21, april: 24, may: 0,
    };
    return defaultWorking[monthKey] || 22;
  };

  const getWorkingDaysForMonth = (month) => {
    const defaultWorking = {
      june: 13, july: 25, august: 23, september: 21, october: 12, november: 23, december: 26, january: 24, february: 22, march: 21, april: 24, may: 0,
    };
    return defaultWorking[month.key] || 22;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <Loader2 className="size-10 text-orange-600 animate-spin" />
        <p className="text-sm font-bold text-slate-600">विद्यार्थी प्रगती पत्रक लोड होत आहे, कृपया वाट पाहा...</p>
      </div>
    );
  }

  const containerMaxWidth = viewMode === "landscape" ? "max-w-[295mm]" : "max-w-[215mm]";

  return (
    <div className="w-full bg-slate-100 min-h-screen p-4 md:p-6 text-slate-800 font-sans">
      {/* Top Header Actions */}
      <div className={`${containerMaxWidth} mx-auto flex flex-wrap items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 no-print gap-3 transition-all`}>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition-all cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          मागे जा (Back)
        </button>

        <div className="text-center">
          <h1 className="text-base sm:text-lg font-black text-amber-900 tracking-tight">विद्यार्थी प्रगती पत्रक (Progress Sheet)</h1>
          <p className="text-xs text-slate-500 font-medium">इयत्ता {selectedClass} | शैक्षणिक वर्ष {academicYear}</p>
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

        {/* View Mode Rotation Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setViewMode("rotated")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
              viewMode === "rotated"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="90° फिरावलेली दिशा (Rotated 90° View)"
          >
            <RotateCw className="size-3.5" />
            90° Rotated
          </button>
          <button
            onClick={() => setViewMode("portrait")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
              viewMode === "portrait"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="उभी दिशा (Upright Portrait View)"
          >
            <FileText className="size-3.5" />
            उभी दिशा (Portrait)
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <Printer className="size-4" />
            प्रिंट करा
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            PDF डाउनलोड
          </button>
        </div>
      </div>

      {/* ── PRINTABLE PROGRESS SHEET CONTAINER ────── */}
      <div ref={printRef} className={`w-full ${containerMaxWidth} mx-auto space-y-12 p-2 transition-all`}>
        <style>{`
          @media print {
            @page {
              size: ${viewMode === "landscape" ? "A4 landscape" : "A4 portrait"};
              margin: 0;
            }
            body {
              background: #ffffff !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>

        {students.map((student, idx) => {
          const rollNo = student.rollNo || idx + 1;
          const nextClass = getNextClassLabel(selectedClass);

          // Page 1 Card Content (2-Column Grid Layout so all contents fit 100% inside 190mm)
          const renderPage1Content = () => (
            <div className="w-[282mm] h-[190mm] bg-white border-2 border-amber-500 rounded-2xl p-3.5 flex flex-col justify-between select-none text-slate-900 shadow-sm">
              <div>
                {/* Top Header Banner across full width */}
                <div className="flex items-center justify-between border-b-2 border-amber-400 pb-1 mb-2">
                  <div className="flex items-center gap-2">
                    {/* Samagra Shiksha Logo Emblem */}
                    <div className="flex items-center gap-1.5">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex gap-0.5">
                          <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 block"></span>
                          <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 block"></span>
                        </div>
                        <div className="flex gap-0.5">
                          <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 block"></span>
                          <span className="w-2.5 h-2.5 rounded-xs bg-rose-600 block"></span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-[12px] font-black text-blue-900 tracking-wider leading-none uppercase">समग्र शिक्षा</h3>
                        <p className="text-[7.5px] text-slate-500 font-bold leading-none mt-0.5">Samagra Shiksha</p>
                      </div>
                    </div>
                  </div>

                  {/* Header Title Box */}
                  <div className="text-center bg-amber-50 px-6 py-1 rounded-xl border border-amber-300">
                    <h2 className="text-sm font-black text-amber-950 tracking-tight">
                      विद्यार्थी प्रगतीपत्रक सन {academicYear}
                    </h2>
                  </div>

                  {/* UDISE & Photo Box */}
                  <div className="flex items-center gap-3 text-right">
                    <div className="text-[10px] font-bold text-slate-800">
                      <span>यु-डायस: <b className="text-slate-950 font-black">{schoolData.udise || "27350800701"}</b></span>
                    </div>
                    <div className="w-12 h-14 border border-slate-400 rounded bg-slate-50 flex flex-col items-center justify-center text-slate-400 overflow-hidden shadow-2xs">
                      {student.photoUrl ? (
                        <img src={student.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                      ) : (
                        <User className="size-6 text-slate-300" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Main 2-Column Grid: Left (Student Profile Info), Right (Attendance & Grade Scale Tables) */}
                <div className="grid grid-cols-12 gap-3">
                  
                  {/* LEFT COLUMN: Student Profile Information Box */}
                  <div className="col-span-6 border-2 border-amber-400 rounded-xl p-2 bg-white shadow-2xs text-[9px] leading-tight space-y-1">
                    <div className="flex justify-between border-b border-amber-200 pb-0.5">
                      <span className="font-black text-amber-950">हजेरी क्र.: <b className="text-orange-700 font-black text-[10px]">{rollNo}</b></span>
                    </div>

                    <div className="border-b border-amber-200 pb-0.5 font-bold text-slate-900 truncate">
                      शाळेचे नाव: <span className="font-black text-slate-950">{schoolData.schoolName || "जिल्हा परिषद शाळा धोंडेवाडी(पेढ)ता.तासगाव जि.सांगली"}</span>
                    </div>

                    <div className="border-b border-amber-200 pb-0.5 font-bold text-slate-900 truncate">
                      विद्यार्थ्याचे नाव: <span className="font-black text-blue-900 text-[10px]">{student.name || student.fullName || "-"}</span>
                    </div>

                    <div className="grid grid-cols-12 gap-1 border-b border-amber-200 pb-0.5">
                      <div className="col-span-6 font-bold text-slate-800">जन्म दिनांक: <b className="text-slate-950">{student.dob || "-"}</b></div>
                      <div className="col-span-6 font-bold text-slate-800">इयत्ता: <b className="text-slate-950">{selectedClass}</b> &nbsp;|&nbsp; तुकडी: <b className="text-slate-950">{division}</b></div>
                    </div>

                    <div className="grid grid-cols-12 gap-1 border-b border-amber-200 pb-0.5">
                      <div className="col-span-6 font-bold text-slate-800">स्टुडन्ट आयडी: <b className="text-slate-950">{student.studentId || student.id || "-"}</b></div>
                      <div className="col-span-6 font-bold text-slate-800">आधार क्रमांक: <b className="text-slate-950">{student.aadhar || "-"}</b></div>
                    </div>

                    <div className="grid grid-cols-12 gap-1 border-b border-amber-200 pb-0.5">
                      <div className="col-span-6 font-bold text-slate-800">वडिलांचे नाव: <b className="text-slate-950">{student.fatherName || "-"}</b></div>
                      <div className="col-span-6 font-bold text-slate-800">जन. रजि. नं: <b className="text-slate-950">{student.generalRegNo || "-"}</b></div>
                    </div>

                    <div className="grid grid-cols-12 gap-1 border-b border-amber-200 pb-0.5">
                      <div className="col-span-6 font-bold text-slate-800">आईचे नाव: <b className="text-slate-950">{student.motherName || "-"}</b></div>
                      <div className="col-span-6 font-bold text-slate-800">व्यवसाय: <b className="text-slate-950">{student.fatherOccupation || "नोकरी"}</b></div>
                    </div>

                    <div className="grid grid-cols-12 gap-1 border-b border-amber-200 pb-0.5">
                      <div className="col-span-6 font-bold text-slate-800">मातृभाषा: <b className="text-slate-950">{student.motherTongue || "मराठी"}</b></div>
                      <div className="col-span-6 font-bold text-slate-800">माध्यम: <b className="text-slate-950">मराठी</b></div>
                    </div>

                    <div className="grid grid-cols-12 gap-1 border-b border-amber-200 pb-0.5">
                      <div className="col-span-6 font-bold text-slate-800">धर्म: <b className="text-slate-950">{student.religion || "हिंदू"}</b></div>
                      <div className="col-span-6 font-bold text-slate-800">संवर्ग: <b className="text-slate-950">{student.caste || "ओपन"}</b></div>
                    </div>

                    <div className="pt-0.5 font-bold text-slate-800 truncate">
                      पत्ता: <span className="font-extrabold text-slate-950">{student.address || schoolData.address || "-"}</span>
                    </div>

                    <div className="font-bold text-slate-800">
                      संपर्क: <span className="font-extrabold text-slate-950">{student.mobile || "-"}</span>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Attendance Table & Grade Scale Table Side-by-Side */}
                  <div className="col-span-6 grid grid-cols-12 gap-2">
                    
                    {/* Attendance Table (उपस्थिती) */}
                    <div className="col-span-6 border-2 border-amber-400 rounded-xl p-1 bg-white">
                      <h4 className="text-[10px] font-black text-amber-950 text-center mb-0.5 pb-0.5 border-b border-amber-300 bg-amber-50 rounded-t-lg">
                        उपस्थिती
                      </h4>
                      <table className="w-full border-collapse border border-amber-300 text-[8px] text-center">
                        <thead>
                          <tr className="bg-amber-100 font-extrabold text-amber-950">
                            <th className="border border-amber-300 p-0.5">महिना</th>
                            <th className="border border-amber-300 p-0.5">कामाचे दिवस</th>
                            <th className="border border-amber-300 p-0.5">हजर दिवस</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthsList.map((m) => {
                            const workingDays = getWorkingDaysForMonth(m);
                            const pres = getStudentPresentDays(student, m);
                            return (
                              <tr key={m.key} className="border-b border-amber-200">
                                <td className="border border-amber-300 p-0.2 font-bold text-slate-800 bg-amber-50/40">{m.label}</td>
                                <td className="border border-amber-300 p-0.2 font-semibold text-slate-900">{workingDays}</td>
                                <td className="border border-amber-300 p-0.2 font-bold text-blue-900">{pres}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Grade Scale Reference Table (श्रेणी तक्ता) */}
                    <div className="col-span-6 border-2 border-amber-400 rounded-xl p-1 bg-white flex flex-col justify-between">
                      <div>
                        <h4 className="text-[10px] font-black text-amber-950 text-center mb-0.5 pb-0.5 border-b border-amber-300 bg-amber-50 rounded-t-lg">
                          श्रेणी तक्ता
                        </h4>
                        <table className="w-full border-collapse border border-amber-300 text-[8px] text-center font-medium">
                          <thead>
                            <tr className="bg-amber-100 font-extrabold text-amber-950">
                              <th className="border border-amber-300 p-0.5">गुणांचे वर्गीकरण</th>
                              <th className="border border-amber-300 p-0.5">श्रेणी</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-amber-200"><td className="border border-amber-300 p-0.2">91% ते 100%</td><td className="border border-amber-300 p-0.2 font-bold text-blue-800">अ-1</td></tr>
                            <tr className="border-b border-amber-200"><td className="border border-amber-300 p-0.2">81% ते 90%</td><td className="border border-amber-300 p-0.2 font-bold text-blue-800">अ-2</td></tr>
                            <tr className="border-b border-amber-200"><td className="border border-amber-300 p-0.2">71% ते 80%</td><td className="border border-amber-300 p-0.2 font-bold text-blue-800">ब-1</td></tr>
                            <tr className="border-b border-amber-200"><td className="border border-amber-300 p-0.2">61% ते 70%</td><td className="border border-amber-300 p-0.2 font-bold text-blue-800">ब-2</td></tr>
                            <tr className="border-b border-amber-200"><td className="border border-amber-300 p-0.2">51% ते 60%</td><td className="border border-amber-300 p-0.2 font-bold text-blue-800">क-1</td></tr>
                            <tr className="border-b border-amber-200"><td className="border border-amber-300 p-0.2">41% ते 50%</td><td className="border border-amber-300 p-0.2 font-bold text-blue-800">क-2</td></tr>
                            <tr className="border-b border-amber-200"><td className="border border-amber-300 p-0.2">33% ते 40%</td><td className="border border-amber-300 p-0.2 font-bold text-blue-800">ड</td></tr>
                            <tr className="border-b border-amber-200"><td className="border border-amber-300 p-0.2">21% ते 32%</td><td className="border border-amber-300 p-0.2 font-bold text-blue-800">इ-1</td></tr>
                            <tr><td className="border border-amber-300 p-0.2">20% व त्यापेक्षा कमी</td><td className="border border-amber-300 p-0.2 font-bold text-blue-800">इ-2</td></tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Reopening Date Box */}
                      <div className="border-t border-amber-300 pt-0.5 text-[8px] font-bold text-slate-800 bg-amber-50/50 p-1 rounded-b-lg">
                        <p>शाळा भरण्याचा दिनांक: <b className="text-amber-950 font-black">15 Jun 2026</b></p>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Promotions & Health Bar Line */}
                <div className="flex items-center justify-between border-t-2 border-amber-400 pt-1 mt-1 text-[9.5px] font-bold text-slate-900">
                  <div>
                    पुढील वर्षाची इयत्ता: <span className="font-black text-emerald-800 text-[10px]">{nextClass}</span>
                  </div>
                  <div>
                    आरोग्य विषयक माहिती &nbsp;|&nbsp; वजन: <b className="text-blue-900 font-black">{student.weight || "28"} किलो</b> &nbsp;|&nbsp; उंची: <b className="text-blue-900 font-black">{student.height || "134"} सेमी</b>
                  </div>
                </div>
              </div>

              {/* Signatures Footer Line */}
              <div className="flex items-center justify-between border-t-2 border-amber-400 pt-1 mt-1 text-[10px] font-bold text-slate-900">
                <div className="text-center w-36">
                  <p className="font-black text-slate-950">{schoolData.teacherName || "वर्गशिक्षक"}</p>
                  <p className="text-[8px] text-slate-500 font-bold mt-0.5">वर्गशिक्षक</p>
                </div>
                <div className="text-center w-36">
                  <p className="font-black text-slate-950">{schoolData.headmasterName || "मुख्याध्यापक"}</p>
                  <p className="text-[8px] text-slate-500 font-bold mt-0.5">मुख्याध्यापक</p>
                </div>
                <div className="text-center w-36">
                  <p className="font-black text-slate-950">पालक स्वाक्षरी</p>
                  <p className="text-[8px] text-slate-500 font-bold mt-0.5">पालक स्वाक्षरी</p>
                </div>
              </div>
            </div>
          );

          // Page 2 Card Content (Side-by-Side 2-Column Term Layout for 100% Fit)
          const renderPage2Content = () => (
            <div className="w-[282mm] h-[190mm] bg-white border-2 border-amber-500 rounded-2xl p-4 flex flex-col justify-between select-none text-slate-900 shadow-sm">
              <div>
                {/* Top Banner Header across full width */}
                <div className="flex items-center justify-between border-b-2 border-amber-400 pb-1.5 mb-2 font-bold text-[10px] text-slate-900">
                  <div>
                    विद्यार्थ्याचे नाव: <span className="font-black text-blue-900 text-[11px]">{student.name || student.fullName || "-"}</span>
                  </div>
                  <div className="flex gap-4">
                    <span>इयत्ता: <b className="text-slate-950">{selectedClass}</b></span>
                    <span>तुकडी: <b className="text-slate-950">{division}</b></span>
                    <span>हजेरी क्र.: <b className="text-orange-700 font-black text-[10.5px]">{rollNo}</b></span>
                  </div>
                </div>

                {/* Evaluation Columns Side-by-Side: Left (First Term), Right (Second Term) */}
                <div className="grid grid-cols-12 gap-3">
                  
                  {/* FIRST TERM (प्रथम सत्र) */}
                  <div className="col-span-6 border-2 border-amber-400 rounded-xl p-2 bg-white flex flex-col justify-between shadow-2xs">
                    <div>
                      <h4 className="text-[11px] font-black text-amber-950 text-center mb-1.5 pb-1 border-b border-amber-300 bg-amber-50 rounded-t-lg">
                        प्रथम सत्र
                      </h4>

                      {/* Subject Grades Table */}
                      <table className="w-full border-collapse border border-amber-300 text-[8.5px] text-center font-medium mb-2">
                        <thead>
                          <tr className="bg-amber-100 font-extrabold text-amber-950">
                            <th className="border border-amber-300 p-1 text-left w-[72%]">विषय</th>
                            <th className="border border-amber-300 p-1 w-[28%]">श्रेणी</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjects.map((subName) => (
                            <tr key={subName} className="border-b border-amber-200">
                              <td className="border border-amber-300 p-1 text-left font-bold text-slate-900 bg-amber-50/20">{subName}</td>
                              <td className="border border-amber-300 p-1 font-black text-blue-900 text-[9.5px]">{getSubjectGradeForTerm(student, subName, "sem1")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Descriptive Remarks */}
                      <div className="space-y-1 border border-amber-300 rounded-lg p-1.5 bg-amber-50/30 text-[8.5px]">
                        <h5 className="font-extrabold text-amber-950 text-center border-b border-amber-300 pb-0.5 bg-amber-100 rounded mb-1 py-0.5 text-[9px]">
                          वर्णनात्मक नोंदी
                        </h5>
                        <div>
                          <span className="font-extrabold text-amber-950 block text-[9px]">विशेष प्रगती:</span>
                          <p className="text-slate-900 leading-tight font-medium bg-white p-1 rounded border border-amber-200 min-h-[26px] text-[8px]">
                            {getFormattedRemark(student, "विशेष प्रगती", "sem1")}
                          </p>
                        </div>
                        <div>
                          <span className="font-extrabold text-amber-950 block text-[9px]">आवड / छंद:</span>
                          <p className="text-slate-900 leading-tight font-medium bg-white p-1 rounded border border-amber-200 min-h-[26px] text-[8px]">
                            {getFormattedRemark(student, "आवड / छंद", "sem1")}
                          </p>
                        </div>
                        <div>
                          <span className="font-extrabold text-amber-950 block text-[9px]">सुधारणा आवश्यक:</span>
                          <p className="text-slate-900 leading-tight font-medium bg-white p-1 rounded border border-amber-200 min-h-[26px] text-[8px]">
                            {getFormattedRemark(student, "सुधारणा आवश्यक", "sem1")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECOND TERM (द्वितीय सत्र) */}
                  <div className="col-span-6 border-2 border-amber-400 rounded-xl p-2 bg-white flex flex-col justify-between shadow-2xs">
                    <div>
                      <h4 className="text-[11px] font-black text-amber-950 text-center mb-1.5 pb-1 border-b border-amber-300 bg-amber-50 rounded-t-lg">
                        द्वितीय सत्र
                      </h4>

                      {/* Subject Grades Table */}
                      <table className="w-full border-collapse border border-amber-300 text-[8.5px] text-center font-medium mb-2">
                        <thead>
                          <tr className="bg-amber-100 font-extrabold text-amber-950">
                            <th className="border border-amber-300 p-1 text-left w-[72%]">विषय</th>
                            <th className="border border-amber-300 p-1 w-[28%]">श्रेणी</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjects.map((subName) => (
                            <tr key={subName} className="border-b border-amber-200">
                              <td className="border border-amber-300 p-1 text-left font-bold text-slate-900 bg-amber-50/20">{subName}</td>
                              <td className="border border-amber-300 p-1 font-black text-blue-900 text-[9.5px]">{getSubjectGradeForTerm(student, subName, "sem2")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Descriptive Remarks */}
                      <div className="space-y-1 border border-amber-300 rounded-lg p-1.5 bg-amber-50/30 text-[8.5px]">
                        <h5 className="font-extrabold text-amber-950 text-center border-b border-amber-300 pb-0.5 bg-amber-100 rounded mb-1 py-0.5 text-[9px]">
                          वर्णनात्मक नोंदी
                        </h5>
                        <div>
                          <span className="font-extrabold text-amber-950 block text-[9px]">विशेष प्रगती:</span>
                          <p className="text-slate-900 leading-tight font-medium bg-white p-1 rounded border border-amber-200 min-h-[26px] text-[8px]">
                            {getFormattedRemark(student, "विशेष प्रगती", "sem2")}
                          </p>
                        </div>
                        <div>
                          <span className="font-extrabold text-amber-950 block text-[9px]">आवड / छंद:</span>
                          <p className="text-slate-900 leading-tight font-medium bg-white p-1 rounded border border-amber-200 min-h-[26px] text-[8px]">
                            {getFormattedRemark(student, "आवड / छंद", "sem2")}
                          </p>
                        </div>
                        <div>
                          <span className="font-extrabold text-amber-950 block text-[9px]">सुधारणा आवश्यक:</span>
                          <p className="text-slate-900 leading-tight font-medium bg-white p-1 rounded border border-amber-200 min-h-[26px] text-[8px]">
                            {getFormattedRemark(student, "सुधारणा आवश्यक", "sem2")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Signatures Footer Line */}
              <div className="flex items-center justify-between border-t-2 border-amber-400 pt-1.5 mt-2 text-[10px] font-bold text-slate-900">
                <div className="text-center w-36">
                  <p className="font-black text-slate-950">{schoolData.teacherName || "वर्गशिक्षक"}</p>
                  <p className="text-[8px] text-slate-500 font-bold mt-0.5">वर्गशिक्षक</p>
                </div>
                <div className="text-center w-36">
                  <p className="font-black text-slate-950">{schoolData.headmasterName || "मुख्याध्यापक"}</p>
                  <p className="text-[8px] text-slate-500 font-bold mt-0.5">मुख्याध्यापक</p>
                </div>
                <div className="text-center w-36">
                  <p className="font-black text-slate-950">पालक स्वाक्षरी</p>
                  <p className="text-[8px] text-slate-500 font-bold mt-0.5">पालक स्वाक्षरी</p>
                </div>
              </div>
            </div>
          );

          // Dedicated Upright A4 Portrait Page 1 Content (Fits 100% inside 210mm x 297mm)
          const renderPortraitPage1Content = () => (
            <div className="w-[198mm] h-[282mm] bg-white border-2 border-amber-500 rounded-2xl p-4 flex flex-col justify-between select-none text-slate-900 shadow-sm mx-auto">
              <div>
                {/* Top Banner Header */}
                <div className="flex items-center justify-between border-b-2 border-amber-400 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex gap-0.5">
                        <span className="w-3 h-3 rounded-xs bg-blue-600 block"></span>
                        <span className="w-3 h-3 rounded-xs bg-amber-500 block"></span>
                      </div>
                      <div className="flex gap-0.5">
                        <span className="w-3 h-3 rounded-xs bg-emerald-600 block"></span>
                        <span className="w-3 h-3 rounded-xs bg-rose-600 block"></span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-blue-900 tracking-wider leading-none uppercase">समग्र शिक्षा</h3>
                      <p className="text-[8.5px] text-slate-500 font-bold leading-none mt-0.5">Samagra Shiksha</p>
                    </div>
                  </div>

                  <div className="text-center bg-amber-50 px-6 py-1.5 rounded-xl border border-amber-300">
                    <h2 className="text-base font-black text-amber-950 tracking-tight">
                      विद्यार्थी प्रगतीपत्रक सन {academicYear}
                    </h2>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div className="text-xs font-bold text-slate-800">
                      <span>यु-डायस: <b className="text-slate-950 font-black">{schoolData.udise || "27350800701"}</b></span>
                    </div>
                    <div className="w-14 h-16 border border-slate-400 rounded bg-slate-50 flex flex-col items-center justify-center text-slate-400 overflow-hidden shadow-2xs">
                      {student.photoUrl ? (
                        <img src={student.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                      ) : (
                        <User className="size-7 text-slate-300" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Student Profile Information Box (Full Width) */}
                <div className="border-2 border-amber-400 rounded-xl p-3 bg-white shadow-2xs text-[10.5px] leading-relaxed space-y-1.5 mb-4">
                  <div className="flex justify-between border-b border-amber-200 pb-1">
                    <span className="font-black text-amber-950 text-xs">हजेरी क्र.: <b className="text-orange-700 font-black text-sm">{rollNo}</b></span>
                    <span className="font-bold text-slate-700">स्टुडन्ट आयडी: <b className="text-slate-950 font-mono">{student.studentId || student.id || "-"}</b></span>
                  </div>

                  <div className="border-b border-amber-200 pb-1 font-bold text-slate-900">
                    शाळेचे नाव: <span className="font-black text-slate-950">{schoolData.schoolName || "जिल्हा परिषद शाळा धोंडेवाडी(पेढ)ता.तासगाव जि.सांगली"}</span>
                  </div>

                  <div className="border-b border-amber-200 pb-1 font-bold text-slate-900">
                    विद्यार्थ्याचे नाव: <span className="font-black text-blue-900 text-xs">{student.name || student.fullName || "-"}</span>
                  </div>

                  <div className="grid grid-cols-12 gap-2 border-b border-amber-200 pb-1">
                    <div className="col-span-6 font-bold text-slate-800">जन्म दिनांक: <b className="text-slate-950">{student.dob || "-"}</b></div>
                    <div className="col-span-6 font-bold text-slate-800">इयत्ता: <b className="text-slate-950">{selectedClass}</b> &nbsp;|&nbsp; तुकडी: <b className="text-slate-950">{division}</b></div>
                  </div>

                  <div className="grid grid-cols-12 gap-2 border-b border-amber-200 pb-1">
                    <div className="col-span-6 font-bold text-slate-800">वडिलांचे नाव: <b className="text-slate-950">{student.fatherName || "-"}</b></div>
                    <div className="col-span-6 font-bold text-slate-800">जन. रजि. नं: <b className="text-slate-950">{student.generalRegNo || "-"}</b></div>
                  </div>

                  <div className="grid grid-cols-12 gap-2 border-b border-amber-200 pb-1">
                    <div className="col-span-6 font-bold text-slate-800">आईचे नाव: <b className="text-slate-950">{student.motherName || "-"}</b></div>
                    <div className="col-span-6 font-bold text-slate-800">आधार क्रमांक: <b className="text-slate-950 font-mono">{student.aadhar || "-"}</b></div>
                  </div>

                  <div className="grid grid-cols-12 gap-2 border-b border-amber-200 pb-1">
                    <div className="col-span-6 font-bold text-slate-800">मातृभाषा: <b className="text-slate-950">{student.motherTongue || "मराठी"}</b></div>
                    <div className="col-span-6 font-bold text-slate-800">माध्यम: <b className="text-slate-950">मराठी</b></div>
                  </div>

                  <div className="grid grid-cols-12 gap-2 border-b border-amber-200 pb-1">
                    <div className="col-span-6 font-bold text-slate-800">धर्म: <b className="text-slate-950">{student.religion || "हिंदू"}</b></div>
                    <div className="col-span-6 font-bold text-slate-800">संवर्ग: <b className="text-slate-950">{student.caste || "ओपन"}</b></div>
                  </div>

                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-8 font-bold text-slate-800 truncate">पत्ता: <span className="font-extrabold text-slate-950">{student.address || schoolData.address || "-"}</span></div>
                    <div className="col-span-4 font-bold text-slate-800">संपर्क: <span className="font-extrabold text-slate-950">{student.mobile || "-"}</span></div>
                  </div>
                </div>

                {/* Attendance Table (Full Width) */}
                <div className="border-2 border-amber-400 rounded-xl p-2 bg-white mb-4 shadow-2xs">
                  <h4 className="text-xs font-black text-amber-950 text-center mb-1 pb-0.5 border-b border-amber-300 bg-amber-50 rounded-t-lg">
                    उपस्थिती पत्रक
                  </h4>
                  <table className="w-full border-collapse border border-amber-300 text-[9.5px] text-center">
                    <thead>
                      <tr className="bg-amber-100 font-extrabold text-amber-950">
                        <th className="border border-amber-300 p-1 text-left">तपशील</th>
                        {monthsList.map((m) => (
                          <th key={m.key} className="border border-amber-300 p-1 text-center">{m.label}</th>
                        ))}
                        <th className="border border-amber-300 p-1 text-center bg-amber-200">एकूण</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-amber-200">
                        <td className="border border-amber-300 p-1 font-bold text-slate-800 bg-amber-50/40 text-left">कामाचे दिवस</td>
                        {monthsList.map((m) => (
                          <td key={m.key} className="border border-amber-300 p-1 font-semibold text-slate-900">{getWorkingDaysForMonth(m)}</td>
                        ))}
                        <td className="border border-amber-300 p-1 font-black text-slate-950 bg-amber-50">
                          {monthsList.reduce((acc, m) => acc + getWorkingDaysForMonth(m), 0)}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-amber-300 p-1 font-bold text-slate-800 bg-amber-50/40 text-left">हजर दिवस</td>
                        {monthsList.map((m) => (
                          <td key={m.key} className="border border-amber-300 p-1 font-bold text-blue-900">{getStudentPresentDays(student, m)}</td>
                        ))}
                        <td className="border border-amber-300 p-1 font-black text-blue-900 bg-amber-50">
                          {monthsList.reduce((acc, m) => acc + getStudentPresentDays(student, m), 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Grade Scale Reference & Reopening Side-by-Side */}
                <div className="grid grid-cols-12 gap-3 mb-2">
                  <div className="col-span-7 border-2 border-amber-400 rounded-xl p-2 bg-white shadow-2xs">
                    <h4 className="text-[10.5px] font-black text-amber-950 text-center mb-1 pb-0.5 border-b border-amber-300 bg-amber-50 rounded-t-lg">
                      श्रेणी तक्ता (Grade Scale)
                    </h4>
                    <table className="w-full border-collapse border border-amber-300 text-[9px] text-center font-medium">
                      <thead>
                        <tr className="bg-amber-100 font-extrabold text-amber-950">
                          <th className="border border-amber-300 p-0.5">गुणांचे वर्गीकरण</th>
                          <th className="border border-amber-300 p-0.5">श्रेणी</th>
                          <th className="border border-amber-300 p-0.5">गुणांचे वर्गीकरण</th>
                          <th className="border border-amber-300 p-0.5">श्रेणी</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-amber-200">
                          <td className="border border-amber-300 p-0.5">91% ते 100%</td>
                          <td className="border border-amber-300 p-0.5 font-bold text-blue-800">अ-1</td>
                          <td className="border border-amber-300 p-0.5">51% ते 60%</td>
                          <td className="border border-amber-300 p-0.5 font-bold text-blue-800">क-1</td>
                        </tr>
                        <tr className="border-b border-amber-200">
                          <td className="border border-amber-300 p-0.5">81% ते 90%</td>
                          <td className="border border-amber-300 p-0.5 font-bold text-blue-800">अ-2</td>
                          <td className="border border-amber-300 p-0.5">41% ते 50%</td>
                          <td className="border border-amber-300 p-0.5 font-bold text-blue-800">क-2</td>
                        </tr>
                        <tr className="border-b border-amber-200">
                          <td className="border border-amber-300 p-0.5">71% ते 80%</td>
                          <td className="border border-amber-300 p-0.5 font-bold text-blue-800">ब-1</td>
                          <td className="border border-amber-300 p-0.5">33% ते 40%</td>
                          <td className="border border-amber-300 p-0.5 font-bold text-blue-800">ड</td>
                        </tr>
                        <tr>
                          <td className="border border-amber-300 p-0.5">61% ते 70%</td>
                          <td className="border border-amber-300 p-0.5 font-bold text-blue-800">ब-2</td>
                          <td className="border border-amber-300 p-0.5">20% किंवा कमी</td>
                          <td className="border border-amber-300 p-0.5 font-bold text-blue-800">इ-1/इ-2</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="col-span-5 border-2 border-amber-400 rounded-xl p-2 bg-white flex flex-col justify-between shadow-2xs">
                    <div>
                      <h4 className="text-[10.5px] font-black text-amber-950 text-center mb-1 pb-0.5 border-b border-amber-300 bg-amber-50 rounded-t-lg">
                        प्रगती व शाळा प्रवेश
                      </h4>
                      <div className="p-2 space-y-2 text-[10px] font-bold text-slate-800">
                        <p className="bg-emerald-50 border border-emerald-300 p-2 rounded-lg text-emerald-950 text-center">
                          विद्यार्थी पुढील इयत्ता <b className="text-sm font-black text-blue-900">{nextClass}</b> मध्ये प्रवेश पात्र ठरला आहे.
                        </p>
                        <p className="bg-amber-50 border border-amber-200 p-2 rounded-lg text-center text-amber-950">
                          नवीन शैक्षणिक वर्षात शाळा भरण्याचा दिनांक: <b className="font-black text-slate-950">15 Jun 2026</b>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Signatures Footer Line */}
              <div className="flex items-center justify-between border-t-2 border-amber-400 pt-2 text-xs font-bold text-slate-900">
                <div className="text-center w-40">
                  <p className="font-black text-slate-950">{schoolData.teacherName || "वर्गशिक्षक"}</p>
                  <p className="text-[9px] text-slate-500 font-bold mt-0.5">वर्गशिक्षक</p>
                </div>
                <div className="text-center w-40">
                  <p className="font-black text-slate-950">{schoolData.headmasterName || "मुख्याध्यापक"}</p>
                  <p className="text-[9px] text-slate-500 font-bold mt-0.5">मुख्याध्यापक</p>
                </div>
                <div className="text-center w-40">
                  <p className="font-black text-slate-950">पालक स्वाक्षरी</p>
                  <p className="text-[9px] text-slate-500 font-bold mt-0.5">पालक स्वाक्षरी</p>
                </div>
              </div>
            </div>
          );

          // Dedicated Upright A4 Portrait Page 2 Content (Fits 100% inside 210mm x 297mm)
          const renderPortraitPage2Content = () => (
            <div className="w-[198mm] h-[282mm] bg-white border-2 border-amber-500 rounded-2xl p-4 flex flex-col justify-between select-none text-slate-900 shadow-sm mx-auto">
              <div>
                {/* Top Banner Header across full width */}
                <div className="flex items-center justify-between border-b-2 border-amber-400 pb-2 mb-3 font-bold text-xs text-slate-900">
                  <div>
                    विद्यार्थ्याचे नाव: <span className="font-black text-blue-900 text-sm">{student.name || student.fullName || "-"}</span>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <span>इयत्ता: <b className="text-slate-950">{selectedClass}</b></span>
                    <span>तुकडी: <b className="text-slate-950">{division}</b></span>
                    <span>हजेरी क्र.: <b className="text-orange-700 font-black text-sm">{rollNo}</b></span>
                  </div>
                </div>

                {/* FIRST TERM (प्रथम सत्र) SECTION */}
                <div className="border-2 border-amber-400 rounded-xl p-2.5 bg-white mb-3 shadow-2xs">
                  <h4 className="text-xs font-black text-amber-950 text-center mb-2 pb-1 border-b border-amber-300 bg-amber-50 rounded-t-lg">
                    प्रथम सत्र मूल्यमापन (First Term Evaluation)
                  </h4>

                  {/* Subject Grades Table */}
                  <table className="w-full border-collapse border border-amber-300 text-[10px] text-center font-medium mb-2">
                    <thead>
                      <tr className="bg-amber-100 font-extrabold text-amber-950">
                        <th className="border border-amber-300 p-1 text-left w-[70%]">विषय</th>
                        <th className="border border-amber-300 p-1 w-[30%]">श्रेणी (Grade)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map((subName) => (
                        <tr key={subName} className="border-b border-amber-200">
                          <td className="border border-amber-300 p-1 text-left font-bold text-slate-900 bg-amber-50/20">{subName}</td>
                          <td className="border border-amber-300 p-1 font-black text-blue-900 text-xs">{getSubjectGradeForTerm(student, subName, "sem1")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Descriptive Remarks */}
                  <div className="space-y-1.5 border border-amber-300 rounded-lg p-2 bg-amber-50/30 text-[9.5px]">
                    <h5 className="font-extrabold text-amber-950 text-center border-b border-amber-300 pb-0.5 bg-amber-100 rounded mb-1 py-0.5 text-xs">
                      वर्णनात्मक नोंदी (Descriptive Remarks)
                    </h5>
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-4">
                        <span className="font-extrabold text-amber-950 block text-[10px]">विशेष प्रगती:</span>
                        <p className="text-slate-900 leading-snug font-medium bg-white p-1.5 rounded border border-amber-200 min-h-[36px] text-[9px]">
                          {getFormattedRemark(student, "विशेष प्रगती", "sem1")}
                        </p>
                      </div>
                      <div className="col-span-4">
                        <span className="font-extrabold text-amber-950 block text-[10px]">आवड / छंद:</span>
                        <p className="text-slate-900 leading-snug font-medium bg-white p-1.5 rounded border border-amber-200 min-h-[36px] text-[9px]">
                          {getFormattedRemark(student, "आवड / छंद", "sem1")}
                        </p>
                      </div>
                      <div className="col-span-4">
                        <span className="font-extrabold text-amber-950 block text-[10px]">सुधारणा आवश्यक:</span>
                        <p className="text-slate-900 leading-snug font-medium bg-white p-1.5 rounded border border-amber-200 min-h-[36px] text-[9px]">
                          {getFormattedRemark(student, "सुधारणा आवश्यक", "sem1")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECOND TERM (द्वितीय सत्र) SECTION */}
                <div className="border-2 border-amber-400 rounded-xl p-2.5 bg-white mb-2 shadow-2xs">
                  <h4 className="text-xs font-black text-amber-950 text-center mb-2 pb-1 border-b border-amber-300 bg-amber-50 rounded-t-lg">
                    द्वितीय सत्र मूल्यमापन (Second Term Evaluation)
                  </h4>

                  {/* Subject Grades Table */}
                  <table className="w-full border-collapse border border-amber-300 text-[10px] text-center font-medium mb-2">
                    <thead>
                      <tr className="bg-amber-100 font-extrabold text-amber-950">
                        <th className="border border-amber-300 p-1 text-left w-[70%]">विषय</th>
                        <th className="border border-amber-300 p-1 w-[30%]">श्रेणी (Grade)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map((subName) => (
                        <tr key={subName} className="border-b border-amber-200">
                          <td className="border border-amber-300 p-1 text-left font-bold text-slate-900 bg-amber-50/20">{subName}</td>
                          <td className="border border-amber-300 p-1 font-black text-blue-900 text-xs">{getSubjectGradeForTerm(student, subName, "sem2")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Descriptive Remarks */}
                  <div className="space-y-1.5 border border-amber-300 rounded-lg p-2 bg-amber-50/30 text-[9.5px]">
                    <h5 className="font-extrabold text-amber-950 text-center border-b border-amber-300 pb-0.5 bg-amber-100 rounded mb-1 py-0.5 text-xs">
                      वर्णनात्मक नोंदी (Descriptive Remarks)
                    </h5>
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-4">
                        <span className="font-extrabold text-amber-950 block text-[10px]">विशेष प्रगती:</span>
                        <p className="text-slate-900 leading-snug font-medium bg-white p-1.5 rounded border border-amber-200 min-h-[36px] text-[9px]">
                          {getFormattedRemark(student, "विशेष प्रगती", "sem2")}
                        </p>
                      </div>
                      <div className="col-span-4">
                        <span className="font-extrabold text-amber-950 block text-[10px]">आवड / छंद:</span>
                        <p className="text-slate-900 leading-snug font-medium bg-white p-1.5 rounded border border-amber-200 min-h-[36px] text-[9px]">
                          {getFormattedRemark(student, "आवड / छंद", "sem2")}
                        </p>
                      </div>
                      <div className="col-span-4">
                        <span className="font-extrabold text-amber-950 block text-[10px]">सुधारणा आवश्यक:</span>
                        <p className="text-slate-900 leading-snug font-medium bg-white p-1.5 rounded border border-amber-200 min-h-[36px] text-[9px]">
                          {getFormattedRemark(student, "सुधारणा आवश्यक", "sem2")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Signatures Footer Line */}
              <div className="flex items-center justify-between border-t-2 border-amber-400 pt-2 text-xs font-bold text-slate-900">
                <div className="text-center w-40">
                  <p className="font-black text-slate-950">{schoolData.teacherName || "वर्गशिक्षक"}</p>
                  <p className="text-[9px] text-slate-500 font-bold mt-0.5">वर्गशिक्षक</p>
                </div>
                <div className="text-center w-40">
                  <p className="font-black text-slate-950">{schoolData.headmasterName || "मुख्याध्यापक"}</p>
                  <p className="text-[9px] text-slate-500 font-bold mt-0.5">मुख्याध्यापक</p>
                </div>
                <div className="text-center w-40">
                  <p className="font-black text-slate-950">पालक स्वाक्षरी</p>
                  <p className="text-[9px] text-slate-500 font-bold mt-0.5">पालक स्वाक्षरी</p>
                </div>
              </div>
            </div>
          );

          return (
            <React.Fragment key={student.id || idx}>
              {/* PAGE 1 CONTAINER */}
              {viewMode === "rotated" ? (
                /* OPTION 1: 90° Rotated A4 Portrait Frame Perfectly Centered */
                <div
                  className="pdf-page w-[210mm] max-w-[210mm] h-[297mm] max-h-[297mm] bg-white border border-slate-300 rounded-xl shadow-lg relative overflow-hidden mb-10 mx-auto"
                  style={{ pageBreakAfter: "always", breakAfter: "page" }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: "282mm",
                      height: "190mm",
                      transform: "translate(-50%, -50%) rotate(90deg) scale(0.92)",
                      transformOrigin: "center center",
                      flexShrink: 0,
                    }}
                    className="flex items-center justify-center"
                  >
                    {renderPage1Content()}
                  </div>
                </div>
              ) : (
                /* OPTION 2: Dedicated Upright A4 Portrait Layout */
                <div
                  className="pdf-page w-[210mm] max-w-[210mm] h-[297mm] max-h-[297mm] bg-white border border-slate-300 rounded-xl shadow-lg relative overflow-hidden mb-10 mx-auto flex items-center justify-center p-2.5"
                  style={{ pageBreakAfter: "always", breakAfter: "page" }}
                >
                  {renderPortraitPage1Content()}
                </div>
              )}

              {/* PAGE 2 CONTAINER */}
              {viewMode === "rotated" ? (
                /* OPTION 1: 90° Rotated A4 Portrait Frame Perfectly Centered */
                <div
                  className="pdf-page w-[210mm] max-w-[210mm] h-[297mm] max-h-[297mm] bg-white border border-slate-300 rounded-xl shadow-lg relative overflow-hidden mb-10 mx-auto"
                  style={{ pageBreakAfter: "always", breakAfter: "page" }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: "282mm",
                      height: "190mm",
                      transform: "translate(-50%, -50%) rotate(90deg) scale(0.92)",
                      transformOrigin: "center center",
                      flexShrink: 0,
                    }}
                    className="flex items-center justify-center"
                  >
                    {renderPage2Content()}
                  </div>
                </div>
              ) : (
                /* OPTION 2: Dedicated Upright A4 Portrait Layout */
                <div
                  className="pdf-page w-[210mm] max-w-[210mm] h-[297mm] max-h-[297mm] bg-white border border-slate-300 rounded-xl shadow-lg relative overflow-hidden mb-10 mx-auto flex items-center justify-center p-2.5"
                  style={{ pageBreakAfter: "always", breakAfter: "page" }}
                >
                  {renderPortraitPage2Content()}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressSheet;
