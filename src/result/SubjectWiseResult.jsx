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
    subjectKey === "kala" ? "कला" : "",
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
        className="text-xs font-black text-slate-900 mb-2 text-center bg-amber-100 py-1.5 px-3 rounded-lg border-2 border-amber-300 shadow-sm"
        style={{ breakAfter: "avoid", pageBreakAfter: "avoid" }}
      >
        {title}
      </h3>

      {/* Semantic HTML Table for 100% html2canvas border rendering */}
      <div className="w-full border-2 border-slate-400 rounded-lg overflow-hidden bg-white">
        <table className="w-full border-collapse text-left text-slate-900" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '10%' }} />
            <col style={{ width: '74%' }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '4%' }} />
          </colgroup>
          <thead>
            <tr className="bg-slate-100 font-black text-[11px] border-b-2 border-slate-400">
              <th className="border-r border-b border-slate-400 p-1 text-center leading-tight">
                अध्ययन<br />निष्पत्ती<br />क्र.
              </th>
              <th className="border-r border-b border-slate-400 p-1.5 text-center align-middle">
                अध्ययन निष्पत्ती
              </th>
              <th colSpan={4} className="border-b border-slate-400 p-0 text-center">
                <div className="border-b border-slate-400 py-1 font-black text-center text-[11px]">
                  स्तर
                </div>
                <div className="grid grid-cols-4 text-[10.5px]">
                  <div className="border-r border-slate-400 py-0.5 text-center font-bold">1</div>
                  <div className="border-r border-slate-400 py-0.5 text-center font-bold">2</div>
                  <div className="border-r border-slate-400 py-0.5 text-center font-bold">3</div>
                  <div className="py-0.5 text-center font-bold">4</div>
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
                  className={`text-[10.5px] ${!isLast ? "border-b border-slate-300" : ""}`}
                >
                  <td className="border-r border-slate-300 p-1 text-center font-bold text-[9.5px] whitespace-nowrap bg-slate-50/50">
                    {item.code}
                  </td>
                  <td className="border-r border-slate-300 p-1.5 px-2 font-medium text-[11px] leading-snug">
                    {item.text}
                  </td>
                  <td className="border-r border-slate-300 p-1 text-center font-black text-blue-900 text-[13px]">
                    {level === 1 ? "✓" : ""}
                  </td>
                  <td className="border-r border-slate-300 p-1 text-center font-black text-blue-900 text-[13px]">
                    {level === 2 ? "✓" : ""}
                  </td>
                  <td className="border-r border-slate-300 p-1 text-center font-black text-blue-900 text-[13px]">
                    {level === 3 ? "✓" : ""}
                  </td>
                  <td className="p-1 text-center font-black text-blue-900 text-[13px]">
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

        if (currentTeacherId) {
          try {
            const cachedTeacher = localStorage.getItem(`cce_general_school_settings_${currentTeacherId}`);
            if (cachedTeacher) globalSettings = JSON.parse(cachedTeacher);
          } catch (e) {}

          if (!globalSettings) {
            try {
              const teacherGenSnap = await getDoc(doc(db, "school_settings", `${currentTeacherId}_general`));
              if (teacherGenSnap.exists()) globalSettings = teacherGenSnap.data();
            } catch (e) {}
          }
        }

        if (!globalSettings && !currentTeacherId) {
          try {
            const generalSnap = await getDoc(doc(db, "school_settings", "general"));
            if (generalSnap.exists()) globalSettings = generalSnap.data();
          } catch (e) { }
        }

        // 2. Try teacher-isolated class-specific settings first
        let classSettings = {};
        const classDocIdsToTry = [
          currentTeacherId ? `${currentTeacherId}_${selectedClass}_${academicYear}` : null,
          currentTeacherId ? `${currentTeacherId}_${selectedClass}_${localStorage.getItem("cce_selected_medium") || "marathi"}_${academicYear}` : null,
        ].filter(Boolean);

        if (classDocIdsToTry.length === 0) {
          classDocIdsToTry.push(
            `${selectedClass}_${localStorage.getItem("cce_selected_medium") || "marathi"}_${academicYear}`,
            docId
          );
        }

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

        // 3. Unified local profile fallback (Guarantees logged in user's headmaster and school info)
        try {
          const { getUnifiedSchoolProfile } = await import("@/utils/schoolProfileHelper");
          const uni = getUnifiedSchoolProfile();
          if (uni) {
            if (!mergedSettings.schoolName && uni.schoolName) mergedSettings.schoolName = uni.schoolName;
            if (!mergedSettings.principalName && uni.headmaster) mergedSettings.principalName = uni.headmaster;
            if (!mergedSettings.teacherName && uni.teacherName) mergedSettings.teacherName = uni.teacherName;
            if (!mergedSettings.udiseCode && uni.udise) mergedSettings.udiseCode = uni.udise;
            if (!mergedSettings.address && uni.address) mergedSettings.address = uni.address;
          }
        } catch (e) {}

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

  const handleDownloadPdf = async () => {
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
          { key: "कला", title: "कला", outcomes: kalaOutcomes, subjectName: "कला" },
          { key: "कार्यानुभव", title: "कार्यानुभव / कार्यशिक्षण", outcomes: karyanubhavOutcomes, subjectName: "कार्यानुभव" },
          { key: "शारीरिक", title: "शारीरिक शिक्षण व आरोग्य", outcomes: sharirikOutcomes, subjectName: "शारीरिक" },
        ].filter((sec) => isSubjectActive(sec.key) && sec.outcomes && sec.outcomes.length > 0);

        for (const sec of activeSubjectSections) {
          // Pass 1: Render full subject table in a real DOM measurement page
          const fullRowsHtml = sec.outcomes.map((item, idx) => {
            const level = getUserSelectedLevel(student, item.code, sec.subjectName);
            const isLast = idx === sec.outcomes.length - 1;
            return `
              <tr style="font-size: 11px; ${!isLast ? "border-bottom: 1px solid #cbd5e1;" : ""}">
                <td style="padding: 5px; text-align: center; font-weight: bold; font-size: 9.5px; width: 10%; background-color: #f8fafc; border-right: 1px solid #cbd5e1;">
                  ${item.code || ""}
                </td>
                <td style="padding: 6px; text-align: left; font-weight: 500; font-size: 11px; line-height: 1.3; width: 74%; border-right: 1px solid #cbd5e1;">
                  ${item.text || ""}
                </td>
                <td style="padding: 4px; text-align: center; font-weight: 900; font-size: 13px; color: #1e3a8a; width: 4%; border-right: 1px solid #cbd5e1;">
                  ${level === 1 ? "✓" : ""}
                </td>
                <td style="padding: 4px; text-align: center; font-weight: 900; font-size: 13px; color: #1e3a8a; width: 4%; border-right: 1px solid #cbd5e1;">
                  ${level === 2 ? "✓" : ""}
                </td>
                <td style="padding: 4px; text-align: center; font-weight: 900; font-size: 13px; color: #1e3a8a; width: 4%; border-right: 1px solid #cbd5e1;">
                  ${level === 3 ? "✓" : ""}
                </td>
                <td style="padding: 4px; text-align: center; font-weight: 900; font-size: 13px; color: #1e3a8a; width: 4%;">
                  ${level === 4 ? "✓" : ""}
                </td>
              </tr>
            `;
          }).join("");

          const measureEl = document.createElement("div");
          measureEl.className = "pdf-page bg-white flex flex-col justify-between";
          measureEl.style.cssText = "width: 794px; min-height: 1122px; padding: 24px; box-sizing: border-box; background: #ffffff; position: absolute; top: 0; left: -10000px; visibility: hidden;";

          measureEl.innerHTML = `
            <div>
              <h1 id="m_title" style="font-size: 16px; font-weight: 900; color: #1e3a8a; text-align: center; margin-bottom: 8px; border-bottom: 2px solid #1e3a8a; padding-bottom: 4px; letter-spacing: -0.025em; line-height: 1.2;">
                अध्ययन निष्पत्तीनिहाय संपादणूक प्रगतीदर्शक नोंदतक्ता
              </h1>
              <div id="m_student" style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-weight: 900; color: #1e293b; background-color: #f1f5f9; padding: 6px 12px; border-radius: 6px; border: 1px solid #cbd5e1; margin-bottom: 8px;">
                <span>विद्यार्थ्याचे नाव - <b style="color: #0f172a; font-weight: 900;">${student.fullName || student.name || ""}</b></span>
                <span>इयत्ता - <b>${selectedClass}</b></span>
                <span>तुकडी - <b>${student.division || student.section || student.tukdi || division}</b></span>
                <span>हजेरी क्र. <b>${student.rollNo || ""}</b></span>
                <span>${selectedSemester === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}</span>
              </div>
              <div id="m_banner" style="margin-bottom: 8px;">
                <h3 style="font-size: 11.5px; font-weight: 900; color: #0f172a; margin: 0; text-align: center; background-color: #fef3c7; padding: 4px 10px; border-radius: 6px; border: 1.5px solid #fde68a;">
                  ${sec.title}
                </h3>
              </div>
              <div id="m_table_container" style="width: 100%; border: 1.5px solid #94a3b8; border-radius: 6px; overflow: hidden; background: #ffffff;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; color: #0f172a; table-layout: fixed;">
                  <colgroup>
                    <col style="width: 10%;" />
                    <col style="width: 74%;" />
                    <col style="width: 4%;" />
                    <col style="width: 4%;" />
                    <col style="width: 4%;" />
                    <col style="width: 4%;" />
                  </colgroup>
                  <thead>
                    <tr id="m_thead_row" style="background-color: #f1f5f9; font-weight: 900; font-size: 10.5px; border-bottom: 1.5px solid #94a3b8;">
                      <th style="border-right: 1px solid #94a3b8; padding: 4px; text-align: center; line-height: 1.2;">
                        अध्ययन<br />निष्पत्ती<br />क्र.
                      </th>
                      <th style="border-right: 1px solid #94a3b8; padding: 4px 6px; text-align: center; vertical-align: middle;">
                        अध्ययन निष्पत्ती
                      </th>
                      <th colSpan="4" style="padding: 0; text-align: center;">
                        <div style="border-bottom: 1px solid #94a3b8; padding: 2px 0; font-weight: 900; text-align: center; font-size: 10.5px;">
                          स्तर
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); font-size: 10px;">
                          <div style="border-right: 1px solid #94a3b8; padding: 2px 0; text-align: center; font-weight: bold;">1</div>
                          <div style="border-right: 1px solid #94a3b8; padding: 2px 0; text-align: center; font-weight: bold;">2</div>
                          <div style="border-right: 1px solid #94a3b8; padding: 2px 0; text-align: center; font-weight: bold;">3</div>
                          <div style="padding: 2px 0; text-align: center; font-weight: bold;">4</div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody id="m_tbody">${fullRowsHtml}</tbody>
                </table>
              </div>
            </div>
            <div id="m_footer" style="display: flex; align-items: center; justify-content: space-between; padding-top: 6px; border-top: 1px solid #cbd5e1; margin-top: 6px; font-size: 10.5px; font-weight: bold; color: #1e293b;">
              <div style="text-align: center;">
                <p style="font-weight: 800; margin: 0;">${schoolData.teacherName || "वर्गशिक्षक"}</p>
                <p style="font-size: 9.5px; color: #64748b; font-weight: 500; margin: 0;">वर्गशिक्षक</p>
              </div>
              <div style="text-align: center;">
                <p style="font-weight: 800; margin: 0;">${schoolData.headmasterName || "मुख्याध्यापक"}</p>
                <p style="font-size: 9.5px; color: #64748b; font-weight: 500; margin: 0;">मुख्याध्यापक</p>
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
            <tr style="font-size: 11px; ${!isLast ? "border-bottom: 1px solid #cbd5e1;" : ""}">
              <td style="padding: 5px; text-align: center; font-weight: bold; font-size: 9.5px; width: 10%; background-color: #f8fafc; border-right: 1px solid #cbd5e1;">
                ${item.code || ""}
              </td>
              <td style="padding: 6px; text-align: left; font-weight: 500; font-size: 11px; line-height: 1.3; width: 74%; border-right: 1px solid #cbd5e1;">
                ${item.text || ""}
              </td>
              <td style="padding: 4px; text-align: center; font-weight: 900; font-size: 13px; color: #1e3a8a; width: 4%; border-right: 1px solid #cbd5e1;">
                ${level === 1 ? "✓" : ""}
              </td>
              <td style="padding: 4px; text-align: center; font-weight: 900; font-size: 13px; color: #1e3a8a; width: 4%; border-right: 1px solid #cbd5e1;">
                ${level === 2 ? "✓" : ""}
              </td>
              <td style="padding: 4px; text-align: center; font-weight: 900; font-size: 13px; color: #1e3a8a; width: 4%; border-right: 1px solid #cbd5e1;">
                ${level === 3 ? "✓" : ""}
              </td>
              <td style="padding: 4px; text-align: center; font-weight: 900; font-size: 13px; color: #1e3a8a; width: 4%;">
                ${level === 4 ? "✓" : ""}
              </td>
            </tr>
          `;
        }).join("");

        return `
          <div
            class="pdf-page bg-white flex flex-col justify-between"
            style="width: 794px; height: 1122px; min-height: 1122px; max-height: 1122px; padding: 24px; box-sizing: border-box; margin-bottom: 20px; overflow: hidden; background: #ffffff;"
          >
            <div>
              <h1 style="font-size: 16px; font-weight: 900; color: #1e3a8a; text-align: center; margin-bottom: 8px; border-bottom: 2px solid #1e3a8a; padding-bottom: 4px; letter-spacing: -0.025em; line-height: 1.2;">
                अध्ययन निष्पत्तीनिहाय संपादणूक प्रगतीदर्शक नोंदतक्ता
              </h1>
              <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-weight: 900; color: #1e293b; background-color: #f1f5f9; padding: 6px 12px; border-radius: 6px; border: 1px solid #cbd5e1; margin-bottom: 8px;">
                <span>विद्यार्थ्याचे नाव - <b style="color: #0f172a; font-weight: 900;">${student.fullName || student.name || ""}</b></span>
                <span>इयत्ता - <b>${selectedClass}</b></span>
                <span>तुकडी - <b>${student.division || student.section || student.tukdi || division}</b></span>
                <span>हजेरी क्र. <b>${student.rollNo || ""}</b></span>
                <span>${selectedSemester === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}</span>
              </div>
              <div style="margin-bottom: 8px;">
                <h3 style="font-size: 11.5px; font-weight: 900; color: #0f172a; margin: 0; text-align: center; background-color: #fef3c7; padding: 4px 10px; border-radius: 6px; border: 1.5px solid #fde68a;">
                  ${pgData.secTitle}
                </h3>
              </div>
              <div style="width: 100%; border: 1.5px solid #94a3b8; border-radius: 6px; overflow: hidden; background: #ffffff;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; color: #0f172a; table-layout: fixed;">
                  <colgroup>
                    <col style="width: 10%;" />
                    <col style="width: 74%;" />
                    <col style="width: 4%;" />
                    <col style="width: 4%;" />
                    <col style="width: 4%;" />
                    <col style="width: 4%;" />
                  </colgroup>
                  <thead>
                    <tr style="background-color: #f1f5f9; font-weight: 900; font-size: 10.5px; border-bottom: 1.5px solid #94a3b8;">
                      <th style="border-right: 1px solid #94a3b8; padding: 4px; text-align: center; line-height: 1.2;">
                        अध्ययन<br />निष्पत्ती<br />क्र.
                      </th>
                      <th style="border-right: 1px solid #94a3b8; padding: 4px 6px; text-align: center; vertical-align: middle;">
                        अध्ययन निष्पत्ती
                      </th>
                      <th colSpan="4" style="padding: 0; text-align: center;">
                        <div style="border-bottom: 1px solid #94a3b8; padding: 2px 0; font-weight: 900; text-align: center; font-size: 10.5px;">
                          स्तर
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); font-size: 10px;">
                          <div style="border-right: 1px solid #94a3b8; padding: 2px 0; text-align: center; font-weight: bold;">1</div>
                          <div style="border-right: 1px solid #94a3b8; padding: 2px 0; text-align: center; font-weight: bold;">2</div>
                          <div style="border-right: 1px solid #94a3b8; padding: 2px 0; text-align: center; font-weight: bold;">3</div>
                          <div style="padding: 2px 0; text-align: center; font-weight: bold;">4</div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>${rowsHtml}</tbody>
                </table>
              </div>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 6px; border-top: 1px solid #cbd5e1; margin-top: 6px; font-size: 10.5px; font-weight: bold; color: #1e293b;">
              <div style="text-align: center;">
                <p style="font-weight: 800; margin: 0;">${schoolData.teacherName || "वर्गशिक्षक"}</p>
                <p style="font-size: 9.5px; color: #64748b; font-weight: 500; margin: 0;">वर्गशिक्षक</p>
              </div>
              <div style="text-align: center;">
                <p style="font-weight: 800; margin: 0;">${schoolData.headmasterName || "मुख्याध्यापक"}</p>
                <p style="font-size: 9.5px; color: #64748b; font-weight: 500; margin: 0;">मुख्याध्यापक</p>
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

      const pdf = new jsPDF({
        unit: "mm",
        format: "a4",
        orientation: "portrait",
        compress: true,
      });

      const captureScale = Math.min(2, window.devicePixelRatio || 2);

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

        const imgData = canvas.toDataURL("image/jpeg", 0.88);

        if (i > 0) pdf.addPage();
        pdf.addImage(
          imgData,
          "JPEG",
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
        return active.includes("परिसर १") || active.includes("परिसर अभ्यास १") || (active.includes("परिसर अभ्यास") && !active.includes("२") && !active.includes("2"));
      }
      if (name === "परिसर अभ्यास २" || name.includes("परिसर २")) {
        return active.includes("परिसर २") || active.includes("परिसर अभ्यास २");
      }
      if (name.includes("परिसर अभ्यास")) return active.includes("परिसर") || active.includes("evs");
      if (name.includes("सामान्य विज्ञान") || name.includes("विज्ञान")) return active.includes("विज्ञान") || active.includes("science");
      if (name.includes("इतिहास")) return active.includes("इतिहास") || active.includes("नागरिकशास्त्र") || active.includes("सामाजिक") || active.includes("social");
      if (name.includes("भूगोल")) return active.includes("भूगोल") || active.includes("सामाजिक") || active.includes("social");
      if (name.includes("कला")) return active.includes("कला") || active.includes("art");
      if (name.includes("कार्यानुभव") || name.includes("कार्यशिक्षण")) return active.includes("कार्यानुभव") || active.includes("कार्यशिक्षण") || active.includes("work");
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
        subjectName && subjectName.includes("परिसर") ? "evs" : "",
        subjectName && (subjectName.includes("सामान्य विज्ञान") || subjectName.includes("विज्ञान")) ? "science" : "",
        subjectName && (subjectName.includes("इतिहास") || subjectName.includes("नागरिकशास्त्र")) ? "history" : "",
        subjectName && subjectName.includes("भूगोल") ? "geography" : "",
        subjectName && subjectName.includes("कला") ? "kala" : "",
        subjectName && (subjectName.includes("कार्यानुभव") || subjectName.includes("कार्यशिक्षण")) ? "karyanubhav" : "",
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
    <div className="font-sans text-slate-800">
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

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadPdf}
            disabled={downloading || students.length === 0}
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

      {/* -------------------- 1. SCREEN VIEW (SINGLE CONTINUOUS TABLE PER SUBJECT ON WEB UI) -------------------- */}
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
            { key: "कला", title: "कला", outcomes: kalaOutcomes, subjectName: "कला" },
            { key: "कार्यानुभव", title: "कार्यानुभव / कार्यशिक्षण", outcomes: karyanubhavOutcomes, subjectName: "कार्यानुभव" },
            { key: "शारीरिक", title: "शारीरिक शिक्षण व आरोग्य", outcomes: sharirikOutcomes, subjectName: "शारीरिक" },
          ].filter((sec) => isSubjectActive(sec.key) && sec.outcomes && sec.outcomes.length > 0);

          return (
            <div key={`screen_${student.id}`} className="space-y-6">
              {activeSubjectSections.map((sec) => (
                <div key={`screen_${student.id}_${sec.key}`} className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm">
                  <h1 className="text-lg font-black text-blue-900 text-center mb-2.5 border-b-2 border-blue-900 pb-1 tracking-tight">
                    अध्ययन निष्पत्तीनिहाय संपादणूक प्रगतीदर्शक नोंदतक्ता
                  </h1>

                  <div className="flex flex-wrap items-center justify-between text-xs font-black text-slate-800 bg-slate-100 p-2.5 px-3.5 rounded-lg border border-slate-300 mb-3 gap-2">
                    <span>विद्यार्थ्याचे नाव - <b className="text-slate-900 font-black">{student.fullName || student.name}</b></span>
                    <span>इयत्ता - <b>{selectedClass}</b></span>
                    <span>तुकडी - <b>{student.division || student.section || student.tukdi || division}</b></span>
                    <span>हजेरी क्र. <b>{student.rollNo}</b></span>
                    <span>{selectedSemester === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}</span>
                  </div>

                  {/* Single Continuous Table for Web Screen View */}
                  <OutcomeTable
                    title={sec.title}
                    outcomes={sec.outcomes}
                    subjectName={sec.subjectName}
                    getUserSelectedLevel={getUserSelectedLevel}
                    student={student}
                  />

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-200 mt-2 text-[11px] font-bold text-slate-800">
                    <div className="text-center">
                      <p className="font-extrabold">{schoolData.teacherName || "वर्गशिक्षक"}</p>
                      <p className="text-[10px] text-slate-500 font-medium">वर्गशिक्षक</p>
                    </div>
                    <div className="text-center">
                      <p className="font-extrabold">{schoolData.headmasterName || "मुख्याध्यापक"}</p>
                      <p className="text-[10px] text-slate-500 font-medium">मुख्याध्यापक</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* -------------------- 2. PDF CAPTURE CONTAINER (PAGINATED & BALANCED A4 PAGES FOR PDF DOWNLOAD) -------------------- */}
      <div ref={printRef} className="cce-pdf-container max-w-4xl mx-auto hidden print:block">
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
              { key: "कला", title: "कला", outcomes: kalaOutcomes, subjectName: "कला" },
              { key: "कार्यानुभव", title: "कार्यानुभव / कार्यशिक्षण", outcomes: karyanubhavOutcomes, subjectName: "कार्यानुभव" },
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
                      <h1 className="text-lg font-black text-blue-900 text-center mb-2.5 border-b-2 border-blue-900 pb-1 tracking-tight">
                        अध्ययन निष्पत्तीनिहाय संपादणूक प्रगतीदर्शक नोंदतक्ता
                      </h1>

                      {/* Student Metadata Bar */}
                      <div className="flex items-center justify-between text-xs font-black text-slate-800 bg-slate-100 p-2.5 px-3.5 rounded-lg border border-slate-300 mb-3">
                        <span>विद्यार्थ्याचे नाव - <b className="text-slate-900 font-black">{student.fullName || student.name}</b></span>
                        <span>इयत्ता - <b>{selectedClass}</b></span>
                        <span>तुकडी - <b>{student.division || student.section || student.tukdi || division}</b></span>
                        <span>हजेरी क्र. <b>{student.rollNo}</b></span>
                        <span>{selectedSemester === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}</span>
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
                      className="flex items-center justify-between pt-2.5 border-t border-slate-200 mt-2 text-[11px] font-bold text-slate-800"
                      style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
                    >
                      <div className="text-center">
                        <p className="font-extrabold">{schoolData.teacherName || "वर्गशिक्षक"}</p>
                        <p className="text-[10px] text-slate-500 font-medium">वर्गशिक्षक</p>
                      </div>
                      <div className="text-center">
                        <p className="font-extrabold">{schoolData.headmasterName || "मुख्याध्यापक"}</p>
                        <p className="text-[10px] text-slate-500 font-medium">मुख्याध्यापक</p>
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
