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

const OutcomeTable = ({ title, outcomes, subjectName, getUserSelectedLevel, student }) => {
  if (!outcomes || outcomes.length === 0) return null;

  return (
    <div className="mb-3">
      {/* Subject Title Banner */}
      <h3
        className="text-[13px] font-extrabold text-black mb-2 text-center bg-amber-100 py-1.5 px-3 rounded-lg border-2 border-amber-400 shadow-sm"
        style={{ breakAfter: "avoid", pageBreakAfter: "avoid" }}
      >
        {title}
      </h3>

      {/* Semantic HTML Table for 100% html2canvas border rendering */}
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
                  <td className="border-r border-slate-400 p-1 text-center font-extrabold text-blue-900 text-[15px]">
                    {level === 1 ? "✓" : ""}
                  </td>
                  <td className="border-r border-slate-400 p-1 text-center font-extrabold text-blue-900 text-[15px]">
                    {level === 2 ? "✓" : ""}
                  </td>
                  <td className="border-r border-slate-400 p-1 text-center font-extrabold text-blue-900 text-[15px]">
                    {level === 3 ? "✓" : ""}
                  </td>
                  <td className="p-1 text-center font-extrabold text-blue-900 text-[15px]">
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

        for (const cls of classVariants) {
          try {
            const customListSnap = await getDoc(doc(db, "cce_outcomes_list_v2", `${cls}_${academicYear}`));
            if (customListSnap.exists() && customListSnap.data().outcomes) {
              mergedCustomOutcomes = { ...mergedCustomOutcomes, ...customListSnap.data().outcomes };
            }
          } catch (e) { }
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

      // 3. Fetch User Outcome Ratings (from cce_outcomes, cce_levels_v2 & Bunny CDN)
      try {
        const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
        const bunnyOutcomes = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_outcomes.json`);
        const bunnyLevels = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_levels.json`);

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

        // Query documents matching the selected semester strictly to prevent cross-semester overwrites
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

        let mergedRatings = {};
        for (const oDocId of outcomeDocIds) {
          try {
            const outSnap = await getDoc(doc(db, "cce_outcomes", oDocId));
            if (outSnap.exists()) {
              const rData = outSnap.data().ratings || outSnap.data();
              mergedRatings = deepMergeRatings(mergedRatings, rData);
            }
          } catch (e) { }
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

        // Fetch levels data (teacher-isolated first)
        let mergedLevels = {};
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

        for (const lDocId of levelDocIds) {
          try {
            const levSnap = await getDoc(doc(db, "cce_levels_v2", lDocId));
            if (levSnap.exists()) {
              const lData = levSnap.data().levelsData || levSnap.data();
              mergedLevels = deepMergeRatings(mergedLevels, lData);
            }
          } catch (e) { }
        }
        if (bunnyLevels) {
          mergedLevels = deepMergeRatings(mergedLevels, bunnyLevels);
        }
        setLevelsData(mergedLevels);
      } catch (e) {
        console.error("Error fetching outcome levels:", e);
      }

      // 4. Fetch Marks Data (teacher-isolated first)
      try {
        const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
        const bunnyMarksSec = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_marks_second.json`);
        const bunnyMarksFirst = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_marks_first.json`);

        let mergedMarks = {};
        const marksDocIds = [
          currentTeacherId ? `${currentTeacherId}_${selectedClass}_${academicYear}` : null,
          currentTeacherId ? `${currentTeacherId}_${selectedClass}_${currentMedium}_${academicYear}` : null,
          docId,
        ].filter(Boolean);
        for (const mDocId of marksDocIds) {
          try {
            const marksSnap = await getDoc(doc(db, "cce_marks_v2", mDocId));
            if (marksSnap.exists()) {
              const mData = marksSnap.data();
              const mRecords = selectedSemester === "sem1"
                ? (mData.semester1 || mData.semester2 || mData.marksData || mData.data || mData || {})
                : (mData.semester2 || mData.semester1 || mData.marksData || mData.data || mData || {});
              mergedMarks = { ...mergedMarks, ...mRecords };
            }
          } catch (e) { }
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

      const activeSections = [
        { key: "मराठी", title: "मराठी", outcomes: mOutcomes, subjectName: "मराठी", isEnglish: false },
        { key: "हिंदी", title: "हिंदी", outcomes: hOutcomes, subjectName: "हिंदी", isEnglish: false },
        { key: "गणित", title: "गणित", outcomes: mtOutcomes, subjectName: "गणित", isEnglish: false },
        { key: "इंग्रजी", title: "इंग्रजी", outcomes: eOutcomes, subjectName: "इंग्रजी", isEnglish: true },
        { key: "परिसर अभ्यास १", title: "परिसर अभ्यास १", outcomes: ev1Outcomes, subjectName: "परिसर अभ्यास १", isEnglish: false },
        { key: "परिसर अभ्यास २", title: "परिसर अभ्यास २", outcomes: ev2Outcomes, subjectName: "परिसर अभ्यास २", isEnglish: false },
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
            return `<th style="border: 1px solid #000000; padding: 0; height: 132px; position: relative; vertical-align: middle; text-align: center; font-weight: 700; font-size: 10px; color: #000000; overflow: hidden;">
              <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-90deg); width: 126px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">${name}</div>
            </th>`;
          })
          .join("");

        const rollCells = batch
          .map((stu, bIdx) => {
            const roll = stu ? (stu.rollNo || bIdx + 1) : "";
            const label = roll ? toMarathiDigitsLocal(roll) : "";
            return `<th style="border: 1px solid #000000; padding: 2px 1px; height: 26px; text-align: center; vertical-align: middle; font-weight: 700; font-size: 11.5px; line-height: 1.1; color: #000000;">${label}</th>`;
          })
          .join("");

        return `
          <thead>
            <tr>
              <th colspan="2" style="border: 1px solid #000000; padding: 5px 8px; text-align: left; font-weight: 700; font-size: 12px; color: #000000;">शाळेचे नाव - ${schoolName}</th>
              <th colspan="7" style="border: 1px solid #000000; padding: 5px 4px; text-align: center; font-weight: 700; font-size: 12.5px; color: #000000;">अध्ययन निष्पत्ती संकलन तक्ता</th>
              <th colspan="4" style="border: 1px solid #000000; padding: 5px 4px; text-align: center; font-weight: 700; font-size: 12px; color: #000000;">इयत्ता - ${marathiClass}</th>
              <th colspan="6" style="border: 1px solid #000000; padding: 5px 4px; text-align: center; font-weight: 700; font-size: 12px; color: #000000;">विषय - ${secTitle}</th>
            </tr>
            <tr>
              <th rowspan="2" style="border: 1px solid #000000; padding: 4px 2px; text-align: center; vertical-align: middle; font-weight: 700; font-size: 10px; line-height: 1.25; color: #000000;">अध्ययन<br/>निष्पत्ती /<br/>क्षमता क्र.</th>
              <th style="border: 1px solid #000000; padding: 6px; height: 132px; text-align: center; vertical-align: middle; font-weight: 700; font-size: 13px; color: #000000;">विद्यार्थ्यांचे नाव</th>
              ${stuNameCells}
              <th rowspan="2" style="border: 1px solid #000000; padding: 4px 2px; text-align: center; vertical-align: middle; font-weight: 700; font-size: 11px; color: #000000;">एकूण</th>
            </tr>
            <tr>
              <th style="border: 1px solid #000000; padding: 2px 8px; height: 26px; vertical-align: middle; font-weight: 700; font-size: 12px; color: #000000;">
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
          .fill('<col style="width: 3.1875%;" />')
          .join("");
        return `
          <colgroup>
            <col style="width: 7%;" />
            <col style="width: 36%;" />
            ${stuCols}
            <col style="width: 6%;" />
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
                  return `<td style="border: 1px solid #000000; padding: 2px; text-align: center; vertical-align: middle;"></td>`;
                }
                const lvl = getUserSelectedLevel(stu, item.code, sec.subjectName);
                if (lvl >= 1 && lvl <= 4) {
                  ratedCount++;
                  return `<td style="border: 1px solid #000000; padding: 2px; text-align: center; vertical-align: middle; font-weight: 700; font-size: 11.5px; color: #000000;">${toMarathiDigitsLocal(lvl)}</td>`;
                }
                return `<td style="border: 1px solid #000000; padding: 2px; text-align: center; vertical-align: middle;"></td>`;
              })
              .join("");

            const totalText = ratedCount > 0 ? toMarathiDigitsLocal(ratedCount) : "";
            return `
              <tr>
                <td style="border: 1px solid #000000; padding: 3px 2px; text-align: center; vertical-align: middle; font-weight: 700; font-size: 10.5px; color: #000000; white-space: nowrap;">${displayCode}</td>
                <td style="border: 1px solid #000000; padding: 3px 5px; text-align: left; vertical-align: middle; font-weight: 700; font-size: 11px; line-height: 1.28; color: #000000;">${item.text}</td>
                ${stuCells}
                <td style="border: 1px solid #000000; padding: 2px; text-align: center; vertical-align: middle; font-weight: 700; font-size: 11px; color: #000000;">${totalText}</td>
              </tr>
            `;
          });

          // Measure row heights on A4 container
          const measureEl = document.createElement("div");
          measureEl.style.cssText =
            "width: 794px; padding: 18px; box-sizing: border-box; background: #ffffff; font-family: 'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', 'Inter', sans-serif;";
          measureEl.innerHTML = `
            <table style="width: 100%; border-collapse: collapse; table-layout: fixed; color: #000000;">
              ${buildColgroupHtml()}
              ${buildTableHeadHtml(batch, sec.title)}
              <tbody id="mm_tbody">${allRowsHtml.join("")}</tbody>
            </table>
          `;
          tempContainer.appendChild(measureEl);

          const theadH = measureEl.querySelector("thead")?.getBoundingClientRect().height || 145;
          const trNodes = Array.from(measureEl.querySelectorAll("#mm_tbody tr"));
          const rowHeights = trNodes.map((tr) =>
            Math.max(24, Math.ceil(tr.getBoundingClientRect().height || 26))
          );
          tempContainer.removeChild(measureEl);

          const maxBodyHeight = 1122 - 36 - theadH - 18;
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

          for (const chunkRows of chunks) {
            const pageEl = document.createElement("div");
            pageEl.style.cssText =
              "width: 794px; min-height: 1122px; padding: 18px; box-sizing: border-box; background: #ffffff; font-family: 'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', 'Inter', sans-serif;";
            pageEl.innerHTML = `
              <table style="width: 100%; border-collapse: collapse; table-layout: fixed; color: #000000;">
                ${buildColgroupHtml()}
                ${buildTableHeadHtml(batch, sec.title)}
                <tbody>${chunkRows.join("")}</tbody>
              </table>
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

      for (const student of students) {
        const activeSubjectSections = [
          { key: "मराठी", title: "प्रथम भाषा: मराठी", outcomes: marathiOutcomes, subjectName: "मराठी" },
          { key: "हिंदी", title: "द्वितीय भाषा: हिंदी", outcomes: hindiOutcomes, subjectName: "हिंदी" },
          { key: "गणित", title: "गणित", outcomes: mathsOutcomes, subjectName: "गणित" },
          { key: "इंग्रजी", title: "तृतीय भाषा: इंग्रजी", outcomes: englishOutcomes, subjectName: "इंग्रजी" },
          { key: "परिसर अभ्यास १", title: "परिसर अभ्यास १", outcomes: evs1Outcomes, subjectName: "परिसर अभ्यास १" },
          { key: "परिसर अभ्यास २", title: "परिसर अभ्यास २", outcomes: evs2Outcomes, subjectName: "परिसर अभ्यास २" },
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
                <span>इयत्ता - <b style="color: #000000; font-weight: 800;">${selectedClass}</b></span>
                <span>तुकडी - <b style="color: #000000; font-weight: 800;">${student.division || student.section || student.tukdi || division}</b></span>
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
            <div id="m_footer" style="display: flex; align-items: center; justify-content: space-between; padding-top: 7px; border-top: 1px solid #94a3b8; margin-top: 6px; font-size: 12px; font-weight: 700; color: #0f172a;">
              <div style="text-align: center;">
                <p style="font-weight: 800; margin: 0; color: #000000;">${schoolData.teacherName || "वर्गशिक्षक"}</p>
                <p style="font-size: 11px; color: #1e293b; font-weight: 700; margin: 0;">वर्गशिक्षक</p>
              </div>
              <div style="text-align: center;">
                <p style="font-weight: 800; margin: 0; color: #000000;">${schoolData.headmasterName || "मुख्याध्यापक"}</p>
                <p style="font-size: 11px; color: #1e293b; font-weight: 700; margin: 0;">मुख्याध्यापक</p>
              </div>
            </div>
          `;

          container.appendChild(measureEl);

          // Measure heights directly from DOM
          const h1H = measureEl.querySelector("#m_title")?.getBoundingClientRect().height || 33;
          const stdH = measureEl.querySelector("#m_student")?.getBoundingClientRect().height || 37;
          const bannerH = measureEl.querySelector("#m_banner")?.getBoundingClientRect().height || 35;
          const theadH = measureEl.querySelector("#m_thead_row")?.getBoundingClientRect().height || 38;
          const footerH = measureEl.querySelector("#m_footer")?.getBoundingClientRect().height || 41;

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
              secKey: sec.key,
              subjectName: sec.subjectName,
              outcomesChunk: chunk,
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
                <span>इयत्ता - <b style="color: #000000; font-weight: 800;">${selectedClass}</b></span>
                <span>तुकडी - <b style="color: #000000; font-weight: 800;">${student.division || student.section || student.tukdi || division}</b></span>
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
            <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 7px; border-top: 1px solid #94a3b8; margin-top: 6px; font-size: 12px; font-weight: 700; color: #0f172a;">
              <div style="text-align: center;">
                <p style="font-weight: 800; margin: 0; color: #000000;">${schoolData.teacherName || "वर्गशिक्षक"}</p>
                <p style="font-size: 11px; color: #1e293b; font-weight: 700; margin: 0;">वर्गशिक्षक</p>
              </div>
              <div style="text-align: center;">
                <p style="font-weight: 800; margin: 0; color: #000000;">${schoolData.headmasterName || "मुख्याध्यापक"}</p>
                <p style="font-size: 11px; color: #1e293b; font-weight: 700; margin: 0;">मुख्याध्यापक</p>
              </div>
            </div>
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
      if (name === "परिसर अभ्यास १" || name.includes("परिसर १")) {
        return active.includes("परिसर १") || active.includes("परिसर अभ्यास १") || ((active.includes("परिसर अभ्यास") || active.includes("संभोवतालचे")) && !active.includes("२") && !active.includes("2"));
      }
      if (name === "परिसर अभ्यास २" || name.includes("परिसर २")) {
        return active.includes("परिसर २") || active.includes("परिसर अभ्यास २");
      }
      if (name.includes("परिसर अभ्यास") || name.includes("संभोवतालचे")) return active.includes("परिसर") || active.includes("संभोवतालचे") || active.includes("evs");
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
        subjectName && (subjectName.includes("परिसर अभ्यास १") || subjectName.includes("परिसर १")) ? "evs1" : "",
        subjectName && (subjectName.includes("परिसर अभ्यास २") || subjectName.includes("परिसर २")) ? "evs2" : "",
        subjectName && (subjectName.includes("परिसर") || subjectName.includes("संभोवतालचे")) ? "evs" : "",
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
        <div className="cce-screen-view max-w-5xl mx-auto space-y-6 mb-8 no-print">
          {(() => {
            const activeSubjectSections = [
              { key: "मराठी", title: "मराठी", outcomes: marathiOutcomes, subjectName: "मराठी", isEnglish: false },
              { key: "हिंदी", title: "हिंदी", outcomes: hindiOutcomes, subjectName: "हिंदी", isEnglish: false },
              { key: "गणित", title: "गणित", outcomes: mathsOutcomes, subjectName: "गणित", isEnglish: false },
              { key: "इंग्रजी", title: "इंग्रजी", outcomes: englishOutcomes, subjectName: "इंग्रजी", isEnglish: true },
              { key: "परिसर अभ्यास १", title: "परिसर अभ्यास १", outcomes: evs1Outcomes, subjectName: "परिसर अभ्यास १", isEnglish: false },
              { key: "परिसर अभ्यास २", title: "परिसर अभ्यास २", outcomes: evs2Outcomes, subjectName: "परिसर अभ्यास २", isEnglish: false },
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
                <div key={`matrix_${sec.key}_${bIdx}`} className="bg-white p-4 border border-slate-300 rounded-2xl shadow-sm overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse table-fixed text-black">
                    <colgroup>
                      <col style={{ width: "7%" }} />
                      <col style={{ width: "36%" }} />
                      {batch.map((_, cIdx) => (
                        <col key={cIdx} style={{ width: "3.1875%" }} />
                      ))}
                      <col style={{ width: "6%" }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th colSpan={2} className="border border-black px-2 py-1.5 text-left font-bold text-xs">
                          शाळेचे नाव - {schoolData.schoolName || ""}
                        </th>
                        <th colSpan={7} className="border border-black px-1 py-1.5 text-center font-bold text-[12.5px]">
                          अध्ययन निष्पत्ती संकलन तक्ता
                        </th>
                        <th colSpan={4} className="border border-black px-1 py-1.5 text-center font-bold text-xs">
                          इयत्ता - {toMarathiClassLabel(selectedClass)}
                        </th>
                        <th colSpan={6} className="border border-black px-1 py-1.5 text-center font-bold text-xs">
                          विषय - {sec.title}
                        </th>
                      </tr>
                      <tr>
                        <th rowSpan={2} className="border border-black p-1 text-center align-middle font-bold text-[10px] leading-tight">
                          अध्ययन<br />निष्पत्ती /<br />क्षमता क्र.
                        </th>
                        <th className="border border-black p-2 h-[132px] text-center align-middle font-bold text-[13px]">
                          विद्यार्थ्यांचे नाव
                        </th>
                        {batch.map((stu, cIdx) => (
                          <th key={cIdx} className="border border-black p-0 h-[132px] relative text-center align-middle font-bold text-[10px] overflow-hidden">
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
                        <th rowSpan={2} className="border border-black p-1 text-center align-middle font-bold text-[11px]">
                          एकूण
                        </th>
                      </tr>
                      <tr>
                        <th className="border border-black px-2 py-1 h-[26px] align-middle font-bold text-xs">
                          <div className="flex items-center justify-between">
                            <span className="flex-1 text-center">अध्ययन निष्पत्ती</span>
                            <span className="text-[10px] whitespace-nowrap">ह.क्र. →</span>
                          </div>
                        </th>
                        {batch.map((stu, cIdx) => (
                          <th key={cIdx} className="border border-black p-0.5 h-[26px] text-center align-middle font-bold text-[11.5px] leading-[1.1]">
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
                            <td className="border border-black px-1 py-1 text-center align-middle font-bold text-[10.5px] whitespace-nowrap">
                              {displayCode}
                            </td>
                            <td className="border border-black px-1.5 py-1 text-left align-middle font-bold text-[11px] leading-snug">
                              {item.text}
                            </td>
                            {batch.map((stu, cIdx) => {
                              const lvl = stu ? getUserSelectedLevel(stu, item.code, sec.subjectName) : 0;
                              if (lvl >= 1 && lvl <= 4) ratedCount++;
                              return (
                                <td key={cIdx} className="border border-black p-0.5 text-center align-middle font-bold text-[11.5px]">
                                  {lvl >= 1 && lvl <= 4 ? toMarathiDigitsLocal(lvl) : ""}
                                </td>
                              );
                            })}
                            <td className="border border-black p-0.5 text-center align-middle font-bold text-[11px]">
                              {ratedCount > 0 ? toMarathiDigitsLocal(ratedCount) : ""}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))
            );
          })()}
        </div>
      ) : (
      <div className="cce-screen-view max-w-4xl mx-auto space-y-6 mb-8 no-print">
        {students.map((student) => {
          const activeSubjectSections = [
            { key: "मराठी", title: "प्रथम भाषा: मराठी", outcomes: marathiOutcomes, subjectName: "मराठी" },
            { key: "हिंदी", title: "द्वितीय भाषा: हिंदी", outcomes: hindiOutcomes, subjectName: "हिंदी" },
            { key: "गणित", title: "गणित", outcomes: mathsOutcomes, subjectName: "गणित" },
            { key: "इंग्रजी", title: "तृतीय भाषा: इंग्रजी", outcomes: englishOutcomes, subjectName: "इंग्रजी" },
            { key: "परिसर अभ्यास १", title: "परिसर अभ्यास १", outcomes: evs1Outcomes, subjectName: "परिसर अभ्यास १" },
            { key: "परिसर अभ्यास २", title: "परिसर अभ्यास २", outcomes: evs2Outcomes, subjectName: "परिसर अभ्यास २" },
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
                <div key={`screen_${student.id}_${sec.key}`} className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm">
                  <h1 className="text-[18px] font-extrabold text-blue-900 text-center mb-2.5 border-b-2 border-blue-900 pb-1">
                    अध्ययन निष्पत्तीनिहाय संपादणूक प्रगतीदर्शक नोंदतक्ता
                  </h1>

                  <div className="flex flex-wrap items-center justify-between text-[12.5px] font-bold text-slate-900 bg-slate-100 p-2.5 px-3.5 rounded-lg border border-slate-400 mb-3 gap-2">
                    <span>विद्यार्थ्याचे नाव - <b className="text-black font-extrabold">{student.fullName || student.name}</b></span>
                    <span>इयत्ता - <b className="text-black font-extrabold">{selectedClass}</b></span>
                    <span>तुकडी - <b className="text-black font-extrabold">{student.division || student.section || student.tukdi || division}</b></span>
                    <span>हजेरी क्र. <b className="text-black font-extrabold">{student.rollNo}</b></span>
                    <span className="font-extrabold">{selectedSemester === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}</span>
                  </div>

                  {/* Single Continuous Table for Web Screen View */}
                  <OutcomeTable
                    title={sec.title}
                    outcomes={sec.outcomes}
                    subjectName={sec.subjectName}
                    getUserSelectedLevel={getUserSelectedLevel}
                    student={student}
                  />

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-400 mt-2 text-[12px] font-bold text-slate-900">
                    <div className="text-center">
                      <p className="font-extrabold text-black">{schoolData.teacherName || "वर्गशिक्षक"}</p>
                      <p className="text-[11px] text-slate-800 font-bold">वर्गशिक्षक</p>
                    </div>
                    <div className="text-center">
                      <p className="font-extrabold text-black">{schoolData.headmasterName || "मुख्याध्यापक"}</p>
                      <p className="text-[11px] text-slate-800 font-bold">मुख्याध्यापक</p>
                    </div>
                  </div>
                </div>
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
              { key: "परिसर अभ्यास १", title: "परिसर अभ्यास १", outcomes: evs1Outcomes, subjectName: "परिसर अभ्यास १" },
              { key: "परिसर अभ्यास २", title: "परिसर अभ्यास २", outcomes: evs2Outcomes, subjectName: "परिसर अभ्यास २" },
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
                    className={`pdf-page bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex flex-col justify-between mb-4 ${
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
                      {/* Header Title */}
                      <h1 className="text-[18px] font-extrabold text-blue-900 text-center mb-2.5 border-b-2 border-blue-900 pb-1">
                        अध्ययन निष्पत्तीनिहाय संपादणूक प्रगतीदर्शक नोंदतक्ता
                      </h1>

                      {/* Student Metadata Bar */}
                      <div className="flex items-center justify-between text-[12.5px] font-bold text-slate-900 bg-slate-100 p-2.5 px-3.5 rounded-lg border border-slate-400 mb-3">
                        <span>विद्यार्थ्याचे नाव - <b className="text-black font-extrabold">{student.fullName || student.name}</b></span>
                        <span>इयत्ता - <b className="text-black font-extrabold">{selectedClass}</b></span>
                        <span>तुकडी - <b className="text-black font-extrabold">{student.division || student.section || student.tukdi || division}</b></span>
                        <span>हजेरी क्र. <b className="text-black font-extrabold">{student.rollNo}</b></span>
                        <span className="font-extrabold">{selectedSemester === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}</span>
                      </div>

                      {/* Chunked Subject Table */}
                      <OutcomeTable
                        title={partTitle}
                        outcomes={outcomeChunk}
                        subjectName={sec.subjectName}
                        getUserSelectedLevel={getUserSelectedLevel}
                        student={student}
                      />
                    </div>

                    {/* Signatures Footer */}
                    <div
                      className="flex items-center justify-between pt-2.5 border-t border-slate-400 mt-2 text-[12px] font-bold text-slate-900"
                      style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
                    >
                      <div className="text-center">
                        <p className="font-extrabold text-black">{schoolData.teacherName || "वर्गशिक्षक"}</p>
                        <p className="text-[11px] text-slate-800 font-bold">वर्गशिक्षक</p>
                      </div>
                      <div className="text-center">
                        <p className="font-extrabold text-black">{schoolData.headmasterName || "मुख्याध्यापक"}</p>
                        <p className="text-[11px] text-slate-800 font-bold">मुख्याध्यापक</p>
                      </div>
                    </div>
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
