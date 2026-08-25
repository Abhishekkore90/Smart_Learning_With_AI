"use strict";
import { jsx, jsxs } from "react/jsx-runtime";
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
  "\u092A\u094D\u0930\u0925\u092E \u092D\u093E\u0937\u093E : \u092E\u0930\u093E\u0920\u0940",
  "\u0926\u094D\u0935\u093F\u0924\u0940\u092F \u092D\u093E\u0937\u093E : \u0907\u0902\u0917\u094D\u0930\u091C\u0940",
  "\u0917\u0923\u093F\u0924",
  "\u092A\u0930\u093F\u0938\u0930 \u0905\u092D\u094D\u092F\u093E\u0938",
  "\u0915\u0932\u093E",
  "\u0915\u093E\u0930\u094D\u092F\u093E\u0928\u0941\u092D\u0935",
  "\u0936\u093E\u0930\u0940\u0930\u093F\u0915 \u0936\u093F\u0915\u094D\u0937\u0923"
];
const getGrade = (percentage) => {
  if (percentage === null || percentage === void 0 || isNaN(percentage) || percentage <= 0) return "-";
  const p = Number(percentage);
  if (p >= 91) return "\u0905-1";
  if (p >= 81) return "\u0905-2";
  if (p >= 71) return "\u092C-1";
  if (p >= 61) return "\u092C-2";
  if (p >= 51) return "\u0915-1";
  if (p >= 41) return "\u0915-2";
  if (p >= 33) return "\u0921";
  if (p >= 21) return "\u0907-1";
  return "\u0907-2";
};
const getNextClassLabel = (currentClass) => {
  const map = {
    "1st": "\u0926\u0941\u0938\u0930\u0940",
    "2nd": "\u0924\u093F\u0938\u0930\u0940",
    "3rd": "\u091A\u094C\u0925\u0940",
    "4th": "\u092A\u093E\u091A\u0935\u0940",
    "5th": "\u0938\u0939\u093E\u0935\u0940",
    "6th": "\u0938\u093E\u0924\u0935\u0940",
    "7th": "\u0906\u0920\u0935\u0940",
    "8th": "\u0928\u0935\u0935\u0940",
    "9th": "\u0926\u0939\u093E\u0935\u0940",
    "10th": "\u0905\u0915\u0930\u093E\u0935\u0940"
  };
  return map[currentClass] || "\u092A\u093E\u091A\u0935\u0940";
};
const monthsList = [
  { key: "june", label: "\u091C\u0942\u0928" },
  { key: "july", label: "\u091C\u0941\u0932\u0948" },
  { key: "august", label: "\u0911\u0917\u0938\u094D\u091F" },
  { key: "september", label: "\u0938\u092A\u094D\u091F\u0947\u0902\u092C\u0930" },
  { key: "october", label: "\u0911\u0915\u094D\u091F\u094B\u092C\u0930" },
  { key: "november", label: "\u0928\u094B\u0935\u094D\u0939\u0947\u0902\u092C\u0930" },
  { key: "december", label: "\u0921\u093F\u0938\u0947\u0902\u092C\u0930" },
  { key: "january", label: "\u091C\u093E\u0928\u0947\u0935\u093E\u0930\u0940" },
  { key: "february", label: "\u092B\u0947\u092C\u094D\u0930\u0941\u0935\u093E\u0930\u0940" },
  { key: "march", label: "\u092E\u093E\u0930\u094D\u091A" },
  { key: "april", label: "\u090F\u092A\u094D\u0930\u093F\u0932" },
  { key: "may", label: "\u092E\u0947" }
];
const ProgressSheet = ({ initialClass = "1st", initialYear = "2025-26", initialTerm = "sem2", onBack }) => {
  const [selectedClass, setSelectedClass] = useState(initialClass || "1st");
  const [academicYear, setAcademicYear] = useState(initialYear || "2025-26");
  const [selectedTerm, setSelectedTerm] = useState(initialTerm || "sem2");
  const [division, setDivision] = useState("1");
  const [selectedMedium, setSelectedMedium] = useState("marathi");
  const [viewMode, setViewMode] = useState("rotated");
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
    slogan: "\u2726 \u091C\u094D\u091E\u093E\u0928, \u0938\u0902\u0938\u094D\u0915\u093E\u0930 \u0906\u0923\u093F \u092A\u094D\u0930\u0917\u0924\u0940\u0938\u093E\u0920\u0940 \u2726"
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
      try {
        let globalSettings = null;
        try {
          const cachedGen = localStorage.getItem("cce_general_school_settings");
          if (cachedGen) globalSettings = JSON.parse(cachedGen);
        } catch (e) {
        }
        if (!globalSettings) {
          try {
            const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
            globalSettings = await fetchJsonFromBunny("cce_results/general_school_settings.json");
          } catch (e) {
          }
        }
        const settingsSnap = await getDoc(doc(db, "cce_settings", docId));
        const classSettings = settingsSnap.exists() ? settingsSnap.data() : {};
        const mergedSettings = { ...globalSettings || {}, ...classSettings };
        setSchoolData({
          schoolName: mergedSettings.schoolName || globalSettings?.schoolName || "\u091C\u093F\u0932\u094D\u0939\u093E \u092A\u0930\u093F\u0937\u0926 \u0936\u093E\u0933\u093E \u0927\u094B\u0902\u0921\u0947\u0935\u093E\u0921\u0940(\u092A\u0947\u0922)\u0924\u093E.\u0924\u093E\u0938\u0917\u093E\u0935 \u091C\u093F.\u0938\u093E\u0902\u0917\u0932\u0940",
          udise: mergedSettings.udiseCode || mergedSettings.udise || globalSettings?.udiseCode || "27350800701",
          teacherName: classSettings.teacherName || globalSettings?.teacherName || "",
          headmasterName: mergedSettings.principalName || mergedSettings.headmasterName || globalSettings?.principalName || "",
          address: mergedSettings.address || globalSettings?.address || "\u092E\u0941\u0915\u094D\u0915\u093E\u092E \u0927\u094B\u0902\u0921\u0947\u0935\u093E\u0921\u0940 \u092A\u094B\u0938\u094D\u091F \u092A\u0947\u0921 \u0924\u093E\u0932\u0941\u0915\u093E \u0924\u093E\u0938\u0917\u093E\u0935 \u091C\u093F\u0932\u094D\u0939\u093E \u0938\u093E\u0902\u0917\u0932\u0940",
          slogan: mergedSettings.slogan || "\u2726 \u091C\u094D\u091E\u093E\u0928, \u0938\u0902\u0938\u094D\u0915\u093E\u0930 \u0906\u0923\u093F \u092A\u094D\u0930\u0917\u0924\u0940\u0938\u093E\u0920\u0940 \u2726"
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
      const currentTeacherId = getTeacherId();
      const currentMedium = selectedMedium || (typeof localStorage !== "undefined" ? localStorage.getItem("cce_selected_medium") : null) || "marathi";
      let loadedStudents = await fetchStudentsForClass(selectedClass, currentMedium, currentTeacherId);
      try {
        const detailsMap = /* @__PURE__ */ new Map();
        const detailsSnap = await getDocs(collection(db, "student_details"));
        detailsSnap.forEach((docSnap) => {
          detailsMap.set(docSnap.id, docSnap.data());
        });
        const photosMap = /* @__PURE__ */ new Map();
        try {
          const photoSnap = await getDocs(collection(db, "student_photos"));
          photoSnap.forEach((pDoc) => {
            const pData = pDoc.data();
            const pUrl = pData?.photoUrl || pData?.photoURL || pData?.photo || pData?.url || pData?.imageUrl;
            if (pUrl) photosMap.set(pDoc.id, pUrl);
          });
        } catch (e) {
        }
        loadedStudents = loadedStudents.map((s) => {
          const det = detailsMap.get(s.id) || {};
          const photoFromMap = photosMap.get(s.id) || photosMap.get(s.studentId) || photosMap.get(String(s.rollNo));
          let localPhoto = null;
          if (typeof localStorage !== "undefined") {
            localPhoto = localStorage.getItem(`student_photo_${s.id}`) || localStorage.getItem(`student_photo_${s.rollNo}`) || localStorage.getItem(`cce_photo_${s.id}`) || localStorage.getItem(`cce_photo_${s.rollNo}`) || localStorage.getItem("school_template_photo");
          }
          const photoUrl = s.photoUrl || s.photoURL || s.photo || s.studentPhoto || s.profilePhoto || s.avatarUrl || s.image || det.photoUrl || det.photoURL || det.photo || det.studentPhoto || det.profilePhoto || det.avatarUrl || det.image || photoFromMap || localPhoto || "";
          return {
            ...s,
            fatherName: det.fatherName || s.fatherName || s.stdFather || "",
            fatherOccupation: det.fatherOccupation || "\u0928\u094B\u0915\u0930\u0940",
            motherName: det.motherName || s.motherName || s.stdMother || "",
            motherOccupation: det.motherOccupation || "\u0918\u0930\u0915\u093E\u092E",
            dob: det.dob || s.dob || "",
            aadhar: det.aadhar || s.aadhar || "",
            generalRegNo: det.registrationNo || s.generalRegNo || "",
            motherTongue: det.motherTongue || s.motherTongue || "\u092E\u0930\u093E\u0920\u0940",
            caste: det.caste || s.caste || "\u0913\u092A\u0928",
            religion: det.religion || s.religion || "\u0939\u093F\u0902\u0926\u0942",
            address: det.address || s.address || schoolData.address || "",
            mobile: det.phone || s.mobile || "",
            studentId: det.studentId || s.studentId || s.id || "",
            height: det.height || s.height || "134",
            weight: det.weight || s.weight || "28",
            photoUrl
          };
        });
      } catch (e) {
      }
      loadedStudents.sort((a, b) => (parseInt(a.rollNo) || 0) - (parseInt(b.rollNo) || 0));
      setStudents(loadedStudents);
      try {
        const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
        const bunnyMarksSec = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_marks_second.json`);
        const bunnyMarksFirst = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_marks_first.json`);
        const marksSnapSem1 = await getDoc(doc(db, "cce_marks_v2", `${selectedClass}_${academicYear}_sem1`));
        const marksSnapSem2 = await getDoc(doc(db, "cce_marks_v2", `${selectedClass}_${academicYear}_sem2`));
        const marksSnapGen = await getDoc(doc(db, "cce_marks_v2", docId));
        const fsSem1 = marksSnapSem1.exists() ? marksSnapSem1.data().records || marksSnapSem1.data() : {};
        const fsSem2 = marksSnapSem2.exists() ? marksSnapSem2.data().records || marksSnapSem2.data() : {};
        const fsGen = marksSnapGen.exists() ? marksSnapGen.data().records || marksSnapGen.data().marksData || marksSnapGen.data() : {};
        const bunnyFirst = bunnyMarksFirst || {};
        const bunnySec = bunnyMarksSec || {};
        const mergedMarks = {};
        const allStudentKeys = /* @__PURE__ */ new Set([
          ...Object.keys(fsSem1 || {}),
          ...Object.keys(fsSem2 || {}),
          ...Object.keys(fsGen || {}),
          ...Object.keys(bunnyFirst || {}),
          ...Object.keys(bunnySec || {})
        ]);
        allStudentKeys.forEach((sId) => {
          mergedMarks[sId] = {
            ...fsGen[sId] || {},
            sem1: {
              ...fsGen[sId]?.sem1 || fsGen[sId]?.semester1 || {},
              ...bunnyFirst[sId] || {},
              ...fsSem1[sId] || {}
            },
            sem2: {
              ...fsGen[sId]?.sem2 || fsGen[sId]?.semester2 || {},
              ...bunnySec[sId] || {},
              ...fsSem2[sId] || {}
            }
          };
        });
        setMarksData(mergedMarks);
      } catch (e) {
        console.error("Error fetching marks:", e);
      }
      try {
        let mergedRemarks = {};
        const loadSemesterRemarks = async (sem) => {
          let recs = null;
          const currentTeacherId2 = getTeacherId();
          const cacheKey = `cce_remarks_cache_${selectedClass}_${academicYear}_${sem}_${selectedMedium}`;
          try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
                recs = parsed;
              }
            }
          } catch (e) {
          }
          if (!recs || Object.keys(recs).length === 0) {
            const docIds = [
              ...currentTeacherId2 ? [
                `${currentTeacherId2}_${selectedClass}_${academicYear}_${sem}_${selectedMedium}`,
                `${currentTeacherId2}_${selectedClass}_${academicYear}_${sem}`,
                `${currentTeacherId2}_${selectedClass}_${academicYear}_${sem}_marathi`
              ] : [],
              `${selectedClass}_${academicYear}_${sem}_${selectedMedium}`,
              `${selectedClass}_${academicYear}_${sem}`,
              `${selectedClass}_${academicYear}_${sem}_marathi`,
              `${selectedClass}_${academicYear}`
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
              } catch (e) {
              }
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
            } catch (e) {
            }
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
                mergedRemarks[sId][semKey] = { ...mergedRemarks[sId][semKey] || {}, ...val };
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
        try {
          const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
          const bunnyRemarks = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_remarks.json`);
          if (bunnyRemarks && typeof bunnyRemarks === "object") {
            mergeStudentRecords(bunnyRemarks, null);
          }
        } catch (e) {
        }
        setRemarksData(mergedRemarks);
      } catch (e) {
        console.error("Error fetching remarks:", e);
      }
      const attendanceMap = {};
      try {
        try {
          const wDaysSnap = await getDoc(doc(db, "cce_attendance", `${selectedClass}_${academicYear}_working_days`));
          if (wDaysSnap.exists()) {
            setWorkingDaysData(wDaysSnap.data().workingDays || {});
          }
        } catch (e) {
        }
        try {
          const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
          const bunnyAtt = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_attendance.json`);
          const attSnap = await getDoc(doc(db, "cce_attendance", `${selectedClass}_${academicYear}_attendance`));
          const attFsData = attSnap.exists() ? attSnap.data().attendanceData || attSnap.data() : {};
          if (attFsData && typeof attFsData === "object") {
            Object.keys(attFsData).forEach((stdId) => {
              if (!attendanceMap[stdId]) attendanceMap[stdId] = {};
              Object.assign(attendanceMap[stdId], attFsData[stdId]);
            });
          }
          if (bunnyAtt && typeof bunnyAtt === "object") {
            Object.keys(bunnyAtt).forEach((stdId) => {
              if (!attendanceMap[stdId]) attendanceMap[stdId] = {};
              Object.assign(attendanceMap[stdId], bunnyAtt[stdId]);
            });
          }
        } catch (e) {
        }
        const monthKeys = ["june", "july", "august", "september", "october", "november", "december", "january", "february", "march", "april", "may"];
        for (const mKey of monthKeys) {
          try {
            const mSnap = await getDoc(doc(db, "cce_attendance", `${selectedClass}_${academicYear}_${mKey}`));
            if (mSnap.exists()) {
              const records = mSnap.data().records || {};
              Object.keys(records).forEach((stdId) => {
                const stdRecords = records[stdId] || {};
                let presentCount = 0;
                if (typeof stdRecords === "object" && stdRecords !== null) {
                  Object.values(stdRecords).forEach((status) => {
                    if (status === "P" || status === "present" || status === "1" || status === 1) {
                      presentCount++;
                    }
                  });
                } else if (typeof stdRecords === "number") {
                  presentCount = stdRecords;
                }
                if (!attendanceMap[stdId]) attendanceMap[stdId] = {};
                attendanceMap[stdId][mKey] = presentCount;
              });
            }
          } catch (e) {
          }
        }
        try {
          const monthlySnap = await getDoc(doc(db, "cce_attendance", `${selectedClass}_${academicYear}_monthly`));
          if (monthlySnap.exists()) {
            const monthlyRecords = monthlySnap.data().records || {};
            Object.keys(monthlyRecords).forEach((stdId) => {
              if (!attendanceMap[stdId]) attendanceMap[stdId] = {};
              const stdMonths = monthlyRecords[stdId] || {};
              Object.keys(stdMonths).forEach((mK) => {
                const val = stdMonths[mK];
                if (val !== void 0 && val !== null) {
                  attendanceMap[stdId][mK.toLowerCase()] = Number(val);
                }
              });
            });
          }
        } catch (e) {
        }
        setAttendanceData(attendanceMap);
      } catch (e) {
        console.error("Error fetching attendance data:", e);
      }
    } catch (err) {
      console.error("Error loading ProgressSheet data:", err);
    }
    setLoading(false);
  };
  const handlePrint = () => {
    window.print();
  };
  const getFormattedRemark = (student, labelOrKey, term = "sem1") => {
    if (!student || !remarksData) return "";
    const stdKeys = [student.id, student.rollNo, String(student.rollNo), student.name, student.fullName, student.studentId];
    let aliases = [labelOrKey.toLowerCase()];
    if (labelOrKey.includes("\u092A\u094D\u0930\u0917\u0924\u0940") || labelOrKey.includes("\u0935\u093F\u0936\u0947\u0937")) {
      aliases.push("visheshpragati", "vishesh_pragati", "visheshpragaty", "vishesh", "\u0935\u093F\u0936\u0947\u0937 \u092A\u094D\u0930\u0917\u0924\u0940", "\u0935\u093F\u0936\u0947\u0937");
    } else if (labelOrKey.includes("\u0906\u0935\u0921") || labelOrKey.includes("\u091B\u0902\u0926")) {
      aliases.push("aavad", "aavadchhand", "aawadchhand", "chhand", "aavad_chhand", "\u0906\u0935\u0921\u0940-\u0928\u093F\u0935\u0921\u0940", "\u0906\u0935\u0921", "\u091B\u0902\u0926");
    } else if (labelOrKey.includes("\u0938\u0941\u0927\u093E\u0930\u0923\u093E")) {
      aliases.push("sudharna", "sudharana", "sudharna_aavashyak", "sudharanaaavashyak", "\u0938\u0941\u0927\u093E\u0930\u0923\u093E \u0906\u0935\u0936\u094D\u092F\u0915", "\u0938\u0941\u0927\u093E\u0930\u0923\u093E");
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
          if (matchedKey && termMarks[matchedKey] !== void 0 && termMarks[matchedKey] !== null) {
            const val = termMarks[matchedKey];
            if (typeof val === "string" && val.trim().length > 0) {
              const strVal = val.trim();
              if (strVal.includes("\u0905") || strVal.includes("\u092C") || strVal.includes("\u0915") || strVal.includes("\u0921") || strVal.includes("\u0907")) {
                return strVal;
              }
              const num = Number(strVal);
              if (!isNaN(num) && num > 0) {
                return getGrade(num);
              }
            }
            if (typeof val === "object") {
              if (val.grade && typeof val.grade === "string" && val.grade.trim().length > 0) {
                return val.grade.trim();
              }
              const markKeys = ["tondiKaam", "pratyakshikPrayog", "upakramKriti", "prakalpa", "chaachaniLekhi", "swadhyayVargakarya", "itar", "sankalitTondi", "sankalitPratyakshik", "sankalitLekhi"];
              let totalObtained = 0;
              let hasValue = false;
              markKeys.forEach((mK) => {
                if (val[mK] !== void 0 && val[mK] !== null && val[mK] !== "") {
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
    if (attendanceData && attendanceData[stdId] && attendanceData[stdId][monthKey] !== void 0) {
      return attendanceData[stdId][monthKey];
    }
    const defaultWorking = {
      june: 13,
      july: 25,
      august: 23,
      september: 21,
      october: 12,
      november: 23,
      december: 26,
      january: 24,
      february: 22,
      march: 21,
      april: 24,
      may: 0
    };
    return defaultWorking[monthKey] || 22;
  };
  const getWorkingDaysForMonth = (month) => {
    const defaultWorking = {
      june: 13,
      july: 25,
      august: 23,
      september: 21,
      october: 12,
      november: 23,
      december: 26,
      january: 24,
      february: 22,
      march: 21,
      april: 24,
      may: 0
    };
    return defaultWorking[month.key] || 22;
  };
  if (loading) {
    return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-3xl border border-slate-200 shadow-sm", children: [
      /* @__PURE__ */ jsx(Loader2, { className: "size-10 text-orange-600 animate-spin" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm font-bold text-slate-600", children: "\u0935\u093F\u0926\u094D\u092F\u093E\u0930\u094D\u0925\u0940 \u092A\u094D\u0930\u0917\u0924\u0940 \u092A\u0924\u094D\u0930\u0915 \u0932\u094B\u0921 \u0939\u094B\u0924 \u0906\u0939\u0947, \u0915\u0943\u092A\u092F\u093E \u0935\u093E\u091F \u092A\u093E\u0939\u093E..." })
    ] });
  }
  const containerMaxWidth = viewMode === "landscape" ? "max-w-[295mm]" : "max-w-[215mm]";
  return /* @__PURE__ */ jsxs("div", { className: "w-full bg-slate-100 min-h-screen p-4 md:p-6 text-slate-800 font-sans", children: [
    /* @__PURE__ */ jsxs("div", { className: `${containerMaxWidth} mx-auto flex flex-wrap items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 no-print gap-3 transition-all`, children: [
      /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: onBack,
          className: "flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition-all cursor-pointer",
          children: [
            /* @__PURE__ */ jsx(ArrowLeft, { className: "size-4" }),
            "\u092E\u093E\u0917\u0947 \u091C\u093E (Back)"
          ]
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
        /* @__PURE__ */ jsx("h1", { className: "text-base sm:text-lg font-black text-amber-900 tracking-tight", children: "\u0935\u093F\u0926\u094D\u092F\u093E\u0930\u094D\u0925\u0940 \u092A\u094D\u0930\u0917\u0924\u0940 \u092A\u0924\u094D\u0930\u0915 (Progress Sheet)" }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 font-medium", children: [
          "\u0907\u092F\u0924\u094D\u0924\u093E ",
          selectedClass,
          " | \u0936\u0948\u0915\u094D\u0937\u0923\u093F\u0915 \u0935\u0930\u094D\u0937 ",
          academicYear
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setSelectedTerm("sem1"),
            className: `px-3 py-1.5 rounded-lg transition-all cursor-pointer ${selectedTerm === "sem1" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`,
            children: /* @__PURE__ */ jsx("span", { children: "\u{1F4D8} \u092A\u094D\u0930\u0925\u092E \u0938\u0924\u094D\u0930" })
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setSelectedTerm("sem2"),
            className: `px-3 py-1.5 rounded-lg transition-all cursor-pointer ${selectedTerm === "sem2" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`,
            children: /* @__PURE__ */ jsx("span", { children: "\u{1F4D9} \u0926\u094D\u0935\u093F\u0924\u0940\u092F \u0938\u0924\u094D\u0930" })
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200", children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setViewMode("rotated"),
            className: `flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${viewMode === "rotated" ? "bg-amber-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`,
            title: "90\xB0 \u092B\u093F\u0930\u093E\u0935\u0932\u0947\u0932\u0940 \u0926\u093F\u0936\u093E (Rotated 90\xB0 View)",
            children: [
              /* @__PURE__ */ jsx(RotateCw, { className: "size-3.5" }),
              "90\xB0 Rotated"
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setViewMode("portrait"),
            className: `flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${viewMode === "portrait" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`,
            title: "\u0909\u092D\u0940 \u0926\u093F\u0936\u093E (Upright Portrait View)",
            children: [
              /* @__PURE__ */ jsx(FileText, { className: "size-3.5" }),
              "\u0909\u092D\u0940 \u0926\u093F\u0936\u093E (Portrait)"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: handlePrint,
            className: "flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm",
            children: [
              /* @__PURE__ */ jsx(Printer, { className: "size-4" }),
              "\u092A\u094D\u0930\u093F\u0902\u091F \u0915\u0930\u093E"
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: handleDownloadPdf,
            disabled: downloading,
            className: "flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50",
            children: [
              downloading ? /* @__PURE__ */ jsx(Loader2, { className: "size-4 animate-spin" }) : /* @__PURE__ */ jsx(Download, { className: "size-4" }),
              "PDF \u0921\u093E\u0909\u0928\u0932\u094B\u0921"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { ref: printRef, className: `w-full ${containerMaxWidth} mx-auto space-y-12 p-2 transition-all`, children: [
      /* @__PURE__ */ jsx("style", { children: `
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
        ` }),
      students.map((student, idx) => {
        const rollNo = student.rollNo || idx + 1;
        const nextClass = getNextClassLabel(selectedClass);
        const renderPage1Content = () => /* @__PURE__ */ jsxs("div", { className: "w-[282mm] h-[190mm] bg-white border-2 border-amber-500 rounded-2xl p-3.5 flex flex-col justify-between select-none text-slate-900 shadow-sm", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-b-2 border-amber-400 pb-1 mb-2", children: [
              /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-0.5", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex gap-0.5", children: [
                    /* @__PURE__ */ jsx("span", { className: "w-2.5 h-2.5 rounded-xs bg-blue-600 block" }),
                    /* @__PURE__ */ jsx("span", { className: "w-2.5 h-2.5 rounded-xs bg-amber-500 block" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "flex gap-0.5", children: [
                    /* @__PURE__ */ jsx("span", { className: "w-2.5 h-2.5 rounded-xs bg-emerald-600 block" }),
                    /* @__PURE__ */ jsx("span", { className: "w-2.5 h-2.5 rounded-xs bg-rose-600 block" })
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("h3", { className: "text-[12px] font-black text-blue-900 tracking-wider leading-none uppercase", children: "\u0938\u092E\u0917\u094D\u0930 \u0936\u093F\u0915\u094D\u0937\u093E" }),
                  /* @__PURE__ */ jsx("p", { className: "text-[7.5px] text-slate-500 font-bold leading-none mt-0.5", children: "Samagra Shiksha" })
                ] })
              ] }) }),
              /* @__PURE__ */ jsx("div", { className: "text-center bg-amber-50 px-6 py-1 rounded-xl border border-amber-300", children: /* @__PURE__ */ jsxs("h2", { className: "text-sm font-black text-amber-950 tracking-tight", children: [
                "\u0935\u093F\u0926\u094D\u092F\u093E\u0930\u094D\u0925\u0940 \u092A\u094D\u0930\u0917\u0924\u0940\u092A\u0924\u094D\u0930\u0915 \u0938\u0928 ",
                academicYear
              ] }) }),
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 text-right", children: [
                /* @__PURE__ */ jsx("div", { className: "text-[10px] font-bold text-slate-800", children: /* @__PURE__ */ jsxs("span", { children: [
                  "\u092F\u0941-\u0921\u093E\u092F\u0938: ",
                  /* @__PURE__ */ jsx("b", { className: "text-slate-950 font-black", children: schoolData.udise || "27350800701" })
                ] }) }),
                /* @__PURE__ */ jsx("div", { className: "w-12 h-14 border border-slate-400 rounded bg-slate-50 flex flex-col items-center justify-center text-slate-400 overflow-hidden shadow-2xs", children: student.photoUrl ? /* @__PURE__ */ jsx("img", { src: student.photoUrl, alt: "Photo", className: "w-full h-full object-cover" }) : /* @__PURE__ */ jsx(User, { className: "size-6 text-slate-300" }) })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 gap-3", children: [
              /* @__PURE__ */ jsxs("div", { className: "col-span-6 border-2 border-amber-400 rounded-xl p-2 bg-white shadow-2xs text-[9px] leading-tight space-y-1", children: [
                /* @__PURE__ */ jsx("div", { className: "flex justify-between border-b border-amber-200 pb-0.5", children: /* @__PURE__ */ jsxs("span", { className: "font-black text-amber-950", children: [
                  "\u0939\u091C\u0947\u0930\u0940 \u0915\u094D\u0930.: ",
                  /* @__PURE__ */ jsx("b", { className: "text-orange-700 font-black text-[10px]", children: rollNo })
                ] }) }),
                /* @__PURE__ */ jsxs("div", { className: "border-b border-amber-200 pb-0.5 font-bold text-slate-900 truncate", children: [
                  "\u0936\u093E\u0933\u0947\u091A\u0947 \u0928\u093E\u0935: ",
                  /* @__PURE__ */ jsx("span", { className: "font-black text-slate-950", children: schoolData.schoolName || "\u091C\u093F\u0932\u094D\u0939\u093E \u092A\u0930\u093F\u0937\u0926 \u0936\u093E\u0933\u093E \u0927\u094B\u0902\u0921\u0947\u0935\u093E\u0921\u0940(\u092A\u0947\u0922)\u0924\u093E.\u0924\u093E\u0938\u0917\u093E\u0935 \u091C\u093F.\u0938\u093E\u0902\u0917\u0932\u0940" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "border-b border-amber-200 pb-0.5 font-bold text-slate-900 truncate", children: [
                  "\u0935\u093F\u0926\u094D\u092F\u093E\u0930\u094D\u0925\u094D\u092F\u093E\u091A\u0947 \u0928\u093E\u0935: ",
                  /* @__PURE__ */ jsx("span", { className: "font-black text-blue-900 text-[10px]", children: student.name || student.fullName || "-" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 gap-1 border-b border-amber-200 pb-0.5", children: [
                  /* @__PURE__ */ jsxs("div", { className: "col-span-6 font-bold text-slate-800", children: [
                    "\u091C\u0928\u094D\u092E \u0926\u093F\u0928\u093E\u0902\u0915: ",
                    /* @__PURE__ */ jsx("b", { className: "text-slate-950", children: student.dob || "-" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "col-span-6 font-bold text-slate-800", children: [
                    "\u0907\u092F\u0924\u094D\u0924\u093E: ",
                    /* @__PURE__ */ jsx("b", { className: "text-slate-950", children: selectedClass }),
                    " \xA0|\xA0 \u0924\u0941\u0915\u0921\u0940: ",
                    /* @__PURE__ */ jsx("b", { className: "text-slate-950", children: division })
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 gap-1 border-b border-amber-200 pb-0.5", children: [
                  /* @__PURE__ */ jsxs("div", { className: "col-span-6 font-bold text-slate-800", children: [
                    "\u0938\u094D\u091F\u0941\u0921\u0928\u094D\u091F \u0906\u092F\u0921\u0940: ",
                    /* @__PURE__ */ jsx("b", { className: "text-slate-950", children: student.studentId || student.id || "-" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "col-span-6 font-bold text-slate-800", children: [
                    "\u0906\u0927\u093E\u0930 \u0915\u094D\u0930\u092E\u093E\u0902\u0915: ",
                    /* @__PURE__ */ jsx("b", { className: "text-slate-950", children: student.aadhar || "-" })
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 gap-1 border-b border-amber-200 pb-0.5", children: [
                  /* @__PURE__ */ jsxs("div", { className: "col-span-6 font-bold text-slate-800", children: [
                    "\u0935\u0921\u093F\u0932\u093E\u0902\u091A\u0947 \u0928\u093E\u0935: ",
                    /* @__PURE__ */ jsx("b", { className: "text-slate-950", children: student.fatherName || "-" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "col-span-6 font-bold text-slate-800", children: [
                    "\u091C\u0928. \u0930\u091C\u093F. \u0928\u0902: ",
                    /* @__PURE__ */ jsx("b", { className: "text-slate-950", children: student.generalRegNo || "-" })
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 gap-1 border-b border-amber-200 pb-0.5", children: [
                  /* @__PURE__ */ jsxs("div", { className: "col-span-6 font-bold text-slate-800", children: [
                    "\u0906\u0908\u091A\u0947 \u0928\u093E\u0935: ",
                    /* @__PURE__ */ jsx("b", { className: "text-slate-950", children: student.motherName || "-" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "col-span-6 font-bold text-slate-800", children: [
                    "\u0935\u094D\u092F\u0935\u0938\u093E\u092F: ",
                    /* @__PURE__ */ jsx("b", { className: "text-slate-950", children: student.fatherOccupation || "\u0928\u094B\u0915\u0930\u0940" })
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 gap-1 border-b border-amber-200 pb-0.5", children: [
                  /* @__PURE__ */ jsxs("div", { className: "col-span-6 font-bold text-slate-800", children: [
                    "\u092E\u093E\u0924\u0943\u092D\u093E\u0937\u093E: ",
                    /* @__PURE__ */ jsx("b", { className: "text-slate-950", children: student.motherTongue || "\u092E\u0930\u093E\u0920\u0940" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "col-span-6 font-bold text-slate-800", children: [
                    "\u092E\u093E\u0927\u094D\u092F\u092E: ",
                    /* @__PURE__ */ jsx("b", { className: "text-slate-950", children: "\u092E\u0930\u093E\u0920\u0940" })
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 gap-1 border-b border-amber-200 pb-0.5", children: [
                  /* @__PURE__ */ jsxs("div", { className: "col-span-6 font-bold text-slate-800", children: [
                    "\u0927\u0930\u094D\u092E: ",
                    /* @__PURE__ */ jsx("b", { className: "text-slate-950", children: student.religion || "\u0939\u093F\u0902\u0926\u0942" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "col-span-6 font-bold text-slate-800", children: [
                    "\u0938\u0902\u0935\u0930\u094D\u0917: ",
                    /* @__PURE__ */ jsx("b", { className: "text-slate-950", children: student.caste || "\u0913\u092A\u0928" })
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "pt-0.5 font-bold text-slate-800 truncate", children: [
                  "\u092A\u0924\u094D\u0924\u093E: ",
                  /* @__PURE__ */ jsx("span", { className: "font-extrabold text-slate-950", children: student.address || schoolData.address || "-" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "font-bold text-slate-800", children: [
                  "\u0938\u0902\u092A\u0930\u094D\u0915: ",
                  /* @__PURE__ */ jsx("span", { className: "font-extrabold text-slate-950", children: student.mobile || "-" })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "col-span-6 grid grid-cols-12 gap-2", children: [
                /* @__PURE__ */ jsxs("div", { className: "col-span-6 border-2 border-amber-400 rounded-xl p-1 bg-white", children: [
                  /* @__PURE__ */ jsx("h4", { className: "text-[10px] font-black text-amber-950 text-center mb-0.5 pb-0.5 border-b border-amber-300 bg-amber-50 rounded-t-lg", children: "\u0909\u092A\u0938\u094D\u0925\u093F\u0924\u0940" }),
                  /* @__PURE__ */ jsxs("table", { className: "w-full border-collapse border border-amber-300 text-[8px] text-center", children: [
                    /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-amber-100 font-extrabold text-amber-950", children: [
                      /* @__PURE__ */ jsx("th", { className: "border border-amber-300 p-0.5", children: "\u092E\u0939\u093F\u0928\u093E" }),
                      /* @__PURE__ */ jsx("th", { className: "border border-amber-300 p-0.5", children: "\u0915\u093E\u092E\u093E\u091A\u0947 \u0926\u093F\u0935\u0938" }),
                      /* @__PURE__ */ jsx("th", { className: "border border-amber-300 p-0.5", children: "\u0939\u091C\u0930 \u0926\u093F\u0935\u0938" })
                    ] }) }),
                    /* @__PURE__ */ jsx("tbody", { children: monthsList.map((m) => {
                      const workingDays = getWorkingDaysForMonth(m);
                      const pres = getStudentPresentDays(student, m);
                      return /* @__PURE__ */ jsxs("tr", { className: "border-b border-amber-200", children: [
                        /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.2 font-bold text-slate-800 bg-amber-50/40", children: m.label }),
                        /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.2 font-semibold text-slate-900", children: workingDays }),
                        /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.2 font-bold text-blue-900", children: pres })
                      ] }, m.key);
                    }) })
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "col-span-6 border-2 border-amber-400 rounded-xl p-1 bg-white flex flex-col justify-between", children: [
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("h4", { className: "text-[10px] font-black text-amber-950 text-center mb-0.5 pb-0.5 border-b border-amber-300 bg-amber-50 rounded-t-lg", children: "\u0936\u094D\u0930\u0947\u0923\u0940 \u0924\u0915\u094D\u0924\u093E" }),
                    /* @__PURE__ */ jsxs("table", { className: "w-full border-collapse border border-amber-300 text-[8px] text-center font-medium", children: [
                      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-amber-100 font-extrabold text-amber-950", children: [
                        /* @__PURE__ */ jsx("th", { className: "border border-amber-300 p-0.5", children: "\u0917\u0941\u0923\u093E\u0902\u091A\u0947 \u0935\u0930\u094D\u0917\u0940\u0915\u0930\u0923" }),
                        /* @__PURE__ */ jsx("th", { className: "border border-amber-300 p-0.5", children: "\u0936\u094D\u0930\u0947\u0923\u0940" })
                      ] }) }),
                      /* @__PURE__ */ jsxs("tbody", { children: [
                        /* @__PURE__ */ jsxs("tr", { className: "border-b border-amber-200", children: [
                          /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.2", children: "91% \u0924\u0947 100%" }),
                          /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.2 font-bold text-blue-800", children: "\u0905-1" })
                        ] }),
                        /* @__PURE__ */ jsxs("tr", { className: "border-b border-amber-200", children: [
                          /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.2", children: "81% \u0924\u0947 90%" }),
                          /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.2 font-bold text-blue-800", children: "\u0905-2" })
                        ] }),
                        /* @__PURE__ */ jsxs("tr", { className: "border-b border-amber-200", children: [
                          /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.2", children: "71% \u0924\u0947 80%" }),
                          /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.2 font-bold text-blue-800", children: "\u092C-1" })
                        ] }),
                        /* @__PURE__ */ jsxs("tr", { className: "border-b border-amber-200", children: [
                          /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.2", children: "61% \u0924\u0947 70%" }),
                          /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.2 font-bold text-blue-800", children: "\u092C-2" })
                        ] }),
                        /* @__PURE__ */ jsxs("tr", { className: "border-b border-amber-200", children: [
                          /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.2", children: "51% \u0924\u0947 60%" }),
                          /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.2 font-bold text-blue-800", children: "\u0915-1" })
                        ] }),
                        /* @__PURE__ */ jsxs("tr", { className: "border-b border-amber-200", children: [
                          /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.2", children: "41% \u0924\u0947 50%" }),
                          /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.2 font-bold text-blue-800", children: "\u0915-2" })
                        ] }),
                        /* @__PURE__ */ jsxs("tr", { className: "border-b border-amber-200", children: [
                          /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.2", children: "33% \u0924\u0947 40%" }),
                          /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.2 font-bold text-blue-800", children: "\u0921" })
                        ] }),
                        /* @__PURE__ */ jsxs("tr", { className: "border-b border-amber-200", children: [
                          /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.2", children: "21% \u0924\u0947 32%" }),
                          /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.2 font-bold text-blue-800", children: "\u0907-1" })
                        ] }),
                        /* @__PURE__ */ jsxs("tr", { children: [
                          /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.2", children: "20% \u0935 \u0924\u094D\u092F\u093E\u092A\u0947\u0915\u094D\u0937\u093E \u0915\u092E\u0940" }),
                          /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.2 font-bold text-blue-800", children: "\u0907-2" })
                        ] })
                      ] })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsx("div", { className: "border-t border-amber-300 pt-0.5 text-[8px] font-bold text-slate-800 bg-amber-50/50 p-1 rounded-b-lg", children: /* @__PURE__ */ jsxs("p", { children: [
                    "\u0936\u093E\u0933\u093E \u092D\u0930\u0923\u094D\u092F\u093E\u091A\u093E \u0926\u093F\u0928\u093E\u0902\u0915: ",
                    /* @__PURE__ */ jsx("b", { className: "text-amber-950 font-black", children: "15 Jun 2026" })
                  ] }) })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-t-2 border-amber-400 pt-1 mt-1 text-[9.5px] font-bold text-slate-900", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                "\u092A\u0941\u0922\u0940\u0932 \u0935\u0930\u094D\u0937\u093E\u091A\u0940 \u0907\u092F\u0924\u094D\u0924\u093E: ",
                /* @__PURE__ */ jsx("span", { className: "font-black text-emerald-800 text-[10px]", children: nextClass })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                "\u0906\u0930\u094B\u0917\u094D\u092F \u0935\u093F\u0937\u092F\u0915 \u092E\u093E\u0939\u093F\u0924\u0940 \xA0|\xA0 \u0935\u091C\u0928: ",
                /* @__PURE__ */ jsxs("b", { className: "text-blue-900 font-black", children: [
                  student.weight || "28",
                  " \u0915\u093F\u0932\u094B"
                ] }),
                " \xA0|\xA0 \u0909\u0902\u091A\u0940: ",
                /* @__PURE__ */ jsxs("b", { className: "text-blue-900 font-black", children: [
                  student.height || "134",
                  " \u0938\u0947\u092E\u0940"
                ] })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-t-2 border-amber-400 pt-1 mt-1 text-[10px] font-bold text-slate-900", children: [
            /* @__PURE__ */ jsxs("div", { className: "text-center w-36", children: [
              /* @__PURE__ */ jsx("p", { className: "font-black text-slate-950", children: schoolData.teacherName || "\u0935\u0930\u094D\u0917\u0936\u093F\u0915\u094D\u0937\u0915" }),
              /* @__PURE__ */ jsx("p", { className: "text-[8px] text-slate-500 font-bold mt-0.5", children: "\u0935\u0930\u094D\u0917\u0936\u093F\u0915\u094D\u0937\u0915" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "text-center w-36", children: [
              /* @__PURE__ */ jsx("p", { className: "font-black text-slate-950", children: schoolData.headmasterName || "\u092E\u0941\u0916\u094D\u092F\u093E\u0927\u094D\u092F\u093E\u092A\u0915" }),
              /* @__PURE__ */ jsx("p", { className: "text-[8px] text-slate-500 font-bold mt-0.5", children: "\u092E\u0941\u0916\u094D\u092F\u093E\u0927\u094D\u092F\u093E\u092A\u0915" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "text-center w-36", children: [
              /* @__PURE__ */ jsx("p", { className: "font-black text-slate-950", children: "\u092A\u093E\u0932\u0915 \u0938\u094D\u0935\u093E\u0915\u094D\u0937\u0930\u0940" }),
              /* @__PURE__ */ jsx("p", { className: "text-[8px] text-slate-500 font-bold mt-0.5", children: "\u092A\u093E\u0932\u0915 \u0938\u094D\u0935\u093E\u0915\u094D\u0937\u0930\u0940" })
            ] })
          ] })
        ] });
        const renderPage2Content = () => /* @__PURE__ */ jsxs("div", { className: "w-[282mm] h-[190mm] bg-white border-2 border-amber-500 rounded-2xl p-4 flex flex-col justify-between select-none text-slate-900 shadow-sm", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-b-2 border-amber-400 pb-1.5 mb-2 font-bold text-[10px] text-slate-900", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                "\u0935\u093F\u0926\u094D\u092F\u093E\u0930\u094D\u0925\u094D\u092F\u093E\u091A\u0947 \u0928\u093E\u0935: ",
                /* @__PURE__ */ jsx("span", { className: "font-black text-blue-900 text-[11px]", children: student.name || student.fullName || "-" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex gap-4", children: [
                /* @__PURE__ */ jsxs("span", { children: [
                  "\u0907\u092F\u0924\u094D\u0924\u093E: ",
                  /* @__PURE__ */ jsx("b", { className: "text-slate-950", children: selectedClass })
                ] }),
                /* @__PURE__ */ jsxs("span", { children: [
                  "\u0924\u0941\u0915\u0921\u0940: ",
                  /* @__PURE__ */ jsx("b", { className: "text-slate-950", children: division })
                ] }),
                /* @__PURE__ */ jsxs("span", { children: [
                  "\u0939\u091C\u0947\u0930\u0940 \u0915\u094D\u0930.: ",
                  /* @__PURE__ */ jsx("b", { className: "text-orange-700 font-black text-[10.5px]", children: rollNo })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 gap-3", children: [
              /* @__PURE__ */ jsx("div", { className: "col-span-6 border-2 border-amber-400 rounded-xl p-2 bg-white flex flex-col justify-between shadow-2xs", children: /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("h4", { className: "text-[11px] font-black text-amber-950 text-center mb-1.5 pb-1 border-b border-amber-300 bg-amber-50 rounded-t-lg", children: "\u092A\u094D\u0930\u0925\u092E \u0938\u0924\u094D\u0930" }),
                /* @__PURE__ */ jsxs("table", { className: "w-full border-collapse border border-amber-300 text-[8.5px] text-center font-medium mb-2", children: [
                  /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-amber-100 font-extrabold text-amber-950", children: [
                    /* @__PURE__ */ jsx("th", { className: "border border-amber-300 p-1 text-left w-[72%]", children: "\u0935\u093F\u0937\u092F" }),
                    /* @__PURE__ */ jsx("th", { className: "border border-amber-300 p-1 w-[28%]", children: "\u0936\u094D\u0930\u0947\u0923\u0940" })
                  ] }) }),
                  /* @__PURE__ */ jsx("tbody", { children: subjects.map((subName) => /* @__PURE__ */ jsxs("tr", { className: "border-b border-amber-200", children: [
                    /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-1 text-left font-bold text-slate-900 bg-amber-50/20", children: subName }),
                    /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-1 font-black text-blue-900 text-[9.5px]", children: getSubjectGradeForTerm(student, subName, "sem1") })
                  ] }, subName)) })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-1 border border-amber-300 rounded-lg p-1.5 bg-amber-50/30 text-[8.5px]", children: [
                  /* @__PURE__ */ jsx("h5", { className: "font-extrabold text-amber-950 text-center border-b border-amber-300 pb-0.5 bg-amber-100 rounded mb-1 py-0.5 text-[9px]", children: "\u0935\u0930\u094D\u0923\u0928\u093E\u0924\u094D\u092E\u0915 \u0928\u094B\u0902\u0926\u0940" }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("span", { className: "font-extrabold text-amber-950 block text-[9px]", children: "\u0935\u093F\u0936\u0947\u0937 \u092A\u094D\u0930\u0917\u0924\u0940:" }),
                    /* @__PURE__ */ jsx("p", { className: "text-slate-900 leading-tight font-medium bg-white p-1 rounded border border-amber-200 min-h-[26px] text-[8px]", children: getFormattedRemark(student, "\u0935\u093F\u0936\u0947\u0937 \u092A\u094D\u0930\u0917\u0924\u0940", "sem1") })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("span", { className: "font-extrabold text-amber-950 block text-[9px]", children: "\u0906\u0935\u0921 / \u091B\u0902\u0926:" }),
                    /* @__PURE__ */ jsx("p", { className: "text-slate-900 leading-tight font-medium bg-white p-1 rounded border border-amber-200 min-h-[26px] text-[8px]", children: getFormattedRemark(student, "\u0906\u0935\u0921 / \u091B\u0902\u0926", "sem1") })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("span", { className: "font-extrabold text-amber-950 block text-[9px]", children: "\u0938\u0941\u0927\u093E\u0930\u0923\u093E \u0906\u0935\u0936\u094D\u092F\u0915:" }),
                    /* @__PURE__ */ jsx("p", { className: "text-slate-900 leading-tight font-medium bg-white p-1 rounded border border-amber-200 min-h-[26px] text-[8px]", children: getFormattedRemark(student, "\u0938\u0941\u0927\u093E\u0930\u0923\u093E \u0906\u0935\u0936\u094D\u092F\u0915", "sem1") })
                  ] })
                ] })
              ] }) }),
              /* @__PURE__ */ jsx("div", { className: "col-span-6 border-2 border-amber-400 rounded-xl p-2 bg-white flex flex-col justify-between shadow-2xs", children: /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("h4", { className: "text-[11px] font-black text-amber-950 text-center mb-1.5 pb-1 border-b border-amber-300 bg-amber-50 rounded-t-lg", children: "\u0926\u094D\u0935\u093F\u0924\u0940\u092F \u0938\u0924\u094D\u0930" }),
                /* @__PURE__ */ jsxs("table", { className: "w-full border-collapse border border-amber-300 text-[8.5px] text-center font-medium mb-2", children: [
                  /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-amber-100 font-extrabold text-amber-950", children: [
                    /* @__PURE__ */ jsx("th", { className: "border border-amber-300 p-1 text-left w-[72%]", children: "\u0935\u093F\u0937\u092F" }),
                    /* @__PURE__ */ jsx("th", { className: "border border-amber-300 p-1 w-[28%]", children: "\u0936\u094D\u0930\u0947\u0923\u0940" })
                  ] }) }),
                  /* @__PURE__ */ jsx("tbody", { children: subjects.map((subName) => /* @__PURE__ */ jsxs("tr", { className: "border-b border-amber-200", children: [
                    /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-1 text-left font-bold text-slate-900 bg-amber-50/20", children: subName }),
                    /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-1 font-black text-blue-900 text-[9.5px]", children: getSubjectGradeForTerm(student, subName, "sem2") })
                  ] }, subName)) })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-1 border border-amber-300 rounded-lg p-1.5 bg-amber-50/30 text-[8.5px]", children: [
                  /* @__PURE__ */ jsx("h5", { className: "font-extrabold text-amber-950 text-center border-b border-amber-300 pb-0.5 bg-amber-100 rounded mb-1 py-0.5 text-[9px]", children: "\u0935\u0930\u094D\u0923\u0928\u093E\u0924\u094D\u092E\u0915 \u0928\u094B\u0902\u0926\u0940" }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("span", { className: "font-extrabold text-amber-950 block text-[9px]", children: "\u0935\u093F\u0936\u0947\u0937 \u092A\u094D\u0930\u0917\u0924\u0940:" }),
                    /* @__PURE__ */ jsx("p", { className: "text-slate-900 leading-tight font-medium bg-white p-1 rounded border border-amber-200 min-h-[26px] text-[8px]", children: getFormattedRemark(student, "\u0935\u093F\u0936\u0947\u0937 \u092A\u094D\u0930\u0917\u0924\u0940", "sem2") })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("span", { className: "font-extrabold text-amber-950 block text-[9px]", children: "\u0906\u0935\u0921 / \u091B\u0902\u0926:" }),
                    /* @__PURE__ */ jsx("p", { className: "text-slate-900 leading-tight font-medium bg-white p-1 rounded border border-amber-200 min-h-[26px] text-[8px]", children: getFormattedRemark(student, "\u0906\u0935\u0921 / \u091B\u0902\u0926", "sem2") })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("span", { className: "font-extrabold text-amber-950 block text-[9px]", children: "\u0938\u0941\u0927\u093E\u0930\u0923\u093E \u0906\u0935\u0936\u094D\u092F\u0915:" }),
                    /* @__PURE__ */ jsx("p", { className: "text-slate-900 leading-tight font-medium bg-white p-1 rounded border border-amber-200 min-h-[26px] text-[8px]", children: getFormattedRemark(student, "\u0938\u0941\u0927\u093E\u0930\u0923\u093E \u0906\u0935\u0936\u094D\u092F\u0915", "sem2") })
                  ] })
                ] })
              ] }) })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-t-2 border-amber-400 pt-1.5 mt-2 text-[10px] font-bold text-slate-900", children: [
            /* @__PURE__ */ jsxs("div", { className: "text-center w-36", children: [
              /* @__PURE__ */ jsx("p", { className: "font-black text-slate-950", children: schoolData.teacherName || "\u0935\u0930\u094D\u0917\u0936\u093F\u0915\u094D\u0937\u0915" }),
              /* @__PURE__ */ jsx("p", { className: "text-[8px] text-slate-500 font-bold mt-0.5", children: "\u0935\u0930\u094D\u0917\u0936\u093F\u0915\u094D\u0937\u0915" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "text-center w-36", children: [
              /* @__PURE__ */ jsx("p", { className: "font-black text-slate-950", children: schoolData.headmasterName || "\u092E\u0941\u0916\u094D\u092F\u093E\u0927\u094D\u092F\u093E\u092A\u0915" }),
              /* @__PURE__ */ jsx("p", { className: "text-[8px] text-slate-500 font-bold mt-0.5", children: "\u092E\u0941\u0916\u094D\u092F\u093E\u0927\u094D\u092F\u093E\u092A\u0915" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "text-center w-36", children: [
              /* @__PURE__ */ jsx("p", { className: "font-black text-slate-950", children: "\u092A\u093E\u0932\u0915 \u0938\u094D\u0935\u093E\u0915\u094D\u0937\u0930\u0940" }),
              /* @__PURE__ */ jsx("p", { className: "text-[8px] text-slate-500 font-bold mt-0.5", children: "\u092A\u093E\u0932\u0915 \u0938\u094D\u0935\u093E\u0915\u094D\u0937\u0930\u0940" })
            ] })
          ] })
        ] });
        const renderPortraitPage1Content = () => /* @__PURE__ */ jsxs("div", { className: "w-[198mm] h-[282mm] bg-white border-2 border-amber-500 rounded-2xl p-4 flex flex-col justify-between select-none text-slate-900 shadow-sm mx-auto", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-b-2 border-amber-400 pb-2 mb-3", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-0.5", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex gap-0.5", children: [
                    /* @__PURE__ */ jsx("span", { className: "w-3 h-3 rounded-xs bg-blue-600 block" }),
                    /* @__PURE__ */ jsx("span", { className: "w-3 h-3 rounded-xs bg-amber-500 block" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "flex gap-0.5", children: [
                    /* @__PURE__ */ jsx("span", { className: "w-3 h-3 rounded-xs bg-emerald-600 block" }),
                    /* @__PURE__ */ jsx("span", { className: "w-3 h-3 rounded-xs bg-rose-600 block" })
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("h3", { className: "text-sm font-black text-blue-900 tracking-wider leading-none uppercase", children: "\u0938\u092E\u0917\u094D\u0930 \u0936\u093F\u0915\u094D\u0937\u093E" }),
                  /* @__PURE__ */ jsx("p", { className: "text-[8.5px] text-slate-500 font-bold leading-none mt-0.5", children: "Samagra Shiksha" })
                ] })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "text-center bg-amber-50 px-6 py-1.5 rounded-xl border border-amber-300", children: /* @__PURE__ */ jsxs("h2", { className: "text-base font-black text-amber-950 tracking-tight", children: [
                "\u0935\u093F\u0926\u094D\u092F\u093E\u0930\u094D\u0925\u0940 \u092A\u094D\u0930\u0917\u0924\u0940\u092A\u0924\u094D\u0930\u0915 \u0938\u0928 ",
                academicYear
              ] }) }),
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 text-right", children: [
                /* @__PURE__ */ jsx("div", { className: "text-xs font-bold text-slate-800", children: /* @__PURE__ */ jsxs("span", { children: [
                  "\u092F\u0941-\u0921\u093E\u092F\u0938: ",
                  /* @__PURE__ */ jsx("b", { className: "text-slate-950 font-black", children: schoolData.udise || "27350800701" })
                ] }) }),
                /* @__PURE__ */ jsx("div", { className: "w-14 h-16 border border-slate-400 rounded bg-slate-50 flex flex-col items-center justify-center text-slate-400 overflow-hidden shadow-2xs", children: student.photoUrl ? /* @__PURE__ */ jsx("img", { src: student.photoUrl, alt: "Photo", className: "w-full h-full object-cover" }) : /* @__PURE__ */ jsx(User, { className: "size-7 text-slate-300" }) })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "border-2 border-amber-400 rounded-xl p-3 bg-white shadow-2xs text-[10.5px] leading-relaxed space-y-1.5 mb-4", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between border-b border-amber-200 pb-1", children: [
                /* @__PURE__ */ jsxs("span", { className: "font-black text-amber-950 text-xs", children: [
                  "\u0939\u091C\u0947\u0930\u0940 \u0915\u094D\u0930.: ",
                  /* @__PURE__ */ jsx("b", { className: "text-orange-700 font-black text-sm", children: rollNo })
                ] }),
                /* @__PURE__ */ jsxs("span", { className: "font-bold text-slate-700", children: [
                  "\u0938\u094D\u091F\u0941\u0921\u0928\u094D\u091F \u0906\u092F\u0921\u0940: ",
                  /* @__PURE__ */ jsx("b", { className: "text-slate-950 font-mono", children: student.studentId || student.id || "-" })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "border-b border-amber-200 pb-1 font-bold text-slate-900", children: [
                "\u0936\u093E\u0933\u0947\u091A\u0947 \u0928\u093E\u0935: ",
                /* @__PURE__ */ jsx("span", { className: "font-black text-slate-950", children: schoolData.schoolName || "\u091C\u093F\u0932\u094D\u0939\u093E \u092A\u0930\u093F\u0937\u0926 \u0936\u093E\u0933\u093E \u0927\u094B\u0902\u0921\u0947\u0935\u093E\u0921\u0940(\u092A\u0947\u0922)\u0924\u093E.\u0924\u093E\u0938\u0917\u093E\u0935 \u091C\u093F.\u0938\u093E\u0902\u0917\u0932\u0940" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "border-b border-amber-200 pb-1 font-bold text-slate-900", children: [
                "\u0935\u093F\u0926\u094D\u092F\u093E\u0930\u094D\u0925\u094D\u092F\u093E\u091A\u0947 \u0928\u093E\u0935: ",
                /* @__PURE__ */ jsx("span", { className: "font-black text-blue-900 text-xs", children: student.name || student.fullName || "-" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 gap-2 border-b border-amber-200 pb-1", children: [
                /* @__PURE__ */ jsxs("div", { className: "col-span-6 font-bold text-slate-800", children: [
                  "\u091C\u0928\u094D\u092E \u0926\u093F\u0928\u093E\u0902\u0915: ",
                  /* @__PURE__ */ jsx("b", { className: "text-slate-950", children: student.dob || "-" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "col-span-6 font-bold text-slate-800", children: [
                  "\u0907\u092F\u0924\u094D\u0924\u093E: ",
                  /* @__PURE__ */ jsx("b", { className: "text-slate-950", children: selectedClass }),
                  " \xA0|\xA0 \u0924\u0941\u0915\u0921\u0940: ",
                  /* @__PURE__ */ jsx("b", { className: "text-slate-950", children: division })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 gap-2 border-b border-amber-200 pb-1", children: [
                /* @__PURE__ */ jsxs("div", { className: "col-span-6 font-bold text-slate-800", children: [
                  "\u0935\u0921\u093F\u0932\u093E\u0902\u091A\u0947 \u0928\u093E\u0935: ",
                  /* @__PURE__ */ jsx("b", { className: "text-slate-950", children: student.fatherName || "-" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "col-span-6 font-bold text-slate-800", children: [
                  "\u091C\u0928. \u0930\u091C\u093F. \u0928\u0902: ",
                  /* @__PURE__ */ jsx("b", { className: "text-slate-950", children: student.generalRegNo || "-" })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 gap-2 border-b border-amber-200 pb-1", children: [
                /* @__PURE__ */ jsxs("div", { className: "col-span-6 font-bold text-slate-800", children: [
                  "\u0906\u0908\u091A\u0947 \u0928\u093E\u0935: ",
                  /* @__PURE__ */ jsx("b", { className: "text-slate-950", children: student.motherName || "-" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "col-span-6 font-bold text-slate-800", children: [
                  "\u0906\u0927\u093E\u0930 \u0915\u094D\u0930\u092E\u093E\u0902\u0915: ",
                  /* @__PURE__ */ jsx("b", { className: "text-slate-950 font-mono", children: student.aadhar || "-" })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 gap-2 border-b border-amber-200 pb-1", children: [
                /* @__PURE__ */ jsxs("div", { className: "col-span-6 font-bold text-slate-800", children: [
                  "\u092E\u093E\u0924\u0943\u092D\u093E\u0937\u093E: ",
                  /* @__PURE__ */ jsx("b", { className: "text-slate-950", children: student.motherTongue || "\u092E\u0930\u093E\u0920\u0940" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "col-span-6 font-bold text-slate-800", children: [
                  "\u092E\u093E\u0927\u094D\u092F\u092E: ",
                  /* @__PURE__ */ jsx("b", { className: "text-slate-950", children: "\u092E\u0930\u093E\u0920\u0940" })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 gap-2 border-b border-amber-200 pb-1", children: [
                /* @__PURE__ */ jsxs("div", { className: "col-span-6 font-bold text-slate-800", children: [
                  "\u0927\u0930\u094D\u092E: ",
                  /* @__PURE__ */ jsx("b", { className: "text-slate-950", children: student.religion || "\u0939\u093F\u0902\u0926\u0942" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "col-span-6 font-bold text-slate-800", children: [
                  "\u0938\u0902\u0935\u0930\u094D\u0917: ",
                  /* @__PURE__ */ jsx("b", { className: "text-slate-950", children: student.caste || "\u0913\u092A\u0928" })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 gap-2", children: [
                /* @__PURE__ */ jsxs("div", { className: "col-span-8 font-bold text-slate-800 truncate", children: [
                  "\u092A\u0924\u094D\u0924\u093E: ",
                  /* @__PURE__ */ jsx("span", { className: "font-extrabold text-slate-950", children: student.address || schoolData.address || "-" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "col-span-4 font-bold text-slate-800", children: [
                  "\u0938\u0902\u092A\u0930\u094D\u0915: ",
                  /* @__PURE__ */ jsx("span", { className: "font-extrabold text-slate-950", children: student.mobile || "-" })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "border-2 border-amber-400 rounded-xl p-2 bg-white mb-4 shadow-2xs", children: [
              /* @__PURE__ */ jsx("h4", { className: "text-xs font-black text-amber-950 text-center mb-1 pb-0.5 border-b border-amber-300 bg-amber-50 rounded-t-lg", children: "\u0909\u092A\u0938\u094D\u0925\u093F\u0924\u0940 \u092A\u0924\u094D\u0930\u0915" }),
              /* @__PURE__ */ jsxs("table", { className: "w-full border-collapse border border-amber-300 text-[9.5px] text-center", children: [
                /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-amber-100 font-extrabold text-amber-950", children: [
                  /* @__PURE__ */ jsx("th", { className: "border border-amber-300 p-1 text-left", children: "\u0924\u092A\u0936\u0940\u0932" }),
                  monthsList.map((m) => /* @__PURE__ */ jsx("th", { className: "border border-amber-300 p-1 text-center", children: m.label }, m.key)),
                  /* @__PURE__ */ jsx("th", { className: "border border-amber-300 p-1 text-center bg-amber-200", children: "\u090F\u0915\u0942\u0923" })
                ] }) }),
                /* @__PURE__ */ jsxs("tbody", { children: [
                  /* @__PURE__ */ jsxs("tr", { className: "border-b border-amber-200", children: [
                    /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-1 font-bold text-slate-800 bg-amber-50/40 text-left", children: "\u0915\u093E\u092E\u093E\u091A\u0947 \u0926\u093F\u0935\u0938" }),
                    monthsList.map((m) => /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-1 font-semibold text-slate-900", children: getWorkingDaysForMonth(m) }, m.key)),
                    /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-1 font-black text-slate-950 bg-amber-50", children: monthsList.reduce((acc, m) => acc + getWorkingDaysForMonth(m), 0) })
                  ] }),
                  /* @__PURE__ */ jsxs("tr", { children: [
                    /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-1 font-bold text-slate-800 bg-amber-50/40 text-left", children: "\u0939\u091C\u0930 \u0926\u093F\u0935\u0938" }),
                    monthsList.map((m) => /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-1 font-bold text-blue-900", children: getStudentPresentDays(student, m) }, m.key)),
                    /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-1 font-black text-blue-900 bg-amber-50", children: monthsList.reduce((acc, m) => acc + getStudentPresentDays(student, m), 0) })
                  ] })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 gap-3 mb-2", children: [
              /* @__PURE__ */ jsxs("div", { className: "col-span-7 border-2 border-amber-400 rounded-xl p-2 bg-white shadow-2xs", children: [
                /* @__PURE__ */ jsx("h4", { className: "text-[10.5px] font-black text-amber-950 text-center mb-1 pb-0.5 border-b border-amber-300 bg-amber-50 rounded-t-lg", children: "\u0936\u094D\u0930\u0947\u0923\u0940 \u0924\u0915\u094D\u0924\u093E (Grade Scale)" }),
                /* @__PURE__ */ jsxs("table", { className: "w-full border-collapse border border-amber-300 text-[9px] text-center font-medium", children: [
                  /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-amber-100 font-extrabold text-amber-950", children: [
                    /* @__PURE__ */ jsx("th", { className: "border border-amber-300 p-0.5", children: "\u0917\u0941\u0923\u093E\u0902\u091A\u0947 \u0935\u0930\u094D\u0917\u0940\u0915\u0930\u0923" }),
                    /* @__PURE__ */ jsx("th", { className: "border border-amber-300 p-0.5", children: "\u0936\u094D\u0930\u0947\u0923\u0940" }),
                    /* @__PURE__ */ jsx("th", { className: "border border-amber-300 p-0.5", children: "\u0917\u0941\u0923\u093E\u0902\u091A\u0947 \u0935\u0930\u094D\u0917\u0940\u0915\u0930\u0923" }),
                    /* @__PURE__ */ jsx("th", { className: "border border-amber-300 p-0.5", children: "\u0936\u094D\u0930\u0947\u0923\u0940" })
                  ] }) }),
                  /* @__PURE__ */ jsxs("tbody", { children: [
                    /* @__PURE__ */ jsxs("tr", { className: "border-b border-amber-200", children: [
                      /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.5", children: "91% \u0924\u0947 100%" }),
                      /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.5 font-bold text-blue-800", children: "\u0905-1" }),
                      /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.5", children: "51% \u0924\u0947 60%" }),
                      /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.5 font-bold text-blue-800", children: "\u0915-1" })
                    ] }),
                    /* @__PURE__ */ jsxs("tr", { className: "border-b border-amber-200", children: [
                      /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.5", children: "81% \u0924\u0947 90%" }),
                      /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.5 font-bold text-blue-800", children: "\u0905-2" }),
                      /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.5", children: "41% \u0924\u0947 50%" }),
                      /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.5 font-bold text-blue-800", children: "\u0915-2" })
                    ] }),
                    /* @__PURE__ */ jsxs("tr", { className: "border-b border-amber-200", children: [
                      /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.5", children: "71% \u0924\u0947 80%" }),
                      /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.5 font-bold text-blue-800", children: "\u092C-1" }),
                      /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.5", children: "33% \u0924\u0947 40%" }),
                      /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.5 font-bold text-blue-800", children: "\u0921" })
                    ] }),
                    /* @__PURE__ */ jsxs("tr", { children: [
                      /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.5", children: "61% \u0924\u0947 70%" }),
                      /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.5 font-bold text-blue-800", children: "\u092C-2" }),
                      /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.5", children: "20% \u0915\u093F\u0902\u0935\u093E \u0915\u092E\u0940" }),
                      /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-0.5 font-bold text-blue-800", children: "\u0907-1/\u0907-2" })
                    ] })
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "col-span-5 border-2 border-amber-400 rounded-xl p-2 bg-white flex flex-col justify-between shadow-2xs", children: /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("h4", { className: "text-[10.5px] font-black text-amber-950 text-center mb-1 pb-0.5 border-b border-amber-300 bg-amber-50 rounded-t-lg", children: "\u092A\u094D\u0930\u0917\u0924\u0940 \u0935 \u0936\u093E\u0933\u093E \u092A\u094D\u0930\u0935\u0947\u0936" }),
                /* @__PURE__ */ jsxs("div", { className: "p-2 space-y-2 text-[10px] font-bold text-slate-800", children: [
                  /* @__PURE__ */ jsxs("p", { className: "bg-emerald-50 border border-emerald-300 p-2 rounded-lg text-emerald-950 text-center", children: [
                    "\u0935\u093F\u0926\u094D\u092F\u093E\u0930\u094D\u0925\u0940 \u092A\u0941\u0922\u0940\u0932 \u0907\u092F\u0924\u094D\u0924\u093E ",
                    /* @__PURE__ */ jsx("b", { className: "text-sm font-black text-blue-900", children: nextClass }),
                    " \u092E\u0927\u094D\u092F\u0947 \u092A\u094D\u0930\u0935\u0947\u0936 \u092A\u093E\u0924\u094D\u0930 \u0920\u0930\u0932\u093E \u0906\u0939\u0947."
                  ] }),
                  /* @__PURE__ */ jsxs("p", { className: "bg-amber-50 border border-amber-200 p-2 rounded-lg text-center text-amber-950", children: [
                    "\u0928\u0935\u0940\u0928 \u0936\u0948\u0915\u094D\u0937\u0923\u093F\u0915 \u0935\u0930\u094D\u0937\u093E\u0924 \u0936\u093E\u0933\u093E \u092D\u0930\u0923\u094D\u092F\u093E\u091A\u093E \u0926\u093F\u0928\u093E\u0902\u0915: ",
                    /* @__PURE__ */ jsx("b", { className: "font-black text-slate-950", children: "15 Jun 2026" })
                  ] })
                ] })
              ] }) })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-t-2 border-amber-400 pt-2 text-xs font-bold text-slate-900", children: [
            /* @__PURE__ */ jsxs("div", { className: "text-center w-40", children: [
              /* @__PURE__ */ jsx("p", { className: "font-black text-slate-950", children: schoolData.teacherName || "\u0935\u0930\u094D\u0917\u0936\u093F\u0915\u094D\u0937\u0915" }),
              /* @__PURE__ */ jsx("p", { className: "text-[9px] text-slate-500 font-bold mt-0.5", children: "\u0935\u0930\u094D\u0917\u0936\u093F\u0915\u094D\u0937\u0915" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "text-center w-40", children: [
              /* @__PURE__ */ jsx("p", { className: "font-black text-slate-950", children: schoolData.headmasterName || "\u092E\u0941\u0916\u094D\u092F\u093E\u0927\u094D\u092F\u093E\u092A\u0915" }),
              /* @__PURE__ */ jsx("p", { className: "text-[9px] text-slate-500 font-bold mt-0.5", children: "\u092E\u0941\u0916\u094D\u092F\u093E\u0927\u094D\u092F\u093E\u092A\u0915" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "text-center w-40", children: [
              /* @__PURE__ */ jsx("p", { className: "font-black text-slate-950", children: "\u092A\u093E\u0932\u0915 \u0938\u094D\u0935\u093E\u0915\u094D\u0937\u0930\u0940" }),
              /* @__PURE__ */ jsx("p", { className: "text-[9px] text-slate-500 font-bold mt-0.5", children: "\u092A\u093E\u0932\u0915 \u0938\u094D\u0935\u093E\u0915\u094D\u0937\u0930\u0940" })
            ] })
          ] })
        ] });
        const renderPortraitPage2Content = () => /* @__PURE__ */ jsxs("div", { className: "w-[198mm] h-[282mm] bg-white border-2 border-amber-500 rounded-2xl p-4 flex flex-col justify-between select-none text-slate-900 shadow-sm mx-auto", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-b-2 border-amber-400 pb-2 mb-3 font-bold text-xs text-slate-900", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                "\u0935\u093F\u0926\u094D\u092F\u093E\u0930\u094D\u0925\u094D\u092F\u093E\u091A\u0947 \u0928\u093E\u0935: ",
                /* @__PURE__ */ jsx("span", { className: "font-black text-blue-900 text-sm", children: student.name || student.fullName || "-" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex gap-4 text-xs", children: [
                /* @__PURE__ */ jsxs("span", { children: [
                  "\u0907\u092F\u0924\u094D\u0924\u093E: ",
                  /* @__PURE__ */ jsx("b", { className: "text-slate-950", children: selectedClass })
                ] }),
                /* @__PURE__ */ jsxs("span", { children: [
                  "\u0924\u0941\u0915\u0921\u0940: ",
                  /* @__PURE__ */ jsx("b", { className: "text-slate-950", children: division })
                ] }),
                /* @__PURE__ */ jsxs("span", { children: [
                  "\u0939\u091C\u0947\u0930\u0940 \u0915\u094D\u0930.: ",
                  /* @__PURE__ */ jsx("b", { className: "text-orange-700 font-black text-sm", children: rollNo })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "border-2 border-amber-400 rounded-xl p-2.5 bg-white mb-3 shadow-2xs", children: [
              /* @__PURE__ */ jsx("h4", { className: "text-xs font-black text-amber-950 text-center mb-2 pb-1 border-b border-amber-300 bg-amber-50 rounded-t-lg", children: "\u092A\u094D\u0930\u0925\u092E \u0938\u0924\u094D\u0930 \u092E\u0942\u0932\u094D\u092F\u092E\u093E\u092A\u0928 (First Term Evaluation)" }),
              /* @__PURE__ */ jsxs("table", { className: "w-full border-collapse border border-amber-300 text-[10px] text-center font-medium mb-2", children: [
                /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-amber-100 font-extrabold text-amber-950", children: [
                  /* @__PURE__ */ jsx("th", { className: "border border-amber-300 p-1 text-left w-[70%]", children: "\u0935\u093F\u0937\u092F" }),
                  /* @__PURE__ */ jsx("th", { className: "border border-amber-300 p-1 w-[30%]", children: "\u0936\u094D\u0930\u0947\u0923\u0940 (Grade)" })
                ] }) }),
                /* @__PURE__ */ jsx("tbody", { children: subjects.map((subName) => /* @__PURE__ */ jsxs("tr", { className: "border-b border-amber-200", children: [
                  /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-1 text-left font-bold text-slate-900 bg-amber-50/20", children: subName }),
                  /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-1 font-black text-blue-900 text-xs", children: getSubjectGradeForTerm(student, subName, "sem1") })
                ] }, subName)) })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "space-y-1.5 border border-amber-300 rounded-lg p-2 bg-amber-50/30 text-[9.5px]", children: [
                /* @__PURE__ */ jsx("h5", { className: "font-extrabold text-amber-950 text-center border-b border-amber-300 pb-0.5 bg-amber-100 rounded mb-1 py-0.5 text-xs", children: "\u0935\u0930\u094D\u0923\u0928\u093E\u0924\u094D\u092E\u0915 \u0928\u094B\u0902\u0926\u0940 (Descriptive Remarks)" }),
                /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 gap-2", children: [
                  /* @__PURE__ */ jsxs("div", { className: "col-span-4", children: [
                    /* @__PURE__ */ jsx("span", { className: "font-extrabold text-amber-950 block text-[10px]", children: "\u0935\u093F\u0936\u0947\u0937 \u092A\u094D\u0930\u0917\u0924\u0940:" }),
                    /* @__PURE__ */ jsx("p", { className: "text-slate-900 leading-snug font-medium bg-white p-1.5 rounded border border-amber-200 min-h-[36px] text-[9px]", children: getFormattedRemark(student, "\u0935\u093F\u0936\u0947\u0937 \u092A\u094D\u0930\u0917\u0924\u0940", "sem1") })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "col-span-4", children: [
                    /* @__PURE__ */ jsx("span", { className: "font-extrabold text-amber-950 block text-[10px]", children: "\u0906\u0935\u0921 / \u091B\u0902\u0926:" }),
                    /* @__PURE__ */ jsx("p", { className: "text-slate-900 leading-snug font-medium bg-white p-1.5 rounded border border-amber-200 min-h-[36px] text-[9px]", children: getFormattedRemark(student, "\u0906\u0935\u0921 / \u091B\u0902\u0926", "sem1") })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "col-span-4", children: [
                    /* @__PURE__ */ jsx("span", { className: "font-extrabold text-amber-950 block text-[10px]", children: "\u0938\u0941\u0927\u093E\u0930\u0923\u093E \u0906\u0935\u0936\u094D\u092F\u0915:" }),
                    /* @__PURE__ */ jsx("p", { className: "text-slate-900 leading-snug font-medium bg-white p-1.5 rounded border border-amber-200 min-h-[36px] text-[9px]", children: getFormattedRemark(student, "\u0938\u0941\u0927\u093E\u0930\u0923\u093E \u0906\u0935\u0936\u094D\u092F\u0915", "sem1") })
                  ] })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "border-2 border-amber-400 rounded-xl p-2.5 bg-white mb-2 shadow-2xs", children: [
              /* @__PURE__ */ jsx("h4", { className: "text-xs font-black text-amber-950 text-center mb-2 pb-1 border-b border-amber-300 bg-amber-50 rounded-t-lg", children: "\u0926\u094D\u0935\u093F\u0924\u0940\u092F \u0938\u0924\u094D\u0930 \u092E\u0942\u0932\u094D\u092F\u092E\u093E\u092A\u0928 (Second Term Evaluation)" }),
              /* @__PURE__ */ jsxs("table", { className: "w-full border-collapse border border-amber-300 text-[10px] text-center font-medium mb-2", children: [
                /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-amber-100 font-extrabold text-amber-950", children: [
                  /* @__PURE__ */ jsx("th", { className: "border border-amber-300 p-1 text-left w-[70%]", children: "\u0935\u093F\u0937\u092F" }),
                  /* @__PURE__ */ jsx("th", { className: "border border-amber-300 p-1 w-[30%]", children: "\u0936\u094D\u0930\u0947\u0923\u0940 (Grade)" })
                ] }) }),
                /* @__PURE__ */ jsx("tbody", { children: subjects.map((subName) => /* @__PURE__ */ jsxs("tr", { className: "border-b border-amber-200", children: [
                  /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-1 text-left font-bold text-slate-900 bg-amber-50/20", children: subName }),
                  /* @__PURE__ */ jsx("td", { className: "border border-amber-300 p-1 font-black text-blue-900 text-xs", children: getSubjectGradeForTerm(student, subName, "sem2") })
                ] }, subName)) })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "space-y-1.5 border border-amber-300 rounded-lg p-2 bg-amber-50/30 text-[9.5px]", children: [
                /* @__PURE__ */ jsx("h5", { className: "font-extrabold text-amber-950 text-center border-b border-amber-300 pb-0.5 bg-amber-100 rounded mb-1 py-0.5 text-xs", children: "\u0935\u0930\u094D\u0923\u0928\u093E\u0924\u094D\u092E\u0915 \u0928\u094B\u0902\u0926\u0940 (Descriptive Remarks)" }),
                /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 gap-2", children: [
                  /* @__PURE__ */ jsxs("div", { className: "col-span-4", children: [
                    /* @__PURE__ */ jsx("span", { className: "font-extrabold text-amber-950 block text-[10px]", children: "\u0935\u093F\u0936\u0947\u0937 \u092A\u094D\u0930\u0917\u0924\u0940:" }),
                    /* @__PURE__ */ jsx("p", { className: "text-slate-900 leading-snug font-medium bg-white p-1.5 rounded border border-amber-200 min-h-[36px] text-[9px]", children: getFormattedRemark(student, "\u0935\u093F\u0936\u0947\u0937 \u092A\u094D\u0930\u0917\u0924\u0940", "sem2") })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "col-span-4", children: [
                    /* @__PURE__ */ jsx("span", { className: "font-extrabold text-amber-950 block text-[10px]", children: "\u0906\u0935\u0921 / \u091B\u0902\u0926:" }),
                    /* @__PURE__ */ jsx("p", { className: "text-slate-900 leading-snug font-medium bg-white p-1.5 rounded border border-amber-200 min-h-[36px] text-[9px]", children: getFormattedRemark(student, "\u0906\u0935\u0921 / \u091B\u0902\u0926", "sem2") })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "col-span-4", children: [
                    /* @__PURE__ */ jsx("span", { className: "font-extrabold text-amber-950 block text-[10px]", children: "\u0938\u0941\u0927\u093E\u0930\u0923\u093E \u0906\u0935\u0936\u094D\u092F\u0915:" }),
                    /* @__PURE__ */ jsx("p", { className: "text-slate-900 leading-snug font-medium bg-white p-1.5 rounded border border-amber-200 min-h-[36px] text-[9px]", children: getFormattedRemark(student, "\u0938\u0941\u0927\u093E\u0930\u0923\u093E \u0906\u0935\u0936\u094D\u092F\u0915", "sem2") })
                  ] })
                ] })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-t-2 border-amber-400 pt-2 text-xs font-bold text-slate-900", children: [
            /* @__PURE__ */ jsxs("div", { className: "text-center w-40", children: [
              /* @__PURE__ */ jsx("p", { className: "font-black text-slate-950", children: schoolData.teacherName || "\u0935\u0930\u094D\u0917\u0936\u093F\u0915\u094D\u0937\u0915" }),
              /* @__PURE__ */ jsx("p", { className: "text-[9px] text-slate-500 font-bold mt-0.5", children: "\u0935\u0930\u094D\u0917\u0936\u093F\u0915\u094D\u0937\u0915" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "text-center w-40", children: [
              /* @__PURE__ */ jsx("p", { className: "font-black text-slate-950", children: schoolData.headmasterName || "\u092E\u0941\u0916\u094D\u092F\u093E\u0927\u094D\u092F\u093E\u092A\u0915" }),
              /* @__PURE__ */ jsx("p", { className: "text-[9px] text-slate-500 font-bold mt-0.5", children: "\u092E\u0941\u0916\u094D\u092F\u093E\u0927\u094D\u092F\u093E\u092A\u0915" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "text-center w-40", children: [
              /* @__PURE__ */ jsx("p", { className: "font-black text-slate-950", children: "\u092A\u093E\u0932\u0915 \u0938\u094D\u0935\u093E\u0915\u094D\u0937\u0930\u0940" }),
              /* @__PURE__ */ jsx("p", { className: "text-[9px] text-slate-500 font-bold mt-0.5", children: "\u092A\u093E\u0932\u0915 \u0938\u094D\u0935\u093E\u0915\u094D\u0937\u0930\u0940" })
            ] })
          ] })
        ] });
        return /* @__PURE__ */ jsxs(React.Fragment, { children: [
          viewMode === "rotated" ? (
            /* OPTION 1: 90° Rotated A4 Portrait Frame Perfectly Centered */
            /* @__PURE__ */ jsx(
              "div",
              {
                className: "pdf-page w-[210mm] max-w-[210mm] h-[297mm] max-h-[297mm] bg-white border border-slate-300 rounded-xl shadow-lg relative overflow-hidden mb-10 mx-auto",
                style: { pageBreakAfter: "always", breakAfter: "page" },
                children: /* @__PURE__ */ jsx(
                  "div",
                  {
                    style: {
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: "282mm",
                      height: "190mm",
                      transform: "translate(-50%, -50%) rotate(90deg) scale(0.92)",
                      transformOrigin: "center center",
                      flexShrink: 0
                    },
                    className: "flex items-center justify-center",
                    children: renderPage1Content()
                  }
                )
              }
            )
          ) : (
            /* OPTION 2: Dedicated Upright A4 Portrait Layout */
            /* @__PURE__ */ jsx(
              "div",
              {
                className: "pdf-page w-[210mm] max-w-[210mm] h-[297mm] max-h-[297mm] bg-white border border-slate-300 rounded-xl shadow-lg relative overflow-hidden mb-10 mx-auto flex items-center justify-center p-2.5",
                style: { pageBreakAfter: "always", breakAfter: "page" },
                children: renderPortraitPage1Content()
              }
            )
          ),
          viewMode === "rotated" ? (
            /* OPTION 1: 90° Rotated A4 Portrait Frame Perfectly Centered */
            /* @__PURE__ */ jsx(
              "div",
              {
                className: "pdf-page w-[210mm] max-w-[210mm] h-[297mm] max-h-[297mm] bg-white border border-slate-300 rounded-xl shadow-lg relative overflow-hidden mb-10 mx-auto",
                style: { pageBreakAfter: "always", breakAfter: "page" },
                children: /* @__PURE__ */ jsx(
                  "div",
                  {
                    style: {
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: "282mm",
                      height: "190mm",
                      transform: "translate(-50%, -50%) rotate(90deg) scale(0.92)",
                      transformOrigin: "center center",
                      flexShrink: 0
                    },
                    className: "flex items-center justify-center",
                    children: renderPage2Content()
                  }
                )
              }
            )
          ) : (
            /* OPTION 2: Dedicated Upright A4 Portrait Layout */
            /* @__PURE__ */ jsx(
              "div",
              {
                className: "pdf-page w-[210mm] max-w-[210mm] h-[297mm] max-h-[297mm] bg-white border border-slate-300 rounded-xl shadow-lg relative overflow-hidden mb-10 mx-auto flex items-center justify-center p-2.5",
                style: { pageBreakAfter: "always", breakAfter: "page" },
                children: renderPortraitPage2Content()
              }
            )
          )
        ] }, student.id || idx);
      })
    ] })
  ] });
};
export default ProgressSheet;
