import React, { useState, useEffect, useRef } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { matchStudentClassAndMedium, fetchStudentsForClass, hasStudentFilledData } from "./firestoreMarksHelper";
import { getTeacherId } from "../lib/teacherIsolationHelper";
import { Download, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import "./result.css";
import { printReportContent } from '../utils/printHelper';

import { CLASS_1_OUTCOMES } from "@/data/class1_outcomes";
import { CLASS_2_OUTCOMES } from "@/data/class2_outcomes";
import { CLASS_3_OUTCOMES } from "@/data/class3_outcomes";
import { CLASS_4_OUTCOMES } from "@/data/class4_outcomes";
import { CLASS_5_OUTCOMES } from "@/data/class5_outcomes";
import { CLASS_6_OUTCOMES } from "@/data/class6_outcomes";
import { CLASS_7_OUTCOMES } from "@/data/class7_outcomes";
import { CLASS_8_OUTCOMES } from "@/data/class8_outcomes";

// Helper for deep merging nested outcome rating objects without overwriting existing subject/code maps
const deepMergeRatings = (target, source) => {
  if (!source || typeof source !== "object") return target;
  const result = { ...(target || {}) };
  for (const key of Object.keys(source)) {
    if (!result[key]) {
      result[key] = source[key];
    } else if (typeof source[key] === "object" && source[key] !== null && typeof result[key] === "object" && result[key] !== null) {
      result[key] = deepMergeRatings(result[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
};

// Dynamic Class Outcomes Resolver
// Dynamic Class Outcomes Resolver (mirrors CCESubjectWise dashboard)
const getClassOutcomes = (classValue, subjectKey, customOutcomesMap = {}) => {
  const normKey = subjectKey === "maths" ? "math" : subjectKey;
  const possibleSubKeys = Array.from(new Set([
    subjectKey,
    normKey,
    subjectKey ? subjectKey.toLowerCase() : "",
    subjectKey === "marathi" ? "मराठी" : "",
    subjectKey === "hindi" ? "हिंदी" : "",
    subjectKey === "english" ? "इंग्रजी" : "",
    subjectKey === "math" || subjectKey === "maths" ? "गणित" : "",
    subjectKey === "evs1" ? "परिसर अभ्यास १" : "",
    subjectKey === "evs2" ? "परिसर अभ्यास २" : "",
    subjectKey === "science" ? "सामान्य विज्ञान" : "",
    subjectKey === "history" ? "इतिहास व नागरिकशास्त्र" : "",
    subjectKey === "geography" ? "भूगोल" : "",
    subjectKey === "kala" ? "कलाशिक्षण" : "",
    subjectKey === "kala" ? "कला" : "",
    subjectKey === "karyanubhav" ? "कार्यशिक्षण" : "",
    subjectKey === "karyanubhav" ? "कार्यानुभव" : "",
    subjectKey === "sharirik" ? "शारीरिक" : "",
  ].filter(Boolean)));

  // 1. Get base static class outcome bank
  const norm = String(classValue || "1st").toLowerCase().replace(/[^0-9]/g, "") || "1";

  let outcomeBank = null;
  if (norm === "1") outcomeBank = CLASS_1_OUTCOMES;
  else if (norm === "2") outcomeBank = CLASS_2_OUTCOMES;
  else if (norm === "3") outcomeBank = CLASS_3_OUTCOMES;
  else if (norm === "4") outcomeBank = CLASS_4_OUTCOMES;
  else if (norm === "5") outcomeBank = CLASS_5_OUTCOMES;
  else if (norm === "6") outcomeBank = CLASS_6_OUTCOMES;
  else if (norm === "7") outcomeBank = CLASS_7_OUTCOMES;
  else if (norm === "8") outcomeBank = CLASS_8_OUTCOMES;

  let baseBankList = [];
  if (outcomeBank) {
    for (const k of possibleSubKeys) {
      if (outcomeBank[k] && Array.isArray(outcomeBank[k]) && outcomeBank[k].length > 0) {
        baseBankList = outcomeBank[k];
        break;
      }
    }
  }

  if (baseBankList.length === 0 && (normKey === "evs" || normKey === "parisar" || normKey === "परिसर अभ्यास") && outcomeBank) {
    baseBankList = [...(outcomeBank.evs || []), ...(outcomeBank.evs1 || []), ...(outcomeBank.evs2 || [])];
  }
  if (baseBankList.length === 0 && ["kala", "karyanubhav", "sharirik"].includes(normKey) && CLASS_1_OUTCOMES[normKey]) {
    baseBankList = CLASS_1_OUTCOMES[normKey];
  }

  // 2. Check custom user-created / saved outcomes (from cce_outcomes_list_v2 or localStorage)
  let customList = [];
  if (customOutcomesMap && typeof customOutcomesMap === "object") {
    for (const k of possibleSubKeys) {
      if (customOutcomesMap[k] && Array.isArray(customOutcomesMap[k]) && customOutcomesMap[k].length > 0) {
        customList = customOutcomesMap[k];
        break;
      }
    }
  }

  if (customList.length === 0) {
    return baseBankList;
  }

  // Merge base bank items and custom items by outcome code/id
  const itemMap = new Map();
  baseBankList.forEach((item) => {
    const key = (item.code || item.id || "").trim();
    if (key) itemMap.set(key, item);
  });

  customList.forEach((item) => {
    const key = (item.code || item.id || "").trim();
    if (key) itemMap.set(key, item);
  });

  return Array.from(itemMap.values());
};

const toMarathiDigitsLocal = (val) => {
  if (val === null || val === undefined) return "";
  const map = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
  return String(val).replace(/\d/g, (d) => map[Number(d)]);
};

const toMarathiClassLabel = (cls) => {
  const c = String(cls || "").toLowerCase().trim();
  if (c.includes("1")) return "पहिली";
  if (c.includes("2")) return "दुसरी";
  if (c.includes("3")) return "तिसरी";
  if (c.includes("4")) return "चौथी";
  if (c.includes("5")) return "पाचवी";
  if (c.includes("6")) return "सहावी";
  if (c.includes("7")) return "सातवी";
  if (c.includes("8")) return "आठवी";
  return cls || "";
};

// A4 Page Mobile Scale Wrapper to show authentic A4 proportions on mobile without horizontal scrollbar
function A4PageWrapper({ children, isLandscape = false }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  const targetWidth = isLandscape ? 1123 : 794;

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const parentWidth = rect.width || containerRef.current.clientWidth || window.innerWidth;
      if (parentWidth > 0 && parentWidth < targetWidth) {
        setScale(Number((parentWidth / targetWidth).toFixed(4)));
      } else {
        setScale(1);
      }
    };

    updateScale();
    const timer = setTimeout(updateScale, 60);
    window.addEventListener("resize", updateScale);
    window.addEventListener("orientationchange", updateScale);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateScale);
      window.removeEventListener("orientationchange", updateScale);
    };
  }, [targetWidth]);

  const supportsZoom = typeof document !== "undefined" && "zoom" in document.documentElement.style;

  return (
    <div
      ref={containerRef}
      className="a4-page-scale-wrapper w-full flex justify-center mb-6 overflow-x-hidden"
      style={{
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
      }}
    >
      <div
        className="a4-page-scale-inner"
        style={
          scale < 1
            ? supportsZoom
              ? {
                  zoom: scale,
                  width: `${targetWidth}px`,
                  minWidth: `${targetWidth}px`,
                  maxWidth: `${targetWidth}px`,
                }
              : {
                  transform: `scale(${scale})`,
                  transformOrigin: "top center",
                  width: `${targetWidth}px`,
                  minWidth: `${targetWidth}px`,
                  maxWidth: `${targetWidth}px`,
                  marginBottom: `-${Math.round((1 - scale) * (isLandscape ? 794 : 1123))}px`,
                }
            : {
                width: `${targetWidth}px`,
                minWidth: `${targetWidth}px`,
                maxWidth: `${targetWidth}px`,
              }
        }
      >
        {children}
      </div>
    </div>
  );
}

const OutcomeTable = ({
  title,
  outcomes,
  subjectName,
  getUserSelectedLevel,
  student,
  schoolData = {},
  selectedClass = "",
  division = "",
  selectedSemester = "",
  showHeader = false
}) => {
  if (!outcomes || outcomes.length === 0) return null;

  const marathiClass = toMarathiClassLabel(selectedClass);
  const divLabel = student?.division || student?.section || student?.tukdi || division || "अ";
  const semLabel = selectedSemester === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र";

  return (
    <div className="mb-4">
      {showHeader && (
        <div className="mb-3">
          <h1 className="text-[18px] font-extrabold text-blue-900 text-center mb-2.5 border-b-2 border-blue-900 pb-1">
            अध्ययन निष्पत्तीनिहाय संपादणूक प्रगतीदर्शक नोंदतक्ता
          </h1>
          <div className="flex flex-wrap items-center justify-between text-[12.5px] font-bold text-slate-900 bg-slate-100 p-2.5 px-3.5 rounded-lg border border-slate-400 mb-3 gap-2">
            <span>विद्यार्थ्याचे नाव - <b className="text-black font-extrabold">{student?.fullName || student?.name}</b></span>
            <span>इयत्ता - <b className="text-black font-extrabold">{marathiClass || selectedClass}</b></span>
            <span>हजेरी क्र. <b className="text-black font-extrabold">{student?.rollNo || ""}</b></span>
            <span className="font-extrabold">{semLabel}</span>
          </div>
          <div className="mb-3">
            <h3 className="text-[13px] font-extrabold text-black text-center bg-amber-100 py-1.5 px-3 rounded-lg border-2 border-amber-400 shadow-sm">
              {title}
            </h3>
          </div>
        </div>
      )}

      {/* Semantic HTML Table for 100% border rendering */}
      <div className="w-full border-2 border-slate-500 rounded-lg overflow-hidden bg-white">
        <table className="w-full border-collapse text-left text-black" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '10%' }} />
            <col style={{ width: '74%' }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '4%' }} />
          </colgroup>
          <thead>
            <tr className="bg-slate-100 font-extrabold text-[12px] text-black border-b-2 border-slate-500">
              <th className="border-r border-b border-slate-500 p-1 text-center leading-tight">
                अध्ययन<br />निष्पत्ती<br />क्र.
              </th>
              <th className="border-r border-b border-slate-500 p-1.5 text-center align-middle">
                अध्ययन निष्पत्ती
              </th>
              <th colSpan={4} className="border-b border-slate-500 p-0 text-center">
                <div className="border-b border-slate-500 py-1 font-extrabold text-center text-[12px]">
                  स्तर
                </div>
                <div className="grid grid-cols-4 text-[11.5px]">
                  <div className="border-r border-slate-500 py-0.5 text-center font-extrabold">1</div>
                  <div className="border-r border-slate-500 py-0.5 text-center font-extrabold">2</div>
                  <div className="border-r border-slate-500 py-0.5 text-center font-extrabold">3</div>
                  <div className="py-0.5 text-center font-extrabold">4</div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {outcomes.map((item, idx) => {
              const level = getUserSelectedLevel(student, item.code, subjectName);
              const isLast = idx === outcomes.length - 1;
              return (
                <tr
                  key={`out_${item.code || item.id || "item"}_${idx}`}
                  className={`text-[12.5px] text-black ${!isLast ? "border-b border-slate-400" : ""}`}
                >
                  <td className="border-r border-slate-400 p-1 text-center font-bold text-[10.5px] text-slate-900 whitespace-nowrap bg-slate-50/50">
                    {item.code}
                  </td>
                  <td className="border-r border-slate-400 p-1.5 px-2 font-bold text-[12.5px] text-black leading-snug">
                    {item.text}
                  </td>
                  <td className="border-r border-slate-400 p-1 text-center font-extrabold text-black text-[15px]">
                    {level === 1 ? "✓" : ""}
                  </td>
                  <td className="border-r border-slate-400 p-1 text-center font-extrabold text-black text-[15px]">
                    {level === 2 ? "✓" : ""}
                  </td>
                  <td className="border-r border-slate-400 p-1 text-center font-extrabold text-black text-[15px]">
                    {level === 3 ? "✓" : ""}
                  </td>
                  <td className="p-1 text-center font-extrabold text-black text-[15px]">
                    {level === 4 ? "✓" : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

import { getDefaultSubjectsForClass } from "../data/cceSubjects";

const SubjectWiseResult = ({ initialClass = "1st", initialYear = "2025-26", initialSemester = "sem2", initialMedium, onBack }) => {
  const [selectedClass, setSelectedClass] = useState(initialClass || "1st");
  const [academicYear, setAcademicYear] = useState(initialYear || "2025-26");
  const [selectedSemester, setSelectedSemester] = useState(initialSemester || "sem2");
  const [viewMode, setViewMode] = useState("matrix");
  const [division, setDivision] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [selectedMedium, setSelectedMedium] = useState(() => {
    if (initialMedium) return initialMedium;
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("cce_selected_medium") || "marathi";
    }
    return "marathi";
  });

  useEffect(() => {
    if (initialMedium && initialMedium !== selectedMedium) {
      setSelectedMedium(initialMedium);
    }
  }, [initialMedium]);

  useEffect(() => {
    if (initialSemester && initialSemester !== selectedSemester) {
      setSelectedSemester(initialSemester);
    }
  }, [initialSemester]);

  useEffect(() => {
    const handleMediumUpdate = () => {
      if (typeof localStorage !== "undefined") {
        const storedMedium = localStorage.getItem("cce_selected_medium");
        if (storedMedium && storedMedium !== selectedMedium) {
          setSelectedMedium(storedMedium);
        }
      }
    };

    window.addEventListener("cce_settings_updated", handleMediumUpdate);
    window.addEventListener("storage", handleMediumUpdate);
    return () => {
      window.removeEventListener("cce_settings_updated", handleMediumUpdate);
      window.removeEventListener("storage", handleMediumUpdate);
    };
  }, [selectedMedium]);

  const [configuredSubjects, setConfiguredSubjects] = useState(() => {
    const med = selectedMedium;
    const stored = localStorage.getItem(`cce_subjects_${initialClass}_${initialYear}_${med}`) ||
      localStorage.getItem(`cce_subjects_${initialClass}_${initialYear}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) { }
    }
    return getDefaultSubjectsForClass(initialClass || "1st", med);
  });

  const [schoolData, setSchoolData] = useState({
    schoolName: "",
    udise: "",
    teacherName: "",
    headmasterName: "",
  });

  const [students, setStudents] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [levelsData, setLevelsData] = useState({});
  const [outcomesRatings, setOutcomesRatings] = useState({});
  const [customOutcomesData, setCustomOutcomesData] = useState({});

  const printRef = useRef(null);

  useEffect(() => {
    loadData();
  }, [selectedClass, academicYear, selectedMedium, selectedSemester]);

  const loadData = async () => {
    setLoading(true);
    try {
      const docId = `${selectedClass}_${academicYear}`;
      const currentTeacherId = getTeacherId();

      // 1. Fetch Global / Class School Settings
      try {
        let globalSettings = null;

        const isCleanSchool = (val) => {
          if (!val || typeof val !== "string") return false;
          const s = val.trim();
          if (!s || s.includes("___") || s.toLowerCase().includes("willingdon")) return false;
          return true;
        };

        if (currentTeacherId) {
          try {
            const cachedTeacher = localStorage.getItem(`cce_general_school_settings_${currentTeacherId}`);
            if (cachedTeacher) {
              const parsed = JSON.parse(cachedTeacher);
              if (parsed && (!parsed.schoolName || isCleanSchool(parsed.schoolName))) {
                globalSettings = parsed;
              }
            }
          } catch (e) {}

          if (!globalSettings) {
            try {
              const teacherGenSnap = await getDoc(doc(db, "school_settings", `${currentTeacherId}_general`));
              if (teacherGenSnap.exists()) {
                const data = teacherGenSnap.data();
                if (!data.schoolName || isCleanSchool(data.schoolName)) {
                  globalSettings = data;
                }
              }
            } catch (e) {}
          }
        }

        // 2. Try teacher-isolated class-specific settings first
        let classSettings = {};
        const classDocIdsToTry = [
          currentTeacherId ? `${currentTeacherId}_${selectedClass}_${academicYear}` : null,
          currentTeacherId ? `${currentTeacherId}_${selectedClass}_${localStorage.getItem("cce_selected_medium") || "marathi"}_${academicYear}` : null,
        ].filter(Boolean);

        for (const cDocId of classDocIdsToTry) {
          try {
            const settingsSnap = await getDoc(doc(db, "cce_settings", cDocId));
            if (settingsSnap.exists()) {
              classSettings = settingsSnap.data();
              break;
            }
          } catch (e) { }
        }
        const mergedSettings = { ...(globalSettings || {}), ...classSettings };
        if (mergedSettings.schoolName && !isCleanSchool(mergedSettings.schoolName)) {
          mergedSettings.schoolName = "";
        }

        // 3. Unified local profile fallback (Guarantees logged in user's headmaster and school info)
        try {
          const { getUnifiedSchoolProfile } = await import("@/utils/schoolProfileHelper");
          const uni = getUnifiedSchoolProfile(currentTeacherId);
          if (uni) {
            if (!mergedSettings.schoolName && isCleanSchool(uni.schoolName)) mergedSettings.schoolName = uni.schoolName.trim();
            if (!mergedSettings.principalName && uni.headmaster) mergedSettings.principalName = uni.headmaster;
            if (!mergedSettings.teacherName && uni.teacherName) mergedSettings.teacherName = uni.teacherName;
            if (!mergedSettings.udiseCode && uni.udise) mergedSettings.udiseCode = uni.udise;
            if (!mergedSettings.address && uni.address) mergedSettings.address = uni.address;
          }
        } catch (e) {}

        // 4. Check user's own Firestore account profile (users collection)
        if (!mergedSettings.schoolName && currentTeacherId && currentTeacherId !== "default_teacher" && currentTeacherId !== "guest") {
          try {
            const uSnap = await getDoc(doc(db, "users", currentTeacherId));
            if (uSnap.exists()) {
              const uData = uSnap.data();
              const cand = uData.schoolName || uData.school || uData.institutionName || uData.schoolConnection?.schoolName ||
                (uData.displayName && uData.displayName !== "Educator" && uData.displayName !== "Teacher" ? uData.displayName : null) ||
                (uData.fullName && uData.fullName !== "Educator" && uData.fullName !== "Teacher" ? uData.fullName : null);
              if (isCleanSchool(cand)) mergedSettings.schoolName = cand.trim();
            }
          } catch (e) { }

          if (!mergedSettings.schoolName) {
            try {
              const tSnap = await getDoc(doc(db, "teachers", currentTeacherId));
              if (tSnap.exists()) {
                const tData = tSnap.data();
                const cand = tData.schoolName || tData.school || tData.displayName || tData.fullName;
                if (isCleanSchool(cand)) mergedSettings.schoolName = cand.trim();
              }
            } catch (e) { }
          }
        }

        if (!mergedSettings.schoolName && auth?.currentUser?.displayName) {
          const dName = auth.currentUser.displayName.trim();
          if (isCleanSchool(dName) && dName !== "Educator" && dName !== "Teacher") {
            mergedSettings.schoolName = dName;
          }
        }

        const loadedDiv = mergedSettings.division || mergedSettings.section || mergedSettings.tukdi ||
          localStorage.getItem("cce_selected_division") || localStorage.getItem("teacher_division") || localStorage.getItem("division") || "";
        setDivision(loadedDiv);

        if (mergedSettings.schoolName || mergedSettings.udiseCode || mergedSettings.teacherName || mergedSettings.principalName) {
          setSchoolData({
            schoolName: mergedSettings.schoolName ? `${mergedSettings.schoolName}${mergedSettings.address ? ` (${mergedSettings.address})` : ""}` : "",
            udise: mergedSettings.udiseCode || mergedSettings.udise || "",
            teacherName: mergedSettings.teacherName || "",
            headmasterName: mergedSettings.principalName || mergedSettings.headmasterName || "",
          });
        }

        // Fetch active configured subjects for this class ("विषय निश्चिती")
        const currentMed = localStorage.getItem("cce_selected_medium") || "marathi";
        let activeSubs = [];
        try {
          const stored = localStorage.getItem(`cce_subjects_${selectedClass}_${academicYear}_${currentMed}`) ||
            localStorage.getItem(`cce_subjects_${selectedClass}_${academicYear}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              activeSubs = parsed;
            }
          }
        } catch (e) { }

        if (activeSubs.length === 0 && mergedSettings.subjects && Array.isArray(mergedSettings.subjects)) {
          activeSubs = mergedSettings.subjects;
        }

        if (activeSubs.length === 0) {
          activeSubs = getDefaultSubjectsForClass(selectedClass, currentMed);
        }

        const rawClassNum = selectedClass.replace(/\D/g, "");
        const classVariants = Array.from(new Set([
          selectedClass,
          rawClassNum,
          rawClassNum ? `${rawClassNum}st` : null,
          rawClassNum ? `${rawClassNum}nd` : null,
          rawClassNum ? `${rawClassNum}rd` : null,
          rawClassNum ? `${rawClassNum}th` : null,
        ].filter(Boolean)));

        // Fetch custom user-created learning outcomes if saved
        let mergedCustomOutcomes = {};
        classVariants.forEach((cls) => {
          try {
            const cached = localStorage.getItem(`cce_class_outcomes_${cls}_${academicYear}`);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed && typeof parsed === "object") {
                mergedCustomOutcomes = { ...mergedCustomOutcomes, ...parsed };
              }
            }
          } catch (e) {}
        });

        const customSnaps = await Promise.allSettled(
          classVariants.map((cls) => getDoc(doc(db, "cce_outcomes_list_v2", `${cls}_${academicYear}`)))
        );
        for (const res of customSnaps) {
          if (res.status === "fulfilled" && res.value && res.value.exists()) {
            const out = res.value.data().outcomes;
            if (out) mergedCustomOutcomes = { ...mergedCustomOutcomes, ...out };
          }
        }
        setCustomOutcomesData(mergedCustomOutcomes);
      } catch (e) { }

      // 2. Fetch Students for Selected Class
      const currentMedium = localStorage.getItem("cce_selected_medium") || "marathi";
      let loadedStudents = [];
      try {
        loadedStudents = (await fetchStudentsForClass(selectedClass, currentMedium, currentTeacherId)) || [];
      } catch (e) { }

      // Deduplicate students
      const uniqueMap = new Map();
      loadedStudents.forEach((s) => {
        if (s.name) {
          const key = s.rollNo ? `${s.rollNo}_${s.name}` : s.name;
          if (!uniqueMap.has(key)) uniqueMap.set(key, s);
        }
      });
      loadedStudents = Array.from(uniqueMap.values());
      loadedStudents.sort((a, b) => (parseInt(a.rollNo) || 0) - (parseInt(b.rollNo) || 0));
      setStudents(loadedStudents);

      // Auto-detect division from students if not set in settings/localStorage
      if (!loadedDiv && loadedStudents.length > 0) {
        const detectedDiv = loadedStudents.find((s) => s.division)?.division ||
                            loadedStudents.find((s) => s.section)?.section ||
                            loadedStudents.find((s) => s.tukdi)?.tukdi || "";
        if (detectedDiv) {
          setDivision(detectedDiv);
        }
      }

      // 3. Fetch User Outcome Ratings (from cce_outcomes, cce_levels_v2 & Bunny CDN in parallel)
      try {
        const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
        const [bunnyOutcomes, bunnyLevels] = await Promise.all([
          fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_outcomes.json`),
          fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_levels.json`),
        ]);

        const targetSem = selectedSemester || "sem2";
        const currentMed = localStorage.getItem("cce_selected_medium") || "marathi";

        const rawClassNum = selectedClass.replace(/\D/g, "");
        const classVariants = Array.from(new Set([
          selectedClass,
          rawClassNum,
          rawClassNum ? `${rawClassNum}st` : null,
          rawClassNum ? `${rawClassNum}nd` : null,
          rawClassNum ? `${rawClassNum}rd` : null,
          rawClassNum ? `${rawClassNum}th` : null,
        ].filter(Boolean)));

        // Query documents matching the selected semester in parallel
        const outcomeDocIds = [];
        classVariants.forEach((cls) => {
          if (currentTeacherId) {
            outcomeDocIds.push(`${currentTeacherId}_${cls}_${academicYear}_${targetSem}`);
            outcomeDocIds.push(`${currentTeacherId}_${cls}_${currentMed}_${academicYear}_${targetSem}`);
            outcomeDocIds.push(`${currentTeacherId}_${cls}_${academicYear}`);
            outcomeDocIds.push(`${currentTeacherId}_${cls}_${currentMed}_${academicYear}`);
          }
          outcomeDocIds.push(`${cls}_${academicYear}_${targetSem}`);
          outcomeDocIds.push(`${cls}_${currentMed}_${academicYear}_${targetSem}`);
          outcomeDocIds.push(`${cls}_${academicYear}`);
          outcomeDocIds.push(`${cls}_${currentMed}_${academicYear}`);
        });
        if (docId) outcomeDocIds.push(docId);

        const uniqueOutcomeDocIds = Array.from(new Set(outcomeDocIds.filter(Boolean)));
        const outcomeSnaps = await Promise.allSettled(
          uniqueOutcomeDocIds.map((oDocId) => getDoc(doc(db, "cce_outcomes", oDocId)))
        );

        let mergedRatings = {};
        for (const res of outcomeSnaps) {
          if (res.status === "fulfilled" && res.value && res.value.exists()) {
            const rData = res.value.data().ratings || res.value.data();
            mergedRatings = deepMergeRatings(mergedRatings, rData);
          }
        }
        if (bunnyOutcomes) {
          mergedRatings = deepMergeRatings(mergedRatings, bunnyOutcomes);
        }

        // Hydrate ratings from localStorage so teacher-filled option ratings appear instantly
        classVariants.forEach((cls) => {
          try {
            const cached = localStorage.getItem(`cce_outcomes_ratings_${cls}_${academicYear}_${targetSem}`);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed && typeof parsed === "object") {
                mergedRatings = deepMergeRatings(mergedRatings, parsed);
              }
            }
          } catch (e) {}
        });

        setOutcomesRatings(mergedRatings);

        // Fetch levels data in parallel (teacher-isolated first)
        const levelDocIds = [];
        classVariants.forEach((cls) => {
          if (currentTeacherId) {
            levelDocIds.push(`${currentTeacherId}_${cls}_${academicYear}_${targetSem}`);
            levelDocIds.push(`${currentTeacherId}_${cls}_${currentMed}_${academicYear}_${targetSem}`);
            levelDocIds.push(`${currentTeacherId}_${cls}_${academicYear}`);
          }
          levelDocIds.push(`${cls}_${academicYear}_${targetSem}`);
          levelDocIds.push(`${cls}_${currentMed}_${academicYear}_${targetSem}`);
          levelDocIds.push(`${cls}_${academicYear}`);
        });
        if (docId) levelDocIds.push(docId);

        const uniqueLevelDocIds = Array.from(new Set(levelDocIds.filter(Boolean)));
        const levelSnaps = await Promise.allSettled(
          uniqueLevelDocIds.map((lDocId) => getDoc(doc(db, "cce_levels_v2", lDocId)))
        );

        let mergedLevels = {};
        for (const res of levelSnaps) {
          if (res.status === "fulfilled" && res.value && res.value.exists()) {
            const lData = res.value.data().levelsData || res.value.data();
            mergedLevels = deepMergeRatings(mergedLevels, lData);
          }
        }
        if (bunnyLevels) {
          mergedLevels = deepMergeRatings(mergedLevels, bunnyLevels);
        }
        setLevelsData(mergedLevels);
      } catch (e) {
        console.error("Error fetching outcome levels:", e);
      }

      // 4. Fetch Marks Data in parallel (teacher-isolated first)
      try {
        const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
        const [bunnyMarksSec, bunnyMarksFirst] = await Promise.all([
          fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_marks_second.json`),
          fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_marks_first.json`),
        ]);

        const marksDocIds = Array.from(new Set([
          currentTeacherId ? `${currentTeacherId}_${selectedClass}_${academicYear}` : null,
          currentTeacherId ? `${currentTeacherId}_${selectedClass}_${currentMedium}_${academicYear}` : null,
          docId,
        ].filter(Boolean)));

        const marksSnaps = await Promise.allSettled(
          marksDocIds.map((mDocId) => getDoc(doc(db, "cce_marks_v2", mDocId)))
        );

        let mergedMarks = {};
        for (const res of marksSnaps) {
          if (res.status === "fulfilled" && res.value && res.value.exists()) {
            const mData = res.value.data();
            const mRecords = selectedSemester === "sem1"
              ? (mData.semester1 || mData.semester2 || mData.marksData || mData.data || mData || {})
              : (mData.semester2 || mData.semester1 || mData.marksData || mData.data || mData || {});
            mergedMarks = { ...mergedMarks, ...mRecords };
          }
        }
        mergedMarks = { ...mergedMarks, ...(bunnyMarksFirst || {}), ...(bunnyMarksSec || {}) };
        setMarksData(mergedMarks);
      } catch (e) {
        console.error("Error fetching marks data:", e);
      }

    } catch (err) {
      console.error("Error loading learning outcomes data:", err);
    }
    setLoading(false);
  };



  const handleDownloadMatrixPdf = async () => {
    setDownloading(true);
    toast.info("अध्ययन निष्पत्ती संकलन तक्ता PDF तयार होत आहे...");

    const tempContainer = document.createElement("div");
    tempContainer.style.cssText =
      "position: fixed; left: -10000px; top: 0; width: 794px; background: #ffffff; z-index: -1;";
    document.body.appendChild(tempContainer);

    try {
      const mOutcomes = getClassOutcomes(selectedClass, "marathi", customOutcomesData);
      const hOutcomes = getClassOutcomes(selectedClass, "hindi", customOutcomesData);
      const eOutcomes = getClassOutcomes(selectedClass, "english", customOutcomesData);
      const mtOutcomes = getClassOutcomes(selectedClass, "math", customOutcomesData);
      const ev1Outcomes = getClassOutcomes(selectedClass, "evs1", customOutcomesData);
      const ev2Outcomes = getClassOutcomes(selectedClass, "evs2", customOutcomesData);
      const sciOutcomes = getClassOutcomes(selectedClass, "science", customOutcomesData);
      const histOutcomes = getClassOutcomes(selectedClass, "history", customOutcomesData);
      const geoOutcomes = getClassOutcomes(selectedClass, "geography", customOutcomesData);
      const kOutcomes = getClassOutcomes(selectedClass, "kala", customOutcomesData);
      const kaOutcomes = getClassOutcomes(selectedClass, "karyanubhav", customOutcomesData);
      const shOutcomes = getClassOutcomes(selectedClass, "sharirik", customOutcomesData);

      const evsOutcomes = [...(ev1Outcomes || []), ...(ev2Outcomes || [])];
      const activeSections = [
        { key: "मराठी", title: "मराठी", outcomes: mOutcomes, subjectName: "मराठी", isEnglish: false },
        { key: "हिंदी", title: "हिंदी", outcomes: hOutcomes, subjectName: "हिंदी", isEnglish: false },
        { key: "गणित", title: "गणित", outcomes: mtOutcomes, subjectName: "गणित", isEnglish: false },
        { key: "इंग्रजी", title: "इंग्रजी", outcomes: eOutcomes, subjectName: "इंग्रजी", isEnglish: true },
        { key: "परिसर अभ्यास", title: "परिसर अभ्यास", outcomes: evsOutcomes, subjectName: "परिसर अभ्यास", isEnglish: false },
        { key: "सामान्य विज्ञान", title: "सामान्य विज्ञान", outcomes: sciOutcomes, subjectName: "सामान्य विज्ञान", isEnglish: false },
        { key: "इतिहास व नागरिकशास्त्र", title: "इतिहास व नागरिकशास्त्र", outcomes: histOutcomes, subjectName: "इतिहास व नागरिकशास्त्र", isEnglish: false },
        { key: "भूगोल", title: "भूगोल", outcomes: geoOutcomes, subjectName: "भूगोल", isEnglish: false },
        { key: "कला", title: "कलाशिक्षण", outcomes: kOutcomes, subjectName: "कलाशिक्षण", isEnglish: false },
        { key: "कार्यानुभव", title: "कार्यशिक्षण", outcomes: kaOutcomes, subjectName: "कार्यशिक्षण", isEnglish: false },
        { key: "शारीरिक", title: "शारीरिक शिक्षण", outcomes: shOutcomes, subjectName: "शारीरिक", isEnglish: false },
      ].filter((sec) => isSubjectActive(sec.key) && sec.outcomes && sec.outcomes.length > 0);

      const COLS_PER_PAGE = 16;
      const studentBatches = [];
      if (students.length === 0) {
        studentBatches.push(Array(COLS_PER_PAGE).fill(null));
      } else {
        for (let i = 0; i < students.length; i += COLS_PER_PAGE) {
          const slice = students.slice(i, i + COLS_PER_PAGE);
          while (slice.length < COLS_PER_PAGE) slice.push(null);
          studentBatches.push(slice);
        }
      }

      const marathiClass = toMarathiClassLabel(selectedClass);
      const schoolName = schoolData.schoolName || "";
      const pageElements = [];

      const buildTableHeadHtml = (batch, secTitle) => {
        const stuNameCells = batch
          .map((stu) => {
            const name = stu ? (stu.fullName || stu.name || "") : "";
            return `<th style="border: 1px solid #000000; padding: 0; width: 3.1875%; min-width: 3.1875%; max-width: 3.1875%; height: 132px; position: relative; vertical-align: middle; text-align: center; font-weight: 700; font-size: 10px; color: #000000; overflow: hidden; box-sizing: border-box;">
              <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-90deg); width: 126px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">${name}</div>
            </th>`;
          })
          .join("");

        const rollCells = batch
          .map((stu, bIdx) => {
            const roll = stu ? (stu.rollNo || bIdx + 1) : "";
            const label = roll ? toMarathiDigitsLocal(roll) : "";
            return `<th style="border: 1px solid #000000; padding: 2px 1px; width: 3.1875%; min-width: 3.1875%; max-width: 3.1875%; height: 26px; text-align: center; vertical-align: middle; font-weight: 700; font-size: 11.5px; line-height: 1.1; color: #000000; box-sizing: border-box;">${label}</th>`;
          })
          .join("");

        return `
          <thead>
            <tr id="mm_thead_r1">
              <th rowspan="2" style="border: 1px solid #000000; padding: 4px 2px; width: 7%; min-width: 7%; max-width: 7%; text-align: center; vertical-align: middle; font-weight: 700; font-size: 10px; line-height: 1.25; color: #000000; background-color: #f1f5f9; box-sizing: border-box;">अध्ययन<br/>निष्पत्ती /<br/>क्षमता क्र.</th>
              <th style="border: 1px solid #000000; padding: 6px; width: 36%; min-width: 36%; max-width: 36%; height: 132px; text-align: center; vertical-align: middle; font-weight: 700; font-size: 13px; color: #000000; background-color: #f1f5f9; box-sizing: border-box;">विद्यार्थ्यांचे नाव</th>
              ${stuNameCells}
              <th rowspan="2" style="border: 1px solid #000000; padding: 4px 2px; width: 6%; min-width: 6%; max-width: 6%; text-align: center; vertical-align: middle; font-weight: 700; font-size: 11px; color: #000000; background-color: #f1f5f9; box-sizing: border-box;">एकूण</th>
            </tr>
            <tr id="mm_thead_r2">
              <th style="border: 1px solid #000000; padding: 2px 8px; width: 36%; min-width: 36%; max-width: 36%; height: 26px; vertical-align: middle; font-weight: 700; font-size: 12px; color: #000000; background-color: #f1f5f9; box-sizing: border-box;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span style="flex: 1; text-align: center;">अध्ययन निष्पत्ती</span>
                  <span style="font-size: 10px; white-space: nowrap;">ह.क्र. →</span>
                </div>
              </th>
              ${rollCells}
            </tr>
          </thead>
        `;
      };

      const buildColgroupHtml = () => {
        const stuCols = Array(COLS_PER_PAGE)
          .fill('<col style="width: 3.1875%;" width="3.1875%" />')
          .join("");
        return `
          <colgroup>
            <col style="width: 7%;" width="7%" />
            <col style="width: 36%;" width="36%" />
            ${stuCols}
            <col style="width: 6%;" width="6%" />
          </colgroup>
        `;
      };

      for (const sec of activeSections) {
        for (const batch of studentBatches) {
          const allRowsHtml = sec.outcomes.map((item) => {
            const rawCode = String(item.code || "").replace(/^C-/i, "");
            const displayCode = sec.isEnglish ? rawCode : toMarathiDigitsLocal(rawCode);
            let ratedCount = 0;
            const stuCells = batch
              .map((stu) => {
                if (!stu) {
                  return `<td style="border: 1px solid #000000; padding: 2px; width: 3.1875%; min-width: 3.1875%; max-width: 3.1875%; text-align: center; vertical-align: middle; box-sizing: border-box;"></td>`;
                }
                const lvl = getUserSelectedLevel(stu, item.code, sec.subjectName);
                if (lvl >= 1 && lvl <= 4) {
                  ratedCount++;
                  return `<td style="border: 1px solid #000000; padding: 2px; width: 3.1875%; min-width: 3.1875%; max-width: 3.1875%; text-align: center; vertical-align: middle; font-weight: 700; font-size: 11.5px; color: #000000; box-sizing: border-box;">${toMarathiDigitsLocal(lvl)}</td>`;
                }
                return `<td style="border: 1px solid #000000; padding: 2px; width: 3.1875%; min-width: 3.1875%; max-width: 3.1875%; text-align: center; vertical-align: middle; box-sizing: border-box;"></td>`;
              })
              .join("");

            const totalText = ratedCount > 0 ? toMarathiDigitsLocal(ratedCount) : "";
            return `
              <tr>
                <td style="border: 1px solid #000000; padding: 3px 2px; width: 7%; min-width: 7%; max-width: 7%; text-align: center; vertical-align: middle; font-weight: 700; font-size: 10.5px; color: #000000; white-space: nowrap; box-sizing: border-box;">${displayCode}</td>
                <td style="border: 1px solid #000000; padding: 3px 5px; width: 36%; min-width: 36%; max-width: 36%; text-align: left; vertical-align: middle; font-weight: 700; font-size: 11px; line-height: 1.28; color: #000000; box-sizing: border-box;">${item.text}</td>
                ${stuCells}
                <td style="border: 1px solid #000000; padding: 2px; width: 6%; min-width: 6%; max-width: 6%; text-align: center; vertical-align: middle; font-weight: 700; font-size: 11px; color: #000000; box-sizing: border-box;">${totalText}</td>
              </tr>
            `;
          });

          // Measure row heights on A4 container with Image 3 header format
          const measureEl = document.createElement("div");
          measureEl.style.cssText =
            "width: 794px; padding: 18px; box-sizing: border-box; background: #ffffff; font-family: 'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', 'Inter', sans-serif;";
          measureEl.innerHTML = `
            <div>
              <h1 id="mm_title" style="font-size: 18px; font-weight: 800; color: #1e3a8a; text-align: center; margin-bottom: 8px; border-bottom: 2px solid #1e3a8a; padding-bottom: 5px; letter-spacing: 0; line-height: 1.25;">
                अध्ययन निष्पत्ती संकलन तक्ता
              </h1>
              <div id="mm_info" style="display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; font-weight: 700; color: #0f172a; background-color: #f1f5f9; padding: 6px 12px; border-radius: 6px; border: 1px solid #94a3b8; margin-bottom: 8px;">
                <span>शाळेचे नाव - <b style="color: #000000; font-weight: 800;">${schoolData.schoolName || schoolName || ""}</b></span>
                <span>इयत्ता - <b style="color: #000000; font-weight: 800;">${marathiClass || selectedClass}</b></span>
                <span style="font-weight: 800;">${selectedSemester === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}</span>
              </div>
              <div id="mm_banner" style="margin-bottom: 8px;">
                <h3 style="font-size: 13px; font-weight: 800; color: #000000; margin: 0; text-align: center; background-color: #fef3c7; padding: 5px 10px; border-radius: 6px; border: 1.5px solid #f59e0b;">
                  ${sec.title}
                </h3>
              </div>
              <div style="width: 100%; border: 1.5px solid #475569; border-radius: 6px; overflow: hidden; background: #ffffff;">
                <table style="width: 100%; border-collapse: collapse; table-layout: fixed; color: #000000;">
                  ${buildColgroupHtml()}
                  ${buildTableHeadHtml(batch, sec.title)}
                  <tbody id="mm_tbody">${allRowsHtml.join("")}</tbody>
                </table>
              </div>
            </div>
          `;
          tempContainer.appendChild(measureEl);

          const h1H = measureEl.querySelector("#mm_title")?.getBoundingClientRect().height || 33;
          const infoH = measureEl.querySelector("#mm_info")?.getBoundingClientRect().height || 37;
          const bannerH = measureEl.querySelector("#mm_banner")?.getBoundingClientRect().height || 35;
          const theadH = measureEl.querySelector("thead")?.getBoundingClientRect().height || 145;
          const trNodes = Array.from(measureEl.querySelectorAll("#mm_tbody tr"));
          const rowHeights = trNodes.map((tr) =>
            Math.max(24, Math.ceil(tr.getBoundingClientRect().height || 26))
          );
          tempContainer.removeChild(measureEl);

          const footerH = 65;
          const maxBodyHeight = 1122 - 36 - h1H - 8 - infoH - 8 - bannerH - 8 - theadH - footerH;
          const chunks = [];
          let curr = [];
          let sumH = 0;

          for (let r = 0; r < allRowsHtml.length; r++) {
            const rh = rowHeights[r] || 26;
            if (sumH + rh <= maxBodyHeight || curr.length === 0) {
              curr.push(allRowsHtml[r]);
              sumH += rh;
            } else {
              chunks.push(curr);
              curr = [allRowsHtml[r]];
              sumH = rh;
            }
          }
          if (curr.length > 0) chunks.push(curr);

          for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
            const chunkRows = chunks[cIdx];
            const isLastChunkOfSubject = cIdx === chunks.length - 1;
            const pageEl = document.createElement("div");
            pageEl.style.cssText =
              "width: 794px; min-height: 1122px; max-height: 1122px; padding: 18px; box-sizing: border-box; background: #ffffff; font-family: 'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', 'Inter', sans-serif; display: flex; flex-direction: column; justify-content: space-between;";
            pageEl.innerHTML = `
              <div>
                <h1 style="font-size: 18px; font-weight: 800; color: #1e3a8a; text-align: center; margin-bottom: 8px; border-bottom: 2px solid #1e3a8a; padding-bottom: 5px; letter-spacing: 0; line-height: 1.25;">
                  अध्ययन निष्पत्ती संकलन तक्ता
                </h1>
                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; font-weight: 700; color: #0f172a; background-color: #f1f5f9; padding: 6px 12px; border-radius: 6px; border: 1px solid #94a3b8; margin-bottom: 8px;">
                  <span>शाळेचे नाव - <b style="color: #000000; font-weight: 800;">${schoolData.schoolName || schoolName || ""}</b></span>
                  <span>इयत्ता - <b style="color: #000000; font-weight: 800;">${marathiClass || selectedClass}</b></span>
                  <span style="font-weight: 800;">${selectedSemester === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}</span>
                </div>
                <div style="margin-bottom: 8px;">
                  <h3 style="font-size: 13px; font-weight: 800; color: #000000; margin: 0; text-align: center; background-color: #fef3c7; padding: 5px 10px; border-radius: 6px; border: 1.5px solid #f59e0b;">
                    ${sec.title}
                  </h3>
                </div>
                <div style="width: 100%; border: 1.5px solid #475569; border-radius: 6px; overflow: hidden; background: #ffffff;">
                  <table style="width: 100%; border-collapse: collapse; table-layout: fixed; color: #000000;">
                    ${buildColgroupHtml()}
                    ${buildTableHeadHtml(batch, sec.title)}
                    <tbody>${chunkRows.join("")}</tbody>
                  </table>
                </div>
              </div>
              ${isLastChunkOfSubject ? `
                <div style="display: flex; align-items: flex-end; justify-content: space-between; padding-top: 16px; margin-top: 12px; font-size: 13px; font-weight: 700; color: #000000;">
                  <div style="text-align: center; min-width: 150px;">
                    <p style="font-weight: 800; margin: 0 0 4px 0; color: #000000;">${schoolData.teacherName || ""}</p>
                    <div style="border-top: 1.5px solid #000000; padding-top: 4px; font-size: 12px; font-weight: 800; color: #000000;">
                      वर्गशिक्षक स्वाक्षरी
                    </div>
                  </div>
                  <div style="text-align: center; min-width: 150px;">
                    <p style="font-weight: 800; margin: 0 0 4px 0; color: #000000;">${schoolData.headmasterName || ""}</p>
                    <div style="border-top: 1.5px solid #000000; padding-top: 4px; font-size: 12px; font-weight: 800; color: #000000;">
                      मुख्याध्यापक स्वाक्षरी
                    </div>
                  </div>
                </div>
              ` : `
                <div style="display: flex; align-items: center; justify-content: flex-end; padding-top: 8px; font-size: 11px; font-weight: 700; color: #475569;">
                  <span>(पुढील पानावर सुरू...)</span>
                </div>
              `}
            `;
            tempContainer.appendChild(pageEl);
            pageElements.push(pageEl);
          }
        }
      }

      if (pageElements.length === 0) {
        toast.error("कोणतेही विषय किंवा अध्ययन निष्पत्ती आढळल्या नाहीत.");
        return;
      }

      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
        } catch (e) {}
      }

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      for (let i = 0; i < pageElements.length; i++) {
        const canvas = await html2canvas(pageElements[i], {
          scale: 2.5,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: 794,
        });

        const PAGE_WIDTH = 210;
        const PAGE_HEIGHT = 297;
        const MARGIN = 4;
        const availW = PAGE_WIDTH - MARGIN * 2;
        const availH = PAGE_HEIGHT - MARGIN * 2;
        const ratio = canvas.width / canvas.height;
        let renderW = availW;
        let renderH = renderW / ratio;
        if (renderH > availH) {
          renderH = availH;
          renderW = renderH * ratio;
        }
        const x = (PAGE_WIDTH - renderW) / 2;
        const y = MARGIN;
        const imgData = canvas.toDataURL("image/png");
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", x, y, renderW, renderH, undefined, "FAST");
      }

      pdf.save(`अध्ययन_निष्पत्ती_संकलन_तक्ता_${selectedClass}_${academicYear}.pdf`);
      toast.success("PDF यशस्वीरित्या डाऊनलोड झाली!");
    } catch (err) {
      console.error("Matrix PDF generation error:", err);
      toast.error("PDF निर्मितीत अडचण आली: " + err.message);
    } finally {
      if (tempContainer.parentNode) {
        tempContainer.parentNode.removeChild(tempContainer);
      }
      setDownloading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (viewMode === "matrix") {
      return handleDownloadMatrixPdf();
    }
    if (!printRef.current) return;
    setDownloading(true);
    toast.info("अध्ययन निष्पती PDF तयार होत आहे, कृपया वाट पाहा...");

    const container = printRef.current;

    // Save original styles to restore after capture
    const originalStyles = {
      position: container.style.position,
      left: container.style.left,
      top: container.style.top,
      width: container.style.width,
      maxWidth: container.style.maxWidth,
      visibility: container.style.visibility,
      opacity: container.style.opacity,
      zIndex: container.style.zIndex,
      pointerEvents: container.style.pointerEvents,
      display: container.style.display,
    };

    try {
      // 1. Apply deterministic PDF capture state (Req 3, 12)
      container.style.position = "fixed";
      container.style.left = "-10000px";
      container.style.top = "0px";
      container.style.width = "794px"; // Fixed A4 width at 96 DPI
      container.style.maxWidth = "794px";
      container.style.visibility = "visible";
      container.style.opacity = "1";
      container.style.zIndex = "-9999";
      container.style.pointerEvents = "none";
      container.style.display = "block";
      container.classList.add("cce-pdf-generating");

      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
        } catch (e) {}
      }

      const images = Array.from(container.querySelectorAll("img"));
      await Promise.all(
        images.map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete) resolve();
              else {
                img.onload = resolve;
                img.onerror = resolve;
              }
            })
        )
      );

      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 2. TWO-PASS REAL DOM MEASUREMENT & DYNAMIC PAGINATION
      const generatedPages = [];
      const marathiClass = toMarathiClassLabel(selectedClass);
      const schoolName = schoolData.schoolName || "";

      for (const student of students) {
        const activeSubjectSections = [
          { key: "मराठी", title: "प्रथम भाषा: मराठी", outcomes: marathiOutcomes, subjectName: "मराठी" },
          { key: "हिंदी", title: "द्वितीय भाषा: हिंदी", outcomes: hindiOutcomes, subjectName: "हिंदी" },
          { key: "गणित", title: "गणित", outcomes: mathsOutcomes, subjectName: "गणित" },
          { key: "इंग्रजी", title: "तृतीय भाषा: इंग्रजी", outcomes: englishOutcomes, subjectName: "इंग्रजी" },
          { key: "परिसर अभ्यास", title: "परिसर अभ्यास", outcomes: evsUnifiedOutcomes, subjectName: "परिसर अभ्यास" },
          { key: "सामान्य विज्ञान", title: "सामान्य विज्ञान", outcomes: scienceOutcomes, subjectName: "सामान्य विज्ञान" },
          { key: "इतिहास व नागरिकशास्त्र", title: "इतिहास व नागरिकशास्त्र", outcomes: historyOutcomes, subjectName: "इतिहास व नागरिकशास्त्र" },
          { key: "भूगोल", title: "भूगोल", outcomes: geographyOutcomes, subjectName: "भूगोल" },
          { key: "कला", title: "कलाशिक्षण", outcomes: kalaOutcomes, subjectName: "कलाशिक्षण" },
          { key: "कार्यानुभव", title: "कार्यशिक्षण", outcomes: karyanubhavOutcomes, subjectName: "कार्यशिक्षण" },
          { key: "शारीरिक", title: "शारीरिक शिक्षण व आरोग्य", outcomes: sharirikOutcomes, subjectName: "शारीरिक" },
        ].filter((sec) => isSubjectActive(sec.key) && sec.outcomes && sec.outcomes.length > 0);

        for (const sec of activeSubjectSections) {
          // Pass 1: Render full subject table in a real DOM measurement page
          const fullRowsHtml = sec.outcomes.map((item, idx) => {
            const level = getUserSelectedLevel(student, item.code, sec.subjectName);
            const isLast = idx === sec.outcomes.length - 1;
            return `
              <tr style="font-size: 12.5px; color: #000000; ${!isLast ? "border-bottom: 1px solid #94a3b8;" : ""}">
                <td style="padding: 5px 4px; text-align: center; font-weight: 700; font-size: 10.5px; color: #0f172a; width: 10%; background-color: #f8fafc; border-right: 1px solid #94a3b8;">
                  ${item.code || ""}
                </td>
                <td style="padding: 6px; text-align: left; font-weight: 700; font-size: 12.5px; line-height: 1.35; color: #000000; width: 74%; border-right: 1px solid #94a3b8;">
                  ${item.text || ""}
                </td>
                <td style="padding: 4px; text-align: center; font-weight: 800; font-size: 15px; color: #1e3a8a; width: 4%; border-right: 1px solid #94a3b8;">
                  ${level === 1 ? "✓" : ""}
                </td>
                <td style="padding: 4px; text-align: center; font-weight: 800; font-size: 15px; color: #1e3a8a; width: 4%; border-right: 1px solid #94a3b8;">
                  ${level === 2 ? "✓" : ""}
                </td>
                <td style="padding: 4px; text-align: center; font-weight: 800; font-size: 15px; color: #1e3a8a; width: 4%; border-right: 1px solid #94a3b8;">
                  ${level === 3 ? "✓" : ""}
                </td>
                <td style="padding: 4px; text-align: center; font-weight: 800; font-size: 15px; color: #1e3a8a; width: 4%;">
                  ${level === 4 ? "✓" : ""}
                </td>
              </tr>
            `;
          }).join("");

          const measureEl = document.createElement("div");
          measureEl.className = "pdf-page bg-white flex flex-col justify-between";
          measureEl.style.cssText = "width: 794px; min-height: 1122px; padding: 24px; box-sizing: border-box; background: #ffffff; position: absolute; top: 0; left: -10000px; visibility: hidden; font-family: 'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', 'Inter', sans-serif; letter-spacing: 0; text-rendering: geometricPrecision; -webkit-font-smoothing: antialiased;";

          measureEl.innerHTML = `
            <div>
              <h1 id="m_title" style="font-size: 18px; font-weight: 800; color: #1e3a8a; text-align: center; margin-bottom: 8px; border-bottom: 2px solid #1e3a8a; padding-bottom: 5px; letter-spacing: 0; line-height: 1.25;">
                अध्ययन निष्पत्तीनिहाय संपादणूक प्रगतीदर्शक नोंदतक्ता
              </h1>
              <div id="m_student" style="display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; font-weight: 700; color: #0f172a; background-color: #f1f5f9; padding: 6px 12px; border-radius: 6px; border: 1px solid #94a3b8; margin-bottom: 8px;">
                <span>विद्यार्थ्याचे नाव - <b style="color: #000000; font-weight: 800;">${student.fullName || student.name || ""}</b></span>
                <span>इयत्ता - <b style="color: #000000; font-weight: 800;">${marathiClass || selectedClass}</b></span>
                <span>हजेरी क्र. <b style="color: #000000; font-weight: 800;">${student.rollNo || ""}</b></span>
                <span style="font-weight: 800;">${selectedSemester === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}</span>
              </div>
              <div id="m_banner" style="margin-bottom: 8px;">
                <h3 style="font-size: 13px; font-weight: 800; color: #000000; margin: 0; text-align: center; background-color: #fef3c7; padding: 5px 10px; border-radius: 6px; border: 1.5px solid #f59e0b;">
                  ${sec.title}
                </h3>
              </div>
              <div id="m_table_container" style="width: 100%; border: 1.5px solid #475569; border-radius: 6px; overflow: hidden; background: #ffffff;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; color: #000000; table-layout: fixed;">
                  <colgroup>
                    <col style="width: 10%;" />
                    <col style="width: 74%;" />
                    <col style="width: 4%;" />
                    <col style="width: 4%;" />
                    <col style="width: 4%;" />
                    <col style="width: 4%;" />
                  </colgroup>
                  <thead>
                    <tr id="m_thead_row" style="background-color: #f1f5f9; font-weight: 800; font-size: 12px; color: #000000; border-bottom: 1.5px solid #475569;">
                      <th style="border-right: 1px solid #64748b; padding: 5px 4px; text-align: center; line-height: 1.25;">
                        अध्ययन<br />निष्पत्ती<br />क्र.
                      </th>
                      <th style="border-right: 1px solid #64748b; padding: 5px 6px; text-align: center; vertical-align: middle;">
                        अध्ययन निष्पत्ती
                      </th>
                      <th colSpan="4" style="padding: 0; text-align: center;">
                        <div style="border-bottom: 1px solid #64748b; padding: 3px 0; font-weight: 800; text-align: center; font-size: 12px;">
                          स्तर
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); font-size: 11.5px;">
                          <div style="border-right: 1px solid #64748b; padding: 2px 0; text-align: center; font-weight: 800;">1</div>
                          <div style="border-right: 1px solid #64748b; padding: 2px 0; text-align: center; font-weight: 800;">2</div>
                          <div style="border-right: 1px solid #64748b; padding: 2px 0; text-align: center; font-weight: 800;">3</div>
                          <div style="padding: 2px 0; text-align: center; font-weight: 800;">4</div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody id="m_tbody">${fullRowsHtml}</tbody>
                </table>
              </div>
            </div>
            <div id="m_footer" style="display: flex; align-items: flex-end; justify-content: space-between; padding-top: 14px; margin-top: 12px; font-size: 12.5px; font-weight: 700; color: #000000;">
              <div style="text-align: center; min-width: 150px;">
                <p style="font-weight: 800; margin: 0 0 4px 0; color: #000000;">${schoolData.teacherName || ""}</p>
                <div style="border-top: 1.5px solid #000000; padding-top: 4px; font-size: 12px; font-weight: 800; color: #000000;">
                  वर्गशिक्षक स्वाक्षरी
                </div>
              </div>
              <div style="text-align: center; min-width: 150px;">
                <p style="font-weight: 800; margin: 0 0 4px 0; color: #000000;">${schoolData.headmasterName || ""}</p>
                <div style="border-top: 1.5px solid #000000; padding-top: 4px; font-size: 12px; font-weight: 800; color: #000000;">
                  मुख्याध्यापक स्वाक्षरी
                </div>
              </div>
            </div>
          `;

          container.appendChild(measureEl);

          // Measure heights directly from DOM
          const h1H = measureEl.querySelector("#m_title")?.getBoundingClientRect().height || 33;
          const stdH = measureEl.querySelector("#m_student")?.getBoundingClientRect().height || 37;
          const bannerH = measureEl.querySelector("#m_banner")?.getBoundingClientRect().height || 35;
          const theadH = measureEl.querySelector("#m_thead_row")?.getBoundingClientRect().height || 38;
          const footerH = measureEl.querySelector("#m_footer")?.getBoundingClientRect().height || 55;

          // Padding and non-table height total
          const pageInnerHeight = 1122 - 48; // 1074px
          const nonTableHeight = h1H + 8 + stdH + 8 + bannerH + 8 + theadH + 3 + footerH + 12;
          const availableTableBodyHeight = pageInnerHeight - nonTableHeight;

          const trNodes = Array.from(measureEl.querySelectorAll("#m_tbody tr"));
          const rowHeights = trNodes.map((tr) => Math.max(28, Math.ceil(tr.getBoundingClientRect().height || tr.offsetHeight || 32)));

          container.removeChild(measureEl);

          // Pass 2: Chunk outcomes dynamically to fill available A4 height max
          const subjectChunks = [];
          let currentChunk = [];
          let currentHeightSum = 0;

          for (let i = 0; i < sec.outcomes.length; i++) {
            const rHeight = rowHeights[i] || 32;

            if (currentHeightSum + rHeight <= availableTableBodyHeight && currentChunk.length > 0) {
              currentChunk.push(sec.outcomes[i]);
              currentHeightSum += rHeight;
            } else if (currentChunk.length === 0) {
              currentChunk.push(sec.outcomes[i]);
              currentHeightSum += rHeight;
            } else {
              subjectChunks.push(currentChunk);
              currentChunk = [sec.outcomes[i]];
              currentHeightSum = rHeight;
            }
          }
          if (currentChunk.length > 0) {
            subjectChunks.push(currentChunk);
          }

          const totalParts = subjectChunks.length;
          subjectChunks.forEach((chunk, chunkIdx) => {
            const partTitle = totalParts > 1
              ? `${sec.title} (भाग ${chunkIdx + 1}/${totalParts})`
              : sec.title;

            generatedPages.push({
              student,
              secTitle: partTitle,
              rawSecTitle: sec.title,
              secKey: sec.key,
              subjectName: sec.subjectName,
              outcomesChunk: chunk,
              isLastChunkOfSubject: chunkIdx === totalParts - 1,
              partIndex: chunkIdx + 1,
              totalParts,
            });
          });
        }
      }

      // Render generatedPages into container as .pdf-page elements
      let pagesHtml = generatedPages.map((pgData) => {
        const student = pgData.student;
        const rowsHtml = pgData.outcomesChunk.map((item, idx) => {
          const level = getUserSelectedLevel(student, item.code, pgData.subjectName);
          const isLast = idx === pgData.outcomesChunk.length - 1;
          return `
            <tr style="font-size: 12.5px; color: #000000; ${!isLast ? "border-bottom: 1px solid #000000;" : ""}">
              <td style="padding: 5px 4px; text-align: center; font-weight: 700; font-size: 10.5px; color: #0f172a; width: 10%; background-color: #f8fafc; border-right: 1px solid #000000;">
                ${item.code || ""}
              </td>
              <td style="padding: 6px; text-align: left; font-weight: 700; font-size: 12.5px; line-height: 1.35; color: #000000; width: 74%; border-right: 1px solid #000000;">
                ${item.text || ""}
              </td>
              <td style="padding: 4px; text-align: center; font-weight: 800; font-size: 15px; color: #000000; width: 4%; border-right: 1px solid #000000;">
                ${level === 1 ? "✓" : ""}
              </td>
              <td style="padding: 4px; text-align: center; font-weight: 800; font-size: 15px; color: #000000; width: 4%; border-right: 1px solid #000000;">
                ${level === 2 ? "✓" : ""}
              </td>
              <td style="padding: 4px; text-align: center; font-weight: 800; font-size: 15px; color: #000000; width: 4%; border-right: 1px solid #000000;">
                ${level === 3 ? "✓" : ""}
              </td>
              <td style="padding: 4px; text-align: center; font-weight: 800; font-size: 15px; color: #000000; width: 4%;">
                ${level === 4 ? "✓" : ""}
              </td>
            </tr>
          `;
        }).join("");

        return `
          <div
            class="pdf-page bg-white flex flex-col justify-between"
            style="width: 794px; height: 1122px; min-height: 1122px; max-height: 1122px; padding: 24px; box-sizing: border-box; margin-bottom: 20px; overflow: hidden; background: #ffffff; font-family: 'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', 'Inter', sans-serif; letter-spacing: 0; text-rendering: geometricPrecision; -webkit-font-smoothing: antialiased;"
          >
            <div>
              <h1 style="font-size: 18px; font-weight: 800; color: #1e3a8a; text-align: center; margin-bottom: 8px; border-bottom: 2px solid #1e3a8a; padding-bottom: 5px; letter-spacing: 0; line-height: 1.25;">
                अध्ययन निष्पत्तीनिहाय संपादणूक प्रगतीदर्शक नोंदतक्ता
              </h1>
              <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; font-weight: 700; color: #0f172a; background-color: #f1f5f9; padding: 6px 12px; border-radius: 6px; border: 1px solid #94a3b8; margin-bottom: 8px;">
                <span>विद्यार्थ्याचे नाव - <b style="color: #000000; font-weight: 800;">${student.fullName || student.name || ""}</b></span>
                <span>इयत्ता - <b style="color: #000000; font-weight: 800;">${marathiClass || selectedClass}</b></span>
                <span>हजेरी क्र. <b style="color: #000000; font-weight: 800;">${student.rollNo || ""}</b></span>
                <span style="font-weight: 800;">${selectedSemester === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}</span>
              </div>
              <div style="margin-bottom: 8px;">
                <h3 style="font-size: 13px; font-weight: 800; color: #000000; margin: 0; text-align: center; background-color: #fef3c7; padding: 5px 10px; border-radius: 6px; border: 1.5px solid #f59e0b;">
                  ${pgData.secTitle}
                </h3>
              </div>
              <div style="width: 100%; border: 1.5px solid #475569; border-radius: 6px; overflow: hidden; background: #ffffff;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; color: #000000; table-layout: fixed;">
                  <colgroup>
                    <col style="width: 10%;" />
                    <col style="width: 74%;" />
                    <col style="width: 4%;" />
                    <col style="width: 4%;" />
                    <col style="width: 4%;" />
                    <col style="width: 4%;" />
                  </colgroup>
                  <thead>
                    <tr style="background-color: #f1f5f9; font-weight: 800; font-size: 12px; color: #000000; border-bottom: 1.5px solid #475569;">
                      <th style="border-right: 1px solid #64748b; padding: 5px 4px; text-align: center; line-height: 1.25;">
                        अध्ययन<br />निष्पत्ती<br />क्र.
                      </th>
                      <th style="border-right: 1px solid #64748b; padding: 5px 6px; text-align: center; vertical-align: middle;">
                        अध्ययन निष्पत्ती
                      </th>
                      <th colSpan="4" style="padding: 0; text-align: center;">
                        <div style="border-bottom: 1px solid #64748b; padding: 3px 0; font-weight: 800; text-align: center; font-size: 12px;">
                          स्तर
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); font-size: 11.5px;">
                          <div style="border-right: 1px solid #64748b; padding: 2px 0; text-align: center; font-weight: 800;">1</div>
                          <div style="border-right: 1px solid #64748b; padding: 2px 0; text-align: center; font-weight: 800;">2</div>
                          <div style="border-right: 1px solid #64748b; padding: 2px 0; text-align: center; font-weight: 800;">3</div>
                          <div style="padding: 2px 0; text-align: center; font-weight: 800;">4</div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>${rowsHtml}</tbody>
                </table>
              </div>
            </div>
            ${pgData.isLastChunkOfSubject ? `
              <div style="display: flex; align-items: flex-end; justify-content: space-between; padding-top: 14px; margin-top: 12px; font-size: 12.5px; font-weight: 700; color: #000000;">
                <div style="text-align: center; min-width: 150px;">
                  <p style="font-weight: 800; margin: 0 0 4px 0; color: #000000;">${schoolData.teacherName || ""}</p>
                  <div style="border-top: 1.5px solid #000000; padding-top: 4px; font-size: 12px; font-weight: 800; color: #000000;">
                    वर्गशिक्षक स्वाक्षरी
                  </div>
                </div>
                <div style="text-align: center; min-width: 150px;">
                  <p style="font-weight: 800; margin: 0 0 4px 0; color: #000000;">${schoolData.headmasterName || ""}</p>
                  <div style="border-top: 1.5px solid #000000; padding-top: 4px; font-size: 12px; font-weight: 800; color: #000000;">
                    मुख्याध्यापक स्वाक्षरी
                  </div>
                </div>
              </div>
            ` : `
              <div style="display: flex; align-items: center; justify-content: flex-end; padding-top: 8px; font-size: 11px; font-weight: 700; color: #475569;">
                <span>(पुढील पानावर सुरू...)</span>
              </div>
            `}
          </div>
        `;
      }).join("");

      container.innerHTML = pagesHtml;

      // 4. Capture each .pdf-page individually and generate jsPDF
      const pageElements = Array.from(container.querySelectorAll(".pdf-page"));
      console.log("PDF pages:", pageElements.length);

      if (!pageElements || pageElements.length === 0) {
        toast.error("कोणतेही पान सापडले नाही!");
        return;
      }

      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
        } catch (e) {}
      }

      const pdf = new jsPDF({
        unit: "mm",
        format: "a4",
        orientation: "portrait",
        compress: true,
      });

      const captureScale = 3;

      for (let i = 0; i < pageElements.length; i++) {
        console.log(`Generating PDF page ${i + 1}/${pageElements.length}`);
        const pageEl = pageElements[i];

        const canvas = await html2canvas(pageEl, {
          scale: captureScale,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
          scrollX: 0,
          scrollY: 0,
          windowWidth: 794,
        });

        // Aspect ratio scaling calculation for A4 printable area (200mm x 287mm)
        const PAGE_WIDTH = 210;
        const PAGE_HEIGHT = 297;
        const BORDER = 5; // 5mm outer margin

        const availableWidth = PAGE_WIDTH - BORDER * 2; // 200mm
        const availableHeight = PAGE_HEIGHT - BORDER * 2; // 287mm

        const ratio = canvas.width / canvas.height;
        let renderWidth = availableWidth;
        let renderHeight = renderWidth / ratio;

        if (renderHeight > availableHeight) {
          renderHeight = availableHeight;
          renderWidth = renderHeight * ratio;
        }

        const x = (PAGE_WIDTH - renderWidth) / 2;
        const y = (PAGE_HEIGHT - renderHeight) / 2;

        const imgData = canvas.toDataURL("image/png");

        if (i > 0) pdf.addPage();
        pdf.addImage(
          imgData,
          "PNG",
          x,
          y,
          renderWidth,
          renderHeight,
          undefined,
          "FAST"
        );

        // Draw crisp 5mm outer rectangular border directly in jsPDF on ALL pages
        pdf.setLineWidth(0.35);
        pdf.setDrawColor(71, 85, 105); // slate-600 border line
        pdf.rect(BORDER, BORDER, availableWidth, availableHeight);
      }

      pdf.save(`अध्ययन_निष्पत्ती_प्रगतीदर्शक_${selectedClass}_${academicYear}.pdf`);
      toast.success("PDF यशस्वीरित्या डाऊनलोड झाली!");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("PDF निर्मितीत अडचण आली: " + err.message);
    } finally {
      // 5. Complete Restoration of DOM & State
      if (container) {
        container.style.position = originalStyles.position;
        container.style.left = originalStyles.left;
        container.style.top = originalStyles.top;
        container.style.width = originalStyles.width;
        container.style.maxWidth = originalStyles.maxWidth;
        container.style.visibility = originalStyles.visibility;
        container.style.opacity = originalStyles.opacity;
        container.style.zIndex = originalStyles.zIndex;
        container.style.pointerEvents = originalStyles.pointerEvents;
        container.style.display = originalStyles.display;
        container.classList.remove("cce-pdf-generating");
      }
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    if (printRef.current) {
      printReportContent(printRef.current, {
        title: "Subject Wise CCE Result Report",
        landscape: true,
      });
    } else {
      window.print();
    }
  };

  const isSubjectActive = (subName) => {
    if (!configuredSubjects || configuredSubjects.length === 0) return true;
    const name = subName.toLowerCase().trim();

    return configuredSubjects.some((s) => {
      const active = (typeof s === "string" ? s : s.name || s.label || s.title || "").toLowerCase().trim();
      if (!active) return false;

      if (name.includes("मराठी")) return active.includes("मराठी") || active.includes("प्रथम") || active.includes("marathi");
      if (name.includes("हिंदी")) return active.includes("हिंदी") || active.includes("hindi");
      if (name.includes("इंग्रजी")) return active.includes("इंग्रजी") || active.includes("english");
      if (name.includes("गणित")) return active.includes("गणित") || active.includes("math");
      if (name.includes("परिसर") || name.includes("संभोवतालचे") || name.includes("evs")) {
        return active.includes("परिसर") || active.includes("संभोवतालचे") || active.includes("evs");
      }
      if (name.includes("सामान्य विज्ञान") || name.includes("विज्ञान")) return active.includes("विज्ञान") || active.includes("science");
      if (name.includes("इतिहास")) return active.includes("इतिहास") || active.includes("नागरिकशास्त्र") || active.includes("सामाजिक") || active.includes("social");
      if (name.includes("भूगोल")) return active.includes("भूगोल") || active.includes("सामाजिक") || active.includes("social");
      if (name.includes("कला")) return active.includes("कला") || active.includes("art");
      if (name.includes("कार्यानुभव") || name.includes("कार्यशिक्षण") || name.includes("कार्य")) return active.includes("कार्यानुभव") || active.includes("कार्यशिक्षण") || active.includes("कार्य") || active.includes("work");
      if (name.includes("शारीरिक")) return active.includes("शारीरिक") || active.includes("आरोग्य") || active.includes("pe") || active.includes("sports") || active.includes("physical");

      return active.includes(name) || name.includes(active);
    });
  };

  /**
   * Resolves the EXACT level (1, 2, 3, or 4) entered by the user for a specific student and outcome code.
   * Checks outcomesRatings, levelsData, and marksData across all ID, code, and subject aliases.
   */
  const getUserSelectedLevel = (student, outcomeCode, subjectName) => {
    if (!student) return null;

    const parseLevelVal = (val) => {
      if (val === undefined || val === null || val === 0 || val === "" || val === false) return null;
      if (typeof val === "number" && val >= 1 && val <= 4) return val;
      const str = String(val).trim();
      const digits = str.match(/[1-4]/);
      if (digits) {
        const num = parseInt(digits[0], 10);
        if (num >= 1 && num <= 4) return num;
      }
      return null;
    };

    const possibleStudentKeys = Array.from(
      new Set([
        student.id,
        student.rollNo,
        String(student.rollNo),
        student.name,
        student.fullName,
        student._id,
        student.srNo,
        student.studentId,
        student.roll_no,
        String(student.id),
        student.rollNo ? String(student.rollNo).padStart(2, "0") : null,
        student.rollNo ? String(parseInt(student.rollNo, 10)) : null,
      ].filter(Boolean))
    );

    const possibleSubKeys = Array.from(
      new Set([
        subjectName,
        subjectName ? subjectName.toLowerCase() : "",
        subjectName && subjectName.includes("मराठी") ? "marathi" : "",
        subjectName && subjectName.includes("हिंदी") ? "hindi" : "",
        subjectName && subjectName.includes("इंग्रजी") ? "english" : "",
        subjectName && subjectName.includes("गणित") ? "math" : "",
        subjectName && subjectName.includes("गणित") ? "maths" : "",
        subjectName && ((subjectName.includes("परिसर") || subjectName.includes("evs")) && (subjectName.includes("१") || subjectName.includes("1") || subjectName.includes("भाग १") || subjectName.includes("भाग 1"))) ? "evs1" : "",
        subjectName && ((subjectName.includes("परिसर") || subjectName.includes("evs")) && (subjectName.includes("२") || subjectName.includes("2") || subjectName.includes("भाग २") || subjectName.includes("भाग 2"))) ? "evs2" : "",
        subjectName && ((subjectName.includes("परिसर") || subjectName.includes("evs")) && (subjectName.includes("१") || subjectName.includes("1") || subjectName.includes("भाग १") || subjectName.includes("भाग 1"))) ? "parisar1" : "",
        subjectName && ((subjectName.includes("परिसर") || subjectName.includes("evs")) && (subjectName.includes("२") || subjectName.includes("2") || subjectName.includes("भाग २") || subjectName.includes("भाग 2"))) ? "parisar2" : "",
        subjectName && (subjectName.includes("परिसर") || subjectName.includes("संभोवतालचे")) && !subjectName.includes("१") && !subjectName.includes("२") && !subjectName.includes("1") && !subjectName.includes("2") ? "evs" : "",
        subjectName && (subjectName.includes("सामान्य विज्ञान") || subjectName.includes("विज्ञान")) ? "science" : "",
        subjectName && (subjectName.includes("इतिहास") || subjectName.includes("नागरिकशास्त्र")) ? "history" : "",
        subjectName && subjectName.includes("भूगोल") ? "geography" : "",
        subjectName && subjectName.includes("कला") ? "kala" : "",
        subjectName && (subjectName.includes("कार्यानुभव") || subjectName.includes("कार्यशिक्षण") || subjectName.includes("कार्य")) ? "karyanubhav" : "",
        subjectName && (subjectName.includes("शारीरिक") || subjectName.includes("आरोग्य")) ? "sharirik" : "",
      ].filter(Boolean))
    );

    const possibleOutcomeCodes = Array.from(
      new Set([
        outcomeCode,
        outcomeCode ? outcomeCode.toLowerCase() : "",
        outcomeCode ? outcomeCode.toUpperCase() : "",
        outcomeCode ? outcomeCode.replace(/_/g, ".") : "",
        outcomeCode ? outcomeCode.replace(/\./g, "_") : "",
        outcomeCode ? outcomeCode.replace(/^[A-Za-z]+_?/, "") : "",
      ].filter(Boolean))
    );

    const sources = [outcomesRatings, levelsData];

    for (const source of sources) {
      if (!source || typeof source !== "object") continue;

      // Structure A: source[subKey][code][studentId]
      for (const subKey of possibleSubKeys) {
        const subData = source[subKey];
        if (!subData || typeof subData !== "object") continue;

        for (const code of possibleOutcomeCodes) {
          const codeData = subData[code];
          if (codeData && typeof codeData === "object") {
            for (const stdKey of possibleStudentKeys) {
              const res = parseLevelVal(codeData[stdKey]);
              if (res) return res;
            }
          }
        }

        // Structure B: source[subKey][studentId][code]
        for (const stdKey of possibleStudentKeys) {
          const stdData = subData[stdKey];
          if (stdData && typeof stdData === "object") {
            for (const code of possibleOutcomeCodes) {
              const res = parseLevelVal(stdData[code]);
              if (res) return res;
            }
          }
        }
      }

      // Structure C: source[studentId][subKey][code] or source[studentId][code]
      for (const stdKey of possibleStudentKeys) {
        const stdData = source[stdKey];
        if (!stdData || typeof stdData !== "object") continue;

        for (const code of possibleOutcomeCodes) {
          const res = parseLevelVal(stdData[code]);
          if (res) return res;
        }

        for (const subKey of possibleSubKeys) {
          const subData = stdData[subKey];
          if (subData && typeof subData === "object") {
            for (const code of possibleOutcomeCodes) {
              const res = parseLevelVal(subData[code]);
              if (res) return res;
            }
          }
        }
      }

      // Structure D: source[code][studentId]
      for (const code of possibleOutcomeCodes) {
        const codeData = source[code];
        if (codeData && typeof codeData === "object") {
          for (const stdKey of possibleStudentKeys) {
            const res = parseLevelVal(codeData[stdKey]);
            if (res) return res;
          }
        }
      }
    }

    return null;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 font-sans">
        <Loader2 className="size-10 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-700">माहिती लोड होत आहे, कृपया वाट पाहा...</p>
      </div>
    );
  }

  // Fetch Class-Specific Outcomes
  const marathiOutcomes = getClassOutcomes(selectedClass, "marathi", customOutcomesData);
  const hindiOutcomes = getClassOutcomes(selectedClass, "hindi", customOutcomesData);
  const englishOutcomes = getClassOutcomes(selectedClass, "english", customOutcomesData);
  const mathsOutcomes = getClassOutcomes(selectedClass, "math", customOutcomesData);
  const evs1Outcomes = getClassOutcomes(selectedClass, "evs1", customOutcomesData);
  const evs2Outcomes = getClassOutcomes(selectedClass, "evs2", customOutcomesData);
  const evsUnifiedOutcomes = [...(evs1Outcomes || []), ...(evs2Outcomes || [])];
  const scienceOutcomes = getClassOutcomes(selectedClass, "science", customOutcomesData);
  const historyOutcomes = getClassOutcomes(selectedClass, "history", customOutcomesData);
  const geographyOutcomes = getClassOutcomes(selectedClass, "geography", customOutcomesData);
  const kalaOutcomes = getClassOutcomes(selectedClass, "kala", customOutcomesData);
  const karyanubhavOutcomes = getClassOutcomes(selectedClass, "karyanubhav", customOutcomesData);
  const sharirikOutcomes = getClassOutcomes(selectedClass, "sharirik", customOutcomesData);

  return (
    <div className="text-black" style={{ fontFamily: "'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', 'Inter', sans-serif", letterSpacing: 0 }}>
      {/* Top Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-600">
              <ArrowLeft className="size-5" />
            </button>
          )}
          <div>
            <h2 className="text-base font-black text-slate-800">अध्ययन निष्पत्तीनिहाय संपादणूक प्रगतीदर्शक नोंदतक्ता</h2>
            <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">{selectedClass} • {academicYear}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode("matrix")}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                viewMode === "matrix"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              संकलन तक्ता
            </button>
            <button
              type="button"
              onClick={() => setViewMode("student")}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                viewMode === "student"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              विद्यार्थीनिहाय
            </button>
          </div>
          <button
            onClick={handleDownloadPdf}
            disabled={downloading || (viewMode === "student" && students.length === 0)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md shadow-blue-200 flex items-center gap-2 disabled:opacity-50"
          >
            {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            <span>{downloading ? "डाउनलोड होत आहे..." : "PDF डाऊनलोड करा"}</span>
          </button>
        </div>
      </div>

      {students.length === 0 && (
        <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200 mb-6 text-center max-w-xl mx-auto no-print">
          <AlertCircle className="size-8 text-amber-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-amber-800 mb-1">या वर्गामध्ये अद्याप कोणतेही विद्यार्थी जोडलेले नाहीत</h3>
          <p className="text-xs text-amber-700">कृपया डॅशबोर्डवरील <b>'विद्यार्थी'</b> विभागात जाऊन या वर्गासाठी विद्यार्थी जोडा.</p>
        </div>
      )}

      {/* -------------------- 1. SCREEN VIEW -------------------- */}
      {viewMode === "matrix" ? (
        <div className="cce-screen-view w-full max-w-5xl mx-auto space-y-6 mb-8 no-print overflow-x-hidden">
          {(() => {
            const activeSubjectSections = [
              { key: "मराठी", title: "मराठी", outcomes: marathiOutcomes, subjectName: "मराठी", isEnglish: false },
              { key: "हिंदी", title: "हिंदी", outcomes: hindiOutcomes, subjectName: "हिंदी", isEnglish: false },
              { key: "गणित", title: "गणित", outcomes: mathsOutcomes, subjectName: "गणित", isEnglish: false },
              { key: "इंग्रजी", title: "इंग्रजी", outcomes: englishOutcomes, subjectName: "इंग्रजी", isEnglish: true },
              { key: "परिसर अभ्यास", title: "परिसर अभ्यास", outcomes: evsUnifiedOutcomes, subjectName: "परिसर अभ्यास", isEnglish: false },
              { key: "सामान्य विज्ञान", title: "सामान्य विज्ञान", outcomes: scienceOutcomes, subjectName: "सामान्य विज्ञान", isEnglish: false },
              { key: "इतिहास व नागरिकशास्त्र", title: "इतिहास व नागरिकशास्त्र", outcomes: historyOutcomes, subjectName: "इतिहास व नागरिकशास्त्र", isEnglish: false },
              { key: "भूगोल", title: "भूगोल", outcomes: geographyOutcomes, subjectName: "भूगोल", isEnglish: false },
              { key: "कला", title: "कलाशिक्षण", outcomes: kalaOutcomes, subjectName: "कलाशिक्षण", isEnglish: false },
              { key: "कार्यानुभव", title: "कार्यशिक्षण", outcomes: karyanubhavOutcomes, subjectName: "कार्यशिक्षण", isEnglish: false },
              { key: "शारीरिक", title: "शारीरिक शिक्षण", outcomes: sharirikOutcomes, subjectName: "शारीरिक", isEnglish: false },
            ].filter((sec) => isSubjectActive(sec.key) && sec.outcomes && sec.outcomes.length > 0);

            const COLS_PER_PAGE = 16;
            const studentBatches = [];
            if (students.length === 0) {
              studentBatches.push(Array(COLS_PER_PAGE).fill(null));
            } else {
              for (let i = 0; i < students.length; i += COLS_PER_PAGE) {
                const slice = students.slice(i, i + COLS_PER_PAGE);
                while (slice.length < COLS_PER_PAGE) slice.push(null);
                studentBatches.push(slice);
              }
            }

            return activeSubjectSections.map((sec) =>
              studentBatches.map((batch, bIdx) => (
                <A4PageWrapper key={`matrix_${sec.key}_${bIdx}`} isLandscape={false}>
                  <div className="bg-white p-4 border border-slate-300 rounded-2xl shadow-sm w-[794px] min-w-[794px] max-w-[794px] box-border">
                    <div className="mb-3">
                      <h1 className="text-[18px] font-extrabold text-blue-900 text-center mb-2.5 border-b-2 border-blue-900 pb-1">
                        अध्ययन निष्पत्ती संकलन तक्ता
                      </h1>
                      <div className="flex flex-wrap items-center justify-between text-[12.5px] font-bold text-slate-900 bg-slate-100 p-2.5 px-3.5 rounded-lg border border-slate-400 mb-3 gap-2">
                        <span>शाळेचे नाव - <b className="text-black font-extrabold">{schoolData.schoolName || schoolName || ""}</b></span>
                        <span>इयत्ता - <b className="text-black font-extrabold">{toMarathiClassLabel(selectedClass)}</b></span>
                        <span className="font-extrabold">{selectedSemester === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}</span>
                      </div>
                      <div className="mb-3">
                        <h3 className="text-[13px] font-extrabold text-black text-center bg-amber-100 py-1.5 px-3 rounded-lg border-2 border-amber-400 shadow-sm">
                          {sec.title}
                        </h3>
                      </div>
                    </div>
                    <div className="w-full border-2 border-slate-500 rounded-lg overflow-hidden bg-white">
                    <table className="w-full border-collapse table-fixed text-black" style={{ width: "100%", tableLayout: "fixed" }}>
                    <colgroup>
                      <col style={{ width: "7%" }} width="7%" />
                      <col style={{ width: "36%" }} width="36%" />
                      {batch.map((_, cIdx) => (
                        <col key={cIdx} style={{ width: "3.1875%" }} width="3.1875%" />
                      ))}
                      <col style={{ width: "6%" }} width="6%" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th rowSpan={2} style={{ width: "7%", minWidth: "7%", maxWidth: "7%", boxSizing: "border-box" }} className="border border-black p-1 text-center align-middle font-bold text-[10px] leading-tight bg-slate-100">
                          अध्ययन<br />निष्पत्ती /<br />क्षमता क्र.
                        </th>
                        <th style={{ width: "36%", minWidth: "36%", maxWidth: "36%", boxSizing: "border-box" }} className="border border-black p-2 h-[132px] text-center align-middle font-bold text-[13px]">
                          विद्यार्थ्यांचे नाव
                        </th>
                        {batch.map((stu, cIdx) => (
                          <th key={cIdx} style={{ width: "3.1875%", minWidth: "3.1875%", maxWidth: "3.1875%", boxSizing: "border-box" }} className="border border-black p-0 h-[132px] relative text-center align-middle font-bold text-[10px] overflow-hidden">
                            <div
                              style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%) rotate(-90deg)",
                                width: "126px",
                                lineHeight: 1.2,
                              }}
                              className="whitespace-nowrap overflow-hidden text-ellipsis text-center"
                            >
                              {stu ? stu.fullName || stu.name || "" : ""}
                            </div>
                          </th>
                        ))}
                        <th rowSpan={2} style={{ width: "6%", minWidth: "6%", maxWidth: "6%", boxSizing: "border-box" }} className="border border-black p-1 text-center align-middle font-bold text-[11px]">
                          एकूण
                        </th>
                      </tr>
                      <tr>
                        <th style={{ width: "36%", minWidth: "36%", maxWidth: "36%", boxSizing: "border-box" }} className="border border-black px-2 py-1 h-[26px] align-middle font-bold text-xs">
                          <div className="flex items-center justify-between">
                            <span className="flex-1 text-center">अध्ययन निष्पत्ती</span>
                            <span className="text-[10px] whitespace-nowrap">ह.क्र. →</span>
                          </div>
                        </th>
                        {batch.map((stu, cIdx) => (
                          <th key={cIdx} style={{ width: "3.1875%", minWidth: "3.1875%", maxWidth: "3.1875%", boxSizing: "border-box" }} className="border border-black p-0.5 h-[26px] text-center align-middle font-bold text-[11.5px] leading-[1.1]">
                            {stu ? toMarathiDigitsLocal(stu.rollNo || cIdx + 1) : ""}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sec.outcomes.map((item, oIdx) => {
                        const rawCode = String(item.code || "").replace(/^C-/i, "");
                        const displayCode = sec.isEnglish ? rawCode : toMarathiDigitsLocal(rawCode);
                        let ratedCount = 0;
                        return (
                          <tr key={`${sec.key}_${oIdx}`}>
                            <td style={{ width: "7%", minWidth: "7%", maxWidth: "7%", boxSizing: "border-box" }} className="border border-black px-1 py-1 text-center align-middle font-bold text-[10.5px] whitespace-nowrap">
                              {displayCode}
                            </td>
                            <td style={{ width: "36%", minWidth: "36%", maxWidth: "36%", boxSizing: "border-box" }} className="border border-black px-1.5 py-1 text-left align-middle font-bold text-[11px] leading-snug">
                              {item.text}
                            </td>
                            {batch.map((stu, cIdx) => {
                              const lvl = stu ? getUserSelectedLevel(stu, item.code, sec.subjectName) : 0;
                              if (lvl >= 1 && lvl <= 4) ratedCount++;
                              return (
                                <td key={cIdx} style={{ width: "3.1875%", minWidth: "3.1875%", maxWidth: "3.1875%", boxSizing: "border-box" }} className="border border-black p-0.5 text-center align-middle font-bold text-[11.5px]">
                                  {lvl >= 1 && lvl <= 4 ? toMarathiDigitsLocal(lvl) : ""}
                                </td>
                              );
                            })}
                            <td style={{ width: "6%", minWidth: "6%", maxWidth: "6%", boxSizing: "border-box" }} className="border border-black p-0.5 text-center align-middle font-bold text-[11px]">
                              {ratedCount > 0 ? toMarathiDigitsLocal(ratedCount) : ""}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                  <div className="flex items-end justify-between pt-3 mt-3 text-xs font-bold text-black border-t border-slate-300">
                    <div className="text-center min-w-[140px]">
                      <p className="font-extrabold text-black mb-1">{schoolData.teacherName || ""}</p>
                      <div className="border-t border-black pt-1 text-[11.5px] font-extrabold text-black">
                        वर्गशिक्षक स्वाक्षरी
                      </div>
                    </div>
                    <div className="text-center min-w-[140px]">
                      <p className="font-extrabold text-black mb-1">{schoolData.headmasterName || ""}</p>
                      <div className="border-t border-black pt-1 text-[11.5px] font-extrabold text-black">
                        मुख्याध्यापक स्वाक्षरी
                      </div>
                    </div>
                  </div>
                </div>
              </A4PageWrapper>
            ))
          );
          })()}
        </div>
      ) : (
      <div className="cce-screen-view w-full max-w-4xl mx-auto space-y-6 mb-8 no-print overflow-x-hidden">
        {students.map((student) => {
          const activeSubjectSections = [
            { key: "मराठी", title: "प्रथम भाषा: मराठी", outcomes: marathiOutcomes, subjectName: "मराठी" },
            { key: "हिंदी", title: "द्वितीय भाषा: हिंदी", outcomes: hindiOutcomes, subjectName: "हिंदी" },
            { key: "गणित", title: "गणित", outcomes: mathsOutcomes, subjectName: "गणित" },
            { key: "इंग्रजी", title: "तृतीय भाषा: इंग्रजी", outcomes: englishOutcomes, subjectName: "इंग्रजी" },
            { key: "परिसर अभ्यास", title: "परिसर अभ्यास", outcomes: evsUnifiedOutcomes, subjectName: "परिसर अभ्यास" },
            { key: "सामान्य विज्ञान", title: "सामान्य विज्ञान", outcomes: scienceOutcomes, subjectName: "सामान्य विज्ञान" },
            { key: "इतिहास व नागरिकशास्त्र", title: "इतिहास व नागरिकशास्त्र", outcomes: historyOutcomes, subjectName: "इतिहास व नागरिकशास्त्र" },
            { key: "भूगोल", title: "भूगोल", outcomes: geographyOutcomes, subjectName: "भूगोल" },
            { key: "कला", title: "कलाशिक्षण", outcomes: kalaOutcomes, subjectName: "कलाशिक्षण" },
            { key: "कार्यानुभव", title: "कार्यशिक्षण", outcomes: karyanubhavOutcomes, subjectName: "कार्यशिक्षण" },
            { key: "शारीरिक", title: "शारीरिक शिक्षण व आरोग्य", outcomes: sharirikOutcomes, subjectName: "शारीरिक" },
          ].filter((sec) => isSubjectActive(sec.key) && sec.outcomes && sec.outcomes.length > 0);

          return (
            <div key={`screen_${student.id}`} className="space-y-6">
              {activeSubjectSections.map((sec) => (
                <A4PageWrapper key={`screen_${student.id}_${sec.key}`} isLandscape={false}>
                  <div className="bg-white p-5 border border-slate-300 rounded-xl shadow-sm w-[794px] min-w-[794px] max-w-[794px] box-border">
                    {/* Integrated Boxed Table for Web Screen View */}
                    <OutcomeTable
                      title={sec.title}
                      outcomes={sec.outcomes}
                      subjectName={sec.subjectName}
                      getUserSelectedLevel={getUserSelectedLevel}
                      student={student}
                      schoolData={schoolData}
                      selectedClass={selectedClass}
                      division={division}
                      selectedSemester={selectedSemester}
                      showHeader={true}
                    />

                    <div className="flex items-end justify-between pt-3 mt-3 text-xs font-bold text-black border-t border-slate-300">
                      <div className="text-center min-w-[140px]">
                        <p className="font-extrabold text-black mb-1">{schoolData.teacherName || ""}</p>
                        <div className="border-t border-black pt-1 text-[11.5px] font-extrabold text-black">
                          वर्गशिक्षक स्वाक्षरी
                        </div>
                      </div>
                      <div className="text-center min-w-[140px]">
                        <p className="font-extrabold text-black mb-1">{schoolData.headmasterName || ""}</p>
                        <div className="border-t border-black pt-1 text-[11.5px] font-extrabold text-black">
                          मुख्याध्यापक स्वाक्षरी
                        </div>
                      </div>
                    </div>
                  </div>
                </A4PageWrapper>
              ))}
            </div>
          );
        })}
      </div>
      )}

      {/* -------------------- 2. PDF CAPTURE CONTAINER (PAGINATED & BALANCED A4 PAGES FOR PDF DOWNLOAD) -------------------- */}
      <div ref={printRef} className="cce-pdf-container max-w-4xl mx-auto hidden print:block">
        <style>{`
          .cce-pdf-container .pdf-page, .cce-pdf-container .pdf-page * {
            font-weight: 700 !important;
          }
          .cce-pdf-container .pdf-page .font-extrabold, .cce-pdf-container .pdf-page b, .cce-pdf-container .pdf-page strong, .cce-pdf-container .pdf-page th, .cce-pdf-container .pdf-page h1, .cce-pdf-container .pdf-page h2, .cce-pdf-container .pdf-page h3 {
            font-weight: 800 !important;
          }
          .cce-pdf-container .pdf-page .font-black {
            font-weight: 900 !important;
          }
        `}</style>
        {(() => {
          const displayedStudents = students;
          let globalPageIndex = 0;

          // Dynamically balances outcomes across pages to fully fill A4 page height
          const chunkSubjectOutcomes = (outcomes, maxPerPage = 20) => {
            if (!outcomes || outcomes.length === 0) return [];
            const total = outcomes.length;
            if (total <= maxPerPage) return [outcomes];
            const numPages = Math.ceil(total / maxPerPage);
            const itemsPerPage = Math.ceil(total / numPages);
            const chunks = [];
            for (let i = 0; i < total; i += itemsPerPage) {
              chunks.push(outcomes.slice(i, i + itemsPerPage));
            }
            return chunks;
          };

          return displayedStudents.flatMap((student) => {
            const activeSubjectSections = [
              { key: "मराठी", title: "प्रथम भाषा: मराठी", outcomes: marathiOutcomes, subjectName: "मराठी" },
              { key: "हिंदी", title: "द्वितीय भाषा: हिंदी", outcomes: hindiOutcomes, subjectName: "हिंदी" },
              { key: "गणित", title: "गणित", outcomes: mathsOutcomes, subjectName: "गणित" },
              { key: "इंग्रजी", title: "तृतीय भाषा: इंग्रजी", outcomes: englishOutcomes, subjectName: "इंग्रजी" },
              { key: "परिसर अभ्यास", title: "परिसर अभ्यास", outcomes: evsUnifiedOutcomes, subjectName: "परिसर अभ्यास" },
              { key: "सामान्य विज्ञान", title: "सामान्य विज्ञान", outcomes: scienceOutcomes, subjectName: "सामान्य विज्ञान" },
              { key: "इतिहास व नागरिकशास्त्र", title: "इतिहास व नागरिकशास्त्र", outcomes: historyOutcomes, subjectName: "इतिहास व नागरिकशास्त्र" },
              { key: "भूगोल", title: "भूगोल", outcomes: geographyOutcomes, subjectName: "भूगोल" },
              { key: "कला", title: "कलाशिक्षण", outcomes: kalaOutcomes, subjectName: "कलाशिक्षण" },
              { key: "कार्यानुभव", title: "कार्यशिक्षण", outcomes: karyanubhavOutcomes, subjectName: "कार्यशिक्षण" },
              { key: "शारीरिक", title: "शारीरिक शिक्षण व आरोग्य", outcomes: sharirikOutcomes, subjectName: "शारीरिक" },
            ].filter((sec) => isSubjectActive(sec.key) && sec.outcomes && sec.outcomes.length > 0);

            return activeSubjectSections.flatMap((sec) => {
              const chunks = chunkSubjectOutcomes(sec.outcomes, 20);

              return chunks.map((outcomeChunk, chunkIdx) => {
                const isFirstPage = globalPageIndex === 0;
                globalPageIndex++;
                const totalParts = chunks.length;
                const partTitle = totalParts > 1
                  ? `${sec.title} (भाग ${chunkIdx + 1}/${totalParts})`
                  : sec.title;

                return (
                  <div
                    key={`${student.id}_${sec.key}_part_${chunkIdx}`}
                    className={`pdf-page bg-white p-5 border border-black flex flex-col justify-between mb-4 ${
                      !isFirstPage ? "pdf-page-break" : ""
                    }`}
                    style={{
                      minHeight: "275mm",
                      boxSizing: "border-box",
                      pageBreakBefore: isFirstPage ? "auto" : "always",
                      breakBefore: isFirstPage ? "auto" : "page",
                      pageBreakInside: "avoid",
                      breakInside: "avoid",
                    }}
                  >
                    <div>
                      {/* Integrated Boxed Table */}
                      <OutcomeTable
                        title={partTitle}
                        outcomes={outcomeChunk}
                        subjectName={sec.subjectName}
                        getUserSelectedLevel={getUserSelectedLevel}
                        student={student}
                        schoolData={schoolData}
                        selectedClass={selectedClass}
                        division={division}
                        selectedSemester={selectedSemester}
                        showHeader={true}
                      />
                    </div>

                    {/* Signatures Footer (Only at the end of subject) */}
                    {chunkIdx === chunks.length - 1 ? (
                      <div
                        className="flex items-end justify-between pt-3 mt-3 text-xs font-bold text-black"
                        style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
                      >
                        <div className="text-center min-w-[140px]">
                          <p className="font-extrabold text-black mb-1">{schoolData.teacherName || ""}</p>
                          <div className="border-t border-black pt-1 text-[11.5px] font-extrabold text-black">
                            वर्गशिक्षक स्वाक्षरी
                          </div>
                        </div>
                        <div className="text-center min-w-[140px]">
                          <p className="font-extrabold text-black mb-1">{schoolData.headmasterName || ""}</p>
                          <div className="border-t border-black pt-1 text-[11.5px] font-extrabold text-black">
                            मुख्याध्यापक स्वाक्षरी
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-right text-[11px] font-bold text-slate-600 pt-2">
                        <span>(पुढील पानावर सुरू...)</span>
                      </div>
                    )}
                  </div>
                );
              });
            });
          });
        })()}
      </div>
    </div>
  );
};

export default SubjectWiseResult;
