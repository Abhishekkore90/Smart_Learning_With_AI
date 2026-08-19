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
  if (percentage >= 33) return "ड";
  if (percentage >= 21) return "इ-1";
  return "इ-2";
};

const GRADE_KEYS = ["a1", "a2", "b1", "b2", "c1", "c2", "d", "i1", "i2"];
const GRADE_LABELS = {
  a1: "अ-1",
  a2: "अ-2",
  b1: "ब-1",
  b2: "ब-2",
  c1: "क-1",
  c2: "क-2",
  d: "ड",
  i1: "इ-1",
  i2: "इ-2",
};

const getGradeKeyFromScore = (score, max = 100) => {
  const pct = (score / max) * 100;
  if (pct >= 91) return "a1";
  if (pct >= 81) return "a2";
  if (pct >= 71) return "b1";
  if (pct >= 61) return "b2";
  if (pct >= 51) return "c1";
  if (pct >= 41) return "c2";
  if (pct >= 33) return "d";
  if (pct >= 21) return "i1";
  return "i2";
};

const CASTE_CATEGORIES = [
  { key: "sc", label: "अनुसूचित जाती" },
  { key: "st", label: "अनुसूचित जमाती" },
  { key: "vjnt", label: "वि.जा.भ. जमाती" },
  { key: "obc", label: "इतर मागास" },
  { key: "open", label: "बिगर मागास" },
];

const isGirlStudent = (student) => {
  if (!student) return false;
  const g = String(student?.gender || student?.ling || student?.sex || student?.studentGender || student?.genderType || "").trim().toLowerCase();
  return (
    g.includes("girl") ||
    g.includes("female") ||
    g.includes("मुलगी") ||
    g.includes("मुली") ||
    g.includes("स्त्री") ||
    g === "f" ||
    g === "2"
  );
};

const isBoyStudent = (student) => {
  if (!student) return false;
  if (isGirlStudent(student)) return false;
  return true;
};

const getStudentCasteCategory = (student) => {
  if (!student) return null;
  const raw = String(
    student?.caste ||
    student?.category ||
    student?.jaat ||
    student?.castCategory ||
    ""
  ).trim().toLowerCase();

  if (!raw || raw === "n/a" || raw === "none" || raw === "undefined" || raw === "null") {
    return null;
  }

  const tokens = raw.split(/[\s,_\-/()]+/);

  // 1. SC (Scheduled Caste / अनुसूचित जाती)
  if (
    tokens.includes("sc") ||
    raw.includes("scheduled caste") ||
    raw.includes("अनुसूचित जाती") ||
    raw.includes("अनुसूचीत जाती") ||
    raw.includes("मातंग") ||
    raw.includes("चर्मकार") ||
    raw.includes("बौद्ध") ||
    raw.includes("महार")
  ) {
    return "sc";
  }

  // 2. ST (Scheduled Tribe / अनुसूचित जमाती)
  if (
    tokens.includes("st") ||
    raw.includes("scheduled tribe") ||
    raw.includes("अनुसूचित जमाती") ||
    raw.includes("अनुसूचीत जमाती") ||
    raw.includes("भिल्ल") ||
    raw.includes("कोळी")
  ) {
    return "st";
  }

  // 3. VJNT (विमुक्त जाती व भटक्या जमाती / VJ / NTB / NTC / NTD)
  if (
    tokens.includes("vj") ||
    tokens.includes("nt") ||
    tokens.includes("vjnt") ||
    tokens.includes("ntb") ||
    tokens.includes("ntc") ||
    tokens.includes("ntd") ||
    raw.includes("vj-a") ||
    raw.includes("nt-b") ||
    raw.includes("nt-c") ||
    raw.includes("nt-d") ||
    raw.includes("vimukta") ||
    raw.includes("nomadic") ||
    raw.includes("वि.जा") ||
    raw.includes("भ.ज") ||
    raw.includes("विजा") ||
    raw.includes("भज") ||
    raw.includes("विमुक्त") ||
    raw.includes("भटक्या") ||
    raw.includes("धनगर") ||
    raw.includes("वंजारी")
  ) {
    return "vjnt";
  }

  // 4. OBC / SBC (इतर मागास / विशेष मागास)
  if (
    tokens.includes("obc") ||
    tokens.includes("sbc") ||
    raw.includes("other backward") ||
    raw.includes("special backward") ||
    raw.includes("इतर मागास") ||
    raw.includes("विशेष मागास") ||
    raw.includes("ओबीसी") ||
    raw.includes("एसबीसी") ||
    raw.includes("माळी") ||
    raw.includes("तेली") ||
    raw.includes("कुणबी")
  ) {
    return "obc";
  }

  // 5. OPEN / General (बिगर मागास / खुला)
  if (
    tokens.includes("open") ||
    tokens.includes("general") ||
    raw.includes("बिगर मागास") ||
    raw.includes("खुला") ||
    raw.includes("सर्वसाधारण")
  ) {
    return "open";
  }

  return null;
};

const BoardResult = ({ initialClass = "1st", initialYear = "2025-26", initialTerm = "sem2", onBack }) => {
  const [selectedClass, setSelectedClass] = useState(initialClass || "1st");
  const [academicYear, setAcademicYear] = useState(initialYear || "2025-26");
  const [division, setDivision] = useState("1");
  const [pageMode, setPageMode] = useState("2pages");
  const [showLayoutModal, setShowLayoutModal] = useState(true);
  const [selectedMedium, setSelectedMedium] = useState("marathi");
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
  const [totalWorkingDays, setTotalWorkingDays] = useState(0);
  const [weightageData, setWeightageData] = useState({});
  const [selectedTerm, setSelectedTerm] = useState(initialTerm || "sem2"); // "sem1" = प्रथम सत्र | "sem2" = द्वितीय सत्र

  const printRef = useRef(null);

  useEffect(() => {
    loadUserFirestoreData(selectedTerm);
  }, [selectedClass, academicYear, selectedMedium, selectedTerm]);

  const loadUserFirestoreData = async (term = "sem2") => {
    const termSuffix = term === "sem1" ? "sem1" : "sem2";
    setLoading(true);
    try {
      const docId = `${selectedClass}_${academicYear}`;
      const currentTeacherId = getTeacherId();

      // 1. Fetch Global & Class Settings (from CCESettings / Bunny Storage / school_settings)
      try {
        let globalSettings = null;

        // Try local storage cache (teacher-specific first, then generic)
        try {
          const cachedTeacher = localStorage.getItem(`cce_general_school_settings_${currentTeacherId}`);
          const cachedGen = localStorage.getItem("cce_general_school_settings");
          const cached = cachedTeacher || cachedGen;
          if (cached) globalSettings = JSON.parse(cached);
        } catch (e) {}

        // Try Bunny Storage CDN
        if (!globalSettings) {
          try {
            const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
            globalSettings = await fetchJsonFromBunny("cce_results/general_school_settings.json");
          } catch (e) {}
        }

        // Try Firestore teacher-specific documents first, then global
        if (!globalSettings) {
          // Try ${teacherId}_general
          try {
            const teacherGenSnap = await getDoc(doc(db, "school_settings", `${currentTeacherId}_general`));
            if (teacherGenSnap.exists()) globalSettings = teacherGenSnap.data();
          } catch (e) {}
        }
        if (!globalSettings) {
          // Try ${teacherId}
          try {
            const teacherSnap = await getDoc(doc(db, "school_settings", currentTeacherId));
            if (teacherSnap.exists()) globalSettings = teacherSnap.data();
          } catch (e) {}
        }
        if (!globalSettings) {
          // Fallback: Try generic "general" doc
          const generalSnap = await getDoc(doc(db, "school_settings", "general"));
          if (generalSnap.exists()) globalSettings = generalSnap.data();
        }

        // Try Firestore class-specific document (teacher-isolated first, then generic)
        let classSettings = {};
        const classDocIdsToTry = [
          `${currentTeacherId}_${selectedClass}_${academicYear}`,
          `${currentTeacherId}_${selectedClass}_${selectedMedium}_${academicYear}`,
          `${selectedClass}_${selectedMedium}_${academicYear}`,
          docId,
        ];
        for (const cDocId of classDocIdsToTry) {
          try {
            const settingsSnap = await getDoc(doc(db, "cce_settings", cDocId));
            if (settingsSnap.exists()) {
              classSettings = settingsSnap.data();
              break;
            }
          } catch (e) {}
        }

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
      const loadedStudents = await fetchStudentsForClass(selectedClass, selectedMedium, currentTeacherId);

      // Merge student_details collection for accurate gender, caste, religion, etc.
      try {
        const detailsMap = new Map();
        const detailsSnap = await getDocs(collection(db, "student_details"));
        detailsSnap.forEach((docSnap) => {
          detailsMap.set(docSnap.id, docSnap.data());
        });

        const mergedStudents = loadedStudents.map((s) => {
          const det = detailsMap.get(s.id) || detailsMap.get(s.name) || detailsMap.get(s.fullName) || {};
          return {
            ...s,
            gender: det.gender || s.gender || s.ling || s.sex || "",
            caste: det.caste || s.caste || s.category || det.category || s.jaat || "",
            religion: det.religion || s.religion || "",
            dob: det.dob || s.dob || "",
            phone: det.phone || s.phone || s.mobile || "",
          };
        });
        setStudents(mergedStudents);
      } catch (e) {
        setStudents(loadedStudents);
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

        // Term-aware exam keys: sem1 = test1/oral1/pratyakshik1, sem2 = test2/oral2/pratyakshik2
        const examKeys = termSuffix === "sem1"
          ? ["sem1", "test1", "oral1", "pratyakshik1", "general"]
          : ["sem2", "test2", "oral2", "pratyakshik2", "general"];

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

        // Bunny CDN fallback — only for selected term
        try {
          const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
          const bunnyFiles = termSuffix === "sem1"
            ? [
                `cce_results/${selectedClass}_${academicYear}_marks_first.json`,
                `cce_results/${selectedClass}_${academicYear}_marks_sem1.json`,
              ]
            : [
                `cce_results/${selectedClass}_${academicYear}_marks_second.json`,
                `cce_results/${selectedClass}_${academicYear}_marks_sem2.json`,
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
          let recs = {};
          const cacheKeysToTry = [
            currentTeacherId ? `cce_remarks_cache_${currentTeacherId}_${selectedClass}_${academicYear}_${sem}_${selectedMedium}` : null,
            currentTeacherId ? `cce_remarks_cache_${currentTeacherId}_${selectedClass}_${academicYear}_${sem}` : null,
            `cce_remarks_cache_${selectedClass}_${academicYear}_${sem}_${selectedMedium}`,
            `cce_remarks_cache_${selectedClass}_${academicYear}_${sem}`,
            `cce_remarks_${selectedClass}_${academicYear}_${sem}`,
          ].filter(Boolean);

          for (const cKey of cacheKeysToTry) {
            try {
              const cached = localStorage.getItem(cKey);
              if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
                  Object.keys(parsed).forEach((stdKey) => {
                    if (!recs[stdKey]) recs[stdKey] = {};
                    if (typeof parsed[stdKey] === "object" && parsed[stdKey] !== null) {
                      Object.assign(recs[stdKey], parsed[stdKey]);
                    } else {
                      recs[stdKey] = parsed[stdKey];
                    }
                  });
                }
              }
            } catch (e) {}
          }

          const docIds = [
            currentTeacherId ? `${currentTeacherId}_${selectedClass}_${academicYear}_${sem}_${selectedMedium}` : null,
            currentTeacherId ? `${currentTeacherId}_${selectedClass}_${academicYear}_${sem}` : null,
            `${selectedClass}_${academicYear}_${sem}_${selectedMedium}`,
            `${selectedClass}_${academicYear}_${sem}`,
            `${selectedClass}_${selectedMedium}_${academicYear}_${sem}`,
          ].filter(Boolean);

          for (const dId of docIds) {
            try {
              const snap = await getDoc(doc(db, "cce_remarks_v2", dId));
              if (snap.exists()) {
                const data = snap.data();
                const parsedRecs = data.records || data.remarks || data.data || null;
                if (parsedRecs && typeof parsedRecs === "object" && Object.keys(parsedRecs).length > 0) {
                  Object.keys(parsedRecs).forEach((stdKey) => {
                    if (!recs[stdKey]) recs[stdKey] = {};
                    if (typeof parsedRecs[stdKey] === "object" && parsedRecs[stdKey] !== null) {
                      Object.assign(recs[stdKey], parsedRecs[stdKey]);
                    } else {
                      recs[stdKey] = parsedRecs[stdKey];
                    }
                  });
                }
              }
            } catch (e) {}
          }
          return recs;
        };

        // Load only selected term's remarks
        const termRecs = await loadSemesterRemarks(termSuffix);

        const deepMergeRemarks = (target, source) => {
          if (!source || typeof source !== "object") return;
          Object.keys(source).forEach((stdKey) => {
            if (!target[stdKey]) target[stdKey] = {};
            if (typeof source[stdKey] === "object" && source[stdKey] !== null) {
              Object.assign(target[stdKey], source[stdKey]);
            } else {
              target[stdKey] = source[stdKey];
            }
          });
        };

        deepMergeRemarks(mergedRemarks, termRecs);
        setRemarksData(mergedRemarks);
      } catch (e) {
        console.error("Error fetching remarks:", e);
      }

      // 5. Fetch Working Days & Attendance Data
      try {
        let computedTotalWorkingDays = 0;
        try {
          let wDaysObj = null;
          // Try term-specific doc first, then legacy combined doc
          const wDocIdsToTry = [
            `${selectedClass}_${academicYear}_${termSuffix}`,
            `${selectedClass}_${academicYear}`,
          ];
          for (const wDocId of wDocIdsToTry) {
            const wSnap = await getDoc(doc(db, "cce_working_days", wDocId));
            if (wSnap.exists()) {
              wDaysObj = wSnap.data().days || wSnap.data().workingDays || wSnap.data();
              break;
            }
          }
          if (!wDaysObj) {
            const legacyWSnap = await getDoc(doc(db, "cce_attendance", `${selectedClass}_${academicYear}_working_days`));
            if (legacyWSnap.exists()) {
              wDaysObj = legacyWSnap.data().workingDays || legacyWSnap.data().days || legacyWSnap.data();
            }
          }

          if (!wDaysObj) {
            try {
              const cachedWDays = localStorage.getItem(`cce_working_days_${selectedClass}_${academicYear}`);
              if (cachedWDays) wDaysObj = JSON.parse(cachedWDays);
            } catch(e) {}
          }

          if (wDaysObj && typeof wDaysObj === "object") {
            let sumDays = 0;
            Object.values(wDaysObj).forEach((v) => {
              const numV = Number(v);
              if (!isNaN(numV) && numV > 0 && numV <= 31) sumDays += numV;
            });
            if (sumDays > 0) computedTotalWorkingDays = sumDays;
            else if (typeof wDaysObj.total === "number" && wDaysObj.total > 0) computedTotalWorkingDays = wDaysObj.total;
            else if (typeof wDaysObj.workingDays === "number" && wDaysObj.workingDays > 0) computedTotalWorkingDays = wDaysObj.workingDays;
          } else if (typeof wDaysObj === "number" && wDaysObj > 0) {
            computedTotalWorkingDays = wDaysObj;
          }
        } catch (e) {}

        setTotalWorkingDays(computedTotalWorkingDays);

        let attMap = {};

        // 5a. Try loading from term-specific _monthly doc first, then combined fallback
        const monthlyDocIdsToTry = [
          `${selectedClass}_${academicYear}_${termSuffix}_monthly`,
          `${selectedClass}_${academicYear}_monthly`,
        ];
        for (const monthlyDocId of monthlyDocIdsToTry) {
          try {
            const monthlySnap = await getDoc(doc(db, "cce_attendance", monthlyDocId));
            if (monthlySnap.exists()) {
            const recs = monthlySnap.data().records || monthlySnap.data();
            if (recs && typeof recs === "object") {
              // Structure: { studentId: { jun: 20, jul: 22, ... }, ... }
              Object.entries(recs).forEach(([stdKey, stdVal]) => {
                if (!attMap[stdKey]) attMap[stdKey] = {};
                if (typeof stdVal === "object" && stdVal !== null) {
                  Object.assign(attMap[stdKey], stdVal);
                } else if (typeof stdVal === "number") {
                  attMap[stdKey] = { total: stdVal };
                }
              });
            }
            if (Object.keys(attMap).length > 0) break;
          }
          } catch (e) {}
        }

        // 5b. Try localStorage cache if no Firestore data
        if (Object.keys(attMap).length === 0) {
          try {
            const cacheKeysToTry = [
              `cce_monthly_attendance_${selectedClass}_${academicYear}_${termSuffix}`,
              `cce_monthly_attendance_${selectedClass}_${academicYear}`,
            ];
            let cached = null;
            for (const cKey of cacheKeysToTry) {
              cached = localStorage.getItem(cKey);
              if (cached) break;
            }
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed && typeof parsed === "object") {
                Object.entries(parsed).forEach(([stdKey, stdVal]) => {
                  if (!attMap[stdKey]) attMap[stdKey] = {};
                  if (typeof stdVal === "object" && stdVal !== null) {
                    Object.assign(attMap[stdKey], stdVal);
                  } else if (typeof stdVal === "number") {
                    attMap[stdKey] = { total: stdVal };
                  }
                });
              }
            }
          } catch (e) {}
        }

        // 5c. Also try Bunny CDN fallback
        if (Object.keys(attMap).length === 0) {
          try {
            const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
            const bunnyAtt = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_attendance.json`);
            if (bunnyAtt && typeof bunnyAtt === "object" && Object.keys(bunnyAtt).length > 0) {
              Object.entries(bunnyAtt).forEach(([stdKey, stdVal]) => {
                if (!attMap[stdKey]) attMap[stdKey] = {};
                if (typeof stdVal === "object" && stdVal !== null) {
                  Object.assign(attMap[stdKey], stdVal);
                } else if (typeof stdVal === "number") {
                  attMap[stdKey] = { total: stdVal };
                }
              });
            }
          } catch (e) {}
        }

        // 5d. Also try legacy docId fallback
        if (Object.keys(attMap).length === 0) {
          try {
            const attSnap = await getDoc(doc(db, "cce_attendance", docId));
            if (attSnap.exists()) {
              const data = attSnap.data().attendanceData || attSnap.data();
              if (data && typeof data === "object") {
                Object.entries(data).forEach(([stdKey, stdVal]) => {
                  if (!attMap[stdKey]) attMap[stdKey] = {};
                  if (typeof stdVal === "object" && stdVal !== null) {
                    Object.assign(attMap[stdKey], stdVal);
                  } else if (typeof stdVal === "number") {
                    attMap[stdKey] = { total: stdVal };
                  }
                });
              }
            }
          } catch (e) {}
        }

        setAttendanceData(attMap);
      } catch (e) {
        setAttendanceData({});
      }

      // 6. Fetch Weightage Data (cce_weightage_v2 & local cache)
      try {
        let weightageMap = {};
        const cacheKey = `cce_weightage_cache_${selectedClass}_${academicYear}`;
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && typeof parsed === "object") weightageMap = parsed;
          }
        } catch (e) {}

        if (Object.keys(weightageMap).length === 0) {
          const docIdsToTry = [
            `${currentTeacherId}_${selectedClass}_${academicYear}`,
            `${selectedClass}_${academicYear}`,
          ];
          for (const dId of docIdsToTry) {
            try {
              const snap = await getDoc(doc(db, "cce_weightage_v2", dId));
              if (snap.exists()) {
                const d = snap.data();
                weightageMap = d.data || d;
                break;
              }
            } catch (e) {}
          }
        }

        setWeightageData(weightageMap);
      } catch (e) {
        console.error("Error fetching weightage:", e);
      }

    } catch (err) {
      console.error("Error loading CCE Register data:", err);
    }
    setLoading(false);
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    toast.info("HD Vector-Grade PDF तयार होत आहे, थेट डाऊनलोड सुरू झाली आहे...");
    try {
      const { toPng } = await import("html-to-image");
      const { default: jsPDF } = await import("jspdf");

      const pdfPages = printRef.current.querySelectorAll(".pdf-page");
      if (!pdfPages || pdfPages.length === 0) {
        toast.error("पेजेस सापडले नाहीत!");
        setDownloading(false);
        return;
      }

      let pdf = null;

      for (let i = 0; i < pdfPages.length; i++) {
        const pageEl = pdfPages[i];
        const isLandscape = pageEl.classList.contains("pdf-page-landscape") || pageEl.getAttribute("data-orientation") === "landscape";

        let dataUrl = "";
        if (isLandscape) {
          // Solution 1: Temporarily expand pageEl to 1920px full width with padding so 100% of all columns including अंतिम श्रेणी are captured
          const origW = pageEl.style.width;
          const origMaxW = pageEl.style.maxWidth;
          const origMinW = pageEl.style.minWidth;
          const origOverflow = pageEl.style.overflow;
          const origPaddingR = pageEl.style.paddingRight;

          const innerContainers = pageEl.querySelectorAll(".overflow-x-auto, .overflow-hidden");
          const innerOrigs = [];
          innerContainers.forEach((el) => {
            innerOrigs.push({
              el,
              styleW: el.style.width,
              styleMaxW: el.style.maxWidth,
              styleMinW: el.style.minWidth,
              styleOverflow: el.style.overflow,
            });
            el.style.width = "1920px";
            el.style.maxWidth = "none";
            el.style.minWidth = "1920px";
            el.style.overflow = "visible";
          });

          pageEl.style.width = "1920px";
          pageEl.style.maxWidth = "none";
          pageEl.style.minWidth = "1920px";
          pageEl.style.overflow = "visible";
          pageEl.style.paddingRight = "40px";

          dataUrl = await toPng(pageEl, {
            quality: 1.0,
            pixelRatio: 3,
            cacheBust: true,
            backgroundColor: "#ffffff",
            style: {
              width: "1920px",
              maxWidth: "none",
              minWidth: "1920px",
              overflow: "visible",
              paddingRight: "40px",
            },
          });

          // Immediately restore original screen styles
          pageEl.style.width = origW;
          pageEl.style.maxWidth = origMaxW;
          pageEl.style.minWidth = origMinW;
          pageEl.style.overflow = origOverflow;
          pageEl.style.paddingRight = origPaddingR;
          innerContainers.forEach((el, idx) => {
            const o = innerOrigs[idx];
            if (o) {
              el.style.width = o.styleW;
              el.style.maxWidth = o.styleMaxW;
              el.style.minWidth = o.styleMinW;
              el.style.overflow = o.styleOverflow;
            }
          });
        } else {
          dataUrl = await toPng(pageEl, {
            quality: 1.0,
            pixelRatio: 3,
            cacheBust: true,
            backgroundColor: "#ffffff",
            style: {
              overflow: "visible",
              scrollbarWidth: "none",
            },
          });
        }

        // Load captured image
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve) => {
          if (img.complete) resolve();
          else img.onload = resolve;
        });

        if (isLandscape) {
          // Last Page: Standard Legal Paper Landscape (355.6mm x 215.9mm) with 5mm Safe Margin Fit
          const naturalWidth = img.naturalWidth || 1;
          const naturalHeight = img.naturalHeight || 1;
          const legalWidth = 355.6; // mm
          const legalHeight = 215.9; // mm
          const margin = 5; // mm safe margin

          const printableWidth = legalWidth - (margin * 2); // 345.6mm
          const calcHeight = Number(((naturalHeight / naturalWidth) * printableWidth).toFixed(2));
          const targetHeight = Math.min(legalHeight - (margin * 2), calcHeight);
          const xOffset = margin; // 5mm left margin
          const yOffset = Number(((legalHeight - targetHeight) / 2).toFixed(2));

          if (i === 0) {
            pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "legal", compress: true });
          } else {
            pdf.addPage("legal", "landscape");
          }

          pdf.addImage(dataUrl, "PNG", xOffset, Math.max(0, yOffset), printableWidth, targetHeight, undefined, "FAST");
        } else {
          // Pages 1 & 2: Standard Portrait A4 (210mm x 297mm)
          const targetWidth = 210; // mm
          const targetHeight = 297; // mm

          if (i === 0) {
            pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
          } else {
            pdf.addPage("a4", "portrait");
          }

          pdf.addImage(dataUrl, "PNG", 0, 0, targetWidth, targetHeight, undefined, "FAST");
        }
      }

      if (pdf) {
        const termLabel = selectedTerm === "sem1" ? "प्रथम_सत्र" : "द्वितीय_सत्र";
        pdf.save(`CCE_मूल्यांकन_नोंदवही_${selectedClass}_${termLabel}_${academicYear}.pdf`);
        toast.success("HD Vector PDF यशस्वीरित्या थेट डाऊनलोड झाली!");
      }
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
      <style>{`
        .pdf-page, .pdf-page * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .pdf-page::-webkit-scrollbar, .pdf-page *::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print, nav, header, sidebar, footer {
            display: none !important;
          }
          .cce-pdf-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          .pdf-page {
            margin: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            box-sizing: border-box !important;
            padding: 8mm 6mm !important;
            page-break-after: always !important;
            break-after: page !important;
            overflow: visible !important;
          }
          .pdf-page-landscape {
            width: 297mm !important;
            height: 210mm !important;
            max-height: 210mm !important;
            padding: 6mm 6mm !important;
            overflow: visible !important;
          }
        }
      `}</style>

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


        {/* Term Switcher — प्रथम सत्र / द्वितीय सत्र */}
        <div className="flex items-center gap-1 bg-amber-50 p-1 rounded-xl border border-amber-200 text-xs font-bold">
          <button
            onClick={() => { setSelectedTerm("sem1"); }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              selectedTerm === "sem1"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-amber-700 hover:text-amber-900 hover:bg-amber-100"
            }`}
          >
            प्रथम सत्र
          </button>
          <button
            onClick={() => { setSelectedTerm("sem2"); }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              selectedTerm === "sem2"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-amber-700 hover:text-amber-900 hover:bg-amber-100"
            }`}
          >
            द्वितीय सत्र
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
          const studentMarks = marksData[student.id]
            || marksData[student.rollNo]
            || marksData[student.name]
            || marksData[student.fullName]
            || marksData[String(student.rollNo)]
            || marksData[studentId]
            || {};

          const getStudentRemarksObj = (std) => {
            if (!std || !remarksData) return {};
            const sId = String(std.id || "").trim();
            const sRoll = std.rollNo !== undefined && std.rollNo !== null ? String(std.rollNo).trim() : "";
            const sName = String(std.name || "").trim();
            const sFullName = String(std.fullName || "").trim();

            if (sId && remarksData[sId]) return remarksData[sId];
            if (sRoll && remarksData[sRoll]) return remarksData[sRoll];
            if (sFullName && remarksData[sFullName]) return remarksData[sFullName];
            if (sName && remarksData[sName]) return remarksData[sName];

            const sIdLower = sId.toLowerCase();
            const sRollLower = sRoll.toLowerCase();
            const sNameLower = sName.toLowerCase();
            const sFullNameLower = sFullName.toLowerCase();

            for (const [rKey, rVal] of Object.entries(remarksData)) {
              const lowerKey = String(rKey).trim().toLowerCase();
              if (!lowerKey) continue;

              if (sIdLower && lowerKey === sIdLower) return rVal;
              if (sRollLower && (lowerKey === sRollLower || lowerKey === `roll_${sRollLower}` || lowerKey === `student_${sRollLower}`)) return rVal;
              if (sFullNameLower && lowerKey === sFullNameLower) return rVal;
              if (sNameLower && lowerKey === sNameLower) return rVal;
            }
            return {};
          };

          const studentRemarks = getStudentRemarksObj(student);

          return (
            <React.Fragment key={student.id}>
              {/* Page A: Formative & Summative Evaluation Table */}
              <div
                className={`pdf-page bg-white border border-slate-200 rounded-3xl min-h-[285mm] h-auto overflow-hidden shadow-sm flex flex-col justify-between mb-4 ${pageMode === "1page" ? "p-3" : "p-6"}`}
                style={{ pageBreakAfter: "always", breakAfter: "page" }}
              >
                <div>
                  <h2 className={`font-black text-[#004080] text-center tracking-tight ${pageMode === "1page" ? "text-xl mb-2" : "text-2xl mb-4"}`}>सातत्यपूर्ण सर्वंकष मूल्यांकन</h2>

                  {/* Student Meta Header */}
                  <div className={`flex items-center justify-between font-bold text-slate-900 border-b-2 border-sky-100 ${pageMode === "1page" ? "text-xs font-extrabold pb-2 mb-2.5" : "text-sm font-extrabold pb-3 mb-4"}`}>
                    <span>विद्यार्थ्याचे नाव - <b className="text-slate-900">{student.name}</b></span>
                    <span>इयत्ता - <b>{selectedClass}</b></span>
                    <span>तुकडी - <b>{division}</b></span>
                    <span>हजेरी क्र. <b>{student.rollNo}</b></span>
                    <span>{selectedTerm === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}</span>
                  </div>

                  {/* Marks Table */}
                  <div className="overflow-x-auto">
                    <table className={`w-full border-collapse border-2 border-[#0080ff] text-center font-medium table-fixed text-xs`}>
                      <colgroup>
                        <col style={{ width: "4%" }} />
                        <col style={{ width: "22%" }} />
                        <col style={{ width: "5%" }} />
                        <col style={{ width: "4.5%" }} />
                        <col style={{ width: "4.5%" }} />
                        <col style={{ width: "4.5%" }} />
                        <col style={{ width: "4.5%" }} />
                        <col style={{ width: "4.5%" }} />
                        <col style={{ width: "4.5%" }} />
                        <col style={{ width: "4.5%" }} />
                        <col style={{ width: "4.5%" }} />
                        <col style={{ width: "4.5%" }} />
                        <col style={{ width: "4.5%" }} />
                        <col style={{ width: "4.5%" }} />
                        <col style={{ width: "4.5%" }} />
                        <col style={{ width: "4.5%" }} />
                        <col style={{ width: "5%" }} />
                      </colgroup>
                      <thead>
                        {/* Header Row 1 */}
                        <tr className="bg-[#bfe5ff] text-[#002b66] font-extrabold border-b border-[#0080ff]">
                          <th rowSpan={3} className="border border-[#0080ff] bg-[#bfe5ff] p-1 text-center align-top pt-2 font-black text-xs">
                            अ.<br />क्र.
                          </th>
                          <th colSpan={2} rowSpan={2} className="border border-[#0080ff] bg-[#bfe5ff] p-1 text-center align-top pt-2 font-black text-xs">
                            तपशील
                          </th>
                          <th colSpan={8} className="border border-[#0080ff] bg-[#bfe5ff] p-1 text-center font-black text-xs">
                            (अ) आकारिक मूल्यांकन
                          </th>
                          <th colSpan={4} className="border border-[#0080ff] bg-[#bfe5ff] p-1 text-center font-black text-xs">
                            (ब) संकलित मूल्यांकन
                          </th>
                          <th rowSpan={2} className="border border-[#0080ff] bg-[#bfe5ff] p-1 text-center align-top pt-2 font-black text-xs">
                            <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", margin: "0 auto", whiteSpace: "nowrap" }}>
                              अ + ब
                            </div>
                          </th>
                          <th rowSpan={3} className="border border-[#0080ff] bg-[#bfe5ff] p-1 text-center align-top pt-2 font-black text-xs">
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
                          const getSubData = (subName) => {
                            if (!studentMarks || typeof studentMarks !== "object") return {};
                            if (studentMarks[subName]) return studentMarks[subName];
                            const lower = String(subName).toLowerCase().trim();
                            if (lower.includes("मराठी")) return studentMarks["marathi"] || studentMarks["prathambhasha"] || studentMarks["प्रथम भाषा : मराठी"] || studentMarks["प्रथम भाषा: मराठी"] || studentMarks["प्रथम भाषा"] || studentMarks["मराठी"] || {};
                            if (lower.includes("इंग्रजी")) return studentMarks["english"] || studentMarks["dvitiybhasha"] || studentMarks["द्वितीय भाषा : इंग्रजी"] || studentMarks["द्वितीय भाषा: इंग्रजी"] || studentMarks["तृतीय भाषा: इंग्रजी"] || studentMarks["तृतीय भाषा : इंग्रजी"] || studentMarks["तृतीय भाषा"] || studentMarks["इंग्रजी"] || {};
                            if (lower.includes("हिंदी")) return studentMarks["hindi"] || studentMarks["tritiyabhasha"] || studentMarks["हिंदी"] || {};
                            if (lower.includes("गणित")) return studentMarks["ganit"] || studentMarks["math"] || studentMarks["maths"] || studentMarks["गणित"] || {};
                            if (lower.includes("परिसर")) return studentMarks["parisar"] || studentMarks["parisar1"] || studentMarks["parisar2"] || studentMarks["परिसर अभ्यास"] || studentMarks["vijnan"] || studentMarks["vidnyan"] || studentMarks["विज्ञान"] || {};
                            if (lower.includes("कला")) return studentMarks["kala"] || studentMarks["art"] || studentMarks["कला"] || {};
                            if (lower.includes("कार्यानुभव")) return studentMarks["karyanubhav"] || studentMarks["work"] || studentMarks["कार्यानुभव"] || {};
                            if (lower.includes("शारीरिक")) return studentMarks["sharirik"] || studentMarks["pe"] || studentMarks["शारीरिक शिक्षण"] || studentMarks["शारीरिक शिक्षण व आरोग्य"] || {};

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
                                return v;
                              }
                            }
                            return {};
                          };

                          const getSubjectWeightage = (subName, stdId, stdRoll) => {
                            if (!weightageData) return {};

                            const findInList = (list) => {
                              if (!Array.isArray(list) || list.length === 0) return null;
                              if (stdId || stdRoll) {
                                const stdMatch = list.find((i) => {
                                  if (!i.studentIds || !Array.isArray(i.studentIds)) return false;
                                  return i.studentIds.some(id => String(id) === String(stdId) || String(id) === String(stdRoll));
                                });
                                if (stdMatch && stdMatch.subjects) {
                                  if (stdMatch.subjects[subName]) return stdMatch.subjects[subName];
                                  const lower = String(subName).toLowerCase().trim();
                                  for (const [sKey, sVal] of Object.entries(stdMatch.subjects)) {
                                    const sLower = String(sKey).toLowerCase().trim();
                                    if (
                                      (lower.includes("मराठी") && sLower.includes("मराठी")) ||
                                      (lower.includes("इंग्रजी") && sLower.includes("इंग्रजी")) ||
                                      (lower.includes("हिंदी") && sLower.includes("हिंदी")) ||
                                      (lower.includes("गणित") && sLower.includes("गणित")) ||
                                      (lower.includes("कला") && sLower.includes("कला")) ||
                                      (lower.includes("कार्यानुभव") && sLower.includes("कार्यानुभव")) ||
                                      (lower.includes("शारीरिक") && sLower.includes("शारीरिक")) ||
                                      (lower.includes("परिसर") && sLower.includes("परिसर"))
                                    ) {
                                      return sVal;
                                    }
                                  }
                                }
                              }
                              for (const item of list) {
                                if (item && item.subjects) {
                                  if (item.subjects[subName]) return item.subjects[subName];
                                  const lower = String(subName).toLowerCase().trim();
                                  for (const [sKey, sVal] of Object.entries(item.subjects)) {
                                    const sLower = String(sKey).toLowerCase().trim();
                                    if (
                                      (lower.includes("मराठी") && sLower.includes("मराठी")) ||
                                      (lower.includes("इंग्रजी") && sLower.includes("इंग्रजी")) ||
                                      (lower.includes("हिंदी") && sLower.includes("हिंदी")) ||
                                      (lower.includes("गणित") && sLower.includes("गणित")) ||
                                      (lower.includes("कला") && sLower.includes("कला")) ||
                                      (lower.includes("कार्यानुभव") && sLower.includes("कार्यानुभव")) ||
                                      (lower.includes("शारीरिक") && sLower.includes("शारीरिक")) ||
                                      (lower.includes("परिसर") && sLower.includes("परिसर"))
                                    ) {
                                      return sVal;
                                    }
                                  }
                                }
                              }
                              return null;
                            };

                            const sem2 = weightageData.semester2 || (weightageData.data ? weightageData.data.semester2 : null);
                            const sem1 = weightageData.semester1 || (weightageData.data ? weightageData.data.semester1 : null);
                            const rows = weightageData.rows || (weightageData.data ? weightageData.data.rows : null);

                            const matchSem2 = findInList(sem2);
                            if (matchSem2) return matchSem2;
                            const matchSem1 = findInList(sem1);
                            if (matchSem1) return matchSem1;
                            const matchRows = findInList(rows);
                            if (matchRows) return matchRows;

                            if (weightageData[subName]) return weightageData[subName];
                            if (weightageData.data && weightageData.data[subName]) return weightageData.data[subName];

                            return {};
                          };

                          const subData = getSubData(subjectName);
                          const sw = getSubjectWeightage(subjectName, student.id, student.rollNo);
                          const isPracticalSub = subjectName.includes("कला") || subjectName.includes("कार्यानुभव") || subjectName.includes("शारीरिक");

                          const getWVal = (keys, defaultVal) => {
                            if (sw && typeof sw === "object") {
                              for (const k of keys) {
                                if (sw[k] !== undefined && sw[k] !== null && String(sw[k]).trim() !== "") {
                                  return String(sw[k]).trim();
                                }
                              }
                            }
                            if (subData && typeof subData === "object") {
                              for (const k of keys) {
                                const maxKey = `${k}Max`;
                                if (subData[maxKey] !== undefined && subData[maxKey] !== null && String(subData[maxKey]).trim() !== "") {
                                  return String(subData[maxKey]).trim();
                                }
                              }
                            }
                            return String(defaultVal);
                          };

                          const getDefaultLekhiMax = (clsStr) => {
                            const c = String(clsStr || "").toLowerCase().trim();
                            if (c.includes("1") || c.includes("2")) return "20";
                            if (c.includes("3") || c.includes("4")) return "30";
                            if (c.includes("5") || c.includes("6")) return "40";
                            if (c.includes("7") || c.includes("8")) return "50";
                            return "20";
                          };

                          const tondiKaamMax = getWVal(["tondiKaam", "tondi", "oral"], "10");
                          const pratyakshikPrayogMax = getWVal(["pratyakshikPrayog", "pratyakshik", "practical", "activity"], isPracticalSub ? "20" : "10");
                          const upakramKritiMax = getWVal(["upakramKriti", "upakram", "kriti"], isPracticalSub ? "20" : "10");
                          const prakalpaMax = getWVal(["prakalpa", "prakalp", "project"], isPracticalSub ? "20" : "10");
                          const chaachaniLekhiMax = getWVal(["chaachaniLekhi", "chaachani", "test", "exam"], isPracticalSub ? "10" : "10");
                          const swadhyayVargakaryaMax = getWVal(["swadhyayVargakarya", "swadhyay", "vargakarya", "homework"], isPracticalSub ? "10" : "20");
                          const itarMax = getWVal(["itar", "other"], isPracticalSub ? "10" : "0");

                          const sankalitTondiMax = isPracticalSub ? "0" : getWVal(["sankalitTondi", "sankalitOral"], "10");
                          const sankalitPratyakshikMax = getWVal(["sankalitPratyakshik", "sankalitPractical"], "0");
                          const sankalitLekhiMax = isPracticalSub ? "0" : getWVal(["sankalitLekhi", "sankalitWritten"], getDefaultLekhiMax(selectedClass));

                          const tondiKaamObt = Number(tondiKaamMax) > 0 ? (subData.tondiKaam ?? subData.tondi ?? subData.oral ?? "") : "";
                          const pratyakshikPrayogObt = Number(pratyakshikPrayogMax) > 0 ? (subData.pratyakshikPrayog ?? subData.practical ?? subData.activity ?? "") : "";
                          const upakramKritiObt = Number(upakramKritiMax) > 0 ? (subData.upakramKriti ?? subData.upakram ?? subData.project ?? "") : "";
                          const prakalpaObt = Number(prakalpaMax) > 0 ? (subData.prakalp ?? subData.prakalpa ?? "") : "";
                          const chaachaniLekhiObt = Number(chaachaniLekhiMax) > 0 ? (subData.chaachaniLekhi ?? subData.chaachani ?? subData.test ?? subData.exam ?? "") : "";
                          const swadhyayVargakaryaObt = Number(swadhyayVargakaryaMax) > 0 ? (subData.swadhyayVargakarya ?? subData.swadhyay ?? subData.vargakarya ?? subData.homework ?? "") : "";
                          const itarObt = Number(itarMax) > 0 ? (subData.itar ?? subData.other ?? "") : "";

                          const sankalitTondiObt = (!isPracticalSub && Number(sankalitTondiMax) > 0) ? (subData.sankalitTondi ?? subData.semesterOral ?? "") : "";
                          const sankalitPratyakshikObt = Number(sankalitPratyakshikMax) > 0 ? (subData.sankalitPratyakshik ?? subData.semesterPractical ?? "") : "";
                          const sankalitLekhiObt = (!isPracticalSub && Number(sankalitLekhiMax) > 0) ? (subData.sankalitLekhi ?? subData.lekhi ?? subData.written ?? subData.semesterWritten ?? "") : "";

                          const hasFormative = tondiKaamObt !== "" || pratyakshikPrayogObt !== "" || upakramKritiObt !== "" || prakalpaObt !== "" || chaachaniLekhiObt !== "" || swadhyayVargakaryaObt !== "" || itarObt !== "";
                          const formTotalObt = hasFormative ? ((Number(tondiKaamObt) || 0) + (Number(pratyakshikPrayogObt) || 0) + (Number(upakramKritiObt) || 0) + (Number(prakalpaObt) || 0) + (Number(chaachaniLekhiObt) || 0) + (Number(swadhyayVargakaryaObt) || 0) + (Number(itarObt) || 0)) : (subData.akarik ?? subData.formTotal ?? subData.Akarik?.Total ?? "");
                          const formTotalMax = (Number(tondiKaamMax) || 0) + (Number(pratyakshikPrayogMax) || 0) + (Number(upakramKritiMax) || 0) + (Number(prakalpaMax) || 0) + (Number(chaachaniLekhiMax) || 0) + (Number(swadhyayVargakaryaMax) || 0) + (Number(itarMax) || 0) || (isPracticalSub ? 100 : 70);

                          const hasSummative = (sankalitTondiObt !== "" || sankalitPratyakshikObt !== "" || sankalitLekhiObt !== "") && !isPracticalSub;
                          const semTotalObt = hasSummative ? ((Number(sankalitTondiObt) || 0) + (Number(sankalitPratyakshikObt) || 0) + (Number(sankalitLekhiObt) || 0)) : (isPracticalSub ? "" : (subData.sankalit ?? subData.semTotal ?? subData.Sanklik?.Total ?? ""));
                          const semTotalMax = isPracticalSub ? "" : ((Number(sankalitTondiMax) || 0) + (Number(sankalitPratyakshikMax) || 0) + (Number(sankalitLekhiMax) || 0) || 30);

                          const hasGrand = formTotalObt !== "" || semTotalObt !== "";
                          const grandTotalObt = hasGrand ? ((Number(formTotalObt) || 0) + (Number(semTotalObt) || 0)) : (subData.total ?? subData.grandTotal ?? subData.obtained ?? subData.marks ?? "");
                          const grandMax = 100;
                          const grade = grandTotalObt !== "" ? getGrade((Number(grandTotalObt) / grandMax) * 100) : "";

                          const cellPad = "p-1.5 text-xs font-bold";

                          return (
                            <React.Fragment key={subjectName}>
                              {/* Row 1: पैकी */}
                              <tr className="bg-white text-slate-900 font-bold border-t border-[#0080ff]">
                                <td rowSpan={2} className="border border-[#0080ff] bg-white p-1 text-center align-top pt-3.5 font-extrabold text-slate-900 text-xs">
                                  {subIdx + 1}
                                </td>
                                <td rowSpan={2} className="border border-[#0080ff] bg-white p-1 text-center align-top pt-3 text-[#002b66] font-extrabold text-[11px] leading-tight whitespace-normal break-words">
                                  {subjectName}
                                </td>
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
                                  <td colSpan={4} rowSpan={2} className="border border-[#0080ff] bg-slate-100/80 align-middle text-center"></td>
                                ) : (
                                  <>
                                    <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{sankalitTondiMax}</td>
                                    <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{sankalitPratyakshikMax}</td>
                                    <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{sankalitLekhiMax}</td>
                                    <td className={`border border-[#0080ff] ${cellPad} font-extrabold align-middle text-center bg-white`}>{semTotalMax}</td>
                                  </>
                                )}
                                <td className={`border border-[#0080ff] ${cellPad} font-extrabold align-middle text-center bg-white`}>{grandMax}</td>
                                <td rowSpan={2} className="border border-[#0080ff] bg-white p-1 text-center align-top pt-3.5 font-extrabold text-slate-900 text-xs">
                                  {grade || "-"}
                                </td>
                              </tr>

                              {/* Row 2: प्राप्त */}
                              <tr className="bg-white text-slate-900 font-bold border-b-2 border-[#0080ff]">
                                <td className={`border border-[#0080ff] ${cellPad} text-slate-800 font-bold bg-white align-middle text-center`}>प्राप्त</td>
                                <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{tondiKaamObt !== "" ? tondiKaamObt : ""}</td>
                                <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{pratyakshikPrayogObt !== "" ? pratyakshikPrayogObt : ""}</td>
                                <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{upakramKritiObt !== "" ? upakramKritiObt : ""}</td>
                                <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{prakalpaObt !== "" ? prakalpaObt : ""}</td>
                                <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{chaachaniLekhiObt !== "" ? chaachaniLekhiObt : ""}</td>
                                <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{swadhyayVargakaryaObt !== "" ? swadhyayVargakaryaObt : ""}</td>
                                <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{itarObt !== "" ? itarObt : ""}</td>
                                <td className={`border border-[#0080ff] ${cellPad} font-extrabold align-middle text-center bg-white`}>{formTotalObt !== "" ? formTotalObt : ""}</td>
                                {!isPracticalSub && (
                                  <>
                                    <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{sankalitTondiObt !== "" ? sankalitTondiObt : ""}</td>
                                    <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{sankalitPratyakshikObt !== "" ? sankalitPratyakshikObt : ""}</td>
                                    <td className={`border border-[#0080ff] ${cellPad} align-middle text-center`}>{sankalitLekhiObt !== "" ? sankalitLekhiObt : ""}</td>
                                    <td className={`border border-[#0080ff] ${cellPad} font-extrabold align-middle text-center bg-white`}>{semTotalObt !== "" ? semTotalObt : ""}</td>
                                  </>
                                )}
                                <td className={`border border-[#0080ff] ${cellPad} font-extrabold align-middle text-center bg-white`}>{grandTotalObt !== "" ? grandTotalObt : ""}</td>
                              </tr>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Inline Compact Remarks — ONLY in 1-page mode */}
                  {pageMode === "1page" && (
                    <div className="mt-2">
                      <h3 className="text-xs font-black text-sky-800 text-center mb-1 border-b border-sky-200 pb-1">वर्णनात्मक नोंदी</h3>
                      <table className="w-full border-collapse border border-sky-400 text-xs font-medium">
                        <thead>
                          <tr className="bg-sky-100 text-sky-950 font-bold">
                            <th className="border border-sky-400 p-1 text-left w-1/4">विषय / घटक</th>
                            <th className="border border-sky-400 p-1 text-left w-3/4">वर्णनात्मक नोंदी</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const getFormattedRemark = (remarksObj, labelOrKey) => {
                              if (!remarksObj || typeof remarksObj !== "object") return "-";
                              let val = remarksObj[labelOrKey];

                              if (!val) {
                                const lower = String(labelOrKey).toLowerCase().trim();
                                if (lower.includes("मराठी") || lower.includes("prathambhasha")) {
                                  val = remarksObj["prathambhasha"] || remarksObj["marathi"] || remarksObj["प्रथम भाषा : मराठी"] || remarksObj["प्रथम भाषा: मराठी"] || remarksObj["प्रथम भाषा (मराठी)"] || remarksObj["प्रथम भाषा"] || remarksObj["मराठी"];
                                } else if (lower.includes("इंग्रजी") || lower.includes("dvitiybhasha")) {
                                  val = remarksObj["dvitiybhasha"] || remarksObj["english"] || remarksObj["द्वितीय भाषा : इंग्रजी"] || remarksObj["द्वितीय भाषा: इंग्रजी"] || remarksObj["तृतीय भाषा: इंग्रजी"] || remarksObj["तृतीय भाषा : इंग्रजी"] || remarksObj["द्वितीय भाषा (इंग्रजी)"] || remarksObj["तृतीय भाषा"] || remarksObj["इंग्रजी"];
                                } else if (lower.includes("हिंदी") || lower.includes("tritiyabhasha")) {
                                  val = remarksObj["tritiyabhasha"] || remarksObj["hindi"] || remarksObj["तृतीय भाषा (हिंदी)"] || remarksObj["तृतीय भाषा: हिंदी"] || remarksObj["हिंदी"];
                                } else if (lower.includes("गणित") || lower.includes("ganit")) {
                                  val = remarksObj["ganit"] || remarksObj["math"] || remarksObj["maths"] || remarksObj["गणित"];
                                } else if (lower.includes("परिसर") || lower.includes("parisar")) {
                                  val = remarksObj["parisar"] || remarksObj["parisar1"] || remarksObj["parisar2"] || remarksObj["परिसर अभ्यास"] || remarksObj["परिसर अभ्यास १"] || remarksObj["परिसर अभ्यास २"];
                                } else if (lower.includes("विज्ञान") || lower.includes("vijnan") || lower.includes("vidnyan")) {
                                  val = remarksObj["vijnan"] || remarksObj["vidnyan"] || remarksObj["विज्ञान"] || remarksObj["विज्ञान व तंत्रज्ञान"];
                                } else if (lower.includes("सामाजिक") || lower.includes("samajik_shastra") || lower.includes("samajshastra")) {
                                  val = remarksObj["samajik_shastra"] || remarksObj["samajshastra"] || remarksObj["सामाजिक शास्त्रे"];
                                } else if (lower.includes("कला") || lower.includes("kala")) {
                                  val = remarksObj["kala"] || remarksObj["art"] || remarksObj["कला"];
                                } else if (lower.includes("कार्यानुभव") || lower.includes("karyanubhav")) {
                                  val = remarksObj["karyanubhav"] || remarksObj["work"] || remarksObj["कार्यानुभव"];
                                } else if (lower.includes("शारीरिक") || lower.includes("sharirik")) {
                                  val = remarksObj["sharirik"] || remarksObj["pe"] || remarksObj["शारीरिक शिक्षण"] || remarksObj["शारीरिक शिक्षण व आरोग्य"];
                                } else if (lower.includes("विशेष") || lower.includes("visheshpragati")) {
                                  val = remarksObj["visheshpragati"] || remarksObj["vishesh"] || remarksObj["विशेष प्रगती"];
                                } else if (lower.includes("सुधारणा") || lower.includes("sudharna")) {
                                  val = remarksObj["sudharna"] || remarksObj["sudharana"] || remarksObj["सुधारणा आवश्यक"];
                                } else if (lower.includes("आवड") || lower.includes("aavad")) {
                                  val = remarksObj["aavad"] || remarksObj["आवड / छंद"] || remarksObj["छंद"];
                                } else if (lower.includes("व्यक्तिमत्त्व") || lower.includes("vyaktimatva")) {
                                  val = remarksObj["vyaktimatva"] || remarksObj["व्यक्तिमत्त्व गुणविशेष"] || remarksObj["व्यक्तिमत्व गुणविशेष"];
                                }
                              }

                              if (!val) {
                                const lLower = String(labelOrKey).toLowerCase().trim();
                                for (const [k, v] of Object.entries(remarksObj)) {
                                  const kLower = String(k).toLowerCase().trim();
                                  if (
                                    (lLower.includes("मराठी") && (kLower.includes("मराठी") || kLower.includes("prathambhasha"))) ||
                                    (lLower.includes("इंग्रजी") && (kLower.includes("इंग्रजी") || kLower.includes("dvitiybhasha"))) ||
                                    (lLower.includes("हिंदी") && (kLower.includes("हिंदी") || kLower.includes("tritiyabhasha"))) ||
                                    (lLower.includes("गणित") && (kLower.includes("गणित") || kLower.includes("ganit"))) ||
                                    (lLower.includes("कला") && (kLower.includes("कला") || kLower.includes("kala"))) ||
                                    (lLower.includes("कार्यानुभव") && (kLower.includes("कार्यानुभव") || kLower.includes("karyanubhav"))) ||
                                    (lLower.includes("शारीरिक") && (kLower.includes("शारीरिक") || kLower.includes("sharirik"))) ||
                                    (lLower.includes("परिसर") && (kLower.includes("परिसर") || kLower.includes("parisar"))) ||
                                    kLower === lLower
                                  ) {
                                    val = v;
                                    break;
                                  }
                                }
                              }

                              if (!val) return "-";
                              if (Array.isArray(val)) {
                                const filtered = val.filter(Boolean).map((x) => String(x).trim()).filter((x) => x.length > 0);
                                return filtered.length > 0 ? filtered.join(" ") : "-";
                              }
                              if (typeof val === "object") {
                                const vals = Object.values(val).filter(Boolean).map((x) => String(x).trim()).filter((x) => x.length > 0);
                                return vals.length > 0 ? vals.join(" ") : "-";
                              }
                              return String(val).trim() || "-";
                            };

                            const getR = getFormattedRemark;
                            return (
                              <>
                                {subjects.map((s) => (
                                  <tr key={s} className="border-b border-sky-300">
                                    <td className="border border-sky-400 p-1 font-bold text-slate-900 bg-sky-50/50 leading-snug">{s}</td>
                                    <td className="border border-sky-400 p-1 text-slate-800 leading-snug">{getR(studentRemarks, s)}</td>
                                  </tr>
                                ))}
                                {["विशेष प्रगती", "सुधारणा आवश्यक", "आवड / छंद", "व्यक्तिमत्त्व गुणविशेष"].map((label) => (
                                  <tr key={label} className="border-b border-sky-300">
                                    <td className="border border-sky-400 p-1 font-bold text-slate-900 bg-sky-50/50 leading-snug">{label}</td>
                                    <td className="border border-sky-400 p-1 text-slate-800 leading-snug">{getR(studentRemarks, label)}</td>
                                  </tr>
                                ))}
                              </>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Footer Signatures */}
                <div className={`flex items-center justify-between border-t border-slate-200 font-bold text-slate-900 ${pageMode === "1page" ? "pt-2 mt-2 text-xs" : "pt-4 mt-3 text-xs"}`}>
                  <div className="text-center">
                    <p className={pageMode === "1page" ? "font-extrabold text-xs" : "font-extrabold text-sm"}>{schoolData.teacherName || "वर्गशिक्षक"}</p>
                    <p className={pageMode === "1page" ? "text-[10px] text-slate-500 font-medium" : "text-[11px] text-slate-600 font-medium"}>वर्गशिक्षक</p>
                  </div>
                  <div className="text-center">
                    <p className={pageMode === "1page" ? "font-extrabold text-xs" : "font-extrabold text-sm"}>{schoolData.headmasterName || "मुख्याध्यापक"}</p>
                    <p className={pageMode === "1page" ? "text-[10px] text-slate-500 font-medium" : "text-[11px] text-slate-600 font-medium"}>मुख्याध्यापक</p>
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
                    <span>{selectedTerm === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}</span>
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
              )}
            </React.Fragment>
          );
        })}

        {/* -------------------- DYNAMIC CALCULATIONS FOR FINAL 3 PAGES -------------------- */}
        {(() => {
          const getStudentMarksObj = (student) => {
            if (!student) return {};
            const sId = String(student.id || "").trim();
            const sRoll = student.rollNo !== undefined && student.rollNo !== null ? String(student.rollNo).trim() : "";
            const sName = String(student.name || "").trim().toLowerCase();
            const sFullName = String(student.fullName || "").trim().toLowerCase();

            if (sId && marksData[sId]) return marksData[sId];
            if (sRoll && marksData[sRoll]) return marksData[sRoll];
            if (sName && marksData[sName]) return marksData[sName];
            if (sFullName && marksData[sFullName]) return marksData[sFullName];

            for (const [mKey, mVal] of Object.entries(marksData)) {
              const lowerKey = String(mKey).trim().toLowerCase();
              if (
                (sId && (lowerKey === sId.toLowerCase() || lowerKey === `student_${sId.toLowerCase()}`)) ||
                (sRoll && (lowerKey === sRoll.toLowerCase() || lowerKey === `roll_${sRoll.toLowerCase()}` || lowerKey === `student_${sRoll.toLowerCase()}`)) ||
                (sName && (lowerKey === sName || lowerKey.includes(sName) || sName.includes(lowerKey))) ||
                (sFullName && (lowerKey === sFullName || lowerKey.includes(sFullName) || sFullName.includes(lowerKey)))
              ) {
                return mVal;
              }
            }
            return {};
          };

          const getStudentSubjectStats = (student, subjectName) => {
            let studentMarks = getStudentMarksObj(student);
            if (studentMarks && studentMarks.subjects && typeof studentMarks.subjects === "object") {
              studentMarks = studentMarks.subjects;
            } else if (studentMarks && studentMarks.records && typeof studentMarks.records === "object") {
              studentMarks = studentMarks.records;
            }

            const lower = String(subjectName).toLowerCase().trim();

            let subData = {};
            if (studentMarks[subjectName]) {
              subData = studentMarks[subjectName];
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

            return {
              formTotal,
              semTotal,
              grandTotal,
              gradeStr: grandTotal > 0 ? getGrade(grandTotal) : "-",
              isPracticalSub
            };
          };

          const getStudentAttendanceDays = (student) => {
            if (!student) return 0;
            const sId = String(student.id || "").trim();
            const sRoll = student.rollNo !== undefined && student.rollNo !== null ? String(student.rollNo).trim() : "";
            const sName = String(student.name || "").trim().toLowerCase();
            const sFullName = String(student.fullName || "").trim().toLowerCase();

            let rec = attendanceData[sId] || attendanceData[sRoll] || attendanceData[student.name] || attendanceData[student.fullName] || null;

            if (!rec || (typeof rec === "object" && Object.keys(rec).length === 0)) {
              for (const [aKey, aVal] of Object.entries(attendanceData)) {
                const lowerKey = String(aKey).trim().toLowerCase();
                if (
                  (sId && lowerKey === sId.toLowerCase()) ||
                  (sRoll && (lowerKey === sRoll.toLowerCase() || lowerKey === `roll_${sRoll.toLowerCase()}`)) ||
                  (sName && (lowerKey === sName || lowerKey === sName.replace(/\s+/g, ""))) ||
                  (sFullName && (lowerKey === sFullName || lowerKey === sFullName.replace(/\s+/g, "")))
                ) {
                  rec = aVal;
                  break;
                }
              }
            }

            if (typeof rec === "number" && rec > 0) return rec;
            if (typeof rec === "object" && rec !== null) {
              let total = 0;
              Object.entries(rec).forEach(([k, v]) => {
                const lowerK = String(k).toLowerCase().trim();
                // Filter out non-monthly keys to prevent double addition
                if (["total", "workingdays", "updatedat", "id", "name", "fullname", "rollno"].includes(lowerK)) {
                  return;
                }
                const numV = Number(v);
                if (!isNaN(numV) && numV > 0 && numV <= 31) {
                  total += numV;
                }
              });
              if (total > 0) return total;
              if (typeof rec.total === "number" && rec.total > 0 && rec.total <= 366) return rec.total;
              if (typeof rec.attendance === "number" && rec.attendance > 0 && rec.attendance <= 366) return rec.attendance;
            }
            return 0;
          };

          const getSubjectDisplayName = (s) => {
            if (!s) return "";
            const str = String(s).trim();
            if (str.includes("प्रथम") || str.includes("मराठी")) return "प्रथम भाषा : मराठी";
            if (str.includes("द्वितीय") || str.includes("इंग्रजी")) return "द्वितीय भाषा : इंग्रजी";
            if (str.includes("तृतीय") || str.includes("हिंदी")) return "तृतीय भाषा : हिंदी";
            if (str.includes("गणित")) return "गणित";
            if (str.includes("परिसर")) return "परिसर अभ्यास";
            if (str.includes("कला")) return "कला";
            if (str.includes("कार्यानुभव")) return "कार्यानुभव";
            if (str.includes("शारीरिक")) return "शारीरिक शिक्षण व आरोग्य";
            return str;
          };

          return (
            <>
              {/* ========================================================================= */}
              {/* PAGE 1: श्रेणी निहाय संकलन तक्ता (वर्गस्तर)                                */}
              {/* ========================================================================= */}
              <div className="pdf-page bg-white p-6 border border-slate-200 rounded-3xl min-h-[285mm] overflow-hidden shadow-sm flex flex-col justify-between mb-4" style={{ pageBreakAfter: "always", breakAfter: "page" }}>
                <div>
                  <h2 className="text-xl font-black text-slate-900 text-center mb-4 tracking-tight">श्रेणी निहाय संकलन तक्ता (वर्गस्तर)</h2>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-300 pb-2 mb-4">
                    <span>शाळा: <b>{schoolData.schoolName || "जिल्हा परिषद शाळा धोंडेवाडी(पेड)ता.तासगाव जि.सांगली"}</b></span>
                    <span>इयत्ता: <b>{selectedClass}</b></span>
                    <span>तुकडी: <b>{division}</b></span>
                    <span>{selectedTerm === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}</span>
                    <span>सन: <b>{academicYear}</b></span>
                  </div>

                  {/* Table 1: Overall Grade Counts */}
                  <div className="mb-6">
                    <table className="w-full table-fixed border-collapse border border-amber-500 text-xs text-center font-medium">
                      <thead>
                        <tr className="bg-amber-100 text-slate-900 font-bold border-b border-amber-500">
                          <th className="border border-amber-500 p-1.5 w-10 min-w-[32px]">अ. क्र.</th>
                          <th className="border border-amber-500 p-1.5 text-left w-44 min-w-[140px]">विषय</th>
                          <th className="border border-amber-500 p-1.5 w-12 min-w-[40px]">संख्या</th>
                          <th className="border border-amber-500 p-1.5 w-12 min-w-[40px]">उपस्थिती</th>
                          {GRADE_KEYS.map((g) => (
                            <th key={g} className="border border-amber-500 p-1.5 text-center w-12 min-w-[44px]">{GRADE_LABELS[g]}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // Calculate overall class-wide present student count:
                          // If a student has attendance > 0 OR has marks > 0 in ANY subject, count them present for all subjects
                          const classPresentCount = students.filter((std) => {
                            if (getStudentAttendanceDays(std) > 0) return true;
                            return subjects.some((subKey) => getStudentSubjectStats(std, subKey).grandTotal > 0);
                          }).length;
                          const displayPresent = classPresentCount > 0 ? classPresentCount : students.length;

                          return subjects.map((sub, idx) => {
                            const gradeCounts = { a1: 0, a2: 0, b1: 0, b2: 0, c1: 0, c2: 0, d: 0, i1: 0, i2: 0 };
                            students.forEach((std) => {
                              const stats = getStudentSubjectStats(std, sub);
                              gradeCounts[getGradeKeyFromScore(stats.grandTotal)]++;
                            });

                            return (
                              <tr key={sub} className="border-b border-amber-400 hover:bg-amber-50/40">
                                <td className="border border-amber-500 p-1.5 font-bold w-10">{idx + 1}</td>
                                <td className="border border-amber-500 p-1 text-left font-bold text-slate-900 text-[11px] leading-tight w-44">{getSubjectDisplayName(sub)}</td>
                                <td className="border border-amber-500 p-1.5 font-bold w-12">{students.length}</td>
                                <td className="border border-amber-500 p-1.5 font-bold w-12">{displayPresent}</td>
                                {GRADE_KEYS.map((g) => (
                                  <td key={g} className="border border-amber-500 p-1.5 font-bold text-center w-12 min-w-[44px]">
                                    {gradeCounts[g]}
                                  </td>
                                ))}
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Table 2: Gender-wise Grade Counts */}
                  <div>
                    <table className="w-full table-fixed border-collapse border border-amber-500 text-xs text-center font-medium">
                      <thead>
                        <tr className="bg-amber-100 text-slate-900 font-bold border-b border-amber-500">
                          <th className="border border-amber-500 p-1 w-8 min-w-[28px]" rowSpan={2}>अ. क्र.</th>
                          <th className="border border-amber-500 p-1.5 text-left w-40 min-w-[130px]" rowSpan={2}>विषय</th>
                          <th className="border border-amber-500 p-1 w-10 min-w-[32px]" rowSpan={2}>संख्या</th>
                          <th className="border border-amber-500 p-1 w-10 min-w-[32px]" rowSpan={2}>उपस्थिती</th>
                          {GRADE_KEYS.map((g) => (
                            <th key={g} className="border border-amber-500 p-1 text-center" colSpan={2}>{GRADE_LABELS[g]}</th>
                          ))}
                        </tr>
                        <tr className="bg-amber-100 text-slate-900 font-bold border-b border-amber-500">
                          {GRADE_KEYS.map((g) => (
                            <React.Fragment key={g}>
                              <th className="border border-amber-500 p-0.5 text-[10px] text-center w-8 min-w-[28px]">मुले</th>
                              <th className="border border-amber-500 p-0.5 text-[10px] text-center w-8 min-w-[28px]">मुली</th>
                            </React.Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const classPresentCount2 = students.filter((std) => {
                            if (getStudentAttendanceDays(std) > 0) return true;
                            return subjects.some((subKey) => getStudentSubjectStats(std, subKey).grandTotal > 0);
                          }).length;
                          const displayPresent2 = classPresentCount2 > 0 ? classPresentCount2 : students.length;

                          return subjects.map((sub, idx) => {
                            const boyCounts = { a1: 0, a2: 0, b1: 0, b2: 0, c1: 0, c2: 0, d: 0, i1: 0, i2: 0 };
                            const girlCounts = { a1: 0, a2: 0, b1: 0, b2: 0, c1: 0, c2: 0, d: 0, i1: 0, i2: 0 };

                            students.forEach((std) => {
                              const stats = getStudentSubjectStats(std, sub);
                              const gKey = getGradeKeyFromScore(stats.grandTotal);
                              if (isBoyStudent(std)) {
                                boyCounts[gKey]++;
                              } else {
                                girlCounts[gKey]++;
                              }
                            });

                            return (
                              <tr key={sub} className="border-b border-amber-400 hover:bg-amber-50/40">
                                <td className="border border-amber-500 p-1 font-bold w-8">{idx + 1}</td>
                                <td className="border border-amber-500 p-1 text-left font-bold text-slate-900 text-[10px] leading-tight w-40">{getSubjectDisplayName(sub)}</td>
                                <td className="border border-amber-500 p-1 font-bold w-10">{students.length}</td>
                                <td className="border border-amber-500 p-1 font-bold w-10">{displayPresent2}</td>
                                {GRADE_KEYS.map((g) => (
                                  <React.Fragment key={g}>
                                    <td className="border border-amber-500 p-0.5 font-bold text-center w-8 min-w-[28px]">{boyCounts[g]}</td>
                                    <td className="border border-amber-500 p-0.5 font-bold text-center w-8 min-w-[28px]">{girlCounts[g]}</td>
                                  </React.Fragment>
                                ))}
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
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

              {/* ========================================================================= */}
              {/* PAGE 2: जातनिहाय व विषयनिहाय एकूण तेरीज पत्रक                                */}
              {/* ========================================================================= */}
              <div className="pdf-page bg-white p-6 border border-slate-200 rounded-3xl min-h-[285mm] overflow-hidden shadow-sm flex flex-col justify-between mb-4" style={{ pageBreakAfter: "always", breakAfter: "page" }}>
                <div>
                  <h2 className="text-xl font-black text-slate-900 text-center mb-4 tracking-tight">जातनिहाय व विषयनिहाय एकूण तेरीज पत्रक</h2>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-300 pb-2 mb-4">
                    <span>शाळा: <b>{schoolData.schoolName || "जिल्हा परिषद शाळा धोंडेवाडी(पेड)ता.तासगाव जि.सांगली"}</b></span>
                    <span>इयत्ता: <b>{selectedClass}</b></span>
                    <span>तुकडी: <b>{division}</b></span>
                    <span>{selectedTerm === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}</span>
                    <span>सन: <b>{academicYear}</b></span>
                  </div>

                  <table className="w-full table-fixed border-collapse border border-amber-500 text-[11px] text-center font-medium">
                    <thead>
                      <tr className="bg-amber-100 text-slate-900 font-bold border-b border-amber-500">
                        <th className="border border-amber-500 p-1 w-24 min-w-[80px]" rowSpan={2}>विषय</th>
                        <th className="border border-amber-500 p-1 w-24 min-w-[80px]" rowSpan={2}>जात संवर्ग</th>
                        <th className="border border-amber-500 p-0.5 text-center" colSpan={3}>संख्या</th>
                        {GRADE_KEYS.map((g) => (
                          <th key={g} className="border border-amber-500 p-0.5 text-center" colSpan={3}>{GRADE_LABELS[g]}</th>
                        ))}
                      </tr>
                      <tr className="bg-amber-100 text-slate-900 font-bold border-b border-amber-500">
                        <th className="border border-amber-500 p-0.5 text-[9px] text-center w-7 min-w-[24px]">मुले</th>
                        <th className="border border-amber-500 p-0.5 text-[9px] text-center w-7 min-w-[24px]">मुली</th>
                        <th className="border border-amber-500 p-0.5 text-[9px] text-center w-7 min-w-[24px]">एकूण</th>
                        {GRADE_KEYS.map((g) => (
                          <React.Fragment key={g}>
                            <th className="border border-amber-500 p-0.5 text-[9px] text-center w-7 min-w-[24px]">मुले</th>
                            <th className="border border-amber-500 p-0.5 text-[9px] text-center w-7 min-w-[24px]">मुली</th>
                            <th className="border border-amber-500 p-0.5 text-[9px] text-center w-7 min-w-[24px]">एकूण</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map((sub) => {
                        const categoryData = {};
                        CASTE_CATEGORIES.forEach((c) => {
                          categoryData[c.key] = {
                            countBoys: 0, countGirls: 0, countTotal: 0,
                            grades: { a1: { b: 0, g: 0, t: 0 }, a2: { b: 0, g: 0, t: 0 }, b1: { b: 0, g: 0, t: 0 }, b2: { b: 0, g: 0, t: 0 }, c1: { b: 0, g: 0, t: 0 }, c2: { b: 0, g: 0, t: 0 }, d: { b: 0, g: 0, t: 0 }, i1: { b: 0, g: 0, t: 0 }, i2: { b: 0, g: 0, t: 0 } }
                          };
                        });
                        const totalCategoryData = {
                          countBoys: 0, countGirls: 0, countTotal: 0,
                          grades: { a1: { b: 0, g: 0, t: 0 }, a2: { b: 0, g: 0, t: 0 }, b1: { b: 0, g: 0, t: 0 }, b2: { b: 0, g: 0, t: 0 }, c1: { b: 0, g: 0, t: 0 }, c2: { b: 0, g: 0, t: 0 }, d: { b: 0, g: 0, t: 0 }, i1: { b: 0, g: 0, t: 0 }, i2: { b: 0, g: 0, t: 0 } }
                        };

                        students.forEach((std) => {
                          const cKey = getStudentCasteCategory(std);
                          const stats = getStudentSubjectStats(std, sub);
                          const gKey = getGradeKeyFromScore(stats.grandTotal);
                          const boy = isBoyStudent(std);

                          if (categoryData[cKey]) {
                            if (boy) {
                              categoryData[cKey].countBoys++;
                              categoryData[cKey].grades[gKey].b++;
                              totalCategoryData.countBoys++;
                              totalCategoryData.grades[gKey].b++;
                            } else {
                              categoryData[cKey].countGirls++;
                              categoryData[cKey].grades[gKey].g++;
                              totalCategoryData.countGirls++;
                              totalCategoryData.grades[gKey].g++;
                            }
                            categoryData[cKey].countTotal++;
                            categoryData[cKey].grades[gKey].t++;
                            totalCategoryData.countTotal++;
                            totalCategoryData.grades[gKey].t++;
                          }
                        });

                        return (
                          <React.Fragment key={sub}>
                            {CASTE_CATEGORIES.map((cat, cIdx) => {
                              const rowData = categoryData[cat.key];
                              return (
                                <tr key={cat.key} className="border-b border-amber-300 hover:bg-amber-50/30">
                                  {cIdx === 0 && (
                                    <td rowSpan={6} className="border border-amber-500 p-1 font-bold text-slate-900 align-middle text-center bg-amber-50/50 w-24 text-[10px] leading-tight">{getSubjectDisplayName(sub)}</td>
                                  )}
                                  <td className="border border-amber-500 p-1 text-left font-bold text-slate-800 w-24">{cat.label}</td>
                                  <td className="border border-amber-500 p-0.5 font-bold text-center w-7 min-w-[24px]">{rowData.countBoys}</td>
                                  <td className="border border-amber-500 p-0.5 font-bold text-center w-7 min-w-[24px]">{rowData.countGirls}</td>
                                  <td className="border border-amber-500 p-0.5 font-extrabold text-blue-800 text-center w-7 min-w-[24px]">{rowData.countTotal}</td>
                                  {GRADE_KEYS.map((g) => (
                                    <React.Fragment key={g}>
                                      <td className="border border-amber-500 p-0.5 font-bold text-center w-7 min-w-[24px]">{rowData.grades[g].b}</td>
                                      <td className="border border-amber-500 p-0.5 font-bold text-center w-7 min-w-[24px]">{rowData.grades[g].g}</td>
                                      <td className="border border-amber-500 p-0.5 font-extrabold text-slate-900 text-center w-7 min-w-[24px]">{rowData.grades[g].t}</td>
                                    </React.Fragment>
                                  ))}
                                </tr>
                              );
                            })}
                            {/* Total Row for Subject */}
                            <tr className="bg-amber-100/70 font-black border-b-2 border-amber-600">
                              <td className="border border-amber-500 p-1 text-left font-black text-slate-900 w-24">एकूण</td>
                              <td className="border border-amber-500 p-0.5 font-black text-center w-7 min-w-[24px]">{totalCategoryData.countBoys}</td>
                              <td className="border border-amber-500 p-0.5 font-black text-center w-7 min-w-[24px]">{totalCategoryData.countGirls}</td>
                              <td className="border border-amber-500 p-0.5 font-black text-blue-900 text-center w-7 min-w-[24px]">{totalCategoryData.countTotal}</td>
                              {GRADE_KEYS.map((g) => (
                                <React.Fragment key={g}>
                                  <td className="border border-amber-500 p-0.5 font-black text-center w-7 min-w-[24px]">{totalCategoryData.grades[g].b}</td>
                                  <td className="border border-amber-500 p-0.5 font-black text-center w-7 min-w-[24px]">{totalCategoryData.grades[g].g}</td>
                                  <td className="border border-amber-500 p-0.5 font-black text-slate-900 text-center w-7 min-w-[24px]">{totalCategoryData.grades[g].t}</td>
                                </React.Fragment>
                              ))}
                            </tr>
                          </React.Fragment>
                        );
                      })}
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

              {/* ========================================================================= */}
              {/* PAGE 3: सातत्यपूर्ण सर्वंकष मूल्यांकन: निकाल पत्रक (एकत्रित Legal Landscape टेबल)  */}
              {/* ========================================================================= */}
              <div className="w-full flex justify-center items-center my-2">
                <div className="pdf-page pdf-page-landscape cce-result-last-page cce-mulyamankan-last-page bg-white p-4 sm:p-5 border border-slate-200 rounded-3xl w-full max-w-full min-w-0 mx-auto shadow-sm flex flex-col justify-between mb-4 box-border overflow-x-auto self-center text-center" data-orientation="landscape" style={{ pageBreakBefore: "always", breakBefore: "page" }}>
                <div>
                  <h2 className="text-xl font-black text-lime-900 text-center mb-2 tracking-tight">सातत्यपूर्ण सर्वंकष मूल्यांकन: निकाल पत्रक</h2>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-lime-300 pb-2 mb-3 px-1">
                    <span>शाळा: <b>{schoolData.schoolName || "जिल्हा परिषद शाळा धोंडेवाडी(पेड)ता.तासगाव जि.सांगली"}</b></span>
                    <span>इयत्ता: <b>{selectedClass}</b></span>
                    <span>तुकडी: <b>{division}</b></span>
                    <span>{selectedTerm === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}</span>
                    <span>सन: <b>{academicYear}</b></span>
                  </div>

                  <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse border border-lime-600 text-center font-medium min-w-[1280px]">
                      <thead>
                        {/* ROW 1: Main Headers */}
                        <tr className="bg-lime-200 text-slate-900 font-extrabold border-b border-lime-600">
                          <th className="border border-lime-600 p-1 text-[9.5px] leading-tight min-w-[28px]" rowSpan={2}>अ.क्र.</th>
                          <th className="border border-lime-600 p-1 text-left text-[10.5px] min-w-[140px] whitespace-nowrap" rowSpan={2}>विद्यार्थ्याचे नाव</th>
                          {subjects.map((sub) => {
                            return (
                              <th key={sub} className="border border-lime-600 p-1 text-[9.5px] font-extrabold whitespace-nowrap leading-tight" colSpan={4} title={sub}>
                                {sub.replace("प्रथम भाषा : ", "").replace("द्वितीय भाषा : ", "").replace("तृतीय भाषा : ", "").replace("सामान्य ", "").replace("सामाजिक ", "सो.")}
                              </th>
                            );
                          })}
                          <th className="border border-lime-600 p-1 text-[9px] leading-tight min-w-[42px] whitespace-nowrap" rowSpan={2}>उपस्थिती</th>
                          <th className="border border-lime-600 p-1 text-[9px] leading-tight min-w-[42px] whitespace-nowrap" rowSpan={2}>एकूण गुण</th>
                          <th className="border border-lime-600 p-1 text-[9px] leading-tight min-w-[44px] whitespace-nowrap" rowSpan={2}>टक्केवारी</th>
                          <th className="border border-lime-600 p-1 text-[9px] leading-tight min-w-[42px] whitespace-nowrap" rowSpan={2}>अंतिम श्रेणी</th>
                        </tr>

                        {/* ROW 2: Sub-Headers (Direct 4 sub-cols under each subject) */}
                        <tr className="bg-lime-200 text-slate-900 font-extrabold border-b border-lime-600">
                          {subjects.map((sub) => {
                            const isPractical = sub.includes("कला") || sub.includes("कार्यानुभव") || sub.includes("शारीरिक");
                            return isPractical ? (
                              <React.Fragment key={sub}>
                                <th className="border border-lime-600 p-1 text-[8.5px] leading-tight font-bold whitespace-nowrap min-w-[64px]" colSpan={2}>
                                  अ (आकारिक)
                                </th>
                                <th className="border border-lime-600 p-1 text-[8.5px] font-bold whitespace-nowrap min-w-[32px]">एकूण</th>
                                <th className="border border-lime-600 p-1 text-[8.5px] font-bold whitespace-nowrap min-w-[32px]">श्रेणी</th>
                              </React.Fragment>
                            ) : (
                              <React.Fragment key={sub}>
                                <th className="border border-lime-600 p-1 text-[8.5px] leading-tight font-bold whitespace-nowrap min-w-[36px]">
                                  अ (आ)
                                </th>
                                <th className="border border-lime-600 p-1 text-[8.5px] leading-tight font-bold whitespace-nowrap min-w-[36px]">
                                  ब (सं)
                                </th>
                                <th className="border border-lime-600 p-1 text-[8.5px] font-bold whitespace-nowrap min-w-[32px]">एकूण</th>
                                <th className="border border-lime-600 p-1 text-[8.5px] font-bold whitespace-nowrap min-w-[32px]">श्रेणी</th>
                              </React.Fragment>
                            );
                          })}
                        </tr>

                        {/* ROW 3: Sub-Header Row: Max Marks (पैकी) */}
                        <tr className="bg-lime-100 text-slate-900 font-black border-b border-lime-600 text-[8.5px]">
                          <td className="border border-lime-600 p-0.5"></td>
                          <td className="border border-lime-600 p-1 text-left font-black">पैकी</td>
                          {subjects.map((sub) => {
                            const isPractical = sub.includes("कला") || sub.includes("कार्यानुभव") || sub.includes("शारीरिक");
                            const formMax = ["1st", "2nd", "1", "2"].includes(String(selectedClass)) ? "70" : ["3rd", "4th", "3", "4"].includes(String(selectedClass)) ? "60" : ["5th", "6th", "5", "6"].includes(String(selectedClass)) ? "50" : "40";
                            const semMax = ["1st", "2nd", "1", "2"].includes(String(selectedClass)) ? "30" : ["3rd", "4th", "3", "4"].includes(String(selectedClass)) ? "40" : ["5th", "6th", "5", "6"].includes(String(selectedClass)) ? "50" : "60";

                            return isPractical ? (
                              <React.Fragment key={sub}>
                                <td className="border border-lime-600 p-0.5" colSpan={2}>100</td>
                                <td className="border border-lime-600 p-0.5">100</td>
                                <td className="border border-lime-600 p-0.5"></td>
                              </React.Fragment>
                            ) : (
                              <React.Fragment key={sub}>
                                <td className="border border-lime-600 p-0.5">{formMax}</td>
                                <td className="border border-lime-600 p-0.5">{semMax}</td>
                                <td className="border border-lime-600 p-0.5">100</td>
                                <td className="border border-lime-600 p-0.5"></td>
                              </React.Fragment>
                            );
                          })}
                          <td className="border border-lime-600 p-0.5 text-[8px]">{totalWorkingDays > 0 ? totalWorkingDays : "-"}</td>
                          <td className="border border-lime-600 p-0.5 text-[8px]">{subjects.length * 100}</td>
                          <td className="border border-lime-600 p-0.5 text-[8px]">100%</td>
                          <td className="border border-lime-600 p-0.5"></td>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student, idx) => {
                          let grandObtainedTotal = 0;
                          subjects.forEach((sub) => {
                            const stats = getStudentSubjectStats(student, sub);
                            grandObtainedTotal += stats.grandTotal;
                          });
                          const totalMaxMarks = subjects.length * 100;
                          const attDays = getStudentAttendanceDays(student);
                          const pctVal = totalMaxMarks > 0 ? (grandObtainedTotal / totalMaxMarks) * 100 : 0;
                          const overallPct = pctVal.toFixed(1) + "%";
                          const overallGrade = getGrade(pctVal);

                          return (
                            <tr key={student.id} className="border-b border-lime-300 hover:bg-lime-50/40 text-[9px]">
                              <td className="border border-lime-600 p-0.5 font-bold text-center text-[8.5px]">{idx + 1}</td>
                              <td className="border border-lime-600 p-1 text-left font-bold text-slate-900 text-[9.5px] truncate" title={student.name}>{student.name}</td>
                              {subjects.map((sub) => {
                                const stats = getStudentSubjectStats(student, sub);
                                return stats.isPracticalSub ? (
                                  <React.Fragment key={sub}>
                                    <td className="border border-lime-600 p-0.5 font-bold text-[8.5px]" colSpan={2}>{stats.formTotal || "-"}</td>
                                    <td className="border border-lime-600 p-0.5 font-extrabold text-blue-900 text-[8.5px]">{stats.grandTotal || "-"}</td>
                                    <td className="border border-lime-600 p-0.5 font-bold text-emerald-800 text-[8.5px]">{stats.gradeStr}</td>
                                  </React.Fragment>
                                ) : (
                                  <React.Fragment key={sub}>
                                    <td className="border border-lime-600 p-0.5 font-bold text-[8.5px]">{stats.formTotal || "-"}</td>
                                    <td className="border border-lime-600 p-0.5 font-bold text-[8.5px]">{stats.semTotal || "-"}</td>
                                    <td className="border border-lime-600 p-0.5 font-extrabold text-blue-900 text-[8.5px]">{stats.grandTotal || "-"}</td>
                                    <td className="border border-lime-600 p-0.5 font-bold text-emerald-800 text-[8.5px]">{stats.gradeStr}</td>
                                  </React.Fragment>
                                );
                              })}
                              <td className="border border-lime-600 p-0.5 font-bold text-[8.5px]">{attDays > 0 ? attDays : "-"}</td>
                              <td className="border border-lime-600 p-0.5 font-black text-blue-900 text-[8.5px]">{grandObtainedTotal}</td>
                              <td className="border border-lime-600 p-0.5 font-black text-blue-900 text-[8px]">{overallPct}</td>
                              <td className="border border-lime-600 p-0.5 font-black text-emerald-900 text-[8.5px]">{overallGrade}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
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
          </>
        );
        })()}

      </div>
    </div>
  );
};

export default BoardResult;
