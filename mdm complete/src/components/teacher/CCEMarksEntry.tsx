import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  BookOpen,
  User,
  Layers,
  Save,
  Check,
  Award,
} from "lucide-react";
import { toast } from "sonner";
// @ts-ignore
import { matchStudentClassAndMedium } from "@/result/firestoreMarksHelper";
import { getDefaultSubjectsForClass } from "@/data/cceSubjects";
// @ts-ignore
import { getTeacherId } from "@/lib/teacherIsolationHelper";

const EXAMS_SEM1 = [
  { key: "test1", label: "चाचणी १" },
  { key: "test2", label: "चाचणी २" },
  { key: "semester1", label: "सत्र परीक्षा १" },
];
const EXAMS_SEM2 = [
  { key: "test3", label: "चाचणी ३" },
  { key: "test4", label: "चाचणी ४" },
  { key: "semester2", label: "सत्र परीक्षा २" },
];

const DEFAULT_SUBJECTS = [
  "प्रथम भाषा : मराठी",
  "द्वितीय भाषा : इंग्रजी",
  "गणित",
  "कला",
  "कार्यानुभव",
  "शारीरिक शिक्षण",
];

interface SubjectMarks {
  tondiKaam?: number;
  pratyakshikPrayog?: number;
  upakramKriti?: number;
  prakalpa?: number;
  chaachaniLekhi?: number;
  swadhyayVargakarya?: number;
  itar?: number;
  sankalitTondi?: number;
  sankalitPratyakshik?: number;
  sankalitLekhi?: number;
  [key: string]: number | undefined;
}

const emptySubjectMarks = (): SubjectMarks => ({
  tondiKaam: 0,
  pratyakshikPrayog: 0,
  upakramKriti: 0,
  prakalpa: 0,
  chaachaniLekhi: 0,
  swadhyayVargakarya: 0,
  itar: 0,
  sankalitTondi: 0,
  sankalitPratyakshik: 0,
  sankalitLekhi: 0,
});

const getSubjectKey = (subjectName: string): string => {
  if (subjectName.includes("मराठी")) return "marathi";
  if (subjectName.includes("इंग्रजी")) return "english";
  if (subjectName.includes("गणित")) return "math";
  if (subjectName.includes("कला")) return "art";
  if (subjectName.includes("कार्यानुभव")) return "work";
  if (subjectName.includes("शारीरिक")) return "pe";
  return "marathi";
};

interface Student {
  id: string;
  fullName?: string;
  name?: string;
  rollNo?: string;
  [key: string]: any;
}
type Semester = "sem1" | "sem2";
type ViewTab = "student" | "subject";

function MarksInput({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const displayVal = max > 0 && value > max ? max : value;

  return (
    <div className="flex items-center rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={displayVal === 0 ? "" : displayVal}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9]/g, "");
          let num = raw === "" ? 0 : parseInt(raw, 10) || 0;
          if (max > 0 && num > max) {
            num = max;
            toast.warning(`गुणांची मर्यादा जास्तीत जास्त ${max} आहे! (आपोआप ${max} धरले गेले)`);
          }
          onChange(num);
        }}
        placeholder="0"
        className="flex-1 px-4 py-3 bg-transparent text-base font-extrabold outline-none w-0 text-slate-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="pr-4 text-xs font-bold text-slate-500 whitespace-nowrap">/ {max}</span>
    </div>
  );
}

export function CCEMarksEntry({
  selectedClass,
  academicYear,
  onBack,
}: {
  selectedClass: string;
  academicYear: string;
  onBack: () => void;
}) {
  const [selectedMedium, setSelectedMedium] = useState<"marathi" | "semi">(() => {
    const stored = localStorage.getItem("cce_selected_medium");
    return stored === "semi" ? "semi" : "marathi";
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<string[]>(() => getDefaultSubjectsForClass(selectedClass, selectedMedium));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSemester, setActiveSemester] = useState<Semester>("sem1");
  const [activeView, setActiveView] = useState<ViewTab>("student");
  const [selectedExamKey, setSelectedExamKey] = useState<string>("sem1");
  const [allMarks, setAllMarks] = useState<Record<string, Record<string, SubjectMarks>>>({});
  const [weightages, setWeightages] = useState<any>(null);

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [subjectIndex, setSubjectIndex] = useState(0);
  const [editingSubject, setEditingSubject] = useState<string | null>(null);

  useEffect(() => {
    setSelectedExamKey(activeSemester);
    setEditingStudent(null);
    setEditingSubject(null);
  }, [activeSemester]);

  // Instant real-time listener for students
  useEffect(() => {
    const currentTeacherId = getTeacherId();
    const q = query(collection(db, "users"), where("role", "==", "student"));
    const unsub = onSnapshot(q, (snap) => {
      const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as (Student & { medium?: string; isSemiEnglish?: boolean })[];
      const filtered = raw.filter((s) => {
        return matchStudentClassAndMedium(s, selectedClass, selectedMedium, currentTeacherId);
      });
      setStudents(filtered.sort((a, b) => parseInt(a.rollNo || "999") - parseInt(b.rollNo || "999")));
    });
    return () => unsub();
  }, [selectedClass, selectedMedium]);

  // Instant real-time listener for subjects and marks
  useEffect(() => {
    setLoading(true);
    const currentTeacherId = getTeacherId();

    try {
      const cached = localStorage.getItem(`cce_marks_cache_${selectedClass}_${academicYear}_${activeSemester}_${selectedMedium}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === "object") {
          setAllMarks(parsed);
        }
      }
    } catch (e) {}

    const unsubSettings = onSnapshot(doc(db, "cce_settings", `${selectedClass}_${academicYear}`), (snap) => {
      if (snap.exists() && snap.data().subjects) {
        setSubjects(snap.data().subjects);
      } else {
        setSubjects(getDefaultSubjectsForClass(selectedClass, selectedMedium));
      }
    });

    const primaryDocId = `${selectedClass}_${academicYear}_${activeSemester}`;
    const teacherDocId = currentTeacherId ? `${currentTeacherId}_${selectedClass}_${academicYear}_${activeSemester}` : primaryDocId;
    const generalDocId = `${selectedClass}_${academicYear}`;

    const unsubMarks = onSnapshot(doc(db, "cce_marks_v2", primaryDocId), async (snap) => {
      let recs: Record<string, Record<string, SubjectMarks>> = {};
      if (snap.exists()) {
        const d = snap.data();
        recs = d.records || d.marksData || d.data || {};
      }
      
      if (!recs || Object.keys(recs).length === 0) {
        try {
          if (currentTeacherId) {
            const tSnap = await getDoc(doc(db, "cce_marks_v2", teacherDocId));
            if (tSnap.exists()) {
              const td = tSnap.data();
              recs = td.records || td.marksData || td.data || {};
            }
          }
        } catch (e) {}

        // Check general doc for term-nested property or student-nested term property
        if (!recs || Object.keys(recs).length === 0) {
          try {
            const genSnap = await getDoc(doc(db, "cce_marks_v2", generalDocId));
            if (genSnap.exists()) {
              const gd = genSnap.data();
              const semData = gd[activeSemester] || gd[activeSemester === "sem1" ? "semester1" : "semester2"];
              if (semData && typeof semData === "object") {
                recs = semData.records || semData.marksData || semData;
              } else if (gd.records && typeof gd.records === "object") {
                const extracted: Record<string, Record<string, SubjectMarks>> = {};
                for (const [sKey, sVal] of Object.entries(gd.records)) {
                  if (sVal && typeof sVal === "object") {
                    if ((sVal as any)[activeSemester]) {
                      extracted[sKey] = (sVal as any)[activeSemester];
                    } else if ((sVal as any)[activeSemester === "sem1" ? "semester1" : "semester2"]) {
                      extracted[sKey] = (sVal as any)[activeSemester === "sem1" ? "semester1" : "semester2"];
                    }
                  }
                }
                if (Object.keys(extracted).length > 0) recs = extracted;
              }
            }
          } catch (e) {}
        }

        // Fallback: Bunny CDN
        if (!recs || Object.keys(recs).length === 0) {
          try {
            const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
            const bunnyFile = activeSemester === "sem1" 
              ? `cce_results/${selectedClass}_${academicYear}_marks_first.json`
              : `cce_results/${selectedClass}_${academicYear}_marks_second.json`;
            const bunnySemFile = `cce_results/${selectedClass}_${academicYear}_marks_${activeSemester}.json`;

            const bData = (await fetchJsonFromBunny(bunnySemFile)) || (await fetchJsonFromBunny(bunnyFile));
            if (bData && typeof bData === "object") {
              recs = bData;
            }
          } catch (e) {}
        }
      }

      setAllMarks(recs || {});
      setLoading(false);
    });

    return () => {
      unsubSettings();
      unsubMarks();
    };
  }, [selectedClass, academicYear, activeSemester, selectedMedium]);

  useEffect(() => {
    const currentTeacherId = getTeacherId();
    const docIds = [
      currentTeacherId ? `${currentTeacherId}_${selectedClass}_${academicYear}` : null,
      `${selectedClass}_${academicYear}`,
    ].filter(Boolean) as string[];

    let unsub: () => void = () => {};

    // Load instantly from localStorage cache for 0ms latency
    for (const dId of docIds) {
      try {
        const cached = localStorage.getItem(`cce_weightage_cache_${dId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && (parsed.semester1 || parsed.semester2 || parsed.data)) {
            setWeightages(parsed.data || parsed);
            break;
          }
        }
      } catch (e) {}
    }

    const initWeightages = async () => {
      let loadedDocId = docIds[0];
      for (const dId of docIds) {
        try {
          const snap = await getDoc(doc(db, "cce_weightage_v2", dId));
          if (snap.exists() && (snap.data().data || snap.data().semester1)) {
            const freshData = snap.data().data || snap.data();
            setWeightages(freshData);
            loadedDocId = dId;
            try {
              localStorage.setItem(`cce_weightage_cache_${dId}`, JSON.stringify(freshData));
            } catch (e) {}
            break;
          }
        } catch (e) {}
      }

      unsub = onSnapshot(doc(db, "cce_weightage_v2", loadedDocId), (sSnap) => {
        if (sSnap.exists() && (sSnap.data().data || sSnap.data().semester1)) {
          const freshData = sSnap.data().data || sSnap.data();
          setWeightages(freshData);
          try {
            localStorage.setItem(`cce_weightage_cache_${loadedDocId}`, JSON.stringify(freshData));
          } catch (e) {}
        }
      });
    };

    const handleCustomWeightageUpdate = () => {
      for (const dId of docIds) {
        try {
          const cached = localStorage.getItem(`cce_weightage_cache_${dId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && (parsed.semester1 || parsed.semester2 || parsed.data)) {
              setWeightages(parsed.data || parsed);
              break;
            }
          }
        } catch (e) {}
      }
      initWeightages();
    };

    initWeightages();
    window.addEventListener("cce_weightage_updated", handleCustomWeightageUpdate);
    window.addEventListener("storage", handleCustomWeightageUpdate);

    return () => {
      unsub();
      window.removeEventListener("cce_weightage_updated", handleCustomWeightageUpdate);
      window.removeEventListener("storage", handleCustomWeightageUpdate);
    };
  }, [selectedClass, academicYear]);

  // Sync subjects directly from Weightage configuration if available
  useEffect(() => {
    if (!weightages) return;
    const semesterKey = activeSemester === "sem1" ? "semester1" : "semester2";
    const items = weightages[semesterKey] || weightages.data?.[semesterKey] || [];
    if (items.length > 0 && items[0].subjects) {
      const weightageSubKeys = Object.keys(items[0].subjects);
      if (weightageSubKeys.length > 0) {
        // Sort according to default subject order so tabs appear in correct sequence
        const defaultOrder = getDefaultSubjectsForClass(selectedClass, selectedMedium);
        const sorted = [...weightageSubKeys].sort((a, b) => {
          const idxA = defaultOrder.findIndex((d) => d.toLowerCase() === a.toLowerCase() || a.toLowerCase().includes(d.toLowerCase()) || d.toLowerCase().includes(a.toLowerCase()));
          const idxB = defaultOrder.findIndex((d) => d.toLowerCase() === b.toLowerCase() || b.toLowerCase().includes(d.toLowerCase()) || d.toLowerCase().includes(b.toLowerCase()));
          return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
        });
        setSubjects(sorted);
      }
    }
  }, [weightages, activeSemester, selectedClass, selectedMedium]);

  const findSubjectWeightage = (subjectsObj: Record<string, any>, subjectName: string) => {
    if (!subjectsObj) return null;
    if (subjectsObj[subjectName]) return subjectsObj[subjectName];

    const normTarget = subjectName.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/g, "");
    for (const key of Object.keys(subjectsObj)) {
      const normKey = key.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/g, "");
      if (normKey === normTarget) return subjectsObj[key];
    }
    for (const key of Object.keys(subjectsObj)) {
      const normKey = key.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/g, "");
      if (normKey && normTarget && (normKey.includes(normTarget) || normTarget.includes(normKey))) {
        return subjectsObj[key];
      }
    }

    const lowerTarget = subjectName.toLowerCase().trim();
    for (const [sKey, sVal] of Object.entries(subjectsObj)) {
      const sLower = String(sKey).toLowerCase().trim();
      if (
        (lowerTarget.includes("मराठी") && sLower.includes("मराठी")) ||
        (lowerTarget.includes("इंग्रजी") && sLower.includes("इंग्रजी")) ||
        (lowerTarget.includes("english") && sLower.includes("english")) ||
        (lowerTarget.includes("हिंदी") && sLower.includes("हिंदी")) ||
        (lowerTarget.includes("hindi") && sLower.includes("hindi")) ||
        (lowerTarget.includes("गणित") && sLower.includes("गणित")) ||
        (lowerTarget.includes("math") && sLower.includes("math")) ||
        (lowerTarget.includes("परिसर १") && sLower.includes("परिसर १")) ||
        (lowerTarget.includes("परिसर २") && sLower.includes("परिसर २")) ||
        (lowerTarget.includes("परिसर") && sLower.includes("परिसर") && !lowerTarget.includes("१") && !lowerTarget.includes("२") && !sLower.includes("१") && !sLower.includes("२")) ||
        (lowerTarget.includes("विज्ञान") && sLower.includes("विज्ञान")) ||
        (lowerTarget.includes("इतिहास") && sLower.includes("इतिहास")) ||
        (lowerTarget.includes("भूगोल") && sLower.includes("भूगोल")) ||
        (lowerTarget.includes("कला") && sLower.includes("कला")) ||
        (lowerTarget.includes("कार्यानुभव") && sLower.includes("कार्यानुभव")) ||
        (lowerTarget.includes("शारीरिक") && sLower.includes("शारीरिक"))
      ) {
        return sVal;
      }
    }

    const sKey = getSubjectKey(subjectName);
    if (subjectsObj[sKey]) return subjectsObj[sKey];

    return null;
  };

  const getSubjectMarks = (student: Student | string, subjectName: string): SubjectMarks => {
    let stdId = typeof student === "string" ? student : student.id;
    let stdRoll = typeof student === "object" ? student.rollNo : "";
    let stdName = typeof student === "object" ? student.fullName || student.name : "";

    const stdRecord =
      allMarks[stdId] ||
      (stdRoll ? allMarks[stdRoll] : null) ||
      (stdRoll ? allMarks[String(stdRoll)] : null) ||
      (stdName ? allMarks[stdName] : null) ||
      {};

    const record = stdRecord[subjectName] || {};
    return {
      tondiKaam: parseInt(record.tondiKaam as any) || 0,
      pratyakshikPrayog: parseInt(record.pratyakshikPrayog as any) || 0,
      upakramKriti: parseInt((record.upakramKriti ?? record.upakram) as any) || 0,
      prakalpa: parseInt(record.prakalpa as any) || 0,
      chaachaniLekhi: parseInt((record.chaachaniLekhi ?? record.chaachani) as any) || 0,
      swadhyayVargakarya: parseInt((record.swadhyayVargakarya ?? record.swadhyay) as any) || 0,
      itar: parseInt(record.itar as any) || 0,
      sankalitTondi: parseInt(record.sankalitTondi as any) || 0,
      sankalitPratyakshik: parseInt(record.sankalitPratyakshik as any) || 0,
      sankalitLekhi: parseInt(record.sankalitLekhi as any) || 0,
    };
  };

  const setSubjectMark = (
    studentId: string,
    subjectName: string,
    field: string,
    value: number
  ) => {
    setAllMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [subjectName]: { ...getSubjectMarks(studentId, subjectName), [field]: value },
      },
    }));
  };

  const getActiveColsForStudent = (rollNoStr: string, subjectName: string, studentId?: string) => {
    const rollNo = parseInt(rollNoStr);
    const isPracticalSub =
      subjectName.includes("कला") ||
      subjectName.includes("कार्यानुभव") ||
      subjectName.includes("शारीरिक");

    const defaultCols = isPracticalSub
      ? [
          { key: "pratyakshikPrayog", label: "प्रात्याक्षिक / प्रयोग", max: 40, type: "akarik" },
          { key: "upakramKriti", label: "उपक्रम / कृती", max: 20, type: "akarik" },
          { key: "swadhyayVargakarya", label: "स्वाध्याय / वर्गकार्य", max: 20, type: "akarik" },
          { key: "itar", label: "इतर", max: 20, type: "akarik" },
        ]
      : [
          { key: "tondiKaam", label: "तोंडीकाम", max: 20, type: "akarik" },
          { key: "upakramKriti", label: "उपक्रम / कृती", max: 15, type: "akarik" },
          { key: "chaachaniLekhi", label: "चाचणी (लेखी)", max: 20, type: "akarik" },
          { key: "swadhyayVargakarya", label: "स्वाध्याय / वर्गकार्य", max: 15, type: "akarik" },
          { key: "sankalitTondi", label: "तोंडी", max: 10, type: "sankalit" },
          { key: "sankalitLekhi", label: "लेखी", max: 20, type: "sankalit" },
        ];

    if (!weightages) return defaultCols;

    const semesterKey = activeSemester === "sem1" ? "semester1" : "semester2";
    const items = weightages[semesterKey] || weightages.data?.[semesterKey] || [];
    let assignedItem = items.find((item: any) =>
      item.studentIds?.some((id: any) =>
        String(id) === String(rollNoStr) ||
        String(id) === String(rollNo) ||
        (studentId && String(id) === String(studentId))
      )
    );

    if (!assignedItem && items.length > 0) {
      assignedItem = items[0];
    }

    if (!assignedItem || !assignedItem.subjects) {
      return defaultCols;
    }

    const sw = findSubjectWeightage(assignedItem.subjects, subjectName);
    if (!sw) {
      return defaultCols;
    }

    const allPossibleCols = [
      { key: "tondiKaam", label: "तोंडीकाम", max: parseInt(sw.tondiKaam) || 0, type: "akarik" },
      { key: "pratyakshikPrayog", label: "प्रात्याक्षिक / प्रयोग", max: parseInt(sw.pratyakshikPrayog) || 0, type: "akarik" },
      { key: "upakramKriti", label: "उपक्रम / कृती", max: parseInt(sw.upakramKriti) || 0, type: "akarik" },
      { key: "prakalpa", label: "प्रकल्प", max: parseInt(sw.prakalpa) || 0, type: "akarik" },
      { key: "chaachaniLekhi", label: "चाचणी (लेखी)", max: parseInt(sw.chaachaniLekhi) || 0, type: "akarik" },
      { key: "swadhyayVargakarya", label: "स्वाध्याय / वर्गकार्य", max: parseInt(sw.swadhyayVargakarya) || 0, type: "akarik" },
      { key: "itar", label: "इतर", max: parseInt(sw.itar) || 0, type: "akarik" },
      ...(isPracticalSub
        ? []
        : [
            { key: "sankalitTondi", label: "तोंडी", max: parseInt(sw.sankalitTondi) || 0, type: "sankalit" },
            { key: "sankalitPratyakshik", label: "प्रात्यक्षिक", max: parseInt(sw.sankalitPratyakshik) || 0, type: "sankalit" },
            { key: "sankalitLekhi", label: "लेखी", max: parseInt(sw.sankalitLekhi) || 0, type: "sankalit" },
          ]),
    ];

    const activeCols = allPossibleCols.filter((col) => col.max > 0);
    return activeCols.length > 0 ? activeCols : defaultCols;
  };

  const isSubjectFilledForStudent = (student: Student | string, rollNoStr: string, subjectName: string): boolean => {
    const sm = getSubjectMarks(student, subjectName);
    const activeCols = getActiveColsForStudent(rollNoStr, subjectName);
    if (activeCols.length === 0) return false;
    return activeCols.some((col) => {
      const val = sm[col.key];
      return val !== undefined && val > 0;
    });
  };

  const getStudentProgress = (student: Student) => {
    let filled = 0;
    subjects.forEach((sub) => {
      if (isSubjectFilledForStudent(student, student.rollNo || "", sub)) {
        filled++;
      }
    });
    return { filled, total: subjects.length };
  };

  const getSubjectProgress = (subjectName: string) => {
    let filled = 0;
    students.forEach((student) => {
      if (isSubjectFilledForStudent(student, student.rollNo || "", subjectName)) {
        filled++;
      }
    });
    return { filled, total: students.length };
  };

  const saveMarks = async () => {
    // 1. Instant Local Cache Update (0ms)
    try {
      localStorage.setItem(
        `cce_marks_cache_${selectedClass}_${academicYear}_${activeSemester}_${selectedMedium}`,
        JSON.stringify(allMarks)
      );
    } catch (e) {}

    toast.success(`${activeSemester === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"} चे गुण जतन झाले!`);

    // 2. Background Non-Blocking Network Sync (Firestore & Bunny CDN)
    try {
      const currentTeacherId = getTeacherId();
      const docData = {
        class: selectedClass,
        academicYear,
        semester: activeSemester,
        exam: activeSemester,
        records: allMarks,
        updatedAt: new Date().toISOString(),
      };

      const docIdsToSave = [
        `${selectedClass}_${academicYear}_${activeSemester}`,
        `${selectedClass}_${selectedMedium}_${academicYear}_${activeSemester}`,
      ];

      if (currentTeacherId) {
        docIdsToSave.push(`${currentTeacherId}_${selectedClass}_${academicYear}_${activeSemester}`);
        docIdsToSave.push(`${currentTeacherId}_${selectedClass}_${selectedMedium}_${academicYear}_${activeSemester}`);
      }

      // Fire network saves in parallel in the background without blocking the UI
      Promise.allSettled([
        ...docIdsToSave.map((dId) => setDoc(doc(db, "cce_marks_v2", dId), docData, { merge: true })),
        setDoc(
          doc(db, "cce_marks_v2", `${selectedClass}_${academicYear}`),
          {
            class: selectedClass,
            academicYear,
            [activeSemester]: allMarks,
            [activeSemester === "sem1" ? "semester1" : "semester2"]: allMarks,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ),
        (async () => {
          try {
            const { saveJsonToBunny } = await import("@/lib/bunnyStorage");
            await saveJsonToBunny(
              `cce_results/${selectedClass}_${academicYear}_marks_${activeSemester}.json`,
              allMarks
            );
            const aliasBunnyFile = activeSemester === "sem1" 
              ? `cce_results/${selectedClass}_${academicYear}_marks_first.json`
              : `cce_results/${selectedClass}_${academicYear}_marks_second.json`;
            await saveJsonToBunny(aliasBunnyFile, allMarks);
          } catch (e) {}
        })(),
      ]).catch((err) => {
        console.warn("Background marks save warning:", err);
      });
    } catch (err: any) {
      console.warn("Background save warning:", err);
    }
  };

  // ── SUBJECT-WISE MARKS EDITOR ──
  if (editingSubject) {
    const subject = editingSubject;

    return (
      <div
        className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200/90 shadow-2xl min-h-[600px] flex flex-col relative select-none overflow-hidden font-sans"
      >
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-800 text-white px-6 py-4 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditingSubject(null)}
              className="p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-2xl transition-all cursor-pointer text-white flex items-center justify-center backdrop-blur-md"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <BookOpen className="size-5 text-purple-200" />
                विषयनिहाय गुण नोंदणी - {subject} ({activeSemester === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"})
              </h2>
              <p className="text-xs text-purple-200 font-medium">इयत्ता {selectedClass} • सर्व विद्यार्थ्यांचे गुण</p>
            </div>
          </div>
        </div>

        {/* Subject Nav Tabs */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {subjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setEditingSubject(sub)}
              className={`px-4 py-2.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all cursor-pointer ${
                editingSubject === sub
                  ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        {/* Roster of Students for this Subject */}
        <div className="flex-1 overflow-y-auto px-6 py-6 pb-28 space-y-4">
          {students.map((student, idx) => {
            const sm = getSubjectMarks(student.id, subject);
            const activeCols = getActiveColsForStudent(student.rollNo || "", subject);

            const akarikCols = activeCols.filter((c) => c.type === "akarik");
            const sankalitCols = activeCols.filter((c) => c.type === "sankalit");

            const akarikTotal = akarikCols.reduce((sum, c) => sum + (sm[c.key] || 0), 0);
            const akarikMax = akarikCols.reduce((sum, c) => sum + c.max, 0);

            const sankalitTotal = sankalitCols.reduce((sum, c) => sum + (sm[c.key] || 0), 0);
            const sankalitMax = sankalitCols.reduce((sum, c) => sum + c.max, 0);

            const grandTotal = akarikTotal + sankalitTotal;
            const grandMax = akarikMax + sankalitMax;

            return (
              <div
                key={student.id}
                className="bg-slate-50/80 p-4.5 rounded-3xl border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                      {student.rollNo || idx + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">{student.fullName || student.name}</h4>
                      <p className="text-[11px] text-slate-500 font-bold">हजेरी क्र. {student.rollNo || idx + 1}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-purple-700 bg-purple-100/80 px-3 py-1 rounded-xl border border-purple-200">
                      एकूण गुण: {grandTotal} / {grandMax}
                    </span>
                  </div>
                </div>

                {/* Inputs for this student */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {activeCols.map((col) => (
                    <div key={col.key} className="space-y-1">
                      <label className="text-[11px] font-extrabold text-slate-600 truncate block" title={col.label}>
                        {col.label}
                      </label>
                      <MarksInput
                        value={sm[col.key] || 0}
                        max={col.max}
                        onChange={(val) => setSubjectMark(student.id, subject, col.key, val)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sticky glassmorphic bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 z-30 flex items-center gap-3">
          <button
            onClick={saveMarks}
            disabled={saving}
            className="flex-1 py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white font-extrabold text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="size-4" />
            <span>{saving ? "जतन होत आहे..." : `गुण जतन करा (Save Marks for ${subject})`}</span>
          </button>
        </div>
      </div>
    );
  }

  // ── STUDENT MARKS EDITOR ──
  if (editingStudent) {
    const student = editingStudent;
    const studentIdx = students.indexOf(student);
    const subject = subjects[subjectIndex];
    const sm = getSubjectMarks(student.id, subject);
    const isLastSubject = subjectIndex === subjects.length - 1;

    const activeCols = getActiveColsForStudent(student.rollNo || "", subject);
    const akarikCols = activeCols.filter((c) => c.type === "akarik");
    const sankalitCols = activeCols.filter((c) => c.type === "sankalit");

    const akarikMax = akarikCols.reduce((sum, c) => sum + c.max, 0);
    const sankalitMax = sankalitCols.reduce((sum, c) => sum + c.max, 0);

    const akarikTotal = akarikCols.reduce((sum, c) => sum + Math.min(sm[c.key] || 0, c.max), 0);
    const sankalitTotal = sankalitCols.reduce((sum, c) => sum + Math.min(sm[c.key] || 0, c.max), 0);

    const handleNextStudent = () => {
      if (studentIdx < students.length - 1) {
        setEditingStudent(students[studentIdx + 1]);
      } else {
        toast.info("हा शेवटचा विद्यार्थी आहे!");
      }
    };

    const handlePrevStudent = () => {
      if (studentIdx > 0) {
        setEditingStudent(students[studentIdx - 1]);
      }
    };

    const handleSaveAndNextSubject = async () => {
      await saveMarks();
      if (subjectIndex < subjects.length - 1) {
        setSubjectIndex(subjectIndex + 1);
        toast.success(`पुढील विषय: ${subjects[subjectIndex + 1]}`);
      } else {
        if (studentIdx < students.length - 1) {
          setEditingStudent(students[studentIdx + 1]);
          setSubjectIndex(0);
          toast.success(`पुढील विद्यार्थी: ${students[studentIdx + 1].fullName || students[studentIdx + 1].name}`);
        } else {
          toast.success("सर्व विद्यार्थ्यांचे गुण जतन झाले!");
        }
      }
    };

    return (
      <div
        className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200/90 shadow-2xl min-h-[600px] flex flex-col relative select-none overflow-hidden"
        style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
      >
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white px-6 py-4 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditingStudent(null)}
              className="p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-2xl transition-all cursor-pointer text-white flex items-center justify-center backdrop-blur-md"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white">
                गुण नोंदणी - {activeSemester === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}
              </h2>
              <p className="text-xs text-blue-200 font-medium">इयत्ता {selectedClass} गुण भरणे</p>
            </div>
          </div>
        </div>

        {/* Student Banner Bar */}
        <div className="bg-blue-50/80 px-6 py-3.5 border-b border-blue-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md">
              {student.rollNo || studentIdx + 1}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-blue-950">{student.fullName || student.name || "-"}</h3>
              <p className="text-xs font-bold text-blue-600">हजेरी क्र. {student.rollNo || studentIdx + 1}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevStudent}
              disabled={studentIdx === 0}
              className="px-3 py-1.5 bg-white border border-blue-200 hover:bg-blue-50 text-blue-900 font-extrabold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-40"
            >
              ← मागील
            </button>
            <button
              onClick={handleNextStudent}
              disabled={studentIdx === students.length - 1}
              className="px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-40"
            >
              पुढील →
            </button>
          </div>
        </div>

        {/* Subject Nav Tabs */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {subjects.map((sub, idx) => (
            <button
              key={sub}
              onClick={() => setSubjectIndex(idx)}
              className={`px-4 py-2.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all cursor-pointer ${
                subjectIndex === idx
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        {/* Marks Entry Form */}
        <div className="flex-1 overflow-y-auto px-6 py-6 pb-28 space-y-6">
          {/* Akarik Section */}
          {akarikCols.length > 0 && (
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">आकारिक मूल्यमापन</h4>
                <span className="text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                  एकूण: {akarikTotal} / {akarikMax}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {akarikCols.map((col) => (
                  <div key={col.key} className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 ml-1">{col.label}</label>
                    <MarksInput
                      value={sm[col.key] || 0}
                      max={col.max}
                      onChange={(val) => setSubjectMark(student.id, subject, col.key, val)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sankalit Section */}
          {sankalitCols.length > 0 && (
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">संकलित मूल्यमापन</h4>
                <span className="text-xs font-black text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                  एकूण: {sankalitTotal} / {sankalitMax}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sankalitCols.map((col) => (
                  <div key={col.key} className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 ml-1">{col.label}</label>
                    <MarksInput
                      value={sm[col.key] || 0}
                      max={col.max}
                      onChange={(val) => setSubjectMark(student.id, subject, col.key, val)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky glassmorphic bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 z-30 flex items-center gap-3">
          <button
            onClick={handleSaveAndNextSubject}
            disabled={saving}
            className="flex-1 py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 active:scale-[0.99] text-white font-extrabold text-sm rounded-full shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Save className="size-4" />
            <span>
              {saving
                ? "जतन होत आहे..."
                : isLastSubject
                ? "जतन करा व पुढील विद्यार्थी →"
                : "जतन करा व पुढील विषय →"}
            </span>
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN MARKS ENTRY ROSTER LIST ──
  return (
    <div
      className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200/90 shadow-2xl min-h-[600px] flex flex-col relative select-none overflow-hidden"
      style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white px-6 py-5 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <button
              onClick={onBack}
              className="p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-2xl transition-all cursor-pointer text-white flex items-center justify-center backdrop-blur-md"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                <Award className="size-5 text-blue-200" /> गुण नोंदणी
              </h2>
              <p className="text-xs text-blue-200 font-medium">इयत्ता {selectedClass} ({selectedMedium === "semi" ? "सेमी-इंग्रजी" : "मराठी"}) सर्व विद्यार्थ्यांची गुण नोंदणी</p>
            </div>
          </div>

          {/* Medium Switcher Pill */}
          <div className="flex items-center bg-white/15 backdrop-blur-md p-1 rounded-2xl border border-white/20">
            <button
              onClick={() => {
                setSelectedMedium("marathi");
                localStorage.setItem("cce_selected_medium", "marathi");
                setSubjects(getDefaultSubjectsForClass(selectedClass, "marathi"));
              }}
              className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                selectedMedium === "marathi" ? "bg-white text-blue-900 shadow-md" : "text-blue-100 hover:text-white"
              }`}
            >
              मराठी
            </button>
            <button
              onClick={() => {
                setSelectedMedium("semi");
                localStorage.setItem("cce_selected_medium", "semi");
                setSubjects(getDefaultSubjectsForClass(selectedClass, "semi"));
              }}
              className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                selectedMedium === "semi" ? "bg-white text-blue-900 shadow-md" : "text-blue-100 hover:text-white"
              }`}
            >
              सेमी-इंग्रजी
            </button>
          </div>
        </div>
      </div>

      {/* Semester Switcher & View Switcher */}
      <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {(["sem1", "sem2"] as const).map((sem) => (
            <button
              key={sem}
              onClick={() => setActiveSemester(sem)}
              className={`flex-1 sm:flex-initial py-2.5 px-5 rounded-2xl font-black text-xs transition-all cursor-pointer ${
                activeSemester === sem
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {sem === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-slate-200/70 p-1 rounded-2xl w-full sm:w-auto">
          {(["student", "subject"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              className={`flex-1 sm:flex-initial py-2 px-4 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                activeView === v ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {v === "student" ? "विद्यार्थी निहाय" : "विषय निहाय"}
            </button>
          ))}
        </div>
      </div>

      {/* Roster View */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
            <span className="text-xs text-slate-400 font-bold">विद्यार्थी गुण लोड होत आहेत...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-slate-400 font-bold text-sm">कोणताही विद्यार्थी सापडला नाही</p>
          </div>
        ) : activeView === "student" ? (
          students.map((student, idx) => {
            const prog = getStudentProgress(student);
            const isComplete = prog.filled === prog.total;

            return (
              <div
                key={student.id}
                onClick={() => {
                  setEditingStudent(student);
                  setSubjectIndex(0);
                }}
                className="group flex items-center justify-between p-4 bg-white hover:bg-blue-50/40 rounded-2xl border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                    {student.rollNo || idx + 1}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                      {student.fullName || student.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">हजेरी क्र. {student.rollNo || idx + 1}</p>
                  </div>
                </div>

                <div>
                  {isComplete ? (
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30">
                      <Check className="size-5 stroke-[3]" />
                    </div>
                  ) : (
                    <span className="px-3 py-1.5 bg-blue-50 text-blue-700 font-black text-xs rounded-xl border border-blue-200">
                      {prog.filled}/{prog.total}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          subjects.map((sub, idx) => {
            const prog = getSubjectProgress(sub);
            const isComplete = prog.filled === prog.total;

            return (
              <div
                key={sub}
                onClick={() => {
                  setEditingSubject(sub);
                }}
                className="group flex items-center justify-between p-4 bg-white hover:bg-blue-50/40 rounded-2xl border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md">
                    <BookOpen className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                      {sub}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">एकूण विद्यार्थी: {students.length}</p>
                  </div>
                </div>

                <div>
                  {isComplete ? (
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30">
                      <Check className="size-5 stroke-[3]" />
                    </div>
                  ) : (
                    <span className="px-3 py-1.5 bg-blue-50 text-blue-700 font-black text-xs rounded-xl border border-blue-200">
                      {prog.filled}/{prog.total}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
