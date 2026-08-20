import React, { useState, useEffect, useRef } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { matchStudentClassAndMedium } from "./firestoreMarksHelper";
import { getTeacherId } from "../lib/teacherIsolationHelper";
import { Download, Printer, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import "./result.css";
import { CLASS_1_OUTCOMES, CLASS_1_SEMI_OUTCOMES } from "@/data/class1_outcomes";
import { CLASS_2_OUTCOMES, CLASS_2_SEMI_OUTCOMES } from "@/data/class2_outcomes";
import { CLASS_3_OUTCOMES, CLASS_3_SEMI_OUTCOMES } from "@/data/class3_outcomes";
import { CLASS_4_OUTCOMES, CLASS_4_SEMI_OUTCOMES } from "@/data/class4_outcomes";
import { CLASS_5_OUTCOMES, CLASS_5_SEMI_OUTCOMES } from "@/data/class5_outcomes";
import { CLASS_6_OUTCOMES, CLASS_6_SEMI_OUTCOMES } from "@/data/class6_outcomes";
import { CLASS_7_OUTCOMES, CLASS_7_SEMI_OUTCOMES } from "@/data/class7_outcomes";
import { CLASS_8_OUTCOMES, CLASS_8_SEMI_OUTCOMES } from "@/data/class8_outcomes";

// Dynamic Class Outcomes Resolver
const getClassOutcomes = (classValue, subjectKey, customOutcomesMap = {}) => {
  const normKey = subjectKey === "maths" ? "math" : subjectKey;

  // Check custom user-created outcomes first
  if (customOutcomesMap[normKey] && Array.isArray(customOutcomesMap[normKey]) && customOutcomesMap[normKey].length > 0) {
    return customOutcomesMap[normKey];
  }
  if (customOutcomesMap[subjectKey] && Array.isArray(customOutcomesMap[subjectKey]) && customOutcomesMap[subjectKey].length > 0) {
    return customOutcomesMap[subjectKey];
  }

  const currentMedium = localStorage.getItem("cce_selected_medium") || "marathi";
  const norm = String(classValue || "1st").toLowerCase().replace(/[^0-9]/g, "") || "1";

  let outcomeBank = null;
  if (norm === "1") outcomeBank = currentMedium === "semi" ? CLASS_1_SEMI_OUTCOMES : CLASS_1_OUTCOMES;
  else if (norm === "2") outcomeBank = currentMedium === "semi" ? CLASS_2_SEMI_OUTCOMES : CLASS_2_OUTCOMES;
  else if (norm === "3") outcomeBank = currentMedium === "semi" ? CLASS_3_SEMI_OUTCOMES : CLASS_3_OUTCOMES;
  else if (norm === "4") outcomeBank = currentMedium === "semi" ? CLASS_4_SEMI_OUTCOMES : CLASS_4_OUTCOMES;
  else if (norm === "5") outcomeBank = currentMedium === "semi" ? CLASS_5_SEMI_OUTCOMES : CLASS_5_OUTCOMES;
  else if (norm === "6") outcomeBank = currentMedium === "semi" ? CLASS_6_SEMI_OUTCOMES : CLASS_6_OUTCOMES;
  else if (norm === "7") outcomeBank = currentMedium === "semi" ? CLASS_7_SEMI_OUTCOMES : CLASS_7_OUTCOMES;
  else if (norm === "8") outcomeBank = currentMedium === "semi" ? CLASS_8_SEMI_OUTCOMES : CLASS_8_OUTCOMES;

  if (outcomeBank) {
    let list = outcomeBank[normKey] || outcomeBank[subjectKey];
    if (list) {
      if (currentMedium === "semi" && (normKey === "math" || normKey === "science" || normKey === "evs1" || normKey === "evs2")) {
        const isDevanagari = (str) => /[\u0900-\u097F]/.test(str);
        return list.filter((item) => !isDevanagari(item.text));
      }
      return list;
    }
  }

  return [];
};

// Helper to chunk arrays for clean multi-page pagination
const chunkArray = (arr, size) => {
  if (!arr || arr.length === 0) return [];
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};

const OutcomeTable = ({ title, outcomes, subjectName, getUserSelectedLevel, student }) => {
  if (!outcomes || outcomes.length === 0) return null;

  return (
    <div className="w-full mb-3">
      {/* Subject Title Banner */}
      <div
        className="w-full text-center bg-amber-100 py-2.5 px-4 rounded-full border border-amber-300 shadow-xs mb-3 text-slate-900 font-black text-base sm:text-lg tracking-tight"
        style={{ breakAfter: "avoid", pageBreakAfter: "avoid" }}
      >
        {title}
      </div>

      {/* HTML Table Container for Outcomes Table */}
      <div className="w-full border border-slate-300 rounded-2xl overflow-hidden bg-white shadow-xs">
        <table
          className="w-full border-collapse text-slate-900 text-xs bg-white"
          style={{ tableLayout: "fixed", width: "100%", borderCollapse: "collapse" }}
        >
          <colgroup>
            <col style={{ width: "11%" }} />
            <col style={{ width: "67%" }} />
            <col style={{ width: "5.5%" }} />
            <col style={{ width: "5.5%" }} />
            <col style={{ width: "5.5%" }} />
            <col style={{ width: "5.5%" }} />
          </colgroup>
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 font-black text-xs sm:text-sm text-slate-900">
              <th
                rowSpan={2}
                className="border-r border-slate-300 p-2 text-center align-middle font-black leading-tight"
              >
                अध्ययन<br />निष्पत्ती क्र.
              </th>
              <th
                rowSpan={2}
                className="border-r border-slate-300 p-2 px-3 text-left align-middle font-black text-xs sm:text-sm"
              >
                अध्ययन निष्पत्ती
              </th>
              <th
                colSpan={4}
                className="p-1.5 text-center font-black text-xs sm:text-sm"
              >
                स्तर
              </th>
            </tr>
            <tr className="bg-slate-100 border-b border-slate-300 font-black text-xs text-slate-900">
              <th className="border-t border-r border-slate-300 py-1 text-center font-black">1</th>
              <th className="border-t border-r border-slate-300 py-1 text-center font-black">2</th>
              <th className="border-t border-r border-slate-300 py-1 text-center font-black">3</th>
              <th className="border-t py-1 text-center font-black">4</th>
            </tr>
          </thead>
          <tbody>
            {outcomes.map((item, idx) => {
              const level = getUserSelectedLevel(student, item.code, subjectName);
              const isLast = idx === outcomes.length - 1;
              return (
                <tr key={item.code} className={!isLast ? "border-b border-slate-300" : ""}>
                  <td className="border-r border-slate-300 p-2 px-2 text-center font-black text-[11.5px] sm:text-xs text-slate-900 align-middle whitespace-nowrap">
                    {item.code}
                  </td>
                  <td className="border-r border-slate-300 p-2 px-3.5 text-left font-semibold text-[12.5px] sm:text-[13px] text-slate-900 leading-snug align-middle">
                    {item.text}
                  </td>
                  <td className="border-r border-slate-300 text-center align-middle font-black text-amber-800 text-[16px]">
                    {level === 1 ? "✓" : ""}
                  </td>
                  <td className="border-r border-slate-300 text-center align-middle font-black text-amber-800 text-[16px]">
                    {level === 2 ? "✓" : ""}
                  </td>
                  <td className="border-r border-slate-300 text-center align-middle font-black text-amber-800 text-[16px]">
                    {level === 3 ? "✓" : ""}
                  </td>
                  <td className="text-center align-middle font-black text-amber-800 text-[16px]">
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

const SubjectWiseResult = ({ initialClass = "1st", initialYear = "2025-26", initialSemester = "sem2", onBack }) => {
  const [selectedClass, setSelectedClass] = useState(initialClass || "1st");
  const [academicYear, setAcademicYear] = useState(initialYear || "2025-26");
  const [selectedSemester, setSelectedSemester] = useState(initialSemester || "sem2");
  const [division, setDivision] = useState("1");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [configuredSubjects, setConfiguredSubjects] = useState(() => {
    const med = localStorage.getItem("cce_selected_medium") || "marathi";
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
  }, [selectedClass, academicYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const docId = `${selectedClass}_${academicYear}`;
      const currentTeacherId = getTeacherId();

      // 1. Fetch Global / Class School Settings
      try {
        let globalSettings = null;

        // Try local storage cache (teacher-specific first, then generic)
        try {
          const cachedTeacher = localStorage.getItem(`cce_general_school_settings_${currentTeacherId}`);
          const cachedGen = localStorage.getItem("cce_general_school_settings");
          const cached = cachedTeacher || cachedGen;
          if (cached) globalSettings = JSON.parse(cached);
        } catch (e) { }

        if (!globalSettings) {
          try {
            const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
            globalSettings = await fetchJsonFromBunny("cce_results/general_school_settings.json");
          } catch (e) { }
        }

        // Try Firestore teacher-specific documents first, then global
        if (!globalSettings) {
          try {
            const teacherGenSnap = await getDoc(doc(db, "school_settings", `${currentTeacherId}_general`));
            if (teacherGenSnap.exists()) globalSettings = teacherGenSnap.data();
          } catch (e) { }
        }
        if (!globalSettings) {
          try {
            const teacherSnap = await getDoc(doc(db, "school_settings", currentTeacherId));
            if (teacherSnap.exists()) globalSettings = teacherSnap.data();
          } catch (e) { }
        }
        if (!globalSettings) {
          try {
            const generalSnap = await getDoc(doc(db, "school_settings", "general"));
            if (generalSnap.exists()) globalSettings = generalSnap.data();
          } catch (e) { }
        }

        // Try teacher-isolated class-specific settings first
        let classSettings = {};
        const classDocIdsToTry = [
          `${currentTeacherId}_${selectedClass}_${academicYear}`,
          `${currentTeacherId}_${selectedClass}_${localStorage.getItem("cce_selected_medium") || "marathi"}_${academicYear}`,
          `${selectedClass}_${localStorage.getItem("cce_selected_medium") || "marathi"}_${academicYear}`,
          docId,
        ];
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

        if (mergedSettings.schoolName || mergedSettings.udiseCode || mergedSettings.teacherName) {
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

        setConfiguredSubjects(activeSubs);

        // Fetch custom user-created learning outcomes if saved (medium isolated first)
        try {
          const customMedSnap = await getDoc(doc(db, "cce_outcomes_list_v2", `${selectedClass}_${currentMed}_${academicYear}`));
          if (customMedSnap.exists() && customMedSnap.data().outcomes) {
            setCustomOutcomesData(customMedSnap.data().outcomes);
          } else {
            const customListSnap = await getDoc(doc(db, "cce_outcomes_list_v2", `${selectedClass}_${academicYear}`));
            if (customListSnap.exists() && customListSnap.data().outcomes) {
              setCustomOutcomesData(customListSnap.data().outcomes);
            }
          }
        } catch (e) { }
      } catch (e) { }

      // 2. Fetch Students for Selected Class
      let loadedStudents = [];
      const currentMedium = localStorage.getItem("cce_selected_medium") || "marathi";

      try {
        const uQuery = query(collection(db, "users"), where("role", "==", "student"));
        const uSnap = await getDocs(uQuery);
        uSnap.forEach((docSnap) => {
          const d = docSnap.data();
          if (matchStudentClassAndMedium({ id: docSnap.id, ...d }, selectedClass, currentMedium, currentTeacherId)) {
            loadedStudents.push({
              id: docSnap.id,
              name: d.fullName || d.name || d.studentName || "",
              rollNo: String(d.rollNo || d.srNo || loadedStudents.length + 1),
            });
          }
        });
      } catch (e) { }

      if (loadedStudents.length === 0) {
        try {
          const studentsSnap = await getDocs(collection(db, "students"));
          studentsSnap.forEach((docSnap) => {
            const d = docSnap.data();
            if (matchStudentClassAndMedium({ id: docSnap.id, ...d }, selectedClass, currentMedium, currentTeacherId)) {
              loadedStudents.push({
                id: docSnap.id,
                name: d.fullName || d.name || d.studentName || "",
                rollNo: String(d.rollNo || d.srNo || loadedStudents.length + 1),
              });
            }
          });
        } catch (e) { }
      }

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

        // Try teacher and medium-isolated outcome docs first, then generic
        const outcomeDocIds = [
          `${currentTeacherId}_${selectedClass}_${currentMedium}_${academicYear}_sem2`,
          `${selectedClass}_${currentMedium}_${academicYear}_sem2`,
          `${currentTeacherId}_${selectedClass}_${currentMedium}_${academicYear}_sem1`,
          `${selectedClass}_${currentMedium}_${academicYear}_sem1`,
          `${currentTeacherId}_${selectedClass}_${academicYear}_sem2`,
          `${selectedClass}_${academicYear}_sem2`,
          `${currentTeacherId}_${selectedClass}_${academicYear}_sem1`,
          `${selectedClass}_${academicYear}_sem1`,
          `${currentTeacherId}_${selectedClass}_${academicYear}`,
          docId,
        ];
        let mergedRatings = {};
        for (const oDocId of outcomeDocIds) {
          try {
            const outSnap = await getDoc(doc(db, "cce_outcomes", oDocId));
            if (outSnap.exists()) {
              const rData = outSnap.data().ratings || outSnap.data();
              mergedRatings = { ...mergedRatings, ...rData };
            }
          } catch (e) { }
        }
        mergedRatings = { ...mergedRatings, ...(bunnyOutcomes || {}) };
        setOutcomesRatings(mergedRatings);

        // Fetch levels data (teacher-isolated first)
        let mergedLevels = {};
        const levelDocIds = [`${currentTeacherId}_${selectedClass}_${academicYear}`, docId];
        for (const lDocId of levelDocIds) {
          try {
            const levSnap = await getDoc(doc(db, "cce_levels_v2", lDocId));
            if (levSnap.exists()) {
              const lData = levSnap.data().levelsData || levSnap.data();
              mergedLevels = { ...mergedLevels, ...lData };
              break;
            }
          } catch (e) { }
        }
        mergedLevels = { ...mergedLevels, ...(bunnyLevels || {}) };
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
          `${currentTeacherId}_${selectedClass}_${academicYear}`,
          `${currentTeacherId}_${selectedClass}_${currentMedium}_${academicYear}`,
          docId,
        ];
        for (const mDocId of marksDocIds) {
          try {
            const marksSnap = await getDoc(doc(db, "cce_marks_v2", mDocId));
            if (marksSnap.exists()) {
              const mData = marksSnap.data();
              const mRecords = mData.semester2 || mData.semester1 || mData.marksData || mData.data || mData || {};
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
    toast.info("अध्ययन निष्पत्ती PDF तयार होत आहे, कृपया वाट पाहा...");

    const container = printRef.current;
    container.classList.add("cce-pdf-generating");
    window.scrollTo(0, 0);

    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const pageElements = Array.from(container.querySelectorAll(".pdf-page"));
      if (!pageElements || pageElements.length === 0) {
        toast.error("कोणतेही पान सापडले नाही!");
        setDownloading(false);
        return;
      }

      const totalPages = pageElements.length;
      const pdf = new jsPDF({
        unit: "mm",
        format: "a4",
        orientation: "portrait",
        compress: true,
      });

      let isFirstPdfPage = true;

      for (let i = 0; i < totalPages; i++) {
        // Live progress toast for classes with many students
        if (totalPages > 4 && (i % 4 === 0 || i === totalPages - 1)) {
          toast.info(`PDF तयार होत आहे: पान ${i + 1} / ${totalPages}...`, { id: "pdf-progress" });
        }

        const pageEl = pageElements[i];

        // Temporarily enforce desktop A4 pixel width (794px) and full height on mobile viewports
        const origW = pageEl.style.width;
        const origMinW = pageEl.style.minWidth;
        const origMaxW = pageEl.style.maxWidth;
        const origH = pageEl.style.height;
        const origOverflow = pageEl.style.overflow;

        pageEl.style.width = "794px";
        pageEl.style.minWidth = "794px";
        pageEl.style.maxWidth = "794px";
        pageEl.style.height = "auto";
        pageEl.style.overflow = "visible";
        pageEl.style.boxSizing = "border-box";

        const renderHeight = Math.max(pageEl.scrollHeight, 1050);

        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          width: 794,
          windowWidth: 794,
          height: renderHeight,
          windowHeight: renderHeight,
        });

        // Restore original inline styles
        pageEl.style.width = origW;
        pageEl.style.minWidth = origMinW;
        pageEl.style.maxWidth = origMaxW;
        pageEl.style.height = origH;
        pageEl.style.overflow = origOverflow;

        // Compressed high-efficiency JPEG encoding
        const imgData = canvas.toDataURL("image/jpeg", 0.85);
        const imgWidth = 210;
        const imgHeight = (canvas.height * 210) / canvas.width;

        if (imgHeight <= 297) {
          if (!isFirstPdfPage) pdf.addPage("a4", "portrait");
          pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight, undefined, "FAST");
          isFirstPdfPage = false;
        } else {
          // Multi-page slicing if table height exceeds A4 page length
          let position = 0;
          let remainingHeight = imgHeight;
          while (remainingHeight > 0) {
            if (!isFirstPdfPage) pdf.addPage("a4", "portrait");
            pdf.addImage(imgData, "JPEG", 0, -position, imgWidth, imgHeight, undefined, "FAST");
            position += 297;
            remainingHeight -= 297;
            isFirstPdfPage = false;
          }
        }

        // Free canvas memory immediately
        canvas.width = 0;
        canvas.height = 0;

        // Allow UI thread to breathe between pages
        if (i % 2 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      pdf.save(`अध्ययन_निष्पत्ती_प्रगतीदर्शक_${selectedClass}_${academicYear}.pdf`);
      toast.dismiss("pdf-progress");
      toast.success(`एकूण ${students.length} विद्यार्थ्यांची PDF यशस्वीरित्या डाऊनलोड झाली!`);
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("PDF निर्मितीत अडचण आली: " + err.message);
    } finally {
      container.classList.remove("cce-pdf-generating");
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isSubjectActive = (subName) => {
    if (!configuredSubjects || configuredSubjects.length === 0) return false;
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
   * Checks outcomesRatings, levelsData, and marksData across all ID and subject aliases.
   */
  const getUserSelectedLevel = (student, outcomeCode, subjectName) => {
    if (!student) return null;

    const possibleStudentKeys = [
      student.id,
      student.rollNo,
      student.name,
      student.fullName,
      String(student.rollNo),
    ].filter(Boolean);

    const possibleSubKeys = [
      subjectName,
      subjectName ? subjectName.toLowerCase() : "",
      subjectName && subjectName.includes("मराठी") ? "marathi" : "",
      subjectName && subjectName.includes("हिंदी") ? "hindi" : "",
      subjectName && subjectName.includes("इंग्रजी") ? "english" : "",
      subjectName && subjectName.includes("गणित") ? "math" : "",
      subjectName && subjectName.includes("गणित") ? "maths" : "",
      subjectName && subjectName.includes("परिसर १") ? "evs1" : "",
      subjectName && subjectName.includes("परिसर २") ? "evs2" : "",
      subjectName && subjectName.includes("परिसर") ? "evs" : "",
      subjectName && subjectName.includes("विज्ञान") ? "science" : "",
      subjectName && subjectName.includes("इतिहास") ? "history" : "",
      subjectName && subjectName.includes("भूगोल") ? "geography" : "",
      subjectName && subjectName.includes("कला") ? "kala" : "",
      subjectName && (subjectName.includes("कार्यानुभव") || subjectName.includes("कार्यशिक्षण")) ? "karyanubhav" : "",
      subjectName && (subjectName.includes("शारीरिक") || subjectName.includes("आरोग्य")) ? "sharirik" : "",
    ].filter(Boolean);

    // 1. Check outcomesRatings: ratings[subjectKey][outcomeCode][studentId]
    for (const subKey of possibleSubKeys) {
      if (outcomesRatings[subKey] && outcomesRatings[subKey][outcomeCode]) {
        const studentMap = outcomesRatings[subKey][outcomeCode];
        for (const stdKey of possibleStudentKeys) {
          const val = studentMap[stdKey];
          if (val !== undefined && val !== null && val !== 0 && val !== "") {
            const parsed = parseInt(val);
            if (parsed >= 1 && parsed <= 4) return parsed;
          }
        }
      }
    }

    // Direct check for top-level outcomeCode in outcomesRatings
    if (outcomesRatings[outcomeCode]) {
      const studentMap = outcomesRatings[outcomeCode];
      for (const stdKey of possibleStudentKeys) {
        const val = studentMap[stdKey];
        if (val !== undefined && val !== null && val !== 0 && val !== "") {
          const parsed = parseInt(val);
          if (parsed >= 1 && parsed <= 4) return parsed;
        }
      }
    }

    // 2. Check direct levelsData: levelsData[studentId][outcomeCode]
    for (const stdKey of possibleStudentKeys) {
      const stdLevels = levelsData[stdKey];
      if (stdLevels && typeof stdLevels === "object") {
        if (stdLevels[outcomeCode]) {
          const parsed = parseInt(stdLevels[outcomeCode]);
          if (parsed >= 1 && parsed <= 4) return parsed;
        }
        for (const subKey of possibleSubKeys) {
          if (stdLevels[subKey] && stdLevels[subKey][outcomeCode]) {
            const parsed = parseInt(stdLevels[subKey][outcomeCode]);
            if (parsed >= 1 && parsed <= 4) return parsed;
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

      {students.length === 0 && (
        <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200 mb-6 text-center max-w-xl mx-auto no-print">
          <AlertCircle className="size-8 text-amber-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-amber-800 mb-1">या वर्गामध्ये अद्याप कोणतेही विद्यार्थी जोडलेले नाहीत</h3>
          <p className="text-xs text-amber-700">कृपया डॅशबोर्डवरील <b>'विद्यार्थी'</b> विभागात जाऊन या वर्गासाठी विद्यार्थी जोडा.</p>
        </div>
      )}

      {/* -------------------- PRINT CONTAINER (CLASS-SPECIFIC OUTCOMES & USER SELECTED LEVELS) -------------------- */}
      <div ref={printRef} className="cce-pdf-container w-full max-w-[215mm] mx-auto space-y-6 flex flex-col items-center">
        <style>{`
          @media screen {
            .cce-pdf-container .pdf-page {
              width: 100% !important;
              max-width: 210mm !important;
              min-width: 0 !important;
              height: auto !important;
              min-height: 0 !important;
            }
          }
          .cce-pdf-generating {
            margin: 0 !important;
            padding: 0 !important;
            max-width: none !important;
            width: 210mm !important;
            background-color: #ffffff !important;
          }
          .cce-pdf-generating .pdf-page {
            margin: 0 !important;
            padding: 8mm 6mm !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            width: 794px !important;
            min-width: 794px !important;
            max-width: 794px !important;
            height: auto !important;
            min-height: 294mm !important;
            box-sizing: border-box !important;
            overflow: visible !important;
            background-color: #ffffff !important;
          }
          .cce-pdf-generating .pdf-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          @media print {
            @page {
              size: A4 portrait;
              margin: 0;
            }
            body * {
              visibility: hidden;
            }
            .no-print {
              display: none !important;
            }
            .pdf-page, .pdf-page * {
              visibility: visible !important;
            }
            .pdf-page {
              position: relative !important;
              left: 0 !important;
              top: 0 !important;
              width: 210mm !important;
              height: 294mm !important;
              max-width: 210mm !important;
              max-height: 294mm !important;
              min-width: 210mm !important;
              min-height: 294mm !important;
              margin: 0 !important;
              padding: 8mm 6mm !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
              background-color: #ffffff !important;
            }
          }
        `}</style>
        {students.map((student, sIdx) => {
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

          return activeSubjectSections.map((sec, subIdx) => {
            const isFirstOverallPage = sIdx === 0 && subIdx === 0;
            return (
              <div
                key={`${student.id}_${sec.key}`}
                className={`pdf-page bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex flex-col justify-between mb-4 w-full max-w-[210mm] min-w-0 ${
                  !isFirstOverallPage ? "pdf-page-break" : ""
                }`}
                style={{
                  boxSizing: "border-box",
                  pageBreakBefore: isFirstOverallPage ? "auto" : "always",
                  breakBefore: isFirstOverallPage ? "auto" : "page",
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
                  <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-800 bg-slate-100/90 py-2.5 px-6 rounded-full border border-slate-300 shadow-xs mb-3">
                    <span>विद्यार्थ्याचे नाव - <b className="text-slate-900 font-black">{student.name}</b></span>
                    <span>इयत्ता - <b>{selectedClass}</b></span>
                    <span>तुकडी - <b>{division}</b></span>
                    <span>हजेरी क्र. <b>{student.rollNo}</b></span>
                    <span>{selectedSemester === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}</span>
                  </div>

                  {/* Dedicated Single Subject Table */}
                  <OutcomeTable
                    title={sec.title}
                    outcomes={sec.outcomes}
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
        })}
      </div>
    </div>
  );
};

export default SubjectWiseResult;
